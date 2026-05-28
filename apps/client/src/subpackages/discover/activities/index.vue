<script setup lang="ts">
/**
 * 线下活动页 - 支持列表/日历双视图切换
 * 列表视图：展示所有活动卡片，支持下拉刷新、上拉加载更多
 * 日历视图：以月历形式展示活动分布，高亮有活动日期，点击查看当日活动详情
 */
import { ref, computed, onShow, onUnload } from "@dcloudio/uni-app";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import { usePageAccess } from "../../../composables/usePageAccess";
import { useActivityStore } from "../../../stores/activity";
import { useSessionStore } from "../../../stores/session";
import { openAppPath } from "../../../utils/navigation";
import type { ActivityItem } from "../../../stores/activity";

const activityStore = useActivityStore();
const sessionStore = useSessionStore();

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
let refresherTriggered = false;

onShow(() => {
  void activityStore.fetchActivities();
});

onUnload(() => {
  refresherTriggered = false;
});

async function onRefresherRefresh() {
  refresherTriggered = true;
  try {
    await activityStore.fetchActivities();
  } finally {
    refresherTriggered = false;
  }
}

async function onScrollToLower() {
  if (activityStore.loading || !activityStore.hasMore) return;
  await activityStore.fetchMoreActivities();
}

/* ========== 报名 ========== */
async function toggleEnroll(activityId: string) {
  await activityStore.enrollActivity(activityId);
}

/** 截取描述前50字 */
function shortDesc(desc?: string): string {
  if (!desc) return "";
  return desc.length > 50 ? desc.slice(0, 50) + "..." : desc;
}

/* ================================================================
   日历视图相关逻辑
   ================================================================ */

/** 星期标题（周一开始） */
const WEEK_DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

/** 当前用户学校名称 */
const myCampusName = computed(() => {
  return sessionStore.userSession?.campusName ?? "";
});

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
      if (!map[act.date]) {
        map[act.date] = [];
      }
      map[act.date].push(act);
    }
  }
  return map;
});

/** 有活动的日期集合 */
const activeDates = computed<Set<string>>(() => {
  return new Set(Object.keys(activitiesByDate.value));
});

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

/** 当前月份标题 */
const monthTitle = computed(() => {
  return `${calendarYear.value}年${calendarMonth.value}月`;
});

/** 是否可切换到上个月 */
const canGoPrev = computed(() => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return calendarYear.value > currentYear || (calendarYear.value === currentYear && calendarMonth.value > currentMonth);
});

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

