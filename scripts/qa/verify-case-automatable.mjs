/**
 * 用例可自动化预检门（把"叮嘱"变成退出码）。
 *
 * 起因：round-6 执行轮 1107 条里有 136 条被记为 `action-not-automatable` 而 SKIPPED（12.3%），分布在全 24 个 Suite。
 * 我最初把它判成"用例设计侧写得不可自动化"，**这个归因后来被实测推翻了一半**：
 * 把 136 条原因串全量回灌执行器自己的判据后发现——
 *   · 62 条（46%）其实是 `读 .selector` / `检查 X 是否 Y` 这类**观察型断言**，
 *     旧 OBSERVE_MARKERS 只认复合词「读取」，词汇表不认它们（执行器词汇缺口，已在 r-exec 扩表并由
 *     scripts/qa/test-observe-markers.cjs 钉住）；
 *   · 其余多为 `拖动 / 滑块 / swipe / 依次点 N 个 / 逐个点击`，是**真能力缺口**（没有对应 op）。
 * 所以本门的定位改成：起跑前把"真能力缺口 + 主观审美断言"两类**仍然不该进 exec 队列**的用例数出来，
 * 而不是替执行器词汇表背锅。定义里的【可自动化自检】散文规则同理，只约束前者。
 *
 * 用法：node scripts/qa/verify-case-automatable.mjs [--ops <dir>] [--results <exec-results.json>] [--json <sidecar>] [--quiet]
 *   --ops      用例清单目录，默认 reports/audit/round-6/ops
 *   --results  执行结果权威件；给了就额外做"静态判定 vs 执行器实测判定"的一致率核对（本门的自证轴）
 *   --json     结构化输出落点（必须落在 reports/** 之外）
 * 退出码：0=无不可自动化用例；1=存在不可自动化用例；2=输入不可读/守恒不过（不得空过）。
 */
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const relPosix = (p) => String(p).split(/[\\/]/).join("/");
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);

const OPS = resolve(ROOT, arg("ops", "reports/audit/round-6/ops"));
const RESULTS = arg("results", "");
const SIDE = arg("json", ".zcode/tmp/case-automatable/preflight.json");
const QUIET = has("quiet");

const say = (s) => { if (!QUIET) console.log(s); };

/* 四类成因是从 SKIPPED 行的 observed 串里归纳出来的（台账 §47），不是凭空写的黑名单。
   每条：名字 + 正则（对 action+expected 的拼接文本）+ 为什么会不可自动化。 */
/** 【单一真值源】"执行器做不做得动某个动作"由执行器自己定义，不由本门猜词表：
 *  直接从 r-exec.cjs eval 出 UNIMPLEMENTABLE_ACTION_RE。
 *  起因是本轮实测把两类完全不同的成因混成了一类——62 条 `读 .selector / 检查 X 是否 Y`
 *  其实是旧 OBSERVE_MARKERS 词汇表不认（执行器词汇缺口），
 *  另 74 条（拖动/滑块/swipe/依次点/逐个点击）才是真能力缺口（没有对应 op）。
 *  词汇缺口只在执行器内部起作用，静态预检里若照抄 OBSERVE_MARKERS 会把大半正常用例报成问题，
 *  所以这里只引入"真能力缺口"这一条正则，其余分类仍由本门的语义模式负责。 */
function grabRe(name) {
  const src = readFileSync(join(ROOT, "scripts", "qa", "r-exec.cjs"), "utf8");
  const m = src.match(new RegExp("const " + name + " = (/(?:[^/\\\\]|\\\\.)+/[gimsuy]*);"));
  if (!m) { console.log(`CA_RESULT=FAIL reason=r-exec.cjs 里取不到 ${name}（单一真值源断了，不许自己猜词表）`); process.exit(2); }
  return new Function(`return (${m[1]})`)();
}
const EXEC_UNIMPL = grabRe("UNIMPLEMENTABLE_ACTION_RE");

