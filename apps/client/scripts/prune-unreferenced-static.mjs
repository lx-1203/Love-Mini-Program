/**
 * real 构建静态资源引用可达性清理（主包瘦身最后一道）。
 *
 * 背景：real 构建要求主包 ≤2MB。static/assets/icons/** 等目录由设计整包交付，
 * 含「图标预览_联系表.png」等非运行时资产与未被 config/images.ts 引用的图标行，
 * 累计数 MB。本脚本扫描 src 源码中出现的静态路径字面量，删除 dist 产物中
 * 不可达的静态文件（仅动 dist，不动 src 源资产）。
 *
 * 用法：node scripts/prune-unreferenced-static.mjs
 * 挂载：build:mp-weixin:real 链中 verify-package-size 之前。
 */
import { readFileSync, readdirSync, statSync, existsSync, unlinkSync, rmdirSync } from "node:fs";
import { join, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");
const srcDir = join(clientDir, "src");
const distStatic = join(clientDir, "dist/build/mp-weixin/static");

/** 递归收集 src 文本文件 */
function walkSrc(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "static") continue; // static 目录本身不是引用方
      walkSrc(p, out);
    } else if (/\.(ts|vue|js|json|scss|css)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

/** 收集引用片段集合（如 "icons/home/tabbar-top/icon_row1_01.png"） */
const referenced = new Set();
for (const f of walkSrc(srcDir)) {
  const text = readFileSync(f, "utf-8");
    // resolveMediaUrl(...) 参数为运行时改写路径：从扫描文本剔除，使对应文件不保留在 dist
    const scanText = text.replace(/resolveMediaUrl\(\s*['"][^'"]+['"]\s*\)/g, "");
  // 匹配相对 static/assets 之后的路径字面量：'/home/xx/yy.png'、"/svg-spec/.../a.svg" 等
  // 允许前导 /（custom-tab-bar 的 "/static/assets/icons/tabbar/..."），否则误删 tabBar 图标
  const re = /['"]\/?((?:[\w-]+\/)+[\w-]+\.(?:png|svg|jpg|jpeg|gif|webp))['"]/g;
  let m;
  while ((m = re.exec(scanText)) !== null) {
    referenced.add(m[1]);
  }
}

/** 递归收集 dist/static 文件 */
function walkDist(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkDist(p, out);
    else out.push(p);
  }
  return out;
}

/** 只清理这些「设计整包交付」目录（其余如 audio/mascot/message 全保留，避免误伤） */
const PRUNE_ROOTS = [
  join(distStatic, "assets/icons"),
  join(distStatic, "assets/profile"),
  join(distStatic, "svg-spec"),
];

let removedBytes = 0;
let removedCount = 0;
for (const root of PRUNE_ROOTS) {
  if (!existsSync(root)) continue;
  for (const file of walkDist(root)) {
    const rel = file.slice(distStatic.length + 1).split(sep).join("/");
    // 对每个文件，检查「从 assets/ 或根开始」的若干后缀是否命中引用集合
    const parts = rel.split("/");
    let hit = false;
    for (let i = 0; i < parts.length; i++) {
      const suffix = parts.slice(i).join("/");
      if (referenced.has(suffix)) {
        hit = true;
        break;
      }
    }
    // 联系表/预览图无论是否被引用都删（设计交付物，非运行时资产）
    const isPreviewSheet = /预览|联系表|preview/.test(file);
    if (/icons\/tabbar\//.test(file)) continue; // tabBar 图标原生读取，永不删除
    if (!hit || isPreviewSheet) {
      removedBytes += statSync(file).size;
      removedCount++;
      if (existsSync(file)) unlinkSync(file);
    }
  }
  // 删除清空目录
  (function pruneEmpty(d) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) pruneEmpty(p);
    }
    if (readdirSync(d).length === 0) rmdirSync(d);
  })(root);
}

console.log(`[prune-static] removed ${removedCount} files, ${(removedBytes / 1024).toFixed(0)}KB`);
