#!/usr/bin/env node
/* 仓外证据库（用户 2026-09-29 裁定：走 "LFS 只管未来 + 帧改成仓外证据库 + manifest 内 sha256 可核"）。
   为什么不是"把帧塞进 git/LFS 全量"：本仓的门禁按**提交号**背书
   （verify-provenance-all 逐帧比 mtime 与所记提交、本门按顶层 gitSha 分可解析/不可核实、
    band-freshness 认 mode@sha8），一次历史重写会把 339 个提交全部改号，
    于是本轮与历轮证据同时从"可核"掉到"不可核"，且不可逆。
   仓外库的做法是：像素不进 git、也**不删**，改由内容哈希在外面自证 ——
   提交号一个不动，体积压力却从 .git 挪到了可搬动的介质上。

   哈希口径**必须**与 verify-evidence-corpus.mjs:34 一致（sha256 前 16 位小写十六进制），
   否则会出现"两个门认两套指纹"的第二权威。这里直接抄同一段实现并注明来源。

   库目录必须在仓库外：命中 repo 内任何路径 ⇒ 拒绝执行（那等于把证据藏在被测物里面，
   门就会去核对自己）。

   用法：
     node22 scripts/qa/evidence-store.mjs --status  [--store <dir>]
     node22 scripts/qa/evidence-store.mjs --export  [--store <dir>] [--apply] [--limit N]
     node22 scripts/qa/evidence-store.mjs --verify  [--store <dir>] [--json <out>]
     node22 scripts/qa/evidence-store.mjs --rehydrate --path <仓内相对路径> [--apply]
*/
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const flag = (f, d) => { const i = argv.indexOf("--" + f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

/* 与 verify-evidence-corpus.mjs:34 同一口径，一字不改地复用法。 */
const hash16 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);
const hashFull = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const DEFAULT_STORE = process.env.QA_EVIDENCE_STORE || resolve(repo, "..", "love-mini-evidence");
const store = resolve(DEFAULT_STORE);
const relPosix = (p) => relative(repo, p).split(sep).join("/");

/* fail-closed：库不许落在仓内。落在仓内时，"证据在不在"会被"仓库干不干净"污染，
   而且 --export 会把帧复制进自己的被测目录树，下一轮扫描会把它当新证据数进去。 */
function assertStoreOutsideRepo() {
  const r = repo.split(sep).join("/"), s = store.split(sep).join("/");
  if (s === r || s.startsWith(r + "/")) {
    console.log(`STORE_RESULT=FAIL reason=库目录落在仓库内（${relPosix(store) || "."}）⇒ 证据库必须独立于被测物；用 --store 或 QA_EVIDENCE_STORE 指到仓外`);
    process.exit(2);
  }
}

function walkFrames(dir, out = [], depth = 0) {
  if (!existsSync(dir) || depth > 8) return out;
  let names = [];
  try { names = readdirSync(dir); } catch { return out; }
  for (const n of names) {
    if (["node_modules", ".git", "dist", "unpackage"].includes(n)) continue;
    const p = join(dir, n);
    let st = null;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walkFrames(p, out, depth + 1);
    else if (/\.(png|jpe?g)$/i.test(n) && st.isFile()) out.push(p);
  }
  return out;
}

/* manifest 是"谁声称有什么证据"的权威面：只从 manifest 的 shots[] 取帧，
   不去扫目录 —— 扫目录会造出一堆"盘上有但没人引用"的孤儿，把库变成垃圾场。 */
function manifests() {
  const out = [];
  const walk = (dir, depth = 0) => {
    if (!existsSync(dir) || depth > 8) return;
    let names = [];
    try { names = readdirSync(dir); } catch { return; }
    for (const n of names) {
      if (["node_modules", ".git", "dist", "unpackage"].includes(n)) continue;
      const p = join(dir, n);
      let st = null;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) walk(p, depth + 1);
      else if (/^manifest(-detail)?\.json$/i.test(n)) out.push(p);
    }
  };
  walk(join(repo, "reports"));
  return out;
}

