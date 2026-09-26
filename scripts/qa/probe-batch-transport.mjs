#!/usr/bin/env node
/* 批量传输层可行性量产（不是执行器，只是一次测量）
   问题：round-7 的 1107 例执行轮卡在 CLI 通道每次调用 3–5 s（≈7 h）。假设是
   "把 K 条断言折进一次 automation_evaluate" 能把调用数除以 K。这个脚本只回答两件事：
     1) 一次调用真的能带回 K 条独立断言的结果吗（吞吐）；
     2) 折起来的答案和一条条问出来的答案**逐条相同**吗（保真）。
   2) 不做的话，吞吐优化会变成"跑得快的错答案"——这条是本仓反复付过学费的方向。
   用法：node scripts/qa/probe-batch-transport.mjs --project <产物目录> [--k 20] [--page pages/home/index] */
import { evaluate, openPage, bootSession, mintToken, verifyLogin, nodeCount } from "./cli-automator.mjs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin"));
const K = parseInt(arg("k", "20"), 10);
const PAGE = arg("page", "pages/home/index");
const SETTLE = parseInt(arg("settle", "2200"), 10);
const sleep = (ms) => { const t = Date.now() + ms; while (Date.now() < t) {} };

/* 混合真选择器与必然不存在的选择器：两边都答"全 1"或"全 0"时，一致性数字是没有信息的 */
const REAL = [".today-card__distance", ".nearby-item__avatar", ".community-card", ".header__title", ".discover-entry", ".location-sheet"];
const sel = (i) => (i < REAL.length ? REAL[i] : ".zzz-not-a-real-class-" + i);
const selectors = Array.from({ length: K }, (_, i) => sel(i));

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

const token = mintToken({ project: PROJECT });
bootSession(String(token), { project: PROJECT });
const v = verifyLogin({ project: PROJECT });
openPage(PAGE, "", { project: PROJECT });
sleep(SETTLE);

const t0 = Date.now(); let B = null, bErr = "";
try { B = batched(selectors); } catch (e) { bErr = String(e.message).slice(0, 140); }
const tB = Date.now() - t0;
const t1 = Date.now(); const S = sequential(selectors); const tS = Date.now() - t1;

const ok = Array.isArray(B) && B.length === K;
const agree = ok && B.filter((x, i) => String(x).slice(0, 1) === String(S[i]).slice(0, 1)).length;
console.log(`BATCH K=${K} page=${PAGE} login=${v}`);
console.log(`BATCH_CALLS=1 seconds=${(tB / 1000).toFixed(1)} shape_ok=${ok ? "yes" : "no"}${bErr ? " err=" + bErr : ""}`);
console.log(`SEQ_CALLS=${K} seconds=${(tS / 1000).toFixed(1)} per-call=${(tS / K / 1000).toFixed(2)}s`);
console.log(`BATCH_FIDELITY=${agree}/${K} 批量=${JSON.stringify(B).slice(0, 120)} 单发=${JSON.stringify(S).slice(0, 120)}`);
if (ok && agree === K) {
  const perCase = (tB / 1000) / K;
  console.log(`BATCH_EXTRAPOLATION_1107=${(perCase * 1107 / 60).toFixed(1)} 分钟（按每屏一次批量调用、截图另计）`);
  console.log("BATCH_RESULT=PASS 折叠保真，吞吐收益成立");
} else {
  console.log("BATCH_RESULT=FAIL 一次调用没能带回 K 条可比结果，或两侧答案不一致 ⇒ 不能拿批量当执行器传输层");
  process.exitCode = 1;
}
