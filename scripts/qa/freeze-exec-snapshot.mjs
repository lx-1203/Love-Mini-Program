#!/usr/bin/env node
/* 把某一份 exec-results 冻结成"重建前的被测物快照"，给终报的 A/B 两侧分界用。
 *
 * 为什么要有这个载体而不是手抄 cp：round-7 跑到出报告这一步才发现
 * `.zcode/tmp/round7-exec/` 根本不存在——冻结这一步在这一轮里从来没被执行过，
 * 于是终报的必需源体检直接失败（EMIT_RESULT=FAIL）。缺的不是文件，是"谁来产生它"。
 *
 * 冻结不许改内容：原样复制 + 文件名带源文件 sha256 前 12 位。
 * 源文件没有真实 gitSha（"unknown"/缺字段）时拒绝冻结——无戳的快照会被下游按带戳的构建读取。
 *
 * 用法：node scripts/qa/freeze-exec-snapshot.mjs --src <exec-results.json> [--round 7]
 *                                             [--dst-dir .zcode/tmp/round<N>-exec]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, basename } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const SRC = resolve(REPO, arg("src", ""));
if (!SRC || !existsSync(SRC)) { console.log("FZ_RESULT=FAIL reason=缺 --src 或文件不存在"); process.exit(2); }
const ROUND = arg("round", (basename(SRC).match(/round-(\d+)/) || [])[1] || "6");
const DST_DIR = resolve(REPO, arg("dst-dir", ".zcode/tmp/round" + ROUND + "-exec"));

const buf = readFileSync(SRC);
const j = JSON.parse(buf.toString("utf8"));
const sha = String(j.gitSha || "");
if (!sha || sha === "unknown") { console.log("FZ_RESULT=FAIL reason=源文件没有真实 gitSha（" + (sha || "空") + "），无戳快照会被下游当成有戳构建读"); process.exit(2); }
const rows = (j.results || j.rows || []);
if (!rows.length) { console.log("FZ_RESULT=FAIL reason=源文件 0 行，空快照不能当冻结"); process.exit(2); }

const digest = createHash("sha256").update(buf).digest("hex").slice(0, 12);
const DST = join(DST_DIR, "exec-results.snapshot-" + digest + ".json");
mkdirSync(DST_DIR, { recursive: true });
if (existsSync(DST) && statSync(DST).size === buf.length) {
  console.log("FZ_RESULT=SKIP 同内容快照已在 " + DST.replace(REPO.split("\\").join("/") + "/", ""));
  process.exit(0);
}
copyFileSync(SRC, DST);
console.log("FZ_SRC=" + SRC.replace(REPO.split("\\").join("/") + "/", "") + " gitSha=" + sha + " rows=" + rows.length);
console.log("FZ_WRITTEN=" + DST.replace(REPO.split("\\").join("/") + "/") + " sha256[:12]=" + digest);
console.log("FZ_RESULT=OK");
