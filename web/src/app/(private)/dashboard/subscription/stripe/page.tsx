"use client";

import { useState, useEffect } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationHelpers } from "@/hooks/useNotification";
import BillingInfo from "@/components/BillingInfo";
import InvoiceHistory from "@/components/InvoiceHistory";

// Iconos de tarjetas de pago
const paymentIcons = {
  visa: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",
  mastercard: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
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
  unpaid: "○"
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
  
  if (status === "trialing") {
    const trialEnd = new Date(subscription.trialEndDate);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `Prueba Gratuita (${daysLeft} días restantes)`;
  }
  if (status === "active") return `Activa`;
  if (status === "paused") return `Pausada`;
  if (status === "canceled") return `Cancelada`;
  if (status === "past_due") return `Vencida`;
  if (status === "incomplete") return `Pago Pendiente`;
  if (status === "unpaid") return `Sin Pagar`;
  return `Desconocida`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active": return "text-green-600 bg-green-50 border-green-200";
    case "trialing": return "text-blue-600 bg-blue-50 border-blue-200";
    case "paused": return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "canceled": return "text-red-600 bg-red-50 border-red-200";
    case "past_due": return "text-orange-600 bg-orange-50 border-orange-200";
    case "incomplete": return "text-purple-600 bg-purple-50 border-purple-200";
    case "unpaid": return "text-gray-600 bg-gray-50 border-gray-200";
    default: return "text-gray-600 bg-gray-50 border-gray-200";
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
  
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [stripeData, setStripeData] = useState<any>(null);
  const [stripeLoading, setStripeLoading] = useState(true);

  // Cargar datos de Stripe
  useEffect(() => {
    const fetchStripeData = async () => {
      try {
        setStripeLoading(true);
        const response = await fetch('/api/stripe/subscription-info', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStripeData(data);
        } else {
          console.error('Error fetching Stripe data:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching Stripe data:', error);
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
      await cancelStripeSubscription(subscription.subscription.stripeSubscriptionId);
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
      await pauseStripeSubscription(subscription.subscription.stripeSubscriptionId);
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
      await reactivateStripeSubscription(subscription.subscription.stripeSubscriptionId);
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
        <span className="ml-2 text-gray-600">Cargando Suscripción...</span>
      </div>
    );
  }

  // Verificar si realmente no hay suscripción activa
  console.log("🔍 Stripe page - Full subscription object:", subscription);
  console.log("🔍 Stripe page - Subscription debug:", {
    hasSubscription: subscription?.hasSubscription,
    subscription: subscription?.subscription,
    status: subscription?.subscription?.status,
    stripeSubscriptionId: subscription?.subscription?.stripeSubscriptionId,
    userSubscriptionStatus: subscription?.userSubscriptionStatus
  });

  // Lógica más permisiva para detectar suscripción activa
  const hasActiveSubscription = subscription?.hasSubscription || 
    (subscription?.subscription && subscription.subscription.stripeSubscriptionId) ||
    subscription?.userSubscriptionStatus === 'active_trial' ||
    subscription?.userSubscriptionStatus === 'active_paid';

  console.log("🔍 Stripe page - Has active subscription:", hasActiveSubscription);
  console.log("🔍 Stripe page - Detailed check:", {
    hasSubscription: subscription?.hasSubscription,
    hasSubscriptionObject: !!subscription?.subscription,
    statusCheck: subscription?.subscription?.status,
    stripeIdCheck: !!subscription?.subscription?.stripeSubscriptionId,
    userStatusCheck: subscription?.userSubscriptionStatus
  });

  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">●</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sin Suscripción Activa</h2>
            <p className="text-gray-600 mb-6">No tienes una suscripción activa. Elige un plan para comenzar.</p>
            <button
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-nexly-green to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
    ? new Date(stripeSub.currentPeriodEnd).toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      })
    : sub?.trialEndDate 
    ? new Date(sub.trialEndDate).toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      })
    : "Fecha no disponible";
  
  // Formatear monto
  const amount = stripeSub?.amount 
    ? (stripeSub.amount / 100).toFixed(2)
    : sub?.status === "trialing" ? "0.00" : sub?.planType === "basic" ? "29.99" : "49.99";
  
  // Usar estado real de Stripe
  const actualStatus = stripeSub?.status || sub?.status;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Suscripción</h1>
          <p className="text-gray-600">Gestiona tu suscripción y método de pago</p>
        </div>


        {/* Información de facturación */}
        <div className="mb-8">
          <BillingInfo />
        </div>

        {/* Historial de facturas */}
        <div className="mb-8">
          <InvoiceHistory />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel principal de suscripción */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card de estado de suscripción */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Estado de Suscripción</h2>
                <div className={`px-4 py-2 rounded-full border text-sm font-medium ${getStatusColor(actualStatus)}`}>
                  {getSubscriptionLabel({ ...sub, status: actualStatus })}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">ID de Suscripción</label>
                    <p className="text-gray-900 font-mono text-sm mt-1 bg-gray-50 px-3 py-2 rounded-lg">
                      {stripeData?.subscription?.id || subscription.subscription?.id || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Plan</label>
                    <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                      {sub?.planType === "basic" ? "Básico" : "Premium"}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Monto</label>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ${amount}
                      <span className="text-sm font-normal text-gray-500 ml-1">/mes</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Próxima Renovación</label>
                    <p className="text-gray-900 mt-1">
                      {renewalDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card de método de pago */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Método de Pago</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center">
                    <img
                      src={paymentIcons[normalized as keyof typeof paymentIcons] || paymentIcons.default}
                      alt={normalized}
                      className="h-6 w-auto"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {normalized === "visa" ? "Visa" : normalized === "mastercard" ? "Mastercard" : normalized === "amex" ? "American Express" : "Tarjeta"} terminada en {card?.last4 || "****"}
                    </p>
                    <p className="text-sm text-gray-500">Método de pago por defecto</p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = "/pricing"}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cambiar
                </button>
              </div>
            </div>
          </div>

          {/* Panel lateral de acciones */}
          <div className="space-y-6">
            {/* Acciones de suscripción */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Acciones</h3>
              <div className="space-y-3">
                {actualStatus === "active" && !isPaused && (
                  <button
                    onClick={handlePause}
                    disabled={isLoadingAction}
                    className="w-full flex items-center justify-center px-4 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {isLoadingAction ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Pausando...
                      </>
                    ) : (
                      "Pausar Suscripción"
                    )}
                  </button>
                )}

                {isPaused && (
                  <button
                    onClick={handleReactivate}
                    disabled={isLoadingAction}
                    className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {isLoadingAction ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Reactivando...
                      </>
                    ) : (
                      "Reactivar Suscripción"
                    )}
                  </button>
                )}

                {actualStatus !== "canceled" && (
                  <button
                    onClick={handleCancel}
                    disabled={isLoadingAction}
                    className="w-full flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {isLoadingAction ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Cancelando...
                      </>
                    ) : (
                      "Cancelar Suscripción"
                    )}
                  </button>
                )}

                {(actualStatus === "canceled" || actualStatus === "past_due") && (
                  <button
                    onClick={handleUpgrade}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-nexly-green to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    Comprar Nueva Suscripción
                  </button>
                )}
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-2">Información</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Pausar mantiene tus datos</li>
                <li>• Cancelar elimina acceso inmediato</li>
                <li>• Puedes reactivar en cualquier momento</li>
                <li>• Acceso completo a todas las funciones</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
