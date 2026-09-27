/**
 * 重建本轮**权威**证据索引 `reports/audit/<round>/screenshot-manifest.json`。
 *
 * 为什么要有这个脚本（本轮实测的两起事故，坏的都是权威件自己）：
 *  1. 子集覆盖：`TOUR_LABEL=round-6-tour-dupfix` 那一跑只有 27 张帧，却照样把权威件写成 27 条
 *     （27 条全指向 dupfix 目录）⇒ 本轮 263 张主帧 + 336 张裁切帧在权威索引里**一条都不存在**，
 *     完整性门禁据此报 `ORPHANS=599`。写侧已在 tour-r6.mjs 加了帧数护栏，这里补读侧的恢复手段。
 *  2. 索引散在多个 corpus 里：旧消费方（DW A3 校 gitSha、A6 三源对照、scribe 按 path 列清单）
 *     只认 `screenshot-manifest.json` 这一个文件名，所以权威件必须是**全轮**索引，不能是某个 corpus 的副本。
 *
 * 它做三件事，其中**一件都不碰像素**：
 *   a. 按 corpus 汇总 shots / zoomFrames / stateNotApplied / routeDrifts（每条带 corpus+sourceManifest）；
 *   b. 把「本页同字节的后到帧」按**现行采集规则**（与同页已落盘帧比，而不是只比前一帧）追溯改判出 shots[]，
 *      进 stateNotApplied[]，条目上写清 `retroactive:true` 与采集当时的判定值 —— 这是"改判证据"不是"重拍证据"；
 *      每个 corpus 内部独立改判，**跨 corpus 不并池**（不同构建、不同时刻的同字节是两回事）。
 *   c. 落盘前自证：逐条 `statSync` + 重算 sha256 前 16 位与记录值比对，任一条不符就**不写**。
 *
 * 原始 corpus 的 manifest-detail.json 一律**不动**：它们是采集时刻的原始记录，
 * 权威索引是消费方读的那一份。
 * 用法：node scripts/qa/rebuild-frozen-manifest.mjs --round 6 [--dry]
 * 退出码：0=写出（或 --dry 且自证全过），1=拒绝（输入缺失/戳记不一致/自证不过）。
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname, relative, sep } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DRY = process.argv.includes("--dry");
const ROUND = arg("round", "6");
const SCREEN_ROOT = join(REPO, "reports", "screenshots");
const AUDIT_DIR = join(REPO, "reports", "audit", "round-" + ROUND);
const OUT = join(AUDIT_DIR, "screenshot-manifest.json");
const rel = (p) => relative(REPO, p).split(sep).join("/");
const hash16 = (abs) => createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
function fail(msg) { console.log("UNION_RESULT=FAIL reason=" + msg); process.exit(1); }

/* ---- 1. 收齐本轮各 corpus 的采集明细（只认 corpus 自己的 manifest-detail.json，
          不把可能被写坏的权威件当输入，免得坏索引自我复制） ---- */
if (!existsSync(SCREEN_ROOT)) fail("找不到 " + rel(SCREEN_ROOT));
const corpora = [];
for (const name of readdirSync(SCREEN_ROOT).sort()) {
  if (!name.startsWith("round-" + ROUND + "-")) continue;
  const mp = join(SCREEN_ROOT, name, "manifest-detail.json");
  if (!existsSync(mp)) { console.log(`SKIP ${name}（无 manifest-detail.json，不进权威索引）`); continue; }
  let j; try { j = JSON.parse(readFileSync(mp, "utf8")); } catch (e) { fail(`${name} manifest 解析失败：${e.message}`); }
  if (!Array.isArray(j.shots) || !j.shots.length) { console.log(`SKIP ${name}（shots 为空）`); continue; }
  corpora.push({ name, manifest: rel(mp), j });
}
if (!corpora.length) fail("一个 corpus 都没收到（扫描集为空不得写出权威件）");

/* ---- 2. 戳记一致才许并池；本轮 HEAD 中途前进过（别的会话提交），于是一轮之内本来就有几个构建带。
          `--allow-bands` 不是放宽判据：每个 corpus 仍必须自带真实 gitSha（unknown / 缺戳一律踢出并点名），
          权威件里逐条记下自己属于哪个带，读者看得见"这条结论绑的是哪个构建"。
          缺了这个模式，一轮就只能存在单一戳——那会逼人给旧帧补新 SHA，等于伪造溯源。 ---- */
