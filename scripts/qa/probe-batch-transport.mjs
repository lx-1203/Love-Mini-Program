#!/usr/bin/env node
/* 批量传输层可行性量产（不是执行器，只是一次测量）
   问题：round-7 的 1107 例执行轮卡在 CLI 通道每次调用 3–5 s（≈7 h）。假设是
   "把 K 条断言折进一次 automation_evaluate" 能把调用数除以 K。这个脚本只回答两件事：
     1) 一次调用真的能带回 K 条独立断言的结果吗（吞吐）；
     2) 折起来的答案和一条条问出来的答案**逐条相同**吗（保真）。
   2) 不做的话，吞吐优化会变成"跑得快的错答案"——这条是本仓反复付过学费的方向。
   用法：node scripts/qa/probe-batch-transport.mjs --project <产物目录> [--k 20] [--page pages/home/index] */
import { evaluate, openPage, bootSession, mintToken, verifyLogin, nodeCount, routeStack } from "./cli-automator.mjs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin"));
const PAGE = arg("page", "pages/home/index");
const SETTLE = parseInt(arg("settle", "2200"), 10);
const sleep = (ms) => { const t = Date.now() + ms; while (Date.now() < t) {} };

/* 混合真选择器与必然不存在的选择器：两边都答"全 1"或"全 0"时，一致性数字是没有信息的
   （第一次跑就是全 0，6/6 "保真"其实是空对空）。真选择器不写死，从**被测产物的 wxml** 现取。 */
import { readFileSync } from "node:fs";
function deriveSelectors(n) {
  const wxmlPath = join(PROJECT, PAGE + ".wxml");
  let present = [];
  try {
    const w = readFileSync(wxmlPath, "utf8");
    const seen = new Set();
    for (const m of w.matchAll(/class="([^"]*)"/g)) {
      /* 这里第一版写成 ^[a-z][a-z0-9]*(__|--) —— kebab 基名（location-sheet__btn）被当成不匹配，
         于是"取到 0 个真类名"、整套一致性变成空对空。空输入必须当场判红，这条就是抓它的。 */
      for (const c of m[1].split(/\s+/)) if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*(__|--)[a-z0-9_-]+$/.test(c) && !seen.has(c)) { seen.add(c); present.push("." + c); }
    }
  } catch { present = []; }
  present = present.slice(0, n);
  return { list: present, present: present.length, wxmlPath };
}
/* 取候选类名要"多取再筛"，不是"取 4 个就当它们都在渲染树里"：
   实测 home 的 4 个真类名全属 location-sheet 那层弹层（未触发时 v-if 不挂载），
   逐条单发也答 0 ⇒ 一致性又是空对空。用批量本身去筛（32 条一批 ≈ 3 s）才是这条通道该有的用法。 */
const CANDIDATES = parseInt(arg("candidates", "32"), 10);
const derived = deriveSelectors(CANDIDATES);
const selectors = derived.list;
const K = selectors.length;
if (K < 4) {
  console.log(`PROBE_RESULT=FAIL reason=只从 ${PAGE}.wxml 取到 ${K} 个候选类名 ⇒ 输入集太小，一致性没有信息量`);
  process.exit(2);
}
console.log(`BATCH_INPUT from=${PAGE}.wxml 候选类名=${K}`);

/* 一条 query 上链 K 个 selectAll().fields()，一次 exec 回调按链序给出 K 个结果 ——
   用的是本机实测过的形态（tour-r6.mjs:1037 就是 .exec(cb)；NodesRef 上没有 exec，
   拿 `select(s).exec()` 当探针会得到假的"不存在"）。automation_evaluate 会等 Promise。 */
