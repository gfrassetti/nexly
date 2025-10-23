# Módulo de Publicación Unificada

## Descripción
El módulo de publicación unificada permite a los usuarios publicar contenido (videos e imágenes) en múltiples plataformas sociales (TikTok e Instagram) desde una sola interfaz.

## Características

### ✅ Funcionalidades Implementadas
- **Publicación unificada**: Publica en TikTok e Instagram simultáneamente
- **Upload de archivos**: Soporte para videos (MP4, MOV, AVI) e imágenes (JPG, PNG, GIF)
- **Validación de archivos**: Límites de tamaño y formato por plataforma
- **Preview de contenido**: Vista previa antes de publicar
- **Hashtags**: Campo separado para hashtags
- **Programación**: Opción para programar publicaciones (futuro)
- **Resultados detallados**: Feedback de éxito/error por plataforma

### 🎯 Plataformas Soportadas
- **TikTok**: Solo videos, máximo 100MB, duración hasta 10 minutos
- **Instagram**: Videos e imágenes, máximo 100MB, duración hasta 60 segundos

## Estructura del Proyecto

### Backend (`api/src/routes/publish.ts`)
```typescript
// Endpoints principales:
GET  /api/publish/integrations  // Obtener integraciones disponibles
POST /api/publish/publish        // Publicar contenido
GET  /api/publish/history       // Historial de publicaciones
```

### Frontend (`web/src/`)
- **Componente**: `components/PublishModule.tsx`
- **Página**: `app/publish/page.tsx`
- **Servicio**: `lib/publishService.ts`
- **Navegación**: Agregado al `Sidebar.tsx`

## Uso

### 1. Acceder al Módulo
- Navegar a `/publish` desde el dashboard
- O usar el enlace "Publicar" en el sidebar

### 2. Configurar Publicación
1. **Seleccionar plataformas**: Elegir TikTok e Instagram
2. **Subir archivo**: Arrastrar o seleccionar video/imagen
3. **Escribir descripción**: Caption principal
4. **Agregar hashtags**: Campo opcional para hashtags
5. **Programar** (opcional): Fecha y hora de publicación

### 3. Publicar
- Hacer clic en "Publicar en X plataformas"
- Ver resultados en tiempo real
- El formulario se limpia automáticamente tras publicación exitosa

## Configuración Técnica

### Dependencias Backend
```bash
npm install multer @types/multer
```

### Variables de Entorno
```env
# TikTok
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=your_redirect_uri

# Instagram
INSTAGRAM_CLIENT_ID=your_client_id
INSTAGRAM_CLIENT_SECRET=your_client_secret
INSTAGRAM_REDIRECT_URI=your_redirect_uri
```

### Estructura de Archivos
```
api/
├── src/routes/publish.ts          # Endpoints de publicación
├── uploads/                       # Directorio temporal de archivos
│   └── .gitignore                # Ignorar archivos subidos
└── dist/                         # Archivos compilados

web/
├── src/
│   ├── components/PublishModule.tsx  # Componente principal
│   ├── app/publish/page.tsx          # Página de publicación
│   ├── lib/publishService.ts         # Servicio de API
│   └── components/Sidebar.tsx         # Navegación actualizada
```

## API Reference

### GET /api/publish/integrations
Obtiene las integraciones disponibles para publicación.

**Response:**
```json
{
  "success": true,
  "integrations": [
    {
      "id": "integration_id",
      "provider": "tiktok",
      "name": "TikTok - @username",
      "status": "linked",
      "capabilities": {
        "supportsVideo": true,
        "supportsImage": false,
        "maxVideoSize": "100MB",
        "maxDuration": "10 minutos",
        "formats": ["mp4", "mov", "avi"]
      }
    }
  ]
}
```

### POST /api/publish/publish
Publica contenido en las plataformas seleccionadas.

**Request (FormData):**
- `media`: Archivo de video/imagen
- `caption`: Descripción del contenido
- `platforms`: Array de plataformas (JSON)
- `scheduleTime`: Fecha de programación (opcional)

**Response:**
```json
{
  "success": true,
  "message": "Publicado en 2 de 2 plataformas",
  "results": [
    {
      "platform": "tiktok",
      "success": true,
      "postId": "video_id_123"
    },
    {
      "platform": "instagram",
      "success": false,
      "error": "Error de autenticación"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  }
}
```

## Limitaciones Actuales

### TikTok
- Solo videos (no imágenes)
- Máximo 100MB
- Duración máxima: 10 minutos
- Formatos: MP4, MOV, AVI

### Instagram
- Videos e imágenes
- Máximo 100MB
- Duración máxima: 60 segundos
- Formatos: MP4, MOV, JPG, PNG, GIF

## Próximas Mejoras

### 🔮 Funcionalidades Futuras
- [ ] **Programación avanzada**: Cron jobs para publicaciones programadas
- [ ] **Historial de publicaciones**: Base de datos de publicaciones realizadas
- [ ] **Analytics**: Estadísticas de rendimiento por plataforma
- [ ] **Plantillas**: Guardar configuraciones de publicación
- [ ] **Más plataformas**: Facebook, Twitter, LinkedIn
- [ ] **Edición de contenido**: Filtros, recortes, efectos
- [ ] **Colaboración**: Múltiples usuarios, aprobaciones

### 🛠️ Mejoras Técnicas
- [ ] **CDN**: Servidor de archivos para mejor rendimiento
- [ ] **Queue system**: Cola de publicaciones para mejor manejo
- [ ] **Webhooks**: Notificaciones de estado de publicación
- [ ] **Retry logic**: Reintentos automáticos en caso de fallo
- [ ] **Batch processing**: Procesamiento por lotes

## Troubleshooting

### Errores Comunes

#### "TikTok no está conectado"
- Verificar que la integración de TikTok esté activa
- Revisar tokens de acceso en la base de datos

#### "Error de autenticación"
- Tokens expirados, reconectar la integración
- Verificar credenciales de la aplicación

#### "Archivo demasiado grande"
- Comprimir el archivo antes de subir
- Usar formatos más eficientes (MP4 para video)

#### "Formato no soportado"
- TikTok: Solo videos (MP4, MOV, AVI)
- Instagram: Videos e imágenes (MP4, MOV, JPG, PNG, GIF)

## Contribución

Para agregar nuevas plataformas:

1. **Backend**: Agregar lógica en `publishTo[Platform]()`
2. **Frontend**: Actualizar `getPlatformIcon()` y `getPlatformColor()`
3. **Validación**: Agregar reglas en `validateFile()`
4. **Capabilities**: Actualizar `getProviderCapabilities()`

## Soporte

Para problemas o preguntas:
- Revisar logs del servidor
- Verificar integraciones en `/dashboard/integrations`
- Contactar soporte técnico