const ALLOW_BANDS = process.argv.includes("--allow-bands");
const noStamp = corpora.filter((c) => !c.j.gitSha || String(c.j.gitSha) === "unknown");
for (const c of noStamp) console.log(`KICK ${c.name}（无真实 gitSha，不进任何带）`);
const stamped = corpora.filter((c) => c.j.gitSha && String(c.j.gitSha) !== "unknown");
corpora.length = 0; corpora.push(...stamped);   /* 下游一律只看带戳的 corpus，缺戳的已按 KICK 点名 */
if (!stamped.length) fail("所有 corpus 都缺真实戳记，写不出权威索引");
const shas = [...new Set(stamped.map((c) => c.j.gitSha))];
if (shas.length > 1 && !ALLOW_BANDS) fail("corpus 的 gitSha 不一致（一轮多个构建带请加 --allow-bands；缺戳的先按 KICK 行修）：" + shas.join(","));
if (noStamp.length && !ALLOW_BANDS) fail("有 corpus 缺戳：" + noStamp.map((c) => c.name).join(","));
/* 多带模式下顶层 gitSha 必须仍是一个**真 SHA**：下游有一堆工具拿它去 `git rev-parse`/比对 HEAD，
   给它 "bands:a,b,c" 这种自造串会让它们报 invalid object name（实测），而"哪个带是主带"本来就该写清楚：
   当前 HEAD 所在的那个带优先，否则取帧数最多的那个带；完整列表进 gitShaBands[]。 */
let HEAD_SHORT = "";
try { HEAD_SHORT = execSync("git rev-parse --short HEAD", { cwd: REPO, encoding: "utf8" }).trim(); } catch { /* 取不到 HEAD 就退回首带，不影响写出 */ }
const BAND_COUNT = {};
for (const c of corpora) BAND_COUNT[c.j.gitSha] = (BAND_COUNT[c.j.gitSha] || 0) + (c.j.shots || []).length;
const GIT_SHA = shas.includes(HEAD_SHORT) ? HEAD_SHORT : shas.slice().sort((a, b) => (BAND_COUNT[b] || 0) - (BAND_COUNT[a] || 0))[0];
if (ALLOW_BANDS && shas.length > 1) {
  console.log("UNION_BANDS=" + shas.length + " " + shas.map((s) => s + "=" + stamped.filter((c) => c.j.gitSha === s).map((c) => c.name).join("/")).join("  "));
  if (noStamp.length) console.log("UNION_KICKED=" + noStamp.length + "（这些目录的帧不进本轮权威索引）");
}
const buildModes = [...new Set(corpora.map((c) => c.j.buildMode || "(未记)"))];

/* ---- 3. 汇总 + 追溯改判 ---- */
const shots = [], zoomFrames = [], stateNotApplied = [], routeDrifts = [], moved = [];
const kept = {}, movedByCorpus = {}, snaFromCapture = {}, byIdentity = {};
for (const c of corpora) {
  kept[c.name] = 0; movedByCorpus[c.name] = 0;
  snaFromCapture[c.name] = (c.j.stateNotApplied || []).length;
  const pool = new Map();                       // (identity::page) -> [{state, contentHash}]
  for (const s of c.j.shots) {
    const key = `${s.identity || "?"}::${s.page || "?"}`;
    const seen = pool.get(key) || [];
    const same = s.contentHash ? seen.find((p) => p.contentHash === s.contentHash) : null;
    if (same) {
      moved.push(Object.assign({}, s, {
        at: new Date().toISOString(), suite: s.suite || "REAL", corpus: c.name, sourceManifest: c.manifest,
        reason: `retroactive-state-not-applied: 「${s.state}」与本页已落盘帧「${same.state}」字节完全相同`
          + `（sha256:${s.contentHash}，同图帧=${same.state}）；采集当时记为 stateFrame=${s.stateFrame === true}`
          + `/countsTowardStateQuota=${s.countsTowardStateQuota !== false}`,
        action: "state-not-applied", retroactive: true, dupOf: same.state,
        captureTimeVerdict: { stateFrame: s.stateFrame === true, countsTowardStateQuota: s.countsTowardStateQuota !== false },
      }));
      movedByCorpus[c.name]++;
      continue;
    }
    seen.push({ state: s.state, contentHash: s.contentHash });
    pool.set(key, seen);
    shots.push(Object.assign({}, s, { corpus: c.name, sourceManifest: c.manifest, bandSha: c.j.gitSha }));
    kept[c.name]++;
    byIdentity[s.identity || "?"] = (byIdentity[s.identity || "?"] || 0) + 1;
  }
  for (const z of (c.j.zoomFrames || []).map((x) => (typeof x === "string" ? x : x && x.path)).filter(Boolean)) zoomFrames.push(z);
  for (const r of c.j.routeDrifts || []) routeDrifts.push(Object.assign({ corpus: c.name, sourceManifest: c.manifest }, r));
  for (const r of c.j.stateNotApplied || []) stateNotApplied.push(Object.assign({ corpus: c.name, sourceManifest: c.manifest, retroactive: false }, r));
}
stateNotApplied.push(...moved);

