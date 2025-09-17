"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { id: "resumen", label: "Resumen", href: "/dashboard" },
  { id: "inbox", label: "Inbox", href: "/dashboard/inbox" },
  { id: "contacts", label: "Contactos", href: "/dashboard/contacts" },
  { id: "integrations", label: "Integraciones", href: "/dashboard/integrations" },
];


export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen sticky top-0 border-r border-neutral-800 p-3 flex flex-col gap-2">
      <div className="text-lg font-semibold px-2 py-1">Nexly</div>
      {items.map((i) => (
        <Link
          key={i.id}
          href={i.href}
          className={`w-full text-left px-4 py-2 rounded-lg transition ${
            pathname === i.href
              ? "bg-neutral-700"
              : "hover:bg-neutral-800"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </aside>
  );
}
