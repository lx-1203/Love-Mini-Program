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
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { evaluate, openPage, shot, mintToken, bootSession, verifyLogin, routeStack } from "./cli-automator.mjs";

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
const items = (plan.rows || []).filter((r) => r.disposition === "SHOOT" && r.route);
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
    const r = evaluate(read, { project: PROJECT });
    const o = typeof r === "string" ? JSON.parse(r) : (r && r.value ? JSON.parse(r.value) : {});
    if (!o || typeof o !== "object") return { __err: "非 JSON 回答" };
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
function runSteps(steps, ident) {
  const unmet = [], did = [];
  for (const st of steps || []) {
    const a = String(st.action || "none").trim();
    if (a === "open-page" || a === "navigate" || a === "open-url") { did.push(a); continue; }   // 页已由外层打开
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
    unmet.push(a);   // tap / input / longpress / swipe / press-hold / re-enter-tab ⇒ 交给 WS 那条腿
  }
  return { unmet, did };
}

let currentIdentity = null, verifyLast = "";
async function ensureIdentity(which) {
  if (which === "guest" ? currentIdentity === "guest" : currentIdentity === "A") return;
  const t = (await mintToken(which === "guest" ? "B" : "A", REPO, "r7-uidebt-" + which)).token;
  const b = bootSession(t, { project: PROJECT });
  verifyLast = verifyLogin({ project: PROJECT });
  currentIdentity = which;
  console.log("[identity] " + which + " boot=" + b + " verify=" + verifyLast);
  if (which !== "guest" && !/^logged-in/.test(verifyLast)) throw new Error("身份 A 没登进去：" + verifyLast);
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
  for (let attempt = 0; attempt < 2 && !opened; attempt++) {
    try { openPage(route, "", { project: PROJECT }); opened = true; }
    catch (e) { transportErrs++; console.log("  open-err(" + attempt + ") " + route + " :: " + String(e.message).slice(0, 70)); sleep(1800); }
  }
  if (!opened) { for (const it of grp) rows.push({ id: it.id, route, status: "FAILED", reason: "open_page 两次都失败" }); continue; }
  sleep(SETTLE);
  /* 落点要三态：确认 / 落在别的页 / 探针没答案。上一版只重试一次，结果 10 条因 routeStack
     取空被判成"落点未确认"，白丢 10 个判决——这条通道的 evaluate 偶发失败是已知行为，
     重试预算要给够（最多 3 次，每次之间重新开页）。 */
  let landing = "";
  for (let a = 0; a < 3; a++) {
    try { landing = String(routeStack({ project: PROJECT }) || ""); } catch (e) { landing = "ERR " + String(e.message).slice(0, 40); }
    if (landing && !landing.startsWith("ERR") && landing.includes(route)) break;
    transportErrs++;
    sleep(1800);
    if (a > 0) { try { openPage(route, "", { project: PROJECT }); sleep(SETTLE); } catch (e) { /* 开页失败下一轮再试 */ } }
  }
  const landed = landing.includes(route);
  for (const it of grp) {
    /* 先按配方把状态做出来，再探测。做不了的步骤（tap/input…）记 unmet ⇒ 这条只能判"状态未施加"，
       不能判红：上一轮我就是把"没点开的弹层"记成了 26 条未成立判点，那是测量错不是产品缺陷。 */
    const sp = runSteps(it.steps, ident);
    if (sp.did.length) sleep(1000);
    const sels = [...new Set(it.assertionList.flatMap((a) => selectorsOf(a)))];
    const dom = (!DRY && sels.length) ? probeMany(sels) : {};
    const per = it.assertionList.map((a) => {
      const ss = selectorsOf(a);
      if (!ss.length) return { kind: a.kind || "?", target: a.target || "", check: "FRAME_ONLY", note: "没有可机器查的选择器，帧是它的载体" };
      const hit = ss.map((s) => dom[s]).filter((v) => v !== undefined);
      if (dom.__err) return { kind: a.kind, target: a.target, check: "PROBE_NO_ANSWER", note: String(dom.__err).slice(0, 50) };
      const n = Math.max(0, ...hit.map((v) => Number(v) || 0));
      /* 极性只认 lane 声明的 kind：以前还把 expected 散文里的「无 / 不」也算成"不该出现"，
         于是「未解锁分支不显示徽标」这类写法会把 present 判成 absent——判红一片，其实是我读错了。
         散文里的词不是极性字段。 */
      const wantAbsent = /absent|not-|hidden|不出现/i.test(String(a.kind || ""));
      return { kind: a.kind, target: a.target, count: n, check: wantAbsent ? (n === 0 ? "ABSENT_OK" : "PRESENT_UNEXPECTED(" + n + ")") : (n > 0 ? "PRESENT(" + n + ")" : "ABSENT_UNEXPECTED"), anchors: ss };
    });
    const stepRec = { stepsApplied: sp.did, stepsUnmet: sp.unmet, stateApplied: sp.unmet.length === 0 };
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
  " 通道异常=" + transportErrs + " 全部判点通过的条目=" + machinePass);
const conserved = rows.length === items.length || (LIMIT && done >= LIMIT);
console.log("SHOOT_CONSERVED=" + (conserved ? "yes" : "NO（rows=" + rows.length + " ≠ planned=" + items.length + "）"));
if (DRY) { console.log("SHOOT_RESULT=DRY"); process.exit(0); }
/* 退出码只看一件事：每一条 SHOOT 项都有可用帧。判点过没过不是这里的事（那是 verdict-from-frames 的账）。 */
console.log("SHOOT_RESULT=" + (!conserved || noEvidence.length ? "FAIL（" + noEvidence.length + " 条没拿到可用帧）" : "OK"));
process.exit(!conserved || noEvidence.length ? 2 : 0);
