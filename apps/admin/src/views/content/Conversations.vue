<script setup lang="ts">
/**
 * Admin 私信会话只读视图（阶段 4b）。
 *
 * 对应后端 AdminConversationController：列表 / 详情 / 消息分页，全程只读。
 * 隐私红线：私信正文由**服务端**按角色脱敏（非 SUPER_ADMIN 返回 null），
 * 本视图仅根据每条记录的 redacted 标记展示「正文已隐藏」徽标，绝不自行还原内容。
 */
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRequestRace } from "@/composables/useRequestRace";
import {
  listConversations,
  getConversation,
  listConversationMessages,
  type AdminConversationItem,
  type AdminConversationDetail,
  type AdminMessageItem,
} from "@/api/conversations";
import { ApiError } from "@/api/http";
import Pagination from "@/components/Pagination.vue";
import ErrorState from "@/components/ErrorState.vue";
import { useSessionStore } from "@/stores/session";
import { formatDateTime } from "@/utils/format";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";

const { t } = useI18n();
const sessionStore = useSessionStore();

/** 仅用于展示提示：真实脱敏由服务端裁决，此处不控制数据可见性 */
const canSeeContent = computed<boolean>(
  () => String(sessionStore.user?.role || "").toUpperCase() === "SUPER_ADMIN",
);

// ===== 会话列表状态 =====
const conversations = ref<AdminConversationItem[]>([]);
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);
const listLoading = ref(false);
const listError = ref("");
const listRace = useRequestRace();

/** 当前页是否存在被脱敏的记录（驱动列表顶部提示徽标） */
const anyRedacted = computed<boolean>(() => conversations.value.some((c) => c.redacted));

async function fetchConversations(): Promise<void> {
  listLoading.value = true;
  listError.value = "";
  const seq = listRace.nextSeq();
  try {
    const result = await listConversations({ page: page.value, pageSize: pageSize.value });
    if (listRace.isStale(seq)) return;
    conversations.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (listRace.isStale(seq)) return;
    conversations.value = [];
    total.value = 0;
    totalPages.value = 1;
    listError.value = err instanceof ApiError ? err.message : t("conversations.loadFailed");
  } finally {
    if (!listRace.isStale(seq)) listLoading.value = false;
  }
}

function handleListPageChange(): void {
  void fetchConversations();
}

// ===== 选中会话 + 消息面板状态 =====
const selected = ref<AdminConversationDetail | null>(null);
const messages = ref<AdminMessageItem[]>([]);
const msgPage = ref(1);
const msgTotal = ref(0);
const msgTotalPages = ref(1);
const msgLoading = ref(false);
const msgError = ref("");
const msgRace = useRequestRace();

async function openConversation(item: AdminConversationItem): Promise<void> {
  msgPage.value = 1;
  messages.value = [];
  msgError.value = "";
  try {
    selected.value = await getConversation(item.id);
  } catch (err: unknown) {
    // 详情拉取失败退化为使用列表项兜底展示，仍允许查看消息元数据
    selected.value = { ...item, createdAt: null, userAMuted: false, userBMuted: false } as AdminConversationDetail;
    msgError.value = err instanceof ApiError ? err.message : t("conversations.detailLoadFailed");
  }
  await fetchMessages();
}

async function fetchMessages(): Promise<void> {
  const conv = selected.value;
  if (!conv) return;
  msgLoading.value = true;
  msgError.value = "";
  const seq = msgRace.nextSeq();
  try {
    const result = await listConversationMessages(conv.id, { page: msgPage.value, pageSize: pageSize.value });
    if (msgRace.isStale(seq)) return;
    messages.value = result.items;
    msgTotal.value = result.total;
    msgTotalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (msgRace.isStale(seq)) return;
    messages.value = [];
    msgTotal.value = 0;
    msgTotalPages.value = 1;
    msgError.value = err instanceof ApiError ? err.message : t("conversations.messagesLoadFailed");
  } finally {
    if (!msgRace.isStale(seq)) msgLoading.value = false;
  }
}

function handleMsgPageChange(): void {
  void fetchMessages();
}

function closeMessages(): void {
  selected.value = null;
  messages.value = [];
}

/** 昵称兜底（用户已注销/无资料时展示 ID） */
function displayName(nickname: string | null, userId: number): string {
  return nickname || t("conversations.userFallback", { id: userId });
}

/** 消息类型文案 */
function kindLabel(kind: string | null): string {
  switch (kind) {
    case "text":
      return t("conversations.kindText");
    case "image":
      return t("conversations.kindImage");
    case "voice":
      return t("conversations.kindVoice");
    case "quote":
      return t("conversations.kindQuote");
    default:
      return kind || "—";
  }
}

/** 消息状态文案（撤回优先，其次已读/未读） */
function statusLabel(m: AdminMessageItem): string {
  if (m.recalled) return t("conversations.statusRecalled");
  if (m.isRead) return t("conversations.statusRead");
  return t("conversations.statusUnread");
}

onMounted(() => {
  void fetchConversations();
});
</script>

