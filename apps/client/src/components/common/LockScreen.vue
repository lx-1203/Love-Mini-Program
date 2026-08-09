<script setup lang="ts">
/**
 * LockScreen - 权限拦截全屏引导页
 *
 * 未登录 / 未完成基础资料填写的用户访问受限功能时展示：
 * - 未登录：主文案侧重「登录」，主按钮先登录、登录成功后自动进入资料完善页；
 * - 已登录但资料未完善：主文案侧重「完善资料」，主按钮直接进入资料完善页；
 * - 提供「× 关闭」（返回上一可浏览页）与「先逛逛公开内容」备选路径，弱化强制感；
 * - 权益清单具象化完善资料的收益，提升转化意愿。
 *
 * 布局说明：原实现依赖父容器高度（height:100%），而宿主页面仅设置 min-height:100%，
 * 百分比高度退化为 auto，导致内容堆在屏幕上半区、下半屏空白。
 * 现改为 min-height:100vh 全屏铺满，内容纵向居中，底部提示贴近屏底。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
// R4-00229：路径走 ROUTES / SUBPACKAGE_ROUTES 常量
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";
// 2026-08-09：未登录「立即登录并完善」→ 登录成功后自动进入资料完善页
import { openAppPath, replaceAppPath, isTabPath, setPendingLoginRedirect } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
// compat 的 getCurrentPagePath（含 H5/MP 平台差异处理），用于判断是否处于 Tab 页（底部有 TabBar）
import { getCurrentPagePath } from "../../compat";

const { t } = useI18n();

const props = defineProps<{
  /** 当前资料完善度百分比（已登录未完善时展示进度） */
  completionPercent?: number;
}>();

const sessionStore = useSessionStore();
/** 是否已登录：决定主文案 / 主按钮 / 行为分支 */
const loggedIn = computed(() => sessionStore.isLoggedIn);

/** 主标题：未登录侧重登录授权，已登录未完善侧重完善资料 */
const title = computed(() => t(loggedIn.value ? "lock.titleLoggedIn" : "lock.titleLoggedOut"));

/** 副标题：具象化说明完善后可获得的能力 */
const subtitle = computed(() =>
  t(loggedIn.value ? "lock.subtitleLoggedIn" : "lock.subtitleLoggedOut")
);

/** 主按钮文案 */
const primaryText = computed(() =>
  t(loggedIn.value ? "lock.primaryLoggedIn" : "lock.primaryLoggedOut")
);

/** 完善进度（已登录且进度 >0 时展示，支持中途退出后继续完善） */
const progressText = computed(() => {
  if (
    loggedIn.value &&
    props.completionPercent !== undefined &&
    props.completionPercent > 0
  ) {
    return t("lock.completionProgress", { n: props.completionPercent });
  }
  return "";
});

/** 权益清单：具象化完善资料的收益 */
const benefits = computed(() => [
  t("lock.benefitMatch"),
  t("lock.benefitCampus"),
  t("lock.benefitChat"),
]);

/**
 * 是否处于 Tab 页（底部有固定 TabBar）。
 * Tab 页中引导页底部需为 TabBar 预留空间，避免底部提示被遮挡。
 */
const isTabHost = isTabPath(getCurrentPagePath() ?? "");

/**
 * 主操作：
 * - 未登录：记录「登录后待跳转资料完善」→ 跳登录页；
 * - 已登录未完善：直接进入资料完善页。
 */
function onPrimary() {
  if (!loggedIn.value) {
    setPendingLoginRedirect(SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE);
    replaceAppPath(ROUTES.LOGIN);
    return;
  }
  openAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE);
}

/**
 * 「×」关闭：返回上一个可浏览的公开页面。
 * - 页面栈有上一页（如从喜欢/心动信号 navigateTo 进入）→ navigateBack；
 * - Tab 直达（栈深为 1）→ 切换到公开 Tab（匹配推荐页，无拦截可正常浏览）。
 */
