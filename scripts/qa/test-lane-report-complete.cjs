/* =============================================================================
 * test-lane-report-complete.cjs —— 车道报告骨架完成度门的离线负例（L20，2026-09-30）
 *
 * 为什么长这样：文件名必须匹配聚合器 scripts/qa/run-qa-selftests.mjs 的
 *   /^test-.+\.(cjs|mjs)$/  ← 按**文件名**收
 * 否则等于没接线（本仓老病：建了没人跑）。跑完聚合器的 发现= 必须 +1。
 *
 * 判据只在**自造夹具**上证明，绝不拿在途件试：本仓实测教训「并发写盘时的目录清点会把
 * 半截文件读成缺陷」（uncovered10-disposition-r14.md:177 与本轮派单纪律），round-7 此刻
 * 有 L16/L17 车道在写自己的报告，任何读它们字节的断言都是假红。夹具跑在本仓 tmp/ 下，
 * 用完即删（测试自己打印残留检查行）。
 *
 * 10 组断言的形状：
 *   A 阳性对照（骨架未填 ⇒ 必须红并指名文件与小节数）
 *   B 阴性对照（填完 ⇒ 必须绿，且含 待补/TODO/半角(待填)/"等待"字样 都不许误报）
 *   C 声明为状态 ⇒ 走 advisory，不进 PROBLEMS（默认判红极性下仍然绿）
 *   D 缺件（清单登记了但盘上没有 ⇒ 红）
 *   E 空清单 ⇒ exit 2（不可测不许冒充绿）
 *   F 豁免不合法（缺 reason）⇒ 红（逐档有账）
 *   G 失效豁免（指向已填完的小节）⇒ 红（收紧门必须撤回旧放行）
 *   H 极性轴：--advisory 下同一红样本退 0 并印 ADVISORY
 *   I 具名收件：目录里"没收进清单"的骨架件不得进 PROBLEMS（门不扫目录）
 *   J 变异证明：把判据放宽成认「待」字 ⇒ 阴性对照必须变红（证明本测试真的能变红）
 *
 * 跑法：node scripts/qa/test-lane-report-complete.cjs（需 ≥20.11；PATH 上是老 node 时用 NODE22_EXE 指一个新版）
 * ============================================================================= */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const GATE = path.join(REPO, "scripts", "qa", "verify-lane-report-complete.mjs");
const NODE22 = process.env.NODE22_EXE || "";
const NODE = NODE22 && fs.existsSync(NODE22) ? NODE22 : process.execPath;

let fail = 0, ran = 0;
function ck(name, cond, detail) {
  ran++;
  const ok = !!cond;
  if (!ok) fail++;
  console.log(`LR20 ${ok ? "OK  " : "FAIL"} ${name}${detail ? "  " + String(detail).replace(/\r?\n/g, " ").slice(0, 220) : ""}`);
}
function num(out, key) {
  const m = out.match(new RegExp(key + "=(\\d+)"));
  return m ? Number(m[1]) : null;
}

/* ── 夹具：三份报告 + 一份"没收件"的骨架件 ───────────────────────────────── */
const dir = fs.mkdtempSync(path.join(REPO, "tmp", "l20-selftest-"));

/* 骨架未填：7 个小节全是（待填），其中一节有两处 */
const SKELETON = [
  "# 夹具·骨架未填的车道报告",
  "",
  "## 0. 缺口证据",
  "（待填）",
  "",
  "## 1. 收件范围为什么具名",
  "（待填）",
  "",
  "### 1.1 实测误报边界",
  "（待填：等 L16 的读数落地再回填）",
  "",
  "## 2. 双向负例",
  "（待填）（待填）",
  "",
  "## 3. 极性决定",
  "（待填）",
  "",
  "## 4. 真实目录 dry 读数",
  "（待填）",
  "",
  "## 5. 接线三件套",
  "（待填）",
  "",
].join("\n");

