# Prepara la base de PRODUCCION (Supabase) para el codigo nuevo, en dos pasos seguros:
#   1) Compara el esquema actual con el nuevo. Si hubiera DROP (borrado de tablas/columnas) ABORTA.
#      Si solo agrega (tablas, columnas con valor por defecto, indices) lo aplica con `prisma db push`
#      (sin --force-reset ni --accept-data-loss: Prisma se niega si algo pudiera perder datos).
#   2) Crea/actualiza las cuentas ficticias de revision (*.revision@lacase.test) y rota la contrasena
#      del administrador. Es idempotente (upsert) y no borra datos.
# Los secretos se piden de forma oculta: no quedan en historial, repositorio ni archivos.
#
# Uso (desde la carpeta backend):   powershell -ExecutionPolicy Bypass -File scripts\preparar-produccion.ps1

$ErrorActionPreference = "Stop"

function Leer-Secreto($mensaje) {
  $s = Read-Host -Prompt $mensaje -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$env:DATABASE_URL = Leer-Secreto "DATABASE_URL de produccion (Render > lacase-diplomado-api > Environment)"
$env:ADMIN_PREVIOUS_EMAIL = Read-Host -Prompt "Correo ACTUAL del administrador de produccion (ej. admin@lacase.bo)"
$env:ADMIN_EMAIL = Read-Host -Prompt "Correo NUEVO del administrador (ej. admin@lacase.test; igual al actual si no quieres cambiarlo)"
$env:ADMIN_PASSWORD = Leer-Secreto "NUEVA contrasena del administrador (min. 10 caracteres)"
$env:REVIEW_PASSWORD = Leer-Secreto "Contrasena para vendedor.revision@ y comprador.revision@ (min. 10)"
$env:REVIEW_ADMIN_PASSWORD = Leer-Secreto "Contrasena para admin.revision@ (min. 10)"

try {
  Write-Host "`n[1/3] Comparando esquema de produccion con el nuevo..."
  $sql = npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script 2>$null | Out-String
  $drops = $sql -split "`n" | Where-Object { $_ -match "DROP\s+(TABLE|COLUMN|TYPE)" -or $_ -match "ALTER TABLE .* DROP" }
  if ($drops) {
    Write-Host "ABORTADO: el cambio incluiria borrados. Revisa estas lineas y avisame:" -ForegroundColor Red
    $drops | ForEach-Object { Write-Host "  $_" }
    exit 1
  }
  $creates = ($sql -split "`n" | Where-Object { $_ -match "^(CREATE|ALTER)" }).Count
  Write-Host "Solo agrega estructura ($creates sentencias, sin borrados)."

  Write-Host "`n[2/3] Aplicando el esquema (db push, sin force-reset)..."
  npx prisma db push --skip-generate
  if ($LASTEXITCODE -ne 0) { throw "db push fallo; no se continua." }

  Write-Host "`n[3/3] Creando cuentas de revision y rotando la contrasena del admin..."
  npx tsx prisma/seed-prod.ts
  if ($LASTEXITCODE -ne 0) { throw "seed-prod fallo." }

  Write-Host "`nListo. Avisame para cambiar la rama de Render/Netlify y desplegar." -ForegroundColor Green
} finally {
  Remove-Item Env:DATABASE_URL, Env:ADMIN_PREVIOUS_EMAIL, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD, Env:REVIEW_PASSWORD, Env:REVIEW_ADMIN_PASSWORD -ErrorAction SilentlyContinue
}
