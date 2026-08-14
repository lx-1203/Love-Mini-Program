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
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { openAppPath } from "../../utils/navigation";
import { lightHaptic, successHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
// R4-00058: 签到任务接入真实 GET/POST /check-in 链路
import { clientApi } from "../../services/api";
// R4-00059: 资料完善任务完成态从真实 session 派生，不再硬编码 done=true
import { useSessionStore } from "../../stores/session";
// 3-J 任务与积分 real 链路：GET /tasks + POST /tasks/{code}/claim（mock 保留本地演示逻辑）
import { useMock } from "../../stores/helpers/use-mock";
import { request } from "../../services/http";

/** 任务项 */
interface TaskItem {
  id: string;
  titleKey: string;
  descKey: string;
  /** 任务奖励积分 */
  points: number;
  /** 是否已完成 */
  done: boolean;
  /** real 模式：任务展示标题（后端文案；mock 走 titleKey） */
  title?: string;
  /** real 模式：任务展示描述（后端文案；mock 走 descKey） */
  desc?: string;
  /** real 模式：是否可领取奖励 */
  claimable?: boolean;
  /** real 模式：是否已领取奖励 */
  claimed?: boolean;
  /** "去完成"跳转路径（签到任务无路径，点击即完成） */
  path?: string;
}

/**
 * 后端任务视图（GET /tasks 响应项，3-J）。
 * code 对齐后端 seed：daily-checkin / complete-profile / first-post / campus-verify。
 */
interface TaskView {
  code: string;
  name: string;
  description: string;
  rewardPoints: number;
  progressCurrent: number;
  progressTarget: number;
  claimed: boolean;
  claimable: boolean;
}

/** 后端领取结果视图（POST /tasks/{code}/claim 响应载荷） */
interface ClaimResultView {
  taskCode: string;
  rewardPoints: number;
  balanceAfter: number;
}

/** 任务编码 → "去完成"跳转路径（real 模式未完成任务的引导入口） */
function taskPathForCode(code: string): string | undefined {
  switch (code) {
    case "first-post":
      return "/pages/village/index";
    case "campus-verify":
      return "/pages/campus/certification";
    default:
      // daily-checkin / complete-profile 无独立入口（页面内完成/资料编辑入口在 profile 页）
      return undefined;
  }
}

const { t } = useI18n();
const sessionStore = useSessionStore();

/**
 * R4-00059：任务完成态真实化（不再硬编码 done）。
 * - profile：从 session.profileCompleted 派生（资料是否完善）；
 * - checkin：从真实签到状态派生（onShow 拉取 GET /check-in，见下方同步逻辑）；
 * - first-post / verify：暂无完成度数据源，保持未完成（后端任务系统接入后替换）。
 */
/** 签到任务完成态（onShow 从真实状态同步） */
const checkinDone = ref(false);

/** 资料完善任务完成态（session 驱动，实时派生） */
const profileTaskDone = computed(() => sessionStore.isProfileComplete);

/** 本地任务列表（mock 模式；完成态随真实签到/session 数据变化，进度条同步更新） */
const localTasks = computed<TaskItem[]>(() => [
  {
    id: "profile",
    titleKey: "profile.taskProfile",
    descKey: "profile.taskProfileDesc",
    points: 50,
    done: profileTaskDone.value,
  },
  {
    id: "checkin",
    titleKey: "profile.taskCheckin",
    descKey: "profile.taskCheckinDesc",
    points: 5,
    done: checkinDone.value,
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

/**
 * real 模式任务列表（GET /tasks 数据，null 表示未加载/不可用，回退本地列表）。
 */
const realTasks = ref<TaskItem[] | null>(null);

/** 正在领取的任务 code（防重复点击） */
const claimingCode = ref<string | null>(null);

/**
 * 将后端任务视图映射为页面任务项（标题/描述直接用后端文案）。
 * done = 已领取 或 完成度达标；claimable 时展示「领取」按钮。
 */
function toRealTask(view: TaskView): TaskItem {
  const completed = view.claimed || view.progressCurrent >= view.progressTarget;
  return {
    id: view.code,
    titleKey: "",
    descKey: "",
    title: view.name,
    desc: view.description,
    points: view.rewardPoints,
    done: completed,
    claimable: view.claimable,
    claimed: view.claimed,
    // 未完成且不可领取 → 引导跳转对应功能页
    path: !completed && !view.claimable ? taskPathForCode(view.code) : undefined,
  };
}

/**
 * real 模式拉取任务列表（3-J）。
 */
async function loadRealTasks(): Promise<void> {
  try {
    const list = await request<TaskView[]>({ url: "/tasks", method: "GET" });
    realTasks.value = (list ?? []).map(toRealTask);
  } catch (_e) {
    // 拉取失败保留当前列表（不阻塞页面展示）
  }
}

/** 任务列表（real 模式优先后端数据；mock 模式使用本地列表） */
const tasks = computed<TaskItem[]>(() => realTasks.value ?? localTasks.value);

/** 任务是否已领取（real 有 claimed 字段；mock 退化为 done） */
function isTaskClaimed(task: TaskItem): boolean {
  return task.claimed !== undefined ? task.claimed : task.done;
}

/** 任务状态文案（可领取 → 领取；已领取/已完成 → 已完成；否则 → 去完成） */
function taskStatusText(task: TaskItem): string {
  if (task.claimable) return t("profile.taskClaim");
  return isTaskClaimed(task) ? t("profile.taskDone") : t("profile.taskGo");
}

/** 全部任务可获积分总和 */
const totalPoints = computed(() => tasks.value.reduce((sum, task) => sum + task.points, 0));
/** 已获得积分（real 按 claimed 计；mock 按 done 计） */
const earnedPoints = computed(() =>
  tasks.value.filter((task) => isTaskClaimed(task)).reduce((sum, task) => sum + task.points, 0)
);
/** 已完成/已领取任务数 */
const doneCount = computed(() => tasks.value.filter((task) => isTaskClaimed(task)).length);

/**
 * 返回上一页（自定义导航栏返回键，navigationStyle: custom 无系统返回栏）。
 * 无上一页时（如从 reLaunch/直达进入）回退到首页 tab。
 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: "/pages/home/index" });
  }
}
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
 * - mock：已完成 toast；每日签到走真实 /check-in；其他未完成跳转对应功能页（现有行为）
 * - real（3-J）：可领取 → 领取奖励；已完成/已领取 → toast；否则 → 跳转对应功能页
 */
async function handleTaskTap(task: TaskItem) {
  lightHaptic();

  // mock 分支：保留现有本地演示逻辑
  if (useMock()) {
    if (task.done) {
      uni.showToast({ title: t("profile.taskDone"), icon: "none" });
      return;
    }
    if (task.id === "checkin") {
      try {
        // R4-00058 修复：不再本地置 done 假完成，调用真实 GET 状态 + POST /check-in
        const result = await clientApi.checkIn();
        task.done = true;
        successHaptic();
        // 后端返回连续天数时优先展示真实数据（回退任务配置积分）
        const days = result?.consecutiveDays ?? task.points;
        uni.showToast({ title: t("profile.taskCheckinSuccess", { n: days }), icon: "success" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        uni.showToast({ title: message, icon: "none" });
      }
      return;
    }
    if (task.path) {
      openAppPath(task.path);
    }
    return;
  }

  // real 分支（3-J）
  if (task.claimable) {
    await claimTask(task);
    return;
  }
  if (isTaskClaimed(task) || task.done) {
    uni.showToast({ title: t("profile.taskDone"), icon: "none" });
    return;
  }
  if (task.path) {
    openAppPath(task.path);
  }
}

/**
 * 领取任务奖励（3-J）：POST /tasks/{code}/claim。
 * 成功后 toast + 刷新列表；重复领取（后端业务错误）提示已领取。
 */
async function claimTask(task: TaskItem): Promise<void> {
  if (claimingCode.value) return;
  claimingCode.value = task.id;
  try {
    const result = await request<ClaimResultView, never>({
      url: `/tasks/${encodeURIComponent(task.id)}/claim`,
      method: "POST",
    });
    successHaptic();
    uni.showToast({
      title: t("profile.taskClaimSuccess", { n: result?.rewardPoints ?? task.points }),
      icon: "success",
    });
    // 领取成功后刷新列表（claimed/claimable 状态更新）
    await loadRealTasks();
  } catch (error) {
    const message = error instanceof Error ? error.message : t("profile.taskClaimFailed");
    uni.showToast({ title: message || t("profile.taskClaimFailed"), icon: "none" });
  } finally {
    claimingCode.value = null;
  }
}

/**
 * 页面展示时同步任务数据：
 * - mock：拉取真实签到状态同步「每日签到」任务完成态（现有行为）；
 * - real（3-J）：拉取 GET /tasks 任务列表（含进度与领取状态）。
 */
onShow(async () => {
  if (useMock()) {
    // R4-00059：拉取真实签到状态同步「每日签到」任务完成态（同时刷新 session 资料完成度）
    try {
      void sessionStore.refreshSession();
      const status = await clientApi.getCheckInStatus();
      // R4-00151：字段名对齐后端契约 checkedInToday
      if (status?.checkedInToday === true) {
        checkinDone.value = true;
      }
    } catch (_e) {
      // 状态拉取失败时保持当前完成态（不阻塞页面展示）
    }
    return;
  }
  // real：刷新 session（资料完成度驱动 complete-profile 进度）并拉取任务列表
  try {
    void sessionStore.refreshSession();
    await loadRealTasks();
  } catch (_e) {
    // 拉取失败保持当前列表（不阻塞页面展示）
  }
});
</script>

<template>
  <view class="tasks-page">
    <!-- 页面标题（2026-08-09：左侧补返回键） -->
    <view class="tasks-header">
      <view
        class="tasks-header__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.back')"
        @tap="goBack"
      >
        <image class="tasks-header__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
      </view>
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
            <text class="task-item__title">{{ task.title || t(task.titleKey) }}</text>
            <text class="task-item__points">{{ t('profile.taskPoints', { n: task.points }) }}</text>
          </view>
          <text class="task-item__desc">{{ task.desc || t(task.descKey) }}</text>
        </view>
        <!-- 状态：可领取（领取按钮态）/ 已完成（勾选态）/ 去完成（按钮态） -->
        <view
          class="task-item__status"
          :class="!task.claimable && isTaskClaimed(task) ? 'task-item__status--done' : 'task-item__status--go'"
        >
          <image
            v-if="!task.claimable && isTaskClaimed(task)"
            class="task-item__check"
            :src="IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE"
            mode="aspectFit"
            alt=""
          />
          <text class="task-item__status-text">{{ taskStatusText(task) }}</text>
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

/* 2026-08-09：返回键（圆角图标按钮） */
.tasks-header__back {
  flex-shrink: 0;
  align-self: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tasks-header__back-icon {
  width: 40rpx;
  height: 40rpx;
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
