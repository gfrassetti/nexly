'use client';

import React, { useState } from 'react';
// Removed UI component imports - using standard HTML elements
import { MessageSquare, CheckCircle, AlertCircle, Trash2, Send, Settings } from 'lucide-react';
import { showToast } from '../hooks/use-toast';

interface TelegramStatusProps {
  integration: {
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
  };
  onDisconnect?: (integrationId: string) => void;
  onSendMessage?: (integrationId: string) => void;
  onConfigure?: (integrationId: string) => void;
}

export default function TelegramStatus({ 
  integration, 
  onDisconnect, 
  onSendMessage, 
  onConfigure 
}: TelegramStatusProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  // Using showToast directly

  const handleDisconnect = async () => {
    if (!onDisconnect) return;

    try {
      setIsDisconnecting(true);
      await onDisconnect(integration._id);
      
      showToast.success("Telegram se ha desconectado exitosamente");
    } catch (error: any) {
      showToast.error(error.message || "No se pudo desconectar Telegram");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'linked':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Conectado
        </span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900 text-yellow-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pendiente
        </span>;
      case 'error':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-700 text-neutral-300 border border-neutral-600">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full bg-neutral-800 rounded-lg border border-neutral-700">
      <div className="p-6 border-b border-neutral-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="text-xl font-semibold text-white">{integration.name}</h3>
          </div>
          {getStatusBadge(integration.status)}
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Integración de Telegram
        </p>
      </div>
      <div className="p-6 space-y-4">
        {/* Información del usuario de Telegram */}
        {integration.meta && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-neutral-700 rounded-lg">
              {integration.meta.telegramPhotoUrl ? (
                <img 
                  src={integration.meta.telegramPhotoUrl} 
                  alt="Avatar de Telegram"
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-900/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-white">
                  {integration.meta.telegramFirstName} {integration.meta.telegramLastName}
                </p>
                {integration.meta.telegramUsername && (
                  <p className="text-sm text-neutral-400">
                    @{integration.meta.telegramUsername}
                  </p>
                )}
                <p className="text-xs text-neutral-400">
                  ID: {integration.meta.telegramUserId}
                </p>
              </div>
            </div>

            {/* Fecha de conexión */}
            {integration.meta.connectedAt && (
              <div className="text-sm text-neutral-400">
                Conectado el: {formatDate(integration.meta.connectedAt)}
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2">
          {onSendMessage && (
            <button
              onClick={() => onSendMessage(integration._id)}
              className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Mensaje
            </button>
          )}
          
          {onConfigure && (
            <button
              onClick={() => onConfigure(integration._id)}
              className="bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </button>
          )}
          
          {onDisconnect && (
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
            >
              {isDisconnecting ? (
                <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Desconectar
            </button>
          )}
        </div>

        {/* Información adicional */}
        <div className="text-xs text-neutral-400 space-y-1">
          <p>Creado: {formatDate(integration.createdAt)}</p>
          <p>Actualizado: {formatDate(integration.updatedAt)}</p>
        </div>
      </div>
    </div>
  );
}
