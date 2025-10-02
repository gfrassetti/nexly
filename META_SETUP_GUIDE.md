# Guía Completa de Configuración de Meta para Nexly

## 🎯 Respuestas a tus preguntas

### 1. ¿Puedo usar mi cuenta personal de Facebook?
**SÍ**, puedes usar tu cuenta personal de Facebook para desarrollo y pruebas. De hecho, es lo más común durante el desarrollo.

### 2. ¿Necesito usuarios de prueba?
**NO** necesitas usuarios de prueba para el desarrollo básico. Tu cuenta personal es suficiente para probar la integración.

### 3. ¿Por qué no funciona WhatsApp Business?
Hay varios pasos específicos que deben estar configurados correctamente.

---

## 📋 Checklist de Configuración

### Paso 1: Crear App en Meta Developers
1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Crea una nueva app → "Business" → "Other"
3. Anota el **App ID** y **App Secret**

### Paso 2: Configurar Productos
En tu app de Meta, agrega estos productos:
- ✅ **WhatsApp Business API**
- ✅ **Instagram Basic Display**
- ✅ **Facebook Login**

### Paso 3: Configurar WhatsApp Business API
1. En "WhatsApp" → "Getting Started"
2. Agrega tu número de teléfono
3. Verifica el número
4. Anota el **Phone Number ID**

### Paso 4: Configurar URLs de Redirección
En "Facebook Login" → "Settings":
```
https://tu-api-url.com/integrations/oauth/instagram/callback
https://tu-api-url.com/integrations/oauth/whatsapp/callback
```

### Paso 5: Configurar Webhook (WhatsApp)
En "WhatsApp" → "Configuration":
- **Webhook URL**: `https://tu-api-url.com/webhook`
- **Verify Token**: El mismo que tienes en `WEBHOOK_VERIFY_TOKEN`
- **Webhook Fields**: Marca "messages"

### Paso 6: Variables de Entorno
```env
# Meta App Configuration
META_APP_ID=tu_app_id_aqui
META_APP_SECRET=tu_app_secret_aqui
META_PHONE_NUMBER_ID=tu_phone_number_id_aqui
WEBHOOK_VERIFY_TOKEN=tu_token_de_verificacion

# URLs
API_URL=https://tu-api-url.com
FRONTEND_URL=https://tu-frontend-url.com
```

---

## 🔍 Diagnóstico de Problemas

### Problema: "Error al autenticar con Meta"

**Posibles causas:**
1. **Variables de entorno faltantes o incorrectas**
2. **URLs de redirección mal configuradas**
3. **Permisos insuficientes en la app**
4. **App en modo desarrollo sin usuarios autorizados**

### Cómo diagnosticar:
1. Usa el endpoint de debug: `GET /integrations/debug/test-meta-api`
2. Revisa los logs del servidor cuando intentas conectar
3. Verifica que las URLs coincidan exactamente

---

## 🚀 Pasos para Probar

### 1. Verificar Configuración
```bash
curl -H "Authorization: Bearer tu_jwt_token" \
  http://localhost:4000/integrations/debug/test-meta-api
```

### 2. Probar WhatsApp
1. Ve a `/dashboard/integrations`
2. Haz clic en "Conectar WhatsApp"
3. Autoriza en Facebook
4. Revisa los logs del servidor

### 3. Probar Instagram
1. Asegúrate de tener una página de Facebook
2. Conecta Instagram Business a esa página
3. Intenta conectar desde el dashboard

---

## ⚠️ Problemas Comunes

### 1. "App Not Set Up"
- Tu app está en modo desarrollo
- Necesitas agregar tu cuenta como desarrollador/tester

### 2. "Invalid Redirect URI"
- Las URLs no coinciden exactamente
- Verifica protocolo (http vs https)

### 3. "Insufficient Permissions"
- Faltan permisos en la app de Meta
- Revisa que todos los productos estén agregados

### 4. "WhatsApp Number Not Found"
- El número no está verificado en Meta
- El PHONE_NUMBER_ID es incorrecto

---

## 🛠️ Comandos de Debug

### Verificar configuración:
```bash
# En desarrollo
curl -H "Authorization: Bearer tu_token" \
  http://localhost:4000/integrations/debug/meta-config
```

### Ver logs en tiempo real:
```bash
# En el servidor
tail -f logs/app.log | grep -E "(Instagram|WhatsApp|Meta)"
```

---

## 📞 Configuración Específica de WhatsApp

### 1. Business Manager
- No necesitas Business Manager para desarrollo
- Tu cuenta personal es suficiente

### 2. Verificación del Número
- Usa tu número personal para pruebas
- Meta te enviará un código por WhatsApp

### 3. Webhook
- Debe estar accesible públicamente
- Usa ngrok para desarrollo local:
```bash
ngrok http 4000
# Usa la URL de ngrok en Meta
```

---

## 🎯 Siguiente Paso

1. **Ejecuta el diagnóstico**: Usa los endpoints de debug que creé
2. **Revisa las variables de entorno**: Asegúrate de que estén todas configuradas
3. **Verifica las URLs**: Deben coincidir exactamente con las de Meta
4. **Prueba paso a paso**: Primero WhatsApp, luego Instagram

¿Quieres que revisemos juntos la configuración usando los endpoints de debug?
