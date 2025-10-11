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
import { useSearchParams } from "next/navigation";

export default function InboxPage() {
  const { token } = useAuth();
  const { refreshInbox } = useDataRefresh();
  const searchParams = useSearchParams();
  const contactId = searchParams.get('contact');
  
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("whatsapp");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversationsData, mutate: mutateConversations, isLoading } = useSWR(
    token ? ["/integrations/conversations", channel] : null,
    async ([p, c]) => {
      let fetchUrl;
      let listPropertyName; // Propiedad que contiene la lista (chats, conversations, etc.)

      // 1. Determinar la URL y la propiedad de la lista según el canal
      if (c === 'telegram') {
        // Si es Telegram, usa la ruta específica que definiste
        fetchUrl = '/telegram/chats';
        listPropertyName = 'chats'; // Telegram devuelve la lista bajo la propiedad 'chats'
      } else {
        // Si es otro canal (whatsapp, instagram), usa la ruta genérica
        fetchUrl = `${p}?provider=${c}`;
        listPropertyName = 'conversations'; // Otros canales devuelven la lista bajo 'conversations'
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${fetchUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      // 2. Mapear y normalizar los datos del backend
      if (data[listPropertyName]) {
        // Usamos la propiedad de lista determinada dinámicamente
        data.conversations = data[listPropertyName].map((conv: any) => {
          // Mejorar el mapeo de nombres para Telegram
          let title = conv.contactName || conv.title || conv.name;
          
          // Para conversaciones privadas de Telegram, usar username o firstName
          if (c === 'telegram' && !title) {
            title = conv.username || conv.firstName || conv.lastName || 'Usuario Desconocido';
          }
          
          // Fallback final
          if (!title) {
            title = 'Sin nombre';
          }
          
          return {
            id: String(conv.id), // Asegurarse de que el ID es un string
            title: title,
            last: conv.lastMessage || conv.last || 'Último mensaje no disponible',
            at: conv.lastMessageTime || conv.at || new Date().toISOString(),
            unread: conv.unreadCount > 0,
            platform: conv.provider || c,
            avatar: conv.avatar,
            // Información adicional para Telegram
            chatType: conv.chatType,
            telegramUsername: conv.telegramUsername,
            contactPhone: conv.contactPhone
          };
        });
      } else {
        // Si la propiedad esperada no existe, devolver un array vacío para evitar errores
        data.conversations = [];
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

  // Hook para obtener información del contacto si hay contactId en la URL
  const { data: contactData, isLoading: isLoadingContact } = useSWR(
    contactId && token ? `/contacts/${contactId}` : null,
    async (url) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Contact not found');
      }
      return res.json();
    }
  );

  // Auto-seleccionar integración y conversación cuando hay contactId
  useEffect(() => {
    if (contactId && contactData && conversationsData) {
      console.log("Auto-selecting conversation for contact:", {
        contactId,
        contactData,
        conversationsCount: conversationsData.conversations?.length || 0
      });

      // 1. Auto-seleccionar la integración correcta basada en el contacto
      const contactProvider = contactData.provider;
      if (contactProvider && CHANNELS.includes(contactProvider)) {
        setChannel(contactProvider);
        console.log("Set channel to:", contactProvider);
      }

      // 2. Buscar y seleccionar la conversación correspondiente al contacto
      const conversations = conversationsData.conversations || [];
      console.log("Available conversations:", conversations.map((c: any) => ({
        id: c.id,
        title: c.title,
        contactId: c.contactId,
        contactPhone: c.contactPhone,
        telegramUsername: c.telegramUsername
      })));

      // Buscar por múltiples criterios
      const matchingConversation = conversations.find((conv: any) => {
        // 1. ID directo del contacto
        if (conv.id === contactId || conv.contactId === contactId) {
          console.log("Found by ID match:", conv.id);
          return true;
        }

        // 2. Por teléfono
        if (contactData.phone && conv.contactPhone === contactData.phone) {
          console.log("Found by phone match:", conv.contactPhone);
          return true;
        }

        // 3. Por username de Telegram
        if (contactData.platformData?.telegramUsername && 
            conv.telegramUsername === contactData.platformData.telegramUsername) {
          console.log("Found by Telegram username:", conv.telegramUsername);
          return true;
        }

        // 4. Por nombre (como último recurso)
        if (contactData.name && conv.title?.toLowerCase().includes(contactData.name.toLowerCase())) {
          console.log("Found by name match:", conv.title);
          return true;
        }

        return false;
      });

      if (matchingConversation) {
        console.log("Auto-selecting conversation:", matchingConversation.id);
        setActiveId(matchingConversation.id);
      } else {
        console.log("No matching conversation found");
      }
    }
  }, [contactId, contactData, conversationsData]);

  // Refrescar datos cuando se cambie el canal
  useEffect(() => {
    refreshInbox();
    // Limpiar la conversación activa cuando cambies de canal (solo si no hay contactId)
    if (!contactId) {
      setActiveId(null);
    }
  }, [channel, refreshInbox, contactId]);

  async function handleSend(text: string) {
    if (!token || !activeId) return;
    
    try {
      let endpoint;
      
      // Determinar el endpoint según el canal
      if (channel === 'telegram') {
        endpoint = `/telegram/send-message`;
      } else {
        endpoint = `/integrations/conversations/${activeId}/reply`;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: text,
          ...(channel === 'telegram' && { chatId: activeId })
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      
      // 1. Refrescar las conversaciones (actualizar el 'lastMessage' en el sidebar)
      await mutateConversations();
      
      // 2. ⏳ Añadir un pequeño retraso de 200ms para dar tiempo al backend
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 3. Emitir evento para que MessageThread actualice el hilo
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
          
          {/* Contador de conversaciones y estado de contacto */}
          <div className="flex items-center gap-4 text-sm text-neutral-400">
            {contactId && isLoadingContact && (
              <div className="flex items-center gap-2 text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                Cargando contacto...
              </div>
            )}
            {contactId && contactData && (
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {contactData.name || contactData.phone || 'Contacto seleccionado'}
              </div>
            )}
            <span>{conversationsData?.conversations?.length || 0} conversaciones</span>
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
        <div className="w-80 border-r border-neutral-700 bg-neutral-800 flex flex-col h-screen overflow-hidden">
          
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
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          
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