/** 点击日历日期 */
function onCalendarDateTap(cell: CalendarCell) {
  if (!cell.isCurrentMonth) return;
  if (activeDates.value.has(cell.dateStr)) {
    selectedDate.value = cell.dateStr === selectedDate.value ? "" : cell.dateStr;
  }
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
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${month}月${day}日`;
}
</script>

<template>
  <AppShell
    title="线下活动"
    subtitle="从时间清晰、地点明确的小活动开始，把线下见面的压力降下来。"
    :show-tab-bar="false"
  >
    <!-- 加载中（无缓存） -->
    <view v-if="activityStore.loading && !activityStore.activities.length" class="status-box">
      <text class="status-text">正在加载活动内容...</text>
    </view>

    <!-- 加载失败（无缓存） -->
    <view
      v-else-if="!activityStore.activities.length && activityStore.errorMessage"
      class="status-box"
    >
      <text class="status-text status-text--error">{{ activityStore.errorMessage }}</text>
      <button class="retry-btn" @click="activityStore.fetchActivities()">重试</button>
    </view>

    <!-- 暂无活动 -->
    <view v-else-if="!activityStore.activities.length" class="status-box">
      <text class="status-text">暂无活动</text>
    </view>

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
            <text class="view-toggle__text">列表</text>
          </view>
          <view
            class="view-toggle__btn"
            :class="{ 'view-toggle__btn--active': viewMode === 'calendar' }"
            @tap="switchView('calendar')"
          >
            <text class="view-toggle__text">日历</text>
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
        <view class="activity-list">
          <view
            v-for="item in activityStore.activities"
            :key="item.id"
            class="activity-row"
          >
            <view class="row-header">
              <text class="row-title">{{ item.title }}</text>
              <!-- 参与意向人数标记（同校可见） -->
              <view v-if="(item.enrollmentCount ?? item.enrollCount ?? 0) > 0" class="row-enrollment">
                <text class="enrollment-count">{{ item.enrollmentCount ?? item.enrollCount ?? 0 }}</text>
                <text class="enrollment-label">人已报名</text>
              </view>
            </view>

            <text v-if="item.description" class="row-desc">{{ shortDesc(item.description) }}</text>

            <view class="row-detail">
              <view class="row-detail-item">
                <text class="row-icon">📍</text>
                <text class="row-detail-text">{{ item.location }}</text>
              </view>
              <view class="row-detail-item">
                <text class="row-icon">🕐</text>
                <text class="row-detail-text">{{ item.scheduleText }}</text>
              </view>
            </view>

            <button
              class="enroll-btn"
              :class="{ 'enroll-btn--active': item.isEnrolled }"
              :disabled="activityStore.enrolling"
              @click="toggleEnroll(item.id)"
            >
              <text v-if="activityStore.enrolling" class="enroll-btn__loading">...</text>
              <text v-else>{{ item.isEnrolled ? '已感兴趣' : '感兴趣' }}</text>
            </button>
          </view>
        </view>

        <!-- 加载更多提示 -->
        <view v-if="activityStore.loading && activityStore.activities.length" class="loading-more">
          <text class="loading-more__text">加载中...</text>
        </view>
        <view v-else-if="!activityStore.hasMore && activityStore.activities.length" class="loading-more">
          <text class="loading-more__text">没有更多活动了</text>
        </view>

        <SectionCard
          title="下一步"
          subtitle="看到合适活动后，可以继续去寻觅，也可以提交新的活动提案。"
        >
          <BottomActionBar
            primary-label="去寻觅"
            secondary-label="提交活动提案"
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
            <text
              v-if="cell.isCurrentMonth && activitiesByDate[cell.dateStr]?.length"
              class="calendar-cell__title"
            >{{ truncateTitle(activitiesByDate[cell.dateStr][0].title) }}</text>

            <!-- 参与意向人数标记 -->
            <view
              v-if="cell.isCurrentMonth && activitiesByDate[cell.dateStr]?.length"
              class="calendar-cell__count"
            >
              <text class="calendar-cell__count-text">
                {{ activitiesByDate[cell.dateStr].reduce((sum, a) => sum + (a.enrollCount ?? a.enrollmentCount ?? 0), 0) }}人
              </text>
            </view>
          </view>
        </view>

        <!-- 选中日期的活动列表 -->
        <view v-if="selectedDate && selectedDateActivities.length" class="selected-date-panel">
          <view class="selected-date-header">
            <text class="selected-date-header__label">📅 {{ formatDateLabel(selectedDate) }}</text>
            <text class="selected-date-header__count">{{ selectedDateActivities.length }}个活动</text>
          </view>

          <view
            v-for="item in selectedDateActivities"
            :key="item.id"
            class="activity-row"
          >
            <view class="row-header">
              <text class="row-title">{{ item.title }}</text>
              <view v-if="(item.enrollmentCount ?? item.enrollCount ?? 0) > 0" class="row-enrollment">
                <text class="enrollment-count">{{ item.enrollmentCount ?? item.enrollCount ?? 0 }}</text>
                <text class="enrollment-label">人已报名</text>
              </view>
            </view>

            <text v-if="item.description" class="row-desc">{{ shortDesc(item.description) }}</text>

            <view class="row-detail">
              <view class="row-detail-item">
                <text class="row-icon">📍</text>
                <text class="row-detail-text">{{ item.location }}</text>
              </view>
              <view class="row-detail-item">
                <text class="row-icon">🕐</text>
                <text class="row-detail-text">{{ item.scheduleText }}</text>
              </view>
            </view>

            <button
              class="enroll-btn"
              :class="{ 'enroll-btn--active': item.isEnrolled }"
              :disabled="activityStore.enrolling"
              @click="toggleEnroll(item.id)"
            >
              <text v-if="activityStore.enrolling" class="enroll-btn__loading">...</text>
              <text v-else>{{ item.isEnrolled ? '已感兴趣' : '感兴趣' }}</text>
            </button>
          </view>
        </view>

        <!-- 日历底部操作栏 -->
        <SectionCard
          title="下一步"
          subtitle="看到合适活动后，可以继续去寻觅，也可以提交新的活动提案。"
        >
          <BottomActionBar
            primary-label="去寻觅"
            secondary-label="提交活动提案"
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
  display: grid;
  place-items: center;
  gap: 16rpx;
  padding: 64rpx 28rpx;
}

.status-text {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.status-text--error {
  color: var(--td-error-color-6);
}

.retry-btn {
  padding: 14rpx 36rpx;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 14rpx;
  background: var(--td-bg-color-container);
  font-size: 26rpx;
  color: var(--td-brand-color-7);
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
  background: var(--td-bg-color-surface);
  border-radius: 999px;
  padding: 4rpx;
  gap: 4rpx;
}

.view-toggle__btn {
  padding: 10rpx 28rpx;
  border-radius: 999px;
  transition: all 200ms ease;
}

.view-toggle__btn--active {
  background: var(--td-brand-color-7);
}

.view-toggle__text {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
  font-weight: 500;
}

.view-toggle__btn--active .view-toggle__text {
  color: #ffffff;
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
  display: grid;
  gap: 16rpx;
  padding: 0 0 16rpx;
}

.activity-row {
  display: grid;
  gap: 12rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--td-bg-color-container);
  box-shadow: var(--td-shadow-1);
}

.row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
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
  font-size: 28rpx;
  font-weight: 700;
  color: var(--td-brand-color-7);
}

.enrollment-label {
  font-size: 20rpx;
  color: var(--td-text-color-placeholder);
}

.row-desc {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.5;
}

.row-detail {
  display: grid;
  gap: 4rpx;
}

.row-detail-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.row-icon {
  font-size: 24rpx;
  line-height: 1;
}

.row-detail-text {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.enroll-btn {
  width: 100%;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid var(--td-border-level-2-color);
  border-radius: 14rpx;
  background: transparent;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin-top: 4rpx;
}

.enroll-btn--active {
  border-color: var(--td-brand-color-7);
  background: var(--td-brand-color-1);
  color: var(--td-brand-color-7);
}

.enroll-btn__loading {
  letter-spacing: 4rpx;
  color: var(--td-text-color-placeholder);
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0 32rpx;
}

.loading-more__text {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
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
  border-radius: 50%;
  background: var(--td-bg-color-surface);
}

.month-nav__arrow {
  font-size: 36rpx;
  color: var(--td-text-color-secondary);
  line-height: 1;
  font-weight: 300;
}

.month-nav__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
  min-width: 200rpx;
  text-align: center;
}

/* --- 星期标题行 --- */
.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 24rpx 12rpx;
  border-bottom: 1rpx solid var(--td-border-level-1-color);
  margin: 0 28rpx 8rpx;
}

.weekday-row__item {
  text-align: center;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--td-text-color-placeholder);
  padding: 12rpx 0;
}

/* --- 日历网格 --- */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 28rpx;
  gap: 4rpx 0;
}

.calendar-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10rpx 4rpx 14rpx;
  min-height: 120rpx;
  border-radius: 12rpx;
  transition: background 160ms ease;
  position: relative;
}

.calendar-cell--other-month {
  opacity: 0.25;
}

.calendar-cell--today {
  background: var(--td-brand-color-1);
}

.calendar-cell--active {
  cursor: pointer;
}

.calendar-cell--selected {
  background: var(--td-brand-color-2);
  border: 2rpx solid var(--td-brand-color-7);
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
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  line-height: 1;
}

.calendar-cell--today .calendar-cell__day {
  color: var(--td-brand-color-7);
  font-weight: 800;
}

.calendar-cell--other-month .calendar-cell__day {
  color: var(--td-text-color-placeholder);
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
  border-radius: 50%;
  background: var(--td-brand-color-7);
}

/* --- 活动标题（截断10字） --- */
.calendar-cell__title {
  font-size: 18rpx;
  color: var(--td-brand-color-7);
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
  color: var(--td-text-color-placeholder);
  font-weight: 500;
}

/* --- 选中日期活动面板 --- */
.selected-date-panel {
  margin: 16rpx 28rpx;
  display: grid;
  gap: 16rpx;
}

.selected-date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}

.selected-date-header__label {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.selected-date-header__count {
  font-size: 24rpx;
  color: var(--td-brand-color-7);
  background: var(--td-brand-color-1);
  padding: 6rpx 16rpx;
  border-radius: 999px;
  font-weight: 500;
}
</style>