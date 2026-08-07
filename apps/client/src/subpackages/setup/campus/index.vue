<script setup lang="ts">
/**
 * 校园认证页（学生注册流程第 2 步 / 4 步）。
 *
 * 跳转链路（2026-08-07 流程重构）：
 *   学生：profile(1) → campus(2) → recommend-pref(3) → 完成(4)
 *   非学生：profile(1) → recommend-pref(2) → 完成(3)（本页不出现）
 *
 * 2026-08-07 审查重构：
 * - 表单升级：城市/学校/专业由自由输入框改为三级联动选择器
 *   （城市 → 该城市高校 → 该校专业目录，全部点选、禁止手动输入，保证数据规范统一）
 * - 命名统一：页面标题与步骤名统一为「校园认证」，移除被状态栏截断的副标题
 * - 跳过入口强化：非学生/暂不认证 → 醒目文字按钮，点击进入下一步（推荐偏好）
 * - 空白填补：表单下方增加价值提示，降低填写顾虑
 * - 隐私说明：标题旁「?」图标，弹窗说明认证信息仅用于匹配、不会公开
 * - 按钮状态：三项未选完时主按钮置灰不可点击，完成后高亮
 */
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
// 功能5：引导流程进度条（学生分支当前步骤 = 2：校园认证）
import SetupProgress from "../../../components/setup/SetupProgress.vue";
import { useProfileStore } from "../../../stores/profile";
import { SUBPACKAGE_ROUTES } from "../../../constants/routes";
import { replaceAppPath } from "../../../utils/navigation";
import { lightHaptic, successHaptic } from "../../../utils/haptic";
import {
  loadSchools,
  getCities,
  getSchoolsByCity,
  getMajorsForSchool,
  type School,
} from "../../../config/schools";

const { t } = useI18n();
const profileStore = useProfileStore();
/** 跳过入口文案（非学生/暂不认证） */
const skipLabel = t("setup.campus.skipLabel");

/**
 * 表单数据：城市 / 学校名 / 专业。
 * 仅通过三级联动选择器赋值，禁止手动输入，保证地名与校名数据规范统一。
 */
const form = reactive({
  city: "",
  campusName: "",
  department: "",
});

/** 学校列表（后端 /config/campuses 优先，失败回退本地静态列表） */
const schools = ref<School[]>([]);

/** 城市选项：仅展示存在高校的城市，保证下一级必有结果 */
const cityOptions = computed(() => getCities(schools.value));

/** 学校选项：按已选城市筛选 */
const schoolOptions = computed(() => getSchoolsByCity(schools.value, form.city));

/** 专业选项：已选学校专属目录（缺省时回退通用目录） */
const majorOptions = computed(() =>
  getMajorsForSchool(schoolOptions.value.find((s) => s.name === form.campusName)),
);

/** 主按钮可用性：三项信息全部完成才可继续 */
const isComplete = computed(() =>
  Boolean(form.city && form.campusName && form.department),
);

/** 保存中（防重复提交） */
const saving = ref(false);

/* ==================== 三级联动选择 ==================== */

/** 城市 picker change：更新城市并清空学校/专业（联动重置） */
function onCityChange(e: { detail: { value: number } }): void {
  const opt = cityOptions.value[e.detail.value];
  if (!opt || opt === form.city) return;
  form.city = opt;
  form.campusName = "";
  form.department = "";
  lightHaptic();
}

/** 学校 picker change：更新学校并清空专业（联动重置） */
function onSchoolChange(e: { detail: { value: number } }): void {
  const opt = schoolOptions.value[e.detail.value];
  if (!opt || opt.name === form.campusName) return;
  form.campusName = opt.name;
  form.department = "";
  lightHaptic();
}

/** 专业 picker change */
function onMajorChange(e: { detail: { value: number } }): void {
  const opt = majorOptions.value[e.detail.value];
  if (!opt || opt === form.department) return;
  form.department = opt;
  lightHaptic();
}

/* ==================== 隐私说明 ==================== */

/** 隐私说明弹窗（标题旁「?」图标触发） */
function showPrivacyInfo(): void {
  uni.showModal({
    title: t("setup.campus.privacyTitle"),
    content: t("setup.campus.privacyContent"),
    showCancel: false,
    confirmText: t("setup.campus.privacyConfirm"),
  });
}

/* ==================== 生命周期 ==================== */

onMounted(async () => {
  // 学校数据优先走后端，失败回退本地静态列表（见 loadSchools 内部兜底）
  schools.value = await loadSchools();
  await profileStore.load();
  // 回显已有校园资料（「我的 → 校园认证」补认证场景）；
  // 若历史值不在选项内（数据变更），保持空白等待用户重新选择。
  const campus = profileStore.campusProfile;
  if (campus?.city && cityOptions.value.includes(campus.city)) {
    form.city = campus.city;
  }
  if (campus?.campusName) {
    const matched = schoolOptions.value.find((s) => s.name === campus.campusName);
    if (matched) form.campusName = campus.campusName;
  }
  if (campus?.department && majorOptions.value.includes(campus.department)) {
    form.department = campus.department;
  }
});

/* ==================== 保存 / 跳过 ==================== */

/**
 * 保存校园资料并进入下一步（推荐偏好，学生分支步骤 3/4）。
 * 2026-08-07 链路调整：课表导入已移出主流程，保存后不再进入课表步骤。
 */
