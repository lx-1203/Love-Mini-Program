<script setup lang="ts">
/**
 * Admin 匹配与推荐参数配置视图。
 *
 * 对应后端 com.campuslove.api.admin.AdminMatchConfigController：
 * - GET/PUT /api/v1/admin/match-config        （匹配算法配置）
 * - GET/PUT /api/v1/admin/recommend-strategy  （推荐策略配置）
 *
 * 交互参考 NotifyConfig.vue：行内直接编辑 + 顶部保存按钮 + 脏检查
 * （hasChanges 驱动保存按钮禁用与未保存提示），成功后轻提示自动消失。
 * 两个配置块对应两个独立 PUT 端点，各自维护保存按钮与脏检查基线。
 *
 * 写操作要求 SUPER_ADMIN，普通管理员保存时后端返回 403，
 * 页面直接展示后端错误信息（http.ts 映射为 errors.permission）。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  getMatchConfig,
  getRecommendStrategy,
  updateMatchConfig,
  updateRecommendStrategy,
} from "../api/match-config";
import { ApiError } from "../api/http";
import ErrorState from "../components/ErrorState.vue";
import { TOAST_DURATION_MS } from "../utils/constants";

const { t } = useI18n();

/** 配置项行：后端 values Map（key -> 字符串值）展开为可编辑列表 */
interface ConfigEntry {
  key: string;
  value: string;
}

const matchEntries = ref<ConfigEntry[]>([]);
const recommendEntries = ref<ConfigEntry[]>([]);
const loading = ref(false);
const savingMatch = ref(false);
const savingRecommend = ref(false);
/** 加载失败错误（ErrorState 重试 = fetchAll 重新拉取，此时无未保存编辑，安全） */
const error = ref("");
/**
 * 校验/保存失败错误（普通提示，无重试按钮）。
 * 修复：原实现与 error 共用，ErrorState 的"重试"绑定 fetchAll 会重拉数据
 * 并覆盖用户全部未保存编辑（丢失修改）。
 */
const actionError = ref("");
// 保存成功的轻提示文本，3 秒后自动清空
const successMessage = ref("");
let successTimer: ReturnType<typeof setTimeout> | null = null;

/** 脏检查基线快照（保存/加载成功后记录） */
let matchBaseline = "";
let recommendBaseline = "";

/** 布尔型配置键（用下拉选择 true/false 而非数字输入） */
const BOOLEAN_KEYS = new Set(["sameSchoolBoostEnabled"]);

/** 小数型配置键（数字输入 step=0.01） */
const FLOAT_KEYS = new Set(["sameSchoolBoostPercent"]);

/** 配置键 → i18n labelKey（未收录的未知键直接展示原始 key） */
const FIELD_LABELS: Record<string, string> = {
  heartSignalExpireHours: "matchConfig.fieldHeartSignalExpireHours",
  candidatePageSize: "matchConfig.fieldCandidatePageSize",
  defaultChatDuration: "matchConfig.fieldDefaultChatDuration",
  campusWeight: "matchConfig.fieldCampusWeight",
  cityWeight: "matchConfig.fieldCityWeight",
  interestWeight: "matchConfig.fieldInterestWeight",
  scheduleWeight: "matchConfig.fieldScheduleWeight",
  dailyLimit: "matchConfig.fieldDailyLimit",
  discussionLimit: "matchConfig.fieldDiscussionLimit",
  sameSchoolBoostPercent: "matchConfig.fieldSameSchoolBoostPercent",
  sameMajorWeight: "matchConfig.fieldSameMajorWeight",
  commonCircleWeight: "matchConfig.fieldCommonCircleWeight",
  commonDailyAnswerWeight: "matchConfig.fieldCommonDailyAnswerWeight",
  circleWeight: "matchConfig.fieldCircleWeight",
  sameSchoolBoostEnabled: "matchConfig.fieldSameSchoolBoostEnabled",
};

/** 配置项展示名：优先 i18n 标签，未知键回退到原始 key */
function fieldLabel(key: string): string {
  const labelKey = FIELD_LABELS[key];
  return labelKey ? t(labelKey) : key;
}

function isBooleanKey(key: string): boolean {
  return BOOLEAN_KEYS.has(key);
}

function isFloatKey(key: string): boolean {
  return FLOAT_KEYS.has(key);
}

