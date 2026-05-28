export type AppTabId = "home" | "circle" | "chat" | "shop" | "campus" | "profile";

export interface AppTab {
  id: AppTabId;
  label: string;
  path: string;
  iconPath: string;
  activeIconPath: string;
  prominent?: boolean;
}

export const appTabs: AppTab[] = [
  {
    id: "home",
    label: "首页",
    path: "/pages/home/index",
    iconPath: "static/assets/icons/home.png",
    activeIconPath: "static/assets/icons/home-active.png",
  },
  {
    id: "circle",
    label: "圈子",
    path: "/pages/circle/index",
    iconPath: "static/assets/icons/circle.png",
    activeIconPath: "static/assets/icons/circle-active.png",
  },
  {
    id: "chat",
    label: "聊天",
    path: "/pages/chat/index",
    iconPath: "static/assets/icons/chat.png",
    activeIconPath: "static/assets/icons/chat-active.png",
  },
  {
    id: "shop",
    label: "逛逛",
    path: "/pages/shop/index",
    iconPath: "static/assets/icons/shop.png",
    activeIconPath: "static/assets/icons/shop-active.png",
  },
  {
    id: "campus",
    label: "校园",
    path: "/pages/campus/index",
    iconPath: "static/assets/icons/village.png",
    activeIconPath: "static/assets/icons/village-active.png",
  },
  {
    id: "profile",
    label: "我的",
    path: "/pages/profile/index",
    iconPath: "static/assets/icons/profile.png",
    activeIconPath: "static/assets/icons/profile-active.png",
  },
];
