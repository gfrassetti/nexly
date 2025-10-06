# Guía de Configuración de Telegram para NEXLY

Esta guía te ayudará a configurar la integración de Telegram en tu aplicación NEXLY.

## 📋 Prerrequisitos

- Cuenta de Telegram
- Acceso a @BotFather en Telegram
- Dominio HTTPS para tu aplicación (requerido por Telegram)

## 🤖 Paso 1: Crear un Bot de Telegram

1. **Abre Telegram** y busca `@BotFather`
2. **Inicia una conversación** con @BotFather
3. **Envía el comando** `/newbot`
4. **Proporciona un nombre** para tu bot (ej: "NEXLY Bot")
5. **Proporciona un username** para tu bot (debe terminar en 'bot', ej: "nexly_bot")
6. **Guarda el token** que te proporciona @BotFather (formato: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## 🔧 Paso 2: Configurar el Dominio

1. **Envía el comando** `/setdomain` a @BotFather
2. **Selecciona tu bot** de la lista
3. **Proporciona el dominio** de tu aplicación (ej: `https://tu-app.nexly.com`)

## ⚙️ Paso 3: Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_SECRET=tu_secreto_webhook_opcional
```

## 🔗 Paso 4: Configurar el Webhook (Opcional)

Si quieres recibir mensajes en tiempo real, configura el webhook:

```bash
# Usando curl
curl -X POST "https://api.telegram.org/bot<TU_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tu-api.nexly.com/integrations/telegram/webhook",
    "secret_token": "tu_secreto_webhook_opcional"
  }'
```

## 🚀 Paso 5: Probar la Integración

1. **Inicia tu aplicación** NEXLY
2. **Ve a la sección de Integraciones** en el dashboard
3. **Haz clic en "Conectar Telegram"**
4. **Autoriza la conexión** cuando aparezca el widget de Telegram
5. **Verifica** que la integración aparezca como "Conectado"

## 📱 Cómo Funciona la Integración

### Para el Usuario Final:
1. **Conexión única**: El usuario autoriza el bot una sola vez
2. **Widget de Telegram**: Se usa el widget oficial de Telegram Login
3. **Seguridad**: La firma de los datos se verifica usando HMAC-SHA256
4. **Persistencia**: La conexión se mantiene hasta que el usuario la desconecte

### Para el Desarrollador:
1. **Envío de mensajes**: Usa la API de Telegram para enviar mensajes
2. **Recepción de mensajes**: Configura webhooks para recibir mensajes
3. **Gestión de usuarios**: Almacena el ID de usuario de Telegram en la base de datos
4. **Manejo de errores**: Implementa manejo robusto de errores

## 🔒 Seguridad

- **Verificación de firma**: Todos los datos del widget se verifican usando HMAC-SHA256
- **Token secreto**: El bot token se mantiene seguro en el servidor
- **Estado de autorización**: Se usa un estado único para cada solicitud
- **Validación de usuario**: Se verifica que el usuario existe en la base de datos

## 🛠️ Endpoints Disponibles

### Backend (Express):
- `GET /integrations/connect/telegram` - Inicia la conexión
- `GET /integrations/telegram/callback` - Callback del widget
- `POST /integrations/telegram/webhook` - Webhook para mensajes
- `POST /integrations/telegram/send` - Enviar mensaje
- `GET /integrations/telegram/bot-info` - Información del bot
- `POST /integrations/telegram/set-webhook` - Configurar webhook

### Frontend (Next.js):
- `/dashboard/integrations/connect/telegram` - Página de conexión
- `/dashboard/integrations/telegram` - Gestión de integraciones

## 🐛 Solución de Problemas

### Error: "Bot token no configurado"
- Verifica que `TELEGRAM_BOT_TOKEN` esté configurado en las variables de entorno
- Asegúrate de que el token sea válido

### Error: "Firma de datos de Telegram no válida"
- Verifica que el dominio esté configurado correctamente en @BotFather
- Asegúrate de que el bot token sea correcto

### Error: "Usuario no encontrado"
- Verifica que el usuario esté autenticado en NEXLY
- Asegúrate de que el estado de autorización sea válido

### Widget no aparece
- Verifica que el bot username sea correcto
- Asegúrate de que el dominio esté configurado en @BotFather
- Revisa la consola del navegador para errores de JavaScript

## 📚 Recursos Adicionales

- [Documentación de Telegram Bot API](https://core.telegram.org/bots/api)
- [Widget de Telegram Login](https://core.telegram.org/widgets/login)
- [Guía de @BotFather](https://core.telegram.org/bots#6-botfather)

## 🆘 Soporte

Si tienes problemas con la configuración:

1. **Revisa los logs** del servidor para errores detallados
2. **Verifica las variables de entorno** están configuradas correctamente
3. **Prueba la conexión** con el bot usando la API de Telegram directamente
4. **Contacta al soporte** de NEXLY si el problema persiste

---

¡Listo! Tu integración de Telegram debería estar funcionando correctamente. 🎉
