/**
 * TabBar 配置 - 唯一真相源 (Single Source of Truth)
 *
 * 本文件是应用 TabBar 配置的唯一权威来源。
 * 以下文件中的 TabBar 配置必须与此文件保持一致：
 *   - src/pages.json (uni-app 原生配置，JSON 格式，需手动同步)
 *   - src/custom-tab-bar/index.js (微信小程序自定义 TabBar，JS 文件，需手动同步)
 *   - src/components/layout/TabBar.vue (H5 端 TabBar 组件，从此文件导入)
 *   - src/i18n/locales/zh-CN.ts 的 tabs.<id>（走 t() 的渲染读它；
 *     2026-10-29 英文版不上线，en-US.ts 已删除，唯一语言资源是 zh-CN.ts）
 *
 * 修改 Tab 配置时，请先修改此文件，再同步更新上述文件。
 *
 * 纯匹配版（2026-08-14）：五 Tab 顺序 首页 / 附近 / 匹配 / 消息 / 我的。
 * R2b-L01-D21 / R2b-L02-D05 / R2b-L03-D13：「匹配」不再做绿色圆形浮岛凸起，
 * 与其余四项等大平铺（44rpx 线性爱心 + 下方标签，同基线）。
 *
 * R6-L08（2026-10-19）四处单一来源实测：本文件 / custom-tab-bar/index.js / pages.json
 * 的 tabBar.list / i18n tabs.* 五枚 label 已逐字同值（首页/附近/匹配/消息/我的），
 * 「寻觅」仅剩页面标题（i18n discover.title）一处口径，属中央页页头而非 tab 标签。
 * 注：TabBar.vue 在 src 下唯一的 importer 是 components/layout/layout.stories.ts
 * （Storybook 载具，非 mp/H5 运行时）⇒ 改它不会上真机，运行时口径看 custom-tab-bar/。
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
 * Tab 顺序（寻觅 v3）：首页、附近、匹配、消息、我的
 * （第三项 id 仍为 discover、文案已由「寻觅」统一为「匹配」，见 R2b-L02-D17）
 * 注意：APP 启动默认页仍是第三项 discover（pages.json 中 pages 数组第一项为
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
    // R2b-L02-D17 / R2b-L03-D13：中央项标签统一为「匹配」（原「寻觅」）。
    // mp-weixin 运行时实际渲染的是 custom-tab-bar/index.js 的 label，本文件按单一真相源同步。
    label: "匹配",
    path: "/pages/discover/index",
    // R2b-L01-D21 / R2b-L02-D05：中央项平铺后改用描边爱心 default / active 两态
    // （match-heart.png 是为绿色圆盘底设计的 #E0E0E0 实心白心，白底上不可见）
    iconPath: IMAGE_PATHS.ICONS_TABBAR.DISCOVER_DEFAULT,
    selectedIconPath: IMAGE_PATHS.ICONS_TABBAR.DISCOVER_ACTIVE,
    // 凸起浮岛档已退役：五项等大同基线（custom-tab-bar/index.js 同步 prominent: false）
    prominent: false,
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