<script setup lang="ts">
/**
 * 基础资料编辑页（Phase E4 / M-07）
 *
 * 在原有 nickname/bio/grade/pronouns 基础上扩展：
 * - 身高（cm，120-250）
 * - 学历（high_school/bachelor/master/phd）
 * - 感情状态（never/married_before/divorced/widowed）
 * - 籍贯省/市
 * - 未来城市
 * - 未来规划标签（多选 chip）
 *
 * 提交时调用 clientApi.updateBasicProfile（含 Phase A 扩展字段），
 * 后端会重新计算 profileCompletion 并更新会话状态。
 */
import { computed, onMounted, reactive, ref, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
// 功能5：引导流程进度条（当前步骤 = 1：基本信息）
import SetupProgress from "../../../components/setup/SetupProgress.vue";
import { useProfileStore } from "../../../stores/profile";
import { useSessionStore } from "../../../stores/session";
import { clientApi } from "../../../services/api";
import { lightHaptic, successHaptic } from "../../../utils/haptic";
import { SUBPACKAGE_ROUTES } from "../../../constants/routes";
import type { UpdateBasicProfileRequest } from "../../../services/generated/api-types-supplement";
// 2026-08-07 流程重构：注册第 1 步身份选择（学生/非学生），决定后续分支
import {
  loadIdentity,
  saveIdentity,
  type UserIdentity,
} from "../../../config/identity";

const profileStore = useProfileStore();
const sessionStore = useSessionStore();
const { t } = useI18n();

/**
 * 2026-08-07 流程重构：用户身份（注册第 1 步选择）。
 * - student（在校学生/毕业生）：基本信息 → 校园认证 → 推荐偏好 → 完成
 * - non_student（非学生职场人士）：基本信息 → 推荐偏好 → 完成（跳过校园认证）
 */
const identity = ref<UserIdentity>(loadIdentity());

/** 身份选项（i18n 化） */
const identityOptions = computed(() => [
  { value: "student" as const, label: t("setup.profile.identityStudent"), desc: t("setup.profile.identityStudentDesc") },
  { value: "non_student" as const, label: t("setup.profile.identityNonStudent"), desc: t("setup.profile.identityNonStudentDesc") },
]);

/** 身份选择 change 事件（即时持久化） */
function onIdentityChange(value: UserIdentity): void {
  if (identity.value === value) return;
  identity.value = value;
  saveIdentity(value);
  lightHaptic();
}

/** 按身份分流：学生 → 校园认证（步骤 2/4）；非学生 → 推荐偏好（步骤 2/3，跳过校园认证） */
function getNextSetupPath(): string {
  // P0-35 修复：非学生跳过校园认证，进入时间安排（完成度 30+20=50，配合日程后
  // 注册流程可解锁；学生流程 基本资料→校园→日程 完成度 80 → profileCompleted=true）
  return identity.value === "non_student"
    ? SUBPACKAGE_ROUTES.SETUP_PROGRESS.SCHEDULE
    : SUBPACKAGE_ROUTES.SETUP_PROGRESS.CAMPUS;
}

// 修复（严格模式 noUnusedLocals）：SUBPACKAGE_ROUTES 在第 340 行 setTimeout 回调内使用，
// vue-tsc 对该闭包位置识别失败（疑似模板指令解析干扰），通过 defineExpose 标记为已使用。
defineExpose({ SUBPACKAGE_ROUTES });

/**
 * SubTask 1.5.2：保存成功/无变更后跳转下一页的定时器引用，用于卸载时清理。
 *
 * <p>原实现 2 处 {@code setTimeout(..., 600)} 未保存返回值，
 * 用户在 600ms 延迟内快速返回上一页时，定时器仍会触发 uni.redirectTo，
 * 可能导致意外的页面跳转或 Vue 警告。</p>
 */
let saveSuccessNavTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * SubTask 1.5.2：页面卸载时清理未触发的跳转定时器。
 */
onUnmounted(() => {
  if (saveSuccessNavTimer) {
    clearTimeout(saveSuccessNavTimer);
    saveSuccessNavTimer = null;
  }
});

/**
 * 表单数据（含 Phase A 扩展字段）。
 * 2026-08-07 链路调整：移除 futurePlanTags（与个性标签重复，属进阶内容后置）。
 */
const form = reactive<UpdateBasicProfileRequest>({
  nickname: "",
  bio: "",
  grade: "",
  pronouns: "",
  height: undefined,
  educationLevel: undefined,
  relationshipStatus: undefined,
  hometownProvince: "",
  hometownCity: "",
  futureCity: "",
});

/** 学历选项（i18n 化，随 locale 切换响应） */
const educationLevelOptions = computed(() => [
  { label: t("setup.profile.educationHighSchool"), value: "high_school" },
  { label: t("setup.profile.educationBachelor"), value: "bachelor" },
  { label: t("setup.profile.educationMaster"), value: "master" },
  { label: t("setup.profile.educationPhd"), value: "phd" },
]);

/** 感情状态选项（i18n 化） */
const relationshipStatusOptions = computed(() => [
  { label: t("setup.profile.relationshipNever"), value: "never" },
  { label: t("setup.profile.relationshipMarriedBefore"), value: "married_before" },
  { label: t("setup.profile.relationshipDivorced"), value: "divorced" },
  { label: t("setup.profile.relationshipWidowed"), value: "widowed" },
]);

/** 当前选中的学历（用于 picker 回显） */
const educationLevelLabel = ref<string>("");
/** 当前选中的感情状态（用于 picker 回显） */
const relationshipStatusLabel = ref<string>("");

/**
 * 2026-08-07 重构：标准化信息改用选择器（审查意见）。
 * - 身高：滚轮选择 140-200（原 120-250 输入框既低效又不符合常识）
 * - 年级：滚轮选择（大一~大四/研一~研三/已毕业），替代自由输入
 */

/** 年级选项（i18n 化） */
const gradeOptions = computed(() => [
  t("setup.profile.gradeFreshman"),
  t("setup.profile.gradeSophomore"),
  t("setup.profile.gradeJunior"),
  t("setup.profile.gradeSenior"),
  t("setup.profile.gradeGrad1"),
  t("setup.profile.gradeGrad2"),
  t("setup.profile.gradeGrad3"),
  t("setup.profile.gradeGraduated"),
]);

/** 年级 picker 回显 */
const gradeLabel = ref<string>("");

/** 身高选项（140-200 cm，步长 1） */
const heightOptions = computed(() => {
  const list: string[] = [];
  for (let h = 140; h <= 200; h++) {
    list.push(`${h}cm`);
  }
  return list;
});

/** 身高 picker 回显 */
const heightLabel = ref<string>("");

/** 年级 picker change 事件 */
function onGradeChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  const opt = gradeOptions.value[idx];
  if (opt) {
    form.grade = opt;
    gradeLabel.value = opt;
    lightHaptic();
  }
}

