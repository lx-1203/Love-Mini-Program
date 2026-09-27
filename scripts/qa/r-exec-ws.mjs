/* round-7 执行轮 · 混合传输版（WS 取证据 + CLI 桥出帧）。
 *
 * 为什么混合，全是这一小时里量出来的（notes §15 + diag-two-windows 的实测表）：
 *   · 桥的 routeStack（走 automation_evaluate）刚才 4 个页里 0 个给出答案（两个"空"、两个 ERR），
 *     而同一段时间里 WS 的 currentPage() 3/4 给了正确答案 ⇒ 落点探针换 WS。
 *   · WS 单条 page.$ 6.6–8.1ms，12 条并发 31ms；桥的折叠探针 210ms/条 ⇒ 判点换 WS。
 *   · 出帧不许换：WS 的 screenshot 实测 61s/张且 5 次里 2 次超时，桥是 2.6s/张。
 *
 * 记账口径与 r-exec-cli.mjs 保持一致：一条 EXECUTED 必须要么有帧、要么至少有一个探针答案；
 * 判据里既没点名类名也不要求出帧的记 SKIPPED（不是 EXECUTED）。
 *
 * 用法：
 *   node scripts/qa/r-exec-ws.mjs --fidelity <MANIFEST>   # 先做保真对照，不一致就别当默认
 *   node scripts/qa/r-exec-ws.mjs [--only M1,M2] [--limit N] [--redo-holes]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync, rmSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { guardUiLease } from "./ui-lease.mjs";
/* 端口来源与 ws-channel-up / shoot-frameplan 同一份实现（配置文件 scripts/qa/ide-port.json 优先，
   env 只做显式覆盖，读不到才回落且留痕）。此前这里是 `process.env.WSX_PORT || "9420"`，
   即"配置文件存在但这个消费者不认它"。 */
import { readIdePort } from "./ide-port-config.mjs";
const IDE_WS_PORT = readIdePort().port;

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const { openPage, shot, evaluate, mintToken, bootSession, verifyLogin } = await import("./cli-automator.mjs");

const argv = process.argv.slice(2);
function opt(n, d) { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; }
function flag(n) { return argv.includes("--" + n); }
const PROJECT = opt("project", join(REPO, "apps/client/dist/build/mp-weixin"));
/* 身份必须被机器断言并写进结果，不能靠"上一个进程留下的 storage 状态"——
   桥版执行器就是因为把 mintToken 的返回值当字符串用（忘了 await）才让真实模式整批 not-logged-in，
   详见 scripts/qa/probe-boot-callsite.mjs。这里不做同样的假设。 */
const IDENTITY = opt("identity", "A");
let LOGIN_VERIFY = "(未前置)";
const LABEL = opt("round", "round-7");
const OPS = opt("ops", join(REPO, "reports/audit/round-6/ops"));
/* --ids-file：只跑名单里的 case（一行一个 `MANIFEST#ID` 或 `MANIFEST/ID`，也收 {"cases":[...]}）。
   为什么要有它：SEL_COMPONENT_SCOPE 那批（本轮实测 193 条）元素躲在自定义组件里，CLI 腿按该门
   自己的实测有 90.6% 点不动 ⇒ 只有 WS 腿能点；但在 WS 腿上重跑整轮 1107 例不叫"补这一刀"，叫重来一轮。
   名单必须给守恒读数：没在语料里找到的逐条点名，静默少跑就等于假覆盖。 */
const IDS_FILE = opt("ids-file", "");
let IDS = null;
const idsSeen = new Set();
const OUT_DIR = opt("out", join(REPO, "reports/audit", LABEL, "interact"));
const RES = join(OUT_DIR, "exec-results.json");
function git(a) { try { return execFileSync("git", a.split(" "), { cwd: REPO, encoding: "utf8" }).trim(); } catch { return ""; } }
const GIT_SHA = git("rev-parse --short HEAD") || "unknown";
/* 取景目录默认带上仓库 sha：同一轮里重建过产物再跑，帧会落到新目录，
   而不是按 MANIFEST-ID-after.png 同名把上一批覆盖掉（§19 就是这么丢的证据）。
   要跨产物共用一个目录，显式传 --shots。 */
const SHOT_DIR = opt("shots", join(REPO, "reports/screenshots", LABEL + "-exec-" + GIT_SHA.slice(0, 8)));
const ONLY = (opt("only", "") || "").split(",").filter(Boolean);
const LIMIT = Number(opt("limit", "0"));
const FIDELITY = opt("fidelity", "");
const TAP_MODE = flag("tap");
/* 真实模式跑的时候不能再以 requiresReal 为由跳过——那 236 条正是真实刀唯一能还的债。
   （requiresReal=false 的用例在真实产物里照样会跑，跑挂就如实记，不预先豁免。） */
