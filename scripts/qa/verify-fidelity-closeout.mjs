#!/usr/bin/env node
/**
 * verify-fidelity-closeout.mjs —— 「这轮真机保修到底完没完」的唯一判据（MP-FIDELITY 的收口）。
 *
 * 它**不重测任何东西**，只把各生产者的话收集成一张表。理由在册两次：
 *   · 收口门自己重算一遍 = 造出第二份真相，两份会漂（aggregate/覆盖门/配额门各自已量过同一件事）；
 *   · 上一程有过"门点了却没跑"与"读数来自上一份归档"的账，聚合器必须显式说清每条判据的出处。
 * 所以每条判据都带 `来源=`（哪个文件 / 哪条 spawn 的 stdout），拿不到来源就是 NOT-EVIDENCED，**绝不当绿**。
 *
 * 八条判据（一条不中 ⇒ 整体不绿；全中 ⇒ FIDELITY_CLOSEOUT_RESULT=PASS）：
 *   1 rounds      跑满 3 轮（每轮都要有取景清单落盘，空轮次名不算）
 *   2 coverage    账本 71 行每行都有可用帧（**按轮**把两条通道的清单并起来喂覆盖门，那一轮的并集门要 PASS；
 *                 逐件要 PASS 是恒红判据——两条通道各管一半，单件结构上凑不满 71）
 *   3 newdefects  末轮泳道卡新增缺陷 = 0（末轮还找得出 ⇒ 本轮没收口）。数 defect_id 之前先按派单件
 *                 lanes-<round>.json 对账：每条派单都要有一张同 id 的卡，一张卡都没有 ⇒ 判红（旧写法
 *                 把"空目录"读成"零缺陷"，R2b 现场就这么绿过一次）
 *   4 fixvis      改动可见性：FIXNOTVISIBLE / CLOCK_ONLY 清零（比内容区像素，不是比状态栏时钟）
 *   5 band        产物带戳仍是指定那一档（改一字节 ⇒ 整批帧与账本过期）
 *   6 chain       发布链步序门 PASS（三步后处理真的指向本轮产物，不是 mock 那棵）
 *   7 carriers    新门在两个载具都点名（写了没人跑 = 没写）
 *   8 roundtrip   一次真实写回环：建得出/两端读得到/字段齐/删得掉/计数守恒
 *
 * 用法：node scripts/qa/verify-fidelity-closeout.mjs --ledger <json> --rounds R1,R2b,R3 \
 *          --manifest <每轮 sweep-manifest.json，逗号分隔> --lanes-last <末轮卡目录> \
 *          --fixvis <fix-visibility.json> --roundtrip <roundtrip.json> --band real@f0677920
 *          [--self-test]
 * 退出码：0 八条全中；1 有条目不中（逐条点名）；2 输入读不到（那是前提不成立，不是"没做完"）。
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "FIDELITY_CLOSEOUT_RESULT";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);
const relOf = (p) => relative(REPO, resolve(p)).split(sep).join("/");
const listArg = (k) => String(arg(k, "")).split(",").map((s) => s.trim()).filter(Boolean);

/* ── 纯判据：每行给 {name, ok, got, want, src}。可被 --self-test 用合成输入喂，不必占设备。 ── */
function judge(rows) {
  const bad = rows.filter((r) => !r.ok);
  /* 空表不算绿：判据一条都没检 ⇒ "没有不中的"是真空话，这道门自己就是那种零命中仪表。 */
  return { rows, bad, pass: rows.length > 0 && bad.length === 0 };
}

/* PASS 行的唯一渲染处：只吃 rows（=上面刚打印过的那张判据表），不引用任何别处的绑定。
   为什么抽出来且只读表（2026-10-19 实测）：原版是 `rounds=${rounds.length}`，而本文件没有 `rounds`
   这个绑定 ⇒ 判据真全中那一发会在最后一行抛 ReferenceError、退出码 1，载具读不到 PASS 行——
   绿的收口被读成红。这一行的每个数都直接取 rows[].got，表能打印 ⇒ 行就能渲染。 */
