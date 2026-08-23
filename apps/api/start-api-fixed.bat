@echo off
chcp 65001 >nul
set "DB_URL=jdbc:mysql://127.0.0.1:3306/campus_love?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true"
set DB_USERNAME=root
set DB_PASSWORD=hyp5022940
set REDIS_HOST=127.0.0.1
set REDIS_PORT=6379
set REDIS_PASSWORD=campus-love-redis-2026
set JWT_SECRET=campus-love-dev-2026-secure-key-xK9mPq3wL
set ADMIN_OPENID=local-dev-admin-openid-123456
set ADMIN_NICKNAME=系统管理员
set MANAGEMENT_HEALTH_RABBIT_ENABLED=false
set SPRING_RABBITMQ_LISTENER_SIMPLE_AUTO_STARTUP=false
set SPRING_AUTOCONFIGURE_EXCLUDE=org.redisson.spring.starter.RedissonAutoConfigurationV2
set APP_REDISSON_MANUAL_CONFIG=true
set APP_FLYWAY_LOCATIONS=filesystem:d:\6\恋爱小程序\database\flyway\sql
set APP_GUEST_LOGIN_ENABLED=true
set APP_CAMPUS_CERT_SIMULATE_ENABLED=true
set APP_DEMO_RECHARGE_ENABLED=true

echo Starting API server (real profile)...
echo DB: MySQL@3306 ^| Redis@6379 ^| Port: 8080

java -jar d:\6\恋爱小程序\apps\api\target\campus-love-api-0.1.0.jar ^
  --spring.profiles.active=real ^
  --spring.flyway.validate-on-migrate=false ^
  --spring.flyway.baseline-on-migrate=true ^
  --spring.flyway.baseline-version=0 ^
  --app.ai.agnes.api-base=http://localhost:0 ^
  --app.security.strict-aes=false
