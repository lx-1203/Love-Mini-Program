<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { appTabs, type AppTab } from '../../config/navigation';

/**
 * H5 端 TabBar（纯匹配版五 Tab 同步防漂移）
 * 与 src/config/navigation.ts 的 appTabs 保持一致：发现 / 附近 / 匹配 / 消息 / 我的，
 * 「匹配」为中央绿色圆形浮岛 + 白色爱心。
 */
interface Tab {
  key: string;
  iconPath: string;
  selectedIconPath: string;
  label: string;
  path: string;
  prominent?: boolean;
}

const props = defineProps<{
  current: string;
  tabs?: Tab[];
  unreadDot?: boolean;
  unreadCount?: number;
}>();

const emit = defineEmits<{
  change: [key: string];
}>();

const { t: tt } = useI18n();

const defaultTabs: Tab[] = appTabs.map((tab: AppTab) => ({
  key: tab.id,
  iconPath: `/${tab.iconPath}`,
  selectedIconPath: `/${tab.selectedIconPath}`,
  // 优先使用 i18n 文案，回退到 navigation.ts 中的静态 label
  label: tt(`tabs.${tab.id}`) || tab.label,
  path: tab.path,
  prominent: tab.prominent,
}));

const tabList = computed(() => props.tabs || defaultTabs);

const displayUnreadCount = computed(() => {
  if (!props.unreadCount || props.unreadCount <= 0) return 0;
  return props.unreadCount > 99 ? '99+' : props.unreadCount;
});

const showBadge = computed(() => props.unreadDot || (props.unreadCount && props.unreadCount > 0));
const showDotBadge = computed(() => props.unreadDot && (!props.unreadCount || props.unreadCount <= 0));
</script>

<template>
  <view
    class="tabbar"
    role="tablist"
    :aria-label="tt('messages.mainNavAria')"
  >
    <view
      v-for="tab in tabList"
      :key="tab.key"
      class="tab-item"
      :class="{ 'tab-item--active': current === tab.key, 'tab-item--prominent': tab.prominent }"
      hover-class="tab-item--pressed"
      :hover-stay-time="80"
      @tap="emit('change', tab.key)"
      role="tab"
      :aria-selected="current === tab.key ? 'true' : 'false'"
      :aria-label="tab.label"
    >
      <view
        class="tab-icon-wrap"
        :class="{ 'tab-icon-wrap--active': current === tab.key, 'tab-icon-wrap--prominent': tab.prominent }"
      >
        <image
          :src="current === tab.key ? tab.selectedIconPath : tab.iconPath"
          mode="aspectFit"
          class="tab-icon-image"
          alt=""
        />
        <view v-if="tab.key === 'chat' && showBadge" class="tab-badge" :class="{ 'tab-badge--dot': showDotBadge }">
          <text v-if="!showDotBadge" class="tab-badge-text">{{ displayUnreadCount }}</text>
        </view>
      </view>
      <text class="tab-label" :class="{ 'tab-label--active': current === tab.key }">{{ tab.label }}</text>
    </view>
  </view>
</template>

<style scoped>
.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--c-bg-container);
  display: flex;
  align-items: flex-end;
  padding: 8rpx 0 calc(env(safe-area-inset-bottom) + 12rpx);
  box-shadow: var(--s-sm);
  z-index: 100;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding-top: 8rpx;
  position: relative;
}

.tab-item--pressed {
  opacity: 0.7;
}

.tab-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-icon-image {
  width: 44rpx;
  height: 44rpx;
}

.tab-label {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.tab-label--active {
  font-weight: 600;
  color: var(--c-brand, #36C99A);
}

/* 中央匹配浮岛（绿色圆形 + 白色爱心） */
.tab-item--prominent {
  color: var(--c-brand, #36C99A);
}

.tab-icon-wrap--prominent {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B81 0%, #FF8DA1 100%);
  box-shadow: 0 8rpx 32rpx rgba(255, 107, 129, 0.35);
  margin-top: -40rpx;
}

.tab-icon-wrap--prominent .tab-icon-image {
  width: 72rpx;
  height: 72rpx;
}

.tab-badge {
  position: absolute;
  top: -6rpx;
  right: -10rpx;
  min-width: 28rpx;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  background: var(--c-error);
  border-radius: var(--r-full, 9999rpx);
  display: flex;
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.06);
  justify-content: center;
  padding: 0 6rpx;
  border: 3rpx solid var(--c-bg-container);
  box-sizing: content-box;
}

.tab-badge--dot {
  width: 16rpx;
  height: 16rpx;
  min-width: 16rpx;
  padding: 0;
  top: 0;
  right: 2rpx;
}

.tab-badge-text {
  font-size: 18rpx;
  color: var(--c-text-inverse);
  font-weight: 700;
  line-height: 1;
}
</style>