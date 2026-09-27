/* ④ 第 1 项裁定（已登录进登录页应落寻觅）的机器载具。
   为什么需要它：执行器只有**游客**落点口径（guestGateVerdict 读 POL.rows），登录态落点没有口径
   ⇒ 「已登录进登录页被产品自己送走」这件事在 A 腿只会得到一条「落在别的页…须人判」的 FAILED，
   每一轮都要人重判一遍，等于裁定没落地。而这一轮的 exec-results.json 里其实已经记着栈顶 route，
   所以本工具不重新占设备，只把已采到的 route 按裁定判一次。
   只做落点半：判据里「全程只 1 次导航 / 无双跳竞争」那一半执行器没有导航事件计数器，量不到 ⇒
   本工具在输出里明说不判，避免这条绿色被读成整条判据过了。
   用法：node scripts/qa/verify-logged-in-landing.mjs --exec reports/audit/round-7/exec-A-mock-stage7
        node scripts/qa/verify-logged-in-landing.mjs --selftest */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf("--" + name);
  if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
  return dflt;
}
function hasFlag(name) { return argv.includes("--" + name); }
const KNOWN = new Set(["exec", "policy", "selftest", "out"]);
for (const a of argv) {
  if (!a.startsWith("--")) continue;
  const k = a.slice(2);
  if (!KNOWN.has(k)) { console.log("LOGINLAND_RESULT=FAIL reason=不认识的旗标 " + a + "（拼错一个字母就会让它不当成 --exec ⇒ 拒绝执行）"); process.exit(2); }
}

