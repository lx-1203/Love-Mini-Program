import { defineStore } from "pinia";
// 修复（严格模式 noUnusedLocals）：clientApi 已不再被本文件使用（分页契约统一后
// fetchActivities 与 fetchMoreActivities 均直接使用 request），移除 import。
import { request } from "../services/http";
import { useMock } from "./helpers/use-mock";
// 2026-08-10 切换提速：活动列表 30s TTL 缓存（home/village/discover 多入口去重）
import { isCacheFresh, setCachedValue } from "../utils/cache-ttl";

/** 活动列表新鲜度窗口 */
const ACTIVITIES_TTL_MS = 30_000;
import type { components } from "../services/generated/api-types";
// 统一图片资源路径常量，避免在 store 中硬编码字符串
import { IMAGE_PATHS } from "@/config/images";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";

type Schemas = components["schemas"];

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
  /** 活动状态：open=报名中, ongoing=进行中, upcoming=预告, ended=已结束, closed=已关闭 */
  status?: "open" | "ongoing" | "upcoming" | "ended" | "closed";
  /** 活动封面图 */
  coverImage?: string;
  /** 活动分类 code（social/sports/game/study/volunteer/food/music/other，R4 2026-08-09） */
  category?: string;
}

/* ========== Mock 数据 ========== */

/**
 * 生成相对今天的日期（ISO yyyy-MM-dd）。
 * 修复（admin-mock-review #49）：原 mock 活动日期固定 2026-05-22~29，
 * 时间一过全部显示已过期；现改为相对当天偏移，保证 mock 数据永不过期。
 */
function relativeDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const mockActivities: ActivityItem[] = [
  // infra R2-00092: 以下 mock 活动标题/描述为演示数据（useMock 守卫），real 分支由后端下发；
  // id 使用 "a-*" 字符串以兼容前端 string 化 id 契约（real 数字 id 会统一转 string）
  {
    id: "a-1",
    title: "图书馆南门咖啡散步",
    location: "南门咖啡馆",
    scheduleText: "周四 19:00-20:00",
    date: relativeDate(1),
    enrollCount: 12,
    description: "在安静的咖啡馆里，和志同道合的朋友一起聊天放松",
    enrollmentCount: 12,
    participantAvatars: [],
    isEnrolled: false,
    status: "open",
    coverImage: IMAGE_PATHS.ACTIVITIES.ACTIVITY_STUDY,
  },
  {
    id: "a-2",
    title: "电影社轻松线下碰面",
    location: "影像楼 B 厅",
    scheduleText: "周六 15:00-17:00",
    date: relativeDate(3),
    enrollCount: 8,
    description: "一起看电影，认识新朋友",
    enrollmentCount: 8,
    participantAvatars: [],
    isEnrolled: false,
    status: "upcoming",
    coverImage: IMAGE_PATHS.BANNERS.VILLAGE,
  },
  {
    id: "a-3",
    title: "周末篮球友谊赛",
    location: "体育馆",
    scheduleText: "周日 10:00-12:00",
    date: relativeDate(0),
    enrollCount: 20,
    description: "篮球爱好者集合，友谊第一比赛第二",
    enrollmentCount: 20,
    participantAvatars: [],
    isEnrolled: true,
    status: "ongoing",
    coverImage: IMAGE_PATHS.ACTIVITIES.ACTIVITY_SPORTS,
  },
  {
    id: "a-4",
    title: "校园音乐节",
    location: "大礼堂",
    scheduleText: "下周五 19:00-21:00",
    date: relativeDate(7),
    enrollCount: 56,
    description: "校园歌手大赛决赛，精彩不容错过",
    enrollmentCount: 56,
    participantAvatars: [],
    isEnrolled: false,
    status: "open",
    coverImage: IMAGE_PATHS.PRODUCTS.TICKET_1,
  },
];

