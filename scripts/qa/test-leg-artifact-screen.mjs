#!/usr/bin/env node
/* 腿产物入库禁令的负例自检（2026-10-16 裁定：设备腿输出件一律不入库，且必须在仪器里 enforced）。
 * 测的是载具真正 import 的那一个 checkPath，不是重抄的一份正则。
 * 四段：
 *  ① 单元屏：三类新形状"新引入 ⇒ 硬红 / 基线已跟踪 ⇒ 软提示"，以及既有不变量（.env 家族与 prestate*.sql
 *     不看软硬一律硬红、.env.example 豁免、exec 目录里的兄弟件不许被误屏、device-leg 目录名吃掉 verdict.txt）。
 *  ② 真实 git 红：把盘上真实存在的腿产物用临时 GIT_INDEX_FILE（真实索引的副本）+ update-index
 *     --cacheinfo 塞进"假暂存集"，然后跑门本体 ⇒ 新引入的必须 exit 1 且逐条点名；已入库的必须打 SOFT
 *     且不参与 exit 1。**哪些算硬红不再手写**：从 `git cat-file -e HEAD:./<path>` 的事实派生
 *     （在 HEAD 里=软，不在=硬）—— 2026-10-24 61315a93 把 exec-v38-devicleg/exec-results.json 入库后，
 *     旧基线还钉着"三份全硬红"，门却正确地把它降成软提示，测试于是假红（paths=3 vs 实得 2）。
 *     哪个是硬、哪个是软由 HEAD 现场决定；这里只断言"派生出来的硬集合必须被门点名、软集合必须 SOFT"。
 *     全程不碰 .git/index、不碰工作树、不 commit、不 add 到真索引。
 *  ③ 归因基线：**没加那三条**的 scratch 索引跑同一条门必须 exit 0 —— 这是"永久红的门等于没有门"的反证，
 *     也证明②的红是那几次 add 挣来的，不是门自己常年红。
 *  ⑤ 硬/软分界的 e2e：把 HEAD 里**已跟踪**的 85 份 exec-results.json 之一改到 scratch 索引 ⇒ 必须 exit 0
 *     且打 SOFT 行（撤库的 `git rm --cached` 同侧，不能被这道门挡死）。
 *  ④ 变异绑定：把门复制成 scripts/qa/.legex-mutated-gate.mjs 并**只**删掉三条腿产物规则（先 grep-back 证明
 *     删到了、且 verdict.txt/prestate 那些老规则还活着），拿同一份 scratch 索引跑这份副本 ⇒ 必须 exit 0
 *     且不点名那三条 ⇒ ②的红确实绑在这三条规则上（不是碰巧由内容屏/别的东西判的）。
 *     B 里那条"合成 exec-results 路径"是**结构性**的：真实 exec-v38 已入库、只能证明软侧；要让 ④ 继续
 *     覆盖"新引入的 exec-results 硬红"，只能用一条不在 HEAD 的同形状路径（--cacheinfo 不需要工作树文件）。
 * 跑法：D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/test-leg-artifact-screen.mjs
 * 输出纪律：全程不回显任何票/口令；scratch 索引落在 ASCII 的 os.tmpdir()（本仓路径含非 ASCII，
 *   GIT_INDEX_FILE 走 cp936 会被读成"找不到"，那是假绿的形状）。 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const HERE = dirname(resolve(import.meta.filename));
const REPO = resolve(HERE, "..", "..");
const GATE = join(HERE, "verify-staged-secrets.mjs");
const MUT_REL = join("scripts", "qa", ".legex-mutated-gate.mjs");
const MUT = join(REPO, MUT_REL);
const TMP = join(tmpdir(), `legex-screen-${process.pid}`);

let checks = 0, bad = 0;
const t = (name, pass, extra) => {
  checks++;
  console.log(`${pass ? "ok  " : "FAIL"} ${name}${!pass && extra !== undefined ? " :: " + String(extra).slice(0, 180) : ""}`);
  if (!pass) bad++;
};

/* ---------- ① 单元屏：真 import 门本体的 checkPath ---------- */
const { checkPath } = await import(pathToFileURL(GATE).href);
const NEW = () => false;   /* 基线里没有 = 新引入 */
const OLD = () => true;    /* 基线已跟踪 = 改动既有载体 */

