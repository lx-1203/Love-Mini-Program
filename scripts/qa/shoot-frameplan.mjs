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
 *   · 帧内容守恒（本次补的）：每张过地板的帧立刻算 contentHash（sha256(字节) 前 16 位，与
 *     scripts/qa/verify-evidence-corpus.mjs:28 逐字同源），再与同 (身份,页) 组内已入账的帧比内容；
 *     "在早先状态上多做了几步、像素却逐字节相同"的帧判 UNCHANGED_AFTER_INTERACTION ——
 *     帧照写、账照记（不销毁证据），但摘掉 stateFrame/countsTowardStateQuota，并让整轮 exit=3。
 *     确属"这个状态本来就不改画面"的（开关拨回原值这类），要 --allow-unchanged-state 逐条 id 点名，
 *     判决仍在账上只多一个 stateGateWaived 标记；没有整轮关闭开关。
 *
 * 用法：PATH=<node22> node scripts/qa/shoot-frameplan.mjs \
 *   --plan reports/audit/round-7/frameplan-merged.json \
 *   --project apps/client/dist/build/mp-weixin --label round-7-uidebt [--limit N]
 * 干跑（只打印计划不出帧不写盘）：--dry
 * 退出码：0=全过；2=有 SHOOT 项没拿到可用帧；3=帧都拿到了但有帧证明不了自己挂的那个状态。 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync, readdirSync } from "node:fs";
import { acquireUi, releaseUi, renewUi } from "./ui-lease.mjs";
import { readIdePort, portIsListening, FALLBACK_PORT } from "./ide-port-config.mjs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { evaluate, openPage, shot, mintToken, bootSession, verifyLogin, routeStack, clearSession } from "./cli-automator.mjs";
import { readApiMode, assertGuestCapable } from "./artifact-band.mjs";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);
/* 模拟器独占租约（round-7 补）：本机两条通道驱动同一个 DevTools 模拟器，
   并发不会报错，只会互相换页——实测一批测量因此作废（58 行落点探针取空）。
   拿不到租约就一行都不跑，而不是"跑完再解释为什么到处是 ERR"。 */
const UI_LEASE_OWNER = "r7-shooter-" + process.pid;
if (process.argv.includes("--dry")) {
  /* dry 是"我就看一眼配方会拍什么"，恰恰最容易在别的驱动正在跑的时候被按下 ——
     以前它无条件 acquireUi()，于是"预览"把正在跑的取景腿顶掉（与 write-gates-json 的 --dry 同一族）。
     dry 分支不碰设备、不写盘，后面的 DRY 分支自己会停在打印处。 */
  console.log("SHOOT_LEASE=SKIPPED_DRY（--dry 不抢租约：预览配方不该把正在跑的测量腿顶掉）");
} else if (process.env.QA_SKIP_UI_LEASE === "1") {
  console.log("SHOOT_LEASE=SKIPPED（QA_SKIP_UI_LEASE=1，明知有别的驱动时会污染测量）");
} else {
  const gotLease = acquireUi({ owner: UI_LEASE_OWNER, batch: "R7" });
  if (!gotLease.ok) {
    console.log("SHOOT_RESULT=FAIL reason=模拟器已被占用（" + gotLease.holders.map((h) => h.owner + "@pid" + h.pid + " 租期到 " + h.leaseUntil).join("；") +
      "）⇒ 一行都不跑；确要并发请显式设 QA_SKIP_UI_LEASE=1");
    process.exit(2);
  }
  console.log("SHOOT_LEASE=ACQUIRED " + String(gotLease.file).replace(process.cwd() + "/", "") + " owner=" + UI_LEASE_OWNER);
  const releaseLease = () => { try { releaseUi({ owner: UI_LEASE_OWNER }); } catch (e) { /* 退出路径上的释放失败不该改判决 */ } };
  process.on("exit", releaseLease);
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { releaseLease(); process.exit(sig === "SIGINT" ? 130 : 143); });
}
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin"));
const PLAN = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-merged.json"));
const LABEL = arg("label", "round-7-uidebt");
const SHOT_DIR = join(REPO, "reports/screenshots", LABEL);
const OUT = resolve(REPO, arg("out", "reports/audit/round-7/uidebt-shoot"));
const SETTLE = Number(arg("settle", "2400"));
const LIMIT = Number(arg("limit", "0"));
const DRY = flag("dry");
/* 状态守恒豁免：只有"这个状态本来就不该改变画面"（开关拨回原值、点了个只改内部数据的按钮）
   才该用，而且必须逐条 id 点名 —— 故意不给 --no-state-gate 这种整轮开关：一旦能一键关，
   那 899 个冗余状态标签就又安静过账了，判据就退化成本轮一直在骂的那种"没人看的告警"。
   豁免不删判决：帧上仍写 stateChange=UNCHANGED_AFTER_INTERACTION，只多一个 stateGateWaived 标记。 */
const WAIVED_RAW = arg("allow-unchanged-state", "");
const WAIVED_IDS = new Set(WAIVED_RAW.split(/[,\s]+/).filter(Boolean));
const WAIVE_REASON = arg("allow-unchanged-reason", "调用方声明该状态视觉上不变（逐条 id 点名才生效）");
const sleep = (ms) => { const t = Date.now() + ms; while (Date.now() < t) {} };
const relOf = (p) => p.split("\\").join("/").replace(REPO.split("\\").join("/") + "/", "");

