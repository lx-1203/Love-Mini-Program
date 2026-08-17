/**
 * 个人主页统一契约 UserProfileDTO。
 * 页面只消费本类型，不再依赖 RecommendedPersonView / ProfileStats 散字段。
 */
export interface UserProfileBasic {
  name: string;
  avatar: string;
  age: number | null;
  location: string;
  /** 性别（male/female，可空） */
  gender?: string;
}

export interface UserProfileIdentity {
  verified: boolean;
  student: boolean;
}

export interface UserProfileIntro {
  bio: string;
  tags: string[];
}

export interface UserProfileRelationship {
  goal: string;
  expectation: string[];
}

export interface UserProfileMedia {
  cover: string;
  photos: string[];
  videos: string[];
}

export interface UserProfileSocialProof {
  likedMeCount: number;
  likesCount: number;
  visitorCount: number;
  matchCount: number;
}

export interface UserProfileRelation {
  liked: boolean;
  matched: boolean;
  commonInterests: string[];
  /** 匹配度（他人主页展示），可空 */
  matchScore?: number;
}

export interface UserProfilePost {
  id: string;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  createdAt: string;
}

export interface UserProfileStory {
  id: string;
  cover: string;
  title: string;
  location: string;
  dateText: string;
}

export interface UserProfileDTO {
  id: number;
  basic: UserProfileBasic;
  identity: UserProfileIdentity;
  intro: UserProfileIntro;
  relationship: UserProfileRelationship;
  media: UserProfileMedia;
  socialProof: UserProfileSocialProof;
  relation: UserProfileRelation;
  posts: UserProfilePost[];
  stories?: UserProfileStory[];
  circles?: string[];
  state?: string;
}

/** 主页状态体系 */
export type ProfileState = "NEW" | "INCOMPLETE" | "NORMAL" | "HIGH_QUALITY";

export interface ProfileStory {
  id: string;
  cover: string;
  title: string;
  location: string;
  dateText: string;
}

export interface ProfileConfig {
  showMBTI: boolean;
  showVoice: boolean;
  showCircle: boolean;
  maxStories: number;
  minHighQualityScore: number;
}

/** 2.0 领域化 DTO，后续新组件逐步迁移 */
export interface ProfileBaseDTO {
  id: number;
  name: string;
  avatar: string;
  age: number | null;
  location: string;
  mbti: string;
}

export interface ProfileIdentityDTO {
  verified: boolean;
  student: boolean;
}

export interface ProfileContentDTO {
  stories: ProfileStory[];
  photos: string[];
  voice: string;
  posts: UserProfilePost[];
}

export interface ProfileSocialDTO {
  likedMeCount: number;
  likesCount: number;
  visitorCount: number;
  matchCount: number;
}

export interface ProfileGrowthDTO {
  achievementCount: number;
  vip: boolean;
  certified: boolean;
  inviteCode: string;
}

export interface ProfileRelationDTO {
  liked: boolean;
  matched: boolean;
  commonInterests: string[];
}

export interface ProfileDTO {
  base: ProfileBaseDTO;
  identity: ProfileIdentityDTO;
  content: ProfileContentDTO;
  social: ProfileSocialDTO;
  growth: ProfileGrowthDTO;
  relation: ProfileRelationDTO;
  state: ProfileState;
  config: ProfileConfig;
}
