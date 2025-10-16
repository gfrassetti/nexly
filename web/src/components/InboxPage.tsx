"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import apiFetch from "@/lib/api";
import InboxList from "@/components/InboxList";
import MessageThread from "@/components/MessageThread";
import Composer from "@/components/Composer";
import { sendMessage } from "@/hooks/sendMessage";
import { CHANNELS } from "@/lib/constants";

export default function InboxPage() {
  const { token } = useAuth();
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("whatsapp");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: threads } = useSWR(
    token ? ["/inbox", channel] : null,
    ([p, c]) => apiFetch(`${p}?channel=${c}`, {}, token!)
  );

  async function handleSend(text: string) {
    if (!activeId || !token) return;
    await sendMessage(token, {
      provider: channel,
      contactId: activeId,
      body: text,
    });
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 sm:gap-2 p-2 sm:p-3 border-b overflow-x-auto">
        {CHANNELS.map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={`px-2 sm:px-3 py-1 rounded-md border text-xs sm:text-sm whitespace-nowrap ${
              channel === c ? "bg-black text-accent-cream" : "bg-white text-black"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex flex-1 min-h-0">
        {/* Sidebar con lista de conversaciones - Hidden on mobile when conversation is active */}
        <div className={`${activeId ? 'hidden lg:flex' : 'flex'} w-full lg:w-[360px] border-r flex-col h-full overflow-hidden`}>
          <InboxList
            items={threads?.items || []}
            activeId={activeId}
            onSelect={setActiveId}
          />
        </div>
        
        {/* Área de conversación */}
        <div className={`${activeId ? 'flex' : 'hidden lg:flex'} flex-1 flex-col h-full overflow-hidden`}>
          {/* Back button for mobile */}
          {activeId && (
            <div className="lg:hidden border-b p-2">
              <button
                onClick={() => setActiveId(null)}
                className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver a conversaciones
              </button>
            </div>
          )}
          
          <div className="flex-1 overflow-hidden grid grid-rows-[1fr_auto]">
            <MessageThread threadId={activeId} token={token || ""} />
            <Composer
              threadId={activeId}
              token={token || ""}
              onSend={handleSend}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
