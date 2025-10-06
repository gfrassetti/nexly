import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import logger from '../utils/logger';
import { unifiedMessagingService } from '../services/unifiedMessagingService';
import { UnifiedConversation } from '../models/UnifiedConversation';
import { UnifiedMessage } from '../models/UnifiedMessage';

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();

/**
 * GET /unified-inbox/conversations
 * Obtener todas las conversaciones unificadas del usuario
 */
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const {
      status = 'active',
      limit = 50,
      offset = 0,
      search
    } = req.query;

    const result = await unifiedMessagingService.getUserConversations(userId, {
      status: status as 'active' | 'archived' | 'blocked',
      limit: parseInt(limit as string) || 50,
      offset: parseInt(offset as string) || 0,
      search: search as string
    });

    if (result.success) {
      res.json({
        success: true,
        conversations: result.conversations,
        pagination: {
          limit: parseInt(limit as string) || 50,
          offset: parseInt(offset as string) || 0,
          total: result.conversations?.length || 0
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'get_conversations_failed',
        message: result.error || 'Error obteniendo conversaciones'
      });
    }

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error obteniendo conversaciones unificadas', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /unified-inbox/conversations/:conversationId/messages
 * Obtener mensajes de una conversación específica
 */
router.get('/conversations/:conversationId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { conversationId } = req.params;
    const { limit = 50, offset = 0, before } = req.query;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const result = await unifiedMessagingService.getConversationMessages(userId, conversationId, {
      limit: parseInt(limit as string) || 50,
      offset: parseInt(offset as string) || 0,
      before: before ? new Date(before as string) : undefined
    });

    if (result.success) {
      res.json({
        success: true,
        messages: result.messages,
        pagination: {
          limit: parseInt(limit as string) || 50,
          offset: parseInt(offset as string) || 0,
          total: result.messages?.length || 0
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'get_messages_failed',
        message: result.error || 'Error obteniendo mensajes'
      });
    }

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error obteniendo mensajes de conversación', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      conversationId: req.params.conversationId
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * POST /unified-inbox/conversations/:conversationId/messages
 * Enviar mensaje a una conversación
 */
router.post('/conversations/:conversationId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { conversationId } = req.params;
    const { content, replyTo } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    if (!content || !content.text) {
      return res.status(400).json({
        success: false,
        error: 'content_required',
        message: 'Contenido del mensaje requerido'
      });
    }

    const result = await unifiedMessagingService.sendMessage(userId, {
      conversationId,
      content,
      replyTo
    });

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Mensaje enviado exitosamente'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'send_message_failed',
        message: result.error || 'Error enviando mensaje'
      });
    }

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error enviando mensaje', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      conversationId: req.params.conversationId
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * PUT /unified-inbox/conversations/:conversationId/status
 * Actualizar estado de una conversación (archivar, bloquear, etc.)
 */
router.put('/conversations/:conversationId/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { conversationId } = req.params;
    const { status, tags, notes } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    if (!status || !['active', 'archived', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_status',
        message: 'Estado inválido. Debe ser: active, archived, o blocked'
      });
    }

    const conversation = await UnifiedConversation.findOneAndUpdate(
      {
        conversationId,
        userId: new Types.ObjectId(userId)
      },
      {
        status,
        ...(tags && { tags }),
        ...(notes !== undefined && { notes })
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'conversation_not_found',
        message: 'Conversación no encontrada'
      });
    }

    res.json({
      success: true,
      conversation: {
        conversationId: conversation.conversationId,
        status: conversation.status,
        tags: conversation.tags,
        notes: conversation.notes
      },
      message: 'Estado actualizado exitosamente'
    });

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error actualizando estado de conversación', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      conversationId: req.params.conversationId
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * PUT /unified-inbox/conversations/:conversationId/read
 * Marcar conversación como leída
 */
router.put('/conversations/:conversationId/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const conversation = await UnifiedConversation.findOneAndUpdate(
      {
        conversationId,
        userId: new Types.ObjectId(userId)
      },
      {
        unreadCount: 0
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'conversation_not_found',
        message: 'Conversación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Conversación marcada como leída'
    });

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error marcando conversación como leída', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      conversationId: req.params.conversationId
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /unified-inbox/stats
 * Obtener estadísticas de la bandeja unificada
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const [
      totalConversations,
      activeConversations,
      unreadConversations,
      channelStats
    ] = await Promise.all([
      UnifiedConversation.countDocuments({ userId: new Types.ObjectId(userId) }),
      UnifiedConversation.countDocuments({ 
        userId: new Types.ObjectId(userId), 
        status: 'active' 
      }),
      UnifiedConversation.countDocuments({ 
        userId: new Types.ObjectId(userId), 
        unreadCount: { $gt: 0 } 
      }),
      UnifiedConversation.aggregate([
        { $match: { userId: new Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$externalContact.channel',
            count: { $sum: 1 },
            unreadCount: { $sum: '$unreadCount' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalConversations,
        activeConversations,
        unreadConversations,
        channelBreakdown: channelStats.reduce((acc, stat) => {
          acc[stat._id] = {
            total: stat.count,
            unread: stat.unreadCount
          };
          return acc;
        }, {} as Record<string, { total: number; unread: number }>)
      }
    });

  } catch (error: unknown) {
    const userId = req.user?.id || req.user?._id;
    logger.error('Error obteniendo estadísticas de bandeja', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Error interno del servidor'
    });
  }
});

export default router;
