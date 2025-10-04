"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectWhatsApp, connectWhatsAppCredentials } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function ConnectWhatsAppPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const { token } = useAuth();
  const router = useRouter();

  const handleConnect = async () => {
    if (!token) {
      setError("No hay token de autenticación. Por favor, inicia sesión nuevamente.");
      return;
    }

    if (!phoneNumber) {
      setError("Por favor, ingresa tu número de WhatsApp.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // Para Twilio, simplemente enviamos un mensaje de verificación
      const response = await fetch('https://nexly-production.up.railway.app/integrations/send-whatsapp', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: "¡Hola! Este es un mensaje de verificación de NEXLY. Tu WhatsApp está conectado correctamente. 🎉"
        })
      });

      if (response.ok) {
        // Redirigir al dashboard de integraciones con mensaje de éxito
        router.push("/dashboard/integrations?success=whatsapp_connected");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al enviar mensaje de verificación");
      }
    } catch (err: any) {
      console.error("Error connecting WhatsApp:", err);
      setError(err.message || "Error al conectar WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6" style={{ background: 'var(--background-gradient)' }}>
      <h1 className="text-2xl font-bold mb-6 text-foreground">Conectar WhatsApp</h1>
      
      {error && (
        <div className="bg-accent-red/10 border border-accent-red/20 text-accent-red px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-muted border border-border rounded-lg p-6 max-w-2xl">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-accent-green/20 border border-accent-green/30 rounded-full flex items-center justify-center mr-4">
            <span className="text-accent-green text-xl font-bold">W</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">WhatsApp</h2>
            <p className="text-sm text-muted-foreground">Conecta tu WhatsApp de forma fácil y segura</p>
          </div>
        </div>
        
        <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-accent-blue mb-2">¿Cómo funciona?</h3>
          <div className="space-y-2 text-sm text-accent-blue/80">
            <p><strong>1.</strong> Ingresa tu número de WhatsApp</p>
            <p><strong>2.</strong> Te enviaremos un mensaje de verificación</p>
            <p><strong>3.</strong> ¡Listo! Ya puedes recibir y enviar mensajes</p>
          </div>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground mb-2">
              Tu número de WhatsApp *
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Ej: +1234567890"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green text-foreground placeholder-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Incluye el código de país (ej: +1 para Estados Unidos, +34 para España)
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleConnect}
          disabled={loading || !phoneNumber}
          className="w-full bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/30 px-4 py-3 rounded-lg disabled:opacity-50 font-medium transition-colors"
        >
          {loading ? "Conectando..." : "Conectar WhatsApp"}
        </button>
        
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Solo necesitamos tu número para enviarte mensajes. No accedemos a tu cuenta.
        </p>
      </div>
    </div>
  );
}