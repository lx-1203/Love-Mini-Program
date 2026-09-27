#!/usr/bin/env node
/** 跑一条 package.json 脚本并把"成功"判出来（给排队器当腿用）。
 *  为什么要包一层：排队器只会 `node <file> <args>`，而产物重建是 npm script；
 *  更要紧的是 npm 退出码 0 不等于构建成功（uni build 在部分告警路径上仍返回 0），
 *  所以对构建类脚本额外要求输出里出现成功标记，否则非零退出，让排队器**停在那条腿上**而不是继续往下盖。
 *  判据按脚本自身形态选（见 classify）：一条全局标记表会把"成功时什么都不打"的脚本判成假红，
 *  实测过一次 —— typecheck=vue-tsc --noEmit 干净通过时输出 60 字节，标记命中 0/2 ⇒ FAIL。
 *  用法：node scripts/qa/run-npm-script.mjs --cwd apps/client --script build:mp-weixin:mock
 *       [--allow-notes "pattern1,pattern2"] [--dry] [--selftest]
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CWD = resolve(REPO, arg("cwd", "apps/client"));
const SCRIPT = arg("script", "");
const DRY = process.argv.includes("--dry");
/* 构建成功标记：uni build 会打 "Build complete" 或 vite 的 "built in"。两个都认，缺一个都不算成。 */
const SUCCESS = [/Build\s+complete/i, /built in\s+\d/i];

/* 脚本形态分类 —— 从 package.json 里那条命令本身推，不在这里维护第二张名单，
   否则脚本改了命令而名单没改，判据就会悄悄失效（同"免罪锚点被反掉"那一类）。
   认不出来的一律 UNREGISTERED 直接 FAIL：宁可漏跑一条腿，不要"什么都没打也算成"。
   （第一版把默认写成宽松档，selftest 里 "--noEmit 那条样本" 立刻变成永真断言 —— 删掉整条规则它仍然绿。） */
const CLASSES = [
  /* 顺序有意义：一条命令里既有构建又有 --noEmit 时，按严格档（要求构建标记）判。 */
  { id: "mp-build", re: /uni\s+build\s+--platform|vite\s+build|build-real-isolated/, markers: SUCCESS },
  { id: "silent-check", re: /--noEmit\b/, markers: null },
];
function classify(cmd) {
  const c = CLASSES.find((x) => x.re.test(cmd));
  return c || { id: "UNREGISTERED", re: null, markers: undefined };
}
/* 判据：
   带 markers 的档 —— 退出码 0 且命中至少一个成功标记（保住包一层的原始理由）。
   silent-check —— 退出码 0 且输出里没有任何失败证据；这类工具成功时可能什么都不打，
                   要求标记必然假红，所以反过来只禁止"看得见失败"。 */
function judge(kind, status, out) {
  const cls = typeof kind === "string" ? CLASSES.find((c) => c.id === kind) : kind;
  if (!cls || cls.id === "UNREGISTERED") return { ok: false, reason: "该脚本没有登记成功判据：先在 CLASSES 里加一条，并在 selftest 里补一条能变红的样本" };
  if (status !== 0) return { ok: false, reason: "退出码非 0" };
  if (cls.markers) {
    const hit = cls.markers.filter((re) => re.test(out));
    return hit.length > 0 ? { ok: true, reason: `命中 ${hit.length}/${cls.markers.length} 个「${cls.id}」标记` }
      : { ok: false, reason: `退出码 0 但没有「${cls.id}」成功标记（uni 在告警路径上仍返回 0）` };
  }
  const bad = out.match(/error TS\d+|Found \d+ error|\bFAIL\b|Test Files.*failed|✗/gi) || [];
  return bad.length === 0 ? { ok: true, reason: "「silent-check」静默通过且无失败证据" }
    : { ok: false, reason: "输出含失败证据 " + bad.slice(0, 3).join(" / ") };
}

function selftest() {
  /* 每条负例都必须"有能力变红"：断言的是 judge 在该输入下判 FAIL，
     不是"跑起来没崩"。少一个标记就退化成永真。 */
  const cases = [
    { n: "build 成功（有标记）", cmd: "uni build --platform mp-weixin", s: 0, o: "Build complete\nbuilt in 41s", want: true },
    { n: "build 假成功（退出 0 无标记）", cmd: "uni build --platform mp-weixin", s: 0, o: "warning: something", want: false },
    { n: "build 非零退出", cmd: "uni build --platform mp-weixin", s: 1, o: "Build complete", want: false },
    { n: "typecheck 干净（几乎无输出）", cmd: "vue-tsc --noEmit", s: 0, o: "> vue-tsc --noEmit\n", want: true },
    { n: "typecheck 有 error TS", cmd: "vue-tsc --noEmit", s: 0, o: "src/x.ts(1,2): error TS2345: nope", want: false },
    { n: "typecheck 非零退出", cmd: "vue-tsc --noEmit", s: 2, o: "", want: false },
    { n: "未登记脚本不得放行", cmd: "node scripts/whatever.mjs", s: 0, o: "all good", want: false },
    { n: "--noEmit 与 build 同时出现时按严格档", cmd: "uni build --platform x; tsc --noEmit", s: 0, o: "no markers here", want: false },
  ];
  let bad = 0;
  for (const c of cases) {
    const got = judge(classify(c.cmd), c.s, c.o).ok;
    if (got !== c.want) { bad++; console.log(`  NPS_SAMPLE_BAD ${c.n} got=${got} want=${c.want}`); }
  }
  console.log(`NPMSCRIPT_SELFTEST=${bad === 0 ? "PASS" : "FAIL"} cases=${cases.length} bad=${bad}`);
  process.exit(bad === 0 ? 0 : 1);
}
if (process.argv.includes("--selftest")) selftest();


