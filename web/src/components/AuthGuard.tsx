"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

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
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      // Redirigir a login si requiere autenticación pero no está logueado
      router.replace("/login");
      return;
    }

    if (!requireAuth && isAuthenticated) {
      // Redirigir a dashboard si no requiere autenticación pero ya está logueado
      router.replace("/dashboard");
      return;
    }
  }, [isAuthenticated, isLoading, requireAuth, router]);

  // Mostrar loading mientras verifica autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Verificando autenticación...</p>
        </div>
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