/* ========================= 帧内容守恒（内容 hash + 状态变化判决）=========================
 * 为什么必须在这里加：出帧到今天只有一张地板 —— 字节 > 3000（本文件 :515/:524/:527），
 * 而 doWsStep 的 {ok:true} 只代表"派发成功"（:309 `if (act === "tap") { await el.tap(); return { ok: true }; }`），
 * stateApplied 也只是"这一步没被记成 unmet"（:502）。三件事没有一件能证明画面真的变了。
 * 全语料实测（.zcode/tmp/gap-shooter/census-all.mjs，只读盘不碰设备）：
 *   DUP_GROUPS=280 FRAMES_IN_DUPS=1179 REDUNDANT_STATE_LABELS=899，40% 的 (identity|page) 对中招；
 *   「交互后」帧与同页「默认」基线逐字节全等的组 20 组，其中就有 pages/register/index 的 A、B 两份
 *   （reports/screenshots/round-1/A/PAGES_REGISTER_INDEX-{默认,交互后}.png，sha256:d7248197ae452770）。
 *   成因能在源码里指出：register 页那个"点击目标" .card 是
 *   apps/client/src/pages/register/index.vue:508 的裸 <view class="card">，整页 @tap 只挂在
 *   :494/:538/:615/:668/:760/:770/:791 上，卡片本身没有处理器 ⇒ 点它必然是空动作，
 *   而空动作照样被 :309 记成 ok:true、被 3000B 地板放行。
 * 判据不许另造一套：语料门禁 scripts/qa/verify-evidence-corpus.mjs:28 与追溯改判
 * scripts/qa/rebuild-frozen-manifest.mjs:37 用的都是
 *   createHash("sha256").update(readFileSync(文件)).digest("hex").slice(0, 16)
 * 字段名沿用既有 shot 记录里的 contentHash / stateFrame / countsTowardStateQuota / dupOf / identity / page，
 * 组键沿用 rebuild-frozen-manifest.mjs:89 的 `${identity}::${page}` 写法。
 * 与 rebuild-frozen-manifest.mjs:156 的差别是这件事的关键：那边把同字节帧**改判**进
 * stateNotApplied[]（换个载体继续过账，DUP_STATE_GROUPS 于是"归零"），这边在采集当场
 * 打判决并计数（UNCHANGED_AFTER_INTERACTION=n，可判红）。追溯改判只能事后清账，
 * 当场不记 hash 就永远没人知道那两张帧是同一张图。
 * 本区不读任何模块级状态（自带两个 import），所以除了 --dry（它连帧都不拍）之外，
 * .zcode/tmp/gap-shooter/ 的离线夹具能把这段字节原样 import 起来跑正反对照。
 */
/* GATE-BEGIN */
import { createHash } from "node:crypto";
import { readFileSync as gateReadFileSync } from "node:fs";

export const GATE_HASH_ALGO = "sha256(文件字节)→hex 前 16 位（同源 verify-evidence-corpus.mjs:28 / rebuild-frozen-manifest.mjs:37）";
export const BASELINE_SIG = "基线";
/* 签名里 token 的分隔符用 U+241F（␟）而不是 "+"：CSS 选择器里 "+"（相邻兄弟）、"|"（属性选择器）、
   ","（并列）都是合法字符，拿它们当分隔符会把一个 token 劈成两个，两个不同状态就可能被拼成同一个签名。 */
export const SIG_SEP = "␟";
/* 帧落盘后唯一有效的身份证：内容 hash。算不出就等于这张帧没进守恒账。 */
export const hash16 = (absPath) => createHash("sha256").update(gateReadFileSync(absPath)).digest("hex").slice(0, 16);
export const frameGroupKey = (identity, page) => `${identity || "?"}::${page || "?"}`;
export const sigTokensOf = (sig) => (!sig || sig === BASELINE_SIG ? [] : String(sig).split(SIG_SEP).filter(Boolean));
/* 状态签名 = 采集这一帧之前**真的做出来**的改状态步骤（open-page/wait/capture/measure 不算，它们不改变状态；
   被记成 unmet 的步骤也不算——"我没做"不能伪装成"做了一个不变的状态"）。 */
export function sigOf(tokens) {
  const t = (tokens || []).map((x) => String(x).trim()).filter(Boolean);
  return t.length ? t.slice().sort().join(SIG_SEP) : BASELINE_SIG;
}
function multiset(tokens) { const m = new Map(); for (const t of tokens) m.set(t, (m.get(t) || 0) + 1); return m; }
function msContains(a, b) { return [...b.entries()].every(([k, n]) => (a.get(k) || 0) >= n); }
/* 两帧状态之间只有四种关系：同一状态 / 本帧是那一帧再往前多走几步 / 本帧是那一帧的上游 / 无从比较。
   只有"多走几步"和"同一状态"这两种关系能问"那画面到底变没变"。 */
export function sigRelation(curSig, prevSig) {
  const a = sigTokensOf(curSig), b = sigTokensOf(prevSig);
  if (a.length === b.length && sigOf(a) === sigOf(b)) return "equal";
  const ca = multiset(a), cb = multiset(b);
  if (a.length > b.length && msContains(ca, cb)) return "curSuperset";
  if (b.length > a.length && msContains(cb, ca)) return "curSubset";
  return "distinct";
}
/* 判决表（越靠前越优先；只有 UNCHANGED_AFTER_INTERACTION 能判红）：
 *   NO_COMPARATOR                  组内还没有可比的帧 ⇒ 不奖不罚
 *   UNCHANGED_AFTER_INTERACTION    本帧在组内某帧的状态上多做了几步，像素却逐字节相同
 *                                  ⇒ 多做的步骤没被证明发生过；这张帧不能当那个状态的证据（可判红）
 *   BASELINE_MATCHES_RICHER_PRIOR  本帧是上游/基线状态，却与组内"更晚状态"的帧全等
 *                                  ⇒ 说谎的是那一帧，调用方按 richerPriorsSameBytes 当场追溯摘它的资格
 *   SAME_STATE_SAME_BYTES          同一状态重拍、像素相同 ⇒ 诚实，只是没有新增证据，不判红
 *   DISTINCT_STATE_SAME_BYTES      两个互不含糊不同的声明状态像素全等 ⇒ 状态标签冗余（就是语料那 899 个
 *                                  的形状），让它在账上可见，但不判红：两个不同状态本来就可能长得一样
 *   CHANGED_AFTER_INTERACTION      多做了几步且像素确实不同 ⇒ 这才是"交互后"该有的样子
 *   SAME_STATE_DIFF_BYTES          同一状态重拍、像素不同 ⇒ 采集不稳定（动画/toast/倒计时），只记录不判红
 *   UNRELATED_STATE                与组内早先帧没有可比关系 ⇒ 不奖不罚 */
