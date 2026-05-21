import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useMatchStore } from "../stores/match";
import { clientApi } from "../services/api";

vi.mock("../services/api", () => ({
  clientApi: {
    getMatchFormConfig: vi.fn(),
    createMatch: vi.fn(),
    createQuickMatch: vi.fn(),
    getMatchResult: vi.fn(),
  },
}));

describe("match store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("keeps queued matches on the page until a refresh returns a connected session", async () => {
    vi.mocked(clientApi.createQuickMatch).mockResolvedValue({
      id: "match-queued",
      queueStatus: "queued",
      topicLabel: "快速匹配",
      partnerHeadline: "大二，喜欢低压力的第一次见面。",
      countdownMinutes: 30,
      recommendedPrompt: "先等等，对方还在确认里。",
      tempChatSessionId: null,
    });
    vi.mocked(clientApi.getMatchResult).mockResolvedValue({
      id: "match-queued",
      queueStatus: "connected",
      topicLabel: "快速匹配",
      partnerHeadline: "大二，喜欢低压力的第一次见面。",
      countdownMinutes: 30,
      recommendedPrompt: "现在可以直接进聊天。",
      tempChatSessionId: "session-match-queued",
    });

    const matchStore = useMatchStore();

    const queued = await matchStore.quickMatch(30);
    expect(queued.canOpenChat).toBe(false);
    expect(queued.statusCopy).toBe("等待对方加入");
    expect(queued.resultLead).toContain("不会提前创建聊天会话");

    const refreshed = await matchStore.refreshActiveMatch();
    expect(clientApi.getMatchResult).toHaveBeenCalledWith("match-queued");
    expect(refreshed?.canOpenChat).toBe(true);
    expect(matchStore.activeMatch?.statusCopy).toBe("会话已就绪");
  });
});
