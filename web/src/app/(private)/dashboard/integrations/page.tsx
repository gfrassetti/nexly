"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePaymentLink } from "@/hooks/usePaymentLink";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useNotificationHelpers } from "@/hooks/useNotification";
import FreeTrialBanner from "@/components/FreeTrialBanner";
import { useAuth } from "@/hooks/useAuth";
import useSWR from "swr";

function IntegrationsContent() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const { subscription, getMaxIntegrations, status } = useSubscription();
  const { createPaymentLink } = usePaymentLink();
  const { integrations, isIntegrationAvailable, getButtonText, getButtonStyle, handleIntegrationClick } = useIntegrations();
  const { showSuccess, showError } = useNotificationHelpers();
  const { token } = useAuth();

  // Fetch integraciones conectadas del usuario
  const { data: connectedIntegrations, mutate: refreshIntegrations } = useSWR(
    token ? ["/integrations", token] : null,
    async ([url, t]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      return res.json();
    }
  );

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "whatsapp_connected") {
      showSuccess("¡WhatsApp conectado!", "WhatsApp se ha conectado exitosamente");
      setMessage("¡WhatsApp conectado exitosamente!");
      // Refrescar integraciones
      refreshIntegrations();
    } else if (success === "instagram_connected") {
      showSuccess("¡Instagram conectado!", "Instagram se ha conectado exitosamente");
      setMessage("¡Instagram conectado exitosamente!");
      // Refrescar integraciones
      refreshIntegrations();
    } else if (error) {
      let errorTitle = "Error de conexión";
      let errorMessage = "Error al conectar WhatsApp. Intenta de nuevo.";
      
      switch (error) {
        case "oauth_failed":
          errorTitle = "Error de autenticación";
          errorMessage = "Error al autenticar con Meta. Verifica los logs del servidor para más detalles.";
          break;
        case "instagram_oauth_failed":
          errorTitle = "Error de autenticación de Instagram";
          errorMessage = "Error al autenticar con Instagram. Intenta de nuevo.";
          break;
        case "no_waba_found":
          errorTitle = "Cuenta de WhatsApp Business no encontrada";
          errorMessage = "No se encontró una cuenta de WhatsApp Business asociada. Asegúrate de tener una cuenta de WhatsApp Business configurada en Meta Business Manager.";
          break;
        case "no_instagram_account":
          errorTitle = "Cuenta de Instagram Business no encontrada";
          errorMessage = "No se encontró una cuenta de Instagram Business asociada. Asegúrate de tener una cuenta de Instagram Business conectada a una página de Facebook.";
          break;
        case "no_phone_number":
          errorTitle = "Número de teléfono no encontrado";
          errorMessage = "No se encontró un número de teléfono asociado a tu cuenta de WhatsApp Business.";
          break;
        case "oauth_denied":
        case "instagram_oauth_denied":
          errorTitle = "Autorización denegada";
          errorMessage = "Has denegado los permisos necesarios. Intenta de nuevo y acepta todos los permisos.";
          break;
        case "missing_code":
        case "instagram_missing_code":
          errorTitle = "Código de autorización faltante";
          errorMessage = "Error en el proceso de autorización. Intenta de nuevo.";
          break;
        case "invalid_state":
        case "instagram_invalid_state":
          errorTitle = "Estado de autorización inválido";
          errorMessage = "Error en el proceso de autorización. Intenta de nuevo.";
          break;
        case "instagram_invalid_request":
          errorTitle = "Solicitud inválida";
          errorMessage = "Los parámetros de la solicitud son inválidos. Verifica la configuración de la app de Meta.";
          break;
        case "instagram_unauthorized":
          errorTitle = "No autorizado";
          errorMessage = "Las credenciales de la app de Meta son inválidas. Verifica META_APP_ID y META_APP_SECRET.";
          break;
        case "instagram_invalid_token":
          errorTitle = "Token inválido";
          errorMessage = "El token de acceso es inválido o ha expirado. Intenta conectar de nuevo.";
          break;
        default:
          errorTitle = "Error desconocido";
          errorMessage = `Error: ${error}. Revisa los logs del servidor para más detalles.`;
          break;
      }
      
      showError(errorTitle, errorMessage);
      setError(errorMessage);
    }
  }, [searchParams, showSuccess, showError, refreshIntegrations]);


  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Integraciones</h1>
      </div>
      
      {/* Banner del período de prueba gratuito */}
      <FreeTrialBanner />

      {/* Información específica para período de prueba gratuito */}
      {subscription?.freeTrial?.isActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Integraciones Disponibles en Período de Prueba
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Durante tu período de prueba gratuito de 24 horas, solo puedes conectar:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><strong>WhatsApp Business</strong> - Para gestionar mensajes de WhatsApp</li>
                  <li><strong>Instagram Business</strong> - Para gestionar mensajes directos de Instagram</li>
                </ul>
                <p className="mt-2">
                  <a href="/pricing" className="font-medium underline hover:no-underline">
                    Suscríbete para acceder a todas las integraciones
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado pendiente de método de pago - SOLO si realmente está pendiente */}
      {status.pendingPaymentMethod && !status.trialActive && !status.active && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-yellow-400 font-medium">Método de Pago Pendiente</p>
              </div>
              <p className="text-yellow-300 text-sm">
                Completa tu método de pago para comenzar tu prueba gratuita de 7 días
              </p>
            </div>
            <button
              onClick={() => createPaymentLink()}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Completar Pago
            </button>
          </div>
        </div>
      )}

      {/* Información del plan actual */}
      {subscription?.subscription && (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">
                Plan actual: {subscription.subscription.planType === 'basic' ? 'Basic' : 'Premium'}
              </p>
              <p className="text-neutral-400 text-sm">
                Integraciones disponibles: {getMaxIntegrations() === 999 ? 'Todas disponibles' : `Hasta ${getMaxIntegrations()}`}
                {/* Debug: {JSON.stringify({maxIntegrations: getMaxIntegrations(), isTrialActive: status.trialActive, isActive: status.active, planType: subscription.subscription.planType})} */}
              </p>
            </div>
            {status.pendingPaymentMethod && !status.trialActive && !status.active && (
              <button
                onClick={() => createPaymentLink()}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
Completar Pago
              </button>
            )}
            {!status.active && !status.trialActive && !status.pendingPaymentMethod && (
              <button
                onClick={() => window.location.href = '/pricing'}
                className="bg-nexly-teal hover:bg-nexly-green text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Actualizar Plan
              </button>
            )}
          </div>
        </div>
      )}
      
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Integraciones conectadas */}
      {connectedIntegrations && connectedIntegrations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Integraciones Conectadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedIntegrations.map((integration: any) => (
              <div key={integration._id} className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      integration.provider === 'whatsapp' ? 'bg-green-500' : 
                      integration.provider === 'instagram' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 
                      'bg-blue-500'
                    }`}>
                      <span className="text-white text-sm font-bold">
                        {integration.provider === 'whatsapp' ? 'W' : 
                         integration.provider === 'instagram' ? 'I' : 
                         integration.provider.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{integration.name}</h3>
                      <p className="text-neutral-400 text-sm capitalize">{integration.provider}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      integration.status === 'linked' ? 'bg-green-900 text-green-300' :
                      integration.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {integration.status === 'linked' ? 'Conectado' : 
                       integration.status === 'pending' ? 'Pendiente' : 
                       'Error'}
                    </span>
                  </div>
                </div>
                {integration.status === 'pending' && (
                  <p className="text-neutral-400 text-sm">
                    La integración está siendo configurada. Esto puede tomar unos minutos.
                  </p>
                )}
                {integration.status === 'error' && (
                  <p className="text-red-400 text-sm">
                    Error al conectar. Intenta reconectar la integración.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integraciones disponibles */}
      <h2 className="text-xl font-semibold text-white mb-4">
        {connectedIntegrations && connectedIntegrations.length > 0 ? 'Conectar Más Integraciones' : 'Integraciones Disponibles'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className={`w-8 h-8 ${integration.color} rounded-full flex items-center justify-center mr-3`}>
                <span className="text-white text-sm font-bold">
                  {integration.label.charAt(0)}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-black">{integration.label}</h2>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              {integration.description}
            </p>
            <button 
              className={getButtonStyle(integration.id)}
              onClick={() => handleIntegrationClick(integration.id)}
              disabled={!isIntegrationAvailable(integration.id)}
            >
              {getButtonText(integration.id)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-6"><h1 className="text-2xl font-bold mb-6">Integraciones</h1><div>Loading...</div></div>}>
      <IntegrationsContent />
    </Suspense>
  );
}