#!/usr/bin/env node
/* 把「配方 + 取景结果」合成台账判决。这是 ① 那笔帧债的收口载体。
 *
 * 三条铁律（都是本轮被点过名的错）：
 *  1. 只有**当轮真拍出来的帧**才能改判。帧不存在、字节太小、或路径对不上 ⇒ 一律不改，并点名。
 *  2. 机器判点没过（该出现的没出现、不该出现的出现了）⇒ 判 `待修复`，把实测值写进去。
 *     这是发现，不是失败；把它写成"已修复"才是问题。
 *  3. 判据只能靠人读帧（FRAME_ONLY）⇒ 状态仍是"待复验"，但 statusEvidence 里必须有帧路径，
 *     这样"欠的是人眼"这件事在账上是看得见的，不会伪装成已闭环。
 *
 * 产出：
 *   reports/audit/round-7/cellplan-round7-frames.json   —— 台账补丁计划（默认 dry，交给 patch-ledger-cells）
 *   reports/audit/round-7/frame-verdicts.md             —— 逐条判决与理由
 *
 * 用法：node scripts/qa/verdict-from-frames.mjs [--frames <f>[,<f>…]] [--plan <f>]
 *       [--frames-index <本轮权威索引>] [--out <落盘目录>]
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PLAN = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-merged.json"));
/* 自测专用 --out（默认值与改前逐字一致）：本轮设备队列正在往 reports/audit/round-7/ 写帧与索引，
   离线证明不能再落进同一个目录（同 verify-evidence-corpus.mjs:35 开 --root 的理由）。
   它只改落点，不改任何判据、分桶或退出码。 */
const OUT = resolve(REPO, arg("out", "reports/audit/round-7"));

/* ── H1：取景集不再钉死在单个目录上 ────────────────────────────────────────────
   旧写法是 `--frames` 默认值 = reports/audit/round-7/uidebt-shoot/shoot-results.json 一个文件
   （实测那份现在只有 1 行），于是 8b 巡检的
   reports/screenshots/round-7-stage8b-tour-B-real/ 整批帧在扫描集之外：跑完照样打 FV_RESULT=OK，
   而它一条新证据都没看过 —— 这正是"看起来跑了"的那种洞。
   现在按**本轮已经在维护的声明索引**派生，而不是我猜目录名：
     源 A  权威索引 screenshot-manifest.json 的 derivation.corpora[].manifest
           —— rebuild-frozen-manifest.mjs:157-163 逐 corpus 登记"本轮有哪些 corpus、各带哪个 gitSha"，
              这条轴由账本回答；
     源 B  同目录的 screenshot-manifest.<label>.json —— 巡检在 corpus-union 腿**之前**就把本批帧
           冻成这一族 subset（tour-r6.mjs:1885），盘上没有任何清单登记它们，
           ⇒ 这是本改动里唯一省不掉的字面量（省掉它就得在 A 之外再造一份清单文件，那是新增账本而不是读账本）；
     源 C  旧的那一份 uidebt-shoot/shoot-results.json 原样保留，并排在**最后** ——
           后给的覆盖先给的（:31 的既有规矩），而 corpus manifest 只有 shots[]、没有配方点名的机器判点，
           让带判点的那份赢，才能保证"原本被扫到的帧一条都不掉、原判一条都不变"。
   --frames 显式给了就完全用显式的那份（口径不许被我在背后换掉）。 */
const INDEX = resolve(REPO, arg("frames-index", "reports/audit/round-7/screenshot-manifest.json"));
const LEGACY_FRAMES = "reports/audit/round-7/uidebt-shoot/shoot-results.json";
const relOf = (p) => String(p).split("\\").join("/").replace(REPO.split("\\").join("/") + "/", "");