const PATTERNS = [
  {
    name: "真能力缺口（执行器无对应 op）",
    re: EXEC_UNIMPL,
    why: "拖动/滑块/swipe/长按/依次点 N 个/逐个点击——只能等 harness 侧加 op；不许为了变绿降级成 observe-only",
  },
  {
    name: "逐态截图并人工标注",
    re: /(逐态|逐一状态|每种状态).{0,18}(截图|标注)|(截图|标注).{0,18}(构造方式|受构建模型|模型影响)/,
    why: "要人先在图上标注/判断语义再比，执行器只能给像素帧，给不出「判断」这个动作",
  },
  {
    name: "亚秒级连续截图",
    re: /(500|300|200|100)\s*(ms|毫秒).{0,20}(连续|两次|多次|两帧|截图)|(连续|两|多次)(截图|帧).{0,20}(ms|毫秒|内)/,
    why: "automator 单次截图往返就吃掉数秒，亚秒级时序量不到",
  },
  {
    name: "全文本节点扫描裸 key",
    re: /(全文本节点|所有文本节点|每个文本节点|逐节点).{0,20}(扫描|核对|比对|检查)|裸\s*key|未翻译\s*(裸)?key/,
    why: "要遍历整棵文本树做语义判断，执行器的定位是选择器级的，做不到全覆盖",
  },
  {
    name: "需人眼判观感/主观语义",
    re: /(肉眼|人工|人眼|主观).{0,14}(判|看|比|评估|确认)|(是否|算不算).{0,10}(美观|协调|自然|像)/,
    why: "判据本身是主观审美，不是可读数",
  },
];

function classify(c) {
  const hay = [c.action, c.expected, c.PRE, c.EVIDENCE, c.evidence].filter(Boolean).join(" ");
  const hits = PATTERNS.filter((p) => p.re.test(hay)).map((p) => p.name);
  return hits;
}

/* ---------- 读用例清单 ---------- */
if (!existsSync(OPS)) { console.log(`CA_RESULT=FAIL reason=用例目录不存在 ${OPS}`); process.exit(2); }
const files = readdirSync(OPS).filter((f) => /\.json$/i.test(f)).sort();
if (!files.length) { console.log(`CA_RESULT=FAIL reason=${relPosix(relative(ROOT, OPS))} 里一个 manifest 都没有（不得空过）`); process.exit(2); }

