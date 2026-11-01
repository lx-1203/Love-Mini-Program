import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

/**
 * 封存粒度门（R7-C 第 1 批 · 门 2，round-6 F-4.1 / F-7 方案）。
 *
 * <p>同一族商业化封存在页面层出现过三种粒度：只判总闸 `isCommerceOn()`（无参）、
 * 分域 `isCommerceOn("coin")` / `("consult")` / `("vip")`、以及 love-center 自造的
 * `isBoardSealed()`。F-4.1 实测：若运维只封 `commerce.coin` 而开总闸，商城两页
 * （shop/detail，无参口径）不会封存——这是唯一两处「只判总闸」的页面，且仓内没有
 * 判点声明这是有意设计。本门不改这个口径（裁定留给产品/后续批次），只把它钉成账：</p>
 *
 * <ol>
 *   <li>① 实参集合 ⊆ 后端下发的 commerce 键集。兼容口径清单 = stores/app-config.ts
 *      的 isCommerceOn JSDoc（「用法：isCommerceOn("vip") / ("coin") / ("course") /
 *      ("consult")；不传 module 仅判断总闸」）+ MP-R1-CONSULTING-001 的 commerce.&lt;module&gt;
 *      双口径。F-4.1 实测后端下发 5 键：commerce.enabled / coin / consult / course / vip。
 *      页面传了清单外的 module（拼错键名）⇒ 恒封存/恒放行，红。</li>
 *   <li>② 无参调用（只判总闸 commerce.enabled）只允许出现在实测的 2 页：
 *      market/shop、market/detail。新页面用无参口径必须先来这里写理由。</li>
 *   <li>③ 每个调用页登记进「页面 → module」表（新页调 isCommerceOn 不登记即红），
 *      且登记的 module 必须与盘上实参一致（登记漂了也红）。</li>
 * </ol>
 *
 * <p>扫描面：src/ 下全部 .vue/.ts（排除 tests/ 与 stores/app-config.ts 自身——
 * 它是 getter 定义处，JSDoc 里的用法示例不是调用点）。先剥注释再匹配：
 * love-center/index.vue:72 那句「该页自身按 isCommerceOn("consult") 封存」是注释，
 * 不剥会造假调用点。形态照抄 stores/logout-registry.spec.ts / privacy-gate-wiring.spec.ts。</p>
 */

/* 本文件在 apps/client/src/tests/ 下，"..": apps/client/src。
   R7-C 半成品曾写成 "../.."（= apps/client）⇒ 扫进了构建产物目录、相对路径全带 src/ 前缀，
   登记表（无前缀口径）整表失配，8 页全部假报「未登记」。 */
const CLIENT_SRC = resolve(__dirname, "..");

/** 后端下发 + store 兼容口径承认的 module 键（出处：stores/app-config.ts isCommerceOn JSDoc；F-4.1 实测后端 5 键） */
const ALLOWED_MODULES = new Set(["coin", "consult", "course", "vip"]);

/** 无参（只判总闸 commerce.enabled）的具名允许页——只减不增，新页必须写理由 */
const NO_ARG_ALLOWED_PAGES = new Map<string, string>([
  [
    "subpackages/market/shop/index.vue",
    "F-4.1 实测口径：商城列表页只判总闸（commerce.enabled），不随 commerce.coin 封存。「商城归总闸管还是归 coin 管」产品未裁定（ADR-2 未写），本行只钉现状，改口径时同步改这里。",
  ],
  [
    "subpackages/market/detail/index.vue",
    "同上：商品详情页与 shop 同一无参口径（F-4.1 两处「只判总闸」之一）。",
  ],
]);

/**
 * 「页面 → module」登记表（2026-11-01 R7-C 建门时逐文件实测重钉；
 * module=∅ 表示该页只用无参总闸口径）。
 * F 页（round-6）读数 coin 5 / consult 3 / course 1 / vip 1 与本轮实测有漂移
 * （后续轮次改过 love-center 与 vip 页），以本表现值为准：
 */
const PAGE_MODULE_REGISTRY = new Map<string, Set<string>>([
  ["pages/profile/index.vue", new Set(["vip"])], // :1325 :1477 会员卡/徽章
  ["subpackages/discover-extra/likes/index.vue", new Set(["coin"])], // :66 解锁属 coin
  ["subpackages/discover-extra/likes-visitors/index.vue", new Set(["coin"])], // :57
  ["subpackages/market/shop/index.vue", new Set()], // 无参（见 NO_ARG_ALLOWED_PAGES）
  ["subpackages/market/detail/index.vue", new Set()], // 无参（同上）
  ["subpackages/market/wallet/index.vue", new Set(["coin"])], // :57
  ["subpackages/profile-extra/settings/index.vue", new Set(["coin"])], // :371
  ["subpackages/tools/love-center/index.vue", new Set(["consult"])], // :76 isBoardSealed 内
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "tests") continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && /\.(vue|ts)$/u.test(entry.name)) acc.push(full);
  }
  return acc;
}

/** 剥块注释/行注释/模板注释（换行保形，报错行号可回溯；与 privacy-gate-wiring.spec.ts 同口径） */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//gu, (m) => " ".repeat(m.length))
    .replace(/(^|[^:])\/\/.*$/gmu, "$1")
    .replace(/<!--[\s\S]*?-->/gu, (m) => " ".repeat(m.length));
}

