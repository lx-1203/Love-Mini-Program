#!/usr/bin/env node
/**
 * emit-fidelity-lanes.mjs —— 由账本 + 取景清单派生"找茬泳道"的任务书（MP-FIDELITY Phase E）。
 *
 * 为什么要一个生成器而不是我手抄 14 页分给泳道：
 *   · 帧路径与 frame_hash 必须由机器带上（手抄等于让泳道去猜它到底看了哪张图，
 *     而 verify-finder-lane 就是拿 hash 复核"这张图真被打开过"）；
 *   · brief 的键命名空间必须与卡 id 同源（上一程一份 brief 把卡按自己的顺序重编号，
 *     11 条泳道全报口径不对，其中一条差点覆写别泳道已交付的文件）；
 *   · 页数与每页帧数要守恒：lane 分到的帧总数必须等于清单里的可用帧数，少一张就是漏审。
 *
 * 用法：node scripts/qa/emit-fidelity-lanes.mjs --ledger <baseline-ledger.json>
 *        --manifest <sweep-manifest.json> --round R1 [--per-lane 2] [--out <目录>] [--all]
 *   缺省只分"有基准"的页（可比理想图）；--all 把无基准页也编进去（它们按规范文档 §3 与组件库比）。
 * 退出码：0 派出且守恒；1 守恒不成立；2 输入读不到。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "EMITLANES_RESULT";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);

const round = arg("round", "R1");
const ledgerP = resolve(arg("ledger", ""));
const manifestP = resolve(arg("manifest", ""));
const perLane = Math.max(1, Number(arg("per-lane", "2")));
const outDir = resolve(arg("out", join(REPO, "tmp/qa/lanes", round)));

/* --selftest：基准图那两道判据（存在性 + 字节指纹）必须有阳性对照。
   没这对照的话，以后谁把它们降级成 console.warn、或整段删掉，没有任何东西会报错——
   正是本文件注释里反复写的那种"静默回退"。夹具全在 tmp/ 下，永不入库。
   注：夹具跑的是复刻的 8 字节假 PNG，证明的是"链路会红"，不是"真基准图的性能"。 */
