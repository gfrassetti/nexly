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
    if (!subscription?.subscription) return "bg-gray-100 text-gray-800";
    
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
    
    return statusColors[subscription.subscription.status] || "bg-gray-100 text-gray-800";
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
    return null; // No mostrar errores al usuario
  }

  if (!subscription?.subscription) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center text-gray-500">
            <p>No hay suscripción activa</p>
          </div>
        </div>
      </div>
    );
  } else {
    return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
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
                {formatDate(subscription.subscription.trialEndDate)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Método de pago</span>
              <span className="font-medium text-gray-900">Método de pago configurado</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Email cliente</span>
              <span className="font-medium text-gray-900">{user?.email || "-"}</span>
            </div>
            
            <div className="border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ID de suscripción</span>
                <span className="font-mono text-sm text-gray-500">
                  {subscription.subscription.stripeSubscriptionId || subscription.subscription.id}
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
                {formatDate(subscription.subscription.trialEndDate)}
              </span>
            </div>
            
            {subscription.subscription.trialEndDate && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fin de prueba</span>
                <span className="font-medium text-gray-900">
                  {formatDate(subscription.subscription.trialEndDate)}
                </span>
              </div>
            )}
            
            {subscription.subscription.cancelledAt && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cancelado el</span>
                <span className="font-medium text-gray-900">
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
