import { defineStore } from "pinia";
import { request } from "../services/http";
import { useSessionStore } from "./session";
import { useMock } from "./helpers/use-mock";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";
// 2026-08-10 切换提速：今日问题 30s TTL 缓存
import { isCacheFresh, setCachedValue } from "../utils/cache-ttl";

/** 今日问题新鲜度窗口 */
const QUESTION_TTL_MS = 30_000;

/**
 * 回答正文长度上限。
 *
 * 单一真源常量（2026-10-31 契约轨 P2-5a）：此前 textarea `maxlength="500"` 与
 * store 校验各写一份 500，而后端 `DailyQuestionController` 的
 * `DailyAnswerRequest.content` 收的是 `@Size(max = 2000)` —— 客户端把用户在
 * 文档契约以下就截断了（且是静默截断，没有报错）。现在页面模板与 store 校验
 * 都引用这一个常量，改契约只需要改这里一次。
 */
export const MAX_ANSWER_LENGTH = 2000;

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
  /**
   * 作者昵称。后端 record 字段<b>无任何非空注解</b>
   * （apps/api/.../discover/DailyAnswerView.java:11），昵称未填时就是 JSON null，
   * 与 `isAnonymous` 无关——所以这里必须允许 null，不能像以前那样写 `string`
   * 骗过类型检查后在运行时炸 `null[0]`。
   */
  authorName: string | null;
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
 *
 * <p>契约轨 P2-5b（2026-10-31）：后端 `authorName` 是可空裸字段，非匿名回答也可能带
 * null 昵称。这里统一归一成<b>空串</b>，让视图模型 `DailyAnswer.authorName` 保持
 * `string` 语义；渲染侧的首字母取值另有兜底（见 pages/daily-question 的 `answerInitial`），
 * 不再出现 `answer.authorName[0]` 直接下标 null 崩掉整张卡片。</p>
 */