function derivedSources() {
  const out = [], seen = new Set();
  const push = (rel, kind) => {
    const abs = resolve(REPO, rel);
    if (seen.has(abs)) return;
    seen.add(abs);
    out.push({ abs, rel: relOf(abs), kind, missing: !existsSync(abs) });
  };
  let idx = null;
  if (existsSync(INDEX)) { try { idx = JSON.parse(readFileSync(INDEX, "utf8")); } catch { idx = null; } }
  for (const c of ((idx || {}).derivation || {}).corpora || []) if (c && c.manifest) push(c.manifest, "源A·权威索引登记的 corpus");
  if (idx && idx.derivation === undefined) push(relOf(INDEX), "源A·权威索引（无 derivation，直接读顶层 shots）");
  const idir = dirname(INDEX);
  if (existsSync(idir)) {
    for (const n of readdirSync(idir).sort()) {
      if (!/^screenshot-manifest\..+\.json$/.test(n)) continue;   // 不含 screenshot-manifest.json 自己（已由源A处理）
      push(relOf(join(idir, n)), "源B·巡检 subset 冻帧（union 腿之前就在盘上）");
    }
  }
  push(LEGACY_FRAMES, "源C·旧默认取景结果（带机器判点 ⇒ 必须排最后）");
  return out;
}

const EXPLICIT = process.argv.indexOf("--frames") >= 0;
const SOURCES = EXPLICIT
  ? arg("frames", "").split(",").map((s) => s.trim()).filter(Boolean).map((f) => ({ abs: resolve(REPO, f), rel: relOf(resolve(REPO, f)), kind: "显式点名", missing: !existsSync(resolve(REPO, f)) }))
  : derivedSources();
const FRAMES_LIST = SOURCES.filter((s) => !s.missing);
if (!FRAMES_LIST.length) { console.log("FV_RESULT=FAIL reason=取景集是空的（默认派生与显式 --frames 都没落到盘上文件）；空扫描集不得出判决"); process.exit(2); }
/* 派生模式下旧那份必须在场：它掉了就说明源 C 那条字面量被换错地方，等于本轮绿转红。 */
if (!EXPLICIT && !FRAMES_LIST.some((s) => s.abs === resolve(REPO, LEGACY_FRAMES))) {
  console.log("FV_RESULT=FAIL reason=派生集里没有旧默认的 " + LEGACY_FRAMES + " ⇒ 原先被扫的帧会整批离开扫描集，宁可红"); process.exit(2);
}

const frameFiles = FRAMES_LIST.map((s) => s.abs);
for (const [label, f] of [["配方", PLAN], ...FRAMES_LIST.map((s) => ["取景结果", s.abs])]) {
  if (!existsSync(f)) { console.log("FV_RESULT=FAIL reason=" + label + "不存在 " + relOf(f) + "（没有证据就不出判决）"); process.exit(2); }
}
const plan = JSON.parse(readFileSync(PLAN, "utf8"));
/* 多个取景文件：后给的覆盖先给的（同一 id 只留最后一次测量）。
   覆盖成"没拿到帧"时必须点名——否则一次失败的补跑会静默吃掉上一轮的有效证据。
   每条行都记下自己来自哪一份（framesFrom），判决里能看出这个结论是哪一次取景给的。
   corpus 型来源（巡检/执行 corpus 的 manifest-detail.json）只有 shots[]、没有 rows[]，
   这里按同一套字段名归一化成行，并显式打 probeRan=false —— 它的帧只证明"这个路由当轮出过帧"，
   不含配方点名的判点结论；不打标就会被 :139 那条 !hard.length 读成"待人读帧"，
   把"探针没跑"洗成"欠人眼"，那是换个说法的伪装闭环。 */
