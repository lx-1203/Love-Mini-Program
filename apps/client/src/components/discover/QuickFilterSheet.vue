<script setup lang="ts">
/**
 * 快速筛选底部弹窗（设计需求：顶部筛选栏）
 *
 * 三个筛选维度，选择后点击「确定」立即生效并刷新卡片：
 * 1. 匹配范围：不限 / 附近
 * 2. 年龄区间：默认 18-35 岁（最小/最大下拉）
 * 3. 排序规则：匹配度优先 / 最新注册 / 最活跃
 *
 * 年龄区间仅维护数字，由父组件写入 recommendationFilter（ageMin/ageMax）。
 */
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { MatchScope, SortBy } from "../../stores/discover";

const props = defineProps<{
  visible: boolean;
  matchScope: MatchScope;
  sortBy: SortBy;
  ageMin?: number;
  ageMax?: number;
}>();

const emit = defineEmits<{
  (e: "update:visible", visible: boolean): void;
  (e: "apply", payload: { matchScope: MatchScope; sortBy: SortBy; ageMin: number; ageMax: number }): void;
}>();

const { t } = useI18n();

const AGE_MIN = 18;
const AGE_MAX = 60;
/** 可选年龄列表（18-60） */
const ageOptions = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);

/** 匹配范围选项 */
const scopeOptions: Array<{ value: MatchScope; label: string }> = [
  { value: "all", label: t("discover.scopeAll") },
  { value: "nearby", label: t("discover.nearby") },
];

/** 排序规则选项 */
const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: "match", label: t("discover.matchPriority") },
  { value: "latest", label: t("discover.sortLatest") },
  { value: "active", label: t("discover.sortActive") },
];

const localScope = ref<MatchScope>("all");
const localSort = ref<SortBy>("match");
const localAgeMin = ref(18);
const localAgeMax = ref(35);

/** 每次打开弹窗时从父级状态同步本地选择（保证抽屉与快捷筛选不互相覆盖） */
watch(
  () => props.visible,
  (val) => {
    if (!val) return;
    localScope.value = props.matchScope;
    localSort.value = props.sortBy;
    localAgeMin.value = props.ageMin ?? 18;
    localAgeMax.value = props.ageMax ?? 35;
    // 防止最小年龄 > 最大年龄
    if (localAgeMin.value > localAgeMax.value) {
      localAgeMax.value = Math.min(localAgeMin.value + 1, AGE_MAX);
    }
  }
);

function close() {
  emit("update:visible", false);
}

function onConfirm() {
  emit("apply", {
    matchScope: localScope.value,
    sortBy: localSort.value,
    ageMin: localAgeMin.value,
    ageMax: localAgeMax.value,
  });
  emit("update:visible", false);
}

function onMinAgeChange(e: { detail: { value: string } }) {
  const value = Number(e.detail.value);
  if (!Number.isNaN(value)) {
    localAgeMin.value = value;
    if (value > localAgeMax.value) localAgeMax.value = Math.min(value + 1, AGE_MAX);
  }
}

function onMaxAgeChange(e: { detail: { value: string } }) {
  const value = Number(e.detail.value);
  if (!Number.isNaN(value)) {
    localAgeMax.value = value;
    if (value < localAgeMin.value) localAgeMin.value = Math.max(value - 1, AGE_MIN);
  }
}

/** picker 显示文案（"18 岁"） */
function ageLabel(age: number): string {
  return `${age}${t("discover.ageUnit")}`;
}
</script>

