#!/usr/bin/env node
/**
 * verify-finder-lane.mjs —— 找茬泳道交付件的配额门（MP-FIDELITY Phase E）。
 *
 * 为什么这道门必须能红（用户硬要求"每张截图至少指出一个问题"）：
 *   配额型要求最典型的失效不是没人交，是**交上来的东西填满格子却没有内容**——
 *   "观感不佳""建议优化"这类散文一条能顶一帧，三条能顶一轮。所以这道门不数"有没有写"，
 *   数的是四件能被机器复核的事：
 *     1. 配额：泳道为它声明的**每一帧**都开了 `## FRAME` 段，且段内至少一条完整缺陷；
 *     2. 帧归属：段里的 frame_hash 必须等于取景清单里那一帧的真实 sha256 前 16 位
 *        ⇒ 没打开过这张图的人写不出这个 hash（这条是防"照着路由名想象画面"）；
 *     3. 源码证据：cited file:line 必须真存在、行数够、该行非空白，且路径在仓内；
 *     4. 轴封闭：axis 只许取词表里的可测轴，散文（观感不佳/建议优化/整体偏乱）一律记 0 条。
 *
 * 判点形状：全部走"合成夹具 + 变异体"自证（--self-test），合规件必绿、五种坏件必红。
 *
 * 用法：node scripts/qa/verify-finder-lane.mjs --lane <lane.md> --manifest <sweep-manifest.json>
 *      node scripts/qa/verify-finder-lane.mjs --self-test
 * 退出码：0 配额与判点全中；1 有违规；2 输入读不到（泳道/清单缺，或字段格式整体不对）。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "FINDERLANE_RESULT";

/** 封闭词表：只收"能在帧上量出来"的轴。刻意不含 观感/风格/建议 这类词。 */
const AXES = new Set(["位置", "尺寸比例", "颜色token", "圆角", "字号", "间距", "素材缺失", "空态文案", "层级遮挡", "可达性", "文案", "需新建"]);
const SEVERITIES = new Set(["P0", "P1", "P2", "P3"]);
const CATEGORIES = new Set(["CSS/token", "单页", "需新建目标功能"]);

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);

/** 从一帧段里抠 `- key: value` 行 */
function parseFields(block) {
  const out = {};
  for (const m of block.matchAll(/^\s*[-*]\s*([A-Za-z_][\w]*)\s*:\s*(.*)$/gm)) {
    if (!(m[1] in out)) out[m[1]] = m[2].trim();
  }
  return out;
}

/** 缺陷条目：以 `defect_id:` 开头的行起一条 */
function parseDefects(block) {
  const parts = block.split(/(?=^\s*[-*]\s*defect_id\s*:)/m);
  return parts.filter((p) => /defect_id/.test(p)).map((p) => parseFields(p));
}

/** 源码证据复核：path:line（允许 apps/client/... 与 src/... 两种写法各试一次） */
/* 扩展白名单含 wxss/wxml（R1 泳道诚实回报逼出来的洞）：custom-tab-bar 的缺陷真身就写在
   apps/client/src/custom-tab-bar/index.wxss / .wxml，旧白名单不收它们 ⇒ 泳道只能改引"同缺陷的近端源码"
   （驱动该样式的 js flag、或 scss 里的 token）。那不是编造，但证据从真身挪开了，
   后续修批会照着不产生该现象的文件去改。收进白名单，证据才回到真身。 */
function citationOk(cit) {
  /* 组序陷阱（R1 实测）：原先写成 `((vue)|(ts)|(js)|...)` 每支各带一个捕获组，
     于是外层组和内层组都在数里 —— 我加 wxss/wxml 白名单时把组号挪了一位，
     m[5] 从"行号"变成字符串 "js"，Number() 得 NaN，一条明明合法的门禁引用被误判成空行。
     ⇒ 改成非捕获组 + 只留一个显式行号组，并且不再用位置索引猜第几组是行号。 */
  const m = String(cit || "").match(/([^\s:]+\.(?:vue|ts|js|mjs|cjs|scss|css|json|wxss|wxml)):(\d+)/);
  if (!m) return { ok: false, why: "形状不是 path:line（可复核的扩展名 + 行号）" };
  const rel = m[1];
  const line = Number(m[2]);
  const cand = [join(REPO, rel), join(REPO, "apps/client", rel)].filter(existsSync);
  if (!cand.length) return { ok: false, why: `文件不在仓内 ${rel}` };
  const lines = readFileSync(cand[0], "utf-8").split(/\r?\n/);
  if (!lines.length || line > lines.length) return { ok: false, why: `${rel} 只有 ${lines.length} 行，点名的 :${line} 越界` };
  if (!String(lines[line - 1] || "").trim()) return { ok: false, why: `${rel}:${line} 是空行，不可能承载该证据` };
  return { ok: true, why: "" };
}

