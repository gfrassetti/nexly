#!/bin/bash

# Script para diagnosticar la configuración de Meta
# Uso: ./debug_meta.sh tu_jwt_token

if [ -z "$1" ]; then
    echo "❌ Error: Proporciona tu JWT token"
    echo "Uso: ./debug_meta.sh tu_jwt_token"
    exit 1
fi

TOKEN=$1
API_URL="http://localhost:4000"

echo "🔍 DIAGNÓSTICO COMPLETO DE META INTEGRATION"
echo "=============================================="
echo ""

echo "1️⃣ Verificando estado del flujo..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_URL/integrations/debug/flow-status" | jq '.'

echo ""
echo "2️⃣ Probando conexión con Meta API..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_URL/integrations/debug/test-meta-api" | jq '.'

echo ""
echo "3️⃣ Verificando configuración básica..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_URL/integrations/debug/meta-config" | jq '.'

echo ""
echo "4️⃣ Listando integraciones existentes..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_URL/integrations" | jq '.'

echo ""
echo "✅ Diagnóstico completado!"
echo ""
echo "🔗 URLs de prueba:"
echo "   Simular éxito: $API_URL/integrations/debug/simulate-callback?userId=tu_user_id&success=true"
echo "   Simular error:  $API_URL/integrations/debug/simulate-callback?userId=tu_user_id&success=false"
