/**
 * 用例可自动化预检门（把"叮嘱"变成退出码）。
 *
 * 起因：round-6 执行轮 1107 条里有 136 条被记为 `action-not-automatable` 而 SKIPPED（12.3%），分布在全 24 个 Suite。
 *   （136 是当时记账的数；现权威件 reports/audit/round-6/interact/exec-results.json 复量为 140 条 = 12.6%，
 *     差额是后来补跑的登录/前置腿。下面 62/74 的分解按 136 那一版口径成立，比例不受影响。）
 * 我最初把它判成"用例设计侧写得不可自动化"，**这个归因后来被实测推翻了一半**：
 * 把 136 条原因串全量回灌执行器自己的判据后发现——
 *   · 62 条（46%）其实是 `读 .selector` / `检查 X 是否 Y` 这类**观察型断言**，
 *     旧 OBSERVE_MARKERS 只认复合词「读取」，词汇表不认它们（执行器词汇缺口，已在 r-exec 扩表并由
 *     scripts/qa/test-observe-markers.cjs 钉住）；
 *   · 其余多为 `拖动 / 滑块 / swipe / 依次点 N 个 / 逐个点击`，是**真能力缺口**（没有对应 op）。
 * 所以本门的定位改成：起跑前把"真能力缺口 + 主观审美断言"两类**仍然不该进 exec 队列**的用例数出来，
 * 而不是替执行器词汇表背锅。定义里的【可自动化自检】散文规则同理，只约束前者。
 *
 * 用法：node scripts/qa/verify-case-automatable.mjs [--ops <dir>] [--results <exec-results.json>] [--json <sidecar>] [--quiet] [--strict] [--selftest]
 *   --ops      用例清单目录，默认 reports/audit/round-6/ops
 *   --results  执行结果权威件；给了就跑"静态判定 vs 执行器实测判定"自证轴（本门的自证轴）。
 *              自证轴同时产两个方向的读数，缺一不可：
 *                假阳性率 = 静态命中里执行侧照做的占比（门自己有没有乱拦，CA_AGREE_RATE 第一行）
 *                召回率   = 执行侧拒答里静态也拦到的占比（门有没有漏拦）
 *              喂了 --results 却读不到/解析不了/零行 ⇒ 判 exit 2（不给静默退 0 的路）；
 *              静态键与结果件零重合 ⇒ 打 CA_AGREE_STATE=UNMEASURABLE 且不印任何百分比（0% 是读数，不是"没测"）。
 *   --json     结构化输出落点（必须落在 reports/** 之外）；自证轴读数一并写进 agree 字段
 *   --quiet    只压进度日志（CA_MANIFEST/CA_PATTERN/CA_FLAGGED）；判据行 CA_RESULT/CA_AGREE* 永远印
 *   --selftest 跑本门自证轴的 7 条负例（不读磁盘），接在 scripts/qa/run-qa-selftests.mjs 的 GATE_SELFTESTS
 * 退出码：0=无不可自动化用例（或普查轴按设计只报数）；1=--strict 下存在不可自动化用例；
 *         2=输入不可读/守恒不过（不得空过）——含 --ops 缺失、单一真值源断、清单重复键、--results 坏输入。
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

/* ---------- 自证轴的算法本体（纯函数，好让 --selftest 不打扰磁盘就能咬它）----------
   执行侧对每条用例只有四种立场，先把立场分开，再谈比率：
     refused    SKIPPED 且理由命中 action-not-automatable —— 执行器自己拒答（静态对的）
     passed     EXECUTED                              —— 执行器照跑照过（最能证伪静态预测）
     attempted  FAILED 且不是拒答                       —— 执行器试图做了，死在产品/选择器上
                                                        （仍与"这动作做不了"相矛盾）
     unknown    他因 SKIPPED（欠前置/身份域不认领/禁触…）或结果件里根本没这一行 —— 什么都证不了
   原实现的病：只数 refused 一种，把另外三种塞进同一句括号"执行轮还没跑到或未判不可自动化"，
   于是 passed（确证假阳性）与 unknown（不可测）在同一个数里同归于尽，而唯一印出来的百分比
   是 交集/refused —— 那是**召回率**，方向对着"静态漏了多少"，不是门自己那句"假阳性率未量"要的东西。 */
