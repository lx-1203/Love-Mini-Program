#!/usr/bin/env node
/**
 * #47 的可重跑那一半：WS 通道与 CLI 通道到底是不是互斥的？
 *
 * 这里**不碰 IDE、不碰模拟器、不碰真锁**：把 ui-lease 指到一个空白 scratch 目录，
 * 用子进程分别验三件事，全部用退出码与真实文件状态断言，不打印"看起来对"的话：
 *   A 已有别的持有者 ⇒ 第二把驱动必须 exit≠0，且理由里点名 owner / pid / 租期（BUSY 不静默）；
 *   B 显式 QA_SKIP_UI_LEASE=1 ⇒ 允许跳过，但必须打印 SKIPPED（这是"我故意并发"的唯一入口）；
 *   C 空目录 ⇒ 取到 → 续租 → 释放，且释放后按 owner 判"不再是持有者"（同一把锁被两个 owner 各自取时会撞）。
 * 剩下那一半（真 IDE 在 WS 连上时会不会踢掉 automator 会话）只能开一次窗口去量，写在这里当未做的账，
 * 不许用这三条绿去替它结案。
 *
 * 用法：node scripts/qa/probe-ws-cli-exclusion.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR = mkdtempSync(join(tmpdir(), "ws-cli-excl-"));
const LEASE = join(DIR, "wechat-automation-cli.lock");
const OWNER = "cli-leg-under-test";
const CHILD = join(DIR, "child.mjs");
writeFileSync(CHILD, [
  'import { guardUiLease, heldLeases, acquireUi, releaseUi } from ' + JSON.stringify(pathToFileURL(resolve(REPO, "scripts/qa/ui-lease.mjs")).href) + ';',
  'const mode = process.argv[2];',
  'if (mode === "check-held") { const h = heldLeases(); console.log("HELD=" + h.length + (h[0] ? " owner=" + h[0].owner + " pid=" + h[0].pid : "")); process.exit(0); }',
  'const g = guardUiLease({ owner: process.env.CHILD_OWNER || "second-driver", batch: "PROBE" });',
  'console.log("ACQUIRED=" + (g.skipped ? "SKIPPED" : "YES"));',
  'if (!g.skipped) { g.renew(); releaseUi({ owner: process.env.CHILD_OWNER || "second-driver" }); console.log("RELEASED=yes"); }',
  'process.exit(0);',
].join("\n"));

function runChild(mode, env) {
  const r = spawnSync(process.execPath, [CHILD, mode], {
    cwd: REPO, encoding: "utf8", env: { ...process.env, QA_LOCK_DIR: DIR, ...(env || {}) },
  });
  return { code: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
}

const fails = [];
const ok = (name, cond, detail) => { console.log((cond ? "  ok  " : "  BAD ") + name + (detail ? " :: " + String(detail).replace(/\s+/g, " ").slice(0, 150) : "")); if (!cond) fails.push(name); };

/* C 先做：空白目录下必须能取到并释放，否则 A 的"被占"就无从构造。 */
const c1 = runChild("acquire", { CHILD_OWNER: OWNER });
ok("C1 空目录可取租约", c1.code === 0 && /ACQUIRED=YES/.test(c1.out), "exit=" + c1.code + " " + c1.out);
/* 探针自己也要能被否掉：子进程若因为"根本 import 不进来"而失败，那 A1 的"非零退出"是假绿。
   第一版就是踩在这里 —— A1 记了 ok，实际原因是 ERR_UNSUPPORTED_ESM_URL_SCHEME。 */
if (c1.code !== 0) { console.log("  BAD 前置：子进程连 ui-lease 都没导进来 ⇒ 后面所有断言都不可信"); console.log("WSX_EXCL_RESULT=FAIL reason=探针自身坏了（先修 child 的 import），不是租约机制坏了"); rmSync(DIR, { recursive: true, force: true }); process.exit(2); }
ok("C2 释放后文件仍在但不再被 heldLeases 认成持有者", (() => {
  const t = runChild("check-held", {});
  return t.code === 0 && /HELD=0/.test(t.out);
})(), runChild("check-held", {}).out);

