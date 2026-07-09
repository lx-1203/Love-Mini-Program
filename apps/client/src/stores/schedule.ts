import { defineStore } from "pinia";
import { ref, computed } from "vue";

/**
 * 课表项类型
 * - course: 课程（蓝色块）
 * - activity: 活动（绿色块）
 * - custom: 自定义（橙色块）
 */
export type ScheduleItemType = "course" | "activity" | "custom";

/**
 * 课表项（统一数据模型，支持课程 / 活动 / 自定义三类）
 * 共享字段：type + dayOfWeek + startTime + endTime
 * 各类型特有字段：见下方 optional 字段
 */
export interface ScheduleItem {
  id: string;
  type: ScheduleItemType;
  /** 0-6：周一到周日 */
  dayOfWeek: number;
  /** HH:mm */
  startTime: string;
  /** HH:mm */
  endTime: string;

  // 课程特有
  courseName?: string;
  classroom?: string;
  teacher?: string;

  // 活动特有
  activityName?: string;
  sponsor?: string;

  // 课程 / 活动 / 自定义共享的位置字段
  location?: string;

  // 自定义特有
  title?: string;
  note?: string;
}

/** 周一到周日 */
export const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;

export const useScheduleStore = defineStore("schedule", () => {
  /**
   * 课表项列表（mock 数据：3 课程 + 2 活动 + 1 自定义，覆盖周一到周日不同时段）
   */
  const scheduleItems = ref<ScheduleItem[]>([
    // ===== 课程（3 个）=====
    {
      id: "c-1",
      type: "course",
      dayOfWeek: 0, // 周一
      startTime: "08:00",
      endTime: "09:35",
      courseName: "高等数学",
      classroom: "教三201",
      teacher: "王教授",
    },
    {
      id: "c-2",
      type: "course",
      dayOfWeek: 2, // 周三
      startTime: "10:00",
      endTime: "11:35",
      courseName: "数据结构",
      classroom: "机房A",
      teacher: "李教授",
    },
    {
      id: "c-3",
      type: "course",
      dayOfWeek: 4, // 周五
      startTime: "14:00",
      endTime: "15:35",
      courseName: "大学英语",
      classroom: "外语楼301",
      teacher: "张老师",
    },
    // ===== 活动（2 个）=====
    {
      id: "a-1",
      type: "activity",
      dayOfWeek: 1, // 周二
      startTime: "19:00",
      endTime: "20:35",
      activityName: "社团破冰",
      location: "学生活动中心",
      sponsor: "校学生会",
    },
    {
      id: "a-2",
      type: "activity",
      dayOfWeek: 5, // 周六
      startTime: "14:00",
      endTime: "17:00",
      activityName: "篮球友谊赛",
      location: "体育馆",
      sponsor: "篮球社",
    },
    // ===== 自定义（1 个）=====
    {
      id: "u-1",
      type: "custom",
      dayOfWeek: 6, // 周日
      startTime: "10:00",
      endTime: "12:00",
      title: "图书馆自习",
      location: "图书馆三楼",
      note: "期末复习冲刺",
    },
  ]);

  /**
   * 时间段配置（5 个时段：上午 2 段 + 下午 2 段 + 晚上 1 段）
   */
  const timeSlots = ref([
    { start: "08:00", end: "09:35" },
    { start: "10:00", end: "11:35" },
    { start: "14:00", end: "15:35" },
    { start: "16:00", end: "17:35" },
    { start: "19:00", end: "20:35" },
  ]);

  /** 判断两个时间区间是否重叠 */
  function isOverlap(
    aStart: string,
    aEnd: string,
    bStart: string,
    bEnd: string
  ): boolean {
    return (
      (aStart <= bStart && aEnd > bStart) ||
      (aStart < bEnd && aEnd >= bEnd) ||
      (aStart >= bStart && aEnd <= bEnd)
    );
  }

  /** 获取某天的所有课表项 */
  function getItemsByDay(dayOfWeek: number): ScheduleItem[] {
    return scheduleItems.value.filter((c) => c.dayOfWeek === dayOfWeek);
  }

  /** 检查某个时间段是否空闲 */
  function isTimeSlotFree(dayOfWeek: number, slotIndex: number): boolean {
    const slot = timeSlots.value[slotIndex];
    if (!slot) return true;
    const dayItems = getItemsByDay(dayOfWeek);
    return !dayItems.some((c) => isOverlap(c.startTime, c.endTime, slot.start, slot.end));
  }

  /** 获取某天某时段的课表项（若有） */
  function getItemForSlot(
    dayOfWeek: number,
    slotIndex: number
  ): ScheduleItem | undefined {
    const slot = timeSlots.value[slotIndex];
    if (!slot) return undefined;
    const dayItems = getItemsByDay(dayOfWeek);
    return dayItems.find((c) =>
      isOverlap(c.startTime, c.endTime, slot.start, slot.end)
    );
  }

  /** 获取某天的时段视图（含 isFree 与 item 信息） */
  const dayTimeSlots = computed(() => {
    return (dayOfWeek: number) => {
      return timeSlots.value.map((slot, index) => ({
        ...slot,
        index,
        isFree: isTimeSlotFree(dayOfWeek, index),
        item: getItemForSlot(dayOfWeek, index),
      }));
    };
  });

  // 兼容旧 API（保留 freeTimeSlots 名称以避免潜在引用断裂）
  const freeTimeSlots = dayTimeSlots;

  /** 添加课表项 */
  function addItem(item: Omit<ScheduleItem, "id">) {
    const id = `s-${Date.now()}`;
    scheduleItems.value.push({ ...item, id });
  }

  /** 删除课表项 */
  function removeItem(itemId: string) {
    const index = scheduleItems.value.findIndex((c) => c.id === itemId);
    if (index > -1) {
      scheduleItems.value.splice(index, 1);
    }
  }

  return {
    scheduleItems,
    timeSlots,
    weekDays: WEEK_DAYS,
    getItemsByDay,
    getItemForSlot,
    isTimeSlotFree,
    dayTimeSlots,
    freeTimeSlots,
    addItem,
    removeItem,
  };
});
