// D:\6\恋爱小程序\apps\client\src\stores\campus.ts
import { defineStore } from "pinia";
import { request } from "../services/http";
import { useMock } from "./helpers/use-mock";
// infra R2-00099: mock 发布作者从会话生成
import { useSessionStore } from "./session";
// infra R2-00099: mock 头像统一 IMAGE_PATHS
import { IMAGE_PATHS } from "../config/images";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";
// Mock 数据（R4-batch2：mock 用户/话题数据移入 stores/campus/mock-data.ts，
// 仅 useMock() 分支引用，real 模式不会读取 mock ID）
import { MOCK_CURRENT_USER_ID, mockActivities, mockReplies, mockTopicDetail, mockTopics } from "./campus/mock-data";


/* ========== 后端视图类型 ========== */

/**
 * 后端 CampusTopicView 类型
 * 对应后端 record CampusTopicView(Long id, Long schoolId, String category, String title, String content, String images, Long authorId, String authorName, String authorAvatar, int replyCount, int viewCount, boolean isAnonymous, String createdAt)
 */
export interface BackendCampusTopicView {
  id: number;
  schoolId: number;
  category: string;
  title: string;
  content: string;
  images: string | null;
  authorId: number | null;
  authorName: string;
  authorAvatar: string | null;
  replyCount: number;
  viewCount: number;
  isAnonymous: boolean;
  createdAt: string;
}

/**
 * 后端 CampusTopicReplyView 类型
 */
export interface BackendCampusReplyView {
  id: number;
  topicId: number;
  authorId: number | null;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
}

/**
 * 后端 CampusCertificationView 类型
 */
