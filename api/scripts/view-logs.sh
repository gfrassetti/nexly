#!/bin/bash

ENVIRONMENT=$1
LOG_DIR="logs"

echo "🔍 Nexly Logs Viewer - Environment: $ENVIRONMENT"
echo "================================================"

if [ "$ENVIRONMENT" == "development" ]; then
    echo "📱 DESARROLLO - Logs en consola:"
    echo "Para ver logs en tiempo real, ejecuta: npm run dev"
    echo ""
    echo "📁 Archivos de log disponibles:"
    if [ -d "$LOG_DIR" ]; then
        ls -lh "$LOG_DIR"
    else
        echo "No hay archivos de log aún"
    fi
elif [ "$ENVIRONMENT" == "production" ]; then
    echo "🚀 PRODUCCIÓN - Verificando logs..."
    echo ""
    if [ -d "$LOG_DIR" ]; then
        ERROR_LOG="$LOG_DIR/errors.log"
        echo "📊 Últimos errores:"
        if [ -f "$ERROR_LOG" ]; then
            echo "--- Últimas 10 líneas de errors.log ---"
            tail -n 10 "$ERROR_LOG"
        else
            echo "No hay archivo errors.log"
        fi
        echo ""
        echo "📈 Estadísticas de errores:"
        if [ -f "$ERROR_LOG" ]; then
            TOTAL_LINES=$(wc -l < "$ERROR_LOG")
            TODAY_ERRORS=$(grep -c "$(date +%Y-%m-%d)" "$ERROR_LOG")
            echo "Total de errores: $TOTAL_LINES"
            echo "Errores de hoy: $TODAY_ERRORS"
        fi
        echo ""
        echo "🔍 Comandos útiles:"
        echo "  tail -f $LOG_DIR/errors.log          # Ver errores en tiempo real"
        echo "  grep 'ERROR' $LOG_DIR/errors.log     # Buscar errores específicos"
        echo "  grep 'Integration Error' $LOG_DIR/errors.log  # Errores de integrations"
    else
        echo "No hay directorio de logs"
    fi
else
    echo "❌ Entorno no válido. Usa: development o production"
    exit 1
fi

echo ""
echo "🌐 Endpoints de testing:"
echo "  http://localhost:3001/loggerTest              # Probar todos los logs"
echo "  http://localhost:3001/loggerTest/performance  # Test de rendimiento"
