# 📹 Guía para Screencast de Meta - WhatsApp Business

## 🎯 Objetivo
Crear un screencast que demuestre el envío y recepción real de mensajes de WhatsApp para obtener la aprobación de Meta.

## ✅ Requisitos de Meta

### 1. **Flujo Completo de Login de Meta**
- Mostrar el proceso completo de autenticación OAuth con Meta
- Incluir la pantalla de permisos de Meta
- Demostrar la conexión exitosa de la cuenta

### 2. **Usuario con Acceso a la App**
- Mostrar un usuario logueado en Nexly
- Demostrar que tiene permisos para enviar mensajes
- Mostrar el dashboard con la integración de WhatsApp activa

### 3. **Experiencia Completa del Caso de Uso**
- **ENVÍO**: Mostrar la app enviando un mensaje real a WhatsApp
- **RECEPCIÓN**: Mostrar WhatsApp (web o móvil) recibiendo el mensaje
- **CONFIRMACIÓN**: Mostrar que el mensaje llegó correctamente

### 4. **Requisitos Técnicos del Video**
- **Idioma**: Interfaz en inglés
- **Subtítulos**: Incluir subtítulos explicativos
- **Explicaciones**: Explicar botones y elementos de la UI
- **Calidad**: Video claro y legible

## 🎬 Script del Screencast

### **Paso 1: Introducción (0-10 segundos)**
```
"Hi, I'm going to demonstrate Nexly's WhatsApp Business integration. 
This app allows businesses to send and receive WhatsApp messages through our platform."
```

### **Paso 2: Login de Meta (10-30 segundos)**
```
"First, I'll show the complete Meta login flow. 
I'm connecting my Meta Business account to authorize WhatsApp access."
```
- Mostrar clic en "Connect WhatsApp"
- Mostrar redirección a Meta OAuth
- Mostrar pantalla de permisos de Meta
- Mostrar confirmación de conexión exitosa

### **Paso 3: Dashboard y Configuración (30-45 segundos)**
```
"Now I'm in the Nexly dashboard. You can see that WhatsApp integration is active 
and I have access to send messages."
```
- Mostrar dashboard con WhatsApp conectado
- Mostrar que el usuario tiene permisos
- Explicar la interfaz

### **Paso 4: Envío de Mensaje (45-75 segundos)**
```
"I'll now send a real WhatsApp message. I'll type a test message and send it 
to a WhatsApp number."
```
- Abrir la interfaz de envío de mensajes
- Escribir un mensaje de prueba: "Hello from Nexly! This is a test message."
- Ingresar número de WhatsApp de destino
- Hacer clic en "Send Message"
- Mostrar confirmación de envío

### **Paso 5: Verificación en WhatsApp (75-90 segundos)**
```
"Now I'll show you the same message received in WhatsApp Web. 
As you can see, the message was successfully delivered."
```
- Abrir WhatsApp Web en otra ventana/pestaña
- Mostrar el mensaje recibido
- Confirmar que el mensaje coincide

### **Paso 6: Conclusión (90-100 segundos)**
```
"This demonstrates that Nexly successfully integrates with WhatsApp Business API 
to send and receive messages. The integration is working as intended."
```

## 🛠️ Configuración Técnica Necesaria

### **1. Variables de Entorno**
Asegúrate de tener configuradas:
```bash
# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=tu_token_de_whatsapp
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_WEBHOOK_SECRET=tu_webhook_secret

# Meta App
META_APP_ID=tu_app_id
META_APP_SECRET=tu_app_secret
```

### **2. Configuración de la Integración**
- Verificar que la integración de WhatsApp esté correctamente configurada
- Tener un número de WhatsApp Business verificado
- Tener un token de acceso válido

### **3. Número de Prueba**
- Usar un número de WhatsApp real para las pruebas
- Asegurarse de que el número esté disponible para recibir mensajes

## 📱 Preparación del Entorno

### **1. Interfaz en Inglés**
- Cambiar temporalmente la UI a inglés para el screencast
- O usar subtítulos en inglés

### **2. Datos de Prueba**
- Crear un contacto de prueba
- Tener un mensaje de prueba preparado
- Verificar que todo funcione antes de grabar

### **3. Herramientas de Grabación**
- Usar OBS Studio o similar
- Configurar resolución 1920x1080
- Asegurar audio claro

## 🚨 Puntos Críticos a Demostrar

### **1. Autenticación Real**
- No solo mostrar la UI, sino el flujo completo de OAuth
- Incluir las pantallas de Meta

### **2. Envío Real**
- El mensaje debe ser enviado realmente a WhatsApp
- No solo simular o mostrar logs

### **3. Recepción Verificable**
- Mostrar WhatsApp recibiendo el mensaje
- Confirmar que es el mismo mensaje enviado

### **4. Trazabilidad**
- Mostrar IDs de mensaje si es posible
- Demostrar que hay una conexión real entre la app y WhatsApp

## 📋 Checklist Pre-Screencast

- [ ] WhatsApp Cloud API configurado y funcionando
- [ ] Token de acceso válido
- [ ] Número de WhatsApp Business verificado
- [ ] Interfaz en inglés (o subtítulos preparados)
- [ ] Número de prueba disponible
- [ ] Herramientas de grabación configuradas
- [ ] Script memorizado
- [ ] Prueba completa realizada

## 🎯 Mensaje de Prueba Sugerido

```
"Hello! This is a test message from Nexly WhatsApp Business integration. 
Message ID: [timestamp] - This demonstrates real-time messaging capability."
```

## 📞 Contacto de Emergencia

Si algo falla durante el screencast:
- Tener un número de respaldo
- Tener mensajes de prueba alternativos
- Saber cómo reiniciar la integración rápidamente

---

**¡Recuerda: Meta necesita ver que realmente estás enviando mensajes a WhatsApp, no solo simulando!**