function agreeAxis(rows, staticKeys) {
  const key = (r) => `${r.manifest}|${r.id}`;
  const byKey = new Map();
  let rowDups = 0, malformed = 0;
  for (const r of rows || []) {
    if (!r || !r.manifest || !r.id) { malformed++; continue; }
    const k = key(r);
    if (byKey.has(k)) rowDups++; else byKey.set(k, r);
  }
  const refused = new Set();
  for (const [k, r] of byKey) {
    const o = String(r.observed || "") + " " + String(r.failureReason || "");
    if (r.status === "SKIPPED" && /action-not-automatable/.test(o)) refused.add(k);
  }
  const sk = [...staticKeys];
  const both = sk.filter((k) => refused.has(k)).length;
  // overlap 数的是"静态键在结果件里有没有对应行"，与执行侧的立场无关：
  // 全量一致（每条静态命中都被执行器同样拒答）是一种可测读数，不是零重合。
  let overlap = 0;
  let passed = 0, attempted = 0, otherSkip = 0, absent = 0, joinable = 0;
  for (const k of sk) {
    if (byKey.has(k)) overlap++;
    if (refused.has(k)) continue;
    const r = byKey.get(k);
    if (!r) { absent++; continue; }
    joinable++;
    if (r.status === "EXECUTED") passed++;
    else if (r.status === "FAILED") attempted++;
    else otherSkip++;
  }
  const sN = sk.length;
  const fp = passed + attempted;
  const unmeasurable = otherSkip + absent;
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
  // 整轴不可测（一个键都不沾＝配对喂错了）时一律产 null，不产 0：
  // 0% 是一个读数，null 才是"这一发没测"，两者混用就是本轮反复拆的那类假读数。
  const measurable = sN > 0 && overlap > 0;
  const on = (x) => (measurable ? x : null);
  return {
    rows: (rows || []).length, distinctKeys: byKey.size, rowDups, malformed,
    refused: refused.size, staticN: sN, both, overlap, joinable,
    passed, attempted, otherSkip, absent, fp, unmeasurable,
    recall: refused.size > 0 ? on(pct(both, refused.size)) : null,
    fpRate: on(pct(fp, sN)),
    fpHardRate: on(pct(passed, sN)),
    precision: on(pct(both, sN)),
    measurable,
    recallMeasurable: refused.size > 0 && measurable,
  };
}

/* ---------- 本门自检（负例）：接在 run-qa-selftests 的 GATE_SELFTESTS 上 ----------
   为什么必须有：这条轴是"门自己给自己作证"的那一半，而它此前零测试覆盖，
   两条缺陷（空输入印 0%、路径不存在整轴静默消失）都是靠人肉实测才发现的。 */