if (flag("selftest")) {
  const FX = join(REPO, "tmp", "qa", "fixtures", "emitlanes");
  const SELF = join(HERE, "emit-fidelity-lanes.mjs");
  const BASE_REL = "tmp/qa/fixtures/emitlanes/base.png";
  const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
  const manifest = {
    band: "selftest",
    results: [{ route: "pages/x/index", query: "", frames: [{ state: "默认", path: join(FX, "frame.png"), contentHash: "a".repeat(40), bytes: 5000, landingVerified: true }] }],
  };
  /* [用例名, baselineStatus, baselineImages, 基准清单处置, 额外 flag, 期望退出码, 判据必须出现的字样, 说明] */
  const cases = [
    ["有基准+图在盘上+指纹相符", "有基准", [BASE_REL], "ok", [], 0, `${RK}=PASS`, "正路：能派发"],
    ["有基准+图不存在", "有基准", ["tmp/qa/fixtures/emitlanes/nope.png"], "ok", [], 1, "BASELINE_MISSING", "注入缺图必须红（P1② 修的就是它）"],
    ["有基准+一条图都没登记", "有基准", [], "ok", [], 1, "BASELINE_MISSING", "空引用同样不许派"],
    ["有基准+部分缺图", "有基准", [BASE_REL, "tmp/qa/fixtures/emitlanes/nope.png"], "ok", [], 1, "BASELINE_MISSING", "缺一张也算红：任务书会逐张点名 Read"],
    ["有基准+图被换过(指纹不符)", "有基准", [BASE_REL], "drift", [], 1, "BASEMANI_DRIFT", "同名换图是存在性检查看不见的，靠清单兜住（P1③）"],
    ["有基准+图未登记进清单", "有基准", [BASE_REL], "empty", [], 1, "BASELINE_NOFP", "盘上有图但没指纹锚 ⇒ 跨轮无法核对同一张图"],
    ["有基准+清单文件缺失", "有基准", [BASE_REL], "absent", [], 1, "基准指纹清单缺失", "清单本身没了不许当免检"],
    ["无基准页（--all）", "无基准", [], "ok", ["--all"], 0, `${RK}=PASS`, "不许误杀：无基准本来就没图，走规范文档口径"],
  ];
  let ok = 0;
  for (const [name, status, imgs, maniKind, extra, wantExit, wantIn, why] of cases) {
    rmSync(FX, { recursive: true, force: true });
    mkdirSync(FX, { recursive: true });
    const baseBuf = Buffer.from("89504e470d0a1a0a", "hex");
    writeFileSync(join(FX, "base.png"), baseBuf); // 只验指纹与存在性，脚本不解析像素
    writeFileSync(join(FX, "manifest.json"), JSON.stringify(manifest));
    const lp = join(FX, "ledger.json");
    writeFileSync(lp, JSON.stringify({ rows: [{ route: "pages/x/index", baselineStatus: status, baselineImages: imgs, identityPrecondition: "-" }] }));
    const bp = join(FX, "baseline-manifest.json");
    if (maniKind !== "absent") {
      const rows = maniKind === "empty" ? [] : [{ rel: BASE_REL, sha256: maniKind === "drift" ? "0".repeat(64) : sha256(baseBuf), sha16: (maniKind === "drift" ? "0".repeat(64) : sha256(baseBuf)).slice(0, 16), bytes: baseBuf.length }];
      writeFileSync(bp, JSON.stringify({ schema: "mp-baseline-manifest/v1", dir: "tmp/qa/fixtures/emitlanes", hash: "sha256", rows }));
    }
    const laneOut = join(FX, "out");
    const r = spawnSync(process.execPath, [SELF, "--ledger", lp, "--manifest", join(FX, "manifest.json"), "--baseline-manifest", bp, "--round", "ST", "--per-lane", "1", "--out", laneOut, ...extra], { encoding: "utf8" });
    const out = String(r.stdout || "") + String(r.stderr || "");
    const briefed = existsSync(laneOut) && readdirSync(laneOut).some((f) => f.endsWith(".brief.md"));
    /* 红用例必须"既红又没派发"：只红但照样写出任务书，等于警告，泳道还是会拿到缺图的参照。 */
    const passCase = r.status === wantExit && out.includes(wantIn) && (wantExit === 0 ? briefed : !briefed);
    ok += passCase ? 1 : 0;
    console.log(`${passCase ? "PASS" : "FAIL"}  ${name} 期望exit=${wantExit}/含"${wantIn}"/派发=${wantExit === 0 ? "有" : "无"} 实测exit=${r.status}/命中=${out.includes(wantIn)}/写了任务书=${briefed ? "有" : "无"}  ${why}`);
    if (!passCase) console.log(`      输出尾部=${out.replace(/\s+$/, "").split("\n").slice(-2).join(" ⏎ ")}`);
  }
  rmSync(FX, { recursive: true, force: true });
  console.log(`\nEMITLANES_SELFTEST=${ok === cases.length ? "PASS" : "FAIL"} ${ok}/${cases.length}（4 个红用例各自实注入、绿用例走正路；夹具目录已清理）`);
  process.exit(ok === cases.length ? 0 : 1);
}

if (!existsSync(ledgerP) || !existsSync(manifestP)) { console.log(`${RK}=NOT-EVIDENCED reason=ledger|manifest 读不到`); process.exit(2); }

const ledger = JSON.parse(readFileSync(ledgerP, "utf-8"));
const manifest = JSON.parse(readFileSync(manifestP, "utf-8"));
const byRoute = new Map();
for (const rec of (manifest.results || [])) byRoute.set(rec.route, rec);

const wantRows = (ledger.rows || []).filter((r) => flag("all") ? true : r.baselineStatus === "有基准");

/* 声明"有基准"的页，它引用的理想效果图必须真在盘上——这里当场核对，缺一张就整发失败。
   为什么不能放过去：任务书里那行兜底文案（"无基准页：按规范文档 §3 比"）只看 p.images 是否为空数组，
   不看图打不打得开。ledger 写了路径、文件却被改名/删掉时，images 非空 ⇒ 泳道仍被告知"逐张 Read"，
   读不到就自己找参照物，产出的必然是拿规范文档比截图的那类假缺陷（R1 同款的失效方式）。
   宁可这里红、让人去修 ledger，也不派一批注定产出假缺陷的泳道。 */
