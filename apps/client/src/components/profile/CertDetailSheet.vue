<script setup lang="ts">
/**
 * CertDetailSheet — 认证成就半屏详情面板（2026-08-13，B5）
 *
 * 点击个人主页认证名牌任一枚后弹出：占据下半屏，展示三级认证的
 * 获得状态与专业性详情（认证方式 / 审核标准 / 可信度 / 隐私承诺），
 * 凸显认证体系的专业与严谨（参考青藤认证页 + 仓库 CardSwiper cert-modal 范式）。
 *
 * 未获得的认证项提供「去认证」按钮：
 * - 实名 → /pages/verification/real-name
 * - 学历 → /pages/campus/certification（未实名时提示先实名）
 */
import { ref, watch, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";
import type { CertBadgeItem } from "./CertBadgeRow.vue";

const props = defineProps<{
  visible: boolean;
  badges: CertBadgeItem[];
  /** 查看他人主页时为 false（不显示去认证按钮） */
  ownProfile: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { t } = useI18n();

/** 关闭动画进行中（200ms 出场后 emit close） */
const closing = ref(false);
let closeTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.visible,
  (val) => {
    if (!val) {
      closing.value = false;
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    }
  }
);

onUnmounted(() => {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
});

function requestClose(): void {
  if (closing.value) return;
  closing.value = true;
  closeTimer = setTimeout(() => {
    closeTimer = null;
    closing.value = false;
    emit("close");
  }, 200);
}

/** 按 id 取认证信息（名称/方式/审核标准） */
function certInfo(id: CertBadgeItem["id"]) {
  const info = {
    age: {
      title: t("profile.certBadgeNames.age"),
      method: t("profile.certSheetAgeMethod"),
      desc: t("profile.certSheetAgeDesc"),
      reliability: t("discover.certMachineReliability"),
    },
    realname: {
      title: t("profile.certBadgeNames.realname"),
      method: t("profile.certSheetRealNameMethod"),
      desc: t("profile.certSheetRealNameDesc"),
      reliability: t("discover.certHumanReliability"),
    },
    education: {
      title: t("profile.certBadgeNames.education"),
      method: t("profile.certSheetEducationMethod"),
      desc: t("profile.certSheetEducationDesc"),
      reliability: t("discover.certHumanReliability"),
    },
  } as const;
  return info[id];
}

/** 是否已获得某级认证 */
function isEarned(id: CertBadgeItem["id"]): boolean {
  return props.badges.find((b) => b.id === id)?.earned ?? false;
}

/** 是否已实名（用于学历「去认证」前置判断） */
function isRealNameEarned(): boolean {
  return isEarned("realname");
}

/** 去认证跳转 */
function goCertify(id: CertBadgeItem["id"]): void {
  if (id === "education" && !isRealNameEarned()) {
    uni.showToast({ title: t("profile.certRealNameFirst"), icon: "none" });
    return;
  }
  if (id === "realname") {
    openAppPath(ROUTES.REAL_NAME_CERTIFICATION);
    return;
  }
  if (id === "education") {
    openAppPath(ROUTES.CAMPUS.CERTIFICATION);
    return;
  }
}
</script>

<template>
  <view
    v-if="visible"
    class="cert-sheet-mask"
    :class="{ 'cert-sheet-mask--closing': closing }"
    role="dialog"
    aria-modal="true"
    :aria-label="t('profile.certSheetTitle')"
    @tap="requestClose"
  >
    <view class="cert-sheet" :class="{ 'cert-sheet--closing': closing }" @tap.stop>
      <view class="cert-sheet__handle" />
      <view class="cert-sheet__header">
        <text class="cert-sheet__title">{{ t('profile.certSheetTitle') }}</text>
        <view
          class="cert-sheet__close press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('common.closeAria')"
          @tap="requestClose"
        >
          <text class="cert-sheet__close-text">×</text>
        </view>
      </view>
      <text class="cert-sheet__subtitle">{{ t('profile.certSheetSubtitle') }}</text>

      <scroll-view scroll-y class="cert-sheet__scroll" :show-scrollbar="false">
        <!-- 三级认证卡片 -->
        <view
          v-for="badge in props.badges"
          :key="badge.id"
          class="cert-item"
          :class="{ 'cert-item--pending': !badge.earned }"
        >
          <view class="cert-item__head">
            <image class="cert-item__icon" :src="badge.icon" mode="aspectFit" alt="" />
            <text class="cert-item__title">{{ certInfo(badge.id).title }}</text>
            <view class="cert-item__status" :class="badge.earned ? 'cert-item__status--earned' : 'cert-item__status--pending'">
              <text class="cert-item__status-text">
                {{ badge.earned ? t('profile.certSheetEarned') : t('profile.certSheetNotEarned') }}
              </text>
            </view>
          </view>
          <!-- 学历认证三层核验细则 -->
          <view v-if="badge.id === 'education' && badge.earned" class="cert-item__triple">
            <view class="cert-item__triple-row">
              <view class="cert-item__triple-dot cert-item__triple-dot--machine" />
              <text class="cert-item__triple-text">{{ t('profile.certEduTriple.machine') }}</text>
            </view>
            <view class="cert-item__triple-row">
              <view class="cert-item__triple-dot cert-item__triple-dot--human" />
              <text class="cert-item__triple-text">{{ t('profile.certEduTriple.human') }}</text>
            </view>
            <view class="cert-item__triple-row">
              <view class="cert-item__triple-dot cert-item__triple-dot--chsi" />
              <text class="cert-item__triple-text">{{ t('profile.certEduTriple.chsi') }}</text>
            </view>
          </view>
          <view class="cert-item__body">
            <view class="cert-item__row">
              <text class="cert-item__label">{{ t('discover.certMethodLabel') }}</text>
              <text class="cert-item__value">{{ certInfo(badge.id).method }}</text>
            </view>
            <view class="cert-item__row">
              <text class="cert-item__label">{{ t('discover.certReliabilityLabel') }}</text>
              <text class="cert-item__value cert-item__value--reliability">{{ certInfo(badge.id).reliability }}</text>
            </view>
            <view class="cert-item__row">
              <text class="cert-item__label">{{ t('profile.certSheetStandardLabel') }}</text>
              <text class="cert-item__value">{{ certInfo(badge.id).desc }}</text>
            </view>
          </view>
          <!-- 去认证（仅自己的主页且未获得） -->
          <view
            v-if="ownProfile && !badge.earned"
            class="cert-item__go press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('profile.certSheetGo')"
            @tap="goCertify(badge.id)"
          >
            <text class="cert-item__go-text">{{ t('profile.certSheetGo') }}</text>
          </view>
        </view>

        <!-- 隐私承诺 -->
        <view class="cert-sheet__privacy">
          <image
            class="cert-sheet__privacy-icon"
            src="/static/assets/icons/common/lock.png"
            mode="aspectFit"
            alt=""
          />
          <text class="cert-sheet__privacy-text">{{ t('profile.certSheetPrivacy') }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cert-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-overlay-mid-strong, rgba(15, 23, 42, 0.5));
  display: flex;
  align-items: flex-end;
  z-index: 95;
  animation: overlay-fade-in var(--d-slow, 250ms) cubic-bezier(0.4, 0, 0.2, 1) both;
}

