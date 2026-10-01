#!/usr/bin/env node
/* =============================================================================
 * verify-lane-report-complete.mjs —— 车道报告骨架完成度门（L20，2026-09-30）
 *
 * 治什么：本仓要求每条收口车道写一份车道报告（reports/audit/round-7/<主题>-r<编号>.md），
 * 形状是「小节骨架先行、读数逐节回填」。DSL 的「收口车道-${area}」prompt（:415 起，ask 参数
 * :417-421）只要求 agent 返回内存里的结构化对象（fixedIds/filesChanged/skipped/evidence），
 * **没有**「交互腿执行员」prompt 里 :455 那句增量落盘硬要求（:447 那条腿）。于是车道撞轮次上限
 * （实测 150 轮截断）时 ask 失败走 :422 的 askFail，skipped 记成「车道调用失败，未处理」，
 * 盘上那份骨架报告就永远停在「（待填）」——同族事故已 4 次（L9 未验收改动、L13 报告通篇
 * `<!-- TODO -->` 骨架〔uncovered10-disposition-r14.md:32/:175 实测记录〕、r16/r17 此刻待填）。
 * 而门清单（run-final-verify-v33.sh 与 DSL 的 GATE_SUITE）里没有任何一条看报告完整性
 * ⇒ 「车道报告还是空骨架」与「本轮已收口」可以同时成立。
 *
 * 三条设计约束（本轮实测出来的坑，不放宽）：
 *  1) 收件范围必须是**具名清单**（--intake 指一份 JSON），绝不"扫遍 round 目录"。
 *     实测 round-7 有 52 份 md，其中大量散文**故意**把「待补 / TODO」当状态写：
 *       decisions-v33.md:563 「**待补（现在是状态，不是遗漏）**」= 本册合法记账体例
 *       ui-frame-debt-classes.md:35 台账行长期处置文案 `TODO(backend)`
 *       round7-NOTES.md 「待补」11 处 = 普查口径（738 = 点名 + 待补 + 已盖章）
 *       uncovered10-disposition-r14.md:32/:175/:432 散文里**引用** `<!-- TODO -->` 这个形状
 *     一起判红只会造出噪音红，最后被整体关掉——那是这道门的死法。
 *  2) 占位符判据精确：只认中文括号骨架占位「（待填」家族（本仓实际写法）。
 *     正则（字面量编译出来的形状）：
 *       /（待填\s*(?:[：:][^）\n]{0,200}[）])?[）]?/g
 *     误报边界（如实写在盘上）：
 *       - 「待补」「TODO」「进行中」「FIXME」一律**不算**违例（状态词，不是骨架占位）。
 *       - 半角 `(待填)` 默认**不算**（本仓实测全角）；要收它，在收件条目里给 patterns 追加。
 *       - 正文里逐字**引用**「（待填」这四个字的报告会误报（一个都没有不代表不会有）：
 *         处置是走豁免 sidecar 逐条声明并写理由，不是放宽正则。
 *       - 含"待"字的正常句子（"等待 L13 收口"）不命中：判据要求左邻是全角括号。
 *  3) 豁免是**声明式、逐条、按小节指名、带理由与声明人**：不允许整份文件放行；
 *     指向已不存在/已填完小节的旧放行 ⇒ 判红（本仓定规：收紧门必须撤回旧放行＋逐档有账）。
 *
 * 两轴划分（参考现成先例 scripts/qa/verify-case-automatable.mjs 的 --strict，:325/:331/:343）：
 *   轴1 判决极性：**默认 STRICT（判红）**。与先例相反是有意的——verify-case-automatable
 *     默认 ADVISORY 是因为"数字大到极性该由人拍板"，而本门的红集合由**人自己具名**的收件清单
 *     界定：清单里每一份都是"本轮我明确说了必须填完"，不存在量级争议；而且事故恰恰长在
 *     "没人看"而不是"看了不敢判"，advisory-only 等于再造一条没人跑的门。
 *     要只报数不判红用 --advisory（真实目录 dry 读数必须用它，取数时刻有车道在途）。
 *   轴2 放行强度：默认放行有效但如实印 LANEREPORT_EXEMPT_SWEEP；收工账可用
 *     --require-zero-exempt 把"靠豁免才绿"也判红。
 *
 * 用法：
 *   node scripts/qa/verify-lane-report-complete.mjs --intake <intake.json>
 *        [--exemptions <sidecar.json>] [--base <dir>] [--skip-entry <文件名>]...
 *        [--advisory] [--require-zero-exempt] [--selftest]
 *   node scripts/qa/verify-lane-report-complete.mjs --emit-intake-draft <path> [--from <dir>] [--write]
 *        （给人挑收件项的草案工具：默认**干跑**只打到 stdout，落盘必须显式 --write）
 *
 * 退出码（口径与 verify-case-automatable 对齐）：
 *   0 = 绿（收件清单每一份都填完了；或 --advisory 下只报数）
 *   1 = 红（未填骨架小节 / 收件件缺失 / 豁免条目不合法或已失效）
 *   2 = 不可测（收件清单读不到、JSON 坏、清单为空、形状不合法——"没量到"不许冒充绿）
 * ============================================================================= */