/** 当前编辑快照（脏检查比较用） */
function snapshot(entries: ConfigEntry[]): string {
  return JSON.stringify(entries.map((e) => [e.key, e.value]));
}

/** 是否有未保存修改 */
const hasMatchChanges = computed(() => snapshot(matchEntries.value) !== matchBaseline);
const hasRecommendChanges = computed(() => snapshot(recommendEntries.value) !== recommendBaseline);

/**
 * 加载匹配算法配置与推荐策略配置。
 * 两个接口并行请求；任一失败时整页进入错误态（ErrorState 重试）。
 */
async function fetchAll() {
  loading.value = true;
  error.value = "";
  try {
    const [matchResult, recommendResult] = await Promise.all([
      getMatchConfig(),
      getRecommendStrategy(),
    ]);
    matchEntries.value = toEntries(matchResult.values);
    recommendEntries.value = toEntries(recommendResult.values);
    matchBaseline = snapshot(matchEntries.value);
    recommendBaseline = snapshot(recommendEntries.value);
  } catch (err: unknown) {
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("matchConfig.loadFailed");
    matchEntries.value = [];
    recommendEntries.value = [];
  } finally {
    loading.value = false;
  }
}

/** values Map → 可编辑行数组（保持后端返回顺序） */
function toEntries(values: Record<string, string>): ConfigEntry[] {
  return Object.entries(values || {}).map(([key, value]) => ({ key, value }));
}

/** 行数组 → 提交用 values Map（值 trim 后保留字符串形式） */
function toValues(entries: ConfigEntry[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const e of entries) values[e.key] = e.value.trim();
  return values;
}

/**
 * 保存前校验：非空；非布尔键必须是有效数字。
 * @returns 错误文案；通过时返回 null
 */
function validateEntries(entries: ConfigEntry[]): string | null {
  for (const e of entries) {
    const value = e.value.trim();
    if (!value) {
      return t("matchConfig.valueRequired", { key: fieldLabel(e.key) });
    }
    if (!isBooleanKey(e.key) && !Number.isFinite(Number(value))) {
      return t("matchConfig.valueInvalidNumber", { key: fieldLabel(e.key) });
    }
  }
  return null;
}

/**
 * 保存匹配算法配置。
 * 无变更时跳过请求；保存成功后更新基线并轻提示。
 */
async function handleSaveMatch() {
  if (!hasMatchChanges.value || savingMatch.value) return;
  const invalid = validateEntries(matchEntries.value);
  if (invalid) {
    actionError.value = invalid;
    return;
  }
  savingMatch.value = true;
  actionError.value = "";
  try {
    const updated = await updateMatchConfig(toValues(matchEntries.value));
    matchEntries.value = toEntries(updated.values || {});
    matchBaseline = snapshot(matchEntries.value);
    showSuccess(t("matchConfig.saveSuccess"));
  } catch (err: unknown) {
    actionError.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("matchConfig.saveFailed");
  } finally {
    savingMatch.value = false;
  }
}

/**
 * 保存推荐策略配置。
 */
async function handleSaveRecommend() {
  if (!hasRecommendChanges.value || savingRecommend.value) return;
  const invalid = validateEntries(recommendEntries.value);
  if (invalid) {
    actionError.value = invalid;
    return;
  }
  savingRecommend.value = true;
  actionError.value = "";
  try {
    const updated = await updateRecommendStrategy(toValues(recommendEntries.value));
    recommendEntries.value = toEntries(updated.values || {});
    recommendBaseline = snapshot(recommendEntries.value);
    showSuccess(t("matchConfig.saveSuccess"));
  } catch (err: unknown) {
    actionError.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("matchConfig.saveFailed");
  } finally {
    savingRecommend.value = false;
  }
}

/** 展示成功提示，3 秒后自动消失 */
function showSuccess(msg: string) {
  if (successTimer) clearTimeout(successTimer);
  successMessage.value = msg;
  successTimer = setTimeout(() => {
    successMessage.value = "";
    successTimer = null;
  }, TOAST_DURATION_MS);
}

onMounted(() => {
  fetchAll();
});

// 组件卸载时清理定时器，避免卸载后触发更新
onBeforeUnmount(() => {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = null;
  }
});
</script>

