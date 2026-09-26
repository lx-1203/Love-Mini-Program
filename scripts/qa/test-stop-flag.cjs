/* 停轮旗标的受控复测（第 2 版）。
   §54 撤掉了旧结论（证据被 append 日志 + 错误解码毁了）。第 1 版改成「自己起单套件小进程」，
   21:20 实测暴露出它自己的洞：挑已完成套件 + RERUN_CASES 想让循环真跑，结果是
   `[suite …] DONE executed=0` —— 3 个用例全都因为「权威件里已有这行」被跳过，
   而旗标检查点在**每例收尾处**，0 例 = 那条代码路径根本没走到。
   于是它把「没测到」报成了「确实不工作」。第 2 版的改法：
   - 用独立临时轮次（EXEC_ROUND=99 → reports/audit/round-99/），权威件从空开始，
     所以第一个用例一定会真跑；跑完第 1 例就该在旗标处体面收尾。
   - ops 只从 round-6 拷最小的那份，跑完连 round-99 目录一起删（不碰任何真实轮次产物）。
   - 三种结局分开判：PASS（真跑过 ≥1 例且收尾干净）/ INCONCLUSIVE（0 例，路径不可达）/ FAIL。
   判据一律来自子进程自己的 stdout（UTF-8 直管），不再读 append 日志、不再 iconv。
   用法：node scripts/qa/test-stop-flag.cjs [ops文件名]
*/
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const NODE = process.execPath;
const REXEC = path.join(REPO, "scripts", "qa", "r-exec.cjs");
const PROBE_FLAG = path.join(REPO, ".zcode", "tmp", "stopflag-probe.flag");
const SRC_OPS = path.join(REPO, "reports", "audit", "round-6", "ops");
const SCRATCH_ROUND_DIR = path.join(REPO, "reports", "audit", "round-99");
const SCRATCH_SHOTS = path.join(REPO, "reports", "screenshots", "round-99-interact");
const CKPT99 = path.join(REPO, "tmp", "qa", "checkpoints", "exec-R99.json");
const LOCK_DIR = path.join(REPO, "tmp", "qa", "locks");
const WAIT_MS = Number(process.env.STOPTEST_WAIT_MS || 420000);

function lockHolders() {
  try {
    return fs.readdirSync(LOCK_DIR).filter((f) => /\.lock$/.test(f)).map((f) => {
      try {
        const o = JSON.parse(fs.readFileSync(path.join(LOCK_DIR, f), "utf8"));
        const hb = Date.parse(o.lastHeartbeat || o.leaseUntil || 0);
        return { f: f, owner: o.owner, alive: Number.isFinite(hb) && Date.now() - hb < 90 * 1000 };
      } catch (e) { return { f: f, owner: "?", alive: false }; }
    }).filter((x) => x.alive);
  } catch (e) { return []; }
}

function cleanupScratch() {
  for (const p of [SCRATCH_ROUND_DIR, SCRATCH_SHOTS]) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) { /* 删不掉就留着，不阻断判据 */ }
  }
  try { if (fs.existsSync(CKPT99)) fs.unlinkSync(CKPT99); } catch (e) { /* 同上 */ }
  try { if (fs.existsSync(PROBE_FLAG)) fs.unlinkSync(PROBE_FLAG); } catch (e) { /* 同上 */ }
}

const live = lockHolders();
if (live.length) {
  console.log("STOPTEST=ABORT reason=还有活的 UI 租约（" + live.map((x) => x.f + "@" + x.owner).join(", ") + "）——" +
    "在别人的执行轮上做这个实验会抢锁/抢会话，且中途停轮会打死批跑");
  process.exit(2);
}

