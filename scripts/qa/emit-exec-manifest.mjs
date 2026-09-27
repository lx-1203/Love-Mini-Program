#!/usr/bin/env node
/** 把执行轮的帧补成 corpus 自己的 `manifest-detail.json` —— 否则这 600 多张帧在权威索引里不存在。
 *
 * 为什么必须有（⑤ 的机制洞，本轮亲查）：`rebuild-frozen-manifest.mjs` 只认
 *   reports/screenshots/<corpus>/manifest-detail.json，缺文件就打印 `SKIP <corpus>`；
 * 而 `r-exec-cli.mjs` 从头到尾**不写 manifest**，只往 exec-results.json 的行里塞
 *   `evidence: "reports/screenshots/round-7-tap3/XXX.png(9560B)"`。
 * 结果：1107 例执行轮拍的帧在盘上、在结果里，却进不了权威索引与完整性门禁 ⇒
 *   "跑了"与"可作为证据被读到"是两件事，中间缺的是载具。
 *
 * 三条判据（任一不过就不写盘）：
 *  1. 双向守恒：带 evidence 的行数 == 要写的 shot 数；且 corpus 目录里的每个 .png 都被某行引用
 *     （有孤儿文件就报出来 —— 帧存在但没人引用，说明结果文件被截断或跑过没记账）。
 *  2. 字节自证：evidence 里写的 `(NNNNB)` 必须等于文件真实大小，不符即拒绝
 *     （那串字节数是当时打印的，若与实际不符就是证据自己在撒谎）。
 *  3. 落盘前逐条 statSync + 重算 sha256，与 rebuild-frozen-manifest 的自证同口径。
 *
 * 用法：node scripts/qa/emit-exec-manifest.mjs --results <exec-results.json> [--corpus <dir>] [--dry|--apply]
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const relPosix = (p) => relative(REPO, p).split(sep).join("/");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const APPLY = argv.includes("--apply");
const RESULTS = resolve(REPO, arg("results", ""));
if (!RESULTS || !existsSync(RESULTS)) { console.log("EXECMAN_RESULT=FAIL reason=缺 --results 或文件不存在"); process.exit(2); }
const DRY = !APPLY;

const j = JSON.parse(readFileSync(RESULTS, "utf8"));
const rows = Array.isArray(j) ? j : (j.results || []);
if (!rows.length) { console.log("EXECMAN_RESULT=FAIL reason=结果里没有行（空扫描集不得写出一个看起来完整的索引）"); process.exit(2); }

/* corpus 目录从第一条 evidence 派生，不手写：手写就会出现"结果在 A 目录、索引写给 B"。 */
const EV_RE = /(\S+?\.png)\((\d+)B\)/g;
const first = rows.map((r) => String(r.evidence || "").match(EV_RE)).find(Boolean);
if (!first) { console.log("EXECMAN_RESULT=FAIL reason=没有任何一行带 evidence，本工具无事可做"); process.exit(2); }
const corpusRel = first[0].split("/").slice(0, 3).join("/");
const CORPUS = resolve(REPO, arg("corpus", corpusRel));

const shots = [], bad = [];
/* 被判定"太小的帧不算证据"的那批不是孤儿：文件在盘上、也在行里的 `missingEvidence` 记着。
   第一版没读 missingEvidence，把 4 张 2680B/2687B 的拒收帧报成了"漏记"——
   报对了形状、报错了性质，这类"把已记账的东西当成失踪"会逼下一轮去重拍本来不该当证据的帧。 */
