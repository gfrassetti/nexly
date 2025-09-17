export default function HomePage() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Nexly</h1>
      <p className="text-lg text-neutral-600 max-w-xl mb-8">
        Unifica WhatsApp, Instagram y Messenger en un solo panel. Gestiona tus
        clientes y mide resultados.
      </p>
      <div className="flex gap-4">
        <a
          href="/login"
          className="px-6 py-3 rounded-md bg-black text-white font-medium"
        >
          Iniciar sesión
        </a>
        <a href="/register" className="px-6 py-3 rounded-md border font-medium">
          Probar gratis
        </a>
      </div>
    </main>
  );
}
