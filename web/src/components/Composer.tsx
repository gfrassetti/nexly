"use client";

import { useState } from "react";

interface ComposerProps {
  threadId: string | null;
  token?: string;
}

export default function Composer({ threadId, token }: ComposerProps) {
  const [text, setText] = useState("");

  if (!threadId) {
    return null; // no mostramos composer si no hay thread seleccionado
  }

  const send = () => {
    if (!text.trim()) return;
    console.log("Enviar mensaje:", { threadId, text, token });
    setText("");
  };

  return (
    <div className="flex gap-2 p-2 border-t border-neutral-800">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe un mensaje..."
        className="flex-1 bg-neutral-900 text-white p-2 rounded"
      />
      <button
        onClick={send}
        className="px-3 py-1 bg-blue-600 text-white rounded"
      >
        Enviar
      </button>
    </div>
  );
}
