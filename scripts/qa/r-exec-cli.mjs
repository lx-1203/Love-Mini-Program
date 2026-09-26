#!/usr/bin/env node
/* round-7 执行轮（observe-only 切片）的 CLI 版执行器。
   为什么另起一个文件而不是改 r-exec.cjs：那 2199 行整个建立在 automator.connect(ws) 上，
   而 WS 通道本机连不上（cli auto 不落监听端口，实测 connect ~15ms 失败）。

   本执行器只做能诚实做完的那一半：
     · 跑 pre/action 里没有交互动词的用例（点击/输入/滚动那一类交给下一步）；
     · 每页只开一次，页内所有用例点名的类名折叠成一次「点火 + 取件」探测（notes §12：0.21 s/条且与逐条一致）；
     · 需要出帧的用例逐例截图；requiresReal 的用例记 SKIPPED 并写明原因（不拿 mock 帧冒充真实模式）；
     · 只观察不判决：它不推断「该出现却没出现算失败」——清单里没写极性的判点，猜出来就是假判决。

   行形状与 round-6 一致（suite/manifest/id/page/tier/requiresReal/title/status/observed/
   missingEvidence/failureReason/route/toast/console/evidence/durationMs），
   这样 queue-reconcile / evidence-integrity / readjudicate 三个门禁的账本不用改。

   用法：PATH=<node22 目录>:$PATH node scripts/qa/r-exec-cli.mjs \
     --project apps/client/dist/build/mp-weixin --out reports/audit/round-7/interact \
     [--manifests PAGES-HOME-INDEX,PAGES-NEARBY-INDEX] [--limit 40]
   续跑：同一 --out 下已有 exec-results.json 时按 manifest|id 跳过跑过的，合并后整体守恒才写盘。 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { evaluate, openPage, shot, mintToken, bootSession, verifyLogin, routeStack, clearSession } from "./cli-automator.mjs";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin"));
const OUT_DIR = resolve(REPO, arg("out", "reports/audit/round-7/interact"));
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const LABEL = arg("label", "round-7-exec");
const ONLY = (arg("manifests", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT = parseInt(arg("limit", "0"), 10);
const SETTLE = parseInt(arg("settle", "2400"), 10);
const SHOT_DIR = join(REPO, "reports", "screenshots", LABEL);
const RES = join(OUT_DIR, "exec-results.json");
const sleep = (ms) => { const t = Date.now() + ms; while (Date.now() < t) {} };
const relOf = (p) => p.split("\\").join("/").replace(REPO.split("\\").join("/") + "/", "");

const TAP_RE = /点击|按下|长按|双击|输入|滑动|滚动|拖动|下拉|勾选|切换后|聚焦|失焦/;
const FRAME_RE = /截图|全帧|出帧|特写|帧/;

function git(a) { try { return execFileSync("git", a.split(" "), { cwd: REPO, encoding: "utf8" }).trim(); } catch { return ""; } }
const GIT_SHA = git("rev-parse --short HEAD") || "unknown";
const BOOT_T = Date.now();

/* 这条通道的超时有时不是从 execFileSync 抛回来的，而是之后以未捕获的 socket 事件冒出来
   （本轮实测两次，第一次直接把整批取景带走）。执行轮是按小时算的，一条噪声不能吞掉已跑的行：
   记数 + 继续跑，末尾把次数打出来。 */
let transportErrs = 0;
/* 但这个 handler 不能把"启动阶段就炸了"也吞掉：实测它把一次 boot 期的 evaluate 失败
   变成"打印一行 TRANSPORT_ERR 然后事件循环空了 ⇒ 退出码 0"，一次什么都没跑的死法被记成通过。
   所以：boot 之前抛 = 致命，退 2；boot 之后抛 = 计一次并请求收尾（让守恒检查有机会跑）。 */
