/* verify-evidence-integrity --exec 轴的「只否决伪造」自检。
 *
 * 为什么要专门写这个测试：我把这条轴的否决条件从「任何 ERROR 注记 或 断链」收窄成
 * 「只有断链（没有错误注记、盘上又不存在的图片引用）才计红」。收窄一个门禁的否决权
 * 属于危险改动 —— 如果新判据抓不到真伪造，G6 就变成"永远绿"的摆设，而本轮已经为这类
 * 「can-never-fail checker」付过学费。所以每条正例都配反向对照，并且显式测：
 *   - 真伪造必须仍然判红（EXECUTED 行、FAILED 行都测，证明我没有按状态放水）
 *   - 自报失败的注记条目不再否决（旧判据在同一份输入上会判红 ⇒ 用例真的能判出差别）
 *   - 其它轴（孤儿帧）不受这次收窄影响：exec 全绿时目录里有未引用帧仍然 exit 1
 * 用法：node scripts/qa/test-evidence-fabrication.cjs
 *
 * 标签写法有一条硬规矩（本轮实测出来的自伤）：断言标签里**不能**出现 `XXX_RESULT=FAIL` / `XXX_TEST=PASS` 原形，
 * 因为聚合器 run-qa-selftests 取的是输出里**第一个** `[A-Z]{2,8}_(TEST|RESULT)=(PASS|FAIL)` ——
 * 我把 "EVIDENCE_RESULT=FAIL" 写在 D 用例的说明文字里，12 条断言全过却被判成 "1/12 测试失败"。
 * 要引用判据名就写 `EVIDENCE-RESULT=FAIL`（连字符断开正则）。
 */
const { mkdirSync, writeFileSync, rmSync, existsSync } = require("node:fs");
const { createHash } = require("node:crypto");
const { join, resolve } = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const REPO = resolve(__dirname, "..", "..");
const GATE = join(REPO, "scripts", "verify-evidence-integrity.mjs");
const FX = join(REPO, ".zcode", "tmp", "evfab");
const POSIX = FX.split("\\").join("/");

let fail = 0, cases = 0;
const ok = (cond, label, detail) => {
  cases++;
  if (cond) console.log(`  ok   ${label}`);
  else { fail++; console.log(`  FAIL ${label}${detail ? "  «" + detail + "»" : ""}`); }
};

rmSync(FX, { recursive: true, force: true });
const shotsDir = join(FX, "shots");
mkdirSync(shotsDir, { recursive: true });
const png = join(shotsDir, "real.png");
writeFileSync(png, Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(4096, 3)]));
const pngRel = POSIX + "/shots/real.png";
const ghostRel = POSIX + "/shots/ghost.png";        // 故意不存在
const ghost2Rel = POSIX + "/shots/ghost2.png";

// 权威 manifest：一张真帧 + 一张未引用的孤儿图（放在同一个 --dir 下）
writeFileSync(join(shotsDir, "unlisted.png"), Buffer.alloc(2048, 5));
const manifestPath = join(FX, "manifest-detail.json");
const EMPTY = join(FX, "empty");
mkdirSync(EMPTY, { recursive: true });
// 权威件里的这张帧必须带**真哈希**：门禁把 `noHash` 计入硬失败，
// 哈希留空会让每个用例都因为"没打哈希"而红，测的就不是我要测的那条轴了。
const PNG_HASH = createHash("sha256").update(require("node:fs").readFileSync(png)).digest("hex").slice(0, 16);
function writeManifest(withOrphanDir) {
  writeFileSync(manifestPath, JSON.stringify({
    gitSha: execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim(),
    workflowVersion: "fixture", shots: [{ page: "pages/fixture/index", state: "默认", identity: "A", path: pngRel, contentHash: PNG_HASH }],
    zoomFrames: [], stateNotApplied: [], routeDrifts: [],
  }, null, 1));
  return withOrphanDir ? shotsDir : EMPTY;
}
function writeExec(rows) {
  const p = join(FX, "exec.json");
  writeFileSync(p, JSON.stringify({ round: "fixture", gitSha: "deadbeef", results: rows }, null, 1));
  return p;
}
function run(execFile, dirFlag) {
  const r = spawnSync(process.execPath, [GATE, manifestPath, "--dir", dirFlag, "--exec", execFile],
    { cwd: REPO, encoding: "utf8", timeout: 120000 });
  const out = String(r.stdout || "") + String(r.stderr || "");
  const n = (re) => { const m = out.match(re); return m ? Number(m[1]) : null; };
  return {
    code: r.status, out,
    cleanMissing: n(/EXEC_CLEAN_BUT_MISSING=(\d+)/),
    withErr: n(/EXEC_EVIDENCE_ENTRIES=\d+ WITH_ERROR=(\d+)/),
    verdict: (out.match(/EXEC_EVIDENCE=(\w+)/) || [])[1],
    orphans: n(/ORPHANS=(\d+)/),
    result: (out.match(/EVIDENCE_RESULT=(\w+)/) || [])[1],
  };
}

