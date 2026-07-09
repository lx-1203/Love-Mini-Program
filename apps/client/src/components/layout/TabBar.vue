<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../../theme/tokens';

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

const t = designTokens;

const defaultTabs: Tab[] = [
  {
    key: 'home',
    iconPath: '/static/assets/icons/tabbar/home-default.png',
    selectedIconPath: '/static/assets/icons/tabbar/home-active.png',
    label: '首页',
    path: '/pages/home/index',
  },
  {
    key: 'village',
    iconPath: '/static/assets/icons/tabbar/village-default.png',
    selectedIconPath: '/static/assets/icons/tabbar/village-active.png',
    label: '圈子',
    path: '/pages/village/index',
  },
  {
    key: 'discover',
    iconPath: '/static/assets/icons/tabbar/discover-default.png',
    selectedIconPath: '/static/assets/icons/tabbar/discover-active.png',
    label: '匹配',
    path: '/pages/discover/index',
  },
  {
    key: 'chat',
    iconPath: '/static/assets/icons/tabbar/chat-default.png',
    selectedIconPath: '/static/assets/icons/tabbar/chat-active.png',
    label: '消息',
    path: '/pages/chat/index',
  },
  {
    key: 'profile',
    iconPath: '/static/assets/icons/tabbar/profile-default.png',
    selectedIconPath: '/static/assets/icons/tabbar/profile-active.png',
    label: '我的',
    path: '/pages/profile/index',
  },
];

const tabList = computed(() => props.tabs || defaultTabs);

const getTab = (key: string): Tab | undefined => {
  return tabList.value.find(tab => tab.key === key);
};

const displayUnreadCount = computed(() => {
  if (!props.unreadCount || props.unreadCount <= 0) return 0;
  return props.unreadCount > 99 ? '99+' : props.unreadCount;
});

const showBadge = computed(() => props.unreadDot || (props.unreadCount && props.unreadCount > 0));
const showDotBadge = computed(() => props.unreadDot && (!props.unreadCount || props.unreadCount <= 0));
</script>

<template>
  <view class="tabbar">
    <!-- 首页 -->
    <view
      v-if="getTab('home')"
      class="tab-item"
      :class="{ 'tab-item--active': current === 'home' }"
      @tap="emit('change', 'home')"
    >
      <view class="tab-top-bar" :class="{ 'tab-top-bar--active': current === 'home', 'tab-top-bar--home': current === 'home' }" />
      <view class="tab-icon-wrap" :class="{ 'tab-icon-wrap--active': current === 'home', 'tab-icon-wrap--home': current === 'home' }">
        <image
          :src="current === 'home' ? getTab('home')!.selectedIconPath : getTab('home')!.iconPath"
          mode="aspectFit"
          class="tab-icon-image"
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
      @tap="emit('change', 'chat')"
    >
      <view class="tab-top-bar" :class="{ 'tab-top-bar--active': current === 'chat', 'tab-top-bar--chat': current === 'chat' }" />
      <view class="tab-icon-wrap" :class="{ 'tab-icon-wrap--active': current === 'chat', 'tab-icon-wrap--chat': current === 'chat' }">
        <image
          :src="current === 'chat' ? getTab('chat')!.selectedIconPath : getTab('chat')!.iconPath"
          mode="aspectFit"
          class="tab-icon-image"
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
    <view class="tab-publish" @tap="emit('publish')">
      <view class="publish-btn">
        <view class="publish-btn__halo" />
        <text class="publish-icon">+</text>
      </view>
      <text class="publish-label">发布</text>
    </view>

    <!-- 圈子 -->
    <view
      v-if="getTab('village')"
      class="tab-item"
      :class="{ 'tab-item--active': current === 'village' }"
      @tap="emit('change', 'village')"
    >
      <view class="tab-top-bar" :class="{ 'tab-top-bar--active': current === 'village', 'tab-top-bar--village': current === 'village' }" />
      <view class="tab-icon-wrap" :class="{ 'tab-icon-wrap--active': current === 'village', 'tab-icon-wrap--village': current === 'village' }">
        <image
          :src="current === 'village' ? getTab('village')!.selectedIconPath : getTab('village')!.iconPath"
          mode="aspectFit"
          class="tab-icon-image"
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
      @tap="emit('change', 'profile')"
    >
      <view class="tab-top-bar" :class="{ 'tab-top-bar--active': current === 'profile', 'tab-top-bar--profile': current === 'profile' }" />
      <view class="tab-icon-wrap" :class="{ 'tab-icon-wrap--active': current === 'profile', 'tab-icon-wrap--profile': current === 'profile' }">
        <image
          :src="current === 'profile' ? getTab('profile')!.selectedIconPath : getTab('profile')!.iconPath"
          mode="aspectFit"
          class="tab-icon-image"
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
  background: #FFFFFF;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 8rpx 0 calc(constant(safe-area-inset-bottom) + 12rpx);
  padding: 8rpx 0 calc(env(safe-area-inset-bottom) + 12rpx);
  box-shadow: v-bind('t.shadow.sm');
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

