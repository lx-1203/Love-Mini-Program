/**
 * D16：证明 8080 上的后端确实"重启过"，而不是只"重编过"。
 * DSL 与人工口头只能说改完代码，证明不了运行中 JVM 已带上新 class —— 这条只能机检。
 * 判据：JVM 启动时间 必须晚于 (a) 最新一次改动的 java 源文件 mtime、(b) HEAD 提交时间。
 * 用法：node scripts/qa/verify-backend-restarted.mjs [--port 8080]
 */
import { execFileSync } from "node:child_process";
import { existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const port = (() => { const i = process.argv.indexOf("--port"); return i >= 0 ? process.argv[i + 1] : "8080"; })();
const srcRoot = join(repoRoot, "apps/api/src/main/java");

function ps(cmd) {
  try {
    return execFileSync("powershell", ["-NoProfile", "-Command", cmd], { encoding: "utf8", maxBuffer: 1 << 24 });
  } catch (e) { return "PS_ERR " + String(e.message).slice(0, 80); }
}

// 1) 端口持有者
const listen = ps(`Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess`).trim();
const pid = /^\d+$/.test(listen) ? listen : null;
if (!pid) {
  console.log(`RESTARTED_RESULT=FAIL reason=端口 ${port} 无监听者（后端未运行，任何 API 取证都是空的）`);
  process.exit(2);
}
const info = ps(`Get-Process -Id ${pid} | Select-Object -ExpandProperty StartTime | ForEach-Object { $_.ToString('yyyy-MM-dd HH:mm:ss') }`).trim();
const started = Date.parse(info.replace(" ", "T"));
console.log(`RESTARTED_PID=${pid} startedAt="${info}"`);

// 2) 最新的 java 源文件
function newest(dir, best = { m: 0, f: "" }) {
  if (!existsSync(dir)) return best;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const st = statSync(p);
    // 子目录的返回值必须接回来：之前写成 newest(p, best) 丢弃结果，
    // 于是所有 .java 都在 com/ 下一层层目录里被跳过，扫描静默返回"没找到"，
    // 门禁因此空过（vacuous PASS）——这类假绿比报错危险。
    if (st.isDirectory()) best = newest(p, best);
    else if (/\.java$/.test(n) && st.mtimeMs > best.m) best = { m: st.mtimeMs, f: p };
  }
  return best;
}
const n = newest(srcRoot);
if (!n.f) {
  console.log(`RESTARTED_RESULT=FAIL reason=一个 .java 都没扫到（srcRoot=${srcRoot}），扫描器本身失效，不得据此判 PASS`);
  process.exit(2);
}
const rel = n.f.replace(repoRoot + "/", "").replace(/\\/g, "/");
// 3) HEAD 提交时间
const head = ps(`git -C '${repoRoot.replace(/'/g, "''")}' log -1 --format=%ct`).trim();
const headTs = /^\d+$/.test(head) ? Number(head) * 1000 : 0;

const staleSrc = n.m > started ? rel : "";
const staleHead = headTs > started;
console.log(`RESTARTED_NEWEST_SOURCE=${rel} mtime=${new Date(n.m).toISOString()}`);
console.log(`RESTARTED_HEAD_COMMIT_TIME=${headTs ? new Date(headTs).toISOString() : "?"}`);
console.log(`RESTARTED_STALE_SOURCE=${staleSrc || "none"}  HEAD_NEWER_THAN_JVM=${staleHead ? "YES" : "no"}`);
if (staleSrc || staleHead) {
  console.log(`RESTARTED_RESULT=FAIL JVM 比${staleSrc ? "最新源码 " + staleSrc : ""}${staleSrc && staleHead ? " / " : ""}${staleHead ? "HEAD 提交" : ""}更早，改动未生效，API 侧结论一律不得记 PASS`);
  process.exit(1);
}
console.log("RESTARTED_RESULT=PASS JVM 晚于全部 java 源码改动与 HEAD 提交，可作前后端联通取证的前提");
process.exit(0);