const RUN = { booted: false, abort: () => {} };
process.on("uncaughtException", (e) => {
  transportErrs++;
  console.log("TRANSPORT_ERR " + String((e && (e.stack || e.message)) || e).split("\n")[0].slice(0, 140));
  if (!RUN.booted) { console.log("RUNNER_RESULT=FAIL reason=启动阶段（登录票据/开页）就抛了，一行都没跑 ⇒ 这不是跑完，退 2"); process.exit(2); }
  RUN.abort();
});
process.on("unhandledRejection", (e) => {
  transportErrs++;
  console.log("TRANSPORT_REJECT " + String((e && e.message) || e).slice(0, 140));
  if (!RUN.booted) { console.log("RUNNER_RESULT=FAIL reason=启动阶段就出现未处理拒绝 ⇒ 退 2"); process.exit(2); }
  RUN.abort();
});

function row(manifest, page, c, status, route, reason, observed, evid, miss) {
  return {
    suite: "C-" + manifest, manifest, id: c.id, page, tier: c.tier || "normal",
    requiresReal: c.requiresReal === true, title: String(c.title || "").slice(0, 160),
    status, observed: observed || "", missingEvidence: miss || [], failureReason: reason || "",
    route: route || "", toast: "", console: "", evidence: evid || "", durationMs: 0,
  };
}
function classesOf(text) {
  const seen = new Set();
  for (const m of String(text || "").matchAll(/\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__|--)[a-z0-9_-]+)/g)) seen.add("." + m[1]);
  return [...seen];
}
/* 折叠探测：一次调用起 K 条 selectAll 查询，回调把条数写进 app 上的普通字段；
   第二次调用只读那个字段。返回 Promise 的写法本机不会被 await（notes §12），所以拆两步。 */
function probeMany(selectors) {
  if (!selectors.length) return {};
  const start = "() => { const app = getApp(); const bag = {}; app.__probeBag = bag; " +
    "const sels = " + JSON.stringify(selectors) + "; " +
    "sels.forEach(function (s, i) { try { const q = wx.createSelectorQuery(); " +
    "q.selectAll(s).fields({ size: true }, function (res) { bag[i] = (Array.isArray(res) ? res.length : (res ? 1 : 0)); }); q.exec(); } " +
    "catch (e) { bag[i] = 'ERR'; } }); " +
    "return 'started:' + sels.length; }";
  const read = "() => JSON.stringify(getApp().__probeBag || {})";
  try { evaluate(start, { project: PROJECT }); } catch (e) { return { __err: String(e.message).slice(0, 70) }; }
  sleep(900);
  let bag = {};
  try { bag = JSON.parse(String(evaluate(read, { project: PROJECT }))); } catch (e) { return { __err: "read:" + String(e.message).slice(0, 50) }; }
  const out = {};
  selectors.forEach((s, i) => {
    out[s] = typeof bag[i] === "number" ? (bag[i] > 0 ? "present(" + bag[i] + ")" : "absent") : String(bag[i] === undefined ? "no-answer" : bag[i]);
  });
  return out;
}

if (!existsSync(join(PROJECT, "app.json"))) { console.log("RUNNER_RESULT=FAIL reason=--project 不是已编译产物：" + PROJECT); process.exit(2); }
const files = (ONLY.length ? ONLY : readdirSync(OPS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))).sort();
if (!files.length) { console.log("RUNNER_RESULT=FAIL reason=没有要跑的 manifest（空扫描集不得占设备）"); process.exit(2); }

const prior = existsSync(RES) ? JSON.parse(readFileSync(RES, "utf8")) : { results: [] };
/* 记账口径：一条 EXECUTED 必须要么有帧、要么至少有一个探针答案。旧结果里不满足的那些
   （实测 4 条：DC37/H13/H29/H44）是"没有证据的绿"。--redo-holes 把它们**作废重测**，
   状态由重跑重新产生 —— 这不是改判洗色，是把没测过的东西重新测一遍。 */
function evidenceHole(r) {
  return r.status === "EXECUTED" && !r.evidence && !/present\(|absent/.test(String(r.observed || ""));
}
if (process.argv.includes("--redo-holes")) {
  const before = (prior.results || []).length;
  prior.results = (prior.results || []).filter((r) => !evidenceHole(r));
  console.log("RUNNER_VOIDED " + (before - prior.results.length) + " 条 EXECUTED-无证据 的行作废重测");
}
const done = new Set((prior.results || []).map((r) => r.manifest + "|" + r.id));
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SHOT_DIR, { recursive: true });

