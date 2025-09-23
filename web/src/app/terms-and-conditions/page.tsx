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
    <div className="min-h-screen bg-neutral-900 text-white">
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
                  <li><strong>Plan Básico:</strong> $2.999 ARS/mes - Hasta 2 integraciones (WhatsApp, Instagram)</li>
                  <li><strong>Plan Premium:</strong> $5.999 ARS/mes - Todas las integraciones disponibles</li>
                </ul>
                <p className="mt-4">
                  <strong>Período de prueba:</strong> Todos los planes incluyen un período de prueba gratuito de 7 días. 
                  Se requiere tarjeta de crédito para iniciar el período de prueba. El cobro se realizará automáticamente 
                  al finalizar el período de prueba, a menos que se cancele antes.
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
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">6. Límites de Uso</h2>
              <div className="text-neutral-300 leading-relaxed mb-4">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Plan Básico:</strong> Hasta 2 integraciones activas</li>
                  <li><strong>Plan Premium:</strong> Acceso a todas las integraciones disponibles</li>
                  <li>Mensajes ilimitados en ambos planes</li>
                  <li>Nos reservamos el derecho de implementar límites adicionales si es necesario</li>
                </ul>
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
