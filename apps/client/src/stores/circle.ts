import { defineStore } from "pinia";
import { request } from "../services/http";
import { useSessionStore } from "./session";
import { useMock } from "./helpers/use-mock";
import { IMAGE_PATHS } from "../config/images";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";
// Mock 数据（R4-batch2：mock 用户/圈子数据移入 stores/circle/mock-data.ts，
// 仅 useMock() 分支引用，real 模式不会读取 mock ID）
import { MOCK_CURRENT_USER_ID, mockCircles, mockReplies, mockTopicDetail, mockTopics } from "./circle/mock-data";

/* ========== 后端视图类型 ========== */

/**
 * 后端 CircleView 类型
 * 对应后端 record CircleView(Long id, String name, String icon, String description, int memberCount, boolean isJoined, int topicCount)
 */
export interface BackendCircleView {
  id: number;
  name: string;
  icon: string;
  description: string;
  memberCount: number;
  isJoined: boolean;
  /** 话题数量 */
  topicCount: number;
}

/**
 * 后端 CircleTopicView 类型
 * 对应后端 record CircleTopicView(Long id, Long circleId, String circleName, Long authorId, String authorName, String title, String contentPreview, List<String> images, int replyCount, boolean isPinned, LocalDateTime createdAt)
 */
export interface BackendCircleTopicView {
  id: number;
  circleId: number;
  circleName: string;
  authorId: number;
  authorName: string;
  title: string;
  contentPreview: string;
  images: string[];
  replyCount: number;
  isPinned: boolean;
  createdAt: string;
}

/**
 * 后端 CircleReplyView 类型
 * 对应后端 record CircleReplyView(Long id, Long topicId, Long authorId, String authorName, String content, LocalDateTime createdAt)
 */
