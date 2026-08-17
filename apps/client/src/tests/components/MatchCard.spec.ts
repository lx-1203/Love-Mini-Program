import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

(globalThis as any).uni = {};

import MatchCard from "../../components/match/MatchCard.vue";
import type { MatchCardUser } from "../../types/match";

const stubs = {
  view: { template: '<div class="mock-view"><slot /></div>' },
  text: { template: '<span class="mock-text"><slot /></span>' },
  image: { template: '<img class="mock-image" />' },
  SafeImage: { template: '<div class="mock-safe-image"><slot /></div>' },
  SwipeContainer: { template: '<div class="mock-swipe-container"><slot /></div>' },
};

function makeUser(overrides: Partial<MatchCardUser> = {}): MatchCardUser {
  return {
    id: "card-1",
    userId: "user-1",
    name: "林晓",
    age: 25,
    avatar: "/static/assets/images/avatars/person-01-avatar.webp",
    photo: "/static/assets/images/people/person-01.webp",
    onlineStatus: "online",
    school: "北京大学",
    occupation: "产品经理",
    distanceText: "2.3km",
    activeStatusText: "在线",
    tags: ["旅行", "电影", "音乐", "猫咪"],
    headline: "喜欢探索世界，也喜欢深夜的聊天",
    matchScore: 92,
    commonGround: "都喜欢旅行",
    verificationBadgeLevel: "school",
    ...overrides,
  };
}

function mountCard(user = makeUser()) {
  return mount(MatchCard, {
    props: { user },
    global: { plugins: [i18n], stubs },
  });
}

describe("MatchCard", () => {
  it("渲染照片卡、在线胶囊与匹配度胶囊", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".match-card").exists()).toBe(true);
    expect(wrapper.find(".match-card__online").exists()).toBe(true);
    expect(wrapper.find(".match-card__score-value").text()).toContain("92%");
    expect(wrapper.find(".match-card__score-label").text()).toContain("匹配度");
  });

  it("渲染昵称年龄、学校职业、距离与在线", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".match-info__name").text()).toContain("林晓");
    expect(wrapper.find(".match-info__age").text()).toContain("25");
    expect(wrapper.find(".match-info__meta").text()).toContain("北京大学 · 产品经理");
    expect(wrapper.find(".match-info__distance").text()).toContain("2.3km · 在线");
  });

  it("渲染兴趣标签与一句话介绍", () => {
    const wrapper = mountCard();
    expect(wrapper.findAll(".match-info__tag")).toHaveLength(4);
    expect(wrapper.find(".match-info__intro-text").text()).toContain("喜欢探索世界");
  });

  it("不渲染 MBTI/性格/动态等详情内容", () => {
    const wrapper = mountCard();
    const text = wrapper.text();
    expect(text).not.toContain("INFJ");
    expect(text).not.toContain("性格");
    expect(text).not.toContain("动态");
  });

  it("支持 photo slot 覆盖", () => {
    const wrapper = mount(MatchCard, {
      props: { user: makeUser() },
      global: { plugins: [i18n], stubs },
      slots: { photo: '<div class="custom-photo">自定义照片</div>' },
    });
    expect(wrapper.find(".custom-photo").exists()).toBe(true);
  });
});