"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import Logo from "@/components/Logo";
import Loader from "@/components/Loader";

// Forzar SSR para páginas de pago (requieren autenticación)
export const dynamic = 'force-dynamic';

function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const { refetch, updateAfterPayment } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("");

  useEffect(() => {
    const processPayment = async () => {
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // Refrescar el estado de la suscripción para obtener la información actualizada
        await refetch();
        
        // El estado se actualiza automáticamente en el contexto
        
        // Simular un pequeño delay para que el usuario vea el mensaje
        setTimeout(() => {
          setStatus('success');
          setMessage('¡Tu prueba gratuita ha sido activada exitosamente!');
          
          // Redirigir al dashboard después de 2 segundos
          setTimeout(() => {
            router.push('/dashboard?trial_started=true');
          }, 2000);
        }, 1000);
        
      } catch (error) {
        console.error('Error processing payment:', error);
        setStatus('error');
        setMessage('Hubo un error al procesar tu pago. Por favor, intenta de nuevo.');
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    processPayment();
  }, [token, router, refetch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <Loader size="lg" />
          <h2 className="text-xl font-semibold mb-2">Procesando tu pago...</h2>
          <p className="text-neutral-400">Por favor espera mientras activamos tu prueba gratuita</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-400 mb-4">¡Pago Exitoso!</h1>
            <p className="text-neutral-300 mb-6">{message}</p>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
              <h3 className="text-green-400 font-semibold mb-2">Tu prueba gratuita está activa</h3>
              <p className="text-green-300 text-sm">
                Ahora puedes acceder a todas las funciones de Nexly durante 7 días
              </p>
            </div>
            <p className="text-neutral-400 text-sm">
              Redirigiendo al dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-400 mb-4">Error en el Pago</h1>
            <p className="text-neutral-300 mb-6">{message}</p>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
              <h3 className="text-red-400 font-semibold mb-2">¿Necesitas ayuda?</h3>
              <p className="text-red-300 text-sm">
                Verifica tu método de pago e intenta nuevamente
              </p>
            </div>
            <p className="text-neutral-400 text-sm">
              Redirigiendo al dashboard...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <Loader size="md" />
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
