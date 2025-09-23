#!/bin/bash

# Script para verificar la configuración completa de Meta WhatsApp Business API

echo "🔍 Verificando configuración de Meta WhatsApp Business API..."
echo "=================================================="

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar variables de entorno
echo "📋 Verificando variables de entorno..."
echo ""

# Lista de variables requeridas
REQUIRED_VARS=(
    "META_APP_ID"
    "META_APP_SECRET" 
    "META_ACCESS_TOKEN"
    "META_PHONE_NUMBER_ID"
    "META_WABA_ID"
    "WEBHOOK_VERIFY_TOKEN"
    "API_URL"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ $var: No configurado"
        MISSING_VARS+=("$var")
    else
        echo "✅ $var: Configurado"
    fi
done

echo ""

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Variables faltantes:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "💡 Agrega estas variables en Railway o en tu archivo .env"
    exit 1
fi

# Verificar conexión con Meta API
echo "🌐 Probando conexión con Meta API..."
echo ""

if [ -n "$META_ACCESS_TOKEN" ] && [ -n "$META_PHONE_NUMBER_ID" ]; then
    PHONE_INFO=$(curl -s "https://graph.facebook.com/v19.0/$META_PHONE_NUMBER_ID?access_token=$META_ACCESS_TOKEN&fields=display_phone_number,verified_name")
    
    if echo "$PHONE_INFO" | grep -q "display_phone_number"; then
        PHONE_NUMBER=$(echo "$PHONE_INFO" | grep -o '"display_phone_number":"[^"]*"' | cut -d'"' -f4)
        VERIFIED_NAME=$(echo "$PHONE_INFO" | grep -o '"verified_name":"[^"]*"' | cut -d'"' -f4)
        
        echo "✅ Conexión con Meta API exitosa"
        echo "📱 Número: $PHONE_NUMBER"
        echo "🏢 Nombre verificado: $VERIFIED_NAME"
    else
        echo "❌ Error conectando con Meta API:"
        echo "$PHONE_INFO"
        exit 1
    fi
else
    echo "❌ No se puede probar la conexión (faltan META_ACCESS_TOKEN o META_PHONE_NUMBER_ID)"
fi

echo ""

# Verificar webhook
echo "🔗 Probando endpoint de webhook..."
echo ""

if [ -n "$API_URL" ] && [ -n "$WEBHOOK_VERIFY_TOKEN" ]; then
    WEBHOOK_URL="$API_URL/webhook"
    TEST_CHALLENGE="test_challenge_$(date +%s)"
    
    WEBHOOK_RESPONSE=$(curl -s "$WEBHOOK_URL?hub.verify_token=$WEBHOOK_VERIFY_TOKEN&hub.challenge=$TEST_CHALLENGE")
    
    if [ "$WEBHOOK_RESPONSE" = "$TEST_CHALLENGE" ]; then
        echo "✅ Webhook configurado correctamente"
        echo "🔗 URL: $WEBHOOK_URL"
    else
        echo "❌ Webhook no responde correctamente"
        echo "   Respuesta: $WEBHOOK_RESPONSE"
        echo "   Esperado: $TEST_CHALLENGE"
    fi
else
    echo "❌ No se puede probar el webhook (faltan API_URL o WEBHOOK_VERIFY_TOKEN)"
fi

echo ""

# Mostrar configuración para Meta
echo "📝 Configuración para Meta Developer Console:"
echo "=================================================="
echo "URL de devolución de llamada: $API_URL/webhook"
echo "Token de verificación: $WEBHOOK_VERIFY_TOKEN"
echo ""

echo "✨ Verificación completada"
echo ""
echo "🚀 Próximos pasos:"
echo "1. Ve a https://developers.facebook.com/"
echo "2. Selecciona tu app de WhatsApp Business"
echo "3. Ve a WhatsApp → Configuración"
echo "4. Configura el webhook con la información mostrada arriba"
echo "5. Haz clic en 'Verificar y guardar'"