if (has("selftest")) {
  const K = (n) => new Set(Array.from({ length: n }, (_, i) => `M|S${i}`));
  const row = (id, status, why) => ({ manifest: "M", id, status, observed: why || "", failureReason: "" });
  const AUT = "action-not-automatable: 没有 drag op";
  const cases = [
    {
      n: "召回率与假阳性率是两个方向，不得混为同一个百分比",
      got: (() => {
        // 静态命中 4（S0,S1 执行器也拒答；S2 照跑照过＝假阳性；S3 没跑到＝不可测）
        // 执行器另外拒答 6 条静态没拦的 ⇒ 召回分母是 8，不是 2
        const a = agreeAxis([row("S0", "SKIPPED", AUT), row("S1", "SKIPPED", AUT), row("S2", "EXECUTED"), ...Array.from({ length: 6 }, (_, i) => row("X" + i, "SKIPPED", AUT))], K(4));
        return a.both === 2 && a.recall === 25 && a.fpRate === 25 && a.unmeasurable === 1 && a.precision === 50;
      })(),
    },
    {
      n: "执行器一条都没拒答时，召回率判为不可测（旧实现在这里印 0% 冒充读数）",
      got: (() => {
        const a = agreeAxis([row("S0", "EXECUTED"), row("S1", "FAILED", "element not found")], K(2));
        return a.refused === 0 && a.recall === null && a.recallMeasurable === false && a.fpRate === 100;
      })(),
    },
    {
      n: "他因跳过/没跑到的行算不可测，不得混进假阳性分子",
      got: (() => {
        const a = agreeAxis([row("S0", "SKIPPED", "缺前置配方"), row("S1", "EXECUTED")], K(4));
        return a.fp === 1 && a.unmeasurable === 3 && a.fpRate === 25 && a.joinable === 2;
      })(),
    },
    {
      n: "FAILED 计为『执行器试图做过』＝证伪静态预测，但单列不并入硬口径",
      got: (() => {
        const a = agreeAxis([row("S0", "FAILED", "element not found: .x"), row("S1", "EXECUTED")], K(2));
        return a.attempted === 1 && a.passed === 1 && a.fp === 2 && a.fpRate === 100 && a.fpHardRate === 50;
      })(),
    },
    {
      n: "键全不沾的配对（喂错轮次/目录）整轴不可测，不产任何百分比",
      got: (() => {
        const a = agreeAxis([row("OTHER", "SKIPPED", AUT)], new Set(["M|S0", "M|S1"]));
        return a.measurable === false && a.joinable === 0 && a.recall === null;
      })(),
    },
    {
      n: "结果件里的重复行与缺键行各自计数，静默覆盖＝分母失真",
      got: (() => {
        const a = agreeAxis([row("S0", "SKIPPED", AUT), row("S0", "EXECUTED"), { id: "S9", status: "EXECUTED" }], K(1));
        return a.rows === 3 && a.rowDups === 1 && a.malformed === 1 && a.distinctKeys === 1;
      })(),
    },
    {
      n: "完美一致的正例：交集=两侧全量，假阳性率 0",
      got: (() => {
        const a = agreeAxis([row("S0", "SKIPPED", AUT), row("S1", "SKIPPED", AUT)], K(2));
        return a.both === 2 && a.fp === 0 && a.fpRate === 0 && a.recall === 100 && a.measurable;
      })(),
    },
  ];
  const badCases = cases.filter((c) => !c.got);
  for (const c of cases) console.log((c.got ? "  ok " : "  BAD") + c.n);
  console.log("CA_SELFTEST=" + (badCases.length ? "FAIL" : "PASS") + " cases=" + cases.length + " bad=" + badCases.length);
  process.exit(badCases.length ? 1 : 0);
}

/* ---------- 读用例清单 ---------- */
if (!existsSync(OPS)) { console.log(`CA_RESULT=FAIL reason=用例目录不存在 ${OPS}`); process.exit(2); }
const files = readdirSync(OPS).filter((f) => /\.json$/i.test(f)).sort();
if (!files.length) { console.log(`CA_RESULT=FAIL reason=${relPosix(relative(ROOT, OPS))} 里一个 manifest 都没有（不得空过）`); process.exit(2); }

let total = 0, bad = 0;
const byPattern = {}; PATTERNS.forEach((p) => { byPattern[p.name] = 0; });
const flagged = [];
/* 全量静态命中集（自证轴的分母）。flagged 只留前 60 条做展示，所以自证轴必须另有一集，
   且**必须在主循环这一趟里收齐**：原实现是在自证轴里把 ops 目录再 parse 一遍扫出第二份，
   两趟两份判据来源，一旦有人只改其中一处 classify 调用点，两轴就会静默分叉。 */
