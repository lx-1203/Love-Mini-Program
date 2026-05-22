export type AppTabId = "discover" | "likes" | "village" | "messages" | "profile";

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
    id: "discover",
    label: "寻觅",
    path: "/pages/discover/index",
    iconPath: "/assets/icons/discover.svg",
    activeIconPath: "/assets/icons/discover-active.svg",
  },
  {
    id: "likes",
    label: "喜欢",
    path: "/pages/likes/index",
    iconPath: "/assets/icons/likes.svg",
    activeIconPath: "/assets/icons/likes-active.svg",
  },
  {
    id: "village",
    label: "村口",
    path: "/pages/village/index",
    iconPath: "/assets/icons/village.svg",
    activeIconPath: "/assets/icons/village-active.svg",
    prominent: true,
  },
  {
    id: "messages",
    label: "消息",
    path: "/pages/messages/index",
    iconPath: "/assets/icons/messages.svg",
    activeIconPath: "/assets/icons/messages-active.svg",
  },
  {
    id: "profile",
    label: "我的",
    path: "/pages/profile/index",
    iconPath: "/assets/icons/profile.svg",
    activeIconPath: "/assets/icons/profile-active.svg",
  },
];
