# Todo el flujo de produccion en UN solo script (correos y URLs ya definidos; solo escribes 2 contrasenas):
#   1) Abre Render (Environment) para que copies DATABASE_URL (icono de copiar); el script la lee del portapapeles.
#   2) Prueba la conexion, compara el esquema (ABORTA si habria borrados) y aplica solo lo que agrega.
#   3) Renombra/crea una cuenta por rol: admin@ , vendedor@ y comprador@lacase.test (rotando contrasenas).
#   4) Con tu confirmacion, publica la rama en main (Render y Netlify despliegan solos) y espera a que
#      el codigo nuevo este en vivo.
#   5) Ejecuta la suite Cypress (flujo Must, autenticación, validación e interfaz) y deja el reporte
#      en evidencia\produccion\.
# Los secretos nunca se guardan: solo viven en variables de entorno del proceso y se borran al terminar.
#
# Uso (desde la raiz del proyecto):  powershell -ExecutionPolicy Bypass -File scripts\produccion.ps1

param([switch]$SoloCypress, [switch]$Capturas, [switch]$Limpiar, [switch]$Newman, [switch]$Gui, [switch]$Olvidar, [switch]$NuevasClaves, [string]$Navegador = "electron")
# -Olvidar:     borra las contrasenas guardadas de la sesion y termina (se piden una sola vez y se reutilizan 8 horas, ver lib-claves.ps1)
# -NuevasClaves: ignora las guardadas y las pide de nuevo
# -SoloCypress: repite la suite contra produccion (sin base de datos ni push)
# -Capturas:    deja datos ficticios visibles (pedido confirmado con QR y producto en el carrito) para las capturas
# -Limpiar:     deshace esos datos (carrito vacio, pedidos cancelados, productos [REVISION] dados de baja)
# -Newman:      corre la coleccion de Postman (postman\) contra produccion con Newman y guarda el reporte fechado
# -Gui:         abre la interfaz grafica de Cypress (cypress open) apuntando a produccion, para reproducir los casos
if ($Capturas -or $Limpiar -or $Newman -or $Gui) { $SoloCypress = $true }

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$front = "https://tiendaslacase.netlify.app"
$api = "https://lacase-diplomado-api.onrender.com/api/v1"
$renderEnv = "https://dashboard.render.com/web/srv-dasncu0473hc7393pmq0/env"
$rama = "feature/empleos-geo-rediseno"

. (Join-Path $PSScriptRoot 'lib-claves.ps1')   # Leer-Secreto, Obtener-Claves, Olvidar-Claves
if ($Olvidar) { Olvidar-Claves; exit 0 }

# Prisma (db push / migrate diff) necesita conexion directa o Session pooler (5432), no el pooler transaccional (6543).
# Quita los parametros de pgbouncer sin romper el resto de la query (p. ej. sslmode=require).
function Preparar-Url($u) {
  if ($u -notmatch ":6543/") { return $u }
  Write-Host "Aviso: URL del pooler transaccional (6543); se usa 5432 y se quitan parametros pgbouncer." -ForegroundColor Yellow
  $u = $u -replace ":6543/", ":5432/"
  $partes = $u -split "\?", 2
  if ($partes.Count -lt 2) { return $u }
  $params = $partes[1] -split "&" | Where-Object { $_ -and $_ -notmatch "^(pgbouncer|connection_limit)=" }
  if ($params) { return $partes[0] + "?" + ($params -join "&") } else { return $partes[0] }
}

function Con-Limite($segundos, [scriptblock]$bloque, $etiqueta) {
  $dir = (Get-Location).Path
  $job = Start-Job -ScriptBlock { param($d, $b) Set-Location $d; & ([scriptblock]::Create($b)) 2>&1 | Out-String } -ArgumentList $dir, $bloque.ToString()
  if (-not (Wait-Job $job -Timeout $segundos)) {
    Stop-Job $job; Remove-Job $job -Force
    throw "$etiqueta no respondio en $segundos s (se corta para que no quede colgado)."
  }
  $salida = Receive-Job $job
  Remove-Job $job -Force
  return $salida
}