import { readFileSync, existsSync, statSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null; };

const STRICT = !has("--advisory");            // 默认判红（论证见文件头）
const REQUIRE_ZERO_EXEMPT = has("--require-zero-exempt");
const DEFAULT_PATTERNS = ["（待填"];          // 刻意不含 待补 / TODO / 进行中
const HEAD_RE = /^(#{2,6})\s+(.*)$/;

/* 字面量 → 全局正则；`/x/flags` 形态当正则收（给收件条目 patterns 追加用）。
   骨架占位的"带说明"形状（（待填：等 L16 复量））必须整体吃掉且只算 1 处。 */
function toRe(lit) {
  const m = /^\/(.+)\/([a-z]*)$/.exec(lit);
  if (m) return new RegExp(m[1], m[2].includes("g") ? m[2] : m[2] + "g");
  return new RegExp(
    lit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*(?:[：:][^）\\n]{0,200}[）])?[）]?",
    "g",
  );
}
function countHits(text, res) {
  let n = 0;
  for (const re of res) { re.lastIndex = 0; n += (text.match(re) || []).length; }
  return n;
}

/* 小节口径：一个标题行到**下一个任意级标题行**之间的正文。刻意不嵌套计数——`## 2.` 下的
   `### 2.1` 是独立小节，父节只拿自己的引言，否则同一处占位父子各计一次，未填小节总数就不可复核。 */
/* 反引号包起来的字面量＝**引用**这个形状（本仓散文引用别人的写法一律加反引号，
   实测先例 uncovered10-disposition-r14.md:32 用 `<!-- TODO -->` 引用 L13 的骨架），
   不是自己留骨架。这类命中**照数但绝不判红**，单独印成 QUOTED 读数，不静默丢。
   围栏代码块（```）不吃这条规则：块里留占位仍然是没填。 */
const INLINE_CODE_RE = /`[^`\n]*`/g;
function splitQuoted(text, probes) {
  const spans = text.match(INLINE_CODE_RE) || [];
  let quotedHits = 0;
  const bare = text.replace(INLINE_CODE_RE, (s) => {
    for (const re of probes) { re.lastIndex = 0; quotedHits += (s.match(re) || []).length; }
    return " ".repeat(s.length);
  });
  return { bare, quotedHits };
}
function sectionsOf(text) {
  const lines = text.split(/\r?\n/);
  const marks = [];
  lines.forEach((l, i) => { const m = HEAD_RE.exec(l); if (m) marks.push({ line: i, level: m[1].length, title: m[2].trim() }); });
  const units = [];
  if (!marks.length) {
    units.push({ title: "（无标题·全文正文）", level: 0, headLine: 0, body: lines.map((t, i) => ({ n: i + 1, t })) });
  } else {
    if (marks[0].line > 0) units.push({ title: "（正文开头·无标题）", level: 0, headLine: 0, body: lines.slice(0, marks[0].line).map((t, i) => ({ n: i + 1, t })) });
    marks.forEach((mk, i) => {
      const next = i + 1 < marks.length ? marks[i + 1].line : lines.length;
      units.push({ title: mk.title, level: mk.level, headLine: mk.line + 1, body: lines.slice(mk.line + 1, next).map((t, j) => ({ n: mk.line + 2 + j, t })) });
    });
  }
  return units;
}

const L = [];
const say = (s) => L.push(s);

/* ── 草案辅助（默认干跑，落盘要 --write）──────────────────────────────────── */
if (val("--emit-intake-draft")) {
  const target = resolve(process.cwd(), val("--emit-intake-draft"));
  const from = resolve(process.cwd(), val("--from") || join(REPO, "reports/audit/round-7"));
  const names = readdirSync(from).filter((f) => /^[\w.-]+-r\d+[a-z]?\.md$/.test(f)).sort();
  const draft = JSON.stringify({
    round: from.split(/[\\/]/).pop(),
    dir: ".",
    note: "草案由 --emit-intake-draft 生成：这里只是**候选**，收件人必须逐条确认"
      + "「这一份是本轮车道报告、必须填完」再删掉不该收的（本门的红线只由具名清单决定）。"
      + " inFlight 字段提醒取数时刻在途的车道，收工账前由编排方清掉。",
    reports: names.map((f) => ({ file: f, due: "本轮收口车道报告：每个小节必须有读数，不许留骨架占位" })),
  }, null, 2) + "\n";
  console.log(`LANEREPORT_DRAFT_TARGET=${target} 候选份数=${names.length} 口径=文件名形态 *-r<编号>.md，非判决，需人工逐条确认`);
  if (has("--write")) {
    writeFileSync(target, draft, "utf8");
    console.log(`LANEREPORT_DRAFT_WRITTEN=${target} 已落盘（显式 --write）`);
    console.log("LANEREPORT_RESULT=PASS 退出码=0 口径=草案落盘动作本身，不评判任何报告");
    process.exit(0);
  }
  console.log("LANEREPORT_DRY_RUN=1 草案如下，未写盘（要落盘加 --write）\n" + draft);
  process.exit(0);
}

/* ── 判据自证：--selftest 不读磁盘，钉住"只认（待填"的边界 ────────────────── */
if (has("--selftest")) {
  let bad = 0;
  const res = DEFAULT_PATTERNS.map(toRe);
  const NL = String.fromCharCode(10);
  /* 与扫描循环同一套语义：逐行剥反引号 span（所以 ``` 围栏里的占位不会被当成引用） */
  const judge = (s) => { let n = 0, q = 0; for (const line of s.split(NL)) { const sp = splitQuoted(line, res); n += countHits(sp.bare, res); q += sp.quotedHits; } return { n, q }; };
  const fenced = ["```", "（待填）", "```"].join(NL);
  const cases = [
    { n: "全角骨架占位命中", s: "## 1. 读数" + NL + "（待填）", want: 1, wantQ: 0 },
    { n: "带说明的骨架占位只算一处", s: "（待填：等 L16 复量）", want: 1, wantQ: 0 },
    { n: "同一行两处算两处", s: "（待填）和（待填）", want: 2, wantQ: 0 },
    { n: "待补不算违例", s: "**待补（现在是状态，不是遗漏）**", want: 0, wantQ: 0 },
    { n: "TODO 不算违例", s: "长期：TODO(backend) 落同步", want: 0, wantQ: 0 },
    { n: "半角括号默认不算", s: "(待填)", want: 0, wantQ: 0 },
    { n: "含待字的正常句不算", s: "本节等待 L13 收口后回填。", want: 0, wantQ: 0 },
    { n: "括号里写别的状态不算", s: "（进行中）（已盖章）（需环境）", want: 0, wantQ: 0 },
    { n: "反引号里的引用不算违例但照数", s: "L13 那份报告通篇是 `（待填）` 骨架", want: 0, wantQ: 1 },
    { n: "同节既有真骨架又有引用", s: "本行 `（待填）` 是引用，后面这个是真骨架：（待填）", want: 1, wantQ: 1 },
    { n: "围栏代码块里的占位仍然算（不吃反引号规则）", s: fenced, want: 1, wantQ: 0 },
  ];
  for (const c of cases) {
    const g = judge(c.s);
    const ok = g.n === c.want && g.q === c.wantQ;
    if (!ok) bad++;
    say(`${ok ? "LRST_OK  " : "LRST_BAD "} ${c.n} 判红命中=${g.n} 期望=${c.want} 引用命中=${g.q} 期望=${c.wantQ}`);
  }
  say(`LR_SELFTEST=${bad ? "FAIL" : "PASS"} cases=${cases.length} bad=${bad}（判据边界：只认「（待填」；待补/TODO/半角/含待字的正常句/反引号引用一律不判红）`);
  console.log(L.join("\n"));
  process.exit(bad ? 1 : 0);
}

