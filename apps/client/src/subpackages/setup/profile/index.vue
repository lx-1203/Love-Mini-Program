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
import { onMounted, reactive, ref } from "vue";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import { useProfileStore } from "../../../stores/profile";
import { useSessionStore } from "../../../stores/session";
import { clientApi } from "../../../services/api";
import { lightHaptic, successHaptic } from "../../../utils/haptic";
import type { UpdateBasicProfileRequest } from "../../../services/generated/api-types-supplement";

const profileStore = useProfileStore();
const sessionStore = useSessionStore();

/** 表单数据（含 Phase A 扩展字段） */
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
  futurePlanTags: [],
});

/** 学历选项 */
const educationLevelOptions = [
  { label: "高中", value: "high_school" },
  { label: "本科", value: "bachelor" },
  { label: "硕士", value: "master" },
  { label: "博士", value: "phd" },
];

/** 感情状态选项 */
const relationshipStatusOptions = [
  { label: "未婚", value: "never" },
  { label: "曾离异", value: "married_before" },
  { label: "离异", value: "divorced" },
  { label: "丧偶", value: "widowed" },
];

/** 未来规划标签可选项 */
const futurePlanTagOptions = [
  "事业",
  "旅行",
  "学习",
  "家庭",
  "健康",
  "理财",
  "兴趣",
  "社交",
];

/** 当前选中的学历（用于 picker 回显） */
const educationLevelLabel = ref<string>("");
/** 当前选中的感情状态（用于 picker 回显） */
const relationshipStatusLabel = ref<string>("");
/** 身高输入字符串（与 form.height 解耦，提交时校验并转换） */
const heightInput = ref<string>("");

/** 学历 picker change 事件 */
function onEducationLevelChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  const opt = educationLevelOptions[idx];
  if (opt) {
    form.educationLevel = opt.value;
    educationLevelLabel.value = opt.label;
    lightHaptic();
  }
}

/** 感情状态 picker change 事件 */
function onRelationshipStatusChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  const opt = relationshipStatusOptions[idx];
  if (opt) {
    form.relationshipStatus = opt.value;
    relationshipStatusLabel.value = opt.label;
    lightHaptic();
  }
}

/** 切换未来规划标签选中态 */
function toggleFuturePlanTag(tag: string): void {
  lightHaptic();
  const list = form.futurePlanTags ?? [];
  const idx = list.indexOf(tag);
  if (idx >= 0) {
    form.futurePlanTags = [...list.slice(0, idx), ...list.slice(idx + 1)];
  } else {
    form.futurePlanTags = [...list, tag];
  }
}

/** 判断标签是否已选中 */
function isFuturePlanTagSelected(tag: string): boolean {
  return (form.futurePlanTags ?? []).includes(tag);
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
    const found = educationLevelOptions.find((o) => o.value === form.educationLevel);
    if (found) educationLevelLabel.value = found.label;
  }
  if (form.relationshipStatus) {
    const found = relationshipStatusOptions.find((o) => o.value === form.relationshipStatus);
    if (found) relationshipStatusLabel.value = found.label;
  }
  // 身高初始回显
  if (form.height !== undefined) {
    heightInput.value = String(form.height);
  }
});

async function save() {
  // 输入验证
  if (!form.nickname || !form.nickname.trim()) {
    uni.showToast({ title: "请输入昵称", icon: "none" });
    return;
  }
  if (form.nickname.length > 30) {
    uni.showToast({ title: "昵称不能超过 30 个字符", icon: "none" });
    return;
  }
  if (form.bio && form.bio.length > 160) {
    uni.showToast({ title: "简介不能超过 160 个字符", icon: "none" });
    return;
  }
  // 身高校验：非空时必须在 120-250 范围
  const trimmedHeight = heightInput.value.trim();
  if (trimmedHeight.length > 0) {
    const num = Number(trimmedHeight);
    if (Number.isNaN(num) || num < 120 || num > 250) {
      uni.showToast({ title: "身高范围 120-250cm", icon: "none" });
      return;
    }
    form.height = num;
  } else {
    form.height = undefined;
  }

  try {
    // 调用 updateBasicProfile（含 Phase A 扩展字段）
    await clientApi.updateBasicProfile(form);
    // 同步刷新 session，更新 profileCompleted 状态
    await sessionStore.refreshSession();
    successHaptic();
    uni.showToast({ title: "保存成功", icon: "success" });
    setTimeout(() => {
      uni.redirectTo({ url: "/subpackages/setup/campus/index" });
    }, 600);
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试";
    uni.showToast({ title: message, icon: "none" });
  }
}

