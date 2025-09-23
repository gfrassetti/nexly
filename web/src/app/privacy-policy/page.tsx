import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Política de Privacidad - Nexly",
  description: "Política de privacidad de Nexly. Conoce cómo protegemos y utilizamos tu información personal.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Header */}
      <Header variant="auth" />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">Política de Privacidad</h1>
          <p className="text-neutral-400 text-lg mb-8">
            Última actualización: {new Date().toLocaleDateString('es-AR')}
          </p>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-nexly-teal">1. Información General</h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Nexly ("nosotros", "nuestro" o "la empresa") se compromete a proteger la privacidad de nuestros usuarios. 
                Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos su información 
                personal cuando utiliza nuestra plataforma de gestión de mensajería.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Información que Recopilamos</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Información Personal</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Nombre de usuario y dirección de correo electrónico</li>
                <li>Información de contacto y perfil</li>
                <li>Datos de autenticación y tokens de acceso</li>
              </ul>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Información de Integraciones</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Tokens de acceso de WhatsApp Business, Instagram, Facebook Messenger y otras plataformas</li>
                <li>IDs de cuentas de negocio y números de teléfono</li>
                <li>Metadatos de mensajes y conversaciones</li>
                <li>Información de contactos y listas de distribución</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Cómo Utilizamos su Información</h2>
              <p className="text-gray-700 mb-4">Utilizamos su información para:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Proporcionar y mantener nuestros servicios de mensajería</li>
                <li>Gestionar integraciones con plataformas de mensajería</li>
                <li>Procesar y entregar mensajes en su nombre</li>
                <li>Mejorar nuestros servicios y desarrollar nuevas funcionalidades</li>
                <li>Comunicarnos con usted sobre actualizaciones del servicio</li>
                <li>Cumplir con obligaciones legales y regulatorias</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Compartir Información</h2>
              <p className="text-gray-700 mb-4">
                No vendemos, alquilamos ni compartimos su información personal con terceros, excepto en los siguientes casos:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Plataformas de Mensajería:</strong> Compartimos tokens de acceso con WhatsApp, Instagram, Facebook Messenger y otras plataformas integradas para facilitar el envío de mensajes</li>
                <li><strong>Proveedores de Servicios:</strong> Utilizamos servicios de terceros para hosting y análisis</li>
                <li><strong>Requisitos Legales:</strong> Cuando sea requerido por ley o para proteger nuestros derechos</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Seguridad de los Datos</h2>
              <p className="text-gray-700 mb-4">
                Implementamos medidas de seguridad técnicas y organizativas para proteger su información:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Encriptación de datos en tránsito y en reposo</li>
                <li>Autenticación segura y control de acceso</li>
                <li>Monitoreo continuo de seguridad</li>
                <li>Copias de seguridad regulares y recuperación de desastres</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Sus Derechos</h2>
              <p className="text-gray-700 mb-4">Usted tiene derecho a:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Acceder y corregir su información personal</li>
                <li>Solicitar la eliminación de sus datos</li>
                <li>Retirar el consentimiento para el procesamiento de datos</li>
                <li>Exportar sus datos en un formato estructurado</li>
                <li>Presentar una queja ante la autoridad de protección de datos</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Retención de Datos</h2>
              <p className="text-gray-700 mb-4">
                Conservamos su información personal durante el tiempo necesario para cumplir con los propósitos 
                descritos en esta política, a menos que la ley requiera un período de retención más largo.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies y Tecnologías Similares</h2>
              <p className="text-gray-700 mb-4">
                Utilizamos cookies y tecnologías similares para mejorar su experiencia, recordar sus preferencias 
                y analizar el uso de nuestros servicios. Puede gestionar las cookies a través de la configuración de su navegador.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Transferencias Internacionales</h2>
              <p className="text-gray-700 mb-4">
                Su información puede ser transferida y procesada en países fuera de su jurisdicción. 
                Nos aseguramos de que dichas transferencias cumplan con las leyes de protección de datos aplicables.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Cambios a esta Política</h2>
              <p className="text-gray-700 mb-4">
                Podemos actualizar esta Política de Privacidad ocasionalmente. Le notificaremos sobre cambios 
                significativos a través de nuestro servicio o por correo electrónico.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contacto</h2>
              <p className="text-gray-700 mb-4">
                Si tiene preguntas sobre esta Política de Privacidad o sobre cómo manejamos su información, 
                puede contactarnos en:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong> privacy@nexly.com
                </p>
                <p className="text-gray-700">
                  <strong>Dirección:</strong> Nexly Technologies, Inc.
                </p>
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
