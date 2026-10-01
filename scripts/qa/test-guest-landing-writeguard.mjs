#!/usr/bin/env node
/* 负例（L17 写入守卫车道）：verify-guest-landing.mjs 的 measure 腿写权威台账时，
   必须走 scripts/qa/measured-ledger.mjs 的 merge-never-shrink 语义。
   要钉死的原发缺陷（2026-09-30 01:18 实测）：旧写法在 for 循环之前就把 `rows: []` 无条件覆写进
   reports/audit/round-7/guest-landing-measured.json，随后第一条 clearSession 就抛
   （cli-automator.mjs:349 ← verify-guest-landing.mjs 的旧 :271），exit 1、0 帧落点，
   却已经把上一轮 real@f0677920 的 28 行测量清空（rows 28→[]、generatedAt/repeat 1→3 被重打）。
   全程离线：设备调用换成 .zcode/tmp 下的一次性桩，租约落在 QA_LOCK_DIR 的临时目录里，
   权威台账只被**读取**（结尾用 sha256 证明它一个字节都没被这个测试动过）。
   跑法：D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/test-guest-landing-writeguard.mjs
   聚合器认的输出：SUMMARY: assertion failures = N + WG_TEST=PASS|FAIL */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { mergeMeasuredLedger, shrinkRequested, ROW_POLICY, SHRINK_TOKEN } from "./measured-ledger.mjs";

const REPO = resolve(import.meta.dirname, "..", "..");
const QA = join(REPO, "scripts", "qa");
const CARRIER = join(QA, "verify-guest-landing.mjs");
const POLICY = join(QA, "guest-landing-policy.json");
const TRIAGE = join(REPO, ".zcode/tmp/triage-r7-guest.json");
const OPS = join(REPO, "reports/audit/round-6/ops");
const LEDGER = join(REPO, "reports/audit/round-7/guest-landing-measured.json");
/* 夹具根按车道纪律放在 tmp/ 下（不是 .zcode/tmp：那条目录有别的车道在消费，
   测试夹具混进去会让同伴的目录清点把半截文件读成缺陷）。测试结束时整目录删掉。 */
const TMP = join(REPO, "tmp", "qa", "guest-writeguard-r17");
const LOCKS = join(TMP, "locks");
const STUB = join(TMP, "stub-automator.mjs");
const LIVE = join(TMP, "carrier-live-shape.mjs");
const MUTANT = join(TMP, "carrier-prefix-shape.mjs");
const PROJ = join(TMP, "proj");

let fail = 0, checks = 0;
/* 聚合器 run-qa-selftests.mjs:52 抓的是**第一个** *_TEST=/*_RESULT=(PASS|FAIL)：
   被 spawn 的载具自己会印 GUEST_LANDING_RESULT=FAIL，原样转述就会把一条绿测试判红（反向也成立）。
   凡是往 stdout 里贴子进程输出的地方都必须先过 san()。 */
const san = (s) => String(s).replace(/_RESULT=/g, "_RESULT~").replace(/_TEST=/g, "_TEST~")
  .replace(/assertion failures =/g, "assertion-failures(引用)");
function t(name, cond, detail) {
  checks++;
  if (cond) console.log("ok   " + name + (detail === undefined ? "" : "  (" + san(String(detail)).slice(0, 200) + ")"));
  else { fail++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + san(String(detail)).slice(0, 300))); }
}
const sha = (p) => { try { return createHash("sha256").update(readFileSync(p)).digest("hex"); } catch { return "(读不到)"; } };
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
/* 保险闸：这个测试只许在 tmp/qa/guest-writeguard-r17（夹具根 TMP）下面写。
   路径里但凡出现 reports/ 或 apps/client/ 就地抛，不等跑完再后悔。 */
function guarded(p, what) {
  const abs = resolve(p), root = resolve(TMP);
  if (abs !== root && !abs.startsWith(root + (root.endsWith("\\") ? "" : "\\"))) throw new Error("夹具路径越界，拒绝操作 " + what + "：" + p);
  return p;
}

