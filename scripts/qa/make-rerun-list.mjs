/* 从"改判后的权威件"里导出重采清单：给每一条因证据不存在而被降级的用例一次公平的第二机会。
 * 为什么必须在改判之后、而不是直接按 ERROR: 串筛：
 * 降级为 NO-EVIDENCE 的行 = "tier 要求的像素帧不齐备"，这才是需要重采的判据；
 * 而"文件其实在盘上只是尾注带了 ERROR"（TAINTED_BUT_FILE_PRESENT）不该重采，净字符串即可。
 * 输出按 manifest 分组，喂给 scripts/qa/r-exec.cjs 的 RERUN_CASES（它按 id 过滤、按 suite 跑）。
 * 用法：node scripts/qa/make-rerun-list.mjs <applied-exec-results.json> [--out .zcode/tmp/rerun] */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const pos = argv.filter((a) => !a.startsWith("--"));
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const INPUT = pos[0];
if (!INPUT || !fs.existsSync(INPUT)) { console.log(`FAIL 需要改判件路径作为第一个参数（找不到：${INPUT || "(未给)"}）`); process.exit(2); }
const OUT = arg("out", ".zcode/tmp/rerun");

const doc = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const rows = Array.isArray(doc) ? doc : doc.results;
if (!Array.isArray(rows) || !rows.length) { console.log(`FAIL ${INPUT} 里没有非空的 results[]（顶层键：${Object.keys(doc).join(",")}）`); process.exit(2); }

const downgraded = rows.filter((r) => String(r.status) === "NO-EVIDENCE");
const stillCleanButMissing = rows.filter((r) => String(r.status) !== "NO-EVIDENCE" && Array.isArray(r.missingEvidence) && r.missingEvidence.length);

// 按 suite 分组；RERUN_CASES 是"一次进程内按 id 过滤"，所以一个 suite 一条命令
const bySuite = new Map();
const unmapped = [];
for (const r of downgraded) {
  if (!r.suite || !r.manifest || !r.id) { unmapped.push(`${r.suite || "?"}/${r.id || "?"}`); continue; }
  if (!bySuite.has(r.suite)) bySuite.set(r.suite, { manifest: r.manifest, ids: [], pages: new Set() });
  const g = bySuite.get(r.suite);
  g.ids.push(r.id);
  g.pages.add(r.page);
  if (g.manifest !== r.manifest) console.log(`!! ${r.suite} 里出现第二个 manifest ${r.manifest}（已按首个记，需人工看）`);
}

// 检查点里 suite 是否已完成：completed 的 suite 用 RERUN_CASES 才能强制重跑指定 id
let ckptSuites = {};
try { ckptSuites = (JSON.parse(fs.readFileSync("tmp/qa/checkpoints/exec-R6.json", "utf8")).suites) || {}; } catch { console.log("!! 读不到 exec-R6 检查点，命令里的 completed 标注会缺失"); }

const cmds = [];
for (const [suite, g] of [...bySuite.entries()].sort((a, b) => a[1].ids.length - b[1].ids.length)) {
  const st = (ckptSuites[suite] || {}).status || "(不在检查点)";
  const done = g.ids.length;
  cmds.push({ suite, manifest: g.manifest, ids: g.ids.sort(), count: done, pages: [...g.pages], ckptStatus: st, cmd: `EXEC_ROUND=6 RERUN_CASES=${g.ids.slice().sort().join(",")} node scripts/qa/r-exec.cjs --suite ${suite}` });
}

fs.mkdirSync(OUT, { recursive: true });
const body = [
  `# 重采清单，由 scripts/qa/make-rerun-list.mjs 从 ${path.basename(INPUT)} 派生`,
  `# 降级行=${downgraded.length}；按 suite 分组=${cmds.length}；未映射=${unmapped.length}`,
  `# 注意：RERUN_CASES 只在"该 suite 已 completed"时才需要；status=running 的 suite 本来就会整档重跑`,
  /* 端点必须由调用方显式给，且这里用 :- 让它在缺值时**当场失败**而不是跑 29 条空转。
     实测依据（台账 §59）：r-exec 的端口发现是 TCP 探测，而 9430 TCP 在听、WS 却连不上
     （automation 在 9431）；不带端点跑一整轮 = 每条命令重连 3 次失败 = 再制造一批
     ERROR:timeout 污染，比不跑更糟。 */
  `set -u`,
  `: "\${EXEC_WS_ENDPOINT:?必须 export 实测可连的 automation 端点（TCP 在听不等于 automation 可用；上一轮真跑通用的是 9431）}"`,
  `export EXEC_WS_ENDPOINT`,
  ...cmds.map((c) => `# ${c.suite} [${c.manifest}] ${c.count} 例 ckpt=${c.ckptStatus} pages=${c.pages.join(",")}\n${c.cmd}`),
].join("\n") + "\n";
fs.writeFileSync(path.join(OUT, "rerun.sh"), body);
fs.writeFileSync(path.join(OUT, "rerun.json"), JSON.stringify({
  source: INPUT, generatedAt: new Date().toISOString(),
  downgraded: downgraded.length, suites: cmds.length, unmapped,
  idsTotal: cmds.reduce((n, c) => n + c.count, 0),
  nonDowngedButMissing: stillCleanButMissing.length,
  perSuite: cmds,
}, null, 1));

const sum = cmds.reduce((n, c) => n + c.count, 0);
console.log(`RERUN_PLAN downgraded=${downgraded.length} 已映射=${sum} 未映射=${unmapped.length} suite 分组=${cmds.length}`);
if (sum + unmapped.length !== downgraded.length) { console.log(`FAIL 不守恒：${sum}+${unmapped.length} ≠ ${downgraded.length}`); process.exit(2); }
if (!downgraded.length) { console.log("FAIL 降级行为 0：要么改判件没跑过，要么判据空过——都不该出重采清单"); process.exit(2); }
console.log(`CONSERVED ✔ 每条降级行都落到某个 suite 命令（或显式列在未映射里）`);
console.log(`另：未降级但带 missingEvidence 的行 ${stillCleanButMissing.length} 条（帧齐、只是有死引用 → 不必重采，改判已净串）`);
console.log(`out=${path.join(OUT, "rerun.sh")} / rerun.json`);
for (const c of cmds.slice(-6)) console.log(`   ${c.suite}  ${c.count} 例  ckpt=${c.ckptStatus}`);
