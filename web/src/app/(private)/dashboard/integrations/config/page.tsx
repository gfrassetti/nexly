"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationHelpers } from "@/hooks/useNotification";

interface MetaConfig {
  environment: {
    metaAppId: boolean;
    metaAppSecret: boolean;
    metaAccessToken: boolean;
    metaPhoneNumberId: boolean;
    metaWabaId: boolean;
    webhookVerifyToken: boolean;
    apiUrl: boolean;
  };
  webhook: {
    url: string;
    token: string;
  };
  metaApi: {
    connected: boolean;
    phoneNumber: string | null;
    verifiedName: string | null;
    error: string | null;
  };
}

export default function MetaConfigPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationHelpers();
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [webhookTest, setWebhookTest] = useState<any>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/integrations/verify-meta-config', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
          
          // También obtener información del webhook
          const webhookResponse = await fetch('/api/webhook/test');
          if (webhookResponse.ok) {
            const webhookData = await webhookResponse.json();
            setWebhookTest(webhookData);
          }
        } else {
          showError("Error", "No se pudo verificar la configuración");
        }
      } catch (error) {
        showError("Error", "Error al verificar la configuración");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchConfig();
    }
  }, [user, showError]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copiado", `${label} copiado al portapapeles`);
  };

  const testWebhook = async () => {
    if (!webhookTest) return;
    
    try {
      setTestResult("Probando...");
      const response = await fetch(webhookTest.testUrl);
      const result = await response.text();
      
      if (response.ok && result.includes("test_challenge")) {
        setTestResult(`✅ Éxito: ${result}`);
        showSuccess("Éxito", "El webhook está funcionando correctamente");
      } else {
        setTestResult(`❌ Error: ${result}`);
        showError("Error", "El webhook no está funcionando correctamente");
      }
    } catch (error) {
      setTestResult(`❌ Error de conexión: ${error}`);
      showError("Error", "Error de conexión al probar el webhook");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexly-green"></div>
        <span className="ml-2 text-gray-600">Verificando configuración...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error al cargar la configuración</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración de Meta WhatsApp</h1>
          <p className="text-gray-600">Información necesaria para configurar tu app en Meta Developer Console</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuración de Webhook */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🔗 Configuración de Webhook</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de devolución de llamada (Callback URL)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={config.webhook.url}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(config.webhook.url, "URL del webhook")}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token de verificación
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={config.webhook.token}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(config.webhook.token, "Token de verificación")}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Este debe ser exactamente el mismo valor que tienes en Railway como WEBHOOK_VERIFY_TOKEN
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {/* Botón de prueba del webhook */}
              {webhookTest && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">🧪 Prueba del Webhook</h3>
                  <button
                    onClick={testWebhook}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    Probar Webhook
                  </button>
                  {testResult && (
                    <div className="mt-2 p-2 bg-gray-50 rounded border">
                      <p className="text-sm font-mono">{testResult}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">📋 Instrucciones:</h3>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Ve a <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline">Meta for Developers</a></li>
                  <li>2. Selecciona tu app de WhatsApp Business</li>
                  <li>3. Ve a <strong>WhatsApp → Configuración</strong></li>
                  <li>4. En la sección <strong>Webhook</strong>:</li>
                  <li>   • Pega la URL de devolución de llamada</li>
                  <li>   • Pega el token de verificación</li>
                  <li>5. Haz clic en <strong>"Verificar y guardar"</strong></li>
                </ol>
              </div>
            </div>
          </div>

          {/* Estado de la Configuración */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ Estado de la Configuración</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">META_APP_ID</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${config.environment.metaAppId ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {config.environment.metaAppId ? '✅ Configurado' : '❌ Faltante'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">META_APP_SECRET</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${config.environment.metaAppSecret ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {config.environment.metaAppSecret ? '✅ Configurado' : '❌ Faltante'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">META_ACCESS_TOKEN</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${config.environment.metaAccessToken ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {config.environment.metaAccessToken ? '✅ Configurado' : '❌ Faltante'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">META_PHONE_NUMBER_ID</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${config.environment.metaPhoneNumberId ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {config.environment.metaPhoneNumberId ? '✅ Configurado' : '❌ Faltante'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">META_WABA_ID</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${config.environment.metaWabaId ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {config.environment.metaWabaId ? '✅ Configurado' : '❌ Faltante'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">WEBHOOK_VERIFY_TOKEN</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${config.environment.webhookVerifyToken ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {config.environment.webhookVerifyToken ? '✅ Configurado' : '❌ Faltante'}
                </span>
              </div>
            </div>
          </div>

          {/* Estado de Conexión con Meta API */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🌐 Conexión con Meta API</h2>
            
            {config.metaApi.connected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Estado</span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                    ✅ Conectado
                  </span>
                </div>
                
                {config.metaApi.phoneNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Número</span>
                    <span className="text-sm text-gray-900">{config.metaApi.phoneNumber}</span>
                  </div>
                )}
                
                {config.metaApi.verifiedName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Nombre Verificado</span>
                    <span className="text-sm text-gray-900">{config.metaApi.verifiedName}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                  ❌ No conectado
                </span>
                {config.metaApi.error && (
                  <p className="text-sm text-red-600 mt-2">{config.metaApi.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Información Adicional */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
            <h3 className="font-semibold text-green-900 mb-2">💡 Información Importante</h3>
            <ul className="text-sm text-green-800 space-y-2">
              <li>• El webhook debe ser HTTPS en producción</li>
              <li>• El token de verificación debe coincidir exactamente</li>
              <li>• Los permisos deben estar aprobados por Meta</li>
              <li>• El número debe estar verificado para producción</li>
              <li>• Usa el número de prueba para desarrollo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
