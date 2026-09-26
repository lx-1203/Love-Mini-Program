#!/usr/bin/env node
/**
 * round-N 轮末验收报告生成器（emit-round-report）。
 *
 * 为什么存在（一次会话内踩过四次的同一类错）：编排层在凌晨凭记忆写终报，于是
 *  - 数字来自一条静默 0 命中的正则（"gate 绿了"其实什么都没扫到）；
 *  - 门输出字段名被凭空改写（读者按不存在的键去读）；
 *  - 管道退出码被读成子进程的退出码；
 *  - 两个不同被测物的行被合成一个通过率。
 * 本工具的唯一设计约束就是这些：报告里**每一个数字**都必须在运行时从一个具名文件或一个
 * 由本工具启动的子进程里取出。取不到就写"取不到"并把退出码置非零，绝不回落到"看起来合理"的数。
 *
 * 沿用 .zcode/tmp/emit-gates.cjs 的既有门约定：
 *  - 门输出是 `KEY=value` 行；解析前剥掉以 `#` 开头的取证头注释、正则在行首锚定
 *    （g7-verify.txt 表头里写着 "on v16 this script self-reports G7_RESULT=FAIL"，未锚定会把 G7 读成 FAIL）；
 *  - execFileSync + 参数数组，**不经 cmd.exe**（% 会被 cmd 当变量展开，吐出一条"看起来对"的空结果）；
 *  - 门退出码非零是**数据**，不是崩溃：记下退出码与解析到的计数，继续出报告；
 *  - 需要新版 node 的被调件（G7 = apps/client/scripts/build-real-isolated.mjs，实测 v16 上自报假 FAIL）
 *    走显式 node22 绝对路径；scripts/qa/ 下的门禁件实测 v16 可跑，就用启动本工具的 node 跑，
 *    并在溯源表里记下用的是哪个解释器。
 *
 * 用法：node scripts/qa/emit-round-report.mjs [flags]
 *   --round-dir <dir>          默认 reports/audit/round-6
 *   --exec-results <file>      默认 <round-dir>/interact/exec-results.json
 *   --snapshot <file>          默认在 .zcode/tmp/round6-exec/ 找唯一 exec-results.snapshot-*.json
 *   --checkpoint <file>        默认 tmp/qa/checkpoints/exec-R<n>.json（按轮次名派生）
 *   --manifest-detail <file>   默认 reports/screenshots/round-6-tour/manifest-detail.json
 *   --screenshot-manifest <f>  默认 <round-dir>/screenshot-manifest.json
 *   --report <file>            默认 <round-dir>/round-6-report.md
 *   --metrics <file>           默认 <round-dir>/round-6-metrics.json
 *   --sidecar-dir <dir>        分诊台 --out 落点（reports/ 之外），默认 .zcode/tmp/report-emitter
 *   --node22 <path>            默认 D:/codex-tools/node-v22.17.0-win-x64/node.exe
 *   --skip-live-gates          不复跑 G7/G8/G9/probe；记为一条 FAIL，不出绿报告
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const relPosix = (p) => String(p).split(sep).join("/");
/** 交给子进程的路径参数走它：Windows 的 join() 会生出反斜杠，溯源表里的命令行就必须能原样复现。 */
const pj = (...a) => relPosix(join(...a)); // 传给子进程的路径参数一律正斜杠：溯源表里的命令行必须能原样复现
const toRel = (p) => {
  const r = relPosix(relative(ROOT, resolve(ROOT, String(p))));
  return r.startsWith("/") || r.startsWith("..") ? relPosix(p) : r;
};
const sha8 = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 8);

/* ------------------------------------------------------------------ argv */
const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const has = (n) => argv.includes(`--${n}`);

const ROUND_DIR = toRel(flag("round-dir", "reports/audit/round-6"));
const EXEC = toRel(flag("exec-results", join(ROUND_DIR, "interact", "exec-results.json")));
const MANIFEST_DETAIL = toRel(flag("manifest-detail", "reports/screenshots/round-6-tour/manifest-detail.json"));
const SCREEN_MANIFEST = toRel(flag("screenshot-manifest", join(ROUND_DIR, "screenshot-manifest.json")));
const REAL_DIR = toRel(flag("real-dir", "reports/audit/real-e2e"));
const LEDGER_MD = toRel(flag("ledger", ".zcode/tmp/round6-LEDGER.md"));
const OPS_DIR = pj(ROUND_DIR, "ops");
const OUT_REPORT = toRel(flag("report", join(ROUND_DIR, "round-6-report.md")));
const OUT_METRICS = toRel(flag("metrics", join(ROUND_DIR, "round-6-metrics.json")));
const SIDE_DIR = toRel(flag("sidecar-dir", ".zcode/tmp/report-emitter"));
const NODE22 = flag("node22", "D:/codex-tools/node-v22.17.0-win-x64/node.exe");
const SKIP_LIVE = has("skip-live-gates");

function readJsonOrNull(p) { try { return JSON.parse(readFileSync(resolve(ROOT, p), "utf8")); } catch { return null; } }

/* 冻结快照：文件名里带的是权威件 sha16，写死就等于"边界凭空发明"，所以按目录唯一命中派生。 */
function locateSnapshot() {
  const one = flag("snapshot");
  if (one) return { path: toRel(one), how: "--snapshot 入参" };
  const dir = ".zcode/tmp/round6-exec";
  try {
    const hits = readdirSync(resolve(ROOT, dir)).filter((f) => /^exec-results\.snapshot-[0-9a-f]+\.json$/.test(f)).sort();
    if (hits.length === 1) return { path: `${dir}/${hits[0]}`, how: `${dir}/ 唯一命中 exec-results.snapshot-*.json` };
    return { path: null, how: hits.length ? `${dir}/ 命中 ${hits.length} 份，无法唯一定位（需 --snapshot）` : `${dir}/ 零命中` };
  } catch (e) { return { path: null, how: `${dir}/ 不可读 ${String(e.message).slice(0, 60)}` }; }
}
const SNAP = locateSnapshot();
const ROUND_NO = (ROUND_DIR.match(/round-(\d+)/) || [])[1] || String(readJsonOrNull(EXEC)?.round || "").replace(/^R/i, "") || "N";

/* ------------------------------------------------ 溯源 / 失败 / 未判定登记 */
const PROV = { files: [], cmds: [], notes: [] };
const ERRORS = [];
const OPEN = [];
const CONSERVE = [];
const seenFile = new Set();
const seenCmd = new Set();

function registerFile(p, text, st) {
  const key = relPosix(resolve(ROOT, p)) + ":" + sha8(text);
  if (seenFile.has(key)) return;
  seenFile.add(key);
  PROV.files.push({ path: toRel(p), mtime: new Date(st.mtimeMs).toISOString(), size: st.size, sha8: sha8(text) });
}
/** 读一次、哈希一次：执行轮正在往权威件里追加，哈希必须是"我解析的那一份字节"。 */
function readSrc(p, { optional = false, label = "" } = {}) {
  const abs = resolve(ROOT, p);
  if (!existsSync(abs)) {
    const msg = `源文件不存在：${p}${label ? `（${label}）` : ""}`;
    if (optional) { OPEN.push({ item: msg, why: "可选源缺失，相关小节按『取不到』记" }); return null; }
    ERRORS.push(msg);
    return null;
  }
  const st = statSync(abs);
  let text;
  try { text = readFileSync(abs, "utf8"); } catch (e) {
    ERRORS.push(`源文件读不出：${p} —— ${String(e.message).slice(0, 80)}`);
    return null;
  }
  registerFile(p, text, st);
  return { path: toRel(p), text, json: null, size: st.size, mtime: new Date(st.mtimeMs).toISOString(), sha8: sha8(text) };
}
function readJsonSrc(p, opt) {
  const s = readSrc(p, opt);
  if (!s) return null;
  try { s.json = JSON.parse(s.text); } catch (e) {
    const msg = `${s.path} JSON 解析失败：${String(e.message).slice(0, 90)}`;
    if (opt && opt.optional) OPEN.push({ item: msg, why: "可选源不可解析" });
    else ERRORS.push(msg);
    return null;
  }
  return s;
}
function dirSrc(p, label) {
  const abs = resolve(ROOT, p);
  if (!existsSync(abs)) { ERRORS.push(`目录不存在：${p}（${label}）`); return null; }
  let names;
  try { names = readdirSync(abs); } catch (e) { ERRORS.push(`目录读不出：${p} —— ${String(e.message).slice(0, 60)}`); return null; }
  const key = relPosix(abs) + ":dir:" + names.length;
  if (!seenFile.has(key)) {
    seenFile.add(key);
    PROV.files.push({ path: toRel(p) + "/", mtime: `(目录：登记条目数 ${names.length}，无单文件语义)`, size: names.length, sha8: sha8(names.slice().sort().join("\n")) });
  }
  return { path: toRel(p), names };
}

const srcFile = (file, field) => `(源: ${file} → ${field})`;
const srcCmd = (cmd, key) => `(源: ${cmd} → ${key}=)`;
const sg = (rec, key) => (rec && rec.cmd ? srcCmd(rec.cmd, key) : `(源: 取不到 → ${key}=)`);

/* --------------------------------------------------------- 子进程边界 */
const verCache = new Map();
function nodeVersionOf(bin) {
  if (verCache.has(bin)) return verCache.get(bin);
  let v = "读不到版本";
  try { v = execFileSync(bin, ["-v"], { encoding: "utf8", windowsHide: true, timeout: 30000 }).trim(); } catch { /* 保留哨兵 */ }
  verCache.set(bin, v);
  return v;
}
function runGate(name, file, args, { timeoutMs = 240000, needNode22 = false } = {}) {
  const bin = needNode22 ? NODE22 : process.execPath;
  const cmdLine = `${relPosix(bin)} ${file} ${args.join(" ")}`.trim();
  let code = null, out = "", errtxt = "", note = "", timedOut = false;
  try {
    out = execFileSync(bin, [file, ...args], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26, timeout: timeoutMs, windowsHide: true, killSignal: "SIGTERM" });
    code = 0;
  } catch (e) {
    out = typeof e.stdout === "string" ? e.stdout : "";
    errtxt = typeof e.stderr === "string" ? e.stderr : String(e.stderr || e.message || "");
    if (typeof e.status === "number") code = e.status; // 门自己非零退出 = 数据
    else {
      code = null;
      timedOut = /ETIMEDOUT|timed out/i.test(String(e.message || "")) || e.signal === "SIGTERM";
      note = `未取得退出码（${e.signal || e.code || String(e.message).slice(0, 60)}）`;
    }
  }
  if (!seenCmd.has(cmdLine)) {
    seenCmd.add(cmdLine);
    PROV.cmds.push({ name, cmd: cmdLine, exitCode: code, stdoutBytes: Buffer.byteLength(out), sha8: sha8(out || ""), note, runner: `${relPosix(bin)} ${nodeVersionOf(bin)}` });
  }
  if (timedOut) ERRORS.push(`${name} 超时被杀（${timeoutMs}ms），下面是部分输出（前 200 字）：${out.slice(0, 200).replace(/\n/g, " ⏎ ")}`);
  else if (code === null) ERRORS.push(`${name} 无法判读退出码：${note}；stderr=${errtxt.slice(0, 200)}`);
  const body = out.split("\n").filter((l) => !l.startsWith("#")).join("\n"); // 剥取证头注释，防"在自己输出上的说明文字里撞上判据"
  /**
   * KEY=value 取值：先按**行首**锚定（防撞上说明文字），再退一步允许"行内但前面是空格"的
   * 同族键（实测：`QUEUE_PLANNED_SUITES=24 QUEUE_PLANNED_CASES=1107`、
   * `G9_PROBED=455 G9_OK=455 …` 一行多键）。两种形态都要求 KEY 是完整 token
   * （行首或前置空格 + 紧跟 `=`），绝不裸 substring 命中 —— 那正是把 0 命中的正则读成绿的入口。
   */
  const kv = (k) => {
    let m = body.match(new RegExp("^" + k + "=(.*)$", "m"));
    if (m) return m[1].trim();
    m = body.match(new RegExp("(?:^| )" + k + "=([^\\s]*)", "m"));
    return m ? m[1].trim() : null;
  };
  const num = (k) => { const v = kv(k); if (v === null) return null; const m = v.match(/-?\d+/); return m ? Number(m[0]) : null; };
  /** 单 token 取值：同一行多键时（`A=1 B=2`）只取 B 的值，绝不把后半行一起端进报告。 */
  const tok = (k) => {
    let m = body.match(new RegExp("(?:^| )" + k + "=(\\S+)", "m"));
    return m ? m[1] : null;
  };
  const tonum = (k) => { const v = tok(k); if (v === null) return null; const m = v.match(/^-?\d+$/); return m ? Number(v) : (v.match(/-?\d+/) ? Number(v.match(/-?\d+/)[0]) : null); };
  const re = (r) => { const m = body.match(r); return m ? m[1] : null; };
  return { name, cmd: cmdLine, exitCode: code, stdout: out, body, stderr: errtxt, note, timedOut, kv, num, tok, tonum, re,
    sha8: sha8(out || ""), stdoutBytes: Buffer.byteLength(out) };
}
function runCmd(label, bin, args) {
  let code = null, out = "", errtxt = "";
  try { out = execFileSync(bin, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24, timeout: 120000, windowsHide: true }); code = 0; }
  catch (e) { out = typeof e.stdout === "string" ? e.stdout : ""; errtxt = String(e.stderr || e.message || ""); code = typeof e.status === "number" ? e.status : null; }
  const cmd = `${bin} ${args.join(" ")}`;
  if (!seenCmd.has(cmd)) { seenCmd.add(cmd); PROV.cmds.push({ name: label, cmd, exitCode: code, stdoutBytes: Buffer.byteLength(out), sha8: sha8(out), note: "", runner: bin }); }
  if (code !== 0) ERRORS.push(`${label} 非零退出（code=${code}）：${errtxt.slice(0, 140)}`);
  return { label, cmd, exitCode: code, out };
}

