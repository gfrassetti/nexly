import { useSubscription } from '@/contexts/SubscriptionContext';

/**
 * Hook simplificado para usar el contexto de suscripción
 * Proporciona una interfaz más simple y directa
 */
export function useSubscriptionSimple() {
  const { subscription, loading, error, status, forceRefresh, updateAfterPayment } = useSubscription();

  return {
    // Estado básico
    isLoading: loading,
    error,
    subscription,

    // Estados simplificados
    isPaid: status.isPaid,
    isTrial: status.isTrial,
    isFree: status.isFree,

    // Datos del plan
    planType: subscription?.subscription?.planType,
    hasActiveSubscription: subscription?.hasSubscription || false,

    // Acciones
    refresh: forceRefresh,
    updateAfterPayment,

    // Funciones de utilidad
    canUseFeature: (feature: string) => {
      if (!subscription?.hasSubscription) return false;
      const planType = subscription.subscription?.planType;
      if (!planType) return false;

      const planFeatures = {
        crecimiento: ['whatsapp', 'instagram', 'telegram'],
        pro: ['whatsapp', 'instagram', 'messenger', 'telegram'],
        business: ['whatsapp', 'instagram', 'messenger', 'telegram', 'tiktok', 'twitter']
      };

      return planFeatures[planType]?.includes(feature) || false;
    },

    getMaxIntegrations: () => {
      if (!subscription?.hasSubscription) return 0;
      const planType = subscription.subscription?.planType;
      switch (planType) {
        case 'crecimiento': return 3;
        case 'pro': return 4;
        case 'business': return 999;
        default: return 0;
      }
    }
  };
}