/* ── 收件清单 ─────────────────────────────────────────────────────────────── */
const intakeArg = val("--intake");
if (!intakeArg) {
  console.log("LANEREPORT_RESULT=FAIL 退出码=2 口径=不可测 理由=没给 --intake（收件清单必须具名，本门不接受扫目录式收件；这是配置错误不是「没有缺陷」）");
  console.log("LANEREPORT_USAGE=node scripts/qa/verify-lane-report-complete.mjs --intake <intake.json> [--exemptions <sidecar.json>] [--advisory]");
  process.exit(2);
}
const intakePath = resolve(process.cwd(), intakeArg);
if (!existsSync(intakePath) || !statSync(intakePath).isFile()) {
  console.log(`LANEREPORT_RESULT=FAIL 退出码=2 口径=不可测 理由=收件清单不存在：${intakePath}`);
  process.exit(2);
}
let intake;
try { intake = JSON.parse(readFileSync(intakePath, "utf8")); }
catch (e) { console.log(`LANEREPORT_RESULT=FAIL 退出码=2 口径=不可测 理由=收件清单不是合法 JSON：${String(e.message).slice(0, 120)}`); process.exit(2); }

const rawList = Array.isArray(intake.reports) ? intake.reports : (Array.isArray(intake) ? intake : []);
if (!rawList.length) {
  // 空清单 = 不可测（先例：run-qa-selftests.mjs:29「扫描集为空一律 exit 2」、verify-case-automatable.mjs:228）
  console.log(`LANEREPORT_RESULT=FAIL 退出码=2 口径=不可测 理由=收件清单为空（${intakeArg}），一份具名报告都没登记，不得空过`);
  process.exit(2);
}
const entries = rawList.map((e) => (typeof e === "string" ? { file: e } : e)).filter((e) => e && typeof e.file === "string" && e.file);
if (entries.length !== rawList.length) {
  console.log(`LANEREPORT_RESULT=FAIL 退出码=2 口径=不可测 理由=收件清单有 ${rawList.length - entries.length} 条缺 file 字段（不静默丢条目）`);
  process.exit(2);
}
const dup = entries.map((e) => e.file).filter((f, i, a) => a.indexOf(f) !== i);
if (dup.length) {
  console.log(`LANEREPORT_RESULT=FAIL 退出码=2 口径=不可测 理由=收件清单重复条目：${[...new Set(dup)].join("、")}（分母不可信）`);
  process.exit(2);
}
const baseDir = val("--base") ? resolve(process.cwd(), val("--base")) : resolve(intakePath, "..", intake.dir || ".");
if (!existsSync(baseDir) || !statSync(baseDir).isDirectory()) {
  console.log(`LANEREPORT_RESULT=FAIL 退出码=2 口径=不可测 理由=收件目录不存在：${baseDir}`);
  process.exit(2);
}

