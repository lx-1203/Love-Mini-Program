<script setup lang="ts">
/**
 * 个人主页双 Tab 切换器（2026-08-14 主页重构：资料 / 动态）。
 * 纯展示组件：只负责渲染 Tab 栏并上报切换事件，内容由父页面按 active 渲染。
 */
import { useI18n } from "vue-i18n";

defineProps<{
  /** 当前激活 Tab：about=资料 / posts=动态 */
  active: "about" | "posts";
}>();

const emit = defineEmits<{
  (e: "change", tab: "about" | "posts"): void;
}>();

const { t } = useI18n();
</script>

<template>
  <view class="profile-tabs" role="tablist" :aria-label="t('profile.tabsAria')">
    <view
      class="profile-tabs__item press-feedback"
      :class="{ 'profile-tabs__item--active': active === 'about' }"
      hover-class="profile-tabs__item--pressed"
      hover-stay-time="100"
      role="tab"
      :aria-selected="active === 'about'"
      @tap="emit('change', 'about')"
    >
      <text class="profile-tabs__item-text">{{ t('profile.tabAbout') }}</text>
    </view>
    <view
      class="profile-tabs__item press-feedback"
      :class="{ 'profile-tabs__item--active': active === 'posts' }"
      hover-class="profile-tabs__item--pressed"
      hover-stay-time="100"
      role="tab"
      :aria-selected="active === 'posts'"
      @tap="emit('change', 'posts')"
    >
      <text class="profile-tabs__item-text">{{ t('profile.tabPosts') }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.profile-tabs {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: var(--sp-5, 20rpx) var(--sp-6, 24rpx) 0;
  padding: 8rpx;
  border-radius: var(--r-full, 999rpx);
  background: var(--c-bg-container, #ffffff);
  border: 1rpx solid var(--c-divider-light, #eef1f5);
  box-shadow: var(--s-sm, 0 2rpx 8rpx rgba(15, 23, 42, 0.04));
}

.profile-tabs__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14rpx 0;
  border-radius: var(--r-full, 999rpx);
  transition: all var(--d-normal, 200ms) ease;
}

.profile-tabs__item--pressed {
  opacity: 0.85;
}

.profile-tabs__item--active {
  background: linear-gradient(135deg, var(--c-romance-400, #f472b6) 0%, var(--c-romance-500, #FF6B81) 100%);
  box-shadow: var(--s-romance-md, 0 4rpx 16rpx rgba(255, 104, 145, 0.3));
}

.profile-tabs__item-text {
  font-size: var(--fs-md, 28rpx);
  font-weight: 600;
  color: var(--c-text-secondary, #64748b);
}

.profile-tabs__item--active .profile-tabs__item-text {
  color: #ffffff;
  font-weight: 700;
}
</style>


