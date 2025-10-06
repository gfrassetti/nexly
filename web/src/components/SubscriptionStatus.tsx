"use client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePaymentLink } from "@/hooks/usePaymentLink";
import { useStripePayment } from "@/hooks/useStripePayment";

export default function SubscriptionStatus() {
  const {
    subscription,
    loading,
    error,
    refetch,
    getMaxIntegrations,
    status,
    pauseSubscription,
    reactivateSubscription,
    cancelSubscription,
  } = useSubscription();

  const { createPaymentLink } = usePaymentLink();
  const {
    createPaymentLink: createStripePaymentLink,
    retryPayment,
    loading: stripeLoading,
  } = useStripePayment();

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
      <div className="bg-accent-orange/10 border border-accent-orange/20 rounded-lg p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg
              className="w-6 h-6 text-accent-orange"
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
            <h3 className="text-lg font-semibold text-accent-orange">
              Pago Requiere Acción
            </h3>
          </div>
          <p className="text-accent-orange/80 mb-6">
            Tu pago requiere autenticación adicional (3D Secure) o hay un
            problema con tu método de pago.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => {
                const selectedPlan =
                  localStorage.getItem("selectedPlan") || "basic";
                createStripePaymentLink(selectedPlan as "basic" | "premium");
              }}
              disabled={stripeLoading}
              className="bg-accent-orange/20 hover:bg-accent-orange/30 disabled:bg-accent-orange/10 disabled:opacity-50 text-accent-orange border border-accent-orange/30 px-6 py-3 rounded-lg transition-colors duration-300 flex items-center gap-3 min-w-[200px]"
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
                // Obtener el plan del usuario desde localStorage o usar 'basic' por defecto
                const selectedPlan =
                  localStorage.getItem("selectedPlan") || "basic";
                createStripePaymentLink(selectedPlan as "basic" | "premium");
              }}
              disabled={stripeLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors duration-300 flex items-center gap-3 min-w-[200px]"
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

  if (!subscription?.hasSubscription) {
    return (
      <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            Sin suscripción activa
          </h3>
          <p className="text-neutral-400 mb-4">
            Para usar todas las funciones, elige un plan
          </p>
          <a
            href="/pricing"
            className="bg-nexly-teal hover:bg-nexly-green text-white px-4 py-2 rounded-lg transition-colors duration-300"
          >
            Ver Planes
          </a>
        </div>
      </div>
    );
  }

  const sub = subscription.subscription!;
  console.log("sub: ", sub);
  console.log("subscription: ", subscription);
  console.log("sub.status: ", sub.status);
  console.log("sub.isActive: ", sub.isActive);
  const isExpired = sub.isCancelled && !sub.isInGracePeriod;

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

  // Configuración de estados con estilos y textos
  const getSubscriptionConfig = () => {
    if (sub.isActive) {
      return {
        text: 'Activo',
        className: 'text-accent-green border border-accent-green/30',
        message: 'Suscripción activa y renovando automáticamente'
      };
    }
    
    if (sub.isPaused) {
      return {
        text: 'Pausada',
        className: 'text-accent-orange border border-accent-orange/30',
        message: 'Suscripción pausada. Puedes reactivarla cuando quieras'
      };
    }

    const statusConfig = {
      [SUBSCRIPTION_STATUS.TRIALING]: {
        text: sub.isTrialActive ? 'En Prueba' : 'Prueba Expirada',
        className: sub.isTrialActive 
          ? 'text-accent-blue border border-accent-blue/30'
          : 'text-warning border border-warning/30',
        message: sub.isTrialActive 
          ? 'Período de prueba activo'
          : 'Período de prueba terminado. Se requiere pago para continuar'
      },
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

    console.log("sub.status: ", subscription);
    return statusConfig[sub.status as keyof typeof statusConfig] || {
      text: `Desconocido (${sub.status})`,
      className: 'text-muted-foreground boimage.pngrder border-border',
      message: null
    };
  };

  const subscriptionConfig = getSubscriptionConfig();
  /* reverted */
  return (
    <div
      className={`rounded-lg p-6 border ${
        isExpired
          ? "bg-nexly-light-blue/20 border-nexly-light-blue/50"
          : sub.isPaused
          ? "bg-accent-orange/10 border-accent-orange/20"
          : sub.isInGracePeriod
          ? "bg-warning/10 border-warning/20"
          : sub.isActive
          ? "bg-accent-green/10 border-accent-green/20"
          : "bg-muted border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">
              {sub.planType === "basic" ? "Plan Básico" : "Plan Premium"}
            </h3>
            <span
              className={`px-2 py-1 rounded-md text-xs font-medium bg-transparent ${subscriptionConfig.className}`}
            >
              {subscriptionConfig.text}
            </span>
          </div>

          {subscriptionConfig.message && (
            <p className={`text-sm ${
              sub.isActive ? 'text-accent-green' :
              sub.isPaused ? 'text-accent-orange' :
              sub.status === 'trialing' ? 'text-accent-blue' :
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

          {/* Botón para completar pago cuando trial expiró pero status es trialing */}
          {sub.status === 'trialing' && !sub.isTrialActive && sub.daysRemaining === 0 && (
            <button
              onClick={() => {
                // Usar el planType de la suscripción actual, o el selectedPlan del localStorage como fallback
                const planFromSubscription = sub.planType;
                const planFromStorage = localStorage.getItem("selectedPlan");
                const selectedPlan = planFromSubscription || planFromStorage || "basic";
                
                console.log('🔍 Debug Completar Pago:', {
                  planFromSubscription,
                  planFromStorage,
                  selectedPlan,
                  subscriptionData: sub
                });
                
                createStripePaymentLink(selectedPlan as "basic" | "premium");
              }}
              className="bg-warning/20 hover:bg-warning/30 text-warning border border-warning/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Completar Pago
            </button>
          )}

          {/* Botón para reactivar suscripción pausada */}
          {status.paused && (
            <button
              onClick={reactivateSubscription}
              className="bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Reactivar
            </button>
          )}

          {/* Botón para pausar suscripción activa */}
          {status.active && (
            <button
              onClick={pauseSubscription}
              className="bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange border border-accent-orange/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Pausar
            </button>
          )}

          {/* Botón para cancelar */}
          {(status.active || status.paused) && (
            <button
              onClick={cancelSubscription}
              className="bg-nexly-light-blue hover:bg-nexly-light-blue/80 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Cancelar
            </button>
          )}

          {/* Botón para cambiar plan */}
          {status.active && (
            <a
              href="/pricing"
              className="bg-neutral-600 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Cambiar plan
            </a>
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
    </div>
  );
}
