import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

/**
 * 搜索 store 分页契约（P1 修复 3，2026-10-31）。
 *
 * 修复前 loadMore 的实现：
 *   this.page += 1;
 *   const previousPage = this.page;   // ← 拿到的已是自增后的值（变量名与语义相反）
 *   await this.search(false);
 *   if (this.errorMessage) this.page = previousPage;  // 回滚等于没回滚
 * 于是第 3 页请求失败后 page 停在 3，下一次 loadMore 直接取第 4 页 append，
 * 第 3 页永远不会被拉回——用户列表中间静默少 20 条，且没有任何错误痕迹。
 *
 * 本文件用「失败的请求」驱动：断言重试请求的仍是同一页，而不是被跳过的那一页。
 */

vi.mock("../../config/env", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, isMockMode: () => false };
});

vi.mock("../../stores/village/api", () => ({
  searchPostsApi: vi.fn(),
  getHotSearchApi: vi.fn(async () => []),
}));

// mapToPostItem 的入参形态由后端契约决定，本用例只关心分页指针与追加条数
vi.mock("../../stores/village/utils", () => ({
  mapToPostItem: (post: { id?: string }) => ({ id: post?.id ?? "unknown" }),
}));

const store = new Map<string, unknown>();
(globalThis as any).uni = {
  getStorageSync: (key: string) => (store.has(key) ? store.get(key) : null),
  setStorageSync: (key: string, value: unknown) => store.set(key, value),
  removeStorageSync: (key: string) => store.delete(key),
  showToast: vi.fn(),
};

import { useSearchStore } from "../../stores/search";
import { searchPostsApi } from "../../stores/village/api";

/** 构造一页搜索结果（size=20 时 hasMore 判定为 true） */
function makePage(pageNo: number, size: number) {
  return {
    content: Array.from({ length: size }, (_, i) => ({
      post: { id: `p-${pageNo}-${i}` },
    })),
  } as any;
}

describe("search store - loadMore 分页指针回滚（P1 修复 3）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    store.clear();
    vi.mocked(searchPostsApi).mockResolvedValue(makePage(1, 20));
  });

  it("第 3 页失败后重试仍请求第 3 页（不得跳到第 4 页）", async () => {
    const search = useSearchStore();
    search.keyword = "同校";

    // 第 1 页
    await search.search(true);
    expect(searchPostsApi).toHaveBeenLastCalledWith("同校", 1, expect.any(AbortSignal));
    expect(search.page).toBe(1);

    // 第 2 页成功
    vi.mocked(searchPostsApi).mockResolvedValueOnce(makePage(2, 20));
    await search.loadMore();
    expect(searchPostsApi).toHaveBeenLastCalledWith("同校", 2, expect.any(AbortSignal));
    expect(search.page).toBe(2);

    // 第 3 页失败（网络中断）
    vi.mocked(searchPostsApi).mockRejectedValueOnce(new Error("network down"));
    await search.loadMore();
    expect(searchPostsApi).toHaveBeenLastCalledWith("同校", 3, expect.any(AbortSignal));
    expect(search.errorMessage).toBeTruthy();
    // 关键：页码回滚到「已取到的最后一页」，而不是停在失败的 3
    expect(search.page).toBe(2);

    // 重试：必须仍是第 3 页
    vi.mocked(searchPostsApi).mockResolvedValueOnce(makePage(3, 20));
    await search.loadMore();
    expect(searchPostsApi).toHaveBeenLastCalledWith("同校", 3, expect.any(AbortSignal));
    expect(search.page).toBe(3);
    // 三页都落库：不出现「中间少 20 条」
    expect(search.posts).toHaveLength(60);
    expect(search.errorMessage).toBeNull();
  });

  it("连续失败不会推进页码（每次重试都请求同一页）", async () => {
    const search = useSearchStore();
    search.keyword = "同校";
    await search.search(true);

    vi.mocked(searchPostsApi).mockRejectedValue(new Error("network down"));
    await search.loadMore();
    await search.loadMore();
    await search.loadMore();

    const requestedPages = vi.mocked(searchPostsApi).mock.calls.map((call) => call[1]);
    expect(requestedPages).toEqual([1, 2, 2, 2]);
  });

  it("失败后成功一页只 append 一次（回滚不会重复追加同一页）", async () => {
    const search = useSearchStore();
    search.keyword = "同校";
    await search.search(true);

    vi.mocked(searchPostsApi).mockRejectedValueOnce(new Error("boom"));
    await search.loadMore();
    expect(search.posts).toHaveLength(20);

    vi.mocked(searchPostsApi).mockResolvedValueOnce(makePage(2, 10));
    await search.loadMore();
    expect(search.posts).toHaveLength(30);
    expect(search.page).toBe(2);
  });

  it("请求被 abort（关键词切换/清空搜索）同样不推进页码", async () => {
    const search = useSearchStore();
    search.keyword = "同校";
    await search.search(true);

    // 挂起一个永不 resolve、仅在 abort 时 reject 的第 2 页请求
    vi.mocked(searchPostsApi).mockImplementation(
      (_kw: string, _page: number, signal?: AbortSignal) =>
        new Promise<any>((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );

    const pending = search.loadMore();
    // clear() 会 abort 进行中的请求并把状态复位
    search.clear();
    await pending;

    // 中止不能让页码停在 2（否则回来翻页会跳过第 2 页）
    expect(search.page).toBe(1);
  });
});
