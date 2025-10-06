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
      title: "¿Se cobra un costo adicional por los mensajes de WhatsApp?",
      content: (
        <div>
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 font-semibold mb-2">
              <strong>Sí.</strong> Además de tu plan de suscripción a Nexly, Meta cobra una tarifa por "conversación".
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3 text-nexly-teal">¿Qué es una conversación?</h4>
              <p className="text-sm mb-3">
                Una conversación es un intercambio de mensajes que dura 24 horas. Una vez que se inicia, 
                todos los mensajes dentro de esas 24 horas se consideran parte de la misma conversación.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-green-400">Iniciada por el cliente</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Costo menor (varía por país)</li>
                  <li>• El cliente envía el primer mensaje</li>
                  <li>• Puedes responder libremente por 24 horas</li>
                  <li>• Ideal para soporte al cliente</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-orange-400">Iniciada por tu empresa</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Costo mayor (varía por país)</li>
                  <li>• Tu empresa envía el primer mensaje</li>
                  <li>• Requiere plantilla aprobada (HSM)</li>
                  <li>• Ideal para marketing y notificaciones</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-sm text-neutral-400">
              <strong>Nota:</strong> Los costos exactos varían por país. Puedes consultar las tarifas actuales en la 
              <a href="https://developers.facebook.com/docs/whatsapp/pricing" target="_blank" rel="noopener noreferrer" className="text-nexly-teal hover:underline ml-1">
                documentación oficial de Meta
              </a>.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "¿Cómo conecto mi cuenta de WhatsApp Business a Nexly?",
      content: (
        <div>
          <div className="mb-4 p-4 bg-nexly-azul/10 border border-nexly-azul/20 rounded-lg">
            <p className="text-nexly-light-blue font-semibold mb-2">
              <strong>Muy sencillo.</strong> Todo el proceso se completa sin salir de Nexly.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3 text-nexly-teal">Pasos para conectar:</h4>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start">
                  <span className="bg-nexly-teal text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                  <span>Desde tu dashboard de Nexly, haz clic en "Conectar WhatsApp"</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-nexly-teal text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                  <span>Serás guiado a un flujo seguro de Meta para iniciar sesión con tu cuenta de Facebook</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-nexly-teal text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                  <span>Elige tu cuenta de Meta Business Manager</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-nexly-teal text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                  <span>Selecciona la cuenta de WhatsApp Business (WABA) y el número que deseas conectar</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-nexly-teal text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">5</span>
                  <span>¡Listo! Tu WhatsApp estará conectado y listo para usar</span>
                </li>
              </ol>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-sm text-neutral-400">
              <strong>¿No tienes WABA configurada?</strong> Te ayudamos con todo el proceso de configuración paso a paso.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "¿Qué son las plantillas de mensajes de WhatsApp?",
      content: (
        <div>
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 font-semibold mb-2">
              <strong>Las plantillas (HSM)</strong> son mensajes pre-aprobados por Meta para enviar a clientes después de 24 horas sin actividad.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3 text-nexly-teal">¿Cuándo necesitas plantillas?</h4>
              <ul className="space-y-2 text-sm">
                <li>• Para enviar mensajes después de 24 horas sin actividad</li>
                <li>• Para mensajes de marketing y promociones</li>
                <li>• Para notificaciones automáticas</li>
                <li>• Para mensajes de utilidad (confirmaciones, recordatorios)</li>
              </ul>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-green-400 text-sm">Marketing</h4>
                <p className="text-xs text-neutral-400">Promociones, ofertas especiales, nuevos productos</p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-400 text-sm">Utilidad</h4>
                <p className="text-xs text-neutral-400">Confirmaciones, recordatorios, actualizaciones</p>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-purple-400 text-sm">Autenticación</h4>
                <p className="text-xs text-neutral-400">Códigos de verificación, OTP, seguridad</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-sm text-neutral-400">
              <strong>Nota:</strong> Nexly te permite crear y gestionar estas plantillas directamente desde tu dashboard. 
              El proceso de aprobación de Meta puede tomar entre 24-48 horas.
            </p>
          </div>
        </div>
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
          
          <div className="mt-4 p-4 bg-nexly-teal/10 border border-nexly-teal/20 rounded-lg">
            <h4 className="font-semibold mb-2 text-nexly-teal">¿Por qué usamos Cloud API?</h4>
            <p className="text-sm text-neutral-300">
              La Plataforma de WhatsApp Business (Cloud API) es la única vía oficial y escalable para empresas que necesitan 
              gestionar grandes volúmenes de mensajes y conectar múltiples usuarios. Además, es un requisito de seguridad 
              y privacidad establecido por Meta para aplicaciones empresariales.
            </p>
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
          
          <div className="mt-4 p-4 bg-nexly-teal/10 border border-nexly-teal/20 rounded-lg">
            <h4 className="font-semibold mb-2 text-nexly-teal">Gestión de contactos</h4>
            <p className="text-sm text-neutral-300 mb-3">
              Una vez que un contacto se crea automáticamente, puedes gestionarlo de manera completa:
            </p>
            <ul className="space-y-1 text-sm text-neutral-300">
              <li>• <strong>Etiquetas:</strong> Organiza contactos por categorías (cliente, prospecto, VIP)</li>
              <li>• <strong>Notas:</strong> Añade información adicional y contexto sobre cada contacto</li>
              <li>• <strong>Historial:</strong> Ve todas las conversaciones y mensajes con cada contacto</li>
              <li>• <strong>Información del perfil:</strong> Nombre, teléfono, email y plataforma de origen</li>
            </ul>
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
      title: "¿Puedo usar Nexly en mi móvil?",
      content: (
        <div>
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 font-semibold mb-2">
              <strong>Sí, pero con limitaciones.</strong> Nexly es accesible desde navegadores móviles, pero está optimizado para desktop.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3 text-nexly-teal">Funciona en:</h4>
              <ul className="space-y-2 text-sm">
                <li>• Computadoras de escritorio (experiencia completa)</li>
                <li>• Laptops (experiencia completa)</li>
                <li>• Tablets (experiencia limitada pero funcional)</li>
                <li>• Teléfonos móviles (navegador web, funcionalidad reducida)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-yellow-400">Limitaciones en móviles:</h4>
              <ul className="space-y-2 text-sm">
                <li>• Pantalla pequeña dificulta la gestión de múltiples conversaciones</li>
                <li>• Algunas funciones avanzadas pueden ser difíciles de usar</li>
                <li>• No hay aplicación móvil dedicada (solo navegador web)</li>
                <li>• Experiencia optimizada para pantallas grandes</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-sm text-neutral-400">
              <strong>Recomendación:</strong> Para la mejor experiencia, usa Nexly en computadora o laptop. 
              Los móviles son útiles para consultas rápidas, pero la gestión completa es más eficiente en pantallas grandes.
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
