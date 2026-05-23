import { defineStore } from "pinia";
import { appEnv } from "../services/env";
import { request } from "../services/http";
import { useSessionStore } from "./session";

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

/* ========== Mock 数据 ========== */

const mockCircles: CircleItem[] = [
  {
    id: "circle-1",
    name: "电影迷",
    icon: "🎬",
    description: "分享你喜欢的电影，寻找一起看片的伙伴",
    memberCount: 1280,
    topicCount: 356,
    isJoined: true,
  },
  {
    id: "circle-2",
    name: "读书会",
    icon: "📚",
    description: "一起读书，一起成长，分享读书心得",
    memberCount: 890,
    topicCount: 210,
    isJoined: false,
  },
  {
    id: "circle-3",
    name: "运动达人",
    icon: "🏃",
    description: "跑步、篮球、羽毛球，运动让生活更精彩",
    memberCount: 1560,
    topicCount: 420,
    isJoined: true,
  },
  {
    id: "circle-4",
    name: "美食探店",
    icon: "🍜",
    description: "发现身边的美食，分享你的味蕾体验",
    memberCount: 2100,
    topicCount: 580,
    isJoined: false,
  },
  {
    id: "circle-5",
    name: "旅行日记",
    icon: "✈️",
    description: "记录旅途中的美好，寻找同行旅伴",
    memberCount: 960,
    topicCount: 275,
    isJoined: false,
  },
  {
    id: "circle-6",
    name: "音乐空间",
    icon: "🎵",
    description: "分享你喜欢的音乐，发现更多好声音",
    memberCount: 750,
    topicCount: 180,
    isJoined: true,
  },
];

