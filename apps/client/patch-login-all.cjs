// 逐步应用登录页改造(不中断,报告每步结果)
const fs = require("fs");
const path = "apps/client/src/pages/login/index.vue";
let content = fs.readFileSync(path, "utf8");
const results = [];

function rep(oldS, newS, label) {
  if (content.includes(oldS)) {
    content = content.replace(oldS, newS);
    results.push("OK: " + label);
  } else {
    results.push("MISS: " + label);
  }
}

rep(
  `import { captureException, addBreadcrumb } from "../../services/sentry";`,
  `import { captureException, addBreadcrumb } from "../../services/sentry";
import { loginWithPhone, registerUser } from "../../services/auth";`,
  "import auth"
);

rep(
  `const phone = ref("");\nconst code = ref("");`,
  `const phone = ref("");
const password = ref("");
const nickname = ref("");
const phoneRegisterMode = ref(false);`,
  "state refs"
);

rep(
  `const showPhoneLogin = ref(false);`,
  `const showPhoneLogin = ref(false);
const phoneLoginEnabled = computed(() => true);`,
  "phoneLoginEnabled"
);

rep(
  `import { isMockMode } from "../../services/env";\n`,
  ``,
  "remove isMockMode"
);

rep(
  `const isCodeValid = computed(() => /^\\d{4,6}$/.test(code.value));
const canPhoneLogin = computed(() => isPhoneValid.value && isCodeValid.value && agreed.value);`,
  `const isCodeValid = computed(() => password.value.length >= 6 && password.value.length <= 64);
const canPhoneLogin = computed(() => isPhoneValid.value && isCodeValid.value && agreed.value);
const canPhoneRegister = computed(() => isPhoneValid.value && isCodeValid.value && nickname.value.trim().length > 0 && agreed.value);`,
  "valid computeds"
);

rep(
  `const canSendCode = computed(() => isPhoneValid.value && countdown.value === 0);\n`,
  ``,
  "remove canSendCode"
);

// 移除 startCountdown 与 onSendCode 函数(按函数名定位)
function removeFunction(name) {
  const idx = content.indexOf(`function ${name}(`);
  if (idx >= 0) {
    const end = content.indexOf("\n}\n", idx);
    if (end >= 0) {
      content = content.slice(0, idx) + content.slice(end + 3);
      results.push("OK: remove " + name);
      return;
    }
  }
  results.push("MISS: remove " + name);
}
removeFunction("startCountdown");
removeFunction("onSendCode");

// onPhoneLogin 真实实现
const fnStart = content.indexOf("function onPhoneLogin() {");
if (fnStart >= 0) {
  const fnEnd = content.indexOf("\n}\n", fnStart);
  if (fnEnd >= 0) {
    const newFn = `function onPhoneLogin() {
  if (!agreed.value) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  const canSubmit = phoneRegisterMode.value ? canPhoneRegister.value : canPhoneLogin.value;
  if (!canSubmit) {
    uni.showToast({ title: t("login.phoneAndCodeInvalid"), icon: "none" });
    return;
  }
  // infra R2 联调改进:真实调用后端(参考 eladmin 账号体系)。
  // 登录 POST /v1/auth/phone-login;注册 POST /v1/auth/register,成功即签发 JWT。
  try {
    if (phoneRegisterMode.value) {
      await registerUser(phone.value.trim(), password.value, nickname.value.trim());
      addBreadcrumb("ui", "button_click", { id: "login.register" });
    } else {
      await loginWithPhone(phone.value.trim(), password.value);
      addBreadcrumb("ui", "button_click", { id: "login.phone" });
    }
    uni.showToast({ title: t("login.loginSuccess"), icon: "success" });
    if (loginNavTimer) clearTimeout(loginNavTimer);
    loginNavTimer = setTimeout(() => {
      replaceAppPath("/pages/discover/index");
      loginNavTimer = null;
    }, 1500);
  } catch (error) {
    captureException(error, { source: phoneRegisterMode.value ? "login.register" : "login.phone" });
    const message = error instanceof Error ? error.message : t("login.loginFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}`;
    content = content.slice(0, fnStart) + newFn + content.slice(fnEnd + 3);
    results.push("OK: onPhoneLogin real impl");
  } else {
    results.push("MISS: onPhoneLogin end");
  }
} else {
  results.push("MISS: onPhoneLogin");
}

rep(
  `function togglePhoneLogin() {
  showPhoneLogin.value = !showPhoneLogin.value;
}`,
  `function togglePhoneLogin() {
  showPhoneLogin.value = !showPhoneLogin.value;
}

function toggleRegisterMode() {
  phoneRegisterMode.value = !phoneRegisterMode.value;
}`,
  "toggleRegisterMode"
);

// 模板:验证码块 → 密码输入
const inputStart = content.indexOf(`                id="login-code"`);
if (inputStart >= 0) {
  // 从该 input 的 <input 开始
  const inputBegin = content.lastIndexOf("<input", inputStart);
  // 到 send-code 按钮块结束
  const sendBtn = content.indexOf(`{{ countdown > 0 ? countdown + 's' : t('login.getCode') }}`);
  const c1 = content.indexOf("</view>", sendBtn);
  const c2 = content.indexOf("</view>", c1 + 1);
  const blockEnd = c2 + "</view>".length;
  const newBlock = `              <label class="sr-only" for="login-password">{{ t('login.passwordPlaceholder') }}</label>
              <input
                id="login-password"
                class="input-field"
                type="password"
                :placeholder="t('login.passwordPlaceholder')"
                placeholder-class="input-placeholder"
                v-model="password"
                :aria-label="t('login.passwordPlaceholder')"
                aria-required="true"
              />`;
  content = content.slice(0, inputBegin) + newBlock + content.slice(blockEnd);
  results.push("OK: password input");
} else {
  results.push("MISS: login-code input");
}

// 模板:注册昵称输入(在 form-btns 前)
rep(
  `          <view class="form-btns">`,
  `            <view v-if="phoneRegisterMode" class="input-divider" />

            <view v-if="phoneRegisterMode" class="input-item">
              <view class="input-icon" aria-hidden="true">
                <image class="input-icon-text" :src="loginIcons.mobile" mode="aspectFit" alt="" />
              </view>
              <label class="sr-only" for="login-nickname">{{ t('login.nicknamePlaceholder') }}</label>
              <input
                id="login-nickname"
                class="input-field"
                type="text"
                maxlength="20"
                :placeholder="t('login.nicknamePlaceholder')"
                placeholder-class="input-placeholder"
                v-model="nickname"
                :aria-label="t('login.nicknamePlaceholder')"
                aria-required="true"
              />
            </view>
          </view>

          <view class="form-btns">`,
  "nickname input"
);

// 模板:按钮文案 + 注册切换
rep(
  `<text class="btn-primary-text">{{ t('login.loginButton') }}</text>`,
  `<text class="btn-primary-text">{{ phoneRegisterMode ? t('login.registerButton') : t('login.loginButton') }}</text>`,
  "button text"
);

rep(
  `            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="togglePhoneLogin">
              <text class="btn-text-link">{{ t('login.backToWechat') }}</text>`,
  `            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="toggleRegisterMode">
              <text class="btn-text-link">{{ phoneRegisterMode ? t('login.backToLogin') : t('login.goRegister') }}</text>
            </view>

            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="togglePhoneLogin">
              <text class="btn-text-link">{{ t('login.backToWechat') }}</text>`,
  "register toggle"
);

fs.writeFileSync(path, content, "utf8");
console.log(results.join("\n"));
