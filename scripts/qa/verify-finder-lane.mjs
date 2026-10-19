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
 * ── CLEAN_VERDICT 出口（用户裁定加上的第二条腿）──────────────────────────────
 * 原判点只认一条路：每张可用帧必须被 ≥1 条缺陷卡覆盖。收口门 verify-fidelity-closeout 却要求
 * 末轮新增缺陷=0 ⇒ 两条互相排斥，"末轮全绿"在构造上永远拿不到（上一程 FIDELITY_CLOSEOUT_RESULT=FAIL
 * 的 newdefects 就是撞这个：帧要么有缺陷（收口红），要么没缺陷（本门红），没有第三条路）。
 * 于是加 `## CLEAN` 卡型：允许判"这帧确实没问题"，但**出口比缺陷卡更贵**——必须把该帧在全部 12 条
 * 可测轴上逐条核对过、每条轴都给出实测读数，否则不算覆盖。伪造或漏轴的 CLEAN 一律作废，
 * 该帧退回"未被任何卡覆盖"判红。四条复核（帧哈希/源码引用/轴词表/严重度类别）对缺陷卡**照旧不放松**。
 *
 * 卡型（逐字照抄即可过；轴名必须来自 AXES 词表，一条不缺）：
 *   ## CLEAN <给人看的标题>
 *   - frame: tmp/qa/frames/R4/real-f0677920/pages__home__index__top.png   # 逐字来自清单且该帧可用
 *   - frame_hash: 1009278d182a4c7b                                        # 逐字等于清单 sha16
 *   - compared_to: 素材/理想效果图/首页.png                                # 仓内相对路径，文件必须真实存在
 *   - axes: 位置=表单顶边 y=96rpx(取样 vs 首页.png:96); 尺寸比例=卡片 340x220rpx(理想 340x220);
 *           颜色token=#FF6B81(与理想图取样同值); 圆角=16rpx(理想 16rpx); 字号=28rpx(理想 28rpx);
 *           间距=左右 24rpx(理想 24rpx); 素材缺失=0 个 404(全 200); 空态文案=「一起走过的日子」逐字同;
 *           层级遮挡=z-index 最高 10 未压内容(@index.wxss:44); 可达性=4/4 热区≥88rpx;
 *           文案=标题「校园匹配」与理想图逐字同; 需新建=理想图 6 个入口全部已实现
 *
 * 用法：node scripts/qa/verify-finder-lane.mjs --lane <lane.md> --manifest <sweep-manifest.json>
 *      node scripts/qa/verify-finder-lane.mjs --self-test
 * 退出码：0 配额与判点全中；1 有违规；2 输入读不到（泳道/清单缺，或字段格式整体不对）。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, statSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "FINDERLANE_RESULT";

/** 封闭词表：只收"能在帧上量出来"的轴。刻意不含 观感/风格/建议 这类词。 */
const AXES = new Set(["位置", "尺寸比例", "颜色token", "圆角", "字号", "间距", "素材缺失", "空态文案", "层级遮挡", "可达性", "文案", "需新建"]);
const SEVERITIES = new Set(["P0", "P1", "P2", "P3"]);
const CATEGORIES = new Set(["CSS/token", "单页", "需新建目标功能"]);

/* ── CLEAN 卡的判据件（出口比缺陷卡更贵，所以这里全是收口不是放宽）── */
/* 轴名做成"最长优先"的交替式：词表里 空态文案 含 文案，短的排前面会把"空态文案=x"切成"文案=x"，
   于是 空态文案 白送缺失、文案 白拿一条读数 ⇒ 必须按长度降序。 */
const AXIS_ALT = [...AXES]
  .sort((a, b) => b.length - a.length)
  .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
/** 一行一条轴：`- 轴=读数` / `轴: 读数` 都收（等号、半/全角冒号都算） */
const AXIS_LINE_ONE_RE = new RegExp(`^\\s*(?:[-*]\\s*)?(?:${AXIS_ALT})\\s*[:：=＝]`);
const AXIS_PIECE_RE = new RegExp(`^(${AXIS_ALT})\\s*[:：=＝]\\s*(.*)$`);
/* 卡自己的字段行与标题行不参与逐轴扫描：`- frame:` / `- compared_to:` 这类含冒号的行
   若不先排掉，会被当成"形状像 轴=读数 却不在词表"的假条目，把好卡判死。 */
