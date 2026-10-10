# DSH Desktop EXDEV crash forensics (Windows PowerShell)
# 用途：判定「同目录 rename 报 EXDEV/ERROR_NOT_SAME_DEVICE」到底由什么造成
# 运行：powershell -ExecutionPolicy Bypass -File dsh-exdev-check.ps1
# 本脚本只读为主，唯一的写操作是在 storages 里建一个 probe 文件并改名，结束会清理。

$ErrorActionPreference = 'Continue'
$pkg = '53660AlanM.DSHDesktopCommunity_909n0052ampem'
$h = "$env:APPDATA\com.yeagoo.dsh-desktop\harness"
$s = "$h\storages"

Write-Host "== 0. DSH data root =="
Write-Host "   $h"
if (-not (Test-Path $h)) { Write-Host "   [WARN] path not found; adjust if the app was moved"; }
Write-Host ""

Write-Host "== 1. storages content (hidden / attributes / link targets) =="
Get-ChildItem -Force $s -ErrorAction SilentlyContinue |
    Select-Object Name, Length, Attributes, LinkType, Target | Format-Table -AutoSize
Write-Host ""

Write-Host "== 2. reparse point check (symlink / junction / placeholder) =="
foreach ($p in @($s, "$s\workspace.json")) {
    Write-Host "--- $p"
    if (Test-Path -LiteralPath $p) {
        (fsutil reparsepoint query "$p" 2>&1 | Select-Object -First 6) | ForEach-Object { Write-Host "   $_" }
    } else {
        Write-Host "   (does not exist)"
    }
}
Write-Host ""

Write-Host "== 3. minimal repro: create file in storages, then rename it =="
if (Test-Path $s) {
    $probe = Join-Path $s ("probe-" + [guid]::NewGuid().ToString('N').Substring(0,8) + ".tmp")
    $dest  = Join-Path $s ("probe-" + [guid]::NewGuid().ToString('N').Substring(0,8) + ".json")
    try {
        Set-Content -LiteralPath $probe -Value 'x' -ErrorAction Stop
        Write-Host "   create OK : $probe"
        Move-Item -LiteralPath $probe -Destination $dest -ErrorAction Stop
        Write-Host "   rename OK : same-directory rename works normally"
        Write-Host "   => the directory itself is sane; suspect workspace.json itself"
        Remove-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "   REPRO FAILED: $($_.Exception.Message)"
        Write-Host "   => the whole directory is intercepted (MSIX virtualization / filter driver)"
    }
    Remove-Item -LiteralPath $probe -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "   [SKIP] storages not found"
}
Write-Host ""

Write-Host "== 4. MSIX virtualization copy (redirected real files) =="
$vc = "$env:LOCALAPPDATA\Packages\$pkg\LocalCache\Roaming\com.yeagoo.dsh-desktop\harness\storages"
if (Test-Path $vc) {
    Write-Host "   FOUND virtualized copy: $vc"
    Get-ChildItem -Force $vc | Select-Object Name, Length | Format-Table -AutoSize
} else {
    Write-Host "   no LocalCache copy (not redirected that way)"
}
Write-Host ""

Write-Host "== 5. filter drivers (antivirus / EDR / sync clients) =="
fltmc filters
Write-Host ""

Write-Host "== 6. volume + package info =="
(fsutil fsinfo volumeinfo C: 2>&1 | Select-String -Pattern "File System|Bytes Per" ) | ForEach-Object { Write-Host "   $_" }
Get-AppxPackage 53660AlanM.DSHDesktopCommunity -ErrorAction SilentlyContinue |
    Format-List Name, PackageFullName, InstallLocation, IsDevelopmentMode
Write-Host ""
Write-Host "== done. send the whole console output back =="
