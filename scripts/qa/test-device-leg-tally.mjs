#!/usr/bin/env node
/* 设备腿三档账本（scripts/qa/device-leg-tally.mjs）的离线负例。
   为什么必须存在：覆盖率门（scripts/qa/verify-real-coverage.mjs）的 execRows()（:157-176）只认
   exec-* 目录里 results[] 的 manifest|id / band / identity / status / loginVerify / sessionSource，
   而这几格**全部**由 device-leg-tally.mjs 生成 ⇒ 计数器一旦写错形状，设备腿就会
   "跑了、落盘了、门一条也不认领"。本仓为同一种失败付过两次学费：
     · 一次是行落在 case-id 空间（manifest|id 不在判据集里）⇒ 0 行台账；
     · 一次是 band 命名空间写成了 **git 提交号**（real@<HEAD>）⇒ 每一行都被门的
       rowFreshness()（:259-264）读成 stale、从 COVERED 摘进 EXPIRED 桶 ⇒ 这条腿 discharged 0 覆盖。
   所以本文件不是"给纯函数补覆盖率"，它钉的是**门到底读不读得动这份账**：
     ① 三档分得开：仪表/环境故障（checkFault 且 fault=true）永不进 fail，产品断言判红必须进 fail；
     ② 出口码 0/1/2 映射正确，且"只有仪表故障"永不退 0（退 0 = 把没量到说成量到了）；
     ③ 机读行只有一条 `*_RESULT=`、整行不含 ASCII 竖线 —— 载体 scripts/qa/run-final-verify-v33.sh:49
        的 `grep -oE '[A-Z_]+_RESULT=[^|]*'` 会在 | 处把判决截断；
     ④ 行的状态词表与档位前缀能被**门自己的** JUDGED / REAL_BAND 正则接住（正则从门源码现抠，
        不在测试里抄第二份口径，抄了就等于测自己的桩）；
     ⑤ band 必须是 mode@sha8（尺=scripts/qa/artifact-band.mjs:22），并把同一份夹具按**修复前的形状**
        （real@<8 位十六进制提交号>）再跑一遍门：那条必须掉进 EXPIRED。负例咬不动 = 没测。
   全部离线：不连微信开发者工具、不抢 UI 租约、不写 reports/ 下任何权威账本（夹具在 .zcode/tmp 下），
   门那一侧只跑 --ops/--dir/--ledger 全指夹具的合成批次（对真盘一个字节都不写）。
   用法：node scripts/qa/test-device-leg-tally.mjs ⇒ 期望 DLTALLY_TEST=PASS，否则 exit 1
   自报口径见 run-qa-selftests.mjs:49-55（两种方言都印，stem 7 字符合 `\w{2,24}` 与 `[A-Z]{2,8}`）。 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createTally, buildRows, buildExecFile, resultLine, resultVerdict, exitCodeOf,
  verdictLine, unverifiedLine, looksInstrumentFault, bindKey,
} from "./device-leg-tally.mjs";
import { readApiMode } from "./artifact-band.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const NODE = process.execPath;
const GATE = resolve(HERE, "verify-real-coverage.mjs");
const LEG = resolve(REPO, "scripts", "verify-device-leg.mjs");
const TMP = resolve(REPO, ".zcode", "tmp", "device-leg-tally");

let checks = 0, fail = 0;
/* 门的输出里满是 REALCOV_RESULT=FAIL 这种形状，而聚合器只抓**第一个** *_TEST=/*_RESULT= 当判据行
   （run-qa-selftests.mjs:55）⇒ 任何被我回显进诊断行的门输出都必须先去毒，否则门绿我也红、门红我也绿。
   同一条规矩管着我自己的夹具行：DEVICELEG_RESULT=… 永不原样进 stdout。 */
const mask = (s) => String(s).replace(/\b([A-Z]{2,8})_(TEST|RESULT)=(PASS|FAIL)\b/g, "$1~$2~$3");
function t(name, cond, got) {
  checks++;
  if (!cond) { fail++; console.log(`FAIL ${name} :: ${mask(String(got === undefined ? "" : got).slice(0, 420))}`); }
  else console.log(`ok   ${name}${got === undefined ? "" : "  (" + mask(String(got).slice(0, 150)) + ")"}`);
}

