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
 * 修复（R4-00209）：新增一致性校验脚本 `pnpm --filter client check:tabbar`
 * （scripts/check-tabbar-consistency.mjs），CI / 本地提交前运行即可自动比对
 * 本文件与 pages.json、custom-tab-bar/index.js 的顺序/路径/图标是否漂移，
 * 无需再完全依赖人工同步。
 */

import { IMAGE_PATHS } from './images';

export type AppTabId = "home" | "village" | "discover" | "chat" | "profile" | "messages" | "likes";

export interface AppTab {
  id: AppTabId;
  label: string;
  path: string;
  iconPath: string;
  selectedIconPath: string;
  prominent?: boolean;
}

/**
 * Tab 顺序（设计需求）：首页、匹配、圈子、消息、我的
 * 注意：APP 启动默认页仍是「匹配」（pages.json 中 pages 数组第一项为
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
    id: "discover",
    label: "匹配",
    path: "/pages/discover/index",
    iconPath: IMAGE_PATHS.ICONS_TABBAR.DISCOVER_DEFAULT,
    selectedIconPath: IMAGE_PATHS.ICONS_TABBAR.DISCOVER_ACTIVE,
    // 与 custom-tab-bar/index.js 保持一致：不使用凸起样式
    prominent: false,
  },
  {
    id: "village",
    label: "圈子",
    path: "/pages/village/index",
    iconPath: IMAGE_PATHS.ICONS_TABBAR.VILLAGE_DEFAULT,
    selectedIconPath: IMAGE_PATHS.ICONS_TABBAR.VILLAGE_ACTIVE,
  },
  {
    id: "chat",
    label: "消息",
    // 2026-08-07 消息页对标微信重构：tabBar 切换到新版消息列表页（搜索/快捷入口/左滑/长按/官方号角标）
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