const baselineGaps = [];
for (const r of wantRows) {
  if (r.baselineStatus !== "有基准") continue;
  const imgs = (r.baselineImages || []).filter(Boolean);
  const gone = imgs.filter((p) => !existsSync(resolve(REPO, String(p))));
  if (!imgs.length) baselineGaps.push({ route: r.route, kind: "声明有基准但一条基准图都没登记", gone: [] });
  else if (gone.length === imgs.length) baselineGaps.push({ route: r.route, kind: "引用的基准图全部不存在", gone });
  else if (gone.length) baselineGaps.push({ route: r.route, kind: `引用的基准图部分不存在（${gone.length}/${imgs.length}）`, gone });
}
if (baselineGaps.length) {
  console.log(`${RK}=FAIL reason=基准图缺失（ledger 声明"有基准"却读不到文件，派发下去只会产出假缺陷）`);
  for (const g of baselineGaps) {
    console.log(`BASELINE_MISSING route=${g.route} ${g.kind}`);
    for (const p of g.gone) console.log(`  读不到=${p}`);
  }
  console.log(`BASELINE_MISSING_COUNT=${baselineGaps.length}  修法：把 ledger 的 baselineImages 指到素材/理想效果图/ 下真实存在的文件，或把该行改成 baselineStatus=无基准 并走规范文档口径。`);
  process.exit(1);
}

/* "文件在" ≠ "文件还是当初那张图"。同名换图（基准被重新生成/覆盖）上面那道存在性检查是看不见的，
   而泳道会拿新图去核对旧裁决依据，产出的整批缺陷级别都失去可比性。
   所以基准图必须落在一张 tracked 的 sha256 清单上；清单默认取 ledger 同目录的 baseline-manifest.json
   （一次审查一份，跟 ledger 放一起），字节核对本身交给 emit-baseline-manifest.mjs，这里只转发它的结论，
   免得出两处口径不一致的判决。 */
const MANI_P = resolve(arg("baseline-manifest", join(dirname(ledgerP), "baseline-manifest.json")));
const normRel = (p) => String(p).split(/[\\/]+/).join("/");
if (!existsSync(MANI_P)) {
  console.log(`${RK}=FAIL reason=基准指纹清单缺失 ${normRel(relative(REPO, MANI_P))} ⇒ 基准图没有字节指纹，跨轮无法核对是不是同一张图`);
  console.log(`  生成：node scripts/qa/emit-baseline-manifest.mjs --write --out ${normRel(relative(REPO, MANI_P))}`);
  process.exit(1);
}
const MANI_ROWS = new Map((JSON.parse(readFileSync(MANI_P, "utf-8")).rows || []).map((r) => [normRel(r.rel), r]));
const noFp = [];
for (const r of wantRows) {
  if (r.baselineStatus !== "有基准") continue;
  for (const p of (r.baselineImages || []).filter(Boolean)) if (!MANI_ROWS.has(normRel(p))) noFp.push(`${r.route} → ${normRel(p)}`);
}
if (noFp.length) {
  console.log(`${RK}=FAIL reason=引用的基准图不在指纹清单覆盖范围内（盘上有图、清单无指纹）`);
  for (const x of noFp) console.log(`BASELINE_NOFP ${x}`);
  console.log(`  修法：node scripts/qa/emit-baseline-manifest.mjs --write（把当前盘上现状登记进清单），或确认这张图是不是不该当基准。`);
  process.exit(1);
}
{
  const chk = spawnSync(process.execPath, [join(HERE, "emit-baseline-manifest.mjs"), "--out", MANI_P], { encoding: "utf8" });
  const out = String(chk.stdout || "") + String(chk.stderr || "");
  const verdict = (out.split(/\r?\n/).find((l) => l.startsWith("BASEMANI_RESULT")) || "BASEMANI_RESULT=未输出判决行").trim();
  if (chk.status !== 0) {
    console.log(`${RK}=FAIL reason=基准图字节与清单不符 ⇒ 基准被换过，此前引用它的裁决要重看`);
    for (const line of out.split(/\r?\n/).filter((l) => l.startsWith("BASEMANI_"))) console.log(`  ${line}`);
    process.exit(1);
  }
  console.log(`EMITLANES_BASELINE 指纹核对=${verdict}`);
}
const pages = [];
const excluded = [];
for (const r of wantRows) {
  const rec = byRoute.get(r.route);
  const all = ((rec && rec.frames) || []);
  /* 只把"落点已验且与目标页一致"的帧交给泳道。
     为什么这条必须写死：R1 实测 pages/discover/index 的顶部帧与登录页逐字节相同
     （那次导航停在登录页），而 --resume 保留的旧帧当跑没读落点（landingVerified:false）。
     泳道拿这种图去比理想效果图，产出的必然是假缺陷；不如明写"这一页本轮未取证"。 */
  const frames = all.filter((f) => Number(f.bytes) > 3000 && f.contentHash && !f.landingMismatch && f.landingVerified !== false);
  const dropped = all.length - frames.length;
  if (dropped > 0) {
    const why = all.filter((f) => f.landingMismatch).length ? "落点不符" : "落点未验(resume旧帧)";
    excluded.push({ route: r.route, dropped, why, states: all.filter((f) => !(Number(f.bytes) > 3000 && f.contentHash && !f.landingMismatch && f.landingVerified !== false)).map((f) => f.state) });
  }
  if (!frames.length) continue;
  pages.push({ route: r.route, images: r.baselineImages || [], frames: frames.map((f) => ({ state: f.state, path: f.path, hash: f.contentHash, bytes: f.bytes, query: (rec && rec.query) || "" })), identity: r.identityPrecondition });
}

