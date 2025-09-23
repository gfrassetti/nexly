import "./globals.css";
import { ReactNode } from "react";
import { SubscriptionInfoProvider } from "@/contexts/SubscriptionInfoContext";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SubscriptionInfoProvider>
          {children}
        </SubscriptionInfoProvider>
      </body>
    </html>
  );
}
