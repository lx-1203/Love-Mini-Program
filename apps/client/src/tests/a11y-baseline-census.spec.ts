import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

/**
 * a11y 基线递减门（R7-C 第 1 批 · 门 3，round-6 F-5 / F-7 方案）。
 *
 * <p>F-5 实测三族（本门按同一口径重测后钉成基线，**只许降不许升**）：
 * 缺 `maxlength` 的 `<input>`（微信端静默截 140 字，手机号/确认串被截是语义风险）、
 * 缺可访问名（`alt` 与 `aria-label` 都没有）的 `<image>`、
 * 有 tap handler 而无任何按压反馈的页面。三族都是**存量账**：本门不改页面，
 * 把现状钉住；新页命中即红，存量按基线递减收敛。</p>
 *
 * <p>解析纪律（F-5 的教训写死在这）：**不许单行 grep**——`<input …>`/`<image …>`
 * 标签普遍跨行，单行 `grep -oE "<input[^>]*"` 会把跨行标签截断，实测曾把
 * maxlength 缺失从 21/48 误报成 48/48。本门先剥注释（块/行/模板注释，换行保形），
 * 再用 `[\s\S]*?` 跨行匹配完整开标签，按标签整体判属性。</p>
 *
 * <p>按压反馈口径：页面/分包用 `press-feedback`（在册约定，见
 * components/press-feedback-and-image-name.spec.ts），组件与部分页面用 uni-app 原生
 * `hover-class`——两种机制任一即算有反馈。这一轴按**点名尾单**钉（不是数字棘轮）：
 * 新页面缺反馈必须先把名字写进尾单并说明为什么可以缺，否则红。</p>
 */

const CLIENT_SRC = resolve(__dirname, "..");
const PAGES = ["pages", "subpackages"]; // 按压轴只看页面+分包（组件的反馈由各自 hover-class 机制承担）

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "tests") continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && entry.name.endsWith(".vue")) acc.push(full);
  }
  return acc;
}

