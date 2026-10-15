/* 台账分类器 code 桶的「落地锚」判据 + 立行工具的「一行定义只有一份」守恒，两者的离线负样本。
   动机（本轮实测两条工具缺陷）：
     1) emit-open-items 的 code 桶只认处置格里的措辞（本轮落地|已落|修法|改法|结案条件），
        round-7 的 8 行 MP-R7QA-* 把落点写在状态证据格、处置格开头只写「载体：」⇒ 8 行落进
        UNCLASSIFIED。修法是把判据换成行级结构（file:line / path:数字 / scripts/…），
        但**UNCLASSIFIED 本身必须继续是红**：把"分类器没口径"洗成绿，比原来的红更糟。
     2) admit-ledger-row 的 before 用"剔掉分隔行的数据行"、after 用"含 | 就算一行"，
        分隔行只进 after ⇒ 180 行的表插一行后报「插入后主表行数 181 ≠ 180」，
        --apply 在权威台账上永久不可用（本仓已记过两次「分隔行被当数据行 ⇒ 分母 +1 幻影」）。
   所以这里两头都断言：该进 code 的进 code、不该洗白的仍然红、守恒两边同尺。
   离线：只用 os.tmpdir() 下的合成台账，绝不读也不写 reports/audit 里的真台账。
   用法：node scripts/qa/test-ledger-code-anchor.cjs */
"use strict";
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const REPO = path.resolve(__dirname, "..", "..");
const EMIT = path.join(REPO, "scripts", "qa", "emit-open-items.mjs");
const ADMIT = path.join(REPO, "scripts", "qa", "admit-ledger-row.mjs");
const NODE = process.execPath;

/* 与权威台账同一套 11 列表头：口径不一致时测的就不是真表 */
const HDR = "| 新号 | 历史别名 | 页面 | 类别 | severity | status | 置信 | 证据(file:line) | statusEvidence | 理想图依据 | 处置 |";
const SEP = "|" + Array.from({ length: 11 }, () => "---").join("|") + "|";
const cell = (v, d) => String(v === undefined || v === "" ? d : v);
const row = (id, o) => ["", id, cell(o.alias, "—"), cell(o.page, "pages/x/index"), cell(o.cat, "类别"), cell(o.sev, "P2"),
  cell(o.status), cell(o.conf, "0.9"), cell(o.evidence, "—"), cell(o.statusEvidence, "—"), cell(o.ideal, "无理想图依据"), cell(o.action, "—"), ""].join("|");

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail ? " :: " + String(detail).slice(0, 220) : "")); }
  else console.log("ok   " + name);
}

