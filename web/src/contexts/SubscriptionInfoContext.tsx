"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

interface StripeSubscription {
  id: string;
  stripeSubscriptionId?: string;
  status: 'trialing' | 'active' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  planType: 'crecimiento' | 'pro' | 'business';
  trialEndDate?: string;
  currentPeriodEnd?: string;
  currentPeriodStart?: string;
  amount?: number;
  currency?: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string;
  pauseCollection?: any;
}

interface StripeCustomer {
  id: string;
  email?: string;
  name?: string;
}

interface StripePaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

interface SubscriptionInfoContextType {
  subscription: StripeSubscription | null;
  customer: StripeCustomer | null;
  paymentMethod: StripePaymentMethod | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SubscriptionInfoContext = createContext<SubscriptionInfoContextType | undefined>(undefined);

export function SubscriptionInfoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);
  const [customer, setCustomer] = useState<StripeCustomer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<StripePaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionInfo = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch("/api/stripe/subscription-info", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription || null);
        setCustomer(data.customer || null);
        setPaymentMethod(data.paymentMethod || null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Error al cargar información de suscripción');
      }
    } catch (err) {
      console.error("Error al cargar suscripción", err);
      setError('Error de conexión al cargar suscripción');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionInfo();
  }, [user?.id]);

  const value: SubscriptionInfoContextType = {
    subscription,
    customer,
    paymentMethod,
    loading,
    error,
    refetch: fetchSubscriptionInfo,
  };

  return (
    <SubscriptionInfoContext.Provider value={value}>
      {children}
    </SubscriptionInfoContext.Provider>
  );
}

export function useSubscriptionInfo() {
  const context = useContext(SubscriptionInfoContext);
  if (context === undefined) {
    throw new Error('useSubscriptionInfo must be used within a SubscriptionInfoProvider');
  }
  return context;
}
