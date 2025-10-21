"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DiscordConfig from '@/components/DiscordConfig';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';

export default function ConnectDiscordPage() {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');

  const handleSuccess = () => {
    setConnectionStatus('success');
    // Redirigir después de un momento
    setTimeout(() => {
      router.push('/dashboard/integrations');
    }, 2000);
  };

  const handleError = (error: string) => {
    setConnectionStatus('error');
    console.error('Discord connection error:', error);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mx-auto">
          <MessageSquare className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold text-accent-cream">Conectar Discord</h1>
        <p className="text-lg text-accent-cream max-w-2xl mx-auto">
          Conecta un bot de Discord para gestionar mensajes en tu servidor (comunidad, negocio, etc.).
        </p>
      </div>

      {/* Connection Status */}
      {connectionStatus === 'success' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">¡Discord conectado exitosamente!</h3>
                <p className="text-sm text-green-700">Redirigiendo a la página de integraciones...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStatus === 'error' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Error al conectar Discord</h3>
                <p className="text-sm text-red-700">Hubo un problema al conectar con Discord. Intenta de nuevo.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discord Configuration */}
      <DiscordConfig 
        onSuccess={handleSuccess}
        onError={handleError}
      />

      {/* Information Card */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-accent-cream my-4">¿Cómo funciona Discord en Nexly?</h3>
          <div className="space-y-3 text-sm text-accent-cream">
            <p>• <strong>Bot como intermediario:</strong> Nexly usa un bot para enviar y recibir mensajes en tu servidor</p>
            <p>• <strong>Gestión de conversaciones:</strong> Los mensajes del servidor aparecen como conversaciones en Nexly</p>
            <p>• <strong>Contactos automáticos:</strong> Los usuarios del servidor se crean como contactos automáticamente</p>
            <p>• <strong>Respuestas centralizadas:</strong> Puedes responder desde Nexly y el bot enviará el mensaje</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
