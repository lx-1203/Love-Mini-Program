/**
 * 证据改判工具（readjudicate）——把"带错误尾注的证据串"从"完成度"里救出来或打死，二选一，不许含糊。
 *
 * 为什么单独成一个工具（不和 verify-evidence-integrity.mjs 合并）：
 *  - verify-* 是**复检门禁**：它只回答"这轮证据干不干净"，判据是 /ERROR:|timeout/i 命中即不算 clean，
 *    于是"文件其实在盘上、只是尾巴被追加了一段 ERROR:timeout" 与"文件真没了"被压成同一个红字，
 *    编排层只能整批改判或整批放行——两种都是错的。
 *  - 本工具是**改判器**：先剥尾注（最多 3 层括号）再看盘，把上面那两种拆开，
 *    前者只重写证据串（保留结论），后者落第四等态 NO-EVIDENCE 并写 missingEvidence=。
 *  - 不重复实现哈希/孤儿帧逻辑（那是 verify-evidence-integrity 的活），本工具只判"是不是文件引用 + 在不在盘上"。
 *
 * 实测坑（都已在代码里防住，别再踩第三遍）：
 *  1. 直接 existsSync(整串) 会把 100% 的带尾注证据算成断链（第一版工具就这么错）。
 *  2. 尾注有两种实测形态："(ERROR:timeout waiting for automator response)" 与 "(155040B)" 大小注记，
 *     都得先剥再判；只剥 ERROR 那类会把 575 条大小注记误判成断链。
 *  3. 裸 id 跨 suite 会撞（round-2 实测 941 行只有 911 个唯一 id）→ tier 必须按 manifest+"/"+id 复合键查。
 *  4. 证据里还有非像素的真实产物（.wxml DOM 转储）与纯观察串（scrollPos=bottom，R2 实测 335 条），
 *     两者都**不是**像素证据，不得计入 tier 的帧数，但也不该被删（是本仓唯一记录滚动位置的字段）。
 *
 * 边界（硬约束）：只读输入。默认不写任何文件。--apply 只另存一份新文件，
 * 且输出路径落在 reports/** 或 apps/** 时直接拒绝执行——执行轮正在往 reports/ 写权威件，覆盖不得发生。
 *
 * 用法：
 *   node scripts/qa/readjudicate-evidence.mjs <exec-results.json>
 *        [--ops <roundOpsDir>]        # 默认 <结果目录>/../ops
 *        [--apply]                    # 默认关：只干跑
 *        [--out <file.json>]          # --apply 的落盘路径，默认 .zcode/tmp/readjudicate/exec-results.readjudicated.json
 *        [--samples <n>]              # 每类打印几条人类样例（默认 2）
 *        [--no-lines]                 # 只印聚合行，不印逐用例 RJ_CASE 行
 *        [--list-ids]                 # 逐用例行打全量（默认只打需要动手的）
 */
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync, statSync } from "node:fs";
const evList = (r) => (Array.isArray(r.evidence) ? r.evidence : (r.evidence ? [String(r.evidence)] : []));
import { dirname, join, resolve, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const argv = process.argv.slice(2);
const flagVal = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const hasFlag = (n) => argv.includes(`--${n}`);
// 位置参数：跳过 --flag 本身以及"带值旗标"的值，免得 --samples 2 里的 2 被当成输入文件。
const VALUE_FLAGS = new Set(["ops", "out", "samples"]);
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && VALUE_FLAGS.has(argv[i - 1].replace(/^--/, ""))));

const NEED_DEFAULT = 1;
/**
 * tier → 需要的"干净像素帧"数。逐字对齐 miniprogram-qa-loop-v32.dwf.ts:681 的 NEED 表
 * （critical=前后各一张、normal=after 一张、navigation/noop=不要求像素），
 * 否则本工具的 tierUnmet 与 D5 门禁的 tierUnmet 会对不上，改判就变成第二次造轮子。
 */
const TIER_NEED = { critical: 2, normal: 1, navigation: 0, noop: 0 };
const IMAGE_RE = /\.(png|jpe?g|webp|gif)$/i;
/** 门禁口径（verify-evidence-integrity.mjs --exec / verify-queue-reconcile.mjs 的 192 就是这条正则）。 */
const GATE_TAINT_RE = /ERROR:|timeout/i;

const INPUT = positional[0];
if (!INPUT || !existsSync(INPUT)) {
  console.log("RJ_RESULT=FAIL reason=缺少或找不到 exec-results.json 参数");
  console.error("用法：node scripts/qa/readjudicate-evidence.mjs <exec-results.json> [--ops <opsDir>] [--apply] [--out f]");
  process.exit(2);
}
const OPS_DIR = resolve(flagVal("ops", resolve(dirname(resolve(INPUT)), "..", "ops")));
const SAMPLES = Math.max(0, parseInt(flagVal("samples", "2"), 10) || 0);
const APPLY = hasFlag("apply");
const OUT = resolve(flagVal("out", join(REPO, ".zcode", "tmp", "readjudicate", "exec-results.readjudicated.json")));

const toPosix = (p) => p.split(sep).join("/").replace(/\\/g, "/");
const rel = (p) => toPosix(p).startsWith(toPosix(REPO) + "/") ? toPosix(p).slice(toPosix(REPO).length + 1) : toPosix(p);