/** 单页大小 */
const DEFAULT_PAGE_SIZE = 10;

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
    /** 报名中的活动 ID 集合（并发守卫：同一活动禁止重复提交报名/取消） */
    enrollingActivityIds: new Set<string>() as Set<string>,
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
     * Real 模式调用 GET /api/recommendations/activities
     *
     * 修复（P1 BUG）：原实现调用 clientApi.getActivityRecommendations()（无分页参数），
     * 与 fetchMoreActivities 的 ?page=N&pageSize=M 契约不一致。现统一走 request 并
     * 显式传 page=1&pageSize，保证首次加载与加载更多使用同一分页契约，hasMore 判断一致。
     */
    async fetchActivities() {
      // 2026-08-10 切换提速：30s 内已加载且有数据时直接跳过
      if (!useMock() && this.activities.length > 0 && isCacheFresh('activities:list', ACTIVITIES_TTL_MS)) {
        return;
      }
      this.loading = true;
      this.errorMessage = null;
      try {
        if (useMock()) {
          this.activities = [...mockActivities];
          this.page = 1;
          this.hasMore = false;
          return;
        }

        // 调用后端 API: GET /api/recommendations/activities?page=1&pageSize={pageSize}
        // 后端返回 Page<ActivityView>
        const data = await request<Schemas["ActivityRecommendation"][]>({
          url: `/recommendations/activities?page=1&pageSize=${this.pageSize}`,
          method: "GET",
        });
        this.activities = data.map((item) => this.mapToActivityItem(item));
        this.page = 1;
        this.hasMore = data.length >= this.pageSize;
        // 2026-08-10 切换提速：拉取成功后刷新缓存时间戳
        setCachedValue("activities:list", true);
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : t("storeErrors.activity.loadActivitiesFailed");
      } finally {
        this.loading = false;
      }
    },

    /**
     * 加载更多活动（分页追加）
     *
     * 修复（P1 BUG）：原实现未将 nextPage 传递给后端，每次都请求第一页数据，
     * 导致分页失效（永远只能加载到第一页内容，造成数据重复展示）。
     * 现通过 query 参数 `page` 将目标页码传给后端，并使用 nextPage 局部变量
     * 避免请求失败时污染 this.page 状态。
     */
    async fetchMoreActivities() {
      if (this.loading || !this.hasMore) return;

      this.loading = true;
      // 使用局部变量保存 nextPage，仅在请求成功后才更新 this.page
      // 避免请求失败后 this.page 仍被错误推进
      const nextPage = this.page + 1;
      try {
        if (useMock()) {
          // Mock 模式下没有更多数据
          this.hasMore = false;
          return;
        }

        // 修复（P1 BUG）：将 nextPage 作为 query 参数传递给后端
        // 直接调用 request 以避免破坏 clientApi.getActivityRecommendations 的签名
        const data = await request<Schemas["ActivityRecommendation"][]>({
          url: `/recommendations/activities?page=${nextPage}&pageSize=${this.pageSize}`,
          method: "GET",
        });
        const mapped = data.map((item) => this.mapToActivityItem(item));
        // 将新数据追加到列表末尾
        this.activities = [...this.activities, ...mapped];
        // 仅在请求成功后更新 this.page
        this.page = nextPage;
        this.hasMore = data.length >= this.pageSize;
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : t("storeErrors.activity.loadMoreFailed");
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
    async enrollActivity(activityId: string): Promise<boolean> {
      // 修复（P1 BUG）：并发守卫——同一活动在途的报名/取消请求未完成时
      // 拒绝再次提交，避免快速连点触发多次报名/取消请求导致状态错乱
      if (this.enrollingActivityIds.has(activityId)) {
        return false;
      }
      const activity = this.activities.find((a) => a.id === activityId);
      if (!activity) return false;

      this.enrolling = true;
      this.enrollingActivityIds.add(activityId);
      try {
        if (useMock()) {
          activity.isEnrolled = !activity.isEnrolled;
          if (activity.isEnrolled) {
            // 修复：enrollCount 与 enrollmentCount 为同一字段的兼容别名，
            // 必须同步更新，避免 UI（消费 enrollCount）与 API（消费 enrollmentCount）数据不一致。
            activity.enrollCount = (activity.enrollCount ?? 0) + 1;
            activity.enrollmentCount = (activity.enrollmentCount ?? 0) + 1;
          } else {
            activity.enrollCount = Math.max((activity.enrollCount ?? 1) - 1, 0);
            activity.enrollmentCount = Math.max(
              (activity.enrollmentCount ?? 1) - 1,
              0,
            );
          }
          return activity.isEnrolled;
        }

        // P2-13：报名/取消报名 userId 均由后端 JWT 获取，客户端不再获取/携带
        // 修复（2026-08-09）：幂等 key 必须带操作序号——取消成功后重新报名是新的
        // 业务操作，若沿用固定 key（activity-enroll-{id}）会被后端幂等缓存（TTL 内）
        // 拦截返回 409「重复请求已被拦截」→ 用户看到「已参与过无法再参与」。
        // 防重由上方 enrollingActivityIds 并发守卫承担，key 只需保证单次请求唯一。
        const opSeq = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        if (activity.isEnrolled) {
          // 取消报名：调用 DELETE /api/activities/{activityId}/enroll
          // P2-13: userId 由后端 JWT 获取（ActivityController.enrollActivity 仅接收 path id），删除 query
          const result = await request<{ activityId: number; enrolled: boolean; enrollmentCount: number }>({
            url: `/activities/${activityId}/enroll`,
            method: "DELETE",
            headers: { "Idempotency-Key": `activity-cancel-${activityId}-${opSeq}` },
          });
          activity.isEnrolled = result.enrolled;
          // R4-00182：enrollCount（列表 UI 消费）与 enrollmentCount（API 消费）兼容别名同步更新
          activity.enrollmentCount = result.enrollmentCount;
          activity.enrollCount = result.enrollmentCount;
        } else {
          // 报名：调用 POST /api/activities/{activityId}/enroll
          // P2-13: userId 由后端 JWT 获取（ActivityController.enrollActivity 无请求体 userId 字段），删除 body 字段
          const result = await request<{ activityId: number; enrolled: boolean; enrollmentCount: number }>({
            url: `/activities/${activityId}/enroll`,
            method: "POST",
            headers: { "Idempotency-Key": `activity-enroll-${activityId}-${opSeq}` },
          });
          activity.isEnrolled = result.enrolled;
          // R4-00182：两字段同步更新（对齐 mock 分支）
          activity.enrollmentCount = result.enrollmentCount;
          activity.enrollCount = result.enrollmentCount;
        }
        return activity.isEnrolled;
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : t("storeErrors.activity.registerFailed");
        return false;
      } finally {
        this.enrollingActivityIds.delete(activityId);
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

        // 调用后端 API: GET /api/activities/{activityId}（P2-13：userId 由后端 JWT 获取，不再携带 query）
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
          url: `/activities/${activityId}`,
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
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.activity.loadDetailFailed");
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
        // R4（2026-08-09）：活动分类与封面（场景展示）
        category?: string;
        coverImage?: string;
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
        category: raw.category ?? "other",
        coverImage: raw.coverImage ?? undefined,
      };
    },
  },
});