try {
  if (-not $SoloCypress) {
  # ---------- 1) DATABASE_URL desde el portapapeles ----------
  Write-Host "`n[1/5] Abriendo Render. En la fila DATABASE_URL pulsa el icono de COPIAR (o del ojo y copia)." -ForegroundColor Cyan
  Start-Process $renderEnv
  Read-Host "Cuando la hayas copiado, pulsa Enter"
  $url = (Get-Clipboard -Raw).Trim()
  if ($url -notmatch '^postgres(ql)?://') {
    Write-Host "El portapapeles no tiene una URL postgresql://. La pego de forma oculta:" -ForegroundColor Yellow
    $url = Leer-Secreto "DATABASE_URL"
  }
  try { Set-Clipboard -Value " " } catch {}   # no dejar la credencial en el portapapeles
  $url = Preparar-Url $url
  $env:DATABASE_URL = $url

  }
  # ---------- contrasenas (unico dato que escribes) ----------
  # Se piden una sola vez (cifradas con DPAPI fuera del repositorio) y se reutilizan en este y en los demas scripts durante 8 horas.
  $claves = Obtener-Claves -Nuevas:$NuevasClaves
  $claveAdmin = $claves.Admin
  $claveResto = $claves.Resto
  if (-not $SoloCypress) {
  $env:ADMIN_PREVIOUS_EMAIL = "admin@lacase.bo"
  $env:ADMIN_EMAIL = "admin@lacase.test"
  $env:ADMIN_PASSWORD = $claveAdmin
  $env:REVIEW_PASSWORD = $claveResto

  # ---------- 2) Conexion + esquema ----------
  Set-Location (Join-Path $raiz "backend")
  Write-Host "`n[2/5] Probando la conexion y comparando esquemas..." -ForegroundColor Cyan
  npx tsx scripts/probar-conexion.ts
  if ($LASTEXITCODE -ne 0) { throw "No hay conexion con la base. Usa la cadena del Session pooler de Supabase (puerto 5432) si la directa es solo IPv6." }
  $sql = Con-Limite 120 { npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script } "La comparacion de esquemas"
  $drops = $sql -split "`n" | Where-Object { $_ -match "DROP\s+(TABLE|COLUMN|TYPE)" -or $_ -match "ALTER TABLE .* DROP" }
  if ($drops) {
    Write-Host "ABORTADO: el cambio incluiria borrados:" -ForegroundColor Red
    $drops | ForEach-Object { Write-Host "  $_" }
    exit 1
  }
  $cambios = ($sql -split "`n" | Where-Object { $_ -match "^(CREATE|ALTER)" }).Count
  Write-Host "Solo agrega estructura ($cambios sentencias, sin borrados)."
  if ($cambios -gt 0) { Write-Host (Con-Limite 180 { npx prisma db push --skip-generate } "db push") }

  # ---------- 3) Cuentas ----------
  Write-Host "`n[3/5] Renombrando/creando admin@, vendedor@ y comprador@lacase.test..." -ForegroundColor Cyan
  npx tsx prisma/seed-prod.ts
  if ($LASTEXITCODE -ne 0) { throw "seed-prod fallo." }

  # ---------- 3b) Imagenes nuevas (solo UPDATE de URLs; no borra ni crea filas) ----------
  Write-Host "`nImagenes nuevas del catalogo (categorias, productos, tiendas, avatares). Simulacion primero:" -ForegroundColor Cyan
  npx tsx scripts/backfill-seed-images.ts
  $img = Read-Host "Escribe SI para aplicar esas actualizaciones de imagen (otra cosa = omitir)"
  if ($img -eq "SI") { npx tsx scripts/backfill-seed-images.ts --apply }
  Remove-Item Env:DATABASE_URL, Env:ADMIN_PREVIOUS_EMAIL, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD, Env:REVIEW_PASSWORD -ErrorAction SilentlyContinue

  # ---------- 4) Publicar y esperar el despliegue ----------
  Set-Location $raiz
  Write-Host "`n[4/5] Publicar '$rama' en main hara que Render y Netlify desplieguen el codigo nuevo." -ForegroundColor Cyan
  $ok = Read-Host "Escribe SI para publicar ahora (cualquier otra cosa lo omite y asume que ya esta desplegado)"
  if ($ok -eq "SI") {
    git push origin "${rama}:main"
    if ($LASTEXITCODE -ne 0) { throw "git push fallo." }
  }
  $commitLocal = (git rev-parse --short=7 HEAD).Trim()
  Write-Host "Esperando que la API publique el commit $commitLocal (hasta 25 min; /salud informa el commit en vivo)..."
  $listo = $false
  for ($i = 0; $i -lt 100 -and -not $listo; $i++) {
    try {
      $salud = Invoke-RestMethod -Uri "$api/salud" -TimeoutSec 30
      $listo = ($salud.commit -eq $commitLocal)
    } catch { }
    if (-not $listo) { Write-Host -NoNewline "."; Start-Sleep -Seconds 15 }
  }
  if (-not $listo) { throw "La API no publico el commit $commitLocal a tiempo. Revisa el deploy en Render y vuelve a ejecutar." }
  Write-Host "`nAPI en vivo con el commit $commitLocal." -ForegroundColor Green
  }

  # ---------- 5) Cypress contra produccion ----------
  Write-Host "`n[5/5] Ejecutando la suite Cypress contra produccion (tarda unos minutos)..." -ForegroundColor Cyan
  $env:CYPRESS_BASE_URL = $front
  $env:CYPRESS_API_URL = $api
  $env:CYPRESS_REVIEW_SELLER_EMAIL = "vendedor@lacase.test"
  $env:CYPRESS_REVIEW_BUYER_EMAIL = "comprador@lacase.test"
  $env:CYPRESS_REVIEW_ADMIN_EMAIL = "admin@lacase.test"
  $env:CYPRESS_REVIEW_SELLER_PASSWORD = $claveResto
  $env:CYPRESS_REVIEW_BUYER_PASSWORD = $claveResto
  $env:CYPRESS_REVIEW_ADMIN_PASSWORD = $claveAdmin
  Set-Location (Join-Path $raiz "frontend")
  if ($Newman) {
    # Entorno temporal con las contrasenas (se borra al terminar): nunca van en la coleccion ni en el repositorio.
    $envFile = Join-Path $env:TEMP "lacase-newman-env.json"
    $entorno = Get-Content (Join-Path $raiz "postman\LaCase-produccion.postman_environment.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($v in $entorno.values) {
      if ($v.key -eq "sellerPassword" -or $v.key -eq "buyerPassword") { $v.value = $claveResto }
      if ($v.key -eq "adminPassword") { $v.value = $claveAdmin }
    }
    $entorno | ConvertTo-Json -Depth 6 | Set-Content $envFile -Encoding UTF8
    $marca = (Get-Date).ToString("yyyy-MM-dd-HHmm")
    $salida = Join-Path $raiz "evidencia\produccion"
    New-Item -ItemType Directory -Force -Path $salida | Out-Null
    try {
      npx newman run (Join-Path $raiz "postman\LaCase-E3.postman_collection.json") -e $envFile --reporters "cli,json,htmlextra" --reporter-json-export (Join-Path $salida "newman-$marca.json") --reporter-htmlextra-export (Join-Path $salida "newman-$marca.html") --reporter-htmlextra-title "LaCase Multitiendas - E3 - produccion"
    } finally { Remove-Item $envFile -ErrorAction SilentlyContinue }
  }
  elseif ($Gui) {
    # Electron (el navegador incluido en Cypress) abre siempre; con Edge el ejecutor puede quedarse en "Opening E2E testing in Edge".
    Write-Host "Abriendo la interfaz grafica de Cypress con $Navegador (usa -Navegador edge para probar con Edge)..." -ForegroundColor Cyan
    npx cypress open --e2e --browser $Navegador
  }
  elseif ($Capturas) { npx cypress run --spec cypress/e2e/06-datos-capturas.cy.ts }
  elseif ($Limpiar) { npx cypress run --spec cypress/e2e/07-limpiar-capturas.cy.ts }
  else { npx cypress run --spec "cypress/e2e/0[1-5]*.cy.ts,cypress/e2e/09-*.cy.ts,cypress/e2e/99-*.cy.ts" }
  Write-Host "`nReporte en: $raiz\evidencia\produccion\ (un archivo por ejecucion). Avisame para revisarlo." -ForegroundColor Green
} finally {
  Remove-Item Env:DATABASE_URL, Env:ADMIN_PREVIOUS_EMAIL, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD, Env:REVIEW_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:CYPRESS_REVIEW_SELLER_PASSWORD, Env:CYPRESS_REVIEW_BUYER_PASSWORD, Env:CYPRESS_REVIEW_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Set-Location $raiz
}