interface CallSite {
  file: string;
  module: string | null;
}

function collectCallSites(): CallSite[] {
  const sites: CallSite[] = [];
  for (const abs of walk(CLIENT_SRC)) {
    const rel = relative(CLIENT_SRC, abs).split(/[\\/]/gu).join("/");
    if (rel === "stores/app-config.ts") continue; // getter 定义处，JSDoc 用法示例不是调用
    const text = stripComments(readFileSync(abs, "utf8"));
    for (const m of text.matchAll(/isCommerceOn\s*\(\s*(?:"([^"]+)"|'([^']+)')?/gu)) {
      sites.push({ file: rel, module: m[1] ?? m[2] ?? null });
    }
  }
  return sites;
}

const sites = collectCallSites();
const filesWithCalls = new Set(sites.map((s) => s.file));

describe("封存粒度门：isCommerceOn 的 module 实参 × 页面登记表", () => {
  it("扫描面非空：调用点 ≥9、调用页 ≥8（掉了先怀疑扫描器/剥注释逻辑）", () => {
    // 实测（2026-11-01）：9 个调用点、8 个调用文件（pages/profile 2 处 vip + coin 4 页
    // + consult 1 页 + 无参 2 页；stores/app-config.ts 自身已排除）
    expect(sites.length, `只解析到 ${sites.length} 个调用点`).toBeGreaterThanOrEqual(9);
    expect(filesWithCalls.size, `只解析到 ${filesWithCalls.size} 个调用文件`).toBeGreaterThanOrEqual(8);
  });

  it("① 实参集合 ⊆ 兼容口径清单 {coin, consult, course, vip}（拼错键名=恒封存/恒放行）", () => {
    const illegal = sites
      .filter((s) => s.module !== null && !ALLOWED_MODULES.has(s.module))
      .map((s) => `${s.file} → isCommerceOn("${s.module}") 不在 stores/app-config.ts 承认的键集里`);
    expect(illegal, `未知 module 实参（后端不下发此键 ⇒ 判定恒定，封存形同虚设）：\n${illegal.join("\n")}`).toEqual([]);
  });

  it("② 无参调用（只判总闸）只允许出现在 market/shop 与 market/detail 两页", () => {
    const noArg = sites.filter((s) => s.module === null);
    const offenders = noArg
      .filter((s) => !NO_ARG_ALLOWED_PAGES.has(s.file))
      .map((s) => `${s.file} 用无参 isCommerceOn()（只判 commerce.enabled 总闸）——F-4.1：这会让该页对 commerce.coin=false 视而不见；确属总闸口径请登记进 NO_ARG_ALLOWED_PAGES 并写理由`);
    expect(
      offenders,
      `无参调用出现在登记页之外：\n${offenders.join("\n")}`,
    ).toEqual([]);
    // 豁免只减不增：登记页若已改成带参，划掉它
    for (const page of NO_ARG_ALLOWED_PAGES.keys()) {
      expect(
        sites.some((s) => s.file === page && s.module === null),
        `NO_ARG_ALLOWED_PAGES 里的 ${page} 已不再无参调用，必须划掉这条豁免`,
      ).toBe(true);
    }
  });

  it("③ 每个调用页都登记在「页面 → module」表里，且登记与盘上实参一致（新页不登记即红）", () => {
    const unregistered = [...filesWithCalls]
      .filter((f) => !PAGE_MODULE_REGISTRY.has(f))
      .sort()
      .map((f) => `${f} 调用了 isCommerceOn 但没登记进 PAGE_MODULE_REGISTRY`);
    expect(unregistered, `未登记的调用页：\n${unregistered.join("\n")}`).toEqual([]);

    const stale = [...PAGE_MODULE_REGISTRY.keys()]
      .filter((f) => !filesWithCalls.has(f))
      .map((f) => `PAGE_MODULE_REGISTRY 里的 ${f} 盘上已无 isCommerceOn 调用，必须划掉`);
    expect(stale, `登记表指向已不存在的调用页：\n${stale.join("\n")}`).toEqual([]);

    for (const [file, registered] of PAGE_MODULE_REGISTRY) {
      const actual = new Set(sites.filter((s) => s.file === file).map((s) => s.module ?? ""));
      /* 登记表约定 ∅（空集）= 该页只用无参总闸口径；实参侧无参算作 ""。
         两侧归一后再比，否则 ∅ 与 {""} 永远判不一致（R7-C 验收时抓到的形状）。 */
      const registeredNorm = registered.size === 0 ? new Set([""]) : registered;
      const missing = [...actual].filter((m) => !registeredNorm.has(m));
      const extra = [...registeredNorm].filter((m) => !actual.has(m));
      expect(
        missing.length === 0 && extra.length === 0,
        `${file} 的登记 module ${[...registeredNorm].map((m) => m || "(无参)")} 与盘上实参 ${[...actual].map((m) => m || "(无参)")} 不一致（漂了 ${[...missing, ...extra].map((m) => m || "(无参)").join(", ")}）——登记表必须跟着源码同步改`,
      ).toBe(true);
    }
  });
});