/* --------------------------------------------- 两条硬纪律：守恒 / 空集 */
function conserve(what, parts, whole) {
  const sum = parts.some((p) => p === null || p === undefined || Number.isNaN(p)) ? null : parts.reduce((a, b) => a + b, 0);
  const ok = sum !== null && whole !== null && whole !== undefined && sum === whole;
  if (!ok) ERRORS.push(`不守恒：${what} —— ${parts.join("+")}=${sum} ≠ 全体 ${whole}（有数被重复计或漏计，报告不得收尾）`);
  CONSERVE.push({ what, parts, sum, whole, ok });
  return `CONSERVED ${ok ? "✔" : "✘"} ${what}: ${parts.join(" + ")} = ${sum} vs 全体 ${whole}`;
}
function nonEmpty(what, n, whySuspicious) {
  if (typeof n !== "number" || Number.isNaN(n)) { ERRORS.push(`${what} 取不到数（是"没读到"，不是 0）：${whySuspicious}`); return false; }
  if (n === 0) { ERRORS.push(`空集判红：${what} = 0 —— ${whySuspicious}`); return false; }
  return true;
}

/* ============================================================== 前置体检 */
const T0 = new Date();
const EXEC_SRC = readJsonSrc(EXEC, { label: "执行轮权威件" });
const SNAP_SRC = SNAP.path ? readJsonSrc(SNAP.path, { label: `重建边界快照（${SNAP.how}）` })
  : (ERRORS.push(`冻结快照无法定位：${SNAP.how} —— 没有它就没有"两个被测物"的分界，只能记为取不到`), null);
const CKPT_PATH = toRel(flag("checkpoint", join("tmp/qa/checkpoints", "exec-R" + ROUND_NO + ".json")));
const CKPT_SRC = readJsonSrc(CKPT_PATH, { label: "执行检查点" });
const MD_SRC = readJsonSrc(MANIFEST_DETAIL, { label: "巡检 manifest" });
const SM_SRC = readJsonSrc(SCREEN_MANIFEST, { label: "巡检汇总 manifest" });
const GATES_SRC = readJsonSrc(join(REAL_DIR, "GATES.json"), { optional: true, label: "真实模式载体" });
const LEDGER_SRC = readSrc(LEDGER_MD, { optional: true, label: "台账基线（只供『跑前就红』这句叙事）" });
const OPS_SRC = dirSrc(OPS_DIR, "计划清单");
const REXEC_SRC = readSrc("scripts/qa/r-exec.cjs", { optional: true, label: "upsert 主键判据的行号来源" });

const execRows = EXEC_SRC && Array.isArray(EXEC_SRC.json.results) ? EXEC_SRC.json.results : null;
const snapRows = SNAP_SRC && Array.isArray(SNAP_SRC.json.results) ? SNAP_SRC.json.results : null;
if (execRows) nonEmpty("EXEC 权威件行数 results[]", execRows.length, "0 行意味着执行轮一条都没记，任何通过率都是凭空造的");
else ERRORS.push(`EXEC 权威件没有 results[] 数组（顶层键：${EXEC_SRC ? Object.keys(EXEC_SRC.json).join(",") : "读不到"}）—— 不猜行号，直接判红`);
if (snapRows) nonEmpty("冻结快照行数 results[]", snapRows.length, "快照为空则两侧边界无从派生，禁止把在盘全部行当成同一个被测物");
const plannedManifests = OPS_SRC ? OPS_SRC.names.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")) : null;
if (plannedManifests) nonEmpty("计划清单 ops/*.json 份数", plannedManifests.length, "0 份 ops → 对账没有分母，GAP 会被算成 0");
if (CKPT_SRC) nonEmpty("检查点 suites 数", Object.keys(CKPT_SRC.json.suites || {}).length, "检查点若无任何 suite，『完成/半途中断』两个计数都是凭空来的");
if (MD_SRC) {
  nonEmpty("巡检 shots 数", Array.isArray(MD_SRC.json.shots) ? MD_SRC.json.shots.length : null, "0 帧 = 巡检什么都没截到，MATCHED/DUP_STATE 之类的『全绿』全部无意义");
  nonEmpty("巡检 zoomFrames 数", Array.isArray(MD_SRC.json.zoomFrames) ? MD_SRC.json.zoomFrames.length : null, "0 张放大辅助帧通常是字段名改了，不是真没截");
}
/* upsert 判据所在行：从 r-exec.cjs 原文里数出来，不写死 465 */
let upsertLine = null;
if (REXEC_SRC) {
  const ls = REXEC_SRC.text.split(/\r?\n/);
  const i = ls.findIndex((l) => l.includes("findIndex") && l.includes("x.suite") && l.includes("x.manifest") && l.includes("x.id"));
  if (i >= 0) upsertLine = i + 1;
}

/* 体检失败就**立刻**收工：不启动任何子进程（既省时间，也避免在输入坏掉时还去写库/写盘），
 * 但报告与 metrics 仍落盘——"缺哪个源、为什么可疑"必须留下字面记录。 */
if (ERRORS.length) {
  const short_ = [
    `# round-${ROUND_NO} 轮末验收报告（**未生成完毕：必需源体检失败**）`, "",
    `- 生成器 \`scripts/qa/emit-round-report.mjs\` 启动于 ${T0.toISOString()}；本报告不含任何统计结论，只含失败事实。`,
    `- 因体检未过，**未启动任何门禁子进程**（避免在坏输入上产生副作用或留下"看起来完整"的报告）。`, "",
    "## 0. 溯源表（已读到的部分）", "",
    "| 文件 | mtime (UTC) | 字节 | sha256 前 8 |", "|---|---|---|---|",
    ...PROV.files.map((f) => `| \`${f.path}\` | ${f.mtime} | ${f.size} | \`${f.sha8}\` |`), "",
    "## 体检失败清单", "", ...ERRORS.map((e, i) => `${i + 1}. ${e}`), "",
    "## 未判定 / 缺口", "", ...OPEN.map((o) => `- ${o.item} —— ${o.why}`), "",
  ];
  mkdirSync(dirname(resolve(ROOT, OUT_REPORT)), { recursive: true });
  writeFileSync(resolve(ROOT, OUT_REPORT), short_.join("\n") + "\n", "utf8");
  writeFileSync(resolve(ROOT, OUT_METRICS), JSON.stringify({ schemaVersion: "round-report-metrics-1", generatedAt: new Date().toISOString(), preflightAbort: true, failures: ERRORS, openItems: OPEN, provenance: { files: PROV.files, commands: PROV.cmds } }, null, 2) + "\n", "utf8");
  console.log(`REPORT_WRITTEN=${OUT_REPORT} lines=${short_.length}（体检失败版）`);
  console.log(`METRICS_WRITTEN=${OUT_METRICS}`);
  console.log(`EMIT_RESULT=FAIL 必需源体检失败 ${ERRORS.length} 条，未启动任何门禁：`);
  for (const e of ERRORS) console.log("  ! " + e);
  process.exit(1);
}

/* ============================================ 门：一次跑完，多处引用 */
const G = {};
const TRIAGE_BASE = pj(SIDE_DIR, "triage-r6-at-report");
G.restarted = runGate("verify-backend-restarted", "scripts/qa/verify-backend-restarted.mjs", ["--port", "8080"], { timeoutMs: 180000 });
G.head = runCmd("git HEAD", "git", ["rev-parse", "--short", "HEAD"]);
G.dirty = runCmd("git worktree 脏项", "git", ["status", "--porcelain"]);
G.dirtyApps = runCmd("git worktree 脏项(apps/)", "git", ["status", "--porcelain", "--", "apps/"]);
G.queue = runGate("verify-queue-reconcile", "scripts/verify-queue-reconcile.mjs", [ROUND_DIR], { timeoutMs: 300000 });
G.triage = runGate("triage-exec-failures", "scripts/qa/triage-exec-failures.mjs", ["--results", EXEC, "--out", TRIAGE_BASE], { timeoutMs: 900000 });
G.readj = runGate("readjudicate-evidence", "scripts/qa/readjudicate-evidence.mjs", [EXEC, "--ops", OPS_DIR, "--no-lines", "--samples", "1"], { timeoutMs: 300000 });
G.stateTruth = runGate("verify-state-truth", "scripts/qa/verify-state-truth.mjs", [ROUND_DIR], { timeoutMs: 180000 });
G.ledger = runGate("verify-ledger", "scripts/qa/verify-ledger.mjs", [ROUND_DIR], { timeoutMs: 600000 });
G.integrity = runGate("verify-evidence-integrity（权威索引=本轮全部 corpus）", "scripts/verify-evidence-integrity.mjs", [SCREEN_MANIFEST, "--dir", dirname(MANIFEST_DETAIL), "--exec", EXEC], { timeoutMs: 600000 });
G.corpus = runGate("verify-evidence-corpus（全域）", "scripts/qa/verify-evidence-corpus.mjs", [], { timeoutMs: 600000 });
G.provenance = runGate("verify-provenance-all（全域）", "scripts/qa/verify-provenance-all.mjs", [], { timeoutMs: 600000 });
/* 证据面必须同时出两个口径，缺一即失真：
     全域 = "历史证据能不能拿来复用" —— 实测答案是不能（round-1/2 的 gitSha 已过期、
            reports/screenshots/round-1/manifest.json 干脆没有 gitSha、144 帧无日期戳），
            它每次都红，红得正确，但**不代表本轮产物有问题**；
     本轮 scope = "本轮自己的证据健不健康" —— 这才是应当否决收尾的那一把。
   只跑全域：本轮永远红在别人的历史上，于是没人再看它（判据退化成告警）；
   只跑 scope：历史被无声抹掉，下一轮又去复用过期证据。所以两把都跑、都在报告里点名，
   但 gatePanel（决定"本次仍判红 N/M"的那组）只收 scope 版，全域版进 J 节作历史记录。 */
const RESHOOT_MANIFEST = "reports/screenshots/round-6-tour-reshoot/manifest-detail.json";
/* scope 必须动态收集**本轮名下的所有 corpus**，不能手写两个目录：
   round-6 之后又长出了 tour-chat / tour-dupfix / real-tour 三个 corpus，
   写死列表 = 新拍的帧悄悄落在 corpus/provenance 两把门的扫描集之外
   （这正是本轮反复修的"扫描集静默变小却照样判绿"）。
   规则：reports/screenshots 下名字以本轮号开头的目录都算，但 `*-smoke` 排除 ——
   冒烟 corpus 是被丢弃的一次性产物，让它进判据会把"试过"写成"验过"。 */
const roundCorpusDirs = (() => {
  const base = join(ROOT, "reports", "screenshots");
  let names = [];
  try { names = readdirSync(base); } catch { return []; }
  return names.filter((n) => n.startsWith("round-" + ROUND_NO) && !n.endsWith("-smoke"))
    .map((n) => "reports/screenshots/" + n);
})();
const EVIDENCE_SCOPE = [ROUND_DIR, ...roundCorpusDirs].join(",");
G.corpusScoped = runGate("verify-evidence-corpus（本轮 scope）", "scripts/qa/verify-evidence-corpus.mjs", ["--scope", EVIDENCE_SCOPE], { timeoutMs: 600000 });
G.provenanceScoped = runGate("verify-provenance-all（本轮 scope）", "scripts/qa/verify-provenance-all.mjs", ["--scope", EVIDENCE_SCOPE], { timeoutMs: 600000 });
/* 原始 corpus 逐个量一遍（**信息轴，不否决收尾**）。
   为什么不再是否决轴：本轮把「同页同身份却同字节」的帧按现行采集规则从 shots[] 改判进
   stateNotApplied[]，承接者是权威索引 `reports/audit/<round>/screenshot-manifest.json`（否决轴那条）。
   原始 corpus 是采集时刻的原始记录，不改它、也不拿它的旧数去否定新帧 ——
   但如果这里**根本不跑**，"同字节事实一条没少"就没人看得见，所以逐 corpus 照打数字。
   旧规则只量重拍 corpus 一个目录，等于默认"新 corpus 一定存在"；本轮名下一共长出 5 个 corpus，
   写死一个 = 另外四个落在扫描集之外（本轮反复修的同一类静默缩集）。 */
G.integrityRawList = roundCorpusDirs
  .map((d) => ({ dir: d, man: d + "/manifest-detail.json" }))
  .filter((x) => existsSync(join(ROOT, x.man)))
  .map((x) => runGate("verify-evidence-integrity（原始 corpus：" + x.dir.split("/").pop() + "，信息轴）",
    "scripts/verify-evidence-integrity.mjs", [x.man, "--dir", x.dir], { timeoutMs: 600000 }));
/* i18n 门禁（只读）：本轮的 i18n 收口此前只有一次人工审计，证据落在被 gitignore 的 .zcode/tmp 里，
   不可重跑也不会有人复核 —— 接进报告门禁，让它变成每轮都跑的检查。
   配对差异一律判红；孤儿键走棘轮（基线与理由见该文件顶部注释与台账 §74）。 */
G.i18n = runGate("verify-i18n-orphan", "scripts/qa/verify-i18n-orphan.mjs", [], { timeoutMs: 300000 });
if (!SKIP_LIVE) {
  // G7 必须 node22：实测 PATH 上的 v16 让它自报 G7_RESULT=FAIL（环境噪声，不是产品缺陷）
  G.g7 = runGate("G7 产物自证", "apps/client/scripts/build-real-isolated.mjs", ["--check-only"], { timeoutMs: 600000, needNode22: true });
  G.g8 = runGate("G8 十环", "scripts/qa/g8-e2e.cjs", [], { timeoutMs: 600000 });
  G.g9 = runGate("G9 素材探针", "scripts/qa/g9-probe.cjs", [], { timeoutMs: 600000 });
  G.probe = runGate("probe-real-env", "scripts/probe-real-env.mjs", [], { timeoutMs: 300000 });
} else {
  ERRORS.push("--skip-live-gates 生效：G7/G8/G9/probe 未复跑 —— 本报告不得宣称『真实模式当前结论』，按缺证据处理");
  OPEN.push({ item: "G7/G8/G9/probe 当前结论", why: "--skip-live-gates，未复跑" });
}

