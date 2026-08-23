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
 * 说明（2026-08-15 修复 mp-weixin module not defined）：
 * 头像框注册表（config/avatar-frames.ts）原本被本组件运行时 require；
 * 由于本组件是懒加载组件，mp-weixin 在 real 构建下会出现
 * module 'config/avatar-frames.js' is not defined。
 * 因此将主题注册表内联到本组件，消除跨模块运行时依赖；
 * 类型 AvatarFrameId 仍从 config 以 type-only 导入（编译期擦除，不产生运行时 require）。
 */
import { computed } from "vue";
import type { AvatarFrameId } from "../../config/avatar-frames";

interface AvatarFrameTheme {
  id: AvatarFrameId;
  name: string;
  priority: number;
  gradient: string[];
  glow?: string;
  badgeIcon?: string;
  animated?: boolean;
}

const AVATAR_FRAMES: Record<AvatarFrameId, AvatarFrameTheme> = {
  none: { id: "none", name: "基础白框", priority: 0, gradient: ["#E5E7EB", "#D1D5DB"] },
  default: { id: "default", name: "品牌青绿框", priority: 5, gradient: ["#2DD4BF", "#14B8A6"], glow: "rgba(45, 212, 191, 0.35)" },
  vip: { id: "vip", name: "贵族金框", priority: 10, gradient: ["#FDE68A", "#F59E0B"], glow: "rgba(245, 158, 11, 0.45)", animated: true },
  svip: { id: "svip", name: "至尊炫彩框", priority: 20, gradient: ["#FF7C91", "#8B5CF6", "#3B82F6"], glow: "rgba(139, 92, 246, 0.5)", badgeIcon: "/static/assets/icons/common/crown.svg", animated: true },
  "school-verified": { id: "school-verified", name: "校园认证框", priority: 15, gradient: ["#36C99A", "#36C99A"], glow: "rgba(61, 201, 148, 0.4)", badgeIcon: "/static/assets/icons/common/check-circle.svg" },
  "super-test": { id: "super-test", name: "超级体验官框", priority: 25, gradient: ["#C084FC", "#FF6B81"], glow: "rgba(192, 132, 252, 0.5)", badgeIcon: "/static/assets/icons/common/star.svg", animated: true },
  anniversary: { id: "anniversary", name: "周年限定框", priority: 30, gradient: ["#FB7185", "#F43F5E", "#F97316"], glow: "rgba(244, 63, 94, 0.5)", badgeIcon: "/static/assets/icons/common/celebration.svg", animated: true },
};

function getAvatarFrameTheme(id: AvatarFrameId): AvatarFrameTheme {
  return AVATAR_FRAMES[id] ?? AVATAR_FRAMES.none;
}

const props = withDefaults(defineProps<{
  /** 头像框主题 ID */
  frameId: AvatarFrameId;
}>(), {
  frameId: "default",
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
  /* 2026-08-14：内部根节点撑满宿主 + flex 居中；
     宿主与内部根是不同节点，父级 inline style 只作用于宿主，根节点必须自行 100% */
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 渐变环：多色渐变 + 白内边（QQ 头像框的「白框 + 彩色描边」结构） */
.avatar-frame__ring {
  /* 2026-08-14 修复：显式撑满宿主，避免 mp-weixin 下塌缩为渐变条 */
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 适度强化：加粗环 + 白描边 + 发光，深色卡片背景上一眼可辨 */
  padding: 10rpx;
  border-radius: var(--r-full);
  background: var(--af-gradient);
  border: 2rpx solid rgba(255, 255, 255, 0.85);
  box-shadow:
    0 0 0 2rpx rgba(255, 255, 255, 0.5),
    0 0 24rpx var(--af-glow);
}

/* 内层白圈：承载头像内容（slot），让头像与彩色环之间留出白边 */
.avatar-frame__inner {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full);
  padding: 8rpx;
  background: var(--c-neutral-0);
  overflow: hidden;
}

/* 2026-08-12 V3 兜底：误落 none（无框态）时补白描边 + 白色发光，
 * 任何场景下头像框都清晰可辨（不污染注册表 none 配置本身） */
.avatar-frame--none .avatar-frame__ring {
  box-shadow:
    0 0 0 3rpx var(--c-neutral-0),
    0 0 24rpx rgba(255, 255, 255, 0.35);
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
  /* 固定布局尺寸（角标负偏移 -4rpx / 尺寸 46rpx），无对应 token */
  right: -4rpx;
  bottom: -4rpx;
  width: 46rpx;
  height: 46rpx;
  border-radius: var(--r-full);
  background: var(--af-gradient);
  border: 3rpx solid var(--c-neutral-0);
  box-shadow: var(--s-sm, 0 2rpx 8rpx rgba(15, 23, 42, 0.04));
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.avatar-frame__badge-icon {
  /* 固定布局尺寸（角标图标 26rpx），无对应 token */
  width: 26rpx;
  height: 26rpx;
  display: block;
  /* 单色 SVG 统一转白，凸显在渐变圆底上 */
  filter: brightness(0) invert(1);
}
</style>

