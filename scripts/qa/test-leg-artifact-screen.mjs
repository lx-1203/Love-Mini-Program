#!/usr/bin/env node
/* 腿产物入库禁令的负例自检（2026-10-16 裁定：设备腿输出件一律不入库，且必须在仪器里 enforced）。
 * 测的是载具真正 import 的那一个 checkPath，不是重抄的一份正则。
 * 四段：
 *  ① 单元屏：三类新形状"新引入 ⇒ 硬红 / 基线已跟踪 ⇒ 软提示"，以及既有不变量（.env 家族与 prestate*.sql
 *     不看软硬一律硬红、.env.example 豁免、exec 目录里的兄弟件不许被误屏、device-leg 目录名吃掉 verdict.txt）。
 *  ② 真实 git 红：把三份**盘上真实存在的腿产物**用临时 GIT_INDEX_FILE（真实索引的副本）+ update-index
 *     --cacheinfo 塞进"假暂存集"，然后跑门本体 ⇒ 必须 exit 1 且逐条点名；一条判点也不许多。
 *     全程不碰 .git/index、不碰工作树、不 commit、不 add 到真索引。
 *  ③ 归因基线：**没加那三条**的 scratch 索引跑同一条门必须 exit 0 —— 这是"永久红的门等于没有门"的反证，
 *     也证明②的红是那三次 add 挣来的，不是门自己常年红。
 *  ⑤ 硬/软分界的 e2e：把 HEAD 里**已跟踪**的 82 份 exec-results.json 之一改到 scratch 索引 ⇒ 必须 exit 0
 *     且打 SOFT 行（撤库的 `git rm --cached` 同侧，不能被这道门挡死）。
 *  ④ 变异绑定：把门复制成 scripts/qa/.legex-mutated-gate.mjs 并**只**删掉三条腿产物规则（先 grep-back 证明
 *     删到了、且 verdict.txt/prestate 那些老规则还活着），拿同一份 scratch 索引跑这份副本 ⇒ 必须 exit 0
 *     且不点名那三条 ⇒ ②的红确实绑在这三条规则上（不是碰巧由内容屏/别的东西判的）。
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
const trackedExec = git(["ls-files", "--", "*exec-results.json"]).out.split(/\r?\n/).filter(Boolean).length;
const trackedDeviceLeg = git(["ls-files", "--", "reports/audit"]).out.split(/\r?\n/).filter((p) => p.includes("device-leg-")).length;
console.log(`NOTE 库内既有载体：exec-results.json 已跟踪=${trackedExec}（改它们判软提示，不判红）；reports/audit 下 device-leg-* 已跟踪=${trackedDeviceLeg}（0 ⇒ 今天任何一次 add 都是新引入=硬红）`);

/* 演示用的三份都是盘上真实存在的腿产物；内容用一枚无害合成 blob 顶掉，
   这样②的红**只能**来自路径屏（内容屏一条也判不到）。 */
const DEMO = [
  "reports/audit/round-7/exec-v38-devicleg/exec-results.json",
  "reports/audit/device-leg-real-2026-10-15-19-18-34/simulator-network.log",
  "reports/audit/round-7/exec-guest-real-guard-r10/subpackages-campus-campus-index.png",
];
for (const p of DEMO) t(`演示件在盘上真实存在：${p}`, existsSync(join(REPO, p)));
const benign = join(TMP, "benign.json");
writeFileSync(benign, JSON.stringify({ results: [] }, null, 1) + "\n", "utf8");
const SHA = git(["hash-object", "-w", "--", benign]).out;   // 只多一个游离 loose object
t("合成 blob 造出来了（内容无票形，红只能来自路径屏）", /^[0-9a-f]{40}$/.test(SHA), SHA);

function stageInto(idx, paths) {
  for (const p of paths) git(["update-index", "--add", "--cacheinfo", `100644,${SHA},${p}`], { GIT_INDEX_FILE: idx });
}
/* 两份 scratch 索引：A(scratch) 装全部三份演示载体；B(scratchB) 只装"只有新规则才屏得住"的两份。
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
const base = runGate(GATE, "sidecar-baseline.json", scratch);   // ③ 先跑：scratch=真索引副本，没塞东西
stageInto(scratch, DEMO);
stageInto(scratchB, [DEMO[0], DEMO[2]]);                        // 只塞"新规则独有"的两份
const red = runGate(GATE, "sidecar-red.json", scratch);
const redB = runGate(GATE, "sidecar-red-b.json", scratchB);
const redSide = readSide(red.side);
const redText = red.out;

t("③ 归因基线：同一 scratch 索引、没塞腿产物时门必须 exit 0（否则就是永久红）", base.exit === 0, `exit=${base.exit} ${base.out.slice(-160)}`);
t("② 塞进三份腿产物后门 exit 1", red.exit === 1, `exit=${red.exit} ${redText.slice(-200)}`);
for (const p of DEMO) t(`② 红线逐条点名：${p}`, redText.includes("HIT " + p), redText.split(/\r?\n/).filter((l) => l.startsWith("HIT")).slice(0, 5).join(" | "));
t("② 机器行 paths=3 findings=3（只有路径屏，没有别的东西混进来）",
  /STAGEDSECRETS_RESULT=FAIL paths=3 findings=3/.test(redText), (redText.match(/STAGEDSECRETS_RESULT=.*/) || ["(无机器行)"])[0]);
