import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Términos y Condiciones - Nexly",
  description: "Términos y condiciones de uso de Nexly. Conoce las reglas y condiciones para el uso de nuestra plataforma de mensajería unificada.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-accent-dark text-accent-cream">
      {/* Header */}
      <Header variant="auth" />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">Términos y Condiciones</h1>
          <p className="text-neutral-400 text-lg mb-8">
            Última actualización: {new Date().toLocaleDateString('es-AR')}
          </p>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">1. Aceptación de los Términos</h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Al acceder y utilizar Nexly ("la plataforma", "el servicio"), usted acepta cumplir con estos Términos y Condiciones. 
                Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro servicio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">2. Descripción del Servicio</h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Nexly es una plataforma que permite unificar la gestión de mensajería a través de múltiples canales 
                como WhatsApp, Instagram, Facebook Messenger, TikTok, Telegram y Twitter/X, facilitando la comunicación 
                empresarial y la atención al cliente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">3. Planes y Precios</h2>
              <div className="text-neutral-300 leading-relaxed mb-4">
                <p className="mb-4">Nexly ofrece los siguientes planes de suscripción:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Plan Básico:</strong> $30 USD/mes (~$30,000 ARS) - 450 conversaciones/mes, hasta 3 integraciones</li>
                  <li><strong>Plan Premium:</strong> $60 USD/mes (~$60,000 ARS) - 900 conversaciones/mes, hasta 10 integraciones</li>
                    <li><strong>Plan Enterprise:</strong> $150 USD/mes (~$150,000 ARS) - 2,250 conversaciones/mes, integraciones sin límite</li>
                </ul>
                <p className="mt-4">
                  <strong>Período de prueba:</strong> Todos los planes incluyen un período de prueba gratuito de 7 días 
                  con 50 conversaciones incluidas. Se requiere tarjeta de crédito para iniciar el período de prueba. 
                  El cobro se realizará automáticamente al finalizar el período de prueba, a menos que se cancele antes.
                </p>
                <p className="mt-4">
                  <strong>Nota:</strong> Los precios en ARS son aproximados y pueden variar según el tipo de cambio. 
                  La facturación se realiza en USD.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">4. Facturación y Pagos</h2>
              <div className="text-neutral-300 leading-relaxed mb-4">
                <ul className="list-disc list-inside space-y-2">
                  <li>Los pagos se procesan a través de Stripe</li>
                  <li>Las suscripciones se renuevan automáticamente cada mes</li>
                  <li>Los precios están expresados en pesos argentinos (ARS)</li>
                  <li>No ofrecemos reembolsos por períodos parciales no utilizados</li>
                  <li>Puede cancelar su suscripción en cualquier momento desde su panel de usuario</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">5. Uso Aceptable</h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Usted se compromete a utilizar Nexly únicamente para fines legales y de acuerdo con estos términos. 
                Está prohibido el uso para actividades ilegales, spam, acoso, o cualquier actividad que pueda dañar 
                la reputación de la plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">6. Política de Uso Justo y Límites</h2>
              <div className="text-neutral-300 leading-relaxed space-y-4">
                <p>
                  Nexly implementa una <strong>Política de Uso Justo</strong> para garantizar un servicio sostenible 
                  y de calidad para todos nuestros usuarios. Los límites están diseñados para cubrir el uso normal 
                  de negocios mientras mantenemos precios accesibles.
                </p>

                <div className="bg-nexly-azul/10 border border-nexly-azul/20 rounded-lg p-4 my-4">
                  <h3 className="font-semibold mb-3 text-nexly-light-blue">Límites de Conversaciones por Plan</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Free Trial:</strong> 50 conversaciones totales, máximo 5 por día</li>
                    <li><strong>Plan Básico:</strong> 450 conversaciones/mes, máximo 20 por día</li>
                    <li><strong>Plan Premium:</strong> 900 conversaciones/mes, máximo 45 por día</li>
                    <li><strong>Plan Enterprise:</strong> 2,250 conversaciones/mes, máximo 110 por día</li>
                  </ul>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-green-400">¿Qué NO cuenta para tu límite?</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Mensajes entrantes:</strong> Todos los mensajes que recibes de clientes son sin límite</li>
                    <li><strong>Respuestas dentro de 24h:</strong> Si respondes a un cliente dentro de las 24 horas desde su último mensaje, no cuenta para tu límite mensual</li>
                    <li><strong>Conversaciones iniciadas por cliente:</strong> Cuando el cliente inicia la conversación, puedes responder libremente</li>
                  </ul>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-orange-400">¿Qué SÍ cuenta para tu límite?</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Conversaciones iniciadas por tu empresa:</strong> Cuando envías el primer mensaje a un cliente</li>
                    <li><strong>Mensajes fuera de ventana de 24h:</strong> Mensajes enviados después de 24h sin actividad del cliente</li>
                    <li><strong>Mensajes con plantillas aprobadas:</strong> Mensajes de marketing, notificaciones programadas</li>
                    <li><strong>Campañas masivas:</strong> Envíos a múltiples contactos simultáneamente</li>
                  </ul>
                </div>

                <h3 className="font-semibold mb-3 text-nexly-teal mt-6">Límites de Integraciones</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Free Trial:</strong> Hasta 5 integraciones activas</li>
                  <li><strong>Plan Básico:</strong> Hasta 3 integraciones activas</li>
                  <li><strong>Plan Premium:</strong> Hasta 10 integraciones activas</li>
                  <li><strong>Plan Enterprise:</strong> Integraciones sin límite</li>
                </ul>

                <h3 className="font-semibold mb-3 text-nexly-teal mt-6">Renovación de Límites</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Límite mensual:</strong> Se renueva el día 1 de cada mes a las 00:00 UTC</li>
                  <li><strong>Límite diario:</strong> Se renueva cada día a las 00:00 UTC</li>
                </ul>

                <h3 className="font-semibold mb-3 text-nexly-teal mt-6">Exceder Límites</h3>
                <p>
                  Si alcanza su límite de conversaciones mensual o diario, el sistema le impedirá enviar más 
                  mensajes hasta que se renueve el período correspondiente. Para enviar más mensajes inmediatamente, 
                  puede actualizar su plan a uno superior desde su dashboard.
                </p>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold mb-2 text-yellow-400">Uso Prohibido</h4>
                  <p className="text-sm mb-2">
                    El uso del servicio para las siguientes actividades está estrictamente prohibido y puede resultar 
                    en la suspensión inmediata de su cuenta sin reembolso:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Envío masivo de spam o mensajes no solicitados</li>
                    <li>Campañas de marketing sin consentimiento de los destinatarios</li>
                    <li>Automatización excesiva que simule comportamiento humano engañoso</li>
                    <li>Violación de las políticas de WhatsApp Business o Meta</li>
                    <li>Cualquier actividad ilegal o fraudulenta</li>
                  </ul>
                </div>

                <p className="mt-4">
                  Nos reservamos el derecho de modificar estos límites con previo aviso de 30 días. 
                  Los cambios que reduzcan significativamente los límites solo aplicarán a nuevas suscripciones, 
                  manteniendo los límites existentes para clientes actuales durante al menos 6 meses.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">7. Privacidad y Datos</h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                El manejo de sus datos personales se rige por nuestra Política de Privacidad. 
                Nos comprometemos a proteger su información y a utilizarla únicamente para proporcionar 
                y mejorar nuestros servicios.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">8. Modificaciones del Servicio</h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto del servicio 
                en cualquier momento. Los cambios significativos serán notificados con anticipación cuando sea posible.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">9. Terminación</h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Cualquiera de las partes puede terminar estos términos en cualquier momento. 
                La terminación por parte del usuario no genera derecho a reembolso por períodos ya facturados. 
                Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">10. Limitación de Responsabilidad</h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Nexly se proporciona "tal como está" sin garantías de ningún tipo. No seremos responsables 
                por daños indirectos, incidentales o consecuenciales que puedan resultar del uso del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">11. Modificaciones de los Términos</h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Podemos actualizar estos Términos y Condiciones periódicamente. Los cambios entrarán en vigor 
                inmediatamente después de su publicación en esta página. Su uso continuado del servicio constituye 
                la aceptación de los términos modificados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">12. Contacto</h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Si tiene preguntas sobre estos Términos y Condiciones, contáctenos:
              </p>
              <p className="text-neutral-300">
                <strong>Email:</strong> legal@nexly.com
              </p>
              <p className="text-neutral-300">
                <strong>Dirección:</strong> Nexly Technologies, Inc.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer variant="minimal" />
    </div>
  );
}
