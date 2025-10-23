import express, { Request, Response } from "express";
import { Types } from "mongoose";
import { Integration } from "../models/Integration";
import logger from "../utils/logger";
import requireAuth from "../middleware/auth";

const router = express.Router();

// Obtener URL de autorización de TikTok
router.get("/oauth/url", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI || "http://localhost:3000/dashboard/integrations/connect/tiktok/callback";
    
    if (!clientKey) {
      return res.status(500).json({ error: "TikTok Client Key no configurado" });
    }

    const scopes = [
      "user.info.basic",
      "video.list",
      "video.publish",
      "video.upload",
      "video.delete"
    ].join(",");

    const authUrl = `https://www.tiktok.com/auth/authorize/?` +
      `client_key=${clientKey}&` +
      `scope=${scopes}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${userId}`;

    res.json({ authUrl });
  } catch (error: any) {
    logger.error("Error generando URL de autorización de TikTok", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error generando URL de autorización" });
  }
});

// Callback de OAuth de TikTok
router.post("/oauth/callback", requireAuth, async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;
    const userId = req.user?.id;

    if (!userId || userId !== state) {
      return res.status(401).json({ error: "Usuario no autenticado o estado inválido" });
    }

    if (!code) {
      return res.status(400).json({ error: "Código de autorización requerido" });
    }

    // Intercambiar código por token de acceso
    const tokenResponse = await fetch("https://open-api.tiktok.com/oauth/access_token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code: code,
        grant_type: "authorization_code"
      })
    });

    const tokenData: any = await tokenResponse.json();

    if (!tokenData.data?.access_token) {
      return res.status(400).json({ error: "Error obteniendo token de acceso" });
    }

    // Obtener información del usuario de TikTok
    const userResponse = await fetch(`https://open-api.tiktok.com/user/info/?access_token=${tokenData.data.access_token}`);
    const userData: any = await userResponse.json();

    // Crear o actualizar integración de TikTok
    const integration = await Integration.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), provider: "tiktok" },
      {
        userId: new Types.ObjectId(userId),
        provider: "tiktok",
        externalId: userData.data?.user?.open_id || userData.data?.user?.union_id,
        accessToken: tokenData.data.access_token,
        name: `TikTok - ${userData.data?.user?.display_name || userData.data?.user?.username}`,
        status: "linked",
        meta: {
          tiktokUserId: userData.data?.user?.open_id,
          tiktokUsername: userData.data?.user?.username,
          tiktokDisplayName: userData.data?.user?.display_name,
          tiktokAvatar: userData.data?.user?.avatar_url,
          accessTokenExpires: tokenData.data?.expires_in ? new Date(Date.now() + tokenData.data.expires_in * 1000) : undefined
        }
      },
      { upsert: true, new: true }
    );

    logger.info("TikTok integrado exitosamente", {
      userId,
      integrationId: integration._id,
      tiktokUserId: userData.data?.user?.open_id
    });

    res.json({ 
      success: true, 
      message: "TikTok conectado exitosamente",
      integration: {
        id: integration._id,
        name: integration.name,
        status: integration.status
      },
      capabilities: {
        canRespondToComments: true,
        canManageContent: true,
        canViewAnalytics: true,
        canUploadVideos: true,
        canDeleteVideos: true,
        cannotAccessDMs: true,
        cannotAccessOtherUsersContent: true
      },
      limitations: {
        message: "TikTok híbrido: Solo puedes gestionar tu propio contenido y responder comentarios de tus videos. No hay acceso a mensajes directos.",
        details: [
          "✅ Responder comentarios de tus videos",
          "✅ Gestionar tus videos (subir, eliminar, ver estadísticas)",
          "✅ Ver analytics de tu perfil",
          "❌ No hay acceso a mensajes directos",
          "❌ No puedes ver comentarios de otros usuarios",
          "❌ No puedes moderar contenido de otros usuarios"
        ]
      }
    });

  } catch (error: any) {
    logger.error("Error en callback de TikTok", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error conectando TikTok", details: error.message });
  }
});

// Obtener comentarios de TikTok (videos propios)
router.get("/comments", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: "tiktok",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({ error: "TikTok no está conectado" });
    }

    // Obtener comentarios de videos propios de TikTok
    const comments = await getTikTokComments(integration);
    
    res.json({ 
      success: true, 
      comments: comments,
      note: "Solo comentarios de videos propios. TikTok no permite acceso a comentarios de otros usuarios."
    });

  } catch (error: any) {
    logger.error("Error obteniendo comentarios de TikTok", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error obteniendo comentarios", details: error.message });
  }
});

