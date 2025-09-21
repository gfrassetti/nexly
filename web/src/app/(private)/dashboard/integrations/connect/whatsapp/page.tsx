"use client";
import { useEffect, useState } from "react";
import { connectWhatsApp } from "@/lib/api";

export default function ConnectWhatsAppPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await connectWhatsApp();
      // Redirigir a la URL de autorización de Meta
      window.location.href = response.authUrl;
    } catch (err: any) {
      setError(err.message || "Error al conectar WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Conectar WhatsApp Business</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 max-w-md">
        <h2 className="text-lg font-semibold mb-4">Autorizar acceso</h2>
        <p className="text-gray-600 mb-6">
          Haz clic en el botón para autorizar el acceso a tu cuenta de WhatsApp Business.
        </p>
        
        <button 
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? "Conectando..." : "Conectar WhatsApp"}
        </button>
      </div>
    </div>
  );
}
