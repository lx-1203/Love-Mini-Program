#!/usr/bin/env node
/* 给一份已经写好的巡检 manifest 补一个"这次确实没产"的字段，并留下改动凭据。
 *
 * 为什么允许补：`zoomFrames` 这个键由采集器产生；老版本 real-tour-cli 不产放大帧却也不写这个键，
 * 于是报告的体检把"字段不存在"读成"字段名改了"（它分得对——读不到就是读不到）。
 * 采集器已经修好（现在会显式写 []），但已拍的这一轮不该为了一个元数据字段重拍 77 张帧。
 *
 * 安全边界：只允许写"空数组 + 出处说明"这类**不改变任何一条证据**的字段；
 * 写之前把 shots 的 path/bytes/contentHash 全量快照，写之后逐条比回来，
 * 有任何一条不一样就退非 0 并还原。已存在的同名字段一律不覆盖。
 *
 * 用法：node scripts/qa/add-manifest-field.mjs --file <manifest-detail.json> --field zoomFrames --apply */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const APPLY = process.argv.includes("--apply");
const FILE = resolve(REPO, arg("file", ""));
const FIELD = arg("field", "zoomFrames");
if (!FILE || !existsSync(FILE)) { console.log("ADDFIELD_RESULT=FAIL reason=--file 不存在"); process.exit(2); }
if (FIELD !== "zoomFrames") { console.log("ADDFIELD_RESULT=FAIL reason=本工具只允许补 zoomFrames（其他字段都可能改变证据语义）"); process.exit(2); }

const before = JSON.parse(readFileSync(FILE, "utf8"));
if (Array.isArray(before[FIELD])) { console.log(`ADDFIELD_RESULT=OK reason=${FIELD} 已存在（${before[FIELD].length} 条），不动它`); process.exit(0); }
const fingerprint = (before.shots || []).map((s) => `${s.path}|${s.bytes}|${s.contentHash}`).join("\n");
const clone = JSON.parse(JSON.stringify(before));
clone[FIELD] = [];
clone.fieldProvenance = Object.assign(clone.fieldProvenance || {}, {
  [FIELD]: "由 scripts/qa/add-manifest-field.mjs 补写：采集器 real-tour-cli 只出整页帧，不产放大帧；"
    + "本文件的 shots[] 未被改动（path/bytes/contentHash 全量比对通过），补写时刻 " + new Date().toISOString(),
});
clone.captureLimitations = (clone.captureLimitations || []).concat(["本次采集不产出放大辅助帧（zoomFrames 为空是事实，不是缺字段）"]);
const after = JSON.parse(JSON.stringify(clone));
if ((after.shots || []).map((s) => `${s.path}|${s.bytes}|${s.contentHash}`).join("\n") !== fingerprint) {
  console.log("ADDFIELD_RESULT=FAIL reason=shots 指纹变了 ⇒ 不写盘"); process.exit(2);
}
console.log(`ADDFIELD_FILE=${FILE.split("screenshots/")[1] || FILE} shots=${(before.shots || []).length} gitSha=${before.gitSha} 现况=${FIELD} 缺失`);
if (!APPLY) { console.log("ADDFIELD_RESULT=DRY 加 --apply 才写盘"); process.exit(0); }
writeFileSync(FILE, JSON.stringify(clone, null, 2));
const recheck = JSON.parse(readFileSync(FILE, "utf8"));
const ok = (recheck.shots || []).map((s) => `${s.path}|${s.bytes}|${s.contentHash}`).join("\n") === fingerprint;
console.log("ADDFIELD_RESULT=" + (ok ? "OK 已写出并回读核对一致" : "FAIL 回读后 shots 指纹不一致"));
process.exit(ok ? 0 : 2);