const REAL_MODE = flag("real");
const TAP_SETTLE = Number(opt("tap-settle", "1400"));
const FRAME_RE = /截图|全帧|出帧|特写|帧/;
const TAP_RE = /点击|输入|滑动|滚动|长按|拖|tap|click|input|scroll|swipe|trigger/;
const BOOT_T = Date.now();

function relOf(p) { return relative(REPO, p).split("\\").join("/"); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function automator() {
  try { return require("miniprogram-automator"); } catch { /* fallthrough */ }
  const store = join(REPO, "node_modules", ".pnpm");
  const hit = readdirSync(store).filter((d) => d.startsWith("miniprogram-automator@")).sort()[0];
  return hit ? require(join(store, hit, "node_modules", "miniprogram-automator")) : null;
}
const A = automator();
if (!A) { console.log("WSX_RESULT=FAIL reason=找不到 miniprogram-automator"); process.exit(2); }

let mini = null, conns = 0, wsErrs = 0;
async function sess() {
  if (mini) return mini;
  mini = await Promise.race([A.connect({ wsEndpoint: "ws://127.0.0.1:" + IDE_WS_PORT }),
    new Promise((_, rj) => setTimeout(() => rj(new Error("CONNECT_TIMEOUT_8S")), 8000))]);
  conns++;
  return mini;
}
/* WS 会话是单点的：一次断线不能把整轮带走，也不能把已跑的行丢掉（每页组落盘见 flush）。
   注意：绝不 close()——实测 close 会把 9420 那个 IDE 子进程整个带走。 */
async function withRetry(label, fn) {
  for (let a = 0; a < 2; a++) {
    try { const m = await sess(); return await fn(m); }
    catch (e) {
      wsErrs++;
      mini = null;
      if (a === 1) { console.log("WSX_RETRY_FAIL " + label + " :: " + String(e && e.message).slice(0, 80)); return undefined; }
      console.log("WSX_RETRY " + label + " :: " + String(e && e.message).slice(0, 80));
      await sleep(1200);
    }
  }
  return undefined;
}
async function wsRoute() {
  return await withRetry("currentPage", async (m) => { const p = await m.currentPage(); return (p && p.path) || ""; });
}
/* 一个页组只取一次 page 句柄，别每条选择器都重新 currentPage()。
   实测反面教材：把 12 条选择器并发打出去（=24 条并发命令 + 失败重试风暴），
   IDE 的自动化服务直接全线 "timeout waiting for automator response"，12/12 全灭；
   而串行版实测 6.6–8.1ms/条。并发在这条通道上没有收益，只有把通道打死的代价。 */
async function wsPage() {
  return await withRetry("page", async (m) => await m.currentPage());
}
/* 身份前置走 WS 而不是走桥：探针、tap 都发生在这个会话里，用另一条通道写 storage
   等于"在隔壁房间点灯，却说这边亮了"。evaluate 传函数 + 参数，automator 会序列化。 */
async function wsBootSession(token) {
  return await withRetry("bootSession", async (m) => await m.evaluate((t) => {
    try {
      wx.setStorageSync("token", t);
      var app = getApp(); var vm = app["$vm"];
      var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
      var p = vm["$pinia"] || gp["$pinia"];
      var s = p._s.get("session"); if (s && s.bootstrap) { s.bootstrap(); }
      return "boot-ok";
    } catch (e) { return "ERR " + e.message; }
  }, token));
}
async function wsVerifyLogin() {
  return await withRetry("verifyLogin", async (m) => await m.evaluate(() => {
    try {
      var app = getApp(); var vm = app["$vm"];
      var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
      var p = vm["$pinia"] || gp["$pinia"]; var s = p._s.get("session");
      return s && s.isLoggedIn ? "logged-in userId=" + (s.userSession && s.userSession.userId) : "not-logged-in";
    } catch (e) { return "ERR " + e.message; }
  }));
}
/* 交互切片用：WS 的元素.tap()。不可逆的账号级动作（注销/解绑/清空）先禁触——
   不是为了把红的藏起来，而是这类动作会把后面几百条用例共用的会话打掉，
   那一次跑就只剩下"注销成功"这一帧；被禁的条目一律显式记 SKIPPED-DENY，不混进已跑。 */
const DENY_TAP = /注销|解绑|清空|删除账号|删除帐号|退出登录|登出/;
async function wsTap(sel) {
  return await withRetry("tap " + sel, async (m) => {
    const p = await m.currentPage();
    const el = await p.$(sel);
    if (!el) return "NO_ELEMENT";
    await el.tap();
    return "tapped";
  });
}
function classesOf(text) {
  const seen = new Set();
  for (const m of String(text || "").matchAll(/\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__|--)[a-z0-9_-]+)/g)) seen.add("." + m[1]);
  return [...seen];
}
/* 判点：串行问一遍；连续 3 条拿不到答案就判整组探针失效（不逐条重试，避免重试风暴） */
async function probeSet(pageObj, selectors) {
  const out = {};
  if (!pageObj) { selectors.forEach((s) => { out[s] = "no-answer"; }); return { map: out, broken: true }; }
  let consecErr = 0;
  for (const s of selectors) {
    try {
      const list = await pageObj.$$(s);
      const n = Array.isArray(list) ? list.length : (list ? 1 : 0);
      out[s] = n > 0 ? "present(" + n + ")" : "absent";
      consecErr = 0;
    } catch (e) {
      out[s] = "ERR:" + String(e && e.message).slice(0, 30);
      if (++consecErr >= 3) { selectors.slice(selectors.indexOf(s) + 1).forEach((x) => { out[x] = "no-answer"; }); return { map: out, broken: true }; }
    }
  }
  return { map: out, broken: false };
}
/* 桥的折叠探针（与 r-exec-cli.mjs 同一形态）：只为保真对照而存在，跑完这轮就该退役 */
function cliProbe(selectors) {
  if (!selectors.length) return {};
  const start = "() => { const app = getApp(); const bag = {}; app.__probeBag = bag; " +
    "const sels = " + JSON.stringify(selectors) + "; " +
    "sels.forEach(function (s, i) { try { const q = wx.createSelectorQuery(); " +
    "q.selectAll(s).fields({ size: true }, function (res) { bag[i] = (Array.isArray(res) ? res.length : (res ? 1 : 0)); }); q.exec(); } " +
    "catch (e) { bag[i] = 'ERR'; } }); return 'started:' + sels.length; }";
  const read = "() => JSON.stringify(getApp().__probeBag || {})";
  try { evaluate(start, { project: PROJECT }); } catch (e) { return { __err: String(e.message).slice(0, 60) }; }
  /* 桥不会 await 返回 Promise 的 fn-source，只能先把回调写进袋、再同步等一会儿去读 */
  const t0 = Date.now();
  while (Date.now() - t0 < 1500) { /* 忙等：这条只在保真对照里跑，一轮一次 */ }
  let bag = {};
  try { bag = JSON.parse(String(evaluate(read, { project: PROJECT }))); } catch (e) { return { __err: "read:" + String(e.message).slice(0, 40) }; }
  const out = {};
  selectors.forEach((s, i) => {
    out[s] = typeof bag[i] === "number" ? (bag[i] > 0 ? "present(" + bag[i] + ")" : "absent") : String(bag[i] === undefined ? "no-answer" : bag[i]);
  });
  return out;
}
function verdictOf(ans) {
  const s = String(ans);
  if (s.startsWith("present(")) return "present";
  if (s === "absent") return "absent";
  return "no-answer";
}