function batched(list) {
  const src = "() => new Promise((res) => { try { const sels = " + JSON.stringify(list) + "; " +
    "const q = wx.createSelectorQuery(); for (const s of sels) { q.selectAll(s).fields({ size: true }); } " +
    "q.exec(function (rs) { res(JSON.stringify((rs || []).map(function (r) { " +
    "return Array.isArray(r) ? (r.length ? '1' : '0') : (r ? '1' : '0'); }))); }); " +
    "} catch (e) { res('ERR:' + e.message); } })";
  const raw = String(evaluate(src, { project: PROJECT }));
  if (raw.indexOf("ERR:") === 0) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function sequential(list) { return list.map((s) => String(nodeCount(s, { project: PROJECT })).slice(0, 1)); }

/* 第三种形态：**延迟取件**。bridge 不等 Promise，但异步查询的回调会把结果写进 app 上的普通数据字段，
   所以拆成两次同步调用：第一次点火并立刻返回（不等结果），等一秒，第二次把袋子取回来。
   若成立，节点/文本型断言也能成批（每批 2 次调用），执行轮才有可能跑完。 */
function deferred(list) {
  const start = "() => { const app = getApp(); const bag = {}; app.__probeBag = bag; let pending = 0; " +
    "const sels = " + JSON.stringify(list) + "; " +
    "sels.forEach(function (s, i) { pending++; try { const q = wx.createSelectorQuery(); " +
    "q.selectAll(s).fields({ size: true }, function (res) { " +
    "bag[i] = (Array.isArray(res) ? res.length : (res ? 1 : 0)) > 0 ? '1' : '0'; pending--; }); q.exec(); " +
    "} catch (e) { bag[i] = 'ERR'; pending--; } }); " +
    "return 'started:' + sels.length + ':pending' + pending; }";
  const read = "() => { const bag = getApp().__probeBag || {}; return JSON.stringify(Object.keys(bag).map(function (k) { return k + '=' + bag[k]; })); }";
  const s = String(evaluate(start, { project: PROJECT }));
  sleep(1600);
  const raw = String(evaluate(read, { project: PROJECT }));
  let arr = null;
  try { arr = JSON.parse(raw); } catch { arr = null; }
  return { start: s, raw, arr };
}

const token = mintToken({ project: PROJECT });
bootSession(String(token), { project: PROJECT });
const v = verifyLogin({ project: PROJECT });
openPage(PAGE, "", { project: PROJECT });
sleep(SETTLE);
/* 前提检查：候选类名是从 PAGE 的 wxml 取的，但节点查询问的是**当前页**。
   直开 tabBar 页可能被弹走（本仓实测：登录页弹 discover），落在别的页时 26 个真类名会全体答 0，
   于是"批量与单发一致"又变成空对空。先确认自己站在哪一页，再谈一致性。 */
const landed = String(routeStack({ project: PROJECT }) || "");
if (landed && !landed.split("|").pop().includes(PAGE)) {
  console.log(`PROBE_RESULT=FAIL reason=要求页 ${PAGE} 实际落在 ${landed} ⇒ 换 --page ${landed.split("|").pop()} 再测` +
    "（tabBar 页直开会被路由守卫弹走，这是本仓实测过的行为，不是探针坏了）");
  process.exit(2);
}
console.log(`BATCH_PAGE requested=${PAGE} landed=${landed || "(探针没给出路由)"}`);

const t0 = Date.now(); let B = null, bErr = "";
try { B = batched(selectors); } catch (e) { bErr = String(e.message).slice(0, 140); }
const tB = Date.now() - t0;

/* 对照：同样一次调用、同样 K 条断言，但 **不返回 Promise**（同步算得出值）。
   这一档用来把"bridge 不等 Promise"和"通道坏了"分开——
   少了它，K=3/K=20 的 timeout 只能记成"没测出来"。 */
let S2 = null, s2Err = "";
const t2 = Date.now();
try {
  S2 = JSON.parse(String(evaluate(
    "() => JSON.stringify(" + JSON.stringify(selectors) + ".map(function (s) { return typeof s === 'string' && s.length > 3 ? 'S' : 'N'; }))",
    { project: PROJECT })));
} catch (e) { s2Err = String(e.message).slice(0, 140); }
const tS2 = Date.now() - t2;
const t1 = Date.now(); const S = sequential(selectors); const tS = Date.now() - t1;

let D = null, dErr = "", tD = 0;
try { const t3 = Date.now(); D = deferred(selectors); tD = Date.now() - t3; } catch (e) { dErr = String(e.message).slice(0, 140); }
const dVals = D && Array.isArray(D.arr)
  ? D.arr.map((kv) => String(kv).split("=").slice(1).join("="))
  : null;
const dAgree = dVals && dVals.length === K
  ? dVals.filter((x, i) => String(x).slice(0, 1) === String(S[i]).slice(0, 1)).length
  : 0;
console.log(`DEFERRED calls=2 seconds=${(tD / 1000).toFixed(1)} shape=${D ? D.start : "n/a"} err=${dErr || "none"}`);
console.log(`DEFERRED_FIDELITY=${dAgree === null || dAgree === false ? "0" : dAgree}/${K} 取件=${JSON.stringify(D && D.arr).slice(0, 140)} 单发=${JSON.stringify(S).slice(0, 100)}`);
const onesInS = S.filter((x) => x === "1").length;
const errInS = S.filter((x) => x !== "0" && x !== "1").length;
console.log(`BATCH_INPUT_SEEN 单发答"存在"的条数=${onesInS}/${K} 测量失败条数=${errInS}` +
  (derived.present ? `（从 wxml 取了 ${derived.present} 个真类名）` : ""));
/* 三态判定。落点探针本身在这条通道上会返回空（本轮实测：三次调用三次空，而同一页 10 个真类名确实查得到）
   ⇒ 用它当"测没测到"的闸门会把一次有效测量误判成无效；页身份改由**答案本身**证：
   请求页自己的类名里至少要有 3 个答"存在"，否则我们多半站在别的页上。 */
if (landed === "" || String(landed).startsWith("ERR")) {
  console.log(`BATCH_PAGE_WARN=落点探针没给出路由（${landed || "空"}）——记为通道事实，不否掉本次测量`);
}
if (errInS || (D && D.arr || []).length !== K || K < 6) {
  console.log(`PROBE_RESULT=INVALID reason=通道没测全（单发 ERR=${errInS} 批量取件=${D && D.arr ? D.arr.length : "无"} 候选=${K}）` +
    " ⇒ 本次既不判批量可用也不判它不可用，恢复通道后重跑");
  process.exitCode = 3;
} else if (onesInS < 3 || onesInS === K) {
  console.log("PROBE_RESULT=FAIL reason=单发答案不是「有 1 也有 0」的混合 ⇒ 取的候选类名没落在这一页的渲染树里" +
    "（全 0 或全 1 时，「批量与单发一致」没有信息量），不许据此说批量保真");
  process.exitCode = 2;
}
if (dAgree && dAgree === K) {
  const perBatch = tD / 1000;
  console.log(`DEFERRED_VERDICT=两次同步调用取回 ${K} 条异步断言、与逐条单发结果完全一致 ⇒ 节点型断言可以成批。` +
    `按 ${K} 条/批外推 1107 例：约 ${(1107 / K * perBatch / 60).toFixed(1)} 分钟（截图另计）。`);
}

const ok = Array.isArray(B) && B.length === K;
const agree = ok && B.filter((x, i) => String(x).slice(0, 1) === String(S[i]).slice(0, 1)).length;
console.log(`BATCH K=${K} page=${PAGE} login=${v}`);
console.log(`BATCH_CALLS=1 seconds=${(tB / 1000).toFixed(1)} shape_ok=${ok ? "yes" : "no"}${bErr ? " err=" + bErr : ""}`);
console.log(`SEQ_CALLS=${K} seconds=${(tS / 1000).toFixed(1)} per-call=${(tS / K / 1000).toFixed(2)}s`);
console.log(`BATCH_FIDELITY=${agree}/${K} 批量=${JSON.stringify(B).slice(0, 120)} 单发=${JSON.stringify(S).slice(0, 120)}`);
console.log(`SYNC_BATCH_CALLS=1 seconds=${(tS2 / 1000).toFixed(1)} shape_ok=${Array.isArray(S2) && S2.length === K ? "yes" : "no"}${s2Err ? " err=" + s2Err : ""} 值=${JSON.stringify(S2).slice(0, 80)}`);
if (Array.isArray(S2) && S2.length === K) {
  console.log("BATCH_VERDICT=同一通道、同一次调用、不返回 Promise 时能带回 K 条结果 ⇒ 坏在 Promise 形态，不是通道坏了。" +
    "折叠只对\"同步算得出\"的状态型断言可用；节点/文本断言必须异步查询，批量不了。");
}
if (ok && agree === K) {
  const perCase = (tB / 1000) / K;
  console.log(`BATCH_EXTRAPOLATION_1107=${(perCase * 1107 / 60).toFixed(1)} 分钟（按每屏一次批量调用、截图另计）`);
  console.log("BATCH_RESULT=PASS 折叠保真，吞吐收益成立");
} else {
  console.log("BATCH_RESULT=FAIL 一次调用没能带回 K 条可比结果，或两侧答案不一致 ⇒ 不能拿批量当执行器传输层");
  process.exitCode = 1;
}
