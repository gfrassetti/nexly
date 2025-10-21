"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import apiFetch from '@/lib/api';

interface DiscordCallbackResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export default function DiscordCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage('Autorización denegada por el usuario');
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Parámetros de autorización faltantes');
          return;
        }

        if (!token) {
          setStatus('error');
          setMessage('No hay token de autenticación');
          return;
        }

        // Enviar código al backend
        const response = await apiFetch('/discord/oauth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, state }),
        }) as DiscordCallbackResponse;

        if (response.success) {
          setStatus('success');
          setMessage('Discord conectado exitosamente');
          
          // Redirigir después de 2 segundos
          setTimeout(() => {
            router.push('/dashboard/integrations');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(response.error || 'Error al conectar Discord');
        }

      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Error al procesar autorización');
      }
    };

    handleCallback();
  }, [searchParams, token, router]);

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardContent className="p-6">
          {status === 'processing' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Spinner className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Procesando autorización...</h3>
              <p className="text-sm text-gray-600">Conectando tu cuenta de Discord</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-900">¡Discord conectado!</h3>
              <p className="text-sm text-green-700">{message}</p>
              <p className="text-xs text-gray-500">Redirigiendo a integraciones...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-900">Error de conexión</h3>
              <p className="text-sm text-red-700">{message}</p>
              <button
                onClick={() => router.push('/dashboard/integrations/connect/discord')}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
