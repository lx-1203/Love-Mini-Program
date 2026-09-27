/**
 * MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001 的载体：
 * 「我的页」与「他人主页」对同一份 basic 必须渲染出同一个 meta 顺序（年龄 · 学校 · 城市）。
 *
 * 为什么两页都要挂：这条缺陷的本体不是"某一页排错"，而是**两页不一致**——
 * 只测纯函数会漏掉"某个组件绕过 formatter 自己拼"的回归，而那正是本轮改之前的样子
 * （MyHeader 把后端 location 串整串直出，PublicIdentity 拆开重排）。
 * 两张理想效果图（已经填完资料的个人主页.png、他人显示主页.png）都是「21岁 · 北京大学 · 北京」。
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { profileMetaLine, profileMetaParts } from "../../utils/profile-meta";

(globalThis as any).uni = (globalThis as any).uni || {};

import MyHeader from "../../components/profile/mine/MyHeader.vue";
import PublicIdentity from "../../components/profile/public/PublicIdentity.vue";

/** 后端 location 串本体是「城市 · 学校」——这条 fixture 就是这个反直觉之处，别"顺手改成对的" */
const BASIC = { name: "星野", age: 21, gender: "female", avatar: "", location: "北京 · 北京大学" };
const PROFILE = {
  basic: BASIC,
  identity: { verified: true, student: true },
  intro: { bio: "热爱生活" },
  relation: { matchScore: 90 },
  distanceText: "2.3km",
  online: true,
};

/** 断言"学校出现在城市之前"，而不是只断言整串相等：两页的分隔符渲染方式不同
    （MyHeader 是一整串 join，PublicIdentity 是 v-for 逐段渲染），只有下标比较对两边都成立。
    城市取 lastIndexOf：正确串里 "北京" 也出现在 "北京大学" 内，取首个会自己把自己判成反序。 */
function assertSchoolBeforeCity(text: string, where: string) {
  const age = text.indexOf("21岁");
  const school = text.indexOf("北京大学");
  const city = text.lastIndexOf("北京");
  expect(age, `${where} 里应当出现年龄`).toBeGreaterThanOrEqual(0);
  expect(school, `${where} 里应当出现学校`).toBeGreaterThanOrEqual(0);
  expect(city, `${where} 里应当出现城市`).toBeGreaterThan(school);
  expect(age, `${where}：年龄必须在最前`).toBeLessThan(school);
}

describe("utils/profile-meta 的排序口径", () => {
  it("把「城市 · 学校」的原始串重排成 学校 → 城市", () => {
    expect(profileMetaParts(BASIC)).toEqual(["21岁", "北京大学", "北京"]);
    expect(profileMetaLine(BASIC)).toBe("21岁 · 北京大学 · 北京");
  });
  it("location 里没有分隔符时不丢城市、也不凭空造学校", () => {
    expect(profileMetaParts({ age: 21, location: "北京" })).toEqual(["21岁", "北京"]);
  });
  it("缺年龄 / 缺 location 时不产出空段与悬空分隔符", () => {
    expect(profileMetaLine({ age: 0, location: "" })).toBe("");
    expect(profileMetaLine({ age: 21, location: null })).toBe("21岁");
  });
});

describe("两张主页的 meta 顺序必须一致", () => {
  const stubs = { image: true, text: { template: "<span><slot /></span>" } };

  it("我的页（MyHeader）渲染 年龄 · 学校 · 城市", () => {
    const w = mount(MyHeader, { props: { profile: PROFILE as never }, global: { stubs } });
    assertSchoolBeforeCity(w.text(), "MyHeader");
  });

  it("他人主页（PublicIdentity）渲染 年龄 · 学校 · 城市", () => {
    const w = mount(PublicIdentity, { props: { profile: PROFILE as never }, global: { stubs } });
    assertSchoolBeforeCity(w.text(), "PublicIdentity");
  });

  it("两页取到的是同一份 formatter（谁绕过它自己拼就红）", async () => {
    const fs = await import("node:fs");
    const mine = fs.readFileSync("src/components/profile/mine/MyHeader.vue", "utf8");
    const pub = fs.readFileSync("src/components/profile/public/PublicIdentity.vue", "utf8");
    for (const [name, src] of [["MyHeader", mine], ["PublicIdentity", pub]] as const) {
      /* 只查 import 不够：留一个没用上的 import 也能过。必须查到"真的调用了"。 */
      expect(src, `${name} 必须 import 共用 formatter`).toMatch(/from "[^"]*utils\/profile-meta"/);
      expect(src, `${name} 必须真的调用共用 formatter（留个空 import 不算）`).toMatch(/profileMeta(Line|Parts)\(/);
      expect(src, `${name} 不得再自己 split location`).not.toMatch(/location[^\n]*\.split\(/);
    }
  });
});