/**
 * 唯一写盘口子：先过三道守卫，任何一道不过就退出码 2 且不写半个字节。
 * 权威件在 reports/**（执行轮正在往里追加），apps/** 同样禁止；文件名等于权威件名也禁止。
 */
function assertWritable(p) {
  const s = toPosix(resolve(p));
  const root = toPosix(REPO) + "/";
  if (!s.startsWith(root)) throw new Error(`拒绝写仓库外路径：${s}`);
  const rest = s.slice(root.length);
  if (rest.startsWith("reports/")) throw new Error(`拒绝写 reports/**（执行轮正在写权威件）：${rest}`);
  if (rest.startsWith("apps/")) throw new Error(`拒绝写 apps/**：${rest}`);
  if (basename(rest) === "exec-results.json") throw new Error(`拒绝覆盖权威件文件名：${rest}`);
  if (resolve(p) === resolve(INPUT)) throw new Error(`--out 不能指向输入文件本身`);
  return rest;
}

/**
 * 剥尾注：最多 maxLayers 层、只剥**结尾**的括号串。
 * 先用 [^()]* 快速匹配（实测两种形态都走这条），残留结尾括号时再试贪婪内层，
 * 3 层还没剥净就如实报 residual=true——那是新形态，不能让工具悄悄"当成没尾注"。
 */
function stripTailNotes(raw, maxLayers = 3) {
  let base = String(raw).trim();
  const notes = [];
  let guard = 0;
  while (guard++ < maxLayers) {
    let m = /\(([^()]*)\)\s*$/i.exec(base);
    if (!m && /\)\s*$/.test(base)) m = /\((.*)\)\s*$/i.exec(base); // 尾注里套了括号（实测未出现，防御）
    if (!m) break;
    notes.push({ text: m[1], kind: noteKind(m[1]) });
    base = base.slice(0, m.index).trim();
  }
  return { base, notes, residual: /\)\s*$/i.test(base) };
}
function noteKind(t) {
  const s = String(t).trim();
  if (/^error\b/i.test(s) || /error:/i.test(s) || /\btimeout\b/i.test(s)) return "ERROR";
  if (/^\d+(\.\d+)?\s*(B|KB|MB)$/i.test(s)) return "SIZE";
  if (/^\d+$/.test(s)) return "SIZE";
  return "OTHER";
}
/** 相对路径按仓库根解析；绝对路径原样。返回 {path, via}。 */
function resolveOnDisk(p) {
  if (/^[a-z]:[\\/]/i.test(p) || p.startsWith("\\\\") || p.startsWith("/")) {
    return { path: p, via: existsSync(p) ? "abs" : "abs-missing" };
  }
  const cand = [resolve(p), resolve(REPO, p)];
  for (const c of cand) if (existsSync(c)) return { path: c, via: "rel" };
  return { path: cand[0], via: "rel-missing" };
}

// ===== tier 索引：manifest 名 + "/" + id 复合键 =====
function buildTierIndex(opsDir) {
  const idx = new Map();      // manifest/id -> {tier,...}
  const bySuite = new Map();  // suite(规划器 id)/id -> tier（执行器 suite 字段是 P-<manifest>-<seq>，另轴）
  const bareIds = new Map();  // id -> Set<manifest>（裸 id 撞车普查）
  const dupInSuite = [];      // 同一 manifest 里出现两次的 id（复合键本身也不唯一 → 权威行无法定位）
  let cases = 0, readFails = [];
  if (!existsSync(opsDir)) return { idx, bySuite, bareIds, dupInSuite, cases, files: 0, readFails, missing: true };
  const names = readdirSync(opsDir).filter((x) => x.endsWith(".json"));
  for (const f of names) {
    let j;
    try { j = JSON.parse(readFileSync(join(opsDir, f), "utf8")); } catch (e) { readFails.push(`${basename(f, ".json")}:${String(e.message).slice(0, 40)}`); continue; }
    const mf = basename(f, ".json");
    const seen = new Set();
    for (const c of j.cases ?? []) {
      if (!c || typeof c.id !== "string") continue;
      cases++;
      const key = `${mf}/${c.id}`;
      if (seen.has(c.id)) dupInSuite.push(key);
      seen.add(c.id);
      idx.set(key, { tier: String(c.tier ?? ""), evidence: String(c.evidence ?? ""), requiresReal: c.requiresReal === true, page: String(c.page ?? "") });
      if (!bareIds.has(c.id)) bareIds.set(c.id, new Set());
      bareIds.get(c.id).add(mf);
    }
  }
  return { idx, bySuite, bareIds, dupInSuite, cases, files: names.length, readFails, missing: false };
}

/**
 * 执行器 suite 字段是派生规划器 id（P-<manifest>-<两位序号>，见 r-exec.cjs 的 planSuitesFromOps），
 * 与 ops/<MANIFEST>.json 的文件名天然不同轴。复合键优先用 manifest 字段，suite 只作兜底，
 * 兜底再给一条"反推派生前缀"的路：P-PAGES-HOME-INDEX-03 → PAGES-HOME-INDEX。
 * 为什么非要复合键而不是裸 id：round-2 实测 941 行只有 911 个唯一 id，按裸 id 查 tier 会把
 * 别的 suite 的 critical 要求套到本用例上，改判就成了新的失真源。
 */
