"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectWhatsApp } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function ConnectWhatsAppPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { token } = useAuth();

  const handleConnect = async () => {
    if (!token) {
      setError("No hay token de autenticación. Por favor, inicia sesión nuevamente.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const response = await connectWhatsApp(token);
      // Redirigir a la URL de autorización de Meta
      window.location.href = response.authUrl;
    } catch (err: any) {
      console.error("Error connecting WhatsApp:", err);
      setError(err.message || "Error al conectar WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">Conectar WhatsApp Business</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 max-w-md">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
            <span className="text-white text-xl font-bold">W</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black">WhatsApp Business</h2>
            <p className="text-sm text-gray-600">Integración oficial</p>
          </div>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-green-600 text-sm">1</span>
            </div>
            <div>
              <h3 className="font-medium text-black">Autoriza el acceso</h3>
              <p className="text-sm text-gray-600">Conecta tu cuenta de WhatsApp Business con Nexly</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-green-600 text-sm">2</span>
            </div>
            <div>
              <h3 className="font-medium text-black">Gestiona mensajes</h3>
              <p className="text-sm text-gray-600">Recibe, responde y organiza todas tus conversaciones</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-green-600 text-sm">3</span>
            </div>
            <div>
              <h3 className="font-medium text-black">Unifica plataformas</h3>
              <p className="text-sm text-gray-600">Combina WhatsApp con Instagram y Messenger</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
        >
          {loading ? "Conectando..." : "Conectar WhatsApp Business"}
        </button>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Al conectar, autorizas a Nexly a gestionar tus mensajes de WhatsApp Business
        </p>
      </div>
    </div>
  );
}