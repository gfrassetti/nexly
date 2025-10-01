param (
    [string]$Environment = "development"
)

$LogDir = "logs"

Write-Host "🔍 Nexly Logs Viewer - Environment: $Environment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

if ($Environment -eq "development") {
    Write-Host "📱 DESARROLLO - Logs en consola:" -ForegroundColor Green
    Write-Host "Para ver logs en tiempo real, ejecuta: npm run dev"
    Write-Host ""
    Write-Host "📁 Archivos de log disponibles:" -ForegroundColor Yellow
    
    if (Test-Path $LogDir) {
        Get-ChildItem $LogDir | Format-Table Name, Length, LastWriteTime
    } else {
        Write-Host "No hay archivos de log aún" -ForegroundColor Red
    }
}
elseif ($Environment -eq "production") {
    Write-Host "🚀 PRODUCCIÓN - Verificando logs..." -ForegroundColor Red
    Write-Host ""
    
    if (Test-Path $LogDir) {
        $ErrorLog = Join-Path $LogDir "errors.log"
        
        Write-Host "📊 Últimos errores:" -ForegroundColor Yellow
        if (Test-Path $ErrorLog) {
            Write-Host "--- Últimas 10 líneas de errors.log ---" -ForegroundColor Gray
            Get-Content $ErrorLog -Tail 10
        } else {
            Write-Host "No hay archivo errors.log" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "📈 Estadísticas de errores:" -ForegroundColor Yellow
        if (Test-Path $ErrorLog) {
            $TotalLines = (Get-Content $ErrorLog | Measure-Object -Line).Lines
            $TodayErrors = (Get-Content $ErrorLog | Where-Object { $_ -match (Get-Date -Format "yyyy-MM-dd") } | Measure-Object -Line).Lines
            
            Write-Host "Total de errores: $TotalLines"
            Write-Host "Errores de hoy: $TodayErrors"
        }
        
        Write-Host ""
        Write-Host "🔍 Comandos útiles:" -ForegroundColor Yellow
        Write-Host "  Get-Content $LogDir\errors.log -Wait          # Ver errores en tiempo real"
        Write-Host "  Select-String 'ERROR' $LogDir\errors.log     # Buscar errores específicos"
        Write-Host "  Select-String 'Integration Error' $LogDir\errors.log  # Errores de integrations"
    } else {
        Write-Host "No hay directorio de logs" -ForegroundColor Red
    }
}
else {
    Write-Host "❌ Entorno no válido. Usa: development o production" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🌐 Endpoints de testing:" -ForegroundColor Cyan
Write-Host "  http://localhost:3001/loggerTest              # Probar todos los logs"
Write-Host "  http://localhost:3001/loggerTest/performance  # Test de rendimiento"
