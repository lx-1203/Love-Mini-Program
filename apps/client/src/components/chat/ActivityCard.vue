<script setup lang="ts">
/**
 * 活动卡片消息组件（私聊 kind=activity 渲染）
 *
 * 复用官方号会话页 card 类型的内联卡片样式：
 * - 绿粉渐变底 + 圆角（左上小角，气泡风格）
 * - tag 粉底白字 + 标题 + 描述 + 「查看详情」CTA（SVG 箭头，无 emoji 字符）
 *
 * 点击整卡 → emit tap-card(targetUrl)，由父组件 openAppPath 跳转活动详情。
 */
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";

export interface ActivityCardData {
  title: string;
  desc: string;
  tag: string;
  targetUrl: string;
}

const props = withDefaults(
  defineProps<{
    card: ActivityCardData;
  }>(),
  {}
);

const emit = defineEmits<{
  tapCard: [targetUrl: string];
}>();

const { t } = useI18n();

const chevronRightSrc = IMAGE_PATHS.ICONS_COMMON.CHEVRON_RIGHT_SVG;

function handleTap() {
  if (props.card.targetUrl) {
    emit("tapCard", props.card.targetUrl);
  }
}
</script>

<template>
  <view
    class="activity-card press-feedback"
    hover-class="press-feedback--active"
    hover-stay-time="120"
    role="button"
    :aria-label="t('chat.activityCardAria', { title: card.title })"
    @tap="handleTap"
  >
    <view class="activity-card__header">
      <text v-if="card.tag" class="activity-card__tag">{{ card.tag }}</text>
      <text class="activity-card__title">{{ card.title }}</text>
    </view>
    <text v-if="card.desc" class="activity-card__desc">{{ card.desc }}</text>
    <view class="activity-card__cta">
      <text>{{ t("chat.activityCardCta") }}</text>
      <image class="activity-card__cta-arrow" :src="chevronRightSrc" mode="aspectFit" alt="" />
    </view>
  </view>
</template>

<style scoped lang="scss">
/* 复用官方号会话 card 内联卡片样式（绿粉渐变 + 左上小角气泡风格） */
.activity-card {
  max-width: 100%;
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-lg);
  border-top-left-radius: 4rpx;
  background: linear-gradient(135deg, var(--c-brand-50), var(--c-romance-50));
  border: 1rpx solid var(--c-brand-shadow-tint);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.activity-card__header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.activity-card__tag {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  background: linear-gradient(135deg, var(--c-romance-400), var(--c-romance-500));
  padding: 2rpx 12rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.activity-card__title {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-card__desc {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  font-size: var(--fs-sm);
  color: var(--c-brand-400);
  font-weight: 600;
  align-self: flex-end;
}

.activity-card__cta-arrow {
  width: 20rpx;
  height: 20rpx;
  flex-shrink: 0;
}
</style>