/* ---- emit-open-items：分母要 >=100（工具自己有"定位失败"守卫），所以垫 100 行非开放行 ---- */
const FILL = Array.from({ length: 100 }, (_, i) => row(`MP-R9FILL-PAD-${String(i).padStart(3, "0")}`, { status: "已修复（源码级判点：不在未结案口径内）" }));
const CASES = {
  /* 本轮真实形状：待修复 + 处置格开头「载体：」（旧措辞判据量不到）+ 落点只在状态证据格 */
  carrierOnlyInEvidence: ["MP-R9QA-CASE-CARRIER-001", row("MP-R9QA-CASE-CARRIER-001", {
    status: "待修复（工作树改动未进 HEAD）", action: "载体：改完提交后重跑覆盖门", statusEvidence: "闭案条件＝提交 scripts/qa/fake-carrier.mjs:156 的改动后复跑" })],
  /* 三种锚形状，各自单独成立（不是靠同一行里别的词蹭过去的） */
  anchorPathDigits: ["MP-R9QA-CASE-PATHDIGITS-001", row("MP-R9QA-CASE-PATHDIGITS-001", {
    status: "待修复", action: "载体：把两处默认值并到一个来源", evidence: "落点 stores/messages:587" })],
  anchorScriptsDir: ["MP-R9QA-CASE-SCRIPTSDIR-001", row("MP-R9QA-CASE-SCRIPTSDIR-001", {
    status: "待修复", action: "载体：补 scripts/qa/fake-bindings.json 的映射后重跑", evidence: "本行不给行号" })],
  /* 负样本：整行没有任何落点、也没有旧措辞 ⇒ 必须是 UNCLASSIFIED，且整门红 */
  noAnchor: ["MP-R9QA-CASE-NOANCHOR-001", row("MP-R9QA-CASE-NOANCHOR-001", {
    status: "待修复（离线负对照：这一行故意不给任何落点）", action: "待补：把弹层文案改成单一来源后复核两态差异",
    evidence: "本轮没有可用读数，欠一次判据设计", statusEvidence: "状态证据格同样不给位置" })],
  /* 既有的六桶不得被新判据抢走：同一批行都带 file:line 锚，桶必须不变 */
  backend: ["MP-R9QA-CASE-BACKEND-001", row("MP-R9QA-CASE-BACKEND-001", {
    status: "待修复（去向：needs_backend 先加字段）", action: "载体：改 apps/api/src/Fake.java:44 后前端再接", evidence: "契约见 services/generated/api-types.ts:708" })],
  reverify: ["MP-R9QA-CASE-REVERIFY-001", row("MP-R9QA-CASE-REVERIFY-001", {
    status: "已修复待复验", action: "复验：跑一次判据台，落点 src/fake.vue:12", evidence: "scripts/qa/fake.mjs:34" })],
  probe: ["MP-R9QA-CASE-PROBE-001", row("MP-R9QA-CASE-PROBE-001", {
    status: "待修复", action: "补腿：建 matching 探针，参考 src/pages/fake.vue:70", evidence: "tmp/qa/fake-probe.mjs:12" })],
  unverified: ["MP-R9QA-CASE-UNVERIFIED-001", row("MP-R9QA-CASE-UNVERIFIED-001", {
    status: "未取证", action: "补腿：一次带状态迁移的核对 src/pages/fake.vue:329", evidence: "reports/audit/fake.json:145" })],
  /* 旧措辞判据保留：只有「修法」没有一个锚的行，不得因为这次改动变成 UNCLASSIFIED（凭空多红） */
  legacyWording: ["MP-R9QA-CASE-LEGACYWORD-001", row("MP-R9QA-CASE-LEGACYWORD-001", {
    status: "待修复", action: "修法：把两处默认值并到一个来源（本轮不写文件位置）" })],
};

function runEmit(name, rowsIn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "openitems-"));
  /* 只清 os.tmpdir() 下自己刚造的目录：本仓记过 rmSync 误删产线的账，所以边界在动手之前一次核死
     （放在 finally 里 throw 会盖住被测工具自己的失败）。 */
  const safe = fs.realpathSync(dir);
  const TMP = fs.realpathSync(os.tmpdir());
  if (!safe.startsWith(TMP + path.sep)) throw new Error("拒绝删除非临时目录：" + safe);
  try {
    const ledger = ["# 合成台账", "", "## 一、本轮本尊行", HDR, SEP].concat(FILL, rowsIn).join("\n") + "\n";
    const file = path.join(dir, "issue-matrix.md");
    fs.writeFileSync(file, ledger, "utf8");
    const out = path.join(dir, "open-items.json");
    const r = spawnSync(NODE, [EMIT, "--ledger", file, "--out", out], { encoding: "utf8" });
    const so = (r.stdout || "") + (r.stderr || "");
    let parsed = null;
    try { parsed = JSON.parse(fs.readFileSync(out, "utf8")); } catch { /* 交给下面的断言报出来 */ }
    const by = {};
    if (parsed) for (const it of parsed.items) (by[it.bucket] = by[it.bucket] || []).push(it.id);
    return { exit: r.status, so, parsed, by, dirKept: dir };
  } finally {
    fs.rmSync(safe, { recursive: true, force: true });
  }
}

