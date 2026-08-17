/**
 * TabBar 配置 - 唯一真相源 (Single Source of Truth)
 *
 * 本文件是应用 TabBar 配置的唯一权威来源。
 * 以下文件中的 TabBar 配置必须与此文件保持一致：
 *   - src/pages.json (uni-app 原生配置，JSON 格式，需手动同步)
 *   - src/custom-tab-bar/index.js (微信小程序自定义 TabBar，JS 文件，需手动同步)
 *   - src/components/layout/TabBar.vue (H5 端 TabBar 组件，从此文件导入)
 *
 * 修改 Tab 配置时，请先修改此文件，再同步更新上述文件。
 *
 * 纯匹配版（2026-08-14）：五 Tab 顺序 发现 / 附近 / 匹配 / 消息 / 我的，
 * 「匹配」为中央核心入口（prominent=true，绿色圆形浮岛 + 白色爱心）。
 */

import { IMAGE_PATHS } from './images';

export type AppTabId = "home" | "nearby" | "discover" | "chat" | "profile";

export interface AppTab {
  id: AppTabId;
  label: string;
  path: string;
  iconPath: string;
  selectedIconPath: string;
  prominent?: boolean;
}

/**
 * Tab 顺序（寻觅 v3）：首页、附近、寻觅、消息、我的
 * 注意：APP 启动默认页仍是「寻觅」（pages.json 中 pages 数组第一项为
 * pages/discover/index），tab 顺序与启动页互不影响。
 */
export const appTabs: AppTab[] = [
  {
    id: "home",
    label: "首页",
    path: "/pages/home/index",
    iconPath: IMAGE_PATHS.ICONS_TABBAR.HOME_DEFAULT,
    selectedIconPath: IMAGE_PATHS.ICONS_TABBAR.HOME_ACTIVE,
  },
  {
    id: "nearby",
    label: "附近",
    path: "/pages/nearby/index",
    iconPath: IMAGE_PATHS.ICONS_TABBAR.NEARBY_DEFAULT,
    selectedIconPath: IMAGE_PATHS.ICONS_TABBAR.NEARBY_ACTIVE,
  },
  {
    id: "discover",
    label: "寻觅",
    path: "/pages/discover/index",
    iconPath: IMAGE_PATHS.ICONS_TABBAR.MATCH_HEART,
    selectedIconPath: IMAGE_PATHS.ICONS_TABBAR.MATCH_HEART_ACTIVE,
    // 中央核心入口：绿色圆形浮岛 + 白色爱心（custom-tab-bar/index.js 同步 prominent）
    prominent: true,
  },
  {
    id: "chat",
    label: "消息",
    path: "/pages/messages/index",
    iconPath: IMAGE_PATHS.ICONS_TABBAR.CHAT_DEFAULT,
    selectedIconPath: IMAGE_PATHS.ICONS_TABBAR.CHAT_ACTIVE,
  },
  {
    id: "profile",
    label: "我的",
    path: "/pages/profile/index",
    iconPath: IMAGE_PATHS.ICONS_TABBAR.PROFILE_DEFAULT,
    selectedIconPath: IMAGE_PATHS.ICONS_TABBAR.PROFILE_ACTIVE,
  },
];