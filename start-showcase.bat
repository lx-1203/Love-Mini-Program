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

REM ---------- Node 版本闸（先于 Step 1，PATH node=v16 会把构建链崩成假红） ----------
REM ① 已设置 NODE22_DIR 时把它前置到 PATH（延迟展开：块内不能用百分号，否则未定义时也会执行 set）
if defined NODE22_DIR (
    echo   检测到 NODE22_DIR=!NODE22_DIR!，已前置到 PATH
    set "PATH=!NODE22_DIR!;!PATH!"
)
REM ② node -v 探测主版本，低于 20 直接拦下，不给假红机会
set "NODE_VERSION="
for /f "delims=" %%v in ('node -v 2^>nul') do set "NODE_VERSION=%%v"
set "NODE_MAJOR="
if defined NODE_VERSION for /f "tokens=1 delims=v." %%a in ("%NODE_VERSION%") do set "NODE_MAJOR=%%a"
REM 注意：管道两侧由子 cmd 执行，不继承 setlocal enabledelayedexpansion，此处必须用百分号展开
echo %NODE_MAJOR%| findstr /r "^[0-9][0-9]*$" >nul
if errorlevel 1 (
    echo [ERROR] 未找到可用的 node（node -v 探测失败），要求 Node 主版本不小于 20。
    echo   修复路径一：安装或升级 Node.js 到 20 或更高版本后重跑本脚本；
    echo   修复路径二：已装有 Node 20+ 时，先执行 set NODE22_DIR=该Node安装目录 再重跑，本脚本会自动把它前置到 PATH。
    exit /b 1
)
if !NODE_MAJOR! LSS 20 (
    echo [ERROR] PATH 上的 Node 版本过低：!NODE_VERSION!，要求 Node 主版本不小于 20。
    echo   修复路径一：升级 Node.js 到 20 或更高版本后重跑本脚本；
    echo   修复路径二：先执行 set NODE22_DIR=你的 Node 20+ 安装目录 再重跑，本脚本会自动把它前置到 PATH。
    exit /b 1
)
echo   Node 版本检查通过：%NODE_VERSION%
echo.

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

REM 走 isolated 出口：build:mp-weixin:showcase 不带 UNI_OUTPUT_DIR，会把展示包
REM 直接写进 dist\build\mp-weixin（那是 mock 证据档），把 mock 档覆盖成
REM VITE_API_MODE=real / SHOWCASE_MODE=true。这个坑上一轮就记过
REM （scripts/qa/ui-queue.round7-carryover.json:7："22:23 那次跑它，mock 档的
REM config/env.js 当场变成 VITE_API_MODE=real"），现在两侧都被门拦住，故改走 :isolated。
call pnpm run build:mp-weixin:showcase:isolated
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
REM 导入的是 showcase 自己的目录，不是共享的 mp-weixin（后者是 mock 证据档，
REM 拿它当展示包导入会让 DevTools 与 QA 腿互相污染）。
echo 输出目录: %~dp0apps\client\dist\build\mp-weixin-showcase
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
