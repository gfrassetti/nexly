# 🚀 Guía de Despliegue - Fix de Suscripciones

## 📋 Resumen de Cambios

Se corrigió un bug crítico donde el sistema traía suscripciones canceladas en lugar de las activas cuando un usuario compraba un nuevo plan.

### Archivos Modificados:

**Backend (API):**
- ✅ `api/src/routes/subscriptions.ts` - Endpoint `/subscriptions/status`
- ✅ `api/src/routes/stripe/index.ts` - 7 endpoints de Stripe
- ✅ `api/src/routes/integrations.ts` - Verificación de límites

**Frontend (Web):**
- ✅ `web/src/hooks/useStripePayment.ts` - Hook de pagos (sin cambios de lint)
- ✅ `web/src/hooks/useStripeOperations.ts` - Alert Dialog y cancelaciones
- ✅ `web/src/components/SubscriptionStatus.tsx` - UI con Alert Dialog
- ✅ `web/src/components/ui/alert-dialog.tsx` - Componente nuevo
- ✅ `web/src/components/ui/spinner.tsx` - Componente nuevo
- ✅ `web/src/contexts/SubscriptionContext.tsx` - Lógica de suscripciones

## 🔧 Pasos para Desplegar

### 1. Backend (API)

```bash
# 1. Ir al directorio del API
cd api

# 2. Compilar TypeScript
npm run build

# 3. Verificar que no hay errores de compilación
# (Ya verificado - compiló sin errores)

# 4. Reiniciar el servidor
# En Railway/Production:
git add .
git commit -m "fix: Queries de suscripciones para soportar re-compras"
git push origin master

# En desarrollo local:
npm run dev
# o
npm start
```

### 2. Frontend (Web)

```bash
# 1. Ir al directorio web
cd web

# 2. Instalar dependencias nuevas (si es necesario)
npm install

# 3. Verificar lint
npm run lint

# 4. Build de producción
npm run build

# 5. Desplegar en Vercel
git add .
git commit -m "feat: Alert Dialog para cancelaciones y fix de UI"
git push origin master
# Vercel se desplegará automáticamente
```

## ✅ Verificación Post-Despliegue

### Test 1: Consulta de Suscripción
```bash
# Endpoint: GET /subscriptions/status
# Verificar que devuelve la suscripción MÁS RECIENTE y NO CANCELADA

curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api.railway.app/subscriptions/status
```

**Resultado esperado:**
```json
{
  "hasSubscription": true,
  "subscription": {
    "status": "trialing" // o "active", NO "canceled"
  },
  "userSubscriptionStatus": "active_trial" // o "active_paid"
}
```

### Test 2: Re-compra después de Cancelación
1. Cancelar suscripción actual
2. Comprar nuevo plan (diferente al anterior si es posible)
3. Verificar que `/subscriptions/status` devuelve el **nuevo plan**
4. Verificar que el frontend muestra el **nuevo plan**

### Test 3: Límites de Integraciones
1. Verificar que `getMaxIntegrations()` devuelve el límite correcto
2. Verificar que en `/dashboard/integrations` se muestran los límites correctos

## 🔍 Debugging

Si algo no funciona:

### Backend
```bash
# Ver logs del servidor
# Railway: Ver logs en el dashboard
# Local: Ver la consola donde corre npm run dev

# Verificar MongoDB
# Conectarse a MongoDB y verificar:
db.subscriptions.find({ userId: "USER_ID" }).sort({ createdAt: -1 })
```

### Frontend
```javascript
// Abrir DevTools Console y verificar:

// 1. localStorage
console.log('selectedPlan:', localStorage.getItem('selectedPlan'));
console.log('paymentInitiatedAt:', localStorage.getItem('paymentInitiatedAt'));

// 2. Contexto de suscripción (en SubscriptionStatus.tsx)
// Ya están los console.log implementados:
// - subscription object
// - status object
// - sub const
```

## 🐛 Problemas Comunes

### Problema 1: Sigue mostrando suscripción cancelada
**Causa**: Cache del navegador o backend no actualizado
**Solución**:
```bash
# Backend
cd api
npm run build
# Reiniciar servidor

# Frontend
# Limpiar localStorage
localStorage.clear()
# Refrescar página (Ctrl + Shift + R)
```

### Problema 2: Error al crear payment link
**Causa**: Rate limit de Stripe en modo test
**Solución**:
- Esperar 15 minutos
- Usar un email diferente (`test+1@example.com`, `test+2@example.com`)
- Usar tarjeta de prueba diferente

### Problema 3: Alert Dialog no se muestra
**Causa**: Componente no instalado o importado incorrectamente
**Solución**:
```bash
cd web
npm install @radix-ui/react-alert-dialog
```

## 📊 Checklist de Despliegue

### Pre-Despliegue
- [x] Código compilado sin errores (Backend)
- [x] Código compilado sin errores (Frontend)
- [ ] Tests manuales en local
- [ ] Verificar variables de entorno
- [ ] Backup de base de datos (opcional)

### Despliegue
- [ ] Push a repositorio
- [ ] Verificar deploy en Railway (Backend)
- [ ] Verificar deploy en Vercel (Frontend)
- [ ] Monitorear logs por errores

### Post-Despliegue
- [ ] Test 1: Consulta de suscripción
- [ ] Test 2: Re-compra
- [ ] Test 3: Límites de integraciones
- [ ] Verificar webhooks de Stripe funcionan
- [ ] Monitorear errores en producción (primeras 24h)

## 🎯 Rollback (Si es necesario)

Si algo sale mal:

```bash
# Backend
git revert HEAD
git push origin master

# Frontend
git revert HEAD
git push origin master
```

O revertir a commit específico:
```bash
git log --oneline  # Ver commits
git revert COMMIT_HASH
git push origin master
```

## 📞 Soporte

Si necesitas ayuda:
1. Revisar logs de Railway/Vercel
2. Verificar console.log en el navegador
3. Verificar MongoDB directamente
4. Revisar webhooks de Stripe en el Dashboard

## 🎉 Resultado Esperado

Después del despliegue:
- ✅ Usuarios pueden cancelar y re-comprar sin problemas
- ✅ El sistema siempre muestra la suscripción más reciente y activa
- ✅ Los límites de integraciones se calculan correctamente
- ✅ Alert Dialog confirma cancelaciones
- ✅ Spinners y toasts mejoran la UX

