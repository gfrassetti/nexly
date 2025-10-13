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
    <div className="h-full grid grid-rows-[auto_1fr_auto]">
      <div className="flex gap-2 p-3 border-b">
        {CHANNELS.map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={`px-3 py-1 rounded-md border ${
              channel === c ? "bg-black text-accent-cream" : "bg-white text-black"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[360px_1fr] min-h-0">
        <InboxList
          items={threads?.items || []}
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