/* ════ 0. 夹具：一把**真的**尺（同一份 artifact-band 算法，不手写哈希）════
   合成 bundle 的 config/env.js 只含 VITE_API_MODE:"real" 那一格，readApiMode 对它 sha256 前 8 位
   = 门侧 resolveCurrentStamp()（--real-bundle 指到同一枚目录）算出来的当前尺 ⇒
   "生产者与消费者同源"这件事是被**跑**出来的，不是我照抄的一串十六进制。 */
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, "bundle", "config"), { recursive: true });
mkdirSync(join(TMP, "ops"), { recursive: true });
writeFileSync(join(TMP, "bundle", "config", "env.js"),
  'const T={MODE:"real",VITE_API_MODE:"real",VITE_API_BASE_URL:"http://127.0.0.1:8080/api"};exports.T=T;\n');
const RULER = readApiMode(join(TMP, "bundle"));
t("夹具尺可读（artifact-band.mjs:14-22 现算，mode+sha8 都在）", !!RULER.mode && !!RULER.sha8, JSON.stringify(RULER));
const FRESH_BAND = `${RULER.mode}@${RULER.sha8}`;
/* 修复前的那一枚：git rev-parse --short=8 HEAD 的形状（8 位十六进制**提交号**）。
   它匹配门侧 rowRealSha8 的 /^real@([0-9a-fA-F]{6,})/ ⇒ 被当成构建戳去比 ⇒ 永远 stale。 */
const GIT_SHAPE_BAND = "real@9403369d";
t("负例夹具与正例夹具确实不同名（同一串就当不出误差）", GIT_SHAPE_BAND !== FRESH_BAND, `${GIT_SHAPE_BAND} vs ${FRESH_BAND}`);
/* 夹具判据台：一条只要求登录轴的用例（设备腿铸的是演示学员真票 ⇒ identity 只有 "A"，
   游客轴它结构上给不了；未标 identities 的判据要两把身份，那条留给游客腿，不在本夹具里假装）。 */
writeFileSync(join(TMP, "ops", "fix-dl.json"), JSON.stringify({
  suite: "FIXTURE-DL", page: "subpackages/village/village/index",
  cases: [{ id: "DL01", requiresReal: true, identities: ["A"], title: "设备发的帖子 30 秒内在后台按同一 ID 读到" }],
}, null, 1));
writeFileSync(join(TMP, "ledger.json"), JSON.stringify({ corrections: [], fixlane: [] }));
const BINDINGS = [{ match: "设备发的帖子", manifest: "FIXTURE-DL", id: "DL01", page: "subpackages/village/village/index" }];

/* ════ 1. 三档计数分得开（本模块存在的全部理由）════ */
{
  const out = [];
  const tt = createTally({ emit: (s) => out.push(s) });
  tt.checkFault("仪表档：通道断了", false, "THROW timeout waiting for automator response", true);
  t("(a) checkFault(fault=true, ok=false) ⇒ unverified+1", tt.counts.unverified === 1, JSON.stringify(tt.counts));
  t("(a) 同一条**没有**记进 fail（仪表噪声不许写成产品红：那条 194/289 行的 67% 假红就是这么消的）",
    tt.counts.fail === 0, JSON.stringify(tt.counts));
  t("(a) 也没记进 pass（判绿要真判绿，故障不算过）", tt.counts.pass === 0, JSON.stringify(tt.counts));
  tt.checkFault("产品档：断言判红", false, "后台按 marker 查不到 toast=发布失败", false);
  t("(b) 真·产品断言失败 ⇒ fail+1", tt.counts.fail === 1, JSON.stringify(tt.counts));
  t("(b) 这一条没污染 unverified", tt.counts.unverified === 1, JSON.stringify(tt.counts));
  tt.check("产品档：断言判绿", true, "id=4321 用时=3.2s");
  t("check(ok=true) ⇒ pass+1", tt.counts.pass === 1, JSON.stringify(tt.counts));
  t("三档互斥守恒：pass+fail+unverified = items 条数",
    tt.counts.pass + tt.counts.fail + tt.counts.unverified === tt.items.length, `${tt.items.length} 项`);
  t("emit 到的仪表行前缀是整词 UNVERIFIED-INSTRUMENT，不是 PASS/FAIL（外部 grep 不会读成产品判决）",
    /^UNVERIFIED-INSTRUMENT  /.test(out[0]) && !/^(PASS|FAIL)/.test(out[0]), out[0]);
  t("产品行前两格仍是 `PASS··`/`FAIL··` + ` — ` 分隔（旧格式逐字节兼容，外部工具在 grep ^PASS/^FAIL）",
    out[1] === "FAIL  产品档：断言判红 — 后台按 marker 查不到 toast=发布失败"
    && out[2] === "PASS  产品档：断言判绿 — id=4321 用时=3.2s", `${out[1]} / ${out[2]}`);
}
{
  const tt = createTally({ emit: () => {} });
  tt.checkFault("仪表档", true, "读数正常", true);
  t("checkFault(ok=true) 即便 fault 为真也记 pass（故障只影响「没判绿」的那些）", tt.counts.pass === 1 && tt.counts.unverified === 0);
  tt.uncheck("租约前置", "腿在开跑前被拦");
  t("uncheck ⇒ unverified（与 checkFault 同一档）", tt.counts.unverified === 1 && tt.counts.fail === 0, JSON.stringify(tt.counts));
  t("uncheck 的 label 走 unverifiedLine（不带 — 时也逐字对齐）", tt.items[1].tier === "unverified");
}

