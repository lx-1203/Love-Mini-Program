import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "../../i18n";

/**
 * 匹配卡片纯匹配版（2026-08-14）DOM 契约测试：
 * - 匹配度粉色胶囊置底（♥ 80% 与你很合拍），>=85 显示「高匹配」
 * - 卡片内容区顺序：昵称行 → 学校/年级/距离 → 兴趣标签 → 简介 → 匹配度
 * - 无「同校」文案、无动态预览块、无基础资料/性格/期待画像（折叠进详情页）
 */

vi.mock("../../services/api", () => ({
  clientApi: {
    getWhisper: vi.fn(),
    unlockWhisper: vi.fn(),
  },
}));

vi.mock("../../utils/navigation", () => ({
  openAppPath: vi.fn(),
}));

vi.mock("../../services/env", () => ({
  isDev: false,
}));

import CardSwiper from "../../components/discover/CardSwiper.vue";
import type { DiscoverCard } from "../../stores/discover/types";

function makeCard(overrides: Partial<DiscoverCard> = {}): DiscoverCard {
  return {
    id: "card-1",
    userId: "user-1",
    name: "小甜",
    avatar: "https://cdn.example.com/avatar.jpg",
    headline: "22岁 · 大四",
    bio: "喜欢摄影和电影",
    tags: ["摄影", "电影", "旅行"],
    commonGround: "同城",
    availability: "在线",
    images: [],
    isSameSchool: true,
    commonCircleCount: 3,
    campusName: "北京大学",
    gradeLabel: "大三",
    distanceText: "3.8",
    personality: ["温柔体贴"],
    mbti: "INFJ",
    height: 165,
    occupation: "产品经理",
    incomeRange: "8k-15k",
    relationshipStatus: "never",
    expectedPartner: "希望遇到喜欢猫的人",
    recentPosts: [
      {
        id: "p1",
        content: "周末去扫街",
        images: [],
        likes: 8,
        comments: 2,
        isLiked: false,
        createdAt: "2026-08-01T12:00:00",
      },
    ],
    ...overrides,
  };
}

function mountSwiper(cards: DiscoverCard[]) {
  return mount(CardSwiper, {
    props: {
      cards,
      remainingCount: 10,
    },
    global: {
      plugins: [i18n],
      stubs: {
        SafeImage: { template: '<image class="stub-safe-image" />' },
        AvatarFrame: { template: '<view class="stub-avatar-frame" />' },
        VerificationBadge: { template: '<view class="stub-verification-badge" />' },
        CardDetailOverlay: { template: '<view class="stub-card-detail" />' },
        LongPressMenu: { template: '<view class="stub-long-press" />' },
        WhisperUnlockSheet: { template: '<view class="stub-whisper-sheet" />' },
        swiper: { template: '<view class="stub-swiper"><slot /></view>' },
        swiperItem: { template: '<view class="stub-swiper-item"><slot /></view>' },
      },
    },
  });
}

describe("匹配卡片纯匹配版 DOM 契约（2026-08-14）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("匹配度粉色胶囊置底且 >=85 显示「高匹配」", () => {
    const wrapper = mountSwiper([makeCard({ commonCircleCount: 3 })]);
    const badge = wrapper.find(".card__match-badge");
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain("♥");
    expect(badge.text()).toContain("95%"); // 80 + 3*5 = 95
    expect(badge.text()).toContain("高匹配");

    const content = wrapper.find(".card__content");
    const children = Array.from(content.element.children);
    expect(children[children.length - 1].classList.contains("card__match-badge")).toBe(true);
  });

  it("匹配度 <85 时粉圈小字为「匹配」", () => {
    const wrapper = mountSwiper([makeCard({ commonCircleCount: 0 })]);
    // 80 + 0*5 = 80 < 85
    expect(wrapper.find(".card__match-badge").text()).toContain("80%");
    expect(wrapper.find(".card__match-badge").text()).toContain("匹配");
    expect(wrapper.find(".card__match-badge").text()).not.toContain("高匹配");
  });

  it("内容区顺序：昵称 → 学校/年级/距离 → 兴趣标签 → 简介 → 匹配度", () => {
    const wrapper = mountSwiper([makeCard()]);
    const content = wrapper.find(".card__content");
    const order = Array.from(content.element.children).map(
      (el) => el.className
    );
    const expectOrder = [
      "card__name-row",
      "card__meta-row",
      "card__tags",
      "card__bio-block",
      "card__match-badge",
    ];
    for (const cls of expectOrder) {
      const idx = order.findIndex((c) => c.includes(cls));
      expect(idx, `${cls} 应存在于卡片内容区`).toBeGreaterThanOrEqual(0);
      order.splice(idx, 1);
    }
  });

  it("学校 · 年级渲染（campusName + gradeLabel）", () => {
    const wrapper = mountSwiper([makeCard()]);
    expect(wrapper.find(".card__content").text()).toContain("北京大学 · 大三");
  });

  it("卡片不再渲染「同校」文案", () => {
    const wrapper = mountSwiper([makeCard({ isSameSchool: true, distanceText: "1.2" })]);
    expect(wrapper.find(".card__content").text()).not.toContain("同校");
  });

  it("卡片不再渲染动态预览块（latestPostSection）", () => {
    const wrapper = mountSwiper([makeCard()]);
    expect(wrapper.find(".card__post-preview").exists()).toBe(false);
    expect(wrapper.find(".card__content").text()).not.toContain("TA的动态");
  });

  it("基础资料/性格/期待画像折叠进详情页（卡片面不渲染）", () => {
    const wrapper = mountSwiper([makeCard()]);
    const text = wrapper.find(".card__content").text();
    expect(text).not.toContain("产品经理");
    expect(text).not.toContain("INFJ");
    expect(text).not.toContain("希望遇到喜欢猫的人");
  });
});