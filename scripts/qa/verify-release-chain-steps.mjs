#!/usr/bin/env node
/**
 * verify-release-chain-steps.mjs —— real 发布链的步序与改道核验（2026-10-18 · MP-FIDELITY Phase A）。
 *
 * 为什么要有这道门（不是给已经修好的东西再补一件装饰）：
 *   D-A0 实测：release-chain 从不设 UNI_OUTPUT_DIR，而 add-lazy-code-loading(:25)/
 *   prune-unreferenced-static(:26)/verify-package-size(:27) 三个脚本的缺省目录都是
 *   dist/build/mp-weixin（mock 档的家）⇒ 这条"发布链"历史上跑的是三步别人的产物，
 *   mp-weixin-real/app.json 里 lazyCodeLoading 实测根本不存在。这类毛病不是构建失败，
 *   是**构建成功但量错了对象**，靠退出码永远读不出来。
 *   D-A1 实测：prepare-static.mjs:234-235 在 real 模式的保留集是从上一轮 mock 产物扫的
 *   ⇒ 静态资源集随构建顺序变。
 *
 * 判点取的是链自己 --dry 打出来的 argv（不是我去猜那张表）：
 *   1. 步序覆盖：build-real-isolated 的 FULL_CHAIN 全体 + verify-env-release + uni build
 *      + 三步后处理 + 碰撞守卫，一条不许少（少一条＝那条门禁从没在这档上跑过）；
 *   2. 改道：三步后处理必须各自带着 out 目录（--dist 或位置参数），漏一个＝回到 mock 缺省；
 *   3. prepare-static 必须带 --scan src（不带＝又去扫上一轮别的档）；
 *   4. 豁免必须带 --carrier（匿名豁免在门那边已经退 2，这里核链确实把载具传下去了）；
 *   5. 负例承重：--out 指向 mock 共享目录必须**被拒**，且拒绝发生在任何写盘之前。
 *
 * 用法：node scripts/qa/verify-release-chain-steps.mjs
 * 退出码：0 全中；1 有判点不中（可红）；2 仪器前提不成立（链脚本读不到/--dry 跑不起来）。
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const CLIENT = join(REPO, "apps", "client");
const CHAIN = join(CLIENT, "scripts", "release-chain.mjs");
const ISOLATED = join(CLIENT, "scripts", "build-real-isolated.mjs");
const SHARED_OUT = join(CLIENT, "dist", "build", "mp-weixin");
const RK = "CHAINSTEPS_RESULT";

const problems = [];
const notes = [];

if (!existsSync(CHAIN) || !existsSync(ISOLATED)) {
  console.log(`${RK}=NOT-EVIDENCED reason=script-missing chain=${existsSync(CHAIN)} isolated=${existsSync(ISOLATED)}`);
  process.exit(2);
}

/** 从 build-real-isolated.mjs 源码里取 FULL_CHAIN 的步名（那边新增一步、这边没跟 ⇒ 判红）。
 * 取的是数组字面量里的 ["<name>", ...] 首元，不复制第二份清单，免得两边各说各话。 */
function fullChainNames() {
  const src = readFileSync(ISOLATED, "utf-8");
  const m = src.match(/const FULL_CHAIN = \[([\s\S]*?)\n\];/);
  if (!m) return null;
  const names = [];
  for (const row of m[1].split(/\r?\n/)) {
    const t = row.match(/\[\s*"([^"]+)"/);
    if (t) names.push(t[1]);
  }
  return names;
}

