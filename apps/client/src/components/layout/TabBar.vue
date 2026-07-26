<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { appTabs, type AppTab } from '../../config/navigation';
import { useSessionStore } from '../../stores/session';
import { openAppPath } from '../../utils/navigation';

/**
 * Tab 配置以 src/config/navigation.ts 中的 appTabs 为唯一真相源
 * 此处从 navigation.ts 导入并映射为组件所需格式
 */
interface Tab {
  key: string;
  iconPath: string;
  selectedIconPath: string;
  label: string;
  path: string;
}

const props = defineProps<{
  current: string;
  tabs?: Tab[];
  unreadDot?: boolean;
  unreadCount?: number;
}>();

const emit = defineEmits<{
  change: [key: string];
  publish: [];
}>();

const { t: tt } = useI18n();

/** Session store，用于发布按钮的登录权限校验 */
const sessionStore = useSessionStore();

const defaultTabs: Tab[] = appTabs.map((tab: AppTab) => ({
  key: tab.id,
  iconPath: `/${tab.iconPath}`,
  selectedIconPath: `/${tab.selectedIconPath}`,
  // 优先使用 i18n 文案，回退到 navigation.ts 中的静态 label
  label: tt(`tabs.${tab.id}`) || tab.label,
  path: tab.path,
}));

const tabList = computed(() => props.tabs || defaultTabs);

/**
 * 安全获取 Tab 配置：配置缺失时返回 null，而非崩溃
 * 配合 v-if 渲染，避免非空断言 `!` 在配置缺失时导致白屏
 */
const getTab = (key: string): Tab | null => {
  return tabList.value.find(tab => tab.key === key) ?? null;
};

const displayUnreadCount = computed(() => {
  if (!props.unreadCount || props.unreadCount <= 0) return 0;
  return props.unreadCount > 99 ? '99+' : props.unreadCount;
});

const showBadge = computed(() => props.unreadDot || (props.unreadCount && props.unreadCount > 0));
const showDotBadge = computed(() => props.unreadDot && (!props.unreadCount || props.unreadCount <= 0));

/**
 * 是否启用发布按钮呼吸光晕动画
 * 仅在用户有未读消息（unreadCount > 0）时启动，空闲时停止以节省电量
 */
const enablePublishBreath = computed(() => {
  return Boolean(props.unreadCount && props.unreadCount > 0);
});

/**
 * 处理发布按钮点击：未登录时跳转登录页，已登录时正常触发 publish 事件
 */
function handlePublish(): void {
  if (!sessionStore.isLoggedIn) {
    openAppPath('/pages/login/index');
    return;
  }
  emit('publish');
}
</script>

