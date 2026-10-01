#!/usr/bin/env node
/**
 * 载体接线门（carrier wiring）：数出「声明了导出、却在本仓没有任何消费者」的模块，并让它能变红。
 *
 * 起因（四条同族实测事故，逐条证据命令见 reports/audit/round-7/wiring-gate-r18.md）：
 *   这套流程反复踩同一个坑——东西建好了没人跑/没人消费，而**没有任何门会因此变红**。
 *   本门补的就是这一格：一个产物有没有消费者，必须被量出来，并且能红。
 *
 * 判域（刻意做小、可核；为什么不做全仓扫描见报告「判域选择与放弃的更大判域」）：
 *   只看 scripts/qa/** 与 apps/client/scripts/** 这两棵树里、盘上存在、且按文件自己的模块制度
 *   声明了导出的 .mjs/.cjs（.mjs 认顶层 export；.cjs 只认 module.exports）—— 即「被当作模块复用」的那一批。判域取"盘上存在"而不要求已被 git 跟踪：
 *   实测本轮起跑时 scripts/qa/measured-ledger.mjs 有 export 但还没被跟踪，若卡 tracked 这个口径，
 *   这道门恰好在「刚建好、还没人接线」那一刻失明（要等提交才检＝每次都检晚）。
 *   一次性调试脚本（scripts 根下 shot-、probe- 开头那 1000+ 个 .cjs）不在判域内：
 *   卷进来只会造出无法逐条处置的噪音红，最后被人整体关掉——那就是这道门的死法。
 *
 * 用法：node scripts/qa/verify-carrier-wiring.mjs [--json <sidecar>] [--select a.mjs,b.mjs]
 *        [--exemptions <file.json>] [--advisory] [--quiet]
 *   --select      只把判域里的这几个文件拿来判定（点了不在判域内的名字 ⇒ exit 2，不给静默变绿）。
 *                 唯一用途是让负例能把某一个具名夹具钉住；判据逻辑与默认跑走同一条码路，不放宽任何口径。
 *   --exemptions  豁免清单 JSON，默认 scripts/qa/carrier-wiring-exemptions.json；每条必须带 path + why。
 *   --advisory    只报数不判红。默认判红；两个载体都不带这个旗（理由见报告「两轴极性决定」）。
 *   --json        结构化落点，默认 .zcode/tmp/carrier-wiring/wiring.json（本仓规矩：侧车不落 reports/**）。
 *
 * 退出码：
 *   0 = 判域内每个导出件都有消费者（或 --advisory 下的纯报数）
 *   1 = 有导出件零消费者，或有豁免条目已过期（早先的放行没撤回）
 *   2 = 口径本身不可信：git 不可用 / 判域为空 / 入口扫描集为空 / 豁免清单缺失或形状不合法 /
 *       聚合器自动收件规则与登记不上（登记漂走 ⇒「被自动收件的测试」会被误报成死件）
 *
 * 机器行自带口径标注是硬要求（本仓刚立的规矩：数字不标口径最容易被读成「达标了」）。
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { dirname, join, resolve, relative, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const relPosix = (p) => String(p).split(/[\\/]/g).join("/");
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const QUIET = has("quiet");
const ADVISORY = has("advisory");
const EXEMPT_PATH = relPosix(arg("exemptions", "scripts/qa/carrier-wiring-exemptions.json"));
const SIDE = relPosix(arg("json", ".zcode/tmp/carrier-wiring/wiring.json"));
const SELECT = String(arg("select", "")).split(",").map((s) => s.trim()).filter(Boolean);
const say = (s) => { if (!QUIET) console.log(s); };

// ── 判域目录 ────────────────────────────────────────────────────────────
const DOMAIN_DIRS = ["scripts/qa", "apps/client/scripts"];

// ── 消费侧：哪类文件里的路径点名算「真入口」─────────────────────────────
//   code  —— .mjs/.cjs/.js/.ts 剥注释后的字符串字面量（import/require/动态 import 的目标、
//            spawn/execFile 的参数、join(HERE,"x.mjs") 这类同目录点名）
//   shell —— 任意 .sh 的非注释行（run-final-verify-v33.sh、rerun-round7-slices.sh 等）
//   dsl   —— .zcode/workflows/*.dwf.ts 的字符串实参（GATE_SUITE / PANEL_SUITE / args）
//   pkg   —— package.json 的 scripts 字段
//   queue —— scripts/qa/ui-queue*.json 与 scripts/qa/cellplan*.json 里点名的路径
//   ci    —— .github/** 的 yml（CI 也是一条真实入口）
// 明确**不算**消费者：*.md、reports/**、.zcode/workflow-runs/**（跑完留下的记录件）、
// 任何名为 tmp 的目录（含 .zcode/tmp）。把一次性引用塞进 tmp 就能消音的门，第一天就该死。
const CARRIER_EXT_CODE = new Set([".mjs", ".cjs", ".js", ".ts", ".tsx"]);
const HIDDEN_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", "archive", "reports", "docs", "doc",
  "deliverables", "specs", "logs", "verification_logs", "截图存档", "素材",
  ".codegraph", ".qoder", ".trae", ".vscode", ".mimosa", ".reasonix", ".workbuddy",
  ".design_library", ".claude", ".pnpm-store", "coverage", "playwright-report", "tmp",
]);
const MAX_FILE_BYTES = 6 * 1024 * 1024;

function carrierClass(relPath) {
  const segs = relPath.split("/");
  if (segs.slice(0, -1).some((s) => HIDDEN_DIRS.has(s))) return null;
  if (segs[0] === ".zcode" && segs[1] === "workflow-runs") return null;   // 运行记录不是入口
  const fn = segs[segs.length - 1];
  const ext = fn.slice(fn.lastIndexOf("."));
  if (fn === "package.json") return "pkg";
  if (ext === ".sh") return "shell";
  if (ext === ".yml" || ext === ".yaml") return segs[0] === ".github" ? "ci" : null;
  if (relPath.startsWith(".zcode/workflows/") && ext === ".ts") return "dsl";
  if (relPath.startsWith("scripts/qa/") && /^(ui-queue|cellplan)[^/]*\.json$/.test(fn)) return "queue";
  if (CARRIER_EXT_CODE.has(ext)) return "code";
  return null;
}

/** 「只写文件名不带目录」的点名在什么组合下算数：
 *  非 code 入口（sh/dsl/pkg/queue/ci）天生爱写裸名；code 只在同目录时算（join(HERE,"x.mjs")）。 */
