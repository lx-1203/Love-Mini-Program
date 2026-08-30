<script setup lang="ts">
/**
 * 举报调阅 · 圈层可见内容面板（design Frame 05/09「调阅证据」组件还原）。
 *
 * 对接 RBAC 三级圈层取证接口（后台RBAC三级圈层规格.md §5.1）：
 *   GET /api/v1/admin/evidence?type=chat|image|post|tempChat&userId=…
 * - 四分类 chip（聊天内容 / 上传图片 / 帖子 / 临时聊天），浅绿底 + 绿字；
 * - 点击 chip 拉取该类型取证列表（仅 viewer 圈层 scope 内可见）；
 * - 越级访问由后端 403 拦截，此处展示统一错误。
 */
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { getEvidence, type EvidenceItem } from "@/api/circle";

const { t } = useI18n();

const props = defineProps<{
  /** 被调阅用户 ID（被举报人） */
  userId: number;
}>();

/** 四分类 chip（Frame 05/09：聊天内容 / 上传图片 / 帖子 / 临时聊天） */
const EVIDENCE_TYPES = [
  { value: "chat", labelKey: "evidence.typeChat" },
  { value: "image", labelKey: "evidence.typeImage" },
  { value: "post", labelKey: "evidence.typePost" },
  { value: "tempChat", labelKey: "evidence.typeTempChat" },
] as const;

type EvidenceType = (typeof EVIDENCE_TYPES)[number]["value"];

const activeType = ref<EvidenceType>("chat");
const items = ref<EvidenceItem[]>([]);
const total = ref(0);
const page = ref(1);
const PAGE_SIZE = 10;
const loading = ref(false);
const errorMsg = ref("");
/** 越级/越权（后端 403）专用提示 */
const forbidden = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  forbidden.value = false;
  try {
    const result = await getEvidence({
      type: activeType.value,
      userId: props.userId,
      page: page.value,
      size: PAGE_SIZE,
    });
    items.value = result.items || [];
    total.value = result.total || 0;
  } catch (err: unknown) {
    items.value = [];
    total.value = 0;
    const status = (err as { status?: number })?.status;
    if (status === 403) {
      forbidden.value = true;
      errorMsg.value = t("evidence.forbidden");
    } else {
      errorMsg.value = t("evidence.loadFailed");
    }
  } finally {
    loading.value = false;
  }
}

function switchType(type: EvidenceType): void {
  if (activeType.value === type) return;
  activeType.value = type;
  page.value = 1;
  void load();
}

function changePage(delta: number): void {
  const next = page.value + delta;
  if (next < 1) return;
  const maxPage = Math.max(Math.ceil(total.value / PAGE_SIZE), 1);
  if (next > maxPage) return;
  page.value = next;
  void load();
}

function itemPreview(item: EvidenceItem): string {
  const text = item.content || "";
  return text.length > 80 ? `${text.slice(0, 80)}…` : text || t("common.emptyPlaceholder");
}

watch(
  () => props.userId,
  () => {
    page.value = 1;
    void load();
  },
  { immediate: true },
);
</script>

<template>
  <view class="evidence-panel">
    <text class="evidence-title">{{ t("evidence.title") }}</text>

    <!-- 四分类 chip（浅绿底 + 绿字，Frame 05/09） -->
    <view class="evidence-chips">
      <button
        v-for="type in EVIDENCE_TYPES"
        :key="type.value"
        type="button"
        class="evidence-chip"
        :class="{ 'evidence-chip--active': activeType === type.value }"
        @click="switchType(type.value)"
      >{{ t(type.labelKey) }}</button>
    </view>

    <view v-if="loading" class="evidence-status">{{ t("common.loading") }}</view>
    <view v-else-if="errorMsg" class="evidence-status" :class="{ 'evidence-status--danger': forbidden }">
      {{ errorMsg }}
    </view>
    <view v-else-if="items.length === 0" class="evidence-status">{{ t("common.noData") }}</view>

    <ul v-else class="evidence-list">
      <li v-for="item in items" :key="item.id" class="evidence-item">
        <text class="evidence-item-content">{{ itemPreview(item) }}</text>
        <text class="evidence-item-path text-mono">{{ item.ownerCirclePath }}</text>
      </li>
    </ul>

    <view v-if="!loading && total > PAGE_SIZE" class="evidence-pager">
      <button
        type="button"
        class="link-button"
        :disabled="page <= 1"
        @click="changePage(-1)"
      >{{ t("common.prevPage") }}</button>
      <text class="evidence-pager-info">{{ page }} / {{ Math.ceil(total / PAGE_SIZE) }}</text>
      <button
        type="button"
        class="link-button"
        :disabled="page >= Math.ceil(total / PAGE_SIZE)"
        @click="changePage(1)"
      >{{ t("common.nextPage") }}</button>
    </view>
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

.evidence-panel {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-md);
}

.evidence-title {
  font-size: var(--admin-font-md);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

/* 四分类 chip：浅绿底 + 绿字（选中 = 深绿底白字描边） */
.evidence-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--admin-space-sm);
}

.evidence-chip {
  height: 30px;
  padding: 0 var(--admin-space-md);
  border: 1px solid transparent;
  border-radius: var(--admin-radius-md);
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
  font-size: var(--admin-font-md);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.evidence-chip:hover {
  background: var(--admin-color-success-softer);
}

.evidence-chip--active {
  background: var(--admin-color-success);
  color: var(--admin-color-on-primary);
}

.evidence-status {
  padding: var(--admin-space-md);
  border-radius: var(--admin-radius-md);
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-tertiary);
  font-size: var(--admin-font-md);
}

.evidence-status--danger {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.evidence-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-sm);
  max-height: 260px;
  overflow-y: auto;
}

.evidence-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--admin-space-sm) var(--admin-space-md);
  background: var(--admin-color-bg-subtle);
  border-radius: var(--admin-radius-md);
}

.evidence-item-content {
  font-size: var(--admin-font-md);
  line-height: 20px;
  color: var(--admin-color-text-primary);
  word-break: break-all;
}

.evidence-item-path {
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-tertiary);
}

.evidence-pager {
  display: flex;
  align-items: center;
  gap: var(--admin-space-sm);
}

.evidence-pager-info {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-tertiary);
}
</style>
