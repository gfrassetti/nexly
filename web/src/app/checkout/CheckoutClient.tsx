"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";

function CheckoutContent() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<'basic' | 'premium'>('basic');

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam === 'basic' || planParam === 'premium') {
      setPlan(planParam);
    } else {
      router.push('/pricing');
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!token || !user) {
      router.push('/login');
    }
  }, [token, user, router]);

  const handleCreatePaymentLink = async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/subscriptions/create-payment-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planType: plan }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        
        // Manejo específico de errores
        if (response.status === 429) {
          throw new Error('Demasiados intentos de pago. Espera 15 minutos antes de intentar nuevamente.');
        } else if (response.status === 400) {
          throw new Error(errorData.error || 'Datos de pago inválidos');
        } else if (response.status === 401) {
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        } else if (response.status === 500) {
          throw new Error('Error interno del servidor. Intenta nuevamente en unos minutos.');
        } else {
          throw new Error(errorData.error || `Error ${response.status}`);
        }
      }

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        // Agregar timeout de seguridad para la redirección
        const timeoutId = setTimeout(() => {
          setError('La redirección a MercadoPago está tardando. Intenta nuevamente.');
          setLoading(false);
        }, 10000); // 10 segundos

        // Limpiar timeout cuando se complete la redirección
        window.location.href = data.paymentUrl;
        clearTimeout(timeoutId);
      } else {
        throw new Error('Error al crear el link de pago');
      }
    } catch (e: any) {
      console.error('Error creating payment link:', e);
      setError(e.message || 'Error al iniciar el proceso de pago');
    } finally {
      setLoading(false);
    }
  };

  const planDetails = {
    basic: {
      name: 'Plan Básico',
      price: '$2.999',
      period: '/mes',
      features: [
        'WhatsApp',
        'Instagram',
        'Hasta 2 integraciones',
        'Mensajes ilimitados',
        '7 días gratis, luego $2.999/mes',
      ],
    },
    premium: {
      name: 'Plan Premium',
      price: '$5.999',
      period: '/mes',
      features: [
        'WhatsApp',
        'Instagram',
        'Facebook Messenger',
        'TikTok',
        'Telegram',
        'Twitter/X',
        'Todas las integraciones disponibles',
        'Mensajes ilimitados',
        '7 días gratis, luego $5.999/mes',
      ],
    },
  };

  const selectedPlan = planDetails[plan];

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Header variant="simple" />

      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Completa tu suscripción</h1>
            <p className="text-xl text-neutral-400">
              Último paso para comenzar tu período de prueba gratuito
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Resumen del plan */}
            <div className="bg-neutral-800 rounded-lg p-8 border border-neutral-700">
              <h2 className="text-2xl font-bold mb-6">Resumen del Plan</h2>
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-nexly-teal mb-2">{selectedPlan.name}</h3>
                <p className="text-3xl font-bold text-white mb-2">
                  {selectedPlan.price}
                  <span className="text-lg font-normal text-neutral-400">{selectedPlan.period}</span>
                </p>
              </div>
              
              <ul className="space-y-3 mb-8">
                {selectedPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-neutral-300">
                    <svg className="w-5 h-5 text-nexly-green mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="bg-nexly-teal/10 border border-nexly-teal/20 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-nexly-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-nexly-teal font-semibold">7 días gratis</span>
                </div>
                <p className="text-neutral-300 text-sm text-center">
                  No se realizará ningún cobro hasta que finalice tu período de prueba
                </p>
              </div>
            </div>

            {/* Información de pago */}
            <div className="bg-neutral-800 rounded-lg p-8 border border-neutral-700">
              <h2 className="text-2xl font-bold mb-6">Información de Pago</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-neutral-700">
                  <span className="text-neutral-400">Plan seleccionado:</span>
                  <span className="font-semibold">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-700">
                  <span className="text-neutral-400">Período de prueba:</span>
                  <span className="font-semibold text-nexly-green">7 días gratis</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-700">
                  <span className="text-neutral-400">Precio mensual:</span>
                  <span className="font-semibold">{selectedPlan.price} ARS</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-neutral-400">Próximo cobro:</span>
                  <span className="font-semibold text-neutral-300">
                    {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700 text-red-300 rounded-lg p-4 mb-6">
                  <p className="font-semibold">Error:</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleCreatePaymentLink}
                disabled={loading}
                className="w-full bg-nexly-teal hover:bg-nexly-green disabled:bg-neutral-600 text-white font-semibold py-4 rounded-lg disabled:opacity-50 transition-colors duration-300 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>Continuar a Mercado Pago</span>
                  </>
                )}
              </button>

              <p className="text-center text-xs text-neutral-400 mt-4">
                Al continuar, serás redirigido a Mercado Pago para completar tu suscripción
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-neutral-400 text-sm">
              ¿Necesitas ayuda? <span className="text-nexly-teal hover:text-nexly-green cursor-pointer">Contáctanos</span>
            </p>
          </div>
        </div>
      </div>

      <Footer variant="minimal" />
    </div>
  );
}

export default function CheckoutClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
