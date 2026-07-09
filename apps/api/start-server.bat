@echo off
set JWT_SECRET=test-secret-for-local-dev-only-12345678
start /B java -jar target\campus-love-api-0.1.0.jar --spring.profiles.active=mock > api-server.log 2>&1
echo Server PID: !ERRORLEVEL!
