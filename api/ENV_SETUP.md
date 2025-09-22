# Configuración de Variables de Entorno

## Variables Requeridas

### Base de Datos
```env
MONGODB_URI=mongodb://localhost:27017/nexly
```

### Autenticación
```env
JWT_SECRET=tu_jwt_secret_muy_seguro
```

### Meta (Facebook/WhatsApp)
```env
META_APP_ID=tu_meta_app_id
META_APP_SECRET=tu_meta_app_secret
META_ACCESS_TOKEN=tu_meta_access_token
META_PHONE_NUMBER_ID=tu_phone_number_id
META_WABA_ID=tu_waba_id
```

### Mercado Pago
```env
MERCADOPAGO_ACCESS_TOKEN=tu_mercadopago_access_token
MERCADOPAGO_BASE_URL=https://api.mercadopago.com
```

### URLs
```env
FRONTEND_URL=http://localhost:3000
```

### Servidor
```env
PORT=4000
NODE_ENV=development
```

## Cómo obtener las credenciales

### Mercado Pago
1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Crea una aplicación
3. Copia el Access Token de prueba o producción
4. Configura las URLs de webhook

### Meta
1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Crea una aplicación
3. Configura WhatsApp Business API
4. Obtén los tokens y IDs necesarios

## Railway Deployment
Agrega estas variables en el dashboard de Railway:
- Variables de entorno → Add Variable
- Usa los nombres exactos de arriba
- Para producción, usa tokens reales (no de prueba)
