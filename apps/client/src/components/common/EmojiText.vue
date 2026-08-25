<script setup lang="ts">
/**
 * EmojiText — 文本中嵌入已知 emoji 自动渲染为 SVG
 *
 * 用法：把 `<text>{{ body }}</text>` 替换为 `<EmojiText :text="body" />`，
 * 即可让 body 中的 32 个聊天 emoji（参见 config/emoji-map.ts）自动用 `<image>` 渲染，
 * 而其余纯文本保持 `<text>` 节点以便正常换行 / 设置样式。
 *
 * 设计要点：
 * - mp-weixin `<text>` + `<image>` 不能直接 inline 混排，所以使用 flex-wrap 容器；
 *   长文本段在自己的 `<text>` 节点内自然换行，emoji 段固定尺寸作为独立 flex item。
 * - 支持 `emoji-size` 控制 emoji 渲染尺寸（rpx/em/px）；不传时用 1.2em（与字号相当）。
 * - 支持 `text-class` / `image-class` 注入额外样式（如 chat bubble 的字号、行高）。
 */
import { computed } from "vue";
import { splitEmojiText, containsEmoji, type EmojiSegment } from "../../config/emoji-map";

const props = withDefaults(
  defineProps<{
    /** 原始文本（可包含 emoji） */
    text: string;
    /** emoji 图片尺寸，如 '36rpx' / '1em' / '40rpx' */
    emojiSize?: string;
    /** 透传给文本 <text> 的额外 class，便于继承父级字号/行高/颜色 */
    textClass?: string;
    /** 透传给 emoji <image> 的额外 class */
    imageClass?: string;
  }>(),
  {
    emojiSize: "1.2em",
    textClass: "",
    imageClass: "",
  }
);

const segments = computed<EmojiSegment[]>(() => {
  if (!props.text) return [];
  // 快速判断：如果不含任何已知 emoji，直接返回单段 text，避免 split 开销
  if (!containsEmoji(props.text)) {
    return [{ type: "text", value: props.text }];
  }
  return splitEmojiText(props.text);
});
</script>

<template>
  <view class="emoji-text">
    <template v-for="(seg, i) in segments" :key="i">
      <image
        v-if="seg.type === 'emoji' && seg.src"
        class="emoji-text__img"
        :class="imageClass"
        :src="seg.src"
        :style="{ width: emojiSize, height: emojiSize }"
        mode="aspectFit"
        aria-hidden="true"
      />
      <text
        v-else
        class="emoji-text__txt"
        :class="textClass"
      >{{ seg.value }}</text>
    </template>
  </view>
</template>

<style scoped lang="scss">
.emoji-text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  /* 与父容器对齐：默认与文本基线对齐 */
  line-height: inherit;
}
.emoji-text__img {
  /* 避免 image 默认 320px / 拉伸：flex 容器内按 emoji-size 限定 */
  flex-shrink: 0;
  display: block;
  /* 与相邻文本基线对齐（mini program 中 vertical-align 行为接近 baseline） */
  vertical-align: middle;
}
.emoji-text__txt {
  /* text 节点本身允许内部换行（mini program 默认按字符断行） */
  word-break: break-word;
}
</style>