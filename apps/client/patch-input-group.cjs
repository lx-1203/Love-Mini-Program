// 重建 input-group 区:手机号 + 密码 + (注册)昵称
const fs = require("fs");
const path = "apps/client/src/pages/login/index.vue";
let content = fs.readFileSync(path, "utf8");

// 起点:input-group 开始
const groupStart = content.indexOf(`          <view class="input-group">`);
if (groupStart < 0) { console.error("group start not found"); process.exit(1); }
// 终点:form-btns 开始
const formBtns = content.indexOf(`          <view class="form-btns">`);
if (formBtns < 0) { console.error("form-btns not found"); process.exit(1); }

const newGroup = `          <view class="input-group">
            <view class="input-item">
              <view class="input-icon" aria-hidden="true">
                <image class="input-icon-text" :src="loginIcons.mobile" mode="aspectFit" alt="" />
              </view>
              <!-- P6 a11y：label 关联输入框（sr-only 视觉隐藏，屏幕阅读器可读） -->
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

`;

content = content.slice(0, groupStart) + newGroup + content.slice(formBtns);
fs.writeFileSync(path, content, "utf8");
console.log("input-group rebuilt");
