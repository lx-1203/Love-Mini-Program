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
import { existsSync, mkdirSync, cpSync, rmSync, readdirSync, readFileSync, statSync } from "node:fs";
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

/** 2026-08-29 真机 2MB 门禁：real 形态 static 全量迁后端 app-assets，
 * dev/h5 形态从 full-static 全量备份恢复。PAIRS 仍用于历史备份兼容。 */
function clearSrcStatic() {
  if (!existsSync(SRC)) return;
  for (const name of readdirSync(SRC)) {
    rmSync(join(SRC, name), { recursive: true, force: true });
  }
}

function restore() {
  clearSrcStatic();
  const full = join(BACKUP, "full-static");
  if (existsSync(full)) {
    cpSync(full, SRC, { recursive: true, force: true });
    console.log("[prepare-static] restored full-static -> src/static");
    return;
  }
  for (const { backup, dest } of PAIRS) {
    const from = join(BACKUP, backup);
    if (!existsSync(from)) continue;
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(from, dest, { recursive: true, force: true });
    console.log(`[prepare-static] restored ${backup} -> ${dest}`);
  }
}

function strip() {
  clearSrcStatic();
  // 1) tabBar 图标（pages.json tabBar + custom-tab-bar 原生读取，不走 resolveMediaUrl）必须本地保留
  const tabbar = join(BACKUP, "full-static/assets/icons/tabbar");
  if (existsSync(tabbar)) {
    const dst = join(SRC, "assets/icons/tabbar");
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(tabbar, dst, { recursive: true, force: true });
  }
  // 2) 源码字面量引用的 /static/**（Vue 模板 <image src="/static/.."> 编译进 wxml，
  //    微信启动时强校验文件存在、不走运行时改写）→ 从完整备份恢复命中文件
  const full = join(BACKUP, "full-static");
  const refs = new Set();
  // 引用集来源（按优先级）：a) 上一次构建 dist 的 wxml/json（微信启动强校验最小集）；
  // b) 无 dist 时回退扫 src 源码。resolveMediaUrl(...) 参数为运行时改写路径，无需本地文件。
  const distRoot = resolve(__dirname, "../dist/build/mp-weixin");
  const scanTargets = existsSync(distRoot) ? [distRoot] : [resolve(__dirname, "../src")];
  for (const dir of scanTargets) {
    (function scan(d) {
      for (const name of readdirSync(d)) {
        const p = join(d, name);
        const st = statSync(p);
        if (st.isDirectory()) {
          if (name === "node_modules" || name === "static") continue;
          scan(p);
        } else if (/\.(wxml|json|js|vue|ts)$/.test(name)) {
          let text = readFileSync(p, "utf-8");
          const scanText = text.replace(/resolveMediaUrl\(\s*['"][^'"]+['"]\s*\)/g, "");
          const re = /['"`]?(\/static\/[A-Za-z0-9/_ .\-]+\.(?:png|jpg|jpeg|svg|gif|webp|wav|mp3))['"`]?/g;
          let m;
          while ((m = re.exec(scanText)) !== null) refs.add(m[1]);
        }
      }
    })(dir);
  }
  let kept = 0;
  for (const ref of refs) {
    const from = join(full, ref.slice("/static/".length));
    if (existsSync(from)) {
      const to = join(SRC, ref.slice("/static/".length));
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to, { force: true });
      kept++;
    }
  }
  console.log(`[prepare-static] real 模式：static 已清空；本地保留 tabBar 图标 + 源码字面量引用 ${kept} 个文件；其余由后端 app-assets 托管`);
}

if (mode === "--dev" || mode === "--h5") {
  restore();
} else if (mode === "--real") {
  strip();
} else {
  console.error(`[prepare-static] 未知模式: ${mode}（支持 --dev / --h5 / --real）`);
  process.exit(1);
}

console.log(`[prepare-static] 完成（模式 ${mode}）`);
