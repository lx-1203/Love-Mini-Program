/**
 * 收官闭环总报告生成器（**轮次无关**：轮次身份 / 日期 / 裁定册 / 落点全部由命令行给出，一个都不写死）。
 *
 * 用法（Node >= 20.11；PATH 上的 node 是 v16，会崩）：
 *   node22 scripts/qa/gen-round8-report.mjs --out <本轮报告落点> --ledger <裁定册> \
 *        [--round v3.8] [--date 2026-10-16] [--baseline <起始 sha>] [--summary <终局读数件>] \
 *        [--gapbill <f>] [--openrows <f>] [--interact-leg <f>] [--interact-audit <f>] [--prose <f>]
 * 退出码：0 已写盘（分桶守卫可以同时印 RED，那是读数不是崩溃）
 *         2 生成器自己没跑成（缺 --out / 缺 --ledger / 裁定册读不到）
 *         3 **溯源拒绝**：这一发会覆写别的轮次的交付件，或 --round 与裁定册自述的轮次不符
 *
 * 【--out 不给缺省值】带缺省的 --out 就是本缺陷本身：它原先默认
 * `reports/audit/round-7/round8-final-report.md`，两个"全清单"载具都**不带参数**调它
 * （run-final-verify-v33.sh 的 g 步骤、miniprogram-ui-audit-v38.dwf.ts 的报告回填），
 * 于是今天的全清单一跑就会拿今天的读数盖掉 2026-09 那一份历史交付件，而本轮（v3.8）的总报告根本不存在。
 * 同一条 bug class 本仓已踩过两次：dryrun-workflow.mjs:24 的缺省 --file 两次把工作流预检指到别的版本；
 * 该病后来由 scripts/qa/tcheck-workflow.cjs 以"不给缺省、缺了就 exit 2 大声失败"收口（见其头注 :18-20）。
 * 这里照抄那条家规：**没有 --out 就绝不猜一个落点写下去**。--ledger 同规。
 *
 * 【溯源守卫（可以变红）】写盘前比对"这一发即将印出的轮次身份"与"--out 上已存在那份文件的身份"
 * （H1 里的 v-标签与日期、正文点名的裁定册路径）。两者任一可比字段不符 ⇒ GENREPORT_PROVENANCE=RED
 * 并以 exit 3 拒绝写入；已存在但**读不出身份**（手写交付件）同样拒绝——不能证明是本轮的就不是本轮的。
 * 这是真正防复发的条款：光加旗标只是把写错的地方换个位置，守卫才让它写错时响亮地失败。
 * 第二轮复量同一轮 ⇒ 身份相同 ⇒ 照常覆盖，这正是"落盘后重跑一次即可"的既有契约。
 *
 * 【本轮身份对裁定册的交叉核对】轮次/日期优先吃 --round/--date；没给就从**裁定册自己的 H1** 现读
 * （`# 裁定包 v3.8（2026-10-16）…` ⇒ v3.8 / 2026-10-16）：从盘上派生，不手抄。
 * 给了 --round 且与裁定册自述不符 ⇒ 同样 exit 3：那正是"v3.8 的报告里装着 v3.3 的叙事"这一型的成因。
 *
 * 【叙事形状：选 (b) 生成器只产从盘上可导出的节】本生成器原先把上一程（v3.3）的历史散文写死在代码里
 * ——死掉的会话 `dwfrun-e9907ebc`、F2 崩溃、`WF-V33-AUDIT-2026-09-29.md`、提交 `34b6fb3d`…——
 * 于是任何别的轮换用它都会读到一段别人的故事。两条路里（a）把散文搬到每轮输入件、(b) 只产盘上可导出的节
 * 加一段"叙事归收口车道"的明标桩：这里选 **(b)**。理由是 (a) 仍要求每轮把散文喂进来，忘了喂就回落到
 * 上一轮的文本；(b) 做不到就**什么都不印**，形状与"没干活"不可混淆，且与既有约定（未量到 ⇒ 未跑，不留结论）
 * 同一条口径。换轮次因此不再需要回来改这个文件。
 * 本轮可导出的节 = 1 缺口账单 / 4 未结行与阻断 / 5 交互腿 / 6 拍板分桶 / 7 终局复量 / 以及 §0 身份自证；
 * 叙事节 2、3、8 归收口车道（给了 --prose 就逐字并进来，没给就只印桩）。**生成器绝不代拟叙事。**
 *
 * §6 的分桶口径（L21 修的就是这里）：裁定册 `## N.` 标题数会随编排方收账不断虚增（新增一节流水 ⇒ "需你拍板 N 项" 自动 +1），
 *       所以 §6 只列**真正待用户拍板**的节，其余按「已裁定 / 已闭或状态对账 / 流水与自我纠正」分桶并各自带条数。
 *       分桶是保守的：默认桶=待拍板，只有标题命中下方显式规则才移出，且每条移出项在报告里带一行移出依据；
 *       规则按语义措辞、不按编号写死，故新增节会自动落进正确的桶，不需要人回来改代码，也不新增任何需人工维护的名单。
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, relative } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
/* 旗标一律**无缺省**（返回 null）：缺省值正是上一轮被覆写的成因，见头注。 */
const flag = (name) => { const i = argv.indexOf("--" + name); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
/* 相对/绝对都收：载具（bash、DSL 的 closureDir）可能给绝对路径，join(REPO,"D:/…") 会拼出畸形路径。 */
const P = (p) => (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(p) ? p : join(REPO, p));
const rel = (p) => relative(REPO, P(p)).split("\\").join("/");
const finish = (status, reason, code) => { console.log(`GENREPORT_RESULT=${status} ${reason}`); process.exit(code); };

const OUT_REL = flag("out");
if (!OUT_REL) finish("NOOUT", "必须显式给 --out：带缺省的 --out 已把上一轮（round-7/v3.3）的权威件当成默认落点，这正是本缺陷（家规同 tcheck-workflow.cjs 的不给 --file 缺省）⇒ 用法 --out reports/audit/<本轮目录>/<本轮报告>.md", 2);
const LEDGER_REL = flag("ledger");
if (!LEDGER_REL) finish("NOLEDGER", "必须显式给 --ledger：默认值写的是另一轮的裁定册，读错册子等于把别人的待办数当本轮数 ⇒ 用法 --ledger reports/audit/<本轮目录>/decisions-<本轮>.md", 2);

const rd = (p, dflt) => { if (!p) return dflt; try { return JSON.parse(readFileSync(P(p), "utf8")); } catch { return dflt; } };
/* 只有 --summary 保留缺省，因为它是两个载具**自己每轮现写**的那份读数件（终局复量落盘点），
   不是某一轮的历史交付件；其余全是历史件 ⇒ 无缺省，不给就当未跑。 */
const SUMMARY_REL = flag("summary") || ".zcode/tmp/final-verify/summary.json";
const g = {
  gap: rd(flag("gapbill"), null),
  recheck: rd(flag("recheck"), null),
  postCommit: rd(flag("postcommit"), null),
  open: rd(flag("openrows"), null),
  interact: rd(flag("interact-leg"), null),
  interactAudit: rd(flag("interact-audit"), null),
  final: rd(SUMMARY_REL, null),
};

/* ── 轮次身份：命令行优先，缺则从裁定册 H1 现读（派生而非手写）────────────────── */
const ID_RE = { v: /\bv\d+(?:\.\d+)?\b/i, date: /\d{4}-\d{2}-\d{2}/, tag: /\bround-\d+\b/i };
const idSig = (text) => {
  const h1 = String(text).split(/\r?\n/).find((l) => /^#\s/.test(l)) || "";
  const ledgers = [...String(text).matchAll(/reports\/audit\/[^\s`"'()]*?decisions[^\s`"'()]*\.md/g)].map((m) => m[0]);
  return {
    round: (ID_RE.v.exec(h1) || [])[0]?.toLowerCase() || null,
    date: (ID_RE.date.exec(h1) || [])[0] || null,
    tag: (ID_RE.tag.exec(h1) || [])[0]?.toLowerCase() || null,
    ledger: ledgers.length ? ledgers.sort((a, b) => ledgers.filter((x) => x === b).length - ledgers.filter((x) => x === a).length)[0] : null,
    h1,
  };
};
let ledgerRaw;
try { ledgerRaw = readFileSync(P(LEDGER_REL), "utf8"); } catch (e) { finish("NOLEDGER", "裁定册读不到 " + rel(LEDGER_REL) + "：" + (e && e.code), 2); }
const ledgerId = idSig(ledgerRaw);
const ROUND = (flag("round") || ledgerId.round || "").toLowerCase() || null;
const DATE = flag("date") || ledgerId.date || null;
const ROUND_SRC = flag("round") ? "命令行" : ledgerId.round ? "裁定册H1派生" : "未指明";
const DATE_SRC = flag("date") ? "命令行" : ledgerId.date ? "裁定册H1派生" : "未指明";

/* ── 守卫一：--round/--date 与裁定册自述的轮次不得打架 ─────────────────────────
   成因实测：本生成器原先硬编码 v3.3 身份，而载具拿的是 v3.8 的册子 ⇒ 报告与册子分属两轮。
   两侧任一读不到就不比（不能拿"没写"去判别人错），但会在 §0 明印来源，绝不静默。 */
const idConflicts = [];
if (flag("round") && ledgerId.round && ROUND !== ledgerId.round) idConflicts.push(`--round=${ROUND} vs 裁定册自述=${ledgerId.round}`);
if (flag("date") && ledgerId.date && DATE !== ledgerId.date) idConflicts.push(`--date=${DATE} vs 裁定册自述=${ledgerId.date}`);
console.log(`GENREPORT_IDENTITY round=${ROUND || "(未指明)"} date=${DATE || "(未指明)"} round_src=${ROUND_SRC} ledger_round=${ledgerId.round || "(读不出)"} ledger_date=${ledgerId.date || "(读不出)"}`);
if (idConflicts.length) {
  console.log(`GENREPORT_PROVENANCE=RED kind=ledger out=${rel(OUT_REL)} conflicts=${idConflicts.join(" ")}`);
  finish("IDENTITY", "拒绝生成：报告身份与裁定册分属两轮，写出来的就是「上一轮的叙事挂本轮标题」 ⇒ " + idConflicts.join(" "), 3);
}

const ledgerLines = ledgerRaw.split(/\r?\n/);
const ledgerDigest = createHash("sha1").update(ledgerRaw).digest("hex").slice(0, 12);
const ledgerBytes = Buffer.byteLength(ledgerRaw);
/* 裁定册的每一条 `## N.` 标题 + 其正文（到下一个 `## ` 为止），全部取自盘上文本，不引入任何人工名单。 */
const hIdx = [];
ledgerLines.forEach((l, i) => { if (/^## \d+\./.test(l)) hIdx.push(i); });
const decisionSections = hIdx.map((start, k) => {
  const end = k + 1 < hIdx.length ? hIdx[k + 1] : ledgerLines.length;
  return {
    title: ledgerLines[start].replace(/^## /, "").trim(),
    num: Number(ledgerLines[start].match(/^## (\d+)\./)[1]),
    body: ledgerLines.slice(start + 1, end),
  };
});

/* ── §6 分桶规则（L21）───────────────────────────────────────────────────────────
   默认桶 = 待拍板（pending）。只有标题命中下面的显式规则才移出；每条移出项记下命中的规则与原文片段，
   报告里逐条印成"移出依据"，任何人可复核。规则一律按**语义措辞**匹配，不按编号，所以：
     · 编排方新增 `## 34. r9 收口流水（…）` ⇒ 自动进流水桶，待拍板数不变；
     · 新增 `## 35. 需要你定 X` ⇒ 不命中任何移出规则 ⇒ 留在待拍板桶。
   ASK_OVERRIDE 是反例守卫：标题里只要还带"要你拍板/你定/还是/得你选"这类选择题措辞，即使同时命中移出规则也**留在**
   待拍板桶（例如 `15. …：修成真的门，还是归档` 含"归档"字样但不是结论）。守卫只会让待办数变大，不会凭空变小。 */
const BUCKETS = [
  { key: "pending", label: "待拍板", default: true },
  { key: "ruled", label: "已裁定（册内已记录用户裁定）" },
  { key: "closed", label: "已闭或状态对账" },
  { key: "log", label: "流水与自我纠正" },
];
const RULES = [
  { bucket: "ruled", re: /已裁定|用户裁定|裁定[一二三四五六七八九十\d]+项|裁定只写/, why: "标题声明该节的裁定已经下过，不是新的选择题" },
  { bucket: "closed", re: /状态对账|现状态只写在|已闭|已结案|已销账|已归档/, why: "标题声明本节是状态对账/结案，不是要用户选" },
  { bucket: "log", re: /流水|收口(?:流水|记录|台账)|自我纠|纠正|纠出|勘误|更正|已量成实测|已经?跑完|复盘/, why: "标题声明本节是流水/实测纠正的记录，没有要用户选的方向" },
];
const ASK_OVERRIDE = /(?:需|请|待|要|等|得|必须|由|交)[^，。；]{0,10}(?:你|用户)[^，。；]{0,10}(?:拍板|裁定|定|选|决定|认定|放行|授权|点头)|(?:交|由)\s*(?:你|用户)\s*(?:定|裁|选|决定|认定)|还是|要不要/;
const classified = decisionSections.map((s) => {
  const hit = RULES.find((r) => r.re.test(s.title));
  const ask = ASK_OVERRIDE.exec(s.title);
  if (!hit) return { ...s, bucket: "pending", basis: "未命中任何移出规则 ⇒ 按保守默认留在待拍板桶" };
  if (ask) return { ...s, bucket: "pending", heldByAskOverride: true, basis: `虽命中「${hit.re}」，但标题仍含选择题措辞「${ask[0]}」⇒ 反例守卫把它留在待拍板桶` };
  const frag = s.title.match(hit.re)[0];
  return { ...s, bucket: hit.bucket, basis: `标题命中显式规则 \`${hit.re}\`（原文片段「${frag}」）—— ${hit.why}` };
});
const bucketOf = (k) => classified.filter((c) => c.bucket === k);
const pending = bucketOf("pending");
const bucketCount = (k) => bucketOf(k).length;
const bucketSum = BUCKETS.reduce((a, b) => a + bucketOf(b.key).length, 0);
/* 反"凭空归零"守卫：待拍板桶空但标题数>0，或移出比例超过 70%，判红（印 GENREPORT_BUCKET_GUARD=RED）。 */
const guardRed = classified.length > 0 && (pending.length === 0 || (classified.length - pending.length) / classified.length > 0.7);
/* 名册优先（r10）：标题分桶再保守也只能读"标题怎么写"，读不到后面状态对账节里的闭合 ⇒ 同一个"待拍板数"
   在盘上会长期并存三个（26 按标题 / 15 按 §30 那句人工汇总 / 18 按逐节核对）。裁定册 §36 把最后一者做成了
   具名机器块，本节**优先读它**；读不到就退回标题分类，但必须**明印"未读名册"**——静默退回就等于把分类器
   的保守数冒充成待办真数。 */
/* 字段按"下一个键名"切，不按 `|` 切：写入方（裁定册 §36）用 `|` 作 options 的内部分隔符，
   早先用 `[^|]*` 取 status 会把 "open title=… options=A|B" 整串吞进来 ⇒ 18 条 open 全被筛掉，
   §6 静默印成「需你拍板 0 项」。这就是"凭空归零"最日常的成因：不是有人放宽判据，是解析器与写入器的分隔符打架。 */
const RKEYS = [" status=", " title=", " options=", " premise=", " basis="];
const parseRuling = (l) => {
  /* 终止键按"实际存在的最早那个"取，不能假设某个键一定在：#1/#3 这类行没有 premise=，
     早先写死 cut(" options=", " premise=") 时找不到停止符就一路吃到行尾，把 basis="…" 也吞进 options。 */
  const cut = (fromKey, stops) => {
    const a = l.indexOf(fromKey);
    if (a < 0) return "";
    const start = a + fromKey.length;
    const cands = stops.map((k) => l.indexOf(k, start)).filter((i) => i >= 0);
    if (cands.length === 0) return l.slice(start).trim();
    return l.slice(start, Math.min(...cands)).trim();
  };
  const first = RKEYS.map((k) => (l.indexOf(k) < 0 ? Infinity : l.indexOf(k))).sort((x, y) => x - y)[0];
  return {
    id: first === Infinity ? l.replace(/^RULING\s+/, "") : l.slice("RULING id=".length, first).trim(),
    status: cut(" status=", [" title="]),
    title: cut(" title=", [" options="]),
    options: cut(" options=", [" premise=", " basis="]),
    premise: cut(" premise=", [" basis="]),
    basis: cut(" basis=", []),
  };
};
const roster = (() => {
  const b = ledgerLines.findIndex((l) => /^\s*PENDING_RULINGS_BEGIN/.test(l));
  if (b < 0) return null;
  const e = ledgerLines.findIndex((l, i) => i > b && /^\s*PENDING_RULINGS_END/.test(l));
  if (e < 0) return { broken: true, beginLine: b + 1 };
  const rows = ledgerLines.slice(b + 1, e).filter((l) => /^\s*RULING id=/.test(l)).map(parseRuling);
  /* 名册存在但一条 open 都切不出来 ⇒ 两种形状必须分开判（2026-10-06 补）：
     ① 解析事故（当年踩的分隔符打架）：切出的 status 全是词表外的串，或尾部计数与实际行数对不上
        ⇒ 绝不能把 §6 印成「需你拍板 0 项」：宁可退回保守的标题分类并明说，也不能让待办凭空归零。
     ② 全量裁定落账后的合法归零（decisions-v33 §36.2：13 项 open 已裁，0/8/12 与尾部自洽）
        ⇒ 名册有效，§6 交还空清单是事实而不是故障。
     判据：三态词表内 + 尾部 open/half_closed/closed 与逐行计数完全自洽 ⇒ ②，否则按 ① 处理。
     只放宽到"自洽的零"，不自洽的零（含大小写漂移、键名打架、尾部忘改）仍然按未读名册处理。 */
  if (rows.length > 0 && rows.filter((r) => r.status === "open").length === 0) {
    const KNOWN_STATUS = ["open", "half-closed", "closed"];
    const tailHeader = /open=(\d+) half_closed=(\d+) closed=(\d+)/.exec(ledgerLines[e]);
    const tail = tailHeader ? { open: +tailHeader[1], half: +tailHeader[2], closed: +tailHeader[3] } : null;
    const allKnown = rows.every((r) => KNOWN_STATUS.includes(r.status));
    const tailAgrees = !!tail && tail.open === 0
      && tail.half === rows.filter((r) => r.status === "half-closed").length
      && tail.closed === rows.filter((r) => r.status === "closed").length;
    if (!(allKnown && tailAgrees)) {
      return { broken: true, beginLine: b + 1, endLine: e + 1, rows, reason: "名册有 " + rows.length + " 行却切不出任何 status=open ⇒ 解析器与写入器格式打架，按未读名册处理" };
    }
  }
  const header = /open=(\d+) half_closed=(\d+) closed=(\d+)/.exec(ledgerLines[e]);
  return {
    beginLine: b + 1, endLine: e + 1, rows,
    open: rows.filter((r) => r.status === "open"),
    halfClosed: rows.filter((r) => r.status === "half-closed"),
    closed: rows.filter((r) => r.status === "closed"),
    declared: header ? { open: +header[1], half: +header[2], closed: +header[3] } : null,
    selfCountAgree: header ? (+header[1] === rows.filter((r) => r.status === "open").length && +header[2] === rows.filter((r) => r.status === "half-closed").length && +header[3] === rows.filter((r) => r.status === "closed").length) : false,
  };
})();
const pendingView = roster && roster.open ? roster.open.map((r) => ({ title: `${r.id}：${r.title}（可选：${r.options}）` + (r.premise && r.premise !== "unchanged" ? ` ｜⚠ 前提${r.premise}` : ""), num: -1 })) : pending;
/* 册内显式声明对账：只取**最后一处「以『仍等你裁定』起头的声明行」**，纯读盘、只印对照，不参与分桶（参与就变成靠人记得改的名单了）。
   后来新增的节会**引用**这句话来点评旧清单（如 §34 引用 §30 那句），引用不是声明 ⇒ 按措辞排除，否则会把"已关掉"的编号也当成待裁项。 */
const isDeclaration = (l) => /^\s*[*>-\s]*\**仍等你裁定/.test(l) && !/那句|漏计|引用|指的/.test(l);
const declIdx = ledgerLines.reduce((acc, l, i) => (isDeclaration(l) ? i : acc), -1);
const declSection = (() => {
  if (declIdx < 0) return -1;
  for (let i = declIdx - 1; i >= 0; i--) { const m = ledgerLines[i].match(/^## (\d+)\./); if (m) return Number(m[1]); }
  return -1;
})();
const newestSection = classified.length ? classified[classified.length - 1].num : -1;
const declaredNums = declIdx >= 0
  ? [...new Set((ledgerLines.slice(declIdx, declIdx + 6).join(" ").match(/#\d+/g) || []).map((x) => Number(x.slice(1))))].sort((a, b) => a - b)
  : [];
const declaredSet = new Set(declaredNums);
const diffVsLedger = pending.filter((p) => !declaredSet.has(p.num));
/* 差集逐条给一句"册内自己怎么说"：只摘盘上原文，不改分桶。摘录在 ⇒ 说明册内另有说法；摘不到 ⇒ 更像那行声明漏列。 */
const closedClaim = (num) => {
  const re = new RegExp(`#${num}(?![0-9])`);
  const line = ledgerLines.find((l) => re.test(l) && /已闭|已修|取代|已结案|已落地|不再|换成实测|纠了我自己的错/.test(l));
  return line ? line.trim().slice(0, 78) : null;
};

/* git 区间：原先写死 `a4c8f995..HEAD`（那是 v3.3 的起点，换轮次就是错的，本文件老注释自己也承认"换轮次要改"）。
   现在归 --baseline：不给就**不算**（未跑，不留结论），绝不拿上一轮的起点当本轮区间。 */
const BASELINE = flag("baseline");
let commits = [];
let gitErr = null;
if (BASELINE) {
  try {
    commits = execFileSync("git", ["log", "--format=%h\t%s", `${BASELINE}..HEAD`], { cwd: REPO, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean).reverse();
  } catch (e) { gitErr = String((e && (e.stderr || e.message)) || e).split(/\r?\n/)[0].slice(0, 160); }
}
const HEAD_NOW = (() => { try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim(); } catch { return null; } })();

/* 量不到的节一律走本仓既有约定：只印"未跑，故此处不留结论"，不留占位字段、不编数。 */
const NOT_RUN = "**（未跑，故此处不留结论。）**";
const proseStub = (no, title, who) => {
  L.push(`## ${no}. ${title}`, "");
  L.push(`${NOT_RUN} 本节属**收口车道的叙事**，生成器不代拟：它能落的只有盘上可导出的读数（见 §0/§1/§4/§5/§6/§7），"本轮改了什么、收了多少账"这类判断没有测量来源，写出来就是编。要并入车道撰写的文本，给生成器传 \`--prose <文件>\`，其内容会逐字追加在本节末尾。${who ? ` 上一轮（v3.3）同位置的那段散文已从代码里删除——它曾被硬编码进生成器，任何别的轮次用它都会读到别人的故事。` : ""}`, "");
};

const L = [];
L.push(`# 收官闭环总报告${ROUND && DATE ? `（${ROUND}，${DATE}）` : "（轮次身份未指明）"}`, "");

L.push("## 0. 本报告的身份（生成器自证，全部现读，供复核）", "");
L.push(`- 轮次=\`${ROUND || "(未指明)"}\`（来源：${ROUND_SRC}）｜日期=\`${DATE || "(未指明)"}\`（来源：${DATE_SRC}）`);
L.push(`- 裁定册=\`${rel(LEDGER_REL)}\` sha1=${ledgerDigest} bytes=${ledgerBytes}；册子 H1 自述轮次=\`${ledgerId.round || "(读不出)"}\` 日期=\`${ledgerId.date || "(读不出)"}\``);
L.push(`- 落点=\`${rel(OUT_REL)}\`${existsSync(P(OUT_REL)) ? "（已存在 ⇒ 本轮复量覆盖，覆盖前已通过溯源守卫）" : "（新建）"}`);
L.push(`- git 区间：${BASELINE ? `\`${BASELINE}..HEAD\`（HEAD=${HEAD_NOW}，提交 ${commits.length} 发）` : "未给 --baseline ⇒ 未跑，故此处不留结论"}${gitErr ? `（git 读取失败：${gitErr}）` : ""}`);
L.push(`- 终局读数件=\`${rel(SUMMARY_REL)}\`${g.final ? `（headBefore=${g.final.headBefore || "?"} headAfter=${g.final.headAfter || "?"} producedBy=${g.final.producedBy || "?"}；**这一发是不是本轮的，由载具写入时机保证**）` : "（盘上没有）"}`);
L.push(`- 溯源守卫：落盘前判定，判红即 exit 3 且不写任何字节；见进程末尾的 \`GENREPORT_PROVENANCE\` 机器行`, "");

L.push("## 1. 起点账单（缺口账单件，Node 22 实测）", "");
if (g.gap) {
  const reds = g.gap.red || (g.gap.gates || []).filter((x) => x.exitCode !== 0).map((x) => x.name);
  L.push(`门禁并行实测 ${(g.gap.gates || []).length} 项，红 ${reds.length} 项：${reds.join("、") || "无"}。` +
    `（此句读的是**缺口账单件**，其 HEAD=${g.gap.head || "unknown"}；终局复量那一发在第 7 节，两份件不同源、` +
    `口径以第 7 节为准。` +
    /* 从前这里写死一句"只有整条工作流真跑时才会重打，只跑终验脚本时它是上一程的旧件"。
       那句话现在不成立了（emit-round-bill 已接进两个载具、每轮重打），留着会让下一程
       怀疑一个其实新鲜的数。改成按两发的 HEAD 现算：同源就说同源，不同源才报谁先谁后。 */
    (g.final && g.gap.head && (g.final.headAfter || g.final.headBefore)
      ? `本件 HEAD 与终局复量${g.gap.head === (g.final.headAfter || g.final.headBefore) ? "同源（同一枚提交的两发读数）" : `不同源（终局那发在 ${g.final.headAfter || g.final.headBefore}）⇒ 本件是那一发之前的口径`}`
      : "缺终局读数件，无法判定两发是否同源 ⇒ 本节只作旁证，不当作终局结论。") + ")");
  if (g.gap.dirty !== undefined) L.push(`- 起点 HEAD=${g.gap.head}，工作树脏 ${g.gap.dirty} 项。`);
  L.push("");
} else {
  L.push(NOT_RUN, "");
}

proseStub(2, "工作流本身改了什么（生成器不产叙事）", true);
proseStub(3, "工具与证据侧的实质修复（生成器不产叙事）", false);

L.push("## 4. 台账：未结行与阻断（机械归置）", "");
if (g.open) {
  L.push(`- 剩余未结 ${g.open.openRowCount} 行，机械归置：现在可落账 ${g.open.landableNow} 条（明细见 \`${rel(flag("openrows"))}\`）。`);
  if (g.open.blockers) L.push(`- 阻断归因：${JSON.stringify(g.open.blockers).slice(0, 400)}`);
  L.push("");
} else {
  L.push(NOT_RUN, "");
}

L.push("## 5. 真实模式交互腿", "");
if (g.interact) {
  const rows = g.interact.rows || [];
  const d = rows.reduce((a, r) => ((a[r.outcome || r.status] = (a[r.outcome || r.status] || 0) + 1), a), {});
  L.push(`结果行数 ${rows.length}，分布：${Object.entries(d).map(([k, v]) => `${k} ${v}`).join(" / ") || "（无行）"}。`);
  L.push(`门复跑：${String((g.interact.gateRerun && g.interact.gateRerun.out) || "").split(/\r?\n/)[0] || "读数缺失"}；exit=${g.interact.gateRerun ? g.interact.gateRerun.exit : "?"}。`);
  if (g.interactAudit) L.push(`独立复核：${g.interactAudit.verdict}（由主会话重算，不信车道自报）。`);
  L.push("");
} else {
  L.push(NOT_RUN, "");
}

L.push("## 6. 需你拍板 " + pendingView.length + " 项（本轮一律未自裁）", "");
L.push(roster && roster.open
  ? `> **本节读的是裁定册的具名机器名册**（\`PENDING_RULINGS\` 第 ${roster.beginLine}–${roster.endLine} 行，open=${roster.open.length} half-closed=${roster.halfClosed.length} closed=${roster.closed.length}；名册自带对账：${roster.selfCountAgree ? "尾部计数与实际行数一致" : "**尾部计数与行数不一致，名册需回修**"}）。标题分桶那一套仍照常算，用作**交叉核对**：分类器判 ${pending.length} 条 ⇒ 差 ${Math.abs(pending.length - roster.open.length)} 条，差因是分类器只读标题措辞、读不到状态对账节里的闭合（不是谁算错）。`
  : `> ⚠ **未读名册**：裁定册里没有 \`PENDING_RULINGS_BEGIN/END\` 块（或块未闭合：${roster && roster.broken ? "有 BEGIN 无 END，行 " + roster.beginLine : "整块缺失"}）⇒ 本节退回**标题语义分类**，那个数按构造只会偏保守（把已闭的算成待办），不得当成"真待办数"引用。`, "");
L.push(`> 口径钉死：本节的分母是裁定册 \`${rel(LEDGER_REL)}\`（sha1=${ledgerDigest}，${ledgerBytes} 字节）里**全部 ${classified.length} 条 \`## N.\` 标题**；` +
  `原先的写法直接把标题总数当待拍板数（结构派生计数会随收账虚增），现按语义分桶：**待拍板 ${bucketOf("pending").length} / 已裁定 ${bucketOf("ruled").length} / 已闭或状态对账 ${bucketOf("closed").length} / 流水与自我纠正 ${bucketOf("log").length}**，` +
  `守恒 ${BUCKETS.map((b) => bucketOf(b.key).length).join("+")}=${bucketSum}（应等于 ${classified.length}）。默认桶是待拍板，只有命中显式规则才移出，每条移出项在下面 6.2 附一行依据。`, "");
for (const d of pendingView) L.push("- " + d.title);
if (pending.length === 0) L.push("- **（本桶为空。若裁定册仍有 `## N.` 标题却一条待办都没有，这是分桶规则过度移出的形状，先按 6.2 逐条复核再采信。）**");
L.push("", `GENREPORT_DECISION_BUCKETS ledger=${rel(LEDGER_REL)} sha1=${ledgerDigest} headings_total=${classified.length} pending=${bucketOf("pending").length} ruled=${bucketOf("ruled").length} closed=${bucketOf("closed").length} log=${bucketOf("log").length} sum=${bucketSum}`, "");
L.push(`GENREPORT_SECTION6_SELFCOUNT heading_number=${pendingView.length} listed_items=${pendingView.length} source=${roster && roster.open ? "roster" : "heading-classification"} crosscheck_classification=${pending.length} matches_title=${pendingView.length === Number(L.filter((x) => /^## 6\. 需你拍板 (\d+) 项/.test(x)).map((x) => x.match(/^## 6\. 需你拍板 (\d+) 项/)[1])[0])}`, "");
L.push(`GENREPORT_BUCKET_GUARD=${guardRed ? "RED" : "OK"} removed=${classified.length - pending.length}/${classified.length} pending_zero_guard=${pending.length === 0 && classified.length > 0 ? "TRIPPED" : "clear"} ask_override_held=${classified.filter((c) => c.heldByAskOverride).length}`, "");
L.push(`GENREPORT_LEDGER_DECLARED marker_line=${declIdx + 1} marker_section=${declSection} latest_section=${newestSection} declared_lag=${newestSection - declSection} pending_declared=${declaredNums.length} diff_vs_generator=${diffVsLedger.length} diff_items=${diffVsLedger.map((p) => `#${p.num}`).join(",") || "无"}`, "");

L.push("### 6.1 各桶条数（按标题总数计的原始数一并印出，便于核对没漏项）", "");
for (const b of BUCKETS) L.push(`- ${b.label}：${bucketOf(b.key).length} 条`);
L.push(`- 原始数（裁定册 \`## N.\` 标题总数，含以上四桶，即修复前 §6 会印的数）：${classified.length} 条`, "");

L.push("### 6.2 已从「待拍板」移出的条目（每条一行移出依据，逐条可复核）", "");
const moved = classified.filter((c) => c.bucket !== "pending");
if (!moved.length) L.push("- （无）");
for (const m of moved) L.push(`- ${m.title}\n  ｜桶=「${BUCKETS.find((b) => b.key === m.bucket).label}」｜移出依据：${m.basis}`);
const held = classified.filter((c) => c.heldByAskOverride);
if (held.length) {
  L.push("", "以下条目命中了移出规则但被反例守卫留在待拍板桶（标题里还有选择题措辞）：");
  for (const h of held) L.push(`- ${h.title}\n  ｜${h.basis}`);
}
L.push("", `全文与每条的可选方向见 \`${rel(LEDGER_REL)}\`。判据冲突、令牌值、测试数据去留、证据入库方式都是政策选择，我不替你写。`, "");

L.push("### 6.3 与册内自述的对账（只印对照，不参与分桶）", "");
if (declIdx >= 0) {
  L.push(`- 裁定册第 ${declIdx + 1} 行（属 §${declSection}）有一处**声明式**的「仍等你裁定」，它列出的待裁项是 ${declaredNums.length} 条：${declaredNums.map((n) => `#${n}`).join(" ")}；册内最新的节已到 §${newestSection} ⇒ **该声明落后 ${newestSection - declSection} 节没重写**（引用它点评旧清单的那些行不算声明，已按措辞排除）。`);
  L.push(`- 本节（按标题语义分桶）判为待拍板的有 ${pending.length} 条；两者差 ${diffVsLedger.length} 条：${diffVsLedger.map((p) => `#${p.num}`).join(" ") || "无"}。`);
  for (const p of diffVsLedger) {
    const claim = closedClaim(p.num);
    L.push(`  - #${p.num} ${p.title}\n    ｜${claim ? `册内另有原文称其已收（照抄，不据此移桶）：「${claim}」` : "册内除那行声明外没有一处说它已闭 ⇒ 更可能是那行声明漏列，仍按待拍板交还"}`);
  }
  L.push("- 为什么**不**拿那行声明来分桶：它是编排方手写在册子里的一段汇总文本，会滞后（册内 §30 之后新增/翻转的节它不覆盖）。拿它当事实源就又把「清单靠人记得改」这个病请回来了。这里只印差集，让人一眼看出是「生成器漏了」还是「册内声明滞后」。");
} else {
  L.push("- （裁定册里没有「仍等你裁定」这一类册内声明，故不作对照。）");
}
L.push("");

L.push("## 7. 终局复量读数", "");
if (g.final) {
  L.push("```");
  for (const [k, v] of Object.entries(g.final.gates || {})) L.push(`${k} exit=${v}`);
  L.push("```");
  L.push(`红项：${(g.final.reds || []).join("、") || "无"}`);
  if (g.final.redsAfterCommit) L.push(`提交后翻转红项：${(g.final.redsAfterCommit || []).join("、") || "无"}（headAfter=${g.final.headAfter}）`);
  /* 这两发是**可选的独立复量件**（载具若有单独落盘就传进来）；不传就不印，本节只有 summary 那一发。 */
  if (g.recheck) L.push(`门禁复量件（--recheck）：${JSON.stringify(g.recheck).slice(0, 500)}`);
  if (g.postCommit) L.push(`提交后 sha 敏感门件（--postcommit，HEAD 一动读数就会变，绿可能是提交前快照）：${JSON.stringify(g.postCommit).slice(0, 500)}`);
} else {
  L.push(`${NOT_RUN} 全清单门禁终局复量（条数以 GATE_SUITE 为准，不写死数字）、反 vacuous-green 自检、QA 自测汇总器、不跳实时门的全量面板，统一由 \`scripts/qa/run-final-verify-v33.sh\` 产出（汇总写成 \`${rel(SUMMARY_REL)}\`，本生成器直接读它）。跑完再执行 \`node22 scripts/qa/gen-round8-report.mjs --out <本轮落点> --ledger <本轮裁定册>\`，本节自动填真实读数，不手抄数字。`);
}
L.push("");

proseStub(8, "本轮把「排在后面做」的账收掉了多少（生成器不产叙事）", false);

/* 车道叙事若真给了，逐字并进来；没给就只留上面的桩（形状 (b) 的另一半）。 */
const PROSE_REL = flag("prose");
if (PROSE_REL) {
  try { L.push("## 附. 收口车道撰写的叙事（生成器原样并入，未改一字）", "", readFileSync(P(PROSE_REL), "utf8").trimEnd(), ""); }
  catch (e) { L.push("## 附. 收口车道撰写的叙事", "", `**（--prose 指到 ${rel(PROSE_REL)} 却读不到：${e && e.code} ⇒ 此处不留结论。）**`, ""); }
}

/* ── 守卫二：溯源（这条才是防复发的牙齿）──────────────────────────────────────
   写盘前读 --out 上已存在那份文件的身份（H1 的 v-标签/日期 + 正文点名的裁定册），与这一发即将印出的
   身份逐字段比。可比字段任一不符 ⇒ GENREPORT_PROVENANCE=RED + exit 3，绝不"顺手"改写历史。
   · 文件不存在 ⇒ 没有可比对象，放行（本轮第一次落盘）。
   · 文件存在但读不出任何身份 ⇒ 照样拒绝：那是手写交付件，不能证明它属于本轮。
   · 同一轮复量 ⇒ 三字段全等 ⇒ 放行，保留"落盘后重跑一次即可"的既有契约。
   没有 --force 后门：本守卫拦的就是"以为自己在写本轮"，而写错的人从不觉得自己错。 */
const aboutTo = { round: ROUND, date: DATE, ledger: rel(LEDGER_REL) };
const guardLines = [];
if (!existsSync(P(OUT_REL))) {
  guardLines.push(`GENREPORT_PROVENANCE=ABSENT out=${rel(OUT_REL)} requested_round=${aboutTo.round || "-"} requested_date=${aboutTo.date || "-"} requested_ledger=${aboutTo.ledger} conflicts=none（落点上没有既有文件 ⇒ 本轮首次落盘，无可覆写的历史）`);
} else {
  const prev = idSig(readFileSync(P(OUT_REL), "utf8"));
  const cmp = [];
  if (!prev.round && !prev.date && !prev.ledger) cmp.push("existing=no-identity");
  for (const f of ["round", "date", "ledger"]) if (prev[f] && aboutTo[f] && prev[f] !== aboutTo[f]) cmp.push(`${f}: existing=${prev[f]} requested=${aboutTo[f]}`);
  guardLines.push(`GENREPORT_PROVENANCE=${cmp.length ? "RED" : "OK"} out=${rel(OUT_REL)} existing_round=${prev.round || "-"} requested_round=${aboutTo.round || "-"} existing_date=${prev.date || "-"} requested_date=${aboutTo.date || "-"} existing_ledger=${prev.ledger || "-"} requested_ledger=${aboutTo.ledger}${cmp.length ? " conflicts=" + cmp.join(" ") : " conflicts=none"}`);
  if (cmp.length) {
    for (const s of [...guardLines, ...L.filter((x) => /^GENREPORT_(IDENTITY|BUCKET|DECISION|SECTION6|LEDGER)/.test(x))]) console.log(s);
    finish("PROVENANCE", "拒绝写入：--out 上那份文件属于别的轮次（或无身份可证），覆写它=改写历史交付件 ⇒ 把 --out 换到本轮 closureDir 下再来", 3);
  }
}

writeFileSync(P(OUT_REL), L.join("\n") + "\n");
console.log("WROTE " + rel(OUT_REL) + " ledger=" + rel(LEDGER_REL) + ` round=${ROUND || "(未指明)"} date=${DATE || "(未指明)"}`);
console.log("commits=" + commits.length + " decisions=" + classified.length + " openRows=" + (g.open ? g.open.openRowCount : "n/a") + " finalReadings=" + (g.final ? "已填" : "未跑"));
console.log(`GENREPORT_IDENTITY round=${ROUND || "(未指明)"} date=${DATE || "(未指明)"} round_src=${ROUND_SRC} ledger_round=${ledgerId.round || "(读不出)"} ledger_date=${ledgerId.date || "(读不出)"}`);
for (const s of guardLines) console.log(s);
console.log(`GENREPORT_DECISION_BUCKETS ledger=${rel(LEDGER_REL)} sha1=${ledgerDigest} headings_total=${classified.length} pending=${bucketOf("pending").length} ruled=${bucketOf("ruled").length} closed=${bucketOf("closed").length} log=${bucketOf("log").length} sum=${bucketSum}`);
console.log(`GENREPORT_BUCKET_GUARD=${guardRed ? "RED" : "OK"} removed=${classified.length - pending.length}/${classified.length} pending_zero_guard=${pending.length === 0 && classified.length > 0 ? "TRIPPED" : "clear"} ask_override_held=${classified.filter((c) => c.heldByAskOverride).length}`);
console.log(`GENREPORT_SECTION6_SELFCOUNT heading_number=${pendingView.length} listed_items=${pendingView.length} source=${roster && roster.open ? "roster" : "heading-classification"} crosscheck_classification=${pending.length}`);
console.log(`GENREPORT_LEDGER_DECLARED marker_line=${declIdx + 1} marker_section=${declSection} latest_section=${newestSection} declared_lag=${newestSection - declSection} pending_declared=${declaredNums.length} diff_vs_generator=${diffVsLedger.length}`);
console.log(`GENREPORT_RESULT=OK out=${rel(OUT_REL)} round=${ROUND || "(未指明)"} date=${DATE || "(未指明)"} summary=${g.final ? "filled" : "not-run"}`);
