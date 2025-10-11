import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import logger from '../utils/logger';
import { Integration } from '../models/Integration';
import { Contact } from '../models/Contact';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { cacheService } from '../services/cacheService';
import handleAuth from '../middleware/auth';

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();
router.use(handleAuth);

/**
 * GET /analytics/dashboard
 * Endpoint simplificado para estadísticas del dashboard principal
 */
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    // 🚀 CACHE: Intentar obtener desde Redis primero
    const cachedStats = await cacheService.getStats(userId);
    if (cachedStats) {
      logger.info('Stats served from cache', { userId });
      return res.status(200).json({
        success: true,
        data: cachedStats
      });
    }

    // 📊 DB: Calcular estadísticas desde la base de datos
    logger.info('Calculating fresh stats from DB', { userId });
    
    const [
      activeIntegrations,
      unreadMessages
    ] = await Promise.all([
      // Integraciones activas (verificar tanto status como meta.status)
      Integration.countDocuments({
        userId: new Types.ObjectId(userId),
        $or: [
          { status: 'linked' },
          { 'meta.status': 'linked' }
        ]
      }),

      // Mensajes sin leer (solo mensajes entrantes que no se han leído)
      Message.countDocuments({
        userId: new Types.ObjectId(userId),
        direction: 'in',
        isRead: false
      })
    ]);

    const stats = {
      activeIntegrations,
      unreadMessages
    };

    // 💾 CACHE: Guardar en Redis para próximas consultas (15 min TTL)
    await cacheService.setStats(userId, stats, 900);

    logger.info('Stats calculated and cached', { 
      userId, 
      stats: {
        activeIntegrations,
        unreadMessages
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
        content: (msg as any).body || '',
        provider: (msg as any).provider,
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
 * GET /analytics/messages-timeline
 * Obtener estadísticas de mensajes por día (últimos 7 días)
 */
router.get('/messages-timeline', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    logger.info('Obteniendo timeline de mensajes', { userId });

    // Calcular fecha de hace 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Agregar mensajes por día y dirección
    const messagesTimeline = await Message.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            direction: "$direction"
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // Formatear datos para el gráfico
    const dateMap = new Map<string, { date: string; sent: number; received: number }>();
    
    // Inicializar todos los días de los últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, {
        date: dateStr,
        sent: 0,
        received: 0
      });
    }

    // Llenar con datos reales
    messagesTimeline.forEach((item: any) => {
      const dateStr = item._id.date;
      const direction = item._id.direction;
      const count = item.count;

      if (dateMap.has(dateStr)) {
        const entry = dateMap.get(dateStr)!;
        if (direction === 'out') {
          entry.sent = count;
        } else if (direction === 'in') {
          entry.received = count;
        }
      }
    });

    // Convertir a array y formatear fechas
    const formattedData = Array.from(dateMap.values()).map(item => ({
      date: new Date(item.date).toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      }),
      sent: item.sent,
      received: item.received
    }));

    logger.info('Timeline de mensajes calculado', { 
      userId, 
      dataPoints: formattedData.length 
    });

    res.status(200).json({
      success: true,
      data: formattedData
    });

  } catch (error: unknown) {
    logger.error('Error obteniendo timeline de mensajes', {
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

/**
 * GET /analytics/messages-timeline
 * Obtener timeline de mensajes de los últimos 7 días
 */
router.get('/messages-timeline', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'authentication_required',
        message: 'Token de autenticación requerido'
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const messagesTimeline = await Message.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            direction: "$direction"
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // Inicializar mapa de fechas para los últimos 7 días
    const dateMap = new Map<string, { date: string; sent: number; received: number }>();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { date: dateStr, sent: 0, received: 0 });
    }

    // Llenar el mapa con datos reales
    messagesTimeline.forEach((item: any) => {
      const dateStr = item._id.date;
      const direction = item._id.direction;
      const count = item.count;
      if (dateMap.has(dateStr)) {
        const entry = dateMap.get(dateStr)!;
        if (direction === 'out') {
          entry.sent = count;
        } else if (direction === 'in') {
          entry.received = count;
        }
      }
    });

    // Formatear datos para el frontend
    const formattedData = Array.from(dateMap.values()).map(item => ({
      date: new Date(item.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      sent: item.sent,
      received: item.received
    }));

    logger.info('Messages timeline generated', { 
      userId, 
      days: formattedData.length,
      totalMessages: messagesTimeline.reduce((acc, item) => acc + item.count, 0)
    });

    res.status(200).json({ 
      success: true, 
      data: formattedData 
    });
  } catch (error: unknown) {
    logger.error('Error obteniendo timeline de mensajes', {
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