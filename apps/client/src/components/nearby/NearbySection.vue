<template>
  <view class="nearby-section">
    <view class="nearby-section__head">
      <text class="nearby-section__title">{{ title }}</text>
      <view
        v-if="moreText"
        class="nearby-section__more press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="moreText"
        @tap="$emit('more')"
      >
        <text class="nearby-section__more-text">{{ moreText }}</text>
        <text class="nearby-section__more-arrow">›</text>
      </view>
    </view>
    <slot />
  </view>
</template>

<script setup lang="ts">
/**
 * NearbySection — 附近首页统一分区（v3 Nearby 冻结）
 * 标题 + 右侧「全部/查看全部」+ 内容插槽，保证首页分区视觉一致。
 */
withDefaults(
  defineProps<{
    title: string;
    moreText?: string;
  }>(),
  { moreText: "" }
);

defineEmits<{ (e: "more"): void }>();
</script>

<style scoped lang="scss">
.nearby-section {
  margin-top: 32rpx;
}

.nearby-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4rpx 16rpx;
}

.nearby-section__title {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.nearby-section__more {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.nearby-section__more-text {
  /* R20（2026-09-08）：「全部」入口视觉权重提升——原 22rpx 浅灰与板块标题层级差距过大，
     用户难以发现「查看更多」入口；对齐理想图改为品牌绿 + 加粗 + 更大字号
     R10-L02-D04（颜色token P1）：那一档品牌绿取的是 --c-brand #36C99A，压 #EEF7F2 只有 1.93:1，
     而这是校园圈/附近活动/附近动态三处进入完整列表的唯一入口，几乎看不见。
     按卡改走 --c-brand-800 #156B51（压 #EEF7F2 实测 5.91:1、压白 6.45:1）：
     保留 §1.1.2「绿色=行动」的可点语义（卡建议的另一档 --c-text-secondary 是中性文字色，
     会把入口读成说明文字），也不取卡上点名的 brand-500。字号/字重不动。 */
  font-size: 26rpx;
  font-weight: 600;
  color: var(--c-brand-800, #156B51);
}

.nearby-section__more-arrow {
  /* R10-L02-D04 连带：箭头与「全部」同为一个可点件的两半，必须同档，否则读成半截失效链接 */
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-brand-800, #156B51);
}
</style>
