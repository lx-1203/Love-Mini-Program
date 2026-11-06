// 改造登录页:密码登录/注册模式(保留 CRLF)
const fs = require("fs");
const path = "apps/client/src/pages/login/index.vue";
let content = fs.readFileSync(path, "utf8");
const nl = content.includes("\r\n") ? "\r\n" : "\n";

// 1. 状态区改造
const oldState = `const phone = ref("");${nl}const code = ref("");${nl}const agreed = ref(false);${nl}const countdown = ref(0);${nl}const showPhoneLogin = ref(false);${nl}// infra R2-00018：手机号+验证码登录后端未实现（services/auth.ts 仅实现微信登录），${nl}// 真实模式下隐藏手机号登录入口，防止用户误入假链路（本地校验通过即"登录成功"不建会话）${nl}const phoneLoginEnabled = computed(() => isMockMode());`;
const newState = `const phone = ref("");${nl}const password = ref("");${nl}const nickname = ref("");${nl}const agreed = ref(false);${nl}const countdown = ref(0);${nl}const showPhoneLogin = ref(false);${nl}// infra R2 联调改进:手机号+密码登录/注册后端接口已实现(POST /v1/auth/phone-login、/register),${nl}// 参考 eladmin 账号体系,真实模式与 mock 模式均可用(不再限 mock)${nl}const phoneLoginEnabled = computed(() => true);${nl}// 登录/注册模式切换(false=登录,true=注册)${nl}const phoneRegisterMode = ref(false);`;
if (content.includes(oldState)) {
  content = content.replace(oldState, newState);
  console.log("state replaced");
} else {
  console.error("state anchor not found");
  process.exit(1);
}

// 2. 校验逻辑改造
const oldValid = `const isCodeValid = computed(() => /^\\d{4,6}$/.test(code.value));${nl}const canPhoneLogin = computed(() => isPhoneValid.value && isCodeValid.value && agreed.value);`;
const newValid = `const isCodeValid = computed(() => password.value.length >= 6 && password.value.length <= 64);${nl}const canPhoneLogin = computed(() => isPhoneValid.value && isCodeValid.value && agreed.value);${nl}// 注册模式额外要求昵称非空${nl}const canPhoneRegister = computed(() => isPhoneValid.value && isCodeValid.value && nickname.value.trim().length > 0 && agreed.value);`;
if (content.includes(oldValid)) {
  content = content.replace(oldValid, newValid);
  console.log("valid replaced");
} else {
  console.error("valid anchor not found");
  process.exit(1);
}

fs.writeFileSync(path, content, "utf8");
console.log("DONE");
