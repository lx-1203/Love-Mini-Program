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
import { openAppPath } from "../../../utils/navigation";
// 2026-09-04 视觉验收：statusBarHeight 注入，var(--statusbar, env(safe-area-inset-top)) 模拟器为 0 会压刘海
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";
// R14-L10-D32（位置 P3）：页头右侧安全距改走实测胶囊位，须注入 --capsule-right
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import { lightHaptic, successHaptic } from "../../../utils/haptic";
import { IMAGE_PATHS } from "../../../config/images";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
// R4-00058: 签到任务接入真实 GET/POST /check-in 链路
import { clientApi } from "../../../services/api";
// R4-00059: 资料完善任务完成态从真实 session 派生，不再硬编码 done=true
import { useSessionStore } from "../../../stores/session";
// 3-J 任务与积分 real 链路：GET /tasks + POST /tasks/{code}/claim（mock 保留本地演示逻辑）
import { useMock } from "../../../stores/helpers/use-mock";
import { request } from "../../../services/http";

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
      return "/subpackages/village/village/index";
    case "campus-verify":
      return "/subpackages/campus/campus/certification";
    // MP-R1-TASKS-003：完善资料任务同样给出编辑页入口
    case "complete-profile":
      return "/subpackages/setup/profile/index?entry=edit";
    default:
      // daily-checkin 无独立入口（页面内完成）
      return undefined;
  }
}

const { t } = useI18n();
const statusBarHeightPx = useStatusBarHeight();
const { styleVars: menuStyleVars } = useMenuButtonRect();
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
    // MP-R1-TASKS-003：点击「去完成」跳转资料编辑页（原无 path 点击无响应）
    path: "/subpackages/setup/profile/index?entry=edit",
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
    path: "/subpackages/village/village/index",
  },
  {
    id: "verify",
    titleKey: "profile.taskVerify",
    descKey: "profile.taskVerifyDesc",
    points: 100,
    done: false,
    path: "/subpackages/campus/campus/certification",
  },
]);

/**
 * real 模式任务列表（GET /tasks 数据，null 表示未加载/不可用，回退本地列表）。
 */
const realTasks = ref<TaskItem[] | null>(null);
/** real 任务首拉中（骨架屏占位，避免本地兜底→后端数据的内容跳变） */
const loadingRealTasks = ref(false);

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
 * MP-R1-TASKS-004：force=true 绕过 load-once 守卫——原守卫使领取成功后的刷新短路，
 * 任务仍显示「领取」、进度/积分不更新；用户再次点击触发重复 POST 被后端报错。
 */
