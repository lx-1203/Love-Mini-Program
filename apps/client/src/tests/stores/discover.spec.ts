import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
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
import { useLikesStore } from "../../stores/likes";
import { clientApi } from "../../services/api";
import type { RecommendationFilter, RecommendedPerson } from "../../services/generated/api-types-supplement";

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

  // ------------------------------------------------------------------
  // swipeRight 30% 匹配概率（用户指定）
  // ------------------------------------------------------------------
  describe("swipeRight 30% 匹配概率", () => {
    let randomSpy: ReturnType<typeof vi.spyOn>;
    let likesStore: ReturnType<typeof useLikesStore>;
    let addMatchedUserSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // 在当前 pinia 实例上创建 likes store 并 spy addMatchedUser
      // 避免真实联动修改 likes store 状态，影响断言
      likesStore = useLikesStore();
      addMatchedUserSpy = vi
        .spyOn(likesStore, "addMatchedUser")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      if (randomSpy) randomSpy.mockRestore();
      if (addMatchedUserSpy) addMatchedUserSpy.mockRestore();
    });

    it("当 Math.random() < 0.3 时匹配成功，联动 likes store", async () => {
      randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.2);

      const store = useDiscoverStore();
      await store.fetchCards();
      const firstCard = store.cards[0];

      await store.swipeRight(firstCard.id);

      expect(store.lastSwipeResult).not.toBeNull();
      expect(store.lastSwipeResult!.matched).toBe(true);
      expect(store.lastSwipeResult!.matchId).toBeDefined();
      expect(store.lastSwipeResult!.partnerName).toBe(firstCard.name);
      expect(store.lastSwipeResult!.cardId).toBe(firstCard.id);
      // 验证匹配成功时联动 likes store：将对方加入「喜欢我的」列表
      expect(addMatchedUserSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: firstCard.userId,
          name: firstCard.name,
          avatar: firstCard.avatar,
          headline: firstCard.headline,
        })
      );
    });

    it("当 Math.random() >= 0.3 时匹配失败，不联动 likes store", async () => {
      randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

      const store = useDiscoverStore();
      await store.fetchCards();
      const firstCard = store.cards[0];

      await store.swipeRight(firstCard.id);

      expect(store.lastSwipeResult).not.toBeNull();
      expect(store.lastSwipeResult!.matched).toBe(false);
      expect(store.lastSwipeResult!.matchId).toBeUndefined();
      expect(store.lastSwipeResult!.partnerName).toBeUndefined();
      // 验证匹配失败时未联动 likes store
      expect(addMatchedUserSpy).not.toHaveBeenCalled();
    });

    it("边界值：random=0.29 匹配成功（< 0.3）", async () => {
      randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.29);

      const store = useDiscoverStore();
      await store.fetchCards();

      await store.swipeRight(store.cards[0].id);

      expect(store.lastSwipeResult!.matched).toBe(true);
    });

    it("边界值：random=0.3 匹配失败（>= 0.3）", async () => {
      randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.3);

      const store = useDiscoverStore();
      await store.fetchCards();

      await store.swipeRight(store.cards[0].id);

      expect(store.lastSwipeResult!.matched).toBe(false);
    });

    it("右滑后卡片从未查看列表移除并记录方向为 right", async () => {
      randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.2);

      const store = useDiscoverStore();
      await store.fetchCards();
      const firstCard = store.cards[0];
      const beforeViewed = store.viewedCards.length;

      await store.swipeRight(firstCard.id);

      // 卡片从未查看列表移除
      expect(store.cards.find((c) => c.id === firstCard.id)).toBeUndefined();
      // 记录到 viewedCards，方向为 right
      expect(store.viewedCards.length).toBe(beforeViewed + 1);
      const record = store.viewedCards.find((v) => v.cardId === firstCard.id);
      expect(record).toBeDefined();
      expect(record!.direction).toBe("right");
    });
  });

  // ------------------------------------------------------------------
  // Phase C: recommendationFilter / isFilterDrawerOpen / resetFilter / drawer actions
  // ------------------------------------------------------------------
  describe("Phase C: recommendationFilter 与筛选抽屉状态", () => {
    // 使用 MockInstance<具体函数签名> 避免默认 ReturnType<typeof vi.spyOn>
    // 在严格模式下推断为 (this: unknown, ...args: unknown[]) => unknown 导致赋值失败
    type GetRecommendationsFn = (
      filter: RecommendationFilter
    ) => Promise<RecommendedPerson[]>;
    let getRecommendationsSpy:
      | MockInstance<GetRecommendationsFn>
      | undefined;

    beforeEach(() => {
      // spy clientApi.getRecommendations 以验证 fetchCards 透传的参数
      getRecommendationsSpy = vi
        .spyOn(clientApi, "getRecommendations")
        .mockResolvedValue([]);
    });

    afterEach(() => {
      if (getRecommendationsSpy) getRecommendationsSpy.mockRestore();
    });

    /** 安全访问最近一次 getRecommendations 调用的 filter 参数 */
    function getLastFilter(): RecommendationFilter {
      if (!getRecommendationsSpy) {
        throw new Error("spy 未初始化");
      }
      const calls = getRecommendationsSpy.mock.calls;
      const lastCall = calls[calls.length - 1];
      if (!lastCall) {
        throw new Error("getRecommendations 未被调用");
      }
      return lastCall[0] as RecommendationFilter;
    }

    it("初始状态：recommendationFilter 所有字段为 undefined，isFilterDrawerOpen 为 false", () => {
      const store = useDiscoverStore();

      expect(store.recommendationFilter).toEqual({
        heightMin: undefined,
        heightMax: undefined,
        educationLevel: undefined,
        relationshipStatus: undefined,
        hometownProvince: undefined,
        hometownCity: undefined,
        futureCity: undefined,
        keyword: undefined,
      });
      expect(store.isFilterDrawerOpen).toBe(false);
    });

    it("openFilterDrawer / closeFilterDrawer 切换 isFilterDrawerOpen 状态", () => {
      const store = useDiscoverStore();

      expect(store.isFilterDrawerOpen).toBe(false);

      store.openFilterDrawer();
      expect(store.isFilterDrawerOpen).toBe(true);

      store.closeFilterDrawer();
      expect(store.isFilterDrawerOpen).toBe(false);
    });

    it("resetFilter 清空所有筛选字段为 undefined", async () => {
      const store = useDiscoverStore();

      // 先填充筛选字段
      store.setRecommendationFilter({
        heightMin: 160,
        heightMax: 180,
        educationLevel: ["bachelor", "master"],
        relationshipStatus: ["never"],
        hometownProvince: "北京",
        hometownCity: "北京",
        futureCity: "北京",
        keyword: "咖啡",
      });
      // 验证筛选已写入（setRecommendationFilter 会触发 fetchCards，spy 已 stub）
      expect(store.recommendationFilter.heightMin).toBe(160);
      expect(store.recommendationFilter.educationLevel).toEqual([
        "bachelor",
        "master",
      ]);

      // 重置筛选
      await store.resetFilter();

      // 所有字段应为 undefined
      expect(store.recommendationFilter).toEqual({
        heightMin: undefined,
        heightMax: undefined,
        educationLevel: undefined,
        relationshipStatus: undefined,
        hometownProvince: undefined,
        hometownCity: undefined,
        futureCity: undefined,
        keyword: undefined,
      });
    });

    it("setRecommendationFilter 写入完整筛选对象并触发 fetchCards", async () => {
      const store = useDiscoverStore();

      const filter: RecommendationFilter = {
        heightMin: 165,
        heightMax: 185,
        educationLevel: ["master"],
        relationshipStatus: ["never"],
        hometownProvince: "江苏",
        hometownCity: "南京",
        futureCity: "北京",
        keyword: undefined,
      };

      store.setRecommendationFilter(filter);

      // 验证筛选对象已写入
      expect(store.recommendationFilter).toEqual(filter);

      // 验证 fetchCards 被调用，且参数包含筛选字段
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(getRecommendationsSpy).toHaveBeenCalled();
      const arg = getLastFilter();
      expect(arg.heightMin).toBe(165);
      expect(arg.heightMax).toBe(185);
      expect(arg.educationLevel).toEqual(["master"]);
      expect(arg.relationshipStatus).toEqual(["never"]);
      expect(arg.hometownProvince).toBe("江苏");
      expect(arg.hometownCity).toBe("南京");
      expect(arg.futureCity).toBe("北京");
    });

    it("fetchCards 透传 recommendationFilter + searchKeyword 到 getRecommendations", async () => {
      const store = useDiscoverStore();

      // 设置筛选条件
      store.recommendationFilter = {
        heightMin: 170,
        heightMax: undefined,
        educationLevel: ["bachelor"],
        relationshipStatus: undefined,
        hometownProvince: "上海",
        hometownCity: undefined,
        futureCity: undefined,
        keyword: undefined,
      };
      // 设置搜索关键字
      store.searchKeyword = "摄影";

      await store.fetchCards();

      // 验证 getRecommendations 被调用，参数包含筛选 + keyword
      expect(getRecommendationsSpy).toHaveBeenCalled();
      const arg = getLastFilter();
      expect(arg.heightMin).toBe(170);
      expect(arg.educationLevel).toEqual(["bachelor"]);
      expect(arg.hometownProvince).toBe("上海");
      // keyword 优先取 searchKeyword
      expect(arg.keyword).toBe("摄影");
    });

    it("fetchCards 在 searchKeyword 为空时回退使用 recommendationFilter.keyword", async () => {
      const store = useDiscoverStore();

      store.recommendationFilter = {
        heightMin: undefined,
        heightMax: undefined,
        educationLevel: undefined,
        relationshipStatus: undefined,
        hometownProvince: undefined,
        hometownCity: undefined,
        futureCity: undefined,
        keyword: "电影",
      };
      store.searchKeyword = "";

      await store.fetchCards();

      const arg = getLastFilter();
      expect(arg.keyword).toBe("电影");
    });

    it("resetFilter 触发 fetchCards 重新加载", async () => {
      const store = useDiscoverStore();

      getRecommendationsSpy!.mockClear();

      await store.resetFilter();

      expect(getRecommendationsSpy).toHaveBeenCalled();
      const arg = getLastFilter();
      // 重置后所有字段应为 undefined
      expect(arg.heightMin).toBeUndefined();
      expect(arg.educationLevel).toBeUndefined();
      expect(arg.hometownProvince).toBeUndefined();
    });

    it("setRecommendationFilter 浅拷贝避免外部引用污染", () => {
      const store = useDiscoverStore();

      const externalFilter: RecommendationFilter = {
        heightMin: 175,
        heightMax: undefined,
        educationLevel: ["bachelor"],
        relationshipStatus: undefined,
        hometownProvince: "北京",
        hometownCity: "北京",
        futureCity: "北京",
        keyword: undefined,
      };

      store.setRecommendationFilter(externalFilter);

      // 外部修改原对象，store 内部状态不应被影响
      externalFilter.heightMin = 200;
      externalFilter.educationLevel = ["phd"];

      expect(store.recommendationFilter.heightMin).toBe(175);
      expect(store.recommendationFilter.educationLevel).toEqual(["bachelor"]);
    });
  });
});