const CARD_FIELD_LINE_RE = /^\s*(?:[-*]\s*)?[A-Za-z_]\w*\s*[:：]/;

/* 空话黑名单：这些词单独构成读数时，等价于"没看"。整句归一化后命中即作废（不是扣分）。 */
const PROSE_EMPTY = new Set([
  "无问题", "无异常", "没问题", "没异常", "未发现问题", "发现问题", "未发现异常", "未见异常",
  "正常", "常规", "良好", "挺好", "不错", "ok", "okey", "行", "可以", "没问题ok",
  "看不出", "看不出问题", "看不出来", "无法判断", "不知道", "没看出", "没看出来", "未测", "没测",
  "待测", "待补", "待确认", "略", "同上", "同前", "无", "没有", "无缺", "不缺", "一致", "完全一致",
  "基本一致", "大致一致", "大体一致", "差不多", "差不多一致", "符合要求", "符合预期", "符合设计",
  "符合规范", "没有问题", "无明显问题", "无明显异常", "无明显差异", "n/a", "na", "null", "none",
  "-", "—", "…", "?", "？", "观感好", "观感佳", "观感良好", "整体良好", "建议无", "无需修改", "无需新建",
]);
/* 读数必须带量测标记：数字 / hex 色值 / 长度单位 / 逐字引号里的文案 / 可回抓的源码行。
   "与理想图一致"是结论不是读数 ⇒ 没有标记 ⇒ 作废。 */
