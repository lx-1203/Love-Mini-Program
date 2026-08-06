// 替换验证码输入块为密码输入(精确文本)
const fs = require("fs");
const path = "apps/client/src/pages/login/index.vue";
let content = fs.readFileSync(path, "utf8");
const nl = content.includes("\r\n") ? "\r\n" : "\n";

const startMark = `<label class="sr-only" for="login-code">`;
const idx = content.indexOf(startMark);
if (idx < 0) { console.error("code block start not found"); process.exit(1); }

// 找到 "v-model=\"code\"" 所在 input 块的起点(上一个 <input)
const inputStart = content.lastIndexOf("<input", idx);
if (inputStart < 0) { console.error("input start not found"); process.exit(1); }

// 找到 send-code-btn 块的结束(下一个 "          </view>" 后的 "</view>")
const btnEndMark = `{{ countdown > 0 ? countdown + 's' : t('login.getCode') }}`;
const btnEndIdx = content.indexOf(btnEndMark);
if (btnEndIdx < 0) { console.error("btn end not found"); process.exit(1); }
// 从 btnEnd 往后找该 view 闭合(两个 </view>)
let after = btnEndIdx;
const close1 = content.indexOf("</view>", after);
const close2 = content.indexOf("</view>", close1 + 1);
if (close1 < 0 || close2 < 0) { console.error("close not found"); process.exit(1); }
const blockEnd = close2 + "</view>".length;

const newBlock = `<label class="sr-only" for="login-password">{{ t('login.passwordPlaceholder') }}</label>
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

content = content.slice(0, inputStart) + newBlock + content.slice(blockEnd);
fs.writeFileSync(path, content, "utf8");
console.log("code block replaced with password input");