/* 豁免 sidecar */
const SKIP = new Set(argv.flatMap((x, i) => (x === "--skip-entry" ? [argv[i + 1]] : [])));
let exemptions = [];
const exArg = val("--exemptions");
if (exArg) {
  const exPath = resolve(process.cwd(), exArg);
  if (!existsSync(exPath)) { console.log(`LANEREPORT_RESULT=FAIL 退出码=2 口径=不可测 理由=豁免清单不存在：${exPath}`); process.exit(2); }
  let exRaw;
  try { exRaw = JSON.parse(readFileSync(exPath, "utf8")); }
  catch (e) { console.log(`LANEREPORT_RESULT=FAIL 退出码=2 口径=不可测 理由=豁免清单不是合法 JSON：${String(e.message).slice(0, 120)}`); process.exit(2); }
  exemptions = Array.isArray(exRaw.exemptions) ? exRaw.exemptions : (Array.isArray(exRaw) ? exRaw : []);
}
const exBad = [];
exemptions.forEach((x, i) => {
  if (!x || typeof x.file !== "string" || typeof x.section !== "string" || !x.section.trim())
    exBad.push(`#${i} 缺 file/section（豁免必须按小节具名，本门不支持整份放行）`);
  else if (typeof x.reason !== "string" || !x.reason.trim())
    exBad.push(`#${i} ${x.file}::${x.section} 无 reason（逐档有账：没有理由的豁免不是豁免）`);
  else if (typeof x.declaredBy !== "string" || !x.declaredBy.trim())
    exBad.push(`#${i} ${x.file}::${x.section} 无 declaredBy`);
});

/* ── 扫描 ─────────────────────────────────────────────────────────────────── */
let scanned = 0, skippedEntries = 0, missing = 0;
let rawSections = 0, rawHits = 0, emptySections = 0, quotedHits = 0;
let exApplied = 0, exHits = 0, staleExempt = 0;
const problems = [];
const advisories = [];
const perFile = [];

