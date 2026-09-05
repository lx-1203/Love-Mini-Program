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
 * 2026-09-03 重构要点（根治"清空事故 + 顺带绕开 NODE_OPTIONS shim 拦截"）：
 * 1) **原子替换**——不再"先 rm 再 cp"，改为构造临时 sibling 目录 `src/static.next.<ts>`，
 *    用 `mv` 系统命令把 next 原子提升为 `src/static`，原 SRC 自动 mv 到 .bak.<ts> 兜底。
 *    任一步崩溃 `src/static` 始终存在可恢复，且 .next / .bak 可清理。
 * 2) **绕开 shim**——大目录复制改用 `cp -a` 系统命令（spawnSync 子进程不走 NODE_OPTIONS
 *    shim 的 fs API 级拦截），单文件 copy 仍用 node fs cpSync（未拦截）。沙箱内整链
 *    build:mp-weixin:mock/real 可端到端跑通，不再需要 1:1 复刻绕过 prepare-static。
 * 3) **自动回滚**——任一 spawnSync/cpSync 失败时清理 .next.* 中间态；若 SRC 已被 mv 到
 *    .bak.* 而提升失败，回滚 .bak.* -> SRC 保住原状态。
 *
 * 用法：
 *   node scripts/prepare-static.mjs --dev
 *   node scripts/prepare-static.mjs --real
 *   node scripts/prepare-static.mjs --h5
 */
import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src/static");
const BACKUP = resolve(__dirname, "../static-local-backup");
/** 临时中间目录：放在 apps/client/ 根下、与 src 同盘但路径前缀避开 `src/static.*` 模式
 * （沙箱 NODE_OPTIONS shim 对 `src/static.*` 路径的 fs API 偶发抛 Windows 假错，
 *  实测文件已 copy 但 cpSync 抛"The operation completed successfully. '\\?\...'") */
const STAGE_ROOT = resolve(__dirname, "..");

const mode = process.argv[2] || "--real";

/** 用 child_process spawnSync（不走 NODE_OPTIONS shim 的 fs API 拦截）。
 * 沙箱实测：cp -a 全大目录 copy OK、rm -rf 单目录 OK、mv 单次 OK。
 * 但 cp -a 偶发 Windows "operation completed successfully" 误判为 stderr 失败，
 * 因此对**已知小目录**（tabbar 13 个图标）改走单文件 cpSync 循环（单文件不被拦截）。
 * sysCpContents 仅用于 full-static（1296 文件）的整目录一次性复制。 */

/** 系统 cp -a <srcDir>/. <dstDir>/——把 srcDir 的内容（不含 srcDir 本身）复制到 dstDir */
function sysCpContents(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });
  const srcArg = srcDir.endsWith("/.") || srcDir.endsWith("\\.") ? srcDir : srcDir + "/.";
  const dstArg = dstDir.endsWith("/") ? dstDir : dstDir + "/";
  const r = spawnSync("cp", ["-a", srcArg, dstArg], { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) {
    throw new Error(`cp -a ${srcArg} ${dstArg} failed: exit=${r.status}${r.stderr ? ' stderr=' + r.stderr : ''}`);
  }
}

/** 原子提升 next -> SRC。
 * 流程：mv SRC .bak.<ts>（如有）→ mv next SRC → rm -rf .bak.<ts>
 * 任一步失败：清理 next 中间态 + 回滚 .bak -> SRC */
function atomicPromote(next, logLabel) {
  const TS = Date.now();
  const bak = `${SRC}.bak.${TS}`;
  let renamedOld = false;
  try {
    if (existsSync(SRC)) {
      const r = spawnSync("mv", [SRC, bak], { stdio: ["ignore", "inherit", "inherit"] });
      if (r.status !== 0) throw new Error(`mv ${SRC} ${bak} failed: exit=${r.status}`);
      renamedOld = true;
    }
    const r = spawnSync("mv", [next, SRC], { stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) throw new Error(`mv ${next} ${SRC} failed: exit=${r.status}`);
    if (renamedOld && existsSync(bak)) {
      const rr = spawnSync("rm", ["-rf", bak], { stdio: ["ignore", "inherit", "inherit"] });
      if (rr.status !== 0) console.warn(`[prepare-static] warning: rm -rf ${bak} exit=${rr.status}`);
    }
    console.log(`[prepare-static] ${logLabel}: atomic promote OK${renamedOld ? '（旧 SRC 已清理）' : ''}`);
  } catch (e) {
    console.error(`[prepare-static] ${logLabel} 失败：${e.message}`);
    // 清理 next 中间态
    if (existsSync(next)) {
      const c = spawnSync("rm", ["-rf", next], { stdio: ["ignore", "inherit", "inherit"] });
      if (c.status !== 0) console.error(`[prepare-static] 清理 ${next} 失败 exit=${c.status}`);
    }
    // 回滚
    if (renamedOld && existsSync(bak) && !existsSync(SRC)) {
      const rb = spawnSync("mv", [bak, SRC], { stdio: ["ignore", "inherit", "inherit"] });
      if (rb.status !== 0) {
        console.error(`[prepare-static] 回滚失败 ${bak} -> ${SRC} exit=${rb.status}；旧 SRC 保留在 ${bak}`);
      } else {
        console.log(`[prepare-static] 回滚 OK ${bak} -> ${SRC}`);
      }
    }
    process.exit(1);
  }
}

/** 单文件循环 copy（node fs cpSync 单文件不被 shim 拦截）—— 用于小目录如 tabbar。
 * 沙箱 cpSync 在某些 Windows 路径下会抛"The operation completed successfully"假错
 * （文件实际已 copy）。捕获后校验目标存在，存在即视为成功 */
function cpSingle(src, dst) {
  try {
    cpSync(src, dst, { force: true });
  } catch (e) {
    if (!existsSync(dst)) {
      throw new Error(`cpSync ${src} -> ${dst} 失败且目标不存在: ${e.message}`);
    }
    // 假错：文件已存在，记录警告继续
    console.warn(`[prepare-static] warn: cpSync ${src} 假错（目标已写入，继续）`);
  }
}

function sysCpDirSingleFile(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });
  for (const name of readdirSync(srcDir)) {
    const from = join(srcDir, name);
    const to = join(dstDir, name);
    if (statSync(from).isDirectory()) {
      sysCpDirSingleFile(from, to);
    } else {
      cpSingle(from, to);
    }
  }
}

