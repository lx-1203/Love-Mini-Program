/* verify-evidence-corpus 的「打戳约定窗口」自检（lane: corpus-legacy，2026-09-29）。
 *
 * 起因（盘上实测，不是假想）：同一份 reports/screenshots/round-1/manifest.json（顶层无 gitSha、144 帧），
 * verify-provenance-all.mjs 早已按「打戳约定起点」（git log -S gitSha -- scripts/qa 派生，
 * 实测 2026-09-24T16:31:39Z）把它读成 PROV_MANIFEST_LEGACY / PROV_FRAMES_LEGACY=144「约定尚未存在，不判红」，
 * 而本门把同一事实读成 CORPUS_PROBLEMS=1 判红。两把尺子量同一批帧量出相反结论 —— 不对称本身就是缺陷。
 *
 * 本文件测的是**窗口边界**，不是"legacy 好不好看"：
 *   · 无戳且 generatedAt **晚于/等于**约定起点 ⇒ 必须仍判红（豁免不能变成通行证）；
 *   · 无戳且 generatedAt **早于**约定起点 ⇒ legacy：不判红，但必须逐份点名 + 单独计数（不许并进绿的那侧）；
 *   · 无戳但 generatedAt 读不出来 ⇒ 判红（无法证明早于约定就不豁免）；
 *   · 伪 SHA（形状合法、本仓解析不到）即使早于约定 ⇒ 仍判红（legacy 只覆盖"顶层无 gitSha"这一格）；
 *   · 两把尺子的点名集合必须**逐字相同**（真仓 scoped 对跑，不是各说各话）。
 * 判据要能区分对错 ⇒ 最后用**翻转谓词符号的替身**（throwaway copy 在 .zcode/tmp 下，绝不改活文件）
 * 证明这些断言真会变红；替身若也全绿，说明断言是恒真的摆设。
 *
 * 用法：node22 scripts/qa/test-corpus-legacy-window.cjs   （PATH 上的 node 是 v16，会崩在 import.meta）
 *
 * 标签写法有一条硬规矩（借 selftest 同门的教训，test-corpus-sha-axis.cjs:17-19）：
 * 断言标签与细节里不能出现 `CORPUS_RESULT=FAIL` 原形 —— 聚合器 run-qa-selftests.mjs:52 取的是输出里
 * **第一个** `[A-Z]{2,8}_(TEST|RESULT)=(PASS|FAIL)`，引用判据名一律写成 `CORPUS-RESULT`。
 */
const { mkdirSync, writeFileSync, rmSync, readFileSync, statSync, existsSync } = require("node:fs");
const { createHash } = require("node:crypto");
const { join, resolve } = require("node:path");
const { spawnSync, execFileSync } = require("node:child_process");

const REPO = resolve(__dirname, "..", "..");
const GATE = join(REPO, "scripts", "qa", "verify-evidence-corpus.mjs");
const PROV = join(REPO, "scripts", "qa", "verify-provenance-all.mjs");
const FXREL = ".zcode/tmp/corpuslegacy";
const FX = join(REPO, ...FXREL.split("/"));
const MUTREL = ".zcode/tmp/corpuslegacy-mutant";
const MUT = join(REPO, ...MUTREL.split("/"));
const MUTANT = join(MUT, "verify-evidence-corpus.mut.mjs");
const NODE = process.execPath;
const HOUR = 3600 * 1000;
const ROUND1 = "reports/screenshots/round-1/manifest.json";

const git = (...a) => { try { return execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim(); } catch { return ""; } };
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
/* 约定起点独立再派生一次（与门禁同一命令、同一方言）：测试不许把自己的尺子硬编码成常量，
   否则"两个门禁同源"这条永远测不到。取不到 ⇒ 本文件直接判失败（豁免不成立时不能默认放行）。 */
const CONV_RAW = (git("log", "--reverse", "--format=%cI", "-S", "gitSha", "--", "scripts/qa").split("\n")[0] || "");
const CONV = CONV_RAW ? new Date(CONV_RAW) : null;
const HEAD40 = git("rev-parse", "HEAD");
/* 真断链样本现取、不写字面量：固定盐做 sha1 ⇒ 40 位合法形状必然不是本仓对象。
   写成字面量会被本门自己的 HARDCODED_SHA 轴扫到（verify-evidence-corpus.mjs 的脚本硬编码扫描）。 */