export interface BackendCertificationView {
  id: number;
  userId: number;
  schoolName: string;
  major: string;
  studentIdCardUrl: string;
  /** 学信网在线验证码（B1-3 学历认证，可空） */
  chsiCode?: string | null;
  /** 学信网学历截图 URL（B1-3 学历认证，可空） */
  chsiScreenshotUrl?: string | null;
  status: string;
  statusLabel: string;
  reviewerId: number | null;
  reviewComment: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

/* ========== 映射函数 ========== */

function mapToCampusTopicItem(raw: BackendCampusTopicView): CampusTopicItem {
  return {
    id: String(raw.id),
    category: raw.category as CampusTopicCategory,
    title: raw.title,
    contentPreview: raw.content ?? "",
    author: {
      userId: raw.authorId != null ? String(raw.authorId) : "",
      name: raw.authorName,
      avatar: raw.authorAvatar ?? "",
      school: "",
    },
    replyCount: raw.replyCount,
    isAnonymous: raw.isAnonymous,
    createdAt: raw.createdAt,
  };
}

function mapToCampusTopicDetail(raw: BackendCampusTopicView): CampusTopicDetail {
  return {
    id: String(raw.id),
    category: raw.category as CampusTopicCategory,
    title: raw.title,
    content: raw.content ?? "",
    author: {
      userId: raw.authorId != null ? String(raw.authorId) : "",
      name: raw.authorName,
      avatar: raw.authorAvatar ?? "",
      school: "",
    },
    replyCount: raw.replyCount,
    isAnonymous: raw.isAnonymous,
    createdAt: raw.createdAt,
  };
}

function mapToCampusReplyItem(raw: BackendCampusReplyView): CampusReplyItem {
  return {
    id: String(raw.id),
    topicId: String(raw.topicId),
    author: {
      userId: raw.authorId != null ? String(raw.authorId) : "",
      name: raw.authorName,
      avatar: raw.authorAvatar ?? "",
      school: "",
    },
    content: raw.content,
    isAnonymous: raw.isAnonymous,
    createdAt: raw.createdAt,
  };
}

function mapCertificationStatus(raw: string): CertificationStatus {
  switch (raw) {
    case "PENDING": return "pending";
    case "APPROVED": return "verified";
    case "REJECTED": return "rejected";
    default: return "unverified";
  }
}

/* ========== 类型定义 ========== */

/** 校园话题分类 */
export type CampusTopicCategory =
  | "course_exchange"
  | "club_recruitment"
  | "campus_activity"
  | "study_help"
  | "life_service"
  | "alumni_news";

/** 分类中文映射 */
export const CAMPUS_CATEGORY_MAP: Record<CampusTopicCategory, string> = {
  course_exchange: "课程交流",
  club_recruitment: "社团招新",
  campus_activity: "校园活动",
  study_help: "学习互助",
  life_service: "生活服务",
  alumni_news: "校友动态",
};

/** 认证状态 */
export type CertificationStatus = "unverified" | "pending" | "verified" | "rejected";

/** 认证状态中文映射 */
export const CERT_STATUS_MAP: Record<CertificationStatus, string> = {
  unverified: "未认证",
  pending: "审核中",
  verified: "已认证",
  rejected: "未通过",
};

/** 话题作者信息 */
export interface CampusTopicAuthor {
  userId: string;
  name: string;
  avatar: string;
  school: string;
}

/** 校园话题列表项 */
export interface CampusTopicItem {
  id: string;
  category: CampusTopicCategory;
  title: string;
  contentPreview: string;
  author: CampusTopicAuthor;
  replyCount: number;
  isAnonymous: boolean;
  createdAt: string;
}

/** 校园话题详情 */
export interface CampusTopicDetail {
  id: string;
  category: CampusTopicCategory;
  title: string;
  content: string;
  author: CampusTopicAuthor;
  replyCount: number;
  isAnonymous: boolean;
  createdAt: string;
}

/** 校园回复项 */
export interface CampusReplyItem {
  id: string;
  topicId: string;
  author: CampusTopicAuthor;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
}

/** 校园活动 */
export interface CampusActivity {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  startTime: string;
  endTime: string;
  location: string;
  organizer: string;
  participantCount: number;
  maxParticipants: number;
}

/** CampusStore 状态 */
export interface CampusState {
  /** 当前选中的分类 */
  activeCategory: CampusTopicCategory;
  /** 当前分类的话题列表 */
  topics: CampusTopicItem[];
  /** 当前话题详情 */
  currentTopic: CampusTopicDetail | null;
  /** 当前话题的回复列表 */
  replies: CampusReplyItem[];
  /** 校园活动列表 */
  activities: CampusActivity[];
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  errorMessage: string | null;
  /** 话题列表当前页码 */
  topicPage: number;
  /** 话题列表是否还有更多 */
  topicHasMore: boolean;
  /** 认证状态 */
  certificationStatus: CertificationStatus;
  /** 认证信息 */
  certificationInfo: {
    schoolName: string;
    major: string;
    studentCardUrl: string;
    reviewComment: string;
  } | null;
  /**
   * Task 3.6.3：从后端 /api/v1/config/filter-options 动态加载的分类映射缓存。
   *
   * 仅缓存 campus_topic_category 维度的 {value: label} 映射，用于覆盖
   * 本地 CAMPUS_CATEGORY_MAP 静态默认值。null 表示尚未加载，调用
   * categoryLabelOf getter 时回退到 CAMPUS_CATEGORY_MAP。
   */
  dynamicCategoryMap: Record<string, string> | null;
}

/** 每页话题数量 */
const TOPIC_PAGE_SIZE = 10;

/**
 * 校园话题列表请求竞态 token。
 * 递增计数：快速切换分类/翻页时，仅最新 token 的请求允许更新状态，
 * 旧请求的响应被静默丢弃，避免覆盖新请求结果。
 */
let fetchCampusTopicsToken = 0;

/**
 * 格式化相对时间
 */
export function formatCampusTime(dateStr: string): string {
  const now = Date.now();
  const then = Date.parse(dateStr);
  const diff = now - then;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  return `${Math.floor(diff / day)}天前`;
}

/**
 * 校园社交 Store
 *
 * 管理校园话题列表、话题详情、回复、校园活动、认证状态等数据。
 * 支持 mock 模式与 real 模式双模式切换。
 */
export const useCampusStore = defineStore("campus", {
  state: (): CampusState => ({
    activeCategory: "course_exchange",
    topics: [],
    currentTopic: null,
    replies: [],
    activities: [],
    loading: false,
    errorMessage: null,
    topicPage: 1,
    topicHasMore: true,
    certificationStatus: "unverified",
    certificationInfo: null,
    // Task 3.6.3：初始为 null，触发 loadFilterOptionsFromBackend 后填充
    dynamicCategoryMap: null,
  }),

  getters: {
    /** 当前分类的话题列表（已由 actions 过滤） */
    categoryTopics: (state): CampusTopicItem[] => {
      return state.topics;
    },

    /** 是否已认证 */
    isVerified: (state): boolean => {
      return state.certificationStatus === "verified";
    },

    /**
     * Task 3.6.3：根据分类 key 获取展示文案。
     *
     * 优先使用 dynamicCategoryMap（后端动态加载），未加载或未命中时
     * 回退到本地 CAMPUS_CATEGORY_MAP 静态默认值，保证功能可用性。
     *
     * @param category - 校园话题分类 key
     * @returns 展示文案（始终返回非空字符串，未匹配时返回原 key）
     */
    categoryLabelOf: (state) => (category: CampusTopicCategory): string => {
      const dynamic = state.dynamicCategoryMap;
      if (dynamic && typeof dynamic[category] === "string") {
        return dynamic[category];
      }
      return CAMPUS_CATEGORY_MAP[category] ?? category;
    },
  },

  actions: {
    /**
     * Task 3.6.3：从后端 /api/v1/config/filter-options 加载筛选选项，
     * 提取 campus_topic_category 维度缓存到 dynamicCategoryMap。
     *
     * 调用时机：进入「校园话题列表页」时调用一次，后续可由用户下拉刷新触发。
     * 失败时静默回退（保留 dynamicCategoryMap 当前值），不阻塞话题列表加载。
     */
    async loadFilterOptionsFromBackend() {
      try {
        // 动态 import 避免循环依赖（services/config → http → ... 与本 store 解耦）
        const { loadFilterOptions } = await import("../services/config");
        const options = await loadFilterOptions();
        const campusTopicCategory = options.find(
          (o) => o.category === "campus_topic_category",
        );
        if (campusTopicCategory && campusTopicCategory.options.length > 0) {
          const map: Record<string, string> = {};
          for (const opt of campusTopicCategory.options) {
            map[opt.value] = opt.label;
          }
          this.dynamicCategoryMap = map;
        }
      } catch (_e) {
        // 后端不可达：保留原 dynamicCategoryMap（可能为 null），getter 回退到 CAMPUS_CATEGORY_MAP
      }
    },

    /**
     * 切换分类
     * @param category - 话题分类
     */
    setActiveCategory(category: CampusTopicCategory) {
      this.activeCategory = category;
      void this.fetchCampusTopics(category, 1);
    },

    /**
     * 获取校园话题列表
     * @param category - 话题分类，默认当前分类
     * @param page - 页码（从 1 开始）
     *
     * 修复（P1 BUG）：新增竞态 token——快速切换分类/翻页时，旧请求返回后
     * 不再覆盖新请求结果（旧请求的响应被静默丢弃）。
     */
    async fetchCampusTopics(category?: CampusTopicCategory, page = 1) {
      // 竞态 token：递增计数，仅最新 token 的请求允许更新状态
      const token = ++fetchCampusTopicsToken;
      this.loading = true;
      this.errorMessage = null;
      const targetCategory = category ?? this.activeCategory;

      try {
        if (useMock()) {
          // 修复：旧请求返回时不再修改状态
          if (token !== fetchCampusTopicsToken) return;
          const filtered = mockTopics.filter((t) => t.category === targetCategory);
          if (page === 1) {
            this.topics = [...filtered];
          } else {
            this.topics.push(...filtered);
          }
          this.topicPage = page;
          this.topicHasMore = filtered.length >= TOPIC_PAGE_SIZE;
          return;
        }

        // 调用后端 API: GET /api/campus/topics?category={category}&page={page}&size={size}
        const data = await request<{ content: BackendCampusTopicView[]; totalElements: number; number: number; size: number }>({
          url: `/campus/topics?category=${encodeURIComponent(targetCategory)}&page=${page - 1}&size=${TOPIC_PAGE_SIZE}`,
          method: "GET",
        });

        // 修复：旧请求返回时不再修改状态
        if (token !== fetchCampusTopicsToken) return;
        const mapped = (data.content ?? []).map(mapToCampusTopicItem);
        if (page === 1) {
          this.topics = mapped;
        } else {
          this.topics.push(...mapped);
        }
        this.topicPage = page;
        this.topicHasMore = (data.content ?? []).length >= TOPIC_PAGE_SIZE;
      } catch (error) {
        // 修复：旧请求的错误不更新 errorMessage
        if (token !== fetchCampusTopicsToken) return;
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.campus.loadTopicsFailed");
      } finally {
        // 修复：仅最新 token 的请求才允许清 loading
        if (token === fetchCampusTopicsToken) {
          this.loading = false;
        }
      }
    },

    /**
     * 获取校园活动列表
     */
    async fetchCampusActivities() {
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.activities = [...mockActivities];
          return;
        }

        // 调用后端 API: GET /api/campus/activities
        const data = await request<CampusActivity[]>({
          url: "/campus/activities",
          method: "GET",
        });
        this.activities = data;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.campus.loadActivitiesFailed");
      }
    },

    /**
     * 获取话题详情
     * @param topicId - 话题 ID
     */
    async fetchCampusTopicDetail(topicId: string) {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (!topicId || topicId.trim().length === 0) {
          this.errorMessage = t("storeErrors.campus.topicIdInvalid");
          throw new Error(t("storeErrors.campus.topicIdInvalid"));
        }

        if (useMock()) {
          const detail = mockTopicDetail[topicId];
          if (detail) {
            this.currentTopic = { ...detail };
          } else {
            const topic = this.topics.find((t) => t.id === topicId);
            if (topic) {
              this.currentTopic = {
                ...topic,
                content: topic.contentPreview,
              };
            } else {
              this.currentTopic = null;
            }
          }
          return;
        }

        // 调用后端 API: GET /api/campus/topics/{topicId}
        const data = await request<BackendCampusTopicView>({
          url: `/campus/topics/${topicId}`,
          method: "GET",
        });
        this.currentTopic = mapToCampusTopicDetail(data);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.campus.loadTopicDetailFailed");
      } finally {
        this.loading = false;
      }
    },

