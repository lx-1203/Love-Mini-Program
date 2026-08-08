<script setup lang="ts">
/**
 * 置顶帖折叠条（PinnedPostsBar）
 *
 * 2026-08-08 频道化重构：QQ 频道「置顶帖折叠为一条」风格。
 * 默认折叠为一条「置顶 N 条」，点击展开列出置顶帖标题 + 摘要，点击帖子进详情。
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PostItem } from "../../stores/village";
import { IMAGE_PATHS } from "../../config/images";

// 修复（vue-tsc TS6133）：模板使用短变量 posts，无需 const props 持有返回值
defineProps<{
  posts: PostItem[];
}>();

const emit = defineEmits<{
  (e: "open", postId: string): void;
}>();

const { t } = useI18n();

/** 是否展开置顶列表 */
const expanded = ref(false);

function toggle() {
  expanded.value = !expanded.value;
}

function open(postId: string) {
  emit("open", postId);
}
</script>

<template>
  <view v-if="posts.length > 0" class="pinned-bar">
    <!-- 折叠条：置顶 N 条 -->
    <view
      class="pinned-bar__summary press-feedback"
      hover-class="pinned-bar__summary--pressed"
      hover-stay-time="100"
      role="button"
      :aria-label="t('village.pinnedToggle', { n: posts.length })"
      :aria-expanded="expanded"
      @tap="toggle"
    >
      <image class="pinned-bar__pin" :src="IMAGE_PATHS.ICONS_EMOJI.PIN" mode="aspectFit" alt="" />
      <text class="pinned-bar__text">{{ t('village.pinnedCount', { n: posts.length }) }}</text>
      <text class="pinned-bar__arrow">{{ expanded ? '—' : '›' }}</text>
    </view>

    <!-- 展开列表 -->
    <view v-if="expanded" class="pinned-bar__list">
      <view
        v-for="post in posts"
        :key="post.id"
        class="pinned-item press-feedback"
        hover-class="pinned-item--pressed"
        hover-stay-time="100"
        role="button"
        :aria-label="post.title || post.content"
        @tap="open(post.id)"
      >
        <text class="pinned-item__badge">{{ t('village.pinnedBadge') }}</text>
        <view class="pinned-item__body">
          <text class="pinned-item__title">{{ post.title || post.content }}</text>
          <text class="pinned-item__summary">{{ post.content }}</text>
        </view>
        <text class="pinned-item__arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   PinnedPostsBar - 置顶帖折叠条（QQ 频道风格）
   ================================================================ */
.pinned-bar {
  margin: 0 var(--sp-4) var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-brand-100, #ccfbef);
  overflow: hidden;
}

.pinned-bar__summary {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: var(--sp-3) var(--sp-4);
}

.pinned-bar__summary--pressed {
  background: var(--c-neutral-50, #f7f8fa);
}

.pinned-bar__pin {
  width: 32rpx;
  height: 32rpx;
}

.pinned-bar__text {
  flex: 1;
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
}

.pinned-bar__arrow {
  font-size: 28rpx;
  color: var(--c-text-tertiary);
}

.pinned-bar__list {
  border-top: 1rpx solid var(--c-neutral-100, #eef1f6);
}

.pinned-item {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
}

.pinned-item--pressed {
  background: var(--c-neutral-50, #f7f8fa);
}

.pinned-item__badge {
  flex-shrink: 0;
  margin-top: 4rpx;
  padding: 2rpx 12rpx;
  border-radius: var(--r-full);
  font-size: 20rpx;
  color: var(--c-brand-500, #3fcf8e);
  background: var(--c-bg-brand-soft, #f0fdf9);
  border: 1rpx solid var(--c-brand-100, #ccfbef);
}

.pinned-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.pinned-item__title {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pinned-item__summary {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pinned-item__arrow {
  flex-shrink: 0;
  margin-top: 4rpx;
  font-size: 28rpx;
  color: var(--c-text-tertiary);
}
</style>
