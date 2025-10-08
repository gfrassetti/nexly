'use client';

import React from 'react';
import TelegramChats from '@/components/TelegramChats';
import TelegramMTProtoStatus from '@/components/TelegramMTProtoStatus';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { useState, useEffect } from 'react';
import { showToast } from '@/hooks/use-toast';

interface TelegramIntegration {
  _id: string;
  provider: string;
  status: string;
  meta: {
    telegramUserId?: number;
    telegramUsername?: string;
    telegramFirstName?: string;
    telegramLastName?: string;
    isActive?: boolean;
  };
}

export default function TelegramPage() {
  const { token } = useAuth();
  const [integration, setIntegration] = useState<TelegramIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    if (!token) return;
    
    try {
      const response = await apiFetch('/integrations', {}, token);
      
      if (response.success) {
        const telegramIntegration = response.integrations.find(
          (int: any) => int.provider === 'telegram' && int.status === 'linked'
        );
        setIntegration(telegramIntegration || null);
      }
    } catch (error) {
      console.error('Error cargando integración de Telegram:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIntegration(null);
    showToast.success('Telegram desconectado');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-accent-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Telegram no conectado
          </h2>
          <p className="text-muted-foreground mb-6">
            Conecta tu cuenta de Telegram para gestionar tus chats y mensajes desde Nexly.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard/integrations'}
            className="bg-accent-blue text-white px-6 py-3 rounded-lg hover:bg-accent-blue/90 transition-colors"
          >
            Conectar Telegram
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-foreground">Telegram</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Gestiona tus chats y mensajes de Telegram
              </p>
            </div>
            <TelegramMTProtoStatus 
              integration={integration} 
              onDisconnect={handleDisconnect}
            />
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 min-h-0">
        <TelegramChats />
      </div>
    </div>
  );
}
