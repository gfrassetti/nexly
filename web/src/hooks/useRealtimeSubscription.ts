// web/src/hooks/useRealtimeSubscription.ts
"use client";
import { useEffect, useRef } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface UseRealtimeSubscriptionOptions {
  /** Número de intentos de polling (default: 15) */
  maxAttempts?: number;
  /** Intervalo de polling en ms (default: 2000) */
  pollInterval?: number;
  /** Callback cuando la suscripción cambia */
  onSubscriptionChange?: (userStatus: string) => void;
  /** Callback cuando se completa la sincronización */
  onSyncComplete?: () => void;
}

/**
 * Hook para sincronización automática en tiempo real de suscripciones
 * Detecta cambios después de pagos, cancelaciones, etc.
 * Útil en páginas como /dashboard después de retornar de Stripe
 */
export function useRealtimeSubscription(options: UseRealtimeSubscriptionOptions = {}) {
  const {
    maxAttempts = 15,
    pollInterval = 2000,
    onSubscriptionChange,
    onSyncComplete
  } = options;

  const { subscription, forceSync } = useSubscription();
  const previousStatusRef = useRef<string | null>(null);
  const pollCountRef = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Detectar si acabamos de volver de un pago (por timestamp en localStorage)
    const paymentInitiatedAt = localStorage.getItem('paymentInitiatedAt');
    const now = Date.now();
    
    if (paymentInitiatedAt) {
      const timeSincePay = now - parseInt(paymentInitiatedAt);
      
      // Si el pago fue hace menos de 2 minutos, iniciar polling
      if (timeSincePay < 2 * 60 * 1000) {
        console.log('🔄 Pago detectado recientemente. Iniciando sincronización en tiempo real...');
        startPolling();
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Monitorear cambios en el estado de la suscripción
  useEffect(() => {
    if (!subscription) return;

    const currentStatus = subscription.userSubscriptionStatus || 'none';

    // Si el estado cambió, disparar callback
    if (
      previousStatusRef.current &&
      previousStatusRef.current !== currentStatus
    ) {
      console.log(`✅ Cambio de estado detectado: ${previousStatusRef.current} → ${currentStatus}`);
      onSubscriptionChange?.(currentStatus);
    }

    previousStatusRef.current = currentStatus;
  }, [subscription?.userSubscriptionStatus, onSubscriptionChange, subscription]);

  const startPolling = () => {
    pollCountRef.current = 0;

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current++;
      console.log(`🔄 Sincronización (${pollCountRef.current}/${maxAttempts})`);

      try {
        await forceSync();
      } catch (error) {
        console.warn('Error durante sincronización:', error);
      }

      // Detener después de maxAttempts
      if (pollCountRef.current >= maxAttempts) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        console.log('✅ Sincronización completada');
        localStorage.removeItem('paymentInitiatedAt');
        onSyncComplete?.();
      }
    }, pollInterval);
  };

  return {
    /** Iniciar polling manual */
    startPolling,
    /** Detener polling */
    stopPolling: () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    },
    /** Estado actual de polling */
    isPolling: pollCountRef.current > 0 && pollCountRef.current < maxAttempts,
  };
}
