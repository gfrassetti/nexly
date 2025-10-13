import { Suspense } from "react";
import AuthGuard from "@/components/AuthGuard";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-svh grid place-items-center p-6 bg-accent-dark">
        <Suspense fallback={<div className="text-accent-cream">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