/* ════ 2. 出口码：0/1/2 三格，且"只有仪表故障"永不退 0 ════ */
{
  const allGreen = { pass: 3, fail: 0, unverified: 0 };
  const productRed = { pass: 2, fail: 1, unverified: 0 };
  const onlyInstrument = { pass: 2, fail: 0, unverified: 1 };
  const nothing = { pass: 0, fail: 0, unverified: 0 };
  t("(c) 全绿 ⇒ exitCodeOf=0", exitCodeOf(allGreen) === 0, exitCodeOf(allGreen));
  t("(c) 有产品红 ⇒ exitCodeOf=1", exitCodeOf(productRed) === 1, exitCodeOf(productRed));
  t("(c) 只有仪表故障 ⇒ exitCodeOf=2（不是 0！退 0 = 把「没量到」说成「量到了」）",
    exitCodeOf(onlyInstrument) === 2, exitCodeOf(onlyInstrument));
  t("(c) 一条判点都没产出 ⇒ exitCodeOf=2（空账不绿）", exitCodeOf(nothing) === 2, exitCodeOf(nothing));
  t("红优先于仪表故障：fail+unverified 同在 ⇒ 1（红就是红，不许被仪表档洗成 2）",
    exitCodeOf({ pass: 0, fail: 1, unverified: 5 }) === 1);
  t("resultVerdict 三档词表逐字对（NOT-EVIDENCED 是仓内既有 token，不另造）",
    resultVerdict(allGreen) === "PASS" && resultVerdict(productRed) === "FAIL" && resultVerdict(onlyInstrument) === "NOT-EVIDENCED");
}

/* ════ 3. 机读行：单条 *_RESULT=、整行无竖线（bash 载体在 | 处截断）════ */
{
  for (const [name, c] of [["PASS", { pass: 4, fail: 0, unverified: 0 }], ["FAIL", { pass: 1, fail: 2, unverified: 0 }], ["NOT-EVIDENCED", { pass: 0, fail: 0, unverified: 3 }]]) {
    const line = resultLine(c, "reports/audit/round-7/exec-v38-devicleg");
    t(`(d) ${name}：恰好一条 _RESULT=`, (line.match(/_RESULT=/g) || []).length === 1, mask(line));
    t(`(d) ${name}：整行不含 ASCII 竖线（grep -oE '[A-Z_]+_RESULT=[^|]*' 会把判决截断）`, !line.includes("|"), mask(line));
    t(`(d) ${name}：竖线口径还过一遍载体那条正则，取到的必须是**整行**`,
      (line.match(/[A-Z_]+_RESULT=[^|]*/g) || []).length === 1 && line.match(/[A-Z_]+_RESULT=[^|]*/)[0] === line);
    t(`(d) ${name}：单行（无换行）、以 DEVICELEG_RESULT=${name} 开头`, !/[\r\n]/.test(line) && line.startsWith(`DEVICELEG_RESULT=${name} `));
    t(`(d) ${name}：pass/fail/unverified/dir 四格都在且顺序固定`,
      new RegExp(`^DEVICELEG_RESULT=${name} pass=${c.pass} fail=${c.fail} unverified=${c.unverified} dir=`).test(line));
  }
  const noDir = resultLine({ pass: 0, fail: 0, unverified: 1 }, "");
  t("台账没落盘时 dir=none、band 没算出来时 band=UNSTAMPED（机读行不许缺字段，也不许印一枚假戳）",
    noDir.includes("dir=none") && noDir.endsWith("band=UNSTAMPED") && !noDir.includes("|"), mask(noDir));
  const withBand = resultLine({ pass: 1, fail: 0, unverified: 0 }, "reports/audit/round-7/exec-v38-devicleg", FRESH_BAND);
  t("band 那一格印的是 mode@sha8（与门同命名空间，载具一眼可读；仍恰好一条 _RESULT=、无竖线）",
    withBand.endsWith(`band=${FRESH_BAND}`) && (withBand.match(/_RESULT=/g) || []).length === 1 && !withBand.includes("|"), mask(withBand));
  t("五格顺序固定 pass/fail/unverified/dir/band（下游按位置读的话不许漂移）",
    /^DEVICELEG_RESULT=PASS pass=1 fail=0 unverified=0 dir=\S+ band=\S+$/.test(withBand), mask(withBand));
}

