#!/usr/bin/env node
/**
 * 档位新鲜度门：一条执行轮的判决值多少，取决于「跑的那包是不是本轮源码的那包」。
 *
 * 为什么单独立这道门（本轮实测出来的两个洞）：
 *   A 刀 1107 例跑在 20:25→22:14，期间 21:38/21:40 还在改 src，mock 包 22:22 才重建
 *     ⇒ 那一整轮的 EXECUTED 判的是改之前的构建，却盖着 gitSha=改之后的 HEAD；
 *   showcase 包缺 isAllowedMediaExt / parsePrivateQuoteContext / pinnedNotice
 *     ⇒ 拿它补 VIP 那 17 条，等于用旧源码测新档位。
 *
 * 两类"源码比产物新"必须分开算，混在一起就得出假结论：
 *   dirty（与 HEAD 不同）⇒ 真的有我的改动没进包 ⇒ 判红；
 *   clean（与 HEAD 相同）⇒ 只是构建脚本改完又原样写回（strip-mock 那类），mtime 变了字节没变
 *     ⇒ 只是噪声，列出来但不否决。上一轮我自己就差点把后者读成"产物过期"。
 *
 * 用法：node scripts/qa/verify-band-freshness.mjs \
 *         [--src apps/client/src] [--bands mock=...,real=...,showcase=...] \
 *         [--markers markers.json] [--deep-file-limit 40]
 *   markers.json：[{ "symbol": "isAllowedMediaExt", "bands": ["mock","real"], "from": "MP-...-016" }]
 *   符号只能挑"跨 chunk 导出名"这类真会留在产物里的名字 —— 模块内常量会被 minify 内联改名，
 *   拿它做判点会得到一个永远缺失的假红（本轮 ALLOWED_MEDIA_EXTS 在三档里都是 0，就是这个形状）。
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, sep, posix } from "node:path";
import { readApiMode } from "./artifact-band.mjs";

/* 档位名字要和产物自己的 mode 字段对上。
   本轮实测踩过：把 npm 的 build:mp-weixin:showcase 当"重建 showcase 档"用 —— 它没有 --outDir，
   uni-app 就按平台写到 dist/build/mp-weixin，把 **mock 档原地换成 real 档**，
   而目录名还叫 mp-weixin，于是"mock 档是干净的"这类结论全部成立、全部是假的。
   新鲜度只能查"字节新旧"，查不出"这包是不是这一档"，所以这一问必须由名字来问。 */
const BAND_MODE_EXPECT = {
  mock: { mode: "mock", viteMode: "mp-weixin-mock" },
  real: { mode: "real", viteMode: "real" },
  showcase: { mode: "real", viteMode: "mp-weixin-showcase" },
};

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const SRC = arg("src", join(ROOT, "apps", "client", "src"));
const BANDS_RAW = arg("bands", [
  "mock=" + join(ROOT, "apps", "client", "dist", "build", "mp-weixin"),
  "real=" + join(ROOT, "apps", "client", "dist", "build", "mp-weixin-real"),
  "showcase=" + join(ROOT, "apps", "client", "dist", "build", "mp-weixin-showcase"),
].join(","));
const MARKERS_FILE = arg("markers", join(ROOT, "scripts", "qa", "band-freshness-markers.json"));
const DEEP_LIMIT = Number(arg("deep-file-limit", 40));
const OUT_JSON = arg("out", null);

const problems = [];
const suspects = [];   // mtime 级嫌疑：等第二级用内容定罪或洗清
const say = (s) => console.log(s);

const bands = BANDS_RAW.split(",").map((kv) => {
  const i = kv.indexOf("=");
  return { name: kv.slice(0, i), dir: kv.slice(i + 1) };
});

if (!existsSync(SRC)) { say(`FRESH_RESULT=FAIL reason=源码目录不存在：${SRC}`); process.exit(2); }

