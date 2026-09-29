/**
 * 用例语料版本戳（v3.2 配套工具）。
 *
 * 为什么要它（本轮实测出来的洞）：
 *  1. 执行器 scripts/qa/r-exec-cli.mjs:43 的默认语料目录是 reports/audit/round-6/ops，而本轮 24 条队列腿
 *     没有一条带 --ops ⇒ 「1107 例执行轮」绑的是哪一版判据，此前只能靠 mtime 猜。脚本
 *     scripts/qa/freeze-ops-copy.mjs 的存在就是要解决这件事，但它的产物 round-7/ops 被引用次数为 0，
 *     而且内容停在 2026-09-25 15:19 —— 一份没人读的"冻结副本"比没有副本更危险：读它的人会以为自己读的是
 *     本轮语料（我本轮就差点在这里读错一次）。
 *  2. 更根本的是：副本本身不证明任何东西，**戳**才证明。跑完之后哪怕原目录被改过，只要每腿开跑前记过一次
 *     内容哈希，就能机器判明"这一轮的 1107 例是不是同一版判据"。
 *
 * 用法：
 *   node scripts/qa/verify-ops-corpus-stamp.mjs --write [--ops 目录] [--out 戳文件]
 *       （目标戳已存在时先复制成 <戳>.pre-stamp-write.<yyyymmdd-hhmmss>.bak 再覆写，
 *        并印一行 STAMP_BACKUP=<路径>／STAMP_BACKUP=none（首次盖章）—— 2026-09-29 丢基线事故的补，见 §写/读保护注释）
 *   node scripts/qa/verify-ops-corpus-stamp.mjs --check [--ops 目录] [--stamp 戳文件]
 *   node scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-stage6.json
 *   node scripts/qa/verify-ops-corpus-stamp.mjs --selftest   （素材写在 os.tmpdir()，不落在仓里）
 * 退出码：0=一致 / 1=语料漂移、队列腿读的不是同一份、或有读语料的腿定不出目录 / 2=扫描集为空、戳读不到、
 * 队列里有认不出来历的腿、以及 NA（本波压根没有读语料的腿）等前置失败（宁可红也不空过）。
 *
 * --queue 的三种判决（v3.3 补的口径，此前只有 PASS/FAIL 两种，于是纯取景波次只能撞在"一条执行腿都没识别出来"上）：
 *   PASS  队列里所有读语料的腿指向同一个目录
 *   FAIL  指向不止一个目录 / 有读语料的腿定不出目录 / 有腿认不出脚本来历（识别口径自己先有问题）
 *   NA    队列的腿全都点名识别了，但这一波没有任何一条读判据台（纯开窗口 + 取景 + 门腿）
 *         ⇒ 判据版本不由这一波决定，本门无话可说。NA 既不印 PASS 也不印 FAIL，退出码走 2：
 *           run-ui-queue.mjs:146-150 只在 leg.advisory 时放行"后面的腿"，而 :154 把任何非 0 计入
 *           QUEUE_RESULT=FAIL，所以这条波尾门照旧带 advisory:true —— 2 不会让别的腿 NOT_RUN（不挡波），
 *           而 0 会把"这一问没答过"记成 OK，正是本仓「没跑的门不算通过」要防的那件事。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync, statSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve, dirname, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (f, d) => { const i = argv.indexOf("--" + f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const rel = (p) => relative(repo, p).split(sep).join("/");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/* 模式旗标拼错 = 一个模式都没命中 = 静默什么都不查。这里宁可 exit 2。 */
const KNOWN_FLAGS = ["write", "check", "copy", "queue", "selftest", "ops", "out", "stamp"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN_FLAGS.includes(a.slice(2)));
  if (bad.length) {
    console.log(`STAMP_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 本门只认 ${KNOWN_FLAGS.join(",")}（拼错模式名会一个模式都不跑，静默绿比红更坏）`);
    process.exit(2);
  }
}

/* 稳定序列化：递归排序对象键。理由——执行器按字段名取值，键序变了不影响判据；
   但任何字段值（正文、tier、requiresReal、tapTarget…）变了必须被戳抓到。 */
function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}

// 一个语料目录的指纹：逐文件（排序）+ 目录级聚合
function fingerprint(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return { err: "目录不存在或不是目录: " + rel(dir) };
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) return { err: "目录里没有任何 .json 用例清单: " + rel(dir) };
  const per = [];
  let cases = 0;
  for (const f of files) {
    const raw = readFileSync(join(dir, f), "utf8");
    let j = null;
    try { j = JSON.parse(raw); } catch (e) { return { err: `${rel(dir)}/${f} 解析失败：${e.message}` }; }
    const cs = j.cases || j.items || [];
    if (!Array.isArray(cs) || !cs.length) return { err: `${rel(dir)}/${f} 没有非空的 cases/items 数组` };
    const ids = cs.map((c) => String(c.id));
    if (new Set(ids).size !== ids.length) return { err: `${rel(dir)}/${f} 内部有重复 id（同一清单里同名用例会让 merge 覆盖，戳无法归因）` };
    cases += cs.length;
    per.push({
      file: f,
      n: cs.length,
      canon: sha256(stableStringify(cs)),      // 只看判据内容：键序/空白变化不算漂移
      bytes: sha256(raw),                       // 再看字节：格式化类改动单独归到这里
      ids: sha256(ids.slice().sort().join(",")),  // 用例名册：只增删 id 时 canon 一定会变，单列是为了报"是改名还是改文"
    });
  }
  return {
    dir: rel(dir),
    files: per.length,
    cases,
    canon: sha256(per.map((p) => p.file + ":" + p.canon).join("\n")),
    bytes: sha256(per.map((p) => p.file + ":" + p.bytes).join("\n")),
    per,
  };
}

