"use client";
import Accordion from "./Accordion";

export default function FAQSection() {
  const faqItems = [
    {
      title: "¿Qué incluye la prueba gratuita?",
      content: (
        <p>
          Acceso completo a todas las funciones de Nexly durante 7 días. Se requiere tarjeta de crédito.
        </p>
      )
    },
    {
      title: "¿Puedo cambiar de plan más tarde?",
      content: (
        <p>
          Sí, puedes cambiar entre planes en cualquier momento desde tu dashboard.
        </p>
      )
    },
    {
      title: "¿Qué métodos de pago aceptan?",
      content: (
        <div>
          <p className="mb-3">
            Aceptamos todas las tarjetas de crédito y débito a través de:
          </p>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <img src="/strapi_logo.png" alt="Stripe" className="h-6 w-auto mx-auto mb-2" />
              <span className="text-sm text-neutral-400">Stripe</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "¿Puedo cancelar mi suscripción?",
      content: (
        <p>
          Sí, puedes cancelar tu suscripción en cualquier momento sin penalizaciones.
        </p>
      )
    },
    {
      title: "¿Puedo usar mi WhatsApp personal con Nexly?",
      content: (
        <div>
          <div className="mb-4 p-4 bg-nexly-azul/10 border border-nexly-azul/20 rounded-lg">
            <p className="text-nexly-light-blue font-semibold mb-2">
              <strong>No.</strong> Nexly se integra únicamente con WhatsApp Business Platform (Cloud API), 
              no con WhatsApp personal o la app móvil WhatsApp Business.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-nexly-teal">¿Qué necesitas?</h4>
              <ul className="space-y-2 text-sm">
                <li>• Meta Business Manager configurado</li>
                <li>• Cuenta de WhatsApp Business (WABA)</li>
                <li>• Número de teléfono asignado a la WABA</li>
                <li>• Verificación del negocio (para volúmenes altos)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-red-400">¿Qué NO funciona?</h4>
              <ul className="space-y-2 text-sm">
                <li>• WhatsApp personal (número personal)</li>
                <li>• App móvil WhatsApp Business</li>
                <li>• Números sin WABA asignada</li>
                <li>• Cuentas personales de Facebook</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-sm text-neutral-400">
              <strong>Nota:</strong> Si no tienes una WABA configurada, te ayudamos con el proceso de configuración.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "¿Cómo funciona la gestión de contactos en Nexly?",
      content: (
        <div>
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 font-semibold mb-2">
              <strong>Importante:</strong> Nexly NO importa contactos existentes de tus plataformas.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-nexly-teal">¿Cómo se crean contactos?</h4>
              <ul className="space-y-2 text-sm">
                <li>• Automáticamente cuando recibes un mensaje nuevo</li>
                <li>• Automáticamente cuando envías un mensaje a un número nuevo</li>
                <li>• Se guarda: nombre, teléfono, email, plataforma de origen</li>
                <li>• Solo contactos con actividad real de mensajería</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-red-400">¿Qué NO hace?</h4>
              <ul className="space-y-2 text-sm">
                <li>• No importa listas de contactos de WhatsApp</li>
                <li>• No sincroniza contactos de Facebook/Instagram</li>
                <li>• No permite crear contactos manualmente</li>
                <li>• No accede a tu libreta de direcciones</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-sm text-neutral-400">
              <strong>¿Por qué?</strong> Las APIs de WhatsApp y Meta no permiten acceder a listas de contactos existentes por razones de privacidad y seguridad.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "¿Puedo ver conversaciones anteriores de mis redes sociales?",
      content: (
        <div>
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 font-semibold mb-2">
              <strong>No.</strong> Solo puedes ver conversaciones desde que conectas Nexly.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3 text-nexly-teal">¿Qué significa esto?</h4>
              <ul className="space-y-2 text-sm">
                <li>• Nexly guarda todas las conversaciones desde el momento de la conexión</li>
                <li>• No puede acceder a mensajes anteriores de WhatsApp/Instagram/Facebook</li>
                <li>• Es una limitación de las APIs, no de Nexly</li>
                <li>• Tu historial en Nexly crecerá con el tiempo</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-yellow-400">Sincronización</h4>
              <ul className="space-y-2 text-sm">
                <li>• Los mensajes que envíes desde Nexly NO aparecen en tu WhatsApp personal</li>
                <li>• Los mensajes que envíes desde Nexly NO aparecen en tu Instagram/Facebook</li>
                <li>• Solo el destinatario los recibe, pero no se sincronizan con tus apps</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "¿Puedo enviar imágenes, videos y documentos?",
      content: (
        <div>
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 font-semibold mb-2">
              <strong>En desarrollo:</strong> Actualmente solo se pueden enviar mensajes de texto.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3 text-nexly-teal">Funcionalidades planificadas:</h4>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Imágenes:</strong> JPEG, PNG (hasta 5MB)</li>
                <li>• <strong>Videos:</strong> MP4, 3GP (hasta 16MB)</li>
                <li>• <strong>Documentos:</strong> PDF, DOC, XLS, PPT (hasta 100MB)</li>
                <li>• <strong>Audios:</strong> MP3, AAC, M4A (hasta 16MB)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-red-400">No disponible:</h4>
              <ul className="space-y-2 text-sm">
                <li>• Stickers personalizados</li>
                <li>• Reacciones con emojis</li>
                <li>• Eliminar mensajes enviados</li>
                <li>• Botones interactivos (por ahora)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-sm text-neutral-400">
              <strong>Nota:</strong> Estas funcionalidades se agregarán en futuras actualizaciones según las capacidades de las APIs.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "¿Nexly funciona en móviles?",
      content: (
        <div>
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 font-semibold mb-2">
              <strong>Nexly está optimizado para uso en desktop/computadora.</strong>
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3 text-nexly-teal">Funciona en:</h4>
              <ul className="space-y-2 text-sm">
                <li>• Computadoras de escritorio</li>
                <li>• Laptops</li>
                <li>• Tablets (experiencia limitada)</li>
                <li>• Navegadores web modernos</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-yellow-400">Experiencia limitada en:</h4>
              <ul className="space-y-2 text-sm">
                <li>• Teléfonos móviles (pantalla pequeña)</li>
                <li>• Navegadores móviles (funcionalidad reducida)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-sm text-neutral-400">
              <strong>¿Por qué?</strong> Nexly está diseñado para empresas que gestionan múltiples conversaciones, lo cual es más eficiente en pantallas grandes.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="mt-20 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-12">Preguntas frecuentes</h2>
      <Accordion items={faqItems} />
    </div>
  );
}