<template>
  <div class="conversations">
    <div class="page-header">
      <h2>{{ t("conversations.title") }}</h2>
      <span class="page-header__sub">{{ t("conversations.subtitle") }}</span>
    </div>

    <div v-if="!canSeeContent" class="privacy-notice">
      {{ t("conversations.redactedNotice") }}
    </div>

    <ErrorState v-if="listError" :message="listError" @retry="fetchConversations" />

    <div v-show="!listError" class="panel">
      <div v-if="anyRedacted" class="panel__hint">{{ t("conversations.redacted") }}</div>
      <table class="table">
        <thead>
          <tr>
            <th>{{ t("conversations.colId") }}</th>
            <th>{{ t("conversations.colParticipantA") }}</th>
            <th>{{ t("conversations.colParticipantB") }}</th>
            <th>{{ t("conversations.colLastMessage") }}</th>
            <th>{{ t("conversations.colMessageCount") }}</th>
            <th>{{ t("conversations.colLastTime") }}</th>
            <th>{{ t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="listLoading">
            <td colspan="7" class="empty">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="conversations.length === 0">
            <td colspan="7" class="empty">{{ t("common.noData") }}</td>
          </tr>
          <tr
            v-for="item in conversations"
            :key="item.id"
            class="row"
            :class="{ 'row--active': selected && selected.id === item.id }"
            @click="openConversation(item)"
          >
            <td>{{ item.id }}</td>
            <td>{{ displayName(item.userANickname, item.userAId) }}</td>
            <td>{{ displayName(item.userBNickname, item.userBId) }}</td>
            <td class="cell-content">
              <span v-if="item.redacted" class="tag tag--redacted">{{ t("conversations.redacted") }}</span>
              <template v-else>{{ item.lastMessagePreview || t("conversations.previewEmpty") }}</template>
              <span v-if="item.pinned" class="pin-tag">{{ t("conversations.pinnedTag") }}</span>
            </td>
            <td>{{ item.messageCount }}</td>
            <td class="time-cell">{{ formatDateTime(item.lastMessageAt) }}</td>
            <td>
              <button class="btn btn--sm" @click.stop="openConversation(item)">
                {{ t("conversations.actionViewMessages") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <Pagination
        v-model:page="page"
        :total-pages="totalPages"
        :total="total"
        :page-size="pageSize"
        :disabled="listLoading"
        @change="handleListPageChange"
      />
    </div>

    <div v-if="selected" class="panel messages-panel">
      <div class="messages-head">
        <div class="messages-title">
          <h3>{{ t("conversations.messagesTitle", { id: selected.id }) }}</h3>
          <p class="meta">
            <span>{{ displayName(selected.userANickname, selected.userAId) }}</span>
            <span class="meta-sep">·</span>
            <span>{{ displayName(selected.userBNickname, selected.userBId) }}</span>
            <span class="meta-sep">·</span>
            <span>{{ t("conversations.messageCountLabel", { n: selected.messageCount }) }}</span>
            <span v-if="selected.redacted" class="tag tag--redacted">{{ t("conversations.redacted") }}</span>
          </p>
        </div>
        <button class="btn" @click="closeMessages">{{ t("conversations.close") }}</button>
      </div>

      <ErrorState v-if="msgError" :message="msgError" @retry="fetchMessages" />

      <table class="table">
        <thead>
          <tr>
            <th>{{ t("conversations.colSender") }}</th>
            <th>{{ t("conversations.colKind") }}</th>
            <th>{{ t("conversations.colContent") }}</th>
            <th>{{ t("conversations.colStatus") }}</th>
            <th>{{ t("conversations.colTime") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="msgLoading">
            <td colspan="5" class="empty">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="messages.length === 0">
            <td colspan="5" class="empty">{{ t("common.noData") }}</td>
          </tr>
          <tr v-for="m in messages" :key="m.id">
            <td>{{ displayName(m.senderNickname, m.senderId) }}</td>
            <td><span class="tag">{{ kindLabel(m.messageKind) }}</span></td>
            <td class="cell-content">
              <span v-if="m.redacted" class="tag tag--redacted">{{ t("conversations.redacted") }}</span>
              <template v-else>{{ m.content || t("conversations.previewEmpty") }}</template>
            </td>
            <td>{{ statusLabel(m) }}</td>
            <td class="time-cell">{{ formatDateTime(m.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
      <Pagination
        v-model:page="msgPage"
        :total-pages="msgTotalPages"
        :total="msgTotal"
        :page-size="pageSize"
        :disabled="msgLoading"
        @change="handleMsgPageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.conversations { padding: 24px; }
.page-header { margin-bottom: 16px; }
.page-header h2 { margin: 0; }
.page-header__sub { color: #8A9694; font-size: 13px; }
.privacy-notice {
  background: #FFF6E9;
  border: 1px solid #F5D9A8;
  color: #9A6B15;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 16px;
}
.panel { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.panel__hint { color: #9A6B15; font-size: 12px; margin-bottom: 8px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #E8EEEE; font-size: 13px; }
.row { cursor: pointer; }
.row:hover { background: #F7FAF9; }
.row--active { background: #EEF3FF; }
.cell-content { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.time-cell { color: #8A9694; white-space: nowrap; }
.tag { background: #EEF3FF; color: #4D79D8; border-radius: 999px; padding: 2px 10px; font-size: 12px; }
.tag--redacted { background: #F0F0F2; color: #8A9694; }
.pin-tag { margin-left: 6px; background: #FDF1F5; color: #E94D87; border-radius: 999px; padding: 1px 8px; font-size: 12px; }
.btn { border: 1px solid #DCE5E2; background: #fff; border-radius: 8px; padding: 4px 12px; cursor: pointer; }
.btn--sm { font-size: 12px; }
.empty { color: #8A9694; padding: 24px; text-align: center; }
.messages-panel { border: 1px solid #E8EEEE; }
.messages-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.messages-title h3 { margin: 0 0 4px; font-size: 15px; }
.meta { margin: 0; color: #8A9694; font-size: 12px; }
.meta-sep { margin: 0 6px; }
</style>
