#!/usr/bin/env node
/**
 * verify-fix-visibility.mjs —— 上一跑与这一跑的逐帧像素对照（MP-FIDELITY Phase F 的复验）。
 *
 * 要挡的事：泳道说"已修"，但**画面根本没变**。这个项目栽过的形近事故够多——
 * 按派单归档而不是按效果归档、"已修复（源码级判点）"在 126 条里量不到一个像素。
 * 所以复验不采信任何自述，只问一件事：这一帧的字节还是不是上一轮那一帧的字节。
 *
 * 三种读数，只有前两种算"改动可见"：
 *   FIX_VISIBLE        该页本轮被批次改过，且帧 hash 变了 ⇒ 画面确实不同（仍须人/泳道确认"改成对的了"）
 *   FIXNOTVISIBLE      该页本轮被批次改过，但帧 hash 与上一跑逐字节相同 ⇒ 改动没上屏，缺陷重开
 *   UNTOUCHED          该页没有任何批次动过 ⇒ 不判（不参与分子）
 *   NO_PREV / NO_CUR   两跑之一缺这一帧 ⇒ 读数缺口，不算"没变"也不算"变了"
 *
 * 用法：node scripts/qa/verify-fix-visibility.mjs --prev <R1/sweep-manifest.json> --cur <R2/...> --fixlist <fixlist-R1.json>
 *      node scripts/qa/verify-fix-visibility.mjs --self-test
 * 退出码：0 无 FIXNOTVISIBLE；1 有 FIXNOTVISIBLE（可红）；2 输入读不到。
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "FIXVIS_RESULT";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);

const keyOf = (r, f) => `${r}__${f.state}`;
function indexManifest(p) {
  const j = JSON.parse(p);
  const m = new Map();
  for (const rec of (j.results || [])) for (const f of (rec.frames || [])) m.set(keyOf(rec.route, f), f);
  return m;
}
/** 从 fixlist 里把"哪些路由被改过"推出来：批次的 pages[] 是权威（缺陷级归属），
 *  files[] 只用于点名是哪个文件改的。 */
function touchedRoutes(fixlist) {
  const set = new Map();
  for (const b of (fixlist.batches || [])) {
    for (const r of (b.pages || [])) {
      if (!set.has(r)) set.set(r, []);
      set.get(r).push(b.batch_id + "(" + (b.files || []).join(",") + ")");
    }
  }
  return set;
}

/* 内容区像素哈希（R2 实测逼出来的）：整文件 sha256 会被**状态栏时钟**单独改动骗过——
   detail/circles 两帧改前改后唯一差异是 23:41→1:02 这个时钟，于是上一版报
   visible=15 fixNotVisible=0，两条泳道用眼睛+取色推翻：版面逐元素一致，那是假阳性。
   ⇒ 判"改动是否上屏"必须比**去掉顶部状态栏带之后的内容像素**，
     并且把"原始字节变了而内容区没变"单独命名（CLOCK_ONLY_CHANGE），算进未上屏。 */
let PNG = null;
let PNG_TRIED = false;
function loadPng() {
  if (PNG_TRIED) return PNG;
  PNG_TRIED = true;
  try {
    /* pngjs 不新增依赖：它是 miniprogram-automator 自带的传递依赖。pnpm 布局下根 node_modules
       没有它、目录名又带版本号后缀，所以按三条路径依次试，而不是猜一个写死的目录名：
       ① 从 automator 自己的包目录往上解析（pnpm 会把它同级 node_modules 里的 pngjs 找到）；
       ② 扫 .pnpm 下 pngjs 开头的目录取；
       ③ automator 的 package.json 里声明的 pngjs 版本 ⇒ 精确目录。
       （同仓先例：tour-r6.mjs:479-494 也是按绝对路径取，不新增第三方包。） */
    const req = createRequire(join(HERE, "x.js"));
    const pnpmRoot = join(REPO, "node_modules", ".pnpm");
    let mod = null;
    try {
      const automatorEntry = req.resolve("miniprogram-automator", { paths: [join(REPO, "apps/client"), REPO] });
      const pkgRoot = join(dirname(automatorEntry), "..");
      try { mod = req(join(pkgRoot, "node_modules", "pngjs")); } catch { /* 走下一条 */ }
      if (!mod) {
        const pj = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf-8"));
        const ver = String((pj.dependencies && pj.dependencies.pngjs) || "");
        const m = ver.match(/(\d+\.\d+\.\d+)/);
        if (m) mod = req(join(pnpmRoot, `pngjs@${m[1]}`, "node_modules", "pngjs"));
      }
    } catch { /* 走下一条 */ }
    if (!mod && existsSync(pnpmRoot)) {
      const hit = readdirSync(pnpmRoot).filter((d) => /^pngjs@/.test(d)).sort()[0];
      if (hit) mod = req(join(pnpmRoot, hit, "node_modules", "pngjs"));
    }
    PNG = mod && mod.PNG ? mod.PNG : null;
    if (!PNG) console.log("FIXVIS_NOTE=pngjs 取不到 ⇒ 内容区比对不可用，退回原始文件哈希（只能判\"同字节\"，判不出\"只有时钟变了\"）");
    else console.log("FIXVIS_DECODER=pngjs 已载入，内容区可比对");
  } catch (e) {
    PNG = null;
    console.log("FIXVIS_NOTE=pngjs 加载失败：" + String(e && e.message).slice(0, 90) + " ⇒ 内容区比对不可用，退回原始文件哈希");
  }
  return PNG;
}
const CROP_TOP = Number(arg("crop-top", "40"));

