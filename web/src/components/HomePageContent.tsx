"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import ContactForm from "./ContactForm";
import Header from "./Header";
import Footer from "./Footer";
import FAQSection from "./FAQSection";

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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,150,190,0.25),transparent_50%)]" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-nexly-azul/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-nexly-light-blue/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-nexly-teal/15 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Unifica WhatsApp Business, Instagram y{" "}
              <span className="text-nexly-teal bg-gradient-to-r from-nexly-teal to-nexly-light-blue bg-clip-text text-transparent">Messenger</span>
            </h1>
                <p className="text-xl text-neutral-300 mb-8 max-w-3xl mx-auto">
                  Conecta WhatsApp Business, Instagram y Messenger. Gestiona todas tus conversaciones, 
                  automatiza respuestas y convierte más clientes.
                </p>
                
                <div className="bg-nexly-azul/10 border border-nexly-azul/20 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-nexly-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-nexly-light-blue">WhatsApp Business Platform</span>
                  </div>
                  <p className="text-neutral-300 text-sm">
                    Nexly se integra con <strong>WhatsApp Business Platform (Cloud API)</strong>, 
                    no con WhatsApp personal. Necesitas un número asignado a una WABA (WhatsApp Business Account).
                  </p>
                </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/pricing"
                className="bg-accent-green/20 hover:bg-accent-green/30 text-accent-green px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-300 flex items-center justify-center space-x-2 border border-accent-green/30 hover:border-accent-green/50"
              >
                <span>Registrarse y Probar Gratis</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-300 flex items-center justify-center space-x-2 border border-accent-blue/30 hover:border-accent-blue/50"
              >
                <span>Ver Planes y Precios</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 justify-center text-sm text-neutral-400">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-accent-green font-medium">7 días gratis</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-accent-blue font-medium">Tarjeta requerida</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-accent-cream font-medium">Configuración en minutos</span>
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
              <div className="w-16 h-16 bg-accent-green/20 border border-accent-green/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Mensajería Unificada</h3>
              <p className="text-neutral-300">
                Conecta WhatsApp Business, Instagram y Messenger en una sola interfaz.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-blue/20 border border-accent-blue/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Automatización Inteligente</h3>
              <p className="text-neutral-300">
                Automatiza respuestas y gestiona conversaciones de forma eficiente.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-cream/20 border border-accent-cream/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-800/30">
        <div className="max-w-7xl mx-auto">
          <FAQSection />
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
        <ContactForm />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