function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: ROUTES.TAB.DISCOVER });
  }
}

/** 「先逛逛公开内容」：切换到公开 Tab（匹配推荐页），保留游客浏览路径 */
function browsePublic() {
  uni.switchTab({ url: ROUTES.TAB.DISCOVER });
}
</script>

<template>
  <view
    class="lock-screen"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <!-- 径向渐变心动氛围叠加层 -->
    <view class="lock-screen__atmosphere" />

    <!-- 模糊头像装饰背景 -->
    <view class="lock-screen__decoration">
      <view class="blur-avatar blur-avatar--1" />
      <view class="blur-avatar blur-avatar--2" />
      <view class="blur-avatar blur-avatar--3" />
      <view class="blur-avatar blur-avatar--4" />
      <view class="blur-avatar blur-avatar--5" />
    </view>

    <!-- 顶部操作区：× 关闭按钮（返回上一个可浏览页面） -->
    <button
      class="lock-screen__close"
      @tap="goBack"
      :aria-label="t('lock.closeAria')"
    >
      <image
        class="lock-screen__close-icon"
        :src="IMAGE_PATHS.ICONS_COMMON.CLOSE_SVG"
        mode="aspectFit"
        alt=""
      />
    </button>

    <!-- 主体内容区（纵向铺满并居中） -->
    <view class="lock-screen__body">
      <!-- 主题插画：解锁徽章 + 同校头像 + 漂浮爱心（对应「解锁同校匹配」） -->
      <view class="lock-screen__illustration">
        <view class="illustration__ring">
          <image
            class="illustration__lock"
            :src="IMAGE_PATHS.ICONS_COMMON.LOCK_SVG"
            mode="aspectFit"
            alt=""
          />
          <view class="illustration__badge">
            <image
              class="illustration__badge-icon"
              :src="IMAGE_PATHS.ICONS_COMMON.CHECK_CIRCLE_SVG"
              mode="aspectFit"
              alt=""
            />
          </view>
        </view>
        <view class="illustration__avatar illustration__avatar--left">
          <image
            class="illustration__avatar-img"
            :src="IMAGE_PATHS.AVATARS.AVATAR_1"
            mode="aspectFill"
            alt=""
          />
        </view>
        <view class="illustration__avatar illustration__avatar--right">
          <image
            class="illustration__avatar-img"
            :src="IMAGE_PATHS.AVATARS.AVATAR_2"
            mode="aspectFill"
            alt=""
          />
        </view>
        <view class="illustration__heart illustration__heart--1">
          <image
            class="illustration__heart-img"
            :src="IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED"
            mode="aspectFit"
            alt=""
          />
        </view>
        <view class="illustration__heart illustration__heart--2">
          <image
            class="illustration__heart-img"
            :src="IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED"
            mode="aspectFit"
            alt=""
          />
        </view>
      </view>

      <!-- 核心文案 + 权益清单 -->
      <view class="lock-screen__content">
        <text class="lock-screen__title">{{ title }}</text>
        <text class="lock-screen__subtitle">{{ subtitle }}</text>
        <text v-if="progressText" class="lock-screen__progress">{{ progressText }}</text>
        <view class="lock-screen__benefits">
          <view v-for="benefit in benefits" :key="benefit" class="benefit">
            <image
              class="benefit__icon"
              :src="IMAGE_PATHS.ICONS_COMMON.CHECK_CIRCLE_SVG"
              mode="aspectFit"
              alt=""
            />
            <text class="benefit__text">{{ benefit }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮区：主按钮 + 备选路径 -->
      <view class="lock-screen__action">
        <button
          class="lock-screen__btn"
          @tap="onPrimary"
          :aria-label="t('lock.completeNowAria')"
        >
          <text class="lock-screen__btn-text">{{ primaryText }}</text>
        </button>
        <view class="lock-screen__btn-link" @tap="browsePublic">
          <text class="lock-screen__btn-link-text">{{ t('lock.secondary') }}</text>
        </view>
      </view>
    </view>

    <!-- 底部补充提示（贴近屏底） -->
    <view class="lock-screen__footer" :class="{ 'lock-screen__footer--tab': isTabHost }">
      <text class="lock-screen__footer-text">{{ t('lock.footerTip') }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   权限拦截全屏引导页
   - 修复（2026-08-09）：原 height:100% 依赖父容器确定高度，而宿主页面
     仅有 min-height:100%（height 不定），百分比高度退化为 auto，
     内容堆在屏幕上半区、下半屏空白。现改用 min-height:100vh 全屏铺满。
   ================================================================ */
.lock-screen {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--c-gradient-page);
}

/* ========== 径向渐变心动氛围叠加层（M-14） ========== */
/* R4-02512：以下为品牌色低不透明度氛围光晕（青藤绿/浪漫粉的 alpha 混色），
   品牌色在深色模式下保持不变（tokens.scss 设计约定），
   低 alpha 光晕在深色底上同样成立，无需暗色覆盖。
   R4-02166~169：以下 4 处 rgba 氛围渐变（浪漫粉/绿氛围渐变），无对应 token，保留原值。 */
.lock-screen__atmosphere {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(ellipse at 20% 20%, rgba(63, 207, 142, 0.18) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 30%, rgba(249, 168, 196, 0.2) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 80%, rgba(124, 217, 166, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 15% 70%, rgba(244, 114, 182, 0.12) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

/* ========== 模糊头像装饰（增强若隐若现感 M-14） ========== */
.lock-screen__decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.blur-avatar {
  position: absolute;
  border-radius: var(--r-full);
  /* #ifndef MP-WEIXIN */
  /* H5 / App 端：使用 filter:blur 实现真实模糊效果 */
  filter: blur(40rpx); /* 固定布局尺寸（模糊半径），无对应 token */
  /* #endif */
  /* #ifdef MP-WEIXIN */
  /* mp-weixin 不支持 filter:blur，用半透明遮罩 + 提升 opacity 兜底模拟若隐若现感 */
  opacity: 0.25;
  /* #endif */

  &--1 {
    width: 320rpx;
    height: 320rpx;
    top: -80rpx;
    left: -100rpx;
    background: linear-gradient(135deg, var(--c-brand-200), var(--c-brand-400));
    opacity: 0.15;
  }

  &--2 {
    width: 280rpx;
    height: 280rpx;
    top: 100rpx; /* 固定布局尺寸（装饰头像偏移），无对应 token */
    right: -80rpx;
    background: linear-gradient(135deg, var(--c-romance-200), var(--c-romance-400));
    opacity: 0.12;
  }

  &--3 {
    width: 360rpx;
    height: 360rpx;
    top: 200rpx;
    left: -60rpx;
    background: linear-gradient(135deg, var(--c-brand-100), var(--c-brand-300));
    opacity: 0.1;
  }

  &--4 {
    width: 240rpx;
    height: 240rpx;
    bottom: 200rpx; /* 固定布局尺寸（装饰头像偏移），无对应 token */
    right: -40rpx;
    background: linear-gradient(135deg, var(--c-romance-100), var(--c-romance-300));
    opacity: 0.13;
  }

  &--5 {
    width: 200rpx;
    height: 200rpx;
    bottom: -60rpx;
    left: 20%;
    background: linear-gradient(135deg, var(--c-brand-200), var(--c-romance-200));
    opacity: 0.12;
  }
}

/* ========== 顶部操作区：× 关闭按钮 ========== */
.lock-screen__close {
  position: absolute;
  top: calc(env(safe-area-inset-top) + var(--sp-3));
  left: var(--sp-5);
  z-index: 2;
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-circle);
  background: var(--c-overlay-white-bg-mid, rgba(255, 255, 255, 0.6));
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
  &::after {
    border: none;
  }
}

.lock-screen__close:active {
  transform: scale(0.92);
}

.lock-screen__close-icon {
  width: 40rpx;
  height: 40rpx;
}

/* ========== 主体内容区：纵向铺满并居中 ========== */
.lock-screen__body {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: calc(env(safe-area-inset-top) + var(--sp-8)) var(--sp-8) var(--sp-6);
}

/* ========== 主题插画：解锁徽章 + 同校头像 + 漂浮爱心 ========== */
.lock-screen__illustration {
  position: relative;
  width: 440rpx;
  height: 400rpx;
  margin-bottom: var(--sp-8);
}

/* 解锁徽章圆环（品牌渐变，承载锁图标与完成对勾） */
.illustration__ring {
  position: absolute;
  top: 30rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 280rpx;
  height: 280rpx;
  border-radius: var(--r-circle);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.illustration__lock {
  width: 120rpx;
  height: 120rpx;
}

/* 完成对勾徽章：右下角白色圆底 + 绿色对勾 */
.illustration__badge {
  position: absolute;
  right: -12rpx;
  bottom: -12rpx;
  width: 76rpx;
  height: 76rpx;
  border-radius: var(--r-circle);
  background: var(--c-bg-container);
  border: 6rpx solid var(--c-gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-sm);
}

.illustration__badge-icon {
  width: 48rpx;
  height: 48rpx;
}

/* 同校头像：环左右两侧，暗示「同校匹配」 */
.illustration__avatar {
  position: absolute;
  bottom: 0;
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--r-circle);
  border: 8rpx solid var(--c-bg-container);
  box-shadow: var(--s-lg);
  overflow: hidden;

  &--left {
    left: 40rpx;
  }

  &--right {
    right: 40rpx;
  }
}

.illustration__avatar-img {
  width: 100%;
  height: 100%;
}

/* 漂浮爱心点缀 */
.illustration__heart {
  position: absolute;
  width: 52rpx;
  height: 52rpx;

  &--1 {
    top: 0;
    left: 60rpx;
    animation: float var(--d-loop-slow, 2000ms) ease-in-out infinite;
  }

  &--2 {
    top: 60rpx;
    right: 36rpx;
    width: 40rpx;
    height: 40rpx;
    animation: float var(--d-loop, 1500ms) ease-in-out infinite;
  }
}

.illustration__heart-img {
  width: 100%;
  height: 100%;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-16rpx) scale(1.1);
  }
}

/* ========== 核心文案 + 权益清单 ========== */
.lock-screen__content {
  width: 100%;
  max-width: 560rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
}

.lock-screen__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
  line-height: 1.4;
}