// Responder a comentarios de TikTok
router.post("/comments/:commentId/reply", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { commentId } = req.params;
    const { message } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!message) {
      return res.status(400).json({ error: "Mensaje es requerido" });
    }

    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: "tiktok",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({ error: "TikTok no está conectado" });
    }

    // Responder al comentario
    const result = await replyToTikTokComment(integration, commentId, message);
    
    if (result.success) {
      res.json({ success: true, message: "Respuesta enviada exitosamente" });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error: any) {
    logger.error("Error respondiendo a comentario de TikTok", {
      userId: req.user?.id,
      commentId: req.params.commentId,
      error: error.message
    });
    res.status(500).json({ error: "Error enviando respuesta", details: error.message });
  }
});

// Obtener videos de TikTok
router.get("/videos", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: "tiktok",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({ error: "TikTok no está conectado" });
    }

    // Obtener videos de TikTok
    const videos = await getTikTokVideos(integration);
    
    res.json({ 
      success: true, 
      videos: videos 
    });

  } catch (error: any) {
    logger.error("Error obteniendo videos de TikTok", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error obteniendo videos", details: error.message });
  }
});

// Gestionar videos de TikTok
router.post("/videos/upload", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { videoUrl, caption, privacyLevel } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!videoUrl || !caption) {
      return res.status(400).json({ error: "videoUrl y caption son requeridos" });
    }

    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: "tiktok",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({ error: "TikTok no está conectado" });
    }

    // Subir video a TikTok
    const result = await uploadTikTokVideo(integration, { videoUrl, caption, privacyLevel });
    
    if (result.success) {
      res.json({ success: true, message: "Video subido exitosamente", videoId: result.videoId });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error: any) {
    logger.error("Error subiendo video a TikTok", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error subiendo video", details: error.message });
  }
});

// Eliminar video de TikTok
router.delete("/videos/:videoId", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { videoId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: "tiktok",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({ error: "TikTok no está conectado" });
    }

    // Eliminar video de TikTok
    const result = await deleteTikTokVideo(integration, videoId);
    
    if (result.success) {
      res.json({ success: true, message: "Video eliminado exitosamente" });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error: any) {
    logger.error("Error eliminando video de TikTok", {
      userId: req.user?.id,
      videoId: req.params.videoId,
      error: error.message
    });
    res.status(500).json({ error: "Error eliminando video", details: error.message });
  }
});

// Obtener estadísticas de TikTok
router.get("/analytics", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: "tiktok",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({ error: "TikTok no está conectado" });
    }

    // Obtener estadísticas de TikTok
    const analytics = await getTikTokAnalytics(integration);
    
    res.json({ 
      success: true, 
      analytics: analytics 
    });

  } catch (error: any) {
    logger.error("Error obteniendo estadísticas de TikTok", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error obteniendo estadísticas", details: error.message });
  }
});

// Desconectar TikTok
router.delete("/disconnect", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const result = await Integration.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      provider: "tiktok"
    });

    if (!result) {
      return res.status(404).json({ error: "TikTok no está conectado" });
    }

    logger.info("TikTok desconectado", { userId, integrationId: result._id });

    res.json({ success: true, message: "TikTok desconectado exitosamente" });

  } catch (error: any) {
    logger.error("Error desconectando TikTok", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error desconectando TikTok", details: error.message });
  }
});

// Funciones auxiliares para TikTok
async function getTikTokComments(integration: any): Promise<any[]> {
  try {
    // TikTok API real para comentarios (limitada)
    // Solo funciona con videos propios del usuario conectado
    const response = await fetch(`https://open-api.tiktok.com/video/comments/?access_token=${integration.accessToken}`);
    const data: any = await response.json();
    
    if (data.data?.comments) {
      return data.data.comments.map((comment: any) => ({
        id: comment.comment_id,
        videoId: comment.video_id,
        userId: comment.user?.open_id,
        username: comment.user?.username,
        text: comment.text,
        timestamp: comment.create_time,
        provider: "tiktok",
        canReply: true // Solo comentarios de videos propios
      }));
    }
    
    // Si no hay comentarios reales, devolver array vacío
    return [];
  } catch (error) {
    logger.error("Error obteniendo comentarios de TikTok", { error });
    // En caso de error, devolver array vacío en lugar de datos simulados
    return [];
  }
}