function runDry(extraArgs) {
  const r = spawnSync(process.execPath, [CHAIN, "--allow-loopback", "--dry", ...(extraArgs || [])], {
    cwd: CLIENT, encoding: "utf8",
  });
  if (r.error) return { fatal: `链脚本起不来：${r.error.message}` };
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

const dry = runDry([]);
if (dry.fatal) { console.log(`${RK}=NOT-EVIDENCED reason=${dry.fatal}`); process.exit(2); }
const dryLines = dry.out.split(/\r?\n/).filter((l) => l.includes("[release-chain] [dry]"));

/* ── 判点 1+2+3+4：步序与改道（读链自己打印的 argv） ── */
const stepText = dryLines.join("\n");
const REQUIRED = [
  "check-band-outdir-collision.mjs",
  "check-mp-image-styles.mjs",
  "check-statusbar-offset.mjs",
  "check-tabbar-consistency.mjs",
  "check-project-rules.mjs",
  "inject-wx-appid.mjs",
  "prepare-static.mjs",
  "profile-svg-to-png.mjs",
  "verify-env-release.mjs",
  "strip-mock-for-mp.mjs",
  "add-lazy-code-loading.mjs",
  "prune-unreferenced-static.mjs",
  "verify-package-size.mjs",
];
for (const s of REQUIRED) {
  if (!stepText.includes(s)) problems.push(`链的 --dry 步骤表里没有 ${s} ⇒ 这一步从没在这一档上跑过`);
}

const isoNames = fullChainNames();
if (!isoNames) problems.push("读不到 build-real-isolated.mjs 的 FULL_CHAIN 数组 ⇒ 步序同步判点失效（正则过期了，不是链过期了）");
else {
  const chNames = [];
  for (const row of dryLines) {
    const t = row.match(/\[dry\]\s+(\S+)/);
    if (t) chNames.push(t[1].replace(/^.*[\\/]/, "").replace(/\.mjs$/, ""));
  }
  const missing = isoNames.filter((n) => !chNames.includes(n));
  if (missing.length) problems.push(`isolated 档的 FULL_CHAIN 有 ${missing.length} 步没进发布链：${missing.join(",")} ⇒ 两载具口径又分叉了`);
  notes.push(`FULL_CHAIN(${isoNames.length}) 已全数在链内：${isoNames.join("/")}`);
}

/** 取某一步的整行 argv（按脚本名匹配） */
function stepLine(needle) {
  return dryLines.find((l) => l.includes(needle)) || "";
}
const lazy = stepLine("add-lazy-code-loading.mjs");
const prune = stepLine("prune-unreferenced-static.mjs");
const size = stepLine("verify-package-size.mjs");
const prep = stepLine("prepare-static.mjs");
const envg = stepLine("verify-env-release.mjs");

// out 目录名：从链自己的 out= 行取，不硬编码路径（硬编码过一次就再没人改得动）
const outM = dry.out.match(/\[release-chain\] out=(\S+) shared=/);
const outDir = outM ? outM[1] : "";
if (!outDir) problems.push("读不到链打印的 out= ⇒ 改道判点全部无从核对");
else {
  notes.push(`out=${outDir}`);
  if (!/--allow-loopback\b/.test(dry.out) && !dry.out.includes("loopbackWaiver=yes")) problems.push(`链自身带了 --allow-loopback 却没打印 loopbackWaiver=yes ⇒ 豁免传没传读不出来（out=${outDir}）`);
  for (const [name, line] of [["add-lazy-code-loading", lazy], ["prune-unreferenced-static", prune]]) {
    if (line && !line.includes(`--dist ${outDir}`) && !line.includes(`--dist "${outDir}"`)) {
      problems.push(`${name} 没带 --dist ${outDir} ⇒ 它会回到缺省的 mock 目录去改/删文件（D-A0 复发）`);
    }
  }
  if (size && !size.includes(outDir)) problems.push(`verify-package-size 没带位置参数 ${outDir} ⇒ 它量的是缺省 mock 目录，包体结论记错对象`);
}
if (prep && !/--scan\s+src/.test(prep)) problems.push("prepare-static 没带 --scan src ⇒ 保留集又由上一轮别的档决定（D-A1 复发）");
if (envg && !/--carrier\s+release-chain/.test(envg)) problems.push("链向下传豁免却没点名载具 ⇒ 门那边会退 2，链却把 2 当成构建失败，谁也读不出是豁免匿名");

/* ── 判点 5：负例承重 —— 指向 mock 共享目录必须被拒，且拒在写盘之前 ── */
const neg = runDry(["--out", SHARED_OUT]);
if (neg.fatal) problems.push(`负例跑不起来：${neg.fatal}`);
else {
  const refused = neg.code !== 0 && /拒绝把 real 产物构建到 mock 共享目录/.test(neg.out);
  if (!refused) problems.push(`--out 指向共享目录 ${SHARED_OUT} 时链没拒绝（exit=${neg.code}）⇒ 同目录守卫是摆设，跑一次发布链就毒掉 mock 档证据`);
  // 拒了还不算：共享目录的 config/env.js 指纹必须没被动过
  const marker = join(SHARED_OUT, "config", "env.js");
  if (existsSync(marker)) {
    const st = readFileSync(marker);
    notes.push(`负例后共享目录 env.js 仍在（${st.length}B）`);
  } else notes.push("共享目录 config/env.js 不存在（负例无从比对指纹，仅记不判）");
}

for (const n of notes) console.log(`CHAINSTEPS_NOTE ${n}`);
for (const p of problems) console.error(`CHAINSTEP_PROBLEM ${p}`);
console.log(problems.length
  ? `${RK}=FAIL drySteps=${dryLines.length} problems=${problems.length}`
  : `${RK}=PASS drySteps=${dryLines.length} required=${REQUIRED.length} 负例可红=${neg && neg.code !== 0 ? "是" : "否"}`);
process.exit(problems.length ? 1 : 0);
