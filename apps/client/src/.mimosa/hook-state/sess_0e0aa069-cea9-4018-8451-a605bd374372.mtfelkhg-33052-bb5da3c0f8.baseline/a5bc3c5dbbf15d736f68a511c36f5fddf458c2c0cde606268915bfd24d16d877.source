import type { ProfileContentItem } from "./profile.content";
import type { ProfileRelation } from "./profile.relation";
import type { ProfileState } from "./profile.status";

export interface ProfileDTO {
  id: number;
  state: ProfileState;
  name: string;
  avatar: string;
  age: number | null;
  location: string;
  mbti: string;
  personality: string[];
  verified: boolean;
  student: boolean;
  bio: string;
  tags: string[];
  goal: string;
  expectation: string[];
  cover: string;
  photos: string[];
  voiceIntro: string;
  circles: string[];
  likedMeCount: number;
  likesCount: number;
  visitorCount: number;
  matchCount: number;
  relation: ProfileRelation;
  content: ProfileContentItem[];
  config: {
    showMBTI: boolean;
    showVoice: boolean;
    showCircle: boolean;
    maxStories: number;
    maxPhotos: number;
  };
}
