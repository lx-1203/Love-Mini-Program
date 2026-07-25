/**
 * 检查硬编码路径中引用不存在文件的情况
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join, resolve, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const SRC_DIR = resolve(__dirname, "..", "src");
const STATIC_ASSETS_DIR = resolve(SRC_DIR, "static", "assets");

function listFiles(dir, exts = []) {
  const result = [];
  if (!existsSync(dir)) return result;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(fullPath, exts));
    } else if (entry.isFile()) {
      if (exts.length === 0 || exts.some(ext => entry.name.endsWith(ext))) {
        result.push(fullPath);
      }
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

// 获取所有 .vue, .ts, .js 文件
const sourceFiles = listFiles(SRC_DIR, [".vue", ".ts", ".js"]);

const problems = [];

for (const filePath of sourceFiles) {
  const relPath = relative(SRC_DIR, filePath).replace(/\\/g, "/");
  
  // 跳过 images.ts 配置文件本身
  if (relPath === "config/images.ts") continue;
  
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();
    
    // 跳过纯注释行
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }
    
    // 查找所有 /static/assets/ 开头的路径
    const regex = /\/static\/assets\/[^\s"'`()]+/g;
    const matches = [...line.matchAll(regex)];
    
    for (const match of matches) {
      let path = match[0];
      // 清理末尾可能的标点
      path = path.replace(/[.,;:!?)\]}]+$/, "");
      
      // 跳过包含模板变量的路径（动态拼接）
      if (path.includes("${") || path.includes("`")) {
        continue;
      }
      
      // 检查是否是图片/视频文件路径
      const isMediaFile = /\.(png|jpg|jpeg|gif|svg|mp4|webp|avif)$/i.test(path);
      if (!isMediaFile) continue;
      
      // 检查文件是否存在
      if (!existingPaths.has(path)) {
        problems.push({
          file: relPath,
          line: lineNum,
          path: path,
          lineContent: trimmed.slice(0, 100)
        });
      }
    }
  }
}

console.log("=".repeat(80));
console.log("硬编码路径引用不存在文件检查");
console.log("=".repeat(80));
console.log(`\n扫描文件数: ${sourceFiles.length}`);
console.log(`实际资源文件数: ${allAssetFiles.length}`);
console.log(`发现问题数: ${problems.length}`);

if (problems.length > 0) {
  console.log("\n❌ 问题列表:");
  console.log("-".repeat(80));
  
  // 按文件分组
  const byFile = {};
  for (const p of problems) {
    if (!byFile[p.file]) byFile[p.file] = [];
    byFile[p.file].push(p);
  }
  
  for (const [file, items] of Object.entries(byFile)) {
    console.log(`\n📄 ${file} (${items.length} 处)`);
    for (const item of items) {
      console.log(`   行 ${item.line}: ${item.path}`);
      console.log(`   代码: ${item.lineContent}`);
    }
  }
} else {
  console.log("\n✅ 所有硬编码路径引用的文件都存在！");
}

// 额外检查: config/assets-index.ts 中的路径
console.log("\n\n" + "=".repeat(80));
console.log("config/assets-index.ts 路径检查");
console.log("=".repeat(80));

const assetsIndexPath = resolve(SRC_DIR, "config", "assets-index.ts");
const assetsIndexContent = readFileSync(assetsIndexPath, "utf-8");
const assetsIndexPaths = [...assetsIndexContent.matchAll(/\/static\/[^\s"'`]+/g)]
  .map(m => m[0])
  .filter(p => /\.(png|jpg|jpeg|gif|svg|mp4|webp|avif)$/i.test(p));

console.log(`\n找到 ${assetsIndexPaths.length} 个路径:`);
for (const p of assetsIndexPaths) {
  // 检查是否在 assets 目录下
  const isInAssets = p.startsWith("/static/assets/");
  const isInGenerated = p.startsWith("/static/generated/");
  
  let exists = false;
  if (isInAssets) {
    exists = existingPaths.has(p);
  } else if (isInGenerated) {
    // 检查 generated 目录
    const generatedPath = p.replace("/static/", "");
    const fullPath = resolve(SRC_DIR, "static", generatedPath);
    exists = existsSync(fullPath);
  }
  
  console.log(`  ${exists ? '✅' : '❌'} ${p}`);
}
