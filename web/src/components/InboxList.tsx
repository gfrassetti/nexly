"use client";

export default function InboxList({ provider }: { provider: string }) {
  // Placeholder. Aquí puedes traer últimas conversaciones por provider.
  const items = [
    { id: "1", title: "Juan Perez", last: "¿Tenés stock?", at: "10:31" },
    { id: "2", title: "Maria", last: "Gracias!", at: "09:12" },
  ];

  return (
    <ul className="divide-y divide-neutral-800">
      {items.map((it) => (
        <li key={it.id} className="p-3 hover:bg-neutral-800/60 cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="font-medium">{it.title}</div>
            <div className="text-xs text-neutral-400">{it.at}</div>
          </div>
          <div className="text-sm text-neutral-300">{it.last}</div>
        </li>
      ))}
    </ul>
  );
}
