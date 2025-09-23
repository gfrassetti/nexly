# Configuración de Stripe para Nexly

Este documento explica cómo configurar Stripe como método de pago adicional en Nexly.

## 1. Crear cuenta en Stripe

1. Ve a [stripe.com](https://stripe.com) y crea una cuenta
2. Completa la verificación de tu cuenta de negocio
3. Activa las suscripciones en tu dashboard de Stripe

## 2. Obtener las claves de API

1. En tu dashboard de Stripe, ve a **Developers > API keys**
2. Copia las siguientes claves:
   - **Publishable key** (pk_test_... o pk_live_...)
   - **Secret key** (sk_test_... o sk_live_...)

## 3. Configurar webhooks

1. En tu dashboard de Stripe, ve a **Developers > Webhooks**
2. Haz clic en **Add endpoint**
3. URL del endpoint: `https://tu-dominio.com/stripe/webhook`
4. Selecciona los siguientes eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copia el **Signing secret** (whsec_...)

## 4. Configurar variables de entorno

Agrega las siguientes variables a tu archivo `.env` y a Railway:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # o sk_live_... para producción
STRIPE_PUBLISHABLE_KEY=pk_test_... # o pk_live_... para producción
STRIPE_WEBHOOK_SECRET=whsec_... # El signing secret del webhook
```

## 5. Configurar moneda

Stripe está configurado para usar **pesos argentinos (ARS)** por defecto:

- Plan Básico: $1,000 ARS/mes
- Plan Premium: $1,500 ARS/mes

Los precios se configuran automáticamente cuando se crean las primeras suscripciones.

## 6. Características implementadas

### Backend
- ✅ Servicio de Stripe con métodos para crear planes básico y premium
- ✅ Rutas para crear enlaces de pago
- ✅ Webhooks para manejar eventos de suscripción
- ✅ Métodos para cancelar, pausar y reactivar suscripciones
- ✅ Soporte para períodos de prueba de 7 días

### Frontend
- ✅ Selector de método de pago (MercadoPago vs Stripe)
- ✅ Integración con el flujo de registro
- ✅ Botones de pago con estados de carga
- ✅ Actualización de FAQ y documentación

### Base de datos
- ✅ Campos adicionales en el modelo Subscription:
  - `stripeSubscriptionId`
  - `stripeSessionId`

## 7. Flujo de pago

1. Usuario selecciona Stripe como método de pago
2. Se crea una sesión de checkout en Stripe
3. Usuario completa el pago en Stripe Checkout
4. Webhook confirma el pago y activa la suscripción
5. Usuario es redirigido a la página de éxito

## 8. Monitoreo

Puedes monitorear los pagos y suscripciones en tu dashboard de Stripe:
- **Payments**: Ver todos los pagos procesados
- **Customers**: Gestionar clientes y sus suscripciones
- **Subscriptions**: Ver el estado de las suscripciones activas

## 9. Testing

Para probar en modo desarrollo:
1. Usa las claves de test (`sk_test_...` y `pk_test_...`)
2. Usa tarjetas de prueba de Stripe:
   - `4242424242424242` (Visa exitosa)
   - `4000000000000002` (Tarjeta rechazada)
   - `4000000000009995` (Fondos insuficientes)

## 10. Producción

Para activar en producción:
1. Cambia a claves live (`sk_live_...` y `pk_live_...`)
2. Actualiza la URL del webhook a tu dominio de producción
3. Verifica que todos los webhooks estén funcionando correctamente
4. Configura alertas de monitoreo en Stripe

## Notas importantes

- Stripe cobra una comisión del 2.9% + $0.30 USD por transacción
- Los webhooks son críticos para sincronizar el estado de las suscripciones
- Siempre verifica las firmas de los webhooks para seguridad
- Mantén un respaldo de los datos de suscripción en tu base de datos