const PHANTOM = createHash("sha1").update("lane-corpus-legacy:unresolvable-fixture").digest("hex");

let fail = 0, cases = 0;
const ok = (cond, label, detail) => {
  cases++;
  if (cond) console.log(`  ok   ${label}`);
  else { fail++; console.log(`  FAIL ${label}${detail ? "  <<" + String(detail).slice(0, 240) + ">>" : ""}`); }
};

function manifestAt(sub, opts) {
  const dir = join(FX, ...sub.split("/"));
  const img = join(dir, "img");
  mkdirSync(img, { recursive: true });
  const shots = [];
  const n = opts.frames || 2;
  for (let i = 1; i <= n; i++) {
    const f = join(img, `S0${i}.png`);
    writeFileSync(f, Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from(sub + "-S0" + i, "utf8")]));
    const rel = f.slice(REPO.length + 1).split("\\").join("/");
    shots.push({ identity: "A", route: "pages/x/index", state: "默认", path: rel, file: rel,
      bytes: statSync(f).size, contentHash: sha256(readFileSync(f)).slice(0, 16) });
  }
  const j = { shots };                        // 帧全部存在且哈希相符 ⇒ 红只可能来自 gitSha 这一轴
  if ("gitSha" in opts) j.gitSha = opts.gitSha;
  if ("generatedAt" in opts) j.generatedAt = opts.generatedAt;
  writeFileSync(join(dir, "manifest-detail.json"), JSON.stringify(j, null, 1));
  return n;
}

function runGate(gatePath, args) {
  /* 剥掉 QA_EVIDENCE_STORE：本门的库路径有两个来源（--store 或该环境变量，verify-evidence-corpus.mjs:44-45），
     继承到"配了库"就会把库那一轴的红掺进窗口判据的读数里（test-evidence-store-axis.mjs:28-38 踩过同一坑，
     测出来根本不是它声称要测的那一支）。本文件只测 gitSha 窗口，所以固定用"未配库"这一档。 */
  const env = { ...process.env }; delete env.QA_EVIDENCE_STORE;
  const r = spawnSync(NODE, [gatePath].concat(args), { cwd: REPO, encoding: "utf8", timeout: 300000, env });
  const body = (r.stdout || "") + (r.stderr || "");
  const num = (re) => { const m = body.match(re); return m ? Number(m[1]) : null; };
  return {
    code: r.status, body,
    problems: num(/CORPUS_PROBLEMS=(\d+)/),
    legacy: num(/CORPUS_LEGACY_NO_SHA=(\d+)/),
    legacyFrames: num(/CORPUS_LEGACY_FRAMES=(\d+)/),
    emptyClass: num(/CORPUS_SHA_CLASS resolvableOlder=\d+ unresolvable=\d+ empty=(\d+)/),
    emptyFrames: num(/:: frames resolvableOlder=\d+ unresolvable=\d+ empty=(\d+)/),
    legacyFiles: (body.match(/^ {2}CORPUS_LEGACY_FILE (\S+)/gm) || []).map((l) => l.trim().replace(/^CORPUS_LEGACY_FILE /, "")),
    convInLine: (body.match(/CORPUS_LEGACY_NO_SHA=\d+ CORPUS_LEGACY_FRAMES=\d+ 打戳约定起点=(\S+?)（/) || [])[1] || "",
  };
}
const fxArgs = (sub) => { const root = sub ? `${FXREL}/${sub}` : FXREL; return ["--root", root, "--scope", root + "/"]; };

// ---------- 前置量：夹具自己必须先成立，否则下面的断言全是空的 ----------
rmSync(FX, { recursive: true, force: true });
rmSync(MUT, { recursive: true, force: true });
ok(!!CONV && !isNaN(CONV.getTime()), "SETUP 派生得出打戳约定起点（取不到 ⇒ legacy 豁免无从可测，不许默认放行）", CONV_RAW);
ok(!!HEAD40, "SETUP 取得到 HEAD 全写", HEAD40);
ok(!existsSync(join(REPO, "scripts", "qa", "verify-evidence-corpus.mut.mjs")),
  "SETUP 替身只住在 .zcode/tmp 下，活目录 scripts/qa 里没有替身文件", "");

