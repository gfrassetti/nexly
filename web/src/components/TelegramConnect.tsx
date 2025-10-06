'use client';

import React, { useEffect, useState } from 'react';
// Removed UI component imports - using standard HTML elements
import { CheckCircle, ExternalLink, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { showToast } from '../hooks/use-toast';
import { apiFetch } from '../lib/api';

interface TelegramConnectProps {
  onConnect?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

interface TelegramConfig {
  success: boolean;
  message: string;
  botUsername: string;
  widgetUrl: string;
  authUrl: string;
  instructions: {
    step1: string;
    step2: string;
    step3: string;
  };
}

export default function TelegramConnect({ onConnect, onError, disabled = false }: TelegramConnectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  // Using showToast directly

  // Cargar configuración de Telegram
  useEffect(() => {
    const loadTelegramConfig = async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch('/integrations/connect/telegram');
        setConfig(data);
      } catch (error: any) {
        console.error('Error cargando configuración de Telegram:', error);
        showToast.error(error.message || "No se pudo cargar la configuración de Telegram");
        onError?.(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTelegramConfig();
  }, [onError]);

  // Cargar el widget de Telegram Login
  useEffect(() => {
    if (!config || !config.botUsername) return;

    const loadTelegramWidget = () => {
      // Limpiar widget anterior si existe
      const existingWidget = document.getElementById('telegram-login-widget');
      if (existingWidget) {
        existingWidget.innerHTML = '';
      }

      // Crear el script del widget
      const script = document.createElement('script');
      script.src = config.widgetUrl;
      script.setAttribute('data-telegram-login', config.botUsername);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-auth-url', config.authUrl);
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.async = true;

      // Función global para manejar la autenticación
      (window as any).onTelegramAuth = (user: any) => {
        console.log('Usuario autenticado con Telegram:', user);
        setIsConnecting(true);
        
        // El widget redirigirá automáticamente al callback
        // No necesitamos hacer nada más aquí
      };

      // Agregar el script al contenedor
      const container = document.getElementById('telegram-login-widget');
      if (container) {
        container.appendChild(script);
      }
    };

    // Cargar el widget después de un pequeño delay para asegurar que el DOM esté listo
    const timer = setTimeout(loadTelegramWidget, 100);
    return () => clearTimeout(timer);
  }, [config]);

  const handleConnect = () => {
    if (!config) {
      showToast.error("Configuración de Telegram no disponible");
      return;
    }

    // El widget se encarga de la conexión
    // Solo mostramos un mensaje informativo
    showToast.success("Haz clic en el botón de Telegram para autorizar la conexión");
  };

  if (isLoading) {
    return (
      <div className="w-full bg-neutral-800 rounded-lg border border-neutral-700">
        <div className="p-6 border-b border-neutral-700">
          <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
            <MessageSquare className="h-5 w-5" />
            Conectar Telegram
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            Conecta tu cuenta de Telegram para recibir y enviar mensajes
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-white">Cargando configuración...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="w-full bg-neutral-800 rounded-lg border border-neutral-700">
        <div className="p-6 border-b border-neutral-700">
          <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
            <MessageSquare className="h-5 w-5" />
            Conectar Telegram
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            Conecta tu cuenta de Telegram para recibir y enviar mensajes
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <span className="ml-2 text-red-400">Error cargando configuración</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-neutral-800 rounded-lg border border-neutral-700">
      <div className="p-6 border-b border-neutral-700">
        <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
          <MessageSquare className="h-5 w-5" />
          Conectar Telegram
        </h3>
        <p className="text-sm text-neutral-400 mt-1">
          Conecta tu cuenta de Telegram para recibir y enviar mensajes
        </p>
      </div>
      <div className="p-6 space-y-6">
        {/* Información del bot */}
        <div className="flex items-center gap-2 p-3 bg-neutral-700 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm text-white">
            Bot configurado: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-600 text-neutral-200">@{config.botUsername}</span>
          </span>
        </div>

        {/* Instrucciones */}
        <div className="space-y-3">
          <h4 className="font-medium text-white">Instrucciones:</h4>
          <ol className="space-y-2 text-sm text-neutral-400">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
              <span>{config.instructions.step1}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
              <span>{config.instructions.step2}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">3</span>
              <span>{config.instructions.step3}</span>
            </li>
          </ol>
        </div>

        {/* Widget de Telegram Login */}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-neutral-400 mb-4">
              Haz clic en el botón de abajo para conectar tu cuenta de Telegram:
            </p>
            
            {/* Contenedor para el widget de Telegram */}
            <div 
              id="telegram-login-widget" 
              className="flex justify-center"
            />
            
            {isConnecting && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Conectando con Telegram...</span>
              </div>
            )}
          </div>
        </div>

        {/* Información adicional */}
        <div className="p-4 bg-blue-950/20 rounded-lg border border-blue-800">
          <div className="flex items-start gap-2">
            <ExternalLink className="h-4 w-4 text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-100">
                ¿Qué hace esta conexión?
              </p>
              <ul className="text-xs text-blue-300 space-y-1">
                <li>• Te permite recibir mensajes de clientes en Telegram</li>
                <li>• Puedes responder desde tu panel de NEXLY</li>
                <li>• La conexión es segura y solo tú tienes acceso</li>
                <li>• Puedes desconectar en cualquier momento</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
