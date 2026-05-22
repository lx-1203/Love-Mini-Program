import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock env: forces mock mode for all store data
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
}));

// stub global uni used by notifyHeartSignal
const mockShowToast = vi.fn();
const mockRequestSubscribeMessage = vi.fn();
(globalThis as any).uni = {
  showToast: mockShowToast,
  requestSubscribeMessage: mockRequestSubscribeMessage,
};

import { useLikesStore } from "../../stores/likes";

describe("likes store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // fetchLikes
  // ------------------------------------------------------------------
  it("fetchLikes loads both likes and likedBy from mock data", async () => {
    const store = useLikesStore();
    await store.fetchLikes();

    expect(store.likes.length).toBeGreaterThan(0);
    expect(store.likedBy.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  // ------------------------------------------------------------------
  // fetchVisitors
  // ------------------------------------------------------------------
  it("fetchVisitors loads visitor records and sets isNew flags", async () => {
    const store = useLikesStore();
    await store.fetchVisitors();

    expect(store.visitors.length).toBeGreaterThan(0);
    // at least one visitor should be marked as new
    const hasNewVisitor = store.visitors.some((v) => v.isNew);
    expect(hasNewVisitor).toBe(true);
    expect(store.loading).toBe(false);
  });

  // ------------------------------------------------------------------
  // likeUser – success
  // ------------------------------------------------------------------
  it("likeUser adds the target to personal likes when the user exists in likedBy", async () => {
    const store = useLikesStore();
    await store.fetchLikes(); // load likedBy list

    const targetUserId = store.likedBy[0].userId;
    const beforeCount = store.likes.length;

    await store.likeUser(targetUserId);

    expect(store.likes.length).toBe(beforeCount + 1);
    const added = store.likes.find((item) => item.userId === targetUserId);
    expect(added).toBeDefined();
    expect(store.errorMessage).toBeNull();
  });

  // ------------------------------------------------------------------
  // likeUser – self-like check
  // ------------------------------------------------------------------
  it("likeUser throws when trying to like self", async () => {
    const store = useLikesStore();
    await store.fetchLikes();

    // currentUserId defaults to "user-1001" in mock mode
    await expect(store.likeUser("user-1001")).rejects.toThrow("不能喜欢自己哦");
    expect(store.errorMessage).toBe("不能喜欢自己哦");
  });

  // ------------------------------------------------------------------
  // likeUser – duplicate check
  // ------------------------------------------------------------------
  it("likeUser throws when liking the same user twice", async () => {
    const store = useLikesStore();
    await store.fetchLikes();

    const targetUserId = store.likedBy[0].userId;
    await store.likeUser(targetUserId); // first like succeeds

    // second like should throw
    await expect(store.likeUser(targetUserId)).rejects.toThrow(
      "你已经喜欢过该用户了"
    );
    expect(store.errorMessage).toBe("你已经喜欢过该用户了");
  });

  // ------------------------------------------------------------------
  // likeUser – empty userId
  // ------------------------------------------------------------------
  it("likeUser throws when userId is empty", async () => {
    const store = useLikesStore();
    await expect(store.likeUser("")).rejects.toThrow("用户 ID 无效");
  });

  // ------------------------------------------------------------------
  // unlikeUser
  // ------------------------------------------------------------------
  it("unlikeUser removes the user from my likes", async () => {
    const store = useLikesStore();
    await store.fetchLikes();

    const targetUserId = store.likedBy[0].userId;
    await store.likeUser(targetUserId);
    expect(store.likes.some((item) => item.userId === targetUserId)).toBe(true);

    await store.unlikeUser(targetUserId);
    expect(store.likes.some((item) => item.userId === targetUserId)).toBe(false);
  });

  it("unlikeUser throws when userId is empty", async () => {
    const store = useLikesStore();
    await expect(store.unlikeUser("")).rejects.toThrow("用户 ID 无效");
  });

  // ------------------------------------------------------------------
  // checkMutualLike
  // ------------------------------------------------------------------
  it("checkMutualLike returns true when both sides have liked each other", () => {
    const store = useLikesStore();

    // arrange: a user appears in both likes and likedBy
    const mutualUserId = "user-mutual-1";
    store.likes = [
      {
        id: "like-m1",
        userId: mutualUserId,
        name: "测试用户",
        avatar: "",
        headline: "",
        likedAt: new Date().toISOString(),
      },
    ];
    store.likedBy = [
      {
        id: "like-m2",
        userId: mutualUserId,
        name: "测试用户",
        avatar: "",
        headline: "",
        likedAt: new Date().toISOString(),
      },
    ];

    const result = store.checkMutualLike(mutualUserId);
    expect(result).toBe(true);
  });

  it("checkMutualLike returns false when only one side has liked", () => {
    const store = useLikesStore();

    store.likes = [];
    store.likedBy = [
      {
        id: "like-x",
        userId: "user-one-sided",
        name: "单向",
        avatar: "",
        headline: "",
        likedAt: new Date().toISOString(),
      },
    ];

    const result = store.checkMutualLike("user-one-sided");
    expect(result).toBe(false);
  });

  it("checkMutualLike returns false for self-like", () => {
    const store = useLikesStore();
    // currentUserId defaults to "user-1001"
    const result = store.checkMutualLike("user-1001");
    expect(result).toBe(false);
  });

  it("checkMutualLike returns false when userId is empty", () => {
    const store = useLikesStore();
    const result = store.checkMutualLike("");
    expect(result).toBe(false);
    expect(store.errorMessage).toBe("用户 ID 无效");
  });

  it("checkMutualLike creates a heart signal on mutual match and shows notification", () => {
    const store = useLikesStore();

    const mutualUserId = "user-2003";
    store.likes = [
      {
        id: "like-signal-1",
        userId: mutualUserId,
        name: "苏晴",
        avatar: "",
        headline: "",
        likedAt: new Date().toISOString(),
      },
    ];
    store.likedBy = [
      {
        id: "like-signal-2",
        userId: mutualUserId,
        name: "苏晴",
        avatar: "",
        headline: "",
        likedAt: new Date().toISOString(),
      },
    ];

    const beforeCount = store.heartSignals.length;
    const result = store.checkMutualLike(mutualUserId);

    expect(result).toBe(true);
    // should have created a new heart signal
    expect(store.heartSignals.length).toBeGreaterThan(beforeCount);
    const newSignal = store.heartSignals.find(
      (s) => s.fromUserId === mutualUserId && s.status === "pending"
    );
    expect(newSignal).toBeDefined();
    // should have triggered notification
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("💕"),
      })
    );
  });

  // ------------------------------------------------------------------
  // fetchHeartSignals
  // ------------------------------------------------------------------
  it("fetchHeartSignals loads heart signals from mock data", async () => {
    const store = useLikesStore();
    await store.fetchHeartSignals();

    expect(store.heartSignals.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
  });

  // ------------------------------------------------------------------
  // acceptHeartSignal
  // ------------------------------------------------------------------
  it("acceptHeartSignal updates signal status to accepted", async () => {
    const store = useLikesStore();
    await store.fetchHeartSignals();

    const firstPending = store.heartSignals.find(
      (s) => s.status === "pending"
    );
    expect(firstPending).toBeDefined();

    await store.acceptHeartSignal(firstPending!.id);

    const updated = store.heartSignals.find((s) => s.id === firstPending!.id);
    expect(updated?.status).toBe("accepted");
  });

  // ------------------------------------------------------------------
  // mutualLikes getter
  // ------------------------------------------------------------------
  it("mutualLikes getter returns only users who appear in both lists", () => {
    const store = useLikesStore();

    store.likes = [
      {
        id: "l1",
        userId: "user-A",
        name: "A",
        avatar: "",
        headline: "",
        likedAt: "",
      },
      {
        id: "l2",
        userId: "user-B",
        name: "B",
        avatar: "",
        headline: "",
        likedAt: "",
      },
    ];
    store.likedBy = [
      {
        id: "lb1",
        userId: "user-A",
        name: "A",
        avatar: "",
        headline: "",
        likedAt: "",
      },
      {
        id: "lb2",
        userId: "user-C",
        name: "C",
        avatar: "",
        headline: "",
        likedAt: "",
      },
    ];

    const mutual = store.mutualLikes;
    expect(mutual).toHaveLength(1);
    expect(mutual[0].userId).toBe("user-A");
  });

  // ------------------------------------------------------------------
  // pendingHeartSignals getter
  // ------------------------------------------------------------------
  it("pendingHeartSignals returns only signals with pending status", () => {
    const store = useLikesStore();

    store.heartSignals = [
      {
        id: "s1",
        fromUserId: "u1",
        fromUserName: "",
        fromUserAvatar: "",
        toUserId: "",
        status: "pending",
        sentAt: "",
        expiresAt: "",
      },
      {
        id: "s2",
        fromUserId: "u2",
        fromUserName: "",
        fromUserAvatar: "",
        toUserId: "",
        status: "accepted",
        sentAt: "",
        expiresAt: "",
      },
      {
        id: "s3",
        fromUserId: "u3",
        fromUserName: "",
        fromUserAvatar: "",
        toUserId: "",
        status: "expired",
        sentAt: "",
        expiresAt: "",
      },
      {
        id: "s4",
        fromUserId: "u4",
        fromUserName: "",
        fromUserAvatar: "",
        toUserId: "",
        status: "pending",
        sentAt: "",
        expiresAt: "",
      },
    ];

    const pending = store.pendingHeartSignals;
    expect(pending).toHaveLength(2);
    expect(pending.every((s) => s.status === "pending")).toBe(true);
  });

  // ------------------------------------------------------------------
  // markVisitorRead
  // ------------------------------------------------------------------
  it("markVisitorRead sets isNew to false for the given visitor", async () => {
    const store = useLikesStore();
    await store.fetchVisitors();

    const newVisitor = store.visitors.find((v) => v.isNew);
    expect(newVisitor).toBeDefined();

    store.markVisitorRead(newVisitor!.id);
    const updated = store.visitors.find((v) => v.id === newVisitor!.id);
    expect(updated?.isNew).toBe(false);
  });
});