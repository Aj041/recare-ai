$ErrorActionPreference = 'Stop'

$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceDir = Split-Path -Parent $backendDir
$sharedPython = 'C:\Users\sukru\recare-ai\backend\venv\Scripts\python.exe'
$localPython = Join-Path $backendDir 'venv\Scripts\python.exe'
$python = if (Test-Path $localPython) { $localPython } elseif (Test-Path $sharedPython) { $sharedPython } else { 'python' }
$port = 8002

# Prefer the backend .env for this local launcher, clearing only an invalid
# inherited override so python-dotenv can load the configured file value.
if ($env:JWT_SECRET_KEY -and (
    $env:JWT_SECRET_KEY.Length -lt 32 -or
    $env:JWT_SECRET_KEY -match 'replace_with|placeholder|your_'
)) {
    Remove-Item Env:JWT_SECRET_KEY
}

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    throw "Port $port is already in use (PID $($listener[0].OwningProcess)). No process was stopped."
}

Push-Location $backendDir
try {
    & $python -m services.local_setup
    if ($LASTEXITCODE -ne 0) { throw 'Local backend setup failed.' }
    & $python -m uvicorn main:app --reload --host 127.0.0.1 --port $port
    if ($LASTEXITCODE -ne 0) { throw 'Uvicorn exited with an error.' }
}
finally {
    Pop-Location
}
