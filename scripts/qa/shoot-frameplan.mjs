#!/usr/bin/env node
/* 按「取景配方」跑一轮定向取景：打开页 → （必要时）切身份 → 折叠探测该条的点名字物件 → 出帧。
 *
 * 为什么单独一个执行器而不是塞进 r-exec：r-exec 系列是"用例驱动"的（1107 条用例、observe-only），
 * 这一轮是"配方驱动"的（42 条 NEEDS_UI_FRAME 条目，每条自带 route/steps/assertions）。
 * 两者的记账形状不同，混在一个文件里会让两种守恒互相掩盖。
 *
 * 判点口径（与本轮一贯规则一致）：
 *   · selector 型断言：机器判 present(N)/absent，探测失败就是"没测到"，不记成 absent；
 *   · text/观感型断言：机器读不到渲染文本，帧就是它的载体 ⇒ 记 FRAME_ONLY，交人读帧；
 *   · 一条 SHOOT 项没有产出可用帧 ⇒ 记 EVIDENCE_HOLE 并 exit 非 0，绝不写"已完成"。
 *
 * 用法：PATH=<node22> node scripts/qa/shoot-frameplan.mjs \
 *   --plan reports/audit/round-7/frameplan-merged.json \
 *   --project apps/client/dist/build/mp-weixin --label round-7-uidebt [--limit N]
 * 干跑（只打印计划不出帧不写盘）：--dry */
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { evaluate, openPage, shot, mintToken, bootSession, verifyLogin, routeStack, clearSession } from "./cli-automator.mjs";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin"));
const PLAN = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-merged.json"));
const LABEL = arg("label", "round-7-uidebt");
const SHOT_DIR = join(REPO, "reports/screenshots", LABEL);
const OUT = resolve(REPO, arg("out", "reports/audit/round-7/uidebt-shoot"));
const SETTLE = Number(arg("settle", "2400"));
const LIMIT = Number(arg("limit", "0"));
const DRY = flag("dry");
const sleep = (ms) => { const t = Date.now() + ms; while (Date.now() < t) {} };
const relOf = (p) => p.split("\\").join("/").replace(REPO.split("\\").join("/") + "/", "");

function git(a) { try { return execFileSync("git", a.split(" "), { cwd: REPO, encoding: "utf8" }).trim(); } catch { return ""; } }
const GIT_SHA = git("rev-parse --short HEAD") || "unknown";

if (!existsSync(PLAN)) { console.log("SHOOT_RESULT=FAIL reason=配方不存在 " + relOf(PLAN)); process.exit(2); }
if (!existsSync(join(PROJECT, "app.json"))) { console.log("SHOOT_RESULT=FAIL reason=--project 不是已编译产物：" + relOf(PROJECT)); process.exit(2); }
const plan = JSON.parse(readFileSync(PLAN, "utf8"));
let items = (plan.rows || []).filter((r) => r.disposition === "SHOOT" && r.route);
/* --only-ids 是子集开关，不是新的判据：用来把"上一轮卡在状态未施加"的那批单独重拍，
   同时不覆盖上一轮已经出帧的条目（配合 --label/--out 换新目录）。子集跑完守恒只在子集内成立。 */
const ONLY = arg("only-ids", "");
const ONLY_SET = ONLY ? new Set(ONLY.split(/[,\s]+/).filter(Boolean)) : null;
if (ONLY_SET) {
  const before = items.length;
  items = items.filter((r) => ONLY_SET.has(r.id));
  const miss = [...ONLY_SET].filter((x) => !items.some((r) => r.id === x));
  console.log("SHOOT_SUBSET 请求=" + ONLY_SET.size + " 命中=" + items.length + " 全集=" + before + (miss.length ? " 请求里查无此条=" + miss.join(",") : ""));
  if (miss.length) { console.log("SHOOT_RESULT=FAIL reason=--only-ids 里有配方不认识的 id，子集不闭合"); process.exit(2); }
}
if (!items.length) { console.log("SHOOT_RESULT=FAIL reason=配方里没有可拍的条目（空扫描集不算跑完）"); process.exit(2); }
if ((plan.stillBad || []).length) { console.log("SHOOT_RESULT=FAIL reason=配方里还有 " + plan.stillBad.length + " 处查无此物的依据，先去修配方"); process.exit(2); }

