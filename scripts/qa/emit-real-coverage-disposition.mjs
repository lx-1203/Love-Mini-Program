#!/usr/bin/env node
/**
 * 真实档覆盖欠账「去向册」的具名载具（L19 车道，2026-09-30）。
 *
 * 治的缺口（decisions-v33.md §33 编排方亲笔留给本车道的那半句）：
 *   用户 2026-09-30 裁定 `verify-real-coverage` 的 10 条真实档欠账「逐条按可采性分流」，L14 已把
 *   分流逐条写进 reports/audit/round-7/uncovered10-disposition-r14.md。但**去向的机器件无处可落**：
 *   仓里没有任何工具消费它（实测 `grep -rl "NEEDS_CAPABILITY|NEEDS_BAND_CHANGE|
 *   NEEDS_IDENTITY_IMPOSSIBLE|DISPATCHABLE_NOW" scripts/` = 0 个文件；
 *   `verify-real-coverage.mjs` 里这五个词一个都不出现），也没有任何门核对「10 条欠账是不是条条有去向」。
 *   ⇒ 后果：下一轮只要有一条欠账的去向丢了、或某条 case 已不再欠账却还挂着旧去向，**没有任何东西会变红**。
 *   本载具把这份去向落成按门的复合 case id 键死的 JSON；核对门是 scripts/qa/verify-real-coverage-disposition.mjs。
 *
 * 两条设计约束（不是风格问题）：
 *   1) **欠账一侧只读 `verify-real-coverage.mjs` 已有的输出面**（现跑它的 stdout 机器行，本文件不写它、
 *      不改它一个字：那条门今天的红 UNCOVERED=10 是本轮要如实保留的账，被逐字节钉过）。
 *      该门没有 --json 模式（实读参数表只有 --round/--ops/--dir/--selftest），所以取数走 stdout 解析：
 *      头行 REALCOV_CASES / REALCOV_UNCOVERED / REALCOV_COVERED / REALCOV_AUTOMATABLE_EXEMPT /
 *      REALCOV_NEVER_ON_REAL+REAL_BAND_BUT_ALL_SKIPPED / REALCOV_UNCOVERED_LIST / REALCOV_RESULT，
 *      逐条行 `  UNCOVERED <suite>|<id> 缺=<轴>`（该门 :612，无条数上限 ⇒ 欠账能整本摊开）。
 *   2) **去向一侧不编**：去向词、挡路物、闭合成本全部取自 L14 汇总表 §3 那一行自己写下的话，
 *      逐字带出（含 `DISPATCHABLE_NOW` 后面的「*L13 落地后*」这一条件式限定语）。
 *      照 emit-openrow-register.mjs 的纪律：不合规则的行**一条都不落盘**，绝不替它编理由。
 *
 * 本载具**只登记去向，不销任何红**：词表里刻意没有 DONE/CLOSED/EXEMPT 这类词，
 * 所以这本册子在结构上就没法把 `REALCOV_UNCOVERED` 调小（销账只有一条路：那条腿真的判过）。
 *
 * 用法：node scripts/qa/emit-real-coverage-disposition.mjs [--round round-7]
 *      [--rulings reports/audit/round-7/uncovered10-disposition-r14.md]
 *      [--out reports/audit/round-7/real-coverage-disposition.json] [--apply] [--force]
 *      默认**干跑**（只打印拟写内容，不落盘）；写权威件必须显式 --apply。
 * 退出码：0=干跑/落盘成功且 10 条欠账条条有去向；1=有不合登记的行（表一条不改）或
 *        欠账有去向缺口（如实写出后仍报 INCOMPLETE）；2=前置件缺失（门跑不出来、汇总表读不到、
 *        解析出 0 行、目标目录不可写）。
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join, sep, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const relPosix = (p) => relative(REPO, p).split(sep).join("/");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const KNOWN = ["round", "ops", "dir", "rulings", "out", "apply", "force", "gate", "gate-out"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log(`RCDEMIT_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 本载具只认 ${KNOWN.join(",")}（拼错旗标会静默少取一路输入）`); process.exit(2); }
}
const ROUND = arg("round", "round-7");
const GATE = arg("gate", "scripts/qa/verify-real-coverage.mjs");
const RULINGS = resolve(REPO, arg("rulings", "reports/audit/round-7/uncovered10-disposition-r14.md"));
const OUT = resolve(REPO, arg("out", "reports/audit/" + ROUND + "/real-coverage-disposition.json"));
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/* 在册词表 = 用户 2026-09-30 裁定「按可采性分流」的那五个桶（decisions-v33.md §33 逐桶计数）。
   词表里**没有**任何"已结案/免检/覆盖"词 ⇒ 这本册结构上销不掉红。
   NOT_SHOOTABLE 在册但今天 0 条：它的词义是"任何载具/档位都评不了这条判据"，
   L14 §3 末尾已就它纠过一次上游预分派（把可估价的能力欠账记成不可回收的死账同样是把红读小），
   所以用这个词必须逐条给出该理由 —— 载具不判理由，核对门也不替它判，但两者都不许它凭空出现。 */