export function judgeFrame({ stateSig, contentHash, priors }) {
  const list = (priors || []).filter((p) => p && p.contentHash);
  if (!contentHash) return { verdict: "NO_HASH", dupOf: "", against: "", richerPriorsSameBytes: [], stateFrame: false, countsTowardStateQuota: false, note: "没算出 contentHash ⇒ 这张帧不进守恒账" };
  if (!list.length) return { verdict: "NO_COMPARATOR", dupOf: "", against: "", richerPriorsSameBytes: [], stateFrame: true, countsTowardStateQuota: true, note: "组内第一帧，还没有可比对象" };
  let unchanged = null, changed = null, same = null, unstable = null, distinctSame = null;
  const richerSame = [];
  for (const p of list) {
    const rel = sigRelation(stateSig, p.stateSig);
    const sameBytes = p.contentHash === contentHash;
    if (rel === "curSuperset" && sameBytes) unchanged = unchanged || p;
    else if (rel === "curSubset" && sameBytes) richerSame.push(p);
    else if (rel === "equal" && sameBytes) same = same || p;
    else if (rel === "distinct" && sameBytes) distinctSame = distinctSame || p;
    else if (rel === "equal") unstable = unstable || p;
    else if (rel === "curSuperset") changed = changed || p;
  }
  if (unchanged) return { verdict: "UNCHANGED_AFTER_INTERACTION", dupOf: unchanged.id, against: unchanged.stateSig, richerPriorsSameBytes: richerSame, stateFrame: false, countsTowardStateQuota: false, note: `与同组帧「${unchanged.id}」(状态=${unchanged.stateSig}) 字节全等 sha256:${contentHash} ⇒ 本帧多做的步骤(${stateSig}) 没被证明改变过画面` };
  if (richerSame.length) return { verdict: "BASELINE_MATCHES_RICHER_PRIOR", dupOf: richerSame[0].id, against: richerSame[0].stateSig, richerPriorsSameBytes: richerSame, stateFrame: true, countsTowardStateQuota: true, note: `本帧状态(${stateSig}) 是「${richerSame[0].id}」的上游，两者字节全等 sha256:${contentHash} ⇒ 该追溯改判那一帧` };
  if (same) return { verdict: "SAME_STATE_SAME_BYTES", dupOf: same.id, against: same.stateSig, richerPriorsSameBytes: [], stateFrame: false, countsTowardStateQuota: false, note: `同一状态(${stateSig}) 重拍，像素与「${same.id}」全等 ⇒ 诚实但没有新增证据（不算缺陷，也不给两份状态额度）` };
  if (distinctSame) return { verdict: "DISTINCT_STATE_SAME_BYTES", dupOf: distinctSame.id, against: distinctSame.stateSig, richerPriorsSameBytes: [], stateFrame: true, countsTowardStateQuota: false, note: `声明的状态(${stateSig}) 与「${distinctSame.id}」(状态=${distinctSame.stateSig}) 无从比较，但像素全等 sha256:${contentHash} ⇒ 状态标签冗余，这张帧只是又盖了一个章` };
  if (changed) return { verdict: "CHANGED_AFTER_INTERACTION", dupOf: "", against: changed.id, richerPriorsSameBytes: [], stateFrame: true, countsTowardStateQuota: true, note: `相对同组帧「${changed.id}」画面确有变化（sha256:${contentHash} ≠ ${changed.contentHash}）` + (unstable ? `；注意同状态帧「${unstable.id}」字节却不同 ⇒ 本组采集有抖动` : "") };
  if (unstable) return { verdict: "SAME_STATE_DIFF_BYTES", dupOf: unstable.id, against: unstable.stateSig, richerPriorsSameBytes: [], stateFrame: false, countsTowardStateQuota: false, note: `同一状态(${stateSig}) 重拍像素却不同（与「${unstable.id}」sha256 不等）⇒ 采集不稳定，别拿差值当判决` };
  return { verdict: "UNRELATED_STATE", dupOf: "", against: "", richerPriorsSameBytes: [], stateFrame: true, countsTowardStateQuota: true, note: "与组内早先帧没有可比的状态关系（各自独立的状态），不奖不罚" };
}
/* 只有这一种判决能把整轮判红；豁免必须逐条 id 点名（见 --allow-unchanged-state），没有整轮开关。 */
export const isStateGateBlocker = (row) => !!row && row.stateChange === "UNCHANGED_AFTER_INTERACTION" && row.stateGateWaived !== true;
/* 收尾账目：把判决汇总成"调用方一眼能数出来的"那几行，并给出这一腿该带什么退出码。
   它是纯函数，所以红/绿两个方向都能在离线夹具里真跑一遍（.zcode/tmp/gap-shooter/gate-harness.mjs），
   而不是只在真机上"希望它会红"。exit：0=守恒通过，3=有帧证明不了自己挂的状态。 */
