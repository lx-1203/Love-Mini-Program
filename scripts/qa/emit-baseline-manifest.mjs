#!/usr/bin/env node
/**
 * emit-baseline-manifest.mjs — 理想效果图基准清单（2026-10-24，P1③）
 *
 * 为什么要有这张表：整套保真审查的结论都是"截图 vs 素材/理想效果图/*.png"比出来的。
 * 基准图本身在 git 里只有字节，没有任何一处记录"裁决时依据的是哪一版画面"。
 * 于是有两种坏情况都查不出来：
 *   ① 图被重新生成/覆盖（同名不同字节）→ 后面几轮比的其实不是当初那张图，
 *      而缺陷卡片里只写文件名，跨轮对不上也看不出来；
 *   ② 图被改名或删掉 → ledger 还引用旧名（今天已经为此加了 BASELINE_MISSING 硬门）。
 * 这张清单把 19 张基准图的 sha256 钉进仓库，谁变了、什么时候变的，一次 --check 就能量出来。
 *
 * 哈希口径与 evidence-store.mjs / verify-evidence-corpus.mjs 一致：sha256，卡片里用前 16 位小写。
 *
 * 用法：
 *   node scripts/qa/emit-baseline-manifest.mjs --write    # 按盘上现状重新生成清单
 *   node scripts/qa/emit-baseline-manifest.mjs --check    # 比对清单与盘上字节（默认动作）
 *   node scripts/qa/emit-baseline-manifest.mjs --selftest # 注入四类坏件，每类都要翻红、撤掉翻绿
 * 可选：--dir <目录> --out <清单路径>（自测用临时目录，不碰真素材）
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "BASEMANI_RESULT";

export const hashOf = (p) => {
  const hex = createHash("sha256").update(readFileSync(p)).digest("hex");
  return { sha256: hex, sha16: hex.slice(0, 16) };
};

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);

const BASE_DIR = arg("dir", "素材/理想效果图");
const MANIFEST = resolve(arg("out", join(REPO, "reports/audit/mp-fidelity-2026-10-18/baseline-manifest.json")));

/** 按目录现状生成清单行（只收 .png，排序保证可重复生成字节一致）。 */
export function buildRows(dirAbs) {
  return readdirSync(dirAbs)
    .filter((f) => /\.png$/i.test(f))
    .sort()
    .map((f) => {
      const abs = join(dirAbs, f);
      const { sha256, sha16 } = hashOf(abs);
      return { rel: dirAbs.slice(REPO.length + 1).split(/[\\/]+/).join("/") + "/" + f, sha256, sha16, bytes: statSync(abs).size };
    });
}

/**
 * 清单 vs 盘上现状。返回四类计数，任何一类不匹配都是红：
 *   drift   清单里有、文件也在、字节变了（基准被换掉——最需要当场发现的一类）
 *   missing 清单里有、文件没了
 *   unlisted 盘上有、清单里没有（新增基准没登记，等于给下一轮留了个无人看管的参照物）
 *   ghost   清单里的路径逃出基准目录（防止把 --dir 写错后拿整棵树当基准）
 */
export function checkManifest(manifestAbs, repoAbs = REPO) {
  const m = JSON.parse(readFileSync(manifestAbs, "utf-8"));
  const baseAbs = resolve(repoAbs, m.dir);
  const want = new Map(m.rows.map((r) => [r.rel, r]));
  const out = { match: 0, drift: [], missing: [], unlisted: [], ghost: [], dir: m.dir, rows: m.rows.length };
  for (const r of m.rows) {
    const abs = resolve(repoAbs, r.rel);
    if (!abs.startsWith(baseAbs)) { out.ghost.push(r.rel); continue; }
    if (!existsSync(abs)) { out.missing.push({ rel: r.rel, sha16: r.sha16 }); continue; }
    const now = hashOf(abs);
    if (now.sha256 !== r.sha256) out.drift.push({ rel: r.rel, was: r.sha16, now: now.sha16, wasBytes: r.bytes, nowBytes: statSync(abs).size });
    else out.match++;
  }
  if (existsSync(baseAbs)) {
    for (const f of readdirSync(baseAbs).filter((x) => /\.png$/i.test(x)).sort()) {
      const rel = `${m.dir}/${f}`;
      if (!want.has(rel)) out.unlisted.push(rel);
    }
  }
  return out;
}

