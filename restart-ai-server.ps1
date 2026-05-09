$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765
$envPath = Join-Path $root ".env"

function Read-EnvValue($name) {
    if (-not (Test-Path -LiteralPath $envPath)) { return "" }
    foreach ($line in Get-Content -LiteralPath $envPath -Encoding UTF8) {
        if ($line -match "^\s*$name=(.*)$") {
            return $matches[1].Trim()
        }
    }
    return ""
}

$lines = netstat -ano | Select-String ":$port"
$pids = @()
foreach ($line in $lines) {
    $parts = ($line.ToString() -split "\s+") | Where-Object { $_ }
    if ($parts.Length -ge 5 -and $parts[1] -match ":$port$" -and $parts[3] -eq "LISTENING") {
        $pids += [int]$parts[4]
    }
}
$pids = $pids | Select-Object -Unique

foreach ($pidValue in $pids) {
    if ($pidValue -and $pidValue -ne $PID) {
        Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Milliseconds 600
Start-Process -FilePath "node" -ArgumentList (Join-Path $root "server.js") -WorkingDirectory $root -WindowStyle Hidden
Start-Sleep -Milliseconds 1200

$headers = @{}
$authUser = Read-EnvValue "PUBLIC_AUTH_USER"
$authPassword = Read-EnvValue "PUBLIC_AUTH_PASSWORD"
if ($authUser -and $authPassword) {
    $pair = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("$authUser`:$authPassword"))
    $headers.Authorization = "Basic $pair"
}

$health = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Headers $headers "http://127.0.0.1:$port/api/health"
Write-Host $health.Content
Write-Host "Open http://127.0.0.1:$port/index.html"