/* 已修清单（--fixed <fixlist-R1.json> + --fixvis <fix-visibility.json>）：
   下一轮泳道必须拿到"上一轮改了什么、改动在帧上是否可见"两件事，否则会出现两种坏结果：
   把已修的当新增重报（账上重复计数），或看到画面变了就当修对了（自述不算数）。 */
let FIXED_BY_ROUTE = new Map();
const fixedP = arg("fixed", ""), fixvisP = arg("fixvis", "");
if (fixedP && existsSync(resolve(fixedP))) {
  const fl = JSON.parse(readFileSync(resolve(fixedP), "utf-8"));
  const vis = fixvisP && existsSync(resolve(fixvisP)) ? JSON.parse(readFileSync(resolve(fixvisP), "utf-8")) : null;
  const visKey = (r, st) => `${r}__${st}`;
  const visByRoute = new Map();
  if (vis) for (const row of (vis.rows || [])) {
    if (!visByRoute.has(row.route)) visByRoute.set(row.route, []);
    visByRoute.get(row.route).push(row);
  }
  for (const b of (fl.batches || [])) {
    for (const r of (b.pages || [])) {
      if (!FIXED_BY_ROUTE.has(r)) FIXED_BY_ROUTE.set(r, []);
      FIXED_BY_ROUTE.get(r).push({ batch: b.batch_id, file: (b.files || []).join(","), defects: b.defects || [], axes: b.axes || [] });
    }
  }
  console.log(`EMITLANES_FIXED 载入上一轮批次=${(fl.batches || []).length} 覆盖路由=${FIXED_BY_ROUTE.size}${vis ? " 像素对照行=" + (vis.rows || []).length : " 无像素对照"}`);
  globalThis.__FIXVIS__ = vis ? new Map((vis.rows || []).map((x) => [visKey(x.route, x.state), x])) : new Map();
}

const lanes = [];
for (let i = 0; i < pages.length; i += perLane) {
  const slice = pages.slice(i, i + perLane);
  const idx = lanes.length + 1;
  lanes.push({
    lane_id: `${round}-L${String(idx).padStart(2, "0")}`,
    pages: slice,
    frame_total: slice.reduce((a, p) => a + p.frames.length, 0),
    defect_id_prefix: `${round}-L${String(idx).padStart(2, "0")}`,
    out_file: `tmp/qa/lanes/${round}/${round}-L${String(idx).padStart(2, "0")}.md`,
  });
}