/* 1) 正样本：「载体：」＋落点在状态证据格 ⇒ code，并且整门绿（本轮 8 行的形状） */
{
  const r = runEmit("carrier", [CASES.carrierOnlyInEvidence[1], CASES.anchorPathDigits[1], CASES.anchorScriptsDir[1]]);
  t("carrier: OPEN_ITEMS_RESULT=OK 且 exit=0", r.exit === 0 && /OPEN_ITEMS_RESULT=OK/.test(r.so), `exit=${r.exit} ${r.so.split("\n").filter((l) => /OPEN_ITEMS|✗/.test(l)).slice(0, 2).join(" ⏎ ")}`);
  t("carrier: 载体只在处置格、锚在状态证据格 → code", (r.by.code || []).includes("MP-R9QA-CASE-CARRIER-001"), JSON.stringify(r.by));
  t("carrier: path:数字 锚 → code", (r.by.code || []).includes("MP-R9QA-CASE-PATHDIGITS-001"), JSON.stringify(r.by));
  t("carrier: scripts/… 锚（无行号）→ code", (r.by.code || []).includes("MP-R9QA-CASE-SCRIPTSDIR-001"), JSON.stringify(r.by));
  t("carrier: UNCLASSIFIED 计数为 0", !r.by.UNCLASSIFIED, JSON.stringify(r.by));
}
/* 2) 负样本：无锚的待修复行仍须 UNCLASSIFIED，且门红、exit≠0 —— 修复不得把 UNCLASSIFIED 洗白 */
{
  const r = runEmit("noanchor", [CASES.noAnchor[1]]);
  t("noanchor: 该行落进 UNCLASSIFIED", (r.by.UNCLASSIFIED || []).includes("MP-R9QA-CASE-NOANCHOR-001"), JSON.stringify(r.by));
  t("noanchor: 没有偷偷落进 code", !(r.by.code || []).includes("MP-R9QA-CASE-NOANCHOR-001"), JSON.stringify(r.by));
  t("noanchor: OPEN_ITEMS_RESULT=FAIL 且 exit=2", r.exit === 2 && /OPEN_ITEMS_RESULT=FAIL/.test(r.so), `exit=${r.exit}`);
  t("noanchor: 未结案计数把这一行算在内（没被丢弃）", r.parsed && r.parsed.open === 1, "open=" + (r.parsed && r.parsed.open));
}
/* 3) 既有桶字节口径不动：带锚的行也不许被 code 抢走（判据排在六桶之后） */
{
  const r = runEmit("buckets", [CASES.backend[1], CASES.reverify[1], CASES.probe[1], CASES.unverified[1], CASES.legacyWording[1]]);
  t("buckets: needs_backend 仍 backend（锚不抢桶）", (r.by.backend || []).includes("MP-R9QA-CASE-BACKEND-001"), JSON.stringify(r.by));
  t("buckets: 已修复待复验 仍 reverify", (r.by.reverify || []).includes("MP-R9QA-CASE-REVERIFY-001"), JSON.stringify(r.by));
  t("buckets: 探针行仍 probe", (r.by.probe || []).includes("MP-R9QA-CASE-PROBE-001"), JSON.stringify(r.by));
  t("buckets: 裸未取证仍 unverified", (r.by.unverified || []).includes("MP-R9QA-CASE-UNVERIFIED-001"), JSON.stringify(r.by));
  t("buckets: 只有旧措辞「修法」仍 code（不新增红）", (r.by.code || []).includes("MP-R9QA-CASE-LEGACYWORD-001"), JSON.stringify(r.by));
  t("buckets: 守恒（桶合计=未结案）", r.parsed && Object.values(r.by).reduce((a, v) => a + v.length, 0) === r.parsed.open, "open=" + (r.parsed && r.parsed.open));
}

/* ---- admit-ledger-row：before/after 共用同一个"一行"定义 ---- */
const SYNTH_ID = "MP-R9QA-SELFTEST-CODEANCHOR-001";
const synthRow = row(SYNTH_ID, { status: "待修复（离线自测合成行）", action: "载体：改 scripts/qa/fake-carrier.mjs:49 后复跑", evidence: "落点 src/fake.vue:12" });
/* 第二把尺子（写给测试自己的，不复用工具里的 isDataRow）：表头行以下、连续以 | 开头的区间里，
   剔掉 |---| 分隔行之后剩下的才是数据行。首版我漏剔了表头自己，把 3 数成 4 ——
   这正是本工具那个 bug 的同一种错，测试里再犯一次就说不了事。 */
const SEP_RE = /^\|[\s|:-]*\|?$/;
function recount(md) {
  const ls = md.split(/\r?\n/);
  const h = ls.findIndex((l) => l.startsWith("| 新号 | 历史别名 |"));
  let e = h + 1;
  while (e < ls.length && ls[e].startsWith("|")) e++;
  const region = ls.slice(h + 1, e);
  return { data: region.filter((l) => !(SEP_RE.test(l) && /---/.test(l))).length, raw: region.length, sep: region.filter((l) => SEP_RE.test(l) && /---/.test(l)).length };
}

