import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 村口频道独立列表（2026-10-31 频道轨 P2）。
 *
 * 缺陷：所有频道共用一份 `villageStore.posts` + 一个全局 `page` 游标，页面再按
 * `cat-${channel.postCategory}` 对这份共享列表做本地二次过滤；同时
 * `loadChannelData` 只看 30s 新鲜度（`village:feed:{id}`）就短路返回。
 * 于是「今日广场刚拉过 ⇒ 30s 内切学校圈/热度榜不发请求 ⇒ 拿今日广场的帖子按
 * 学校圈分类过滤 ⇒ 暂无内容」，且「加载更多」推的是别人频道的页码 ⇒ 跳页漏帖。
 *
 * 这里跑 real 档（useMock=false，TTL 分支才生效），api 层被打桩，
 * 断言的是「每个频道自己的列表 + 自己的游标 + 未被本频道拉过时不得短路」。
 */
vi.mock("../../stores/helpers/use-mock", () => ({ useMock: () => false }));
vi.mock("../../services/env", () => ({
  appEnv: { apiMode: "real", apiBaseUrl: "http://127.0.0.1:8080/api" },
  isMockMode: () => false,
}));
vi.mock("../../stores/village/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../stores/village/api")>();
  return {
    ...actual,
    fetchPostsApi: vi.fn(),
    getHotBoardApi: vi.fn(),
  };
});
// 媒体签名预热会真发 POST /media/sign，单测里打桩掉
vi.mock("../../utils/media", () => ({
  warmMediaUrls: vi.fn(() => Promise.resolve({})),
  resolveMediaUrl: (p: string) => p,
}));

(globalThis as any).uni = { getStorageSync: () => "", setStorageSync: () => {} };

import { useVillageStore } from "../../stores/village";
import { fetchPostsApi, getHotBoardApi } from "../../stores/village/api";

const mockedFetchPostsApi = vi.mocked(fetchPostsApi);
const mockedHotBoardApi = vi.mocked(getHotBoardApi);

/** 构造后端 PostSummaryView 形状的一页数据 */
function summaryPage(category: string, page: number, size = 20) {
  return {
    items: Array.from({ length: size }, (_unused, i) => ({
      id: `${category}-p${page}-${i}`,
      author: { id: 1, nickname: `${category}作者`, avatarUrl: "", isFollowed: false },
      category,
      title: `${category} 标题 p${page}-${i}`,
      summary: `${category} 摘要`,
      images: [],
      tags: [],
      likeCount: 1,
      commentCount: 0,
      shareCount: 0,
      createdAt: new Date(Date.now() - i * 60_000).toISOString(),
      recentComments: [],
    })),
    total: size * 5,
    page,
    pageSize: size,
  };
}