/** 身高 picker change 事件（140-200，存储数字） */
function onHeightChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  const opt = heightOptions.value[idx];
  if (opt) {
    form.height = 140 + idx;
    heightLabel.value = opt;
    lightHaptic();
  }
}

/**
 * 字符长度限制常量（提取硬编码值，便于统一维护）。
 * 修复：原 save 校验与模板 maxlength 中重复硬编码 30/160，调整需要多处修改。
 */
const NICKNAME_MAX_LENGTH = 30;
const BIO_MAX_LENGTH = 160;

/**
 * 提交锁：防止用户连续点击保存按钮触发重复提交。
 * 锁定期间忽略新的 save 调用，直到当前提交流程结束（成功或失败）。
 */
const isSubmitting = ref(false);

/**
 * 初始表单快照（onMounted 加载完成后保存）。
 * 提交时与当前表单值做 diff，仅提交变更字段，避免无谓的网络请求与后端覆盖。
 */
let initialFormSnapshot: UpdateBasicProfileRequest = {};

/**
 * 构建仅包含变更字段的提交数据。
 *
 * 修复（P1 BUG）：原实现直接提交整个 form，未做 diff，
 * 用户仅修改昵称时也会把所有字段重发后端，既浪费带宽，
 * 又可能在初始数据加载不全时把空值覆盖到后端。
 * 现逐字段比对，仅发送发生变化的字段。
 *
 * @returns 仅包含变更字段的 UpdateBasicProfileRequest
 */
