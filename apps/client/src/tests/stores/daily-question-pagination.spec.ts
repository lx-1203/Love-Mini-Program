import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

/**
 * 每日一问：回答分页在途守卫（P2-3）+ 契约漂移（P2-5a/5b）+ 首屏 hasAnswered（第五轮 FINDING 2）。
 *
 * 默认跑在 real 档（useMock=false），因为线上出事的就是真实分页链路：
 * 页面守卫读的是 `fetchTodayQuestion` 的 loading，`fetchAnswers` 从不置位，
 * 于是快速两次 scrolltolower 会双发同一页并双份 append。
 * `hasAnswered` 落盘那组用例需要 mock 档也跑一遍（演示档的「答过一次再刷新」是同一条
 * 状态轴的另一半），故 useMock 换成可切换的旗标，每个用例开头复位为 false。
 */
const mockFlag = vi.hoisted(() => ({ value: false }));

vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "real",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => false,
}));

vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: () => mockFlag.value,
}));

vi.mock("../../services/http", () => ({
  request: vi.fn(),
  getToken: vi.fn(() => ""),
}));

(globalThis as any).uni = {};

import { request } from "../../services/http";
import {
  answerInitial,
  MAX_ANSWER_LENGTH,
  useDailyQuestionStore,
} from "../../stores/daily-question";

/** ANSWER_PAGE_SIZE（store 内部常量）= 20；用满一页才能让 answerHasMore 保持 true */
const PAGE_SIZE = 20;

function pageContent(page: number, authorName: string | null = "作者") {
  return {
    content: Array.from({ length: PAGE_SIZE }, (_unused, i) => ({
      id: page * 1000 + i,
      userId: i,
      authorName,
      content: `p${page}-${i}`,
      isAnonymous: false,
      createdAt: new Date(Date.now() - i * 60_000).toISOString(),
      avatarUrl: "",
    })),
    totalElements: PAGE_SIZE * 10,
    number: page - 1,
    size: PAGE_SIZE,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  mockFlag.value = false;
});

describe("daily-question 回答分页在途守卫（P2-3）", () => {
  it("两次并发 load-more：同页只发一次请求，列表不翻倍，页码只前进一格", async () => {
    const store = useDailyQuestionStore();
    mockedRequest.mockResolvedValue(pageContent(1) as never);
    await store.fetchAnswers("q1", 1);
    expect(store.answers.length).toBe(PAGE_SIZE);
    expect(store.answerPage).toBe(1);
    expect(mockedRequest).toHaveBeenCalledTimes(1);

    // 第 2 页「在途未落地」时连打两次 load-more —— 这就是原缺陷的触发时序
    const inflight = deferred<ReturnType<typeof pageContent>>();
    mockedRequest.mockReturnValue(inflight.promise as never);
    const first = store.fetchAnswers("q1", 2);
    const second = store.fetchAnswers("q1", 2);

    expect(store.answerLoading).toBe(true);

    inflight.resolve(pageContent(2));
    await Promise.all([first, second]);

    expect(mockedRequest).toHaveBeenCalledTimes(2); // 不是 3：第二次并发被吞掉
    expect(store.answers.length).toBe(PAGE_SIZE * 2); // 不是 3×PAGE_SIZE：没有重复卡片
    expect(store.answerPage).toBe(2); // 不是 3：页码没被双推进
    expect(new Set(store.answers.map((a) => a.id)).size).toBe(store.answers.length);
    expect(store.answerLoading).toBe(false);
  });

  it("同一页第二次到达被丢弃（页码幂等，与在途无关）", async () => {
    const store = useDailyQuestionStore();
    mockedRequest.mockResolvedValue(pageContent(1) as never);
    await store.fetchAnswers("q1", 1);

    mockedRequest.mockResolvedValue(pageContent(2) as never);
    await store.fetchAnswers("q1", 2);
    expect(store.answers.length).toBe(PAGE_SIZE * 2);

    // 迟到/重放的「第 2 页」——在途守卫此刻已放开，必须靠页码幂等兜住
    await store.fetchAnswers("q1", 2);
    expect(store.answers.length).toBe(PAGE_SIZE * 2);
    expect(store.answerPage).toBe(2);
    expect(mockedRequest).toHaveBeenCalledTimes(2);
  });

  it("在途守卫与今日问题的 loading 解耦：fetchAnswers 不再借用 loading", async () => {
    const store = useDailyQuestionStore();
    const inflight = deferred<ReturnType<typeof pageContent>>();
    mockedRequest.mockReturnValue(inflight.promise as never);
    const p = store.fetchAnswers("q1", 1);
    expect(store.loading).toBe(false); // 今日问题没在加载，分页守卫不能靠它
    expect(store.answerLoading).toBe(true);
    inflight.resolve(pageContent(1));
    await p;
    expect(store.answerLoading).toBe(false);
  });

  it("第 1 页重新加载是替换而不是追加（避免重进页面时列表自乘）", async () => {
    const store = useDailyQuestionStore();
    mockedRequest.mockResolvedValueOnce(pageContent(1) as never);
    await store.fetchAnswers("q1", 1);
    mockedRequest.mockResolvedValueOnce(pageContent(2) as never);
    await store.fetchAnswers("q1", 2);
    expect(store.answers.length).toBe(PAGE_SIZE * 2);

    mockedRequest.mockResolvedValueOnce(pageContent(1) as never);
    await store.fetchAnswers("q1", 1);
    expect(store.answers.length).toBe(PAGE_SIZE);
    expect(store.answerPage).toBe(1);
  });

  it("第二道保险：即便页码守卫被绕过，同 id 的回答也不会重复入列", async () => {
    const store = useDailyQuestionStore();
    mockedRequest.mockResolvedValueOnce(pageContent(1) as never);
    await store.fetchAnswers("q1", 1);

    // 人为把游标退回 1，模拟「守卫失效 + 服务端把同一批数据又发了一遍」
    store.answerPage = 1;
    mockedRequest.mockResolvedValueOnce(pageContent(1) as never);
    await store.fetchAnswers("q1", 2);

    expect(store.answers.length).toBe(PAGE_SIZE); // 不是 2×PAGE_SIZE
    expect(new Set(store.answers.map((a) => a.id)).size).toBe(PAGE_SIZE);
  });
});

