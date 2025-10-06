"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePaymentLink } from "@/hooks/usePaymentLink";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useNotificationHelpers } from "@/hooks/useNotification";
import { useDataRefresh } from "@/hooks/useDataRefresh";
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
  const { refreshAll } = useDataRefresh();
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
      // Refrescar todos los datos
      refreshAll();
    } else if (success === "instagram_connected") {
      showSuccess("¡Instagram conectado!", "Instagram se ha conectado exitosamente");
      setMessage("¡Instagram conectado exitosamente!");
      // Refrescar todos los datos
      refreshAll();
    } else if (success === "telegram_connected") {
      showSuccess("¡Telegram conectado!", "Telegram se ha conectado exitosamente");
      setMessage("¡Telegram conectado exitosamente!");
      // Refrescar todos los datos
      refreshAll();
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
        case "telegram_connection_failed":
          errorTitle = "Error de conexión de Telegram";
          errorMessage = "Error al conectar con Telegram. Intenta de nuevo.";
          break;
        case "telegram_missing_parameters":
          errorTitle = "Parámetros faltantes";
          errorMessage = "Faltan parámetros requeridos para la conexión con Telegram.";
          break;
        case "telegram_bot_not_configured":
          errorTitle = "Bot no configurado";
          errorMessage = "El bot de Telegram no está configurado correctamente.";
          break;
        case "telegram_invalid_signature":
          errorTitle = "Firma inválida";
          errorMessage = "La firma de autenticación de Telegram es inválida.";
          break;
        case "telegram_missing_state":
          errorTitle = "Estado faltante";
          errorMessage = "Falta el estado de autorización para Telegram.";
          break;
        case "telegram_invalid_user_id":
          errorTitle = "ID de usuario inválido";
          errorMessage = "El ID de usuario de Telegram es inválido.";
          break;
        case "telegram_user_not_found":
          errorTitle = "Usuario no encontrado";
          errorMessage = "No se encontró el usuario en la base de datos.";
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
    <div className="p-6 text-foreground" style={{ background: 'var(--background-gradient)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect your messaging platforms
          </p>
        </div>
      </div>
      
      {/* Banner del período de prueba gratuito */}
      <FreeTrialBanner />

      {/* Trial period info */}
      {subscription?.freeTrial?.isActive && (
        <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-accent-blue rounded-full mt-2"></div>
            <div>
              <h3 className="text-sm font-medium text-foreground">
                Available During Trial Period
              </h3>
              <div className="mt-2 text-xs text-muted-foreground">
                <p>During your free trial, you can connect:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><strong>WhatsApp Business</strong> - Manage WhatsApp messages</li>
                  <li><strong>Instagram Business</strong> - Manage Instagram DMs</li>
                  <li><strong>Telegram</strong> - Manage Telegram bots and messages</li>
                </ul>
                <p className="mt-2">
                  <a href="/pricing" className="font-medium text-accent-blue hover:underline">
                    Subscribe to access all integrations
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Payment Method */}
      {status.pendingPaymentMethod && !status.trialActive && !status.active && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <div>
                <p className="text-warning font-medium text-sm">Payment Method Pending</p>
                <p className="text-muted-foreground text-xs">
                  Complete your payment method to start your 7-day free trial
                </p>
              </div>
            </div>
            <button
              onClick={() => createPaymentLink()}
              className="bg-warning/20 border border-warning/30 text-warning px-3 py-2 rounded-md text-xs font-medium hover:bg-warning/30 transition-colors"
            >
              Complete Payment
            </button>
          </div>
        </div>
      )}

      {/* Current Plan Info */}
      {subscription?.subscription && (
        <div className="bg-muted/30 border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium text-sm">
                Current plan: {subscription.subscription.planType === 'basic' ? 'Basic' : 'Premium'}
              </p>
              <p className="text-muted-foreground text-xs">
                Available integrations: {getMaxIntegrations() === 999 ? 'All available' : `Up to ${getMaxIntegrations()}`}
              </p>
            </div>
            {status.pendingPaymentMethod && !status.trialActive && !status.active && (
              <button
                onClick={() => createPaymentLink()}
                className="bg-warning/20 border border-warning/30 text-warning px-3 py-2 rounded-md text-xs font-medium hover:bg-warning/30 transition-colors"
              >
                Complete Payment
              </button>
            )}
            {!status.active && !status.trialActive && !status.pendingPaymentMethod && (
              <button
                onClick={() => window.location.href = '/pricing'}
                className="bg-accent-blue/20 border border-accent-blue/30 text-accent-blue px-3 py-2 rounded-md text-xs font-medium hover:bg-accent-blue/30 transition-colors"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        </div>
      )}
      
      {message && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4 flex items-center space-x-3">
          <div className="w-2 h-2 bg-success rounded-full"></div>
          <p className="text-sm text-foreground">{message}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4 flex items-center space-x-3">
          <div className="w-2 h-2 bg-destructive rounded-full"></div>
          <p className="text-sm text-foreground">{error}</p>
        </div>
      )}

      {/* Connected Integrations */}
      {connectedIntegrations && connectedIntegrations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-foreground mb-4">Connected Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedIntegrations.map((integration: any) => (
              <div key={integration._id} className="bg-muted/50 border border-border rounded-lg p-4 hover:bg-muted/80 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-3 ${
                      integration.provider === 'whatsapp' ? 'bg-accent-green/20' : 
                      integration.provider === 'instagram' ? 'bg-accent-blue/20' : 
                      integration.provider === 'telegram' ? 'bg-blue-400/20' : 
                      'bg-accent-blue/20'
                    }`}>
                      <span className={`text-sm font-medium ${
                        integration.provider === 'whatsapp' ? 'text-accent-green' : 
                        integration.provider === 'instagram' ? 'text-accent-blue' : 
                        integration.provider === 'telegram' ? 'text-blue-400' : 
                        'text-accent-blue'
                      }`}>
                        {integration.provider === 'whatsapp' ? 'W' : 
                         integration.provider === 'instagram' ? 'I' : 
                         integration.provider === 'telegram' ? 'T' : 
                         integration.provider.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-foreground font-medium text-sm">{integration.name}</h3>
                      <p className="text-muted-foreground text-xs capitalize">{integration.provider}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      integration.status === 'linked' ? 'bg-success/20 text-success' :
                      integration.status === 'pending' ? 'bg-warning/20 text-warning' :
                      'bg-destructive/20 text-destructive'
                    }`}>
                      {integration.status === 'linked' ? 'Connected' : 
                       integration.status === 'pending' ? 'Pending' : 
                       'Error'}
                    </span>
                  </div>
                </div>
                {integration.status === 'pending' && (
                  <p className="text-muted-foreground text-xs">
                    Integration is being configured. This may take a few minutes.
                  </p>
                )}
                {integration.status === 'error' && (
                  <p className="text-destructive text-xs">
                    Connection error. Try reconnecting the integration.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <h2 className="text-sm font-medium text-foreground mb-4">
        {connectedIntegrations && connectedIntegrations.length > 0 ? 'Connect More Integrations' : 'Available Integrations'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-muted/30 border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <div className="flex items-center mb-4">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-3 ${
                integration.id === 'whatsapp' ? 'bg-accent-green/20' :
                integration.id === 'instagram' ? 'bg-accent-blue/20' :
                integration.id === 'telegram' ? 'bg-blue-400/20' :
                'bg-accent-blue/20'
              }`}>
                <span className={`text-sm font-medium ${
                  integration.id === 'whatsapp' ? 'text-accent-green' :
                  integration.id === 'instagram' ? 'text-accent-blue' :
                  integration.id === 'telegram' ? 'text-blue-400' :
                  'text-accent-blue'
                }`}>
                  {integration.label.charAt(0)}
                </span>
              </div>
              <h2 className="text-sm font-medium text-foreground">{integration.label}</h2>
            </div>
            <p className="text-muted-foreground mb-4 text-xs">
              {integration.description}
            </p>
            <button 
              className={`w-full px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                !isIntegrationAvailable(integration.id) 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : getButtonText(integration.id).includes('Connect') || getButtonText(integration.id).includes('Conectar')
                    ? 'bg-accent-green/10 border border-accent-green/20 text-accent-green hover:bg-accent-green/20'
                    : 'bg-muted text-muted-foreground'
              }`}
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