/**
 * 把 scripts/qa/plan-additions-stage7.json 里的行追加进取景配方输入 frameplan-merged.json。
 *
 * 为什么要有这个小程序而不是手改 JSON：追加动作必须满足三条才不会变成"给自己放行"——
 *   1. 只有登记在册的行（--ledger 里第 6 列确实是未收口词表）才允许被追加成 SHOOT；
 *   2. 行必须自带 route / assertion / precondition / identity，缺一项就拒绝（否则 reshoot 会拍出一张没有判点的帧）；
 *   3. 已在配方里的行不覆盖：SHOOT 保持、非 SHOOT 报"降级过，需要人先看为什么"，绝不静默升级
 *      （reconcile-frameplan 的单向棘轮是同一道理：能拍的可以改成不能拍，反过来就是洗绿）。
 *
 * 【本补丁 · 身份回填 --backfill-identity】
 * 上面第 3 条把另一件事一起挡死了：配方行的 precondition 被上游生产者 String() 成 "[object Object]"
 * 之后身份正文就没了（实测 reports/audit/round-7/frameplan-round7-final.json 里 20 行），取景门
 * shoot-frameplan.mjs:232 identityResolutionOf 于是把这些行一律判成不可归因 ⇒ NOT_SHOOTABLE 拒拍。
 * 但两条路都堵着：:87「已在配方且已是 SHOOT ⇒ 跳过不动」让升级分支（:90）根本走不到，
 * :80 的状态门又不让台账已收口的行过 ⇒ 没有任何受控写者能把权威出处里的身份写回去。
 * 实测（--add <对象形态 5 行> --classify <出处> --allow-upgrade --upgrade-only <点名> --dry）：
 *   PLANADD 追加清单=5 可加=0 升级=0 已在配方=5 拒绝=0 ⇒ PLANADD_RESULT=PASS，一行都不动。
 * 回填模式补的就是这一段，且把"必须有出处"写成硬条件、把棘轮原样保住：
 *   · 只动 precondition / identity 两个字段，disposition 一律不许变（棘轮仍然只降不升）；
 *   · 只修当前确实不可归因的行 —— 已带结构化身份的行不许被覆盖（不许借回填洗掉别人的判决）；
 *   · 每行必须带 identityAuthority 且指向盘上真实存在的文件（lane 源头 / 只读复判产物 / 台账行号）；
 *   · 点名才生效：--backfill-identity 必须配 --backfill-only 逐条点名（同 :29 的规矩，不许整批）。
 * 本文件**不 import** shoot-frameplan.mjs 来复用 identityResolutionOf：那个模块顶层 :48-66 在 import
 * 时就执行租约分支，非 --dry 路径会 acquireUi（:56）抢走 DevTools 租约。这里复制同一条判据
 * （对象 + 非空 .identity + 正文不是 "[object …]"），判据出处逐字对齐 shoot-frameplan.mjs:232-257。
 * 用法：node scripts/qa/apply-plan-additions.mjs [--add 追加清单] [--plan 配方] [--dry]
 *       node scripts/qa/apply-plan-additions.mjs --add <回填清单> --plan <配方> --backfill-identity --backfill-only id,id[,…] [--dry]
 * 退出码：0=完成（或 dry 算账通过），1=有行不合规则全部不落盘，2=前置件缺失。
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const ADD = resolve(REPO, arg("add", "scripts/qa/plan-additions-stage7.json"));
/* 状态列不是"未收口"的行默认一律拒绝。唯一的例外必须是有出处的：--classify 指一份只读复判产物，
   里面把该行判成 --verdict（默认 FRAME_JUDGEABLE_NOW，"今天就能被帧判"）。
   没有这份凭据就想给 已修复（源码级判点…） 换身份 ⇒ 仍然拒绝。这不是放宽，是把"谁说的"落到盘上。 */
const CLASSIFY = arg("classify", "");
const VERDICT = arg("verdict", "FRAME_JUDGEABLE_NOW");
/* 放行必须是点名的：--allow-upgrade 只说"我认这套"，--upgrade-only 说"认的是这几行"。
   只给前者就 exit 2 —— 一次批量升回整批降级行，正是棘轮要拦的那种动作。 */
const UPG_ONLY = (arg("upgrade-only", "") || "").split(",").map((x) => x.trim()).filter(Boolean);
if (has("allow-upgrade") && !UPG_ONLY.length) { console.log("PLANADD_RESULT=FAIL reason=--allow-upgrade 必须配 --upgrade-only 点名放行哪几行（不许整批升回）"); process.exit(2); }
/* 身份回填同样必须点名（:29 的规矩复制一遍）：只给 --backfill-identity 不给 --backfill-only ⇒ exit 2。
   整批回填正是"没人看过就把 20 行都盖成 A"的形状，与本仓反复踩过的坑同族。 */
