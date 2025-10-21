"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import apiFetch from "@/lib/api";
import { toast } from "sonner";

interface DiscordConfigProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function DiscordConfig({ onSuccess, onError }: DiscordConfigProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    botToken: "",
    guildId: "",
    clientId: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConnect = async () => {
    if (!token) {
      toast.error("No hay token de autenticación");
      return;
    }

    if (!formData.botToken || !formData.guildId) {
      toast.error("Por favor completa el token del bot y el ID del servidor");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/discord/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.success) {
        toast.success("Discord conectado exitosamente");
        setFormData({ botToken: "", guildId: "", clientId: "" });
        onSuccess?.();
      } else {
        throw new Error(response.error || "Error al conectar Discord");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al conectar con Discord";
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
          Configurar Discord
        </CardTitle>
        <CardDescription>
          Conecta un bot de Discord para gestionar mensajes en tu servidor. <strong>Necesitas tener un servidor de Discord</strong> (comunidad, negocio, etc.) donde el bot actuará como intermediario.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <strong>¿Qué necesitas?</strong>
            <br />
            • Un servidor de Discord (comunidad, negocio, etc.)
            <br />
            • Permisos de administrador en ese servidor
            <br /><br />
            <strong>Pasos:</strong>
            <br />
            1. Crea un bot en el <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Portal de Desarrolladores</a>
            <br />
            2. Copia el Token del Bot
            <br />
            3. Invita el bot a TU servidor
            <br />
            4. Copia el ID de TU servidor
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="botToken" className="block text-sm font-medium text-accent-cream">Token del Bot *</label>
          <input
            id="botToken"
            type="password"
            placeholder="MTxxxxxx.xxxxxx.xxxxxx"
            value={formData.botToken}
            onChange={(e) => handleInputChange("botToken", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="guildId" className="block text-sm font-medium text-accent-cream">ID de TU Servidor *</label>
          <input
            id="guildId"
            placeholder="123456789012345678"
            value={formData.guildId}
            onChange={(e) => handleInputChange("guildId", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500">El servidor donde quieres gestionar mensajes</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="clientId" className="block text-sm font-medium text-accent-cream">ID de la Aplicación (opcional)</label>
          <input
            id="clientId"
            placeholder="123456789012345678"
            value={formData.clientId}
            onChange={(e) => handleInputChange("clientId", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>

        <Button 
          onClick={handleConnect} 
          disabled={loading || !formData.botToken || !formData.guildId}
          className="w-full"
        >
          {loading ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Conectando...
            </>
          ) : (
            "Conectar Discord"
          )}
        </Button>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Permisos necesarios del bot:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>Enviar mensajes</li>
            <li>Leer historial de mensajes</li>
            <li>Gestionar mensajes</li>
          </ul>
          <p className="mt-2 text-orange-600"><strong>Nota:</strong> Solo funciona si tienes un servidor de Discord propio</p>
        </div>
      </CardContent>
    </Card>
  );
}