describe("daily-question authorName 可空（P2-5b）", () => {
  it("非匿名回答的 authorName 为 null 时不抛错、卡片不空白", async () => {
    const store = useDailyQuestionStore();
    mockedRequest.mockResolvedValue(pageContent(1, null) as never);

    await expect(store.fetchAnswers("q1", 1)).resolves.toBeUndefined();
    expect(store.answers.length).toBe(PAGE_SIZE);
    // 视图模型把可空昵称收敛成空串，模板取值不再触碰 null
    expect(store.answers[0]!.authorName).toBe("");
    expect(answerInitial(store.answers[0]!)).toBe("?");
  });

  it("answerInitial 覆盖有昵称 / 空昵称 / 非字符串 / 匿名四种输入", () => {
    expect(answerInitial({ isAnonymous: false, authorName: "  南风" })).toBe("南");
    expect(answerInitial({ isAnonymous: false, authorName: "" })).toBe("?");
    // 后端字段没有 @NotNull，运行时可能是 null/undefined —— 旧模板 answer.authorName[0] 正是死在这里
    expect(answerInitial({ isAnonymous: false, authorName: null as unknown as string })).toBe("?");
    expect(answerInitial({ isAnonymous: false, authorName: undefined as unknown as string })).toBe("?");
    expect(answerInitial({ isAnonymous: true, authorName: "不该出现" })).toBe("?");
  });
});

describe("daily-question 回答长度契约（P2-5a）", () => {
  it("上限取后端契约值 2000，不再被客户端 500 静默截断", () => {
    expect(MAX_ANSWER_LENGTH).toBe(2000);
  });

  it("1200 字（旧上限之上、契约之内）可以提交", async () => {
    const store = useDailyQuestionStore();
    mockedRequest.mockResolvedValue({
      id: 1,
      userId: 1,
      authorName: "我",
      content: "x",
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      avatarUrl: "",
    } as never);
    await expect(store.submitAnswer("q1", "x".repeat(1200), false)).resolves.toBeDefined();
    expect(store.errorMessage).toBeNull();
  });

  it("超过契约上限则拒绝并给出带上限值的报错", async () => {
    const store = useDailyQuestionStore();
    await expect(store.submitAnswer("q1", "x".repeat(MAX_ANSWER_LENGTH + 1), false)).rejects.toThrow();
    expect(store.errorMessage).toContain(String(MAX_ANSWER_LENGTH));
  });
});

/**
 * 第五轮 FINDING 2（P2 活错）：`fetchTodayQuestion` 必须把后端下发的 `hasAnswered`
 * 写进 store **顶层** state。
 *
 * 病灶：顶层 `hasAnswered` 此前只有 `submitAnswer` 会写，`mapToDailyQuestion` 把后端
 * 那个同名字段放进了 `todayQuestion.hasAnswered`（视图字段，另一个位置）。而页面
 * `subpackages/tools/daily-question/index.vue` 的 onMounted 读的是顶层那份
 * （`if (todayQuestion.value && hasAnswered.value) fetchAnswers(...)`）⇒
 * 「今天已经答过、重进页面」永远不拉回答，回答列表 + 整条分页链路在首屏不可达，
 * EmptyState 分支也永不成立。
 *
 * 判点取两个方向：后端说答过 ⇒ true；后端说没答过 ⇒ false（回退也要能发生，
 * 跨天/撤回都走这一条）。mock 档另测「本会话答过之后重取不得抹回 false」。
 */
function questionView(hasAnswered: boolean) {
  return {
    id: 91,
    questionDate: "2026-11-01",
    questionText: "今天有没有想到谁？",
    hasAnswered,
    category: "恋爱",
    answerCount: hasAnswered ? 3 : 0,
  };
}

describe("daily-question fetchTodayQuestion 落 hasAnswered（FINDING 2）", () => {
  it("real 档：后端下发 hasAnswered=true ⇒ store 顶层为 true", async () => {
    const store = useDailyQuestionStore();
    mockedRequest.mockResolvedValue(questionView(true) as never);

    await store.fetchTodayQuestion();

    expect(store.todayQuestion).not.toBeNull();
    expect(store.hasAnswered).toBe(true);
  });

  it("real 档：后端下发 hasAnswered=false ⇒ store 顶层为 false（含从 true 回退）", async () => {
    const store = useDailyQuestionStore();
    // 人为置真，证明这一判点吃的是后端下发值而不是「只要拿到过问题就算答过」
    store.hasAnswered = true;
    mockedRequest.mockResolvedValue(questionView(false) as never);

    await store.fetchTodayQuestion();

    expect(store.hasAnswered).toBe(false);
  });

  it("mock 档：未答过取演示值 false，答过之后重取保持 true", async () => {
    mockFlag.value = true;
    const store = useDailyQuestionStore();

    await store.fetchTodayQuestion();
    expect(store.hasAnswered).toBe(false);

    await store.submitAnswer(store.todayQuestion!.id, "想了一下下", false);
    expect(store.hasAnswered).toBe(true);

    // 清掉 todayQuestion 以绕开 30s TTL 命中，模拟「重进页面重新拉一次」
    store.todayQuestion = null;
    await store.fetchTodayQuestion();
    expect(store.hasAnswered).toBe(true);
  });
});
