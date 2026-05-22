import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock env: forces mock mode for all store data
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
}));

// stub global uni storage used by discover store
const storageData: Record<string, string> = {};
const mockGetStorageSync = vi.fn((key: string) => storageData[key] ?? null);
const mockSetStorageSync = vi.fn((key: string, value: string) => {
  storageData[key] = value;
});
(globalThis as any).uni = {
  getStorageSync: mockGetStorageSync,
  setStorageSync: mockSetStorageSync,
};

import { useDiscoverStore } from "../../stores/discover";

describe("discover store", () => {
  beforeEach(() => {
    // clear storage for each test
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // fetchCards
  // ------------------------------------------------------------------
  it("fetchCards loads recommendation cards from mock data", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();

    expect(store.cards.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  // ------------------------------------------------------------------
  // swipeLeft
  // ------------------------------------------------------------------
  it("swipeLeft removes the card and records it as viewed", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();

    const firstCard = store.cards[0];
    const beforeCount = store.cards.length;
    const beforeViewed = store.viewedCards.length;

    await store.swipeLeft(firstCard.id);

    expect(store.cards.length).toBe(beforeCount - 1);
    expect(store.viewedCards.length).toBe(beforeViewed + 1);
    const record = store.viewedCards.find((v) => v.cardId === firstCard.id);
    expect(record).toBeDefined();
    expect(record!.direction).toBe("left");
    // card should be removed
    expect(store.cards.find((c) => c.id === firstCard.id)).toBeUndefined();
  });

  it("swipeLeft throws when cardId is empty", async () => {
    const store = useDiscoverStore();
    await expect(store.swipeLeft("")).rejects.toThrow("卡片 ID 无效");
  });

  it("swipeLeft throws when card does not exist", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();
    await expect(store.swipeLeft("nonexistent-card")).rejects.toThrow(
      "卡片不存在或已被处理"
    );
  });

  it("swipeLeft throws when daily limit is reached", async () => {
    const store = useDiscoverStore();

    // set cards directly (avoid fetchCards which calls resetDailyLimit)
    store.cards = [
      {
        id: "card-limit-test",
        userId: "user-limit",
        name: "限制测试",
        avatar: "",
        headline: "",
        bio: "",
        tags: [],
        commonGround: "",
        availability: "",
        images: [],
      },
    ];
    // force the viewed count to reach the limit
    store.viewedCards = Array.from({ length: store.dailyLimit }, (_, i) => ({
      cardId: `card-${i}`,
      userId: `user-${i}`,
      direction: "left" as const,
      viewedAt: new Date().toISOString(),
    }));

    await expect(store.swipeLeft("card-limit-test")).rejects.toThrow(
      "今日推荐次数已用完"
    );
  });

  // ------------------------------------------------------------------
  // swipeRight
  // ------------------------------------------------------------------
  it("swipeRight removes the card and records direction as right", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();

    const firstCard = store.cards[0];
    const beforeViewed = store.viewedCards.length;

    await store.swipeRight(firstCard.id);

    expect(store.viewedCards.length).toBe(beforeViewed + 1);
    const record = store.viewedCards.find((v) => v.cardId === firstCard.id);
    expect(record).toBeDefined();
    expect(record!.direction).toBe("right");
    expect(store.cards.find((c) => c.id === firstCard.id)).toBeUndefined();
  });

  // ------------------------------------------------------------------
  // rewindCard
  // ------------------------------------------------------------------
  it("rewindCard brings back the last viewed card", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();

    const firstCard = store.cards[0];
    await store.swipeLeft(firstCard.id);

    expect(store.cards.find((c) => c.id === firstCard.id)).toBeUndefined();

    await store.rewindCard(firstCard.id);
    expect(store.cards.find((c) => c.id === firstCard.id)).toBeDefined();
    expect(store.hasRewoundToday).toBe(true);
  });

  it("rewindCard throws when already used today", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();

    const firstCard = store.cards[0];
    await store.swipeLeft(firstCard.id);
    await store.rewindCard(firstCard.id); // uses up daily rewind

    // swipe again and try to rewind
    const secondCard = store.cards[0];
    await store.swipeLeft(secondCard.id);
    await expect(store.rewindCard(secondCard.id)).rejects.toThrow(
      "每日只能挽回一次"
    );
  });

  it("rewindCard throws when not the last viewed card", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();

    const firstCard = store.cards[0];
    await store.swipeLeft(firstCard.id);

    await expect(store.rewindCard("different-card")).rejects.toThrow(
      "只能挽回最后一张卡片"
    );
  });

  // ------------------------------------------------------------------
  // resetDailyLimit
  // ------------------------------------------------------------------
  it("resetDailyLimit clears viewedCards when a new day is detected", () => {
    const store = useDiscoverStore();

    // manually set some viewed cards
    store.viewedCards = [
      {
        cardId: "card-test",
        userId: "user-test",
        direction: "left",
        viewedAt: new Date().toISOString(),
      },
    ];
    store.hasRewoundToday = true;

    // since there is no storage, resetDailyLimit should reset everything
    store.resetDailyLimit();

    expect(store.viewedCards).toHaveLength(0);
    expect(store.hasRewoundToday).toBe(false);
    expect(store.historyCards).toHaveLength(0);
    expect(store.passedCards).toHaveLength(0);
  });

  // ------------------------------------------------------------------
  // isLimitReached getter
  // ------------------------------------------------------------------
  it("isLimitReached returns true when viewed equals daily limit", () => {
    const store = useDiscoverStore();

    store.viewedCards = Array.from({ length: store.dailyLimit }, (_, i) => ({
      cardId: `card-${i}`,
      userId: `user-${i}`,
      direction: "left" as const,
      viewedAt: new Date().toISOString(),
    }));

    expect(store.isLimitReached).toBe(true);
  });

  it("isLimitReached returns false when viewed count is below daily limit", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();

    expect(store.viewedCards.length).toBeLessThan(store.dailyLimit);
    expect(store.isLimitReached).toBe(false);
  });

  // ------------------------------------------------------------------
  // remainingCount / usedCount getters
  // ------------------------------------------------------------------
  it("remainingCount and usedCount reflect current usage", () => {
    const store = useDiscoverStore();

    store.viewedCards = Array.from({ length: 3 }, (_, i) => ({
      cardId: `card-${i}`,
      userId: `user-${i}`,
      direction: "left" as const,
      viewedAt: new Date().toISOString(),
    }));

    expect(store.usedCount).toBe(3);
    expect(store.remainingCount).toBe(store.dailyLimit - 3);
  });

  // ------------------------------------------------------------------
  // hasRewoundToday getter
  // ------------------------------------------------------------------
  it("hasRewoundToday reflects rewind usage state", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();

    expect(store.hasRewoundToday).toBe(false);

    const firstCard = store.cards[0];
    await store.swipeLeft(firstCard.id);
    await store.rewindCard(firstCard.id);

    expect(store.hasRewoundToday).toBe(true);
  });

  // ------------------------------------------------------------------
  // historyCards syncs after swipe
  // ------------------------------------------------------------------
  it("historyCards contains all viewed cards", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();

    const firstCard = store.cards[0];
    await store.swipeRight(firstCard.id);

    expect(store.historyCards.length).toBe(1);
    expect(store.historyCards[0].cardId).toBe(firstCard.id);
  });

  // ------------------------------------------------------------------
  // passedCards only contains left-swiped cards
  // ------------------------------------------------------------------
  it("passedCards only contains left-swiped (rejected) cards", async () => {
    const store = useDiscoverStore();
    await store.fetchCards();

    await store.swipeLeft(store.cards[0].id);

    expect(store.passedCards.length).toBe(1);
    expect(store.passedCards[0].direction).toBe("left");
  });
});