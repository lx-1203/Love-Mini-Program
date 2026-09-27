#!/usr/bin/env node
/**
 * 给「有采集时间、没有 gitSha」的 corpus 补一个**可追溯来源**的 gitSha。
 *
 * 为什么不是手填：rebuild-frozen-manifest 对 `gitSha=unknown` 的 corpus 直接 KICK（不进权威索引）。
 * 本轮实测有 6 个 round-7 corpus 因此被排除，共 46 张帧 —— 它们是有 generatedAt 的真帧，
 * 只因为当初写盘的腿没记 SHA 就当不了证据。这是"跑了但读不到"的账，不是证据本身有问题。
 *
 * 补法是查历史而不是猜：`git log -1 --before=<generatedAt> --format=%H` 给出**采集那一刻的 HEAD**，
 * 并且把来历一起写进文件（gitShaSource / gitShaCommitDate / gitShaLagSec），
 * 让读权威件的人能看见这个 SHA 是推出来的、推它的证据是什么、差了多少秒。
 *
 * 三条拒绝（宁可继续 KICK 也不写假溯源）：
 *   R1 没有 generatedAt ⇒ 无从推，跳过；
 *   R2 git 里查不到该时间之前的提交 ⇒ 跳过（可能是仓库时钟/浅克隆问题）；
 *   R3 推出来的提交时间**晚于** generatedAt ⇒ 拒绝（那就是猜的）。
 *
 * 用法：node scripts/qa/stamp-orphan-corpora.mjs [--round 7] [--apply] [--max-lag 86400]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const APPLY = argv.includes("--apply");
const ROUND = arg("round", "7");
const MAX_LAG = Number(arg("max-lag", 86400));
const ROOT = join(REPO, "reports", "screenshots");

const problems = [], stamped = [], skipped = [];
for (const name of readdirSync(ROOT)) {
  if (!name.startsWith("round-" + ROUND + "-")) continue;
  const f = join(ROOT, name, "manifest-detail.json");
  if (!existsSync(f)) continue;
  let j; try { j = JSON.parse(readFileSync(f, "utf8")); } catch (e) { skipped.push(`${name}: 不可解析`); continue; }
  const cur = String(j.gitSha || "");
  if (cur && cur !== "unknown") { continue; }
  if (!j.generatedAt) { problems.push(`${name}: gitSha 缺失且没有 generatedAt ⇒ 无法负责任地补，保持 KICK`); continue; }
  const capSec = Date.parse(j.generatedAt) / 1000;
  if (!Number.isFinite(capSec)) { problems.push(`${name}: generatedAt 不是合法时间：${j.generatedAt}`); continue; }
  let out = "";
  try {
    out = execFileSync("git", ["log", "-1", `--before=${Math.floor(capSec)}`, "--format=%H\t%ct", "--", "."],
      { cwd: REPO, encoding: "utf8" }).trim();
  } catch (e) { problems.push(`${name}: git 查询失败 ${String(e.message).slice(0, 60)}`); continue; }
  const [sha, ctStr] = out.split("\t");
  if (!sha) { problems.push(`${name}: 该时间点之前没有任何提交 ⇒ 保持 KICK`); continue; }
  const ct = Number(ctStr);
  const lag = capSec - ct;
  if (lag < 0) { problems.push(`${name}: 推出来的提交比采集时间还新（lag=${lag}s）⇒ 那是猜的，拒绝`); continue; }
  if (lag > MAX_LAG) { problems.push(`${name}: 采集时间距上一个提交 ${Math.round(lag / 3600)} 小时（>${MAX_LAG / 3600}h）⇒ 证据太弱，保持 KICK`); continue; }
  const short = sha.slice(0, 8);
  stamped.push({ name, from: cur, to: short, lagSec: Math.round(lag), shots: (j.shots || []).length });
  if (APPLY) {
    j.gitSha = short;
    j.gitShaSource = "derived:git log -1 --before=generatedAt";
    j.gitShaFull = sha;
    j.gitShaCommitDate = new Date(ct * 1000).toISOString();
    j.gitShaLagSec = Math.round(lag);
    writeFileSync(f, JSON.stringify(j, null, 1));
  }
}

console.log(`STAMP round=${ROUND} 可补=${stamped.length} 帧数合计=${stamped.reduce((a, s) => a + s.shots, 0)} ${APPLY ? "--apply（已写盘）" : "DRY（未写盘）"}`);
for (const s of stamped) console.log(`  ${s.name}: ${s.from} → ${s.to}（采集晚于该提交 ${s.lagSec}s，${s.shots} 帧）`);
for (const p of problems) console.log("  ✗ " + p);
for (const s of skipped) console.log("  · " + s);
if (problems.length && !stamped.length) process.exit(2);
console.log(APPLY ? `STAMP_RESULT=OK stamped=${stamped.length}` : `STAMP_RESULT=DRY stamped=${stamped.length} problems=${problems.length}`);
