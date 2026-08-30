/**
 * split-icons.mjs — 拆分图标素材盘点/补全（2026-08-26 修订）。
 *
 * 用途（素材/ 下所有 "拆分图标_*" 目录）：
 * 1. 盘点：manifest 中列出的 PNG 若已存在 → 视为「已拆分，可直接使用」，不裁剪。
 * 2. 补全：缺失的用源图按 manifest.position 裁剪生成（源图查找：目录内 manifest.source
 *    → 未指定时向上递归查找同名文件，如 参考吉祥物.png 在上级目录）。
 * 输出：apps/client/src/static/assets/icons-split/<bundle>/<filename>（仅补全时生成）
 * 用法：node apps/client/scripts/split-icons.mjs
 */
import { readdir, readFile, mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../.."); // apps/client/scripts -> 仓库根
const MATERIALS = join(ROOT, "素材");
const OUT = resolve(__dirname, "../src/static/assets/icons-split");

/** 找到所有拆分图标清单目录 */
async function findBundles(dir) {
  const out = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        const child = join(dir, e.name);
        out.push(...(await findBundles(child)));
        if (e.name.startsWith("拆分图标")) {
          if (existsSync(join(child, "manifest.json"))) out.push(child);
        }
      }
    }
  } catch { /* 忽略不可读目录 */ }
  return out;
}

/** 向上递归查找同名源图（跨目录，最长回溯 3 层） */
async function findSourceUpwards(startDir, fileName, depth = 0) {
  if (depth > 3 || !startDir) return null;
  const candidate = join(startDir, fileName);
  if (existsSync(candidate)) return candidate;
  return findSourceUpwards(dirname(startDir), fileName, depth + 1);
}

async function main() {
  const bundles = await findBundles(MATERIALS);
  console.log(`[split-icons] 扫描到拆分图标清单目录: ${bundles.length}`);
  const missing = [];
  let readyCount = 0;
  let generatedCount = 0;

  for (const bundle of bundles) {
    const manifest = JSON.parse(await readFile(join(bundle, "manifest.json"), "utf8"));
    const icons = manifest.icons ?? Object.values(manifest).find((v) => Array.isArray(v) && v[0]?.filename) ?? [];
    if (icons.length === 0) { missing.push({ bundle, reason: "manifest 无可盘点 icons" }); continue; }

    const existing = icons.filter((i) => i.filename && existsSync(join(bundle, i.filename)));
    const needGen = icons.filter((i) => i.filename && !existsSync(join(bundle, i.filename)));
    if (needGen.length === 0) {
      readyCount += existing.length;
      console.log(`[split-icons] READY ${bundle}（${existing.length} 个已拆分，可直接使用）`);
      continue;
    }

    // 尝试源图补全
    const sourceName = manifest.source ?? null;
    let sourcePath = null;
    if (sourceName) sourcePath = await findSourceUpwards(bundle, sourceName);
    if (!sourcePath) {
      missing.push({ bundle, reason: `缺 ${needGen.length} 个 PNG（源图 ${sourceName ?? "未声明"} 亦未找到）` });
      continue;
    }
    try {
      const sharp = (await import("sharp")).default;
      const srcBuffer = await readFile(sourcePath);
      const bundleName = manifest.directory || manifest.title || dirname(bundle).split(/[\\/]/).pop();
      const outDir = join(OUT, String(bundleName).replace(/[^\w\u4e00-\u9fa5-]/g, "_"));
      await mkdir(outDir, { recursive: true });
      for (const icon of needGen) {
        const pos = icon.position;
        if (!Array.isArray(pos) || pos.length !== 4) continue;
        const png = await sharp(srcBuffer).extract({ left: pos[0], top: pos[1], width: pos[2], height: pos[3] }).png().toBuffer();
        await writeFile(join(outDir, icon.filename), png);
        generatedCount += 1;
      }
      console.log(`[split-icons] GENERATED ${bundle}: ${needGen.length} 个（源图 ${sourcePath}）`);
    } catch (err) {
      missing.push({ bundle, reason: `裁剪异常: ${err.message}` });
    }
  }

  console.log(`\n[split-icons] 汇总：已就绪 ${readyCount} 个，本次补全 ${generatedCount} 个。`);
  if (missing.length > 0) {
    console.log("[split-icons] 仍缺失（进入报告）：");
    for (const m of missing) console.log(`  - [${m.bundle}] ${m.reason}`);
  }
}

main().catch((err) => {
  console.error("[split-icons] 失败:", err);
  process.exit(1);
});