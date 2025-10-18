"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface SubscriptionData {
  hasSubscription: boolean;
  status?: 'none' | 'trialing' | 'active' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  userSubscriptionStatus?: 'none' | 'trial_pending_payment_method' | 'active_trial' | 'active_paid' | 'cancelled';
  subscription?: {
    id: string;
    planType: 'crecimiento' | 'pro' | 'business';
    status: 'trialing' | 'active' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
    trialEndDate: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
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
  };
  freeTrial?: {
    used: boolean;
    canUse: boolean;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    timeRemaining: number;
    hoursRemaining: number;
  };
}

type SubscriptionStatus = {
  trialActive: boolean;
  active: boolean;
  paused: boolean;
  cancelled: boolean;
  inGracePeriod: boolean;
  pendingPaymentMethod: boolean;
  incomplete: boolean;
  pastDue: boolean;
  unpaid: boolean;
};

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  status: SubscriptionStatus;
  refetch: () => Promise<void>;
  canUseFeature: (feature: string) => boolean;
  getMaxIntegrations: () => number;
  pauseSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updateAfterPayment: (newSubscriptionData: SubscriptionData) => void;
  startFreeTrial: () => Promise<void>;
  canUseFreeTrial: () => boolean;
  isFreeTrialActive: () => boolean;
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

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/subscriptions/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit alcanzado, asumiendo sin suscripción');
          setSubscription({
            hasSubscription: false,
            status: 'none',
            userSubscriptionStatus: 'none'
          });
          setError(null);
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSubscription(data);
    } catch (err: any) {
      console.warn('Error al cargar suscripción, asumiendo sin suscripción:', err.message);
      setSubscription({
        hasSubscription: false,
        status: 'none',
        userSubscriptionStatus: 'none'
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Limpiar estado anterior cuando cambia el token
    setSubscription(null);
    setError(null);
    setLoading(true);
    
    if (token) {
      fetchSubscriptionStatus(); // Una vez al montar o al cambiar token
    } else {
      setLoading(false);
    }
  }, [token]);

  // Mapeo centralizado de estados - más limpio y mantenible
  const rawStatus = subscription?.subscription?.status;
  
  const status: SubscriptionStatus = {
    trialActive: rawStatus === 'trialing',
    active: rawStatus === 'active',
    paused: rawStatus === 'paused',
    cancelled: rawStatus === 'canceled',
    inGracePeriod: rawStatus === 'past_due' || rawStatus === 'unpaid',
    pendingPaymentMethod: subscription?.userSubscriptionStatus === 'trial_pending_payment_method' && 
                          !['trialing', 'active'].includes(rawStatus || '') && 
                          !subscription?.subscription?.stripeSubscriptionId,
    incomplete: rawStatus === 'incomplete',
    pastDue: rawStatus === 'past_due',
    unpaid: rawStatus === 'unpaid'
  };

  const canUseFeature = useCallback((feature: string): boolean => {
    if (status.pendingPaymentMethod || !subscription?.hasSubscription || !subscription.subscription) {
      return false;
    }

    const sub = subscription.subscription;
    // Durante el trial, acceso completo
    if (status.trialActive) {
      return true;
    }

    // Durante suscripción activa, verificar límites del plan
    if (status.active) {
      const planFeatures = {
        crecimiento: ['whatsapp', 'instagram', 'telegram'],
        pro: ['whatsapp', 'instagram', 'messenger', 'telegram'],
        business: ['whatsapp', 'instagram', 'messenger', 'telegram', 'tiktok', 'twitter']
      };
      
      return planFeatures[sub.planType]?.includes(feature) || false;
    }

    return false;
  }, [status, subscription]);

  const getMaxIntegrations = useCallback((): number => {
    if (status.pendingPaymentMethod || !subscription?.subscription) return 0;
    
    switch (subscription.subscription.planType) {
      case 'crecimiento':
        return 3; // WhatsApp, Instagram, Telegram
      case 'pro':
        return 4; // WhatsApp, Instagram, Facebook Messenger, Telegram
      case 'business':
        return 999; // Sin límite - todas las integraciones disponibles
      default:
        return 0;
    }
  }, [status, subscription]);


  const pauseSubscription = useCallback(async (): Promise<void> => {
    if (!token) return;

    try {
      const endpoint = '/stripe/pause/pause';

      const response = await fetch(`${API_URL}${endpoint}`, {
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
        fetchSubscriptionStatus().catch(() => {
          // Silently handle errors to prevent console spam
        });
      } else {
        throw new Error(data.error || 'Error al pausar la suscripción');
      }
    } catch (error) {
      // Handle pause subscription error
      throw error;
    }
  }, [token, subscription]);

  const reactivateSubscription = useCallback(async (): Promise<void> => {
    if (!token) return;

    try {
      const endpoint = '/stripe/pause/resume';

      const response = await fetch(`${API_URL}${endpoint}`, {
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
        fetchSubscriptionStatus().catch(() => {
          // Silently handle errors to prevent console spam
        });
      } else {
        throw new Error(data.error || 'Error al reactivar la suscripción');
      }
    } catch (error) {
      // Handle reactivate subscription error
      throw error;
    }
  }, [token, subscription]);

  const cancelSubscription = useCallback(async (): Promise<void> => {
    if (!token) return;

    try {
      // Determinar si es suscripción de Stripe
      const endpoint = subscription?.subscription?.stripeSubscriptionId 
        ? '/stripe/cancel-subscription' 
        : '/stripe/cancel-subscription'; // Force Stripe for now

      const response = await fetch(`${API_URL}${endpoint}`, {
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
        fetchSubscriptionStatus().catch(() => {
          // Silently handle errors to prevent console spam
        });
      } else {
        throw new Error(data.error || 'Error al cancelar la suscripción');
      }
    } catch (error) {
      // Handle cancel subscription error
      throw error;
    }
  }, [token, subscription]);

  // Función para actualizar el estado después de un pago exitoso
  const updateAfterPayment = useCallback((newSubscriptionData: SubscriptionData) => {
    setSubscription(newSubscriptionData);
    setError(null);
  }, []);

  const startFreeTrial = useCallback(async (): Promise<void> => {
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const response = await fetch(`${API_URL}/subscriptions/start-free-trial`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al activar período de prueba gratuito');
      }

      // Refrescar el estado de suscripción
      await fetchSubscriptionStatus();
    } catch (error) {
      console.error('Error starting free trial:', error);
      throw error;
    }
  }, [token, fetchSubscriptionStatus]);

  const canUseFreeTrial = useCallback((): boolean => {
    return subscription?.freeTrial?.canUse ?? false;
  }, [subscription]);

  const isFreeTrialActive = useCallback((): boolean => {
    return subscription?.freeTrial?.isActive ?? false;
  }, [subscription]);

  const value: SubscriptionContextType = useMemo(() => ({
    subscription,
    loading,
    error,
    status,
    refetch: fetchSubscriptionStatus,
    canUseFeature,
    getMaxIntegrations,
    pauseSubscription,
    reactivateSubscription,
    cancelSubscription,
    updateAfterPayment,
    startFreeTrial,
    canUseFreeTrial,
    isFreeTrialActive,
  }), [
    subscription,
    loading,
    error,
    status,
    fetchSubscriptionStatus,
    canUseFeature,
    getMaxIntegrations,
    pauseSubscription,
    reactivateSubscription,
    cancelSubscription,
    updateAfterPayment,
    startFreeTrial,
    canUseFreeTrial,
    isFreeTrialActive,
  ]);

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
