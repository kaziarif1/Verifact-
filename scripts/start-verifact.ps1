$ErrorActionPreference = 'Stop'

$root = 'H:\web project\verifact FINAL v3\verifact'
$ports = @(5173, 5000, 8000)
$python = 'C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'

if (Test-Path Env:PATH) {
  $env:Path = $env:PATH
  Remove-Item Env:PATH -ErrorAction SilentlyContinue
}

function Stop-PortProcess {
  param([int]$Port)

  $lines = & "$env:SystemRoot\System32\netstat.exe" -ano | Select-String ":$Port"
  $pids = @()

  foreach ($line in $lines) {
    $parts = ($line.ToString() -split '\s+') | Where-Object { $_ }
    if ($parts.Length -ge 5) {
      $procId = $parts[-1]
      if ($procId -match '^\d+$') {
        $pids += [int]$procId
      }
    }
  }

  $pids = $pids | Sort-Object -Unique
  foreach ($procId in $pids) {
    try { Stop-Process -Id $procId -Force -ErrorAction Stop } catch {}
  }
}

foreach ($port in $ports) {
  Stop-PortProcess -Port $port
}

$backendOut = Join-Path $root 'backend\backend-dev.out.log'
$backendErr = Join-Path $root 'backend\backend-dev.err.log'
$frontendOut = Join-Path $root 'frontend\frontend-dev.out.log'
$frontendErr = Join-Path $root 'frontend\frontend-dev.err.log'
$mlOut = Join-Path $root 'ml-service\ml-dev.out.log'
$mlErr = Join-Path $root 'ml-service\ml-dev.err.log'

Start-Process -FilePath 'cmd.exe' `
  -ArgumentList @('/c', 'node', '-r', 'ts-node/register/transpile-only', 'src/server.ts') `
  -WorkingDirectory (Join-Path $root 'backend') `
  -RedirectStandardOutput $backendOut `
  -RedirectStandardError $backendErr

Start-Process -FilePath 'cmd.exe' `
  -ArgumentList @('/c', 'npm', 'run', 'dev', '--', '--host', '127.0.0.1') `
  -WorkingDirectory (Join-Path $root 'frontend') `
  -RedirectStandardOutput $frontendOut `
  -RedirectStandardError $frontendErr

Start-Process -FilePath $python `
  -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000') `
  -WorkingDirectory (Join-Path $root 'ml-service') `
  -RedirectStandardOutput $mlOut `
  -RedirectStandardError $mlErr

Start-Sleep -Seconds 8

Write-Output 'Verifact local services started.'
Write-Output 'Frontend: http://127.0.0.1:5173'
Write-Output 'Backend:  http://127.0.0.1:5000'
Write-Output 'ML:       http://127.0.0.1:8000'
