<script setup lang="ts">
/**
 * Admin 悄悄话管理（v3.1）：列表 / 查看 / 删除。
 */
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { listWhispers, deleteWhisper, type AdminWhisperView } from "@/api/whisper";
import { ApiError } from "@/api/http";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import ErrorState from "@/components/ErrorState.vue";
import { formatDateTime } from "@/utils/format";

const { t } = useI18n();

const items = ref<AdminWhisperView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref("");
const detailVisible = ref(false);
const detailItem = ref<AdminWhisperView | null>(null);
const confirmVisible = ref(false);
const deleteTarget = ref<AdminWhisperView | null>(null);

async function fetchList() {
  loading.value = true;
  error.value = "";
  try {
    const result = await listWhispers(page.value, pageSize.value);
    items.value = result?.items ?? [];
    total.value = result?.total ?? 0;
  } catch (err: unknown) {
    error.value = err instanceof ApiError ? err.message : t("whispers.loadFailed");
  } finally {
    loading.value = false;
  }
}

function view(item: AdminWhisperView) {
  detailItem.value = item;
  detailVisible.value = true;
}

function askDelete(item: AdminWhisperView) {
  deleteTarget.value = item;
  confirmVisible.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await deleteWhisper(deleteTarget.value.id);
    confirmVisible.value = false;
    deleteTarget.value = null;
    await fetchList();
  } catch {
    // 删除失败保持弹窗，提示
  }
}

onMounted(fetchList);
</script>

<template>
  <div class="whispers">
    <div class="page-header">
      <h2>{{ t('whispers.title') }}</h2>
      <span class="page-header__sub">{{ t('whispers.subtitle') }}</span>
    </div>

    <ErrorState v-if="error" :message="error" @retry="fetchList" />
    <div v-else class="panel">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{{ t('whispers.sender') }}</th>
            <th>{{ t('whispers.receiver') }}</th>
            <th>{{ t('whispers.content') }}</th>
            <th>{{ t('whispers.status') }}</th>
            <th>{{ t('whispers.createdAt') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.senderId }}</td>
            <td>{{ item.receiverId }}</td>
            <td class="cell-content">{{ item.content }}</td>
            <td><span class="tag">{{ item.status }}</span></td>
            <td>{{ formatDateTime(item.createdAt) }}</td>
            <td>
              <button class="btn btn--sm" @click="view(item)">{{ t('common.view') }}</button>
              <button class="btn btn--sm btn--danger" @click="askDelete(item)">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!loading && items.length === 0" class="empty">{{ t('common.empty') }}</div>
      <div class="pager">
        <button class="btn btn--sm" :disabled="page <= 1" @click="page--; fetchList()">‹</button>
        <span>{{ page }} / {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
        <button class="btn btn--sm" :disabled="page * pageSize >= total" @click="page++; fetchList()">›</button>
      </div>
    </div>

    <ConfirmDialog
      v-if="detailVisible"
      :title="t('whispers.detailTitle')"
      :visible="detailVisible"
      @confirm="detailVisible = false"
      @cancel="detailVisible = false"
    >
      <div v-if="detailItem" class="detail">
        <p>ID: {{ detailItem.id }}</p>
        <p>{{ t('whispers.sender') }}: {{ detailItem.senderId }} · {{ t('whispers.receiver') }}: {{ detailItem.receiverId }}</p>
        <p>{{ t('whispers.content') }}: {{ detailItem.content }}</p>
        <p>{{ t('whispers.status') }}: {{ detailItem.status }} · {{ t('whispers.priceCents') }}: {{ detailItem.priceCents }}</p>
        <p>{{ t('whispers.createdAt') }}: {{ formatDateTime(detailItem.createdAt) }}</p>
      </div>
    </ConfirmDialog>

    <ConfirmDialog
      :title="t('whispers.deleteTitle')"
      :visible="confirmVisible"
      @confirm="confirmDelete"
      @cancel="confirmVisible = false"
    />
  </div>
</template>

<style scoped>
.whispers { padding: 24px; }
.page-header { margin-bottom: 16px; }
.page-header h2 { margin: 0; }
.page-header__sub { color: #8A9694; font-size: 13px; }
.panel { background: #fff; border-radius: 12px; padding: 16px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #E8EEEE; font-size: 13px; }
.cell-content { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag { background: #EEF3FF; color: #4D79D8; border-radius: 999px; padding: 2px 10px; font-size: 12px; }
.btn { border: 1px solid #DCE5E2; background: #fff; border-radius: 8px; padding: 4px 12px; margin-right: 6px; cursor: pointer; }
.btn--danger { color: #E94D87; }
.btn--sm { font-size: 12px; }
.empty { color: #8A9694; padding: 32px; text-align: center; }
.pager { display: flex; align-items: center; gap: 12px; margin-top: 12px; justify-content: flex-end; }
.detail p { margin: 6px 0; }
</style>