// ---------- A. 无戳 + generatedAt 晚于约定起点 ⇒ 仍必须红 ----------
{
  manifestAt("AFTER", { gitSha: "", generatedAt: new Date(CONV.getTime() + HOUR).toISOString() });
  const g = runGate(GATE, fxArgs("AFTER"));
  ok(g.code === 1 && g.problems === 1, "A 约定之后无戳：仍判红（豁免没有变成通行证）", `code=${g.code} problems=${g.problems}`);
  ok(g.legacy === 0, "A 约定之后无戳：CORPUS_LEGACY_NO_SHA=0（没被误认成 legacy）", "legacy=" + g.legacy);
  ok(/不早于约定起点/.test(g.body),
    "A 约定之后无戳：逐行判决写明 generatedAt 不早于约定起点（红有理由，不是只给个计数）", "");
}

// ---------- B. 无戳 + generatedAt 恰等于约定起点 ⇒ 红（窗口是严格早于） ----------
{
  manifestAt("EXACT", { gitSha: "", generatedAt: CONV.toISOString() });
  const g = runGate(GATE, fxArgs("EXACT"));
  ok(g.code === 1 && g.problems === 1, "B 恰等于约定起点：判红（早于=严格，边界不松一格）", `code=${g.code} problems=${g.problems}`);
  ok(g.legacy === 0, "B 恰等于约定起点：legacy=0", "legacy=" + g.legacy);
}

// ---------- C. 无戳 + generatedAt 早于约定起点 ⇒ legacy：不判红，但必须可见 ----------
{
  const n = manifestAt("BEFORE", { gitSha: "", generatedAt: new Date(CONV.getTime() - HOUR).toISOString() });
  const g = runGate(GATE, fxArgs("BEFORE"));
  ok(g.code === 0 && g.problems === 0, "C 约定之前无戳：不判红（与 provenance 同一格口径）", `code=${g.code} problems=${g.problems}`);
  ok(g.legacy === 1, "C 约定之前无戳：CORPUS_LEGACY_NO_SHA=1（不安静：机器行点名数量）", "legacy=" + g.legacy);
  ok(g.legacyFrames === n, "C 约定之前无戳：legacy 帧数单独计数（没并进绿的那侧）", "frames=" + g.legacyFrames);
  ok(g.emptyClass === 1 && g.emptyFrames === n,
    "C 约定之前无戳：SHA_CLASS 的 empty 仍数着它（事实没被重新解释，只是判决变了）", `empty=${g.emptyClass} emptyFrames=${g.emptyFrames}`);
  ok(g.legacyFiles.length === 1 && /corpuslegacy\/before\/manifest-detail\.json$/.test(g.legacyFiles[0]),
    "C 约定之前无戳：CORPUS_LEGACY_FILE 逐份指名（与 CORPUS_PROBLEM 同一命名规矩）", (g.legacyFiles || []).join(","));
  ok(/不判红 ≠ 通过|不得作产物级证据|不得引用它作/.test(g.body),
    "C 约定之前无戳：legacy 行自己说清「不判红 ≠ 有背书」", "");
  ok(new Date(g.convInLine).getTime() === CONV.getTime(),
    "C 约定之前无戳：门印出的约定起点==测试独立派生的那一个（同一把尺子，不是各写一把）",
    `gate=${g.convInLine} test=${CONV.toISOString()}`);
  ok(/CORPUS_RESULT=PASS（[^）]*legacy 无戳清单=1/.test(g.body),
    "C 约定之前无戳：绿的那行也带着 legacy 计数（读的人不会把绿当成「全都有背书」）", "");
}

// ---------- D. 无戳 + generatedAt 读不出来 ⇒ 红（无法证明早于约定就不豁免） ----------
{
  manifestAt("NODATE", { gitSha: "" });
  const g = runGate(GATE, fxArgs("NODATE"));
  ok(g.code === 1 && g.problems === 1 && g.legacy === 0,
    "D 无 generatedAt：判红且不记 legacy（缺日期不是豁免的理由）", `code=${g.code} problems=${g.problems} legacy=${g.legacy}`);
}

// ---------- E. 关键不放宽：伪 SHA 即使早于约定 ⇒ 仍判红 ----------
{
  manifestAt("PHANTOM_BEFORE", { gitSha: PHANTOM, generatedAt: new Date(CONV.getTime() - 72 * HOUR).toISOString() });
  const g = runGate(GATE, fxArgs("PHANTOM_BEFORE"));
  ok(g.code === 1 && g.problems === 1, "E 真断链+早于约定：照旧判红（legacy 只覆盖「顶层无 gitSha」这一格）",
    `code=${g.code} problems=${g.problems}`);
  ok(g.legacy === 0, "E 真断链+早于约定：没被记成 legacy", "legacy=" + g.legacy);
}

