#!/usr/bin/env node
/** 后端新鲜度守恒：跑着的 8080 是不是就是 HEAD 的那份 Java 代码？
 *
 *  为什么要有：③ 写着"重建 + 重启 8080"。本轮实测下来运行实例其实**已经**是最新的
 *  （源码最后改动 20:54–20:55、编译 21:08:45、进程 21:32:46 起），
 *  也就是说再重启一次只是白打断正在跑的真实模式腿。但"我已经核过了"是散文，
 *  下一轮没人记得；这条门把它变成四个可比的时间戳 + 一个工作树条件。
 *
 *  用法：node scripts/qa/verify-backend-fresh.mjs [--probe]（--probe 顺带打一次 /actuator 或健康口）
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const API = join(REPO, "apps/api");
const SRC = join(API, "src/main/java");
const CLS = join(API, "target/classes");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PORT = arg("port", "8080");

function walk(dir, re, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, re, acc);
    else if (re.test(e)) acc.push({ p, m: st.mtimeMs });
  }
  return acc;
}
const die = [];
const newest = (arr) => arr.reduce((a, x) => Math.max(a, x.m), 0);

/* 1) 工作树里 apps/api 必须干净：脏着就说明源码改了却没进构建，后面三条时间戳都不成立 */
let dirty = [];
try { dirty = execFileSync("git", ["status", "--porcelain", "--", "apps/api"], { cwd: REPO, encoding: "utf8" }).split(/\r?\n/).filter(Boolean); }
catch (e) { die.push("git status 读不到 apps/api：" + e.message); }

const java = walk(SRC, /\.java$/);
const classFiles = walk(CLS, /\.class$/);
if (!java.length) die.push("找不到 src/main/java 下的 .java ⇒ 判点空转");
if (!classFiles.length) die.push("找不到 target/classes 下的 .class ⇒ 从没编译过，谈不上新鲜");

/* 2) 每个 .java 都要有同名 .class 且 class 不早于 java（增量编译漏文件是常见事故） */
const byClass = new Map(classFiles.map((c) => [c.p.replace(/^.*[\\/]/, "").replace(/\.class$/, ""), c.m]));
const staleSources = java.filter((j) => {
  const base = j.p.replace(/^.*[\\/]/, "").replace(/\.java$/, "");
  const cm = byClass.get(base);
  return cm === undefined || cm < j.m;
}).map((j) => j.p.replace(REPO + "/", "").replace(/\\/g, "/"));

/* 3) 运行实例的启动时间必须不早于最新 class。
   分两步查而不是一个大表达式：上一版把 `Get-Process -Id $c.OwningProcess` 与 `-f` 格式化塞在同一行，
   实测 $p 为 null（PowerShell 报 InvokeMethodOnNull）⇒ 门把"活着的前端"读成"没有监听进程"，
   一个永远红的门等于没有门。改成先问端口归属、再按 pid 问 CIM 拿名字与启动时间。 */
let proc = null;
try {
  const pidOut = execFileSync("powershell", ["-NoProfile", "-Command",
    `(Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess`],
    { encoding: "utf8", timeout: 90000 });
  const pid = (pidOut || "").trim().split(/\r?\n/).filter(Boolean)[0] || "";
  if (pid && /^\d+$/.test(pid)) {
    const info = execFileSync("powershell", ["-NoProfile", "-Command",
      `$p=Get-CimInstance Win32_Process -Filter "ProcessId=${pid}"; if($p){$p.Name + '|' + $p.CreationDate.ToString('yyyy-MM-ddTHH:mm:ss')}`],
      { encoding: "utf8", timeout: 90000 }).trim();
    const [name, iso] = info.split("|");
    if (iso) proc = { pid, name: name || "?", startedMs: Date.parse(iso), startedAt: iso };
    else die.push(`端口 ${PORT} 归属 pid=${pid}，但 CIM 没给出启动时间 ⇒ 不拿"查不到"当清白`);
  } else {
    die.push(`端口 ${PORT} 上没有监听进程 ⇒ 真实模式一切判据都无对象`);
  }
} catch (e) { die.push("端口 " + PORT + " 的进程查不到：" + String(e.message).slice(0, 80)); }

const newestJava = newest(java), newestClass = newest(classFiles);
const fmt = (ms) => (ms ? new Date(ms).toISOString() : "(无)");
console.log(`BACKEND_FRESH java最新=${fmt(newestJava)} class最新=${fmt(newestClass)} 运行实例=${proc ? `pid ${proc.pid} ${proc.name} 起于 ${proc.startedAt}` : "未查到"} apps/api脏项=${dirty.length} 源码比class新=${staleSources.length}`);
for (const d of dirty.slice(0, 5)) console.log("  DIRTY " + d.slice(0, 120));
for (const s of staleSources.slice(0, 5)) console.log("  STALE_SOURCE " + s);
if (dirty.length) die.push(`apps/api 有 ${dirty.length} 项未提交改动 ⇒ 运行实例不可能代表 HEAD`);
if (staleSources.length) die.push(`${staleSources.length} 个 .java 没有对应或更新的 .class ⇒ 需要重新编译`);
if (!proc) die.push(`端口 ${PORT} 上没有监听进程 ⇒ 真实模式一切判据都无对象`);
else if (proc.startedMs < newestClass) die.push(`运行实例起于 ${proc.startedAt}，早于最新 class ${fmt(newestClass)} ⇒ 跑的是旧代码，需要重启`);

console.log(`BACKEND_FRESH_RESULT=${die.length ? "FAIL" : "PASS"}` + (die.length ? "（" + die.join(" / ") + "）" : "（运行中的 8080 就是 HEAD 那份后端，③ 的重启不必再做一次）"));
process.exit(die.length ? 1 : 0);
