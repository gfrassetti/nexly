"use client";

interface MessageThreadProps {
  threadId: string | null;
  token?: string;
}

export default function MessageThread({ threadId, token }: MessageThreadProps) {
  if (!threadId) {
    return (
      <div className="flex items-center justify-center text-neutral-400">
        Selecciona una conversación
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-sm text-neutral-300">Mostrando mensajes para {threadId}</p>
      {token && <p className="text-xs text-neutral-500">Token disponible</p>}
    </div>
  );
}
