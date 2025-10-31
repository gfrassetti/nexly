"use client";

import { useState } from "react";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useStripeOperations() {
  const { user } = useAuth();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const handleOpenPortal = async () => {
    if (!user) {
      setError("Usuario no autenticado");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/update-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.id }),
      });

      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No se pudo abrir el portal de pagos.");
      }
    } catch (err) {
      setError("Error de conexión al abrir el portal de pagos.");
      console.error("Error al abrir portal:", err);
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async (subscriptionId?: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!token) {
        throw new Error('Usuario no autenticado');
      }

      const res = await fetch(`${API_URL}/stripe/cancel`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: subscriptionId ? JSON.stringify({ subscriptionId }) : undefined,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al cancelar la suscripción");
      }

      const data = await res.json();
      
      toast.success('Suscripción cancelada', {
        description: 'Tu suscripción ha sido cancelada exitosamente'
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cancelar la suscripción";
      setError(errorMessage);
      
      toast.error('Error al cancelar', {
        description: errorMessage
      });
      
      console.error("Error al cancelar suscripción:", err);
      throw err;
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };

  const cancelTrial = async () => {
    return cancelSubscription();
  };

  const confirmCancellation = (action: () => Promise<void>) => {
    setPendingAction(() => action);
    setDialogOpen(true);
  };

  const executeConfirmedAction = async () => {
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
  };

  const pauseSubscription = async (subscriptionId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      
      const res = await fetch("/api/stripe/pause-subscription", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al pausar la suscripción");
      }

      const data = await res.json();
      
      toast.success('Suscripción pausada', {
        description: 'Tu suscripción ha sido pausada exitosamente'
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al pausar la suscripción";
      setError(errorMessage);
      
      toast.error('Error al pausar', {
        description: errorMessage
      });
      
      console.error("Error al pausar suscripción:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resumeSubscription = async (subscriptionId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      
      const res = await fetch("/api/stripe/resume-subscription", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al reanudar la suscripción");
      }

      const data = await res.json();
      
      toast.success('Suscripción reanudada', {
        description: 'Tu suscripción ha sido reanudada exitosamente'
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al reanudar la suscripción";
      setError(errorMessage);
      
      toast.error('Error al reanudar', {
        description: errorMessage
      });
      
      console.error("Error al reanudar suscripción:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    dialogOpen,
    setDialogOpen,
    handleOpenPortal,
    cancelSubscription,
    cancelTrial,
    confirmCancellation,
    executeConfirmedAction,
    pauseSubscription,
    resumeSubscription,
    clearError: () => setError(null)
  };
}
