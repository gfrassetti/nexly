"use client";

export type ContactItem = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  integrationId?: string;
};

export default function ContactList({
  items,
  onEdit,
  onDelete,
}: {
  items: ContactItem[];
  onEdit: (c: ContactItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="p-4 rounded-xl bg-neutral-800/40 border border-neutral-800 w-full">
      <h3 className="text-lg font-semibold mb-3">Contactos</h3>
      <ul className="space-y-2">
        {(items ?? []).map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between bg-neutral-900 rounded px-3 py-2"
          >
            <span>{c.name || c.phone}</span>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(c)}
                className="text-blue-400 text-sm hover:underline"
              >
                Editar
              </button>
              <button
                onClick={() => onDelete(c.id)}
                className="text-red-400 text-sm hover:underline"
              >
                Eliminarr
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
