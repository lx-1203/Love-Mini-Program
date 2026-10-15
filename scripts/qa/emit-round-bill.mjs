#!/usr/bin/env node
/**
 * 本轮「还欠什么」两件输入的生产者：缺口账单（--gapbill）+ 未结行归置（--openrows）。
 *
 * 为什么存在（实测）：
 *   scripts/qa/gen-round8-report.mjs 收 --gapbill(:68) 与 --openrows(:71)，不给就老实印
 *   「**（未跑，故此处不留结论。）**」(:258, :284, :296)。而 `grep -rn gapbill scripts/` 只命中消费方自己
 *   ⇒ 本轮（v3.8）没有任何生产者，§1/§4 永远填不上；盘上只有上一程 v3.3（2026-09）的
 *   reports/audit/round-7/gapbill-v33.json 与 openrows-blockers-v33.json —— 拿九月的账单当本轮现状，
 *   比印「未跑」更坏。消费方真正读的字段（逐字对齐，不是猜的形状）：
 *     §1  ← gap.gates[].{name,exitCode}(:277-278)、gap.red(:277)、gap.head(:279-281)、gap.dirty(:281)
 *     §4  ← open.openRowCount(:292)、open.landableNow(:292)、open.blockers(:293，可选)
 *
 * 【硬口径：一个数都不许手填】账单里每个计数都带 {path, value, source, via, line} 出处，写盘后
 *   **从盘上重读**、用 via 把 value 从 line 里再导一遍并比对（--check 可独立复跑这一步）。
 *   测得到：事后手改账单里的任何一个计数（计数与它自己声明的证据行不再一致 ⇒ exit 1）。
 *   测不到：把证据行与计数一起伪造（那等于重写整件；靠 sourceFingerprints 里的源件 sha 与重跑生产者抓）。
 *
 * 取数源（全部现跑/现读；任一读不到 ⇒ exit 2 点名，绝不写带洞的账单）：
 *   1) scripts/qa/verify-real-coverage.mjs --dir <本轮腿目录> [--ops <ops>]
 *      REALCOV_CASES/AUTOMATABLE_EXEMPT/COVERED/UNCOVERED/VOIDED/EXPIRED + BAND_STAMP + 守恒行 + 逐条点名键。
 *   2) scripts/qa/verify-real-coverage-disposition.mjs
 *      RCD_REGISTER=<路径>（**注册表路径从门的 stdout 现读，不写死**）+ RCD_CHECK 各计数；
 *      再读该 JSON 的 dispositions[] 按词表分桶 ⇒ landableNow 里的 DISPATCHABLE_NOW 是量出来的。
 *   3) scripts/qa/emit-open-items.mjs —— **只读它的 JSON，一个字不改它**（另一条车道正在修它的分类器）；
 *      它的 --out 缺省是上一程的 round-7/open-items.json ⇒ 本脚本一律显式指到 .zcode/tmp/ 侧车。
 *      UNCLASSIFIED 桶原样透传，不藏。
 *   4) 本轮裁定册的 PENDING_RULINGS_BEGIN/END 具名机器名册：有则数 `RULING id=` 行并与尾部自述对账；
 *      **没有就如实报「不可得」，绝不数 `## ` 标题**（标题分类器把本轮 30 条待裁报成 10，是别的车道量到的盲区）。
 *   5) git rev-parse / status --porcelain ⇒ §1 的 HEAD 与工作树脏数。
 *   6) reports/audit/round-7/incident-destinations-round10.json 只作对照：其头注 $archived=true，
 *      2026-10-06 裁定（T7 / r10new#A）指定 real-coverage-disposition.json 为唯一真值源 ⇒ 账单以真值源派生，
 *      引用归档件时逐字标注 archived。
 *
 * 用法（Node 22：D:/codex-tools/node-v22.17.0-win-x64/node.exe；PATH 上的 node 是 v16 会崩）：
 *   node22 scripts/qa/emit-round-bill.mjs --closure reports/audit/ui-audit-2026-10-16 --tag v38 \
 *     --ledger reports/audit/ui-audit-2026-10-16/decisions-v38.md --dir reports/audit/round-7 \
 *     --ops reports/audit/round-6/ops
 *   node22 scripts/qa/emit-round-bill.mjs --check <gapbill.json> <openrows.json>
 * 退出码：0 两件写盘且自证回收全对（ROUNDBILL_RESULT=PASS）
 *         1 不变量破了（守恒对不上 / 回收与盘上不符 / 名册出现词表外状态）
 *         2 **有一个源读不到**（起不来、stdout 缺机器行、输入件缺失或解析不了、git 不可用）⇒ 不写盘。
 * 只读边界：不取 UI 租约、不连设备、不起停服务、不重建产物带、不写 reports/audit/round-7/**。
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, dirname, relative, basename } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
const has = (n) => argv.indexOf("--" + n) >= 0;
const P = (p) => (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(p) ? p : join(REPO, p));
const rel = (p) => relative(REPO, P(p)).split("\\").join("/");
const shaOf = (p) => createHash("sha256").update(readFileSync(P(p))).digest("hex").slice(0, 12);
const die2 = (w) => { console.log("ROUNDBILL_RESULT=FAIL exit=2 " + w); process.exit(2); };
const die1 = (w) => { console.log("ROUNDBILL_RESULT=FAIL exit=1 " + w); process.exit(1); };

/* ── 旗标一律无缺省落点（家规同 gen-round8-report.mjs:59-61：带缺省的落点就是"盖掉别轮交付件"那个病）── */
const CLOSURE = flag("closure"), TAG = flag("tag"), LEDGER = flag("ledger"), COV_DIR = flag("dir"), COV_OPS = flag("ops");
const CHECK_MODE = has("check");
if (!CHECK_MODE && (!CLOSURE || !TAG || !LEDGER || !COV_DIR)) {
  die2("缺必填旗标：--closure <本轮收口目录> --tag <vNN> --ledger <本轮裁定册> --dir <本轮腿目录> 四个都必须显式给（无缺省；缺省会把账单写进别的轮次目录）。只回收不重跑门请用 --check <gapbill> <openrows>");
}
const GAPBILL_PATH = join(P(CLOSURE || "."), `gapbill-${TAG || "check"}.json`);
const OPENROWS_PATH = join(P(CLOSURE || "."), `openrows-blockers-${TAG || "check"}.json`);
const OPENITEMS_OUT = flag("openitems-out") || join(REPO, ".zcode", "tmp", "round-bill", `open-items-${TAG || "check"}.json`);

/* ── 出处台账：两份件各自一份，审计时绝不串件（串件会把"字段不存在"读成不一致）── */
const PROV = { gap: [], open: [] };
const RKEYS = ["NEEDS_CAPABILITY", "NEEDS_BAND_CHANGE", "NEEDS_IDENTITY_IMPOSSIBLE", "DISPATCHABLE_NOW", "NOT_SHOOTABLE"];