function passLineFromRows(rows) {
  const got = (n) => { const x = (rows || []).find((y) => y && y.name === n); return x ? String(x.got) : "(无此判据)"; };
  return `${RK}=PASS 判据=${(rows || []).length} 全中 rounds=${got("rounds")} coverage=${got("coverage")} `
    + `newdefects=${got("newdefects")} fixvis=${got("fixvis")} band=${got("band")} chain=${got("chain")} `
    + `carriers=${got("carriers")} roundtrip=${got("roundtrip")}`;
}

function runSelfTest() {
  const SRK = "FIDELITY_CLOSEOUT_SELFTEST";
  const okRow = { name: "x", ok: true, got: "1", want: "1", src: "s" };
  const cases = [
    ["全绿基线", [{ ...okRow }], true],
    ["有一条不中必须红", [{ ...okRow }, { name: "y", ok: false, got: "0", want: "1", src: "s" }], false],
    ["ok 字段缺失（undefined）不许当绿", [{ name: "z", got: "0", want: "1", src: "s" }], false],
    ["空表不许当「没有不中的条目」⇒ 绿", [], false],
    ["got 比 want 多也不中", [{ name: "w", ok: false, got: "3", want: "2", src: "s" }], false],
  ];
  let fails = 0;
  for (const [label, rows, expectPass] of cases) {
    const r = judge(rows.map((x) => ({ ...x, ok: x.ok === true })));
    const got = r.pass;
    const good = got === expectPass;
    if (!good) fails++;
    console.log(`${SRK} ${label.padEnd(28)} 期望=${expectPass ? "绿" : "红"} 实测=${got ? "绿" : `红(${r.bad.length})`} ⇒ ${good ? "判点承重" : "判点失效"}`);
  }
  /* 变异证明：把不中的那条改成 ok:true，判据必须翻绿——否则"红"是恒红的装饰，测不出任何东西。 */
  const mutant = judge([{ name: "y", ok: true, got: "1", want: "1", src: "s" }]);
  console.log(`${SRK} 变异(不中→中) 翻绿=${mutant.pass ? "yes" : "no"} ⇒ ${mutant.pass ? "判点可修" : "判点恒红"}`);
  if (!mutant.pass) fails++;
  /* ── PASS 行渲染自证（2026-10-19 补）：全绿那一行平时根本跑不到（本程八条还红着），
     上一版就因为它引用了不存在的绑定，把"收口成功"读成"收口门崩了"。跑不到 ≠ 可以不对，
     所以这里把它渲染出来、并把"判据名 ↔ 行内字段名"绑成同一张表。 */
  const NAMES = ["rounds", "coverage", "newdefects", "fixvis", "band", "chain", "carriers", "roundtrip"];
  const greenRows = NAMES.map((n, i) => ({ name: n, ok: true, got: `g${i}`, want: "w", src: "s" }));
  const line = passLineFromRows(greenRows);
  const lineOk = line.startsWith(`${RK}=PASS`) && NAMES.every((n) => line.includes(`${n}=`)) && !/undefined|无此判据/.test(line);
  console.log(`${SRK} ${"PASS 行可渲染".padEnd(28)} ⇒ ${lineOk ? "承重" : "失效"}：${line}`);
  if (!lineOk) fails++;
  /* 变异：抽掉一条判据 ⇒ 必须显式留痕"(无此判据)"，不许静默少印一项（静默少印=下一程看不出错）。 */
  const mutLine = passLineFromRows(greenRows.slice(1));
  const mutVisible = mutLine.includes("(无此判据)");
  console.log(`${SRK} ${"变异(少一条判据)显式留痕".padEnd(28)} ⇒ ${mutVisible ? "承重" : "失效"}`);
  if (!mutVisible) fails++;
  /* 名字对账：主流程 push 的判据名必须与 NAMES 一字不差（改一边忘另一边 = PASS 行读不到那条）。
     这是从自己的源码里现数的，不抄散文数字。 */
  const self = readFileSync(fileURLToPath(import.meta.url), "utf-8");
  const pushed = [...self.matchAll(/push\(\s*"([a-z]+)"/g)].map((m) => m[1]);
  const nameSet = [...new Set(pushed)].sort();
  const namesAgree = nameSet.length === NAMES.length && NAMES.every((n) => nameSet.includes(n));
  console.log(`${SRK} ${"判据名与 PASS 行同名".padEnd(28)} ⇒ ${namesAgree ? "承重" : "失效"} 现数=${nameSet.join(",")}`);
  if (!namesAgree) fails++;
  console.log(`${SRK}=${fails === 0 ? "PASS" : "FAIL"} 例数=${cases.length + 4} 失效=${fails}`);
  process.exit(fails === 0 ? 0 : 1);
}
if (flag("self-test")) runSelfTest();

const LEDGER = resolve(arg("ledger", ""));
if (!LEDGER || !existsSync(LEDGER)) { console.log(`${RK}=NOT-EVIDENCED reason=no-ledger path=${arg("ledger", "") || "(没传 --ledger)"}`); process.exit(2); }
const ledger = JSON.parse(readFileSync(LEDGER, "utf-8"));
const wantRoutes = (ledger.rows || []).map((r) => r.route);
if (!wantRoutes.length) { console.log(`${RK}=NOT-EVIDENCED reason=empty-ledger（空账本没有分母，收口就是空话）`); process.exit(2); }

const MIN_ROUNDS = Number(arg("min-rounds", "3"));
/* band 的期望值从账本取，不从命令行赌：账本已经声明它属于哪棵树。 */
const EXPECT_BAND = arg("band", "") || ledger.bandStamp || "";
const rows = [];
const push = (name, ok, got, want, src) => rows.push({ name, ok: ok === true, got: String(got), want: String(want), src: String(src) });

/* 交付目录也派生：取 reports/audit 下最新那个 mp-fidelity-*。载具里要写死参数，
   而这一程的目录名带日期，写死等于下一程拿着上一程的判决读数。 */
function newestReportDir() {
  const base = join(REPO, "reports", "audit");
  if (!existsSync(base)) return "";
  const cands = readdirSync(base).filter((d) => /^mp-fidelity-/.test(d) && existsSync(join(base, d))).sort();
  return cands.length ? join(base, cands[cands.length - 1]) : "";
}
const REPORT_DIR = resolve(arg("report-dir", "") || newestReportDir());
/* 只在"旗标真的传了"时才 resolve：arg 的缺省是空串，resolve("") 会返回当前目录，
   于是"没传 --roundtrip"被读成"目录里那个读不成的 JSON"，MISS 与坏件分不出来。 */
const pickFile = (k, cands) => { const a = arg(k, ""); if (a) return resolve(a); for (const c of cands) if (c && existsSync(c)) return resolve(c); return ""; };
const pickArg = (k, d) => { const a = arg(k, ""); return a ? resolve(a) : d; };

/* 1 rounds：轮次**从盘上派生**，不靠我报（载具里要写死参数，而轮次名每轮都变）。
   一轮算数的前提是它的清单证明"取景前重开过项目窗口"（reattach.exit===0）：
   R2 实测没重开 ⇒ 整轮帧是改前编译，那一轮无论跑出多少数都不能计入轮次。
   早于该仪表字段的轮次（R1）如实标成"改前基线轮"，不计入三轮——那是 instrument 的欠账，不是产品的。 */
const FRAMES_ROOT = resolve(arg("frames-root", join(REPO, "tmp/qa/frames")));
const derived = [];
if (existsSync(FRAMES_ROOT)) {
  for (const rd of readdirSync(FRAMES_ROOT).sort()) {
    const bandDir = join(FRAMES_ROOT, rd);
    if (!existsSync(bandDir)) continue;
    for (const bd of readdirSync(bandDir)) {
      /* 两条通道各写各的件：automator 取景腿写 sweep-manifest.json，CLI 巡检腿写 tour-manifest.json。
         覆盖判据要的是"这页有没有画面"，两件的页必须并起来数——只认一件就会把 57 页无基准页永远读成零帧。 */
      for (const fname of ["sweep-manifest.json", "tour-manifest.json"]) {
        const mf = join(bandDir, bd, fname);
        if (existsSync(mf)) derived.push({ round: rd, band: bd, channel: fname === "sweep-manifest.json" ? "automator" : "cli", manifestPath: mf });
      }
    }
  }
}
const wanted = listArg("rounds");
const picked = wanted.length ? derived.filter((d) => wanted.includes(d.round)) : derived;
const roundInfo = [];
for (const d of picked) {
  let m = null;
  try { m = JSON.parse(readFileSync(d.manifestPath, "utf-8")); } catch { /* 读不成 = 该件无效 */ }
  const re = m && m.reattach;
  roundInfo.push({ ...d, manifest: m, valid: !!m && re && Number(re.exit) === 0, why: !m ? "清单读不成" : (re && re.exit !== null ? `reattach.exit=${re.exit}` : String((re && re.proven) || "清单没有 reattach 字段（改前基线轮，不计入轮次）")) });
}
/* 轮次有效性按"轮"判，不按"件"判：一轮只要有一件 automator 清单证明重开过窗口就算这一轮成立。 */
const validRounds = new Set(roundInfo.filter((r) => r.valid).map((r) => r.round));
for (const r of roundInfo) console.log(`CLOSEOUT_ROUND ${r.round}/${r.channel} valid=${r.valid ? "yes" : "NO"} (${r.why}) manifest=${relOf(r.manifestPath)}`);
push("rounds", validRounds.size >= MIN_ROUNDS, `盘上轮=${new Set(roundInfo.map((r) => r.round)).size} 有重开窗证明的轮=${validRounds.size}`, `>=${MIN_ROUNDS}`,
  `派生自 ${relOf(FRAMES_ROOT)}/*/*/sweep-manifest.json（CLI 件不贡献轮次证明）`);

/* 2 coverage：覆盖门**按轮**跑一次，分子是该轮两条通道的清单**并集**，分母是账本 71 行。
   旧写法是"逐件 spawn、逐件要 PASS"，而 Phase D 的两条通道天然各管一半（automator 14 页有基准、
   CLI 57 页无基准）⇒ 单件永远缺另一半的页 ⇒ 这一条在构造上恒红。恒红的判据不测任何东西
   （本仓对零命中仪表记过两次账，这次是它的镜像形状：恒红门）。改成按轮并集后，
   一件坏（band 不符/空转/跨通道同图）照样红，因为覆盖门自己就把这些当成 problem 点名。 */
const coverScript = join(REPO, "scripts/qa/verify-sweep-coverage.mjs");
const covered = new Set();
let coverGateFails = 0; const coverNotes = [];
const byRound = new Map();
for (const rec of roundInfo) byRound.set(rec.round, [...(byRound.get(rec.round) || []), rec]);
for (const [rd, recs] of byRound) {
  const broken = recs.filter((r) => !r.manifest);
  if (broken.length) { coverGateFails++; coverNotes.push(`${rd}: ${broken.length} 件清单读不成 JSON（${broken.map((b) => relOf(b.manifestPath)).join(", ")}）`); }
  const usable = recs.filter((r) => r.manifest);
  for (const rec of usable) {
    const routes = (rec.manifest.results || []).filter((r) => (r.frames || []).some((f) => Number(f.bytes) > 3000 && !f.landingMismatch && !f.belowFloor)).map((r) => r.route);
    for (const r of routes) covered.add(r);
  }
  if (!usable.length) { coverNotes.push(`${rd}: 本轮没有可判的清单 ⇒ 不计覆盖`); continue; }
  const s = spawnSync(process.execPath, [coverScript, "--ledger", LEDGER, "--manifest", usable.map((r) => r.manifestPath).join(",")], { cwd: REPO, encoding: "utf8" });
  const out = `${s.stdout || ""}${s.stderr || ""}`;
  const line = (out.match(/SWEEPCOVER_RESULT=\S+/) || ["(无结果行)"])[0];
  const st = (out.match(/SWEEPCOVER_STATS .*/) || ["(无统计行)"])[0].trim();
  if (!/SWEEPCOVER_RESULT=PASS/.test(line)) { coverGateFails++; coverNotes.push(`${rd}（并集 ${usable.length} 件）: ${line}`); }
  coverNotes.push(`${rd}（并集 ${usable.length} 件）: ${st}`);
}
const missing = wantRoutes.filter((r) => !covered.has(r));
push("coverage", coverGateFails === 0 && missing.length === 0,
  `并集覆盖=${covered.size}/${wantRoutes.length} 覆盖门红=${coverGateFails} 缺页=${missing.length}`,
  "每轮并集覆盖门 PASS 且 71/71", "spawn verify-sweep-coverage --ledger --manifest <该轮两条通道的清单逗号拼接>");
if (missing.length) console.log(`CLOSEOUT_MISSING_ROUTE ${missing.slice(0, 60).join(" ")}`);
for (const n of coverNotes) console.log(`CLOSEOUT_COVER ${n}`);

/* 3..8 都锚在"末轮"上：末轮 = 清单 mtime 最新的那一轮。
   判决件按轮命名（fix-visibility-<round>.json / roundtrip-<round>.json）；
   找不到当轮件就**明说读的是哪一份**，不许拿着上一轮的判决给这一轮盖章。 */
let lastRound = "";
if (roundInfo.length) {
  const byM = roundInfo.map((r) => ({ r, t: statSync(r.manifestPath).mtimeMs })).sort((a, b) => a.t - b.t);
  lastRound = byM[byM.length - 1].r.round;
}
const lanesLast = resolve(pickArg("lanes-last", join(REPO, "tmp/qa/lanes", lastRound)));
let lastDefects = -1;
let laneNotes = [];
if (lanesLast && existsSync(lanesLast)) {
  /* 判"末轮新增缺陷=0"之前必须先判"末轮的卡到底交没交"。
     旧写法是 readdir 找 .md（排掉 .brief.md）再数 defect_id ⇒ 一条卡都没有时 lastDefects=0 ⇒ 绿。
     R2b 现场就是这个形状：盘上只有 6 张 .brief.md（派单），一张卡都没写，收口门却把
     newdefects 报成 OK——这就是本仓记过两次的「零命中仪表」的反向形：**空目录被判成通过**。
     现在按派单方自己的件（lanes-<round>.json 的 lanes[]）逐条对账：没交卡的 lane 点名，且 band 不符的件不采信。 */
  const planP = ["lanes-" + lastRound + ".json", "lanes.json"]
    .map((n) => join(lanesLast, n)).find((p) => existsSync(p))
    || (readdirSync(lanesLast).filter((f) => /^lanes.*\.json$/i.test(f))[0] ? join(lanesLast, readdirSync(lanesLast).filter((f) => /^lanes.*\.json$/i.test(f))[0]) : "");
  let plan = null;
  if (planP) { try { plan = JSON.parse(readFileSync(planP, "utf-8")); } catch { plan = null; } }
  const lanes = plan && Array.isArray(plan.lanes) ? plan.lanes : [];
  const cardFiles = existsSync(lanesLast) ? readdirSync(lanesLast).filter((f) => f.endsWith(".md") && !/\.brief\.md$/i.test(f)) : [];
  const cardBase = new Set(cardFiles.map((f) => f.replace(/\.md$/i, "")));
  const noCard = lanes.map((l) => String(l.lane_id || l.id || "")).filter((id) => id && !cardBase.has(id));
  const bandStale = !!(plan && plan.band && ledger.bandStamp && plan.band !== ledger.bandStamp);
  lastDefects = 0;
  for (const f of cardFiles) lastDefects += (readFileSync(join(lanesLast, f), "utf-8").match(/^-\s*defect_id\s*:/gm) || []).length;
  laneNotes = [
    `派单件=${planP ? relOf(planP) : "(读不到)"}`,
    `泳道=${lanes.length} 交卡=${cardFiles.length}`,
    ...(bandStale ? [`件 band=${plan.band} 与账本 band=${ledger.bandStamp} 不符 ⇒ 这批卡看的是另一棵树的帧`] : []),
    ...(noCard.length ? [`没交卡=${noCard.join(",")}`] : []),
    `defect_id 合计=${lastDefects}`,
  ];
  push("newdefects", !!plan && lanes.length > 0 && noCard.length === 0 && !bandStale && lastDefects === 0,
    laneNotes.join(" "), "每条派单都交了卡且卡内 defect_id=0",
    `数 defect_id 之前先按派单件对账：${relOf(lanesLast)}`);
} else {
  push("newdefects", false, `(末轮 ${lastRound || "?"} 的卡目录读不到 ${relOf(lanesLast || ".")})`, "每条派单都交了卡且卡内 defect_id=0",
    "目录不存在 ⇒ NOT-EVIDENCED 级红，不当绿");
}
for (const n of laneNotes) console.log(`CLOSEOUT_LANES ${n}`);

/* 4 fixvis：改后帧里不许留 FIXNOTVISIBLE / CLOCK_ONLY。 */
const fixvisP = pickFile("fixvis", [join(REPORT_DIR, `fix-visibility-${lastRound}.json`), join(REPORT_DIR, "fix-visibility.json")]);
let fv = null;
if (fixvisP && existsSync(fixvisP)) { try { fv = JSON.parse(readFileSync(fixvisP, "utf-8")); } catch { fv = null; } }
const fvBad = fv ? ((fv.stats && (fv.stats.notVisible || 0) + (fv.stats.clockOnly || 0)) || 0) : -1;
push("fixvis", !!fv && fvBad === 0, fv ? `读=${relOf(fixvisP)} visible=${fv.stats && fv.stats.visible} notVisible=${fv.stats && fv.stats.notVisible} clockOnly=${fv.stats && fv.stats.clockOnly}` : "(读不到)",
  "notVisible+clockOnly=0", "生产者 verify-fix-visibility.mjs（比内容区像素，不比状态栏时钟）");

/* 5 band：产物带戳必须还是那一档。 */
const proj = resolve(arg("project", join(REPO, "apps/client/dist/build/mp-weixin-real")));
const envFile = join(proj, "config", "env.js");
let bandNow = "";
if (existsSync(envFile)) {
  const buf = readFileSync(envFile);
  const m = String(buf).match(/MODE:\s*"([^"]+)"/);
  bandNow = `${m ? m[1] : "?"}@${createHash("sha256").update(buf).digest("hex").slice(0, 8)}`;
}
push("band", !!EXPECT_BAND && bandNow === EXPECT_BAND && (!ledger.bandStamp || ledger.bandStamp === EXPECT_BAND),
  bandNow || "(读不到 env.js)", EXPECT_BAND || "(没传 --band ⇒ 不许绿)", "读 <project>/config/env.js 现算 sha8");

