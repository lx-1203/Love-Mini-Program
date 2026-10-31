/**
 * A11Y-R 轨（2026-10-31）· 按下反馈 hover-class + 图片可访问名 的回归判点
 *
 * 覆盖两条lane-verified缺陷：
 *  A. 只写 :active、不写 hover-class ⇒ mp-weixin 真机按下无反馈
 *     （本仓自证：App.vue:813「mp-weixin 的 :active 伪类不可靠，已配合 hover-class 使用」）。
 *  B. <image> 无可访问名 ⇒ 屏幕阅读器读到无名图片节点
 *     （机制口径：role="img" + aria-label，仓内 6 处先例，含 ChatBubble.vue:176-179、
 *      VerificationBadge.vue:106；aria-role 在本仓 0 命中，故不采用）。
 *
 * 为什么每个判点都是「值断言」而不是快照：
 *  - hover-class 只写名字不够——若该类在样式里没有定义，mp 端依旧零反馈，所以每条都
 *    同时断言「渲染出的类名」+「该类的 CSS 规则真实存在于组件自己的 <style> 里」。
 *  - 删掉任一属性（模板上的 hover-class / 样式里的 --pressed 规则 / role / aria-label），
 *    对应判点立刻 RED（已实测，见提交说明）。
 *
 * 编译产物层面的既有证据（本轨不重复构建，静态可查）：
 *  dist/build/mp-weixin/components/common/BaseTabs.wxml → hover-class="base-tab-item--pressed"
 *  dist/build/mp-weixin/components/common/BaseTabs.wxss → .base-tab-item--pressed.data-v-3278c03a
 *  与节点 class 数组里的 data-v-3278c03a 同域 ⇒ 组件内局部 scoped 的 --pressed 类在
 *  mp-weixin 下确实能命中。本仓无法在此机上跑真机/DevTools，屏幕阅读器是否播报仍属未验证。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

(globalThis as any).uni = {};

import ErrorState from "../../components/common/ErrorState.vue";
import VoicePill from "../../components/chat/VoicePill.vue";
import EmojiPanel from "../../components/chat/EmojiPanel.vue";
import IcebreakerSuggestions from "../../components/chat/IcebreakerSuggestions.vue";
import Tag from "../../components/common/Tag.vue";

const SRC = resolve(__dirname, "../..");

/** 读组件源码，用于断言 hover-class 指向的类真的存在于该组件的样式里 */
function readComponentSource(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), "utf-8");
}

/**
 * 断言：class 名为 className 的样式规则在该文件的 <style> 块里真的有声明体。
 * 命中形态兼容 `.x--pressed {`、`.a:active,\n.x--pressed {`、以及 scoped 编译前的裸类名。
 */
