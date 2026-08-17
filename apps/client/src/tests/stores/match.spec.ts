import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { MatchCardUser } from "../../types/match";

const discoverMock = vi.hoisted(() => ({
  swipeRight: vi.fn(),
  lastSwipeResult: null as { matched?: boolean } | null,
}));

vi.mock("../../stores/discover", () => ({
  useDiscoverStore: () => discoverMock,
}));

import { useMatchStore } from "../../stores/match";

function makeUser(overrides: Partial<MatchCardUser> = {}): MatchCardUser {
  return {
    id: "card-1",
    userId: "user-1",
    name: "林晓",
    age: 21,
    avatar: "/static/assets/images/avatars/person-01-avatar.webp",
    photo: "/static/assets/images/people/person-01.webp",
    tags: ["摄影", "旅行"],
    headline: "想和你一起看展",
    matchScore: 92,
    commonGround: "都喜欢摄影",
    ...overrides,
  };
}

describe("match store 状态机", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    discoverMock.swipeRight.mockReset();
    discoverMock.lastSwipeResult = null;
  });

  it("初始为 idle，canProceed 为 false", () => {
    const store = useMatchStore();
    expect(store.status).toBe("idle");
    expect(store.canProceed).toBe(false);
  });

  it("beginCheck -> checking，并保存快照", () => {
    const store = useMatchStore();
    const user = makeUser();
    store.beginCheck(user, user.id, "like");
    expect(store.status).toBe("checking");
    expect(store.matchedUser?.userId).toBe(user.userId);
    expect(store.pendingAction).toBe("like");
  });

  it("runMatchCheck 命中 matched -> matched，动画完成后 canProceed", async () => {
    discoverMock.lastSwipeResult = { matched: true };
    discoverMock.swipeRight.mockResolvedValue(undefined);

    const store = useMatchStore();
    store.beginCheck(makeUser(), "card-1", "superLike");
    await store.runMatchCheck();

    expect(store.status).toBe("matched");
    expect(store.canProceed).toBe(false);
    store.markAnimationDone();
    expect(store.canProceed).toBe(true);
    expect(discoverMock.swipeRight).toHaveBeenCalledWith("card-1", true);
  });

  it("runMatchCheck 单向喜欢 -> idle，canProceed 保持 false", async () => {
    discoverMock.lastSwipeResult = { matched: false };
    discoverMock.swipeRight.mockResolvedValue(undefined);

    const store = useMatchStore();
    store.beginCheck(makeUser(), "card-1", "like");
    await store.runMatchCheck();

    expect(store.status).toBe("idle");
    expect(store.canProceed).toBe(false);
  });

  it("runMatchCheck 接口异常 -> failed，记录 lastError", async () => {
    discoverMock.swipeRight.mockRejectedValue(new Error("网络错误"));

    const store = useMatchStore();
    store.beginCheck(makeUser(), "card-1", "like");
    await store.runMatchCheck();

    expect(store.status).toBe("failed");
    expect(store.lastError).toContain("网络错误");
  });

  it("markChatReady 仅 matched 时进入 chat_ready，reset 回到 idle", () => {
    const store = useMatchStore();
    store.beginCheck(makeUser(), "card-1", "like");
    store.markAnimationDone();

    store.markChatReady();
    expect(store.status).toBe("checking");

    store.status = "matched";
    store.markChatReady();
    expect(store.status).toBe("chat_ready");

    store.reset();
    expect(store.status).toBe("idle");
    expect(store.matchedUser).toBeNull();
    expect(store.canProceed).toBe(false);
  });
});