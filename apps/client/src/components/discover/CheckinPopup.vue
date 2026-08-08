<script setup lang="ts">
/**
 * CheckinPopup — 签到弹窗
 *
 * 设计背景（2026-08-08 寻觅页重构）：原匹配页顶部「积分卡 + 签到卡」双卡与
 * 每日一问通栏卡共占约 300rpx 纵向空间，挤占核心匹配卡片区。重构后积分/签到
 * 收敛为搜索栏右侧的轻量入口，点击本弹窗完成全部签到交互：
 * - 常态：我的积分 / 连续签到天数 / 「积分可在商城兑换权益」引导 + 签到按钮
 * - 成功态：积分 +N + 连续天数 + 心形粒子撒花动画（1.5s 后还原）
 *
 * 状态说明：成功态只使用本地 showSuccess，不读 store.showSuccessAnimation
 * （该字段保留给其他签到入口使用）；关闭弹窗时重置本地态，避免重开残留。
 */
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useCheckInStore } from "../../stores/checkin";
import { useDiscoverStore } from "../../stores/discover";
import HeartParticles from "../common/HeartParticles.vue";
import SafeImage from "../common/SafeImage.vue";
import { IMAGE_PATHS } from "../../config/images";
import { openAppPath } from "../../utils/navigation";
import { lightHaptic } from "../../utils/haptic";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const checkInStore = useCheckInStore();
const discoverStore = useDiscoverStore();
const { t } = useI18n();

/** 动画锁：粒子撒花播放期间（1.5s）不响应重复签到 */
const isAnimating = ref(false);
/** 是否展示成功态面板（成功后 1.5s 自动还原） */
const showSuccess = ref(false);

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      showSuccess.value = false;
      isAnimating.value = false;
    }
  }
);

/** 立即签到：成功后同步额外推荐配额到 discover store（当日剩余次数实时更新） */
async function handleCheckIn(): Promise<void> {
  if (isAnimating.value || checkInStore.checkingIn) return;
  try {
    await checkInStore.checkIn();
    if (checkInStore.extraRecommendQuota > 0) {
      discoverStore.setExtraQuota(checkInStore.extraRecommendQuota);
    }
    showSuccess.value = true;
    isAnimating.value = true;
  } catch (_e) {
    // 错误已由 store errorMessage 承载，签到按钮保持可重试
  }
}

/** 粒子动画完成：解锁下次签到 */
function onParticlesDone(): void {
  isAnimating.value = false;
}

/** 去商城兑换（轻振动反馈） */
function goShop(): void {
  lightHaptic();
  openAppPath("/pages/shop/index");
}
</script>

<template>
  <view
    v-if="visible"
    class="checkin-popup"
    role="button"
    :aria-label="t('common.closeAria')"
    @tap="emit('close')"
  >
    <view class="checkin-popup__panel" @tap.stop>
      <view class="checkin-popup__header">
        <text class="checkin-popup__title">{{ t("discover.checkinPopupTitle") }}</text>
        <text
          class="checkin-popup__close"
          role="button"
          :aria-label="t('common.closeAria')"
          @tap="emit('close')"
        >✕</text>
      </view>

      <!-- 成功态：积分 +N + 连续天数 + 撒花动画 -->
      <template v-if="showSuccess">
        <SafeImage
          :src="IMAGE_PATHS.ICONS_COMMON.CHECK"
          custom-class="checkin-popup__success-icon"
          mode="aspectFit"
        />
        <text class="checkin-popup__success-title">{{ t("discover.checkinSuccess") }}</text>
        <text class="checkin-popup__success-points">
          {{ t("discover.checkinPointsEarned", { n: checkInStore.pointsEarned }) }}
        </text>
        <text v-if="checkInStore.consecutiveDaysText" class="checkin-popup__streak">
          {{ checkInStore.consecutiveDaysText }}
        </text>
        <HeartParticles :visible="showSuccess" @done="onParticlesDone" />
      </template>

      <!-- 常态：积分 / 连续天数 / 商城引导 + 签到按钮 -->
      <template v-else>
        <view class="checkin-popup__points">
          <text class="checkin-popup__points-value">{{ checkInStore.pointsBalance }}</text>
          <text class="checkin-popup__points-unit">{{ t("discover.pointsUnit") }}</text>
        </view>
        <text v-if="checkInStore.consecutiveDaysText" class="checkin-popup__streak">
          {{ checkInStore.consecutiveDaysText }}
        </text>
        <text class="checkin-popup__hint">{{ t("discover.pointsHint") }}</text>

        <view
          class="checkin-popup__btn checkin-popup__btn--primary press-feedback"
          :class="{
            'checkin-popup__btn--disabled':
              checkInStore.checkedIn || checkInStore.checkingIn || isAnimating,
          }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="
            checkInStore.checkedIn ? t('discover.alreadyCheckedIn') : t('discover.todayCheckin')
          "
          @tap="handleCheckIn"
        >
          <text class="checkin-popup__btn-text">
            {{
              checkInStore.checkedIn
                ? t("discover.alreadyCheckedIn")
                : checkInStore.checkingIn
                  ? t("common.loading")
                  : t("discover.checkinNow")
            }}
          </text>
        </view>
        <view
          class="checkin-popup__btn checkin-popup__btn--ghost press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('discover.checkinGoShop')"
          @tap="goShop"
        >
          <text class="checkin-popup__btn-text">{{ t("discover.checkinGoShop") }}</text>
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped>
/* ========== 签到弹窗（统一主题色系，替换原积分浅黄/签到浅绿/每日一问浅粉三色拼贴） ========== */

