export type AppTabId = "home" | "discussions" | "match" | "chat" | "profile";

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
    iconPath: "/assets/icons/home.svg",
    activeIconPath: "/assets/icons/home-active.svg",
  },
  {
    id: "discussions",
    label: "讨论圈",
    path: "/pages/discussions/index",
    iconPath: "/assets/icons/discussion.svg",
    activeIconPath: "/assets/icons/discussion-active.svg",
  },
  {
    id: "match",
    label: "匹配",
    path: "/pages/match/index",
    iconPath: "/assets/icons/match.svg",
    activeIconPath: "/assets/icons/match-active.svg",
    prominent: true,
  },
  {
    id: "chat",
    label: "聊天",
    path: "/pages/chat/index",
    iconPath: "/assets/icons/chat.svg",
    activeIconPath: "/assets/icons/chat-active.svg",
  },
  {
    id: "profile",
    label: "我的",
    path: "/pages/profile/index",
    iconPath: "/assets/icons/profile.svg",
    activeIconPath: "/assets/icons/profile-active.svg",
  },
];
