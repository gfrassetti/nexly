// api/src/services/messageLimits.ts
// SERVICIO CRÍTICO: Control de Costos - Throttling de Mensajes
// Este servicio evita pérdidas financieras limitando el uso según el plan

import Subscription from '../models/Subscription';
import { User } from '../models/User';
import logger from '../utils/logger';

export interface MessageLimits {
  maxMessagesPerDay: number;
  maxMessagesPerMonth: number;
  maxMessagesPerIntegration: number;
}

/**
 * LÍMITES POR PLAN - Basados en Costos Reales de Twilio + Meta
 * 
 * CÁLCULO DE RENTABILIDAD:
 * - Costo por conversación: $0.043 USD (Meta $0.038 + Twilio $0.005)
 * - Margen objetivo: 35%
 * - Fórmula: Límite = (Precio × (1 - Margen)) / Costo por conversación
 * 
 * IMPORTANTE: Estos límites cuentan "conversaciones iniciadas por empresa"
 * (mensajes fuera de ventana de 24h que requieren plantilla aprobada)
 * Los mensajes dentro de ventana de 24h son mucho más baratos (~$0.005)
 */
const PLAN_LIMITS = {
  free_trial: {
    maxMessagesPerDay: 5,        // Prueba muy limitada
    maxMessagesPerMonth: 50,     // ~50 conversaciones en trial ($2.15 costo)
    maxMessagesPerIntegration: 50
  },
  basic: {  // Plan Básico: $30 USD/mes
    maxMessagesPerDay: 20,       // ~20 conversaciones/día
    maxMessagesPerMonth: 450,    // 450 conversaciones = $19.35 costo, $10.65 ganancia (35%)
    maxMessagesPerIntegration: 450
  },
  premium: {  // Plan Premium: $60 USD/mes
    maxMessagesPerDay: 45,       // ~45 conversaciones/día
    maxMessagesPerMonth: 900,    // 900 conversaciones = $38.70 costo, $21.30 ganancia (35%)
    maxMessagesPerIntegration: 900
  },
  enterprise: {  // Plan Enterprise: $150 USD/mes
    maxMessagesPerDay: 110,
    maxMessagesPerMonth: 2250,   // 2,250 conversaciones = $96.75 costo, $53.25 ganancia (35%)
    maxMessagesPerIntegration: 2250
  },
  // Para usuarios sin plan ni trial - mínimo absoluto
  no_plan: {
    maxMessagesPerDay: 1,
    maxMessagesPerMonth: 10,     // Solo para probar la funcionalidad
    maxMessagesPerIntegration: 10
  }
};

/**
 * Obtiene los límites de mensajes según el plan del usuario
 * CRÍTICO: Estos límites evitan que un cliente te haga perder dinero
 */
export async function getMessageLimits(userId: string): Promise<MessageLimits> {
  const user = await User.findById(userId);
  const subscription = await Subscription.findOne({ userId });
  
  let planLimits;
  
  // Verificar suscripción primero
  if (subscription) {
    // Si tiene suscripción activa, usar límites según el plan
    if (subscription.status === 'trialing') {
      planLimits = PLAN_LIMITS.free_trial;
    } else if (subscription.status === 'active') {
      switch (subscription.planType) {
        case 'basic':
          planLimits = PLAN_LIMITS.basic;
          break;
        case 'premium':
          planLimits = PLAN_LIMITS.premium;
          break;
        default:
          planLimits = PLAN_LIMITS.basic;
      }
    } else {
      // Suscripción cancelada/pausada - límites de no plan
      planLimits = PLAN_LIMITS.no_plan;
    }
  } else if (user && user.isFreeTrialActive()) {
    // Período de prueba gratuito
    planLimits = PLAN_LIMITS.free_trial;
  } else {
    // Sin suscripción ni trial - límites mínimos
    planLimits = PLAN_LIMITS.no_plan;
  }
  
  logger.debug('Message limits calculated', {
    userId,
    limits: planLimits,
    hasSubscription: !!subscription,
    subscriptionStatus: subscription?.status,
    planType: subscription?.planType
  });
  
  return planLimits;
}

/**
 * Obtiene el límite específico para una integración
 */
export async function getIntegrationMessageLimit(userId: string, integrationId: string): Promise<number> {
  const limits = await getMessageLimits(userId);
  return limits.maxMessagesPerIntegration;
}

/**
 * ⚠️ FUNCIÓN CRÍTICA - FIREWALL FINANCIERO ⚠️
 * 
 * Verifica si el usuario puede enviar un mensaje y actualiza el contador
 * Esta función DEBE ser llamada ANTES de enviar cualquier mensaje por Twilio
 * 
 * IMPORTANTE: Cuenta "conversaciones iniciadas por empresa" 
 * (mensajes fuera de ventana de 24h = $0.043 USD c/u)
 * 
 * TODO: Implementar verificación de ventana de 24h para optimizar:
 * - Dentro de 24h: Respuesta barata (~$0.005) - No cuenta para límite
 * - Fuera de 24h: Conversación cara ($0.043) - SÍ cuenta para límite
 * 
 * Por ahora, cuenta TODOS los mensajes salientes como conversaciones caras
 * para máxima seguridad financiera.
 * 
 * @returns {allowed: true} si puede enviar, {allowed: false} si alcanzó el límite
 */