/* git 脏项：用于区分「产物真的没吃进我的改动」与「构建脚本原样写回导致的 mtime 噪声」。 */
let dirty = new Set();
try {
  const out = execFileSync("git", ["status", "--porcelain", "--", relative(ROOT, SRC).split(sep).join(posix.sep)],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 });
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^\s*\S+\s+(.+)$/);
    // Set 的方法是 add —— 写成 Map 的 set 会抛 "dirty.set is not a function"，
    // 而它被自己的 catch 咽掉后，脏项集合是空的，于是**所有**源码文件都被判成"与 HEAD 相同"，
    // 真正的"产物早于我的改动"会被归进 mtime 噪声：门禁会朝反方向绿。
    if (m) dirty.add(join(ROOT, m[1]).replace(/\\/g, "/"));
  }
} catch (e) {
  /* 这里必须带栈：脏项集合一旦建不起来，后面所有 src 文件都会被误判成「与 HEAD 相同」，
     于是真正的"产物早于我的改动"被归进 mtime 噪声 —— 门禁会绿得完全相反。 */
  problems.push(`读不到 git 脏项 ⇒ 无法区分「真过期」与「构建脚本写回的 mtime 噪声」：${String(e.stack || e.message).split("\n").slice(0, 3).join(" ⏎ ")}`);
}
/* 脏项"读成功但一条也没解析出来"与"工作树真的干净"是两件事：前者会让所有判点退化成噪声。
   这里用行数 vs 解析数对一次，对不上就判红，而不是安静地给出一个看起来正常的 0。 */
const porcelainLines = (() => {
  try {
    return execFileSync("git", ["status", "--porcelain", "--", relative(ROOT, SRC).split(sep).join(posix.sep)],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 }).split(/\r?\n/).filter((l) => l.trim()).length;
  } catch { return -1; }
})();
if (porcelainLines > 0 && dirty.size === 0) {
  problems.push(`git 报了 ${porcelainLines} 行脏项，但脏项集合是空的 ⇒ 解析器没解析出任何东西，本门的「真过期/噪声」区分不成立`);
}

function walkFiles(dir, stopAt) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let ents;
    try { ents = readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else { out.push(p); if (stopAt && out.length > stopAt) return out; }
    }
  }
  return out;
}

const srcFiles = walkFiles(SRC).filter((p) => /\.(vue|ts|js|json|scss|css)$/.test(p));
const srcStamp = srcFiles.map((p) => {
  const key = p.replace(/\\/g, "/");
  return { p: key, m: statSync(p).mtimeMs, gitClean: !dirty.has(key) };
});
const srcDirtyNewest = srcStamp.filter((x) => !x.gitClean).reduce((a, b) => Math.max(a, b.m), 0);

const rows = [];
for (const b of bands) {
  if (!existsSync(b.dir)) { problems.push(`档位 ${b.name} 的产物不存在：${b.dir}`); rows.push({ ...b, missing: true }); continue; }
  const files = walkFiles(b.dir);
  let newest = 0;
  for (const p of files) { try { const m = statSync(p).mtimeMs; if (m > newest) newest = m; } catch { /* 断链：本门不否决，交给完整性门 */ } }
  const restored = srcStamp.filter((x) => x.gitClean && x.m > newest).map((x) => x.p);
  const lateDirty = srcStamp.filter((x) => !x.gitClean && x.m > newest).map((x) => x.p);
  rows.push({
    ...b, files: files.length, newestArtifact: new Date(newest).toISOString(), newestArtifactMs: newest,
    srcDirtyNewest: srcDirtyNewest ? new Date(srcDirtyNewest).toISOString() : null,
    restoredTouch: restored.length, restoredSample: restored.slice(0, DEEP_LIMIT),
    lateDirty: lateDirty.length, lateDirtySample: lateDirty.slice(0, DEEP_LIMIT),
  });
  const bm = BAND_MODE_EXPECT[b.name];
  const got = readApiMode(b.dir);
  rows[rows.length - 1].apiMode = got.mode;
  rows[rows.length - 1].viteMode = got.viteMode;
  if (bm) {
    if (!existsSync(got.envFile)) problems.push(`档位 ${b.name} 读不到 config/env.js ⇒ 无法确认这一档到底是不是这一档：${got.envFile}`);
    else if (got.mode !== bm.mode || got.viteMode !== bm.viteMode) {
      problems.push(`档位 ${b.name} 的产物模式不符：VITE_API_MODE=${got.mode}（应 ${bm.mode}）、MODE=${got.viteMode}（应 ${bm.viteMode}）⇒ 这个目录已被别的档位的构建覆盖，这一档上的全部判决作废`);
    }
  }
  if (lateDirty.length) suspects.push({ band: b.name, n: lateDirty.length });
}

