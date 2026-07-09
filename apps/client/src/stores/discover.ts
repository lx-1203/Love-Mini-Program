import { defineStore } from "pinia";
import { watch } from "vue";
import { appEnv } from "../services/env";
import { request } from "../services/http";
import { clientApi } from "../services/api";
import { useSessionStore } from "./session";
import { useLikesStore } from "./likes";
import type { components } from "../services/generated/api-types";
import type {
  OnlineStatusView,
  RecommendationFilter,
  RecommendedPerson,
} from "../services/generated/api-types-supplement";

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
  /** 所属学校名称，用于同校匹配加权 */
  campusName?: string;
  /** 在线状态：online-在线 / away-离开 / offline-离线 */
  onlineStatus?: "online" | "away" | "offline";
  /** 是否同校 */
  isSameSchool?: boolean;
  /** 是否同专业 */
  isSameMajor?: boolean;
  /** 共同兴趣圈数量 */
  commonCircleCount?: number;
  /**
   * 半身照 URL（Phase D 新增）。
   * CardSwiper 大图优先级：halfBodyPhotoUrl → photoGallery[0] → avatarUrl。
   */
  halfBodyPhotoUrl?: string;
  /** 照片墙 URL 数组（最多 6 张，Phase D 新增） */
  photoGallery?: string[];
  /** 个人视频 URL（Phase D 新增，存在时显示视频角标） */
  personalVideoUrl?: string;
  /** 主页背景图 URL（Phase D 新增） */
  profileBackgroundUrl?: string;
  /** 身高 cm（Phase D 新增，用于卡片信息展示） */
  height?: number;
  /** 学历：high_school/bachelor/master/phd（Phase D 新增） */
  educationLevel?: string;
  /**
   * 认证徽章级别：none/email/idcard/school（Phase D 新增）。
   * 由 VerificationBadge 组件消费，渲染对应色彩与图标。
   */
  verificationBadgeLevel?: string;
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
  /**
   * 卡片快照（用于 rewind 反悔操作恢复卡片到列表头部）。
   *
   * Phase C 重构新增：原实现依赖本地 mockCards 数组按 ID 查找卡片，
   * 但 fetchCards 改为通过 clientApi.getRecommendations 获取数据后，
   * 卡片 ID 来自后端 RecommendedPerson.id（数字字符串），mockCards 已不再使用。
   * 因此在 swipeLeft/swipeRight 时保存卡片快照，rewind 时直接从快照恢复。
   *
   * 字段为可选：测试代码或外部直接设置 viewedCards 时可省略，
   * rewindCard 在缺失快照时会抛出明确错误。
   */
  card?: DiscoverCard;
}

/**
 * DiscoverStore 状态
 */
export interface DiscoverState {
  /** 推荐卡片列表 */
  cards: DiscoverCard[];
  /** 每日限量总数 */
  dailyLimit: number;
  /** 签到额外配额 */
  extraQuota: number;
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
  /** 在线状态映射表：userId -> 在线状态 */
  onlineStatusMap: Record<string, "online" | "away" | "offline">;
  /** 最近一次滑动结果（用于判断是否匹配成功） */
  lastSwipeResult: {
    matched: boolean;
    matchId?: string;
    partnerName?: string;
    cardId?: string;
  } | null;
  /** 当前筛选 ID（nearby/all/age18-25/match-priority，用于 UI chip 高亮） */
  activeFilter: string;
  /**
   * 推荐筛选条件对象（Phase C 新增）。
   *
   * 与 activeFilter（chip ID）解耦：
   * - activeFilter 仅用于 UI chip 高亮状态，不影响 API 调用参数
   * - recommendationFilter 是传递给 getRecommendations 的实际筛选对象，
   *   由筛选抽屉（H-07 + M-16）应用，包含身高/学历/感情状态/籍贯/未来城市等字段
   *
   * 设计权衡：保留 activeFilter: string 以兼容现有 discover/index.vue 的
   * onFilterChipTap(filterId: string) 调用路径，避免本任务范围内引入页面层改动。
   */
  recommendationFilter: RecommendationFilter;
  /**
   * 筛选抽屉显隐状态（Phase C 新增）。
   *
   * 由 openFilterDrawer / closeFilterDrawer action 控制，
   * 用于驱动筛选抽屉组件（H-07）的 v-if / transition。
   */
  isFilterDrawerOpen: boolean;
  /** 搜索关键字（用户/标签/学校） */
  searchKeyword: string;
}

