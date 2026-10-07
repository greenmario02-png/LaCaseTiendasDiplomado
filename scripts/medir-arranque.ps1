# Mide el tiempo de respuesta de produccion (RNF-01) y detecta el arranque en frio de Render.
# Para medir un arranque en frio de verdad, ejecutalo despues de 20 minutos sin trafico (con el monitor y la
# tarea de calentamiento apagados); en uso normal debe salir en caliente (< 2 s por peticion).
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\medir-arranque.ps1 [-Repeticiones 5]

param([int]$Repeticiones = 5)

$api = "https://lacase-diplomado-api.onrender.com/api/v1"
$front = "https://tiendaslacase.netlify.app"
$rutas = @(
  @{ Nombre = "Frontend (Netlify)"; Url = $front },
  @{ Nombre = "API /salud";          Url = "$api/salud" },
  @{ Nombre = "API /products";       Url = "$api/products?limit=12" },
  @{ Nombre = "API /categorias";     Url = "$api/products/categories" }
)

function Medir([string]$url) {
  $reloj = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 120
    $estado = [int]$r.StatusCode
  } catch {
    $estado = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
  }
  $reloj.Stop()
  return @{ Estado = $estado; Ms = [int]$reloj.ElapsedMilliseconds }
}

Write-Host "Primera peticion (si el servidor dormia, aqui se ve el arranque en frio):" -ForegroundColor Cyan
$primera = Medir "$api/salud"
"{0,-24} HTTP {1}  {2} ms {3}" -f "API /salud (1.a)", $primera.Estado, $primera.Ms, $(if ($primera.Ms -gt 8000) { "<- ARRANQUE EN FRIO" } else { "(en caliente)" })

Write-Host "`nEn caliente ($Repeticiones repeticiones por ruta):" -ForegroundColor Cyan
foreach ($ruta in $rutas) {
  $tiempos = @(); $estados = @()
  for ($i = 0; $i -lt $Repeticiones; $i++) { $m = Medir $ruta.Url; $tiempos += $m.Ms; $estados += $m.Estado }
  $orden = $tiempos | Sort-Object
  $mediana = $orden[[int][math]::Floor(($orden.Count - 1) / 2)]
  "{0,-24} HTTP {1}  mediana {2} ms  max {3} ms" -f $ruta.Nombre, (($estados | Select-Object -Unique) -join "/"), $mediana, ($orden | Select-Object -Last 1)
}
