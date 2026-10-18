<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { appTabs, type AppTab } from '../../config/navigation';
import { IMAGE_PATHS } from '../../config/images';

/**
 * H5 端 TabBar（纯匹配版五 Tab 同步防漂移）
 * 与 src/config/navigation.ts 的 appTabs 保持一致：首页 / 附近 / 匹配 / 消息 / 我的。
 * R2b-L01-D21 / R2b-L02-D05：中央「匹配」项回归理想图——与其余四项同尺寸、同基线的
 * 描边爱心平铺，取消 128rpx 凸起彩色圆盘与 -40rpx 上凸（原浮岛白心 match-heart.png
 * 去掉圆盘后在浅色底栏不可见，故改用已存在的描边爱心 discover 图标）。
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

const defaultTabs: Tab[] = appTabs.map((tab: AppTab) => {
  // 中央「匹配」项（prominent）：H5 平铺形态改用描边爱心图标（默认灰描边 / 选中品牌绿），
  // 与其余四项同尺寸同基线；navigation.ts 仍指向为浮岛设计的白心 match-heart.png（其它泳道）。
  const iconPath = tab.prominent
    ? IMAGE_PATHS.ICONS_TABBAR.DISCOVER_DEFAULT
    : tab.iconPath;
  const selectedIconPath = tab.prominent
    ? IMAGE_PATHS.ICONS_TABBAR.DISCOVER_ACTIVE
    : tab.selectedIconPath;
  return {
    key: tab.id,
    iconPath: `/${iconPath}`,
    selectedIconPath: `/${selectedIconPath}`,
    // 优先使用 i18n 文案，回退到 navigation.ts 中的静态 label；
    // R2b-L02-D17：中央项文案对齐理想图「匹配」（tabs.discover / navigation.ts 的「寻觅」由其它泳道同步）。
    label: tab.prominent ? '匹配' : tt(`tabs.${tab.id}`) || tab.label,
    path: tab.path,
    prominent: tab.prominent,
  };
});

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
      :hover-stay-time="40"
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

/* R2b-L01-D21 / R2b-L02-D05：中央「匹配」项不再做凸起浮岛。
   原 .tab-icon-wrap--prominent 用 128rpx 圆盘 + margin-top:-40rpx 抬到 tabBar 上沿之外，
   压住上沿并把标签挤到圆盘下方，与理想图「五项等大平铺、中央线性爱心同基线」不符。
   现取消圆形色底 / 负 margin / 阴影 / 放大尺寸，中央项复用 .tab-icon-wrap 基样式（44rpx 图标 + 下方标签）。 */
.tab-item--prominent {
  color: var(--c-brand, #36C99A);
}

.tab-icon-wrap--prominent {
  /* 与其余四项同尺寸同基线，无任何凸起底盘 */
  background: none;
  box-shadow: none;
}

.tab-badge {
  position: absolute;
  top: -6rpx;
  right: -10rpx;
  min-width: 28rpx;
  background: rgba(255, 255, 255, 0.95);
  /* #ifdef H5 */
  backdrop-filter: blur(20px);
  /* #endif */
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