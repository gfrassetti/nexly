# Script para diagnosticar la configuración de Meta
# Uso: .\debug_meta.ps1 "tu_jwt_token"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$API_URL = "http://localhost:4000"

Write-Host "🔍 DIAGNÓSTICO COMPLETO DE META INTEGRATION" -ForegroundColor Cyan
Write-Host "==============================================`n" -ForegroundColor Cyan

# Verificar que el servidor esté corriendo
Write-Host "🔌 Verificando conexión al servidor..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$API_URL/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Servidor respondiendo correctamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: No se puede conectar al servidor en $API_URL" -ForegroundColor Red
    Write-Host "   Asegúrate de que el servidor esté corriendo con: npm run dev" -ForegroundColor Yellow
    return
}

Write-Host "`n1️⃣ Verificando estado del flujo..." -ForegroundColor Yellow
try {
    $response1 = Invoke-RestMethod -Uri "$API_URL/integrations/debug/flow-status" -Headers @{"Authorization" = "Bearer $Token"} -Method Get
    Write-Host ($response1 | ConvertTo-Json -Depth 10) -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   Token inválido o expirado. Obtén un nuevo token del navegador." -ForegroundColor Yellow
    }
}

Write-Host "`n2️⃣ Probando conexión con Meta API..." -ForegroundColor Yellow
try {
    $response2 = Invoke-RestMethod -Uri "$API_URL/integrations/debug/test-meta-api" -Headers @{"Authorization" = "Bearer $Token"} -Method Get
    Write-Host ($response2 | ConvertTo-Json -Depth 10) -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3️⃣ Verificando configuración básica..." -ForegroundColor Yellow
try {
    $response3 = Invoke-RestMethod -Uri "$API_URL/integrations/debug/meta-config" -Headers @{"Authorization" = "Bearer $Token"} -Method Get
    Write-Host ($response3 | ConvertTo-Json -Depth 10) -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4️⃣ Listando integraciones existentes..." -ForegroundColor Yellow
try {
    $response4 = Invoke-RestMethod -Uri "$API_URL/integrations" -Headers @{"Authorization" = "Bearer $Token"} -Method Get
    Write-Host ($response4 | ConvertTo-Json -Depth 10) -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Diagnóstico completado!" -ForegroundColor Green
Write-Host "`n🔗 URLs de prueba disponibles:" -ForegroundColor Cyan
Write-Host "   - Estado del flujo: $API_URL/integrations/debug/flow-status" -ForegroundColor Gray
Write-Host "   - Test Meta API: $API_URL/integrations/debug/test-meta-api" -ForegroundColor Gray
Write-Host "   - Configuración: $API_URL/integrations/debug/meta-config" -ForegroundColor Gray
