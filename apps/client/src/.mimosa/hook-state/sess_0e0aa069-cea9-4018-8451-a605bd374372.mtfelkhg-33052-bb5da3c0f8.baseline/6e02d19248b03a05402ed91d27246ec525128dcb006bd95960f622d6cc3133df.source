/**
 * 外链图片本地化兜底工具（2026-08-08）。
 *
 * 背景：数据库 seed 数据中部分虚拟用户使用 pexels.com 外链图片（半身照/照片墙/
 * 主页背景），而微信小程序端无法加载该域名（网络层失败，SafeImage 反复重试后
 * 降级到默认头像）。为了在模拟器/真机上稳定展示，这里把 pexels 外链**确定性**地
 * 映射到本地包内素材（同一 pexels photo id 始终映射到同一张本地图）。
 *
 * 使用方式：
 * - SafeImage 的 src 已统一经本工具处理（src/utils/image-local.ts）
 * - 原生 <image> 场景（个人主页背景图/照片墙）调用 toLocalImage(url) 后使用
 *
 * 说明：本映射仅兜底 mock/演示数据中的外链；真实用户上传的图片走鉴权代理
 * （/uploads/** → /api/v1/media/**），不受影响。
 */

import { IMAGE_PATHS } from "../config/images";

// R4-00245：素材路径统一由 IMAGE_PATHS（config/images.ts 单一入口）生成，
// 不再散落硬编码 /static/... 字符串（images.ts 注释明确「禁止硬编码 /static/」）

/** 从已知常量推导素材目录前缀（如 AVATAR_1 = ".../avatar-1.jpg" → ".../avatar-"） */
function deriveBase(sample: string, suffix: string): string {
  return sample.endsWith(suffix) ? sample.slice(0, -suffix.length) : "";
}

/** 本地人像素材（头像/半身照/照片墙通用，62 张，按 id 轮换） */
const LOCAL_AVATARS = (() => {
  const base = deriveBase(IMAGE_PATHS.AVATARS.AVATAR_1, "avatar-1.jpg");
  if (!base) return [IMAGE_PATHS.AVATARS.AVATAR_1];
  return Array.from({ length: 62 }, (_, i) => `${base}avatar-${i + 1}.jpg`);
})();

/** 本地背景素材（主页封面，campus 系列 + 海报，取自 IMAGE_PATHS.GENERATED） */
const LOCAL_BACKGROUNDS: readonly string[] = [
  IMAGE_PATHS.GENERATED.CAMPUS_GATE,
  IMAGE_PATHS.GENERATED.CAMPUS_LAKE,
  IMAGE_PATHS.GENERATED.CAMPUS_LIBRARY,
  IMAGE_PATHS.GENERATED.CAMPUS_NIGHT,
  IMAGE_PATHS.GENERATED.CAMPUS_PLAYGROUND,
  IMAGE_PATHS.GENERATED.CAMPUS_CAFETERIA,
  IMAGE_PATHS.GENERATED.CAMPUS_CLASSROOM,
  IMAGE_PATHS.GENERATED.CAMPUS_RAIN,
  IMAGE_PATHS.GENERATED.HOME_POSTER,
];

/** 本地动态配图素材（帖子图片，取自 IMAGE_PATHS.POSTS） */
const LOCAL_POSTS: readonly string[] = [
  IMAGE_PATHS.POSTS.POST_1,
  IMAGE_PATHS.POSTS.POST_2,
  IMAGE_PATHS.POSTS.POST_3,
  IMAGE_PATHS.POSTS.POST_4,
  IMAGE_PATHS.POSTS.POST_5,
  IMAGE_PATHS.POSTS.POST_6,
  IMAGE_PATHS.POSTS.POST_7,
  IMAGE_PATHS.POSTS.POST_8,
];

/** pexels 图片 URL 前缀（区分大小写不敏感） */
const PEXELS_HOST_RE = /^https?:\/\/images\.pexels\.com\//i;

/** 从 pexels URL 提取 photo id（如 photos/220508/... → 220508） */
function extractPexelsId(url: string): number {
  const match = url.match(/photos\/(\d+)/);
  return match ? Number(match[1]) : 0;
}

/**
 * 把不可加载的 pexels 外链映射到本地包内图片；其余 URL 原样返回。
 *
 * 分类规则（与数据库 seed 口径一致）：
 * - 背景图（URL 含 w=800，对应 profileBackgroundUrl）→ campus 背景素材
 * - 动态配图（URL 含 w=600，对应帖子/活动图）→ posts 素材
 * - 其余（w=400 头像/半身照/照片墙）→ avatar 素材轮换
 *
 * @param url 原始图片 URL
 * @returns 可加载的本地图片路径（非 pexels URL 原样返回）
 */
