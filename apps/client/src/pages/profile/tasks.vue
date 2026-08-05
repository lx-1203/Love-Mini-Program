<script setup lang="ts">
/**
 * 任务中心页（功能入口补齐）
 *
 * 示例任务列表（本地静态数据，后续可接入后端任务系统）：
 * - 完善个人资料 +50 积分
 * - 每日签到 +5 积分
 * - 发布首条动态 +20 积分
 * - 完成校园认证 +100 积分
 *
 * 页面结构：
 * - 顶部标题 + 完成数
 * - 积分概览卡片（累计积分 + 进度条）
 * - 任务列表（已完成显示勾选态，未完成显示"去完成"）
 *
 * 交互：
 * - 点击已完成任务：toast 提示"已完成"
 * - 点击每日签到：本地立即完成并 toast 提示
 * - 点击其他未完成任务：跳转对应功能页
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { openAppPath } from "../../utils/navigation";
import { lightHaptic, successHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";

/** 任务项 */
interface TaskItem {
  id: string;
  titleKey: string;
  descKey: string;
  /** 任务奖励积分 */
  points: number;
  /** 是否已完成 */
  done: boolean;
  /** "去完成"跳转路径（签到任务无路径，点击即完成） */
  path?: string;
}

const { t } = useI18n();

/** 示例任务列表 */
const tasks = ref<TaskItem[]>([
  {
    id: "profile",
    titleKey: "profile.taskProfile",
    descKey: "profile.taskProfileDesc",
    points: 50,
    done: true,
  },
  {
    id: "checkin",
    titleKey: "profile.taskCheckin",
    descKey: "profile.taskCheckinDesc",
    points: 5,
    done: true,
  },
  {
    id: "first-post",
    titleKey: "profile.taskFirstPost",
    descKey: "profile.taskFirstPostDesc",
    points: 20,
    done: false,
    path: "/pages/village/index",
  },
  {
    id: "verify",
    titleKey: "profile.taskVerify",
    descKey: "profile.taskVerifyDesc",
    points: 100,
    done: false,
    path: "/pages/campus/certification",
  },
]);

/** 全部任务可获积分总和 */
const totalPoints = computed(() => tasks.value.reduce((sum, task) => sum + task.points, 0));
/** 已获得积分 */
const earnedPoints = computed(() =>
  tasks.value.filter((task) => task.done).reduce((sum, task) => sum + task.points, 0)
);
/** 已完成任务数 */
const doneCount = computed(() => tasks.value.filter((task) => task.done).length);
/** 完成进度百分比（0-100） */
const progressPercent = computed(() =>
  totalPoints.value > 0 ? Math.round((earnedPoints.value / totalPoints.value) * 100) : 0
);

/** 任务图标（按任务 id 映射） */
function taskIcon(taskId: string): string {
  switch (taskId) {
    case "profile":
      return IMAGE_PATHS.ICONS_COMMON.USER_SVG;
    case "checkin":
      return IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE;
    case "first-post":
      return IMAGE_PATHS.ICONS_EMOJI.HEART;
    case "verify":
      return IMAGE_PATHS.ICONS_COMMON.GRADUATION_CAP_SVG;
    default:
      return IMAGE_PATHS.ICONS_EMOJI.SPARKLES;
  }
}

/**
 * 点击任务项
 * - 已完成：toast 提示
 * - 每日签到：本地立即完成（演示态）
 * - 其他未完成：跳转对应功能页
 */
function handleTaskTap(task: TaskItem) {
  lightHaptic();
  if (task.done) {
    uni.showToast({ title: t("profile.taskDone"), icon: "none" });
    return;
  }
  if (task.id === "checkin") {
    task.done = true;
    successHaptic();
    uni.showToast({ title: t("profile.taskCheckinSuccess", { n: task.points }), icon: "success" });
    return;
  }
  if (task.path) {
    openAppPath(task.path);
  }
}
</script>

