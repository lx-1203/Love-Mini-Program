import type { DiscoverCard } from "../stores/discover/types";
import {
  MATCH_SCORE_BASE,
  MATCH_SCORE_MAX,
  MATCH_SCORE_STEP,
} from "../constants/match";
import type { MatchCardUser, MatchReason } from "../types/match";

/**
 * 计算匹配度：与 CardSwiper 同口径，基于共同兴趣圈数量纯展示。
 */
export function computeMatchScore(commonCircleCount?: number): number {
  const base = commonCircleCount ?? 1;
  return Math.min(MATCH_SCORE_MAX, MATCH_SCORE_BASE + base * MATCH_SCORE_STEP);
}

/**
 * DiscoverCard -> MatchCardUser。
 * 主图优先级：halfBodyPhotoUrl -> photoGallery[0] -> avatar。
 */
export function toMatchCardUser(card: DiscoverCard): MatchCardUser {
  const photo =
    card.halfBodyPhotoUrl ||
    card.photoGallery?.[0] ||
    card.avatar ||
    "";
  return {
    id: card.id,
    userId: card.userId,
    name: card.name,
    age: card.age,
    avatar: card.avatar,
    photo,
    onlineStatus: card.onlineStatus,
    gender: card.gender,
    school: card.campusName,
    occupation: card.occupation,
    tags: card.tags ?? [],
    headline: card.headline || card.bio || "",
    matchScore: computeMatchScore(card.commonCircleCount),
    commonGround: card.commonGround || "",
    isSameSchool: card.isSameSchool,
    isSameMajor: card.isSameMajor,
    verificationBadgeLevel: card.verificationBadgeLevel,
    distanceText: card.distanceText,
    activeStatusText: card.activeStatusText,
    gradeLabel: card.gradeLabel,
  };
}

/**
 * 匹配成功页的“关系建立理由”。
 * 优先同校/同专业，再使用共同兴趣；未提供本人标签时退化为对方前 3 个标签。
 */
export function buildMatchReasons(
  user: MatchCardUser,
  myTags: string[] = []
): MatchReason[] {
  const reasons: MatchReason[] = [];
  if (user.isSameSchool) reasons.push({ type: "same_school", text: "同校" });
  if (user.isSameMajor) reasons.push({ type: "same_major", text: "同专业" });

  const commonTags =
    myTags.length > 0
      ? user.tags.filter((tag) => myTags.includes(tag))
      : user.tags.slice(0, 3);

  for (const tag of commonTags.slice(0, 3)) {
    reasons.push({ type: "common_interest", text: tag });
  }

  if (reasons.length === 0 && user.commonGround) {
    reasons.push({ type: "fallback", text: user.commonGround });
  }

  return reasons.slice(0, 4);
}