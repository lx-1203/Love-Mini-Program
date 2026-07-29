<script setup lang="ts">
/**
 * AdvancedFilter - 推荐高级筛选组件（功能6）。
 *
 * 功能：
 * - 性别筛选（不限 / 男 / 女，单选 chip）
 * - 年龄范围（双滑块，18-60 岁）
 * - 学校筛选（多选 chip，最多 5 个）
 * - 距离范围（单滑块，0-100 km）
 * - 兴趣标签（多选 chip，最多 5 个，复用 profile-tags 的兴趣分组）
 * - 在线状态（仅在线 toggle）
 * - 重置 / 确定按钮（由父组件 FilterDrawer 渲染，本组件仅 emit change）
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（hover-class 替代）
 * - 不使用 backdrop-filter
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding
 * - 所有过渡动画内联在 .vue 文件中
 *
 * 错误处理：
 * - 年龄双滑块互斥约束（min < max）
 * - 兴趣标签超过 5 个时 toast 提示并阻止选中
 * - 学校多选超过 5 个时 toast 提示并阻止选中
 */
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { RecommendationFilter } from "../../services/generated/api-types-supplement";
import { profileTagGroups } from "../../config/profile-tags";
import { lightHaptic } from "../../utils/haptic";

/**
 * 组件 props。
 */
const props = defineProps<{
  /** 当前已应用的高级筛选条件（由父组件传入，用于初始化本地 draft） */
  modelValue: RecommendationFilter;
}>();

/**
 * 组件 emit。
 */
const emit = defineEmits<{
  /** 高级筛选变化时触发，回传完整的 RecommendationFilter（含高级筛选字段） */
  (e: "update:modelValue", value: RecommendationFilter): void;
  /** 用户点击重置（清空所有高级筛选项） */
  (e: "reset"): void;
}>();

const { t } = useI18n();

/* ========== 常量 ========== */

/** 年龄范围常量 */
const AGE_MIN_BOUND = 18;
const AGE_MAX_BOUND = 60;
const AGE_STEP = 1;

/** 距离范围常量（km） */
const DISTANCE_MIN_BOUND = 0;
const DISTANCE_MAX_BOUND = 100;
const DISTANCE_STEP = 5;
const DISTANCE_UNLIMITED = 0; // 0 表示不限

/** 兴趣标签最大选择数 */
const MAX_INTERESTS = 5;

/** 学校多选最大数量 */
const MAX_SCHOOLS = 5;

/** 性别选项 */
const GENDER_OPTIONS = computed(() => [
  { value: "any", label: t("advancedFilter.genderAny") },
  { value: "male", label: t("advancedFilter.genderMale") },
  { value: "female", label: t("advancedFilter.genderFemale") },
] as const);

/**
 * 兴趣标签可选项（复用 profile-tags.ts 的兴趣分组）。
 * 与资料编辑标签选择器保持一致，避免数据源分散。
 */
const INTEREST_OPTIONS = computed(() => {
  const interestGroup = profileTagGroups.find((g) => g.key === "interest");
  return interestGroup ? interestGroup.options : [];
});

/**
 * 学校可选项（本地静态数据，后续可由后端 API 返回）。
 */
const SCHOOL_OPTIONS = [
  "广州大学",
  "中山大学",
  "华南理工大学",
  "暨南大学",
  "华南师范大学",
  "广东外语外贸大学",
  "广东工业大学",
  "广州美术学院",
  "星海音乐学院",
  "深圳大学",
];

/* ========== Draft 状态（用户编辑中的高级筛选条件） ========== */

/** 性别 */
const genderDraft = ref<"any" | "male" | "female">("any");
/** 年龄下限 */
const ageMinDraft = ref<number>(AGE_MIN_BOUND);
/** 年龄上限 */
const ageMaxDraft = ref<number>(AGE_MAX_BOUND);
/** 学校多选 */
const schoolsDraft = ref<string[]>([]);
/** 距离上限 km */
const distanceMaxDraft = ref<number>(DISTANCE_UNLIMITED);
/** 兴趣标签多选 */
const interestsDraft = ref<string[]>([]);
/** 仅在线 */
const onlineOnlyDraft = ref<boolean>(false);

/* ========== Watcher: modelValue 变化时同步 draft ========== */

/**
 * 父组件传入的 modelValue 变化时（如重置），同步到 draft。
 * 仅在外部值与当前 draft 不一致时触发，避免循环更新。
 *
 * 性能优化（P1）：原实现使用 deep: true 监听整个 modelValue 对象，
 * 任何一层属性变化都会触发同步，且每次都会递归遍历对象。
 * 现改为监听具体属性路径（gender / ageMin / ageMax / schools / distanceMax / interests / onlineOnly），
 * 仅在这些属性变化时触发，避免不必要的深度遍历。
 * 注：schools / interests 是数组，引用变化即可触发，无需 deep。
 */