    /**
     * 获取话题回复列表
     * @param topicId - 话题 ID
     * @param page - 页码（从 1 开始）
     */
    async fetchCampusReplies(topicId: string, page = 1) {
      this.errorMessage = null;

      try {
        if (!topicId || topicId.trim().length === 0) {
          this.errorMessage = t("storeErrors.campus.topicIdInvalid");
          throw new Error(t("storeErrors.campus.topicIdInvalid"));
        }

        if (useMock()) {
          const replies = mockReplies[topicId] ?? [];
          if (page === 1) {
            this.replies = [...replies];
          } else {
            this.replies.push(...replies);
          }
          return;
        }

        // 调用后端 API: GET /api/campus/topics/{topicId}/replies?page={page}
        const data = await request<{ content: BackendCampusReplyView[]; totalElements: number; number: number; size: number }>({
          url: `/campus/topics/${topicId}/replies?page=${page - 1}`,
          method: "GET",
        });

        const mapped = (data.content ?? []).map(mapToCampusReplyItem);
        if (page === 1) {
          this.replies = mapped;
        } else {
          this.replies.push(...mapped);
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.campus.loadRepliesFailed");
      }
    },

    /**
     * 创建新话题
     * @param data - 话题数据
     */
    async createCampusTopic(data: {
      category: CampusTopicCategory;
      title: string;
      content: string;
      isAnonymous: boolean;
      /** 2026-08-10 B5：话题标签（后端 ≤5 个、每个 ≤20 字符；mock 分支由调用方拼入内容） */
      tags?: string[];
    }) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!data.title || data.title.trim().length === 0) {
          this.errorMessage = t("storeErrors.campus.topicTitleEmpty");
          throw new Error(t("storeErrors.campus.topicTitleEmpty"));
        }
        if (!data.content || data.content.trim().length === 0) {
          this.errorMessage = t("storeErrors.campus.topicContentEmpty");
          throw new Error(t("storeErrors.campus.topicContentEmpty"));
        }

