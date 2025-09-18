"use client";
import { useState } from "react";
import { useContacts } from "@/hooks/useContacts";
import ContactList, { ContactItem } from "@/components/ContactList";
import { createContact } from "@/lib/api";

const INTEGRATIONS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "messenger", label: "Messenger" },
];

export default function ContactsPage() {
  const [integrationId, setIntegrationId] = useState("whatsapp");
  const { items: contacts, loading, error } = useContacts(integrationId);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);

async function handleSaveContact(data: any) {
  const token = localStorage.getItem("token") || "";
  const payload = { ...data, integrationId }; // opcional si querés etiquetar por canal
  await createContact(token, payload);
  setSelectedContact(null);
  location.reload();
}

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">Contactos</h2>
        <select
          value={integrationId}
          onChange={(e) => setIntegrationId(e.target.value)}
          className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700"
          title="Canal"
        >
          {INTEGRATIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Cargando contactos...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        <ContactList
          items={contacts.map((c: any) => ({
            id: c._id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            integrationId: c.integrationId,
          }))}
          onEdit={(c) => setSelectedContact(c)}
          onDelete={(id) => console.log("Eliminar contacto", id)}
        />
      </div>
    </div>
  );
}
