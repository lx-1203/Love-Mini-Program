#!/usr/bin/env node
/**
 * 真实档覆盖欠账「去向册」的核对门（L19 车道，2026-09-30）。
 *
 * 它只问一个问题：**`verify-real-coverage` 现在点名的每一条欠账，是不是都有一条在册词表里的去向？**
 * 它不问"够不够"、也不问"那条腿跑没跑"。
 *
 * 为什么必须有它（缺口实测，decisions-v33.md §33 编排方亲笔留给本车道）：
 *   用户裁定 10 条真实档欠账「逐条按可采性分流」，L14 把分流写成散文
 *   （reports/audit/round-7/uncovered10-disposition-r14.md §3 汇总表），但去向的**机器件无处可落**：
 *   实测 `grep -rl "NEEDS_CAPABILITY|NEEDS_BAND_CHANGE|NEEDS_IDENTITY_IMPOSSIBLE|DISPATCHABLE_NOW" scripts/`
 *   = **0 个文件**（`NOT_SHOOTABLE` 只在执行/判决侧 23 个脚本里出现，那是另一套词），
 *   `verify-real-coverage.mjs` 里这五个词**一个都不出现**，也没有任何门在核"条条有去向"。
 *   ⇒ 后果：下一轮只要有一条欠账的去向丢了、或某条 case 已不再欠账却还挂着旧去向，没有任何东西会变红。
 *   去向册载体 = scripts/qa/emit-real-coverage-disposition.mjs；本门读它并与门的现量对账。
 *
 * 三条极性与理由（都印进机器行，不许两可）：
 *   ① 欠账**无去向** ⇒ **blocking**（主案）。这正是本门存在的理由：账丢了必须响。
 *   ② 去向词**不在册内词表** ⇒ **blocking**。词表是本门里的常量、不取自册子，
 *      否则册子自己声明一套词就能把自己判绿（那是把红改名）。在册五个词里
 *      **没有 DONE/CLOSED/RESOLVED/EXEMPT 任何一个** ⇒ 结构上就没有"用去向词销红"的通道。
 *   ③ 册里有去向但该 case **已不在 UNCOVERED 集**（陈旧去向）⇒ **advisory**（点名、计数、不判红）。
 *      论证：一条 case 离开 UNCOVERED 只有一条合法路径（那条腿真的判过 ⇒ 门的 covered 变大），
 *      那是**收账**、不是出事。把"账收完了却忘了划掉旧去向"做成常红判点，最快变绿的办法是删册子
 *      ——而删册子恰好销毁这本门要守的那份账。本仓对同族形状已有既定口径：
 *      verify-real-coverage.mjs 的 BANDLESS / IDENTITYLESS / SESSION_UNPROVEN 三格都是
 *      "数出来 + 逐条点名 + **不进 ok 的判据**"，注释里写得很清楚："永久红的门最后会被绕过去"（:31-32）。
 *      陈旧不等于安全，所以它必须**可见**：RCD_STALE=n 与逐条 STALE 行就是它的读数。
 *
 * 本门永远不替 `verify-real-coverage` 减红（硬口径，不是态度）：
 *   它只 spawn 那条门读它的 stdout 机器行，一个字不改它、不写它、不碰它的判据/阈值/退出码；
 *   本门判绿时 REALCOV_UNCOVERED 仍然是 10 —— 两门是两本账，且机器行里明印这一点。
 *   为什么这是必须的：本轮最要紧的一句落账就是"分流没有关掉任何红"（decisions-v33.md §33：
 *   免检 0 条、identities 与 ops 字节 0 改动）。如果"给欠账配去向"这件事本身能让任何一格变绿，
 *   那么写散文的人只需要多写几行字就买到了绿——那正是本仓记录过的"覆盖率纸面变好"事故，
 *   也是 decisions #13 立这条裁定的反面。所以新门只准**新增红**（账缺失），不准**转移红**。
 *
 * 取数旋钮：默认现跑那条门（`--gate` / `--round` 与它的默认参数一致）。
 *   `--gate-out <file>` 只供离线自测与复现（读一份已抓下来的门的 stdout），
 *   用了就在机器行里印 `SOURCE=captured-file`，终验不得带 —— 它不是一条能悄悄放宽判定的旋钮。
 *
 * 用法：node scripts/qa/verify-real-coverage-disposition.mjs
 *      [--round round-7] [--register reports/audit/round-7/real-coverage-disposition.json]
 *      [--gate scripts/qa/verify-real-coverage.mjs] [--gate-out tmp/gate.txt]
 * 退出码：0=条条有去向且词表合法（陈旧只点名）；1=判红（无去向/册外词/空条目/无 provenance/守恒不闭合）；
 *        2=前置件缺失（册子不存在或读不出、门跑不出来、门的机器行少字段）。宁可红也不空过。
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, sep, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const relPosix = (p) => relative(REPO, p).split(sep).join("/");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const KNOWN = ["register", "gate", "round", "gate-out"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log(`RCD_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 本门只认 ${KNOWN.join(",")}（拼错旗标会让它在没读的那一路输入上判绿）`); process.exit(2); }
}
const ROUND = arg("round", "round-7");
const GATE = resolve(REPO, arg("gate", "scripts/qa/verify-real-coverage.mjs"));
const REG = resolve(REPO, arg("register", "reports/audit/" + ROUND + "/real-coverage-disposition.json"));

/* 在册词表（权威副本在本门，不在册子）。来源=用户 2026-09-30 裁定「按可采性分流」的五个桶
   （decisions-v33.md §33 逐桶计数：NEEDS_CAPABILITY 7 / NEEDS_BAND_CHANGE 1 /
    NEEDS_IDENTITY_IMPOSSIBLE 1 / DISPATCHABLE_NOW 1 / NOT_SHOOTABLE 0）。
   加词要走编排方裁定；本门不自创，也不接受册子自带词表覆盖它。 */