async function save() {
  if (saving.value) return;
  if (!isComplete.value) {
    uni.showToast({ title: t("setup.campus.errIncomplete"), icon: "none" });
    return;
  }
  saving.value = true;
  try {
    await profileStore.saveCampusProfile({ ...form });
    successHaptic();
    uni.showToast({ title: t("setup.campus.saveSuccess"), icon: "success" });
    replaceAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.RECOMMEND_PREF);
  } catch (error) {
    const message = error instanceof Error ? error.message : t("setup.campus.saveFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    saving.value = false;
  }
}

/**
 * 跳过入口（非学生/暂不认证）。
 * 校园认证为可选项——不填写学校资料直接进入下一步（推荐偏好），
 * 后续可在「我的 → 校园认证」中补认证（同校匹配能力随之解锁）。
 */
function skip() {
  replaceAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.RECOMMEND_PREF);
}
</script>

<template>
  <AppShell :title="t('setup.campus.pageTitle')" :subtitle="t('setup.campus.pageSubtitle')" :show-tab-bar="false">
    <!-- 功能5：引导流程进度条（学生分支当前步骤 = 2：校园认证） -->
    <SetupProgress :current-step="2" variant="student" />

    <!-- 学校资料表单：三级联动选择器（城市 → 学校 → 专业） -->
    <SectionCard compact>
      <!-- 标题行：学校资料 + 隐私说明「?」图标 -->
      <view class="card-header">
        <text class="card-header__title">{{ t('setup.campus.sectionSchool') }}</text>
        <view
          class="card-header__help"
          role="button"
          :aria-label="t('setup.campus.privacyAria')"
          @tap="showPrivacyInfo"
        >
          <text class="card-header__help-icon">?</text>
        </view>
      </view>

      <!-- 城市 -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.campus.labelCity') }}</text>
        <picker
          mode="selector"
          :range="cityOptions"
          :value="cityOptions.indexOf(form.city)"
          @change="onCityChange"
        >
          <view class="field field--picker">
            <text :class="['field__text', !form.city && 'field__text--placeholder']">
              {{ form.city || t('setup.campus.placeholderCity') }}
            </text>
            <text class="field__arrow">›</text>
          </view>
        </picker>
      </view>

      <!-- 学校（随城市联动） -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.campus.labelSchool') }}</text>
        <picker
          mode="selector"
          :range="schoolOptions"
          range-key="name"
          :value="schoolOptions.findIndex((s) => s.name === form.campusName)"
          @change="onSchoolChange"
        >
          <view class="field field--picker">
            <text :class="['field__text', !form.campusName && 'field__text--placeholder']">
              {{ form.campusName || t('setup.campus.placeholderSchool') }}
            </text>
            <text class="field__arrow">›</text>
          </view>
        </picker>
      </view>

      <!-- 专业（随学校联动） -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.campus.labelMajor') }}</text>
        <picker
          mode="selector"
          :range="majorOptions"
          :value="majorOptions.indexOf(form.department)"
          @change="onMajorChange"
        >
          <view class="field field--picker">
            <text :class="['field__text', !form.department && 'field__text--placeholder']">
              {{ form.department || t('setup.campus.placeholderMajor') }}
            </text>
            <text class="field__arrow">›</text>
          </view>
        </picker>
      </view>
    </SectionCard>

    <!-- 2026-08-07 审查重构：价值提示（填补下半屏空白，提升填写意愿） -->
    <SectionCard compact class="value-card">
      <text class="value-card__text">{{ t('setup.campus.valueText') }}</text>
    </SectionCard>

    <!-- 2026-08-07 审查重构：跳过入口强化（醒目文字按钮，置于主按钮上方） -->
    <view class="skip-bar" role="button" :aria-label="skipLabel" @tap="skip">
      <text class="skip-bar__text">{{ skipLabel }}</text>
      <text class="skip-bar__arrow">›</text>
    </view>

    <BottomActionBar
      :primary-label="saving ? t('setup.campus.saveSaving') : t('setup.campus.saveLabel')"
      :disabled="!isComplete || saving"
      @primary="save"
    />
  </AppShell>
</template>

<style scoped lang="scss">
/* ========== 卡片标题行（学校资料 + 隐私说明） ========== */
.card-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.card-header__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

/* 隐私说明「?」图标：小号圆形按钮，点击弹窗说明 */
.card-header__help {
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-circle, 50%);
  border: 2rpx solid var(--c-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-page);
}

.card-header__help-icon {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text-tertiary);
  line-height: 1;
}

/* ========== 表单行（标签 + 点选字段） ========== */
.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.form-row__label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.field {
  width: 100%;
  min-height: 88rpx;
  padding: 0 var(--sp-4);
  box-sizing: border-box;
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
  border: var(--c-border-card);
}

/* 选择器字段：文字 + 右侧箭头，明确「点选而非输入」 */
.field--picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field__text {
  font-size: var(--fs-lg);
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

/* ========== 价值提示（填补下半屏空白） ========== */
.value-card {
  background: var(--c-bg-brand);
  border-color: var(--c-brand-200);
}

.value-card__text {
  font-size: var(--fs-base);
  line-height: 1.7;
  color: var(--c-brand-700);
}

/* ========== 跳过入口（强化：醒目文字按钮 + 箭头，置于主按钮上方） ========== */
.skip-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  padding: var(--sp-4) 0 var(--sp-2);
}

.skip-bar__text {
  font-size: var(--fs-md);
  color: var(--c-brand-700);
  font-weight: 600;
  text-decoration: underline;
}

.skip-bar__arrow {
  font-size: var(--fs-lg);
  color: var(--c-brand-700);
  line-height: 1;
}
</style>