function deriveManifestFromSuite(suite) {
  const s = String(suite ?? "");
  const m = /^P-(.+)-\d{2}$/.exec(s);
  return m ? m[1] : null;
}
function lookupTier(r, index) {
  const mf = typeof r.manifest === "string" && r.manifest.trim() ? r.manifest.trim() : null;
  const tried = [];
  if (mf) tried.push([`${mf}/${r.id}`, "manifest"]);
  tried.push([`${r.suite}/${r.id}`, "suite"]);
  const derived = deriveManifestFromSuite(r.suite);
  if (derived) tried.push([`${derived}/${r.id}`, "suite-derived"]);
  for (const [k, via] of tried) {
    const t = index.idx.get(k);
    if (t) return { ...t, key: k, via };
  }
  return null;
}

const tierIdx = buildTierIndex(OPS_DIR);

// ===== 读权威件（只读）=====
let doc;
try { doc = JSON.parse(readFileSync(INPUT, "utf8")); } catch (e) {
  console.log(`RJ_RESULT=FAIL reason=结果文件不可解析 ${String(e.message).slice(0, 80)}`);
  process.exit(1);
}
const rows = Array.isArray(doc.results) ? doc.results : [];

// ===== 逐条证据 + 逐用例分类 =====
const entriesTotal = { n: 0, errorNote: 0, sizeNote: 0, otherNote: 0, residual: 0 };
const cases = [];
rows.forEach((r, rowI) => {
  const mf = typeof r.manifest === "string" && r.manifest.trim() ? r.manifest.trim() : null;
  const key = `${mf || r.suite}/${r.id}`;
  const t = lookupTier(r, tierIdx);
  const tier = (t && t.tier) || String(r.tier ?? "");
  const tierSource = t ? t.via : "row-fallback";

  const evs = Array.isArray(r.evidence) ? r.evidence : [];
  const E = [];
  for (const raw of evs) {
    if (typeof raw !== "string") { E.push({ raw: String(raw), kind: "NOT_A_STRING" }); entriesTotal.n++; continue; }
    entriesTotal.n++;
    const { base, notes, residual } = stripTailNotes(raw);
    const kinds = new Set(notes.map((x) => x.kind));
    if (kinds.has("ERROR")) entriesTotal.errorNote++;
    if (kinds.has("SIZE")) entriesTotal.sizeNote++;
    if (kinds.has("OTHER")) entriesTotal.otherNote++;
    if (residual) entriesTotal.residual++;
    const errTainted = notes.some((x) => x.kind === "ERROR");
    const anyNote = notes.length > 0;
    const isImage = IMAGE_RE.test(base);
    let kind, exists = false, path = null;
    if (isImage) {
      const rd = resolveOnDisk(base);
      exists = existsSync(rd.path);
      path = rd.path;
      kind = exists ? "IMAGE_PRESENT" : "IMAGE_MISSING";
    } else if (/\.[a-z0-9]{1,6}$/i.test(base) && !/[=<>]/.test(base.split(/[\\/]/).pop())) {
      const rd = resolveOnDisk(base);
      exists = existsSync(rd.path);
      path = rd.path;
      kind = exists ? "NONIMAGE_FILE_PRESENT" : "NONIMAGE_FILE_MISSING"; // .wxml/.json DOM 转储等真实产物：非像素
    } else {
      kind = "OBSERVATION"; // scrollPos=bottom 这类观察串
    }
    E.push({ raw, base, notes, kinds, residual, errTainted, anyNote, isImage, exists, kind, path, gate: GATE_TAINT_RE.test(raw) });
  }

  // 帧数：本工具口径把"剥完确在盘上"的帧算数（含 ERROR 尾注但文件在），并按路径去重 ——
  // 去重是必须的：不去重的话 critical 的 need=2 可以靠同一张图列两遍凑满（正是 D4 的"凑配额"失效模式）。
  const imgAll = E.filter((e) => e.isImage);
  const presentPaths = imgAll.filter((e) => e.exists).map((e) => toPosix(e.path));
  const gatePathsRaw = imgAll.filter((e) => e.exists && !GATE_TAINT_RE.test(e.raw)).map((e) => toPosix(e.path));
  const verified = new Set(presentPaths);
  const gateClean = new Set(gatePathsRaw);
  const dupPaths = presentPaths.length - verified.size;
  const hasBefore = imgAll.some((e) => e.exists && /-before\b/i.test(e.base));
  const hasAfter = imgAll.some((e) => e.exists && /-after\b/i.test(e.base));
  const okRoute = Array.isArray(r.route) && r.route.length > 0;
  const okLog = (Array.isArray(r.console) && r.console.length > 0) || String(r.observed ?? "").length > 0;
  const need = TIER_NEED[tier] === undefined ? NEED_DEFAULT : TIER_NEED[tier];
  const have = verified.size;
  const met = tier === "navigation" ? (okRoute || okLog) : tier === "noop" ? okLog : have >= need;
  // 同一行按 **D5 状态门禁的原口径**（miniprogram-qa-loop-v32.dwf.ts:692：逐条计、带 ERROR/timeout 一律不算，不去重）
  // 再判一次：两者之差才是"会被误降"的那批。注意 gateHaveRaw 故意不去重，否则就不是复述门禁会说什么，而是我的看法。
  const metGate = tier === "navigation" ? (okRoute || okLog) : tier === "noop" ? okLog : gatePathsRaw.length >= need;
  const missingEvidence = [];
  // missingEvidence 只在"这句话会驱动一次改判"时写：EXECUTED 且 tier 不达标、或 tier 够但留着死引用。
  // FAILED/SKIPPED 行帧数不足不写这里（它们没在宣称完成），只从 frames=x/y 字段读得到。
  const shortfallText = () => {
    if (tier === "navigation") return "routeOrConsole";
    if (tier === "noop") return "consoleOrObserved";
    const parts = [`pixelFrames need=${need} have=${have}`];
    if (need >= 2) { if (!hasBefore) parts.push("缺 before 帧"); if (!hasAfter) parts.push("缺 after 帧"); }
    else if (need === 1 && !hasAfter) parts.push("缺 after 帧");
    return parts.join(" / ");
  };
  if (String(r.status) === "EXECUTED" && !met) missingEvidence.push(shortfallText());

  const imgMissingWithError = E.filter((e) => e.kind === "IMAGE_MISSING" && e.errTainted);
  const imgMissingClean = E.filter((e) => e.kind === "IMAGE_MISSING" && !e.errTainted);
  const imgPresentAnnotated = E.filter((e) => e.kind === "IMAGE_PRESENT" && e.anyNote);
  const imgPresentError = E.filter((e) => e.kind === "IMAGE_PRESENT" && e.errTainted);
  const imgPresentSizeOnly = imgPresentAnnotated.filter((e) => !e.errTainted);
  const nonFileRef = E.filter((e) => !e.isImage && e.kind !== "NOT_A_STRING");
  const gateTaintedRow = E.some((e) => e.gate);
  const dead = imgMissingWithError.length + imgMissingClean.length;

  /**
   * 改判类（一用例一个主类）。顺序按"必须动状态 → 只需动字符串 → 本来就没像素"：
   *  1) NO_EVIDENCE_MISSING_FILE：证据里有图片引用但盘上不存在。tier 未满足 → 落第四等态；
   *     tier 已满足（幸存帧够数）→ 状态不动，但死引用必须留在字符串里可见 + 记 deadRefs，禁止悄悄删。
   *  2) EXECUTED_WITHOUT_TIER_EVIDENCE：没有死引用、却按 tier 交不齐（帧根本没采、navigation/noop 连路由日志都没有）。
   *     上一版把这条排在"有死引用"之后、又把"只要带大小注记"塞进 TAINTED，导致本类恒为 0 ——
   *     一个恒为 0 的失败类比没有这个类更危险，故按 spec 定义重排。
   *  3) TAINTED_BUT_FILE_PRESENT：ERROR 尾注、剥完文件确在、tier 已满足 → 保留结论，只重写证据串。
   *  4) NOT_A_FILE_REF：整个 evidence[] 没有一条图片引用（.wxml DOM 转储 / scrollPos=bottom 观察串）。
   *  5) CLEAN_EVIDENCE：tier 要求的证据齐全且真实存在（只有大小注记的也算这里，但记 rewrite=1 要净字符串）。
   */
  let cls;
  if (dead > 0) cls = "NO_EVIDENCE_MISSING_FILE"; // downgrade 与否看 met：够数就只报死引用，不动状态
  else if (String(r.status) === "EXECUTED" && !met) cls = "EXECUTED_WITHOUT_TIER_EVIDENCE";
  else if (imgPresentError.length) cls = "TAINTED_BUT_FILE_PRESENT";
  else if (imgAll.length === 0 && nonFileRef.length > 0) cls = "NOT_A_FILE_REF";
  else if (imgAll.length === 0 && nonFileRef.length === 0 && String(r.status) !== "EXECUTED") cls = "NOT_A_FILE_REF";
  else cls = "CLEAN_EVIDENCE";
  const downgrade = cls === "NO_EVIDENCE_MISSING_FILE" ? (String(r.status) === "EXECUTED" && !met) : (cls === "EXECUTED_WITHOUT_TIER_EVIDENCE" && String(r.status) === "EXECUTED");
  const rewrite = imgPresentAnnotated.length > 0; // ERROR 与大小注记都要净掉（尾注不是证据的一部分）
  if (dead > 0 && met) missingEvidence.push(`deadEvidenceRef=${dead}（图片引用剥完尾注在盘上找不到，但本 tier 帧数已够 → 状态不动、字符串保留可见）`);

  cases.push({
    rowI,
    key, suite: r.suite, manifest: mf, id: r.id, tier, tierSource, manifestTier: t ? t.tier : null,
    rowTier: String(r.tier ?? ""), status: String(r.status ?? ""), cls, met, metGate, need, have,
    gateHave: gatePathsRaw.length, gateHaveDedup: gateClean.size, dupPaths,
    missingEvidence, downgrade, rewrite, gateTaintedRow,
    n: { entries: E.length, img: imgAll.length, imgMissing: dead, deadRefs: dead,
      imgMissingClean: imgMissingClean.length, err: imgPresentError.length + imgMissingWithError.length,
      sizeOnly: imgPresentSizeOnly.length, nonFile: nonFileRef.length,
      nonImageFile: E.filter((e) => e.kind === "NONIMAGE_FILE_PRESENT" || e.kind === "NONIMAGE_FILE_MISSING").length,
      observation: E.filter((e) => e.kind === "OBSERVATION").length,
      residual: E.filter((e) => e.residual).length },
    E,
  });
});

