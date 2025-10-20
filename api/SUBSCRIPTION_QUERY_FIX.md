# 🔧 Fix: Suscripciones Duplicadas - Query Estrategia

## 🚨 Problema Identificado

Cuando un usuario:
1. Cancelaba una suscripción
2. Compraba un plan nuevo

El sistema traía la suscripción **vieja cancelada** en lugar de la **nueva activa**, porque las queries de MongoDB no excluían suscripciones canceladas ni ordenaban por fecha de creación.

### Ejemplo del Bug:
```javascript
// ❌ ANTES (INCORRECTO)
const subscription = await Subscription.findOne({ userId });
// Problema: Trae la PRIMERA suscripción que encuentra (puede ser la cancelada)
```

## ✅ Solución Implementada

### Estrategia de Query Correcta:
```javascript
// ✅ DESPUÉS (CORRECTO)
const subscription = await Subscription.findOne({ 
  userId,
  status: { $nin: ['canceled', 'incomplete_expired'] } // Excluir canceladas
}).sort({ createdAt: -1 }); // Ordenar por más reciente primero
```

### Criterios de Búsqueda:
1. **Excluir estados finales**: `$nin: ['canceled', 'incomplete_expired']`
2. **Ordenar por más reciente**: `.sort({ createdAt: -1 })`
3. **Tomar la primera coincidencia**: `.findOne()`

## 📝 Archivos Modificados

### 1. `api/src/routes/subscriptions.ts`
**Endpoint**: `GET /subscriptions/status`
**Línea**: 248-253
```typescript
const subscription = await Subscription.findOne({ 
  userId,
  status: { $nin: ['canceled', 'incomplete_expired'] }
}).sort({ createdAt: -1 });
```

### 2. `api/src/routes/stripe/index.ts`
Múltiples endpoints corregidos:

#### a) `GET /stripe/subscription-info` (Línea 47-50)
```typescript
const subscription = await Subscription.findOne({ 
  userId,
  status: { $nin: ['canceled', 'incomplete_expired'] }
}).sort({ createdAt: -1 });
```

#### b) `GET /stripe/invoices` (Línea 136-139)
```typescript
const subscription = await Subscription.findOne({ 
  userId,
  status: { $nin: ['canceled', 'incomplete_expired'] }
}).sort({ createdAt: -1 });
```

#### c) `POST /stripe/create-payment-link` (Línea 174-177)
```typescript
const existingActive = await Subscription.findOne({
  userId,
  status: { $in: ['active', 'trialing', 'paused'] }
}).sort({ createdAt: -1 });
```

#### d) `PUT /stripe/cancel-subscription` (Línea 232-235)
```typescript
const subscription = await Subscription.findOne({ 
  userId,
  status: { $nin: ['canceled', 'incomplete_expired'] }
}).sort({ createdAt: -1 });
```

#### e) `POST /stripe/fix-trial-status` (Línea 300-303)
```typescript
const subscription = await Subscription.findOne({ 
  userId,
  status: { $nin: ['canceled', 'incomplete_expired'] }
}).sort({ createdAt: -1 });
```

#### f) `POST /stripe/cancel` (Línea 345-348)
```typescript
const subscription = await Subscription.findOne({
  userId,
  status: { $in: ['trialing', 'active', 'paused'] }
}).sort({ createdAt: -1 });
```

#### g) `POST /stripe/pause` (Línea 417-420)
```typescript
const subscription = await Subscription.findOne({
  userId,
  status: { $in: ['active'] }
}).sort({ createdAt: -1 });
```

### 3. `api/src/routes/integrations.ts`
**Endpoint**: Verificación de límites de integraciones
**Línea**: 65-68
```typescript
const subscription = await Subscription.findOne({ 
  userId,
  status: { $nin: ['canceled', 'incomplete_expired'] }
}).sort({ createdAt: -1 });
```

## 🎯 Estados de Suscripción