<template>
  <view class="tasks-page page-fade-in">
    <!-- 页面标题 -->
    <view class="tasks-header">
      <text class="tasks-header__title">{{ t('profile.taskCenter') }}</text>
      <text class="tasks-header__count">{{ t('profile.tasksCompletedCount', { done: doneCount, total: tasks.length }) }}</text>
    </view>

    <!-- 积分概览卡片 -->
    <view class="tasks-summary card-base">
      <view class="tasks-summary__row">
        <text class="tasks-summary__label">{{ t('profile.tasksPointsEarned', { n: earnedPoints }) }}</text>
        <text class="tasks-summary__percent">{{ progressPercent }}%</text>
      </view>
      <view class="tasks-summary__bar">
        <view class="tasks-summary__bar-fill" :style="{ width: progressPercent + '%' }" />
      </view>
    </view>

    <!-- 任务列表 -->
    <view class="tasks-list" role="list">
      <view
        v-for="task in tasks"
        :key="task.id"
        class="task-item card-base press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('profile.taskItemAria', { label: t(task.titleKey) })"
        @tap="handleTaskTap(task)"
      >
        <view class="task-item__icon">
          <SafeImage :src="taskIcon(task.id)" custom-class="task-item__icon-img" mode="aspectFit" />
        </view>
        <view class="task-item__content">
          <view class="task-item__title-row">
            <text class="task-item__title">{{ t(task.titleKey) }}</text>
            <text class="task-item__points">{{ t('profile.taskPoints', { n: task.points }) }}</text>
          </view>
          <text class="task-item__desc">{{ t(task.descKey) }}</text>
        </view>
        <!-- 状态：已完成（勾选态）/ 去完成（按钮态） -->
        <view
          class="task-item__status"
          :class="task.done ? 'task-item__status--done' : 'task-item__status--go'"
        >
          <image
            v-if="task.done"
            class="task-item__check"
            :src="IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE"
            mode="aspectFit"
            alt=""
          />
          <text class="task-item__status-text">{{ task.done ? t('profile.taskDone') : t('profile.taskGo') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.tasks-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-gradient-page);
  padding: var(--sp-6) var(--sp-8);
  padding-top: calc(env(safe-area-inset-top) + var(--sp-6));
  box-sizing: border-box;
}

/* ==================== 页面标题 ==================== */
.tasks-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--section-gap);
}

.tasks-header__title {
  font-size: var(--fs-5xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.tasks-header__count {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

/* ==================== 积分概览卡片 ==================== */
.tasks-summary {
  padding: var(--sp-6) var(--sp-8);
  margin-bottom: var(--sp-6);
}

.tasks-summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-4);
}

.tasks-summary__label {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.tasks-summary__percent {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-brand);
}

.tasks-summary__bar {
  height: 16rpx;
  border-radius: var(--r-full);
  background: var(--c-neutral-100);
  overflow: hidden;
}

.tasks-summary__bar-fill {
  height: 100%;
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  transition: width var(--d-normal, 200ms) ease;
}

/* ==================== 任务列表 ==================== */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.task-item {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-6) var(--sp-8);
}

.task-item__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-xl);
  background: var(--c-bg-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-item__icon-img {
  width: 40rpx;
  height: 40rpx;
}

.task-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.task-item__title-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.task-item__title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.task-item__points {
  font-size: var(--fs-sm);
  color: var(--c-brand);
  font-weight: 600;
}

.task-item__desc {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ==================== 任务状态 ==================== */
.task-item__status {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.task-item__status--done {
  background: var(--c-bg-brand);
}

.task-item__status--go {
  background: var(--c-brand);
}

.task-item__status--done .task-item__status-text {
  color: var(--c-brand-700);
}

.task-item__status--go .task-item__status-text {
  color: var(--c-neutral-0);
}

.task-item__check {
  width: 28rpx;
  height: 28rpx;
}

.task-item__status-text {
  font-size: var(--fs-sm);
  font-weight: 600;
}
</style>
