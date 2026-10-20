#!/usr/bin/env node
/**
 * render-defects.mjs —— 把泳道缺陷卡渲成交付件 defects-R<n>.md（MP-FIDELITY §10 的 §3 底稿）。
 *
 * 为什么不手工写这份 md：轮次至少三轮，每轮 100+ 条，手写必然出现"报告与泳道原件不是同一份事实"。
 * 这里只做一件事：**逐字搬运**卡上的字段，不改写、不合并、不判断。
 * 判"有没有漏条目"由 verify-finder-lane.mjs 负责，这份渲染只保证搬运不失真。
 *
 * 用法：node scripts/qa/render-defects.mjs --lanes tmp/qa/lanes/R1 --fixlist reports/.../fixlist-R1.json
 *        --round R1 --out reports/.../defects-R1.md
 * 退出码：0 写成就 0；1 卡片里有点名不到的缺陷（fixlist 与卡对不上）——那是账目错，不许静默出 md。
 *
 * 段内继承（R6.7 登记、R7 落地）：R6 的卡在同一 ## FRAME 段里只给第一条抄 frame_hash，
 * 第二条 defect_id 起不再重复——旧渲染器据此拒出 defects-R6.md（frame_hash空=95）。
 * 帧路径→哈希在取景清单里是一对一的，同段继承不是造见证，但成品必须标"继承"二字，
 * 不许把派生值冒充逐条抄录；整段一个哈希都没有的仍然 NOT-EVIDENCED（不编）。
 * --self-test 用合成卡自证两条：同段两条 ⇒ 第二条继承出册；整段无哈希 ⇒ 仍然退 1。
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const SELF = fileURLToPath(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);
const rel = (p) => p.split(sep).join("/");
const RK = "RENDERDEFECTS_RESULT";

const lanesDir = resolve(arg("lanes", ""));
const fixlistPath = arg("fixlist", "");
const ROUND = arg("round", "");
const outPath = resolve(arg("out", ""));
if (flag("self-test")) selfTest();
if (!lanesDir || !existsSync(lanesDir) || !ROUND || !outPath) {
  console.log(`${RK}=NOT-EVIDENCED reason=bad-args lanes=${arg("lanes", "")} round=${ROUND || "(没传)"} out=${arg("out", "")}`);
  process.exit(1);
}

/* 卡片字段是 `- key: value`；中文键名（现象/建议改法/理想图依据）照卡上原样。
   解析必须**一条一条切**，不能"字段往后挂"：R1 实测 103 个 `## FRAME` 标题装了 119 条缺陷
   （同一帧多条时标题只写一次），往后挂会让同块第 2 条起把 frame_hash 挂到前一条身上——
   帧哈希是"这条到底看过哪张图"的唯一凭据，挂错等于伪造见证件。 */
const FIELDS = ["frame_hash", "defect_id", "page", "axis", "severity", "fix_category", "source_citation", "理想图依据", "现象", "建议改法", "修复类别", "源码证据"];
const ALIAS = { 修复类别: "fix_category", 源码证据: "source_citation" };
/* CLEAN 段的判据与找茬门**逐字同尺**（verify-finder-lane.mjs:81 的 CLEAN_HEADER_RE），
   两把尺各写一份迟早会分家——那时"门判它是合规交代、渲染器判它畸形缺陷"就会互相打脸。 */
const CLEAN_RE = new RegExp("^##\\s+CLEAN(?:[ _-]?VERDICT)?\\b", "i");
const CLEAN_TITLE_RE = new RegExp("^##\\s+CLEAN(?:[ _-]?VERDICT)?\\s*", "i");
const OTHER_HEADER_RE = new RegExp("^##(?!\\s*(?:FRAME|CLEAN))", "i");
const rows = [];
/* CLEAN 段（"这帧逐轴量过、没有可测缺陷"）不是一条缺陷：它有 frame/frame_hash 而没有 defect_id。
   旧写法把它当畸形缺陷行，于是整份册子被 NOT-EVIDENCED 拒掉——R7 实测 defect_id空=26，
   其中 17 条正是 CLEAN 段。可 CLEAN 恰恰是"漏审"的反面、是门要的交代，不能当噪声丢，
   所以单列收进 cleanRows；段里 frame 或 frame_hash 缺任一个照样畸红（不替车道编"我看过了"）。 */
