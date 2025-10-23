"use client";
import { useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { INTEGRATIONS, type Integration } from "@/lib/constants";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConnectedIntegration {
  provider: string;
  status: string;
  _id: string;
}

interface UseIntegrationsReturn {
  integrations: readonly Integration[];
  isIntegrationAvailable: (integrationName: string, connectedIntegrations?: ConnectedIntegration[]) => boolean;
  isIntegrationConnected: (integrationName: string) => boolean;
  getButtonText: (integrationName: string, connectedIntegrations?: ConnectedIntegration[]) => string;
  getButtonStyle: (integrationName: string, connectedIntegrations?: ConnectedIntegration[]) => string;
  handleIntegrationClick: (integrationName: string) => void;
  handleDisconnect: (integrationName: string, integrationId: string) => Promise<void>;
  showDisconnectDialog: (integrationName: string, integrationId: string) => void;
  disconnectDialog: {
    isOpen: boolean;
    integrationName: string;
    integrationId: string;
  };
  DisconnectDialog: () => JSX.Element;
}

export function useIntegrations(): UseIntegrationsReturn {
  const { getMaxIntegrations, status } = useSubscription();
  
  const [disconnectDialog, setDisconnectDialog] = useState({
    isOpen: false,
    integrationName: '',
    integrationId: ''
  });

  const isIntegrationAvailable = (
    integrationName: string, 
    connectedIntegrations?: ConnectedIntegration[]
  ): boolean => {
    // Si está pendiente de método de pago, no puede usar integraciones
    if (status.pendingPaymentMethod) return false;
    
    const maxIntegrations = getMaxIntegrations();
    
    // Contar integraciones actualmente conectadas
    const connectedCount = connectedIntegrations?.filter(
      int => int.status === 'linked' || int.status === 'active'
    ).length || 0;
    
    // Si esta integración ya está conectada, está "disponible" (para poder desconectar)
    const isThisConnected = connectedIntegrations?.some(
      int => int.provider === integrationName && (int.status === 'linked' || int.status === 'active')
    );
    
    if (isThisConnected) return true;
    
    // Si ya alcanzó el límite de integraciones, no puede conectar más
    if (connectedCount >= maxIntegrations) return false;
    
    // Durante trial activo, todo disponible (hasta el límite)
    if (status.trialActive) return true;
    
    // Si está activo (no trial), también todo disponible (hasta el límite)
    if (status.active) return true;
    
    // Sin suscripción activa, no puede conectar
    return false;
  };

  const isIntegrationConnected = (/* integrationName: string */): boolean => {
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

  const getButtonStyle = (integrationName: string, connectedIntegrations?: ConnectedIntegration[]): string => {
    if (integrationName === 'whatsapp') return 'w-full bg-nexly-teal text-accent-cream px-4 py-2 rounded hover:bg-nexly-green transition-colors duration-200';
    if (isIntegrationAvailable(integrationName, connectedIntegrations)) return 'w-full bg-nexly-azul text-accent-cream px-4 py-2 rounded hover:bg-nexly-light-blue transition-colors duration-200';
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
    // Discord removido - no es posible acceder a conversaciones del usuario
    } else if (isIntegrationAvailable(integrationName)) {
      // Aquí iría la lógica para conectar otras plataformas
      toast.error(`${integrationName} aún no está implementado`);
    } else {
      // Redirigir a pricing
      window.location.href = '/pricing';
    }
  };

  const showDisconnectDialog = (integrationName: string, integrationId: string) => {
    setDisconnectDialog({
      isOpen: true,
      integrationName,
      integrationId
    });
  };

  const handleDisconnect = async (integrationName: string, integrationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('No se encontró el token de autenticación');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      // Determinar qué endpoint usar según la integración
      let endpoint = '';
      if (integrationName === 'telegram') {
        endpoint = '/telegram/disconnect';
      // Discord removido - no es posible acceder a conversaciones del usuario
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

      toast.success(`${integrationName} desconectado exitosamente`);
      
      // Cerrar el diálogo
      setDisconnectDialog({
        isOpen: false,
        integrationName: '',
        integrationId: ''
      });
      
      // Recargar la página después de un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error desconectando integración:', error);
      toast.error(`Error al desconectar ${integrationName}`);
    }
  };

  const DisconnectDialog = () => (
    <AlertDialog open={disconnectDialog.isOpen} onOpenChange={() => setDisconnectDialog({ isOpen: false, integrationName: '', integrationId: '' })}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desconectar {disconnectDialog.integrationName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción desconectará permanentemente tu cuenta de {disconnectDialog.integrationName} de Nexly.
            Podrás volver a conectarla en cualquier momento, pero perderás el acceso a los mensajes
            y configuraciones actuales.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDisconnectDialog({ isOpen: false, integrationName: '', integrationId: '' })}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => handleDisconnect(disconnectDialog.integrationName, disconnectDialog.integrationId)} 
            className="bg-red-600 hover:bg-red-700"
          >
            Desconectar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    integrations: INTEGRATIONS,
    isIntegrationAvailable,
    isIntegrationConnected,
    getButtonText,
    getButtonStyle,
    handleIntegrationClick,
    handleDisconnect,
    showDisconnectDialog,
    disconnectDialog,
    DisconnectDialog,
  };
}
