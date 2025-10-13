'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { showToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import TelegramMTProtoStatus from '@/components/TelegramMTProtoStatus';

interface TelegramIntegration {
  _id: string;
  name: string;
  status: string;
  meta: {
    telegramUserId: number;
    telegramUsername?: string;
    telegramFirstName?: string;
    telegramLastName?: string;
    telegramPhoneNumber?: string;
    isActive: boolean;
  };
}

export default function TelegramPage() {
  const router = useRouter();
  const [integration, setIntegration] = useState<TelegramIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar integración de Telegram
      const response = await apiFetch('/integrations');
      
      if (response.success) {
        const telegramIntegration = response.integrations.find(
          (int: any) => int.provider === 'telegram' && int.status === 'linked'
        );

        if (telegramIntegration) {
          setIntegration(telegramIntegration);
        } else {
          setError('No se encontró una integración de Telegram activa');
        }
      } else {
        throw new Error(response.message || 'Error cargando integración');
      }
    } catch (error: any) {
      console.error('Error cargando integración:', error);
      setError(error.message || 'Error cargando integración de Telegram');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIntegration(null);
    showToast.success('Telegram desconectado exitosamente');
    router.push('/dashboard/integrations');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-accent-dark p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-neutral-400 hover:text-accent-cream transition-colors duration-200 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver
            </button>
            <h1 className="text-3xl font-bold text-accent-cream mb-2">Gestionar Telegram</h1>
          </div>

          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-neutral-400">Cargando integración de Telegram...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !integration) {
    return (
      <div className="min-h-screen bg-accent-dark p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-neutral-400 hover:text-accent-cream transition-colors duration-200 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver
            </button>
            <h1 className="text-3xl font-bold text-accent-cream mb-2">Gestionar Telegram</h1>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-8">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-400 mr-4" />
              <div>
                <h3 className="text-xl font-semibold text-red-400 mb-1">
                  {error ? 'Error cargando Telegram' : 'Telegram no conectado'}
                </h3>
                <p className="text-red-300">
                  {error || 'No tienes una integración de Telegram activa. Conecta tu cuenta para comenzar.'}
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/dashboard/integrations/connect/telegram')}
                className="bg-blue-500 hover:bg-blue-600 text-accent-cream font-medium py-2 px-6 rounded-lg transition-colors duration-200"
              >
                Conectar Telegram
              </button>
              <button
                onClick={() => router.push('/dashboard/integrations')}
                className="bg-neutral-600 hover:bg-neutral-700 text-accent-cream font-medium py-2 px-6 rounded-lg transition-colors duration-200"
              >
                Ver todas las integraciones
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent-dark p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-neutral-400 hover:text-accent-cream transition-colors duration-200 mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
          <h1 className="text-3xl font-bold text-accent-cream mb-2">Gestionar Telegram</h1>
          <p className="text-neutral-400">
            Gestiona todos tus chats y mensajes de Telegram desde una sola plataforma.
          </p>
        </div>

        <TelegramMTProtoStatus
          integration={integration}
          onDisconnect={handleDisconnect}
        />
      </div>
    </div>
  );
}
