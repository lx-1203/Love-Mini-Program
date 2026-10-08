@echo off
REM ============================================================
REM 校园恋爱 - 微信小程序编译脚本（Task 8.4.4）
REM ============================================================
REM 改造说明：
REM   - 包管理器从 npm 改为 pnpm（与 CI/CD、monorepo 根 package.json 对齐）
REM   - 添加 setlocal enabledelayedexpansion 与 errorlevel 检查
REM   - 任意步骤失败时立即退出，避免误报"编译完成"
REM   - 支持注入 wx-appid（如设置环境变量 WX_APPID，则自动注入到 manifest.json）
REM ============================================================

setlocal enabledelayedexpansion

REM 切换到 UTF-8 代码页，确保中文输出正常
chcp 65001 >nul
if errorlevel 1 (
    echo [WARN] 切换 UTF-8 代码页失败，可能影响中文显示
)

echo ========================================
echo   校园恋爱 - 微信小程序编译
echo ========================================
echo.

REM 切换到 client 工作目录（脚本相对路径解析）
cd /d "%~dp0apps\client"
if errorlevel 1 (
    echo [ERROR] 无法切换到 apps\client 目录
    exit /b 1
)

REM ---------- Step 0: Node 版本闸（先于 Step 1，PATH node=v16 会把构建链崩成假红） ----------
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
echo   Node 版本检查通过：!NODE_VERSION!
echo.

REM ---------- Step 1: 检查 pnpm 是否可用 ----------
echo [1/4] 检查 pnpm...
where pnpm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 未找到 pnpm，请先安装：
    echo   npm install -g pnpm@9
    echo   或参考 https://pnpm.io/installation
    exit /b 1
)
echo   pnpm 已安装
echo.

REM ---------- Step 2: 安装依赖 ----------
echo [2/4] 检查依赖...
REM 通过检查 node_modules 与 pnpm-lock.yaml 一致性判断是否需要重新安装
if not exist "node_modules\.modules.yaml" (
    echo   正在安装依赖（pnpm install --frozen-lockfile）...
    call pnpm install --frozen-lockfile
    if errorlevel 1 (
        echo [ERROR] pnpm install 失败，请检查 pnpm-lock.yaml 是否最新
        exit /b 1
    )
) else (
    echo   依赖已安装，跳过
)
echo.

REM ---------- Step 3: 注入 wx-appid（可选） ----------
if defined WX_APPID (
    echo [3/4] 注入 wx-appid: %WX_APPID%
    node scripts\inject-wx-appid.mjs
    if errorlevel 1 (
        echo [ERROR] 注入 wx-appid 失败
        exit /b 1
    )
) else (
    echo [3/4] 跳过 wx-appid 注入（未设置 WX_APPID 环境变量）
)
echo.

REM ---------- Step 4: 编译微信小程序 ----------
REM 走 isolated real 出口：build:mp-weixin 会把 real 档直接写进 dist\build\mp-weixin
REM （那是 mock 证据档，档位新鲜度门实测两次抓到 VITE_API_MODE=real 覆盖），isolated
REM 出口输出到 mp-weixin-real 自管目录，两侧互不污染。
echo [4/4] 编译微信小程序（real 档，isolated 出口）...
call pnpm run build:mp-weixin:real:isolated
if errorlevel 1 (
    echo [ERROR] 编译失败，请查看上方错误信息
    exit /b 1
)

echo.
echo ========================================
echo   编译成功！
echo ========================================
echo.
echo 输出目录: %~dp0apps\client\dist\build\mp-weixin-real
echo.
echo 下一步：
echo   1. 打开微信开发者工具
echo   2. 导入上述输出目录
echo   3. 在工具中填写 AppID（或通过 WX_APPID 环境变量自动注入）
echo.

REM 仅在交互式命令行中暂停（双击运行时保留窗口）
echo %CMDCMDLINE% | findstr /i "%~nx0" >nul && pause

endlocal
exit /b 0
