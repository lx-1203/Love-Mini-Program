/**
 * SVG 转 PNG 转换脚本
 * 将 tabbar SVG 图标转为 PNG 格式（微信小程序 tabBar 仅支持 png/jpg/jpeg）
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, resolve, join } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TABBAR_DIR = resolve(__dirname, "..", "src", "static", "assets", "icons", "tabbar");

/** tabbar 图标列表 */
const ICONS = [
  "home-default",
  "home-active",
  "village-default",
  "village-active",
  "discover-default",
  "discover-active",
  "chat-default",
  "chat-active",
  "profile-default",
  "profile-active",
];

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch (e) {
    console.error("sharp 模块未安装，请先运行: npm install sharp --no-save --prefix scripts/tmp");
    console.error("然后设置 NODE_PATH 后重试");
    process.exit(1);
  }

  console.log("开始转换 SVG -> PNG...\n");

  for (const name of ICONS) {
    const svgPath = join(TABBAR_DIR, `${name}.svg`);
    const pngPath = join(TABBAR_DIR, `${name}.png`);

    if (!existsSync(svgPath)) {
      console.error(`[SKIP] ${name}.svg 不存在`);
      continue;
    }

    try {
      const svgBuffer = await readFile(svgPath);
      // 输出 81x81 px（微信小程序 tabbar 图标推荐尺寸约 40-81px）
      await sharp(svgBuffer, { density: 300 })
        .resize(81, 81)
        .png()
        .toFile(pngPath);

      const stat = await (await import("fs/promises")).stat(pngPath);
      console.log(`[OK ] ${name}.png -> ${(stat.size / 1024).toFixed(1)} KB`);
    } catch (e) {
      console.error(`[FAIL] ${name}:`, e.message);
    }
  }

  console.log("\n转换完成");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
