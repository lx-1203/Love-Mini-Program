<script setup lang="ts">
/**
 * 线下活动页 - 支持列表/日历双视图切换
 * 列表视图：展示所有活动卡片，支持下拉刷新、上拉加载更多
 * 日历视图：以月历形式展示活动分布，高亮有活动日期，点击查看当日活动详情
 */
import { ref, computed } from "vue";
import { onShow, onUnload } from "@dcloudio/uni-app";
// 任务 E1/E2：直接导入全局 t 函数（同 session.ts 模式），避免组合式 API 声明被模板类型检查遗漏
import { t } from "@/i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import EmptyState from "../../../components/common/EmptyState.vue";
import { usePageAccess } from "../../../composables/usePageAccess";
// 修复 no-duplicate-imports：合并 ../../../stores/activity 的重复 import
import { useActivityStore, type ActivityItem } from "../../../stores/activity";
// 修复（严格模式 noUnusedLocals）：useSessionStore 导入后未使用，已移除。
import { openAppPath } from "../../../utils/navigation";
import { debounce } from "../../../utils/debounce";
import { IMAGE_PATHS } from "../../../config/images";

/** Emoji 替换 SVG 图标路径 */
const emojiIcons = {
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
  schedule: IMAGE_PATHS.ICONS_COMMON.SCHEDULE_SVG,
} as const;

const activityStore = useActivityStore();
// 修复（严格模式 noUnusedLocals）：sessionStore 声明后未在脚本/模板引用（myCampusName 已移除），已删除。

usePageAccess({
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
});

/* ========== 视图切换 ========== */
type ViewMode = "list" | "calendar";
const viewMode = ref<ViewMode>("list");

function switchView(mode: ViewMode) {
  if (viewMode.value === mode) return;
  viewMode.value = mode;
  // 切换到日历视图时重新获取数据
  if (mode === "calendar") {
    void activityStore.fetchActivities();
  }
}

/* ========== 下拉刷新 / 加载更多 ========== */
// 修复（SubTask 1.2.1）：refresherTriggered 必须为响应式 ref，
// 否则 :refresher-triggered 绑定无法触发视图更新（下拉刷新动画卡死）。
const refresherTriggered = ref(false);

onShow(() => {
  void activityStore.fetchActivities();
});

onUnload(() => {
  refresherTriggered.value = false;
  // 修复（SubTask 1.5.2）：页面卸载时取消挂起的 loadMore 防抖定时器，避免内存泄漏
  debouncedLoadMore.cancel();
});

async function onRefresherRefresh() {
  refresherTriggered.value = true;
  try {
    await activityStore.fetchActivities();
  } finally {
    refresherTriggered.value = false;
  }
}

// 修复（SubTask 1.2.2）：onScrollToLower 添加 300ms 防抖，
// 避免快速滑动触发多次 fetchMoreActivities 造成请求风暴与重复分页。
const debouncedLoadMore = debounce(async () => {
  if (activityStore.loading || !activityStore.hasMore) return;
  await activityStore.fetchMoreActivities();
}, 300);

async function onScrollToLower() {
  debouncedLoadMore();
}

/* ========== 报名 ========== */
// 修复（SubTask 1.2.4）：报名按钮 loading 状态防重复点击，
// 通过 activityStore.enrolling 全局禁用 + 本地 submittingId 精准定位当前点击项。
const submittingId = ref<string>("");

async function toggleEnroll(activityId: string) {
  if (activityStore.enrolling || submittingId.value === activityId) return;
  submittingId.value = activityId;
  try {
    const enrolled = await activityStore.enrollActivity(activityId);
    // review nit 修复：报名/取消结果本地提示（mock 模式 store 内无 toast）
    uni.showToast({
      title: enrolled ? t("activities.enrolledToast") : t("activities.unenrolledToast"),
      icon: "none",
    });
  } catch (_e) {
    uni.showToast({ title: t("activities.enrollFailedToast"), icon: "none" });
  } finally {
    submittingId.value = "";
  }
}