        if (useMock()) {
          // infra R2-00099: mock 发布作者从当前会话生成（原硬编码 "匿名校友/我/广州大学"）
          const me = useSessionStore().userSession;
          const newTopic: CampusTopicItem = {
            id: `campus-topic-${Date.now()}`,
            category: data.category,
            title: data.title.trim(),
            contentPreview: data.content.trim(),
            author: {
              userId: me?.userId ?? MOCK_CURRENT_USER_ID,
              name: data.isAnonymous ? t("campus.index.anonymousAuthor") : (me?.displayName ?? "我"),
              avatar: IMAGE_PATHS.DEFAULT_AVATAR,
              school: me?.campusName ?? "",
            },
            replyCount: 0,
            isAnonymous: data.isAnonymous,
            createdAt: new Date().toISOString(),
          };
          this.topics.unshift(newTopic);
          return newTopic;
        }

        // 调用后端 API: POST /api/campus/topics
        // 2026-08-10 B5：real 分支携带 tags 字段（后端实体已有 tags JSON 列，≤5 个、每个 ≤20 字符）
        const result = await request<BackendCampusTopicView, {
          category: string;
          title: string;
          content: string;
          tags?: string[];
        }>({
          url: "/campus/topics",
          method: "POST",
          data: {
            category: data.category,
            title: data.title.trim(),
            content: data.content.trim(),
            ...(data.tags && data.tags.length > 0 ? { tags: data.tags } : {}),
          },
        });

