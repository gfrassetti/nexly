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
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      // Redirigir a login si requiere autenticación pero no está logueado
      router.replace("/login");
      return;
    }

    if (!requireAuth && isAuthenticated) {
      // Solo redirigir a pricing si no viene de un pago exitoso
      const currentPath = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const trialStarted = searchParams.get('trial_started');
      
      // Si viene de un pago exitoso o está en dashboard, no redirigir
      if (currentPath === '/dashboard' || trialStarted === 'true') {
        return;
      }
      
      // Redirigir a pricing solo para otras páginas
      router.replace("/pricing");
      return;
    }
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
