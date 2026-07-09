@echo off
chcp 65001 >nul
echo ========================================
echo   校园恋爱 - 前端启动 (H5 Mock模式)
echo ========================================
echo.

cd /d "D:\6\恋爱小程序"

echo 启动前确保后端已在 http://localhost:8080 运行
echo 前端将在 http://localhost:5173 运行
echo.
call npm run client:dev:h5

pause
