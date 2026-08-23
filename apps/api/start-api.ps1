# 一键启动 API 服务（real profile + 所有本地开发环境变量）
$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot"

$env:DB_URL = "jdbc:mysql://127.0.0.1:3307/campus_love?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "hyp5022940"
$env:REDIS_HOST = "127.0.0.1"
$env:REDIS_PORT = "6379"
$env:JWT_SECRET = "VY+R0R3lWUcLBZ89WPNnxuMa5dpBZQ2bvREu6y4lldsX5TUnJbSbb8up+nEPda6y"
$env:ADMIN_OPENID = "local-dev-admin-openid-123456"
$env:ADMIN_NICKNAME = "系统管理员"
$env:MANAGEMENT_HEALTH_RABBIT_ENABLED = "false"
$env:SPRING_RABBITMQ_LISTENER_SIMPLE_AUTO_STARTUP = "false"
$env:SPRING_AUTOCONFIGURE_EXCLUDE = "org.redisson.spring.starter.RedissonAutoConfigurationV2"
$env:APP_REDISSON_MANUAL_CONFIG = "true"
$env:APP_FLYWAY_LOCATIONS = "filesystem:d:\6\恋爱小程序\database\flyway\sql"
$env:APP_AES_SECRET = "4W5mT^.6BylN&z:)8$zh)b1c.KwF5'U1Xo}6.v^7#QKJ&>hx"
$env:AGNES_API_BASE = "http://localhost:0"
$env:APP_GUEST_LOGIN_ENABLED = "true"
$env:APP_CAMPUS_CERT_SIMULATE_ENABLED = "true"
$env:APP_DEMO_RECHARGE_ENABLED = "true"

Write-Host "Starting API server (real profile)..."
Write-Host "DB: MySQL@3307 | Redis@6379 | Port: 8080"

java -jar target/campus-love-api-0.1.0.jar `
  --spring.profiles.active=real `
  --spring.flyway.validate-on-migrate=false `
  --spring.flyway.baseline-on-migrate=true `
  --spring.flyway.baseline-version=0 `
  --app.ai.agnes.api-base=http://localhost:0 `
  --app.security.strict-aes=false
