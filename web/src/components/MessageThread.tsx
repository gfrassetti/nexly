"use client";
import useSWR from "swr";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageThreadProps {
  threadId: string | null;
  token?: string;
  channel?: string;
  onMessageSent?: () => void;
}

type Message = {
  id: string;
  content: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'document';
  status?: 'sent' | 'delivered' | 'read';
};

export default function MessageThread({ threadId, token, channel, onMessageSent }: MessageThreadProps) {
  // Ref para hacer auto-scroll al final cuando lleguen nuevos mensajes
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Validar que el threadId corresponda al canal actual
  const isValidThread = threadId && channel && (
    // Para Telegram, el threadId debe contener "telegram_" o ser un ID numérico (como 777000)
    (channel === 'telegram' && (threadId.includes('telegram_') || /^\d+$/.test(threadId))) ||
    // Para WhatsApp, el threadId debe contener "whatsapp_" o ser un número de teléfono
    (channel === 'whatsapp' && (threadId.includes('whatsapp_') || /^\d+$/.test(threadId))) ||
    // Para Instagram, el threadId debe contener "instagram_"
    (channel === 'instagram' && threadId.includes('instagram_')) ||
    // Para Messenger, el threadId debe contener "messenger_" o ser un ID de Facebook
    (channel === 'messenger' && (threadId.includes('messenger_') || /^\d+$/.test(threadId)))
  );

  const { data: messagesData, mutate: mutateMessages, isLoading } = useSWR(
    threadId && token && isValidThread ? [`/integrations/conversations/${threadId}/messages`, token, channel] : null,
    async ([url, t, c]) => {
      let fetchUrl = url;
      
      // Para Telegram, usar endpoint específico
      if (c === 'telegram') {
        fetchUrl = `/telegram/messages/${threadId}`;
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${fetchUrl}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      
      
      // Mapear los datos del backend al formato esperado por el componente
      if (data.messages) {
        const mappedMessages = data.messages.map((msg: any) => {
          // Mapeo específico por canal
          let content = '';
          let timestamp = '';
          let direction: 'inbound' | 'outbound' = 'inbound';
          
          if (c === 'telegram') {
            // Estructura específica de Telegram
            content = msg.text || '';
            timestamp = msg.date ? new Date(msg.date).toISOString() : new Date().toISOString();
            direction = msg.isOutgoing ? 'outbound' : 'inbound';
          } else {
            // Estructura genérica para otras plataformas
            content = msg.body || msg.content || msg.text || '';
            timestamp = msg.timestamp || msg.date ? new Date(msg.timestamp || msg.date).toISOString() : new Date().toISOString();
            direction = msg.from === 'business' || msg.isOutgoing ? 'outbound' : 'inbound';
          }
          
          return {
            id: msg.id?.toString() || msg.messageId || Math.random().toString(),
            content,
            timestamp,
            direction,
            type: 'text' as const,
            status: msg.status || 'delivered' as const
          };
        });
        
        // ✅ INVERTIR ORDEN: Más viejos arriba, más nuevos abajo
        const sortedMessages = mappedMessages.reverse();
        return sortedMessages;
      }
      
      return [];
    },
    {
      refreshInterval: 5000, // Refrescar cada 5 segundos
      revalidateOnFocus: true, // Refrescar cuando la ventana recupera el foco
      revalidateOnReconnect: true // Refrescar cuando se reconecta
    }
  );

  const messages = messagesData || [];

  // Refrescar mensajes cuando se envíe un mensaje
  useEffect(() => {
    const refreshMessages = (event: Event) => {
      const customEvent = event as CustomEvent;
      // Opcional: Solo refrescar si es el thread activo
      // if (customEvent.detail.threadId === threadId) { 
        mutateMessages();
      // }
    };
    
    // Escuchar el evento de mensaje enviado
    window.addEventListener('messageSent', refreshMessages);
    
    return () => {
      window.removeEventListener('messageSent', refreshMessages);
    };
  }, [threadId, mutateMessages]);

  // Auto-scroll al final cuando cambien los mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Formatear tiempo
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Iconos de estado
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>;
      case 'delivered':
        return (
          <div className="flex">
            <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
            <div className="w-2 h-2 bg-neutral-400 rounded-full -ml-1"></div>
          </div>
        );
      case 'read':
        return (
          <div className="flex">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full -ml-1"></div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!threadId || !isValidThread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-accent-dark">
        <div className="text-center text-neutral-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">Selecciona una conversación</h3>
          <p className="text-sm">Elige una conversación de {channel} para comenzar a chatear</p>
        </div>
      </div>
    );
  }

  // Mostrar skeleton mientras carga
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-accent-dark">
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

        {/* Messages area skeleton */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Incoming message */}
          <div className="flex justify-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          {/* Outgoing message */}
          <div className="flex justify-end">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>

          {/* Incoming message */}
          <div className="flex justify-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          {/* Outgoing message */}
          <div className="flex justify-end">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>

          {/* Incoming message */}
          <div className="flex justify-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-18" />
            </div>
          </div>

          {/* Outgoing message */}
          <div className="flex justify-end">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-accent-dark">
      {/* Header de la conversación */}
      <div className="border-b border-neutral-700 bg-neutral-800 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-accent-cream font-semibold">
            {threadId.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-accent-cream">Conversación {threadId}</h3>
            <p className="text-sm text-neutral-400 capitalize">{channel} • Activo</p>
          </div>
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message: Message, index: number) => {
          return (
          <div
            key={message.id}
            className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.direction === 'outbound'
                  ? 'bg-green-600 text-accent-cream'
                  : 'bg-neutral-700 text-accent-cream'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs opacity-70">
                  {formatTime(message.timestamp)}
                </span>
                {message.direction === 'outbound' && (
                  <div className="ml-1">
                    {getStatusIcon(message.status)}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
        {/* Elemento invisible para hacer scroll al final */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
