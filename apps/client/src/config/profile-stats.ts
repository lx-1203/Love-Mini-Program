/**
 * 个人主页互动四宫格共享常量（R16-2，2026-11-05）。
 *
 * 消费方：components/profile/mine/MyStats.vue（已登录态）与
 * components/profile/NotLoggedProfile.vue（未登录态）——两页此前各维护一份
 * 结构同构的四宫格常量（key/label/iconSrc/color），R14 时以 TODO(跨车道) 登记，
 * 本模块为合并真相源：新增/调整列只改这一处，两页自动同口径。
 *
 * label 走 labelKey（i18n 词条键），消费方以 t(item.labelKey) 渲染——文案随词条，
 * key 供已登录态 statValue() 取数与埋点，不做展示。
 */

import { IMAGE_PATHS } from "./images";

export interface ProfileStatItem {
  /** 列键（已登录态取数键；未登录态仅作 :key） */
  key: string;
  /** i18n 词条键（消费方 t(labelKey) 渲染文案） */
  labelKey: string;
  /** 图标（config/images.ts 登记的实心彩色字形） */
  iconSrc: string;
  /** 品牌色（十六进制字面量；图标底衬由消费方按 token/alpha 派生） */
  color: string;
}

/** 互动四宫格：我喜欢 / 喜欢我的 / 我赞 / 访客（2026-10-26 理想图 P5#4 口径） */
export const PROFILE_STATS: ProfileStatItem[] = [
  { key: "iLike", labelKey: "profile.statILike", iconSrc: IMAGE_PATHS.ICONS_COMMON.HEART_FILL_PURPLE_SVG, color: "#A29BFE" },
  { key: "likedMe", labelKey: "profile.likedMe", iconSrc: IMAGE_PATHS.ICONS_COMMON.USERS_FILL_PINK_SVG, color: "#FF6B81" },
  { key: "praised", labelKey: "profile.notLogged.statMyLikes", iconSrc: IMAGE_PATHS.ICONS_COMMON.THUMBS_UP_FILL_ORANGE_SVG, color: "#FF9F43" },
  { key: "visitor", labelKey: "profile.heartValueVisitor", iconSrc: IMAGE_PATHS.ICONS_COMMON.EYE_FILL_BLUE_SVG, color: "#4D8DFF" },
];
