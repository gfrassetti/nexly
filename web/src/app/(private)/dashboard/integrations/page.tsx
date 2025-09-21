"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import WhatsAppTester from "@/components/WhatsAppTester";

function IntegrationsContent() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "whatsapp_connected") {
      setMessage("¡WhatsApp conectado exitosamente!");
    } else if (error === "oauth_failed") {
      setError("Error al conectar WhatsApp. Intenta de nuevo.");
    }
  }, [searchParams]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Integraciones</h1>
      
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* WhatsApp Business */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">W</span>
            </div>
            <h2 className="text-lg font-semibold text-black">WhatsApp Business</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta tu cuenta de WhatsApp Business para enviar y recibir mensajes.
          </p>
          <button 
            className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            onClick={() => {
              // Scroll hacia el tester de WhatsApp
              document.getElementById('whatsapp-tester')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            ✅ WhatsApp Conectado (Probar ahora)
          </button>
        </div>

        {/* Instagram */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">I</span>
            </div>
            <h2 className="text-lg font-semibold text-black">Instagram</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta tu cuenta de Instagram para gestionar mensajes directos.
          </p>
          <button 
            className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
            disabled
          >
            Próximamente
          </button>
        </div>

        {/* Facebook Messenger */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <h2 className="text-lg font-semibold text-black">Facebook Messenger</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta Facebook Messenger para gestionar conversaciones.
          </p>
          <button 
            className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
            disabled
          >
            Próximamente
          </button>
        </div>

        {/* TikTok */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <h2 className="text-lg font-semibold text-black">TikTok</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta TikTok para gestionar mensajes y comentarios.
          </p>
          <button 
            className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
            disabled
          >
            Próximamente
          </button>
        </div>

        {/* Telegram */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <h2 className="text-lg font-semibold text-black">Telegram</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta Telegram para gestionar bots y mensajes.
          </p>
          <button 
            className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
            disabled
          >
            Próximamente
          </button>
        </div>

        {/* Twitter/X */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">X</span>
            </div>
            <h2 className="text-lg font-semibold text-black">Twitter/X</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Conecta Twitter/X para gestionar mensajes directos.
          </p>
          <button 
            className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed"
            disabled
          >
            Próximamente
          </button>
        </div>
      </div>

      {/* WhatsApp Tester */}
      <div id="whatsapp-tester" className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Probar WhatsApp</h2>
        <WhatsAppTester />
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-6"><h1 className="text-2xl font-bold mb-6">Integraciones</h1><div>Loading...</div></div>}>
      <IntegrationsContent />
    </Suspense>
  );
}