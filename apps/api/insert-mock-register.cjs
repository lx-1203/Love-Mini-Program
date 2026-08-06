// 在 MockAuthService 的 loginAsAdmin 前插入 registerUser/loginWithPhone mock 实现
const fs = require("fs");
const path = "apps/api/src/main/java/com/campuslove/api/auth/MockAuthService.java";
const lines = fs.readFileSync(path, "utf8").split("\n");
let idx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("public UserSessionView loginAsAdmin")) {
    idx = i;
    break;
  }
}
if (idx < 0) {
  console.error("loginAsAdmin NOT FOUND");
  process.exit(1);
}
if (lines.some(l => l.includes("public UserSessionView registerUser"))) {
  console.log("ALREADY INSERTED");
  process.exit(0);
}
const impl = `    @Override
    public UserSessionView registerUser(String phone, String password, String nickname) {
        // mock 模式下直接返回 mock 会话(忽略注册参数)
        log.info("mock 注册用户, phone={}", SensitiveDataMasker.mask(phone));
        return toView(runtimeState.loginWithWechat(), "mock-token-" + System.currentTimeMillis());
    }

    @Override
    public UserSessionView loginWithPhone(String phone, String password) {
        // mock 模式下忽略凭据,直接返回 mock 会话
        log.info("mock 手机号登录, phone={}", SensitiveDataMasker.mask(phone));
        return toView(runtimeState.currentSession(), "mock-token-" + System.currentTimeMillis());
    }

`;
lines.splice(idx, 0, impl);
fs.writeFileSync(path, lines.join("\n"), "utf8");
console.log("INSERTED at line", idx);
