# Twilio Tech Provider Program - Partner Solution ID Setup

## ✅ Integración Completada

La integración con el Tech Provider Program de Twilio está completa. El sistema ahora:

1. ✅ Incluye el Partner Solution ID en la URL de Embedded Signup
2. ✅ Maneja el callback de onboarding automáticamente
3. ✅ Crea la integración en la base de datos con todos los campos necesarios
4. ✅ Registra el WhatsApp Sender usando la Senders API
5. ✅ Guarda información del WABA, Subaccount SID, y FBM ID

## 🔧 Configuración Requerida

### 1. Variable de Entorno

Debes agregar el **Partner Solution ID** que Twilio te proporcionó en el correo de aprobación:

```bash
# En Railway o tu archivo .env
TWILIO_PARTNER_SOLUTION_ID=tu_partner_solution_id_aqui
```

### 2. Obtener el Partner Solution ID

Según el correo de Twilio, el Partner Solution ID debería estar disponible después de que se complete el Tech Provider Program. Si no lo tienes:

1. Ve a tu consola de Twilio
2. Navega a **WhatsApp** > **Tech Provider Program**
3. Busca tu **Partner Solution ID**

Si no lo encuentras, contacta a Twilio soporte mencionando que necesitas el Partner Solution ID para completar la integración técnica del ESU.

## 📋 Flujo Completo

### Paso 1: Usuario inicia conexión
1. Usuario hace clic en "Conectar WhatsApp" en Nexly
2. Frontend llama a `/whatsapp/create-signup-session`
3. Backend genera URL de Embedded Signup con:
   - `accountSid`: Tu Master Account SID
   - `facebookBusinessId`: Tu FBM ID
   - `partnerSolutionId`: Tu Partner Solution ID ⭐ **NUEVO**

### Paso 2: Usuario completa Embedded Signup
1. Twilio redirige al usuario a Meta/Facebook login
2. Usuario conecta su número de WhatsApp Business
   - **Si usas números SMS-capables de Twilio**: Twilio maneja los OTPs automáticamente via Senders API
   - **Si usas números voice-only de Twilio**: El usuario debe recibir el OTP por llamada
   - **Si el cliente trae su propio número**: El usuario debe ingresar y verificar el número
3. Twilio crea automáticamente:
   - Un WABA sub-account bajo tu Master Account
   - El registro inicial del número

### Paso 3: Callback y registro
1. Twilio redirige a `/whatsapp/onboarding-callback` con:
   - `TwilioNumber`: Número de WhatsApp del cliente
   - `WhatsAppBusinessAccountId`: WABA ID
   - `FacebookBusinessId`: FBM ID del cliente
   - `SubaccountSid`: SID del subaccount creado (opcional)
   - `payload`: Datos del usuario (userId)

2. Backend:
   - Registra el WhatsApp Sender usando la Senders API
   - Crea/actualiza la integración en la base de datos
   - Guarda todos los campos necesarios (WABA ID, Subaccount SID, etc.)

### Paso 4: Redirección al frontend
1. Usuario es redirigido a la página de éxito
2. La integración ya está disponible en su dashboard

## 🗄️ Campos Nuevos en Integration Model

El modelo `Integration` ahora incluye en `meta`:

```typescript
{
  wabaId: string;              // WhatsApp Business Account ID
  twilioSubaccountSid: string; // Subaccount SID creado por Twilio
  facebookBusinessId: string;  // Facebook Business ID del cliente
  senderId: string;            // Sender ID registrado via Senders API
  registeredVia: 'twilio_embedded_signup';
}
```

## 🔍 Senders API y Números de Teléfono

### Tipos de Números

Configura `TWILIO_PHONE_NUMBER_TYPE` según el tipo de números que uses:

- **`sms_capable`** (default): Números SMS-capables de Twilio
  - Twilio maneja los OTPs automáticamente
  - Los pasos de número de teléfono se saltan en Embedded Signup
  - Más común y recomendado

- **`voice_only`**: Números voice-only de Twilio
  - El usuario debe recibir el OTP por llamada
  - Requiere configuración adicional para recibir llamadas

- **`byo`**: Clientes traen sus propios números (Bring Your Own)
  - El usuario debe ingresar y verificar su número
  - Requiere recolectar el número antes o después del Embedded Signup

### Variable de Entorno

```bash
TWILIO_PHONE_NUMBER_TYPE=sms_capable  # o 'voice_only' o 'byo'
```

### Senders API

La función `registerWhatsAppSender()` usa la Twilio Senders API para registrar el número de WhatsApp. Nota importante:

- La implementación actual intenta registrar el sender usando la API
- Si falla, continúa de todas formas porque el WABA ya está creado
- Twilio puede haber registrado el sender automáticamente durante Embedded Signup
- Si necesitas ajustar la implementación de la Senders API, revisa la documentación oficial de Twilio

## 🐛 Troubleshooting

### Error: "Partner Solution ID no configurado"
- **Solución**: Agrega `TWILIO_PARTNER_SOLUTION_ID` a tus variables de entorno

### El callback no se ejecuta
- Verifica que la URL de callback sea accesible públicamente (HTTPS en producción)
- Revisa los logs del backend para ver qué parámetros recibe

### El sender no se registra
- Esto puede ser normal si Twilio ya lo registró automáticamente
- Revisa los logs para ver si hay errores específicos
- Verifica que las credenciales de Twilio sean correctas

## 📚 Referencias

- [Twilio WhatsApp Tech Provider Program](https://www.twilio.com/docs/whatsapp/isv/tech-provider-program)
- [WhatsApp Senders API](https://www.twilio.com/docs/whatsapp/senders)
- [Embedded Signup Documentation](https://www.twilio.com/docs/whatsapp/embedded-signup)

