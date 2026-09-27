#!/usr/bin/env node
/* 给 ops 用例标 identities：把"这条判据的前置是登录态"这件事从人脑里的共识变成数据。

 为什么要有：游客在 26 组页面上被弹回登录页是**裁定要求**（guest-landing-policy.json），
 但执行轮仍会把那些页上的每一条判据都拿来在游客档跑一次，于是每轮都产出几十条
 "落在别的页 ⇒ FAILED"。它们既不是产品缺陷也不该被算成通过——它们根本不该由游客这一腿来判。
 现在 r-exec-cli 已会把这类行标注成"与裁定一致"（RUNNER_GUEST_GATE），但那是**解释**；
 标了 identities 才是**不再认领**。

 三条规矩：
  1. 只标"页在落点裁定表里"的 case；不在表里的页一条都不动（游客本来就能逛的页不能被摘掉）。
  2. 判据文本自己提到 游客/未登录/not-logged/弹回/引导 的 case **一律不标**——
     那些正是"游客档该测闸门"的条目，摘掉它们等于把唯一有效的断言删了。
  3. 守恒：标掉的 + 保留的 = 原有总数，且不动任何别的字段；--apply 之前一律只出计划。

 用法：node scripts/qa/tag-ops-identity-scope.mjs            # 干跑，只出统计与样例
      node scripts/qa/tag-ops-identity-scope.mjs --apply     # 真写
      node scripts/qa/tag-ops-identity-scope.mjs --selftest  # 判定纯函数自测（不碰盘）
*/
import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d; };
{
  const KNOWN = ["apply", "selftest", "ops"];
  const bad = process.argv.slice(2).filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log("IDSCOPE_RESULT=FAIL reason=不认识的旗标 " + bad.join(",") + "（拼错一个字母就会让 --apply 变成普通 dry ⇒ 拒绝执行）"); process.exit(2); }
}
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const APPLY = process.argv.includes("--apply");

/* 判据文本里出现这些词 ⇒ 这条本来就在断言游客/闸门行为，必须留在游客腿 */
const GUEST_RELEVANT = /游客|未登录|not-logged|弹回|引导|登录墙|LockScreen|lock-screen/i;

/** 这条 case 是否应当只在登录身份下跑？纯函数，便于自测。 */
export function shouldScopeToLogin(caseObj, page, landings) {
  if (!landings.has(page)) return false;
  const text = [caseObj.title, caseObj.action, caseObj.expected, caseObj.pre, caseObj.evidence]
    .map((x) => String(x || "")).join(" ");
  if (GUEST_RELEVANT.test(text)) return false;
  return true;
}

if (process.argv.includes("--selftest")) {
  const L = new Map([["subpackages/village/village/index", "pages/login/index"]]);
  const cases = [
    { n: "表内页 + 判据讲内容 ⇒ 标 A", got: shouldScopeToLogin({ action: "观察帖子流", expected: "出现帖子卡" }, "subpackages/village/village/index", L), want: true },
    { n: "表内页 + 判据讲游客闸门 ⇒ 不标", got: shouldScopeToLogin({ action: "游客进入", expected: "应弹回登录页" }, "subpackages/village/village/index", L), want: false },
    { n: "表内页 + 判据讲 LockScreen ⇒ 不标（那是未登录态自己的东西）", got: shouldScopeToLogin({ action: "观察", expected: "渲染 LockScreen" }, "subpackages/village/village/index", L), want: false },
    { n: "表外页 ⇒ 一条都不标", got: shouldScopeToLogin({ action: "观察", expected: "出现卡片" }, "pages/home/index", L), want: false },
    { n: "裁定表为空 ⇒ 一条都不标", got: shouldScopeToLogin({ action: "观察", expected: "出现卡片" }, "subpackages/village/village/index", new Map()), want: false },
  ];
  const bad = cases.filter((c) => !!c.got !== c.want);
  for (const c of cases) console.log((!!c.got === c.want ? "  ok " : "  BAD") + c.n + " got=" + !!c.got + " want=" + c.want);
  console.log("IDSCOPE_SELFTEST=" + (bad.length === 0 ? "PASS" : "FAIL") + " cases=" + cases.length + " bad=" + bad.length);
  process.exit(bad.length ? 1 : 0);
}

const POL = JSON.parse(readFileSync(resolve(REPO, "scripts/qa/guest-landing-policy.json"), "utf8"));
const LANDINGS = new Map();
for (const r of POL.rows || []) if (r && r.page && r.landing) LANDINGS.set(r.page, r.landing);
if (!LANDINGS.size) { console.log("IDSCOPE_RESULT=FAIL reason=裁定表为空，无法界定范围（不写盘）"); process.exit(2); }