/* ════ 4. 行形状：用门自己的正则当尺（正则从门源码现抠）════ */
const gateSrc = readFileSync(GATE, "utf8");
const judgedLit = (gateSrc.match(/^const JUDGED = (\/.*\/);$/m) || [])[1];
const realBandLit = (gateSrc.match(/^const REAL_BAND = (\/.*\/);$/m) || [])[1];
t("从门源码里取到 JUDGED 与 REAL_BAND 两枚正则（取不到＝口径被搬走，本测试不许当绿）",
  !!judgedLit && !!realBandLit, `${judgedLit} / ${realBandLit}`);
const JUDGED = judgedLit ? new Function(`return ${judgedLit};`)() : null;
const REAL_BAND = realBandLit ? new Function(`return ${realBandLit};`)() : null;
/** 门的尺（rowRealSha8 + rowFreshness）从门源码原样 eval：rowRealSha8 是单行体，
    第一个 "\n}" 落在 rowFreshness 结尾 ⇒ 这一段把两个函数一起带出来（取不到就红，绝不回落到测试自己写的版本）。 */
function extract(src, name) {
  const at = src.indexOf("function " + name + "(");
  if (at < 0) return null;
  const rest = src.slice(at);
  const close = rest.indexOf("\n}");
  return close < 0 ? null : rest.slice(0, close + 2).trim();
}
const rulerSrc = extract(gateSrc, "rowRealSha8");
let ROWREALSHA8 = null, ROWFRESH = null;
try {
  const M = new Function(`${rulerSrc}\n return { rowRealSha8, rowFreshness };`)();
  ROWREALSHA8 = M.rowRealSha8; ROWFRESH = M.rowFreshness;
} catch (e) { console.log("EXTRACT_ERR " + String(e.message).slice(0, 120)); }
t("eval 出门里的 rowRealSha8/rowFreshness（同一份实现，不是我抄的）",
  typeof ROWREALSHA8 === "function" && typeof ROWFRESH === "function");

const items = [
  { label: "设备发的帖子 30 秒内在后台按同一 ID 读到（同一条记录）", tier: "pass", detail: "id=4321 用时=3.2s", page: "subpackages/village/village/publish" },
  { label: "产品判红：输入框回读不含 marker", tier: "fail", detail: "回读=", page: "subpackages/village/village/publish" },
  { label: "仪表故障：出帧通道未回文件", tier: "unverified", detail: "工具没回可存在的 path", page: "pages/home/index" },
];
const meta = {
  gitSha: "9403369d", gitShaScope: "provenance-only", band: FRESH_BAND, bandSource: "readApiMode(...)",
  identity: "A", project: "apps/client/dist/build/mp-weixin-real",
  loginVerify: "logged-in userId=100151", sessionSource: "phone-login",
  legNote: "夹具", totals: { pass: 1, fail: 1, unverified: 1 },
};
const rows = buildRows(items, meta, BINDINGS);
t("绑定表命中的行用判据的 manifest|id（落进 case-id 空间那条 0 行台账就是这里没对上）",
  rows[0].manifest === "FIXTURE-DL" && rows[0].id === "DL01", `${rows[0].manifest}|${rows[0].id}`);
t("没绑定的行落 DEVICE-LEG|DLnn（形状合规，但门不会替不存在的判据认领覆盖）",
  rows[1].manifest === "DEVICE-LEG" && /^DL\d\d$/.test(rows[1].id), `${rows[1].manifest}|${rows[1].id}`);
