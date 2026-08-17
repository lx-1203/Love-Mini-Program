/**
 * 个人主页统一 API。
 * 页面只调用 fetchMyProfile / fetchPublicProfile，消费 UserProfileDTO。
 * mock 模式下按 userId 从 9 人冻结角色表（mockFixtures.getRecommendations）匹配，
 * 保证“同名同脸”：任何 userId 都返回固定角色，而不是每次返回同一个占位人。
 */
import type { UserProfileDTO, UserProfilePost } from "../types/profile";
import { request } from "../services/http";
import { useMock } from "../stores/helpers/use-mock";
import { mockFixtures } from "../services/mocks/fixtures";
import type { RecommendedPerson } from "../services/generated/api-types-supplement";

const MOCK_ME: UserProfileDTO = {
  id: 4001,
  basic: {
    name: "林晓",
    avatar: "/static/assets/images/avatars/person-01-avatar.webp",
    age: 22,
    location: "北京 · 北京大学",
    gender: "female",
  },
  identity: {
    verified: true,
    student: true,
  },
  intro: {
    bio: "热爱生活，喜欢图书馆的下午和操场晚风。想认识有趣的灵魂。",
    tags: ["摄影", "旅行", "音乐", "阅读", "美食"],
  },
  relationship: {
    goal: "认真恋爱",
    expectation: ["有趣", "真诚", "爱旅行"],
  },
  media: {
    cover: "/static/assets/images/people/person-01.webp",
    photos: ["/static/assets/images/people/person-01.webp"],
    videos: [],
  },
  socialProof: {
    likedMeCount: 16,
    likesCount: 104,
    visitorCount: 32,
    matchCount: 3,
  },
  relation: {
    liked: false,
    matched: false,
    commonInterests: [],
  },
  posts: [],
};

/** 兜底公共主页：person-02 夏言（mock 找不到 userId 时使用，避免串用体验账号自身）。 */
const MOCK_PUBLIC_FALLBACK: UserProfileDTO = {
  id: 4002,
  basic: {
    name: "夏言",
    avatar: "/static/assets/images/avatars/person-02-avatar.webp",
    age: 24,
    location: "北京 · 清华大学",
    gender: "male",
  },
  identity: {
    verified: true,
    student: true,
  },
  intro: {
    bio: "更喜欢从音乐话题切入，再配一段短距离校园散步。",
    tags: ["音乐", "建筑", "探店"],
  },
  relationship: {
    goal: "慢慢了解",
    expectation: ["真诚", "有边界感"],
  },
  media: {
    cover: "/static/assets/images/people/person-02.webp",
    photos: ["/static/assets/images/people/person-02.webp"],
    videos: [],
  },
  socialProof: {
    likedMeCount: 28,
    likesCount: 76,
    visitorCount: 50,
    matchCount: 4,
  },
  relation: {
    liked: false,
    matched: false,
    commonInterests: [],
  },
  posts: [],
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

/** RecommendedPerson（mock 9 人表）→ UserProfileDTO，按 userId 精确匹配。 */
function personToProfile(person: RecommendedPerson): UserProfileDTO {
  const photos = person.photoGallery?.length
    ? person.photoGallery
    : [person.halfBodyPhotoUrl, person.profileBackgroundUrl].filter(Boolean) as string[];
  return {
    id: Number(person.id),
    basic: {
      name: person.name ?? "",
      avatar: person.avatarUrl || "",
      age: person.age ?? null,
      location: person.campusName ?? "",
      gender: (person as { gender?: string }).gender,
    },
    identity: {
      verified: true,
      student: true,
    },
    intro: {
      bio: person.bio ?? "",
      tags: person.tags ?? [],
    },
    relationship: {
      goal: "慢慢了解",
      expectation: [],
    },
    media: {
      cover: person.halfBodyPhotoUrl || person.profileBackgroundUrl || photos[0] || "",
      photos,
      videos: [],
    },
    socialProof: {
      likedMeCount: 0,
      likesCount: 0,
      visitorCount: 0,
      matchCount: 0,
    },
    relation: {
      liked: false,
      matched: false,
      commonInterests: [],
    },
    posts: (person.recentPosts ?? []).map(toPostView),
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
    return person ? personToProfile(person) : { ...MOCK_PUBLIC_FALLBACK, id: Number(userId) || MOCK_PUBLIC_FALLBACK.id };
  }
  return request<UserProfileDTO>({
    url: `/profile/${encodeURIComponent(String(userId))}`,
  });
}
