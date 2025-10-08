"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Logo from "./Logo";

const items = [
  { id: "resumen", label: "Resumen", href: "/dashboard" },
  { id: "inbox", label: "Inbox", href: "/dashboard/inbox" },
  { id: "contacts", label: "Contactos", href: "/dashboard/contacts" },
  { id: "integrations", label: "Integraciones", href: "/dashboard/integrations" },
  { id: "subscription", label: "Mi Suscripción", href: "/dashboard/subscription" },
];


export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen sticky top-0 border-r border-neutral-800 p-4 flex flex-col gap-4">
      <div className="px-2 py-2">
        <Logo size="md" className="h-[4rem]" />
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