const SHAPES = [
  ["reports/audit/round-7/exec-v38-devicleg/exec-results.json", "腿结果台账"],
  ["reports/audit/round-7/interact/exec-results.json", "腿结果台账"],
  ["reports/audit/device-leg-real-2026-10-15-19-18-34/simulator-network.log", "设备腿输出目录"],
  ["reports/audit/device-leg-mock-2026-10-14-14-37-31/verdict.txt", "设备腿输出目录"],
  ["reports/audit/device-leg-real-2026-10-15-19-18-34/01-home.png", "设备腿输出目录"],
  ["reports/audit/round-7/exec-guest-real-guard-r10/subpackages-campus-campus-index.png", "腿帧图"],
  ["exec-results.json", "腿结果台账"],                       /* "any path" 这一句要真成立 */
];
for (const [p, label] of SHAPES) {
  const c = checkPath(p, NEW);
  t(`新引入硬红：${p}`, c.hit === true && c.hard === true && c.reason.includes(label), JSON.stringify(c));
  const s = checkPath(p, OLD);
  t(`基线已跟踪 ⇒ 软提示（不恒红、也不挡撤库）：${p}`, s.hit === true && s.hard === false, JSON.stringify(s));
}
/* 既有不变量：这次改动不许把老的软硬分级碰歪 */
for (const p of ["backend/.env", "certs/server.pem", "ops/prestate-20261014.sql"]) {
  t(`恒红不变量仍恒红：${p}`, checkPath(p, OLD).hard === true, JSON.stringify(checkPath(p, OLD)));
}
t(".env.example 模板豁免仍在", checkPath("backend/.env.example", NEW).hit === false, JSON.stringify(checkPath("backend/.env.example", NEW)));
/* 屏的范围要正好：exec 目录里的兄弟件不在本裁定点名范围内（报告里如实记下这一格） */
for (const p of [
  "reports/audit/round-7/exec-A-real-only/manifest-detail.json",
  "reports/audit/round-7/exec-guest-real-guard-r10/guest-landings.json",
  "reports/audit/round-7/device-legs-closure-2026-10-06.md",   // 名字像腿、其实是被跟踪的收尾散文
  "docs/frames/home.png",
]) {
  t(`范围外不误屏：${p}`, checkPath(p, NEW).hit === false, JSON.stringify(checkPath(p, NEW)));
}
/* 老规则不能被新规则抢走（exec 目录以外的 verdict.txt 仍归 verdict.txt 那条） */
t("verdict.txt 在腿目录之外仍由原规则命中",
  checkPath("reports/audit/round-7/foo/verdict.txt", NEW).reason.includes("腿判决件"),
  JSON.stringify(checkPath("reports/audit/round-7/foo/verdict.txt", NEW)));

/* ---------- git 读数（只读真索引；写只在 TMP 的副本上） ---------- */
const GIT_BASE = ["-c", "core.quotePath=false"];
function git(args, env = {}, allowFail = false) {
  try {
    return { ok: true, out: execFileSync("git", [...GIT_BASE, ...args], { cwd: REPO, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 }).trim() };
  } catch (e) {
    if (allowFail) return { ok: false, out: String(e.stdout || ""), err: String(e.message || e) };
    throw e;
  }
}
const realDiff = () => git(["diff", "--cached", "--name-only"]).out;   /* 不带 GIT_INDEX_FILE ⇒ 真实索引 */

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const gitdir = git(["rev-parse", "--absolute-git-dir"]).out;
const realIndex = join(gitdir, "index");
const scratch = join(TMP, "scratch.index");
if (existsSync(realIndex)) copyFileSync(realIndex, scratch); else writeFileSync(scratch, "");
t("scratch 索引与真实索引是两个文件（改前者不可能改到真索引）", resolve(scratch) !== resolve(realIndex), scratch);

const before = realDiff();
const inHead = (p) => git(["cat-file", "-e", `HEAD:./${p}`], {}, true).ok;   // 只读 HEAD，不碰索引
const trackedExec = git(["ls-files", "--", "*exec-results.json"]).out.split(/\r?\n/).filter(Boolean).length;
const trackedDeviceLeg = git(["ls-files", "--", "reports/audit"]).out.split(/\r?\n/).filter((p) => p.includes("device-leg-")).length;
console.log(`NOTE 库内既有载体：exec-results.json 已跟踪=${trackedExec}（改它们判软提示，不判红）；reports/audit 下 device-leg-* 路径已跟踪=${trackedDeviceLeg} 个文件（按 HEAD 逐条判：在册=软、未在册=硬，不再假设 0）`);

/* 演示用的三份都是盘上真实存在的腿产物；内容用一枚无害合成 blob 顶掉，
   这样②的红**只能**来自路径屏（内容屏一条也判不到）。 */