export interface BackendCircleReplyView {
  id: number;
  topicId: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

/**
 * 后端 CircleMembershipView 类型
 */
export interface BackendCircleMembershipView {
  circleId: number;
  joined: boolean;
  memberCount: number;
}

/**
 * 将后端 CircleView 映射为前端 CircleItem
 */
function mapToCircleItem(raw: BackendCircleView): CircleItem {
  return {
    id: String(raw.id),
    name: raw.name,
    icon: raw.icon,
    description: raw.description,
    memberCount: raw.memberCount,
    topicCount: raw.topicCount ?? 0,
    isJoined: raw.isJoined,
  };
}

/**
 * 将后端 CircleTopicView 映射为前端 TopicItem
 */
function mapToTopicItem(raw: BackendCircleTopicView): TopicItem {
  return {
    id: String(raw.id),
    circleId: String(raw.circleId),
    title: raw.title,
    content: raw.contentPreview,
    images: raw.images,
    author: {
      userId: String(raw.authorId),
      name: raw.authorName,
      avatar: "",
      headline: "",
    },
    replyCount: raw.replyCount,
    createdAt: raw.createdAt,
  };
}

/**
 * 将后端 CircleTopicView 映射为前端 TopicDetail
 */
function mapToTopicDetail(raw: BackendCircleTopicView): TopicDetail {
  return {
    id: String(raw.id),
    circleId: String(raw.circleId),
    title: raw.title,
    content: raw.contentPreview, // 后端 contentPreview 可能不完整，详情需单独请求
    images: raw.images,
    author: {
      userId: String(raw.authorId),
      name: raw.authorName,
      avatar: "",
      headline: "",
    },
    replyCount: raw.replyCount,
    createdAt: raw.createdAt,
  };
}

/**
 * 将后端 CircleReplyView 映射为前端 ReplyItem
 */
function mapToReplyItem(raw: BackendCircleReplyView): ReplyItem {
  return {
    id: String(raw.id),
    topicId: String(raw.topicId),
    author: {
      userId: String(raw.authorId),
      name: raw.authorName,
      avatar: "",
      headline: "",
    },
    content: raw.content,
    createdAt: raw.createdAt,
  };
}

/* ========== 类型定义 ========== */

/**
 * 兴趣圈信息
 */
export interface CircleItem {
  /** 兴趣圈 ID */
  id: string;
  /** 兴趣圈名称 */
  name: string;
  /** 兴趣圈图标（emoji 或 URL） */
  icon: string;
  /** 兴趣圈描述 */
  description: string;
  /** 成员数量 */
  memberCount: number;
  /** 话题数量 */
  topicCount: number;
  /** 当前用户是否已加入 */
  isJoined: boolean;
  /** 校园认证圈（收尾轮：显示认证徽标；未认证用户点击需先认证） */
  campusVerified?: boolean;
}

/**
 * 话题作者信息
 */
export interface TopicAuthor {
  userId: string;
  name: string;
  avatar: string;
  headline: string;
}

/**
 * 话题列表项
 */
export interface TopicItem {
  id: string;
  circleId: string;
  title: string;
  /** 话题内容预览 */
  content: string;
  /** 话题配图 */
  images: string[];
  /** 作者信息 */
  author: TopicAuthor;
  /** 回复数量 */
  replyCount: number;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 话题详情
 */
export interface TopicDetail {
  id: string;
  circleId: string;
  title: string;
  content: string;
  images: string[];
  author: TopicAuthor;
  replyCount: number;
  createdAt: string;
}

/**
 * 回复项
 */
export interface ReplyItem {
  id: string;
  topicId: string;
  author: TopicAuthor;
  content: string;
  createdAt: string;
}

/**
 * CircleStore 状态
 */
export interface CircleState {
  /** 兴趣圈列表 */
  circles: CircleItem[];
  /** 当前兴趣圈的话题列表 */
  currentTopics: TopicItem[];
  /** 当前话题详情 */
  currentTopic: TopicDetail | null;
  /** 当前话题的回复列表 */
  replies: ReplyItem[];
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  errorMessage: string | null;
  /** 话题列表当前页码 */
  topicPage: number;
  /** 话题列表是否还有更多 */
  topicHasMore: boolean;
}


/** 每页话题数量 */
const TOPIC_PAGE_SIZE = 10;

/**
 * 格式化相对时间
 */
export function formatCircleTime(dateStr: string): string {
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
 * 兴趣圈 Store
 *
 * 管理兴趣圈列表、话题、回复等数据。
 */
export const useCircleStore = defineStore("circle", {
  state: (): CircleState => ({
    circles: [],
    currentTopics: [],
    currentTopic: null,
    replies: [],
    loading: false,
    errorMessage: null,
    topicPage: 1,
    topicHasMore: true,
  }),

  getters: {
    /** 已加入的兴趣圈 */
    joinedCircles: (state): CircleItem[] => {
      return state.circles.filter((c) => c.isJoined);
    },
  },

  actions: {
    /**
     * 获取兴趣圈列表
     */
    async fetchCircles() {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.circles = [...mockCircles];
          return;
        }

        // 调用后端 API: GET /api/circles（P2-13：userId 由后端 JWT 获取，CircleController.getCircles 无 userId 参数）
        const data = await request<BackendCircleView[]>({
          url: "/circles",
          method: "GET",
        });
        this.circles = data.map(mapToCircleItem);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.circle.loadCirclesFailed");
      } finally {
        this.loading = false;
      }
    },

    /**
     * 加入兴趣圈
     * @param circleId - 兴趣圈 ID
     */
    async joinCircle(circleId: string) {
      this.errorMessage = null;

      try {
        if (!circleId || circleId.trim().length === 0) {
          this.errorMessage = t("storeErrors.circle.circleIdInvalid");
          throw new Error(t("storeErrors.circle.circleIdInvalid"));
        }

        if (useMock()) {
          const circle = this.circles.find((c) => c.id === circleId);
          if (circle) {
            circle.isJoined = true;
            circle.memberCount += 1;
          }
          return;
        }

        // 调用后端 API: POST /api/circles/{id}/join
        // 后端请求体: JoinCircleRequest(userId)
        const sessionStore = useSessionStore();
        const currentUserId = sessionStore.userSession?.userId ?? "";
        const result = await request<BackendCircleMembershipView>({
          url: `/circles/${circleId}/join`,
          method: "POST",
          data: { userId: currentUserId },
        });

        // 根据后端返回更新本地状态
        const circle = this.circles.find((c) => c.id === circleId);
        if (circle) {
          circle.isJoined = result.joined;
          circle.memberCount = result.memberCount;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.circle.joinCircleFailed");
        throw error;
      }
    },

    /**
     * 退出兴趣圈
     * @param circleId - 兴趣圈 ID
     */
    async leaveCircle(circleId: string) {
      this.errorMessage = null;

      try {
        if (!circleId || circleId.trim().length === 0) {
          this.errorMessage = t("storeErrors.circle.circleIdInvalid");
          throw new Error(t("storeErrors.circle.circleIdInvalid"));
        }

        if (useMock()) {
          const circle = this.circles.find((c) => c.id === circleId);
          if (circle) {
            circle.isJoined = false;
            circle.memberCount = Math.max(0, circle.memberCount - 1);
          }
          return;
        }

        // 调用后端 API: DELETE /api/circles/{id}/join
        // 后端请求体: JoinCircleRequest(userId)
        const sessionStore = useSessionStore();
        const currentUserId = sessionStore.userSession?.userId ?? "";
        const result = await request<BackendCircleMembershipView>({
          url: `/circles/${circleId}/join`,
          method: "DELETE",
          data: { userId: currentUserId },
        });

        // 根据后端返回更新本地状态
        const circle = this.circles.find((c) => c.id === circleId);
        if (circle) {
          circle.isJoined = result.joined;
          circle.memberCount = result.memberCount;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.circle.leaveCircleFailed");
        throw error;
      }
    },

    /**
     * 获取兴趣圈的话题列表
     * @param circleId - 兴趣圈 ID
     * @param page - 页码（从 1 开始）
     */
    async fetchTopics(circleId: string, page = 1) {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (!circleId || circleId.trim().length === 0) {
          this.errorMessage = t("storeErrors.circle.circleIdInvalid");
          throw new Error(t("storeErrors.circle.circleIdInvalid"));
        }

        if (useMock()) {
          const topics = mockTopics[circleId] ?? [];
          if (page === 1) {
            this.currentTopics = [...topics];
          } else {
            // mock 模式下没有分页数据，标记为没有更多
            this.topicHasMore = false;
          }
          this.topicPage = page;
          this.topicHasMore = topics.length >= TOPIC_PAGE_SIZE;
          return;
        }

        // 调用后端 API: GET /api/circles/{circleId}/topics?page={page}&size={size}
        // 后端返回 Spring Data Page<CircleTopicView>，格式为 { content, totalElements, number, size }
        const data = await request<{ content: BackendCircleTopicView[]; totalElements: number; number: number; size: number }>({
          url: `/circles/${circleId}/topics?page=${page - 1}&size=${TOPIC_PAGE_SIZE}`,
          method: "GET",
        });

        const mappedTopics = data.content.map(mapToTopicItem);
        if (page === 1) {
          this.currentTopics = mappedTopics;
        } else {
          this.currentTopics.push(...mappedTopics);
        }
        this.topicPage = page;
        this.topicHasMore = data.content.length >= TOPIC_PAGE_SIZE;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.circle.loadTopicsFailed");
        // 修复：与 joinCircle/createTopic 保持一致，参数校验错误需向上抛出，
        // 否则测试 `fetchTopics("") 应 reject` 与真实业务调用方都无法捕获参数错误。
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 创建新话题
     * @param circleId - 兴趣圈 ID
     * @param data - 话题数据（Task B5：可附加 tags 话题标签 / favorite 喜爱标记）
     */
    async createTopic(circleId: string, data: { title: string; content: string; images?: string[]; tags?: string[]; favorite?: boolean }) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!circleId || circleId.trim().length === 0) {
          this.errorMessage = t("storeErrors.circle.circleIdInvalid");
          throw new Error(t("storeErrors.circle.circleIdInvalid"));
        }
        if (!data.title || data.title.trim().length === 0) {
          this.errorMessage = t("storeErrors.circle.topicTitleEmpty");
          throw new Error(t("storeErrors.circle.topicTitleEmpty"));
        }
        if (!data.content || data.content.trim().length === 0) {
          this.errorMessage = t("storeErrors.circle.topicContentEmpty");
          throw new Error(t("storeErrors.circle.topicContentEmpty"));
        }

        if (useMock()) {
          // infra R2-00040: mock 话题作者从当前会话生成，避免硬编码 "user-1001"/"我" 与真实用户体系割裂
          const me = useSessionStore().userSession;
          const newTopic: TopicItem = {
            id: `topic-${Date.now()}`,
            circleId,
            title: data.title.trim(),
            content: data.content.trim(),
            images: data.images ?? [],
            author: {
              userId: me?.userId ?? MOCK_CURRENT_USER_ID,
              name: me?.displayName ?? "我",
              avatar: IMAGE_PATHS.DEFAULT_AVATAR,
              headline: "",
            },
            replyCount: 0,
            createdAt: new Date().toISOString(),
          };
          // Task B5：mock 本地模拟附加 tags / favorite 字段，不破坏现有 TopicItem 结构
          this.currentTopics.unshift(newTopic);
          return { ...newTopic, tags: data.tags ?? [], favorite: data.favorite ?? false } as TopicItem;
        }

        // 调用后端 API: POST /api/circles/{circleId}/topics
        // 修复（P0-12）：后端 CreateTopicRequest(title, content, images) 不含
        // authorId（从 JWT 获取），删除请求体中多余的 authorId 字段
        const result = await request<BackendCircleTopicView, { title: string; content: string; images?: string[] }>({
          url: `/circles/${circleId}/topics`,
          method: "POST",
          data: {
            title: data.title.trim(),
            content: data.content.trim(),
            images: data.images ?? [],
          },
        });

        const mappedResult = mapToTopicItem(result);
        this.currentTopics.unshift(mappedResult);
        return mappedResult;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.circle.publishTopicFailed");
        throw error;
      }
    },

    /**
     * 获取话题详情
     * @param topicId - 话题 ID
     */
    async fetchTopicDetail(topicId: string) {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (!topicId || topicId.trim().length === 0) {
          this.errorMessage = t("storeErrors.circle.topicIdInvalid");
          throw new Error(t("storeErrors.circle.topicIdInvalid"));
        }

        if (useMock()) {
          const detail = mockTopicDetail[topicId];
          if (detail) {
            this.currentTopic = { ...detail };
          } else {
            // 如果没有 mock 详情，从话题列表中构造
            const topic = this.currentTopics.find((t) => t.id === topicId);
            if (topic) {
              this.currentTopic = {
                ...topic,
                content: topic.content,
              };
            } else {
              this.currentTopic = null;
            }
          }
          return;
        }

        // 调用后端 API: GET /api/circles/topics/{topicId}
        // 后端返回 CircleTopicView
        const data = await request<BackendCircleTopicView>({
          url: `/circles/topics/${topicId}`,
          method: "GET",
        });
        this.currentTopic = mapToTopicDetail(data);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.circle.loadTopicDetailFailed");
        // 修复：与 joinCircle/createTopic/fetchTopics 保持一致，参数校验错误需向上抛出。
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 获取话题回复列表
     * @param topicId - 话题 ID
     * @param page - 页码（从 1 开始）
     */
    async fetchReplies(topicId: string, page = 1) {
      this.errorMessage = null;

      try {
        if (!topicId || topicId.trim().length === 0) {
          this.errorMessage = t("storeErrors.circle.topicIdInvalid");
          throw new Error(t("storeErrors.circle.topicIdInvalid"));
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

        // 调用后端 API: GET /api/circles/topics/{topicId}/replies?page={page}
        // 后端返回 Spring Data Page<CircleReplyView>，格式为 { content, totalElements, number, size }
        const data = await request<{ content: BackendCircleReplyView[]; totalElements: number; number: number; size: number }>({
          url: `/circles/topics/${topicId}/replies?page=${page - 1}`,
          method: "GET",
        });

        const mappedReplies = data.content.map(mapToReplyItem);
        if (page === 1) {
          this.replies = mappedReplies;
        } else {
          this.replies.push(...mappedReplies);
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.circle.loadRepliesFailed");
      }
    },

    /**
     * 回复话题
     * @param topicId - 话题 ID
     * @param content - 回复内容
     */
    async replyToTopic(topicId: string, content: string) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!topicId || topicId.trim().length === 0) {
          this.errorMessage = t("storeErrors.circle.topicIdInvalid");
          throw new Error(t("storeErrors.circle.topicIdInvalid"));
        }
        if (!content || content.trim().length === 0) {
          this.errorMessage = t("storeErrors.circle.replyContentEmpty");
          throw new Error(t("storeErrors.circle.replyContentEmpty"));
        }

        if (useMock()) {
          // infra R2-00040: mock 回复作者从当前会话生成
          const me = useSessionStore().userSession;
          const newReply: ReplyItem = {
            id: `reply-${Date.now()}`,
            topicId,
            author: {
              userId: me?.userId ?? MOCK_CURRENT_USER_ID,
              name: me?.displayName ?? "我",
              avatar: IMAGE_PATHS.DEFAULT_AVATAR,
              headline: "",
            },
            content: content.trim(),
            createdAt: new Date().toISOString(),
          };
          this.replies.push(newReply);

          // 更新话题回复数
          if (this.currentTopic && this.currentTopic.id === topicId) {
            this.currentTopic.replyCount += 1;
          }
          const topicInList = this.currentTopics.find((t) => t.id === topicId);
          if (topicInList) {
            topicInList.replyCount += 1;
          }
          return newReply;
        }

        // 调用后端 API: POST /api/circles/topics/{topicId}/replies
        // 修复（P0-12）：后端 CreateReplyRequest(content) 不含 authorId（从 JWT 获取），
        // 删除请求体中多余的 authorId 字段
        const result = await request<BackendCircleReplyView, { content: string }>({
          url: `/circles/topics/${topicId}/replies`,
          method: "POST",
          data: { content: content.trim() },
        });

        const mappedResult = mapToReplyItem(result);
        this.replies.push(mappedResult);

        // 更新话题回复数
        if (this.currentTopic && this.currentTopic.id === topicId) {
          this.currentTopic.replyCount += 1;
        }
        const topicInList = this.currentTopics.find((t) => t.id === topicId);
        if (topicInList) {
          topicInList.replyCount += 1;
        }

        return mappedResult;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.circle.replyFailed");
        throw error;
      }
    },

    /**
     * 清空当前话题和回复
     */
    clearCurrentTopic() {
      this.currentTopic = null;
      this.replies = [];
    },

    /**
     * 获取所有圈子的精选话题（用于村口"兴趣"分类）
     * Real 模式调用 GET /api/circles/featured
     * @param page - 页码（从 1 开始）
     */
    async fetchFeaturedTopics(page = 1) {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 模式下复用已有话题数据
          const allTopics = Object.values(mockTopics).flat();
          if (page === 1) {
            this.currentTopics = [...allTopics];
          } else {
            this.topicHasMore = false;
          }
          this.topicPage = page;
          this.topicHasMore = allTopics.length >= TOPIC_PAGE_SIZE;
          return;
        }

        // 调用后端 API: GET /api/circles/featured?page={page}&size={size}
        const data = await request<{ content: BackendCircleTopicView[]; totalElements: number; number: number; size: number }>({
          url: `/circles/featured?page=${page - 1}&size=${TOPIC_PAGE_SIZE}`,
          method: "GET",
        });

        const mappedTopics = data.content.map(mapToTopicItem);
        if (page === 1) {
          this.currentTopics = mappedTopics;
        } else {
          this.currentTopics.push(...mappedTopics);
        }
        this.topicPage = page;
        this.topicHasMore = data.content.length >= TOPIC_PAGE_SIZE;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.circle.loadFeaturedTopicsFailed"); // infra R2-00041: 错误回退消息 i18n 化
      } finally {
        this.loading = false;
      }
    },
  },
});
