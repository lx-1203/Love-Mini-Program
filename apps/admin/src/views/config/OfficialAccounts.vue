<script setup lang="ts">
/**
 * Admin 官方号视图（复制自旧后台 apps/admin，适配 admin-v2 目录结构）。
 *
 * 展示两个官方号（产品助手号 / 活动运营号）的账号元信息与消息流。
 *
 * 2026-10-27 新增「发布全站广播公告」：直接把公告写进小程序官方号会话已在渲染的
 * official_messages 表，客户端零改动即时生效；下架为物理删除（该表无状态位，
 * 软删标记仍会被用户端渲染）。
 *
 * 权限：读接口对 ADMIN / SUPER_ADMIN / AUDITOR 开放；写接口后端为
 * `@PreAuthorize("hasRole('SUPER_ADMIN')")`——广播面向全平台所有用户，
 * 校区管理员不可广播，故非超级管理员只看到只读提示（前端隐藏控件，后端 403 兜底）。
 */
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import {
  BROADCAST_ACCOUNT_CODE,
  deleteAnnouncement,
  getOfficialAccountMessages,
  listOfficialAccounts,
  publishAnnouncement,
  type OfficialAccountView,
  type OfficialMessageView,
  type OfficialMessageType,
} from "@/api/official-accounts";
import { listActivities, type ActivitySummary } from "@/api/activities";
import { listSchoolOptions, type SchoolView } from "@/api/system";
import { listAllLayers, buildLayerTree, type CircleLayer } from "@/api/circle";
import { ApiError } from "@/api/http";
import { useI18n } from "vue-i18n";
import ErrorState from "@/components/ErrorState.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import { useSessionStore } from "@/stores/session";
import { formatDateTime } from "@/utils/format";
import { TOAST_DURATION_MS } from "@/utils/constants";

const { t } = useI18n();
const sessionStore = useSessionStore();

/** 是否超级管理员（广播写控件唯一开关，与 Config.vue 同一口径） */
const isSuperAdmin = computed(
  () => String(sessionStore.user?.role || "").toUpperCase() === "SUPER_ADMIN",
);

/** 官方号账号列表 */
const accounts = ref<OfficialAccountView[]>([]);
const loading = ref(false);
const error = ref("");

/** 当前选中的官方号 code */
const activeCode = ref<string>("");

/** 当前官方号消息流 */
const messages = ref<OfficialMessageView[]>([]);
const messagesLoading = ref(false);

/** 当前选中账号元信息 */
const activeAccount = computed(() =>
  accounts.value.find((a) => a.code === activeCode.value),
);

/** 当前 Tab 是否为唯一可广播的官方号（寻觅助手） */
const isActiveBroadcastAccount = computed(
  () => activeCode.value === BROADCAST_ACCOUNT_CODE,
);

/** 当前是否可执行广播写操作（超级管理员 + 助手号 Tab） */
const canBroadcast = computed(
  () => isSuperAdmin.value && isActiveBroadcastAccount.value,
);

// ---- 发布公告表单 ----

/** 公告正文长度上限（与后端 @Size(max = 500) 同一口径） */
const CONTENT_MAX_LENGTH = 500;

const formType = ref<OfficialMessageType>("text");
const formContent = ref("");
const formCardTitle = ref("");
const formCardDesc = ref("");
const formCardTag = ref("");
const formCardTargetUrl = ref("");
/** 关联活动 ID：select 绑定字符串，提交时转 number（空串表示未选） */
const formCardActivityId = ref("");

// ---- 受众选择（2026-11-03 P1-2：官方号公告支持全站/校区/圈层定向广播） ----

/** 受众类型：ALL 全站（缺省，行为同旧版全平台广播）/ CAMPUS 校区 / CIRCLE 圈层 */
const formAudienceType = ref<"ALL" | "CAMPUS" | "CIRCLE">("ALL");
/** CAMPUS 时选中的校区名（须与高校管理一致，后端按名字精确校验，错值 400） */
const formAudienceCampus = ref("");
/** CIRCLE 时选中的圈层路径（如 C1/R1，按前缀命中其下全部层级用户） */
const formAudienceCirclePath = ref("");

