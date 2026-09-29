/* 把执行轮的结果 + 帧目录导出成一个 corpus 的 manifest-detail.json，
   让 rebuild-frozen-manifest.mjs 能把这些帧收进本轮权威索引。
 *
 * 为什么事后导而不是在执行器里顺手写：执行轮已经在跑（改它要等下一轮才生效），
 * 而且**索引必须从盘上真实的字节推出来**——执行器自己说"我拍了这张"是弱证据，
 * 这里逐帧重算 sha256，路径不存在就直接报出来（本轮就抓到过 1 条 evidence 指向不存在的帧）。
 *
 * 时效声明：contentHash 是**转换时刻**算的，不是采集时刻。这一条写进 manifest 自己，
 * 免得下游把"哈希一致"误读成"采集与索引同一时刻一致"。
 *
 * 用法：node scripts/qa/exec-frames-to-corpus.mjs --results <exec-results.json>
 *        --corpus reports/screenshots/round-7-exec [--identity A]
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const RESULTS = opt("results", "");
const IDENTITY = opt("identity", "A");
if (!RESULTS || !existsSync(join(REPO, RESULTS))) {
  console.log("EXEC2CORPUS_RESULT=FAIL reason=缺 --results 或文件不存在（不许拿空输入产出一个看起来完整的索引）");
  process.exit(2);
}
const j = JSON.parse(readFileSync(join(REPO, RESULTS), "utf8"));
const rows = (j.results || []).filter((r) => r.status === "EXECUTED" && r.evidence);
const corpusDir = opt("corpus", "");
const outPath = corpusDir ? join(REPO, corpusDir, "manifest-detail.json") : "";

function sha16(abs) { return crypto.createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16); }
function rel(p) { return relative(REPO, p).split(sep).join("/"); }

/* 这批帧的**采集带**优先取**逐行**戳（r-exec-cli.mjs 的 #C-2 修复之后每行都带 gitSha =
   该行实际执行那次启动的 HEAD），退回文件头那一枚（历史件只有文件头，或该腿是旧执行器跑的）。
   为什么必须先看行内：文件头那枚从前到后一直是"本 boot 启动时的 HEAD"，续跑（同一 --out 已有
   exec-results.json 就跳过跑过的）会把它盖在合并后的全集上 ⇒ 上一 boot 跑出来的帧被归给
   一枚晚 28 分钟的提交（实测 exec-interact-real-sc-r10：gitSha=93650335 提交于 19:41Z、
   updatedAt=19:44Z，而它认领的帧是 19:13Z 的）。顶层 gitSha 按 L67-68 取的是「转换那一刻的 HEAD」，
   两者不同是事实，不是造假：门禁 verify-provenance-all.mjs:196 读的就是行内 bandSha。 */
const fileBand = j.gitSha || "";
const rowBandOf = (r) => String((r && r.gitSha) || "") || fileBand;
let bandFromRow = 0, bandFromFile = 0, bandUnknown = 0;