/* 分母与泳道取材用同一个谓词（可用 = 过地板 + 有 hash + 落点已验且相符），
   否则守恒式左边少了 excluded，会把"被剔除的帧"读成"漏审"。 */
const usable = (f) => Number(f.bytes) > 3000 && !!f.contentHash && !f.landingMismatch && f.landingVerified !== false;
const scopedResults = (manifest.results || []).filter((r) => !flag("all") ? ((ledger.rows.find((x) => x.route === r.route) || {}).baselineStatus === "有基准") : true);
const frameTotal = lanes.reduce((a, l) => a + l.frame_total, 0);
const scopedFrames = scopedResults.flatMap((r) => (r.frames || []).filter(usable)).length;
/* scopedAllFrames 必须是求和。上一版写成 flatMap(r => 数字)：flatMap 不拍平数字，
   于是打印出 "可用帧=17/2,2,2,0,…" 与 "被剔除帧=NaN" —— 自检读数自己是坏的，
   这种行比没有行更坏（它让人以为分母是那一串乱码）。 */
const scopedAllFrames = scopedResults.reduce((a, r) => a + (r.frames || []).length, 0);
const conserved = frameTotal === scopedFrames;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `lanes-${round}.json`), JSON.stringify({
  schema: "mp-fidelity-lanes/v1", round, generatedAt: new Date().toISOString(),
  ledger: ledgerP.replace(REPO + "/", ""), manifest: manifestP.replace(REPO + "/", ""),
  band: manifest.band, perLane, lanes,
  conservation: { laneFrameTotal: frameTotal, scopedFrames, scopedFramesAll: scopedAllFrames, conserved },
  excludedFrames: excluded,
}, null, 2) + "\n", "utf-8");

/* 任务书正文：每泳道一份，帧路径/hash/理想图/输出路径/交付格式全部写死在里面。
   刻意把"必须逐帧开图"和"散文不算缺陷"写在最前面——这是这道配额最容易失效的地方。 */