export function stateGateAudit(rows) {
  const shotRows = (rows || []).filter((r) => r && r.status === "SHOT");
  const verdictCount = {};
  for (const r of shotRows) { const k = r.stateChange || "(无判决)"; verdictCount[k] = (verdictCount[k] || 0) + 1; }
  const unchangedRows = shotRows.filter((r) => r.stateChange === "UNCHANGED_AFTER_INTERACTION");
  const blockers = unchangedRows.filter((r) => isStateGateBlocker(r));
  const lines = [];
  lines.push("SHOOT_FRAME_HASHES recorded=" + shotRows.filter((r) => r.contentHash).length + "/" + shotRows.length + " algo=" + GATE_HASH_ALGO);
  for (const [k, n] of Object.entries(verdictCount)) lines.push("  SHOOT_STATE_VERDICT " + k + "=" + n);
  lines.push("UNCHANGED_AFTER_INTERACTION=" + blockers.length + (blockers.length ? " ids=" + blockers.map((r) => r.id).join(",") : "") +
    " 其中追溯改判=" + unchangedRows.filter((r) => r.retroactive).length + " 已豁免=" + (unchangedRows.length - blockers.length));
  for (const r of blockers) lines.push("  UNCHANGED " + r.id + " 组=" + frameGroupKey(r.identity, r.route) + " 状态=" + r.stateSig + " == " + r.dupOf + " sha256:" + r.contentHash);
  return { shotRows, verdictCount, unchangedRows, blockers, lines, exit: blockers.length ? 3 : 0 };
}
/* GATE-END */

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
  const unmet = [], did = [], wsDid = [], wsFailed = [], sig = [];
  for (const st of steps || []) {
    const a = String(st.action || "none").trim();
    if (a === "open-page" || a === "navigate" || a === "open-url") { did.push(a); continue; }   // 页已由外层打开
    if (a === "none") { did.push("none"); continue; }
    if (a === "wait") { sleep(Number(st.ms || 1200) || 1200); did.push("wait"); continue; }
    if (a === "capture" || a === "measure") { did.push(a); continue; }                            // 出帧/量算由本执行器的帧承担
    if (a === "set-theme") {
      try { evaluate("() => { try { getApp().__theme='" + String(st.value || "light").replace(/'/g, "") + "'; return 'ok'; } catch(e){ return 'ERR '+e.message; } }", { project: PROJECT }); did.push("set-theme"); sig.push("theme=" + String(st.value || "light").replace(/'/g, "")); }
      catch (e) { unmet.push(a + ":" + String(e.message).slice(0, 40)); }
      continue;
    }
    if (a === "scroll") {
      const sel = cleanSel(st.selector);
      try {
        evaluate("() => { try { wx.pageScrollTo({ scrollTop: " + (Number(st.to) || 600) + ", duration: 200 }); return 'ok'; } catch(e){ return 'ERR '+e.message; } }", { project: PROJECT });
        sleep(900); did.push(sel ? "scroll→" + sel : "scroll"); sig.push("scroll:" + (sel || "页") + "@" + (Number(st.to) || 600));
      } catch (e) { unmet.push(a + ":" + String(e.message).slice(0, 40)); }
      continue;
    }
    /* 交互动作走 WS 那条腿。关键记账：WS 没启用/连不上 ⇒ 记 unmet（我没做），
       WS 做了但选择器查不到 ⇒ 也记 unmet 并写明原因——同样是"状态没施加"，不是产品判红。
       只有真做出动作才算 applied；绝不把"试过"当成"做到了"。
       :309 的 {ok:true} 只代表 el.tap() 派发成功，不代表画面变了 ⇒ 派发过的步骤进 sig（状态签名），
       由帧内容守恒去比像素；没做成（unmet）的步骤一律不进 sig，"我没做"不许伪装成"一个不变的状态"。 */
    if (WS_ACTS.has(a)) {
      const r = await doWsStep(st);
      if (r.ok) {
        wsDid.push(a + (r.note ? "(" + r.note + ")" : "")); did.push(a);
        const s2 = cleanSel(st.selector);
        sig.push(a + ":" + (s2 || "无选择器") + (a === "input" ? "=" + String(st.value || st.text || "测试").slice(0, 40) : ""));
        sleep(Number(st.settle || 900) || 900);
      }
      else { unmet.push(a + ":" + r.why); wsFailed.push(a + ":" + r.why); }
      continue;
    }
    unmet.push(a);
  }
  return { unmet, did, wsDid, wsFailed, sig };
}

/* WS 那条腿只用来做 CLI 做不到的动作（tap/input/longpress/swipe）。
   为什么不让它也出帧：实测 mini.screenshot() 61 s/张且 5 次里 2 次超时，桥是 2.6 s/张。
   绝不 close()——实测 close 会把 9420 那个 IDE 子进程整个带走；退出靠 process.exit。 */
let wsMini = null, wsErrs = 0;
/* miniprogram-automator 在这个仓里不在 scripts/qa 的解析路径上（pnpm 布局），
   直接 require 会 MODULE_NOT_FOUND，必须回落到 .pnpm 存储里那份真实路径——同 r-exec-ws 的装载法。
   绝不 close()：实测 close 会把 9420 那个 IDE 子进程整个带走；退出靠 process.exit。 */
/* 端口要**发现**，不能写死 9420：DevTools 的 NodeService 每轮换端口（本轮实测在 9430/9431），
   写死会让这条腿一整轮都拿不到 WS 证据，而它报回来的却是一句含糊的「WS 未启用或连不上」——
   把"没带旗标"和"连不上"混成同一条，正是本轮 #47 要重测的那条"WS 与 CLI 天生互斥"的成因。
   现在三件事分开：①没带 --ws-taps ⇒ 明说"未启用"；②带了就连，候选端口逐个试；
   ③连上/连不上都打端口与来源（env | discover），禁止静默。 */
