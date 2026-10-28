<script setup lang="ts">
/**
 * 恋爱咨询课程内容页（2026-10-28）。
 *
 * 正文/讲师来自后端 consulting_course（Admin 可编辑）；支付未就绪，不展示价格与报名入口。
 * 后台配置了 H5 URL 时仍优先 web-view。
 */
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import { contentPageUrls } from "../../../config/content-pages";
import { listConsultingCourses, type ConsultingCourseView } from "../../../services/consulting";

const { t } = useI18n();

const webUrl = ref("");
const courses = ref<ConsultingCourseView[]>([]);
const loading = ref(false);
const error = ref("");

async function loadCourses() {
  loading.value = true;
  error.value = "";
  try {
    courses.value = await listConsultingCourses();
  } catch (err) {
    error.value = t("home.consultingHint");
    courses.value = [];
  } finally {
    loading.value = false;
  }
}

onLoad(() => {
  webUrl.value = contentPageUrls.consultingUrl ?? "";
  if (!webUrl.value) {
    void loadCourses();
  }
});
</script>

<template>
  <view class="content-page">
    <web-view v-if="webUrl" :src="webUrl" class="content-webview" />

    <AppShell v-else :title="t('contentPages.consulting.title')" show-back>
      <scroll-view scroll-y class="content-scroll" :show-scrollbar="false">
        <view class="content-section">
          <text class="content-section__title">{{ t('contentPages.consulting.subtitle') }}</text>

          <text v-if="loading" class="consult-hint">{{ t('common.loading') }}</text>
          <text v-else-if="error" class="consult-hint">{{ error }}</text>

          <view v-else-if="courses.length" class="consult-list">
            <view v-for="course in courses" :key="course.id" class="consult-card">
              <text class="consult-card__title">{{ course.title }}</text>
              <text v-if="course.lecturer" class="consult-card__meta">
                {{ t('contentPages.consulting.lecturer') }}：{{ course.lecturer }}
              </text>
              <text v-if="course.description" class="consult-card__desc">{{ course.description }}</text>
              <text v-if="course.content" class="consult-card__body">{{ course.content }}</text>
              <text class="consult-card__note">{{ t('contentPages.consulting.signupClosed') }}</text>
            </view>
          </view>

          <text v-else class="consult-hint">{{ t('home.consultingHint') }}</text>
        </view>
        <view class="content-footer-space" />
      </scroll-view>
    </AppShell>
  </view>
</template>

<style scoped lang="scss">
.content-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-bg-page, #EEF7F2);
}

.content-webview {
  flex: 1;
}

.content-scroll {
  flex: 1;
  height: 0;
}

.content-section {
  padding: var(--sp-6, 24rpx) var(--page-padding, 32rpx);
}

.content-section__title {
  display: block;
  margin-bottom: var(--sp-4, 16rpx);
  font-size: var(--fs-lg, 32rpx);
  font-weight: 600;
  color: var(--c-text-primary, #1f2a24);
}

.consult-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4, 16rpx);
}

.consult-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2, 8rpx);
  padding: var(--sp-5, 20rpx);
  border-radius: var(--r-lg, 20rpx);
  background: var(--c-bg-container, #ffffff);
}

.consult-card__title {
  font-size: var(--fs-md, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary, #1f2a24);
}

.consult-card__meta,
.consult-card__desc,
.consult-card__note {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-secondary);
}

.consult-card__body {
  font-size: var(--fs-sm, 24rpx);
  line-height: 1.7;
  color: var(--c-text-primary, #1f2a24);
  white-space: pre-wrap;
}

.consult-card__note {
  color: var(--c-text-tertiary);
}

.consult-hint {
  display: block;
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-secondary);
  line-height: 1.6;
}

.content-footer-space {
  height: calc(48rpx + env(safe-area-inset-bottom));
}
</style>
