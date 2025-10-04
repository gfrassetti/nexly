"use client";

import { useSubscription } from "@/contexts/SubscriptionContext";
import InvoiceHistory from "./InvoiceHistory";
import BillingStats from "./BillingStats";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function BillingInfo() {
  const { subscription, loading, error } = useSubscription();
  const { user } = useAuth();

  // Función para obtener el nombre del plan
  const getPlanName = useMemo(() => {
    if (!subscription?.subscription) return "Plan desconocido";
    return subscription.subscription.planType === 'basic' ? 'Plan Básico' : 'Plan Premium';
  }, [subscription?.subscription?.planType]);

  // Función para formatear el estado
  const getStatusLabel = useMemo(() => {
    if (!subscription?.subscription) return "Desconocido";
    
    const statusLabels: Record<string, string> = {
      'trialing': 'Prueba',
      'active': 'Activo',
      'incomplete': 'Incompleto',
      'incomplete_expired': 'Incompleto Expirado',
      'past_due': 'Vencido',
      'canceled': 'Cancelado',
      'unpaid': 'Impago',
      'paused': 'Pausado'
    };
    
    return statusLabels[subscription.subscription.status] || subscription.subscription.status;
  }, [subscription?.subscription?.status]);

  // Función para obtener el color del badge
  const getStatusColor = useMemo(() => {
    if (!subscription?.subscription) return "bg-muted text-muted-foreground border border-border";
    
    const statusColors: Record<string, string> = {
      'trialing': 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30',
      'active': 'bg-accent-green/20 text-accent-green border border-accent-green/30',
      'incomplete': 'bg-warning/20 text-warning border border-warning/30',
      'incomplete_expired': 'bg-accent-red/20 text-accent-red border border-accent-red/30',
      'past_due': 'bg-accent-orange/20 text-accent-orange border border-accent-orange/30',
      'canceled': 'bg-accent-red/20 text-accent-red border border-accent-red/30',
      'unpaid': 'bg-accent-red/20 text-accent-red border border-accent-red/30',
      'paused': 'bg-muted text-muted-foreground border border-border'
    };
    
    return statusColors[subscription.subscription.status] || "bg-muted text-muted-foreground border border-border";
  }, [subscription?.subscription?.status]);

  // Función para formatear la fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Función para formatear el monto
  const formatAmount = () => {
    if (!subscription?.subscription) return "-";
    // Usar precios fijos basados en el plan
    const amount = subscription.subscription.planType === 'basic' ? 2999 : 4999;
    return (amount / 100).toLocaleString("es-ES", {
      style: "currency",
      currency: "USD"
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-muted border border-border rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-background rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-background rounded"></div>
              <div className="h-4 bg-background rounded w-3/4"></div>
              <div className="h-4 bg-background rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // No mostrar errores al usuario
  }

  if (!subscription?.subscription) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-muted border border-border rounded-lg p-6">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No hay suscripción activa</p>
          </div>
        </div>
      </div>
    );
  } else {
    return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Información de facturación actual */}
        <div className="bg-muted border border-border rounded-lg">
          <div className="p-6 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Facturación actual</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Estado</span>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor}`}>
                {getStatusLabel}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Plan</span>
              <span className="font-medium text-sm text-foreground">{getPlanName}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Monto</span>
              <span className="font-medium text-sm text-foreground">{formatAmount()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Próxima factura</span>
              <span className="font-medium text-sm text-foreground">
                {formatDate(subscription.subscription.trialEndDate)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Método de pago</span>
              <span className="font-medium text-sm text-foreground">Método de pago configurado</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Email cliente</span>
              <span className="font-medium text-sm text-foreground">{user?.email || "-"}</span>
            </div>
            
            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">ID de suscripción</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {subscription.subscription.stripeSubscriptionId || subscription.subscription.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-muted border border-border rounded-lg">
          <div className="p-6 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Detalles adicionales</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Período actual</span>
              <span className="font-medium text-sm text-foreground">
                {formatDate(subscription.subscription.trialEndDate)}
              </span>
            </div>
            
            {subscription.subscription.trialEndDate && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Fin de prueba</span>
                <span className="font-medium text-sm text-foreground">
                  {formatDate(subscription.subscription.trialEndDate)}
                </span>
              </div>
            )}
            
            {subscription.subscription.cancelledAt && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Cancelado el</span>
                <span className="font-medium text-sm text-foreground">
                  {formatDate(subscription.subscription.cancelledAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas de facturación */}
      <BillingStats />
    </div>
    );
  }
}
