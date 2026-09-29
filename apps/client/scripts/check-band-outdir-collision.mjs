/**
 * check-band-outdir-collision.mjs —— 给**没有改道能力**的老 pnpm 脚本链装的碰撞闸。
 *
 * 背景（2026-09-29 实测）：`apps/client/package.json` 里 `build:mp-weixin:showcase` 这类脚本直接跑
 * `uni build --platform mp-weixin --mode <档>`，而 uni 的输出目录在不设 UNI_OUTPUT_DIR 时就是平台默认的
 * `dist/build/mp-weixin`（也就是 **mock 证据档**）。Windows 的 pnpm 脚本链又注入不进那个变量，
 * 于是"跑一次展示版构建"等于把 mock 档原地换成展示档：目录名还叫 mp-weixin，
 * verify-band-freshness 和所有读 mock 档的门禁都在拿展示档的内容出判决，且构建退出码全是绿的。
 *
 * 这一支只做一件事：在链子动手**之前**问一句「这一次要写的目录，是不是这一档的家」。
 * 共享目录的家只属于 MODE:"mp-weixin-mock" 那一档；其余档一律拒绝，除非调用方明确承认。
 *
 * 用法（放在脚本链的最前面，先拒后写）：
 *   node scripts/check-band-outdir-collision.mjs --mode mp-weixin-showcase
 * 放行条件（任一）：
 *   1) UNI_OUTPUT_DIR 已设且不是共享目录（或其子目录）⇒ 本来就隔离，退出 0；
 *   2) --mode mp-weixin-mock ⇒ 共享目录就是这一档的家，退出 0；
 *   3) 承认覆盖：ALLOW_SHARED_MOCK_OUT=1 ⇒ 大声警告 + 退出 0（留给确实要这么干的老调用方，如 start-showcase.bat）。
 * 其余 ⇒ BANDCOLLIDE_RESULT=REFUSE，退出 1。
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");
const SHARED_OUT = join(clientDir, "dist/build/mp-weixin");
/** 共享目录这一档的家：verify-band-freshness.mjs:34 认的就是这两个值 */
const SHARED_OWNER = { mode: "mp-weixin-mock", apiMode: "mock" };

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : dflt;
};
const uniMode = arg("mode", null);

/** 三档产物的合法身份，与 scripts/qa/verify-band-freshness.mjs:33-37 的 BAND_MODE_EXPECT 同一套判点 */
const BAND_IDENTITY = [
  { name: "mock", dir: join(clientDir, "dist/build/mp-weixin"), mode: "mp-weixin-mock", apiMode: "mock", showcase: null },
  { name: "real", dir: join(clientDir, "dist/build/mp-weixin-real"), mode: "real", apiMode: "real", showcase: null },
  { name: "showcase", dir: join(clientDir, "dist/build/mp-weixin-showcase"), mode: "mp-weixin-showcase", apiMode: "real", showcase: "true" },
];

/**
 * --audit：把"多档重建之后逐档 grep 一次 config/env.js"这一步做成一条命令。
 * 构建退出码说不出哪个目录最后装着哪一档（G7_RESULT=PASS 与 [verify] PASS 都曾在 mock 目录装着
 * 展示档内容时打出来），所以这一问只能问产物自己。
 */
if (argv.includes("--audit")) {
  const bad = [];
  for (const b of BAND_IDENTITY) {
    const marker = join(b.dir, "config/env.js");
    if (!existsSync(marker)) { bad.push(`${b.name} 缺 config/env.js`); console.log(`BANDAUDIT ${b.name.padEnd(8)} ${marker}  MISSING`); continue; }
    const text = readFileSync(marker, "utf-8");
    const pick = (key) => (text.match(new RegExp(`${key}:"([^"]*)"`)) || [])[1];
    const got = { mode: pick("MODE"), apiMode: pick("VITE_API_MODE"), showcase: pick("VITE_SHOWCASE_MODE") };
    const errs = [];
    if (got.mode !== b.mode) errs.push(`MODE:"${got.mode}"（应 "${b.mode}"）`);
    if (got.apiMode !== b.apiMode) errs.push(`VITE_API_MODE:"${got.apiMode}"（应 "${b.apiMode}"）`);
    if (b.showcase && got.showcase !== b.showcase) errs.push(`VITE_SHOWCASE_MODE:"${got.showcase ?? "取不到"}"（应 "${b.showcase}"）`);
    if (!b.showcase && got.showcase !== undefined) errs.push(`这一档不该带 VITE_SHOWCASE_MODE，却读到 "${got.showcase}"`);
    console.log(`BANDAUDIT ${b.name.padEnd(8)} MODE="${got.mode}" VITE_API_MODE="${got.apiMode}" VITE_SHOWCASE_MODE="${got.showcase ?? "-"}"${errs.length ? "  ✗ " + errs.join("、") : "  ✓"}`);
    for (const e of errs) bad.push(`${b.name}：${e}`);
  }
  if (bad.length) {
    console.error(`BANDCOLLIDE_RESULT=AUDIT_FAIL bands=${bad.length} —— 有目录装着别的档的产物，凡是读它的门禁本轮判决全部作废`);
    for (const x of bad) console.error(`  ✗ ${x}`);
    process.exit(1);
  }
  console.log("BANDCOLLIDE_RESULT=AUDIT_OK bands=3 —— 三个目录各自装着自己那一档");
  process.exit(0);
}