function selectorsOf(a) {
  const raw = String(a.target || a.sel || a.class || "");
  const out = [];
  /* 只收 BEM 形态的类名（必须有 __ 或 --），统一成 selectorQuery 认的 ".x"：
     lane 写法有带点有不带点，而放宽成"任何标识符"会把 png/常量名也当选择器。 */
  for (const m of raw.matchAll(/\.?([a-zA-Z][\w-]*(?:__|--)[\w-]+)/g)) out.push("." + m[1]);
  return [...new Set(out)];
}
/* 折叠探测：沿用 r-exec-cli 里已验证与 WS 逐条一致（14/14）的两步法——起 K 条
   createSelectorQuery 把条数写进 app 上的普通字段，第二次调用只读那个字段。
   返回 Promise 的写法在本机不会被 await（notes §12），所以必须拆两步。
   反面教材：我第一版在这里自己写了 document.querySelectorAll，小程序运行时没有 document，
   那会造出「探测器永远答 0」的假阴性——那是我的测量错，不是产品缺陷。 */
function probeMany(selectors) {
  const uniq = [...new Set(selectors)];
  if (!uniq.length) return {};
  const js = "() => { const app = getApp(); const bag = {}; app.__fpBag = bag; " +
    "const sels = " + JSON.stringify(uniq) + "; " +
    "sels.forEach(function (s, i) { try { const q = wx.createSelectorQuery(); " +
    "q.selectAll(s).fields({ size: true }, function (res) { bag[i] = (Array.isArray(res) ? res.length : (res ? 1 : 0)); }); q.exec(); } " +
    "catch (e) { bag[i] = 'ERR'; } }); return 'started:' + sels.length; }";
  const read = "() => JSON.stringify(getApp().__fpBag || {})";
  try {
    evaluate(js, { project: PROJECT });
    sleep(900);
    let r = evaluate(read, { project: PROJECT });
    let o = typeof r === "string" ? JSON.parse(r) : (r && r.value ? JSON.parse(r.value) : {});
    /* 空 bag 再读一次：折叠探测是"点火 + 取件"两步，取件早于回调就会拿到空对象，
       而空对象在下游会被算成"每个锚点都是 0"——那是通道故障伪装成产品缺陷（本轮 14 条）。 */
    if (o && typeof o === "object" && !Object.keys(o).length) {
      sleep(1600);
      r = evaluate(read, { project: PROJECT });
      const o2 = typeof r === "string" ? JSON.parse(r) : (r && r.value ? JSON.parse(r.value) : null);
      if (o2 && typeof o2 === "object" && Object.keys(o2).length) o = o2;
    }
    if (!o || typeof o !== "object") return { __err: "非 JSON 回答" };
    if (!Object.keys(o).length) return { __err: "两次取件都是空 bag（探针没跑通）" };
    const out = {};
    uniq.forEach((s, i) => { out[s] = o[i]; });
    if (o.__err !== undefined) out.__err = o.__err;
    return out;
  } catch (e) { return { __err: String(e.message).slice(0, 70) }; }
}

/* 执行配方里的 steps。两类分开对待，别把"我没做"记成"产品没修"：
   · CLI 这条通道能做的：open-page / navigate / open-url / scroll / wait / set-theme / capture / measure（后两个只记要做过）
   · 做不了的：tap / input / longpress / press-hold / swipe-card / re-enter-tab —— 那些要 WS 那条腿（r-exec-ws 的 wsTap）
     没做的步骤记进 unmet，这条就判 STATE_NOT_APPLIED，不进入判决。 */