/* A. 只有"自报失败的注记条目"（ERROR 且文件不在）：新判据放行，旧判据必判红 */
{
  const dir = writeManifest(true);
  const e = writeExec([
    { suite: "S1", manifest: "M1", id: "A1", status: "EXECUTED", tier: "normal", evidence: [pngRel + "(101511B)", ghostRel + "(ERROR:timeout waiting for automator response)"] },
    { suite: "S1", manifest: "M1", id: "A2", status: "FAILED", tier: "normal", evidence: [ghost2Rel + "(ERROR:timeout)"] },
  ]);
  const g = run(e, dir);
  ok(g.cleanMissing === 0, "A 无伪造引用：EXEC_CLEAN_BUT_MISSING=0", "got=" + g.cleanMissing);
  ok(g.withErr === 2, "A 污注记条目仍然被数出来：WITH_ERROR=2", "got=" + g.withErr);
  ok(g.verdict === "PASS", "A 新判据：EXEC_EVIDENCE=PASS", "got=" + g.verdict);
  // 反向对照：把旧表达式原式跑在同一份计数上 —— 旧判据此时必判红（withErr>0）
  ok((g.withErr || 0) > 0, "A 反向对照：旧判据的输入量 withErr>0 ⇒ 旧式必 FAIL（证明 A 真的判出了差别）", "withErr=" + g.withErr);
}

/* B. 没有注记、盘上又没有的图片引用 = 伪造：EXECUTED 行必须判红 */
{
  const dir = writeManifest(true);
  const e = writeExec([
    { suite: "S2", manifest: "M2", id: "B1", status: "EXECUTED", tier: "normal", evidence: [pngRel, ghostRel + "(155040B)"] },
  ]);
  const g = run(e, dir);
  ok(g.cleanMissing === 1, "B 伪造引用：EXEC_CLEAN_BUT_MISSING=1", "got=" + g.cleanMissing);
  ok(g.verdict === "FAIL" && g.code === 1, "B 伪造引用必须计红：EXEC_EVIDENCE=FAIL 且 exit 1", "verdict=" + g.verdict + " code=" + g.code);
  ok(/EXEC_BROKEN .*ghost\.png/.test(g.out), "B 红要可归因：打印具体断链条目", "无 EXEC_BROKEN 行");
}

/* C. 同一条伪造引用挂在 FAILED 行上也要判红 —— 收窄没有按状态放水 */
{
  const dir = writeManifest(true);
  const e = writeExec([
    { suite: "S3", manifest: "M3", id: "C1", status: "FAILED", tier: "normal", evidence: [ghostRel + "(155040B)"] },
  ]);
  const g = run(e, dir);
  ok(g.cleanMissing === 1 && g.code === 1, "C FAILED 行里的伪造同样计红（未按状态豁免）", "cleanMissing=" + g.cleanMissing + " code=" + g.code);
}

/* D. 其它轴没被这次收窄弄瞎：exec 全绿时，目录里有未引用帧仍然 exit 1 */
{
  const dir = writeManifest(true);
  const e = writeExec([
    { suite: "S4", manifest: "M4", id: "D1", status: "EXECUTED", tier: "normal", evidence: [pngRel] },
  ]);
  const g = run(e, dir);
  ok(g.verdict === "PASS", "D 前提：本例 exec 轴是绿的", "verdict=" + g.verdict);
  ok(g.orphans === 1, "D 孤儿帧仍然被数出来：ORPHANS=1", "got=" + g.orphans);
  ok(g.code === 1 && g.result === "FAIL", "D 孤儿帧仍然否决：exit 1 / EVIDENCE-RESULT=FAIL", "code=" + g.code + " result=" + g.result);
  // 对照：把 --dir 收到没有孤儿的位置，同一份 exec 就该整体绿 —— 证明 D 的红来自孤儿而不是别的
  const g2 = run(e, EMPTY);
  ok(g2.code === 0 && g2.orphans === 0 && existsSync(png), "D 对照：把扫描根换成空目录后 exit 0（红确实来自那张孤儿图）", "code2=" + g2.code + " orphans2=" + g2.orphans);
}

rmSync(FX, { recursive: true, force: true });
console.log(`EVFAB_SUMMARY cases=${cases} fail=${fail}`);
console.log(`EVFAB_TEST=${fail ? "FAIL" : "PASS"}`);
process.exit(fail ? 1 : 0);
