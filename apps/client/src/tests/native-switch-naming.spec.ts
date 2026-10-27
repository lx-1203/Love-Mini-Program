import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Task B7 — 开关控件的具名钩子（naming-only）契约测试。
 *
 * 背景：apps/client/src 下共有 9 枚开关控件（vip / campus/post-topic /
 * settings×2 / dnd×2 / privacy×2 / circles-post-topic），研究车道 b7 证实它们此前
 * 全部零 authored class/id（仅 Vue 编译期的 data-v-* 作用域哈希，且 settings/dnd/privacy
 * 每页两枚还共用同一枚哈希 → 选择器有歧义）。
 *
 * R11-L10-D11：privacy 的两枚按缺陷卡从原生 `<switch>` 改为自绘轨道（平台把原生 OFF 态
 * 轨道颜色写死，`color` 只作用 ON 态，达不到 3:1 边界），并补了 role="switch" + aria-checked。
 * ⇒ 「控件」的外延从"原生 `<switch>`"扩到"原生 `<switch>` 或 role=\"switch\" 的自绘控件"，
 * 总数仍钉死 9。**这不是放宽**：每枚仍须有非空 authored class、同页两枚的区分修饰类仍须
 * 页内唯一命中（正是 R11 把两枚都写成 `privacy-item__switch` 时本测试抓到的回归）。
 *
 * 本测试把「给每枚开关控件补一个稳定的、页内唯一的 authored class」这一意图钉死在源码层：
 *  - 9 枚控件节点数不变，且每枚都带一个非空静态 class（编译期原样进入 wxml 的 class="…"）；
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

/** 取出模板里每一枚开关控件的原文：原生自闭合 `<switch …/>` + role="switch" 的自绘控件。 */
function switchNodes(source: string): string[] {
  const native = source.match(/<switch\b[\s\S]*?\/>/g) ?? [];
  // 自绘控件是多行标签，`[^>]*` 覆盖换行；role 出现在 class 之后也照收
  const drawn = source.match(/<[a-zA-Z-]+\b[^>]*\brole="switch"[^>]*>/g) ?? [];
  return [...native, ...drawn];
}

/** 取出某枚 switch 节点上的静态 class 属性值（无则空串）。 */
function staticClassOf(node: string): string {
  return node.match(/\sclass="([^"]*)"/)?.[1] ?? "";
}

describe("B7 — 9 枚开关控件的 authored 命名钩子", () => {
  it("全仓 6 个文件里控件节点总数为 9，且每枚都带非空静态 class", () => {
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
   * 自绘轨道是 R11 新引入的载体，它不像原生 `<switch>` 那样自带状态语义
   * （读屏与自动化都靠 aria-checked 判开/关）⇒ 每枚自绘控件必须显式声明，
   * 缺一个就等于把「开关状态」从无障碍树里丢了。
   */
  it("自绘开关必须带 aria-checked（原生 switch 自带语义，不要求）", () => {
    const drawnFiles = ["../subpackages/profile-extra/profile/privacy.vue"];
    for (const path of drawnFiles) {
      const source = readFileSync(resolve(__dirname, path), "utf-8");
      const drawn = source.match(/<[a-zA-Z-]+\b[^>]*\brole="switch"[^>]*>/g) ?? [];
      expect(drawn.length, `${path} 的自绘开关枚数`).toBe(2);
      for (const node of drawn) {
        expect(node, `自绘开关缺 aria-checked：${path}`).toMatch(/aria-checked/);
      }
    }
  });

  /**
   * PFI28 的后续：原用例钉的是「profile 页三枚同名 .video-cta 里要点中邀请那一枚」，
   * 而语音介绍/编辑背景图/推荐给好友三段已按个人页版面裁定整块撤下（邀请弹窗改由首页
   * 邀请横幅以 ?invite=1 桥接唤起，不再依赖页内 CTA 选择器）。载体没了，判据改钉撤除本身：
   * 任何人往个人页加回 .video-cta 即红。
   */
  it("PFI28：个人页不再渲染任何 .video-cta（三段已撤）", () => {
    const source = readFileSync(resolve(__dirname, "../pages/profile/index.vue"), "utf-8");
    // 前置空白把 hover-class="…" 排除在外：它也含 `class="`，不排除会把计数灌水
    const classAttrs = [...source.matchAll(/\sclass="([^"]*\bvideo-cta\b[^"]*)"/g)].map((m) => m[1]);
    const bare = classAttrs.filter((c) => /\bvideo-cta\b/.test(c) && !/video-cta__/.test(c));
    expect(bare, "个人页可点的 .video-cta 枚数（三段撤下后应为 0）").toEqual([]);
  });
});