/* ========== 后端视图类型 ========== */

/**
 * 后端 RecommendedPersonView 类型
 * 对应后端 record RecommendedPersonView(Long id, String name, String initials, String headline, String commonGround, String availability, String campusName, String avatarUrl, List<String> tags, String bio, List<String> images, boolean isSameSchool, boolean isSameMajor, int commonCircleCount)
 */
export interface RecommendedPersonView {
  id: number;
  name: string;
  initials: string;
  headline: string;
  commonGround: string;
  availability: string;
  campusName: string;
  avatarUrl: string;
  tags: string[];
  /** 个人简介 */
  bio: string;
  /** 用户图片列表 */
  images: string[];
  /** 是否同校 */
  isSameSchool: boolean;
  /** 是否同专业 */
  isSameMajor: boolean;
  /** 共同兴趣圈数量 */
  commonCircleCount: number;
}

/**
 * 将后端 RecommendedPerson 映射为前端 DiscoverCard
 *
 * Phase C 重构：参数类型从 RecommendedPersonView 改为 RecommendedPerson。
 * RecommendedPerson 是 RecommendedPersonView 的超集（额外包含 height、
 * educationLevel、photoGallery、halfBodyPhotoUrl、personalVideoUrl、
 * profileBackgroundUrl、verificationBadgeLevel 等扩展字段），
 * 视图层映射逻辑保持不变，扩展字段由消费方按需读取。
 *
 * @param raw - 后端返回的推荐人物（含扩展字段）
 * @param onlineStatus - 在线状态（可选，由 fetchOnlineStatus 单独查询后回填）
 * @returns 前端 DiscoverCard 对象
 */
function mapToDiscoverCard(raw: RecommendedPerson, onlineStatus?: "online" | "away" | "offline"): DiscoverCard {
  return {
    id: String(raw.id),
    userId: String(raw.id),
    name: raw.name,
    avatar: raw.avatarUrl || "",
    headline: raw.headline,
    bio: raw.bio || "",
    tags: raw.tags,
    commonGround: raw.commonGround,
    availability: raw.availability,
    images: raw.images || [],
    campusName: raw.campusName,
    onlineStatus,
    isSameSchool: raw.isSameSchool ?? false,
    isSameMajor: raw.isSameMajor ?? false,
    commonCircleCount: raw.commonCircleCount ?? 0,
    halfBodyPhotoUrl: raw.halfBodyPhotoUrl,
    photoGallery: raw.photoGallery,
    personalVideoUrl: raw.personalVideoUrl,
    profileBackgroundUrl: raw.profileBackgroundUrl,
    height: raw.height,
    educationLevel: raw.educationLevel,
    verificationBadgeLevel: raw.verificationBadgeLevel,
  };
}

/* ========== 常量 ========== */

/**
 * 空推荐筛选条件（Phase C 新增）。
 *
 * 用于 state 初始化与 resetFilter action。所有字段均为 undefined，
 * 表示不施加任何筛选，等价于「不限」。
 *
 * 使用 Object.freeze 防止意外修改：resetFilter 时直接赋值新对象引用，
 * 避免共享引用导致的状态污染。
 */
const EMPTY_RECOMMENDATION_FILTER: Readonly<RecommendationFilter> = Object.freeze({
  heightMin: undefined,
  heightMax: undefined,
  educationLevel: undefined,
  relationshipStatus: undefined,
  hometownProvince: undefined,
  hometownCity: undefined,
  futureCity: undefined,
  keyword: undefined,
});

const DAILY_LIMIT_TOTAL = 10;
const STORAGE_KEY = "discover_daily_record";

/** 最大重试次数 */
const MAX_RETRIES = 2;
/** 重试延迟（毫秒） */
const RETRY_DELAY_MS = 1000;

/**
 * 存储同步防抖延迟（毫秒）
 * 重构目的：避免快速连续操作（如快速滑动多张卡片）导致频繁写入本地存储，
 * 通过 300ms 防抖窗口合并多次状态变更为一次存储写入，降低 IO 开销。
 */
const SAVE_DEBOUNCE_MS = 300;

