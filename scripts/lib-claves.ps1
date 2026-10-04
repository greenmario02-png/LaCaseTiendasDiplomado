# Contrasenas de las cuentas ficticias de prueba: se piden UNA sola vez y se reutilizan en todos los scripts (produccion.ps1,
# iniciar-sesion-capturas.ps1, iniciar-sesion-movil.ps1). Uso interno: se carga con  . "$PSScriptRoot\lib-claves.ps1"
#
# Donde se guardan: en un archivo FUERA del repositorio (%LOCALAPPDATA%\LaCaseE3\sesion-claves.json), cifradas con la proteccion de
# datos de Windows (DPAPI): solo tu usuario de Windows, en este equipo, puede descifrarlas. Vencen a las 8 horas y se pueden
# borrar antes con  scripts\produccion.ps1 -Olvidar . scripts\cambiar-contrasenas.ps1 las borra al terminar (las contrasenas cambian).
# Nunca van al repositorio, al documento, a las capturas ni a los reportes.

$script:ArchivoClaves = Join-Path $env:LOCALAPPDATA 'LaCaseE3\sesion-claves.json'
$script:HorasValidez = 8

function Leer-Secreto($mensaje) {
  $s = Read-Host -Prompt $mensaje -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Descifrar-Clave($cifrada) {
  $s = ConvertTo-SecureString $cifrada
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Cifrar-Clave($plano) {
  ConvertFrom-SecureString (ConvertTo-SecureString $plano -AsPlainText -Force)
}

function Olvidar-Claves {
  if (Test-Path $script:ArchivoClaves) { Remove-Item $script:ArchivoClaves -Force }
  Write-Host 'Contrasenas guardadas borradas.' -ForegroundColor Green
}

# Devuelve @{ Admin = ...; Resto = ... } (Resto = vendedor y comprador). Solo vive en memoria mientras se usa.
function Obtener-Claves([switch]$Nuevas) {
  if (-not $Nuevas -and (Test-Path $script:ArchivoClaves)) {
    try {
      $d = Get-Content $script:ArchivoClaves -Raw -Encoding UTF8 | ConvertFrom-Json
      $vence = [datetime]::Parse($d.vence, [Globalization.CultureInfo]::InvariantCulture)
      if ((Get-Date) -lt $vence) {
        Write-Host ('Usando las contrasenas guardadas para esta sesion (validas hasta las ' + $vence.ToString('HH:mm') + '; scripts\produccion.ps1 -Olvidar las borra, -NuevasClaves las cambia).') -ForegroundColor DarkGray
        return @{ Admin = (Descifrar-Clave $d.admin); Resto = (Descifrar-Clave $d.resto) }
      }
    } catch { Write-Host 'Las contrasenas guardadas no se pudieron leer; se piden de nuevo.' -ForegroundColor Yellow }
  }
  $admin = Leer-Secreto 'Contrasena de admin@lacase.test'
  $resto = Leer-Secreto 'Contrasena de vendedor@lacase.test y comprador@lacase.test'
  if ($admin.Length -lt 10 -or $resto.Length -lt 10) { throw 'Las contrasenas deben tener 10 o mas caracteres.' }
  New-Item -ItemType Directory -Force -Path (Split-Path $script:ArchivoClaves) | Out-Null
  $vence = (Get-Date).AddHours($script:HorasValidez)
  @{ vence = $vence.ToString('o'); admin = (Cifrar-Clave $admin); resto = (Cifrar-Clave $resto) } | ConvertTo-Json | Set-Content -Path $script:ArchivoClaves -Encoding UTF8
  Write-Host ('Contrasenas guardadas cifradas (solo tu usuario de Windows puede leerlas) hasta las ' + $vence.ToString('HH:mm') + '. No se te volveran a pedir en esta sesion.') -ForegroundColor DarkGray
  return @{ Admin = $admin; Resto = $resto }
}
