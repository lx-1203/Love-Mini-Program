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

/* #51 的另一半：有些页的前置反过来是「未登录」——已登录会话会被产品自己送走
   （登录页 onShow 自动前进到寻觅），于是这一页的表单类判据在 A 档永远只能得到
   「本页没落在声明页」。不收窄就得每一轮重吃几十条噪声，而收窄过头又会把
   "已登录应自动前进"这类**真的 A 侧判点**一起摘掉。
   口径按**前置**而不是按"文本提没提导航词"：实测 pages/login/index 38 行里，
   用 自动前进/redirect 当保留条件会留下 6 条假 A 侧行（LG01 冷启动清登录态、LG08 协议链接、
   LG10 401 兜底、LG21/LG22 登录成功导航、LG37 幽灵参数）——它们的 redirect 全部来自
   storage 键名 pending-login-redirect 或"断言不被 redirect 消费"，前置仍是未登录。
   ⇒ 只有明说「已登录 / isLoggedIn=true」的行才有资格留在登录腿。 */
const A_SIDE_RE = /已登录|isLoggedIn\s*={1,3}\s*true/;
export function shouldScopeToGuestOnly(caseObj, page, loggedOut) {
  const r = loggedOut && loggedOut.get ? loggedOut.get(page) : null;
  if (!r) return false;
  /* 点名保留优先于文本推断：LG03「重复进出登录页 ×2 每次都自动前进」的前置真是已登录，
     但判据正文只写了"新实例""自动前进"⇒ 纯关键词会把它误收进游客腿，而游客腿必然得到
     「停在登录页不动」⇒ 又变成一条我自己造出来的假红。裁定里点过名的行不靠猜。 */
  const byName = (Array.isArray(r.keepOnLoginLegIds) ? r.keepOnLoginLegIds : []).map(String);
  if (byName.includes(String(caseObj.id))) return false;
  const text = [caseObj.title, caseObj.action, caseObj.expected, caseObj.pre, caseObj.evidence]
    .map((x) => String(x || "")).join(" ");
  return !A_SIDE_RE.test(text);
}

