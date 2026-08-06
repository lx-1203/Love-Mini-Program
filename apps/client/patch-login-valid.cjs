// 校验区改造(直接按行处理)
const fs = require("fs");
const path = "apps/client/src/pages/login/index.vue";
let lines = fs.readFileSync(path, "utf8").split("\r\n");
const nl = "\r\n";

let out = [];
for (const line of lines) {
  if (line.includes("const isCodeValid = computed")) {
    out.push("const isCodeValid = computed(() => password.value.length >= 6 && password.value.length <= 64);");
    out.push("const canPhoneLogin = computed(() => isPhoneValid.value && isCodeValid.value && agreed.value);");
    out.push("// 注册模式额外要求昵称非空");
    out.push("const canPhoneRegister = computed(() => isPhoneValid.value && isCodeValid.value && nickname.value.trim().length > 0 && agreed.value);");
  } else if (line.includes("const canPhoneLogin = computed")) {
    // 跳过(上面已输出)
  } else {
    out.push(line);
  }
}
fs.writeFileSync(path, out.join(nl), "utf8");
console.log("valid replaced");