/** 校区下拉数据（listSchoolOptions 仅返回启用高校，与「新增管理员」校区下拉同源） */
const schoolOptions = ref<SchoolView[]>([]);
const schoolOptionsLoading = ref(false);
const schoolOptionsError = ref("");

/** 圈层下拉项：扁平化后的 circlePath + 带缩进的显示名（option 不支持样式，只能文本缩进） */
interface AudienceCircleOption {
  circlePath: string;
  label: string;
}
const circleOptions = ref<AudienceCircleOption[]>([]);
const circleOptionsLoading = ref(false);
const circleOptionsError = ref("");

/** 发布中标志（防连点） */
const publishing = ref(false);
/** 表单级错误提示（校验失败或后端 400 message） */
const formError = ref("");
/** 发布/下架成功轻提示 */
const successMessage = ref("");
/** 下架失败等操作级错误（展示在消息流表上方，避免被只读区域的错误框吞掉） */
const actionError = ref("");
let successTimer: ReturnType<typeof setTimeout> | null = null;

/** 卡片可关联的活动下拉数据 */
const activityOptions = ref<ActivitySummary[]>([]);
const activityOptionsLoading = ref(false);
const activityOptionsError = ref("");

/** 展示轻提示，TOAST_DURATION_MS 后自动消失 */
function showSuccess(msg: string) {
  successMessage.value = msg;
  if (successTimer) clearTimeout(successTimer);
  successTimer = setTimeout(() => {
    successMessage.value = "";
  }, TOAST_DURATION_MS);
}

/** 从异常提取后端可读文案 */
function errorMessageOf(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.message) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** 加载卡片关联活动下拉（仅需一次，失败可重试） */
async function fetchActivityOptions() {
  if (activityOptionsLoading.value) return;
  activityOptionsLoading.value = true;
  activityOptionsError.value = "";
  try {
    const result = await listActivities({ pageSize: 100 });
    activityOptions.value = result?.items ?? [];
  } catch (err: unknown) {
    activityOptions.value = [];
    activityOptionsError.value = errorMessageOf(err, t("officialAccounts.loadActivitiesFailed"));
  } finally {
    activityOptionsLoading.value = false;
  }
}

/** 切换类型时惰性加载活动列表（首次切到 card） */
function handleTypeChange(type: OfficialMessageType) {
  formType.value = type;
  if (type === "card" && activityOptions.value.length === 0 && !activityOptionsLoading.value) {
    void fetchActivityOptions();
  }
}

/** 加载校区下拉（受众选「按校区」时用；失败可重试，不阻断发布表单其余字段） */
async function fetchSchoolOptions() {
  if (schoolOptionsLoading.value) return;
  schoolOptionsLoading.value = true;
  schoolOptionsError.value = "";
  try {
    schoolOptions.value = await listSchoolOptions();
  } catch (err: unknown) {
    schoolOptions.value = [];
    schoolOptionsError.value = errorMessageOf(err, t("officialAccounts.loadSchoolsFailed"));
  } finally {
    schoolOptionsLoading.value = false;
  }
}

/**
 * 加载圈层下拉（受众选「按圈层」时用，扁平化出 circlePath + 显示名）。
 * 注意：后端 CircleLayer 实体序列化为嵌套 parent 对象而非 parentId 字段，
 * 本地补齐 parentId 后再建树——与 VillagePosts.vue 圈层树同一套写法
 * （api/circle.ts 归圈层管理页所有，不在其上改动）。
 */
async function fetchCircleOptions() {
  if (circleOptionsLoading.value) return;
  circleOptionsLoading.value = true;
  circleOptionsError.value = "";
  try {
    const layers = await listAllLayers();
    const normalized = layers.map((l) => ({
      ...l,
      parentId:
        l.parentId ??
        (l as CircleLayer & { parent?: { id?: number } | null }).parent?.id ??
        null,
    }));
    const out: AudienceCircleOption[] = [];
    // 深度优先走树，全角空格缩进表示层级（公司 → 大区 → 学校）
    const walk = (nodes: CircleLayer[], depth: number): void => {
      nodes.forEach((node) => {
        out.push({
          circlePath: node.circlePath,
          label: `${"　".repeat(depth)}${node.name}（${node.circlePath}）`,
        });
        if (node.children && node.children.length > 0) walk(node.children, depth + 1);
      });
    };
    walk(buildLayerTree(normalized), 0);
    circleOptions.value = out;
  } catch (err: unknown) {
    circleOptions.value = [];
    circleOptionsError.value = errorMessageOf(err, t("officialAccounts.loadCirclesFailed"));
  } finally {
    circleOptionsLoading.value = false;
  }
}