/* 6 chain + 7 carriers：spawn 那两个离线门，读它们自己的结果行。 */
function spawnLine(script, args, tagRe) {
  const s = spawnSync(process.execPath, [join(REPO, script), ...args], { cwd: REPO, encoding: "utf8" });
  const out = `${s.stdout || ""}${s.stderr || ""}`;
  const m = out.match(tagRe);
  return { exit: s.status, line: m ? m[0] : "(无结果行)", raw: out };
}
const chain = spawnLine("scripts/qa/verify-release-chain-steps.mjs", [], /CHAINSTEPS_RESULT=\S+/);
push("chain", /PASS/.test(chain.line), `${chain.line} exit=${chain.exit}`, "CHAINSTEPS_RESULT=PASS", "spawn verify-release-chain-steps");
const gs = spawnLine("scripts/qa/verify-gate-list-sync.cjs", [], /GATESYNC_RESULT=\S+|GATESYNC_ORPHANS=\d+/g);
const orph = (gs.raw.match(/GATESYNC_ORPHANS=(\d+)\s+baseline=(\d+)/) || [])[1];
const orphBase = (gs.raw.match(/GATESYNC_ORPHANS=\d+\s+baseline=(\d+)/) || [])[1];
push("carriers", /GATESYNC_RESULT=PASS/.test(gs.raw) && orph !== undefined && Number(orph) <= Number(orphBase),
  `${(gs.line || "").split("\n").join(" ")} 孤儿=${orph === undefined ? "?" : orph}/基线=${orphBase || "?"}`, "PASS 且孤儿不超基线", "spawn verify-gate-list-sync.cjs");

