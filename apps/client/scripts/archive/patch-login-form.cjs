// 重建手机号表单区(手机号+密码+注册昵称+切换按钮)
const fs = require("fs");
const path = "apps/client/src/pages/login/index.vue";
let lines = fs.readFileSync(path, "utf8").split("\r\n");

// 定位手机号表单区:从 `<view v-else class="login-form">` 到其闭合
let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('v-else class="login-form"')) {
    start = i;
    break;
  }
}
if (start < 0) { console.error("login-form not found"); process.exit(1); }

// 找到 login-form 的闭合:向后匹配大括号深度
let depth = 0;
let end = -1;
for (let i = start; i < lines.length; i++) {
  depth += (lines[i].match(/<view/g) || []).length - (lines[i].match(/<\/view>/g) || []).length;
  if (depth === 0 && i > start) { end = i; break; }
}
if (end < 0) { console.error("login-form close not found"); process.exit(1); }

const form = `        <view v-else class="login-form">
          <view class="input-group">
            <view class="input-item">
              <view class="input-icon" aria-hidden="true">
                <image class="input-icon-text" :src="loginIcons.mobile" mode="aspectFit" alt="" />
              </view>
              <label class="sr-only" for="login-phone">{{ t('login.phonePlaceholder') }}</label>
              <input
                id="login-phone"
                class="input-field"
                type="number"
                maxlength="11"
                :placeholder="t('login.phonePlaceholder')"
                placeholder-class="input-placeholder"
                v-model="phone"
                :aria-label="t('login.phonePlaceholder')"
                aria-required="true"
                inputmode="numeric"
              />
            </view>

            <view class="input-divider" />

            <view class="input-item">
              <view class="input-icon" aria-hidden="true">
                <image class="input-icon-text" :src="loginIcons.key" mode="aspectFit" alt="" />
              </view>
              <label class="sr-only" for="login-password">{{ t('login.passwordPlaceholder') }}</label>
              <input
                id="login-password"
                class="input-field"
                type="password"
                :placeholder="t('login.passwordPlaceholder')"
                placeholder-class="input-placeholder"
                v-model="password"
                :aria-label="t('login.passwordPlaceholder')"
                aria-required="true"
              />
            </view>

            <view v-if="phoneRegisterMode" class="input-divider" />

            <view v-if="phoneRegisterMode" class="input-item">
              <view class="input-icon" aria-hidden="true">
                <image class="input-icon-text" :src="loginIcons.user" mode="aspectFit" alt="" />
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

          <view class="form-btns">
            <view class="btn-primary press-feedback" :class="{ 'btn--loading': loading }" hover-class="press-feedback--active" hover-stay-time="120" @tap="onPhoneLoginGuarded">
              <text class="btn-primary-text">{{ phoneRegisterMode ? t('login.registerButton') : t('login.loginButton') }}</text>
            </view>

            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="toggleRegisterMode">
              <text class="btn-text-link">{{ phoneRegisterMode ? t('login.backToLogin') : t('login.goRegister') }}</text>
            </view>

            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="togglePhoneLogin">
              <text class="btn-text-link">{{ t('login.backToWechat') }}</text>
            </view>
          </view>
        </view>`;

lines.splice(start, end - start + 1, ...form.split("\r\n"));
fs.writeFileSync(path, lines.join("\r\n"), "utf8");
console.log("login-form rebuilt");
