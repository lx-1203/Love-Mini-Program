<script setup lang="ts">
/**
 * 推荐偏好设置页（功能5：推荐偏好）。
 *
 * 跳转链路（2026-08-07 流程重构，按身份分支）：
 *   学生：profile(1) → campus(2) → recommend-pref(3) → 完成(4)
 *   非学生：profile(1) → recommend-pref(2) → 完成(3)
 * 保存成功后进入 /pages/discover/index（对应「完成」步骤）。
 */
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
// 功能5：引导流程进度条（推荐偏好，学生分支步骤 3、非学生分支步骤 2）
import SetupProgress from "../../../components/setup/SetupProgress.vue";
import { request } from "../../../services/http";
import { useSessionStore } from "../../../stores/session";
// 2026-08-07 流程重构：按身份分支展示步骤进度
import { loadIdentity } from "../../../config/identity";
import { replaceAppPath } from "../../../utils/navigation";

// P2-12：文案全部走 i18n（key 见 locales/zh-CN.ts / en-US.ts 的 recommendPref 命名空间）
const { t } = useI18n();

/** 当前身份（学生 4 步 / 非学生 3 步），驱动步骤进度条 */
const identity = loadIdentity();
/** 学生分支当前步骤 = 3（/4）；非学生分支当前步骤 = 2（/3） */
const setupCurrentStep = computed(() => (identity === "non_student" ? 2 : 3));
const setupVariant = computed(() => (identity === "non_student" ? "non-student" : "student"));

// ==================== 类型定义 ====================

/** 推荐偏好响应 */
interface RecommendationPreferences {
  dailyNotifyTime: string;
  scope: string;
  /** 校园优先：同校用户排序靠前 */
  campusPriority?: boolean;
}

// ==================== 状态定义 ====================

/** 加载状态 */
const loading = ref(true);
/** 错误状态 */
const error = ref(false);
/** 每日推荐时间 */
const dailyNotifyTime = ref("12:00");
/** 推荐范围 */
const scope = ref<"campus_first" | "city" | "unlimited">("campus_first");
/** 校园优先开关 */
const campusPriority = ref(true);
/** 保存中 */
const saving = ref(false);

// ==================== 选项列表 ====================

const timeOptions = [
  { label: "10:00", value: "10:00" },
  { label: "12:00", value: "12:00" },
  { label: "14:00", value: "14:00" },
  { label: "18:00", value: "18:00" },
];

const scopeOptions = [
  { label: t("recommendPref.scopeCampusFirst"), value: "campus_first" as const },
  { label: t("recommendPref.scopeCity"), value: "city" as const },
  { label: t("recommendPref.scopeUnlimited"), value: "unlimited" as const },
];

// ==================== 数据获取 ====================

/** 获取偏好设置 */
async function fetchPreferences() {
  loading.value = true;
  error.value = false;
  try {
    const sessionStore = useSessionStore();
    const userId = sessionStore.userSession?.userId;

    if (userId) {
      // P0-03 修复：后端按 JWT 取当前用户，路径不带 userId，
      // 统一走 GET /api/recommendations/preferences/me（原带数字路径段 404）
      const data = await request<RecommendationPreferences>({
        url: `/recommendations/preferences/me`,
      });
      dailyNotifyTime.value = data.dailyNotifyTime || "12:00";
      scope.value = (data.scope as "campus_first" | "city" | "unlimited") || "campus_first";
      campusPriority.value = data.campusPriority ?? true;
    } else {
      // 未登录时使用默认值
      dailyNotifyTime.value = "12:00";
      scope.value = "campus_first";
      campusPriority.value = true;
    }
  } catch (_e) {
    // 修复（review #28）：原 catch 只回退默认值且从不置 error=true，
    // 模板的错误态分支（SectionCard v-else-if="error" + 重试按钮）成死代码。
    // 现置 error=true 展示错误态与重试入口。
    error.value = true;
  } finally {
    loading.value = false;
  }
}

/** 重试获取 */
function retry() {
  fetchPreferences();
}

// ==================== 保存操作 ====================

/** 保存偏好设置（2026-08-07 流程重构：保存后进入应用，对应「完成」步骤） */
async function savePreferences() {
  if (saving.value) return;
  saving.value = true;
  try {
    const sessionStore = useSessionStore();
    const userId = sessionStore.userSession?.userId;

    if (userId) {
      // P0-03 修复：保存偏好走 PUT /api/recommendations/preferences/me（不带 userId 路径段），
      // 请求体字段对齐后端 SavePreferencesRequest（preferredTime/scope/campusPriority）；
      // 页面值已在 fetchPreferences 时由 GET 回填，此处全量提交已设置的字段。
      await request<RecommendationPreferences, { preferredTime: string; scope: string; campusPriority: boolean }>({
        url: `/recommendations/preferences/me`,
        method: "PUT",
        data: {
          // 后端 SavePreferencesRequest.preferredTime 对应前端 dailyNotifyTime（每日推荐时间）
          preferredTime: dailyNotifyTime.value,
          scope: scope.value,
          campusPriority: campusPriority.value,
        },
      });
    }

    uni.showToast({ title: t("recommendPref.saveSuccess"), icon: "success" });
    // 完成引导流程，进入寻觅
    replaceAppPath("/pages/discover/index");
  } catch (_e) {
    uni.showToast({ title: t("recommendPref.saveFailed"), icon: "none" });
  } finally {
    saving.value = false;
  }
}

