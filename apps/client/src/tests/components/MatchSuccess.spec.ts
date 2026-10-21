import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

(globalThis as any).uni = {};

import MatchSuccess from "../../components/match/MatchSuccess.vue";
import type { MatchReason } from "../../types/match";

const stubs = {
  view: { template: '<div class="mock-view"><slot /></div>' },
  text: { template: '<span class="mock-text"><slot /></span>' },
  image: { template: '<img class="mock-image" />' },
};

const reasons: MatchReason[] = [
  { type: "common_interest", text: "摄影" },
  { type: "same_school", text: "同校" },
];

function mountSuccess(extra: Record<string, unknown> = {}, list: MatchReason[] = reasons) {
  return mount(MatchSuccess, {
    props: {
      myAvatar: "/static/assets/default-avatar.jpg",
      partnerAvatar: "/static/assets/default-avatar.jpg",
      partnerName: "林晓",
      reasons: list,
      ...extra,
    },
    global: { plugins: [i18n], stubs },
  });
}

describe("MatchSuccess", () => {
  it("渲染双头像、关系建立理由与两个 CTA", () => {
    const wrapper = mountSuccess();
    expect(wrapper.findAll(".match-success__avatar")).toHaveLength(2);
    // R10-L06-D01（文案 P0）反转了 2026-08-25 的「补满 4 行」契约：
    // 缺项用 DEFAULT_REASON_LABELS 填出来的行是向用户虚构共同点，故行数=真理由数。
    expect(wrapper.findAll(".match-success__score-item")).toHaveLength(2);
    expect(wrapper.text()).toContain("摄影");
    expect(wrapper.text()).toContain("同校");
    expect(wrapper.find(".match-success__primary").exists()).toBe(true);
    expect(wrapper.find(".match-success__secondary").exists()).toBe(true);
  });

  it("不得出现补位用的假共同点", () => {
    const text = mountSuccess().text();
    for (const invented of ["慢跑爱好", "音乐品味", "电影偏好", "生活方式"]) {
      expect(text).not.toContain(invented);
    }
  });

  it("匹配度只有一个数字，且来自 props.matchScore 真值", () => {
    const wrapper = mountSuccess({ matchScore: 87 });
    const percents = wrapper.findAll(".match-success__score-percent");
    expect(percents).toHaveLength(1);
    expect(percents[0]!.text()).toBe("匹配度 87%");
    // 旧实现写死 [90,85,80,79]——任何一个都不许再出现在画面上
    for (const fake of ["90%", "85%", "80%", "79%"]) {
      expect(wrapper.text()).not.toContain(fake);
    }
  });

  it("拿不到 matchScore 时隐藏匹配度，不用常量冒充", () => {
    expect(mountSuccess().text()).not.toContain("匹配度");
    expect(mountSuccess({ matchScore: Number.NaN }).text()).not.toContain("匹配度");
  });

  it("没有真理由时整张共同点卡隐藏（ops 用例 :172 预期）", () => {
    const wrapper = mountSuccess({}, []);
    expect(wrapper.find(".match-success__score-card").exists()).toBe(false);
    // 页面不得塌陷：两个 CTA 仍可达
    expect(wrapper.find(".match-success__primary").exists()).toBe(true);
    expect(wrapper.find(".match-success__secondary").exists()).toBe(true);
  });

  it("点击立即聊天/继续探索分别 emit", async () => {
    const wrapper = mountSuccess();
    await wrapper.find(".match-success__primary").trigger("tap");
    await wrapper.find(".match-success__secondary").trigger("tap");
    expect(wrapper.emitted("chat")).toBeTruthy();
    expect(wrapper.emitted("explore")).toBeTruthy();
  });
});