export async function checkAndIncrementUsage(
  userId: string,
  provider: string = 'whatsapp'
): Promise<{
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
  remaining: number;
}> {
  try {
    // 1. OBTENER LÍMITES del plan del usuario
    const limits = await getMessageLimits(userId);
    const monthLimit = limits.maxMessagesPerMonth;
    const dayLimit = limits.maxMessagesPerDay;
    
    // 2. OBTENER USO ACTUAL (mes actual)
    const Message = (await import('../models/Message')).Message;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const [monthUsage, dayUsage] = await Promise.all([
      Message.countDocuments({
        userId,
        provider,
        direction: 'out',  // Solo mensajes salientes cuentan para el límite
        timestamp: { $gte: startOfMonth }
      }),
      Message.countDocuments({
        userId,
        provider,
        direction: 'out',
        timestamp: { $gte: startOfDay }
      })
    ]);
    
    // 3. VERIFICAR LÍMITES
    // Verificar límite mensual primero
    if (monthUsage >= monthLimit) {
      logger.warn('Monthly message limit exceeded', {
        userId,
        provider,
        monthUsage,
        monthLimit
      });
      
      return {
        allowed: false,
        reason: `Has alcanzado tu límite mensual de ${monthLimit} conversaciones. Actualiza tu plan para enviar más mensajes.`,
        used: monthUsage,
        limit: monthLimit,
        remaining: 0
      };
    }
    
    // Verificar límite diario
    if (dayUsage >= dayLimit) {
      logger.warn('Daily message limit exceeded', {
        userId,
        provider,
        dayUsage,
        dayLimit
      });
      
      return {
        allowed: false,
        reason: `Has alcanzado tu límite diario de ${dayLimit} conversaciones. Podrás enviar más mañana.`,
        used: dayUsage,
        limit: dayLimit,
        remaining: 0
      };
    }
    
    // 4. PERMITIDO - Los mensajes se incrementarán automáticamente al guardar
    logger.info('Message send allowed', {
      userId,
      provider,
      monthUsage,
      monthLimit,
      dayUsage,
      dayLimit,
      remaining: monthLimit - monthUsage
    });
    
    return {
      allowed: true,
      used: monthUsage,
      limit: monthLimit,
      remaining: monthLimit - monthUsage
    };
    
  } catch (error: any) {
    logger.error('Error checking message usage', {
      error: error.message,
      userId,
      provider
    });
    
    // En caso de error, DENEGAR por seguridad
    return {
      allowed: false,
      reason: 'Error verificando límites de mensajes. Intenta de nuevo.',
      used: 0,
      limit: 0,
      remaining: 0
    };
  }
}

/**
 * Obtiene el uso actual de mensajes del usuario
 * Útil para mostrar en dashboards
 */
export async function getCurrentUsage(
  userId: string,
  provider: string = 'whatsapp'
): Promise<{
  dailyUsage: number;
  monthlyUsage: number;
  limits: MessageLimits;
}> {
  const Message = (await import('../models/Message')).Message;
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const [monthlyUsage, dailyUsage, limits] = await Promise.all([
    Message.countDocuments({
      userId,
      provider,
      direction: 'out',
      timestamp: { $gte: startOfMonth }
    }),
    Message.countDocuments({
      userId,
      provider,
      direction: 'out',
      timestamp: { $gte: startOfDay }
    }),
    getMessageLimits(userId)
  ]);
  
  return {
    dailyUsage,
    monthlyUsage,
    limits
  };
}

/**
 * Verifica si el usuario puede conectar una nueva integración
 */
export async function checkIntegrationLimits(userId: string): Promise<{
  canConnect: boolean;
  reason?: string;
  maxIntegrations: number;
  currentIntegrations: number;
}> {
  const user = await User.findById(userId);
  const subscription = await Subscription.findOne({ userId });
  
  // Límites según el plan
  let maxIntegrations = 1; // Plan gratuito
  
  if (subscription) {
    if (subscription.status === 'trialing') {
      maxIntegrations = 5; // Trial: hasta 5 integraciones
    } else if (subscription.status === 'active') {
      switch (subscription.planType) {
        case 'basic':
          maxIntegrations = 3;  // Plan Básico: 3 integraciones
          break;
        case 'premium':
          maxIntegrations = 10; // Plan Premium: 10 integraciones
          break;
        default:
          maxIntegrations = 3;
      }
    }
  }
  
  // Contar integraciones actuales
  const Integration = (await import('../models/Integration')).Integration;
  const currentIntegrations = await Integration.countDocuments({
    userId,
    status: 'linked'
  });
  
  const canConnect = currentIntegrations < maxIntegrations;
  
  return {
    canConnect,
    reason: canConnect ? undefined : `Límite de integraciones alcanzado. Máximo: ${maxIntegrations}`,
    maxIntegrations,
    currentIntegrations
  };
}