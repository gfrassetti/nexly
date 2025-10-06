'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  MoreVertical, 
  Archive, 
  Ban, 
  CheckCircle,
  Clock,
  Phone,
  Camera,
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { showToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';

interface Conversation {
  _id: string;
  conversationId: string;
  externalContact: {
    externalId: string;
    channel: 'whatsapp' | 'instagram' | 'messenger' | 'telegram';
    name?: string;
    username?: string;
    phoneNumber?: string;
    profilePicture?: string;
  };
  status: 'active' | 'archived' | 'blocked';
  lastMessageAt: string;
  lastMessageFrom: 'user' | 'contact';
  unreadCount: number;
  tags: string[];
  notes?: string;
}

interface Message {
  _id: string;
  messageId: string;
  content: {
    text?: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'other';
    mediaUrl?: string;
    fileName?: string;
  };
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  participant: {
    externalId: string;
    name?: string;
    type: 'user' | 'contact' | 'bot' | 'system';
  };
  createdAt: string;
}

interface UnifiedInboxProps {
  className?: string;
}

export default function UnifiedInbox({ className = '' }: UnifiedInboxProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'blocked'>('active');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Cargar conversaciones
  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const response = await apiFetch(`/unified-inbox/conversations?status=${statusFilter}&search=${searchTerm}`);
      
      if (response.success) {
        setConversations(response.conversations || []);
      } else {
        showToast.error('Error cargando conversaciones');
      }
    } catch (error: any) {
      console.error('Error cargando conversaciones:', error);
      showToast.error('Error cargando conversaciones');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Cargar mensajes de una conversación
  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      const response = await apiFetch(`/unified-inbox/conversations/${conversationId}/messages`);
      
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

  // Enviar mensaje
  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      setIsSendingMessage(true);
      const response = await apiFetch(`/unified-inbox/conversations/${selectedConversation.conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: {
            text: newMessage.trim(),
            type: 'text'
          }
        })
      });

      if (response.success) {
        setNewMessage('');
        // Recargar mensajes
        await loadMessages(selectedConversation.conversationId);
        showToast.success('Mensaje enviado');
      } else {
        showToast.error('Error enviando mensaje');
      }
    } catch (error: any) {
      console.error('Error enviando mensaje:', error);
      showToast.error('Error enviando mensaje');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Marcar conversación como leída
  const markAsRead = async (conversationId: string) => {
    try {
      await apiFetch(`/unified-inbox/conversations/${conversationId}/read`, {
        method: 'PUT'
      });
      // Actualizar estado local
      setConversations(prev => prev.map(conv => 
        conv.conversationId === conversationId 
          ? { ...conv, unreadCount: 0 }
          : conv
      ));
    } catch (error: any) {
      console.error('Error marcando como leída:', error);
    }
  };

  // Seleccionar conversación
  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation.conversationId);
    
    // Marcar como leída si tiene mensajes no leídos
    if (conversation.unreadCount > 0) {
      await markAsRead(conversation.conversationId);
    }
  };

  // Obtener icono del canal
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return '📱';
      case 'instagram':
        return '📸';
      case 'messenger':
        return '💬';
      case 'telegram':
        return '✈️';
      default:
        return '📞';
    }
  };

  // Obtener color del canal
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return 'bg-green-500';
      case 'instagram':
        return 'bg-pink-500';
      case 'messenger':
        return 'bg-blue-500';
      case 'telegram':
        return 'bg-blue-400';
      default:
        return 'bg-neutral-500';
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 días
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
  };

  useEffect(() => {
    loadConversations();
  }, [statusFilter, searchTerm]);

  return (
    <div className={`flex h-full bg-neutral-900 ${className}`}>
      {/* Lista de conversaciones */}
      <div className="w-1/3 border-r border-neutral-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-700">
          <h2 className="text-xl font-semibold text-white mb-4">Bandeja Unificada</h2>
          
          {/* Búsqueda */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtros */}
          <div className="flex space-x-2">
            {['active', 'archived', 'blocked'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                }`}
              >
                {status === 'active' ? 'Activas' : status === 'archived' ? 'Archivadas' : 'Bloqueadas'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-12 h-12 text-neutral-600 mb-4" />
              <p className="text-neutral-400">No hay conversaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-700">
              {conversations.map((conversation) => (
                <button
                  key={conversation.conversationId}
                  onClick={() => selectConversation(conversation)}
                  className={`w-full p-4 text-left hover:bg-neutral-800 transition-colors ${
                    selectedConversation?.conversationId === conversation.conversationId
                      ? 'bg-neutral-800 border-r-2 border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Avatar del canal */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${getChannelColor(conversation.externalContact.channel)}`}>
                      {getChannelIcon(conversation.externalContact.channel)}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-medium truncate">
                          {conversation.externalContact.name || 
                           conversation.externalContact.username || 
                           conversation.externalContact.phoneNumber || 
                           'Contacto sin nombre'}
                        </h3>
                        <span className="text-xs text-neutral-400">
                          {formatDate(conversation.lastMessageAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-neutral-400">
                        <span className="capitalize">{conversation.externalContact.channel}</span>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs">
                            {conversation.unreadCount}
                          </span>
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

      {/* Área de mensajes */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header de la conversación */}
            <div className="p-4 border-b border-neutral-700 bg-neutral-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${getChannelColor(selectedConversation.externalContact.channel)}`}>
                    {getChannelIcon(selectedConversation.externalContact.channel)}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">
                      {selectedConversation.externalContact.name || 
                       selectedConversation.externalContact.username || 
                       selectedConversation.externalContact.phoneNumber || 
                       'Contacto sin nombre'}
                    </h3>
                    <p className="text-sm text-neutral-400 capitalize">
                      {selectedConversation.externalContact.channel}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="w-12 h-12 text-neutral-600 mb-4" />
                  <p className="text-neutral-400">No hay mensajes en esta conversación</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.messageId}
                    className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.direction === 'outbound'
                          ? 'bg-blue-500 text-white'
                          : 'bg-neutral-700 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content.text}</p>
                      <div className="flex items-center justify-end mt-1 space-x-1">
                        <span className="text-xs opacity-70">
                          {new Date(message.createdAt).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {message.direction === 'outbound' && (
                          <div className="flex items-center">
                            {message.status === 'read' ? (
                              <CheckCircle className="w-3 h-3 text-blue-300" />
                            ) : message.status === 'delivered' ? (
                              <CheckCircle className="w-3 h-3 text-white" />
                            ) : (
                              <Clock className="w-3 h-3 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input de mensaje */}
            <div className="p-4 border-t border-neutral-700 bg-neutral-800">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSendingMessage}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSendingMessage}
                  className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isSendingMessage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Selecciona una conversación</h3>
              <p className="text-neutral-400">
                Elige una conversación de la lista para ver los mensajes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
