param()

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$transferScript = Join-Path $root "transfer-data.sh"

if (-not (Test-Path $transferScript)) {
  throw "Script nao encontrado: $transferScript"
}

$bashCmd = Get-Command bash -ErrorAction SilentlyContinue
$bashPath = $null
if ($bashCmd) {
  $bashPath = $bashCmd.Source
} else {
  $gitBash = "C:\Program Files\Git\bin\bash.exe"
  if (Test-Path $gitBash) {
    $bashPath = $gitBash
  }
}

if (-not $bashPath) {
  throw "Bash nao encontrado. Instale Git for Windows ou adicione bash ao PATH."
}

$rootUnix = $root -replace '\\', '/'
$command = "cd `"$rootUnix`" && ./transfer-data.sh"

& $bashPath --login -c $command
if ($LASTEXITCODE -ne 0) {
  throw "transfer-data.sh terminou com erro (exit code $LASTEXITCODE)."
}

