/**
 * G7（QA 工作流 v3.2 真实模式验收）专用：把 real 产物构建到独立目录，绝不触碰 mock 共享产物。
 *
 * 为什么需要这个脚本，而不是直接 `pnpm run build:mp-weixin:real:dev`：
 * 1. uni 的输出目录只能靠 UNI_OUTPUT_DIR 改道（@dcloudio/vite-plugin-uni/dist/cli/utils.js:128-131）；
 *    在 Windows 上 npm/pnpm 脚本链没法给子进程注入这个变量，直接跑就会把 real 覆盖进
 *    dist/build/mp-weixin，毁掉 mock 轮的 before/after 配对证据。
 * 2. prepare-static.mjs:154、prune-unreferenced-static.mjs:26（会删文件）、verify-package-size、
 *    verify-build-features.mjs:19 四个脚本写死共享目录，改道后它们仍打到 dist/build/mp-weixin。
 *    所以这里只跑「可安全改道」的最小子集（与 2026-09-24 22:54 实测成功的那次一致），
 *    其余门禁由 --full-chain 显式承担，并在结论里注明它们量的是哪个目录。
 *
 * 用法：node scripts/build-real-isolated.mjs [--out <dir>] [--check-only] [--full-chain]
 * 退出码：0=G7 PASS，1=G7 FAIL（构建失败或产物模式不对）。
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");
const SHARED_OUT = join(clientDir, "dist/build/mp-weixin");

const argv = process.argv.slice(2);
const major = Number(process.versions.node.split(".")[0]);
if (major < 18) {
  console.error(`G7_RESULT=FAIL reason=node ${process.versions.node} 过老（uni build 需 >=18）。这是测试台环境噪声，不是产品缺陷，`);
  console.error(`G7_RESULT=FAIL hint=用新版 node 重跑（实测 PATH 上的 node 常是 v16，沙箱里直接跑会把 G7 记成假 FAIL）`);
  process.exit(1);
}
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? resolve(argv[i + 1]) : dflt;
};

const outDir = opt("out", join(clientDir, "dist/build/mp-weixin-real"));
const checkOnly = flag("check-only");
const fullChain = flag("full-chain");

if (resolve(outDir) === resolve(SHARED_OUT)) {
  console.error(`G7_RESULT=FAIL reason=拒绝把 real 产物构建到 mock 共享目录 ${SHARED_OUT}`);
  process.exit(1);
}

// 子进程里 `uni` 这个 bin 只有在 PATH 含 .bin 时可解析（本脚本可能被 node 直接拉起，无 npm 上下文）
const env = {
  ...process.env,
  UNI_OUTPUT_DIR: outDir,
  PATH: [join(clientDir, "node_modules/.bin"), join(clientDir, "../../node_modules/.bin"), process.env.PATH].join(join.delimiter === ";" ? ";" : ":"),
};

/** 共享产物指纹：构建前后必须一致，否则说明 real 覆盖了 mock 证据 */
function sharedFingerprint() {
  if (!existsSync(SHARED_OUT)) return "absent";
  const marker = join(SHARED_OUT, "config/env.js");
  if (!existsSync(marker)) return "no-env-js";
  const st = statSync(marker);
  return `${st.size}:${st.mtimeMs}`;
}

function run(label, cmd, args) {
  const r = spawnSync(cmd, args, { cwd: clientDir, env, stdio: "inherit" });
  if (r.error) console.error(`[${label}] 无法启动：${r.error.message}`);
  return r.status === 0;
}

const before = sharedFingerprint();
let ok = true;

if (!checkOnly) {
  if (fullChain) {
    for (const s of [
      ["check-mp-image-styles", ["--strict"]],
      ["check-statusbar-offset", []],
      ["check-tabbar-consistency", []],
      ["check-project-rules", []],
      ["inject-wx-appid", []],
      ["prepare-static", ["--dev"]],
      ["profile-svg-to-png", []],
    ]) {
      ok = run(s[0], process.execPath, [join(clientDir, `scripts/${s[0]}.mjs`), ...s[1]]) && ok;
      if (!ok) break;
    }
  }
  if (ok) {
    ok = run("uni-build-real", process.execPath, [
      join(clientDir, "scripts/strip-mock-for-mp.mjs"),
      "uni build --platform mp-weixin --mode real",
    ]);
  }
}

const after = sharedFingerprint();
const envjs = join(outDir, "config/env.js");
const problems = [];

if (!ok) problems.push("real 构建未成功退出");
if (after !== before) problems.push(`mock 共享产物被动过（${before} → ${after}），本轮证据链作废`);
if (!existsSync(envjs)) {
  problems.push(`产物缺失 ${envjs}`);
} else {
  const text = readFileSync(envjs, "utf-8");
  const pick = (key) => (text.match(new RegExp(`${key}:"([^"]*)"`)) || [])[1];
  const mode = pick("MODE");
  const apiMode = pick("VITE_API_MODE");
  const baseUrl = pick("VITE_API_BASE_URL");
  if (mode !== "real") problems.push(`MODE=${mode}（应为 real）`);
  if (apiMode !== "real") problems.push(`VITE_API_MODE=${apiMode}（应为 real）`);
  if (!baseUrl) problems.push("VITE_API_BASE_URL 为空");
  console.log(`[g7] 产物自证 MODE=${mode} VITE_API_MODE=${apiMode} VITE_API_BASE_URL=${baseUrl}`);
  console.log(`[g7] outDir=${outDir} sharedOutUntouched=${after === before ? "yes" : "NO"}`);
}

for (const p of problems) console.error(`[g7] ${p}`);
console.log(problems.length ? "G7_RESULT=FAIL" : "G7_RESULT=PASS");
process.exit(problems.length ? 1 : 0);
