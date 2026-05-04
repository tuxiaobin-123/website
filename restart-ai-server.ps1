$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765

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

$health = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "http://127.0.0.1:$port/api/health"
Write-Host $health.Content
Write-Host "Open http://127.0.0.1:$port/index.html"
