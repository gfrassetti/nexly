'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { showToast } from '@/hooks/use-toast';
import TelegramMTProtoConnect from '@/components/TelegramMTProtoConnect';

export default function ConnectTelegramPage() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Verificar si ya está conectado
    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    try {
      // Aquí podrías hacer una llamada para verificar si ya tiene Telegram conectado
      // Por ahora asumimos que no está conectado
      setIsConnected(false);
    } catch (error) {
      console.error('Error verificando conexión:', error);
    }
  };

  const handleConnect = () => {
    showToast.success('Telegram conectado exitosamente');
    router.push('/dashboard/integrations');
  };

  const handleError = (error: string) => {
    console.error('Error conectando Telegram:', error);
  };

  if (isConnected) {
    return (
      <div className="min-h-screen bg-accent-dark p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-neutral-400 hover:text-accent-cream transition-colors duration-200 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver
            </button>
            <h1 className="text-3xl font-bold text-accent-cream mb-2">Telegram ya está conectado</h1>
            <p className="text-neutral-400">
              Tu cuenta de Telegram ya está conectada. Puedes gestionarla desde el panel de integraciones.
            </p>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-400 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-1">
                  Conexión exitosa
                </h3>
                <p className="text-green-300">
                  Tu cuenta de Telegram está conectada y funcionando correctamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent-dark p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-neutral-400 hover:text-accent-cream transition-colors duration-200 mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
          <h1 className="text-3xl font-bold text-accent-cream mb-2">Conectar Telegram</h1>
          <p className="text-neutral-400">
            Conecta tu cuenta personal de Telegram para gestionar todos tus chats y mensajes desde una sola plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario de conexión */}
          <div>
            <TelegramMTProtoConnect
              onConnect={handleConnect}
              onError={handleError}
            />
          </div>

          {/* Información y beneficios */}
          <div className="space-y-6">
            <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <h3 className="text-xl font-semibold text-accent-cream mb-4 flex items-center">
                <MessageSquare className="w-6 h-6 mr-3 text-blue-400" />
                ¿Qué puedes hacer?
              </h3>
              <ul className="space-y-3 text-neutral-300">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Ver todos tus chats privados, grupos y canales</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Enviar y recibir mensajes en tiempo real</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Gestionar múltiples conversaciones desde un solo lugar</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Acceder al historial completo de mensajes</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Consolidar con WhatsApp e Instagram en una sola plataforma</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Información importante
              </h3>
              <div className="space-y-3 text-sm text-blue-300">
                <p>
                  <strong>Seguridad:</strong> Tu sesión se almacena de forma segura y encriptada. 
                  Solo tú puedes acceder a tus mensajes.
                </p>
                <p>
                  <strong>Privacidad:</strong> No almacenamos el contenido de tus mensajes. 
                  Solo facilitamos el acceso a través de la API oficial de Telegram.
                </p>
                <p>
                  <strong>Control:</strong> Puedes desconectar Telegram en cualquier momento 
                  desde el panel de integraciones.
                </p>
              </div>
            </div>

            <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <h3 className="text-lg font-semibold text-accent-cream mb-3">
                ¿Cómo funciona?
              </h3>
              <div className="space-y-3 text-sm text-neutral-300">
                <div className="flex items-start">
                  <span className="bg-blue-500 text-accent-cream rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                  <span>Ingresa tu número de teléfono de Telegram</span>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-500 text-accent-cream rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                  <span>Recibe un código de verificación en tu app de Telegram</span>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-500 text-accent-cream rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                  <span>Ingresa el código para completar la conexión</span>
                </div>
                <div className="flex items-start">
                  <span className="bg-blue-500 text-accent-cream rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                  <span>¡Listo! Ya puedes gestionar todos tus chats desde Nexly</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