// ---------- F. 有戳且==HEAD ⇒ 绿且 legacy=0（这条轴不是恒红的装饰） ----------
{
  manifestAt("OKHEAD", { gitSha: HEAD40, generatedAt: new Date(CONV.getTime() - HOUR).toISOString() });
  const g = runGate(GATE, fxArgs("OKHEAD"));
  ok(g.code === 0 && g.problems === 0 && g.legacy === 0,
    "F HEAD 全写：绿且 legacy=0（有戳的清单不进 legacy 桶，哪怕日期早于约定）", `code=${g.code} problems=${g.problems} legacy=${g.legacy}`);
}

// ---------- G. 混合：一份 legacy + 一份红 ⇒ 两个数各记各的，谁也没并进谁 ----------
{
  manifestAt("MIX/before", { gitSha: "", generatedAt: new Date(CONV.getTime() - HOUR).toISOString() });
  manifestAt("MIX/after", { gitSha: "", generatedAt: new Date(CONV.getTime() + HOUR).toISOString() });
  const g = runGate(GATE, fxArgs("MIX"));
  ok(g.legacy === 1 && g.problems === 1, "G 混合：legacy=1 且 problems=1 ⇒ 豁免一格、判红一格，互不吞并",
    `legacy=${g.legacy} problems=${g.problems}`);
  ok(g.emptyClass === 2, "G 混合：两份无戳都还在 empty 类里（类是事实，判决是另一回事）", "empty=" + g.emptyClass);
  ok(g.legacyFiles.length === 1, "G 混合：只有早于约定的那一份被 legacy 点名", (g.legacyFiles || []).join(","));
  ok(/CORPUS_RESULT=FAIL/.test(g.body), "G 混合：整体仍为 CORPUS-RESULT 红（legacy 不会把门染绿）", "");
}

// ---------- H. 两把尺子对跑真实仓：点名集合必须逐字相同 ----------
{
  const c = runGate(GATE, ["--scope", "reports/screenshots/round-1"]);
  const pr = spawnSync(NODE, [PROV, "--scope", "reports/screenshots/round-1"], { cwd: REPO, encoding: "utf8", timeout: 300000 });
  const pbody = (pr.stdout || "") + (pr.stderr || "");
  const provFiles = (pbody.match(/^PROV_MANIFEST_LEGACY (\S+)/gm) || []).map((l) => l.replace(/^PROV_MANIFEST_LEGACY /, ""));
  const cSet = c.legacyFiles.slice().sort().join("|");
  const pSet = provFiles.slice().sort().join("|");
  ok(cSet === pSet, "H 真仓对跑：corpus 的 CORPUS_LEGACY_FILE 集合 == provenance 的 PROV_MANIFEST_LEGACY 集合",
    `corpus=[${cSet}] provenance=[${pSet}]`);
  ok(cSet.includes(ROUND1) && pSet.includes(ROUND1),
    "H 真仓对跑：round-1 那 144 帧在两把尺子下都被认成 legacy（这才是本轮要修的不对称）",
    `corpus=[${cSet}] provenance=[${pSet}]`);
  /* 这一格原先写死 `c.problems === 0`，那只在 round-1 那 144 帧还在盘上时成立。
     2026-09-30 用户选择清理截图后它们不在了，而它们又被 .gitignore 挡着（截图一律不入库）
     ⇒ git ls-files --deleted 无法为它们背书 ⇒ 无库配置下这 144 帧是"拿不出凭据的缺席"，problems=1 是**正确读数**。
     所以判据改成派生的、且真正对准本节要证的事：红只能来自"帧不存在"这一轴，
     **legacy 那一格永不产红**（红与豁免分得开）。帧哪天回到盘上，本断言自动退回要求 problems=0。 */
  const problemLines = (c.body.match(/^\s*CORPUS_PROBLEM .*$/gm) || []);
  const nonAbsence = problemLines.filter((l) => !/帧不存在=/.test(l));
  ok(c.legacy >= 1 && nonAbsence.length === 0 && problemLines.length === c.problems,
    "H 真仓对跑：红只可能来自「帧不存在」，legacy 那一格永不产红（红与豁免分得开）",
    `problems=${c.problems} problemLines=${problemLines.length} nonAbsence=${nonAbsence.length} legacy=${c.legacy}`);
}