.checkin-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-overlay-strong, rgba(15, 23, 42, 0.7));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  padding: 40rpx;
}

.checkin-popup__panel {
  width: 100%;
  max-width: 640rpx;
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--r-xl, 28rpx);
  padding: var(--sp-6, 32rpx) var(--sp-7, 36rpx) var(--sp-7, 36rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 16rpx 48rpx rgba(15, 23, 42, 0.16);
}

.checkin-popup__header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-5, 28rpx);
}

.checkin-popup__title {
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.checkin-popup__close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-lg, 32rpx);
  color: var(--c-text-tertiary);
}

/* 成功态 */
.checkin-popup__success-icon {
  width: 96rpx;
  height: 96rpx;
  margin: var(--sp-2, 12rpx) 0 var(--sp-3, 16rpx);
}

.checkin-popup__success-title {
  font-size: var(--fs-xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.checkin-popup__success-points {
  margin-top: var(--sp-2, 12rpx);
  font-size: var(--fs-base, 28rpx);
  color: var(--c-brand, #6366f1);
  font-weight: 600;
}

/* 常态：积分大数字 */
.checkin-popup__points {
  display: flex;
  align-items: baseline;
  gap: var(--sp-1, 8rpx);
  margin: var(--sp-3, 16rpx) 0 var(--sp-2, 12rpx);
}

.checkin-popup__points-value {
  font-size: 88rpx;
  font-weight: 800;
  color: var(--c-gold, #d4af37);
  line-height: 1.1;
}

.checkin-popup__points-unit {
  font-size: var(--fs-base, 28rpx);
  color: var(--c-text-tertiary);
}

.checkin-popup__streak {
  font-size: var(--fs-base, 28rpx);
  color: var(--c-text-secondary);
  margin-bottom: var(--sp-2, 12rpx);
}

.checkin-popup__hint {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-tertiary);
  margin-bottom: var(--sp-6, 32rpx);
  text-align: center;
}

.checkin-popup__btn {
  width: 100%;
  height: 88rpx;
  border-radius: var(--r-xl, 28rpx);
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkin-popup__btn--primary {
  background: var(--c-gradient-brand);
}

.checkin-popup__btn--primary.checkin-popup__btn--disabled {
  opacity: 0.55;
}

.checkin-popup__btn--ghost {
  margin-top: var(--sp-3, 16rpx);
  background: var(--c-bg-brand);
  border: 1rpx solid var(--c-border-light);
}

.checkin-popup__btn-text {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
}

.checkin-popup__btn--primary .checkin-popup__btn-text {
  color: var(--c-text-inverse, #ffffff);
}

.checkin-popup__btn--ghost .checkin-popup__btn-text {
  color: var(--c-text-secondary);
}
</style>
