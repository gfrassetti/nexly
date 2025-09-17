"use client";
import { useState } from "react";
import { useMessages } from "@/hooks/useMessages";

export default function Composer({
  contactId,
  token,
}: {
  contactId: string;
  token: string;
}) {
  const [body, setBody] = useState("");
  const { sendMessage } = useMessages(token);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    await sendMessage(contactId, body);
    setBody("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribe un mensaje…"
        className="flex-1 px-3 py-2 rounded bg-neutral-900 border border-neutral-700 outline-none"
      />
      <button
        className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500"
        type="submit"
      >
        Enviar
      </button>
    </form>
  );
}
