/**
 * Discover Store 类型定义
 *
 * 集中维护寻觅页相关的所有 TypeScript 类型定义：
 * - 实体类型：DiscoverCard / ViewedCardRecord
 * - 状态类型：DiscoverState
 * - 后端视图类型：RecommendedPersonView
 * - 枚举类型：SwipeDirection
 *
 * 这些类型被 constants.ts / utils.ts / api.ts / index.ts 共享。
 */

import type { RecommendationFilter } from "../../services/generated/api-types-supplement";

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
  /** 展示用个人 ID（用户编号，如 "CL-1024"） */
  displayId?: string;
  /** 距离文案（如 "1.2km" / "同校"） */
  distanceText?: string;
  /** 活跃状态文案（如 "刚刚活跃" / "今天活跃" / "3 小时前活跃"） */
  activeStatusText?: string;
  /** 机器认证（头像/照片真实性机审） */
  machineVerified?: boolean;
  /** 人工认证（人工审核通过） */
  humanVerified?: boolean;
  /** 性格标签（如 阳光开朗/慢热） */
  personality?: string[];
  /** MBTI 人格类型（如 INFP） */
  mbti?: string;
  /** 悄悄话内容（付费可见/发送） */
  whisper?: string;
  /** 是否已发送悄悄话 */
  whisperSent?: boolean;
  /** 动态预览（卡片/详情页动态 Tab） */
  recentPosts?: Array<{
    id: string;
    content: string;
    images?: string[];
    likes: number;
    comments: number;
    isLiked: boolean;
    createdAt: string;
  }>;
  /** 期待的人物画像描述 */
  expectedPartner?: string;
  /** 是否允许私信（未解锁时需付费） */
  allowMessage?: boolean;
  /** IP 属地（如 "江苏 · 南京"，Phase 4.1 详情页分区新增） */
  ipLocation?: string;
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
  /**
   * 本次会话已使用 rewind（反悔）次数。
   *
   * 修复（P1 BUG）：原实现仅有 hasRewoundToday（每日1次）限制（mock 模式），
   * real 模式下完全依赖后端，无客户端次数限制。
   * 现新增 undoCount 客户端计数器，限制单次会话最多 3 次 rewind，
   * 避免用户反复 rewind 刷卡片影响推荐算法的有效性。
   */
  undoCount: number;
  /**
   * 功能6：高级筛选条件状态。
   *
   * 与 recommendationFilter 中的高级字段（gender/ageMin/ageMax/schools/
   * distanceMax/interests/onlineOnly）保持同步，作为独立 slice 暴露给
   * AdvancedFilter 组件进行 v-model 双向绑定。
   *
   * 设计权衡：
   * - recommendationFilter 是统一的 API 透传对象（含基础+高级字段）
   * - advancedFilter 作为独立 state，便于 AdvancedFilter 组件直接消费
   *   与更新，避免组件需要感知 recommendationFilter 的完整结构
   * - 两者通过 setAdvancedFilter / resetAdvancedFilter action 保持同步
   */
  advancedFilter: RecommendationFilter;
}

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
