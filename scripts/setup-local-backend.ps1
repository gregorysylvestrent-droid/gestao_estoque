param(
  [string]$Ec2FrontendUrl = "http://3.83.164.82",
  [switch]$StartBackend = $false
)

$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  Invoke-Expression $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao executar: $Command (exit code $LASTEXITCODE)"
  }
}

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "api-backend"
$backendEnvPath = Join-Path $backendDir ".env"
$backendTemplatePath = Join-Path $backendDir ".env.local.postgres.example"
$frontendEnvPath = Join-Path $root ".env.local"
$frontendTemplatePath = Join-Path $root ".env.local.example"

if (-not (Test-Path $backendTemplatePath)) {
  throw "Template nao encontrado: $backendTemplatePath"
}

if (-not (Test-Path $backendEnvPath)) {
  Copy-Item $backendTemplatePath $backendEnvPath -Force
  Write-Host "Criado $backendEnvPath a partir de $backendTemplatePath"
} else {
  Write-Host "$backendEnvPath ja existe. Mantendo arquivo atual."
}

if ((Test-Path $frontendTemplatePath) -and (-not (Test-Path $frontendEnvPath))) {
  Copy-Item $frontendTemplatePath $frontendEnvPath -Force
  Write-Host "Criado $frontendEnvPath a partir de $frontendTemplatePath"
}

$lines = Get-Content $backendEnvPath
$origins = @()
$filteredLines = @()
foreach ($line in $lines) {
  if ($line -like "CORS_ORIGIN=*") {
    $value = $line.Substring("CORS_ORIGIN=".Length)
    $origins += $value.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    continue
  }
  $filteredLines += $line
}

if ($origins -notcontains "http://localhost:3000") { $origins += "http://localhost:3000" }
if ($origins -notcontains $Ec2FrontendUrl) { $origins += $Ec2FrontendUrl }

$filteredLines += ("CORS_ORIGIN=" + (($origins | Select-Object -Unique) -join ","))
Set-Content -Path $backendEnvPath -Value ($filteredLines -join "`n") -Encoding UTF8

Push-Location $root
try {
  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($dockerCmd) {
    Write-Host "Subindo PostgreSQL local (docker compose)..."
    Invoke-CheckedCommand "docker compose up -d db"
  } else {
    Write-Warning "Docker nao encontrado. Suba o PostgreSQL manualmente e depois rode db:health/db:migrate."
  }

  Write-Host "Instalando dependencias do backend..."
  Invoke-CheckedCommand "npm --prefix api-backend ci"

  $dbReady = $true
  try {
    Write-Host "Validando conexao com banco local..."
    Invoke-CheckedCommand "npm --prefix api-backend run db:health"
  }
  catch {
    $dbReady = $false
    Write-Warning "Falha ao conectar no PostgreSQL local. Verifique DB_HOST/DB_PORT e se o servico esta ativo."
  }

  if ($dbReady) {
    Write-Host "Aplicando migracao local..."
    Invoke-CheckedCommand "npm --prefix api-backend run db:migrate"
  } else {
    Write-Warning "Migracao nao aplicada porque o banco local nao esta acessivel."
  }

  if ($StartBackend) {
    Write-Host "Iniciando backend local em modo desenvolvimento..."
    Invoke-CheckedCommand "npm --prefix api-backend run dev"
  } else {
    Write-Host "Backend local preparado. Para iniciar: npm --prefix api-backend run dev"
  }
}
finally {
  Pop-Location
}
