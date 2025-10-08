"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePaymentLink } from "@/hooks/usePaymentLink";
import { useStats } from "@/contexts/StatsContext";
import SubscriptionStatus from "@/components/SubscriptionStatus";

interface DashboardStats {
  totalContacts: number;
  totalMessages: number;
  conversationsToday: number;
  averageResponseTime: number;
  activeIntegrations: number;
  messagesByPlatform: Record<string, number>;
  recentMessages: any[];
  unreadConversations: number;
}

export default function DashboardPage() {
  const { subscription } = useSubscription();
  const searchParams = useSearchParams();
  const { createPaymentLink } = usePaymentLink();
  const { stats, isLoading, error } = useStats();
  const [showTrialNotification, setShowTrialNotification] = useState(false);
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Show trial notification only if trial is active
  useEffect(() => {
    const trialStarted = searchParams.get('trial_started');
    if (trialStarted === 'true' && subscription?.subscription?.isTrialActive) {
      setShowTrialNotification(true);
      setTimeout(() => setShowTrialNotification(false), 5000);
    } else {
      setShowTrialNotification(false);
    }
  }, [searchParams, subscription]);

  // Show payment error notification
  useEffect(() => {
    const paymentError = searchParams.get('payment_error');
    if (paymentError === 'true') {
      setShowPaymentError(true);
      setTimeout(() => setShowPaymentError(false), 10000);
    }
  }, [searchParams]);

  // Show payment success notification
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success');
    if (paymentSuccess === 'true') {
      setShowPaymentSuccess(true);
      setTimeout(() => setShowPaymentSuccess(false), 5000);
    }
  }, [searchParams]);

  // Los datos ahora se cargan automáticamente desde el contexto StatsContext

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return '💬';
      case 'instagram': return '📸';
      case 'messenger': return '💬';
      case 'telegram': return '✈️';
      default: return '📞';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error cargando estadísticas</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col text-foreground" style={{ background: 'var(--background-gradient)' }}>
      {/* Header - Cursor style */}
      <div className="border-b border-border bg-background backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Overview and metrics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-8">
        {/* Notifications */}
        {showTrialNotification && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <div>
                <h3 className="text-sm font-medium text-foreground">Trial started</h3>
                <p className="text-xs text-muted-foreground">7 days free access</p>
              </div>
            </div>
            <button 
              onClick={() => setShowTrialNotification(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {showPaymentError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-destructive rounded-full"></div>
              <div>
                <h3 className="text-sm font-medium text-foreground">Payment failed</h3>
                <p className="text-xs text-muted-foreground">Please try again</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPaymentError(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {showPaymentSuccess && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <div>
                <h3 className="text-sm font-medium text-foreground">Payment successful</h3>
                <p className="text-xs text-muted-foreground">Subscription activated</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPaymentSuccess(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Subscription Status */}
        <SubscriptionStatus />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Contacts */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 hover:bg-muted/80 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Contacts</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{stats.totalContacts}</p>
              </div>
              <div className="w-8 h-8 bg-accent-blue/20 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 flex items-center">
              <span className="text-xs text-accent-green">+12%</span>
              <span className="text-xs text-muted-foreground ml-2">vs last month</span>
            </div>
          </div>

          {/* Conversations Today */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 hover:bg-muted/80 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Conversations Today</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{stats.conversationsToday}</p>
              </div>
              <div className="w-8 h-8 bg-accent-green/20 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 flex items-center">
              <span className="text-xs text-accent-green">+8%</span>
              <span className="text-xs text-muted-foreground ml-2">vs yesterday</span>
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 hover:bg-muted/80 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Response Time</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{stats.averageResponseTime}m</p>
              </div>
              <div className="w-8 h-8 bg-accent-cream/20 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 flex items-center">
              <span className="text-xs text-accent-green">-15%</span>
              <span className="text-xs text-muted-foreground ml-2">vs last week</span>
            </div>
          </div>

          {/* Active Integrations */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 hover:bg-muted/80 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Integrations</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{stats.activeIntegrations}</p>
              </div>
              <div className="w-8 h-8 bg-accent-blue/20 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
            <div className="mt-3 flex items-center">
              <span className="text-xs text-accent-green">+2</span>
              <span className="text-xs text-muted-foreground ml-2">this month</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-muted/30 border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => window.location.href = '/dashboard/contacts'}
              className="bg-accent-green/10 border border-accent-green/20 hover:bg-accent-green/20 text-accent-green p-4 rounded-lg flex items-center gap-3 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <div className="text-left">
                <p className="font-medium text-sm">View Contacts</p>
                <p className="text-xs text-muted-foreground">Manage contacts</p>
              </div>
            </button>

            <button 
              onClick={() => window.location.href = '/dashboard/integrations'}
              className="bg-accent-blue/10 border border-accent-blue/20 hover:bg-accent-blue/20 text-accent-blue p-4 rounded-lg flex items-center gap-3 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div className="text-left">
                <p className="font-medium text-sm">Connect App</p>
                <p className="text-xs text-muted-foreground">Integrate platform</p>
              </div>
            </button>

            <button 
              onClick={() => window.location.href = '/dashboard/inbox'}
              className="bg-accent-cream/10 border border-accent-cream/20 hover:bg-accent-cream/20 text-accent-cream p-4 rounded-lg flex items-center gap-3 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div className="text-left">
                <p className="font-medium text-sm">View Inbox</p>
                <p className="text-xs text-muted-foreground">Manage conversations</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}