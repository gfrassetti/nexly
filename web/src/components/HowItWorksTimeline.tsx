"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

export default function HowItWorksTimeline() {
  const steps = [
    {
      id: "connect",
      title: "Conecta tus canales",
      description: "Integra WhatsApp Business, Instagram y Telegram en minutos",
      details: [
        "Autorización con Meta Business Manager",
        "Conexión de número WhatsApp Business", 
        "Integración de Instagram y Telegram",
        "Configuración completa en menos de 5 minutos"
      ],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      color: "blue"
    },
    {
      id: "receive", 
      title: "Recibe mensajes unificados",
      description: "Todos los mensajes aparecen instantáneamente en tu inbox",
      details: [
        "Mensajes de todos los canales en una sola vista",
        "Notificaciones en tiempo real",
        "Sin límites para mensajes entrantes",
        "Interfaz limpia y organizada"
      ],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      color: "purple"
    },
    {
      id: "respond",
      title: "Responde sin límites",
      description: "Responde a clientes dentro de 24h sin consumir tu cuota",
      details: [
        "Ventana de 24 horas para respuestas gratuitas",
        "Mensajes sin límite en esta ventana",
        "No cuenta para tu límite mensual",
        "Máxima eficiencia en atención al cliente"
      ],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "green",
      featured: true
    },
    {
      id: "initiate",
      title: "Inicia conversaciones",
      description: "Envía mensajes proactivos que cuentan para tu plan",
      details: [
        "Primer contacto con nuevos clientes",
        "Mensajes después de 24h de inactividad",
        "Campañas de marketing y promociones",
        "Optimiza tu cuota mensual de conversaciones"
      ],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
      color: "orange"
    },
    {
      id: "monitor",
      title: "Monitorea y optimiza",
      description: "Dashboard completo para gestionar tu uso eficientemente",
      details: [
        "Métricas en tiempo real",
        "Alertas inteligentes de límites",
        "Sugerencias de optimización",
        "Escalabilidad automática según necesidades"
      ],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: "indigo"
    }
  ];

  const getColorClasses = (color: string, featured: boolean = false) => {
    const colors = {
      blue: {
        bg: featured ? 'bg-blue-500/20' : 'bg-blue-500/10',
        border: featured ? 'border-blue-500/40' : 'border-blue-500/20',
        icon: 'bg-blue-500 text-accent-cream',
        accent: 'text-blue-400'
      },
      purple: {
        bg: featured ? 'bg-purple-500/20' : 'bg-purple-500/10',
        border: featured ? 'border-purple-500/40' : 'border-purple-500/20',
        icon: 'bg-purple-500 text-accent-cream',
        accent: 'text-purple-400'
      },
      green: {
        bg: featured ? 'bg-green-500/20' : 'bg-green-500/10',
        border: featured ? 'border-green-500/40' : 'border-green-500/20',
        icon: 'bg-green-500 text-accent-cream',
        accent: 'text-green-400'
      },
      orange: {
        bg: featured ? 'bg-orange-500/20' : 'bg-orange-500/10',
        border: featured ? 'border-orange-500/40' : 'border-orange-500/20',
        icon: 'bg-orange-500 text-accent-cream',
        accent: 'text-orange-400'
      },
      indigo: {
        bg: featured ? 'bg-indigo-500/20' : 'bg-indigo-500/10',
        border: featured ? 'border-indigo-500/40' : 'border-indigo-500/20',
        icon: 'bg-indigo-500 text-accent-cream',
        accent: 'text-indigo-400'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-accent-cream via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
            Cómo funciona Nexly
          </h2>
          <p className="text-xl text-neutral-400 max-w-3xl mx-auto leading-relaxed">
            Un proceso simple y transparente para gestionar todas tus conversaciones 
            de manera eficiente y rentable
          </p>
        </div>

        {/* Steps Carousel */}
        <Carousel
          opts={{
            align: "start",
          }}
          className="w-full max-w-md mx-auto"
          orientation="vertical"
        >
          <CarouselContent className="-mt-1 h-[415px]">
            {steps.map((step, index) => {
              const colors = getColorClasses(step.color, step.featured);
              return (
                <CarouselItem key={step.id} className="pt-1 basis-2/3">
                  <div className="p-1">
                    <Card className="bg-neutral-800/40 border-neutral-700/50 p-4">
                      <CardContent className="flex items-center justify-center p-6">
                        <div className="text-center">
                          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${colors.icon} shadow-lg`}>
                            {step.icon}
                          </div>
                          <h3 className="text-2xl font-bold text-accent-cream mb-2">
                            {index + 1}
                          </h3>
                          <h4 className="text-lg font-semibold text-nexly-teal mb-2">
                            {step.title}
                          </h4>
                          <p className="text-neutral-300 text-sm">
                            {step.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious/>
          <CarouselNext/>
        </Carousel>

      </div>
    </div>
  );
}
