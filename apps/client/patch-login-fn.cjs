// 改造 onPhoneLogin 为真实登录/注册(按行处理)
const fs = require("fs");
const path = "apps/client/src/pages/login/index.vue";
let lines = fs.readFileSync(path, "utf8").split("\r\n");

let out = [];
let inFn = false;
let replaced = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("function onPhoneLogin()")) {
    inFn = true;
    out.push("async function onPhoneLogin() {");
    out.push("  if (!agreed.value) {");
    out.push("    uni.showToast({ title: t(\"login.agreeFirst\"), icon: \"none\" });");
    out.push("    return;");
    out.push("  }");
    out.push("  if (!canPhoneLogin.value) {");
    out.push("    uni.showToast({ title: t(\"login.phoneAndCodeInvalid\"), icon: \"none\" });");
    out.push("    return;");
    out.push("  }");
    out.push("  // infra R2 联调改进:真实调用后端接口(参考 eladmin 账号体系)。");
    out.push("  // 登录模式 POST /v1/auth/phone-login;注册模式 POST /v1/auth/register,");
    out.push("  // 成功即签发 JWT 并写入会话(services/auth.ts 内完成 token 存储)。");
    out.push("  try {");
    out.push("    if (phoneRegisterMode.value) {");
    out.push("      await registerUser(phone.value.trim(), password.value, nickname.value.trim());");
    out.push("      addBreadcrumb(\"ui\", \"button_click\", { id: \"login.register\" });");
    out.push("    } else {");
    out.push("      await loginWithPhone(phone.value.trim(), password.value);");
    out.push("      addBreadcrumb(\"ui\", \"button_click\", { id: \"login.phone\" });");
    out.push("    }");
    out.push("    uni.showToast({ title: t(\"login.loginSuccess\"), icon: \"success\" });");
    out.push("    if (loginNavTimer) clearTimeout(loginNavTimer);");
    out.push("    loginNavTimer = setTimeout(() => {");
    out.push("      replaceAppPath(\"/pages/discover/index\");");
    out.push("      loginNavTimer = null;");
    out.push("    }, 1500);");
    out.push("  } catch (error) {");
    out.push("    captureException(error, { source: phoneRegisterMode.value ? \"login.register\" : \"login.phone\" });");
    out.push("    const message = error instanceof Error ? error.message : t(\"login.loginFailed\");");
    out.push("    uni.showToast({ title: message, icon: \"none\" });");
    out.push("  }");
    out.push("}");
    replaced = true;
    // 跳过原函数体直到闭合大括号后的空行
    let depth = 1;
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      const open = (l.match(/{/g) || []).length;
      const close = (l.match(/}/g) || []).length;
      depth += open - close;
      if (depth <= 0) {
        i = j;
        break;
      }
    }
    continue;
  }
  out.push(line);
}
fs.writeFileSync(path, out.join("\r\n"), "utf8");
console.log(replaced ? "onPhoneLogin replaced" : "NOT FOUND");
