import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "../../i18n";

/**
 * 个人主页重构契约测试（2026-08-14）：
 * - Hero 区渲染（昵称 + 设置入口 + 主 CTA「编辑资料」）
 * - 双 Tab（资料 / 动态）切换
 * - 主页不再渲染 3 组功能菜单 / 退出登录 / 底部版本号
 */

vi.mock("@dcloudio/uni-app", () => ({
  onShow: vi.fn(),
  onUnload: vi.fn(),
  onShareAppMessage: vi.fn(() => ({})),
}));

vi.mock("../../services/api", () => ({
  clientApi: {
    logout: vi.fn(),
    getSession: vi.fn(),
    getAppConfig: vi.fn(),
    getBasicProfile: vi.fn(),
    getCampusProfile: vi.fn(),
    getScheduleProfile: vi.fn(),
    getLoginHero: vi.fn(),
    getRecommendations: vi.fn(),
    getLikesReceived: vi.fn(),
    getVisitors: vi.fn(),
    getMyPosts: vi.fn(),
    getAchievementStats: vi.fn(),
    getSocialProgress: vi.fn(),
    getWhisper: vi.fn(),
    unlockWhisper: vi.fn(),
  },
}));

vi.mock("../../services/http", () => ({
  getToken: vi.fn(() => ""),
  request: vi.fn(),
}));

vi.mock("../../utils/navigation", () => ({
  openAppPath: vi.fn(),
  switchTabWithQuery: vi.fn(),
  consumePendingTabQuery: vi.fn(),
}));

vi.mock("../../services/env", () => ({
  isDev: false,
}));

vi.mock("../../utils/haptic", () => ({
  lightHaptic: vi.fn(),
  successHaptic: vi.fn(),
}));

import { useSessionStore } from "../../stores/session";
import ProfileIndex from "../../pages/profile/index.vue";

/** 设置已登录 + 资料完善的会话，渲染完整主页（非 LockScreen 分支） */
function seedLoggedInSession() {
  const sessionStore = useSessionStore();
  sessionStore.userSession = {
    userId: "user-1001",
    loggedIn: true,
    loginMethod: "wechat",
    displayName: "测试用户",
    phoneBound: false,
    profileCompleted: true,
    campusVerified: true,
    scheduleCompleted: true,
    campusName: "北京大学",
    schoolId: "pku",
    schoolBound: true,
    featureFlags: { chat_ai_enabled: false },
  } as typeof sessionStore.userSession;
}

function mountProfile() {
  return mount(ProfileIndex, {
    global: {
      plugins: [i18n],
      stubs: {
        view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        image: { template: '<img class="mock-image" />', name: "uni-image" },
        input: { template: '<input class="mock-input" />', name: "uni-input" },
        button: { template: '<button class="mock-button"><slot /></button>', name: "uni-button" },
        scrollView: { template: '<view class="stub-scroll"><slot /></view>' },
        LockScreen: { template: '<view class="stub-lock" />' },
        CertBadgeRow: { template: '<view class="stub-cert-row" />' },
        CertDetailSheet: { template: '<view class="stub-cert-sheet" />' },
        SocialProgressIndicator: { template: '<view class="stub-social-progress" />' },
        SafeImage: { template: '<image class="stub-safe-image" />' },
        AvatarFrame: { template: '<view class="stub-avatar-frame" />' },
        MatchCountChip: { template: '<view class="stub-match-chip" />' },
        ProfileTabs: {
          template:
            '<view class="stub-tabs"><view class="stub-tab" @tap="$emit(\'change\', \'posts\')">posts</view></view>',
          name: "ProfileTabs",
          emits: ["change"],
        },
        VerificationBadge: { template: '<view class="stub-verification" />' },
        GlobalPublishFab: { template: '<view class="stub-fab" />' },
        SafeImageInner: true,
      },
    },
  });
}

describe("个人主页重构（2026-08-14）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    seedLoggedInSession();
  });

  it("Hero 区渲染 2.0 头部与「编辑资料」主 CTA", () => {
    const wrapper = mountProfile();
    expect(wrapper.find(".my-header").exists()).toBe(true);
    expect(wrapper.find(".my-header__edit").exists()).toBe(true);
  });

  it("主页不再渲染 3 组功能菜单 / 退出登录 / 底部版本号", () => {
    const wrapper = mountProfile();
    expect(wrapper.find(".menu-group").exists()).toBe(false);
    expect(wrapper.find(".logout-btn").exists()).toBe(false);
    expect(wrapper.find(".footer-version").exists()).toBe(false);
  });

  it("v3 重构后不渲染旧 ProfileTabs/legacy 内容，只渲染新 MyProfile", () => {
    const wrapper = mountProfile();
    expect(wrapper.find(".my-profile").exists()).toBe(true);
    expect(wrapper.find(".profile-tab-content").exists()).toBe(false);
    expect(wrapper.find(".stub-tabs").exists()).toBe(false);
  });
});
