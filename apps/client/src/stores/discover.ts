import { defineStore } from "pinia";
import { appEnv } from "../services/env";

/**
 * 推荐卡片用户信息
 */
export interface DiscoverCard {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  headline: string;
  bio: string;
  tags: string[];
  commonGround: string;
  availability: string;
  images: string[];
}

/**
 * 滑动操作类型
 */
export type SwipeDirection = "left" | "right";

/**
 * 已查看卡片记录
 */
export interface ViewedCardRecord {
  cardId: string;
  userId: string;
  direction: SwipeDirection;
  viewedAt: string;
}

/**
 * DiscoverStore 状态
 */
export interface DiscoverState {
  /** 推荐卡片列表 */
  cards: DiscoverCard[];
  /** 每日限量总数 */
  dailyLimit: number;
  /** 已查看卡片记录 */
  viewedCards: ViewedCardRecord[];
  /** 历史推荐卡片（今日已看过的所有卡片） */
  historyCards: ViewedCardRecord[];
  /** 已拒绝的卡片 */
  passedCards: ViewedCardRecord[];
  /** 上次刷新时间 */
  lastRefreshTime: string | null;
  /** 下次刷新时间 */
  nextRefreshTime: string | null;
  /** 今日是否已使用挽回 */
  hasRewoundToday: boolean;
  /** 是否还有更多卡片 */
  hasMore: boolean;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  errorMessage: string | null;
}

/* ========== Mock 数据 ========== */

const mockCards: DiscoverCard[] = [
  {
    id: "card-1",
    userId: "user-4001",
    name: "夏言",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Xiayan&backgroundColor=b6e3f4",
    headline: "北京大学 · 大三 · 心理学",
    bio: "喜欢听人讲故事，也擅长保守秘密。想认识有趣的人，一起喝咖啡、看电影、夜跑。周末通常比较空闲，欢迎约我出去逛逛。",
    tags: ["咖啡", "电影", "夜跑", "心理学", "猫奴"],
    commonGround: "你们都选了电影话题",
    availability: "今晚 19:00-21:00",
    images: [
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=1200&fit=crop",
    ],
  },
  {
    id: "card-2",
    userId: "user-4002",
    name: "顾北",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gubei&backgroundColor=c0aede",
    headline: "清华大学 · 研一 · 建筑学",
    bio: "画图狗一只，偶尔弹吉他。对城市里的老建筑特别感兴趣，想找个人一起探店、扫街。",
    tags: ["美食", "音乐", "探店", "建筑", "胶片"],
    commonGround: "你们都选了美食话题",
    availability: "周末下午",
    images: [
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=1200&fit=crop",
    ],
  },
  {
    id: "card-3",
    userId: "user-4003",
    name: "林溪",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Linxi&backgroundColor=ffdfbf",
    headline: "复旦大学 · 大二 · 日语系",
    bio: "最近在学日语，想找个语伴一起练习。平时也喜欢看展、拍照，记录生活中的小美好。",
    tags: ["语言", "看展", "摄影", "日系", "手账"],
    commonGround: "你们都选了摄影话题",
    availability: "周三、周五晚上",
    images: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1200&fit=crop",
    ],
  },
  {
    id: "card-4",
    userId: "user-4004",
    name: "周屿",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zhouyu&backgroundColor=d1d4f9",
    headline: "浙江大学 · 大四 · 计算机",
    bio: "即将毕业，想在校园里留下一些美好回忆。喜欢打篮球、玩游戏，也热爱旅行，计划毕业前去一趟西藏。",
    tags: ["游戏", "篮球", "旅行", "编程", "火锅"],
    commonGround: "你们都选了运动话题",
    availability: "每天傍晚",
    images: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1200&fit=crop",
    ],
  },
  {
    id: "card-5",
    userId: "user-4005",
    name: "沈念",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Shennian&backgroundColor=ffd5dc",
    headline: "中国人民大学 · 大一 · 新闻传播",
    bio: "刚来学校不久，想多认识一些朋友。喜欢阅读和写作，梦想是成为一名记者。平时会去咖啡馆写稿，欢迎来找我聊天。",
    tags: ["阅读", "写作", "咖啡", "新闻", "民谣"],
    commonGround: "你们都选了咖啡话题",
    availability: "下午没课的时候",
    images: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=1200&fit=crop",
    ],
  },
  {
    id: "card-6",
    userId: "user-4006",
    name: "苏晚",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Suwan&backgroundColor=ffdfbf",
    headline: "南京大学 · 大三 · 法学",
    bio: "理性与感性并存。喜欢辩论，也热爱古典音乐。希望找到一个能聊得来的人，一起去看交响乐演出。",
    tags: ["辩论", "古典音乐", "阅读", "法学", "博物馆"],
    commonGround: "你们都选了阅读话题",
    availability: "周二、周四晚上",
    images: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1200&fit=crop",
    ],
  },
  {
    id: "card-7",
    userId: "user-4007",
    name: "陆辰",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luchen&backgroundColor=c0aede",
    headline: "武汉大学 · 研二 · 医学",
    bio: "医学生，平时比较忙，但周末一定会给自己放风。喜欢爬山和露营，觉得大自然最能治愈人心。",
    tags: ["户外", "露营", "爬山", "医学", "纪录片"],
    commonGround: "你们都选了户外话题",
    availability: "周末全天",
    images: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=1200&fit=crop",
    ],
  },
];

