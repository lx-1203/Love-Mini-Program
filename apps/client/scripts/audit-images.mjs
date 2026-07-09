/**
 * 审计图片资源现状
 * - 列出所有图片文件
 * - 检查每个文件大小（标记 < 10KB 占位文件）
 * - 计算每个文件 MD5（标记重复文件）
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join, resolve, relative } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const STATIC_DIR = resolve(__dirname, "..", "src", "static", "assets");

const TARGET_DIRS = [
  "images/posters",
  "images/posts",
  "images/activities",
  "images/products",
  "images/banners",
  "images/avatars",
];

function listFiles(dir) {
  const result = [];
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

function md5(filePath) {
  const buf = readFileSync(filePath);
  return createHash("md5").update(buf).digest("hex");
}

const all = [];
for (const sub of TARGET_DIRS) {
  const dir = join(STATIC_DIR, sub);
  let files = [];
  try {
    files = listFiles(dir);
  } catch {
    console.log(`[WARN] 目录不存在: ${sub}`);
    continue;
  }
  for (const f of files) {
    const stat = statSync(f);
    const hash = md5(f);
    all.push({
      rel: relative(STATIC_DIR, f).replace(/\\/g, "/"),
      size: stat.size,
      sizeKB: (stat.size / 1024).toFixed(2),
      md5: hash,
    });
  }
}

// 输出审计报告
console.log("===== 图片资源审计报告 =====\n");
console.log("文件路径".padEnd(50) + " 大小(KB)".padStart(10) + "  MD5".padStart(34) + "  备注");
console.log("-".repeat(120));

const md5Count = new Map();
for (const item of all) {
  md5Count.set(item.md5, (md5Count.get(item.md5) || 0) + 1);
}

for (const item of all) {
  const notes = [];
  if (item.size < 10 * 1024) notes.push("<10KB 占位");
  if ((md5Count.get(item.md5) || 0) > 1) notes.push("重复");
  console.log(
    item.rel.padEnd(50) +
      " " +
      item.sizeKB.padStart(8) +
      "KB " +
      (" " + item.md5.slice(0, 32)).padStart(34) +
      "  " +
      notes.join(",")
  );
}

console.log("\n===== 统计 =====");
console.log(`总文件数: ${all.length}`);
console.log(`<10KB 占位文件数: ${all.filter((x) => x.size < 10 * 1024).length}`);
const dupMd5 = [...md5Count.entries()].filter(([, c]) => c > 1);
console.log(`重复 MD5 组数: ${dupMd5.length}`);
for (const [hash, count] of dupMd5) {
  const dups = all.filter((x) => x.md5 === hash).map((x) => x.rel);
  console.log(`  [${hash.slice(0, 8)}] x${count}: ${dups.join(", ")}`);
}

// JSON 输出供后续脚本使用
const jsonPath = resolve(__dirname, "audit-result.json");
writeFileSync(jsonPath, JSON.stringify(all, null, 2), "utf-8");
console.log(`\n审计结果已写入: ${jsonPath}`);