.cert-sheet-mask--closing {
  animation: overlay-fade-out var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1) both;
}

.cert-sheet {
  width: 100%;
  max-height: 72vh;
  background: var(--c-bg-container, #ffffff);
  border-radius: 32rpx 32rpx 0 0;
  padding: 16rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  animation: cert-sheet-slide-up var(--d-normal, 200ms) ease-out;
}

.cert-sheet--closing {
  animation: cert-sheet-slide-down var(--d-normal, 200ms) ease-in both;
}

@keyframes cert-sheet-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes cert-sheet-slide-down {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

.cert-sheet__handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: var(--c-neutral-200, #e2e8f0);
  align-self: center;
  margin-bottom: var(--sp-3, 16rpx);
}

.cert-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-2, 12rpx);
}

.cert-sheet__title {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 800;
  color: var(--c-text-primary);
}

.cert-sheet__close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-surface, #fafbfc);
}

.cert-sheet__close-text {
  font-size: var(--fs-2xl, 32rpx);
  color: var(--c-text-secondary);
  line-height: 1;
}

.cert-sheet__subtitle {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-tertiary);
  margin-bottom: var(--sp-4, 20rpx);
}

.cert-sheet__scroll {
  max-height: 52vh;
}

.cert-item {
  padding: var(--sp-4, 20rpx);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-surface, #fafbfc);
  border: 1rpx solid var(--c-overlay-border-light, #e2e8f0);
  margin-bottom: var(--sp-3, 16rpx);
}

.cert-item--pending {
  opacity: 0.75;
}

.cert-item__head {
  display: flex;
  align-items: center;
  gap: var(--sp-2, 12rpx);
  margin-bottom: var(--sp-3, 16rpx);
}

.cert-item__icon {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.cert-item__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary);
  flex: 1;
}

.cert-item__status {
  padding: 4rpx 14rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.cert-item__status--earned {
  background: var(--c-brand-50, #f0fdf9);
  border: 1rpx solid var(--c-brand-200, #99f6e0);
}

.cert-item__status--pending {
  background: var(--c-neutral-100, #f1f5f9);
  border: 1rpx solid var(--c-neutral-200, #e2e8f0);
}

.cert-item__status-text {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 600;
}

.cert-item__status--earned .cert-item__status-text {
  color: var(--c-brand-600, #0d9488);
}

.cert-item__status--pending .cert-item__status-text {
  color: var(--c-text-tertiary);
}

/* 学历三层核验细则 */
.cert-item__triple {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: var(--sp-2, 12rpx) var(--sp-3, 16rpx);
  border-radius: var(--r-lg, 16rpx);
  background: var(--c-bg-brand, #e8f8f0);
  margin-bottom: var(--sp-3, 16rpx);
}

.cert-item__triple-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.cert-item__triple-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.cert-item__triple-dot--machine { background: #4f8ef7; }
.cert-item__triple-dot--human { background: var(--c-brand-500, #3fcf8e); }
.cert-item__triple-dot--chsi { background: #c9a36a; }

.cert-item__triple-text {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-brand-800, #065f46);
  font-weight: 600;
}

.cert-item__body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.cert-item__row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2, 12rpx);
}

.cert-item__label {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
  width: 120rpx;
}

.cert-item__value {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-primary);
  line-height: 1.6;
  flex: 1;
}

.cert-item__value--reliability {
  color: var(--c-brand-600, #0d9488);
  font-weight: 700;
}

.cert-item__go {
  margin-top: var(--sp-3, 16rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-brand, linear-gradient(135deg, #3fcf8e, #6fe0b0));
}

.cert-item__go-text {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: var(--c-text-inverse, #ffffff);
}

.cert-sheet__privacy {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2, 12rpx);
  padding: var(--sp-3, 16rpx);
  border-radius: var(--r-lg, 16rpx);
  background: var(--c-neutral-50, #f8fafc);
}

.cert-sheet__privacy-icon {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.cert-sheet__privacy-text {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary);
  line-height: 1.6;
}
</style>
