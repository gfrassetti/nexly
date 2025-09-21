"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NexlyLogo = () => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 flex items-center justify-center">
      <img 
        src="/logo_nexly.png" 
        alt="Nexly Logo" 
        className="w-full h-full object-contain"
      />
    </div>
    <span className="font-bold text-lg text-white tracking-tight">Nexly</span>
  </div>
);

const items = [
  { id: "resumen", label: "Resumen", href: "/dashboard" },
  { id: "inbox", label: "Inbox", href: "/dashboard/inbox" },
  { id: "contacts", label: "Contactos", href: "/dashboard/contacts" },
  { id: "integrations", label: "Integraciones", href: "/dashboard/integrations" },
];


export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen sticky top-0 border-r border-neutral-800 p-4 flex flex-col gap-4">
      <div className="px-2 py-2">
        <NexlyLogo />
      </div>
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
