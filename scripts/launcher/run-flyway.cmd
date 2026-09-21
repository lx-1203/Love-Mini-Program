@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0run-flyway.ps1" %*
exit /b %ERRORLEVEL%