if (process.argv.includes("--selftest")) {
  const L = new Map([["subpackages/village/village/index", "pages/login/index"]]);
  const LOG = new Map([["pages/login/index", { page: "pages/login/index", reason: "自测用反向页", keepOnLoginLegIds: ["LG03"] }]]);
  const cases = [
    { n: "表内页 + 判据讲内容 ⇒ 标 A", got: shouldScopeToLogin({ action: "观察帖子流", expected: "出现帖子卡" }, "subpackages/village/village/index", L), want: true },
    { n: "表内页 + 判据讲游客闸门 ⇒ 不标", got: shouldScopeToLogin({ action: "游客进入", expected: "应弹回登录页" }, "subpackages/village/village/index", L), want: false },
    { n: "表内页 + 判据讲 LockScreen ⇒ 不标（那是未登录态自己的东西）", got: shouldScopeToLogin({ action: "观察", expected: "渲染 LockScreen" }, "subpackages/village/village/index", L), want: false },
    { n: "表外页 ⇒ 一条都不标", got: shouldScopeToLogin({ action: "观察", expected: "出现卡片" }, "pages/home/index", L), want: false },
    { n: "裁定表为空 ⇒ 一条都不标", got: shouldScopeToLogin({ action: "观察", expected: "出现卡片" }, "subpackages/village/village/index", new Map()), want: false },
    { n: "反向页（登录页）+ 表单判据 ⇒ 收进游客腿", got: shouldScopeToGuestOnly({ action: "点 .btn-phone-quick 展开表单", expected: "出现手机号输入框" }, "pages/login/index", LOG), want: true },
    { n: "反向页 + 判据讲「已登录自动前进」⇒ 必须留在登录腿（不收窄）", got: shouldScopeToGuestOnly({ action: "已登录进登录页", expected: "自动 switchTab 到 discover" }, "pages/login/index", LOG), want: false },
    { n: "反向页 + 前置写 isLoggedIn=true ⇒ 留在登录腿", got: shouldScopeToGuestOnly({ pre: "isLoggedIn=true 时 reLaunch 到本页" }, "pages/login/index", LOG), want: false },
    { n: "反向页 + 只提 redirect 键名（storage pending-login-redirect）⇒ 前置仍是未登录，收窄", got: shouldScopeToGuestOnly({ expected: "读取 storage 的 pending-login-redirect 键，页面不消费 redirect 参数" }, "pages/login/index", LOG), want: true },
    { n: "反向页 + 讲「清登录态冷启动」⇒ 未登录前置，收窄（假 A 侧行：LG01 那一族）", got: shouldScopeToGuestOnly({ title: "清登录态冷启动落登录页，协议默认未勾选", expected: "等待首帧后自动前进说明写在备注里" }, "pages/login/index", LOG), want: true },
    { n: "反向页 + 裁定点名的 id（正文无已登录关键词）⇒ 仍不收窄（LG03 那一族）", got: shouldScopeToGuestOnly({ id: "LG03", title: "重复进出登录页 ×2：每次新实例均自动前进且均为单跳" }, "pages/login/index", LOG), want: false },
    { n: "同样正文但没被点名的 id ⇒ 收窄（证明上一例是靠点名而不是靠正文）", got: shouldScopeToGuestOnly({ id: "LG99", title: "重复进出登录页 ×2：每次新实例均自动前进且均为单跳" }, "pages/login/index", LOG), want: true },
    { n: "不在反向名单里的页 ⇒ 一条都不收进游客腿", got: shouldScopeToGuestOnly({ action: "点 .a-b", expected: "出现卡片" }, "pages/home/index", LOG), want: false },
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
/* 反向页（已登录不能停留）与它必须留在 A 档的余量：名单为空也照常跑（只是这一半规则不生效）。 */
const LOGGED_OUT = new Map();
for (const r of POL.loggedOutOnly || []) if (r && r.page) LOGGED_OUT.set(r.page, r);
const keptForLoginLeg = new Map();
/* 裁定里点名的"必须留在登录腿"的行：点名比关键词可靠，但点名的 id 必须真的存在，
   否则它就是上一条幽灵指针（上一轮判据台改号后，名单会静默失效）。 */
const keepIdSeen = new Map();

/* 标了字段却没人读 = 装饰。落盘前先机器核对执行器确实消费了 identities，
   否则这一轮收口写的就是"上一轮没收口"的那个形状（§104.3 同一族）。 */
{
  const exec = readFileSync(resolve(REPO, "scripts/qa/r-exec-cli.mjs"), "utf8");
  const reads = /function identityScopeSkip\(/.test(exec) && /c\.identities/.test(exec) && /identityScopeSkip\(c, IDENTITY\)/.test(exec);
  if (!reads) { console.log("IDSCOPE_RESULT=FAIL reason=r-exec-cli.mjs 里没有 identityScopeSkip 的调用点 ⇒ identities 标了也没人读，不写盘"); process.exit(2); }
  console.log("IDSCOPE_CONSUMER=OK r-exec-cli.mjs 认 c.identities（跳过会出一行 SKIPPED，不是消失）");
}

let total = 0, tagged = 0, keptGuest = 0, untagged = 0, files = 0, dirTotal = 0, inTable = 0, guestOnly = 0;
const samples = [];
for (const f of readdirSync(OPS).filter((x) => x.endsWith(".json")).sort()) {
  const p = join(OPS, f);
  const j = JSON.parse(readFileSync(p, "utf8"));
  const cs = j.cases || [];
  dirTotal += cs.length;
  const before = JSON.stringify(j);
  for (const c of cs) {
    total++;
    if (shouldScopeToGuestOnly(c, c.page, LOGGED_OUT)) {
      c.identities = ["guest"];
      c.identitiesFrom = "tag-ops-identity-scope.mjs";
      c.identitiesWhy = "页在 policy 的 loggedOutOnly 名单里（" + c.page + "）：" + String((LOGGED_OUT.get(c.page) || {}).reason || "").slice(0, 200);
      guestOnly++;
      if (samples.length < 12) samples.push(f + "|" + c.id + " " + String(c.page) + " :: 收窄为游客腿 :: " + String(c.expected || c.action || "").slice(0, 40));
    } else if (shouldScopeToLogin(c, c.page, LANDINGS)) {
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
    /* 反向页的余量核对：收窄之后这一页必须还剩至少一条能被登录腿跑的行，
       否则"已登录进登录页会怎样"这件事在本轮就彻底没人判了（那是 ④ 的一条裁定）。 */
    if (c.page && LOGGED_OUT.has(c.page) && !(Array.isArray(c.identities) && c.identities.length === 1 && c.identities[0] === "guest")) {
      keptForLoginLeg.set(c.page, (keptForLoginLeg.get(c.page) || 0) + 1);
      const named = (Array.isArray((LOGGED_OUT.get(c.page) || {}).keepOnLoginLegIds) ? (LOGGED_OUT.get(c.page) || {}).keepOnLoginLegIds : []).map(String);
      if (named.includes(String(c.id))) {
        if (!keepIdSeen.has(c.page)) keepIdSeen.set(c.page, new Set());
        keepIdSeen.get(c.page).add(String(c.id));
      }
    }
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
for (const [page, rr] of LOGGED_OUT) {
  const kept = keptForLoginLeg.get(page) || 0;
  console.log(`IDSCOPE_LOGGED_OUT ${page} 仍由登录腿跑=${kept}（依据 policy.loggedOutOnly：${String((LOGGED_OUT.get(page) || {}).carriesRuling || "")}）`);
  if (!kept) problems.push(`反向页 ${page} 的行被全部收进游客腿 ⇒ 登录腿在这一页一条都不跑，"已登录进这一页会怎样"从此没人判（这一页是 ④ 的裁定载体，不许量成零覆盖）`);
  const named = (Array.isArray(rr.keepOnLoginLegIds) ? rr.keepOnLoginLegIds : []).map(String);
  const seen = keepIdSeen.get(page) || new Set();
  const ghosts = named.filter((id) => !seen.has(id));
  if (named.length) console.log(`IDSCOPE_KEEP_NAMED ${page} 点名=${named.length} 实际留在登录腿=${seen.size} 幽灵=${ghosts.length ? ghosts.join(",") : "无"}`);
  if (ghosts.length) problems.push(`反向页 ${page} 的 keepOnLoginLegIds 里这些 id 没能在登录腿留下（判据不存在或已被上一版误收窄）：${ghosts.join(",")} ⇒ 名单是幽灵指针，不写盘`);
}
console.log("IDSCOPE total=" + total + " 裁定表页上的用例=" + inTable + " 收窄为登录态腿(A/B)=" + tagged + " 表内页但保留游客=" + keptGuest + " 收窄为游客腿(guest)=" + guestOnly + " 撤销误标=" + untagged + " 改写文件=" + files + recheck);
for (const s of samples) console.log("  例 " + s);
if (problems.length) { for (const p of problems) console.log("  PROBLEM " + p); console.log("IDSCOPE_RESULT=FAIL reason=守恒不成立（" + (APPLY ? "已落盘的改动可从 *.pre-identity-scope*.bak 回滚" : "不写盘") + "）"); process.exit(2); }
console.log(APPLY ? "IDSCOPE_RESULT=APPLIED" : "IDSCOPE_RESULT=DRY（加 --apply 才落盘）");