const mockTopics: Record<string, TopicItem[]> = {
  "circle-1": [
    {
      id: "topic-1",
      circleId: "circle-1",
      title: "最近看了《奥本海默》，聊聊感受",
      content: "诺兰的新片真的太震撼了，三线叙事把人物刻画得非常立体。有人一起讨论吗？",
      images: [],
      author: { userId: "user-3001", name: "小鹿", avatar: "", headline: "电影爱好者" },
      replyCount: 12,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "topic-2",
      circleId: "circle-1",
      title: "推荐几部适合情侣一起看的电影",
      content: "周末想和对象一起看电影，大家有什么好推荐吗？最好是温馨治愈类的。",
      images: [],
      author: { userId: "user-3002", name: "阿泽", avatar: "", headline: "影视专业" },
      replyCount: 28,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "topic-3",
      circleId: "circle-1",
      title: "有没有人一起去看周末的电影首映？",
      content: "这周六有部新片首映，想找人一起去，一个人看电影太孤单了。",
      images: [],
      author: { userId: "user-3003", name: "橙子", avatar: "", headline: "设计师" },
      replyCount: 5,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
  ],
  "circle-3": [
    {
      id: "topic-4",
      circleId: "circle-3",
      title: "校园夜跑打卡群",
      content: "每天晚上9点操场夜跑，有没有人一起？互相监督，坚持锻炼！",
      images: [],
      author: { userId: "user-3004", name: "南风", avatar: "", headline: "篮球队长" },
      replyCount: 35,
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
  ],
};

const mockTopicDetail: Record<string, TopicDetail> = {
  "topic-1": {
    id: "topic-1",
    circleId: "circle-1",
    title: "最近看了《奥本海默》，聊聊感受",
    content: "诺兰的新片真的太震撼了，三线叙事把人物刻画得非常立体。尤其是那场听证会的戏，台词功力太强了。有人一起讨论吗？\n\n我觉得最打动我的是奥本海默在成功之后的道德挣扎，科学家的责任感和社会责任之间的矛盾。",
    images: [],
    author: { userId: "user-3001", name: "小鹿", avatar: "", headline: "电影爱好者" },
    replyCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
};

const mockReplies: Record<string, ReplyItem[]> = {
  "topic-1": [
    {
      id: "reply-1",
      topicId: "topic-1",
      author: { userId: "user-3002", name: "阿泽", avatar: "", headline: "影视专业" },
      content: "我也看了！三线叙事确实很厉害，不过我觉得节奏稍微有点慢，前面铺垫太长了。",
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: "reply-2",
      topicId: "topic-1",
      author: { userId: "user-3003", name: "橙子", avatar: "", headline: "设计师" },
      content: "强烈推荐IMAX版本，视觉效果完全不一样！",
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: "reply-3",
      topicId: "topic-1",
      author: { userId: "user-3004", name: "南风", avatar: "", headline: "篮球队长" },
      content: "看完之后一直在想一个问题：如果是我们，会做出同样的选择吗？",
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
  ],
};

/** 每页话题数量 */
const TOPIC_PAGE_SIZE = 10;

function useMock() {
  return appEnv.apiMode === "mock";
}

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

        // 调用后端 API: GET /api/circles?userId={userId}
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        const data = await request<BackendCircleView[]>({
          url: `/circles?userId=${userId}`,
          method: "GET",
        });
        this.circles = data.map(mapToCircleItem);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载兴趣圈失败";
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
          this.errorMessage = "兴趣圈 ID 无效";
          throw new Error("兴趣圈 ID 无效");
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
        this.errorMessage = error instanceof Error ? error.message : "加入兴趣圈失败";
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
          this.errorMessage = "兴趣圈 ID 无效";
          throw new Error("兴趣圈 ID 无效");
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
        this.errorMessage = error instanceof Error ? error.message : "退出兴趣圈失败";
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
          this.errorMessage = "兴趣圈 ID 无效";
          throw new Error("兴趣圈 ID 无效");
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
        this.errorMessage = error instanceof Error ? error.message : "加载话题失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 创建新话题
     * @param circleId - 兴趣圈 ID
     * @param data - 话题数据
     */
    async createTopic(circleId: string, data: { title: string; content: string; images?: string[] }) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!circleId || circleId.trim().length === 0) {
          this.errorMessage = "兴趣圈 ID 无效";
          throw new Error("兴趣圈 ID 无效");
        }
        if (!data.title || data.title.trim().length === 0) {
          this.errorMessage = "话题标题不能为空";
          throw new Error("话题标题不能为空");
        }
        if (!data.content || data.content.trim().length === 0) {
          this.errorMessage = "话题内容不能为空";
          throw new Error("话题内容不能为空");
        }

        if (useMock()) {
          const newTopic: TopicItem = {
            id: `topic-${Date.now()}`,
            circleId,
            title: data.title.trim(),
            content: data.content.trim(),
            images: data.images ?? [],
            author: {
              userId: "user-1001",
              name: "我",
              avatar: "",
              headline: "",
            },
            replyCount: 0,
            createdAt: new Date().toISOString(),
          };
          this.currentTopics.unshift(newTopic);
          return newTopic;
        }

        // 调用后端 API: POST /api/circles/{circleId}/topics
        // 后端请求体: CreateTopicRequest(authorId, title, content, images)
        const sessionStore = useSessionStore();
        const authorId = sessionStore.userSession?.userId ?? "";
        const result = await request<BackendCircleTopicView, { authorId: string; title: string; content: string; images?: string[] }>({
          url: `/circles/${circleId}/topics`,
          method: "POST",
          data: {
            authorId,
            title: data.title.trim(),
            content: data.content.trim(),
            images: data.images ?? [],
          },
        });

        const mappedResult = mapToTopicItem(result);
        this.currentTopics.unshift(mappedResult);
        return mappedResult;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "发布话题失败";
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
          this.errorMessage = "话题 ID 无效";
          throw new Error("话题 ID 无效");
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
    async fetchReplies(topicId: string, page = 1) {
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
        this.errorMessage = error instanceof Error ? error.message : "加载回复失败";
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
          this.errorMessage = "话题 ID 无效";
          throw new Error("话题 ID 无效");
        }
        if (!content || content.trim().length === 0) {
          this.errorMessage = "回复内容不能为空";
          throw new Error("回复内容不能为空");
        }

        if (useMock()) {
          const newReply: ReplyItem = {
            id: `reply-${Date.now()}`,
            topicId,
            author: {
              userId: "user-1001",
              name: "我",
              avatar: "",
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
        // 后端请求体: CreateReplyRequest(authorId, content)
        const sessionStore = useSessionStore();
        const authorId = sessionStore.userSession?.userId ?? "";
        const result = await request<BackendCircleReplyView, { authorId: string; content: string }>({
          url: `/circles/topics/${topicId}/replies`,
          method: "POST",
          data: { authorId, content: content.trim() },
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
        this.errorMessage = error instanceof Error ? error.message : "回复失败";
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
        this.errorMessage = error instanceof Error ? error.message : "加载精选话题失败";
      } finally {
        this.loading = false;
      }
    },
  },
});