/** 切换受众类型：惰性加载对应维度的下拉（缺省 ALL 无需任何选项数据） */
function handleAudienceTypeChange() {
  if (
    formAudienceType.value === "CAMPUS" &&
    schoolOptions.value.length === 0 &&
    !schoolOptionsLoading.value
  ) {
    void fetchSchoolOptions();
  }
  if (
    formAudienceType.value === "CIRCLE" &&
    circleOptions.value.length === 0 &&
    !circleOptionsLoading.value
  ) {
    void fetchCircleOptions();
  }
}

/**
 * 广播范围提示文案：按当前受众选择动态生成
 * （2026-11-03 P1-2 之前写死「全平台」不再成立，定向广播时范围随之收窄）。
 * 定向维度尚未选值时先回落到全站文案，避免提示与实际提交不一致。
 */
const broadcastScopeText = computed(() => {
  if (formAudienceType.value === "CAMPUS" && formAudienceCampus.value) {
    return t("officialAccounts.broadcastScopeCampus", { campus: formAudienceCampus.value });
  }
  if (formAudienceType.value === "CIRCLE" && formAudienceCirclePath.value) {
    return t("officialAccounts.broadcastScopeCircle", { circle: formAudienceCirclePath.value });
  }
  return t("officialAccounts.broadcastScope");
});

/** 表单前端校验，返回错误文案（空串表示通过） */
function validateForm(): string {
  const content = formContent.value.trim();
  if (!content) return t("officialAccounts.contentRequired");
  if (content.length > CONTENT_MAX_LENGTH) {
    return t("officialAccounts.contentTooLong", { max: CONTENT_MAX_LENGTH });
  }
  if (formType.value === "card" && !formCardActivityId.value) {
    return t("officialAccounts.activityRequired");
  }
  // 受众校验（2026-11-03 P1-2）：定向维度必须选值，前端拦下一次注定 400 的往返
  if (formAudienceType.value === "CAMPUS" && !formAudienceCampus.value) {
    return t("officialAccounts.audienceCampusRequired");
  }
  if (formAudienceType.value === "CIRCLE" && !formAudienceCirclePath.value) {
    return t("officialAccounts.audienceCircleRequired");
  }
  return "";
}

/** 重置表单字段 */
function resetForm() {
  formContent.value = "";
  formCardTitle.value = "";
  formCardDesc.value = "";
  formCardTag.value = "";
  formCardTargetUrl.value = "";
  formCardActivityId.value = "";
  // 受众复位为缺省全站（ALL 无值维度，audienceValue 在提交时统一置 null）
  formAudienceType.value = "ALL";
  formAudienceCampus.value = "";
  formAudienceCirclePath.value = "";
}

/** 提交发布公告 */
async function handlePublish() {
  if (!sessionStore.canSuperAdminWrite) return;
  if (!canBroadcast.value || publishing.value) return;
  const invalid = validateForm();
  if (invalid) {
    formError.value = invalid;
    return;
  }
  publishing.value = true;
  formError.value = "";
  try {
    const activityId = formCardActivityId.value ? Number(formCardActivityId.value) : null;
    await publishAnnouncement(BROADCAST_ACCOUNT_CODE, {
      messageType: formType.value,
      content: formContent.value.trim(),
      cardTitle: formType.value === "card" ? formCardTitle.value.trim() || null : null,
      cardDesc: formType.value === "card" ? formCardDesc.value.trim() || null : null,
      cardTag: formType.value === "card" ? formCardTag.value.trim() || null : null,
      cardTargetUrl: formType.value === "card" ? formCardTargetUrl.value.trim() || null : null,
      cardActivityId: formType.value === "card" ? activityId : null,
      // 受众定向（2026-11-03 P1-2）：ALL 时显式传 null，覆盖可能残留的旧值
      audienceType: formAudienceType.value,
      audienceValue:
        formAudienceType.value === "CAMPUS"
          ? formAudienceCampus.value
          : formAudienceType.value === "CIRCLE"
            ? formAudienceCirclePath.value
            : null,
    });
    resetForm();
    showSuccess(t("officialAccounts.publishSuccess"));
    await fetchMessages(activeCode.value);
  } catch (err: unknown) {
    formError.value = errorMessageOf(err, t("officialAccounts.publishFailed"));
  } finally {
    publishing.value = false;
  }
}

