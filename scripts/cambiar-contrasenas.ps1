# Cambia en PRODUCCION las contrasenas de las cuentas de prueba (admin@, vendedor@ y comprador@lacase.test).
# Lee la DATABASE_URL del portapapeles (Render > Environment > icono de copiar) y pide las claves nuevas de forma
# oculta: no quedan en historial, repositorio ni archivos. Solo hace UPDATE de las contrasenas (upsert); no borra datos.
#
# Uso (desde la raiz del proyecto):  powershell -ExecutionPolicy Bypass -File scripts\cambiar-contrasenas.ps1

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot

function Leer-Secreto($mensaje) {
  $s = Read-Host -Prompt $mensaje -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Preparar-Url($u) {
  if ($u -notmatch ":6543/") { return $u }
  $u = $u -replace ":6543/", ":5432/"
  $partes = $u -split "\?", 2
  if ($partes.Count -lt 2) { return $u }
  $params = $partes[1] -split "&" | Where-Object { $_ -and $_ -notmatch "^(pgbouncer|connection_limit)=" }
  if ($params) { return $partes[0] + "?" + ($params -join "&") } else { return $partes[0] }
}

try {
  Write-Host "Abriendo Render. En la fila DATABASE_URL pulsa el icono de COPIAR." -ForegroundColor Cyan
  Start-Process "https://dashboard.render.com/web/srv-dasncu0473hc7393pmq0/env"
  Read-Host "Cuando la hayas copiado, pulsa Enter"
  $url = (Get-Clipboard -Raw).Trim()
  if ($url -notmatch '^postgres(ql)?://') { $url = Leer-Secreto "DATABASE_URL" }
  try { Set-Clipboard -Value " " } catch {}
  $env:DATABASE_URL = Preparar-Url $url

  $claveAdmin = Leer-Secreto "Contrasena NUEVA de admin@lacase.test (10+ caracteres, distinta de las otras)"
  $claveResto = Leer-Secreto "Contrasena NUEVA de vendedor@lacase.test y comprador@lacase.test (10+ caracteres)"
  if ($claveAdmin.Length -lt 10 -or $claveResto.Length -lt 10) { throw "Las contrasenas deben tener 10 o mas caracteres." }
  $env:ADMIN_EMAIL = "admin@lacase.test"
  $env:ADMIN_PASSWORD = $claveAdmin
  $env:REVIEW_PASSWORD = $claveResto

  Set-Location (Join-Path $raiz "backend")
  npx tsx prisma/seed-prod.ts
  if ($LASTEXITCODE -ne 0) { throw "No se pudo actualizar las contrasenas." }
  Write-Host "`nContrasenas actualizadas. Recuerda cambiarlas tambien en el entorno de Postman." -ForegroundColor Green
  # Las contrasenas guardadas para la sesion (lib-claves.ps1) ya no sirven: se borran.
  . (Join-Path $PSScriptRoot 'lib-claves.ps1'); Olvidar-Claves
} finally {
  Remove-Item Env:DATABASE_URL, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD, Env:REVIEW_PASSWORD -ErrorAction SilentlyContinue
  Set-Location $raiz
}
