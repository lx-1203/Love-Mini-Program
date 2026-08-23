$ErrorActionPreference = "Stop"
Set-Location "D:\6\恋爱小程序\apps\api"
$env:JWT_SECRET = 'VY+R0R3lWUcLBZ89WPNnxuMa5dpBZQ2bvREu6y4lldsX5TUnJbSbb8up+nEPda6y'
$env:ADMIN_OPENID = 'local-dev-admin-openid-123456'
$env:ADMIN_NICKNAME = '系统管理员'
$env:APP_GUEST_LOGIN_ENABLED = 'true'
$env:APP_CAMPUS_CERT_SIMULATE_ENABLED = 'true'
$env:APP_DEMO_RECHARGE_ENABLED = 'true'
& 'D:\jdk17\bin\java.exe' -jar 'target\campus-love-api-0.1.0.jar' '--spring.profiles.active=mock' '--app.security.strict-aes=false'
