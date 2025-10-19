"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, ExternalLink, Smartphone } from 'lucide-react';
import WhatsAppEmbeddedSignup from '@/components/WhatsAppEmbeddedSignup';

export default function ConnectWhatsAppPage() {
  const [showSignup, setShowSignup] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');

  const handleConnectWhatsApp = () => {
    setShowSignup(true);
    setConnectionStatus('connecting');
  };

  const handleSignupSuccess = (data: any) => {
    setConnectionStatus('success');
    setShowSignup(false);
    // Aquí podrías hacer una llamada adicional para actualizar el estado en la base de datos
    console.log('WhatsApp signup successful:', data);
  };

  const handleSignupError = (error: string) => {
    setConnectionStatus('error');
    setShowSignup(false);
    console.error('WhatsApp signup error:', error);
  };

  const handleSignupClose = () => {
    setShowSignup(false);
    if (connectionStatus === 'connecting') {
      setConnectionStatus('idle');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
          <Smartphone className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Conectar WhatsApp Business</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Conecta tu número de WhatsApp Business para empezar a gestionar conversaciones con tus clientes desde Nexly.
        </p>
      </div>

      {/* Connection Status */}
      {connectionStatus === 'connecting' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <div>
                <h3 className="font-semibold text-blue-900">Conectando tu WhatsApp...</h3>
                <p className="text-sm text-blue-700">Sigue los pasos en la ventana emergente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStatus === 'success' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">¡WhatsApp conectado exitosamente!</h3>
                <p className="text-sm text-green-700">Tu número está listo para recibir y enviar mensajes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStatus === 'error' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Error en la conexión</h3>
                <p className="text-sm text-red-700">Hubo un problema al conectar tu WhatsApp. Inténtalo de nuevo.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Benefits Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>¿Qué obtienes?</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Gestión unificada</h4>
                  <p className="text-sm text-gray-600">Centraliza todas tus conversaciones de WhatsApp en un solo lugar</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Respuestas automáticas</h4>
                  <p className="text-sm text-gray-600">Configura respuestas automáticas y chatbots</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Analytics detallados</h4>
                  <p className="text-sm text-gray-600">Métricas y reportes de tus conversaciones</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Integración con otros canales</h4>
                  <p className="text-sm text-gray-600">Conecta Instagram y Telegram en la misma plataforma</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span>Requisitos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                  <span className="text-xs font-medium text-orange-600">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Cuenta de Facebook Business</h4>
                  <p className="text-sm text-gray-600">Necesitas una cuenta de Facebook Business Manager</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                  <span className="text-xs font-medium text-orange-600">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Número de teléfono</h4>
                  <p className="text-sm text-gray-600">Un número que no esté asociado a WhatsApp personal</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                  <span className="text-xs font-medium text-orange-600">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Verificación por SMS</h4>
                  <p className="text-sm text-gray-600">Meta enviará un código de verificación</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Button */}
      <div className="text-center">
        <Button
          onClick={handleConnectWhatsApp}
          disabled={connectionStatus === 'connecting'}
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
        >
          {connectionStatus === 'connecting' ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Conectando...
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5 mr-2" />
              Conectar WhatsApp Business
            </>
          )}
        </Button>
        
        <p className="text-sm text-gray-500 mt-4 max-w-2xl mx-auto">
          Al hacer clic en &quot;Conectar&quot;, se abrirá una ventana segura de Meta para completar el proceso de registro. 
          Tu información se maneja de forma segura y nunca almacenamos tus credenciales de Facebook.
        </p>
      </div>

      {/* Embedded Signup Modal */}
      <WhatsAppEmbeddedSignup
        isOpen={showSignup}
        onClose={handleSignupClose}
        onSuccess={handleSignupSuccess}
        onError={handleSignupError}
      />
    </div>
  );
}