/* 标记符号：不是"源码有没有"，而是"这一档产物里有没有" —— 专治 showcase 那种整包没跟上修复波。 */
let markers = [];
if (existsSync(MARKERS_FILE)) {
  try { markers = JSON.parse(readFileSync(MARKERS_FILE, "utf8")).markers || []; }
  catch (e) { problems.push(`标记件不可解析 ${MARKERS_FILE}：${String(e.message).slice(0, 90)}`); }
} else say(`FRESH_NOTE=没有 ${relative(ROOT, MARKERS_FILE)}，跳过符号级深检（mtime 判定仍然生效）`);

const byName = Object.fromEntries(bands.map((b) => [b.name, b.dir]));

/* ------- 第二级：内容级判定。mtime 只能筛出"嫌疑"，不能定罪 -------
   一个文件「比产物新」有两种完全不同的成因：构建脚本读它、改它、又原样写回（strip-mock 就是这种），
   和"产物真的没吃进我的改动"。en-US.ts 就是前者：它相对 HEAD 是脏的（我改的），
   但产物里已经带上我改的内容了 —— 只按 mtime 判，会得到一个假红。
   所以把嫌疑文件相对 HEAD 的**新增字符串字面量**抠出来，直接在该档产物的全部字节里找：
   字面量（i18n 文案、类名）不会被 minify 改名，标识会 —— 所以只拿字面量当探针。 */
const BLOB_CAP = 220 * 1024 * 1024;
const blobCache = {};
function blobOf(bandName) {
  if (blobCache[bandName] !== undefined) return blobCache[bandName];
  const dir = byName[bandName];
  let text = "", bytes = 0, files = 0;
  for (const p of walkFiles(dir)) {
    if (!/\.(js|wxml|json|wxss)$/.test(p)) continue;
    let s;
    try { s = readFileSync(p, "utf8"); } catch { continue; }
    bytes += Buffer.byteLength(s); files++;
    if (bytes > BLOB_CAP) break;
    text += s;
  }
  blobCache[bandName] = { text, bytes, files };
  return blobCache[bandName];
}
/* 有些新增是"纯函数 / 纯导出"，没有任何 ≥6 字符的字符串字面量（本轮 utils/profile-meta.ts 就是）：
   这类文件如果一律"无法定罪"，门就永远对它沉默 —— 而沉默的门会被下一次真过期复用。
   改用**新增的导出符号名**当探针：导出名要跨文件被引用，构建不能把它改掉，
   所以"全命中=吃进了改动、全不命中=真过期、部分命中=仍不可定"是站得住的三态。 */
function addedExports(relFile) {
  let diff;
  try { diff = execFileSync("git", ["diff", "-U0", "HEAD", "--", relFile], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 }); } catch { return []; }
  const names = new Set();
  for (const line of diff.split(/\r?\n/)) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const m = line.slice(1).match(/^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]{5,})/);
    if (m) names.add(m[1]);
  }
  return [...names];
}

