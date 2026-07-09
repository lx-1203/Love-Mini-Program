<script setup lang="ts">
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useSessionStore } from "../../stores/session";
import { replaceAppPath } from "../../utils/navigation";

const sessionStore = useSessionStore();
const { loginHero, loading } = storeToRefs(sessionStore);

const phone = ref("");
const code = ref("");
const agreed = ref(false);
const countdown = ref(0);
const showPhoneLogin = ref(false);

const pageVisible = ref(false);
onShow(() => {
  pageVisible.value = false;
  setTimeout(() => {
    pageVisible.value = true;
  }, 30);
});

let countdownTimer: ReturnType<typeof setInterval> | null = null;

const isPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value));
const isCodeValid = computed(() => /^\d{4,6}$/.test(code.value));
const canSendCode = computed(() => isPhoneValid.value && countdown.value === 0);
const canPhoneLogin = computed(() => isPhoneValid.value && isCodeValid.value && agreed.value);

function startCountdown() {
  countdown.value = 60;
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
}

function onSendCode() {
  if (!canSendCode.value) {
    if (!isPhoneValid.value) {
      uni.showToast({ title: "请输入正确的手机号", icon: "none" });
    }
    return;
  }
  uni.showToast({ title: "验证码已发送", icon: "none" });
  startCountdown();
}

function togglePhoneLogin() {
  showPhoneLogin.value = !showPhoneLogin.value;
}

async function onWechatLogin() {
  if (!agreed.value) {
    uni.showToast({ title: "请先阅读并同意用户协议", icon: "none" });
    return;
  }
  try {
    await sessionStore.loginWithWechat();
    replaceAppPath("/pages/home/index");
  } catch (error) {
    const message = error instanceof Error ? error.message : "登录失败，请稍后重试";
    uni.showToast({ title: message, icon: "none" });
  }
}

function onPhoneLogin() {
  if (!agreed.value) {
    uni.showToast({ title: "请先阅读并同意用户协议", icon: "none" });
    return;
  }
  if (!canPhoneLogin.value) {
    uni.showToast({ title: "请输入正确的手机号和验证码", icon: "none" });
    return;
  }
  uni.showToast({ title: "登录成功", icon: "success" });
  setTimeout(() => {
    replaceAppPath("/pages/home/index");
  }, 1500);
}

function onAgreeTap() {
  agreed.value = !agreed.value;
}

function openUserAgreement() {
  uni.showToast({ title: "用户协议", icon: "none" });
}

function openPrivacyPolicy() {
  uni.showToast({ title: "隐私政策", icon: "none" });
}
</script>

<template>
  <view class="login-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部实景图区（占 70% 高度） -->
    <view class="login-page__hero">
      <image
        class="hero-image"
        src="/static/assets/images/posters/login-poster.jpg"
        mode="aspectFill"
        aria-hidden="true"
      />
      <!-- 底部白色渐变叠加，增强文字可读性 -->
      <view class="hero-overlay" />
      <!-- 主标题 + 副标压底显示 -->
      <view class="hero-title-wrap">
        <text class="logo-title">{{ loginHero?.heroTitle || '校园恋爱' }}</text>
        <text class="logo-subtitle">{{ loginHero?.heroSubtitle || '遇见你的心动' }}</text>
      </view>
    </view>

    <!-- 底部按钮区（占 30% 高度） -->
    <view class="login-page__bottom">
      <view class="login-card card-base">
        <view v-if="!showPhoneLogin" class="login-quick">
          <view class="btn-primary press-feedback" :class="{ 'btn--loading': loading }" hover-class="press-feedback--active" hover-stay-time="120" @tap="onWechatLogin">
            <view class="btn-icon-wrap">
              <text class="btn-icon-wechat">微</text>
            </view>
            <text class="btn-primary-text">微信一键登录</text>
          </view>

          <view class="btn-secondary press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="togglePhoneLogin">
            <text class="btn-secondary-text">手机号登录</text>
          </view>
        </view>

        <view v-else class="login-form">
          <view class="input-group">
            <view class="input-item">
              <view class="input-icon">
                <text class="input-icon-text">📱</text>
              </view>
              <input
                class="input-field"
                type="number"
                maxlength="11"
                placeholder="请输入手机号"
                placeholder-class="input-placeholder"
                v-model="phone"
              />
            </view>

            <view class="input-divider" />

            <view class="input-item">
              <view class="input-icon">
                <text class="input-icon-text">🔑</text>
              </view>
              <input
                class="input-field"
                type="number"
                maxlength="6"
                placeholder="请输入验证码"
                placeholder-class="input-placeholder"
                v-model="code"
              />
              <view
                class="send-code-btn press-feedback"
                :class="{ 'send-code-btn--disabled': !canSendCode }"
                hover-class="press-feedback--active"
                hover-stay-time="120"
                @tap="onSendCode"
              >
                <text class="send-code-text">
                  {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
                </text>
              </view>
            </view>
          </view>

          <view class="form-btns">
            <view class="btn-primary press-feedback" :class="{ 'btn--loading': loading }" hover-class="press-feedback--active" hover-stay-time="120" @tap="onPhoneLogin">
              <text class="btn-primary-text">登 录</text>
            </view>

            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="togglePhoneLogin">
              <text class="btn-text-link">返回微信登录</text>
            </view>
          </view>
        </view>
      </view>

      <view class="terms-wrap">
        <view class="checkbox press-feedback" :class="{ 'checkbox--checked': agreed }" hover-class="press-feedback--active" hover-stay-time="120" @tap="onAgreeTap">
          <text v-if="agreed" class="checkbox-check">✓</text>
        </view>
        <view class="terms-text-wrap">
          <text class="terms-text">已阅读并同意</text>
          <text class="terms-link" @tap="openUserAgreement">《用户协议》</text>
          <text class="terms-text">和</text>
          <text class="terms-link" @tap="openPrivacyPolicy">《隐私政策》</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.login-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--c-bg-page);
}