function shotsToRows(j, tag) {
  const rows = [];
  for (const s of j.shots || []) {
    const p = String(s.path || "");
    if (!p) continue;
    rows.push({
      id: String(s.caseId || ""),                       // 取景 corpus 带配方行 id；巡检帧不带（tour-r6.mjs:1290 的 shot 只有 page/state/route）
      route: String(s.route || s.page || ""),
      landing: String(s.route || s.page || ""),
      status: "SHOT",
      frame: p,
      bytes: Number(s.bytes || 0),
      checks: [],
      probeRan: false,
      carrier: (s.corpus || tag) + "@" + String(j.gitSha || "?"),
      identity: s.identity || "?",
      state: s.state || "",
    });
  }
  return rows;
}
const byId = new Map();
const routeFrames = new Map();   // route -> {n, corpus:Set, sample} —— 巡检帧的"路由级在场"账
const overwrites = [], srcs = [];
const planIdSet = new Set((plan.rows || []).map((r) => r.id));
let offPlan = 0;
for (let i = 0; i < frameFiles.length; i++) {
  const f = frameFiles[i];
  const tag = FRAMES_LIST[i].rel;
  const j = JSON.parse(readFileSync(f, "utf8"));
  const isShots = !(j.rows && j.rows.length);
  const rows = isShots ? shotsToRows(j, tag) : j.rows.map((r) => ({ ...r, probeRan: r.probeRan === undefined ? true : r.probeRan }));
  srcs.push({ tag, kind: FRAMES_LIST[i].kind, shape: isShots ? "shots(corpus 索引)" : "rows(带判点)", gitSha: j.gitSha || "?", identitySeen: j.identitySeen || "?", verifyLast: j.verifyLast || "?", rows: rows.length });
  for (const r0 of rows) {
    const r = { ...r0, framesFrom: tag };
    if (!r.probeRan && r.route) {
      const e = routeFrames.get(r.route) || { n: 0, corpus: new Set(), sample: r.frame };
      e.n++; e.corpus.add(r.carrier || tag); routeFrames.set(r.route, e);
    }
    if (!r.id) continue;                 // 巡检帧没有配方行 id：进路由账，不冒充行级证据
    /* corpus 来源的 caseId 轴是各 suite 自己的编号（DC01/CI07…），跨 corpus 会撞名，
       而且绝大多数根本不是配方行 id ⇒ 只对得上配方的才进行级归属。
       旧默认那份（rows 型）不受这条限制，免得把原本被扫的证据筛掉。 */
    if (isShots && !planIdSet.has(r.id)) { offPlan++; continue; }
    const prev = byId.get(r.id);
    if (prev && prev.status === "SHOT" && r.status !== "SHOT") overwrites.push(r.id + ": " + prev.status + "→" + r.status);
    byId.set(r.id, r);
  }
}
if (overwrites.length) console.log("FV_WARN 后一次取景把 " + overwrites.length + " 条有效帧覆盖成无帧（后者胜，逐条点名）：" + overwrites.join("、"));
const fr = { plan: String(plan.generatedAt || "?"), srcs };
const planItems = plan.rows || [];
if (!planItems.length || !byId.size) { console.log("FV_RESULT=FAIL reason=输入为空集，空集不得出判决"); process.exit(2); }

/* 收紧之后必须核"有没有原本被扫的帧离开扫描集"（本仓规矩：收紧判据要审绿损）。
   前值 = 旧默认那一份（源C）里的行；后值 = 现在 byId 里的同一批 id。派生模式下源C 排在最后 ⇒ 恒等。 */
const legacySrc = EXPLICIT ? null : FRAMES_LIST.find((s) => s.abs === resolve(REPO, LEGACY_FRAMES));
let scanBefore = { files: 1, rows: 0, ids: new Set(), frames: new Set() };
if (legacySrc) {
  const lj = JSON.parse(readFileSync(legacySrc.abs, "utf8"));
  for (const r of lj.rows || []) { scanBefore.rows++; scanBefore.ids.add(r.id); if (r.frame) scanBefore.frames.add(r.frame); }
}
const droppedIds = [...scanBefore.ids].filter((id) => id && !byId.has(id));
const droppedFrames = [...scanBefore.frames].filter((p) => ![...byId.values()].some((r) => r.frame === p));
const scanAfter = { files: frameFiles.length, rows: byId.size, frames: new Set([...byId.values()].map((r) => r.frame).filter(Boolean)).size };
console.log("FV_SCANSET 来源=" + scanAfter.files + " 份（" + (EXPLICIT ? "显式 --frames" : "源A corpus=" + srcs.filter((s) => s.kind.startsWith("源A")).length + " 源B subset=" + srcs.filter((s) => s.kind.startsWith("源B")).length + " 源C 旧默认=1") + "）" +
  " 取景行 " + scanBefore.rows + "→" + scanAfter.rows + " 落盘帧路径 " + scanBefore.frames.size + "→" + scanAfter.frames +
  " ｜巡检路由级帧 route=" + routeFrames.size + " 张=" + [...routeFrames.values()].reduce((a, x) => a + x.n, 0) +
  " corpus 帧里对不上配方 id 的=" + offPlan);