/* 把一条 exec 记录的 route 字段归一成"栈顶页"。执行器写的是裸 route，个别历史文件带 "|" 后缀 ⇒ 取最后一段。 */
export function topOf(route) {
  const s = String(route || "").trim();
  if (!s) return "";
  const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

/* 纯函数：裁定 + exec 行 ⇒ 每条裁定一个判决。所有分支都得能被合成数据打到。 */
export function judgeLandings(rows, results) {
  const problems = [];
  const out = [];
  for (const r of rows || []) {
    if (!r || !r.page || !r.landing) { problems.push("loggedInLandings 有一行缺 page/landing，无法判"); continue; }
    const ids = (Array.isArray(r.identity) ? r.identity : ["A", "B"]).map(String);
    const hit = (results || []).filter((x) => x && String(x.page) === r.page);
    const inScope = hit.filter((x) => ids.includes(String(x.identity)));
    const otherId = hit.length - inScope.length;
    const judged = [];
    const noRoute = [];
    for (const x of inScope) {
      const top = topOf(x.route);
      if (!top) noRoute.push(x); else judged.push({ id: String(x.id), top, status: String(x.status || "") });
    }
    const agree = judged.filter((x) => x.top === r.landing);
    const contra = judged.filter((x) => x.top !== r.landing);
    const carrier = (Array.isArray(r.carrierRows) ? r.carrierRows : []).map(String);
    const seenIds = new Set(inScope.map((x) => String(x.id)));
    const ghosts = carrier.filter((id) => !seenIds.has(id));
    const id = "LOG-" + String(r.page).replace(/^subpackages\//, "").replace(/\//g, "-");
    out.push({
      caseId: id, page: r.page, landing: r.landing, identity: ids.join("/"),
      rowsOnPage: hit.length, inScope: inScope.length, otherIdentity: otherId,
      judged: judged.length, agree: agree.length,
      contra: contra.map((x) => x.id + "→" + x.top),
      noRoute: noRoute.map((x) => String(x.id)),
      ghosts,
      doesNotJudge: String(r.doesNotJudge || ""),
    });
    /* 每一条断言都必须真能红：以下 5 个分支各有对应自测样本。 */
    if (!inScope.length) problems.push(`裁定 ${r.page} → ${r.landing}：这一轮身份 ${ids.join("/")} 在这一页一条都没跑 ⇒ 裁定没有测量行，不许算已落地`);
    else if (!judged.length) problems.push(`裁定 ${r.page} → ${r.landing}：${inScope.length} 行全都没记到栈顶 route ⇒ 一条落点证据都没有（不是"落点不对"，是"没量"）`);
    if (contra.length) problems.push(`裁定 ${r.page} → ${r.landing}：这 ${contra.length} 行量到的栈顶不是裁定页 ⇒ 裁定与现网相反，必须人判：${contra.map((x) => x.id + "→" + x.top).join("，")}`);
    if (ghosts.length) problems.push(`裁定 ${r.page} 的 carrierRows 里这些 id 本轮不在这一页的 ${ids.join("/")} 腿上（判据改号或已被别的口径摘走）：${ghosts.join("，")}`);
    /* 没采到落点的行只点名"裁定的载体行没量"这一种：其余（盖章不可自动化、身份收窄被摘走）
       根本没走导航 ⇒ 把它们算成"落点没量"是一条永远红的人工噪声，而不是缺口。 */
    const carrierNoRoute = noRoute.map((x) => String(x.id)).filter((id) => carrier.includes(id));
    if (carrierNoRoute.length) problems.push(`裁定 ${r.page}：点名载体行 ${carrierNoRoute.join("，")} 跑了但没记到栈顶 route ⇒ 落点半没量（不许用别的行的落点替它作证）`);
  }
  return { verdicts: out, problems };
}

function loadResults(p) {
  const abs = resolve(REPO, p);
  if (!existsSync(abs)) { console.log("LOGINLAND_RESULT=FAIL reason=找不到 exec 结果 " + p + "（路径写错不能判成「没有落点证据」）"); process.exit(2); }
  const f = statSync(abs).isDirectory() ? (existsSync(join(abs, "exec-results.json")) ? join(abs, "exec-results.json") : "") : abs;
  if (!f) { console.log("LOGINLAND_RESULT=FAIL reason=" + p + " 是目录但没有 exec-results.json"); process.exit(2); }
  const j = JSON.parse(readFileSync(f, "utf8"));
  return Array.isArray(j) ? j : (j.results || j.rows || []);
}

if (hasFlag("selftest")) {
  const POLICY = [{ page: "pages/login/index", landing: "pages/discover/index", identity: ["A", "B"], carrierRows: ["LG02", "LG03"], doesNotJudge: "导航计数半不判" }];
  const R = (id, identity, route, status) => ({ id, page: "pages/login/index", identity, route, status: status || "EXECUTED" });
  const cases = [
    { n: "A 腿量到裁定页 ⇒ 判绿且无问题（两条点名行都得在场）", j: judgeLandings(POLICY, [R("LG02", "A", "pages/discover/index"), R("LG03", "A", "pages/discover/index")]), bad: (x) => x.problems.length !== 0 || x.verdicts[0].agree !== 2 },
    { n: "量到第三页 ⇒ 必须红（这是真发现，不是噪声）", j: judgeLandings(POLICY, [R("LG02", "A", "pages/home/index")]), bad: (x) => !x.problems.some((p) => p.includes("裁定与现网相反")) },
    { n: "一条测量行都没有 ⇒ 红（不许把「没人跑」读成「没问题」）", j: judgeLandings(POLICY, []), bad: (x) => !x.problems.some((p) => p.includes("一条都没跑")) },
    { n: "有行但 route 全空 ⇒ 红并说清是「没量」而不是「量错」", j: judgeLandings(POLICY, [R("LG02", "A", "")]), bad: (x) => !x.problems.some((p) => p.includes("没量")) },
    { n: "carrierRows 点了本轮不存在的 id ⇒ 红（幽灵指针）", j: judgeLandings(POLICY, [R("LG02", "A", "pages/discover/index")]), bad: (x) => !x.problems.some((p) => p.includes("carrierRows")) || x.verdicts[0].ghosts.join(",") !== "LG03" },
    { n: "别的身份（guest）的行不算证据，且因此缺了 A 侧点名行仍要红", j: judgeLandings(POLICY, [R("LG02", "A", "pages/discover/index"), R("LG03", "guest", "pages/discover/index")]), bad: (x) => x.verdicts[0].inScope !== 1 || x.verdicts[0].otherIdentity !== 1 || x.problems.length !== 1 || !x.problems[0].includes("carrierRows") },
    { n: "route 带竖线后缀也要能归一", j: judgeLandings(POLICY, [{ id: "LG02", page: "pages/login/index", identity: "A", route: "stack|pages/discover/index" }]), bad: (x) => x.verdicts[0].agree !== 1 },
    { n: "点名载体行跑了却没量到落点 ⇒ 红（不许借别人的落点作证）", j: judgeLandings(POLICY, [R("LG02", "A", "pages/discover/index"), R("LG03", "A", "")]), bad: (x) => !x.problems.some((p) => p.includes("点名载体行 LG03")) },
    { n: "非载体行没量（盖章不可自动化那一族）⇒ 不算落点缺口", j: judgeLandings(POLICY, [R("LG02", "A", "pages/discover/index"), R("LG03", "A", "pages/discover/index"), R("LG11", "A", "")]), bad: (x) => x.problems.length !== 0 || x.verdicts[0].noRoute.join(",") !== "LG11" },
  ];
  const bad = cases.filter((c) => !!c.bad(c.j));
  for (const c of cases) console.log((c.bad(c.j) ? "  BAD" : "  ok ") + c.n);
  console.log("LOGINLAND_SELFTEST=" + (bad.length ? "FAIL" : "PASS") + " cases=" + cases.length + " bad=" + bad.length);
  process.exit(bad.length ? 1 : 0);
}

const POL_PATH = arg("policy", "scripts/qa/guest-landing-policy.json");
const POL = JSON.parse(readFileSync(resolve(REPO, POL_PATH), "utf8"));
const ROWS = POL.loggedInLandings || [];
if (!ROWS.length) { console.log("LOGINLAND_RESULT=FAIL reason=" + POL_PATH + " 里没有 loggedInLandings ⇒ ④ 的登录态落点裁定还没有口径（不许静默跳过）"); process.exit(2); }
const execArgs = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === "--exec" && argv[i + 1]) execArgs.push(argv[++i]);
if (!execArgs.length) { console.log("LOGINLAND_RESULT=FAIL reason=没给 --exec（要判哪几轮的执行结果）⇒ 不猜默认，避免读到上一轮的旧结果冒充本轮"); process.exit(2); }
let all = [];
for (const p of execArgs) all = all.concat(loadResults(p));
const { verdicts, problems } = judgeLandings(ROWS, all);
for (const v of verdicts) {
  console.log(`LOGINLAND ${v.caseId} page=${v.page} 裁定落点=${v.landing} 身份=${v.identity} 本页行=${v.rowsOnPage} 在范围=${v.inScope}（别的身份 ${v.otherIdentity} 行不作证） 采到落点=${v.judged} 与裁定一致=${v.agree} 相反=${v.contra.length} 没采到=${v.noRoute.length} 点名行未出现=${v.ghosts.length ? v.ghosts.join(",") : "无"}`);
  if (v.doesNotJudge) console.log("LOGINLAND_NOT_JUDGED " + v.caseId + " :: " + v.doesNotJudge);
}
const sum = { rows: verdicts.reduce((a, v) => a + v.rowsOnPage, 0), judged: verdicts.reduce((a, v) => a + v.judged, 0), agree: verdicts.reduce((a, v) => a + v.agree, 0) };
console.log(`LOGINLAND rows=${all.length} 裁定数=${verdicts.length} 本页行次合计=${sum.rows} 采到落点=${sum.judged} 一致=${sum.agree}`);
/* 守恒：judged 必须 == agree + contra，否则说明有一个分支没把行分完（数对不上就是工具坏了，不是产品坏了）。 */
const contraTotal = verdicts.reduce((a, v) => a + v.contra.length, 0);
if (sum.judged !== sum.agree + contraTotal) problems.push(`守恒破：采到落点 ${sum.judged} ≠ 一致 ${sum.agree} + 相反 ${contraTotal}`);
const dup = verdicts.map((v) => v.caseId).filter((x, i, a) => a.indexOf(x) !== i);
if (dup.length) problems.push("caseId 撞号：" + dup.join("，") + "（一页两号会让复测腿归属不清）");
if (problems.length) {
  for (const p of problems) console.log("LOGINLAND_PROBLEM :: " + p);
  console.log("LOGINLAND_RESULT=FAIL problems=" + problems.length);
  process.exit(2);
}
console.log("LOGINLAND_RESULT=PASS —— 落点半与裁定一致；导航计数半本载具不判（见上面 LOGINLAND_NOT_JUDGED）");
