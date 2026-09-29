/**
 * 隔离构建载具（三档 mp-weixin 产物共用的**唯一**载具）。
 *
 * 2026-09-29 泛化说明：这个文件原来只做 real 一档，判点（`MODE` 必须是 `real`）硬写在 :106-112。
 * 展示版当初是**抄了第二份** `build-showcase-isolated.mjs` 来做隔离的，两份载具从那天起就开始漂移
 * （第二份自己补了 uni.CMD 绝对路径这一手、第一份没有；`scripts/qa/run-npm-script.mjs:31` 的构建
 * 标记正则里也只认 `build-real-isolated`，认不出第二份）。本文件现在把「档位」做成表：
 * 新增一档 = 在 BANDS 里加一行，**不要再抄脚本**。
 * 文件名保留 `build-real-isolated.mjs`：`scripts/qa/write-gates-json.mjs:104`、
 * `scripts/qa/emit-round-report.mjs:768`、`scripts/qa/verify-rulings-landed.mjs:66`、
 * `.zcode/workflows/miniprogram-qa-loop-v32.dwf.ts:1353` 都按这个路径调用，改名会连带改那些我
 * 不属于本道的文件。默认（不带参数）= real 档，stdout/退出码与泛化前逐字节一致。
 *
 * 为什么需要这个载具，而不是直接 `pnpm run build:mp-weixin:real:dev` / `build:mp-weixin:showcase`：
 * 1. uni 的输出目录只能靠 UNI_OUTPUT_DIR 改道（@dcloudio/vite-plugin-uni/dist/cli/utils.js:128-131）；
 *    在 Windows 上 npm/pnpm 脚本链没法给子进程注入这个变量，直接跑就会把该档产物覆盖进
 *    dist/build/mp-weixin，毁掉 mock 轮的 before/after 配对证据 —— 2026-09-29 实测：按
 *    mock → real:isolated → showcase 的顺序重建后，`dist/build/mp-weixin/config/env.js` 报的是
 *    MODE:"mp-weixin-showcase"，即 showcase 那一跑把 mock 档原地换掉了，而 verify-band-freshness
 *    和所有读 mock 档的门禁都在拿展示版的内容当 mock 档出判决。
 * 2. prepare-static.mjs:154、prune-unreferenced-static.mjs:26（会删文件）、verify-package-size、
 *    verify-build-features.mjs:19 四个脚本写死共享目录，改道后它们仍打到 dist/build/mp-weixin。
 *    所以这里只跑「可安全改道」的最小子集（与 2026-09-24 22:54 实测成功的那次一致），
 *    其余门禁由 --full-chain 显式承担，并在结论里注明它们量的是哪个目录。
 *
 * 用法：node scripts/build-real-isolated.mjs
 *         [--band real|showcase]          档位预设（默认 real）；决定 out 目录、构建链、判点默认值
 *         [--out <dir>]                   产物目录（默认 dist/build/mp-weixin-<档>）；拒绝指向 mock 共享目录
 *         [--mode <uni --mode>]           覆盖喂给 uni build 的 --mode
 *         [--expect-mode <V>]             覆盖产物自证要求的 MODE 值
 *         [--expect-api-mode <V>]         覆盖产物自证要求的 VITE_API_MODE 值
 *         [--expect-showcase-mode [<V>]]  要求 VITE_SHOWCASE_MODE 存在且等于 V（不给 V 则要求 "true"）
 *         [--check-only]                  不构建，只复核 --out 目录里已有的产物
 *         [--full-chain]                  额外跑写死共享目录之外的那串门禁
 *         [--self-test]                   在本文件自己的临时复制件上证明「拒绝写共享目录」那道闸是承重的
 * 退出码：0=PASS，1=FAIL（构建失败、产物模式不对、或试图把非 mock 档构建进 mock 共享目录）。
 */
import { spawnSync, execSync } from "node:child_process";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");
const repoRoot = resolve(clientDir, "..", "..");
const SHARED_OUT = join(clientDir, "dist/build/mp-weixin");

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
/** 与原 opt() 完全一致的取值语义（下一个 argv 就当值），real 档的字节级行为靠它 */
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? resolve(argv[i + 1]) : dflt;
};
/** 新加的旗标用这个：`--x` 后面没有值、或紧跟另一个旗标时，按「无值的布尔旗标」取默认值，
 *  不把 `--check-only` 之类当值吞掉，也不把 undefined 当值传下去（实测漏了这一支会把
 *  `--expect-showcase-mode` 打印成「应为 undefined」，判点自己先失真）。 */
