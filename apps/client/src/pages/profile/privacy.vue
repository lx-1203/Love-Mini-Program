<script setup lang="ts">
/**
 * 权限设置 - 同校推荐开关（Phase Feedback5）
 *
 * - allowSameSchoolRecommend：是否把自己的信息推荐给本校学生（默认关）
 * - receiveSameSchoolInfo：是否接收同校学生的信息（默认开）
 *
 * 注意：允许"接收同校信息"但默认不"推荐给本校"，
 * 符合反馈"是自己的信息推给别人，但可以收到同校的信息，尤其重要"。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useProfileStore } from "../../stores/profile";
import { designTokens } from "../../theme/tokens";

const { t } = useI18n();
const profileStore = useProfileStore();

/** 是否允许推荐给本校学生 */
const allowRecommend = computed({
  get: () => profileStore.allowSameSchoolRecommend,
  set: (val: boolean) => {
    profileStore.setAllowSameSchoolRecommend(val);
    uni.showToast({ title: t("profile.privacySaved"), icon: "success" });
  },
});

/** 是否接收同校信息 */
const receiveInfo = computed({
  get: () => profileStore.receiveSameSchoolInfo,
  set: (val: boolean) => {
    profileStore.setReceiveSameSchoolInfo(val);
    uni.showToast({ title: t("profile.privacySaved"), icon: "success" });
  },
});

/** switch change 事件处理（允许推荐给本校学生） */
function onAllowRecommendChange(e: Event) {
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail;
  allowRecommend.value = !!detail?.value;
}

/** switch change 事件处理（接收同校信息） */
function onReceiveInfoChange(e: Event) {
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail;
  receiveInfo.value = !!detail?.value;
}

/** 返回上一页 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: "/pages/profile/index" });
  }
}
</script>

<template>
  <view class="privacy-page page-fade-in">
    <!-- 顶部栏 -->
    <view class="privacy-page__header">
      <view class="privacy-page__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="privacy-page__back-text">‹</text>
      </view>
      <text class="privacy-page__title">{{ t('profile.privacyPermission') }}</text>
      <view class="privacy-page__header-spacer" />
    </view>

    <!-- 开关列表 -->
    <view class="privacy-page__section">
      <view class="privacy-item">
        <view class="privacy-item__info">
          <text class="privacy-item__title">{{ t('profile.allowSameSchoolRecommend') }}</text>
          <text class="privacy-item__desc">{{ t('profile.allowSameSchoolRecommendDesc') }}</text>
        </view>
        <switch
          :checked="allowRecommend"
          :color="designTokens.color.brand[500]"
          @change="onAllowRecommendChange"
        />      </view>

      <view class="privacy-item">
        <view class="privacy-item__info">
          <text class="privacy-item__title">{{ t('profile.receiveSameSchoolInfo') }}</text>
          <text class="privacy-item__desc">{{ t('profile.receiveSameSchoolInfoDesc') }}</text>
        </view>
        <switch
          :checked="receiveInfo"
          :color="designTokens.color.brand[500]"
          @change="onReceiveInfoChange"
        />
      </view>
    </view>

    <!-- 底部留白 -->
    <view class="privacy-page__footer-space" />
  </view>
</template>

<style scoped lang="scss">
.privacy-page {
  min-height: 100vh;
  background: var(--c-bg-page, #f4f6fa);
  padding-bottom: env(safe-area-inset-bottom);
}

.privacy-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--sp-4) + env(safe-area-inset-top)) var(--sp-4) var(--sp-3);
  background: linear-gradient(135deg, var(--c-brand-500, #3fcf8e) 0%, var(--c-brand-400, #6fe0b0) 100%);
}

.privacy-page__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.2));
}

.privacy-page__back-text {
  font-size: var(--fs-3xl, 40rpx);
  color: var(--c-text-inverse, #ffffff);
  line-height: 1;
}

.privacy-page__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.privacy-page__header-spacer {
  width: 64rpx;
}

.privacy-page__section {
  margin: var(--sp-5) var(--sp-4);
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
  overflow: hidden;
}

.privacy-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-5);
  border-bottom: 1rpx solid var(--c-divider-light, #f0f0f0);
}

.privacy-item:last-child {
  border-bottom: none;
}

.privacy-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.privacy-item__title {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary, #1f2937);
}

.privacy-item__desc {
  font-size: var(--fs-xs, 24rpx);
  color: var(--c-text-tertiary, #9ca3af);
  line-height: 1.5;
}

.privacy-page__footer-space {
  height: 120rpx;
}
</style>