/**
 * 搜索关键字防抖延迟（毫秒）
 * 用户在搜索框快速输入时，避免每次按键都触发推荐列表刷新，
 * 通过 300ms 防抖窗口合并多次输入为一次刷新请求。
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 防抖存储定时器（模块级单例）
 * 重构说明：采用模块级变量而非 state 字段，原因：
 * 1. 定时器句柄不属于业务状态，不应被响应式追踪
 * 2. 避免被序列化到本地存储造成污染
 * 3. Pinia store 为单例，模块级变量可保证全局唯一性
 */
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 搜索防抖定时器（模块级单例）
 * 与 saveTimer 同理，避免被响应式追踪和序列化污染。
 */
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
  } catch (_e) {
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
  } catch (_e) {
    // 本地存储写入失败时忽略
  }
}

/**
 * 寻觅页 Store
 *
 * 管理推荐卡片、滑动操作、每日限量、时间门控和回看功能。
 */
const _useDiscoverStore = defineStore("discover", {
  state: (): DiscoverState => {
    const record = loadDailyRecord();
    return {
      cards: [],
      dailyLimit: DAILY_LIMIT_TOTAL,
      extraQuota: 0,
      viewedCards: record?.viewedCards ?? [],
      historyCards: [],
      passedCards: [],
      lastRefreshTime: record?.lastRefreshTime ?? null,
      nextRefreshTime: getNextNoonString(),
      hasRewoundToday: record?.hasRewoundToday ?? false,
      hasMore: true,
      loading: false,
      errorMessage: null,
      onlineStatusMap: {},
      lastSwipeResult: null,
      activeFilter: "nearby",
      recommendationFilter: { ...EMPTY_RECOMMENDATION_FILTER },
      isFilterDrawerOpen: false,
      searchKeyword: "",
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
    /** 今日剩余数量（含签到额外配额） */
    remainingCount: (state): number => {
      return Math.max(0, state.dailyLimit + state.extraQuota - state.viewedCards.length);
    },
    /** 是否达到每日上限 */
    isLimitReached: (state): boolean => {
      return state.viewedCards.length >= state.dailyLimit + state.extraQuota;
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
     *
     * Phase C 重构：原实现区分 mock / real 两条分支（mock 用本地 mockCards 数组过滤，
     * real 调 /recommendations/people?userId=xxx）。现统一通过 clientApi.getRecommendations
     * 调度（clientApi 内部根据 appEnv.apiMode 自动分发 mock/real，mock 模式下走
     * mockFixtures.getRecommendations，real 模式下走 /recommendations?xxx query string）。
     *
     * 透传参数：recommendationFilter（筛选抽屉应用的条件对象）+ searchKeyword（搜索框输入）。
     * keyword 优先取 searchKeyword（用户输入），其次取 recommendationFilter.keyword（兜底）。
     */
    async fetchCards() {
      this.loading = true;
      this.errorMessage = null;

      try {
        // 每次加载时检查是否需要跨天重置
        this.resetDailyLimit();

        await withRetry(async () => {
          // 统一通过 clientApi.getRecommendations 获取推荐数据
          // clientApi 内部根据 appEnv.apiMode 自动分发 mock / real 模式
          const filter: RecommendationFilter = {
            ...this.recommendationFilter,
            // keyword 优先使用 searchKeyword（用户在搜索框输入的实时值），
            // 兜底使用 recommendationFilter.keyword（drawer 中预设的关键字）
            keyword: this.searchKeyword || this.recommendationFilter.keyword,
          };
          const rawData = await clientApi.getRecommendations(filter);

          // 过滤掉已查看的卡片（避免重复推荐）
          const viewedIds = new Set(this.viewedCards.map((v) => v.cardId));
          let availableCards = rawData
            .map((item) => mapToDiscoverCard(item))
            .filter((card) => !viewedIds.has(card.id));

          // 同校加权：优先展示同校用户
          try {
            const sessionStore = useSessionStore();
            const myCampus = sessionStore.userSession?.campusName ?? "";
            if (myCampus) {
              const sameCampus: DiscoverCard[] = [];
              const otherCampus: DiscoverCard[] = [];
              for (const card of availableCards) {
                if (card.campusName === myCampus) {
                  sameCampus.push(card);
                } else {
                  otherCampus.push(card);
                }
              }
              availableCards = [...sameCampus, ...otherCampus];
            }
          } catch (_e) {
            // session store 不可用时忽略，不影响正常流程
          }

          this.cards = availableCards;
          this.hasMore = availableCards.length > 0 && !this.isLimitReached;

          // 同步更新历史记录和已拒绝记录
          this.syncHistoryCards();
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
            // 保存卡片快照，供 rewindCard 反悔时恢复
            card,
          };

          this.viewedCards.push(record);
          this.cards = this.cards.filter((c) => c.id !== cardId);
          this.hasMore = this.cards.length > 0 && !this.isLimitReached;

          this.syncHistoryCards();
          // 存储同步由 watch 自动触发（监听 viewedCards 变更）

          // 卡片不足时自动补充
          if (this.cards.length < 2 && this.hasMore && !this.isLimitReached) {
            await this.fetchCards();
          }
          return;
        }

        // 左滑（不感兴趣）：调用后端 pass 端点
        // POST /api/matches/pass
        const sessionStore = useSessionStore();
        const currentUserId = sessionStore.userSession?.userId ?? "";
        await request<void>({
          url: "/matches/pass",
          method: "POST",
          data: {
            userId: currentUserId,
            passedUserId: card.userId,
          },
        });

        const record: ViewedCardRecord = {
          cardId,
          userId: card.userId,
          direction: "left",
          viewedAt: new Date().toISOString(),
          // 保存卡片快照，供 rewindCard 反悔时恢复
          card,
        };

        this.viewedCards.push(record);
        this.cards = this.cards.filter((c) => c.id !== cardId);
        this.hasMore = this.cards.length > 0 && !this.isLimitReached;

        this.syncHistoryCards();
        // 存储同步由 watch 自动触发（监听 viewedCards 变更）

        // 卡片不足时自动补充
        if (this.cards.length < 2 && this.hasMore && !this.isLimitReached) {
          await this.fetchCards();
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "操作失败";
        throw error;
      }
    },

    /**
     * 右滑（喜欢）
     * @param cardId - 卡片 ID
     */
    async swipeRight(cardId: string, isSuperLike = false) {
      this.errorMessage = null;
      // 重置上次结果
      this.lastSwipeResult = null;

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
          // mock 模式：30% 概率匹配成功（用户指定）
          const matched = Math.random() < 0.3;
          const mockResult: {
            matched: boolean;
            matchId?: string;
            partnerName?: string;
            partnerAvatar?: string;
          } = {
            matched,
            matchId: matched ? `match_${Date.now()}` : undefined,
            partnerName: matched ? card.name : undefined,
            partnerAvatar: matched ? card.avatar : undefined,
          };

          // 保存匹配结果供页面使用（含头像，用于双头像碰撞动画）
          this.lastSwipeResult = {
            matched: mockResult.matched,
            matchId: mockResult.matchId,
            partnerName: mockResult.partnerName,
            cardId,
          };

          const record: ViewedCardRecord = {
            cardId,
            userId: card.userId,
            direction: "right",
            viewedAt: new Date().toISOString(),
            // 保存卡片快照，供 rewindCard 反悔时恢复
            card,
          };

          this.viewedCards.push(record);
          this.cards = this.cards.filter((c) => c.id !== cardId);
          this.hasMore = this.cards.length > 0 && !this.isLimitReached;

          this.syncHistoryCards();
          // 存储同步由 watch 自动触发（监听 viewedCards 变更）

          // 匹配成功时联动 likes store：将对方加入「喜欢我的」列表，使喜欢页可见
          if (matched) {
            try {
              const likesStore = useLikesStore();
              likesStore.addMatchedUser({
                userId: card.userId,
                name: card.name,
                avatar: card.avatar,
                headline: card.headline,
              });
            } catch (_e) {
              // likes store 不可用时忽略，不影响主流程
            }
          }

          // 卡片不足时自动补充
          if (this.cards.length < 2 && this.hasMore && !this.isLimitReached) {
            await this.fetchCards();
          }
          return;
        }

        // 调用后端 API: POST /api/matches/like 或 /api/matches/super-like
        // 右滑（喜欢）对应后端的 likeUser 操作
        const sessionStore = useSessionStore();
        const currentUserId = sessionStore.userSession?.userId ?? "";

        // 调用后端 API，失败时使用 mock 逻辑兜底：30% 概率匹配成功（与 mock 模式一致）
        const result = await request<{
          matched: boolean;
          matchId?: string;
          partnerName?: string;
        }>({
          url: isSuperLike ? "/matches/super-like" : "/matches/like",
          method: "POST",
          data: {
            userId: currentUserId,
            targetUserId: card.userId,
            isSuperLike,
          },
        }).catch(() => {
          // API 失败时使用 mock 逻辑：30% 概率匹配成功（与 mock 模式一致）
          const matched = Math.random() < 0.3;
          return {
            matched,
            matchId: matched ? `match_${Date.now()}` : undefined,
            partnerName: matched ? card.name : undefined,
          };
        });

        // 保存匹配结果供页面使用
        this.lastSwipeResult = {
          matched: result.matched,
          matchId: result.matchId,
          partnerName: result.partnerName,
          cardId,
        };

        const record: ViewedCardRecord = {
          cardId,
          userId: card.userId,
          direction: "right",
          viewedAt: new Date().toISOString(),
          // 保存卡片快照，供 rewindCard 反悔时恢复
          card,
        };

        this.viewedCards.push(record);
        this.cards = this.cards.filter((c) => c.id !== cardId);
        this.hasMore = this.cards.length > 0 && !this.isLimitReached;

        this.syncHistoryCards();
        // 存储同步由 watch 自动触发（监听 viewedCards 变更）

        // 匹配成功时联动 likes store：将对方加入「喜欢我的」列表，使喜欢页可见
        if (result.matched) {
          try {
            const likesStore = useLikesStore();
            likesStore.addMatchedUser({
              userId: card.userId,
              name: card.name,
              avatar: card.avatar,
              headline: card.headline,
            });
          } catch (_e) {
            // likes store 不可用时忽略，不影响主流程
          }
        }

        // 卡片不足时自动补充
        if (this.cards.length < 2 && this.hasMore && !this.isLimitReached) {
          await this.fetchCards();
        }
      } catch (error) {
        this.errorMessage = isSuperLike ? "超级喜欢失败，请重试" : "喜欢操作失败，请重试";
        console.error("swipeRight error:", error);
        throw error;
      }
    },

    /**
     * 清除上次滑动结果
     */
    resetLastResult() {
      this.lastSwipeResult = null;
    },

    /**
     * 反悔上一张卡片（rewind）
     *
     * Phase C 重构：mock 模式原通过 mockCards.find 查找卡片数据，
     * 现改为从 viewedCards 末尾的 card 快照恢复，避免依赖本地 mockCards 数组
     * （fetchCards 已切换到 clientApi.getRecommendations，mockCards 已移除）。
     *
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

          // 从 viewedCards 末尾的快照恢复卡片数据
          const card = lastViewed.card;
          if (!card) {
            throw new Error("卡片不存在");
          }

          this.viewedCards.pop();
          this.cards.unshift(card);
          this.hasMore = true;
          this.hasRewoundToday = true;

          this.syncHistoryCards();
          // 存储同步由 watch 自动触发（监听 viewedCards/hasRewoundToday 变更）
          return;
        }

        // 反悔操作：调用后端 rewind 端点
        // POST /api/matches/rewind
        const sessionStore = useSessionStore();
        const currentUserId = sessionStore.userSession?.userId ?? "";
        await request<{ success: boolean; message: string }>({
          url: "/matches/rewind",
          method: "POST",
          data: { userId: currentUserId },
        });

        // 从已查看列表中移除最后一条记录，并取出卡片快照
        const lastViewed = this.viewedCards[this.viewedCards.length - 1];
        if (lastViewed && lastViewed.cardId === cardId) {
          this.viewedCards.pop();
        }

        // 优先使用 viewedCards 中的卡片快照恢复到列表头部
        if (lastViewed?.card) {
          this.cards.unshift(lastViewed.card);
        } else {
          // 快照缺失时（旧数据兼容），尝试在当前 cards 列表中查找
          const card = this.cards.find((c) => c.id === cardId);
          if (!card) {
            // 如果卡片不在当前列表中，需要重新获取
            await this.fetchCards();
          }
        }

        this.hasMore = true;
        this.hasRewoundToday = true;
        this.syncHistoryCards();
        // 存储同步由 watch 自动触发（监听 viewedCards/hasRewoundToday 变更）
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
        this.extraQuota = 0;
        // 存储同步由 watch 自动触发（监听 viewedCards/hasRewoundToday/lastRefreshTime 变更）
      }
    },

    /**
     * 防抖存储：延迟 300ms 执行存储同步
     *
     * 重构目的：在 watch 回调中调用此方法，合并短时间内多次状态变更为一次存储写入。
     * 若在防抖窗口内再次触发，会重置定时器，确保只保留最后一次变更的存储结果，
     * 有效避免快速滑动卡片或连续刷新导致的频繁 IO 操作。
     */
    debouncedSave() {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      saveTimer = setTimeout(() => {
        this.saveToStorage();
        saveTimer = null;
      }, SAVE_DEBOUNCE_MS);
    },

    /**
     * 保存当前状态到本地存储
     *
     * 重构增强：添加 try-catch 错误处理，捕获存储异常并记录日志，
     * 避免存储失败（如空间不足、存储被禁用）影响主业务流程。
     * 该方法由 debouncedSave 自动调用，业务代码无需手动调用。
     */
    saveToStorage() {
      try {
        saveDailyRecord(this.viewedCards, this.hasRewoundToday, this.lastRefreshTime);
      } catch (error) {
        console.error("[DiscoverStore] 存储同步失败:", error);
      }
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
      // 存储同步由 watch 自动触发（监听 viewedCards/hasRewoundToday/lastRefreshTime 变更）
    },

    /**
     * 从后端获取推荐历史
     * Real 模式调用 GET /api/recommendations/history?userId={userId}
     */
    async loadHistory() {
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 模式下使用本地记录
          this.syncHistoryCards();
          return;
        }

        // 调用后端 API: GET /api/recommendations/history?userId={userId}
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        const rawData = await request<RecommendedPersonView[]>({
          url: `/recommendations/history?userId=${userId}`,
          method: "GET",
        });

        // 将后端数据映射为 ViewedCardRecord（方向统一为 right，表示历史记录）
        this.historyCards = rawData.map((item) => ({
          cardId: String(item.id),
          userId: String(item.id),
          direction: "right" as SwipeDirection,
          viewedAt: new Date().toISOString(),
        }));
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载推荐历史失败";
      }
    },

    /**
     * 查询在线状态
     * 根据推荐卡片中的用户 ID 列表，批量查询在线状态并更新到卡片数据中
     * Mock 模式提供本地测试数据，Real 模式调用 GET /api/online-status?userIds=xxx
     */
    async fetchOnlineStatus() {
      this.errorMessage = null;

      try {
        // 收集当前卡片中所有用户 ID
        const userIds = this.cards.map((c) => c.userId);
        if (userIds.length === 0) return;

        if (useMock()) {
          // Mock 模式：从本地卡片数据中提取已有的 onlineStatus，构建映射表
          const statusMap: Record<string, "online" | "away" | "offline"> = {};
          for (const card of this.cards) {
            if (card.onlineStatus) {
              statusMap[card.userId] = card.onlineStatus;
            }
          }
          this.onlineStatusMap = statusMap;
          return;
        }

        // 调用后端 API: GET /api/online-status?userIds=xxx,xxx
        const data = await request<OnlineStatusView[]>({
          url: `/online-status?userIds=${userIds.join(",")}`,
          method: "GET",
        });

        // 构建在线状态映射表
        const statusMap: Record<string, "online" | "away" | "offline"> = {};
        for (const item of data) {
          statusMap[String(item.userId)] = (item.status as "online" | "away" | "offline") ?? "offline";
        }
        this.onlineStatusMap = statusMap;

        // 同步更新卡片中的 onlineStatus 字段
        for (const card of this.cards) {
          card.onlineStatus = statusMap[card.userId] ?? "offline";
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "查询在线状态失败";
      }
    },

    /**
     * 设置签到额外配额
     * 由签到成功后调用，增加今日推荐次数
     */
    setExtraQuota(quota: number) {
      this.extraQuota = quota;
    },

    /**
     * 设置筛选条件并刷新推荐列表
     *
     * Phase C 说明：此方法仅更新 activeFilter（chip ID）用于 UI 高亮，
     * 不直接修改 recommendationFilter 对象。chip 与 recommendationFilter 解耦：
     * chip 是快捷预设，recommendationFilter 是抽屉中的详细筛选。
     *
     * @param filterId - 筛选 ID（nearby/all/age18-25/match-priority）
     */
    setFilter(filterId: string) {
      this.activeFilter = filterId;
      // 切换筛选后重新加载推荐卡片
      void this.fetchCards();
    },

    /**
     * 设置推荐筛选条件对象（Phase C 新增）。
     *
     * 由筛选抽屉组件（H-07 + M-16）调用：用户在抽屉中调整筛选项后，
     * 点击「应用筛选」按钮，将完整的 RecommendationFilter 对象传入。
     * 调用后立即刷新推荐列表（fetchCards 会读取 recommendationFilter 透传给 API）。
     *
     * 设计权衡：使用整体替换而非逐字段更新，确保调用方对状态有完整控制，
     * 避免部分字段残留导致筛选逻辑混乱。
     *
     * @param filter - 完整的推荐筛选条件对象
     */
    setRecommendationFilter(filter: RecommendationFilter) {
      // 浅拷贝避免外部引用变更污染 store 状态
      this.recommendationFilter = { ...filter };
      void this.fetchCards();
    },

    /**
     * 重置所有筛选字段为 undefined/空（Phase C 新增）。
     *
     * 清空 recommendationFilter 的所有字段（身高范围、学历、感情状态、
     * 籍贯省市、未来城市、关键字），等价于「不限」状态。
     * 调用后立即刷新推荐列表。
     *
     * 注意：仅重置 recommendationFilter，不影响 activeFilter（chip 高亮），
     * chip 状态由页面层单独管理（与抽屉筛选语义解耦）。
     */
    resetFilter() {
      this.recommendationFilter = { ...EMPTY_RECOMMENDATION_FILTER };
      void this.fetchCards();
    },

    /**
     * 打开筛选抽屉（Phase C 新增）。
     *
     * 设置 isFilterDrawerOpen = true，驱动筛选抽屉组件（H-07）渲染。
     * 抽屉内部通过 v-model 或 @close 监听关闭事件。
     */
    openFilterDrawer() {
      this.isFilterDrawerOpen = true;
    },

    /**
     * 关闭筛选抽屉（Phase C 新增）。
     *
     * 设置 isFilterDrawerOpen = false，触发抽屉的 leave transition。
     * 不自动应用筛选：用户若取消选择，已修改的 recommendationFilter
     * 不会生效（需调用 setRecommendationFilter 才会更新）。
     */
    closeFilterDrawer() {
      this.isFilterDrawerOpen = false;
    },

    /**
     * 设置搜索关键字（带 300ms 防抖，避免快速输入触发频繁刷新）
     * @param keyword - 搜索关键字（用户昵称/标签/学校）
     */
    setSearchKeyword(keyword: string) {
      this.searchKeyword = keyword;
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
      searchDebounceTimer = setTimeout(() => {
        void this.fetchCards();
        searchDebounceTimer = null;
      }, SEARCH_DEBOUNCE_MS);
    },
  },
});

