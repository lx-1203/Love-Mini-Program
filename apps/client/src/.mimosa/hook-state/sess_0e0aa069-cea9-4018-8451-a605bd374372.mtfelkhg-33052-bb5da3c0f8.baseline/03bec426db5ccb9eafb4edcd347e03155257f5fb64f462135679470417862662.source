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
 * 优先同校/同专业/同城距离，再使用共同兴趣；未提供本人标签时退化为对方前 3 个标签；
 * 理由不足 3 条时补充浪漫氛围兜底（D-04，第五轮 QA：参考 理想效果图/匹配成功页面.png，
 * 保证「喜欢日落/同城距离/都爱民谣」类文案在任意 mock 对象下都至少渲染 3 条）。
 */
export function buildMatchReasons(
  user: MatchCardUser,
  myTags: string[] = []
): MatchReason[] {
  const reasons: MatchReason[] = [];
  if (user.isSameSchool) {
    reasons.push({ type: "same_school", text: "同校 · 更容易遇见" });
  }
  if (user.isSameMajor) {
    reasons.push({ type: "same_major", text: "同专业 · 有共同话题" });
  }

  // D-04：同城距离理由（distanceText 形如 "2.3km"，规范化为 "同城距离 2.3km"）
  const distance = user.distanceText;
  if (distance && String(distance).trim()) {
    const clean = String(distance).trim().replace(/^约\s*/, "");
    reasons.push({ type: "distance", text: `同城距离 ${clean}` });
  }

  const userTags = Array.isArray(user.tags) ? user.tags : [];
  const commonTags =
    myTags.length > 0
      ? userTags.filter((tag) => myTags.includes(tag))
      : userTags.slice(0, 3);

  // D-04：共同兴趣改为口语化文案（「都喜欢{tag}」）
  for (const tag of commonTags.slice(0, 3)) {
    reasons.push({ type: "common_interest", text: `都喜欢${tag}` });
  }

  if (reasons.length === 0 && user.commonGround) {
    reasons.push({ type: "fallback", text: user.commonGround });
  }

  // D-04：理由不足 3 条时补充浪漫氛围兜底（与理想图「都喜欢日落/都爱听民谣」观感一致）
  const FALLBACK_REASONS: MatchReason[] = [
    { type: "fallback", text: "都喜欢日落" },
    { type: "fallback", text: "都爱听民谣" },
    { type: "fallback", text: "喜欢同一种浪漫" },
  ];
  for (const fb of FALLBACK_REASONS) {
    if (reasons.length >= 3) break;
    if (!reasons.some((r) => r.text === fb.text)) {
      reasons.push(fb);
    }
  }

  return reasons.slice(0, 4);
}