/**
 * 展示版（showcase）隔离构建：把「功能开关全开」那一档产物构建到独立目录，绝不覆盖 mock 共享产物。
 *
 * 为什么需要第三档产物（而不是在 mock 包上跑 VIP 用例）：
 * `subpackages/vip/index.vue` 的 onLoad 守卫读 `featureFlags.membershipEnabled`，
 * 该开关在 `config/feature-flags.ts:29` 默认 false（会员未上线），
 * 只有 showcase 构建（`config/showcase.ts` 的 applyShowcaseMode）会把它置 true。
 * 所以 34 条 VIP 用例在 mock / real 两档上**必然**被弹回「我的」Tab——
 * 那是守卫按设计工作，不是缺陷；要量 VIP 页本身就得换这档载体。
 *
 * 与 build-real-isolated.mjs 同样的三条约束：uni 输出只能靠 UNI_OUTPUT_DIR 改道、
 * 写死共享目录的门禁不在这里跑、构建前后比对 mock 产物指纹。
 * showcase 档的 API 模式是 real（见 .env.mp-weixin-showcase），所以跑它需要 8080 在服。
 *
 * 用法：node scripts/build-showcase-isolated.mjs [--out <dir>] [--check-only]
 * 退出码：0=构建成功且产物自证为 showcase 档，1=否则。
 */
import { spawnSync, execSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");
const SHARED_OUT = join(clientDir, "dist/build/mp-weixin");

const argv = process.argv.slice(2);
const major = Number(process.versions.node.split(".")[0]);
if (major < 18) {
  console.error(`SHOWCASE_RESULT=FAIL reason=node ${process.versions.node} 过老（uni build 需 >=18），换新版 node 重跑`);
  process.exit(1);
}
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? resolve(argv[i + 1]) : dflt;
};
const outDir = opt("out", join(clientDir, "dist/build/mp-weixin-showcase"));
const checkOnly = flag("check-only");

if (resolve(outDir) === resolve(SHARED_OUT)) {
  console.error(`SHOWCASE_RESULT=FAIL reason=拒绝把 showcase 产物构建到 mock 共享目录 ${SHARED_OUT}`);
  process.exit(1);
}

const env = {
  ...process.env,
  UNI_OUTPUT_DIR: outDir,
  PATH: [join(clientDir, "node_modules/.bin"), join(clientDir, "../../node_modules/.bin"), process.env.PATH].join(join.delimiter === ";" ? ";" : ":"),
};

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
  for (const s of [["prepare-static", ["--dev"]], ["profile-svg-to-png", []]]) {
    ok = run(s[0], process.execPath, [join(clientDir, `scripts/${s[0]}.mjs`), ...s[1]]) && ok;
    if (!ok) break;
  }
  // 与 strip-mock-for-mp.mjs:124 同样的调用形态：走 shell。
  // 但这里必须用 .bin 里那个 **绝对路径的 .CMD**：Windows 上 process.env 展开后同时带着
  // `Path` 与我新写的 `PATH`（实测 cmd.exe 会挑原来那个），于是 `uni` 报"不是内部或外部命令"。
  const uniCmd = [join(clientDir, "node_modules/.bin/uni.CMD"), join(clientDir, "node_modules/.bin/uni.cmd"), join(clientDir, "node_modules/.bin/uni")]
    .find((p) => existsSync(p));
  if (!uniCmd) {
    ok = false;
    console.error("[uni-build-showcase] 找不到 uni 可执行文件（node_modules/.bin/uni*），不假装构建成功");
  } else {
    console.log(`[uni-build-showcase] 用 ${uniCmd}`);
    try {
      execSync(`"${uniCmd}" build --platform mp-weixin --mode mp-weixin-showcase`, { stdio: "inherit", cwd: clientDir, env });
    } catch (e) {
      ok = false;
      console.error(`[uni-build-showcase] 失败：${String(e.message).split("\n")[0]}`);
    }
  }
}

const after = sharedFingerprint();
const envjs = join(outDir, "config/env.js");
const flagsjs = join(outDir, "config/feature-flags.js");
const problems = [];

if (!ok) problems.push("showcase 构建未成功退出");
if (after !== before) problems.push(`mock 共享产物被动过（${before} → ${after}），本轮证据链作废`);
if (!existsSync(envjs)) problems.push(`产物缺失 ${envjs}`);
if (!existsSync(flagsjs)) problems.push(`产物缺失 ${flagsjs}`);
if (existsSync(envjs)) {
  const text = readFileSync(envjs, "utf-8");
  const pick = (key) => (text.match(new RegExp(`${key}:"([^"]*)"`)) || [])[1];
  console.log(`[showcase] 产物自证 MODE=${pick("MODE")} VITE_API_MODE=${pick("VITE_API_MODE")} VITE_SHOWCASE_MODE=${pick("VITE_SHOWCASE_MODE") ?? "取不到"}`);
  if (pick("MODE") !== "mp-weixin-showcase") problems.push(`MODE=${pick("MODE")}（应为 mp-weixin-showcase）`);
  if (pick("VITE_SHOWCASE_MODE") !== "true") problems.push("VITE_SHOWCASE_MODE 不是 true —— 这档没开展示模式，VIP 守卫照样弹回");
}
if (existsSync(flagsjs)) {
  const t = readFileSync(flagsjs, "utf-8");
  console.log(`[showcase] feature-flags 产物里的初值：${(t.match(/membershipEnabled:![01]/g) || ["取不到"]).join(",")}`);
}
console.log(`[showcase] outDir=${outDir} sharedOutUntouched=${after === before ? "yes" : "NO"}`);

for (const p of problems) console.error(`[showcase] ${p}`);
console.log(problems.length ? "SHOWCASE_RESULT=FAIL" : "SHOWCASE_RESULT=PASS");
process.exit(problems.length ? 1 : 0);
