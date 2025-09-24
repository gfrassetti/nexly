import HomePageContent from "@/components/HomePageContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexly - Unifica WhatsApp Business, Instagram y Messenger en un solo lugar",
  description: "Conecta WhatsApp Business Platform, Instagram y Messenger. Gestiona todas tus conversaciones, automatiza respuestas y convierte más clientes con Nexly. 7 días gratis.",
  keywords: ["WhatsApp Business Platform", "WhatsApp Business", "Instagram", "Messenger", "mensajería unificada", "atención al cliente", "automatización", "Cloud API"],
  openGraph: {
    title: "Nexly - Unifica tus mensajerías",
    description: "Conecta WhatsApp Business Platform, Instagram y Messenger. Gestiona todas tus conversaciones, automatiza respuestas y convierte más clientes.",
    type: "website",
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexly - Unifica tus mensajerías",
    description: "Conecta WhatsApp Business Platform, Instagram y Messenger. 7 días gratis.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return <HomePageContent />;
}