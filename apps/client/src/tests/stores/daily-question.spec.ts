import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock env: forces mock mode
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => true,
}));

// mock useMock to return true
vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: () => true,
}));

// mock request 以避免真实 http 调用
vi.mock("../../services/http", () => ({
  request: vi.fn(),
}));

// stub global uni
(globalThis as any).uni = {};

import { useDailyQuestionStore, formatAnswerTime } from "../../stores/daily-question";

describe("daily-question store - 每日一问", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // fetchTodayQuestion()
  // ------------------------------------------------------------------
  it("fetchTodayQuestion() 在 mock 模式下加载今日问题", async () => {
    const store = useDailyQuestionStore();
    await store.fetchTodayQuestion();

    expect(store.todayQuestion).not.toBeNull();
    expect(store.todayQuestion!.id).toBe("dq-20260522");
    expect(store.todayQuestion!.question).toContain("约会");
    expect(store.todayQuestion!.category).toBe("恋爱");
    expect(store.loading).toBe(false);
  });

  it("fetchTodayQuestion() 完成后 loading=false", async () => {
    const store = useDailyQuestionStore();
    await store.fetchTodayQuestion();
    expect(store.loading).toBe(false);
  });

  // ------------------------------------------------------------------
  // submitAnswer()
  // ------------------------------------------------------------------
  it("submitAnswer() 成功提交并 prepend 到 answers 列表", async () => {
    const store = useDailyQuestionStore();
    await store.fetchTodayQuestion();

    const result = await store.submitAnswer("dq-20260522", "我的回答", false);

    expect(result).not.toBeUndefined();
    expect(result!.content).toBe("我的回答");
    expect(store.answers.length).toBeGreaterThan(0);
    expect(store.answers[0]!.content).toBe("我的回答");
    expect(store.hasAnswered).toBe(true);
  });

  it("submitAnswer() 空 questionId 抛出错误", async () => {
    const store = useDailyQuestionStore();
    await expect(store.submitAnswer("", "内容", false)).rejects.toThrow();
    expect(store.errorMessage).not.toBeNull();
  });

  it("submitAnswer() 空内容抛出错误", async () => {
    const store = useDailyQuestionStore();
    await expect(store.submitAnswer("dq-20260522", "", false)).rejects.toThrow();
    expect(store.errorMessage).not.toBeNull();
  });

  it("submitAnswer() 超长内容（>500）抛出错误", async () => {
    const store = useDailyQuestionStore();
    const longContent = "a".repeat(501);
    await expect(store.submitAnswer("dq-20260522", longContent, false)).rejects.toThrow();
    expect(store.errorMessage).not.toBeNull();
  });

  it("submitAnswer() 匿名提交时 userName 为空", async () => {
    const store = useDailyQuestionStore();
    await store.fetchTodayQuestion();

    const result = await store.submitAnswer("dq-20260522", "匿名回答", true);

    expect(result!.isAnonymous).toBe(true);
    expect(result!.userName).toBe("");
    expect(result!.authorName).toBe("");
  });

  // ------------------------------------------------------------------
  // fetchAnswers()
  // ------------------------------------------------------------------
  it("fetchAnswers() 加载回答列表", async () => {
    const store = useDailyQuestionStore();
    await store.fetchAnswers("dq-20260522", 1);

    expect(store.answers.length).toBeGreaterThan(0);
    expect(store.answerPage).toBe(1);
  });

  it("fetchAnswers() page=1 时重置 answers 列表", async () => {
    const store = useDailyQuestionStore();
    await store.fetchAnswers("dq-20260522", 1);
    const firstCount = store.answers.length;

    await store.fetchAnswers("dq-20260522", 1);
    expect(store.answers.length).toBe(firstCount);
  });

  it("fetchAnswers() 空 questionId 设置错误状态", async () => {
    const store = useDailyQuestionStore();
    await store.fetchAnswers("", 1);

    expect(store.errorMessage).not.toBeNull();
  });

  // ------------------------------------------------------------------
  // 初始状态
  // ------------------------------------------------------------------
  it("初始状态 todayQuestion=null, answers=[], hasAnswered=false", () => {
    const store = useDailyQuestionStore();
    expect(store.todayQuestion).toBeNull();
    expect(store.answers).toEqual([]);
    expect(store.hasAnswered).toBe(false);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  // ------------------------------------------------------------------
  // formatAnswerTime 工具函数
  // ------------------------------------------------------------------
  it("formatAnswerTime 1分钟内返回 '刚刚'", () => {
    const recent = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatAnswerTime(recent)).toBe("刚刚");
  });

  it("formatAnswerTime 1小时内返回 'X分钟前'", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatAnswerTime(recent)).toContain("分钟前");
  });

  it("formatAnswerTime 1天内返回 'X小时前'", () => {
    const recent = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatAnswerTime(recent)).toContain("小时前");
  });

  it("formatAnswerTime 超过1天返回 'X天前'", () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatAnswerTime(recent)).toContain("天前");
  });
});