function mapToDailyAnswer(raw: BackendDailyAnswerView, questionId?: string): DailyAnswer {
  // 匿名时按既有语义清空展示身份；非匿名时把后端的 null 昵称收敛成 ""
  const displayName = raw.isAnonymous ? "" : (raw.authorName ?? "");
  const displayAvatar = raw.isAnonymous ? "" : (raw.avatarUrl || "");
  return {
    id: String(raw.id),
    questionId: questionId ?? "",
    userId: String(raw.userId),
    userName: displayName,
    userAvatar: displayAvatar,
    isAnonymous: raw.isAnonymous,
    authorName: displayName,
    authorAvatar: displayAvatar,
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
  /**
   * 回答分页自身的在途标志（2026-10-31 契约轨 P2-3）。
   *
   * <p>病灶：`fetchAnswers` 从不碰 `loading`，而页面 `loadMoreAnswers()` 的守卫读的正是
   * `loading`（那个只由 `fetchTodayQuestion` 置位）。于是快速两次 `scrolltolower`
   * 都读到 `answerPage=1`、都请求第 2 页、都 `push` ⇒ 重复回答卡片 + 头部计数虚高。
   * 现在分页守卫用这个独立标志，与「今日问题加载中」彻底分开。</p>
   */
  answerLoading: boolean;
}

/* ========== Mock 数据 ========== */

// infra R2-00105: 以下每日一问 mock 数据（问题/回答内容）为演示数据（useMock 守卫），
// real 分支由后端下发；如需多语言展示请走 i18n 或后端内容
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

/** 昵称缺失/匿名时头像位的占位字符 */
const ANSWER_INITIAL_PLACEHOLDER = "?";

/**
 * 头像位首字母（与 `formatAnswerTime` 同属「模板可用的展示工具」）。
 *
 * <p>契约轨 P2-5b（2026-10-31）：原模板直接写 `answer.authorName[0]`。
 * 后端 `DailyAnswerView.authorName` 是<b>没有任何非空注解</b>的 record 字段
 * （apps/api/.../discover/DailyAnswerView.java:11），非匿名回答也可能下发 null 昵称，
 * 取值即抛 TypeError，整张卡片被空白掉。此处对 null/空昵称统一兜占位符 "?"。</p>
 */
export function answerInitial(answer: Pick<DailyAnswer, "isAnonymous" | "authorName">): string {
  if (answer.isAnonymous) return ANSWER_INITIAL_PLACEHOLDER;
  const name = typeof answer.authorName === "string" ? answer.authorName.trim() : "";
  return name.length > 0 ? name.charAt(0) : ANSWER_INITIAL_PLACEHOLDER;
}

/**
 * 回答分页追加（按 id 去重）。
 *
 * 契约轨 P2-3 的第二道保险：即使调用方绕过在途守卫、把同一页送到两次，
 * 重复 id 也不会进列表（否则回答卡片成对出现、头部 `answers.length` 计数虚高）。
 * 返回新数组，不原地 push，避免 Pinia 状态被外部引用改写。
 */
function appendUniqueAnswers(existing: DailyAnswer[], incoming: DailyAnswer[]): DailyAnswer[] {
  const seen = new Set(existing.map((a) => a.id));
  const fresh = incoming.filter((a) => !seen.has(a.id));
  return fresh.length === 0 ? existing : [...existing, ...fresh];
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
    answerLoading: false,
  }),

  actions: {
    /**
     * 获取今日问题
     */
    async fetchTodayQuestion() {
      // 2026-08-10 切换提速：30s 内已加载且有数据时直接跳过
      // 2026-08-12 卡顿修复：mock 模式同样走 TTL（原 `!useMock() &&` 条件导致
      // 演示/mock 构建每次切回圈子页都重发——mock 数据恒定，TTL 保护体验一致）
      if (this.todayQuestion && isCacheFresh("daily-question:today", QUESTION_TTL_MS)) {
        return;
      }
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.todayQuestion = { ...mockTodayQuestion };
          // 2026-08-12：mock 分支同样刷新缓存时间戳（与 real 分支语义一致）
          setCachedValue("daily-question:today", true);
          return;
        }

        // 调用后端 API: GET /api/daily-question/today
        // 后端返回 DailyQuestionView
        const data = await request<BackendDailyQuestionView>({
          url: "/daily-question/today",
          method: "GET",
        });
        // 2026-08-10 切换提速：拉取成功后刷新缓存时间戳
        setCachedValue("daily-question:today", true);
        this.todayQuestion = mapToDailyQuestion(data);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.dailyQuestion.loadQuestionFailed");
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
          this.errorMessage = t("storeErrors.dailyQuestion.questionIdInvalid");
          throw new Error(t("storeErrors.dailyQuestion.questionIdInvalid"));
        }
        if (!content || content.trim().length === 0) {
          this.errorMessage = t("storeErrors.dailyQuestion.answerContentEmpty");
          throw new Error(t("storeErrors.dailyQuestion.answerContentEmpty"));
        }
        if (content.length > MAX_ANSWER_LENGTH) {
          this.errorMessage = t("storeErrors.dailyQuestion.answerContentTooLong", { n: MAX_ANSWER_LENGTH });
          throw new Error(t("storeErrors.dailyQuestion.answerContentTooLong", { n: MAX_ANSWER_LENGTH }));
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
        // 修复（P0-12）：后端 DailyAnswerRequest(questionId, content, isAnonymous)
        // 不含 userId（从 JWT 获取），删除请求体中多余的 userId 字段
        const result = await request<BackendDailyAnswerView, { questionId: string; content: string; isAnonymous: boolean }>({
          url: `/daily-question/answer`,
          method: "POST",
          data: {
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
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.dailyQuestion.submitAnswerFailed");
        throw error;
      }
    },

    /**
     * 获取回答列表
     *
     * <p>2026-10-31 契约轨 P2-3 修复两件事：</p>
     * <ol>
     *   <li><b>分页自己的在途守卫</b>：用 `answerLoading`（同步置位，先于任何 await），
     *       快速两次 `scrolltolower` 的第二次直接返回；不再依赖 `loading`（那是
     *       `fetchTodayQuestion` 的加载态，从不覆盖这条链路）。</li>
     *   <li><b>按页码幂等</b>：`answerPage` 单调递增，`page <= answerPage` 视为重复页丢弃；
     *       追加时再按回答 id 去重，保证「同一页第二次到达」不会翻倍行数、
     *       不会把头部计数（`answers.length`）抬高。</li>
     * </ol>
     *
     * @param questionId - 问题 ID
     * @param page - 页码（从 1 开始）
     */
    async fetchAnswers(questionId: string, page = 1) {
      // 在途：同一页（或任何分页请求）未落地前不重复发起
      if (this.answerLoading) {
        return;
      }
      // 幂等：页码不前进即为重复到达（含并发双双读到旧 answerPage 后排队到达的情形）
      if (page > 1 && page <= this.answerPage) {
        return;
      }
      this.errorMessage = null;
      this.answerLoading = true;

      try {
        if (!questionId || questionId.trim().length === 0) {
          this.errorMessage = t("storeErrors.dailyQuestion.questionIdInvalid");
          throw new Error(t("storeErrors.dailyQuestion.questionIdInvalid"));
        }

        if (useMock()) {
          const answers = [...mockAnswers];
          this.answers = page === 1 ? answers : appendUniqueAnswers(this.answers, answers);
          this.answerPage = page;
          // 修复：原代码恒为 false，导致分页加载失效；改为根据返回数据量判断是否还有更多
          this.answerHasMore = answers.length >= ANSWER_PAGE_SIZE;
          return;
        }

        // 调用后端 API: GET /api/daily-question/answers?questionId={id}&page={page}&size={size}
        // 后端返回 Spring Data Page<DailyAnswerView>，格式为 { content, totalElements, number, size }
        const data = await request<{ content: BackendDailyAnswerView[]; totalElements: number; number: number; size: number }>({
          url: `/daily-question/answers?questionId=${questionId}&page=${page - 1}&size=${ANSWER_PAGE_SIZE}`,
          method: "GET",
        });

        const mappedAnswers = data.content.map((item) => mapToDailyAnswer(item, questionId));
        this.answers = page === 1 ? mappedAnswers : appendUniqueAnswers(this.answers, mappedAnswers);
        this.answerPage = page;
        this.answerHasMore = data.content.length >= ANSWER_PAGE_SIZE;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.dailyQuestion.loadAnswersFailed");
      } finally {
        this.answerLoading = false;
      }
    },
  },
});