function portOf(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  try { const p = new URL(t).port; if (p) return p; } catch { /* 不是完整 URL */ }
  const m = t.match(/:(\d{2,5})(?:\D|$)/);
  return m ? m[1] : "";
}
function listeningWsPorts() {
  try {
    const out = execFileSync("powershell", ["-NoProfile", "-Command",
      "(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -ge 9400 -and $_.LocalPort -lt 9500 } | Select-Object -ExpandProperty LocalPort) -join ','"],
      { encoding: "utf8", timeout: 60000 });
    return (out || "").split(/[,\s]+/).map((x) => Number(x)).filter((n) => Number.isInteger(n));
  } catch { return []; }
}
async function wsSession() {
  if (wsMini) return wsMini;
  if (!flag("ws-taps")) { console.log("  ws-off 未启用（这条腿没带 --ws-taps；不是连不上）"); return null; }
  /* 端口来源按目标 ① 的口径排：配置文件 → （配置文件漂移时）监听表发现 → 回落。
     env 只在显式覆盖时优先（做对照实验用），平时不参与。
     配置文件里的端口没在监听表上时**不静默换端口**：先把漂移打出来，再把发现到的端口当候选，
     这样这一腿的端口来源是否仍等于配置文件，读者看得见。 */
  const cfg = readIdePort({ quiet: false });
  const listening = listeningWsPorts();
  const seenPort = new Set();
  const cands = [];
  const push = (p, src) => { if (Number.isInteger(p) && !seenPort.has(p)) { seenPort.add(p); cands.push({ p, src }); } };
  push(cfg.port, cfg.source === "env" ? "env" : "config");
  if (cfg.source !== "env" && !portIsListening(cfg.port, listening)) {
    console.log("  ws-drift 配置文件说 " + cfg.port + " 不在监听表（实测 " + (listening.join(",") || "无") + "）⇒ 端口随 IDE 重启漂移；补发现候选继续连，但这一腿的端口来源已不完全是配置文件");
    for (const p of listening) push(p, "discover");
  }
  push(FALLBACK_PORT, "fallback");
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
    const tried = [];
    for (const c of cands) {
      try {
        wsMini = await Promise.race([A.connect({ wsEndpoint: "ws://127.0.0.1:" + c.p }),
          new Promise((_, rj) => setTimeout(() => rj(new Error("timeout")), 8000))]);
        console.log("  ws-connected port=" + c.p + " source=" + c.src + " 试过=" + (tried.join(",") || "首个"));
        return wsMini;
      } catch (e) { tried.push(c.p + ":" + String(e.message).slice(0, 18)); }
    }
    throw new Error("候选端口全部连不上 " + tried.join(" / "));
  } catch (e) { wsErrs++; console.log("  ws-connect-err " + String(e.message).slice(0, 90) + " ⇒ 本轮交互步骤退回 unmet"); return null; }
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
  if (!m) return { __err: "WS 不可用（具体原因见本腿日志里的 ws-off / ws-connect-err 行：没带 --ws-taps 是「未启用」，带了但连不上才是「连不上」）" };
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
  if (!m) return { ok: false, why: "WS 不可用（具体原因见本腿日志里的 ws-off / ws-connect-err 行：没带 --ws-taps 是「未启用」，带了但连不上才是「连不上」）" };
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

let currentIdentity = null, verifyLast = "", lastAtFrame = "";