const DAILY_LIMIT_TOTAL = 10;
const STORAGE_KEY = "discover_daily_record";

/** 最大重试次数 */
const MAX_RETRIES = 2;
/** 重试延迟（毫秒） */
const RETRY_DELAY_MS = 1000;

/**
 * 带重试机制的异步执行器
 * @param fn - 要执行的异步函数
 * @param maxRetries - 最大重试次数
 * @param delayMs - 重试之间的延迟毫秒数
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES, delayMs = RETRY_DELAY_MS): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`[DiscoverStore] 第${attempt + 1}次尝试失败，将进行第${attempt + 2}次重试:`, lastError.message);
      }
    }
  }

  throw lastError ?? new Error("操作失败");
}

function useMock() {
  return appEnv.apiMode === "mock";
}

/**
 * 获取今日日期字符串（YYYY-MM-DD）
 */
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * 计算明天中午12点的时间字符串
 */
function getNextNoonString(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
  return next.toISOString();
}

/**
 * 从本地存储加载今日记录
 */
interface DailyRecord {
  date: string;
  viewedCards: ViewedCardRecord[];
  hasRewoundToday: boolean;
  lastRefreshTime: string | null;
}

function loadDailyRecord(): Omit<DailyRecord, "date"> | null {
  try {
    const record = uni.getStorageSync(STORAGE_KEY);
    if (record) {
      const data = JSON.parse(record) as DailyRecord;
      const today = getTodayString();
      if (data.date === today) {
        return {
          viewedCards: data.viewedCards || [],
          hasRewoundToday: data.hasRewoundToday || false,
          lastRefreshTime: data.lastRefreshTime || null,
        };
      }
    }
  } catch {
    // 本地存储读取失败时忽略
  }
  return null;
}

/**
 * 保存今日记录到本地存储
 */
function saveDailyRecord(
  viewedCards: ViewedCardRecord[],
  hasRewoundToday: boolean,
  lastRefreshTime: string | null
) {
  try {
    const data = {
      date: getTodayString(),
      viewedCards,
      hasRewoundToday,
      lastRefreshTime,
    };
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 本地存储写入失败时忽略
  }
}

/**
 * 寻觅页 Store
 *
 * 管理推荐卡片、滑动操作、每日限量、时间门控和回看功能。
 */