const rejected = [];
const REJ_RE = /(reports\/\S+?\.png)\(仅\s*(\d+)B/g;
let rowsWithEv = 0, rowsMulti = 0;
for (const r of rows) {
  for (const m of (Array.isArray(r.missingEvidence) ? r.missingEvidence.join("\n") : String(r.missingEvidence || "")).matchAll(REJ_RE)) {
    rejected.push({ path: m[1], bytes: Number(m[2]), caseId: r.id, manifest: r.manifest, reason: "出帧过小，不当证据（runner 阈值 3000B）" });
  }
}
for (const r of rows) {
  const ev = String(r.evidence || "");
  if (!ev.trim()) continue;
  const hits = [...ev.matchAll(EV_RE)];
  if (!hits.length) { bad.push(`行 ${r.manifest}|${r.id} 的 evidence 不是 path(NNNNB) 形状：${ev.slice(0, 60)}`); continue; }
  rowsWithEv++;
  if (hits.length > 1) rowsMulti++;
  for (const [, p, bytes] of hits) {
    const abs = resolve(REPO, p);
    if (!existsSync(abs)) { bad.push(`帧不在盘上 ${p}（行 ${r.manifest}|${r.id}）`); continue; }
    const st = statSync(abs);
    if (Number(bytes) !== st.size) bad.push(`字节不符 ${p} 记=${bytes} 实=${st.size}（行 ${r.manifest}|${r.id}）`);
    const contentHash = createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
    shots.push({
      identity: r.identity || j.identity || "A",
      page: r.page,
      path: p,
      /* state 用「用例号 + 标题首段」：唯一、可回溯到判据行；同字节检测比的是 contentHash，
         所以标签唯一不会掩盖重复，反而能暴露"同一页两个状态出了同字节"。 */
      state: `${r.id} ${(r.title || "").split(/[：:，,。]/)[0].slice(0, 28)}`,
      stateFrame: false,
      contentHash,
      bytes: st.size,
      suite: r.suite || ("C-" + r.manifest),
      caseId: r.id,
      band: r.band || j.band || "",
      at: j.updatedAt || new Date(st.mtime).toISOString(),
    });
  }
}

const onDisk = readdirSync(CORPUS).filter((f) => f.endsWith(".png"));
const referenced = new Set(shots.map((s) => s.path.split("/").pop()));
const rejectedNames = new Set(rejected.map((s) => s.path.split("/").pop()));
const orphanFiles = onDisk.filter((f) => !referenced.has(f) && !rejectedNames.has(f));
const missingFiles = shots.filter((s) => !onDisk.includes(s.path.split("/").pop())).length;

console.log(`EXECMAN corpus=${relPosix(CORPUS)} 总行=${rows.length} 带帧行=${rowsWithEv} 多帧行=${rowsMulti} shots=${shots.length} 拒收帧=${rejected.length}`);
console.log(`EXECMAN 盘上 png=${onDisk.length} 被引用为证据=${referenced.size} 已记为拒收=${rejectedNames.size} 无人认领=${orphanFiles.length} 记账缺失=${missingFiles}`);
if (orphanFiles.length) console.log("  ORPHAN " + orphanFiles.slice(0, 6).join(", ") + (orphanFiles.length > 6 ? " …" : ""));
/* 真守恒：盘上每张帧要么当证据、要么被记成拒收，二者之外不许有第三种存在。 */
if (referenced.size + rejectedNames.size !== onDisk.length)
  bad.push(`盘上帧数对不上：证据 ${referenced.size} + 拒收 ${rejectedNames.size} ≠ 盘上 ${onDisk.length}`);
if (shots.length !== rowsWithEv && rowsMulti === 0) bad.push(`守恒不成立：shots=${shots.length} vs 带帧行=${rowsWithEv}`);
if (rowsMulti && shots.length !== rowsWithEv + rowsMulti) bad.push(`多帧行的帧数没有全部入账（shots=${shots.length}）`);
if (missingFiles) bad.push(`${missingFiles} 条记录指向不在盘上的文件`);
if (orphanFiles.length) bad.push(`${orphanFiles.length} 张帧既不是证据也没记拒收 ⇒ 结果文件可能截断/漏记`);

let head = "unknown";
try { head = execSync("git rev-parse --short HEAD", { cwd: REPO, encoding: "utf8" }).trim(); } catch { /* 保留哨兵 */ }
const shas = [...new Set(rows.map((r) => r.band).filter(Boolean).map((b) => String(b)))];
if (bad.length) {
  console.log("EXECMAN_RESULT=FAIL reason=" + bad.slice(0, 8).join(" / ") + (bad.length > 8 ? ` …共 ${bad.length} 条` : ""));
  process.exit(1);
}
if (DRY) { console.log(`EXECMAN_RESULT=DRY 自证全过（gitSha=${head}，band 观测=${shas.slice(0, 3).join("|")}）；加 --apply 才写盘`); process.exit(0); }

const out = {
  corpus: relPosix(CORPUS),
  gitSha: head,
  source: relPosix(RESULTS),
  producer: "scripts/qa/emit-exec-manifest.mjs",
  producerNote: "执行轮的帧账目由 exec-results.json 的行反推而成；帧本身是采集当时落的，本脚本不改像素、不重拍。",
  bandObservations: shas,
  counts: { totalRows: rows.length, rowsWithEvidence: rowsWithEv, shots: shots.length, rejectedFrames: rejected.length, pngsOnDisk: onDisk.length },
  rejectedFrames: rejected,
  shots,
};
const target = join(CORPUS, "manifest-detail.json");
if (existsSync(target)) writeFileSync(target + ".pre-execmanifest.bak", readFileSync(target, "utf8"), "utf8");
writeFileSync(target, JSON.stringify(out, null, 1) + "\n", "utf8");
console.log(`EXECMAN_WRITTEN=${relPosix(target)} shots=${shots.length}`);
console.log("EXECMAN_RESULT=OK");
