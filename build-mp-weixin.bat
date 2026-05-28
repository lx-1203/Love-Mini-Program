@echo off
chcp 65001 >nul
echo ========================================
echo   校园恋爱 - 微信小程序编译
echo ========================================
echo.

cd /d "D:\6\恋爱小程序\apps\client"

echo [1/3] 检查依赖...
if not exist "node_modules\" (
    echo 正在安装依赖...
    call npm install
)

echo [2/3] 编译微信小程序...
call npx uni build --platform mp-weixin

echo.
echo [3/3] 编译完成！
echo.
echo 输出目录: D:\6\恋爱小程序\apps\client\dist\build\mp-weixin
echo.
echo 下一步：打开 微信开发者工具，导入上述目录
echo.
pause