### Estados Activos (se deben incluir):
- `trialing` - En período de prueba
- `active` - Activa y pagando
- `paused` - Pausada temporalmente
- `past_due` - Pago vencido (aún con acceso)
- `unpaid` - Sin pagar (puede estar en grace period)
- `incomplete` - Requiere acción del usuario

### Estados Finales (se deben EXCLUIR):
- `canceled` ❌ - Cancelada permanentemente
- `incomplete_expired` ❌ - Sesión de pago expirada

## 🔄 Flujo de Compra Nueva Sobre Cancelada

1. **Usuario cancela suscripción antigua**
   - Status: `canceled`
   - Se mantiene en la DB como registro histórico

2. **Usuario compra nuevo plan**
   - Stripe Checkout crea nueva sesión
   - Webhook `checkout.session.completed` se dispara
   - Se crea **nueva suscripción** en MongoDB (línea 302-313 de `webhook.ts`)
   - Status: `trialing` o `active`

3. **Frontend consulta `/subscriptions/status`**
   - Query excluye `status: 'canceled'`
   - Ordena por `createdAt: -1` (más reciente primero)
   - ✅ Trae la nueva suscripción activa

## 🧪 Testing

### Caso de Prueba 1: Compra después de cancelación
```bash
# 1. Cancelar suscripción actual
POST /stripe/cancel

# 2. Verificar que se marcó como canceled
GET /subscriptions/status
# Debe devolver: status: 'canceled'

# 3. Comprar nuevo plan
POST /stripe/create-payment-link
# Body: { planType: 'pro' }

# 4. Completar pago en Stripe Checkout

# 5. Verificar nueva suscripción
GET /subscriptions/status
# Debe devolver: 
# - Nueva suscripción con status: 'trialing' o 'active'
# - NO la cancelada antigua
```

### Caso de Prueba 2: Múltiples suscripciones históricas
```bash
# Usuario con 3 suscripciones en DB:
# 1. createdAt: 2025-01-01, status: 'canceled'
# 2. createdAt: 2025-01-15, status: 'canceled'
# 3. createdAt: 2025-01-20, status: 'trialing' ← Esta debe aparecer

GET /subscriptions/status
# Debe devolver la #3 (más reciente y no cancelada)
```

## 📊 Beneficios

1. ✅ **Soporte para re-compras**: Los usuarios pueden cancelar y comprar nuevamente
2. ✅ **Historial preservado**: Las suscripciones canceladas se mantienen para auditoría
3. ✅ **Query eficiente**: Usa índice de `createdAt` y filtro de `status`
4. ✅ **Consistencia**: Todos los endpoints usan la misma estrategia
5. ✅ **Previene duplicados**: Valida que no haya activas antes de crear nueva

## ⚠️ Consideraciones

- **Índices MongoDB**: Asegúrate de tener índice compuesto en `{ userId: 1, status: 1, createdAt: -1 }`
- **Migración de datos**: Usuarios antiguos con suscripciones sin `createdAt` deben migrar
- **Webhooks**: El webhook `checkout.session.completed` SIEMPRE crea nueva suscripción (no actualiza)

## 🔍 Debug

Si el problema persiste, verifica:

```javascript
// 1. Verificar todas las suscripciones del usuario
await Subscription.find({ userId }).sort({ createdAt: -1 }).select('status createdAt planType');

// 2. Verificar query actual
const sub = await Subscription.findOne({ 
  userId,
  status: { $nin: ['canceled', 'incomplete_expired'] }
}).sort({ createdAt: -1 });
console.log('Subscription encontrada:', sub);

// 3. Verificar estado del usuario
const user = await User.findById(userId);
console.log('User subscription_status:', user.subscription_status);
console.log('User selectedPlan:', user.selectedPlan);
```

## 🎉 Resultado Esperado

Después del fix:
- ✅ `/subscriptions/status` devuelve la suscripción **más reciente y activa**
- ✅ Frontend muestra el plan correcto
- ✅ Límites de integraciones se calculan correctamente
- ✅ El estado en Stripe y MongoDB está sincronizado

