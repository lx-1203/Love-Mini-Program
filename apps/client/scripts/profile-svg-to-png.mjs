/**
 * profile SVG -> PNG 构建期转换脚本（支持子目录递归，目录结构镜像到 png/）。
 *
 * 输入：src/static/assets/profile/svg/**            （只读源）
 * 输出：static-generated/assets/profile/png/**      （未跟踪的生成产物，构建不写 src）
 * 校验：src/static/assets/profile/png/**           （被 git 跟踪、被打进小程序包的那一份，只读比对）
 *
 * 2026-09-29 r9 处置（reports/audit/round-7/followups-v33.md §9 的裁定）：
 * 原来这个脚本把 PNG **写回被 git 跟踪的 src 目录**。后果不是"脏一点"，而是本仓的门禁凭据被污染：
 *   - 任何一次构建都是一次对跟踪文件的写盘；写盘在 Windows 上会被微信 IDE/模拟器占用打断
 *     （实测 `Invalid argument`），一旦打断，prepare-static 刚从 static-local-backup 复制进来的
 *     那份**陈旧**字节就留在 src 里 ⇒ `tracked_dirty>0`，"跟踪脏项=0"不再是"没人改过产品代码"的凭据；
 *   - 按 sha 的门禁（verify-provenance-all / verify-evidence-corpus）会被这种抖动带出假红。
 * 现在生成物落在未跟踪的 `static-generated/`，src 里那一份改由**人工显式** `--write` 才会刷新，
 * 构建期只做"现算 vs 在包里的字节"逐字节比对：不一致就判红并点名怎么修，不再静默改写。
 *
 * 确定性说明：本脚本不改 sharp 的编码参数（density 192 / resize width 750 / png() 默认），
 * 实测同机连跑三次 48 张逐字节相同、且与 HEAD 的跟踪字节 48/48 相同（见 r9 报告 §3）。
 * 换 libvips 版本会换字节，那种情况下这里会**报红**而不是把抖动写进跟踪文件。
 *
 * 用法：
 *   node scripts/profile-svg-to-png.mjs            生成到 static-generated/ 并校验 src（构建链用的形态）
 *   node scripts/profile-svg-to-png.mjs --write     额外把生成物刷进 src 的跟踪 PNG（人工，改了 SVG 之后）
 *   node scripts/profile-svg-to-png.mjs --check     不写任何文件，只现算并比对 src（CI 复量用）
 */
import { readFile, mkdir, readdir, writeFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve, join, extname, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLIENT = resolve(__dirname, "..");
const SVG_ROOT = join(CLIENT, "src", "static", "assets", "profile", "svg");
/** 打包进小程序、被 git 跟踪的那一份（本脚本默认只读它） */
const TRACKED_PNG_ROOT = join(CLIENT, "src", "static", "assets", "profile", "png");
/** 生成物落点：未跟踪目录（.gitignore 里有 `static-generated/` 一条显式规则） */
const OUT_PNG_ROOT = join(CLIENT, "static-generated", "assets", "profile", "png");

const WRITE = process.argv.includes("--write");
const CHECK_ONLY = process.argv.includes("--check");

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

/** 字节相同就不写：既避免无谓的 mtime 抖动，也避免对"正被模拟器持有"的文件做写盘 */
async function writeIfChanged(path, bytes) {
  if (existsSync(path)) {
    try {
      const cur = await readFile(path);
      if (cur.equals(bytes)) return "unchanged";
    } catch { /* 读不动就当作要写 */ }
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  return "written";
}

async function main() {
  const sharp = (await import("sharp")).default;
  if (!existsSync(SVG_ROOT)) {
    console.warn("[profile-svg-to-png] 未找到 svg 目录，跳过");
    return;
  }
  const files = await walk(SVG_ROOT);
  let encoded = 0;
  let written = 0;
  let unchanged = 0;
  let refreshed = 0;
  const mismatches = [];
  for (const svgPath of files) {
    const rel = relative(SVG_ROOT, svgPath).replace(/\.svg$/i, ".png");
    const outPath = join(OUT_PNG_ROOT, rel);
    const trackedPath = join(TRACKED_PNG_ROOT, rel);
    try {
      const svgBuffer = await readFile(svgPath);
      // 编码参数一字不动：这是"输出字节 == 仓库里那份"的前提（r9 §3 实测 48/48）
      const png = await sharp(svgBuffer, { density: 192 })
        .resize({ width: 750, withoutEnlargement: false })
        .png()
        .toBuffer();
      encoded++;

      if (!CHECK_ONLY) {
        const state = await writeIfChanged(outPath, png);
        if (state === "written") written++; else unchanged++;
      }

      // 比对在包里的那一份（只读；只有显式 --write 才会刷新它）
      if (!existsSync(trackedPath)) {
        mismatches.push(`${rel}: src 里缺这张 PNG（包会缺图）`);
        continue;
      }
      const tracked = readFileSync(trackedPath);
      if (!tracked.equals(png)) {
        if (WRITE && !CHECK_ONLY) {
          await writeIfChanged(trackedPath, png);
          // 写完复验：不复验就会像 cpSingle 那样"目标存在=写成功"地谎报刷新过（r9 §5.4.1）
          const now = readFileSync(trackedPath);
          if (!now.equals(png)) {
            throw new Error(`--write 刷新后复验不一致 ${rel}（${now.length}B vs ${png.length}B）`);
          }
          refreshed++;
          console.log(`[profile-svg-to-png] WRITE 已刷新跟踪 PNG ${rel}（记得提交这一份）`);
        } else {
          mismatches.push(
            `${rel}: src 里的 PNG 与 SVG 现算结果不一致（${tracked.length}B vs ${png.length}B）` +
            `——若你确实改了 SVG：node scripts/profile-svg-to-png.mjs --write 然后提交；` +
            `若没改：说明这台机器的 libvips 与入库时不同版，别把抖动写进跟踪文件`
          );
        }
      }
      console.log(`[profile-svg-to-png] OK ${rel}`);
    } catch (error) {
      console.error(`[profile-svg-to-png] FAIL ${rel}:`, error.message);
      process.exitCode = 1;
    }
  }
  if (mismatches.length) {
    for (const m of mismatches) console.error(`[profile-svg-to-png] MISMATCH ${m}`);
    console.error(`[profile-svg-to-png] 共 ${mismatches.length} 张不一致 ⇒ 判红，不静默改写跟踪文件`);
    process.exitCode = 1;
  }
  console.log(
    `SVGPNG_RESULT=${process.exitCode ? "FAIL" : "PASS"} mode=${CHECK_ONLY ? "check" : WRITE ? "write" : "generate"} ` +
    `encoded=${encoded} out=${OUT_PNG_ROOT.replace(CLIENT + "/", "")} written=${written} unchanged=${unchanged} ` +
    `tracked_checked=${encoded} mismatch=${mismatches.length} tracked_refreshed=${refreshed}`
  );
}

main();