// ===== 聚合 =====
const CLS_ORDER = ["CLEAN_EVIDENCE", "TAINTED_BUT_FILE_PRESENT", "NO_EVIDENCE_MISSING_FILE", "NOT_A_FILE_REF", "EXECUTED_WITHOUT_TIER_EVIDENCE"];
const byCls = {}; for (const c of CLS_ORDER) byCls[c] = [];
for (const c of cases) (byCls[c.cls] ??= []).push(c);
const n = (f) => cases.reduce((s, c) => s + f(c), 0);

const setGate = new Set(cases.filter((c) => c.gateTaintedRow).map((c) => c.key));                       // 192 那一口径（/ERROR:|timeout/i 命中任一证据串的用例）
const setRJ = new Set(cases.filter((c) => c.cls === "TAINTED_BUT_FILE_PRESENT" || c.cls === "NO_EVIDENCE_MISSING_FILE").map((c) => c.key));
const onlyRJ = [...setRJ].filter((k) => !setGate.has(k));
const onlyGate = [...setGate].filter((k) => !setRJ.has(k));
const caseByKey = new Map(); for (const c of cases) if (!caseByKey.has(c.key)) caseByKey.set(c.key, c);

console.log(`RJ_INPUT=${rel(resolve(INPUT))} gitSha=${doc.gitSha ?? "?"} round=${doc.round ?? "?"} updatedAt=${doc.updatedAt ?? "?"}`);
console.log(`RJ_OPS=${rel(OPS_DIR)} files=${tierIdx.files} manifestCases=${tierIdx.cases} bareIdsUnique=${tierIdx.bareIds.size} dupBareIdGroups=${[...tierIdx.bareIds.values()].filter((s) => s.size > 1).length} dupCompositeKeys=${new Set(tierIdx.dupInSuite).size}${tierIdx.missing ? " OPS_DIR_MISSING=1" : ""}`);
console.log(`RJ_ROWS=${cases.length} RJ_EVIDENCE_ENTRIES=${entriesTotal.n} NOTE_ERROR=${entriesTotal.errorNote} NOTE_SIZE=${entriesTotal.sizeNote} NOTE_OTHER=${entriesTotal.otherNote} RESIDUAL_UNSTRIPPED=${entriesTotal.residual}`);
console.log(`RJ_TIER_RESOLVED=${n((c) => c.tierSource !== "row-fallback" ? 1 : 0)} RJ_TIER_FROM_ROW_FALLBACK=${n((c) => c.tierSource === "row-fallback" ? 1 : 0)} RJ_TIER_MISMATCH=${cases.filter((c) => c.manifestTier && c.manifestTier !== c.rowTier).length} RJ_TIER_VIA=${JSON.stringify(cases.reduce((a, c) => ((a[c.tierSource] = (a[c.tierSource] || 0) + 1), a), {}))}`);
for (const c of CLS_ORDER) {
  const list = byCls[c] ?? [];
  console.log(`RJ_CLASS ${c}=${list.length} (EXECUTED 其中=${list.filter((x) => x.status === "EXECUTED").length}) entries=${list.reduce((s, x) => s + x.n.entries, 0)}`);
}
console.log(`RJ_DOWNGRADE_TO_NO_EVIDENCE=${n((c) => c.downgrade ? 1 : 0)} RJ_REWRITE_EVIDENCE_ONLY=${cases.filter((c) => c.rewrite && !c.downgrade).length} RJ_UNTOUCHED=${cases.filter((c) => !c.rewrite && !c.downgrade).length}`);
{
  const exUnmet = cases.filter((c) => c.status === "EXECUTED" && !c.met);
  console.log(`RJ_EXECUTED_TIER_UNMET=${exUnmet.length} ofWhich_HAS_DEAD_REF=${exUnmet.filter((c) => c.n.deadRefs > 0).length} ofWhich_NO_DEAD_REF=${exUnmet.filter((c) => c.n.deadRefs === 0).length}（后者才是 EXECUTED_WITHOUT_TIER_EVIDENCE：帧根本没采，不是"采了但丢了"）`);
  const gateUnmet = cases.filter((c) => c.status === "EXECUTED" && !c.metGate);
  console.log(`RJ_D5_GATE_WOULD_UNMET=${gateUnmet.length}（D5 状态门禁原口径：逐条计、带 ERROR/timeout 一律不算、不去重）vs RJ_READJUDICATED_UNMET=${exUnmet.length} → 差 ${gateUnmet.length - exUnmet.length} 条是"帧其实躺在盘上、只差没被误降"的，本工具把它们留在 EXECUTED 只重写字符串`);
  const dupTotal = n((c) => c.dupPaths);
  const dedupeDriven = cases.filter((c) => c.status === "EXECUTED" && c.met && c.have < c.need);
  console.log(`RJ_DUP_FRAME_PATHS=${dupTotal}（同一张图在一行里被列 ≥2 次：本工具按路径去重后不给它凑 tier 配额）RJ_UNMET_ONLY_AFTER_DEDUPE=${dedupeDriven.length}（"逐条够数、去重不够数"→ 这类是真凑数，必须一起看）`);
  const nonExShort = cases.filter((c) => c.status !== "EXECUTED" && !c.met);
  console.log(`RJ_NOTE_NONEXECUTED_SHORTFALL=${nonExShort.length}（FAILED/SKIPPED 行帧数不足者：不改状态也不写 missingEvidence，它们本来没在宣称完成；frames=x/y 字段仍看得到）`);
}
console.log(`RJ_DEAD_REF_ENTRIES=${n((c) => c.n.deadRefs)} ofWhich_NO_NOTE_AT_ALL=${n((c) => c.n.imgMissingClean)} (无尾注也找不到文件=纯断链，同样必须改判)`);
{
  const noAct = (byCls.NO_EVIDENCE_MISSING_FILE ?? []).filter((c) => !c.downgrade && !c.rewrite);
  console.log(`RJ_DEAD_REF_ROWS_WITHOUT_ACTION=${noAct.length}（FAILED/SKIPPED 行只有死引用、tier 不在宣称完成 → apply 不动它：把 (ERROR:timeout…) 剥成一条"看着合法却不存在"的路径只会更难查，尾注必须留在原地）`);
}
console.log(`RJ_SIZE_ONLY_CASES=${cases.filter((c) => c.n.sizeOnly > 0 && c.n.err === 0).length}（只有 (155040B) 大小注记、文件确在：门禁的 /ERROR:|timeout/ 不认，本工具仍会净掉尾注但不改状态）`);
console.log(`RJ_NOT_A_FILE_REF_ENTRIES=${n((c) => c.n.nonFile)} ofWhich_NON_IMAGE_FILE_ON_DISK=${n((c) => c.n.nonImageFile)} ofWhich_OBSERVATION_STRINGS=${n((c) => c.n.observation)}`);
{
  const l = byCls.NOT_A_FILE_REF ?? [];
  console.log(`RJ_NOT_A_FILE_REF_CASES=${l.length} ofWhich_EMPTY_EVIDENCE=${l.filter((c) => c.n.entries === 0).length} ofWhich_HAS_NON_IMAGE_REF=${l.filter((c) => c.n.nonFile > 0).length}`);
}
console.log(`RJ_GATE_EQUIV_CASES=${setGate.size} (${rows.length ? (100 * setGate.size / rows.length).toFixed(1) : 0}% of cases) RJ_TAINTED_UNIVERSE=${setRJ.size}`);
console.log(`RJ_SET_DIFF onlyInReadjudicate=${onlyRJ.length} onlyInGate=${onlyGate.length} intersection=${[...setRJ].filter((k) => setGate.has(k)).length}`);
const stray = {}; for (const r of rows) if (!["EXECUTED", "FAILED", "SKIPPED", "NO-EVIDENCE"].includes(String(r.status))) stray[r.status ?? "(空)"] = (stray[r.status ?? "(空)"] || 0) + 1;
console.log(`RJ_STATUS=${JSON.stringify(rows.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {}))} RJ_DOMAIN_VIOLATIONS=${Object.keys(stray).length ? Object.entries(stray).map(([k, v]) => k + "×" + v).join(",") : "0"}`);

