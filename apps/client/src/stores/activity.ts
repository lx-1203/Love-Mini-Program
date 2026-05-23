import { defineStore } from "pinia";
import { appEnv } from "../services/env";
import { clientApi } from "../services/api";
import { request } from "../services/http";
import { useSessionStore } from "./session";

export interface ActivityItem {
  id: string;
  title: string;
  location: string;
  scheduleText: string;
  /** 活动日期（YYYY-MM-DD 格式，用于日历视图） */
  date: string;
  /** 参与意向人数 */
  enrollCount: number;
  /** 活动简短描述 */
  description?: string;
  /** 报名人数（同 enrollCount，兼容旧字段） */
  enrollmentCount?: number;
  /** 已报名用户头像列表 */
  participantAvatars?: string[];
  isEnrolled?: boolean;
}

/* ========== Mock 数据 ========== */

const mockActivities: ActivityItem[] = [
  {
    id: "a-1",
    title: "图书馆南门咖啡散步",
    location: "南门咖啡馆",
    scheduleText: "周四 19:00-20:00",
    date: "2026-05-22",
    enrollCount: 12,
    description: "在安静的咖啡馆里，和志同道合的朋友一起聊天放松",
    enrollmentCount: 12,
    participantAvatars: [],
    isEnrolled: false,
  },
  {
    id: "a-2",
    title: "电影社轻松线下碰面",
    location: "影像楼 B 厅",
    scheduleText: "周六 15:00-17:00",
    date: "2026-05-24",
    enrollCount: 8,
    description: "一起看电影，认识新朋友",
    enrollmentCount: 8,
    participantAvatars: [],
    isEnrolled: false,
  },
];

/** 单页大小 */
const DEFAULT_PAGE_SIZE = 10;

function useMock() {
  return appEnv.apiMode === "mock";
}

/**
 * 线下活动 Store
 *
 * 管理活动列表、报名/取消报名状态，支持分页加载。
 * 数据来源：GET /api/recommendations/activities 或 GET /api/activities
 * 报名操作：POST /api/activities/{id}/enroll
 */
export const useActivityStore = defineStore("activity", {
  state: () => ({
    /** 活动列表 */
    activities: [] as ActivityItem[],
    /** 是否正在首次加载 */
    loading: false,
    /** 是否正在报名中（某个活动） */
    enrolling: false,
    /** 错误信息 */
    errorMessage: null as string | null,
    /** 当前页码（从 1 开始） */
    page: 1,
    /** 每页大小 */
    pageSize: DEFAULT_PAGE_SIZE,
    /** 是否还有更多数据 */
    hasMore: true,
  }),

  getters: {
    /**
     * 是否有活动数据
     */
    hasActivities(): boolean {
      return this.activities.length > 0;
    },
  },

  actions: {
    /**
     * 获取活动列表（首次加载或刷新）
     * Real 模式调用 GET /api/activities
     */
    async fetchActivities() {
      this.loading = true;
      this.errorMessage = null;
      try {
        if (useMock()) {
          this.activities = [...mockActivities];
          this.page = 1;
          this.hasMore = false;
          return;
        }

        // 调用后端 API: GET /api/activities
        // 后端返回 Page<ActivityView>
        const data = await clientApi.getActivityRecommendations();
        this.activities = data.map((item) => this.mapToActivityItem(item));
        this.page = 1;
        this.hasMore = data.length >= this.pageSize;
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : "加载活动失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 加载更多活动（分页追加）
     */
    async fetchMoreActivities() {
      if (this.loading || !this.hasMore) return;

      this.loading = true;
      const nextPage = this.page + 1;
      try {
        if (useMock()) {
          // Mock 模式下没有更多数据
          this.hasMore = false;
          return;
        }

        const data = await clientApi.getActivityRecommendations();
        const mapped = data.map((item) => this.mapToActivityItem(item));
        // 将新数据追加到列表末尾
        this.activities = [...this.activities, ...mapped];
        this.page = nextPage;
        this.hasMore = data.length >= this.pageSize;
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : "加载更多活动失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 报名活动
     * 调用 POST /api/activities/{activityId}/enroll
     * 后端请求体: ActivityEnrollRequest(userId)
     * @param activityId - 活动 ID
     */
    async enrollActivity(activityId: string) {
      const activity = this.activities.find((a) => a.id === activityId);
      if (!activity) return;

      this.enrolling = true;
      try {
        if (useMock()) {
          activity.isEnrolled = !activity.isEnrolled;
          if (activity.isEnrolled) {
            activity.enrollmentCount = (activity.enrollmentCount ?? 0) + 1;
          } else {
            activity.enrollmentCount = Math.max(
              (activity.enrollmentCount ?? 1) - 1,
              0,
            );
          }
          return;
        }

        // 获取当前用户 ID
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";

        // 调用后端 API: POST /api/activities/{activityId}/enroll
        // 后端请求体: { userId: Long }
        const result = await request<{ activityId: number; enrolled: boolean; enrollmentCount: number }>({
          url: `/activities/${activityId}/enroll`,
          method: "POST",
          data: { userId },
        });
        // 根据后端返回更新本地状态
        activity.isEnrolled = result.enrolled;
        activity.enrollmentCount = result.enrollmentCount;
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : "报名操作失败";
      } finally {
        this.enrolling = false;
      }
    },

    /**
     * 将 API 返回的活动数据映射为 ActivityItem
     */
    mapToActivityItem(
      raw: {
        id: string;
        title: string;
        location: string;
        scheduleText: string;
        date?: string;
        description?: string;
        enrollmentCount?: number;
        enrollCount?: number;
        participantAvatars?: string[];
        isEnrolled?: boolean;
      },
    ): ActivityItem {
      return {
        id: raw.id,
        title: raw.title,
        location: raw.location,
        scheduleText: raw.scheduleText,
        date: raw.date ?? "",
        enrollCount: raw.enrollCount ?? raw.enrollmentCount ?? 0,
        description: raw.description ?? "",
        enrollmentCount: raw.enrollmentCount ?? raw.enrollCount ?? 0,
        participantAvatars: raw.participantAvatars ?? [],
        isEnrolled: raw.isEnrolled ?? false,
      };
    },
  },
});