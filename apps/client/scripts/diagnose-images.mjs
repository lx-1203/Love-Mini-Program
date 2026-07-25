/**
 * 图片资源系统诊断脚本
 * 诊断内容：
 * 1. 硬编码 /static/assets/ 路径（未使用 IMAGE_PATHS 常量）
 * 2. IMAGE_PATHS 中定义的路径是否有对应文件
 * 3. 引用不存在文件的图片路径
 * 4. SafeImage 组件使用情况
 * 5. TabBar 图标路径一致性
 */

import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, resolve, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const SRC_DIR = resolve(__dirname, "..", "src");
const STATIC_ASSETS_DIR = resolve(SRC_DIR, "static", "assets");

// ============== 工具函数 ==============

function listFiles(dir, extList = []) {
  const result = [];
  if (!existsSync(dir)) return result;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(fullPath, extList));
    } else if (entry.isFile()) {
      if (extList.length === 0 || extList.some(ext => entry.name.endsWith(ext))) {
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

// ============== 1. 获取所有实际存在的文件 ==============

const allAssetFiles = listFiles(STATIC_ASSETS_DIR);
const existingPaths = new Set(allAssetFiles.map(f => toWebPath(f)));

console.log("===== 实际存在的资源文件数:", allAssetFiles.length);

// ============== 2. 解析 IMAGE_PATHS 配置 ==============

const imagesConfigPath = resolve(SRC_DIR, "config", "images.ts");
const imagesConfigContent = readFileSync(imagesConfigPath, "utf-8");

// 提取所有路径值（简单正则提取）
const pathRegex = /['"`](\/static\/assets\/[^'"`]+)['"`]/g;
const imagePathMatches = [...imagesConfigContent.matchAll(pathRegex)];
const imagePathsFromConfig = imagePathMatches.map(m => m[1]);

console.log("\n===== IMAGE_PATHS 中定义的路径数:", imagePathsFromConfig.length);

// 检查 IMAGE_PATHS 中不存在的文件
const missingFromConfig = [];
for (const p of imagePathsFromConfig) {
  if (!existingPaths.has(p)) {
    missingFromConfig.push(p);
  }
}

// ============== 3. 扫描所有 .vue 和 .ts 文件中的硬编码路径 ==============

const vueTsFiles = listFiles(SRC_DIR, [".vue", ".ts", ".js"]);
const hardcodedPaths = []; // { file, line, path, isInComment }
const safeImageUsage = []; // 使用 SafeImage 的文件
const rawImageUsage = []; // 直接使用 <image> 标签的文件（关键页面）

for (const filePath of vueTsFiles) {
  const relPath = relative(SRC_DIR, filePath).replace(/\\/g, "/");
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // 跳过 images.ts 配置文件本身
  if (relPath === "config/images.ts") continue;

  // 检查硬编码路径
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 跳过纯注释行（简单判断）
    const trimmed = line.trim();
    const isComment = trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");

    // 查找 /static/assets/ 路径
    const matches = [...line.matchAll(/\/static\/assets\/[^'"`\s)]+/g)];
    for (const m of matches) {
      let path = m[0];
      // 移除可能的尾部字符
      path = path.replace(/[),;\s]+$/, "");
      hardcodedPaths.push({
        file: relPath,
        line: lineNum,
        path: path,
        isComment,
        lineContent: trimmed
      });
    }
  }

  // 检查 SafeImage 使用
  if (content.includes("SafeImage")) {
    safeImageUsage.push(relPath);
  }

  // 检查关键组件中直接使用 <image> 的情况
  const isKeyComponent = [
    "components/common/Avatar.vue",
    "components/social/WallPostCard.vue",
    "components/home/PersonCard.vue",
    "components/home/ActivityCard.vue",
    "components/discover/CardSwiper.vue",
  ].some(p => relPath.includes(p));

  if (isKeyComponent && content.includes("<image")) {
    // 统计直接使用 image 标签的数量（不包含 SafeImage 内部的）
    const imageTags = [...content.matchAll(/<image\s/g)];
    rawImageUsage.push({ file: relPath, count: imageTags.length });
  }
}