/**
 * 更换个人主页背景（Phase D4 · 占位入口）
 * 前序 Phase E1 已在 profile 页实现上传，此处保留入口跳转回 profile 页操作
 */
function handleChangeBg() {
  lightHaptic();
  uni.showToast({ title: "请前往「我的」页点击背景图编辑", icon: "none" });
}
</script>

<template>
  <AppShell title="基础资料" subtitle="完善你的资料，让更多人了解你" :show-tab-bar="false">
    <SectionCard title="资料草稿" compact>
      <input v-model="form.nickname" class="field" placeholder="昵称" />
      <textarea v-model="form.bio" class="field field--textarea" maxlength="160" />
      <input v-model="form.grade" class="field" placeholder="年级" />
      <input v-model="form.pronouns" class="field" placeholder="称呼偏好" />
    </SectionCard>

    <!-- Phase E4 / M-07：扩展资料字段 -->
    <SectionCard title="基本资料" compact>
      <!-- 身高 -->
      <view class="form-row">
        <text class="form-row__label">身高（cm）</text>
        <input
          v-model="heightInput"
          class="field field--inline"
          type="number"
          placeholder="120-250"
        />
      </view>

      <!-- 学历 -->
      <view class="form-row">
        <text class="form-row__label">学历</text>
        <picker
          mode="selector"
          :range="educationLevelOptions"
          range-key="label"
          @change="onEducationLevelChange"
        >
          <view class="field field--inline field--picker">
            <text :class="['field__text', !educationLevelLabel && 'field__text--placeholder']">
              {{ educationLevelLabel || '请选择' }}
            </text>
            <text class="field__arrow">›</text>
          </view>
        </picker>
      </view>

      <!-- 感情状态 -->
      <view class="form-row">
        <text class="form-row__label">感情状态</text>
        <picker
          mode="selector"
          :range="relationshipStatusOptions"
          range-key="label"
          @change="onRelationshipStatusChange"
        >
          <view class="field field--inline field--picker">
            <text :class="['field__text', !relationshipStatusLabel && 'field__text--placeholder']">
              {{ relationshipStatusLabel || '请选择' }}
            </text>
            <text class="field__arrow">›</text>
          </view>
        </picker>
      </view>

      <!-- 籍贯省 -->
      <view class="form-row">
        <text class="form-row__label">籍贯省份</text>
        <input v-model="form.hometownProvince" class="field field--inline" placeholder="如：广东" />
      </view>

      <!-- 籍贯市 -->
      <view class="form-row">
        <text class="form-row__label">籍贯城市</text>
        <input v-model="form.hometownCity" class="field field--inline" placeholder="如：广州" />
      </view>

      <!-- 未来城市 -->
      <view class="form-row">
        <text class="form-row__label">未来城市</text>
        <input v-model="form.futureCity" class="field field--inline" placeholder="如：广州" />
      </view>

      <!-- 未来规划标签 -->
      <view class="form-row form-row--block">
        <text class="form-row__label">未来规划</text>
        <view class="tag-group">
          <view
            v-for="tag in futurePlanTagOptions"
            :key="tag"
            :class="['tag-chip', isFuturePlanTagSelected(tag) && 'tag-chip--selected']"
            hover-class="tag-chip--hover"
            hover-stay-time="100"
            @tap="toggleFuturePlanTag(tag)"
          >
            <text class="tag-chip__text">{{ tag }}</text>
          </view>
        </view>
      </view>
    </SectionCard>

    <!-- Phase D4 · 更换背景入口（占位） -->
    <SectionCard title="个人主页背景" compact>
      <view
        class="bg-entry press-feedback"
        hover-class="bg-entry--hover"
        hover-stay-time="120"
        @tap="handleChangeBg"
      >
        <text class="bg-entry__text">更换背景</text>
        <text class="bg-entry__arrow">›</text>
      </view>
    </SectionCard>

    <BottomActionBar primary-label="保存并继续" @primary="save" />
  </AppShell>
</template>

<style scoped lang="scss">
.field {
  width: 100%;
  min-height: 88rpx;
  padding: 18rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
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
  transition: transform 120ms ease;

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
