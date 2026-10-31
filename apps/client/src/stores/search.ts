/**
 * 搜索 Store（2026-08-11）
 *
 * 帖子搜索 + 热搜词 + 搜索历史（本地 storage）。
 * 发现页搜索框与圈子页搜索栏共用：keyword 防抖 300ms 调 /search/posts，
 * 结果以 PostItem 卡片流展示（复用 PostCard）。
 */
import { defineStore } from "pinia";
import {
  getHotSearchApi,
  searchPostsApi,
  type HotSearchItem,
  type PostSearchResult,
} from "./village/api";
import { mapToPostItem } from "./village/utils";
import { useMock } from "./helpers/use-mock";
import type { PostItem } from "./village/types";
import { STORAGE_KEYS } from "../constants/storage-keys";

/** 搜索防抖间隔（与发现页 SEARCH_DEBOUNCE_MS 同口径） */
const SEARCH_DEBOUNCE_MS = 300;
/** 本地搜索历史上限 */
const HISTORY_LIMIT = 10;
/** 错误回退文案（i18n 由页面层 toast 覆盖，store 仅记录占位） */
const LOAD_FAILED = "搜索失败，请稍后重试";

interface SearchState {
  keyword: string;
  posts: PostItem[];
  loading: boolean;
  errorMessage: string | null;
  page: number;
  hasMore: boolean;
  hotSearches: HotSearchItem[];
  history: string[];
  loaded: boolean;
  searchTimer: ReturnType<typeof setTimeout> | null;
  searchController: AbortController | null;
}

export const useSearchStore = defineStore("search", {
  state: (): SearchState => ({
    keyword: "",
    posts: [],
    loading: false,
    errorMessage: null,
    page: 1,
    hasMore: true,
    hotSearches: [],
    history: [],
    loaded: false,
    searchTimer: null,
    searchController: null,
  }),

  getters: {
    /** 是否有激活的搜索词 */
    isSearching: (state) => state.keyword.trim().length > 0,
  },

  actions: {
    /** 初始化：加载热搜词 + 本地搜索历史（首次进入搜索页时调用） */
    async init() {
      if (this.loaded) return;
      this.loaded = true;
      this.history = this.readHistory();
      try {
        if (useMock()) {
          this.hotSearches = [];
          return;
        }
        this.hotSearches = await getHotSearchApi(10);
      } catch (_e) {
        this.hotSearches = [];
      }
    },

    /**
     * 设置关键词并触发搜索（防抖 300ms）。
     * 空关键词时清空结果（回到热搜/历史视图）。
     */
    setKeyword(keyword: string) {
      this.keyword = keyword;
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }
      if (!keyword.trim()) {
        this.posts = [];
        this.errorMessage = null;
        this.page = 1;
        this.hasMore = true;
        return;
      }
      this.searchTimer = setTimeout(() => {
        this.searchTimer = null;
        void this.search(true);
      }, SEARCH_DEBOUNCE_MS);
    },

    /**
     * 立即执行搜索（点击热搜词/历史词/回车时调用）。
     *
     * @param reset true=重新从第 1 页搜索；false=在当前 page 上追加（loadMore 用）
     * @returns 本次是否真正完成了一页数据的拉取与应用
     *          （失败 / 被 abort / mock 短路 → false，供 loadMore 回滚页码）
     */
    async search(reset = true): Promise<boolean> {
      const kw = this.keyword.trim();
      if (!kw) return false;
      if (this.searchController) {
        try {
          this.searchController.abort();
        } catch (_e) {
          // ignore
        }
      }
      const controller = new AbortController();
      this.searchController = controller;
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.posts = [];
          this.hasMore = false;
          return false;
        }
        const currentPage = reset ? 1 : this.page;
        const data = await searchPostsApi(kw, currentPage, controller.signal);
        if (controller.signal.aborted) return false;
        const newPosts = data.content.map((r: PostSearchResult) => mapToPostItem(r.post));
        this.posts = reset ? newPosts : [...this.posts, ...newPosts];
        this.page = currentPage;
        this.hasMore = newPosts.length >= 20;
        // 搜索成功：记录到本地历史 + 刷新热搜词
        this.pushHistory(kw);
        void this.refreshHotSearches();
        return true;
      } catch (error) {
        if (controller.signal.aborted) return false;
        this.errorMessage = error instanceof Error ? error.message : LOAD_FAILED;
        return false;
      } finally {
        if (this.searchController === controller) {
          this.loading = false;
          this.searchController = null;
        }
      }
    },

    /**
     * 加载更多搜索结果。
     *
     * 修复（P1 BUG，2026-10-31）：分页指针永久跳页。
     * 原实现先 `this.page += 1`、再把**已自增后的**值赋给 `previousPage` 当作回滚目标
     * （变量名与实际语义相反），于是第 3 页请求失败后 page 仍是 3；
     * 下一次 loadMore 直接 +1 取第 4 页并 append —— 第 3 页永远不会被拉回，
     * 用户看到的是「中间少了 20 条」且没有任何提示。
     * 现先记下真正的上一页再自增，未成功（失败 / 被 abort）时回滚到上一页，
     * 重试请求的仍是同一页。
     */
    async loadMore() {
      if (!this.hasMore || this.loading) return;
      const previousPage = this.page;
      this.page += 1;
      const fetched = await this.search(false);
      if (!fetched) {
        // 回滚到自增前的页码：下一次 loadMore 重新请求失败的那一页
        this.page = previousPage;
      }
    },

    /** 点击热搜词/历史词：设置关键词并立即搜索 */
    async searchByTerm(term: string) {
      this.keyword = term;
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }
      await this.search(true);
    },

    /** 清空搜索（回到热搜/历史视图） */
    clear() {
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }
      if (this.searchController) {
        try {
          this.searchController.abort();
        } catch (_e) {
          // ignore
        }
      }
      this.keyword = "";
      this.posts = [];
      this.errorMessage = null;
      this.page = 1;
      this.hasMore = true;
    },

    /** 刷新热搜词 */
    async refreshHotSearches() {
      try {
        if (useMock()) return;
        this.hotSearches = await getHotSearchApi(10);
      } catch (_e) {
        // 热搜词刷新失败忽略
      }
    },

    /** 清除本地搜索历史 */
    clearHistory() {
      this.history = [];
      try {
        uni.removeStorageSync(STORAGE_KEYS.SEARCH_HISTORY);
      } catch (_e) {
        // ignore
      }
    },

    // ---- 内部工具 ----

    readHistory(): string[] {
      try {
        const raw = uni.getStorageSync(STORAGE_KEYS.SEARCH_HISTORY);
        if (Array.isArray(raw)) {
          return raw.filter((x): x is string => typeof x === "string").slice(0, HISTORY_LIMIT);
        }
      } catch (_e) {
        // ignore
      }
      return [];
    },

    pushHistory(term: string) {
      const trimmed = term.trim();
      if (!trimmed) return;
      const next = [trimmed, ...this.history.filter((h) => h !== trimmed)].slice(0, HISTORY_LIMIT);
      this.history = next;
      try {
        uni.setStorageSync(STORAGE_KEYS.SEARCH_HISTORY, next);
      } catch (_e) {
        // ignore
      }
    },
  },
});
