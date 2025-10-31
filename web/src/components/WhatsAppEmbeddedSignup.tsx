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
      console.log('🔵 WhatsApp Embedded Signup modal opened');
      // Primero cargar el SDK, luego inicializar el signup
      loadFacebookSDK();
      // Dar un pequeño delay para que el script comience a cargar
      setTimeout(() => {
        initializeSignup();
      }, 100);
    }
  }, [isOpen]);

  // Cargar Facebook SDK según documentación de Meta
  const loadFacebookSDK = () => {
    // Si ya está cargado, verificar que FB esté disponible
    if (fbSdkLoaded.current && window.FB) {
      console.log('✅ Facebook SDK already loaded');
      return;
    }

    // Si ya existe el script pero FB no está disponible, esperar
    if (document.getElementById('facebook-jssdk') && !window.FB) {
      console.log('⏳ Facebook SDK script loaded, waiting for initialization...');
      return;
    }

    // Si ya existe el script, no cargar de nuevo
    if (document.getElementById('facebook-jssdk')) {
      return;
    }

    console.log('📥 Loading Facebook SDK script...');

    // IMPORTANTE: Según documentación oficial de Meta, fbAsyncInit debe estar definido
    // ANTES de cargar el script. Si no tenemos el App ID aún, configuramos un placeholder
    // que se actualizará cuando recibamos el App ID del backend
    if (!window.fbAsyncInit) {
      window.fbAsyncInit = function() {
        // Este placeholder será sobrescrito cuando recibamos el App ID del backend
        console.log('⏳ fbAsyncInit called but App ID not yet received, waiting...');
      };
    }

    // Cargar el script de Facebook SDK según documentación oficial de Meta
    // https://developers.facebook.com/docs/whatsapp/embedded-signup/default-flow
    // NOTA: El script debe tener estos atributos exactos: async defer crossorigin="anonymous"
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    
    script.onload = () => {
      console.log('📦 Facebook SDK script loaded successfully');
      // El SDK ejecutará fbAsyncInit automáticamente cuando esté listo
      // Si fbAsyncInit ya fue configurado con el App ID, se inicializará automáticamente
    };
    
    script.onerror = (error) => {
      console.error('❌ Error loading Facebook SDK script:', error);
      setStep('error');
      setErrorMessage('Error al cargar Facebook SDK. Verifica tu conexión e intenta de nuevo.');
      onError('Error loading Facebook SDK');
    };
    
    // Insertar el script en el <head> según documentación oficial
    if (document.head) {
      document.head.appendChild(script);
    } else {
      // Fallback: agregar al body si head no está disponible
      document.body.appendChild(script);
    }
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
            
            console.log('✅ WhatsApp Embedded Signup completed successfully', {
              phone_number_id,
              waba_id
            });

            // Enviar datos al backend
            handleSignupSuccess(phone_number_id, waba_id);
            
          } else if (data.event === 'CANCEL') {
            // Usuario canceló el flujo de Embedded Signup - NO es un error técnico
            const { current_step } = data.data;
            console.info('ℹ️ WhatsApp Embedded Signup cancelled by user (not an error)', {
              current_step,
              note: 'User cancelled the signup flow - this is normal, not a technical error'
            });
            
            // Cerrar el modal sin mostrar error (no es un error técnico)
            onClose();
            // IMPORTANTE: No llamar onError() para cancelaciones del usuario
            // Solo llamar onError() para errores técnicos reales
            
          } else if (data.event === 'ERROR') {
            // Error real durante el Embedded Signup
            const { error_message } = data.data;
            console.error('❌ WhatsApp Embedded Signup error from Meta:', {
              error_message,
              fullData: data,
              note: 'Technical error during signup flow'
            });
            setStep('error');
            const errorMsg = error_message || 'Error en el proceso de registro. Por favor, intenta de nuevo.';
            setErrorMessage(errorMsg);
            onError(errorMsg);
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
      
      console.log('📦 Backend response:', {
        success: data.success,
        hasConfigId: !!data.configId,
        hasSolutionId: !!data.solutionId,
        hasFacebookAppId: !!data.facebookAppId,
        error: data.error
      });

      if (!data.configId || !data.solutionId || !data.facebookAppId) {
        const errorMsg = data.error || 'Configuración incompleta de Embedded Signup';
        console.error('❌ Configuration incomplete:', {
          configId: !!data.configId,
          solutionId: !!data.solutionId,
          facebookAppId: !!data.facebookAppId,
          backendError: data.error
        });
        throw new Error(errorMsg);
      }

      setConfigId(data.configId);
      setSolutionId(data.solutionId);
      setFacebookAppId(data.facebookAppId);

      // Determinar si usamos números de Twilio basado en respuesta del backend
      // Según documentación de Twilio: si usamos números SMS-capables, debemos usar featureType
      const useTwilioNumbers = data.useTwilioNumbers !== false; // Por defecto true

      console.log('📋 Embedded Signup configuration validated:', {
        configId: data.configId ? `${data.configId.substring(0, 10)}...` : 'NOT SET',
        solutionId: data.solutionId ? `${data.solutionId.substring(0, 10)}...` : 'NOT SET',
        facebookAppId: data.facebookAppId ? `${data.facebookAppId.substring(0, 4)}...` : 'NOT SET',
        useTwilioNumbers
      });

      // Guardar el App ID
      setFacebookAppId(data.facebookAppId);
      
      // CRÍTICO: Configurar fbAsyncInit ANTES de que el SDK se cargue
      // Según documentación oficial de Meta: https://developers.facebook.com/docs/whatsapp/embedded-signup/default-flow
      // fbAsyncInit debe estar definido ANTES de cargar el script del SDK
      window.fbAsyncInit = function() {
        console.log('🔧 fbAsyncInit called by Facebook SDK, initializing with App ID:', data.facebookAppId);
        if (window.FB && data.facebookAppId) {
          try {
            window.FB.init({
              appId: data.facebookAppId,
              autoLogAppEvents: true,
              xfbml: true,
              version: 'v21.0'
            });
            fbSdkLoaded.current = true;
            console.log('✅ Facebook SDK initialized successfully via fbAsyncInit');
          } catch (error: any) {
            console.error('❌ Error in fbAsyncInit:', error);
          }
        }
      };

      // Si el SDK ya está cargado, inicializarlo inmediatamente
      if (window.FB && typeof window.FB.init === 'function' && data.facebookAppId) {
        try {
          console.log('🔄 SDK already loaded, initializing immediately...');
          window.FB.init({
            appId: data.facebookAppId,
            autoLogAppEvents: true,
            xfbml: true,
            version: 'v21.0'
          });
          fbSdkLoaded.current = true;
          console.log('✅ Facebook SDK initialized successfully');
        } catch (initError: any) {
          console.warn('⚠️ Error initializing Facebook SDK (may already be initialized):', initError);
          // Verificar si ya está inicializado
          if (window.FB && typeof window.FB.getLoginStatus === 'function' && typeof window.FB.login === 'function') {
            fbSdkLoaded.current = true;
            console.log('✅ Facebook SDK already initialized, proceeding...');
          }
        }
      } else {
        console.log('⏳ SDK not loaded yet, fbAsyncInit will run automatically when SDK loads');
      }

      // Esperar a que Facebook SDK esté completamente cargado y disponible
      let attempts = 0;
      const maxAttempts = 100; // 10 segundos (100ms * 100)
      
      const checkFBSDK = setInterval(() => {
        attempts++;
        
        // Verificar que FB esté disponible, inicializado, y que login funcione
        const isReady = window.FB && 
                       typeof window.FB.login === 'function' && 
                       typeof window.FB.getLoginStatus === 'function' &&
                       (fbSdkLoaded.current || (window.FB && window.FB.getLoginStatus));
        
        if (isReady) {
          clearInterval(checkFBSDK);
          console.log('✅ Facebook SDK ready, launching Embedded Signup...', {
            hasFB: !!window.FB,
            hasLogin: typeof window.FB.login === 'function',
            hasGetLoginStatus: typeof window.FB.getLoginStatus === 'function',
            fbSdkLoaded: fbSdkLoaded.current,
            appId: data.facebookAppId ? `${data.facebookAppId.substring(0, 4)}...` : 'NOT SET'
          });
          
          // Lanzar Embedded Signup con featureType si usamos números de Twilio
          try {
            launchEmbeddedSignup(data.configId, data.solutionId, useTwilioNumbers);
          } catch (error: any) {
            console.error('❌ Error launching Embedded Signup:', error);
            setStep('error');
            setErrorMessage(error.message || 'Error al iniciar el proceso de registro');
            onError(error.message);
          }
        } else if (attempts >= maxAttempts) {
          // Timeout alcanzado
          clearInterval(checkFBSDK);
          console.error('❌ Facebook SDK not ready after 10 seconds', {
            hasFB: !!window.FB,
            hasLogin: !!(window.FB && typeof window.FB.login === 'function'),
            hasGetLoginStatus: !!(window.FB && typeof window.FB.getLoginStatus === 'function'),
            fbSdkLoaded: fbSdkLoaded.current,
            scriptLoaded: !!document.getElementById('facebook-jssdk')
          });
          setStep('error');
          setErrorMessage('Error al cargar Facebook SDK. Por favor, recarga la página e intenta de nuevo.');
          onError('Facebook SDK timeout');
        } else {
          // Debug: mostrar progreso cada 20 intentos
          if (attempts % 20 === 0) {
            console.log(`⏳ Waiting for Facebook SDK... (${attempts}/${maxAttempts})`, {
              hasFB: !!window.FB,
              hasLogin: !!(window.FB && typeof window.FB.login === 'function'),
              hasGetLoginStatus: !!(window.FB && typeof window.FB.getLoginStatus === 'function'),
              fbSdkLoaded: fbSdkLoaded.current,
              scriptLoaded: !!document.getElementById('facebook-jssdk')
            });
            
            // Si el SDK está cargado pero no inicializado, intentar inicializarlo de nuevo
            if (window.FB && !fbSdkLoaded.current && data.facebookAppId) {
              console.log('🔄 Retrying SDK initialization...');
              try {
                window.FB.init({
                  appId: data.facebookAppId,
                  autoLogAppEvents: true,
                  xfbml: true,
                  version: 'v21.0'
                });
                fbSdkLoaded.current = true;
                console.log('✅ Facebook SDK initialized on retry');
              } catch (retryError: any) {
                console.warn('⚠️ Retry initialization failed:', retryError);
              }
            }
          }
        }
      }, 100);

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

    if (typeof window.FB.login !== 'function') {
      throw new Error('Facebook SDK login function no está disponible');
    }

    console.log('🚀 Launching Facebook Embedded Signup with:', {
      configId: configId ? `${configId.substring(0, 10)}...` : 'NOT SET',
      solutionId: solutionId ? `${solutionId.substring(0, 10)}...` : 'NOT SET',
      useTwilioNumbers,
      hasFB: !!window.FB,
      hasFBLogin: typeof window.FB.login === 'function'
    });

    setStep('connecting');

    // Preparar parámetros según documentación oficial de Twilio Tech Provider Program
    // Documentación: https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide
    // NOTA: Esta es la estructura EXACTA según la documentación de Twilio
    const loginOptions: any = {
      config_id: configId, // Config ID de Meta (requerido)
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

    // Si usas números SMS-capables de Twilio, agregar featureType
    // Según documentación: "set the following 'featureType' to 'only_waba_sharing'
    // if and only if using a Twilio SMS-capable number, otherwise
    // do not include it or set it to null"
    if (useTwilioNumbers) {
      loginOptions.extras.featureType = 'only_waba_sharing';
    }

    // Validar que tenemos todos los parámetros necesarios
    if (!configId || !solutionId) {
      throw new Error('Config ID o Solution ID faltantes. Verifica la configuración del servidor.');
    }

    console.log('📤 Calling FB.login() with options (según documentación Twilio):', {
      config_id: configId ? `SET (${configId.length} chars)` : 'NOT SET',
      solution_id: solutionId ? `SET (${solutionId.length} chars)` : 'NOT SET',
      hasExtras: !!loginOptions.extras,
      hasSessionInfoVersion: loginOptions.extras?.sessionInfoVersion === 3,
      hasSetup: !!loginOptions.extras?.setup,
      hasSolutionID: !!loginOptions.extras?.setup?.solutionID,
      hasFeatureType: !!loginOptions.extras?.featureType,
      featureType: loginOptions.extras?.featureType || 'null (not using Twilio SMS-capable numbers)',
      fullOptions: JSON.stringify(loginOptions, null, 2)
    });

    // Lanzar Facebook Login con Embedded Signup según documentación oficial
    // NOTA: FB.login() con config_id debería abrir un popup de Facebook para Embedded Signup
    try {
      console.log('🔴 About to call FB.login()...', {
        FB_available: !!window.FB,
        FB_login_available: typeof window.FB.login === 'function',
        options: loginOptions
      });

      // Verificar que FB.login() existe y es una función
      if (!window.FB || typeof window.FB.login !== 'function') {
        throw new Error('FB.login() no está disponible. El SDK de Facebook no está cargado correctamente.');
      }

      // Validar que tenemos los parámetros requeridos según documentación de Twilio
      if (!loginOptions.config_id || !loginOptions.extras?.setup?.solutionID) {
        throw new Error('config_id y solutionID son requeridos para Embedded Signup');
      }

      const loginResponse = window.FB.login(
        function (response: any) {
          // Callback de FB.login() - respuesta inicial
          console.log('📥 Facebook login callback received:', {
            status: response?.status,
            authResponse: response?.authResponse ? 'present' : 'absent',
            error: response?.error ? response.error : 'none',
            fullResponse: response,
            note: 'Actual Embedded Signup data will come via postMessage listener'
          });
          
          // Verificar si hay errores en la respuesta inicial
          if (response?.error) {
            console.error('❌ Facebook login error in callback:', response.error);
            
            // Si el error menciona returnUrl o failureUrl, puede ser un problema de configuración
            const errorMessage = response.error.message || '';
            if (errorMessage.toLowerCase().includes('returnurl') || errorMessage.toLowerCase().includes('failureurl')) {
              setStep('error');
              setErrorMessage('Error de configuración: Las URLs de retorno no están configuradas correctamente.');
              onError('URLs de retorno no configuradas correctamente');
            } else {
              setStep('error');
              setErrorMessage(response.error.message || 'Error en el inicio de sesión de Facebook');
              onError(response.error.message || 'Facebook login error');
            }
          } else if (response?.status === 'connected') {
            console.log('✅ Facebook login successful, waiting for Embedded Signup postMessage...');
          } else {
            console.log('ℹ️ Facebook login status:', response?.status, '- waiting for postMessage...');
          }
        },
        loginOptions
      );
      
      console.log('✅ FB.login() called successfully', {
        response: loginResponse ? 'received' : 'async callback only',
        responseType: typeof loginResponse,
        isPromise: loginResponse && typeof loginResponse.then === 'function',
        note: 'FB.login() is async - check callback and postMessage listener for results'
      });

      // Verificar si FB.login() devolvió una promesa (nuevas versiones del SDK)
      if (loginResponse && typeof loginResponse.then === 'function') {
        loginResponse.then((response: any) => {
          console.log('📥 FB.login() promise resolved:', response);
        }).catch((error: any) => {
          console.error('❌ FB.login() promise rejected:', error);
          setStep('error');
          setErrorMessage(error.message || 'Error al iniciar sesión con Facebook');
          onError(error.message || 'Facebook login promise error');
        });
      }
    } catch (error: any) {
      console.error('❌ Error calling FB.login():', error, {
        errorMessage: error.message,
        errorStack: error.stack,
        FB_available: !!window.FB,
        FB_login_type: window.FB ? typeof window.FB.login : 'N/A'
      });
      throw error;
    }
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