// ---- 下架公告 ----

/** 待下架的公告行（非空即展示确认弹窗） */
const deleteTarget = ref<OfficialMessageView | null>(null);
/** 确认弹窗可见性（v-model:visible 需要可写布尔量） */
const deleteVisible = ref(false);
const deleting = ref(false);

function askDelete(msg: OfficialMessageView) {
  deleteTarget.value = msg;
  deleteVisible.value = true;
}

function cancelDelete() {
  deleteVisible.value = false;
  deleteTarget.value = null;
}

/** 确认下架：硬删除该行并刷新消息流 */
async function handleDeleteConfirm() {
  if (!sessionStore.canSuperAdminWrite) return;
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  try {
    await deleteAnnouncement(activeCode.value, target.id);
    cancelDelete();
    showSuccess(t("officialAccounts.deleteSuccess"));
    await fetchMessages(activeCode.value);
  } catch (err: unknown) {
    actionError.value = errorMessageOf(err, t("officialAccounts.deleteFailed"));
    cancelDelete();
  } finally {
    deleting.value = false;
  }
}

/** 加载账号列表，默认选中第一个并加载其消息流 */
async function fetchAccounts() {
  loading.value = true;
  error.value = "";
  try {
    const result = await listOfficialAccounts();
    accounts.value = result || [];
    if (accounts.value.length > 0 && !activeCode.value) {
      activeCode.value = accounts.value[0]!.code;
      await fetchMessages(activeCode.value);
    }
  } catch (err: unknown) {
    error.value = errorMessageOf(err, t("officialAccounts.loadFailed"));
  } finally {
    loading.value = false;
  }
}

/** 加载某官方号消息流 */
async function fetchMessages(code: string) {
  if (!code) return;
  messagesLoading.value = true;
  actionError.value = "";
  try {
    const result = await getOfficialAccountMessages(code);
    messages.value = result || [];
  } catch (err: unknown) {
    messages.value = [];
    error.value = errorMessageOf(err, t("officialAccounts.loadMessagesFailed"));
  } finally {
    messagesLoading.value = false;
  }
}

/** 切换官方号 */
function selectAccount(code: string) {
  activeCode.value = code;
  formError.value = "";
  actionError.value = "";
  void fetchMessages(code);
}

/**
 * 消息列表受众摘要（2026-11-03 P1-2）：「全站」/「校区：X」/「圈层：X」。
 * 历史消息无 audienceType 字段，调用方判空后才展示（本函数不做兜底文案）。
 */
function audienceLabel(msg: OfficialMessageView): string {
  if (msg.audienceType === "CAMPUS") {
    return t("officialAccounts.audienceSummaryCampus", { value: msg.audienceValue || "-" });
  }
  if (msg.audienceType === "CIRCLE") {
    return t("officialAccounts.audienceSummaryCircle", { value: msg.audienceValue || "-" });
  }
  return t("officialAccounts.audienceSummaryAll");
}

onMounted(fetchAccounts);
onBeforeUnmount(() => {
  if (successTimer) clearTimeout(successTimer);
});
</script>