if (!uniMode) {
  console.error("BANDCOLLIDE_RESULT=REFUSE reason=没传 --mode（这一支不知道自己要保护哪一档就不放行；只想要体检就加 --audit）");
  process.exit(1);
}

const norm = (p) => {
  let s = resolve(p).replace(/\\/g, "/").replace(/\/+$/, "");
  return process.platform === "win32" ? s.toLowerCase() : s;
};
const targetsShared = (dir) => {
  const t = norm(dir);
  const s = norm(SHARED_OUT);
  return t === s || t.startsWith(`${s}/`);
};

const raw = process.env.UNI_OUTPUT_DIR;
const outDir = raw && raw.trim() ? resolve(raw) : SHARED_OUT;
const redirected = Boolean(raw && raw.trim());
const fingerprint = () => {
  const marker = join(SHARED_OUT, "config/env.js");
  if (!existsSync(SHARED_OUT)) return "absent";
  if (!existsSync(marker)) return "no-env-js";
  const st = statSync(marker);
  return `${st.size}:${st.mtimeMs}`;
};
/** 共享目录此刻真的装着 mock 档吗？装着的才谈得上"会被毒掉" */
function sharedBandContent() {
  const marker = join(SHARED_OUT, "config/env.js");
  if (!existsSync(marker)) return null;
  const text = readFileSync(marker, "utf-8");
  const pick = (key) => (text.match(new RegExp(`${key}:"([^"]*)"`)) || [])[1];
  return { mode: pick("MODE"), apiMode: pick("VITE_API_MODE") };
}

const owned = SHARED_OWNER.mode === uniMode;
console.log(`[bandcollide] uni --mode=${uniMode} 目标=${outDir}${redirected ? "（UNI_OUTPUT_DIR 已设）" : "（uni 平台默认目录）"}`);

if (!targetsShared(outDir)) {
  console.log(`BANDCOLLIDE_RESULT=OK isolated=yes target=${outDir} —— 这一跑不碰 mock 共享档`);
  process.exit(0);
}
if (owned) {
  console.log(`BANDCOLLIDE_RESULT=OK shared_is_home=true mode=${uniMode} —— 共享目录就是 mock 档的家，正常`);
  process.exit(0);
}

const cur = sharedBandContent();
const poison = cur && (cur.mode !== SHARED_OWNER.mode || cur.apiMode !== SHARED_OWNER.apiMode);
if (process.env.ALLOW_SHARED_MOCK_OUT === "1") {
  const bar = "!".repeat(78);
  console.warn(bar);
  console.warn(`!! 已经承认覆盖：mode=${uniMode} 的产物马上要写进 mock 证据档 ${SHARED_OUT}`);
  console.warn(`!! 现在那里是 MODE:"${(cur && cur.mode) || "?"}" VITE_API_MODE:"${(cur && cur.apiMode) || "?"}"；写完就是 ${uniMode}`);
  console.warn("!! 之后凡是读 mock 档的门禁量的都是这一档的内容。推荐改走 pnpm run build:mp-weixin:showcase:isolated");
  console.warn(bar);
  console.log(`BANDCOLLIDE_RESULT=WARN allowed_by_env=1 shared_fingerprint=${fingerprint()}`);
  process.exit(0);
}

console.error("x".repeat(78));
console.error(`这一档会被写到不属于它的目录上：uni --mode ${uniMode} → 目标是 mock 证据档 ${SHARED_OUT}`);
console.error(`跑完之后 ${SHARED_OUT}/config/env.js 的 MODE 就从 "${SHARED_OWNER.mode}" 变成 "${uniMode}"，`);
console.error(`凡是读这一档的门禁（verify-band-freshness、G7/G8/G9、mock×任何用例的判决）都会拿这一档的内容当 mock 出判决，`);
console.error(`而构建退出码全绿 —— 2026-09-29 就是这样毒掉过一次。`);
if (poison) console.error(`另外：共享目录现在装的是 MODE:"${cur.mode}" / VITE_API_MODE:"${cur.apiMode}"，本来就不是 mock 档（还没恢复）。`);
console.error(`改走隔离载具：pnpm run build:mp-weixin:${uniMode.replace(/^mp-weixin-/, "")}:isolated`);
console.error(`（真要覆盖 mock 档就 ALLOW_SHARED_MOCK_OUT=1 再跑；共享目录唯一合法主人是 --mode ${SHARED_OWNER.mode}）`);
console.error("x".repeat(78));
console.log(`BANDCOLLIDE_RESULT=REFUSE mode=${uniMode} target=${outDir} shared_now=${cur ? `MODE:"${cur.mode}"/API:"${cur.apiMode}"` : "无产物"} shared_fingerprint=${fingerprint()}`);
process.exit(1);