function row(manifest, page, c, status, route, reason, observed, evid, miss) {
  return {
    suite: "C-" + manifest, manifest, id: c.id, page, tier: c.tier || "normal",
    requiresReal: c.requiresReal === true, title: String(c.title || "").slice(0, 160),
    status, observed: observed || "", missingEvidence: miss || [], failureReason: reason || "",
    route: route || "", toast: "", console: "", evidence: evid || "", durationMs: 0, transport: "ws+cli-shot",
  };
}
function evidenceHole(r) {
  return r.status === "EXECUTED" && !r.evidence && !/present\(|absent/.test(String(r.observed || ""));
}
/* 出帧统一走桥（WS 出帧实测 61s/张）。>3000B 才算证据，这条口径与 r-exec-cli 一致 */
function shootFor(name, id) {
  const miss = [];
  const f = join(SHOT_DIR, name + "-" + id + "-after.png");
  try {
    rmSync(f, { force: true });
    shot(f, { project: PROJECT });
    const sz = existsSync(f) ? statSync(f).size : 0;
    if (sz > 3000) { stats.shots++; return { evid: relOf(f) + "(" + sz + "B)", miss }; }
    miss.push(relOf(f) + "(仅 " + sz + "B，不当证据)");
  } catch (e) { miss.push(relOf(f) + "(未写出:" + String(e.message).slice(0, 50) + ")"); }
  return { evid: "", miss };
}
/* 交互型用例：点 action 里点名的第一个元素，等页面稳定后重问判点并必出一帧。
   判点没变 + 有帧 = 这条交互"发生了但没改变可观测状态"，仍是 EXECUTED（证据在帧里），
   但不许记成"交互生效"——那要看 expected 到底断言了什么，属于人工判读层。 */
async function runTapCase(name, page, c, route, cls) {
  const actionText = String(c.action || "");
  const targets = classesOf(actionText);
  if (DENY_TAP.test(actionText)) {
    return { bucket: "tapDeny", row: row(name, page, c, "SKIPPED", route, "动作命中不可逆清单（注销/解绑/清空/登出）⇒ 禁触，否则后面几百条共用的会话会被打掉", "top=" + route + " | deny-tap | action=" + actionText.slice(0, 60)) };
  }
  if (!targets.length) {
    return { bucket: "tapNoTarget", row: row(name, page, c, "SKIPPED", route, "交互动词但 action 里没点名可点元素（没有 selector 就没法把这次点击归属到某个东西）⇒ 待把判据收紧", "top=" + route + " | dom: (action 无类名) | tap-skipped") };
  }
  const sel = targets[0];
  const pre = await probeSet(await wsPage(), [sel]);
  if (pre.map[sel] !== "absent" && String(pre.map[sel]).startsWith("present") === false) {
    return { bucket: "tapNoTarget", row: row(name, page, c, "SKIPPED", route, "目标元素探针无答案（" + pre.map[sel] + "）⇒ 通道没准备好，不盲点", "top=" + route + " | pre: " + sel + ":" + pre.map[sel] + " | tap-skipped") };
  }
  if (pre.map[sel] === "absent") {
    return { bucket: "tapNoTarget", row: row(name, page, c, "SKIPPED", route, "目标元素 " + sel + " 当前不在页上（可能要先展开/滚动/登录态）⇒ 不盲点，待补前置态", "top=" + route + " | pre: " + sel + ":absent | tap-skipped") };
  }
  const t = await wsTap(sel);
  if (t !== "tapped") {
    return { bucket: "tapFail", row: row(name, page, c, "SKIPPED", route, "tap 未成功：" + String(t) + " ⇒ 通道/元素问题，不算交互失败也不算通过", "top=" + route + " | tap=" + String(t) + " | tap-skipped") };
  }
  await sleep(TAP_SETTLE);
  const routeAfter = String((await wsRoute()) || "");
  const all = [...new Set(cls.concat(targets))];
  const post = await probeSet(await wsPage(), all);
  const { evid, miss } = shootFor(name, c.id);
  const observed = "top=" + routeAfter + (routeAfter !== route ? "（点击后从 " + route + " 变了）" : "") +
    " | tap=" + sel + " | dom: " + all.map((s) => s + ":" + (post.map[s] || "no-answer")).join(" ") + " | post-tap";
  if (!evid) {
    return { bucket: "tapNoFrame", row: row(name, page, c, "SKIPPED", routeAfter, "点击后出帧失败（miss=" + miss.join(";") + "）⇒ 交互型没有帧就不算证据", observed, "", miss) };
  }
  return { bucket: "executed", row: row(name, page, c, "EXECUTED", routeAfter, "", observed, evid, miss) };
}

if (!existsSync(join(PROJECT, "app.json"))) { console.log("WSX_RESULT=FAIL reason=--project 不是已编译产物：" + PROJECT); process.exit(2); }
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SHOT_DIR, { recursive: true });
const prior = existsSync(RES) ? JSON.parse(readFileSync(RES, "utf8")) : { results: [] };
if (flag("redo-holes")) {
  const before = (prior.results || []).length;
  prior.results = (prior.results || []).filter((r) => !evidenceHole(r));
  console.log("WSX_VOIDED " + (before - prior.results.length) + " 条 EXECUTED-无证据");
}
/* 增量补跑用：同一份结果文件里，只把"上一刀没跑的那类"退回待跑，
   不动已 EXECUTED 的行（否则等于拿新帧把旧结论冲掉，历史就没了）。 */