async function getTikTokVideos(integration: any): Promise<any[]> {
  try {
    const response = await fetch(`https://open-api.tiktok.com/video/list/?access_token=${integration.accessToken}`);
    const data: any = await response.json();
    
    if (data.data?.videos) {
      return data.data.videos.map((video: any) => ({
        id: video.id,
        caption: video.title,
        thumbnail: video.cover_image_url,
        playCount: video.stats?.play_count || 0,
        likeCount: video.stats?.like_count || 0,
        commentCount: video.stats?.comment_count || 0,
        shareCount: video.stats?.share_count || 0,
        timestamp: video.create_time,
        provider: "tiktok"
      }));
    }
    
    return [];
  } catch (error) {
    logger.error("Error obteniendo videos de TikTok", { error });
    return [];
  }
}

async function getTikTokAnalytics(integration: any): Promise<any> {
  try {
    // Obtener estadísticas generales del usuario
    const response = await fetch(`https://open-api.tiktok.com/user/info/?access_token=${integration.accessToken}`);
    const data: any = await response.json();
    
    if (data.data?.user) {
      const user = data.data.user;
      return {
        totalVideos: user.video_count || 0,
        totalFollowers: user.follower_count || 0,
        totalFollowing: user.following_count || 0,
        totalLikes: user.like_count || 0,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
        verified: user.is_verified || false
      };
    }
    
    return {
      totalVideos: 0,
      totalFollowers: 0,
      totalFollowing: 0,
      totalLikes: 0,
      username: "N/A",
      displayName: "N/A",
      avatar: null,
      verified: false
    };
  } catch (error) {
    logger.error("Error obteniendo estadísticas de TikTok", { error });
    return {
      totalVideos: 0,
      totalFollowers: 0,
      totalFollowing: 0,
      totalLikes: 0,
      username: "N/A",
      displayName: "N/A",
      avatar: null,
      verified: false
    };
  }
}

async function uploadTikTokVideo(integration: any, videoData: {videoUrl: string, caption: string, privacyLevel?: string}): Promise<{success: boolean, videoId?: string, error?: string}> {
  try {
    // TikTok API para subir videos
    const response = await fetch(`https://open-api.tiktok.com/video/publish/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: integration.accessToken,
        video_url: videoData.videoUrl,
        text: videoData.caption,
        privacy_level: videoData.privacyLevel || "SELF_ONLY"
      })
    });
    
    const data: any = await response.json();
    
    if (data.data?.publish_id) {
      logger.info("Video subido exitosamente a TikTok", { videoId: data.data.publish_id });
      return { success: true, videoId: data.data.publish_id };
    } else {
      logger.error("Error subiendo video a TikTok", { error: data.error });
      return { success: false, error: data.error?.message || "Error subiendo video" };
    }
  } catch (error) {
    logger.error("Error subiendo video a TikTok", { error });
    return { success: false, error: "Error de conexión" };
  }
}

async function deleteTikTokVideo(integration: any, videoId: string): Promise<{success: boolean, error?: string}> {
  try {
    // TikTok API para eliminar videos
    const response = await fetch(`https://open-api.tiktok.com/video/delete/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: integration.accessToken,
        video_id: videoId
      })
    });
    
    const data: any = await response.json();
    
    if (data.data?.success) {
      logger.info("Video eliminado exitosamente de TikTok", { videoId });
      return { success: true };
    } else {
      logger.error("Error eliminando video de TikTok", { videoId, error: data.error });
      return { success: false, error: data.error?.message || "Error eliminando video" };
    }
  } catch (error) {
    logger.error("Error eliminando video de TikTok", { error, videoId });
    return { success: false, error: "Error de conexión" };
  }
}

async function replyToTikTokComment(integration: any, commentId: string, message: string): Promise<{success: boolean, error?: string}> {
  try {
    // TikTok API real para responder comentarios
    // Solo funciona con comentarios de videos propios
    const response = await fetch(`https://open-api.tiktok.com/video/comment/reply/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: integration.accessToken,
        comment_id: commentId,
        text: message
      })
    });
    
    const data: any = await response.json();
    
    if (data.data?.reply_id) {
      logger.info("Respuesta enviada exitosamente a comentario de TikTok", { commentId, replyId: data.data.reply_id });
      return { success: true };
    } else {
      logger.error("Error respondiendo a comentario de TikTok", { commentId, error: data.error });
      return { success: false, error: data.error?.message || "Error enviando respuesta" };
    }
  } catch (error) {
    logger.error("Error respondiendo a comentario de TikTok", { error, commentId });
    return { success: false, error: "Error de conexión" };
  }
}

export default router;