function contentHash(absPath) {
  const P = loadPng();
  if (!P || !existsSync(absPath)) return "";
  try {
    const png = P.sync.read(readFileSync(absPath));
    const from = Math.max(0, Math.min(CROP_TOP, png.height - 1));
    const rowBytes = png.width * 4;
    const h = createHash("sha256");
    h.update(png.data.subarray(from * rowBytes));
    h.update(`|${png.width}x${png.height}@${from}`);
    return h.digest("hex").slice(0, 16);
  } catch { return ""; }
}

function judge(prev, cur, fixlist, repoDir) {
  const P = indexManifest(prev), C = indexManifest(cur);
  const touched = touchedRoutes(fixlist);
  const rows = [];
  let visible = 0, notVisible = 0, untouched = 0, gaps = 0;
  const routes = new Set([...[...P.values()].map((f) => f.route), ...[...C.values()].map((f) => f.route)]);
  for (const route of [...routes].sort()) {
    const isTouched = touched.has(route);
    const states = new Set([...P.values()].filter((f) => f.route === route).map((f) => f.state)
      .concat([...C.values()].filter((f) => f.route === route).map((f) => f.state)));
    for (const st of states) {
      const pf = [...P.values()].find((f) => f.route === route && f.state === st);
      const cf = [...C.values()].find((f) => f.route === route && f.state === st);
      const hashOf = (f) => (!f || f.landingMismatch ? "" : String(f.contentHash || ""));
      const hp = hashOf(pf), hc = hashOf(cf);
      /* 内容区哈希只在两侧文件都在盘上且能解码时参与判决；量不到就退回原始哈希并如实标注，
         绝不把"量不到"当成"变了"或"没变"。 */
      const cp = pf ? contentHash(join(repoDir || REPO, String(pf.path || ""))) : "";
      const cc = cf ? contentHash(join(repoDir || REPO, String(cf.path || ""))) : "";
      const contentMeasurable = !!(cp && cc);
      let verdict;
      if (!isTouched) verdict = "UNTOUCHED";
      else if (!hp || !hc) { verdict = !hp && !cf && !pf ? "NO_BOTH" : (hp ? "NO_CUR" : (hc ? "NO_PREV" : "NO_EVIDENCE")); gaps++; }
      else if (contentMeasurable && cp === cc) {
        verdict = hp === hc ? "FIXNOTVISIBLE" : "CLOCK_ONLY_CHANGE";
        notVisible++;
      } else if (contentMeasurable) { verdict = "FIX_VISIBLE"; visible++; }
      else if (hp === hc) { verdict = "FIXNOTVISIBLE"; notVisible++; }
      else { verdict = "FIX_VISIBLE_RAWONLY"; visible++; }
      if (verdict === "UNTOUCHED") untouched++;
      rows.push({ route, state: st, verdict, prev: hp.slice(0, 8), cur: hc.slice(0, 8), prevContent: cp, curContent: cc, contentMeasurable, batches: isTouched ? touched.get(route).join(" ") : "" });
    }
  }
  /* 时钟污染单独算一类红：原始字节变了（sha 不等）但内容区逐像素相同 ⇒ 改动没上屏。
     R2 实测：detail/circles 两帧唯一差异是状态栏 23:41→1:02，上一版因此报 visible=15/notVisible=0。 */
  const problems = rows.filter((r) => r.verdict === "FIXNOTVISIBLE" || r.verdict === "CLOCK_ONLY_CHANGE");
  const clockOnly = rows.filter((r) => r.verdict === "CLOCK_ONLY_CHANGE").length;
  const rawOnly = rows.filter((r) => r.verdict === "FIX_VISIBLE_RAWONLY").length;
  return { rows, problems, stats: { visible, notVisible, untouched, gaps, routes: routes.size, clockOnly, rawOnly, cropTopPx: CROP_TOP, contentDecoder: PNG ? "pngjs" : "不可用(退回原始哈希，只能判同字节)" } };
}

