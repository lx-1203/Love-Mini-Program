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
  /** 活动状态：open=报名中, ongoing=进行中, upcoming=预告 */
  status?: "open" | "ongoing" | "upcoming";
  /** 活动封面图 */
  coverImage?: string;
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
    status: "open",
    coverImage: "https://picsum.photos/300/200?random=20",
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
    status: "upcoming",
    coverImage: "https://picsum.photos/300/200?random=21",
  },
  {
    id: "a-3",
    title: "周末篮球友谊赛",
    location: "体育馆",
    scheduleText: "周日 10:00-12:00",
    date: "2026-05-25",
    enrollCount: 20,
    description: "篮球爱好者集合，友谊第一比赛第二",
    enrollmentCount: 20,
    participantAvatars: [],
    isEnrolled: true,
    status: "ongoing",
    coverImage: "https://picsum.photos/300/200?random=22",
  },
  {
    id: "a-4",
    title: "校园音乐节",
    location: "大礼堂",
    scheduleText: "下周五 19:00-21:00",
    date: "2026-05-29",
    enrollCount: 56,
    description: "校园歌手大赛决赛，精彩不容错过",
    enrollmentCount: 56,
    participantAvatars: [],
    isEnrolled: false,
    status: "open",
    coverImage: "https://picsum.photos/300/200?random=23",
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
     * 报名/取消报名活动
     * 报名调用 POST /api/activities/{activityId}/enroll
     * 取消报名调用 DELETE /api/activities/{activityId}/enroll
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

        if (activity.isEnrolled) {
          // 取消报名：调用 DELETE /api/activities/{activityId}/enroll
          const result = await request<{ activityId: number; enrolled: boolean; enrollmentCount: number }>({
            url: `/activities/${activityId}/enroll`,
            method: "DELETE",
            data: { userId },
          });
          activity.isEnrolled = result.enrolled;
          activity.enrollmentCount = result.enrollmentCount;
        } else {
          // 报名：调用 POST /api/activities/{activityId}/enroll
          const result = await request<{ activityId: number; enrolled: boolean; enrollmentCount: number }>({
            url: `/activities/${activityId}/enroll`,
            method: "POST",
            data: { userId },
          });
          activity.isEnrolled = result.enrolled;
          activity.enrollmentCount = result.enrollmentCount;
        }
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : "报名操作失败";
      } finally {
        this.enrolling = false;
      }
    },

    /**
     * 获取活动详情
     * Real 模式调用 GET /api/activities/{id}
     * @param activityId - 活动 ID
     */
    async fetchActivityDetail(activityId: string): Promise<ActivityItem | null> {
      this.errorMessage = null;

      try {
        if (useMock()) {
          return this.activities.find((a) => a.id === activityId) ?? null;
        }

        // 调用后端 API: GET /api/activities/{activityId}
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        const data = await request<{
          id: number;
          title: string;
          location: string;
          scheduleText: string;
          description: string;
          enrollmentCount: number;
          participantAvatars: string[];
          status: string;
          activityDate: string;
          isEnrolled: boolean;
        }>({
          url: `/activities/${activityId}?userId=${userId}`,
          method: "GET",
        });

        return {
          id: String(data.id),
          title: data.title,
          location: data.location,
          scheduleText: data.scheduleText,
          date: data.activityDate ?? "",
          enrollCount: data.enrollmentCount,
          description: data.description,
          enrollmentCount: data.enrollmentCount,
          participantAvatars: data.participantAvatars,
          isEnrolled: data.isEnrolled,
        };
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "获取活动详情失败";
        return null;
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