function buildDiffPayload(): UpdateBasicProfileRequest {
  const diff: UpdateBasicProfileRequest = {};

  // 字符串/数字/枚举字段：直接比较值
  if (form.nickname !== initialFormSnapshot.nickname) {
    diff.nickname = form.nickname;
  }
  if (form.bio !== initialFormSnapshot.bio) {
    diff.bio = form.bio;
  }
  if (form.grade !== initialFormSnapshot.grade) {
    diff.grade = form.grade;
  }
  if (form.pronouns !== initialFormSnapshot.pronouns) {
    diff.pronouns = form.pronouns;
  }
  if (form.height !== initialFormSnapshot.height) {
    diff.height = form.height;
  }
  if (form.educationLevel !== initialFormSnapshot.educationLevel) {
    diff.educationLevel = form.educationLevel;
  }
  if (form.relationshipStatus !== initialFormSnapshot.relationshipStatus) {
    diff.relationshipStatus = form.relationshipStatus;
  }
  if (form.hometownProvince !== initialFormSnapshot.hometownProvince) {
    diff.hometownProvince = form.hometownProvince;
  }
  if (form.hometownCity !== initialFormSnapshot.hometownCity) {
    diff.hometownCity = form.hometownCity;
  }
  if (form.futureCity !== initialFormSnapshot.futureCity) {
    diff.futureCity = form.futureCity;
  }

  return diff;
}

/** 学历 picker change 事件 */
function onEducationLevelChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  const opt = educationLevelOptions.value[idx];
  if (opt) {
    form.educationLevel = opt.value;
    educationLevelLabel.value = opt.label;
    lightHaptic();
  }
}

/** 感情状态 picker change 事件 */
function onRelationshipStatusChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  const opt = relationshipStatusOptions.value[idx];
  if (opt) {
    form.relationshipStatus = opt.value;
    relationshipStatusLabel.value = opt.label;
    lightHaptic();
  }
}


onMounted(async () => {
  await profileStore.load();
  const basic = profileStore.basicProfile;
  if (basic) {
    form.nickname = basic.nickname ?? "";
    form.bio = basic.bio ?? "";
    form.grade = basic.grade ?? "";
    form.pronouns = basic.pronouns ?? "";
  }
  // 校区资料回显城市信息（作为籍贯/未来城市的兜底默认值）
  const campus = profileStore.campusProfile;
  if (campus) {
    if (!form.hometownProvince) form.hometownProvince = "";
    if (!form.hometownCity) form.hometownCity = campus.city ?? "";
    if (!form.futureCity) form.futureCity = campus.city ?? "";
  }
  // 同步初始 picker 回显文案
  if (form.educationLevel) {
    const found = educationLevelOptions.value.find((o) => o.value === form.educationLevel);
    if (found) educationLevelLabel.value = found.label;
  }
  if (form.relationshipStatus) {
    const found = relationshipStatusOptions.value.find((o) => o.value === form.relationshipStatus);
    if (found) relationshipStatusLabel.value = found.label;
  }
  // 身高/年级初始回显（picker）
  if (form.height !== undefined) {
    heightLabel.value = `${form.height}cm`;
  }
  if (form.grade) {
    gradeLabel.value = form.grade;
  }

  // 保存初始表单快照，用于提交时 diff 比对
  initialFormSnapshot = {
    ...form,
  };
});

