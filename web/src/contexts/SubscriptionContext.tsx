"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface SubscriptionData {
  hasSubscription: boolean;
  subscription?: {
    id: string;
    planType: 'crecimiento' | 'pro' | 'business';
    status: 'trialing' | 'active' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
    stripeSubscriptionId?: string;
    // Campos opcionales usados en componentes de facturación
    currentPeriodStart?: string;
    trialEndDate?: string;
    isInGracePeriod?: boolean;
    gracePeriodDaysRemaining?: number;
    cancelledAt?: string;
  };
  userSubscriptionStatus?: 'none' | 'trial_pending_payment_method' | 'active_trial' | 'active_paid' | 'cancelled';
  freeTrial?: {
    isActive: boolean;
    endsAt?: string; // ISO date string if available
  };
}

type SubscriptionStatus = {
  isPaid: boolean;
  isTrial: boolean;
  isFree: boolean;
  active: boolean;
  trialActive: boolean;
  pendingPaymentMethod: boolean;
  paused: boolean;
  cancelled: boolean;
  pastDue: boolean;
  incomplete: boolean;
};

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  status: SubscriptionStatus;
  refetch: () => Promise<void>;
  canUseFeature: (feature: string) => boolean;
  getMaxIntegrations: () => number;
  updateAfterPayment: (newSubscriptionData: SubscriptionData) => void;
  forceRefresh: () => Promise<void>;
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

      console.log('🔄 Fetching subscription status...');

      const response = await fetch(`${API_URL}/subscriptions/status?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Subscription data received:', data);

      setSubscription(data);

      // Actualizar localStorage solo si hay suscripción activa
      if (data.hasSubscription && data.subscription?.planType) {
        localStorage.setItem('selectedPlan', data.subscription.planType);
        localStorage.setItem('hasActiveSubscription', 'true');
      } else {
        localStorage.removeItem('selectedPlan');
        localStorage.removeItem('hasActiveSubscription');
      }

    } catch (err: unknown) {
      console.error('❌ Error fetching subscription:', err);
      setSubscription({ hasSubscription: false });
      setError(err instanceof Error ? err.message : 'Error desconocido');
      localStorage.removeItem('hasActiveSubscription');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setSubscription(null);
    setError(null);
    setLoading(true);

    if (token) {
      fetchSubscriptionStatus();
    } else {
      setLoading(false);
    }
  }, [token, fetchSubscriptionStatus]);

  // Lógica simplificada para determinar el estado
  const status: SubscriptionStatus = useMemo(() => {
    if (!subscription) {
      return {
        isPaid: false,
        isTrial: false,
        isFree: true,
        active: false,
        trialActive: false,
        pendingPaymentMethod: false,
        paused: false,
        cancelled: false,
        pastDue: false,
        incomplete: false,
      };
    }

    const hasSub = subscription.hasSubscription;
    const userStatus = subscription.userSubscriptionStatus;
    const subStatus = subscription.subscription?.status;

    const isActivePaid = (userStatus === 'active_paid') || (subStatus === 'active');
    const isTrial = (userStatus === 'active_trial') || (subStatus === 'trialing');
    const pendingPM = userStatus === 'trial_pending_payment_method';
    const paused = subStatus === 'paused';
    const cancelled = subStatus === 'canceled';
    const pastDue = subStatus === 'past_due';
    const incomplete = subStatus === 'incomplete' || subStatus === 'incomplete_expired';

    return {
      isPaid: !!isActivePaid,
      isTrial: !!isTrial,
      isFree: !(isActivePaid || isTrial) || !hasSub,
      active: !!isActivePaid,
      trialActive: !!isTrial,
      pendingPaymentMethod: !!pendingPM,
      paused: !!paused,
      cancelled: !!cancelled,
      pastDue: !!pastDue,
      incomplete: !!incomplete,
    };
  }, [subscription]);

  const canUseFeature = useCallback((feature: string): boolean => {
    // Si no tiene suscripción activa, no puede usar ninguna función
    if (!subscription?.hasSubscription) return false;

    // Si tiene suscripción activa (pagada o trial), verificar límites del plan
    const planType = subscription.subscription?.planType;
    if (!planType) return false;

    const planFeatures = {
      crecimiento: ['whatsapp', 'instagram', 'telegram'],
      pro: ['whatsapp', 'instagram', 'messenger', 'telegram'],
      business: ['whatsapp', 'instagram', 'messenger', 'telegram', 'tiktok', 'twitter']
    };

    return planFeatures[planType]?.includes(feature) || false;
  }, [subscription]);

  const getMaxIntegrations = useCallback((): number => {
    if (!subscription?.hasSubscription) return 0;

    const planType = subscription.subscription?.planType;
    switch (planType) {
      case 'crecimiento': return 3;
      case 'pro': return 4;
      case 'business': return 999;
      default: return 0;
    }
  }, [subscription]);

  // Función para actualizar el estado después de un pago exitoso
  const updateAfterPayment = useCallback((newSubscriptionData: SubscriptionData) => {
    setSubscription(newSubscriptionData);
    setError(null);

    // Actualizar localStorage inmediatamente
    if (newSubscriptionData.hasSubscription && newSubscriptionData.subscription?.planType) {
      localStorage.setItem('selectedPlan', newSubscriptionData.subscription.planType);
      localStorage.setItem('hasActiveSubscription', 'true');
    }
  }, []);

  // Función para forzar actualización completa del contexto
  const forceRefresh = useCallback(async () => {
    console.log('🔄 Forcing subscription context refresh...');
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const value: SubscriptionContextType = useMemo(() => ({
    subscription,
    loading,
    error,
    status,
    refetch: fetchSubscriptionStatus,
    canUseFeature,
    getMaxIntegrations,
    updateAfterPayment,
    forceRefresh,
  }), [
    subscription,
    loading,
    error,
    status,
    fetchSubscriptionStatus,
    canUseFeature,
    getMaxIntegrations,
    updateAfterPayment,
    forceRefresh,
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

export function useSubscriptionOptional() {
  return useContext(SubscriptionContext);
}