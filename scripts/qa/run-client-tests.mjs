/* 把客户端单测变成收尾里可重跑的一条门禁。
   为什么要单独一个载具：⑤ 要"全部门禁"，而单测此前只在我手动敲 npx 时跑过一次，
   证据落在 tmp/（gitignore，等于没交出去）。本脚本做三件事：
     1) 用**同一颗 node**（v22，PATH 里那颗是 v16，跑 vitest 会假红）跑 apps/client 的 vitest；
     2) 把完整输出留档到 reports/audit/round-7/（可提交），并在 stdout 只回放尾部摘要 + 机器可读计数行；
     3) 自己核对读数：日志里必须出现 "Test Files" 与 "Tests " 两行汇总，且失败数为 0 才判 OK
        —— 不看退出码一个人说了算（历史上"管道 tail 的退出码"骗过不止一次）。
   用法：node scripts/qa/run-client-tests.mjs [--out reports/audit/round-7/client-unit-tests.log] [--dry] */
import { spawnSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const KNOWN = new Set(["out", "dry"]);
for (const a of argv) if (a.startsWith("--") && !KNOWN.has(a.slice(2))) { console.log("CLIENTTEST_RESULT=FAIL reason=不认识的旗标 " + a); process.exit(2); }
const OUT = resolve(REPO, arg("out", "reports/audit/round-7/client-unit-tests.log"));

if (argv.includes("--dry")) { console.log("CLIENTTEST_DRY 会用 " + process.execPath + " 跑 apps/client 的 vitest 并留档 " + OUT.replace(REPO + "\\", "")); console.log("CLIENTTEST_RESULT=DRY"); process.exit(0); }

/* 从「去 ANSI 后」的 vitest 全文里按行读两条汇总（Test Files / Tests）。
   汇总行有两种形态，都必须读出 total/passed/failed：
     · 全绿："Test Files  117 passed (117)"、"Tests  1318 passed (1318)"
     · 有红："Test Files  1 failed | 116 passed (117)"、"Tests  1 failed | 1317 passed (1318)"
   红色跑里紧跟标签的是 "1 failed |"，所以任何只认「标签后紧邻 N passed」的旧式都会返回 null，
   把「跑满了 1318 个用例、1 个失败」的现场误判成「一行汇总都没读到」。
   这里改成：先按行锚定标签、再在整行内分别找 "N passed" / "N failed"，把行尾括号里的数当总数。 */
function parseVitestSummary(plain) {
  const grab = (label) => {
    const line = (plain.match(new RegExp("^\\s*" + label + "\\s+(.*)$", "m")) || [])[1];
    if (!line) return null;
    const num = (re) => { const m = line.match(re); return m ? Number(m[1]) : 0; };
    const passed = num(/(\d+) passed/);
    const failed = num(/(\d+) failed/);
    const total = num(/\((\d+)\)\s*$/);
    return { total: total || passed + failed, passed, failed };
  };
  return { files: grab("Test Files"), tests: grab("Tests") };
}

/* 不用 npx：Windows 下 spawnSync("npx.cmd") 在没有 shell 时根本起不来
   （现量：退出码=null、日志里一行输出都没有，被下面的汇总行断言掐成 FAIL）。
   直接拿**同一颗 node** 去跑 vitest 自己的入口，路径从 package.json 的 bin 读，
   读不到就明确 FAIL——绝不退回 npx 再赌一次。 */
const VITEST_ENTRIES = [
  join(REPO, "apps/client/node_modules/vitest/vitest.mjs"),
  join(REPO, "apps/client/node_modules/vitest/vitest.js"),
];
const VITEST = VITEST_ENTRIES.find((p) => existsSync(p));
if (!VITEST) { console.log("CLIENTTEST_RESULT=FAIL reason=找不到 apps/client 里的 vitest 入口（" + VITEST_ENTRIES.join(" 或 ") + "）⇒ 不猜别的调用方式"); process.exit(2); }
const r = spawnSync(process.execPath, [VITEST, "run", "--config", "vitest.config.ts"], {
  cwd: join(REPO, "apps/client"), encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 25 * 60 * 1000,
});
const out = String(r.stdout || "") + String(r.stderr || "") + (r.error ? "\n[spawn error] " + r.error.message : "");
writeFileSync(OUT, "[命令] " + process.execPath + " " + VITEST + " run --config vitest.config.ts\n[退出码] " + r.status + (r.error ? " error=" + r.error.message : "") + "\n" + out);
/* vitest 的汇总行里夹着 ANSI 颜色转义（现量：日志里搜得到 "Test Files"，但按 \s+ 匹配数字匹配不上），
   所以断言前先去转义 —— 否则"跑过 1318 个用例"的证据会被读成"一行汇总都没有"。 */
const plain = out.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");
const sum = parseVitestSummary(plain);
console.log("CLIENTTEST_LOG=" + OUT.replace(REPO + "\\", "") + " 退出码=" + r.status);
if (!sum.files || !sum.tests) {
  /* 两条汇总行都读不出数字 ⇒ 只承认「读数不可得」，绝不臆断「没跑到用例」。
     上一版把解析失败当成「根本没跑到用例」是对被测对象的误判（现量红色跑明明跑满了 1318 个用例，
     只是旧正则遇到 "1 failed |" 打头就 null）。这里 FAIL 的是「读不到」，而非「跑不到」。 */
  console.log("CLIENTTEST files=(读数不可得) tests=(读数不可得) failed=(读数不可得)");
  console.log("CLIENTTEST_RESULT=FAIL reason=vitest 汇总行读不出数字 ⇒ 读数不可得（不许据此断言没跑到用例，也不许拿退出码当过）");
  process.exit(2);
}
console.log("CLIENTTEST files=" + sum.files.passed + " tests=" + sum.tests.passed + " failed=" + sum.tests.failed
  + " files_total=" + sum.files.total + " files_failed=" + sum.files.failed
  + " tests_total=" + sum.tests.total + " tests_failed=" + sum.tests.failed);
if (sum.tests.failed || sum.files.failed || r.status !== 0) { console.log("CLIENTTEST_RESULT=FAIL reason=有失败用例（files " + sum.files.failed + " failed、tests " + sum.tests.failed + " failed）或退出码非 0（完整输出见 " + OUT.replace(REPO + "\\", "") + "）"); process.exit(2); }
console.log("CLIENTTEST_RESULT=OK —— 汇总行齐、failed=0、退出码 0，三者同时成立才算过");