/* 标了字段却没人读 = 装饰。落盘前先机器核对执行器确实消费了 identities，
   否则这一轮收口写的就是"上一轮没收口"的那个形状（§104.3 同一族）。 */
{
  const exec = readFileSync(resolve(REPO, "scripts/qa/r-exec-cli.mjs"), "utf8");
  const reads = /function identityScopeSkip\(/.test(exec) && /c\.identities/.test(exec) && /identityScopeSkip\(c, IDENTITY\)/.test(exec);
  if (!reads) { console.log("IDSCOPE_RESULT=FAIL reason=r-exec-cli.mjs 里没有 identityScopeSkip 的调用点 ⇒ identities 标了也没人读，不写盘"); process.exit(2); }
  console.log("IDSCOPE_CONSUMER=OK r-exec-cli.mjs 认 c.identities（跳过会出一行 SKIPPED，不是消失）");
}

let total = 0, tagged = 0, keptGuest = 0, untagged = 0, files = 0, dirTotal = 0, inTable = 0;
const samples = [];
for (const f of readdirSync(OPS).filter((x) => x.endsWith(".json")).sort()) {
  const p = join(OPS, f);
  const j = JSON.parse(readFileSync(p, "utf8"));
  const cs = j.cases || [];
  dirTotal += cs.length;
  const before = JSON.stringify(j);
  for (const c of cs) {
    total++;
    if (shouldScopeToLogin(c, c.page, LANDINGS)) {
      /* 判据的前置是"有登录态"，A 与 B 两个账号都满足；只写 ["A"] 会把 B 腿也一起摘掉，
         而裁定讲的是游客，不是第二个账号。 */
      c.identities = ["A", "B"];
      c.identitiesFrom = "tag-ops-identity-scope.mjs";
      c.identitiesWhy = "页在 guest-landing-policy.json 的落点裁定表里（" + c.page + " → " + LANDINGS.get(c.page) + "），且判据文本不涉游客/闸门 ⇒ 前置是登录态";
      tagged++;
      if (samples.length < 12) samples.push(f + "|" + c.id + " " + String(c.page) + " :: " + String(c.expected || c.action || "").slice(0, 46));
    } else if (c.page && LANDINGS.has(c.page)) {
      keptGuest++;
      if (Array.isArray(c.identities) && c.identities.join(",") === "A") {
        /* 上一版误标过（只写 ["A"] 会连 B 腿一起摘掉）、这一版按文本判定该留在游客腿 ⇒ 撤销标记，
           别让一次错判永久生效。 */
        delete c.identities; delete c.identitiesFrom; delete c.identitiesWhy;
        untagged++;
      }
    }
    /* 独立数一遍"页在裁定表里"的用例：守恒式要用它来核对上面那两个分支没有漏没有重，
       所以它必须在分支之外自己走一遍（在分支里累加就又是恒等式了）。 */
    if (c.page && LANDINGS.has(c.page)) inTable++;
  }
  /* 落盘判据用"整份 JSON 是否真的变了"，不用手搓的 changed 计数：
     幂等复跑时字段值与正文完全一致 ⇒ 一个文件都不该被重写（也不该被算成"改过"）。 */
  if (APPLY && JSON.stringify(j) !== before) {
    files++;
    let bak = p + ".pre-identity-scope.bak", n = 1;
    while (existsSync(bak)) { n++; bak = p + ".pre-identity-scope." + n + ".bak"; }
    copyFileSync(p, bak);
    writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  }
}
const EXPECT_TOTAL = 1107;
const problems = [];
/* 独立数一遍"页在裁定表里"的用例 ⇒ 上面那两个分支必须正好把它分完，不多不少。 */
if (dirTotal !== total) problems.push("遍历到的用例数 " + total + " ≠ 目录 cases 之和 " + dirTotal + "（有文件被跳过）");
if (total !== EXPECT_TOTAL) problems.push("判据台总数=" + total + " ≠ " + EXPECT_TOTAL + " ⇒ 本工具只加字段不改条目，数对不上说明另有写者");
if (tagged + keptGuest !== inTable) problems.push("裁定表页上的用例 " + inTable + " ≠ 收窄 " + tagged + " + 保留游客 " + keptGuest + " ⇒ 有两个分支都没走到的 case");
let recheck = "";
if (APPLY) {
  /* 落盘后立刻复读：报的是"盘上现在有多少条"，不是"我以为我写了多少条"。 */
  let on = 0, cnt = 0;
  for (const f of readdirSync(OPS).filter((x) => x.endsWith(".json")).sort()) {
    const jj = JSON.parse(readFileSync(join(OPS, f), "utf8"));
    cnt += (jj.cases || []).length;
    for (const c of jj.cases || []) if (Array.isArray(c.identities) && c.identities.join(",") === "A,B") on++;
  }
  recheck = "｜复读 已标 A,B 的用例=" + on + "（计划=" + tagged + "）目录用例=" + cnt;
  if (cnt !== EXPECT_TOTAL) problems.push("复读后目录用例数=" + cnt + " ≠ " + EXPECT_TOTAL + " ⇒ 落盘动到了条目数");
  if (on !== tagged) problems.push("复读已标数 " + on + " ≠ 本轮应标 " + tagged + "（差 " + (on - tagged) + "）⇒ 有文件的写没落上");
}
console.log("IDSCOPE_PAGES_WITH_RULING=" + LANDINGS.size);
console.log("IDSCOPE total=" + total + " 裁定表页上的用例=" + inTable + " 收窄为登录态腿(A/B)=" + tagged + " 表内页但保留游客=" + keptGuest + " 撤销误标=" + untagged + " 改写文件=" + files + recheck);
for (const s of samples) console.log("  例 " + s);
if (problems.length) { for (const p of problems) console.log("  PROBLEM " + p); console.log("IDSCOPE_RESULT=FAIL reason=守恒不成立（" + (APPLY ? "已落盘的改动可从 *.pre-identity-scope*.bak 回滚" : "不写盘") + "）"); process.exit(2); }
console.log(APPLY ? "IDSCOPE_RESULT=APPLIED" : "IDSCOPE_RESULT=DRY（加 --apply 才落盘）");
