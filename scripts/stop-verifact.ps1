$ErrorActionPreference = 'SilentlyContinue'

$ports = @(5173, 5000, 8000)

foreach ($port in $ports) {
  $lines = & "$env:SystemRoot\System32\netstat.exe" -ano | Select-String ":$port"
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
    Stop-Process -Id $procId -Force
  }
}

Write-Output 'Verifact local services stopped.'