/* ================================================================ 报告体 */
const L = [];
const M = { sources: {} }; // 派生数字的机器可读副本，落盘时由 metricsDoc() 组装
const P = (...s) => L.push(...s);
const statusOf = (rows) => {
  const o = { EXECUTED: 0, FAILED: 0, SKIPPED: 0 };
  let other = 0; const otherBy = {};
  for (const r of rows) { if (o[r.status] !== undefined) o[r.status]++; else { other++; const k = String(r.status ?? "(空)"); otherBy[k] = (otherBy[k] || 0) + 1; } }
  return { ...o, other, otherBy };
};
const keyOf = (r) => [r.suite, r.manifest, r.id].join("|");
const n = (v) => (v === null || v === undefined ? "?" : v);

P("# round-" + ROUND_NO + " 轮末验收报告（全部数字运行时派生，零手写统计）", "");
P(`- 生成器：\`scripts/qa/emit-round-report.mjs\`（启动于 ${T0.toISOString()}，node ${process.version}，\`${relPosix(process.execPath)}\`）`);
P(`- 轮次目录 \`${ROUND_DIR}\` · 权威件 \`${EXEC}\` · 冻结快照 \`${SNAP.path || "定位失败：" + SNAP.how}\``);
P("");
P("## 0. 溯源表（本报告引用的每一个输入；缺此表即不可复核）");
P("");
P("| 文件 | mtime (UTC) | 字节 | sha256 前 8 |");
P("|---|---|---|---|");
for (const f of PROV.files.slice().sort((a, b) => String(a.path).localeCompare(String(b.path)))) P(`| \`${f.path}\` | ${f.mtime} | ${f.size} | \`${f.sha8}\` |`);
P("");
P("| 子进程（命令行原样，cwd=仓库根） | 解释器 | 退出码 | stdout 字节 | sha256(stdout) 前 8 | 备注 |");
P("|---|---|---|---|---|---|");
for (const c of PROV.cmds) P(`| \`${c.cmd}\` | ${c.runner || "-"} | ${c.exitCode === null ? "无码" : c.exitCode} | ${c.stdoutBytes} | \`${c.sha8}\` | ${c.note || ""} |`);
P("");
for (const x of PROV.notes) P(`> ${x}`);
P("> **并发写入声明**：权威件在执行轮结束前持续被追加。本工具对每个文件**读一次、哈希一次**，上表 sha 就是被我解析的那一份字节；"
  + "被调门（分诊台/改判台/完整性门）按各自启动时刻**重读同一文件**，故它们的行数与我这份可差几条——差值在对应小节逐处标出，不取齐、不四舍五入。");
P("");

/* ---------- A ---------- */
const HEAD = (G.head.out || "").trim() || null;
if (!HEAD) ERRORS.push("HEAD 取不到（git rev-parse 无输出）—— 报告里任何『本轮构建』字样都不得出现");
const porcelain = (G.dirty.out || "").split("\n").filter((x) => x.trim()).length;
const porcelainApps = (G.dirtyApps.out || "").split("\n").filter((x) => x.trim()).length;
const jvmPid = G.restarted.tok("RESTARTED_PID");
const jvmStartedAt = (G.restarted.body.match(/^RESTARTED_PID=\S+ startedAt="([^"]*)"/m) || [])[1] || null;
const restartedVerdict = G.restarted.kv("RESTARTED_RESULT");

P("## A. 轮次身份");
P("");
P(`- HEAD：\`${n(HEAD)}\` ${sg(G.head, "stdout")}`);
P(`- 工作树脏项：全仓 ${porcelain} 项 ${sg(G.dirty, "行数")}；其中 \`apps/\` 下 ${porcelainApps} 项 ${sg(G.dirtyApps, "行数")}`);
P(`- 后端 JVM：pid=${n(jvmPid)}，起于 ${n(jvmStartedAt)} ${sg(G.restarted, "RESTARTED_PID")}；该门本次判定 **${n(restartedVerdict)}**（退出码 ${n(G.restarted.exitCode)}）`);
P(`  - 其自报最新源码：${n(G.restarted.re(/^RESTARTED_NEWEST_SOURCE=(\S+)/m))} mtime=${n(G.restarted.re(/^RESTARTED_NEWEST_SOURCE=\S+ mtime=(\S+)/m))}`);
if (restartedVerdict && !restartedVerdict.startsWith("PASS")) {
  OPEN.push({ item: "后端 JVM 未含最新 java 改动", why: `RESTARTED_STALE_SOURCE=${G.restarted.kv("RESTARTED_STALE_SOURCE")}：API 侧结论一律不得记 PASS` });
}
P("- 被测物包指纹（在盘产物逐文件 sha256 前 8；brief 所说『两个 mock 包指纹』的全部可核解释一并列出）：");
const FP_FILES = ["app.json", "config/env.js", "config/showcase.js", "config/feature-flags.js"];
function bundleOf(dir, label) {
  const per = [], parts = [];
  for (const f of FP_FILES) {
    const s = readSrc(join(dir, f), { optional: true, label: `${label} 指纹输入` });
    if (s) { parts.push(s.sha8); per.push(`${f}=\`${s.sha8}\` (${s.size}B, ${s.mtime})`); }
    else per.push(`${f}=取不到`);
  }
  const comb = parts.length === FP_FILES.length ? sha8(parts.join("|")) : null;
  P(`  - **${label}** \`${dir}\`：${per.join(" · ")}`);
  if (comb) P(`    合成指纹（按 \`app.json→env→showcase→feature-flags\` 的 sha8 串接再 sha256）：\`${comb}\` ${srcFile(dir + "/app.json", "sha256")}`);
  else P(`    合成指纹：输入不全，**不合成**（缺文件时宁可空着，不造一个"看起来对"的指纹）`);
  return comb;
}
const mockFp = bundleOf("apps/client/dist/build/mp-weixin", "mock 包（执行轮被测物，重建后在盘）");
const realFp = bundleOf("apps/client/dist/build/mp-weixin-real", "real 包（G7 隔离产物）");
if (MD_SRC && MD_SRC.json.buildFingerprint) P(`  - 巡检载体**当时记下**的 buildFingerprint（记录值，非本次计算）：\`${JSON.stringify(MD_SRC.json.buildFingerprint)}\` gitSha=\`${n(MD_SRC.json.gitSha)}\` ${srcFile(MD_SRC.path, "buildFingerprint")}`);
if (SM_SRC && SM_SRC.json.buildFingerprint) P(`  - 汇总载体**当时记下**的 buildFingerprint（记录值）：gitSha=\`${n(SM_SRC.json.gitSha)}\` buildMode=\`${n(SM_SRC.json.buildMode)}\` ${srcFile(SM_SRC.path, "buildFingerprint")}`);
if (MD_SRC && SM_SRC) P(`  - 两份巡检载体是否同一 gitSha：${MD_SRC.json.gitSha === SM_SRC.json.gitSha ? "是（" + MD_SRC.json.gitSha + "）" : "**否：" + n(MD_SRC.json.gitSha) + " vs " + n(SM_SRC.json.gitSha) + "**"}`);
P("");

/* ---------- B ---------- */
const q = G.queue;
P("## B. 覆盖（计划 / 已记录 / 缺口）");
P("");
P(`- 队列对账门本次判定：**${n((q.body.match(/^QUEUE_RESULT=.*/m) || [null])[0])}**（退出码 ${n(q.exitCode)}）${q.note}`);
P(`- 计划：${n(q.tok("QUEUE_PLANNED_SUITES"))} 套 / ${n(q.tok("QUEUE_PLANNED_CASES"))} 例 ${sg(q, "QUEUE_PLANNED_CASES")}`);
P(`- 已记录：${n(q.tok("QUEUE_RECORDED_CASES"))} 行（manifest 轴 ${n(q.tok("QUEUE_RECORDED_BY_MANIFEST"))} 套；唯一 id ${n(q.tok("UNIQUE_IDS"))}；我这份快照读到 ${execRows ? execRows.length : "?"} 行）${sg(q, "QUEUE_RECORDED_CASES")}`);
P(`- 缺口：GAP=${n(q.tok("QUEUE_GAP"))}；从未开跑 ${n(q.tok("QUEUE_NEVER_RAN_SUITES"))} 套 / ${n(q.tok("QUEUE_NEVER_RAN_CASES"))} 例；未计划套件 ${n(q.tok("QUEUE_UNPLANNED_SUITES"))} ${sg(q, "QUEUE_GAP")}`);
P(`- 键轴：\`${n(q.tok("QUEUE_KEY_AXIS"))}\` 命中 ${n(q.tok("QUEUE_KEY_AXIS_MATCHED"))}；缺 manifest 字段的行 ${n(q.tok("QUEUE_ROWS_WITHOUT_MANIFEST"))}；复合主键重复组 ${n(q.tok("QUEUE_DUP_KEY_GROUPS"))} ${sg(q, "QUEUE_KEY_AXIS_MATCHED")}`);
P(`- requiresReal 普查：true=${n(q.tok("QUEUE_REQUIRES_REAL_TRUE"))} false=${n(q.tok("QUEUE_REQUIRES_REAL_FALSE"))} 未打=${n(q.tok("QUEUE_REQUIRES_REAL_UNLABELED"))} ${sg(q, "QUEUE_REQUIRES_REAL_TRUE")}`);
P(`- 证据里带 ERROR/timeout 的行（192 那条门禁口径）：${n(q.tok("QUEUE_ERR_TAINTED_CASES"))} ${sg(q, "QUEUE_ERR_TAINTED_CASES")}`);
const pc = q.tonum("QUEUE_PLANNED_CASES"), rc = q.tonum("QUEUE_RECORDED_CASES"), gap = q.tonum("QUEUE_GAP");
P(`- ${conserve("计划 − 记录 vs GAP", [rc, gap], pc)}`);
nonEmpty("计划用例总数", pc, "0 例计划 = ops 扫描集为空，GAP 会被伪造成 0");

const ckSuites = CKPT_SRC ? { ...(CKPT_SRC.json.suites || {}) } : {};
const ckNames = Object.keys(ckSuites);
const byStatus = {};
for (const k of ckNames) { const s = String(ckSuites[k].status ?? "(无 status)"); (byStatus[s] = byStatus[s] || []).push(k); }
const manifestOfSuite = {};
if (execRows) for (const r of execRows) if (r.suite && r.manifest) manifestOfSuite[r.suite] = r.manifest;
const ckManifests = new Set();
let ckUnmappable = 0;
for (const k of ckNames) { if (manifestOfSuite[k]) ckManifests.add(manifestOfSuite[k]); else ckUnmappable++; }
const pending = plannedManifests ? plannedManifests.filter((m) => !ckManifests.has(m)) : null;
P(`- 检查点 \`${CKPT_SRC ? CKPT_SRC.path : "读不到"}\`：suites ${ckNames.length}，status 分布 ${Object.entries(byStatus).map(([k, v]) => `${k}=${v.length}`).join(" / ") || "(空)"} ${srcFile(CKPT_SRC ? CKPT_SRC.path : "(缺)", "suites[].status")}`);
P(`  - **status=running 的套件是半途中断的半成品，绝不得计入"完成"**：${(byStatus.running || []).map((k) => `\`${k}\`（已记 ${ckSuites[k].executedCaseIds ? ckSuites[k].executedCaseIds.length : "?"} 例，无 finishedAt）`).join("；") || "无"} ${srcFile(CKPT_SRC ? CKPT_SRC.path : "(缺)", "suites[running]")}`);
if ((byStatus.interrupted || []).length) P(`  - status=interrupted：${(byStatus.interrupted || []).map((k) => `\`${k}\``).join("；")}（同样不计入完成）`);
P(`  - 套件轴口径说明：检查点键是**派生规划器 id**（\`P-<manifest>-<seq>\`），计划侧是 manifest 名，两轴不同，故下面用权威件的 \`suite→manifest\` 字段做映射（映射不到者进兜底桶）。`);
P(`  - 计划套件（ops 轴）${plannedManifests ? plannedManifests.length : "?"} · 检查点已认领 ${ckManifests.size} · 从未进检查点 ${pending ? pending.length : "?"} · 兜底桶「suite 键映射不到 manifest」= **${ckUnmappable}** ${srcFile(EXEC, "results[].suite → results[].manifest")}`);
if (ckUnmappable) OPEN.push({ item: `检查点里 ${ckUnmappable} 个 suite 在权威件无对应行`, why: "映射不到 manifest 轴，其覆盖状态判不了" });
P(`  - ${conserve("status 分布 vs 检查点 suites", Object.values(byStatus).map((v) => v.length), ckNames.length)}`);
P(`  - ${conserve("已认领 + 从未开跑 vs 计划套件", [ckManifests.size, pending ? pending.length : null], plannedManifests ? plannedManifests.length : null)}`);
if (pending) {
  if (q.tonum("QUEUE_NEVER_RAN_SUITES") !== pending.length)
    P(`  - ⚠ 跨源不一致：我从检查点派生的"从未开跑"=${pending.length}，队列门=${n(q.tok("QUEUE_NEVER_RAN_SUITES"))}。口径不同（前者按检查点认领，后者按权威行 manifest 字段），**不合并、不取齐**，两个都记。`);
  else P(`  - 与队列门的从未开跑一致：${n(q.tok("QUEUE_NEVER_RAN_SUITES"))} 套`);
}
const neverRan = q.body.split("\n").filter((l) => l.startsWith("QUEUE_NEVER_RAN ")).map((l) => l.replace(/^QUEUE_NEVER_RAN /, ""));
P(`- 从未开跑清单（逐字取自门的输出行，非我拼装）${sg(q, "QUEUE_NEVER_RAN")}：`);
if (neverRan.length) for (const x of neverRan) P(`  - ${x}`);
else P(`  - ⚠ 门一行 \`QUEUE_NEVER_RAN\` 都没打印，而计数是 ${n(q.tok("QUEUE_NEVER_RAN_SUITES"))} —— 两者不符即为该门的截断/字段问题，按取不到记。`);
if (pending && pending.length && !neverRan.length) OPEN.push({ item: "从未开跑清单逐条列表", why: "门未打印 QUEUE_NEVER_RAN 行" });
P("");