/** 截取描述前50字 */
function shortDesc(desc?: string): string {
  if (!desc) return "";
  return desc.length > 50 ? desc.slice(0, 50) + "..." : desc;
}

/**
 * 任务 E2：跳转活动详情页并携带活动 id。
 * 详情页通过 onLoad 读取 id 匹配活动数据；未匹配时展示通用示例内容。
 */
function goToActivityDetail(activityId: string) {
  openAppPath(`/pages/activities/detail?id=${encodeURIComponent(activityId)}`);
}

/* ================================================================
   日历视图相关逻辑
   ================================================================ */

/** 星期标题（周一开始，R4-00054：走 i18n，en-US 显示 Mon-Sun） */
const WEEK_DAY_LABELS = [
  t("activities.weekMon"),
  t("activities.weekTue"),
  t("activities.weekWed"),
  t("activities.weekThu"),
  t("activities.weekFri"),
  t("activities.weekSat"),
  t("activities.weekSun"),
];

/** 当前用户学校名称 */
// 修复（严格模式 noUnusedLocals）：myCampusName 计算属性未被模板/脚本引用，已移除。

/** 当前日历展示的年月 */
const calendarYear = ref(new Date().getFullYear());
const calendarMonth = ref(new Date().getMonth() + 1); // 1-12

/** 选中的日历日期（YYYY-MM-DD），点击有活动的日期时设置 */
const selectedDate = ref<string>("");

/** 按日期分组活动：{ "YYYY-MM-DD": ActivityItem[] } */
const activitiesByDate = computed<Record<string, ActivityItem[]>>(() => {
  const map: Record<string, ActivityItem[]> = {};
  for (const act of activityStore.activities) {
    if (act.date) {
      // 修复（严格模式 noUncheckedIndexedAccess）：map[act.date] 索引访问返回 T | undefined，
      // 此处通过局部变量在保证非空后再 push，避免在 undefined 上调用 .push()。
      const existing = map[act.date];
      if (existing) {
        existing.push(act);
      } else {
        map[act.date] = [act];
      }
    }
  }
  return map;
});

/** 有活动的日期集合 */
const activeDates = computed<Set<string>>(() => {
  return new Set(Object.keys(activitiesByDate.value));
});

/** 获取某日总报名人数 */
function getDateEnrollCount(dateStr: string): number {
  const acts = activitiesByDate.value[dateStr];
  if (!acts) return 0;
  return acts.reduce((sum: number, a: ActivityItem) => sum + (a.enrollCount ?? a.enrollmentCount ?? 0), 0);
}

/**
 * 日历网格数据
 * 每个格子包含：day(日期号, 0表示空白)、dateStr(YYYY-MM-DD)、isToday、isCurrentMonth
 */
interface CalendarCell {
  day: number;
  dateStr: string;
  isToday: boolean;
  isCurrentMonth: boolean;
}

const calendarGrid = computed<CalendarCell[]>(() => {
  const year = calendarYear.value;
  const month = calendarMonth.value;

  // 本月1号是星期几（0=周日, 1=周一, ..., 6=周六）
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  // 转换为周一起始：周一=0, 周二=1, ..., 周日=6
  const firstDayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // 本月总天数
  const daysInMonth = new Date(year, month, 0).getDate();

  // 上月总天数（用于填充前导空白）
  const prevMonthDays = new Date(year, month - 1, 0).getDate();

  // 今天的日期字符串
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const cells: CalendarCell[] = [];

  // 填充前导空白（上月末尾几天）
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, dateStr, isToday: dateStr === todayStr, isCurrentMonth: false });
  }

  // 本月日期
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr, isToday: dateStr === todayStr, isCurrentMonth: true });
  }

  // 填充后置空白（下月开头几天），确保总格数为7的倍数
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateStr, isToday: dateStr === todayStr, isCurrentMonth: false });
    }
  }

  return cells;
});