<template>
  <view class="match-page">
    <view class="page-header">
      <text class="page-title">{{ t("matchConfig.title") }}</text>
      <text class="page-subtitle">{{ t("matchConfig.subtitle") }}</text>
    </view>

    <ErrorState v-if="error" :message="error" @retry="fetchAll" />
    <view v-if="actionError" class="error-message">{{ actionError }}</view>
    <view v-if="successMessage" class="success-message">{{ successMessage }}</view>

    <!-- 匹配算法配置 -->
    <view class="config-section">
      <view class="section-header">
        <text class="section-title">{{ t("matchConfig.sectionMatch") }}</text>
        <view class="section-actions">
          <text v-if="hasMatchChanges && !savingMatch" class="unsaved-tip">
            {{ t("matchConfig.unsavedChanges") }}
          </text>
          <button
            class="primary-button"
            :disabled="savingMatch || loading || !hasMatchChanges"
            @click="handleSaveMatch"
          >
            {{ savingMatch ? t("common.saving") : t("matchConfig.saveButton") }}
          </button>
        </view>
      </view>

      <view class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">{{ t("matchConfig.columnConfigKey") }}</th>
              <th scope="col">{{ t("matchConfig.columnConfigValue") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="2" class="empty-row">{{ t("common.loading") }}</td>
            </tr>
            <tr v-else-if="matchEntries.length === 0">
              <td colspan="2" class="empty-row">{{ t("matchConfig.noData") }}</td>
            </tr>
            <tr v-for="entry in matchEntries" :key="entry.key">
              <td class="key-cell">{{ fieldLabel(entry.key) }}</td>
              <td>
                <select
                  v-if="isBooleanKey(entry.key)"
                  v-model="entry.value"
                  class="value-input value-select"
                >
                  <option value="true">{{ t("common.yes") }}</option>
                  <option value="false">{{ t("common.no") }}</option>
                </select>
                <input
                  v-else
                  v-model="entry.value"
                  class="value-input"
                  type="number"
                  :step="isFloatKey(entry.key) ? '0.01' : '1'"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </view>
    </view>

    <!-- 推荐策略配置 -->
    <view class="config-section">
      <view class="section-header">
        <text class="section-title">{{ t("matchConfig.sectionRecommend") }}</text>
        <view class="section-actions">
          <text v-if="hasRecommendChanges && !savingRecommend" class="unsaved-tip">
            {{ t("matchConfig.unsavedChanges") }}
          </text>
          <button
            class="primary-button"
            :disabled="savingRecommend || loading || !hasRecommendChanges"
            @click="handleSaveRecommend"
          >
            {{ savingRecommend ? t("common.saving") : t("matchConfig.saveButton") }}
          </button>
        </view>
      </view>

      <view class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">{{ t("matchConfig.columnConfigKey") }}</th>
              <th scope="col">{{ t("matchConfig.columnConfigValue") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="2" class="empty-row">{{ t("common.loading") }}</td>
            </tr>
            <tr v-else-if="recommendEntries.length === 0">
              <td colspan="2" class="empty-row">{{ t("matchConfig.noData") }}</td>
            </tr>
            <tr v-for="entry in recommendEntries" :key="entry.key">
              <td class="key-cell">{{ fieldLabel(entry.key) }}</td>
              <td>
                <select
                  v-if="isBooleanKey(entry.key)"
                  v-model="entry.value"
                  class="value-input value-select"
                >
                  <option value="true">{{ t("common.yes") }}</option>
                  <option value="false">{{ t("common.no") }}</option>
                </select>
                <input
                  v-else
                  v-model="entry.value"
                  class="value-input"
                  type="number"
                  :step="isFloatKey(entry.key) ? '0.01' : '1'"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

.match-page {
  max-width: 1200px;
}

.config-section {
  margin-bottom: var(--admin-space-xxxl);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--admin-space-lg);
}

.section-title {
  font-size: var(--admin-font-xxl);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.section-actions {
  display: flex;
  align-items: center;
  gap: var(--admin-space-lg);
}

.unsaved-tip {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-warning);
}

.key-cell {
  font-weight: 500;
  color: var(--admin-color-text-primary);
  white-space: nowrap;
}

.value-input {
  width: 220px;
  padding: var(--admin-space-sm) var(--admin-space-md-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-md);
  box-sizing: border-box;
}

.value-input:focus {
  outline: none;
  border-color: var(--admin-color-primary);
}

.value-select {
  width: 220px;
  background: var(--admin-color-bg-container);
}
</style>
