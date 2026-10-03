# Prepara la base de PRODUCCION (Supabase) para el codigo nuevo:
#   0) Prueba la conexion (25 s maximo) y muestra a que host llega y que administradores existen.
#   1) Compara el esquema actual con el nuevo. Si hubiera DROP (borrado) ABORTA; si solo agrega, aplica
#      `prisma db push` (sin --force-reset ni --accept-data-loss).
#   2) Renombra/crea UNA cuenta ficticia por rol con dominio .test (admin@, vendedor@, comprador@lacase.test),
#      rota sus contrasenas y NO borra datos. Las cuentas demo .bo se renombran en su sitio.
# Los secretos se piden de forma oculta: no quedan en historial, repositorio ni archivos.
#
# Uso (desde la carpeta backend):   powershell -ExecutionPolicy Bypass -File scripts\preparar-produccion.ps1

$ErrorActionPreference = "Stop"

function Leer-Secreto($mensaje) {
  $s = Read-Host -Prompt $mensaje -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

# Ejecuta un comando con limite de tiempo y devuelve su salida (o aborta si se cuelga).
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

$url = Leer-Secreto "DATABASE_URL de produccion (Render > lacase-diplomado-api > Environment)"
# Prisma (db push / migrate diff) necesita conexion directa o Session pooler (5432), no el pooler transaccional (6543).
if ($url -match ":6543/") {
  Write-Host "Aviso: la URL usa el pooler transaccional (6543); se cambia a 5432 y se quitan parametros pgbouncer para esta operacion." -ForegroundColor Yellow
  $url = $url -replace ":6543/", ":5432/"
  $url = $url -replace "[?&]pgbouncer=true", "" -replace "[?&]connection_limit=\d+", ""
}
$env:DATABASE_URL = $url
$env:ADMIN_PREVIOUS_EMAIL = Read-Host -Prompt "Correo ACTUAL del administrador (ej. admin@lacase.bo)"
$env:ADMIN_EMAIL = Read-Host -Prompt "Correo NUEVO del administrador [admin@lacase.test]"
if (-not $env:ADMIN_EMAIL) { $env:ADMIN_EMAIL = "admin@lacase.test" }
$env:ADMIN_PASSWORD = Leer-Secreto "NUEVA contrasena del administrador (min. 10 caracteres)"
$env:REVIEW_PASSWORD = Leer-Secreto "Contrasena para vendedor@lacase.test y comprador@lacase.test (min. 10)"

try {
  Write-Host "`n[0/3] Probando la conexion..."
  npx tsx scripts/probar-conexion.ts
  if ($LASTEXITCODE -ne 0) { throw "No hay conexion con la base. Revisa la DATABASE_URL (usa la del Session pooler de Supabase si es IPv6)." }

  Write-Host "`n[1/3] Comparando esquema de produccion con el nuevo (maximo 120 s)..."
  $sql = Con-Limite 120 { npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script } "La comparacion de esquemas"
  $drops = $sql -split "`n" | Where-Object { $_ -match "DROP\s+(TABLE|COLUMN|TYPE)" -or $_ -match "ALTER TABLE .* DROP" }
  if ($drops) {
    Write-Host "ABORTADO: el cambio incluiria borrados. Revisa estas lineas y avisame:" -ForegroundColor Red
    $drops | ForEach-Object { Write-Host "  $_" }
    exit 1
  }
  $cambios = ($sql -split "`n" | Where-Object { $_ -match "^(CREATE|ALTER)" }).Count
  Write-Host "Solo agrega estructura ($cambios sentencias, sin borrados)."

  Write-Host "`n[2/3] Aplicando el esquema (db push, sin force-reset, maximo 180 s)..."
  if ($cambios -gt 0) {
    $salida = Con-Limite 180 { npx prisma db push --skip-generate } "db push"
    Write-Host $salida
  } else { Write-Host "Nada que aplicar." }

  Write-Host "`n[3/3] Renombrando/creando cuentas .test y rotando contrasenas..."
  npx tsx prisma/seed-prod.ts
  if ($LASTEXITCODE -ne 0) { throw "seed-prod fallo." }

  Write-Host "`nListo. Avisame para desplegar." -ForegroundColor Green
} finally {
  Remove-Item Env:DATABASE_URL, Env:ADMIN_PREVIOUS_EMAIL, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD, Env:REVIEW_PASSWORD -ErrorAction SilentlyContinue
}
