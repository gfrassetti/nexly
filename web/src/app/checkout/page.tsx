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

export default function CheckoutPage() {
  return <CheckoutClient />;
}
