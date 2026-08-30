@echo off
set "JWT_SECRET=ee7ce81ce054c99c7e31c20ad020fb7797b29ff75dd6bc091c593c965040f0f88aeef759fc25a5e3fa60736303a78eb0"
set "DB_URL=jdbc:mysql://127.0.0.1:3306/campus_love?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai"
set "DB_USERNAME=campus"
set "DB_PASSWORD=CampusLove@2026"
set "REDIS_HOST=127.0.0.1"
set "REDIS_PORT=6379"
set "REDIS_PASSWORD=CampusRedis@2026"
set "ADMIN_INITIAL_PASSWORD_HASH=$2a$10$VYLfVMUcGu85XCNEcOh2UO5EGnmJEIWMbeph3cn7KAPyM4rPQ/8ZG"
set "DEMO_SEED=true"
set "APP_AES_SECRET=2bd4f59ea4c783d12e4f9990f8972bdf2a1485ef6cd651a1cd0325cb0de187f8"
set "AGNES_API_BASE=https://api.agnes.example.com"
set "ADMIN_OPENID=oTestAdminOpenid0000000000000001"
set "APP_ADMIN_STRICT_OPENID=false"
set "ADMIN_PASSWORD=Admin@12345"
set "APP_GUEST_LOGIN_ENABLED=true"
set "APP_GUEST_LOGIN_BLACKLIST_PHONE=13900000000"
set "ADMIN_PASSWORD_HASH=$2a$10$VYLfVMUcGu85XCNEcOh2UO5EGnmJEIWMbeph3cn7KAPyM4rPQ/8ZG"
cd /d "%~dp0apps\api"
if not exist "%~dp0logs" mkdir "%~dp0logs"
java -jar target\campus-love-api-0.1.0.jar --spring.profiles.active=real --server.port=8080 > "%~dp0logs\backend-pp.log" 2>&1