t("② 侧车 3 条判点全是 kind=path", !!redSide && redSide.hits.length === 3 && redSide.hits.every((h) => h.kind === "path"),
  redSide ? JSON.stringify(redSide.hits.map((h) => [h.kind, h.path.split("/").pop()])) : "侧车读不到");
t("② 侧车不落地任何票/原文（掩码纪律：path 判点的 masked 必为空）", !!redSide && redSide.hits.every((h) => !h.masked), "masked 非空");
t("②' 只塞两份「新规则独有」载体（exec-results.json + png）也 exit 1 且 paths=2",
  redB.exit === 1 && /paths=2 findings=2/.test(redB.out), (redB.out.match(/STAGEDSECRETS_RESULT=.*/) || ["(无机器行)"])[0]);

/* ---------- ⑤ 硬/软分界的 e2e：改动**已跟踪**的腿台账必须走软提示、门仍 exit 0 ---------- */
const TRACKED_LEG = "reports/audit/round-7/exec-A-login-r8/exec-results.json";
t("⑤ 前提：这份台账确实已被 HEAD 跟踪（= 软提示那一侧的真实形状，82 份里的一份）",
  git(["cat-file", "-e", `HEAD:./${TRACKED_LEG}`], {}, true).ok, TRACKED_LEG);
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
t("④ 单元绑定：变异体对两份「新规则独有」载体不再命中（腿结果台账 / 腿帧图）",
  [DEMO[0], DEMO[2]].every((p) => mutMod.checkPath(p, NEW).hit === false),
  JSON.stringify([DEMO[0], DEMO[2]].map((p) => mutMod.checkPath(p, NEW))));
t("④ 如实记录重叠：device-leg 目录下的 simulator-network.log 删了新规则后仍被**旧规则**命中（标签不是我那条）",
  (() => { const c = mutMod.checkPath(DEMO[1], NEW); return c.hit === true && !c.reason.includes("设备腿输出目录"); })(),
  JSON.stringify(mutMod.checkPath(DEMO[1], NEW)));
const mutB = runGate(MUT, "sidecar-mutated-b.json", scratchB);
t("④ 变异体跑「两份独有」的同一 scratch 索引 ⇒ exit 0（货真价实的 green-but-should-be-red）",
  mutB.exit === 0 && /paths=0 findings=0/.test(mutB.out), `exit=${mutB.exit} ${(mutB.out.match(/STAGEDSECRETS_RESULT=.*/) || ["(无机器行)"])[0]}`);
const mutA = runGate(MUT, "sidecar-mutated-a.json", scratch);
t("④ 变异体跑全三份索引只剩 1 条旧规则重叠红，且 exec-results 与 png 都不再被点名",
  mutA.exit === 1 && /paths=1 findings=1/.test(mutA.out) && !hitPathsOf(mutA).includes(DEMO[0]) && !hitPathsOf(mutA).includes(DEMO[2]),
  `exit=${mutA.exit} 点名=${hitPathsOf(mutA).join(", ")}`);
console.log(`LEGEX_MUTATION 数字：独有两份 B：真门 paths=2 exit=${redB.exit} ⇒ 变异体 paths=0 exit=${mutB.exit}（红确实是这三条规则挣的）；全三份 A：真门 exit=${red.exit} ⇒ 变异体 exit=${mutA.exit}（剩的 1 条来自旧 simulator-network.log 规则，不是我的三条）`);

/* ---------- 收尾：删掉变异体与 scratch；真索引再量一次 ---------- */
try { unlinkSync(MUT); } catch { }
rmSync(TMP, { recursive: true, force: true });
t("变异体已删除、scratch 已删除（不留死件给 carrier-wiring）", !existsSync(MUT) && !existsSync(TMP));
t("收尾后真实索引仍未动", realDiff() === before, `after2="${realDiff()}"`);

console.log(`LEGEX_SUMMARY checks=${checks} fail=${bad} 演示路径=${DEMO.length}`);
console.log(bad === 0 ? "LEGEX_TEST=PASS" : "LEGEX_TEST=FAIL");
process.exit(bad === 0 ? 0 : 1);
