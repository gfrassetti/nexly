"use client";

import { useState } from "react";
import { useContacts } from "@/hooks/useContacts";
import { useMessages } from "@/hooks/useMessages";
import { sendMessage } from "@/hooks/sendMessage";
import Composer from "@/components/Composer";

export default function InboxPage() {
  const integrationId = "whatsapp"; // o el que elija el user
  /* const { contacts, loading: loadingContacts } = useContacts(integrationId); */

  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  /* const { messages, loading: loadingMessages } = useMessages(selectedContact); */
  const { items: contacts, loading: loadingContacts } =
    useContacts(integrationId);
  const { items: messages } = useMessages(selectedContact ?? "");

  async function handleSend(text: string) {
    if (!selectedContact) return;
    await sendMessage(token, {
      provider: "whatsapp",
      contactId: selectedContact, // <-- id del contacto seleccionado
      body: text,
    });
  }

  return (
    <div className="flex h-full">
      {/* Lista de contactos */}
      <div className="w-64 border-r overflow-y-auto">
        {loadingContacts && <div>Cargando contactos...</div>}
        {contacts.map((c) => (
          <div
            key={c._id}
            onClick={() => setSelectedContact(c._id)}
            className={`p-2 cursor-pointer ${
              c._id === selectedContact ? "bg-neutral-700" : ""
            }`}
          >
            {c.name || c.phone}
          </div>
        ))}
      </div>

      {/* Mensajes */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {loadingMessages && <div>Cargando mensajes...</div>}
          {messages.map((m) => (
            <div
              key={m._id}
              className={`my-1 ${
                m.direction === "out" ? "text-right" : "text-left"
              }`}
            >
              <span
                className={`inline-block px-3 py-2 rounded ${
                  m.direction === "out"
                    ? "bg-green-600 text-white"
                    : "bg-neutral-700"
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
        </div>

        {/* Composer */}
        {selectedContact && (
          <Composer
            contactId={selectedContact}
            token={"fakeToken"} // aquí usarías el de Zustand
            onSend={handleSend}
          />
        )}
      </div>
    </div>
  );
}