// 机器可读逐用例行：默认只打"需要动手"的行（改状态或改字符串），--no-lines 全关，--list-ids 全打。
if (!hasFlag("no-lines")) {
  const want = hasFlag("list-ids") ? cases : cases.filter((c) => c.downgrade || c.rewrite || c.cls === "EXECUTED_WITHOUT_TIER_EVIDENCE" || c.n.deadRefs > 0);
  for (const c of want) {
    console.log(`RJ_CASE ${c.key} tier=${c.tier}(${c.tierSource}) status=${c.status} class=${c.cls} frames=${c.have}/${c.need} gateFramesRaw=${c.gateHave}/${c.need} entries=${c.n.entries} errNote=${c.n.err} sizeNote=${c.n.sizeOnly} deadRefs=${c.n.deadRefs} nonFileRef=${c.n.nonFile} downgrade=${c.downgrade ? 1 : 0} rewrite=${c.rewrite ? 1 : 0}${c.missingEvidence.length ? ` missingEvidence="${c.missingEvidence.join(";")}"` : ""}`);
  }
}

// 差集归因（不同就要说清口径差在哪一条规则上，不许只报个数）
const whyGateOnly = {};
for (const k of onlyGate) {
  const c = caseByKey.get(k);
  const e = c.E.find((x) => x.gate);
  const r = !e ? "无匹配证据条目"
    : e.residual ? "括号 >3 层未剥净（新形态，需人工看）"
    : !e.isImage ? `门禁命中的串不是图片引用（kind=${e.kind}）→ 本工具按"不算像素证据"处理`
    : e.kind === "IMAGE_PRESENT" ? "?! 图片在盘上却没进 TAINTED 类（分类器 bug，必须查）"
    : "?! 图片不在盘上却没进 NO_EVIDENCE 类（分类器 bug，必须查）";
  whyGateOnly[r] = (whyGateOnly[r] || 0) + 1;
}
const whyRJOnly = {};
for (const k of onlyRJ) {
  const c = caseByKey.get(k);
  const r = c.n.err > 0 ? "ERROR 类尾注但门禁正则 /ERROR:|timeout/ 没命中（写法差异，如缺冒号）"
    : c.n.deadRefs > 0 ? "死引用（剥完尾注文件不在）但整串无 ERROR/timeout 字样 → 纯断链，门禁看不见"
    : "其他尾注";
  whyRJOnly[r] = (whyRJOnly[r] || 0) + 1;
}
if (onlyGate.length) console.log(`RJ_ONLY_IN_GATE_WHY ${Object.entries(whyGateOnly).map(([k, v]) => `${k}=${v}`).join(" | ")} samples=${onlyGate.slice(0, 6).join(",")}`);
if (onlyRJ.length) console.log(`RJ_ONLY_IN_READJUDICATE_WHY ${Object.entries(whyRJOnly).map(([k, v]) => `${k}=${v}`).join(" | ")} samples=${onlyRJ.slice(0, 6).join(",")}`);
if (!onlyGate.length && !onlyRJ.length) console.log("RJ_SET_IDENTICAL=1（与门禁口径在本快照上完全同一集合）");

