"use client";

import { useState, useEffect } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationHelpers } from "@/hooks/useNotification";
import { useStripeOperations } from "@/hooks/useStripeOperations";
import BillingInfo from "@/components/BillingInfo";
import InvoiceHistory from "@/components/InvoiceHistory";
import SubscriptionActions from "@/components/SubscriptionActions";

// Iconos de tarjetas de pago
const paymentIcons = {
  visa: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",
  mastercard:
    "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
  amex: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png",
  default: "https://cdn-icons-png.flaticon.com/512/179/179457.png",
};

// Iconos para estados
const StatusIcons = {
  active: "●",
  trialing: "○",
  paused: "⏸",
  canceled: "✕",
  past_due: "!",
  incomplete: "○",
  unpaid: "○",
};

const normalizeMethod = (brand: string | undefined) => {
  if (!brand) return "default";
  const map: Record<string, string> = {
    visa: "visa",
    mastercard: "mastercard",
    amex: "amex",
  };
  return map[brand.toLowerCase()] || "default";
};

const getSubscriptionLabel = (subscription: any) => {
  const status = subscription.status;
  const icon = StatusIcons[status as keyof typeof StatusIcons] || "?";

  // Lógica mejorada: Si tiene stripeSubscriptionId, significa que ya pagó
  const hasStripeSubscription = subscription.stripeSubscriptionId;

  if (hasStripeSubscription) {
    return `Activa`;
  } else if (status === "trialing") {
    const trialEnd = new Date(subscription.trialEndDate);
    const now = new Date();
    const daysLeft = Math.ceil(
      (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return `Prueba Gratuita (${daysLeft} días restantes)`;
  } else if (status === "active") return `Activa`;
  else if (status === "paused") return `Pausada`;
  else if (status === "canceled") return `Cancelada`;
  else if (status === "past_due") return `Vencida`;
  else if (status === "incomplete") return `Pago Pendiente`;
  else if (status === "unpaid") return `Sin Pagar`;
  return `Desconocida`;
};

const getStatusColor = (status: string, hasStripeSubscription?: boolean) => {
  // Si tiene stripeSubscriptionId, usar color verde (activa)
  if (hasStripeSubscription) {
    return "bg-transparent text-accent-green border border-accent-green/30";
  }

  switch (status) {
    case "active":
      return "bg-transparent text-accent-green border border-accent-green/30";
    case "trialing":
      return "bg-transparent text-accent-blue border border-accent-blue/30";
    case "paused":
      return "bg-transparent text-accent-cream border border-accent-cream/30";
    case "canceled":
      return "bg-transparent text-accent-red border border-accent-red/30";
    case "past_due":
      return "bg-transparent text-accent-cream border border-accent-cream/30";
    case "incomplete":
      return "bg-transparent text-warning border border-warning/30";
    case "unpaid":
      return "bg-transparent text-accent-red border border-accent-red/30";
    default:
      return "bg-transparent text-muted-foreground border border-border";
  }
};

async function cancelStripeSubscription(subscriptionId: string) {
  const res = await fetch("/api/stripe/cancel-subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });
  if (!res.ok) throw new Error("Error al cancelar la suscripción");
  return res.json();
}

async function pauseStripeSubscription(subscriptionId: string) {
  const res = await fetch("/api/stripe/pause-subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });
  if (!res.ok) throw new Error("Error al pausar la suscripción");
  return res.json();
}

async function reactivateStripeSubscription(subscriptionId: string) {
  const res = await fetch("/api/stripe/reactivate-subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });
  if (!res.ok) throw new Error("Error al reactivar la suscripción");
  return res.json();
}

export default function SubscriptionInfo() {
  const { subscription, loading } = useSubscription();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationHelpers();
  const { handleOpenPortal, loading: stripeOperationsLoading } =
    useStripeOperations();

  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [stripeData, setStripeData] = useState<any>(null);
  const [stripeLoading, setStripeLoading] = useState(true);

  // Cargar datos de Stripe
  useEffect(() => {
    const fetchStripeData = async () => {
      try {
        setStripeLoading(true);
        const response = await fetch("/api/stripe/subscription-info", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStripeData(data);
        } else {
          console.error("Error fetching Stripe data:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching Stripe data:", error);
      } finally {
        setStripeLoading(false);
      }
    };

    if (user) {
      fetchStripeData();
    }
  }, [user]);

  const handleCancel = async () => {
    if (!subscription?.subscription?.stripeSubscriptionId) return;

    setIsLoadingAction(true);
    try {
      await cancelStripeSubscription(
        subscription.subscription.stripeSubscriptionId
      );
      showSuccess("Éxito", "Suscripción cancelada correctamente");
      // Recargar la página para actualizar el estado
      window.location.reload();
    } catch (error) {
      showError("Error", "Error al cancelar suscripción");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handlePause = async () => {
    if (!subscription?.subscription?.stripeSubscriptionId) return;

    setIsLoadingAction(true);
    try {
      await pauseStripeSubscription(
        subscription.subscription.stripeSubscriptionId
      );
      showSuccess("Éxito", "Suscripción pausada correctamente");
      window.location.reload();
    } catch (error) {
      showError("Error", "Error al pausar suscripción");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleReactivate = async () => {
    if (!subscription?.subscription?.stripeSubscriptionId) return;

    setIsLoadingAction(true);
    try {
      await reactivateStripeSubscription(
        subscription.subscription.stripeSubscriptionId
      );
      showSuccess("Éxito", "Suscripción reactivada correctamente");
      window.location.reload();
    } catch (error) {
      showError("Error", "Error al reactivar suscripción");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleUpgrade = () => {
    window.location.href = "/pricing";
  };

  if (loading || stripeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexly-green"></div>
        <span className="ml-2 text-muted-foreground text-sm">
          Cargando Suscripción...
        </span>
      </div>
    );
  }

  // Lógica más permisiva para detectar suscripción activa
  const hasActiveSubscription =
    subscription?.hasSubscription ||
    (subscription?.subscription &&
      subscription.subscription.stripeSubscriptionId) ||
    subscription?.userSubscriptionStatus === "active_trial" ||
    subscription?.userSubscriptionStatus === "active_paid";

  if (!hasActiveSubscription) {
    return (
      <div
        className="min-h-screen p-6"
        style={{ background: "var(--background-gradient)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-muted border border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-background border border-border rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-muted-foreground">●</span>
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              Sin Suscripción Activa
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              No tienes una suscripción activa. Elige un plan para comenzar.
            </p>
            <button
              onClick={handleUpgrade}
              className="bg-accent-green/20 border border-accent-green/30 text-accent-green hover:bg-accent-green/30 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Ver Planes Disponibles
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sub = subscription.subscription;
  const stripeSub = stripeData?.subscription;
  const stripePaymentMethod = stripeData?.paymentMethod;

  // Usar datos reales de Stripe si están disponibles
  const card = stripePaymentMethod?.card || { brand: "visa", last4: "4242" };
  const normalized = normalizeMethod(card?.brand);
  const isPaused = stripeSub?.pauseCollection || sub?.status === "paused";

  // Formatear fecha de renovación
  const renewalDate = stripeSub?.currentPeriodEnd
    ? new Date(stripeSub.currentPeriodEnd).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : sub?.trialEndDate
    ? new Date(sub.trialEndDate).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "Fecha no disponible";

  // Formatear monto
  const amount = stripeSub?.amount
    ? (stripeSub.amount / 100).toFixed(2)
    : sub?.status === "trialing"
    ? "0.00"
    : sub?.planType === "basic"
    ? "29.99"
    : "49.99";

  // Usar estado real de Stripe
  const actualStatus = stripeSub?.status || sub?.status;

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "var(--background-gradient)" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-lg font-medium text-foreground mb-2">
            Mi Suscripción
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestiona tu suscripción y método de pago
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel principal de suscripción */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card de estado de suscripción */}
            <div className="bg-muted border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-medium text-foreground">
                  Estado de Suscripción
                </h2>
                <div
                  className={`px-4 py-2 rounded-full border text-sm font-medium ${getStatusColor(
                    actualStatus,
                    !!sub?.stripeSubscriptionId
                  )}`}
                >
                  {getSubscriptionLabel({ ...sub, status: actualStatus })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      ID de Suscripción
                    </label>
                    <p className="text-foreground font-mono text-xs mt-1 bg-background px-3 py-2 rounded-md">
                      {stripeData?.subscription?.id ||
                        subscription.subscription?.id ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Plan
                    </label>
                    <p className="text-sm font-semibold text-foreground mt-1 capitalize">
                      {sub?.planType === "basic" ? "Básico" : "Premium"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Monto
                    </label>
                    <p className="text-lg font-semibold text-foreground mt-1">
                      ${amount}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        /mes
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Próxima Renovación
                    </label>
                    <p className="text-sm text-foreground mt-1">
                      {renewalDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card de método de pago */}
            <div className="bg-muted border border-border rounded-lg p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">
                Método de Pago
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-8 bg-background border border-border rounded flex items-center justify-center">
                    <img
                      src={
                        paymentIcons[normalized as keyof typeof paymentIcons] ||
                        paymentIcons.default
                      }
                      alt={normalized}
                      className="h-6 w-auto"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {normalized === "visa"
                        ? "Visa"
                        : normalized === "mastercard"
                        ? "Mastercard"
                        : normalized === "amex"
                        ? "American Express"
                        : "Tarjeta"}{" "}
                      terminada en {card?.last4 || "****"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Método de pago por defecto
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleOpenPortal}
                  disabled={stripeOperationsLoading}
                  className="px-3 py-2 text-xs font-medium text-foreground bg-muted hover:bg-muted/80 disabled:bg-muted/50 rounded-md transition-colors border border-border"
                >
                  {stripeOperationsLoading ? "Cargando..." : "Cambiar"}
                </button>
              </div>
            </div>
          </div>

          {/* Panel lateral de acciones */}
          <div className="space-y-6">
            {/* Acciones de suscripción */}
            <div className="bg-muted border border-border rounded-lg p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">
                Acciones
              </h3>
              <SubscriptionActions
                subscriptionId={sub?.stripeSubscriptionId || sub?.id || ""}
                status={actualStatus}
                isPaused={isPaused}
                onStatusChange={() => {
                  // Recargar datos si es necesario
                  window.location.reload();
                }}
              />
            </div>

            {/* Información adicional */}
            <div className="bg-muted border border-border rounded-lg p-6">
              <h4 className="font-medium text-foreground mb-2 text-sm">
                Información
              </h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>• Pausar mantiene tus datos</li>
                <li>• Cancelar elimina acceso inmediato</li>
                <li>• Puedes reactivar en cualquier momento</li>
                <li>• Acceso completo a todas las funciones</li>
              </ul>
            </div>
          </div>

          {/* Información de facturación */}
          <div className="lg:col-span-2 mb-8">
            <BillingInfo />
          </div>

          {/* Historial de facturas */}
          <div className="mb-8">
            <InvoiceHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
