# 🔄 Guía de Sincronización en Tiempo Real de Suscripciones

## 📋 Resumen

Este documento explica cómo funciona la sincronización **reactiva en tiempo real** de suscripciones después de pagos, cancelaciones, y otros eventos. El objetivo es que la UI se **actualice automáticamente** sin que el usuario tenga que recargar la página.

---

## 🏗️ Arquitectura General

### Fuente de Verdad Única (MongoDB)

La **única fuente de verdad** es **MongoDB** (colección `User`):

```json
{
  "subscription_status": "active_paid" | "active_trial" | "trial_pending_payment_method" | "cancelled" | "none",
  "selectedPlan": "crecimiento" | "pro" | "business"
}
```

### Componentes Principales

1. **SubscriptionContext.tsx** - Estado global, refetch, forceSync
2. **useRealtimeSubscription.ts** - Hook de polling automático
3. **SubscriptionStatus.tsx** - UI con sincronización visual
4. **Webhook (API)** - Actualiza MongoDB cuando ocurren eventos en Stripe

---

## 🔌 Cómo Funciona el Flujo

### 1️⃣ Usuario Inicia un Pago

```typescript
const { createPaymentLink } = useStripePayment();

// El usuario hace clic en "Pagar"
await createPaymentLink('business');

// Se guarda timestamp en localStorage
localStorage.setItem('paymentInitiatedAt', Date.now().toString());

// Se redirige a Stripe Checkout
window.location.href = paymentUrl;
```

### 2️⃣ Usuario Completa el Pago en Stripe

- El webhook recibe `checkout.session.completed`
- **MongoDB se actualiza** atomicamente:
  ```typescript
  user.subscription_status = 'active_paid';
  user.selectedPlan = 'business';
  ```

### 3️⃣ Usuario Regresa del Checkout (`/dashboard`)

- **SubscriptionContext**: Inicia **polling cada 2 segundos** (15 intentos = ~30 segundos)
- **useRealtimeSubscription**: Detecta el timestamp `paymentInitiatedAt` en localStorage
- Comienza a hacer requests a `/subscriptions/status` automáticamente

### 4️⃣ UI se Actualiza Automáticamente

```typescript
// Cuando se detecta cambio
onSubscriptionChange: (newStatus) => {
  setSyncMessage('✅ Suscripción actualizada: active_paid');
}
```

---

## 🎯 Componentes Clave

### **SubscriptionContext.tsx**

#### Nueva Función: `forceSync()`

```typescript
const forceSync = useCallback(async (): Promise<void> => {
  const response = await fetch(`${API_URL}/subscriptions/status`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json();
  setSubscription(data);
}, [token]);
```

**Uso:** Forzar sincronización manual en cualquier momento

#### Polling Automático en `useEffect`

```typescript
useEffect(() => {
  if (token) {
    fetchSubscriptionStatus();
    
    // Polling cada 3 segundos durante 30 segundos
    const cleanup = startRealtimeSync();
    return cleanup;
  }
}, [token, fetchSubscriptionStatus, startRealtimeSync]);
```

---

### **useRealtimeSubscription.ts** (Nuevo Hook)

Hook especializado para sincronización automática post-pago:

```typescript
export function useRealtimeSubscription(options: UseRealtimeSubscriptionOptions = {}) {
  const {
    maxAttempts = 15,              // 15 intentos
    pollInterval = 2000,            // cada 2 segundos
    onSubscriptionChange,           // callback cuando cambia
    onSyncComplete                  // callback cuando termina
  } = options;

  // Detecta si hay pago reciente en localStorage
  // Inicia polling automático
  // Monitorea cambios en userSubscriptionStatus
  // Dispara callbacks cuando ocurren cambios
}
```

#### Uso en Componentes

```typescript
const { isPolling } = useRealtimeSubscription({
  maxAttempts: 15,
  pollInterval: 2000,
  onSubscriptionChange: (newStatus) => {
    // El estado de la suscripción cambió!
    console.log(`Cambio de estado: ${newStatus}`);
  },
  onSyncComplete: () => {
    // Polling completado
    console.log('Sincronización finalizada');
  }
});
```

---

### **SubscriptionStatus.tsx** (UI Reactiva)

#### 1. Importar el Hook

```typescript
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

const { isPolling } = useRealtimeSubscription({
  maxAttempts: 15,
  pollInterval: 2000,
  onSubscriptionChange: (newStatus) => {
    setSyncMessage(`✅ Suscripción actualizada: ${newStatus}`);
  }
});
```

#### 2. Mostrar Estado de Sincronización

```typescript
{syncMessage && (
  <div className={`rounded-lg p-4 border ${
    syncSuccess
      ? 'bg-accent-green/10 border-accent-green/20'
      : 'bg-accent-blue/10 border-accent-blue/20'
  }`}>
    <div className="flex items-center gap-3">
      {isPolling ? (
        <div className="animate-spin">
          {/* Loading spinner */}
        </div>
      ) : (
        // Check mark
      )}
      <p>{syncMessage}</p>
    </div>
  </div>
)}
```

#### 3. Mostrar Confirmación de Cancelación

