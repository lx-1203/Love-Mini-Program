import type { HomeFeedView, TodayRecommendationView } from "../services/generated/api-types-supplement";
import { formatRelativeTime } from "../utils/time";
import { IMAGE_PATHS } from "../config/images";

export type TodayRecommendationViewModel = TodayRecommendationView;

export interface LoveProgressStepViewModel {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: string;
}

export interface RelationActivityViewModel {
  likesReceived: number;
  whispers: number;
  visitors: number;
  newMatches: number;
  totalUnread: number;
  likesAvatars?: string[];
  whisperAvatars?: string[];
  visitorAvatars?: string[];
  matchAvatars?: string[];
}

export interface InterestCircleViewModel {
  id: number;
  name: string;
  icon: string;
  memberCount: number;
  joined: boolean;
}

export interface NearbyPersonViewModel {
  userId: number;
  name: string;
  distanceText: string;
  avatarUrl: string;
  online: boolean;
  commonInterests: string[];
}

export interface CommunityPostViewModel {
  id: number;
  /** 2026-08-31：作者 id——帖子头像/昵称点击跳转他人主页（缺失时降级不跳转） */
  authorId?: number | null;
  authorName: string;
  authorAvatar: string | null;
  circleName: string;
  timeText: string;
  content: string;
  images: string[];
  likeCount: number;
  commentCount: number;
}

export interface HomeViewModel {
  todayRecommendation: TodayRecommendationViewModel | null;
  loveProgress: {
    completed: number;
    total: number;
    steps: LoveProgressStepViewModel[];
  };
  relationActivity: RelationActivityViewModel;
  interestRecommendations: InterestCircleViewModel[];
  nearbyPeople: NearbyPersonViewModel[];
  communityPosts: CommunityPostViewModel[];
}

/**
 * 2026-08-26 R4：ISO 时间戳 → 相对时间。
 * 解析失败（如 mock fixtures 的纯展示字符串 "15 分钟前"）时原样透传，避免 NaN。
 */
function toRelativeTime(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return iso;
  }
  return formatRelativeTime(parsed);
}

export function toHomeViewModel(feed: HomeFeedView | null): HomeViewModel {
  return {
    todayRecommendation: feed?.todayRecommendation ?? null,
    loveProgress: feed?.loveProgress ?? { completed: 0, total: 4, steps: [] },
    relationActivity: feed?.relationActivity ?? {
      likesReceived: 0,
      whispers: 0,
      visitors: 0,
      newMatches: 0,
      totalUnread: 0,
      likesAvatars: [],
      whisperAvatars: [],
      visitorAvatars: [],
      matchAvatars: [],
    },
    interestRecommendations: feed?.interestRecommendations ?? [],
    /**
     * 2026-09-02 R5：附近的人去重（推荐去重红线）。后端 mock 早期会硬编码 5 个「星野」，
     * 这里按 userId 去重后再返回，防止同一人重复出现。前端双层去重的视觉层。
     */
    nearbyPeople: dedupeByUserId(feed?.nearbyPeople ?? []),
    communityPosts: (feed?.communityPosts ?? []).map((p) => ({
      ...p,
      // 2026-08-26 R4：timeText 统一相对时间（ISO 解析失败原样透传）；
      // authorAvatar 空值兜底默认头像，避免头像区空白
      timeText: toRelativeTime(p.timeText),
      authorAvatar: p.authorAvatar || IMAGE_PATHS.DEFAULT_AVATAR,
    })),
  };
}

/**
 * 2026-09-02 R5：按 userId 去重（保留首次出现顺序）。
 * 用于 nearby-people 推荐去重，根除后端硬编码导致的「5 个星野」重复问题。
 */
function dedupeByUserId<T extends { userId: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item.userId)) {
      seen.add(item.userId);
      result.push(item);
    }
  }
  return result;
}
