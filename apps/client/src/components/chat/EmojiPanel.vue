<script setup lang="ts">
/**
 * EmojiPanel - 表情面板（2026-08-09 微信 1:1 重构）
 *
 * 8 列 × 4 行共 32 个系统 emoji（纯 Unicode 字符，无图片资源依赖，跨端一致）。
 * 点击表情 emit select，由父页面追加到输入框草稿末尾（微信行为：表情插入可继续编辑）。
 */
import { useI18n } from "vue-i18n";

const emit = defineEmits<{
  /** 选中某个表情 */
  select: [emoji: string];
}>();

const { t } = useI18n();

/** 系统 emoji 字符集（纯 Unicode，无资源依赖；32 个覆盖常用表情） */
const EMOJIS: string[] = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘",
  "😎", "🤩", "🥳", "😋", "😜", "🤔", "🥺", "😭",
  "😤", "😡", "🤗", "😇", "😴", "🥱", "🤝", "👍",
  "👎", "👏", "🙏", "💪", "❤️", "💔", "✨", "🎉",
];

/** 表情 ARIA 标签：直接使用表情字符本身 */
function emojiAria(emoji: string): string {
  return emoji;
}
</script>

<template>
  <view
    class="emoji-panel"
    role="listbox"
    :aria-label="t('chat.emojiPanelAria')"
  >
    <view
      v-for="(emoji, idx) in EMOJIS"
      :key="idx"
      class="emoji-panel__item press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      @tap="emit('select', emoji)"
      role="option"
      :aria-label="emojiAria(emoji)"
    >
      <text class="emoji-panel__emoji">{{ emoji }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* 8 列网格：4 列布局在窄屏也保持等宽（grid 支持，参考页面既有 grid 用法） */
.emoji-panel {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--sp-2);
  padding: var(--sp-5) var(--sp-4);
  background: var(--c-bg-container, #FFFFFF);
  border-top: 1rpx solid var(--c-divider, rgba(15, 23, 42, 0.06));
  max-height: 400rpx;
  overflow-y: auto;
}

.emoji-panel__item {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 表情格固定高度，无对应 token 档位 */
  height: 80rpx;
  border-radius: var(--r-md, 12rpx);
}

.emoji-panel__item:active {
  background: var(--c-neutral-100, rgba(0, 0, 0, 0.05));
}

.emoji-panel__emoji {
  font-size: 44rpx;
  line-height: 1;
}
</style>
