"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import ContactForm from "./ContactForm";
import Header from "./Header";
import Footer from "./Footer";

export default function a() {
  const { token, user } = useAuth();
  const router = useRouter();

  // Si está autenticado, redirigir al dashboard
  if (token && user) {
    router.replace("/dashboard");
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,150,190,0.15),transparent_50%)]" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-nexly-azul/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-nexly-light-blue/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Unifica WhatsApp, Instagram y{" "}
              <span className="text-nexly-teal bg-gradient-to-r from-nexly-teal to-nexly-light-blue bg-clip-text text-transparent">Messenger</span>
            </h1>
            <p className="text-xl text-neutral-300 mb-8 max-w-3xl mx-auto">
              Conecta WhatsApp, Instagram y Messenger. Gestiona todas tus conversaciones, 
              automatiza respuestas y convierte más clientes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/register"
                className="bg-nexly-teal hover:bg-nexly-green text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-nexly-teal/25 hover:shadow-nexly-green/25 hover:scale-105"
              >
                <span>Registrarse y Probar Gratis</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="bg-nexly-azul/20 hover:bg-nexly-azul/30 text-nexly-light-blue px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2 border border-nexly-azul/30 hover:border-nexly-azul/50 hover:scale-105"
              >
                <span>Ver Planes y Precios</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 justify-center text-sm text-neutral-400">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-nexly-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-nexly-green font-medium">15 días gratis</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-nexly-azul" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-nexly-green font-medium">Sin tarjeta requerida</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-nexly-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-nexly-green font-medium">Configuración en minutos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para gestionar tus mensajerías
            </h2>
            <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
              Una plataforma unificada para conectar, gestionar y automatizar todas tus conversaciones.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-nexly-teal rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Mensajería Unificada</h3>
              <p className="text-neutral-300">
                Conecta WhatsApp, Instagram y Messenger en una sola interfaz.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-nexly-azul rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Automatización Inteligente</h3>
              <p className="text-neutral-300">
                Automatiza respuestas y gestiona conversaciones de forma eficiente.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-nexly-light-blue rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics Avanzados</h3>
              <p className="text-neutral-300">
                Obtén insights detallados sobre tus conversaciones y rendimiento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
        <ContactForm />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
