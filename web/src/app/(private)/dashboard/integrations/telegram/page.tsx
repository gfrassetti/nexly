'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
// Removed UI component imports - using standard HTML elements
import { ArrowLeft, MessageSquare, Send, Settings, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { showToast } from '@/hooks/use-toast';
import TelegramStatus from '@/components/TelegramStatus';
import TelegramMessenger from '@/components/TelegramMessenger';
import useSWR from 'swr';

interface TelegramIntegration {
  _id: string;
  provider: string;
  name: string;
  status: string;
  meta?: {
    telegramUserId?: string;
    telegramUsername?: string;
    telegramFirstName?: string;
    telegramLastName?: string;
    telegramPhotoUrl?: string;
    connectedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function TelegramPage() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  // Using showToast directly
  const [selectedIntegration, setSelectedIntegration] = useState<TelegramIntegration | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'messenger'>('overview');

  // Fetch integraciones de Telegram
  const { data: integrations, mutate: refreshIntegrations, isLoading } = useSWR(
    token ? ['/integrations', token] : null,
    async ([url, t]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      // Filtrar solo las integraciones de Telegram
      return data.filter((integration: any) => integration.provider === 'telegram');
    }
  );

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  const handleDisconnect = async (integrationId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await refreshIntegrations();
        setSelectedIntegration(null);
        showToast.success("Telegram se ha desconectado exitosamente");
      } else {
        throw new Error('Error al desconectar');
      }
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo desconectar Telegram');
    }
  };

  const handleSendMessage = (integrationId: string) => {
    const integration = integrations?.find((i: TelegramIntegration) => i._id === integrationId);
    if (integration) {
      setSelectedIntegration(integration);
      setActiveTab('messenger');
    }
  };

  const handleConfigure = (integrationId: string) => {
    const integration = integrations?.find((i: TelegramIntegration) => i._id === integrationId);
    if (integration) {
      setSelectedIntegration(integration);
      setActiveTab('overview');
    }
  };

  if (authLoading || isLoading) {
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
      <div className="max-w-6xl mx-auto">
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
              <h1 className="text-2xl font-bold text-foreground">Telegram</h1>
              <p className="text-muted-foreground mt-1">
                Gestiona tus integraciones de Telegram
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/integrations/connect/telegram')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Conectar Telegram
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-800 rounded-lg border border-neutral-700">
            <div className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-400">Integraciones</p>
                  <p className="text-2xl font-bold text-white">{integrations?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-neutral-800 rounded-lg border border-neutral-700">
            <div className="p-6">
              <div className="flex items-center">
                <Send className="h-8 w-8 text-green-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-400">Conectadas</p>
                  <p className="text-2xl font-bold text-white">
                    {integrations?.filter((i: TelegramIntegration) => i.status === 'linked').length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-neutral-800 rounded-lg border border-neutral-700">
            <div className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-orange-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-400">Pendientes</p>
                  <p className="text-2xl font-bold text-white">
                    {integrations?.filter((i: TelegramIntegration) => i.status === 'pending').length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de integraciones */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-800 rounded-lg border border-neutral-700">
              <div className="p-6 border-b border-neutral-700">
                <h3 className="text-xl font-semibold text-white">Integraciones de Telegram</h3>
                <p className="text-sm text-neutral-400 mt-1">
                  Gestiona tus conexiones de Telegram
                </p>
              </div>
              <div className="p-6">
                {integrations && integrations.length > 0 ? (
                  <div className="space-y-4">
                    {integrations.map((integration: TelegramIntegration) => (
                      <div
                        key={integration._id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedIntegration?._id === integration._id
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedIntegration(integration)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-400" />
                            <span className="font-medium text-sm">{integration.name}</span>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            integration.status === 'linked'
                              ? 'bg-green-900 text-green-200'
                              : 'bg-neutral-600 text-neutral-200'
                          }`}>
                            {integration.status === 'linked' ? 'Conectado' : 'Pendiente'}
                          </span>
                        </div>
                        {integration.meta?.telegramUsername && (
                          <p className="text-xs text-muted-foreground mt-1">
                            @{integration.meta.telegramUsername}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No hay integraciones de Telegram</p>
                    <button
                      onClick={() => router.push('/dashboard/integrations/connect/telegram')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
                    >
                      Conectar Telegram
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detalles de la integración seleccionada */}
          <div className="lg:col-span-2">
            {selectedIntegration ? (
              <div className="space-y-6">
                {/* Tabs */}
                <div className="flex gap-2">
                  <button
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                      activeTab === 'overview' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                    }`}
                    onClick={() => setActiveTab('overview')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configuración
                  </button>
                  <button
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                      activeTab === 'messenger' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                    } ${selectedIntegration.status !== 'linked' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => setActiveTab('messenger')}
                    disabled={selectedIntegration.status !== 'linked'}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Mensaje
                  </button>
                </div>

                {/* Contenido de las tabs */}
                {activeTab === 'overview' && (
                  <TelegramStatus
                    integration={selectedIntegration}
                    onDisconnect={handleDisconnect}
                    onSendMessage={handleSendMessage}
                    onConfigure={handleConfigure}
                  />
                )}

                {activeTab === 'messenger' && selectedIntegration.status === 'linked' && (
                  <TelegramMessenger
                    integrationId={selectedIntegration._id}
                    onMessageSent={(messageId) => {
                      showToast.success(`Mensaje enviado exitosamente (ID: ${messageId})`);
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="bg-neutral-800 rounded-lg border border-neutral-700">
                <div className="p-6">
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-400">Selecciona una integración para ver los detalles</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
