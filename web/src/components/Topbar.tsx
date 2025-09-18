"use client";

export default function Topbar() {
  return (
    <header className="h-12 flex items-center justify-between px-4 bg-neutral-900">
      <div className="text-sm text-neutral-300">Panel</div>
      <div className="flex items-center gap-2">
        {/* Aquí podrías mostrar el usuario logueado */}
        <button
          onClick={() => {
            // logout simple: borra cookie y recarga
            document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
            location.href = "/login";
          }}
          className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