/* 8 roundtrip：只认生产者落盘的结果件；缺件 = MISS，不许当绿。 */
const rtP = pickFile("roundtrip", [join(REPORT_DIR, `roundtrip-${lastRound}.json`), join(REPORT_DIR, "roundtrip.json")]);
let rt = null, rtBad = "";
if (rtP) { try { rt = JSON.parse(readFileSync(rtP, "utf-8")); } catch { rtBad = "件在但读不成 JSON"; } }
push("roundtrip", !!rt && rt.verdict === "PASS" && rt.conserved === true && Number(rt.fields_same) === Number(rt.fields_total),
  rt ? `读=${relOf(rtP)} verdict=${rt.verdict} conserved=${rt.conserved} fields=${rt.fields_same}/${rt.fields_total} backup=${rt.backup}` : (rtBad ? `${rtBad}（${relOf(rtP)}）` : "MISS（没落盘件＝这一轮没真写过）"),
  "PASS + conserved + 字段齐", "生产者 verify-admin-roundtrip.mjs --out（写库那一发才产得出）");

const r = judge(rows);
console.log(`${RK} 判据=${rows.length} 不中=${r.bad.length}（每条都给 got/want/来源）`);
for (const x of rows) console.log(`  ${x.ok ? "OK  " : "BAD "} ${x.name.padEnd(11)} got=${x.got} want=${x.want} 来源=${x.src}`);
if (r.bad.length) {
  console.log(`${RK}=FAIL 不中=${r.bad.map((x) => x.name).join(",")}（还差 ${r.bad.length} 条，未达"完成"）`);
  process.exit(1);
}
/* PASS 行只许读**上面刚打印过的那张表**，不许另起炉灶重算一遍。
   原版这里写的是 `rounds=${rounds.length}`——本文件根本没有 `rounds` 这个绑定（轮次集合叫 validRounds，
   命令行参数叫 --rounds→wanted），而这一行平时跑不到（判据还红着）⇒ 真全绿那一发会在收口门自己的
   最后一行抛 ReferenceError、退出码 1，载具读不到 FIDELITY_CLOSEOUT_RESULT=PASS：**绿的收口被读成红**。
   八条判据的实测值都已经作为 rows[].got 落过一次（上面那 8 行 OK 就是），拿现成的就结构上不会再引用错名。
   --self-test 里有一条专门渲染这行，改坏字段名当场红。 */
console.log(passLineFromRows(rows));
process.exit(0);
