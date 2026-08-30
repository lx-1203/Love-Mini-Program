import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "../../i18n";

/**
 * 卡片详情弹层改版（2026-08-14）DOM 契约测试：
 * - 动态列表 + 评论区（留言）整体移除（detail-moments / 评论输入条）
 * - 悄悄话面板保留并升级为多条文案
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

import CardDetailOverlay from "../../components/discover/CardDetailOverlay.vue";
import type { DiscoverCard } from "../../stores/discover/types";

function makeCard(overrides: Partial<DiscoverCard> = {}): DiscoverCard {
  return {
    id: "card-1",
    userId: "user-1",
    name: "小甜",
    avatar: "https://cdn.example.com/avatar.jpg",
    headline: "22岁 · 大四",
    bio: "喜欢摄影和电影",
    tags: ["摄影", "电影"],
    commonGround: "同城",
    availability: "在线",
    images: [],
    isSameSchool: true,
    commonCircleCount: 2,
    personality: ["温柔体贴"],
    mbti: "INFJ",
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

function mountDetail(card: DiscoverCard) {
  return mount(CardDetailOverlay, {
    props: {
      visible: true,
      card,
    },
    global: {
      plugins: [i18n],
      stubs: {
        SafeImage: { template: '<image class="stub-safe-image" />' },
        AvatarFrame: { template: '<view class="stub-avatar-frame" />' },
        VerificationBadge: { template: '<view class="stub-verification-badge" />' },
        WhisperUnlockSheet: { template: '<view class="stub-whisper-sheet" />' },
        scrollView: { template: '<view class="stub-scroll"><slot /></view>' },
        swiper: { template: '<view class="stub-swiper"><slot /></view>' },
        swiperItem: { template: '<view class="stub-swiper-item"><slot /></view>' },
      },
    },
  });
}

describe("卡片详情弹层改版 DOM 契约（2026-08-14）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("不再渲染动态列表与评论区（detail-moments / 评论输入条）", () => {
    const wrapper = mountDetail(makeCard());
    expect(wrapper.find(".detail-moments").exists()).toBe(false);
    expect(wrapper.find(".detail-moments__list").exists()).toBe(false);
    expect(wrapper.find(".detail-moment-item").exists()).toBe(false);
    expect(wrapper.find(".detail-moment-comment").exists()).toBe(false);
  });

  it("保留悄悄话面板", () => {
    const wrapper = mountDetail(makeCard());
    expect(wrapper.find(".detail-whisper").exists()).toBe(true);
  });

  it("已解锁时悄悄话面板渲染多条文案列表", async () => {
    const card = makeCard({ whisperSent: true, whispers: ["第一句", "第二句", "第三句"] });
    const wrapper = mountDetail(card);
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll(".detail-whisper__item").length).toBe(3);
  });
});
