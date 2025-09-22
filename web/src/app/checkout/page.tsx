import { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout - Nexly | Completa tu suscripción",
  description: "Completa tu suscripción a Nexly y comienza tu período de prueba gratuito de 7 días.",
  robots: {
    index: false,
    follow: false,
  },
};

// Forzar SSR para páginas de pago (requieren autenticación)
export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return <CheckoutClient />;
}
