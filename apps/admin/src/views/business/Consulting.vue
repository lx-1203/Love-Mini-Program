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
    error.value = errorMessage(err, "加载咨询课程失败");
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
  savingId.value = course.id;
  error.value = "";
  try {
    await updateConsultingCourse(course.id, toForm(course));
    flash("已保存");
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, "保存失败");
  } finally {
    savingId.value = null;
  }
}

async function publish(course: AdminConsultingCourse) {
  savingId.value = course.id;
  error.value = "";
  try {
    await publishConsultingCourse(course.id);
    flash("已发布");
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, "发布失败");
  } finally {
    savingId.value = null;
  }
}

async function offline(course: AdminConsultingCourse) {
  savingId.value = course.id;
  error.value = "";
  try {
    await offlineConsultingCourse(course.id);
    flash("已下线");
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, "下线失败");
  } finally {
    savingId.value = null;
  }
}

async function create() {
  if (creating.value) return;
  creating.value = true;
  error.value = "";
  try {
    await createConsultingCourse(newCourse.value);
    newCourse.value = blankForm();
    flash("已新增（默认下架，编辑后发布）");
    await load();
  } catch (err: unknown) {
    error.value = errorMessage(err, "新增失败");
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="config-page">
    <div class="page-header">
      <h1 class="page-title">咨询课程</h1>
      <p class="page-subtitle">
        编辑课程正文/讲师/排序并上下架。支付未就绪，价格与报名默认隐藏；发布后小程序咨询页展示正文。
      </p>
    </div>

    <ErrorState v-if="error" :message="error" @retry="load" />
    <div v-if="success" class="success-message">{{ success }}</div>
    <div v-if="loading" class="legal-hint">加载中…</div>

    <div v-for="course in courses" :key="course.id" class="legal-card">
      <div class="legal-card__meta">
        <strong>{{ course.title }}</strong>
        <span class="legal-status" :class="course.status === 1 ? 'legal-status--on' : ''">
          {{ course.status === 1 ? "已发布" : "草稿" }}
        </span>
        <span>更新：{{ course.updatedAt || "-" }}</span>
      </div>

      <div class="legal-field">
        <label>标题</label>
        <input v-model="course.title" class="row-input" />
        <label>分类</label>
        <input v-model="course.category" class="row-input" />
        <label>讲师</label>
        <input v-model="course.lecturer" class="row-input" />
      </div>
      <div class="legal-field">
        <label>排序</label>
        <input v-model.number="course.sortOrder" class="row-input" type="number" />
        <label>价格</label>
        <input v-model.number="course.price" class="row-input" type="number" />
        <label><input v-model="course.priceVisible" type="checkbox" /> 展示价格</label>
        <label><input v-model="course.signupEnabled" type="checkbox" /> 开放报名</label>
      </div>
      <div class="legal-field">
        <label>简介</label>
        <input v-model="course.description" class="row-input" />
      </div>
      <div class="legal-field legal-field--block">
        <label>正文</label>
        <textarea v-model="course.content" class="legal-content" rows="10" />
      </div>

      <div class="legal-actions">
        <button type="button" class="legal-btn legal-btn--primary" :disabled="savingId === course.id" @click="save(course)">保存</button>
        <button type="button" class="legal-btn" :disabled="savingId === course.id" @click="publish(course)">发布</button>
        <button type="button" class="legal-btn" :disabled="savingId === course.id" @click="offline(course)">下线</button>
      </div>
    </div>

    <div class="legal-card">
      <div class="legal-card__meta"><strong>新增课程</strong></div>
      <div class="legal-field">
        <label>标题</label>
        <input v-model="newCourse.title" class="row-input" />
        <label>分类</label>
        <input v-model="newCourse.category" class="row-input" />
        <label>讲师</label>
        <input v-model="newCourse.lecturer" class="row-input" />
      </div>
      <div class="legal-field">
        <label>排序</label>
        <input v-model.number="newCourse.sortOrder" class="row-input" type="number" />
        <label>价格</label>
        <input v-model.number="newCourse.price" class="row-input" type="number" />
      </div>
      <div class="legal-field">
        <label>简介</label>
        <input v-model="newCourse.description" class="row-input" />
      </div>
      <div class="legal-field legal-field--block">
        <label>正文</label>
        <textarea v-model="newCourse.content" class="legal-content" rows="6" />
      </div>
      <div class="legal-actions">
        <button type="button" class="legal-btn legal-btn--primary" :disabled="creating || !newCourse.title.trim()" @click="create">新增</button>
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
