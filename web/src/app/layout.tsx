import "./globals.css";
import { ReactNode } from "react";
import { SubscriptionInfoProvider } from "@/contexts/SubscriptionInfoContext";
import { StatsProvider } from "@/contexts/StatsContext";
import { Toaster } from "@/components/ui/sonner";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexly - Unifica WhatsApp Business, Instagram y Messenger",
  description: "Conecta WhatsApp Business Platform, Instagram y Messenger. Gestiona todas tus conversaciones, automatiza respuestas y convierte más clientes.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/favicon-32x32.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="tiktok-developers-site-verification" content="Gg1eA1FGX1VTzccgcatQG26Cw1Jhq0xt" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon-32x32.png" />
      </head>
      <body>
        <SubscriptionInfoProvider>
          <StatsProvider>
            {children}
            <Toaster />
          </StatsProvider>
        </SubscriptionInfoProvider>
      </body>
    </html>
  );
}