<template>
  <view
    class="tabbar"
    role="tablist"
    :aria-label="tt('messages.mainNavAria')"
  >
    <!-- 首页 -->
    <view
      v-if="getTab('home')"
      class="tab-item"
      :class="{ 'tab-item--active': current === 'home' }"
      hover-class="tab-item--pressed"
      :hover-stay-time="80"
      @tap="emit('change', 'home')"
      role="tab"
      :aria-selected="current === 'home'"
      :aria-label="getTab('home')!.label"
    >
      <view class="tab-top-bar" :class="{ 'tab-top-bar--active': current === 'home', 'tab-top-bar--home': current === 'home' }" />
      <view class="tab-icon-wrap" :class="{ 'tab-icon-wrap--active': current === 'home', 'tab-icon-wrap--home': current === 'home' }">
        <image
          :src="current === 'home' ? getTab('home')!.selectedIconPath : getTab('home')!.iconPath"
          mode="aspectFit"
          class="tab-icon-image" alt=""
        />
      </view>
      <text class="tab-label" :class="{ 'tab-label--active': current === 'home', 'tab-label--home': current === 'home' }">
        {{ getTab('home')!.label }}
      </text>
      <view v-if="current === 'home'" class="tab-dot tab-dot--home" />
    </view>

    <!-- 消息 -->
    <view
      v-if="getTab('chat')"
      class="tab-item"
      :class="{ 'tab-item--active': current === 'chat' }"
      hover-class="tab-item--pressed"
      :hover-stay-time="80"
      @tap="emit('change', 'chat')"
      role="tab"
      :aria-selected="current === 'chat'"
      :aria-label="getTab('chat')!.label"
      :aria-haspopup="showBadge ? 'true' : 'false'"
    >
      <view class="tab-top-bar" :class="{ 'tab-top-bar--active': current === 'chat', 'tab-top-bar--chat': current === 'chat' }" />
      <view class="tab-icon-wrap" :class="{ 'tab-icon-wrap--active': current === 'chat', 'tab-icon-wrap--chat': current === 'chat' }">
        <image
          :src="current === 'chat' ? getTab('chat')!.selectedIconPath : getTab('chat')!.iconPath"
          mode="aspectFit"
          class="tab-icon-image" alt=""
        />
        <view v-if="showBadge" class="tab-badge" :class="{ 'tab-badge--dot': showDotBadge }">
          <text v-if="!showDotBadge" class="tab-badge-text">{{ displayUnreadCount }}</text>
        </view>
      </view>
      <text class="tab-label" :class="{ 'tab-label--active': current === 'chat', 'tab-label--chat': current === 'chat' }">
        {{ getTab('chat')!.label }}
      </text>
      <view v-if="current === 'chat'" class="tab-dot tab-dot--chat" />
    </view>

    <!-- 中间发布按钮 -->
    <view
      class="tab-publish"
      hover-class="tab-publish--pressed"
      :hover-stay-time="80"
      @tap="handlePublish"
      role="button"
      :aria-label="tt('tabs.publish')"
      :aria-disabled="!sessionStore.isLoggedIn"
    >
      <view class="publish-btn" :class="{ 'publish-btn--breath': enablePublishBreath }">
        <view class="publish-btn__halo" />
        <text class="publish-icon">+</text>
      </view>
      <text class="publish-label">{{ tt('tabs.publish') }}</text>
    </view>

    <!-- 圈子 -->
    <view
      v-if="getTab('village')"
      class="tab-item"
      :class="{ 'tab-item--active': current === 'village' }"
      hover-class="tab-item--pressed"
      :hover-stay-time="80"
      @tap="emit('change', 'village')"
      role="tab"
      :aria-selected="current === 'village'"
      :aria-label="getTab('village')!.label"
    >
      <view class="tab-top-bar" :class="{ 'tab-top-bar--active': current === 'village', 'tab-top-bar--village': current === 'village' }" />
      <view class="tab-icon-wrap" :class="{ 'tab-icon-wrap--active': current === 'village', 'tab-icon-wrap--village': current === 'village' }">
        <image
          :src="current === 'village' ? getTab('village')!.selectedIconPath : getTab('village')!.iconPath"
          mode="aspectFit"
          class="tab-icon-image" alt=""
        />
      </view>
      <text class="tab-label" :class="{ 'tab-label--active': current === 'village', 'tab-label--village': current === 'village' }">
        {{ getTab('village')!.label }}
      </text>
      <view v-if="current === 'village'" class="tab-dot tab-dot--village" />
    </view>

    <!-- 我的 -->
    <view
      v-if="getTab('profile')"
      class="tab-item"
      :class="{ 'tab-item--active': current === 'profile' }"
      hover-class="tab-item--pressed"
      :hover-stay-time="80"
      @tap="emit('change', 'profile')"
      role="tab"
      :aria-selected="current === 'profile'"
      :aria-label="getTab('profile')!.label"
    >
      <view class="tab-top-bar" :class="{ 'tab-top-bar--active': current === 'profile', 'tab-top-bar--profile': current === 'profile' }" />
      <view class="tab-icon-wrap" :class="{ 'tab-icon-wrap--active': current === 'profile', 'tab-icon-wrap--profile': current === 'profile' }">
        <image
          :src="current === 'profile' ? getTab('profile')!.selectedIconPath : getTab('profile')!.iconPath"
          mode="aspectFit"
          class="tab-icon-image" alt=""
        />
      </view>
      <text class="tab-label" :class="{ 'tab-label--active': current === 'profile', 'tab-label--profile': current === 'profile' }">
        {{ getTab('profile')!.label }}
      </text>
      <view v-if="current === 'profile'" class="tab-dot tab-dot--profile" />
    </view>
  </view>
