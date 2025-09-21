"use client";
import { useAuth } from "@/hooks/useAuth";

export default function Topbar() {
  const { user, clear } = useAuth();

  const handleLogout = () => {
    // Limpiar localStorage
    localStorage.removeItem("token");
    
    // Limpiar cookie
    document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
    
    // Limpiar estado de Zustand
    clear();
    
    // Redirigir a login
    window.location.href = "/login";
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-neutral-900">
      <div className="text-sm text-neutral-300">Panel</div>
      <div className="flex items-center gap-2">
        {user && (
          <span className="text-sm text-neutral-300">
            Hola, {user.username}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