async function loadRealTasks(force = false): Promise<void> {
  if (!force && realTasks.value !== null) return;
  loadingRealTasks.value = true;
  try {
    const list = await request<TaskView[]>({ url: "/tasks", method: "GET" });
    realTasks.value = (list ?? []).map(toRealTask);
  } catch (_e) {
    // 拉取失败保留当前列表（不阻塞页面展示）
  } finally {
    loadingRealTasks.value = false;
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

/**
 * 任务是否「已完成」（含已完成待领取）。
 * R8-L11-D04（文案 P2）：后端 claimable=true 的语义就是「任务已做完、奖励待领取」
 * （:164 的 completed 亦如此判、:208 的状态文案据此显示「领取」），而旧 doneCount/earnedPoints
 * 只认 claimed ⇒ 同一帧内第 3 卡按钮是绿底「领取」胶囊，页头却写「0/4 已完成」、积分卡写
 * 「累计获得 0 积分 / 0%」、进度条 0 填充，画面自相矛盾。完成度与进度改按 claimable||claimed
 * 计数（建议改法第一条；「已领取 N/4」那条要动 i18n 键，不在本泳道可写集）；
 * 按钮态仍按 claimable / claimed 区分，两套语义不再打架。mock 无 claimable 字段，退化为 done。
 */
function isTaskFinished(task: TaskItem): boolean {
  return task.claimable === true || isTaskClaimed(task);
}

/** 已完成任务（含待领取）——完成度、积分、进度条三处同源的单一筛选 */
const finishedTasks = computed(() => tasks.value.filter((task) => isTaskFinished(task)));
/** 全部任务可获积分总和 */
const totalPoints = computed(() => tasks.value.reduce((sum, task) => sum + task.points, 0));
/** 已获得积分（real 按已完成/待领取计；mock 按 done 计） */
const earnedPoints = computed(() =>
  finishedTasks.value.reduce((sum, task) => sum + task.points, 0)
);
/** 已完成/已领取任务数 */
const doneCount = computed(() => finishedTasks.value.length);

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

/**
 * 任务图标（按任务 id / 后端 code 映射）。
 *
 * R8-L11-D01（素材缺失 P1）：real 档 :166 把 id 取成后端 code（apps/api/…/tasks 的四个 code：
 * daily-checkin / complete-profile / campus-verify / first-post，见 RealTaskService），而旧
 * switch 只匹配 mock 的 checkin / profile / verify ⇒ 三条全部落到 default 的 sparkles 兜底，
 * 帧上四枚图标位实测只有 2 种图形（三枚同一张 17×14 sparkles + 一枚 heart），
 * check-circle / user / graduation-cap 三枚 0 像素可见。现按 code 逐条补 case，
 * default 只在真正未知的任务上兜底。
 *
 * R8-L11-D02（颜色 token P2）：原四枚（sparkles / heart / user / graduation-cap /
 * check-circle 全部 stroke="#94A3B8" 蓝灰，实测墨迹 #95A4B9 / #A5B5C4 / #ACBDC9）坐在
 * 72rpx 的 --c-bg-brand 薄荷胶囊（实测底 #E8FBF2）里，蓝灰字形与品牌绿底不同色族；
 * R7 只在 EmptyState 内中和了同名图标，本页 :416 是裸 <image> 直引 SVG，无从 currentColor
 * 上色。改按建议改法第一条换仓内既有、已按 --c-brand(#36C99A) 上色的图标（四枚全部落在
 * cdn-buckets.json 的 localPrefixes：assets/svg-spec/、assets/icons/register/、
 * assets/icons/tabbar/ ⇒ real 档恒走包内路径，实测 dist/build/mp-weixin-real/static/assets/icons
 * 三目录俱在，不会 404），四枚图形互不相同、且与薄荷底同色族；未新增任何素材。
 * 色值逐枚核过：03-icons/edit.svg / 03-icons/star.svg 均 fill|stroke #36C99A，
 * tabbar/chat-active.png 像素主色 rgb(54,201,154)=#36C99A。
 * R11-L11-D04 追加：签到位不再用 check-green.svg（对勾与 :476 已完成态撞语义），改 icons/plus.svg
 * （同 #36C99A 档），四枚图形互不相同这一条不变。
 */
function taskIcon(taskId: string): string {
  switch (taskId) {
    case "profile":
    case "complete-profile":
      // ✎ 完善资料（svg-spec/03-icons/edit.svg，stroke #36C99A）
      return IMAGE_PATHS.ICONS_EMOJI.EDIT;
    case "checkin":
    case "daily-checkin":
      // R11-L11-D04（文案 P2）：此位原为 assets/icons/register/check-green.svg（✓ 绿对勾）。
      // 本页「已完成态」另有 :476 的 ICONS_EMOJI.CHECK_CIRCLE ⇒ 同页两枚对勾两套解释，
      // 而未完成（帧上实测四张卡全为「去完成」、页头 0/4）的签到任务在行首先长出「已完成」图形。
      // 现取不带完成语义的加号打卡图形（✓ 只留给 :476 那一处）。
      // 素材约束自查（硬规矩 5/8）：仓内唯一「日历」图形三枚（assets/icons/common/calendar.svg、
      // assets/svg-spec/03-icons/calendar.svg 均 stroke #94A3B8；assets/message/svg/calendar.svg
      // 属 cdnPrefixes ⇒ real 档不出包）——前两枚会把 R8-L11-D02 刚清掉的「蓝灰字形压薄荷胶囊」
      // 再引回来，第三枚 real 档是空槽；仓内没有品牌绿日历素材，不许下载/生成 ⇒ 取同为
      // --c-brand(#36C99A) 实色的 icons/plus.svg（stroke #36C99A，已在 config/images.ts 的
      // IN_PACKAGE_ASSETS 以 ICONS_PLUS_SVG pkg+tail 双登记，实测 real 包内
      // dist/build/mp-weixin-real/static/assets/icons/plus.svg 在盘），与同列另三枚图形互不相同。
      return IMAGE_PATHS.ICONS_EMOJI.PLUS;
    case "first-post":
      // 💬 发布首条动态（tabbar/chat-active.png，#36C99A 实心底）
      return IMAGE_PATHS.ICONS_TABBAR.CHAT_ACTIVE;
    case "verify":
    case "campus-verify":
      // ☆ 校园认证（svg-spec/03-icons/star.svg，stroke #36C99A）
      return IMAGE_PATHS.ICONS_EMOJI.STAR;
    default:
      // 未知任务兜底同样取品牌绿档，不再回到蓝灰 sparkles
      return IMAGE_PATHS.ICONS_EMOJI.STAR;
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
        await clientApi.checkIn();
        // MP-R1-TASKS-001：置 checkinDone 状态驱动 localTasks 重算（原 task.done = true
        // 改的是 computed 派生的临时对象，徽标/积分卡/进度条当页不更新）
        checkinDone.value = true;
        successHaptic();
        // MP-R1-TASKS-002：文案展示真实获得积分（任务配置 task.points），
        // 不再把连续天数（consecutiveDays）当积分展示
        uni.showToast({ title: t("profile.taskCheckinSuccess", { n: task.points }), icon: "success" });
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
    // 领取成功后刷新列表（claimed/claimable 状态更新；MP-R1-TASKS-004：force 绕过 load-once 守卫）
    await loadRealTasks(true);
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
    // MP-R1-TASKS-005：await（原 void 把 refreshSession 的 rejection 从外层 try/catch 剥离，
    // 失败成 unhandledRejection 进全局上报）
    try {
      await sessionStore.refreshSession();
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
    // MP-R1-TASKS-005：await（原 void 剥离 rejection，对照 session.ts:803 正确范式）
    await sessionStore.refreshSession();
    await loadRealTasks();
  } catch (_e) {
    // 拉取失败保持当前列表（不阻塞页面展示）
  }
});
</script>

<template>
  <!-- 2026-09-04 视觉验收：statusBarHeight 注入，var(--statusbar, env(safe-area-inset-top)) 模拟器为 0 会压刘海
       R14-L10-D32：根节点同时绑 useMenuButtonRect 的 styleVars（--capsule-right / --statusbar），
       页头右侧安全距才有实测值可用（同 album.vue / favorites.vue 的标准配方）。 -->
  <view class="tasks-page" :style="{ ...menuStyleVars, paddingTop: `calc(${statusBarHeightPx}px + var(--sp-6))` }">
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
        <!-- R14-L10-D27（可达性 P1）+ R14-L10-D28（尺寸比例 P3）同批，配方同 location.vue:189-193 /
             album.vue:672-691：
             ① 圆底里那枚 ICONS_COMMON.BACK 是 common/back.svg 的栅格图（stroke #94A2B7/#94A3B8 蓝灰，
                24 viewBox 里折线只占 x9..15 / y6..18），旧 :551 给 40rpx×40rpx ⇒ 帧上白圆里的箭头只是
                一道浅灰痕（字形墨色实测 ≈1.6:1），读不出方向；本页 navigationStyle: custom（:237 注释
                自证）、无 TabBar、无底部操作栏 ⇒ 这枚是唯一退出口。换成 52rpx 深色 ‹ 字形。
             ② 旧 :543-544 把白底与卡片描边直接挂在 88rpx 热区节点上，可见圆底 = 热区 = 88rpx(44px)，
                比同域其余四页的 64rpx(32px) 圆底大一圈 ⇒ 把 64rpx 圆底（background/border/radius）
                移进新建的 __back-circle，:538-541 的 88rpx 只留透明热区（location.vue:303-324 同款）。 -->
        <view class="tasks-header__back-circle">
          <text class="tasks-header__back-glyph">‹</text>
        </view>
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
      <!-- 2026-09-03 骨架屏：real 任务首拉中占位（失败回退本地列表） -->
      <view v-if="loadingRealTasks && realTasks === null" role="status" aria-live="polite">
        <SkeletonBlock variant="list" :rows="3" :label="t('common.loading')" />
      </view>
      <template v-else>
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
          <!-- MP-R1-TASKS-007：4 个任务图标经 SafeImage 全部零尺寸不可见（10 倍放大与
               像素直方图证实未渲染）——custom-class 跨组件作用域不命中内层 image，
               改原生 image 直引（对齐 campus hub.vue:209，本地 SVG 加载稳定） -->
          <image class="task-item__icon-img" :src="taskIcon(task.id)" mode="aspectFit" alt="" />
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
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.tasks-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  /* R11-L11-D05（颜色token P3）：原 var(--c-gradient-page)
     = linear-gradient(180deg,#DFF3EA,#EEF7F2)（design-variables.scss:181），帧上实测上缘
     (8,120)=#E1F3EB、下缘 (8,700)=#EDF7F1 ⇒ 顶部比同域规范值 #EEF7F2 深 13/255 一档。
     同 subpackage 的 feedback/history 与 chat 两页恒为 #EEF7F2（--c-bg-page，:127）⇒ 同域底色取档不一。
     本页不是登录/引导/沉浸页，没有需要渐变铺底的场景 ⇒ 归口 var(--c-bg-page)，与同域各页同轨。
     注：卡上「确需渐变时给这档渐变在规范 §1.2 立一个令牌再引用」属规范文档侧，不在本车道可写集。 */
  background: var(--c-bg-page, #EEF7F2);
  padding: var(--sp-6) var(--sp-8);
  padding-top: calc(var(--statusbar, env(safe-area-inset-top)) + var(--sp-6));
  box-sizing: border-box;
}

/* ==================== 页面标题 ==================== */
.tasks-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  /* 2026-09-04 视觉验收：右侧为完成度文案，预留胶囊按钮宽度避免遮挡
     R14-L10-D32（位置 P3）：原裸值 180rpx=90px 是按当前中文胶囊宽手调的，没走同域 album.vue:653
     由 useMenuButtonRect 注入的 --capsule-right 实测式（本页根节点 :422 原先也没绑 styleVars）
     ⇒ 切 en-US locale 或胶囊加宽时「0/4 已完成」会直接压进胶囊（album.vue:645-651 记的正是同一次
     踩坑）。换成已验证原式 calc(var(--capsule-right, 7px) + 104px)：兜底档 7+104=111px 比原 90px
     更宽，实测档按胶囊右缘间隙取值；根节点同时绑 menuStyleVars（--capsule-right + --statusbar）。 */
  padding-right: calc(var(--capsule-right, 7px) + 104px);
  margin-bottom: var(--section-gap);
}

/* 2026-08-09：返回键（圆角图标按钮）
   R14-L10-D28：白底/描边/圆角从本节点移入 .tasks-header__back-circle —— 本节点只保留 88rpx
   透明热区（同 location.vue:303-311）。 */
.tasks-header__back {
  flex-shrink: 0;
  align-self: center;
  /* R11-L11-D02（可达性 P1）：原 64rpx×64rpx（=32px，帧实测白色圆底跨 x18-46、y56-87，
     圆径约 29px）低于 88rpx 门槛。本页 navigationStyle: custom（:237 注释自证）且无 TabBar、
     无底部操作栏 ⇒ 这枚小圆键是帧上唯一出口，只能靠猜命中。
     配方与同仓共享页头逐字同档：AppShell.vue:362-363 的 .shell__back 已声明
     min-height/min-width: 88rpx（44px）。 */
  width: 88rpx;
  height: 88rpx;
  min-width: 88rpx;
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* R14-L10-D28（尺寸比例 P3）：可见圆底 64rpx=32px，与同域 album.vue:672-681 /
   location.vue:313-324 / favorites.vue:182-194 五页同档；热区仍是外层 88rpx，两者解耦。 */
.tasks-header__back-circle {
  width: 64rpx;
  height: 64rpx;
  box-sizing: border-box;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* R14-L10-D27（可达性 P1）：原 .tasks-header__back-icon（40rpx×40rpx 蓝灰 PNG，墨色实测 ≈1.6:1）
   换成 52rpx 深色 ‹ 字形压白圆底 —— --c-text-primary #1A1E1C 对 #FFFFFF 实算 16.85:1。
   52rpx 高于字号档位上限 --fs-5xl=44rpx，按 location.vue:330 / album.vue:686 既有口径保留为
   固定布局尺寸，不写永不生效的假兜底。 */
.tasks-header__back-glyph {
  font-size: 52rpx;
  font-weight: 700;
  line-height: 1;
  color: var(--c-text-primary);
}

.tasks-header__title {
  /* R14-L10-D26（字号 P2）：原 var(--fs-5xl)=44rpx=22px 是「卡片大标题」档充当页头，
     比 §1.3 页头档下限 26px 低 4px；同分包同批收敛过的 location.vue:345 / privacy.vue:312 /
     album.vue:699 三页均已升 --fs-7xl=56rpx=28px（design-variables.scss:572，与 AppShell
     .shell__title 同值），本页与 favorites 同条链路上留旧档 ⇒ 归同域页头档。 */
  font-size: var(--fs-7xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

/* R12-L11-D03（可达性 P2）：「0/4 已完成」原 --c-text-tertiary #6B7571 直接压页底
   --c-bg-page #EEF7F2（.tasks-header 无卡底），对比 4.36:1 落在 3:1–4.5:1 区间记 P2。
   升一档 --c-text-secondary #4A524E（design-variables.scss:122/:363）对 #EEF7F2 约 7.4:1，
   字号 --fs-md 不动。 */
.tasks-header__count {
  font-size: var(--fs-md);
  color: var(--c-text-secondary, #4A524E);
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

/* R12-L11-D02（可达性 P1）：完成度百分比原 --c-brand #36C99A 压白卡，15px/700 不达
   WCAG 大字豁免（≥18.66px/700），实测 2.10:1；进度条 0 填充时它是本页唯一进度读数。
   按 §2 在册算法收 --c-brand-800 #156B51（design-variables.scss:18/:267，对白 6.45:1），
   与同页 .task-item__status--go / --done 文字（R11 已收同档）归口。字号字重不动。 */
.tasks-summary__percent {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-brand-800, #156B51);
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
  /* R14-L10-D31（间距 P3）：同一列白卡原先两档间隙 —— :573 概览卡到第一张任务是
     margin-bottom var(--sp-6)=24rpx，本处任务卡之间是 gap var(--sp-5)=20rpx，帧上后三道白缝
     比第一道窄 2px，四张同族卡被排成「头一张松、后面紧」。§1.4 只登记 24rpx 这一档区块间距，
     且 --section-gap(:427)=24rpx 正是区块间隙令牌（album.vue:654 同款用法）⇒ 归此档。
     实算：任务卡 1..4 之间的间隙 20rpx→24rpx（+2px/缝，共 3 缝 ⇒ 列表整体下移 6px，
     与概览卡到第一张的 24rpx 同值 ⇒ 复拍门 bottom 帧可见四缝等宽）。 */
  gap: var(--section-gap, 24rpx);
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

/* R12-L11-D01（可达性 P1）：任务卡奖励值「+N 积分」原 --c-brand #36C99A 压白卡，
   --fs-sm 11px/600 实测 2.10:1，四行绿字是任务决策数据，全部不过线。
   收 --c-brand-800 #156B51（对白 6.45:1），与同页 .task-item__status--done 文字同一档（R11 同轴漏网补齐）。
   字号字重不动。 */
.task-item__points {
  /* R14-L10-D30（字号 P2）：奖励值「+5/+50/+20/+100 积分」是每行的激励值（用户据此决定
     先做哪条），原与 :674 的任务说明行同为 var(--fs-sm)=22rpx=11px —— 深色强调（:669 的
     --c-brand-800）被同档字号抵消回去。升 var(--fs-md)=26rpx=13px（§1.3 小字档），
     说明行 .task-item__desc 保持 --fs-sm 11px ⇒ 两档拉开（13px vs 11px），
     与左边任务名 15px 形成 15/13/11 三级读法。行内标题+奖励值同行（:490 title-row，
     gap --sp-3），13px 下最长「+100 积分」≈ 6 字×13px≈70px + 任务名「完善个人资料」
     6 字×15px≈90px + 6px 间隙 = 166px < 内容列可用宽（.task-item__content 为 flex:1
     min-width:0，实测列宽 ≈ 375 − 32 页衬 − 36 图标 − 10 间隙 − 80 状态胶囊 ≈ 200px）⇒ 不换行。 */
  font-size: var(--fs-md);
  color: var(--c-brand-800, #156B51);
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
  justify-content: center;
  gap: var(--sp-1);
  /* R11-L11-D03（尺寸比例 P2）：胶囊实测 50×21px（x296-345 / y191-211）=100×42rpx，
     高度只有 88rpx 门槛的一半——原内衬纵向仅 --sp-2(8rpx)，11px 字撑不出可点体量。
     按卡上第一条补 min-height:88rpx（既有 align-items/justify-content 让文本仍在原位居中），
     与已完成态同一套体量（两态同规则、不再一个 42rpx 一个自适）。
     实高即 88rpx：theme/global.scss:1-3 已对 view/text/image 全局设 box-sizing:border-box，
     min-height 落在边框盒上。 */
  min-height: 88rpx;
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.task-item__status--done {
  background: var(--c-bg-brand);
}

/* R11-L11-D01（可达性 P1）：「去完成」底原为 --c-brand #36C99A（帧采样 (54,201,154)），
   标签走 --c-neutral-0 纯白 ⇒ 白字压品牌绿实测 2.10:1（L 1.0 / #36C99A=0.4490 ⇒ 1.05/0.4990），
   字号 --fs-sm 22rpx=11px/600（.task-item__status-text，:720-723）不达 WCAG 大字豁免
   （需 ≥24px/700 或 18.7px/700），
   距 4.5:1 下限差一半 ⇒ 本页唯一主操作的三字动作读不出来。
   按 §2 在册算法取 --c-brand-800 #156B51（design-variables.scss:18）实底：
   纯白压 #156B51 = 1.05/0.16282 = 6.45:1（同仓已定档配方：BottomActionBar.vue:104、
   dnd.vue 保存键、本页 R9 那轮收的 .process-step__badge 同族）。
   未采纳卡上「不要照抄」的 --c-brand-700 #1F8D6A（白字仅 4.14:1，同样不过线）。 */
.task-item__status--go {
  background: var(--c-brand-800, #156B51);
}

/* 同根顺手项（不另开卡）：已完成态文字原为 --c-brand-700 #1F8D6A 压 --c-bg-brand #E8FBF2，
   按同一把尺算 = 0.97569/0.25379 = 3.84:1，与本卡 :662 实测「约 3.8:1」吻合，同档文字同档判点；
   一并收到 --c-brand-800（0.97569/0.16282 = 5.99:1 ≥ 4.5:1）。底色 --c-bg-brand 不动。 */
.task-item__status--done .task-item__status-text {
  color: var(--c-brand-800, #156B51);
}

.task-item__status--go .task-item__status-text {
  color: var(--c-neutral-0);
}

.task-item__check {
  width: 28rpx;
  height: 28rpx;
}

.task-item__status-text {
  /* R14-L10-D29（字号 P2）：「去完成」是本页 4 张任务卡上唯一的主动作文案，原取
     var(--fs-sm)=22rpx=11px 落在 §1.3「角标·法务」档 —— 帧上深绿胶囊里的三字比左边
     任务名（--fs-xl 15px）小近四成，读起来像胶囊角标而不是按钮文字（控件本身 min-height
     88rpx 已够点，问题只在字号取档）。升 var(--fs-lg)=28rpx=14px，与同域 album.vue:898-904
     那颗主 CTA「添加照片」文案同档（该处 R8-L10-D11 已收同档）。
     同规则也吃进「已完成」态文案（同一枚 .task-item__status-text）——两态同体量，不出现
     一个 11px 一个 14px 的新错位。白字压 --c-brand-800 #156B51 仍 6.45:1（字号升档只增
     可读性，不改色值）；胶囊高由 :693 min-height:88rpx 兜住（14px 字 + 上下 8rpx 内衬
     ≈ 27px < 44px），无溢出。 */
  font-size: var(--fs-lg);
  font-weight: 600;
}
</style>