</template>

<style scoped>
.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--c-bg-container, #FFFFFF);
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 8rpx 0 calc(constant(safe-area-inset-bottom) + 12rpx);
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
  transition: opacity 0.15s ease;
  position: relative;
}

/* hover-class 按压态，替代 :active */
.tab-item--pressed {
  opacity: 0.7;
}

/* ========== 顶部品牌色指示条（展开动画） ========== */
.tab-top-bar {
  position: absolute;
  top: 0;
  left: 50%;
  width: 48rpx;
  height: 4rpx;
  border-radius: 0 0 4rpx 4rpx;
  transform: translateX(-50%) scaleX(0);
  transform-origin: center center;
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 250ms cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  pointer-events: none;
}

.tab-top-bar--active {
  transform: translateX(-50%) scaleX(1);
  opacity: 1;
}

.tab-top-bar--home {
  background: linear-gradient(90deg, var(--c-brand, #3FCF8E) 0%, var(--c-brand-300, #7CD9A6) 100%);
  box-shadow: 0 2rpx 6rpx rgba(63, 207, 142, 0.35);
}

.tab-top-bar--chat {
  background: linear-gradient(90deg, var(--c-romance-500, #EC4899) 0%, var(--c-romance-400, #F472B6) 100%);
  box-shadow: 0 2rpx 6rpx rgba(236, 72, 153, 0.35);
}

.tab-top-bar--village {
  background: linear-gradient(90deg, var(--c-accent-400, #FB923C) 0%, var(--c-accent-400, #F97316) 100%);
  box-shadow: 0 2rpx 6rpx rgba(249, 115, 22, 0.35);
}

.tab-top-bar--profile {
  background: linear-gradient(90deg, var(--c-lavender-500, #8B5CF6) 0%, var(--c-lavender-500, #8B5CF6) 100%);
  box-shadow: 0 2rpx 6rpx rgba(139, 92, 246, 0.35);
}

.tab-icon-wrap {
  position: relative;
  width: 48rpx;
  height: 36rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1),
              background 250ms cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.98);
}

.tab-icon-wrap--active {
  animation: tabBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: scale(1.15);
}

.tab-icon-wrap--home.tab-icon-wrap--active {
  background: linear-gradient(135deg, var(--c-brand, #3FCF8E) 0%, var(--c-brand-300, #7CD9A6) 100%);
}

.tab-icon-wrap--chat.tab-icon-wrap--active {
  background: linear-gradient(135deg, var(--c-romance-500, #EC4899) 0%, var(--c-romance-400, #F472B6) 100%);
}

.tab-icon-wrap--village.tab-icon-wrap--active {
  background: linear-gradient(135deg, var(--c-accent-400, #FB923C) 0%, var(--c-accent-400, #F97316) 100%);
}

.tab-icon-wrap--profile.tab-icon-wrap--active {
  background: linear-gradient(135deg, var(--c-lavender-500, #8B5CF6) 0%, var(--c-lavender-500, #8B5CF6) 100%);
}

@keyframes tabBounce {
  0% { transform: scale(0.92) rotate(-8deg); }
  40% { transform: scale(1.12) rotate(4deg); }
  70% { transform: scale(0.96) rotate(-2deg); }
  100% { transform: scale(1) rotate(0); }
}

/* 激活态图标旋转放大 */
.tab-icon-wrap--active .tab-icon-image {
  animation: iconSpin 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes iconSpin {
  0% { transform: scale(0.8) rotate(-30deg); opacity: 0.6; }
  60% { transform: scale(1.15) rotate(15deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

.tab-icon-image {
  width: 36rpx;
  height: 36rpx;
  transition: transform 0.2s ease;
}

/* ========== 底部小圆点指示器 ========== */
.tab-dot {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  animation: dotPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes dotPop {
  0% { transform: translateX(-50%) scale(0); opacity: 0; }
  60% { transform: translateX(-50%) scale(1.4); opacity: 1; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

.tab-dot--home { background: var(--c-brand, #3FCF8E); box-shadow: 0 0 8rpx rgba(63, 207, 142, 0.5); }
.tab-dot--chat { background: var(--c-romance-500, #EC4899); box-shadow: 0 0 8rpx rgba(236, 72, 153, 0.5); }
.tab-dot--village { background: var(--c-accent-400, #F97316); box-shadow: 0 0 8rpx rgba(249, 115, 22, 0.5); }
.tab-dot--profile { background: var(--c-lavender-500, #8B5CF6); box-shadow: 0 0 8rpx rgba(139, 92, 246, 0.5); }

.tab-badge {
  position: absolute;
  top: -6rpx;
  right: -10rpx;
  min-width: 28rpx;
  height: 28rpx;
  background: var(--c-error, #E5454D);
  border-radius: 9999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
  border: 3rpx solid var(--c-bg-container, #FFFFFF);
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
  color: var(--c-text-inverse, #FFFFFF);
  font-weight: 700;
  line-height: 1;
}

.tab-label {
  font-size: 20rpx;
  /* 非激活态灰色对齐青藤参考 #9AA1AB */
  color: var(--c-text-tertiary, #9AA1AB);
  font-weight: 500;
  transition: color 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tab-label--active {
  font-weight: 600;
}

.tab-label--home.tab-label--active {
  color: var(--c-brand, #3FCF8E);
}

.tab-label--chat.tab-label--active {
  color: var(--c-romance-500, #EC4899);
}

.tab-label--village.tab-label--active {
  color: var(--c-accent-400, #F97316);
}

.tab-label--profile.tab-label--active {
  color: var(--c-lavender-500, #8B5CF6);
}

.tab-publish {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -16rpx;
  padding-top: 0;
}

/* hover-class 按压态 */
/* P3 修复：box-shadow 单位统一为 rpx，与项目其他阴影定义保持一致 */
.tab-publish--pressed .publish-btn {
  transform: scale(0.92);
  box-shadow: 0 4rpx 12rpx rgba(63, 207, 142, 0.45);
}

.publish-btn {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-brand, #3FCF8E) 0%, var(--c-brand-400, #2DB97A) 100%);
  box-shadow: 0 6rpx 20rpx rgba(63, 207, 142, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  overflow: visible;
}

/* 呼吸光晕动画：仅在 unreadCount>0 时启用，空闲时停止以节省电量 */
.publish-btn__halo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(63, 207, 142, 0.6);
  transform: translate(-50%, -50%);
  pointer-events: none;
  /* 默认不运行动画，由 .publish-btn--breath .publish-btn__halo 控制 */
  animation: none;
}

.publish-btn--breath .publish-btn__halo {
  animation: publishBreath 2.4s ease-out infinite;
}

@keyframes publishBreath {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.8;
  }
  70% {
    transform: translate(-50%, -50%) scale(1.6);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.6);
    opacity: 0;
  }
}

.publish-icon {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
  line-height: 1;
  margin-top: -4rpx;
}

.publish-label {
  font-size: 20rpx;
  color: var(--c-brand, #3FCF8E);
  font-weight: 600;
  margin-top: 6rpx;
}
</style>
