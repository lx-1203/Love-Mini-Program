import { defineStore } from "pinia";
import { appEnv } from "../services/env";
import { request } from "../services/http";
import { useSessionStore } from "./session";

/* ========== 后端视图类型 ========== */

/**
 * 后端 DailyQuestionView 类型
 * 对应后端 record DailyQuestionView(Long id, LocalDate questionDate, String questionText, boolean hasAnswered, String category, int answerCount)
 */
export interface BackendDailyQuestionView {
  id: number;
  questionDate: string;
  questionText: string;
  hasAnswered: boolean;
  /** 问题分类 */
  category: string;
  /** 回答数量 */
  answerCount: number;
}

/**
 * 后端 DailyAnswerView 类型
 * 对应后端 record DailyAnswerView(Long id, Long userId, String authorName, String content, boolean isAnonymous, LocalDateTime createdAt, String avatarUrl)
 */
export interface BackendDailyAnswerView {
  id: number;
  userId: number;
  authorName: string;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  /** 回答者头像 URL */
  avatarUrl: string;
}

/**
 * 将后端 DailyQuestionView 映射为前端 DailyQuestion
 */
function mapToDailyQuestion(raw: BackendDailyQuestionView): DailyQuestion {
  return {
    id: String(raw.id),
    question: raw.questionText,
    category: raw.category || "",
    date: raw.questionDate,
    answerCount: raw.answerCount ?? 0,
    hasAnswered: raw.hasAnswered,
  };
}

/**
 * 将后端 DailyAnswerView 映射为前端 DailyAnswer
 */
function mapToDailyAnswer(raw: BackendDailyAnswerView, questionId?: string): DailyAnswer {
  return {
    id: String(raw.id),
    questionId: questionId ?? "",
    userId: String(raw.userId),
    userName: raw.isAnonymous ? "" : raw.authorName,
    userAvatar: raw.isAnonymous ? "" : (raw.avatarUrl || ""),
    isAnonymous: raw.isAnonymous,
    authorName: raw.isAnonymous ? "" : raw.authorName,
    authorAvatar: raw.isAnonymous ? "" : (raw.avatarUrl || ""),
    content: raw.content,
    createdAt: raw.createdAt,
  };
}

/* ========== 类型定义 ========== */

/**
 * 每日问题
 */
export interface DailyQuestion {
  /** 问题 ID */
  id: string;
  /** 问题文本 */
  question: string;
  /** 问题分类 */
  category: string;
  /** 问题日期（YYYY-MM-DD） */
  date: string;
  /** 回答数量 */
  answerCount: number;
  /** 当前用户是否已回答 */
  hasAnswered: boolean;
}

/**
 * 每日回答
 */
