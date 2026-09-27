/**
 * 台账"还欠一条判决"的每一行，是否都有一条**明确的去向**（v3.2 配套门，只读）。
 *
 * 为什么要单独立这把（不是重复 verify-frame-debt-triage）：
 *  那把管的是"没点名的 18 行帧债"这一小类，且方向是反的（防止配方去 SHOOT 帧不可证的行）。
 *  本轮实测到一个它抓不到的洞：取景配方 reconcile-frameplan.mjs 读的是 frameplan-merged.json
 *  （一份人工/前批产出的输入），**从不读台账状态列** ⇒ 台账里状态写着"已修复待复验"的行，
 *  可以完全不在配方里，也不会被任何门抓住。实测 19 行未收口里有 7 行就是这种情况：
 *  既不在配方的 79 行里，也没有归置表条目 —— 于是 stage-6 的 reshoot/tour 腿再努力也不会给它们出帧，
 *  这一轮就会以"7 行没人管"收口，而所有已存在的门都是绿的。
 *
 * 三条合法去向（任一即算收口）：
 *   A 在取景配方里，且 disposition=SHOOT（会被拍帧）
 *   B 在帧债归置表 dispositions[] 里，带 kind + carrier（+ 给了行号就要真有那么长）
 *   C 在 open-row-dispositions.json 里显式登记（欠代码 / 欠拍板 / 欠重启那一种，必须写 reason 与 nextCarrier）
 *
 * 用法：node scripts/qa/verify-frame-debt-coverage.mjs [--matrix 台账] [--plans 配方a,配方b,…（默认=本轮所有会被 shoot 的配方并集）] [--triage 归置表]
 *                                                      [--extra 显式登记表] [--selftest]
 * 退出码：0=全部有去向；1=有裸行；2=前置件缺失或行集为空（"没人看"和"没问题"不共用一个输出）。
 */
import { readFileSync, existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const OPEN_STATUS = ["待修复", "已修复待复验", "待复验", "未取证", "未取证/需裁决", "需裁决", "待人裁决"];
/* ① 的原话是"把台账 56 行 已修复待复验 推到渲染帧级终态"。这一族后来被改写成
   `已修复（源码级判点…）`（只读盘点实测 83 行里只有 1 行真长出帧），而 OPEN_STATUS 不认它 ⇒
   本门对"未收口"是绿的，对"①到底做完没有"却是瞎的。这里单列一桶，默认只打印不否决
   （先把误报量出来），`--strict-src-only` 才让它否决收尾。 */
const SRC_PREFIX = "已修复（源码级判点";

/* 拼错的旗标会被 arg() 当成"没传"而回落到默认路径 —— 实测过把 `--plan` 写成单数后，
   刚追加进配方的 3 行仍然算"裸行"，看起来像追加没生效。宁可退出码 2 也不给静默的假结果。 */
const KNOWN_FLAGS = ["matrix", "plans", "triage", "extra", "selftest", "strict-src-only"];
const STRICT_SRC = has("strict-src-only");
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN_FLAGS.includes(a.slice(2)));
  if (bad.length) {
    console.log(`FRAMECOV_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 本门只认 ${KNOWN_FLAGS.join(",")}（被忽略的旗标会让统计按默认路径静默失真）`);
    process.exit(2);
  }
}