const optFlag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  return v === undefined || v.startsWith("--") ? dflt : v;
};

/** 写死共享目录之外还能安全跑的门禁（real 档 --full-chain 用；与泛化前同一串、同一顺序） */
const FULL_CHAIN = [
  ["check-mp-image-styles", ["--strict"]],
  ["check-statusbar-offset", []],
  ["check-tabbar-consistency", []],
  ["check-project-rules", []],
  ["inject-wx-appid", []],
  ["prepare-static", ["--dev"]],
  ["profile-svg-to-png", []],
];
/** 展示档每次都要跑的两步（抄件 :69 的原有行为） */
const SHOWCASE_PRE = [
  ["prepare-static", ["--dev"]],
  ["profile-svg-to-png", []],
];

/**
 * 档位表 —— 唯一来源。每格只放「这一档真正特有」的事实：喂给 uni 的 --mode、独立目录、
 * 要不要 strip-mock、构建前置步、产物自证判点、机读行的前缀与键名。
 * 断言的默认值就是泛化前写死在 :109-111 的那三行（real：MODE=real、VITE_API_MODE=real、VITE_API_BASE_URL 非空）。
 */
const BANDS = {
  real: {
    uniMode: "real",
    outName: "mp-weixin-real",
    stripMock: true,
    preSteps: [],
    fullChainSteps: FULL_CHAIN,
    expectMode: "real",
    expectApiMode: "real",
    expectShowcaseMode: null,
    requireBaseUrl: true,
    label: "g7",
    resultKey: "G7_RESULT",
    gateName: "G7",
    featureFlags: false,
  },
  showcase: {
    uniMode: "mp-weixin-showcase",
    outName: "mp-weixin-showcase",
    stripMock: false,
    preSteps: SHOWCASE_PRE,
    fullChainSteps: [["check-mp-image-styles", ["--strict"]], ["check-statusbar-offset", []], ["check-tabbar-consistency", []], ["check-project-rules", []], ...SHOWCASE_PRE],
    expectMode: "mp-weixin-showcase",
    // 展示档的数据源是真实 HTTP（.env.mp-weixin-showcase: VITE_API_MODE=real），不是 mock
    expectApiMode: "real",
    expectShowcaseMode: "true",
    requireBaseUrl: true,
    label: "showcase",
    resultKey: "SHOWCASE_RESULT",
    gateName: "展示档自证",
    featureFlags: true,
  },
};

const bandName = optFlag("band", "real");
const band = BANDS[bandName];
if (!band) {
  console.error(`BAND_RESULT=FAIL reason=未知档位 --band ${bandName}（可用：${Object.keys(BANDS).join(" / ")}）`);
  process.exit(1);
}
const RK = band.resultKey;
const LABEL = band.label;

const major = Number(process.versions.node.split(".")[0]);
if (major < 18) {
  console.error(`${RK}=FAIL reason=node ${process.versions.node} 过老（uni build 需 >=18）。这是测试台环境噪声，不是产品缺陷，`);
  console.error(`${RK}=FAIL hint=用新版 node 重跑（实测 PATH 上的 node 常是 v16，沙箱里直接跑会把 ${band.gateName} 记成假 FAIL）`);
  process.exit(1);
}

const checkOnly = flag("check-only");
const fullChain = flag("full-chain");
const uniMode = optFlag("mode", band.uniMode);
const expectMode = optFlag("expect-mode", band.expectMode);
const expectApiMode = optFlag("expect-api-mode", band.expectApiMode);
const expectShowcaseMode = flag("expect-showcase-mode") ? String(optFlag("expect-showcase-mode", "true")) : band.expectShowcaseMode;
const outDir = opt("out", join(clientDir, "dist/build", band.outName));

if (flag("self-test")) process.exit(selfTest());

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

