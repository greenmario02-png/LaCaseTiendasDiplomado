# Crea/actualiza en PRODUCCION las cuentas de revision (*.revision@lacase.test) y rota la
# contrasena del administrador. Pide los secretos de forma oculta: no quedan en el historial,
# en el repositorio ni en ningun archivo. Es idempotente (upsert), no borra nada.
#
# Uso (desde la carpeta backend):   powershell -ExecutionPolicy Bypass -File scripts\crear-cuentas-revision.ps1

function Leer-Secreto($mensaje) {
  $s = Read-Host -Prompt $mensaje -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$env:DATABASE_URL = Leer-Secreto "DATABASE_URL de produccion (Render > servicio API > Environment)"
$env:ADMIN_EMAIL = Read-Host -Prompt "Correo del administrador de produccion (el que ya usas)"
$env:ADMIN_PASSWORD = Leer-Secreto "NUEVA contrasena del administrador (min. 10 caracteres)"
$env:REVIEW_PASSWORD = Leer-Secreto "Contrasena para vendedor.revision@ y comprador.revision@ (min. 10)"
$env:REVIEW_ADMIN_PASSWORD = Leer-Secreto "Contrasena para admin.revision@ (min. 10)"

try {
  npx tsx prisma/seed-prod.ts
} finally {
  Remove-Item Env:DATABASE_URL, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD, Env:REVIEW_PASSWORD, Env:REVIEW_ADMIN_PASSWORD -ErrorAction SilentlyContinue
}