function bareNameCounts(cls, carrierDir, targetDir) {
  if (cls !== "code") return true;
  return carrierDir === targetDir;
}

// 从代码文本里粗剥注释。目的就一条：让「注释里吹了一句路径」不再充当消费者
//（本仓实测的形状：某门文件头注释声称新增了读数，而 grep 只命中那条注释本身——
//  注释不能算「有人在做这件事」的证据）。
function stripComments(txt) {
  return txt.replace(/^[ \t]*(?:\/\/|\*(?:\s|$))[^\n]*(?:\n|$)/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

const SPEC_TAIL_RE = /([\w.@/()[\]-]*?[\w.\]-]+\.(?:mjs|cjs|js|ts))/g;

/** 从一个入口文件里抽出它点名的 {全路径集合, 裸名集合}。 */
function extractRefs(relPath, txt) {
  const cls = carrierClass(relPath);
  const paths = new Set();
  const names = new Set();
  const carrierDir = dirname(relPath);
  const pushSpec = (raw) => {
    if (!raw) return;
    let s = String(raw).trim().replace(/^["'`]|["'`]$/g, "");
    if (!s || s.includes("${") || s.includes("<") || s.includes("*")) return;   // 模板拼接/占位/通配不作放行证据
    if (!/\.(mjs|cjs|js|ts|json|sh|yml|yaml)$/.test(s)) return;
    if (s.startsWith("./") || s.startsWith("../")) {
      paths.add(relPosix(relative(ROOT, resolve(join(ROOT, carrierDir), s))));
      names.add(basename(s));
      return;
    }
    if (s.startsWith("/") || /^[A-Za-z]:/.test(s)) return;                       // 仓外绝对路径不是本仓消费者
    if (s.includes("/")) { paths.add(s.replace(/^\.\//, "")); names.add(basename(s)); }
    else if (/\.(mjs|cjs|js|ts|sh)$/.test(s)) names.add(s);
  };
  if (cls === "code" || cls === "dsl") {
    const body = stripComments(txt);
    for (const m of body.matchAll(/(?:import|export)[^'"`\n]*?from\s*['"]([^'"]+)['"]/g)) pushSpec(m[1]);
    for (const m of body.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) pushSpec(m[1]);
    for (const m of body.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) pushSpec(m[1]);
    for (const m of body.matchAll(/['"]([^'"\n]*?\.(?:mjs|cjs|js|ts))['"]/g)) pushSpec(m[1]);
  } else if (cls === "shell" || cls === "ci") {
    for (const line of txt.split(/\r?\n/)) {
      if (/^\s*(#|\/\/)/.test(line)) continue;
      for (const m of line.matchAll(/["'`]?([^\s"'`;|&()[\]{}]*?[\w.-]+\.(?:mjs|cjs|js|ts|sh))["'`]?/g)) pushSpec(m[1]);
    }
  } else if (cls === "pkg" || cls === "queue") {
    let j = null;
    try { j = JSON.parse(txt.replace(/^\s*\/\/[^\n]*(?:\n|$)/gm, "")); } catch { return { cls, paths, names, unparsable: true }; }
    const walk = (v) => {
      if (typeof v === "string") { for (const m of v.matchAll(SPEC_TAIL_RE)) pushSpec(m[1]); return; }
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(j);
  }
  return { cls, paths, names, carrierDir };
}

/* ── 按文件名正则自动收件的聚合器登记 ────────────────────────────────────
   最容易写错的一条：被聚合器自动收走的 test-* **算有人跑**。
   登记表不硬编「它存在」，而是每次运行都回盘核那条收件正则还在不在——
   漂走就 exit 2：那意味着我正在拿一条已经不成立的收件规则去豁免文件。 */
const AGGREGATORS = [
  {
    file: "scripts/qa/run-qa-selftests.mjs",
    reSrc: "^test-.+\\.(cjs|mjs)$",
    dir: "scripts/qa",
    why: "离线负例聚合器按文件名正则收 scripts/qa/test-*.cjs|mjs 并逐条 spawn ⇒ 被它收到的文件必然被执行",
  },
];

function validateAggregators() {
  const ok = [];
  const problems = [];
  for (const a of AGGREGATORS) {
    const abs = join(ROOT, a.file);
    if (!existsSync(abs)) { problems.push(`${a.file} 不存在`); continue; }
    const src = readFileSync(abs, "utf8");
    if (!src.includes(a.reSrc)) { problems.push(`${a.file} 里找不到登记的收件规则 ${a.reSrc}（规则漂走 ⇒ 不能再拿它当豁免依据）`); continue; }
    let files = [];
    try { files = readdirSync(join(ROOT, a.dir)); } catch { problems.push(`${a.dir} 目录读不到`); continue; }
    const re = new RegExp(a.reSrc);
    ok.push({ ...a, re, matched: files.filter((f) => re.test(f)) });
  }
  return { ok, problems };
}

/* ── 判域：判域目录下盘上存在的导出件 ───────────────────────────────────
   口径选择（实测决定，不是凭手感）：判域取「盘上存在」而不是「已被 git 跟踪」。
   实测证据：本轮起跑时 scripts/qa/measured-ledger.mjs 有 export、尚未被跟踪 ⇒
   若判域要求 tracked，这道门对"刚刚建好、还没人接线"的那一批完全失明——
   而那正是本病发作的时刻（提交之后才检＝每次都检晚了）。
   tracked 与否只作为口径标注印出来，便于复核，不参与判定。
   噪音防线仍然在两道闸上：① 只看 DOMAIN_DIRS 这两棵树；② 必须写了 export。
   那 1000+ 个 shot-/probe- 一次性调试脚本在 scripts 根下、且没有 export，两闸都不过。 */
function domainFiles() {
  const trackedSet = new Set();
  const r = spawnSync("git", ["ls-files", "-z", "--", ...DOMAIN_DIRS], { cwd: ROOT, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) return { err: `git ls-files 失败（判域要报「被跟踪/未跟踪」这一分栏，git 不可用就不许悄悄换个口径）：${String(r.stderr || "").slice(0, 120)}` };
  for (const p of String(r.stdout).split("\0").filter(Boolean)) trackedSet.add(relPosix(p));
  const trackedMjsCjs = [...trackedSet].filter((p) => /\.(mjs|cjs)$/.test(p)).length;
  const out = [];
  let mjsCjs = 0, untracked = 0;
  const walk = (absDir, relDir) => {
    let ents = [];
    try { ents = readdirSync(absDir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const rel = relDir ? `${relDir}/${e.name}` : e.name;
      if (e.isDirectory()) { if (!HIDDEN_DIRS.has(e.name)) walk(join(absDir, e.name), rel); continue; }
      if (!/\.(mjs|cjs)$/.test(e.name)) continue;
      if (/\.bak(\.|$)/.test(e.name) || /\.bak-/.test(e.name)) continue;   // 备份件不是新产物
      mjsCjs++;
      let src = "";
      try { src = readFileSync(join(absDir, e.name), "utf8"); } catch { continue; }
      const body = stripComments(src);
      // 「声明了导出」按文件自己的模块制度判，不用一把正则横扫（实测踩过：本车道的 .cjs 负例
      // 在模板串里写了一句 `export function …`，被字节级 export 匹配当成导出件收进判域）：
      //   .mjs = ESM ⇒ 认顶层 `export`（`export const/function/class/default`、`export {…}`、`export *`，含不换行 `export{`）
      //   .cjs = CommonJS ⇒ 只认 `module.exports`；顶层 `export` 在 .cjs 里是语法错误，必然不是真导出
      // 判据是"被当作模块复用"，不是"文本里出现过 export 这个词"。
      const isCjs = /\.cjs$/.test(e.name);
      const declares = isCjs ? /^[ \t]*module\.exports\b/m.test(body) : /^[ \t]*export[\s{*]/m.test(body);
      if (!declares) continue;
      const named = new Set();
      if (isCjs) {
        for (const m of body.matchAll(/(?:^|[ \t;{}])module\.exports\.?\s*([A-Za-z0-9_$]*)/gm)) {
          const n = (m[1] || "").replace(/^\./, "");
          if (n) named.add(n); else named.add("module.exports");
        }
      } else {
        for (const m of body.matchAll(/^[ \t]*export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/gm)) named.add(m[1]);
        for (const m of body.matchAll(/^[ \t]*export\s*\{([^}]*)\}/gm)) for (const t of m[1].split(",")) { const n = t.trim().split(/\s+as\s+/)[0].trim(); if (n && n !== "default") named.add(n); }
      }
      if (!trackedSet.has(rel)) untracked++;
      out.push({ path: rel, exports: [...named], star: /export\s*\*/.test(body), dir: relDir, tracked: trackedSet.has(rel) });
    }
  };
  for (const d of DOMAIN_DIRS) walk(join(ROOT, d), d);
  return { files: out, mjsCjsTotal: mjsCjs, trackedMjsCjs, trackedTotal: trackedSet.size, untrackedInDomain: untracked };
}

/* ── 豁免清单：必须由实测生成，每条带一行为什么 ────────────────────────── */
function loadExemptions() {
  const abs = join(ROOT, EXEMPT_PATH);
  if (!abs.startsWith(ROOT)) return { err: `豁免清单路径越出仓根：${EXEMPT_PATH}` };
  if (!existsSync(abs)) return { err: `豁免清单不存在：${EXEMPT_PATH}（判域与豁免都得有账；缺文件不许当成「没有豁免」混过去，那正是清单被随手删掉的形状）` };
  let j = null;
  try { j = JSON.parse(readFileSync(abs, "utf8")); } catch (e) { return { err: `豁免清单解析失败：${EXEMPT_PATH} :: ${String(e.message).slice(0, 90)}` }; }
  const items = Array.isArray(j && j.exemptions) ? j.exemptions : null;
  if (!items) return { err: `豁免清单形状不合法（要 {"exemptions":[{"path","why"}]}）：${EXEMPT_PATH}` };
  const bad = [];
  const map = new Map();
  for (const it of items) {
    const p = relPosix((it && it.path) || "");
    const why = String((it && it.why) || "").trim();
    if (!p) { bad.push("(空 path)"); continue; }
    if (why.length < 12) bad.push(`${p}（why 缺失或太短="${why}"——本仓定规「收紧门必须撤回旧放行＋逐档有账」，一条不写为什么的放行等于没有账）`);
    if (map.has(p)) bad.push(`${p}（重复登记）`);
    map.set(p, why);
  }
  if (bad.length) return { err: `豁免清单有 ${bad.length} 条不合法：${bad.slice(0, 3).join("；")}` };
  return { map, count: items.length };
}

// ── 1. 判域 ──
const DOM = domainFiles();
if (DOM.err) { console.log(`WIRING_RESULT=FAIL reason=${DOM.err}`); process.exit(2); }
if (!DOM.files.length) { console.log(`WIRING_RESULT=FAIL reason=判域为空（${DOMAIN_DIRS.join(" + ")} 里一个带 export 的 .mjs/.cjs 都没扫到——空扫描集不许判绿）`); process.exit(2); }

// ── 2. 聚合器登记 ──
const AGG = validateAggregators();
if (AGG.problems.length) { console.log(`WIRING_RESULT=FAIL reason=自动收件登记不可信：${AGG.problems.join("；")}`); process.exit(2); }

// ── 3. 豁免清单 ──
const EX = loadExemptions();
if (EX.err) { console.log(`WIRING_RESULT=FAIL reason=${EX.err}`); process.exit(2); }

// ── 4. 扫全部入口文件，建消费索引 ──
const pathIdx = new Map();   // repoPath -> Set<carrierRel>
const nameIdx = new Map();   // basename -> Map<carrierRel, {cls, dir}>
const carrierCounts = {};
const carrierFiles = [];
const unparsableCarriers = [];
(function walk(dir) {
  let ents = [];
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = join(dir, e.name);
    const rel = relPosix(relative(ROOT, p));
    if (e.isDirectory()) { if (!HIDDEN_DIRS.has(e.name)) walk(p); continue; }
    if (!carrierClass(rel)) continue;
    let st = null; try { st = statSync(p); } catch { continue; }
    if (st.size > MAX_FILE_BYTES) { unparsableCarriers.push(rel); continue; }
    let txt = "";
    try { txt = readFileSync(p, "utf8"); } catch { continue; }
    carrierFiles.push(rel);
    const { cls, paths, names, carrierDir, unparsable } = extractRefs(rel, txt);
    carrierCounts[cls] = (carrierCounts[cls] || 0) + 1;
    if (unparsable) unparsableCarriers.push(rel);
    for (const pp of paths) { if (!pathIdx.has(pp)) pathIdx.set(pp, new Set()); pathIdx.get(pp).add(rel); }
    for (const nm of names) {
      if (!nameIdx.has(nm)) nameIdx.set(nm, new Map());
      nameIdx.get(nm).set(rel, { cls, dir: carrierDir });
    }
  }
})(ROOT);
if (!carrierFiles.length) { console.log("WIRING_RESULT=FAIL reason=入口扫描集为空（一个可执行入口文件都没读到 ⇒ 消费者恒为 0，这是仪器坏了不是东西都死了）"); process.exit(2); }

// ── 5. 逐个导出件判定 ──
const judged = [];
for (const m of DOM.files) {
  if (SELECT.length && !SELECT.some((s) => s === basename(m.path) || relPosix(s) === m.path)) continue;
  const stem = basename(m.path).replace(/\.(mjs|cjs)$/, "");
  const isOwnCopy = (rel) => { const fn = basename(rel); return fn.startsWith(stem) && /\.bak/.test(fn); };  // x.mjs.bak-* 是它自己的备份，不是消费者
  const consumers = new Set();
  const byPath = pathIdx.get(m.path);
  if (byPath) for (const rel of byPath) if (rel !== m.path && !isOwnCopy(rel)) consumers.add(rel);
  const byName = nameIdx.get(basename(m.path));
  if (byName) for (const [rel, meta] of byName) {
    if (rel === m.path || isOwnCopy(rel)) continue;
    if (bareNameCounts(meta.cls, meta.dir, m.dir)) consumers.add(rel);
  }
  const auto = AGG.ok.filter((a) => a.dir === m.dir && a.re.test(basename(m.path))).map((a) => `AUTO_COLLECT:${a.file}:${a.reSrc}`);
  const list = [...consumers];
  judged.push({ ...m, consumers: list, auto, dead: list.length === 0 && auto.length === 0, exempt: EX.map.has(m.path) });
}
if (SELECT.length) {
  const missing = SELECT.map((s) => s.split("/").pop()).filter((w) => !judged.some((j) => basename(j.path) === w));
  if (missing.length) { console.log(`WIRING_RESULT=FAIL reason=--select 点了 ${missing.join("、")} 但它不在判域里（拼错 / 已被删 / 没写 export——列了就得核，不许「选择性检查」静默变绿）`); process.exit(2); }
}

const dead = judged.filter((j) => j.dead && !j.exempt);
const exempted = judged.filter((j) => j.dead && j.exempt);
// 过期豁免 = 早先的放行没撤回（本仓定规：收紧门必须撤回旧放行）。它和新增死件一样判红。
const stale = judged.filter((j) => !j.dead && j.exempt);

const exportedNames = judged.reduce((n, j) => n + (j.exports.length || (j.star ? 1 : 0)), 0);
const autoCollected = judged.filter((j) => j.auto.length).length;

console.log(`WIRING_DOMAIN 判域=${DOMAIN_DIRS.map((d) => d + "/**").join(" + ")} 盘上 .mjs/.cjs=${DOM.mjsCjsTotal}（其中 git 已跟踪=${DOM.trackedMjsCjs} 未跟踪=${DOM.untrackedInDomain}）声明 export 的导出件=${judged.length}${SELECT.length ? `（--select 收窄：只判 ${judged.length} 件，判据与默认跑同一条码路，不放宽口径）` : ""} 导出符号合计=${exportedNames} 口径=判据是「按文件自己的模块制度声明了导出」：.mjs 认顶层 export（含不换行的 export 花括号形式、export *），.cjs 只认 module.exports——实测本车道自己的 .cjs 负例在模板串里写了一句 export function，被字节级 export 匹配误收过，现按制度分判；判域只取这两棵树（scripts 根下那 1000+ 个 shot-/probe- 一次性脚本两闸都不过）；判域取盘上不要求已提交，否则「刚建好还没人接线」那一刻正好检不到`);
console.log(`WIRING_CARRIER 入口文件=${carrierFiles.length} 分类=${Object.keys(carrierCounts).sort().map((k) => `${k}:${carrierCounts[k]}`).join(" ")} 跳过超大件=${unparsableCarriers.length}｜算消费者=import/require/动态import 目标 + spawn 用的路径字面量 + *.sh 非注释行 + *.dwf.ts 字符串实参 + package.json scripts + scripts/qa/{ui-queue,cellplan}*.json 值 + .github yml｜不算=*.md 与 reports/** 与 .zcode/workflow-runs/** 与任何 tmp/ 目录（记录件、注释、一次性引用都不是消费者）`);
console.log(`WIRING_AUTO_COLLECT 已登记聚合器=${AGG.ok.length} 条（${AGG.ok.map((a) => `${a.file} 规则 /${a.reSrc}/ 实收 ${a.matched.length} 个文件`).join("；")}）判域内被自动收件=${autoCollected} 口径=按文件名正则自动 spawn 即"有人跑"，不登记就会把自动收件的负例误报成死件`);
console.log(`WIRING_EXEMPT 清单=${EXEMPT_PATH} 登记=${EX.count} 条 本轮命中=${exempted.length} 过期=${stale.length}（过期=该件已有消费者却不撤回放行 ⇒ 与新增死件同判红）`);

for (const d of dead.slice(0, 30)) console.log(`WIRING_DEAD_ITEM path=${d.path} 导出=${d.exports.length ? d.exports.slice(0, 8).join(",") : "(无符号名/star)"} 消费者=0 口径=上述六类入口全部零命中`);
for (const e of exempted.slice(0, 30)) console.log(`WIRING_EXEMPT_ITEM path=${e.path} why=${EX.map.get(e.path)}`);
for (const s of stale.slice(0, 30)) console.log(`WIRING_STALE_ITEM path=${s.path} 消费者=${s.consumers.length} 首个=${s.consumers[0]} 处置=从豁免清单删掉这条并补一行说明（不许留着冒充"已放行"）`);

try { mkdirSync(dirname(resolve(ROOT, SIDE)), { recursive: true }); } catch { /* 已存在 */ }
writeFileSync(resolve(ROOT, SIDE), JSON.stringify({
  generatedAt: new Date().toISOString(),
  caliber: "判域=git 跟踪的 scripts/qa/** + apps/client/scripts/** 内含 export 的 .mjs/.cjs；消费者=import/require/动态import/spawn 路径字面量/sh 非注释行/dwf.ts 字符串/package.json scripts/ui-queue+cellplan JSON 值/.github yml + 登记的按名自动收件聚合器；不含 .md、reports/**、workflow-runs/**、tmp/",
  domainDirs: DOMAIN_DIRS, onDiskMjsCjs: DOM.mjsCjsTotal, gitTrackedInDirs: DOM.trackedTotal, untrackedInDomain: DOM.untrackedInDomain, judgedTotal: judged.length, exportedNames,
  select: SELECT, carrierFiles: carrierFiles.length, carrierCounts,
  aggregators: AGG.ok.map((a) => ({ file: a.file, reSrc: a.reSrc, matched: a.matched.length })),
  exemptFile: EXEMPT_PATH, exemptRegistered: EX.count,
  dead: dead.map((d) => ({ path: d.path, exports: d.exports })),
  exempted: exempted.map((e) => ({ path: e.path, why: EX.map.get(e.path) })),
  staleExemptions: stale.map((s) => ({ path: s.path, consumers: s.consumers.length, first: s.consumers[0] })),
  modules: judged.map((j) => ({ path: j.path, exports: j.exports, consumers: j.consumers, auto: j.auto, exempt: j.exempt })),
}, null, 2) + "\n");
say(`WIRING_SIDECAR ${relPosix(relative(ROOT, resolve(ROOT, SIDE)))}`);

const red = dead.length + stale.length;
const polarityNote = `默认判红：判域只有 ${judged.length} 个具名导出件、每条都点到文件名，命中即可处置（接线，或按实测进豁免清单并补一行为什么）；这与一条只能报数的普查门不同，没有"红一大片只能整体关掉"的退路`;
console.log(red === 0
  ? `WIRING_RESULT=PASS（判域 ${judged.length} 个导出件全部有消费者；死件=0 过期豁免=0；口径=消费者含 import/require/动态 import/spawn 字面量/sh/dsl/package.json/queue/ci 七类入口加已登记的按名自动收件，不含 .md 与 reports/** 的提及）`
  : `WIRING_RESULT=${ADVISORY ? "ADVISORY" : "FAIL"}（死件=${dead.length} 过期豁免=${stale.length} / 判域导出件=${judged.length}；口径=上述入口零命中才算死件，.md/reports/workflow-runs/tmp 的提及不算消费者；${ADVISORY ? "--advisory 只报数不判红" : polarityNote}）`);
process.exit(red === 0 ? 0 : (ADVISORY ? 0 : 1));
