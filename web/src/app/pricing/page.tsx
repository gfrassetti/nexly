import Link from "next/link";
import { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Precios - Nexly | Planes desde $2.999 ARS/mes",
  description: "Elige tu plan perfecto. Plan Básico desde $2.999 ARS/mes o Premium desde $5.999 ARS/mes. 7 días gratis, tarjeta requerida.",
  keywords: ["precios", "planes", "suscripción", "WhatsApp Business", "mensajería unificada", "ARS"],
  openGraph: {
    title: "Precios Nexly - Planes desde $2.999 ARS/mes",
    description: "Elige tu plan perfecto. 7 días gratis, tarjeta requerida.",
    type: "website",
    locale: "es_AR",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