function runAdmit(rowsIn, rowText, apply) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "admitledger-"));
  const safe = fs.realpathSync(dir);
  const TMP = fs.realpathSync(os.tmpdir());
  if (!safe.startsWith(TMP + path.sep)) throw new Error("拒绝删除非临时目录：" + safe);
  try {
    const file = path.join(dir, "issue-matrix.md");
    fs.writeFileSync(file, ["# 合成台账", "", "## 一、本轮本尊行", HDR, SEP].concat(rowsIn).join("\n") + "\n", "utf8");
    const rf = path.join(dir, "row.txt");
    fs.writeFileSync(rf, rowText + "\n", "utf8");
    const before = fs.readFileSync(file, "utf8");
    const argv = [ADMIT, "--row", rf, "--ledger", file].concat(apply ? ["--apply"] : []);
    const r = spawnSync(NODE, argv, { encoding: "utf8" });
    const so = (r.stdout || "") + (r.stderr || "");
    const after = fs.readFileSync(file, "utf8");
    const m = so.match(/主表行数 (\d+) → (\d+)/);
    const rc = recount(after);
    return { exit: r.status, so, reported: m ? [Number(m[1]), Number(m[2])] : null, wrote: after !== before,
      recountData: rc.data, recountRaw: rc.raw, recountSep: rc.sep, dir };
  } finally {
    fs.rmSync(safe, { recursive: true, force: true });
  }
}
/* 4) 正样本：--apply 必须能成功，且报出来的行数与独立复点相等（分隔行只算一次） */
{
  const base = [row("MP-R9FILL-A-001", { status: "已修复（源码级判点）" }), row("MP-R9FILL-B-002", { status: "待复验" })];
  const r = runAdmit(base, synthRow, true);
  t("apply: exit=0 且 ADMIT_RESULT=OK", r.exit === 0 && /ADMIT_RESULT=OK/.test(r.so), `exit=${r.exit} ${r.so.split("\n").filter((l) => /ADMIT|✗/.test(l)).slice(0, 2).join(" ⏎ ")}`);
  t("apply: 报数 2 → 3（不是旧版的 3 → 4 幻影）", r.reported && r.reported[0] === 2 && r.reported[1] === 3, JSON.stringify(r.reported) + " " + r.so.split("\n")[0]);
  t("apply: 独立复点数据行=3（与报数一致）", r.recountData === 3, "recount=" + r.recountData);
  t("apply: 表格区总行数=4（含 1 枚分隔行 ⇒ 旧 after 正是把它数进去才差一）", r.recountRaw === 4, "raw=" + r.recountRaw);
  t("apply: 区间里恰有 1 枚 |---| 分隔行（幻影行的来源，只许数一次）", r.recountSep === 1, "sep=" + r.recountSep);
  t("apply: 新号确实落到盘上", r.so.includes(SYNTH_ID) && /ADMIT_RESULT=OK/.test(r.so), r.so.slice(0, 200));
}
/* 5) 负样本：重复 ID / 词表外 status ⇒ 拒绝且一个字都不改 */
{
  const base = [synthRow, row("MP-R9FILL-C-003", { status: "已修复（源码级判点）" })];
  const dup = runAdmit(base, synthRow, true);
  t("dup: 撞号被拒（exit=2）", dup.exit === 2 && /ID 撞号/.test(dup.so), `exit=${dup.exit}`);
  t("dup: 拒绝后台账未落盘（字节不变）", dup.wrote === false, "wrote=" + dup.wrote);
  t("dup: 独立复点仍是 2 行（没有偷偷插进去）", dup.recountData === 2, "recount=" + dup.recountData);
  const bad = runAdmit(base, row("MP-R9QA-SELFTEST-BADSTATUS-001", { status: "已结案（不在受控词表）", action: "载体：scripts/qa/fake.mjs:1" }), true);
  t("vocab: 词表外 status 被拒", bad.exit === 2 && /不在受控词表/.test(bad.so), `exit=${bad.exit}`);
  t("vocab: 拒绝后台账未落盘", bad.wrote === false && bad.recountData === 2, "wrote=" + bad.wrote + " recount=" + bad.recountData);
}

console.log(`OIKA_SUMMARY checks=${checks} fail=${fails}`);
console.log(`OIKA_TEST=${fails ? "FAIL" : "PASS"}`);
process.exit(fails ? 1 : 0);
