<script setup lang="ts">
/**
 * TopicSelector - 帖子创建话题选择器组件（功能4）。
 *
 * 功能：
 * - 显示热门话题列表（按使用次数倒序）
 * - 支持搜索话题（实时过滤匹配）
 * - 支持自定义创建新话题（输入名称后点击创建）
 * - 最多选择 3 个话题（由 MAX_TOPIC_SELECTION 约束）
 * - 已选话题显示在顶部，可点击移除
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（hover-class 替代）
 * - 不使用 backdrop-filter
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding
 * - 所有过渡动画内联在 .vue 文件中
 *
 * 错误处理：
 * - 超过 max 选择数时 toast 提示并阻止选中
 * - 创建重复话题时 toast 提示
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  popularTopics,
  MAX_TOPIC_SELECTION,
  type PopularTopic,
} from "../../config/popular-topics";
import { lightHaptic } from "../../utils/haptic";

const { t } = useI18n();

/**
 * 组件 props。
 */
const props = defineProps<{
  /** 已选话题名称列表（不含 # 前缀） */
  modelValue: string[];
}>();

/**
 * 组件 emit。
 */
const emit = defineEmits<{
  /** 话题选择变化时触发，回传完整的已选话题名称列表 */
  (e: "update:modelValue", value: string[]): void;
}>();

/** 搜索关键词 */
const searchKeyword = ref("");

/** 自定义创建话题输入 */
const customTopicInput = ref("");

/**
 * 根据搜索关键词过滤后的热门话题列表。
 * - 关键词为空时返回完整列表
 * - 关键词非空时返回名称包含关键词的话题
 */
const filteredTopics = computed<PopularTopic[]>(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return popularTopics;
  }
  return popularTopics.filter((topic) =>
    topic.name.toLowerCase().includes(keyword),
  );
});

/**
 * 已选话题的展示信息（用于顶部已选区渲染）。
 */
const selectedTopics = computed(() => {
  return props.modelValue.map((name) => ({
    name,
    usageCount: popularTopics.find((p) => p.name === name)?.usageCount,
  }));
});

/**
 * 判断话题是否已选中。
 */
function isSelected(name: string): boolean {
  return props.modelValue.includes(name);
}

/**
 * 切换话题选中态。
 * - 选中：检查是否超过 max 限制
 * - 取消：直接移除
 */
function toggleTopic(name: string): void {
  lightHaptic();
  const idx = props.modelValue.indexOf(name);
  if (idx >= 0) {
    // 取消选中
    const next = [...props.modelValue.slice(0, idx), ...props.modelValue.slice(idx + 1)];
    emit("update:modelValue", next);
    return;
  }

  // 选中：检查 max 限制
  if (props.modelValue.length >= MAX_TOPIC_SELECTION) {
    uni.showToast({
      title: t("topicSelector.maxReached", { max: MAX_TOPIC_SELECTION }),
      icon: "none",
    });
    return;
  }

  emit("update:modelValue", [...props.modelValue, name]);
}

/**
 * 移除已选话题（顶部已选区点击 chip 触发）。
 */
function removeTopic(name: string): void {
  lightHaptic();
  const idx = props.modelValue.indexOf(name);
  if (idx >= 0) {
    emit("update:modelValue", [
      ...props.modelValue.slice(0, idx),
      ...props.modelValue.slice(idx + 1),
    ]);
  }
}

/**
 * 创建自定义话题。
 * - 输入为空时 toast 提示
 * - 话题已存在（热门话题或已选话题）时 toast 提示
 * - 创建成功后自动选中并清空输入
 */
function createCustomTopic(): void {
  const name = customTopicInput.value.trim();
  if (!name) {
    uni.showToast({ title: t("topicSelector.createTopicPlaceholder"), icon: "none" });
    return;
  }

  // 检查是否已存在
  const existsInHot = popularTopics.some((p) => p.name === name);
  const existsInSelected = props.modelValue.includes(name);
  if (existsInHot || existsInSelected) {
    uni.showToast({ title: t("topicSelector.createTopicExists"), icon: "none" });
    return;
  }

  // 检查 max 限制
  if (props.modelValue.length >= MAX_TOPIC_SELECTION) {
    uni.showToast({
      title: t("topicSelector.maxReached", { max: MAX_TOPIC_SELECTION }),
      icon: "none",
    });
    return;
  }

  lightHaptic();
  emit("update:modelValue", [...props.modelValue, name]);
  customTopicInput.value = "";
}

/**
 * 清空所有已选话题。
 */
function clearAll(): void {
  lightHaptic();
  emit("update:modelValue", []);
}
</script>

