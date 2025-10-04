"use client";

import { useState } from "react";
import { useStripeOperations } from "@/hooks/useStripeOperations";
import { useNotificationHelpers } from "@/hooks/useNotification";

interface SubscriptionActionsProps {
  subscriptionId: string;
  status: string;
  isPaused: boolean;
  onStatusChange?: () => void;
}

export default function SubscriptionActions({ 
  subscriptionId, 
  status, 
  isPaused, 
  onStatusChange 
}: SubscriptionActionsProps) {
  const { 
    cancelSubscription, 
    pauseSubscription, 
    resumeSubscription, 
    loading, 
    error 
  } = useStripeOperations();
  
  const { showSuccess, showError } = useNotificationHelpers();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!confirm("¿Estás seguro de que quieres cancelar tu suscripción? Esta acción no se puede deshacer.")) {
      return;
    }

    setActionLoading("cancel");
    try {
      await cancelSubscription(subscriptionId);
      showSuccess("Éxito", "Suscripción cancelada exitosamente");
      onStatusChange?.();
    } catch (err) {
      showError("Error", "Error al cancelar la suscripción");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async () => {
    if (!confirm("¿Estás seguro de que quieres pausar tu suscripción? Podrás reanudarla más tarde.")) {
      return;
    }

    setActionLoading("pause");
    try {
      await pauseSubscription(subscriptionId);
      showSuccess("Éxito", "Suscripción pausada exitosamente");
      onStatusChange?.();
    } catch (err) {
      showError("Error", "Error al pausar la suscripción");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    setActionLoading("resume");
    try {
      await resumeSubscription(subscriptionId);
      showSuccess("Éxito", "Suscripción reanudada exitosamente");
      onStatusChange?.();
    } catch (err) {
      showError("Error", "Error al reanudar la suscripción");
    } finally {
      setActionLoading(null);
    }
  };

  if (error) {
    return (
      <div className="bg-accent-red/10 border border-accent-red/20 rounded-lg p-4">
        <p className="text-accent-red text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status === "active" && !isPaused && (
        <>
          <button
            onClick={handlePause}
            disabled={loading || actionLoading === "pause"}
            className="w-full px-4 py-2 text-sm font-medium text-accent-orange bg-accent-orange/10 hover:bg-accent-orange/20 disabled:bg-muted rounded-lg transition-colors border border-accent-orange/20"
          >
            {actionLoading === "pause" ? "Pausando..." : "Pausar Suscripción"}
          </button>
          
          <button
            onClick={handleCancel}
            disabled={loading || actionLoading === "cancel"}
            className="w-full px-4 py-2 text-sm font-medium text-accent-red bg-accent-red/10 hover:bg-accent-red/20 disabled:bg-muted disabled:text-muted-foreground rounded-lg transition-colors"
          >
            {actionLoading === "cancel" ? "Cancelando..." : "Cancelar Suscripción"}
          </button>
        </>
      )}

      {isPaused && (
        <button
          onClick={handleResume}
          disabled={loading || actionLoading === "resume"}
          className="w-full px-4 py-2 text-sm font-medium text-accent-green bg-accent-green/10 hover:bg-accent-green/20 disabled:bg-muted disabled:text-muted-foreground rounded-lg transition-colors"
        >
          {actionLoading === "resume" ? "Reanudando..." : "Reanudar Suscripción"}
        </button>
      )}

      {status === "trialing" && (
        <div className="text-sm text-muted-foreground text-center">
          <p>Tu período de prueba está activo</p>
          <p className="text-xs mt-1">Las opciones de pausa/cancelación estarán disponibles después del período de prueba</p>
        </div>
      )}
    </div>
  );
}