t("每行的 band 就是 meta.band 那一枚（生产者不许在行上另算）",
  rows.every((r) => r.band === FRESH_BAND));
t("行上带会话证据（loginVerify×sessionSource，门 :197 sessionVerdict 拿它对账 identity 标签）",
  rows.every((r) => r.loginVerify === meta.loginVerify && r.sessionSource === meta.sessionSource));
t("档位→状态词表：pass⇒EXECUTED / fail⇒FAILED 都被门的 JUDGED 接住（判过就是判过，红也算判过）",
  JUDGED.test(rows[0].status) && JUDGED.test(rows[1].status) && rows[0].status === "EXECUTED" && rows[1].status === "FAILED");
t("仪表档⇒SKIPPED，且**不被** JUDGED 接住（跳过不等于量到 —— 236 条被吞掉的那条路径）",
  rows[2].status === "SKIPPED" && !JUDGED.test(rows[2].status));
t("三档行的 band 都能被 REAL_BAND 前缀接住（real 档入场券）", rows.every((r) => REAL_BAND.test(r.band)));
t("仪表档行的 failureReason 点名 UNVERIFIED-INSTRUMENT 与载具（撤红的唯一方式是修载具重跑）",
  /UNVERIFIED-INSTRUMENT/.test(rows[2].failureReason) && /device-leg-tally\.mjs/.test(rows[2].failureReason));
t("产品红行的 failureReason 不加仪表前缀（两档不许在台账里互相冒充）",
  rows[1].failureReason === items[1].detail && !/UNVERIFIED/.test(rows[1].failureReason));
t("bindKey 只认 label 子串命中且 manifest+id 齐备的条目（半条绑定不算绑定）",
  bindKey("设备发的帖子 …", [{ match: "设备发的帖子", manifest: "X" }]) === null
  && bindKey("设备发的帖子 …", BINDINGS).id === "DL01");

/* 文件级头部：门只读 results[]，但 exec-frames-to-corpus.mjs:44-45 与下一轮人都要读头部那几格。 */
const doc = buildExecFile(rows, meta);
t("buildExecFile 的 results 就是行数组（门 execRows 只认这一格）", Array.isArray(doc.results) && doc.results.length === 3);
t("头部 band = mode@sha8 且与行上一致（同一把尺，两处不许分家）",
  doc.band === FRESH_BAND && doc.results.every((r) => r.band === doc.band));
t("头部 gitSha 仍在（提交号是出处旁证，corpus 那一轴要它），但 band 里不含它",
  doc.gitSha === meta.gitSha && !String(doc.band).includes(meta.gitSha));
t("gitShaScope 明写 provenance-only（防止下一轮又有人拿提交号当 band 键）",
  /provenance/.test(String(doc.gitShaScope)));
t("三档计数在头部 totals 里可见（pass/fail/unverified 各一格）",
  doc.totals.pass === 1 && doc.totals.fail === 1 && doc.totals.unverified === 1);

/* ════ 5. 门的尺：修复前的 band 必须被读成 stale（负例的空转防护）════ */
{
  const cur = { sha8: RULER.sha8, source: "fixture", raw: FRESH_BAND };
  t("修复后的 band ⇒ 门的 rowFreshness 说 fresh", ROWFRESH(FRESH_BAND, cur) === "fresh", ROWFRESH(FRESH_BAND, cur));
  t("修复前的 band（real@<提交号>）⇒ 门的 rowFreshness 说 stale —— 这一格就是本轮那条 0 覆盖",
    ROWFRESH(GIT_SHAPE_BAND, cur) === "stale", ROWFRESH(GIT_SHAPE_BAND, cur));
  t("提交号那枚确实被 rowRealSha8 当成戳读走了（否则它只会被算成「缺戳」，我这条路就白修了）",
    ROWREALSHA8(GIT_SHAPE_BAND) === "9403369d", ROWREALSHA8(GIT_SHAPE_BAND));
  t("尺取不到时一律 unmeasurable（门不许编比较，本腿也不许趁机盖一枚假的）",
    ROWFRESH(FRESH_BAND, { sha8: null }) === "unmeasurable");
  t("档位戳读不到 ⇒ 行上 band 是空串（门大声数成 REALCOV_BANDLESS_*），不是 real@unknown / real@?",
    ROWREALSHA8("real@unknown") === null && ROWREALSHA8("real@?") === null
    && ROWFRESH("", cur) === "unmeasurable" && !/unknown|\?/.test(FRESH_BAND));
}