/* ---------- C ---------- */
P("## C. 结果分布（重建边界两侧分开算，合并值只作守恒核对）");
P("");
let sideA = null, sideB = null, dropped = [], statusChanged = [];
if (execRows && snapRows) {
  const snapKeys = new Set(snapRows.map(keyOf));
  const curKeys = new Set(execRows.map(keyOf));
  sideA = execRows.filter((r) => snapKeys.has(keyOf(r)));
  sideB = execRows.filter((r) => !snapKeys.has(keyOf(r)));
  dropped = snapRows.filter((r) => !curKeys.has(keyOf(r)));
  const cur = new Map(execRows.map((r) => [keyOf(r), r]));
  statusChanged = snapRows.filter((r) => { const c = cur.get(keyOf(r)); return c && c.status !== r.status; });
  const A = statusOf(sideA), B = statusOf(sideB), T = statusOf(execRows);
  P(`- **边界怎么派生**：把在盘权威件与冻结快照按 \`suite|manifest|id\` 三字段复合键比对（与 \`scripts/qa/r-exec.cjs\`${upsertLine ? " 第 " + upsertLine + " 行" : "（行号未从原文定位到）"
    } 的 \`upsertResult\` findIndex 同一把键，行号由本报告读该文件得出）${upsertLine ? srcFile("scripts/qa/r-exec.cjs", "upsertResult findIndex 行号") : ""}。**不按行号**——行是就地 upsert 的，按号比必错位。`);
  P(`  - 快照 \`${SNAP_SRC.path}\`：${snapRows.length} 行，gitSha=${SNAP_SRC.json.gitSha} updatedAt=${SNAP_SRC.json.updatedAt} ${srcFile(SNAP_SRC.path, "results[]")}`);
  P(`  - 在盘 \`${EXEC_SRC.path}\`：${execRows.length} 行，gitSha=${EXEC_SRC.json.gitSha} updatedAt=${EXEC_SRC.json.updatedAt} ${srcFile(EXEC_SRC.path, "results[]")}`);
  P(`- **A 侧｜冻结 \`${SNAP_SRC.json.gitSha}\` 构建 + 旧后端**（复合键见于快照的行）：${sideA.length} 行 = EXECUTED ${A.EXECUTED} / FAILED ${A.FAILED} / SKIPPED ${A.SKIPPED}${A.other ? ` / 其他 ${A.other}` : ""} ${srcFile(EXEC, "status")}`);
  P(`- **B 侧｜重建构建 + 重启后后端**（复合键未见于快照的行）：${sideB.length} 行 = EXECUTED ${B.EXECUTED} / FAILED ${B.FAILED} / SKIPPED ${B.SKIPPED}${B.other ? ` / 其他 ${B.other}` : ""} ${srcFile(EXEC, "status")}`);
  P(`- ⚠ 合计（**混合两个被测物，仅作守恒核对，不得作结论、不得当通过率分母**）：${execRows.length} 行 = EXECUTED ${T.EXECUTED} / FAILED ${T.FAILED} / SKIPPED ${T.SKIPPED}${T.other ? ` / 其他 ${T.other}` : ""} ${srcFile(EXEC, "status")}`);
  P(`- ${conserve("A 侧 + B 侧 vs 在盘行数", [sideA.length, sideB.length], execRows.length)}`);
  P(`- ${conserve("A 侧三态 vs A 侧行数", [A.EXECUTED, A.FAILED, A.SKIPPED, A.other], sideA.length)}`);
  P(`- ${conserve("B 侧三态 vs B 侧行数", [B.EXECUTED, B.FAILED, B.SKIPPED, B.other], sideB.length)}`);
  P(`- ${conserve("快照中已从在盘消失的行（应为 0）", [dropped.length], 0)}`);
  const otherTotal = T.other;
  if (otherTotal) P(`- ⚠ 未知 status 兜底桶 = **${otherTotal}**：${JSON.stringify(T.otherBy)}（不在 EXECUTED/FAILED/SKIPPED 里的状态，逐条待人工读）`);
  P(`- 两侧同键但状态被改写（停机后重跑同一用例、覆盖旧结论）：**${statusChanged.length}** 行 ${srcFile(SNAP.path, "status")}`);
  if (statusChanged.length) {
    const cur = new Map(execRows.map((r) => [keyOf(r), r.status]));
    for (const r of statusChanged.slice(0, 10)) P(`  - \`${keyOf(r)}\` ${r.status} → ${cur.get(keyOf(r))}`);
    P(`  - 这些行按复合键归 **A 侧**（快照认领过），但其状态取自在盘权威件。把 A 侧读成"纯冻结构建的结果"时须扣这 ${statusChanged.length} 行。`);
    OPEN.push({ item: `${statusChanged.length} 行跨边界被就地改写`, why: "同一用例在两个被测物上各记一次，后写覆盖前写，A 侧该项已非冻结构建产物" });
  }
  nonEmpty("B 侧（重建后被测物）行数", sideB.length, "B 侧为 0 → 快照之后没有任何新行，两个被测物的边界在数据上不存在，两侧合并即造假");
  const per = new Map();
  for (const r of execRows) {
    const k = `${r.manifest}|${r.suite}`;
    const e = per.get(k) || { manifest: r.manifest, suite: r.suite, n: 0, EXECUTED: 0, FAILED: 0, SKIPPED: 0, other: 0, a: 0, b: 0 };
    e.n++;
    if (e[r.status] !== undefined) e[r.status]++; else e.other++;
    per.set(k, e);
  }
  const snapKeySet = new Set(snapRows.map(keyOf));
  for (const r of execRows) { const e = per.get(`${r.manifest}|${r.suite}`); if (snapKeySet.has(keyOf(r))) e.a++; else e.b++; }
  P("");
  P(`| 套件（manifest｜检查点 suite 轴） | 行数 | A侧 | B侧 | EXECUTED | FAILED | SKIPPED | 其他 |`);
  P(`|---|---|---|---|---|---|---|---|`);
  const sorted = [...per.values()].sort((x, y) => y.n - x.n);
  for (const e of sorted) P(`| \`${e.manifest}\`｜\`${e.suite}\` | ${e.n} | ${e.a} | ${e.b} | ${e.EXECUTED} | ${e.FAILED} | ${e.SKIPPED} | ${e.other} |`);
  P(`| **合计（${sorted.length} 套）** | ${sorted.reduce((s, e) => s + e.n, 0)} | ${sorted.reduce((s, e) => s + e.a, 0)} | ${sorted.reduce((s, e) => s + e.b, 0)} | ${sorted.reduce((s, e) => s + e.EXECUTED, 0)} | ${sorted.reduce((s, e) => s + e.FAILED, 0)} | ${sorted.reduce((s, e) => s + e.SKIPPED, 0)} | ${sorted.reduce((s, e) => s + e.other, 0)} |`);
  P(`- ${conserve("套件表行数合计 vs 在盘行数", [sorted.reduce((s, e) => s + e.n, 0)], execRows.length)}`);
  P(`- ${conserve("套件表状态格合计 vs 在盘行数", [sorted.reduce((s, e) => s + e.EXECUTED + e.FAILED + e.SKIPPED + e.other, 0)], execRows.length)}`);
  M.sources.execBoundary = {
    snapshot: SNAP.path, snapshotRows: snapRows.length, execRows: execRows.length, keyFields: ["suite", "manifest", "id"],
    upsertKeyLineInRexec: upsertLine,
    sideA: { rows: sideA.length, ...A, subject: `冻结 ${SNAP_SRC.json.gitSha} 构建 + 旧后端` },
    sideB: { rows: sideB.length, ...B, subject: "重建构建 + 重启后后端" },
    combinedLabelledAsMixed: { rows: execRows.length, ...T },
    rowsDroppedFromSnapshot: dropped.length, statusUpsertedAcrossBoundary: statusChanged.map((r) => r.suite + "|" + r.manifest + "|" + r.id),
    perSuite: sorted,
  };
} else {
  P("- **两侧都算不出来**：权威件或冻结快照不可读（见文末失败清单）。本节拒绝给出任何合并通过率。");
  OPEN.push({ item: "重建边界两侧计数", why: "权威件或快照不可读" });
}
P("");

/* ---------- D ---------- */
P("## D. 失败分诊");
P("");
let tri = null, triHow = null;
const triRaw = (() => { try { return readFileSync(resolve(ROOT, TRIAGE_BASE + ".json"), "utf8"); } catch { return null; } })();
if (G.triage.exitCode === 0 && triRaw) {
  try { tri = JSON.parse(triRaw); } catch { tri = null; }
  if (tri) {
    triHow = "本次由本报告启动的分诊台（其 stdout + 它自己写的 JSON sidecar）";
    registerFile(TRIAGE_BASE + ".json", triRaw, statSync(resolve(ROOT, TRIAGE_BASE + ".json")));
    P(`- **用的是刚跑的那一份**：\`${G.triage.cmd}\`（退出码 ${G.triage.exitCode}），sidecar \`${TRIAGE_BASE}.md/.json\``);
  }
}
if (!tri) {
  const legacy = readJsonSrc(".zcode/tmp/triage-r6.json", { optional: true, label: "分诊台旧 sidecar" });
  if (legacy) {
    tri = legacy.json; triHow = "旧 sidecar（本次新跑未成功，退而读它）";
    P(`- **用的是旧 sidecar** \`${legacy.path}\`（updatedAt=${legacy.json.updatedAt}，sha8=\`${legacy.sha8}\`）；新跑分诊台退出码=${n(G.triage.exitCode)}。`);
    OPEN.push({ item: "分诊数据新鲜度", why: "本次分诊台未跑通，读的是旧 sidecar" });
  } else {
    P("- 分诊台本次没跑成、也没有可读 sidecar —— 本节不印任何数字。");
    ERRORS.push("triage-exec-failures 无可用输出：D 节没有数字来源");
  }
}
if (tri) {
  const bs = tri.buckets || {}, items = tri.items || [], rows = tri.total;
  P(`- 来源：${triHow}；权威件 \`${tri.results}\` updatedAt=${tri.updatedAt} 行数=${rows} ${sg(G.triage, "TRIAGE_RESULT")}`);
  const order = ["EXECUTED", "SKIPPED-not-automatable", "locate-label", "locate-label-token-lost", "locate-selector", "harness-api", "timeout", "auth-precondition", "other-fail", "EXECUTED(pass-through)"];
  const keys = [...new Set([...order.filter((k) => bs[k] !== undefined), ...Object.keys(bs)])].filter((k) => k !== "EXECUTED(pass-through)");
  P("");
  P("| 桶 | 条数 |");
  P("|---|---|");
  for (const b of keys) P(`| \`${b}\` | ${bs[b]} |`);
  const zero = ["SKIPPED-not-automatable", "locate-label", "locate-label-token-lost", "locate-selector", "harness-api", "timeout", "auth-precondition", "other-fail"].filter((b) => !bs[b]);
  if (zero.length) P(`| （本次为 0、故未列出的桶） | ${zero.join(", ")} |`);
  P(`- ${conserve("分诊桶合计 vs 行数", keys.map((b) => bs[b]), rows)}`);
  const fb = (bs["other-fail"] || 0) + (tri.unclassified || 0);
  P(`- ⚠ **兜底/未归类合计 = ${fb}**（other-fail ${bs["other-fail"] || 0}、工具自报 unclassified ${n(tri.unclassified)}）：这些行的判据形态没被任何规则接住，必须逐条读原文，不许并进任何通过率。`);
  const four = {};
  for (const it of items) if (it.verdict) four[it.verdict] = (four[it.verdict] || 0) + 1;
  const indexed = items.filter((it) => it.recoverable && it.token).length;
  P("");
  P(`### dist/src 四格（只对能恢复出查找目标的定位失败做双载体检；n=${indexed}）${srcFile(TRIAGE_BASE + ".json", "items[].verdict")}`);
  P("");
  P("| 结论 | 条数 |");
  P("|---|---|");
  const fourE = Object.entries(four).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of fourE) P(`| ${k} | ${v} |`);
  if (!fourE.length) { P(`| ⚠ 一格都没有 | 0 |`); ERRORS.push("空集判红：dist/src 四格 0 条 —— 能恢复出查找目标的定位失败为 0，通常是 token 提取失灵，不是真的没有失败"); }
  P(`- ${conserve("四格合计 vs 有查找目标的定位失败", fourE.map(([, v]) => v), indexed)}`);
  const suspect = items.filter((it) => it.suspect).length;
  const offTarget = items.filter((it) => it.onTarget === false).length;
  const noTop = items.filter((it) => it.onTarget === null).length;
  const mism = items.filter((it) => it.mismatch).length;
  const tokenLost = bs["locate-label-token-lost"] || 0;
  P(`- 单字标签（从用例散文里抠出的残字，几乎必是规格噪声而非产品缺陷）：**${suspect}** ${srcFile(TRIAGE_BASE + ".json", "items[].suspect")}`);
  P(`- token-lost（执行器只留哨兵 \`__CAND__\`、没留要找的文案，事后无法复核）：**${tokenLost}** ${sg(G.triage, "locate-label-token-lost")}`);
  P(`- 动作发生时不在用例声明的页面上：**${offTarget}**；\`top=\` 与 \`route[]\` 都读不到因而**判不了**：**${noTop}** ${srcFile(TRIAGE_BASE + ".json", "items[].onTarget")}`);
  P(`- observed 带 \`MISMATCH!\`（执行器自报前置身份/状态不符）：**${mism}** ${srcFile(TRIAGE_BASE + ".json", "items[].mismatch")}`);
  P(`- ${conserve("在目标页三态（是/否/判不了）vs 分诊条目", [items.filter((it) => it.onTarget === true).length, offTarget, noTop], items.length)}`);
  if (tokenLost) OPEN.push({ item: `${tokenLost} 条定位失败无法复核（token-lost）`, why: "取证字段缺失，属执行器取证缺陷，不得记产品失败" });
  if (noTop) OPEN.push({ item: `${noTop} 条是否在目标页判不了`, why: "observed 无 top= 且 route[] 不可用" });
  if (mism) OPEN.push({ item: `${mism} 条前置身份/状态自报不符（MISMATCH!）`, why: "前置没到位，其结论不能当被测物证据" });
  M.sources.triage = { used: triHow, rows, buckets: bs, unclassified: tri.unclassified, fourCell: four, suspect, tokenLost, offTarget, cannotTellOnTarget: noTop, mismatch: mism, fallbackTotal: fb };
  if (execRows && tri.total !== execRows.length)
    P(`- 跨时刻差值（如实记，不取齐）：分诊台读到 ${tri.total} 行，我这份快照 ${execRows.length} 行，差 ${tri.total - execRows.length} 行（执行轮在追加）。`);
}
P("");