/**
 * 状态变更监听：自动触发防抖存储同步
 *
 * 重构核心：通过 watch 机制将"状态变更"与"存储同步"解耦，
 * 业务 action 只需修改状态，存储同步由 watch 自动触发，
 * 消除了手动调用 saveToStorage 的遗漏风险，也避免了重复调用。
 *
 * 监听三个关键状态：
 * - viewedCards：已查看卡片记录（深监听，捕获数组 push/pop/splice 等内部变更）
 * - hasRewoundToday：今日是否已使用挽回
 * - lastRefreshTime：上次刷新时间
 *
 * 任一状态变更都会触发 debouncedSave（300ms 防抖），合并为一次存储写入。
 *
 * 实现说明：Pinia Options API 的 defineStore 类型定义中不包含 watch 选项，
 * 因此通过包装 useDiscoverStore，在 store 首次实例化时使用 Vue 的 watch
 * 注册监听器，确保全局只初始化一次（模块级 _watchInitialized 标志控制）。
 */
let _watchInitialized = false;

/**
 * 寻觅页 Store 工厂函数
 *
 * 包装内部 _useDiscoverStore，在首次调用时注册状态监听器，
 * 后续调用直接返回缓存的 store 实例（Pinia 单例特性）。
 */
export function useDiscoverStore() {
  const store = _useDiscoverStore();

  if (!_watchInitialized) {
    _watchInitialized = true;

    // 监听已查看卡片记录变更（深监听，捕获数组 push/pop/splice 等内部变更）
    watch(
      () => store.viewedCards,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          store.debouncedSave();
        }
      },
      { deep: true }
    );

    // 监听今日挽回状态变更
    watch(
      () => store.hasRewoundToday,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          store.debouncedSave();
        }
      }
    );

    // 监听上次刷新时间变更
    watch(
      () => store.lastRefreshTime,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          store.debouncedSave();
        }
      }
    );
  }

  return store;
}