/* A：先由"CLI 腿"占住，再起第二把驱动（WS 或 CLI 都走同一把资源锁）⇒ 必须非零退出且点名持有者。 */
writeFileSync(LEASE, JSON.stringify({
  resource: "wechat-automation-cli", owner: OWNER, pid: process.pid, host: "probe",
  batch: "R7", status: "LEASED", leaseUntil: new Date(Date.now() + 10 * 60000).toISOString(),
  acquiredAt: new Date().toISOString(), lastHeartbeat: new Date().toISOString(),
}, null, 1) + "\n");
const a1 = runChild("acquire", { CHILD_OWNER: "ws-leg-under-test" });
ok("A1 已被占时第二把驱动必须非零退出**且理由是占用**（不是别的崩溃）", a1.code !== 0 && /_RESULT=FAIL/.test(a1.out) && /已被占|占用/.test(a1.out), "exit=" + a1.code + " " + a1.out);
ok("A2 拒绝理由点名持有者 / pid / 租期（不许只说「占用中」）", /ws-leg|cli-leg-under-test@pid/.test(a1.out) && /@pid\d+/.test(a1.out) && /租期到/.test(a1.out), a1.out);
const a3 = runChild("acquire", { CHILD_OWNER: "ws-leg-under-test", QA_SKIP_UI_LEASE: "1" });
ok("A3 显式 QA_SKIP_UI_LEASE=1 才允许并发，且必须打印 SKIPPED 留痕", a3.code === 0 && /SKIPPED/.test(a3.out), "exit=" + a3.code + " " + a3.out);

/* B：把"owner 相同"到底算不算同一个人测清楚。
   第一版我在这里断"同 owner 重取=续租成功"，实测是**拒**——持有者身份以 pid 为准，
   owner 只是标签（真锁里就是这么写的）。所以断言改成两条更值钱的：
     B1 标签相同、pid 不同 ⇒ 仍然拒（不然任何脚本抄个 owner 名就能并发进来）；
     B2 租期一过 ⇒ 同一 owner 可以重新取到（卡死的驱动不会永久占着口）。 */
const b1 = runChild("acquire", { CHILD_OWNER: OWNER });
ok("B1 只抄 owner 名字但 pid 不同 ⇒ 仍然拒（身份以 pid 为准）", b1.code !== 0 && /@pid\d+/.test(b1.out), "exit=" + b1.code + " " + b1.out);
writeFileSync(LEASE, JSON.stringify({
  resource: "wechat-automation-cli", owner: OWNER, pid: 999999, host: "probe",
  batch: "R7", status: "LEASED", leaseUntil: new Date(Date.now() - 60000).toISOString(),
  acquiredAt: new Date(Date.now() - 3600000).toISOString(), lastHeartbeat: new Date(Date.now() - 3600000).toISOString(),
}, null, 1) + "\n");
const b2 = runChild("acquire", { CHILD_OWNER: "next-driver" });
ok("B2 租期过期后新驱动可接管（卡死的持有者不会永久占口）", b2.code === 0 && /ACQUIRED=YES/.test(b2.out), "exit=" + b2.code + " " + b2.out);

ok("Z1 全程没写过真锁目录（真锁文件路径与本次 scratch 不同）", !LEASE.startsWith(join(REPO, "tmp", "qa", "locks")), LEASE);
console.log(`EXCL_PROBE 断言=${fails.length ? fails.length + " 条失败" : "全过"} scratch=${DIR}`);
try { rmSync(DIR, { recursive: true, force: true }); } catch { /* scratch 清不掉不影响结论 */ }
console.log(fails.length ? "WSX_EXCL_RESULT=FAIL reason=" + fails.join(" / ") : "WSX_EXCL_RESULT=PASS（机制层互斥成立；真 IDE 那一半仍未测）");
process.exit(fails.length ? 1 : 0);
