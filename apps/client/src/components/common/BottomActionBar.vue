<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  primaryLabel: string;
  secondaryLabel?: string;
  /** 2026-08-07：主按钮禁用态（表单未完成时置灰不可点击） */
  disabled?: boolean;
  /**
   * R6-L15-D07 / R6-L15-D14（位置 P2）：本组件名为 BottomActionBar，
   * 但 `.bar` 只有 display:flex，既无 position:fixed 也无安全区内边距
   * ⇒ 实测主 CTA 悬在内容流末尾（schedule 帧 y=310..353，其下 52% 视口是纯 #EEF7F2 空底；
   * recommend-pref 帧按钮底距 home 指示条 94px）。
   * 传 `fixed` 即启用吸底变体：贴视口底 + `env(safe-area-inset-bottom)` 安全区 + 不透明页底。
   * 默认 false（保持既有 7 个宿主的内容流行为逐字不变，避免突然盖住长列表末行）；
   * 宿主启用时需自行给滚动内容留底部空间。
   */
  fixed?: boolean;
}>();

const { t } = useI18n();

const emit = defineEmits<{
  primary: [];
  secondary: [];
}>();

const barClass = computed(() => ({
  'bar--single': !props.secondaryLabel,
  'bar--fixed': props.fixed,
}));

// 修复（严格模式 noUnusedLocals）：原 `const t = designTokens;` 后未使用 t，
// designTokens 导入也仅用于该别名；模板未引用 designTokens，故导入与别名一并移除。
// emit 在模板 @tap 中使用（不在 #ifdef H5 内），vue-tsc 可识别，无需额外处理。
</script>

<template>
  <view
    class="bar"
    :class="barClass"
    role="toolbar"
    :aria-label="t('common.actionBarAria')"
  >
    <button
      v-if="secondaryLabel"
      class="bar__secondary"
      @tap="emit('secondary')"
      :aria-label="secondaryLabel"
    >
      {{ secondaryLabel }}
    </button>
    <!-- R6-L14-D15（颜色token P2）：不再给原生 <button> 写 disabled 属性。
         微信 UA 对 `button[disabled]:not([type])` 有一组权重更高的默认样式，
         scoped 声明被整条覆盖 ⇒ 实测按钮底 #F7F7F7、文字最深 #A6A6A6，对比 2.27:1，
         代码里写的 --c-neutral-200/--c-text-tertiary 根本没落到画面上。
         禁用语义改由 aria-disabled（无障碍树可读）+ @tap 逻辑拦截（:44 既有守卫）承担。 -->
    <button
      class="bar__primary"
      :class="{ 'bar__primary--disabled': disabled }"
      :aria-disabled="disabled ? 'true' : undefined"
      :aria-label="primaryLabel"
      @tap="!disabled && emit('primary')"
    >
      {{ primaryLabel }}
    </button>
  </view>
</template>

<style scoped>
.bar {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}
.bar--single {
  flex-direction: row;
}

/* R6-L15-D07 / R6-L15-D14：吸底变体（宿主传 fixed 时生效） */
.bar--fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  padding: var(--sp-4) var(--page-padding, 32rpx)
    calc(env(safe-area-inset-bottom) + var(--sp-4));
  background: var(--c-bg-page, #EEF7F2);
}

.bar__primary,
.bar__secondary {
  flex: 1;
  height: 88rpx;
  border: 0;
  border-radius: var(--r-xl);
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  transition: all var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.bar__primary {
  /* 白字压 --c-gradient-brand（#36C99A→#55D5A7）实测 1.83–2.10:1，7+ 宿主共用的主 CTA 全不达标。
     改同族最深档纯色：.95 白合成 #F3F8F6 压 #156B51 = 6.00:1（纯白 6.45:1）≥4.5:1。
     不压全局 --c-gradient-brand：它还是页头/装饰面，改全站令牌会改每一页的观感（另行裁定）。 */
  background: var(--c-brand-800, #156B51);
  color: var(--c-text-inverse, #FFFFFF);
  box-shadow: var(--s-brand);
}
.bar__primary:active {
  transform: scale(0.97);
  transition: all var(--d-fast, 120ms) cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--s-brand-md);
}

/* 2026-08-07：禁用态（表单未完成时置灰、不可点击、无投影）
   R6-L14-D15：① 底色令牌由 --c-neutral-200 改为规范 §1.2 的禁用档 --c-status-disabled(#DCE5E2)，
   并把两处兜底字面量同步成令牌现值（原兜底 #E5E8EC / #8A919C 与真值不符，是第二笔令牌债）；
   ② 文字色由 --c-text-tertiary 提到 --c-text-secondary —— 禁用态仍要能被读出：
   #4A524E 压 #DCE5E2 实测 6.15:1（过 WCAG AA 4.5:1），原 UA 覆盖后的 #A6A6A6 压 #F7F7F7 只有 2.27:1。 */
.bar__primary--disabled {
  background: var(--c-status-disabled, #DCE5E2);
  color: var(--c-text-secondary, #4A524E);
  box-shadow: none;
}
.bar__primary--disabled:active {
  transform: none;
  box-shadow: none;
}

.bar__secondary {
  background: var(--c-bg-container);
  color: var(--c-text-primary);
  border: 1rpx solid var(--c-border-default);
}
.bar__secondary:active {
  transform: scale(0.97);
  transition: all var(--d-fast, 120ms) cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--c-neutral-100);
}
</style>
