import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 隐私授权前置门（第六轮 W2-5，W2b 接力收口）。
 *
 * <p>判的是一条业务不变量：**调用微信隐私接口（相册/相机/录音/写相册）之前，
 * 必须已经过 `ensurePrivacyAuthorized()`，而且这个守卫必须「等它」并且「在这一次越权调用之前」**。
 * 这一族的失败形态在 DevTools/H5 上看不见（隐私 API 在非 mp-weixin 端直接放行），
 * 只在真机「后台未声明隐私指引 / 用户拒绝协议」时表现为 chooseImage 静默返回空或 errno 112，
 * 所以用最便宜的静态穷尽门覆盖，而不是逐页补挂载测。</p>
 *
 * <p>扫描面（实测口径，写死在下面第一条判点里，数字掉了先怀疑扫描器）：
 * `pages/ subpackages/ components/ utils/ services/ stores/ composables/` 下全部 .vue/.ts，
 * **先剥注释再匹配**——本仓注释里大量出现 `uni.chooseImage` 字样（api.ts 4 处、
 * compress-image.ts 1 处、VoiceRecorder 1 处、privacy.ts 自己的用法示例 1 处），
 * 不剥注释会一次性造出 7 条假红（与 `tests/entity-ddl-drift.spec.mjs` 剥 SQL 注释同一口径）。</p>
 *
 * <p>三条判点：
 * 1. 漏页：有隐私接口调用点的文件必须出现守卫（豁免集必须写理由且只减不增）；
 * 2. 动作路径：每个调用点所在函数里，守卫必须早于该调用；一跳内的本地 helper
 *    （`utils/audio-recorder.ts` 的 `ensurePermission`）或调用方在 `.then` 链里守卫
 *    （`subpackages/support/feedback/index.vue` 的 `chooseImageInternal`）都算覆盖，
 *    两条都走不到就是「导了守卫但没在这条路上用」；
 * 3. 假守卫：`ensurePrivacyAuthorized()` 既不 await 也不接 .then 的裸调用形态＝没等结果，
 *    动作照旧出网，属把守卫当装饰。</p>
 *
 * <p>同族纪律（照 `tests/gate-wiring.spec.mjs` 与 `PHANTOM_DML_EXEMPTIONS`）：
 * 例外必须具名 + 写理由 + 只减不增；例外项一旦不再触发，本门同样判红，逼着把它划掉。</p>
 */

const SRC = resolve(__dirname, "../..");

/** 会被微信隐私协议拦住的接口（与 utils/privacy.ts 头注的敏感接口清单一口径） */
const RESTRICTED_APIS = [
  "chooseImage",
  "chooseMedia",
  "chooseVideo",
  "chooseAudio",
  "chooseMessageFile",
  "saveImageToPhotosAlbum",
  "getRecorderManager",
  "authorize",
] as const;

/** 不含 uploadFile / compressImage：二者不读用户受保护数据，路径来自已过守卫的选择器 */
const RESTRICTED_RE = new RegExp(
  `uni\\.(${RESTRICTED_APIS.join("|")})\\s*\\(`,
  "gu",
);
const GUARD_RE = /ensurePrivacyAuthorized\s*\(/gu;
const GUARD_DECLARATION_RE = /export\s+async\s+function\s+ensurePrivacyAuthorized/u;

/**
 * 「守卫已接上，但这一处调用点刻意不等它」的具名豁免（只减不增，必须写理由）。
 * 建册实测为空：12 个调用受限 API 的生产文件全部在动作路径上过了守卫
 * （其中 `village/detail.vue` 与 `components/common/ShareCard.vue` 是本条判点当场抓到、
 * 本轮补上的两处存量漏页）。
 */
const PRIVACY_ACTION_PATH_EXEMPTIONS: ReadonlyMap<string, string> = new Map();

/**
 * 「调了受限 API 但整页没有守卫」的具名豁免（只减不增，必须写理由）。
 * 建册实测为空（同上，两处存量已在 W2b 补齐）。新页面直接调隐私接口 ⇒ 本条立即红。
 */
const PRIVACY_UNGUARDED_FILE_EXEMPTIONS: ReadonlyMap<string, string> = new Map();

/**
 * 审计在册的 10 个页面（round-6 FINDING F-4.4 计数口径）：
 * 任何一页从守卫名册里消失（改成不判 / 删掉 import）都算退化 ⇒ 红。
 */
const REGISTERED_GUARDED_PAGES = [
  "pages/profile/index.vue",
  "subpackages/campus/campus/certification.vue",
  "subpackages/campus/campus/post-topic.vue",
  "subpackages/circles/circles/post-topic.vue",
  "subpackages/profile-extra/profile/album.vue",
  "subpackages/profile-extra/verification/index.vue",
  "subpackages/setup/profile/index.vue",
  "subpackages/support/feedback/index.vue",
  "subpackages/village/village/post.vue",
  "subpackages/village/village/publish.vue",
] as const;

/* ------------------------------------------------------------------ */
/* 扫描器                                                              */
/* ------------------------------------------------------------------ */

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(vue|ts)$/u.test(entry.name)) acc.push(full);
  }
  return acc;
}