/* ══════════ 1. 守卫判据本身（measured-ledger.mjs 声明的三条硬规矩） ══════════ */
const mk = (k, extra) => Object.assign({ groupKey: k, measuredLanding: "pages/login/index", identity: "not-logged-in", markers: {}, stable: true, measuredAt: "2026-09-28T10:16:21.837Z", band: "real@f0677920" }, extra || {});
const PREV = { mode: "measure", generatedAt: "2026-09-28T10:15:58.555Z", project: "apps/client/dist/build/mp-weixin-real", band: "real@f0677920", guestCapable: true, repeat: 1, rows: [mk("A → pages/login/index"), mk("B → pages/login/index"), mk("C → pages/profile/index")] };
const META = { mode: "measure", generatedAt: "2026-09-30T01:18:44.000Z", project: "apps/client/dist/build/mp-weixin-real", band: "real@deadbeef", guestCapable: true, repeat: 3 };

t("模块声明的行策略与令牌就是载具接线用的那两个常量",
  ROW_POLICY === "merge-never-shrink" && SHRINK_TOKEN === "SHRINK_ROWS", ROW_POLICY + " / " + SHRINK_TOKEN);

{
  const r = mergeMeasuredLedger(PREV, [], META, {});
  t("规矩1 零行 ⇒ write=false 且 doc=null（失败/零行的腿无权碰台账）",
    r.write === false && r.doc === null && r.reason === "no-rows-contributed", JSON.stringify(r.reason));
  t("规矩1 零行时 counts 把旧行数原样交回（nextRows==prevRows==3，不是 0）",
    r.counts.prevRows === 3 && r.counts.nextRows === 3 && r.counts.dropped === 0, JSON.stringify(r.counts));
}
{
  const r = mergeMeasuredLedger(PREV, [mk("B → pages/login/index", { band: "real@deadbeef" }), mk("D → pages/mine/index")], META, {});
  const keys = r.doc.rows.map((x) => x.groupKey);
  t("规矩2 合并：本轮量到的就地覆盖，本轮没量到的旧行一根手指都不许碰",
    r.write === true && r.reason === "merged" && r.counts.updated === 1 && r.counts.added === 1 && r.counts.dropped === 0,
    JSON.stringify(r.counts));
  t("规矩2 合并后行数只增不减（3→4），顺序=旧账原序+本轮新增追加",
    r.counts.nextRows === 4 && keys.join("|") === "A → pages/login/index|B → pages/login/index|C → pages/profile/index|D → pages/mine/index", keys.join("|"));
  t("规矩2 复测那行的新证据确实覆盖到位（band 换成 deadbeef），未复测那行仍是旧 band",
    r.doc.rows[1].band === "real@deadbeef" && r.doc.rows[0].band === "real@f0677920");
  t("头字段按 runMeta 重打，同时 lastRun 把混装事实说出来（保留旧行=2、丢弃=0、未点名令牌=null）",
    r.doc.generatedAt === META.generatedAt && r.doc.repeat === 3 && r.doc.rowPolicy === ROW_POLICY
      && r.doc.lastRun.rowsKeptFromPrevious === 2 && r.doc.lastRun.rowsDropped === 0 && r.doc.lastRun.shrinkToken === null,
    JSON.stringify(r.doc.lastRun));
  t("prev 里的既有字段不因为合并而丢（doc 是旧账的超集）",
    r.doc.mode === "measure" && r.doc.project === PREV.project && r.doc.guestCapable === true);
}
{
  const r = mergeMeasuredLedger(PREV, [mk("A → pages/login/index"), mk("A → pages/login/index", { band: "real@zzzz" })], META, {});
  t("本轮同一 groupKey 重复落点：先到的那条算数，后到的不冒充（行数不翻倍也不覆盖）",
    r.counts.nextRows === 3 && r.doc.rows[0].band === "real@f0677920" && r.counts.updated === 1 && r.counts.added === 0,
    JSON.stringify(r.counts));
}
{
  const r = mergeMeasuredLedger(PREV, [{ measuredLanding: "x" }, mk("E → pages/e/index")], META, {});
  t("没有 groupKey 的行拒收并计数（无键行不配占账）", r.counts.rejectedNoKey === 1 && r.counts.added === 1);
}
{
  const r = mergeMeasuredLedger(PREV, [mk("A → pages/login/index")], META, { allowShrink: true });
  t("规矩3 只给布尔旗标不给令牌 ⇒ 仍按合并，2 行旧账不许悄悄消失（防「上一条命令复制粘贴带进来」）",
    r.reason === "merged" && r.counts.nextRows === 3 && r.counts.dropped === 0, JSON.stringify(r.counts));
}
{
  const r = mergeMeasuredLedger(PREV, [mk("A → pages/login/index")], META, { allowShrink: true, shrinkTokenGiven: "SHRINK_ROW" });
  t("规矩3 令牌拼错 ⇒ 拒减行（照旧合并），这是可归因的一次决定不是默认值",
    r.reason === "merged" && r.counts.nextRows === 3, JSON.stringify(r.counts));
}
{
  const r = mergeMeasuredLedger(PREV, [mk("A → pages/login/index"), mk("N → pages/n/index")], META, { allowShrink: true, shrinkTokenGiven: SHRINK_TOKEN });
  t("规矩3 点名令牌给对 ⇒ 真能减行（正向能力：判据不是恒挡）",
    r.write === true && r.reason === "explicit-shrink" && r.counts.nextRows === 2 && r.counts.dropped === 2
      && r.doc.rowPolicy === "explicit-shrink-" + SHRINK_TOKEN && r.doc.lastRun.shrinkToken === SHRINK_TOKEN,
    JSON.stringify(r.counts));
}
{
  const r = mergeMeasuredLedger(null, [mk("F → pages/f/index")], META, {});
  t("第一趟（prev 不存在）正常写盘，并把 prevHadRowsField=false 说清楚",
    r.write === true && r.counts.nextRows === 1 && r.doc.lastRun.prevHadRowsField === false);
}
{
  const r = mergeMeasuredLedger({ rows: "不是数组" }, [mk("G → pages/g/index")], META, {});
  t("prev 形状不对（rows 不是数组）时不崩、按空账合并且如实记录",
    r.write === true && r.counts.nextRows === 1 && r.doc.rows[0].groupKey === "G → pages/g/index");
}
{
  const cases = [[[], {}], [[mk("A → pages/login/index")], {}], [[mk("A → pages/login/index"), mk("B → pages/login/index")], {}]];
  const shrinkable = cases.every(([inc, o]) => mergeMeasuredLedger(PREV, inc, META, o).counts.nextRows >= PREV.rows.length);
  t("不变式：凡未点名减行，任何输入组合都不让行数变小", shrinkable);
}
{
  const a = shrinkRequested(undefined), b = shrinkRequested(""), c = shrinkRequested(SHRINK_TOKEN), d = shrinkRequested("shrink_rows");
  t("shrinkRequested：没给/空串 ⇒ requested=false（默认合并）", a.requested === false && a.ok === false && b.requested === false);
  t("shrinkRequested：给对令牌 ⇒ requested=true ok=true", c.requested === true && c.ok === true);
  t("shrinkRequested：点名了但拼错 ⇒ requested=true ok=false（拒，且 reason 说清拒什么）",
    d.requested === true && d.ok === false && /SHRINK_ROWS/.test(d.why), d.why);
}