/* 顶部实景图区 —— 占 70% 高度 */
.login-page__hero {
  position: relative;
  width: 100%;
  height: 70vh;
  flex-shrink: 0;
  overflow: hidden;
}

.hero-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 实景图覆盖整个区域 */
  object-fit: cover;
}

/* 底部白色渐变叠加 —— 增强文字可读性 */
.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 100%);
  pointer-events: none;
}

/* 主标题 + 副标 —— 压底显示，在白色渐变之上保证可读 */
.hero-title-wrap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--sp-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 var(--sp-8);
  z-index: 1;
}

.logo-title {
  font-size: var(--fs-7xl);
  font-weight: 700;
  color: var(--c-text-primary);
  letter-spacing: 4rpx;
  line-height: 1.3;
  margin-bottom: var(--sp-3);
  text-align: center;
}

.logo-subtitle {
  font-size: var(--fs-lg);
  font-weight: 400;
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.6;
  letter-spacing: 2rpx;
}

/* 底部按钮区 —— 占 30% 高度 */
.login-page__bottom {
  flex: 1;
  position: relative;
  z-index: 1;
  padding-left: var(--sp-8);
  padding-right: var(--sp-8);
  padding-top: var(--sp-6);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-6));
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  background: var(--c-bg-page);
}

.login-card {
  width: 100%;
  background: transparent;
  border-radius: var(--r-xl);
  padding: 0;
  margin-bottom: var(--sp-6);
  border: none;
  box-shadow: none;
}

.login-quick {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* 主按钮：青绿实心 + 微信图标 */
.btn-primary {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-xl);
  background: var(--c-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  box-shadow: var(--s-float-btn);
}

.btn-primary:active {
  transform: scale(0.96);
  box-shadow: var(--s-brand-md);
}

.btn--loading {
  opacity: 0.65;
}

.btn-icon-wrap {
  width: 44rpx;
  height: 44rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-wechat {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 700;
}

.btn-primary-text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-inverse);
  letter-spacing: 2rpx;
}

/* 次按钮：白底 + 描边 */
.btn-secondary {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  border: 2rpx solid var(--c-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-secondary:active {
  transform: scale(0.96);
  background: var(--c-neutral-50);
}

.btn-secondary-text {
  font-size: var(--fs-lg);
  font-weight: 500;
  color: var(--c-text-primary);
  letter-spacing: 2rpx;
}

.input-group {
  background: var(--c-neutral-50);
  border-radius: var(--r-md);
  padding: 0 var(--sp-6);
  margin-bottom: var(--sp-6);
  border: 2rpx solid var(--c-neutral-100);
}

.input-item {
  display: flex;
  align-items: center;
  height: 100rpx;
}

.input-icon {
  width: 52rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-right: var(--sp-3);
}

.input-icon-text {
  font-size: var(--fs-2xl);
}

.input-field {
  flex: 1;
  height: 100rpx;
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  background: transparent;
}

.input-placeholder {
  color: var(--c-text-quaternary);
  font-size: var(--fs-md);
}

.input-divider {
  height: 2rpx;
  background: var(--c-neutral-200);
}

.send-code-btn {
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-md);
  background: var(--c-brand);
  margin-left: var(--sp-4);
}

.send-code-btn:active {
  transform: scale(0.96);
}

.send-code-btn--disabled {
  background: var(--c-neutral-200);
}

.send-code-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 500;
  white-space: nowrap;
}

.send-code-btn--disabled .send-code-text {
  color: var(--c-text-quaternary);
}

.form-btns {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.btn-text {
  width: 100%;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-text:active {
  opacity: 0.7;
}

.btn-text-link {
  font-size: var(--fs-md);
  color: var(--c-text-quaternary);
}

.terms-wrap {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: var(--sp-3);
  padding: 0 var(--sp-4);
}

.checkbox {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  border: 2rpx solid var(--c-neutral-300);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.checkbox--checked {
  background: var(--c-brand);
  border-color: var(--c-brand);
}

.checkbox-check {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 700;
}

.terms-text-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}

.terms-text {
  font-size: var(--fs-xs);
  color: var(--c-text-quaternary);
  line-height: 1.7;
}

.terms-link {
  font-size: var(--fs-xs);
  color: var(--c-brand);
  line-height: 1.7;
}
</style>