function selfTest() {
  const SRK = "FIXVIS_SELFTEST";
  const scratch = join(REPO, ".zcode", "tmp", "fix-vis-selftest");
  mkdirSync(scratch, { recursive: true });
  /* 夹具自身也要能错：这版原先把 fixlist 也用 mk() 写（mk 会把入参包成 {results:…}），
     于是 touched 恒空、四例里三例是"空读数蒙绿"，只有期望红的那例撞出来。
     manifest 与 fixlist 因此分成两个写入器，不再共用一个包装。 */
  const mk = (name, results) => { const p = join(scratch, name); writeFileSync(p, JSON.stringify({ results }), "utf-8"); return p; };
  const mkObj = (name, obj) => { const p = join(scratch, name); writeFileSync(p, JSON.stringify(obj), "utf-8"); return p; };
  const F = (route, state, h) => ({ route, state, contentHash: h, bytes: 9000 });
  const prev = mk("prev.json", [
    { route: "pages/a/index", frames: [F("pages/a/index", "top", "aaaa1111")] },
    { route: "pages/b/index", frames: [F("pages/b/index", "top", "bbbb2222")] },
    { route: "pages/c/index", frames: [F("pages/c/index", "top", "cccc3333")] },
  ]);
  const fix = mkObj("fix.json", { batches: [{ batch_id: "B01", files: ["apps/client/src/pages/a.vue"], pages: ["pages/a/index"] }, { batch_id: "B02", files: ["apps/client/src/pages/b.vue"], pages: ["pages/b/index"] }] });
  /* wantVisible 是**反空读数断言**：只期望"不红"会让夹具自己坏掉时也蒙绿（上一版就是这样）。
     所以每例同时钉住 visible 的期望值，touched 集一旦变空，第 1/2/4 例立刻转红。 */
  const cases = [
    ["改过的页帧变了 = FIX_VISIBLE", mk("cur-ok.json", [
      { route: "pages/a/index", frames: [F("pages/a/index", "top", "AAAA9999")] },
      { route: "pages/b/index", frames: [F("pages/b/index", "top", "BBBB8888")] },
      { route: "pages/c/index", frames: [F("pages/c/index", "top", "cccc3333")] },
    ]), fix, 0, 2],
    ["改过的页逐字节没变 = 必须红", mk("cur-same.json", [
      { route: "pages/a/index", frames: [F("pages/a/index", "top", "aaaa1111")] },
      { route: "pages/b/index", frames: [F("pages/b/index", "top", "bbbb2222")] },
      { route: "pages/c/index", frames: [F("pages/c/index", "top", "cccc3333")] },
    ]), fix, 2, 0],
    ["没批次动过的页不变 = 不判（UNTOUCHED）", mk("cur-unt.json", [
      { route: "pages/a/index", frames: [F("pages/a/index", "top", "aaaa1111")] },
      { route: "pages/b/index", frames: [F("pages/b/index", "top", "bbbb2222")] },
      { route: "pages/c/index", frames: [F("pages/c/index", "top", "cccc3333")] },
    ]), mkObj("fix-empty.json", { batches: [] }), 0, 0],
    ["这一跑缺帧 = 记缺口不记没变", mk("cur-miss.json", [
      { route: "pages/a/index", frames: [] },
      { route: "pages/b/index", frames: [F("pages/b/index", "top", "BBBB8888")] },
    ]), fix, 0, 1],
  ];
  let problems = 0;
  for (const [label, cur, fl, wantRed, wantVisible] of cases) {
    const r = judge(readFileSync(prev, "utf-8"), readFileSync(cur, "utf-8"), JSON.parse(readFileSync(fl, "utf-8")));
    const got = r.problems.length;
    const ok = got === wantRed && r.stats.visible === wantVisible;
    console.log(`FIXVIS_SELF ${label.padEnd(38)} 期望 red=${wantRed} visible=${wantVisible} 实测 red=${got} visible=${r.stats.visible} untouched=${r.stats.untouched} gaps=${r.stats.gaps} ⇒ ${ok ? "对" : "错"}`);
    if (!ok) problems++;
  }
  /* 第 5 例（R2 实测的假阳性形状）：写两张真 PNG，只有顶部状态栏那几条扫描线不同
     （= 时钟变了），内容区逐像素相同，文件字节因此不同。旧版只看文件 sha ⇒ 判 FIX_VISIBLE（蒙绿）；
     现在必须判 CLOCK_ONLY_CHANGE 并计入红。这一例是"自证必须能抓到自己上一版的错"。 */
  let clockCur = null;
  if (PNG) {
    const mkPng = (name, clockRows) => {
      const w = 40, hgt = 120;
      const png = new PNG({ width: w, height: hgt });
      for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
        const i = (w * y + x) << 2;
        const band = y < clockRows ? 255 : 0;
        png.data[i] = 10 + band; png.data[i + 1] = 20; png.data[i + 2] = 30; png.data[i + 3] = 255;
      }
      const p = join(scratch, name);
      writeFileSync(p, PNG.sync.write(png));
      return name;
    };
    const fPrev = mkPng("clock-prev.png", 4), fCur = mkPng("clock-cur.png", 9);
    const mkM = (name, file, hash) => { const p = join(scratch, name); writeFileSync(p, JSON.stringify({ results: [{ route: "pages/a/index", frames: [{ route: "pages/a/index", state: "top", path: file, contentHash: hash, bytes: 5000 }] }] }), "utf-8"); return p; };
    clockCur = {
      prev: mkM("clk-prev.json", fPrev, "clkaaaaaaaaaaaa"),
      cur: mkM("clk-cur.json", fCur, "clkbbbbbbbbbbbb"),
      fl: join(scratch, "fix.json"),
    };
    const r5 = judge(readFileSync(clockCur.prev, "utf-8"), readFileSync(clockCur.cur, "utf-8"), JSON.parse(readFileSync(clockCur.fl, "utf-8")), scratch);
    const got5 = r5.problems.length, v5 = r5.rows[0] ? r5.rows[0].verdict : "?";
    const ok5 = got5 === 1 && v5 === "CLOCK_ONLY_CHANGE";
    console.log(`FIXVIS_SELF ${"时钟改动不算上屏（真 PNG）".padEnd(38)} 期望 red=1 verdict=CLOCK_ONLY_CHANGE 实测 red=${got5} verdict=${v5} ⇒ ${ok5 ? "假阳性已堵" : "仍会蒙绿"}`);
    if (!ok5) problems++;
  } else {
    console.log(`FIXVIS_SELF ${"时钟改动不算上屏（真 PNG）".padEnd(38)} 跳过：pngjs 不可用 ⇒ 本门退回原始哈希，只能判同字节，请如实读 decoder 字段`);
  }
  void clockCur;
  rmSync(scratch, { recursive: true, force: true });
  console.log(problems ? `${SRK}=FAIL cases=${cases.length + 1} problems=${problems}` : `${SRK}=PASS cases=${cases.length + 1} 假绿可红=是`);
  return problems ? 1 : 0;
}