/** 选中的日期对应的活动列表 */
const selectedDateActivities = computed<ActivityItem[]>(() => {
  if (!selectedDate.value) return [];
  return activitiesByDate.value[selectedDate.value] ?? [];
});

/** 当前月份标题（R4-00054：走 i18n） */
const monthTitle = computed(() => {
  return t("activities.monthTitle", { year: calendarYear.value, month: calendarMonth.value });
});

/** 是否可切换到上个月 */
// 修复（严格模式 noUnusedLocals）：canGoPrev 计算属性未被模板/脚本引用，已移除。
// goToPrevMonth 内部直接计算月份边界，无需依赖此计算属性。

/** 切换到上个月 */
function goToPrevMonth() {
  if (calendarMonth.value === 1) {
    calendarYear.value--;
    calendarMonth.value = 12;
  } else {
    calendarMonth.value--;
  }
  selectedDate.value = "";
}

/** 切换到下个月 */
function goToNextMonth() {
  if (calendarMonth.value === 12) {
    calendarYear.value++;
    calendarMonth.value = 1;
  } else {
    calendarMonth.value++;
  }
  selectedDate.value = "";
}

/**
 * 点击日历日期（任务 E1 修复）：允许点选任意本月日期，
 * 高亮选中并筛选当日活动列表；无活动时展示空态提示。
 */
function onCalendarDateTap(cell: CalendarCell) {
  if (!cell.isCurrentMonth) return;
  selectedDate.value = cell.dateStr === selectedDate.value ? "" : cell.dateStr;
}

/** 截断活动标题（10字内） */
function truncateTitle(title: string, maxLen = 10): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen) + "…";
}

/** 格式化日期为友好文本 */
function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  // 修复（严格模式 noUncheckedIndexedAccess）：parts[1] / parts[2] 索引访问返回 string | undefined，
  // 此处提取后做非空校验，确保 parseInt 入参为 string（前面已校验 length === 3，正常不会越界）。
  const monthStr = parts[1];
  const dayStr = parts[2];
  if (!monthStr || !dayStr) return dateStr;
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  // R4-00054：日期友好文案走 i18n
  return t("activities.dateLabel", { month, day });
}

// 修复（严格模式 noUnusedLocals）：toggleEnroll 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ toggleEnroll });
</script>