const fullStatic = new Set();
const seenCase = new Map();
const dupKeys = [];
const caseKey = (mf, id) => `${mf}|${id}`;
for (const f of files) {
  let j = null;
  try { j = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch (e) { console.log(`CA_UNPARSEABLE ${f} ${String(e.message).slice(0, 70)}`); continue; }
  const cases = (j && (j.cases || j.Cases)) || [];
  if (!Array.isArray(cases) || !cases.length) { say(`CA_MANIFEST ${f} cases=0（空清单，不计入分母）`); continue; }
  say(`CA_MANIFEST ${f} cases=${cases.length}`);
  const mf = j.manifest || f.replace(/\.json$/i, "");
  for (const c of cases) {
    if (!c || !c.id) continue;
    total++;
    const k = caseKey(mf, c.id);
    if (seenCase.has(k)) dupKeys.push(`${k}（${seenCase.get(k)} 与 ${f}）`);
    else seenCase.set(k, f);
    const hits = classify(c);
    if (!hits.length) continue;
    bad++;
    fullStatic.add(caseKey(mf, c.id));
    hits.forEach((h) => { byPattern[h] = (byPattern[h] || 0) + 1; });
    if (flagged.length < 60) flagged.push({ manifest: mf, id: c.id, page: c.page || "", patterns: hits, text: String(c.action || c.expected || "").slice(0, 90) });
  }
}

const patSum = Object.values(byPattern).reduce((a, b) => a + b, 0);
/* 键唯一性是下面那条自证轴的前置条件：一致率是拿 `manifest|id` 当集合做交并的，
   一个键在清单里出现两次，"静态命中 102" 与 "执行器实测 140" 就不再是同一批东西的数。
   原实现里 seenCase 只 add 不读（写了个没人看的 Set，等于没守），这里改成真的守恒：
   重复键 ⇒ 分母不可信 ⇒ 按 :18 的"输入不可读/守恒不过"退 2，不许继续产比率。 */
if (dupKeys.length) {
  console.log(`CA_RESULT=FAIL reason=用例清单有 ${dupKeys.length} 个重复的 manifest|id 键，分母不可信，自证轴的集合运算无意义（前 5 个：${dupKeys.slice(0, 5).join("、")}）`);
  process.exit(2);
}
say(`CA_TOTAL=${total} CA_UNAUTOMATABLE=${bad} CA_CLEAN=${total - bad} CA_MULTI=${patSum - bad}（一条命中多类的重复计数）`);
say(`CA_CONSERVE 单类相加=${patSum} 命中条数=${bad} 洁净=${total - bad} 合计校验=${patSum >= bad ? "ok（多类可重叠）" : "FAIL"}`);
for (const p of PATTERNS) say(`CA_PATTERN ${p.name} = ${byPattern[p.name]} —— ${p.why}`);
if (flagged.length) {
  say("CA_FLAGGED 前 " + flagged.length + " 条：");
  for (const x of flagged.slice(0, 15)) say(`  ${x.manifest}|${x.id} [${x.page}] {${x.patterns.join(",")}} :: ${x.text}`);
}

/* ---------- 自证轴：静态判定 vs 执行器实测 ----------
   这一发只在 --results 显式给出时才跑。既然给了，"跑不成"就必须说话，绝不能静默消失：
   旧实现把整段包在 `if (RESULTS && existsSync(...))` 里 ⇒ 路径打错一个字母，
   自证轴整块蒸发、既无 CA_AGREE 也无一句警告、照样退 0 —— 门的自证被顺手关掉而无人知晓。
   现按 :18 既有的退出码契约处理：给了 --results 而读不到/解析不了/零行 ⇒ 输入不可读 ⇒ exit 2。 */
let AXIS = null;
if (RESULTS) {
  const abs = resolve(ROOT, RESULTS);
  const die = (why) => { console.log(`CA_AGREE_STATE=FAIL ${why}（给了 --results 就是要求跑自证轴，读不到不许当没给，也不许退 0）`); process.exit(2); };
  if (!existsSync(abs)) die(`reason=结果件不存在 ${relPosix(relative(ROOT, abs))}`);
  let rj = null;
  try { rj = JSON.parse(readFileSync(abs, "utf8")); } catch (e) { die(`reason=结果件解析失败 ${String(e.message).slice(0, 70)}`); }
  const rows = (rj && rj.results) || [];
  if (!Array.isArray(rows) || !rows.length) die(`reason=结果件里一条 results 行都没有（空输入不许产出一个看起来完整的读数）`);
  AXIS = agreeAxis(rows, fullStatic);

  // 用 console.log 而非 say()：这是一条判据读数，不该被 --quiet 连同 CA_RESULT 之外的所有证据一起抹掉。
  console.log(`CA_AGREE 行数=${AXIS.rows} 去重后键=${AXIS.distinctKeys}（重复行 ${AXIS.rowDups} / 缺 manifest|id 的行 ${AXIS.malformed}）`);
  console.log(`CA_AGREE 执行器实测 action-not-automatable=${AXIS.refused} 静态命中=${AXIS.staticN} 交集=${AXIS.both}`);
  console.log(`CA_AGREE_EXEC 静态拦下而执行侧未拒答=${AXIS.fp} 条（跑完且通过=${AXIS.passed} 试图做但死在产品/选择器=${AXIS.attempted}）｜不可测=${AXIS.unmeasurable} 条（他因跳过=${AXIS.otherSkip} 结果件里没有这行=${AXIS.absent}）`);
  if (!AXIS.measurable) {
    console.log(`CA_AGREE_STATE=UNMEASURABLE 静态 ${AXIS.staticN} 个键与结果件 ${AXIS.distinctKeys} 个键零重合 —— 八成是 --ops 与 --results 配错了轮次/身份，这一轴没有任何读数，不印百分比`);
  } else {
    console.log(`CA_AGREE_RATE 假阳性率（静态命中里执行侧照做的占比）= ${AXIS.fpRate}%（${AXIS.fp}/${AXIS.staticN}）；其中"跑完且通过"的硬口径 = ${AXIS.fpHardRate}%（${AXIS.passed}/${AXIS.staticN}）`);
    console.log(`CA_AGREE_RATE 召回率（执行器拒答里静态也拦到的占比）= ${AXIS.recall === null ? "不可测（本轮执行器一条 action-not-automatable 都没标，分母为 0）" : AXIS.recall + "%（" + AXIS.both + "/" + AXIS.refused + "）"}；静态精确率 = ${AXIS.precision}%`);
    if (AXIS.refused === 0) console.log(`CA_AGREE_STATE=NO-EXEC-REFUSAL 召回轴这一发不可测（旧实现在这里印 0% 冒充读数），假阳性轴仍然可测并已给出`);
  }
}

try { mkdirSync(dirname(resolve(ROOT, SIDE)), { recursive: true }); } catch (e) { /* 已存在 */ }
const out = {
  generatedAt: new Date().toISOString(),
  opsDir: relPosix(relative(ROOT, OPS)),
  total, bad, clean: total - bad, byPattern, flagged,
  // 自证轴的读数一并落盘：这半轴此前只存在于 stdout，侧车里一个字都没有，
  // 于是"门自己作证了吗"这个问题在机器可读的那一份里根本问不出来。
  agree: AXIS ? { results: relPosix(relative(ROOT, resolve(ROOT, RESULTS))), ...AXIS } : null,
};
writeFileSync(resolve(ROOT, SIDE), JSON.stringify(out, null, 2) + "\n");
say(`CA_SIDECAR ${relPosix(relative(ROOT, resolve(ROOT, SIDE)))}`);
/* 退出码语义（本轮实测后定的，不凭手感）：
   默认只报数不判红（exit 0），要拿它当门禁必须显式 --strict；
   否则下一轮会出现"门是红的、但没人知道该先修门还是先修用例"的经典僵局。
   2026-09-30 复量更正（此前的 136/83 是 round-6 记账时的数，一直没跟上一轮改词表后的实测）：
   在唯一可用的配对（round-6/ops × round-6/interact/exec-results.json，1107 行全键重合）上
   实测 执行器拒答=140 静态命中=102 交集=17 ⇒ 假阳性率 85/102=83.3%（48 条跑完且通过、
   37 条被试图执行后死在 element-not-found/watchdog，零条"没跑到"），硬口径 48/102=47.1%。
   这不是"未量"了，是量大到极性该由人拍板 —— 所以默认仍然 ADVISORY，判红权仍在 --strict。 */
const STRICT = has("strict");
const fpNote = !AXIS
  ? "假阳性率未量（没喂 --results——门禁表当前那一发就是这发，自证轴事实上从未被接线跑过）"
  : (AXIS.measurable
    ? `假阳性率已量 ${AXIS.fpRate}%（${AXIS.fp}/${AXIS.staticN}，其中"跑完且通过"硬口径 ${AXIS.fpHardRate}%），召回率 ${AXIS.recall === null ? "不可测" : AXIS.recall + "%"}；数字大不归本门自处，判红权在 --strict`
    : "假阳性率不可测（静态键与结果件零重合，见 CA_AGREE_STATE=UNMEASURABLE）");
const ownerNote = bad === 0 ? "" :
  "；分派口径：「真能力缺口」归 harness（要加 op），「逐态标注/亚秒连拍/全文本扫描/主观审美」归用例设计（要换等价可断言写法），" +
  "而『读 .x / 检查 x 是否 y』这类观察型断言**两边都不归**——它们是执行器旧词汇表的缺口，本轮已在 r-exec 修掉";
console.log(bad === 0
  ? "CA_RESULT=PASS（静态未见不可自动化写法）"
  : `CA_RESULT=${STRICT ? "FAIL" : "ADVISORY"}（静态命中 ${bad}/${total}，占 ${Math.round((bad / Math.max(1, total)) * 1000) / 10}%；${fpNote}，默认不判红——要判红加 --strict）${ownerNote}`);
process.exit(bad === 0 ? 0 : (STRICT ? 1 : 0));
