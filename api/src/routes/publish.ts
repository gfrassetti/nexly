import express, { Request, Response } from "express";
import { Types } from "mongoose";
import { Integration } from "../models/Integration";
import logger from "../utils/logger";
import requireAuth from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB límite
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen y video'));
    }
  }
});

// Obtener integraciones disponibles para publicación
router.get("/integrations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Buscar integraciones de TikTok e Instagram
    const integrations = await Integration.find({
      userId: new Types.ObjectId(userId),
      provider: { $in: ["tiktok", "instagram"] },
      status: "linked"
    });

    const availableIntegrations = integrations.map(integration => ({
      id: integration._id,
      provider: integration.provider,
      name: integration.name,
      status: integration.status,
      capabilities: getProviderCapabilities(integration.provider)
    }));

    res.json({
      success: true,
      integrations: availableIntegrations
    });

  } catch (error: any) {
    logger.error("Error obteniendo integraciones para publicación", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error obteniendo integraciones", details: error.message });
  }
});

// Publicar contenido en múltiples plataformas
router.post("/publish", requireAuth, upload.single('media'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { caption, platforms, scheduleTime } = req.body;
    const mediaFile = req.file;

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!caption || !platforms) {
      return res.status(400).json({ error: "Caption y platforms son requeridos" });
    }

    if (!mediaFile) {
      return res.status(400).json({ error: "Archivo de media es requerido" });
    }

    const platformArray = Array.isArray(platforms) ? platforms : [platforms];
    const results = [];

    // Procesar cada plataforma
    for (const platform of platformArray) {
      try {
        const integration = await Integration.findOne({
          userId: new Types.ObjectId(userId),
          provider: platform,
          status: "linked"
        });

        if (!integration) {
          results.push({
            platform,
            success: false,
            error: `${platform} no está conectado`
          });
          continue;
        }

        // Publicar según la plataforma
        let publishResult;
        if (platform === "tiktok") {
          publishResult = await publishToTikTok(integration, mediaFile, caption);
        } else if (platform === "instagram") {
          publishResult = await publishToInstagram(integration, mediaFile, caption);
        } else {
          // Plataforma no soportada
          publishResult = {
            success: false,
            error: `Plataforma ${platform} no soportada`
          };
        }

        results.push({
          platform,
          success: publishResult.success,
          postId: publishResult.postId,
          error: publishResult.error
        });

      } catch (error: any) {
        logger.error(`Error publicando en ${platform}`, {
          userId,
          platform,
          error: error.message
        });
        results.push({
          platform,
          success: false,
          error: error.message
        });
      }
    }

    // Limpiar archivo temporal
    if (mediaFile && fs.existsSync(mediaFile.path)) {
      fs.unlinkSync(mediaFile.path);
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    res.json({
      success: successCount > 0,
      message: `Publicado en ${successCount} de ${totalCount} plataformas`,
      results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    });

  } catch (error: any) {
    logger.error("Error en publicación unificada", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error en publicación", details: error.message });
  }
});

// Obtener historial de publicaciones
router.get("/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // TODO: Implementar modelo de historial de publicaciones
    // Por ahora devolver array vacío
    res.json({
      success: true,
      publications: []
    });

  } catch (error: any) {
    logger.error("Error obteniendo historial de publicaciones", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error obteniendo historial", details: error.message });
  }
});

// Funciones auxiliares
function getProviderCapabilities(provider: string) {
  const capabilities = {
    tiktok: {
      supportsVideo: true,
      supportsImage: false,
      maxVideoSize: "100MB",
      maxDuration: "10 minutos",
      formats: ["mp4", "mov", "avi"]
    },
    instagram: {
      supportsVideo: true,
      supportsImage: true,
      maxVideoSize: "100MB",
      maxImageSize: "30MB",
      maxDuration: "60 segundos",
      formats: ["mp4", "mov", "jpg", "png", "gif"]
    }
  };

  return capabilities[provider as keyof typeof capabilities] || {};
}

async function publishToTikTok(integration: any, mediaFile: any, caption: string): Promise<{success: boolean, postId?: string, error?: string}> {
  try {
    // Leer el archivo
    const fileBuffer = fs.readFileSync(mediaFile.path);
    const base64Media = fileBuffer.toString('base64');

    // TikTok API para subir video
    const response = await fetch(`https://open-api.tiktok.com/video/publish/`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${integration.accessToken}`
      },
      body: JSON.stringify({
        video_data: base64Media,
        text: caption,
        privacy_level: "PUBLIC_TO_EVERYONE"
      })
    });

    const data: any = await response.json();

    if (data.data?.publish_id) {
      logger.info("Contenido publicado exitosamente en TikTok", { 
        postId: data.data.publish_id,
        userId: integration.userId 
      });
      return { success: true, postId: data.data.publish_id };
    } else {
      logger.error("Error publicando en TikTok", { error: data.error });
      return { success: false, error: data.error?.message || "Error publicando en TikTok" };
    }
  } catch (error: any) {
    logger.error("Error publicando en TikTok", { error: error.message });
    return { success: false, error: "Error de conexión con TikTok" };
  }
}

async function publishToInstagram(integration: any, mediaFile: any, caption: string): Promise<{success: boolean, postId?: string, error?: string}> {
  try {
    // Instagram Graph API para publicar contenido
    const isVideo = mediaFile.mimetype.startsWith('video/');
    
    let response;
    if (isVideo) {
      // Publicar video
      response = await fetch(`https://graph.facebook.com/v18.0/${integration.externalId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "VIDEO",
          video_url: `file://${mediaFile.path}`, // En producción, subir a un servidor público
          caption: caption,
          access_token: integration.accessToken
        })
      });
    } else {
      // Publicar imagen
      response = await fetch(`https://graph.facebook.com/v18.0/${integration.externalId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: `file://${mediaFile.path}`, // En producción, subir a un servidor público
          caption: caption,
          access_token: integration.accessToken
        })
      });
    }

    const data: any = await response.json();

    if (data.id) {
      // Publicar el contenido
      const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${integration.externalId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: data.id,
          access_token: integration.accessToken
        })
      });

      const publishData: any = await publishResponse.json();

      if (publishData.id) {
        logger.info("Contenido publicado exitosamente en Instagram", { 
          postId: publishData.id,
          userId: integration.userId 
        });
        return { success: true, postId: publishData.id };
      } else {
        return { success: false, error: publishData.error?.message || "Error publicando en Instagram" };
      }
    } else {
      logger.error("Error creando media en Instagram", { error: data.error });
      return { success: false, error: data.error?.message || "Error creando media en Instagram" };
    }
  } catch (error: any) {
    logger.error("Error publicando en Instagram", { error: error.message });
    return { success: false, error: "Error de conexión con Instagram" };
  }
}

export default router;