async function ensureIdentity(which) {
  if (which === "guest" ? currentIdentity === "guest" : currentIdentity === "A") return;
  let b;
  if (which === "guest") {
    /* 游客不是"铸一个 B token"——那样 boot 完还是登录态。上一版就在这里把身份标签写错了：
       日志打 guest、verify 回 logged-in，帧却是已登录页，等于给同一页盖了两个身份的章。
       现在必须真清会话，且量到 logged-in 就直接失败，不让它带着错标签出帧。 */
    /* 先问载体答得出这个问题吗：mock 包开页那次会重跑启动链路并把会话造回来
       （probe-guest-band.mjs 实测 cold/warm 两腿都是 AUTOLOGIN_ON_OPEN），
       所以在这档上"清完会话"的下一瞬确实是游客、出帧时却是登录态。
       与其盖一个错的身份章，不如让这一组落到 NO_EVIDENCE 并写明缺的是哪一档载体。 */
    const cap = assertGuestCapable(REPO, PROJECT, { allow: process.argv.includes("--allow-mock-guest") });
    if (!cap.ok) throw new Error(cap.reason);
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
  "subpackages/discover-extra/discover/matching": "dev-preview=1",
  /* tag-posts 的 onLoad：无 ?tagName= 时提示并返回（P1-36），所以裸直达必然被弹走。
     取值用 fixture 里真实存在的标签（含 # 前缀，须 URL 编码）。 */
  "subpackages/village/village/tag-posts": "tagName=" + encodeURIComponent("#校园日常"),
  /* 与 r-exec-cli.mjs 的 ROUTE_QUERY（:264 起）同一行，保持一致（CS10/CS29 的输入条只在带 userId/sessionId 时才渲染）。
     取景侧也可以逐条目走 it.precondition.query（:537），但表里没有这一页时，
     只写了 route 没写 precondition.query 的条目仍会裸直达 ⇒ 这里补同一行兜底。 */
  "subpackages/chat/chat-session/index": "userId=100159",
  /* 与 r-exec-cli.mjs 的 ROUTE_QUERY 同一行，逐字照抄（一致性规则见 r-exec-cli.mjs:286）。
     完整论证（判据 pre 原文、两档取值来源、接口实测）写在 r-exec-cli.mjs 那份表里，这里不重复一遍免得两份说明跑偏。
     取景侧也能逐条目走 it.precondition.query（:541），但配方里这四页一条 precondition.query 都没写
     （reports/audit/round-7/frameplan-merged.json 里 precondition.query 命中数=0），
     只写了 route 的条目仍会裸直达 ⇒ 表里补兜底行。 */
  "subpackages/village/village/detail": "id=16",
  "subpackages/circles/circles/topic-detail": "topicId=37",
  /* 故意不落行的两页（原因逐条记在 r-exec-cli.mjs 的 ROUTE_QUERY 注释里，摘要）：
     market/detail（MD09）= app_switch commerce.enabled=0 ⇒ commerceSealed 在 onLoad:267 早退，
     且 GET /api/v1/products/* 现下全部 500（CommerceGuardAspect:49 NPE），
     且 products 全表最长 description=17 字（无"超长介绍"商品可钉，只读库不许补夹具）；同页 MD07 要的是 notFound 落点。
     profile-extra/profile/other（OT05/OT06/OT09）= 页粒度一行装不下三个互斥目标态
     （A=100158 的 likes：10001 未喜欢 / 100155 已喜欢未匹配 / 10003 互喜），
     同页 OT02/OT03 的落点又是「不带 userId 的参数缺失态」；点名物件还住在组件子树里（要 WS 腿）。 */
};
const queryFor = (it, route) => String((it && it.precondition && it.precondition.query) || ROUTE_QUERY[route] || "");

const rows = [];
let holes = 0, done = 0, transportErrs = 0;
/* 帧内容守恒的接线处：rows 本身就是对照池（同 (identity,route) 组内已入账、已算 hash 的帧），
   不另建一份平行账本 —— 建了就会有两套事实，本仓已经栽过太多次。
   每帧落盘立刻：算 hash → 判状态变化 → 记账；BASELINE_MATCHES_RICHER_PRIOR 那种
   "后来那张基线帧揭穿了前面那张交互帧"的情形，当场把前面那行追溯改判（只改内存里的账，
   像素文件一个都不动；与 rebuild-frozen-manifest.mjs:93 的 retroactive 记录口径一致）。 */
function stateFieldsFor(it, ident, route, sp, contentHash) {
  const stateSig = sigOf(sp.sig);
  const priors = rows
    .filter((r) => r.status === "SHOT" && r.identity === ident && r.route === route && r.contentHash && r.id !== it.id)
    .map((r) => ({ id: r.id, stateSig: r.stateSig, contentHash: r.contentHash }));
  const j = judgeFrame({ stateSig, contentHash, priors });
  for (const p of j.richerPriorsSameBytes || []) {
    const prev = rows.find((r) => r.id === p.id);
    if (!prev || prev.stateChange === "UNCHANGED_AFTER_INTERACTION") continue;
    Object.assign(prev, {
      stateChange: "UNCHANGED_AFTER_INTERACTION", dupOf: it.id, stateFrame: false, countsTowardStateQuota: false, retroactive: true,
      stateChangeNote: `采集后当场追溯：与同组上游状态帧「${it.id}」(状态=${stateSig}) 字节全等 sha256:${p.contentHash} ⇒ 它多做的步骤(${prev.stateSig}) 没被证明改变过画面`,
    });
    if (WAIVED_IDS.has(prev.id)) prev.stateGateWaived = true;
    console.log("  状态追溯 " + prev.id + " ⇒ UNCHANGED_AFTER_INTERACTION（被同字节的上游帧 " + it.id + " 揭穿）");
  }
  const rec = {
    stateSig, contentHash, stateChange: j.verdict, dupOf: j.dupOf || "",
    stateFrame: j.stateFrame, countsTowardStateQuota: j.countsTowardStateQuota, stateChangeNote: j.note,
  };
  if (WAIVED_IDS.has(it.id)) { rec.stateGateWaived = true; rec.stateGateWaiveReason = WAIVE_REASON; }
  console.log("  帧守恒 " + it.id + " sha256=" + (contentHash || "-") + " 状态=" + stateSig + " ⇒ " + j.verdict + (rec.stateGateWaived ? "（已豁免，仍记录）" : ""));
  return rec;
}
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
  /* 身份必须在「帧的时刻」再量一次。实测（scripts/qa/probe-guest-band.mjs，两腿都 AUTOLOGIN_ON_OPEN）：
     mock 包开页那次会重跑启动链路，把刚清掉的会话又造回来（stores/session.ts:617 的 useMock 分支），
     于是 ensureIdentity 里那条 verify=not-logged-in 只证明"清会话那一瞬"是游客，
     帧却是登录态画面——上一批 uidebt-shoot-guest / guest2 的 4 张帧就是这么标错的。
     量出来不一致 ⇒ 这一组帧一律不能当该身份的证据（标 identityOk=false，不改判决颜色）。 */
  let atFrame = "";
  try { atFrame = String(verifyLogin({ project: PROJECT }) || ""); } catch (e) { atFrame = "ERR " + String(e.message || e).slice(0, 60); }
  const identityOk = ident === "guest" ? /^not-logged-in/.test(atFrame) : /^logged-in/.test(atFrame);
  if (!identityOk) console.log("  身份错位 route=" + route + " 请求=" + ident + " 帧时刻=" + atFrame + " ⇒ 这一组帧不能当该身份的证据");
  const grpStart = rows.length;
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
    const stepRec = {
      stepsApplied: sp.did, stepsUnmet: sp.unmet, wsApplied: sp.wsDid, wsFailed: sp.wsFailed, landingVia, landingAfter,
      stateApplied: sp.unmet.length === 0,
      /* 这两个键必须说清各自管什么，否则 stateApplied 又会冒充"画面变了"：
         stateApplied = 配方要求的步骤没被记成 unmet（我做没做）；
         stateChange  = 这张帧的像素与同组上游状态帧是否真的不同（画面变没变）。
         :309 的 {ok:true} 只代表 el.tap() 派发成功，永远证明不了后者。 */
      interactionProof: sp.wsDid.length ? "WS 仅证明派发（doWsStep:309），画面是否变看 stateChange" : (sp.sig.length ? "CLI 改状态步骤已施加" : "无改状态步骤（基线帧）"),
    };
    if (sp.wsDid.length || sp.wsFailed.length) console.log("  ws " + it.id + " 已做=[" + sp.wsDid.join(",") + "] 未成=[" + sp.wsFailed.join(",") + "]");
    let frame = "", bytes = 0, contentHash = "";
    if (!DRY) {
      const name = (it.frameName || it.id) + ".png";
      /* --reuse-frames：像素可以从上一轮同一构建的帧里拿（本轮只是修了极性判断，
         重新拍一遍会覆盖同名帧 —— §19 就是被"同名覆盖毁掉溯源"坑过的）。
         复用必须写明 frameFrom，读账的人能看出这张帧是哪一次拍的。
         复用帧同样是"这一轮交出去的证"，所以它一样要算 hash、一样进守恒比对。 */
      const reuseDir = flag("reuse-frames") ? resolve(REPO, arg("reuse-frames", "")) : null;
      /* 只能复用上一次的落点已经确认过的帧：落点没确认那一拍，像素可能是隔壁页的，
         复用等于把一次测量错固化成证据。 */
      const mayReuse = !!reuseDir && (REUSE_PREV_OK.size === 0 ? true : REUSE_PREV_OK.has(it.id));
      const rp = mayReuse ? join(reuseDir, name) : null;
      if (rp && existsSync(rp) && statSync(rp).size > 3000) {
        bytes = statSync(rp).size;
        frame = relOf(rp);
        contentHash = hash16(rp);
        rows.push({ id: it.id, route, landing, status: "SHOT", frame, bytes, contentHash, checks: per, identity: ident, crop: it.crop || "", ...stepRec, ...stateFieldsFor(it, ident, route, sp, contentHash), frameFrom: "reused@" + relOf(rp).split("/").slice(0, -1).join("/") });
        done++;
        if (LIMIT && done >= LIMIT) break;
        continue;
      }
      const f = join(SHOT_DIR, name);
      /* 地板（bytes > 3000）留原样：它管"这张图是不是废帧"，管不了"画面变没变"，两件事不能互相顶替。
         过了地板就立刻算 contentHash —— 没有 hash 的帧在语料门禁那边只会被记成 noHash=无 contentHash，
         等于这一轮亲手交出一张不可核实的证据。 */
      try { rmSync(f, { force: true }); shot(f, { project: PROJECT }); bytes = statSync(f).size; if (bytes > 3000) { frame = relOf(f); contentHash = hash16(f); } }
      catch (e) { rows.push({ id: it.id, route, status: "FAILED", reason: "出帧失败：" + String(e.message).slice(0, 70) }); continue; }
    }
    if (DRY || bytes > 3000) { rows.push({ id: it.id, route, landing, status: "SHOT", frame, bytes, contentHash, checks: per, identity: ident, crop: it.crop || "", ...stepRec, ...stateFieldsFor(it, ident, route, sp, contentHash) }); }
    else { holes++; rows.push({ id: it.id, route, landing, status: "EVIDENCE_HOLE", reason: "帧只有 " + bytes + "B，不当证据", checks: per, identity: ident }); }
    done++;
    if (LIMIT && done >= LIMIT) break;
  }
  /* 整页锁屏探针：LockScreen 在帧里 ⇒ 被锁内容压根不在渲染树上。这一帧能证明
     "锁屏出现了"，不能证明"被锁的东西没做"（真实档实测：完善度 30% 的账号在
     village/index 只有锁屏，.channel-tab/.post-card 连元素级探针都答 no such element，
     那一轮 33 条 EXECUTED 全是在锁屏帧上量的）。 */
  const lockProbe = probeMany([".lock-screen"]);
  const lockAtFrame = String(lockProbe[".lock-screen"] || "no-answer");
  const lockHit = lockAtFrame.startsWith("present");
  for (const r of rows.slice(grpStart)) { r.identityAtFrame = atFrame; r.identityOk = identityOk; r.lockAtFrame = lockAtFrame; r.lockHit = lockHit; }
  lastAtFrame = route + "=" + (atFrame || "(空)") + (identityOk ? "" : "（与请求身份不符）");
  console.log("SHOOT_GROUP route=" + route + " ident=" + ident + " 条目=" + grp.length + " 落点=" + (landed ? "确认" : "未确认(" + (landing || "空").slice(0, 40) + ")") + " 身份@帧=" + atFrame.slice(0, 26) + (identityOk ? "" : " ⇒不可当该身份证据") + " 锁屏@帧=" + lockAtFrame + (lockHit ? " ⇒被锁内容的判点不作判" : "") + " 累计=" + done);
}

