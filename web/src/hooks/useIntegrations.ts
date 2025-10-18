"use client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { INTEGRATIONS, type Integration } from "@/lib/constants";
import { showToast } from "./use-toast";

interface ConnectedIntegration {
  provider: string;
  status: string;
  _id: string;
}

interface UseIntegrationsReturn {
  integrations: readonly Integration[];
  isIntegrationAvailable: (integrationName: string) => boolean;
  isIntegrationConnected: (integrationName: string) => boolean;
  getButtonText: (integrationName: string, connectedIntegrations?: ConnectedIntegration[]) => string;
  getButtonStyle: (integrationName: string) => string;
  handleIntegrationClick: (integrationName: string) => void;
  handleDisconnect: (integrationName: string, integrationId: string) => Promise<void>;
}

export function useIntegrations(): UseIntegrationsReturn {
  const { getMaxIntegrations, status } = useSubscription();

  const isIntegrationAvailable = (integrationName: string): boolean => {
    // Si está pendiente de método de pago, no puede usar integraciones
    if (status.pendingPaymentMethod) return false;
    
    const maxIntegrations = getMaxIntegrations();
    
    // WhatsApp siempre está disponible (primera integración)
    if (integrationName === 'whatsapp') return true;
    
    
    // Instagram está disponible en trial y planes activos
    if (integrationName === 'instagram') {
      return status.trialActive || status.active || maxIntegrations >= 999;
    }
    
    // Telegram está disponible en trial y planes activos
    if (integrationName === 'telegram') {
      return status.trialActive || status.active || maxIntegrations >= 999;
    }
    
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

  const isIntegrationConnected = (integrationName: string): boolean => {
    // Esta función se sobrescribirá en el componente con los datos reales
    return false;
  };

  const getButtonText = (
    integrationName: string,
    connectedIntegrations?: ConnectedIntegration[]
  ): string => {
    // 1. Determinar si YA está conectada
    const isConnected = connectedIntegrations?.some(
      (int) => int.provider === integrationName && (int.status === 'linked' || int.status === 'active')
    );

    if (isConnected) {
      // Si está conectada, el texto debe ser 'Desconectar'
      return 'Desconectar';
    }

    // 2. Si no está conectada, determinar si está disponible para conectar
    if (integrationName === 'whatsapp') return 'Conectar WhatsApp';
    if (isIntegrationAvailable(integrationName)) return 'Conectar';
    
    // 3. Si no está disponible, ofrecer el Upgrade
    return 'Upgrade para habilitar';
  };

  const getButtonStyle = (integrationName: string): string => {
    if (integrationName === 'whatsapp') return 'w-full bg-nexly-teal text-accent-cream px-4 py-2 rounded hover:bg-nexly-green transition-colors duration-200';
    if (isIntegrationAvailable(integrationName)) return 'w-full bg-nexly-azul text-accent-cream px-4 py-2 rounded hover:bg-nexly-light-blue transition-colors duration-200';
    return 'w-full bg-neutral-600 text-neutral-400 px-4 py-2 rounded cursor-not-allowed transition-colors duration-200';
  };

  const handleIntegrationClick = (integrationName: string) => {
    // ⚠️ Esta función es exclusiva para CONECTAR
    // El botón de Desconectar usa handleDisconnect directamente
    
    // Si no está conectada, proceder con la conexión
    if (integrationName === 'whatsapp') {
      window.location.href = '/dashboard/integrations/connect/whatsapp';
    } else if (integrationName === 'instagram') {
      window.location.href = '/dashboard/integrations/connect/instagram';
    } else if (integrationName === 'telegram') {
      window.location.href = '/dashboard/integrations/connect/telegram';
    } else if (isIntegrationAvailable(integrationName)) {
      // Aquí iría la lógica para conectar otras plataformas
      showToast.error(`${integrationName} aún no está implementado`);
    } else {
      // Redirigir a pricing
      window.location.href = '/pricing';
    }
  };

  const handleDisconnect = async (integrationName: string, integrationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast.error('No se encontró el token de autenticación');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      // Determinar qué endpoint usar según la integración
      let endpoint = '';
      if (integrationName === 'telegram') {
        endpoint = '/telegram/disconnect';
      } else {
        endpoint = `/integrations/${integrationId}`;
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: integrationName === 'telegram' ? 'POST' : 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al desconectar la integración');
      }

      showToast.success(`${integrationName} desconectado exitosamente`);
      
      // Recargar la página después de un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error desconectando integración:', error);
      showToast.error(`Error al desconectar ${integrationName}`);
    }
  };

  return {
    integrations: INTEGRATIONS,
    isIntegrationAvailable,
    isIntegrationConnected,
    getButtonText,
    getButtonStyle,
    handleIntegrationClick,
    handleDisconnect,
  };
}
