<!-- ============================================================
  AppShell - 页面外壳组件
  基于原项目 AppShell 重构，全面使用 Design Tokens
  变更点：
  1. 所有样式值从 tokens 读取，不再硬编码
  2. 支持 eyebrow 自定义插槽与动态主题
  3. 底部 TabBar 增加激活态动效
  4. 顶部增加安全区适配
============================================================ -->
<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../tokens';
import { appTabs } from '../../apps/client/src/config/navigation';

const props = defineProps<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
  currentTab?: string;
  showTabBar?: boolean;
  theme?: 'light' | 'dark' | 'warm';
}>();

const emit = defineEmits<{
  (e: 'switchTab', path: string): void;
}>();

const t = computed(() => designTokens);

const shellStyle = computed(() => ({
  background: t.value.color.bg.page,
  minHeight: '100vh',
  paddingBottom: props.showTabBar !== false ? `${t.value.component.tabBar.height + t.value.layout.safeBottom}rpx` : '0',
}));

const headerStyle = computed(() => ({
  padding: `${t.value.layout.safeTop}rpx ${t.value.layout.pagePadding}rpx ${t.value.spacing[4]}rpx`,
  background: t.value.color.gradient.brand,
  borderBottom: 'none',
}));

const eyebrowStyle = computed(() => ({
  color: t.value.color.text.brand,
  fontSize: `${t.value.typography.size.overline}rpx`,
  fontWeight: t.value.typography.weight.semibold,
  letterSpacing: t.value.typography.letterSpacing.wide,
  textTransform: 'uppercase' as const,
}));

const titleStyle = computed(() => ({
  color: 'white',
  fontSize: `${t.value.typography.size.h1}rpx`,
  fontWeight: t.value.typography.weight.bold,
  lineHeight: t.value.typography.lineHeight.tight,
  marginTop: `${t.value.spacing[1]}rpx`,
}));

const subtitleStyle = computed(() => ({
  color: 'rgba(255,255,255,0.85)',
  fontSize: `${t.value.typography.size.bodySm}rpx`,
  marginTop: `${t.value.spacing[1]}rpx`,
}));

const bodyStyle = computed(() => ({
  padding: `${t.value.spacing[4]}rpx ${t.value.layout.pagePadding}rpx`,
}));

const tabBarStyle = computed(() => ({
  height: `${t.value.component.tabBar.height}rpx`,
  background: t.value.color.bg.container,
  borderTop: `1rpx solid ${t.value.color.border.light}`,
  paddingBottom: `${t.value.layout.safeBottom}rpx`,
}));

function switchTab(path: string) {
  emit('switchTab', path);
}
</script>

<template>
  <view class="shell" :style="shellStyle">
    <!-- 顶部 Header -->
    <view class="shell__header" :style="headerStyle">
      <view>
        <slot name="eyebrow">
          <text v-if="props.eyebrow || props.currentTab" class="shell__eyebrow" :style="eyebrowStyle">
            {{ props.eyebrow || appTabs.find(t => t.id === props.currentTab)?.label }}
          </text>
        </slot>
        <text class="shell__title" :style="titleStyle">{{ props.title }}</text>
        <text v-if="props.subtitle" class="shell__subtitle" :style="subtitleStyle">{{ props.subtitle }}</text>
      </view>
      <slot name="header-right" />
    </view>

    <!-- 内容区 -->
    <view class="shell__body" :style="bodyStyle">
      <slot />
    </view>

    <!-- 底部 TabBar -->
    <view v-if="props.showTabBar !== false" class="shell__tabbar" :style="tabBarStyle">
      <button
        v-for="tab in appTabs"
        :key="tab.id"
        class="shell__tab"
        :class="{
          'shell__tab--active': tab.id === props.currentTab,
          'shell__tab--prominent': tab.prominent,
        }"
        @click="switchTab(tab.path)"
      >
        <view class="shell__tab-icon-wrap">
          <image
            class="shell__tab-icon"
            :src="tab.id === props.currentTab ? tab.selectedIconPath : tab.iconPath"
            mode="aspectFit"
          />
        </view>
        <text class="shell__tab-label">{{ tab.label }}</text>
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.shell {
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: v-bind('t.zIndex.sticky');
    backdrop-filter: blur(12px);
    background: v-bind('t.color.gradient.brand');
    color: white;
    border-bottom: none;
  }

  &__body {
    flex: 1;
  }

  &__tabbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: v-bind('t.zIndex.sticky');
  }

  &__tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    padding: v-bind('`${t.spacing[1]}rpx`') 0;
    transition: transform v-bind('`${t.motion.duration.fast}ms`') v-bind('t.motion.easing.default');

    &:active {
      transform: scale(0.92);
    }

    &--active {
      .shell__tab-label {
        color: v-bind('t.color.brand[400]');
        font-weight: v-bind('t.typography.weight.semibold');
      }
      .shell__tab-icon-wrap {
        background: v-bind('t.color.gradient.brand');
        box-shadow: v-bind('t.shadow.brand');
      }
    }

    &--prominent {
      .shell__tab-icon-wrap {
        background: v-bind('t.color.gradient.brand');
        box-shadow: v-bind('t.shadow.brand');
      }
      .shell__tab-label {
        color: v-bind('t.color.brand[400]');
      }
    }
  }

  &__tab-icon-wrap {
    width: 48rpx;
    height: 48rpx;
    border-radius: v-bind('`${t.radius.full}rpx`');
    display: grid;
    place-items: center;
    transition: background v-bind('`${t.motion.duration.fast}ms`');
  }

  &__tab-icon {
    width: 40rpx;
    height: 40rpx;
  }

  &__tab-label {
    font-size: v-bind('`${t.typography.size.overline}rpx`');
    color: v-bind('t.color.text.quaternary');
    margin-top: v-bind('`${t.spacing[1]}rpx`');
    transition: color v-bind('`${t.motion.duration.fast}ms`');
  }
}
</style>