const MEASURE_RE = /(?:\d|#[0-9a-fA-F]{3,8}\b|(?:px|rpx|rem|em|vh|vw|%|°|dp)\b|[「」『』“”"']|\.(?:vue|ts|js|mjs|cjs|scss|css|json|wxss|wxml):)/;
const CLEAN_HEADER_RE = /^##\s+CLEAN(?:[ _-]?VERDICT)?\b/i;

/** 空话归一化：去掉空白与中英标点后再比黑名单（"无问题。" "「无问题」" 都算同一句空话） */
function normalizeReading(v) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/[\s　。．.，,、；;：:！!？?~～\-—…“”"'''()（）\[\]【】《》<>「」『』]+/g, "");
}

/** 单条轴读数是否算"实测值"。返回 ""=可用，否则是不予采信的原因 */
function readingReject(axis, reading) {
  const raw = String(reading == null ? "" : reading).trim();
  if (!raw) return `${axis} 读数为空`;
  const norm = normalizeReading(raw);
  if (!norm) return `${axis} 读数只有标点`;
  if (PROSE_EMPTY.has(norm)) return `${axis} 读数是空话「${raw}」⇒ 不是实测值`;
  if (!MEASURE_RE.test(raw)) return `${axis} 读数「${raw}」没有任何实测标记（数字/hex 色值/长度单位/逐字引号/源码行）⇒ 结论不是读数`;
  if (new RegExp(`^(${AXIS_ALT})$`).test(norm)) return `${axis} 读数只是轴名复述`;
  return "";
}

/**
 * 从 CLEAN 段里抠逐轴读数。三种写法都必须等价可用（模板里换了行不该把轴判没）：
 *   A. `- axes: 轴=读数; 轴=读数; …`（一行写完）
 *   B. `- axes: 轴=读数; …` 后面续行 `  轴=读数; …`（长行折行，分号仍在）
 *   C. 每条轴各占一行 `- 轴: 读数`
 * 返回 [{axis, reading, raw}]（轴名不在词表但形状是 `xxx=yyy` 的条目以 axis="" 带出来，交调用方点名）。
 */
function parseAxisEntries(block) {
  const out = [];
  const seenRaw = new Set();
  const addPiece = (piece) => {
    const p = String(piece).trim();
    if (!p) return;
    if (seenRaw.has(p)) return;
    const m = p.match(AXIS_PIECE_RE);
    if (m) { seenRaw.add(p); out.push({ axis: m[1], reading: String(m[2] || "").trim(), raw: p }); return; }
    /* 形状像"键=值"却不在词表 ⇒ 这是要顶轴位的假条目，必须点名，不能悄悄吞掉 */
    if (/[=:：=＝]/.test(p) && !/^\s*[-*]?\s*axes\s*$/i.test(p)) { seenRaw.add(p); out.push({ axis: "", reading: "", raw: p }); return; }
    /* 否则视为上一条读数的折行续写（markdown 里常见的软换行） */
    const last = out[out.length - 1];
    if (last && last.axis) { last.reading = (last.reading + " " + p).trim(); last.raw = (last.raw + " " + p).trim(); }
  };
  for (const line of String(block).split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const axesField = line.match(/^\s*(?:[-*]\s*)?axes\s*[:：]\s*(.*)$/i);
    if (axesField) { for (const piece of axesField[1].split(/[;；|]+/)) addPiece(piece); continue; }
    if (AXIS_LINE_ONE_RE.test(line)) {
      const body = line.replace(/^\s*(?:[-*]\s*)?/, "");
      for (const piece of body.split(/[;；|]+/)) addPiece(piece);
      continue;
    }
    if (CARD_FIELD_LINE_RE.test(line)) continue;
    addPiece(line);
  }
  return out;
}

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
  /* --lane 既收单张卡也收整轮的目录。原契约只收文件，我按 R1 的直觉传了目录 ⇒
     readFileSync 抛 EISDIR，而这条腿的退出码被管道吃掉（tail 的 0 被当成门绿）。
     收目录时把卡拼起来判，跨泳道的 defect_id 重复才能被同一把尺数出来；
     任务书 *.brief.md 不是卡，必须按文件名排除（aggregate-defects 栽过同一处）。 */
  let lane;
  if (statSync(lanePath).isDirectory()) {
    const cards = readdirSync(lanePath).filter((f) => f.endsWith(".md") && !/\.brief\.md$/i.test(f)).sort();
    if (!cards.length) return { problems: [`泳道目录里一张卡都没有 ${lanePath}（空扫描集不得判"配额达标"）`], stats: null };
    lane = cards.map((f) => readFileSync(join(lanePath, f), "utf-8")).join("\n");
  } else lane = readFileSync(lanePath, "utf-8");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const framesByPath = new Map();
  for (const rec of (manifest.results || [])) {
    for (const f of (rec.frames || [])) framesByPath.set(String(f.path).split("\\").join("/"), f);
  }

  const chunks = ("\n" + lane).split(/\n(?=##\s+(?:FRAME|CLEAN))/);
  const sections = chunks.filter((s) => /^##\s+FRAME\s/.test(s));
  const cleanSections = chunks.filter((s) => CLEAN_HEADER_RE.test(s));
  if (!sections.length && !cleanSections.length) return { problems: ["泳道件里一个 `## FRAME` 或 `## CLEAN` 段都没有 ⇒ 配额无从谈起（空手交件）"], stats: null };
  /* 末轮"全干净"的合法形状（0 张缺陷卡、只有 CLEAN 卡）在这里放行，由逐轴复核 + 覆盖配额决定生死——
     旧版把"没有 FRAME 段"一律判成空手交件，于是本门与收口门（末轮新增缺陷=0）构造上互斥。
     注意：这不是放宽，只有 12 轴全给实测读数的 CLEAN 才算覆盖，伪造就退回未覆盖判红。 */

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
  const referenced = new Set(); /* 卡里真点到过的帧路径（用于"每帧至少一条"的分母） */
  for (const [header, secs] of groups) {
    if (!framesByPath.has(header)) { unlisted += secs.length; problems.push(`FRAME 段指向清单里没有的帧：${header}（${secs.length} 段）⇒ 帧路径必须逐字来自 sweep-manifest`); continue; }
    framesSeen++;
    referenced.add(header);
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
  /* 分母必须是**清单里的可用帧**，不是"卡里提到了几张帧"。
     R2b 实测：L02 交件只有一个 20 字节的标题（泳道却自述"21 张卡已交付"），
     旧判点把 frames 读成 framesSeen ⇒ 那 4 张帧压根没进分母，配额"每帧≥1缺陷"照样 0 违规通过。
     漏审与审过但没 finding 是两回事，前者必须当场红。 */
  const usableFrames = [...framesByPath.entries()].filter(([, f]) => Number(f.bytes) > 3000 && !f.landingMismatch && !f.belowFloor);
  const usableByPath = new Map(usableFrames);

  /* ── CLEAN 卡逐轴复核：只有把 12 条可测轴全部点名、每条都给出实测读数的帧，才允许判"干净" ──
     判点顺序（任何一条不过 ⇒ 整张卡作废、该帧退回"未被覆盖"）：
       a. frame: 必填，且逐字来自清单，且该帧在清单里**可用**（bytes>3000 且无 landingMismatch/belowFloor）
       b. frame_hash: 必填，逐字等于清单 sha16（这是"这张图真被打开过"的唯一凭据，抓不到就红）
       c. compared_to: 必填，仓内相对路径，文件必须真实存在（没跟理想图比过的"干净"不成立）
       d. axes: 12 轴一条不缺、无重复、无轴外名；每条读数非空、不是空话黑名单、且带实测标记
       e. 跨帧复制检测：两张 CLEAN 卡的逐轴读数一字不差 ⇒ 后那张作废（那不是逐帧核对，是Ctrl+C） */
  const cleanCovered = new Set();
  const cleanRejects = [];
  const axesSigByFrame = new Map();
  let cleanIdx = 0;
  for (const sec of cleanSections) {
    cleanIdx++;
    const title = String(sec.split(/\r?\n/)[0] || "").replace(/^##\s+CLEAN(?:[ _-]?VERDICT)?\s*/i, "").trim() || `(第 ${cleanIdx} 张)`;
    const f = parseFields(sec);
    const why = [];
    const frame = String(f.frame || "").trim().split("\\").join("/");
    if (!frame) why.push("缺 `frame:`（CLEAN 卡必须逐字写清单里的帧路径）");
    else if (!framesByPath.has(frame)) why.push(`frame="${frame}" 不在取景清单 ⇒ 无中生有的帧不能判干净`);
    else if (!usableByPath.has(frame)) {
      const t = framesByPath.get(frame);
      why.push(`frame="${frame}" 在清单里但**不可用**（bytes=${t.bytes} landingMismatch=${!!t.landingMismatch} belowFloor=${!!t.belowFloor}）⇒ 废帧的"干净"不算审过`);
    }
    const claimedHash = String(f.frame_hash || "").trim().toLowerCase();
    const truth = framesByPath.get(frame);
    const sha16 = String(truth && truth.contentHash ? truth.contentHash : "").toLowerCase();
    if (!claimedHash) why.push("缺 `frame_hash:`（没有哈希=没打开过这张图）");
    else if (!sha16) why.push(`清单里 ${frame || "(无 frame)"} 没有 contentHash ⇒ 无法复核`);
    else if (claimedHash !== sha16.slice(0, 16) && claimedHash !== sha16) {
      why.push(`frame_hash="${claimedHash}" 与清单 sha16="${sha16.slice(0, 16)}" 不逐字相等 ⇒ 这张帧没被真打开过（或 hash 是从别的帧抄来的）`);
    }
    const cmp = String(f.compared_to || "").trim().split("\\").join("/");
    if (!cmp) why.push("缺 `compared_to:`（没跟理想效果图比过的『干净』不成立）");
    else if (/^(?:[a-zA-Z]:[\\/]|[\\/])/.test(cmp)) why.push(`compared_to="${cmp}" 是绝对路径 ⇒ 必须是仓内相对路径，否则换台机器就复核不到`);
    else if (!existsSync(join(REPO, cmp)) || !statSync(join(REPO, cmp)).isFile()) why.push(`compared_to="${cmp}" 在仓内不存在 ⇒ 理想效果图必须真实存在`);

    const entries = parseAxisEntries(sec);
    const got = new Map();
    for (const e of entries) {
      if (!e.axis) { why.push(`axes 里有条目「${e.raw}」不是"轴=实测读数"形状（轴名必须逐字取词表）`); continue; }
      if (!AXES.has(e.axis)) { why.push(`axes 里的「${e.axis}」不在可测轴词表 ⇒ 词表是封闭的，自创轴顶不了配额`); continue; }
      const rej = readingReject(e.axis, e.reading);
      if (rej) { why.push(`轴 ${e.axis} 不予采信：${rej}`); continue; }
      if (got.has(e.axis) && got.get(e.axis) !== e.reading) why.push(`轴 ${e.axis} 写了两条不同读数 ⇒ 自相矛盾，整卡作废`);
      got.set(e.axis, e.reading);
    }
    const missing = [...AXES].filter((a) => !got.has(a));
    if (missing.length) why.push(`漏了 ${missing.length}/12 条轴未给实测读数：${missing.join("、")}`);
    const key = [...got.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([a, r]) => `${a}=${r}`).join("|");
    if (!missing.length) {
      for (const [prevFrame, prevKey] of axesSigByFrame) {
        if (prevKey === key && prevFrame !== frame) { why.push(`逐轴读数与帧 ${prevFrame} 的 CLEAN 卡一字不差 ⇒ 复制粘贴，不是逐帧核对`); break; }
      }
    }

    if (why.length) {
      cleanRejects.push({ frame: frame || title, why });
      problems.push(`CLEAN 卡作废【${title}｜frame=${frame || "(空)"}】：${why.join("；")} ⇒ 该帧退回"未被任何卡覆盖"`);
      continue;
    }
    axesSigByFrame.set(frame, key);
    cleanCovered.add(frame);
  }

  const uncovered = usableFrames.filter(([p]) => !referenced.has(p) && !cleanCovered.has(p));
  for (const [p] of uncovered.slice(0, 12)) { quotaViolations++; problems.push(`帧未被任何缺陷卡覆盖：${p} ⇒ 本轮要求每张截图至少指出一个问题，这张一条都没有（漏审，不是"没问题"；确无问题请出合规 CLEAN 卡）`); }
  if (uncovered.length > 12) problems.push(`…另有 ${uncovered.length - 12} 张同样未被覆盖（逐条已在上面截断，计数已并入配额）`);
  const stats = { framesSeen, framesUsable: usableFrames.length, uncovered: uncovered.length, defectCount, hashBad, citeBad, axisBad, quotaViolations, unlisted, cleanCards: cleanCovered.size, cleanRejected: cleanRejects.length, cleanSections: cleanSections.length };
  return { problems, stats, cleanRejects };
}

function report(problems, stats, extra, cleanRejects) {
  for (const p of problems) console.error(`FINDERLANE_PROBLEM ${p}`);
  for (const r of cleanRejects || []) for (const w of r.why) console.error(`FINDERLANE_CLEAN_REJECT frame=${r.frame} 原因=${w}`);
  if (stats) {
    console.log(`FINDERLANE_STATS frames=${stats.framesSeen} 可用帧=${stats.framesUsable} 未被覆盖=${stats.uncovered} defects=${stats.defectCount} quota_violation=${stats.quotaViolations} hash_mismatch=${stats.hashBad} ungrepable_citations=${stats.citeBad} axis_invalid=${stats.axisBad} frames_not_in_manifest=${stats.unlisted}`);
    /* CLEAN_CARDS=被采信（12 轴全给实测读数、哈希/理想图/可用性全中）的卡数，也就是从"未覆盖"
       转成"已覆盖"的帧数；CLEAN_REJECTED=被拒的伪 CLEAN，逐条原因已在上面点名。两个读数都独立成行，
       好让收口门与人工都能一眼分清真干净和糊上去的干净。 */
    console.log(`CLEAN_CARDS=${stats.cleanCards} CLEAN_REJECTED=${stats.cleanRejected} CLEAN_SECTIONS=${stats.cleanSections} CLEAN_COVERED_FRAMES=${stats.cleanCards}`);
  }
  console.log(problems.length ? `${RK}=FAIL ${extra || ""} problems=${problems.length}` : `${RK}=PASS ${extra || ""} 配额=每帧≥1缺陷卡或合规 CLEAN 卡 且四条复核全中`);
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

  /* ── CLEAN 卡腿：出口很贵，伪造必须红，合规必须把帧从"未覆盖"翻成"已覆盖" ──
     另起一份两帧清单（MP2）：FRAME_A 由缺陷卡覆盖、FRAME_B 只由 CLEAN 卡覆盖。
     去掉 CLEAN 卡 ⇒ FRAME_B 未覆盖（红）；补上合规 CLEAN 卡 ⇒ 覆盖达成（绿）。
     这一对是阳性对照——它证明我没把门改成"CLEAN 一律不算"的恒红形状。
     每条负例还额外断言"红得对不对"（reasonRe 必须点名本判点），防止靠别的帧未覆盖蒙红。 */
  const FRAME_B = "tmp/qa/frames/SELF/real-selftest/home__top.png";
  const FRAME_C = "tmp/qa/frames/SELF/real-selftest/home__bottom.png";
  const HASH_B = "beef56781234abcd";
  const HASH_C = "cafe000011112222";
  const frrec = (path, hash, bytes, extra) => ({ route: "pages/home/index", state: String(path).split("__").pop(), path, contentHash: hash, bytes, ...(extra || {}) });
  const writeMp = (name, frames) => { const p = join(scratch, name); writeFileSync(p, JSON.stringify({ results: [{ route: "pages/home/index", frames }] }, null, 2), "utf-8"); return p; };
  const MP2 = writeMp("manifest-2.json", [frrec(FRAME_A, HASH_A, 9000), frrec(FRAME_B, HASH_B, 9000)]);
  const MP3 = writeMp("manifest-3.json", [frrec(FRAME_B, HASH_B, 9000)]);
  const MP4 = writeMp("manifest-4.json", [frrec(FRAME_A, HASH_A, 9000), frrec(FRAME_B, HASH_B, 120)]);
  const MP5 = writeMp("manifest-5.json", [frrec(FRAME_A, HASH_A, 9000), frrec(FRAME_B, HASH_B, 9000), frrec(FRAME_C, HASH_C, 9000)]);

  /* compared_to 必须是仓内真实存在的图 ⇒ 用盘上夹具 tmp/qa/fixtures/finderclean/（不落盘这条腿就复现不了） */
  const IDEAL = "tmp/qa/fixtures/finderclean/ideal-home.png";
  if (!existsSync(join(REPO, IDEAL))) { console.error(`FINDERLANE_SELF CLEAN 夹具缺失：${IDEAL} ⇒ 这条腿无法自证（先落盘 tmp/qa/fixtures/finderclean/ideal-home.png）`); problems++; }
  const ALL_AXES = [
    "位置=卡片左上角 (24,120)rpx 与理想图取样同值",
    "尺寸比例=卡片 340x220rpx(理想 340x220)",
    "颜色token=#FF6B81(取样 vs 理想图同值)",
    "圆角=16rpx(理想 16rpx)",
    "字号=标题 32rpx(理想 32rpx)",
    "间距=左右 24rpx 行距 16rpx(理想 24/16)",
    "素材缺失=0 个 404(21/21 全 200)",
    "空态文案=「一起走过的日子」逐字同",
    "层级遮挡=最高 z-index 10 未压内容(scripts/qa/verify-finder-lane.mjs:44)",
    "可达性=4/4 热区≥88rpx",
    "文案=标题「校园匹配」逐字同",
    "需新建=理想图 6 个入口全部已实现",
  ];
  const cleanCard = (frame, hash, axes, comparedTo = IDEAL) => `## CLEAN ${frame.split("/").pop()}
- frame: ${frame}
- frame_hash: ${hash}
- compared_to: ${comparedTo}
- axes: ${axes.join("; ")}
`;
  const defectForA = `## FRAME ${FRAME_A}
- frame_hash: ${HASH_A}
- defect_id: MPFID-CLEAN-011
- axis: 间距
- severity: P1
- fix_category: 单页
- source_citation: ${goodCit}
`;
  const validCleanB = cleanCard(FRAME_B, HASH_B, ALL_AXES);
  /* 散文空话变异：轴名一条不缺（数量凑满 12 条），读数换成"没打开图也能写"的词 */
  const PROSE_WORDS = { 位置: "无问题", 尺寸比例: "看不出", 颜色token: "OK", 圆角: "正常", 字号: "一致", 间距: "基本一致", 素材缺失: "没有", 空态文案: "待补", 层级遮挡: "同上", 可达性: "略", 文案: "无", 需新建: "未发现异常" };
  const proseCard = cleanCard(FRAME_B, HASH_B, ALL_AXES.map((a) => `${a.split("=")[0]}=${PROSE_WORDS[a.split("=")[0]] || "无问题"}`));
  const bulletCleanB = `## CLEAN home__top（逐行写法）
- frame: ${FRAME_B}
- frame_hash: ${HASH_B}
- compared_to: ${IDEAL}
${ALL_AXES.map((a) => `- ${a.replace(/=/, ": ")}`).join("\n")}
`;
  const cleanCases = [
    ["①CLEAN 缺 3 条轴必须红", defectForA + cleanCard(FRAME_B, HASH_B, ALL_AXES.filter((a) => !/^(圆角|字号|间距)=/.test(a))), MP2, true, /漏了 3\/12 条轴未给实测读数：圆角、字号、间距/],
    ["②frame_hash 与清单不符必须红", defectForA + cleanCard(FRAME_B, "0000000000000000", ALL_AXES), MP2, true, /frame_hash="0{16}" 与清单 sha16="beef56781234abcd" 不逐字相等/],
    ["③轴值写成散文空话必须红", defectForA + proseCard, MP2, true, /读数是空话「无问题」/],
    ["④合规 CLEAN ⇒ 该帧已覆盖(阳性对照)", defectForA + validCleanB, MP2, false, null],
    ["⑤compared_to 指向不存在的图必须红", defectForA + cleanCard(FRAME_B, HASH_B, ALL_AXES, "素材/理想效果图/这张图根本不存在-xyz.png"), MP2, true, /compared_to="[^"]*" 在仓内不存在/],
    ["⑥CLEAN 缺 frame: 必须红", defectForA + validCleanB.replace(/^- frame: .*\r?\n/m, ""), MP2, true, /缺 `frame:`/],
    ["⑦帧在清单里不可用必须红", defectForA + validCleanB, MP4, true, /在清单里但\*\*不可用\*\*/],
    ["⑧两帧逐轴一字不差 ⇒ 后一张作废", defectForA + validCleanB + cleanCard(FRAME_C, HASH_C, ALL_AXES), MP5, true, /复制粘贴/],
    ["⑨自创轴名顶词表必须红", defectForA + cleanCard(FRAME_B, HASH_B, [...ALL_AXES.slice(0, 11), "观感不佳=整体 8/10 分"]), MP2, true, /漏了 1\/12 条轴未给实测读数：需新建/],
    ["⑩逐行写法(非 axes 单行)也必须绿", defectForA + bulletCleanB, MP2, false, null],
    ["⑪0 缺陷+合规 CLEAN 必须能绿", validCleanB, MP3, false, null],
    ["⑫空手交件(无 FRAME 无 CLEAN)必须红", "# 本轮已审完\n泳道自述：全部帧都没问题。\n", MP2, true, /空手交件/],
    ["⑬CLEAN 卡在 FRAME 卡之前也必须绿（切段不分先后）", validCleanB + defectForA, MP2, false, null],
    /* ⑭真实踩过的坑（写模板时发现的）：axes 一行写不下、折行续写时，旧解析只认每行开头的轴名，
       把同一行里 `; 圆角=…; 字号=…` 全吞进上一条的读数 ⇒ 合规卡被判"漏 6 条轴"。
       这条负例反过来钉住"折行不许判没轴"。 */
    ["⑭axes 折行续写也必须绿（不许把换行当漏轴）", defectForA + `## CLEAN home__top（折行写法）
- frame: ${FRAME_B}
- frame_hash: ${HASH_B}
- compared_to: ${IDEAL}
- axes: ${ALL_AXES.slice(0, 4).join("; ")};
  ${ALL_AXES.slice(4, 8).join("; ")};
  ${ALL_AXES.slice(8).join("; ")}
`, MP2, false, null],
  ];
  let cleanProblems = 0;
  for (const [label, body, mpath, mustFail, reasonRe] of cleanCases) {
    const f = join(scratch, "clean-lane.md");
    writeFileSync(f, body, "utf-8");
    const r = judge(f, mpath);
    const ps = r.problems || [];
    const st = r.stats;
    const red = ps.length > 0;
    let ok = red === mustFail;
    const detail = red ? ps.map((p) => String(p).slice(0, 30)).join(" | ").slice(0, 120) : (st ? `uncovered=${st.uncovered} defects=${st.defectCount} clean=${st.cleanCards}/拒${st.cleanRejected}` : "(无 stats)");
    /* 红过还要红得对：判决行必须点名本条负例对应的判点（不让"别的帧未覆盖"冒充这条承重） */
    if (ok && mustFail && reasonRe) ok = ps.some((p) => reasonRe.test(String(p)));
    if (ok && !mustFail) {
      /* 绿件必须真把 CLEAN 计进覆盖、不许污染缺陷计数（收口门按 defect_id 数新增缺陷），且一张都不许被拒 */
      ok = !!st && st.uncovered === 0 && st.cleanCards === 1 && st.cleanRejected === 0 && st.defectCount === (label.startsWith("⑪") ? 0 : 1);
    }
    console.log(`FINDERLANE_SELF ${label.padEnd(36)} 期望=${mustFail ? "红" : "绿"} 实测=${red ? `红(${ps.length})` : "绿"} clean=${st && st.cleanCards}/拒${st && st.cleanRejected} ⇒ ${ok ? "判点承重" : "判点失效"}`);
    if (!ok) { cleanProblems++; console.error(`  └ ${label} 判决行：${red ? detail : `stats=${JSON.stringify(st)}`}`); }
  }
  /* 阳性对照的第二半：同一件去掉 CLEAN 卡必须红，未覆盖读数必须 1 → 0 */
  const fBase = join(scratch, "clean-base.md");
  writeFileSync(fBase, defectForA, "utf-8");
  const rb = judge(fBase, MP2);
  const fGood = join(scratch, "clean-good.md");
  writeFileSync(fGood, defectForA + validCleanB, "utf-8");
  const rg = judge(fGood, MP2);
  const flip = !!(rb.stats && rg.stats) && rb.stats.uncovered === 1 && rb.problems.length > 0 && rg.stats.uncovered === 0 && rg.problems.length === 0 && rg.stats.cleanCards === 1;
  console.log(`FINDERLANE_SELF ${"CLEAN 把帧从「未覆盖」翻成「已覆盖」".padEnd(36)} 去掉卡 uncovered=${rb.stats && rb.stats.uncovered}(红=${rb.problems.length > 0}) 加合规卡 uncovered=${rg.stats && rg.stats.uncovered}(绿=${rg.problems.length === 0}) ⇒ ${flip ? "出口真通（门非恒红）" : "出口没通（门被改成恒红/恒绿）"}`);
  if (!flip) cleanProblems++;
  /* 退出码契约也要能红：缺输入的裸跑必须退 2 并打 NOT-EVIDENCED，
     不许拿 cwd 当泳道/清单去崩栈（那会被读成"跑过了"或被管道吃掉）。 */
  const bare = spawnSync(process.execPath, [join(HERE, "verify-finder-lane.mjs")], { cwd: REPO, encoding: "utf-8" });
  const bareOut = `${bare.stdout || ""}${bare.stderr || ""}`;
  const bareOk = bare.status === 2 && /NOT-EVIDENCED/.test(bareOut) && !/EISDIR|Error:/.test(bareOut);
  console.log(`FINDERLANE_SELF ${"缺输入的裸跑必须退 2（不许崩栈）".padEnd(36)} 期望=exit2+NOT-EVIDENCED 实测=exit=${bare.status} 行=${(bareOut.trim().split(/\r?\n/)[0] || "(无输出)").slice(0, 46)} ⇒ ${bareOk ? "契约在" : "契约坏（缺输入被伪装成跑过/抛栈）"}`);
  if (!bareOk) cleanProblems++;
  problems += cleanProblems;
  rmSync(scratch, { recursive: true, force: true });
  console.log(problems ? `${SRK}=FAIL cases=${cases.length + 1 + cleanCases.length + 2} problems=${problems}` : `${SRK}=PASS cases=${cases.length + 1 + cleanCases.length + 2} 负例可红=是（缺陷卡 ${cases.length - 1} + 帧去重 1 + CLEAN ${cleanCases.length} + 翻转对照 1 + 退出码 1）`);
  return problems ? 1 : 0;
}

if (flag("self-test")) process.exit(selfTest());

const laneArg = arg("lane", "");
const manifestArg = arg("manifest", "");
/* 守卫必须在 resolve 之前：resolve("") 返回 cwd，于是 `!lane` 恒 false ⇒ 文档里承诺的
   "缺输入退 2" 这条腿从来没通过（裸跑会拿仓根当泳道目录、再拿 cwd 当清单去 JSON.parse，
   抛 EISDIR 栈退出 1）。这道门的退出码契约本身就是判据，缺输入的裸跑不许伪装成"跑过了"。 */
if (!laneArg || !manifestArg) {
  console.log(`${RK}=NOT-EVIDENCED reason=需同时传 --lane 与 --manifest（缺输入不是"配额达标"，也不许拿 cwd 当输入）`);
  process.exit(2);
}
const lane = resolve(laneArg);
const manifest = resolve(manifestArg);
const { problems, stats, cleanRejects } = judge(lane, manifest);
process.exit(report(problems, stats, `lane=${lane.replace(REPO + "/", "")}`, cleanRejects));
