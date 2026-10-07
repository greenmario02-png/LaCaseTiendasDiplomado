# Siembra en PRODUCCION el contenido inicial de Tarija (7 tiendas de demostracion, 32 productos, 5 subastas y 17 publicaciones del foro).
# Es idempotente (se puede repetir sin duplicar) y no pide ni guarda contrasenas: las tiendas no tienen clave utilizable.
# Solo escribes la DATABASE_URL (la copias de Render > Environment); se pide oculta y no se guarda.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\sembrar-tarija.ps1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib-claves.ps1')   # Leer-Secreto
$url = (Leer-Secreto 'DATABASE_URL de produccion (Render > Environment; pegala y pulsa Enter)').Trim()
if ($url -notmatch '^postgres(ql)?://') { throw 'Eso no es una URL postgresql://' }
if ($url -match ':6543/') {   # pooler transaccional: se usa 5432 y se quitan los parametros de pgbouncer
  $url = $url -replace ':6543/', ':5432/'
  $partes = $url -split '\?', 2
  if ($partes.Count -ge 2) { $p = $partes[1] -split '&' | Where-Object { $_ -and $_ -notmatch '^(pgbouncer|connection_limit)=' }; $url = if ($p) { $partes[0] + '?' + ($p -join '&') } else { $partes[0] } }
}
$env:DATABASE_URL = $url
$env:BACKEND_URL = 'https://lacase-diplomado-api.onrender.com'
try {
  Set-Location (Join-Path (Split-Path $PSScriptRoot) 'backend')
  npm run db:seed:tarija
  if ($LASTEXITCODE -ne 0) { throw 'El seed de Tarija fallo.' }
} finally {
  Remove-Item Env:DATABASE_URL, Env:BACKEND_URL -ErrorAction SilentlyContinue
}
