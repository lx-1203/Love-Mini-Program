# Lighthouse 本地性能实测脚本
# 用途：自动启动 client/admin dev server → 等待就绪 → 运行 Lighthouse → 关闭 dev server
# 使用：在仓库根目录执行 `pwsh scripts/run-lighthouse.ps1` 或 `powershell -File scripts/run-lighthouse.ps1`
# 前置：已执行 `pnpm install` 安装 @lhci/cli 与 lighthouse

$ErrorActionPreference = "Stop"
Write-Host "[Lighthouse] 启动 client dev server (http://localhost:5173)..." -ForegroundColor Cyan
$clientProc = Start-Process -FilePath "pnpm" -ArgumentList "--filter","client","dev" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 8

Write-Host "[Lighthouse] 启动 admin dev server (http://localhost:5177)..." -ForegroundColor Cyan
$adminProc = Start-Process -FilePath "pnpm" -ArgumentList "--filter","admin","dev" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 8

try {
  Write-Host "[Lighthouse] 运行 client 端 Lighthouse 分析..." -ForegroundColor Cyan
  pnpm lighthouse:client
  Write-Host "[Lighthouse] 运行 admin 端 Lighthouse 分析..." -ForegroundColor Cyan
  pnpm lighthouse:admin
  Write-Host "[Lighthouse] 报告已生成至 ./test-screenshots/lighthouse-*.html" -ForegroundColor Green
} finally {
  Write-Host "[Lighthouse] 关闭 dev server..." -ForegroundColor Cyan
  Stop-Process -Id $clientProc.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $adminProc.Id -Force -ErrorAction SilentlyContinue
}