const DEMO = [
  "reports/audit/round-7/exec-v38-devicleg/exec-results.json",
  "reports/audit/device-leg-real-2026-10-15-19-18-34/simulator-network.log",
  "reports/audit/round-7/exec-guest-real-guard-r10/subpackages-campus-campus-index.png",
];
for (const p of DEMO) t(`演示件在盘上真实存在：${p}`, existsSync(join(REPO, p)));
/* 2026-10-28：硬/软不再由这份清单手数。61315a93 已把 exec-v38-devicleg/exec-results.json 入库，
   门对它正确地走软提示；旧基线还钉 "paths=3" 就会假红（实得 2）。硬集合从 HEAD 的事实派生：
   在 HEAD 里=软提示，不在=新引入=硬红。清单里必须两半都有，否则 ② 有一半没被测到。 */
const HARD_DEMO = DEMO.filter((p) => !inHead(p));
const SOFT_DEMO = DEMO.filter((p) => inHead(p));
t("演示件派生：新引入与已入库两半都在（缺一半 ⇒ ② 的硬/软分界只测到一侧）",
  HARD_DEMO.length > 0 && SOFT_DEMO.length > 0, `硬=${HARD_DEMO.length} 软=${SOFT_DEMO.length}`);
console.log(`NOTE 演示件派生自 HEAD：硬红=${HARD_DEMO.length}（${HARD_DEMO.join(" | ")}）；软提示=${SOFT_DEMO.length}（${SOFT_DEMO.join(" | ")}）`);
const benign = join(TMP, "benign.json");
writeFileSync(benign, JSON.stringify({ results: [] }, null, 1) + "\n", "utf8");
const SHA = git(["hash-object", "-w", "--", benign]).out;   // 只多一个游离 loose object
t("合成 blob 造出来了（内容无票形，红只能来自路径屏）", /^[0-9a-f]{40}$/.test(SHA), SHA);

function stageInto(idx, paths) {
  for (const p of paths) git(["update-index", "--add", "--cacheinfo", `100644,${SHA},${p}`], { GIT_INDEX_FILE: idx });
}
/* B：只有三条新规则才屏得住的"新引入"载体。真实 exec-v38 已入库、只能证明软侧，
   ⇒ 造一条同形状、不在 HEAD 的 exec-results 路径（--cacheinfo 只写 scratch 索引，不需要工作树文件）
   来继续覆盖这条规则的硬红侧。B_DEMO 两条都必须不在 HEAD，否则 ④ 的变异反证会被软提示污染。 */
const NEW_EXEC_B = "reports/audit/round-7/exec-v38-newleg/exec-results.json";
const B_DEMO = [NEW_EXEC_B, DEMO[2]];
t("②' 的两份 B 载体都不在 HEAD（新引入 ⇒ 必须硬红）", B_DEMO.every((p) => !inHead(p)), B_DEMO.join(" | "));
/* 两份 scratch 索引：A(scratch) 装全部演示载体；B(scratchB) 只装 B_DEMO。
   B 是给④用的干净形状：拿它跑变异体必须 exit 0 —— 那才是货真价实的 green-but-should-be-red。 */
const scratchB = join(TMP, "scratch-b.index");
copyFileSync(scratch, scratchB);

function runGate(script, jsonName, idx) {
  const side = join(TMP, jsonName);
  try {
    const out = execFileSync(process.execPath, [script, "--json", side], { cwd: REPO, encoding: "utf8", env: { ...process.env, GIT_INDEX_FILE: idx }, maxBuffer: 64 * 1024 * 1024 });
    return { exit: 0, out, side };
  } catch (e) {
    return { exit: typeof e.status === "number" ? e.status : 127, out: String(e.stdout || "") + String(e.stderr || ""), side };
  }
}
const readSide = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const hitPathsOf = (r) => r.out.split(/\r?\n/).filter((l) => l.startsWith("HIT ")).map((l) => l.slice(4).split(" ")[0]);

/* ---------- ② 真 add 的变红演示 ---------- */
/* 基线不能是「什么都不塞」：scratch 是真索引副本，开发者当下暂存了什么就跟着变（上一轮它恰好非空才绿）。
   门现在对 staged=0 退 2（空索引＝没判点可产，不是清白），所以基线要显式暂存一份与三条规则都无关的良性文件。 */