const shots = [];
const missing = [];
for (const r of rows) {
  const m = /^([^(]+)\((\d+)B\)$/.exec(String(r.evidence).trim());
  if (!m) { missing.push({ id: r.manifest + "/" + r.id, why: "evidence 不是 path(bytes) 形态：" + String(r.evidence).slice(0, 60) }); continue; }
  const abs = join(REPO, m[1]);
  if (!existsSync(abs)) { missing.push({ id: r.manifest + "/" + r.id, why: "盘上没有 " + m[1] }); continue; }
  const st = statSync(abs);
  if (st.size !== Number(m[2])) missing.push({ id: r.manifest + "/" + r.id, why: "字节不符：记 " + m[2] + " 实 " + st.size });
  const statePart = String(r.title || "").split("：")[0].trim().slice(0, 40);
  const rowBand = rowBandOf(r);
  if (r && r.gitSha) bandFromRow++; else if (fileBand) bandFromFile++; else bandUnknown++;
  shots.push({
    identity: IDENTITY,
    page: r.page,
    state: statePart || "(无状态名)",
    caseId: r.manifest + "/" + r.id,
    suite: r.suite,
    tier: r.tier || "normal",
    verdict: "EXECUTED",
    route: r.route || "",
    observed: String(r.observed || "").slice(0, 300),
    path: m[1],
    bytes: st.size,
    contentHash: sha16(abs),
    at: new Date(st.mtimeMs).toISOString(),
    ...(rowBand ? { bandSha: rowBand } : {}),
    ...(rowBand ? { bandShaOrigin: (r && r.gitSha) ? "行内 gitSha（该行执行时启动读到的 HEAD）" : "文件头 gitSha（该腿没有逐行戳，只能退回文件头那一枚）" } : {}),
  });
}
const dupHash = {};
for (const s of shots) dupHash[s.contentHash] = (dupHash[s.contentHash] || 0) + 1;
const uniq = Object.keys(dupHash).length;
const bySha = (process.env.WSX_SHA || "");
let headSha = j.gitSha || "";
try { headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim(); } catch { /* 保留结果文件里的 sha */ }

const manifest = {
  gitSha: headSha,
  resultsGitSha: j.gitSha || "(结果文件没记)",
  bandShaSource: (bandFromRow || bandFromFile)
    ? "行内 bandSha 优先取该行自己的 gitSha（" + bandFromRow + " 帧来自逐行戳 = 该行执行时启动读到的 HEAD；"
      + bandFromFile + " 帧只能退回结果文件头那一枚 = 最后一次写盘那次启动的 HEAD，历史件没有逐行戳）；"
      + "顶层 gitSha 仍是转换时刻的 HEAD，三者不同是事实，不是造假"
    : "(结果文件既没逐行戳也没文件头戳 ⇒ 行内不写 bandSha，由门禁退回顶层，按转换带受审)",
  workflowVersion: "round-7 exec slice（WS 取证 + 桥出帧）",
  generatedAt: new Date().toISOString(),
  project: "apps/client/dist/build/mp-weixin",
  harness: "scripts/qa/exec-frames-to-corpus.mjs ← " + RESULTS,
  hashStampedAt: "conversion",
  captureLimitations: [
    "contentHash / bytes / at 都是**转换时刻**从盘上重算的，不是采集时刻；采集时刻的执行器口径见 resultsGitSha。",
    "observe-only 切片：交互动词类与 requiresReal 类不在本 corpus 内。",
    "同一页多条用例常常同字节（§18：实测 59% 重复），这里的 dupHash 只作信息轴，不做改判。",
  ],
  verdictLegend: { EXECUTED: "该条有帧或有探针答案，二者皆无的执行器不会记 EXECUTED" },
  shots,
  failures: (j.results || []).filter((r) => r.status === "FAILED").map((r) => ({
    caseId: r.manifest + "/" + r.id, page: r.page, reason: String(r.failureReason || "").slice(0, 160), at: new Date().toISOString(),
  })),
  skipped: (j.results || []).filter((r) => r.status === "SKIPPED").length,
  missingEvidence: missing,
  /* 历次启动的戳原样传下去（续跑过的结果文件横跨多个带）：下游只要读到顶层单戳就该同时看到这一对。 */
  resultsRowShas: j.rowShas || "(源结果件没有逐行戳分布 ⇒ 该件由 #C-2 修复之前的执行器写出)",
  resultsMergedFrom: j.mergedFrom || [],
  bandShaCensus: (() => {
    const c = {};
    for (const s of shots) { const k = s.bandSha || "unknown"; c[k] = (c[k] || 0) + 1; }
    return c;
  })(),
  dupStats: { frames: shots.length, uniqueHash: uniq, dupBytesReducible: shots.length - uniq },
};
if (outPath) {
  writeFileSync(outPath, JSON.stringify(manifest, null, 1) + "\n");
}
console.log("EXEC2CORPUS frames=" + shots.length + " uniqueHash=" + uniq + " 可省=" + (shots.length - uniq) +
  " failures=" + manifest.failures.length + " skipped=" + manifest.skipped + " 证据异常=" + missing.length +
  " gitSha=" + headSha.slice(0, 8) + " 结果sha=" + String(manifest.resultsGitSha).slice(0, 8));
missing.slice(0, 8).forEach((x) => console.log("  E2C_EVIDENCE_BAD " + x.id + " :: " + x.why));
console.log("EXEC2CORPUS_BANDS 帧带来源：逐行 gitSha=" + bandFromRow + " 退回文件头=" + bandFromFile +
  " 无戳=" + bandUnknown + " 分布=" + Object.keys(manifest.bandShaCensus).sort().map((k) => k + "=" + manifest.bandShaCensus[k]).join(" ") +
  (manifest.resultsMergedFrom.length
    ? "（源件跨了 " + (manifest.resultsMergedFrom.length + 1) + " 次启动 ⇒ 逐行带才是一手出处，顶层那枚只是最后一次）"
    : (bandFromFile && !bandFromRow ? "（源件由 #C-2 修复之前的执行器写出：没有逐行戳，只能整批按文件头那一枚受审）" : "")));
console.log(outPath ? "EXEC2CORPUS_WRITTEN=" + rel(outPath) : "EXEC2CORPUS_WRITTEN=(未给 --corpus，只报数不写盘)");
if (bySha && headSha && !headSha.startsWith(bySha)) {
  console.log("E2C_SHA_MISMATCH 结果文件 sha=" + j.gitSha + " 与当前 HEAD 不同 ⇒ 这批帧测的不是当前产物，索引里 resultsGitSha 已如实记录");
}
console.log(missing.length ? "EXEC2CORPUS_RESULT=OK_WITH_FINDINGS（" + missing.length + " 条证据路径有问题，已写进 missingEvidence 不当已收口）" : "EXEC2CORPUS_RESULT=OK");