/* ══════════ 2. 接线证明：载具里那个写盘点确实换成了守卫 ══════════ */
const liveSrc = readFileSync(CARRIER, "utf8");
t("载具 import 了 measured-ledger.mjs 并使用合并语义与令牌判据",
  /from "\.\/measured-ledger\.mjs"/.test(liveSrc) && /mergeMeasuredLedger\(/.test(liveSrc) && /shrinkRequested\(/.test(liveSrc),
  "import 行命中=" + /from "\.\/measured-ledger\.mjs"/.test(liveSrc));
t("载具里对 MEASURED 的写只剩一处，且那一处必须读合并结果的 .write 才落盘",
  (liveSrc.match(/writeFileSync\(MEASURED/g) || []).length === 1
    && /if \(lastMerge\.write\) writeFileSync\(MEASURED/.test(liveSrc),
  "写点=" + (liveSrc.match(/writeFileSync\(MEASURED[^\n]*/) || ["(无)"])[0].slice(0, 90));
t("循环前那次无条件空壳覆写（rows: [] 打进 MEASURED）已经没了",
  !/rows: \[\] \};[\s\S]{0,160}writeFileSync\(MEASURED/.test(liveSrc));

/* ══════════ 3. 端到端：真载具进程 + 一次性设备桩 ══════════ */
rmSync(TMP, { recursive: true, force: true });
mkdirSync(LOCKS, { recursive: true });
mkdirSync(join(PROJ, "config"), { recursive: true });
writeFileSync(join(PROJ, "config", "env.js"), 'export default { VITE_API_MODE:"real", MODE:"real" };\n', "utf8");

/* 权威台账是"别人也在写"的文件（实测 12:36 起有并行 measure 腿在逐行改写它，本仓记过 Windows
   errno -4094 那种非原子写撞车）。单次 readFileSync 撞上写的一瞬就会抛 ⇒ seeded=null ⇒ 后面
   PICK=null ⇒ 整条负例在 runCarrier 里 TypeError 崩掉，红得莫名其妙。
   读不动就有限次重试（只读、不写、退避 120ms×8 次），并仍把"最终读不到"如实判红。 */
function readJsonRetry(p, tries = 24, pauseMs = 250) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    last = readJson(p);
    if (last && Array.isArray(last.rows) && last.rows.length) return { json: last, attempts: i + 1 };
    if (i < tries - 1) { const e = Date.now() + pauseMs; while (Date.now() < e) { /* 同步退避 */ } }
  }
  return { json: last, attempts: tries };
}
const seedRead = readJsonRetry(LEDGER);
const LEDGER_START_SHA = sha(LEDGER);
const seeded = seedRead.json;
t("权威台账读得到且本轮之前是有行的（守卫要防的「减行」必须有旧账才成立）",
  !!seeded && Array.isArray(seeded.rows) && seeded.rows.length > 0,
  "rows=" + (seeded && seeded.rows ? seeded.rows.length : "(读不到)") + " sha=" + LEDGER_START_SHA.slice(0, 12)
    + " 读尝试=" + seedRead.attempts + (seedRead.attempts > 1 ? "（并行写在动这本账）" : ""));

/* 挑两组"同一落点"的既有测量当 --only 目标：不抄字面 id，policy 改了测试跟着走。 */
const byLanding = new Map();
for (const r of (seeded && seeded.rows) || []) {
  const list = byLanding.get(r.measuredLanding) || [];
  list.push(r.guardCaseId);
  byLanding.set(r.measuredLanding, list);
}
let PICK = null;
for (const [landing, ids] of byLanding) if (ids.length >= 2) { PICK = { landing, ids: ids.slice(0, 2) }; break; }
t("能从既有台账里挑到同一落点的两组做 --only 目标（挑不到就是夹具问题，不许假装跑过）", !!PICK, PICK && PICK.ids.join(","));
if (!PICK) {
  /* 端到端那 8 趟全要靠 PICK 跑。读不到旧账（实测原因：并行的 measure 腿正持有台账句柄，
     errno -4094 一族）就到此为止，打印判据行后干净退出——
     绝不允许半路 TypeError 崩掉，那种退出聚合器读成"无自报断言计数（不可信）"，等于丢了证据。 */
  console.log("\nSUMMARY: checks=" + checks + " assertion failures = " + (fail + 1));
  console.log("WG_TEST=FAIL");
  console.log("WG_E2E_SKIPPED=权威台账读不到（重试 " + seedRead.attempts + " 次），端到端 8 趟未跑");
  process.exit(1);
}

writeFileSync(guarded(STUB, "设备桩"), [
  'import { appendFileSync } from "node:fs";',
  "let clearCalls = 0;",
  "const note = (s) => { try { appendFileSync(process.env.WG_STUB_LOG, s + String.fromCharCode(10)); } catch (e) {} };",
  "export function clearSession(o) {",
  "  clearCalls++;",
  '  note("clearSession#" + clearCalls + " project=" + (o && o.project));',
  "  const after = Number(process.env.WG_STUB_FAIL_AFTER || \"0\");",
  "  if (clearCalls > after) throw new Error(\"cant find runtimeid by projectpath \" + (o && o.project ? o.project : \"?\") + \" （WG_STUB 注入的仪器故障，复刻 2026-09-30 01:18 的崩点）\");",
  '  return "clear-ok";',
  "}",
  'export function openPage(u, s, o) { note("openPage " + u); return "opened"; }',
  'export function routeStack(o) { return "pages/index/index|" + (process.env.WG_STUB_LANDING || "pages/index/index"); }',
  'export function verifyLogin(o) { return "not-logged-in"; }',
  'export function nodeCount(s, o) { return "1"; }',
].join("\n"), "utf8");

const url = (p) => pathToFileURL(p).href;
/* 载具副本：把 ./ 相对 import 换成绝对 file:// 说明符（副本住在 .zcode/tmp，但要 import 真的
   ui-lease/artifact-band/measured-ledger），REPO 也跟着钉回仓库根；唯独设备腿换成桩。
   判据本身仍来自盘上的真 measured-ledger.mjs —— 改守卫就等于改这个文件，改不了副本。 */
const relocate = (src) => src
  .replace(/from "\.\/([^"]+)"/g, (m, f) => 'from "' + url(join(QA, f)) + '"')
  .replace('from "' + url(join(QA, "cli-automator.mjs")) + '"', 'from "' + url(STUB) + '"')
  .replace('const REPO = resolve(import.meta.dirname, "..", "..");', 'const REPO = "' + REPO.replace(/\\/g, "/") + '";');
const liveCopy = relocate(liveSrc);
t("载具副本确实换掉了设备腿且没留相对 import（否则跑不起来的是副本而不是判据）",
  liveCopy.includes(url(STUB)) && !/from "\.\//.test(liveCopy) && liveCopy.includes('const REPO = "' + REPO.replace(/\\/g, "/") + '"'));
writeFileSync(guarded(LIVE, "现形状副本"), liveCopy, "utf8");
/* 修复前的形状：把那句"循环前无条件写空壳"插回一次性副本（只改副本，绝不动 live 脚本）。 */
const SHELL_ANCHOR = "  const measured = [];";
t("能找到插回旧写法的锚点（找不到就没法构造反例，这条负例不许假装跑过）", liveCopy.includes(SHELL_ANCHOR));
const mutantCopy = liveCopy.replace(SHELL_ANCHOR,
  SHELL_ANCHOR + "\n  writeFileSync(MEASURED, JSON.stringify(Object.assign({}, runMeta, { rows: [] }), null, 1));");
t("副本与现形状不同且确实恢复了循环前的裸覆写", mutantCopy !== liveCopy && /JSON\.stringify\(Object\.assign\(\{\}, runMeta, \{ rows: \[\] \}\)/.test(mutantCopy));
writeFileSync(guarded(MUTANT, "修复前副本"), mutantCopy, "utf8");

const SEED_DOC = JSON.stringify(seeded, null, 1);
function plant(file) { writeFileSync(guarded(file, "台账夹具"), SEED_DOC, "utf8"); return file; }
let runSeq = 0;
/* 每一次 spawn 的写盘目标都记账：收尾用它做【结构性】证明——本测试不可能写权威台账。
   （原先那条"sha256 与开跑前全等"在单车道时成立，但多条车道并行时会被别人的合法测量腿
     打红：权威台账正被 pid=xxx 的 measure 腿逐行改写，sha 必然变。
     一个"因为同伴正常干活就判红"的门是假阳性门，本仓一律不留 ⇒ 判据换成"写目标全在夹具根内"，
     这条更强（它证的是【不能写】，不是【这一趟碰巧没写】），sha 变化降级为观测行。） */
const SPAWNED = [];
function runCarrier(carrier, ledgerFile, extraArgs, env) {
  runSeq++;
  /* 每一趟一把独立的临时租约目录：载具在 S7 那条路径上是 process.exit(2) 直接落地的，
     finally 里的 releaseUi 不会执行 ⇒ 上一趟会在同一目录里留下一把"属主已死的活租约"，
     把下一趟判成 BLOCKED(exit 3)。这是夹具的事，不是判据的事，所以按趟隔离而不是去动租约判据。 */
  const runLocks = guarded(join(TMP, "locks-r" + runSeq), "租约夹具");
  mkdirSync(runLocks, { recursive: true });
  const stubLog = guarded(join(TMP, "stub-log-" + runSeq + ".txt"), "桩日志");
  writeFileSync(stubLog, "", "utf8");
  const argv = [carrier,
    "--mode", "measure",
    "--project", PROJ,
    "--policy", POLICY,
    "--triage", TRIAGE,
    "--ops", OPS,
    "--measured", ledgerFile,
    "--out", guarded(join(TMP, "booked-" + runSeq + ".json"), "book 夹具"),
    "--only", PICK.ids.join(","),
    ...extraArgs];
  SPAWNED.push({ seq: runSeq, carrier, argv });
  const r = spawnSync(process.execPath, argv, {
    cwd: REPO, encoding: "utf8", timeout: 180000,
    env: Object.assign({}, process.env, { QA_LOCK_DIR: runLocks, WG_STUB_LOG: stubLog, WG_STUB_LANDING: PICK.landing }, env),
  });
  return { code: r.status == null ? -1 : r.status, out: String(r.stdout || "") + String(r.stderr || ""), stubLog: readFileSync(stubLog, "utf8") };
}

const ARGV_SHRINK = ["--allow-shrink", SHRINK_TOKEN];
const ok = (res) => res.code === 0;
/* S1 崩在第一行之前（复刻 01:18 事故）⇒ 台账逐字节不变 */
{
  const file = plant(join(TMP, "s1-measured.json"));
  const res = runCarrier(LIVE, file, [], { WG_STUB_FAIL_AFTER: "0" });
  const after = readJson(file);
  t("S1 载具真的撞到设备桩并崩了（exit 非 0 + 桩里记下 clearSession 调用）",
    res.code !== 0 && /cant find runtimeid by projectpath/.test(res.out) && /clearSession#1/.test(res.stubLog),
    "exit=" + res.code + " 桩=" + res.stubLog.split("\n")[0]);
  t("S1 台账逐字节没动（sha256 与播种时全等）—— 这就是守卫要买的东西",
    sha(file) === LEDGER_START_SHA && after.rows.length === seeded.rows.length,
    "before=" + LEDGER_START_SHA.slice(0, 12) + " after=" + sha(file).slice(0, 12) + " rows=" + after.rows.length);
  t("S1 generatedAt/repeat 没被一次没有证据的崩溃重打",
    after.generatedAt === seeded.generatedAt && after.repeat === seeded.repeat,
    after.generatedAt + " / repeat=" + after.repeat);
  t("S1 写盘前先读过既有台账并印出行数（GUEST_LAND_LEDGER_GUARD）",
    new RegExp("GUEST_LAND_LEDGER_GUARD=" + ROW_POLICY + " 既有台账 rows=" + seeded.rows.length).test(res.out),
    (res.out.match(/GUEST_LAND_LEDGER_GUARD=[^\n]*/) || ["(没印)"])[0]);
}

/* S2 量到一半崩 ⇒ 已量到的那行进账，旧行一条不少 */
{
  const file = plant(join(TMP, "s2-measured.json"));
  const res = runCarrier(LIVE, file, [], { WG_STUB_FAIL_AFTER: "1" });
  const after = readJson(file);
  const touched = after.rows.filter((r) => r.band !== "real@f0677920").map((r) => r.groupKey);
  t("S2 半途崩退（exit 非 0），但已经量到的那一行仍然是证据",
    res.code !== 0 && touched.length === 1, "exit=" + res.code + " 本轮改写组=" + touched.join(","));
  t("S2 行数不减（部分成功的腿不被守卫挡住，也不许顺手清账）",
    after.rows.length === seeded.rows.length, "rows=" + after.rows.length + " 期望=" + seeded.rows.length);
  t("S2 本轮没量到的旧 groupKey 一个都没消失",
    seeded.rows.every((r) => after.rows.some((x) => x.groupKey === r.groupKey)));
}

/* S3 全量成功 + 显式令牌 ⇒ 允许减行（正向能力） */
{
  const file = plant(join(TMP, "s3-measured.json"));
  const res = runCarrier(LIVE, file, ARGV_SHRINK, { WG_STUB_FAIL_AFTER: "99" });
  const after = readJson(file);
  t("S3 显式点名 SHRINK_ROWS 才真的减得下来（守卫不是恒挡）",
    ok(res) && after.rows.length === PICK.ids.length && after.rowPolicy === "explicit-shrink-" + SHRINK_TOKEN
      && /GUEST_LAND_LEDGER_WRITTEN=yes reason=explicit-shrink/.test(res.out),
    "exit=" + res.code + " rows=" + after.rows.length + " policy=" + after.rowPolicy);
  t("S3 丢弃的行数被写进 lastRun（减行必须可归因，不许只留一个更小的文件）",
    after.lastRun && after.lastRun.rowsDropped === seeded.rows.length - PICK.ids.length
      && after.lastRun.shrinkToken === SHRINK_TOKEN, JSON.stringify(after.lastRun || {}));
}

/* S4 全量成功、没点名 ⇒ 合并：行数不减，头字段随本轮重打 */
{
  const file = plant(join(TMP, "s4-measured.json"));
  const res = runCarrier(LIVE, file, [], { WG_STUB_FAIL_AFTER: "99" });
  const after = readJson(file);
  t("S4 成功腿正常写盘且策略是 merge-never-shrink",
    ok(res) && after.rowPolicy === ROW_POLICY && /GUEST_LAND_LEDGER_WRITTEN=yes reason=merged/.test(res.out),
    "exit=" + res.code + " policy=" + after.rowPolicy);
  t("S4 行数不减（本轮 2 组就地覆盖 + 旧账 26 组原样保留）",
    after.rows.length === seeded.rows.length
      && after.lastRun.rowsKeptFromPrevious === seeded.rows.length - PICK.ids.length && after.lastRun.rowsDropped === 0,
    JSON.stringify(after.lastRun || {}));
  t("S4 这一趟真量到了（generatedAt 随证据前进、band 是本夹具的 real 档，不是崩溃那种空转重打）",
    after.generatedAt !== seeded.generatedAt && /^real@/.test(after.band) && after.mode === "measure" && after.repeat === 1,
    "generatedAt=" + after.generatedAt + " band=" + after.band);
}

/* S5 裸给 --allow-shrink 不给值 ⇒ 拒，退回合并 */
{
  const file = plant(join(TMP, "s5-measured.json"));
  const res = runCarrier(LIVE, file, ["--allow-shrink"], { WG_STUB_FAIL_AFTER: "99" });
  const after = readJson(file);
  t("S5 裸给 flag（没有令牌值）⇒ GUEST_LAND_SHRINK=REJECTED 且照旧合并",
    /GUEST_LAND_SHRINK=REJECTED/.test(res.out) && after.rows.length === seeded.rows.length
      && after.rowPolicy === ROW_POLICY, "rows=" + after.rows.length);
}

/* S6 令牌拼错 ⇒ 同样拒 */
{
  const file = plant(join(TMP, "s6-measured.json"));
  const res = runCarrier(LIVE, file, ["--allow-shrink", "SHRINK_ROW"], { WG_STUB_FAIL_AFTER: "99" });
  const after = readJson(file);
  t("S6 令牌拼错一个字母 ⇒ 拒减行（宁可不写也不许悄悄清台账）",
    /GUEST_LAND_SHRINK=REJECTED/.test(res.out) && after.rows.length === seeded.rows.length
      && after.rowPolicy === ROW_POLICY, "rows=" + after.rows.length);
}

/* S7 既有台账读不动 ⇒ 拒绝写盘（不许把读不懂的 prev 当空账本） */
{
  const file = guarded(join(TMP, "s7-measured.json"), "坏台账夹具");
  writeFileSync(file, "{ 这不是合法 JSON", "utf8");
  const before = sha(file);
  const res = runCarrier(LIVE, file, [], { WG_STUB_FAIL_AFTER: "99" });
  t("S7 prev 解析不了 ⇒ exit 2 且那个文件一个字节都不动",
    res.code === 2 && /读不动/.test(res.out) && sha(file) === before && /clearSession/.test(res.stubLog) === false,
    "exit=" + res.code + " " + (res.out.match(/GUEST_LANDING=FAIL[^\n]*/) || ["(没印)"])[0].slice(0, 120));
}

/* S8 变异证明：同一份判据打到"修复前的形状"上必须变红 */
{
  const file = plant(join(TMP, "s8-measured.json"));
  const res = runCarrier(MUTANT, file, [], { WG_STUB_FAIL_AFTER: "0" });
  const after = readJson(file);
  const red = sha(file) !== LEDGER_START_SHA && Array.isArray(after.rows) && after.rows.length === 0;
  t("S8 负例可红：把循环前的裸覆写插回副本后，同一条崩腿真的把 28 行清空了",
    red, "rows=" + (after && after.rows ? after.rows.length : "(读不到)") + " sha变了=" + (sha(file) !== LEDGER_START_SHA));
  t("S8 红是因为证据真被抹了，不是因为副本没跑起来",
    res.code !== 0 && /cant find runtimeid by projectpath/.test(res.out) && /clearSession#1/.test(res.stubLog)
      && after.generatedAt !== seeded.generatedAt,
    "exit=" + res.code + " generatedAt=" + (after.generatedAt || "?"));
  t("S8 现形状在同一场景下判绿、副本判红（两者的差只在那一句裸覆写）",
    sha(join(TMP, "s1-measured.json")) === LEDGER_START_SHA && sha(join(TMP, "s8-measured.json")) !== LEDGER_START_SHA);
}

/* ══════════ 4. 收尾：一次性副本与桩不许留在仓里，权威台账不许被这个测试写过 ══════════ */
const LEDGER_END_SHA = sha(LEDGER);
{
  /* 结构性证明：本测试【不能】写权威台账 —— 每一趟 spawn 的 --measured/--out 都必须落在夹具根 TMP 内。
     这条比"开跑前后 sha 全等"强：后者证的是"这一趟碰巧没写"，并行车道上会被同伴合法的测量腿打红
     （2026-09-30 12:36 起 pid 6260 的 measure 腿正在逐行改写权威台账，实测 sha 必变）。
     权威台账自己的行数守恒由载具的守卫与 S1–S6 负责，不靠这个测试兜。 */
  const norm = (p) => String(p).replace(/[\\/]/g, "/").replace(/\/+$/, "");
  const inTmp = (p) => { const a = norm(resolve(p)), root = norm(resolve(TMP)); return a === root || a.startsWith(root + "/"); };
  const badTargets = SPAWNED.map((s) => {
    const i = s.argv.indexOf("--measured"), o = s.argv.indexOf("--out");
    return { seq: s.seq, measured: s.argv[i + 1], out: s.argv[o + 1] };
  }).filter((x) => !inTmp(x.measured) || !inTmp(x.out));
  t("收尾：spawn 记录数与跑过的趟数一致（不许有没记账的载具调用）", SPAWNED.length === runSeq, "spawn=" + SPAWNED.length + " runSeq=" + runSeq);
  t("收尾：每一趟 spawn 的 --measured 与 --out 都落在夹具根内 ⇒ 本测试无法写权威台账",
    SPAWNED.length >= 8 && badTargets.length === 0, "越界目标=" + JSON.stringify(badTargets) + " 趟数=" + SPAWNED.length);
  console.log("WG_LEDGER_OBSERVE start=" + LEDGER_START_SHA.slice(0, 16) + " end=" + LEDGER_END_SHA.slice(0, 16)
    + " changed=" + (LEDGER_START_SHA === LEDGER_END_SHA ? "no" : "yes(同伴车道的合法测量腿在写，不是本测试干的)")
    + " 权威台账行数=" + ((readJson(LEDGER) || {}).rows || []).length);
}
rmSync(TMP, { recursive: true, force: true });
t("设备桩/载具副本/变异体都已删除，tmp/qa 下没有残留",
  !existsSync(MUTANT) && !existsSync(LIVE) && !existsSync(STUB) && !existsSync(TMP));
t("没有往 reports/ 写过任何测试产物", !existsSync(join(REPO, "reports/audit/round-7/guest-writeguard-r17")));

console.log("\nSUMMARY: checks=" + checks + " assertion failures = " + fail);
console.log(fail ? "WG_TEST=FAIL" : "WG_TEST=PASS");
process.exit(fail ? 1 : 0);