.lock-screen__subtitle {
  font-size: var(--fs-lg);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.5;
}

.lock-screen__progress {
  font-size: var(--fs-base);
  color: var(--c-brand);
  text-align: center;
}

/* 权益清单：左对齐，勾选图标 + 文案 */
.lock-screen__benefits {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-6);
}

.benefit {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.benefit__icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.benefit__text {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
}

/* ========== 操作按钮区：主按钮 + 备选路径 ========== */
.lock-screen__action {
  width: 100%;
  max-width: 560rpx;
  margin-top: var(--sp-8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
}

.lock-screen__btn {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-brand-lg);
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.lock-screen__btn:active {
  transform: scale(0.98);
}

.lock-screen__btn-text {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--c-neutral-0);
}

/* 次按钮：文字链接（先逛逛公开内容） */
.lock-screen__btn-link {
  padding: var(--sp-2) var(--sp-6);
  transition: opacity var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.lock-screen__btn-link:active {
  opacity: 0.6;
}

.lock-screen__btn-link-text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

/* ========== 底部补充提示 ========== */
.lock-screen__footer {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding: var(--sp-4) var(--sp-8) calc(env(safe-area-inset-bottom) + var(--sp-6));
}

/* Tab 页宿主：底部为固定 TabBar 预留空间，避免提示被遮挡 */
.lock-screen__footer--tab {
  padding-bottom: calc(env(safe-area-inset-bottom) + 112rpx);
}

.lock-screen__footer-text {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}
</style>
