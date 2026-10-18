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
 * 用法：node scripts/prune-unreferenced-static.mjs --dist <产物目录>
 * 挂载：build:mp-weixin:real 链中 verify-package-size 之前。
 *
 * 2026-10-18（MP-FIDELITY Phase A3）—— 这一步会**删文件**，所以补三道前提，全部可红：
 *  1. `--dist` 必传。以前缺省硬编码 `dist/build/mp-weixin`（mock 档的家），实测发布链里这一步
 *     一直在裁 mock 产物，而"发布形态已瘦身"的结论记在别人的目录上（D-A0）。现在没有 --dist 就退 2，
 *     不猜目录、不动任何文件。
 *  2. 动手前读 `<dist>/config/env.js` 断言 `MODE:"real"`。别的档（mock/showcase）指向这里 ⇒ 拒绝，
 *     否则一次拼错的 --dist 就会把 mock 证据剪掉，而 mock 轮靠的是 before/after 配对。
 *  3. 删除前把待剪子树整棵 cp -a 到 `archive/prune-backup/<stamp>/` 并打 PRUNE_BACKUP=；
 *     备份写不成功 ⇒ 一个文件都不删（rm && mv 共享 $? 的那类事故不再来一次）。
 */
import { readFileSync, readdirSync, statSync, existsSync, unlinkSync, rmdirSync, mkdirSync } from "node:fs";
import { join, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");
const srcDir = join(clientDir, "src");
const backendAssetsDir = resolve(clientDir, "../../apps/api/uploads/app-assets");

const argv = process.argv.slice(2);
const opt = (k, dflt) => {
  const i = argv.indexOf("--" + k);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  return v === undefined || String(v).startsWith("--") ? dflt : v;
};
const RK = "PRUNE_RESULT";
const dryRun = argv.includes("--dry");

const distArg = String(opt("dist", "")).trim();
if (!distArg) {
  console.error(`${RK}=NOT-EVIDENCED reason=--dist-missing hint=这一步会删文件，缺省目录曾经是 mock 档（D-A0），现在必须点名要剪哪一档`);
  process.exit(2);
}
const distDir = resolve(distArg);
const distStatic = join(distDir, "static");
const distEnvJs = join(distDir, "config/env.js");

// 档位断言：只剪 real 档。读不到/不是 real ⇒ 一个字节都不动。
if (!existsSync(distEnvJs)) {
  console.error(`${RK}=REFUSED_BAND reason=no-env-js dir=${distDir}（这不是 uni 产物目录，拒删）`);
  process.exit(1);
}
const envJsSrc = readFileSync(distEnvJs, "utf-8");
const modeHit = String(envJsSrc).match(/MODE:\s*"([^"]+)"/);
const bandMode = modeHit ? modeHit[1] : "(MODE 未记)";
if (bandMode !== "real") {
  console.error(`${RK}=REFUSED_BAND reason=mode-not-real got="${bandMode}" dir=${distDir} ⇒ 这一步会删文件，指向 mock/showcase 档就等于剪掉别的轮的配对证据`);
  process.exit(1);
}
if (!existsSync(distStatic)) {
  console.log(`${RK}=PASS removed=0 note=该产物没有 static 目录（${distStatic}），无物可剪`);
  process.exit(0);
}

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
  // 注册页表单图标（2026-09-12）：IMAGE_PATHS.REGISTER_ICONS 为完整 /static 字面量
  // （path 字面量含 static/ 前缀，raw 后缀匹配不上），且设计上固定本地路径——
  // 表单关键图标不随 real 模式切后端基址，避免弱网下表单图标空白
  /icons\/register\//,
];

let removedBytes = 0;
let removedCount = 0;
let keptMissingOnBackend = 0;

/* 两趟：先只**算**要删哪些（不碰盘），再备份，最后才删。
   以前是一边遍历一边 unlinkSync ⇒ 想留一份"删之前长什么样"的凭据就没有位置了。 */
const toDelete = [];
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
    toDelete.push({ file, rel });
  }
}
removedCount = toDelete.length;
for (const t of toDelete) removedBytes += statSync(t.file).size;

/* 备份：把待删文件按相对路径 cp -a 进 archive/prune-backup/<stamp>/。
   备份写不成功 ⇒ 一个都不删（"rm && mv 共享同一个 $?"那一类事故不在这里重演）。 */
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
const backupDir = join(clientDir, "archive", "prune-backup", `real-${stamp}`);
let backupOk = false;
if (removedCount > 0 && !dryRun) {
  try {
    mkdirSync(backupDir, { recursive: true });
    for (const t of toDelete) {
      const dst = join(backupDir, t.rel);
      mkdirSync(dirname(dst), { recursive: true });
      const r = spawnSync("cp", ["-a", t.file, dst], { stdio: ["ignore", "inherit", "inherit"] });
      if (r.status !== 0) throw new Error(`cp -a ${t.file} ${dst} exit=${r.status}`);
    }
    backupOk = true;
    console.log(`PRUNE_BACKUP=${backupDir} files=${removedCount} bytes=${removedBytes}`);
  } catch (e) {
    console.error(`PRUNE_BACKUP=FAILED err=${String(e && e.message).slice(0, 120)} ⇒ 没有备份就不许删：本次不剪任何文件`);
    console.log(`${RK}=NOT-EVIDENCED reason=backup-failed wouldRemove=${removedCount}`);
    process.exit(2);
  }
}

if (dryRun) {
  console.log(`PRUNE_DRY dist=${distDir} mode=${bandMode} wouldRemove=${removedCount} bytes=${removedBytes} kept(no backend copy)=${keptMissingOnBackend}`);
  for (const t of toDelete.slice(0, 20)) console.log(`  PRUNE_DRY_ITEM ${t.rel}`);
  if (removedCount > 20) console.log(`  PRUNE_DRY_ITEM …另 ${removedCount - 20} 个未逐条点名`);
  console.log(`${RK}=DRY wouldRemove=${removedCount} bytes=${removedBytes}（没动盘）`);
  process.exit(0);
}

if (removedCount > 0 && !backupOk) {
  console.log(`${RK}=NOT-EVIDENCED reason=backup-missing`);
  process.exit(2);
}

for (const t of toDelete) unlinkSync(t.file);

/* 删除清空目录（只在真删过之后） */
if (removedCount > 0) {
  for (const root of PRUNE_ROOTS) {
    if (!existsSync(root)) continue;
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
}

console.log(`[prune-static] dist=${distDir} band=${bandMode} removed ${removedCount} files, ${(removedBytes / 1024).toFixed(0)}KB, kept(no backend copy): ${keptMissingOnBackend}`);
console.log(`${RK}=PASS removed=${removedCount} bytes=${removedBytes} keptMissingOnBackend=${keptMissingOnBackend} backup=${backupOk ? backupDir : "none(无物可删)"} dir=${distDir}`);