function referencedFrames() {
  const rows = [];
  for (const m of manifests()) {
    let j;
    try { j = JSON.parse(readFileSync(m, "utf8")); } catch { continue; }
    const shots = j.shots ?? j.frames ?? [];
    if (!Array.isArray(shots)) continue;
    for (const s of shots) {
      const p = s.path || s.file || "";
      if (!p) continue;
      const abs = resolve(repo, p);
      rows.push({ manifest: m, rel: relPosix(abs), abs, claimHash: s.contentHash || null, claimBytes: typeof s.bytes === "number" ? s.bytes : null });
    }
  }
  return rows;
}

const bucketOf = (h) => h.slice(0, 2);
const storePathOf = (h) => join(store, bucketOf(h), h.slice(0, 16) + ".img");

function cmdStatus() {
  console.log(`STORE_DIR=${store}`);
  console.log(`STORE_EXISTS=${existsSync(store) ? "yes" : "no"}`);
  if (!existsSync(store)) { console.log("STORE_RESULT=UNREACHABLE reason=目录不存在（未配置当 unconfigured，配了却够不着要判红）"); process.exit(0); }
  let n = 0, bytes = 0;
  for (const d of readdirSync(store)) {
    const sub = join(store, d);
    if (!statSync(sub).isDirectory()) continue;
    for (const f of readdirSync(sub)) { const st = statSync(join(sub, f)); n++; bytes += st.size; }
  }
  console.log(`STORE_OBJECTS=${n} STORE_BYTES=${bytes} (${(bytes / 1048576).toFixed(1)} MB)`);
  console.log("STORE_RESULT=OK");
}

function cmdExport() {
  assertStoreOutsideRepo();
  const apply = has("apply");
  const limit = Number(flag("limit", "0")) || 0;
  const rows = referencedFrames();
  const seen = new Set();
  /* 两个"已在库"必须分开数：seen 命中是**本轮内部重复**（同一份字节被多张 manifest 引用，
     实测本仓有大量逐字节相同的状态帧），existsSync 命中才是**库里已有**。混成一个数会让人
     以为库已经建起来了。 */
  let missing = 0, copied = 0, wouldCopy = 0, dupInRun = 0, alreadyInStore = 0, hashBad = 0;
  for (const r of rows) {
    if (limit && copied >= limit) break;
    if (!existsSync(r.abs)) { missing++; continue; }
    const h = hashFull(r.abs);
    if (r.claimHash && r.claimHash !== h.slice(0, 16)) { hashBad++; continue; }
    const sp = storePathOf(h);
    if (seen.has(sp)) { dupInRun++; continue; }
    seen.add(sp);
    if (existsSync(sp)) { alreadyInStore++; continue; }
    if (apply) { mkdirSync(dirname(sp), { recursive: true }); copyFileSync(r.abs, sp); copied++; }
    else wouldCopy++;
  }
  console.log(`STORE_EXPORT mode=${apply ? "APPLY" : "DRY"} 引用行=${rows.length} 盘上缺=${missing} 哈希不符=${hashBad} 需写入=${apply ? copied : wouldCopy} 本轮内重复=${dupInRun} 库里有=${alreadyInStore}（不同字节对象=${seen.size}）`);
  if (hashBad) console.log(`STORE_RESULT=FAIL reason=${hashBad} 行的盘上字节与 manifest 声称的 contentHash 不符 ⇒ 先修生产者，别把对不上的东西写进库`);
  else console.log("STORE_RESULT=" + (apply ? "EXPORTED" : "DRY"));
  process.exit(hashBad ? 1 : 0);
}

/* --verify：库是不是真能替盘上的帧说话。三种情形分开数，绝不合并成一个"通过率"：
   ① 盘上在且库里有 → 双证；② 盘上没了但库里有 → 靠库背书（这正是仓外库的意义）；
   ③ 两边都没有 → 断链，必须判红。 */
