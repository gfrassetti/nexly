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
    cancelSubscription
  } = useSubscription();

  const { createPaymentLink } = usePaymentLink();
  const { createPaymentLink: createStripePaymentLink, retryPayment, loading: stripeLoading } = useStripePayment();

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
    const isRateLimited = error.includes('Demasiados intentos') || error.includes('429');
    
    return (
      <div className="bg-nexly-light-blue/20 border border-nexly-light-blue/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-nexly-light-blue mb-2">Error al cargar suscripción</h3>
            <p className="text-sm text-nexly-light-blue/80">{error}</p>
            {isRateLimited && (
              <p className="text-xs text-nexly-light-blue/60 mt-1">
                ⏰ El límite de intentos se resetea automáticamente en 15 minutos
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              disabled={isRateLimited}
              className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                isRateLimited 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-nexly-light-blue hover:bg-nexly-light-blue/80 text-white'
              }`}
            >
              Reintentar
            </button>
            {/* Botón de MercadoPago comentado - solo Stripe ahora */}
            {/* {!isRateLimited && (
              <button
                onClick={() => createPaymentLink()}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Completar Pago'}
              </button>
            )} */}
            {/* Botón temporal para resetear rate limit en desarrollo */}
            {isRateLimited && process.env.NODE_ENV === 'development' && (
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/subscriptions/reset-payment-limit`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    });
                    if (response.ok) {
                      alert('Rate limit resetado. Puedes intentar nuevamente.');
                      refetch();
                    }
                  } catch (error) {
                    console.error('Error resetting rate limit:', error);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
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
  if (status.incomplete && !status.trialActive && !status.active) {
    return (
      <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-semibold text-orange-400">Pago Requiere Acción</h3>
          </div>
          <p className="text-orange-300 mb-6">
            Tu pago requiere autenticación adicional (3D Secure) o hay un problema con tu método de pago.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => {
                const selectedPlan = localStorage.getItem('selectedPlan') || 'basic';
                createStripePaymentLink(selectedPlan as 'basic' | 'premium');
              }}
              disabled={stripeLoading}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors duration-300 flex items-center gap-3 min-w-[200px]"
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
  if (status.pastDue && !status.trialActive && !status.active) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-400">Pago Vencido</h3>
          </div>
          <p className="text-red-300 mb-6">
            Tu último pago falló. Actualiza tu método de pago para reactivar tu suscripción.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={async () => {
                if (subscription?.subscription?.stripeSubscriptionId) {
                  try {
                    await retryPayment(subscription.subscription.stripeSubscriptionId);
                    refetch();
                  } catch (error) {
                    console.error('Error retrying payment:', error);
                  }
                }
              }}
              disabled={stripeLoading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors duration-300 flex items-center gap-3 min-w-[200px]"
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
  if (status.pendingPaymentMethod && !status.trialActive && !status.active) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-yellow-400">Pago Pendiente</h3>
          </div>
          <p className="text-yellow-300 mb-6">
            Tu cuenta está registrada pero necesitas completar el método de pago para comenzar tu prueba gratuita.
          </p>
          
          {/* Botones de método de pago */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {/* Botón Stripe */}
            <button
              onClick={() => {
                // Obtener el plan del usuario desde localStorage o usar 'basic' por defecto
                const selectedPlan = localStorage.getItem('selectedPlan') || 'basic';
                createStripePaymentLink(selectedPlan as 'basic' | 'premium');
              }}
              disabled={stripeLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors duration-300 flex items-center gap-3 min-w-[200px]"
            >
              <img src="/strapi_logo.png" alt="Stripe" className="h-5 w-auto" />
              <div className="text-left">
                <p className="font-medium">Completar Pago</p>
                <p className="text-xs opacity-90">Activar tu prueba gratuita</p>
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
          <h3 className="text-lg font-semibold text-white mb-2">Sin suscripción activa</h3>
          <p className="text-neutral-400 mb-4">Para usar todas las funciones, elige un plan</p>
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
  const isTrialExpiring = sub.isTrialActive && sub.daysRemaining <= 3;
  const isExpired = sub.isCancelled && !sub.isInGracePeriod;

  return (
    <div className={`rounded-lg p-6 border ${
      isExpired ? 'bg-nexly-light-blue/20 border-nexly-light-blue/50' :
      sub.isPaused ? 'bg-orange-900/20 border-orange-700' :
      sub.isInGracePeriod ? 'bg-yellow-900/20 border-yellow-700' :
      isTrialExpiring ? 'bg-yellow-900/20 border-yellow-700' :
      sub.isActive ? 'bg-green-900/20 border-green-700' :
      'bg-neutral-800 border-neutral-700'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">
{sub.planType === 'basic' ? 'Plan Básico' : 'Plan Premium'}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              sub.status === 'active' ? 'bg-green-600 text-white' :
              sub.status === 'trialing' || (sub.status as any) === 'trial' ? 'bg-blue-600 text-white' :
              sub.status === 'paused' ? 'bg-orange-600 text-white' :
              sub.status === 'incomplete' ? 'bg-yellow-600 text-white' :
              sub.status === 'past_due' ? 'bg-red-600 text-white' :
              sub.status === 'canceled' ? 'bg-nexly-light-blue text-white' :
              sub.status === 'unpaid' ? 'bg-red-500 text-white' :
              'bg-gray-600 text-white'
            }`}>
              {
               sub.status === 'active' ? 'Activo' :
               sub.status === 'trialing' || (sub.status as any) === 'trial' ? 'Prueba' :
               sub.status === 'paused' ? 'Pausada' :
               sub.status === 'incomplete' ? 'Incompleto' :
               sub.status === 'past_due' ? 'Vencido' :
               sub.status === 'canceled' ? 'Cancelado' :
               sub.status === 'unpaid' ? 'No pagado' :
               'Desconocido'}
            </span>
          </div>
          
          {sub.isTrialActive && (
            <div className="text-sm text-neutral-300">
              <p>
                {sub.daysRemaining > 0 ? (
                  <>Prueba gratuita: {sub.daysRemaining} días restantes</>
                ) : (
                  <>Prueba gratuita terminada</>
                )}
              </p>
              {isTrialExpiring && (
                <p className="text-yellow-400 mt-1">
                  ⚠️ Tu prueba gratuita está por terminar
                </p>
              )}
            </div>
          )}

          {sub.isActive && (
            <p className="text-sm text-green-400">
              ✅ Suscripción activa y renovando automáticamente
            </p>
          )}

          {sub.isPaused && (
            <p className="text-sm text-orange-400">
              ⏸️ Suscripción pausada. Puedes reactivarla cuando quieras
            </p>
          )}

          {sub.isInGracePeriod && (
            <p className="text-sm text-yellow-400">
              ⏰ Período de gracia: {sub.gracePeriodDaysRemaining} días restantes
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
              {getMaxIntegrations() === 999 ? (
                'Integraciones: Todas disponibles'
              ) : (
                `Integraciones: Hasta ${getMaxIntegrations()} plataformas`
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Botón para renewar solo si está expirado */}
          {isExpired && (
            <button
              onClick={() => createPaymentLink()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Volver a comprar
            </button>
          )}
          
          {/* Botón para reactivar suscripción pausada */}
          {status.paused && (
            <button
              onClick={reactivateSubscription}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Reactivar
            </button>
          )}
          
          {/* Botón para pausar suscripción activa */}
          {status.active && (
            <button
              onClick={pauseSubscription}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
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

      {/* Progress bar for trial */}
      {status.trialActive && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-neutral-400 mb-1">
            <span>Progreso de prueba</span>
            <span>{sub.daysRemaining} de 7 días</span>
          </div>
          <div className="w-full bg-neutral-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isTrialExpiring ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.max(0, ((7 - sub.daysRemaining) / 7) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Progress bar for grace period */}
      {sub.isInGracePeriod && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-neutral-400 mb-1">
            <span>Período de gracia</span>
            <span>{sub.gracePeriodDaysRemaining} días restantes</span>
          </div>
          <div className="w-full bg-neutral-700 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300 bg-yellow-500"
              style={{ width: `${Math.max(0, ((7 - sub.gracePeriodDaysRemaining) / 7) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