// <<BAND_GUARD_BEGIN>>
// 这段是「不许把任何一档写进 mock 共享目录」的唯一硬闸，删掉它 --self-test 的负例就会转红。
if (sameOrInside(outDir, SHARED_OUT)) {
  console.error(`${RK}=FAIL reason=拒绝把 ${bandName} 产物构建到 mock 共享目录 ${SHARED_OUT}`);
  console.error(`${RK}=FAIL hint=不传 --out（默认 ${join(clientDir, "dist/build", band.outName)}），或 pnpm run build:mp-weixin:${bandName}:isolated；共享目录只属于 mock 档（MODE:"mp-weixin-mock"）`);
  process.exit(1);
}
// <<BAND_GUARD_END>>

// 子进程里 `uni` 这个 bin 只有在 PATH 含 .bin 时可解析（本脚本可能被 node 直接拉起，无 npm 上下文）
const env = {
  ...process.env,
  UNI_OUTPUT_DIR: outDir,
  PATH: [join(clientDir, "node_modules/.bin"), join(clientDir, "../../node_modules/.bin"), process.env.PATH].join(join.delimiter === ";" ? ";" : ":"),
};

/** 共享产物指纹：构建前后必须一致，否则说明这一档覆盖了 mock 证据 */
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

/**
 * 不走 strip-mock 的档位要自己把 uni 解析成绝对路径：Windows 上 process.env 展开后同时带着
 * `Path` 与我新写的 `PATH`（实测 cmd.exe 会挑原来那个），于是上面那段 PATH 注不进去，
 * `uni` 报"不是内部或外部命令"。抄件 :76-84 已经踩过并修好了，这里把它收进唯一载具。
 */
function resolveUniBin() {
  const candidates = [
    join(clientDir, "node_modules/.bin/uni.CMD"),
    join(clientDir, "node_modules/.bin/uni.cmd"),
    join(clientDir, "node_modules/.bin/uni"),
  ];
  return candidates.find((p) => existsSync(p)) || null;
}

const before = sharedFingerprint();
let ok = true;

if (!checkOnly) {
  for (const s of fullChain ? band.fullChainSteps : band.preSteps) {
    ok = run(s[0], process.execPath, [join(clientDir, `scripts/${s[0]}.mjs`), ...s[1]]) && ok;
    if (!ok) break;
  }
  if (ok) {
    if (band.stripMock) {
      ok = run(`uni-build-${bandName}`, process.execPath, [
        join(clientDir, "scripts/strip-mock-for-mp.mjs"),
        `uni build --platform mp-weixin --mode ${uniMode}`,
      ]);
    } else {
      const step = `uni-build-${bandName}`;
      const uniBin = resolveUniBin();
      if (!uniBin) {
        ok = false;
        console.error(`[${step}] 找不到 uni 可执行文件（node_modules/.bin/uni*），不假装构建成功`);
      } else {
        console.log(`[${step}] 用 ${uniBin}`);
        try {
          execSync(`"${uniBin}" build --platform mp-weixin --mode ${uniMode}`, { stdio: "inherit", cwd: clientDir, env });
        } catch (e) {
          ok = false;
          console.error(`[${step}] 失败：${String(e.message).split("\n")[0]}`);
        }
      }
    }
  }
}

const after = sharedFingerprint();
const envjs = join(outDir, "config/env.js");
const problems = [];

if (!ok) problems.push(`${bandName} 构建未成功退出`);
if (after !== before) problems.push(`mock 共享产物被动过（${before} → ${after}），本轮证据链作废`);
if (!existsSync(envjs)) {
  problems.push(`产物缺失 ${envjs}`);
} else {
  const text = readFileSync(envjs, "utf-8");
  const pick = (key) => (text.match(new RegExp(`${key}:"([^"]*)"`)) || [])[1];
  const mode = pick("MODE");
  const apiMode = pick("VITE_API_MODE");
  const baseUrl = pick("VITE_API_BASE_URL");
  let selfCert = `[${LABEL}] 产物自证 MODE=${mode} VITE_API_MODE=${apiMode} VITE_API_BASE_URL=${baseUrl}`;
  if (expectShowcaseMode) {
    const sc = pick("VITE_SHOWCASE_MODE");
    selfCert += ` VITE_SHOWCASE_MODE=${sc ?? "取不到"}`;
    if (sc !== expectShowcaseMode) problems.push(`VITE_SHOWCASE_MODE=${sc ?? "取不到"}（应为 ${expectShowcaseMode}）—— 这一档没开展示模式，VIP 守卫照样弹回`);
  }
  if (band.requireBaseUrl && !baseUrl) problems.push("VITE_API_BASE_URL 为空");
  if (mode !== expectMode) problems.push(`MODE=${mode}（应为 ${expectMode}）`);
  if (apiMode !== expectApiMode) problems.push(`VITE_API_MODE=${apiMode}（应为 ${expectApiMode}）`);
  console.log(selfCert);
  console.log(`[${LABEL}] outDir=${outDir} sharedOutUntouched=${after === before ? "yes" : "NO"}`);
}

