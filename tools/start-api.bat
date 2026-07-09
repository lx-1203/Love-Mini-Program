@echo off
chcp 65001 >nul
echo ========================================
echo   校园恋爱 - 后端启动 (Mock模式)
echo ========================================
echo.

cd /d "D:\6\恋爱小程序\apps\api"

echo [1/2] 编译...
call .\mvnw.cmd package -DskipTests -q
if %errorlevel% neq 0 (
    echo 编译失败！
    pause
    exit /b 1
)

echo [2/2] 启动后端...
echo 后端将在 http://localhost:8080 运行
echo.
call .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=mock

pause