/* mintToken 的签名是 (kind, repoRoot, deviceId) 而且是 async。上一版写成 mintToken({project})：
   kind 不等于 "A" ⇒ 走 guest 分支，返回值又被 String() 成 "[object Promise]" 存进 storage。
   实测（scripts/qa/probe-boot-callsite.mjs，两工程各测一种形态）：
     · mock 工程坏 token 照样 logged-in(userId=user-1001) ⇒ mock 那两刀的落点判据不受影响，不必重跑；
     · real 工程坏 token ⇒ not-logged-in，所以 interact-real 的 259 行 SKIPPED 是我自己把门关上了。
   登录位是执行轮的前置而不是装饰：身份不对时整批落点都不可信 ⇒ 这里不成立就一行都不跑。 */
/* 按设计就不接受裸直达的路由：缺的是 URL 参数，不是产品修复。
   campus/index 的 onLoad 注释写明"无 ?school= 时校园圈入口应落到 hub"，
   所以这 15 条 case 在 A 侧被跳、在 B 侧被判"落在别的页"——补上参数才是它们本来的测法。
   （同一份表也写进 shoot-frameplan.mjs；两处要保持一致。） */
const ROUTE_QUERY = {
  "subpackages/campus/campus/index": "school=" + encodeURIComponent("南京大学"),
  "subpackages/discover-extra/discover/matching": "dev-preview=1",
};
const IDENTITY = arg("identity", "A");
let LOGIN_VERIFY = "";
if (IDENTITY === "guest" || IDENTITY === "none") {
  /* 游客档不是"铸一个 B token"：mintToken + bootSession 之后 store 仍是 logged-in，
     而本执行器下一道门要求 logged-in，于是 --identity B 既当不了游客也过不了门
     （B 侧执行轮里 26 条 PAGES-LOGIN-INDEX 就是被这条假路径挡在外面的）。
     真游客 = 清本地会话 + 复位 store，并且必须量到 not-logged-in 才开跑。 */
  const c = clearSession({ project: PROJECT });
  LOGIN_VERIFY = verifyLogin({ project: PROJECT });
  console.log(`[boot] ${c} identity=guest verify=${LOGIN_VERIFY}`);
  if (!/^not-logged-in/.test(LOGIN_VERIFY)) {
    console.log("RUNNER_RESULT=FAIL reason=要游客态但会话没清掉：" + LOGIN_VERIFY + " ⇒ 一行都不跑");
    process.exit(2);
  }
} else {
  try {
    const t = (await mintToken(IDENTITY === "B" ? "B" : "A", REPO, "r7-exec-" + LABEL)).token;
    const b = bootSession(t, { project: PROJECT });
    LOGIN_VERIFY = verifyLogin({ project: PROJECT });
    console.log(`[boot] ${b} identity=${IDENTITY} verify=${LOGIN_VERIFY}`);
  } catch (e) {
    console.log("RUNNER_RESULT=FAIL reason=铸 token / 写会话失败：" + String(e.message).slice(0, 140) + " ⇒ 一行都不跑");
    process.exit(2);
  }
  if (!/^logged-in/.test(LOGIN_VERIFY)) {
    console.log("RUNNER_RESULT=FAIL reason=store 报 " + LOGIN_VERIFY + " ⇒ 未登录画面不能当已登录证据，整批不跑（游客档请用 --identity guest）");
    process.exit(2);
  }
}
RUN.booted = true;

/* 每跑完一个页组就落一次盘：这条通道会偶发把进程带走（实测两次未捕获 socket 超时），
   跑了 40 分钟的成果不能跟着一起没了。最终那次写盘仍走下面的守恒检查。 */
function flush() {
  const m2 = new Map();
  for (const r of [...(prior.results || []), ...rows]) m2.set(r.manifest + "|" + r.id, r);
  try { writeFileSync(RES, JSON.stringify({ round: LABEL, gitSha: GIT_SHA, identity: IDENTITY, loginVerify: LOGIN_VERIFY, updatedAt: new Date().toISOString(), runner: "scripts/qa/r-exec-cli.mjs（observe-only 切片，增量落盘）", results: [...m2.values()] }, null, 1)); }
  catch (e) { console.log("FLUSH_ERR " + String(e.message).slice(0, 90)); }
}

