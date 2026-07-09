// D:\6\恋爱小程序\apps\client\src\stores\campus.ts
import { defineStore } from "pinia";
import { appEnv } from "../services/env";
import { request } from "../services/http";


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
}

/* ========== Mock 数据 ========== */

const mockTopics: CampusTopicItem[] = [
  // 课程交流
  {
    id: "campus-topic-1",
    category: "course_exchange",
    title: "高数B期末复习资料分享",
    contentPreview: "整理了一份高数B的期末复习资料，包含重点公式和典型例题解析，有需要的同学自取~",
    author: { userId: "u-1001", name: "学长小王", avatar: "", school: "广州大学" },
    replyCount: 23,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "campus-topic-2",
    category: "course_exchange",
    title: "数据结构实验报告模板",
    contentPreview: "分享一份数据结构实验报告的标准模板，含代码规范和注释要求，适合新手参考。",
    author: { userId: "u-1002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 15,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  // 社团招新
  {
    id: "campus-topic-3",
    category: "club_recruitment",
    title: "摄影社团招新啦！",
    contentPreview: "喜欢摄影的朋友看过来！摄影社团新学期招新开始啦，零基础也可以加入，我们会定期组织外拍活动~",
    author: { userId: "u-2001", name: "摄影社社长", avatar: "", school: "广州大学" },
    replyCount: 45,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "campus-topic-4",
    category: "club_recruitment",
    title: "街舞社寻找志同道合的舞伴",
    contentPreview: "街舞社新学期招新！无论你是什么水平，只要热爱街舞就欢迎加入。每周二四晚集训~",
    author: { userId: "u-2002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 32,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  // 校园活动
  {
    id: "campus-topic-5",
    category: "campus_activity",
    title: "本周六校园音乐节节目单公布",
    contentPreview: "校园音乐节节目单出来啦！本周六下午2点开始，地点在操场，有乐队表演、舞蹈、相声等节目~",
    author: { userId: "u-3001", name: "学生会长", avatar: "", school: "广州大学" },
    replyCount: 89,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "campus-topic-6",
    category: "campus_activity",
    title: "校园跑步打卡活动第三期",
    contentPreview: "坚持锻炼，健康生活！第三期跑步打卡活动开始报名，完成21天打卡可获证书和奖品。",
    author: { userId: "u-3002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 56,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  // 学习互助
  {
    id: "campus-topic-7",
    category: "study_help",
    title: "考研英语复习经验分享",
    contentPreview: "分享一下我考研英语80+的复习经验，包括单词记忆方法、阅读理解技巧和作文模板~",
    author: { userId: "u-4001", name: "考研学姐", avatar: "", school: "广州大学" },
    replyCount: 67,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: "campus-topic-8",
    category: "study_help",
    title: "求伴一起刷LeetCode",
    contentPreview: "大二计科，目前刷了200多题，想找几个编程搭子互相监督，每天至少刷3道题。",
    author: { userId: "u-4002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 34,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  // 生活服务
  {
    id: "campus-topic-9",
    category: "life_service",
    title: "食堂新窗口测评",
    contentPreview: "二楼新开了川菜窗口，试了水煮鱼和麻婆豆腐，味道相当不错！比外面还便宜，推荐大家去试。",
    author: { userId: "u-5001", name: "吃货小分队", avatar: "", school: "广州大学" },
    replyCount: 42,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: "campus-topic-10",
    category: "life_service",
    title: "校园代拿快递服务推荐",
    contentPreview: "推荐一个靠谱的校园代拿快递，价格实惠，南区北区都覆盖，不用再排队拿快递了~",
    author: { userId: "u-5002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 28,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  // 校友动态
  {
    id: "campus-topic-11",
    category: "alumni_news",
    title: "校友企业招聘信息汇总（六月）",
    contentPreview: "汇总了6月份来校招聘的校友企业信息，包括字节、腾讯、阿里等，有需要的同学记得关注~",
    author: { userId: "u-6001", name: "校友联络员", avatar: "", school: "广州大学" },
    replyCount: 53,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: "campus-topic-12",
    category: "alumni_news",
    title: "创业成功的学长回来做分享",
    contentPreview: "听说咱们学校2015级的师兄创业成功，下周三回来做经验分享，想去的可以先报名。",
    author: { userId: "u-6002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 19,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

const mockTopicDetail: Record<string, CampusTopicDetail> = {
  "campus-topic-1": {
    id: "campus-topic-1",
    category: "course_exchange",
    title: "高数B期末复习资料分享",
    content: "整理了一份高数B的期末复习资料，包含重点公式和典型例题解析，有需要的同学自取~\n\n内容包括：\n1. 极限与连续性重点公式\n2. 导数与微分的应用\n3. 不定积分与定积分\n4. 微分方程\n5. 典型例题20道（带详细解析）\n\n需要的同学私信我获取百度云链接~期末加油！",
    author: { userId: "u-1001", name: "学长小王", avatar: "", school: "广州大学" },
    replyCount: 23,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
};

const mockReplies: Record<string, CampusReplyItem[]> = {
  "campus-topic-1": [
    {
      id: "campus-reply-1",
      topicId: "campus-topic-1",
      author: { userId: "u-2001", name: "学弟小李", avatar: "", school: "广州大学" },
      content: "感谢学长！正好在复习高数，太及时了！",
      isAnonymous: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: "campus-reply-2",
      topicId: "campus-topic-1",
      author: { userId: "u-3001", name: "匿名校友", avatar: "", school: "" },
      content: "可以也发我一份吗？谢谢！",
      isAnonymous: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: "campus-reply-3",
      topicId: "campus-topic-1",
      author: { userId: "u-4001", name: "小张同学", avatar: "", school: "广州大学" },
      content: "学长整理的太详细了，特别是定积分那块，一直没搞懂，看完终于明白了！",
      isAnonymous: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
  ],
};

const mockActivities: CampusActivity[] = [
  {
    id: "act-1",
    title: "校园音乐节",
    description: "一年一度的校园音乐节来啦！乐队、舞蹈、相声等精彩节目等你来",
    coverUrl: "",
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 4).toISOString(),
    location: "学校操场",
    organizer: "学生会",
    participantCount: 320,
    maxParticipants: 500,
  },
  {
    id: "act-2",
    title: "英语角周末活动",
    description: "和外教一起练习口语，本期主题：Travel & Culture",
    coverUrl: "",
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 60 * 2).toISOString(),
    location: "教学楼B栋201",
    organizer: "英语协会",
    participantCount: 45,
    maxParticipants: 60,
  },
];

/** 每页话题数量 */
const TOPIC_PAGE_SIZE = 10;

function useMock() {
  return appEnv.apiMode === "mock";
}

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
  },

  actions: {
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
     */
    async fetchCampusTopics(category?: CampusTopicCategory, page = 1) {
      this.loading = true;
      this.errorMessage = null;
      const targetCategory = category ?? this.activeCategory;

      try {
        if (useMock()) {
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
          url: `/campus/topics?category=${targetCategory}&page=${page - 1}&size=${TOPIC_PAGE_SIZE}`,
          method: "GET",
        });

        const mapped = (data.content ?? []).map(mapToCampusTopicItem);
        if (page === 1) {
          this.topics = mapped;
        } else {
          this.topics.push(...mapped);
        }
        this.topicPage = page;
        this.topicHasMore = (data.content ?? []).length >= TOPIC_PAGE_SIZE;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载校园话题失败";
      } finally {
        this.loading = false;
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
        this.errorMessage = error instanceof Error ? error.message : "加载校园活动失败";
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
          this.errorMessage = "话题 ID 无效";
          throw new Error("话题 ID 无效");
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
        this.errorMessage = error instanceof Error ? error.message : "加载话题详情失败";
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
          this.errorMessage = "话题 ID 无效";
          throw new Error("话题 ID 无效");
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
        this.errorMessage = error instanceof Error ? error.message : "加载回复失败";
      }
    },

    /**
     * 创建新话题
     * @param data - 话题数据
     */
    async createCampusTopic(data: { category: CampusTopicCategory; title: string; content: string; isAnonymous: boolean }) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!data.title || data.title.trim().length === 0) {
          this.errorMessage = "话题标题不能为空";
          throw new Error("话题标题不能为空");
        }
        if (!data.content || data.content.trim().length === 0) {
          this.errorMessage = "话题内容不能为空";
          throw new Error("话题内容不能为空");
        }

        if (useMock()) {
          const newTopic: CampusTopicItem = {
            id: `campus-topic-${Date.now()}`,
            category: data.category,
            title: data.title.trim(),
            contentPreview: data.content.trim(),
            author: {
              userId: "user-1001",
              name: data.isAnonymous ? "匿名校友" : "我",
              avatar: "",
              school: "广州大学",
            },
            replyCount: 0,
            isAnonymous: data.isAnonymous,
            createdAt: new Date().toISOString(),
          };
          this.topics.unshift(newTopic);
          return newTopic;
        }

        // 调用后端 API: POST /api/campus/topics
        const result = await request<BackendCampusTopicView, {
          category: string;
          title: string;
          content: string;
        }>({
          url: "/campus/topics",
          method: "POST",
          data: {
            category: data.category,
            title: data.title.trim(),
            content: data.content.trim(),
          },
        });

        const mapped = mapToCampusTopicItem(result);
        this.topics.unshift(mapped);
        return mapped;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "发布话题失败";
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
          this.errorMessage = "话题 ID 无效";
          throw new Error("话题 ID 无效");
        }
        if (!content || content.trim().length === 0) {
          this.errorMessage = "回复内容不能为空";
          throw new Error("回复内容不能为空");
        }

        if (useMock()) {
          const newReply: CampusReplyItem = {
            id: `campus-reply-${Date.now()}`,
            topicId,
            author: {
              userId: "user-1001",
              name: isAnonymous ? "匿名校友" : "我",
              avatar: "",
              school: "广州大学",
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
        this.errorMessage = error instanceof Error ? error.message : "回复失败";
        throw error;
      }
    },

    /**
     * 提交学生证认证
     * @param data - 认证信息
     */
    async submitCertification(data: {
      schoolName: string;
      major: string;
      studentCardUrl: string;
    }) {
      this.errorMessage = null;

      try {
        if (!data.schoolName || data.schoolName.trim().length === 0) {
          this.errorMessage = "学校名称不能为空";
          throw new Error("学校名称不能为空");
        }
        if (!data.major || data.major.trim().length === 0) {
          this.errorMessage = "专业不能为空";
          throw new Error("专业不能为空");
        }
        if (!data.studentCardUrl) {
          this.errorMessage = "请上传学生证照片";
          throw new Error("请上传学生证照片");
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
        }>({
          url: "/campus/certification",
          method: "POST",
          data: {
            schoolName: data.schoolName.trim(),
            major: data.major.trim(),
            studentIdCardUrl: data.studentCardUrl,
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
        this.errorMessage = error instanceof Error ? error.message : "提交认证失败";
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
        // 未找到认证记录是正常情况，不设置错误信息
        if (error instanceof Error && error.message.includes("404")) {
          this.certificationStatus = "unverified";
          return;
        }
        this.errorMessage = error instanceof Error ? error.message : "获取认证状态失败";
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