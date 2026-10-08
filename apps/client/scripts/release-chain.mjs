/**
 * release-chain.mjs —— real 发布链编排器 + 「失败即还原」trap（2026-10-05）。
 *
 * 背景（reports/audit/round-7/decisions-v33.md §39 派生事项①）：
 * `prepare-static --real` 会把 src/static 原地换成「裁剪态」（仅 tabBar + 源码字面量
 * 引用的文件，完整集合保存在 static-local-backup/full-static/）。这条链以前写在
 * package.json 的 `&&` 串里，链中 prepare-static 之后的任何一步失败（实测是
 * verify-env-release 挡住 .env.real 非 HTTPS 域名）都会让 src/static 停在裁剪态，
 * git 里 ~1241 个跟踪文件摆成"被删除"，要靠人工按具名路径 checkout 还原。
 *
 * 本脚本把链收编为显式步骤表，并在 prepare-static 动手**前**对 src/static 做一次
 * 快照（cp -a 到 apps/client/ 下的临时目录，与 prepare-static 自身的 staging 同目录
 * 约定、同盘 mv 语义）；链中任何一步失败时，用 prepare-static 同款「mv 原子提升 +
 * 失败回滚」机制把快照原样搬回 src/static（字节级还原，不依赖 git 状态、不碰
 * 用户的既有脏改动）。链成功时保持裁剪态（那是发布形态的预期中间产物），快照清理。
 *
 * 还原机制与 prepare-static.mjs 的 atomicPromote 一致：
 *   mv SRC .bak.<ts> → mv 快照 SRC → rm -rf .bak（任一步失败回滚 .bak -> SRC）。
 * 文件搬运全部走 spawnSync 系统命令（cp/mv/rm），不走 NODE_OPTIONS shim 拦截的
 * fs API（理由见 prepare-static.mjs 头注释）。
 *
 * 用法：node scripts/release-chain.mjs
 * 取代 package.json `build:mp-weixin:real` 原来的 `&&` 长串（步骤与顺序逐项等价）。
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");
const SRC = join(clientDir, "src", "static");
const STAGE_ROOT = clientDir;

/** 链步骤表：与原 build:mp-weixin:real 的 && 串逐项等价（顺序敏感，勿乱动）。
 * args[0] 与原命令一致相对 apps/client/ 解析（../../scripts/ 即仓库根 scripts/）。
 * snapshotBefore=true 的步骤（prepare-static --real）动手前打快照、武装还原 trap。 */
const STEPS = [
  { name: "check-mp-image-styles", args: ["scripts/check-mp-image-styles.mjs", "--strict"], snapshotBefore: false },
  { name: "check-statusbar-offset", args: ["scripts/check-statusbar-offset.mjs"], snapshotBefore: false },
  { name: "check-tabbar-consistency", args: ["scripts/check-tabbar-consistency.mjs"], snapshotBefore: false },
  { name: "check-project-rules", args: ["scripts/check-project-rules.mjs"], snapshotBefore: false },
  { name: "inject-wx-appid", args: ["scripts/inject-wx-appid.mjs"], snapshotBefore: false },
  { name: "prepare-static --real", args: ["scripts/prepare-static.mjs", "--real"], snapshotBefore: true },
  { name: "profile-svg-to-png", args: ["scripts/profile-svg-to-png.mjs"], snapshotBefore: false },
  { name: "verify-env-release", args: ["../../scripts/verify-env-release.mjs"], snapshotBefore: false },
  { name: "uni build (via strip-mock)", args: ["scripts/strip-mock-for-mp.mjs", "uni build --platform mp-weixin --mode real"], snapshotBefore: false },
  { name: "add-lazy-code-loading", args: ["scripts/add-lazy-code-loading.mjs"], snapshotBefore: false },
  { name: "prune-unreferenced-static", args: ["scripts/prune-unreferenced-static.mjs"], snapshotBefore: false },
  { name: "verify-package-size", args: ["../../scripts/verify-package-size.mjs"], snapshotBefore: false },
];

/** 全部步骤都以 apps/client 为 cwd（与原 && 串一致），脚本路径按原样拼接 */
function resolveStep(step) {
  return { cwd: clientDir, argv: [process.execPath, join(clientDir, step.args[0]), ...step.args.slice(1)] };
}

