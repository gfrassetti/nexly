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
  // No necesitamos formData para OAuth2

  const handleConnect = async () => {
    if (!token) {
      toast.error("No hay token de autenticación");
      return;
    }

    setLoading(true);
    try {
      // Obtener la URL de OAuth2 de Discord
      const response = await apiFetch("/discord/oauth/url", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.success && response.url) {
        // Redirigir a Discord OAuth2
        window.location.href = response.url;
      } else {
        throw new Error(response.error || "Error al obtener URL de autorización");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al conectar con Discord";
      toast.error(errorMessage);
      onError?.(errorMessage);
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
          Conecta tu cuenta personal de Discord para gestionar mensajes directos desde Nexly. Simple y rápido, sin necesidad de crear bots.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <strong>¿Qué necesitas?</strong>
            <br />
            • Una cuenta de Discord (gratuita)
            <br />
            • Tener mensajes directos habilitados
            <br /><br />
            <strong>¿Cómo funciona?</strong>
            <br />
            • Conectas tu cuenta personal de Discord
            <br />
            • Nexly accede a tus mensajes directos
            <br />
            • Puedes responder desde Nexly
            <br />
            • Simple y seguro, como conectar Google
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-sm text-gray-600 mb-4">
            Haz clic en el botón para autorizar a Nexly a acceder a tus mensajes directos de Discord
          </p>
        </div>

        <Button 
          onClick={handleConnect} 
          disabled={loading}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
        >
          {loading ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Conectando...
            </>
          ) : (
            "Conectar con Discord"
          )}
        </Button>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Permisos que autorizarás:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>Leer mensajes directos</li>
            <li>Enviar mensajes directos</li>
            <li>Ver información básica del perfil</li>
          </ul>
          <p className="mt-2 text-green-600"><strong>Seguro:</strong> Solo accede a tus mensajes directos, no a servidores</p>
        </div>
      </CardContent>
    </Card>
  );
}
