# LBA3 automatic laptop benchmark (Windows). Runs from Task Scheduler every 30 minutes.
# When a new build is on the releases page, and the laptop is idle and plugged in (or on battery, if allowed), it:
#   downloads that build's portable zip (the installed game is left alone), runs the full benchmark in it,
#   saves the report to docs/lba3-performance/results/ and pushes it to the branch.
# Setup and the scheduled task: lba3/docs/LOCAL_SESSION.he.md, "בנצ'מרק אוטומטי".
#
#   powershell -ExecutionPolicy Bypass -File autobench.ps1 [-Force] [-AllowBattery] [-Mode full|auto|sweep]
param(
  [switch]$Force,          # run even if this build was already measured, and even if the laptop isn't idle
  [switch]$AllowBattery,   # also measure on battery (otherwise only plugged in)
  [string]$Mode = 'full'
)
$ErrorActionPreference = 'Stop'

# --- where things are (change REPO if the clone lives elsewhere)
$REPO   = Join-Path $env:USERPROFILE 'D.KGITHIB'
$BRANCH = 'ccr-adf00ea7-37ebl3'
$WORK   = Join-Path $env:LOCALAPPDATA 'LBA3-bench'      # outside the repo: Playwright, the builds, the bench profile
$API    = 'https://api.github.com/repos/dankaplan96-cyber/D.KGITHIB/releases?per_page=5'
$IDLE_MIN = 10                                           # minutes without keyboard/mouse before a run starts

New-Item -ItemType Directory -Force -Path $WORK | Out-Null
$LOG = Join-Path $WORK 'autobench.log'
function Log($m) { $line = "$(Get-Date -Format s)  $m"; Add-Content -Path $LOG -Value $line; Write-Host $line }

# --- one run at a time
$LOCK = Join-Path $WORK 'running.lock'
if ((Test-Path $LOCK) -and ((Get-Date) - (Get-Item $LOCK).LastWriteTime).TotalHours -lt 3) { Log 'another run is in progress: skip'; exit 0 }
Set-Content $LOCK $PID
try {
  # --- power and idle
  $bat = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
  $power = if ($bat -and $bat.BatteryStatus -eq 1) { 'battery' } else { 'plugged' }
  if ($power -eq 'battery' -and -not $AllowBattery) { Log 'on battery and -AllowBattery not given: skip'; exit 0 }
  Add-Type @'
using System; using System.Runtime.InteropServices;
public static class Idle {
  [StructLayout(LayoutKind.Sequential)] struct LII { public uint cbSize; public uint dwTime; }
  [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LII p);
  public static uint Ms() { var i = new LII(); i.cbSize = (uint)Marshal.SizeOf(i); GetLastInputInfo(ref i); return (uint)Environment.TickCount - i.dwTime; }
}
'@
  $idleMin = [Idle]::Ms() / 60000
  if (-not $Force -and $idleMin -lt $IDLE_MIN) { Log ("not idle ({0:N0} min): skip" -f $idleMin); exit 0 }
  if (-not $Force -and (Get-Process -Name 'LBA3 The Awakening' -ErrorAction SilentlyContinue)) { Log 'the game is open: skip'; exit 0 }

  # --- the newest build on the releases page
  $rel = (Invoke-RestMethod -Uri $API -Headers @{ 'User-Agent' = 'lba3-autobench' }) | Where-Object { $_.assets | Where-Object { $_.name -like '*-win.zip' } } | Select-Object -First 1
  if (-not $rel) { Log 'no release with a Windows zip found'; exit 0 }
  $asset = $rel.assets | Where-Object { $_.name -like '*-win.zip' } | Select-Object -First 1
  $ver = ($asset.name -replace '^LBA3-The-Awakening-', '' -replace '-win\.zip$', '')
  $doneFile = Join-Path $WORK "done-$ver-$Mode-$power.txt"
  if ((Test-Path $doneFile) -and -not $Force) { Log "$ver ($Mode, $power) already measured: nothing to do"; exit 0 }
  Log "new build $ver ($($rel.tag_name)): measuring $Mode on $power"

  # --- the build itself: its portable zip, unpacked next to the others (the installed game is not touched)
  $appDir = Join-Path $WORK "app-$ver"
  if (-not (Test-Path (Join-Path $appDir 'LBA3 The Awakening.exe'))) {
    $zip = Join-Path $WORK $asset.name
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $appDir -Force
    Remove-Item $zip
  }
  $exe = Get-ChildItem -Path $appDir -Recurse -Filter 'LBA3 The Awakening.exe' | Select-Object -First 1
  if (-not $exe) { throw "no LBA3 The Awakening.exe inside $($asset.name)" }

  # --- the runner and Playwright (once), and the newest runner from the branch
  Push-Location $REPO
  git fetch origin $BRANCH 2>&1 | Out-Null
  git checkout $BRANCH 2>&1 | Out-Null
  git pull --ff-only origin $BRANCH 2>&1 | Out-Null
  Pop-Location
  $runDir = Join-Path $WORK 'runner'
  New-Item -ItemType Directory -Force -Path $runDir | Out-Null
  Copy-Item (Join-Path $REPO 'lba3\docs\lba3-performance\local\*.mjs') $runDir -Force
  if (-not (Test-Path (Join-Path $runDir 'node_modules\playwright'))) {
    Push-Location $runDir; npm init -y | Out-Null; npm i playwright | Out-Null; Pop-Location
  }

  # --- measure
  $name = "laptop-$ver-$Mode-orbit-$power-auto.txt"
  $out = Join-Path $runDir $name
  Push-Location $runDir
  $env:LBA3_EXE = $exe.FullName
  node electron-bench.mjs $Mode $out $power orbit 2>&1 | Tee-Object -FilePath (Join-Path $WORK "last-run.txt") | Out-Null
  Pop-Location
  if (-not (Test-Path $out)) { throw "the benchmark wrote no report ($name); see last-run.txt" }

  # --- push the report
  $dest = Join-Path $REPO "lba3\docs\lba3-performance\results\$name"
  Copy-Item $out $dest -Force
  Push-Location $REPO
  git add -- "lba3/docs/lba3-performance/results/$name"
  git commit -m "Laptop benchmark (automatic): $ver $Mode on $power" -m "Co-Authored-By: Claude <noreply@anthropic.com>" | Out-Null
  $pushed = $false
  foreach ($wait in 0, 2, 4, 8, 16) { Start-Sleep -Seconds $wait; git push origin $BRANCH 2>&1 | Out-Null; if ($LASTEXITCODE -eq 0) { $pushed = $true; break }; git pull --rebase origin $BRANCH 2>&1 | Out-Null }
  Pop-Location
  if (-not $pushed) { throw 'push failed 5 times (the report is committed locally)' }
  Set-Content $doneFile (Get-Date -Format s)
  Log "done: $name pushed"

  # --- keep only the two newest builds on disk
  Get-ChildItem $WORK -Directory -Filter 'app-*' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 2 | Remove-Item -Recurse -Force
}
catch { Log "ERROR: $($_.Exception.Message)"; exit 1 }
finally { Remove-Item $LOCK -ErrorAction SilentlyContinue }
