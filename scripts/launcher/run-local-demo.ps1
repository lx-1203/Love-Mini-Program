# ============================================================
# run-local-demo.ps1 — 本地 mock 全链路一键跑通（2026-08-26 新增）
# ------------------------------------------------------------
# 流程：准备静态资源 → 释放 8080 → 启动 mock 后端 → 等 health UP
#       → 构建小程序（mock 模式）→ 功能指纹自检 → 打印 DevTools 指引
# 用法：powershell -ExecutionPolicy Bypass -File .\run-local-demo.ps1
#       追加 -NoBuild 仅起后端不构建
# 注意：会强制结束 8080 端口上的旧进程（本地联调环境）。请先确认无其他服务占用。
# ============================================================
param([switch]$NoBuild)

$ErrorActionPreference = "Stop"
$Root = "D:\6\恋爱小程序"
$ApiDir = "$Root\apps\api"
$ClientDir = "$Root\apps\client"
$OutLog = "$ApiDir\mock-backend.log"
$ErrLog = "$ApiDir\mock-backend.err.log"

Write-Host "========== 校园恋爱 · 本地 mock 全链路 ==========" -ForegroundColor Cyan

# ---------- [1/4] 恢复本地静态资源（用 PowerShell 复制，规避部分机器 node cpSync 原生崩溃） ----------
Write-Host "[1/4] 准备本地静态资源..."
Copy-Item "$ClientDir\static-local-backup\generated" "$ClientDir\src\static\generated" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$ClientDir\static-local-backup\assets-images" "$ClientDir\src\static\assets\images" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "      静态资源已就绪"

# ---------- [2/4] 释放 8080 端口 ----------
Write-Host "[2/4] 检查 8080 端口占用..."
$conn = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    Write-Host ("      释放旧进程: pid={0} name={1}（由 {2} 启动）" -f $conn.OwningProcess, $proc.ProcessName, $proc.StartTime) -ForegroundColor Yellow
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# ---------- [3/4] 启动 mock 后端（后台）并等待就绪 ----------
Write-Host "[3/4] 启动 mock 后端（日志: apps/api/mock-backend.log）..."
Start-Process powershell -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
    "$ApiDir\start-api-mock.ps1"
) -RedirectStandardOutput $OutLog -RedirectStandardError $ErrLog

$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 3
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8080/actuator/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch {
        # 未就绪，继续轮询
    }
}
if (-not $ready) {
    Write-Host "[ERROR] 后端 180s 内未就绪，请查看日志:" -ForegroundColor Red
    Write-Host "       $OutLog" -ForegroundColor Red
    Get-Content $OutLog -Tail 30 -ErrorAction SilentlyContinue
    exit 1
}
Write-Host "      后端已就绪（/actuator/health = UP）" -ForegroundColor Green

# ---------- [4/4] 构建小程序（mock 模式）+ 指纹自检 ----------
if ($NoBuild) {
    Write-Host "[4/4] 已跳过构建（-NoBuild）"
} else {
    Write-Host "[4/4] 构建小程序（mock 模式）并自检..."
    Push-Location $ClientDir
    try {
        & ".\node_modules\.bin\uni.CMD" build --platform mp-weixin --mode mp-weixin-mock
        if ($LASTEXITCODE -ne 0) { throw "uni build 失败 (exit $LASTEXITCODE)" }
        node ".\scripts\verify-build-features.mjs"
        if ($LASTEXITCODE -ne 0) { throw "产物功能指纹自检未通过" }
    } finally {
        Pop-Location
    }
}

# ---------- 完成 & DevTools 指引 ----------
Write-Host ""
Write-Host "========== 完成！下一步（微信开发者工具） ==========" -ForegroundColor Cyan
Write-Host "1. 打开微信开发者工具 → 项目目录: $Root（miniprogramRoot 已指向 apps/client/dist/build/mp-weixin）"
Write-Host "2. 工具栏「清缓存 → 清除全部缓存」→ 点击「编译」"
Write-Host "3. 登录页点「临时体验号 / DEV」进入登录态，验证："
Write-Host "   - 寻觅-推荐：左右滑卡、喜欢/跳过"
Write-Host "   - 寻觅-附近：页内卡片按距离近→远"
Write-Host "   - 首页 / 附近 tab / 我的-安全中心（账号绑定区块）"
Write-Host "   - 有真实后端需求时改跑: apps/api/start-api-fixed.ps1（需 MySQL/Redis，见方案 §2.1）"
Write-Host ""