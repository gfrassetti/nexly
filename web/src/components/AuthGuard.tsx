"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Loader from "@/components/Loader";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // true para proteger rutas, false para redirigir si ya está logueado
}

export default function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const router = useRouter();
  const { token, user, clear, isLoading } = useAuth();
  const isAuthenticated = !!(token && user);

  // No necesitamos useEffect aquí, el hook useAuth maneja todo

  useEffect(() => {
    console.log("🛡️ AuthGuard - Estado:", { isLoading, isAuthenticated, requireAuth, token: token ? "***" : "null", user: user ? "***" : "null" });
    
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      console.log("🛡️ AuthGuard - Redirigiendo a login (requiere auth pero no está autenticado)");
      // Redirigir a login si requiere autenticación pero no está logueado
      router.replace("/login");
      return;
    }

    if (!requireAuth && isAuthenticated) {
      console.log("🛡️ AuthGuard - Redirigiendo a dashboard (está autenticado pero en página de auth)");
      // Redirigir al dashboard si está autenticado y está en páginas de auth
      router.replace("/dashboard");
      return;
    }
    
    console.log("🛡️ AuthGuard - Permitiendo acceso");
  }, [isAuthenticated, isLoading, requireAuth, router]);

  // Mostrar loading mientras verifica autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent-dark">
        <Loader size="lg" text="Verificando autenticación..." />
      </div>
    );
  }

  // Si no está autenticado y requiere autenticación, no mostrar nada (se redirige)
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Si está autenticado y no requiere autenticación, no mostrar nada (se redirige)
  if (!requireAuth && isAuthenticated) {
    return null;
  }

  // Mostrar el contenido si la autenticación es correcta
  return <>{children}</>;
}
