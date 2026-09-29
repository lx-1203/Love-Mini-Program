#!/usr/bin/env node
/**
 * 执行轮 FAILED / SKIPPED 行的分诊台（只读，不改任何权威件）。
 *
 * 为什么要"两份载体各查一遍"：执行轮跑的是 874ff52f 的冻结构建（dist），
 * 而修复波在这期间改的是源码树（src）。同一条"元素找不到"，
 * 在 dist 里有 / 没有，与在 src 里有 / 没有，是四个完全不同的结论：
 *   dist 无 + src 无 → 用例文案/选择器本就不属于这个构建（规格噪声或产品确实没有）
 *   dist 无 + src 有 → 修复波刚刚补上了它（本轮失败，重建后应复验）
 *   dist 有 + src 无 → 修复波把它删了（本轮通过的东西下次会没，必须复验）
 *   dist 有 + src 有 → 构建里有却定位不到 → 状态没到 / 时机太早 / 作用域找错（harness 或产品）
 * 只看其中一份就会把"harness 找不到"误报成"产品没有"，或反过来。
 *
 * 用法：node scripts/qa/triage-exec-failures.mjs \
 *         [--results reports/audit/round-6/interact/exec-results.json] \
 *         [--dist apps/client/dist/build/mp-weixin] [--src apps/client/src] \
 *         [--out .zcode/tmp/triage-r6] [--ops reports/audit/round-6/ops] \
 *         [--dead-selectors scripts/qa/cellplan-round7-deadselectors.json]
 */
import fs from "node:fs";
import path from "node:path";
import { landingStatus } from "./guest-landing-status.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const RESULTS = arg("results", "reports/audit/round-6/interact/exec-results.json");
const DIST = arg("dist", "apps/client/dist/build/mp-weixin");
const SRC = arg("src", "apps/client/src");
const OUT_RAW = arg("out", "");
/* 默认 out 不再是一个固定的 round-6 名字：换语料不换旗标 ⇒ 把 round-7 的分诊写进 round-6 的文件名里
   （本轮我自己就这么踩了一次：--results 指到 exec-guest-real-final，盘上 triage-r6.* 就成了它的替身）。
   没给 --out 时按语料目录自己起名，冲突不可能发生。 */
const OUT = OUT_RAW || ".zcode/tmp/triage-" + path.basename(String(RESULTS)).replace(/\.\w+$/, "").replace(/[^A-Za-z0-9._-]/g, "_") + (path.basename(path.dirname(String(RESULTS).replace(/[\\/]+$/, ""))) || "").replace(/[^A-Za-z0-9._-]/g, "_");
if (!OUT_RAW) console.log("TRIAGE_OUT_DERIVED out=" + OUT + "（没给 --out ⇒ 按语料名派生，避免把新轮次写进旧轮次的文件名）");

{
  const KNOWN = ["results", "dist", "src", "out", "guest-book", "guest-measured", "ops", "dead-selectors"];
  const bad = process.argv.slice(2).filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log("TRIAGE_RESULT=FAIL reason=不认识的旗标 " + bad.join(",") + " ⇒ 会被静默忽略而回落到默认输入（实测：--corpus 拼错会让分诊悄悄读 round-6 的旧语料，红的是别人家的账）"); process.exit(2); }
}
console.log("TRIAGE_INPUTS results=" + RESULTS + " dist=" + DIST + " src=" + SRC + " out=" + OUT);

const die = (m) => { console.log(m); process.exitCode = 2; throw new Error(m); };

if (!fs.existsSync(RESULTS)) die(`FAIL 权威件不存在：${RESULTS}`);
if (!fs.existsSync(DIST)) die(`FAIL 冻结构建不存在：${DIST}（没有它就无法区分"跑的构建里没有"与"源码里没有"）`);

const doc = JSON.parse(fs.readFileSync(RESULTS, "utf8"));
if (!Array.isArray(doc.results)) die(`FAIL ${RESULTS} 没有 results[] 数组（顶层键：${Object.keys(doc).join(",")}）`);
const rows = doc.results;

// ---------- 载体索引：整份读进内存，逐 token 做 indexOf ----------
const EXT_DIST = new Set([".wxml", ".js", ".json", ".wxss"]);
const EXT_SRC = new Set([".vue", ".ts", ".js", ".json", ".scss", ".css"]);
function walk(dir, exts, stopAt) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git") continue;
        stack.push(p);
      } else if (exts.has(path.extname(e.name))) {
        try { if (fs.statSync(p).size <= 4 * 1024 * 1024) out.push(p); } catch { /* 断链/权限：跳过但要计数 */ }
        if (stopAt && out.length > stopAt) return out;
      }
    }
  }
  return out;
}
function index(files) {
  const idx = [];
  for (const p of files) {
    let t;
    try { t = fs.readFileSync(p, "utf8"); } catch { continue; }
    idx.push({ p, t });
  }
  return idx;
}
const distFiles = walk(DIST, EXT_DIST);
const srcFiles = walk(SRC, EXT_SRC);
const distIdx = index(distFiles);
const srcIdx = index(srcFiles);
if (!distIdx.length) die(`FAIL 构建索引为空：${DIST}`);
if (!srcIdx.length) die(`FAIL 源码索引为空：${SRC}`);

function hits(idx, token) {
  const out = [];
  for (const f of idx) if (f.t.includes(token)) out.push(f.p);
  return out;
}
// 选择器必须按"独立类名 token"匹配：裸 indexOf 会把 .id 命中 valid/width/padding，把"构建里有没有"判成假有
function hitsSel(idx, token) {
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^A-Za-z0-9_-])${esc}(?![A-Za-z0-9_-])`);
  const out = [];
  for (const f of idx) if (re.test(f.t)) out.push(f.p);
  return out;
}
// 页面前缀：定位失败最可能落在"该页自己的文件"里，单独标出来免得被全仓命中淹没
function pageScoped(list, page) {
  if (!page) return [];
  const stem = String(page).split("/").slice(-1)[0];
  const dir = String(page).replace(/\/[^/]*$/, "");
  return list.filter((p) => p.includes(dir + path.sep) || p.includes(stem));
}

/* ---- WS 交互腿的归因轴：一条 absent 读数到底是"静息态真没有"还是"这一腿根本看不见组件内部"？
   两个判据都只用量到的东西，不读代码注释、不猜：
   ① 本语料内的正向对照 —— 同一个选择器在别的行答过 present(N)，或被成功下发过 tap=
      （r-exec-ws.mjs:386 只在 pre 说 present 时才点，所以 observed 里的 tap=<sel> 本身就是一次 present 证词）；
   ② 它活在哪个编译文件里 —— 就在被测页自己的文件里 ⇒ 页面作用域的 page.$$() 够得到
      （这一腿的探针就是 pageObj.$$(sel)，r-exec-ws.mjs:312），absent 是状态读数；
      只在 components/** 里 ⇒ 与"查询进不到组件作用域"分不开，absent 不可归因。
   两条都不成立（构建与源码都查无此类）⇒ 既不承认"静息态"也不承认"组件作用域"，落红。 */
const CONTROL_SEL = new Set();
for (const r of rows) {
  const o = String(r.observed || "");
  for (const m of o.matchAll(/(\.[A-Za-z][A-Za-z0-9_-]*)\s*:\s*present\(\d+\)/g)) CONTROL_SEL.add(m[1]);
  for (const m of o.matchAll(/(?:^|\|)\s*tap=(\.[A-Za-z][A-Za-z0-9_-]*)(?=\s|$)/g)) CONTROL_SEL.add(m[1]);
}
const SCOPE_CACHE = new Map();
/* 严格版"就在本页文件里"：只认 <页目录>/<页名>.<ext> 那一个编译/源码文件。
   不复用上面的 pageScoped() —— 它按"路径里带页名 stem"松匹配，对 .../index 这类页名
   会把全仓几十个 index.* 都算成"本页"，于是把组件作用域的类误判成页面作用域读得到
   （这条只影响我新加的分支，不动旧桶的旧输出）。 */
function pageOwnFileHits(list, page) {
  if (!page) return 0;
  const esc = String(page).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("/" + esc + "\\.[A-Za-z]+$");
  return list.filter((p) => re.test(String(p).replace(/\\/g, "/"))).length;
}
function selScope(sel, page) {
  const key = sel + "|" + page;
  if (SCOPE_CACHE.has(key)) return SCOPE_CACHE.get(key);
  const tok = sel.replace(/^[.#]/, "");
  const dh = hitsSel(distIdx, tok), sh = hitsSel(srcIdx, tok);
  const v = { dist: dh.length, src: sh.length, pageOwn: pageOwnFileHits(dh, page) + pageOwnFileHits(sh, page) };
  SCOPE_CACHE.set(key, v);
  return v;
}
function absentAttribution(sel, r) {
  if (CONTROL_SEL.has(sel)) return { kind: "outcome", why: `正向对照：本语料里 ${sel} 答过 present(N) 或被成功 tap= 下发过 ⇒ 载具看得见它，absent 只能是状态读数` };
  const sc = selScope(sel, r && r.page);
  if (sc.pageOwn > 0) return { kind: "outcome", why: `${sel} 就写在被测页自己的文件里（本页文件命中 ${sc.pageOwn}）⇒ 页面作用域的 page.$$() 够得到，absent 是静息态读数`, scope: sc };
  if (sc.dist || sc.src) return { kind: "unattributed", why: `${sel} 在产物里有（dist ${sc.dist} 个文件命中）却没有一个落在本页文件里 ⇒ 与"查询进不到组件作用域"分不开；本腿对它零次 present，不可归因`, scope: sc };
  return { kind: "unknown", why: `${sel} 在冻结构建与源码里都查不到 ⇒ 既不是"静息态没有"也不是"组件作用域够不到"，是臆造选择器，须人判`, scope: sc };
}

// ---------- 分类 ----------
// failureReason 是"每行一句"的机读字段，优先信它；observed 里可能串多条 act-FAIL（一条用例多动作），
// 用非贪婪 + 锚末端从 observed 抠目标会跨条吞（实测把 `发布") / act-FAIL:tap(__CAND__) ...` 整串当成文案），
// 所以 observed 只在 failureReason 不成形时兜底，且兜底取**最后一条** act-FAIL。
const RE_OBS_FAIL = /act-FAIL:(\w+)\((.*?)\)\s+([^|]*)$/;
const RE_REASON = /^action (\S+) (\S+) failed: (.*)$/;
const RE_NOT_FOUND = /^element not found:\s*(.*)$/;
const RE_OBS_SKIP = /^action-not-automatable:\s*(.*)$/;
/* 执行器引用判据台盖章的那句话（round-7 第三轮口径：章在 failureReason 里，不在 observed 尾注里）。
   只认这个开头 ⇒ 不做词表泛化，别的 action-not-automatable 变体照旧走原路。 */
const RE_STAMP_REASON = /^action-not-automatable:\s*判据台已盖章「本通道不可自动化」/;
/* 第三种失败口径（round-7 stage-8 的开页就绪重试）：执行器只在这一处写这句话、且只配 FAILED 状态
   （r-exec-ws.mjs:617 拼句 + r-exec-ws.mjs:618 push(..., "FAILED", "", reason, "")：route/observed 全传空串）。
   锚死「重试 N 次仍失败」这个句式，不拿"重试"两个字泛匹配：今天以前那批 145 行说的是
   `open_page 失败：simulator_open_page 调用失败：Command failed:…`（旧口径，见 .zcode/tmp/gap-openpage/rows-summary.txt），
   旧句、别的新句、以及"重试"出现在 detail 里的任何句子，都照旧落「两种失败原文形态都对不上」红。 */
const RE_OPEN_RETRY = /^open_page 失败（重试 (\d+) 次仍失败）：([\s\S]*)$/;

/* WS 交互腿（r-exec-ws.mjs --tap）的原因串。逐条锚死 runTapCase 自己写下的那一整句，
   不做词表泛化 —— 近邻句、少了后半截 ⇒ 句子的句子都必须继续落「对不上」红（对照见分诊报告）。
   出处：r-exec-ws.mjs:373 禁触 / :376 action 没点名类名 / :381 元素探针无答案 /
        :384 静息态 absent / :388 tap 未成功 / :398 点击后出帧失败，
   再加 :665「WS currentPage() 没给结果」—— 它不在那六行里，是本轮真数据里多出来的第七种形状。
   每一条还配一句"行自己得能证实这句话"的交叉核对（observed/取证），因为桶名承诺的东西
   不能只由 reason 单方面宣布：reason 说"不盲点"而 observed 没有 tap-skipped，
   就说明这一腿的口径又变了，那必须红，不能被一个学过的正则悄悄吸掉。 */
const RE_TAP_DENY = /^动作命中不可逆清单（注销\/解绑\/清空\/登出）⇒ 禁触/;
const RE_TAP_NO_CLASS = /^交互动词但 action 里没点名可点元素（没有 selector 就没法把这次点击归属到某个东西）⇒/;
const RE_TAP_PROBE_NO_ANSWER = /^目标元素探针无答案（([^）]*)）⇒ 通道没准备好，不盲点$/;
const RE_TAP_ABSENT = /^目标元素 (\.[A-Za-z][A-Za-z0-9_-]*) 当前不在页上（可能要先展开\/滚动\/登录态）⇒ 不盲点，待补前置态$/;
const RE_TAP_DISPATCH = /^tap 未成功：(.*?) ⇒ 通道\/元素问题，不算交互失败也不算通过$/;
const RE_TAP_NO_FRAME = /^点击后出帧失败（miss=([\s\S]*)）⇒ 交互型没有帧就不算证据$/;
const RE_WS_ROUTE_NO_ANSWER = /^WS currentPage\(\) 没给结果 ⇒ 不知是否已在 \S+，答案无法归属，待重跑$/;

/* ---- WS 取证腿**没带 --tap** 那一刀的交互口径（2026-09-28 词表同步，本轮唯一没进词表的形状）----
   唯一出处：r-exec-ws.mjs:832
     rows.push(mkRow(name, page, c, "SKIPPED", route, "action 含交互动词 ⇒ 未开 --tap，交互型留待下一刀", observed));
   分支顺序（重新数过，本文件今天被好几个 lane 改过，旧报告里的 :654/:665 一类行号已漂；
   句子本身没漂 ⇒ 下面这些**打印出来的**旧行号我保留原样，只在此登记漂移，避免把别人的计数行改成我的措辞抖动）：
     r-exec-ws.mjs 现状 —— row() :122 / rowMeasured :141 / runTapCase :470-502（六行 = :474 禁触、:477 没点名、
     :482 探针无答案、:485 absent、:489 tap 未成功、:499 没帧）/ 页组主循环 :810-854
     （:823 requiresReal → :826 routeOk===false → :829 TAP_RE && !TAP_MODE → :832 本口径 → :838 无判点 → :841 落点未取证）。
   走到 :832 ⇒ 该腿 TAP_MODE 关着（切片配置），三条承诺都由分支顺序给出：
   ① 交互一个都没下发（:834 的 runTapCase 才是下发口）；② 落点/探针已经量过（:810-816 的 wsRoute+probeSet，
   observed 尾部 :822 固定写 `ws-route+ws-probe`）；③ 这一行没被判成"落在别的页"（那是 :826，在它前面）。
   所以这一类是**预期未执行**（一条规则叫停了它），不是测量结果，也不是缺陷；但它也不是"已覆盖" ——
   判点本身从没被任何一次点击验证过，欠的是一条 --tap 复测腿的认领。名字只负责把这 75 行从"没人看见"
   变成"逐条点名"，结案权不在本门（同 SKIPPED-tap-target-absent-unattributed 的规矩：命名 ≠ 结案）。 */