const shotRows = rows.filter((r) => r.status === "SHOT");
/* 一条 SHOOT 项只要没拿到可用帧就是证据洞 —— 包括"身份前置没上去"这种看起来像跳过的情况。
   上一版把这类记成 SKIPPED 并且不参与退出码，于是 42 条里 5 条没证据还报 OK：
   门禁说绿而账上有洞，是本轮最不该出现的那类错。 */
const noEvidence = rows.filter((r) => r.status !== "SHOT");
const machinePass = shotRows.filter((r) => (r.checks || []).every((c) => c.check === "PRESENT" || c.check.startsWith("PRESENT(") || c.check === "ABSENT_OK" || c.check === "FRAME_ONLY")).length;
/* ---- 帧内容守恒的账（当场记，不等事后 rebuild 改判）----
   汇总与退出码都由 stateGateAudit 算（GATE 区里的纯函数），所以这一段的红/绿两个方向
   在离线夹具里跑的就是真代码，不是另抄一遍。 */
const gateAudit = stateGateAudit(rows);
const verdictCount = gateAudit.verdictCount;
const unchangedRows = gateAudit.unchangedRows;
const stateBlockers = gateAudit.blockers;
const framesHashed = gateAudit.shotRows.filter((r) => r.contentHash).length;
const waivedRows = gateAudit.shotRows.filter((r) => r.stateGateWaived === true);
if (!DRY) {
  writeFileSync(join(OUT, "shoot-results.json"), JSON.stringify({
    round: LABEL, gitSha: GIT_SHA, updatedAt: new Date().toISOString(), plan: relOf(PLAN), project: relOf(PROJECT),
    identitySeen: currentIdentity, verifyLast, planned: items.length, rows,
    /* 帧时刻身份与档位：一组的 verifyLast 只代表"设身份那一刻"，
       mock 包会在开页那次把会话造回来 ⇒ 只有 identityAtFrame 能证明帧是谁的帧。 */
    identityAtFrameLast: lastAtFrame,
    identityMismatch: rows.filter((r) => r.identityOk === false).map((r) => r.id),
    lockHitAtFrame: rows.filter((r) => r.lockHit).map((r) => r.id),
    artifactBand: readApiMode(PROJECT),
    /* 内容守恒：hashAlgo 与语料门禁同源，读者可自己复算（verify-evidence-corpus.mjs:28）。
       帧上的键沿用 shot 记录的既有名字：contentHash / stateFrame / countsTowardStateQuota / dupOf。 */
    hashAlgo: GATE_HASH_ALGO, framesHashed,
    stateChangeVerdicts: verdictCount,
    unchangedAfterInteraction: unchangedRows.map((r) => ({ id: r.id, group: frameGroupKey(r.identity, r.route), dupOf: r.dupOf, contentHash: r.contentHash, waived: r.stateGateWaived === true, note: r.stateChangeNote })),
    unchangedStateWaived: { ids: [...WAIVED_IDS], reason: WAIVE_REASON, hit: waivedRows.map((r) => r.id) },
    counts: {
      SHOT: shotRows.length, EVIDENCE_HOLE: holes, FAILED: rows.filter((r) => r.status === "FAILED").length, NO_EVIDENCE: noEvidence.length,
      UNCHANGED_AFTER_INTERACTION: unchangedRows.length, UNCHANGED_AFTER_INTERACTION_BLOCKING: stateBlockers.length,
      SAME_STATE_SAME_BYTES: verdictCount.SAME_STATE_SAME_BYTES || 0, SAME_STATE_DIFF_BYTES: verdictCount.SAME_STATE_DIFF_BYTES || 0,
    },
    machinePassAllChecks: machinePass,
  }, null, 1));
}
console.log("SHOOT_SUMMARY planned=" + items.length + " 出帧=" + shotRows.length + " 无证据=" + noEvidence.length + " 证据洞=" + holes + " 失败=" + rows.filter((r) => r.status === "FAILED").length +
  " 通道异常=" + transportErrs + " WS交互成功=" + rows.reduce((n, r) => n + ((r.wsApplied || []).length), 0) + " WS交互未成=" + rows.reduce((n, r) => n + ((r.wsFailed || []).length), 0) + " WS通道异常=" + wsErrs +
  " 全部判点通过的条目=" + machinePass);
