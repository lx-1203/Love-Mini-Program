/* 硬停落盘（v3.2 补 D20）的两段实测回归。
   为什么是两段：本轮三次量到 Windows 上信号送不到钩子 ——
     ①监督器 child.kill('SIGTERM')（02:45 attempt 日志无 EXEC_SIGNAL，已记在 r-exec.cjs:1952）
     ②监督器 child.kill('SIGINT')（本测试 A 段）
     ③进程内 process.kill(process.pid,'SIGINT')（独立探针，同样不跑钩子）
   ⇒ "装了 SIGINT 钩子"在这台机器上是一条无法用信号验证的承诺。但目标里写的是"SIGINT 落盘"，
     我不能拿"钩子在代码里"当已验证，也不能因为送不到就宣布这条不成立 ——
     所以拆成两条判据：
     A 段（信号可达性）：如实报告送达与否，这是**平台事实**，不判产品红；
     B 段（落盘逻辑）：用 EXEC_SELF_FLUSH 让同一个 emergencyFlush 自我触发，
        断言它真的写了权威件、写了检查点、释了锁、按约定退出码 17 退出。
   沙箱轮次 round-97 + 黑洞 TCP 端口（握手永不完成 ⇒ 有可操作窗口），跑完全部清理。
   用法：node scripts/qa/test-signal-flush.cjs
*/
"use strict";
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const REEXEC = path.join(REPO, "scripts", "qa", "r-exec.cjs");
const ROUND = "97";
const ROUND_DIR = path.join(REPO, "reports", "audit", `round-${ROUND}`);
const CKPT = path.join(REPO, "tmp", "qa", "checkpoints", `exec-R${ROUND}.json`);
const RESULTS = path.join(ROUND_DIR, "interact", "exec-results.json");
const SHOT_DIR = path.join(REPO, "reports", "screenshots", `round-${ROUND}-interact`);
const LOCK_DIR = path.join(REPO, "tmp", "qa", "locks");
const SRC_OPS = path.join(REPO, "reports", "audit", "round-6", "ops");

