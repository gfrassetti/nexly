"use client";

import { useSubscription } from "@/contexts/SubscriptionContext";

export default function BillingPanel() {
  const { subscription, status } = useSubscription();

  if (!subscription?.hasSubscription || !subscription.subscription) {
    return (
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6">
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

  // Obtener información del plan
  const plan = sub.planType === 'basic' ? 'Plan Básico' : 'Plan Premium';

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
        return 'bg-transparent text-accent-green border border-accent-green/30';
      case 'trialing':
      case 'trial' as any:
        return 'bg-transparent text-accent-blue border border-accent-blue/30';
      case 'paused':
        return 'bg-transparent text-accent-cream border border-accent-cream/30';
      case 'incomplete':
        return 'bg-transparent text-warning border border-warning/30';
      case 'past_due':
        return 'bg-transparent text-accent-red border border-accent-red/30';
      case 'canceled':
        return 'bg-transparent text-accent-blue border border-accent-blue/30';
      case 'unpaid':
        return 'bg-transparent text-accent-red border border-accent-red/30';
      default:
        return 'bg-transparent text-muted-foreground border border-border';
    }
  };

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg">
      <div className="p-6 border-b border-neutral-700">
        <h3 className="text-lg font-semibold text-white">Detalles de facturación</h3>
        <p className="text-sm text-neutral-400 mt-1">Información de suscripción</p>
      </div>

      <div className="p-6 space-y-4 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-neutral-300">Estado</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>
        </div>
        
        <div className="h-px bg-neutral-700"></div>
        
        <div className="flex justify-between">
          <span className="text-neutral-300">Plan</span>
          <span className="text-white">{plan}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-300">Próxima Factura</span>
          <span className="text-white">{nextBilling}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-300">Renovación</span>
          <span className="text-white">{renewal}</span>
        </div>
        
        <div className="h-px bg-neutral-700"></div>
        
        <div className="flex justify-between">
          <span className="text-neutral-300">Método de pago</span>
          <span className="text-white">
            {sub.stripeSubscriptionId ? 'Tarjeta vinculada' : 'No disponible'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-300">ID de Suscripción</span>
          <span className="text-white font-mono text-xs">
            {sub.stripeSubscriptionId ? `${sub.stripeSubscriptionId.slice(0, 8)}...` : 'No disponible'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-neutral-300">Fecha de inicio</span>
          <span className="text-white">
            {(sub as any).startDate ? new Date((sub as any).startDate).toLocaleDateString("es-AR") : 'No disponible'}
          </span>
        </div>
      </div>
    </div>
  );
}
