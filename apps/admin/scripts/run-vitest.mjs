/**
 * test / test:unit 启动器（单测门禁环境自愈，2026-10-07 客户端首建；R14-8 2026-11-05 同款移植到管理端）。
 *
 * 背景（R14-8 实证）：本机 PATH 首位是微信开发者工具自带 Node v16.13.1，
 * vitest 2.1.9的 tinypool@1.1.1 在 Node 16 下启动即崩
 * （node:events 无 EventEmitterAsyncResource）——管理端基线此前依赖「手工 PATH 前缀」，
 * 无自愈能力（客户端 2026-10-07 已有同款方案，管理端漏配）。
 *
 * 行为（与客户端版一致）：
 * 1. 当前 node 满足 [18, 23) → 直接用当前 node 运行 vitest（CI 等标准环境零行为变化）；
 * 2. 否则扫描 PATH 选主版本最高且落在 [18, 23) 的 node 重新运行 vitest；
 * 3. 环境变量 CLIENT_TEST_NODE 可显式指定 node 可执行文件（优先级最高）；
 * 4. 找不到达标 node → 回退当前 node 运行（保留 vitest 原始报错以便诊断）。
 *
 * 自检参数（不进入 vitest，供验证启动器裸跑）：
 *   node scripts/run-vitest.mjs --print-node   打印选定的 node 与版本后退出
 *   node scripts/run-vitest.mjs --print-cli    打印解析出的 vitest CLI 路径后退出
 *
 * 兼容性：本脚本自身须能在旧 node（含 16.x）上运行——只使用 node:child_process /
 * node:module / node:fs / node:path 的稳定 API，不用 16 之后新增的语法与 API。
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

/** 与仓库根 package.json engines（">=18.0.0 <23.0.0"）对齐的达标区间 */
const MIN_MAJOR = 18;
const MAX_EXCLUSIVE_MAJOR = 23;

function parseMajor(version) {
  const m = /^v?(\d+)/.exec(String(version).trim());
  return m ? Number(m[1]) : NaN;
}

function isAcceptable(major) {
  return Number.isFinite(major) && major >= MIN_MAJOR && major < MAX_EXCLUSIVE_MAJOR;
}

/** 当前 node 是否已达标 */
const currentMajor = parseMajor(process.version);
const currentOk = isAcceptable(currentMajor);

/**
 * 候选 node 可执行文件列表：
 * 1. CLIENT_TEST_NODE 显式指定（仅一个候选）；
 * 2. 否则遍历 PATH 各目录，取其中存在的 node.exe（win）/ node（posix）。
 */
function collectCandidates() {
  const override = process.env.CLIENT_TEST_NODE;
  if (override && override.trim()) {
    return [override.trim()];
  }
  const pathVar = process.env.PATH || process.env.Path || "";
  const dirs = pathVar.split(path.delimiter).filter(Boolean);
  const found = [];
  for (const dir of dirs) {
    const exeWin = path.join(dir, "node.exe");
    const exePosix = path.join(dir, "node");
    if (existsSync(exeWin)) {
      found.push(exeWin);
    } else if (existsSync(exePosix)) {
      found.push(exePosix);
    }
  }
  return found;
}

/** 运行 `node --version` 取版本串；失败返回空串 */
function versionOf(exe) {
  try {
    const r = spawnSync(exe, ["--version"], { encoding: "utf8" });
    return r.status === 0 ? String(r.stdout || "").trim() : "";
  } catch (_e) {
    return "";
  }
}

/**
 * 选定用于运行 vitest 的 node：
 * - 当前 node 达标 → 用当前 node（execPath），不走扫描；
 * - 否则取 PATH 上版本最高的达标 node（显式指定 CLIENT_TEST_NODE 时直接采用）。
 */
function chooseNode() {
  if (currentOk && !process.env.CLIENT_TEST_NODE) {
    return { exe: process.execPath, version: process.version };
  }
  let best = null;
  let bestMajor = -1;
  for (const exe of collectCandidates()) {
    if (path.resolve(exe) === path.resolve(process.execPath)) continue;
    const version = versionOf(exe);
    const major = parseMajor(version);
    if (isAcceptable(major) && major > bestMajor) {
      bestMajor = major;
      best = { exe, version };
    }
  }
  return best;
}

/** 解析 vitest CLI 入口（vitest 包内 bin.vitest，pnpm 符号链接透明） */
function resolveVitestCli() {
  const require = createRequire(new URL("..", import.meta.url).href + "package.json");
  let entry = "";
  try {
    entry = require.resolve("vitest");
  } catch (_e) {
    return "";
  }
  // 从入口文件向上找 vitest 包根（package.json 的 name === "vitest"）
  let dir = path.dirname(entry);
  for (let i = 0; i < 6; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (pkg && pkg.name === "vitest") {
          const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin && pkg.bin.vitest;
          if (bin) return path.join(dir, bin);
        }
      } catch (_e2) {
        // 读不了 package.json 继续向上
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // 兜底：monorepo 安装布局下的固定位置
  const fallback = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  return existsSync(fallback) ? fallback : "";
}

/* ---------------- 自检参数：打印后退出，不进入 vitest ---------------- */
const argv = process.argv.slice(2);
const printNodeIdx = argv.indexOf("--print-node");
const printCliIdx = argv.indexOf("--print-cli");
if (printNodeIdx !== -1 || printCliIdx !== -1) {
  const chosen = chooseNode();
  const cli = printCliIdx !== -1 ? resolveVitestCli() : undefined;
  console.log(
    JSON.stringify(
      {
        currentNode: process.version,
        currentOk,
        chosenNode: chosen ? chosen.exe : "",
        chosenVersion: chosen ? chosen.version : "",
        vitestCli: cli,
      },
      null,
      2,
    ),
  );
  process.exit(chosen ? 0 : 1);
}

/* ---------------- 正式运行 ---------------- */
const vitestCli = resolveVitestCli();
if (!vitestCli) {
  console.error("[run-vitest] 无法解析 vitest CLI：请确认 apps/admin 依赖已安装（pnpm install）");
  process.exit(1);
}

const chosen = chooseNode();
let nodeExe = process.execPath;
if (chosen) {
  nodeExe = chosen.exe;
  if (path.resolve(nodeExe) !== path.resolve(process.execPath)) {
    console.warn(
      `[run-vitest] 当前 node ${process.version} 不满足仓库引擎要求（>=${MIN_MAJOR} <${MAX_EXCLUSIVE_MAJOR}），` +
        `改用 ${nodeExe} (${chosen.version}) 运行单测`,
    );
  }
} else {
  console.warn(
    `[run-vitest] PATH 上未找到主版本 ${MIN_MAJOR}~${MAX_EXCLUSIVE_MAJOR - 1} 的 node` +
      `（当前 ${process.version}），回退当前 node 运行——若失败请安装 Node 18/20/22 或设 CLIENT_TEST_NODE 指向其可执行文件`,
  );
}

const child = spawn(nodeExe, [vitestCli, ...argv], {
  stdio: "inherit",
  env: process.env,
  cwd: process.cwd(),
});
child.on("error", (err) => {
  console.error(`[run-vitest] 启动 ${nodeExe} 失败:`, err && err.message ? err.message : err);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  process.exit(typeof code === "number" ? code : 1);
});
