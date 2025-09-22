import { Metadata } from "next";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Restablecer contraseña - Nexly",
  description: "Restablece tu contraseña de Nexly usando el enlace de recuperación.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