if (flag("self-test")) process.exit(selfTest());

const prevP = arg("prev", ""), curP = arg("cur", ""), flP = arg("fixlist", "");
for (const [k, v] of [["prev", prevP], ["cur", curP], ["fixlist", flP]]) {
  if (!v || !existsSync(resolve(REPO, v))) { console.log(`${RK}=NOT-EVIDENCED reason=${k} 读不到 ${v || "(没传)"}`); process.exit(2); }
}
const { rows, problems, stats } = judge(readFileSync(resolve(REPO, prevP), "utf-8"), readFileSync(resolve(REPO, curP), "utf-8"), JSON.parse(readFileSync(resolve(REPO, flP), "utf-8")));
const outPath = resolve(arg("out", join(REPO, "reports/audit/mp-fidelity-2026-10-18/fix-visibility.json")));
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ schema: "mp-fidelity-fix-visibility/v1", prev: prevP, cur: curP, fixlist: flP, stats, rows }, null, 2) + "\n", "utf-8");
for (const r of problems) console.log(`${r.verdict} ${r.route}__${r.state} 原始 sha16 ${r.prev}→${r.cur}${r.contentMeasurable ? ` 内容区 sha16 ${r.prevContent}→${r.curContent}` : " 内容区量不到"} ⇒ 批次 ${r.batches} 的改动没上屏，缺陷重开`);
for (const r of rows.filter((x) => x.verdict.startsWith("NO_"))) console.log(`FIXVIS_GAP ${r.route}__${r.state} ${r.verdict}（缺读数，不判成"没变"也不判成"变了"）`);
console.log(`FIXVIS_STATS routes=${stats.routes} visible=${stats.visible} notVisible=${stats.notVisible} clockOnly=${stats.clockOnly} rawOnly=${stats.rawOnly} untouched=${stats.untouched} gaps=${stats.gaps} cropTop=${stats.cropTopPx}px decoder=${stats.contentDecoder} out=${outPath.replace(REPO + "/", "").split("\\").join("/")}`);
console.log(problems.length ? `${RK}=FAIL fixNotVisible=${problems.length}（含时钟污染 ${stats.clockOnly}）gaps=${stats.gaps}` : `${RK}=PASS visible=${stats.visible} fixNotVisible=0 gaps=${stats.gaps} rawOnly=${stats.rawOnly}`);
process.exit(problems.length ? 1 : 0);