const FEED_TODAY = "village:feed:today";
const FEED_SCHOOL = "village:feed:school";
const FEED_HOT = "village:feed:hot";

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe("村口频道独立列表与独立游标", () => {
  it("未拉过的频道即便别人已有新鲜数据，仍不得被判为已加载", async () => {
    const store = useVillageStore();
    mockedFetchPostsApi.mockResolvedValue(summaryPage("all", 1) as never);

    store.selectFeed(FEED_TODAY);
    await store.fetchPosts({ categoryId: "cat-all", sortBy: "latest" });
    store.markFeedLoaded(FEED_TODAY);

    expect(store.isFeedLoaded(FEED_TODAY)).toBe(true);
    // 关键前置条件：今日广场成功拉过、30s TTL 正热，也不能让学校圈"看起来已加载"
    expect(store.isFeedLoaded(FEED_SCHOOL)).toBe(false);
    expect(store.isFeedLoaded(FEED_HOT)).toBe(false);
  });

  it("A→B→A（30s TTL 正热）：B 用的是 B 自己的请求，切回 A 拿回 A 自己的列表", async () => {
    const store = useVillageStore();
    mockedFetchPostsApi
      .mockResolvedValueOnce(summaryPage("all", 1) as never)
      .mockResolvedValueOnce(summaryPage("campus", 1) as never);

    store.selectFeed(FEED_TODAY);
    await store.fetchPosts({ categoryId: "cat-all", sortBy: "latest" });
    store.markFeedLoaded(FEED_TODAY);
    const todayIds = store.posts.map((p) => p.id);
    expect(todayIds[0]).toContain("all-p1");

    // 切到学校圈：槽位必须被换掉，且学校圈从未加载过 ⇒ 必须发自己的请求
    store.selectFeed(FEED_SCHOOL);
    expect(store.isFeedLoaded(FEED_SCHOOL)).toBe(false);
    expect(store.posts.length).toBe(0);
    await store.fetchPosts({ categoryId: "cat-campus", sortBy: "latest" });
    store.markFeedLoaded(FEED_SCHOOL);
    expect(store.posts.every((p) => p.categoryId === "campus")).toBe(true);
    expect(store.posts.some((p) => todayIds.includes(p.id))).toBe(false);

    // 切回今日广场：拿回的是今日广场自己的那批（不是学校圈列表的本地过滤切片）。
    // 全程只有「A 一次 + B 一次」= 2 个请求；若列表仍是共享的，这里必须再拉一次才对。
    store.selectFeed(FEED_TODAY);
    expect(store.posts.map((p) => p.id)).toEqual(todayIds);
    expect(store.posts.every((p) => p.categoryId === "all")).toBe(true);
    expect(store.isFeedLoaded(FEED_TODAY)).toBe(true);
    expect(mockedFetchPostsApi).toHaveBeenCalledTimes(2);
  });

  it("每个频道的「加载更多」只推进自己的页码，互不抢游标", async () => {
    const store = useVillageStore();
    mockedFetchPostsApi.mockImplementation(async (filters, page) =>
      summaryPage(String(filters?.categoryId ?? "all").replace("cat-", ""), Number(page ?? 1)) as never
    );

    store.selectFeed(FEED_TODAY);
    await store.fetchPosts({ categoryId: "cat-all" });
    store.markFeedLoaded(FEED_TODAY);
    expect(store.page).toBe(1);
    expect(store.hasMore).toBe(true);

    // 今日广场翻到第 2、3 页
    await store.loadMore({ categoryId: "cat-all" });
    expect(store.page).toBe(2);
    expect(store.posts.length).toBe(40);

    // 切学校圈：游标从 1 开始，不带过来今日广场的 2
    store.selectFeed(FEED_SCHOOL);
    expect(store.page).toBe(1);
    expect(store.feedPage(FEED_SCHOOL)).toBe(1);
    await store.fetchPosts({ categoryId: "cat-campus" });
    store.markFeedLoaded(FEED_SCHOOL);
    await store.loadMore({ categoryId: "cat-campus" });
    expect(store.page).toBe(2); // 学校圈自己到第 2 页
    expect(store.posts.length).toBe(40); // 不是 60：没把今日广场第 2 页混进来

    // 切回今日广场：它仍停在第 3 页可达的状态（第 2 页已加载）
    store.selectFeed(FEED_TODAY);
    expect(store.feedPage(FEED_TODAY)).toBe(2);
    expect(store.page).toBe(2);
    expect(store.posts[0]!.categoryId).toBe("all");
    await store.loadMore({ categoryId: "cat-all" });
    expect(store.page).toBe(3);
    expect(store.feedPage(FEED_SCHOOL)).toBe(2); // 学校圈游标没被今日广场带动
  });

  it("热度榜同样有独立桶：切过去不得复用帖子流的列表与游标", async () => {
    const store = useVillageStore();
    mockedFetchPostsApi.mockResolvedValue(summaryPage("all", 1) as never);
    mockedHotBoardApi.mockResolvedValue(summaryPage("hot", 1) as never);

    store.selectFeed(FEED_TODAY);
    await store.fetchPosts({ categoryId: "cat-all" });
    store.markFeedLoaded(FEED_TODAY);
    const todayFirstId = store.posts[0]!.id;

    store.selectFeed(FEED_HOT);
    expect(store.posts.length).toBe(0);
    expect(store.isFeedLoaded(FEED_HOT)).toBe(false);
    await store.fetchHotBoard(1);
    store.markFeedLoaded(FEED_HOT);
    expect(store.posts[0]!.id).not.toBe(todayFirstId);
    expect(store.posts.every((p) => p.categoryId === "hot")).toBe(true);

    // 回到今日广场，热度榜的列表不得留在槽里
    store.selectFeed(FEED_TODAY);
    expect(store.posts[0]!.id).toBe(todayFirstId);
  });

  it("dispose 归档当前频道并交还活跃键，其它页面的 fetchPosts 不再冒充频道数据", async () => {
    const store = useVillageStore();
    mockedFetchPostsApi
      .mockResolvedValueOnce(summaryPage("all", 1) as never)
      .mockResolvedValueOnce(summaryPage("other", 1) as never);

    store.selectFeed(FEED_TODAY);
    await store.fetchPosts({ categoryId: "cat-all" });
    store.markFeedLoaded(FEED_TODAY);
    const archivedIds = store.posts.map((p) => p.id);

    store.dispose();
    expect(store.activeFeedKey).toBeNull();

    // 离开村口页后，别的页面（详情/收藏）直接调 fetchPosts
    await store.fetchPosts({});
    expect(store.posts[0]!.categoryId).toBe("other");

    // 回到村口页重新选频道：拿回归档的今日广场列表与游标，而不是上面那次请求的结果
    store.selectFeed(FEED_TODAY);
    expect(store.posts.map((p) => p.id)).toEqual(archivedIds);
    expect(store.isFeedLoaded(FEED_TODAY)).toBe(true);
  });
});

describe("村口页已接线到频道桶（模板/脚本契约）", () => {
  // 与 tests/pages/village-index-page.spec.ts 同一口径：页面源码级契约断言，
  // 保证「桶协议」不是只活在 store 里、页面确确实实调了这三步。
  const source = readFileSync(
    resolve(__dirname, "../../subpackages/village/village/index.vue"),
    "utf-8"
  );

  it("TTL 短路必须同时要求本频道已加载（不再只看新鲜度）", () => {
    expect(source).toContain("villageStore.isFeedLoaded(feedKey)");
    expect(source).toMatch(/isCacheFresh\(\s*feedKey\s*,\s*30_000\s*\)/);
    // 反例守卫：不得回到「只看 isCacheFresh 就 return」的形态
    expect(source).not.toMatch(/if \(!force && !useMock\(\) && isCacheFresh\(/);
  });

  it("切换频道与拉数据前都先换桶，且成功后标记该频道已加载", () => {
    expect(source).toContain("villageStore.selectFeed(feedKeyOf(id));");
    expect(source).toContain("villageStore.selectFeed(feedKey);");
    expect(source).toContain("villageStore.markFeedLoaded(feedKey);");
  });

  it("帖子流不再对共享列表做本地分类二次过滤", () => {
    expect(source).not.toContain("villageStore.filteredPosts(currentFilters.value)");
  });
});
