import Link from "next/link";
import { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Precios - Nexly | Planes desde $30 USD/mes",
  description: "Elige tu plan perfecto. Plan Básico $30 USD/mes (450 conversaciones) o Premium $60 USD/mes (900 conversaciones). 7 días gratis. WhatsApp Business Platform.",
  keywords: ["precios", "planes", "suscripción", "WhatsApp Business Platform", "WhatsApp Business", "mensajería unificada", "USD", "Cloud API", "conversaciones"],
  openGraph: {
    title: "Precios Nexly - Planes desde $30 USD/mes",
    description: "Plan Básico: 450 conversaciones/mes. Plan Premium: 900 conversaciones/mes. 7 días gratis. WhatsApp Business Platform.",
    type: "website",
    locale: "es_AR",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
