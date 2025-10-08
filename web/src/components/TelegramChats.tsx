'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { showToast } from '@/hooks/use-toast';
import { MessageSquare, Users, Hash, Send } from 'lucide-react';

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  accessHash?: string;
}

interface TelegramMessage {
  id: number;
  chatId: number;
  text?: string;
  date: Date;
  fromId?: number;
  isOutgoing: boolean;
}

interface TelegramChatsProps {
  onChatSelect?: (chat: TelegramChat) => void;
  className?: string;
}

export default function TelegramChats({ onChatSelect, className = '' }: TelegramChatsProps) {
  const { token } = useAuth();
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<TelegramChat | null>(null);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Cargar chats al montar el componente
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    if (!token) return;
    
    setIsLoadingChats(true);
    try {
      const response = await apiFetch('/telegram/chats', {}, token);
      
      if (response.success) {
        setChats(response.chats || []);
        showToast.success(`${response.chats?.length || 0} chats cargados`);
      } else {
        showToast.error('Error cargando chats de Telegram');
      }
    } catch (error: any) {
      console.error('Error cargando chats:', error);
      showToast.error('Error cargando chats de Telegram');
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadMessages = async (chatId: number) => {
    if (!token) return;
    
    setIsLoadingMessages(true);
    try {
      const response = await apiFetch(`/telegram/messages/${chatId}?limit=20`, {}, token);
      
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

  const sendMessage = async () => {
    if (!selectedChat || !newMessage.trim() || !token) return;
    
    try {
      const response = await apiFetch('/telegram/send-message', {
        method: 'POST',
        body: JSON.stringify({
          chatId: selectedChat.id,
          message: newMessage.trim()
        })
      }, token);
      
      if (response.success) {
        setNewMessage('');
        showToast.success('Mensaje enviado');
        // Recargar mensajes
        loadMessages(selectedChat.id);
      } else {
        showToast.error('Error enviando mensaje');
      }
    } catch (error: any) {
      console.error('Error enviando mensaje:', error);
      showToast.error('Error enviando mensaje');
    }
  };

  const handleChatSelect = (chat: TelegramChat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
    onChatSelect?.(chat);
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'private': return <MessageSquare className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      case 'supergroup': return <Users className="w-4 h-4" />;
      case 'channel': return <Hash className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* Lista de chats */}
      <div className="w-1/3 border-r border-border bg-muted/20">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Chats de Telegram</h3>
          <p className="text-sm text-muted-foreground">
            {chats.length} conversaciones
          </p>
        </div>
        
        <div className="overflow-y-auto">
          {isLoadingChats ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-blue mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Cargando chats...</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedChat?.id === chat.id
                      ? 'bg-accent-blue/20 border border-accent-blue/30'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent-blue/20 rounded-full flex items-center justify-center text-accent-blue">
                      {getChatIcon(chat.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {chat.title || chat.username || `Chat ${chat.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {chat.type}
                      </p>
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
        {selectedChat ? (
          <>
            {/* Header del chat */}
            <div className="p-4 border-b border-border bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent-blue/20 rounded-full flex items-center justify-center text-accent-blue">
                  {getChatIcon(selectedChat.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {selectedChat.title || selectedChat.username || `Chat ${selectedChat.id}`}
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedChat.type}
                  </p>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-blue mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Cargando mensajes...</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isOutgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isOutgoing
                          ? 'bg-accent-blue text-white'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.isOutgoing ? 'text-blue-100' : 'text-muted-foreground'
                      }`}>
                        {formatDate(message.date)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input para enviar mensaje */}
            <div className="p-4 border-t border-border bg-muted/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Enviar
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Selecciona un chat
              </h3>
              <p className="text-muted-foreground">
                Elige una conversación para ver los mensajes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
