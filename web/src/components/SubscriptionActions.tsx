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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    setShowCancelModal(false);
    setActionLoading("cancel");
    try {
      await cancelSubscription(subscriptionId);
      const message = status === "trialing" 
        ? "Período de prueba cancelado exitosamente" 
        : "Suscripción cancelada exitosamente";
      showSuccess("Éxito", message);
      onStatusChange?.();
    } catch (err) {
      showError("Error", "Error al cancelar la suscripción");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseClick = () => {
    setShowPauseModal(true);
  };

  const handlePauseConfirm = async () => {
    setShowPauseModal(false);
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
            onClick={handlePauseClick}
            disabled={loading || actionLoading === "pause"}
            className="w-full px-4 py-2 text-sm font-medium text-accent-cream bg-accent-cream/10 hover:bg-accent-cream/20 disabled:bg-muted rounded-lg transition-colors border border-accent-cream/20"
          >
            {actionLoading === "pause" ? "Pausando..." : "Pausar Suscripción"}
          </button>
          
          <button
            onClick={handleCancelClick}
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
        <>
          <div className="text-sm text-muted-foreground text-center mb-3">
            <p>Tu período de prueba está activo</p>
            <p className="text-xs mt-1">Puedes cancelar en cualquier momento sin costo</p>
          </div>
          <button
            onClick={handleCancelClick}
            disabled={loading || actionLoading === "cancel"}
            className="w-full px-4 py-2 text-sm font-medium text-accent-red bg-accent-red/10 hover:bg-accent-red/20 disabled:bg-muted disabled:text-muted-foreground rounded-lg transition-colors"
          >
            {actionLoading === "cancel" ? "Cancelando..." : "Cancelar Período de Prueba"}
          </button>
        </>
      )}

      {status === "canceled" && (
        <>
          <div className="text-sm text-muted-foreground text-center mb-3">
            <p>Tu suscripción ha sido cancelada</p>
            <p className="text-xs mt-1">Puedes reactivar tu suscripción en cualquier momento</p>
          </div>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="w-full px-4 py-2 text-sm font-medium text-accent-cream bg-nexly-azul hover:bg-nexly-light-blue rounded-lg transition-colors"
          >
            Reactivar Suscripción
          </button>
          <button
            onClick={() => window.location.href = '/dashboard/integrations'}
            className="w-full px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            Ver Integraciones
          </button>
        </>
      )}

      {/* Modal de confirmación para cancelar */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {status === "trialing" ? "Cancelar Período de Prueba" : "Cancelar Suscripción"}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {status === "trialing" 
                ? "¿Estás seguro de que quieres cancelar tu período de prueba? No se te cobrará nada y perderás el acceso inmediatamente."
                : "¿Estás seguro de que quieres cancelar tu suscripción? Esta acción no se puede deshacer."
              }
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={actionLoading === "cancel"}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg"
              >
                {actionLoading === "cancel" ? "Cancelando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para pausar */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Pausar Suscripción</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              ¿Estás seguro de que quieres pausar tu suscripción? Podrás reanudarla más tarde.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handlePauseConfirm}
                disabled={actionLoading === "pause"}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-lg"
              >
                {actionLoading === "pause" ? "Pausando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
