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
 * 用法：node scripts/release-chain.mjs [--allow-loopback] [--out <dir>] [--expect-band <sha8>] [--dry]
 * 取代 package.json `build:mp-weixin:real` 原来的 `&&` 长串（步骤与顺序逐项等价）。
 *
 * 2026-10-18（MP-FIDELITY Phase A2）补的两件事——都来自实测，不是假设：
 *  1. **改道**：本链以前从不设 UNI_OUTPUT_DIR，`uni build --mode real` 落进平台默认的
 *     dist/build/mp-weixin（mock 档的家）⇒ 跑一次发布链就把 mock 档产物原地换成 real，
 *     所有读 mock 档的门禁从此量的是别人的字节。现在 --out 缺省 mp-weixin-real，
 *     并且 sameOrInside 守卫**拒绝**任何指向共享目录的 --out（沿用 build-real-isolated.mjs:151-159 同一段逻辑）。
 *  2. **后处理步改吃同一个目录**：add-lazy-code-loading / prune-unreferenced-static / verify-package-size
 *     三个脚本的缺省目录都是 mp-weixin（mock），实测 mp-weixin-real/app.json 里 lazyCodeLoading 根本没有
 *     ⇒ 所谓"发布形态"此前少跑了三步、还把裁剪与包体结论记在了别人的产物上。现在全部带 --dist/位置参数指向 --out。
 *  3. loopback 豁免只在本链自己显式收到 --allow-loopback 时才向下传，且必须点名载具；
 *     产物目录里落一张 LOOPBACK_WAIVER.json（shippable=false）作为凭证券。
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");
const REPO_ROOT = resolve(clientDir, "..");
const SRC = join(clientDir, "src", "static");
const STAGE_ROOT = clientDir;
/** mock 档的共享目录：本链一步都不许写它（它是 mock 轮 before/after 配对证据的载体）。 */
const SHARED_OUT = join(clientDir, "dist", "build", "mp-weixin");
const RK = "RELEASECHAIN_RESULT";

const argv = process.argv.slice(2);
const flag = (k) => argv.includes("--" + k);
const opt = (k, dflt) => {
  const i = argv.indexOf("--" + k);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  return v === undefined || String(v).startsWith("--") ? dflt : v;
};

const allowLoopback = flag("allow-loopback");
const expectBand = String(opt("expect-band", "")).trim();
const dryRun = flag("dry");
const outDir = resolve(opt("out", join(clientDir, "dist/build/mp-weixin-real")));
/** CDN 桶契约：显式传给三步（prepare-static --real 出包判定 / prune 兜底+清单 / 体积门核算），
 *   argv 里看得见路径，比"各自默认同一处"更可判读；缺省就是 L01 生产的那份真件。 */
const bucketsPath = resolve(opt("buckets", join(clientDir, "config/cdn-buckets.json")));

/** Windows 上路径大小写不敏感，`--out .../MP-WEIXIN` 也是同一个目录；写进它的子目录同样污染该档 */
function sameOrInside(target, dir) {
  const norm = (p) => {
    let s = resolve(p).replace(/\\/g, "/").replace(/\/+$/, "");
    return process.platform === "win32" ? s.toLowerCase() : s;
  };
  const t = norm(target);
  const d = norm(dir);
  return t === d || t.startsWith(`${d}/`);
}

// <<OUTDIR_GUARD_BEGIN>>
// 这段是「发布链不许把 real 产物写进 mock 共享目录」的唯一硬闸（删掉它 --self-test 的负例就转红）。
if (sameOrInside(outDir, SHARED_OUT)) {
  console.error(`${RK}=FAIL reason=拒绝把 real 产物构建到 mock 共享目录 ${SHARED_OUT}`);
  console.error(`${RK}=FAIL hint=不传 --out（缺省 ${join(clientDir, "dist/build/mp-weixin-real")}）；共享目录只属于 mock 档（MODE:"mp-weixin-mock"），写进去会毒掉 mock 轮的配对证据`);
  process.exit(1);
}
// <<OUTDIR_GUARD_END>>