const VOCAB = ["NEEDS_CAPABILITY", "NEEDS_BAND_CHANGE", "NEEDS_IDENTITY_IMPOSSIBLE", "DISPATCHABLE_NOW", "NOT_SHOOTABLE"];

function gitSha() {
  try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim(); }
  catch { return ""; }
}

/* ---------------- ① 欠账侧：跑门、解析它自己的 stdout 机器行 ---------------- */
function gateArgs() {
  const a = ["--round", ROUND];
  /* --ops/--dir 若给了就必须**转给门**：否则 provenance 里记的是我给的目录、门实际读的是它的默认值，
     那份戳就成了一句假话（本仓对"戳记要能自证"的口径：verify-ops-corpus-stamp 记 opsDir 就是记实际被读的那一份）。 */
  if (has("ops")) a.push("--ops", arg("ops"));
  if (has("dir")) a.push("--dir", arg("dir"));
  return a;
}
function runGate() {
  const cmd = [relPosix(resolve(REPO, GATE))].concat(gateArgs());
  let stdout = "", exit = 0;
  if (has("gate-out")) {
    /* 只给自测/复现用：读一份已经抓下来的门的 stdout，不现跑。用了就必须说出来。 */
    const p = resolve(REPO, arg("gate-out"));
    if (!existsSync(p)) { console.log(`RCDEMIT_RESULT=FAIL reason=--gate-out 指向的门输出样本读不到 ${relPosix(p)}`); process.exit(2); }
    stdout = readFileSync(p, "utf8"); exit = null;
    console.log(`RCDEMIT_GATE_SOURCE=captured-file ${relPosix(p)} ⇒ **非现跑**（本旗标只供自测/复现；终验不得带）`);
  } else {
    try {
      stdout = execFileSync(process.execPath, cmd, { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (e) {
      /* 这条门按设计就是红的（今天 UNCOVERED=10 ⇒ exit 1）。红不代表读不到，只认它的机器行。
         与 emit-dispo-open-cellplan.mjs:31-38 同一个处理方式。 */
      if (!e || typeof e.stdout !== "string" || !/REALCOV_UNCOVERED=/.test(e.stdout)) {
        const why = String((e && (e.message || e.stdout)) || "无错误对象");
        console.log(`RCDEMIT_RESULT=FAIL reason=门跑不出来或输出里没有 REALCOV_UNCOVERED（exit=${e && e.status}）：${why}`.slice(0, 400));
        process.exit(2);
      }
      stdout = e.stdout; exit = e.status == null ? -1 : e.status;
    }
  }
  const num = (re) => { const m = stdout.match(re); return m ? Number(m[1]) : null; };
  const reading = {
    cases: num(/^REALCOV_CASES=(\d+)/m),
    uncovered: num(/^REALCOV_UNCOVERED=(\d+)/m),
    covered: num(/^REALCOV_COVERED=(\d+)/m),
    exempt: num(/^REALCOV_AUTOMATABLE_EXEMPT=(\d+)/m),
    neverOnReal: num(/^REALCOV_NEVER_ON_REAL=(\d+)/m),
    realBandButAllSkipped: num(/REAL_BAND_BUT_ALL_SKIPPED=(\d+)/),
    listed: num(/^REALCOV_UNCOVERED_LIST=(\d+)/m),
    result: (stdout.match(/^REALCOV_RESULT=(\w+)/m) || [])[1] || "",
  };
  const missing = Object.keys(reading).filter((k) => k !== "realBandButAllSkipped" && k !== "result" && reading[k] === null);
  if (missing.length) { console.log(`RCDEMIT_RESULT=FAIL reason=门的机器行少字段 ${missing.join(",")} ⇒ 取数面变了，先核对门的输出再动这本册`); process.exit(2); }
  /* 逐条点名行（该门 :612 `  UNCOVERED <key> 缺=<轴>`）：没有上限，所以欠账能整本摊开。 */
  const rows = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(/^ {2}UNCOVERED (\S+) 缺=(\S+)$/);
    if (m) rows.push({ key: m[1], axes: m[2] });
  }
  if (rows.length !== reading.listed || rows.length !== reading.uncovered) {
    console.log(`RCDEMIT_RESULT=FAIL reason=点名行 ${rows.length} 与 REALCOV_UNCOVERED_LIST=${reading.listed}／REALCOV_UNCOVERED=${reading.uncovered} 不闭合 ⇒ 门的台账守恒自己先红了，此刻派生任何册子都不可信`);
    process.exit(2);
  }
  return { stdout, exit, reading, rows, cmd };
}

/* ---------------- ② 去向侧：解析 L14 汇总表 §3 那一行自己写下的话 ---------------- */
/* 表形状（逐字来自 reports/audit/round-7/uncovered10-disposition-r14.md:367-378）：
   | 1 | `PAGES-PROFILE-INDEX\|PFI25` | login | `NEEDS_CAPABILITY` | 挡路物 | 闭合成本 |
   单元格里用 `\|` 转义竖线 ⇒ 先换成哨兵再按 | 切，切完换回来（复合 id 逐字保留，不拆）。 */
const PIPE = "\u0001";
function parseRulings(md) {
  const out = [], skipped = [];
  let inTable = false;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\|\s*#\s*\|/.test(line)) { inTable = true; continue; }
    if (!inTable) continue;
    if (!line.startsWith("|")) { if (line === "") continue; inTable = false; continue; }
    if (/^\|[\s|:-]+\|$/.test(line)) continue;
    /* 哨兵必须**先于**按 | 切替换好：表里的 `\|` 是单元格内容的一部分（复合 id 的那根竖线），
       先切就把 `PAGES-PROFILE-INDEX\|PFI25` 切成两格（实测踩过：切完再替换已经晚了，
       id 只剩 `PAGES-PROFILE-INDEX\`，10 行全部变成"没有去向词"）。 */
    const cells = line.split("\\|").join(PIPE).split("|").map((c) => c.split(PIPE).join("|").trim());
    if (!/^\d+$/.test(cells[1] || "")) { skipped.push(`非数据行（第 1 列不是序号）：${line.slice(0, 60)}`); continue; }
    const [, n, idCell, axisCell, dispCell, blockerCell, costCell] = cells;
    const key = String(idCell || "").replace(/`/g, "").trim();
    const axes = String(axisCell || "").replace(/\*\*/g, "").trim();
    const dm = String(dispCell || "").match(/`([A-Za-z_]+)`/);
    const word = dm ? dm[1] : "";
    const qualifier = String(dispCell || "").replace(/`[A-Za-z_]+`/, "").replace(/^[（(]/, "").replace(/[)）]$/, "").replace(/\*/g, "").trim();
    out.push({
      row: Number(n), key, axes, word, qualifier,
      blocker: String(blockerCell || "").trim(),
      cost: String(costCell || "").trim(),
    });
  }
  return { out, skipped };
}

const g = runGate();
if (!existsSync(RULINGS)) { console.log(`RCDEMIT_RESULT=FAIL reason=去向判决的出处文件不存在 ${relPosix(RULINGS)}（别把"没写过"读成"没有欠账"）`); process.exit(2); }
const mdText = readFileSync(RULINGS, "utf8");
const mdSha = sha256(mdText);
const { out: ruled, skipped: ruledSkipped } = parseRulings(mdText);
if (!ruled.length) { console.log(`RCDEMIT_RESULT=FAIL reason=汇总表里一行都没解析出来 ⇒ 表形状变了；宁可停手也不手抄名单`); process.exit(2); }

const gateKeys = new Map(g.rows.map((r) => [r.key, r.axes]));
const entries = [], refused = [], stale = [], drift = [], undisp = [];
const seen = new Set();
for (const r of ruled) {
  if (!r.key) { refused.push(`第 ${r.row} 行没有 case id`); continue; }
  if (seen.has(r.key)) { refused.push(`第 ${r.row} 行的 case ${r.key} 与前面某行重复 ⇒ 一本册里一个键只能有一条去向`); continue; }
  seen.add(r.key);
  if (!r.word) { refused.push(`${r.key} 去向格没有反引号词 ⇒ 去向必须是词表里的一个词，不能是一句散文`); continue; }
  if (!VOCAB.includes(r.word)) { refused.push(`${r.key} 去向词「${r.word}」不在册内词表 ${VOCAB.join("|")} ⇒ 新词要先经编排方裁定，载具不许自创`); continue; }
  if (!r.blocker || !r.cost) { refused.push(`${r.key} 缺「挡路的东西」或「闭合成本」列 ⇒ 只写一个词的条目不叫有账`); continue; }
  const onDebt = gateKeys.has(r.key);
  if (!onDebt) stale.push(r);
  else if (gateKeys.get(r.key) !== r.axes) drift.push(`${r.key} 判决时轴=${r.axes} ≠ 门现量轴=${gateKeys.get(r.key)}`);
  entries.push({
    case: r.key,
    disposition: r.word,
    qualifier: r.qualifier,
    axesAtRuling: r.axes,
    axesAtEmit: onDebt ? gateKeys.get(r.key) : null,
    blocker: r.blocker,
    cost: r.cost,
    stillUncovered: onDebt,
    basis: `${relPosix(RULINGS)} §3 汇总表第 ${r.row} 行（去向与理由取自该行原文，未改写）`,
  });
}
for (const [k, ax] of gateKeys) if (!seen.has(k)) undisp.push(`${k} 缺=${ax}`);

const tally = {};
for (const e of entries) tally[e.disposition] = (tally[e.disposition] || 0) + 1;
for (const w of VOCAB) if (!tally[w]) tally[w] = 0;

console.log(`RCDEMIT_GATE CASES=${g.reading.cases} UNCOVERED=${g.reading.uncovered} COVERED=${g.reading.covered} EXEMPT=${g.reading.exempt} NEVER_ON_REAL=${g.reading.neverOnReal} REAL_BAND_BUT_ALL_SKIPPED=${g.reading.realBandButAllSkipped} RESULT=${g.reading.result} exit=${g.exit === null ? "(取样)" : g.exit}`);
console.log(`RCDEMIT_RULINGS ${relPosix(RULINGS)} 解析=${ruled.length} 行（跳过非数据行=${ruledSkipped.length}）sha256=${mdSha.slice(0, 12)}`);
console.log(`RCDEMIT_TALLY ${VOCAB.map((w) => w + "=" + tally[w]).join(" ")}｜去向合计=${entries.length}`);
if (refused.length) for (const x of refused) console.log("  REFUSE " + x);
if (undisp.length) for (const x of undisp) console.log("  NO_DISPOSITION " + x + " ⇒ 这条欠账还没有去向（核对门会为此判红）");
if (stale.length) for (const r of stale) console.log(`  STALE ${r.key} 判决时欠账、门现量已不欠 ⇒ 旧去向留着（载具不删别人的账），核对门按 advisory 计点名`);
if (drift.length) for (const x of drift) console.log("  AXIS_DRIFT " + x + "（轴是门那一侧的事实，册子只如实带出两边）");

/* 守恒：门的欠账 = 册里点名到的欠账 + 无去向的欠账，一条都不许凭空消失。 */
const conserved = g.reading.uncovered === undisp.length + entries.filter((e) => e.stillUncovered).length;

if (refused.length) { console.log(`RCDEMIT_RESULT=FAIL reason=${refused.length} 条不合登记的行 ⇒ 册子一个字都不改（照 emit-openrow-register.mjs:96 的纪律）`); process.exit(1); }

const core = {
  kind: "real-coverage-disposition",
  note: "真实档覆盖欠账的去向册。键=verify-real-coverage.mjs 自己印的复合 case id（逐字保留，不拆）。"
    + "本册只登记「欠的是哪一种东西、由哪个载具去还」，**不销任何红**：词表里没有 DONE/CLOSED/EXEMPT 这类词，"
    + "REALCOV_UNCOVERED 只能由那条腿真的判过才能变小。核对门 scripts/qa/verify-real-coverage-disposition.mjs。",
  vocab: VOCAB,
  polarity: { undisposedDebt: "blocking", offVocabWord: "blocking", hollowEntry: "blocking", staleDisposition: "advisory" },
  gateReading: g.reading,
  dispositions: entries,
};
const provenance = {
  generatedAt: new Date().toISOString(),
  gitSha: gitSha(),
  gateCmd: g.cmd.join(" "),
  gateExit: g.exit,
  gateStdoutSha256: sha256(g.stdout),
  rulingsFile: relPosix(RULINGS),
  rulingsSha256: mdSha,
  opsDir: relPosix(resolve(REPO, arg("ops", "reports/audit/round-6/ops"))),
  execDir: relPosix(resolve(REPO, arg("dir", "reports/audit/" + ROUND))),
  emittedBy: "scripts/qa/emit-real-coverage-disposition.mjs",
};

if (!conserved) { console.log(`RCDEMIT_RESULT=FAIL reason=守恒不成立 门 UNCOVERED=${g.reading.uncovered} ≠ 在册欠账=${entries.filter((e) => e.stillUncovered).length} + 无去向=${undisp.length} ⇒ 此刻写出来的册子对不上账，不写`); process.exit(2); }

const outJson = JSON.stringify({ ...core, provenance }, null, 1) + "\n";

if (!has("apply")) {
  for (const e of entries.slice(0, 40)) console.log(`  RCDEMIT_DRY ${e.case} 去向=${e.disposition}${e.qualifier ? "（" + e.qualifier + "）" : ""} 轴=${e.axesAtEmit || e.axesAtRuling}`);
  if (entries.length > 40) console.log(`  RCDEMIT_DRY …另 ${entries.length - 40} 条未逐条打印（总数已计入 RCDEMIT_TALLY）`);
  console.log(`RCDEMIT_RESULT=DRY 拟写 ${entries.length} 条去向 → ${relPosix(OUT)}（默认干跑，加 --apply 才落盘；无去向欠账=${undisp.length} 陈旧去向=${stale.length}）`);
  process.exit(undisp.length ? 1 : 0);
}

/* 幂等：内容核心（去掉 provenance）逐字节相同 ⇒ 不覆写、不留备份、不刷时间戳假装有新账。 */
let prevCore = null;
if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, "utf8"));
    const { provenance: _drop, ...rest } = prev;
    prevCore = JSON.stringify(rest, null, 1) + "\n";
  } catch (e) { console.log(`RCDEMIT_RESULT=FAIL reason=现有册子读不出来（${relPosix(OUT)}：${String(e.message).slice(0, 80)}）⇒ 不覆写不可解析的权威件`); process.exit(2); }
  if (prevCore === JSON.stringify(core, null, 1) + "\n" && !has("force")) {
    console.log(`RCDEMIT_NOCHANGE=${relPosix(OUT)} 去向内容与盘上逐字节相同 ⇒ 不覆写（provenance 也不动，免得每次复跑都造一份"看似重盖"的新戳）；要强制重写加 --force`);
    process.exit(undisp.length ? 1 : 0);
  }
}

/* 写权威件的备份纪律：照 verify-ops-corpus-stamp.mjs:427-435 —— 备份**先于**覆写、
   路径先于覆写打印出去、同秒撞名顺延 .2/.3（"覆写而不留底"正是本仓 2026-09-29 丢基线事故的成因）。 */
function tsOf(d) { const p2 = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`; }
let bakPrinted = "none（首次落盘）";
if (existsSync(OUT)) {
  let bak = `${OUT}.pre-real-cov-disposition.${tsOf(new Date())}.bak`;
  for (let i = 2; existsSync(bak); i++) bak = `${OUT}.pre-real-cov-disposition.${tsOf(new Date())}.${i}.bak`;
  copyFileSync(OUT, bak);
  bakPrinted = relPosix(bak);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, outJson, "utf8");
const back = JSON.parse(readFileSync(OUT, "utf8"));
const written = (back.dispositions || []).length;
console.log(`RCDEMIT_BACKUP=${bakPrinted}`);
console.log(`RCDEMIT_WRITTEN=${relPosix(OUT)} 条目=${written} 无去向欠账=${undisp.length} 陈旧去向=${stale.length} 轴漂移=${drift.length} 守恒=${conserved ? "OK" : "FAIL"}`);
console.log(`RCDEMIT_PROVENANCE gitSha=${provenance.gitSha || "?"} generatedAt=${provenance.generatedAt} gate=${provenance.gateCmd} gateStdout=${provenance.gateStdoutSha256.slice(0, 12)} rulings=${provenance.rulingsFile}@${provenance.rulingsSha256.slice(0, 12)}`);
if (written !== entries.length) { console.log("RCDEMIT_RESULT=FAIL reason=落盘后回读的条目数与拟写不同（写坏了）"); process.exit(2); }
/* 落盘后自证：本载具没有碰那条门，也没有碰判据台。这条读数就是「分流没关掉任何红」的机器侧复述。 */
console.log(`RCDEMIT_RESULT=${undisp.length ? "INCOMPLETE" : "OK"} 登记 ${entries.length} 条去向（含陈旧 ${stale.length}）｜REALCOV_UNCOVERED 仍=${g.reading.uncovered}（本载具一条都不减；无去向=${undisp.length}）`);
process.exit(undisp.length ? 1 : 0);
