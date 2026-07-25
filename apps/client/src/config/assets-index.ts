/**
 * 生成素材资源索引
 *
 * 此文件由 scripts/media-gen/generate.ts 生成后更新。
 * 在 API 调用生成前，提供本地备用素材路径映射。
 *
 * 注意：CAMPUS_VIDEOS 原引用的 4 个视频文件（campus-spring.mp4 等）实际不存在于仓库中，
 * 已移除以避免运行时报错。如需启用视频背景，请先生成对应视频文件并补全路径。
 */

/** 校园场景图片 */
export const CAMPUS_IMAGES = {
  gate: "/static/generated/images/campus/campus-gate.jpg",
  library: "/static/generated/images/campus/campus-library.jpg",
  lake: "/static/generated/images/campus/campus-lake.jpg",
  playground: "/static/generated/images/campus/campus-playground.jpg",
  classroom: "/static/generated/images/campus/campus-classroom.jpg",
  cafeteria: "/static/generated/images/campus/campus-cafeteria.jpg",
  dorm: "/static/generated/images/campus/campus-dorm.jpg",
  club: "/static/generated/images/campus/campus-club.jpg",
  night: "/static/generated/images/campus/campus-night.jpg",
  rain: "/static/generated/images/campus/campus-rain.jpg",
} as const;

/** 活动图片 */
export const ACTIVITY_IMAGES = {
  musicFestival: "/static/generated/images/activities/music-festival.jpg",
  sportsDay: "/static/generated/images/activities/sports-day.jpg",
  artExhibition: "/static/generated/images/activities/art-exhibition.jpg",
} as const;

/** 默认海报（视频未加载时显示的封面） */
export const HOME_POSTER = "/static/assets/images/posters/login-poster.jpg";

/** 本次生成的登录页海报（无文字背景） */
export const GENERATED_LOGIN_POSTER = "/static/generated/images/posters/login-poster.jpg";

/** 本次生成的首页海报（无文字背景） */
export const GENERATED_HOME_POSTER = "/static/generated/images/posters/home-poster.jpg";

/** 默认头像 */
export const DEFAULT_AVATARS = {
  boy: "/static/generated/images/avatars/default-boy.jpg",
  girl: "/static/generated/images/avatars/default-girl.jpg",
} as const;

/** 空状态插画 */
export const EMPTY_ILLUSTRATIONS = {
  noData: "/static/generated/images/illustrations/empty-no-data.jpg",
} as const;
