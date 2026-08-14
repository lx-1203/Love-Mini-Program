/**
 * prepare-static.mjs — 静态装饰资产按构建模式准备（2026-08-10 包体积优化）。
 *
 * 背景：装饰图片（generated/images + assets/images，约 7.7MB）已从 src/static
 * 移出到 static-local-backup/，real 模式（mp-weixin real 构建）改由后端
 * /api/v1/media/app-assets/ 公开端点提供（media.ts resolveMediaUrl 改写），
 * 包内不再携带 → 主包体积大幅下降。
 *
 * 但 dev/mock 构建与 H5 构建仍引用本地图片（mock 无后端、H5 用户自行部署），
 * 因此构建前需按模式恢复/清理：
 *   --dev / --h5  ：从备份复制回 src/static（mock 模式与 H5 需要本地图）
 *   --real        ：确保 src/static 无装饰图（仅保留 icons/audio/default-avatar）
 *
 * 用法：
 *   node scripts/prepare-static.mjs --dev
 *   node scripts/prepare-static.mjs --real
 *   node scripts/prepare-static.mjs --h5
 */
import { existsSync, mkdirSync, cpSync, rmSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src/static");
const BACKUP = resolve(__dirname, "../static-local-backup");

/** 备份目录 → 目标位置 映射 */
const PAIRS = [
  { backup: "generated", dest: join(SRC, "generated") },
  { backup: "assets-images", dest: join(SRC, "assets/images") },
];

const mode = process.argv[2] || "--real";

function restore() {
  for (const { backup, dest } of PAIRS) {
    const from = join(BACKUP, backup);
    if (!existsSync(from)) continue;
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(from, dest, { recursive: true, force: true });
    console.log(`[prepare-static] restored ${backup} -> ${dest}`);
  }
}

function strip() {
  for (const { backup, dest } of PAIRS) {
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true, force: true });
      console.log(`[prepare-static] removed ${dest}`);
    }
  }
}

if (mode === "--dev" || mode === "--h5") {
  restore();
} else if (mode === "--real") {
  strip();
} else {
  console.error(`[prepare-static] 未知模式: ${mode}（支持 --dev / --h5 / --real）`);
  process.exit(1);
}

// 校验 src/static 结构完整（icons/audio 不应被移动）
for (const keep of ["assets/icons", "audio", "default-avatar.png"]) {
  if (!existsSync(join(SRC, keep))) {
    console.warn(`[prepare-static] 警告：本地必需资源缺失 ${keep}`);
  }
}
console.log(`[prepare-static] 完成（模式 ${mode}）`);
