/**
 * 精确验证 IMAGE_PATHS 配置中的所有路径
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join, resolve, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const SRC_DIR = resolve(__dirname, "..", "src");
const STATIC_ASSETS_DIR = resolve(SRC_DIR, "static", "assets");

function listFiles(dir) {
  const result = [];
  if (!existsSync(dir)) return result;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(fullPath));
    } else if (entry.isFile()) {
      result.push(fullPath);
    }
  }
  return result;
}

function toWebPath(fsPath) {
  const rel = relative(STATIC_ASSETS_DIR, fsPath).replace(/\\/g, "/");
  return "/static/assets/" + rel;
}

// 获取所有实际文件
const allAssetFiles = listFiles(STATIC_ASSETS_DIR);
const existingPaths = new Set(allAssetFiles.map(f => toWebPath(f)));

// 读取 images.ts 并通过 eval 方式获取所有路径（更准确）
const imagesConfigPath = resolve(SRC_DIR, "config", "images.ts");
const imagesConfigContent = readFileSync(imagesConfigPath, "utf-8");

// 使用更精确的正则提取所有路径值
// 匹配模式: 键: '/static/assets/...' 或 键: `/static/assets/...`
const allPathRegex = /['"`]\/static\/assets\/[^'"`]+['"`]/g;
const allMatches = [...imagesConfigContent.matchAll(allPathRegex)];
const allPaths = allMatches.map(m => m[0].replace(/['"`]/g, ''));

console.log("IMAGE_PATHS 中提取到的路径总数:", allPaths.length);

// 检查哪些不存在
const missing = [];
const existing = [];
for (const p of allPaths) {
  if (existingPaths.has(p)) {
    existing.push(p);
  } else {
    missing.push(p);
  }
}

console.log("\n✅ 存在的路径:", existing.length);
console.log("❌ 不存在的路径:", missing.length);

if (missing.length > 0) {
  console.log("\n❌ 不存在的路径列表:");
  for (const p of missing) {
    console.log("  -", p);
  }
}

// 额外检查: SafeImage 默认 fallback 路径
console.log("\n\n额外检查:");
const safeImageDefault = "/static/assets/default-avatar.png";
console.log(`SafeImage 默认 fallback (${safeImageDefault}): ${existingPaths.has(safeImageDefault) ? '✅ 存在' : '❌ 不存在'}`);

const safeImageJpg = "/static/assets/default-avatar.jpg";
console.log(`default-avatar.jpg (${safeImageJpg}): ${existingPaths.has(safeImageJpg) ? '✅ 存在' : '❌ 不存在'}`);

// 检查视频文件
const videoPath = "/static/assets/videos/campus-bg.mp4";
console.log(`视频文件 (${videoPath}): ${existingPaths.has(videoPath) ? '✅ 存在' : '❌ 不存在'}`);

// 检查 ActivityCard 动态拼接的可能路径
console.log("\n\nActivityCard 中动态 emoji 路径检查:");
console.log("(路径格式: /static/assets/icons/common/${emoji})");
const commonIcons = allAssetFiles
  .filter(f => f.includes("icons\\common"))
  .map(f => toWebPath(f))
  .filter(p => p.endsWith(".png"));
console.log(`common 目录下有 ${commonIcons.length} 个 PNG 图标`);