/** 剥注释（换行保形，报错可回溯）；字符串里的中文注释符不误伤——与本仓其他 census 同口径 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//gu, (m) => " ".repeat(m.length))
    .replace(/(^|[^:])\/\/.*$/gmu, "$1")
    .replace(/<!--[\s\S]*?-->/gu, (m) => " ".repeat(m.length));
}

const allVue = walk(CLIENT_SRC);
const pageVue = PAGES.flatMap((d) => walk(resolve(CLIENT_SRC, d)));

interface TagHit {
  file: string;
  tag: string;
}

/** 跨行取完整开标签（`<input …>` / `<image …>`），返回逐条命中（含文件与归一化标签文本） */
function openTags(files: string[], tag: "input" | "image"): TagHit[] {
  const hits: TagHit[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>`, "gsu");
  for (const abs of files) {
    const src = stripComments(readFileSync(abs, "utf8"));
    for (const m of src.matchAll(re)) {
      hits.push({ file: relative(CLIENT_SRC, abs).split(/[\\/]/u).join("/"), tag: m[0].replace(/\s+/gu, " ") });
    }
  }
  return hits;
}

const inputs = openTags(allVue, "input");
const images = openTags(allVue, "image");
const inputsNoMaxlength = inputs.filter((h) => !/maxlength/iu.test(h.tag));
const imagesNoName = images.filter((h) => !/(?:\balt\b|aria-label)/iu.test(h.tag));

/* 基线（2026-11-01 R7-C 建门实测，F-5 报 21/13 与 80/30 是其当年解析器口径；
   本门解析器把跨行标签全量吃进来后读数不同，以本门自测读数为准、只许降不许升）：
   改页面消存量 ⇒ 同步把这里降到位；涨了没有别的解释，就是新代码带了新债。 */
const INPUT_NO_MAXLENGTH_CEILING = 23;
const IMAGE_NO_NAME_CEILING = 61;

/** 按压反馈点名尾单（页面+分包、有 tap/click handler、且无 press-feedback 也无 hover-class） */
const PRESS_FEEDBACK_ROSTER = new Map<string, string>([
  [
    "subpackages/profile-extra/notifications/index.vue",
    "F-5 实测 4 个 handler 无反馈。通知设置页的开关行是主要交互面，补反馈时从这页先开始。",
  ],
  [
    "subpackages/setup/campus/index.vue",
    "F-5 实测 3 个 handler 无反馈。setup 流程页，补反馈时同步核对其余 setup 族页面。",
  ],
]);

describe("a11y 基线递减门：maxlength / 图片可访问名 / 按压反馈", () => {
  it("扫描面非空（防空转地板：input ≥45、image ≥350、页面+分包文件 ≥70）", () => {
    expect(inputs.length, `只解析到 ${inputs.length} 个 <input>`).toBeGreaterThanOrEqual(45);
    expect(images.length, `只解析到 ${images.length} 个 <image>`).toBeGreaterThanOrEqual(350);
    expect(pageVue.length, `只解析到 ${pageVue.length} 个页面文件`).toBeGreaterThanOrEqual(70);
  });

  it(`<input> 缺 maxlength 的条数 ≤ ${INPUT_NO_MAXLENGTH_CEILING}（只许降不许升；微信端静默截 140）`, () => {
    const byFile = new Map<string, number>();
    for (const h of inputsNoMaxlength) byFile.set(h.file, (byFile.get(h.file) ?? 0) + 1);
    expect(
      inputsNoMaxlength.length,
      `缺 maxlength 的 input 有 ${inputsNoMaxlength.length} 条（基线 ${INPUT_NO_MAXLENGTH_CEILING}，只许降）。逐文件：\n${
        [...byFile.entries()].map(([f, n]) => `${f} ×${n}`).join("\n")
      }`,
    ).toBeLessThanOrEqual(INPUT_NO_MAXLENGTH_CEILING);
  });

  it(`<image> 缺可访问名（alt/aria-label 都没有）的条数 ≤ ${IMAGE_NO_NAME_CEILING}（只许降不许升）`, () => {
    const byFile = new Map<string, number>();
    for (const h of imagesNoName) byFile.set(h.file, (byFile.get(h.file) ?? 0) + 1);
    expect(
      imagesNoName.length,
      `缺可访问名的 image 有 ${imagesNoName.length} 条（基线 ${IMAGE_NO_NAME_CEILING}，只许降）。Top 文件：\n${
        [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([f, n]) => `${f} ×${n}`).join("\n")
      }`,
    ).toBeLessThanOrEqual(IMAGE_NO_NAME_CEILING);
  });

  it("页面/分包里 tap handler 无任何按压反馈的文件 ⊆ 点名尾单（新页缺反馈必须先入册）", () => {
    const offenders: string[] = [];
    for (const abs of pageVue) {
      const rel = relative(CLIENT_SRC, abs).split(/[\\/]/u).join("/");
      const src = stripComments(readFileSync(abs, "utf8"));
      if (/@(?:tap|click)=/u.test(src) && !/press-feedback|hover-class/u.test(src)) offenders.push(rel);
    }
    const unlisted = offenders.filter((f) => !PRESS_FEEDBACK_ROSTER.has(f));
    expect(
      unlisted,
      `这些页面有 tap handler 却没有任何按压反馈（press-feedback / hover-class 都没有），且不在点名尾单：\n${unlisted.join("\n")}`,
    ).toEqual([]);
    // 尾单反漂移：补了反馈的页必须划掉，不许留成永久豁免
    const stale = [...PRESS_FEEDBACK_ROSTER.keys()].filter((f) => !offenders.includes(f));
    expect(stale, `尾单里这些页面已经有按压反馈了，必须划掉：${stale.join(", ")}`).toEqual([]);
  });
});
