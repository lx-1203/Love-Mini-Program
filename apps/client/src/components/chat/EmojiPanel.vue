<script setup lang="ts">
/**
 * EmojiPanel - 表情面板（2026-08-26 第三轮 emoji→SVG 重构）
 *
 * 8 列 × 4 行共 32 个表情格，全部用标准 SVG 渲染（mp-weixin `<image>`）。
 * - 7 个品牌吉祥物情绪表情（mascot_calm/crush/shy/cry/hug/sleep/like）
 *   来源：素材/吉祥物/xunmi_mascot_assets/emotion/
 * - 25 个标准笑脸 / 手势表情（Twemoji 14.0.2，CC-BY 4.0）
 *   来源：https://github.com/twitter/twemoji assets/svg/
 *
 * 数据格式保持兼容：emit 仍然是原始 emoji Unicode 字符（FE0F 变体符保留），
 * ChatBubble / EmojiText 渲染层会再次把 emoji 字符转成同源 SVG，避免重复下载。
 */
import { useI18n } from "vue-i18n";
import { lookupEmoji } from "../../config/emoji-map";

const emit = defineEmits<{
  /** 选中某个表情（emit 仍是原始 Unicode 字符，保持数据兼容） */
  select: [emoji: string];
}>();

const { t } = useI18n();

/** 表情顺序与 EmojiPanel v2 一致：32 个覆盖常用情绪/手势/动作 */
const EMOJIS: string[] = [
  "\u{1F600}", "\u{1F601}", "\u{1F602}", "\u{1F923}", "\u{1F60A}", "\u{1F60D}", "\u{1F970}", "\u{1F618}",
  "\u{1F60E}", "\u{1F929}", "\u{1F973}", "\u{1F60B}", "\u{1F61C}", "\u{1F914}", "\u{1F97A}", "\u{1F62D}",
  "\u{1F624}", "\u{1F621}", "\u{1F917}", "\u{1F607}", "\u{1F634}", "\u{1F971}", "\u{1F91D}", "\u{1F44D}",
  "\u{1F44E}", "\u{1F44F}", "\u{1F64F}", "\u{1F4AA}", "\u2764\uFE0F", "\u{1F494}", "\u2728", "\u{1F389}",
];

/** 每个表情格的 SVG 路径（运行期 lookup，缺图时降级为 system text 渲染） */
function svgSrc(emoji: string): string {
  return lookupEmoji(emoji) || "";
}

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
      <image
        v-if="svgSrc(emoji)"
        class="emoji-panel__emoji"
        :src="svgSrc(emoji)"
        mode="aspectFit"
        lazy-load="true"
      />
      <text v-else class="emoji-panel__emoji-fallback">{{ emoji }}</text>
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
  /* 与原 emoji 字号（44rpx）相当；显式声明防止 image 默认 320px */
  width: 56rpx;
  height: 56rpx;
  display: block;
  /* 2026-08-31 待办：首次打开渲染不全——SVG 未加载完成前给浅色底占位，避免空洞 */
  background: var(--c-bg-surface, #EEF7F2);
  border-radius: var(--r-sm, 8rpx);
}

.emoji-panel__emoji-fallback {
  font-size: 44rpx;
  line-height: 1;
}
</style>