// 去重硬编码路径（同一文件同一行同一路径只记录一次）
const uniqueHardcoded = hardcodedPaths.filter((item, index, self) =>
  index === self.findIndex(t =>
    t.file === item.file && t.line === item.line && t.path === item.path
  )
);

// 过滤掉注释中的路径
const hardcodedNonComment = uniqueHardcoded.filter(x => !x.isComment);

console.log("\n===== 硬编码 /static/assets/ 路径（非注释）:", hardcodedNonComment.length);

// ============== 4. 检查引用不存在文件的路径 ==============

const nonExistentPaths = [];

// 从硬编码路径中找不存在的
for (const item of hardcodedNonComment) {
  if (!existingPaths.has(item.path)) {
    // 排除动态拼接的路径（包含变量/模板字符串的）
    if (!item.path.includes("${") && !item.path.includes("`")) {
      nonExistentPaths.push({
        ...item,
        source: "hardcoded"
      });
    }
  }
}

// 从 IMAGE_PATHS 中找不存在的
for (const p of missingFromConfig) {
  nonExistentPaths.push({
    file: "config/images.ts",
    line: 0,
    path: p,
    source: "IMAGE_PATHS"
  });
}

console.log("\n===== 引用不存在文件的路径:", nonExistentPaths.length);

// ============== 5. 检查 TabBar 图标路径 ==============

const tabBarFiles = [
  "custom-tab-bar/index.js",
  "components/layout/TabBar.vue",
];