// 人类样例：每类 SAMPLES 条，且尽量挑"形态不同"的（同一类里全给 after.png 样例等于没给第二种坑）
function shapeOf(c) {
  const k = c.E.map((e) => `${e.kind}:${e.notes.map((v) => v.kind).join("+") || "-"}`).sort().join(",");
  return k || "(empty)";
}
const PREF = {
  CLEAN_EVIDENCE: (c) => (c.n.sizeOnly > 0 ? 2 : 0) + (c.n.nonImageFile > 0 ? 1 : 0),
  TAINTED_BUT_FILE_PRESENT: (c) => (c.n.err > 0 ? 1 : 0) + (c.have >= c.need ? 1 : 0),
  NO_EVIDENCE_MISSING_FILE: (c) => (c.downgrade ? 3 : 1) + (c.n.sizeOnly > 0 ? 1 : 0),
  NOT_A_FILE_REF: (c) => (c.n.observation > 0 ? 3 : 0) + (c.n.nonImageFile > 0 ? 2 : 0) - (c.n.entries === 0 ? 1 : 0),
  EXECUTED_WITHOUT_TIER_EVIDENCE: (c) => (c.n.entries === 0 ? 2 : 1),
};
for (const cls of CLS_ORDER) {
  const list = byCls[cls] ?? [];
  console.log(`RJ_SAMPLES ${cls} n=${list.length}`);
  const seen = new Set();
  const picked = [];
  for (const x of [...list].sort((a, b) => (PREF[cls]?.(b) ?? 0) - (PREF[cls]?.(a) ?? 0))) {
    const s = shapeOf(x);
    if (seen.has(s) && picked.length) continue;
    seen.add(s); picked.push(x);
    if (picked.length >= Math.max(1, SAMPLES)) break;
  }
  for (const x of picked) {
    const show = x.E.filter((e) => e.anyNote || !e.isImage).slice(0, 3);
    console.log(`  ${x.key} tier=${x.tier}(${x.tierSource}) status=${x.status} frames=${x.have}/${x.need} gateFramesRaw=${x.gateHave}${x.missingEvidence.length ? ` missingEvidence="${x.missingEvidence.join(";")}"` : ""}`);
    for (const e of show) console.log(`    [${e.kind}${e.notes.length ? " notes=" + e.notes.map((v) => v.kind).join("+") : ""}] ${e.raw.slice(0, 160)}${e.isImage ? " ⇒ 剥后 basename=" + (e.base.split(/[\\/]/).pop() || "") + (e.exists ? " (在盘上)" : " (盘上没有)") : ""}`);
    if (!show.length && x.E.length) console.log(`    ${x.E.slice(0, 2).map((e) => `[${e.kind}] ${e.raw.slice(0, 150)}`).join("\n    ")}`);
    if (!x.E.length) console.log(`    (evidence[] 为空：${x.n.entries} 条)`);
  }
}

