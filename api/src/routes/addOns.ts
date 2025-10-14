import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createAddOnCheckoutSession, getUserActiveAddOns, getTotalAddOnConversations } from '../services/addOnService';
import logger from '../utils/logger';

const router = Router();

// Crear sesión de checkout para paquete de add-on
router.post('/create-checkout-session', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { source = 'emergency_modal' } = req.body;

    if (!['emergency_modal', 'preventive_dashboard'].includes(source)) {
      return res.status(400).json({ error: 'Fuente inválida' });
    }

    // Obtener el plan actual del usuario
    const Subscription = require('../models/Subscription').default;
    const subscription = await Subscription.findOne({
      userId,
      status: 'active'
    });

    if (!subscription) {
      return res.status(400).json({ error: 'Usuario no tiene una suscripción activa' });
    }

    const result = await createAddOnCheckoutSession({
      userId,
      planType: subscription.planType,
      source,
      req
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.info('Add-on checkout session created via API', {
      userId,
      planType: subscription.planType,
      source,
      sessionId: result.sessionId
    });

    res.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url
    });

  } catch (error: any) {
    logger.error('Error creating add-on checkout session', {
      error: error.message,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener add-ons activos del usuario
router.get('/active', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const activeAddOns = await getUserActiveAddOns(userId);
    const totalConversations = await getTotalAddOnConversations(userId);

    res.json({
      success: true,
      activeAddOns,
      totalAddOnConversations: totalConversations
    });

  } catch (error: any) {
    logger.error('Error getting user active add-ons', {
      error: error.message,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar límites de conversaciones (para el frontend)
router.get('/usage-limits', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Obtener suscripción activa
    const Subscription = require('../models/Subscription').default;
    const subscription = await Subscription.findOne({
      userId,
      status: 'active'
    });

    if (!subscription) {
      return res.status(400).json({ error: 'Usuario no tiene una suscripción activa' });
    }

    // Obtener límites del plan base
    const { PLAN_LIMITS } = require('../services/messageLimits');
    const planLimits = PLAN_LIMITS[subscription.planType] || PLAN_LIMITS.no_plan;

    // Obtener conversaciones adicionales de add-ons
    const addOnConversations = await getTotalAddOnConversations(userId);

    // Calcular límite total
    const totalLimit = planLimits.maxMessagesPerMonth + addOnConversations;

    // Obtener uso actual del mes
    const Message = require('../models/Message').default;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const currentUsage = await Message.countDocuments({
      userId,
      direction: 'out', // Solo conversaciones iniciadas
      timestamp: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });

    const remainingConversations = Math.max(0, totalLimit - currentUsage);
    const isNearLimit = (currentUsage / totalLimit) >= 0.8;
    const isAtLimit = currentUsage >= totalLimit;

    res.json({
      success: true,
      usage: {
        current: currentUsage,
        limit: totalLimit,
        remaining: remainingConversations,
        planBase: planLimits.maxMessagesPerMonth,
        addOns: addOnConversations,
        percentage: Math.round((currentUsage / totalLimit) * 100),
        isNearLimit,
        isAtLimit
      },
      planType: subscription.planType
    });

  } catch (error: any) {
    logger.error('Error getting usage limits', {
      error: error.message,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