<template>
  <div class="official-page">
    <div class="page-header">
      <h2>{{ t("officialAccounts.title") }}</h2>
      <p class="page-subtitle">{{ t("officialAccounts.subtitle") }}</p>
    </div>

    <!-- 操作结果轻提示（独立块：不能插在 v-if / v-else-if 链中间） -->
    <div v-if="successMessage" class="success-box" role="status">{{ successMessage }}</div>

    <!-- 加载失败 -->
    <ErrorState v-if="error && accounts.length === 0" :message="error" @retry="fetchAccounts" />

    <!-- 账号列表 -->
    <div v-else-if="loading" class="loading-box">{{ t("common.loading") }}</div>

    <div v-else class="official-body">
      <!-- 账号 Tab -->
      <div class="account-tabs">
        <button
          v-for="acc in accounts"
          :key="acc.code"
          class="account-tab"
          :class="{ 'account-tab--active': acc.code === activeCode }"
          @click="selectAccount(acc.code)"
        >
          <span class="account-tab__name">{{ acc.name }}</span>
          <span class="account-tab__desc">{{ acc.description }}</span>
        </button>
      </div>

      <!-- 广播范围提示：2026-11-03 P1-2 起按受众选择动态显示（全站/校区/圈层），
           非超级管理员无表单、受众恒为缺省 ALL，仍展示全站文案 -->
      <div v-if="isActiveBroadcastAccount" class="broadcast-notice" role="note">
        <strong>{{ t("officialAccounts.broadcastScopeTitle") }}</strong>
        <span>{{ broadcastScopeText }}</span>
      </div>

      <!-- 非超级管理员只读提示 -->
      <div v-if="!isSuperAdmin" class="readonly-tip" role="status">
        {{ t("officialAccounts.readonlyTip") }}
      </div>

      <!-- 发布广播公告表单（仅超级管理员可见） -->
      <form v-if="canBroadcast && sessionStore.canSuperAdminWrite" class="publish-form" @submit.prevent="handlePublish">
        <div class="publish-form__header">
          <span class="publish-form__title">{{ t("officialAccounts.publishTitle") }}</span>
          <span class="publish-form__hint">{{ t("officialAccounts.publishHint") }}</span>
        </div>

        <div class="form-row">
          <span class="form-label">{{ t("officialAccounts.labelType") }}</span>
          <span class="radio-group">
            <label class="radio-item">
              <input type="radio" value="text" :checked="formType === 'text'" @change="handleTypeChange('text')" />
              <span>{{ t("officialAccounts.typeText") }}</span>
            </label>
            <label class="radio-item">
              <input type="radio" value="card" :checked="formType === 'card'" @change="handleTypeChange('card')" />
              <span>{{ t("officialAccounts.typeCard") }}</span>
            </label>
          </span>
        </div>

        <!-- 受众选择（2026-11-03 P1-2）：全站=旧行为；按校区/按圈层为定向广播，
             值下拉随类型出现，选项数据在首次切到对应类型时惰性加载 -->
        <div class="form-row">
          <label class="form-label" for="oa-audience-type">{{ t("officialAccounts.labelAudience") }}</label>
          <span class="form-field">
            <span class="audience-controls">
              <select
                id="oa-audience-type"
                v-model="formAudienceType"
                class="form-select"
                @change="handleAudienceTypeChange"
              >
                <option value="ALL">{{ t("officialAccounts.audienceAll") }}</option>
                <option value="CAMPUS">{{ t("officialAccounts.audienceCampus") }}</option>
                <option value="CIRCLE">{{ t("officialAccounts.audienceCircle") }}</option>
              </select>
              <select
                v-if="formAudienceType === 'CAMPUS'"
                id="oa-audience-campus"
                v-model="formAudienceCampus"
                class="form-select"
              >
                <option value="">{{ t("officialAccounts.audienceCampusPlaceholder") }}</option>
                <option v-for="school in schoolOptions" :key="school.id" :value="school.name">
                  {{ school.name }}
                </option>
              </select>
              <select
                v-if="formAudienceType === 'CIRCLE'"
                id="oa-audience-circle"
                v-model="formAudienceCirclePath"
                class="form-select"
              >
                <option value="">{{ t("officialAccounts.audienceCirclePlaceholder") }}</option>
                <option v-for="opt in circleOptions" :key="opt.circlePath" :value="opt.circlePath">
                  {{ opt.label }}
                </option>
              </select>
              <button
                v-if="formAudienceType === 'CAMPUS' && !schoolOptionsLoading"
                type="button"
                class="ghost-button"
                @click="fetchSchoolOptions"
              >{{ t("officialAccounts.reloadSchools") }}</button>
              <button
                v-if="formAudienceType === 'CIRCLE' && !circleOptionsLoading"
                type="button"
                class="ghost-button"
                @click="fetchCircleOptions"
              >{{ t("officialAccounts.reloadCircles") }}</button>
            </span>
            <span v-if="schoolOptionsLoading || circleOptionsLoading" class="form-hint">{{ t("common.loading") }}</span>
            <span v-if="schoolOptionsError" class="form-error">{{ schoolOptionsError }}</span>
            <span v-if="circleOptionsError" class="form-error">{{ circleOptionsError }}</span>
          </span>
        </div>

        <div class="form-row">
          <label class="form-label" for="oa-content">{{ t("officialAccounts.labelContent") }}</label>
          <span class="form-field">
            <textarea
              id="oa-content"
              v-model="formContent"
              class="form-textarea"
              rows="3"
              :maxlength="CONTENT_MAX_LENGTH"
              :placeholder="t('officialAccounts.contentPlaceholder')"
            />
            <span class="form-counter">{{ formContent.length }} / {{ CONTENT_MAX_LENGTH }}</span>
          </span>
        </div>

        <template v-if="formType === 'card'">
          <div class="form-row">
            <label class="form-label" for="oa-activity">{{ t("officialAccounts.labelActivity") }}</label>
            <span class="form-field">
              <select id="oa-activity" v-model="formCardActivityId" class="form-input">
                <option value="">{{ t("officialAccounts.activityPlaceholder") }}</option>
                <option v-for="item in activityOptions" :key="item.id" :value="String(item.id)">
                  {{ item.title }}（{{ item.scheduleText || "-" }}）
                </option>
              </select>
              <button
                v-if="!activityOptionsLoading"
                type="button"
                class="ghost-button"
                @click="fetchActivityOptions"
              >{{ t("officialAccounts.reloadActivities") }}</button>
              <span v-if="activityOptionsLoading" class="form-hint">{{ t("common.loading") }}</span>
              <span v-if="activityOptionsError" class="form-error">{{ activityOptionsError }}</span>
            </span>
          </div>

          <div class="form-row">
            <label class="form-label" for="oa-card-title">{{ t("officialAccounts.labelCardTitle") }}</label>
            <input id="oa-card-title" v-model="formCardTitle" class="form-input" type="text" maxlength="128" />
          </div>

          <div class="form-row">
            <label class="form-label" for="oa-card-desc">{{ t("officialAccounts.labelCardDesc") }}</label>
            <input id="oa-card-desc" v-model="formCardDesc" class="form-input" type="text" maxlength="255" />
          </div>

          <div class="form-row">
            <label class="form-label" for="oa-card-tag">{{ t("officialAccounts.labelCardTag") }}</label>
            <input id="oa-card-tag" v-model="formCardTag" class="form-input" type="text" maxlength="32" />
          </div>

          <div class="form-row">
            <label class="form-label" for="oa-card-url">{{ t("officialAccounts.labelCardUrl") }}</label>
            <span class="form-field">
              <input
                id="oa-card-url"
                v-model="formCardTargetUrl"
                class="form-input"
                type="text"
                maxlength="512"
                :placeholder="t('officialAccounts.cardUrlPlaceholder')"
              />
              <span class="form-hint">{{ t("officialAccounts.cardUrlHint") }}</span>
            </span>
          </div>
        </template>

        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

        <div class="form-actions">
          <button type="button" class="ghost-button" :disabled="publishing" @click="resetForm">
            {{ t("common.reset") }}
          </button>
          <button type="submit" class="btn btn-primary" :disabled="publishing">
            {{ publishing ? t("officialAccounts.publishing") : t("officialAccounts.publishButton") }}
          </button>
        </div>
      </form>

      <!-- 消息流 -->
      <div class="messages-panel">
        <div v-if="actionError" class="error-box" role="alert">
          {{ actionError }}
          <button class="btn btn-primary" @click="fetchMessages(activeCode)">{{ t("common.retry") }}</button>
        </div>
        <div class="messages-panel__header">
          <span class="messages-panel__title">
            {{ activeAccount ? activeAccount.name : "-" }}
          </span>
          <span class="messages-panel__count">
            {{ t("officialAccounts.messageCount", { n: messages.length }) }}
          </span>
        </div>

        <div v-if="messagesLoading" class="loading-box">{{ t("common.loading") }}</div>
        <div v-else-if="messages.length === 0" class="empty-box">
          {{ t("officialAccounts.emptyMessages") }}
        </div>

        <table v-else class="message-table">
          <thead>
            <tr>
              <th>{{ t("officialAccounts.colType") }}</th>
              <th>{{ t("officialAccounts.colContent") }}</th>
              <th>{{ t("officialAccounts.colCard") }}</th>
              <th>关联活动</th>
              <th>推荐理由 / 人数</th>
              <th>{{ t("officialAccounts.colTarget") }}</th>
              <th>{{ t("officialAccounts.colAudience") }}</th>
              <th>{{ t("officialAccounts.colPublishedAt") }}</th>
              <th v-if="canBroadcast && sessionStore.canSuperAdminWrite">{{ t("officialAccounts.colActions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="msg in messages" :key="msg.id">
              <td>
                <span
                  class="type-badge"
                  :class="msg.messageType === 'card' ? 'type-badge--card' : 'type-badge--text'"
                >
                  {{ msg.messageType }}
                </span>
              </td>
              <td class="cell-content">{{ msg.content }}</td>
              <td>
                <span v-if="msg.cardTitle">{{ msg.cardTitle }}</span>
                <span v-if="msg.cardTag" class="card-tag">{{ msg.cardTag }}</span>
                <span v-else>-</span>
              </td>
              <td>
                <template v-if="msg.cardActivity">
                  <div>{{ msg.cardActivity.title }}</div>
                  <div class="cell-time">{{ msg.cardActivity.timeText }}</div>
                </template>
                <span v-else>-</span>
              </td>
              <td>
                <template v-if="msg.cardActivity">
                  <div>{{ msg.cardActivity.recommendReason || "-" }}</div>
                  <div>{{ msg.cardActivity.enrollmentCount }} 人</div>
                </template>
                <span v-else>-</span>
              </td>
              <td class="cell-target">
                <a v-if="msg.cardTargetUrl" :href="msg.cardTargetUrl" target="_blank" rel="noopener">
                  {{ msg.cardTargetUrl }}
                </a>
                <span v-else>-</span>
              </td>
              <!-- 受众摘要：2026-11-03 P1-2 起后端携带 audienceType；历史消息无该字段则不展示 -->
              <td>
                <span v-if="msg.audienceType">{{ audienceLabel(msg) }}</span>
                <span v-else>-</span>
              </td>
              <td class="cell-time">{{ formatDateTime(msg.publishedAt) }}</td>
              <td v-if="canBroadcast && sessionStore.canSuperAdminWrite" class="action-cell">
                <button class="btn btn-danger" :disabled="deleting" @click="askDelete(msg)">
                  {{ t("officialAccounts.takeDown") }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 下架确认弹窗：硬删除，不可恢复 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="t('officialAccounts.deleteTitle')"
      :message="deleteTarget ? t('officialAccounts.deleteConfirm', { content: deleteTarget.content }) : ''"
      :danger="true"
      :confirming="deleting"
      @confirm="handleDeleteConfirm"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.official-page {
  padding: var(--admin-space-xxl);
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 22px;
}

.page-subtitle {
  margin: 0 0 24px;
  color: var(--admin-color-text-tertiary);
  font-size: 14px;
}

.error-box,
.loading-box,
.empty-box {
  padding: 32px;
  text-align: center;
  color: var(--admin-color-text-tertiary);
  background: var(--admin-color-bg-subtle);
  border-radius: 8px;
  border: 1px dashed var(--admin-color-border);
}

.error-box button {
  margin-left: var(--admin-space-md);
}

.account-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.account-tab {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 20px;
  border: 1px solid var(--admin-color-border);
  border-radius: 8px;
  background: var(--admin-color-bg-container);
  cursor: pointer;
  text-align: left;
}

.account-tab--active {
  border-color: var(--admin-color-skip-link);
  background: var(--admin-color-success-soft);
}

.account-tab__name {
  font-weight: 600;
  font-size: 15px;
}

.account-tab__desc {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}

.messages-panel {
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border);
  border-radius: 8px;
  overflow: hidden;
}

.messages-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--admin-color-border-light);
}

.messages-panel__title {
  font-weight: 600;
}

.messages-panel__count {
  font-size: 13px;
  color: var(--admin-color-text-quaternary);
}

.message-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.message-table th,
.message-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--admin-color-border-light);
  vertical-align: top;
}