stageInto(scratch, ["zz-legscreen-benign.txt"]);
const base = runGate(GATE, "sidecar-baseline.json", scratch);   // ③ 先跑：scratch=真索引副本+一份良性文件，没塞腿产物
stageInto(scratch, DEMO);
stageInto(scratchB, B_DEMO);                                     // 只塞"新规则独有"的新引入两份
const red = runGate(GATE, "sidecar-red.json", scratch);
const redB = runGate(GATE, "sidecar-red-b.json", scratchB);
const redSide = readSide(red.side);
const redText = red.out;
const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

t("③ 归因基线：同一 scratch 索引、没塞腿产物时门必须 exit 0（否则就是永久红）", base.exit === 0, `exit=${base.exit} ${base.out.slice(-160)}`);
/* 期望值全部从 HARD_DEMO/SOFT_DEMO 派生（它们来自 HEAD 事实），不再写死 3/2。 */
t(`② 塞进 ${DEMO.length} 份演示载体后门 exit 1（其中新引入 ${HARD_DEMO.length} 份）`, red.exit === 1, `exit=${red.exit} ${redText.slice(-200)}`);
for (const p of HARD_DEMO) t(`② 新引入逐条点名 HIT：${p}`, redText.includes("HIT " + p), redText.split(/\r?\n/).filter((l) => l.startsWith("HIT")).slice(0, 5).join(" | "));
for (const p of SOFT_DEMO) t(`② 已入库逐条点名 SOFT（不计入 exit 1）：${p}`, redText.includes("SOFT " + p), redText.split(/\r?\n/).filter((l) => l.startsWith("SOFT")).slice(0, 3).join(" | "));
t(`② 机器行 paths=${HARD_DEMO.length} findings=${HARD_DEMO.length}（只数硬红；已入库的 SOFT 不进这两个数）`,
  new RegExp(`STAGEDSECRETS_RESULT=FAIL paths=${HARD_DEMO.length} findings=${HARD_DEMO.length}`).test(redText),
  (redText.match(/STAGEDSECRETS_RESULT=.*/) || ["(无机器行)"])[0]);
t(`② 侧车 ${HARD_DEMO.length} 条判点全是 kind=path 且正好是新引入那几份`,
  !!redSide && redSide.hits.length === HARD_DEMO.length && redSide.hits.every((h) => h.kind === "path")
    && sameSet(redSide.hits.map((h) => h.path), HARD_DEMO),
  redSide ? JSON.stringify(redSide.hits.map((h) => [h.kind, h.path])) : "侧车读不到");
t("② 侧车 softPaths 正好是已入库那几份（硬/软分界在侧车里也留痕）",
  !!redSide && sameSet(redSide.softPaths || [], SOFT_DEMO),
  redSide ? JSON.stringify(redSide.softPaths) : "侧车读不到");
t("② 侧车不落地任何票/原文（掩码纪律：path 判点的 masked 必为空）", !!redSide && redSide.hits.every((h) => !h.masked), "masked 非空");
t(`②' 只塞 ${B_DEMO.length} 份「新规则独有」的新引入载体（exec-results + png）也 exit 1 且 paths=${B_DEMO.length}`,
  redB.exit === 1 && new RegExp(`paths=${B_DEMO.length} findings=${B_DEMO.length}`).test(redB.out), (redB.out.match(/STAGEDSECRETS_RESULT=.*/) || ["(无机器行)"])[0]);

/* ---------- ⑤ 硬/软分界的 e2e：改动**已跟踪**的腿台账必须走软提示、门仍 exit 0 ---------- */
const TRACKED_LEG = "reports/audit/round-7/exec-A-login-r8/exec-results.json";
t(`⑤ 前提：这份台账确实已被 HEAD 跟踪（= 软提示那一侧的真实形状，${trackedExec} 份已跟踪里的一份）`,
  inHead(TRACKED_LEG), TRACKED_LEG);
const scratchC = join(TMP, "scratch-c.index");
if (existsSync(realIndex)) copyFileSync(realIndex, scratchC); else writeFileSync(scratchC, "");
stageInto(scratchC, [TRACKED_LEG]);
const soft = runGate(GATE, "sidecar-soft.json", scratchC);
t("⑤ 把已跟踪的 exec-results.json 改到索引里 ⇒ 门 exit 0（软，不永久红，也不挡 `git rm --cached` 撤库）",
  soft.exit === 0, `exit=${soft.exit} ${(soft.out.match(/STAGEDSECRETS_RESULT=.*/) || ["(无机器行)"])[0]}`);
t("⑤ 软提示仍要点名（SOFT 行有它，且机器行 paths=0 findings=0）",
  soft.out.includes("SOFT " + TRACKED_LEG) && /paths=0 findings=0/.test(soft.out),
  soft.out.split(/\r?\n/).filter((l) => l.startsWith("SOFT")).slice(0, 3).join(" | "));

