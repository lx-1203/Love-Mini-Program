import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Task B7 — native `<switch>` 具名钩子（naming-only）契约测试。
 *
 * 背景：apps/client/src 下共有 9 枚原生 `<switch>`（vip / campus/post-topic /
 * settings×2 / dnd×2 / privacy×2 / circles-post-topic），研究车道 b7 证实它们此前
 * 全部零 authored class/id（仅 Vue 编译期的 data-v-* 作用域哈希，且 settings/dnd/privacy
 * 每页两枚还共用同一枚哈希 → 选择器有歧义）。
 *
 * 本测试把「给每枚 switch 补一个稳定的、页内唯一的 authored class」这一意图钉死在源码层：
 *  - 9 枚 switch 节点数不变，且每枚都带一个非空静态 class（编译期原样进入 wxml 的 class="…"）；
 *  - 每页两枚的场景下，区分用的修饰类在该页内只命中一次（选择器唯一）；
 *  - 不引入含 `search` 的类名（首页 H13 存在 search 缺省断言，不能踩）。
 *
 * 判点走源码文本而非编译产物，是因为三档产物由主控车道自行重建，本车道不得触碰 dist。
 */

const FILES: Array<{ path: string; expected: string[] }> = [
  {
    path: "../subpackages/vip/index.vue",
    expected: ["auto-renew__switch"],
  },
  {
    path: "../subpackages/campus/campus/post-topic.vue",
    expected: ["option-switch"],
  },
  {
    path: "../subpackages/profile-extra/settings/index.vue",
    expected: ["menu-item__switch--weekly", "menu-item__switch--theme"],
  },
  {
    path: "../subpackages/profile-extra/settings/dnd.vue",
    expected: ["switch-row__control--enabled", "switch-row__control--urgent"],
  },
  {
    path: "../subpackages/profile-extra/profile/privacy.vue",
    expected: ["privacy-item__switch--allow", "privacy-item__switch--receive"],
  },
  {
    path: "../subpackages/circles/circles/post-topic.vue",
    expected: ["favorite-section__switch"],
  },
];

/** 取出模板里每一枚自闭合 `<switch ... />` 节点的原文。 */
function switchNodes(source: string): string[] {
  return source.match(/<switch\b[\s\S]*?\/>/g) ?? [];
}

/** 取出某枚 switch 节点上的静态 class 属性值（无则空串）。 */
function staticClassOf(node: string): string {
  return node.match(/\sclass="([^"]*)"/)?.[1] ?? "";
}

describe("B7 — 9 枚原生 switch 的 authored 命名钩子", () => {
  it("全仓 6 个文件里 switch 节点总数为 9，且每枚都带非空静态 class", () => {
    let total = 0;
    for (const file of FILES) {
      const source = readFileSync(resolve(__dirname, file.path), "utf-8");
      const nodes = switchNodes(source);
      expect(nodes.length, `switch 节点数漂移：${file.path}`).toBeGreaterThan(0);
      for (const node of nodes) {
        total += 1;
        const cls = staticClassOf(node);
        // authored class 必须存在、非空，且不能是编译期哈希（data-v-…）
        expect(cls.length, `switch 缺少 authored class：${file.path}`).toBeGreaterThan(0);
        expect(cls).not.toMatch(/data-v-/);
      }
    }
    expect(total).toBe(9);
  });

  it.each(FILES)("$expected 的区分修饰类在页内唯一命中", ({ path, expected }) => {
    const source = readFileSync(resolve(__dirname, path), "utf-8");
    const nodes = switchNodes(source);
    for (const token of expected) {
      const hits = nodes.filter((n) => staticClassOf(n).split(/\s+/).includes(token));
      expect(hits.length, `${token} 在 ${path} 命中 ${hits.length} 次，应恰好 1 次`).toBe(1);
    }
  });

  it("不引入任何含 `search` 的类名（避开首页 H13 缺省断言）", () => {
    for (const file of FILES) {
      const source = readFileSync(resolve(__dirname, file.path), "utf-8");
      for (const node of switchNodes(source)) {
        expect(staticClassOf(node)).not.toMatch(/search/);
      }
    }
  });

  /**
   * PFI28 与 switch 同一病根：profile 页三枚 `.video-cta` 同名 ⇒ 选择器首匹配落到"录音"那一枚，
   * 邀请入口在自动化里点不到（判据点名的是打开邀请弹窗这条动作）。这里钉"唯一化"这件事本身。
   */
  it("PFI28：邀请入口有一枚页内唯一的 video-cta--invite", () => {
    const source = readFileSync(resolve(__dirname, "../pages/profile/index.vue"), "utf-8");
    // 前置空白把 hover-class="…" 排除在外：它也含 `class="`，不排除会把计数灌水
    const classAttrs = [...source.matchAll(/\sclass="([^"]*\bvideo-cta\b[^"]*)"/g)].map((m) => m[1]);
    const bare = classAttrs.filter((c) => /\bvideo-cta\b/.test(c) && !/video-cta__/.test(c));
    expect(bare.length, "profile 页可点的 .video-cta 枚数").toBe(3);
    const invite = bare.filter((c) => c.split(/\s+/).includes("video-cta--invite"));
    expect(invite.length, "video-cta--invite 必须恰好命中 1 次（0 次=没点名，2 次=换了个歧义）").toBe(1);
    expect(invite[0]).not.toMatch(/search/);
  });
});