function cssRuleExists(source: string, className: string): boolean {
  const styleStart = source.indexOf("<style");
  if (styleStart < 0) return false;
  const style = source.slice(styleStart);
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\.${escaped}\\s*(?::\\w+)?\\s*\\{`).test(style);
}

/** 统一 stub：view/text/image 换成普通 DOM，非 prop 属性（hover-class/role/aria-*）按
 *  Vue 默认 inheritAttrs 落到 stub 根节点上，因此可以像真机一样断言「渲染出的属性」。 */
const stubs = {
  view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
  text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
  image: { template: '<img class="mock-image" />', name: "uni-image" },
};

function mountWith(comp: any, props: Record<string, any> = {}) {
  return mount(comp, { props, global: { plugins: [i18n], stubs } });
}

describe("A11Y-R · 按下反馈：tappable 元素必须带真实 hover-class", () => {
  it("ErrorState 重试按钮渲染出 hover-class=error-btn--pressed，且该类有样式声明", () => {
    const wrapper = mountWith(ErrorState);
    const btn = wrapper.find(".error-btn");
    expect(btn.attributes("hover-class")).toBe("error-btn--pressed");
    expect(cssRuleExists(readComponentSource("components/common/ErrorState.vue"), "error-btn--pressed")).toBe(true);
  });

  it("VoicePill 可播放态渲染出 hover-class=voice-pill--pressed，且该类有样式声明", () => {
    const wrapper = mountWith(VoicePill, { durationSeconds: 3, audioUrl: "", expired: false });
    expect(wrapper.find(".voice-pill").attributes("hover-class")).toBe("voice-pill--pressed");
    expect(cssRuleExists(readComponentSource("components/chat/VoicePill.vue"), "voice-pill--pressed")).toBe(true);
  });

  it("VoicePill 过期态 hover-class 取 none（不可用控件不给「点到了」的假反馈）", () => {
    const wrapper = mountWith(VoicePill, { durationSeconds: 3, audioUrl: "", expired: true });
    expect(wrapper.find(".voice-pill").attributes("hover-class")).toBe("none");
  });

  it("EmojiPanel 每格渲染出 hover-class=emoji-panel__item--pressed（并集了底色+缩放）", () => {
    const wrapper = mountWith(EmojiPanel);
    const first = wrapper.find(".emoji-panel__item");
    expect(first.attributes("hover-class")).toBe("emoji-panel__item--pressed");
    const src = readComponentSource("components/chat/EmojiPanel.vue");
    expect(cssRuleExists(src, "emoji-panel__item--pressed")).toBe(true);
    // 不回归：从 global.scss 的 press-feedback--active 切过来后，scale/opacity 必须仍在
    const rule = src.slice(src.indexOf(".emoji-panel__item--pressed"));
    expect(rule).toMatch(/transform:\s*scale\(0\.98\)/);
    expect(rule).toMatch(/opacity:\s*0\.92/);
  });

  it("IcebreakerSuggestions 的刷新键与话题卡（两个 @tap 节点）都渲染出 hover-class", () => {
    const wrapper = mountWith(IcebreakerSuggestions, {
      loading: false,
      items: [{ id: 1, content: "测试话题", category: "兴趣", source: "mock" }],
    });
    expect(wrapper.find(".icebreaker__refresh-btn").attributes("hover-class")).toBe(
      "icebreaker__refresh-btn--pressed",
    );
    expect(wrapper.find(".icebreaker__card").attributes("hover-class")).toBe("icebreaker__card--pressed");
    const src = readComponentSource("components/chat/IcebreakerSuggestions.vue");
    expect(cssRuleExists(src, "icebreaker__refresh-btn--pressed")).toBe(true);
    expect(cssRuleExists(src, "icebreaker__card--pressed")).toBe(true);
  });

  it("H5 行为不变：:active 规则全部保留（未被 hover-class 取代掉）", () => {
    for (const rel of [
      "components/common/ErrorState.vue",
      "components/chat/VoicePill.vue",
      "components/chat/EmojiPanel.vue",
      "components/chat/IcebreakerSuggestions.vue",
    ]) {
      expect(readComponentSource(rel)).toMatch(/:active/);
    }
  });

  it("Tag / SectionCard 不含任何 @tap 与 emit ⇒ 本就不可点，不添加假反馈（回归锁定）", () => {
    for (const rel of ["components/common/Tag.vue", "components/common/SectionCard.vue"]) {
      const src = readComponentSource(rel);
      expect(src).not.toMatch(/@tap/);
      expect(src).not.toMatch(/hover-class/);
      expect(src).not.toMatch(/defineEmits/);
    }
  });
});

describe("A11Y-R · 选中态不能只靠颜色（Tag）", () => {
  it("selected=true 渲染出非颜色线索「✓」，且它 aria-hidden（不污染读屏）", () => {
    const wrapper = mountWith(Tag, { label: "同学", variant: "blue", selected: true });
    const check = wrapper.find(".tag-check");
    expect(check.exists()).toBe(true);
    expect(check.text()).toBe("✓");
    expect(check.attributes("aria-hidden")).toBe("true");
  });

  it("selected=false 不渲染该线索（否则它就不是选中状态的信号）", () => {
    const wrapper = mountWith(Tag, { label: "同学", variant: "blue", selected: false });
    expect(wrapper.find(".tag-check").exists()).toBe(false);
  });
});

describe("A11Y-R · 图片可访问名：role=img + aria-label（mp-weixin 忽略 alt）", () => {
  /**
   * subpackages 下的三个页面依赖 store/路由/uni 运行时，挂载成本与不确定性都超出本轨范围，
   * 因此这组判点走「模板源码静态判点」：直接从 <image> 标签本体上要求 role 与 aria-label。
   * 这是静态检查——它证明属性会被写进模板（并进而进 wxml），
   * 但不证明屏幕阅读器实际播报。
   */
  function imageTag(source: string, classNeedle: string): string {
    const re = /<image\b[^>]*?\/?>/gs;
    for (const m of source.matchAll(re)) {
      if (m[0].includes(classNeedle)) return m[0];
    }
    throw new Error(`未找到 class 含「${classNeedle}」的 <image> 标签`);
  }

  const cases: Array<[string, string, RegExp]> = [
    // 聊天行头像：助手（名字来自 :88 已在用的 accountName），口径同 ChatBubble.vue:176-179
    ["subpackages/chat/official-chat/index.vue", "msg-avatar", /:aria-label="accountName"/],
    // 认证状态图标：verified/rejected/unverified 三态图标，名字复用 CERT_STATUS_MAP
    [
      "subpackages/campus/campus/certification.vue",
      "status-card__icon-img",
      /:aria-label="statusIcon\(certificationStatus\) \? CERT_STATUS_MAP\[certificationStatus\] : ''"/,
    ],
  ];

  for (const [rel, needle, expectedLabel] of cases) {
    it(`${rel} 的 ${needle} 带 role="img" 与指定 aria-label`, () => {
      const tag = imageTag(readComponentSource(rel), needle);
      expect(tag).toMatch(/role="img"/);
      expect(tag).toMatch(expectedLabel);
    });
  }

  it("chat-session 两处对 AT 暴露的头像（status/dialog 非叶子）拿到对端名字", () => {
    const src = readComponentSource("subpackages/chat/chat-session/index.vue");
    for (const needle of ["typing-row__avatar", "avatar-menu-avatar"]) {
      const tag = imageTag(src, needle);
      expect(tag).toMatch(/role="img"/);
      // 取名口径复用本文件 :1985 已有的 pageTitle || chat.peerFallbackName
      expect(tag).toMatch(/:aria-label="pageTitle \|\| t\('chat\.peerFallbackName'\)"/);
    }
  });

  it("用户自己的消息头像按 ChatBubble.vue:189 既有写法标成「我」", () => {
    const src = readComponentSource("subpackages/chat/official-chat/index.vue");
    const selfTag = imageTag(src, ":src=\"userAvatar\"");
    expect(selfTag).toMatch(/role="img"/);
    expect(selfTag).toMatch(/aria-label="我"/);
  });

  it("转发条目头像位于 role=button（ARIA 叶子）内 ⇒ 只标装饰空 alt，不编造名字", () => {
    const src = readComponentSource("subpackages/chat/chat-session/index.vue");
    const tag = imageTag(src, "forward-item__avatar");
    expect(tag).toMatch(/alt=""/);
    expect(tag).not.toMatch(/aria-label/);
  });

  it("英雄区吉祥物是装饰图：按同块 4 枚 hero-deco 的既有口径给空 alt，不给假标签", () => {
    const src = readComponentSource("subpackages/chat/official-chat/index.vue");
    const tag = imageTag(src, "hero-mascot");
    expect(tag).toMatch(/alt=""/);
    expect(tag).not.toMatch(/aria-label/);
  });

  it("本仓机制确认：aria-role 全仓 0 命中（所以用 role= 而不是 aria-role）", () => {
    expect(readFileSync(resolve(SRC, "components/common/Avatar.vue"), "utf-8")).toMatch(/role="img"/);
  });
});
