<script setup lang="ts">
/**
 * 未登录等待页（2026-08-25 P0 全面重构）
 *
 * 规格书 12 节要点：
 * - 主标题"正在为你寻找 同频的那个人"（两行）
 * - 副标"附近有 12 位同频的你"
 * - "登录后即可解锁全部功能"
 * - 4 个 icon 行（精确匹配 / 聊天互动 / 校园趣遇 / 关系成长）
 * - 三个按钮：微信一键登录 / 手机号登录 / 稍后再看
 * - 整图为吉祥物+6人围成圈（背景图 IMAGE_PATHS.POSTERS.NOT_LOGGED_WAITING）
 *
 * 缺素材：理想图吉祥物插画（带 6 人围成圈 + 散落爱心）→ 暂用现有 notlogged-waiting.png
 * 全屏可点跳登录；按钮各自处理 goLogin/goPhoneLogin/later。
 */
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";

const { t } = useI18n();
const emit = defineEmits<{
  (e: "goLogin"): void;
  (e: "goPhoneLogin"): void;
}>();

function goWechatLogin() {
  emit("goLogin");
}

function goPhoneLogin() {
  emit("goPhoneLogin");
}

function goLater() {
  // 稍后再看：返回首页（避免停留在不可交互页）
  openAppPath(ROUTES.TAB.HOME);
}
</script>

<template>
  <view class="not-logged">
    <!-- 整图背景（吉祥物+6 人围圈；缺素材时用现有 notlogged-waiting.png） -->
    <image
      class="not-logged__bg"
      :src="IMAGE_PATHS.POSTERS.NOT_LOGGED_WAITING"
      mode="widthFix"
    />

    <!-- 标题 + 副标 + 解锁提示 + 4 icon + 3 按钮（压底） -->
    <view class="not-logged__overlay">
      <view class="not-logged__title-wrap">
        <text class="not-logged__title">{{ t('notLoggedWaiting.title') }}</text>
        <text class="not-logged__subtitle">{{ t('notLoggedWaiting.subtitle') }}</text>
      </view>

      <view class="not-logged__features">
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="IMAGE_PATHS.ICONS_V2.SPROUT" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature1') }}</text>
        </view>
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature2') }}</text>
        </view>
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature3') }}</text>
        </view>
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="IMAGE_PATHS.ICONS_COMMON.HEART_FILLED_SVG" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature4') }}</text>
        </view>
      </view>

      <text class="not-logged__hint">{{ t('notLoggedWaiting.unlockHint') }}</text>

      <view class="not-logged__btn-row">
        <view
          class="not-logged__btn not-logged__btn--primary press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('notLoggedWaiting.wechatLogin')"
          @tap="goWechatLogin"
        >
          <image class="not-logged__btn-icon" :src="IMAGE_PATHS.ICONS_V2.WECHAT_GREEN_SVG" mode="aspectFit" alt="" />
          <text class="not-logged__btn-text not-logged__btn-text--primary">{{ t('notLoggedWaiting.wechatLogin') }}</text>
        </view>
        <view
          class="not-logged__btn not-logged__btn--secondary press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('notLoggedWaiting.phoneLogin')"
          @tap="goPhoneLogin"
        >
          <text class="not-logged__btn-text">{{ t('notLoggedWaiting.phoneLogin') }}</text>
        </view>
        <view
          class="not-logged__btn not-logged__btn--ghost press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('notLoggedWaiting.later')"
          @tap="goLater"
        >
          <text class="not-logged__btn-text not-logged__btn-text--ghost">{{ t('notLoggedWaiting.later') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.not-logged {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: #f6fbfc;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

.not-logged__bg {
  display: block;
  width: 100%;
  height: auto;
}

.not-logged__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 48rpx calc(env(safe-area-inset-bottom) + 60rpx);
}

/* 2026-08-25 P0：主标题/副标（规格书 12.1 / 12.2） */
.not-logged__title-wrap {
  text-align: center;
  margin-bottom: 32rpx;
}

.not-logged__title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #36C99A;
  line-height: 1.4;
  letter-spacing: 2rpx;
}

.not-logged__subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #1A1E1C;
  opacity: 0.7;
}

/* 2026-08-25 P0：4 个 icon 行（规格书 12.6） */
.not-logged__features {
  display: flex;
  justify-content: space-between;
  width: 100%;
  /* V-05（第五轮 QA）：4 icon 行加左右留白，避免贴屏幕边缘 */
  padding: 0 8rpx;
  margin-bottom: 32rpx;
}

.not-logged__feature {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.not-logged__feature-icon {
  width: 64rpx;
  height: 64rpx;
}

.not-logged__feature-label {
  font-size: 22rpx;
  color: #6B7571;
  text-align: center;
}

/* 2026-08-25 P0：解锁提示（规格书 12.5） */
.not-logged__hint {
  font-size: 22rpx;
  color: #9AA39F;
  margin-bottom: 28rpx;
}

/* 2026-08-25 P0：3 个按钮（规格书 12.7 / 12.8 / 12.9） */
.not-logged__btn-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  /* V-05（第五轮 QA）：3 按钮间距 20→24rpx，视觉分层更清晰 */
  gap: 24rpx;
}

.not-logged__btn {
  width: 100%;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.not-logged__btn--primary {
  background: linear-gradient(135deg, #36C99A 0%, #2DB97A 100%);
  box-shadow: 0 8rpx 24rpx rgba(54, 201, 154, 0.32);
}

.not-logged__btn--secondary {
  background: #FFFFFF;
  border: 2rpx solid #36C99A;
}

.not-logged__btn--ghost {
  background: #F2F5F4;
  border: none;
}

.not-logged__btn-icon {
  width: 32rpx;
  height: 32rpx;
}

.not-logged__btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1E1C;
  letter-spacing: 2rpx;
}

.not-logged__btn-text--primary {
  color: #FFFFFF;
}

.not-logged__btn-text--ghost {
  color: #9AA39F;
  font-weight: 500;
}
</style>
