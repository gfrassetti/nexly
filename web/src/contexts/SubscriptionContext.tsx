"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionData {
  hasSubscription: boolean;
  status?: 'none' | 'trialing' | 'active' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  userSubscriptionStatus?: 'none' | 'trial_pending_payment_method' | 'active_trial' | 'active_paid' | 'cancelled';
  subscription?: {
    id: string;
    planType: 'basic' | 'premium';
    status: 'trialing' | 'active' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
    trialEndDate: string;
    daysRemaining: number;
    gracePeriodDaysRemaining: number;
    isTrialActive: boolean;
    isActive: boolean;
    isPaused: boolean;
    isCancelled: boolean;
    isInGracePeriod: boolean;
    isIncomplete: boolean;
    isPastDue: boolean;
    isUnpaid: boolean;
    pausedAt?: string;
    cancelledAt?: string;
    gracePeriodEndDate?: string;
    maxIntegrations: number;
    stripeSubscriptionId?: string;
    // mercadoPagoSubscriptionId?: string; // Hidden for now
  };
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  canUseFeature: (feature: string) => boolean;
  getMaxIntegrations: () => number;
  isTrialActive: () => boolean;
  isActive: () => boolean;
  isPaused: () => boolean;
  isCancelled: () => boolean;
  isInGracePeriod: () => boolean;
  isPendingPaymentMethod: () => boolean;
  isIncomplete: () => boolean;
  isPastDue: () => boolean;
  isUnpaid: () => boolean;
  pauseSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updateAfterPayment: (newSubscriptionData: any) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { token } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionStatus = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/subscriptions/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Si es error 429, mostrar mensaje específico
        if (response.status === 429) {
          throw new Error('Demasiados intentos. Intenta nuevamente en 15 minutos.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSubscription(data);
    } catch (err: any) {
      console.error('Error fetching subscription status:', err);
      setError(err.message || 'Error al cargar el estado de suscripción');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Limpiar estado anterior cuando cambia el token
    setSubscription(null);
    setError(null);
    setLoading(true);
    
    if (token) {
      fetchSubscriptionStatus();
    } else {
      setLoading(false);
    }
  }, [token]);

  // NO auto-refresh si hay error de rate limit - esto causa más problemas

  const canUseFeature = (feature: string): boolean => {
    // Si está pendiente de método de pago, no puede usar features
    if (subscription?.userSubscriptionStatus === 'trial_pending_payment_method') {
      return false;
    }

    if (!subscription?.hasSubscription || !subscription.subscription) {
      return false;
    }

    const sub = subscription.subscription;
    
    // Durante el trial, acceso completo
    if (sub.isTrialActive) {
      return true;
    }

    // Durante suscripción activa, verificar límites del plan
    if (sub.isActive) {
      const planFeatures = {
        basic: ['whatsapp', 'instagram'],
        premium: ['whatsapp', 'instagram', 'messenger', 'tiktok', 'telegram', 'twitter']
      };
      
      return planFeatures[sub.planType]?.includes(feature) || false;
    }

    return false;
  };

  const getMaxIntegrations = (): number => {
    // Si está pendiente de método de pago, no puede usar integraciones
    if (subscription?.userSubscriptionStatus === 'trial_pending_payment_method') {
      return 0;
    }

    if (!subscription?.hasSubscription || !subscription.subscription) {
      return 0;
    }

    const sub = subscription.subscription;
    
    if (sub.isTrialActive) {
      return 999; // Durante trial, acceso completo
    }

    return sub.planType === 'basic' ? 2 : 999;
  };

  const isTrialActive = (): boolean => {
    return subscription?.subscription?.isTrialActive || false;
  };

  const isActive = (): boolean => {
    return subscription?.subscription?.isActive || false;
  };

  const isPaused = (): boolean => {
    return subscription?.subscription?.isPaused || false;
  };

  const isCancelled = (): boolean => {
    return subscription?.subscription?.isCancelled || false;
  };

  const isInGracePeriod = (): boolean => {
    return subscription?.subscription?.isInGracePeriod || false;
  };

  const isPendingPaymentMethod = (): boolean => {
    return subscription?.userSubscriptionStatus === 'trial_pending_payment_method';
  };

  const isIncomplete = (): boolean => {
    return subscription?.subscription?.status === 'incomplete';
  };

  const isPastDue = (): boolean => {
    return subscription?.subscription?.status === 'past_due';
  };

  const isUnpaid = (): boolean => {
    return subscription?.subscription?.status === 'unpaid';
  };

  const pauseSubscription = async (): Promise<void> => {
    if (!token) return;

    try {
      const endpoint = '/stripe/pause/pause';

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription?.subscription?.stripeSubscriptionId,
          pauseBehavior: 'mark_uncollectible', // Marcar facturas como no cobrables
          resumeBehavior: 'create_prorations', // Crear proraciones al reanudar
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar estado local inmediatamente para UX instantánea
        if (subscription?.subscription) {
          setSubscription({
            ...subscription,
            subscription: {
              ...subscription.subscription,
              status: 'paused',
              pausedAt: new Date().toISOString(),
              isPaused: true,
              isActive: false,
            }
          });
        }
        // Refrescar desde el servidor en background para sincronizar
        fetchSubscriptionStatus().catch(console.error);
      } else {
        throw new Error(data.error || 'Error al pausar la suscripción');
      }
    } catch (error) {
      console.error('Error pausing subscription:', error);
      throw error;
    }
  };

  const reactivateSubscription = async (): Promise<void> => {
    if (!token) return;

    try {
      const endpoint = '/stripe/pause/resume';

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription?.subscription?.stripeSubscriptionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar estado local inmediatamente para UX instantánea
        if (subscription?.subscription) {
          setSubscription({
            ...subscription,
            subscription: {
              ...subscription.subscription,
              status: 'active',
              isPaused: false,
              isActive: true,
              isCancelled: false,
              pausedAt: undefined,
            }
          });
        }
        
        // Refrescar desde el servidor en background para sincronizar
        fetchSubscriptionStatus().catch(console.error);
      } else {
        throw new Error(data.error || 'Error al reactivar la suscripción');
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    if (!token) return;

    try {
      // Determinar si es suscripción de Stripe o MercadoPago
      const endpoint = subscription?.subscription?.stripeSubscriptionId 
        ? '/stripe/cancel' 
        : '/stripe/cancel'; // Force Stripe for now

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar estado local inmediatamente para UX instantánea
        if (subscription?.subscription) {
          setSubscription({
            ...subscription,
            subscription: {
              ...subscription.subscription,
              status: 'canceled',
              cancelledAt: new Date().toISOString(),
              isCancelled: true,
              isActive: false,
              isPaused: false,
            }
          });
        }
        // Refrescar desde el servidor en background para sincronizar
        fetchSubscriptionStatus().catch(console.error);
      } else {
        throw new Error(data.error || 'Error al cancelar la suscripción');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  };

  // Función para actualizar el estado después de un pago exitoso
  const updateAfterPayment = (newSubscriptionData: any) => {
    setSubscription(newSubscriptionData);
    setError(null);
  };

  const value: SubscriptionContextType = {
    subscription,
    loading,
    error,
    refetch: fetchSubscriptionStatus,
    canUseFeature,
    getMaxIntegrations,
    isTrialActive,
    isActive,
    isPaused,
    isCancelled,
    isInGracePeriod,
    isPendingPaymentMethod,
    isIncomplete,
    isPastDue,
    isUnpaid,
    pauseSubscription,
    reactivateSubscription,
    cancelSubscription,
    updateAfterPayment,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
