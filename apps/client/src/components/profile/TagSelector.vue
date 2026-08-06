<script setup lang="ts">
/**
 * TagSelector - 资料编辑标签选择器组件（功能3）。
 *
 * 功能：
 * - 按 4 大分组（兴趣 / 性格 / 生活方式 / 感情观）展示标签
 * - 每组有独立的 min/max 选择数约束
 * - 已选标签显示在顶部，可点击移除
 * - 标签使用 chip 样式，选中态高亮
 * - 选择超限时通过 toast 提示
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
 * - 低于 min 时不阻止取消（提交时由父组件校验）
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { profileTagGroups, type ProfileTagGroupKey } from "../../config/profile-tags";
import { lightHaptic } from "../../utils/haptic";

const { t } = useI18n();

/**
 * 组件 props。
 */
const props = defineProps<{
  /** 各分组的已选标签值，按 groupKey 索引 */
  modelValue: Partial<Record<ProfileTagGroupKey, string[]>>;
}>();

/**
 * 组件 emit。
 */
const emit = defineEmits<{
  /** 标签选择变化时触发，回传完整的 modelValue */
  (e: "update:modelValue", value: Partial<Record<ProfileTagGroupKey, string[]>>): void;
}>();

/**
 * 当前分组的已选标签数量（用于顶部统计）。
 */
const totalCount = computed(() => {
  return Object.values(props.modelValue).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0,
  );
});

/**
 * 最大可选标签数（所有分组 max 之和）。
 */
const totalMax = computed(() => {
  return profileTagGroups.reduce((sum, g) => sum + g.max, 0);
});

/**
 * 判断标签是否已选中。
 */
function isSelected(groupKey: ProfileTagGroupKey, value: string): boolean {
  const list = props.modelValue[groupKey] ?? [];
  return list.includes(value);
}

/**
 * 切换标签选中态。
 * - 选中：检查是否超过该分组的 max 限制
 * - 取消：直接移除（不阻止，提交时由父组件校验 min）
 */
function toggleTag(group: { key: ProfileTagGroupKey; max: number }, value: string): void {
  lightHaptic();
  const current = props.modelValue[group.key] ?? [];
  const idx = current.indexOf(value);

  if (idx >= 0) {
    // 取消选中：从列表中移除
    const next = [...current.slice(0, idx), ...current.slice(idx + 1)];
    emit("update:modelValue", { ...props.modelValue, [group.key]: next });
    return;
  }

  // 选中：检查 max 限制
  if (current.length >= group.max) {
    uni.showToast({
      title: t("tagSelector.maxReached"),
      icon: "none",
    });
    return;
  }

  // 追加到列表
  emit("update:modelValue", { ...props.modelValue, [group.key]: [...current, value] });
}

/**
 * 移除已选标签（顶部已选区点击 chip 触发）。
 * 通过遍历所有分组定位该 value 所属分组。
 */
function removeTag(value: string): void {
  lightHaptic();
  const next: Partial<Record<ProfileTagGroupKey, string[]>> = { ...props.modelValue };
  for (const group of profileTagGroups) {
    const list = next[group.key] ?? [];
    const idx = list.indexOf(value);
    if (idx >= 0) {
      next[group.key] = [...list.slice(0, idx), ...list.slice(idx + 1)];
      break;
    }
  }
  emit("update:modelValue", next);
}

/**
 * 清空所有已选标签。
 */
function clearAll(): void {
  lightHaptic();
  emit("update:modelValue", {});
}

/**
 * 标签展示文案：优先经 labelKey 走 t() 翻译（支持多语言），
 * 本地静态中文 label 仅作兜底；value 保持英文 key 用于存储/比较。
 */
function tagLabel(opt: { label: string; labelKey?: string }): string {
  return opt.labelKey ? t(opt.labelKey) : opt.label;
}

/**
 * 获取所有已选标签的展示信息（用于顶部已选区渲染）。
 */
const selectedTags = computed(() => {
  const result: Array<{ value: string; label: string; icon?: string }> = [];
  for (const group of profileTagGroups) {
    const list = props.modelValue[group.key] ?? [];
    for (const value of list) {
      const opt = group.options.find((o) => o.value === value);
      if (opt) {
        result.push({ value: opt.value, label: tagLabel(opt), icon: opt.icon });
      }
    }
  }
  return result;
});
</script>