watch(
  () => [
    props.modelValue?.gender,
    props.modelValue?.ageMin,
    props.modelValue?.ageMax,
    props.modelValue?.schools,
    props.modelValue?.distanceMax,
    props.modelValue?.interests,
    props.modelValue?.onlineOnly,
  ],
  () => {
    const val = props.modelValue;
    if (!val) return;
    genderDraft.value = (val.gender as "any" | "male" | "female") ?? "any";
    ageMinDraft.value = val.ageMin ?? AGE_MIN_BOUND;
    ageMaxDraft.value = val.ageMax ?? AGE_MAX_BOUND;
    schoolsDraft.value = val.schools ? [...val.schools] : [];
    distanceMaxDraft.value = val.distanceMax ?? DISTANCE_UNLIMITED;
    interestsDraft.value = val.interests ? [...val.interests] : [];
    onlineOnlyDraft.value = val.onlineOnly ?? false;
  },
  { immediate: true },
);

/* ========== 性别筛选 ========== */

/**
 * 选择性别。
 */
function selectGender(value: "any" | "male" | "female"): void {
  lightHaptic();
  genderDraft.value = value;
  emitChange();
}

/* ========== 年龄范围（双滑块互斥约束） ========== */

/**
 * 年龄下限变更：不允许超过上限-1。
 */
function onAgeMinChange(e: { detail: { value: number } }): void {
  const value = e.detail.value;
  if (value >= ageMaxDraft.value) {
    ageMinDraft.value = ageMaxDraft.value - AGE_STEP;
  } else {
    ageMinDraft.value = value;
  }
  lightHaptic();
  emitChange();
}

/**
 * 年龄上限变更：不允许低于下限+1。
 */
function onAgeMaxChange(e: { detail: { value: number } }): void {
  const value = e.detail.value;
  if (value <= ageMinDraft.value) {
    ageMaxDraft.value = ageMinDraft.value + AGE_STEP;
  } else {
    ageMaxDraft.value = value;
  }
  lightHaptic();
  emitChange();
}

/** 年龄范围显示文案 */
const ageRangeDisplayText = computed(() => {
  return t("advancedFilter.ageRangeValue", {
    min: ageMinDraft.value,
    max: ageMaxDraft.value,
  });
});

/* ========== 学校多选 ========== */

/**
 * 切换学校选中态。
 * - 超过 MAX_SCHOOLS 时 toast 提示并阻止选中。
 */
function toggleSchool(school: string): void {
  lightHaptic();
  const idx = schoolsDraft.value.indexOf(school);
  if (idx >= 0) {
    schoolsDraft.value.splice(idx, 1);
  } else {
    if (schoolsDraft.value.length >= MAX_SCHOOLS) {
      uni.showToast({
        title: t("advancedFilter.interestMaxReached"),
        icon: "none",
      });
      return;
    }
    schoolsDraft.value.push(school);
  }
  emitChange();
}

/** 判断学校是否已选中 */
function isSchoolSelected(school: string): boolean {
  return schoolsDraft.value.includes(school);
}

/** 学校已选数量文案 */
const schoolsValueText = computed(() => {
  return schoolsDraft.value.length > 0
    ? t("advancedFilter.appliedCount", { n: schoolsDraft.value.length })
    : t("advancedFilter.schoolAny");
});

/* ========== 距离范围 ========== */

/**
 * 距离上限变更。
 */
function onDistanceChange(e: { detail: { value: number } }): void {
  distanceMaxDraft.value = e.detail.value;
  lightHaptic();
  emitChange();
}

/** 距离范围显示文案 */
const distanceDisplayText = computed(() => {
  if (distanceMaxDraft.value === DISTANCE_UNLIMITED) {
    return t("advancedFilter.distanceAny");
  }
  return t("advancedFilter.distanceValue", { n: distanceMaxDraft.value });
});

/* ========== 兴趣标签多选 ========== */

/**
 * 切换兴趣标签选中态。
 * - 超过 MAX_INTERESTS 时 toast 提示并阻止选中。
 */
function toggleInterest(value: string): void {
  lightHaptic();
  const idx = interestsDraft.value.indexOf(value);
  if (idx >= 0) {
    interestsDraft.value.splice(idx, 1);
  } else {
    if (interestsDraft.value.length >= MAX_INTERESTS) {
      uni.showToast({
        title: t("advancedFilter.interestMaxReached"),
        icon: "none",
      });
      return;
    }
    interestsDraft.value.push(value);
  }
  emitChange();
}

