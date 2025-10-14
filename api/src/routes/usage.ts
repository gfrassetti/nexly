import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getTotalAddOnConversations } from '../services/addOnService';
import { getMessageLimits } from '../services/messageLimits';
import { Message } from '../models/Message';
import logger from '../utils/logger';

const router = Router();

// GET /api/usage/conversations
// Obtiene el uso actual de conversaciones del usuario
router.get('/conversations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Obtener límites del plan
    const limits = await getMessageLimits(userId);
    
    // Obtener add-ons activos
    const addOnConversations = await getTotalAddOnConversations(userId);
    
    // Calcular límite total (plan + add-ons)
    const totalMonthlyLimit = limits.maxMessagesPerMonth + addOnConversations;
    
    // Obtener uso actual del mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyUsage = await Message.countDocuments({
      userId,
      provider: 'whatsapp', // Por ahora solo WhatsApp
      direction: 'out', // Solo mensajes salientes cuentan
      timestamp: { $gte: startOfMonth }
    });
    
    // Obtener uso actual del día
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const dailyUsage = await Message.countDocuments({
      userId,
      provider: 'whatsapp',
      direction: 'out',
      timestamp: { $gte: startOfDay }
    });
    
    // Calcular porcentajes
    const monthlyPercentage = totalMonthlyLimit > 0 ? (monthlyUsage / totalMonthlyLimit) * 100 : 0;
    const dailyPercentage = limits.maxMessagesPerDay > 0 ? (dailyUsage / limits.maxMessagesPerDay) * 100 : 0;
    
    // Determinar estado
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (monthlyPercentage >= 90 || dailyPercentage >= 90) {
      status = 'critical';
    } else if (monthlyPercentage >= 70 || dailyPercentage >= 70) {
      status = 'warning';
    }
    
    res.json({
      success: true,
      data: {
        monthly: {
          used: monthlyUsage,
          limit: totalMonthlyLimit,
          baseLimit: limits.maxMessagesPerMonth,
          addOnLimit: addOnConversations,
          percentage: Math.round(monthlyPercentage),
          remaining: Math.max(0, totalMonthlyLimit - monthlyUsage)
        },
        daily: {
          used: dailyUsage,
          limit: limits.maxMessagesPerDay,
          percentage: Math.round(dailyPercentage),
          remaining: Math.max(0, limits.maxMessagesPerDay - dailyUsage)
        },
        status,
        canSend: monthlyUsage < totalMonthlyLimit && dailyUsage < limits.maxMessagesPerDay
      }
    });
    
  } catch (error: any) {
    logger.error('Error getting conversation usage', {
      userId: (req as AuthRequest).user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/usage/add-ons
// Obtiene los add-ons activos del usuario
router.get('/add-ons', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { getUserActiveAddOns } = await import('../services/addOnService');
    const activeAddOns = await getUserActiveAddOns(userId);
    
    res.json({
      success: true,
      data: activeAddOns
    });
    
  } catch (error: any) {
    logger.error('Error getting add-ons', {
      userId: (req as AuthRequest).user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
