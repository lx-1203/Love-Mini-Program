<template>
  <view
    class="avatar-frame"
    :class="[
      `avatar-frame--${frameId}`,
      { 'avatar-frame--animated': theme.animated },
    ]"
    :style="frameStyle"
  >
    <!-- 渐变环（多色渐变 + 白内边 + 外发光） -->
    <view class="avatar-frame__ring">
      <view class="avatar-frame__inner">
        <slot />
      </view>
    </view>
    <!-- 身份角标（SVG 图标：皇冠/认证/星标等，主题渐变圆底 + 白色图标） -->
    <view v-if="theme.badgeIcon" class="avatar-frame__badge">
      <image class="avatar-frame__badge-icon" :src="theme.badgeIcon" mode="aspectFit" alt="" />
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * AvatarFrame - 头像框组件（2026-08-08，参考 QQ 头像框机制）。
 *
 * 设计：注册表驱动（config/avatar-frames.ts）。
 * - 主题按 frameId 从注册表取配置，通过 CSS 变量注入渐变/发光，组件样式零分支；
 * - 新增头像框主题只需在注册表追加一条配置，无需改动本组件；
 * - 支持旋转动画（VIP 贵族感）与身份角标（皇冠/认证/星标等）。
 *
 * 使用：<AvatarFrame :frame-id="myFrameId"><image/></AvatarFrame>
 */
import { computed } from "vue";
import {
  getAvatarFrameTheme,
  type AvatarFrameId,
} from "../../config/avatar-frames";

const props = withDefaults(defineProps<{
  /** 头像框主题 ID */
  frameId: AvatarFrameId;
}>(), {
  frameId: "none",
});

const theme = computed(() => getAvatarFrameTheme(props.frameId));

/** 通过 CSS 变量注入主题配色（渐变多色拼接 + 发光色） */
const frameStyle = computed(() => ({
  "--af-gradient": `linear-gradient(135deg, ${theme.value.gradient.join(", ")})`,
  "--af-glow": theme.value.glow ?? "transparent",
}));
</script>

<style scoped lang="scss">
/* 头像框容器（相对定位承载角标；inline-flex 让宽度由内容决定，mp-weixin 兼容） */
.avatar-frame {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

/* 渐变环：多色渐变 + 白内边（QQ 头像框的「白框 + 彩色描边」结构） */
.avatar-frame__ring {
  padding: 8rpx;
  border-radius: var(--r-full);
  background: var(--af-gradient);
  box-shadow: 0 0 24rpx var(--af-glow);
}

/* 内层白圈：承载头像内容（slot），让头像与彩色环之间留出白边 */
.avatar-frame__inner {
  border-radius: var(--r-full);
  padding: 6rpx;
  background: var(--c-neutral-0);
  overflow: hidden;
}

/* 旋转动画（VIP/SVIP/活动限定等贵族感） */
.avatar-frame--animated .avatar-frame__ring {
  animation: avatar-frame-rotate var(--d-rotate-slow, 8000ms) linear infinite;
}

@keyframes avatar-frame-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 身份角标（右下角，叠在环上；主题渐变圆底 + 白色 SVG 图标，QQ 身份徽章风格） */
.avatar-frame__badge {
  position: absolute;
  right: -4rpx;
  bottom: -4rpx;
  width: 46rpx;
  height: 46rpx;
  border-radius: var(--r-full);
  background: var(--af-gradient);
  border: 3rpx solid var(--c-neutral-0);
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.avatar-frame__badge-icon {
  width: 26rpx;
  height: 26rpx;
  display: block;
  /* 单色 SVG 统一转白，凸显在渐变圆底上 */
  filter: brightness(0) invert(1);
}
</style>