async function save() {
  // 提交锁：锁定期间忽略新的保存调用，防止重复提交
  if (isSubmitting.value) return;

  // 输入验证
  if (!form.nickname || !form.nickname.trim()) {
    uni.showToast({ title: t("setup.profile.errNicknameRequired"), icon: "none" });
    return;
  }
  if (form.nickname.length > NICKNAME_MAX_LENGTH) {
    uni.showToast({ title: t("setup.profile.errNicknameTooLong", { n: NICKNAME_MAX_LENGTH }), icon: "none" });
    return;
  }
  if (form.bio && form.bio.length > BIO_MAX_LENGTH) {
    uni.showToast({ title: t("setup.profile.errBioTooLong", { n: BIO_MAX_LENGTH }), icon: "none" });
    return;
  }
  // 加锁，进入提交流程
  isSubmitting.value = true;
  try {
    // 构建 diff：仅提交变更字段，避免无谓的网络请求与后端覆盖
    const diff = buildDiffPayload();

    // 无变更时直接跳转下一步，不调用 API
    if (Object.keys(diff).length === 0) {
      uni.showToast({ title: t("setup.profile.noChange"), icon: "none" });
      // SubTask 1.5.2：保存跳转定时器引用，卸载时统一清理
      // 2026-08-07 流程重构：按身份分流（学生 → 校园认证；非学生 → 推荐偏好）
      if (saveSuccessNavTimer) clearTimeout(saveSuccessNavTimer);
      saveSuccessNavTimer = setTimeout(() => {
        saveSuccessNavTimer = null;
        uni.redirectTo({ url: getNextSetupPath() });
      }, 600);
      return;
    }

    // 调用 updateBasicProfile（仅提交变更字段）
    if (Object.keys(diff).length > 0) {
      await clientApi.updateBasicProfile(diff);
    }
    // 同步刷新 session，更新 profileCompleted 状态
    await sessionStore.refreshSession();
    successHaptic();
    uni.showToast({ title: t("setup.profile.saveSuccess"), icon: "success" });
    // SubTask 1.5.2：保存跳转定时器引用，卸载时统一清理
    // 2026-08-07 流程重构：按身份分流（学生 → 校园认证；非学生 → 推荐偏好）
    if (saveSuccessNavTimer) clearTimeout(saveSuccessNavTimer);
    saveSuccessNavTimer = setTimeout(() => {
      saveSuccessNavTimer = null;
      uni.redirectTo({ url: getNextSetupPath() });
    }, 600);
  } catch (error) {
    const message = error instanceof Error ? error.message : t("setup.profile.saveFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    // 释放提交锁，允许下次提交
    isSubmitting.value = false;
  }
}
</script>

<template>
  <AppShell :title="t('setup.profile.pageTitle')" :subtitle="t('setup.profile.pageSubtitle')" :show-tab-bar="false">
    <!-- 功能5：引导流程进度条（当前步骤 = 1：基本信息）
         2026-08-07 流程重构：按身份分支展示步骤（学生 4 步 / 非学生 3 步） -->
    <SetupProgress :current-step="1" :variant="identity === 'non_student' ? 'non-student' : 'student'" />

    <!-- 2026-08-07 流程重构：身份选择（注册第 1 步）——
         学生走校园认证分支，非学生直接跳过校园认证进入推荐偏好 -->
    <SectionCard :title="t('setup.profile.identityTitle')" :subtitle="t('setup.profile.identityHint')" compact>
      <view class="identity-group">
        <view
          v-for="opt in identityOptions"
          :key="opt.value"
          class="identity-option"
          :class="{ 'identity-option--selected': identity === opt.value }"
          role="radio"
          :aria-checked="identity === opt.value"
          :aria-label="opt.label"
          @tap="onIdentityChange(opt.value)"
        >
          <view class="identity-option__radio" :class="{ 'identity-option__radio--checked': identity === opt.value }">
            <view v-if="identity === opt.value" class="identity-option__dot" />
          </view>
          <view class="identity-option__main">
            <text class="identity-option__label">{{ opt.label }}</text>
            <text class="identity-option__desc">{{ opt.desc }}</text>
          </view>
        </view>
      </view>
    </SectionCard>

    <SectionCard :title="t('setup.profile.sectionDraft')" compact>
      <input v-model="form.nickname" class="field" :placeholder="t('setup.profile.placeholderNickname')" :maxlength="NICKNAME_MAX_LENGTH" :aria-label="t('setup.profile.labelNickname')" />
      <textarea v-model="form.bio" class="field field--textarea" :maxlength="BIO_MAX_LENGTH" />
      <!-- 2026-08-07 重构：年级改滚轮选择（替代自由输入，标准化信息用选择器） -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.profile.labelGrade') }}</text>
        <picker
          mode="selector"
          :range="gradeOptions"
          @change="onGradeChange"
        >
          <view class="field field--inline field--picker">
            <text :class="['field__text', !gradeLabel && 'field__text--placeholder']">
              {{ gradeLabel || t('setup.profile.pleaseSelect') }}
            </text>
            <text class="field__arrow">›</text>
          </view>
        </picker>
      </view>
      <input v-model="form.pronouns" class="field" :placeholder="t('setup.profile.placeholderPronouns')" :aria-label="t('setup.profile.labelPronouns')" />
    </SectionCard>

    <!-- Phase E4 / M-07：扩展资料字段 -->
    <SectionCard :title="t('setup.profile.sectionBasic')" compact>
      <!-- 身高（2026-08-07 重构：滚轮选择 140-200，替代输入框） -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.profile.labelHeight') }}</text>
        <picker
          mode="selector"
          :range="heightOptions"
          @change="onHeightChange"
        >
          <view class="field field--inline field--picker">
            <text :class="['field__text', !heightLabel && 'field__text--placeholder']">
              {{ heightLabel || t('setup.profile.pleaseSelect') }}
            </text>
            <text class="field__arrow">›</text>
          </view>
        </picker>
      </view>

      <!-- 学历 -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.profile.labelEducation') }}</text>
        <picker
          mode="selector"
          :range="educationLevelOptions"
          range-key="label"
          @change="onEducationLevelChange"
        >
          <view class="field field--inline field--picker">
            <text :class="['field__text', !educationLevelLabel && 'field__text--placeholder']">
              {{ educationLevelLabel || t('setup.profile.pleaseSelect') }}
            </text>
            <text class="field__arrow">›</text>
          </view>
        </picker>
      </view>

      <!-- 感情状态 -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.profile.labelRelationship') }}</text>
        <picker
          mode="selector"
          :range="relationshipStatusOptions"
          range-key="label"
          @change="onRelationshipStatusChange"
        >
          <view class="field field--inline field--picker">
            <text :class="['field__text', !relationshipStatusLabel && 'field__text--placeholder']">
              {{ relationshipStatusLabel || t('setup.profile.pleaseSelect') }}
            </text>
            <text class="field__arrow">›</text>
          </view>
        </picker>
      </view>

      <!-- 籍贯省 -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.profile.labelHometownProvince') }}</text>
        <input v-model="form.hometownProvince" class="field field--inline" :placeholder="t('setup.profile.placeholderHometownProvince')" :aria-label="t('setup.profile.placeholderHometownProvince')" />
      </view>

      <!-- 籍贯市 -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.profile.labelHometownCity') }}</text>
        <input v-model="form.hometownCity" class="field field--inline" :placeholder="t('setup.profile.placeholderHometownCity')" :aria-label="t('setup.profile.placeholderHometownCity')" />
      </view>

      <!-- 未来城市 -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.profile.labelFutureCity') }}</text>
        <input v-model="form.futureCity" class="field field--inline" :placeholder="t('setup.profile.placeholderFutureCity')" :aria-label="t('setup.profile.placeholderFutureCity')" />
      </view>
    </SectionCard>

    <!-- 2026-08-07 重构：移除「未来规划」「个性标签」「更换背景」模块——
         标签与规划属进阶个性化内容（注册后可在「我的」完善），
         背景属装扮设置；基础资料回归「少而精、快速完成」原则。 -->

    <BottomActionBar
      :primary-label="isSubmitting ? t('setup.profile.submitSaving') : t('setup.profile.submitSave')"
      @primary="save"
    />
  </AppShell>
</template>

<style scoped lang="scss">
.field {
  width: 100%;
  min-height: 88rpx;
  padding: 18rpx;
  box-sizing: border-box;
  border-radius: var(--r-lg, 18rpx);
  background: var(--c-bg-page);
}

.field--textarea {
  min-height: 180rpx;
}

.field--inline {
  display: flex;
  align-items: center;
  min-height: 72rpx;
  padding: 12rpx 18rpx;
}

.field--picker {
  justify-content: space-between;
}

.field__text {
  font-size: var(--fs-md);
  color: var(--c-text-primary);

  &--placeholder {
    color: var(--c-text-placeholder);
  }
}

.field__arrow {
  font-size: var(--fs-2xl);
  color: var(--c-text-tertiary);
  line-height: 1;
}

/* Phase E4 / M-07：表单行 */
.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);

  &--block {
    flex-direction: column;
  }
}