function gitSha() {
  try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(); }
  catch { return ""; }
}

/* ---------------- 队列腿「读不读判据台」的识别口径 ----------------
   为什么要这张表（本轮实测）：--queue 此前只认 /r-exec-(cli|ws)\.mjs/，于是纯取景波次
   （ui-queue.round8g-guestreshoot.json：开窗口 + shoot-frameplan + 量门口）永远量出 执行腿=0，
   门答不出自己那个问题，只能报"识别口径本身要先查"。查下去的结论不是"表太窄"这么简单：
   表太窄会漏，表乱放宽会把"根本没读语料的腿"算成语料腿、拿一个我替它猜的默认目录去盖章 ——
   后者比 0 更坏。所以每一行都得带 file:line 证据，认不出的走 FAIL 而不是默认不读。

   legacy:true 的是本门一开始就认的两类；其余是本轮逐脚本读参数补进来的。 */
const DEF_OPS = "reports/audit/round-6/ops";
const CORPUS_READERS = [
  { script: "r-exec-cli.mjs", flag: "ops", legacy: true,
    why: "r-exec-cli.mjs:43 arg(\"ops\", 默认 round-6/ops) ⇒ :240 readdirSync(OPS) / :469 readFileSync(join(OPS,name+\".json\"))" },
  { script: "r-exec-ws.mjs", flag: "ops", legacy: true,
    why: "r-exec-ws.mjs:63 opt(\"ops\", …/round-6/ops) ⇒ :569 readdirSync(OPS) / :587、:749 readFileSync(join(OPS,…))" },
  { script: "triage-exec-failures.mjs", flag: "ops",
    why: "triage-exec-failures.mjs:375 arg(\"ops\", 默认 round-6/ops) ⇒ :380 readdirSync(OPS) / :381 readFileSync(path.join(OPS,f))（判据台盖章字段是它的豁免依据）" },
  { script: "verify-case-selectors-exist.mjs", flag: "ops",
    why: "verify-case-selectors-exist.mjs:223 arg(\"ops\", 默认 round-6/ops) ⇒ :106 readdirSync(OPS) / :111 readFileSync(join(OPS,f))" },
  { script: "verify-guest-landing.mjs", flag: "ops",
    why: "verify-guest-landing.mjs:54 arg(\"ops\", 默认 round-6/ops) ⇒ :67 readdirSync(OPS_DIR) / :68 readFileSync(join(OPS_DIR,f))（名册由判据台派生）" },
  { script: "verify-real-coverage.mjs", flag: "ops",
    why: "verify-real-coverage.mjs:65 arg(\"ops\", 默认 round-6/ops) ⇒ :73 readdirSync(OPS) / :74 readFileSync(join(OPS,f))" },
  { script: "tag-ops-identity-scope.mjs", flag: "ops",
    why: "tag-ops-identity-scope.mjs:30 arg(\"ops\", 默认 round-6/ops) ⇒ :115 readdirSync(OPS) / :181 readFileSync(join(OPS,f))；--apply 还会改写它 ⇒ 改写腿更要判进同一版" },
  { script: "freeze-ops-copy.mjs", flag: "from",
    why: "freeze-ops-copy.mjs:39 arg(\"from\", 默认 round-6/ops) ⇒ :42 readdirSync(FROM) / :45 sha(join(FROM,f))；--to 是副本落点不是判据来源，故目录只取 --from" },
];

/* 点名不读语料的腿（同样要给 file:line，否则"不读"是我说的而不是我读的）。
   verify-ops-corpus-stamp 自己也必须在这一栏：--queue 分支只解析队列 JSON，而 --copy 读的是
   round-7/ops 冻结副本 —— 它与 round-6/ops 不同目录是设计使然，把盖章动作当成执行腿会让每一波都假红。 */
const NONCORPUS_LEGS = [
  { script: "shoot-frameplan.mjs",
    why: "只读 --plan 取景配方（shoot-frameplan.mjs:68 默认 reports/audit/round-7/frameplan-merged.json）与 --project 产物(:67/:298)；全文不取 ops 目录，配方是帧清单不是判据正文" },
  { script: "tour-r6.mjs",
    why: "配置全靠 TOUR_* 环境变量（tour-r6.mjs:82-100）与 scripts/r11-param-map.json(:112)，无 --ops/--corpus 旗标，不读判据台" },
  { script: "emit-frameplan-additions.mjs",
    why: "读 --classify 复判产物(:37) 与 --matrix 台账(:39)，参数表里没有 ops/corpus 目录" },
  { script: "verify-ops-corpus-stamp.mjs",
    why: "本门自身：has(\"queue\") 分支只读队列 JSON，不碰 OPS；--write/--check 是「盖章」这个动作，--copy 读的是冻结副本 ⇒ 计入会造成每波假红" },
];

/* 没点名的脚本先扫它自己的源码：沾了判据台目录却没登记 ⇒ 认不出 = FAIL（宁可红，
   不能把"这张表还没写到它"读成"它不读语料"）。 */