<template>
  <AppShell
    :title="t('activities.sectionTitle')"
    :subtitle="t('activities.sectionSubtitle')"
    :show-tab-bar="false"
    show-back
  >
    <!-- 加载中（无缓存） -->
    <view v-if="activityStore.loading && !activityStore.activities.length" class="status-box">
      <text class="status-text">{{ t("activities.loadingContent") }}</text>
    </view>

    <!-- 加载失败（无缓存） -->
    <view
      v-else-if="!activityStore.activities.length && activityStore.errorMessage"
      class="status-box"
    >
      <text class="status-text status-text--error">{{ activityStore.errorMessage }}</text>
      <button class="retry-btn" @tap="activityStore.fetchActivities()">{{ t("common.retry") }}</button>
    </view>

    <!-- 暂无活动 -->
    <EmptyState
      v-else-if="!activityStore.activities.length"
      type="no-data"
    />

    <!-- 主内容区域 -->
    <template v-else>
      <!-- ===== 视图切换按钮 ===== -->
      <view class="view-toggle-bar">
        <view class="view-toggle">
          <view
            class="view-toggle__btn"
            :class="{ 'view-toggle__btn--active': viewMode === 'list' }"
            @tap="switchView('list')"
          >
            <text class="view-toggle__text">{{ t("activities.listTab") }}</text>
          </view>
          <view
            class="view-toggle__btn"
            :class="{ 'view-toggle__btn--active': viewMode === 'calendar' }"
            @tap="switchView('calendar')"
          >
            <text class="view-toggle__text">{{ t("activities.calendarTab") }}</text>
          </view>
        </view>
      </view>

      <!-- ===== 列表视图 ===== -->
      <scroll-view
        v-if="viewMode === 'list'"
        class="activity-scroll"
        scroll-y
        refresher-enabled
        :refresher-triggered="refresherTriggered"
        @refresherrefresh="onRefresherRefresh"
        @scrolltolower="onScrollToLower"
      >
        <view class="activity-list" role="list">
          <view
            v-for="item in activityStore.activities"
            :key="item.id"
            class="activity-row"
            role="button"
            :aria-label="t('activities.cardAria', { title: item.title })"
            @tap="goToActivityDetail(item.id)"
          >
            <view class="row-header">
              <text class="row-title">{{ item.title }}</text>
              <!-- 参与意向人数标记（同校可见） -->
              <view v-if="(item.enrollmentCount ?? item.enrollCount ?? 0) > 0" class="row-enrollment">
                <text class="enrollment-count">{{ item.enrollmentCount ?? item.enrollCount ?? 0 }}</text>
                <text class="enrollment-label">{{ t("activities.enrolledLabel") }}</text>
              </view>
            </view>

            <text v-if="item.description" class="row-desc">{{ shortDesc(item.description) }}</text>

            <view class="row-detail">
              <view class="row-detail-item">
                <image class="row-icon" :src="emojiIcons.location" mode="aspectFit" lazy-load="true" alt="" />
                <text class="row-detail-text">{{ item.location }}</text>
              </view>
              <view class="row-detail-item">
                <image class="row-icon" :src="emojiIcons.schedule" mode="aspectFit" lazy-load="true" alt="" />
                <text class="row-detail-text">{{ item.scheduleText }}</text>
              </view>
            </view>

            <!-- catchtap：阻止冒泡到卡片跳转详情，避免误触发 -->
            <button
              class="enroll-btn"
              :class="{ 'enroll-btn--active': item.isEnrolled }"
              :disabled="activityStore.enrolling || submittingId === item.id"
  @tap.stop="toggleEnroll(item.id)"
            >
              <text v-if="submittingId === item.id" class="enroll-btn__loading">...</text>
              <text v-else>{{ item.isEnrolled ? t('activities.interestedDone') : t('activities.interested') }}</text>
            </button>
          </view>
        </view>

        <!-- 加载更多提示 -->
        <view v-if="activityStore.loading && activityStore.activities.length" class="loading-more" role="status" aria-live="polite">
          <text class="loading-more__text">{{ t("common.loading") }}</text>
        </view>
        <view v-else-if="!activityStore.hasMore && activityStore.activities.length" class="loading-more" role="status" aria-live="polite">
          <text class="loading-more__text">{{ t("activities.noMore") }}</text>
        </view>

        <SectionCard
          :title="t('activities.nextTitle')"
          :subtitle="t('activities.nextSubtitle')"
        >
          <BottomActionBar
            :primary-label="t('activities.goExplore')"
            :secondary-label="t('activities.submitProposal')"
            @primary="openAppPath('/pages/discover/index')"
            @secondary="openAppPath('/subpackages/support/feedback/index')"
          />
        </SectionCard>
      </scroll-view>

      <!-- ===== 日历视图 ===== -->
      <scroll-view
        v-else
        class="calendar-scroll"
        scroll-y
      >
        <!-- 月份切换 -->
        <view class="calendar-header">
          <view class="month-nav">
            <view class="month-nav__btn" @tap="goToPrevMonth">
              <text class="month-nav__arrow">‹</text>
            </view>
            <text class="month-nav__title">{{ monthTitle }}</text>
            <view class="month-nav__btn" @tap="goToNextMonth">
              <text class="month-nav__arrow">›</text>
            </view>
          </view>
        </view>

        <!-- 星期标题行 -->
        <view class="weekday-row">
          <text
            v-for="label in WEEK_DAY_LABELS"
            :key="label"
            class="weekday-row__item"
          >{{ label }}</text>
        </view>

        <!-- 日历网格 -->
        <view class="calendar-grid">
          <view
            v-for="(cell, idx) in calendarGrid"
            :key="idx"
            class="calendar-cell"
            :class="{
              'calendar-cell--other-month': !cell.isCurrentMonth,
              'calendar-cell--today': cell.isToday && cell.isCurrentMonth,
              'calendar-cell--active': activeDates.has(cell.dateStr),
              'calendar-cell--selected': cell.dateStr === selectedDate,
              'calendar-cell--disabled': !cell.isCurrentMonth || !activeDates.has(cell.dateStr),
            }"
            @tap="onCalendarDateTap(cell)"
          >
            <!-- 日期数字 -->
            <view class="calendar-cell__day-wrapper">
              <text class="calendar-cell__day">{{ cell.day }}</text>
              <!-- 有活动的品牌色圆点标记 -->
              <view
                v-if="activeDates.has(cell.dateStr) && cell.isCurrentMonth"
                class="calendar-cell__dot"
              />
            </view>

            <!-- 活动标题（取第一条，截断10字内） -->
            <!-- 修复（严格模式 noUncheckedIndexedAccess）：activitiesByDate[cell.dateStr] 索引访问返回 T | undefined，
                 再 [0] 仍是 ActivityItem | undefined，统一用可选链 + 兜底，避免 .title 抛 undefined。 -->
            <text
              v-if="cell.isCurrentMonth && activitiesByDate[cell.dateStr]?.length"
              class="calendar-cell__title"
            >{{ truncateTitle(activitiesByDate[cell.dateStr]?.[0]?.title ?? '') }}</text>

            <!-- 参与意向人数标记 -->
            <view
              v-if="cell.isCurrentMonth && activitiesByDate[cell.dateStr]?.length"
              class="calendar-cell__count"
            >
              <text class="calendar-cell__count-text">
                {{ t("activities.peopleCount", { n: getDateEnrollCount(cell.dateStr) }) }}
              </text>
            </view>
          </view>
        </view>

        <!-- 选中日期的活动列表（任务 E1：无活动日期也可选中，展示空态） -->
        <view v-if="selectedDate" class="selected-date-panel">
          <view class="selected-date-header">
            <view class="selected-date-header__label-row">
              <image class="selected-date-header__icon" :src="IMAGE_PATHS.ICONS_EMOJI.CALENDAR" mode="aspectFit" alt="" />
              <text class="selected-date-header__label">{{ formatDateLabel(selectedDate) }}</text>
            </view>
            <text class="selected-date-header__count">{{ t("activities.activityCount", { n: selectedDateActivities.length }) }}</text>
          </view>

          <view
            v-for="item in selectedDateActivities"
            :key="item.id"
            class="activity-row"
            role="button"
            :aria-label="t('activities.cardAria', { title: item.title })"
            @tap="goToActivityDetail(item.id)"
          >
            <view class="row-header">
              <text class="row-title">{{ item.title }}</text>
              <view v-if="(item.enrollmentCount ?? item.enrollCount ?? 0) > 0" class="row-enrollment">
                <text class="enrollment-count">{{ item.enrollmentCount ?? item.enrollCount ?? 0 }}</text>
                <text class="enrollment-label">{{ t("activities.enrolledLabel") }}</text>
              </view>
            </view>

            <text v-if="item.description" class="row-desc">{{ shortDesc(item.description) }}</text>

            <view class="row-detail">
              <view class="row-detail-item">
                <image class="row-icon" :src="emojiIcons.location" mode="aspectFit" lazy-load="true" alt="" />
                <text class="row-detail-text">{{ item.location }}</text>
              </view>
              <view class="row-detail-item">
                <image class="row-icon" :src="emojiIcons.schedule" mode="aspectFit" lazy-load="true" alt="" />
                <text class="row-detail-text">{{ item.scheduleText }}</text>
              </view>
            </view>

            <!-- catchtap：阻止冒泡到卡片跳转详情，避免误触发 -->
            <button
              class="enroll-btn"
              :class="{ 'enroll-btn--active': item.isEnrolled }"
              :disabled="activityStore.enrolling || submittingId === item.id"
  @tap.stop="toggleEnroll(item.id)"
            >
              <text v-if="submittingId === item.id" class="enroll-btn__loading">...</text>
              <text v-else>{{ item.isEnrolled ? t('activities.interestedDone') : t('activities.interested') }}</text>
            </button>
          </view>

          <!-- 任务 E1：选中日期无活动时的空态提示 -->
          <view v-if="!selectedDateActivities.length" class="selected-date-empty" role="status">
            <text class="selected-date-empty__text">{{ t('activities.emptyForDate') }}</text>
          </view>
        </view>

        <!-- 日历底部操作栏 -->
        <SectionCard
          :title="t('activities.nextTitle')"
          :subtitle="t('activities.nextSubtitle')"
        >
          <BottomActionBar
            :primary-label="t('activities.goExplore')"
            :secondary-label="t('activities.submitProposal')"
            @primary="openAppPath('/pages/discover/index')"
            @secondary="openAppPath('/subpackages/support/feedback/index')"
          />
        </SectionCard>
      </scroll-view>
    </template>
  </AppShell>
