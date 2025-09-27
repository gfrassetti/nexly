"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getContacts, getMessages } from "@/lib/api";
import useSWR from "swr";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import BillingPanel from "@/components/BillingPanel";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSearchParams } from "next/navigation";
import { usePaymentLink } from "@/hooks/usePaymentLink";

interface DashboardStats {/* asd */
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
  const { token } = useAuth();
  const { subscription } = useSubscription();
  const searchParams = useSearchParams();
  const { createPaymentLink } = usePaymentLink();
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalMessages: 0,
    conversationsToday: 0,
    averageResponseTime: 0,
    activeIntegrations: 0,
    messagesByPlatform: {},
    recentMessages: [],
    unreadConversations: 0,
  });
  const [showTrialNotification, setShowTrialNotification] = useState(false);
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Mostrar notificación si se inició el trial
  useEffect(() => {
    const trialStarted = searchParams.get('trial_started');
    if (trialStarted === 'true') {
      setShowTrialNotification(true);
      // Ocultar después de 5 segundos
      setTimeout(() => setShowTrialNotification(false), 5000);
    }
  }, [searchParams]);

  // Mostrar notificación si hubo error en el pago
  useEffect(() => {
    const paymentError = searchParams.get('payment_error');
    if (paymentError === 'true') {
      setShowPaymentError(true);
      // Ocultar después de 8 segundos
      setTimeout(() => setShowPaymentError(false), 8000);
    }
  }, [searchParams]);

  // Mostrar notificación si el pago fue exitoso
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success');
    if (paymentSuccess === 'true') {
      setShowPaymentSuccess(true);
      // Ocultar después de 6 segundos
      setTimeout(() => setShowPaymentSuccess(false), 6000);
    }
  }, [searchParams]);

  // Fetch analytics del dashboard
  const { data: analytics } = useSWR(
    token ? ["/analytics/dashboard", token] : null,
    async ([url, t]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      return res.json();
    }
  );

  const { data: integrations } = useSWR(
    token ? ["/integrations", token] : null,
    async ([url, t]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      return res.json();
    }
  );

  // Actualizar estadísticas cuando los datos de analytics cambien
  useEffect(() => {
    if (analytics?.success && analytics.metrics) {
      const metrics = analytics.metrics;
      
      setStats({
        totalContacts: metrics.totalContacts.value,
        totalMessages: Object.values(metrics.messagesByPlatform).reduce((sum: number, count: any) => sum + count, 0),
        conversationsToday: metrics.conversationsToday.value,
        averageResponseTime: metrics.averageResponseTime.value,
        activeIntegrations: metrics.activeIntegrations.value,
        messagesByPlatform: metrics.messagesByPlatform,
        recentMessages: metrics.recentMessages || [],
        unreadConversations: metrics.unreadConversations || 0,
      });
    }
  }, [analytics]);

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'whatsapp': return 'bg-green-500';
      case 'instagram': return 'bg-pink-500';
      case 'messenger': return 'bg-blue-500';
      default: return 'bg-neutral-500';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'whatsapp': return '📱';
      case 'instagram': return '📸';
      case 'messenger': return '💬';
      default: return '📞';
    }
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900 text-white">
      {/* Header */}
      <div className="border-b border-neutral-700 bg-neutral-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-neutral-400 mt-1">
              Resumen de tu actividad y métricas principales
            </p>
          </div>
          
          {/* Plan Indicator */}
          {subscription?.subscription && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-400">Plan actual:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                subscription.subscription.planType === 'premium' 
                  ? 'bg-nexly-teal text-white' 
                  : 'bg-neutral-600 text-neutral-200'
              }`}>
                {subscription.subscription.planType === 'basic' ? 'Plan Básico' : 'Plan Premium'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-6 space-y-6">
        {/* Notificación de trial iniciado */}
        {showTrialNotification && (
          <div className="bg-nexly-green/20 border border-nexly-green/30 rounded-lg p-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-nexly-green rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-nexly-green font-semibold">¡Trial iniciado exitosamente!</h3>
              <p className="text-neutral-300 text-sm">Ya puedes usar todas las funciones durante 7 días gratis</p>
            </div>
          </div>
        )}

        {/* Notificación de error de pago */}
        {showPaymentError && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-400 font-semibold">Error al procesar el pago</h3>
              <p className="text-neutral-300 text-sm">No pudimos crear tu suscripción. Puedes intentar nuevamente desde el panel de suscripción.</p>
            </div>
            <button 
              onClick={() => setShowPaymentError(false)}
              className="text-yellow-400 hover:text-yellow-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Notificación de pago exitoso */}
        {showPaymentSuccess && (
          <div className="bg-nexly-green/20 border border-nexly-green/30 rounded-lg p-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-nexly-green rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-nexly-green font-semibold">¡Pago procesado exitosamente!</h3>
              <p className="text-neutral-300 text-sm">Tu suscripción está activa y tu prueba gratuita ha comenzado</p>
            </div>
            <button 
              onClick={() => setShowPaymentSuccess(false)}
              className="text-nexly-green hover:text-nexly-teal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Estado de suscripción */}
        <SubscriptionStatus />

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total de contactos */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium">Total Contactos</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.totalContacts}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              {analytics?.success && analytics.metrics.totalContacts ? (
                <>
                  <span className={`text-sm ${analytics.metrics.totalContacts.changeType === 'increase' ? 'text-nexly-green' : 'text-nexly-light-blue'}`}>
                    {analytics.metrics.totalContacts.change > 0 ? '+' : ''}{analytics.metrics.totalContacts.change}%
                  </span>
                  <span className="text-neutral-500 text-sm ml-2">vs mes pasado</span>
                </>
              ) : (
                <>
                  <span className="text-nexly-green text-sm">+12%</span>
                  <span className="text-neutral-500 text-sm ml-2">vs mes pasado</span>
                </>
              )}
            </div>
          </div>

          {/* Conversaciones hoy */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium">Conversaciones Hoy</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.conversationsToday}</p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              {analytics?.success && analytics.metrics.conversationsToday ? (
                <>
                  <span className={`text-sm ${analytics.metrics.conversationsToday.changeType === 'increase' ? 'text-nexly-green' : 'text-nexly-light-blue'}`}>
                    {analytics.metrics.conversationsToday.change > 0 ? '+' : ''}{analytics.metrics.conversationsToday.change}%
                  </span>
                  <span className="text-neutral-500 text-sm ml-2">vs ayer</span>
                </>
              ) : (
                <>
                  <span className="text-nexly-green text-sm">+8%</span>
                  <span className="text-neutral-500 text-sm ml-2">vs ayer</span>
                </>
              )}
            </div>
          </div>

          {/* Tiempo promedio de respuesta */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium">Tiempo Respuesta</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.averageResponseTime}m</p>
              </div>
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              {analytics?.success && analytics.metrics.averageResponseTime ? (
                <>
                  <span className={`text-sm ${analytics.metrics.averageResponseTime.changeType === 'decrease' ? 'text-nexly-green' : 'text-nexly-light-blue'}`}>
                    {analytics.metrics.averageResponseTime.change > 0 ? '+' : ''}{analytics.metrics.averageResponseTime.change}%
                  </span>
                  <span className="text-neutral-500 text-sm ml-2">vs semana pasada</span>
                </>
              ) : (
                <>
                  <span className="text-nexly-light-blue text-sm">-15%</span>
                  <span className="text-neutral-500 text-sm ml-2">vs semana pasada</span>
                </>
              )}
            </div>
          </div>

          {/* Integraciones activas */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium">Integraciones</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.activeIntegrations}</p>
              </div>
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              {analytics?.success && analytics.metrics.activeIntegrations ? (
                <>
                  <span className={`text-sm ${analytics.metrics.activeIntegrations.changeType === 'increase' ? 'text-nexly-green' : 'text-nexly-light-blue'}`}>
                    +{analytics.metrics.activeIntegrations.change}
                  </span>
                  <span className="text-neutral-500 text-sm ml-2">este mes</span>
                </>
              ) : (
                <>
                  <span className="text-nexly-green text-sm">+2</span>
                  <span className="text-neutral-500 text-sm ml-2">este mes</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Segunda fila de métricas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mensajes por plataforma */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Mensajes por Plataforma</h3>
            <div className="space-y-3">
              {Object.entries(stats.messagesByPlatform).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getPlatformIcon(platform)}</span>
                    <span className="text-white capitalize">{platform}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-neutral-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getPlatformColor(platform)}`}
                        style={{ 
                          width: `${Math.min(100, (count as number / Math.max(...Object.values(stats.messagesByPlatform) as number[])) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-white font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h3>
            <div className="space-y-3">
              {stats.recentMessages.length > 0 ? (
                stats.recentMessages.map((msg: any, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getPlatformColor(msg.provider || msg.integrationId)}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {msg.content || msg.body || 'Mensaje sin contenido'}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {msg.provider || msg.integrationId} • {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>No hay actividad reciente</p>
                </div>
              )}
            </div>
          </div>

          {/* Panel de facturación */}
          <BillingPanel />
        </div>


        {/* Acciones rápidas */}
        <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
          <h3 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button 
              onClick={() => window.location.href = '/dashboard/contacts'}
              className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center gap-3 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="text-left">
                <p className="font-medium">Ver Contactos</p>
                <p className="text-sm opacity-90">Gestionar contactos existentes</p>
              </div>
            </button>
            
            <button 
              onClick={() => window.location.href = '/dashboard/integrations'}
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center gap-3 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div className="text-left">
                <p className="font-medium">Conectar App</p>
                <p className="text-sm opacity-90">Integrar nueva plataforma</p>
              </div>
            </button>
            
            <button 
              onClick={() => window.location.href = '/dashboard/inbox'}
              className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex items-center gap-3 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div className="text-left">
                <p className="font-medium">Ver Inbox</p>
                <p className="text-sm opacity-90">Gestionar conversaciones</p>
              </div>
            </button>
            
            {/* Botón de pago - solo mostrar si está en estado pendiente de pago */}
          </div>
        </div>
      </div>
    </div>
  );
}
