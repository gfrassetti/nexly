"use client";

import { useSubscriptionInfo } from "@/contexts/SubscriptionInfoContext";
import { useMemo } from "react";

export default function BillingInfo() {
  const { subscription, customer, paymentMethod, loading, error } = useSubscriptionInfo();

  // Función para obtener el nombre del plan
  const getPlanName = useMemo(() => {
    if (!subscription) return "Plan desconocido";
    return subscription.planType === 'basic' ? 'Plan Básico' : 'Plan Premium';
  }, [subscription?.planType]);

  // Función para formatear el estado
  const getStatusLabel = useMemo(() => {
    if (!subscription) return "Desconocido";
    
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
    
    return statusLabels[subscription.status] || subscription.status;
  }, [subscription?.status]);

  // Función para obtener el color del badge
  const getStatusColor = useMemo(() => {
    if (!subscription) return "bg-gray-100 text-gray-800";
    
    const statusColors: Record<string, string> = {
      'trialing': 'bg-blue-100 text-blue-800',
      'active': 'bg-green-100 text-green-800',
      'incomplete': 'bg-yellow-100 text-yellow-800',
      'incomplete_expired': 'bg-red-100 text-red-800',
      'past_due': 'bg-orange-100 text-orange-800',
      'canceled': 'bg-red-100 text-red-800',
      'unpaid': 'bg-red-100 text-red-800',
      'paused': 'bg-gray-100 text-gray-800'
    };
    
    return statusColors[subscription.status] || "bg-gray-100 text-gray-800";
  }, [subscription?.status]);

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
    if (!subscription?.amount) return "-";
    return (subscription.amount / 100).toLocaleString("es-ES", {
      style: "currency",
      currency: subscription.currency?.toUpperCase() || "USD"
    });
  };

  // Función para formatear la información de la tarjeta
  const getCardInfo = () => {
    if (!paymentMethod?.card) return "No hay método de pago";
    const { brand, last4 } = paymentMethod.card;
    return `${brand.toUpperCase()} •••• ${last4}`;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <div>
              <h3 className="text-red-800 font-medium">Error al cargar facturación</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center text-gray-500">
            <p>No hay suscripción activa</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Información de facturación actual */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Facturación actual</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Estado</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor}`}>
              {getStatusLabel}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Plan</span>
            <span className="font-medium text-gray-900">{getPlanName}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Monto</span>
            <span className="font-medium text-gray-900">{formatAmount()}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Próxima factura</span>
            <span className="font-medium text-gray-900">
              {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Método de pago</span>
            <span className="font-medium text-gray-900">{getCardInfo()}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Email cliente</span>
            <span className="font-medium text-gray-900">{customer?.email || "-"}</span>
          </div>
          
          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ID de suscripción</span>
              <span className="font-mono text-sm text-gray-500">
                {subscription.stripeSubscriptionId || subscription.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Detalles adicionales</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Período actual</span>
            <span className="font-medium text-gray-900">
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
          
          {subscription.trialEndDate && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Fin de prueba</span>
              <span className="font-medium text-gray-900">
                {formatDate(subscription.trialEndDate)}
              </span>
            </div>
          )}
          
          {subscription.canceledAt && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cancelado el</span>
              <span className="font-medium text-gray-900">
                {formatDate(subscription.canceledAt)}
              </span>
            </div>
          )}
          
          {subscription.cancelAtPeriodEnd && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <span className="text-yellow-800 text-sm">
                  Esta suscripción se cancelará al final del período actual
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