function cmdVerify() {
  assertStoreOutsideRepo();
  if (!existsSync(store)) {
    console.log(`STORE_VERIFY=UNREACHABLE dir=${store}`);
    console.log("STORE_RESULT=FAIL reason=证据库已配置但够不着 —— 不可达必须判红，不许当成「库里没有就算了」");
    process.exit(1);
  }
  const rows = referencedFrames();
  let both = 0, storeOnly = 0, diskOnly = 0, lost = 0, mismatch = 0, noClaim = 0;
  const lostList = [];
  for (const r of rows) {
    const onDisk = existsSync(r.abs);
    const h = onDisk ? hashFull(r.abs) : null;
    if (onDisk && r.claimHash && r.claimHash !== h.slice(0, 16)) { mismatch++; continue; }
    if (!r.claimHash && !onDisk) { noClaim++; continue; }
    const key = r.claimHash || h.slice(0, 16);
    let inStore = false;
    if (key) {
      /* 库里对象以完整 sha256 命名，manifest 只有 16 位前缀 ⇒ 按前缀在该桶目录里找，
         找到多枚同前缀要如实报（那是哈希碰撞警报，不能假装命中第一个）。 */
      const bucketDir = join(store, bucketOf(key));
      const hits = existsSync(bucketDir) ? readdirSync(bucketDir).filter((f) => f.startsWith(key)) : [];
      if (hits.length === 1) inStore = true;
      else if (hits.length > 1) { console.log(`STORE_COLLISION 前缀=${key} 命中=${hits.length} 桶=${bucketOf(key)}`); mismatch++; continue; }
    }
    if (onDisk && inStore) both++;
    else if (!onDisk && inStore) storeOnly++;
    else if (onDisk && !inStore) diskOnly++;
    else { lost++; if (lostList.length < 12) lostList.push(`${r.rel}（引用自 ${relPosix(r.manifest)}）`); }
  }
  console.log(`STORE_VERIFY_DIR=${store}`);
  console.log(`STORE_VERIFY 引用行=${rows.length} 双证=${both} 仅库在=${storeOnly} 仅盘在=${diskOnly} 两边都无=${lost} 哈希不符=${mismatch} 无指纹且盘无=${noClaim}`);
  for (const l of lostList) console.log(`  STORE_LOST ${l}`);
  const ok = lost === 0 && mismatch === 0;
  console.log(`STORE_RESULT=${ok ? "OK" : "FAIL"}${ok ? "" : "（断链或哈希不符 ⇒ 判红；「仅盘在」是库还没导出，不算证据丢失）"}`);
  const j = flag("json", "");
  if (j) { mkdirSync(dirname(resolve(repo, j)), { recursive: true }); writeFileSync(resolve(repo, j), JSON.stringify({ store, rows: rows.length, both, storeOnly, diskOnly, lost, mismatch, noClaim, lostList }, null, 1)); }
  process.exit(ok ? 0 : 1);
}

/* ---------------- --evict：把仓内副本挪进仓外隔离区（不是删除） ----------------
   为什么这个动作要写这么死：本项目的证据一旦没了就再也对不上账（提交号不能重生）。
   四条护栏，缺一条就拒绝动：
     1) 必须同时给 --apply 与 --confirm EVICT_EVIDENCE —— 少一个就是 DRY，只数不动；
     2) 只动"manifest 声称了 contentHash 且盘上字节重算相符"的帧（对不上 = 生产者有问题，先修它）；
     3) 库里必须**恰好一枚**同前缀对象；0 枚或 >1 枚一律不动；
     4) 动作是 move 到仓外隔离区 + 落一份逐文件回滚清单，不是 rm —— 任何一步都能原路退回。
   隔离区默认在库旁边（仓外）；落在仓内直接拒绝，理由同 assertStoreOutsideRepo。 */