.tab-item:active {
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
  background: linear-gradient(90deg, #3FCF8E 0%, #7CD9A6 100%);
  box-shadow: 0 2rpx 6rpx rgba(63, 207, 142, 0.35);
}

.tab-top-bar--chat {
  background: linear-gradient(90deg, #EC4899 0%, #F472B6 100%);
  box-shadow: 0 2rpx 6rpx rgba(236, 72, 153, 0.35);
}

.tab-top-bar--village {
  background: linear-gradient(90deg, #FB923C 0%, #F97316 100%);
  box-shadow: 0 2rpx 6rpx rgba(249, 115, 22, 0.35);
}

.tab-top-bar--profile {
  background: linear-gradient(90deg, #A78BFA 0%, #8B5CF6 100%);
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
  background: linear-gradient(135deg, #3FCF8E 0%, #7CD9A6 100%);
}

.tab-icon-wrap--chat.tab-icon-wrap--active {
  background: linear-gradient(135deg, #EC4899 0%, #F472B6 100%);
}

.tab-icon-wrap--village.tab-icon-wrap--active {
  background: linear-gradient(135deg, #FB923C 0%, #F97316 100%);
}

.tab-icon-wrap--profile.tab-icon-wrap--active {
  background: linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%);
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

.tab-dot--home { background: #3FCF8E; box-shadow: 0 0 8rpx rgba(63, 207, 142, 0.5); }
.tab-dot--chat { background: #EC4899; box-shadow: 0 0 8rpx rgba(236, 72, 153, 0.5); }
.tab-dot--village { background: #F97316; box-shadow: 0 0 8rpx rgba(249, 115, 22, 0.5); }
.tab-dot--profile { background: #8B5CF6; box-shadow: 0 0 8rpx rgba(139, 92, 246, 0.5); }

.tab-badge {
  position: absolute;
  top: -6rpx;
  right: -10rpx;
  min-width: 28rpx;
  height: 28rpx;
  background: #E5454D;
  border-radius: 9999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
  border: 3rpx solid #FFFFFF;
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
  color: #FFFFFF;
  font-weight: 700;
  line-height: 1;
}

.tab-label {
  font-size: 20rpx;
  /* 非激活态灰色对齐青藤参考 #9AA1AB */
  color: #9AA1AB;
  font-weight: 500;
  transition: color 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tab-label--active {
  font-weight: 600;
}

.tab-label--home.tab-label--active {
  color: #3FCF8E;
}

.tab-label--chat.tab-label--active {
  color: #EC4899;
}

.tab-label--village.tab-label--active {
  color: #F97316;
}

.tab-label--profile.tab-label--active {
  color: #8B5CF6;
}

.tab-publish {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -16rpx;
  padding-top: 0;
}

.publish-btn {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #3FCF8E 0%, #2DB97A 100%);
  box-shadow: 0 6px 20px rgba(63, 207, 142, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  overflow: visible;
}

/* 呼吸光晕动画 */
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

.publish-btn:active {
  transform: scale(0.92);
  box-shadow: 0 4px 12px rgba(63, 207, 142, 0.45);
}

.publish-icon {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1;
  margin-top: -4rpx;
}

.publish-label {
  font-size: 20rpx;
  color: #3FCF8E;
  font-weight: 600;
  margin-top: 6rpx;
}
</style>
