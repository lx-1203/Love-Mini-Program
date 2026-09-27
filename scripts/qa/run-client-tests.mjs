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
const mFiles = plain.match(/Test Files\s+(\d+) passed(?:\s*\((\d+)\))?/);
const mTests = plain.match(/Tests\s+(\d+) passed(?:\s*\((\d+)\))?/);
const mFail = plain.match(/(\d+) failed/);
const failed = Number((mFail && mFail[1]) || 0);
console.log("CLIENTTEST_LOG=" + OUT.replace(REPO + "\\", "") + " 退出码=" + r.status);
console.log("CLIENTTEST files=" + (mFiles ? mFiles[1] : "(没读到汇总)") + " tests=" + (mTests ? mTests[1] : "(没读到汇总)") + " failed=" + failed);
if (!mFiles || !mTests) { console.log("CLIENTTEST_RESULT=FAIL reason=日志里没有 vitest 的汇总行 ⇒ 这次跑根本没跑到用例（不许拿退出码当过）"); process.exit(2); }
if (failed || r.status !== 0) { console.log("CLIENTTEST_RESULT=FAIL reason=有失败用例或退出码非 0（完整输出见 " + OUT.replace(REPO + "\\", "") + "）"); process.exit(2); }
console.log("CLIENTTEST_RESULT=OK —— 汇总行齐、failed=0、退出码 0，三者同时成立才算过");
