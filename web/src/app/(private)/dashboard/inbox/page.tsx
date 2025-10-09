"use client";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import InboxList from "@/components/InboxList";
import MessageThread from "@/components/MessageThread";
import Composer from "@/components/Composer";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo } from "react";
import { sendMessage } from "@/hooks/sendMessage";
import { CHANNELS } from "@/lib/constants";

export default function InboxPage() {
  const { token } = useAuth();
  const { refreshInbox } = useDataRefresh();
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("whatsapp");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversationsData, mutate: mutateConversations, isLoading } = useSWR(
    token ? ["/integrations/conversations", channel] : null,
    async ([p, c]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${p}?provider=${c}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      // Mapear los datos del backend al formato esperado por el componente
      if (data.conversations) {
        data.conversations = data.conversations.map((conv: any) => ({
          id: conv.id,
          title: conv.contactName || conv.title || 'Sin nombre',
          last: conv.lastMessage || conv.last || '',
          at: conv.lastMessageTime || conv.at || new Date().toISOString(),
          unread: conv.unreadCount > 0,
          platform: conv.provider || c,
          avatar: conv.avatar,
          // Información adicional para Telegram
          chatType: conv.chatType,
          telegramUsername: conv.telegramUsername,
          contactPhone: conv.contactPhone
        }));
      }
      
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // Cache por 10 segundos para evitar refetch constante
    }
  );

  // Obtener conversaciones directamente
  const conversations = conversationsData?.conversations || [];

  // Refrescar datos cuando se cambie el canal
  useEffect(() => {
    refreshInbox();
  }, [channel, refreshInbox]);

  async function handleSend(text: string) {
    if (!token || !activeId) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/integrations/conversations/${activeId}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: text })
      });
      
      if (!response.ok) {
        throw new Error('Error enviando mensaje');
      }
      
      console.log('Mensaje enviado correctamente');
      
      // Refrescar las conversaciones
      mutateConversations();
      
      // Importante: Emitir evento DESPUÉS de que el mensaje se envió
      // Esto dispara el refresco en MessageThread
      window.dispatchEvent(new CustomEvent('messageSent', { 
        detail: { threadId: activeId } 
      }));
      
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error; // Re-lanzar para que Composer lo maneje
    }
  }

  return (
    <div className="h-full flex flex-col bg-neutral-900 text-white">
      {/* Header con pestañas de canales (Esta sección es fija) */}
      <div className="border-b border-neutral-700 bg-neutral-800 flex-shrink-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize flex items-center gap-2 ${
                  channel === c 
                    ? "bg-green-600 text-white shadow-lg" 
                    : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading && channel === c && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {c}
              </button>
            ))}
          </div>
          
          {/* Contador de conversaciones */}
          <div className="text-sm text-neutral-400">
            {conversationsData?.conversations?.length || 0} conversaciones
          </div>
        </div>
        
        {/* Barra de búsqueda */}
        <div className="px-4 pb-4">
          <div className="relative">
            <input
              type="text"
              placeholder={`Buscar conversaciones en ${channel}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 pl-10 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-2.5 text-neutral-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar con lista de conversaciones */}
        {/* Añadimos flex flex-col y min-h-0 para que el InboxList pueda usar flex-1 */}
        <div className="w-80 border-r border-neutral-700 bg-neutral-800 flex flex-col h-screen">
          
          {/* ENVOLTURA CLAVE: Añadimos flex-1 y overflow-y-auto para SCROLL en la lista */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3">
                    <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <InboxList
                items={conversations}
                activeId={activeId}
                onSelect={setActiveId}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </div>
        
        {/* Área de conversación */}
        {/* flex-1 flex flex-col min-w-0 es correcto para el layout de la conversación */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Área de mensajes con scroll independiente */}
          {/* flex-1 y overflow-y-auto hacen que el hilo de mensajes crezca y tenga SCROLL */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex-1 flex flex-col bg-neutral-900">
                {/* Header skeleton */}
                <div className="border-b border-neutral-700 bg-neutral-800 p-4">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                </div>

                {/* Messages skeleton */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={i % 2 === 0 ? "flex justify-start" : "flex justify-end"}>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <MessageThread threadId={activeId} token={token || ""} channel={channel} />
            )}
          </div>
          
          {/* Composer fijo en la parte inferior */}
          {/* flex-shrink-0 asegura que el compositor NO se encoja */}
          <div className="flex-shrink-0">
            <Composer
              threadId={activeId}
              token={token || ""}
              onSend={handleSend}
              channel={channel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