// ===== apply（默认关闭；只写新文件）=====
let applyError = null;
if (APPLY) {
  try { assertWritable(OUT); } catch (e) { applyError = String(e.message || e); }
}
if (APPLY && applyError) {
  console.log(`RJ_APPLY=REFUSED reason=${applyError}`);
} else if (APPLY) {
  const changed = [];
  const caseByRow = new Map(cases.map((c) => [c.rowI, c])); // 按行号回指，避免同 suite+id 的重复行错配
  const outRows = rows.map((r, i) => {
    const c = caseByRow.get(i);
    if (!c) return r;                     // 没进 case 索引的行原样交回，由下面的守恒检查抓出来
    const deadCount = (c.E || []).filter((e) => /MISSING/.test(String(e.kind))).length;
    // 旧版只处理 downgrade/rewrite 两类行，结果 FAILED/SKIPPED 行里的死引用一条都没搬走
    // （守恒检查实测抓到 65 条）。"不存在的文件不得当证据"是无条件的，与这行结论是什么无关。
    if (!c.downgrade && !c.rewrite && deadCount === 0) return r;
    const nr = { ...r };
    const before = (r.evidence ?? []).slice();
    // 盘上不存在的路径**不再留在 evidence[] 里**（旧版"原样留着以求可见"是个坏折衷：
    // 每一个下游消费者都得自己重做一遍存在性判断，这个洞正是这样一路扩散到权威件里的；
    // round-6 的 556 行快照 apply 之后仍剩 258 条死引用，就是那次折衷的直接代价）。
    // 可见性改由两处保证：missingEvidence[] 逐条带原串，readjudication.evidenceBefore 留全量原文。
    const dead = c.E.filter((e) => /MISSING/.test(String(e.kind)));
    const kept = c.E.filter((e) => !/MISSING/.test(String(e.kind)));
    nr.evidence = kept.map((e) => (e.anyNote && e.kind === "IMAGE_PRESENT" ? e.base : e.raw));
    nr.missingEvidence = [].concat(c.missingEvidence || [], dead.map((e) => "deadEntry=" + e.raw));
    nr.readjudication = {
      at: new Date().toISOString(), by: "scripts/qa/readjudicate-evidence.mjs", class: c.cls,
      statusBefore: c.status, tier: c.tier, tierSource: c.tierSource,
      framesVerified: c.have, framesRequired: c.need,
      action: c.downgrade ? "DOWNGRADE_TO_NO_EVIDENCE" : (c.rewrite ? "STRIP_TAIL_NOTES" : "MOVE_DEAD_TO_MISSING"),
      missingEvidence: c.missingEvidence,
      // 原串一律留档：改判后的文件必须能反过来核对"当时到底写了什么"，
      // 否则这份新文件自身就成了第二个不可复核的权威件（历史上"证据被静默改写"就是这么来的）。
      evidenceBefore: before,
    };
    if (c.downgrade) { nr.status = "NO-EVIDENCE"; nr.missingEvidence = [].concat(nr.missingEvidence || [], c.missingEvidence || []); }
    changed.push({ key: c.key, from: c.status, to: nr.status, cls: c.cls, act: nr.readjudication.action, rewrote: before.filter((b, i) => b !== nr.evidence[i]).length, missing: c.missingEvidence });
    return nr;
  });
  const out = { ...doc, results: outRows, readjudicatedAt: new Date().toISOString(), readjudicatedBy: "scripts/qa/readjudicate-evidence.mjs", readjudicatedSource: rel(resolve(INPUT)), readjudicatedInputUpdatedAt: doc.updatedAt ?? null };
  // 落盘前的自守恒：改判的意义就是"不存在的文件不再当证据"，如果输出里还数得出死引用，
  // 那这份输出本身又是一个不可复核的权威件——宁可不写。
  let deadLeft = 0, deadLeftSample = [];
  for (const rr of outRows) for (const e of evList(rr)) {
    const s = String(e);
    if (!/^[A-Za-z]:[\\/]/.test(s.split("(")[0]) && !s.startsWith("/")) continue;
    const pth = s.replace(/\((\d+)B\)\s*$/, "").replace(/\s*\(ERROR:[^)]*\)\s*$/, "");
    if (/\.(png|wxml|json|jpg|jpeg)$/i.test(pth)) {
      let ok = false; try { ok = statSync(pth).isFile() && statSync(pth).size > 0; } catch { ok = false; }
      if (!ok) { deadLeft++; if (deadLeftSample.length < 3) deadLeftSample.push(String(rr.id) + "|" + pth.slice(-58)); }
    }
  }
  if (deadLeft > 0) {
    console.log(`RJ_APPLY_CONSERVATION=FAIL 输出里仍有 ${deadLeft} 条指向不存在文件的证据，样本：${deadLeftSample.join("  ")}`);
    console.log("RJ_APPLY=REFUSED reason=守恒未过，未写出文件（输入也未动）");
    process.exitCode = 2;
  } else {
    console.log(`RJ_APPLY_CONSERVATION=OK 输出 evidence[] 内死引用=0（原串逐条留在 missingEvidence/readjudication.evidenceBefore）`);
    mkdirSync(dirname(resolve(OUT)), { recursive: true });
    writeFileSync(resolve(OUT), JSON.stringify(out, null, 2) + "\n");
    // 这三行必须在"真的写了"那个分支里：上一版把它们留在分支外，
    // 于是拒绝落盘的那次运行照样打印了 RJ_APPLY=WROTE —— 输出自己撒了谎，比不打印更糟。
    console.log(`RJ_APPLY=WROTE ${rel(resolve(OUT))} inputUntouched=1 rows=${outRows.length}`);
    console.log(`RJ_APPLY_SUMMARY changed=${changed.length} statusDowngraded=${changed.filter((x) => x.act === "DOWNGRADE_TO_NO_EVIDENCE").length} evidenceRewrittenOnly=${changed.filter((x) => x.act === "STRIP_TAIL_NOTES").length} deadMovedOnly=${changed.filter((x) => x.act === "MOVE_DEAD_TO_MISSING").length} entriesStripped=${changed.reduce((s, x) => s + x.rewrote, 0)}`);
    changed.slice(0, Math.max(SAMPLES, 5)).forEach((x) => console.log(`RJ_APPLY_DIFF ${x.key} ${x.from}->${x.to} class=${x.cls} action=${x.act} entriesStripped=${x.rewrote}${x.missing.length ? " missing=" + x.missing.join(";") : ""}`));
  }
} else {
  console.log("RJ_APPLY=OFF（干跑：未写任何文件；加 --apply 且 --out 落在 reports/** 之外才会写）");
}

console.log("RJ_RESULT=DONE（改判建议仅供参考，是否落盘由主编排层决定）");
process.exit(applyError ? 2 : 0);
