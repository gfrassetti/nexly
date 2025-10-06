'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TelegramConnect from '@/components/TelegramConnect';
// Removed UI component imports - using standard HTML elements
import { ArrowLeft, Loader2 } from 'lucide-react';
import { showToast } from '@/hooks/use-toast';

function TelegramConnectContent() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Using showToast directly
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'telegram_connected') {
      showToast.success("¡Telegram conectado! Telegram se ha conectado exitosamente");
      // Redirigir de vuelta a la página de integraciones
      setTimeout(() => {
        router.push('/dashboard/integrations');
      }, 2000);
    } else if (error) {
      let errorTitle = "Error de conexión";
      let errorMessage = "Error al conectar con Telegram. Intenta de nuevo.";
      
      switch (error) {
        case 'telegram_connection_failed':
          errorTitle = "Error de conexión de Telegram";
          errorMessage = "Error al conectar con Telegram. Intenta de nuevo.";
          break;
        case 'telegram_missing_parameters':
          errorTitle = "Parámetros faltantes";
          errorMessage = "Faltan parámetros requeridos para la conexión con Telegram.";
          break;
        case 'telegram_bot_not_configured':
          errorTitle = "Bot no configurado";
          errorMessage = "El bot de Telegram no está configurado correctamente.";
          break;
        case 'telegram_invalid_signature':
          errorTitle = "Firma inválida";
          errorMessage = "La firma de autenticación de Telegram es inválida.";
          break;
        case 'telegram_missing_state':
          errorTitle = "Estado faltante";
          errorMessage = "Falta el estado de autorización para Telegram.";
          break;
        case 'telegram_invalid_user_id':
          errorTitle = "ID de usuario inválido";
          errorMessage = "El ID de usuario de Telegram es inválido.";
          break;
        case 'telegram_user_not_found':
          errorTitle = "Usuario no encontrado";
          errorMessage = "No se encontró el usuario en la base de datos.";
          break;
        default:
          errorTitle = "Error desconocido";
          errorMessage = `Error: ${error}. Revisa los logs del servidor para más detalles.`;
          break;
      }
      
      showToast.error(`${errorTitle}: ${errorMessage}`);
    }
  }, [searchParams, router]);

  const handleConnect = () => {
    setIsConnecting(true);
  };

  const handleError = (error: string) => {
    setIsConnecting(false);
    showToast.error(error);
  };

  if (authLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <div className="p-6 text-foreground" style={{ background: 'var(--background-gradient)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/integrations')}
              className="flex items-center gap-2 bg-transparent hover:bg-neutral-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Integraciones
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Conectar Telegram</h1>
              <p className="text-muted-foreground mt-1">
                Conecta tu cuenta de Telegram para gestionar bots y mensajes
              </p>
            </div>
          </div>
        </div>

        {/* Información sobre Telegram */}
        <div className="mb-8">
          <div className="bg-neutral-800 rounded-lg border border-neutral-700">
            <div className="p-6 border-b border-neutral-700">
              <h3 className="text-xl font-semibold text-white">¿Qué es Telegram?</h3>
              <p className="text-sm text-neutral-400 mt-1">
                Telegram es una plataforma de mensajería que permite crear bots para automatizar conversaciones
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Ventajas de Telegram:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Bots potentes y fáciles de crear</li>
                    <li>• API robusta y bien documentada</li>
                    <li>• Mensajes en tiempo real</li>
                    <li>• Soporte para multimedia</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Con NEXLY puedes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Enviar mensajes automáticamente</li>
                    <li>• Recibir mensajes de clientes</li>
                    <li>• Gestionar múltiples conversaciones</li>
                    <li>• Integrar con tu flujo de trabajo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Componente de conexión */}
        <TelegramConnect
          onConnect={handleConnect}
          onError={handleError}
          disabled={isConnecting}
        />

        {/* Estado de conexión */}
        {isConnecting && (
          <div className="mt-6 bg-neutral-800 rounded-lg border border-neutral-700">
            <div className="p-6">
              <div className="flex items-center justify-center gap-2 text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Conectando con Telegram...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TelegramConnectPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    }>
      <TelegramConnectContent />
    </Suspense>
  );
}
