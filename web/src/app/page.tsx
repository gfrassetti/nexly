import Link from "next/link";
import ClientNavigation from "@/components/ClientNavigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexly - Unifica WhatsApp, Instagram y Messenger en un solo lugar",
  description: "Conecta WhatsApp, Instagram y Messenger. Gestiona todas tus conversaciones, automatiza respuestas y convierte más clientes con Nexly. 15 días gratis.",
  keywords: ["WhatsApp Business", "Instagram", "Messenger", "mensajería unificada", "atención al cliente", "automatización"],
  openGraph: {
    title: "Nexly - Unifica tus mensajerías",
    description: "Conecta WhatsApp, Instagram y Messenger. Gestiona todas tus conversaciones, automatiza respuestas y convierte más clientes.",
    type: "website",
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexly - Unifica tus mensajerías",
    description: "Conecta WhatsApp, Instagram y Messenger. 15 días gratis.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-40 p-2 flex items-center justify-center">
                  <img 
                    src="/logo_nexly.png" 
                    alt="Nexly Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </Link>
            </div>

            <ClientNavigation />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Hero Content */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Unifica tus{" "}
              <span className="text-green-500">mensajerías</span>
              <br />
              en un solo lugar
            </h1>
            
            <p className="text-xl text-neutral-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              Conecta WhatsApp, Instagram y Messenger. Gestiona todas tus conversaciones,
              automatiza respuestas y convierte más clientes con Nexly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                href="/register"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-green-500/25 flex items-center gap-2"
              >
                <span>Registrarse y Probar Gratis</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="border border-neutral-600 hover:border-neutral-500 text-neutral-300 hover:text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center gap-2"
              >
                <span>Ver Planes y Precios</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-neutral-400">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                15 días gratis
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Sin tarjeta requerida
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Configuración en 5 minutos
              </div>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div id="features" className="relative bg-neutral-800/50 border-t border-neutral-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Todo lo que necesitas en un lugar</h2>
              <p className="text-neutral-400 text-lg">Integra, gestiona y convierte más clientes</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="text-center p-6 rounded-lg bg-neutral-800/30 border border-neutral-700">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Conecta todas tus apps</h3>
                <p className="text-neutral-400">
                  WhatsApp, Instagram y Messenger en un solo panel de control
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center p-6 rounded-lg bg-neutral-800/30 border border-neutral-700">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Gestiona conversaciones</h3>
                <p className="text-neutral-400">
                  Responde mensajes desde cualquier plataforma sin cambiar de app
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center p-6 rounded-lg bg-neutral-800/30 border border-neutral-700">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Analiza resultados</h3>
                <p className="text-neutral-400">
                  Métricas en tiempo real para optimizar tu atención al cliente
                </p>
              </div>
            </div>
          </div>
      </div>
    </main>

      {/* Footer */}
      <footer id="contact" className="border-t border-neutral-800 bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-40 p-2 flex items-center justify-center">
                <img 
                  src="/logo_nexly.png" 
                  alt="Nexly Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="text-neutral-400 text-sm">
              © 2024 Nexly. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
