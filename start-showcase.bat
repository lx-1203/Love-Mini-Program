@echo off
REM ============================================================
REM 校园恋爱 - 全功能展示版（Showcase）启动脚本
REM ============================================================
REM 说明：
REM   - 先以 mock profile 启动后端（真实 HTTP + 内存数据 + 免认证）
REM   - 再以 showcase mode 构建微信小程序展示包
REM   - 展示包独立开关 VITE_SHOWCASE_MODE=true：全部功能开关置 true、
REM     路由守卫旁路、VIP 全亮，方便自用/演示
REM   - 正式包不受影响（无开关时功能默认隐藏）
REM ============================================================

setlocal enabledelayedexpansion

REM 切换到 UTF-8 代码页，确保中文输出正常
chcp 65001 >nul

echo ========================================
echo   校园恋爱 - 全功能展示版构建
echo ========================================
echo.

REM ---------- Step 1: 启动后端 mock ----------
echo [1/3] 启动后端 mock（真实 HTTP + 内存数据 + 免认证）...
echo   将在新窗口启动，请勿关闭；看到 "Started" 后继续
start "campus-love-api-mock" cmd /k "cd /d %~dp0 && pnpm api:dev"
echo.
echo   提示：若后端端口 8080 已被占用，请先关闭旧进程再继续。
echo.

REM ---------- Step 2: 构建展示包 ----------
echo [2/3] 构建微信小程序展示包（showcase mode）...
cd /d "%~dp0apps\client"
if errorlevel 1 (
    echo [ERROR] 无法切换到 apps\client 目录
    exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 未找到 pnpm，请先安装：npm install -g pnpm
    exit /b 1
)

call pnpm run build:mp-weixin:showcase
if errorlevel 1 (
    echo [ERROR] 展示包编译失败，请查看上方错误信息
    exit /b 1
)
echo.
echo [3/3] 展示包编译成功！
echo.

REM ---------- 收尾：提示导入 ----------
echo ========================================
echo   全功能展示版构建成功！
echo ========================================
echo.
echo 输出目录: %~dp0apps\client\dist\build\mp-weixin
echo.
echo 下一步：
echo   1. 打开微信开发者工具
echo   2. 导入上述输出目录
echo   3. 勾选「不校验合法域名」（本地 http://127.0.0.1:8080）
echo   4. 登录页或我的页点击「全功能展示」即可进入
echo.

echo %CMDCMDLINE% | findstr /i "%~nx0" >nul && pause

endlocal
exit /b 0