<template>
  <view class="topic-selector">
    <!-- 顶部标题区 -->
    <view class="topic-selector__header">
      <text class="topic-selector__title">{{ t('topicSelector.title') }}</text>
      <text class="topic-selector__subtitle">{{ t('topicSelector.subtitle') }}</text>
    </view>

    <!-- 已选话题区 -->
    <view class="topic-selector__selected">
      <view class="topic-selector__selected-header">
        <text class="topic-selector__selected-label">
          {{ t('topicSelector.selectedTopics') }}
        </text>
        <text class="topic-selector__selected-count">
          {{ t('topicSelector.selectedCount', { n: modelValue.length, max: MAX_TOPIC_SELECTION }) }}
        </text>
        <view
          v-if="modelValue.length > 0"
          class="topic-selector__clear press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="clearAll"
        >
          <text class="topic-selector__clear-text">{{ t('topicSelector.clearAll') }}</text>
        </view>
      </view>

      <view v-if="selectedTopics.length > 0" class="topic-selector__chips">
        <view
          v-for="topic in selectedTopics"
          :key="`sel-${topic.name}`"
          class="topic-chip topic-chip--selected press-feedback"
          hover-class="topic-chip--hover"
          hover-stay-time="100"
          @tap="removeTopic(topic.name)"
        >
          <text class="topic-chip__text">#{{ topic.name }}</text>
          <text class="topic-chip__remove">×</text>
        </view>
      </view>
      <view v-else class="topic-selector__empty">
        <text class="topic-selector__empty-text">{{ t('topicSelector.emptyTip') }}</text>
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="topic-selector__search">
      <input
        v-model="searchKeyword"
        class="topic-selector__search-input"
        :placeholder="t('topicSelector.searchPlaceholder')"
        placeholder-class="topic-selector__search-placeholder" aria-label="t('topicSelector.searchPlaceholder')"
      />
    </view>

    <!-- 热门话题列表 -->
    <view class="topic-selector__hot">
      <text class="topic-selector__hot-title">{{ t('topicSelector.hotTopics') }}</text>
      <view v-if="filteredTopics.length > 0" class="topic-selector__chips">
        <view
          v-for="topic in filteredTopics"
          :key="topic.id"
          :class="[
            'topic-chip',
            'press-feedback',
            isSelected(topic.name) && 'topic-chip--selected',
          ]"
          hover-class="topic-chip--hover"
          hover-stay-time="100"
          @tap="toggleTopic(topic.name)"
        >
          <text class="topic-chip__text">#{{ topic.name }}</text>
          <text class="topic-chip__count">{{ topic.usageCount }}</text>
        </view>
      </view>
      <view v-else class="topic-selector__empty">
        <text class="topic-selector__empty-text">{{ t('topicSelector.searchEmpty') }}</text>
      </view>
    </view>

    <!-- 创建自定义话题 -->
    <view class="topic-selector__create">
      <text class="topic-selector__create-label">{{ t('topicSelector.createTopic') }}</text>
      <view class="topic-selector__create-input-wrap">
        <input
          v-model="customTopicInput"
          class="topic-selector__create-input"
          :placeholder="t('topicSelector.createTopicPlaceholder')"
          placeholder-class="topic-selector__search-placeholder" aria-label="t('topicSelector.createTopicPlaceholder')"
        />
        <view
          class="topic-selector__create-btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="createCustomTopic"
        >
          <text class="topic-selector__create-btn-text">{{ t('topicSelector.createTopicBtn') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.topic-selector {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.topic-selector__header {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.topic-selector__title {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.topic-selector__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

/* 已选区 */
.topic-selector__selected {
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-bg-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.topic-selector__selected-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.topic-selector__selected-label {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-text-secondary);
}

.topic-selector__selected-count {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  flex: 1;
}

.topic-selector__clear {
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
  background: var(--c-bg-container);
}

.topic-selector__clear-text {
  font-size: var(--fs-xs);
  color: var(--c-brand);
}

.topic-selector__empty {
  padding: var(--sp-2) 0;
}

.topic-selector__empty-text {
  font-size: var(--fs-xs);
  color: var(--c-text-quaternary);
}

/* 搜索框 */
.topic-selector__search {
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  background: var(--c-bg-page);
  border: 1rpx solid var(--c-border-default);
}

.topic-selector__search-input {
  width: 100%;
  height: 60rpx;
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
}

.topic-selector__search-placeholder {
  color: var(--c-text-quaternary);
}

/* 热门话题区 */
.topic-selector__hot {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.topic-selector__hot-title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

/* chip 列表 */
.topic-selector__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

/* 单个 chip */
.topic-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
  background: var(--c-bg-page);
  border: 1rpx solid var(--c-border-default);
}

.topic-chip--selected {
  background: var(--c-bg-brand);
  border-color: var(--c-brand-200);
}

.topic-chip--hover {
  transform: scale(0.96);
  opacity: 0.85;
}

.topic-chip__text {
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
}

.topic-chip--selected .topic-chip__text {
  color: var(--c-brand-700);
  font-weight: 600;
}

.topic-chip__count {
  font-size: var(--fs-xs);
  color: var(--c-text-quaternary);
}

.topic-chip__remove {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  line-height: 1;
  margin-left: 4rpx;
}

/* 创建自定义话题 */
.topic-selector__create {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.topic-selector__create-label {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.topic-selector__create-input-wrap {
  display: flex;
  gap: var(--sp-2);
  align-items: stretch;
}

.topic-selector__create-input {
  flex: 1;
  height: 72rpx;
  padding: 0 var(--sp-3);
  border-radius: var(--r-md);
  background: var(--c-bg-page);
  border: 1rpx solid var(--c-border-default);
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
}

.topic-selector__create-btn {
  padding: 0 var(--sp-4);
  border-radius: var(--r-md);
  background: var(--c-brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

.topic-selector__create-btn-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 500;
  white-space: nowrap;
}
</style>
