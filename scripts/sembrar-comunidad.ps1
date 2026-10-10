# Siembra en PRODUCCION 6 vendedores (con tienda y productos), 4 compradores y 8 subastas de 30 dias (cuentas de ejemplo, sin marca de prueba).
# Es idempotente (se puede repetir sin duplicar). Pide DOS datos, ocultos y sin guardarlos:
#   1) la DATABASE_URL de produccion (Render > Environment) y 2) la contrasena que tendran las 10 cuentas (minimo 10 caracteres).
# Solo se guarda su hash en la base; la contrasena no se escribe en ningun archivo ni en el historial.
# Uso:  powershell -ExecutionPolicy Bypass -File "D:\Tienda\Monografia LaCase Multitiendas (3 Roles)\scripts\sembrar-comunidad.ps1"
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib-claves.ps1')   # Leer-Secreto
$url = (Leer-Secreto 'DATABASE_URL de produccion (Render > Environment; pegala y pulsa Enter)').Trim()
if ($url -notmatch '^postgres(ql)?://') { throw 'Eso no es una URL postgresql://' }
if ($url -match ':6543/') {   # pooler transaccional: se usa 5432 y se quitan los parametros de pgbouncer
  $url = $url -replace ':6543/', ':5432/'
  $partes = $url -split '\?', 2
  if ($partes.Count -ge 2) { $p = $partes[1] -split '&' | Where-Object { $_ -and $_ -notmatch '^(pgbouncer|connection_limit)=' }; $url = if ($p) { $partes[0] + '?' + ($p -join '&') } else { $partes[0] } }
}
$clave = Leer-Secreto 'Contrasena para las 10 cuentas de ejemplo (minimo 10 caracteres)'
$otra = Leer-Secreto 'Repite la contrasena'
if ($clave -ne $otra -or $clave.Length -lt 10) { throw 'Las contrasenas no coinciden o tienen menos de 10 caracteres.' }
$env:DATABASE_URL = $url
$env:BACKEND_URL = 'https://lacase-diplomado-api.onrender.com'
$env:COMUNIDAD_PASSWORD = $clave
try {
  Set-Location (Join-Path (Split-Path $PSScriptRoot) 'backend')
  npm run db:seed:comunidad
  if ($LASTEXITCODE -ne 0) { throw 'El seed de la comunidad fallo.' }
} finally {
  Remove-Item Env:DATABASE_URL, Env:BACKEND_URL, Env:COMUNIDAD_PASSWORD -ErrorAction SilentlyContinue
  $clave = $null; $otra = $null; $url = $null
}