</template>

<style scoped lang="scss">
/* ================================================================
   状态盒子（加载/错误/空）
   ================================================================ */
.status-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 64rpx 28rpx;
}

.status-text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
}

.status-text--error {
  color: var(--c-error);
}

.retry-btn {
  padding: 14rpx 36rpx;
  border: 1px solid var(--c-border-light);
  border-radius: var(--r-md, 14rpx);
  background: var(--c-bg-container);
  font-size: var(--fs-md, 26rpx);
  color: var(--c-brand-700);
}

/* ================================================================
   视图切换按钮栏
   ================================================================ */
.view-toggle-bar {
  display: flex;
  justify-content: flex-end;
  padding: 0 28rpx 16rpx;
}

.view-toggle {
  display: flex;
  background: var(--c-bg-surface);
  border-radius: var(--r-full, 9999rpx);
  padding: 4rpx;
  gap: 4rpx;
}

.view-toggle__btn {
  padding: 10rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  transition: all var(--d-normal, 200ms) ease;
}

.view-toggle__btn--active {
  background: var(--c-brand-700);
}

.view-toggle__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.view-toggle__btn--active .view-toggle__text {
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ================================================================
   列表视图
   ================================================================ */
.activity-scroll {
  flex: 1;
  height: 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 0 0 16rpx;
}

/* Phase 8 验收：活动排版自适应 + 增删对称
   - 移动端：单列流式（任意数量都整齐）
   - H5 宽屏（>=720px）：自动切换双列网格，flex-wrap 保证增删任意数量均对称换行 */
/* #ifdef H5 */
@media (min-width: 720px) {
  .activity-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16px;
  }

  .activity-row {
    width: calc(50% - 8px);
    box-sizing: border-box;
  }
}
/* #endif */

