/* 帧孤儿体检：取景目录里"没有任何一行结论引用它"的 PNG。
 *
 * 为什么在意：执行轮按 manifest-id 覆盖同名文件，但上一刀（不同产物、不同筛选）写过而这一刀
 * 不再引用的帧会留在原地。读者按文件名去找证据时会拿到**另一个产物的帧**——
 * 本轮就发生过：10:48 产物跑的帧与 15:13 重建后的帧同住一个目录。
 * 判据：孤儿本身不必然错（历史轮次也会往同一目录写），但**mtime 晚于在测产物构建时间**的孤儿
 * 一定是本轮 produced 却没挂到任何断言上的证据 ⇒ 那是断链，报 FAIL。
 *
 * 用法：node scripts/qa/check-frame-orphanage.mjs [--dir reports/screenshots/round-7-exec]
 *        [--results a.json --results b.json] [--artifact apps/client/dist/build/mp-weixin/app.json]
 */
import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const multi = (n) => argv.reduce((a, v, i) => (argv[i - 1] === "--" + n ? a.concat(v) : a), []);

const DIRS = multi("dir").length ? multi("dir") : ["reports/screenshots/round-7-exec"];
const RESULTS = multi("results").length ? multi("results") : [
  "reports/audit/round-7/interact/exec-results.json",
  "reports/audit/round-7/interact/exec-results.pre-rebuild-1048.json",
];
const ARTIFACT = opt("artifact", "apps/client/dist/build/mp-weixin/app.json");

const referenced = new Set();
for (const rel of RESULTS) {
  const p = join(REPO, rel);
  if (!existsSync(p)) { console.log("ORPHAN_RESULTS_MISSING " + rel + " ⇒ 这一路的引用集按空集算（少一个结果文件就会把它的帧全判成孤儿）"); continue; }
  const j = JSON.parse(readFileSync(p, "utf8"));
  for (const r of (j.results || [])) {
    const ev = String(r.evidence || "");
    const m = /^([^(]+)\(/.exec(ev.trim());
    if (m) referenced.add(m[1].trim().split("/").join("/"));
    for (const mm of ev.matchAll(/reports\/[^\s,(]+\.png/g)) referenced.add(mm[0]);
  }
}
const artMs = existsSync(join(REPO, ARTIFACT)) ? statSync(join(REPO, ARTIFACT)).mtimeMs : 0;
/* 竞争条件：执行轮是"每页组跑完才落一次结果"，所以晚于最后一次落盘的帧还没进引用集，
   它们不是孤儿，是在途。第一版就把这种在途帧判成 FAIL 了（H02/H03 实测）。 */
let lastFlushMs = 0;
for (const rel of RESULTS) {
  const p = join(REPO, rel);
  if (existsSync(p)) lastFlushMs = Math.max(lastFlushMs, statSync(p).mtimeMs);
}
console.log("ORPHAN_REFERENCED=" + referenced.size + " 结果文件=" + RESULTS.length + " 在测产物 " + ARTIFACT + " 构建于 " + (artMs ? new Date(artMs).toISOString() : "(读不到)") + " 最后落盘 " + (lastFlushMs ? new Date(lastFlushMs).toISOString() : "(无)"));

let total = 0, orphans = [], freshOrphans = [], inFlight = 0;
for (const rel of DIRS) {
  const dir = join(REPO, rel);
  if (!existsSync(dir)) { console.log("ORPHAN_DIR_MISSING " + rel); continue; }
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const f = join(d, e.name);
      if (e.isDirectory()) { walk(f); continue; }
      if (!/\.png$/i.test(e.name)) continue;
      total++;
      const key = relative(REPO, f).split("\\").join("/");
      if (referenced.has(key)) continue;
      const st = statSync(f);
      if (lastFlushMs && st.mtimeMs > lastFlushMs) { inFlight++; continue; }
      orphans.push({ key, ms: st.mtimeMs, size: st.size });
      if (artMs && st.mtimeMs > artMs) freshOrphans.push(key);
    }
  };
  walk(dir);
}
console.log("ORPHAN_SCANNED=" + total + " 孤儿=" + orphans.length + " 其中晚于在测产物构建时间=" + freshOrphans.length + " 在途未判=" + inFlight);
orphans.slice(0, 8).forEach((o) => console.log("  ORPHAN " + o.key + " (" + o.size + "B, " + new Date(o.ms).toISOString().slice(5, 16).replace("T", " ") + ")"));
if (orphans.length > 8) console.log("  …ORPHAN 另有 " + (orphans.length - 8) + " 张");
freshOrphans.slice(0, 8).forEach((k) => console.log("  ORPHAN_FRESH " + k + " ⇒ 本轮 produced 却没挂到任何断言上（断链）"));
console.log(freshOrphans.length
  ? "ORPHAN_RESULT=FAIL reason=" + freshOrphans.length + " 张帧晚于在测产物构建时间却没被任何结论引用 ⇒ 要么补上引用关系，要么删掉（那是本轮自己产的多余帧）"
  : "ORPHAN_RESULT=OK 没有「晚于在测产物的无引用帧」；历史孤儿 " + orphans.length + " 张属上一轮/上一产物，报告里要按来源分开叙述");
if (freshOrphans.length) process.exit(2);