for (const l of gateAudit.lines) console.log(l);
if (waivedRows.length) console.log("  已豁免（判决仍在账上，只是不判红）：" + waivedRows.map((r) => r.id + "@" + r.contentHash).join(",") + " 理由=" + WAIVE_REASON);
if (WAIVED_IDS.size && !waivedRows.length) console.log("  豁免名单空转：--allow-unchanged-state 点了 " + [...WAIVED_IDS].join(",") + " 但这一轮没有任何帧被判 UNCHANGED_AFTER_INTERACTION（点了不存在的条目就是给自己找台阶）");
const conserved = rows.length === items.length || (LIMIT && done >= LIMIT);
console.log("SHOOT_CONSERVED=" + (conserved ? "yes" : "NO（rows=" + rows.length + " ≠ planned=" + items.length + "）"));
if (DRY) { console.log("SHOOT_RESULT=DRY"); process.exit(0); }
/* 退出码：2 = 有 SHOOT 项没拿到可用帧（原口径）；3 = 帧都拿到了，但有帧证明不了自己挂的那个状态
   （内容守恒判决不通过，见 stateGateAudit）。分开是因为两者的修法完全不同：前者补拍，
   后者要么承认这一步是空动作、要么逐条 id 声明"这个状态本来就不改画面"。 */
console.log("SHOOT_RESULT=" + (!conserved || noEvidence.length ? "FAIL（" + noEvidence.length + " 条没拿到可用帧）"
  : (stateBlockers.length ? "FAIL（UNCHANGED_AFTER_INTERACTION=" + stateBlockers.length + "：帧与同组上游状态逐字节相同，不能当该状态的文字证据）" : "OK")));
process.exit(!conserved || noEvidence.length ? 2 : gateAudit.exit);