.activity-row {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 24rpx;
  border-radius: var(--r-lg, 20rpx);
  background: var(--c-bg-container);
  box-shadow: var(--s-sm);
}

.row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary);
  flex: 1;
}

.row-enrollment {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.enrollment-count {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-brand-700);
}

.enrollment-label {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary);
}

.row-desc {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

.row-detail {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.row-detail-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.row-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: var(--sp-1, 8rpx);
  color: var(--c-text-tertiary, #94a3b8);
  flex-shrink: 0;
}

.row-detail-text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
}

.enroll-btn {
  width: 100%;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid var(--c-border-light);
  border-radius: var(--r-md, 14rpx);
  background: transparent;
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: var(--c-text-primary);
  margin-top: 4rpx;
}

.enroll-btn--active {
  border-color: var(--c-brand-700);
  background: var(--c-bg-brand);
  color: var(--c-brand-700);
}

.enroll-btn__loading {
  letter-spacing: 4rpx;
  color: var(--c-text-tertiary);
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0 32rpx;
}

.loading-more__text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
}

/* ================================================================
   日历视图
   ================================================================ */
.calendar-scroll {
  flex: 1;
  height: 0;
}

/* --- 月份导航 --- */
.calendar-header {
  padding: 0 28rpx 20rpx;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.month-nav__btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-surface);
}