for (const s of srcs) console.log("  FV_SRC " + s.tag + " :: " + s.kind + " " + s.shape + " sha=" + s.gitSha + " 行=" + s.rows);
console.log("FV_GREENLOSS 离集的原有取景行=" + droppedIds.length + (droppedIds.length ? "（" + droppedIds.slice(0, 10).join(",") + "）" : "") + " 离集的原有帧路径=" + droppedFrames.length +
  (droppedIds.length || droppedFrames.length ? " ⇒ 有 previously-scanned 证据掉出扫描集，必须逐条解释" : "（0＝一条都没掉，原判不受影响）"));
if (droppedIds.length || droppedFrames.length) { console.log("FV_RESULT=FAIL reason=收紧扫描集把原有证据挤出去了，见上面 FV_GREENLOSS"); process.exit(2); }

const patches = [], bucket = { NO_LANDING: 0, IDENTITY_MISMATCH: 0, LOCK_SCREEN_BLOCKED: 0, STATE_NOT_APPLIED: 0, LEFT_PAGE: 0, FIXED_FRAME: 0, REGRESSION: 0, NEEDS_EYE: 0, NO_FRAME: 0, NOT_SHOOTABLE: 0, REWRITE: 0, CARRIER_NO_PROBE: 0, TOUR_ROUTE_ONLY: 0 };
const md = ["# round-7 · 帧级判决（取景来源 " + fr.srcs.length + " 份）", "",
  ...fr.srcs.map((s) => "- 来源 `" + s.tag + "`（" + s.kind + "，" + s.shape + "）sha=" + s.gitSha + " 行=" + s.rows + " 身份=" + s.identitySeen + "/" + s.verifyLast), "",
  "| id | 判决 | 机器判点 | 帧 |", "|---|---|---|---|"];