for (const l of lanes) {
  const lines = [];
  lines.push(`# 任务书 ${l.lane_id}（第 ${round} 轮 · 找茬泳道）`);
  lines.push(``);
  lines.push(`你是保真审查泳道 **${l.lane_id}**。你只负责下面这几页，别的页不归你（改别人的文件会互相覆写）。`);
  lines.push(``);
  /* 严重度口径必须写进任务书。理由（R8 实测）：上一发派发只在主代理的对话里口头分级，
     卡上没锁口径 ⇒ 同一件事在不同泳道手里可以是 P1 也可以是 P2，
     "末轮 P0/P1=0"这条判据就失去跨轮可比性（R7 57 条 / R8 237 条里 50 条 P1，
     涨了一个量级，但涨的是分母还是尺子说不清）。尺子进件，不靠记忆。 */
  lines.push(`## 严重度口径（判 P0/P1 必须写清用户拿不到什么，写不出就降 P2）`);
  lines.push(`- **P0** 这页用不了：主操作不可见或不可点、关键内容整块缺席、数据显示错到误导决策（张冠李戴、假计数）。`);
  lines.push(`- **P1** 能看但不能交付：理想图明确要求的模块/控件缺失，或位置错到不成其为该页；正文级文字对比 <4.5:1；必点控件热区 <88rpx 且没有替代出口。`);
  lines.push(`- **P2** 可测偏差但不影响使用：间距/圆角/字号档次不对、次级文字对比落在 3:1–4.5:1、非关键装饰色或描边不对。`);
  lines.push(`- **P3** 细节与一致性：标点与全半角、同域两页取档不一、无消费者的孤儿样式。`);
  lines.push(`判级只看上面四条对着帧的实测读数；**不许为了"让本轮好看"降级，也不许照抄上一轮的级别**——上一轮的级是它当时的证据，不是你这条的证据。`);
  lines.push(``);
  lines.push(`## 硬要求（先读这三条）`);
  lines.push(`1. **逐帧真的打开看**：用 Read 工具读下面每一张 PNG（图片可读），再看对应的理想效果图。`);
  lines.push(`   每条缺陷必须带该帧的 \`frame_hash\`（已给，逐字抄），否则复核门判定"这张图没被打开过"。`);
  lines.push(`2. **每张截图至少一条缺陷**，且必须是**可测轴**上的问题。词表只有这些：`);
  lines.push(`   位置 / 尺寸比例 / 颜色token / 圆角 / 字号 / 间距 / 素材缺失 / 空态文案 / 层级遮挡 / 可达性 / 文案 / 需新建。`);
  lines.push(`   "观感不佳""建议优化""整体偏乱"这类散文一律记 0 条 ⇒ 该帧视为未交。`);
  lines.push(`3. **每条缺陷要有源码证据**：\`source_citation: 相对路径.vue:行号\`。`);
  lines.push(`   行号必须真实存在且该行有内容（门会逐条回抓，抓不到就整条作废）。查行号请用 Grep 定位，不要通读大文件。`);
  lines.push(``);
  lines.push(`## 你负责的页与帧`);
  for (const p of l.pages) {
    lines.push(``);
    lines.push(`### ${p.route}`);
    lines.push(`- 身份前提：${p.identity}`);
    const withFp = (x) => {
      const fp = MANI_ROWS.get(normRel(x));
      return fp ? `${x}（sha16=\`${fp.sha16}\`，${fp.bytes}B）` : x;
    };
    const noBaselineHint = "（无基准页：按 deliverables/全站素材补齐-2026-09-12/全站设计规范与逐页设计稿说明.md §3 该页说明 + src/components/common/ 组件规范比）";
    lines.push(`- 理想效果图（Read 可看图）：${p.images.length ? p.images.map(withFp).join(" ｜ ") : noBaselineHint}`);
    if (p.images.length) lines.push(`  ↳ 缺陷卡片里"理想图依据"请连 sha16 一起抄；对不上这个指纹说明你比的是换过的图，那条缺陷作废。`);
    for (const f of p.frames) lines.push(`- 帧：\`${f.path}\`（sha16=\`${f.hash}\`，${f.bytes}B，状态=${f.state}）`);
  }
  lines.push(``);
  if (FIXED_BY_ROUTE.size) {
    lines.push(`## 上一轮已修了什么（来自 fixlist + 逐帧像素对照，不是泳道自述）`);
    lines.push(`对每一页：先**用眼睛确认改动在帧上看得见**，再找新问题。`);
    lines.push(`- 画面变了 ≠ 修对了：要看它是否真的对齐了理想图那条轴；没对齐就报**同一条轴的新缺陷**并写"上一轮修得不对"。`);
    lines.push(`- 同一条轴、同一个现象、且画面确实没变的，**不要重报为新增**（那会让轮次之间重复计数）。`);
    for (const p of l.pages) {
      const fx = FIXED_BY_ROUTE.get(p.route) || [];
      lines.push(``);
      lines.push(`### ${p.route} 上一轮批次：${fx.length ? "" : "（无，这一页没动过）"}`);
      for (const b of fx) lines.push(`- 批次 ${b.batch} 改 \`${b.file}\`，销的缺陷 ${b.defects.join(",")}${(b.axes || []).length ? "，轴 " + b.axes.join("/") : ""}`);
      const V = globalThis.__FIXVIS__ || new Map();
      for (const f of p.frames) {
        const v = V.get(`${p.route}__${f.state}`);
        if (v) lines.push(`- 帧 ${f.state}：改前 sha16=${v.prev || "-"} → 改后 sha16=${v.cur || "-"} ⇒ ${v.verdict}`);
      }
      if (fx.length && p.frames.every((f) => !V.has(`${p.route}__${f.state}`))) lines.push(`- ⚠ 这一页没有像素对照记录 ⇒ 改动是否上屏未知，先判"需复拍确认"，不要当成已修`);
    }
  }
  lines.push(`## 交付格式（写到这个路径，一件产物，不要写别的文件）`);
  lines.push(`\`${l.out_file}\``);
  lines.push(``);
  lines.push(`文件骨架（先落骨架再逐帧补内容，避免中途没写完）：`);
  lines.push("```");
  lines.push(`# ${l.lane_id} 缺陷卡`);
  lines.push(``);
  lines.push(`## FRAME <帧相对路径，逐字来自上面>`);
  lines.push(`- frame_hash: <该帧 sha16>`);
  lines.push(`- defect_id: ${l.defect_id_prefix}-D01`);
  lines.push(`- page: <路由>`);
  lines.push(`- axis: <词表内的一项>`);
  lines.push(`- severity: P0|P1|P2|P3`);
  lines.push(`- 理想图依据: <理想图文件名 + 区域描述；无基准页写 无基准，依据=规范文档§x 或 组件规范>`);
  lines.push(`- fix_category: CSS/token | 单页 | 需新建目标功能`);
  lines.push(`- source_citation: apps/client/src/....vue:<行号>`);
  lines.push(`- 现象: <一句话说清画面上哪里不对（尺寸/颜色/位置/缺什么）>`);
  lines.push(`- 建议改法: <一句话>`);
  lines.push(`## FRAME ...`);
  lines.push("```");
  lines.push(``);
  lines.push(`## 边界`);
  lines.push(`- 只读代码 + 只写你自己那一个交付文件。不要改 .vue/.scss（修复由后续批次泳道做，它们按文件所有权互斥）。`);
  lines.push(`- 不要跑构建、不要上设备、不要碰 tmp/qa/frames。`);
  lines.push(`- 调用预算：≤110 次工具调用、≤45 次文件读取；定位一律用 Grep，超大文件点名 offset 片段读。`);
  lines.push(`- 数量下限：你至少有 ${l.frame_total} 条缺陷（每帧一条）。真找不出第二条，就换轴再看（间距/圆角/字号/层级都是独立轴）。`);
  lines.push(``);
  writeFileSync(join(outDir, `${l.lane_id}.brief.md`), lines.join("\n"), "utf-8");
}

