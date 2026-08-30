/**
 * 个人主页统一 API。
 * 页面只调用 fetchMyProfile / fetchPublicProfile，消费 UserProfileDTO。
 * mock 模式下按 userId 从 9 人冻结角色表（mockFixtures.getRecommendations）匹配，
 * 保证"同名同脸"：任何 userId 都返回固定角色，而不是每次返回同一个占位人。
 */
import type { UserProfileDTO, UserProfilePost } from "../types/profile";
import { resolveMediaUrl } from "@/utils/media";
import { request } from "../services/http";
import { useMock } from "../stores/helpers/use-mock";
import { mockFixtures } from "../services/mocks/fixtures";
import type { RecommendedPerson } from "../services/generated/api-types-supplement";
import { IMAGE_PATHS } from "../config/images";

const MOCK_ME: UserProfileDTO = {
  id: 4001,
  basic: {
    name: "林晓",
    avatar: resolveMediaUrl("/static/assets/images/avatars/avatar-1.jpg"),
    age: 22,
    location: "北京 · 北京大学",
    gender: "female",
  },
  identity: { verified: true, student: true },
  intro: {
    bio: "热爱生活，喜欢图书馆的下午和操场晚风。想认识有趣的灵魂。",
    tags: ["摄影", "旅行", "音乐", "阅读", "美食"],
  },
  relationship: { goal: "认真恋爱", expectation: ["有趣", "真诚", "爱旅行"] },
  media: {
    cover: "/static/assets/images/people/person-01.png",
    photos: ["/static/assets/images/people/person-01.png"],
    videos: [],
  },
  socialProof: { followingCount: 128, followersCount: 96, likesCount: 356, matchCount: 42 },
  relation: { liked: false, matched: false, commonInterests: [] },
  posts: [],
};

/** 兜底公共主页：person-02 夏言。 */
const MOCK_PUBLIC_FALLBACK: UserProfileDTO = {
  id: 4002,
  basic: {
    name: "夏言",
    avatar: resolveMediaUrl("/static/assets/images/avatars/avatar-2.jpg"),
    age: 24,
    location: "北京 · 清华大学",
    gender: "male",
  },
  identity: { verified: true, student: true },
  intro: {
    bio: "更喜欢从音乐话题切入，再配一段短距离校园散步。",
    tags: ["音乐", "建筑", "探店"],
  },
  relationship: { goal: "慢慢了解", expectation: ["真诚", "有边界感"] },
  media: {
    cover: IMAGE_PATHS.ACTIVITIES.ACTIVITY_2,
    photos: [
      IMAGE_PATHS.ACTIVITIES.ACTIVITY_2,
      IMAGE_PATHS.PRODUCTS.FOOD_1,
      IMAGE_PATHS.POSTS.CAMPUS_LIBRARY,
      IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
    ],
    videos: [],
  },
  socialProof: { followingCount: 96, followersCount: 64, likesCount: 256, matchCount: 8 },
  relation: { liked: false, matched: false, commonInterests: ["音乐", "美食", "电影"] },
  posts: [
    {
      id: "p4002-fb-1",
      content: "发现一家藏在巷子里的宝藏小店，强烈推荐！",
      images: [resolveMediaUrl("/static/assets/images/covers/circle-food.png")],
      likes: 89,
      comments: 21,
      createdAt: "2026-07-21T10:00:00Z",
    },
  ],
  distanceText: "2.3km",
  online: true,
};

function toPostView(post: NonNullable<RecommendedPerson["recentPosts"]>[number]): UserProfilePost {
  return {
    id: String(post.id),
    content: post.content,
    images: post.images ?? [],
    likes: Number(post.likes ?? 0),
    comments: Number(post.comments ?? 0),
    createdAt: post.createdAt ?? new Date().toISOString(),
  };
}

/** 根据当前用户与目标用户的兴趣交集推导共同点（最多 3 个），附副标题。 */
function deriveCommonInterests(myTags: string[], targetTags: string[]): string[] {
  if (!myTags.length || !targetTags.length) return [];
  const set = new Set(targetTags);
  const common = myTags.filter((t) => set.has(t)).slice(0, 3);
  const subtitleFallback: Record<string, string> = {
    "旅行": "去过12个国家",
    "音乐": "听网易云音乐",
    "猫咪": "家里有2只猫",
    "摄影": "爱用手机拍照",
    "电影": "看过200+部电影",
    "美食": "爱吃火锅和日料",
    "阅读": "周读一本书",
    "运动": "每周跑步3次",
  };
  return common.map((tag) => {
    const sub = subtitleFallback[tag] || "";
    return sub ? tag + "/" + sub : tag;
  });
}

/** RecommendedPerson → UserProfileDTO。 */
function personToProfile(person: RecommendedPerson): UserProfileDTO {
  const myTags: string[] = MOCK_ME.intro.tags;
  const targetTags = person.tags ?? [];
  const commonInterests = deriveCommonInterests(myTags, targetTags);

  let photos = person.photoGallery && person.photoGallery.length
    ? person.photoGallery
    : ([person.halfBodyPhotoUrl, person.profileBackgroundUrl].filter(Boolean) as string[]);
  if (photos.length < 4) {
    const fallback = [
      IMAGE_PATHS.ACTIVITIES.ACTIVITY_2,
      IMAGE_PATHS.POSTS.CAMPUS_LIBRARY,
      IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
      IMAGE_PATHS.PRODUCTS.FOOD_1,
    ];
    photos = [...photos, ...fallback.filter((p) => !photos.includes(p))].slice(0, 4);
  }

  return {
    id: Number(person.id),
    basic: {
      name: person.name ?? "",
      avatar: person.avatarUrl || "",
      age: person.age ?? null,
      location: person.campusName ?? "",
      gender: (person as { gender?: string }).gender,
    },
    identity: { verified: true, student: true },
    intro: { bio: person.bio ?? "", tags: targetTags },
    relationship: { goal: "慢慢了解", expectation: [] },
    media: {
      cover: person.profileBackgroundUrl || person.halfBodyPhotoUrl || photos[0] || "",
      photos,
      videos: [],
    },
    socialProof: { followingCount: 48, followersCount: 32, likesCount: 86, matchCount: 5 },
    relation: { liked: false, matched: false, commonInterests },
    posts: (person.recentPosts ?? []).map(toPostView),
    distanceText: person.distanceText || "2.3km",
    online: true,
  };
}

export async function fetchMyProfile(): Promise<UserProfileDTO> {
  if (useMock()) {
    return { ...MOCK_ME, media: { ...MOCK_ME.media, photos: [...MOCK_ME.media.photos] } };
  }
  return request<UserProfileDTO>({ url: "/profile/me" });
}

export async function fetchPublicProfile(userId: string | number): Promise<UserProfileDTO> {
  if (useMock()) {
    const people = mockFixtures.getRecommendations({});
    const person = people.find((p) => String(p.id) === String(userId));
    return person
      ? personToProfile(person)
      : { ...MOCK_PUBLIC_FALLBACK, id: Number(userId) || MOCK_PUBLIC_FALLBACK.id };
  }
  return request<UserProfileDTO>({ url: "/profile/" + encodeURIComponent(String(userId)) });
}