/* ════ 6. 真跑门：同一份夹具，只换 band ⇒ 记账必须从 COVERED 翻到 EXPIRED ════ */
function runGate(tag, rowsOfRun, opts = {}) {
  const root = join(TMP, `round-${tag}`);
  const legDir = join(root, "exec-v38-devicleg");
  mkdirSync(legDir, { recursive: true });
  /* band 是**行上**那一格（门 execRows 只读 results[]，文件头部那枚它从不读）⇒
     变异必须落在行上，只改头部等于改了空气（第一版就栽在这里，负例当场不咬）。 */
  const band = opts.band === undefined ? FRESH_BAND : opts.band;
  const rows = rowsOfRun.map((r) => ({ ...r, band }));
  writeFileSync(join(legDir, "exec-results.json"), JSON.stringify(buildExecFile(rows, { ...meta, band }), null, 1));
  const r = spawnSync(NODE, [GATE, "--ops", join(TMP, "ops"), "--dir", root, "--ledger", join(TMP, "ledger.json"),
    ...(opts.defaultBundle ? [] : ["--real-bundle", join(TMP, "bundle")]), ...(opts.extra || [])],
  { cwd: REPO, encoding: "utf8", timeout: 120000 });
  const out = (r.stdout || "") + (r.stderr || "");
  /* 一部分读数在行中（同一行还印着别的格子），锚到 ^ 就会读成 null —— 只有确定是行首的才锚。 */
  const num = (re) => { const m = out.match(re); return m ? Number(m[1]) : null; };
  return {
    code: r.status, out, rows,
    covered: num(/^REALCOV_COVERED=(\d+)/m),
    expired: num(/^REALCOV_EXPIRED=(\d+)/m),
    uncovered: num(/^REALCOV_UNCOVERED=(\d+)/m),
    neverOnReal: num(/^REALCOV_NEVER_ON_REAL=(\d+)/m),
    skipped: num(/REAL_BAND_BUT_ALL_SKIPPED=(\d+)/),
    bandless: num(/^REALCOV_BANDLESS_ROWS=(\d+)/m),
    bandlessCases: num(/REALCOV_BANDLESS_CASES=(\d+)/),
    proven: num(/^REALCOV_SESSION_PROVEN=(\d+)/m),
    contradict: num(/REALCOV_SESSION_CONTRADICT_ROWS=(\d+)/),
    execRows: num(/^REALCOV_CASES=\d+ EXEC_ROWS=(\d+)/m),
    stamp: (out.match(/REALCOV_BAND_STAMP=(\S+)/) || [])[1] || "",
    result: (out.match(/REALCOV_RESULT=(\w+)/) || [])[1] || null,
  };
}
{
  const judged = [rows[0]];                      // 只有那条判过的、绑定了的行
  const after = runGate("after", judged);
  const before = runGate("before", judged, { band: GIT_SHAPE_BAND });
  t("门在夹具上读得动这份账（EXEC_ROWS=1、当前尺=夹具 env.js 现算的 sha8）",
    after.execRows === 1 && after.stamp === FRESH_BAND, `EXEC_ROWS=${after.execRows} 尺=${mask(after.stamp)}`);
  t("修复后：band=mode@sha8 ⇒ 这一行**认领**（COVERED=1、EXPIRED=0、会话证据=已证）",
    after.code === 0 && after.covered === 1 && after.expired === 0 && after.uncovered === 0 && after.proven === 1 && after.result === "PASS",
    `exit=${after.code} COVERED=${after.covered} EXPIRED=${after.expired} UNCOVERED=${after.uncovered} PROVEN=${after.proven} ${mask(after.result)}`);
  t("修复前（同一批行、只把 band 换成 real@提交号）⇒ 一条也不认领：COVERED=0、EXPIRED=1",
    before.code === 1 && before.covered === 0 && before.expired === 1 && before.result === "FAIL",
    `exit=${before.code} COVERED=${before.covered} EXPIRED=${before.expired} ${mask(before.result)}`);
  t("负例真的咬得动：两次跑盘的夹具字节不同、COVERED 不同，且门点名了这一条 EXPIRED",
    readFileSync(join(TMP, "round-after", "exec-v38-devicleg", "exec-results.json"), "utf8")
      !== readFileSync(join(TMP, "round-before", "exec-v38-devicleg", "exec-results.json"), "utf8")
    && before.covered !== after.covered && before.out.includes("EXPIRED FIXTURE-DL|DL01"),
    before.out.split(/\r?\n/).find((l) => l.trim().startsWith("EXPIRED")) || "(门没点名)");
  t("会话证据这一轴没被顺手弄坏：identity=A + phone-login + logged-in ⇒ 门判已证（不是矛盾撤认领）",
    after.contradict === 0 && before.contradict === 0, `after=${after.contradict} before=${before.contradict}`);

  /* 未绑定的行：形状完全合规，门就是不认领（落在 DEVICE-LEG|DLnn 那一格的真实下场）。 */
  const unbound = runGate("unbound", [buildRows([items[0]], meta, [])[0]]);
  t("没绑定 ⇒ EXEC_ROWS 收到、COVERED 一格不涨、判据仍欠（这就是「case-id 空间」那次烧过的形状）",
    unbound.execRows === 1 && unbound.covered === 0 && unbound.uncovered === 1 && unbound.expired === 0,
    `EXEC_ROWS=${unbound.execRows} COVERED=${unbound.covered} UNCOVERED=${unbound.uncovered} EXPIRED=${unbound.expired}`);

  /* 档位戳读不到 ⇒ band 空串：门按 BANDLESS 大声数出来，而不是静默失配。 */
  const bandless = runGate("bandless", judged, { band: "" });
  t("band 取不到时留空串 ⇒ 门数成 REALCOV_BANDLESS_ROWS/CASES（看得见），并仍算欠账",
    bandless.bandless === 1 && bandless.bandlessCases === 1 && bandless.covered === 0,
    `BANDLESS_ROWS=${bandless.bandless} CASES=${bandless.bandlessCases} COVERED=${bandless.covered}`);
  t("空 band 不会被 EXPIRED 假装接住（缺字段与陈旧是两格，混了就找不到下一步）",
    bandless.expired === 0, `EXPIRED=${bandless.expired}`);

  /* 仪表档行（SKIPPED）永不进"判过"那一格。这一条必须用**绑定得到**的 label 造，
     否则它落在 DEVICE-LEG|DLnn（= 上面那条 unbound 的形状），欠账来自"没绑定"而不是"被跳过"，
     两格混起来这条负例就白测了。 */
  const instBound = buildRows([{ label: "设备发的帖子 30 秒内在后台出现（夹具：这一档是仪表故障，不是产品判决）", tier: "unverified", detail: "工具没回可存在的 path", page: "subpackages/village/village/publish" }], meta, BINDINGS)[0];
  t("仪表档夹具行既绑上了判据、状态又是 SKIPPED（两个条件缺一就不构成这一格）",
    instBound.manifest === "FIXTURE-DL" && instBound.id === "DL01" && instBound.status === "SKIPPED",
    `${instBound.manifest}|${instBound.id} status=${instBound.status}`);
  const instOnly = runGate("instonly", [instBound]);
  t("只有仪表故障行 ⇒ real 档有行但全被 SKIPPED=1、COVERED=0（跳过不算量到，欠账仍在）",
    instOnly.covered === 0 && instOnly.uncovered === 1 && instOnly.skipped === 1 && instOnly.neverOnReal === 0,
    `COVERED=${instOnly.covered} UNCOVERED=${instOnly.uncovered} SKIPPED=${instOnly.skipped} NEVER_ON_REAL=${instOnly.neverOnReal}`);
  /* 真盘对照（不带 --real-bundle ⇒ 门用它自己的缺省产物目录现算当前尺）：
     腿算 band 走的是同一个 readApiMode、同一个 apps/client/dist/build/mp-weixin-real ⇒
     两枚必须逐字相同，"命名空间对上了"这件事才是在真产物上成立的，不只是夹具里成立。 */
  const REAL_RULER = readApiMode(resolve(REPO, "apps/client/dist/build/mp-weixin-real"));
  t("真产物在盘且尺可读（不在盘时这条必须响：腿本来就跑不了，不许静默跳过这一格）",
    !!REAL_RULER.mode && !!REAL_RULER.sha8, JSON.stringify(REAL_RULER));
  const realRuler = runGate("realruler", judged, { defaultBundle: true, band: `${REAL_RULER.mode}@${REAL_RULER.sha8}` });
  t("门缺省尺源印出的当前尺 = 腿对真产物算出的那一枚（同一把尺，不分家）",
    realRuler.stamp === `${REAL_RULER.mode}@${REAL_RULER.sha8}`, `门=${mask(realRuler.stamp)}`);
  t("真产物尺 + 绑定行 ⇒ 门认领这一行（COVERED=1、EXPIRED=0）——修复后的形状在真尺上也是绿的",
    realRuler.covered === 1 && realRuler.expired === 0 && realRuler.code === 0,
    `exit=${realRuler.code} COVERED=${realRuler.covered} EXPIRED=${realRuler.expired}`);
}

