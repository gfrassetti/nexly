'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, MessageCircle, Settings, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { showToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

interface TelegramMessage {
  id: number;
  chatId: number;
  text?: string;
  date: string;
  fromId?: number;
  isOutgoing: boolean;
}

interface TelegramMTProtoStatusProps {
  integration: {
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
  };
  onDisconnect?: () => void;
}

export default function TelegramMTProtoStatus({ integration, onDisconnect }: TelegramMTProtoStatusProps) {
  const { token } = useAuth();
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<TelegramChat | null>(null);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const loadChats = async () => {
    setIsLoadingChats(true);
    try {
      const response = await apiFetch('/telegram/chats', {}, token || undefined);
      if (response.success) {
        setChats(response.chats || []);
      } else {
        showToast.error('Error cargando chats');
      }
    } catch (error: any) {
      console.error('Error cargando chats:', error);
      showToast.error('Error cargando chats');
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadMessages = async (chatId: number) => {
    setIsLoadingMessages(true);
    try {
      const response = await apiFetch(`/telegram/messages/${chatId}?limit=20`, {}, token || undefined);
      if (response.success) {
        setMessages(response.messages || []);
      } else {
        showToast.error('Error cargando mensajes');
      }
    } catch (error: any) {
      console.error('Error cargando mensajes:', error);
      showToast.error('Error cargando mensajes');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Estás seguro de que quieres desconectar Telegram? Esto eliminará el acceso a todos tus chats.')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const response = await apiFetch('/telegram/disconnect', {
        method: 'DELETE'
      }, token || undefined);
      
      if (response.success) {
        showToast.success('Telegram desconectado exitosamente');
        onDisconnect?.();
      } else {
        showToast.error('Error desconectando Telegram');
      }
    } catch (error: any) {
      console.error('Error desconectando:', error);
      showToast.error('Error desconectando Telegram');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleChatSelect = (chat: TelegramChat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
  };

  useEffect(() => {
    loadChats();
  }, []);

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'private':
        return <MessageCircle className="w-4 h-4" />;
      case 'group':
      case 'supergroup':
        return <Users className="w-4 h-4" />;
      case 'channel':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getChatTypeLabel = (type: string) => {
    switch (type) {
      case 'private':
        return 'Privado';
      case 'group':
        return 'Grupo';
      case 'supergroup':
        return 'Supergrupo';
      case 'channel':
        return 'Canal';
      default:
        return 'Chat';
    }
  };

  return (
    <div className="space-y-6">
      {/* Información de la conexión */}
      <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">{integration.name}</h3>
              <p className="text-neutral-400">
                {integration.meta.telegramUsername ? `@${integration.meta.telegramUsername}` : integration.meta.telegramPhoneNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              integration.meta.isActive 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {integration.meta.isActive ? 'Activo' : 'Inactivo'}
            </span>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {isDisconnecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-neutral-400">ID de Usuario:</span>
            <p className="text-white font-mono">{integration.meta.telegramUserId}</p>
          </div>
          <div>
            <span className="text-neutral-400">Nombre:</span>
            <p className="text-white">
              {integration.meta.telegramFirstName} {integration.meta.telegramLastName}
            </p>
          </div>
          <div>
            <span className="text-neutral-400">Teléfono:</span>
            <p className="text-white">{integration.meta.telegramPhoneNumber}</p>
          </div>
        </div>
      </div>

      {/* Lista de chats */}
      <div className="bg-neutral-800 rounded-lg border border-neutral-700">
        <div className="p-4 border-b border-neutral-700">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-white">Tus Chats</h4>
            <button
              onClick={loadChats}
              disabled={isLoadingChats}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {isLoadingChats ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoadingChats ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-neutral-400">Cargando chats...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
              <p className="text-neutral-400">No se encontraron chats</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-700">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat)}
                  className={`w-full p-4 text-left hover:bg-neutral-700 transition-colors duration-200 ${
                    selectedChat?.id === chat.id ? 'bg-neutral-700' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                      {getChatIcon(chat.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {chat.title || `Chat ${chat.id}`}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-neutral-400">
                        <span>{getChatTypeLabel(chat.type)}</span>
                        {chat.username && (
                          <>
                            <span>•</span>
                            <span>@{chat.username}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mensajes del chat seleccionado */}
      {selectedChat && (
        <div className="bg-neutral-800 rounded-lg border border-neutral-700">
          <div className="p-4 border-b border-neutral-700">
            <h4 className="text-lg font-semibold text-white">
              {selectedChat.title || `Chat ${selectedChat.id}`}
            </h4>
            <p className="text-sm text-neutral-400">
              {getChatTypeLabel(selectedChat.type)}
              {selectedChat.username && ` • @${selectedChat.username}`}
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto p-4">
            {isLoadingMessages ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                <p className="text-neutral-400">Cargando mensajes...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
                <p className="text-neutral-400">No hay mensajes en este chat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg ${
                      message.isOutgoing 
                        ? 'bg-blue-500/20 ml-8' 
                        : 'bg-neutral-700 mr-8'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs text-neutral-400">
                        {message.isOutgoing ? 'Tú' : 'Otro'}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(message.date).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white text-sm">
                      {message.text || '[Mensaje sin texto]'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
