#!/usr/bin/env node
/** 处理"同一 corpus 目录被后来的取景覆盖"这种情况：把字节已经变掉的条目从 shots[] 移到 stateNotApplied[]，
 *  而不是把新字节的哈希回填进 shots[] 假装它还是原证据。
 *
 * 触发这件事的实测事实（`reports/screenshots/round-7-uidebt-1a1df78b`）：
 *   manifest 的 generatedAt / 每条 shot 的 at = 2026-09-26T11:27:46Z（本地 19:27），
 *   而其中 5 个 .png 的 mtime 落在本地 20:31~20:38 —— 晚于索引 1 小时，
 *   并且重拍后**两两同字节**（MATCHING-001 与 MATCHING-016 同为 f22b30aa…，
 *   LOGIN-INDEX-001 与 -007 同为 ba53e382…）⇒ 同一状态被登记成两条不同判据的证据。
 *   权威索引生成器 `rebuild-frozen-manifest.mjs` 的自证因此 FAIL 5 条、一个字节都不写。
 *
 * 为什么选"移出去"而不是"改哈希"：把新哈希写回 shots[] 等于用一次没有配文的取景
 * 悄悄替换掉旧判据的证据，读者无从分辨 —— 那是目标明令禁止的"重打戳洗绿"。
 * 移进 stateNotApplied[] 保留原哈希（supersededHash）、写明新字节与 mtime 与孪生对，
 * 判据要恢复只能重拍，账是清的。
 *
 * 用法：node scripts/qa/repair-corpus-rehash.mjs --corpus reports/screenshots/<dir> [--dry|--apply]
 */
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const relPosix = (p) => relative(REPO, p).split(sep).join("/");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const APPLY = argv.includes("--apply");
const DIR = resolve(REPO, arg("corpus", ""));
const MF = join(DIR, "manifest-detail.json");
if (!DIR || !existsSync(MF)) { console.log("REPAIR_RESULT=FAIL reason=缺 --corpus 或该目录没有 manifest-detail.json"); process.exit(2); }

const j = JSON.parse(readFileSync(MF, "utf8"));
if (!Array.isArray(j.shots) || !j.shots.length) { console.log("REPAIR_RESULT=FAIL reason=shots 为空，没有可核的账"); process.exit(2); }

const now = new Date().toISOString();
const kept = [], moved = [], bad = [];
const newHashByName = new Map();
for (const s of j.shots) {
  const abs = resolve(REPO, s.path);
  if (!existsSync(abs)) { bad.push("文件不在盘上：" + s.path); continue; }
  const st = statSync(abs);
  const h = createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
  newHashByName.set(s.path, h);
  if (h === s.contentHash && st.size === s.bytes) { kept.push(s); continue; }
  const why = [];
  if (h !== s.contentHash) why.push("哈希不符 记=" + s.contentHash + " 实=" + h);
  if (st.size !== s.bytes) why.push("字节不符 记=" + s.bytes + " 实=" + st.size);
  moved.push(Object.assign({}, s, {
    retroactive: true,
    supersededHash: s.contentHash,
    supersededBytes: s.bytes,
    currentContentHash: h,
    currentBytes: st.size,
    fileMtime: new Date(st.mtime).toISOString(),
    movedAt: now,
    movedBy: "scripts/qa/repair-corpus-rehash.mjs",
    stateApplied: false,
    movedReason: why.join("；") + " ⇒ 采集时刻的字节已被后续取景覆盖，本帧不能再作为该判据的证据（要恢复只能重拍）",
  }));
}

/* 孪生：同一 corpus 里"移出去的那批"若彼此同字节，说明一次状态被记成了两条独立证据；
   写进 reason 里，免得下一轮把它们当成两张不同的图复用。 */
const byHash = new Map();
for (const m of moved) {
  const arr = byHash.get(m.currentContentHash) || [];
  arr.push(m.path.split("/").pop());
  byHash.set(m.currentContentHash, arr);
}
for (const m of moved) {
  const twins = (byHash.get(m.currentContentHash) || []).filter((p) => p !== m.path.split("/").pop());
  if (twins.length) m.movedReason += "；同 corpus 内同字节孪生=" + twins.join(",");
}

const before = j.shots.length;
console.log(`REPAIR corpus=${relPosix(DIR)} 原 shots=${before} 保持=${kept.length} 移出=${moved.length} 读盘失败=${bad.length}`);
for (const m of moved) console.log("  MOVED " + m.path.split("/").pop() + " :: " + m.movedReason.slice(0, 150));
if (kept.length + moved.length + bad.length !== before) bad.push("守恒不成立：keep+moved+bad ≠ 原 shots");
if (moved.length && !moved.every((m) => m.movedReason && m.supersededHash)) bad.push("有移出条目缺原因或原哈希");
if (bad.length) { console.log("REPAIR_RESULT=FAIL reason=" + bad.join(" / ")); process.exit(2); }
if (APPLY) {
  writeFileSync(MF + ".pre-rehash.bak", JSON.stringify(j, null, 1) + "\n", "utf8");
  j.shots = kept;
  j.stateNotApplied = (j.stateNotApplied || []).concat(moved);
  j.rehashRepair = { at: now, tool: "scripts/qa/repair-corpus-rehash.mjs", moved: moved.length, kept: kept.length, note: "移出而非改哈希的理由见脚本头注；原哈希在每条 moved 项的 supersededHash 上" };
  writeFileSync(MF, JSON.stringify(j, null, 1) + "\n", "utf8");
  console.log(`REPAIR_WRITTEN=${relPosix(MF)}（备份 manifest-detail.json.pre-rehash.bak）`);
  console.log(`REPAIR_RESULT=OK moved=${moved.length}`);
  process.exit(0);
}
console.log("REPAIR_RESULT=DRY 加 --apply 才写盘");