const cleanRows = [];
const badClean = [];
/* 空帧段 = 车道写了 `## FRAME` + frame_hash，却既没交缺陷也没交 CLEAN 交代。
   这不是「畸形缺陷行」，是「这张图没人判」——旧写法把它混进 noId 一起拒掉整册，
   等于用渲染器的红盖掉真正要登记的欠审。现在单列具名、册内点名；
   noId 那道红留给真正的"把看过哪张图洗掉"（自测乙例仍在）。 */
const unadjudicated = [];
const files = readdirSync(lanesDir).filter((f) => f.endsWith(".md") && !/\.brief\.md$/i.test(f)).sort();
let inheritedCount = 0;
for (const f of files) {
  const txt = readFileSync(join(lanesDir, f), "utf8").replace(/\r\n/g, "\n");
  let rec = null, lastFrame = "", sectionHash = "";
  let clean = null;
  const flushClean = () => {
    if (clean && clean.frame && clean.frame_hash) cleanRows.push(clean);
    else if (clean) badClean.push({ lane: f.replace(/\.md$/, ""), title: clean.title, frame: clean.frame || "(没写)", hasHash: !!clean.frame_hash });
    clean = null;
  };
  const flush = () => {
    if (!rec) return;
    /* 同段继承：rec 诞生于当前段（rec.frame === lastFrame）且本段出现过哈希 ⇒ 挂上并打标；
       跨段的残条（字段越过了下一个 ## FRAME 头）不继承下一段的哈希——那不是它看过的图。 */
    if (!rec.frame_hash && sectionHash && rec.frame === lastFrame) { rec.frame_hash = sectionHash; rec.hashInherited = true; inheritedCount++; }
    if (!rec.defect_id && rec.frame_hash && rec.frame) unadjudicated.push(rec);
    else rows.push(rec);
    rec = null;
  };
  for (const line of txt.split("\n")) {
    const fm = line.match(/^##\s*FRAME\s+(\S+)/);
    if (fm) { flushClean(); flush(); lastFrame = fm[1]; sectionHash = ""; continue; }
    if (CLEAN_RE.test(line)) {
      flushClean();
      flush();
      clean = { lane: f.replace(/\.md$/, ""), title: line.replace(CLEAN_TITLE_RE, "").trim(), frame: "", frame_hash: "", compared_to: "", axes: "" };
      continue;
    }
    if (OTHER_HEADER_RE.test(line)) { flushClean(); flush(); continue; }
    if (clean) {
      if (line.startsWith("- ")) {
        const ci = line.indexOf(":");
        if (ci > 0) {
          const ckKey = line.slice(2, ci).trim();
          const ckVal = line.slice(ci + 1).trim();
          if (ckKey === "frame") clean.frame = ckVal;
          else if (ckKey === "frame_hash") clean.frame_hash = ckVal;
          else if (ckKey === "compared_to") clean.compared_to = ckVal;
          else if (ckKey === "axes") clean.axes = ckVal;
        }
      }
      continue;
    }
    const kv = line.match(/^-\s*([^:]+?)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = ALIAS[kv[1].trim()] || kv[1].trim();
    const val = kv[2].trim();
    if (!FIELDS.includes(key)) continue;
    /* 同一条缺陷的字段是连续跑的；frame_hash 与 defect_id 各只应出现一次，
       再见到第二个就是下一条开始了。 */
    if (rec && ((key === "frame_hash" && rec.frame_hash) || (key === "defect_id" && rec.defect_id))) flush();
    if (!rec) rec = { lane: f.replace(/\.md$/, ""), frame: lastFrame, defect_id: "", frame_hash: "" };
    if (key === "frame_hash" && val) sectionHash = val;
    if (!rec[key]) rec[key] = val;
  }
  flush();
  flushClean();
}
/* CLEAN 段畸形要**先**问：一张卡里只有"没哈希的 CLEAN 段"时，下面那条空卡红会先跳出来，
   把真正的原因（车道写了交代却给不出看了哪张图）盖掉——红的可解释性比红的条数重要。 */
if (badClean.length) {
  console.log(`${RK}=NOT-EVIDENCED reason=CLEAN 段畸形（缺 frame 或 frame_hash）=${badClean.length} 条：${badClean.map((c) => c.lane + "/" + (c.frame || "(无帧)")).slice(0, 3).join(" | ")}`);
  process.exit(1);
}
if (!rows.length && !cleanRows.length) { console.log(`${RK}=NOT-EVIDENCED reason=no-defect-cards dir=${rel(lanesDir)}（空卡目录不许渲出一份"零缺陷"的 md；本目录里 缺陷=${rows.length} CLEAN=${cleanRows.length} 空帧段=${unadjudicated.length}）`); process.exit(1); }
/* 自证：每条必须有 id 和帧哈希，否则这份 md 会把"看了哪张图"洗掉。
   R1 第一发实测 119 条全空 id（我把 defect_id 漏在字段白名单外，标题渲染成 `###  P0 / 层级遮挡`），
   没有这一问就是静默出一整份没有可追溯性的交付件。 */
const noId = rows.filter((r) => !r.defect_id).length;
const noHash = rows.filter((r) => !r.frame_hash).length;
const noFrame = rows.filter((r) => !r.frame).length;
if (noId || noHash || noFrame) {
  console.log(`${RK}=NOT-EVIDENCED reason=字段缺失 defect_id空=${noId} frame_hash空=${noHash} 帧路径空=${noFrame}（检 ${rows.length} 条）`);
  process.exit(1);
}

/* 批次归属：从 fixlist 反查 defect_id → batch_id。对不上就是账目错（卡被改过、或聚合器漏读）。 */
const batchOf = new Map();
let unbatched = 0;
if (fixlistPath && existsSync(resolve(fixlistPath))) {
  const fl = JSON.parse(readFileSync(resolve(fixlistPath), "utf-8"));
  for (const b of fl.batches || []) for (const id of b.defects || []) batchOf.set(id, b.batch_id);
  for (const r of rows) if (!batchOf.has(r.defect_id)) unbatched++;
}

const sevCount = {}, axisCount = {}, pageSet = new Set(), frameSet = new Set();
for (const r of rows) {
  sevCount[r.severity || "?"] = (sevCount[r.severity || "?"] || 0) + 1;
  axisCount[r.axis || "?"] = (axisCount[r.axis || "?"] || 0) + 1;
  if (r.page) pageSet.add(r.page);
  if (r.frame) frameSet.add(r.frame);
}
const byPage = new Map();
for (const r of rows) { const k = r.page || "(未点名页面)"; if (!byPage.has(k)) byPage.set(k, []); byPage.get(k).push(r); }

const L = [];
L.push(`# ${ROUND} 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）`);
L.push(``);
L.push(`- 缺陷条数=${rows.length}　涉及页面=${byPage.size}　涉及帧=${frameSet.size}　泳道卡=${files.length}${inheritedCount ? `　段内继承哈希=${inheritedCount}（同段第二条起未重复抄录，非逐条见证）` : ""}`);
L.push(`- 严重度分布：${Object.entries(sevCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join("　")}`);
L.push(`- 轴分布：${Object.entries(axisCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join("　")}`);
L.push(`- 空帧段（开了 FRAME 头但既无缺陷也无 CLEAN 交代，**不算已审**）=${unadjudicated.length}${unadjudicated.length ? "　涉及车道：" + [...new Set(unadjudicated.map((r) => r.lane))].join("、") : ""}`);
if (fixlistPath) L.push(`- 批次归属：${batchOf.size} 个批次收录，**卡上有而 fixlist 没有的=${unbatched}**${unbatched ? "（这是账目错，见退出码）" : ""}`);
L.push(``);
for (const [page, list] of [...byPage.entries()].sort()) {
  L.push(`## ${page}（${list.length} 条）`);
  for (const r of list) {
    L.push(``);
    L.push(`### ${r.defect_id}　${r.severity || "?"} / ${r.axis || "?"}　批次 ${batchOf.get(r.defect_id) || "-"}`);
    L.push(`- 帧：\`${r.frame}\`（sha16=\`${r.frame_hash || "-"}\`${r.hashInherited ? "，自同段前条继承" : ""}）`);
    if (r.source_citation) L.push(`- 源码证据：\`${r.source_citation}\``);
    if (r.理想图依据) L.push(`- 理想图依据：${r.理想图依据}`);
    if (r.现象) L.push(`- 现象：${r.现象}`);
    if (r.建议改法) L.push(`- 建议改法：${r.建议改法}`);
    if (r.fix_category) L.push(`- 修复类别：${r.fix_category}`);
  }
  L.push(``);
}
/* CLEAN 帧单列成册：它们不是缺陷，但它们是"这张图我真量过"的交代，
   丢在渲染器之外就等于把末轮的审查覆盖洗掉。照卡原样抄，不改写、不补全。 */
if (unadjudicated.length) {
  L.push(`## 空帧段（未交代，不算已审）（${unadjudicated.length} 段）`);
  L.push(``);
  for (const r of unadjudicated) L.push("- `" + r.lane + "` 帧 `" + r.frame + "`（sha16=`" + r.frame_hash + "`）—— 本段一条缺陷都没写，也没有合规 CLEAN 卡 ⇒ 该帧漏审");
  L.push(``);
}
if (cleanRows.length) {
  L.push(`## 无缺陷（CLEAN）帧（${cleanRows.length} 张）`);
  L.push(``);
  L.push(`> 这些帧泳道逐轴量过、判"没有可测缺陷"。轴名与读数照卡原样。`);
  for (const c of cleanRows) {
    L.push(``);
    L.push(`### ${c.lane}　${c.title || "(无标题)"}`);
    L.push(`- 帧：\`${c.frame}\`（sha16=\`${c.frame_hash}\`）`);
    if (c.compared_to) L.push(`- 依据：${c.compared_to}`);
    L.push(`- 逐轴读数：${c.axes || "(卡上没写 axes 行 ⇒ CLEAN 交代不完整，找茬门会拒这张卡)"}`);
  }
  L.push(``);
}
writeFileSync(outPath, L.join("\n") + "\n", "utf8");
console.log(`${RK}=WROTE file=${rel(REPO === outPath.slice(0, REPO.length) ? outPath.slice(REPO.length + 1) : outPath)} 条数=${rows.length} 页面=${byPage.size} 帧=${frameSet.size} CLEAN帧=${cleanRows.length} 空帧段=${unadjudicated.length} 无批次=${unbatched} 段内继承哈希=${inheritedCount}`);
if (unbatched) { console.log(`${RK}=PARTIAL reason=${unbatched} 条缺陷卡在泳道里写了但 fixlist 没收录 ⇒ 聚合与卡片不是同一份事实`); process.exit(1); }

/* ── 自测：合成卡自证"继承出册"与"无哈希仍拒"两条都活着（spawn 自证，不占真卡目录）── */
function selfTest() {
  const root = join(REPO, "tmp", "qa", `selftest-render-defects-${Date.now()}`);
  const lanesA = join(root, "A"), lanesB = join(root, "B");
  mkdirSync(lanesA, { recursive: true }); mkdirSync(lanesB, { recursive: true });
  writeFileSync(join(lanesA, "card.md"), [
    "# 合成卡甲（同段两条、哈希只抄一遍——R6 卡的实形）",
    "## FRAME tmp/x__top.png",
    "- frame_hash: aaaa1111bbbb2222",
    "- defect_id: T1-D01",
    "- page: p1",
    "- axis: 间距",
    "- severity: P2",
    "- defect_id: T1-D02",
    "- page: p1",
    "- axis: 字号",
    "- severity: P3",
    "",
  ].join("\n"), "utf8");
  writeFileSync(join(lanesB, "card.md"), [
    "# 合成卡乙（整段无哈希——继承不许变成编造）",
    "## FRAME tmp/y__top.png",
    "- defect_id: T2-D01",
    "- page: p2",
    "- axis: 文案",
    "- severity: P2",
    "",
  ].join("\n"), "utf8");
  const run = (lanes, out) => spawnSync(process.execPath, [SELF, "--lanes", lanes, "--round", "T", "--out", out], { encoding: "utf8" });
  const outA = join(root, "a.md");
  const rA = run(lanesA, outA);
  const mdA = existsSync(outA) ? readFileSync(outA, "utf8") : "";
  const okA = rA.status === 0 && /段内继承哈希=1(?!\d)/.test(String(rA.stdout)) && mdA.includes("自同段前条继承") && (mdA.match(/aaaa1111bbbb2222/g) || []).length === 2;
  const rB = run(lanesB, join(root, "b.md"));
  const okB = rB.status === 1 && /frame_hash空=1(?!\d)/.test(String(rB.stdout));
  /* 新增三例：合规 CLEAN 要出得了册（0 缺陷 ≠ 空手交件）、空帧段要具名但不能被当成审过、
     没有帧哈希的 CLEAN 段仍然拒——否则这次放宽就变成把"没人判"洗成"判过"。 */
  const lanesC = join(root, "C"), lanesD = join(root, "D"), lanesE = join(root, "E");
  mkdirSync(lanesC, { recursive: true }); mkdirSync(lanesD, { recursive: true }); mkdirSync(lanesE, { recursive: true });
  writeFileSync(join(lanesC, "card.md"), [
    "# 合成卡丙（只有一张合规 CLEAN）",
    "## CLEAN home__top（逐轴核对）",
    "- frame: tmp/z__top.png",
    "- frame_hash: cccc3333dddd4444",
    "- compared_to: 规范文档 §1",
    "- axes: 位置=实测 x=17; 字号=实测 18px",
    "",
  ].join("\n"), "utf8");
  writeFileSync(join(lanesD, "card.md"), [
    "# 合成卡丁（FRAME 头 + 哈希，一条缺陷没写、也没 CLEAN 交代）",
    "## FRAME tmp/w__top.png",
    "## FRAME tmp/w1__top.png",
    "- frame_hash: eeee5555ffff6666",
    "## FRAME tmp/w2__top.png",
    "- frame_hash: ffff7777aaaa8888",
    "- defect_id: T4-D01",
    "- page: p4",
    "- axis: 文案",
    "- severity: P2",
    "",
  ].join("\n"), "utf8");
  writeFileSync(join(lanesE, "card.md"), [
    "# 合成卡戊（CLEAN 段没有帧哈希——不能替车道编『我看过了』）",
    "## CLEAN home__top",
    "- frame: tmp/v__top.png",
    "- axes: 位置=实测",
    "",
  ].join("\n"), "utf8");
  const rC = run(lanesC, join(root, "c.md"));
  const mdC = existsSync(join(root, "c.md")) ? readFileSync(join(root, "c.md"), "utf8") : "";
  const okC = rC.status === 0 && /CLEAN帧=1(?!\d)/.test(String(rC.stdout)) && mdC.includes("cccc3333dddd4444");
  const rD = run(lanesD, join(root, "d.md"));
  const mdD = existsSync(join(root, "d.md")) ? readFileSync(join(root, "d.md"), "utf8") : "";
  const okD = rD.status === 0 && /空帧段=1(?!\d)/.test(String(rD.stdout)) && /条数=1(?!\d)/.test(String(rD.stdout)) && mdD.includes("漏审");
  const rE = run(lanesE, join(root, "e.md"));
  const okE = rE.status === 1 && /CLEAN 段畸形/.test(String(rE.stdout));
  rmSync(root, { recursive: true, force: true });
  const allOk = okA && okB && okC && okD && okE;
  console.log(`RENDERDEFECTS_SELFTEST=${allOk ? "PASS" : "FAIL"} 继承出册=${okA ? "OK" : "BAD"} 无哈希仍拒=${okB ? "OK" : "BAD"} CLEAN出册=${okC ? "OK" : "BAD"} 空帧段具名=${okD ? "OK" : "BAD"} 无哈希CLEAN仍拒=${okE ? "OK" : "BAD"}（甲=${rA.status} 乙=${rB.status} 丙=${rC.status} 丁=${rD.status} 戊=${rE.status}）`);
  process.exit(allOk ? 0 : 1);
}
