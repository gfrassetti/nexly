"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

// Declarar el tipo de Facebook SDK
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface WhatsAppEmbeddedSignupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
}

export default function WhatsAppEmbeddedSignup({
  isOpen,
  onClose,
  onSuccess,
  onError
}: WhatsAppEmbeddedSignupProps) {
  const [step, setStep] = useState<'loading' | 'connecting' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [configId, setConfigId] = useState<string>('');
  const [solutionId, setSolutionId] = useState<string>('');
  const [facebookAppId, setFacebookAppId] = useState<string>('');
  const fbSdkLoaded = useRef(false);

  useEffect(() => {
    if (isOpen) {
      loadFacebookSDK();
      initializeSignup();
    }
  }, [isOpen]);

  // Cargar Facebook SDK según documentación de Meta
  const loadFacebookSDK = () => {
    if (fbSdkLoaded.current || document.getElementById('facebook-jssdk')) {
      return;
    }

    // Configurar inicialización de Facebook SDK
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: facebookAppId || process.env.NEXT_PUBLIC_META_APP_ID || '',
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0'
      });
      fbSdkLoaded.current = true;
    };

    // Cargar el script de Facebook SDK
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    document.body.appendChild(script);
  };

  // Escuchar mensajes del Embedded Signup según documentación de Meta
  useEffect(() => {
    const handleEmbeddedSignupMessage = (event: MessageEvent) => {
      // Verificar origen de Facebook
      if (!event.origin.endsWith('facebook.com')) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
            // Usuario completó el Embedded Signup
            const { phone_number_id, waba_id } = data.data;
            
            console.log('WhatsApp Embedded Signup completed', {
              phone_number_id,
              waba_id
            });

            // Enviar datos al backend
            handleSignupSuccess(phone_number_id, waba_id);
            
          } else if (data.event === 'CANCEL') {
            const { current_step } = data.data;
            console.warn('Embedded Signup cancelled at step:', current_step);
            setStep('error');
            setErrorMessage('Proceso de registro cancelado');
            onError('Proceso cancelado');
            
          } else if (data.event === 'ERROR') {
            const { error_message } = data.data;
            console.error('Embedded Signup error:', error_message);
            setStep('error');
            setErrorMessage(error_message || 'Error en el proceso de registro');
            onError(error_message || 'Error desconocido');
          }
        }
      } catch (error) {
        // No es JSON, ignorar
        console.log('Non-JSON response from Facebook:', event.data);
      }
    };
    
    window.addEventListener('message', handleEmbeddedSignupMessage);
    
    return () => {
      window.removeEventListener('message', handleEmbeddedSignupMessage);
    };
  }, []);

  const initializeSignup = async () => {
    try {
      setStep('loading');
      
      /**
       * SECURITY: Obtener Config ID y Solution ID del backend
       * ⚠️ IMPORTANTE: NUNCA hacemos llamadas directas a la API de Twilio desde aquí.
       * El AuthToken de Twilio permanece siempre en el backend.
       */
      const response = await fetch('/api/whatsapp/create-signup-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Error al obtener configuración de Embedded Signup');
      }

      const data = await response.json();
      
      if (!data.configId || !data.solutionId || !data.facebookAppId) {
        throw new Error('Configuración incompleta de Embedded Signup');
      }

      setConfigId(data.configId);
      setSolutionId(data.solutionId);
      setFacebookAppId(data.facebookAppId);

      // Determinar si usamos números de Twilio basado en respuesta del backend
      // Según documentación de Twilio: si usamos números SMS-capables, debemos usar featureType
      const useTwilioNumbers = data.useTwilioNumbers !== false; // Por defecto true

      // Inicializar Facebook SDK con el App ID antes de lanzar el signup
      if (window.FB && !fbSdkLoaded.current) {
        window.FB.init({
          appId: data.facebookAppId,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v21.0'
        });
        fbSdkLoaded.current = true;
      }

      // Esperar a que Facebook SDK esté cargado
      const checkFBSDK = setInterval(() => {
        if (window.FB && (fbSdkLoaded.current || window.FB.getLoginStatus)) {
          clearInterval(checkFBSDK);
          // Lanzar Embedded Signup con featureType si usamos números de Twilio
          launchEmbeddedSignup(data.configId, data.solutionId, useTwilioNumbers);
        }
      }, 100);

      // Timeout después de 10 segundos
      setTimeout(() => {
        clearInterval(checkFBSDK);
        if (!window.FB) {
          setStep('error');
          setErrorMessage('Error al cargar Facebook SDK. Por favor, recarga la página.');
          onError('Error al cargar Facebook SDK');
        }
      }, 10000);

    } catch (error: any) {
      setStep('error');
      setErrorMessage(error.message);
      onError(error.message);
    }
  };

  // Lanzar Embedded Signup usando Facebook SDK según documentación de Meta
  // Documentación: https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide
  const launchEmbeddedSignup = (configId: string, solutionId: string, useTwilioNumbers: boolean = true) => {
    if (!window.FB) {
      throw new Error('Facebook SDK no está disponible');
    }

    setStep('connecting');

    // Preparar parámetros según documentación de Meta
    // Si usas números SMS-capables de Twilio, incluir featureType: 'only_waba_sharing'
    // Esto saltará los pasos de número de teléfono porque Twilio manejará los OTPs automáticamente
    const loginOptions: any = {
      config_id: configId,
      auth_type: 'rerequest', // Evita errores si el usuario ya está logueado
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        sessionInfoVersion: 3, // Requerido para obtener WABA ID
        setup: {
          solutionID: solutionId // Partner Solution ID de Twilio
        }
      }
    };

    // Según documentación de Twilio: si usas números SMS-capables de Twilio, agregar featureType
    // Esto salta los pasos de número de teléfono porque Twilio maneja los OTPs automáticamente
    if (useTwilioNumbers) {
      loginOptions.extras.featureType = 'only_waba_sharing';
    }

    // Lanzar Facebook Login con Embedded Signup según documentación oficial
    window.FB.login(
      function (response: any) {
        // No necesitamos hacer nada con la respuesta aquí
        // Los datos vienen a través del listener de mensajes
        console.log('Facebook login response:', response);
      },
      loginOptions
    );
  };

  // Manejar éxito del signup
  const handleSignupSuccess = async (phoneNumberId: string, wabaId: string) => {
    try {
      // Enviar datos al backend para crear subaccount y registrar sender
      const response = await fetch('/api/whatsapp/onboarding-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number_id: phoneNumberId,
          waba_id: wabaId
        })
      });

      if (!response.ok) {
        throw new Error('Error al procesar el registro en el servidor');
      }

      setStep('success');
      onSuccess({ phone_number_id: phoneNumberId, waba_id: wabaId });
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error: any) {
      setStep('error');
      setErrorMessage(error.message);
      onError(error.message);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <h3 className="text-lg font-semibold">Preparando conexión...</h3>
            <p className="text-sm text-gray-600 text-center">
              Estamos configurando el proceso de registro con WhatsApp Business
            </p>
          </div>
        );

      case 'connecting':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <h3 className="text-lg font-semibold">Proceso iniciado</h3>
            <p className="text-sm text-gray-600 text-center">
              Se ha abierto una ventana emergente. Completa el proceso de registro de WhatsApp Business allí.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
              <h4 className="font-medium text-blue-900 mb-2">Pasos a seguir:</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-start space-x-2">
                  <span className="font-medium">1.</span>
                  <span>Inicia sesión con tu cuenta de Facebook Business</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium">2.</span>
                  <span>Confirma tu Facebook Business Manager ID</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium">3.</span>
                  <span>Ingresa tu número de teléfono</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium">4.</span>
                  <span>Verifica con el código SMS</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              No cierres esta ventana hasta completar el proceso
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h3 className="text-lg font-semibold text-green-900">¡WhatsApp conectado exitosamente!</h3>
            <p className="text-sm text-gray-600 text-center">
              Tu número de WhatsApp Business está listo para usar en Nexly.
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <h3 className="text-lg font-semibold text-red-900">Error en la conexión</h3>
            <p className="text-sm text-gray-600 text-center">
              {errorMessage || 'Hubo un problema al conectar tu WhatsApp Business.'}
            </p>
            <Button onClick={initializeSignup} variant="outline">
              Intentar de nuevo
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ExternalLink className="w-5 h-5" />
            <span>Conectar WhatsApp Business</span>
          </DialogTitle>
          <DialogDescription>
            Registra tu número de WhatsApp Business con Meta para empezar a usarlo en Nexly.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {renderContent()}
        </div>

        {step !== 'loading' && step !== 'success' && (
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
