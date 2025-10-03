"use client";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useDataRefresh } from "@/hooks/useDataRefresh";
import InboxList from "@/components/InboxList";
import MessageThread from "@/components/MessageThread";
import Composer from "@/components/Composer";
import { useState, useEffect } from "react";
import { sendMessage } from "@/hooks/sendMessage";
import { CHANNELS } from "@/lib/constants";

export default function InboxPage() {
  const { token } = useAuth();
  const { refreshInbox } = useDataRefresh();
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("whatsapp");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversationsData } = useSWR(
    token ? ["/integrations/conversations", channel] : null,
    async ([p, c]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${p}?provider=${c}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    }
  );

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
      
      // Refrescar la conversación
      refreshInbox();
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return (
    <div className="h-full flex flex-col bg-neutral-900 text-white">
      {/* Header con pestañas de canales */}
      <div className="border-b border-neutral-700 bg-neutral-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  channel === c 
                    ? "bg-green-600 text-white shadow-lg" 
                    : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                }`}
              >
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
        <div className="w-80 border-r border-neutral-700 bg-neutral-800 flex flex-col">
          <InboxList
            items={conversationsData?.conversations || []}
            activeId={activeId}
            onSelect={setActiveId}
            searchQuery={searchQuery}
          />
        </div>
        
        {/* Área de conversación */}
        <div className="flex-1 flex flex-col min-w-0">
          <MessageThread threadId={activeId} token={token || ""} channel={channel} />
          <Composer
            threadId={activeId}
            token={token || ""}
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );
}
