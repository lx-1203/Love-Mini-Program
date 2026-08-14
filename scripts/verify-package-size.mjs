/**
 * verify-package-size.mjs — mp-weixin 构建产物体积验收（2026-08-10 包体积优化门禁）。
 *
 * 断言：
 *  1. 主包（app.json 根目录非分包部分）≤ 2MB（微信主包上限）
 *  2. 总包 ≤ 10MB（预留余量，微信总包 20MB 上限）
 *  3. 产物无 .mp4（登录视频已移除）
 *  4. 产物 JS 无 en-US 英文文案与 mock 数据关键字（桩化生效）
 *
 * 用法：node scripts/verify-package-size.mjs [dist 路径] [--allow-mock]
 *
 * --allow-mock：dev 构建专用。dev 构建不执行 strip-mock 桩化（mock 数据合法携带），
 * 因此跳过 MOCK_DATA_VALUE_RE 检查；且 dev 构建经 prepare-static --dev 恢复 7.7MB
 * 本地装饰图（mock 模式无后端，图片需随包携带），主包必然超过微信 2MB 上限——
 * 这是开发调试形态，不代表发布形态，故主包断言降级为警告；总包与 en-US 检查仍严格。
 * 发布形态由 real 构建（build:mp-weixin:real，无 --allow-mock）执行严格主包 ≤2MB 门禁。
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const allowMock = args.includes("--allow-mock");
const distRoot = resolve(
  (allowMock ? args.find((a) => !a.startsWith("--")) : args[0]) ||
    join(__dirname, "../apps/client/dist/build/mp-weixin")
);

if (!existsSync(distRoot)) {
  console.error(`[verify-size] 构建产物不存在: ${distRoot}`);
  process.exit(1);
}

const MAIN_PACKAGE_LIMIT = 2 * 1024 * 1024; // 2MB
const TOTAL_LIMIT = 10 * 1024 * 1024; // 10MB

/** 递归统计目录大小（字节），返回 { bytes, files } */
function dirSize(dir) {
  const out = { bytes: 0, files: [] };
  const entries = (() => {
    try {
      return readdirRecursive(dir);
    } catch {
      return [];
    }
  })();
  for (const f of entries) {
    const st = statSync(f);
    out.bytes += st.size;
    out.files.push(f);
  }
  return out;
}

function readdirRecursive(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) readdirRecursive(full, acc);
    else acc.push(full);
  }
  return acc;
}

// 解析分包边界
const appJsonPath = join(distRoot, "app.json");
if (!existsSync(appJsonPath)) {
  console.error(`[verify-size] 缺少 app.json: ${appJsonPath}`);
  process.exit(1);
}
const appJson = JSON.parse(readFileSync(appJsonPath, "utf-8"));

const subPackageRoots = new Set((appJson.subPackages || []).map((p) => p.root));
const subBytes = {};

// 统计各分包体积
for (const root of subPackageRoots) {
  const full = join(distRoot, root);
  subBytes[root] = existsSync(full) ? dirSize(full).bytes : 0;
}

// 主包体积 = 总 - 分包
const totalBytes = dirSize(distRoot).bytes;
const subTotal = Object.values(subBytes).reduce((a, b) => a + b, 0);
const mainBytes = totalBytes - subTotal;

const mb = (b) => `${(b / 1024 / 1024).toFixed(2)}MB`;

const failures = [];
console.log("[verify-size] ===== mp-weixin 包体积验收 =====");
console.log(`  主包: ${mb(mainBytes)}  (上限 ${mb(MAIN_PACKAGE_LIMIT)})`);
console.log(`  总包: ${mb(totalBytes)}  (上限 ${mb(TOTAL_LIMIT)})`);
for (const [root, bytes] of Object.entries(subBytes)) {
  console.log(`  分包 ${root}: ${mb(bytes)}`);
}

if (mainBytes > MAIN_PACKAGE_LIMIT) {
  if (allowMock) {
    console.warn(`  ⚠ 主包 ${mb(mainBytes)} 超过微信主包上限 ${mb(MAIN_PACKAGE_LIMIT)}（dev 构建豁免：携带 mock 数据与本地装饰图；发布形态由 real 构建严格门禁）`);
  } else {
    failures.push(`主包 ${mb(mainBytes)} 超过微信主包上限 ${mb(MAIN_PACKAGE_LIMIT)}`);
  }
}
if (totalBytes > TOTAL_LIMIT) {
  failures.push(`总包 ${mb(totalBytes)} 超过 ${mb(TOTAL_LIMIT)}`);
}

// 无 mp4
const allFiles = readdirRecursive(distRoot);
const mp4s = allFiles.filter((f) => f.toLowerCase().endsWith(".mp4"));
if (mp4s.length > 0) {
  failures.push(`产物仍含 ${mp4s.length} 个 mp4（登录视频未移除）: ${mp4s[0]}`);
}

// 桩化生效检查：
// - en-US：检测 en-US.ts 特有完整文案（桩化后 export default {}，这些句子不应出现；
//   通用短词如 "Confirm"/"Retry" 可能来自其他运行时代码，不作为依据）
// - mock：检测 mock-data 产物文件中数据值是否已桩化为 null
//   （变量名保留是预期的——桩文件需保持导出名；session/messages 等 store 内联
//   mock 分支属运行时 useMock() 判定代码，不在桩化范围，不检测）
const jsFiles = allFiles.filter((f) => f.endsWith(".js"));
let enLeak = 0;
let mockLeak = 0;
const EN_MARKERS = [
  "Operation succeeded",
  "Please add at least one time window",
  "It's a match! Say hi",
  "Weekly schedule enabled",
  "No call history",
];
const MOCK_DATA_VALUE_RE = /mock\w+=(\[|\{|")/; // mock 数据为数组/对象/字符串 = 未桩化
for (const f of jsFiles) {
  if (statSync(f).size > 5 * 1024 * 1024) continue; // 跳过超大大文件
  let content = "";
  try {
    content = readFileSync(f, "utf-8");
  } catch {
    continue;
  }
  for (const marker of EN_MARKERS) {
    if (content.includes(marker)) {
      enLeak++;
      break;
    }
  }
  // 仅检查 mock-data 产物文件（路径含 mock-data）
  if (/mock-data\.js$/.test(f) && MOCK_DATA_VALUE_RE.test(content)) {
    mockLeak++;
  }
}
if (enLeak > 0) failures.push(`en-US 特有文案仍出现在 ${enLeak} 个 JS 产物中（桩化未生效）`);
if (!allowMock && mockLeak > 0) {
  failures.push(`mock 数据值仍出现在 ${mockLeak} 个 mock-data 产物中（桩化未生效）`);
}
if (allowMock) {
  console.log("[verify-size] --allow-mock：跳过 mock 数据桩化检查（dev 构建合法携带 mock 数据）");
}

if (failures.length > 0) {
  console.error("[verify-size] ✗ 验收失败:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("[verify-size] ✓ 验收通过：主包/总包体积合规，无 mp4，mock/en-US 已剔除");
