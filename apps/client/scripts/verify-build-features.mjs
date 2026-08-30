/**
 * verify-build-features.mjs — 构建产物功能指纹自检（2026-08-26 新增）。
 *
 * 目的：防止"以为构建更新了、其实产物是旧包"的误判。
 * 用法：在 构建成功后 执行 `node scripts/verify-build-features.mjs`，
 * 扫描 apps/client/dist/build/mp-weixin 下全部 js，断言关键功能特征存在；
 * 任一缺失 → 退出码非 0，提示重新构建。
 *
 * 说明：
 * - 特征优先选择「导出符号 / i18n 键名」等 minify 后仍保留的稳定标识
 *   （页面内部函数名可能被压缩改名，不作为特征）；
 * - 中文字符串在 i18n 产物中按原文保留（mp-weixin），可作为补充特征。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist/build/mp-weixin");

/** 期望存在的功能特征（全部命中才通过） */
const FEATURES = [
  { id: "寻觅-附近卡片（距离排序工具）", marker: "sortNearbyFirst" },
  { id: "寻觅-附近空态文案键", marker: "nearbyEmptyTitle" },
  { id: "安全中心-第三方账号绑定标题键", marker: "thirdPartyTitle" },
  { id: "登录页-请先登录提示", marker: "请先登录后再使用该功能" },
];

/** 递归收集目录下所有 js 文件路径 */
function walk(d, acc = []) {
  if (!fs.existsSync(d)) return acc;
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (entry.isFile() && /\.js$/i.test(entry.name)) acc.push(p);
  }
  return acc;
}

const files = walk(DIST);
console.log(`[verify] 扫描产物目录: ${DIST}`);
console.log(`[verify] 共 ${files.length} 个 js 文件`);

if (files.length === 0) {
  console.error("[verify] FAIL：产物目录为空或不存在，请先执行构建");
  process.exit(1);
}

const failed = [];
for (const feat of FEATURES) {
  const hit = files.some((f) => {
    try {
      return fs.readFileSync(f, "utf8").includes(feat.marker);
    } catch {
      return false;
    }
  });
  if (hit) {
    console.log(`[verify] OK   ${feat.id}`);
  } else {
    console.error(`[verify] FAIL ${feat.id}（缺少特征 "${feat.marker}"）`);
    failed.push(feat);
  }
}

if (failed.length > 0) {
  console.error(
    `\n[verify] ${failed.length} 项特征缺失 → 产物未包含预期功能，请重新构建（npm run build:mp-weixin:mock）后重试。`
  );
  process.exit(1);
}

console.log(`\n[verify] PASS：全部 ${FEATURES.length} 项功能特征已包含在构建产物中。`);