/** 剥块注释 / 行注释 / 模板注释：判点只许看真会被执行的语句 */
function stripComments(text: string): string {
  return text
    // 块注释按原行数换成空行，保证报出来的行号能直接对回源文件
    .replace(/\/\*[\s\S]*?\*\//gu, (m) => "\n".repeat((m.match(/\n/gu) || []).length) + " ")
    .replace(/(^|[^:])\/\/.*$/gmu, "$1")
    .replace(/<!--[\s\S]*?-->/gu, (m) => "\n".repeat((m.match(/\n/gu) || []).length) + " ");
}

interface FnSpan {
  name: string;
  /** 函数头起始下标 */
  start: number;
  /** 函数体（含花括号）结束下标 */
  end: number;
}

/** 找出文件里所有具名函数（声明式与 const 箭头/函数表达式两种形态） */
function collectFunctions(text: string): FnSpan[] {
  const headers: { name: string; at: number }[] = [];
  for (const m of text.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*[(<]/gu)) {
    headers.push({ name: m[1], at: m.index ?? 0 });
  }
  for (const m of text.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:function\s*)?\(?/gu)) {
    // const X = ... 只在右侧是函数（( 或 async ( 或 (params) => ）时算函数边界
    const tail = text.slice((m.index ?? 0) + m[0].length - 1);
    if (!/^\s*(\(|async\s*\(|[A-Za-z0-9_$]+\s*=>)/u.test(tail) && !m[0].trimEnd().endsWith("(")) continue;
    headers.push({ name: m[1], at: m.index ?? 0 });
  }
  const spans: FnSpan[] = [];
  for (const header of headers) {
    const braceAt = text.indexOf("{", text.indexOf("\n", header.at) === -1 ? header.at : header.at);
    if (braceAt === -1) continue;
    const end = matchBrace(text, braceAt);
    if (end === -1) continue;
    spans.push({ name: header.name, start: header.at, end });
  }
  return spans.sort((a, b) => a.start - b.start);
}

/** 从 openAt 处的 `{` 找到配对 `}` 的下标（朴素计数，字符串/模板内的花括号由词法误差容忍） */
function matchBrace(text: string, openAt: number): number {
  let depth = 0;
  for (let i = openAt; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function enclosingFunction(fns: FnSpan[], pos: number): FnSpan | null {
  let best: FnSpan | null = null;
  for (const fn of fns) {
    if (fn.start <= pos && pos <= fn.end) {
      if (!best || fn.start > best.start) best = fn;
    }
  }
  return best;
}

interface Site {
  rel: string;
  api: string;
  pos: number;
  line: number;
}

function lineAt(text: string, pos: number): number {
  return text.slice(0, pos).split("\n").length;
}

function scan() {
  const restricted: Site[] = [];
  const guardFiles = new Set<string>();
  const filesWithRestricted = new Set<string>();
  const perFileText = new Map<string, { text: string; abs: string }>();
  const dirs = ["pages", "subpackages", "components", "utils", "services", "stores", "composables"];
  for (const dir of dirs) {
    const absDir = resolve(SRC, dir);
    for (const abs of walk(absDir)) {
      const rel = abs.slice(SRC.length + 1).replace(/\\/gu, "/");
      const raw = readFileSync(abs, "utf-8");
      const text = stripComments(raw);
      perFileText.set(rel, { text, abs });
      const isDefinition = GUARD_DECLARATION_RE.test(text);
      for (const m of text.matchAll(GUARD_RE)) {
        if (isDefinition) continue; // utils/privacy.ts 自身是守卫实现，不是消费方
        guardFiles.add(rel);
      }
      for (const m of text.matchAll(RESTRICTED_RE)) {
        restricted.push({ rel, api: m[1], pos: m.index ?? 0, line: lineAt(text, m.index ?? 0) });
        filesWithRestricted.add(rel);
      }
    }
  }
  return { restricted, guardFiles, filesWithRestricted, perFileText };
}

const world = scan();

/* ------------------------------------------------------------------ */
/* 判点                                                                */
/* ------------------------------------------------------------------ */

describe("隐私授权前置门（W2-5）", () => {
  it("扫描面分母：受限 API 调用文件与调用点数不许悄悄掉（掉了先怀疑扫描器）", () => {
    // 实测：12 个生产文件有隐私接口调用点、14 处调用点、14 个生产文件引用守卫
    // （引用守卫但不直接越权的 2 个：village/post.vue 与 village/publish.vue，
    //   它们经 utils/media.ts 的 chooseImages 间接过守卫）
    expect(
      world.filesWithRestricted.size,
      `带隐私接口调用点的生产文件数应为 12+（当前 ${world.filesWithRestricted.size}）——数字掉了就是扫描面出问题`,
    ).toBeGreaterThanOrEqual(12);
    expect(
      world.restricted.length,
      `隐私接口调用点应为 14+（当前 ${world.restricted.length}）`,
    ).toBeGreaterThanOrEqual(14);
    expect(
      world.guardFiles.size,
      `引用 ensurePrivacyAuthorized 的生产文件应为 14+（当前 ${world.guardFiles.size}）——只减不增的在册名册`,
    ).toBeGreaterThanOrEqual(14);
    // 阳性对照：审计在册的 10 页必须全部被扫描到，否则说明扫描目录漏了某一层
    for (const page of REGISTERED_GUARDED_PAGES) {
      expect(world.guardFiles.has(page), `${page} 应被扫描到（扫描面出问题）`).toBe(true);
    }
  });

  it("判点 1（漏页）：每个调隐私接口的生产文件都必须有隐私授权守卫", () => {
    const violations: string[] = [];
    for (const rel of [...world.filesWithRestricted].sort()) {
      if (world.guardFiles.has(rel)) continue;
      if (PRIVACY_UNGUARDED_FILE_EXEMPTIONS.has(rel)) continue;
      const sites = world.restricted.filter((s) => s.rel === rel);
      violations.push(
        `${rel} 调用 ${sites.map((s) => `uni.${s.api}(L${s.line})`).join(" / ")}，但整页没有 ensurePrivacyAuthorized`,
      );
    }
    expect(violations, `存在「未过隐私授权就调用受限 API」的漏页：\n${violations.join("\n")}`).toEqual([]);

    // 豁免只减不增：已登记的例外如今若不再违例，必须从册子里划掉
    for (const rel of PRIVACY_UNGUARDED_FILE_EXEMPTIONS.keys()) {
      expect(
        world.filesWithRestricted.has(rel) && !world.guardFiles.has(rel),
        `PRIVACY_UNGUARDED_FILE_EXEMPTIONS 里的 ${rel} 现在已经不违例了，必须划掉这条豁免`,
      ).toBe(true);
    }
  });

  it("判点 2（动作路径）：每个调用点所在动作路径上，守卫必须早于该调用", () => {
    const violations: string[] = [];
    for (const site of world.restricted) {
      const key = `${site.rel}#uni.${site.api}@L${site.line}`;
      const entry = world.perFileText.get(site.rel);
      if (!entry) continue;
      const { text } = entry;
      if (!world.guardFiles.has(site.rel)) continue; // 已由判点 1 记账
      const fns = collectFunctions(text);
      const guardPositions = [...text.matchAll(GUARD_RE)].map((m) => m.index ?? 0);

      const covered = isCovered(site.pos, fns, guardPositions, text);
      if (!covered && !PRIVACY_ACTION_PATH_EXEMPTIONS.has(key)) {
        violations.push(`${key} 所在函数及其一跳调用方/helper 里都没有早于它的 ensurePrivacyAuthorized`);
      }
    }
    expect(violations, `存在「守卫不在动作路径上」的调用点：\n${violations.join("\n")}`).toEqual([]);

    for (const key of PRIVACY_ACTION_PATH_EXEMPTIONS.keys()) {
      const [rel, tail] = key.split("#");
      const api = tail.slice("uni.".length).split("@")[0];
      const line = Number(key.slice(key.lastIndexOf("L") + 1));
      const still = world.restricted.some((s) => s.rel === rel && s.api === api && s.line === line);
      expect(still, `PRIVACY_ACTION_PATH_EXEMPTIONS 里的 ${key} 现在已不存在，必须划掉这条豁免`).toBe(true);
    }
  });

  it("判点 3（假守卫）：ensurePrivacyAuthorized() 不许「调了不等」", () => {
    const violations: string[] = [];
    for (const [rel, entry] of world.perFileText) {
      if (!world.guardFiles.has(rel)) continue;
      const { text } = entry;
      for (const m of text.matchAll(GUARD_RE)) {
        const pos = m.index ?? 0;
        const before = text.slice(Math.max(0, pos - 12), pos);
        const after = text.slice(pos + m[0].length, pos + m[0].length + 40);
        const awaited = /await\s*$/u.test(before);
        const chained = /^\s*\)\s*\.then\s*\(/u.test(after) || /^\s*\.then\s*\(/u.test(after);
        if (!awaited && !chained) {
          violations.push(`${rel}:L${lineAt(text, pos)} 出现裸调用「${before.trim()}ensurePrivacyAuthorized()」，既没 await 也没接 .then ⇒ 动作不等授权`);
        }
      }
    }
    expect(violations, `存在「调了不等」的装饰性守卫：\n${violations.join("\n")}`).toEqual([]);
  });

  it("判点 4（在册名册）：审计登记的 10 页守卫不许被拆掉", () => {
    const dropped: string[] = [];
    for (const page of REGISTERED_GUARDED_PAGES) {
      const entry = world.perFileText.get(page);
      if (!entry) {
        dropped.push(`${page} 已不在扫描结果里（源文件被移动或删除？）`);
        continue;
      }
      if (!GUARD_RE.test(entry.text)) {
        dropped.push(`${page} 不再引用 ensurePrivacyAuthorized`);
      }
      GUARD_RE.lastIndex = 0;
    }
    expect(dropped, `隐私授权在册页面被减员（本族闸门只许增不许减）：\n${dropped.join("\n")}`).toEqual([]);
  });
});

/**
 * 覆盖判定（一跳）：
 * 1. 调用点所在函数体内、且位置早于调用点，出现守卫 ⇒ 覆盖；
 * 2. 该函数体内早于调用点调用了本文件的某个具名函数，而那个函数体内有守卫 ⇒ 覆盖
 *    （`utils/audio-recorder.ts` 的 `ensurePermission()` 形态）；
 * 3. 本文件另有某个函数，其体内守卫早于它对「调用点所在函数」的调用 ⇒ 覆盖
 *    （`subpackages/support/feedback/index.vue` 的 `void ensurePrivacyAuthorized().then(() => chooseImageInternal())` 形态）。
 */
function isCovered(sitePos: number, fns: FnSpan[], guardPositions: number[], text: string): boolean {
  const own = enclosingFunction(fns, sitePos);
  const earlyGuards = guardPositions.filter((g) => g < sitePos);
  if (own) {
    if (earlyGuards.some((g) => g >= own.start && g <= own.end)) return true;
    // 形态 2：一跳 helper
    for (const helper of fns) {
      if (helper === own) continue;
      const callAt = findCallOffset(text, helper.name, own.start, sitePos);
      if (callAt === -1) continue;
      if (guardPositions.some((g) => g >= helper.start && g <= helper.end)) return true;
    }
    // 形态 3：被调用方（本页 chooseImageInternal 形态）
    if (own.name) {
      for (const caller of fns) {
        if (caller === own) continue;
        const callAt = findCallOffset(text, own.name, caller.start, caller.end);
        if (callAt === -1) continue;
        if (guardPositions.some((g) => g >= caller.start && g < callAt)) return true;
      }
    }
    return false;
  }
  // 调用点不在任何具名函数里（模块顶层/setup 直书）：只要文件内早于它出现过守卫
  return earlyGuards.length > 0;
}

/** 在 [from, to) 区间里找 `name(` 或 `name();` 形式的调用（排除定义行自身），返回相对全文的下标 */
function findCallOffset(text: string, name: string, from: number, to: number): number {
  const re = new RegExp(`\\b${name.replace(/\$/gu, "\\$")}\\s*\\(`, "gu");
  re.lastIndex = from;
  for (let m = re.exec(text); m !== null && m.index < to; m = re.exec(text)) {
    const head = text.slice(Math.max(0, m.index - 20), m.index);
    if (/(function|const|let)\s+$/u.test(head)) continue; // 定义行
    return m.index;
  }
  return -1;
}
