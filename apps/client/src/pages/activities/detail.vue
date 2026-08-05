<script setup lang="ts">
/**
 * 活动详情页（任务 E2）
 *
 * 通过 onLoad 读取 options.id：
 * 1. 优先从 activity store 中按 id 匹配真实/模拟活动数据；
 * 2. 未匹配时回退到内置示例活动（新人礼遇 / 周末派对 / 七夕交友会，i18n activities.sample.*）；
 * 3. 报名按钮点击后 toast 提示"报名成功，请留意通知"（真实报名链路由活动列表页/后端负责）。
 */
import { ref, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";
import { useActivityStore, type ActivityItem } from "../../stores/activity";
import { openAppPath } from "../../utils/navigation";

const { t } = useI18n();

/** 详情页图标 */
const icons = {
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
  schedule: IMAGE_PATHS.ICONS_COMMON.SCHEDULE_SVG,
  back: IMAGE_PATHS.ICONS_COMMON.BACK,
} as const;

const activityStore = useActivityStore();

/** 从 URL 传入的活动 id */
const activityId = ref("");

/** 当前展示的活动（store 匹配或示例数据） */
const activity = ref<ActivityItem | null>(null);

/** 是否使用内置示例内容（store 未匹配到） */
const isSample = ref(false);

/**
 * 内置示例活动（新人礼遇 / 周末派对 / 七夕交友会）。
 * 文案全部来自 i18n activities.sample.*，封面复用 IMAGE_PATHS 占位图。
 */
function buildSampleActivities(): ActivityItem[] {
  return [
    {
      id: "sample-new-user-gift",
      title: t("activities.sample.newUserGift.title"),
      location: t("activities.sample.newUserGift.location"),
      scheduleText: t("activities.sample.newUserGift.time"),
      date: "",
      enrollCount: 0,
      description: t("activities.sample.newUserGift.desc"),
      isEnrolled: false,
      status: "open",
      coverImage: IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
    },
    {
      id: "sample-weekend-party",
      title: t("activities.sample.weekendParty.title"),
      location: t("activities.sample.weekendParty.location"),
      scheduleText: t("activities.sample.weekendParty.time"),
      date: "",
      enrollCount: 0,
      description: t("activities.sample.weekendParty.desc"),
      isEnrolled: false,
      status: "open",
      coverImage: IMAGE_PATHS.ACTIVITIES.ACTIVITY_2,
    },
    {
      id: "sample-qixi-meetup",
      title: t("activities.sample.qixiMeetup.title"),
      location: t("activities.sample.qixiMeetup.location"),
      scheduleText: t("activities.sample.qixiMeetup.time"),
      date: "",
      enrollCount: 0,
      description: t("activities.sample.qixiMeetup.desc"),
      isEnrolled: false,
      status: "open",
      coverImage: IMAGE_PATHS.ACTIVITIES.ACTIVITY_3,
    },
  ];
}

/** 从 store 中按 id 匹配活动 */
function findFromStore(id: string): ActivityItem | null {
  return activityStore.activities.find((a) => a.id === id) ?? null;
}

/** 解析并展示活动内容 */
function resolveActivity(id: string): void {
  const fromStore = findFromStore(id);
  if (fromStore) {
    activity.value = fromStore;
    isSample.value = false;
    return;
  }
  // store 未匹配：回退到示例活动（id 精确匹配示例；任意未知 id 展示第一个示例）
  const samples = buildSampleActivities();
  const matched = samples.find((s) => s.id === id) ?? samples[0];
  if (matched) {
    activity.value = matched;
    isSample.value = true;
  }
}

onLoad((options) => {
  const id = options?.id ?? "";
  activityId.value = id;
  if (activityStore.activities.length > 0) {
    resolveActivity(id);
    return;
  }
  // store 尚无数据：拉取一次后再解析（失败时仍可回退示例内容）
  void activityStore.fetchActivities().then(() => resolveActivity(id));
});

onMounted(() => {
  // 兜底：若 onLoad 的异步拉取未完成，页面挂载后再尝试解析一次
  if (!activity.value && activityId.value) {
    resolveActivity(activityId.value);
  }
});

/** 封面图：示例活动使用占位图，store 活动使用其 coverImage */
const coverImage = computed<string>(() => {
  return activity.value?.coverImage || IMAGE_PATHS.ACTIVITIES.ACTIVITY_1;
});

/** 活动状态文案 */
const statusText = computed(() => {
  if (!activity.value) return "";
  if (activity.value.status === "open") return t("activities.statusOpen");
  if (activity.value.status === "ongoing") return t("activities.statusOngoing");
  return t("activities.statusUpcoming");
});

/** 报名：toast 提示（真实报名链路由后端负责；收尾轮补本地报名/退出闭环） */
const isSignedUp = ref(false);
function handleSignup() {
  lightHaptic();
  isSignedUp.value = true;
  uni.showToast({ title: t("activities.signupSuccess"), icon: "none", duration: 2000 });
}

/** 退出报名（收尾轮：已报名态可退出，恢复报名按钮） */
function handleQuitSignup() {
  lightHaptic();
  isSignedUp.value = false;
  uni.showToast({ title: t("activities.quitSignupSuccess"), icon: "none", duration: 2000 });
}

/** 返回上一页 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    openAppPath("/subpackages/discover/activities/index");
  }
}
</script>

<template>
  <view class="detail-page page-fade-in">
    <!-- 顶部栏 -->
    <view class="detail-header">
      <view class="detail-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <image class="detail-header__back-icon" :src="icons.back" mode="aspectFit" alt="" />
      </view>
      <text class="detail-header__title">{{ t('activities.detailNavTitle') }}</text>
      <view class="detail-header__spacer" />
    </view>

    <scroll-view v-if="activity" scroll-y class="detail-scroll" :show-scrollbar="false">
      <!-- 封面图 -->
      <view class="detail-cover">
        <image class="detail-cover__img" :src="coverImage" mode="aspectFill" lazy-load alt="" />
        <view v-if="isSample" class="detail-cover__badge">
          <text class="detail-cover__badge-text">{{ t('activities.sampleBadge') }}</text>
        </view>
      </view>

      <!-- 标题 + 状态 -->
      <view class="detail-section">
        <view class="detail-title-row">
          <text class="detail-title">{{ activity.title }}</text>
          <view class="detail-status">
            <text class="detail-status__text">{{ statusText }}</text>
          </view>
        </view>

        <!-- 时间 / 地点 -->
        <view class="detail-meta">
          <view class="detail-meta__item">
            <image class="detail-meta__icon" :src="icons.schedule" mode="aspectFit" lazy-load="true" alt="" />
            <text class="detail-meta__label">{{ t('activities.timeLabel') }}</text>
            <text class="detail-meta__value">{{ activity.scheduleText }}</text>
          </view>
          <view class="detail-meta__item">
            <image class="detail-meta__icon" :src="icons.location" mode="aspectFit" lazy-load="true" alt="" />
            <text class="detail-meta__label">{{ t('activities.locationLabel') }}</text>
            <text class="detail-meta__value">{{ activity.location }}</text>
          </view>
        </view>
      </view>

      <!-- 活动介绍 -->
      <view class="detail-section">
        <text class="detail-section__title">{{ t('activities.introLabel') }}</text>
        <text class="detail-intro">{{ activity.description || t('activities.introEmpty') }}</text>
      </view>

      <!-- 底部留白（避免遮挡报名按钮） -->
      <view class="detail-footer-space" />
    </scroll-view>

    <!-- 加载/兜底状态 -->
    <view v-else class="detail-loading">
      <text class="detail-loading__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 底部报名/退出栏（收尾轮：已报名可退出） -->
    <view v-if="activity" class="detail-action-bar">
      <view
        v-if="!isSignedUp"
        class="detail-signup-btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('activities.signupNow')"
        @tap="handleSignup"
      >
        <text class="detail-signup-btn__text">{{ t('activities.signupNow') }}</text>
      </view>
      <view
        v-else
        class="detail-quit-btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('activities.quitSignup')"
        @tap="handleQuitSignup"
      >
        <text class="detail-quit-btn__text">{{ t('activities.quitSignup') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-bg-page, #f4f6fa);
}

/* ========== 顶部栏 ========== */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--sp-4) + env(safe-area-inset-top)) var(--sp-4) var(--sp-3);
  background: linear-gradient(135deg, var(--c-brand-500, #3fcf8e) 0%, var(--c-brand-400, #6fe0b0) 100%);
}

.detail-header__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.2));
}