/* 填完：读数齐全，且塞满"合法使用状态词"的句子——这些一律不许算违例 */
const FILLED = [
  "# 夹具·填完的车道报告",
  "",
  "## 0. 缺口证据",
  "实测 `corpus-blindspot-r16.md` 有 7 个小节留骨架占位；本车道不取在途件字节。",
  "",
  "## 1. 为什么具名收件",
  "**待补（现在是状态，不是遗漏）**：这是本册的记账体例（照 decisions-v33.md:563 的写法）。",
  "台账行里 `TODO(backend)` 是长期处置文案，不是遗漏。",
  "",
  "### 1.1 误报边界",
  "等待 L13 收口后再复量；半角写法 (待填) 本门默认不收。",
  "散文里引用这个形状写成 `（待填）` —— 反引号包起来算引用，照数进 QUOTED 读数但不判红。",
  "",
  "## 2. 双向负例",
  "RED：夹具骨架 ⇒ LANEREPORT_RESULT=FAIL 退出码=1；PASS：夹具填完 ⇒ 退出码=0。",
  "",
].join("\n");

/* 声明为状态：一节占位 + sidecar 逐条放行 */
const DECLARED = [
  "# 夹具·占位是状态的报告",
  "",
  "## 0. 长期欠账",
  "（待填）",
  "",
  "## 1. 本轮读数",
  "实测 =3，守恒 yes。",
  "",
].join("\n");

/* 目录里另有一份**没进收件清单**的骨架件：证明门不扫目录 */
const UNLISTED = [
  "# 夹具·没人收件的散文",
  "",
  "## 0. 状态",
  "（待填）",
  "",
].join("\n");

/* 散文引用：正文里用反引号引用这个占位形状（本仓体例，见 uncovered10-disposition-r14.md:32）⇒ 照数不判红 */
const QUOTED = [
  "# 夹具·引用别人骨架的散文",
  "",
  "## 0. 观察",
  "L13 那份报告通篇是 `（待填）` 骨架；围栏里那种也算：",
  "```",
  "（待填）",
  "```",
  "",
].join("\n");

fs.writeFileSync(path.join(dir, "skeleton-lane.md"), SKELETON, "utf8");
fs.writeFileSync(path.join(dir, "filled-lane.md"), FILLED, "utf8");
fs.writeFileSync(path.join(dir, "declared-lane.md"), DECLARED, "utf8");
fs.writeFileSync(path.join(dir, "quoted-lane.md"), QUOTED, "utf8");
fs.writeFileSync(path.join(dir, "unlisted-noise.md"), UNLISTED, "utf8");