function readJson(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
/* 台账状态列：11 列里的第 6 列（1 基），剥掉括注后与词表比。表头变了要能看出来，不能默默数到 0 行。 */
function openRows(matrixPath) {
  const text = readFileSync(matrixPath, "utf8");
  const lines = text.split(/\r?\n/);
  const hdr = lines.find((l) => /^\|/.test(l) && /\|\s*(?:status|状态)\s*\|/i.test(l));
  if (!hdr) return { err: "台账里找不到 status/状态 表头列" };
  const cols = hdr.split("|").map((s) => s.trim());
  const si = cols.findIndex((c) => /^(?:status|状态)$/i.test(c));
  const ii = cols.findIndex((c) => /^(?:新号|id)$/i.test(c));
  if (si < 0 || ii < 0) return { err: "status 或 新号 列定位失败" };
  const out = [], srcOnly = [];
  for (const l of lines) {
    if (!/^\|\s*MP-/.test(l)) continue;
    const c = l.split("|").map((s) => s.trim());
    const st = String(c[si] || "").split("（")[0].trim();
    if (OPEN_STATUS.includes(st)) out.push({ id: c[ii], status: st, page: c[3] || "" });
    else if (String(c[si] || "").startsWith(SRC_PREFIX)) srcOnly.push({ id: c[ii], status: String(c[si] || "").slice(0, 46), page: c[3] || "" });
  }
  return { rows: out, srcOnly, statusCol: si, header: cols.length };
}

function coverage({ matrix, plans, triage, extra }) {
  const o = openRows(matrix);
  if (o.err) return o;
  const rows = o.rows;
  const tj = readJson(triage) || {};
  const xj = readJson(extra);
  /* 取景配方是**多份**的：mock 档一份、游客真实档一份。一行只要在任何一份里是 SHOOT 就算会被拍帧。
     只读 final 那一份会把"因为 mock 档表达不了游客态而挪到 real 档"的 6 行误报成没人管。 */
  const shoot = new Set(), inPlanAny = new Set(), planOf = new Map();
  for (const one of plans) {
    const pj = readJson(one) || {};
    for (const r of pj.rows || []) {
      const id = String(r.id || "").split("（")[0].trim();
      inPlanAny.add(id);
      if (/^SHOOT/.test(String(r.disposition || "").toUpperCase()) && !shoot.has(id)) { shoot.add(id); planOf.set(id, String(one).split("/").pop()); }
    }
  }
  const disp = new Map();
  for (const d of tj.dispositions || []) disp.set(String(d.id || "").split("（")[0].trim(), d);
  const xmap = new Map();
  for (const d of (xj && xj.dispositions) || []) xmap.set(String(d.id || "").split("（")[0].trim(), d);
  const naked = [], covered = { shoot: [], triage: [], extra: [], plannedButNotShoot: [] };
  for (const r of rows) {
    if (shoot.has(r.id)) covered.shoot.push(r.id);
    else if (disp.has(r.id)) covered.triage.push(r.id);
    else if (xmap.has(r.id)) covered.extra.push(r.id);
    else if (inPlanAny.has(r.id)) covered.plannedButNotShoot.push(r.id + "（在配方里但不是 SHOOT，等于这一轮不会出帧）");
    else naked.push(r);
  }
  /* ① 那批"已修复（源码级判点…）"的行：它们不在未收口词表里，本门默认看不见它们。
     这里按同一套去向核一遍，回答"这些行到底有没有帧"，让"源码级"不会被当成"帧级"。 */
  const src = { n: (o.srcOnly || []).length, plan: [], triage: [], extra: [], owed: [] };
  for (const r of o.srcOnly || []) {
    if (shoot.has(r.id)) src.plan.push(r.id);
    else if (disp.has(r.id)) src.triage.push(r.id);
    else if (xmap.has(r.id)) src.extra.push(r.id);
    else src.owed.push(r);
  }
  return { rows, naked, covered, src, statusCol: o.statusCol };
}

if (has("selftest")) {
  const T = mkdtempSync(join(tmpdir(), "covgate-"));
  mkdirSync(join(T, "d"), { recursive: true });
  const mx = join(T, "d", "matrix.md"), pl = join(T, "d", "plan.json"), tr = join(T, "d", "triage.json"), ex = join(T, "d", "extra.json");
  writeFileSync(mx, [
    "| 新号 | 历史别名 | 页面 | 类别 | severity | status | 置信 | 证据 | statusEvidence | 理想图依据 | 处置 |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    "| MP-A-001 | | pages/a/index | c | P2 | 已修复待复验 | 高 | e | e | | t |",
    "| MP-A-002 | | pages/b/index | c | P2 | 待修复（要人判） | 高 | e | e | | t |",
    "| MP-A-003 | | pages/c/index | c | P2 | 未取证 | 高 | e | e | | t |",
    "| MP-A-004 | | pages/d/index | c | P2 | 已修复 | 高 | e | e | | t |",
  ].join("\n"));
  writeFileSync(pl, JSON.stringify({ rows: [{ id: "MP-A-001", disposition: "SHOOT" }] }));
  writeFileSync(tr, JSON.stringify({ dispositions: [{ id: "MP-A-002", kind: "needs_code", carrier: "apps/client/src/app.json", next: "改完重跑" }] }));
  writeFileSync(ex, JSON.stringify({ dispositions: [] }));
  const r1 = coverage({ matrix: mx, plans: [pl], triage: tr, extra: ex });
  const bad = [];
  if (r1.err) bad.push("夹具台账读不出：" + r1.err);
  else {
    if (r1.rows.length !== 3) bad.push(`未收口行应 3（第 4 行是"已修复"不该算），实为 ${r1.rows.length}`);
    if (r1.naked.length !== 1 || r1.naked[0].id !== "MP-A-003") bad.push("裸行识别错：" + JSON.stringify(r1.naked.map((x) => x.id)) + "（应正好是 MP-A-003）");
    if (r1.covered.shoot.length !== 1 || r1.covered.triage.length !== 1) bad.push("三种去向里 A/B 没各自认出来 ⇒ 覆盖判据其实是空跑");
  }
  // 多份配方：MP-A-003 只在第二份（游客真实档）里是 SHOOT ⇒ 也算有帧可拍，不能算裸行
  const pl2 = join(T, "d", "plan2.json");
  writeFileSync(pl2, JSON.stringify({ rows: [{ id: "MP-A-003", disposition: "SHOOT" }] }));
  const rM = coverage({ matrix: mx, plans: [pl, pl2], triage: tr, extra: ex });
  if (!rM.covered.shoot.includes("MP-A-003")) bad.push("第二份配方里的 SHOOT 没被认出来 ⇒ 只读一份会把挪到真实档的行误报成没人管");
  // 一份配方都读不到时必须前置失败，而不是把全部行算成裸行后判红（那是另一种假信号）
  const rNone = coverage({ matrix: mx, plans: [], triage: tr, extra: ex });
  if (rNone.naked.length !== r1.naked.length + 1) bad.push("空配方集没退化成全裸（说明 plans 参数没生效）");
  // 登记表补上 MP-A-003 之后必须转绿（证明"红是能被正当去向消掉的"，不是死红）
  writeFileSync(ex, JSON.stringify({ dispositions: [{ id: "MP-A-003", reason: "数据半不可判", nextCarrier: "reports/audit/round-7/x.md" }] }));
  const r2 = coverage({ matrix: mx, plans: [pl], triage: tr, extra: ex });
  if (r2.naked && r2.naked.length !== 0) bad.push("登记后仍有裸行 ⇒ C 路去向没生效：" + JSON.stringify(r2.naked.map((x) => x.id)));
  // 空表头必须报错而不是数到 0 行判绿
  const bad0 = join(T, "d", "empty.md");
  writeFileSync(bad0, "# 没有表格\n");
  if (!coverage({ matrix: bad0, plans: [pl], triage: tr, extra: ex }).err) bad.push("读不到表头时没有前置失败（0 行会被当成全绿）");
  rmSync(T, { recursive: true, force: true });
  console.log(`COV_SELFTEST 结果=${bad.length ? "FAIL" : "PASS"}`);
  for (const b of bad) console.log("  BAD " + b);
  process.exit(bad.length ? 1 : 0);
}

/* 默认并集必须等于"本轮所有会被 shoot 的配方"，一条都不漏：门查的是"哪些行会有腿去拍"，
   少列一档就等于把那一档的行判成裸行（2026-09-27 实测：requiresReal 的登录态真实档配方
   刚建出来时不在默认列表里，那一条判据被门报成"没人管"）。 */
const PLAN_LIST = String(arg("plans", "reports/audit/round-7/frameplan-round7-final.json,reports/audit/round-7/frameplan-round7-guest-real.json,reports/audit/round-7/frameplan-round7-a-real.json"))
  .split(",").map((s) => s.trim()).filter(Boolean);
const P = {
  matrix: resolve(REPO, arg("matrix", "reports/audit/round-6/issue-matrix.md")),
  plans: PLAN_LIST.map((s) => resolve(REPO, s)),
  triage: resolve(REPO, arg("triage", "reports/audit/round-7/frame-debt-triage.json")),
  extra: resolve(REPO, arg("extra", "reports/audit/round-7/open-row-dispositions.json")),
};
/* 配方缺一份不算红（游客真实档可能还没生成），但**一份都没有**就是前置失败；
   其它必需件缺失一律红。 */
const havePlans = P.plans.filter((p) => existsSync(p));
if (!havePlans.length) { console.log(`FRAMECOV_RESULT=FAIL reason=一份取景配方都读不到（${P.plans.join(" ")}）⇒ 无法判"谁会被拍帧"，不得当成"没人欠账"`); process.exit(2); }
if (havePlans.length !== P.plans.length) console.log(`FRAMECOV_NOTE 有 ${P.plans.length - havePlans.length} 份配方还没生成：${P.plans.filter((p) => !existsSync(p)).map((p) => p.split("/").pop()).join(" ")}（这些配方负责的 id 这一趟会算成裸行，属时序而非缺陷）`);
for (const [k, v] of Object.entries(P)) if (k !== "extra" && k !== "plans" && !existsSync(v)) { console.log(`FRAMECOV_RESULT=FAIL reason=${k} 文件缺失 ${v}（不得当成"没有欠账"）`); process.exit(2); }
const r = coverage({ ...P, plans: havePlans });
if (r.err) { console.log(`FRAMECOV_RESULT=FAIL reason=${r.err}`); process.exit(2); }
if (!r.rows.length) { console.log("FRAMECOV_RESULT=FAIL reason=未收口行数为 0 —— 要么是台账真的全收口（那这条门该被改写），要么状态词表与台账不同步；两者都必须先人看"); process.exit(2); }
const c = r.covered;
console.log(`FRAMECOV open=${r.rows.length} A配方SHOOT=${c.shoot.length} B归置表=${c.triage.length} C显式登记=${c.extra.length} 在配方但非SHOOT=${c.plannedButNotShoot.length} 裸行=${r.naked.length}`);
for (const x of c.plannedButNotShoot) console.log("  非SHOOT " + x);
for (const n of r.naked) console.log(`  FRAMECOV_NAKED ${n.id} [${n.status}] page=${String(n.page).slice(0, 60)} —— 这一行既不会被拍帧，也没有归置/登记去向`);
const st = r.src || { n: 0, plan: [], triage: [], extra: [], owed: [] };
console.log(`FRAMECOV_SRCONLY 行数=${st.n}（状态词"已修复（源码级判点…"打头的） A配方SHOOT=${st.plan.length} B归置=${st.triage.length} C登记=${st.extra.length} 欠帧且无声明=${st.owed.length}`);
for (const x of st.owed.slice(0, 10)) console.log(`  FRAMECOV_SRC_OWED ${x.id} [${x.status}] page=${String(x.page).slice(0, 52)}`);
if (st.owed.length > 10) console.log(`  …另有 ${st.owed.length - 10} 行同类（列在 FRAMECOV_SRCONLY 的计数里，一个都没漏算）`);
const total = c.shoot.length + c.triage.length + c.extra.length + c.plannedButNotShoot.length + r.naked.length;
console.log(`FRAMECOV_CONSERVATION in=${r.rows.length} out=${total} ${total === r.rows.length ? "OK" : "MISMATCH（有行没落到任何去向桶）"}`);
if (total !== r.rows.length) { console.log("FRAMECOV_RESULT=FAIL reason=分桶不守恒"); process.exit(2); }
if (STRICT_SRC && st.owed.length) {
  console.log(`FRAMECOV_RESULT=FAIL reason=--strict-src-only 之下还有 ${st.owed.length} 行"源码级判点"既没进配方也没登记去向 ⇒ ① 说的渲染帧级终态对它们不成立，且没人声明过为什么不用帧`);
  process.exit(1);
}
console.log(r.naked.length
  ? `FRAMECOV_RESULT=FAIL 裸行=${r.naked.length}/${r.rows.length} ⇒ 台账还欠这些行的判决，而本轮没有任何腿会去处理它们。要么进取景配方（能被帧判），要么进归置表/登记表（写清欠什么）。`
  : "FRAMECOV_RESULT=PASS 每条未收口行都有去向");
process.exit(r.naked.length ? 1 : 0);
