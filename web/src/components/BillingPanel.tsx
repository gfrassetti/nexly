"use client";

import { useSubscription } from "@/contexts/SubscriptionContext";
import { useConversationUsage } from "@/hooks/useConversationUsage";
import { useAddOns } from "@/hooks/useAddOns";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingPanel() {
  const { subscription, status } = useSubscription();
  const { usage, loading: usageLoading } = useConversationUsage();
  const { addOns, loading: addOnsLoading } = useAddOns();

  if (!subscription?.hasSubscription || !subscription.subscription) {
    return (
      <div className="bg-accent-dark border border-neutral-700 rounded-lg p-6">
        <div className="text-sm text-neutral-400">
          No se encontró una suscripción activa.
        </div>
      </div>
    );
  }

  const sub = subscription.subscription;
  const subscriptionStatus = sub.status;
  const isCanceled = subscriptionStatus === "canceled";
  const isTrialActive = status.trialActive;
  const isActive = status.active;

  // Calcular próxima facturación
  const nextBilling = sub.trialEndDate 
    ? new Date(sub.trialEndDate).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  // Obtener información del plan actualizada
  const getPlanName = () => {
    switch (sub.planType) {
      case 'crecimiento':
        return 'Plan Crecimiento';
      case 'pro':
        return 'Plan Pro';
      case 'business':
        return 'Plan Business';
      default:
        return 'Plan Básico';
    }
  };

  const getPlanLimits = () => {
    switch (sub.planType) {
      case 'crecimiento':
        return '450 conversaciones/mes';
      case 'pro':
        return '1,500 conversaciones/mes';
      case 'business':
        return '2,250 conversaciones/mes';
      default:
        return '450 conversaciones/mes';
    }
  };

  const getPlanPrice = () => {
    switch (sub.planType) {
      case 'crecimiento':
        return '$30 USD/mes';
      case 'pro':
        return '$59 USD/mes';
      case 'business':
        return '$150 USD/mes';
      default:
        return '$30 USD/mes';
    }
  };

  // Estado de renovación
  let renewal;
  if (isCanceled) {
    renewal = "Suscripción cancelada";
  } else if (isTrialActive) {
    renewal = `Prueba gratuita hasta el ${nextBilling}`;
  } else if (isActive) {
    renewal = "Renovación automática activada";
  } else {
    renewal = "Estado pendiente";
  }

  // Obtener etiqueta del estado
  const getStatusLabel = () => {
    switch (subscriptionStatus) {
      case 'active':
        return 'Activo';
      case 'trialing':
      case 'trial' as any:
        return 'Prueba';
      case 'paused':
        return 'Pausada';
      case 'incomplete':
        return 'Incompleto';
      case 'past_due':
        return 'Vencido';
      case 'canceled':
        return 'Cancelado';
      case 'unpaid':
        return 'No pagado';
      default:
        return 'Desconocido';
    }
  };

  const getStatusColor = () => {
    switch (subscriptionStatus) {
      case 'active':
        return 'bg-transparent text-green-400 border border-green-400/30';
      case 'trialing':
      case 'trial' as any:
        return 'bg-transparent text-blue-400 border border-blue-400/30';
      case 'paused':
        return 'bg-transparent text-accent-cream border border-accent-cream/30';
      case 'incomplete':
        return 'bg-transparent text-orange-400 border border-orange-400/30';
      case 'past_due':
        return 'bg-transparent text-red-400 border border-red-400/30';
      case 'canceled':
        return 'bg-transparent text-blue-400 border border-blue-400/30';
      case 'unpaid':
        return 'bg-transparent text-red-400 border border-red-400/30';
      default:
        return 'bg-transparent text-neutral-400 border border-neutral-700';
    }
  };

  return (
    <div className="bg-accent-dark border border-neutral-700 rounded-lg">
      <div className="p-6 border-b border-neutral-700">
        <h3 className="text-lg font-semibold text-accent-cream">Detalles de facturación</h3>
        <p className="text-sm text-neutral-400 mt-1">Información de suscripción y uso</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Información de la suscripción */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-neutral-300">Estado</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusLabel()}
            </span>
          </div>
          
          <div className="h-px bg-neutral-700"></div>
          
          <div className="flex justify-between">
            <span className="text-neutral-300">Plan</span>
            <span className="text-accent-cream">{getPlanName()}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-neutral-300">Precio</span>
            <span className="text-accent-cream">{getPlanPrice()}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-300">Capacidad del plan</span>
            <span className="text-accent-cream">{getPlanLimits()}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-neutral-300">Próxima Factura</span>
            <span className="text-accent-cream">{nextBilling}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-neutral-300">Renovación</span>
            <span className="text-accent-cream">{renewal}</span>
          </div>
        </div>

        <div className="h-px bg-neutral-700"></div>

        {/* Métricas de uso */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-accent-cream">Uso de Conversaciones</h4>
          
          {usageLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : usage ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-300">Usadas este mes</span>
                <span className="text-accent-cream">{usage.monthly.used} / {usage.monthly.limit}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-neutral-300">Del plan base</span>
                <span className="text-accent-cream">{usage.monthly.baseLimit}</span>
              </div>
              
              {usage.monthly.addOnLimit > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-300">Add-ons activos</span>
                  <span className="text-orange-400">+{usage.monthly.addOnLimit}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-neutral-300">Restantes</span>
                <span className="text-green-400">{usage.monthly.remaining}</span>
              </div>

              <div className="w-full bg-neutral-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    usage.status === 'critical' ? 'bg-red-500' :
                    usage.status === 'warning' ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usage.monthly.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-400">Error al cargar métricas</div>
          )}
        </div>

        {/* Add-ons comprados */}
        {addOns.length > 0 && (
          <>
            <div className="h-px bg-neutral-700"></div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-accent-cream">Paquetes Adicionales</h4>
              
              {addOnsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {addOns.map((addOn) => (
                    <div key={addOn.id} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium text-orange-400">
                            +{addOn.conversationsAdded} conversaciones
                          </div>
                          <div className="text-xs text-neutral-400">
                            Comprado el {new Date(addOn.purchaseDate).toLocaleDateString("es-AR")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-accent-cream">$30 USD</div>
                          <div className="text-xs text-neutral-400">Pago único</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-neutral-500">
                        Expira: {new Date(addOn.expirationDate).toLocaleDateString("es-AR")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="h-px bg-neutral-700"></div>

        {/* Información de pago */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-accent-cream">Información de Pago</h4>
          
          <div className="flex justify-between">
            <span className="text-neutral-300">Método de pago</span>
            <span className="text-accent-cream">
              {sub.stripeSubscriptionId ? 'Tarjeta vinculada' : 'No disponible'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-neutral-300">ID de Suscripción</span>
            <span className="text-accent-cream font-mono text-xs">
              {sub.stripeSubscriptionId ? `${sub.stripeSubscriptionId.slice(0, 8)}...` : 'No disponible'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-neutral-300">Fecha de inicio</span>
            <span className="text-accent-cream">
              {(sub as any).startDate ? new Date((sub as any).startDate).toLocaleDateString("es-AR") : 'No disponible'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}