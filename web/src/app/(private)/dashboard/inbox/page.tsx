"use client";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import InboxList from "@/components/InboxList";
import MessageThread from "@/components/MessageThread";
import Composer from "@/components/Composer";
import { useState } from "react";
const channels = ["whatsapp", "instagram", "messenger"] as const;
export default function InboxPage() {
  const token = useAuth((s) => s.token);
  const [channel, setChannel] = useState<(typeof channels)[number]>("whatsapp");
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: threads } = useSWR(
    token ? ["/inbox", channel] : null,
    ([p, c]) => apiFetch(`${p}?channel=${c}`, {}, token!)
  );
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
          items={threads?.items || []}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <div className="min-w-0 grid grid-rows-[1fr_auto]">
          <MessageThread threadId={activeId} token={token || undefined} />
          <Composer threadId={activeId} token={token || undefined} />
        </div>
      </div>
    </div>
  );
}
