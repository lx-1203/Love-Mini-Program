<script setup lang="ts">
/**
 * 法律文本编辑（用户协议/隐私政策）。
 *
 * 读：ADMIN/SUPER_ADMIN/AUDITOR；写：仅 SUPER_ADMIN。
 * 内容种子沿用后端 LegalTextProvider 的 v1.0.0 文本，正式上线前须法务复核。
 */
import { onMounted, ref } from "vue";
import {
  listLegalDocuments,
  updateLegalDocument,
  publishLegalDocument,
  offlineLegalDocument,
  type AdminLegalDocument,
} from "@/api/legal";
import { ApiError } from "@/api/http";
import ErrorState from "@/components/ErrorState.vue";
import { useSessionStore } from "@/stores/session";

const sessionStore = useSessionStore();

const docs = ref<AdminLegalDocument[]>([]);
const loading = ref(false);
const error = ref("");
const success = ref("");
const savingId = ref<number | null>(null);
let successTimer: ReturnType<typeof setTimeout> | null = null;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function flash(message: string) {
  success.value = message;
  if (successTimer) clearTimeout(successTimer);
  successTimer = setTimeout(() => { success.value = ""; }, 3000);
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    docs.value = await listLegalDocuments();
  } catch (err: unknown) {
    error.value = errorMessage(err, "加载法律文本失败");
    docs.value = [];
  } finally {
    loading.value = false;
  }
}

async function save(doc: AdminLegalDocument) {
  if (!sessionStore.canSuperAdminWrite) return;
  savingId.value = doc.id;
  error.value = "";
  try {
    await updateLegalDocument(doc.id, {
      title: doc.title,
      content: doc.content,
      version: doc.version,
    });
    flash("已保存");
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, "保存失败");
  } finally {
    savingId.value = null;
  }
}

async function publish(doc: AdminLegalDocument) {
  if (!sessionStore.canSuperAdminWrite) return;
  savingId.value = doc.id;
  error.value = "";
  try {
    await publishLegalDocument(doc.id);
    flash("已发布");
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, "发布失败");
  } finally {
    savingId.value = null;
  }
}

async function offline(doc: AdminLegalDocument) {
  if (!sessionStore.canSuperAdminWrite) return;
  savingId.value = doc.id;
  error.value = "";
  try {
    await offlineLegalDocument(doc.id);
    flash("已下线");
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, "下线失败");
  } finally {
    savingId.value = null;
  }
}

function typeLabel(doc: AdminLegalDocument): string {
  return doc.docType === "user_agreement" ? "用户协议" : "隐私政策";
}

onMounted(load);
</script>

<template>
  <div class="config-page">
    <div class="page-header">
      <h1 class="page-title">法律文本</h1>
      <p class="page-subtitle">
        用户协议 / 隐私政策。当前种子为后端内嵌文本 v1.0.0，正式上线前请法务复核；
        发布会把同类型旧版本降为 draft。
      </p>
    </div>

    <ErrorState v-if="error" :message="error" @retry="load" />
    <div v-if="success" class="success-message">{{ success }}</div>
    <div v-if="loading" class="legal-hint">加载中…</div>

    <div v-for="doc in docs" :key="doc.id" class="legal-card">
      <div class="legal-card__meta">
        <strong>{{ typeLabel(doc) }}</strong>
        <span class="legal-status" :class="doc.status === 'published' ? 'legal-status--on' : ''">
          {{ doc.status === "published" ? "已发布" : "草稿" }}
        </span>
        <span>更新：{{ doc.updatedAt || "-" }}</span>
      </div>

      <div class="legal-field">
        <label>标题</label>
        <input v-model="doc.title" class="row-input" />
      </div>
      <div class="legal-field">
        <label>版本</label>
        <input v-model="doc.version" class="row-input" />
      </div>
      <div class="legal-field legal-field--block">
        <label>正文</label>
        <textarea v-model="doc.content" class="legal-content" rows="18" />
      </div>

      <div class="legal-actions">
        <button type="button" class="legal-btn legal-btn--primary" :disabled="!sessionStore.canSuperAdminWrite || savingId === doc.id" @click="save(doc)">
          保存
        </button>
        <button type="button" class="legal-btn" :disabled="!sessionStore.canSuperAdminWrite || savingId === doc.id" @click="publish(doc)">
          发布
        </button>
        <button type="button" class="legal-btn" :disabled="!sessionStore.canSuperAdminWrite || savingId === doc.id" @click="offline(doc)">
          下线
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legal-card {
  background: var(--admin-color-bg-container, #fff);
  border: 1px solid var(--admin-color-border, #e5e7eb);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.legal-card__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--admin-color-text-secondary, #6b7280);
}
.legal-status {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 12px;
}
.legal-status--on {
  background: #e8f7ef;
  color: #1a7f4b;
}
.legal-field {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.legal-field--block {
  align-items: flex-start;
}
.legal-field label {
  min-width: 48px;
  color: var(--admin-color-text-secondary, #6b7280);
}
.legal-content {
  width: 100%;
  min-height: 320px;
  padding: 10px 12px;
  border: 1px solid var(--admin-color-border, #e5e7eb);
  border-radius: 6px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
}
.legal-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.legal-btn {
  padding: 6px 14px;
  border: 1px solid var(--admin-color-border, #e5e7eb);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
.legal-btn--primary {
  background: var(--admin-color-primary, #2563eb);
  border-color: var(--admin-color-primary, #2563eb);
  color: #fff;
}
.legal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.legal-hint {
  color: var(--admin-color-text-secondary, #6b7280);
  padding: 8px 0;
}
</style>