const VOCAB = ["NEEDS_CAPABILITY", "NEEDS_BAND_CHANGE", "NEEDS_IDENTITY_IMPOSSIBLE", "DISPATCHABLE_NOW", "NOT_SHOOTABLE"];
const STALE_POLICY = "advisory";
const HOLLOW_FIELDS = ["case", "disposition", "basis"];

/* ---------------- ① 门的现量：只读它已有的输出面 ---------------- */
function readGate() {
  const cmd = [relPosix(GATE), "--round", ROUND];
  let stdout = "", exit = null, source = "captured-file";
  if (has("gate-out")) {
    const p = resolve(REPO, arg("gate-out"));
    if (!existsSync(p)) { console.log(`RCD_RESULT=FAIL reason=--gate-out 指向的门输出样本读不到 ${relPosix(p)}`); process.exit(2); }
    stdout = readFileSync(p, "utf8");
  } else {
    source = "live";
    try {
      stdout = execFileSync(process.execPath, cmd, { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (e) {
      /* 那条门按设计就是红的（今天 UNCOVERED=10 ⇒ exit 1）；红不代表读不到，只认它的机器行。 */
      if (!e || typeof e.stdout !== "string" || !/REALCOV_UNCOVERED=/.test(e.stdout)) {
        console.log(`RCD_RESULT=FAIL reason=上游门跑不出来或输出里没有 REALCOV_UNCOVERED（exit=${e && e.status}）⇒ 上游不可用时本门无权判绿（没读到的账不算对过）`);
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
  const miss = Object.keys(reading).filter((k) => k !== "result" && reading[k] === null);
  if (miss.length) { console.log(`RCD_RESULT=FAIL reason=上游门的机器行少字段 ${miss.join(",")} ⇒ 取数面变了，本门不猜`); process.exit(2); }
  const rows = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(/^ {2}UNCOVERED (\S+) 缺=(\S+)$/);
    if (m) rows.push({ key: m[1], axes: m[2] });
  }
  if (rows.length !== reading.listed || rows.length !== reading.uncovered) {
    console.log(`RCD_RESULT=FAIL reason=上游门点名行 ${rows.length} 与它自己的 REALCOV_UNCOVERED_LIST=${reading.listed}／REALCOV_UNCOVERED=${reading.uncovered} 不闭合 ⇒ 上游台账先红，此刻对任何册子的"已核对"都不成立`);
    process.exit(2);
  }
  return { reading, rows, exit, source, cmd: cmd.join(" ") };
}

const g = readGate();
/* 上游读数**先打印**再查册子：前置件缺失的那条退出路径也必须看得见门今天量到几条欠账，
   否则"册子还没落盘"这一格会把上游的 CASES/UNCOVERED 一起藏掉（自测实测到过一次）。 */
console.log(`RCD_GATE SOURCE=${g.source} CMD="${g.cmd}" CASES=${g.reading.cases} UNCOVERED=${g.reading.uncovered} COVERED=${g.reading.covered} EXEMPT=${g.reading.exempt} NEVER_ON_REAL=${g.reading.neverOnReal} REAL_BAND_BUT_ALL_SKIPPED=${g.reading.realBandButAllSkipped} RESULT=${g.reading.result} exit=${g.exit === null ? "(取样)" : g.exit}`);
if (!existsSync(REG)) { console.log(`RCD_RESULT=FAIL reason=去向册不存在 ${relPosix(REG)}（先跑 scripts/qa/emit-real-coverage-disposition.mjs --apply）⇒ 别把"没记过"读成"没有欠账"，门现量 UNCOVERED=${g.reading.uncovered}`); process.exit(2); }
let reg = null;
try { reg = JSON.parse(readFileSync(REG, "utf8")); }
catch (e) { console.log(`RCD_RESULT=FAIL reason=去向册读不出 JSON ${relPosix(REG)}：${String(e.message).slice(0, 100)}`); process.exit(2); }
if (!Array.isArray(reg.dispositions)) { console.log("RCD_RESULT=FAIL reason=去向册里没有 dispositions 数组（结构不对 ⇒ 先确认它是一本册子，再谈空集算不算没去向）"); process.exit(2); }

const debt = new Map(g.rows.map((r) => [r.key, r.axes]));
const entries = reg.dispositions;
const seenKey = new Set();
const badWord = [], hollow = [], stale = [], dup = [];
const disposed = new Set();
for (const e of entries) {
  const k = typeof e.case === "string" ? e.case : "";
  for (const f of HOLLOW_FIELDS) {
    const v = e[f];
    if (typeof v !== "string" || !v.trim()) { hollow.push(`${k || "(无 case)"} 缺 ${f} ⇒ 只有键没有内容的条目不叫有账`); }
  }
  if (!k) continue;
  if (seenKey.has(k)) { dup.push(k); continue; }
  seenKey.add(k);
  const w = String(e.disposition || "").trim();
  if (w && !VOCAB.includes(w)) badWord.push(`${k} 去向词「${w}」不在册内词表 ⇒ 新词要走编排方裁定，不许用改名把红挪走`);
  if (w && VOCAB.includes(w) && debt.has(k)) disposed.add(k);
  if (!debt.has(k)) stale.push(`${k} 在册（去向=${w || "(空)"}）但门现量已不欠 ⇒ 陈旧去向，advisory 点名不判红`);
}
const undisposed = [...debt.keys()].filter((k) => !disposed.has(k));
const axisDrift = [];
for (const e of entries) {
  if (!e.case || !debt.has(e.case)) continue;
  const at = e.axesAtRuling, now = debt.get(e.case);
  if (typeof at === "string" && at && at !== now) axisDrift.push(`${e.case} 判决时轴=${at} ≠ 门现量轴=${now}`);
}
/* provenance：本仓对权威件的既有口径（verify-ops-corpus-stamp.mjs:439-449 写 gitSha/at，
   verify-provenance-all.mjs:162-176 读顶层 gitSha/generatedAt）。缺了就是"一份不知道哪来的册子"。 */
const prov = reg.provenance || {};
const provMissing = ["gitSha", "generatedAt", "gateCmd", "rulingsFile"].filter((f) => !prov[f]);

const inBookDebts = disposed.size;
const conserved = inBookDebts + undisposed.length === g.reading.uncovered;
const vocabDrift = Array.isArray(reg.vocab) && reg.vocab.join("|") !== VOCAB.join("|");

const bookUncovered = reg.gateReading && reg.gateReading.uncovered !== undefined ? reg.gateReading.uncovered
  : prov.gateReading && prov.gateReading.uncovered !== undefined ? prov.gateReading.uncovered : "(未记)";
console.log(`RCD_REGISTER=${relPosix(REG)} 条目=${entries.length} kind=${reg.kind || "(未记)"} gitSha=${prov.gitSha || "?"} generatedAt=${prov.generatedAt || "?"} 册记时门 UNCOVERED=${bookUncovered} 现量=${g.reading.uncovered} 门stdout指纹=${prov.gateStdoutSha256 ? String(prov.gateStdoutSha256).slice(0, 12) : "(未记)"}`);
if (bookUncovered !== "(未记)" && Number(bookUncovered) !== g.reading.uncovered) console.log(`  SNAPSHOT_DRIFT 册子是从 UNCOVERED=${bookUncovered} 那次读数派生的，门现量=${g.reading.uncovered} ⇒ 欠账集动过，去向册需要重跑载具刷一遍（陈旧/新增就是从这里来的）`);
console.log(`RCD_VOCAB ${VOCAB.join("|")}（词表权威在本门，不取自册子；五个词里没有任何 DONE/CLOSED/EXEMPT ⇒ 这本册结构上销不掉红）`);
if (vocabDrift) console.log(`  VOCAB_DRIFT 册内 vocab=${(reg.vocab || []).join("|")} ≠ 本门词表 ⇒ 以本门词表判，册子那份不算数`);
console.log(`RCD_CHECK 门欠账=${g.reading.uncovered} 有去向=${inBookDebts} 无去向=${undisposed.length} 册外词=${badWord.length} 空条目=${hollow.length} 重复键=${dup.length} 陈旧=${stale.length} 轴漂移=${axisDrift.length} 守恒=${conserved ? "OK" : "FAIL"}`);
for (const x of undisposed) console.log(`  UNDISPOSED ${x} 缺=${debt.get(x)} ⇒ 这条欠账没有去向（本门的主案，判红）`);
for (const x of badWord) console.log(`  BAD_WORD ${x}`);
for (const x of hollow) console.log(`  HOLLOW ${x}`);
for (const x of dup) console.log(`  DUP_KEY ${x} ⇒ 一个键只能有一条去向，两条就是有两笔判决没说清哪笔算数`);
for (const x of stale) console.log(`  STALE ${x}`);
for (const x of axisDrift) console.log(`  AXIS_DRIFT ${x}（轴是门那一侧的事实；册子只如实带出两边，不判红）`);
for (const f of provMissing) console.log(`  NO_PROVENANCE 册内 provenance.${f} 缺失 ⇒ 不知道这份册子是从哪一次门的读数派生的，它不能当账用`);
console.log(`RCD_STALE_POLICY=${STALE_POLICY}（陈旧去向点名+计数、不判红；理由：一条 case 离开 UNCOVERED 只可能是收账，把"忘划旧去向"做成常红的唯一绿路就是删册子，而删册子正好销毁本门要守的账。同族口径见 verify-real-coverage.mjs 的 BANDLESS/IDENTITYLESS/SESSION_UNPROVEN：只数只点名、不进 ok）`);
if (!conserved) console.log(`  CONSERVATION_FAIL 有去向=${inBookDebts} + 无去向=${undisposed.length} ≠ 门 UNCOVERED=${g.reading.uncovered} ⇒ 有一笔欠账既没算成有账也没算成没账，这本对账本身不可信`);
console.log(`RCD_NO_REDUCTION 本门不替 verify-real-coverage 减红：REALCOV_UNCOVERED 仍=${g.reading.uncovered}（那 ${g.reading.uncovered} 条的红归那条门自己判，本门只审"条条有没有去向"，一条都不许在这里被读成已解决）`);

const blocking = undisposed.length || badWord.length || hollow.length || dup.length || provMissing.length || !conserved;
const why = [];
if (undisposed.length) why.push(`无去向欠账 ${undisposed.length} 条`);
if (badWord.length) why.push(`册外去向词 ${badWord.length} 条`);
if (hollow.length) why.push(`空条目 ${hollow.length} 处`);
if (dup.length) why.push(`重复键 ${dup.length} 个`);
if (provMissing.length) why.push(`provenance 缺 ${provMissing.join("/")}`);
if (!conserved) why.push("对账不守恒");
console.log(blocking
  ? `RCD_RESULT=FAIL（${why.join("；")}）⇒ 分流这本账不完整；注意这条红与 REALCOV_UNCOVERED=${g.reading.uncovered} 是两笔账，本门不合并、不折抵`
  : `RCD_RESULT=PASS（${g.reading.uncovered} 条欠账条条有在册去向；陈旧 ${stale.length} 条按 ${STALE_POLICY} 点名不判红；上游门照旧 RESULT=${g.reading.result} UNCOVERED=${g.reading.uncovered}）`);
process.exit(blocking ? 1 : 0);
