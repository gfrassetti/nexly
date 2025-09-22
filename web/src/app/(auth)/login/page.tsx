import { Suspense } from "react";
import AuthGuard from "@/components/AuthGuard";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-svh grid place-items-center p-6 bg-neutral-900">
        <Suspense fallback={<div className="text-white">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthGuard>
  );
}