for (const e of entries) {
  const bn = e.file.split(/[\\/]/).pop();
  if (SKIP.has(bn) || SKIP.has(e.file)) {
    skippedEntries++;
    say(`SKIPENTRY ${e.file} 口径=显式跳过（并发在途车道，本发不取它的字节；收工账必须去掉这个旗标）`);
    continue;
  }
  const p = join(baseDir, e.file);
  if (!existsSync(p) || !statSync(p).isFile()) {
    missing++;
    problems.push(`PROBLEM ${e.file} :: 收件件缺失 :: 具名清单登记了它但盘上没有（车道连骨架都没落盘）`);
    perFile.push({ file: e.file, missing: true, skelSec: 0, hits: 0, ex: 0, empty: 0 });
    continue;
  }
  scanned++;
  const text = readFileSync(p, "utf8");
  const res = (Array.isArray(e.patterns) && e.patterns.length ? e.patterns : DEFAULT_PATTERNS).map(toRe);
  const units = sectionsOf(text);
  const secHits = [];
  let fileRawHits = 0, fileRawSections = 0, fileEmpty = 0;
  for (const u of units) {
    const bareLines = u.body.map((b) => splitQuoted(b.t, res));
    const bodyBare = bareLines.map((x) => x.bare).join("\n");
    const n = countHits(bodyBare, res);
    const q = bareLines.reduce((s, x) => s + x.quotedHits, 0);
    quotedHits += q;
    if (u.level && u.body.every((b) => b.t.trim() === "")) fileEmpty++;
    if (n > 0) {
      fileRawHits += n; fileRawSections++;
      const fi = u.body.findIndex((b, i) => countHits(bareLines[i].bare, res) > 0);
      const first = fi >= 0 ? u.body[fi] : null;
      secHits.push({ title: u.title, line: first ? first.n : u.headLine, n, sample: first ? first.t.trim().slice(0, 60) : "" });
    }
  }
  rawHits += fileRawHits; rawSections += fileRawSections; emptySections += fileEmpty;

  let fEx = 0, fExHits = 0;
  const myEx = exemptions.filter((x) => x && typeof x.file === "string" && (x.file === e.file || x.file === bn || x.file === bn.replace(/\.md$/, "")));
  for (const x of myEx) {
    const idx = secHits.findIndex((s) => s.title.includes(x.section) || x.section.includes(s.title));
    if (idx >= 0) {
      const s = secHits.splice(idx, 1)[0];
      fEx++; fExHits += s.n;
      exApplied++; exHits += s.n;
      advisories.push(`ADVISORY ${e.file} :: 小节「${s.title}」(行 ${s.line}) :: 骨架占位 ${s.n} 处 已声明为状态（${x.declaredBy}）理由=${x.reason}`);
    } else {
      staleExempt++;
      problems.push(`PROBLEM 豁免清单失效条目 :: ${e.file} section="${x.section}" 匹配不到任何未填小节 :: 旧放行必须撤回（这一节填完就删这条；确要放行请改正小节名）`);
    }
  }
  const remainHits = fileRawHits - fExHits;
  for (const s of secHits) problems.push(`PROBLEM ${e.file} :: 小节「${s.title}」(行 ${s.line}) :: 未填骨架 ${s.n} 处 :: 例：${s.sample}`);
  perFile.push({
    file: e.file, skelSec: secHits.length, hits: remainHits, rawSec: fileRawSections, rawHits: fileRawHits,
    ex: fEx, exHits: fExHits, empty: fileEmpty,
  });
}

const unsolvedSections = problems.filter((p) => p.startsWith("PROBLEM ") && !p.includes("收件件缺失") && !p.includes("豁免清单失效条目")).length;
const problemFileSet = new Set();
for (const p of problems) {
  if (p.includes("豁免清单失效条目")) continue;
  const m = /^PROBLEM (\S+) ::/.exec(p);
  if (m) problemFileSet.add(m[1]);
}
const problemFiles = problemFileSet.size;