.month-nav__arrow {
  font-size: var(--fs-3xl, 36rpx);
  color: var(--c-text-secondary);
  line-height: 1;
  font-weight: 300;
}

.month-nav__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--c-text-primary);
  min-width: 200rpx;
  text-align: center;
}

/* --- 星期标题行 --- */
/* mp-weixin 不支持 display:grid，7 列等宽布局改用 Flexbox + 子元素 width: calc */
.weekday-row {
  display: flex;
  flex-wrap: wrap;
  padding: 0 24rpx 12rpx;
  border-bottom: 1rpx solid var(--c-border-light);
  margin: 0 28rpx 8rpx;
}

.weekday-row__item {
  /* 7 列：每行 7 个，无 gap → width = calc(100% / 7) */
  width: calc(100% / 7);
  text-align: center;
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: var(--c-text-tertiary);
  padding: 12rpx 0;
  box-sizing: border-box;
}

/* --- 日历网格 --- */
/* mp-weixin 不支持 display:grid，7 列等宽布局改用 Flexbox + 子元素 width: calc */
.calendar-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 28rpx;
  gap: 4rpx 0;
}

.calendar-grid .calendar-cell {
  /* 7 列：每行 7 个，无水平 gap → width = calc(100% / 7) */
  width: calc(100% / 7);
  box-sizing: border-box;
}

.calendar-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10rpx 4rpx 14rpx;
  min-height: 120rpx;
  border-radius: var(--r-md, 12rpx);
  transition: background var(--d-fast, 160ms) ease;
  position: relative;
}

.calendar-cell--other-month {
  opacity: 0.25;
}

.calendar-cell--today {
  background: var(--c-bg-brand);
}

.calendar-cell--active {
  /* mp-weixin 不支持 cursor:pointer，已通过 :active 伪类提供按下反馈 */
}

.calendar-cell--selected {
  background: var(--c-brand-100);
  border: 2rpx solid var(--c-brand-700);
}

.calendar-cell--disabled {
  opacity: 0.4;
}

/* --- 日期数字区域 --- */
.calendar-cell__day-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
}

.calendar-cell__day {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
  line-height: 1;
}

.calendar-cell--today .calendar-cell__day {
  color: var(--c-brand-700);
  font-weight: 800;
}

.calendar-cell--other-month .calendar-cell__day {
  color: var(--c-text-tertiary);
  font-weight: 400;
}

/* --- 有活动的品牌色圆点标记 --- */
.calendar-cell__dot {
  position: absolute;
  bottom: 2rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 8rpx;
  height: 8rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-brand-700);
}

/* --- 活动标题（截断10字） --- */
.calendar-cell__title {
  font-size: 18rpx;
  color: var(--c-brand-700);
  text-align: center;
  margin-top: 4rpx;
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 2rpx;
}

.calendar-cell--other-month .calendar-cell__title {
  opacity: 0;
}

/* --- 参与意向人数 --- */
.calendar-cell__count {
  margin-top: 2rpx;
}

.calendar-cell__count-text {
  font-size: 16rpx;
  color: var(--c-text-tertiary);
  font-weight: 500;
}

/* --- 选中日期活动面板 --- */
.selected-date-panel {
  margin: 16rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.selected-date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}

.selected-date-header__label-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.selected-date-header__icon {
  width: 30rpx;
  height: 30rpx;
  color: var(--c-brand-500);
}

.selected-date-header__label {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.selected-date-header__count {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-brand-700);
  background: var(--c-bg-brand);
  padding: 6rpx 16rpx;
  border-radius: var(--r-full, 9999rpx);
  font-weight: 500;
}

/* --- 选中日期无活动空态（任务 E1） --- */
.selected-date-empty {
  padding: 40rpx 24rpx;
  border-radius: var(--r-lg, 20rpx);
  background: var(--c-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-date-empty__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary);
}
</style>