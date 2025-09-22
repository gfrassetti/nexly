// api/src/services/messageLimits.ts
import Subscription from '../models/Subscription';

export interface MessageLimits {
  maxMessagesPerDay: number;
  maxMessagesPerIntegration: number;
}

/**
 * Obtiene los límites de mensajes según el plan del usuario
 */
export async function getMessageLimits(userId: string): Promise<MessageLimits> {
  const subscription = await Subscription.findOne({ userId });
  
  if (!subscription) {
    // Usuario sin suscripción - límites mínimos
    return {
      maxMessagesPerDay: 10,
      maxMessagesPerIntegration: 10,
    };
  }

  // Durante trial, acceso completo
  if (subscription.status === 'trial') {
    return {
      maxMessagesPerDay: 999,
      maxMessagesPerIntegration: 999,
    };
  }

  // Según el plan
  switch (subscription.planType) {
    case 'basic':
      return {
        maxMessagesPerDay: 999,
        maxMessagesPerIntegration: 999,
      };
    case 'premium':
      return {
        maxMessagesPerDay: 999,
        maxMessagesPerIntegration: 999,
      };
    default:
      return {
        maxMessagesPerDay: 999,
        maxMessagesPerIntegration: 999,
      };
  }
}

/**
 * Obtiene el límite específico para una integración
 */
export async function getIntegrationMessageLimit(userId: string, integrationId: string): Promise<number> {
  const limits = await getMessageLimits(userId);
  return limits.maxMessagesPerIntegration;
}
