"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { connectWhatsApp } from "@/lib/api";

// Declarar el SDK de Meta para TypeScript
declare global {
  interface Window {
    FB: any;
  }
}

export default function ConnectWhatsAppPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [onboardingUrl, setOnboardingUrl] = useState("");
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Cargar SDK de Meta al montar el componente
  useEffect(() => {
    const loadMetaSDK = () => {
      if (window.FB) {
        setSdkLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        window.FB.init({
          appId: process.env.NEXT_PUBLIC_META_APP_ID,
          version: 'v19.0',
          cookie: true,
          xfbml: true
        });
        setSdkLoaded(true);
      };

      script.onerror = () => {
        setError("Error al cargar el SDK de Meta. Por favor, recarga la página.");
      };

      document.body.appendChild(script);
    };

    loadMetaSDK();
  }, []);

  // Verificar parámetros de URL para mensajes de éxito/error
  useEffect(() => {
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');
    const providerParam = searchParams.get('provider');

    if (successParam === 'whatsapp_connected') {
      if (providerParam === 'meta') {
        setSuccess("¡WhatsApp Business conectado exitosamente! 🎉");
      } else {
        setSuccess("¡WhatsApp conectado exitosamente! 🎉");
      }
    }

    if (errorParam) {
      switch (errorParam) {
        case 'meta_whatsapp_signup_failed':
          setError("Error en el proceso de configuración de WhatsApp Business con Meta. Por favor, inténtalo de nuevo.");
          break;
        case 'meta_missing_parameters':
          setError("Faltan parámetros necesarios para completar la conexión.");
          break;
        case 'meta_signup_failed':
          setError("El proceso de configuración de WhatsApp Business falló. Por favor, inténtalo de nuevo.");
          break;
        case 'whatsapp_already_connected':
          setError("WhatsApp ya está conectado a tu cuenta.");
          break;
        case 'integration_limit_exceeded':
          setError("Has alcanzado el límite de integraciones permitidas.");
          break;
        default:
          setError("Error al conectar WhatsApp. Por favor, inténtalo de nuevo.");
      }
    }
  }, [searchParams]);

  const handleConnect = async () => {
    if (!token || !user?.id) {
      setError("No hay token de autenticación. Por favor, inicia sesión nuevamente.");
      return;
    }

    if (!sdkLoaded) {
      setError("El SDK de Meta aún se está cargando. Por favor, espera un momento.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      // Obtener el signup URL del backend
      const data = await connectWhatsApp(token);

      if (data.success && data.signupUrl) {
        setSuccess("Abriendo ventana de configuración de WhatsApp Business...");
        
        // Usar el SDK de Meta para abrir la ventana emergente
        window.FB.login(
          (response: any) => {
            if (response.authResponse) {
              // El usuario se autenticó exitosamente
              setSuccess("Autenticación exitosa. Procesando configuración...");
              
              // Redirigir a Meta Embedded Signup
              window.open(data.signupUrl, 'meta_whatsapp_signup', 'width=800,height=600,scrollbars=yes,resizable=yes');
            } else {
              setError("No se pudo completar la autenticación con Meta.");
              setLoading(false);
            }
          },
          {
            scope: 'whatsapp_business_management,business_management',
            return_scopes: true
          }
        );
      } else {
        throw new Error(data.message || "Error al iniciar conexión con WhatsApp");
      }
    } catch (err: any) {
      console.error("Error connecting WhatsApp:", err);
      setError(err.message || "Error al conectar WhatsApp");
      setLoading(false);
    }
  };

  const handleManualRedirect = () => {
    if (onboardingUrl) {
      window.location.href = onboardingUrl;
    }
  };

  return (
    <div className="p-6" style={{ background: 'var(--background-gradient)' }}>
      <h1 className="text-2xl font-bold mb-6 text-foreground">Conectar WhatsApp Business</h1>
      
      {error && (
        <div className="bg-accent-red/10 border border-accent-red/20 text-accent-red px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-accent-green/10 border border-accent-green/20 text-accent-green px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-muted border border-border rounded-lg p-6 max-w-2xl">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-accent-green/20 border border-accent-green/30 rounded-full flex items-center justify-center mr-4">
            <span className="text-accent-green text-xl font-bold">W</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">WhatsApp Business</h2>
            <p className="text-sm text-muted-foreground">Conecta tu WhatsApp Business de forma segura</p>
          </div>
        </div>
        
        <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-accent-blue mb-2">¿Cómo funciona?</h3>
          <div className="space-y-2 text-sm text-accent-blue/80">
            <p><strong>1.</strong> Se abrirá una ventana emergente de Meta para configurar WhatsApp Business</p>
            <p><strong>2.</strong> Inicia sesión en tu cuenta de Meta Business Manager</p>
            <p><strong>3.</strong> Crea o selecciona una cuenta de WhatsApp Business (WABA)</p>
            <p><strong>4.</strong> Registra y verifica tu número de teléfono con código OTP</p>
            <p><strong>5.</strong> Acepta los términos y condiciones</p>
            <p><strong>6.</strong> Serás redirigido de vuelta a NEXLY automáticamente</p>
          </div>
        </div>

        <div className="bg-accent-yellow/10 border border-accent-yellow/20 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-accent-yellow mb-2">⚠️ Requisitos previos</h3>
          <div className="space-y-2 text-sm text-accent-yellow/80">
            <p>• Debes tener una cuenta de Meta Business Manager</p>
            <p>• Tu número de teléfono debe estar verificado en Meta</p>
            <p>• El proceso puede tomar 5-10 minutos</p>
          </div>
        </div>
        
        <button 
          onClick={handleConnect}
          disabled={loading || !sdkLoaded}
          className="w-full bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/30 px-4 py-3 rounded-lg disabled:opacity-50 font-medium transition-colors"
        >
          {loading ? "Iniciando conexión..." : !sdkLoaded ? "Cargando SDK..." : "Conectar WhatsApp Business"}
        </button>
        
        {!sdkLoaded && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Cargando SDK de Meta...
          </p>
        )}
        
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Tu información está segura. Solo necesitamos acceso para enviar y recibir mensajes de WhatsApp Business.
        </p>
      </div>
    </div>
  );
}