/** 产物指纹：构建前后共享目录必须一致，否则说明这一档覆盖了 mock 证据。 */
function sharedFingerprint() {
  if (!existsSync(SHARED_OUT)) return "absent";
  const marker = join(SHARED_OUT, "config/env.js");
  if (!existsSync(marker)) return "no-env-js";
  const st = readFileSync(marker);
  return `${st.length}:${createHash("sha256").update(st).digest("hex").slice(0, 8)}`;
}

/** band = mode@sha8（与 scripts/qa/artifact-band.mjs:14-24 同算法：对产物 config/env.js 整文件取 sha256 前 8 位）。 */
function readBand(dir) {
  const f = join(dir, "config/env.js");
  if (!existsSync(f)) return { mode: "(无 env.js)", sha8: "" };
  const buf = readFileSync(f);
  const m = String(buf).match(/MODE:\s*"([^"]+)"/);
  return { mode: m ? m[1] : "(MODE 未记)", sha8: createHash("sha256").update(buf).digest("hex").slice(0, 8) };
}

/** 链步骤表：与原 build:mp-weixin:real 的 && 串逐项等价（顺序敏感，勿乱动），
 *  外加步 0 的档位目录碰撞守卫与三步后处理的 --dist 改道。
 * args[0] 与原命令一致相对 apps/client/ 解析（../../scripts/ 即仓库根 scripts/）。
 * snapshotBefore=true 的步骤（prepare-static --real）动手前打快照、武装还原 trap。 */
const STEPS = [
  { name: "check-band-outdir-collision", args: ["scripts/check-band-outdir-collision.mjs", "--mode", "real"], snapshotBefore: false },
  { name: "check-mp-image-styles", args: ["scripts/check-mp-image-styles.mjs", "--strict"], snapshotBefore: false },
  { name: "check-token-refs", args: ["scripts/check-token-refs.mjs", "--strict"], snapshotBefore: false },
  { name: "check-statusbar-offset", args: ["scripts/check-statusbar-offset.mjs"], snapshotBefore: false },
  { name: "check-tabbar-consistency", args: ["scripts/check-tabbar-consistency.mjs"], snapshotBefore: false },
  { name: "check-project-rules", args: ["scripts/check-project-rules.mjs"], snapshotBefore: false },
  { name: "inject-wx-appid", args: ["scripts/inject-wx-appid.mjs"], snapshotBefore: false },
  /* profile-svg-to-png 必须在 prepare-static --real **之前**（D-A3，2026-10-18 实测）：
     这条链以前是 prepare-static(6) → profile-svg-to-png(7)，而 prepare-static --real 会把
     src/static 原地裁成"仅引用集"，紧下一步就报 `src 里缺这张 PNG（包会缺图）` 判红——
     它量的是上一步刚刚剪过的目录。实测被剪的是 assets/profile/png/** 48 张 / 844K，
     而这两个注册表（src/config/profile-svg.ts、src/config/profile-assets.ts）**没有任何 import 者**，
     所以既不该为它们放宽判点，也不该把它们塞回保留集去顶 2MB 主包上限：
     正确顺序是先在完整 src 上校验生成一致性，再裁剪。
     "死资产进包 + 皮肤注册表没人用"本身另记一条保真缺陷，不由本次改序消化掉。 */
  { name: "profile-svg-to-png", args: ["scripts/profile-svg-to-png.mjs"], snapshotBefore: false },
  // --scan src：保留集只从源码扫（prepare-static.mjs:234 的"从上一轮 mock 产物扫"是跨档口径，实测随构建顺序变）
  // --buckets：CDN 桶契约（命中前缀的文件不复制进 src/static ⇒ 根本不进主包；缺盘则该步行为不变）
  { name: "prepare-static --real", args: ["scripts/prepare-static.mjs", "--real", "--scan", "src", "--buckets", bucketsPath], snapshotBefore: true },
  {
    name: "verify-env-release",
    /* 不在这里让门写凭证券：uni build（下一步）会重建整个 out 目录，先写进去的文件必被抹掉
       —— 实测第 3 发就是这么红的（门打了 WAIVED，链末尾却查不到 LOOPBACK_WAIVER.json）。
       证券改由本链在构建步之后自己落（writeWaiver），门禁那边只保留 --self-test 用的写盘能力。 */
    args: allowLoopback
      ? ["../../scripts/verify-env-release.mjs", "--allow-loopback", "--carrier", "release-chain"]
      : ["../../scripts/verify-env-release.mjs"],
    snapshotBefore: false,
  },
  { name: "uni build (via strip-mock)", args: ["scripts/strip-mock-for-mp.mjs", "uni build --platform mp-weixin --mode real"], snapshotBefore: false },
  /* add-lazy-code-loading 收的是**位置参数**（:24 process.argv[2]），不是 --dist：
     实测按 --dist 传会把 "--dist" 当目录名去拼 app.json 路径，报「缺少产物 app.json: …/--dist/app.json」。
     prune 那边才是 --dist（本轮给它加的旗标）。两个形状各按各的传，别统一。 */
  { name: "add-lazy-code-loading", args: ["scripts/add-lazy-code-loading.mjs", outDir], snapshotBefore: false },
  { name: "prune-unreferenced-static", args: ["scripts/prune-unreferenced-static.mjs", "--dist", outDir, "--buckets", bucketsPath], snapshotBefore: false },
  { name: "verify-package-size", args: ["../../scripts/verify-package-size.mjs", outDir, "--buckets", bucketsPath], snapshotBefore: false },
];

