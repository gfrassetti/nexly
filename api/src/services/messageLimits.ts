// api/src/services/messageLimits.ts
import Subscription from '../models/Subscription';
import { User } from '../models/User';

export interface MessageLimits {
  maxMessagesPerDay: number;
  maxMessagesPerIntegration: number;
}

/**
 * Obtiene los límites de mensajes según el plan del usuario
 */
export async function getMessageLimits(userId: string): Promise<MessageLimits> {
  const user = await User.findById(userId);
  const subscription = await Subscription.findOne({ userId });
  
  // Verificar suscripción primero
  if (subscription) {
    // Si tiene suscripción (aunque esté cancelada/pausada), usar límites de suscripción
    // Durante trial, acceso completo
    if (subscription.status === 'trialing') {
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
  
  // Solo si NO tiene suscripción, verificar período de prueba gratuito
  if (user && user.isFreeTrialActive()) {
    return {
      maxMessagesPerDay: 999,
      maxMessagesPerIntegration: 999,
    };
  }
  
  // Usuario sin suscripción ni período de prueba - límites mínimos
  return {
    maxMessagesPerDay: 10,
    maxMessagesPerIntegration: 10,
  };
}

/**
 * Obtiene el límite específico para una integración
 */
export async function getIntegrationMessageLimit(userId: string, integrationId: string): Promise<number> {
  const limits = await getMessageLimits(userId);
  return limits.maxMessagesPerIntegration;
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
      maxIntegrations = 999; // Trial activo
    } else {
      switch (subscription.planType) {
        case 'basic':
          maxIntegrations = 3;
          break;
        case 'premium':
          maxIntegrations = 999; // Premium: ilimitadas
          break;
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