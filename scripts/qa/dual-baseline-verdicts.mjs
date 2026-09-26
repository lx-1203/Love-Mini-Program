/* 同一份判据，两个对照组各跑一遍判据台，逐条比桶位。
 *
 * 动因（lane B 的共性发现）：有 7 条的修复提交是 f9a60925，而它是本轮对照组 094f7239 的**祖先**
 * ⇒ 在 094 口径下"判点在基线里不存在"永远不成立，这几条只能落 UNDECIDABLE，
 * 于是**看起来像"判据含糊"，其实是"对照组选错了"**。这两种诊断的处理方式完全不同：
 * 前者要改判据（本轮 lane 就在做），后者要换一个匹配修复发生时点的对照组再算一遍。
 *
 * 关键纪律：换对照组只能"多算一遍并如实标注是哪个口径给的结论"，
 * 不许把不利的口径扔掉只留好看的 ⇒ 输出里必须同时给出两个桶，且差异条目逐条点名。
 *
 * 用法：node scripts/qa/dual-baseline-verdicts.mjs [--a 094f7239] [--b 874ff52f]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const A = opt("a", "094f7239");
const B = opt("b", "874ff52f");
const TOOL = join(REPO, "scripts", "qa", "verify-fixes-against-artifact.cjs");
const NODE = process.execPath;

function isAncestor(anc, desc) {
  try { execFileSync("git", ["merge-base", "--is-ancestor", anc, desc], { cwd: REPO, stdio: "ignore" }); return true; }
  catch { return false; }
}
function run(sha, tag) {
  const out = join(REPO, ".zcode/tmp/dualverdict", tag);
  mkdirSync(out, { recursive: true });
  let body = "";
  try { body = execFileSync(NODE, [TOOL, "--baseline", sha, "--out", ".zcode/tmp/dualverdict/" + tag], { cwd: REPO, encoding: "utf8", timeout: 420000, maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { console.log("DUAL_RUN_FAIL " + tag + " " + String((e && (e.stdout || e.message)) || e).replace(/\s+/g, " ").slice(0, 200)); return null; }
  const j = JSON.parse(readFileSync(join(out, "verdicts.json"), "utf8"));
  const map = new Map();
  for (const it of (j.items || [])) map.set(it.id, it.verdict || it.bucket);
  console.log("DUAL_RUN " + tag + " baseline=" + sha + " items=" + map.size + " " + (body.match(/FIXVERIFY_RESULT=[^\n]*/) || [""])[0]);
  return map;
}
const ancAB = isAncestor(A, B), ancBA = isAncestor(B, A);
console.log("DUAL_ANCESTRY " + A + "→" + B + " 是" + (isAncestor(A, "HEAD") ? "" : "不") + "祖先；" + B + " 是 HEAD " + (isAncestor(B, "HEAD") ? "祖先" : "非祖先") +
  "；两对照组先后关系：" + (ancAB ? A + " 早于 " + B : (ancBA ? B + " 早于 " + A : "互不为祖先（分叉）")));
const ma = run(A, "a"), mb = run(B, "b");
if (!ma || !mb) { console.log("DUAL_RESULT=FAIL reason=有一遍没跑起来，不给结论"); process.exit(2); }
const ids = new Set([...ma.keys(), ...mb.keys()]);
const diff = [], both = [];
for (const id of ids) {
  const x = ma.get(id) || "(缺)", y = mb.get(id) || "(缺)";
  if (x !== y) diff.push({ id, x, y });
  if (x === "ARTIFACT_VERIFIED" && y === "ARTIFACT_VERIFIED") both.push(id);
}
console.log("DUAL_SAME_VERDICT=" + (ids.size - diff.length) + " 不一致=" + diff.length + " 两口径都 ARTIFACT_VERIFIED=" + both.length);
for (const d of diff.slice(0, 40)) console.log("DUAL_DIFF " + d.id + " " + A + "口径=" + d.x + " | " + B + "口径=" + d.y);
const onlyB = diff.filter((d) => d.y === "ARTIFACT_VERIFIED" && d.x !== "ARTIFACT_VERIFIED");
const onlyA = diff.filter((d) => d.x === "ARTIFACT_VERIFIED" && d.y !== "ARTIFACT_VERIFIED");
console.log("DUAL_ONLY_B_AV=" + onlyB.length + "（换更早对照组才能确立的条数——这些就是「疑似判据含糊、实则对照组选错」的上界）");
console.log("DUAL_ONLY_A_AV=" + onlyA.length + "（换口径反而掉出 ARTIFACT_VERIFIED 的条数，必须一并披露，不许只报涨的那半边）");
console.log("DUAL_RESULT=OK 两个口径都已落盘：.zcode/tmp/dualverdict/a 与 /b（谁引用哪条结论必须同时写明用的是哪个对照组）");