for (const [k, re] of [["redo-taps", /^action 含交互动词/], ["redo-real", /^requiresReal/]]) {
  if (!flag(k)) continue;
  const before = (prior.results || []).length;
  prior.results = (prior.results || []).filter((r) => !(r.status === "SKIPPED" && re.test(String(r.failureReason || ""))));
  console.log("WSX_VOIDED_" + k + " " + (before - prior.results.length) + " 条（退回待跑，本轮重新产生状态）");
}
const done = new Set((prior.results || []).map((r) => r.manifest + "|" + r.id));
const rows = [];
const stats = { executed: 0, failed: 0, skipTap: 0, skipReal: 0, skipRoute: 0, skipNoCrit: 0, skipMiss: 0, tapDeny: 0, tapNoTarget: 0, tapFail: 0, tapNoFrame: 0, pages: 0, probes: 0, shots: 0 };
const SKIP_KEYS = ["skipTap", "skipReal", "skipRoute", "skipNoCrit", "skipMiss", "tapDeny", "tapNoTarget", "tapFail", "tapNoFrame"];
const skipTotal = () => SKIP_KEYS.reduce((a, k) => a + stats[k], 0);

function flush(final) {
  const m2 = new Map();
  for (const r of [...(prior.results || []), ...rows]) m2.set(r.manifest + "|" + r.id, r);
  try {
    writeFileSync(RES, JSON.stringify({ round: LABEL, gitSha: GIT_SHA, identity: IDENTITY, loginVerify: LOGIN_VERIFY, updatedAt: new Date().toISOString(),
      runner: "scripts/qa/r-exec-ws.mjs（WS 取证 + 桥出帧" + (final ? "，完整跑完" : "，增量落盘") + "）", results: [...m2.values()] }, null, 1));
  } catch (e) { console.log("WSX_FLUSH_ERR " + String(e.message).slice(0, 80)); }
  return [...m2.values()];
}