for (const it of planItems) {
  const r = byId.get(it.id);
  if (it.disposition === "NOT_SHOOTABLE") {
    bucket.NOT_SHOOTABLE++;
    patches.push({ id: it.id, col: 9, new: "配方判 NOT_SHOOTABLE：" + String(it.unresolved || "").replace(/\|/g, "／").slice(0, 150), why: "把缺哪个夹具写进账，不让它冒充已闭环" });
    md.push("| " + it.id + " | NOT_SHOOTABLE | — | — |");
    continue;
  }
  if (it.disposition === "REWRITE") {
    bucket.REWRITE++;
    patches.push({ id: it.id, col: 9, new: "配方判 REWRITE（判据本身要改）：" + String(it.unresolved || "").replace(/\|/g, "／").slice(0, 150), why: "判据不可判不是缺陷不存在，写清楚欠的是判据" });
    md.push("| " + it.id + " | REWRITE | — | — |");
    continue;
  }
  if (!r || r.status !== "SHOT" || !r.frame) {
    /* 这一条没有行级帧，但**巡检可能在这一页当轮出过帧**（巡检帧只带 page/state/route，不带配方行 id，
       所以进不了 byId，见 shotsToRows 的注释）。以前这种情况直接是 NO_FRAME 且不留任何补丁，
       于是"8b 拍了 62 页"这件事在账上一个字都没有 —— 正是本条要堵的沉默。
       这里只把"路由级在场"写进 statusEvidence，不动状态列：它既不是复验通过也不是判红。 */
    const rf = routeFrames.get(String(it.route || ""));
    if (rf) {
      bucket.TOUR_ROUTE_ONLY++;
      patches.push({ id: it.id, col: 9, new: ("本轮巡检在路由 " + it.route + " 出过 " + rf.n + " 张帧（" + [...rf.corpus].join("、").slice(0, 60) + "），"
        + "但巡检帧只带 page/state/route、不带本条配方行 id，也没跑本条的 " + (it.assertions || 0) + " 个判点 ⇒ 不作复验判据，欠点名的取景腿（shoot-frameplan --only-ids / r-exec）重拍")
        .replace(/\|/g, "／").slice(0, 220), why: "巡检帧到了这一页这件事要入账，但不能冒充这一条已复验" });
      md.push("| " + it.id + " | 巡检帧仅到路由 | 0/" + (it.assertions || 0) + " | " + rf.sample + " |");
      continue;
    }
    bucket.NO_FRAME++;
    md.push("| " + it.id + " | NO_FRAME | — | " + (r ? String(r.reason || "").slice(0, 40) : "取景里没有这条") + " |");
    continue;
  }
  const abs = resolve(REPO, r.frame);
  if (!existsSync(abs)) { bucket.NO_FRAME++; md.push("| " + it.id + " | NO_FRAME | — | 帧路径不落盘：" + r.frame + " |"); continue; }
  const realBytes = statSync(abs).size;
  if (realBytes < 3000 || realBytes !== r.bytes) {
    bucket.NO_FRAME++;
    md.push("| " + it.id + " | NO_FRAME | — | 字节对不上（记 " + r.bytes + " / 实 " + realBytes + "）|");
    continue;
  }
  const checks = r.checks || [];
  /* 落点没确认 ⇒ 这一帧可能根本不是那条页（routeStack 取空/报错时最常见）。
     与 r-exec-cli 同一个三态规矩：没测到不等于测出问题。判红之前先问"页面对不对"。 */
  const landingOk = String(r.landing || "").includes(String(r.route || ""));
  /* 帧时刻的身份与请求身份不符 ⇒ 这一帧根本不是那个身份的帧（实测 mock 包开页会把清掉的会话
     造回来：清会话后 verify=not-logged-in，出帧时 store 已 logged-in）。
     这种帧既不能判红也不能判绿，记进 IDENTITY_MISMATCH 并点名缺的载体档位。 */
  if (r.identityOk === false) {
    bucket.IDENTITY_MISMATCH++;
    patches.push({ id: it.id, col: 9, new: ("帧已拍但身份错位：请求 " + (r.identity || "?") + "，出帧时是 " + String(r.identityAtFrame || "(没量到)").slice(0, 40) + " ⇒ 该档产物表达不了这个身份，换 mp-weixin-real 重拍；帧 " + r.frame).replace(/\|/g, "／"), why: "带着错身份章的帧进账就是造假证据" });
    md.push("| " + it.id + " | IDENTITY_MISMATCH | 不作判 | " + r.frame + " |");
    continue;
  }
  /* 帧里站着整页锁屏，而判点点名的不是锁屏自己的物件 ⇒ 这一帧问不出这条问题。
     与 IDENTITY_MISMATCH 同一规矩：既不判红也不判绿，欠的是"过门槛的账号夹具"。 */
  const lockSel = /\.lock-screen|__lock\b|LockScreen/;
  const allLock = checks.length > 0 && checks.every((k) => lockSel.test(String(k.sel || k.selector || "")));
  if (r.lockHit === true && !allLock) {
    bucket.LOCK_SCREEN_BLOCKED++;
    patches.push({ id: it.id, col: 9, new: ("帧已拍但整页锁屏在（" + String(r.lockAtFrame || "present").slice(0, 24) + "），被锁内容不在渲染树上 ⇒ 本条不作判；欠过完善度门槛的账号夹具，换档重拍；帧 " + r.frame).replace(/\|/g, "／"), why: "锁屏帧量出来的 absent 不是产品判红" });
    md.push("| " + it.id + " | LOCK_SCREEN_BLOCKED | 不作判 | " + r.frame + " |");
    continue;
  }
  if (!landingOk) {
    bucket.NO_LANDING++;
    patches.push({ id: it.id, col: 9, new: ("帧已拍但落点未确认（实落 " + String(r.landing || "(空)").slice(0, 40) + "），本帧不作判据；帧 " + r.frame).replace(/\|/g, "／"), why: "落点不明的判决不能进账" });
    md.push("| " + it.id + " | NO_LANDING | 不作判 | " + r.frame + " |");
    continue;
  }
  /* 这条帧来自 corpus 索引（巡检 corpus / 由 dir-to-manifest-detail 桥出的 corpus），
     它只带 path/bytes/route，不带配方点名的判点结论。
     放它往下走会撞上"没有机器判点"那条分支被判成"待人读帧"—— 可这一条配方本来就有机器判点，
     欠的是**探针**不是人眼；两个说法在台账上是完全不同的账。所以单独成桶、只写 statusEvidence，
     状态列一个字都不改。 */
  if (r.probeRan === false) {
    bucket.CARRIER_NO_PROBE++;
    patches.push({ id: it.id, col: 9, new: ("当轮帧已拍（载体 " + (r.carrier || r.framesFrom || "?") + "，帧 " + r.frame + " " + realBytes + "B），"
      + "但该载体不跑本条配方的 " + (it.assertions || 0) + " 个判点 ⇒ 既不算复验通过也不算判红，欠带判点的取景腿重拍")
      .replace(/\|/g, "／").slice(0, 220), why: "corpus 帧没有判点结论，写成待人读帧就是把没测过换个说法" });
    md.push("| " + it.id + " | 载体无判点 | 0/" + (it.assertions || 0) + " | " + r.frame + " |");
    continue;
  }
  /* 配方要求的交互步骤（tap/input/longpress…）这条通道做不了 ⇒ 状态没施加。
     此时"判点没成立"只说明我没把页面推到那个状态，不说明产品没修。记 STATE_NOT_APPLIED，
     交给 WS 那条腿（r-exec-ws 的 wsTap）补，不写进台账判决。 */
  if (r.stateApplied === false) {
    bucket.STATE_NOT_APPLIED++;
    patches.push({ id: it.id, col: 9, new: ("帧已拍但状态未施加：欠 " + (r.stepsUnmet || []).join("、") + "；帧 " + r.frame).replace(/\|/g, "／"), why: "欠的是交互步骤，不是结论——写清楚谁来补" });
    md.push("| " + it.id + " | STATE_NOT_APPLIED | 欠 " + (r.stepsUnmet || []).join("/") + " | " + r.frame + " |");
    continue;
  }
  /* 交互确实做了，但把页面导航走了（点返回、跳详情）⇒ 探针在别的页上查本页物件，
     查不到是必然的，那不是回归。与 NO_LANDING 同一规矩：先问"页面对不对"，再问"东西在不在"。 */
  if (r.landingAfter && !String(r.landingAfter).startsWith("ERR") && !String(r.landingAfter).includes(String(r.route || ""))) {
    bucket.LEFT_PAGE++;
    patches.push({ id: it.id, col: 9, new: ("交互已施加但离开了目标页（实落 " + String(r.landingAfter).slice(0, 60) + "），本页物件的判点不作判据；帧 " + r.frame).replace(/\|/g, "／"), why: "离开目标页后的探针答案不能当判决" });
    md.push("| " + it.id + " | LEFT_PAGE | 不作判 | " + r.frame + " |");
    continue;
  }
  const hard = checks.filter((c) => !String(c.check).startsWith("FRAME_ONLY"));
  const BADV = /^PRESENT_UNEXPECTED|^ABSENT_UNEXPECTED|^PROBE_NO_ANSWER|^TEXT_LEAK|^TEXT_MISS|^BOX_SMALL|^BOX_OFF/;
  const bad = hard.filter((c) => BADV.test(String(c.check)));
  const ev = r.frame + "(" + realBytes + "B" + (r.framesFrom ? " 取自 " + r.framesFrom.split("/").slice(-2)[0] : "") + ") 判点 " + hard.length + " 条";
  if (bad.length) {
    bucket.REGRESSION++;
    patches.push({ id: it.id, col: 6, new: "待修复（帧级复验判红：判点未成立，见 statusEvidence）", why: "帧拍出来了、判点没成立 ⇒ 这是回归/未修，不能记绿" });
    patches.push({ id: it.id, col: 9, new: (ev + " 未成立：" + bad.map((c) => c.target + "=" + c.check).join("、")).replace(/\|/g, "／").slice(0, 220), why: "把实测值写进账" });
    md.push("| " + it.id + " | 判红 | " + bad.length + "/" + hard.length + " 未过 | " + r.frame + " |");
  } else if (!hard.length) {
    bucket.NEEDS_EYE++;
    patches.push({ id: it.id, col: 9, new: ("帧已拍：" + ev + "；本条判点全部是 FRAME_ONLY（只能人读帧）").replace(/\|/g, "／"), why: "欠的是人眼，不是证据" });
    md.push("| " + it.id + " | 待人读帧 | 0/" + checks.length + " | " + r.frame + " |");
  } else {
    bucket.FIXED_FRAME++;
    patches.push({ id: it.id, col: 6, new: "已修复（帧级复验：当轮帧 + " + hard.length + " 个机器判点全部成立）", why: "①的帧债按帧闭环" });
    patches.push({ id: it.id, col: 9, new: ev.replace(/\|/g, "／").slice(0, 220), why: "帧路径 + 字节，可复查" });
    md.push("| " + it.id + " | 帧级成立 | " + hard.length + "/" + hard.length + " | " + r.frame + " |");
  }
}
const ids = new Set(patches.map((p) => p.id));
writeFileSync(join(OUT, "cellplan-round7-frames.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), source: "verdict-from-frames.mjs", frames: byId.size, frameSources: fr.srcs,
  /* 扫描集自己是账目的一部分：不写下来的话，读的人无法知道这批判决到底看过多少帧，
     也无法知道收紧/放宽时绿损了几条（H1 的教训就是"集外"这件事根本不可见）。 */
  scanSet: {
    mode: EXPLICIT ? "--frames 显式点名" : "派生（源A 权威索引 derivation.corpora + 源B screenshot-manifest.<label>.json + 源C 旧默认）",
    files: scanAfter.files, rowsBefore: scanBefore.rows, rowsAfter: scanAfter.rows,
    framePathsBefore: scanBefore.frames.size, framePathsAfter: scanAfter.frames,
    droppedRows: droppedIds, droppedFramePaths: droppedFrames,
    corpusShotsOffPlan: offPlan,
    tourRouteFrames: routeFrames.size, tourRouteFrameShots: [...routeFrames.values()].reduce((a, x) => a + x.n, 0),
    legacyFramesFile: LEGACY_FRAMES, indexFile: relOf(INDEX),
  },
  buckets: bucket, patchIds: ids.size, patches,
}, null, 1));
/* 分桶行插在判决表之前（不是固定第 4 行——表头上面现在有 N 个取景来源行，写死会把它插进来源清单里）。 */
md.splice(md.findIndex((l) => l.startsWith("| id |")), 0, "分桶：" + JSON.stringify(bucket), "");
writeFileSync(join(OUT, "frame-verdicts.md"), md.join("\n"));
const covered = [...planItems].filter((i) => i.disposition === "SHOOT").length;
console.log("FV_PLAN=" + planItems.length + " SHOOT=" + covered + " 取景行=" + byId.size);
console.log("FV_BUCKETS " + Object.entries(bucket).map(([k, v]) => k + "=" + v).join(" "));
console.log("FV_TOUR_COVERAGE 巡检路由级帧覆盖到的配方行=" + bucket.TOUR_ROUTE_ONLY + "（只写 statusEvidence，不动状态列）" +
  " ｜corpus 帧有行级 id 但无判点的=" + bucket.CARRIER_NO_PROBE);
const sum = Object.values(bucket).reduce((a, b) => a + b, 0);
console.log("FV_CONSERVED=" + (sum === planItems.length ? "yes" : "NO（" + sum + "≠" + planItems.length + "）") + " PATCHES=" + patches.length + " 涉及条目=" + ids.size);
console.log("FV_RESULT=OK 计划已写 " + relOf(join(OUT, "cellplan-round7-frames.json")) + "（默认 dry）");
process.exit(sum === planItems.length ? 0 : 2);