export interface DailyAnswer {
  /** 回答 ID */
  id: string;
  /** 问题 ID */
  questionId: string;
  /** 回答者用户 ID */
  userId: string;
  /** 回答者用户名 */
  userName: string;
  /** 回答者头像 */
  userAvatar: string;
  /** 是否匿名 */
  isAnonymous: boolean;
  /** 作者名称（匿名时为空） */
  authorName: string;
  /** 作者头像（匿名时为空） */
  authorAvatar: string;
  /** 回答内容 */
  content: string;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 回答项（兼容旧接口）
 */
export interface AnswerItem {
  /** 回答 ID */
  id: string;
  /** 问题 ID */
  questionId: string;
  /** 回答者用户名（匿名时为空） */
  authorName: string;
  /** 回答者头像 */
  authorAvatar: string;
  /** 是否匿名 */
  isAnonymous: boolean;
  /** 回答内容 */
  content: string;
  /** 创建时间 */
  createdAt: string;
}

/**
 * DailyQuestionStore 状态
 */
export interface DailyQuestionState {
  /** 今日问题 */
  todayQuestion: DailyQuestion | null;
  /** 回答列表 */
  answers: DailyAnswer[];
  /** 当前用户是否已回答 */
  hasAnswered: boolean;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  errorMessage: string | null;
  /** 回答列表当前页码 */
  answerPage: number;
  /** 回答列表是否还有更多 */
  answerHasMore: boolean;
}

/* ========== Mock 数据 ========== */

const mockTodayQuestion: DailyQuestion = {
  id: "dq-20260522",
  question: "你理想中的第一次约会是什么样？",
  category: "恋爱",
  date: "2026-05-22",
  answerCount: 2,
  hasAnswered: false,
};

const mockAnswers: DailyAnswer[] = [
  {
    id: "ans-1",
    questionId: "dq-20260522",
    userId: "u-1",
    userName: "小鹿",
    userAvatar: "",
    isAnonymous: false,
    authorName: "小鹿",
    authorAvatar: "",
    content: "希望是在一个安静的咖啡馆，两个人慢慢聊天，不用太刻意，就是那种很自然的感觉。",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "ans-2",
    questionId: "dq-20260522",
    userId: "u-2",
    userName: "",
    userAvatar: "",
    isAnonymous: true,
    authorName: "",
    authorAvatar: "",
    content: "想一起去公园散步，看夕阳，然后一起吃个晚饭。不需要多浪漫，重要的是两个人在一起。",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "ans-3",
    questionId: "dq-20260522",
    userId: "u-3",
    userName: "南风",
    userAvatar: "",
    isAnonymous: false,
    authorName: "南风",
    authorAvatar: "",
    content: "一起去看一场电影，然后边走边聊感受。如果聊得来，就找个地方坐下来继续聊。",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "ans-4",
    questionId: "dq-20260522",
    userId: "u-4",
    userName: "",
    userAvatar: "",
    isAnonymous: true,
    authorName: "",
    authorAvatar: "",
    content: "一起去逛书店，各自挑一本喜欢的书送给对方，然后找个地方一起看。",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
];

/** 每页回答数量 */
const ANSWER_PAGE_SIZE = 20;

function useMock() {
  return appEnv.apiMode === "mock";
}

/**
 * 格式化相对时间
 */
export function formatAnswerTime(dateStr: string): string {
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
 * 每日一问 Store
 *
 * 管理每日问题、回答提交和回答列表。
 */
export const useDailyQuestionStore = defineStore("daily-question", {
  state: (): DailyQuestionState => ({
    todayQuestion: null,
    answers: [],
    hasAnswered: false,
    loading: false,
    errorMessage: null,
    answerPage: 1,
    answerHasMore: true,
  }),

  actions: {
    /**
     * 获取今日问题
     */
    async fetchTodayQuestion() {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.todayQuestion = { ...mockTodayQuestion };
          return;
        }

        // 调用后端 API: GET /api/daily-question/today
        // 后端返回 DailyQuestionView
        const data = await request<BackendDailyQuestionView>({
          url: "/daily-question/today",
          method: "GET",
        });
        this.todayQuestion = mapToDailyQuestion(data);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载每日一问失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 提交回答
     * @param questionId - 问题 ID
     * @param content - 回答内容
     * @param isAnonymous - 是否匿名
     */
    async submitAnswer(questionId: string, content: string, isAnonymous: boolean) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!questionId || questionId.trim().length === 0) {
          this.errorMessage = "问题 ID 无效";
          throw new Error("问题 ID 无效");
        }
        if (!content || content.trim().length === 0) {
          this.errorMessage = "回答内容不能为空";
          throw new Error("回答内容不能为空");
        }
        if (content.length > 500) {
          this.errorMessage = "回答内容不能超过500字";
          throw new Error("回答内容不能超过500字");
        }

        if (useMock()) {
          const sessionStore = useSessionStore();
          const currentUserId = sessionStore.userSession?.userId ?? "mock-user";
          const newAnswer: DailyAnswer = {
            id: `ans-${Date.now()}`,
            questionId,
            userId: currentUserId,
            userName: isAnonymous ? "" : "我",
            userAvatar: "",
            isAnonymous,
            authorName: isAnonymous ? "" : "我",
            authorAvatar: "",
            content: content.trim(),
            createdAt: new Date().toISOString(),
          };
          this.answers.unshift(newAnswer);
          this.hasAnswered = true;
          return newAnswer;
        }

        // 调用后端 API: POST /api/daily-question/answer
        // 后端请求体: DailyAnswerRequest(userId, questionId, content, isAnonymous)
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        const result = await request<BackendDailyAnswerView, { userId: string; questionId: string; content: string; isAnonymous: boolean }>({
          url: `/daily-question/answer`,
          method: "POST",
          data: {
            userId,
            questionId,
            content: content.trim(),
            isAnonymous,
          },
        });

        const mappedResult = mapToDailyAnswer(result, questionId);
        this.answers.unshift(mappedResult);
        this.hasAnswered = true;
        return mappedResult;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "提交回答失败";
        throw error;
      }
    },

    /**
     * 获取回答列表
     * @param questionId - 问题 ID
     * @param page - 页码（从 1 开始）
     */
    async fetchAnswers(questionId: string, page = 1) {
      this.errorMessage = null;

      try {
        if (!questionId || questionId.trim().length === 0) {
          this.errorMessage = "问题 ID 无效";
          throw new Error("问题 ID 无效");
        }

        if (useMock()) {
          const answers = [...mockAnswers];
          if (page === 1) {
            this.answers = answers;
          } else {
            this.answers.push(...answers);
            this.answerHasMore = false;
          }
          this.answerPage = page;
          this.answerHasMore = answers.length >= ANSWER_PAGE_SIZE ? false : false;
          return;
        }

        // 调用后端 API: GET /api/daily-question/answers?questionId={id}&page={page}&size={size}
        // 后端返回 Spring Data Page<DailyAnswerView>，格式为 { content, totalElements, number, size }
        const data = await request<{ content: BackendDailyAnswerView[]; totalElements: number; number: number; size: number }>({
          url: `/daily-question/answers?questionId=${questionId}&page=${page - 1}&size=${ANSWER_PAGE_SIZE}`,
          method: "GET",
        });

        const mappedAnswers = data.content.map((item) => mapToDailyAnswer(item, questionId));
        if (page === 1) {
          this.answers = mappedAnswers;
        } else {
          this.answers.push(...mappedAnswers);
        }
        this.answerPage = page;
        this.answerHasMore = data.content.length >= ANSWER_PAGE_SIZE;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载回答失败";
      }
    },
  },
});