/** 快照 src/static -> stage 目录（cp -a 系统命令，与 prepare-static 同一搬运通道） */
function snapshotStatic(stage) {
  if (!existsSync(SRC)) {
    // src/static 不存在（异常仓态）：不打快照，trap 不武装，失败时无处可还
    return false;
  }
  mkdirSync(stage, { recursive: true });
  const srcArg = SRC.endsWith("/.") || SRC.endsWith("\\.") ? SRC : SRC + "/.";
  const dstArg = stage.endsWith("/") ? stage : stage + "/";
  const r = spawnSync("cp", ["-a", srcArg, dstArg], { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) {
    rmSync(stage, { recursive: true, force: true });
    throw new Error(`快照失败：cp -a ${srcArg} ${dstArg} exit=${r.status}`);
  }
  return true;
}

/** 把快照原子搬回 SRC（与 prepare-static.mjs atomicPromote 同款 mv 序列 + 回滚） */
function restoreFromSnapshot(stage) {
  const TS = Date.now();
  const bak = `${SRC}.bak.${TS}`;
  let renamedOld = false;
  try {
    if (existsSync(SRC)) {
      const r = spawnSync("mv", [SRC, bak], { stdio: ["ignore", "inherit", "inherit"] });
      if (r.status !== 0) throw new Error(`mv ${SRC} ${bak} failed: exit=${r.status}`);
      renamedOld = true;
    }
    const r = spawnSync("mv", [stage, SRC], { stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) throw new Error(`mv ${stage} ${SRC} failed: exit=${r.status}`);
    if (renamedOld && existsSync(bak)) {
      const rr = spawnSync("rm", ["-rf", bak], { stdio: ["ignore", "inherit", "inherit"] });
      if (rr.status !== 0) console.warn(`[release-chain] warning: rm -rf ${bak} exit=${rr.status}`);
    }
    console.log(`[release-chain] 已把 src/static 还原为构建前快照（字节级，含被裁剪的完整集合）`);
  } catch (e) {
    console.error(`[release-chain] 还原失败：${e.message}`);
    if (renamedOld && existsSync(bak) && !existsSync(SRC)) {
      const rb = spawnSync("mv", [bak, SRC], { stdio: ["ignore", "inherit", "inherit"] });
      if (rb.status !== 0) console.error(`[release-chain] 回滚失败；原（裁剪态）src/static 保留在 ${bak}`);
    }
    process.exit(1);
  }
}

let snapshotStage = null;
let snapshotValid = false;
let exitCode = 0;

for (const step of STEPS) {
  // prepare-static 动手前打快照（trap 武装）
  if (step.snapshotBefore) {
    snapshotStage = join(STAGE_ROOT, `static_release_guard_${process.pid}_${Date.now()}`);
    try {
      snapshotValid = snapshotStatic(snapshotStage);
      if (snapshotValid) {
        console.log(`[release-chain] 已快照 src/static（trap 武装）：${snapshotStage}`);
      } else {
        console.warn(`[release-chain] src/static 不存在，跳过快照（trap 未武装）`);
      }
    } catch (e) {
      console.error(`[release-chain] ${e.message}——中止链，src/static 未被触碰`);
      process.exit(1);
    }
  }

  const { cwd, argv } = resolveStep(step);
  console.log(`[release-chain] >>> ${step.name}`);
  const r = spawnSync(argv[0], argv.slice(1), { cwd, stdio: "inherit" });
  if (r.error) {
    console.error(`[release-chain] ${step.name} 无法启动：${r.error.message}`);
    exitCode = 1;
  } else if (r.status !== 0) {
    console.error(`[release-chain] ${step.name} 失败（exit=${r.status}）`);
    exitCode = r.status;
  }
  if (exitCode !== 0) {
    // §39 派生事项①：链失败即还原 src/static，不让仓停在裁剪态
    if (snapshotValid && snapshotStage && existsSync(snapshotStage)) {
      console.error(`[release-chain] 触发失败还原 trap（decisions-v33 §39 派生事项①）`);
      restoreFromSnapshot(snapshotStage);
      snapshotStage = null;
    } else {
      console.error(`[release-chain] 快照不可用，无法自动还原；请人工核对 apps/client/src/static 状态`);
    }
    break;
  }
}

// 收尾：成功路径下清理快照（还原路径已消费 stage 或已置空）
if (snapshotStage && existsSync(snapshotStage)) {
  rmSync(snapshotStage, { recursive: true, force: true });
}
if (exitCode === 0) {
  console.log(`[release-chain] real 发布链全部通过（src/static 保持发布裁剪态，完整集合在 static-local-backup/full-static）`);
}
process.exit(exitCode);
