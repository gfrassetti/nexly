"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/contexts/SubscriptionContext";

function IntegrationsContent() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const { subscription, getMaxIntegrations, isTrialActive, isActive, isPendingPaymentMethod } = useSubscription();

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
    // Si está pendiente de método de pago, no puede usar integraciones
    if (isPendingPaymentMethod()) return false;
    
    const maxIntegrations = getMaxIntegrations();
    
    // WhatsApp siempre está disponible (primera integración)
    if (integrationName === 'whatsapp') return true;
    
    // Durante trial, todo disponible
    if (isTrialActive()) return true;
    
    // Para premium, todo disponible
    if (maxIntegrations >= 999) return true;
    
    // Para plan básico (maxIntegrations = 2), solo permitir WhatsApp + 1 más
    // Nota: En una implementación real, aquí deberías contar las integraciones ya conectadas
    // Por simplicidad, asumimos que el usuario puede conectar hasta el límite
    return maxIntegrations > 1; // Si tiene más de 1 integración permitida
  };

  // Función para obtener el texto del botón
  const getButtonText = (integrationName: string): string => {
    if (integrationName === 'whatsapp') return 'Conectar WhatsApp';
    if (isIntegrationAvailable(integrationName)) return 'Conectar';
    return 'Upgrade para habilitar';
  };

  // Función para obtener el estilo del botón
  const getButtonStyle = (integrationName: string): string => {
    if (integrationName === 'whatsapp') return 'w-full bg-nexly-teal text-white px-4 py-2 rounded hover:bg-nexly-green transition-colors duration-200';
    if (isIntegrationAvailable(integrationName)) return 'w-full bg-nexly-azul text-white px-4 py-2 rounded hover:bg-nexly-light-blue transition-colors duration-200';
    return 'w-full bg-neutral-600 text-neutral-400 px-4 py-2 rounded cursor-not-allowed transition-colors duration-200';
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
      
      {/* Estado pendiente de método de pago */}
      {isPendingPaymentMethod() && (
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
            <a
              href="/checkout"
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Completar Pago
            </a>
          </div>
        </div>
      )}

      {/* Información del plan actual */}
      {subscription?.subscription && (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">
                Plan actual: {subscription.subscription.planType === 'basic' ? 'Básico' : 'Premium'}
              </p>
              <p className="text-neutral-400 text-sm">
                Integraciones disponibles: {getMaxIntegrations() === 999 ? 'Todas disponibles' : `Hasta ${getMaxIntegrations()}`}
              </p>
            </div>
            {isPendingPaymentMethod() && (
              <button
                onClick={() => window.location.href = '/checkout'}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Completar Pago
              </button>
            )}
            {!isActive() && !isTrialActive() && !isPendingPaymentMethod() && (
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