.detail-header__back-icon {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-inverse, #ffffff);
}

.detail-header__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.detail-header__spacer {
  width: 64rpx;
}

/* ========== 内容区 ========== */
.detail-scroll {
  flex: 1;
  height: 0;
}

.detail-cover {
  position: relative;
  width: 100%;
  height: 360rpx;
  background: linear-gradient(135deg, var(--c-brand-200), var(--c-brand-300));
}

.detail-cover__img {
  width: 100%;
  height: 100%;
}

.detail-cover__badge {
  position: absolute;
  top: var(--sp-4);
  left: var(--sp-4);
  background: var(--c-overlay-bg-pure, rgba(15, 23, 42, 0.55));
  padding: 6rpx var(--sp-3);
  border-radius: var(--r-full);
}

.detail-cover__badge-text {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-inverse, #ffffff);
  font-weight: 500;
}

.detail-section {
  margin: var(--sp-5) var(--sp-4);
  padding: var(--sp-5);
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.detail-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
}

.detail-title {
  flex: 1;
  font-size: var(--fs-2xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  line-height: 1.35;
}

.detail-status {
  flex-shrink: 0;
  background: var(--c-bg-brand, #e8f8f0);
  padding: 6rpx var(--sp-3);
  border-radius: var(--r-full);
}

.detail-status__text {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-brand-700);
  font-weight: 600;
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-5);
  padding-top: var(--sp-4);
  border-top: 1rpx solid var(--c-border-light, #eef0f4);
}

.detail-meta__item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.detail-meta__icon {
  width: 30rpx;
  height: 30rpx;
  color: var(--c-brand-500);
  flex-shrink: 0;
}

.detail-meta__label {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #9aa1ab);
  flex-shrink: 0;
}

.detail-meta__value {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-primary, #1f2937);
  font-weight: 500;
}

.detail-section__title {
  display: block;
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  margin-bottom: var(--sp-3);
}

.detail-intro {
  display: block;
  font-size: var(--fs-base, 26rpx);
  color: var(--c-text-secondary, #5b6470);
  line-height: 1.7;
}

.detail-footer-space {
  height: calc(140rpx + env(safe-area-inset-bottom));
}

/* ========== 加载态 ========== */
.detail-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-loading__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #9aa1ab);
}

/* ========== 底部报名栏 ========== */
.detail-action-bar {
  padding: var(--sp-4) var(--sp-4) calc(env(safe-area-inset-bottom) + var(--sp-4));
  background: var(--c-bg-container, #ffffff);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.detail-signup-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-brand, linear-gradient(135deg, #3fcf8e, #6fe0b0));
}

/* 收尾轮：退出报名按钮（次级样式，避免与报名主按钮混淆） */
.detail-quit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-surface, #F1F5F9);
  border: 1rpx solid var(--c-border-strong, #CBD5E1);
}

.detail-quit-btn__text {
  font-size: var(--fs-lg, 32rpx);
  font-weight: 600;
  color: var(--c-text-tertiary, #64748B);
}

.detail-signup-btn__text {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 600;
  color: var(--c-text-inverse, #ffffff);
}
</style>
