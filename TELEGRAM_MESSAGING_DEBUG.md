# 🐛 Telegram Messaging - Guía de Debugging

## 📊 Flujo Completo de Envío y Recepción de Mensajes

### 1. **Envío de Mensaje (Frontend → Backend → Telegram)**

```
Usuario escribe mensaje
  ↓
Composer.handleSend()
  ↓
inbox/page.handleSend() 
  ↓
POST /integrations/conversations/{threadId}/reply
  ↓
Backend: integrations.ts
  ↓
telegramMTProtoService.sendMessage()
  ↓
Telegram API (MTProto)
  ↓
✅ Mensaje aparece en Telegram mobile
```

### 2. **Refresco de Mensajes (Telegram → Backend → Frontend)**

```
Mensaje en Telegram
  ↓
Backend: GET /integrations/conversations/{threadId}/messages
  ↓
telegramMTProtoService.getMessages()
  ↓
Mapeo de datos (backend)
  ↓
SWR fetch (frontend)
  ↓
MessageThread renderiza
  ↓
✅ Mensaje aparece en UI
```

---

## 🔍 Logs de Consola a Verificar

### **Al enviar un mensaje:**

1. **Composer.tsx:**
   ```
   📤 Enviando mensaje: [texto del mensaje]
   ```

2. **inbox/page.tsx:**
   ```
   Mensaje enviado correctamente
   ```

3. **MessageThread.tsx:**
   ```
   Evento messageSent recibido, refrescando mensajes para threadId: [id]
   ```

### **Al cargar mensajes:**

1. **MessageThread.tsx:**
   ```
   🔄 Fetching messages for: /integrations/conversations/[threadId]/messages
   📨 Messages received: { messages: [...] }
   ✅ Mapped messages: [cantidad] messages
   ```

---

## ⚙️ Configuración Actual

### **SWR - Auto-refresco:**
```typescript
{
  refreshInterval: 5000,        // Refresca cada 5 segundos
  revalidateOnFocus: true,      // Refresca al volver a la pestaña
  revalidateOnReconnect: true   // Refresca al reconectar
}
```

### **Event System:**
```typescript
// Después de enviar mensaje exitoso
window.dispatchEvent(new CustomEvent('messageSent', { 
  detail: { threadId: activeId } 
}));

// MessageThread escucha el evento
window.addEventListener('messageSent', refreshMessages);
```

---

## 🐛 Problemas Comunes y Soluciones

### **Problema 1: Mensajes no aparecen después de enviar**

**Verificar:**
1. ✅ Que el mensaje se envió correctamente (check en Telegram mobile)
2. ✅ Que el evento `messageSent` se dispara
3. ✅ Que `MessageThread` escucha el evento
4. ✅ Que `mutateMessages()` se llama

**Consola:**
```
📤 Enviando mensaje: hola
Mensaje enviado correctamente
Evento messageSent recibido, refrescando mensajes para threadId: telegram_123
🔄 Fetching messages for: /integrations/conversations/telegram_123/messages
```

### **Problema 2: Backend no devuelve mensajes**

**Verificar en Railway logs:**
```
Mensajes de Telegram obtenidos { userId: '...', chatId: 123, messageCount: X }
```

**Si messageCount es 0:**
- Verificar que `telegramMTProtoService.getMessages()` está funcionando
- Verificar que la sesión de Telegram está activa
- Verificar que el `chatId` es correcto

### **Problema 3: Formato de datos incorrecto**

**Backend debe devolver:**
```json
{
  "messages": [
    {
      "id": "telegram_msg_123",
      "from": "business" | "customer",
      "body": "texto del mensaje",
      "timestamp": "2025-01-01T00:00:00.000Z",
      "status": "delivered"
    }
  ]
}
```

**Frontend espera:**
```typescript
{
  id: string,
  content: string,      // mapeado de 'body'
  timestamp: string,
  direction: 'inbound' | 'outbound',  // mapeado de 'from'
  type: 'text',
  status: 'sent' | 'delivered' | 'read'
}
```

---

## 🔧 Comandos de Debugging

### **1. Ver logs en tiempo real (Railway):**
```bash
railway logs -f
```

### **2. Verificar estado de sesión de Telegram:**
```javascript
// En la consola del navegador
localStorage.getItem('token')
```

### **3. Forzar refresco de mensajes:**
```javascript
// En la consola del navegador
window.dispatchEvent(new CustomEvent('messageSent'))
```

### **4. Ver estado de SWR:**
```javascript
// Instalar SWR DevTools
npm install @swrdevtools/core
```

---

## ✅ Checklist de Funcionamiento

- [ ] Mensaje se envía a Telegram (verificar en mobile)
- [ ] Backend registra el envío exitoso
- [ ] Frontend muestra "Mensaje enviado correctamente"
- [ ] Evento `messageSent` se dispara
- [ ] MessageThread recibe el evento
- [ ] `mutateMessages()` se ejecuta
- [ ] Fetch de mensajes se realiza
- [ ] Backend devuelve mensajes (incluyendo el nuevo)
- [ ] Frontend mapea los datos correctamente
- [ ] Mensaje aparece en la UI
- [ ] Auto-scroll al final funciona

---

## 🚀 Mejoras Implementadas

1. ✅ **Auto-refresco cada 5 segundos** - Los mensajes se actualizan automáticamente
2. ✅ **Event system** - Refresco inmediato después de enviar
3. ✅ **Revalidación en focus** - Actualiza al volver a la pestaña
4. ✅ **Logging completo** - Fácil debugging con emojis
5. ✅ **Auto-scroll** - Scroll automático a nuevos mensajes
6. ✅ **Error handling** - Manejo de errores mejorado

---

## 📝 Próximos Pasos

1. **Implementar WebSockets** para mensajes en tiempo real (eliminar polling de 5s)
2. **Cachear mensajes** para mejor rendimiento
3. **Optimistic updates** para mostrar mensajes enviados inmediatamente
4. **Indicador de typing** cuando el otro usuario está escribiendo
5. **Marcar mensajes como leídos** cuando se ven

---

**Última actualización:** 8 de Octubre, 2025  
**Estado:** En debugging - Los mensajes se envían correctamente pero el pull no refleja los cambios inmediatamente