const rows = [];
const stats = { executed: 0, failed: 0, skipTap: 0, skipReal: 0, skipNonReal: 0, skipProbe: 0, skipNoCrit: 0, skipMiss: 0, pages: 0, probes: 0, shots: 0, noClass: 0 };
/* 增量行与终稿行共用同一个加总函数：上一版只在终稿那处补了新加的 skipNonReal，
   组内那条 print 漏了，于是同一轮里两个 skipped 数字互相打架（差值正好是真用例跳过数）。 */
const skippedTotal = () => stats.skipTap + stats.skipReal + stats.skipNonReal + stats.skipProbe + stats.skipNoCrit + stats.skipMiss;
let budget = LIMIT > 0 ? LIMIT : Infinity;
let stopped = false;
RUN.abort = () => { stopped = true; };

for (const name of files) {
  if (stopped) break;
  let mf;
  try { mf = JSON.parse(readFileSync(join(OPS, name + ".json"), "utf8")); } catch (e) { console.log("SKIP-MANIFEST unreadable " + name); continue; }
  const byPage = {};
  for (const c of (mf.cases || [])) (byPage[c.page] = byPage[c.page] || []).push(c);
  for (const page of Object.keys(byPage)) {
    const todo = byPage[page].filter((c) => !done.has(name + "|" + c.id));
    if (!todo.length) continue;
    stats.pages++;
    console.log("RUNNER_GROUP_START page=" + page + " 待跑=" + todo.length + " 累计=" + ((Date.now() - BOOT_T) / 60000).toFixed(1) + "min");
    try { openPage(page, ROUTE_QUERY[page] || "", { project: PROJECT }); } catch (e) {
      for (const c of todo) rows.push(row(name, page, c, "FAILED", "", "open_page 失败：" + String(e.message).slice(0, 70), ""));
      stats.failed += todo.length;
      continue;
    }
    sleep(SETTLE);
    let route = String(routeStack({ project: PROJECT }) || "");
    /* 空串/ERR 不等于「落在别的页」——实测这条通道会整批正常而路由探针取空（notes §12），
       把它折叠成失败会凭空造出十条 FAILED；但也不能反过来当作已确认。三态分开。
       真实工程下取空的比例明显更高（实测一轮 104 条），所以先重试一次再判"没答案"，
       且重试成功要在 observed 里留痕——通道抖过这件事必须看得见，不能被重试吃掉。 */
    let routeRetry = "";
    if (!route || route.startsWith("ERR")) {
      sleep(1600);
      const again = String(routeStack({ project: PROJECT }) || "");
      if (again && !again.startsWith("ERR")) { route = again; routeRetry = " | routeRetry=ok（首探取空/报错）"; }
    }
    const routeKnown = !!route && !route.startsWith("ERR");
    const routeOk = routeKnown ? route.includes(page) : null;
    const allCls = [...new Set(todo.flatMap((c) => classesOf(c.action + " " + c.expected)))];
    stats.probes += allCls.length;
    let dom = allCls.length ? probeMany(allCls) : {};
    let probeRetry = "";
    if (allCls.length && dom.__err) {
      const firstErr = String(dom.__err).slice(0, 46);
      sleep(1600);
      const again = probeMany(allCls);
      if (!again.__err) { dom = again; probeRetry = " | probeRetry=ok（首探 " + firstErr + "）"; }
    }
    if (dom.__err) console.log("  probe-err " + page + " :: " + dom.__err);
    for (const c of todo) {
      const cls = classesOf(c.action + " " + c.expected);
      const observed = "top=" + (route.split("|").pop() || (routeKnown ? "?" : "(落点未取证)")) + (routeOk === false ? " ≠ " + page : "") +
        " | dom: " + (cls.length ? cls.map((s) => s + ":" + (dom[s] || (dom.__err ? "ERR" : "no-answer"))).join(" ") : "(本条没点名类名)") +
        " | observe-only" + (dom.__err ? " | probe-err:" + dom.__err : "") + routeRetry + probeRetry;
      if (process.argv.includes("--real-cases-only") && c.requiresReal !== true) {
        /* 真实刀只欠 requiresReal 那 236 条；其余不重复跑，但仍要记一行，
           否则这个 corpus 的行数就不再是 1107，守恒核对会被"少了一类"骗过去。 */
        stats.skipNonReal++;
        rows.push(row(name, page, c, "SKIPPED", route, "真实刀只跑 requiresReal 用例（其余已在 mock 轮记过），本行只为守恒计数", observed));
      } else if (c.requiresReal === true && !process.argv.includes("--real")) {
        stats.skipReal++;
        rows.push(row(name, page, c, "SKIPPED", route, "requiresReal ⇒ 本切片只跑 mock 产物；真实模式要换 --project 到 mp-weixin-real 且后端在跑", observed));
      } else if (TAP_RE.test(String(c.action || ""))) {
        stats.skipTap++;
        rows.push(row(name, page, c, "SKIPPED", route, "action 含交互动词 ⇒ 本切片只跑 observe-only，交互型下一步再接", observed));
      } else if (routeOk === false) {
        stats.failed++;
        rows.push(row(name, page, c, "FAILED", route, "落在别的页（页内守卫或路由重定向），须人判", observed));
      } else if (!cls.length && !FRAME_RE.test(String(c.evidence || ""))) {
        /* 判据里既没点名类名也不要求出帧 ⇒ 这条压根没断言任何可观测物件。
           之前它会掉进最后的 else 记成 EXECUTED（实测 4 条：DC37/H13/H29/H44），
           那是"没有证据的绿"，正是不许出现的东西。改记 SKIPPED 并写明要收紧判据。 */
        stats.skipNoCrit++;
        rows.push(row(name, page, c, "SKIPPED", route, "判据未点名可观测物件（既无类名也不要求出帧）⇒ 没有可判的东西，不能记 EXECUTED；要么补判据要么人工看帧", observed));
      } else if (routeOk === null && dom.__err) {
        /* 落点与 DOM 两条探针同时没给结果 ⇒ 这一条什么都没测到。既不记 EXECUTED（没证据），
           也不记 FAILED（没测到不等于测出问题），记 SKIPPED 并写明要重跑。 */
        stats.skipProbe++;
        rows.push(row(name, page, c, "SKIPPED", route, "落点与折叠探针都没给出结果（通道未就绪）⇒ 本条没测到，不记 EXECUTED 也不记 FAILED，待重跑", observed));
      } else if (routeOk === null) {
        /* 有 DOM 答案但不知道在不在目标页 ⇒ 答案没法归属，记 EXECUTED 等于把"未知"写成"通过"。 */
        stats.skipProbe++;
        rows.push(row(name, page, c, "SKIPPED", route, "落点探针没给结果（routeStack 取空/超时）⇒ 不知是否已在 " + page + "，答案无法归属，待重跑", observed));
      } else {
        const miss = [];
        let evid = "";
        if (FRAME_RE.test(String(c.evidence || "")) || cls.length) {
          const f = join(SHOT_DIR, name + "-" + c.id + "-after.png");
          try {
            rmSync(f, { force: true }); shot(f, { project: PROJECT });
            const sz = statSync(f).size;
            if (sz > 3000) { evid = relOf(f) + "(" + sz + "B)"; stats.shots++; } else miss.push(relOf(f) + "(仅 " + sz + "B，不当证据)");
          } catch (e) { miss.push(relOf(f) + "(未写出:" + String(e.message).slice(0, 60) + ")"); }
        }
        const answered = cls.filter((s) => dom[s] && dom[s] !== "no-answer" && !String(dom[s]).startsWith("ERR"));
        if (!evid && !answered.length) {
          /* 帧没拿到、探针也没答案 ⇒ 这一条仍然没有任何可交的证据 */
          stats.skipMiss++;
          rows.push(row(name, page, c, "SKIPPED", route, "出帧失败且探针无有效答案（miss=" + miss.join(";") + "）⇒ 不记 EXECUTED，待重跑", observed, "", miss));
          if (--budget <= 0) { stopped = true; break; }
          continue;
        }
        if (!cls.length) stats.noClass++;
        stats.executed++;
        rows.push(row(name, page, c, "EXECUTED", route, "", observed, evid, miss));
      }
      if (--budget <= 0) { stopped = true; break; }
    }
    flush();
    console.log("RUNNER_GROUP page=" + page + " 本次新行=" + rows.length + " executed=" + stats.executed +
      " failed=" + stats.failed + " skipped=" + skippedTotal() +
      " 出帧=" + stats.shots + " 通道异常=" + transportErrs + " 已跑=" + ((Date.now() - BOOT_T) / 60000).toFixed(1) + "min");
  }
}

