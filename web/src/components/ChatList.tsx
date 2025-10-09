"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { showToast } from '@/hooks/use-toast';
import { MessageSquare, Users, Hash, Instagram, Send as SendIcon } from 'lucide-react';
import MessageThread from './MessageThread';
import MessageInput from './MessageInput';

interface Chat {
  id: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  name?: string;
  profilePic?: string;
}

interface ChatListProps {
  channel: 'telegram' | 'whatsapp' | 'instagram' | 'messenger';
  className?: string;
}

export default function ChatList({ channel, className = '' }: ChatListProps) {
  const { token } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [messageRefreshKey, setMessageRefreshKey] = useState(0);

  // Cargar chats al montar el componente o cuando cambie el canal
  useEffect(() => {
    loadChats();
    setSelectedChat(null); // Reset selection cuando cambia el canal
  }, [channel]);

  const loadChats = async () => {
    if (!token) return;
    
    setIsLoadingChats(true);
    try {
      // Endpoint dinámico según el canal
      const endpoint = getChatsEndpoint(channel);
      const response = await apiFetch(endpoint, {}, token);
      
      if (response.success) {
        const chatsData = normalizeChats(response.chats || response.conversations || [], channel);
        setChats(chatsData);
        showToast.success(`${chatsData.length} conversaciones cargadas`);
      } else {
        showToast.error(`Error cargando conversaciones de ${channel}`);
      }
    } catch (error: any) {
      console.error('Error cargando conversaciones:', error);
      showToast.error(`Error cargando conversaciones de ${channel}`);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!selectedChat || !token) return;
    
    try {
      // Endpoint dinámico según el canal
      const endpoint = getSendMessageEndpoint(channel);
      const body = getSendMessageBody(channel, selectedChat.id, message);
      
      const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      }, token);
      
      if (response.success) {
        showToast.success('Mensaje enviado');
        // Disparar evento para refrescar mensajes en MessageThread
        window.dispatchEvent(new CustomEvent('messageSent', { 
          detail: { threadId: selectedChat.id } 
        }));
        setMessageRefreshKey(prev => prev + 1);
      } else {
        showToast.error('Error enviando mensaje');
      }
    } catch (error: any) {
      console.error('Error enviando mensaje:', error);
      showToast.error('Error enviando mensaje');
      throw error;
    }
  };

  // Helpers para endpoints dinámicos
  const getChatsEndpoint = (channel: string): string => {
    switch (channel) {
      case 'telegram': return '/telegram/chats';
      case 'whatsapp': return '/integrations/whatsapp/conversations';
      case 'instagram': return '/integrations/instagram/conversations';
      case 'messenger': return '/integrations/messenger/conversations';
      default: return '/integrations/conversations';
    }
  };

  const getSendMessageEndpoint = (channel: string): string => {
    switch (channel) {
      case 'telegram': return '/telegram/send-message';
      case 'whatsapp': return '/integrations/whatsapp/send';
      case 'instagram': return '/integrations/instagram/send';
      case 'messenger': return '/integrations/messenger/send';
      default: return '/integrations/send';
    }
  };

  const getSendMessageBody = (channel: string, chatId: string, message: string) => {
    switch (channel) {
      case 'telegram':
        return { chatId: parseInt(chatId), message };
      case 'whatsapp':
        return { to: chatId, message };
      case 'instagram':
        return { recipientId: chatId, message };
      case 'messenger':
        return { recipientId: chatId, message };
      default:
        return { chatId, message };
    }
  };

  // Normalizar datos de diferentes APIs al mismo formato
  const normalizeChats = (chats: any[], channel: string): Chat[] => {
    return chats.map(chat => ({
      id: chat.id?.toString() || chat.threadId || chat.conversationId,
      type: chat.type || 'private',
      title: chat.title,
      username: chat.username,
      name: chat.name || chat.displayName,
      profilePic: chat.profilePic || chat.avatar
    }));
  };

  const getChatIcon = (type: string) => {
    switch (channel) {
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      case 'messenger':
        return <SendIcon className="w-4 h-4" />;
      case 'telegram':
        switch (type) {
          case 'group':
          case 'supergroup':
            return <Users className="w-4 h-4" />;
          case 'channel':
            return <Hash className="w-4 h-4" />;
          default:
            return <MessageSquare className="w-4 h-4" />;
        }
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'telegram': return 'green';
      case 'whatsapp': return 'green';
      case 'instagram': return 'pink';
      case 'messenger': return 'blue';
      default: return 'gray';
    }
  };

  const color = getChannelColor(channel);
  const colorClasses = {
    bg: `bg-${color}-500`,
    bgLight: `bg-${color}-500/20`,
    border: `border-${color}-500/30`,
    text: `text-${color}-500`,
    spinner: `border-${color}-500`,
    hover: `bg-${color}-600/20`,
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* Lista de conversaciones */}
      <div className="w-1/3 border-r border-neutral-700 bg-neutral-800">
        <div className="p-4 border-b border-neutral-700">
          <h3 className="font-semibold text-white capitalize">{channel}</h3>
          <p className="text-sm text-neutral-400">
            {chats.length} conversaciones
          </p>
        </div>
        
        <div className="overflow-y-auto h-full">
          {isLoadingChats ? (
            <div className="p-4 text-center">
              <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${colorClasses.spinner} mx-auto mb-2`}></div>
              <p className="text-sm text-neutral-400">Cargando conversaciones...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare className="w-12 h-12 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">No hay conversaciones</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedChat?.id === chat.id
                      ? `${colorClasses.hover} border ${colorClasses.border}`
                      : 'hover:bg-neutral-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {chat.profilePic ? (
                      <img 
                        src={chat.profilePic} 
                        alt={chat.title || chat.name || 'Avatar'} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-8 h-8 ${colorClasses.bgLight} rounded-full flex items-center justify-center ${colorClasses.text}`}>
                        {getChatIcon(chat.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {chat.title || chat.name || chat.username || `Chat ${chat.id}`}
                      </p>
                      {chat.type && (
                        <p className="text-xs text-neutral-400 capitalize">
                          {chat.type}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 flex flex-col bg-neutral-900">
        {selectedChat ? (
          <>
            {/* Header de la conversación */}
            <div className="p-4 border-b border-neutral-700 bg-neutral-800">
              <div className="flex items-center gap-3">
                {selectedChat.profilePic ? (
                  <img 
                    src={selectedChat.profilePic} 
                    alt={selectedChat.title || selectedChat.name || 'Avatar'} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-10 h-10 ${colorClasses.bg} rounded-full flex items-center justify-center text-white`}>
                    {getChatIcon(selectedChat.type)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedChat.title || selectedChat.name || selectedChat.username || `Chat ${selectedChat.id}`}
                  </h3>
                  <p className="text-sm text-neutral-400 capitalize">
                    {channel} {selectedChat.type && `• ${selectedChat.type}`}
                  </p>
                </div>
              </div>
            </div>

            {/* MessageThread genérico para todas las plataformas */}
            <MessageThread 
              key={messageRefreshKey}
              threadId={selectedChat.id} 
              token={token || ''} 
              channel={channel}
            />

            {/* MessageInput genérico para todas las plataformas */}
            <MessageInput 
              onSend={sendMessage}
              placeholder={`Escribe un mensaje en ${channel}...`}
              disabled={!token}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-neutral-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Selecciona una conversación
              </h3>
              <p className="text-neutral-400">
                Elige una conversación de {channel} para comenzar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

