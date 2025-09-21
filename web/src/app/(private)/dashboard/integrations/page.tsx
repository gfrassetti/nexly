"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">WhatsApp Business</h2>
        <p className="text-gray-600 mb-4">
          Conecta tu cuenta de WhatsApp Business para enviar y recibir mensajes.
        </p>
        <button 
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={() => window.location.href = '/dashboard/integrations/connect/whatsapp'}
        >
          Conectar WhatsApp
        </button>
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