const w = (name, obj) => { const p = path.join(dir, name); fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8"); return p; };
const intakeSkeleton = w("intake-skeleton.json", { dir: ".", reports: [{ file: "skeleton-lane.md", due: "本轮车道报告" }] });
const intakeFilled = w("intake-filled.json", { dir: ".", reports: [{ file: "filled-lane.md", due: "本轮车道报告" }] });
const intakeDeclared = w("intake-declared.json", { dir: ".", reports: [{ file: "declared-lane.md", due: "本轮车道报告" }] });
const intakeAll = w("intake-all.json", { dir: ".", reports: ["skeleton-lane.md", "filled-lane.md", "declared-lane.md"] });
const intakeQuoted = w("intake-quoted.json", { dir: ".", reports: ["quoted-lane.md"] });
const intakeMissing = w("intake-missing.json", { dir: ".", reports: ["gone-lane.md"] });
const intakeEmpty = w("intake-empty.json", { dir: ".", reports: [] });
const exGood = w("exempt-good.json", { exemptions: [{ file: "declared-lane.md", section: "0. 长期欠账", reason: "这一节按派单就是长期欠账，本轮只登记去向", declaredBy: "L20 夹具" }] });
const exNoReason = w("exempt-no-reason.json", { exemptions: [{ file: "declared-lane.md", section: "0. 长期欠账", declaredBy: "L20 夹具" }] });
const exStale = w("exempt-stale.json", { exemptions: [{ file: "filled-lane.md", section: "本轮读数早就不存在的一节", reason: "故意造失效放行", declaredBy: "L20 夹具" }] });

function run(extra) {
  const r = spawnSync(NODE, [GATE].concat(extra), { cwd: REPO, encoding: "utf8", timeout: 60000 });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

/* A 阳性对照：骨架未填必须红并指名文件与小节数 */
{
  const { code, out } = run(["--intake", intakeSkeleton]);
  ck("A1 骨架未填 ⇒ 退出码 1（默认 STRICT）", code === 1, `exit=${code}`);
  ck("A2 判决行 FAIL", /LANEREPORT_RESULT=FAIL 退出码=1/.test(out), out.match(/LANEREPORT_RESULT=.*/));
  ck("A3 未填小节总数=7（一节两处只计一节）", num(out, "LANEREPORT_SKELETON_SECTIONS") === 7, `SECTIONS=${num(out, "LANEREPORT_SKELETON_SECTIONS")}`);
  ck("A4 含未填骨架的份数=1", num(out, "LANEREPORT_SKELETON_FILES") === 1, `FILES=${num(out, "LANEREPORT_SKELETON_FILES")}`);
  ck("A5 占位命中=8（与节数差=同节多处）", num(out, "LANEREPORT_PLACEHOLDER_HITS") === 8, `HITS=${num(out, "LANEREPORT_PLACEHOLDER_HITS")}`);
  ck("A6 PROBLEM 行指名到文件与小节", /PROBLEM skeleton-lane\.md :: 小节「2\. 双向负例」\(行 \d+\) :: 未填骨架 2 处/.test(out), out.split(/\r?\n/).find((l) => l.startsWith("PROBLEM skeleton")));
}

/* B 阴性对照：填完必须绿，且状态词不误报 */
{
  const { code, out } = run(["--intake", intakeFilled]);
  ck("B1 填完 ⇒ 退出码 0", code === 0, `exit=${code}`);
  ck("B2 判决行 PASS", /LANEREPORT_RESULT=PASS 退出码=0/.test(out), out.match(/LANEREPORT_RESULT=.*/));
  ck("B3 未填小节=0 且未填份数=0", num(out, "LANEREPORT_SKELETON_SECTIONS") === 0 && num(out, "LANEREPORT_SKELETON_FILES") === 0, `SECTIONS=${num(out, "LANEREPORT_SKELETON_SECTIONS")}`);
  ck("B4 待补/TODO/半角(待填)/等待 全部没被算成违例（占位命中=0）", num(out, "LANEREPORT_PLACEHOLDER_HITS") === 0, `HITS=${num(out, "LANEREPORT_PLACEHOLDER_HITS")}`);
  ck("B5 反引号里的引用照数进 QUOTED 读数（不静默丢），但没进判决", num(out, "LANEREPORT_PLACEHOLDER_HITS_QUOTED") === 1 && num(out, "LANEREPORT_SKELETON_SECTIONS") === 0, `QUOTED=${num(out, "LANEREPORT_PLACEHOLDER_HITS_QUOTED")}`);
}

/* B2 围栏代码块里的占位不吃反引号规则（那才是真没填） */
{
  const { code, out } = run(["--intake", intakeQuoted]);
  ck("B2a 反引号引用不判红、围栏里的判红：未填小节=1 引用=1", code === 1 && num(out, "LANEREPORT_SKELETON_SECTIONS") === 1 && num(out, "LANEREPORT_PLACEHOLDER_HITS_QUOTED") === 1, `exit=${code} SECTIONS=${num(out, "LANEREPORT_SKELETON_SECTIONS")} QUOTED=${num(out, "LANEREPORT_PLACEHOLDER_HITS_QUOTED")}`);
  ck("B2b 判红的那条指名到围栏里那一行", /PROBLEM quoted-lane\.md :: 小节「0\. 观察」\(行 \d+\) :: 未填骨架 1 处/.test(out), out.split(/\r?\n/).find((l) => l.startsWith("PROBLEM quoted")));
}

/* C 声明为状态：走 advisory，不进 PROBLEMS */
{
  const { code, out } = run(["--intake", intakeDeclared, "--exemptions", exGood]);
  ck("C1 豁免后 ⇒ 退出码 0", code === 0, `exit=${code}`);
  ck("C2 PROBLEMS=0", num(out, "LANEREPORT_PROBLEMS") === 0, `PROBLEMS=${num(out, "LANEREPORT_PROBLEMS")}`);
  ck("C3 豁免条数 APPLIED=1，原始命中仍记 1", num(out, "LANEREPORT_EXEMPT_APPLIED") === 1 && num(out, "LANEREPORT_PLACEHOLDER_HITS_RAW") === 1, `APPLIED=${num(out, "LANEREPORT_EXEMPT_APPLIED")} RAW=${num(out, "LANEREPORT_PLACEHOLDER_HITS_RAW")}`);
  ck("C4 advisory 行在盘上可见且带理由与声明人", /^ADVISORY declared-lane\.md :: 小节「0\. 长期欠账」.*（L20 夹具）理由=/m.test(out), out.split(/\r?\n/).find((l) => l.startsWith("ADVISORY")));
  ck("C5 绿来自放行 ⇒ SWEEP 如实标 YES", /LANEREPORT_EXEMPT_SWEEP=YES/.test(out), out.match(/LANEREPORT_EXEMPT_SWEEP=\S+/));
}

/* D 缺件 */
{
  const { code, out } = run(["--intake", intakeMissing]);
  ck("D1 具名件缺失 ⇒ 红", code === 1 && /PROBLEM gone-lane\.md :: 收件件缺失/.test(out), `exit=${code}`);
}

/* E 空清单 = 不可测，不得冒充绿 */
{
  const { code, out } = run(["--intake", intakeEmpty]);
  ck("E1 空收件清单 ⇒ 退出码 2（不是 0）", code === 2, `exit=${code} ${out.split(/\r?\n/)[0]}`);
}

/* F/G 豁免必须逐档有账 + 旧放行必须撤回 */
{
  const { code, out } = run(["--intake", intakeDeclared, "--exemptions", exNoReason]);
  ck("F1 豁免缺 reason ⇒ 红且 EXEMPT_BAD=1", code === 1 && num(out, "LANEREPORT_EXEMPT_BAD") === 1, `exit=${code} BAD=${num(out, "LANEREPORT_EXEMPT_BAD")}`);
  const g = run(["--intake", intakeFilled, "--exemptions", exStale]);
  ck("G1 指向不存在小节的旧放行 ⇒ 红且 STALE=1", g.code === 1 && num(g.out, "LANEREPORT_EXEMPT_STALE") === 1, `exit=${g.code} STALE=${num(g.out, "LANEREPORT_EXEMPT_STALE")}`);
}

/* H 极性轴 */
{
  const { code, out } = run(["--intake", intakeSkeleton, "--advisory"]);
  ck("H1 --advisory 下同一红样本退 0", code === 0, `exit=${code}`);
  ck("H2 判决行是 ADVISORY 且红项照样列全", /LANEREPORT_RESULT=ADVISORY 退出码=0/.test(out) && num(out, "LANEREPORT_SKELETON_SECTIONS") === 7, out.match(/LANEREPORT_RESULT=.*/));
}

/* I 具名收件：目录里那份没收进来的骨架件（unlisted-noise.md，含 1 处（待填））不得进 PROBLEMS */
{
  const { code, out } = run(["--intake", intakeAll]);
  ck("I1 具名 3 份、扫到 3 份（目录里还有第 4 份 md 不在账上）", num(out, "LANEREPORT_INTAKE") === 3 && num(out, "LANEREPORT_SCANNED") === 3, `INTAKE=${num(out, "LANEREPORT_INTAKE")} SCANNED=${num(out, "LANEREPORT_SCANNED")}`);
  ck("I2 未收件的骨架件没被写进任何 PROBLEM（门不扫目录）", !/unlisted-noise/.test(out), out.split(/\r?\n/).filter((l) => l.includes("unlisted")).join(" | ") || "全无");
  ck("I3 已收件的两份骨架报告照判：未填份数=2 小节数=8（7+1）", code === 1 && num(out, "LANEREPORT_SKELETON_FILES") === 2 && num(out, "LANEREPORT_SKELETON_SECTIONS") === 8, `FILES=${num(out, "LANEREPORT_SKELETON_FILES")} SECTIONS=${num(out, "LANEREPORT_SKELETON_SECTIONS")}`);
  ck("I4 --skip-entry 能把在途件从这一发剔除并如实计数", (() => {
    const s = run(["--intake", intakeSkeleton, "--skip-entry", "skeleton-lane.md"]);
    return s.code === 0 && num(s.out, "LANEREPORT_SKIPPED_ENTRIES") === 1 && num(s.out, "LANEREPORT_SCANNED") === 0;
  })(), "");
}

/* J 变异证明：把判据放宽到认「待」字 ⇒ 阴性对照必须变红（证明断言有牙齿） */
{
  const mutantPath = path.join(dir, "mutant-relaxed.mjs");
  const src = fs.readFileSync(GATE, "utf8");
  const marker = 'const DEFAULT_PATTERNS = ["（待填"];';
  ck("J0 变异锚点在门源码里存在（找不到就说明变异体没生效）", src.includes(marker), marker);
  const mutant = src.replace(marker, 'const DEFAULT_PATTERNS = ["待"];');
  fs.writeFileSync(mutantPath, mutant, "utf8");
  const m = run(["--intake", intakeFilled, "--skip-entry", "___none___"]);
  const mm = (() => { const r = spawnSync(NODE, [mutantPath, "--intake", intakeFilled], { cwd: REPO, encoding: "utf8", timeout: 60000 }); return { code: r.status, out: (r.stdout || "") + (r.stderr || "") }; })();
  ck("J1 变异体（放宽成认「待」）把阴性对照判成红 ⇒ 断言真能变红", mm.code === 1 && num(mm.out, "LANEREPORT_SKELETON_SECTIONS") > 0, `exit=${mm.code} SECTIONS=${num(mm.out, "LANEREPORT_SKELETON_SECTIONS")}`);
  ck("J2 原门对同一样本仍然绿（改回即 PASS）", m.code === 0 && num(m.out, "LANEREPORT_SKELETON_SECTIONS") === 0, `exit=${m.code}`);
  fs.rmSync(mutantPath, { force: true });
  ck("J3 变异体已删除（不在盘上）", !fs.existsSync(mutantPath), mutantPath);
}

/* 夹具残留自证：tmp 下不留新文件 */
{
  fs.rmSync(dir, { recursive: true, force: true });
  const leftover = fs.readdirSync(path.join(REPO, "tmp")).filter((f) => f.startsWith("l20-selftest-"));
  ck("K1 夹具目录已清理，tmp 下无 l20-selftest-* 残留", leftover.length === 0, `残留=${leftover.join("、") || "无"}`);
  ck("K2 门文件存在且用 Node22 跑得动", fs.existsSync(GATE) && /verify-lane-report-complete/.test(GATE), GATE);
}

console.log(`LR20_NODE=${NODE} node版本=${process.version}`);
/* 自报计数要让聚合器认得：它的判据行正则是 /\b([A-Z]{2,8})_(?:TEST|RESULT)=/（字母-only），
   所以 LR20_ 那种带数字的前缀它抓不到 ⇒ 这里同时给纯字母前缀 LRPT_，聚合器那行不再是"无 *_TEST= 判据行"。 */
console.log(`LRPT_SUMMARY cases=${ran} fail=${fail}`);
console.log(`SUMMARY: assertion failures = ${fail}`);
console.log(`LRPT_TEST=${fail ? "FAIL" : "PASS"}`);
console.log(`LR20_TEST=${fail ? "FAIL" : "PASS"}`);
process.exit(fail ? 2 : 0);
