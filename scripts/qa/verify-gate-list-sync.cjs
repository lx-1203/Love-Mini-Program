#!/usr/bin/env node
/* 门禁清单的两个载具是否还指同一批门 —— 以及更重要的：两侧共享的那条禁忌还在不在。
 *
 * 为什么存在：这份"全清单"有两个载具（DSL 的 GATE_SUITE/PANEL_SUITE 与 bash 收口脚本），
 * 两边各自硬编码。谱系里记着实测教训：曾经 DSL 15 条、bash 18 步，缺面板与面板后两条复量，
 * 而两边都自称"全清单"——于是一条门在其中一个载具里被删掉时，另一个还在印 PASS。
 * 所以"两个载具清单一致"必须是一条能红的判据，而不是每次靠人对eye。
 *
 * 判的是属性，不是字面旗标：emit-round-report 这一发两侧本来就该不同
 *   —— bash 是人跑的终局收口，可以取 UI 租约复跑实时门；
 *   —— DSL 的面板腿在 Promise.all 的门清单里，取租约会和巡检车道抢同一个模拟器 ⇒ 必须 --dry。
 * 两侧真正共享的禁忌是：**面板不许把它 spawn 的子门的输出落到权威件上**（那会改写下游的输入）。
 * 这条判据因此盯的是 emit-round-report 给 verify-source-shape / verify-guest-landing /
 * verify-evidence-holes 传的 --dry 与 --out 落点，而不是它自己有没有 --dry。
 *
 * 用法：node scripts/qa/verify-gate-list-sync.cjs [--dsl <f>] [--sh <f>]
 * 机器行：GATESYNC_RESULT=PASS|FAIL|NOSUCHFILE；判点空转（两侧一条门都没解析到）以 FAIL 收。
 * 只读：不写盘、不取租约、不连设备。
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DSL_REL = arg("dsl", ".zcode/workflows/miniprogram-ui-audit-v37.dwf.ts");
const SH_REL = arg("sh", "scripts/qa/run-final-verify-v33.sh");
const PANEL_REL = "scripts/qa/emit-round-report.mjs";

const read = (rel) => {
  const p = path.resolve(REPO, rel);
  if (!fs.existsSync(p)) { console.log(`GATESYNC_RESULT=NOSUCHFILE ${rel}`); process.exit(2); }
  return fs.readFileSync(p, "utf8");
};
const dsl = read(DSL_REL);
const sh = read(SH_REL);
const panel = read(PANEL_REL);

const base = (p) => p.replace(/^scripts\/qa\//, "").replace(/^scripts\//, "");
/* 解析式必须同时吃 .mjs / .cjs / .js：本门自己是 .cjs，
   若只匹配 .mjs，把它接进两个载具之后它会报"只在 bash 出现"——
   判据因自身扩展名而误红，这种红比不判更坏（它会教下一程去删门）。 */
const SCRIPT_RE = /"(scripts\/[^"]+\.(?:mjs|cjs|js))"/g;
const namesFrom = (s) => [...s.matchAll(SCRIPT_RE)].map((m) => base(m[1]));
const gateBlock = dsl.slice(dsl.indexOf("const GATE_SUITE"), dsl.indexOf("const PANEL_SUITE"));
const panelBlock = dsl.slice(dsl.indexOf("const PANEL_SUITE"), dsl.indexOf("// ===== 看板"));
const dslSet = [...new Set([...namesFrom(gateBlock), ...namesFrom(panelBlock)])].sort();
const shSet = [...new Set([...sh.matchAll(/^g\s+\S+\s+\d+\s+(scripts\/[^\s]+)/gm)].map((m) => base(m[1])))].sort();

/* 判点空转检查：任何一侧一条都没解析到 ⇒ 是扫描集坏了，不是"两侧一致" */
if (dslSet.length === 0 || shSet.length === 0) {
  console.log(`GATESYNC_FAIL 扫描集空转 DSL=${dslSet.length} bash=${shSet.length} ⇒ 解析式与文件形状不符，本判据当前无否决力`);
  console.log("GATESYNC_RESULT=FAIL");
  process.exit(1);
}