const tabBarIcons = [];
for (const relPath of tabBarFiles) {
  const filePath = resolve(SRC_DIR, relPath);
  if (!existsSync(filePath)) continue;
  const content = readFileSync(filePath, "utf-8");
  const matches = [...content.matchAll(/\/static\/assets\/icons\/tabbar\/[^'"`]+/g)];
  for (const m of matches) {
    tabBarIcons.push({ file: relPath, path: m[0] });
  }
}

// 检查 pages.json 中的 tabBar
const pagesJsonPath = resolve(SRC_DIR, "pages.json");
const pagesJson = JSON.parse(readFileSync(pagesJsonPath, "utf-8"));
const tabBarList = pagesJson.tabBar?.list || [];
for (const item of tabBarList) {
  if (item.iconPath) {
    const p = "/" + item.iconPath;
    tabBarIcons.push({ file: "pages.json", path: p });
  }
  if (item.selectedIconPath) {
    const p = "/" + item.selectedIconPath;
    tabBarIcons.push({ file: "pages.json", path: p });
  }
}

const missingTabBarIcons = tabBarIcons.filter(x => !existingPaths.has(x.path));

console.log("\n===== TabBar 图标路径数:", tabBarIcons.length);
console.log("===== 缺失的 TabBar 图标:", missingTabBarIcons.length);

// ============== 6. 输出诊断报告 ==============

console.log("\n\n" + "=".repeat(80));
console.log("  图片显示问题系统诊断报告");
console.log("=".repeat(80));

// P0: 图片不存在/路径错误
console.log("\n📛 P0 - 严重：图片不存在 / 路径错误");
console.log("-".repeat(80));

if (nonExistentPaths.length === 0) {
  console.log("✅ 未发现引用不存在文件的路径");
} else {
  const p0Hardcoded = nonExistentPaths.filter(x => x.source === "hardcoded");
  const p0Config = nonExistentPaths.filter(x => x.source === "IMAGE_PATHS");

  if (p0Hardcoded.length > 0) {
    console.log(`\n硬编码路径引用不存在文件 (${p0Hardcoded.length} 处):`);
    for (const item of p0Hardcoded) {
      console.log(`  ❌ ${item.file}:${item.line}`);
      console.log(`     路径: ${item.path}`);
      console.log(`     代码: ${item.lineContent?.slice(0, 80) || ''}`);
    }
  }

  if (p0Config.length > 0) {
    console.log(`\nIMAGE_PATHS 中定义但文件不存在 (${p0Config.length} 处):`);
    for (const item of p0Config) {
      console.log(`  ❌ ${item.path}`);
    }
  }

  if (missingTabBarIcons.length > 0) {
    console.log(`\nTabBar 图标缺失 (${missingTabBarIcons.length} 处):`);
    for (const item of missingTabBarIcons) {
      console.log(`  ❌ ${item.file}: ${item.path}`);
    }
  }
}

// P1: 硬编码未使用常量
console.log("\n\n⚠️  P1 - 中等：硬编码未使用 IMAGE_PATHS 常量");
console.log("-".repeat(80));

// 按文件分组
const byFile = {};
for (const item of hardcodedNonComment) {
  if (!byFile[item.file]) byFile[item.file] = [];
  byFile[item.file].push(item);
}

const p1Files = Object.entries(byFile)
  .filter(([file]) => !file.includes("config/images.ts"))
  .sort((a, b) => b[1].length - a[1].length);

console.log(`\n共 ${p1Files.length} 个文件存在硬编码路径 (${hardcodedNonComment.length} 处):\n`);

for (const [file, items] of p1Files) {
  console.log(`📄 ${file} (${items.length} 处)`);
  // 去重路径
  const uniquePaths = [...new Set(items.map(i => i.path))];
  for (const p of uniquePaths.slice(0, 5)) {
    const firstItem = items.find(i => i.path === p);
    console.log(`   行 ${firstItem?.line || '?'}: ${p}`);
  }
  if (uniquePaths.length > 5) {
    console.log(`   ... 还有 ${uniquePaths.length - 5} 个路径`);
  }
  console.log("");
}

// P2: 未使用 SafeImage 兜底
console.log("\n\n🟡 P2 - 轻微：关键组件未使用 SafeImage 兜底");
console.log("-".repeat(80));

console.log(`\n使用 SafeImage 的文件 (${safeImageUsage.length} 个):`);
for (const f of safeImageUsage.sort()) {
  console.log(`  ✅ ${f}`);
}

console.log(`\n关键组件直接使用 <image> 标签 (${rawImageUsage.length} 个):`);
for (const item of rawImageUsage) {
  console.log(`  ⚠️  ${item.file} - ${item.count} 个 <image> 标签`);
}

// 统计关键页面
const keyPages = [
  "pages/home/index.vue",
  "pages/discover/index.vue",
  "pages/village/index.vue",
  "pages/chat/index.vue",
  "pages/profile/index.vue",
];

console.log("\n关键页面 SafeImage 使用情况:");
for (const page of keyPages) {
  const used = safeImageUsage.some(f => f === page);
  console.log(`  ${used ? '✅' : '❌'} ${page}`);
}

// 修复建议
console.log("\n\n" + "=".repeat(80));
console.log("  修复建议");
console.log("=".repeat(80));

console.log(`
### P0 修复建议（最高优先级）
1. 检查并补充所有缺失的图片文件，或修正路径
2. 优先修复 TabBar 图标（影响核心导航体验）
3. 验证 IMAGE_PATHS 中每个路径对应文件真实存在

### P1 修复建议（中优先级）
1. 将硬编码路径统一替换为 IMAGE_PATHS 常量引用
2. 优先修复组件文件中的硬编码（复用率高）
3. 考虑添加 ESLint 规则防止新的硬编码路径

### P2 修复建议（低优先级）
1. Avatar 组件内部改用 SafeImage
2. WallPostCard 等卡片组件的帖子图片改用 SafeImage
3. 为 SafeImage 增加 easycom 自动引入，减少手动 import
`);

// 输出统计摘要
console.log("\n" + "=".repeat(80));
console.log("  统计摘要");
console.log("=".repeat(80));
console.log(`
  实际资源文件数:    ${allAssetFiles.length}
  IMAGE_PATHS 定义数: ${imagePathsFromConfig.length}
  硬编码路径数:       ${hardcodedNonComment.length}
  P0 问题数:          ${nonExistentPaths.length + missingTabBarIcons.length}
  P1 问题文件数:      ${p1Files.length}
  P2 关键组件数:      ${rawImageUsage.length}
`);