/* ---------- I. 负例能咬人：把谓词符号翻转的替身跑同一套判据 ----------
   替身只放在 .zcode/tmp 下，活文件一个字都不改（三车道并发，改活文件等于踩别人脚）。
   两处替换：① 谓词 `gen.at < STAMP_CONVENTION` → `gen.at > STAMP_CONVENTION`（就是本门的窗口方向）；
             ② 替身不在 scripts/qa 下，`resolve(here, "../..")` 会指错仓库根 ⇒ 锚回真 REPO（与判据无关）。 */
function windowBattery(gatePath) {
  const a = runGate(gatePath, fxArgs("AFTER"));
  const b = runGate(gatePath, fxArgs("BEFORE"));
  let bad = 0;
  if (!(a.code === 1 && a.problems === 1 && a.legacy === 0)) bad++;   // 约定之后无戳 ⇒ 红
  if (!(b.code === 0 && b.problems === 0 && b.legacy === 1)) bad++;   // 约定之前无戳 ⇒ legacy
  return bad;
}
{
  const liveBefore = sha256(readFileSync(GATE));
  const liveText = readFileSync(GATE, "utf8");
  const PRED = "gen.at < STAMP_CONVENTION";
  const FLIP = "gen.at > STAMP_CONVENTION";
  const ANCHOR = 'const repo = resolve(here, "../..");';
  ok(liveText.split(PRED).length - 1 === 1, "I 替身前：活文件里那条谓词恰好出现 1 次（翻转才不会翻到别处）",
    "count=" + (liveText.split(PRED).length - 1));
  ok(liveText.split(ANCHOR).length - 1 === 1, "I 替身前：仓库根锚点恰好出现 1 次（替身的第 2 处替换是机械定位，不动判据）",
    "count=" + (liveText.split(ANCHOR).length - 1));
  const mutText = liveText.replace(PRED, FLIP).replace(ANCHOR, `const repo = ${JSON.stringify(REPO)};`);
  mkdirSync(MUT, { recursive: true });
  writeFileSync(MUTANT, mutText, "utf8");
  const diffLines = mutText.split("\n").filter((l, i) => l !== liveText.split("\n")[i]).length;
  ok(diffLines === 2, "I 替身与活文件的差异行数==2（一处翻转谓词 + 一处根锚点，别的一个字没动）", "diffLines=" + diffLines);
  const badLive = windowBattery(GATE);
  const badMut = windowBattery(MUTANT);
  ok(badLive === 0, "I 活文件：窗口判据两端都成立（AFTER 红 / BEFORE legacy）", "bad=" + badLive);
  ok(badMut >= 2, "I 反证：谓词符号翻转后同一套判据**变红**（断言不是恒真的摆设）",
    `mutant_bad=${badMut} live_bad=${badLive}`);
  console.log(`  NEGATIVE_PROOF live_bad=${badLive} mutant_bad=${badMut}（翻转 <→> 让 BEFORE 判红、AFTER 变 legacy ⇒ 窗口两端都真的在受力）`);
  ok(sha256(readFileSync(GATE)) === liveBefore, "I 活文件在整套反证过程中逐字节未变（只动 .zcode/tmp 下的替身）", "");
}

// ---------- J. 一次性产物必须清干净（不留残缺，也不污染别人的扫描） ----------
rmSync(MUT, { recursive: true, force: true });
rmSync(FX, { recursive: true, force: true });
ok(!existsSync(MUT) && !existsSync(MUTANT), "J 替身目录已删除并复核不存在", "existsSync=" + existsSync(MUT));
ok(!existsSync(FX), "J 夹具目录已删除并复核不存在", "existsSync=" + existsSync(FX));
ok(!existsSync(join(REPO, ".zcode", "tmp", "corpuslegacy-mutant")), "J 复核（按仓库相对路径再问一次）：替身目录确实没了", "");

console.log(`LEGWIN_SUMMARY cases=${cases} fail=${fail} conv=${CONV ? CONV.toISOString() : "(派生不出来)"} phantom=${PHANTOM.slice(0, 12)} head=${HEAD40.slice(0, 8)} platform=${process.platform}`);
console.log(`SUMMARY: assertion failures = ${fail}`);
console.log(fail === 0 ? "LEGWIN_TEST=PASS" : "LEGWIN_TEST=FAIL");
process.exit(fail ? 1 : 0);
