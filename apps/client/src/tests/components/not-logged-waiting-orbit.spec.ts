/**
 * MP-R2VIS-PAGES-MESSAGES-INDEX-004 的第二载体（挂载级）。
 *
 * 为什么在 verify-source-shape 的文本判点之外还要这一份：文本判点问的是
 * 「源码里有没有这些 class」，答不了「渲染之后真有几个节点」。
 * v-for 少渲染一个、半径数组被截断、角标绑错图，文本侧全都照绿。
 * 这里量的是渲染后的 DOM 计数与 src 真值。
 *
 * 理想图＝素材/理想效果图/未登录等待页面.png：虚线轨道 + 6 个头像（各带心动角标）+ 中心吉祥物，
 * 标题左对齐在最上方，「登录后即可解锁全部功能」在环与 4 个 icon 之间。
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";
import { IMAGE_PATHS } from "../../config/images";

(globalThis as any).uni = (globalThis as any).uni || {};

import NotLoggedWaiting from "../../components/discover/NotLoggedWaiting.vue";

/** uni-app 的自定义标签在 jsdom 里不是元素，逐个换成等价 HTML，:class 才会落到 DOM 上 */
const stubs = {
  view: { template: '<div :class="$attrs.class"><slot /></div>' },
  text: { template: '<span :class="$attrs.class"><slot /></span>' },
  image: { props: ["src", "mode"], template: '<img :src="src" />' },
};

function mountCard() {
  return mount(NotLoggedWaiting, { global: { plugins: [i18n], stubs } });
}

describe("未登录等待卡的头像环（MP-R2VIS-PAGES-MESSAGES-INDEX-004）", () => {
  it("整图海报节点已经不存在，渲染结果里也搜不到那张图", () => {
    const w = mountCard();
    expect(w.findAll(".not-logged__bg")).toHaveLength(0);
    expect(w.html()).not.toContain("notlogged-waiting");
    expect(w.html()).not.toContain(String(IMAGE_PATHS.POSTERS?.NOT_LOGGED_WAITING ?? "__no_such_poster__"));
  });

  it("环上是 6 个互不相同的头像节点，不是同一张图重复 6 次", () => {
    const srcs = mountCard().findAll(".not-logged__orbit-avatar").map((n) => n.attributes("src"));
    expect(srcs).toHaveLength(6);
    expect(new Set(srcs).size, `头像池出现重复：${srcs.join(" ")}`).toBe(6);
    for (const s of srcs) expect(Object.values(IMAGE_PATHS.PEOPLE)).toContain(s);
  });

  it("中心吉祥物与虚线轨道各自是一个独立节点，吉祥物用的是默认那尊", () => {
    const w = mountCard();
    expect(w.findAll(".not-logged__orbit-ring")).toHaveLength(1);
    const mascot = w.findAll(".not-logged__orbit-mascot");
    expect(mascot).toHaveLength(1);
    expect(mascot[0].attributes("src")).toBe(IMAGE_PATHS.MASCOT.DEFAULT);
  });

  it("内容顺序按理想图排：标题 → 环 → 解锁提示 → 4 个 icon → 按钮", () => {
    const html = mountCard().html();
    const at = (needle: string) => html.indexOf(needle);
    const order = [
      ["标题", at("not-logged__title")],
      ["环", at("not-logged__orbit")],
      ["解锁提示", at("not-logged__hint")],
      ["icon 行", at("not-logged__features")],
      ["按钮行", at("not-logged__btn-row")],
    ] as const;
    for (const [name, idx] of order) expect(idx, `渲染结果里找不到 ${name}`).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < order.length; i++) {
      expect(order[i][1], `${order[i][0]} 必须排在 ${order[i - 1][0]} 之后`).toBeGreaterThan(order[i - 1][1]);
    }
  });
});