/* ---------- E ---------- */
P("## E. 证据可信度（两条规则并列展示，不合并、不互相替换）");
P("");
const RJCLS = ["CLEAN_EVIDENCE", "TAINTED_BUT_FILE_PRESENT", "NO_EVIDENCE_MISSING_FILE", "NOT_A_FILE_REF", "EXECUTED_WITHOUT_TIER_EVIDENCE"];
const rj = { perExec: {} };
if (G.readj.body.includes("RJ_ROWS=")) {
  let missCls = [];
  for (const c of RJCLS) {
    const m = G.readj.body.match(new RegExp("^RJ_CLASS " + c + "=(\\d+) \\(EXECUTED 其中=(\\d+)\\)", "m"));
    if (m) { rj[c] = Number(m[1]); rj.perExec[c] = Number(m[2]); } else { rj[c] = null; missCls.push(c); }
  }
  rj.rows = G.readj.num("RJ_ROWS");
  rj.status = G.readj.re(/RJ_STATUS=(\{[^}]*\})/);
  rj.domainViolations = G.readj.tok("RJ_DOMAIN_VIOLATIONS");
  rj.identical = G.readj.body.includes("RJ_SET_IDENTICAL=1") ? 1 : 0;
  rj.executedTierUnmet = G.readj.num("RJ_EXECUTED_TIER_UNMET");
  rj.downgrade = G.readj.num("RJ_DOWNGRADE_TO_NO_EVIDENCE");
  rj.sizeOnly = G.readj.num("RJ_SIZE_ONLY_CASES");
  rj.notAFileCases = G.readj.num("RJ_NOT_A_FILE_REF_CASES");
  rj.taintedUniverse = G.readj.num("RJ_TAINTED_UNIVERSE");
  rj.gateEquiv = G.readj.num("RJ_GATE_EQUIV_CASES");
  P(`- **用的是刚启动的干跑**（无 \`--apply\`，未写任何权威件）：\`${G.readj.cmd}\` 退出码 ${n(G.readj.exitCode)} ${sg(G.readj, "RJ_CLASS")}`);
  if (missCls.length) ERRORS.push(`改判台输出里缺这些分类行：${missCls.join(", ")} —— 字段名变了就是变了，不许当它们是 0`);
  P(`- 它读到的行数：${n(rj.rows)}（我这份快照 ${execRows ? execRows.length : "?"} 行）；status 分布 ${n(rj.status)}`);
  P("");
  P("| 分类（规则：先剥 `(123B)` / `(ERROR:…)` 尾注再看盘，再按 tier 配额判定） | 用例数 | 其中 EXECUTED |");
  P("|---|---|---|");
  for (const c of RJCLS) P(`| \`${c}\` | ${n(rj[c])} | ${n(rj.perExec[c])} |`);
  P(`- ${conserve("五类合计 vs 改判台行数", RJCLS.map((c) => rj[c]), rj.rows)}`);
  P(`- \`RJ_SET_IDENTICAL\`（与 192 那条门禁口径是否同一集合）：**${rj.identical ? "1（同一）" : "0（不同一）"}** ${sg(G.readj, "RJ_SET_IDENTICAL")}`);
  const sd = G.readj.body.match(/RJ_SET_DIFF onlyInReadjudicate=(\d+) onlyInGate=(\d+) intersection=(\d+)/);
  P(`- 门禁等价集=${n(rj.gateEquiv)} / 本工具污染全宇宙=${n(rj.taintedUniverse)}${sd ? ` / 只在本工具=${sd[1]}、只在门禁=${sd[2]}、交集=${sd[3]}` : " / 无 RJ_SET_DIFF 行（两类都空？须查）"} ${sg(G.readj, "RJ_GATE_EQUIV_CASES")}`);
  P(`- 改判到 NO-EVIDENCE=${n(rj.downgrade)} 条；EXECUTED 但 tier 交不齐=${n(rj.executedTierUnmet)} 条；只有大小注记且文件确在=${n(rj.sizeOnly)} 条；整行无像素引用=${n(rj.notAFileCases)} 条 ${sg(G.readj, "RJ_DOWNGRADE_TO_NO_EVIDENCE")}`);
  const ewt = rj.EXECUTED_WITHOUT_TIER_EVIDENCE;
  if (ewt === 0) P(`- ⚠ \`EXECUTED_WITHOUT_TIER_EVIDENCE=0\` 的**含义**要说清：它只说"没有一条 EXECUTED 是连一帧都没采"，而同一份输出里 NO_EVIDENCE_MISSING_FILE 的 EXECUTED 有 ${n(rj.perExec.NO_EVIDENCE_MISSING_FILE)} 条。这个 0 是分类结果，不是证据干净，更不是通过率。`);
  else if (ewt) P(`- ⚠ \`EXECUTED_WITHOUT_TIER_EVIDENCE=${ewt}\`：这些"已执行"连 tier 要求的帧都没落盘。`);
} else {
  P("- 改判台本次无可用输出（退出码 " + n(G.readj.exitCode) + "）—— 不编数，其分类整节记为取不到。");
  ERRORS.push("readjudicate-evidence 无输出：E 节的分类计数没有来源");
}
let indep = null;
if (execRows) {
  // 与 .zcode/tmp/evidence-existence-check.cjs 实测有效的剥法一致（本工具自己实现、自己 stat）
  const strip = (e) => String(e).replace(/\((\d+)B\)\s*$/, "").replace(/\s*\(ERROR:[^)]*\)\s*$/, "");
  const existsPng = (p) => { try { const st = statSync(resolve(ROOT, p)); return st.isFile() && st.size > 0; } catch { return false; } };
  let ex = 0, hit = 0, noPngRef = 0, deadOnly = 0;
  for (const r of execRows) {
    if (r.status !== "EXECUTED") continue;
    ex++;
    const pngs = (r.evidence || []).filter((e) => /\.png$/i.test(strip(e)));
    if (!pngs.length) { noPngRef++; continue; }
    if (pngs.some((e) => existsPng(strip(e)))) hit++; else deadOnly++;
  }
  indep = { executed: ex, hit, deadOnly, noPngRef };
  P("");
  P("### 本报告内独立复算（第二条规则：不看 tier 配额，只问『有没有一张像素帧真在盘上』）");
  P("");
  P(`- 规则：EXECUTED 行的 \`evidence[]\` 里，剥掉 \`(123B)\` 与 \`(ERROR:…)\` 尾注后**至少一条 .png 在盘且 size>0** ${srcFile(EXEC, "evidence[]")}`);
  P(`- 结果：**${indep.hit} / ${indep.executed}** 条达标；其余 = 纯断链 ${indep.deadOnly} 条 + evidence[] 里根本没有 .png 引用 ${indep.noPngRef} 条`);
  P(`- ${conserve("有图 / 断链 / 无 .png 引用 vs EXECUTED 行数", [indep.hit, indep.deadOnly, indep.noPngRef], indep.executed)}`);
  // 执行器取证洞修好后会多出一个新字段 missingEvidence[]。本节必须认识它，否则"修好了"这件事
  // 在终报里完全不可见——本轮就差点犯了这个：报告只按老规则数 evidence[]，新字段谁都不读。
  // 这也是第三条被测物边界（修复后执行器写出的行）的唯一机器可读标记。
  const meRows = execRows.filter((r) => Array.isArray(r.missingEvidence));
  const meNonEmpty = meRows.filter((r) => r.missingEvidence.length > 0);
  const phantomAll = execRows.reduce((n, r) => n + (r.evidence || []).filter((e) => /\(ERROR:/.test(String(e))).length, 0);
  const phantomInNew = meRows.reduce((n, r) => n + (r.evidence || []).filter((e) => /\(ERROR:/.test(String(e))).length, 0);
  P(`- 修复后新字段 「missingEvidence[]」：${meRows.length} 行带该字段（= 由修好的执行器写出的行），其中 ${meNonEmpty.length} 行确有捕获失败记录 ${srcFile(EXEC, "missingEvidence[]")}`);
  P(`- 幻象路径余量：全库仍有 ${phantomAll} 条 evidence[] 带 「(ERROR:…)」，其中新行内 ${phantomInNew} 条 ${srcFile(EXEC, "evidence[]")}`);
  P(`  判读：新行内应为 **0**（不为 0 就说明存在性校验没接上）；旧行的余量由改判台在步骤① 处理，不算本轮未修。`);
  nonEmpty("EXECUTED 行数（独立复算的分母）", indep.executed, "0 条 EXECUTED → 没有任何一行在宣称完成，本节的百分比全是空气");
  P("");
  P("| 口径 | 规则 | 『干净』计数 | 用的行集 |");
  P("|---|---|---|---|");
  P(`| 改判台 | 先剥尾注再看盘 **且** 按 tier 交齐（critical=2 帧 / normal=1 / navigation,noop=0） | CLEAN ${n(rj.perExec && rj.perExec.CLEAN_EVIDENCE)} 条 EXECUTED（另有 TAINTED_BUT_FILE_PRESENT ${n(rj.perExec && rj.perExec.TAINTED_BUT_FILE_PRESENT)} 条文件确在） | 它自己重读的 ${n(rj.rows)} 行 |`);
  P(`| 本报告 | 至少 1 张 .png 在盘即算有像素证据（不看 tier 配额） | ${indep ? indep.hit : "?"} 条 EXECUTED | 我这份快照 ${indep ? indep.executed : "?"} 条 EXECUTED |`);
  P(`- 两数不等是**规则不同**（tier 要 2 帧，本口径只要 1 帧），不是有一边算错；编排层已决定终报两条并列。`);
  M.sources.evidence = { readjudicate: rj, independent: indep, note: "两条规则并列，不合并" };
}
P("");

/* ---------- F ---------- */
P("## F. 截图巡检（\`" + (MD_SRC ? MD_SRC.path : "读不到") + "\`）");
P("");
if (MD_SRC && Array.isArray(MD_SRC.json.shots)) {
  const j = MD_SRC.json;
  const ids = {}; let idFallback = 0;
  for (const s of j.shots) { const k = typeof s.identity === "string" && s.identity ? s.identity : "(无 identity)"; ids[k] = (ids[k] || 0) + 1; if (k === "(无 identity)") idFallback++; }
  const sna = Array.isArray(j.stateNotApplied) ? j.stateNotApplied : [];
  const snTrue = sna.filter((x) => x.aliasLabel === true).length;
  const snFalse = sna.filter((x) => x.aliasLabel === false).length;
  const snOther = sna.length - snTrue - snFalse;
  const fails = Array.isArray(j.failures) ? j.failures : [];
  const drifts = Array.isArray(j.routeDrifts) ? j.routeDrifts : [];
  const zoom = Array.isArray(j.zoomFrames) ? j.zoomFrames : [];
  const zoomFromShots = j.shots.reduce((s, x) => s + ((x.zoomCrops || []).length), 0);
  const tally = (arr) => { const o = {}; for (const x of arr) o[typeof x.identity === "string" && x.identity ? x.identity : "(无)"] = (o[typeof x.identity === "string" && x.identity ? x.identity : "(无)"] || 0) + 1; return o; };
  P(`- 载体头：gitSha=${n(j.gitSha)} workflowVersion=${n(j.workflowVersion)} buildMode=${n(j.buildMode)} generatedAt=${n(j.generatedAt)} ${srcFile(MD_SRC.path, "gitSha")}`);
  P(`- 帧数 shots = **${j.shots.length}**，按 identity：${Object.entries(ids).map(([k, v]) => `${k}=${v}`).join(" / ")}${idFallback ? `（兜底桶「无 identity」= ${idFallback}，非 0 必须解释）` : ""} ${srcFile(MD_SRC.path, "shots[]")}`);
  P(`- failures = **${fails.length}**，按 identity：${Object.entries(tally(fails)).map(([k, v]) => `${k}=${v}`).join(" / ")} ${srcFile(MD_SRC.path, "failures[]")}`);
  P(`- stateNotApplied = **${sna.length}**，按 \`aliasLabel\` 拆：\`true\`=${snTrue}（同帧别名标签：把默认帧再标一次数据态/空态）/ \`false\`=${snFalse}（状态真没打上去，需定向重截）/ 其他=${snOther} ${srcFile(MD_SRC.path, "stateNotApplied[].aliasLabel")}`);
  P(`- routeDrifts = **${drifts.length}**，按 identity：${Object.entries(tally(drifts)).map(([k, v]) => `${k}=${v}`).join(" / ")} ${srcFile(MD_SRC.path, "routeDrifts[]")}`);
  P(`- zoomFrames = **${zoom.length}**，按 identity：${Object.entries(tally(zoom)).map(([k, v]) => `${k}=${v}`).join(" / ")}；另一处独立取数 \`shots[].zoomCrops\` 合计 ${zoomFromShots} ${srcFile(MD_SRC.path, "zoomFrames[]")}`);
  P(`- 工作树脏项（载体当时自报，与 A 节本次实测是不同时刻）：${n(j.gitWorktreeDirtyPaths)} ${srcFile(MD_SRC.path, "gitWorktreeDirtyPaths")}`);
  if (j.captureLimitations && j.captureLimitations.screenshotDprSupported === false) P(`- 采集限制（载体字段 \`captureLimitations.screenshotDprSupported=false\`）：截图不支持 DPR 参数，zoom 帧是 1x 原帧整数倍最近邻上采样，不产生新细节、不计状态配额 ${srcFile(MD_SRC.path, "captureLimitations")}`);
  P(`- ${conserve("aliasLabel 拆项 vs stateNotApplied", [snTrue, snFalse, snOther], sna.length)}`);
  P(`- ${conserve("stateNotApplied + 其它 failure vs failures 总数", [sna.length, fails.length - sna.length], fails.length)}`);
  P(`- ${conserve("identity 分组 vs shots 总数", Object.values(ids), j.shots.length)}`);
  P(`- ${conserve("zoomFrames vs shots[].zoomCrops（两处独立取数）", [zoomFromShots], zoom.length)}`);
  if (snFalse) OPEN.push({ item: `${snFalse} 个状态帧未真正应用状态（aliasLabel=false）`, why: "该状态没有独立像素证据，只有默认帧" });
  if (drifts.length) OPEN.push({ item: `${drifts.length} 条 routeDrift（落点非目标页）`, why: "巡检自报落点在别的页，那些帧不能证明目标页" });
  M.sources.tour = { file: MD_SRC.path, sha8: MD_SRC.sha8, gitSha: j.gitSha, shots: j.shots.length, byIdentity: ids, failures: fails.length, failuresByIdentity: tally(fails), stateNotApplied: sna.length, aliasTrue: snTrue, aliasFalse: snFalse, routeDrifts: drifts.length, routeDriftsByIdentity: tally(drifts), zoomFrames: zoom.length, zoomCropsSumFromShots: zoomFromShots, carrierWorktreeDirty: j.gitWorktreeDirtyPaths };
} else {
  P("- 巡检 manifest 不可读 → 本节不印数（见文末失败清单）。");
}
P("");

/* ---------- G ---------- */
P("## G. 真实模式（在盘载体 + 本次复跑的当前结论）");
P("");
if (GATES_SRC) {
  const g = GATES_SRC.json;
  P(`- 在盘载体 \`${GATES_SRC.path}\`（schemaVersion=${n(g.schemaVersion)} capturedAt=${n(g.capturedAt)} gitSha=${n(g.gitSha)}）：`);
  P(`  - G7_RESULT=${n(g.G7_RESULT)} / G8_RESULT=${n(g.G8_RESULT)}（环 ${n(g.detail && g.detail.G8 && g.detail.G8.ringsOk)}）/ G9_RESULT=${n(g.G9_RESULT)}（ok=${n(g.detail && g.detail.G9 && g.detail.G9.ok)}/${n(g.detail && g.detail.G9 && g.detail.G9.probed)}）${srcFile(GATES_SRC.path, "G7_RESULT / G8_RESULT / G9_RESULT")}`);
  P(`  - 前置件：${n(g.precondition && g.precondition.check)} → ${n(g.precondition && g.precondition.result)}（JVM pid ${n(g.precondition && g.precondition.jvmPid)} 起于 ${n(g.precondition && g.precondition.jvmStartedAt)}）${srcFile(GATES_SRC.path, "precondition.jvmPid")}`);
  P(`  - G9 对照表四格（载体值）：${JSON.stringify((g.detail && g.detail.G9 && g.detail.G9.controlTable) || "取不到")} ${srcFile(GATES_SRC.path, "detail.G9.controlTable")}`);
  P(`  - 载体记的本轮新增库内主键：posts=${JSON.stringify((g.newDbKeysThisRound && g.newDbKeysThisRound.posts) || "取不到")} comments=${JSON.stringify((g.newDbKeysThisRound && g.newDbKeysThisRound.comments) || "取不到")}${srcFile(GATES_SRC.path, "newDbKeysThisRound")}`);
  for (const ne of g.notEvidenced || []) { P(`  - ${ne.item}：**${ne.status}** —— ${ne.reason}`); OPEN.push({ item: `真实模式：${ne.item}`, why: String(ne.status) }); }
  P(`  > 载体是 **capturedAt 时刻**的（早于本轮重建与后端重启）；下栏是本工具此刻复跑得到的**当前**结论。两者不一致即"证据已过期"，两条都印、不取齐、不覆盖。`);
  M.sources.realCarrier = { file: GATES_SRC.path, capturedAt: g.capturedAt, G7: g.G7_RESULT, G8: g.G8_RESULT, G8rings: g.detail && g.detail.G8 && g.detail.G8.ringsOk, G9: g.G9_RESULT };
} else {
  P(`- \`${REAL_DIR}/GATES.json\` 不存在或读不出 → 真实模式历史载体按"取不到"记。`);
}
P("");
P("### 本次复跑（退出码即数据；非零不删报告，只记进失败清单）");
P("");
P("| 件 | 命令行 | 退出码 | 关键计数（逐字取自其 stdout） |");
P("|---|---|---|---|");
if (SKIP_LIVE) {
  P(`| — | \`--skip-live-gates\`，未复跑 | — | 无当前结论可记 |`);
} else {
  const g8rings = [...G.g8.body.matchAll(/^RING(\d+)\s*\[(OK|MISS)\s*\]\s*(.*?)\s*::\s*(.*)$/gm)].map((m) => ({ n: Number(m[1]), name: m[3], ok: m[2] === "OK", detail: m[4] }));
  P(`| G7 产物自证 | \`${G.g7.cmd}\` | ${n(G.g7.exitCode)} | G7_RESULT=${n(G.g7.kv("G7_RESULT"))}；${(G.g7.body.match(/\[g7\] 产物自证 .*/) || [""])[0].trim()}；${(G.g7.body.match(/\[g7\] outDir=.*/) || [""])[0].trim()} ｜**必须 node22**：v16 上它自报假 FAIL（实测） |`);
  P(`| G8 十环 | \`${G.g8.cmd}\` | ${n(G.g8.exitCode)} | G8_RESULT=${n(G.g8.kv("G8_RESULT"))} G8_RINGS_OK=${n(G.g8.kv("G8_RINGS_OK"))}（解析到环 ${g8rings.length} 条）G8_ARTIFACTS=${n(G.g8.kv("G8_ARTIFACTS"))} |`);
  P(`| G9 素材探针 | \`${G.g9.cmd}\` | ${n(G.g9.exitCode)} | G9_RESULT=${n(G.g9.kv("G9_RESULT"))} EXTRACTED=${n(G.g9.re(/^G9_EXTRACTED=(\d+)/))} PROBED=${n(G.g9.num("G9_PROBED"))} OK=${n(G.g9.num("G9_OK"))} SKIPPED=${n(G.g9.num("G9_SKIPPED"))} FAIL=${n(G.g9.num("G9_FAIL"))}；${(G.g9.body.match(/G9_CONTROL .*/) || [""])[0]} |`);
  P(`| probe-real-env | \`${G.probe.cmd}\` | ${n(G.probe.exitCode)} | PROBE_BACKEND=${n(G.probe.tok("PROBE_BACKEND"))} 可达=${n(G.probe.tok("PROBE_ASSETS_REACHABLE"))} 在盘=${n(G.probe.tonum("PROBE_ASSETS_ON_DISK"))} VERDICT=${n(G.probe.tok("PROBE_VERDICT"))} |`);
  nonEmpty("G8 环数（从本次 stdout 解析）", g8rings.length, "一条 RING 都没解析到 = G8 输出格式变了或没跑起来，绝不允许沿用上一轮的环数");
  nonEmpty("G9 探得条数", G.g9.num("G9_PROBED"), "抽取 0 条通常是 IMAGE_PATHS 锚点撞上文件头注释（该脚本注释里已记过一次同类假读数）");
  const g9p = G.g9.num("G9_PROBED"), g9ok = G.g9.num("G9_OK"), g9sk = G.g9.num("G9_SKIPPED"), g9f = G.g9.num("G9_FAIL");
  P(`- ${conserve("G9 ok+skipped+fail vs PROBED", [g9ok, g9sk, g9f], g9p)}`);
  const ctrl = (G.g9.body.match(/G9_CONTROL (.*)/) || [])[1] || "";
  const cell = (label) => { const m = ctrl.match(new RegExp(label + "=(\\d+)")); return m ? Number(m[1]) : null; };
  const c1 = cell("在盘且200"), c2 = cell("在盘但失败"), c3 = cell("不在盘但200"), c4 = cell("不在盘且失败");
  P(`- ${conserve("G9 对照表四格 vs PROBED", [c1, c2, c3, c4], g9p)} ${sg(G.g9, "G9_CONTROL")}`);
  const g8ok = G.g8.body.match(/G8_RINGS_OK=(\d+)\/(\d+)/);
  if (g8ok) P(`- ${conserve("G8 OK 环 + MISS 环 vs 环总数", [Number(g8ok[1]), g8rings.filter((r) => !r.ok).length], Number(g8ok[2]))}`);
  const carrierRings = GATES_SRC && GATES_SRC.json.detail && GATES_SRC.json.detail.G8 ? String(GATES_SRC.json.detail.G8.ringsOk || "") : "";
  if (g8ok && carrierRings && carrierRings !== G.g8.kv("G8_RINGS_OK")) {
    P(`- ⚠ **G8 载体已过期**：在盘载体记 \`${carrierRings}\`（\`${GATES_SRC.path}\`，capturedAt=${GATES_SRC.json.capturedAt}），本次实测 \`${G.g8.kv("G8_RINGS_OK")}\`、环数本身已从 6 扩到 ${g8rings.length} —— 载体的 PASS 结论不能代表当前被测物。${srcFile(GATES_SRC.path, "detail.G8.ringsOk")}`);
    OPEN.push({ item: "真实模式在盘载体 GATES.json", why: `记的是 ${carrierRings}，本次为 ${G.g8.kv("G8_RINGS_OK")}（且环集已变），需在重建后重出载体` });
  }
  if (g8rings.length && Number(g8ok && g8ok[2]) !== g8rings.length) ERRORS.push(`G8 环数不自洽：G8_RINGS_OK 的分母是 ${g8ok[2]}，但只解析到 ${g8rings.length} 条 RING 行 —— 输出形态变了，不许按分母报数`);
  M.sources.live = {
    g7: { exit: G.g7.exitCode, result: G.g7.kv("G7_RESULT"), runner: "node22" },
    g8: { exit: G.g8.exitCode, result: G.g8.kv("G8_RESULT"), ringsOk: G.g8.kv("G8_RINGS_OK"), rings: g8rings, artifacts: G.g8.kv("G8_ARTIFACTS") },
    g9: { exit: G.g9.exitCode, result: G.g9.kv("G9_RESULT"), extracted: G.g9.num("G9_EXTRACTED"), probed: g9p, ok: g9ok, skipped: g9sk, fail: g9f, control: { 在盘且200: c1, 在盘但失败: c2, 不在盘但200: c3, 不在盘且失败: c4 } },
    probe: { exit: G.probe.exitCode, backend: G.probe.tok("PROBE_BACKEND"), verdict: G.probe.tok("PROBE_VERDICT"), reachable: G.probe.tok("PROBE_ASSETS_REACHABLE"), onDisk: G.probe.tonum("PROBE_ASSETS_ON_DISK") },
  };
  if (GATES_SRC && G.g9.kv("G9_RESULT") && GATES_SRC.json.G9_RESULT && G.g9.kv("G9_RESULT") !== GATES_SRC.json.G9_RESULT)
    P(`- ⚠ G9 当前结论 \`${G.g9.kv("G9_RESULT")}\` 与在盘载体 \`${GATES_SRC.json.G9_RESULT}\` 不一致 —— 载体需重出。`);
}
P("");

/* ---------- H ---------- */
P("## H. 台账与门禁（本次复跑 vs 轮初基线）");
P("");
const baseLines = LEDGER_SRC ? LEDGER_SRC.text.split(/\r?\n/) : [];
const bs0 = baseLines.findIndex((l) => /^##\s*1[.\s]/.test(l));
const baseSection = bs0 < 0 ? [] : (() => { const o = []; for (let i = bs0 + 1; i < baseLines.length && !/^##\s/.test(baseLines[i]); i++) o.push(baseLines[i]); return o; })();
const baseRow = (kw) => baseSection.find((l) => l.startsWith("|") && l.includes(kw)) || null;
P(`- 基线只作叙事：\`${LEDGER_SRC ? LEDGER_SRC.path : "读不到"}\` §1（**下面引用的每一个计数都来自本次复跑的门，没有一个数抄这张表**）${LEDGER_SRC ? srcFile(LEDGER_SRC.path, "§1 表") : ""}`);
P("");
P("| 门禁 | 本次退出码 | 本次关键计数（逐字取自其 stdout） | 轮初基线（台账 §1 原文行） |");
P("|---|---|---|---|");
function gateRow(rec, kw, headline) {
  const b = baseRow(kw);
  P(`| \`${rec.name}\` | **${rec.exitCode === null ? "无码" : rec.exitCode}**${rec.note ? `（${rec.note}）` : ""} | ${headline} | ${b ? "退出码 `" + (b.split("|")[2] || "").trim() + "`：`" + b.replace(/\|/g, "/") + "`" : "台账 §1 无此行（不猜）"} |`);
}
gateRow(G.ledger, `verify-ledger（台账目录=${ROUND_DIR}）`, `SOURCES=${n(G.ledger.re(/LEDGER_SOURCES=(\d+)/))} DISTINCT_IDS=${n(G.ledger.re(/DISTINCT_IDS=(\d+)/))} MATRIX_IDS=${n(G.ledger.re(/MATRIX_IDS=(\d+)/))} ORPHAN_TRUE=${n(G.ledger.re(/LEDGER_ORPHAN_TRUE=(\d+)/))} MULTI_ID_FAMILIES=${n(G.ledger.re(/LEDGER_MULTI_ID_FAMILIES=(\d+)/))} → ${(G.ledger.body.match(/^LEDGER_RESULT=.*/m) || [null])[0]}`);
gateRow(G.stateTruth, "verify-state-truth", `CASE_SPREAD=${n(G.stateTruth.num("STATE_CASE_SPREAD"))} FAIL_SPREAD=${n(G.stateTruth.num("STATE_FAIL_SPREAD"))} → ${(G.stateTruth.body.match(/^STATE_RESULT=.*/m) || [null])[0]}`);
gateRow(G.integrity, "verify-evidence-integrity", `SHOTS=${n(G.integrity.re(/EVIDENCE_SHOTS=(\d+)/))} MATCHED=${n(G.integrity.re(/MATCHED=(\d+)/))} MISSING=${n(G.integrity.re(/MISSING=(\d+)/))} HASH_MISMATCH=${n(G.integrity.re(/HASH_MISMATCH=(\d+)/))} ORPHANS=${n(G.integrity.re(/ORPHANS=(\d+)/))} DUP_STATE=${n(G.integrity.re(/DUP_STATE_GROUPS=(\d+)/))} SNA改判=${n(G.integrity.re(/EVIDENCE_SNA_RECLASSIFIED=(\d+)/))} 盘上仅算非证据=${n(G.integrity.re(/EVIDENCE_FRAMES_ON_DISK_ONLY_AS_NON_EVIDENCE=(\d+)/))}；exec: ${n(G.integrity.re(/EXEC_EVIDENCE_ENTRIES=(\d+)/))} 条 WITH_ERROR=${n(G.integrity.re(/WITH_ERROR=(\d+)/))} 伪造引用=${n(G.integrity.re(/EXEC_CLEAN_BUT_MISSING=(\d+)/))} → ${(G.integrity.body.match(/^EVIDENCE_RESULT=.*/m) || [null])[0]}`);
gateRow(G.corpus, "verify-evidence-corpus", `MANIFESTS=${n(G.corpus.num("CORPUS_MANIFESTS"))} SCANNED=${n(G.corpus.num("CORPUS_SCANNED"))} EXPIRED_GITSHA=${n(G.corpus.num("CORPUS_EXPIRED_GITSHA"))} PROBLEMS=${n(G.corpus.num("CORPUS_PROBLEMS"))} → ${(G.corpus.body.match(/^CORPUS_RESULT=.*/m) || [null])[0]}`);
gateRow(G.provenance, "verify-provenance-all", `FRAMES_CONSISTENT=${n(G.provenance.re(/PROV_FRAMES_CONSISTENT=(\d+)/))} PRE_STAMP=${n(G.provenance.re(/PROV_FRAMES_PRE_STAMP=(\d+)/))} STALE=${n(G.provenance.re(/PROV_FRAMES_STALE=(\d+)/))} UNDATED=${n(G.provenance.re(/PROV_FRAMES_UNDATED=(\d+)/))} PRODUCERS=${n(G.provenance.re(/PROV_PRODUCERS=(\d+)/))} LITERAL_SHA=${n(G.provenance.re(/LITERAL_SHA=(\d+)/))} → ${(G.provenance.body.match(/^PROVENANCE_RESULT=.*/m) || [null])[0]}`);
/* 本轮 scope 的两把才是"本轮证据"的判据；全域那两把在上面照实打印，只作为历史记录进 J 节。 */
gateRow(G.corpusScoped, "verify-evidence-corpus --scope " + EVIDENCE_SCOPE, `MANIFESTS=${n(G.corpusScoped.num("CORPUS_MANIFESTS"))} SCANNED=${n(G.corpusScoped.num("CORPUS_SCANNED"))} PROBLEMS=${n(G.corpusScoped.num("CORPUS_PROBLEMS"))} → ${(G.corpusScoped.body.match(/^CORPUS_RESULT=.*/m) || [null])[0]}`);
gateRow(G.provenanceScoped, "verify-provenance-all --scope " + EVIDENCE_SCOPE, `FRAMES_CONSISTENT=${n(G.provenanceScoped.re(/PROV_FRAMES_CONSISTENT=(\d+)/))} UNDATED=${n(G.provenanceScoped.re(/PROV_FRAMES_UNDATED=(\d+)/))} → ${(G.provenanceScoped.body.match(/^PROVENANCE_RESULT=.*/m) || [null])[0]}`);
if (!G.integrityRawList.length) P(`| \`verify-evidence-integrity（原始 corpus）\` | 未跑 | 无 | 盘上没有任何 \`reports/screenshots/round-${ROUND_NO}-*/manifest-detail.json\` —— 逐 corpus 原始记录未量，不得当成"已核过" |`);
for (const leg of G.integrityRawList) {
  gateRow(leg, "verify-evidence-integrity（重拍 corpus）", `SHOTS=${n(leg.re(/EVIDENCE_SHOTS=(\d+)/))} DUP_STATE=${n(leg.re(/DUP_STATE_GROUPS=(\d+)/))} SNA改判=${n(leg.re(/EVIDENCE_SNA_RECLASSIFIED=(\d+)/))} MISSING=${n(leg.re(/MISSING=(\d+)/))} ORPHANS=${n(leg.re(/ORPHANS=(\d+)/))} → ${(leg.body.match(/^EVIDENCE_RESULT=.*/m) || [null])[0]}`);
  /* 信息轴退出码非零**不进"本次仍判红"的分母**，但每条都要在"一条不藏"里点名：
     它测的是采集当时的原始记录，那些同字节帧已由权威索引改判承接（换载体≠已修复）。 */
  const dup = Number(leg.re(/DUP_STATE_GROUPS=(\d+)/) || 0);
  const other = Number(leg.re(/MISSING=(\d+)/) || 0) + Number(leg.re(/HASH_MISMATCH=(\d+)/) || 0) + Number(leg.re(/ORPHANS=(\d+)/) || 0);
  if (dup) OPEN.push({ item: `${leg.name} —— 同页同身份却同字节的帧仍在原始记录里：${dup} 组`, why: `信息轴不否决；这 ${dup} 组已由权威索引 stateNotApplied[] 承接（retroactive 改判），产品侧「该状态是否真的不改变画面」仍是待复验项，下一轮需要元素级交互断言而不是像素比对` });
  if (other) OPEN.push({ item: `${leg.name} —— 原始 corpus 有 ${other} 条断链/哈希不符/孤儿`, why: "信息轴不否决，但必须先确认权威索引没漏掉同一批帧" });
}
gateRow(G.queue, "verify-queue-reconcile", `GAP=${n(q.tok("QUEUE_GAP"))} NEVER_RAN=${n(q.tok("QUEUE_NEVER_RAN_SUITES"))}套/${n(q.tok("QUEUE_NEVER_RAN_CASES"))}例 ERR_TAINTED=${n(q.tok("QUEUE_ERR_TAINTED_CASES"))} → ${(q.body.match(/^QUEUE_RESULT=.*/m) || [null])[0]}`);
gateRow(G.restarted, "verify-backend-restarted", `JVM pid=${n(jvmPid)} startedAt=${n(jvmStartedAt)} STALE_SOURCE=${n(G.restarted.kv("RESTARTED_STALE_SOURCE"))} → ${n(restartedVerdict)}`);
if (G.probe) gateRow(G.probe, "probe-real-env", `BACKEND=${n(G.probe.tok("PROBE_BACKEND"))} REACHABLE=${n(G.probe.tok("PROBE_ASSETS_REACHABLE"))} → ${n(G.probe.tok("PROBE_VERDICT"))}`);
else P(`| \`probe-real-env\` | 未复跑 | 无 | ${baseRow("probe-real-env") ? "基线行存在" : "台账 §1 无此行"} |`);
gateRow(G.i18n, "verify-i18n-orphan", `ZH=${n(G.i18n.tok("I18N_ZH_KEYS"))} EN=${n(G.i18n.tok("I18N_EN_KEYS"))} PAIR_DIFF=${n(G.i18n.tok("I18N_ZH_ONLY"))}+${n(G.i18n.tok("I18N_EN_ONLY"))} ORPHANS=${n(G.i18n.tok("I18N_ORPHANS"))}/允许${n(G.i18n.tok("I18N_ORPHANS_ALLOWED"))} → ${(G.i18n.body.match(/^I18N_RESULT=.*/m) || [null])[0]}`);
nonEmpty("corpus 扫到的 manifest 数", G.corpus.num("CORPUS_MANIFESTS"), "全域 0 份 manifest = 扫描集为空，corpus 的绿没有意义（该门自身也按此判红）");
nonEmpty("provenance 扫到的生产者数", G.provenance.re(/PROV_PRODUCERS=(\d+)/) === null ? null : Number(G.provenance.re(/PROV_PRODUCERS=(\d+)/)), "0 个 stamp 生产者 = 生产者侧审计静默 0 命中");
/* 门禁面板 = 决定"本次仍判红 N/M"的那一组。规则上有三点不像常识，写在这：
   ① corpus/provenance 收 **本轮 scope 版**（全域版红在 round-1 无 gitSha / 144 无日期戳这类历史上，
      那是"历史证据不可复用"的正确答案，但不该否决本轮收尾）；两版都仍在 H 节逐行打印；
   ② integrity 的**冻结 corpus 与重拍 corpus 各算一条**：那 6 组同字节状态对只有在新 corpus 里
      真的字节不同才算结案，旧 corpus 不会自己变干净 —— 两条并排，谁红一目了然，不做合并；
   ③ 重拍 corpus 那条在没跑定向补拍时是 null，filter 掉，**不给它一个默认 PASS 的位置**。 */
const gatePanel = [G.ledger, G.stateTruth, G.integrity, G.corpusScoped, G.provenanceScoped, G.queue, G.restarted, G.i18n].filter(Boolean);
const redNow = gatePanel.filter((r) => r.exitCode !== 0);
const redBase = baseSection.filter((l) => /^\|\s*[^-|]/.test(l) && /^\|[^|]*\|\s*1\s*\|/.test(l)).length;
/* 分母从面板数组算出来，不写死：写死过一次 "/ 7"，加第 8 道门时会静默少报总数 */
P(`- **本次仍判红：${redNow.length} / ${gatePanel.length}** —— ${redNow.map((r) => `\`${r.name}\`(${r.exitCode})`).join(" ") || "全绿"}`);
P(`- 轮初基线里退出码=1 的行数（从台账 §1 原文**数出来**的，不是记忆）：**${redBase}** ${LEDGER_SRC ? srcFile(LEDGER_SRC.path, "§1 退出码列") : "（基线文件读不到）"}`);
P(`- 口径注：门禁面板里的 corpus/provenance 是**本轮 scope** 版（${EVIDENCE_SCOPE}）；` +
  `全域版同表打印但只作历史口径（与轮初基线可比的是全域版，能否决本轮收尾的是 scope 版）。` +
  `integrity 分两类：**权威索引轴**（\`${SCREEN_MANIFEST}\`，由 scripts/qa/rebuild-frozen-manifest.mjs 从各 corpus 派生）进取决集，` +
  `逐 corpus 的**原始记录轴**只打印数字、不进取决集（同字节帧已被权威索引改判进 stateNotApplied[]，` +
  `原始 corpus 是采集时刻的原始记录、不改写也不删；它们的组数逐条进"一条不藏"那一节）；` +
  `\`--exec\` 分支的否决权本轮收窄为「只否决伪造」=证据里写了图片路径、既无 ERROR/timeout 注记、盘上又不存在，` +
  `自报失败的注记条目不再计红（tier 交不齐由 readjudicate-evidence/verify-queue-reconcile 记账），` +
  `这条改动有配对自检 scripts/qa/test-evidence-fabrication.cjs（含反向对照）；` +
  `ledger/state-truth 限定 \`${ROUND_DIR}\`；i18n 的孤儿走棘轮（配对差异一律判红，基线与理由见 scripts/qa/verify-i18n-orphan.mjs 顶部与台账 §74）。`);
for (const r of redNow) OPEN.push({ item: `门禁 ${r.name}`, why: `本次退出码 ${r.exitCode}（禁止静默收尾）` });
/* 全域版判红不进面板（不该让 round-1 没打戳的历史否决本轮收尾），但必须进"一条不藏"那一节，
   否则下一轮又会把过期证据当可复用件。 */
for (const r of [G.corpus, G.provenance]) {
  if (r && r.exitCode !== 0) OPEN.push({ item: `门禁 ${r.name}`, why: `本次退出码 ${r.exitCode} —— 历史口径红（round-1/2 无 gitSha 或无日期戳），不否决本轮，但那些证据不可复用` });
}
M.sources.gates = Object.fromEntries([...gatePanel, G.probe || { name: "probe-real-env", cmd: null, exitCode: null, sha8: null }]
  .filter((r) => r.name).map((r) => [r.name, { cmd: r.cmd, exitCode: r.exitCode, stdoutSha8: r.sha8 }]));
M.sources.gates.baseline = { file: LEDGER_SRC ? LEDGER_SRC.path : null, rowsRedAtStart: redBase, nowRed: redNow.map((r) => r.name) };

/* ---------- I ---------- */
P("");
P("## I. 本轮新立 / 新证缺陷（全部从门与判据的输出派生，不手写）");
P("");
let ndefect = 0;
if (!SKIP_LIVE) {
  const rings = [...G.g8.body.matchAll(/^RING(\d+)\s*\[(OK|MISS)\s*\]\s*(.*?)\s*::\s*(.*)$/gm)];
  const miss = rings.filter((m) => m[2] === "MISS");
  for (const m of miss) {
    ndefect++;
    P(`- **[D-G8-RING${m[1]}] G8 环「${m[3]}」= MISS** ${sg(G.g8, "RING" + m[1])}`);
    P(`  其 detail 原文（逐字，不缩写、不改标点）：`);
    P(`  \`\`\``);
    P(`  ${m[0].trim()}`);
    P(`  \`\`\``);
  }
  if (rings.length && !miss.length) { P(`- G8 本次 ${rings.length} 环全 OK（本节未从 G8 派生出新缺陷）${sg(G.g8, "G8_RINGS_OK")}`); }
}
if (restartedVerdict && !restartedVerdict.startsWith("PASS")) {
  ndefect++;
  P(`- **[D-JVM] 后端 JVM 早于最新 java 源码改动**：\`${(G.restarted.body.match(/^RESTARTED_RESULT=.*/m) || [null])[0]}\` ${sg(G.restarted, "RESTARTED_STALE_SOURCE")}`);
}
for (const [rec, key, tag] of [[G.stateTruth, /^STATE_FAIL_\d+/, "STATE"], [q, /^QUEUE_KEY_AXIS_HINT/, "KEYAXIS"], [G.integrity, /^EVIDENCE_DUP_STATE/, "DUPSTATE"], [G.ledger, /^LEDGER_MULTI_ID_FAMILIES=[1-9]/, "LEDGER"]]) {
  for (const l of rec.body.split("\n")) {
    if (!key.test(l)) continue;
    ndefect++;
    P(`- **[D-${tag}]** ${l.trim()} ${sg(rec, l.trim().split(/[=\s]/)[0])}`);
  }
}
if ((byStatus.running || []).length) {
  ndefect++;
  P(`- **[D-RUNNING] 半途中断的套件（status=running，不计入完成）**：${(byStatus.running || []).join(", ")} ${srcFile(CKPT_SRC ? CKPT_SRC.path : "(缺)", "suites[].status")}`);
}
if (tri) {
  const tl = (tri.buckets["locate-label-token-lost"] || 0), ha = (tri.buckets["harness-api"] || 0), to = (tri.buckets["timeout"] || 0);
  if (tl + ha + to) { ndefect++; P(`- **[D-HARNESS] 执行器自身缺陷类**（与被测物无关，不得记产品失败）：harness-api=${ha} / timeout=${to} / token-lost=${tl} → 合计 ${ha + to + tl} 行 ${sg(G.triage, "harness-api")}`); }
}
if (!ndefect) P(`- 未从任何门输出里派生出新缺陷项。**计数为 0 ≠ 没有缺陷**：C/D 节的 FAILED 与兜底桶仍在，见 J。`);
M.sources.defects = { derivedCount: ndefect };

/* ---------- I-bis：修复波逐项判据 ---------- */
/* 为什么必须单列一节：验收条要求"本轮所有 待修复/待复验 条目推到有据可查的终态"，
   而这句话的载体是 verify-fixes-against-artifact 的逐项 verdict，不是台账里那句自我声明。
   没有这一节，报告就只知道"套件跑完了"，不知道"116 条改动里哪几条真的看得见"。 */
P("");
P("## I-bis. 修复波逐项判据（静态侧终态，逐条来自 verdicts 件而非台账自述）");
P("");
const FIXV = readJsonSrc(".zcode/tmp/fixverify/verdicts.json", { optional: true, label: "修复判据台输出" });
if (!FIXV) {
  OPEN.push({ item: "I-bis 无来源：.zcode/tmp/fixverify/verdicts.json 缺失", why: "修复波静态终态无法逐项陈述，只能退回『台账自述已修』——那正是本轮要消灭的口径" });
  P("- 来源缺失，本节不产出任何数字（宁缺毋造）。");
} else {
  const fv = FIXV.json;
  const fvi = Array.isArray(fv.items) ? fv.items : [];
  const Buckets = ["ARTIFACT_VERIFIED", "SOURCE_ONLY", "NEEDS_UI_FRAME", "NOT_IN_EITHER", "UNDECIDABLE"];
  const cnt = {};
  for (const b of Buckets) cnt[b] = fvi.filter((x) => x.verdict === b).length;
  const sum = Buckets.reduce((s, b) => s + cnt[b], 0);
  const openBefore = fvi.filter((x) => /^待修复/.test(String((x.ledger || {}).status || ""))).length;
  const promoted = fvi.filter((x) => /^已修复待复验/.test(String((x.ledger || {}).status || ""))).length;
  P(`- 来源：\`${FIXV.path}\`（sha8=\`${FIXV.sha8}\`，items=${fvi.length}）；桶合计 ${sum}${sum === fvi.length ? " ✔ 守恒" : " ✘ 不守恒（差 ${fvi.length - sum}）"}`);
  P(`- 台账状态侧：本轮判据覆盖的条目里，仍写「待修复」**${openBefore}** 条、已推「已修复待复验」**${promoted}** 条。`);
  P("- 判据侧五桶：");
  for (const b of Buckets) P(`  - **${b} = ${cnt[b]}**`);
  P("- 桶语义（写死在这里，避免下一轮重新解释）：");
  P("  - `ARTIFACT_VERIFIED`＝修后状态在**被测产物**里命中，且该判点在修复前的 HEAD 里不存在（工具的 `grantingPredatesFix` 对照通过）；");
  P("  - `SOURCE_ONLY`＝只在源码树命中，产物是构建早于改动的旧件；**这条分支本轮起也过 HEAD 对照**，");
  P("    因为旧实现只对授绿路径做对照，会把 HEAD 里本来就有的老代码判成「本轮改的」（实测拦下 2 条假推进，见台账 §47）；");
  P("  - `NEEDS_UI_FRAME`＝静态两载体都判不了行为/观感，必须等定向重截帧；");
  P("  - `NOT_IN_EITHER`＝两载体都查不到预期修后状态（疑似未落地，逐条附检索串）；");
  P("  - `UNDECIDABLE`＝台账判据本身含糊（抠不出可比对物件、或只抠到会被构建改名的裸标识符）。");
  const stillNot = fvi.filter((x) => x.verdict === "NOT_IN_EITHER");
  P(`- \`NOT_IN_EITHER\` 逐条点名（${stillNot.length} 条，一条都不并拢）：`);
  for (const x of stillNot) P(`  - \`${x.id}\` —— ${String(x.verdictWhy || "").slice(0, 110)}`);
  const clash = fvi.filter((x) => /^待修复/.test(String((x.ledger || {}).status || "")) && (x.verdict === "ARTIFACT_VERIFIED" || x.verdict === "SOURCE_ONLY"));
  P(`- 状态与判据相互打脸的条数：**${clash.length}**（台账仍写待修复、判据却已在载体命中且非 HEAD 既存）。` +
    (clash.length ? "这些行必须当场改状态或在报告里说明为何不改，不允许两种口径同时留在台账里。" : "本轮已按 §47 批量推进并复核，无残留。"));
  /* 反方向更危险：台账已写「已修复待复验」，而判据台说两载体查不到——
     这一类要么是我的手工裁定（有 HEAD/产物对照依据），要么是工具的判点抽取噪声（如把
     update:modelValue 截成裸 modelValue）。两种都必须点名写出来，不能只报顺的那半边。 */
  const reverse = fvi.filter((x) => /^已修复待复验/.test(String((x.ledger || {}).status || "")) && x.verdict === "NOT_IN_EITHER");
  P(`- 反向不一致：**${reverse.length}** 条台账已推「已修复待复验」而判据台仍判 \`NOT_IN_EITHER\`：`);
  for (const x of reverse) P(`  - \`${x.id}\` —— 判据侧：${String(x.verdictWhy || "").slice(0, 100)}；` +
    `台账侧依据见其「状态证据」列与台账 §38/§40/§47 的手工裁定（构建早于改动、或判点被抽取器截短）。`);
  if (reverse.length) P("- 这类不一致不是报告自相矛盾，而是两条独立判据轴各自留痕：静态判据轴（产物/源码检索 + HEAD 对照）与手工三载体对照轴（git show HEAD 计数 + 编译产物 + 工作树）；两条都摆出来，不做合并、不互相替换。");
  M.sources.fixverify = { path: FIXV.path, sha8: FIXV.sha8, items: fvi.length, buckets: cnt, ledgerOpen: openBefore, ledgerPromoted: promoted, clash: clash.length };
}

/* ---------- J ---------- */
P("");
P("## J. 缺口 / 未判定 / 挂起（上面所有『判不了』归拢，一条不藏）");
P("");
P(`- 覆盖缺口：${n(q.tok("QUEUE_NEVER_RAN_SUITES"))} 套 / ${n(q.tok("QUEUE_NEVER_RAN_CASES"))} 例从未开跑，GAP=${n(q.tok("QUEUE_GAP"))} ${sg(q, "QUEUE_NEVER_RAN_CASES")}`);
P(`- 半途套件：${n((byStatus.running || []).length)} 个 \`status=running\`（其已记行数见 C 节套件表）${srcFile(CKPT_PATH, "suites[].status")}`);
for (const o of OPEN) P(`- ${o.item} —— ${o.why}`);
P("");
P("## 附 1：守恒核对全表（报告里每一条桶分解）");
P("");
P("| 分解 | 各项 | 合计 | 全体 | 结论 |");
P("|---|---|---|---|---|");
for (const c of CONSERVE) P(`| ${c.what} | ${c.parts.join(" + ")} | ${c.sum} | ${c.whole} | ${c.ok ? "CONSERVED ✔" : "**CONSERVED ✘**"} |`);
P(`- 合计 ${CONSERVE.length} 条分解，判红 ${CONSERVE.filter((c) => !c.ok).length} 条`);
P("");
P("## 附 2：本工具自判失败清单（任一条即非零退出；报告照写，但不得当作验收通过）");
P("");
if (!ERRORS.length) P("- （空）");
else for (const e of ERRORS) P(`1. ${e}`);
P("");
P(`> 本文件由 \`scripts/qa/emit-round-report.mjs\` 生成于 ${new Date().toISOString()}；机器可读同一份数据在 \`${OUT_METRICS}\`。`);

/* --------------------------------------------------------------- 落盘 */
mkdirSync(dirname(resolve(ROOT, OUT_REPORT)), { recursive: true });
function metricsDoc() {
  return {
    schemaVersion: "round-report-metrics-1",
    generatedAt: new Date().toISOString(),
    startedAt: T0.toISOString(),
    roundDir: ROUND_DIR,
    reportFile: OUT_REPORT,
    identity: {
      head: HEAD, porcelain, porcelainApps, jvmPid, jvmStartedAt,
      backendRestartVerdict: restartedVerdict, backendRestartExit: G.restarted.exitCode,
      mockBundleFingerprint: mockFp, realBundleFingerprint: realFp, bundleFingerprintInputs: FP_FILES,
      runnerNode: process.version, runnerPath: relPosix(process.execPath),
    },
    coverage: {
      plannedSuites: q.tonum("QUEUE_PLANNED_SUITES"), plannedCases: pc, recordedCases: rc, gap: gap,
      neverRanSuites: q.tonum("QUEUE_NEVER_RAN_SUITES"), neverRanCases: q.tonum("QUEUE_NEVER_RAN_CASES"), neverRanList: neverRan,
      errTainted: q.tonum("QUEUE_ERR_TAINTED_CASES"),
      requiresReal: { true: q.tonum("QUEUE_REQUIRES_REAL_TRUE"), false: q.tonum("QUEUE_REQUIRES_REAL_FALSE"), unlabeled: q.tonum("QUEUE_REQUIRES_REAL_UNLABELED") },
      ckptFile: CKPT_PATH, ckptStatuses: Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [k, v.length])),
      pendingManifestsFromCkpt: pending, ckptSuiteUnmappable: ckUnmappable,
    },
    execBoundary: M.sources.execBoundary || null,
    triage: M.sources.triage || null,
    evidence: M.sources.evidence || null,
    tour: M.sources.tour || null,
    live: M.sources.live || null,
    defects: M.sources.defects || null,
    gates: M.sources.gates || null,
    provenance: { files: PROV.files, commands: PROV.cmds },
    conservation: CONSERVE,
    failures: ERRORS,
    openItems: OPEN,
  };
}
writeFileSync(resolve(ROOT, OUT_METRICS), JSON.stringify(metricsDoc(), null, 2) + "\n", "utf8");
writeFileSync(resolve(ROOT, OUT_REPORT), L.join("\n") + "\n", "utf8");
console.log(`REPORT_WRITTEN=${OUT_REPORT} lines=${L.length}`);
console.log(`METRICS_WRITTEN=${OUT_METRICS}`);
console.log(`EMIT_HEAD=${HEAD || "?"} execRows=${execRows ? execRows.length : "?"}` + (sideA && sideB ? ` sideA=${sideA.length} sideB=${sideB.length} sum=${sideA.length + sideB.length}` : ""));
for (const c of CONSERVE) console.log(`CONSERVE ${c.ok ? "OK" : "FAIL"} ${c.what} ${c.parts.join("+")}=${c.sum} vs ${c.whole}`);
if (ERRORS.length) {
  console.log(`EMIT_RESULT=FAIL 自判失败 ${ERRORS.length} 条：`);
  for (const e of ERRORS) console.log("  ! " + e);
  process.exit(1);
}
console.log("EMIT_RESULT=OK 全部源可读、全部守恒断言通过");
