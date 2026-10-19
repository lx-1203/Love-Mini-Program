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
    cover: IMAGE_PATHS.PEOPLE.CARD_1,
    photos: [IMAGE_PATHS.PEOPLE.CARD_1],
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
  /* mock 舞台布景：后端无 distanceText / online 字段，真档恒为 undefined。
     口径与所需后端字段见本文件 personToProfile 末尾的同名两行注释。 */
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

/**
 * 「我们有 N 个共同点」两行卡的编码约定（parked.md 第 5 行 / R2b-L06-D20 的残留半边）。
 *
 * 后端契约：UserProfileDTO.Relation.commonInterests 是 `List<String>`
 * （apps/api/src/main/java/com/campuslove/api/profile/UserProfileDTO.java:27-34，
 * 生产方 UserProfileController.java:260 buildCommonInterests —— 产出「同校/同城/同龄」
 * 与共同兴趣词，**没有副标题位**）。理想图（他人显示主页.png）每枚卡是三行结构：
 * 圆形图标 + 粗体主标题 + 灰色副标题。图标已由消费端按词映射
 * （PublicCommon.vue:38 TAG_ICON_KEYS），副标题则只能靠本函数把 "标签/副标题" 拼进同一个
 * 字符串、再由 PublicCommon.vue:62 按 "/" 拆开。**这条编码保持原样，不改协议、不动消费端。**
 *
 * 它是权宜而非契约，代价要写清楚：斜杠成了保留字符，真实标签值里一旦出现 "/" 就会被误拆；
 * 且副标题无法独立国际化。要让理想图的两行结构成为真数据，后端需要补：
 *   Relation.commonPoints: List<CommonPoint>
 *     CommonPoint(String title, String subtitle, String icon)
 *       title    —— 共同点主名（"旅行"，或"同校"这类关系项）
 *       subtitle —— 该共同点对**双方**的事实描述（"去过 12 个国家"），必须由用户资料里
 *                    真实存在的字段派生（旅行国家数 / 音乐绑定 / 宠物数…），不得由客户端查表编造
 *       icon     —— 图标标识，补齐后 PublicCommon.vue 的 TAG_ICON_KEYS 映射表可整体退役
 * 字段到位后：本函数与消费端的 split 一起删除，改读 commonPoints。
 *
 * 下面 subtitleFallback 正是"按标签查表编造"的那一类，它**只在 mock 分支里被消费**：
 * 本文件所有产出点（MOCK_ME / MOCK_PUBLIC_FALLBACK / personToProfile）都挂在
 * fetchMyProfile 与 fetchPublicProfile 开头的 useMock() 判断之内。真档下后端不返回
 * 带 "/" 的条目 ⇒ 副标题位为空（PublicCommon.vue:68 `subtitlePart || ""`），不编数据。
 * 保留它的唯一作用：让 mock 长图能演出理想图的形态，不得移植进真档链路。
 */
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
    /* 末两行是 mock 舞台布景，不是数据：后端 UserProfileDTO 今天**没有** distanceText / online
       字段（UserProfileDTO.java:8-21 的 record 形参里没有），真档下这两个值恒为 undefined，
       PublicIdentity 的距离行/在线胶囊因此整块不渲染（R2b-L06-D12/D13 的根因即在此）。
       要让它成为真值：后端在 UserProfileDTO 上补 `String distanceText`（由查看者坐标算，
       口径同 /location/report 上报的那份坐标）与 `boolean online`（会话/心跳派生），
       前端 types/profile.ts:96-99 已按可空声明，无需再改类型。 */
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
