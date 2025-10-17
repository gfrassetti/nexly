"use client";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";
// import { usePaymentLink } from "@/hooks/usePaymentLink";
// import { useStripePayment } from "@/hooks/useStripePayment";
import FAQSection from "@/components/FAQSection";
import ScrollHeader from "@/components/ScrollHeader";
import Footer from "@/components/Footer";
import HowItWorksTimeline from "@/components/HowItWorksTimeline";
import ConversationsExplainer from "@/components/ConversationsExplainer";

function PricingContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<'crecimiento' | 'pro' | 'business'>('crecimiento');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe'>('stripe');
  const [isAnnual, setIsAnnual] = useState(true);
  // const { createPaymentLink, loading } = usePaymentLink();
  // const { createPaymentLink: createStripePaymentLink, loading: stripeLoading } = useStripePayment();

  // Detectar plan desde query parameters
  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan === 'crecimiento' || plan === 'pro' || plan === 'business') {
      setSelectedPlan(plan as 'crecimiento' | 'pro' | 'business');
    }
  }, [searchParams]);

  const plans = [
    {
      id: 'crecimiento',
      name: 'Crecimiento',
      price: '$30',
      priceUSD: true,
      period: '/mes',
      description: 'Para negocios enfocados en soporte y atención al cliente',
        features: [
          '450 conversaciones iniciadas/mes',
          'Conversaciones de respuesta ilimitadas',
          'WhatsApp Business',
          'Instagram',
          'Telegram',
          'Reportes y analytics',
          '7 días gratis, tarjeta requerida',
        ],
      popular: false,
      note: '* Las conversaciones de respuesta no consumen tu cuota de conversaciones iniciadas'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$59',
      priceUSD: true,
      period: '/mes',
      description: 'Para negocios que hacen campañas de outbound regulares',
        features: [
          '1,500 conversaciones iniciadas/mes',
          'Conversaciones de respuesta ilimitadas',
          'WhatsApp Business',
          'Instagram',
          'Facebook Messenger',
          'Telegram',
          'Reportes y analytics',
          'Automatizaciones avanzadas',
          '7 días gratis, tarjeta requerida',
        ],
      popular: true,
      note: '* Las conversaciones de respuesta no consumen tu cuota de conversaciones iniciadas'
    },
    {
      id: 'business',
      name: 'Business',
      price: '$150',
      priceUSD: true,
      period: '/mes',
      description: 'Para empresas con alto volumen de conversaciones',
        features: [
          '2,250 conversaciones iniciadas/mes',
          'Conversaciones de respuesta ilimitadas',
          'WhatsApp Business',
          'Instagram',
          'Facebook Messenger',
          'Telegram',
          'Reportes y analytics',
          'Automatizaciones avanzadas',
          'Integraciones sin límite',
          '7 días gratis, tarjeta requerida',
        ],
      popular: false,
      note: '* Las conversaciones de respuesta no consumen tu cuota de conversaciones iniciadas'
    },
  ];

  const handleStartTrial = async (planType: 'crecimiento' | 'pro' | 'business') => {
    // Guardar el plan seleccionado en localStorage para mantener el contexto
    localStorage.setItem('selectedPlan', planType);
    localStorage.setItem('selectedPaymentMethod', selectedPaymentMethod);
    
    // Si el usuario está autenticado, ir directo al pago
    if (token) {
      // Usuario autenticado: ir directo al checkout/pago con el token
      window.location.href = `/checkout?plan=${planType}&payment=${selectedPaymentMethod}&token=${token}`;
    } else {
      // Usuario no autenticado: ir al registro primero
      window.location.href = `/register?plan=${planType}&payment=${selectedPaymentMethod}`;
    }
  };

  return (
    <div className="min-h-screen bg-accent-dark text-accent-cream">
      {/* Header */}
      <ScrollHeader />

      {/* Hero Section */}
      <div className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Elige tu plan perfecto
          </h1>
          <p className="text-xl text-neutral-300 max-w-2xl mx-auto mb-8">
            Comienza con 7 días gratis. Tarjeta de crédito requerida.
            Cancela cuando quieras.
          </p>

          {/* Trial Banner */}
          <div className="bg-nexly-teal/10 border border-nexly-teal/20 rounded-lg p-6 max-w-2xl mx-auto mb-12">
            <div className="flex items-center justify-center gap-3 mb-2">
              <svg className="w-6 h-6 text-nexly-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
                <h3 className="text-lg font-semibold text-nexly-teal">7 días de prueba gratis</h3>
            </div>
            <p className="text-neutral-300">
              Acceso completo a todas las funciones durante tu período de prueba
            </p>
          </div>

        </div>
      </div>

      {/* Payment Method Selector - Hidden for now */}
      {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">Elige tu método de pago preferido</h2>
          <p className="text-neutral-400">Ambos métodos son seguros y confiables</p>
        </div>
        
        <div className="flex justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={() => setSelectedPaymentMethod('stripe')}
            className={`flex items-center gap-3 px-6 py-4 rounded-lg border-2 transition-all duration-300 ${
              selectedPaymentMethod === 'stripe'
                ? 'border-nexly-teal bg-nexly-teal/10'
                : 'border-neutral-700 bg-neutral-800/30 hover:border-neutral-600'
            }`}
          >
            <img src="/strapi_logo.png" alt="Stripe" className="h-6 w-auto" />
            <span className="font-medium">Stripe</span>
          </button>
        </div>
      </div> */}

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 border-2 transition-all duration-300 flex flex-col h-full ${
                plan.popular
                  ? 'border-nexly-teal bg-neutral-800/50 shadow-2xl'
                  : 'border-neutral-700 bg-neutral-800/30 hover:border-neutral-600'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-20">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                    Más popular
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-neutral-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-neutral-400 ml-1"> USD{plan.period}</span>
                </div>
                {plan.priceUSD && (
                  <p className="text-sm text-neutral-500 mt-2">
                    ~${Math.round(parseFloat(plan.price.replace('$', '')) * 1000)} ARS/mes aprox
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-nexly-teal mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>


              {plan.note && (
                <div className="mb-6 p-3 bg-nexly-teal/10 border border-nexly-teal/20 rounded-lg">
                  <p className="text-xs text-neutral-400">{plan.note}</p>
                </div>
              )}

              {/* Botón que redirige según el estado de autenticación */}
              <div className="space-y-3 mt-auto">
                <button
                  onClick={() => handleStartTrial(plan.id as 'crecimiento' | 'pro' | 'business')}
                  className="w-full py-4 rounded-[2rem] font-semibold transition-all duration-300 bg-accent-cream hover:bg-accent-cream/90 text-[#14120b] border border-accent-cream/20 hover:border-accent-cream/40"
                >
                  {token ? 'Continuar al Pago' : 'Comenzar Prueba Gratis'}
                </button>
                <p className="text-center text-xs text-neutral-400 mb-3">
                  7 días gratis • Tarjeta requerida
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
                  <span>Pago seguro con</span>
                  <img src="/strapi_logo.png" alt="Stripe" className="h-10 w-auto" />
                </div>
              </div>

              <p className="text-center text-sm text-neutral-400 mt-4">
                Sin compromiso • Cancela cuando quieras
              </p>
            </div>
          ))}
        </div>


        {/* Tabla de Capacidades */}
        <div className="mt-16 bg-gradient-to-br from-nexly-azul/10 to-nexly-teal/10 border border-nexly-teal/20 rounded-2xl p-8 max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Capacidades Incluidas en tu Plan</h2>
            <p className="text-neutral-300 text-lg">Todo lo que necesitas para gestionar tus conversaciones profesionalmente</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left py-4 px-4 font-semibold text-nexly-teal">Funcionalidad</th>
                  <th className="text-center py-4 px-4 font-semibold text-nexly-teal">Crecimiento</th>
                  <th className="text-center py-4 px-4 font-semibold text-nexly-teal">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold text-nexly-teal">Business</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700">
                {/* Soporte Ilimitado */}
                <tr className="hover:bg-neutral-800/30">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-accent-cream">Conversaciones de Respuesta</div>
                        <div className="text-xs text-neutral-400">Respuestas a clientes sin límite</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-green-400 font-semibold">✓ Ilimitado</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-green-400 font-semibold">✓ Ilimitado</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-green-400 font-semibold">✓ Ilimitado</span>
                  </td>
                </tr>

                {/* Contactos Salientes */}
                <tr className="hover:bg-neutral-800/30">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-accent-cream">Conversaciones Iniciadas</div>
                        <div className="text-xs text-neutral-400">Iniciar conversaciones y campañas</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-orange-400 font-semibold">450/mes</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-orange-400 font-semibold">1,500/mes</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-orange-400 font-semibold">2,250/mes</span>
                  </td>
                </tr>

                {/* Límite Diario */}
                <tr className="hover:bg-neutral-800/30">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-accent-cream">Límite Diario</div>
                        <div className="text-xs text-neutral-400">Protección anti-spam</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-blue-400 font-semibold">20/día</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-blue-400 font-semibold">50/día</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-blue-400 font-semibold">110/día</span>
                  </td>
                </tr>

                {/* Integraciones */}
                <tr className="hover:bg-neutral-800/30">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-accent-cream">Integraciones</div>
                        <div className="text-xs text-neutral-400">Canales de comunicación</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-purple-400 font-semibold">3</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-purple-400 font-semibold">3</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-purple-400 font-semibold">Sin límite</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <h4 className="font-semibold mb-2 text-green-400 text-center">Diseñado para tu Éxito</h4>
            <p className="text-sm text-neutral-300 text-center">
              Nexly optimiza tu comunicación para maximizar resultados. 
              <strong className="text-green-400">Conversaciones de respuesta ilimitadas</strong> para atención al cliente de primera. 
              <strong className="text-orange-400">Conversaciones iniciadas</strong> para crecimiento controlado y profesional.
            </p>
          </div>

          {/* Estrategia de Monetización */}
          <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <h4 className="font-semibold mb-2 text-orange-400 text-center">¿Necesitas Más Capacidad?</h4>
            <p className="text-sm text-neutral-300 text-center mb-4">
              Cuando alcances tu límite de conversaciones iniciadas, Nexly te ofrece dos opciones claras:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-center p-3 bg-orange-500/5 rounded-lg">
                <div className="text-lg font-bold text-orange-400 mb-1">Paquete de Conversaciones Adicionales</div>
                <div className="text-sm text-neutral-400 mb-2">500 conversaciones iniciadas extra</div>
                <div className="text-lg font-bold text-accent-cream">$30 USD</div>
                <div className="text-xs text-neutral-500">Pago único</div>
              </div>
              <div className="text-center p-3 bg-nexly-teal/10 rounded-lg">
                <div className="text-lg font-bold text-nexly-teal mb-1">Subir de Plan</div>
                <div className="text-sm text-neutral-400 mb-2">Más conversaciones iniciadas/mes</div>
                <div className="text-lg font-bold text-accent-cream">Consulta precios</div>
                <div className="text-xs text-neutral-500">Según plan elegido</div>
              </div>
            </div>
            <div className="mt-3 p-2 bg-green-500/10 rounded-lg">
              <p className="text-xs text-green-400 text-center">
                <strong>Flexibilidad total:</strong> Elige la opción que mejor se adapte a tu crecimiento
              </p>
            </div>
          </div>
        </div>

        {/* Información adicional para usuarios no autenticados */}
        {!token && (
          <div className="mt-16 bg-neutral-800/50 border border-neutral-700 rounded-lg p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Comienza en 3 Pasos Simples</h2>
            <p className="text-neutral-400 text-lg">Acceso inmediato a todas las funciones premium - sin configuración compleja</p>
        </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-nexly-teal rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent-cream font-bold text-lg">1</span>
                </div>
                <h3 className="font-semibold mb-2">Regístrate Gratis</h3>
                <p className="text-neutral-400 text-sm">Acceso inmediato a todas las funciones premium</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-nexly-teal rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent-cream font-bold text-lg">2</span>
                </div>
                <h3 className="font-semibold mb-2">Elige tu Capacidad</h3>
                <p className="text-neutral-400 text-sm">Plan Crecimiento para atención al cliente o Plan Pro para conversaciones iniciadas</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-nexly-teal rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent-cream font-bold text-lg">3</span>
                </div>
                <h3 className="font-semibold mb-2">Comienza a Crecer</h3>
                <p className="text-neutral-400 text-sm mb-2">Procesamiento seguro con</p>
                <div className="flex justify-center items-center gap-4">
                  <img src="/strapi_logo.png" alt="Stripe" className="h-8 w-auto" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How It Works Timeline */}
        <div className="mt-24">
          <HowItWorksTimeline />
        </div>

        {/* Conversations Explainer */}
        <div className="mt-24">
          <ConversationsExplainer />
        </div>

        {/* FAQ Section */}
        <FAQSection />
      </div>

      {/* Footer */}
      <Footer />
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