/* 守恒：新行与旧行按 manifest|id 合并，状态只允许三种词，总数必须等于两边之和减重复。
   对不上就不写盘——「账没闭合还把结果落下去」是本轮已被门禁点过名的那类失败。 */
const merged = new Map();
for (const r of [...(prior.results || []), ...rows]) merged.set(r.manifest + "|" + r.id, r);
const all = [...merged.values()];
const dupNew = rows.length - new Set(rows.map((r) => r.manifest + "|" + r.id)).size;
const bad = all.filter((r) => !["EXECUTED", "FAILED", "SKIPPED"].includes(r.status));
console.log("RUNNER_ROWS new=" + rows.length + " merged=" + all.length + " 之前已有=" + (prior.results || []).length + " 重复新行=" + dupNew);
console.log("RUNNER_STATS identity=" + IDENTITY + " loginVerify=" + LOGIN_VERIFY + " executed=" + stats.executed + " failed=" + stats.failed +
  " skipped=" + skippedTotal() +
  "(交互动词=" + stats.skipTap + " requiresReal=" + stats.skipReal + " 非真实用例=" + stats.skipNonReal + " 探针无结果=" + stats.skipProbe +
  " 判据无可判物件=" + stats.skipNoCrit + " 出帧失败=" + stats.skipMiss + ") 页组=" + stats.pages +
  " 折叠探针类名次数=" + stats.probes + " 出帧=" + stats.shots + " 未点名类名=" + stats.noClass + " 通道异常次数=" + transportErrs);
