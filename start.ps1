$nodeCandidates = @(
  (Join-Path $env:ProgramFiles "nodejs\node.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe"),
  (Join-Path $env:LOCALAPPDATA "Programs\cursor\resources\app\resources\helpers\node.exe")
)

$node = $nodeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $node) {
  Write-Error "Node.js not found. Install from https://nodejs.org or run: winget install OpenJS.NodeJS.LTS"
  exit 1
}

Set-Location $PSScriptRoot
Write-Host "Starting Flow Inventory at http://localhost:3000"
Write-Host "Using: $node"
& $node server.js