.message-table th {
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-tertiary);
  font-weight: 600;
  white-space: nowrap;
}

.type-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: var(--admin-font-sm);
  font-weight: 600;
}

.type-badge--text {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.type-badge--card {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.cell-content {
  max-width: 320px;
  line-height: 1.6;
}

.card-tag {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
  font-size: var(--admin-font-sm);
}

.cell-target a {
  color: var(--admin-color-skip-link);
  word-break: break-all;
}

.cell-time {
  white-space: nowrap;
  color: var(--admin-color-text-quaternary);
}

/* ---- 广播发布 / 下架控件样式 ---- */

.success-box {
  margin-bottom: var(--admin-space-lg);
  padding: var(--admin-space-md) var(--admin-space-lg);
  border: 1px solid var(--admin-color-success);
  border-radius: 8px;
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
  font-size: 14px;
}

.broadcast-notice {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--admin-space-md);
  padding: var(--admin-space-md) var(--admin-space-lg);
  border: 1px solid var(--admin-color-warning);
  border-left-width: 4px;
  border-radius: 8px;
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-text-primary);
  font-size: 14px;
  line-height: 1.6;
}

.readonly-tip {
  margin-bottom: var(--admin-space-md);
  padding: var(--admin-space-md) var(--admin-space-lg);
  border: 1px dashed var(--admin-color-border);
  border-radius: 8px;
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-tertiary);
  font-size: var(--admin-font-md);
}