const statusOf = {};
for (const r of all) statusOf[r.status] = (statusOf[r.status] || 0) + 1;
console.log("RUNNER_STATUS_ALL " + Object.keys(statusOf).sort().map((k) => k + "=" + statusOf[k]).join(" "));
const holes = all.filter(evidenceHole);
console.log("RUNNER_EVIDENCE_HOLE " + holes.length + (holes.length ? " 条 EXECUTED 既无帧也无探针答案：" + holes.slice(0, 8).map((r) => r.manifest + "/" + r.id).join(",") : ""));
const fails = [];
if (!rows.length) fails.push("一行都没产生（要么全跑过了，要么筛选把用例全挡住了 ⇒ 这不叫跑完）");
if (holes.length) fails.push(holes.length + " 条 EXECUTED 没有任何证据（无帧且无探针答案）⇒ 没有证据的绿不许入账，用 --redo-holes 重测或补判据");
if (dupNew) fails.push("同一次跑里出现重复 manifest|id " + dupNew + " 条");
if (bad.length) fails.push("出现非法状态 " + bad.length + " 条");
if (all.length !== (prior.results || []).length + rows.length - dupNew) fails.push("合并后总数对不上");
if (fails.length) { console.log("RUNNER_RESULT=FAIL reason=" + fails.join(" / ") + " ⇒ 不写盘"); process.exit(2); }
writeFileSync(RES, JSON.stringify({ round: LABEL, gitSha: GIT_SHA, identity: IDENTITY, loginVerify: LOGIN_VERIFY, updatedAt: new Date().toISOString(), runner: "scripts/qa/r-exec-cli.mjs（observe-only 切片）", results: all }, null, 1));
console.log("RUNNER_WRITTEN=" + relOf(RES) + " results=" + all.length);
console.log("RUNNER_SCOPE=" + (process.argv.includes("--real-cases-only") ? "real-cases-only（只跑 requiresReal 那一批，产物必须是 mp-weixin-real）" : "observe-only（交互型与真实型未跑；这不是一轮完整的执行轮，覆盖数见上面 RUNNER_STATS）"));
console.log("RUNNER_RESULT=OK");
