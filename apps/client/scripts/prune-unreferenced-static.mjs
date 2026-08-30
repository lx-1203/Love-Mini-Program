/**
 * real 构建静态资源引用可达性清理（主包瘦身最后一道）。
 *
 * 背景：real 构建要求主包 ≤2MB。static/assets/** 由设计整包交付，含大量
 * 「运行时经 resolveMediaUrl 改写为后端 app-assets URL」的托管资产——这些文件
 * 在 real 包内是死重量（dist 里带着但运行时永远走 HTTP）。
 *
 * 判定规则（2026-08-30 增强）：
 *  1. 源码扫描收集两类引用：
 *     - raw 引用：不在 resolveMediaUrl(...) 包裹内的路径字面量（含模板 src="/static/..."）
 *     - wrapped 引用：resolveMediaUrl('...') 参数里的路径（运行时改写 → 后端托管）
 *  2. dist/static 中被「raw 引用」的文件保留；仅被 wrapped 引用或完全无引用的文件，
 *     若后端 app-assets 已托管同路径文件则删除，否则保留并告警。
 *  3. icons/tabbar/**（wx.setTabBarItem 原生读取）与 audio/** 永不删除。
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
const backendAssetsDir = resolve(clientDir, "../../apps/api/uploads/app-assets");

/** 递归收集 src 文本文件 */
function walkSrc(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "static" || name === ".mimosa") continue;
      walkSrc(p, out);
    } else if (/\.(ts|vue|js|json|scss|css)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

/** raw 引用（任意上下文，一律保留）与 wrapped 引用（仅出现在 resolveMediaUrl 行内） */
const rawReferenced = new Set();
const wrappedReferenced = new Set();
const PATH_RE = /['"]\/?((?:[\w-]+\/)+[\w-]+\.(?:png|svg|jpg|jpeg|gif|webp))['"]/g;
for (const f of walkSrc(srcDir)) {
  const lines = readFileSync(f, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    // 先移除 resolveMediaUrl('...') 实参，剩下的路径字面量视为 raw
    const stripped = line.replace(/resolveMediaUrl\(\s*['"][^'"]*['"]\s*(?:,[^)]*)?\)/g, "");
    const isWrappedLine = /resolveMediaUrl\s*\(/.test(line);
    let m;
    PATH_RE.lastIndex = 0;
    while ((m = PATH_RE.exec(stripped)) !== null) rawReferenced.add(m[1]);
    if (isWrappedLine) {
      PATH_RE.lastIndex = 0;
      while ((m = PATH_RE.exec(line)) !== null) wrappedReferenced.add(m[1]);
    }
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

/** 清理范围：全部静态资产目录（tabbar/audio 另有硬保护） */
const PRUNE_ROOTS = [
  join(distStatic, "assets"),
  join(distStatic, "svg-spec"),
];

const NEVER_DELETE = [
  /icons\/tabbar\//, // wx.setTabBarItem 原生读取
  /\/audio\//, // 本地音频
  /default-avatar\.(jpg|png)/, // 头像兜底（SafeImage 同步路径）
  /app\.json|project\./, // 误配兜底
];

let removedBytes = 0;
let removedCount = 0;
let keptMissingOnBackend = 0;
for (const root of PRUNE_ROOTS) {
  if (!existsSync(root)) continue;
  for (const file of walkDist(root)) {
    const rel = file.slice(distStatic.length + 1).split(sep).join("/");
    if (NEVER_DELETE.some((re) => re.test(rel))) continue;
    // 联系表/预览图无论是否被引用都删（设计交付物，非运行时资产）
    const isPreviewSheet = /预览|联系表|preview/.test(file);
    // 计算各后缀是否命中引用集合
    const parts = rel.split("/");
    let rawHit = false;
    for (let i = 0; i < parts.length; i++) {
      const suffix = parts.slice(i).join("/");
      if (rawReferenced.has(suffix)) { rawHit = true; break; }
    }
    if (rawHit && !isPreviewSheet) continue; // raw 引用：保留
    // 无 raw 引用（仅 wrapped 或无引用）→ 检查后端是否已托管
    // 后端目录结构：uploads/app-assets/assets/images/...（即 dist static 相对路径原样映射）
    const backendFile = join(backendAssetsDir, rel);
    const backendOk = existsSync(backendFile);
    if (!backendOk && !isPreviewSheet) {
      keptMissingOnBackend++;
      continue; // 后端没有同路径文件 → 保守保留
    }
    removedBytes += statSync(file).size;
    removedCount++;
    if (existsSync(file)) unlinkSync(file);
  }
  // 删除清空目录
  (function pruneEmpty(d) {
    let emptied = true;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) { if (pruneEmpty(p)) continue; emptied = false; continue; }
      emptied = false;
    }
    if (emptied && readdirSync(d).length === 0) { rmdirSync(d); return true; }
    return false;
  })(root);
}

console.log(`[prune-static] removed ${removedCount} files, ${(removedBytes / 1024).toFixed(0)}KB, kept(no backend copy): ${keptMissingOnBackend}`);