const BACKFILL = has("backfill-identity");
const BACKFILL_ONLY = (arg("backfill-only", "") || "").split(",").map((x) => x.trim()).filter(Boolean);
if (BACKFILL && !BACKFILL_ONLY.length) { console.log("PLANADD_RESULT=FAIL reason=--backfill-identity 必须配 --backfill-only 逐条点名要回填哪几行（不许整批洗身份）"); process.exit(2); }
const backfilledIds = new Set(BACKFILL_ONLY);
/* 身份归因判据（复制自 shoot-frameplan.mjs:232-257 identityResolutionOf，理由见文件头：import 会触发它的顶层租约分支）。
   只回答一个问题：这一行的 precondition 说没说清楚身份。说了 ⇒ true；没说清（缺失/裸串/数组/"[object …]"/空 .identity）⇒ false。 */
const IDENT_GARBAGE = /^\[object /i;
function attributable(p) {
  if (p === undefined || p === null) return false;
  if (typeof p === "string") return false;
  if (typeof p !== "object" || Array.isArray(p)) return false;
  const s = p.identity === undefined || p.identity === null ? "" : String(p.identity).trim();
  if (!s) return false;
  /* 正文是 "[object …]" ⇒ 身份已被上游 String() 销毁，同 shoot-frameplan.mjs:252 的判据 */
  return !IDENT_GARBAGE.test(s);
}
const dropped = [];
const KNOWN = ["add", "plan", "ledger", "dry", "classify", "verdict", "allow-upgrade", "upgrade-only", "backfill-identity", "backfill-only"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log(`PLANADD_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 本工具只认 ${KNOWN.join(",")}`); process.exit(2); }
}
const allowedByClassify = new Set();
if (CLASSIFY) {
  const cp = resolve(REPO, CLASSIFY);
  if (!existsSync(cp)) { console.log(`PLANADD_RESULT=FAIL reason=--classify 指的文件不存在 ${cp}（没有出处就不许动那些行的状态）`); process.exit(2); }
  const cj = JSON.parse(readFileSync(cp, "utf8"));
  for (const r of cj.rows || []) if (String(r.verdict || "") === VERDICT && r.id) allowedByClassify.add(String(r.id).trim());
  console.log(`PLANADD_CLASSIFY 出处=${CLASSIFY} 判成 ${VERDICT} 的行=${allowedByClassify.size}`);
  if (!allowedByClassify.size) { console.log(`PLANADD_RESULT=FAIL reason=出处里没有一条 ${VERDICT} ⇒ 空集不许当成"允许追加"（要么改 --verdict，要么承认没这东西）`); process.exit(2); }
}
const PLAN = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-merged.json"));
const LEDGER = resolve(REPO, arg("ledger", "reports/audit/round-6/issue-matrix.md"));
const OPEN_STATUS = ["待修复", "已修复待复验", "待复验", "未取证", "未取证/需裁决", "需裁决", "待人裁决"];

if (!existsSync(ADD)) { console.log(`PLANADD_RESULT=FAIL reason=追加清单不存在 ${ADD}`); process.exit(2); }
if (!existsSync(PLAN)) { console.log(`PLANADD_RESULT=FAIL reason=配方不存在 ${PLAN}`); process.exit(2); }
if (!existsSync(LEDGER)) { console.log(`PLANADD_RESULT=FAIL reason=台账不存在 ${LEDGER}`); process.exit(2); }

const ledgerOpen = new Set();
/* 回填模式不许凭空造行：台账里必须有这一行（状态可以是已收口，但行必须在册）。 */
const ledgerIds = new Set();
{
  const lines = readFileSync(LEDGER, "utf8").split(/\r?\n/);
  const hdr = lines.find((l) => /^\|/.test(l) && /\|\s*(?:status|状态)\s*\|/i.test(l));
  if (!hdr) { console.log("PLANADD_RESULT=FAIL reason=台账找不到 status 表头（无法核\"这行是不是真未收口\"）"); process.exit(2); }
  const cols = hdr.split("|").map((s) => s.trim());
  const si = cols.findIndex((c) => /^(?:status|状态)$/i.test(c));
  const ii = cols.findIndex((c) => /^(?:新号|id)$/i.test(c));
  for (const l of lines) {
    if (!/^\|\s*MP-/.test(l)) continue;
    const c = l.split("|").map((s) => s.trim());
    ledgerIds.add(c[ii]);
    if (OPEN_STATUS.includes(String(c[si] || "").split("（")[0].trim())) ledgerOpen.add(c[ii]);
  }
}
if (!ledgerOpen.size) { console.log("PLANADD_RESULT=FAIL reason=台账里未收口行为 0 ⇒ 那就没有\"追加取景行\"这回事，先复核台账状态词表"); process.exit(2); }