export function toLocalImage(url: string | null | undefined): string {
  if (!url || !PEXELS_HOST_RE.test(url)) {
    return url ?? "";
  }
  const id = extractPexelsId(url);
  // 严格模式 noUncheckedIndexedAccess：数组索引访问可能返回 undefined，此处统一兜底
  const pick = <T>(list: readonly T[], fallback: T): T => list[id % list.length] ?? fallback;
  if (/w=800/i.test(url)) {
    return pick(LOCAL_BACKGROUNDS, LOCAL_BACKGROUNDS[0] ?? "/static/default-avatar.png");
  }
  if (/w=600/i.test(url)) {
    return pick(LOCAL_POSTS, LOCAL_POSTS[0] ?? "/static/default-avatar.png");
  }
  return pick(LOCAL_AVATARS, LOCAL_AVATARS[0] ?? "/static/default-avatar.png");
}


/**
 * Mock 演示媒体本地化映射（2026-08-23）。
 *
 * 背景：后端 mock 种子数据的媒体路径形如 {@code /uploads/mock/avatar-linan.jpg}，
 * 经 resolveMediaUrl 会重写为 http API 代理地址；微信 <image> 要求 HTTPS，HTTP 会被
 * 拦截（log: "不再支持 HTTP 协议"），导致图片不渲染、布局被撑大。
 * 因此把 {@code /uploads/mock/*} 确定性映射到包内 static 资源（与 MockMediaPaths 对齐）。
 *
 * 说明：仅映射图片；intro.mp4（视频）无本地等价，不映射，保留原行为由 SafeImage 兜底。
 */

/** mock 媒体路径前缀（与后端 MockMediaPaths.PREFIX 对齐） */
const MOCK_MEDIA_PREFIX = "/uploads/mock/";

/** mock 文件名 → 包内静态资源（复用现有素材目录，不新增外部素材） */
const MOCK_MEDIA_LOCAL_MAP: Record<string, string> = {
  // 头像（avatar-*）
  "avatar-linan.jpg":   IMAGE_PATHS.AVATARS.AVATAR_1,
  "avatar-zhoumu.jpg":  IMAGE_PATHS.AVATARS.AVATAR_2,
  "avatar-xunuo.jpg":   IMAGE_PATHS.AVATARS.AVATAR_3,
  "avatar-suli.jpg":    IMAGE_PATHS.AVATARS.AVATAR_4,
  "avatar-xiaye.jpg":   IMAGE_PATHS.AVATARS.AVATAR_5,
  "avatar-xingye.jpg":  IMAGE_PATHS.AVATARS.AVATAR_6,
  // 帖子/话题图（post-* / topic-*）
  "post-sunrise-1.jpg": IMAGE_PATHS.POSTS.POST_1,
  "post-sunrise-2.jpg": IMAGE_PATHS.POSTS.POST_2,
  "post-coffee-1.jpg":  IMAGE_PATHS.POSTS.POST_3,
  "post-movie-1.jpg":   IMAGE_PATHS.POSTS.POST_4,
  "topic-photo-1.jpg":  IMAGE_PATHS.CIRCLE_COVERS.PHOTO,
  "topic-food-1.jpg":   IMAGE_PATHS.CIRCLE_COVERS.FOOD,
  "topic-food-2.jpg":   IMAGE_PATHS.CIRCLE_COVERS.FOOD,
  // 个人资料/认证（photo-* / half / bg / student-card）
  "photo-1.jpg":        IMAGE_PATHS.PEOPLE.CARD_1,
  "half.jpg":           IMAGE_PATHS.PEOPLE.CARD_1,
  "bg.jpg":             IMAGE_PATHS.GENERATED.HOME_POSTER,
  "student-card-1.jpg": IMAGE_PATHS.GENERATED.CAMPUS_LIBRARY,
};

/**
 * 把 {@code /uploads/mock/<file>} 映射到包内静态资源；非 mock 媒体原样返回。
 *
 * @param path 原始媒体路径
 * @returns 本地包内路径，或原样返回
 */
export function toLocalMockMedia(path: string): string {
  if (!path || !path.startsWith(MOCK_MEDIA_PREFIX)) {
    return path;
  }
  const file = path.substring(MOCK_MEDIA_PREFIX.length);
  const local = MOCK_MEDIA_LOCAL_MAP[file];
  return local ?? path;
}
