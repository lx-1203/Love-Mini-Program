<script setup lang="ts">
/**
 * 学校圈认证门（SchoolCircleGate）
 *
 * 2026-08-08 频道化重构：学校认证聊天圈门槛。
 * 未认证用户进入学校圈频道时展示：渐变引导卡 + 「去认证」主按钮 + 「模拟认证一键通过（演示）」次按钮。
 *
 * 修复（R4-00055）：模拟按钮不再无条件渲染——真实生产模式任意用户可一键绕过校园认证，
 * 认证信任体系与合规风险。现仅开发环境（isDev）显示；生产构建完全移除。
 * 纯前端 mock 模式下 mock 会话初始即 campusVerified=true，认证门本不会出现。
 */
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
// R4-00055: 模拟认证按钮仅限开发环境（生产移除）
import { isDev } from "../../config/env";

const emit = defineEmits<{
  (e: "go-certification"): void;
  (e: "simulate-verify"): void;
}>();

const { t } = useI18n();
</script>

<template>
  <view class="school-gate">
    <view class="school-gate__card">
      <!-- 头部图标区（学士帽渐变底） -->
      <view class="school-gate__icon-wrap">
        <image class="school-gate__icon" :src="IMAGE_PATHS.ICONS_EMOJI.GRAD_CAP" mode="aspectFit" alt="" />
        <view class="school-gate__lock-wrap">
          <image class="school-gate__lock" :src="IMAGE_PATHS.ICONS_EMOJI.LOCK" mode="aspectFit" alt="" />
        </view>
      </view>

      <text class="school-gate__title">{{ t('village.schoolGateTitle') }}</text>
      <text class="school-gate__desc">{{ t('village.schoolGateDesc') }}</text>

      <view class="school-gate__points">
        <view class="school-gate__point">
          <image class="school-gate__point-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE" mode="aspectFit" alt="" />
          <text class="school-gate__point-text">{{ t('village.schoolGatePoint1') }}</text>
        </view>
        <view class="school-gate__point">
          <image class="school-gate__point-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE" mode="aspectFit" alt="" />
          <text class="school-gate__point-text">{{ t('village.schoolGatePoint2') }}</text>
        </view>
      </view>

      <!-- 主按钮：去认证 -->
      <view
        class="school-gate__btn press-feedback"
        hover-class="school-gate__btn--pressed"
        hover-stay-time="120"
        role="button"
        :aria-label="t('village.schoolGateBtn')"
        @tap="emit('go-certification')"
      >
        <text class="school-gate__btn-text">{{ t('village.schoolGateBtn') }}</text>
      </view>

      <!-- 次按钮：模拟认证一键通过（演示；R4-00055 仅开发环境显示，生产构建移除） -->
      <view
        v-if="isDev"
        class="school-gate__simulate press-feedback"
        hover-class="school-gate__simulate--pressed"
        hover-stay-time="120"
        role="button"
        :aria-label="t('village.schoolGateSimulate')"
        @tap="emit('simulate-verify')"
      >
        <text class="school-gate__simulate-text">{{ t('village.schoolGateSimulate') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   SchoolCircleGate - 学校圈认证门
   ================================================================ */
.school-gate {
  padding: var(--sp-6) var(--sp-4);
}

.school-gate__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-8) var(--sp-6);
  border-radius: var(--r-xl);
  background: var(--c-gradient-brand-soft, linear-gradient(180deg, #f0fdf9 0%, #ffffff 60%));
  border: 1rpx solid var(--c-brand-100, #ccfbef);
}

.school-gate__icon-wrap {
  position: relative;
  width: 128rpx;
  height: 128rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

.school-gate__icon {
  width: 72rpx;
  height: 72rpx;
}

.school-gate__lock-wrap {
  position: absolute;
  right: -4rpx;
  bottom: -4rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-brand-100, #ccfbef);
  display: flex;
  align-items: center;
  justify-content: center;
}

.school-gate__lock {
  width: 26rpx;
  height: 26rpx;
}

.school-gate__title {
  font-size: var(--fs-xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.school-gate__desc {
  font-size: var(--fs-base, 28rpx);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.6;
}

.school-gate__points {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: var(--sp-2);
}

.school-gate__point {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.school-gate__point-icon {
  width: 28rpx;
  height: 28rpx;
}

.school-gate__point-text {
  font-size: 24rpx;
  color: var(--c-text-tertiary);
}

.school-gate__btn {
  width: 100%;
  margin-top: var(--sp-3);
  padding: var(--sp-4) 0;
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

.school-gate__btn--pressed {
  transform: scale(0.98);
  opacity: 0.92;
}

.school-gate__btn-text {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: var(--c-neutral-0);
}

.school-gate__simulate {
  margin-top: var(--sp-2);
  padding: var(--sp-3) var(--sp-6);
  border-radius: var(--r-full);
  border: 1rpx dashed var(--c-romance-300, #f9a8d4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.school-gate__simulate--pressed {
  background: var(--c-bg-romance-soft, #fdf2f8);
}

.school-gate__simulate-text {
  font-size: 24rpx;
  font-weight: 500;
  color: var(--c-romance-500, #ec4899);
}
</style>
