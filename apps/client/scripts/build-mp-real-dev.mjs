/**
 * build-mp-real-dev.mjs — `build:mp-weixin:real:dev` 的构建载具。
 *
 * 为什么存在（2026-10-26 构建阻断）：
 * 本机 PATH 把微信开发者工具自带的 Node v16.13.1（D:\微信开发者\...）排在了
 * D:\codex-tools 的 Node 20/22 之前，npm 生命周期脚本随之全部跑在 Node 16 上。
 * vite 5 的 resolveConfig 在计算 webSocketToken 时调用 node:crypto 顶层
 * getRandomValues（Node 19+ 才存在），直接报
 * `crypto$2.getRandomValues is not a function`，uni 编译在 Compiling... 即断。
 * 而 apps/client/package.json engines 要求 `>=18.0.0 <23.0.0`，CI 钉 Node 20。
 *
 * 机制：
 * - 当前 node 满足 engines ⇒ 原样执行（CI / 正常机器零行为变化）；
 * - 不满足 ⇒ 依次探测 PATH 各目录、当前 node 所在目录与默认安装位，找出满足
 *   engines 的 node（优先与 CI 一致的 20.x，其次版本高者），把它所在目录前置到
 *   子进程 PATH（uni.cmd 内部还会再起 node，必须整体换），整条链用该 node 执行；
 * - 一个都找不到 ⇒ 大声失败并列出探测位置，不静默降级。
 *
 * 链上步骤与 package.json 原脚本逐字对应、顺序不变
 * （顺序口径见 reports/audit/round-7/build-determinism-r9.md）。
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = resolve(__dirname, "..");

/** 构建链（相对 CLIENT_ROOT 的脚本 + 参数），顺序即执行序 */
const STEPS = [
  ["scripts/check-mp-image-styles.mjs", ["--strict"]],
  ["scripts/check-statusbar-offset.mjs", []],
  ["scripts/check-tabbar-consistency.mjs", []],
  ["scripts/check-project-rules.mjs", []],
  ["scripts/inject-wx-appid.mjs", []],
  ["scripts/prepare-static.mjs", ["--dev"]],
  ["scripts/profile-svg-to-png.mjs", []],
  // strip-mock-for-mp 把 argv 拼回命令串并把 `uni` 替换为本地 .bin/uni.cmd，
  // 这里分参传入即可，无需引号。
  ["scripts/strip-mock-for-mp.mjs", ["uni", "build", "--platform", "mp-weixin", "--mode", "real"]],
];

/** 解析 engines.node 的 `>=x.y.z <a.b.c` 形式；不认识则返回 null（按原样直跑） */
function parseEnginesRange(spec) {
  const m = />=\s*(\d+(?:\.\d+)*)\s*<\s*(\d+(?:\.\d+)*)/.exec(String(spec || ""));
  if (!m) return null;
  return { min: m[1].split(".").map(Number), max: m[2].split(".").map(Number) };
}

function toSemver(v) {
  return String(v).replace(/^v/, "").split(".").map(Number);
}

function cmpVer(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
}

function satisfies(sem, range) {
  return cmpVer(sem, range.min) >= 0 && cmpVer(sem, range.max) < 0;
}

/** 探测某个 node 可执行文件的版本；跑不起来返回 null */
function nodeVersion(exe) {
  const r = spawnSync(exe, ["-e", "process.stdout.write(process.versions.node)"], {
    encoding: "utf8",
    timeout: 20000,
    windowsHide: true,
  });
  if (r.error || r.status !== 0) return null;
  const out = String(r.stdout || "").trim();
  return /^\d+(\.\d+)*$/.test(out) ? out : null;
}

/** 收集本机所有可用的 node 候选：PATH 各目录 + 当前 node 目录 + 默认安装位 */
function findNodeCandidates() {
  const exeName = process.platform === "win32" ? "node.exe" : "node";
  const dirs = [];
  const seen = new Set();
  const push = (d) => {
    if (!d) return;
    const key = resolve(d).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    dirs.push(resolve(d));
  };
  for (const d of String(process.env.PATH || process.env.Path || "").split(delimiter)) push(d);
  push(dirname(process.execPath));
  push(process.env.ProgramFiles ? join(process.env.ProgramFiles, "nodejs") : "C:\\Program Files\\nodejs");
  const out = [];
  for (const d of dirs) {
    const exe = join(d, exeName);
    if (existsSync(exe)) out.push(exe);
  }
  return out;
}

function pickCompatibleNode(range) {
  const probed = [];
  const found = [];
  for (const exe of findNodeCandidates()) {
    const ver = nodeVersion(exe);
    if (!ver) {
      probed.push(`${exe}（无法取得版本）`);
      continue;
    }
    probed.push(`${exe} (v${ver})`);
    const sem = toSemver(ver);
    if (satisfies(sem, range)) found.push({ exe, ver, sem });
  }
  if (!found.length) return { pick: null, probed };
  // 优先与 CI 一致的 20.x，其次版本高者，保证可复现
  found.sort((a, b) => {
    const a20 = a.sem[0] === 20;
    const b20 = b.sem[0] === 20;
    if (a20 !== b20) return a20 ? -1 : 1;
    return cmpVer(b.sem, a.sem);
  });
  return { pick: found[0], probed };
}

const enginesSpec = JSON.parse(readFileSync(join(CLIENT_ROOT, "package.json"), "utf8")).engines.node;
const range = parseEnginesRange(enginesSpec);
const currentVer = process.versions.node;

let nodeExe = process.execPath;
let env = { ...process.env };

if (range && !satisfies(toSemver(currentVer), range)) {
  console.error(`[build-mp-real-dev] engines 要求 ${enginesSpec}，当前 node v${currentVer}（${process.execPath}）不满足`);
  const { pick, probed } = pickCompatibleNode(range);
  if (!pick) {
    console.error(`[build-mp-real-dev] 未找到满足 ${enginesSpec} 的 node，已探测：`);
    for (const line of probed) console.error(`[build-mp-real-dev]   - ${line}`);
    console.error("[build-mp-real-dev] 请安装 Node 20（CI 同款），或把其目录移到 PATH 中微信开发者工具目录之前");
    process.exit(1);
  }
  nodeExe = pick.exe;
  const newDir = dirname(nodeExe);
  // Windows 上环境块里的键可能是 Path/PATH，改真实存在的那一个，避免出现双键
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === "PATH") || "PATH";
  env[pathKey] = newDir + delimiter + String(env[pathKey] || "");
  console.error(`[build-mp-real-dev] 改用 ${nodeExe} (v${pick.ver})，并已将其目录前置到子进程 PATH`);
} else {
  console.error(`[build-mp-real-dev] 当前 node v${currentVer} 满足 engines ${enginesSpec}，原样执行`);
}

for (const [script, args] of STEPS) {
  const r = spawnSync(nodeExe, [script, ...args], {
    stdio: "inherit",
    cwd: CLIENT_ROOT,
    env,
    windowsHide: true,
  });
  if (r.error) {
    console.error(`[build-mp-real-dev] 启动失败 ${script}: ${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status === null ? 1 : r.status);
}
console.error("[build-mp-real-dev] 全链完成：check-* / inject-wx-appid / prepare-static / svg-to-png / strip-mock+uni build 均通过");
