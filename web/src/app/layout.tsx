import "./globals.css";
import { ReactNode } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