const CLI_DOABLE_NOTE = "tap/input/longpress/swipe/press-hold/re-enter-tab 走 WS 那条腿";
function cleanSel(s) {
  const t = String(s || "").replace(/\s+/g, "").replace(/\.{2,}/g, ".");
  if (!t || t === ".") return "";
  return t.startsWith(".") ? t : "." + t;
}
async function runSteps(steps, ident) {
  const unmet = [], did = [], wsDid = [], wsFailed = [];
  for (const st of steps || []) {
    const a = String(st.action || "none").trim();
    if (a === "open-page" || a === "navigate" || a === "open-url") { did.push(a); continue; }   // 页已由外层打开
    if (a === "none") { did.push("none"); continue; }
    if (a === "wait") { sleep(Number(st.ms || 1200) || 1200); did.push("wait"); continue; }
    if (a === "capture" || a === "measure") { did.push(a); continue; }                            // 出帧/量算由本执行器的帧承担
    if (a === "set-theme") {
      try { evaluate("() => { try { getApp().__theme='" + String(st.value || "light").replace(/'/g, "") + "'; return 'ok'; } catch(e){ return 'ERR '+e.message; } }", { project: PROJECT }); did.push("set-theme"); }
      catch (e) { unmet.push(a + ":" + String(e.message).slice(0, 40)); }
      continue;
    }
    if (a === "scroll") {
      const sel = cleanSel(st.selector);
      try {
        evaluate("() => { try { wx.pageScrollTo({ scrollTop: " + (Number(st.to) || 600) + ", duration: 200 }); return 'ok'; } catch(e){ return 'ERR '+e.message; } }", { project: PROJECT });
        sleep(900); did.push(sel ? "scroll→" + sel : "scroll");
      } catch (e) { unmet.push(a + ":" + String(e.message).slice(0, 40)); }
      continue;
    }
    /* 交互动作走 WS 那条腿。关键记账：WS 没启用/连不上 ⇒ 记 unmet（我没做），
       WS 做了但选择器查不到 ⇒ 也记 unmet 并写明原因——同样是"状态没施加"，不是产品判红。
       只有真做出动作才算 applied；绝不把"试过"当成"做到了"。 */
    if (WS_ACTS.has(a)) {
      const r = await doWsStep(st);
      if (r.ok) { wsDid.push(a + (r.note ? "(" + r.note + ")" : "")); did.push(a); sleep(Number(st.settle || 900) || 900); }
      else { unmet.push(a + ":" + r.why); wsFailed.push(a + ":" + r.why); }
      continue;
    }
    unmet.push(a);
  }
  return { unmet, did, wsDid, wsFailed };
}

/* WS 那条腿只用来做 CLI 做不到的动作（tap/input/longpress/swipe）。
   为什么不让它也出帧：实测 mini.screenshot() 61 s/张且 5 次里 2 次超时，桥是 2.6 s/张。
   绝不 close()——实测 close 会把 9420 那个 IDE 子进程整个带走；退出靠 process.exit。 */
let wsMini = null, wsErrs = 0;
/* miniprogram-automator 在这个仓里不在 scripts/qa 的解析路径上（pnpm 布局），
   直接 require 会 MODULE_NOT_FOUND，必须回落到 .pnpm 存储里那份真实路径——同 r-exec-ws 的装载法。
   绝不 close()：实测 close 会把 9420 那个 IDE 子进程整个带走；退出靠 process.exit。 */
async function wsSession() {
  if (wsMini) return wsMini;
  if (!flag("ws-taps")) return null;
  try {
    const { createRequire } = await import("node:module");
    const req = createRequire(import.meta.url);
    let A = null;
    try { A = req("miniprogram-automator"); } catch {
      const store = join(REPO, "node_modules", ".pnpm");
      const hit = readdirSync(store).filter((d) => d.startsWith("miniprogram-automator@")).sort()[0];
      if (hit) A = req(join(store, hit, "node_modules", "miniprogram-automator"));
    }
    if (!A) throw new Error("找不到 miniprogram-automator");
    wsMini = await Promise.race([A.connect({ wsEndpoint: "ws://127.0.0.1:" + (process.env.WSX_PORT || "9420") }),
      new Promise((_, rj) => setTimeout(() => rj(new Error("CONNECT_TIMEOUT_8S")), 12000))]);
    console.log("  ws-connected 9420");
    return wsMini;
  } catch (e) { wsErrs++; console.log("  ws-connect-err " + String(e.message).slice(0, 60) + " ⇒ 本轮交互步骤退回 unmet"); return null; }
}
const WS_ACTS = new Set(["tap", "longpress", "input", "swipe", "swipe-card", "press-hold", "re-enter-tab"]);
const DENY_TAP = /注销|解绑|清空|删除账号|删除帐号|退出登录|登出/;

/* 数量探测回答不了"文本里有没有某个字面量"和"盒子是不是 ≥88rpx"。
   上一轮就是把 text-not-contains / bounding-box-* 当成"物件在场否"来判，
   于是「错误文案里出现键名字面量」这种判点被读成"节点在 ⇒ 判红"，
   而真相要么是正确的文案（应当成立），要么根本没有正确文案（才叫未修）。
   这里补第二载具：用 WS 那条腿逐个锚点读 element.text() / element.size()。 */
async function wsMeasure(anchors) {
  const m = await wsSession();
  if (!m) return { __err: "WS 未启用或连不上" };
  const out = {};
  try {
    const page = await m.currentPage();
    for (const sel of anchors) {
      const els = await page.$$(sel).catch(() => null);
      if (!els) { out[sel] = { __err: "查不到" }; continue; }
      const rec = { n: els.length };
      if (els.length) {
        try { rec.text = String(await els[0].text() || ""); } catch (e) { rec.textErr = String(e.message).slice(0, 30); }
        try { const s = await els[0].size(); rec.width = s && s.width; rec.height = s && s.height; } catch (e) { rec.sizeErr = String(e.message).slice(0, 30); }
      }
      out[sel] = rec;
    }
    return out;
  } catch (e) { wsErrs++; return { __err: String(e.message).slice(0, 60) }; }
}
/* 从 expected 里取被「」括起来的字面量；取不到就不许判（不是"没提到就算通过"）。 */
const quoted = (s) => (String(s || "").match(/[「"']([^」"']{2,})[」"']/g) || []).map((x) => x.slice(1, -1));
function textVerdict(a, rec) {
  const need = quoted(a.expected);
  if (!rec || rec.__err) return { check: "PROBE_NO_ANSWER", note: (rec && rec.__err) || "WS 没回文本" };
  const got = rec.text || "";
  if (!need.length) return { check: "PROBE_NO_ANSWER", note: "expected 里没有可核对的字面量" };
  const wantAbsent = /not-contains|不得出现|不许出现/i.test(String(a.kind || "") + String(a.expected || ""));
  if (wantAbsent) {
    const hit = need.filter((x) => got.includes(x));
    return { check: hit.length ? "TEXT_LEAK(" + hit.join(",").slice(0, 40) + ")" : "TEXT_CLEAN", count: rec.n };
  }
  const hit = need.filter((x) => got.includes(x));
  return { check: hit.length ? "TEXT_MATCH(" + hit[0].slice(0, 24) + ")" : "TEXT_MISS", count: rec.n };
}
/* rpx→px 按视口宽/750 折算；expected 里若直接写了 px 以它为准。 */
function boxVerdict(a, rec, vpW) {
  if (!rec || rec.__err || rec.width === undefined) return { check: "PROBE_NO_ANSWER", note: (rec && (rec.__err || rec.sizeErr)) || "没有尺寸" };
  const m = String(a.expected || "").match(/(\d+(?:\.\d+)?)\s*(rpx|px)/);
  if (!m) return { check: "PROBE_NO_ANSWER", note: "expected 没写阈值" };
  const want = m[2] === "rpx" ? Number(m[1]) * (vpW || 375) / 750 : Number(m[1]);
  const min = /min|≥|不小于/.test(String(a.kind || "") + String(a.expected || ""));
  const bad = rec.width < want - 1 || rec.height < want - 1;
  if (min) return { check: bad ? "BOX_SMALL(" + rec.width + "x" + rec.height + "<" + want.toFixed(0) + ")" : "BOX_OK(" + rec.width + "x" + rec.height + ")", count: rec.n };
  const off = Math.abs(rec.width - want) > 2 || Math.abs(rec.height - want) > 2;
  return { check: off ? "BOX_OFF(" + rec.width + "x" + rec.height + "≠" + want.toFixed(0) + ")" : "BOX_OK(" + rec.width + "x" + rec.height + ")", count: rec.n };
}
async function doWsStep(st) {
  const act = String(st.action || "").trim();
  if (!WS_ACTS.has(act)) return { ok: false, why: "未知动作 " + act };
  /* 不可逆动作一律不碰：这些 recipe 若真点进注销/删除流程，留下的不是证据而是被毁掉的账号。 */
  if (DENY_TAP.test(String((st.note || "") + " " + (st.selector || "")))) return { ok: false, why: "禁触动作（不可逆）" };
  const m = await wsSession();
  if (!m) return { ok: false, why: "WS 未启用或连不上" };
  const sel = cleanSel(st.selector);
  try {
    const page = await m.currentPage();
    if (!sel) {
      const r2 = await m.evaluate(() => 1).catch(() => null);
      return r2 === null ? { ok: false, why: "会话无响应" } : { ok: true, note: act + " 无选择器：仅确认会话可达" };
    }
    const el = await page.$(sel);
    if (!el) return { ok: false, why: "选择器在当前页查不到 " + sel };
    if (act === "tap") { await el.tap(); return { ok: true }; }
    if (act === "longpress" || act === "press-hold") { await el.longpress(); return { ok: true }; }
    if (act === "input") { await el.input(String(st.value || st.text || "测试").slice(0, 40)); return { ok: true }; }
    await el.tap(); return { ok: true, note: act + " 退化成 tap" };
  } catch (e) { wsErrs++; return { ok: false, why: String(e.message).slice(0, 60) }; }
}

/* 落点确认的第二条腿：CLI 的 routeStack 会把整次 evaluate 的失败原文当值返回（"ERR:automation_evaluate 调用失败…"），
   本轮实测有 5 条就是这样丢掉判决的——那不是"页面对不上"，是"这条通道没答案"。
   WS 的 pageStack 走的是另一个端口，拿得到就补上；两条腿都没有答案才记 NO_LANDING。
   记 landingVia，读者能看出这个落点是哪条通道给的。 */
async function wsLanding() {
  const m = await wsSession();
  if (!m) return "";
  try {
    const ps = await m.pageStack();
    if (!Array.isArray(ps) || !ps.length) return "";
    /* 返回整条栈的拼接，不是栈顶一页：CLI 那条腿的 routeStack 给的就是"栈"，
       落点判据写的是 landing.includes(route)。只回栈顶会让"从别的页 navigateTocampus 进来"
       这类正常情况被误判成没到达（实测：探针在目标页查到了物件，栈读数的口径却不一样）。 */
    return ps.map((p) => String((p && (p.path || p.__route__)) || "")).filter(Boolean).join(" → ");
  } catch (e) { wsErrs++; return "ERR " + String(e.message).slice(0, 40); }
}
async function cliLanding() {
  try { return String(routeStack({ project: PROJECT }) || ""); } catch (e) { return "ERR " + String(e.message).slice(0, 40); }
}
const usable = (s) => s && !String(s).startsWith("ERR") ? String(s) : "";

let currentIdentity = null, verifyLast = "";

async function ensureIdentity(which) {
  if (which === "guest" ? currentIdentity === "guest" : currentIdentity === "A") return;
  let b;
  if (which === "guest") {
    /* 游客不是"铸一个 B token"——那样 boot 完还是登录态。上一版就在这里把身份标签写错了：
       日志打 guest、verify 回 logged-in，帧却是已登录页，等于给同一页盖了两个身份的章。
       现在必须真清会话，且量到 logged-in 就直接失败，不让它带着错标签出帧。 */
    b = clearSession({ project: PROJECT });
    currentIdentity = null;
    verifyLast = verifyLogin({ project: PROJECT });
    if (!/^not-logged-in/.test(verifyLast)) throw new Error("要游客态但会话没清掉：" + verifyLast);
    currentIdentity = "guest";
    console.log("[identity] guest clear=" + b + " verify=" + verifyLast);
    return;
  }
  const t = (await mintToken("A", REPO, "r7-uidebt-" + which)).token;
  b = bootSession(t, { project: PROJECT });
  verifyLast = verifyLogin({ project: PROJECT });
  currentIdentity = which;
  console.log("[identity] " + which + " boot=" + b + " verify=" + verifyLast);
  if (!/^logged-in/.test(verifyLast)) throw new Error("身份 A 没登进去：" + verifyLast);
}

/* lane 写的 precondition.identity 是一句中文（"A（已登录且资料已完善…）"、"guest 身份"…），
   直接当分组键会把同一身份拆成 N 组、每组重新铸一次 token。归一化只做一件事：认不认得出是游客。 */
const normIdent = (v) => (/guest|游客|未登录/i.test(String(v || "")) ? "guest" : "A");
const byRoute = new Map();
for (const it of items) {
  const key = it.route + "|" + normIdent(it.precondition && it.precondition.identity);
  if (!byRoute.has(key)) byRoute.set(key, []);
  byRoute.get(key).push(it);
}
if (!DRY) { mkdirSync(SHOT_DIR, { recursive: true }); mkdirSync(OUT, { recursive: true }); }
/* 上一轮（同 OUT 目录）的落点确认集合——决定哪些帧可以复用。读不到就当作首轮。 */
const REUSE_PREV_OK = new Set((() => {
  try {
    const prev = JSON.parse(readFileSync(join(OUT, "shoot-results.json"), "utf8"));
    return (prev.rows || []).filter((x) => x && x.landing && x.route && String(x.landing).includes(String(x.route))).map((x) => x.id);
  } catch { return []; }
})());
console.log("SHOOT_PLAN items=" + items.length + " 组(路由×身份)=" + byRoute.size + " sha=" + GIT_SHA + " project=" + relOf(PROJECT) + (DRY ? " DRY" : ""));
if (DRY) {
  /* 干跑不许占设备：上一版 --dry 仍然铸 token、开页，等于"说是干跑其实把现场改了"。 */
  for (const [k, grp] of byRoute) console.log("  DRY_GROUP " + k + " 条目=" + grp.map((x) => x.id).join(","));
  console.log("SHOOT_RESULT=DRY 未碰设备、未写盘");
  process.exit(0);
}

/* 有些页按设计就不接受裸直达，缺的是 URL 参数而不是产品修复：
   campus/index 的 onLoad 写明"无 ?school= 时校园圈入口应落到 hub"（源码注释 2026-08-25 P0），
   所以直接 openPage 必然被 redirectTo 弹走。把这类路由的必需参数写成数据，
   比让 15 条执行行 + 1 条帧行长期挂在"落在别的页"上要诚实得多。 */
const ROUTE_QUERY = {
  "subpackages/campus/campus/index": "school=" + encodeURIComponent("南京大学"),
};
const queryFor = (it, route) => String((it && it.precondition && it.precondition.query) || ROUTE_QUERY[route] || "");

const rows = [];
let holes = 0, done = 0, transportErrs = 0;
for (const [key, grp] of byRoute) {
  const [route, ident] = key.split("|");
  if (LIMIT && done >= LIMIT) break;
  let booted = false;
  for (let a = 0; a < 2 && !booted; a++) {
    try { await ensureIdentity(ident); booted = true; }
    catch (e) {
      transportErrs++;
      currentIdentity = null;
      console.log("  identity-err(" + a + ") " + ident + " :: " + String(e.message).slice(0, 60));
      if (a === 0) sleep(2500);
      else for (const it of grp) rows.push({ id: it.id, route, status: "NO_EVIDENCE", reason: "身份前置两次都失败：" + String(e.message).slice(0, 60) });
    }
  }
  if (!booted) continue;
  let opened = false;
  const q = queryFor(grp[0], route);
  for (let attempt = 0; attempt < 2 && !opened; attempt++) {
    try { openPage(route, q, { project: PROJECT }); opened = true; }
    catch (e) { transportErrs++; console.log("  open-err(" + attempt + ") " + route + " :: " + String(e.message).slice(0, 70)); sleep(1800); }
  }
  if (!opened) { for (const it of grp) rows.push({ id: it.id, route, status: "FAILED", reason: "open_page 两次都失败" }); continue; }
  sleep(SETTLE);
  /* 落点要三态：确认 / 落在别的页 / 探针没答案。上一版只重试一次，结果 10 条因 routeStack
     取空被判成"落点未确认"，白丢 10 个判决——这条通道的 evaluate 偶发失败是已知行为，
     重试预算要给够（最多 3 次，每次之间重新开页）。 */
  let landing = "", landingVia = "";
  for (let a = 0; a < 3 && !usable(landing).includes(route); a++) {
    landing = await cliLanding(); landingVia = "cli";
    if (!usable(landing).includes(route)) {
      const w = await wsLanding();
      if (usable(w).includes(route)) { landing = w; landingVia = "ws"; }
      else if (!usable(landing) && usable(w)) { landing = w; landingVia = "ws"; }
    }
    if (usable(landing).includes(route)) break;
    transportErrs++;
    sleep(1800);
    if (a > 0) { try { openPage(route, q, { project: PROJECT }); sleep(SETTLE); } catch (e) { /* 开页失败下一轮再试 */ } }
  }
  const landed = landing.includes(route);
  for (const it of grp) {
    /* 先按配方把状态做出来，再探测。做不了的步骤（tap/input…）记 unmet ⇒ 这条只能判"状态未施加"，
       不能判红：上一轮我就是把"没点开的弹层"记成了 26 条未成立判点，那是测量错不是产品缺陷。 */
    const sp = await runSteps(it.steps, ident);
    if (sp.did.length) sleep(1000);
    /* 步骤做完再确认一次落点：交互可能把页面导航走了（返回按钮、跳详情）。
       不记这个，探针就会在"隔壁页"上查本页的物件，查不到 ⇒ 判红 —— 那是测量错。 */
    let landingAfter = "";
    if (sp.wsDid.length) {
      try { landingAfter = String(routeStack({ project: PROJECT }) || ""); } catch (e) { landingAfter = "ERR " + String(e.message).slice(0, 40); }
    }
    const sels = [...new Set(it.assertionList.flatMap((a) => selectorsOf(a)))];
    const dom = (!DRY && sels.length) ? probeMany(sels) : {};
    /* 文本/尺寸判点要的是第二载具（数量探测答不了"字面量在不在文案里"、"盒子多大"）。
       只在真的有这类判点时才走 WS，避免给纯数量条目平白加一次往返。 */
    const needsSecond = it.assertionList.some((a) => /text|bounding-box|computed-style/i.test(String(a.kind || "")));
    let meas = null, vpW = 0;
    if (needsSecond && !DRY && flag("ws-taps")) {
      meas = await wsMeasure(sels);
      try { vpW = Number(evaluate("() => { try { return wx.getWindowInfo ? wx.getWindowInfo().windowWidth : wx.getSystemInfoSync().windowWidth; } catch(e){ return 0; } }", { project: PROJECT })) || 375; }
      catch (e) { vpW = 375; }
    }
    const per = [];
    for (const a of it.assertionList) {
      const ss = selectorsOf(a);
      const kind = String(a.kind || "");
      if (/text|bounding-box|computed-style/i.test(kind) && ss.length && meas) {
        const first = ss.find((s) => meas[s] && !meas[s].__err) || ss[0];
        const rec = meas[first];
        const v = /text/i.test(kind) ? textVerdict(a, rec) : boxVerdict(a, rec, vpW);
        per.push({ kind, target: a.target, anchors: ss, anchor: first, text: rec && rec.text ? rec.text.slice(0, 60) : undefined, count: rec && rec.n, ...v });
        continue;
      }
      if (!ss.length) { per.push({ kind: a.kind || "?", target: a.target || "", check: "FRAME_ONLY", note: "没有可机器查的选择器，帧是它的载体" }); continue; }
      const hit = ss.map((s) => dom[s]).filter((v2) => v2 !== undefined);
      if (dom.__err) { per.push({ kind: a.kind, target: a.target, check: "PROBE_NO_ANSWER", note: String(dom.__err).slice(0, 50) }); continue; }
      if (!hit.length) { per.push({ kind: a.kind, target: a.target, check: "PROBE_NO_ANSWER", note: "折叠探测没回这些锚点的数（" + ss.join(",") + "）", anchors: ss }); continue; }
      const n = Math.max(0, ...hit.map((v2) => Number(v2) || 0));
      /* 极性只认 lane 声明的 kind：以前还把 expected 散文里的「无 / 不」也算成"不该出现"，
         于是「未解锁分支不显示徽标」这类写法会把 present 判成 absent——判红一片，其实是我读错了。
         散文里的词不是极性字段。 */
      const wantAbsent = /absent|not-|hidden|不出现/i.test(String(a.kind || ""));
      per.push({ kind: a.kind, target: a.target, count: n, check: wantAbsent ? (n === 0 ? "ABSENT_OK" : "PRESENT_UNEXPECTED(" + n + ")") : (n > 0 ? "PRESENT(" + n + ")" : "ABSENT_UNEXPECTED"), anchors: ss });
    }
    const stepRec = { stepsApplied: sp.did, stepsUnmet: sp.unmet, wsApplied: sp.wsDid, wsFailed: sp.wsFailed, landingVia, landingAfter, stateApplied: sp.unmet.length === 0 };
    if (sp.wsDid.length || sp.wsFailed.length) console.log("  ws " + it.id + " 已做=[" + sp.wsDid.join(",") + "] 未成=[" + sp.wsFailed.join(",") + "]");
    let frame = "", bytes = 0;
    if (!DRY) {
      const name = (it.frameName || it.id) + ".png";
      /* --reuse-frames：像素可以从上一轮同一构建的帧里拿（本轮只是修了极性判断，
         重新拍一遍会覆盖同名帧 —— §19 就是被"同名覆盖毁掉溯源"坑过的）。
         复用必须写明 frameFrom，读账的人能看出这张帧是哪一次拍的。 */
      const reuseDir = flag("reuse-frames") ? resolve(REPO, arg("reuse-frames", "")) : null;
      /* 只能复用上一次的落点已经确认过的帧：落点没确认那一拍，像素可能是隔壁页的，
         复用等于把一次测量错固化成证据。 */
      const mayReuse = !!reuseDir && (REUSE_PREV_OK.size === 0 ? true : REUSE_PREV_OK.has(it.id));
      const rp = mayReuse ? join(reuseDir, name) : null;
      if (rp && existsSync(rp) && statSync(rp).size > 3000) {
        bytes = statSync(rp).size;
        frame = relOf(rp);
        rows.push({ id: it.id, route, landing, status: "SHOT", frame, bytes, checks: per, identity: ident, crop: it.crop || "", ...stepRec, frameFrom: "reused@" + relOf(rp).split("/").slice(0, -1).join("/") });
        done++;
        if (LIMIT && done >= LIMIT) break;
        continue;
      }
      const f = join(SHOT_DIR, name);
      try { rmSync(f, { force: true }); shot(f, { project: PROJECT }); bytes = statSync(f).size; if (bytes > 3000) frame = relOf(f); }
      catch (e) { rows.push({ id: it.id, route, status: "FAILED", reason: "出帧失败：" + String(e.message).slice(0, 70) }); continue; }
    }
    if (DRY || bytes > 3000) { rows.push({ id: it.id, route, landing, status: "SHOT", frame, bytes, checks: per, identity: ident, crop: it.crop || "", ...stepRec }); }
    else { holes++; rows.push({ id: it.id, route, landing, status: "EVIDENCE_HOLE", reason: "帧只有 " + bytes + "B，不当证据", checks: per, identity: ident }); }
    done++;
    if (LIMIT && done >= LIMIT) break;
  }
  console.log("SHOOT_GROUP route=" + route + " ident=" + ident + " 条目=" + grp.length + " 落点=" + (landed ? "确认" : "未确认(" + (landing || "空").slice(0, 40) + ")") + " 累计=" + done);
}

const shotRows = rows.filter((r) => r.status === "SHOT");
/* 一条 SHOOT 项只要没拿到可用帧就是证据洞 —— 包括"身份前置没上去"这种看起来像跳过的情况。
   上一版把这类记成 SKIPPED 并且不参与退出码，于是 42 条里 5 条没证据还报 OK：
   门禁说绿而账上有洞，是本轮最不该出现的那类错。 */
const noEvidence = rows.filter((r) => r.status !== "SHOT");
const machinePass = shotRows.filter((r) => (r.checks || []).every((c) => c.check === "PRESENT" || c.check.startsWith("PRESENT(") || c.check === "ABSENT_OK" || c.check === "FRAME_ONLY")).length;
if (!DRY) {
  writeFileSync(join(OUT, "shoot-results.json"), JSON.stringify({
    round: LABEL, gitSha: GIT_SHA, updatedAt: new Date().toISOString(), plan: relOf(PLAN), project: relOf(PROJECT),
    identitySeen: currentIdentity, verifyLast, planned: items.length, rows,
    counts: { SHOT: shotRows.length, EVIDENCE_HOLE: holes, FAILED: rows.filter((r) => r.status === "FAILED").length, NO_EVIDENCE: noEvidence.length },
    machinePassAllChecks: machinePass,
  }, null, 1));
}
console.log("SHOOT_SUMMARY planned=" + items.length + " 出帧=" + shotRows.length + " 无证据=" + noEvidence.length + " 证据洞=" + holes + " 失败=" + rows.filter((r) => r.status === "FAILED").length +
  " 通道异常=" + transportErrs + " WS交互成功=" + rows.reduce((n, r) => n + ((r.wsApplied || []).length), 0) + " WS交互未成=" + rows.reduce((n, r) => n + ((r.wsFailed || []).length), 0) + " WS通道异常=" + wsErrs +
  " 全部判点通过的条目=" + machinePass);
const conserved = rows.length === items.length || (LIMIT && done >= LIMIT);
console.log("SHOOT_CONSERVED=" + (conserved ? "yes" : "NO（rows=" + rows.length + " ≠ planned=" + items.length + "）"));
if (DRY) { console.log("SHOOT_RESULT=DRY"); process.exit(0); }
/* 退出码只看一件事：每一条 SHOOT 项都有可用帧。判点过没过不是这里的事（那是 verdict-from-frames 的账）。 */
console.log("SHOOT_RESULT=" + (!conserved || noEvidence.length ? "FAIL（" + noEvidence.length + " 条没拿到可用帧）" : "OK"));
process.exit(!conserved || noEvidence.length ? 2 : 0);
