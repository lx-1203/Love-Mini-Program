@echo off
rem Start mock-mode backend on 8080 (no MySQL/Redis needed; JWT_SECRET loaded from root .env)
rem 2026-09-01：.env 值可能用单引号包裹，统一剥首尾单引号（与 start-real.cmd / start-real.sh 一致）。
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist target\cp.txt (
  echo [start-mock] generating classpath ...
  call mvnw.cmd dependency:build-classpath -Dmdep.outputFile=target/cp.txt || exit /b 1
)

rem 解析 .env（跳过注释/空行），剥值首尾单引号后写环境变量
for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%~dp0..\.env") do (
  set "__KEY=%%a"
  set "__VAL=%%b"
  if defined __VAL (
    if "!__VAL:~0,1!"=="'" if "!__VAL:~-1!"=="'" set "__VAL=!__VAL:~1,-1!"
  )
  set "!__KEY!=!__VAL!"
)

set /p CP=<target\cp.txt
java -cp "target/classes;%CP%" com.campuslove.api.CampusLoveApplication --spring.profiles.active=mock --server.port=8080