<template>
  <view class="tag-selector">
    <!-- 顶部标题区 -->
    <view class="tag-selector__header">
      <text class="tag-selector__title">{{ t('tagSelector.title') }}</text>
      <text class="tag-selector__subtitle">{{ t('tagSelector.subtitle') }}</text>
    </view>

    <!-- 已选标签区（顶部展示，可点击移除） -->
    <view class="tag-selector__selected">
      <view class="tag-selector__selected-header">
        <text class="tag-selector__selected-label">
          {{ t('tagSelector.selectedTags') }}
        </text>
        <text class="tag-selector__selected-count">
          {{ t('tagSelector.selectedCount', { n: totalCount, max: totalMax }) }}
        </text>
        <view
          v-if="totalCount > 0"
          class="tag-selector__clear press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="clearAll"
        >
          <text class="tag-selector__clear-text">{{ t('tagSelector.clearAll') }}</text>
        </view>
      </view>

      <view v-if="selectedTags.length > 0" class="tag-selector__chips">
        <view
          v-for="tag in selectedTags" :key="`sel-${tag.value}`"
          class="tag-chip tag-chip--selected press-feedback"
          hover-class="tag-chip--hover"
          hover-stay-time="100"
          @tap="removeTag(tag.value)"
        >
          <image v-if="tag.icon" class="tag-chip__emoji" :src="tag.icon" mode="aspectFit" alt="" />
          <text class="tag-chip__text">{{ tag.label }}</text>
          <text class="tag-chip__remove">×</text>
        </view>
      </view>
      <view v-else class="tag-selector__empty">
        <text class="tag-selector__empty-text">{{ t('tagSelector.emptyTip') }}</text>
      </view>
    </view>

    <!-- 分组标签区 -->
    <view
      v-for="group in profileTagGroups" :key="group.key"
      class="tag-selector__group"
    >
      <view class="tag-selector__group-header">
        <text class="tag-selector__group-title">{{ t(`tagSelector.${group.labelKey}`) }}</text>
        <text class="tag-selector__group-count">
          {{ (modelValue[group.key] ?? []).length }}/{{ group.max }}
        </text>
      </view>
      <view class="tag-selector__chips">
        <view
          v-for="opt in group.options" :key="opt.value"
          :class="[
            'tag-chip',
            'press-feedback',
            isSelected(group.key, opt.value) && 'tag-chip--selected',
          ]"
          hover-class="tag-chip--hover"
          hover-stay-time="100"
          @tap="toggleTag(group, opt.value)"
        >
          <image v-if="opt.icon" class="tag-chip__emoji" :src="opt.icon" mode="aspectFit" alt="" />
          <text class="tag-chip__text">{{ tagLabel(opt) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.tag-selector {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.tag-selector__header {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.tag-selector__title {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.tag-selector__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

/* 已选区 */
.tag-selector__selected {
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-bg-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.tag-selector__selected-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.tag-selector__selected-label {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-text-secondary);
}

.tag-selector__selected-count {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  flex: 1;
}

.tag-selector__clear {
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
  background: var(--c-bg-container);
}

.tag-selector__clear-text {
  font-size: var(--fs-xs);
  color: var(--c-brand);
}

.tag-selector__empty {
  padding: var(--sp-2) 0;
}

.tag-selector__empty-text {
  font-size: var(--fs-xs);
  color: var(--c-text-quaternary);
}

/* 分组区 */
.tag-selector__group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.tag-selector__group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tag-selector__group-title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.tag-selector__group-count {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* chip 列表 */
.tag-selector__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

/* 单个 chip */
.tag-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
  background: var(--c-bg-page);
  border: 1rpx solid var(--c-border-default);
}

.tag-chip--selected {
  background: var(--c-bg-brand);
  border-color: var(--c-brand-200);
}

.tag-chip--hover {
  transform: scale(0.96);
  opacity: 0.85;
}

.tag-chip__emoji {
  width: 28rpx;
  height: 28rpx;
  color: var(--c-text-secondary);
}

.tag-chip__text {
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
}

.tag-chip--selected .tag-chip__text {
  color: var(--c-brand-700);
  font-weight: 600;
}

.tag-chip__remove {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  line-height: 1;
  margin-left: 4rpx;
}
</style>