export const useDiscoverStore = defineStore("discover", {
  state: (): DiscoverState => {
    const record = loadDailyRecord();
    return {
      cards: [],
      dailyLimit: DAILY_LIMIT_TOTAL,
      viewedCards: record?.viewedCards ?? [],
      historyCards: [],
      passedCards: [],
      lastRefreshTime: record?.lastRefreshTime ?? null,
      nextRefreshTime: getNextNoonString(),
      hasRewoundToday: record?.hasRewoundToday ?? false,
      hasMore: true,
      loading: false,
      errorMessage: null,
    };
  },

  getters: {
    /** 当前展示的卡片（未查看的第一张） */
    currentCard: (state): DiscoverCard | null => {
      return state.cards[0] ?? null;
    },
    /** 今日已使用数量 */
    usedCount: (state): number => {
      return state.viewedCards.length;
    },
    /** 今日剩余数量 */
    remainingCount: (state): number => {
      return Math.max(0, state.dailyLimit - state.viewedCards.length);
    },
    /** 是否达到每日上限 */
    isLimitReached: (state): boolean => {
      return state.viewedCards.length >= state.dailyLimit;
    },
    /** 已喜欢的用户 ID 集合 */
    likedUserIds: (state): Set<string> => {
      return new Set(
        state.viewedCards
          .filter((v) => v.direction === "right")
          .map((v) => v.userId)
      );
    },
    /** 距离下次刷新的剩余秒数 */
    countdownSeconds: (state): number => {
      if (!state.nextRefreshTime) return 0;
      const diff = Date.parse(state.nextRefreshTime) - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    },
    /** 格式化倒计时文本（HH:mm:ss） */
    countdownText: (state): string => {
      if (!state.nextRefreshTime) return "";
      const diff = Date.parse(state.nextRefreshTime) - Date.now();
      const totalSeconds = Math.max(0, Math.floor(diff / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    },
  },

  actions: {
    /**
     * 获取推荐卡片列表（带重试机制，最多2次）
     */
    async fetchCards() {
      this.loading = true;
      this.errorMessage = null;

      try {
        // 每次加载时检查是否需要跨天重置
        this.resetDailyLimit();

        await withRetry(async () => {
          if (useMock()) {
            // 过滤掉已查看的卡片
            const viewedIds = new Set(this.viewedCards.map((v) => v.cardId));
            const availableCards = mockCards.filter((card) => !viewedIds.has(card.id));

            this.cards = availableCards;
            this.hasMore = availableCards.length > 0 && !this.isLimitReached;

            // 同步更新历史记录和已拒绝记录
            this.syncHistoryCards();
            return;
          }

          // TODO: real API integration
          throw new Error("Real API not implemented");
        });
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载推荐失败，请稍后重试";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 同步历史记录与已拒绝记录
     */
    syncHistoryCards() {
      this.historyCards = [...this.viewedCards];
      this.passedCards = this.viewedCards.filter((v) => v.direction === "left");
    },

    /**
     * 左滑（不感兴趣）
     * @param cardId - 卡片 ID
     */
    async swipeLeft(cardId: string) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!cardId || cardId.trim().length === 0) {
          this.errorMessage = "卡片 ID 无效";
          throw new Error("卡片 ID 无效");
        }

        // 卡片存在检查
        const card = this.cards.find((c) => c.id === cardId);
        if (!card) {
          this.errorMessage = "卡片不存在或已被处理";
          throw new Error("卡片不存在或已被处理");
        }

        if (this.isLimitReached) {
          this.errorMessage = "今日推荐次数已用完";
          throw new Error("今日推荐次数已用完");
        }

        if (useMock()) {
          const record: ViewedCardRecord = {
            cardId,
            userId: card.userId,
            direction: "left",
            viewedAt: new Date().toISOString(),
          };

          this.viewedCards.push(record);
          this.cards = this.cards.filter((c) => c.id !== cardId);
          this.hasMore = this.cards.length > 0 && !this.isLimitReached;

          this.syncHistoryCards();
          this.saveToStorage();
          return;
        }

        // TODO: real API integration
        throw new Error("Real API not implemented");
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "操作失败";
        throw error;
      }
    },

    /**
     * 右滑（喜欢）
     * @param cardId - 卡片 ID
     */
    async swipeRight(cardId: string) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!cardId || cardId.trim().length === 0) {
          this.errorMessage = "卡片 ID 无效";
          throw new Error("卡片 ID 无效");
        }

        // 卡片存在检查
        const card = this.cards.find((c) => c.id === cardId);
        if (!card) {
          this.errorMessage = "卡片不存在或已被处理";
          throw new Error("卡片不存在或已被处理");
        }

        if (this.isLimitReached) {
          this.errorMessage = "今日推荐次数已用完";
          throw new Error("今日推荐次数已用完");
        }

        if (useMock()) {
          const record: ViewedCardRecord = {
            cardId,
            userId: card.userId,
            direction: "right",
            viewedAt: new Date().toISOString(),
          };

          this.viewedCards.push(record);
          this.cards = this.cards.filter((c) => c.id !== cardId);
          this.hasMore = this.cards.length > 0 && !this.isLimitReached;

          this.syncHistoryCards();
          this.saveToStorage();
          return;
        }

        // TODO: real API integration
        throw new Error("Real API not implemented");
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "操作失败";
        throw error;
      }
    },

    /**
     * 反悔上一张卡片（rewind）
     * @param cardId - 要反悔的卡片 ID
     */
    async rewindCard(cardId: string) {
      this.errorMessage = null;

      try {
        if (useMock()) {
          if (this.hasRewoundToday) {
            throw new Error("每日只能挽回一次");
          }

          const lastViewed = this.viewedCards[this.viewedCards.length - 1];
          if (!lastViewed || lastViewed.cardId !== cardId) {
            throw new Error("只能挽回最后一张卡片");
          }

          const card = mockCards.find((c) => c.id === cardId);
          if (!card) {
            throw new Error("卡片不存在");
          }

          this.viewedCards.pop();
          this.cards.unshift(card);
          this.hasMore = true;
          this.hasRewoundToday = true;

          this.syncHistoryCards();
          this.saveToStorage();
          return;
        }

        // TODO: real API integration
        throw new Error("Real API not implemented");
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "挽回失败";
        throw error;
      }
    },

    /**
     * 重置每日限量（检查是否跨天）
     */
    resetDailyLimit() {
      const record = loadDailyRecord();
      const today = getTodayString();

      if (!record) {
        // 跨天了，重置状态
        this.viewedCards = [];
        this.historyCards = [];
        this.passedCards = [];
        this.hasRewoundToday = false;
        this.lastRefreshTime = new Date().toISOString();
        this.nextRefreshTime = getNextNoonString();
        this.hasMore = true;
        this.saveToStorage();
      }
    },

    /**
     * 保存当前状态到本地存储
     */
    saveToStorage() {
      saveDailyRecord(this.viewedCards, this.hasRewoundToday, this.lastRefreshTime);
    },

    /**
     * 强制重置每日限量（用于测试）
     */
    forceResetDailyLimit() {
      this.dailyLimit = DAILY_LIMIT_TOTAL;
      this.viewedCards = [];
      this.historyCards = [];
      this.passedCards = [];
      this.hasRewoundToday = false;
      this.lastRefreshTime = new Date().toISOString();
      this.nextRefreshTime = getNextNoonString();
      this.hasMore = true;
      this.saveToStorage();
    },
  },
});