/* ---- 4. 落盘前自证：索引里的每条 path 必须在盘上、字节必须与记录值一致 ---- */
const selfBad = [];
for (const s of shots.concat(moved)) {
  const abs = s.path.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(s.path) ? s.path : join(REPO, s.path);
  if (!existsSync(abs)) { selfBad.push(`不存在 ${s.path}`); continue; }
  const act = hash16(abs);
  if (s.contentHash && act !== s.contentHash) selfBad.push(`哈希不符 ${s.path} 记=${s.contentHash} 实=${act}`);
}
for (const z of zoomFrames) if (!existsSync(z.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(z) ? z : join(REPO, z))) selfBad.push(`裁切帧不存在 ${z}`);
if (selfBad.length) {
  console.log(`UNION_SELFCHECK=FAIL ${selfBad.length} 条（一个都不写）`);
  selfBad.slice(0, 8).forEach((b) => console.log("  BAD " + b));
  process.exit(1);
}
console.log(`UNION_SELFCHECK=OK shots=${shots.length} moved=${moved.length} zoom=${zoomFrames.length} 全部可 stat、哈希全等`);

/* ---- 5. 守恒：输入总数 = 保留 + 改判，逐 corpus 打印（合计必须等，不等就不写） ---- */
let inTotal = 0, outTotal = 0;
for (const c of corpora) {
  const i = c.j.shots.length;
  inTotal += i; outTotal += kept[c.name] + movedByCorpus[c.name];
  console.log(`UNION_CORPUS ${c.name} in=${i} kept=${kept[c.name]} moved=${movedByCorpus[c.name]} zoom=${(c.j.zoomFrames || []).length} snaAtCapture=${snaFromCapture[c.name]}`);
}
if (inTotal !== outTotal) fail(`守恒不等：输入 ${inTotal} ≠ 保留+改判 ${outTotal}`);
console.log(`UNION_CONSERVE in=${inTotal} kept=${shots.length} moved=${moved.length} sum=${shots.length + moved.length} → ${shots.length + moved.length === inTotal ? "OK" : "FAIL"}`);

/* ---- 6. 组装权威件 ---- */
const hist = {};
for (const s of shots) { const k = `${s.width || "?"}x${s.height || "?"}`; hist[k] = (hist[k] || 0) + 1; }
const man = {
  gitSha: GIT_SHA,
  gitShaBands: shas.length > 1 ? shas : undefined,
  gitShaBandNote: shas.length > 1 ? "本轮 HEAD 中途前进过，帧来自 " + shas.length + " 个构建带；顶层 gitSha 是主带（HEAD 优先，否则帧数最多），每条 shot 仍带自己的 bandSha" : undefined,
  workflowVersion: "3.2-union",
  buildMode: buildModes.length === 1 ? buildModes[0] : "MIXED（见 corpora[].buildMode，禁止跨构建比像素）",
  manifestSchemaNote: "shot 仍保留 page/path/state 三键原语义；corpus/sourceManifest/identity/route/contentHash/zoomCrops 为追加键，旧消费方忽略未知键即可。",
  derivation: {
    generatedBy: "scripts/qa/rebuild-frozen-manifest.mjs",
    mode: "union-of-corpus-manifests（索引由既有 manifest 派生，未重拍任何像素）",
    at: new Date().toISOString(),
    rule: "同 (identity,page) 内后到且与已落盘帧 sha256 全等的帧，按现行采集规则改判出 shots[] 进 stateNotApplied[]，条目带 retroactive=true 与采集当时判定值",
    corpora: corpora.map((c) => ({
      name: c.name, manifest: c.manifest, gitSha: c.j.gitSha, buildMode: c.j.buildMode || "(未记)",
      harness: c.j.harness || "miniprogram-automator WS", shotsAtCapture: c.j.shots.length,
      kept: kept[c.name], moved: movedByCorpus[c.name], zoomFrames: (c.j.zoomFrames || []).length,
      stateNotAppliedAtCapture: snaFromCapture[c.name],
    })),
    caveat: "DUP_STATE_GROUPS=0 不得读作「两个状态现在长得不一样了」：本轮同字节事实一条没少，"
      + `只是换了载体（stateNotApplied[] 里 retroactive=${moved.length} 条）。逐字对照请看各 corpus 的 manifest-detail.json。`,
    keptByCorpus: kept, movedByCorpus, snaFromCapture,
  },
  shots, stateNotApplied, stateNotAppliedCount: stateNotApplied.length,
  retroactiveReclassifiedCount: moved.length,
  routeDrifts, routeDriftCount: routeDrifts.length,
  zoomFrames, zoomFrameCount: zoomFrames.length,
  identityGroups: byIdentity,
  captureLimitations: { mixedHarness: buildModes.length > 1 ? true : false, buildModes },
};
if (existsSync(OUT)) {
  copyFileSync(OUT, OUT + ".pre-union.bak");
  console.log("UNION_BACKUP=" + rel(OUT) + " -> " + rel(OUT) + ".pre-union.bak");
}
if (DRY) { console.log("UNION_RESULT=DRY 自证与守恒都过，未写盘"); process.exit(0); }
writeFileSync(OUT, JSON.stringify(man, null, 2));
console.log(`UNION_WRITTEN=${rel(OUT)} shots=${shots.length} sna=${stateNotApplied.length} zoom=${zoomFrames.length} gitSha=${GIT_SHA}`);
console.log("UNION_RESULT=OK");