if (band.featureFlags) {
  const flagsjs = join(outDir, "config/feature-flags.js");
  if (!existsSync(flagsjs)) problems.push(`产物缺失 ${flagsjs}`);
  else console.log(`[${LABEL}] feature-flags 产物里的初值：${(readFileSync(flagsjs, "utf-8").match(/membershipEnabled:![01]/g) || ["取不到"]).join(",")}`);
}

for (const p of problems) console.error(`[${LABEL}] ${p}`);
console.log(problems.length ? `${RK}=FAIL` : `${RK}=PASS`);
process.exit(problems.length ? 1 : 0);

/**
 * --self-test：证明上面那段 BAND_GUARD 是承重的，而不是装饰。
 *
 * 做法是把**本文件自己**复制到一个临时目录（SHARED_OUT 是按脚本自身位置算的，所以复制件的
 * "共享目录"落在临时目录里，真产物一个字节都不碰），然后测三件事：
 *   A 带闸 + --out 指向复制件的共享目录 ⇒ 必须拒绝（退出码非 0、拒绝行在、指纹没变）；
 *   B 把 BAND_GUARD 那段从复制件里删掉 ⇒ 同一命令必须**不再**拒绝（证明 A 的绿是那道闸给的，
 *     也就是"它必须拒绝"这条断言真的会红）；
 *   C 带闸 + --out 指向合法独立目录 ⇒ 必须放行（证明那道闸不是一把永远红的闸）。
 * 全程 --check-only，不构建、不联网、不进 dist/build。
 */
