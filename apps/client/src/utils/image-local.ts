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

/** 本地人像素材（头像/半身照/照片墙通用，62 张，按 id 轮换） */
const LOCAL_AVATARS = Array.from(
  { length: 62 },
  (_, i) => `/static/assets/images/avatars/avatar-${i + 1}.jpg`
);

/** 本地背景素材（主页封面，campus 系列 + 海报） */
const LOCAL_BACKGROUNDS = [
  "/static/generated/images/campus/campus-gate.jpg",
  "/static/generated/images/campus/campus-lake.jpg",
  "/static/generated/images/campus/campus-library.jpg",
  "/static/generated/images/campus/campus-night.jpg",
  "/static/generated/images/campus/campus-playground.jpg",
  "/static/generated/images/campus/campus-cafeteria.jpg",
  "/static/generated/images/campus/campus-classroom.jpg",
  "/static/generated/images/campus/campus-rain.jpg",
  "/static/generated/images/posters/home-poster.jpg",
];

/** 本地动态配图素材（帖子图片） */
const LOCAL_POSTS = [
  "/static/assets/images/posts/post-1.jpg",
  "/static/assets/images/posts/post-2.jpg",
  "/static/assets/images/posts/post-3.jpg",
  "/static/assets/images/posts/post-4.jpg",
  "/static/assets/images/posts/post-5.jpg",
  "/static/assets/images/posts/post-6.jpg",
  "/static/assets/images/posts/post-7.jpg",
  "/static/assets/images/posts/post-8.jpg",
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
