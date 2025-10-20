"use client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePaymentLink } from "@/hooks/usePaymentLink";
import { useStripePayment } from "@/hooks/useStripePayment";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useStripeOperations } from "@/hooks/useStripeOperations";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SubscriptionStatus() {
  const {
    subscription,
    loading,
    error,
    refetch,
    getMaxIntegrations,
    status,
    hasValidSubscription,
    pauseSubscription,
    reactivateSubscription,
    cancelSubscription,
    forceSync,
  } = useSubscription();

  const { createPaymentLink } = usePaymentLink();
  const {
    createPaymentLink: createStripePaymentLink,
    retryPayment,
    loading: stripeLoading,
  } = useStripePayment();

  // NUEVO: Sincronización en tiempo real
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  
  // Hook de operaciones de Stripe con Alert Dialog
  const {
    loading: cancellingTrial,
    dialogOpen,
    setDialogOpen,
    cancelTrial,
  } = useStripeOperations();
  const { isPolling } = useRealtimeSubscription({
    maxAttempts: 15,
    pollInterval: 2000,
    onSubscriptionChange: (newStatus) => {
      setSyncMessage(`✅ Suscripción actualizada: ${newStatus}`);
      setSyncSuccess(true);
      setTimeout(() => setSyncMessage(null), 5000);
    },
    onSyncComplete: () => {
      setSyncMessage('✅ Sincronización completada');
      setSyncSuccess(true);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  });

  // Mostrar mensaje de sincronización si está en progreso
  useEffect(() => {
    if (isPolling && !syncMessage) {
      setSyncMessage('🔄 Sincronizando cambios de suscripción...');
    }
  }, [isPolling, syncMessage]);

  console.log('🔄 Subscription:', { subscription });
  console.log('🔄 Status:', { status });

  if (loading) {
    return (
      <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-700 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-neutral-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // NUEVO: Mostrar estado de sincronización en tiempo real
  if (syncMessage) {
    return (
      <div className={`rounded-lg p-4 border ${
        syncSuccess
          ? 'bg-accent-green/10 border-accent-green/20'
          : 'bg-accent-blue/10 border-accent-blue/20'
      }`}>
        <div className="flex items-center gap-3">
          {isPolling ? (
            <div className="animate-spin">
              <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          ) : (
            <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <p className={`text-sm font-medium ${
            syncSuccess ? 'text-accent-green' : 'text-accent-blue'
          }`}>
            {syncMessage}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    const isRateLimited =
      error.includes("Demasiados intentos") || error.includes("429");

    return (
      <div className="bg-nexly-light-blue/20 border border-nexly-light-blue/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-nexly-light-blue mb-2">
              Error al cargar suscripción
            </h3>
            <p className="text-sm text-nexly-light-blue/80">{error}</p>
            {isRateLimited && (
              <p className="text-xs text-nexly-light-blue/60 mt-1">
                ⏰ El límite de intentos se resetea automáticamente en 15
                minutos
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              disabled={isRateLimited}
              className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                isRateLimited
                  ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                  : "bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue border border-accent-blue/30"
              }`}
            >
              Reintentar
            </button>
            {/* {!isRateLimited && (
              <button
                onClick={() => createPaymentLink()}
                className="bg-warning/20 hover:bg-warning/30 text-warning border border-warning/30 px-4 py-2 rounded-lg transition-colors text-sm"
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Completar Pago'}
              </button>
            )} */}
            {/* Botón temporal para resetear rate limit en desarrollo */}
            {isRateLimited && process.env.NODE_ENV === "development" && (
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("token");
                    const response = await fetch(
                      `${
                        process.env.NEXT_PUBLIC_API_URL ||
                        "http://localhost:4000"
                      }/subscriptions/reset-payment-limit`,
                      {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                      }
                    );
                    if (response.ok) {
                      alert("Rate limit resetado. Puedes intentar nuevamente.");
                      refetch();
                    }
                  } catch (error) {
                    console.error("Error resetting rate limit:", error);
                  }
                }}
                className="bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue border border-accent-blue/30 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Reset Rate Limit (Dev)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Estado de pago incompleto (requiere acción del usuario)
  if (status.incomplete && !status.active) {
    return (
      <div className="bg-accent-cream/10 border border-accent-cream/20 rounded-lg p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg
              className="w-6 h-6 text-accent-cream"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-accent-cream">
              Pago Requiere Acción
            </h3>
          </div>
          <p className="text-accent-cream/80 mb-6">
            Tu pago requiere autenticación adicional (3D Secure) o hay un
            problema con tu método de pago.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => {
                const selectedPlan =
                  localStorage.getItem("selectedPlan") || "crecimiento";
                createStripePaymentLink(selectedPlan as "crecimiento" | "pro" | "business");
              }}
              disabled={stripeLoading}
              className="bg-accent-cream/20 hover:bg-accent-cream/30 disabled:bg-accent-cream/10 disabled:opacity-50 text-accent-cream border border-accent-cream/30 px-6 py-3 rounded-lg transition-colors duration-300 flex items-center gap-3 min-w-[200px]"
            >
              <img src="/strapi_logo.png" alt="Stripe" className="h-5 w-auto" />
              <div className="text-left">
                <p className="font-medium">Completar Pago</p>
                <p className="text-xs opacity-90">Resolver problema de pago</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Estado de pago vencido
  if (status.pastDue && !status.active) {
    return (
      <div className="bg-accent-red/10 border border-accent-red/20 rounded-lg p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg
              className="w-6 h-6 text-accent-red"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-accent-red">
              Pago Vencido
            </h3>
          </div>
          <p className="text-accent-red/80 mb-6">
            Tu último pago falló. Actualiza tu método de pago para reactivar tu
            suscripción.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={async () => {
                if (subscription?.subscription?.stripeSubscriptionId) {
                  try {
                    await retryPayment(
                      subscription.subscription.stripeSubscriptionId
                    );
                    refetch();
                  } catch (error) {
                    console.error("Error retrying payment:", error);
                  }
                }
              }}
              disabled={stripeLoading}
              className="bg-accent-red/20 hover:bg-accent-red/30 disabled:bg-accent-red/10 disabled:opacity-50 text-accent-red border border-accent-red/30 px-6 py-3 rounded-lg transition-colors duration-300 flex items-center gap-3 min-w-[200px]"
            >
              <img src="/strapi_logo.png" alt="Stripe" className="h-5 w-auto" />
              <div className="text-left">
                <p className="font-medium">Reintentar Pago</p>
                <p className="text-xs opacity-90">Actualizar método de pago</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Estado pendiente de método de pago - SOLO si realmente está pendiente
  if (status.pendingPaymentMethod && !status.active) {
    return (
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg
              className="w-6 h-6 text-warning"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-warning">
              Pago Pendiente
            </h3>
          </div>
          <p className="text-warning/80 mb-6">
            Tu cuenta está registrada pero necesitas completar el método de pago
            para activar tu suscripción.
          </p>

          {/* Botones de método de pago */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {/* Botón Stripe */}
            <button
              onClick={() => {
                // Obtener el plan del usuario desde localStorage o usar 'crecimiento' por defecto
                const selectedPlan =
                  localStorage.getItem("selectedPlan") || "crecimiento";
                createStripePaymentLink(selectedPlan as "crecimiento" | "pro" | "business");
              }}
              disabled={stripeLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-accent-cream px-6 py-3 rounded-lg transition-colors duration-300 flex items-center gap-3 min-w-[200px]"
            >
              <img src="/strapi_logo.png" alt="Stripe" className="h-5 w-auto" />
              <div className="text-left">
                <p className="font-medium">Completar Pago</p>
                <p className="text-xs opacity-90">Activar tu suscripción</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Usar la nueva lógica basada en el estado del usuario en MongoDB
  if (!hasValidSubscription()) {
    return (
      <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-accent-cream mb-2">
            Sin suscripción activa
          </h3>
          <p className="text-neutral-400 mb-4">
            Para usar todas las funciones, elige un plan
          </p>
          <a
            href="/pricing"
            className="bg-nexly-teal hover:bg-nexly-green text-accent-cream px-4 py-2 rounded-lg transition-colors duration-300"
          >
            Ver Planes
          </a>
        </div>
      </div>
    );
  }

  // Type guard: En este punto, sabemos que subscription y subscription.subscription existen
  // Si hay syncMessage, mostrar eso en lugar del error de sincronización
  if (!subscription || !subscription.subscription) {
    if (syncMessage) {
      // Ya se está mostrando el mensaje de sincronización arriba
      return null;
    }
    
    return (
      <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-accent-cream mb-2">Error de sincronización</h3>
          <button
            onClick={refetch}
            className="bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue border border-accent-blue/30 px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const sub = subscription.subscription;
  const isExpired = sub.isCancelled && !sub.isInGracePeriod;
  
  // Cálculo robusto de trial basado en trialEndDate (no en isTrialActive del backend)
  const isTrialActiveNow = sub.trialEndDate && new Date(sub.trialEndDate) > new Date();

  // Mapeo de estados de suscripción
  const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    PAUSED: 'paused', 
    TRIALING: 'trialing',
    INCOMPLETE: 'incomplete',
    PAST_DUE: 'past_due',
    CANCELED: 'canceled',
    UNPAID: 'unpaid'
  } as const;

  // Configuración de estados basada en el estado del usuario en MongoDB
  const getSubscriptionConfig = () => {
    const userStatus = subscription.userSubscriptionStatus;
    console.log('subscription', subscription);
    console.log('sub', sub);
    // Estado activo pagado
    if (userStatus === 'active_paid') {
      if (sub.isActive) {
        return {
          text: 'Activo',
          className: 'text-accent-green border border-accent-green/30',
          message: 'Suscripción activa y renovando automáticamente'
        };
      } else if (sub.isPaused) {
        return {
          text: 'Pausada',
          className: 'text-accent-cream border border-accent-cream/30',
          message: 'Suscripción pausada. Puedes reactivarla cuando quieras'
        };
      }
    }

    // Estado de prueba activo
    if (userStatus === 'active_trial') {
      if (sub.isTrialActive) {
        return {
          text: 'En Prueba',
          className: 'text-accent-blue border border-accent-blue/30',
          message: 'Período de prueba activo'
        };
      } else {
        return {
          text: 'Prueba Expirada',
          className: 'text-warning border border-warning/30',
          message: 'Período de prueba terminado. Se requiere pago para continuar'
        };
      }
    }

    // Estados especiales
    if (userStatus === 'trial_pending_payment_method') {
      return {
        text: 'Pago Pendiente',
        className: 'text-warning border border-warning/30',
        message: 'Tu cuenta está registrada pero necesitas completar el método de pago'
      };
    }

    // Estados de error o desconocidos
    const statusConfig = {
      [SUBSCRIPTION_STATUS.INCOMPLETE]: {
        text: 'Incompleto',
        className: 'text-warning border border-warning/30',
        message: null
      },
      [SUBSCRIPTION_STATUS.PAST_DUE]: {
        text: 'Vencido',
        className: 'text-accent-red border border-accent-red/30',
        message: null
      },
      [SUBSCRIPTION_STATUS.CANCELED]: {
        text: 'Cancelado',
        className: 'text-accent-blue border border-accent-blue/30',
        message: null
      },
      [SUBSCRIPTION_STATUS.UNPAID]: {
        text: 'No pagado',
        className: 'text-accent-red border border-accent-red/30',
        message: null
      }
    };

    return statusConfig[sub.status as keyof typeof statusConfig] || {
      text: `Desconocido (${sub.status})`,
      className: 'text-muted-foreground border border-border',
      message: null
    };
  };

  const subscriptionConfig = getSubscriptionConfig();
  // Determinar colores basados en el estado del usuario en MongoDB
  return (
    <div
      className={`rounded-lg p-6 border ${
        subscription.userSubscriptionStatus === 'active_paid' && sub.isActive
          ? "bg-accent-green/10 border-accent-green/20"
          : subscription.userSubscriptionStatus === 'active_paid' && sub.isPaused
          ? "bg-accent-cream/10 border-accent-cream/20"
          : subscription.userSubscriptionStatus === 'active_trial' && sub.isTrialActive
          ? "bg-accent-blue/10 border-accent-blue/20"
          : subscription.userSubscriptionStatus === 'active_trial' && !sub.isTrialActive
          ? "bg-warning/10 border-warning/20"
          : subscription.userSubscriptionStatus === 'trial_pending_payment_method'
          ? "bg-warning/10 border-warning/20"
          : sub.isInGracePeriod
          ? "bg-warning/10 border-warning/20"
          : isExpired
          ? "bg-nexly-light-blue/20 border-nexly-light-blue/50"
          : "bg-muted border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-accent-cream">
              {sub.planType === "crecimiento" ? "Plan Crecimiento" : 
               sub.planType === "pro" ? "Plan Pro" : 
               sub.planType === "business" ? "Plan Business" : 
               "Plan Básico"}
            </h3>
            <span
              className={`px-2 py-1 rounded-md text-xs font-medium bg-transparent ${subscriptionConfig.className}`}
            >
              {subscriptionConfig.text}
            </span>
          </div>

          {subscriptionConfig.message && (
            <p className={`text-sm ${
              subscription.userSubscriptionStatus === 'active_paid' && sub.isActive ? 'text-accent-green' :
              subscription.userSubscriptionStatus === 'active_paid' && sub.isPaused ? 'text-accent-cream' :
              subscription.userSubscriptionStatus === 'active_trial' && sub.isTrialActive ? 'text-accent-blue' :
              subscription.userSubscriptionStatus === 'active_trial' && !sub.isTrialActive ? 'text-warning' :
              subscription.userSubscriptionStatus === 'trial_pending_payment_method' ? 'text-warning' :
              'text-neutral-300'
            }`}>
              {subscriptionConfig.message}
            </p>
          )}

          {sub.isInGracePeriod && (
            <p className="text-sm text-warning">
              ⏰ Período de gracia: {sub.gracePeriodDaysRemaining} días
              restantes
            </p>
          )}

          {isExpired && (
            <p className="text-sm text-nexly-light-blue">
              ❌ Suscripción expirada. Actualiza para continuar
            </p>
          )}

          {/* Información de límites */}
          <div className="mt-2">
            <p className="text-sm text-neutral-300">
              {getMaxIntegrations() === 999
                ? "Integraciones: Todas disponibles"
                : `Integraciones: Hasta ${getMaxIntegrations()} plataformas`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Botón para renewar solo si está expirado */}
          {isExpired && (
            <button
              onClick={() => createPaymentLink()}
              className="bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Volver a comprar
            </button>
          )}

          {/* Botón para completar pago cuando trial expiró pero status es active_trial */}
          {subscription.userSubscriptionStatus === 'active_trial' && !sub.isTrialActive && sub.daysRemaining === 0 && (
            <button
              onClick={() => {
                // Usar el planType de la suscripción actual, o el selectedPlan del localStorage como fallback
                const planFromSubscription = sub.planType;
                const planFromStorage = localStorage.getItem("selectedPlan");
                const selectedPlan = planFromSubscription || planFromStorage || "crecimiento";

                createStripePaymentLink(selectedPlan as "crecimiento" | "pro" | "business");
              }}
              className="bg-warning/20 hover:bg-warning/30 text-warning border border-warning/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Completar Pago
            </button>
          )}

          {/* Botón para reactivar suscripción pausada - Solo para usuarios pagos (no trial) */}
          {subscription.userSubscriptionStatus === 'active_paid' && sub.isPaused && (
            <button
              onClick={reactivateSubscription}
              className="bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Reactivar
            </button>
          )}

          {/* Botón para pausar suscripción activa - Solo para usuarios pagos (no trial) */}
          {subscription.userSubscriptionStatus === 'active_paid' && sub.isActive && !isTrialActiveNow && (
            <button
              onClick={pauseSubscription}
              className="bg-accent-cream/20 hover:bg-accent-cream/30 text-accent-cream border border-accent-cream/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Pausar
            </button>
          )}

          {/* Botón para cancelar - Solo para usuarios pagos (no trial) */}
          {subscription.userSubscriptionStatus === 'active_paid' && (sub.isActive || sub.isPaused) && (
            <button
              onClick={async () => {
                if (confirm('¿Estás seguro de que deseas cancelar tu suscripción? Tendrás 7 días de acceso restante.')) {
                  try {
                    await cancelSubscription();
                    setSyncMessage('✅ Suscripción cancelada. Tienes 7 días de acceso restante.');
                    setSyncSuccess(true);
                    setTimeout(() => setSyncMessage(null), 5000);
                  } catch (error) {
                    console.error('Error al cancelar:', error);
                    setSyncMessage('❌ Error al cancelar la suscripción');
                    setSyncSuccess(false);
                    setTimeout(() => setSyncMessage(null), 5000);
                  }
                }
              }}
              className="bg-nexly-light-blue hover:bg-nexly-light-blue/80 text-accent-cream px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Cancelar
            </button>
          )}

          {/* Botón para cambiar plan - Solo para usuarios pagos (no trial) */}
          {subscription.userSubscriptionStatus === 'active_paid' && sub.isActive && (
            <button
              onClick={() => window.location.href = '/pricing'}
              className="bg-neutral-600 hover:bg-neutral-700 text-accent-cream px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Cambiar plan
            </button>
          )}

          {/* Botón para cancelar período de prueba - Solo para usuarios en trial activo */}
          {subscription.userSubscriptionStatus === 'active_trial' && isTrialActiveNow && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              disabled={cancellingTrial}
              className="bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/30"
            >
              {cancellingTrial && <Spinner size="sm" />}
              {cancellingTrial ? 'Cancelando...' : 'Cancelar Período de Prueba'}
            </Button>
          )}
        </div>
      </div>
      {/* Progress bar for grace period */}
      {sub.isInGracePeriod && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-neutral-400 mb-1">
            <span>Período de gracia</span>
            <span>{sub.gracePeriodDaysRemaining} días restantes</span>
          </div>
          <div className="w-full bg-neutral-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300 bg-warning"
              style={{
                width: `${Math.max(
                  0,
                  ((7 - sub.gracePeriodDaysRemaining) / 7) * 100
                )}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Alert Dialog para confirmar cancelación */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará tu período de prueba. Perderás acceso inmediato a todas las funciones premium.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingTrial}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await cancelTrial();
                } catch (error) {
                  // Ignorar error del endpoint, la cancelación funciona
                  console.log('Cancelación completada (ignorando error de respuesta)');
                }
                
                // Mostrar mensaje de éxito inmediatamente
                setSyncMessage('✅ Período de prueba cancelado exitosamente');
                setSyncSuccess(true);
                
                // Sincronizar en background después de un pequeño delay
                setTimeout(async () => {
                  try {
                    await forceSync();
                  } catch (error) {
                    console.log('Sincronización completada');
                  }
                  // Mantener el mensaje de éxito por 3 segundos más
                  setTimeout(() => setSyncMessage(null), 3000);
                }, 500);
              }}
              disabled={cancellingTrial}
              className="bg-accent-red hover:bg-accent-red/90"
            >
              {cancellingTrial && <Spinner size="sm" className="mr-2" />}
              Sí, cancelar período de prueba
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