function selfTest() {
  const SRK = "BANDISOLATION_RESULT";
  const GUARD_RE = /\n\/\/ <<BAND_GUARD_BEGIN>>[\s\S]*?\/\/ <<BAND_GUARD_END>>\n/;
  const src = readFileSync(fileURLToPath(import.meta.url), "utf-8");
  if (!GUARD_RE.test(src)) {
    console.error(`BANDISOLATION_NOTE=在 ${fileURLToPath(import.meta.url)} 里找不到 BAND_GUARD 标记段 ⇒ 无法构造负例，本自证判红`);
    console.error(`${SRK}=FAIL problems=1`);
    return 1;
  }
  const scratch = join(repoRoot, ".zcode", "tmp", "band-isolation-selftest");
  rmSync(scratch, { recursive: true, force: true });
  /** 假产物：一份 real 档的 config/env.js（判点全中），既能当"被误指向的共享目录"，也能当"合法独立目录" */
  const FAKE_ENV = `"use strict";const T={BASE_URL:"/",DEV:!1,MODE:"real",PROD:!0,SSR:!1,VITE_API_BASE_URL:"http://127.0.0.1:8080/api",VITE_API_MODE:"real",VITE_APP_VERSION:"v0.1.0-selftest",VITE_USER_NODE_ENV:"production"};module.exports=T;\n`;
  const mkTree = (name, scriptText) => {
    const root = join(scratch, name);
    mkdirSync(join(root, "scripts"), { recursive: true });
    for (const dir of ["mp-weixin", "mp-weixin-real"]) {
      mkdirSync(join(root, "dist", "build", dir, "config"), { recursive: true });
      writeFileSync(join(root, "dist", "build", dir, "config", "env.js"), FAKE_ENV, "utf-8");
    }
    writeFileSync(join(root, "scripts", "build-real-isolated.mjs"), scriptText, "utf-8");
    return root;
  };
  const fpOf = (dir) => {
    const f = join(dir, "config", "env.js");
    if (!existsSync(f)) return "absent";
    const st = statSync(f);
    return `${st.size}:${st.mtimeMs}`;
  };
  const exec = (script, args) => {
    const r = spawnSync(process.execPath, [script, ...args], { cwd: repoRoot, encoding: "utf8", env: { ...process.env } });
    return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
  };

  const rootA = mkTree("A-guarded", src);
  const rootB = mkTree("B-mutant", src.replace(GUARD_RE, "\n// (BAND_GUARD 已被自证删掉)\n"));
  const scriptA = join(rootA, "scripts", "build-real-isolated.mjs");
  const scriptB = join(rootB, "scripts", "build-real-isolated.mjs");
  const sharedA = join(rootA, "dist", "build", "mp-weixin");
  const isolatedA = join(rootA, "dist", "build", "mp-weixin-real");
  const sharedB = join(rootB, "dist", "build", "mp-weixin");

  const problems = [];

  const fpBefore = fpOf(sharedA);
  const a = exec(scriptA, ["--out", sharedA, "--check-only"]);
  const aRefused = a.code !== 0 && a.out.includes("拒绝把 real 产物构建到 mock 共享目录");
  const aUntouched = fpOf(sharedA) === fpBefore;
  console.log(`BANDISOLATION_A 带闸指向共享目录：exit=${a.code} 拒绝行=${aRefused ? "有" : "无"} 假共享目录指纹未变=${aUntouched ? "yes" : "NO"}`);
  if (!aRefused) problems.push(`A：载具没拒绝把 real 产物写进共享目录（exit=${a.code}）⇒ 隔离失效，这一档会毒掉 mock 档`);
  if (!aUntouched) problems.push("A：拒绝之后假共享目录的指纹仍变了 ⇒ 拒绝发生在写盘之后，闸门是摆设");

  const b = exec(scriptB, ["--out", sharedB, "--check-only"]);
  const bRefused = b.code !== 0 && b.out.includes("拒绝把 real 产物构建到 mock 共享目录");
  console.log(`BANDISOLATION_B 删闸同命令：exit=${b.code} 拒绝行=${bRefused ? "有" : "无"} 机读行=${(b.out.match(/G7_RESULT=\w+/) || ["无"])[0]}`);
  if (bRefused) problems.push("B：把 BAND_GUARD 删掉之后它还是拒绝 ⇒ 这条断言不是在测那道闸（假绿的红，负例不承重）");

  const c = exec(scriptA, ["--out", isolatedA, "--check-only"]);
  console.log(`BANDISOLATION_C 带闸指向合法独立目录：exit=${c.code} 机读行=${(c.out.match(/G7_RESULT=\w+/) || ["无"])[0]}`);
  if (c.code === 0 && !c.out.includes("G7_RESULT=PASS")) problems.push("C：exit=0 却没打 G7_RESULT=PASS");
  if (c.code !== 0) problems.push(`C：合法的独立目录被误拒（exit=${c.code}）⇒ 那道闸过宽，会把真构建一起拦死`);

  const d = exec(scriptA, ["--band", "showcase", "--out", sharedA, "--check-only"]);
  const dRefused = d.code !== 0 && d.out.includes("拒绝把 showcase 产物构建到 mock 共享目录");
  console.log(`BANDISOLATION_D 带闸 + showcase 档指向共享目录：exit=${d.code} 拒绝行=${dRefused ? "有" : "无"} 机读行=${(d.out.match(/SHOWCASE_RESULT=\w+/) || ["无"])[0]}`);
  if (!dRefused) problems.push(`D：showcase 档没被同一道闸拦住（exit=${d.code}）⇒ 本次要修的正是这一条`);

  rmSync(scratch, { recursive: true, force: true });
  for (const p of problems) console.error(`[band-isolation] ${p}`);
  console.log(`BANDISOLATION 负例形状：有闸必拒（A/D）/ 删闸放行（B）/ 独立目录不误拒（C）⇒ 断言"它必须拒绝"在 B 上会转红`);
  console.log(problems.length ? `${SRK}=FAIL problems=${problems.length}` : `${SRK}=PASS cases=4 负例可红=是`);
  return problems.length ? 1 : 0;
}
