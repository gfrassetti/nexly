"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useStats } from "@/hooks/useStats";
import { Skeleton } from "@/components/ui/skeleton";
import StatCard from "@/components/StatCard";
import SubscriptionStatus from "@/components/SubscriptionStatus";

export default function DashboardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [showTrialNotification, setShowTrialNotification] = useState(false);
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Obtener estadísticas reales desde el backend
  const { stats, loading: statsLoading, error: statsError } = useStats();

  // Show trial notification only if trial is active
  useEffect(() => {
    const trialStarted = searchParams.get('trial_started');
    if (trialStarted === 'true') {
      setShowTrialNotification(true);
      setTimeout(() => setShowTrialNotification(false), 5000);
    } else {
      setShowTrialNotification(false);
    }
  }, [searchParams]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statsLoading ? (
            // Skeleton para las estadísticas usando shadcn/ui
            Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                  <Skeleton className="w-8 h-8 rounded-md" />
                </div>
                <div className="mt-3">
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : (
            <>
              <StatCard
                title="Integrations"
                value={stats.activeIntegrations}
                subtitle={stats.activeIntegrations > 0 ? undefined : "Sin integraciones activas"}
                color="blue"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                }
                trend={stats.activeIntegrations > 0 ? {
                  value: 2,
                  label: "this month",
                  isPositive: true
                } : undefined}
              />

              <StatCard
                title="Mensajes Sin Leer"
                value={stats.unreadMessages}
                subtitle={stats.unreadMessages > 0 ? undefined : "Todo al día"}
                color="red"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                trend={stats.unreadMessages > 0 ? {
                  value: stats.unreadMessages,
                  label: "pendientes",
                  isPositive: false
                } : undefined}
              />
            </>
          )}
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