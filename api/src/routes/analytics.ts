import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import logger from '../utils/logger';
import { Integration } from '../models/Integration';
import { Contact } from '../models/Contact';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { UnifiedConversation } from '../models/UnifiedConversation';
import { UnifiedMessage } from '../models/UnifiedMessage';

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();

/**
 * GET /analytics/dashboard-stats
 * Obtener estadísticas del dashboard basadas en integraciones exitosas
 */
router.get('/dashboard-stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    logger.info('Obteniendo estadísticas del dashboard', { userId });

    // Obtener integraciones activas del usuario
    const activeIntegrations = await Integration.find({
      userId: new Types.ObjectId(userId),
      status: 'linked'
    });

    const integrationIds = activeIntegrations.map(integration => integration._id);

    // Estadísticas básicas
    const [
      totalContacts,
      totalMessages,
      conversationsToday,
      unreadConversations,
      messagesByPlatform
    ] = await Promise.all([
      // Total de contactos únicos
      Contact.countDocuments({
        userId: new Types.ObjectId(userId)
      }),

      // Total de mensajes
      Message.countDocuments({
        userId: new Types.ObjectId(userId)
      }),

      // Conversaciones de hoy
      Conversation.countDocuments({
        userId: new Types.ObjectId(userId),
        updatedAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }),

      // Conversaciones no leídas
      Conversation.countDocuments({
        userId: new Types.ObjectId(userId),
        unreadCount: { $gt: 0 }
      }),

      // Mensajes por plataforma
      Message.aggregate([
        { $match: { userId: new Types.ObjectId(userId) } },
        { $group: { _id: '$provider', count: { $sum: 1 } } }
      ])
    ]);

    // Calcular tiempo promedio de respuesta (simulado por ahora)
    const averageResponseTime = 4.2; // TODO: Implementar cálculo real

    // Obtener mensajes recientes
    const recentMessages = await Message.find({
      userId: new Types.ObjectId(userId)
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('contactId', 'name phoneNumber')
      .select('content provider createdAt contactId');

    // Formatear mensajes por plataforma
    const platformStats: Record<string, number> = {};
    messagesByPlatform.forEach((item: any) => {
      platformStats[item._id] = item.count;
    });

    // Asegurar que todas las plataformas tengan un valor
    const platforms = ['whatsapp', 'instagram', 'messenger', 'telegram'];
    platforms.forEach(platform => {
      if (!platformStats[platform]) {
        platformStats[platform] = 0;
      }
    });

    const stats = {
      totalContacts,
      totalMessages,
      conversationsToday,
      averageResponseTime,
      activeIntegrations: activeIntegrations.length,
      messagesByPlatform: platformStats,
      recentMessages: recentMessages.map(msg => ({
        id: msg._id,
        content: msg.content,
        provider: msg.provider,
        createdAt: msg.createdAt,
        contact: msg.contactId
      })),
      unreadConversations
    };

    logger.info('Estadísticas calculadas', { 
      userId, 
      stats: {
        totalContacts,
        totalMessages,
        activeIntegrations: activeIntegrations.length,
        conversationsToday,
        unreadConversations
      }
    });

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error: unknown) {
    logger.error('Error obteniendo estadísticas del dashboard', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /analytics/integration-stats
 * Obtener estadísticas específicas por integración
 */
router.get('/integration-stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const integrations = await Integration.find({
      userId: new Types.ObjectId(userId),
      status: 'linked'
    });

    const integrationStats = await Promise.all(
      integrations.map(async (integration) => {
        const messageCount = await Message.countDocuments({
          userId: new Types.ObjectId(userId),
          provider: integration.provider
        });

        const contactCount = await Contact.countDocuments({
          userId: new Types.ObjectId(userId),
          provider: integration.provider
        });

        return {
          id: integration._id,
          provider: integration.provider,
          name: integration.name,
          messageCount,
          contactCount,
          connectedAt: integration.createdAt,
          lastActivity: integration.updatedAt
        };
      })
    );

    res.status(200).json({
      success: true,
      data: integrationStats
    });

  } catch (error: unknown) {
    logger.error('Error obteniendo estadísticas de integraciones', {
      userId: req.user?.id || req.user?._id,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Error interno del servidor'
    });
  }
});

export default router;