$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = Get-Command node -ErrorAction Stop

Write-Host "Starting local AI coach server..."
Write-Host "Root: $root"
Write-Host "URL:  http://127.0.0.1:8765/index.html"

& $node.Source (Join-Path $root "server.js")
