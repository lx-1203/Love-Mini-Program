/**
 * 补充 API 类型定义
 * 
 * 这些类型在已实现的代码中被引用，但尚未纳入 OpenAPI 规范的自动生成。
 * 当对应 OpenAPI spec 补充完毕后，可移除此文件改由自动生成。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlexibleObject = Record<string, any>;

// ===== Profile Stats =====
export interface ProfileStats {
  followers: number;
  following: number;
  likes: number;
  visitors: number;
  posts: number;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  visitorsCount: number;
}

// ===== Online Status =====
export interface OnlineStatusView {
  userId: string;
  online: boolean;
  lastSeenAt: string;
  status?: 'online' | 'offline' | 'away';
}

// ===== Interaction Events (matching both old and new field names) =====
export interface InteractionEventView {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'match' | 'visit';
  // Legacy field name aliases
  eventType?: 'NEW_LIKE' | 'NEW_VISITOR' | 'NEW_FOLLOW' | 'POST_LIKED' | 'POST_COMMENTED' | 'TOPIC_REPLIED';
  fromUserId: string;
  triggerUserId?: number;
  fromUserName: string;
  triggerUserName?: string;
  fromUserAvatar: string;
  triggerUserAvatar?: string;
  referenceId?: string;
  referenceType?: string;
  summary?: string;
  createdAt: string;
  read: boolean;
  isRead?: boolean;
}

// ===== Campus Feed =====
export interface CampusFeedView {
  id: string;
  type: 'post' | 'activity' | 'checkin';
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  posts?: Record<string, unknown>[];
  activities?: Record<string, unknown>[];
  topics?: Record<string, unknown>[];
}

// ===== Icebreaker =====
export interface IcebreakerView {
  id: string;
  question: string;
  category: string;
  topics?: { id: string; title: string }[];
}

// ===== Post Author =====
export interface PostAuthor {
  userId: string;
  name: string;
  avatar: string;
  headline: string;
  campusName?: string;
  interests?: string[];
  isFollowed?: boolean;
  isAlumni?: boolean;
}

// ===== PostItem =====
export interface PostItem {
  id: string;
  author: PostAuthor;
  categoryId: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isAlumni: boolean;
  isShared?: boolean;
  isFollowed?: boolean;
  createdAt: string;
}

// ===== Similar Author =====
export interface SimilarAuthor {
  userId: string;
  name: string;
  nickname: string;
  avatar: string;
  avatarUrl: string;
  headline: string;
  campusName: string;
  interests?: string[];
  commonInterests?: string[];
  isAlumni: boolean;
  isFollowed: boolean;
}

// ===== Chat Message =====
export interface ChatMessage {
  id: string;
  sender: 'self' | 'peer' | 'system';
  kind: 'system' | 'text' | 'voice' | 'emoji';
  body: string;
  sentAt: string;
  durationSeconds?: number | null;
  recalled: boolean;
  deliveryStatus: 'sent' | 'read';
  quoteRef?: string | null;
  quoteBody?: string | null;
}

// ===== Home Dashboard (flexible to match page usage) =====
export interface HomeDashboardWithDiscussion {
  scheduleSummary: {
    id: string;
    title: string;
    subtitle: string;
    meta: string;
    actionLabel?: string | null;
    summary?: string;
    freeSlots?: FlexibleObject[];
    [key: string]: unknown;
  };
  freeSlots: FlexibleObject[];
  aiPlan: {
    id: string;
    title: string;
    subtitle: string;
    meta: string;
    actionLabel?: string | null;
    content?: string;
    suggestions?: FlexibleObject[];
    [key: string]: unknown;
  };
  recommendedPeople: {
    id: string;
    name: string;
    initials: string;
    headline: string;
    commonGround: string;
    availability: string;
    avatarUrl?: string;
    isSameSchool?: boolean;
    isSameMajor?: boolean;
    commonCircleCount?: number;
    hasCompletedProfile?: boolean;
    [key: string]: unknown;
  }[];
  peopleLead: string;
  activityPreview: FlexibleObject;
  discussionHeat: FlexibleObject;
}

export namespace Schemas {
  export interface HomeDashboard extends HomeDashboardWithDiscussion {}
}

// ===== Phase C 扩展：基本资料更新 / 推荐筛选 / 推荐人物 =====

/**
 * 更新基本资料请求体（含 Phase A 扩展字段）。
 *
 * 对应后端 PUT /api/profile/basic 端点，承载 UserBasicProfile 实体中
 * 在 Phase A 任务中新增的所有扩展字段。所有字段均为可选，调用方按需传入。
 */
export interface UpdateBasicProfileRequest {
  /** 昵称 */
  nickname?: string;
  /** 个人简介 */
  bio?: string;
  /** 年级 */
  grade?: string;
  /** 代词 */
  pronouns?: string;
  /** 身高（cm），取值范围 120-250 */
  height?: number;
  /** 学历：high_school/bachelor/master/phd */
  educationLevel?: string;
  /** 感情状态：never/married_before/divorced/widowed */
  relationshipStatus?: string;
  /** 籍贯省份 */
  hometownProvince?: string;
  /** 籍贯城市 */
  hometownCity?: string;
  /** 未来城市 */
  futureCity?: string;
  /** 未来规划标签数组 */
  futurePlanTags?: string[];
}

/**
 * 推荐筛选条件。
 *
 * 对应后端 GET /api/recommendations 端点的查询参数，所有字段均为可选。
 * 多值字段（educationLevel、relationshipStatus）以数组形式表达，
 * 由 API 客户端在拼装 query string 时以逗号拼接。
 */
export interface RecommendationFilter {
  /** 身高下限（cm） */
  heightMin?: number;
  /** 身高上限（cm） */
  heightMax?: number;
  /** 学历多选：high_school/bachelor/master/phd */
  educationLevel?: string[];
  /** 感情状态多选：never/married_before/divorced/widowed */
  relationshipStatus?: string[];
  /** 籍贯省份 */
  hometownProvince?: string;
  /** 籍贯城市 */
  hometownCity?: string;
  /** 未来城市 */
  futureCity?: string;
  /** 关键词（模糊匹配 nickname/bio/interestTags） */
  keyword?: string;
}

/**
 * 推荐人物视图（Phase B 扩展）。
 *
 * 在原 RecommendedPersonView 基础上新增 Phase A 实体扩展字段：
 * height/educationLevel/photoGallery/halfBodyPhotoUrl/personalVideoUrl/verificationBadgeLevel。
 * 兼容字段（id/name/headline/...）保持不变，便于现有 mapToDiscoverCard 复用。
 */
export interface RecommendedPerson {
  /** 用户 ID */
  id: number;
  /** 昵称 */
  name: string;
  /** 首字母缩写 */
  initials: string;
  /** 标题行 */
  headline: string;
  /** 共同点描述 */
  commonGround: string;
  /** 可用时段描述 */
  availability: string;
  /** 学校名称 */
  campusName: string;
  /** 头像 URL */
  avatarUrl: string;
  /** 兴趣标签数组 */
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
  /** 身高（cm） */
  height?: number;
  /** 学历：high_school/bachelor/master/phd */
  educationLevel?: string;
  /** 照片墙 URL 数组（最多 6 张） */
  photoGallery?: string[];
  /** 半身照 URL */
  halfBodyPhotoUrl?: string;
  /** 个人视频 URL */
  personalVideoUrl?: string;
  /** 主页背景图 URL */
  profileBackgroundUrl?: string;
  /** 认证徽章级别：none/email/idcard/school */
  verificationBadgeLevel?: string;
}