function addedLiterals(relFile) {
  let diff;
  try {
    diff = execFileSync("git", ["diff", "-U0", "HEAD", "--", relFile], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
  } catch { return null; }
  const lits = new Set();
  for (const line of diff.split(/\r?\n/)) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    /* 注释行必须整条跳过：注释永远不进产物，拿它当探针等于"任何档都过期"——
       本轮第一次跑就差点把「底部留白分两档」「半透明品牌绿」这类我自己写的注释判成缺失证据。 */
    let t = line.slice(1).trim();
    if (/^(\/\/|\/\*|\*)/.test(t)) continue;
    t = t.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
    for (const m of t.matchAll(/["'`]([^"'`\n]{6,})["'`]/g)) for (const piece of String(m[1]).split(/\$\{[^{}]*\}/g)) if (piece.trim().length >= 6) lits.add(piece.trim());
    // 没被引号包住的也算：模板里的中文文案、BEM 类名，这些同样会原样进产物
    for (const m of t.matchAll(/[一-龥]{4,}/g)) lits.add(m[0]);
    for (const m of t.matchAll(/[\w-]+(?:__|--)[\w-]+/g)) lits.add(m[0]);
  }
  /* 正则片段（含 * 或 \）在产物里是以编译后形态存在的，原样搜必然搜不到。 */
  return [...lits].filter((s) => !/[*\\]/.test(s)).slice(0, 30);
}
/* 测试文件不参与本门的判定：vitest 的 spec 从来不会被编进小程序产物，
   拿"产物里找不到它"去判一档过期，是一个永远正确的假红。 */
const NOT_COMPILED = /(^|\/)tests?\//;
/* mock 源码域：real / showcase 两档的构建链里有 strip-mock-for-mp，按设计不进包。
   在这两档上"搜不到 mock 常量的新增字面量"证明的是档位不承载，不是构建没吃进改动。 */
const MOCK_STRIPPED = /(^|\/)src\/services\/mocks\//;

/* 定罪之前先问一句「这一档到底载不载这个文件的内容」—— 同一类陷阱的第二种形状：
   实测 mock/real 两档对 zh-CN.ts 既有字面量的命中率 99%，对 en-US.ts 只有 8%
   ⇒ 构建根本没把英文语料打进包。此时"我新增的英文文案不在包里"不为"包是旧的"，
   它只证明这个载具表达不了这个文件。拿它定罪会得到一个针对 mock/real 的假红。
   校准量用 HEAD 版里**我没动过**的那些字面量：它们在包里的命中率就是该文件在该档的可观测度。 */
function baseLiterals(relFile, exclude) {
  let src;
  try { src = execFileSync("git", ["show", "HEAD:" + relFile], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 }); }
  catch { return []; }
  const out = [];
  const seen = new Set();
  for (const line of src.split(/\r?\n/)) {
    const t = line.trim();
    if (/^(\/\/|\/\*|\*)/.test(t)) continue;
    for (const m of t.matchAll(/["'`]([^"'`\n]{6,})["'`]/g)) {
      /* 模板串要按 ${} 切成静态段再收：整串在打包产物里根本搜不到（插值被拆开、
         标识符被改名），拿整串去定罪就把一次正常构建判成「这一档过期」。
         2026-09-27 showcase 档就是这么假红了一次（campus-topic-${Date.now()}-${uploaded.length}.jpg）。 */
      for (const piece of String(m[1]).split(/\$\{[^{}]*\}/g)) {
        const v = piece.trim();
        if (v.length < 6 || /[*\\]/.test(v) || exclude.has(v) || seen.has(v)) continue;
        seen.add(v); out.push(v);
        if (out.length >= 40) return out;
      }
    }
  }
  return out;
}

const stale = [];      // 内容确认不在包里 ⇒ 这一档真的过期
const mtimeOnly = [];  // 字面量全在包里 ⇒ 只是构建脚本写回的 mtime 噪声
const undecidable = []; // 新增行里没有可搜字面量 ⇒ 不许凭 mtime 定罪，也不许判清白
let skippedTests = 0;
let skippedAfterConviction = 0;
const notObservable = []; // 该档根本不承载这个文件的内容 ⇒ 不能定罪，也不能判清白
for (const r of rows) {
  if (r.missing || !r.lateDirty) continue;
  /* 一档被前面某个文件定罪之后，这一档"过期"就是定案：剩下的嫌疑文件只会把同一条结论复制几十遍，
     既不提供新证据，又把真正的首因埋在一屏重复里。 */
  if (stale.some((s) => s.band === r.name)) { skippedAfterConviction += r.lateDirty; continue; }
  const absList = srcStamp.filter((x) => !x.gitClean && x.m > r.newestArtifactMs).map((x) => x.p);
  for (const abs of absList.slice(0, DEEP_LIMIT)) {
    const rel = relative(ROOT, abs).replace(/\\/g, "/");
    if (NOT_COMPILED.test(rel)) { skippedTests++; continue; }
    const lits = addedLiterals(rel);
    if (lits === null) { undecidable.push({ band: r.name, rel, why: "git diff 读不出（该文件可能从未提交过）" }); continue; }
    if (!lits.length) {
      /* 有些文件天生没有可搜足迹：utils/media.ts 新增的是一串 4 字符扩展名（".jpg" 这种），
         既低于字面量长度门槛，也太通用，搜到也不说明问题。这类文件由"覆盖它的标记符号"说话 ——
         否则本门对它永远判红，而一把永远红的门等于没有门。 */
      const cover = markers.filter((mk) => Array.isArray(mk.covers) && mk.covers.some((c) => rel.endsWith(c)));
      if (cover.length) {
        const blob = blobOf(r.name);
        const hit = cover.filter((mk) => blob.text.includes(mk.symbol));
        if (hit.length === cover.length) { mtimeOnly.push({ band: r.name, rel, needles: 0, viaMarkers: cover.map((mk) => mk.symbol) }); continue; }
        undecidable.push({ band: r.name, rel, why: `覆盖它的标记里只有 ${hit.length}/${cover.length} 个在该档产物中命中：${cover.map((mk) => mk.symbol + "=" + (blob.text.includes(mk.symbol) ? 1 : 0)).join(" ")}` });
        continue;
      }
      const exps = addedExports(rel);
      if (exps.length) {
        const blobX = blobOf(r.name);
        const hitX = exps.filter((n) => blobX.text.includes(n));
        if (hitX.length === exps.length) { mtimeOnly.push({ band: r.name, rel, needles: 0, viaExports: exps }); continue; }
        if (hitX.length === 0) { stale.push({ band: r.name, rel, needles: exps.length, missing: exps.length, sample: exps.slice(0, 3), baseRate: null, viaExports: true }); break; }
        undecidable.push({ band: r.name, rel, why: `新增导出符号只有 ${hitX.length}/${exps.length} 个在该档产物中命中：${exps.join(" ")}` });
        continue;
      }
      undecidable.push({ band: r.name, rel, why: "新增行里没有 ≥6 字符的字符串字面量，无法用内容定罪" });
      continue;
    }
    const blob = blobOf(r.name);
    const litSet = new Set(lits);
    const base = baseLiterals(rel, litSet);
    const baseHit = base.length ? base.filter((n) => blob.text.includes(n)).length : 0;
    const baseRate = base.length ? baseHit / base.length : null;
    /* mock 源码域在 real / showcase 两档是被 strip-mock-for-mp 主动剔掉的：
       那一档里搜不到某个 mock 常量的新增字面量，证明的是"这档不带 mock 数据"，
       不是"构建没吃进改动"。2026-09-27 实测：mock 档洗清、real 档却给 fixtures.ts 定罪，
       就是这个形状 —— 不豁免的话每一张真实档重建都会被它拦下。 */
    if (MOCK_STRIPPED.test(rel) && r.name !== "mock") {
      notObservable.push({ band: r.name, rel, baseRate: 0, added: lits.length, addedHit: lits.filter((n) => blob.text.includes(n)).length, why: "该档构建链里有 strip-mock-for-mp，mock 源码域按设计不进包" });
      continue;
    }
    if (base.length >= 5 && baseRate < 0.25) {
      notObservable.push({ band: r.name, rel, baseRate, added: lits.length, addedHit: lits.filter((n) => blob.text.includes(n)).length });
      continue;
    }
    const missing = lits.filter((n) => !blob.text.includes(n));
    if (missing.length) { stale.push({ band: r.name, rel, needles: lits.length, missing: missing.length, sample: missing.slice(0, 3), baseRate }); break; }
    else mtimeOnly.push({ band: r.name, rel, needles: lits.length, baseRate });
  }
}
for (const s of stale) problems.push(`档位 ${s.band} 的产物里找不到 ${s.rel} 新增内容里的 ${s.missing}/${s.needles} 个${s.viaExports ? "导出符号" : "字面量"} ⇒ 真过期，这一档上的判决作废（首个缺失：${JSON.stringify(s.sample[0])}）`);
for (const mk of markers) {
  if (!mk.symbol || !/^[A-Za-z_$][\w$]*$/.test(mk.symbol)) { problems.push(`标记符号不成形，拒绝当作已检：${JSON.stringify(mk.symbol)}`); continue; }
  const want = mk.bands || Object.keys(byName);
  const per = {};
  for (const bn of want) {
    const dir = byName[bn];
    if (!dir || !existsSync(dir)) { per[bn] = null; continue; }
    let hit = 0;
    try {
      // 只 grep 该档产物，且用一个固定串（不是正则）以免符号里的 $ 被解释
      const out = execFileSync("grep", ["-rl", "--include=*.js", "--include=*.wxml", "-e", mk.symbol, dir],
        { encoding: "utf8", maxBuffer: 1 << 24 }).trim();
      hit = out ? out.split(/\r?\n/).length : 0;
    } catch { hit = 0; }
    per[bn] = hit;
    if (!hit) problems.push(`档位 ${bn} 的产物里没有 ${mk.symbol}${mk.from ? "（判点 " + mk.from + "）" : ""} ⇒ 这一档没吃进该修复，不许拿它出判决`);
  }
  mk.hits = per;
}

say(`FRESH srcFiles=${srcFiles.length} git脏项(${porcelainLines}行报出/${dirty.size}条解析) srcDirtyFiles=${srcStamp.filter((x) => !x.gitClean).length} 档位=${bands.length} 标记=${markers.length}`);
for (const r of rows) {
  if (r.missing) { say(`  ${r.name.padEnd(9)} MISSING`); continue; }
  say(`  ${r.name.padEnd(9)} 产物文件=${String(r.files).padStart(4)} 最新产物=${r.newestArtifact} 源码脏项最新=${r.srcDirtyNewest} 脏项晚于产物=${r.lateDirty} 构建写回(仅mtime)=${r.restoredTouch}`);
  if (r.lateDirtySample.length) say(`           晚于产物的脏项：${r.lateDirtySample.slice(0, 6).map((p) => p.replace(ROOT + "/", "")).join(", ")}${r.lateDirtySample.length > 6 ? ` …另 ${r.lateDirtySample.length - 6}` : ""}`);
}
for (const mk of markers) say(`  标记 ${mk.symbol.padEnd(26)} ${Object.entries(mk.hits).map(([k, v]) => k + "=" + (v === null ? "缺档" : v)).join(" ")}`);
/* "证明不了新鲜"和"证明了过期"是两件事，但对本门来说都不能放行：
   这一门的职责是"不许拿说不清的档位出判决"，说不清就得红，除非补一条标记符号。 */
for (const u of undecidable) problems.push(`档位 ${u.band} 的嫌疑文件 ${u.rel} 无法用内容洗清或定罪：${u.why} ⇒ 要么重建该档，要么在标记件里为它登记一个可搜符号`);
say(`FRESH_内容级 嫌疑(按mtime)=${suspects.reduce((a, s) => a + s.n, 0)} 真过期=${stale.length} 仅mtime已洗清=${mtimeOnly.length} 无法定罪=${undecidable.length} 不可观测=${notObservable.length} 跳过(测试文件不进产物)=${skippedTests} 跳过(该档已定罪)=${skippedAfterConviction}`);
for (const s of suspects) say(`  嫌疑 ${s.band}：${s.n} 个脏项文件晚于该档产物`);
for (const m of mtimeOnly) say(`  洗清 ${m.band} ← ${m.rel}（相对 HEAD 新增的 ${m.needles} 个字面量全在该档产物里 ⇒ 构建脚本写回，不是没吃进改动）`);
for (const u of undecidable) say(`  定罪不了 ${u.band} ← ${u.rel}：${u.why}`);
for (const o of notObservable) say(`  不可观测 ${o.band} ← ${o.rel}：该档里只找得到该文件既有内容的 ${(o.baseRate * 100).toFixed(0)}% ⇒ 这一档不承载它，「我新增的不在包里」既不能定罪也不能洗清（不否决本门，但要单独公开）`);

if (OUT_JSON) {
  /* 机读面：终报要能直接引用「哪一档绑的是旧构建」「哪个文件在这个载具上不可观测」，
     而不是去 grep 中文 stdout。红与绿都写 —— 判红时这份文件就是证据。 */
  writeFileSync(OUT_JSON, JSON.stringify({    generatedAt: new Date().toISOString(), srcDirtyFiles: srcStamp.filter((x) => !x.gitClean).length,
    bands: rows.map(({ lateDirtySample, restoredSample, ...rest }) => rest),
    stale, mtimeOnly, undecidable, notObservable, skippedTests, skippedAfterConviction, markers, problems,
  }, null, 1));
  say(`FRESH_JSON=${OUT_JSON}`);
}
if (problems.length) {
  say(`FRESH_RESULT=FAIL problems=${problems.length}`);
  for (const p of problems) say("  ✗ " + p);
  process.exit(2);
}
say(`FRESH_RESULT=PASS bands=${rows.length} markers=${markers.length} —— 每档产物都不晚于任何未提交改动，且符号级深检全部命中`);