/**
 * 主判点。返回 {problems, stats}
 * 泳道件结构约定（brief 里给泳道的模板就是这个）：
 *   ## FRAME <相对帧路径>
 *   - frame_hash: <sha16>
 *   - defect_id: MPFID-<路由slug>-<序>
 *   - axis: <词表>
 *   - severity: P0..P3
 *   - 理想图依据: ...
 *   - fix_category: CSS/token | 单页 | 需新建目标功能
 *   - source_citation: path.vue:123
 */
function judge(lanePath, manifestPath) {
  const problems = [];
  if (!existsSync(lanePath)) return { problems: [`泳道件读不到 ${lanePath}`], stats: null };
  if (!existsSync(manifestPath)) return { problems: [`取景清单读不到 ${manifestPath}`], stats: null };
  const lane = readFileSync(lanePath, "utf-8");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const framesByPath = new Map();
  for (const rec of (manifest.results || [])) {
    for (const f of (rec.frames || [])) framesByPath.set(String(f.path).split("\\").join("/"), f);
  }

  const sections = lane.split(/\n(?=##\s+FRAME\s)/).filter((s) => /^##\s+FRAME\s/.test(s));
  if (!sections.length) return { problems: ["泳道件里一个 `## FRAME` 段都没有 ⇒ 配额无从谈起（空手交件）"], stats: null };

  let defectCount = 0, hashBad = 0, citeBad = 0, axisBad = 0, quotaViolations = 0, unlisted = 0;
  /* 洞（R1 实测出来的）：泳道可以给同一帧写 N 个 `## FRAME` 段（L01 三帧写了 26 段），
     于是"每帧≥1缺陷"这条配额数的是段数、永远响不了；一帧没审也可能被段数盖住。
     ⇒ 先按帧路径**分组**，配额与 hash 归属都按去重后的帧判，段只是同一帧的多条记录。 */
  const groups = new Map();
  for (const sec of sections) {
    const header = String(sec.split(/\r?\n/)[0] || "").replace(/^##\s+FRAME\s+/, "").trim();
    if (!groups.has(header)) groups.set(header, []);
    groups.get(header).push(sec);
  }
  let framesSeen = 0;
  for (const [header, secs] of groups) {
    if (!framesByPath.has(header)) { unlisted += secs.length; problems.push(`FRAME 段指向清单里没有的帧：${header}（${secs.length} 段）⇒ 帧路径必须逐字来自 sweep-manifest`); continue; }
    framesSeen++;
    const truth = framesByPath.get(header);
    const defects = secs.flatMap((s) => parseDefects(s));
    const claimedHashes = secs.map((s) => String(parseFields(s).frame_hash || "").trim()).filter(Boolean);
    if (!defects.length) { quotaViolations++; problems.push(`${header} 这条帧零缺陷 ⇒ 配额未达（本门就是为这一条写的）`); continue; }
    const claimedHash = claimedHashes[0] || "";
    if (!claimedHash || claimedHash.length < 8 || !String(truth.contentHash || "").startsWith(claimedHash.slice(0, Math.min(claimedHash.length, 16)))) {
      hashBad++; problems.push(`${header} frame_hash=${claimedHash || "(空)"} 与清单实测 ${String(truth.contentHash).slice(0, 8)}… 不符 ⇒ 这条帧没被真打开过（或 hash 被逐段写成不同值）`);
      continue;
    }
    const mismatchedSegHashes = claimedHashes.filter((h) => h.length >= 8 && !String(truth.contentHash).startsWith(h.slice(0, Math.min(h.length, 16))));
    if (mismatchedSegHashes.length) { hashBad++; problems.push(`${header} 有 ${mismatchedSegHashes.length} 段写了与本帧清单不符的 hash ⇒ 同帧多段必须同 hash`); }
    for (const d of defects) {
      const axis = String(d.axis || "").trim();
      const sev = String(d.severity || "").trim();
      const cat = String(d.fix_category || "").trim();
      const id = String(d.defect_id || "").trim();
      if (!id) { problems.push(`${header} 有缺陷条目没有 defect_id`); continue; }
      if (!AXES.has(axis)) { axisBad++; problems.push(`${id} axis="${axis || "(空)"}" 不在可测轴词表 ⇒ 散文顶配额，本条记 0`); continue; }
      if (!SEVERITIES.has(sev)) problems.push(`${id} severity="${sev || "(空)"}" 不在 P0-P3`);
      if (!CATEGORIES.has(cat)) problems.push(`${id} fix_category="${cat || "(空)"}" 不在 {CSS/token,单页,需新建目标功能}`);
      const cit = citationOk(d.source_citation);
      if (!cit.ok) { citeBad++; problems.push(`${id} 源码证据复核不过：${cit.why}`); }
      defectCount++;
    }
  }
  const stats = { framesSeen, defectCount, hashBad, citeBad, axisBad, quotaViolations, unlisted };
  return { problems, stats };
}

function report(problems, stats, extra) {
  for (const p of problems) console.error(`FINDERLANE_PROBLEM ${p}`);
  if (stats) console.log(`FINDERLANE_STATS frames=${stats.framesSeen} defects=${stats.defectCount} quota_violation=${stats.quotaViolations} hash_mismatch=${stats.hashBad} ungrepable_citations=${stats.citeBad} axis_invalid=${stats.axisBad} frames_not_in_manifest=${stats.unlisted}`);
  console.log(problems.length ? `${RK}=FAIL ${extra || ""} problems=${problems.length}` : `${RK}=PASS ${extra || ""} 配额=每帧≥1缺陷 且四条复核全中`);
  return problems.length ? 1 : 0;
}

/* ─────────────────────────── --self-test：五种坏件必须红、合规件必须绿 ─────────────────────────── */
function selfTest() {
  const SRK = "FINDERLANE_SELFTEST";
  const scratch = join(REPO, ".zcode", "tmp", "finder-lane-selftest");
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });

  const FRAME_A = "tmp/qa/frames/SELF/real-selftest/login__top.png";
  const HASH_A = "abcdef1234566789";
  const manifest = { results: [{ route: "pages/login/index", frames: [{ route: "pages/login/index", state: "top", path: FRAME_A, contentHash: HASH_A, bytes: 9000 }] }] };
  const mp = join(scratch, "sweep-manifest.json");
  writeFileSync(mp, JSON.stringify(manifest, null, 2), "utf-8");

  /* 真文件真行号：从本文件里取一行有内容的行当合法 citation */
  const selfLines = readFileSync(join(HERE, "verify-finder-lane.mjs"), "utf-8").split(/\r?\n/);
  const goodLineIdx = selfLines.findIndex((l) => /const AXES = new Set/.test(l)) + 1;
  const goodCit = `scripts/qa/verify-finder-lane.mjs:${goodLineIdx}`;

  const good = `## FRAME ${FRAME_A}
- frame_hash: ${HASH_A}
- defect_id: MPFID-LOGIN-001
- axis: 间距
- severity: P1
- 理想图依据: 素材/理想效果图/登录页.png 表单区
- fix_category: 单页
- source_citation: ${goodCit}
`;
  const zeroDefect = `## FRAME ${FRAME_A}
- frame_hash: ${HASH_A}
`;
  const proseOnly = `## FRAME ${FRAME_A}
- frame_hash: ${HASH_A}
- defect_id: MPFID-LOGIN-002
- axis: 观感不佳
- severity: P1
- fix_category: 单页
- source_citation: ${goodCit}
`;
  const badHash = `## FRAME ${FRAME_A}
- frame_hash: 00000000
- defect_id: MPFID-LOGIN-003
- axis: 字号
- severity: P2
- fix_category: 单页
- source_citation: ${goodCit}
`;
  const badCit = `## FRAME ${FRAME_A}
- frame_hash: ${HASH_A}
- defect_id: MPFID-LOGIN-004
- axis: 圆角
- severity: P2
- fix_category: 单页
- source_citation: scripts/qa/nonexistent-file-xyz.vue:99999
`;
  const ghostFrame = `## FRAME tmp/qa/frames/SELF/real-selftest/nope__top.png
- frame_hash: ${HASH_A}
- defect_id: MPFID-GHOST-005
- axis: 位置
- severity: P3
- fix_category: 单页
- source_citation: ${goodCit}
`;
  /* 第 7 例（R1 实测出来的洞）：同一帧写 N 段、每段都带合格缺陷。
     旧版数的是"段数"，于是 3 帧写 26 段时 frames=26=defects，配额判点永不响，
     而另一帧完全没审也看不出来。现在按去重后的帧判 ⇒ 这一件必须红（另一帧没覆盖到，
     且本件的"帧数"应当是 1 而不是 N）。 */
  const manySections = `## FRAME ${FRAME_A}
- frame_hash: ${HASH_A}
- defect_id: MPFID-MANY-006
- axis: 间距
- severity: P1
- fix_category: 单页
- source_citation: ${goodCit}
## FRAME ${FRAME_A}
- frame_hash: ${HASH_A}
- defect_id: MPFID-MANY-007
- axis: 圆角
- severity: P2
- fix_category: 单页
- source_citation: ${goodCit}
## FRAME ${FRAME_A}
- frame_hash: ${HASH_A}
- defect_id: MPFID-MANY-008
- axis: 字号
- severity: P2
- fix_category: 单页
- source_citation: ${goodCit}
`;
  const wrongHashInOneSeg = `## FRAME ${FRAME_A}
- frame_hash: ${HASH_A}
- defect_id: MPFID-MANY-009
- axis: 间距
- severity: P1
- fix_category: 单页
- source_citation: ${goodCit}
## FRAME ${FRAME_A}
- frame_hash: 99999999
- defect_id: MPFID-MANY-010
- axis: 圆角
- severity: P2
- fix_category: 单页
- source_citation: ${goodCit}
`;

  const cases = [
    ["合规件必须绿", good, false],
    ["零缺陷帧必须红", zeroDefect, true],
    ["散文轴必须红", proseOnly, true],
    ["帧 hash 不符必须红", badHash, true],
    ["编造 citation 必须红", badCit, true],
    ["清单里没有的帧必须红", ghostFrame, true],
    ["同帧多段里混一个错 hash 必须红", wrongHashInOneSeg, true],
  ];
  let problems = 0;
  for (const [label, body, mustFail] of cases) {
    const f = join(scratch, "lane.md");
    writeFileSync(f, body, "utf-8");
    const { problems: ps, stats } = judge(f, mp);
    const red = ps.length > 0;
    const ok = red === mustFail;
    console.log(`FINDERLANE_SELF ${label.padEnd(30)} 期望=${mustFail ? "红" : "绿"} 实测=${red ? `红(${ps.length})` : "绿"} ⇒ ${ok ? "判点承重" : "判点失效"}`);
    if (!ok) problems++;
  }
  /* 洞的正面证据：同帧写 3 段，帧数必须是 1（旧版会数成 3，配额判点因此永不响） */
  const f7 = join(scratch, "lane7.md");
  writeFileSync(f7, manySections, "utf-8");
  const r7 = judge(f7, mp);
  const counted = r7.stats && r7.stats.framesSeen;
  const ok7 = counted === 1;
  console.log(`FINDERLANE_SELF ${"同帧 3 段只能数成 1 帧".padEnd(30)} 期望 frames=1 实测 frames=${counted} ⇒ ${ok7 ? "洞已堵" : "洞还在（按段数=配额可被绕）"}`);
  if (!ok7) problems++;
  rmSync(scratch, { recursive: true, force: true });
  console.log(problems ? `${SRK}=FAIL cases=${cases.length + 1} problems=${problems}` : `${SRK}=PASS cases=${cases.length + 1} 负例可红=是`);
  return problems ? 1 : 0;
}

if (flag("self-test")) process.exit(selfTest());

const lane = resolve(arg("lane", ""));
const manifest = resolve(arg("manifest", ""));
if (!lane || !manifest) { console.log(`${RK}=NOT-EVIDENCED reason=需同时传 --lane 与 --manifest`); process.exit(2); }
const { problems, stats } = judge(lane, manifest);
process.exit(report(problems, stats, `lane=${lane.replace(REPO + "/", "")}`));