```typescript
{subscription.userSubscriptionStatus === 'active_paid' && (
  <button
    onClick={async () => {
      if (confirm('¿Cancelar suscripción?')) {
        await cancelSubscription();
        setSyncMessage('✅ Suscripción cancelada. 7 días de acceso restante.');
      }
    }}
  >
    Cancelar
  </button>
)}
```

---

## 📊 Ciclo de Sincronización Completo

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. Usuario hace clic en "Pagar"                            │
│     └─> localStorage.setItem('paymentInitiatedAt')          │
│     └─> window.location.href = stripeCheckoutUrl            │
│                                                             │
│  2. Usuario completa pago en Stripe ✅                      │
│     └─> Webhook recibe checkout.session.completed           │
│     └─> MongoDB se actualiza: user.subscription_status =    │
│        'active_paid'                                        │
│                                                             │
│  3. Usuario regresa a /dashboard                            │
│     └─> SubscriptionContext carga                           │
│     └─> startRealtimeSync() inicia polling                  │
│     └─> useRealtimeSubscription detecta paymentInitiatedAt  │
│                                                             │
│  4. Polling comienza (cada 2 seg, 15 intentos = 30 seg)     │
│     └─> forceSync() hace request a /subscriptions/status    │
│     └─> Obtiene: userSubscriptionStatus = 'active_paid'     │
│     └─> onSubscriptionChange() se dispara                   │
│                                                             │
│  5. UI se actualiza automáticamente ✅                      │
│     └─> Muestra: "✅ Suscripción actualizada: active_paid"  │
│     └─> setTimeout limpia el mensaje                        │
│     └─> localStorage.removeItem('paymentInitiatedAt')       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Configuración

### Intervalo de Polling

En `useRealtimeSubscription.ts`:

```typescript
// Cambiar duración del polling
const maxAttempts = 15;      // 15 intentos = ~30 segundos
const pollInterval = 2000;   // cada 2 segundos
```

### Timeout de Detección

En `useRealtimeSubscription.ts`:

```typescript
// Solo polling si el pago fue hace menos de X ms
if (timeSincePay < 2 * 60 * 1000) {  // 2 minutos
  startPolling();
}
```

---

## 📱 Casos de Uso

### ✅ Caso 1: Usuario Paga Exitosamente

```
🔄 Pago detectado recientemente. Iniciando sincronización en tiempo real...
(spinner animado)

... (2 segundos después)

🔄 Sincronización (1/15)
✅ Cambio de estado detectado: trial_pending_payment_method → active_paid

✅ Suscripción actualizada: active_paid
```

### ❌ Caso 2: Usuario Cancela el Pago

- No se dispara webhook
- Polling eventualmente termina sin cambios
- localStorage.removeItem('paymentInitiatedAt') limpia el estado
- Usuario regresa a estado anterior

### 🚫 Caso 3: Usuario Cancela la Suscripción

```typescript
// Usuario hace clic en "Cancelar"
await cancelSubscription();

// setSync Message muestra inmediatamente
setSyncMessage('✅ Suscripción cancelada. 7 días de acceso restante.');

// Webhook actualiza MongoDB
// Próxima sincronización detectará subscription_status = 'cancelled'
```

---

## 🧪 Testing Manual

### Test 1: Flujo Completo de Pago

1. Ve a `/dashboard`
2. Abre DevTools (F12)
3. Ve a Console
4. Verás logs: `🔄 Sincronización (1/15)`, `✅ Cambio de estado detectado...`
5. La UI mostrará el estado actualizado

### Test 2: Forzar Sincronización Manual

```typescript
// En la consola, desde el Context:
const { forceSync } = useSubscription();
await forceSync();
```

### Test 3: Ver Estado de Polling

```typescript
// En la consola
localStorage.getItem('paymentInitiatedAt');  // Debería existir después del pago
localStorage.removeItem('paymentInitiatedAt'); // Limpiar manualmente
```

---

## 🐛 Debugging

### Habilitar Logs Detallados

En `SubscriptionContext.tsx`:

```typescript
console.log(`🔄 Sincronización en tiempo real (${pollCount}/${maxPolls})`);
console.log(`✅ Cambio de estado detectado: ${previousStatusRef.current} → ${currentStatus}`);
```

### Verificar MongoDB

```javascript
// En MongoDB Atlas o shell
db.users.findOne({ email: "user@example.com" })
// Verificar: subscription_status, selectedPlan
```

### Verificar Webhook

Buscar en logs del API:
```
✅ Subscription created for user [ID]. Plan: business, Status: active (User Status: active_paid)
```

---

## ⚡ Optimizaciones Futuras

1. **WebSocket en tiempo real** - En lugar de polling constante
2. **Service Workers** - Sincronización en background
3. **Exponential backoff** - Reducir requests si ya está sincronizado
4. **Local caching** - Cachear estado entre tabs

---

## 📞 Support

Si la sincronización no funciona:

1. ✅ Verifica que el webhook está siendo llamado
2. ✅ Verifica que MongoDB se actualiza con `subscription_status`
3. ✅ Abre DevTools y busca logs `🔄 Sincronización`
4. ✅ Verifica que `localStorage.paymentInitiatedAt` existe
5. ✅ Intenta manualmente `forceSync()` desde la consola
