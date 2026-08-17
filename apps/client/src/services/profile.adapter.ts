import type { ProfileDTO } from "../domain/profile.dto";
import type { ProfileRelationCta } from "../domain/profile.relation";
import type { UserProfileDTO } from "../types/profile";

/**
 * 旧 UserProfileDTO -> 领域 ProfileDTO 适配器。
 * V3 迁移期间 ProfileShell 先消费 ProfileDTO；Public/My 组件后续逐步切换。
 */
export function toProfileDTO(source: UserProfileDTO): ProfileDTO {
  return {
    id: source.id,
    state: (source as { state?: ProfileDTO["state"] }).state ?? "NORMAL",
    name: source.basic.name,
    avatar: source.basic.avatar,
    age: source.basic.age,
    location: source.basic.location,
    mbti: (source.identity as { mbti?: string }).mbti ?? "",
    personality: (source.identity as { personality?: string[] }).personality ?? [],
    verified: source.identity.verified,
    student: source.identity.student,
    bio: source.intro.bio,
    tags: source.intro.tags,
    goal: source.relationship.goal,
    expectation: source.relationship.expectation,
    cover: source.media.cover,
    photos: source.media.photos,
    voiceIntro: (source.media as { voiceIntro?: string }).voiceIntro ?? "",
    circles: (source as { circles?: string[] }).circles ?? [],
    likedMeCount: source.socialProof.likedMeCount,
    likesCount: source.socialProof.likesCount,
    visitorCount: source.socialProof.visitorCount,
    matchCount: source.socialProof.matchCount,
    relation: {
      liked: source.relation.liked,
      matched: source.relation.matched,
      chatted: (source.relation as { chatted?: boolean }).chatted ?? false,
      blocked: (source.relation as { blocked?: boolean }).blocked ?? false,
      matchScore: (source.relation as { matchScore?: number }).matchScore ?? 0,
      matchReasons: (source.relation as { matchReasons?: string[] }).matchReasons ?? [],
    },
    content: source.posts.map((post) => ({
      id: post.id,
      type: "post" as const,
      cover: post.images?.[0] ?? "",
      title: post.content,
      content: post.content,
      createdAt: post.createdAt,
      visibility: "public" as const,
    })),
    config: {
      showMBTI: true,
      showVoice: true,
      showCircle: true,
      maxStories: 6,
      maxPhotos: 6,
    },
  };
}

/** 根据关系状态推导主 CTA 类型 */
export function resolveRelationCta(profile: ProfileDTO): ProfileRelationCta {
  if (profile.relation.blocked) return "blocked";
  if (profile.relation.chatted) return "chatted";
  if (profile.relation.matched) return "matched";
  if (profile.relation.liked) return "liked";
  return "stranger";
}