function reDerive(rec) {
  try {
    if (rec.kind === "regex") {
      const m = new RegExp(rec.via, "m").exec(rec.line);
      if (!m) return { ok: false, why: "证据行里再匹配不到该机器行" };
      const raw = m[rec.group ?? 1];
      if (raw === undefined) return { ok: false, why: "捕获组缺失" };
      return { ok: true, value: /^-?\d+$/.test(String(raw).trim()) ? Number(String(raw).trim()) : raw };
    }
    if (rec.kind === "tokenCount") return { ok: true, value: rec.line.split(rec.sep || ";").filter((t) => t.trim() === rec.token).length };
    /* kv：从 "键=值;键=值" 的清单里取那一个键的值（分桶计数用它，别把"出现一次"当成"等于一"）。 */
    if (rec.kind === "kv") {
      const hit = rec.line.split(rec.sep || ";").map((t) => t.split("=")).filter((p) => String(p[0]).trim() === rec.key);
      if (hit.length !== 1) return { ok: false, why: `键 ${rec.key} 在清单里出现 ${hit.length} 次（应为 1 次）` };
      const v = Number(String(hit[0][1]).trim());
      return Number.isFinite(v) ? { ok: true, value: v } : { ok: false, why: "键的值不是整数：" + hit[0][1] };
    }
    if (rec.kind === "notTokenCount") return { ok: true, value: rec.line.split(rec.sep || ";").filter((t) => Number(t) !== 0).length };
    if (rec.kind === "lineCount") return { ok: true, value: (rec.line.match(new RegExp(rec.via, "gm")) || []).length };
    if (rec.kind === "sum") {
      const nums = rec.line.split(rec.sep || "+").map((s) => Number(String(s).trim()));
      if (nums.some((n) => !Number.isFinite(n))) return { ok: false, why: "求和项里有非数：" + rec.line };
      return { ok: true, value: nums.reduce((a, b) => a + b, 0) };
    }
    if (rec.kind === "constant") return { ok: true, value: rec.value };
    return { ok: false, why: "未知回收方式 kind=" + rec.kind };
  } catch (e) { return { ok: false, why: "回收异常 " + (e && e.message) }; }
}
/* attester：kind=regex 时用 via 抓 line；其它 kind 直接把 via 当说明文字存下来。 */
function att(which, path, value, source, via, line, extra) {
  const rec = Object.assign({ path, value, source, via, line: line === undefined ? "" : String(line) }, extra || {}, { kind: (extra && extra.kind) || "regex" });
  PROV[which].push(rec);
  console.log(`ROUNDBILL_DERIVED [${which}] ${path}=${value} via=${rec.kind === "regex" ? via : rec.kind} source=${source}`);
  return value;
}
const getPath = (obj, path) => path.split(".").reduce((o, k) => {
  const m = /^([^[]+)(?:\[(\d+)\])?$/.exec(k);
  if (!m) return undefined;
  o = o == null ? undefined : o[m[1]];
  return m[2] === undefined ? o : (o == null ? undefined : o[Number(m[2])]);
}, obj);
/* 账单里的每个数值叶子都必须有出处；captured.* 与 rows[]（逐字搬运自源件，其出处=源件 sha）与
   provenance[]（它就是出处台账本身，里面每个 value 都要被回收，不能被当成"没出数的计数"）除外。 */
const PASS_THROUGH = [/^captured\./, /^rows\[/, /^provenance\[/];
function numericLeaves(obj, prefix, out) {
  out = out || [];
  if (obj === null || obj === undefined) return out;
  if (typeof obj === "number") { out.push(prefix); return out; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => numericLeaves(v, `${prefix}[${i}]`, out)); return out; }
  if (typeof obj === "object") for (const k of Object.keys(obj)) numericLeaves(obj[k], prefix ? `${prefix}.${k}` : k, out);
  return out;
}
function audit(which, name, obj) {
  const problems = [];
  const list = PROV[which];
  const attested = new Set();
  for (const rec of list) {
    attested.add(rec.path);
    const cur = getPath(obj, rec.path);
    if (cur === undefined) { problems.push(`${name}: 出处声明指向不存在的字段 ${rec.path}`); continue; }
    const back = reDerive(rec);
    if (!back.ok) { problems.push(`${name}: ${rec.path} 无法回收（${back.why}）｜源=${rec.source}`); continue; }
    if (String(back.value) !== String(cur)) {
      problems.push(`${name}: ${rec.path} 盘上=${cur} 但从其自带证据重算=${back.value} ⇒ 该计数被手改过（源=${rec.source}｜证据行=${String(rec.line).slice(0, 140)}）`);
    }
  }
  const orphan = numericLeaves(obj, "").filter((p) => !PASS_THROUGH.some((re) => re.test(p)) && !attested.has(p));
  if (orphan.length) problems.push(`${name}: ${orphan.length} 个计数没有出处声明（= 手填数的形状）：${orphan.slice(0, 15).join(", ")}`);
  return problems;
}

/* ── 现跑一个源一次：stdout + 退出码同发取（不重复跑门，那条门一轮要几十秒）── */
function spawnOnce(label, script, args, requiredRe, timeoutMs) {
  let out = "", status = 0;
  try { out = execFileSync(process.execPath, [join(REPO, script), ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: timeoutMs || 600000 }); }
  catch (e) {
    if (e && e.code === "ENOENT") die2(`源读不到（解释器不可用）：${label} err=${e && e.message}`);
    if (e && !Number.isInteger(e.status) && !e.stdout) die2(`源起不来：${label} err=${e && (e.message || e)}`);
    out = (e && e.stdout ? String(e.stdout) : "") + (e && e.stderr ? String(e.stderr) : "");
    status = Number.isInteger(e && e.status) ? e.status : die2(`源无退出码：${label}（崩溃而没有 status ⇒ 读数不可信，账单拒绝产出）`);
  }
  const missing = (requiredRe || []).filter((re) => !re.test(out));
  if (missing.length) die2(`源读数不完整：${label}（exit=${status}）的 stdout 里找不到机器行 ${missing.map((r) => r.source).join(" | ")} ⇒ 宁可不写账单，也不写带洞的账单`);
  return {
    out, status, label,
    line: (re) => (out.split(/\r?\n/).find((l) => re.test(l)) || ""),
    num: (re) => Number((re.exec(out) || [])[1]),
    lines: (re) => out.split(/\r?\n/).filter((l) => re.test(l)),
  };
}

/* ============================ --check：不重跑门，只用件自带出处回收 ============================ */
if (has("check")) {
  const a = argv[argv.indexOf("--check") + 1], b = argv[argv.indexOf("--check") + 2];
  if (!a || !b) die2("--check 需要两个路径：<gapbill.json> <openrows.json>");
  let gap, open;
  try { gap = JSON.parse(readFileSync(P(a), "utf8")); } catch (e) { die2(`check 读不到 gapbill ${rel(a)}：${e && e.code}`); }
  try { open = JSON.parse(readFileSync(P(b), "utf8")); } catch (e) { die2(`check 读不到 openrows ${rel(b)}：${e && e.code}`); }
  if (!Array.isArray(gap.provenance) || !Array.isArray(open.provenance)) die2(`check 拒绝：件里没有 provenance[]（没有出处的账单不值得回收）`);
  PROV.gap = gap.provenance; PROV.open = open.provenance;
  const problems = [...audit("gap", rel(a), gap), ...audit("open", rel(b), open)];
  for (const p of problems) console.log("  ✗ " + p);
  console.log(`ROUNDBILL_CHECK gapbill=${rel(a)} openrows=${rel(b)} provenance=${PROV.gap.length}+${PROV.open.length} problems=${problems.length}`);
  console.log(`ROUNDBILL_RESULT=${problems.length ? "FAIL" : "PASS"} exit=${problems.length ? 1 : 0} mode=check（只把每件自带的出处重算一遍并与盘上比对，不重跑门）`);
  process.exit(problems.length ? 1 : 0);
}

/* ============================ 1) 覆盖门 ============================ */
const COV = "scripts/qa/verify-real-coverage.mjs";
const covArgs = ["--dir", COV_DIR].concat(COV_OPS ? ["--ops", COV_OPS] : []);
const RE = {
  cases: /^REALCOV_CASES=(\d+)/m, covered: /^REALCOV_COVERED=(\d+)/m, uncov: /^REALCOV_UNCOVERED=(\d+)/m,
  voided: /^REALCOV_VOIDED=(\d+)/m, expired: /^REALCOV_EXPIRED=(\d+)/m,
  exempt: /^REALCOV_AUTOMATABLE_EXEMPT=(\d+)/m, stamp: /^REALCOV_BAND_STAMP=(\S+)/m,
  cons: /^REALCOV_CONSERVATION=(\S+) 免检=(\d+) \+ 覆盖=(\d+) \+ 欠账=(\d+) \+ 待判=(\d+) \+ 过期=(\d+) = (\d+)／(\d+)/m,
  list: /^REALCOV_UNCOVERED_LIST=(\d+)/m,
  result: /^REALCOV_RESULT=(\w+)/m,
};
const cov = spawnOnce(`node ${COV} ${covArgs.join(" ")}`, COV, covArgs,
  [RE.cases, RE.covered, RE.uncov, RE.voided, RE.expired, RE.exempt, RE.stamp, RE.cons, RE.list, RE.result]);
const covSrc = `现跑 ${COV} ${covArgs.join(" ")}`;
const cons = RE.cons.exec(cov.out);
const V = {
  cases: cov.num(RE.cases), exempt: cov.num(RE.exempt), covered: cov.num(RE.covered),
  uncovered: cov.num(RE.uncov), voided: cov.num(RE.voided), expired: cov.num(RE.expired), list: cov.num(RE.list),
};
const terms = [+cons[2], +cons[3], +cons[4], +cons[5], +cons[6]];
const sum = terms.reduce((a, b) => a + b, 0);
const consOwn = { exempt: V.exempt, covered: V.covered, uncovered: V.uncovered, voided: V.voided, expired: V.expired };
const consField = { exempt: terms[0], covered: terms[1], uncovered: terms[2], voided: terms[3], expired: terms[4] };
for (const k of Object.keys(consOwn)) if (consOwn[k] !== consField[k]) die1(`覆盖门守恒破了：${k} 具名机器行=${consOwn[k]} 而守恒行里是 ${consField[k]} ⇒ 上游读数自相矛盾，账单拒绝产出`);
if (+cons[7] !== sum || +cons[8] !== sum || sum !== V.cases) die1(`覆盖门守恒算不平：守恒行「${cons[0].slice(0, 80)}」重算合计=${sum} vs 总用例=${V.cases}`);
if (V.list !== V.uncovered) die1(`覆盖门点名数 REALCOV_UNCOVERED_LIST=${V.list} ≠ REALCOV_UNCOVERED=${V.uncovered}`);
const uncKeys = [...cov.out.matchAll(/^  UNCOVERED (\S*\|\S*) 缺=/gm)].map((m) => m[1]);
const voidKeys = [...cov.out.matchAll(/^  VOIDED (\S*\|\S*)/gm)].map((m) => m[1]);
const expKeys = [...cov.out.matchAll(/^  EXPIRED (\S*\|\S*)/gm)].map((m) => m[1]);
if (uncKeys.length !== V.uncovered || voidKeys.length !== V.voided || expKeys.length !== V.expired) {
  die1(`覆盖门点名与计数不符：UNCOVERED ${uncKeys.length}/${V.uncovered} VOIDED ${voidKeys.length}/${V.voided} EXPIRED ${expKeys.length}/${V.expired} ⇒ "数出来却没逐条点名"的形状不进账单`);
}
const axesOf = (k) => { const m = new RegExp("^  UNCOVERED " + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " 缺=(\\S+)", "m").exec(cov.out); return m ? m[1] : ""; };
const bandStamp = (RE.stamp.exec(cov.out) || [])[1] || "";
att("gap", "realCoverage.cases", V.cases, covSrc, RE.cases.source, cov.line(RE.cases));
att("gap", "realCoverage.exempt", V.exempt, covSrc, RE.exempt.source, cov.line(RE.exempt));
att("gap", "realCoverage.covered", V.covered, covSrc, RE.covered.source, cov.line(RE.covered));
att("gap", "realCoverage.uncovered", V.uncovered, covSrc, RE.uncov.source, cov.line(RE.uncov));
att("gap", "realCoverage.voided", V.voided, covSrc, RE.voided.source, cov.line(RE.voided));
att("gap", "realCoverage.expired", V.expired, covSrc, RE.expired.source, cov.line(RE.expired));
att("gap", "realCoverage.uncoveredNamedCount", uncKeys.length, covSrc, "^  UNCOVERED \\S*\\|\\S* 缺=", cov.lines(/^  UNCOVERED \S*\|\S* 缺=/).join("\n"), { kind: "lineCount" });
att("gap", "realCoverage.voidedNamedCount", voidKeys.length, covSrc, "^  VOIDED \\S*\\|\\S*", cov.lines(/^  VOIDED \S*\|\S*/).join("\n"), { kind: "lineCount" });
att("gap", "realCoverage.expiredNamedCount", expKeys.length, covSrc, "^  EXPIRED \\S*\\|\\S*", cov.lines(/^  EXPIRED \S*\|\S*/).join("\n"), { kind: "lineCount" });
att("gap", "realCoverage.conservation.exempt", terms[0], covSrc, "免检=(\\d+)", cons[0]);
att("gap", "realCoverage.conservation.covered", terms[1], covSrc, "覆盖=(\\d+)", cons[0]);
att("gap", "realCoverage.conservation.uncovered", terms[2], covSrc, "欠账=(\\d+)", cons[0]);
att("gap", "realCoverage.conservation.voided", terms[3], covSrc, "待判=(\\d+)", cons[0]);
att("gap", "realCoverage.conservation.expired", terms[4], covSrc, "过期=(\\d+)", cons[0]);
att("gap", "realCoverage.conservation.total", +cons[7], covSrc, "= (\\d+)／\\d+", cons[0]);
att("gap", "realCoverage.conservation.recomputedSum", sum, "上面五个守恒项之和（本脚本现算）", "+", terms.join("+"), { kind: "sum" });

/* ============================ 2) 去向册门 + 真值源注册表 ============================ */
const RCD = "scripts/qa/verify-real-coverage-disposition.mjs";
/* 那把门只认 register|gate|round|gate-out|alt-register 五枚旗标（未知旗标它自己 exit 2，
   实测：给它 --dir/--ops ⇒ "RCD_RESULT=FAIL reason=未知旗标"）。它的 --round 与覆盖门的
   --dir 是同一把尺的两面：verify-real-coverage.mjs:115 `DIR = arg("dir","reports/audit/"+arg("round","round-7"))`
   ⇒ 本轮 --dir 的**基名**就是它该吃的 --round，从盘上路径派生，不另写一个轮次名。 */
const rcdRound = basename(P(COV_DIR));
if (!/^round-\d+[A-Za-z]*$/.test(rcdRound)) die2(`旗标打架：--dir ${COV_DIR} 的基名「${rcdRound}」不像 round-N ⇒ 无法派生 ${RCD} 的 --round（硬猜就会拿别的轮次的去向册当本轮账）`);
const rcdArgs = ["--round", rcdRound];
const RE_REG = /^RCD_REGISTER=(\S+)\s+条目=(\d+)/m, RE_CHK = /^RCD_CHECK 门欠账=(\d+) 有去向=(\d+) 无去向=(\d+) 册外词=(\d+) 空条目=(\d+) 重复键=(\d+) 陈旧=(\d+)/m,
  RE_RES = /^RCD_RESULT=(PASS|FAIL)/m, RE_GATE = /^RCD_GATE .*?UNCOVERED=(\d+) COVERED=(\d+) EXEMPT=(\d+).*RESULT=(\w+) exit=(-?\d+)/m;
const rcd = spawnOnce(`node ${RCD} ${rcdArgs.join(" ")}`, RCD, rcdArgs, [RE_REG, RE_CHK, RE_RES, RE_GATE]);
const rcdSrc = `现跑 ${RCD} ${rcdArgs.join(" ")}`;
const chk = RE_CHK.exec(rcd.out);
const regRel = (RE_REG.exec(rcd.out) || [])[1];
const regDeclared = Number((RE_REG.exec(rcd.out) || [])[2]);
if (!Number.isFinite(regDeclared)) die2(`源读数形状不符：${RCD} 的 RCD_REGISTER 行里抓不到「条目=<整数>」（行内容="${rcd.line(RE_REG)}"）`);
let register;
try { register = JSON.parse(readFileSync(P(regRel), "utf8")); } catch (e) { die2(`源读不到：去向册真值源 ${regRel}（该路径是从 ${RCD} 的 RCD_REGISTER 行现读的，不是写死的）${e && e.code}`); }
if (!Array.isArray(register.dispositions)) die2(`源形状不符：${regRel} 没有 dispositions[] ⇒ 无法按词表分桶，账单拒绝产出`);
const gateLine = RE_GATE.exec(rcd.out);
att("gap", "coverageDebtDispositions.rcdGateUncovered", +gateLine[1], rcdSrc, "RCD_GATE .*?UNCOVERED=(\\d+)", rcd.line(RE_GATE));
att("gap", "coverageDebtDispositions.rcdGateCovered", +gateLine[2], rcdSrc, "COVERED=(\\d+) EXEMPT", rcd.line(RE_GATE), { group: 1 });
att("gap", "coverageDebtDispositions.rcdGateExempt", +gateLine[3], rcdSrc, "EXEMPT=(\\d+).*RESULT", rcd.line(RE_GATE), { group: 1 });
att("gap", "coverageDebtDispositions.entriesFromGateLine", regDeclared, rcdSrc, "条目=(\\d+)", rcd.line(RE_REG));
att("gap", "coverageDebtDispositions.registerEntriesOnDisk", register.dispositions.length, `read ${regRel} → dispositions[].length sha=${shaOf(regRel)}`, "^dispositions=(\\d+)", "dispositions=" + register.dispositions.length);
if (register.dispositions.length !== regDeclared) die1(`注册表条目数与门声明不符：盘上 ${register.dispositions.length} vs RCD_REGISTER 条目=${regDeclared}`);
if (+gateLine[1] !== V.uncovered) die1(`去向册门现量欠账 RCD_GATE UNCOVERED=${gateLine[1]} ≠ 覆盖门 REALCOV_UNCOVERED=${V.uncovered} ⇒ 两门不同源，账单拒绝产出`);
att("gap", "coverageDebtDispositions.check.gateDebt", +chk[1], rcdSrc, "门欠账=(\\d+)", chk[0]);
att("gap", "coverageDebtDispositions.check.disposed", +chk[2], rcdSrc, "有去向=(\\d+)", chk[0]);
att("gap", "coverageDebtDispositions.check.undisposed", +chk[3], rcdSrc, "无去向=(\\d+)", chk[0]);
att("gap", "coverageDebtDispositions.check.offVocab", +chk[4], rcdSrc, "册外词=(\\d+)", chk[0]);
att("gap", "coverageDebtDispositions.check.hollow", +chk[5], rcdSrc, "空条目=(\\d+)", chk[0]);
att("gap", "coverageDebtDispositions.check.duplicateKeys", +chk[6], rcdSrc, "重复键=(\\d+)", chk[0]);
att("gap", "coverageDebtDispositions.check.stale", +chk[7], rcdSrc, "陈旧=(\\d+)", chk[0]);

/* 词表分桶：全部条目 vs 与本轮现量欠账点名集的交集。
   注册表里的 stillUncovered 是**册记时**字段（本轮 10/10 全为 true，而门只点名 5 条），
   拿它判活就会把陈旧去向算成本轮可派工 ⇒ 判活一律用门的现量点名集。 */
const liveSet = new Set(uncKeys);
const liveRows = register.dispositions.filter((d) => liveSet.has(d.case));
const tallyOf = (list) => list.reduce((a, d) => ((a[d.disposition] = (a[d.disposition] || 0) + 1), a), {});
const tallyAll = tallyOf(register.dispositions), tallyLive = tallyOf(liveRows);
const offVocabWords = [...new Set(register.dispositions.map((d) => d.disposition))].filter((w) => RKEYS.indexOf(w) < 0);
if (offVocabWords.length) die1(`注册表里有词表外去向 ${offVocabWords.join(",")}（词表权威在 ${RCD}）⇒ 不据其分桶`);
if (liveRows.length !== +chk[2]) die1(`注册表 ∩ 本轮现量欠账=${liveRows.length} 条 ≠ RCD_CHECK 有去向=${chk[2]} ⇒ 交集口径与门的口径打架`);
const dispAll = register.dispositions.map((d) => `${d.case}=${d.disposition}`).join(";");
const dispLive = liveRows.map((d) => `${d.case}=${d.disposition}`).join(";");
/* 词表分桶的证据行 = 去向词本身逐个一排（"逐条 case=词"那份全文留在 source 里给人看，
   不能同时当 tokenCount 的尺：那样"出现一次"会被读成"计数等于一"）。 */
const wordsAll = register.dispositions.map((d) => d.disposition).join(";");
const wordsLive = liveRows.map((d) => d.disposition).join(";");
const regSrc = `read ${regRel} → dispositions[]（sha=${shaOf(regRel)}，逐条 ${dispAll}）`;
const regLiveSrc = `read ${regRel} ∩ ${COV} 现量 UNCOVERED 点名集（逐条 ${dispLive}）`;
for (const w of RKEYS) {
  if (tallyAll[w]) att("gap", `coverageDebtDispositions.tallyAllEntries.${w}`, tallyAll[w], regSrc, `token=${w}`, wordsAll, { kind: "tokenCount", token: w });
  if (tallyLive[w]) att("gap", `coverageDebtDispositions.tallyLiveDebt.${w}`, tallyLive[w], regLiveSrc, `token=${w}`, wordsLive, { kind: "tokenCount", token: w });
  if (tallyAll[w]) att("open", `coverageDebt.tallyAllEntries.${w}`, tallyAll[w], regSrc, `token=${w}`, wordsAll, { kind: "tokenCount", token: w });
  if (tallyLive[w]) att("open", `coverageDebt.tallyLiveDebt.${w}`, tallyLive[w], regLiveSrc, `token=${w}`, wordsLive, { kind: "tokenCount", token: w });
}
const dispatchableLive = tallyLive.DISPATCHABLE_NOW || 0;
att("gap", "coverageDebtDispositions.dispatchableNowLive", dispatchableLive, regLiveSrc, "^DISPATCHABLE_NOW=(\\d+)", "DISPATCHABLE_NOW=" + dispLive.split(";").filter((t) => t.endsWith("=DISPATCHABLE_NOW")).length);
att("open", "coverageDebtLandableNowNowDispatchable", dispatchableLive, regLiveSrc, "^DISPATCHABLE_NOW=(\\d+)", "DISPATCHABLE_NOW=" + dispLive.split(";").filter((t) => t.endsWith("=DISPATCHABLE_NOW")).length);

/* 归档件对照：只对照，不作事实源。 */
const ARCHIVE = "reports/audit/round-7/incident-destinations-round10.json";
let archiveNote;
if (existsSync(P(ARCHIVE))) {
  let arch;
  try { arch = JSON.parse(readFileSync(P(ARCHIVE), "utf8")); } catch (e) { die2(`源读不到：归档对照件 ${ARCHIVE}：${e && e.code}`); }
  /* 行数组在这份归档件里叫 `rows`（真值源里叫 dispositions[]）——逐个候选键找，
     一个都找不着就如实报 null，**不许静默成 0**（0 会被下游读成"归档件是空的"）。 */
  const rowKey = ["rows", "destinations", "dispositions"].find((k) => Array.isArray(arch[k]));
  const rowsA = rowKey ? arch[rowKey] : null;
  archiveNote = {
    path: ARCHIVE, archived: arch.$archived === true, archivedAt: arch.$archivedAt || null, truthSource: arch.$truthSource || null,
    rowsKey: rowKey || null, rows: rowsA === null ? null : rowsA.length,
    note: "该件头注自述 $archived=true（2026-10-06 裁定 T7 / r10new#A：门侧 real-coverage-disposition.json 为唯一真值源）⇒ 账单一律从真值源派生，本件只作对照，不当现状引用。",
  };
  if (rowsA !== null) att("gap", "archiveCrosscheck.rows", rowsA.length, `read ${ARCHIVE} → ${rowKey}[]（对照件，$archived=true，不作事实源）`, "^rows=(\\d+)", "rows=" + rowsA.length);
} else {
  archiveNote = { path: ARCHIVE, archived: null, rows: null, note: "盘上没有该归档件 ⇒ 无对照可印（账单本来就不取它当源）" };
}

/* ============================ 3) 未结行：emit-open-items（只读它的 JSON，不改那个脚本） ============================ */
const OI = "scripts/qa/emit-open-items.mjs";
/* 侧车目录先建：不建就会让那把脚本在自己的 writeFileSync 上 ENOENT 崩掉（它的 --out 缺省是上一程的
   round-7/open-items.json ⇒ 这里必须显式改写侧车，而侧车目录在本仓是按需出现的）。 */
try { mkdirSync(dirname(OPENITEMS_OUT), { recursive: true }); } catch {}
const oiArgs = ["--out", OPENITEMS_OUT].concat(flag("openitems-ledger") ? ["--ledger", flag("openitems-ledger")] : []);
const RE_OI = /^OPEN_ITEMS 主表=(\d+) 未结案=(\d+) 分桶=(.*)$/m;
const oiRun = spawnOnce(`node ${OI} ${oiArgs.join(" ")}`, OI, oiArgs, [RE_OI], 180000);
let oi;
try { oi = JSON.parse(readFileSync(P(OPENITEMS_OUT), "utf8")); } catch (e) { die2(`源读不到：${rel(OPENITEMS_OUT)}（由 ${OI} 这一发现写；缺省 --out 会覆写上一程 round-7/open-items.json ⇒ 本脚本一律显式给侧车）${e && e.code}`); }
if (!oi.by || typeof oi.by !== "object") die2(`源形状不符：${rel(OPENITEMS_OUT)} 没有 by 分桶表 ⇒ 无法派生 landableNow`);
if (!Array.isArray(oi.items)) die2(`源形状不符：${rel(OPENITEMS_OUT)} 没有 items[]`);
const oiFileSrc = `read ${rel(OPENITEMS_OUT)} sha=${shaOf(OPENITEMS_OUT)}（${OI} 的 JSON，本脚本逐字取用、未改一字节）`;
att("gap", "openItemsSummary.ledgerRows", oi.ledgerRows, oiFileSrc, "^ledgerRows=(\\d+)", "ledgerRows=" + oi.ledgerRows);
att("gap", "openItemsSummary.open", oi.open, oiFileSrc, "^open=(\\d+)", "open=" + oi.open);
att("open", "openRowCount", oi.open, oiFileSrc, "^open=(\\d+)", "open=" + oi.open);
if (oi.items.length !== oi.open) die1(`${OI} 自己的输出对不上：items=${oi.items.length} vs open=${oi.open}`);
const bBy = Object.entries(oi.by).sort((a, b) => b[1] - a[1]);
const bSum = bBy.map(([, n]) => n).join("+");
att("gap", "openItemsSummary.bucketSum", bBy.reduce((a, [, n]) => a + n, 0), oiFileSrc + " → by 各桶之和", "+", bSum, { kind: "sum" });
if (bBy.reduce((a, [, n]) => a + n, 0) !== oi.open) die1(`未结行守恒破了：桶合计 ${bBy.reduce((a, [, n]) => a + n, 0)} ≠ 未结案 ${oi.open}`);
for (const [b, n] of bBy) {
  att("gap", `openItemsSummary.by.${b}`, n, oiFileSrc + " → by", `kv=${b}`, bBy.map(([k, v]) => `${k}=${v}`).join(";"), { kind: "kv", key: b });
  att("open", `blockers.${b}`, n, oiFileSrc + " → by（blockers 即 by 的逐字透传）", `kv=${b}`, bBy.map(([k, v]) => `${k}=${v}`).join(";"), { kind: "kv", key: b });
}
const unclassified = oi.by.UNCLASSIFIED || 0;
const noCarrier = Object.entries(oi.carrierByBucket || {}).filter(([, v]) => typeof v === "string" && v.trim().startsWith("（无")).map(([k]) => k);
const landableBuckets = Object.keys(oi.by).filter((b) => b !== "UNCLASSIFIED" && noCarrier.indexOf(b) < 0);
const landableNow = landableBuckets.reduce((a, b) => a + (oi.by[b] || 0), 0);
att("open", "landableNow", landableNow, oiFileSrc + ` → by[b]，b ∈ [${landableBuckets.join(", ")}]（判据取自 ${OI} 自己的 carrierByBucket：不以「（无」开头 = 该桶有现成脚本载体）`, "+", landableBuckets.map((b) => oi.by[b]).join("+"), { kind: "sum" });

/* ============================ 4) 裁定名册：只读具名机器块，绝不数 ## 标题 ============================ */
let ledgerText;
try { ledgerText = readFileSync(P(LEDGER), "utf8"); } catch (e) { die2(`源读不到：本轮裁定册 ${rel(LEDGER)}：${e && e.code}`); }
const ledgerLines = ledgerText.split(/\r?\n/);
const bIdx = ledgerLines.findIndex((l) => /^\s*PENDING_RULINGS_BEGIN/.test(l));
const eIdx = bIdx < 0 ? -1 : ledgerLines.findIndex((l, i) => i > bIdx && /^\s*PENDING_RULINGS_END/.test(l));
const statusOf = (l) => ((/ status=([a-z-]+)/.exec(l) || [])[1] || "?");
let rulings;
if (bIdx < 0 || eIdx < 0) {
  rulings = {
    available: false, source: rel(LEDGER),
    reason: bIdx < 0 ? "册里没有 PENDING_RULINGS_BEGIN/END 块（名册车道还没落盘）" : "名册块未闭合：有 BEGIN 无 END（行 " + (bIdx + 1) + "）",
    open: null, halfClosed: null, closed: null, total: null,
    refused: "拒绝按 `## N.` 标题数待裁项：那把尺只读标题措辞、读不到状态对账，本轮实测把 30 条欠账报成 10 —— 拿它当账单就是编数。",
  };
} else {
  const rows = ledgerLines.slice(bIdx + 1, eIdx).filter((l) => /^\s*RULING id=/.test(l));
  const st = rows.map(statusOf);
  const cnt = (s) => st.filter((x) => x === s).length;
  const tail = /open=(\d+) half_closed=(\d+) closed=(\d+)/.exec(ledgerLines[eIdx]);
  const joined = rows.join("\n");
  const ledSrc = `read ${rel(LEDGER)}:${bIdx + 1}-${eIdx + 1} 具名机器名册 sha=${shaOf(LEDGER)}`;
  const unknown = st.filter((s) => ["open", "half-closed", "closed"].indexOf(s) < 0);
  rulings = {
    available: true, source: rel(LEDGER), beginLine: bIdx + 1, endLine: eIdx + 1,
    open: cnt("open"), halfClosed: cnt("half-closed"), closed: cnt("closed"),
    statusOutsideVocab: unknown.length, total: rows.length,
    declared: tail ? { open: +tail[1], halfClosed: +tail[2], closed: +tail[3] } : null,
    selfCountAgree: !!tail && +tail[1] === cnt("open") && +tail[2] === cnt("half-closed") && +tail[3] === cnt("closed") && +tail[1] + +tail[2] + +tail[3] === rows.length,
    note: "只数块内的 `RULING id=` 行；块外一切措辞不算。",
  };
  if (unknown.length) die1(`名册里有 ${unknown.length} 行 status 不在 open/half-closed/closed 词表内 ⇒ 写入器与读取器口径打架，账单拒绝静吞`);
  att("gap", "rulings.beginLine", bIdx + 1, ledSrc, "^(BEGIN@)(\\d+)$", "BEGIN@" + (bIdx + 1), { group: 2 });
  att("gap", "rulings.endLine", eIdx + 1, ledSrc, "^(END@)(\\d+)$", "END@" + (eIdx + 1), { group: 2 });
  att("gap", "rulings.open", rulings.open, ledSrc, "RULING id=\\S+ status=open", joined, { kind: "lineCount" });
  att("gap", "rulings.halfClosed", rulings.halfClosed, ledSrc, "RULING id=\\S+ status=half-closed", joined, { kind: "lineCount" });
  att("gap", "rulings.closed", rulings.closed, ledSrc, "RULING id=\\S+ status=closed", joined, { kind: "lineCount" });
  att("gap", "rulings.total", rows.length, ledSrc, "^RULING id=", joined, { kind: "lineCount" });
  if (tail) {
    att("gap", "rulings.declared.open", +tail[1], `read ${rel(LEDGER)}:${eIdx + 1} 尾部自述`, "open=(\\d+)", ledgerLines[eIdx]);
    att("gap", "rulings.declared.halfClosed", +tail[2], `read ${rel(LEDGER)}:${eIdx + 1} 尾部自述`, "half_closed=(\\d+)", ledgerLines[eIdx]);
    att("gap", "rulings.declared.closed", +tail[3], `read ${rel(LEDGER)}:${eIdx + 1} 尾部自述`, " closed=(\\d+)", ledgerLines[eIdx]);
  }
  for (const k of ["beginLine", "endLine", "open", "halfClosed", "closed", "total"]) {
    att("open", `rulings.${k}`, rulings[k], ledSrc, PROV.gap.find((r) => r.path === `rulings.${k}`).via, PROV.gap.find((r) => r.path === `rulings.${k}`).line, { kind: PROV.gap.find((r) => r.path === `rulings.${k}`).kind, token: PROV.gap.find((r) => r.path === `rulings.${k}`).token, group: PROV.gap.find((r) => r.path === `rulings.${k}`).group, sep: PROV.gap.find((r) => r.path === `rulings.${k}`).sep });
  }
}

/* ============================ 5) git 起点（§1 要的 head/dirty） ============================ */
const gitOut = (a2) => { try { return execFileSync("git", a2, { cwd: REPO, encoding: "utf8" }); } catch (e) { die2(`源读不到：git ${a2.join(" ")} ⇒ ${e && e.message}（§1 的 HEAD/脏数没有出处，账单拒绝产出）`); } };
const HEAD = gitOut(["rev-parse", "--short", "HEAD"]).trim();
const porcelain = gitOut(["status", "--porcelain"]).split(/\r?\n/).filter((l) => l.trim() !== "");
if (!/^[0-9a-f]{4,40}$/.test(HEAD)) die2(`源读数形状不符：git rev-parse --short HEAD 给出「${HEAD}」`);
att("gap", "head", HEAD, "现跑 git rev-parse --short HEAD", "^(HEAD=)([0-9a-f]+)$", "HEAD=" + HEAD, { group: 2 });
att("gap", "dirty", porcelain.length, "现跑 git status --porcelain（非空行数）", "^dirty=(\\d+)", "dirty=" + porcelain.length);

const gates = [
  { name: "verify-real-coverage", script: COV, args: covArgs, exitCode: cov.status, resultLine: cov.line(RE.result) },
  { name: "verify-real-coverage-disposition", script: RCD, args: rcdArgs, exitCode: rcd.status, resultLine: rcd.line(RE_RES) },
  { name: "emit-open-items", script: OI, args: oiArgs, exitCode: oiRun.status, resultLine: (RE_OI.exec(oiRun.out) || [""])[0] },
];
gates.forEach((gt, i) => att("gap", `gates[${i}].exitCode`, gt.exitCode, `现跑 node ${gt.script} ${gt.args.join(" ")}`, "^(exit=)(-?\\d+)$", "exit=" + gt.exitCode, { group: 2 }));
const red = gates.filter((x) => x.exitCode !== 0).map((x) => x.name);
att("gap", "redCount", red.length, "由上面 gates[].exitCode 现算（!=0 者）", "!=0", gates.map((x) => x.exitCode).join(";"), { kind: "notTokenCount", token: "0" });

/* ============================ 组两件 ============================ */
const stamp = new Date().toISOString();
const derivedBy = "scripts/qa/emit-round-bill.mjs：全部现量派生，无任何手填计数；每条计数带 {source,via,line}，写盘后从盘上重读回收比对（--check 可独立复跑）";
const captured = {
  [COV]: cov.lines(/^REALCOV_|^  (UNCOVERED|VOIDED|EXPIRED) \S*\|/).join("\n"),
  [RCD]: rcd.lines(/^RCD_/).join("\n"),
  [OI]: (RE_OI.exec(oiRun.out) || [""])[0],
  registerDispositions: dispAll.split(";"),
  liveDebtDispositions: dispLive.split(";"),
  ledgerRosterBlock: bIdx >= 0 && eIdx >= 0 ? ledgerLines.slice(bIdx, eIdx + 1).join("\n") : null,
  git: "HEAD=" + HEAD + " dirty=" + porcelain.length,
};
const fingerprints = {
  [COV]: shaOf(COV), [RCD]: shaOf(RCD), [OI]: shaOf(OI), [rel(LEDGER)]: shaOf(LEDGER),
  [regRel]: shaOf(regRel), [rel(OPENITEMS_OUT)]: shaOf(OPENITEMS_OUT),
};
const realCoverage = {
  source: covSrc, exitCode: cov.status, bandStamp,
  cases: V.cases, exempt: V.exempt, covered: V.covered, uncovered: V.uncovered, voided: V.voided, expired: V.expired,
  uncoveredKeys: uncKeys.map((k) => ({ case: k, missingAxes: axesOf(k) })), voidedKeys: voidKeys, expiredKeys: expKeys,
  uncoveredNamedCount: uncKeys.length, voidedNamedCount: voidKeys.length, expiredNamedCount: expKeys.length,
  conservation: { verbatim: cons[0], verdict: cons[1], exempt: terms[0], covered: terms[1], uncovered: terms[2], voided: terms[3], expired: terms[4], total: +cons[7], recomputedSum: sum },
};
const coverageDebtDispositions = {
  truthSource: regRel, truthSourceSha: shaOf(regRel), rcdResult: (RE_RES.exec(rcd.out) || [])[1] || null,
  rcdExitCode: rcd.status, rcdGateUncovered: +gateLine[1], rcdGateCovered: +gateLine[2], rcdGateExempt: +gateLine[3],
  entriesFromGateLine: regDeclared, registerEntriesOnDisk: register.dispositions.length, check: {
    gateDebt: +chk[1], disposed: +chk[2], undisposed: +chk[3], offVocab: +chk[4], hollow: +chk[5], duplicateKeys: +chk[6], stale: +chk[7],
  },
  tallyAllEntries: tallyAll, tallyLiveDebt: tallyLive, liveDebtKeys: uncKeys, dispatchableNowLive: dispatchableLive, vocabulary: RKEYS,
  note: "tallyAllEntries = 注册表全部条目（含门判为陈旧的）；tallyLiveDebt = 只取与本轮覆盖门现量 UNCOVERED 点名集的交集。" +
    "注册表的 stillUncovered 是册记时字段（本轮 10/10 为 true 而门只点名 " + V.uncovered + " 条）⇒ 判活一律用门的现量点名集，不用它。",
};
const gapbill = {
  kind: "round-gapbill", generatedAt: stamp, nodeBin: process.execPath, derivedBy,
  round: TAG, closureDir: rel(CLOSURE), ledger: rel(LEDGER),
  head: HEAD, dirty: porcelain.length,
  gates, red, redCount: red.length,
  gatesSource: "gates[] = **本生产者这一发真的现跑的只读源**（不取租约、不起服务、不重跑全清单门禁）；" +
    "全清单那一发在 §7（--summary 那份件），两份件不同源、口径以 §7 为准。本句里的条数与红数都是从 gates[] 现算的。",
  realCoverage, coverageDebtDispositions,
  openItemsSummary: { source: `node ${OI} ${oiArgs.join(" ")}`, exitCode: oiRun.status, ledger: oi.ledger, ledgerRows: oi.ledgerRows, open: oi.open, by: oi.by, bucketSum: bBy.reduce((a, [, n]) => a + n, 0), unclassified, carrierGaps: noCarrier },
  rulings, archiveCrosscheck: archiveNote,
  consumerContract: {
    fieldsReadByGenRound8Report: "§1 读 gap.gates[].{name,exitCode} / gap.red / gap.head / gap.dirty（gen-round8-report.mjs:277-281）；§4 读 open.openRowCount / open.landableNow / open.blockers（:292-293）",
  },
  captured, sourceFingerprints: fingerprints, provenance: PROV.gap,
};
const openrows = {
  kind: "round-openrows-blockers", generatedAt: stamp, nodeBin: process.execPath, derivedBy,
  round: TAG, closureDir: rel(CLOSURE), ledgerOfOpenItems: oi.ledger, openItemsArtefact: rel(OPENITEMS_OUT), openItemsSha: fingerprints[rel(OPENITEMS_OUT)],
  openRowCount: oi.open,
  landableNow,
  landableNowBasis:
    `landableNow = Σ by[b]，b ∈ [${landableBuckets.join(", ")}]。判据不来自本脚本的措辞，来自 ${OI} **自己**的输出：` +
    `carrierByBucket[b] 不以「（无」开头 ⇒ 该桶有一枚现成脚本载体可重跑；UNCLASSIFIED 与它自己标为无载体的桶（本轮：[${noCarrier.join(", ") || "无"}]）一律不算可落账。` +
    `口径边界（不许读成"债已清"）：这一句说的是"欠的那次动作有脚本能重跑"，**不等于**"已量到可结案"；` +
    `真正的"本轮可派工"另见 coverageDebtLandableNowNowDispatchable（去向册 DISPATCHABLE_NOW ∩ 本轮现量欠账）=${dispatchableLive}。`,
  coverageDebtLandableNowNowDispatchable: dispatchableLive,
  coverageDebtLandableNowBasis: `真值源 ${regRel} 里 disposition=DISPATCHABLE_NOW 且 case ∈ 本轮覆盖门现量 UNCOVERED 点名集的条数=${dispatchableLive}；` +
    `注册表全部条目里该词共 ${tallyAll.DISPATCHABLE_NOW || 0} 条，门判陈旧 ${chk[7]} 条（advisory 点名、不算本轮）⇒ 交集为空就是空，不拿陈旧条目凑数。`,
  unclassifiedPassthrough: unclassified,
  blockers: Object.fromEntries(bBy),
  bucketCarriers: Object.fromEntries(bBy.map(([k]) => [k, (oi.carrierByBucket || {})[k] || "(源未给该桶的载体)"])),
  rows: oi.items.map((r) => ({ id: r.id, page: r.page, sev: r.sev, statusVerbatim: r.status, klass: r.bucket, blockedOn: r.owed, rerunCarrier: r.rerun })),
  coverageDebt: {
    source: covSrc, bandStamp, uncovered: V.uncovered, voided: V.voided, expired: V.expired,
    uncoveredKeys: uncKeys.map((k) => ({ case: k, missingAxes: axesOf(k), disposition: (register.dispositions.find((d) => d.case === k) || {}).disposition || "(在册无去向)" })),
    voidedKeys: voidKeys, expiredKeys: expKeys, tallyLiveDebt: tallyLive, tallyAllEntries: tallyAll,
  },
  rulings, archiveCrosscheck: archiveNote,
  consumerContract: gapbill.consumerContract,
  captured, sourceFingerprints: fingerprints, provenance: PROV.open,
};
/* openrows.coverageDebt.{uncovered,voided,expired} 是覆盖门那三格的逐字透传 ⇒ 出处也必须在 open 件里立一份。 */
att("open", "coverageDebt.uncovered", V.uncovered, covSrc, RE.uncov.source, cov.line(RE.uncov));
att("open", "coverageDebt.voided", V.voided, covSrc, RE.voided.source, cov.line(RE.voided));
att("open", "coverageDebt.expired", V.expired, covSrc, RE.expired.source, cov.line(RE.expired));
/* 剩下的每一个数值叶子（退出码 / 透传计数 / 名册词表外行数）也一律立出处——
   audit() 会把"没有出处的数"直接判 FAIL，所以这里不是装饰，是手填数的闸门。 */
att("gap", "realCoverage.exitCode", cov.status, covSrc, "^(exit=)(-?\\d+)$", "exit=" + cov.status, { group: 2 });
att("gap", "coverageDebtDispositions.rcdExitCode", rcd.status, rcdSrc, "^(exit=)(-?\\d+)$", "exit=" + rcd.status, { group: 2 });
att("gap", "openItemsSummary.exitCode", oiRun.status, `现跑 node ${OI} ${oiArgs.join(" ")}`, "^(exit=)(-?\\d+)$", "exit=" + oiRun.status, { group: 2 });
att("gap", "openItemsSummary.unclassified", unclassified, oiFileSrc + " → by.UNCLASSIFIED（源件无该键时按 0 记，不藏桶）", "^(UNCLASSIFIED=)(\\d+)$", "UNCLASSIFIED=" + unclassified, { group: 2 });
att("open", "unclassifiedPassthrough", unclassified, oiFileSrc + " → by.UNCLASSIFIED 逐字透传（不并入任何别的桶）", "^(UNCLASSIFIED=)(\\d+)$", "UNCLASSIFIED=" + unclassified, { group: 2 });
if (rulings.available) {
  att("gap", "rulings.statusOutsideVocab", rulings.statusOutsideVocab, `read ${rel(LEDGER)} 名册块内 status 词表核对`, "^(outside=)(\\d+)$", "outside=" + rulings.statusOutsideVocab, { group: 2 });
  att("open", "rulings.statusOutsideVocab", rulings.statusOutsideVocab, `read ${rel(LEDGER)} 名册块内 status 词表核对`, "^(outside=)(\\d+)$", "outside=" + rulings.statusOutsideVocab, { group: 2 });
  if (rulings.declared) {
    for (const k of ["open", "halfClosed", "closed"]) {
      att("open", `rulings.declared.${k}`, rulings.declared[k], `read ${rel(LEDGER)} 尾部自述`, k === "halfClosed" ? "half_closed=(\\d+)" : k === "closed" ? " closed=(\\d+)" : "open=(\\d+)", ledgerLines[eIdx]);
    }
  }
}
if (typeof archiveNote.rows === "number") att("open", "archiveCrosscheck.rows", archiveNote.rows, `read ${ARCHIVE}（对照件，$archived=true，不作事实源）`, "^rows=(\\d+)", "rows=" + archiveNote.rows);

/* ── 写盘，然后**从盘上重读**做自证回收 ── */
try { mkdirSync(dirname(GAPBILL_PATH), { recursive: true }); } catch {}
writeFileSync(GAPBILL_PATH, JSON.stringify(gapbill, null, 1) + "\n");
writeFileSync(OPENROWS_PATH, JSON.stringify(openrows, null, 1) + "\n");
const gapBack = JSON.parse(readFileSync(GAPBILL_PATH, "utf8"));
const openBack = JSON.parse(readFileSync(OPENROWS_PATH, "utf8"));
const problems = [...audit("gap", rel(GAPBILL_PATH), gapBack), ...audit("open", rel(OPENROWS_PATH), openBack)];
console.log(`ROUNDBILL_ARTIFACTS gapbill=${rel(GAPBILL_PATH)} openrows=${rel(OPENROWS_PATH)} provenance=gap:${PROV.gap.length}+open:${PROV.open.length}`);
console.log(`ROUNDBILL_COUNTS gates=${gates.length} red=${red.length}(${red.join(",") || "无"}) head=${HEAD} dirty=${porcelain.length} band=${bandStamp} cases=${V.cases} exempt=${V.exempt} covered=${V.covered} uncovered=${V.uncovered} voided=${V.voided} expired=${V.expired} dispLive=${JSON.stringify(tallyLive)} dispAll=${JSON.stringify(tallyAll)} ledger=${oi.ledgerRows} openRows=${oi.open} UNCLASSIFIED=${unclassified} landableNow=${landableNow} coverDebtDispatchable=${dispatchableLive} rulings=${rulings.available ? `open=${rulings.open} halfClosed=${rulings.halfClosed} closed=${rulings.closed} total=${rulings.total} selfAgree=${rulings.selfCountAgree}` : "不可得（" + rulings.reason + "）"}`);
for (const p of problems) console.log("  ✗ " + p);
if (problems.length) {
  console.log(`ROUNDBILL_RESULT=FAIL exit=1 自证回收 ${problems.length} 处不符 ⇒ 账单里的数与它自带的证据不一致（手改或上游形状漂移），两件已落盘但不得引用`);
  process.exit(1);
}
console.log(`ROUNDBILL_RESULT=PASS exit=0 两件已写盘，${PROV.gap.length}+${PROV.open.length} 条出处从盘上重读后全部回收一致（gapbill=${rel(GAPBILL_PATH)} openrows=${rel(OPENROWS_PATH)}）`);
process.exit(0);
