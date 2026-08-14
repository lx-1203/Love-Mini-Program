import type { components } from "../services/generated/api-types";
import type { RecommendedPersonView } from "../stores/discover/types";
import type { ProfileView } from "./profile";

type Schemas = components["schemas"];

/**
 * 他人主页视图模型（2026-08-13）。
 *
 * 背景：个人主页页（pages/profile/index.vue）一页双态（自己 / 他人），
 * 原实现他人态只拉背景图，头像/昵称/标签等全部误用查看者自己的 profileStore 数据。
 * 本模块将他人公开视图（GET /recommendations/{userId}/profile 返回的
 * RecommendedPersonView）映射为页面消费的 ProfileView / BasicProfile 形状，
 * 与 toProfileView 保持同一消费契约，页面 computed 无需感知数据源差异。
 *
 * 注意：动态区（myPostsPreview/myPostsTotal）在页面已加 isOwnProfile 门禁
 * （他人动态改由白卡照片墙呈现），此处固定为空态仅保持 ProfileView 形状完整。
 */

/**
 * RecommendedPersonView → ProfileView（他人主页头部消费）。
 * 无数据（加载失败/未加载）时返回空态视图，页面按占位渲染。
 */
export function toOtherProfileView(
  view: RecommendedPersonView | null
): ProfileView {
  if (!view) {
    return {
      displayName: "",
      avatarInitial: "?",
      avatarUrl: "",
      school: "",
      bio: "",
      isVip: false,
      vipPlanName: "",
      myPostsPreview: [],
      myPostsTotal: 0,
    };
  }

  const displayName = view.name?.trim() ?? "";
  const avatarInitial = (displayName || "?").charAt(0).toUpperCase() || "?";

  return {
    displayName,
    avatarInitial,
    avatarUrl: view.avatarUrl ?? "",
    school: view.campusName?.trim() ?? "",
    bio: view.bio?.trim() ?? "",
    isVip: false,
    vipPlanName: "",
    myPostsPreview: [],
    myPostsTotal: 0,
  };
}

/**
 * RecommendedPersonView → BasicProfile 形状（他人主页标签/位置/学历等 computed 消费）。
 * 仅填充他人视图可提供的公开字段；其余字段按空值兜底（页面 computed 均已做空值守卫）。
 */
export function toOtherBasicProfile(
  view: RecommendedPersonView | null
): Schemas["BasicProfile"] | null {
  if (!view) return null;
  return {
    nickname: view.name ?? "",
    bio: view.bio ?? "",
    // 他人视图无年级字段：用年龄推导展示（genderGradeLabel 组合时显示「N岁」）
    grade: typeof view.age === "number" && view.age > 0 ? `${view.age}岁` : "",
    pronouns: "",
    height: view.height ?? null,
    educationLevel:
      (view.educationLevel as Schemas["BasicProfile"]["educationLevel"]) ?? null,
    relationshipStatus:
      (view.relationshipStatus as Schemas["BasicProfile"]["relationshipStatus"]) ?? null,
    hometownProvince: null,
    hometownCity: null,
    futureCity: null,
    futurePlanTags: [],
    photoGallery: view.photoGallery ?? [],
    halfBodyPhotoUrl: view.halfBodyPhotoUrl ?? null,
    personalVideoUrl: view.personalVideoUrl ?? null,
    profileBackgroundUrl: view.profileBackgroundUrl ?? null,
    profileCompletion: 0,
    verificationBadgeLevel: undefined,
    expectedPartner: view.expectedPartner ?? null,
  };
}
