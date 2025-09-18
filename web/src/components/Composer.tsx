"use client";
import { useState } from "react";

type ComposerProps = {
  threadId: string | null;
  token: string;
  onSend: (text: string) => Promise<void>;
};

export default function Composer({ threadId, token, onSend }: ComposerProps) {
  const [text, setText] = useState("");

  return (
    <div className="p-2 border-t flex gap-2">
      <input
        className="flex-1 border px-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe un mensaje..."
      />
      <button
        onClick={async () => {
          if (!text.trim()) return;
          await onSend(text);
          setText("");
        }}
        className="bg-black text-white px-3 py-1 rounded"
      >
        Enviar
      </button>
    </div>
  );
}
