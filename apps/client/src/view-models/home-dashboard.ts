import type { HomeFeedView, TodayRecommendationView } from "../services/generated/api-types-supplement";

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
    },
    interestRecommendations: feed?.interestRecommendations ?? [],
    nearbyPeople: feed?.nearbyPeople ?? [],
    communityPosts: feed?.communityPosts ?? [],
  };
}