console.log(`EMITLANES_OUT=${outDir.replace(REPO + "/", "")} lanes=${lanes.length} pages=${pages.length} frames=${frameTotal}`);
console.log(`EMITLANES_UNCAPTURED 可用帧=${frameTotal}/${scopedAllFrames} 被剔除帧=${scopedAllFrames - frameTotal}（落点未验或落点不符，这些页/状态本轮不许拿去比理想图，进报告"未取证"段）`);
for (const x of excluded) console.log(`EMITLANES_EXCLUDED ${x.route} 剔除=${x.dropped} 原因=${x.why} 状态=${x.states.join(",")}`);
/* 整页零可用帧逐页点名：该页本轮没有一张图交给任何泳道 ⇒ 就是"本轮没审这一页"，
   必须进报告未取证段并写明缺的是哪一类前置（身份/状态/通道），不许安静消失。 */
const routesWithFrames = new Set(pages.map((p) => p.route));
for (const r of wantRows) {
  if (routesWithFrames.has(r.route)) continue;
  const rec = byRoute.get(r.route);
  const n = ((rec && rec.frames) || []).length;
  console.log(`EMITLANES_UNCAPTURED_PAGE ${r.route} 清单里该页帧数=${n}${((rec && rec.errors) || []).length ? " 腿记原因=" + String(rec.errors[0]).slice(0, 90) : ""} ⇒ 本轮无图可审，进报告未取证段（不是"没问题"）`);
}
for (const l of lanes) console.log(`  LANE ${l.lane_id} pages=${l.pages.length} frames=${l.frame_total} brief=tmp/qa/lanes/${round}/${l.lane_id}.brief.md out=${l.out_file}`);
console.log(conserved ? `${RK}=PASS lanes=${lanes.length} frames=${frameTotal} scopedFrames=${scopedFrames} 守恒=yes` : `${RK}=FAIL laneFrameTotal=${frameTotal} scopedFrames=${scopedFrames} ⇒ 有帧没派给任何泳道（漏审）`);
process.exit(conserved ? 0 : 1);
