@ECHO OFF
SETLOCAL

SET "BASE_DIR=%~dp0"
IF "%BASE_DIR:~-1%"=="\" SET "BASE_DIR=%BASE_DIR:~0,-1%"
SET "WRAPPER_JAR=%BASE_DIR%\.mvn\wrapper\maven-wrapper.jar"
SET "WRAPPER_PROPERTIES=%BASE_DIR%\.mvn\wrapper\maven-wrapper.properties"

IF NOT EXIST "%WRAPPER_JAR%" (
  powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $wrapperUrl = (Get-Content '%WRAPPER_PROPERTIES%' | Where-Object { $_ -like 'wrapperUrl=*' } | Select-Object -First 1).Split('=', 2)[1]; New-Item -ItemType Directory -Force -Path (Split-Path '%WRAPPER_JAR%') | Out-Null; Invoke-WebRequest -Uri $wrapperUrl -OutFile '%WRAPPER_JAR%'"
)

java "-Dmaven.multiModuleProjectDirectory=%BASE_DIR%" -classpath "%WRAPPER_JAR%" org.apache.maven.wrapper.MavenWrapperMain %*
