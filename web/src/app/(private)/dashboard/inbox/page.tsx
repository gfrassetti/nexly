"use client";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import InboxList from "@/components/InboxList";
import MessageThread from "@/components/MessageThread";
import Composer from "@/components/Composer";
import { useState } from "react";
import { sendMessage } from "@/hooks/sendMessage";

const channels = ["whatsapp", "instagram", "messenger"] as const;

export default function InboxPage() {
  const { token } = useAuth();
  const [channel, setChannel] = useState<(typeof channels)[number]>("whatsapp");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: conversationsData } = useSWR(
    token ? ["/integrations/conversations", channel] : null,
    async ([p, c]) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${p}?provider=${c}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    }
  );

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
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return (
    <div className="h-full grid grid-rows-[auto_1fr_auto]">
      <div className="flex gap-2 p-3 border-b">
        {channels.map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={`px-3 py-1 rounded-md border ${
              channel === c ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[360px_1fr] min-h-0">
        <InboxList
          items={conversationsData?.conversations || []}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <div className="min-w-0 grid grid-rows-[1fr_auto]">
          <MessageThread threadId={activeId} token={token || ""} />
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