        const mapped = mapToCampusTopicItem(result);
        this.topics.unshift(mapped);
        return mapped;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.campus.publishTopicFailed");
        throw error;
      }
    },

    /**
     * 回复话题
     * @param topicId - 话题 ID
     * @param content - 回复内容
     * @param isAnonymous - 是否匿名回复
     */
    async replyToCampusTopic(topicId: string, content: string, isAnonymous = false) {
      this.errorMessage = null;

      try {
        if (!topicId || topicId.trim().length === 0) {
          this.errorMessage = t("storeErrors.campus.topicIdInvalid");
          throw new Error(t("storeErrors.campus.topicIdInvalid"));
        }
        if (!content || content.trim().length === 0) {
          this.errorMessage = t("storeErrors.campus.replyContentEmpty");
          throw new Error(t("storeErrors.campus.replyContentEmpty"));
        }

        if (useMock()) {
          // infra R2-00106: mock 回复作者从当前会话生成（原硬编码 "匿名校友/我/广州大学"）
          const me = useSessionStore().userSession;
          const newReply: CampusReplyItem = {
            id: `campus-reply-${Date.now()}`,
            topicId,
            author: {
              userId: me?.userId ?? MOCK_CURRENT_USER_ID,
              name: isAnonymous ? t("campus.index.anonymousAuthor") : (me?.displayName ?? "我"),
              avatar: IMAGE_PATHS.DEFAULT_AVATAR,
              school: me?.campusName ?? "",
            },
            content: content.trim(),
            isAnonymous,
            createdAt: new Date().toISOString(),
          };
          this.replies.push(newReply);

          // 更新话题回复数
          if (this.currentTopic && this.currentTopic.id === topicId) {
            this.currentTopic.replyCount += 1;
          }
          const topicInList = this.topics.find((t) => t.id === topicId);
          if (topicInList) {
            topicInList.replyCount += 1;
          }
          return newReply;
        }

        // 调用后端 API: POST /api/campus/topics/{topicId}/replies
        const result = await request<BackendCampusReplyView, {
          content: string;
        }>({
          url: `/campus/topics/${topicId}/replies`,
          method: "POST",
          data: { content: content.trim() },
        });

        const mapped = mapToCampusReplyItem(result);
        this.replies.push(mapped);

        // 更新话题回复数
        if (this.currentTopic && this.currentTopic.id === topicId) {
          this.currentTopic.replyCount += 1;
        }
        const topicInList = this.topics.find((t) => t.id === topicId);
        if (topicInList) {
          topicInList.replyCount += 1;
        }

        return mapped;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.campus.replyFailed");
        throw error;
      }
    },

    /**
     * 提交学生证认证（B1-2 前置：须先完成实名认证；B1-3 可选学信网字段）
     * @param data - 认证信息
     */
    async submitCertification(data: {
      schoolName: string;
      major: string;
      studentCardUrl: string;
      /** 学信网在线验证码（选填） */
      chsiCode?: string;
      /** 学信网学历截图 URL（选填） */
      chsiScreenshotUrl?: string;
    }) {
      this.errorMessage = null;

      try {
        if (!data.schoolName || data.schoolName.trim().length === 0) {
          this.errorMessage = t("storeErrors.campus.schoolNameEmpty");
          throw new Error(t("storeErrors.campus.schoolNameEmpty"));
        }
        if (!data.major || data.major.trim().length === 0) {
          this.errorMessage = t("storeErrors.campus.majorEmpty");
          throw new Error(t("storeErrors.campus.majorEmpty"));
        }
        if (!data.studentCardUrl) {
          this.errorMessage = t("storeErrors.campus.studentCardRequired");
          throw new Error(t("storeErrors.campus.studentCardRequired"));
        }

        if (useMock()) {
          this.certificationStatus = "pending";
          this.certificationInfo = {
            schoolName: data.schoolName.trim(),
            major: data.major.trim(),
            studentCardUrl: data.studentCardUrl,
            reviewComment: "",
          };
          return;
        }

        // 调用后端 API: POST /api/campus/certification
        const result = await request<BackendCertificationView, {
          schoolName: string;
          major: string;
          studentIdCardUrl: string;
          chsiCode?: string;
          chsiScreenshotUrl?: string;
        }>({
          url: "/campus/certification",
          method: "POST",
          data: {
            schoolName: data.schoolName.trim(),
            major: data.major.trim(),
            studentIdCardUrl: data.studentCardUrl,
            chsiCode: data.chsiCode?.trim() ? data.chsiCode.trim() : undefined,
            chsiScreenshotUrl: data.chsiScreenshotUrl?.trim() ? data.chsiScreenshotUrl.trim() : undefined,
          },
        });

        this.certificationStatus = mapCertificationStatus(result.status);
        this.certificationInfo = {
          schoolName: result.schoolName,
          major: result.major,
          studentCardUrl: result.studentIdCardUrl,
          reviewComment: result.reviewComment ?? "",
        };
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.campus.submitCertificationFailed");
        throw error;
      }
    },

    /**
     * 获取认证状态
     */
    async fetchCertificationStatus() {
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 模式下如果是首次访问，模拟未认证状态
          return;
        }

        // 调用后端 API: GET /api/campus/certification
        const result = await request<BackendCertificationView>({
          url: "/campus/certification",
          method: "GET",
        });

        this.certificationStatus = mapCertificationStatus(result.status);
        this.certificationInfo = {
          schoolName: result.schoolName,
          major: result.major,
          studentCardUrl: result.studentIdCardUrl,
          reviewComment: result.reviewComment ?? "",
        };
      } catch (error) {
        // 修复（P1 BUG）：未找到认证记录是正常情况，不设置错误信息。
        // 原实现用 error.message.includes("404") 判断，但 AppApiError.message 是
        // 中文兜底文案（“请求的资源不存在”），不含 "404"，分支永不命中。
        // 现改为检查 AppApiError.status === 404（错误码字符串 error === "not_found" 兜底）。
        const isNotFound =
          error !== null &&
          typeof error === "object" &&
          ("status" in error || "error" in error) &&
          (((error as { status?: unknown }).status === 404) ||
            ((error as { error?: unknown }).error === "not_found"));
        if (isNotFound) {
          this.certificationStatus = "unverified";
          return;
        }
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.campus.loadCertificationStatusFailed");
      }
    },

    /**
     * 清空当前话题和回复
     */
    clearCurrentTopic() {
      this.currentTopic = null;
      this.replies = [];
    },
  },
});