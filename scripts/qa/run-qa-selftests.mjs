#!/usr/bin/env node
/* QA 自检聚合器：把 scripts/qa/test-* 一次跑完并汇总。
   为什么要有这个文件：本轮新增了 6 个 test-*.cjs，但**没有任何一处会去跑它们**——
   "建了门禁却没人接线"是本轮已公开批评过 3 次的同一类失败（tcheck 没进验收命令、
   停轮旗标没人测、状态真值工具零调用点）。聚合器就是那条接线。
   规则：
   - 需要 UI 租约的测试（会连 DevTools、会占锁）默认**不跑**，但要显式打印 SKIPPED 与原因；
     想跑用 QA_SELFTEST_ALLOW_UI=1。
   - 扫描集为空一律 exit 2：一个"什么都没跑到却报绿"的聚合器比没有更糟。
   - 每个测试单独计时并抓它的 SUMMARY 行（这些脚本自带上限断言数，聚合器据此核数字）。
   用法：node scripts/qa/run-qa-selftests.mjs [--verbose]
*/
import { readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const UI_BOUND = new Set(["test-stop-flag.cjs"]); // 要占 UI 租约/连模拟器的，默认跳过
const ALLOW_UI = process.env.QA_SELFTEST_ALLOW_UI === "1";
const VERBOSE = process.argv.includes("--verbose");

const files = existsSync(HERE)
  ? readdirSync(HERE).filter((f) => /^test-.+\.(cjs|mjs)$/.test(f)).sort()
  : [];

console.log(`SELFTEST_DIR=${basename(HERE)}/test-*  发现=${files.length}  node=${process.execPath}`);
if (!files.length) {
  console.log("SELFTEST_RESULT=FAIL reason=一个测试文件都没扫到（扫描集为空不许判绿）");
  process.exit(2);
}

let failed = 0, ran = 0, skipped = 0, noSummary = 0;
for (const f of files) {
  const p = join(HERE, f);
  if (UI_BOUND.has(f) && !ALLOW_UI) {
    skipped++;
    console.log(`SKIP  ${f}  原因=需要 UI 租约（会连 DevTools/占锁），默认不跑；要跑设 QA_SELFTEST_ALLOW_UI=1`);
    continue;
  }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [p], { cwd: REPO, encoding: "utf8", timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  /* 自报计数有两种既有写法，都得认（首版只认 "assertion failures ="，
     于是把 4 个本来正常的测试误判成"不可信"——聚合器的口径必须跟上仓库现状，不是反过来）：
       新：`SUMMARY: assertion failures = 0`
       旧：`EVT_SUMMARY cases=5 fail=0` + `EVT_TEST=PASS` */
  const mNew = out.match(/assertion failures = (\d+)/);
  const mOld = out.match(/^\w{2,8}_SUMMARY\b.*?\bfail=(\d+)/m);
  const cnt = mNew ? Number(mNew[1]) : (mOld ? Number(mOld[1]) : null);
  const selfVerdict = out.match(/\b([A-Z]{2,8})_(?:TEST|RESULT)=(PASS|FAIL)\b/);
  const ok = r.status === 0 && cnt === 0 && !(selfVerdict && selfVerdict[2] !== "PASS");
  ran++;
  if (cnt === null) noSummary++;
  console.log(`${ok ? "PASS " : "FAIL "} ${f}  exit=${r.status}  ${cnt === null ? "无自报断言计数（不可信）" : `断言失败数=${cnt}`}  ${selfVerdict ? `${selfVerdict[1]}_TEST=${selfVerdict[2]}` : "无 *_TEST= 判据行"}  ${Math.round((Date.now() - t0) / 1000)}s`);
  if (!ok && out) console.log(out.split("\n").filter((l) => /FAIL|Error|error|≠/.test(l)).slice(0, 12).map((l) => "      | " + l.slice(0, 160)).join("\n"));
  if (!ok) failed++;
}

const passable = ran + skipped;
console.log(`SELFTEST_RAN=${ran} SKIPPED=${skipped} FAILED=${failed} NO_SUMMARY_LINE=${noSummary} 覆盖文件=${ran + skipped}/${files.length}`);
if (ran + skipped !== files.length) { console.log("SELFTEST_RESULT=FAIL reason=有测试文件既没跑也没记为跳过"); process.exit(2); }
if (ran === 0 && !ALLOW_UI) { console.log("SELFTEST_RESULT=FAIL reason=全部测试都被跳过（没有一个离线测试可跑 = 接线是空的）"); process.exit(2); }
/* ── 门自己的 --selftest 也要有人跑（wiring 车道 2026-09-29 接的第三处）──────────────
   上面那条扫描规则是 ^test-.+\.(cjs|mjs)$，按**文件名**收 ⇒ 它永远收不到 verify-*.mjs。
   verify-dry-no-lease.mjs 带 5 条自对照（:94-113，含"先抢租约、dry 在后面才判 ⇒ 必须 RISK"这条
   本轮真实事故形状），建完同样是"没人跑"—— 一条自检没有运行器，和一条门没有消费者是同一个病。
   所以这里显式列门自检，与 test-* 同罪同罚：任一不过 ⇒ failed++ ⇒ SELFTEST_RESULT=FAIL 且非 0 退出。
   计数单独开一行 GATE_SELFTESTS_*，不混进上面 files.length 的守恒（那是 test-* 的账，
   混进去会让 :63 的"有测试文件既没跑也没记为跳过"假红）。 */
const GATE_SELFTESTS = [
  { name: "verify-dry-no-lease", cmd: ["scripts/qa/verify-dry-no-lease.mjs", "--selftest"], want: /DRYLEASE_SELFTEST=PASS cases=(\d+) bad=0/ },
];
let gateRan = 0, gateFailed = 0;
for (const g of GATE_SELFTESTS) {
  const gr = spawnSync(process.execPath, g.cmd, { cwd: REPO, encoding: "utf8", timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
  const gout = `${gr.stdout || ""}${gr.stderr || ""}`;
  const gm = gout.match(g.want);
  const gok = gr.status === 0 && !!gm;
  gateRan++;
  if (!gok) gateFailed++;
  console.log(`${gok ? "PASS " : "FAIL "} ${g.name} --selftest  exit=${gr.status}  ${gm ? gm[0] : "退出码 0 但没抓到它自报的 PASS 行（不可信，按失败算）"}`);
  if (!gok && gout) console.log(gout.split("\n").filter((l) => /BAD|FAIL|Error|error/.test(l)).slice(0, 12).map((l) => "      | " + l.slice(0, 160)).join("\n"));
}
console.log(`GATE_SELFTESTS_RAN=${gateRan} GATE_SELFTESTS_FAILED=${gateFailed}`);
failed += gateFailed;
console.log(failed ? `SELFTEST_RESULT=FAIL（${failed}/${ran + gateRan} 个离线测试与门自检未过）` : `SELFTEST_RESULT=PASS（${ran} 个离线测试 + ${gateRan} 条门自检全绿，${skipped} 个 UI 绑定测试按策略跳过）`);
process.exit(failed ? 1 : 0);