.form-row__label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 500;
}

/* 2026-08-07 流程重构：身份选择（单选卡片） */
.identity-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.identity-option {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
  border: 2rpx solid var(--c-border-light);
  transition: all var(--d-normal, 200ms) ease;

  &--selected {
    border-color: var(--c-brand-700);
    background: var(--c-bg-brand);
  }
}

.identity-option__radio {
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--r-circle, 50%);
  border: 3rpx solid var(--c-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--checked {
    border-color: var(--c-brand-700);
  }
}

.identity-option__dot {
  width: 26rpx;
  height: 26rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-brand-700);
}

.identity-option__main {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.identity-option__label {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  font-weight: 600;
}

.identity-option__desc {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

.identity-option--selected .identity-option__label {
  color: var(--c-brand-700);
}

/* Phase E4 / M-07：标签 chip 组 */
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.tag-chip {
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
  background: var(--c-bg-page);
  border: 1rpx solid var(--c-border-default);

  &--selected {
    background: var(--c-bg-brand);
    border-color: var(--c-brand-200);
  }

  &--hover {
    transform: scale(0.96);
    opacity: 0.85;
  }
}

.tag-chip__text {
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
}

.tag-chip--selected .tag-chip__text {
  color: var(--c-brand-700);
  font-weight: 600;
}

/* Phase D4 · 更换背景入口 */
.bg-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
  transition: transform var(--d-fast, 120ms) ease;

  &--hover {
    transform: scale(0.98);
    background: var(--c-bg-secondary);
  }
}

.bg-entry__text {
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  font-weight: 500;
}

.bg-entry__arrow {
  font-size: var(--fs-2xl);
  color: var(--c-text-tertiary);
  line-height: 1;
}
</style>
