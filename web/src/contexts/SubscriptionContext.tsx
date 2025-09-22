"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionData {
  hasSubscription: boolean;
  subscription?: {
    id: string;
    planType: 'basic' | 'premium';
    status: 'trial' | 'active' | 'paused' | 'cancelled' | 'expired' | 'grace_period';
    trialEndDate: string;
    daysRemaining: number;
    gracePeriodDaysRemaining: number;
    isTrialActive: boolean;
    isActive: boolean;
    isPaused: boolean;
    isCancelled: boolean;
    isInGracePeriod: boolean;
    pausedAt?: string;
    cancelledAt?: string;
    gracePeriodEndDate?: string;
    maxIntegrations: number;
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
  pauseSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
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
    fetchSubscriptionStatus();
  }, [token]);

  const canUseFeature = (feature: string): boolean => {
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

  const pauseSubscription = async (): Promise<void> => {
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/subscriptions/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar estado local inmediatamente
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
        // También refrescar desde el servidor
        await fetchSubscriptionStatus();
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/subscriptions/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        window.open(data.paymentUrl, '_blank');
        await fetchSubscriptionStatus(); // Refrescar datos
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        await fetchSubscriptionStatus(); // Refrescar datos
      } else {
        throw new Error(data.error || 'Error al cancelar la suscripción');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
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
    pauseSubscription,
    reactivateSubscription,
    cancelSubscription,
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
