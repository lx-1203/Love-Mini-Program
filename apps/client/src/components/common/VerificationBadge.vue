<script setup lang="ts">
/**
 * VerificationBadge - 认证徽章组件 (M-07)
 *
 * 视觉规范（严格对齐 design tokens，无硬编码色值）：
 * - school: 薄荷绿描边圆角胶囊 + ✓ 图标 + "已认证"
 * - email: 蓝紫描边 + 邮件图标 + "邮箱认证"
 * - idcard: 暖橙描边 + 身份证图标 + "实名认证"
 * - none: 渲染"去认证"CTA 按钮，点击 emit click 事件（由父组件跳转认证页）
 *
 * 尺寸：
 * - sm: 用于卡片信息区紧凑场景
 * - md: 用于 profile 头部、likes 卡片等标准场景
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（使用 hover-class 替代）
 * - 不使用 backdrop-filter（背景采用纯色不透明 token）
 * - 不使用 import.meta.env.DEV
 * - 所有动画内联在 .vue 文件中
 */
import { computed } from "vue";
import { IMAGE_PATHS } from "../../config/images";
import { lightHaptic } from "../../utils/haptic";

type BadgeLevel = "none" | "school" | "email" | "idcard";

const props = withDefaults(defineProps<{
  /** 认证级别 */
  level?: BadgeLevel;
  /** 尺寸：sm 紧凑 / md 标准 */
  size?: "sm" | "md";
  /** 是否显示"去认证"CTA（仅 level=none 时生效，默认 true） */
  showCtaWhenNone?: boolean;
}>(), {
  level: "none",
  size: "md",
  showCtaWhenNone: true,
});

const emit = defineEmits<{
  /** 点击"去认证"CTA 时触发，父组件跳转到 /pages/campus/certification */
  (e: "click"): void;
  /** CTA 按下时触发轻振动反馈 */
  (e: "tap"): void;
}>();

/** 各级别对应的图标资源（SVG，支持 currentColor 主题色） */
const ICON_MAP: Record<Exclude<BadgeLevel, "none">, string> = {
  school: IMAGE_PATHS.ICONS_COMMON.CHECK,
  email: IMAGE_PATHS.ICONS_COMMON.NOTIFICATION,
  idcard: IMAGE_PATHS.ICONS_COMMON.SCHOOL,
};

/** 各级别对应的文案 */
const LABEL_MAP: Record<Exclude<BadgeLevel, "none">, string> = {
  school: "已认证",
  email: "邮箱认证",
  idcard: "实名认证",
};

/** 当前级别是否渲染徽章（level !== "none" 时渲染） */
const hasBadge = computed(() => props.level !== "none");

/** 是否渲染"去认证"CTA */
const showCta = computed(() => props.level === "none" && props.showCtaWhenNone);

/** 当前级别图标 URL */
const iconSrc = computed(() => {
  if (!hasBadge.value) return "";
  return ICON_MAP[props.level as Exclude<BadgeLevel, "none">];
});

/** 当前级别文案 */
const label = computed(() => {
  if (!hasBadge.value) return "";
  return LABEL_MAP[props.level as Exclude<BadgeLevel, "none">];
});

/** 容器 class，按级别 + 尺寸组合 */
const containerClass = computed(() => [
  "verification-badge",
  `verification-badge--${props.level}`,
  `verification-badge--${props.size}`,
]);

/** 点击"去认证"CTA */
function handleClick() {
  lightHaptic();
  emit("tap");
  emit("click");
}
</script>

<template>
  <!-- 已认证：渲染徽章 -->
  <view v-if="hasBadge" :class="containerClass">
    <image
      class="verification-badge__icon"
      :src="iconSrc"
      mode="aspectFit"
    />
    <text class="verification-badge__label">{{ label }}</text>
  </view>

  <!-- 未认证 + showCtaWhenNone：渲染"去认证"CTA 按钮 -->
  <view
    v-else-if="showCta"
    :class="['verification-cta', `verification-cta--${props.size}`]"
    hover-class="verification-cta--pressed"
    :hover-stay-time="120"
    @tap="handleClick"
  >
    <text class="verification-cta__text">去认证</text>
  </view>

  <!-- 未认证 + 不显示 CTA：不渲染任何内容 -->
  <template v-else />
</template>

<style scoped lang="scss">
/* ========== 已认证徽章：胶囊形 + 描边 + 图标 + 文案 ========== */
.verification-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  border-radius: var(--r-full);
  border-width: 1rpx;
  border-style: solid;
  white-space: nowrap;
  flex-shrink: 0;
}

.verification-badge--sm {
  padding: 2rpx var(--sp-2);
}

.verification-badge--md {
  padding: var(--sp-1) var(--sp-3);
}

/* school：薄荷绿描边 + 深绿字（对齐青藤参考的"已认证"色彩） */
.verification-badge--school {
  background: var(--c-bg-brand);
  border-color: var(--c-brand-200);
  color: var(--c-brand-700);
}

/* email：蓝紫描边 + 深蓝字 */
.verification-badge--email {
  background: var(--c-badge-email-bg);
  border-color: var(--c-badge-email-border);
  color: var(--c-badge-email-text);
}

/* idcard：暖橙描边 + 深橙字 */
.verification-badge--idcard {
  background: var(--c-badge-idcard-bg);
  border-color: var(--c-badge-idcard-border);
  color: var(--c-badge-idcard-text);
}

.verification-badge__icon {
  flex-shrink: 0;
}

.verification-badge--sm .verification-badge__icon {
  width: 20rpx;
  height: 20rpx;
}

.verification-badge--md .verification-badge__icon {
  width: 24rpx;
  height: 24rpx;
}

.verification-badge__label {
  font-weight: 600;
  line-height: 1;
}

.verification-badge--sm .verification-badge__label {
  font-size: var(--fs-xs);
}

.verification-badge--md .verification-badge__label {
  font-size: var(--fs-sm);
}

/* ========== "去认证"CTA 按钮：描边按钮风格 ========== */
.verification-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full);
  border: 1rpx dashed var(--c-brand-300);
  background: var(--c-bg-brand);
  color: var(--c-brand-600);
  white-space: nowrap;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.verification-cta--sm {
  padding: 2rpx var(--sp-3);
}

.verification-cta--md {
  padding: var(--sp-1) var(--sp-4);
}

.verification-cta__text {
  font-weight: 600;
  line-height: 1;
}

.verification-cta--sm .verification-cta__text {
  font-size: var(--fs-xs);
}

.verification-cta--md .verification-cta__text {
  font-size: var(--fs-sm);
}

.verification-cta--pressed {
  transform: scale(0.96);
  opacity: 0.85;
}
</style>
