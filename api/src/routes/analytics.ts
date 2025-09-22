import { Router } from 'express';
import authenticateToken from '../middleware/auth';
import { asyncHandler } from '../utils/errorHandler';
import { Message } from '../models/Message';
import { Contact } from '../models/Contact';
import { Integration } from '../models/Integration';

const router = Router();

/**
 * Obtener métricas del dashboard
 */
router.get('/dashboard', authenticateToken, asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOfLastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Métricas A: Conversación
    const [
      totalContacts,
      conversationsToday,
      messagesToday,
      averageResponseTime,
      activeIntegrations,
      messagesByPlatform,
      recentMessages,
      unreadConversations,
      
      // Métricas comparativas
      contactsLastMonth,
      conversationsYesterday,
      responseTimeLastWeek,
      integrationsThisMonth
    ] = await Promise.all([
      // Totales
      Contact.countDocuments({ userId }),
      Message.countDocuments({ 
        userId, 
        timestamp: { $gte: startOfToday },
        direction: 'inbound'
      }),
      Message.countDocuments({ 
        userId, 
        timestamp: { $gte: startOfToday }
      }),
      
      // Tiempo de respuesta promedio (simulado por ahora)
      Promise.resolve(29), // En minutos
      
      // Integraciones activas
      Integration.countDocuments({ userId, status: 'active' }),
      
      // Mensajes por plataforma
      Message.aggregate([
        { $match: { userId } },
        { $group: { _id: '$platform', count: { $sum: 1 } } }
      ]),
      
      // Mensajes recientes (últimos 5)
      Message.find({ userId })
        .sort({ timestamp: -1 })
        .limit(5)
        .populate('contactId', 'name phone email'),
        
      // Conversaciones no leídas
      Message.countDocuments({ 
        userId, 
        direction: 'inbound',
        read: false 
      }),
      
      // Métricas comparativas
      Contact.countDocuments({ 
        userId, 
        createdAt: { $gte: startOfLastMonth }
      }),
      Message.countDocuments({ 
        userId, 
        timestamp: { $gte: startOfYesterday, $lt: startOfToday },
        direction: 'inbound'
      }),
      Promise.resolve(34), // Tiempo de respuesta la semana pasada (simulado)
      Integration.countDocuments({ 
        userId, 
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
      })
    ]);

    // Procesar mensajes por plataforma
    const platformStats: Record<string, number> = {};
    messagesByPlatform.forEach((item: any) => {
      platformStats[item._id || 'unknown'] = item.count;
    });

    // Calcular porcentajes de cambio
    const contactsChange = contactsLastMonth > 0 
      ? Math.round(((totalContacts - contactsLastMonth) / contactsLastMonth) * 100)
      : 0;
      
    const conversationsChange = conversationsYesterday > 0
      ? Math.round(((conversationsToday - conversationsYesterday) / conversationsYesterday) * 100)
      : 0;
      
    const responseTimeChange = responseTimeLastWeek > 0
      ? Math.round(((responseTimeLastWeek - averageResponseTime) / responseTimeLastWeek) * 100)
      : 0;

    res.json({
      success: true,
      metrics: {
        // Métricas principales
        totalContacts: {
          value: totalContacts,
          change: contactsChange,
          changeType: contactsChange >= 0 ? 'increase' : 'decrease'
        },
        conversationsToday: {
          value: conversationsToday,
          change: conversationsChange,
          changeType: conversationsChange >= 0 ? 'increase' : 'decrease'
        },
        averageResponseTime: {
          value: averageResponseTime,
          change: responseTimeChange,
          changeType: responseTimeChange >= 0 ? 'decrease' : 'increase' // Menos tiempo es mejor
        },
        activeIntegrations: {
          value: activeIntegrations,
          change: integrationsThisMonth,
          changeType: 'increase'
        },
        
        // Datos adicionales
        messagesByPlatform: platformStats,
        recentMessages,
        unreadConversations,
        
        // Métricas B: Negocio (simuladas por ahora)
        businessMetrics: {
          conversionRate: 12.5, // % de consultas que se convierten en ventas
          customerSatisfaction: 4.2, // Rating promedio
          peakHours: ['10:00-12:00', '15:00-17:00'], // Horarios pico
          channelPerformance: {
            whatsapp: { messages: platformStats.whatsapp || 0, satisfaction: 4.5 },
            instagram: { messages: platformStats.instagram || 0, satisfaction: 4.0 },
            messenger: { messages: platformStats.messenger || 0, satisfaction: 4.1 }
          }
        }
      }
    });

  } catch (error: any) {
    console.error('Error obteniendo analytics:', error);
    res.status(500).json({ 
      error: 'Error obteniendo métricas',
      details: error.message 
    });
  }
}));

/**
 * Obtener métricas de IA
 */
router.get('/ai-metrics', authenticateToken, asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // Por ahora retornamos métricas simuladas
    // En el futuro se pueden calcular basadas en logs de IA
    const aiMetrics = {
      autoResponsesGenerated: 45,
      sentimentAnalysisAccuracy: 89,
      timeSavedInMinutes: 180,
      humanInterventionRate: 23, // % de casos que requieren intervención humana
      satisfactionScore: 4.1
    };

    res.json({
      success: true,
      aiMetrics
    });

  } catch (error: any) {
    console.error('Error obteniendo métricas de IA:', error);
    res.status(500).json({ 
      error: 'Error obteniendo métricas de IA',
      details: error.message 
    });
  }
}));

export default router;
