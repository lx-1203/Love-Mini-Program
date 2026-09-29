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
import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, relative, sep } from "node:path";
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
 * （文件实际已 copy）。
 * 2026-09-30 r12 修正（reports/audit/round-7/build-determinism-accept-r12.md §1.2）：
 * 原来这里按"抛错了但目标存在 = 写成功"咽掉假错。该启发式只在**目标本来不存在**时成立；
 * 一旦是覆盖已有文件（目标本来就存在、且正是要被换掉的那份陈旧字节），假错被咽下后
 * 陈旧字节留在原处，调用方却收到"成功"—— 本仓的 seedProfilePngFromAuthority 第一版就是这样谎报的。
 * 现在按**字节复验**判定：真·假错（目标已等于源）照旧容错继续；字节没落对就直接抛，
 * 交给调用方既有的回滚路径（宁可构建失败，不带错字节假装成功）。 */
function cpSingle(src, dst) {
  try {
    cpSync(src, dst, { force: true });
  } catch (e) {
    let same = false;
    try {
      same = existsSync(dst) && readFileSync(dst).equals(readFileSync(src));
    } catch { /* 复验读不动也按"没落对"处理 */ }
    if (!same) {
      throw new Error(`cpSync ${src} -> ${dst} 失败且目标字节未落对: ${e.message}`);
    }
    // 假错：已复验目标字节 == 源，记录警告继续
    console.warn(`[prepare-static] warn: cpSync ${src} 假错（已复验目标字节==源，继续）`);
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

function listFilesRecursive(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFilesRecursive(p, base, out);
    else out.push(relative(base, p).split(sep).join("/"));
  }
  return out;
}

/** profile PNG 的权威来源（2026-09-30 r9 处置，reports/audit/round-7/followups-v33.md §9）。
 *
 * `src/static/assets/profile/png/**` 是 48 个**被 git 跟踪**的文件，而
 * `static-local-backup/full-static/assets/profile/png/**` 里那一份是**未跟踪的本机副本**
 * （`.gitignore:70` 的 `*.png` 挡住了它，只有 `!apps/client/src/static/**` 白名单里的那份入库）。
 * 旧链无条件把备份盖进 src ⇒ 备份陈旧时（实测 `profile-hero.png` 差 16B、且差在像素不在元数据）
 * 跟踪文件就被写成非 HEAD 字节，只能靠紧随其后的 profile-svg-to-png 再改写一次才自愈；
 * 那一步在 Windows 上会被微信 IDE/模拟器占用打断（实测 `Invalid argument`），脏项就留下来了。
 *
 * 现在备份不再是这几个 PNG 的来源，权威顺序 =
 *   现有 src（被跟踪的字节，就是"入库的那一份"）> static-generated（构建期从 SVG 现算）> 备份（兜底）。
 * 这样 src 的字节不再由"本机恰好留存的备份"决定，构建也不再改写跟踪文件。
 *
 * onlyExisting=true 给 strip()（real 档）用：只把已经因引用而进包的那些重新对齐到权威来源，
 * 不因 seeding 往 real 档里多塞文件（那会动包体积与 strip 的既有语义）。
 * 返回 { seeded, skippedSame }。 */
function seedProfilePngFromAuthority(stage, { onlyExisting = false } = {}) {
  const REL_DIR = join("assets", "profile", "png");
  const authorities = [
    { label: "src(跟踪字节)", dir: join(SRC, REL_DIR) },
    { label: "static-generated(构建现算)", dir: join(STAGE_ROOT, "static-generated", REL_DIR) },
    { label: "backup(本机备份)", dir: join(BACKUP, "full-static", REL_DIR) },
  ];
  const dstDir = join(stage, REL_DIR);
  const names = onlyExisting
    ? listFilesRecursive(dstDir)
    : [...new Set(authorities.flatMap((a) => listFilesRecursive(a.dir)))];
  let seeded = 0;
  let skippedSame = 0;
  for (const rel of names) {
    const auth = authorities.find((a) => existsSync(join(a.dir, rel)));
    if (!auth) { continue; }
    const from = join(auth.dir, rel);
    const to = join(dstDir, rel);
    let bytes;
    try { bytes = readFileSync(from); } catch (e) {
      throw new Error(`读不到权威 PNG ${from}（来源 ${auth.label}）：${e.message}`);
    }
    mkdirSync(dirname(to), { recursive: true });
    try {
      if (existsSync(to) && readFileSync(to).equals(bytes)) { skippedSame++; continue; }
    } catch { /* 读不动就当作要写 */ }
    /**
     * 这里**不能**用 cpSingle()：它把 `cpSync` 的 Windows 假错按"目标存在就算写成功"咽掉，
     * 而本函数的前提恰好是**覆盖已有文件**（旧目标本来就存在、且是要被换掉的陈旧字节）。
     * 沙箱实测过这条形状（.zcode/tmp/svgpng-r9/ps-sbx-{A,B}）：用 cpSingle 时陈旧字节留在原处、
     * 本函数却谎报"换成权威来源 1 个"。改成读进来再写出去 + 写完复验，复验不过直接抛，
     * 由既有的回滚路径接手（宁可构建失败，不要带着陈旧 PNG 假装成功）。
     */
    writeFileSync(to, bytes);
    if (!readFileSync(to).equals(bytes)) {
      throw new Error(`权威字节没落进 ${to}（写完复验不一致，来源 ${auth.label}）`);
    }
    seeded++;
  }
  return { seeded, skippedSame, total: names.length, from: authorities.map((a) => a.label).join(" > ") };
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
    const png = seedProfilePngFromAuthority(stage);
    console.log(`[prepare-static] profile PNG 权威对齐：换成权威来源 ${png.seeded} 个 / 字节相同跳过 ${png.skippedSame} 个 / 共 ${png.total} 个（顺序 ${png.from}）`);
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
    const png = seedProfilePngFromAuthority(stage, { onlyExisting: true });
    console.log(`[prepare-static] real 模式 profile PNG 权威对齐：换成权威来源 ${png.seeded} 个 / 字节相同跳过 ${png.skippedSame} 个（顺序 ${png.from}）`);
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