const RE_WS_TAP_DEFERRED = /^action 含交互动词 ⇒ 未开 --tap，交互型留待下一刀$/;
/* 这一行自己带回来的探针读数（只用来给读者分诊"复跑这一批能立刻拿到什么"，不参与归类）：
   observed 的 dom 段由 r-exec-ws.mjs:821 拼：点名了就是 `<sel>:present(N)|absent|no-answer`，没点名就是 `(本条没点名类名)`。 */
function tapDeferredReading(obs) {
  const dom = (obs.match(/dom: ([^|]*)/) || [])[1] || "";
  if (/\(本条没点名类名\)/.test(obs)) return { kind: "no-target-named", tag: "本条没点名类名（复跑这一刀也归属不到物件）" };
  const present = (dom.match(/:present\(/g) || []).length;
  const absent = (dom.match(/:absent/g) || []).length;
  const noAnswer = (dom.match(/:no-answer/g) || []).length;
  if (noAnswer) return { kind: "probe-no-answer", tag: `no-answer×${noAnswer}${present ? ` present×${present}` : ""}${absent ? ` absent×${absent}` : ""}（通道未就绪）` };
  if (present && absent) return { kind: "present+absent", tag: `present×${present} absent×${absent}` };
  if (present) return { kind: "present", tag: `present×${present}（静息态就在页上，复跑能立刻点）` };
  if (absent) return { kind: "absent", tag: `absent×${absent}（静息态没带这些类）` };
  return { kind: "probe-answered-nothing", tag: "探针一条都没答" };
}
/* ---- observe-only dom 结论的"查找目标恢复"（round7 终报 §4 第 5 项的处方）----
   旧口径下"按目标查找且失败"只有 `element not found: …` 一种写法；round-7 的 mock 刀不改写
   failureReason、只在 observed 的 dom 段留结论（r-exec-ws.mjs:821 拼的 `.x:present(N)|absent`），
   于是四格（dist/src 双载体检）对这批腿完全饥饿：要么 NOT_APPLICABLE（机制不完整），
   要么在旧词表还残留时假红在"提取失灵"上。`.x:absent` 与旧口径的"找不到"是同一笔债，
   换腿不换名——把它算作"能恢复出查找目标的定位失败"。
   判据必须严（这是"没放宽"的另一半）：
   · 只认 `.`/`#` + 字母开头 + [\w-]* 的完整类名形态（与 RE_TAP_ABSENT 同一形状），
     `(本条没点名类名)`、`(action 无类名)`、`:no-answer`、`:ERR:…` 一律不产 token——从说明文字里
     抠词填四格等于伪造体检输入（本项目踩过"负例永远不变红"的同类返工）；
   · `present(N)` 是"找到了"，不是定位失败，不进四格；
   · 行自己已有可复核 token（reason 里带选择器）时不覆盖，dom 恢复只补空缺。
   domAbsent（本行声称 absent 了几次）与 token 提取分开标记：提取坏掉时四格为空而 domAbsent>0，
   fourgrid-axis 会按"提取失灵"判红——这条红在 round-7 词汇下也保有否决能力。 */
const RE_DOM_ABSENT_SEL = /([.#][A-Za-z][A-Za-z0-9_-]*):absent/g;
function domObserveConclusion(obs) {
  const dom = (String(obs).match(/dom: ([^|]*)/) || [])[1] || "";
  let absentSel = null, absentCount = 0;
  let m;
  RE_DOM_ABSENT_SEL.lastIndex = 0;
  while ((m = RE_DOM_ABSENT_SEL.exec(dom))) {
    absentCount++;
    if (!absentSel) absentSel = m[1];
  }
  return { absentSel, absentCount };
}

/* "这一行量到东西没有"必须用**声明的**判据，不能用"reason 里有没有重试"：开页重试耗尽既可能是
   窗口/通道没起来（这一行压根没测），也可能是页面真的开不起来（产品缺陷）—— 把两者分开的唯一凭据
   是这一行有没有留取证。执行器自己就是这么判批次结局的：classifyBatch 在 r-exec-ws.mjs:128 用
   rowMeasured 数"可测量行"，一个都没有才打 WSX_OUTCOME class=unmeasurable + WSX_ADMISSIBLE=no
   （r-exec-ws.mjs:133 / :141）。下面这份是 r-exec-ws.mjs:113-118 rowMeasured 的逐字镜像
   （route 非空 / 有帧 evidence / observed 里有 present( 或 absent），三个全空才是"没测到"。
   不 import 那个模块：r-exec-ws.mjs:227 顶层 require miniprogram-automator、:748 顶层跑 main()，
   请它进来等于叫醒模拟器 —— 本工具的红绿不许依赖开设备。
   fail-closed 一侧：exec-* 腿的 route 是数组，String(数组) 非空 ⇒ 判"有取证" ⇒ 落缺陷桶要人判，
   绝不会反过来把该红的行吸进免检桶。 */
const MEASURE_TOKEN_RE = /present\(|absent/;
function rowMeasured(r) {
  if (!r) return false;
  if (String(r.route || "").trim()) return true;
  if (String(r.evidence || "").trim()) return true;
  return MEASURE_TOKEN_RE.test(String(r.observed || ""));
}

const BUCKET = {
  "SKIPPED-not-automatable": "用例要求的动作本通道做不了（拖动/连点/量 rect 等），只能人工驱动 —— 覆盖缺口，不是产品失败",
  "SKIPPED-not-automatable-stamped": "判据台在 ops 上声明 automatable===false（与 verify-real-coverage 的免检轴、r-exec-ws 的拒跑名单同一个字段、同一条 ===false 严格判等），且执行器 reason 正是引用该章的那句话 ⇒ 不发交互是预期结果：逐条点名、单独计数，不算缺陷、不算覆盖，不消灭欠账的可见性",
  "SKIPPED-real-band": "判据要真实后端：本条由 real 带腿（--project mp-weixin-real + 8080 在跑）复测",
  "SKIPPED-vague-action": "action 写了交互动词却没点名可交互元素 —— 判据含糊，缺的是判据不是产品缺陷",
  "SKIPPED-vague-criterion": "判据既无类名也不要求出帧 —— 没有可观测物件，不能记 EXECUTED",
  "SKIPPED-observe-only-slice": "交互型判点落进一个按配置就不下发交互的切片（r-exec-cli 的「本切片只跑 observe-only」/ r-exec-ws.mjs:832 的「未开 --tap，交互型留待下一刀」）—— 切片配置所致、非产品失败、也非覆盖结论：判点从没被点击验证过，欠的是一条 --tap 复测腿逐行认领（同一条债换腿不换名，故复用本桶不另立）",
  "SKIPPED-deny-irreversible": "注销/解绑/清空类不可逆动作显式 DENY，为的是保住后面几百条共用的会话",
  "SKIPPED-interact-reststate-absent": "交互腿下发失败，且同帧探针说类名本就不在静息态 ⇒ 欠前置配方（先展开/先切态）",
  "SKIPPED-interact-channel": "交互腿下发失败，但探针说物件在、元素级动作仍点不动 ⇒ 通道或选择器问题，须人工判",
  /* WS 交互腿（--tap）自己这一支：与上面 SKIPPED-interact-reststate-absent 同一族债，但取证来源不同 ——
     那条是"点了、没点动、事后探针说类名不在静息态"，这一条是"下发前探针就答 absent，执行器按规矩不盲点"
     （r-exec-ws.mjs:383-385），observed 里的 tap-skipped 是这一条自己的声明。分桶不分口径 = 把两笔债记成一笔。 */
  "SKIPPED-tap-target-absent-reststate": "交互按判据下发前，静息态探针答 absent，且这一腿对该选择器有正向对照/它就在本页编译文件里 ⇒ 量到的结果就是「静息态没有这个部件」：不算缺陷、不算通道问题、不算覆盖，欠的是判据的前置配方（先展开/先滚动/先登录），须落台账去向",
  "SKIPPED-tap-target-absent-unattributed": "同样是下发前答 absent，但那个类名只在组件自己的编译文件里、本腿对它从来没有一次 present ⇒ 无法在「静息态确实没有」与「page.$$() 进不到组件作用域」之间归因：命名不等于结案，欠的是一次正向对照（先证明载具看得见组件内部，再谈前置配方）",
  /* 「下发前答 absent」的第三支（absentAttribution 的 kind=unknown，两载皆无）。旧口径只有两支，
     第三支一律回 {reject} ⇒ 落 unclassified 红，红句写「臆造选择器，须人判」。
     盘上活样本 = reports/audit/round-7/interact/exec-results.json 的 CH12 @ subpackages/campus/campus/hub：
       observed `top=subpackages/campus/campus/hub | pre: .campus-hub__cert-btn:absent | tap-skipped`
       reason  「目标元素 .campus-hub__cert-btn 当前不在页上（可能要先展开/滚动/登录态）⇒ 不盲点，待补前置态」
     .campus-hub__cert-btn 在 dist 与 src 都查不到是真的，但"没人认领"不是真的：
       ① scripts/qa/cellplan-round7-deadselectors.json 的 A-rename-to-real-name 逐条点了它的名
          （manifest+id+dead → proposed=.campus-guide__btn，并写明 prestate「节点在 v-if=!isVerified 里
          ⇒ 必须在未认证身份下才渲染，复测腿要带未认证夹具」）；
       ② 判据台 reports/audit/round-7/ops/SUBPACKAGES-CAMPUS-CAMPUS-HUB.json 的 CH12 已把改名落地
          （cellplanRename={from:.campus-hub__cert-btn,to:.campus-guide__btn} + tapTarget=.campus-guide__btn，
          由 scripts/qa/apply-ops-cellplans.mjs 落的，判决文件本身是被 apply-ops-cellplans 消费的）；
       ③ 新目标在两载查得到（dist 命中 hub.wxml、src 命中 hub.vue:216）⇒ 复跑有载具。
     ⇒ 真正的结论是第四种：**这一行从没按当前判据的目标被测过**（语料早于改名），既不是产品缺陷也不是规格臆造。
     四把尺（表点名 / 判据台落地 / 新目标有载具 / 本行名与表一致）全过才命名；任一不过照旧落红，见 deadSelectorDisposition。 */
  "SKIPPED-tap-target-dead-selector-renamed": "下发前答 absent，且该类名在冻结构建与源码里都查不到 —— 但这一条 manifest+id 在死选择器判决表（cellplan-round7-deadselectors.json 的 A-rename-to-real-name）里有逐条处置、判据台已把该条的 tapTarget 从这个名字改到判决表给的真实名字（cellplanRename.from/to 与 tapTarget 两把尺都对上）、且新目标在 dist 或 src 里查得到 ⇒ 本轮读的是改名前的旧目标：读数对当前判据作废，不算产品缺陷、不算覆盖、也不算「臆造选择器」；命名不等于结案，欠的是按新目标（带判决表的 prestate 前置）复跑一次，逐条点名",
  "SKIPPED-tap-probe-no-answer": "交互下发前的元素探针没给答案（r-exec-ws.mjs:381）⇒ 通道未就绪，这一行的静息态根本没量到，欠的是重跑这一批，不是产品判红",
  "SKIPPED-conservation-filler": "真实刀切片为守住 1107 行总数而记的占位行（本切片只跑 requiresReal，其余在别的档位/身份腿已判过）⇒ 既不是缺口也不是覆盖",
  "SKIPPED-identity-scope": "这条判据的身份适用范围被 ops 标成了别的腿（tag-ops-identity-scope.mjs 依 guest-landing-policy 的落点裁定）⇒ 本腿不认领，缺口记在标它的那次裁定上，不算产品失败也不算覆盖",
  "SKIPPED-left-page": "交互后已离开目标页（LEFT_PAGE），状态量不到 —— 不是产品判红",
  /* round-7 第二轮：执行器把"observe-only"这句谎话换成了当时量到的原因 ⇒ 词表跟着分档。
     旧口径里"游客被弹走"和"这一腿没带 --tap"共用一句话，分不开也就修不掉。 */
  "SKIPPED-interact-off-page": "交互动词 + 本页没落在声明页（栈顶是别的页）⇒ 交互根本没发出，点了是替别人的页做事；含游客闸门弹回",
  "SKIPPED-interact-not-issued": "交互动词 + 落点没问题但这一条没发出交互 ⇒ 读 observed 的 tap 段定位，欠的是配方",
  "FAILED-guest-gate-by-ruling": "游客落到 guest-landing-policy 裁定的那一页 ⇒ 闸门行为符合裁定，FAILED 是因为该条判据前置为登录态（身份适用范围问题，不是产品缺陷）",
  /* 开页重试耗尽的两个分叉（判据 = 上面 rowMeasured 的镜像，与执行器批次级 WSX_ADMISSIBLE 同一把尺）。
     两个桶都不并进 other-fail/unclassified：给口径起名字是分诊台的本职，但"起完名字就绿"必须是
     零取证那一支（它欠的是一次重跑，不是一个人的判决）；带取证那一支自己否决门禁（见 OPEN_PAGE_MEASURED_DEFECT）。 */
  "FAILED-open-page-unmeasured": "open_page 重试 N 次仍失败，且这一行零取证（route/evidence/observed 三个皆空，判据 r-exec-ws.mjs:113 rowMeasured）⇒ 与批次级 WSX_ADMISSIBLE=no 同一把尺的逐行版：通道/窗口状态，不是产品判决。不算缺陷、不算覆盖、欠的是把这一批重跑；逐条点名，绝不当已通过",
  "FAILED-open-page-measured-defect": "open_page 重试 N 次仍失败，可这一行量到了落点/探针/帧 ⇒ 桥说页面没开起来、行里却留着页面的答案 ⇒ 不自证清白的空间：按候选产品级页面缺陷逐条人判，>0 就否决门禁",
  "SKIPPED-route-probe-no-answer": "落点探针本身没给答案（routeStack 取空/超时）⇒ 连「在不在这一页」都无从归属，欠的是重跑这一批，不是产品判红",
  "SKIPPED-frame-evidence-hole": "要求出帧但帧没成立（帧太小被拒且探针无有效答案）⇒ **证据缺口**，命名了也不许结案",
  "FAILED-landing-guard": "导航落在了别的页（页内守卫或路由重定向），元素存在性无从判 —— 每一组落地对须有 booked 复测腿或裁决",
  "locate-label": "按文案找不到元素（__CAND__ 是执行器「按标签解析」的哨兵，不是漏替换）",
  "locate-label-token-lost": "按文案找不到，且消息里没留下要找的文案 —— 无法复核，属执行器取证缺陷",
  "locate-selector": "按选择器找不到元素",
  "harness-api": "执行器自身报错（方法不存在 / 类型错误），与被测物无关",
  "timeout": "动作超时",
  "auth-precondition": "前置登录/登出/token 铸造失败",
  "other-fail": "未归类，需人工读原文",
};

/* round-7 执行器换了失败口径：failureReason 不再是 `action tap .x failed: element not found` 而是
   中文判据语句（`requiresReal ⇒ …`、`落在别的页（…），须人判`）。这里把**当时实测到的全部口径**逐条
   命名成桶 —— 词表漂移必须让门禁变红（下面有 unclassified===0 断言），不能被兜底桶悄悄吞掉。 */
const RE7_SELECTOR = /::\s*(\w+)\s*[：:]?\s*([.#]?[\w-]+)\s*::/;
function matchRe7(reason, obs, r) {
  const row0 = r || {};
  if (/^真实刀只跑 requiresReal 用例/.test(reason)) return { bucket: "SKIPPED-conservation-filler" };
  if (/^本条判据的身份适用范围已标为/.test(reason)) return { bucket: "SKIPPED-identity-scope" };
  if (/^requiresReal\b/.test(reason)) return { bucket: "SKIPPED-real-band" };
  if (/^action 含交互动词但没点名可交互元素/.test(reason)) return { bucket: "SKIPPED-vague-action" };
  if (/^action 含交互动词但本页没落在声明页/.test(reason)) return { bucket: "SKIPPED-interact-off-page" };
  if (/^action 含交互动词但落点探针没给结果/.test(reason)) return { bucket: "SKIPPED-route-probe-no-answer" };
  if (/^action 含交互动词但这一条没发出交互/.test(reason)) return { bucket: "SKIPPED-interact-not-issued" };
  if (/^落在 .* ⇒ 与游客落点裁定一致/.test(reason)) return { bucket: "FAILED-guest-gate-by-ruling" };
  if (/^判据未点名可观测物件/.test(reason)) return { bucket: "SKIPPED-vague-criterion" };
  if (/^action 含交互动词\s*⇒\s*本切片(没带 --tap，)?只跑 observe-only/.test(reason)) return { bucket: "SKIPPED-observe-only-slice" };
  if (/^交互禁触/.test(reason)) return { bucket: "SKIPPED-deny-irreversible" };
  if (/^交互腿下发全部失败/.test(reason)) {
    const m = reason.match(RE7_SELECTOR);
    const common = m ? { op: m[1], token: m[2].replace(/^[.#]/, ""), tokenKind: "selector", recoverable: true, sel: m[2] } : {};
    if (!m) common.note = `下发失败但没留下 :: 选择器 :: 三段，无法复核：${reason.slice(0, 120)}`;
    return /探针说物件在/.test(reason)
      ? { bucket: "SKIPPED-interact-channel", ...common, unclassified: !m }
      : { bucket: "SKIPPED-interact-reststate-absent", ...common, unclassified: !m };
  }
  if (/^交互后离开目标页/.test(reason)) return { bucket: "SKIPPED-left-page" };
  /* 路由探针自己没答（取空/超时）⇒ 这一行连"落点是不是目标页"都不知道，
     不能折成 FAILED-landing-guard（那是拿"没量到"冒充"量到了别的页"）。 */
  if (/^落点探针没给结果/.test(reason)) return { bucket: "SKIPPED-route-probe-no-answer" };
  /* 执行器要求出帧、帧却因太小被拒、探针又没给出有效答案 ⇒ 这一条既没量到、也没有可看的帧。
     给它一个名字**不等于**结案：命名只是让它从"没人看见"变成"人人看见"，
     所以它同时进 evidenceHoles[]，由文末断言单独否决（见 EVIDENCE_HOLE）。 */
  if (/^出帧失败且探针无有效答案/.test(reason)) {
    const miss = (reason.match(/miss=([^\s（）()]+)/) || [])[1] || null;
    const bytes = (reason.match(/[（(]\s*仅\s*(\d+)\s*B/) || [])[1] || null;
    return { bucket: "SKIPPED-frame-evidence-hole", evidenceHole: true, miss, bytes };
  }
  /* ---- 下面七条 = WS 交互腿（--tap）自己的口径，出处见文件头 RE_TAP_* 的注释 ----
     每条都是"能复用旧桶就复用、复用不了才起新名"：同一笔债换腿不改名，
     否则同一件事会在账本里出现两个数（:376/:373/:665/:388/:398 全是这种情况）。 */
  if (RE_TAP_DENY.test(reason)) {
    if (!/\bdeny-tap\b/.test(obs)) return { reject: `reason 说命中不可逆清单，observed 里却没有 deny-tap 段 ⇒ 句子与本行取证不同源，不许按禁触结案` };
    return { bucket: "SKIPPED-deny-irreversible", tapShape: "deny" };
  }
  if (RE_TAP_NO_CLASS.test(reason)) {
    /* 这句话描述的是"探针根本没跑"（r-exec-ws.mjs:375-376 在 :379 之前就 return）⇒
       这一条没有任何关于目标的读数，缺的是判据，与 :384「量到了 absent」不是一回事。 */
    if (!/\(action 无类名\)/.test(obs)) return { reject: `reason 说 action 没点名可点元素，observed 里却没有 (action 无类名) ⇒ 句子与本行取证不同源` };
    return { bucket: "SKIPPED-vague-action", tapShape: "no-class" };
  }
  if (RE_TAP_PROBE_NO_ANSWER.test(reason)) {
    const m = reason.match(RE_TAP_PROBE_NO_ANSWER);
    const sel = (obs.match(/(?:^|\|)\s*pre:\s(\.[^\s:]+):/) || [])[1] || null;
    return { bucket: "SKIPPED-tap-probe-no-answer", tapShape: "probe-no-answer", want: m[1], op: "probe", sel, token: sel ? sel.replace(/^[.#]/, "") : null, tokenKind: "selector", recoverable: !!sel, note: `探针答「${m[1]}」⇒ 通道未就绪，静息态没量到` };
  }
  const tapAbsent = reason.match(RE_TAP_ABSENT);
  if (tapAbsent) {
    if (!/\btap-skipped\b/.test(obs)) return { reject: `reason 说「不盲点」，observed 里却没有 tap-skipped ⇒ 交互可能已经下发，这句话不再描述本行，须重看口径` };
    const sel = tapAbsent[1];
    const at = absentAttribution(sel, r);
    const common = {
      tapShape: at.kind === "outcome" ? "absent-outcome" : "absent-unattributed",
      op: "tap", sel, token: sel.replace(/^[.#]/, ""), tokenKind: "selector", recoverable: true,
      attribution: at.why, scope: at.scope || null, control: CONTROL_SEL.has(sel),
    };
    /* 三支各自把桶名写成字面量（含下面 kind=unknown 那一支）：文末的词表自核（produced()）认的就是 bucket: "X" 这个字面，
       用三元式拼桶名会让规则"看着在、其实没产出"，反而把空转桶的红送给别人。 */
    if (at.kind === "outcome") return { bucket: "SKIPPED-tap-target-absent-reststate", ...common };
    if (at.kind === "unattributed") return { bucket: "SKIPPED-tap-target-absent-unattributed", ...common };
    /* 第三支（kind=unknown，两载皆无）：先查有没有"机器可读的认领"，查不到才落红。
       分支顺序不许前移：这两支（outcome/unattributed）在它前面，静息态/组件作用域的行不会被新桶抢走。 */
    if (at.kind === "unknown") {
      const ds = deadSelectorDisposition(sel, r);
      if (ds && ds.ok) {
        return {
          bucket: "SKIPPED-tap-target-dead-selector-renamed",
          tapShape: "dead-selector-renamed",
          op: "tap", sel, token: sel.replace(/^[.#]/, ""), tokenKind: "selector", recoverable: true,
          scope: at.scope, control: false, deadSelector: true,
          deadSel: {
            manifest: ds.d.manifest, id: ds.d.id, group: ds.d.group, dead: ds.d.dead, proposed: ds.d.proposed,
            prestate: ds.d.prestate, tableFile: ds.d.file, tableLine: ds.d.line,
            opsFrom: ds.o.from, opsTo: ds.o.to, opsTapTarget: ds.o.tapTarget, opsSource: ds.o.source,
            proposedDist: ds.hits.dist, proposedSrc: ds.hits.src, proposedPageOwn: ds.hits.pageOwn,
          },
          attribution: `两载皆无（dist ${at.scope.dist} / src ${at.scope.src}）已由死选择器判决表认领：${ds.d.group} 记 ${ds.d.dead} → ${ds.d.proposed}（${ds.d.file || "?"}:${ds.d.line ?? "?"}），判据台该条（改名出处=${ds.o.source || "未记 source"}）已把 cellplanRename.from=${ds.o.from} 改成 to=${ds.o.to}、tapTarget=${ds.o.tapTarget}；新目标载具命中 dist ${ds.hits.dist}/src ${ds.hits.src} ⇒ 本行测的是改名前的旧目标，读数作废、欠按新目标复跑（前置：${ds.d.prestate || "判决表未写"}）`,
          note: `改名已落地、本轮读的是旧名 ⇒ 命名不等于结案，欠按 ${ds.d.proposed} 复跑${ds.d.prestate ? "（带判决表写的前置）" : ""}`,
        };
      }
      if (ds && ds.reject) return { reject: `下发前答 absent，且 ${ds.reject} ⇒ 仍按「臆造选择器，须人判」落红（${at.why}）` };
    }
    return { reject: `下发前答 absent，但 ${at.why} ⇒ 「静息态读数」与「组件作用域未归因」两支都不认这条，落红` };
  }
  if (RE_TAP_DISPATCH.test(reason)) {
    /* 能走到 r-exec-ws.mjs:386 说明下发前探针答的是 present(N) ⇒ "物件在、动作点不动"，
       与 SKIPPED-interact-channel 同一笔债（通道或选择器），换腿不换名。 */
    const m = reason.match(RE_TAP_DISPATCH);
    const sel = (obs.match(/(?:^|\|)\s*pre:\s(\.[^\s:]+):present/) || [])[1] || null;
    return { bucket: "SKIPPED-interact-channel", tapShape: "dispatch-fail", op: "tap", sel, token: sel ? sel.replace(/^[.#]/, "") : null, tokenKind: "selector", recoverable: !!sel, want: m[1], unclassified: !sel, ucNote: `tap 未成功这句话与 observed 里都没有留下被点的选择器（r-exec-ws.mjs:388 只回写了失败原文）⇒ 无从复核两载里有没有这个类，执行器取证缺陷，不许当已归类` };
  }
  if (RE_TAP_NO_FRAME.test(reason)) {
    /* 交互已经点下去了却没有帧 —— 这是证据缺口，不是"预期结果"。复用旧桶连同它的 evidenceHole
       否决（:217 那一支），命名不等于结案；否则新增一条 tap 口径就把原来的否决门拆了。 */
    const m = reason.match(RE_TAP_NO_FRAME);
    const first = String((r && r.missingEvidence && r.missingEvidence[0]) || (m[1] || "").split(";")[0] || "").trim();
    const bytes = (first.match(/[（(]\s*仅\s*(\d+)\s*B/) || [])[1] || null;
    return { bucket: "SKIPPED-frame-evidence-hole", tapShape: "no-frame", evidenceHole: true, miss: first || null, bytes };
  }
  if (RE_WS_ROUTE_NO_ANSWER.test(reason)) {
    /* 「落点探针没给答案」这一句只在行自己零取证时成立（r-exec-ws.mjs:663 的 !routeKnown）。
       若行里带着 route/evidence/present，就是自相矛盾：不许按"没测到"免检，落红人判
       （同 OPEN_PAGE_MEASURED_DEFECT 的规矩）。 */
    if (rowMeasured(r)) return { reject: `reason 说 WS currentPage() 没给结果，可这一行带着取证（route/evidence/present 之一非空）⇒ 自相矛盾，不能按"从未被测"结案` };
    return { bucket: "SKIPPED-route-probe-no-answer", tapShape: "ws-route-no-answer", note: "落点探针（WS currentPage）没给答案 ⇒ 这一行从未被测，欠重跑" };
  }
  if (RE_WS_TAP_DEFERRED.test(reason)) {
    /* 五把交叉核对都只用量得到的东西，不信 reason 单方面宣布（学 RE_TAP_DENY / RE_TAP_NO_CLASS /
       RE_TAP_ABSENT / RE_WS_ROUTE_NO_ANSWER 那几支的规矩）：句子和这一行自己的取证必须同源，
       否则"学过的口径"就变成免检通道。 */
    if (row0.status !== "SKIPPED") return { reject: `未开 --tap 这句话只配 SKIPPED 状态（r-exec-ws.mjs:832 就写死 SKIPPED），本行是 ${row0.status} ⇒ 句子与本行不同源` };
    if (!/\|\s*ws-route\+ws-probe/.test(obs)) return { reject: `reason 说未开 --tap，observed 里却没有 r-exec-ws.mjs:822 那句 ws-route+ws-probe ⇒ 这一行不是 WS 取证腿页组循环写的，句子不再描述它` };
    if (/\btap=|post-tap/.test(obs)) return { reject: `reason 说"交互型留待下一刀"，observed 里却有 tap=/post-tap ⇒ 交互其实下发了，须重看口径` };
    if (/≠/.test(obs)) return { reject: `reason 说未开 --tap，observed 里却写着 top=… ≠ 声明页 ⇒ 这一行同时欠"落在别的页"那笔债（:826 在 :829 之前，不该走到 :832），落红人判` };
    if (!rowMeasured(row0)) return { reject: `reason 说未开 --tap，可这一行零取证（route/evidence/observed 的 present|absent 三皆空，判据 = r-exec-ws.mjs:141 rowMeasured 的镜像）⇒ 连落点都没量到，欠的是"探针没给答案/重跑"那一族，不由本桶吸收` };
    const rd = tapDeferredReading(obs);
    return { bucket: "SKIPPED-observe-only-slice", tapDeferred: true, reading: rd.tag, readingKind: rd.kind, op: "tap", note: `未开 --tap(:832)｜读数：${rd.tag}` };
  }
  if (/^落在别的页/.test(reason)) {
    const landed = (obs.match(/top=(\S+)/) || [])[1] || null;
    return { bucket: "FAILED-landing-guard", landed };
  }
  return null;
}

/* 每一组「声明页 → 实际落地页」都必须在这里有一条 booked 复测腿或裁决；
   新增落地对而这里没有 → 门禁红（见文末断言），不许悄悄当成"已归类"放过。 */
/* 词表自核：BUCKET 里挂了名字但没有任何一条归类规则能产出它 ⇒ 那条规则串和执行器说的不是一句话
   （本轮就为此踩过：执行器改了原因串，triage 把它整批算成 unclassified，看着像"没红"其实没归类）。
   这是只读自己源码的静态核对，不碰盘、不取租约。 */
{
  const src = fs.readFileSync(import.meta.filename, "utf8");
  const produced = (b) => {
    const q = b.replace(/[-]/g, "\\-");
    /* 这个文件里"产出一个桶"有两种写法：归类函数返回 { bucket: "X" }，
       和主循环里的 push(r, "X", {...})。只认前一种会把后一种的 8 个桶全判成空转（实测就是这样假红）。 */
    return new RegExp('bucket:\\s*"' + q + '"').test(src) || new RegExp('push\\([^,]*,\\s*"' + q + '"').test(src);
  };
  const orphans = Object.keys(BUCKET).filter((b) => !produced(b));
  console.log(`TRIAGE_VOCAB buckets=${Object.keys(BUCKET).length} 无规则可达=${orphans.length}`);
  for (const o of orphans) console.log("  VOCAB_ORPHAN " + o + " ⇒ 挂了桶却没有能产出它的归类规则（执行器的原因串和这条正则不同源）");
  if (orphans.length) { console.log("TRIAGE_RESULT=FAIL reason=词表里有空转桶 ⇒ 先对齐执行器口径再判"); process.exit(2); }
}

/* 判据台盖章登记册：读 ops 语料里**声明的** c.automatable === false ——
   与 verify-real-coverage.mjs 的 REALCOV_AUTOMATABLE_EXEMPT 免检轴、r-exec-ws.mjs:341 的
   WSX_IDS_NOT_AUTOMATABLE 拒跑名单是同一个字段、同一条严格判等（"false" 字符串/0/null 都不算），
   键的派生也照抄 verify-real-coverage 的 manifest=j.suite||文件名去.json、id=c.id||c.caseId。
   这样三家用的是同一把尺：判据台盖章 ⇒ 执行腿拒跑 ⇒ 覆盖门免检 ⇒ 分诊台认预期，
   而不是让分诊台只信执行器自报的那句 prose（prose 可以写错、可以造假章）。 */
const OPS = arg("ops", "reports/audit/round-6/ops");
const STAMP_KEYS = new Map(); // "manifest|id" → notAutomatableFrom（出处只用于打印，不参与判定）
if (!fs.existsSync(OPS)) {
  console.log(`TRIAGE_STAMP warn=判据台目录不存在（${OPS}）⇒ 声明字段无从核对，盖章口径的行照旧落「口径不在词表内」判红（fail-closed：没读到账就不豁免）`);
} else {
  for (const f of fs.readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(OPS, f), "utf8")); } catch { continue; }
    const manifest = j.suite || f.replace(/\.json$/, "");
    for (const c of (j.cases || j.items || [])) {
      const id = String((c && (c.id || c.caseId)) || "");
      if (c && id && c.automatable === false) STAMP_KEYS.set(manifest + "|" + id, typeof c.notAutomatableFrom === "string" ? c.notAutomatableFrom : "");
    }
  }
  console.log(`TRIAGE_STAMP_SOURCE ops=${OPS} 判据台盖章 automatable===false=${STAMP_KEYS.size} 条（与 verify-real-coverage / r-exec-ws 同一个字段同一条 ===false 判等）`);
}

/* ---- 「两载皆无」那一支需要什么才敢命名：死选择器判决表 + 判据台改名落地 ----
   见 BUCKET["SKIPPED-tap-target-dead-selector-renamed"] 的注释（CH12 活样本、三条来源逐字）。
   【不放宽】四把尺全过才进桶，任一不过照旧落「臆造选择器，须人判」红；
   表/判据台读不到 ⇒ 一条都不认（fail-closed，同上面 TRIAGE_STAMP warn 的规矩：没读到账就不豁免）。
   【无泛化】判决表条目必须 manifest+id 精确等于本行、dead 精确等于本行测的那个类名；
   没有 proposed 的条目（整删/改文案那一族，如 B-criterion-targets-a-removed-feature）一律忽略并计数 ——
   它们给不出可复跑的目标，认了就是把"没有载具"当"已结案"。 */
const DEAD_SEL_TABLE = arg("dead-selectors", "scripts/qa/cellplan-round7-deadselectors.json");
const RE_SELECTOR_SHAPE = /^\.[A-Za-z][A-Za-z0-9_-]*$/;
const OPS_EXPLICIT = argv.indexOf("--ops") >= 0;
/* 改名判决要核对的是"这一轮"的判据台。报告器 spawn 本脚本时不传 --ops（emit-round-report.mjs:592），
   于是上面的 OPS 回落到 round-6 默认值；拿 round-6 的 ops 核对 round-7 语料的改名会永远对不上 ⇒
   显式 --ops 优先，没给就按语料自己所在轮次派生，并把来源打印出来（不静默换目录）。 */
const RENAME_OPS = OPS_EXPLICIT ? OPS : path.join(path.dirname(path.dirname(String(RESULTS).replace(/[\\/]+$/, ""))), "ops");
/* 【断言：派生出来的判据台目录必须真是"这批语料那一轮的"，不许悄悄走通】
   上面那行是**位置猜测**（dirname(dirname(--results))/ops）⇒ 同一批语料换个目录就会换分类结果。
   两种坏形状里已有一种被接住：目录根本不存在时 :568 出 warn 并 fail-closed（改名无从核对 ⇒ 逐行照旧判红）。
   会**静默**走通的是另一种：目录在盘上，但它不是这批语料的判据台（层级错后撞见别处同名 `ops/`、
   或撞见一份与本语料毫无交集的空目录）。这时 readdirSync 出 0 条与语料同 suite 的文件 ⇒ OPS_RENAME 是空表，
   该被认领的"两载皆无"行落不回具名桶，而 stdout 一句抱怨都不出 —— 读者只看见桶名换了，看不见判据台换了。
   所以这里把"派生出的目录里必须能找到该轮 ops 的必要文件"写成硬条件：
     必要文件 = 该目录里至少有一份非 .bak 的 ops JSON，且其中至少一份的 suite 名
     （与下面 :572 同一把尺：j.suite || 文件名去 .json）确实被这批语料的某一行 manifest/suite 点名。
   只约束派生那一支（OPS_EXPLICIT=false）：显式 --ops 是人给的决定，不归这里替人改口径
   （它自己的缺失仍由 :485 那条 warn fail-closed）。目录不存在也不在这里改退出码，保持 :568 既有行为，
   免得把"故意不给判据台的离线夹具"（scripts/qa/test-fourgrid-domextract.mjs:53 就不传 --ops）打成新的红。 */
if (!OPS_EXPLICIT && fs.existsSync(RENAME_OPS)) {
  let derivedOpsFiles = null;
  try { derivedOpsFiles = fs.readdirSync(RENAME_OPS).filter((f) => f.endsWith(".json") && !f.includes(".bak")); }
  catch { derivedOpsFiles = null; }
  if (derivedOpsFiles !== null) {
    const corpusManifests = new Set(rows.map((r) => String((r && (r.manifest || r.suite)) || "")).filter(Boolean));
    const derivedSuites = new Set();
    for (const f of derivedOpsFiles) {
      let j = null; try { j = JSON.parse(fs.readFileSync(path.join(RENAME_OPS, f), "utf8")); } catch { continue; }
      derivedSuites.add(String((j && j.suite) || f.replace(/\.json$/, "")));
    }
    const matched = [...corpusManifests].filter((m) => derivedSuites.has(m));
    console.log(`TRIAGE_RENAME_OPS derived=${RENAME_OPS} 规则=dirname(dirname(--results))/ops 语料点名=${corpusManifests.size} 目录内ops=${derivedSuites.size} 对上=${matched.length}`);
    if (!derivedSuites.size || !matched.length) {
      console.log(`TRIAGE_RESULT=FAIL reason=派生出的判据台目录不是这批语料那一轮的：${RENAME_OPS} 里能读到 ${derivedSuites.size} 份 ops，与本语料点名的 ${corpusManifests.size} 个 manifest 一个都对不上（语料=${RESULTS}）⇒ 分类结果会随语料摆放的层级而变。修法是给人显式传 --ops <该轮>/ops（本脚本 :41 的 KNOWN 里已有这一旗标），不是把这条断言放宽`);
      process.exit(2);
    }
  }
}
const DEAD_SEL = new Map();   // "manifest|id" → { group, manifest, id, dead, proposed, prestate, file, line }
let deadSelIgnored = 0;       // 表里被忽略的条目数（没有 proposed 的那一族）—— 忽略了什么必须可查
{
  let t = null;
  try { t = JSON.parse(fs.readFileSync(DEAD_SEL_TABLE, "utf8")); }
  catch (e) { console.log(`TRIAGE_DEADSEL warn=判决表读不到（${DEAD_SEL_TABLE}：${String(e.message).slice(0, 60)}）⇒ 「两载皆无」一条都不认，全部照旧落「臆造选择器，须人判」红（fail-closed）`); }
  if (t) {
    for (const [g, arr] of Object.entries(t)) {
      if (g.startsWith("$") || !Array.isArray(arr)) continue;
      for (const e of arr) {
        const ids = [e && e.id, ...(Array.isArray(e && e.ids) ? e.ids : [])].filter(Boolean).map(String);
        if (!e || !e.manifest || !ids.length) { deadSelIgnored++; continue; }
        if (!(RE_SELECTOR_SHAPE.test(String(e.dead)) && RE_SELECTOR_SHAPE.test(String(e.proposed)))) { deadSelIgnored++; continue; }
        for (const id of ids) DEAD_SEL.set(`${e.manifest}|${id}`, {
          group: g, manifest: String(e.manifest), id, dead: String(e.dead), proposed: String(e.proposed),
          prestate: typeof e.prestate === "string" ? e.prestate : null,
          file: e.file || null, line: e.line ?? null,
        });
      }
    }
  }
}
const OPS_RENAME = new Map(); // "manifest|id" → { from, to, tapTarget, source }
let opsRenameLanded = 0;      // 判据台里 cellplanRename.from 真的写了名字的那几条（其余只是被索引到）
if (!fs.existsSync(RENAME_OPS)) {
  console.log(`TRIAGE_DEADSEL warn=判据台目录不存在（${RENAME_OPS}）⇒ 改名是否落地无从核对，「两载皆无」照旧判红（fail-closed）`);
} else {
  for (const f of fs.readdirSync(RENAME_OPS).filter((x) => x.endsWith(".json"))) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(RENAME_OPS, f), "utf8")); } catch { continue; }
    const manifest = j.suite || f.replace(/\.json$/, "");
    for (const c of (j.cases || j.items || [])) {
      const id = String((c && (c.id || c.caseId)) || "");
      if (!c || !id) continue;
      const cr = c.cellplanRename && typeof c.cellplanRename === "object" ? c.cellplanRename : null;
      if (c.cellplanRename && typeof c.cellplanRename === "object" && typeof c.cellplanRename.from === "string" && c.cellplanRename.from) opsRenameLanded++;
      OPS_RENAME.set(`${manifest}|${id}`, {
        from: cr && typeof cr.from === "string" ? cr.from : null,
        to: cr && typeof cr.to === "string" ? cr.to : null,
        tapTarget: typeof c.tapTarget === "string" ? c.tapTarget : null,
        source: (cr && cr.source) || c.tapTargetFrom || null,
      });
    }
  }
}
/* 四把尺：① 表里点名这一条 manifest+id ② 表里的 dead 精确等于本行测的类名（不是"表里有同名条目就行"）
   ③ 判据台该条的 cellplanRename 真的从这个名字改走了，且 to/tapTarget 就是表里的 proposed（两份账同源）
   ④ proposed 在两载里查得到（复跑有载具）。
   返回 null = 表里根本没有这一条 ⇒ 交回原红句「臆造选择器，须人判」，那是真缺口，不许硬造分类。 */
function deadSelectorDisposition(sel, row) {
  const manifest = String((row && (row.manifest || row.suite)) || "");
  const id = String((row && row.id) || "");
  const key = `${manifest}|${id}`;
  const d = DEAD_SEL.get(key);
  if (!d) return null;
  if (d.dead !== sel) return { reject: `判决表给 ${key} 记的死选择器是 ${d.dead}，与本行实际测的 ${sel} 不是同一个名 ⇒ 不能借这张表豁免（按表认领就等于按散文认领）` };
  const o = OPS_RENAME.get(key);
  if (!o) return { reject: `判决表认了名，判据台（${RENAME_OPS}）里却读不到 ${key} 的条目 ⇒ 改名是否落地无从核对，不认` };
  if (o.from !== sel) return { reject: `判决表说 ${key} 的 ${sel} 是死名，判据台该条却没有 cellplanRename.from=${sel}（现值 ${JSON.stringify(o.from)}）⇒ 改名没落进判据，不认` };
  if (o.to !== d.proposed && o.tapTarget !== d.proposed) return { reject: `判据台的改名去向 cellplanRename.to=${JSON.stringify(o.to)} / tapTarget=${JSON.stringify(o.tapTarget)}，与判决表的 proposed=${d.proposed} 都对不上 ⇒ 两份账不同源，不认` };
  const ph = selScope(d.proposed, row && row.page);
  if (!ph.dist && !ph.src) return { reject: `proposed=${d.proposed} 在冻结构建与源码里同样查不到 ⇒ 改名改到了第二个幽灵名，没有任何载具能判这一行，须人判` };
  return { ok: true, d, o, hits: ph };
}

const LANDING_DISPOSITION = {
  "pages/login/index → pages/discover/index": "身份带不匹配：mock 带自动登录，已登录态进登录页被守卫送到广场。由 guest 真实带腿复测（exec-guest-real）。",
  "subpackages/vip/index → pages/profile/index": "权益重定向：未持有会员时 VIP 页被送回我的页。由 showcase 带腿复测。",
  "subpackages/vip/bills → pages/profile/index": "权益重定向：同 VIP 入口。由 showcase 带腿复测。",
  "subpackages/vip/promo-code → pages/profile/index": "权益重定向：兑换码页挂在 VIP 守卫后。由 showcase 带腿复测。",
  /* 游客档专属的两组落地对。写清楚它是"按既定裁定的正确行为"，同时写清楚**判据本身要改** ——
     这一条不能因为归了类就算结案，所以带 未结案 前缀，由文末单独计数并公开。 */
  "subpackages/campus/campus/hub → pages/login/index": "未结案：游客进校园 hub 被守卫送到登录页 —— 与既定裁定（游客不得浏览、未登录须引导到登录/注册）方向一致 ⇒ 产品没错，错的是判据：这条用例现在断言的是「看到 hub 内容」。须把判据改成断言「被引导到 pages/login/index」并按裁定重新登记，不改判据不许算过。",
  "subpackages/campus/campus/index → pages/login/index": "未结案：同上，校园 index 页。判据断言的是页内内容而非重定向，须收紧成可判物件「落地页 == pages/login/index + 登录页品牌件 present」。",
  /* guest 真实带（round-7 第二把身份刀）实测：游客档下所有内容页都被守卫送到登录页，
     落地对全部是 X → pages/login/index，方向与既定裁定一致 ⇒ 产品没错、判据错了。
     逐组登记而不是写一条通配：将来某一组不再落登录页（守卫放宽或某页本来该放行），
     必须靠这一组的锚点失配暴露出来，而不是被一条笼统规则吸收掉。 */
  "subpackages/discover-extra/discover/matching → pages/login/index": "未结案：游客档被守卫送到登录页，与裁定（游客不得浏览、未登录须引导到登录/注册）一致 ⇒ 须把判据改成断言重定向，并按裁定把这条标成 A 档专属或双档各一条。",
  "subpackages/discover-extra/discover/match-success → pages/login/index": "未结案：同上（匹配成功页是登录后态，游客本就不该到达）⇒ 判据要么改断言重定向，要么标 guest-only-负例。",
  "subpackages/village/village/index → pages/login/index": "未结案：同上，乡村首页。",
  "subpackages/village/village/publish → pages/login/index": "未结案：同上；发布页属写侧动作，游客不可达是设计 ⇒ 判据须改断言重定向。",
  "subpackages/village/village/tag-posts → pages/login/index": "未结案：同上，话题聚合页。",
  "subpackages/village/village/history → pages/login/index": "未结案：同上，浏览历史是个人数据，游客不可达是设计。",
  "subpackages/circles/circles/circle-home → pages/login/index": "未结案：同上，圈子首页。",
  "subpackages/campus/campus/certification → pages/login/index": "未结案：认证页需要已登录身份，游客不可达符合设计；但这一组要单独确认「想发起认证的新用户」的正确入口在哪（若答案是登录页，判据就断言重定向；若是注册页，则本组是真实的产品缺口）。",
  /* ↓ guest 真实带跑完 1107 行后的其余 13 组落地对（93 行），落点同样全是 pages/login/index。
     不写成一条通配：三组理由不同，将来某一组放宽时要把那一组单独照出来。 */
  "subpackages/tools/search/index → pages/login/index": "未结案：内容检索属「游客不得浏览」范围 ⇒ 与裁定一致；判据要改成断言重定向到登录页，而不是断言搜索结果。",
  "subpackages/discover/activities/index → pages/login/index": "未结案：活动列表属内容浏览，「游客不得浏览」范围内 ⇒ 判据改断言重定向。",
  "subpackages/profile-extra/profile/album → pages/login/index": "未结案：个人相册属个人数据，游客不可达符合设计 ⇒ 判据改断言重定向。",
  "subpackages/profile-extra/profile/favorites → pages/login/index": "未结案：同上，收藏。",
  "subpackages/profile-extra/profile/tasks → pages/login/index": "未结案：同上，任务/成就。",
  "subpackages/profile-extra/settings/dnd → pages/login/index": "未结案：设置项属已登录会话，游客不可达符合设计 ⇒ 判据改断言重定向。",
  "subpackages/profile-extra/feedback/history → pages/login/index": "未结案：反馈历史属个人数据，同上。",
  "subpackages/profile-extra/verification/index → pages/login/index": "未结案：与 certification 同一类问题——发起实人认证的入口对游客是否应当放行（若应引导去注册，本组是产品缺口而不是判据问题）。",
  "subpackages/profile-extra/verification/real-name → pages/login/index": "未结案：同上，实名页。",
  "subpackages/support/feedback/index → pages/login/index": "未结案：意见反馈是否要求登录是产品口径问题（游客报错无门）；判据不能默认「必须能进」。",
  "subpackages/setup/campus/index → pages/login/index": "未结案：setup 三步是注册前引导还是登录后设置，尚未拍板；若属注册前，这一组就是真缺口。",
  "subpackages/setup/schedule/index → pages/login/index": "未结案：同上。",
  "subpackages/setup/interest/index → pages/login/index": "未结案：同上。",
};

const buckets = {};
const items = [];
let unclassified = 0;
const unclassifiedRows = [];
const evidenceHoles = [];   // 有名字也不许结案的证据缺口：命名只是让它从"没人看见"变成"人人看见"
const stampedRows = [];     // 判据台盖章 automatable===false 且 reason 引用该章的 SKIPPED 行：预期结果，逐条点名，既不计缺陷也不冒充覆盖
/* 开页重试耗尽的两本账（句式见 RE_OPEN_RETRY，分叉判据见 rowMeasured）：
   零取证 ⇒ 逐行不可采信，点名 + 单独计数，欠一次重跑；带取证 ⇒ 候选产品缺陷，额外否决门禁。 */
const openPageUnmeasuredRows = [];
const openPageMeasuredRows = [];
/* WS 交互腿（--tap）的逐形状点名册：口径出处就是 r-exec-ws.mjs 的那六行 + :665。
   每种形状各有一条自己的计数行（文末 stdout），不并成一个"交互结果"大桶 ——
   并桶就是把"这一腿没测到/测到了但归因不了/按规矩不该测"三种完全不同的债洗成一种。 */
const tapShapeRows = {
  deny: [], "no-class": [], "probe-no-answer": [], "absent-outcome": [], "absent-unattributed": [],
  "dead-selector-renamed": [],
  "dispatch-fail": [], "no-frame": [], "ws-route-no-answer": [],
};
/* 没带 --tap 那一刀的交互行（r-exec-ws.mjs:832，句式 RE_WS_TAP_DEFERRED）：逐条点名 + 逐条读数，
   理由同 tapShapeRows —— 一个数字回答不了"这 75 行里哪些复跑时能立刻拿到 present、哪些连类名都没点名"。
   读数只用于分诊排序，不参与归类（归类只看句子 + 这一行自己带回来的取证）。 */
const tapDeferredRows = [];
const tapDeferredReadings = {};
const gateProblems = [];
/* 每条"落进兜底桶"的行都单独记一句人可读的原因：门禁变红时必须自带证据，
   否则下一次跑这个脚本的人只能看到一个数字，还得重跑一遍才知道是哪几条。 */
const markUnclassified = (r, why) => {
  unclassified++;
  unclassifiedRows.push(`${r.id} @ ${r.page ?? "?"} [${r.status}] ${why} :: reason="${String(r.failureReason || "").slice(0, 110)}"`);
};
const markProblem = (m) => gateProblems.push(m);
let curOnTarget = null;   // 每条迭代重算：动作发生时是否就在用例声明的页面上
let curMismatch = false;  // observed 里的 `MISMATCH!`：前置身份/状态与自己声明的不符

const push = (r, b, extra) => {
  buckets[b] = (buckets[b] || 0) + 1;
  items.push({ id: r.id, suite: r.suite, page: r.page, status: r.status, identity: r.identity ?? null, bucket: b, onTarget: curOnTarget, mismatch: curMismatch, ...extra });
};

for (const r of rows) {
  if (r.status === "EXECUTED") { buckets["EXECUTED"] = (buckets["EXECUTED"] || 0) + 1; continue; }
  const obs = String(r.observed || "");
  const reason = String(r.failureReason || "");

  // 动作发生时在不在目标页：`top=` 与 route[] 末条都是执行器自报；与 page 不符 → 定位失败与元素存在性无关
  const topM = obs.match(/top=([^\s|]+)/);
  const lastRoute = Array.isArray(r.route) && r.route.length ? r.route[r.route.length - 1].route : null;
  curOnTarget = topM ? topM[1] === r.page : lastRoute ? lastRoute === r.page : null;
  curMismatch = /MISMATCH!/.test(obs);

  if (r.status === "SKIPPED" || r.status === "FAILED") {
    const re7 = matchRe7(reason, obs, r);
    if (re7 && re7.reject) {
      /* 句子学过了，但这一行自己否认那句承诺（说不盲点却没写 tap-skipped、说没落点却带着取证…）
         ⇒ 不认桶、不结案，照旧落红并写清是哪把尺没过。学过的口径 ≠ 免检。 */
      push(r, "other-fail", { want: null, note: `具名口径与本行取证冲突：${re7.reject}` });
      markUnclassified(r, `具名口径与本行取证冲突 :: ${String(re7.reject).slice(0, 90)}`);
      continue;
    }
    if (re7) {
      const { bucket, op, token: re7Token, tokenKind, recoverable, sel: re7Sel, note, landed, evidenceHole, miss, bytes, unclassified: uc, ucNote, tapShape, attribution, scope, control, tapDeferred, reading, readingKind, deadSelector, deadSel } = re7;
      /* observe-only dom 恢复只对"这一行确实在找目标且量到没找到"的桶生效（allowlist，泛化=放宽）：
         FAILED-landing-guard（探针答了 absent 却没落在声明页）与 SKIPPED-observe-only-slice（mock 刀本尊）。
         absent 声称（domAbsent）与 token 补位分开标：提取坏掉时四格为空而 domAbsent>0，
         fourgrid-axis 仍按"提取失灵"判红。deny/vague/no-answer 这些"没找或没法找"的桶不借道进四格。 */
      const domEligible = bucket === "FAILED-landing-guard" || bucket === "SKIPPED-observe-only-slice";
      const domc = domEligible ? domObserveConclusion(obs) : { absentSel: null, absentCount: 0 };
      const domRecovered = !!(domc.absentSel && !re7Token);
      const token = re7Token || (domRecovered ? domc.absentSel.replace(/^[.#]/, "") : re7Token);
      const sel = re7Token ? re7Sel : (domRecovered ? domc.absentSel : re7Sel);
      const tokKind = re7Token ? tokenKind : (domRecovered ? "selector" : tokenKind);
      const rec = re7Token != null && re7Token !== undefined ? recoverable : (domRecovered ? true : recoverable);
      push(r, bucket, { want: token ? sel : (miss ? miss : (note ? String(note).slice(0, 120) : null)), op, token, tokenKind: tokKind, recoverable: rec, sel, landed, evidenceHole, frameBytes: bytes, tapShape, attribution, scope, control, tapDeferred, reading, readingKind, deadSelector: deadSelector || undefined, deadSel: deadSel || undefined, domAbsent: domc.absentCount > 0 || undefined, tokenFrom: domRecovered ? "observe-only-dom" : undefined, from: "reason-re7" });
      if (tapShape && tapShapeRows[tapShape]) tapShapeRows[tapShape].push(`${r.id} @ ${r.page}${sel ? " " + sel : ""}${deadSel ? " → " + deadSel.proposed : ""}${miss ? "（miss=" + String(miss).slice(0, 60) + "）" : ""}${attribution ? " ｜ " + attribution : ""}`);
      if (tapDeferred) { tapDeferredRows.push(`${r.id} @ ${r.page}（读数：${reading}）`); tapDeferredReadings[readingKind] = (tapDeferredReadings[readingKind] || 0) + 1; }
      if (evidenceHole) evidenceHoles.push(`${r.id} @ ${r.page} 要求出帧但帧未成立（${miss || "无 miss 路径"}${bytes ? `，仅 ${bytes}B` : ""}）`);
      if (uc) markUnclassified(r, ucNote || "交互腿下发失败但没留下可复核的选择器");
      continue;
    }
  }
  /* 开页重试耗尽：必须在下面 RE_REASON / RE_OBS_FAIL 那两种旧形态之前判。
     理由是执行器把这句话写成"原因 + | stdout={…}"，RE_REASON 要的是 `action X Y failed: …`、
     RE_OBS_FAIL 要的是 observed 尾注 `act-FAIL:…`，而零取证行的 observed 是空串 ——
     放到后面只会把一句本工具已经认得的句子重新判成"两种形态都对不上"。
     分叉只用声明的取证判据（rowMeasured），不用"重试"这个词。 */
  if (r.status === "FAILED") {
    const orm = reason.match(RE_OPEN_RETRY);
    if (orm) {
      const attempts = Number(orm[1]);
      const detail = String(orm[2] || "").trim();
      if (rowMeasured(r)) {
        push(r, "FAILED-open-page-measured-defect", { want: detail.slice(0, 160), op: "open_page", attempts, from: "reason-open-retry" });
        openPageMeasuredRows.push(`${r.id} @ ${r.page ?? "?"}（重试 ${attempts} 次仍失败，可该行有取证：route=${JSON.stringify(String(r.route ?? "").slice(0, 60))} evidence=${String(r.evidence || "").trim() ? "有帧" : "无"} observed="${String(r.observed || "").slice(0, 90)}"）:: reason="${detail.slice(0, 190)}"`);
        continue;
      }
      push(r, "FAILED-open-page-unmeasured", { want: detail.slice(0, 160), op: "open_page", attempts, from: "reason-open-retry" });
      openPageUnmeasuredRows.push(`${r.id} @ ${r.page ?? "?"}（重试 ${attempts} 次，零取证：route/evidence/observed 全空 ⇒ 这一行从未被测）:: openErr="${detail.slice(0, 190)}"`);
      continue;
    }
  }
  if (r.status === "SKIPPED") {
    const m = obs.match(RE_OBS_SKIP);
    if (!m) {
      /* 盖章免检要**两把尺同时**才放行（本仓的成对契约规矩）：
         ① 判据台 ops 声明 c.automatable === false（与覆盖门免检轴/WS 拒跑名单同源同判等），
         ② 执行器 reason 正是引用该章的那句话。
         两边不一致就维持原样红 —— 执行器单方面喊盖章（查无此章）、或盖了章的行说的却是别的口径，
         都还落「口径不在词表内」，一个都不许被豁免桶悄悄吸走。 */
      const stampKey = `${r.manifest}|${r.id}`;
      const declared = STAMP_KEYS.has(stampKey);
      const wording = RE_STAMP_REASON.test(reason);
      if (declared && wording) {
        push(r, "SKIPPED-not-automatable-stamped", { want: null, stampFrom: STAMP_KEYS.get(stampKey) || null, from: "ops-declared+reason-stamp" });
        stampedRows.push(`${r.id} @ ${r.page ?? "?"}（盖章出处 ${STAMP_KEYS.get(stampKey) || "未记"}）`);
        continue;
      }
      push(r, "other-fail", { want: null, note: `SKIPPED 但既不在 round-7 词表里、observed 也没有 action-not-automatable 尾注：reason="${reason.slice(0, 120)}"${declared ? "（判据台盖过章 automatable=false，但执行器口径不是引用该章的那句话 ⇒ 两把尺不同源，不豁免）" : wording ? `（执行器引用了盖章句，但判据台 ${stampKey} 没有 automatable===false 的声明 ⇒ 查无此章，不豁免）` : ""}` });
      markUnclassified(r, "SKIPPED 口径不在词表内");
      continue;
    }
    push(r, "SKIPPED-not-automatable", { want: m[1], note: null });
    continue;
  }
  if (r.status !== "FAILED") { push(r, "other-fail", { want: null, note: `未知 status=${r.status}` }); markUnclassified(r, `未知 status=${r.status}`); continue; }

  // 取"失败那一幕"的原文：优先 failureReason（单句、机读），observed 只做兜底且取最后一条 act-FAIL
  let op = null, target = null, detail = null, src = null;
  const rm = reason.match(RE_REASON);
  const om = [...obs.matchAll(new RegExp(RE_OBS_FAIL.source, "g"))].pop();
  if (rm) { op = rm[1]; target = rm[2]; detail = rm[3]; src = "reason"; }
  else if (om) { op = om[1]; target = om[2]; detail = om[3].trim(); src = "observed"; }
  else { push(r, "other-fail", { want: null, note: `observed/failureReason 都不是 act-FAIL/action-x-failed 形态：obs="${obs.slice(0, 100)}" reason="${reason.slice(0, 100)}"` }); markUnclassified(r, "FAILED 但两种失败原文形态都对不上"); continue; }

  if (/is not a function|is not defined|TypeError|Cannot read/.test(detail)) { push(r, "harness-api", { want: detail.slice(0, 120), op, from: src }); continue; }
  if (/timeout|TIMEOUT/.test(detail)) { push(r, "timeout", { want: detail.slice(0, 120), op, from: src }); continue; }
  // 只按动作名判前置失败：`/login|logout/` 这种松散匹配会把 .login-sms-fallback 之类的选择器误判成登录前置失败
  if (op === "login" || op === "logout" || /^(login|logout|mint token|bootstrap)/i.test(detail)) {
    push(r, "auth-precondition", { want: detail.slice(0, 120), op, target, from: src }); continue;
  }

  const nf = detail.match(RE_NOT_FOUND);
  if (!nf) { push(r, "other-fail", { want: detail.slice(0, 160), op, from: src }); markUnclassified(r, "detail 不是 element not found 形态"); continue; }
  const found = nf[1].trim();

  const lm = found.match(/^__CAND__\s*[（(]"(.*)"[)）]$/);
  if (lm) {
    push(r, "locate-label", { want: lm[1], op, token: lm[1], tokenKind: "label", recoverable: true, suspect: lm[1].length < 2, from: src });
    continue;
  }
  // 选择器 + 标签混排（`.btn-text("返回微信登录")`）：决定性的是标签，选择器只是作用域
  const sm = found.match(/^(.+?)\s*[（(]"(.*)"[)）]$/);
  if (sm && sm[1] !== "__CAND__") {
    push(r, "locate-label", { want: sm[2], op, sel: sm[1], token: sm[2], tokenKind: "label", recoverable: true, suspect: sm[2].length < 2, from: src });
    continue;
  }
  if (found === "__CAND__" || found === "") {
    // 执行器只留下哨兵，没写要找的文案，也没写候选选择器 → 这条证据无法复核
    push(r, "locate-label-token-lost", { want: null, op, token: null, recoverable: false, from: src });
    markUnclassified(r, "执行器只留哨兵，没留文案也没留候选选择器（取证缺陷）");
    continue;
  }
  push(r, "locate-selector", { want: found, op, token: found.replace(/^[.#]/, ""), tokenKind: "selector", recoverable: true, from: src });
}

// ---------- token 存在性双查（标签按运行时语义 substring 匹配，选择器按类名 token 匹配）----------
const NEEDS_INDEX = items.filter((it) => it.recoverable && it.token);
for (const it of NEEDS_INDEX) {
  const matcher = it.tokenKind === "selector" ? hitsSel : hits;
  const dh = matcher(distIdx, it.token), sh = matcher(srcIdx, it.token);
  it.distHits = dh.length; it.srcHits = sh.length;
  it.distHere = pageScoped(dh, it.page).length;
  it.srcHere = pageScoped(sh, it.page).length;
  it.verdict =
    it.onTarget === false ? "不在目标页：前置导航没到位（用例前置/harness 通道），元素存在性无从判断"
      : (!dh.length && !sh.length) ? "两载皆无：本构建确无此文案/类，用例断言的目标不存在（产品缺或规格臆造）"
      : (!dh.length && sh.length) ? "仅源码有：修复波补上了它 → 本轮失败作废，重建后必须复验"
        : (dh.length && !sh.length) ? "仅构建有：修复波删掉了它 → 下次构建会新增失败，必须复验"
          : "两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机）";
}

// ---------- 落地对（每组须有 booked 复测腿或裁决）----------
const landingGroups = {};
const landingIdents = {};   // 每组落地对里"有哪些行真的声明了身份"——判域收窄要用它，不能靠 observed 散文猜
for (const it of items) {
  if (it.bucket !== "FAILED-landing-guard") continue;
  const k = `${it.page} → ${it.landed || "?"}`;
  (landingGroups[k] = landingGroups[k] || []).push(it.id);
  (landingIdents[k] = landingIdents[k] || new Set()).add(String(it.identity ?? "").trim());
}
const landingKeys = Object.keys(landingGroups);
/* 落地对的处置：先读机器账本（verify-guest-landing.mjs --mode book 出的复测腿），
   再退回到脚本里手写的 LANDING_DISPOSITION。手写表只是"有人想过"，
   账本才是"有一腿会替我们量"——两者都在时以账本为准，因为它带三态。 */
const GUEST_BOOK = arg("guest-book", "reports/audit/round-7/guest-landing-booked.json");
const GUEST_MEASURED = arg("guest-measured", "reports/audit/round-7/guest-landing-measured.json");
const bookedText = {};
const coverMismatch = [];
const coverIdentitySkips = [];
/* 复测腿账本绑的是游客档那批行；A 档语料里同名落地对（VIP 三页）成员不同是应当的，
   拿它去比成员会造出三条假红 —— 所以先对齐身份，再比成员。 */
const corpusIdentity = String(doc.identity || (rows[0] && rows[0].identity) || "?");
/* 部分切片（--real-cases-only）天生只含 requiresReal 那一批 ⇒ 每组成员必然是全量的子集。
   拿它去比 booked 账本（按全量成员记账）会造出一串"这条腿量的不是这笔债"的假红
   （round-7 实测 24 组，例：campus/hub 账本 18 行 vs 本切片 4 行）。
   这不是债没对上，是核对轴不同源：切片腿回答"真实档这一组判没判过"，
   成员账回答"这一组由哪条腿复测"。所以切片语料不比成员，但**仍要求这组被复测腿认领**
   （下面的 landingMissing 照查），不许顺势把整组判成已结案。 */
const corpusIsPartialSlice = /real-cases-only/.test(String(doc.runner || "")) ||
  rows.some((r) => /^真实刀只跑 requiresReal 用例/.test(String(r.failureReason || "")));
const coverSliceSkips = [];
if (fs.existsSync(GUEST_BOOK)) {
  const bk = JSON.parse(fs.readFileSync(GUEST_BOOK, "utf8"));
  const ms = fs.existsSync(GUEST_MEASURED) ? JSON.parse(fs.readFileSync(GUEST_MEASURED, "utf8")) : null;
  for (const r of landingStatus(bk, ms)) {
    bookedText[r.groupKey] = r.statusText;
    const here = (landingGroups[r.groupKey] || []).slice().sort().join(",");
    const claim = (r.caseIds || []).slice().sort().join(",");
    if (r.identity && r.identity !== corpusIdentity) {
      if (here) coverIdentitySkips.push(`${r.groupKey}：账本绑 ${r.identity} 档 ${r.debtRows} 行，本语料是 ${corpusIdentity} 档 ${landingGroups[r.groupKey].length} 行 ⇒ 不比成员（落地对仍按账本处置）`);
      continue;
    }
    if (here && here !== claim) {
      /* 切片只可能让某一组"少几行"。实测多于账本 ⇒ 不能顺手写成"账本漏记"：
         round-7 实测这一支的真因是**成员本身随单次运行而变**——
         同一组在 --real-cases-only 切片里 7 行、在全量跑里 5 行（哪些行落进
         FAILED-landing-guard 取决于当次的落点/交互结果），所以拿任何"一次运行"当债名册都不成立。
         这里只陈述"两次不一样"这个事实，因果留给 ops 清单派生成员那一步去解（见 #67）。 */
      const subsetOnly = corpusIsPartialSlice && landingGroups[r.groupKey].length <= (r.caseIds || []).length;
      if (subsetOnly) coverSliceSkips.push(`${r.groupKey}：实测 ${landingGroups[r.groupKey].length} 行 vs 账本 ${r.caseIds.length} 行`);
      else coverMismatch.push(`${r.groupKey}：复测腿账本声称覆盖 ${(r.caseIds || []).length} 行，本轮该组实测 ${landingGroups[r.groupKey].length} 行且成员不同 ⇒ 这条腿量的不是这笔债${corpusIsPartialSlice ? "（实测多于账本 ⇒ 成员随单次运行而变，债名册不能由一次跑派生）" : ""}`);
    }
  }
}
const dispositionOf = (k) => bookedText[k] || LANDING_DISPOSITION[k] || null;
/* 判域收窄（用户 2026-09-29 裁定，走 decisions §29 的路 (b)）：
   落地对这条轴断言的是"游客该被引导到登录/注册"，可它读的语料有 0/1107 行声明 identity
   （实测 reports/audit/round-7/interact/exec-results.json：逐行与顶层都没有这个字段）。
   向一群身份不明的人索要游客处置，判红也只是在替一个没人认领的前提记账。
   所以：**该组只要有任一行真声明了身份，判红照旧咬**（负例由 test-landing-identity-scope.mjs 证明能红）；
   只有"整组行都没声明身份"的那批才改记 UNVERIFIED-INSTRUMENT 具名读数，不判红、也不算结案。
   注意这不是降阈值：阈值仍是 landingMissing===0，只是把"能归属的人"重新数对了。 */
const landingMissingAll = landingKeys.filter((k) => !dispositionOf(k));
const landingUndeclared = landingMissingAll.filter((k) => {
  const s = landingIdents[k] || new Set();
  s.delete("");
  return s.size === 0;
});
const landingMissing = landingMissingAll.filter((k) => !landingUndeclared.includes(k));
const landingUndeclaredSet = new Set(landingUndeclared);
const landingAdjudicable = landingKeys.length - landingUndeclared.length;

// ---------- 守恒断言（自洽性：不成立就别写报告）----------
const total = rows.length;
const sum = Object.values(buckets).reduce((a, b) => a + b, 0);
if (sum !== total) die(`FAIL 分类不守恒：桶合计 ${sum} ≠ 行总数 ${total}（有行被重复计或漏计）`);
const neg = Object.entries(buckets).filter(([, v]) => v < 0);
if (neg.length) die(`FAIL 出现负计数：${JSON.stringify(neg)}`);

const suspect = items.filter((it) => it.suspect).length;
const fromObserved = items.filter((it) => it.from === "observed").length;
const noReason = rows.filter((r) => r.status === "FAILED" && !r.failureReason).length;
const offTarget = items.filter((it) => it.onTarget === false).length;
const noTop = items.filter((it) => it.onTarget === null).length;
const mism = items.filter((it) => it.mismatch).length;

/* WS 交互腿（--tap）的形状名册：形状 → 出处行 + 落的桶 + 这句话到底承诺了什么。
   零行的形状也列在普查里（只在本腿真的出现过这些口径时打印，别的语料判词一字不改，
   沿用文末 openPageClause 的规矩）—— 零行是信息，不是噪声：它说明这一腿没踩到那支。 */
const TAP_SHAPES = [
  ["deny", "r-exec-ws.mjs:373", "SKIPPED-deny-irreversible", "动作命中不可逆清单 ⇒ 按规矩不发交互（保会话），关于目标什么都没量到"],
  ["no-class", "r-exec-ws.mjs:376", "SKIPPED-vague-action", "action 里没点名类名 ⇒ 探针没跑，缺的是判据"],
  ["probe-no-answer", "r-exec-ws.mjs:381", "SKIPPED-tap-probe-no-answer", "元素探针无答案 ⇒ 通道未就绪，欠重跑"],
  ["absent-outcome", "r-exec-ws.mjs:384", "SKIPPED-tap-target-absent-reststate", "量到的读数=静息态 absent，且载具对该选择器有正向对照 ⇒ 测量结果，欠判据前置配方"],
  ["absent-unattributed", "r-exec-ws.mjs:384", "SKIPPED-tap-target-absent-unattributed", "同一个 absent 读数，但类名只在组件自己的文件里且本腿对它零次 present ⇒ 归因未定，欠一次正向对照"],
  ["dead-selector-renamed", "r-exec-ws.mjs:384 读数 + 分诊侧归因第三叉", "SKIPPED-tap-target-dead-selector-renamed", "同一个 absent 读数，但该类名在两载皆无，且这一条 manifest+id 已被死选择器判决表点名、判据台已把 tapTarget 改到真实存在的名字 ⇒ 本行读的是改名前的旧目标，读数作废，欠按新目标复跑（不是产品缺陷、不是臆造）"],
  ["dispatch-fail", "r-exec-ws.mjs:388", "SKIPPED-interact-channel", "探针说在、tap 没确认 ⇒ 通道/选择器问题，须人判"],
  ["no-frame", "r-exec-ws.mjs:398", "SKIPPED-frame-evidence-hole", "点下去了却没帧 ⇒ 证据缺口（连同 evidenceHole 否决一起复用）"],
  ["ws-route-no-answer", "r-exec-ws.mjs:665", "SKIPPED-route-probe-no-answer", "WS currentPage() 没给结果且该行零取证 ⇒ 从未被测，欠重跑（不在那六行里，是真数据里多出来的第七种形状）"],
];
const tapShapesTotal = Object.values(tapShapeRows).reduce((a, b) => a + b.length, 0);
const tapAbsentTotal = tapShapeRows["absent-outcome"].length + tapShapeRows["absent-unattributed"].length;

// ---------- 输出 ----------
const order = ["EXECUTED", ...Object.keys(BUCKET)];const NO_TARGET = new Set(["SKIPPED-real-band", "SKIPPED-vague-action", "SKIPPED-vague-criterion", "SKIPPED-observe-only-slice", "SKIPPED-deny-irreversible", "SKIPPED-left-page", "SKIPPED-frame-evidence-hole", "FAILED-landing-guard", "FAILED-open-page-unmeasured", "FAILED-open-page-measured-defect"]);
const lines = [];
lines.push(`# 执行轮失败分诊（round 权威件：${RESULTS}）`);
lines.push("");
lines.push(`- 权威件快照：round=${doc.round ?? "?"} gitSha=${doc.gitSha ?? "?"} updatedAt=${doc.updatedAt ?? "?"} 行数=${total}`);
lines.push(`- 构建索引：${DIST} → ${distIdx.length}/${distFiles.length} 文件；源码索引：${SRC} → ${srcIdx.length}/${srcFiles.length} 文件`);
if (distFiles.length !== distIdx.length || srcFiles.length !== srcIdx.length)
  lines.push(`- **读取失败计数**：dist ${distFiles.length - distIdx.length} 个、src ${srcFiles.length - srcIdx.length} 个文件读不出（存在性判定是在"可读物集"上做的，不是全量，见上）`);
lines.push(`- 守恒：桶合计 ${sum} == 行数 ${total} ✔`);
lines.push(`- 解析来源：failureReason ${items.filter((i) => i.from === "reason").length} 条 / observed 兜底 ${fromObserved} 条；FAILED 行里 failureReason 为空 ${noReason} 条`);
lines.push(`- 单字标签（从用例散文里抠出来的残字，几乎必是规格噪声而不是产品缺陷）：${suspect} 条`);
lines.push(`- 动作发生时不在用例声明的页面上：${offTarget} 条；observed 里读不到 top= 也读不到 route[]（判不了）：${noTop} 条`);
lines.push(`- observed 带 \`MISMATCH!\`（执行器自报前置身份/状态不符）：${mism} 条`);
if (openPageUnmeasuredRows.length || openPageMeasuredRows.length) {
  lines.push(`- 开页重试耗尽（句式 r-exec-ws.mjs:617）：零取证 **${openPageUnmeasuredRows.length}** 行（这一行从未被测 ⇒ 通道/窗口状态，不算缺陷也不算覆盖，欠一次重跑）｜带取证 **${openPageMeasuredRows.length}** 行（量到了还说开不起来 ⇒ 候选产品级页面缺陷，否决门禁）`);
  lines.push(`- 该批执行器自报：admissible=${doc.admissible === undefined ? "?" : (doc.admissible ? "yes" : "no")} outcome=${doc.outcome ?? "?"}（批次级口径见 r-exec-ws.mjs:137/141 的 WSX_OUTCOME / WSX_ADMISSIBLE；逐行分叉只按 rowMeasured 判，不按批次旗标豁免）`);
}
if (tapShapesTotal) {
  lines.push(`- WS 交互腿（--tap）口径普查：\`r-exec-ws.mjs\` 的 runTapCase ${TAP_SHAPES.filter(([k]) => tapShapeRows[k].length).length} 种形状命中 **${tapShapesTotal}** 行（含本腿没有的形状，逐条见文末名册）；其中「下发前探针答 absent」共 **${tapAbsentTotal}** 行 = 静息态读数（可归因）**${tapShapeRows["absent-outcome"].length}** + 归因未定（组件作用域无正向对照）**${tapShapeRows["absent-unattributed"].length}**；同一条 :384 读数另有第三支归因叉（两载皆无但已被死选择器判决表认领、判据台改名已落地）**${tapShapeRows["dead-selector-renamed"].length}** 行，它不在上面那个数里 —— 那两支出的是「前置配方/正向对照」的债，这一支出的是「按新目标复跑」的债`);
  lines.push(`- 交互型一律 \`durationMs=0\`（r-exec-ws.mjs:104 的 row() 写死），所以耗时不能用来判断"这一刀有没有下发"；判据是 observed 里的 \`tap-skipped\`/\`tap=<sel>\`，本工具就是按它交叉核对的`);
}
if (tapDeferredRows.length) {
  lines.push(`- 未开 --tap 的交互判点（句式 r-exec-ws.mjs:832）：**${tapDeferredRows.length}** 行 ⇒ 这一刀按切片配置一个交互都没下发（预期未执行：不算缺陷、不算覆盖、也不算"判点已被验证"），但每行仍带回落点+探针读数：${Object.entries(tapDeferredReadings).map(([k, v]) => `${k}=${v}`).join(" ")}（逐条见文末名册）`);
}
lines.push("");
lines.push("| 桶 | 条数 | 含义 |");
lines.push("|---|---|---|");
for (const b of order) if (buckets[b]) lines.push(`| ${b} | ${buckets[b]} | ${BUCKET[b] || "已通过的行，不参与分诊"} |`);
lines.push("");
lines.push(`判据形态未能归类的行数（归在兜底桶里，逐条列在下文）：**${unclassified}**`);
lines.push(`判据台盖章不可自动化（声明 automatable===false 且 reason 引用该章，两尺一致才计入）：**${stampedRows.length} 行** —— 预期结果：不计缺陷、不计覆盖、不计入上行 unclassified，逐条点名如下`);
lines.push("");
for (const s of stampedRows) lines.push(`- STAMPED ${s}`);
/* 开页重试耗尽：两本账都要**逐条点名**（同 STAMPED 的规矩）。零取证那一支不计入 unclassified，
   但它是"从没被测过"的名单，读者必须能一条一条数；带取证那一支同时是门禁红，见文末 markProblem。 */
if (openPageUnmeasuredRows.length || openPageMeasuredRows.length) {
  lines.push("");
  lines.push(`开页重试耗尽且该行零取证（OPEN_PAGE_UNMEASURED：**${openPageUnmeasuredRows.length} 行** —— 不算缺陷、不算覆盖、不计入上行 unclassified，欠的是重跑这一批，逐条点名如下）`);
  for (const s of openPageUnmeasuredRows) lines.push(`- OPEN_PAGE_UNMEASURED ${s}`);
  lines.push("");
  lines.push(`开页重试耗尽但该行有取证（OPEN_PAGE_MEASURED_DEFECT：**${openPageMeasuredRows.length} 行** —— 候选产品级页面缺陷，逐条人判，>0 即门禁红）`);
  for (const s of openPageMeasuredRows) lines.push(`- OPEN_PAGE_MEASURED_DEFECT ${s}`);
}
lines.push("");
for (const s of unclassifiedRows.slice(0, 60)) lines.push(`- ${s}`);
if (unclassifiedRows.length > 60) lines.push(`- …另 ${unclassifiedRows.length - 60} 行见同名 .json 的 unclassifiedRows`);
if (unclassifiedRows.length) lines.push("");

/* WS 交互腿的名册：逐形状报数（包括本轮 0 行的形状），再逐条点名。
   为什么要连 0 行的一起报：这腿是专门为"组件作用域能不能点"补的刀，
   只报命中过的形状就等于把"没踩到的那几支"藏起来，下一轮读不出通道到底行不行。 */
if (tapShapesTotal) {
  lines.push("## WS 交互腿（--tap）口径名册（出处 = r-exec-ws.mjs runTapCase 六行 + :665）");
  lines.push("");
  lines.push("| 形状 | 出处行 | 落的桶 | 本轮行数 | 这句话承诺了什么 |");
  lines.push("|---|---|---|---|---|");
  for (const [k, from, bucket, claim] of TAP_SHAPES) lines.push(`| ${k} | ${from} | ${bucket} | ${tapShapeRows[k].length} | ${claim} |`);
  lines.push("");
  lines.push(`「下发前答 absent」的三支分叉（分叉判据 = 本语料内的正向对照 + 类名所在编译文件 + 两载检索 + 盘上的死选择器判决，不是措辞）：`);
  lines.push("");
  for (const [k, head] of [["absent-outcome", "TAP_OUTCOME（测量结果：静息态确实没有 ⇒ 判据欠前置配方，不算缺陷/不算通道问题/不算覆盖）"],
    ["absent-unattributed", "TAP_UNATTRIBUTED（归因未定：本腿对该类名零次 present，与「查询进不到组件作用域」分不开 ⇒ 命名不等于结案，欠一次正向对照）"],
    ["dead-selector-renamed", "TAP_DEAD_SEL_RENAMED（两载皆无 + 判决表点名这一条 manifest+id + 判据台改名已落地 + 新目标在两载查得到 ⇒ 本行读的是改名前的旧目标，命名不等于结案，欠按新目标复跑；四把尺任一不过照旧落「臆造选择器，须人判」红）"]]) {
    lines.push(`- ${head}：**${tapShapeRows[k].length} 行**`);
    for (const s of tapShapeRows[k]) lines.push(`  - ${s}`);
    lines.push("");
  }
}

/* 未开 --tap 那一刀的交互行名册：与 runTapCase 那六行不是一张表 —— 那六行是"这一刀真下了发"的分支，
   本表是"这一刀按配置没下发"的分支（r-exec-ws.mjs:829-832）。分开列，读者才不会把 75 行
   "没点"和 68 行"点了但没成"读成同一笔债。 */
if (tapDeferredRows.length) {
  lines.push("## 未开 --tap 的交互行名册（出处 r-exec-ws.mjs:832 ｜ 分类＝预期未执行 ｜ 桶 SKIPPED-observe-only-slice）");
  lines.push("");
  lines.push(`进桶要五把尺全过：status===SKIPPED、observed 带 \`| ws-route+ws-probe\`（:822 那条本行自报）、observed 不带 \`tap=\`/\`post-tap\`（没下发）、observed 不带 \`≠\`（没落在别的页）、\`rowMeasured===true\`（落点或探针至少量到一样，:141 的镜像）。任一把不过 ⇒ 落「具名口径与本行取证冲突」红，不吸收。`);
  lines.push("");
  lines.push(`读数分布（复跑 --tap 时各自欠什么）：${Object.entries(tapDeferredReadings).map(([k, v]) => `${k}=${v}`).join(" ")}`);
  lines.push("");
  lines.push(`本桶不核对有没有 --tap 复测腿来认领这批行（没有这个旗标，也不许拿"应该有人跑过"当免检）：${tapDeferredRows.length} 行逐条点名如下，认领与否由持有那条腿的人判。`);
  lines.push("");
  for (const s of tapDeferredRows) lines.push(`- TAP_NOT_ENABLED ${s}`);
  lines.push("");
}

const four = {};
for (const it of NEEDS_INDEX) four[it.verdict] = (four[it.verdict] || 0) + 1;
lines.push("## 存在性四格（只统计能恢复出查找目标的定位失败；含 round-7 observe-only dom 结论 `.x:absent` 恢复出的目标）");
lines.push("");
lines.push("| 结论 | 条数 |");
lines.push("|---|---|");
for (const [k, v] of Object.entries(four).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
lines.push("");

if (landingKeys.length) {
  lines.push("## 落地对（FAILED-landing-guard：每组须有 booked 复测腿或裁决）");
  lines.push("");
  lines.push("| 声明页 → 实际落地页 | 条数 | 处置 |");
  lines.push("|---|---|---|");
  for (const k of landingKeys.sort((a, b) => landingGroups[b].length - landingGroups[a].length))
    lines.push(`| ${k} | ${landingGroups[k].length} | ${dispositionOf(k) || (landingUndeclaredSet.has(k) ? "**本轴不判：这一组的行全无 identity 声明 ⇒ UNVERIFIED-INSTRUMENT（不算结案，也不判红）**" : "**无处置 —— 须 booking 复测腿或写裁决**")} |`);
  lines.push("");
}

for (const b of order) {
  const list = items.filter((it) => it.bucket === b);
  if (!list.length || b === "EXECUTED") continue;
  lines.push(`## ${b}（${list.length} 条）`);
  lines.push("");
  if (b === "SKIPPED-not-automatable" || b === "SKIPPED-not-automatable-stamped" || NO_TARGET.has(b)) {
    const byPage = {};
    for (const it of list) (byPage[it.page] = byPage[it.page] || []).push(it);
    for (const [p, l] of Object.entries(byPage).sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`- ${p}（${l.length} 条）：` + l.slice(0, 4).map((x) => `${x.id}${x.landed ? "→" + x.landed : ""}${x.want ? `「${String(x.want).slice(0, 50)}」` : ""}`).join("、") + (l.length > 4 ? `；另 ${l.length - 4} 条` : ""));
    }
  } else {
    const grouped = {};
    for (const it of list) {
      const k = `${(it.sel ? it.sel + '「' + it.token + '」' : it.want) || "?"} @ ${it.page}`;
      (grouped[k] = grouped[k] || []).push(it);
    }
    lines.push("| 要找的东西 | 页面 | 条数 | dist 命中(本页) | src 命中(本页) | 结论 |");
    lines.push("|---|---|---|---|---|---|");
    for (const [k, l] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
      const f = l[0];
      const tk = String(k.split(" @ ")[0]).replace(/\|/g, "/") + (f.suspect ? " ←单字残标签" : "");
      lines.push(`| ${tk} | ${f.page} | ${l.length} | ${f.distHits ?? "—"}(${f.distHere ?? "—"}) | ${f.srcHits ?? "—"}(${f.srcHere ?? "—"}) | ${String(f.verdict || "无查找目标") + (f.attribution ? ` ｜ 归因：${String(f.attribution).replace(/\|/g, "/")}` : "")} |`);
    }
  }
  lines.push("");
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT + ".md", lines.join("\n"));
fs.writeFileSync(OUT + ".json", JSON.stringify({ results: RESULTS, updatedAt: doc.updatedAt ?? null, total, buckets, bucketNames: Object.keys(BUCKET), unclassified, unclassifiedRows, stampedCount: stampedRows.length, stampedRows, openPageUnmeasuredCount: openPageUnmeasuredRows.length, openPageUnmeasuredRows, openPageMeasuredDefectCount: openPageMeasuredRows.length, openPageMeasuredRows, tapShapeCounts: Object.fromEntries(Object.entries(tapShapeRows).map(([k, v]) => [k, v.length])), tapShapeRows, tapAbsentTotal, deadSelectorRenamed: tapShapeRows["dead-selector-renamed"].length, deadSelectorRows: tapShapeRows["dead-selector-renamed"], deadSelectorSources: { table: DEAD_SEL_TABLE, tableEntries: DEAD_SEL.size, tableIgnored: deadSelIgnored, ops: RENAME_OPS, opsFromCorpus: !OPS_EXPLICIT, opsRenameEntries: OPS_RENAME.size }, gateFires: { unclassified, landingMissing: landingMissing.length, landingUndeclared: landingUndeclared.length, landingAdjudicable, coverMismatch: coverMismatch.length, openPageMeasuredDefect: openPageMeasuredRows.length, evidenceHoles: evidenceHoles.length }, tapDeferredCount: tapDeferredRows.length, tapDeferredReadings, tapDeferredRows, controlSelectors: [...CONTROL_SEL].sort(), batchSelfReport: { admissible: doc.admissible ?? null, outcome: doc.outcome ?? null, runner: doc.runner ?? null }, evidenceHoles, landingGroups, landingMissing, landingUndeclared, landingAdjudicable, items }, null, 1));
console.log(`TRIAGE_SUMMARY rows=${total} unclassified=${unclassified}`);
for (const b of order) if (buckets[b]) console.log(`  ${String(buckets[b]).padStart(4)} ${b}`);
/* 盖章行必须**这一腿自己数给读者看**：它是免掉缺陷计数的唯一新增口径，
   不在 stdout 报数报名单，就等于把「没跑的行」悄悄抹出账本（同 REALCOV_AUTOMATABLE_EXEMPT 的规矩）。 */
console.log(`NOT_AUTOMATABLE_STAMPED=${stampedRows.length}（判据台声明 automatable===false + 执行器 reason 引用该章 ⇒ 预期未执行：单独计数、逐条点名，不算缺陷也不算覆盖）`);
for (const s of stampedRows) console.log("  STAMPED " + s);
/* 开页重试耗尽必须**这一腿自己数给读者看**（同 NOT_AUTOMATABLE_STAMPED 的规矩）：
   "零取证 ⇒ 不可采信"是本门新增的免检口径，不点名就是把从没被测过的行抹出账本。
   两支分开报数，读者一眼看得出"这一行没测"和"这一行测到了却开不起来"不是一回事。 */
if (openPageUnmeasuredRows.length || openPageMeasuredRows.length) {
  console.log(`OPEN_PAGE_UNMEASURED=${openPageUnmeasuredRows.length}（open_page 重试耗尽 + 该行零取证，判据 = r-exec-ws.mjs:113 rowMeasured 的逐字镜像 ⇒ 这一行从未被测：单独计数、逐条点名，不算缺陷也不算覆盖，欠的是重跑这一批；批次自报 admissible=${doc.admissible === undefined ? "?" : (doc.admissible ? "yes" : "no")} outcome=${doc.outcome ?? "?"}）`);
  for (const s of openPageUnmeasuredRows) console.log("  OPEN_PAGE_UNMEASURED " + s);
  console.log(`OPEN_PAGE_MEASURED_DEFECT=${openPageMeasuredRows.length}（同一句重试耗尽但该行的 rowMeasured===true ⇒ 量到了落点/探针/帧还开不起来 ⇒ 候选产品级页面缺陷，不并入上行，>0 即门禁红）`);
  for (const s of openPageMeasuredRows) console.log("  OPEN_PAGE_MEASURED_DEFECT " + s);
}
/* WS 交互腿（--tap）的口径必须**这一腿自己数给读者看**（同 NOT_AUTOMATABLE_STAMPED / OPEN_PAGE_* 的规矩）：
   "交互下发了、组件作用域的目标在静息态不在"这一类既不是通道坏了、也不是产品判红，
   不点名就是把 51 行的判据前置缺口抹出账本。零行的形状也照报（这一腿没踩到 = 信息）。 */
if (tapShapesTotal) {
  console.log(`TRIAGE_TAP_SHAPES total=${tapShapesTotal} ` + TAP_SHAPES.map(([k, from]) => `${k}@${from}=${tapShapeRows[k].length}`).join(" "));
  console.log(`TRIAGE_TAP_TARGET_ABSENT=${tapAbsentTotal}（r-exec-ws.mjs:384：下发前探针答 absent、observed 自带 tap-skipped ⇒ 这一刀按规矩没点，不是"点了点不动"；下面按归因分两支各自计数，不并成一个数）`);
  console.log(`TRIAGE_TAP_OUTCOME_MEASURED=${tapShapeRows["absent-outcome"].length}（可归因：本语料里同一个选择器答过 present(N) 或被成功 tap= 过，或它就在被测页自己的编译文件里 ⇒ 载具看得见它，absent 只能是状态读数 ⇒ 测量结果，不算缺陷、不算通道问题、不算覆盖；欠的是判据的前置配方〔先展开/先滚动/登录态〕，须按台账去向结案，本门不给结案）`);
  for (const s of tapShapeRows["absent-outcome"]) console.log("  TAP_OUTCOME " + s);
  console.log(`TRIAGE_TAP_ABSENT_UNATTRIBUTED=${tapShapeRows["absent-unattributed"].length}（同一个 absent 读数，但该类名只活在组件自己的编译文件里、且本腿对组件作用域从来没有一次 present ⇒ "静息态真没有"与"页面作用域查询进不到组件内部"两个假设这一腿分不开：命名 ≠ 结案，欠一次正向对照〔拿一个组件内无条件渲染的类名做对照探针〕，先证明载具够得到，再谈判据前置）`);
  for (const s of tapShapeRows["absent-unattributed"]) console.log("  TAP_UNATTRIBUTED " + s);
  console.log(`TRIAGE_TAP_NO_TARGET_SELECTOR=${tapShapeRows["no-class"].length}（r-exec-ws.mjs:376：探针根本没跑，observed 自带 (action 无类名) ⇒ 与 r-exec-cli 的「没点名可交互元素」同一笔债，落 SKIPPED-vague-action：缺的是判据，不是产品缺陷也不是测量结果）`);
  for (const s of tapShapeRows["no-class"]) console.log("  TAP_NO_TARGET_SELECTOR " + s);
  console.log(`TRIAGE_TAP_DENY=${tapShapeRows["deny"].length}（:373 命中不可逆清单、observed 自带 deny-tap ⇒ 同一笔"保住共用会话"的债，落 SKIPPED-deny-irreversible，与 r-exec-cli 的「交互禁触」同一个桶）`);
  for (const s of tapShapeRows["deny"]) console.log("  TAP_DENY " + s);
  console.log(`TRIAGE_TAP_PROBE_NO_ANSWER=${tapShapeRows["probe-no-answer"].length}（:381 元素探针无答案 ⇒ 通道未就绪、静息态没量到，欠重跑；SKIPPED-tap-probe-no-answer）`);
  for (const s of tapShapeRows["probe-no-answer"]) console.log("  TAP_PROBE_NO_ANSWER " + s);
  console.log(`TRIAGE_TAP_DISPATCH_FAIL=${tapShapeRows["dispatch-fail"].length}（:388 探针说 present 却 tap 不确认 ⇒ 复用 SKIPPED-interact-channel：通道/选择器问题，须人判）`);
  for (const s of tapShapeRows["dispatch-fail"]) console.log("  TAP_DISPATCH_FAIL " + s);
  console.log(`TRIAGE_TAP_NO_FRAME=${tapShapeRows["no-frame"].length}（:398 点下去了却没帧 ⇒ 复用 SKIPPED-frame-evidence-hole，并照旧进证据缺口否决，命名不结案）`);
  for (const s of tapShapeRows["no-frame"]) console.log("  TAP_NO_FRAME " + s);
  console.log(`TRIAGE_WS_ROUTE_NO_ANSWER=${tapShapeRows["ws-route-no-answer"].length}（r-exec-ws.mjs:665，不在那六行里、真数据里多出来的第七种形状：WS currentPage() 没给结果 ⇒ 复用 SKIPPED-route-probe-no-answer；只有该行 rowMeasured===false 才认，带取证就判红）`);
  for (const s of tapShapeRows["ws-route-no-answer"]) console.log("  WS_ROUTE_NO_ANSWER " + s);
  console.log(`TRIAGE_TAP_CONTROL_SELECTORS=${CONTROL_SEL.size}（本语料里答过 present(N) 或被成功 tap= 下发过的选择器，就是上面归因用的正向对照名单）`);
  console.log(`TRIAGE_TAP_LEDGER_FINDINGS=${tapAbsentTotal + tapShapeRows["no-class"].length}（这两种"判据欠前置/欠点名物件"的行不在本门结案：去向应记 reports/audit/round-7/open-row-dispositions.json 的 dispositions[]〔kind=criteria_needs_tightening〕，与那 25 条真实覆盖欠账同族）`);
}
/* 未开 --tap 的交互行必须**这一腿自己数给读者看**（同 NOT_AUTOMATABLE_STAMPED / OPEN_PAGE_UNMEASURED 的规矩）：
   "切片没开 --tap ⇒ 交互没下发"是本门新增的免缺陷口径，不点名就是把一批从没被点击验证过的判点抹出账本。
   只在语料真出现这一口径时打印（别的腿判词一字不改，收尾 diff 里多出来的行必须是真信息）。 */
if (tapDeferredRows.length) {
  console.log(`TRIAGE_TAP_NOT_ENABLED=${tapDeferredRows.length}（r-exec-ws.mjs:832「action 含交互动词 ⇒ 未开 --tap，交互型留待下一刀」：本腿 TAP_MODE 关着，一条切片规则叫停了交互 ⇒ 预期未执行 —— 既不是测量结果（判点没被验证过）也不是缺陷；落 SKIPPED-observe-only-slice（与 r-exec-cli 的 observe-only 切片同一笔债，换腿不换名）。单独计数、逐条点名，不算缺陷、不算覆盖、也不写成"已由 --tap 腿认领"——本门没有核对复测腿的旗标，认领由那条腿的持有者判）`);
  console.log(`TRIAGE_TAP_NOT_ENABLED_READINGS ` + ["no-target-named", "absent", "present", "present+absent", "probe-no-answer", "probe-answered-nothing"].map((k) => `${k}=${tapDeferredReadings[k] || 0}`).join(" ") + `（合计 ${Object.values(tapDeferredReadings).reduce((a, b) => a + b, 0)}/${tapDeferredRows.length}；这些是本行自己带回来的落点+探针读数，只用来排复跑顺序：absent/present+absent 复跑 --tap 时会落到 SKIPPED-tap-target-absent-*，no-target-named 会落到 SKIPPED-vague-action，present 那批静息态就在页上、复跑能立刻点。读数不参与归类，也不构成结案）`);
  for (const s of tapDeferredRows) console.log("  TAP_NOT_ENABLED " + s);
}
/* observe-only dom 恢复必须**这一腿自己数给读者看**（同 NOT_AUTOMATABLE_STAMPED / OPEN_PAGE_* 的规矩）：
   把 dom 结论算进"能恢复出查找目标"是四格取数口径的变更，不点名就是把"体检输入从哪来"藏起来。
   domAbsent 行有声称而四格为 0 时，报告器端由 fourgrid-axis 判"提取失灵"红，不静默。 */
{
  const domAbsentRows = items.filter((it) => it.domAbsent === true);
  const domTokRows = items.filter((it) => it.tokenFrom === "observe-only-dom");
  console.log(`TRIAGE_DOM_OBSERVE_ONLY=absent声称行=${domAbsentRows.length} 由dom结论恢复出查找目标并进双载体检=${domTokRows.length}（口径=round-7 observe-only 刀：dom 段的 .x:absent 与 round-6「element not found」同一笔债，换腿不换名；只认带类名的结论，括号注释 / no-answer / ERR 不产 token；声称 absent 而四格 0 条 ⇒ 报告器按"提取失灵"判红）`);
  for (const it of domTokRows.slice(0, 8)) console.log(`  DOM_OBS_RECOVERED ${it.id} @ ${it.page} ${it.sel}（四格：${String(it.verdict || "未判").slice(0, 40)}…）`);
  if (domTokRows.length > 8) console.log(`  DOM_OBS_RECOVERED …另 ${domTokRows.length - 8} 行见 ${OUT}.json`);
}
/* 「两载皆无但已被判决表认领」必须**这一腿自己数给读者看**，而且**不受 tapShapesTotal 的门限制**：
   它是本门新增的免缺陷口径（把原来必红的一支改成具名桶），只在命中时才报数就等于
   让"这条通道今天没生效"与"今天没有这种行"两种状态读起来一样（同 NOT_AUTOMATABLE_STAMPED 的规矩）。
   来源件（判决表 / 判据台目录 + 它是显式给的还是按语料派生的）也一起打出来，
   否则下一个跑的人无从判断"没认"是表里真没有，还是表根本没读到。 */
console.log(`TRIAGE_DEAD_SELECTOR_RENAMED=${tapShapeRows["dead-selector-renamed"].length}（表=${DEAD_SEL_TABLE} 认领条目=${DEAD_SEL.size} 无 proposed 被忽略=${deadSelIgnored}｜判据台=${RENAME_OPS}${OPS_EXPLICIT ? "（显式 --ops）" : "（按语料所在轮次派生）"} 判据台条目=${OPS_RENAME.size}（其中 cellplanRename 已落地=${opsRenameLanded}）：「两载皆无」只有四把尺全过才命名 —— 表点名这一条 manifest+id、表里的 dead==本行测的类名、判据台 cellplanRename 真从这个名字改走且 to/tapTarget==表里的 proposed、proposed 在 dist 或 src 查得到；任一不过照旧落「臆造选择器，须人判」红。命名不等于结案：欠按 proposed 复跑）`);
for (const s of tapShapeRows["dead-selector-renamed"]) console.log("  TAP_DEAD_SEL_RENAMED " + s);
console.log(`out=${OUT}.md / ${OUT}.json`);

/* 两条"发现级"断言放在**写盘之后**，且先收集再一次性退出：
   词表漂移（执行器说了本脚本没学过的话）与新增落地对（没人 booking 复测腿）都必须把门禁推红，
   但红之前报告要已经落盘 —— 否则下一个人只看到一个数字，还得重跑一遍才知道是哪几条。 */
if (unclassified) {
  markProblem(`有 ${unclassified} 行没落进具名桶（词表漂移或取证缺陷），须补分类而不是接受兜底桶：\n  ${unclassifiedRows.slice(0, 25).join("\n  ")}${unclassifiedRows.length > 25 ? `\n  …另 ${unclassifiedRows.length - 25} 行见 ${OUT}.json` : ""}`);
}
if (landingMissing.length) {
  markProblem(`有 ${landingMissing.length} 组落地对没有 booked 复测腿/裁决（须进 guest-landing-policy.json 或补 LANDING_DISPOSITION）：\n  ${landingMissing.join("\n  ")}`);
}
/* 复测腿账本与本轮债必须同成员：账本写"这腿替 CH01…CH27 说话"，
   而本轮该组实测成员变了（用例增删/落点变了）时，那条腿量的是另一笔债，不能替这批行结案。 */
if (coverMismatch.length) {
  markProblem(`复测腿与债不同源（${coverMismatch.length} 组）：\n  ${coverMismatch.join("\n  ")}`);
}
/* 开页重试耗尽的"带取证"那一支自己否决：给它起个桶名只是为了不和零取证那一支混在同一个数里，
   绝不是让它过门 —— 一行量到了落点/探针/帧却又报"页面开不起来"，要么是真页面缺陷、要么是执行器自相矛盾，
   两种都必须有人来看。零取证那一支不在这里否决（它欠的是一次重跑；整批都零取证时批次级 WSX_ADMISSIBLE=no
   那道门会自己红），但它的名单在上面的 OPEN_PAGE_UNMEASURED 里逐条公开、在 .json 里逐条可查。 */
if (openPageMeasuredRows.length) {
  markProblem(`有 ${openPageMeasuredRows.length} 行 open_page 重试耗尽却带取证（rowMeasured===true）⇒ 不能算"通道没起来"，须按页面级缺陷/执行器自相矛盾逐条人判：\n  ${openPageMeasuredRows.slice(0, 25).join("\n  ")}${openPageMeasuredRows.length > 25 ? `\n  …另 ${openPageMeasuredRows.length - 25} 行见 ${OUT}.json` : ""}`);
}
/* 证据缺口单独否决：这些行已经"有名字"了，如果命名就算归类成功，那给每个洞起个名字就能把门刷绿。 */
if (evidenceHoles.length) {
  markProblem(`有 ${evidenceHoles.length} 条要求出帧却没拿到可用帧、探针也没给出有效答案 ⇒ 证据缺口，命名不等于结案：\n  ${evidenceHoles.slice(0, 25).join("\n  ")}${evidenceHoles.length > 25 ? `\n  …另 ${evidenceHoles.length - 25} 条见 ${OUT}.json` : ""}`);
}
const openRulings = landingKeys.filter((k) => /^未结案/.test(dispositionOf(k) || ""));
/* 红的那一次也要把"未结案"的组数打出来：这些是已归类但**没结案**的行，
   如果只在绿的时候报，读者永远看不到它们（而它们正是本门要往外送的东西）。 */
console.log(`TRIAGE_OPEN 未结案的落地对=${openRulings.length} 证据缺口=${evidenceHoles.length}（处置来源：复测腿账本 ${Object.keys(bookedText).length} 组 / 手写表 ${landingKeys.filter((k) => !bookedText[k] && LANDING_DISPOSITION[k]).length} 组）`);
/* 这条落地对轴到底"有权判谁"，必须自己说清楚：以前只印 landingMissing，读者无从知道
   那 5 组是产品没处置，还是语料压根没告诉我们是游客 —— 这两种红的处置人完全不同。 */
console.log(`TRIAGE_LANDING_SCOPE= 落地对总组数=${landingKeys.length} 可归属组=${landingAdjudicable} 身份未声明组=${landingUndeclared.length}（读数 LANDING_IDENTITY_UNDECLARED=${landingUndeclared.length}）判红组=${landingMissing.length} UNVERIFIED-INSTRUMENT=${landingUndeclared.length ? "yes" : "no"}`);
for (const k of landingUndeclared) console.log(`  LANDING_IDENTITY_UNDECLARED ${k}（该组 ${landingGroups[k].length} 行，无一声明 identity ⇒ 本轴不判，也不得当作结案）`);
for (const k of openRulings) console.log(`  OPEN_RULING ${k}（${landingGroups[k].length} 条）：${dispositionOf(k)}`);
if (corpusIsPartialSlice) console.log(`TRIAGE_SLICE_AXIS=partial（--real-cases-only 语料）不比成员的组数=${coverSliceSkips.length}；这些组仍须被复测腿认领，缺认领照旧判缺（见 TRIAGE_OPEN）`);
for (const s of coverSliceSkips) console.log(`  COVER_SLICE_SKIP ${s}`);
for (const s of coverIdentitySkips) console.log(`  COVER_SKIP ${s}`);
if (gateProblems.length) {
  console.log(`TRIAGE_RESULT=FAIL problems=${gateProblems.length}`);
  for (const p of gateProblems) console.log("  ✗ " + p);
  process.exit(2);
}
/* 结案口径那句：只有本腿真出现这些"命名了但不结案"的口径时才追加，别的语料判词一字不改
   （收尾 diff 里多出来的行必须是真信息，不是措辞抖动）。 */
const notClosedClauses = [];
if (openPageUnmeasuredRows.length) notClosedClauses.push(`${openPageUnmeasuredRows.length} 行开页重试耗尽且零取证（OPEN_PAGE_UNMEASURED，欠一次重跑）`);
if (tapDeferredRows.length) notClosedClauses.push(`${tapDeferredRows.length} 行交互判点未开 --tap（TRIAGE_TAP_NOT_ENABLED，欠一条 --tap 复测腿逐行认领）`);
if (tapShapeRows["dead-selector-renamed"].length) notClosedClauses.push(`${tapShapeRows["dead-selector-renamed"].length} 行按改名前的死选择器测（TRIAGE_DEAD_SELECTOR_RENAMED，欠按判决表的 proposed 目标、带它写的 prestate 前置复跑一次；本轮读数对当前判据无效）`);
const openPageClause = notClosedClauses.length
  ? `、${notClosedClauses.join("、")} —— 这些都不计入结案`
  : " —— 这两类不计入结案";
console.log(`TRIAGE_GATE=PASS unclassified=0 landingGroups=${landingKeys.length} 全部有处置；但其中 ${openRulings.length} 组处置本身写着"未结案"、${evidenceHoles.length} 条证据缺口${openPageClause}`);