/** 判断兴趣标签是否已选中 */
function isInterestSelected(value: string): boolean {
  return interestsDraft.value.includes(value);
}

/* ========== 在线状态 toggle ========== */

/**
 * 切换仅在线开关。
 */
function toggleOnlineOnly(): void {
  lightHaptic();
  onlineOnlyDraft.value = !onlineOnlyDraft.value;
  emitChange();
}

/* ========== 构建最终 filter 并 emit ========== */

/**
 * 构建包含高级筛选字段的 RecommendationFilter。
 * 仅填充用户实际设置的（非默认值）字段，避免无谓的字段透传。
 */
function buildAdvancedFilter(): RecommendationFilter {
  const filter: RecommendationFilter = { ...props.modelValue };

  // 性别：any 时不透传
  if (genderDraft.value !== "any") {
    filter.gender = genderDraft.value;
  } else {
    filter.gender = undefined;
  }

  // 年龄范围：仅在非默认范围时透传
  if (ageMinDraft.value !== AGE_MIN_BOUND || ageMaxDraft.value !== AGE_MAX_BOUND) {
    filter.ageMin = ageMinDraft.value;
    filter.ageMax = ageMaxDraft.value;
  } else {
    filter.ageMin = undefined;
    filter.ageMax = undefined;
  }

  // 学校多选
  if (schoolsDraft.value.length > 0) {
    filter.schools = [...schoolsDraft.value];
  } else {
    filter.schools = undefined;
  }

  // 距离上限：0 表示不限
  if (distanceMaxDraft.value !== DISTANCE_UNLIMITED) {
    filter.distanceMax = distanceMaxDraft.value;
  } else {
    filter.distanceMax = undefined;
  }

  // 兴趣标签
  if (interestsDraft.value.length > 0) {
    filter.interests = [...interestsDraft.value];
  } else {
    filter.interests = undefined;
  }

  // 仅在线
  filter.onlineOnly = onlineOnlyDraft.value ? true : undefined;

  return filter;
}

/**
 * 统一 emit 变更事件，由父组件决定是否即时应用。
 */
function emitChange(): void {
  emit("update:modelValue", buildAdvancedFilter());
}

/* ========== 重置（清空所有高级筛选项） ========== */

/**
 * 重置本地 draft 到默认值，并 emit update + reset 事件。
 * 由父组件在点击「重置」按钮时调用，或本组件直接暴露给父组件。
 */
function reset(): void {
  lightHaptic();
  genderDraft.value = "any";
  ageMinDraft.value = AGE_MIN_BOUND;
  ageMaxDraft.value = AGE_MAX_BOUND;
  schoolsDraft.value = [];
  distanceMaxDraft.value = DISTANCE_UNLIMITED;
  interestsDraft.value = [];
  onlineOnlyDraft.value = false;
  emit("update:modelValue", buildAdvancedFilter());
  emit("reset");
}

/**
 * 暴露 reset 方法供父组件调用（通过 ref）。
 */
defineExpose({ reset });
</script>