let PORT_BASE = 9497;
function sweep() {
  for (const p of [CKPT]) { try { fs.rmSync(p, { force: true }); } catch (_) { } }
  for (const d of [ROUND_DIR, SHOT_DIR]) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (_) { } }
  if (fs.existsSync(LOCK_DIR)) for (const f of fs.readdirSync(LOCK_DIR)) {
    if (/94(9[7-9])/.test(f)) { try { fs.rmSync(path.join(LOCK_DIR, f), { force: true }); } catch (_) { } }
  }
}
function smallestOps() {
  let best = null, bestN = Infinity;
  for (const f of fs.readdirSync(SRC_OPS).filter((x) => x.endsWith(".json"))) {
    let n = Infinity;
    try { n = (JSON.parse(fs.readFileSync(path.join(SRC_OPS, f), "utf8")).cases || []).length; } catch (_) { }
    if (n < bestN) { bestN = n; best = f; }
  }
  if (!best) throw new Error("round-6 ops 里没有可用清单");
  return { name: best, cases: bestN };
}
function installFixture(ops) {
  fs.mkdirSync(path.join(ROUND_DIR, "ops"), { recursive: true });
  fs.copyFileSync(path.join(SRC_OPS, ops.name), path.join(ROUND_DIR, "ops", ops.name));
}
function blackhole(port) {
  return new Promise((resolve) => {
    const srv = net.createServer((s) => { s.on("error", () => { }); });
    srv.on("error", () => resolve(null));
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}
/** mode='kill'：进连接阶段后由父进程发 SIGINT；mode='self'：靠 EXEC_SELF_FLUSH 定时自我触发。 */
function drive(mode, port, ops) {
  return new Promise((resolve) => {
    sweep();
    installFixture(ops);
    const out = { stdout: "", stderr: "", exit: null, signaled: false, sentAt: null };
    const env = Object.assign({}, process.env, {
      EXEC_ROUND: ROUND,
      EXEC_WS_ENDPOINT: `ws://127.0.0.1:${port}`,
      EXEC_LOCK_OWNER: "test-signal-flush",
    });
    if (mode === "self") env.EXEC_SELF_FLUSH = "6000";
    const child = spawn(process.execPath, [REEXEC, "--all"], { cwd: REPO, env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (b) => { out.stdout += b.toString(); });
    child.stderr.on("data", (b) => { out.stderr += b.toString(); });
    child.on("exit", (code, sig) => { out.exit = code === null ? "SIG:" + sig : code; resolve(out); });
    const t0 = Date.now();
    const tick = setInterval(() => {
      const ready = /lock\] acquired|EXEC_PORT=|\[suite /.test(out.stdout);
      if (mode === "kill" && ready && Date.now() - t0 > 2500 && !out.signaled) {
        out.signaled = true; out.sentAt = Date.now() - t0;
        try { child.kill("SIGINT"); } catch (_) { }
        setTimeout(() => { try { child.kill("SIGKILL"); } catch (_) { } }, 12000);
      }
      if (Date.now() - t0 > (mode === "self" ? 30000 : 20000)) {
        clearInterval(tick);
        try { child.kill("SIGKILL"); } catch (_) { }
      }
    }, 250);
  });
}
const FLUSH_RE = /EXEC_SIGNAL=(\S+) flushed_rows=(-?\d+) ckpt_failures=(-?\d+)/;
function rowsOnDisk() { try { return JSON.parse(fs.readFileSync(RESULTS, "utf8")).results.length; } catch (_) { return -1; } }
function lockHeld() { return fs.existsSync(LOCK_DIR) && fs.readdirSync(LOCK_DIR).some((f) => /94(9[7-9])/.test(f)); }

(async () => {
  const ops = smallestOps();
  let fails = 0, checks = 0;
  const t = (name, cond, detail) => { checks++; if (!cond) { fails++; console.log("FAIL " + name + (detail ? " :: " + detail : "")); } else console.log("ok   " + name); };

  /* A 段：信号可达性（平台事实，不参与红绿，只如实记录） */
  {
    const port = PORT_BASE++;
    const srv = await blackhole(port);
    if (!srv) { console.log("A_SKIP 黑洞端口起不来 " + port); }
    else {
      const r = await drive("kill", port, ops);
      srv.close();
      const hit = (r.stdout + r.stderr).match(FLUSH_RE);
      console.log(`SIGFLUSH_SIGNAL_DELIVERY ${hit ? "hook-ran" : "hook-NOT-ran"} （父进程 SIGINT 于 ${r.sentAt}ms 发出，exit=${r.exit}）`);
      if (hit) console.log("     ↳ 这台机器上信号竟送达了：那么 B 段的断言应与 A 段一致");
      else console.log("     ⇒ 平台限制（Windows）：监督器发不出可被 Node 监听的 SIGINT；这条不判产品红，但意味着 SIGINT 钩子在自动化链路上不可依赖");
    }
  }
  /* B 段：落盘逻辑本体（必须真绿才算 D20 成立） */
  {
    const port = PORT_BASE++;
    const srv = await blackhole(port);
    if (!srv) { console.log("B_FAIL 黑洞端口起不来 " + port); fails++; checks++; }
    else {
      const r = await drive("self", port, ops);
      srv.close();
      const all = r.stdout + "\n" + r.stderr;
      const m = all.match(FLUSH_RE);
      t("B: 自我触发后打了 EXEC_SIGNAL 落盘行", !!m, all.trim().split("\n").slice(-3).join(" ⏎ ").slice(0, 200));
      if (m) {
        const rows = Number(m[2]), disk = rowsOnDisk();
        console.log(`     信号名=${m[1]} flushed_rows=${rows} ckpt_failures=${m[3]} 盘上行数=${disk}`);
        t("B: 信号名记的是 SELF-FLUSH（不与真实信号混淆）", m[1] === "SELF-FLUSH", m[1]);
        t("B: 权威件确实写到了盘上（写出的行数与文件一致）", rows >= 0 && disk === rows, `flushed=${rows} disk=${disk}`);
        t("B: 锁已释放（不留 LEASED 死主）", !lockHeld(), lockHeld() ? "仍有本测试端口的锁文件" : "ok");
        t("B: 按约定退出码 17 退出", r.exit === 17, "exit=" + r.exit);
        const ck = (() => { try { return JSON.parse(fs.readFileSync(CKPT, "utf8")); } catch (_) { return null; } })();
        t("B: 检查点也在（不是只写了权威件）", !!ck, "ckpt=" + (ck ? "有" : "无"));
      }
    }
  }
  sweep();
  console.log(`SIGFLUSH_SUMMARY checks=${checks} fail=${fails}`);
  console.log(`SIGFLUSH_TEST=${fails ? "FAIL" : "PASS"}`);
  process.exit(fails ? 1 : 0);
})();
