"use client";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";

function PricingContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('basic');

  // Detectar plan desde query parameters
  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan === 'basic' || plan === 'premium') {
      setSelectedPlan(plan);
    }
  }, [searchParams]);

  const plans = [
    {
      id: 'basic',
      name: 'Plan Básico',
      price: '$2.999',
      period: '/mes',
      description: 'Perfecto para emprendedores y pequeñas empresas',
      features: [
        'WhatsApp',
        'Instagram',
        'Hasta 2 integraciones',
        'Período de prueba de 15 días',
      ],
      popular: false,
    },
    {
      id: 'premium',
      name: 'Plan Premium',
      price: '$5.999',
      period: '/mes',
      description: 'Para empresas que necesitan más integraciones',
      features: [
        'WhatsApp',
        'Instagram',
        'Facebook Messenger',
        'TikTok',
        'Telegram',
        'Twitter/X',
        'Integraciones ilimitadas',
        'Período de prueba de 15 días',
      ],
      popular: true,
    },
  ];

  const handleStartTrial = async (planType: 'basic' | 'premium') => {
    if (!token) {
      // Para usuarios no autenticados, redirigir al registro
      window.location.href = `/register?plan=${planType}`;
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/subscriptions/create-payment-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planType }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        // Abrir enlace de pago en nueva ventana
        window.open(data.paymentUrl, '_blank');
      } else {
        throw new Error(data.error || 'Error al crear el enlace de pago');
      }
    } catch (error: any) {
      console.error('Error starting trial:', error);
      // Mostrar error en consola y redirigir al dashboard para que el usuario vea su estado
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <img src="/logo_nexly.png" alt="Nexly" className="w-40 p-2" />
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              {token ? (
                <Link
                  href="/dashboard"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/" className="text-neutral-300 hover:text-white transition-colors">
                    Volver al inicio
                  </Link>
                  <Link href="/login" className="text-neutral-300 hover:text-white transition-colors">
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
          
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Elige tu plan perfecto
          </h1>
          <p className="text-xl text-neutral-300 max-w-2xl mx-auto mb-8">
            Comienza con 15 días gratis. Sin tarjeta de crédito requerida.
            Cancela cuando quieras.
          </p>

          {/* Trial Banner */}
          <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-6 max-w-2xl mx-auto mb-12">
            <div className="flex items-center justify-center gap-3 mb-2">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-green-400">15 días de prueba gratis</h3>
            </div>
            <p className="text-neutral-300">
              Acceso completo a todas las funciones durante tu período de prueba
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 border transition-all duration-300 ${
                plan.popular
                  ? 'border-green-500 bg-neutral-800/50 scale-105'
                  : 'border-neutral-700 bg-neutral-800/30 hover:border-neutral-600'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Más popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-neutral-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-neutral-400 ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {!token ? (
                // Usuario no autenticado - Botón de registro
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = `/register?plan=${plan.id}`}
                    className={`w-full py-4 rounded-lg font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                    }`}
                  >
                    Registrarse y Probar Gratis
                  </button>
                  <p className="text-center text-xs text-neutral-400">
                    15 días gratis • Sin tarjeta requerida
                  </p>
                </div>
              ) : (
                // Usuario autenticado - Botón de compra
                <div className="space-y-3">
                  <button
                    onClick={() => handleStartTrial(plan.id as 'basic' | 'premium')}
                    className={`w-full py-4 rounded-lg font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                    }`}
                  >
                    Comprar {plan.name}
                  </button>
                  <p className="text-center text-xs text-neutral-400">
                    Pago seguro con Mercado Pago
                  </p>
                </div>
              )}

              <p className="text-center text-sm text-neutral-400 mt-4">
                Sin compromiso • Cancela cuando quieras
              </p>
            </div>
          ))}
        </div>

        {/* Información adicional para usuarios no autenticados */}
        {!token && (
          <div className="mt-16 bg-neutral-800/50 border border-neutral-700 rounded-lg p-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">¿Cómo funciona?</h2>
              <p className="text-neutral-400 text-lg">Proceso simple y seguro en 3 pasos</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <h3 className="font-semibold mb-2">Regístrate gratis</h3>
                <p className="text-neutral-400 text-sm">Crea tu cuenta en menos de 2 minutos</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <h3 className="font-semibold mb-2">Elige tu plan</h3>
                <p className="text-neutral-400 text-sm">Selecciona el plan que mejor se adapte a tu negocio</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <h3 className="font-semibold mb-2">Paga con seguridad</h3>
                <p className="text-neutral-400 text-sm">Procesamiento seguro con Mercado Pago</p>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Preguntas frecuentes</h2>
          
          <div className="space-y-8">
            <div className="border-b border-neutral-700 pb-6">
              <h3 className="text-lg font-semibold mb-2">¿Qué incluye la prueba gratuita?</h3>
              <p className="text-neutral-300">
                Acceso completo a todas las funciones de Nexly durante 15 días. No se requiere tarjeta de crédito.
              </p>
            </div>

            <div className="border-b border-neutral-700 pb-6">
              <h3 className="text-lg font-semibold mb-2">¿Puedo cambiar de plan más tarde?</h3>
              <p className="text-neutral-300">
                Sí, puedes cambiar entre planes en cualquier momento desde tu dashboard.
              </p>
            </div>

            <div className="border-b border-neutral-700 pb-6">
              <h3 className="text-lg font-semibold mb-2">¿Qué métodos de pago aceptan?</h3>
              <p className="text-neutral-300">
                Aceptamos todas las tarjetas de crédito y débito, transferencias bancarias y efectivo a través de Mercado Pago.
              </p>
            </div>

            <div className="border-b border-neutral-700 pb-6">
              <h3 className="text-lg font-semibold mb-2">¿Puedo cancelar mi suscripción?</h3>
              <p className="text-neutral-300">
                Sí, puedes cancelar tu suscripción en cualquier momento sin penalizaciones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div></div>}>
      <PricingContent />
    </Suspense>
  );
}