/** 全部步骤都以 apps/client 为 cwd（与原 && 串一致），脚本路径按原样拼接。
 *  env 里带 UNI_OUTPUT_DIR（uni 的输出目录只能靠它改道，见 build-real-isolated.mjs:15）
 *  与 .bin 路径（本脚本可能被 node 直接拉起，无 npm 上下文时 `uni` 这个 bin 解析不到）。 */
const stepEnv = {
  ...process.env,
  UNI_OUTPUT_DIR: outDir,
  PATH: [join(clientDir, "node_modules/.bin"), join(clientDir, "../../node_modules/.bin"), process.env.PATH]
    .join(process.platform === "win32" ? ";" : ":"),
};

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

/** 预检状态（D-A4，2026-10-18 实测）：这条链**成功之后** src/static 是停在裁剪态的
 *  （裁剪态就是发布形态的预期中间产物），于是第二发从第一步起就红：
 *  profile-svg-to-png 报「src 里缺这张 PNG」——它量的是上一发留下的半棵树。
 *  所以链开场必须先把 src/static 恢复到完整集合，才谈得上"可重复构建"。
 *  恢复动作不另造机制，走 prepare-static 自己的 --dev 分支（它只做 restore()，
 *  权威来源 static-local-backup/full-static 也是 strip() 自己写回去的那一份）。 */
function countFiles(dir) {
  let n = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let names = [];
    try { names = readdirSync(d); } catch { continue; }
    for (const name of names) {
      const p = join(d, name);
      let st = null;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) stack.push(p); else n++;
    }
  }
  return n;
}

const BACKUP_FULL = join(clientDir, "static-local-backup", "full-static");
let prestate = "skip(no-backup)";
if (!dryRun) {
  const srcN = countFiles(SRC);
  const bakN = existsSync(BACKUP_FULL) ? countFiles(BACKUP_FULL) : 0;
  if (bakN > srcN) {
    prestate = `restore(src=${srcN} backup=${bakN})`;
    console.log(`[release-chain] src/static 停在上一发的裁剪态（${srcN} 个文件 < 备份 ${bakN} 个）⇒ 先走 prepare-static --dev 恢复完整集合`);
    const rr = spawnSync(process.execPath, [join(clientDir, "scripts/prepare-static.mjs"), "--dev"], { cwd: clientDir, stdio: "inherit", env: stepEnv });
    if (rr.status !== 0) {
      console.error(`[release-chain] 预检恢复失败（exit=${rr.status}）⇒ 中止，不带半棵树上构建`);
      console.log(`${RK}=FAIL reason=prestate-restore-exit-${rr.status}`);
      process.exit(1);
    }
    console.log(`RELEASECHAIN_PRESTATE=${prestate} restored=yes`);
  } else {
    prestate = `ok(src=${srcN} backup=${bakN})`;
  }
}
console.log(`RELEASECHAIN_PRESTATE ${prestate}`);

