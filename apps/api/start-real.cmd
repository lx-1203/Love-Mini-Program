@echo off
rem Start real-mode backend on 8080 (requires MySQL 3306 + Redis 6379 + root .env)
rem 2026-09-01：.env 值可能用单引号包裹（如 ADMIN_INITIAL_PASSWORD_HASH='$2a$...'），
rem cmd 的 for /f 不会剥引号（bash source 会），此处统一剥首尾单引号，避免 Spring 收到
rem 非法 BCrypt 前缀导致启动失败（与 start-real.sh / PowerShell 启动链行为一致）。
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist target\cp.txt (
  echo [start-real] generating classpath ...
  call mvnw.cmd dependency:build-classpath -Dmdep.outputFile=target/cp.txt || exit /b 1
)

rem 解析 .env（跳过注释/空行），剥值首尾单引号后写环境变量
for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%~dp0..\.env") do (
  set "__KEY=%%a"
  set "__VAL=%%b"
  rem 剥首尾单引号：'xxx' -> xxx
  if defined __VAL (
    if "!__VAL:~0,1!"=="'" if "!__VAL:~-1!"=="'" set "__VAL=!__VAL:~1,-1!"
  )
  set "!__KEY!=!__VAL!"
)

set /p CP=<target\cp.txt
java -cp "target/classes;%CP%" com.campuslove.api.CampusLoveApplication --spring.profiles.active=real --server.port=8080