.publish-form {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-md);
  margin-bottom: var(--admin-space-xl);
  padding: var(--admin-space-lg);
  border: 1px solid var(--admin-color-border);
  border-radius: 8px;
  background: var(--admin-color-bg-container);
}

.publish-form__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: var(--admin-space-sm);
  border-bottom: 1px solid var(--admin-color-border-light);
}

.publish-form__title {
  font-size: 15px;
  font-weight: 600;
}

.publish-form__hint {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: var(--admin-space-md);
}

.form-label {
  flex: 0 0 120px;
  padding-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--admin-color-text-tertiary);
}

.form-field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  max-width: 520px;
  padding: 8px 10px;
  border: 1px solid var(--admin-color-border);
  border-radius: 6px;
  background: var(--admin-color-bg-container);
  color: var(--admin-color-text-primary);
  font: inherit;
  font-size: 14px;
}

.form-textarea {
  resize: vertical;
  line-height: 1.6;
}

/* 受众行三个控件横排（类型 + 值下拉 + 重载按钮），窄屏允许换行 */
.audience-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--admin-space-sm);
}

/* 下拉复用 .form-input 视觉，但按内容收缩宽度以适配横排（2026-11-03 P1-2） */
.form-select {
  width: auto;
  min-width: 180px;
  max-width: 520px;
}

.form-counter,
.form-hint {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}

.form-error {
  margin: 0;
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger);
}

.radio-group {
  display: flex;
  gap: var(--admin-space-lg);
  padding-top: 6px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--admin-space-md);
}

.btn {
  padding: 8px 18px;
  border: 1px solid var(--admin-color-border);
  border-radius: 6px;
  background: var(--admin-color-bg-container);
  color: var(--admin-color-text-primary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-primary {
  border-color: transparent;
  background: var(--admin-color-skip-link);
  color: #fff;
}

.btn-danger {
  padding: 4px 12px;
  border-color: var(--admin-color-danger-border, var(--admin-color-border));
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
  font-size: var(--admin-font-sm);
  white-space: nowrap;
}

.ghost-button {
  padding: 4px 12px;
  border: 1px solid var(--admin-color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--admin-color-text-tertiary);
  font: inherit;
  font-size: var(--admin-font-sm);
  cursor: pointer;
}

.action-cell {
  white-space: nowrap;
}
</style>

