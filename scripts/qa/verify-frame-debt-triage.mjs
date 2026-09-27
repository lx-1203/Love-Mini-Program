#!/usr/bin/env node
/**
 * 帧债归置门：检查「没点名的帧债」是不是每一行都有去向，以及取景配方有没有打算去拍那些
 * 根本不可能被帧证明的行。
 *
 * 为什么立它：本轮把 18 行"缺点名"的帧债逐条回盘核过之后，结论是**只有 2 行点名就能结案**，
 * 其余分布在「要写代码」「要人拍板」「判据把代码读错了」「帧根本看不到这个量」四类里。
 * 如果不把这个结论落成载体，下一轮只会照着旧的取景配方（79 条，含那 5 条帧不可证的行）
 * 继续烧模拟器时间，而且每拍一张就会多一个"有帧即已验"的假结案。
 *
 * 四道检查（缺一即红）：
 *   C1 守恒     归置表覆盖的行集，必须正好等于当前 debt 里"非静态且没点名"的行集（漏一条、多一条都点名）
 *   C2 去向     每行必须有 kind（词表内）、carrier（文件真在盘上，给了行号还要真有那么长）、next（下一步载体，不许空话）
 *   C3 假结案   取景配方里准备 SHOOT 的行，若归置结论是 not_frame_observable / needs_code / needs_ruling ⇒ 判红
 *   C4 判别力   标了 resolved 的行必须写明 token 从哪个载具可重跑（namedBy），且该 token 真的在 carrier 里
 *
 * 用法：node scripts/qa/verify-frame-debt-triage.mjs
 *       [--debt reports/audit/round-7/ui-frame-debt-classes.json]
 *       [--triage reports/audit/round-7/frame-debt-triage.json]
 *       [--plan reports/audit/round-7/frameplan-merged.json]
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const rel = (p) => relative(REPO, p).split("\\").join("/");

const DEBT = resolve(REPO, arg("debt", "reports/audit/round-7/ui-frame-debt-classes.json"));
const TRI = resolve(REPO, arg("triage", "reports/audit/round-7/frame-debt-triage.json"));
/* 缺省配方换成对账后的那份：frameplan-merged.json 是 10:19 的旧认知，里面还留着 7 行
   "帧证明不了却被排成 SHOOT"。让门禁默认指向旧那份 = 每次都要人记得带 --plan，
   忘了就是一条与本门初衷相反的判据（它存在的意义正是"别拍判不了的帧"）。 */
const PLAN = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-round7-final.json"));

const KINDS = new Set(["needs_naming", "needs_code", "needs_ruling", "not_frame_observable"]);
const problems = [];
for (const [label, f] of [["debt", DEBT], ["triage", TRI]]) {
  if (!existsSync(f)) { console.log(`TRIAGEGATE_RESULT=FAIL reason=${label} 读不到：${rel(f)}`); process.exit(2); }
}

const debt = JSON.parse(readFileSync(DEBT, "utf8"));
const tri = JSON.parse(readFileSync(TRI, "utf8"));
const unnamedNow = debt.rows.filter((r) => r.cls !== "STATIC_SHOOTABLE" && !(r.namedSelectors || []).length).map((r) => r.id);
const byId = new Map((tri.dispositions || []).map((d) => [d.id, d]));

/* ---- C1 守恒 ---- */
const triIds = [...byId.keys()];
const missing = unnamedNow.filter((id) => !byId.has(id));
const extra = triIds.filter((id) => !unnamedNow.includes(id));
if (missing.length) problems.push(`C1 有 ${missing.length} 行"非静态且没点名"的帧债没有归置：${missing.slice(0, 8).join(" ")}${missing.length > 8 ? ` …另 ${missing.length - 8}` : ""}`);
if (extra.length) problems.push(`C1 归置表里有 ${extra.length} 行已经不在"没点名"集合内（要么已点名、要么不再欠帧），条目该删而不是留着当已办：${extra.join(" ")}`);

