# Compila la APK release de la app móvil desde una copia en una ruta corta (C:\lc).
# Motivo: la ruta del proyecto ("D:\Tienda\Monografia LaCase Multitiendas (3 Roles)\mobile") supera el límite de 250 caracteres de
# CMake/Ninja al compilar los módulos nativos (react-native-screens, safe-area-context) y la compilación falla con "Filename too long".
# La API sale de EXPO_PUBLIC_API_URL (producción). No modifica el proyecto original.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\compilar-apk-ruta-corta.ps1
$ErrorActionPreference = 'Stop'
$origen = Join-Path (Split-Path $PSScriptRoot) 'mobile'
$destino = 'C:\lc'
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:EXPO_PUBLIC_API_URL = 'https://lacase-diplomado-api.onrender.com/api'
$env:NODE_ENV = 'production'

Write-Host "Copiando el proyecto a $destino (sin carpetas de compilación)..."
robocopy $origen $destino /MIR /MT:16 /NFL /NDL /NJH /NJS /NP /XD "$origen\android\build" "$origen\android\.cxx" "$origen\android\app\build" "$origen\android\app\.cxx" "$origen\android\.gradle" | Out-Null
"local.properties" | Out-Null
Set-Content -Path (Join-Path $destino 'android\local.properties') -Value ("sdk.dir=" + ($env:ANDROID_HOME -replace '\\', '/')) -Encoding ASCII

Set-Location (Join-Path $destino 'android')
Write-Host "Compilando (puede tardar 15-25 min)..."
$ErrorActionPreference = 'Continue'   # Gradle escribe avisos en stderr: no deben cortar el script
& .\gradlew.bat assembleRelease --no-daemon -x lint 2>&1 | Tee-Object -FilePath (Join-Path $destino 'build-corta.log') | Select-Object -Last 25
$ErrorActionPreference = 'Stop'
$apk = Join-Path $destino 'android\app\build\outputs\apk\release\app-release.apk'
if (Test-Path $apk) { Write-Host "APK generada: $apk ($([int]((Get-Item $apk).Length / 1MB)) MB)" } else { Write-Host "No se generó la APK; revisa C:\lc\build-corta.log"; exit 1 }