/* 选最小的 ops 清单：让「第一例」尽快到来 */
const opsName = process.argv[2] || (() => {
  const files = fs.readdirSync(SRC_OPS).filter((f) => f.endsWith(".json"))
    .map((f) => ({ f, n: (JSON.parse(fs.readFileSync(path.join(SRC_OPS, f), "utf8")).cases || []).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => a.n - b.n);
  if (!files.length) { console.log("STOPTEST=ABORT reason=round-6 ops 里没有可用清单"); process.exit(2); }
  return files[0].f;
})();
console.log("STOPTEST_PRE ops=" + opsName + " scratch=reports/audit/round-99（跑完即删）flag=" + path.relative(REPO, PROBE_FLAG));

cleanupScratch();                       // 上一轮残留会让「第一个用例」又变成「已记录可跳过」
fs.mkdirSync(path.join(SCRATCH_ROUND_DIR, "ops"), { recursive: true });
fs.copyFileSync(path.join(SRC_OPS, opsName), path.join(SCRATCH_ROUND_DIR, "ops", opsName));
fs.mkdirSync(path.dirname(PROBE_FLAG), { recursive: true });
fs.writeFileSync(PROBE_FLAG, JSON.stringify({
  at: new Date().toISOString(),
  why: "受控复测协作停轮（第 2 版：空权威件，保证真跑过至少 1 例）",
}));

/* 必须显式给模式：r-exec.cjs 不带 --dry-parse|--suite|--all 时只打一行
   `usage: …` 就 **exit 0**（21:23 实测）——静默零用例，正是让第 1 版误判的机制。 */
const child = cp.spawn(NODE, [REXEC, "--all"], {
  cwd: REPO,
  env: Object.assign({}, process.env, { EXEC_STOP_FLAG: PROBE_FLAG, EXEC_ROUND: "99" }),
  stdio: ["ignore", "pipe", "pipe"],
});

let out = "";
const t0 = Date.now();
let killed = false;
child.stdout.on("data", (b) => { out += b.toString("utf8"); });
child.stderr.on("data", (b) => { out += b.toString("utf8"); });
const killer = setTimeout(() => {
  if (!killed) { killed = true; child.kill("SIGKILL"); console.log("STOPTEST_TIMEOUT 到 " + Math.round(WAIT_MS / 1000) + "s 未退出，强杀以便继续收尾"); }
}, WAIT_MS);

child.on("exit", (code, sig) => {
  clearTimeout(killer);
  const sawSight = /见到停轮旗标/.test(out);
  const sawClean = /EXEC_STOPPED=clean/.test(out);
  const line = (out.match(/EXEC_STOPPED=clean[^\n]*/) || ["(无)"])[0].slice(0, 200);
  const done = Number((line.match(/done=(\d+)/) || [])[1] || 0);
  const suiteDone = (out.match(/DONE executed=(\d+)/) || [])[1] || "(无)";
  let rows99 = null;
  try {
    const f = path.join(SCRATCH_ROUND_DIR, "interact", "exec-results.json");
    rows99 = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).results.length : 0;
  } catch (e) { rows99 = -1; }
  console.log("STOPTEST_SIGHT=" + (sawSight ? "yes" : "no") + " STOPTEST_CLEAN=" + (sawClean ? "yes" : "no")
    + " 收尾行done=" + done + " 套件DONE_executed=" + suiteDone + " 临时轮行数=" + rows99
    + " exit=" + code + " sig=" + (sig || "-") + " 用时=" + Math.round((Date.now() - t0) / 1000) + "s");
  console.log("STOPTEST_LINE " + line);
  console.log("STOPTEST_TAIL " + out.split("\n").filter(Boolean).slice(-8).join(" ⏎ ").slice(0, 900));

  if (done === 0 && rows99 === 0) {
    // 第 1 版就是把这一形状误判成 FAIL 的：检查点在每例收尾处，一例没跑就永远看不到它。
    console.log("STOPTEST=INCONCLUSIVE 一例都没执行（临时轮 0 行、无旗标日志）⇒ 检查点结构上不可达，" +
      "这既不是「生效」也不是「不生效」；要看连接/规划为何没产出用例（上面 TAIL）。");
    cleanupScratch();
    process.exit(2);
  }
  /* 协作停轮的**全部价值**是"跑完这一例再停、不丢在途结果"（Windows 上 SIGTERM 是
     TerminateProcess，钩子根本不跑）。所以只认"旗标看到 + 退出码 0 + 权威件里真有一行"。
     21:29 实测过一种半成功：done=1、clean、exit 0，但 rows=0 —— 那是因为连接失败时
     这一例压根没被记录，"落权威件"这一半没被证明，不能算 PASS。 */
  if (sawSight && sawClean && done >= 1 && rows99 >= 1 && code === 0) {
    console.log("STOPTEST=PASS 协作停轮生效：真跑过 " + done + " 例→见旗标→权威件落了 " + rows99 + " 行→释锁→退 0（在途结果没丢）");
    cleanupScratch();
    process.exit(0);
  }
  if (sawSight && sawClean && done >= 1 && rows99 === 0) {
    console.log("STOPTEST=INCONCLUSIVE 看到了旗标并干净退出，但权威件 0 行 —— 在途结果没东西可落，" +
      "「不丢在途结果」这半句仍未被证明（多半是 automator 连不上，用例没被记录；看 TAIL 的 connect 结果）。");
    cleanupScratch();
    process.exit(2);
  }
  console.log("STOPTEST=FAIL 跑过了用例（done=" + done + " rows=" + rows99 + " clean=" + (sawClean ? "y" : "n")
    + "）却没在旗标处体面收尾（exit=" + code + "）⇒ 协作停轮确实不工作");
  cleanupScratch();
  process.exit(1);
});