/* ════ 7. 接线判点：设备腿自己不许再算第二把尺（源码级，改回去就红）════ */
{
  const src = readFileSync(LEG, "utf8");
  t("腿 import 了 readApiMode（尺与门同源）", /import \{ readApiMode \} from "\.\/qa\/artifact-band\.mjs"/.test(src));
  t("legMeta 的 band 走 BAND_STAMP（sha8 那一枚），不再拼 git 短号", /band: BAND_STAMP/.test(src));
  t("旧的 `${BAND}@${gitSha}` band 形状已从写盘路径消失（负例：改回去这条就红）",
    !/band: `\$\{BAND\}@\$\{gitSha\}`/.test(src) && !/band: BAND \+ "@" \+ gitSha/.test(src));
  t("git 短号只作 provenance（gitShaScope 明写不参与 band 匹配）", /gitShaScope: "provenance-only/.test(src));
  t("档位戳取不到 ⇒ 记 UNVERIFIED-INSTRUMENT，band 只走 BAND_STAMP 那一枚空串（写盘路径里没有 real@unknown 这种拼法）",
    /uncheck\("产物档位戳可读/.test(src) && !/band:\s*`[^`]*unknown/i.test(src) && !/band:\s*"[^"]*unknown/i.test(src));
  t("exec 台账目录名仍是 exec-* 前缀（门 :162 的入场条件）", /round-7", "exec-v38-devicleg"|exec-v38-devicleg/.test(src));
  /* 空转防护（本仓的规矩：负例咬不动就等于没测）：把**修复前那一段**源码形状喂给同一条判点，
     它必须响。没有这一条，上面那三行"已经从写盘路径消失"就只是我拿今天的源码自己证自己。 */
  const PRE_FIX = 'function legMeta() { let gitSha = "unknown"; return { gitSha, identity: "A", band: `${BAND}@${gitSha}` }; }';
  t("空转防护：修复前的 legMeta 形状确实违反上面两条接线判点（band 拼的是提交号）",
    /band: `\$\{BAND\}@\$\{gitSha\}`/.test(PRE_FIX) && !/band: BAND_STAMP/.test(PRE_FIX));
  const PRE_FIX_BAND = PRE_FIX.match(/band: `([^`]*)`/)[1].replace(/\$\{BAND\}/, "real").replace(/\$\{gitSha\}/, "9403369d");
  t("空转防护：那一段算出来的正是门读成 stale 的那一枚（real@9403369d），而今天的写法算的是 mode@sha8",
    PRE_FIX_BAND === GIT_SHAPE_BAND && ROWFRESH(PRE_FIX_BAND, { sha8: RULER.sha8 }) === "stale", PRE_FIX_BAND);
}

/* ════ 8. 仪表故障词表：只有载具自己报的错才命中（产品判词不许被自动洗成仪表档）════ */
{
  t("通道/后端类读数控为仪表故障",
    looksInstrumentFault("THROW fetch: ECONNREFUSED 127.0.0.1:8080") && looksInstrumentFault("ERR not able to connect to vm")
    && looksInstrumentFault("NO-STORE") && looksInstrumentFault("后端不可达：" ) && looksInstrumentFault("timeout waiting for automator response"));
  t("产品判词不被词表吃掉（否则任何红都能自称「仪表噪声」）",
    !looksInstrumentFault("后台按 marker 查不到 toast=发布失败") && !looksInstrumentFault("命中=false 子树长度=8123"));
  t("空读数不算故障", !looksInstrumentFault("") && !looksInstrumentFault(null));
}

console.log(`\nDLTALLY_SUMMARY cases=${checks} fail=${fail}`);
console.log(`SUMMARY: assertion failures = ${fail}`);
console.log(fail ? "DLTALLY_TEST=FAIL" : "DLTALLY_TEST=PASS");
process.exit(fail ? 1 : 0);
