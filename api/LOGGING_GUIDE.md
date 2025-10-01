# 📊 Guía de Logging - Nexly API

## 🎯 Niveles de Log
```
debug (0) → http (1) → info (2) → warning (3) → error (4) → fatal (5)
```

## 🛠️ DESARROLLO

### Ver logs en consola:
```bash
npm run dev
```

**Características:**
- ✅ Solo consola (sin archivos)
- ✅ Colores y formato legible
- ✅ Solo info y superior (más rápido)
- ✅ Logs importantes de integrations/auth

### Probar logging:
```bash
curl http://localhost:3001/loggerTest
```

## 🚀 PRODUCCIÓN

### Ver logs en Railway:
```bash
# Logs en tiempo real
railway logs

# Filtrar errores
railway logs --follow --filter "ERROR"

# Filtrar integrations
railway logs --follow --filter "Integration Error"
```

### Ver archivos de log (dentro del contenedor):
```bash
# Conectar al contenedor
railway shell

# Ver errores
tail -f logs/errors.log

# Buscar errores específicos
grep "Integration Error" logs/errors.log
grep "Auth Error" logs/errors.log
```

## 📊 Comandos Rápidos

### Desarrollo:
```bash
npm run dev                           # Iniciar con logs en consola
curl http://localhost:3001/loggerTest # Probar logging
```

### Producción:
```bash
railway logs                          # Ver logs en tiempo real
railway shell                         # Conectar al contenedor
tail -f logs/errors.log               # Ver errores
grep "ERROR" logs/errors.log          # Buscar errores
```

## 🔧 Configuración

**Variables de entorno:**
```bash
NODE_ENV=development  # o production
```

**Archivos de log (solo producción):**
```
logs/
├── errors.log          # Solo errores
├── exceptions.log      # Excepciones no capturadas
└── rejections.log      # Promesas rechazadas
```

---

**Versión:** 2.0.0 - Optimizado para rendimiento
