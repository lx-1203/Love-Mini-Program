import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface Course {
  id: string;
  name: string;
  classroom: string;
  dayOfWeek: number; // 0-4 周一到周五
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export const useScheduleStore = defineStore("schedule", () => {
  // 课程列表
  const courses = ref<Course[]>([
    {
      id: "1",
      name: "高等数学",
      classroom: "教三201",
      dayOfWeek: 0,
      startTime: "08:00",
      endTime: "09:35",
    },
    {
      id: "2",
      name: "大学英语",
      classroom: "外语楼301",
      dayOfWeek: 0,
      startTime: "14:00",
      endTime: "15:35",
    },
    {
      id: "3",
      name: "线性代数",
      classroom: "教二105",
      dayOfWeek: 1,
      startTime: "10:00",
      endTime: "11:35",
    },
    {
      id: "4",
      name: "数据结构",
      classroom: "机房A",
      dayOfWeek: 2,
      startTime: "08:00",
      endTime: "09:35",
    },
    {
      id: "5",
      name: "体育",
      classroom: "体育馆",
      dayOfWeek: 3,
      startTime: "14:00",
      endTime: "15:35",
    },
    {
      id: "6",
      name: "马克思主义基本原理",
      classroom: "教一101",
      dayOfWeek: 4,
      startTime: "10:00",
      endTime: "11:35",
    },
  ]);

  // 时间段配置
  const timeSlots = ref([
    { start: "08:00", end: "09:35" },
    { start: "10:00", end: "11:35" },
    { start: "14:00", end: "15:35" },
    { start: "16:00", end: "17:35" },
    { start: "19:00", end: "20:35" },
  ]);

  // 获取某天的课程
  function getCoursesByDay(dayOfWeek: number): Course[] {
    return courses.value.filter((c) => c.dayOfWeek === dayOfWeek);
  }

  // 检查某个时间段是否空闲
  function isTimeSlotFree(dayOfWeek: number, slotIndex: number): boolean {
    const slot = timeSlots.value[slotIndex];
    const dayCourses = getCoursesByDay(dayOfWeek);
    return !dayCourses.some(
      (c) =>
        (c.startTime <= slot.start && c.endTime > slot.start) ||
        (c.startTime < slot.end && c.endTime >= slot.end) ||
        (c.startTime >= slot.start && c.endTime <= slot.end)
    );
  }

  // 获取某天的空闲时段
  const freeTimeSlots = computed(() => {
    return (dayOfWeek: number) => {
      return timeSlots.value.map((slot, index) => ({
        ...slot,
        index,
        isFree: isTimeSlotFree(dayOfWeek, index),
      }));
    };
  });

  // 添加课程
  function addCourse(course: Omit<Course, "id">) {
    const id = String(Date.now());
    courses.value.push({ ...course, id });
  }

  // 删除课程
  function removeCourse(courseId: string) {
    const index = courses.value.findIndex((c) => c.id === courseId);
    if (index > -1) {
      courses.value.splice(index, 1);
    }
  }

  return {
    courses,
    timeSlots,
    getCoursesByDay,
    isTimeSlotFree,
    freeTimeSlots,
    addCourse,
    removeCourse,
  };
});
