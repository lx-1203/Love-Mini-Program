#!/usr/bin/env node
/**
 * relocate-sweep-out.mjs —— 把取景腿平铺在 --out 根目录里的一发帧集，机械归位到
 * `tmp/qa/frames/<round>/<band>/`，并逐帧回读 sha16 证明"搬之前后是同一张图"。
 *
 * 为什么需要它（2026-10-19 实测，是我造成的）：取景腿的 `--out` 缺省就是
 * `tmp/qa/frames/<ROUND>/<band>`，而我手抄 R5 的日志时把 R5 的**完整 band 目录**当成
 * "根目录"传了进来 ⇒ 141 张帧与清单平铺在 tmp/qa/frames/ 根上。收口门按
 * 收口门按 `frames/<轮>/<档>/sweep-manifest.json` 发现轮次，平铺的那一发根本不被算成一轮。
 *
 * 为什么"改清单里的路径"不算手填证据：本脚本只做一件事——给 manifest 里的 path 前缀做
 * 字符串搬迁，**不碰任何字节数、哈希、落点、判决字段**；每帧搬完立刻重算 sha256 前 16 位，
 * 与清单里原有的 contentHash 逐张比对，任一张对不上就整批不动并退 1。
 * 也就是说：它把"我传错参数"这件既成事实变成一个可复核的动作，而不是把读数改好看。
 *
 * 用法：node scripts/qa/relocate-sweep-out.mjs [--from tmp/qa/frames] [--to tmp/qa/frames/R6/real-f0677920] [--dry]
 * 退出码：0 全部归位且逐帧哈希一致；1 有帧哈希不符/清单读不到（不动盘）；2 前提不成立（源清单不存在）。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "RELOCATE_SWEEPOUT_RESULT";
const arg = (k, d) => {
  const i = process.argv.indexOf("--" + k);
  return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d;
};
const dry = process.argv.includes("--dry");

const FROM = resolve(REPO, arg("from", "tmp/qa/frames"));
const TO = resolve(REPO, arg("to", "tmp/qa/frames/R6/real-f0677920"));
const MAN = join(FROM, "sweep-manifest.json");
const norm = (p) => relative(REPO, resolve(p)).split(sep).join("/");

if (!existsSync(MAN)) {
  console.log(`${RK}=NOT-EVIDENCED reason=源清单不存在 ${norm(MAN)}（那是前提不成立，不是"没东西要搬"）`);
  process.exit(2);
}
if (resolve(FROM) === resolve(TO)) {
  console.log(`${RK}=FAIL reason=源与目标同目录 ⇒ 没有可搬的东西，别把一次配错读成一次成功`);
  process.exit(1);
}

const originalText = readFileSync(MAN, "utf-8");
const j = JSON.parse(originalText);
const results = Array.isArray(j.results) ? j.results : [];
if (!results.length) {
  console.log(`${RK}=FAIL reason=清单 results 为空（0 路由），空集上不许宣布"归位完成"`);
  process.exit(1);
}

/* 收集全部帧路径（清单是唯一真源：盘上多出来的平铺件不在清单里 ⇒ 一律不搬，只点名） */
const framePaths = new Set();
for (const r of results) for (const f of r.frames || []) if (f.path) framePaths.add(f.path);
const listed = [...framePaths];
const missing = listed.filter((p) => !existsSync(resolve(REPO, p)));
if (missing.length) {
  console.log(`${RK}=FAIL reason=清单点名但盘上没有 ${missing.length} 张，逐条：${missing.slice(0, 5).join(" , ")}`);
  process.exit(1);
}
const strays = readdirSync(FROM).filter((n) => /\.png$/.test(n) && !listed.some((p) => p.endsWith(`/${n}`)));

/* 逐帧哈希：清单里的 contentHash 必须等于搬完后重算的前 16 位 */
const sha16 = (abs) => createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
const bad = [];
for (const r of results) {
  for (const f of r.frames || []) {
    const abs = resolve(REPO, f.path);
    const got = sha16(abs);
    const want = String(f.contentHash || "").slice(0, 16);
    if (!want) bad.push(`${f.path} 清单没有 contentHash`);
    else if (got !== want) bad.push(`${f.path} 清单=${want} 实测=${got}`);
    else if (Number(f.bytes) !== statSync(abs).size) bad.push(`${f.path} 字节数不符 清单=${f.bytes} 实测=${statSync(abs).size}`);
  }
}
if (bad.length) {
  console.log(`${RK}=FAIL reason=哈希/字节不符 ${bad.length} 张 ⇒ 整批不动（对不上就是有人改过证据，不是路径问题）`);
  for (const b of bad.slice(0, 10)) console.log(`RELOCATE_BAD ${b}`);
  process.exit(1);
}
console.log(`${RK}_PRECHECK 帧=${listed.length} 逐张 sha16 与清单一致=是 字节一致=是 清单外平铺件=${strays.length}`);
if (dry) {
  console.log(`${RK}=DRY 目标=${norm(TO)}（--dry 不动盘）`);
  process.exit(0);
}

mkdirSync(TO, { recursive: true });
let moved = 0;
for (const p of listed) {
  const abs = resolve(REPO, p);
  const name = p.split("/").pop();
  const dest = join(TO, name);
  if (existsSync(dest) && sha16(dest) === sha16(abs)) {
    unlinkSync(abs); // 目标已有同名同哈希件 ⇒ 只删源件（幂等：重跑不撞 EEXIST）
    continue;
  }
  if (existsSync(dest)) {
    console.log(`${RK}=FAIL reason=目标已有同名且不同哈希的件 ${norm(dest)} ⇒ 不覆盖别人的证据`);
    process.exit(1);
  }
  renameSync(abs, dest);
  moved++;
}
/* 清单里的 path 前缀做纯字符串搬迁，然后回读校验每张仍在 */
const toRel = norm(TO);
let rewritten = 0;
for (const r of results) {
  for (const f of r.frames || []) {
    if (!f.path) continue;
    const name = f.path.split("/").pop();
    f.path = `${toRel}/${name}`;
    rewritten++;
    if (!existsSync(resolve(REPO, f.path))) {
      console.log(`${RK}=FAIL reason=改完清单后该件读不到 ${f.path}`);
      process.exit(1);
    }
  }
}
j.relocateNote = `本发的帧原平铺在 ${norm(FROM)}（编排方 --out 传错），由 scripts/qa/relocate-sweep-out.mjs 归位；`
  + `搬迁只改 path 前缀，逐帧 sha16 与 bytes 在改前已全量核对一致（${listed.length} 张）。`;
writeFileSync(MAN + ".pre-relocate.json", originalText); // 改前原文留档（不是改后对象的副本）
writeFileSync(MAN, JSON.stringify(j, null, 2));
const dest = join(TO, "sweep-manifest.json");
renameSync(MAN, dest);
console.log(`${RK}=PASS 移动帧=${moved}/${listed.length} 改写 path=${rewritten} 清单→${norm(dest)} 改前清单留档=${norm(MAN + ".pre-relocate.json")}`);