/** 返回上一页 */
// 修复（严格模式 noUnusedLocals）：goBack 函数未被模板/脚本调用（页面使用 AppShell 的返回按钮），已移除。
// ==================== 生命周期 ====================

onMounted(() => {
  fetchPreferences();
});
</script>

<template>
  <AppShell :title="t('recommendPref.title')" :show-tab-bar="false" show-back>
    <!-- 功能5：引导流程进度条（推荐偏好；学生分支步骤 3/4，非学生分支步骤 2/3） -->
    <SetupProgress :current-step="setupCurrentStep" :variant="setupVariant" />

    <!-- 加载状态 -->
    <SectionCard v-if="loading" :title="t('recommendPref.loadingTitle')" compact>
      <view class="loading-container">
        <text class="loading-text">{{ t('recommendPref.loadingText') }}</text>
      </view>
    </SectionCard>

    <!-- 错误状态 -->
    <SectionCard v-else-if="error" :title="t('recommendPref.errorTitle')" compact>
      <view class="error-container">
        <text class="error-text">{{ t('recommendPref.errorText') }}</text>
        <button class="retry-btn" @tap="retry">{{ t('recommendPref.retryBtn') }}</button>
      </view>
    </SectionCard>

    <!-- 正常表单 -->
    <template v-else>
      <!-- 每日推荐时间 -->
      <SectionCard :title="t('recommendPref.timeSectionTitle')" :subtitle="t('recommendPref.timeSectionSubtitle')" compact>
        <view class="option-group">
          <view
            v-for="opt in timeOptions"
            :key="opt.value"
            class="option-item"
            :class="{ 'option-item--active': dailyNotifyTime === opt.value }"
            @tap="dailyNotifyTime = opt.value"
          >
            <text class="option-label">{{ opt.label }}</text>
          </view>
        </view>
      </SectionCard>

      <!-- 推荐范围 -->
      <SectionCard :title="t('recommendPref.scopeSectionTitle')" :subtitle="t('recommendPref.scopeSectionSubtitle')" compact>
        <view class="option-group">
          <view
            v-for="opt in scopeOptions"
            :key="opt.value"
            class="option-item"
            :class="{ 'option-item--active': scope === opt.value }"
            @tap="scope = opt.value"
          >
            <text class="option-label">{{ opt.label }}</text>
          </view>
        </view>
      </SectionCard>

      <!-- 校园优先 -->
      <SectionCard :title="t('recommendPref.campusPriorityTitle')" :subtitle="t('recommendPref.campusPrioritySubtitle')" compact>
        <view class="toggle-row" @tap="campusPriority = !campusPriority">
          <text class="toggle-label">{{ t('recommendPref.campusPriorityLabel') }}</text>
          <view class="toggle-switch" :class="{ 'toggle-switch--on': campusPriority }">
            <view class="toggle-knob" />
          </view>
        </view>
      </SectionCard>

      <!-- 保存按钮 -->
      <BottomActionBar
        :primary-label="saving ? t('recommendPref.saving') : t('recommendPref.save')"
        @primary="savePreferences"
      />
    </template>
  </AppShell>
</template>

<style scoped lang="scss">
// ==================== 加载/错误状态 ====================

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 0;
  gap: 20rpx;
}

.loading-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-secondary);
}

.error-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-secondary);
  text-align: center;
}

.retry-btn {
  height: 72rpx;
  padding: 0 var(--sp-9);
  border: 0;
  border-radius: var(--r-md);
  font-size: var(--fs-md);
  font-weight: 600;
  background: var(--c-brand-700);
  color: var(--c-text-inverse);
  line-height: 72rpx;
}

// ==================== 选项组 ====================

.option-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.option-item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120rpx;
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: var(--r-lg, 18rpx);
  border: 2rpx solid var(--c-border-light);
  background: var(--c-bg-container);
  transition: all var(--d-normal, 200ms) ease;
}

.option-item--active {
  border-color: var(--c-brand-700);
  background: var(--c-bg-brand);
  .option-label {
    color: var(--c-brand-700);
    font-weight: 700;
  }
}

.option-label {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary);
}

// ==================== 校园优先开关 ====================

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}

.toggle-label {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary);
}

.toggle-switch {
  width: 88rpx;
  height: 48rpx;
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-surface);
  position: relative;
  transition: background var(--d-normal, 200ms) ease;
}

.toggle-switch--on {
  background: var(--c-brand-700);
}

.toggle-knob {
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-container);
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  transition: left var(--d-normal, 200ms) ease;
  box-shadow: 0 2rpx 8rpx var(--c-black-shadow-lg, var(--c-black-shadow-lg, rgba(0, 0, 0, 0.12)));
}

.toggle-switch--on .toggle-knob {
  left: 44rpx;
}
</style>