/* ── 机器行：每个数字都带口径标注 ─────────────────────────────────────────── */
say("");
say(`LANEREPORT_INTAKE=${entries.length} 口径=具名收件清单条目数（来源 ${intakeArg}，不是扫目录）`);
say(`LANEREPORT_SKIPPED_ENTRIES=${skippedEntries} 口径=--skip-entry 跳过的份数（并发在途；这份数不是收工账）`);
say(`LANEREPORT_SCANNED=${scanned} 口径=实际读到字节的份数`);
say(`LANEREPORT_MISSING=${missing} 口径=登记了但盘上没有的份数（计红）`);
say(`LANEREPORT_SKELETON_FILES=${problemFiles} 口径=仍有未填骨架小节（或缺件）的份数，豁免已扣除`);
say(`LANEREPORT_SKELETON_SECTIONS=${unsolvedSections} 口径=未填骨架小节总数（一节多处占位只计 1 节；豁免已扣除）`);
say(`LANEREPORT_PLACEHOLDER_HITS=${rawHits - exHits} 口径=未填骨架的占位命中次数（豁免已扣除）`);
say(`LANEREPORT_PLACEHOLDER_HITS_RAW=${rawHits} 口径=豁免前占位命中次数（两行相减=被声明为状态的次数）`);
say(`LANEREPORT_PLACEHOLDER_HITS_QUOTED=${quotedHits} 口径=写在反引号里的**引用**（照数不判红；散文引用这个占位形状是合法体例，见 uncovered10-disposition-r14.md:32 引用别人骨架的写法）`);
say(`LANEREPORT_EMPTY_SECTIONS=${emptySections} 口径=标题下正文为空的小节数；只报数不判红（表格/引言紧跟标题是合法形状）`);
say(`LANEREPORT_EXEMPT_DECLARED=${exemptions.length} 口径=sidecar 声明条数`);
say(`LANEREPORT_EXEMPT_APPLIED=${exApplied} 口径=真的挡掉了未填小节的条数（占位 ${exHits} 处）`);
say(`LANEREPORT_EXEMPT_STALE=${staleExempt} 口径=匹配不到未填小节的放行条数（旧放行未撤回，判红）`);
say(`LANEREPORT_EXEMPT_BAD=${exBad.length} 口径=sidecar 本身不合法的条数（缺 section/reason/declaredBy）`);
say(`LANEREPORT_MODE=${STRICT ? "STRICT" : "ADVISORY"} 口径=判决极性轴：${STRICT ? "默认判红（收件清单由人具名，每一份都是本轮明确要说填完的）" : "--advisory 只报数，判红权交编排方"}`);
say(`LANEREPORT_POLARITY_NOTE=默认极性=判红；先例 scripts/qa/verify-case-automatable.mjs 默认 ADVISORY 的理由是"数字大到极性该由人拍板"（:325/:331），本门红集合无量级争议故反向取默认判红`);
for (const f of perFile) {
  say(`LANEREPORT_FILE ${f.file} 未填骨架小节=${f.skelSec} 占位命中=${f.hits} 豁免小节=${f.ex}${f.exHits ? `(占位 ${f.exHits})` : ""} 空正文小节=${f.empty}${f.missing ? " 缺失=是" : ""}`);
}
for (const a of advisories) say(a);
say(`LANEREPORT_EXEMPT_SWEEP=${unsolvedSections === 0 && rawSections > 0 && exApplied > 0 ? "YES(本发的绿全部来自豁免放行，非无人填)" : "NO"}`);
say(`LANEREPORT_PROBLEMS=${problems.length + exBad.length} 口径=判红项总数（未填小节+缺件+失效放行+放行不合法；不含 --require-zero-exempt 那条策略性判红，它只写进 RESULT 的 reason）`);
if (problems.length) { say(""); for (const p of problems) say(p); }
if (exBad.length) { say(""); for (const b of exBad) say(`PROBLEM 豁免清单 :: ${b}`); }

let exitCode = 0, verdict = "PASS", reason;
if (exBad.length) {
  verdict = "FAIL"; reason = `豁免清单本身不合法 ${exBad.length} 条（每条必须带 section/reason/declaredBy）`; exitCode = 1;
} else if (problems.length) {
  reason = `${problemFiles} 份车道报告还有未填骨架小节（共 ${unsolvedSections} 节）+ 失效/缺失 ${staleExempt + missing} 条`;
  verdict = STRICT ? "FAIL" : "ADVISORY";
  exitCode = STRICT ? 1 : 0;
} else {
  reason = `收件 ${entries.length} 份全部填完（另 ${skippedEntries} 份显式跳过、${exApplied} 节声明为状态）`;
  if (REQUIRE_ZERO_EXEMPT && exApplied > 0) { verdict = "FAIL"; reason = `--require-zero-exempt：本发有 ${exApplied} 节靠豁免才绿，收工账不接受放行`; exitCode = 1; }
}
say(`LANEREPORT_${verdict} ${reason}`);
say(`LANEREPORT_RESULT=${verdict} 退出码=${exitCode} 口径=本发判决（红项见上 PROBLEMS=${problems.length + exBad.length}）`);

console.log(L.join("\n"));
process.exit(exitCode);
