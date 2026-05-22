import { defineStore } from "pinia";

export interface ActivityItem {
  id: string;
  title: string;
  location: string;
  scheduleText: string;
  isEnrolled?: boolean;
}

/** Mock 活动数据 */
const mockActivities: ActivityItem[] = [
  {
    id: "act-1",
    title: "电影社轻松线下碰面",
    location: "校内电影院",
    scheduleText: "周六 14:00 - 16:00",
  },
  {
    id: "act-2",
    title: "周末徒步西湖",
    location: "西湖景区",
    scheduleText: "周日 08:00 - 15:00",
  },
  {
    id: "act-3",
    title: "校园读书分享会",
    location: "图书馆二楼",
    scheduleText: "周三 19:00 - 21:00",
  },
  {
    id: "act-4",
    title: "篮球友谊赛",
    location: "体育馆",
    scheduleText: "周五 16:00 - 18:00",
  },
];

/**
 * 线下活动 Store
 *
 * 管理活动列表、报名/取消报名状态。
 * 对应后端 GET /api/recommendations/activities
 */
export const useActivityStore = defineStore("activity", {
  state: () => ({
    /** 活动列表 */
    activities: [] as ActivityItem[],
    /** 是否正在加载 */
    loading: false,
    /** 错误信息 */
    errorMessage: null as string | null,
  }),

  actions: {
    /**
     * 获取活动列表
     * 当前使用 mock 数据，后续替换为真实 API 调用
     */
    async fetchActivities() {
      this.loading = true;
      this.errorMessage = null;
      try {
        this.activities = mockActivities;
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : "加载活动失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 切换活动的报名状态
     * @param activityId - 活动 ID
     */
    async enrollActivity(activityId: string) {
      const activity = this.activities.find((a) => a.id === activityId);
      if (activity) {
        activity.isEnrolled = !activity.isEnrolled;
      }
    },
  },
});