if (!SCRIPT) { console.log("NPMSCRIPT_RESULT=FAIL reason=缺 --script"); process.exit(2); }
if (DRY) { console.log(`NPMSCRIPT_RESULT=DRY cwd=${CWD.replace(REPO + "/", "")} script=${SCRIPT}`); process.exit(0); }

/* Windows 上直接 spawnSync("npm.cmd", …) 会被 Node ≥20 以 EINVAL 拒掉（cmd 注入的那条安全修复）。
   优先用 node 直接跑 npm 自己的 JS 入口（在安装目录下），拿不到才退回 shell:true。
   两条路都要跑通才算数 —— 第一版只写了 npm.cmd 那条，腿秒挂。 */
const npmCandidates = [
  join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
  join(dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
];
const npmCli = npmCandidates.find((p) => existsSync(p));
let r;
if (npmCli) {
  console.log(`NPMSCRIPT 走 node ${npmCli.replace(REPO + "/", "")} run ${SCRIPT}`);
  r = spawnSync(process.execPath, [npmCli, "run", SCRIPT], { cwd: CWD, encoding: "utf8", maxBuffer: 1 << 27, timeout: 1800000, windowsHide: true });
} else {
  console.log("NPMSCRIPT 找不到 npm-cli.js ⇒ 退回 shell:true（cmd 解释，参数只有脚本名）");
  r = spawnSync("npm", ["run", SCRIPT], { cwd: CWD, encoding: "utf8", maxBuffer: 1 << 27, timeout: 1800000, windowsHide: true, shell: true });
}
const out = (r.stdout || "") + "\n" + (r.stderr || "");
let cmd = "";
try { cmd = (JSON.parse(readFileSync(join(CWD, "package.json"), "utf8")).scripts || {})[SCRIPT] || ""; } catch (e) { console.log("NPMSCRIPT 读不到 package.json ⇒ 判不了脚本形态，按 UNREGISTERED 处理：" + e.message); }
const cls = classify(cmd);
const v = judge(cls, r.status, out);
const hit = (cls.markers || SUCCESS).filter((re) => re.test(out)).map((re) => String(re));
console.log(`NPMSCRIPT cwd=${CWD.replace(REPO + "/", "")} script=${SCRIPT} class=${cls.id} cmd=${(cmd || "?").slice(0, 90)}`);
console.log(`NPMSCRIPT cwd=${CWD.replace(REPO + "/", "")} script=${SCRIPT} exit=${r.status} 标记=${hit.length} 输出字节=${Buffer.byteLength(out)} 判据=${v.reason}`);
/* 全文落盘：以前只把"最后 14 行含 error 的话"打到 stdout，于是一次失败的构建
   在重跑成功后就再也查不到成因（本轮 mock 档就是这样：第一次 exit=1，第二次 exit=0，
   现场只留下 npm error 那 5 行）。判据不变，但证据必须留得下来。 */
try {
  const logDir = resolve(REPO, "tmp", "qa", "npm-logs");
  mkdirSync(logDir, { recursive: true });
  const logPath = join(logDir, `${SCRIPT.replace(/[^\w.-]/g, "_")}-${new Date().toISOString().replace(/[:.]/g, "-")}-exit${r.status === null ? "null" : r.status}.log`);
  writeFileSync(logPath, `# script=${SCRIPT}\n# cwd=${CWD}\n# cmd=${cmd}\n# exit=${r.status}\n# spawnError=${r.error ? r.error.message : ""}\n\n${out}`);
  console.log("NPMSCRIPT_LOG=" + logPath.replace(REPO + "/", ""));
} catch (e) { console.log("NPMSCRIPT_LOG=写失败（不影响判据）" + String(e.message).slice(0, 80)); }
for (const l of out.split(/\r?\n/).filter((x) => /error|Error|ERROR|fail|✗|Build complete|built in/.test(x)).slice(-14)) console.log("  | " + l.slice(0, 200));
if (r.error) console.log("  SPAWN_ERR " + String(r.error.message).slice(0, 160));
console.log(`NPMSCRIPT_RESULT=${v.ok ? "OK" : "FAIL"}（${v.reason}）`);
process.exit(v.ok ? 0 : 1);

