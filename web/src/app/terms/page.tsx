import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Términos y Condiciones - Nexly",
  description: "Términos y condiciones de uso de la plataforma Nexly para la gestión unificada de mensajerías.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
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
              <p className="text-neutral-300 leading-relaxed">
                Al acceder y utilizar Nexly ("el Servicio"), usted acepta estar sujeto a estos términos y condiciones 
                de uso ("Términos"). Si no está de acuerdo con alguna parte de estos términos, no debe utilizar 
                nuestro servicio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">2. Descripción del Servicio</h2>
              <p className="text-neutral-300 leading-relaxed">
                Nexly es una plataforma que permite la gestión unificada de múltiples canales de mensajería, 
                incluyendo WhatsApp Business, Instagram, Facebook Messenger, TikTok, Telegram y Twitter/X. 
                Nuestro servicio facilita la comunicación empresarial a través de estas plataformas.
              </p>
              <div className="bg-nexly-azul/10 border border-nexly-azul/20 rounded-lg p-4 mt-4">
                <h3 className="text-lg font-semibold mb-2 text-nexly-light-blue">⚠️ Importante sobre WhatsApp</h3>
                <p className="text-neutral-300 text-sm">
                  Nexly se integra únicamente con <strong>WhatsApp Business Platform (Cloud API)</strong>, 
                  NO con WhatsApp personal o la app móvil WhatsApp Business. Para usar WhatsApp en Nexly, 
                  necesitas un número asignado a una Cuenta de WhatsApp Business (WABA) a través de Meta Business Manager.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">3. Cuentas de Usuario</h2>
              <div className="space-y-4">
                <p className="text-neutral-300 leading-relaxed">
                  Para utilizar Nexly, debe crear una cuenta proporcionando información veraz y actualizada.
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-300">
                  <li>Es responsable de mantener la confidencialidad de su cuenta y contraseña</li>
                  <li>Debe notificar inmediatamente cualquier uso no autorizado de su cuenta</li>
                  <li>Una persona o entidad no puede mantener más de una cuenta gratuita</li>
                  <li>Nos reservamos el derecho de suspender cuentas que violen estos términos</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">4. Planes y Facturación</h2>
              <div className="space-y-4">
                <h3 className="text-xl font-medium mb-2 text-nexly-light-blue">4.1 Período de Prueba</h3>
                <p className="text-neutral-300 leading-relaxed">
                  Ofrecemos un período de prueba gratuito de 7 días requiriendo tarjeta de crédito. 
                  Durante este período, tendrá acceso completo a todas las funcionalidades.
                </p>

                <h3 className="text-xl font-medium mb-2 text-nexly-light-blue">4.2 Planes de Suscripción</h3>
                <ul className="list-disc list-inside space-y-2 text-neutral-300">
                  <li><strong>Plan Básico:</strong> Hasta 2 integraciones (WhatsApp Business, Instagram)</li>
                  <li><strong>Plan Premium:</strong> Todas las integraciones disponibles</li>
                </ul>
                
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold mb-2 text-nexly-teal">Requisitos para WhatsApp Business</h4>
                  <ul className="list-disc list-inside space-y-1 text-neutral-300 text-sm">
                    <li>Meta Business Manager configurado</li>
                    <li>Cuenta de WhatsApp Business (WABA) verificada</li>
                    <li>Número de teléfono asignado a la WABA</li>
                    <li>Verificación del negocio y aprobación del display name</li>
                  </ul>
                </div>

                <h3 className="text-xl font-medium mb-2 text-nexly-light-blue">4.3 Facturación</h3>
                <ul className="list-disc list-inside space-y-2 text-neutral-300">
                  <li>Los pagos se procesan a través de Stripe</li>
                  <li>Las suscripciones se renuevan automáticamente</li>
                  <li>Los precios están expresados en Pesos Argentinos (ARS)</li>
                  <li>Puede cancelar su suscripción en cualquier momento</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">5. Uso Aceptable</h2>
              <div className="space-y-4">
                <p className="text-neutral-300 leading-relaxed">
                  Usted se compromete a utilizar Nexly de manera responsable y legal. Está prohibido:
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-300">
                  <li>Enviar spam, contenido fraudulento o ilegal</li>
                  <li>Violar los términos de servicio de las plataformas integradas</li>
                  <li>Intentar acceder no autorizado a nuestros sistemas</li>
                  <li>Usar el servicio para actividades ilegales</li>
                  <li>Interferir con el funcionamiento normal del servicio</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">6. Privacidad y Datos</h2>
              <div className="space-y-4">
                <p className="text-neutral-300 leading-relaxed">
                  Su privacidad es importante para nosotros. Nuestra política de privacidad detalla cómo 
                  recopilamos, usamos y protegemos su información.
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-300">
                  <li>No vendemos ni compartimos sus datos personales con terceros</li>
                  <li>Implementamos medidas de seguridad para proteger su información</li>
                  <li>Cumplimos con las regulaciones de protección de datos aplicables</li>
                  <li>Puede solicitar la eliminación de sus datos en cualquier momento</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">7. Limitación de Responsabilidad</h2>
              <p className="text-neutral-300 leading-relaxed">
                Nexly se proporciona "tal como está". No garantizamos que el servicio esté libre de errores 
                o interrupciones. En ningún caso seremos responsables por daños indirectos, incidentales 
                o consecuenciales que surjan del uso del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">8. Modificaciones</h2>
              <p className="text-neutral-300 leading-relaxed">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones 
                entrarán en vigor inmediatamente después de su publicación. Su uso continuado del servicio 
                constituye la aceptación de los términos modificados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">9. Terminación</h2>
              <div className="space-y-4">
                <p className="text-neutral-300 leading-relaxed">
                  Puede terminar su cuenta en cualquier momento. Nos reservamos el derecho de suspender 
                  o terminar cuentas que violen estos términos.
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-300">
                  <li>Al cancelar, su plan permanece activo hasta el final del período de facturación</li>
                  <li>Sus datos se conservarán por 30 días después de la terminación</li>
                  <li>Puede solicitar la eliminación completa de sus datos</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">10. Ley Aplicable</h2>
              <p className="text-neutral-300 leading-relaxed">
                Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será 
                resuelta en los tribunales competentes de Buenos Aires, Argentina.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">11. Contacto</h2>
              <p className="text-neutral-300 leading-relaxed">
                Si tiene preguntas sobre estos términos, puede contactarnos en:
              </p>
              <div className="bg-neutral-800 rounded-lg p-4 mt-4">
                <p className="text-nexly-teal font-medium">Email:</p>
                <p className="text-neutral-300">hola@nexly.com.ar</p>
                <p className="text-nexly-teal font-medium mt-2">Dirección:</p>
                <p className="text-neutral-300">Buenos Aires, Argentina</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer variant="minimal" />
    </div>
  );
}
