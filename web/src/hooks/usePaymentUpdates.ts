import { useEffect, useRef, useCallback } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface SubscriptionData {
  hasSubscription: boolean;
  subscription?: {
    id: string;
    planType: 'crecimiento' | 'pro' | 'business';
    status: 'trialing' | 'active' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
    stripeSubscriptionId?: string;
  };
  userSubscriptionStatus?: 'none' | 'trial_pending_payment_method' | 'active_trial' | 'active_paid' | 'cancelled';
}

interface PaymentUpdateHookOptions {
  enabled?: boolean;
  pollingInterval?: number;
  maxRetries?: number;
}

export function usePaymentUpdates(options: PaymentUpdateHookOptions = {}) {
  const { enabled = true, pollingInterval = 2000, maxRetries = 10 } = options;
  const { subscription, forceRefresh, updateAfterPayment } = useSubscription();
  const retryCount = useRef(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasUpdatedAfterPayment = useRef(false);

  // Función para manejar la actualización después del pago
  const handlePaymentSuccess = useCallback(async (newSubscriptionData: SubscriptionData) => {
    if (hasUpdatedAfterPayment.current) return;

    console.log('💳 Payment success detected, updating context immediately');
    hasUpdatedAfterPayment.current = true;

    // Actualizar el contexto inmediatamente
    updateAfterPayment(newSubscriptionData);

    // Detener el polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [updateAfterPayment]);

  // Función para verificar cambios en la suscripción mediante polling
  const checkForUpdates = useCallback(async () => {
    if (retryCount.current >= maxRetries) {
      console.log('⏹️ Max retries reached, stopping polling');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    try {
      await forceRefresh();
      retryCount.current++;

      // Si ahora tenemos una suscripción activa, detener polling
      if (subscription?.hasSubscription && !hasUpdatedAfterPayment.current) {
        console.log('✅ Subscription active detected, stopping polling');
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (error) {
      console.error('❌ Error during polling:', error);
    }
  }, [maxRetries, forceRefresh, subscription?.hasSubscription]);

  // Iniciar polling cuando el componente se monte
  useEffect(() => {
    if (!enabled) return;

    console.log('🔄 Starting payment update polling...');

    // Iniciar polling inmediato
    checkForUpdates();
    pollingRef.current = setInterval(checkForUpdates, pollingInterval);

    // Listener para mensajes de Stripe (cuando el usuario regresa)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'payment_completed' && event.data?.subscriptionData) {
        handlePaymentSuccess(event.data.subscriptionData);
      }
    };

    // Listener para focus (cuando el usuario regresa a la pestaña)
    const handleFocus = () => {
      if (!hasUpdatedAfterPayment.current && !subscription?.hasSubscription) {
        console.log('👁️ Window focused, checking for updates...');
        checkForUpdates();
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, pollingInterval, subscription?.hasSubscription, forceRefresh, checkForUpdates, handlePaymentSuccess]);

  // Función para forzar actualización manual
  const forceUpdate = async () => {
    retryCount.current = 0;
    hasUpdatedAfterPayment.current = false;
    await checkForUpdates();
  };

  return {
    handlePaymentSuccess,
    forceUpdate,
    isPolling: pollingRef.current !== null,
    retryCount: retryCount.current
  };
}