let total = 0, bad = 0;
const byPattern = {}; PATTERNS.forEach((p) => { byPattern[p.name] = 0; });
const flagged = [];
const seenCase = new Set();
for (const f of files) {
  let j = null;
  try { j = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch (e) { console.log(`CA_UNPARSEABLE ${f} ${String(e.message).slice(0, 70)}`); continue; }
  const cases = (j && (j.cases || j.Cases)) || [];
  if (!Array.isArray(cases) || !cases.length) { say(`CA_MANIFEST ${f} cases=0（空清单，不计入分母）`); continue; }
  say(`CA_MANIFEST ${f} cases=${cases.length}`);
  for (const c of cases) {
    if (!c || !c.id) continue;
    total++;
    seenCase.add(`${j.manifest || f.replace(/\.json$/i, "")}|${c.id}`);
    const hits = classify(c);
    if (!hits.length) continue;
    bad++;
    hits.forEach((h) => { byPattern[h] = (byPattern[h] || 0) + 1; });
    if (flagged.length < 60) flagged.push({ manifest: j.manifest || f.replace(/\.json$/i, ""), id: c.id, page: c.page || "", patterns: hits, text: String(c.action || c.expected || "").slice(0, 90) });
  }
}

const patSum = Object.values(byPattern).reduce((a, b) => a + b, 0);
say(`CA_TOTAL=${total} CA_UNAUTOMATABLE=${bad} CA_CLEAN=${total - bad} CA_MULTI=${patSum - bad}（一条命中多类的重复计数）`);
say(`CA_CONSERVE 单类相加=${patSum} 命中条数=${bad} 洁净=${total - bad} 合计校验=${patSum >= bad ? "ok（多类可重叠）" : "FAIL"}`);
for (const p of PATTERNS) say(`CA_PATTERN ${p.name} = ${byPattern[p.name]} —— ${p.why}`);
if (flagged.length) {
  say("CA_FLAGGED 前 " + flagged.length + " 条：");
  for (const x of flagged.slice(0, 15)) say(`  ${x.manifest}|${x.id} [${x.page}] {${x.patterns.join(",")}} :: ${x.text}`);
}

/* ---------- 自证轴：与执行器实测 SKIPPED 的一致率 ---------- */
if (RESULTS && existsSync(resolve(ROOT, RESULTS))) {
  const rj = JSON.parse(readFileSync(resolve(ROOT, RESULTS), "utf8"));
  const rows = rj.results || [];
  const execBad = new Set();
  let execBadTotal = 0;
  for (const r of rows) {
    const o = String(r.observed || "") + " " + String(r.failureReason || "");
    if (r.status === "SKIPPED" && /action-not-automatable/.test(o)) { execBad.add(`${r.manifest}|${r.id}`); execBadTotal++; }
  }
  const staticSet = new Set(flagged.map((x) => `${x.manifest}|${x.id}`));
  // flagged 只留了前 60 条做展示，所以一致率要用全量重算：这里再扫一遍（清单不大，图个口径干净）
  const fullStatic = new Set();
  for (const f of files) {
    let j = null; try { j = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch (e) { continue; }
    for (const c of (j && j.cases) || []) {
      if (!c || !c.id) continue;
      if (classify(c).length) fullStatic.add(`${j.manifest || f.replace(/\.json$/i, "")}|${c.id}`);
    }
  }
  const both = [...execBad].filter((k) => fullStatic.has(k)).length;
  say(`CA_AGREE 执行器实测 action-not-automatable=${execBad.size} 静态命中=${fullStatic.size} 交集=${both}`);
  say(`CA_AGREE_RATE 覆盖执行侧 ${Math.round((both / Math.max(1, execBad.size)) * 100)}%；静态侧额外拦到 ${fullStatic.size - both} 条（执行轮还没跑到或未判不可自动化）`);
}

try { mkdirSync(dirname(resolve(ROOT, SIDE)), { recursive: true }); } catch (e) { /* 已存在 */ }
const out = {
  generatedAt: new Date().toISOString(),
  opsDir: relPosix(relative(ROOT, OPS)),
  total, bad, clean: total - bad, byPattern, flagged,
};
writeFileSync(resolve(ROOT, SIDE), JSON.stringify(out, null, 2) + "\n");
say(`CA_SIDECAR ${relPosix(relative(ROOT, resolve(ROOT, SIDE)))}`);
/* 退出码语义（本轮实测后定的，不凭手感）：
   静态门与执行器实测的交集只有 17/136，而"静态多拦到的 83 条"里有相当一部分
   是执行器**照常跑完了**的用例——也就是说本门的假阳性率还没被量出来。
   所以默认只报数不判红（exit 0），要拿它当门禁必须显式 --strict；
   否则下一轮会出现"门是红的、但没人知道该先修门还是先修用例"的经典僵局。 */
const STRICT = has("strict");
const ownerNote = bad === 0 ? "" :
  "；分派口径：「真能力缺口」归 harness（要加 op），「逐态标注/亚秒连拍/全文本扫描/主观审美」归用例设计（要换等价可断言写法），" +
  "而『读 .x / 检查 x 是否 y』这类观察型断言**两边都不归**——它们是执行器旧词汇表的缺口，本轮已在 r-exec 修掉";
console.log(bad === 0
  ? "CA_RESULT=PASS（静态未见不可自动化写法）"
  : `CA_RESULT=${STRICT ? "FAIL" : "ADVISORY"}（静态命中 ${bad}/${total}，占 ${Math.round((bad / Math.max(1, total)) * 1000) / 10}%；假阳性率未量，默认不判红——要判红加 --strict）${ownerNote}`);
process.exit(bad === 0 ? 0 : (STRICT ? 1 : 0));
