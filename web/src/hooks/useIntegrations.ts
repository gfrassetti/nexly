"use client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { INTEGRATIONS, type Integration } from "@/lib/constants";

interface UseIntegrationsReturn {
  integrations: readonly Integration[];
  isIntegrationAvailable: (integrationName: string) => boolean;
  getButtonText: (integrationName: string) => string;
  getButtonStyle: (integrationName: string) => string;
  handleIntegrationClick: (integrationName: string) => void;
}

export function useIntegrations(): UseIntegrationsReturn {
  const { getMaxIntegrations, status } = useSubscription();

  const isIntegrationAvailable = (integrationName: string): boolean => {
    // Si está pendiente de método de pago, no puede usar integraciones
    if (status.pendingPaymentMethod) return false;
    
    const maxIntegrations = getMaxIntegrations();
    
    // WhatsApp siempre está disponible (primera integración)
    if (integrationName === 'whatsapp') return true;
    
    // Durante trial activo, todo disponible
    if (status.trialActive) return true;
    
    // Si está activo (no trial), también todo disponible
    if (status.active) return true;
    
    // Para premium, todo disponible
    if (maxIntegrations >= 999) return true;
    
    // Para plan básico (maxIntegrations = 2), solo permitir WhatsApp + 1 más
    // Nota: En una implementación real, aquí deberías contar las integraciones ya conectadas
    // Por simplicidad, asumimos que el usuario puede conectar hasta el límite
    return maxIntegrations > 1; // Si tiene más de 1 integración permitida
  };

  const getButtonText = (integrationName: string): string => {
    if (integrationName === 'whatsapp') return 'Conectar WhatsApp';
    if (isIntegrationAvailable(integrationName)) return 'Conectar';
    return 'Upgrade para habilitar';
  };

  const getButtonStyle = (integrationName: string): string => {
    if (integrationName === 'whatsapp') return 'w-full bg-nexly-teal text-white px-4 py-2 rounded hover:bg-nexly-green transition-colors duration-200';
    if (isIntegrationAvailable(integrationName)) return 'w-full bg-nexly-azul text-white px-4 py-2 rounded hover:bg-nexly-light-blue transition-colors duration-200';
    return 'w-full bg-neutral-600 text-neutral-400 px-4 py-2 rounded cursor-not-allowed transition-colors duration-200';
  };

  const handleIntegrationClick = (integrationName: string) => {
    if (integrationName === 'whatsapp') {
      window.location.href = '/dashboard/integrations/connect/whatsapp';
    } else if (integrationName === 'instagram') {
      window.location.href = '/dashboard/integrations/connect/instagram';
    } else if (isIntegrationAvailable(integrationName)) {
      // Aquí iría la lógica para conectar otras plataformas
      alert(`${integrationName} aún no está implementado`);
    } else {
      // Redirigir a pricing
      window.location.href = '/pricing';
    }
  };

  return {
    integrations: INTEGRATIONS,
    isIntegrationAvailable,
    getButtonText,
    getButtonStyle,
    handleIntegrationClick,
  };
}