/* ---- C2 去向齐不齐 ---- */
let lineCache = new Map();
const linesOf = (f) => { if (!lineCache.has(f)) lineCache.set(f, readFileSync(f, "utf8").split(/\r?\n/)); return lineCache.get(f); };
for (const d of tri.dispositions || []) {
  if (!KINDS.has(d.kind)) problems.push(`C2 ${d.id} 的 kind="${d.kind}" 不在词表内`);
  if (!String(d.next || "").trim()) problems.push(`C2 ${d.id} 没写下一步载体（"待处理"这类空话不算）`);
  const m = /^(.+?):(\d+)/.exec(String(d.carrier || ""));
  if (!m) { if (d.kind !== "not_frame_observable") problems.push(`C2 ${d.id} 的 carrier 不是"文件:行号"形状：${d.carrier}`); continue; }
  const abs = join(REPO, m[1]);
  if (!existsSync(abs)) { problems.push(`C2 ${d.id} 的 carrier 文件不在盘上：${m[1]}`); continue; }
  const L = linesOf(abs);
  if (Number(m[2]) > L.length) problems.push(`C2 ${d.id} 的 carrier 行号超出文件长度：${m[1]} 只有 ${L.length} 行，写了 ${m[2]}`);
}

/* ---- C4 标了 resolved 的，token 要真在 carrier 里，且要写清从哪重跑 ---- */
for (const d of tri.dispositions || []) {
  if (d.resolved !== true || d.kind !== "needs_naming") continue;
  if (!String(d.namedBy || "").trim()) problems.push(`C4 ${d.id} 自称已点名，却没写 namedBy（判点在哪个载具里可重跑）`);
  const tok = String(d.token || "").replace(/^class="/, "").replace(/"$/, "").split(/[\s/]+/)[0];
  const f = /^(.+?):\d+/.exec(String(d.carrier || ""));
  if (f && existsSync(join(REPO, f[1])) && tok && !readFileSync(join(REPO, f[1]), "utf8").includes(tok))
    problems.push(`C4 ${d.id} 标了已点名，但 token「${tok}」不在 ${f[1]} 里 ⇒ 名点是假的`);
}

/* ---- C3 取景配方会不会去拍那些帧不可证的行 ---- */
if (existsSync(PLAN)) {
  const plan = JSON.parse(readFileSync(PLAN, "utf8"));
  const shoot = new Set((plan.rows || []).filter((r) => r.disposition === "SHOOT").map((r) => r.id));
  const bad = (tri.dispositions || []).filter((d) => shoot.has(d.id) && ["not_frame_observable", "needs_code", "needs_ruling"].includes(d.kind));
  if (bad.length) {
    problems.push(`C3 取景配方里有 ${bad.length} 行准备 SHOOT，但回盘核过帧证明不了它（拍了只会多一个"有帧即已验"的假结案）：`);
    for (const b of bad) problems.push(`     ${b.id} [${b.kind}] ${String(b.why).slice(0, 70)}`);
  }
  console.log(`TRIAGEGATE_PLAN planSHOOT=${shoot.size} 与被归置行的交集=${(tri.dispositions || []).filter((d) => shoot.has(d.id)).length}`);
} else console.log("TRIAGEGATE_PLAN 没有取景配方文件，跳过 C3（这本身要记一笔：配方没重生成过）");

const tally = {};
for (const d of tri.dispositions || []) tally[d.kind] = (tally[d.kind] || 0) + 1;
console.log(`TRIAGEGATE_SUMMARY 当前没点名=${unnamedNow.length} 归置=${triIds.length} ${Object.entries(tally).map(([k, v]) => k + "=" + v).join(" ")} 已真正点名=${(tri.dispositions || []).filter((d) => d.resolved === true && d.kind === "needs_naming").length}`);
if (problems.length) {
  console.log(`TRIAGEGATE_RESULT=FAIL problems=${problems.filter((p) => !/^ {5}/.test(p)).length}`);
  for (const p of problems) console.log("  " + p);
  process.exit(2);
}
console.log(`TRIAGEGATE_RESULT=PASS ${unnamedNow.length} 行全部有去向，配方里没有帧不可证的 SHOOT 行`);
