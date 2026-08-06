// 在 AuthController 的 @PostMapping("/wechat-login") 前插入注册/手机号登录端点
const fs = require("fs");
const path = "apps/api/src/main/java/com/campuslove/api/auth/AuthController.java";
const lines = fs.readFileSync(path, "utf8").split("\n");
let idx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('@PostMapping("/wechat-login")')) {
    idx = i;
    break;
  }
}
if (idx < 0) {
  console.error("wechat-login NOT FOUND");
  process.exit(1);
}
if (lines.some(l => l.includes("/register"))) {
  console.log("ALREADY INSERTED");
  process.exit(0);
}
const impl = `    /**
     * 注册新用户（手机号 + 密码 + 昵称）。
     *
     * <p>参考 eladmin 账号注册模式:手机号作为登录账号,密码 BCrypt 存储。
     * 注册成功直接签发 JWT,无需二次登录。公开端点(无需登录)。</p>
     *
     * @param request 注册请求(phone/password/nickname)
     * @return 用户会话视图(包含 JWT 令牌)
     */
    @PostMapping("/register")
    public ApiResponse<UserSessionView> register(@Valid @RequestBody RegisterRequest request) {
        UserSessionView session = authService.registerUser(
                request.phone(), request.password(), request.nickname());
        return ApiResponse.ok(session);
    }

    /**
     * 手机号 + 密码登录。
     *
     * @param request 登录请求(phone/password)
     * @return 用户会话视图(包含 JWT 令牌)
     */
    @PostMapping("/phone-login")
    public ApiResponse<UserSessionView> phoneLogin(@Valid @RequestBody PhoneLoginRequest request) {
        UserSessionView session = authService.loginWithPhone(request.phone(), request.password());
        return ApiResponse.ok(session);
    }

`;
lines.splice(idx, 0, impl);
fs.writeFileSync(path, lines.join("\n"), "utf8");
console.log("INSERTED endpoints at line", idx);
