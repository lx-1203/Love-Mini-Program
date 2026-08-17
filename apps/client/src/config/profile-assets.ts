/**
 * profile 视觉皮肤资产路径（按构建平台选择 svg/png）。
 *
 * 约定：SVG 只做视觉皮肤，不参与布局和内容；动态内容由 Vue 组件渲染。
 * mp-weixin 使用构建期生成的 PNG（见 scripts/profile-svg-to-png.mjs），
 * 其他平台使用 SVG 源文件。
 */
const IS_MP_WEIXIN =
  (globalThis as { process?: { env?: { UNI_PLATFORM?: string } } }).process?.env?.UNI_PLATFORM ===
  "mp-weixin";

const EXT = IS_MP_WEIXIN ? "png" : "svg";
const BASE = "/static/assets/profile";

/** 2.0 SVG 组件系统皮肤资产。 */
export const PROFILE_ASSET = {
  hero: `${BASE}/${EXT}/profile-hero.${EXT}`,
  card: `${BASE}/${EXT}/profile-card.${EXT}`,
  interest: `${BASE}/${EXT}/profile-interest.${EXT}`,
  action: `${BASE}/${EXT}/profile-action.${EXT}`,
  gallery: `${BASE}/${EXT}/profile-gallery.${EXT}`,
  bottomNav: `${BASE}/${EXT}/profile-bottom-nav.${EXT}`,
  /** 旧 1.0 资源别名，兼容已有组件逐步迁移 */
  heroGradient: `${BASE}/${EXT}/profile-hero.${EXT}`,
  identityCard: `${BASE}/${EXT}/profile-card.${EXT}`,
  interestCard: `${BASE}/${EXT}/profile-interest.${EXT}`,
  commonCard: `${BASE}/${EXT}/profile-card.${EXT}`,
  photoCard: `${BASE}/${EXT}/profile-gallery.${EXT}`,
  actionBar: `${BASE}/${EXT}/profile-action.${EXT}`,
  framePublic: `${BASE}/${EXT}/profile-hero.${EXT}`,
  frameMine: `${BASE}/${EXT}/profile-hero.${EXT}`,
  /** 3.0 主页 SVG 系统 */
  heroGradientV3: `${BASE}/${EXT}/hero-gradient-bg.${EXT}`,
  avatarRing: `${BASE}/${EXT}/avatar-ring.${EXT}`,
  onlineDot: `${BASE}/${EXT}/online-dot.${EXT}`,
  verified: `${BASE}/${EXT}/verified.${EXT}`,
  matchProgress: `${BASE}/${EXT}/match-progress.${EXT}`,
  commonInterestBg: `${BASE}/${EXT}/common-interest-bg.${EXT}`,
  photoPlaceholder: `${BASE}/${EXT}/photo-placeholder.${EXT}`,
  storyEmpty: `${BASE}/${EXT}/story-empty.${EXT}`,
  cardBase: `${BASE}/${EXT}/card-base.${EXT}`,
  interestIcons: {
    camera: `${BASE}/${EXT}/camera.${EXT}`,
    music: `${BASE}/${EXT}/music.${EXT}`,
    travel: `${BASE}/${EXT}/travel.${EXT}`,
  },
  relationshipIcons: {
    chat: `${BASE}/${EXT}/chat.${EXT}`,
    heart: `${BASE}/${EXT}/heart.${EXT}`,
  },
  voiceMicrophone: `${BASE}/${EXT}/microphone.${EXT}`,
} as const;
