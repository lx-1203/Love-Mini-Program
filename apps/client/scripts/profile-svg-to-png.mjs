/**
 * profile SVG -> PNG 构建期转换脚本（支持子目录递归，目录结构镜像到 png/）。
 * 输入：src/static/assets/profile/svg/**
 * 输出：src/static/assets/profile/png/**
 * 用途：mp-weixin 基础库对本地 SVG <image> 兼容性不稳定，统一构建期转 PNG。
 */
import { readFile, mkdir, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { dirname, resolve, join, extname, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SVG_ROOT = resolve(__dirname, "..", "src", "static", "assets", "profile", "svg");
const PNG_ROOT = resolve(__dirname, "..", "src", "static", "assets", "profile", "png");

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".svg") {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const sharp = (await import("sharp")).default;
  if (!existsSync(SVG_ROOT)) {
    console.warn("[profile-svg-to-png] 未找到 svg 目录，跳过");
    return;
  }
  const files = await walk(SVG_ROOT);
  for (const svgPath of files) {
    const rel = relative(SVG_ROOT, svgPath).replace(/\.svg$/i, ".png");
    const pngPath = join(PNG_ROOT, rel);
    await mkdir(dirname(pngPath), { recursive: true });
    try {
      const svgBuffer = await readFile(svgPath);
      await sharp(svgBuffer, { density: 192 })
        .resize({ width: 750, withoutEnlargement: false })
        .png()
        .toFile(pngPath);
      console.log(`[profile-svg-to-png] OK ${rel}`);
    } catch (error) {
      console.error(`[profile-svg-to-png] FAIL ${rel}:`, error.message);
      process.exitCode = 1;
    }
  }
}

main();
