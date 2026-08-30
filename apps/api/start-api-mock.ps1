$ErrorActionPreference = "Stop"
Set-Location "D:\6\恋爱小程序\apps\api"

# ============================================================
# mock 后端启动脚本（2026-08-26 修正）
# ------------------------------------------------------------
# 问题：pom.xml 的 maven-jar-plugin 打包时排除 com/campuslove/api/mock/**，
#       `java -jar target/*.jar --spring.profiles.active=mock` 因 jar 无 mock 类而无法启动。
# 正解：用 maven spring-boot:run 直接运行 target/classes（mock 类保留在 classes 中）。
# 依赖：本机 java 可用（mvnw 会自行解析 JAVA_HOME 或 PATH 中的 java）。
# 验证：curl http://127.0.0.1:8080/actuator/health
# ============================================================
$env:JWT_SECRET = 'VY+R0R3lWUcLBZ89WPNnxuMa5dpBZQ2bvREu6y4lldsX5TUnJbSbb8up+nEPda6y'
$env:ADMIN_OPENID = 'local-dev-admin-openid-123456'
$env:ADMIN_NICKNAME = '系统管理员'
$env:APP_GUEST_LOGIN_ENABLED = 'true'
$env:APP_CAMPUS_CERT_SIMULATE_ENABLED = 'true'
$env:APP_DEMO_RECHARGE_ENABLED = 'true'

& '.\mvnw.cmd' spring-boot:run "-Dspring-boot.run.profiles=mock" "-Dspring-boot.run.arguments=--app.security.strict-aes=false"