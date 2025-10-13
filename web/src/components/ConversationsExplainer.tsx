"use client";

export default function ConversationsExplainer() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Maximiza el valor de tu plan
          </h2>
          <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
            Estrategias simples para aprovechar al máximo Nexly
          </p>
        </div>

        {/* Mensaje clave - Simple y directo */}
        <div className="bg-gradient-to-br from-green-500/20 to-nexly-teal/20 border border-green-500/30 rounded-2xl p-8 mb-12">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-green-500/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-3 text-green-400">Regla de Oro: Responde Rápido = Sin Límite</h3>
              <p className="text-lg text-neutral-300">
                Cuando un cliente te escribe, tienes <strong className="text-accent-cream">24 horas</strong> para responder 
                todo lo que necesites. <strong className="text-green-400">Sin límites, sin cargos extras</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Ejemplos visuales simples */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold mb-8 text-center">
            Ejemplos de Uso Diario
          </h3>

          {/* Escenario 1: Conversación iniciada por cliente */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-green-400">
                Atención a Cliente (Lo que más usarás)
              </h4>
            </div>

            <div className="relative bg-accent-dark/60 border border-neutral-700 rounded-xl p-6">
              {/* Timeline horizontal */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-500">Lunes 10:00 AM</span>
                  <span className="text-xs text-neutral-500">Martes 10:00 AM</span>
                </div>
                <div className="relative h-2 bg-neutral-800 rounded-full">
                  <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-400 rounded-full" />
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                </div>
                <div className="flex justify-center mt-2">
                  <span className="text-sm font-medium text-green-400">
                    ← 24 horas de mensajes sin límite →
                  </span>
                </div>
              </div>

              {/* Mensajes ejemplo */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-blue-400 text-xs font-bold">C</span>
                  </div>
                  <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="text-xs text-blue-400 mb-1">10:00 AM - Cliente</div>
                    <p className="text-sm">"Hola, ¿tienen stock del producto X?"</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-3 max-w-md">
                    <div className="text-xs text-green-400 mb-1 text-right">10:05 AM - Tú</div>
                    <p className="text-sm text-right">"¡Sí! Tenemos en stock. ¿Cuántas unidades necesitas?"</p>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-green-400 text-xs font-bold">T</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-blue-400 text-xs font-bold">C</span>
                  </div>
                  <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="text-xs text-blue-400 mb-1">10:10 AM - Cliente</div>
                    <p className="text-sm">"Necesito 5 unidades. ¿Cuánto sería?"</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-3 max-w-md">
                    <div className="text-xs text-green-400 mb-1 text-right">11:30 AM - Tú</div>
                    <p className="text-sm text-right">"El total sería $500. ¿Pasas a retirar o te lo enviamos?"</p>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-green-400 text-xs font-bold">T</span>
                  </div>
                </div>
              </div>

              {/* Resultado */}
              <div className="mt-6 pt-6 border-t border-neutral-700">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">∞ Sin Límite</div>
                      <p className="text-xs text-green-300 mt-1">
                        No consume tu cuota mensual
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Escenario 2: Conversación iniciada por empresa */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                <span className="text-orange-400 font-bold">!</span>
              </div>
              <h4 className="text-xl font-bold text-orange-400">
                Marketing Proactivo (Usa tu cuota del plan)
              </h4>
            </div>

            <div className="relative bg-accent-dark/60 border border-neutral-700 rounded-xl p-6">
              {/* Timeline */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-500">Última actividad: Hace 3 días</span>
                  <span className="text-xs text-neutral-500">Martes 2:00 PM</span>
                </div>
                <div className="relative h-2 bg-neutral-800 rounded-full">
                  <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" />
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-orange-400 rounded-full border-2 border-white" />
                </div>
                <div className="flex justify-start mt-2 ml-24">
                  <span className="text-sm font-medium text-orange-400">
                    Inicia nueva conversación (Cuenta para límite)
                  </span>
                </div>
              </div>

              {/* Mensaje */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 max-w-md">
                    <div className="text-xs text-orange-400 mb-1 text-right">2:00 PM - Tú (Plantilla aprobada)</div>
                    <p className="text-sm text-right">
                      "🎉 ¡Oferta especial! 20% de descuento en todos nuestros productos hasta el viernes. 
                      ¿Te interesa conocer más?"
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <span className="text-orange-400 text-xs font-bold">T</span>
                  </div>
                </div>
              </div>

              {/* Resultado */}
              <div className="mt-6 pt-6 border-t border-neutral-700">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                    </svg>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">1 contacto usado</div>
                      <p className="text-xs text-orange-300 mt-1">
                        Cuenta para tu cuota del plan
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla simple de uso */}
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          {/* Uso Reactivo - Sin Límite */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/30 rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-green-400 mb-2">
                Uso Reactivo
              </h3>
              <p className="text-sm text-neutral-400">
                Atender consultas de clientes
              </p>
            </div>

            <div className="bg-accent-dark/60 border border-neutral-700 rounded-lg p-4 mb-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-green-400 mb-2">∞</div>
                <div className="text-sm font-medium text-green-300">Sin Límite</div>
              </div>
            </div>

            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Cliente te escribe primero</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Respondes dentro de 24h</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Atención al cliente</span>
              </li>
            </ul>
          </div>

          {/* Uso Proactivo - Con límite */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2 border-orange-500/30 rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-orange-400 mb-2">
                Uso Proactivo
              </h3>
              <p className="text-sm text-neutral-400">
                Iniciar conversaciones con clientes
              </p>
            </div>

            <div className="bg-accent-dark/60 border border-neutral-700 rounded-lg p-4 mb-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-orange-400 mb-2">450</div>
                <div className="text-sm font-medium text-orange-300">Plan Básico</div>
                <div className="text-xs text-neutral-500 mt-1">900 en Premium</div>
              </div>
            </div>

            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>Marketing y promociones</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>Seguimiento a clientes</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>Notificaciones proactivas</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Beneficios de Nexly */}
        <div className="mt-12 bg-gradient-to-r from-nexly-teal/10 via-nexly-azul/10 to-nexly-light-blue/10 border border-nexly-teal/20 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-center">
            Ventajas de usar Nexly
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-nexly-teal/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-nexly-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="font-bold mb-2">Multi-canal Unificado</h4>
              <p className="text-sm text-neutral-400">WhatsApp + Instagram + Telegram en un solo lugar</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-nexly-azul/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-nexly-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-bold mb-2">Analytics Profesionales</h4>
              <p className="text-sm text-neutral-400">Métricas y reportes de todas tus conversaciones</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-bold mb-2">Automatización Incluida</h4>
              <p className="text-sm text-neutral-400">Respuestas automáticas y gestión inteligente</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-nexly-teal/10 border border-nexly-teal/20 rounded-lg">
            <p className="text-sm text-center text-neutral-300">
              <strong className="text-nexly-teal">Tarifa plana simple:</strong> $30 USD/mes incluye plataforma completa + 
              450 contactos proactivos. Responder a clientes siempre sin límite.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