/* ---------- 真实索引未动 ---------- */
const after = realDiff();
t("真实索引一字未动（before/after 相等）", before === after, `before="${before}" after="${after}"`);
t("真实索引本来就是空暂存 ⇒ 跑完仍是空", before === "" && after === "", `after="${after}"`);

/* ---------- ④ 变异绑定：只删三条腿产物规则，同一 scratch 索引必须变绿 ---------- */
const src = readFileSync(GATE, "utf8").split(/\r?\n/);
const RULE_MARKS = ["腿结果台账", "设备腿输出目录", "腿帧图"];
const keep = src.filter((l) => !RULE_MARKS.some((m) => l.includes(m) && /^\s*\[\//.test(l)));
const removed = src.length - keep.length;
writeFileSync(MUT, keep.join("\n"), "utf8");
const mut = readFileSync(MUT, "utf8");
t("变异真的落到盘上：三条规则行删除数=3", removed === 3, `删了 ${removed} 行`);
t("变异体里三条规则确实没了", RULE_MARKS.every((m) => !new RegExp("^\\s*\\[.*" + m).test(mut)), "还剩");
t("变异体只动了这三条：老规则（verdict.txt / simulator-network.log / prestate / 私钥材料）都还活着",
  ["simulator-network", "prestate", "id_rsa", "PATH_RULES"].every((s) => mut.includes(s)), "老规则被误删");
const mutMod = await import(pathToFileURL(MUT).href);
t("④ 单元绑定：变异体对 B 的两份「新规则独有」载体不再命中（腿结果台账 / 腿帧图）",
  B_DEMO.every((p) => mutMod.checkPath(p, NEW).hit === false),
  JSON.stringify(B_DEMO.map((p) => mutMod.checkPath(p, NEW))));
t("④ 如实记录重叠：device-leg 目录下的 simulator-network.log 删了新规则后仍被**旧规则**命中（标签不是我那条）",
  (() => { const c = mutMod.checkPath(DEMO[1], NEW); return c.hit === true && !c.reason.includes("设备腿输出目录"); })(),
  JSON.stringify(mutMod.checkPath(DEMO[1], NEW)));
const mutB = runGate(MUT, "sidecar-mutated-b.json", scratchB);
t(`④ 变异体跑 B 的同一 scratch 索引（${B_DEMO.length} 份新引入）⇒ exit 0（货真价实的 green-but-should-be-red）`,
  mutB.exit === 0 && /paths=0 findings=0/.test(mutB.out), `exit=${mutB.exit} ${(mutB.out.match(/STAGEDSECRETS_RESULT=.*/) || ["(无机器行)"])[0]}`);
const mutA = runGate(MUT, "sidecar-mutated-a.json", scratch);
t(`④ 变异体跑全量演示索引（${DEMO.length} 份，硬 ${HARD_DEMO.length}）只剩 1 条旧规则重叠红，且 exec-results 与 png 都不再被点名`,
  mutA.exit === 1 && /paths=1 findings=1/.test(mutA.out) && !hitPathsOf(mutA).includes(DEMO[0]) && !hitPathsOf(mutA).includes(DEMO[2]),
  `exit=${mutA.exit} 点名=${hitPathsOf(mutA).join(", ")}`);
console.log(`LEGEX_MUTATION 数字：B=${B_DEMO.length} 份新引入：真门 paths=${B_DEMO.length} exit=${redB.exit} ⇒ 变异体 paths=0 exit=${mutB.exit}（红确实是这三条规则挣的）；A=${DEMO.length} 份（硬 ${HARD_DEMO.length}）：真门 exit=${red.exit} ⇒ 变异体 exit=${mutA.exit}（剩的 1 条来自旧 simulator-network.log 规则，不是我的三条）`);

/* ---------- 收尾：删掉变异体与 scratch；真索引再量一次 ---------- */
try { unlinkSync(MUT); } catch { }
rmSync(TMP, { recursive: true, force: true });
t("变异体已删除、scratch 已删除（不留死件给 carrier-wiring）", !existsSync(MUT) && !existsSync(TMP));
t("收尾后真实索引仍未动", realDiff() === before, `after2="${realDiff()}"`);

console.log(`LEGEX_SUMMARY checks=${checks} fail=${bad} 演示路径=${DEMO.length}`);
console.log(bad === 0 ? "LEGEX_TEST=PASS" : "LEGEX_TEST=FAIL");
process.exit(bad === 0 ? 0 : 1);
