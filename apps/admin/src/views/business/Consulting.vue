<script setup lang="ts">
/**
 * 咨询课程内容管理：编辑正文/讲师/排序/上下架。
 * 支付未就绪，价格与报名默认隐藏；发布后可在小程序咨询页看到正文。
 */
import { onMounted, ref } from "vue";
import {
  listConsultingCourses,
  createConsultingCourse,
  updateConsultingCourse,
  publishConsultingCourse,
  offlineConsultingCourse,
  type AdminConsultingCourse,
  type ConsultingCourseForm,
} from "@/api/consulting";
import { ApiError } from "@/api/http";
import ErrorState from "@/components/ErrorState.vue";
import { useSessionStore } from "@/stores/session";
import { useI18n } from "vue-i18n";

const sessionStore = useSessionStore();
const { t } = useI18n();

const courses = ref<AdminConsultingCourse[]>([]);
const loading = ref(false);
const error = ref("");
const success = ref("");
const savingId = ref<number | null>(null);
let successTimer: ReturnType<typeof setTimeout> | null = null;

const blankForm = (): ConsultingCourseForm => ({
  title: "",
  description: "",
  content: "",
  price: 0,
  coverUrl: "",
  category: "communication",
  lecturer: "",
  sortOrder: 0,
  priceVisible: false,
  signupEnabled: false,
});
const newCourse = ref<ConsultingCourseForm>(blankForm());
const creating = ref(false);

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
    courses.value = await listConsultingCourses();
  } catch (err: unknown) {
    error.value = errorMessage(err, t("consulting.loadFailed"));
    courses.value = [];
  } finally {
    loading.value = false;
  }
}

function toForm(course: AdminConsultingCourse): ConsultingCourseForm {
  return {
    title: course.title,
    description: course.description ?? "",
    content: course.content ?? "",
    price: Number(course.price ?? 0),
    coverUrl: course.coverUrl ?? "",
    category: course.category,
    lecturer: course.lecturer ?? "",
    sortOrder: course.sortOrder,
    priceVisible: course.priceVisible,
    signupEnabled: course.signupEnabled,
  };
}

async function save(course: AdminConsultingCourse) {
  if (!sessionStore.canSuperAdminWrite) return;
  savingId.value = course.id;
  error.value = "";
  try {
    await updateConsultingCourse(course.id, toForm(course));
    flash(t("consulting.saved"));
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, t("consulting.saveFailed"));
  } finally {
    savingId.value = null;
  }
}

async function publish(course: AdminConsultingCourse) {
  if (!sessionStore.canSuperAdminWrite) return;
  savingId.value = course.id;
  error.value = "";
  try {
    await publishConsultingCourse(course.id);
    flash(t("consulting.statusPublished"));
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, t("consulting.publishFailed"));
  } finally {
    savingId.value = null;
  }
}

async function offline(course: AdminConsultingCourse) {
  if (!sessionStore.canSuperAdminWrite) return;
  savingId.value = course.id;
  error.value = "";
  try {
    await offlineConsultingCourse(course.id);
    flash(t("consulting.offlined"));
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, t("consulting.offlineFailed"));
  } finally {
    savingId.value = null;
  }
}