<template>
  <view v-if="visible" class="quick-filter-mask" @tap="close">
    <view class="quick-filter-sheet" @tap.stop>
      <view class="quick-filter-sheet__handle" />
      <text class="quick-filter-sheet__title">{{ t('discover.quickFilterTitle') }}</text>

      <!-- 匹配范围 -->
      <view class="quick-filter-section">
        <text class="quick-filter-section__label">{{ t('discover.scopeTitle') }}</text>
        <view class="quick-filter-segment">
          <view
            v-for="opt in scopeOptions" :key="opt.value"
            class="quick-filter-segment__item"
            :class="{ 'quick-filter-segment__item--active': localScope === opt.value }"
            role="button"
            :aria-pressed="localScope === opt.value"
            @tap="localScope = opt.value"
          >
            <text class="quick-filter-segment__text">{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <!-- 年龄区间（默认 18-35） -->
      <view class="quick-filter-section">
        <text class="quick-filter-section__label">{{ t('discover.ageRangeTitle') }}</text>
        <view class="quick-filter-age">
          <picker
            class="quick-filter-age__picker"
            :range="ageOptions"
            :value="localAgeMin - AGE_MIN"
            @change="onMinAgeChange"
          >
            <view class="quick-filter-age__box">
              <text class="quick-filter-age__label">{{ t('discover.minAgeLabel') }}</text>
              <text class="quick-filter-age__value">{{ ageLabel(localAgeMin) }}</text>
            </view>
          </picker>
          <text class="quick-filter-age__sep">-</text>
          <picker
            class="quick-filter-age__picker"
            :range="ageOptions"
            :value="localAgeMax - AGE_MIN"
            @change="onMaxAgeChange"
          >
            <view class="quick-filter-age__box">
              <text class="quick-filter-age__label">{{ t('discover.maxAgeLabel') }}</text>
              <text class="quick-filter-age__value">{{ ageLabel(localAgeMax) }}</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 排序规则 -->
      <view class="quick-filter-section">
        <text class="quick-filter-section__label">{{ t('discover.sortTitle') }}</text>
        <view class="quick-filter-radio">
          <view
            v-for="opt in sortOptions" :key="opt.value"
            class="quick-filter-radio__item"
            :class="{ 'quick-filter-radio__item--active': localSort === opt.value }"
            role="button"
            :aria-pressed="localSort === opt.value"
            @tap="localSort = opt.value"
          >
            <view class="quick-filter-radio__dot" />
            <text class="quick-filter-radio__text">{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <view class="quick-filter-sheet__actions">
        <view class="quick-filter-sheet__btn quick-filter-sheet__btn--reset" role="button" @tap="close">
          <text class="quick-filter-sheet__btn-text">{{ t('common.cancel') }}</text>
        </view>
        <view class="quick-filter-sheet__btn quick-filter-sheet__btn--confirm" role="button" @tap="onConfirm">
          <text class="quick-filter-sheet__btn-text">{{ t('common.confirm') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.quick-filter-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-overlay-mid-strong, rgba(15, 23, 42, 0.5));
  display: flex;
  align-items: flex-end;
  z-index: 90;
}

.quick-filter-sheet {
  width: 100%;
  background: var(--c-bg-container, #ffffff);
  border-radius: 32rpx 32rpx 0 0;
  padding: 16rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  animation: quick-filter-slide-up var(--d-normal, 200ms) ease-out;
}

@keyframes quick-filter-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.quick-filter-sheet__handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: var(--c-neutral-200, #e2e8f0);
  align-self: center;
}

.quick-filter-sheet__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
}

.quick-filter-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.quick-filter-section__label {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-text-secondary);
}

/* 分段选择（匹配范围） */
.quick-filter-segment {
  display: flex;
  gap: 12rpx;
}

.quick-filter-segment__item {
  flex: 1;
  padding: 16rpx 0;
  border-radius: var(--r-lg, 16rpx);
  background: var(--c-bg-container, #f8fafc);
  border: 1rpx solid var(--c-overlay-border-light, #e2e8f0);
  text-align: center;
}

.quick-filter-segment__item--active {
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
  border-color: transparent;
}

.quick-filter-segment__text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.quick-filter-segment__item--active .quick-filter-segment__text {
  color: var(--c-text-inverse, #ffffff);
}

/* 年龄区间 */
.quick-filter-age {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.quick-filter-age__picker {
  flex: 1;
}

.quick-filter-age__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 14rpx 0;
  border-radius: var(--r-lg, 16rpx);
  background: var(--c-bg-container, #f8fafc);
  border: 1rpx solid var(--c-overlay-border-light, #e2e8f0);
}

.quick-filter-age__label {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.quick-filter-age__value {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-brand-600, #0d9488);
}

.quick-filter-age__sep {
  font-size: var(--fs-xl);
  color: var(--c-text-tertiary);
}

/* 排序规则单选 */
.quick-filter-radio {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.quick-filter-radio__item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 20rpx;
  border-radius: var(--r-lg, 16rpx);
  background: var(--c-bg-container, #f8fafc);
  border: 1rpx solid var(--c-overlay-border-light, #e2e8f0);
}

.quick-filter-radio__item--active {
  border-color: var(--c-brand-400, #2dd4bf);
  background: var(--c-brand-50, #f0fdf9);
}

.quick-filter-radio__dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  border: 3rpx solid var(--c-neutral-300, #cbd5e1);
  flex-shrink: 0;
}

.quick-filter-radio__item--active .quick-filter-radio__dot {
  border-color: var(--c-brand-500, #3fcf8e);
  background: radial-gradient(circle, var(--c-brand-500, #3fcf8e) 0%, var(--c-brand-500, #3fcf8e) 35%, transparent 40%);
}

.quick-filter-radio__text {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
}

.quick-filter-radio__item--active .quick-filter-radio__text {
  font-weight: 600;
  color: var(--c-brand-600, #0d9488);
}

/* 底部按钮 */
.quick-filter-sheet__actions {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}

.quick-filter-sheet__btn {
  flex: 1;
  padding: 18rpx 0;
  border-radius: var(--r-full);
  text-align: center;
}

.quick-filter-sheet__btn--reset {
  background: var(--c-bg-container, #f8fafc);
  border: 1rpx solid var(--c-overlay-border-light, #e2e8f0);
}

.quick-filter-sheet__btn--confirm {
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
}

.quick-filter-sheet__btn-text {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-primary);
}

.quick-filter-sheet__btn--confirm .quick-filter-sheet__btn-text {
  color: #ffffff;
}
</style>