let snapshotStage = null;
let snapshotValid = false;
let exitCode = 0;
const sharedBefore = sharedFingerprint();

console.log(`[release-chain] out=${outDir} shared=${SHARED_OUT} loopbackWaiver=${allowLoopback ? "yes(点名载具 release-chain)" : "no"} expectBand=${expectBand || "(不比对)"} dry=${dryRun ? "yes" : "no"}`);

for (const step of STEPS) {
  // prepare-static 动手前打快照（trap 武装）
  if (step.snapshotBefore) {
    snapshotStage = join(STAGE_ROOT, `static_release_guard_${process.pid}_${Date.now()}`);
    if (dryRun) {
      console.log(`[release-chain] [dry] 跳过快照：${snapshotStage}`);
    } else {
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
  }

  const { cwd, argv: stepArgv } = resolveStep(step);
  console.log(`[release-chain] >>> ${step.name}`);
  if (dryRun) {
    console.log(`[release-chain] [dry] ${stepArgv[1]} ${stepArgv.slice(2).join(" ")}`);
    continue;
  }
  const r = spawnSync(stepArgv[0], stepArgv.slice(1), { cwd, stdio: "inherit", env: stepEnv });
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

const sharedAfter = sharedFingerprint();
const sharedUntouched = sharedAfter === sharedBefore;

/* 凭证券由链在构建之后落盘（门那边写的那份会被 uni build 重建目录抹掉，实测第 3 发因此判红）。
   api 基底直接读产物 config/env.js —— 证券写的是"这份包里真正带着的地址"，不是我传给门的期望值。 */
function writeWaiver() {
  try {
    const envJs = readFileSync(join(outDir, "config/env.js"), "utf-8");
    const api = String((envJs.match(/VITE_API_BASE_URL:\s*"([^"]*)"/) || [, "(读不到)"])[1]);
    const g = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" });
    const git8 = g.status === 0 ? String(g.stdout || "").trim().slice(0, 8) : "unknown";
    const body = {
      schema: "loopback-waiver/v1",
      shippable: false,
      note: "本产物由点名载具豁免 https/loopback 判点后构建，仅供在座真机验证，不可上传发布。",
      carrier: "release-chain",
      apiBaseUrl: api,
      git: git8,
      at: new Date().toISOString(),
      gate: "scripts/verify-env-release.mjs",
      writtenBy: "apps/client/scripts/release-chain.mjs（构建之后落盘；门写的那份会被 uni build 重建目录抹掉）",
    };
    writeFileSync(join(outDir, "LOOPBACK_WAIVER.json"), JSON.stringify(body, null, 2) + "\n", "utf-8");
    console.log(`RELEASECHAIN_ATTESTATION=${join(outDir, "LOOPBACK_WAIVER.json")} api=${api} shippable=no`);
    return true;
  } catch (e) {
    console.error(`[release-chain] 凭证券写失败：${String(e && e.message).slice(0, 120)}`);
    return false;
  }
}
if (exitCode === 0 && !dryRun && allowLoopback) writeWaiver();

if (exitCode === 0 && !dryRun) {
  const band = readBand(outDir);
  console.log(`RELEASECHAIN_BAND mode=${band.mode} sha8=${band.sha8} band=${band.mode}@${band.sha8}`);
  if (band.mode !== "real") {
    console.error(`[release-chain] 产物 MODE="${band.mode}" 不是 real ⇒ 这一档根本不是发布形态，后面所有"发布形态"结论都作废`);
    exitCode = 1;
  } else if (expectBand && band.sha8 !== expectBand) {
    // band 一动，覆盖账上每一条 real@<旧 band> 都变 EXPIRED；不许悄悄接受新 band。
    console.error(`[release-chain] band 漂移：实测 sha8=${band.sha8} ≠ 期望 ${expectBand} ⇒ 凡引用旧 band 的判据本轮全部重认，不许静默放行`);
    exitCode = 1;
  }
  /* ── CDN 桶收口读数（步表一字未动：步序由 scripts/qa/verify-release-chain-steps.mjs 按 --dry argv 核，
     加一步要两边同步，所以这里的收口账本挂在本链末尾，与 LOOPBACK_WAIVER.json 同一先例）。
     量两件盘上事实：① 契约在不在、sha8 是多少；② 产物里那份"这些文件为什么不在包里"的机器可读清单
     是否真落盘、条目数与出包字节。契约在而清单缺 ⇒ 链判红：
     "包变小了但没人能解释图去哪了"正是 96d4c172（删掉 350 个在用素材）/ aa6c4708（1.73MB 假达标变 12.19MB）
     两轮事故的形状，因果不许再被弄反。 */
  const manifestPath = join(outDir, "CDN_OFFLOAD_MANIFEST.json");
  const recordPath = join(REPO_ROOT, "tmp/build/cdn-offload-record.json");
  const readJson = (f) => { try { return JSON.parse(readFileSync(f, "utf-8")); } catch { return null; } };
  const sha8 = (f) => { try { return createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 8); } catch { return "(读不到)"; } };
  const record = readJson(recordPath);
  const manifest = readJson(manifestPath);
  if (band.mode !== "real") {
    console.log(`RELEASECHAIN_CDN=SKIP 档位不是 real（${band.mode}）⇒ 桶放行只作用于发布形态，别的档一个字节都不改`);
  } else if (!existsSync(bucketsPath)) {
    console.log(`RELEASECHAIN_CDN=ABSENT path=${bucketsPath} ⇒ 没有桶契约，real 档按 src 全量装包（主包体积由本链末尾的体积门判）`);
  } else if (!manifest) {
    console.error(`RELEASECHAIN_CDN=FAIL reason=manifest-missing 契约=${bucketsPath}@${sha8(bucketsPath)} 期望清单=${manifestPath} 出包记录=${record ? `files=${record.totals && record.totals.files}` : "(无)"}`);
    console.error(`RELEASECHAIN_CDN=FAIL hint=cdn 桶放行必须留下机器可读清单（每条指向 /api/v1/media/app-assets/<rel>）⇒ 否则"包小了"与"图没了"读不出区别`);
    exitCode = 1;
  } else {
    const drift = !manifest.contract || manifest.contract.sha8 !== sha8(bucketsPath);
    console.log(`RELEASECHAIN_CDN=${drift ? "DRIFT" : "OK"} 清单契约=${manifest.contract && manifest.contract.sha8} 当前=${sha8(bucketsPath)} 条目=${(manifest.entries || []).length} 出包字节=${manifest.totals && manifest.totals.packageBytes} manifest=${manifestPath}`);
    if (drift) {
      console.error(`RELEASECHAIN_CDN=FAIL reason=contract-drift ⇒ 产物里的清单解释的不是这一份契约，包内文件与端点无从一一对应`);
      exitCode = 1;
    }
  }
  if (allowLoopback && !existsSync(join(outDir, "LOOPBACK_WAIVER.json"))) {
    console.error(`[release-chain] 豁免跑了但产物里没有 LOOPBACK_WAIVER.json ⇒ 这份"不可上线"没留痕`);
    exitCode = 1;
  } else if (allowLoopback) {
    console.log(`RELEASECHAIN_SHIPPABLE=no（loopback 豁免产物，凭证券已落产物目录）`);
  }
}

console.log(`RELEASECHAIN_SHARED sharedBefore=${sharedBefore} sharedAfter=${sharedAfter} untouched=${sharedUntouched ? "yes" : "NO"}`);
if (exitCode === 0 && !sharedUntouched) {
  console.error(`[release-chain] 共享 mock 目录的 config/env.js 被动过 ⇒ 这一档污染了 mock 轮证据，链判红`);
  exitCode = 1;
}

if (exitCode === 0) {
  console.log(dryRun
    ? `[release-chain] [dry] 步骤表核对完毕（未构建、未动 src/static）`
    : `[release-chain] real 发布链全部通过（src/static 保持发布裁剪态，完整集合在 static-local-backup/full-static）`);
  console.log(`${RK}=PASS steps=${STEPS.length} out=${outDir} dry=${dryRun ? "yes" : "no"} shippable=${allowLoopback ? "no" : "yes"}`);
} else {
  console.log(`${RK}=FAIL steps=${STEPS.length} exit=${exitCode} out=${outDir}`);
}
process.exit(exitCode);
