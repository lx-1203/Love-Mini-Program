/**
 * profile V2 SVG 统一注册表（5.0 素材）。
 * 只用于装饰/图标/空态等视觉资产；用户数据与文字一律由 Vue 渲染。
 * mp-weixin 使用 PNG，其他平台使用 SVG。
 */
const IS_MP_WEIXIN =
  (globalThis as { process?: { env?: { UNI_PLATFORM?: string } } }).process?.env?.UNI_PLATFORM ===
  "mp-weixin";

const EXT = IS_MP_WEIXIN ? "png" : "svg";
const V2 = `/static/assets/profile/${EXT}/v2`;

export const profileSvg = {
  hero: {
    background: `${V2}/hero/hero-gradient-bg.${EXT}`,
  },
  avatar: {
    ring: `${V2}/avatar/avatar-ring.${EXT}`,
    online: `${V2}/avatar/online-dot.${EXT}`,
  },
  interest: {
    camera: `${V2}/interest/camera.${EXT}`,
    travel: `${V2}/interest/travel.${EXT}`,
    music: `${V2}/interest/music.${EXT}`,
    book: `${V2}/interest/book.${EXT}`,
    sport: `${V2}/interest/sport.${EXT}`,
  },
  bottom: {
    home: `${V2}/bottom/home.${EXT}`,
    nearby: `${V2}/bottom/nearby.${EXT}`,
    match: `${V2}/bottom/match.${EXT}`,
    message: `${V2}/bottom/message.${EXT}`,
    profile: `${V2}/bottom/profile.${EXT}`,
  },
  empty: {
    story: `${V2}/empty/story-empty.${EXT}`,
    photo: `${V2}/empty/photo-empty.${EXT}`,
  },
  story: {
    card: `${V2}/story/story-card.${EXT}`,
  },
  feed: {
    card: `${V2}/feed/feed-card.${EXT}`,
    imageGrid: `${V2}/feed/feed-image-grid.${EXT}`,
  },
  match: {
    progress: `${V2}/match/match-progress.${EXT}`,
  },
} as const;

export type ProfileSvgKey = keyof typeof profileSvg;