const plan = JSON.parse(readFileSync(PLAN, "utf8"));
const add = JSON.parse(readFileSync(ADD, "utf8"));
const rows = plan.rows || [];
const byId = new Map(rows.map((r) => [String(r.id || "").trim(), r]));
const need = ["route", "identity", "frameName", "precondition", "assertion"];
const refused = [], wouldAdd = [], already = [], viaClassify = [], upgrades = [], backfills = [];
for (const r of add.rows || []) {
  const id = String(r.id || "").trim();
  if (!id) { refused.push({ id: "(空)", why: "没有 id" }); continue; }
  const miss = need.filter((k) => !String(r[k] || "").trim() && r[k] !== 0);
  if (miss.length) { refused.push({ id, why: "缺字段 " + miss.join(",") + "（没有判点的帧不许拍）" }); continue; }
  /* ===== 回填分支：放在状态门（下面那段 ledgerOpen）之前 =====
     这些要修的行台账状态多是 已修复（源码级判点…），原状态门会把它们一律拒掉；
     回填用一组更硬的条件替它：行必须在册、必须已在配方且是 SHOOT、判决不许变、
     当前必须确实不可归因（不许覆盖别人的结构化身份）、必须有盘上存在的出处、新值必须过归因判据。 */
  if (BACKFILL) {
    if (!backfilledIds.has(id)) { refused.push({ id, why: "--backfill-identity 开着但没在 --backfill-only 里点名 ⇒ 一行都不改（棘轮规矩同 :29）" }); continue; }
    const bad = [];
    const cur = byId.get(id);
    if (!cur) bad.push("配方里没有这一行 ⇒ 那是追加不是回填");
    if (!ledgerIds.has(id)) bad.push("台账里没有这一行（回填不许凭空造行）");
    if (cur && String(cur.disposition || "").toUpperCase() !== "SHOOT") bad.push("disposition=" + cur.disposition + "（回填只许动身份字段，不许顺手改判决）");
    if (cur && attributable(cur.precondition)) bad.push("这一行的 precondition 已经有可归因的 .identity ⇒ 不许覆盖（要改身份请回源头改判并留痕，不是在这里换写法）");
    const pre = r.precondition;
    if (!pre || typeof pre !== "object" || Array.isArray(pre) || !String(pre.identity || "").trim()) bad.push("新 precondition 不是带非空 .identity 的对象（字符串/数组/\"[object Object]\" 一律不收）");
    else if (IDENT_GARBAGE.test(String(pre.identity).trim())) bad.push("新 .identity 的正文是 \"[object …]\" ⇒ 那还是销毁过的身份，不收");
    /* 顶层 identity 与 precondition.identity 必须同一档（取景分组只读后者）：
       两档冲突时不静默取舍，点名拒写。口径同 emit-frameplan-additions.mjs:103 IDENTITY_CONFLICT。 */
    const normG = (v) => (/guest|游客|未登录|登出|注销/i.test(String(v || "")) ? "guest" : "A");
    if (String(r.identity || "").trim() && pre && normG(r.identity) !== normG(pre.identity)) bad.push(`identity="${r.identity}" 与 precondition.identity="${pre.identity}" 不同档 ⇒ 不许由本工具替你选一个`);
    const auth = String(r.identityAuthority || "").trim();
    const cited = auth.split(/\s+/)[0].replace(/:\d+$/, "");
    if (!auth) bad.push("缺 identityAuthority（身份出处：lane 源头 / 只读复判产物 / 台账行号，逐条点名）");
    else if (!(existsSync(resolve(REPO, cited)) || existsSync(resolve(process.cwd(), cited)))) bad.push("identityAuthority 指的文件盘上不存在：" + cited);
    if (bad.length) { refused.push({ id, why: "回填不合规则：" + bad.join("；") }); continue; }
    backfills.push({
      id, route: cur.route, from: JSON.stringify(cur.precondition).slice(0, 60), to: String(pre.identity),
      precondition: pre, identity: String(pre.identity), authority: auth,
    });
    continue;
  }
  if (!ledgerOpen.has(id)) {
    if (allowedByClassify.has(id)) { viaClassify.push(id); }
    else { refused.push({ id, why: "台账第 6 列不是未收口状态 ⇒ 不许借追加取景行给它换身份（若它被只读复判判成可帧判，带 --classify 出处来）" }); continue; }
  }
  const cur = byId.get(id);
  if (cur) {
    const disp = String(cur.disposition || "").toUpperCase();
    if (disp.startsWith("SHOOT")) { already.push(id + "（已在配方且已是 SHOOT，跳过不动）"); continue; }
    /* 升级需要两样东西：复判出处（--classify 里这行判成 --verdict）+ 人明确说允许（--allow-upgrade）。
       只给其中一个都不算：出处是"谁说这句"，旗标是"我看过并认了"。 */
    if (allowedByClassify.has(id) && has("allow-upgrade") && UPG_ONLY.includes(id)) {
      upgrades.push({
        id, from: cur.disposition, to: "SHOOT", route: r.route, identity: r.identity, frameName: r.frameName,
        precondition: r.precondition, assertionList: [r.assertion],
        upgradeBasis: `只读复判 ${VERDICT}（${CLASSIFY}）+ --allow-upgrade 人放行`,
      });
      continue;
    }
    if (allowedByClassify.has(id) && has("allow-upgrade")) { dropped.push(id + "（复判说可帧判，但我没点它在 --upgrade-only 里 ⇒ 维持 " + cur.disposition + "，这条判决就此留痕）"); continue; }
    refused.push({ id, why: "配方里它是 " + cur.disposition + "（无降级记录 ⇒ 是当初就这么写的）；升回 SHOOT 需要 --classify 出处 + --allow-upgrade + --upgrade-only 三道，缺" + (allowedByClassify.has(id) ? " 旗标/点名" : " 出处") });
    continue;
  }
  wouldAdd.push({
    id, lane: r.lane || "ADDED-stage7", manifest: r.manifest || "ADDED", route: r.route,
    disposition: "SHOOT", addedBy: "scripts/qa/apply-plan-additions.mjs",
    precondition: r.precondition, frameName: r.frameName,
    assertions: 1, assertionList: [r.assertion], steps: [r.assertion],
    crop: r.crop || "full", unresolved: "",
  });
}
console.log(`PLANADD 追加清单=${(add.rows || []).length} 可加=${wouldAdd.length}（其中凭复判出处进来的=${viaClassify.length}）回填身份=${backfills.length} 升级=${upgrades.length} 已在配方=${already.length} 拒绝=${refused.length} 台账未收口=${ledgerOpen.size}`);
for (const a of already) console.log("  已存在 " + a);
for (const d of dropped) console.log("  DROPPED " + d);
for (const u of upgrades) console.log(`  UPGRADE ${u.id} ${u.from} → SHOOT（${u.upgradeBasis}）`);
for (const b of backfills) console.log(`  BACKFILL ${b.id} precondition ${b.from} ⇒ identity="${b.to}"（判决不变、其余字段不动）出处=${b.authority.slice(0, 160)}`);
for (const r of refused) console.log(`  REFUSE ${r.id} :: ${r.why}`);
/* 回填前后的归因读数：这是本模式唯一的收益指标，必须当场打出来，不许等取景腿去发现。 */
const unattrBefore = rows.filter((x) => !attributable(x.precondition)).length;
const unattrAfterExpect = backfills.length ? rows.filter((x) => !(backfilledIds.has(String(x.id || "").trim()) || attributable(x.precondition))).length : unattrBefore;
console.log(`PLANADD_IDENTITY_UNATTRIBUTED 配方=${unattrBefore} 条 ⇒ 回填后应剩 ${unattrAfterExpect} 条（本次点名回填 ${backfills.length} 条）`);
if (refused.length) { console.log("PLANADD_RESULT=FAIL reason=有不合规行 ⇒ 一条都不落盘（半份配方比没有配方更坏）"); process.exit(1); }
if (!wouldAdd.length && !upgrades.length && !backfills.length) { console.log("PLANADD_RESULT=PASS reason=没有需要追加、升级或回填的行（清单里的都已在配方里）"); process.exit(0); }
if (has("dry")) { console.log(`PLANADD_RESULT=DRY 将追加 ${wouldAdd.length} 行：${wouldAdd.map((x) => x.id).join(" ")}｜将回填 ${backfills.length} 行：${backfills.map((x) => x.id).join(" ")}`); process.exit(0); }
/* 落盘前的"其余字段一个都不动"基线：只允许被点名回填的行的 precondition/identity/identityBackfill 变化。 */
const dispBefore = new Map(rows.map((x) => [String(x.id || "").trim(), String(x.disposition || "")]));
const untouchedBefore = new Map(rows.map((x) => [String(x.id || "").trim(), JSON.stringify({ ...x, precondition: undefined, identity: undefined, identityBackfill: undefined })]));
if (upgrades.length) {
  for (const u of upgrades) {
    const cur = plan.rows.find((x) => String(x.id).trim() === u.id);
    if (!cur) { console.log(`PLANADD_RESULT=FAIL reason=升级目标在配方里找不到了 ${u.id}`); process.exit(1); }
    Object.assign(cur, {
      disposition: "SHOOT", upgradedFrom: u.from, upgradeBasis: u.upgradeBasis,
      route: u.route, identity: u.identity, frameName: u.frameName, precondition: u.precondition,
      assertionList: u.assertionList, assertions: 1, steps: u.assertionList,
    });
  }
}
if (backfills.length) {
  for (const b of backfills) {
    const cur = plan.rows.find((x) => String(x.id).trim() === b.id);
    if (!cur) { console.log(`PLANADD_RESULT=FAIL reason=回填目标在配方里找不到了 ${b.id}`); process.exit(1); }
    cur.precondition = b.precondition;
    /* 顶层 identity 与 precondition.identity 同源落一份：配方里原先那个顶层 identity 是 lane 字母
       （实测 scripts/qa/plan-additions-stage8.json 里有 "C"/"E" 两值 ⇒ 它不可能是身份档），留着它只会继续误导人。 */
    cur.identity = b.identity;
    cur.identityBackfill = { from: b.from, authority: b.authority, by: "scripts/qa/apply-plan-additions.mjs --backfill-identity" };
  }
}
plan.rows = rows.map((x) => x).concat(wouldAdd);
plan.addedByStage7 = (plan.addedByStage7 || []).concat(wouldAdd.map((x) => x.id));
writeFileSync(PLAN, JSON.stringify(plan, null, 1));
const recheck = JSON.parse(readFileSync(PLAN, "utf8")).rows || [];
if (recheck.length !== rows.length + wouldAdd.length) { console.log(`PLANADD_RESULT=FAIL reason=落盘后行数不守恒 期望 ${rows.length + wouldAdd.length} 实得 ${recheck.length}`); process.exit(1); }
/* 落盘后回读自证（三条都要成立，否则判 FAIL —— 写坏了要当场知道，不能等取景腿）：
   ① 判决一条都没变（棘轮只降不升，本模式连降都不许做）；
   ② 未被点名的行除 precondition/identity/identityBackfill 外逐字节相同；
   ③ 被点名的行现在过归因判据，且配方里不可归因的总数只减不增。 */
{
  const errs = [];
  for (const x of recheck) {
    const id = String(x.id || "").trim();
    if (!backfilledIds.has(id)) continue;
    if (String(x.disposition || "") !== dispBefore.get(id)) errs.push(`判决被改了 ${id} ${dispBefore.get(id)}→${x.disposition}`);
    if (!attributable(x.precondition)) errs.push(`回读仍不可归因 ${id}`);
    const after = JSON.stringify({ ...x, precondition: undefined, identity: undefined, identityBackfill: undefined });
    if (after !== untouchedBefore.get(id)) errs.push(`回填动了身份以外的字段 ${id}`);
  }
  const unattrAfter = recheck.filter((x) => !attributable(x.precondition)).length;
  if (unattrAfter > unattrBefore) errs.push(`不可归因条数反而变多 ${unattrBefore}→${unattrAfter}`);
  console.log(`PLANADD_VERIFY 判决守恒=${errs.some((e) => e.includes("判决被改了")) ? "NO" : "yes"} 未点名行逐字节不变=${errs.some((e) => e.includes("动了身份以外")) ? "NO" : "yes"} 不可归因 ${unattrBefore} → ${unattrAfter}`);
  if (errs.length) { for (const e of errs) console.log("  ✗ " + e); console.log("PLANADD_RESULT=FAIL reason=落盘后自证不成立"); process.exit(1); }
}
console.log(`PLANADD_WRITTEN=${PLAN} 行数 ${rows.length} → ${recheck.length}（守恒：yes）回填身份=${backfills.length} 行`);
console.log("PLANADD_RESULT=PASS 追加完成；下一步跑 reconcile-frameplan（只降不升）与 reshoot 腿");
process.exit(0);