<template>
  <view class="advanced-filter">
    <!-- 性别筛选 -->
    <view class="filter-section">
      <view class="filter-section__head">
        <text class="filter-section__title">{{ t('advancedFilter.genderLabel') }}</text>
      </view>
      <view class="chip-group">
        <view
          v-for="opt in GENDER_OPTIONS"
          :key="opt.value"
          class="filter-chip press-feedback"
          :class="{ 'filter-chip--active': genderDraft === opt.value }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="selectGender(opt.value)"
        >
          <text class="filter-chip__text">{{ opt.label }}</text>
        </view>
      </view>
    </view>

    <!-- 年龄范围 -->
    <view class="filter-section">
      <view class="filter-section__head">
        <text class="filter-section__title">{{ t('advancedFilter.ageRangeLabel') }}</text>
        <text class="filter-section__value">{{ ageRangeDisplayText }}</text>
      </view>
      <view class="filter-section__sliders">
        <slider
          class="age-slider"
          :min="AGE_MIN_BOUND"
          :max="AGE_MAX_BOUND"
          :step="AGE_STEP"
          :value="ageMinDraft"
          activeColor="var(--c-brand-500)"
          backgroundColor="var(--c-neutral-200)"
          block-color="var(--c-brand-600)"
          block-size="22"
          @change="onAgeMinChange"
        />
        <slider
          class="age-slider"
          :min="AGE_MIN_BOUND"
          :max="AGE_MAX_BOUND"
          :step="AGE_STEP"
          :value="ageMaxDraft"
          activeColor="var(--c-romance-500)"
          backgroundColor="var(--c-neutral-200)"
          block-color="var(--c-romance-500)"
          block-size="22"
          @change="onAgeMaxChange"
        />
      </view>
    </view>

    <!-- 学校筛选 -->
    <view class="filter-section">
      <view class="filter-section__head">
        <text class="filter-section__title">{{ t('advancedFilter.schoolLabel') }}</text>
        <text class="filter-section__value">{{ schoolsValueText }}</text>
      </view>
      <view class="chip-group">
        <view
          v-for="school in SCHOOL_OPTIONS"
          :key="school"
          class="filter-chip press-feedback"
          :class="{ 'filter-chip--active': isSchoolSelected(school) }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="toggleSchool(school)"
        >
          <text class="filter-chip__text">{{ school }}</text>
        </view>
      </view>
    </view>

    <!-- 距离范围 -->
    <view class="filter-section">
      <view class="filter-section__head">
        <text class="filter-section__title">{{ t('advancedFilter.distanceLabel') }}</text>
        <text class="filter-section__value">{{ distanceDisplayText }}</text>
      </view>
      <slider
        class="distance-slider"
        :min="DISTANCE_MIN_BOUND"
        :max="DISTANCE_MAX_BOUND"
        :step="DISTANCE_STEP"
        :value="distanceMaxDraft"
        activeColor="var(--c-brand-500)"
        backgroundColor="var(--c-neutral-200)"
        block-color="var(--c-brand-600)"
        block-size="22"
        @change="onDistanceChange"
      />
    </view>

    <!-- 兴趣标签 -->
    <view class="filter-section">
      <view class="filter-section__head">
        <text class="filter-section__title">{{ t('advancedFilter.interestLabel') }}</text>
        <text class="filter-section__value">
          {{ interestsDraft.length }}/{{ MAX_INTERESTS }}
        </text>
      </view>
      <view class="chip-group">
        <view
          v-for="opt in INTEREST_OPTIONS"
          :key="opt.value"
          class="filter-chip press-feedback"
          :class="{ 'filter-chip--active': isInterestSelected(opt.value) }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="toggleInterest(opt.value)"
        >
          <text class="filter-chip__text">
            {{ opt.emoji ? `${opt.emoji} ` : "" }}{{ opt.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 在线状态 -->
    <view class="filter-section">
      <view class="filter-section__head">
        <text class="filter-section__title">{{ t('advancedFilter.onlineLabel') }}</text>
      </view>
      <view
        class="toggle-row press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="toggleOnlineOnly"
      >
        <text class="toggle-row__label">{{ t('advancedFilter.onlineOnly') }}</text>
        <view class="toggle-switch" :class="{ 'toggle-switch--on': onlineOnlyDraft }">
          <view class="toggle-knob" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/**
 * 高级筛选样式说明：
 * - 复用 FilterDrawer 的 chip / slider 样式风格，保持视觉一致性
 * - 所有交互元素均使用 hover-class 替代 :hover 伪类（mp-weixin 兼容）
 */
.advanced-filter {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

/* ========== 筛选分段 ========== */
.filter-section {
  padding: var(--sp-5) 0;
  border-bottom: 1rpx solid var(--c-border-light);
}

.filter-section:last-of-type {
  border-bottom: none;
}

.filter-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
}

.filter-section__title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.filter-section__value {
  font-size: var(--fs-base);
  color: var(--c-brand-600);
  font-weight: 600;
}

.filter-section__sliders {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.age-slider,
.distance-slider {
  width: 100%;
  margin: 0;
}

/* ========== Chip 组 ========== */
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--r-full);
  background: var(--c-bg-surface);
  border: 1rpx solid var(--c-border-default);
  transition: all var(--d-normal, 200ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-chip--active {
  background: var(--c-gradient-brand);
  border-color: transparent;
  box-shadow: var(--s-brand-sm);
}

.filter-chip__text {
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--c-text-secondary);
}

.filter-chip--active .filter-chip__text {
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== 在线状态 toggle ========== */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-2) 0;
}

.toggle-row__label {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
}

.toggle-switch {
  width: 88rpx;
  height: 48rpx;
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-surface);
  position: relative;
  transition: background var(--d-normal, 200ms) ease;
  border: 1rpx solid var(--c-border-default);
}

.toggle-switch--on {
  background: var(--c-brand);
  border-color: var(--c-brand);
}

.toggle-knob {
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-container);
  position: absolute;
  top: 3rpx;
  left: 3rpx;
  transition: left var(--d-normal, 200ms) ease;
  box-shadow: 0 2rpx 8rpx var(--c-black-shadow-lg, rgba(0, 0, 0, 0.12));
}

.toggle-switch--on .toggle-knob {
  left: 44rpx;
}
</style>
