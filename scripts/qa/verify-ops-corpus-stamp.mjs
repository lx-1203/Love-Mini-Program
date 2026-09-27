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
 *   node scripts/qa/verify-ops-corpus-stamp.mjs --check [--ops 目录] [--stamp 戳文件]
 *   node scripts/qa/verify-ops-corpus-stamp.mjs --queue scripts/qa/ui-queue.round7-stage6.json
 *   node scripts/qa/verify-ops-corpus-stamp.mjs --selftest
 * 退出码：0=一致 / 1=语料漂移或队列腿读的不是同一份 / 2=扫描集为空、戳读不到等前置失败（宁可红也不空过）。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
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

/* ---------------- selftest：负例必须真的能红 ---------------- */
if (has("selftest")) {
  const T = join(repo, "tmp", "qa", "ops-stamp-selftest");
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
  rmSync(T, { recursive: true, force: true });
  console.log(`STAMP_SELFTEST 负例=3 结果=${bad.length ? "FAIL" : "PASS"}`);
  for (const b of bad) console.log("  BAD " + b);
  process.exit(bad.length ? 1 : 0);
}

/* ---------------- queue：一条队列里所有执行腿是否读同一份语料 ---------------- */
if (has("queue")) {
  const qf = resolve(repo, arg("queue"));
  if (!existsSync(qf)) { console.log("STAMP_RESULT=FAIL reason=队列文件读不到 " + qf); process.exit(2); }
  const q = JSON.parse(readFileSync(qf, "utf8"));
  const legs = q.legs || q || [];
  const DEF = "reports/audit/round-6/ops";
  const eff = new Map();
  let execLegs = 0;
  for (const l of legs) {
    /* 队列腿的真实形状（本轮实测）：顶层是数组，每条腿是 {name, file, args[], timeoutMin, why}，
       脚本路径在 file 里、不在 args 里；早期写法只看 l.cmd，于是 24 条腿识别出 0 条执行腿。
       识别失败没有静默放过，而是走 execLegs=0 的前置红——但一个永远识别不出来的判据等于没有判据。 */
    const cmd = [l.file || l.script || l.cmd || ""].concat(Array.isArray(l.args) ? l.args : String(l.args || "").split(/\s+/)).join(" ");
    if (!/r-exec-(cli|ws)\.mjs/.test(cmd)) continue;
    execLegs++;
    const m = cmd.match(/--ops[= ](\S+)/);
    const dir = (m ? m[1] : DEF).split(sep).join("/");
    if (!eff.has(dir)) eff.set(dir, []);
    eff.get(dir).push(l.name || cmd.slice(0, 40));
  }
  console.log(`STAMP_QUEUE=${rel(qf)} 执行腿=${execLegs} 不同语料目录=${eff.size}`);
  for (const [d, names] of eff) console.log(`  OPS_DIR=${d} 腿数=${names.length} 默认值=${d === DEF ? "是（未带 --ops）" : "否（显式）"} 腿=${names.join(",")}`);
  if (!execLegs) { console.log("STAMP_RESULT=FAIL reason=队列里一条执行腿都没识别出来，识别口径本身要先查"); process.exit(2); }
  if (eff.size > 1) { console.log("STAMP_RESULT=FAIL reason=同一轮执行腿读了不止一份语料 ⇒ 这一轮的判据版本不一致，1107 例不可整体引用"); process.exit(1); }
  console.log("STAMP_RESULT=PASS 队列执行腿语料目录唯一");
  process.exit(0);
}

/* ---------------- write / check ---------------- */
const OPS = resolve(repo, arg("ops", "reports/audit/round-6/ops"));
const fp = fingerprint(OPS);
if (fp.err) { console.log(`STAMP_RESULT=FAIL reason=${fp.err}`); process.exit(2); }

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