async function create() {
  if (!sessionStore.canSuperAdminWrite) return;
  if (creating.value) return;
  creating.value = true;
  error.value = "";
  try {
    await createConsultingCourse(newCourse.value);
    newCourse.value = blankForm();
    flash(t("consulting.created"));
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, t("consulting.createFailed"));
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="config-page">
    <div class="page-header">
      <h1 class="page-title">{{ t("layout.navConsulting") }}</h1>
      <p class="page-subtitle">
        {{ t("consulting.subtitle") }}
      </p>
    </div>

    <ErrorState v-if="error" :message="error" @retry="load" />
    <div v-if="success" class="success-message">{{ success }}</div>
    <div v-if="loading" class="legal-hint">{{ t("consulting.loading") }}</div>

    <div v-for="course in courses" :key="course.id" class="legal-card">
      <div class="legal-card__meta">
        <strong>{{ course.title }}</strong>
        <span class="legal-status" :class="course.status === 1 ? 'legal-status--on' : ''">
          {{ course.status === 1 ? t("consulting.statusPublished") : t("consulting.statusDraft") }}
        </span>
        <span>{{ t("consulting.updatedAtPrefix") }}{{ course.updatedAt || "-" }}</span>
      </div>

      <div class="legal-field">
        <label>{{ t("consulting.titleLabel") }}</label>
        <input v-model="course.title" class="row-input" />
        <label>{{ t("consulting.categoryLabel") }}</label>
        <input v-model="course.category" class="row-input" />
        <label>{{ t("consulting.lecturerLabel") }}</label>
        <input v-model="course.lecturer" class="row-input" />
      </div>
      <div class="legal-field">
        <label>{{ t("consulting.sortOrderLabel") }}</label>
        <input v-model.number="course.sortOrder" class="row-input" type="number" />
        <label>{{ t("consulting.priceLabel") }}</label>
        <input v-model.number="course.price" class="row-input" type="number" />
        <label><input v-model="course.priceVisible" type="checkbox" /> {{ t("consulting.priceVisibleLabel") }}</label>
        <label><input v-model="course.signupEnabled" type="checkbox" /> {{ t("consulting.signupEnabledLabel") }}</label>
      </div>
      <div class="legal-field">
        <label>{{ t("consulting.descLabel") }}</label>
        <input v-model="course.description" class="row-input" />
      </div>
      <div class="legal-field legal-field--block">
        <label>{{ t("consulting.contentLabel") }}</label>
        <textarea v-model="course.content" class="legal-content" rows="10" />
      </div>

      <div class="legal-actions">
        <button type="button" class="legal-btn legal-btn--primary" :disabled="!sessionStore.canSuperAdminWrite || savingId === course.id" @click="save(course)">{{ t("common.save") }}</button>
        <button type="button" class="legal-btn" :disabled="!sessionStore.canSuperAdminWrite || savingId === course.id" @click="publish(course)">{{ t("consulting.publishAction") }}</button>
        <button type="button" class="legal-btn" :disabled="!sessionStore.canSuperAdminWrite || savingId === course.id" @click="offline(course)">{{ t("consulting.offlineAction") }}</button>
      </div>
    </div>

    <div class="legal-card">
      <div class="legal-card__meta"><strong>{{ t("consulting.createFormTitle") }}</strong></div>
      <div class="legal-field">
        <label>{{ t("consulting.titleLabel") }}</label>
        <input v-model="newCourse.title" class="row-input" />
        <label>{{ t("consulting.categoryLabel") }}</label>
        <input v-model="newCourse.category" class="row-input" />
        <label>{{ t("consulting.lecturerLabel") }}</label>
        <input v-model="newCourse.lecturer" class="row-input" />
      </div>
      <div class="legal-field">
        <label>{{ t("consulting.sortOrderLabel") }}</label>
        <input v-model.number="newCourse.sortOrder" class="row-input" type="number" />
        <label>{{ t("consulting.priceLabel") }}</label>
        <input v-model.number="newCourse.price" class="row-input" type="number" />
      </div>
      <div class="legal-field">
        <label>{{ t("consulting.descLabel") }}</label>
        <input v-model="newCourse.description" class="row-input" />
      </div>
      <div class="legal-field legal-field--block">
        <label>{{ t("consulting.contentLabel") }}</label>
        <textarea v-model="newCourse.content" class="legal-content" rows="6" />
      </div>
      <div class="legal-actions">
        <button type="button" class="legal-btn legal-btn--primary" :disabled="!sessionStore.canSuperAdminWrite || creating || !newCourse.title.trim()" @click="create">{{ t("consulting.createAction") }}</button>
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
  color: var(--admin-color-text-secondary, #6b7280);
  white-space: nowrap;
}
.legal-content {
  width: 100%;
  min-height: 180px;
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
