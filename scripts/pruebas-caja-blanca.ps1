# Pruebas de CAJA BLANCA del backend (Jest): se escriben con conocimiento del código fuente y de la base de datos.
#   - Unitarias (por defecto): funciones con reglas de negocio (envío y totales, paginación, tokens, subastas, distancias).
#     No usan red ni base de datos: no tocan nada y se pueden repetir las veces que haga falta.
#   - Integración (-Integracion): Supertest + base de PRUEBAS local (autenticación, carrito, pedidos, productos, endurecimiento,
#     SKU, administración solo web, API versionada). El globalSetup RECREA el esquema de la base local "lacase_test"
#     (prisma db push --force-reset). Se niega a correr si el nombre de la base no contiene "test". NUNCA toca producción.
#     Requiere PostgreSQL local encendido (puerto 5432) y backend\.env.test o la base lacase_test.
# Cada ejecución deja un reporte fechado en evidencia\produccion\jest-<tipo>-AAAA-MM-DD-HHMM.json (resultado por caso).
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\pruebas-caja-blanca.ps1              (unitarias)
#       powershell -ExecutionPolicy Bypass -File scripts\pruebas-caja-blanca.ps1 -Integracion  (integración, base local de pruebas)
param([switch]$Integracion)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$marca = (Get-Date).ToString('yyyy-MM-dd-HHmm')
$salidaDir = Join-Path $raiz 'evidencia\produccion'
New-Item -ItemType Directory -Force -Path $salidaDir | Out-Null
Set-Location (Join-Path $raiz 'backend')

if ($Integracion) {
  $suites = @('auth', 'cart', 'orders', 'products', 'security-hardening', 'sku-generation', 'admin-web-only', 'api-v1')
  $archivos = $suites | ForEach-Object { "tests/$_.test.ts" }
  $json = Join-Path $salidaDir "jest-integracion-$marca.json"
  Write-Host "Pruebas de integracion de caja blanca contra la base LOCAL de pruebas (se recrea su esquema)..." -ForegroundColor Cyan
  npx jest @archivos --runInBand --forceExit --verbose --json --outputFile=$json
} else {
  $json = Join-Path $salidaDir "jest-unitarias-$marca.json"
  Write-Host "Pruebas unitarias de caja blanca (sin red ni base de datos)..." -ForegroundColor Cyan
  npx jest -c jest.unitarias.config.js --runInBand --forceExit --verbose --json --outputFile=$json
}
$codigo = $LASTEXITCODE
Write-Host "`nReporte: $json" -ForegroundColor Green
Set-Location $raiz
exit $codigo