/* ---- 自测：四类坏件逐个注入，必须翻红；撤掉必须翻绿 ---- */
if (flag("selftest")) {
  const FX = join(REPO, "tmp", "qa", "fixtures", "basemani");
  rmSync(FX, { recursive: true, force: true });
  mkdirSync(FX, { recursive: true });
  const A = join(FX, "a.png"), B = join(FX, "b.png");
  writeFileSync(A, Buffer.from("89504e470d0a1a01", "hex"));
  writeFileSync(B, Buffer.from("89504e470d0a1a02", "hex"));
  const relOf = (p) => p.slice(REPO.length + 1).split(/[\\/]+/).join("/");
  const fxDirRel = relOf(FX);
  const rowOf = (p) => ({ rel: relOf(p), ...hashOf(p), bytes: statSync(p).size });
  const mp = join(FX, "manifest.json");
  const write = (rows) => writeFileSync(mp, JSON.stringify({ schema: "mp-baseline-manifest/v1", dir: fxDirRel, rows }, null, 2));
  const clean = () => { const r = checkManifest(mp); return r.match === 2 && !r.drift.length && !r.missing.length && !r.unlisted.length && !r.ghost.length; };

  const cases = [
    ["绿：清单与盘一致", () => { write([rowOf(A), rowOf(B)]); return clean(); }, "基准没被人动过"],
    ["红：字节漂移", () => { write([rowOf(A), rowOf(B)]); writeFileSync(A, Buffer.from("89504e470d0a1a99", "hex")); const r = checkManifest(mp); return r.drift.length === 1 && r.drift[0].rel === relOf(A); }, "同名换图必须当场点名"],
    ["红：文件缺失", () => { rmSync(A); write([{ rel: relOf(A), sha256: "0".repeat(64), sha16: "0000000000000000", bytes: 8 }, rowOf(B)]); const r = checkManifest(mp); return r.missing.length === 1 && r.unlisted.length === 0; }, "登记了却读不到（撤掉后 unlisted 归零，证明夹具没漏）"],
    ["红：盘上有、清单没登记", () => { write([rowOf(B)]); const r = checkManifest(mp); return r.unlisted.length === 1 && r.unlisted[0] === relOf(A); }, "新增基准不登记就比图 = 无人看管的参照物"],
    ["红：路径逃出基准目录", () => { write([{ rel: "素材/别的目录/x.png", sha256: "0".repeat(64), sha16: "0000000000000000", bytes: 1 }]); const r = checkManifest(mp); return r.ghost.length === 1; }, "--dir 写错时不许把整棵树当基准"],
  ];
  let ok = 0;
  for (const [name, run, why] of cases) {
    rmSync(FX, { recursive: true, force: true }); mkdirSync(FX, { recursive: true });
    writeFileSync(A, Buffer.from("89504e470d0a1a01", "hex"));
    writeFileSync(B, Buffer.from("89504e470d0a1a02", "hex"));
    let got = false, err = "";
    try { got = run(); } catch (e) { err = String(e).slice(0, 80); }
    ok += got ? 1 : 0;
    console.log(`${got ? "PASS" : "FAIL"}  ${name}  ${why}${err ? " 异常=" + err : ""}`);
  }
  rmSync(FX, { recursive: true, force: true });
  console.log(`\nBASEMANI_SELFTEST=${ok === cases.length ? "PASS" : "FAIL"} ${ok}/${cases.length}（每类红都实注入、撤掉重跑）`);
  console.log(`BASEMANI_SELFTEST_FIXTURE 夹具目录=${fxDirRel}（本轮已清理；跑的是复刻夹具，不是真基准图）`);
  process.exit(ok === cases.length ? 0 : 1);
}

/* ---- --write：按盘上现状生成清单 ---- */
if (flag("write")) {
  const dirAbs = resolve(REPO, BASE_DIR);
  if (!existsSync(dirAbs)) { console.log(`${RK}=NOT-EVIDENCED reason=基准目录读不到 ${BASE_DIR}`); process.exit(2); }
  const rows = buildRows(dirAbs);
  if (!rows.length) { console.log(`${RK}=NOT-EVIDENCED reason=基准目录里没有 .png，写空清单没有意义`); process.exit(2); }
  const json = JSON.stringify({
    schema: "mp-baseline-manifest/v1",
    purpose: "保真审查唯一视觉基准的字节指纹；比图前先看这张表，指纹变了说明比的不是裁决时那张",
    dir: BASE_DIR,
    hash: "sha256",
    generatedAt: new Date().toISOString(),
    rows,
  }, null, 2) + "\n";
  mkdirSync(dirname(MANIFEST), { recursive: true });
  writeFileSync(MANIFEST, json, "utf-8");
  console.log(`${RK}=WRITTEN ${MANIFEST.replace(REPO + "/", "")} 条目=${rows.length} 合计=${rows.reduce((a, r) => a + r.bytes, 0)}B`);
  process.exit(0);
}

/* ---- 默认：--check ---- */
if (!existsSync(MANIFEST)) { console.log(`${RK}=FAIL reason=清单不存在（${MANIFEST.replace(REPO + "/", "")}）——基准图失去指纹锚，先 --write 生成再复核`); process.exit(1); }
const r = checkManifest(MANIFEST);
const bad = r.drift.length + r.missing.length + r.unlisted.length + r.ghost.length;
for (const d of r.drift) console.log(`BASEMANI_DRIFT ${d.rel} 清单=${d.was}(${d.wasBytes}B) 盘上=${d.now}(${d.nowBytes}B) ⇒ 基准图被换过，此前引用它的裁决要重看`);
for (const d of r.missing) console.log(`BASEMANI_MISSING ${d.rel} 清单=${d.sha16} ⇒ 文件不在盘上`);
for (const u of r.unlisted) console.log(`BASEMANI_UNLISTED ${u} ⇒ 盘上有、清单没登记，先 --write`);
for (const g of r.ghost) console.log(`BASEMANI_GHOST ${g} ⇒ 不在基准目录 ${r.dir} 之下，判据不认`);
console.log(`${bad === 0 ? `${RK}=PASS` : `${RK}=FAIL`} 清单条目=${r.rows} 同字节=${r.match} 漂移=${r.drift.length} 缺失=${r.missing.length} 未登记=${r.unlisted.length} 越界=${r.ghost.length}`);
process.exit(bad === 0 ? 0 : 1);
