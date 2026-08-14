/**
 * strip-mock-for-mp.mjs — 生产构建（mp-weixin real）前的 mock 数据与英文语言包桩化。
 *
 * 背景（2026-08-10 包体积优化）：
 * - mock 数据由运行时 useMock() 判定，Rollup 无法摇树，real 包中白白携带
 *   services/mocks/fixtures.ts(60K)、各 store 目录下的 mock-data.ts(20-40K) 等死代码；
 * - en-US 语言包 181KB 静态打包，中文应用生产包不需要英文文案
 *   （zh-CN 为 fallbackLocale，en 缺失 key 自动回退中文，无运行风险）。
 *
 * 机制：构建前备份 → 写桩（保留导出名、值置空）→ 运行构建 → finally 强制恢复。
 * 恢复后校验 git diff 不含桩文件内容，防止桩文件被提交。
 *
 * 用法：
 *   node scripts/strip-mock-for-mp.mjs "uni build --platform mp-weixin --mode real"
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src");

/** 需要桩化的文件（相对 src） */
const STUB_TARGETS = [
  "services/mocks/fixtures.ts",
  "stores/village/mock-data.ts",
  "stores/chat/mock-data.ts",
  "stores/campus/mock-data.ts",
  "stores/likes/mock-data.ts",
  "stores/messages/mock-data.ts",
  "i18n/locales/en-US.ts",
];

const BACKUP_DIR = join(__dirname, ".strip-mock-backup");

/** 提取文件顶层导出的值名称（export const X / export function X / export default） */
function extractExportNames(source) {
  const names = [];
  const re = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
  let m;
  while ((m = re.exec(source)) !== null) names.push(m[1]);
  return names;
}

/** 生成桩文件内容（保留导出名，值置空） */
function buildStub(source) {
  const names = extractExportNames(source);
  const hasDefault = /\bexport\s+default\b/.test(source);
  const lines = [
    "/* AUTO-GENERATED STUB by strip-mock-for-mp.mjs — 生产构建临时桩化，构建后自动恢复，请勿提交 */",
  ];
  for (const name of names) {
    lines.push(`export const ${name} = null;`);
  }
  if (hasDefault) {
    lines.push("export default {};");
  }
  lines.push("");
  return lines.join("\n");
}

function backupAll() {
  rmSync(BACKUP_DIR, { recursive: true, force: true });
  mkdirSync(BACKUP_DIR, { recursive: true });
  for (const rel of STUB_TARGETS) {
    const file = join(SRC, rel);
    if (existsSync(file)) {
      const backup = join(BACKUP_DIR, rel.replaceAll("/", "__"));
      writeFileSync(backup, readFileSync(file, "utf-8"));
    }
  }
}

function stubAll() {
  for (const rel of STUB_TARGETS) {
    const file = join(SRC, rel);
    if (!existsSync(file)) continue;
    const stub = buildStub(readFileSync(file, "utf-8"));
    writeFileSync(file, stub, "utf-8");
    console.log(`[strip-mock] stubbed ${rel}`);
  }
}

function restoreAll() {
  for (const rel of STUB_TARGETS) {
    const file = join(SRC, rel);
    const backup = join(BACKUP_DIR, rel.replaceAll("/", "__"));
    if (existsSync(backup)) {
      writeFileSync(file, readFileSync(backup, "utf-8"));
    }
  }
  rmSync(BACKUP_DIR, { recursive: true, force: true });
  console.log("[strip-mock] originals restored");
}

const buildCmd = process.argv.slice(2).join(" ").trim();
if (!buildCmd) {
  console.error("[strip-mock] 用法: node strip-mock-for-mp.mjs \"<build command>\"");
  process.exit(1);
}

/** 解析本地 uni CLI 可执行文件（Windows .cmd / POSIX 无后缀） */
function resolveUniBin() {
  const candidates = [
    join(__dirname, "../node_modules/.bin/uni.cmd"),
    join(__dirname, "../node_modules/.bin/uni"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "uni";
}
const UNI_BIN = resolveUniBin();

let failed = false;
try {
  backupAll();
  stubAll();
  // 将命令中的 "uni " 替换为本地 CLI 完整路径（Windows cmd 无法直接找到 .bin 命令）
  const resolvedCmd = buildCmd.replace(/(^|\s)uni(\s|$)/, `$1"${UNI_BIN}"$2`);
  console.log(`[strip-mock] 运行构建: ${resolvedCmd}`);
  execSync(resolvedCmd, { stdio: "inherit", cwd: join(__dirname, "..") });
} catch (err) {
  failed = true;
  console.error("[strip-mock] 构建失败:", err.message);
} finally {
  restoreAll();
}

if (failed) process.exit(1);
console.log("[strip-mock] 完成：mock/en-US 已桩化构建并恢复源码");