async function main() {
  const files = (ONLY.length ? ONLY : readdirSync(OPS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))).sort();
  if (!files.length) { console.log("WSX_RESULT=FAIL reason=没有要跑的 manifest（空扫描集不得占设备）"); process.exit(2); }
  /* 名单先对语料核一遍，再占设备：名单里的 id 全都不在语料 ⇒ 这一腿会交出 0 行却"看起来成功了"。 */
  if (IDS_FILE) {
    const p = (/^\w:[\\/]/.test(IDS_FILE) || IDS_FILE.startsWith("/")) ? IDS_FILE : join(REPO, IDS_FILE);
    if (!existsSync(p)) { console.log("WSX_RESULT=FAIL reason=--ids-file 读不到 " + IDS_FILE + "（路径写错不许当成「全跑」）"); process.exit(2); }
    const raw = readFileSync(p, "utf8").trim();
    let list = [];
    try { const j = JSON.parse(raw); list = Array.isArray(j) ? j : (j.cases || j.ids || []); }
    catch { list = raw.split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith("#")); }
    /* 名单行允许三种写法：MANIFEST#ID、MANIFEST/ID、MANIFEST ID。
       分隔符按"切开再拼 |"处理，不能直接把空白删掉——那是上一版在这里犯的错
       （负例实测 PAGES-HOME-INDEX H13 被拼成 PAGES-HOME-INDEXH13，好名单也会被判成找不到）。 */
    IDS = new Set(list.map((x) => String(x).trim().split(/[/#\s]+/).filter(Boolean).join("|").toUpperCase()).filter(Boolean));
    if (!IDS.size) { console.log("WSX_RESULT=FAIL reason=--ids-file 解析出 0 条 ⇒ 空名单不许占设备"); process.exit(2); }
    const corpus = new Set();
    for (const name of files) {
      try { const mf = JSON.parse(readFileSync(join(OPS, name + ".json"), "utf8")); for (const c of (mf.cases || [])) corpus.add((name + "|" + c.id).toUpperCase()); } catch { console.log("WSX_IDS_SKIP_FILE " + name + "（语料读不到，名单核对不到它）"); }
    }
    const missing = [...IDS].filter((k) => !corpus.has(k));
    console.log("WSX_IDS_FILE " + IDS_FILE + " 名单=" + IDS.size + " 在语料=" + (IDS.size - missing.length) + " 找不到=" + missing.length);
    if (missing.length) {
      for (const k of missing.slice(0, 12)) console.log("  WSX_IDS_MISSING " + k);
      if (missing.length > 12) console.log("  WSX_IDS_MISSING …另 " + (missing.length - 12) + " 条未逐条点名");
      console.log("WSX_RESULT=FAIL reason=名单里 " + missing.length + " 条不在本轮语料里（判据改号或名单拼错）⇒ 静默少跑就是假覆盖");
      process.exit(2);
    }
  }
  /* WS 通道与 CLI 桥驱动的是同一台模拟器：并发不报错，只互相换页 ⇒ 排队用同一把租约。 */
  guardUiLease({ owner: "r-exec-ws-" + LABEL, tag: "WSX_LEASE", failTag: "WSX" });
  console.log("[boot] sha=" + GIT_SHA + " project=" + relOf(PROJECT) + " transport=ws-route+ws-probe+cli-shot");
  const r0 = await wsRoute();
  if (r0 === undefined) { console.log("WSX_RESULT=FAIL reason=WS 通道连不上；先跑 node scripts/qa/ws-channel-up.mjs（别用 close()）"); process.exit(2); }
  console.log("[boot] ws 当前页=" + r0);

  /* 身份前置：铸真 token → 写进这个 WS 会话 → 断言 store 认了。断言不成立就不跑一行，
     因为未登录画面不能当已登录证据（桥版执行器就是栽在没 await mintToken 上）。 */
  if (IDENTITY === "none") {
    LOGIN_VERIFY = "skipped-by-flag";
    console.log("[boot] identity=none ⇒ 不写会话，按游客档跑，落点一律按未登录读");
  } else {
    let t = "";
    try { t = (await mintToken(IDENTITY === "B" ? "B" : "A", REPO, "r7-ws-" + LABEL)).token; }
    catch (e) { console.log("WSX_RESULT=FAIL reason=铸 token 失败：" + String(e.message).slice(0, 130) + " ⇒ 一行都不跑"); process.exit(2); }
    let b = await wsBootSession(t);
    if (b === undefined) { b = bootSession(t, { project: PROJECT }); console.log("[boot] WS 写会话没答，退回桥写入（下方 verify 仍以 WS 为准）"); }
    let v = await wsVerifyLogin();
    if (v === undefined) { v = "(WS 无答案，桥值=" + verifyLogin({ project: PROJECT }) + ")"; }
    LOGIN_VERIFY = String(v);
    console.log("[boot] " + b + " identity=" + IDENTITY + " verify=" + LOGIN_VERIFY);
    if (!/^logged-in/.test(LOGIN_VERIFY)) {
      console.log("WSX_RESULT=FAIL reason=store 报 " + LOGIN_VERIFY + " ⇒ 整批不跑（换 --identity B 跑游客档）");
      process.exit(2);
    }
  }

  if (FIDELITY) {
    /* 保真对照：同一时刻同一页，WS 并发 $$ 与桥折叠探针必须给出同样的 present/absent 结论。
       不一致 ⇒ 不许把 WS 当默认传输（这一条是 #36 定的规矩，不能因为 WS 快就绕过）。 */
    const mf = JSON.parse(readFileSync(join(OPS, FIDELITY + ".json"), "utf8"));
    const byPage = {};
    for (const c of (mf.cases || [])) (byPage[c.page] = byPage[c.page] || []).push(c);
    let cmp = 0, diff = 0, bothNoAnswer = 0;
    const diffs = [];
    for (const page of Object.keys(byPage).slice(0, Number(opt("fidelityPages", "2")))) {
      /* 开页偶发整批失败是这条通道的已知行为（实测这一轮就两次），一次失败不等于这一页不能对照：
         重试两次，仍失败才跳过——跳过要留 FIDELITY_SKIP 的痕，不能悄悄少样本。 */
      let opened = false, lastErr = "";
      for (let a = 0; a < 2 && !opened; a++) {
        try { openPage(page, "", { project: PROJECT }); opened = true; }
        catch (e) { lastErr = String(e.message).slice(0, 60); console.log("FIDELITY_OPEN_RETRY(" + a + ") " + page + " :: " + lastErr); await sleep(2000); }
      }
      if (!opened) { console.log("FIDELITY_SKIP page=" + page + " 开页两次都失败：" + lastErr); continue; }
      await sleep(2500);
      const sels = [...new Set(byPage[page].flatMap((c) => classesOf(c.action + " " + c.expected)))].slice(0, 24);
      if (!sels.length) { console.log("FIDELITY_SKIP page=" + page + " 没有点名类名"); continue; }
      const wsObj = await probeSet(await wsPage(), sels);
      const ws = wsObj.map;
      const cl = cliProbe(sels);
      const top = await wsRoute();
      console.log("FIDELITY page=" + page + " sels=" + sels.length + " route=" + top + " routeOk=" + (String(top || "").includes(page)) +
        " ws探针组失效=" + (wsObj.broken ? "yes" : "no"));
      for (const s of sels) {
        const a = verdictOf(ws[s]), b = verdictOf(cl[s]);
        if (a === "no-answer" && b === "no-answer") { bothNoAnswer++; continue; }
        cmp++;
        if (a !== b) { diff++; if (diffs.length < 12) diffs.push(page + " " + s + " ws=" + a + " cli=" + b); }
      }
    }
    console.log("FIDELITY_TOTAL 可比=" + cmp + " 不一致=" + diff + " 两边都无答案=" + bothNoAnswer);
    diffs.forEach((d) => console.log("FIDELITY_DIFF " + d));
    console.log(cmp < 8 ? "FIDELITY=TOO_FEW_SAMPLES 可比样本 <8，这次对照不算数（别拿它当通过）"
      : (diff === 0 ? "FIDELITY=PASS 逐例结论一致 ⇒ 允许把 WS 当取证默认传输" : "FIDELITY=FAIL 有 " + diff + " 条不一致 ⇒ WS 不许当默认，先解释每一条"));
    /* 对照跑完必须真的退出：WS 会话按规矩不许 close()，事件循环会一直挂着把设备占住
       （实测两次对照都是靠外层 timeout 才结束的）。 */
    process.exit(cmp >= 8 && diff > 0 ? 2 : 0);
  }

  let budget = LIMIT > 0 ? LIMIT : Infinity;
  let stopped = false;
  for (const name of files) {
    if (stopped) break;
    let mf;
    try { mf = JSON.parse(readFileSync(join(OPS, name + ".json"), "utf8")); } catch { console.log("SKIP-MANIFEST unreadable " + name); continue; }
    const byPage = {};
    for (const c of (mf.cases || [])) (byPage[c.page] = byPage[c.page] || []).push(c);
    for (const page of Object.keys(byPage)) {
      if (stopped) break;
      let todo = byPage[page].filter((c) => !done.has(name + "|" + c.id));
      if (IDS) {
        /* 名单之外的一条都不跑：换页成本省下来，而且"这一腿补的是哪一刀"说不说得清取决于此。
           idsSeen 记"名单里有哪些在本轮语料中真的遇上了"（不管此前跑没跑过），
           末尾用它核对守恒 ⇒ 静默少跑会变成一条红而不是一次成功。 */
        for (const c of byPage[page]) {
          const k = (name + "|" + c.id).toUpperCase();
          if (IDS.has(k)) idsSeen.add(k);
        }
        todo = todo.filter((c) => IDS.has((name + "|" + c.id).toUpperCase()));
      }
      if (!todo.length) continue;
      stats.pages++;
      console.log("WSX_GROUP_START page=" + page + " 待跑=" + todo.length + " 累计=" + ((Date.now() - BOOT_T) / 60000).toFixed(1) + "min");
      try { openPage(page, "", { project: PROJECT }); } catch (e) {
        for (const c of todo) rows.push(row(name, page, c, "FAILED", "", "open_page 失败：" + String(e.message).slice(0, 70), ""));
        stats.failed += todo.length;
        flush();
        continue;
      }
      await sleep(Number(opt("settle", "2200")));
      const route = String((await wsRoute()) || "");
      const routeKnown = !!route;
      const routeOk = routeKnown ? route.includes(page) : null;
      const allCls = [...new Set(todo.flatMap((c) => classesOf(c.action + " " + c.expected)))];
      stats.probes += allCls.length;
      const pr = allCls.length ? await probeSet(await wsPage(), allCls) : { map: {}, broken: false };
      const dom = pr.map;
      if (pr.broken) console.log("WSX_PROBE_BROKEN page=" + page + " ⇒ 该组探针不采信");
      for (const c of todo) {
        const cls = classesOf(c.action + " " + c.expected);
        const observed = "top=" + (route || (routeKnown ? "?" : "(落点未取证)")) + (routeOk === false ? " ≠ " + page : "") +
          " | dom: " + (cls.length ? cls.map((s) => s + ":" + (dom[s] || "no-answer")).join(" ") : "(本条没点名类名)") +
          " | ws-route+ws-probe" + (pr.broken ? " | probe-broken" : "");
        if (c.requiresReal === true && !REAL_MODE) {
          stats.skipReal++;
          rows.push(row(name, page, c, "SKIPPED", route, "requiresReal ⇒ 本切片只跑 mock 产物", observed));
        } else if (routeOk === false) {
          stats.failed++;
          rows.push(row(name, page, c, "FAILED", route, "落在别的页（页内守卫或路由重定向），须人判（跑 scripts/qa/triage-cold-entry.mjs 可定位到具体守卫行）", observed));
        } else if (TAP_RE.test(String(c.action || ""))) {
          if (!TAP_MODE) {
            stats.skipTap++;
            rows.push(row(name, page, c, "SKIPPED", route, "action 含交互动词 ⇒ 未开 --tap，交互型留待下一刀", observed));
          } else {
            const r = await runTapCase(name, page, c, route, cls);
            if (r.bucket !== "executed") stats[r.bucket]++; else stats.executed++;
            rows.push(r.row);
          }
        } else if (!cls.length && !FRAME_RE.test(String(c.evidence || ""))) {
          stats.skipNoCrit++;
          rows.push(row(name, page, c, "SKIPPED", route, "判据未点名可观测物件（既无类名也不要求出帧）⇒ 没有可判的东西，不能记 EXECUTED", observed));
        } else if (!routeKnown) {
          stats.skipRoute++;
          rows.push(row(name, page, c, "SKIPPED", route, "WS currentPage() 没给结果 ⇒ 不知是否已在 " + page + "，答案无法归属，待重跑", observed));
        } else {
          const miss = [];
          let evid = "";
          if (FRAME_RE.test(String(c.evidence || "")) || cls.length) {
            const f = join(SHOT_DIR, name + "-" + c.id + "-after.png");
            try {
              rmSync(f, { force: true });
              shot(f, { project: PROJECT });
              const sz = existsSync(f) ? statSync(f).size : 0;
              if (sz > 3000) { evid = relOf(f) + "(" + sz + "B)"; stats.shots++; } else miss.push(relOf(f) + "(仅 " + sz + "B，不当证据)");
            } catch (e) { miss.push(relOf(f) + "(未写出:" + String(e.message).slice(0, 50) + ")"); }
          }
          const answered = cls.filter((s) => verdictOf(dom[s]) !== "no-answer");
          if (!evid && !answered.length) {
            stats.skipMiss++;
            rows.push(row(name, page, c, "SKIPPED", route, "出帧失败且探针无有效答案（miss=" + miss.join(";") + "）⇒ 不记 EXECUTED", observed, "", miss));
          } else {
            stats.executed++;
            rows.push(row(name, page, c, "EXECUTED", route, "", observed, evid, miss));
          }
        }
        if (--budget <= 0) { stopped = true; break; }
      }
      flush();
      console.log("WSX_GROUP page=" + page + " 本次新行=" + rows.length + " executed=" + stats.executed + " failed=" + stats.failed +
        " skipped=" + skipTotal() +
        " 出帧=" + stats.shots + " ws重试=" + wsErrs + " 连接次数=" + conns + " 已跑=" + ((Date.now() - BOOT_T) / 60000).toFixed(1) + "min");
    }
  }

  const all = flush(true);
  const dupNew = rows.length - new Set(rows.map((r) => r.manifest + "|" + r.id)).size;
  const bad = all.filter((r) => !["EXECUTED", "FAILED", "SKIPPED"].includes(r.status));
  const holes = all.filter(evidenceHole);
  console.log("WSX_ROWS new=" + rows.length + " merged=" + all.length + " 之前已有=" + (prior.results || []).length + " 重复新行=" + dupNew);
  console.log("WSX_STATS executed=" + stats.executed + " failed=" + stats.failed + " skipped=" + skipTotal() +
    "(交互动词未开tap=" + stats.skipTap + " requiresReal=" + stats.skipReal + " 落点未取证=" + stats.skipRoute +
    " 无可判物件=" + stats.skipNoCrit + " 出帧失败=" + stats.skipMiss +
    " tap禁触=" + stats.tapDeny + " tap无目标=" + stats.tapNoTarget + " tap失败=" + stats.tapFail + " tap无帧=" + stats.tapNoFrame +
    ") 页组=" + stats.pages + " 探针条数=" + stats.probes + " 出帧=" + stats.shots + " ws重试=" + wsErrs + " 连接次数=" + conns);
  const st = {};
  for (const r of all) st[r.status] = (st[r.status] || 0) + 1;
  console.log("WSX_STATUS_ALL " + Object.keys(st).sort().map((k) => k + "=" + st[k]).join(" "));
  console.log("WSX_EVIDENCE_HOLE " + holes.length + (holes.length ? " 条：" + holes.slice(0, 8).map((r) => r.manifest + "/" + r.id).join(",") : ""));
  const fails = [];
  if (!rows.length) fails.push("一行都没产生（要么全跑过了，要么筛选把用例全挡住了 ⇒ 这不叫跑完）");
  if (dupNew) fails.push("重复 manifest|id " + dupNew + " 条");
  if (IDS) {
    /* 名单腿的守恒：名单里每一条都必须在"扫到的语料"里出现、且在盘上有行。
       两个方向分开报：没遇上＝manifest 没进扫描集或判据被改名；有行少＝静默少跑。 */
    const covered = new Set(all.filter((r) => IDS.has((r.manifest + "|" + r.id).toUpperCase())).map((r) => (r.manifest + "|" + r.id).toUpperCase()));
    const notSeen = [...IDS].filter((k) => !idsSeen.has(k));
    console.log("WSX_IDS 名单=" + IDS.size + " 语料里遇上=" + idsSeen.size + " 盘上有行=" + covered.size + " 名单里没遇上=" + notSeen.length);
    if (notSeen.length) fails.push("名单里 " + notSeen.length + " 条在本腿扫到的 manifest 里根本没出现（manifest 没进扫描集或判据被改了号）：" + notSeen.slice(0, 8).join(","));
    if (stopped) console.log("WSX_IDS_PARTIAL 本腿被预算/limit 截停 ⇒ 名单只落 " + covered.size + "/" + IDS.size + " 行，不许按跑完记账");
    else if (covered.size !== IDS.size) fails.push("守恒破：名单 " + IDS.size + " ≠ 盘上有行 " + covered.size + " ⇒ 有条目被静默跳过（既没 EXECUTED 也没 FAILED/SKIPPED 行）");
  }
  if (bad.length) fails.push("非法状态 " + bad.length + " 条");
  if (holes.length) fails.push(holes.length + " 条 EXECUTED 没有任何证据 ⇒ 没有证据的绿不许入账");
  if (all.length !== (prior.results || []).length + rows.length - dupNew) fails.push("合并后总数对不上");
  if (fails.length) { console.log("WSX_RESULT=FAIL reason=" + fails.join(" / ") + " ⇒ 结论不落盘"); process.exit(2); }
  console.log("WSX_WRITTEN=" + relOf(RES) + " results=" + all.length);
  console.log("WSX_SCOPE=" + (TAP_MODE ? "observe+tap（requiresReal 仍未跑，真实模式要 --project 指到 real 产物）" : "observe-only（交互型与 requiresReal 未跑；这不是一轮完整的执行轮）"));
  console.log("WSX_RESULT=OK");
}
main().catch((e) => {
  console.log("WSX_RESULT=FAIL stage=uncaught msg=" + String((e && e.stack) || e).split("\n")[0].slice(0, 180));
  flush();
  process.exit(2);
});
