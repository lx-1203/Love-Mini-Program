export type AppTabId = "home" | "village" | "discover" | "chat" | "profile" | "messages" | "likes";

export interface AppTab {
  id: AppTabId;
  label: string;
  path: string;
  iconPath: string;
  selectedIconPath: string;
  prominent?: boolean;
}

export const appTabs: AppTab[] = [
  {
    id: "home",
    label: "首页",
    path: "/pages/home/index",
    iconPath: "static/assets/icons/tabbar/home-default.png",
    selectedIconPath: "static/assets/icons/tabbar/home-active.png",
  },
  {
    id: "village",
    label: "圈子",
    path: "/pages/village/index",
    iconPath: "static/assets/icons/tabbar/village-default.png",
    selectedIconPath: "static/assets/icons/tabbar/village-active.png",
  },
  {
    id: "discover",
    label: "匹配",
    path: "/pages/discover/index",
    iconPath: "static/assets/icons/tabbar/discover-default.png",
    selectedIconPath: "static/assets/icons/tabbar/discover-active.png",
  },
  {
    id: "chat",
    label: "消息",
    path: "/pages/chat/index",
    iconPath: "static/assets/icons/tabbar/chat-default.png",
    selectedIconPath: "static/assets/icons/tabbar/chat-active.png",
  },
  {
    id: "profile",
    label: "我的",
    path: "/pages/profile/index",
    iconPath: "static/assets/icons/tabbar/profile-default.png",
    selectedIconPath: "static/assets/icons/tabbar/profile-active.png",
  },
];
