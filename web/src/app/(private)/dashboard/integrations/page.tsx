"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/contexts/SubscriptionContext";

function IntegrationsContent() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const { subscription, getMaxIntegrations, isTrialActive, isActive } = useSubscription();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "whatsapp_connected") {
      setMessage("¡WhatsApp conectado exitosamente!");
    } else if (error === "oauth_failed") {
      setError("Error al conectar WhatsApp. Intenta de nuevo.");
    }
  }, [searchParams]);

  // Función para determinar si una integración está disponible
  const isIntegrationAvailable = (integrationName: string): boolean => {
    const maxIntegrations = getMaxIntegrations();
    
    // WhatsApp siempre está disponible
    if (integrationName === 'whatsapp') return true;
    
    // Para otras integraciones, verificar límite
    if (isTrialActive()) return true; // Durante trial, todo disponible
    
    return maxIntegrations >= 999; // Solo premium tiene acceso ilimitado
  };

  // Función para obtener el texto del botón
  const getButtonText = (integrationName: string): string => {
    if (integrationName === 'whatsapp') return 'Conectar WhatsApp';
    if (isIntegrationAvailable(integrationName)) return 'Conectar';
    return 'Upgrade para habilitar';
  };

  // Función para obtener el estilo del botón
  const getButtonStyle = (integrationName: string): string => {
    if (integrationName === 'whatsapp') return 'w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors';
    if (isIntegrationAvailable(integrationName)) return 'w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors';
    return 'w-full bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed';
  };

  // Función para manejar el click del botón
  const handleButtonClick = (integrationName: string) => {
    if (integrationName === 'whatsapp') {
      window.location.href = '/dashboard/integrations/connect/whatsapp';
    } else if (isIntegrationAvailable(integrationName)) {
      // Aquí iría la lógica para conectar otras plataformas
      setError(`${integrationName} aún no está implementado`);
    } else {
      // Redirigir a pricing
      window.location.href = '/pricing';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Integraciones</h1>
      
      {/* Información del plan actual */}
      {subscription?.subscription && (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">
                Plan actual: {subscription.subscription.planType === 'basic' ? 'Básico' : 'Premium'}
              </p>
              <p className="text-neutral-400 text-sm">
                Integraciones disponibles: {getMaxIntegrations() === 999 ? 'Ilimitadas' : `${getMaxIntegrations()}`}
              </p>
            </div>
            {!isActive() && !isTrialActive() && (
              <button
                onClick={() => window.location.href = '/pricing'}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* WhatsApp Business */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">W</span>
            </div>
            <h2 className="text-lg font-semibold text-black">WhatsApp Business</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta tu cuenta de WhatsApp Business para enviar y recibir mensajes.
          </p>
          <button 
            className={getButtonStyle('whatsapp')}
            onClick={() => handleButtonClick('whatsapp')}
          >
            {getButtonText('whatsapp')}
          </button>
        </div>

        {/* Instagram */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">I</span>
            </div>
            <h2 className="text-lg font-semibold text-black">Instagram</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta tu cuenta de Instagram para gestionar mensajes directos.
          </p>
          <button 
            className={getButtonStyle('instagram')}
            onClick={() => handleButtonClick('instagram')}
            disabled={!isIntegrationAvailable('instagram')}
          >
            {getButtonText('instagram')}
          </button>
        </div>

        {/* Facebook Messenger */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <h2 className="text-lg font-semibold text-black">Facebook Messenger</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta Facebook Messenger para gestionar conversaciones.
          </p>
          <button 
            className={getButtonStyle('messenger')}
            onClick={() => handleButtonClick('messenger')}
            disabled={!isIntegrationAvailable('messenger')}
          >
            {getButtonText('messenger')}
          </button>
        </div>

        {/* TikTok */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <h2 className="text-lg font-semibold text-black">TikTok</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta TikTok para gestionar mensajes y comentarios.
          </p>
          <button 
            className={getButtonStyle('tiktok')}
            onClick={() => handleButtonClick('tiktok')}
            disabled={!isIntegrationAvailable('tiktok')}
          >
            {getButtonText('tiktok')}
          </button>
        </div>

        {/* Telegram */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <h2 className="text-lg font-semibold text-black">Telegram</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta Telegram para gestionar bots y mensajes.
          </p>
          <button 
            className={getButtonStyle('telegram')}
            onClick={() => handleButtonClick('telegram')}
            disabled={!isIntegrationAvailable('telegram')}
          >
            {getButtonText('telegram')}
          </button>
        </div>

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