/* 差集：prove-gates-can-fail 允许只在 bash 出现（DSL 侧它作为 redProbe 单独跑，见下） */
const ALLOW_BASH_ONLY = new Set(["prove-gates-can-fail.mjs"]);
const onlyDsl = dslSet.filter((x) => !shSet.includes(x) && !/dryrun-workflow|gen-round8-report/.test(x));
const onlySh = shSet.filter((x) => !dslSet.includes(x) && !ALLOW_BASH_ONLY.has(x));
const dslCount = (dsl.match(/\{ name: "/g) || []).length;
console.log(`GATESYNC_COUNTS dslEntries=${dslCount} dslScripts=${dslSet.length} bashSteps=${shSet.length}`);

let bad = 0;
const t = (label, ok, extra) => {
  if (!ok) bad++;
  console.log((ok ? "  OK   " : "  FAIL ") + label + (extra ? " :: " + extra : ""));
};
t("清单差集：门只在一侧出现（bash 侧 prove-gates-can-fail 为已记录的合法例外）",
  onlyDsl.length === 0 && onlySh.length === 0,
  (onlyDsl.length ? "只在DSL=" + onlyDsl.join(",") : "") + (onlySh.length ? " 只在bash=" + onlySh.join(",") : ""));
/* 解释器单一来源：nodeBin 声明之外不许再出现第二处硬编码盘符路径（除注释行） */
const hardcodedNode = dsl.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .filter((l) => /D:\/codex-tools\/node-v22/.test(l) && !/nodeBin:/.test(l));
t("解释器单一来源：正文里除 nodeBin 声明外无第二处硬编码 Node22 路径", hardcodedNode.length === 0,
  hardcodedNode.length ? "命中 " + hardcodedNode.length + " 行：" + hardcodedNode[0].trim().slice(0, 90) : "");
t("干跑预检测的是本版文件（DSL 侧带 --file 指 v3.7）",
  /--file",\s*"\.zcode\/workflows\/miniprogram-ui-audit-v37\.dwf\.ts"/.test(dsl));
t("干跑预检测的是本版文件（bash 侧同一旗标）",
  /dryrun-workflow\.mjs --profile all --file \.zcode\/workflows\/miniprogram-ui-audit-v37\.dwf\.ts/.test(sh));
t("降级结论诚实性门在两个载具都接线（写了没人跑=没写）",
  /verify-degraded-conclusion/.test(dsl) && /verify-degraded-conclusion/.test(sh));
t("DSL 的覆盖门带 --dir（判本轮写出的腿目录，不默认扫历史轮）",
  /verify-real-coverage\.mjs",\s*"--ops",\s*WORKFLOW\.opsDir,\s*"--dir",\s*WORKFLOW\.execDir/.test(dsl));
/* 共享禁忌：面板不得把子门输出落到权威件 */
t("面板给 verify-source-shape 传 --dry（否则重写 cellplan-source-shape 这份下游输入）",
  /verify-source-shape\.mjs",\s*\["--dry"/.test(panel));
t("面板给 verify-guest-landing(book) 传 --out 侧车（否则重写 guest-landing-booked）",
  /--mode",\s*"book",\s*"--out",\s*GUEST_BOOK_SIDECAR/.test(panel));
t("面板给 verify-evidence-holes 传 --out 侧车（否则重写 evidence-holes-verdict）",
  /"--out",\s*HOLES_SIDECAR/.test(panel));
/* 陈旧口径检测：一句已经不成立的危险声明留在脚本里，会诱导下一程去修一个不存在的问题 */
t("bash 里不留「面板会重写判决件」的旧说法（三处落点已改，这句话现在只制造误导）",
  !/并且会重写\n# reports\/audit\/round-7\/\{evidence-holes-verdict/.test(sh));
/* 不许写死条数：任何自称"全清单"的地方都不该出现硬编码的门条数 */
const hardcodedCount = /"(十项|十二项|\d+\s*项)门禁/.test(dsl) || /"(十项|十二项|\d+\s*项)门禁/.test(sh);
t("两个载具都不许把门禁条数写进措辞（清单会长，条数是承诺不是事实）", !hardcodedCount);

console.log(`GATESYNC_RESULT=${bad === 0 ? "PASS" : "FAIL"}（判点数=${9 + 2}，不一致=${bad}）`);
process.exit(bad === 0 ? 0 : 1);
