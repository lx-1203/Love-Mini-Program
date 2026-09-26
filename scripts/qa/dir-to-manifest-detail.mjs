#!/usr/bin/env node
/* 给"只有帧、没有权威索引"的取景目录补一份 manifest-detail.json。
 *
 * 为什么需要：rebuild-frozen-manifest.mjs 只把有 manifest-detail.json 的目录并进权威索引，
 * 本轮新出的两批证据（真实模式执行轮 169 帧、帧债配方 42 帧）都是**执行器自带结果文件**，
 * 没有巡检脚本那份形状，于是权威索引会把它们整批 SKIP —— 等于这一轮的帧在账上不存在。
 *
 * 溯源规矩（本条存在的意义）：
 *   · gitSha 只能从结果文件里读，**绝不拿 HEAD 顶替**。结果没戳就是 unknown，
 *     权威索引该拒就让它拒；补一个当天的 SHA 进去叫伪造溯源。
 *   · bytes / contentHash 用**磁盘上的真实文件**现算，不抄结果文件里记的数字；
 *     记的和实的不一致就点名（本轮已经遇到过一次"同名覆盖导致 149 张帧字节对不上"）。
 *
 * 用法：node scripts/qa/dir-to-manifest-detail.mjs --dir reports/screenshots/<x> \
 *          --results <结果.json> [--kind shoot|exec]
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, basename } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DIR = resolve(REPO, arg("dir", ""));
const RES = resolve(REPO, arg("results", ""));
const KIND = arg("kind", "shoot");
if (!DIR || !existsSync(DIR)) { console.log("D2M_RESULT=FAIL reason=--dir 不存在"); process.exit(2); }
if (!RES || !existsSync(RES)) { console.log("D2M_RESULT=FAIL reason=--results 不存在（没有结果文件就没有可信戳记，不许凭目录名猜）"); process.exit(2); }

const res = JSON.parse(readFileSync(RES, "utf8"));
const SHA = String(res.gitSha || "unknown");
const rows = res.rows || res.results || [];
const relOf = (p) => String(p).split("\\").join("/");
const shots = [], mismatch = [], missing = [];
for (const r of rows) {
  const rel = KIND === "exec" ? relOf(r.evidence || "").replace(/\(\d+B\)$/, "") : relOf(r.frame || "");
  if (!rel || rel === "__auto-__.png") continue;
  const abs = resolve(REPO, rel);
  if (!existsSync(abs)) { missing.push([r.id || r.suite + "|" + r.id, rel]); continue; }
  const st = statSync(abs);
  const h = createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
  const claimed = Number(r.bytes || (/\((\d+)B\)$/.exec(String(r.evidence || "")) || [])[1] || 0);
  if (claimed && claimed !== st.size) mismatch.push([r.id || r.suite, "记 " + claimed + " / 实 " + st.size]);
  shots.push({
    identity: r.identity || (KIND === "exec" ? "A" : ""), page: r.route || r.page || "", state: r.title || r.crop || (KIND === "exec" ? "执行轮落点" : "配方取景"),
    route: r.route || r.page || "", landing: r.landing || r.route || "", verdict: r.status === "SHOT" || r.status === "EXECUTED" ? "PASS" : r.status,
    caseId: r.id || `${r.suite}|${r.id}`, path: rel, bytes: st.size, contentHash: h,
    at: res.updatedAt || new Date().toISOString(),
  });
}
/* 目录里还有没有被结果文件提到的帧？漏了就说明账目不完整，不能只写"对上的那些"。 */
const listed = new Set(shots.map((s) => basename(s.path)));
const orphan = existsSync(DIR) ? readdirSync(DIR).filter((f) => /\.png$/i.test(f) && !listed.has(f)) : [];
const out = join(DIR, "manifest-detail.json");
writeFileSync(out, JSON.stringify({
  gitSha: SHA, workflowVersion: "dir-to-manifest-detail/1.0", generatedAt: new Date().toISOString(),
  project: res.project || "", harness: "由 " + relOf(RES.split(REPO + "/")[1] || RES) + "（" + (res.runner || KIND) + "）补建，戳记取自该结果文件而不是当前 HEAD",
  verdictLegend: { PASS: "该条已出帧且判点/落点按执行器记录成立", 其他: "原样带执行器的状态词" },
  captureLimitations: [
    "本文件由执行器结果反推，不含巡检才有的 tap/expect 细节",
    mismatch.length ? "有 " + mismatch.length + " 条帧字节与记录不符（见下）" : "字节全部与记录相符",
    missing.length ? "有 " + missing.length + " 条记录指向的帧不在磁盘上" : "记录的帧全部在磁盘上",
    orphan.length ? "目录里另有 " + orphan.length + " 张帧未被结果文件提及" : "目录内帧与结果文件一一对应",
  ],
  shots, failures: [], meta: { shaSource: res.gitSha ? "results-file" : "MISSING", mismatch, missing, orphan },
}, null, 1));
console.log("D2M_DIR=" + relOf(DIR.split(REPO + "/")[1] || DIR) + " shots=" + shots.length + " gitSha=" + SHA + "（戳记来源=" + (res.gitSha ? "结果文件" : "缺失→unknown，权威索引应当拒收") + "）");
console.log("D2M_INTEGRITY 字节不符=" + mismatch.length + " 帧不在盘=" + missing.length + " 目录内未被提及的帧=" + orphan.length);
mismatch.slice(0, 5).forEach(([id, w]) => console.log("  MISMATCH " + id + " " + w));
missing.slice(0, 5).forEach(([id, p]) => console.log("  MISSING " + id + " → " + p));
orphan.slice(0, 5).forEach((f) => console.log("  ORPHAN " + f));
console.log("D2M_RESULT=OK 写出 " + relOf(out.split(REPO + "/")[1] || out));