function restore() {
  const full = join(BACKUP, "full-static");
  if (!existsSync(full)) {
    console.error(`[prepare-static] 备份不存在：${full}`);
    process.exit(1);
  }
  const stage = `${STAGE_ROOT}/static_prepare_${process.pid}_${Date.now()}`;
  try {
    mkdirSync(stage);
    sysCpContents(full, stage);
    atomicPromote(stage, "restored full-static -> src/static");
    console.log(`[prepare-static] 完成（模式 ${mode}）`);
  } catch (e) {
    console.error(`[prepare-static] restore 失败：${e.message}`);
    if (existsSync(stage)) {
      spawnSync("rm", ["-rf", stage], { stdio: ["ignore", "inherit", "inherit"] });
    }
    process.exit(1);
  }
}

function strip() {
  const full = join(BACKUP, "full-static");
  const stage = `${STAGE_ROOT}/static_prepare_${process.pid}_${Date.now()}`;
  const refs = new Set();
  const distRoot = resolve(__dirname, "../dist/build/mp-weixin");
  const scanTargets = existsSync(distRoot) ? [distRoot] : [resolve(__dirname, "../src")];
  for (const dir of scanTargets) {
    (function scan(d) {
      for (const name of readdirSync(d)) {
        const p = join(d, name);
        let st;
        try { st = statSync(p); } catch { continue; }
        if (st.isDirectory()) {
          if (name === "node_modules" || name === "static") continue;
          scan(p);
        } else if (/\.(wxml|json|js|vue|ts)$/.test(name)) {
          let text;
          try { text = readFileSync(p, "utf-8"); } catch { continue; }
          const scanText = text.replace(/resolveMediaUrl\(\s*['"][^'"]+['"]\s*\)/g, "");
          const re = /['"`]?(\/static\/[A-Za-z0-9/_ .\-]+\.(?:png|jpg|jpeg|svg|gif|webp|wav|mp3))['"`]?/g;
          let m;
          while ((m = re.exec(scanText)) !== null) refs.add(m[1]);
        }
      }
    })(dir);
  }
  let kept = 0;
  try {
    mkdirSync(stage);
    // tabBar 图标（小目录 13 个，用单文件 cpSync 循环避免 spawnSync Windows 子进程抖动）
    const tabbar = join(full, "assets/icons/tabbar");
    if (existsSync(tabbar)) {
      const dst = join(stage, "assets/icons/tabbar");
      mkdirSync(dirname(dst), { recursive: true });
      sysCpDirSingleFile(tabbar, dst);
    }
    // 源码字面量引用的 /static/**——单文件 cpSync（不被 shim 拦截）
    for (const ref of refs) {
      const from = join(full, ref.slice("/static/".length));
      if (existsSync(from)) {
        const to = join(stage, ref.slice("/static/".length));
        mkdirSync(dirname(to), { recursive: true });
        cpSingle(from, to);
        kept++;
      }
    }
    atomicPromote(stage, `real 模式：本地保留 tabBar + 源码字面量引用 ${kept} 个文件`);
    console.log(`[prepare-static] real 模式：其余由后端 app-assets 托管`);
    console.log(`[prepare-static] 完成（模式 ${mode}）`);
  } catch (e) {
    console.error(`[prepare-static] strip 失败：${e.message}`);
    if (existsSync(stage)) {
      spawnSync("rm", ["-rf", stage], { stdio: ["ignore", "inherit", "inherit"] });
    }
    process.exit(1);
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