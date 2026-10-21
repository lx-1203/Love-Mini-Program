<script setup lang="ts">
defineProps<{
  /** 卡片标题（可选：需要自定义标题行时由调用方自行渲染） */
  title?: string;
  subtitle?: string;
  compact?: boolean;
}>();
</script>

<template>
  <view
    class="card"
    :class="{ 'card--compact': compact }"
    role="region"
    :aria-label="title"
  >
    <text v-if="title" class="card__title">{{ title }}</text>
    <text v-if="subtitle" class="card__subtitle">{{ subtitle }}</text>
    <view class="card__body">
      <slot />
    </view>
  </view>
</template>

<style scoped lang="scss">
// P3 修复：复用 _components.scss 的设计令牌，避免与其他 .card 类重复定义
// 共享样式位置：src/styles/_components.scss 中的 .base-card
// R6-B07（R6-L09-D11 / R6-L15-D03 / R6-L15-D12 / R6-L15-D29）：圆角原写 var(--r-xl)
//   （=24rpx=12px），但规范 §1.4 给「卡片」的语义令牌是 --card-radius=40rpx=20px，
//   --r-xl 只是通用半径档、不承担卡片语义 ⇒ 实测弧跨 ≈9px、规范要 20px。
//   改用 var(--card-radius)（theme/design-variables.scss:699 已定义，40rpx）。
.card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-8);
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  /* R10-L13-D08（颜色token P3 · privacy/agreement 同域判点，出处点名本组件）：
     「全站三套卡片投影并存、取档不一」这一半里，LegalTextPage 两段与活动卡各吃一枚，
     本组件吃 --c-elevation-1（= 0 1rpx 4rpx rgba(15,23,42,.04)，泛用高程档）。
     §1.4 给「卡片」的语义令牌是 --card-shadow，且 R6-B07 已按同一条理由把本组件圆角
     从 --r-xl 归口到 --card-radius（:28-31 注释自证「通用档不承担卡片语义」）⇒ 投影同治。
     换成 --card-shadow（0 8rpx 24rpx .06 + 0 2rpx 8rpx .04，design-variables.scss:424）
     后，卡片投影在 LegalTextPage / SectionCard 两处共用同一枚 §1.4 令牌、单一来源。
     :active 随之归口到同族的 --card-shadow-hover（:425），保持「按压抬升更深」的既有语义。 */
  box-shadow: var(--card-shadow);
  transition: box-shadow var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1),
              border-color var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.card:active {
  box-shadow: var(--card-shadow-hover);
  border: var(--c-border-card-brand);
}

.card--compact {
  padding: var(--sp-7);
}

/* R10-L07-D10（字号 P2 · help，同源复现于 security 五个卡标题）：
   区块标题原取 --fs-2xl=32rpx=16px（帧上 help「常见问题/联系我们」墨迹 13px、
   security 卡标题 14px），§1.3 给区块标题的档是 18/20px，且 16px 与卡内 FAQ 主问句
   --fs-xl=30rpx=15px 只差 1px ⇒ 区块标题失去层级；love-center 自带区块标题已是 18px。
   升到 --fs-3xl=36rpx=18px（design-variables.scss:567）与 love-center 同档、
   与正文拉开 6rpx，且仍低于本页页头标题档不产生新的倒挂。 */
.card__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

/* R10-L12-D08（字号 P2 · recommend-pref）：卡副标说明（"每天在这个时间为你刷新推荐卡片"
   等三句完整句子）原取 --fs-base=24rpx=12px，落在 §1.3「小字/时间戳」档 —— 那两档
   （10/11px 极小、12/13px 标签）都不该承载正文级说明。升到 --fs-lg=28rpx=14px
   （辅助正文档，design-variables.scss:564），行高 1.6 未动；本组件全部消费点
   （help/security/love-center/recommend-pref 等）为竖排卡内一句说明，宽度有余、不溢出。 */
.card__subtitle {
  font-size: var(--fs-lg);
  line-height: 1.6;
  color: var(--c-text-secondary);
}

.card__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
</style>
