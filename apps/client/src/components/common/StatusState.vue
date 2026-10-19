<script setup lang="ts">
import { computed } from 'vue';
import { IMAGE_PATHS } from '../../config/images';
import { resolveMediaUrl } from '../../utils/media';

const props = defineProps<{
  /**
   * 语义档。R6-L16-D01（素材缺失 P2）：本组件此前只有 brand/success/warning 三档，
   * 且 warning 硬映射到 ICONS_COMMON.CLOSE（✕ 形）——discussions 页用它表达
   * 「热度上升 / 13 人参与」，画面就把热度画成了一个叉（语义相反）。
   * 新增 heat 档，指向仓内既有且**包内可渲染**的火苗素材
   * （`static/assets/icons/common/fire.png`，localPrefixes 目录 ⇒ real 档随包，非新造路径）。
   */
  tone?: 'brand' | 'success' | 'warning' | 'heat';
  label: string;
}>();

// 修复（严格模式 noUnusedLocals）：原 `const t = designTokens;` 后未使用 t，
// designTokens 导入也仅用于该别名；模板/style 未引用 designTokens，故导入与别名一并移除。

const iconSrc = computed(() => {
  const map: Record<string, string> = {
    brand: IMAGE_PATHS.ICONS_COMMON.CHECK,
    success: IMAGE_PATHS.ICONS_COMMON.CHECK,
    warning: IMAGE_PATHS.ICONS_COMMON.CLOSE,
    heat: IMAGE_PATHS.ICONS_COMMON.FIRE,
  };
  // §1.6 铁律 3：出口统一过解析器（icons/common 属 localPrefixes，解析后逐字不变，
  // 但素材日后改挂 cdn 目录时不必再回头改消费点）
  return resolveMediaUrl(map[props.tone || 'brand']);
});
</script>

<template>
  <view
    class="pill"
    :class="[`pill--${tone || 'brand'}`]"
    role="img"
    :aria-label="label"
  >
    <image class="pill-icon" :src="iconSrc" mode="aspectFit" alt="" />
    <text class="pill-label">{{ label }}</text>
  </view>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  width: fit-content;
  padding: 8rpx 16rpx;
  border-radius: var(--r-full);
  font-size: var(--fs-sm, 22rpx);
  font-weight: 600;
}

.pill-icon {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}

.pill-label {
  font-size: inherit;
  line-height: 1;
}

.pill--brand {
  background: var(--c-brand-50);
  color: var(--c-brand);
}

.pill--success {
  background: var(--c-success-bg-tint, rgba(16, 185, 129, 0.12));
  color: var(--c-success);
}

.pill--warning {
  background: var(--c-warning-bg-tint, rgba(245, 158, 11, 0.12));
  color: var(--c-warning);
}

/* R6-L16-D01：heat 档沿用提醒色阶（discussions 帧实测底 #FEF5E6 / 字墨心 #F49600
   正是 --c-warning-bg-tint 与 --c-warning 两枚令牌），只把图标语义从 ✕ 换成火苗，
   配色不动 ⇒ 不会与同页其他 warning pill 形成断层。 */
.pill--heat {
  background: var(--c-warning-bg-tint, rgba(245, 158, 11, 0.12));
  color: var(--c-warning);
}
</style>