const CORPUS_TRACE = /(arg|opt|flag)\(\s*["'](?:ops|corpus|from)["']|["']corpus["']|readdirSync\(\s*(OPS|OPS_DIR|FROM)\b|audit[/\\]round-\d+[/\\]ops/;
const traceCache = new Map();
function sourceTakesCorpus(scriptPath) {
  if (traceCache.has(scriptPath)) return traceCache.get(scriptPath);
  let r;
  try { r = CORPUS_TRACE.test(readFileSync(resolve(repo, scriptPath), "utf8")) ? "unregistered" : "clean"; }
  catch { r = "missing"; }
  traceCache.set(scriptPath, r);
  return r;
}

function legCmd(l) {
  return [l.file || l.script || l.cmd || ""].concat(
    Array.isArray(l.args) ? l.args : String(l.args || "").split(/\s+/)).join(" ");
}
function legScriptPath(l) { return String(l.file || l.script || l.cmd || "").trim(); }

/* 目录归一：反斜杠折成 /、去引号；仓库内的绝对路径折回相对路径，免得同一个目录被算成两份。 */
function normalizeDir(v) {
  let s = String(v).replace(/^["']+|["']+$/g, "").split(sep).join("/");
  if (/^[A-Za-z]:\//.test(s) || s.startsWith("/")) {
    const rr = rel(resolve(repo, s));
    if (!rr.startsWith("..")) s = rr;
  }
  return s.replace(/\/+$/, "");
}

/* 一条读语料的腿，它的判据台目录：旗标带值 ⇒ 用值；没带旗标 ⇒ 用该脚本的真实默认；
   带旗标却没带值（--ops 结尾，或后面紧跟下一个旗标）⇒ undetermined，由调用方判红，绝不替它猜。 */
function legCorpusDir(cmd, flag) {
  const m = cmd.match(new RegExp("--" + flag + "[= ](\\S+)"));
  if (m) return m[1].startsWith("--") ? { undetermined: true } : { dir: normalizeDir(m[1]) };
  if (new RegExp("--" + flag + "(=|$|\\s)").test(cmd)) return { undetermined: true };
  return { dir: DEF_OPS, viaDefault: true };
}

function findReader(scriptPath, cmd) {
  const base = scriptPath.split(/[/\\]/).pop();
  const byName = CORPUS_READERS.find((r) => r.script === base)
    || CORPUS_READERS.find((r) => new RegExp("[/\\\\]" + r.script.replace(/\./g, "\\.") + "$").test(scriptPath));
  if (byName) return byName;
  if (!NONCORPUS_LEGS.some((r) => r.script === base)) {
    /* 旧口径就是整条 cmd 里出现脚本名就算（l.cmd 写成一条命令串的形状）；保留它，
       免得放宽识别的同时把原来认得出的腿反而认丢了。 */
    const loose = CORPUS_READERS.find((r) => cmd.includes(r.script));
    if (loose) return loose;
  }
  return null;
}

function classifyQueue(legs) {
  const out = { corpus: [], noncorpus: [], unknown: [], undetermined: [], dirs: new Map() };
  for (const l of legs) {
    const cmd = legCmd(l);
    const sp = legScriptPath(l);
    const name = l.name || cmd.slice(0, 40);
    const script = sp.split(/[/\\]/).pop() || sp;
    const reader = findReader(sp, cmd);
    if (reader) {
      const d = legCorpusDir(cmd, reader.flag);
      const rec = { name, script: reader.script, kind: reader.script.replace(/\.mjs$/, ""), legacy: !!reader.legacy, viaDefault: !!d.viaDefault };
      if (d.undetermined) { out.undetermined.push(rec); out.corpus.push({ ...rec, undetermined: true }); continue; }
      rec.dir = d.dir;
      out.corpus.push(rec);
      if (!out.dirs.has(d.dir)) out.dirs.set(d.dir, []);
      out.dirs.get(d.dir).push(name);
      continue;
    }
    const proven = NONCORPUS_LEGS.find((r) => r.script === sp.split(/[/\\]/).pop());
    if (proven) { out.noncorpus.push({ name, script: proven.script, why: proven.why }); continue; }
    const trace = sourceTakesCorpus(sp);
    if (trace === "unregistered") out.unknown.push({ name, script, why: "源码里取判据台目录（CORPUS_TRACE 命中）却不在识别表内 ⇒ 先登记它读哪一份，再让本门盖章" });
    else if (trace === "missing") out.unknown.push({ name, script, why: "脚本文件读不到 ⇒ 无从证明它读不读判据台" });
    else out.noncorpus.push({ name, script, why: "源码不沾判据台目录（CORPUS_TRACE 未命中）" });
  }
  return out;
}

function queueVerdict(c, totalLegs) {
  if (c.unknown.length) {
    return { token: "FAIL", code: 2, reason: `有 ${c.unknown.length} 条腿认不出脚本来历（${c.unknown.map((x) => x.name + ":" + x.script).join(",")}），识别口径本身要先查` };
  }
  if (!totalLegs) return { token: "FAIL", code: 2, reason: "队列里一条腿都没有 ⇒ 没有可认证的波次（不是「没有读语料的腿」）" };
  if (c.undetermined.length) {
    return { token: "FAIL", code: 1, reason: `读语料的腿里 ${c.undetermined.length} 条定不出判据台目录（${c.undetermined.map((x) => x.name + ":" + x.script).join(",")} 带旗标却没带值）⇒ 不能替它猜一份目录再盖章` };
  }
  if (!c.corpus.length) {
    return { token: "NA", code: 2, reason: `本波无读语料的腿（${c.noncorpus.length} 条腿已逐条点名，判据版本不由这一波决定 ⇒ 不记 PASS）` };
  }
  if (c.dirs.size > 1) {
    return { token: "FAIL", code: 1, reason: "同一轮执行腿读了不止一份语料 ⇒ 这一轮的判据版本不一致，1107 例不可整体引用" };
  }
  return { token: "PASS", code: 0 };
}

/* 渲染与判决分家：--queue 打印它，--selftest 拿旧队列的原文比对它（回归就长在这儿）。 */
function queueReport(qfRel, c, totalLegs) {
  const v = queueVerdict(c, totalLegs);
  const lines = [`STAMP_QUEUE=${qfRel} 执行腿=${c.corpus.length} 不同语料目录=${c.dirs.size}`];
  for (const [d, names] of c.dirs) lines.push(`  OPS_DIR=${d} 腿数=${names.length} 默认值=${d === DEF_OPS ? "是（未带 --ops）" : "否（显式）"} 腿=${names.join(",")}`);
  const grown = c.corpus.filter((x) => !x.legacy);
  if (grown.length || c.unknown.length || c.undetermined.length || v.token === "NA") {
    const kinds = {};
    for (const x of c.corpus) kinds[x.kind] = (kinds[x.kind] || 0) + 1;
    lines.push(`  识别口径=语料腿${c.corpus.length}[${Object.entries(kinds).map(([k, n]) => k + "×" + n).join(",")}] 其中本轮新增识别=${grown.length} 非语料腿=${c.noncorpus.length} 认不出=${c.unknown.length} 定不出目录=${c.undetermined.length}`);
  }
  for (const x of c.undetermined) lines.push(`  语料定不出=${x.name} 脚本=${x.script}（--${(CORPUS_READERS.find((r) => r.script === x.script) || {}).flag} 旗标在、值不在）`);
  for (const x of c.unknown) lines.push(`  认不出腿=${x.name} 脚本=${x.script} 因=${x.why}`);
  if (v.token === "NA") for (const x of c.noncorpus) lines.push(`  点名腿=${x.name} 脚本=${x.script} 读语料=否（${x.why}）`);
  if (v.token === "PASS") lines.push("STAMP_RESULT=PASS 队列执行腿语料目录唯一");
  else if (v.token === "NA") lines.push(`STAMP_RESULT=${v.token} reason=${v.reason}`);
  else lines.push(`STAMP_RESULT=FAIL reason=${v.reason}`);
  return { lines, verdict: v };
}

/* ---------------- selftest：负例必须真的能红 ---------------- */
if (has("selftest")) {
  /* 素材写在 os.tmpdir()，不落进仓：此前它写 repo/tmp/qa/ops-stamp-selftest，
     而本仓的规矩是 tmp/qa/ 与 reports/ 由排队器独占（自测素材混进去会被账当证据读）。 */
  const T = join(tmpdir(), "qoder-ops-stamp-selftest");
  rmSync(T, { recursive: true, force: true });
  const A = join(T, "a"), B = join(T, "b"), C = join(T, "c");
  mkdirSync(A, { recursive: true }); mkdirSync(B, { recursive: true }); mkdirSync(C, { recursive: true });
  const mk = (id, text, extra) => ({ id, title: "t", pre: "p", action: "a", expected: text, tier: "normal", ...(extra || {}) });
  const base = [mk("X1", "落点必须是登录页"), mk("X2", "协议默认未勾选")];
  writeFileSync(join(A, "P1.json"), JSON.stringify({ cases: base }, null, 1));
  writeFileSync(join(B, "P1.json"), JSON.stringify({ cases: base }, null, 2));      // 只差缩进 ⇒ 字节变、判据不变
  writeFileSync(join(C, "P1.json"), JSON.stringify({ cases: [mk("X1", "落点必须是首页"), mk("X2", "协议默认未勾选")] }, null, 1)); // 改正文 ⇒ 必须红
  const fa = fingerprint(A), fb = fingerprint(B), fc = fingerprint(C);
  const bad = [];
  if (fa.err || fb.err || fc.err) bad.push("前置：指纹算不出来 " + [fa.err, fb.err, fc.err].filter(Boolean).join(" / "));
  else {
    if (fa.canon !== fb.canon) bad.push("纯缩进改动被判成了判据漂移 ⇒ canon 过度敏感（会把格式化当成改判）");
    if (fa.bytes === fb.bytes) bad.push("纯缩进改动没被字节戳抓到 ⇒ bytes 轴失效，无法区分「改判据」与「重排版」");
    if (fa.canon === fc.canon) bad.push("改了 expected 正文却判不出漂移 ⇒ 本工具的负例根本不成立，任何 --check 都是假绿");
    if (fa.cases !== 2 || fb.cases !== 2) bad.push("用例数守恒不成立：fa=" + fa.cases + " fb=" + fb.cases);
  }
  // 空目录必须红（不允许"没扫到"等于"没问题"）
  const E = join(T, "empty"); mkdirSync(E, { recursive: true });
  if (!fingerprint(E).err) bad.push("空语料目录被当成合法（必须前置失败）");

  /* ---- 队列识别口径的负例：每一条都得能真的落到那个判决上 ---- */
  const L = (name, file, args) => ({ name, file: "scripts/qa/" + file, args: args || [] });
  const Q = [];
  let qc = 0;
  const V = (legs) => queueReport("x.json", classifyQueue(legs), legs.length);
  const qcase = (label, legs, want, mustInclude) => {
    qc++;
    const { lines, verdict } = V(legs);
    const got = verdict.token + "/" + verdict.code;
    if (got !== want) Q.push(label + " 判决=" + got + " 应为 " + want + " ⇒ " + lines.join(" ⏎ "));
    else if (mustInclude && !lines.join("\n").includes(mustInclude)) Q.push(label + " 输出里没有「" + mustInclude + "」：" + lines.join(" ⏎ "));
    return lines;
  };

  // 1) 回归：只由 r-exec-* 组成的队列，输出必须与放宽口径之前逐字节相同
  const legacy = qcase("旧口径回归", [L("exec-A", "r-exec-cli.mjs"), L("exec-ws", "r-exec-ws.mjs")], "PASS/0");
  const legacyWant = [
    "STAMP_QUEUE=x.json 执行腿=2 不同语料目录=1",
    "  OPS_DIR=reports/audit/round-6/ops 腿数=2 默认值=是（未带 --ops） 腿=exec-A,exec-ws",
    "STAMP_RESULT=PASS 队列执行腿语料目录唯一",
  ];
  if (legacy.join("⏎") !== legacyWant.join("⏎")) Q.push("旧口径回归：逐字节不同 ⇒ 放宽识别把 r-exec-only 的输出改了\n  现=" + legacy.join(" ⏎ ") + "\n  原=" + legacyWant.join(" ⏎ "));
  // 显式 --ops 一份：仍 PASS，且默认值口径要跟着翻成"否（显式）"
  qcase("显式同目录", [L("exec-A", "r-exec-cli.mjs", ["--ops", "reports/audit/round-7/ops"]), L("exec-B", "r-exec-ws.mjs", ["--ops=reports/audit/round-7/ops"])], "PASS/0", "默认值=否（显式）");
  // 2) 新增识别的腿与 r-exec 读同一份 ⇒ 仍一份（round8-stage8 的真实形状）
  qcase("exec+triage 同目录", [L("exec-A", "r-exec-cli.mjs"), L("triage-A", "triage-exec-failures.mjs"), L("realcov", "verify-real-coverage.mjs", ["--round", "round-7"])], "PASS/0", "识别口径=语料腿3[");
  // 3) 两条读语料的腿指向不同目录 ⇒ 必须红（本门存在的意义就是能红）
  qcase("两份语料", [L("exec-A", "r-exec-cli.mjs", ["--ops", "reports/audit/round-6/ops"]), L("exec-B", "r-exec-ws.mjs", ["--ops", "reports/audit/round-7/ops"])], "FAIL/1", "不止一份语料");
  // 4) 读语料的腿 --ops 带了旗标没带值 ⇒ 不能替它猜，必须红（"无法盖章"要响）
  qcase("目录定不出", [L("exec-A", "r-exec-cli.mjs"), L("exec-B", "r-exec-ws.mjs", ["--ops", "--tap"])], "FAIL/1", "定不出判据台目录");
  // 5) 纯取景波次：腿都点名识别了，但没有一条读判据台 ⇒ NA（不 PASS、不冒充缺陷红）
  qcase("取景波次NA", [L("open-window", "open-project-window.mjs", ["--project", "apps/client/dist/build/mp-weixin"]), L("reshoot", "shoot-frameplan.mjs", ["--plan", "reports/audit/round-7/frameplan-round7-final.json"]), L("gate", "verify-frame-debt-coverage.mjs"), L("stamp", "verify-ops-corpus-stamp.mjs", ["--queue", "scripts/qa/x.json"])], "NA/2", "点名腿=reshoot");
  // 6) 真的读判据台却没登记的腿（拿仓里现成的 verify-case-automatable.mjs:30 当活样本）⇒ 红，不许当"不读"
  qcase("未登记语料腿", [L("exec-A", "r-exec-cli.mjs"), L("automatable", "verify-case-automatable.mjs")], "FAIL/2", "认不出");
  // 7) 脚本文件读不到 ⇒ 无从证明它读不读 ⇒ 红
  qcase("脚本缺失", [L("ghost", "no-such-leg.mjs")], "FAIL/2", "认不出");
  // 8) 空队列 ≠ 没有读语料的腿：前者是坏队列（FAIL），后者才是 NA
  qcase("空队列", [], "FAIL/2", "一条腿都没有");
  // 9) 表本身不许漂移：本轮逐脚本读参数读出来的结论要留在表里
  for (const s of ["r-exec-cli.mjs", "r-exec-ws.mjs", "triage-exec-failures.mjs"]) {
    if (!CORPUS_READERS.some((r) => r.script === s)) Q.push("识别表少了确实读语料的腿 " + s);
  }
  for (const s of ["shoot-frameplan.mjs", "tour-r6.mjs", "emit-frameplan-additions.mjs"]) {
    if (!NONCORPUS_LEGS.some((r) => r.script === s)) Q.push("识别表没有点名「确实不读语料」的腿 " + s);
    if (CORPUS_READERS.some((r) => r.script === s)) Q.push("把不读语料的腿错登成语料腿 " + s + "（会拿我替它猜的默认目录盖章）");
  }
  /* ---- 写戳保护：--write 覆写已有戳必须留下"逐字节等于旧戳"的备份 ----
     为什么端到端 spawn 自己、而不是直接调 backupStamp：本仓反复吃过"负例永远不变红"——
     只测 helper 的话，把 --write 分支里那一次调用删掉，这条断言照样绿。spawn 真实 CLI 才能让
     "删掉备份调用"与"把备份挪到覆写之后"这两种破法必然落到本断言上。
     素材仍全在 os.tmpdir() 的 T 里：--out 指到 T，绝不碰仓里的 reports/audit/round-7/ops-corpus-stamp.json。 */
  const W = join(T, "write"), WC = join(W, "corpus");
  mkdirSync(WC, { recursive: true });
  const WOUT = join(W, "stamp.json");
  const runWrite = () => {
    try {
      return { code: 0, body: execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--write", "--ops", WC, "--out", WOUT], { cwd: repo, encoding: "utf8" }) };
    } catch (e) { return { code: e.status == null ? -1 : e.status, body: String(e.stdout || "") + String(e.stderr || "") }; }
  };
  const baks = () => readdirSync(W).filter((f) => f.startsWith("stamp.json.pre-stamp-write.") && f.endsWith(".bak")).sort();
  const bakLine = (s) => (s.match(/^STAMP_BACKUP=.*$/m) || ["(没打出 STAMP_BACKUP 行)"])[0];
  let wc = 0;
  const WR = [];
  // 1) 首次盖章：盘上没有旧戳 ⇒ 不许凭空产生 .bak，且要如实报 none（首次盖章）
  writeFileSync(join(WC, "P1.json"), JSON.stringify({ cases: base }, null, 1));
  let wr = runWrite(); wc++;
  if (wr.code !== 0) WR.push("首次盖章 --write 退出码=" + wr.code + "（应为 0）：" + wr.body.slice(0, 200));
  else if (bakLine(wr.body) !== "STAMP_BACKUP=none（首次盖章）") WR.push("首次盖章应报「STAMP_BACKUP=none（首次盖章）」，现=" + bakLine(wr.body));
  else if (baks().length) WR.push("首次盖章根本没有旧戳，却产生了备份：" + baks().join(","));
  // 2) 覆写：旧戳存在 ⇒ 必须留下恰好一个备份，内容逐字节等于旧戳，且现戳已经不是旧戳（防"覆写之后才复制"）
  const oldStamp1 = readFileSync(WOUT, "utf8");
  writeFileSync(join(WC, "P1.json"), JSON.stringify({ cases: [...base, mk("X3", "第三条用例")] }, null, 1));
  wr = runWrite(); wc++;
  if (wr.code !== 0) WR.push("覆写 --write 退出码=" + wr.code + "：" + wr.body.slice(0, 200));
  else {
    const b = baks();
    const printed = bakLine(wr.body).slice("STAMP_BACKUP=".length);
    if (b.length !== 1) WR.push("旧戳存在却没有恰好 1 个备份（实得 " + b.length + " 个：" + (b.join(",") || "无") + "）⇒ --write 又在裸覆写，本轮丢基线走的正是这条路；打印行=" + bakLine(wr.body));
    else {
      if (!/^stamp\.json\.pre-stamp-write\.\d{8}-\d{6}(\.\d+)?\.bak$/.test(b[0])) WR.push("备份名不合口径（应形如 stamp.json.pre-stamp-write.<yyyymmdd-hhmmss>.bak）：" + b[0]);
      if (readFileSync(join(W, b[0]), "utf8") !== oldStamp1) WR.push("备份内容不等于旧戳 ⇒ 备的不是那一份：bak=" + sha256(readFileSync(join(W, b[0]), "utf8")).slice(0, 12) + " ≠ 旧戳=" + sha256(oldStamp1).slice(0, 12));
      if (readFileSync(WOUT, "utf8") === oldStamp1) WR.push("覆写后现戳仍逐字节等于旧戳 ⇒ 根本没写进去，备份断言无从判起");
      if (printed.split(/[/\\]/).pop() !== b[0]) WR.push("STAMP_BACKUP 报的路径与盘上备份不符：printed=" + printed + " 盘上=" + b[0]);
    }
  }
  // 3) 连续覆写：上一次的底不许被下一次撞掉（同秒撞名是"留了底却又丢一次"的形状）
  const oldStamp2 = readFileSync(WOUT, "utf8");
  writeFileSync(join(WC, "P1.json"), JSON.stringify({ cases: [...base, mk("X3", "第三条用例"), mk("X4", "第四条用例")] }, null, 1));
  wr = runWrite(); wc++;
  if (wr.code !== 0) WR.push("第三次 --write 退出码=" + wr.code + "：" + wr.body.slice(0, 200));
  else {
    const b = baks(), got = b.map((f) => readFileSync(join(W, f), "utf8"));
    if (b.length !== 2) WR.push("连续两次覆写只留下 " + b.length + " 个备份（应为 2）⇒ 撞名时把上一次的底覆掉了：" + b.join(","));
    else {
      if (!got.includes(oldStamp1)) WR.push("第一份旧戳底在第三次盖章后已不在盘上（被后续备份顶掉）");
      if (!got.includes(oldStamp2)) WR.push("第二次覆写的旧戳底没留下（三次盖章后只剩别的）");
    }
  }
  bad.push(...WR.map((x) => "写戳保护：" + x));
  bad.push(...Q.map((x) => "队列口径：" + x));
  rmSync(T, { recursive: true, force: true });
  console.log(`STAMP_SELFTEST_DIR=${T}（仓外临时目录，rmSync 收尾）`);
  console.log(`STAMP_SELFTEST 负例=3 队列口径=${qc} 写戳保护=${wc} 表内语料腿=${CORPUS_READERS.length} 表内非语料腿=${NONCORPUS_LEGS.length} 结果=${bad.length ? "FAIL" : "PASS"}`);
  for (const b of bad) console.log("  BAD " + b);
  process.exit(bad.length ? 1 : 0);
}

/* ---------------- queue：一条队列里所有执行腿是否读同一份语料 ---------------- */
if (has("queue")) {
  const qf = resolve(repo, arg("queue"));
  if (!existsSync(qf)) { console.log("STAMP_RESULT=FAIL reason=队列文件读不到 " + qf); process.exit(2); }
  const q = JSON.parse(readFileSync(qf, "utf8"));
  const legs = q.legs || q || [];
  /* 队列腿的真实形状（本轮实测）：顶层是数组，每条腿是 {name, file, args[], timeoutMin, why}，
     脚本路径在 file 里、不在 args 里。识别交给 classifyQueue —— 认不出的腿走 FAIL，不静默算"不读语料"。 */
  const c = classifyQueue(Array.isArray(legs) ? legs : []);
  const { lines, verdict } = queueReport(rel(qf), c, (Array.isArray(legs) ? legs : []).length);
  for (const l of lines) console.log(l);
  process.exit(verdict.code);
}

/* ---------------- write / check ---------------- */
const OPS = resolve(repo, arg("ops", "reports/audit/round-6/ops"));
const fp = fingerprint(OPS);
if (fp.err) { console.log(`STAMP_RESULT=FAIL reason=${fp.err}`); process.exit(2); }

/* ---------------- --write 的落盘保护 ----------------
   为什么加它（2026-09-29 实测事故，登记在 reports/audit/round-7/stamp-baseline-loss-v33.md）：
   本门的全部价值就是"某时刻语料内容的基线"，而 --write 此前是单行 writeFileSync 裸覆写、一个备份都不留。
   上一轮为了落 86 行欠账按 sanctioned 路径重打了戳，旧戳里 24 份 manifest 的逐文件 canon 基线当场消失——
   于是"哪些文件在我动手之前就已经漂移"这个本门本该回答的问题再也答不出（旧戳当时未跟踪、无 git 底、无 .bak）。
   盖章这个动作自己更不能无底：目标已存在 ⇒ 先复制成带时间戳的 .bak 再覆写，并把路径机器可读地印出来。 */
function stampTs(d) {
  const p2 = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
}

/* 返回备份路径；目标不存在（首次盖章）返回 null。必须在 writeFileSync 之前调用 —— 事后复制到的是新戳。 */
function backupStamp(target, now = new Date()) {
  if (!existsSync(target)) return null;
  let bak = `${target}.pre-stamp-write.${stampTs(now)}.bak`;
  /* 同一秒内跑两次 --write（排队器里很常见）会撞名：撞了就顺延 .2/.3。
     "覆写而不留底"正是丢基线的成因，不能在保护逻辑里重演一次。 */
  for (let i = 2; existsSync(bak); i++) bak = `${target}.pre-stamp-write.${stampTs(now)}.${i}.bak`;
  copyFileSync(target, bak);
  return bak;
}

if (has("write")) {
  const out = resolve(repo, arg("out", "reports/audit/round-7/ops-corpus-stamp.json"));
  const rec = {
    kind: "ops-corpus-stamp",
    at: new Date().toISOString(),
    gitSha: gitSha(),
    opsDir: fp.dir,
    files: fp.files,
    cases: fp.cases,
    canonSha: fp.canon,
    byteSha: fp.bytes,
    perFile: fp.per,
    note: "本轮 1107 例执行轮所绑判据版本的内容戳；--check 复算不一致即视为跑的过程中语料被改过。",
  };
  mkdirSync(dirname(out), { recursive: true });
  /* 备份先于覆写，且路径先于覆写打印出去：writeFileSync 万一中途抛了，旧戳至少已经在 .bak 里，
     终端也看得见底落在哪。 */
  const bak = backupStamp(out);
  console.log(`STAMP_BACKUP=${bak ? rel(bak) : "none（首次盖章）"}`);
  writeFileSync(out, JSON.stringify(rec, null, 1));
  const sum = fp.per.reduce((a, x) => a + x.n, 0);
  if (sum !== fp.cases) { console.log(`STAMP_RESULT=FAIL reason=守恒不成立 逐文件相加=${sum} ≠ 总数=${fp.cases}`); process.exit(2); }
  console.log(`STAMP_WRITE=${rel(out)} OPS=${fp.dir} files=${fp.files} cases=${fp.cases} canon=${fp.canon.slice(0, 12)} bytes=${fp.bytes.slice(0, 12)}`);
  console.log("STAMP_RESULT=PASS");
  process.exit(0);
}

if (has("check")) {
  const sp = resolve(repo, arg("stamp", "reports/audit/round-7/ops-corpus-stamp.json"));
  if (!existsSync(sp)) { console.log(`STAMP_RESULT=FAIL reason=戳文件不存在 ${rel(sp)}（先 --write，别把"没记过"读成"没改过"）`); process.exit(2); }
  const rec = JSON.parse(readFileSync(sp, "utf8"));
  const diffs = [];
  const byName = new Map(fp.per.map((p) => [p.file, p]));
  for (const old of rec.perFile || []) {
    const now = byName.get(old.file);
    if (!now) { diffs.push(`${old.file} 从语料里消失了（此前 ${old.n} 例）`); continue; }
    if (now.canon !== old.canon) {
      diffs.push(`${old.file} 判据内容变了：canon ${old.canon.slice(0, 10)}→${now.canon.slice(0, 10)} ${now.ids === old.ids ? "名册未变⇒是正文/字段值被改（改判风险）" : "名册也变了⇒用例增删或改名"}`);
    } else if (now.bytes !== old.bytes) {
      diffs.push(`${old.file} 只有字节变了、判据 canon 未变 ⇒ 格式化/重排序，不影响判决但需说明来源`);
    }
    if (now.n !== old.n) diffs.push(`${old.file} 用例数 ${old.n}→${now.n}`);
  }
  for (const p of fp.per) if (!(rec.perFile || []).some((o) => o.file === p.file)) diffs.push(`${p.file} 是新出现的语料文件（${p.n} 例，戳里没有）`);
  console.log(`STAMP_OPS=${fp.dir} files=${fp.files} cases=${fp.cases} canon=${fp.canon.slice(0, 12)} 戳记=${rec.canonSha.slice(0, 12)} 记于=${rec.at} gitSha=${rec.gitSha || "?"} 当前gitSha=${gitSha()}`);
  if (diffs.length) {
    for (const d of diffs.slice(0, 30)) console.log("  DRIFT " + d);
    if (diffs.length > 30) console.log(`  DRIFT …另 ${diffs.length - 30} 条`);
    console.log(`STAMP_RESULT=FAIL 漂移文件=${diffs.length}（同轮内语料被改过 ⇒ 早跑的腿与晚跑的腿判的不是同一版正文，须重跑或按改动点定向复测）`);
    process.exit(1);
  }
  if (rec.cases !== fp.cases) {
    console.log(`STAMP_RESULT=FAIL reason=逐文件全同但总数不同 记=${rec.cases} 量=${fp.cases} ⇒ 本工具自己的守恒破了，先看 perFile 再看结论`);
    process.exit(2);
  }
  console.log(`STAMP_RESULT=PASS 语料与戳一致（cases=${fp.cases} 与记录相同，判据内容零漂移）`);
  process.exit(0);
}

/* ---------------- copy：核对一份"冻结副本"是否就是戳里那一版 ----------------
   为什么还要副本：戳只能回答"有没有变"，回答不了"变到哪去了"。scripts/qa/freeze-ops-copy.mjs 造的就是
   这份副本，但它此前被引用次数为 0，产物 reports/audit/round-7/ops 的内容还停在 2026-09-25 —— 一份没人核对
   的"冻结副本"比没有更危险：读它的人以为自己读的是本轮语料。本模式把副本与戳对上，副本第一次有了用途。 */
if (has("copy")) {
  const sp = resolve(repo, arg("stamp", "reports/audit/round-7/ops-corpus-stamp.json"));
  const CD = resolve(repo, arg("copy"));
  if (!existsSync(sp)) { console.log(`STAMP_RESULT=FAIL reason=戳文件不存在 ${rel(sp)}（先 --write）`); process.exit(2); }
  const rec = JSON.parse(readFileSync(sp, "utf8"));
  const fp2 = fingerprint(CD);
  if (fp2.err) { console.log(`STAMP_RESULT=FAIL reason=${fp2.err}`); process.exit(2); }
  const byName = new Map(fp2.per.map((p) => [p.file, p]));
  const bad = [];
  for (const old of rec.perFile || []) {
    const now = byName.get(old.file);
    if (!now) { bad.push(`${old.file} 副本里没有`); continue; }
    if (now.canon !== old.canon) bad.push(`${old.file} 判据内容与戳不同 ${old.canon.slice(0, 10)}≠${now.canon.slice(0, 10)}`);
  }
  for (const p of fp2.per) if (!(rec.perFile || []).some((o) => o.file === p.file)) bad.push(`${p.file} 是戳里没有的文件`);
  console.log(`STAMP_COPY=${fp2.dir} files=${fp2.files} cases=${fp2.cases} canon=${fp2.canon.slice(0, 12)} 戳=${rec.canonSha.slice(0, 12)} 目录级一致=${fp2.canon === rec.canonSha ? "yes" : "no"}`);
  if (bad.length) {
    for (const b of bad.slice(0, 30)) console.log("  COPY_DIFF " + b);
    console.log(`STAMP_RESULT=FAIL 副本与戳不符（${bad.length} 处）⇒ 这份副本不能当本轮语料引用`);
    process.exit(1);
  }
  if (fp2.canon !== rec.canonSha) {
    console.log("STAMP_RESULT=FAIL reason=逐文件都对但目录级 canon 不同 ⇒ 文件集合本身变了（增删了清单文件）");
    process.exit(1);
  }
  console.log(`STAMP_RESULT=PASS 副本即戳里那一版（cases=${fp2.cases}，与本轮执行腿所读语料逐文件同内容）`);
  process.exit(0);
}

console.log("用法：--write | --check | --copy <目录> | --queue <file> | --selftest（详见文件头注释）");
process.exit(2);