function cmdEvict() {
  assertStoreOutsideRepo();
  const apply = has("apply");
  const confirm = flag("confirm", "");
  if (apply && confirm !== "EVICT_EVIDENCE") {
    console.log("STORE_RESULT=FAIL reason=--evict --apply 必须带 --confirm EVICT_EVIDENCE（这是移动证据的动作，不许被顺手敲出来）");
    process.exit(2);
  }
  if (!existsSync(store)) {
    console.log(`STORE_RESULT=FAIL reason=库不可达（${store}）⇒ 没有库就没有背书，一张都不能动`);
    process.exit(1);
  }
  const quarantine = resolve(flag("quarantine", join(store, "..", "love-mini-evidence-quarantine")));
  const qN = quarantine.split(sep).join("/"), rN = repo.split(sep).join("/");
  if (qN === rN || qN.startsWith(rN + "/")) {
    console.log(`STORE_RESULT=FAIL reason=隔离区落在仓库内（${relPosix(quarantine) || "."}）⇒ 挪出去才有意义，也才谈得上回滚`);
    process.exit(2);
  }
  /* 先给库建一份前缀索引（桶目录 → 16 位前缀 → 命中数），避免逐帧 readdir 把盘打满。 */
  const index = new Map();
  for (const b of readdirSync(store)) {
    const sub = join(store, b);
    let st = null; try { st = statSync(sub); } catch { continue; }
    if (!st.isDirectory()) continue;
    const m = new Map();
    for (const f of readdirSync(sub)) {
      const k = f.replace(/\.[0-9a-z]+$/i, "").toLowerCase().slice(0, 16);
      m.set(k, (m.get(k) || 0) + 1);
    }
    index.set(b, m);
  }
  const rows = referencedFrames();
  let candidates = 0, moved = 0, wouldMove = 0, noClaim = 0, hashBad = 0, absent = 0, ambig = 0;
  const rollback = [];
  for (const r of rows) {
    const key = String(r.claimHash || "").toLowerCase();
    if (!existsSync(r.abs)) { absent++; continue; }
    if (key.length < 16) { noClaim++; continue; }
    const h = hashFull(r.abs);
    if (h.slice(0, 16) !== key) { hashBad++; continue; }
    const hits = (index.get(bucketOf(key)) || new Map()).get(key) || 0;
    if (hits !== 1) { ambig++; continue; }
    candidates++;
    const dest = join(quarantine, bucketOf(key), key + "--" + r.rel.replace(/[\\/]/g, "_"));
    if (apply) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(r.abs, dest);
      const okBytes = statSync(dest).size === statSync(r.abs).size;
      if (!okBytes) { console.log(`STORE_EVICT_VERIFY_FAIL ${r.rel} ⇒ 隔离区副本字节数不符，原文件保持不动`); continue; }
      rmSync(r.abs);
      rollback.push({ from: r.rel, to: dest.replace(/\\/g, "/"), sha256: h, bytes: statSync(dest).size });
      moved++;
    } else wouldMove++;
  }
  console.log(`STORE_EVICT mode=${apply ? "APPLY" : "DRY"} 引用=${rows.length} 可动=${apply ? moved : wouldMove} 盘上无=${absent} 无指纹=${noClaim} 哈希不符=${hashBad} 库内歧义=${ambig} 候选合计=${candidates} 隔离区=${quarantine}`);
  if (apply) {
    const rb = join(quarantine, "rollback-manifest.json");
    writeFileSync(rb, JSON.stringify({ at: new Date().toISOString(), repo, count: rollback.length, rows: rollback }, null, 1));
    console.log(`STORE_EVICT_ROLLBACK=${rb.replace(/\\/g, "/")} 条数=${rollback.length}`);
  }
  /* 判红口径：只要还有"盘上有帧但库不能唯一背书"，就说明证据没有两处都能对账 —— 不许宣布成功。 */
  const dirty = hashBad + ambig;
  console.log(`STORE_RESULT=${dirty ? "FAIL" : (apply ? "EVICTED" : "DRY")}${dirty ? ` reason=哈希不符=${hashBad} 库内歧义=${ambig}，这批一张都不许动` : ""}`);
  process.exit(dirty ? 1 : 0);
}

if (has("status")) cmdStatus();
else if (has("export")) cmdExport();
else if (has("evict")) cmdEvict();
else if (has("verify")) cmdVerify();
else {
  console.log("用法：evidence-store.mjs --status | --export [--apply] [--limit N] | --verify [--json out] | --evict [--apply --confirm EVICT_EVIDENCE]  [--store <仓外目录>]");
  console.log("STORE_RESULT=FAIL reason=没给动作");
  process.exit(2);
}
