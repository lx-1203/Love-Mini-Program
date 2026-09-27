/**
 * 判据里点名的选择器，在被测产物里到底存不存在（v3.2 配套工具，只读）。
 *
 * 为什么要它：本轮两次独立撞到同一件事——
 *   · 复核员报告：登录页多条判据带着 tapTarget ".input-field"，真机 no such element（表单在 v-else 里）；
 *     另外 .sms-send-btn 早已被改名成 .sms-btn，判据还在点旧名。
 *   · 用源码做基准的普查给出"55 个裸类名一个都不存在"的结论，一查发现是我拿错了基准：
 *     类名多数住在子组件与样式文件里，页自己的 .vue 里没有 ≠ 产物里没有。
 * 合起来一句话：判据正文里的类名从未按**被测产物**核对过，"点名了"与"点得到"是两件事。
 *
 * 为什么以编译产物（.wxml/.wxss）为准而不是源码：执行器在模拟器里点的是构建出来的模板，
 * 源码里有、产物里没有（被 v-if 挡、被改名、忘了重新构建）都会点空。
 * 也不以 .wxss 为准：样式里有这个类名只说明"设计过它"，不说明"渲染树里有这么个可点元素"，
 * 所以只在样式里出现的（styleOnly）与完全找不到的（absent）一并判红。
 *
 * 轴：
 *   pageWxmlExact  该页自己的 wxml 里，class 属性 token 含这个名（静态类名与 {{ a ? 'x--y' : '' }}
 *                  里的条件类名都算 token 命中——本门只回答"这个名字是不是这一页模板发出来的东西"）
 *   pageWxmlText   该页 wxml 文本里出现该名字，但不在 class token 里（如 :class 绑对象键、data-*）
 *   bandWxmlOther  别的 wxml 里出现（多半是子组件，也可能串到别的页 ⇒ 单列不判红）
 *   styleOnly      只有 wxss 里有 ⇒ 判红（样式 ≠ 可点元素）
 *   absent         整档都找不到 ⇒ 判红（编造的或已删除的）
 * 已知限界：这一门抓不到"名字在模板里但当前态没渲染出来"（v-if / v-else 挡掉的表单就是这一类，
 * 本轮登录页 .input-field 就栽在这里）。那要真机 DOM 读数才判得了，归执行器的 reststate-absent 桶。
 *
 * 用法：node scripts/qa/verify-case-selectors-exist.mjs [--ops 目录] [--band apps/client/dist/build/mp-weixin]
 *                                                        [--max-samples 12] [--selftest]
 * 退出码：0=没有 styleOnly/absent；1=有；2=前置件缺失或扫描集为空（宁可红也不空过）。
 */
import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { tmpdir } from "node:os";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
/* 同上：`--band` 拼错就是扫了默认那一档然后把结论当成被测档的结论 —— 直接 exit 2。 */
const KNOWN_FLAGS = ["ops", "band", "max-samples", "selftest"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN_FLAGS.includes(a.slice(2)));
  if (bad.length) {
    console.log(`SEL_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 本门只认 ${KNOWN_FLAGS.join(",")}（回落默认档会把另一档的结论当成被测档的）`);
    process.exit(2);
  }
}

/* 判红轴与消费者同一份实现：不再自己抄一遍正则（"门按动词紧邻判、执行器按整句抠"就是两套口径分家的样子），
   而是把 r-exec-cli 的 classesOf 函数体 eval 出来用。取不到或抠样不符 ⇒ exit 2，宁红不假绿。 */
const execTokens = (() => {
  const src = readFileSync(join(REPO, "scripts", "qa", "r-exec-cli.mjs"), "utf8");
  const at = src.indexOf("function classesOf(");
  const rest = at < 0 ? "" : src.slice(at);
  const close = rest.indexOf(String.fromCharCode(10) + "}");
  const fnSrc = close > 0 ? rest.slice(0, close + 2).trim() : "";
  if (!fnSrc.startsWith("function classesOf(")) { console.log("SEL_RESULT=FAIL reason=取不到执行器 classesOf ⇒ 判红轴无法对齐（不许回落到本门自己那套正则）"); process.exit(2); }
  const fn = eval("(" + fnSrc + ")");
  if (typeof fn !== "function" || fn("点 .save-btn 一下").join() !== ".save-btn" || fn("点 .chip").length !== 0) {
    console.log("SEL_RESULT=FAIL reason=classesOf 抠样不符 ⇒ 口径来源变了，本门结论不可用"); process.exit(2);
  }
  return (t) => fn(String(t || ""));
})();
/* "这条用例到底会不会被点"也不能自己发明：执行器用的是它自己的 TAP_RE（:106，中文动词表，
   没有裸"点"、也没有英文 tap/click —— 第一版我在这儿写了更宽的词表，于是把
   emit('searchTap') 那种幽灵入口断言又误伤成判红，正是本门当初修正过的那个老毛病）。
   所以照样从执行器源码里把那条正则取出来用；取不到就 exit 2。 */
const TAP_VERB = (() => {
  const src2 = readFileSync(join(REPO, "scripts", "qa", "r-exec-cli.mjs"), "utf8");
  const key = "const TAP_RE = /";
  const p = src2.indexOf(key);
  if (p < 0) { console.log("SEL_RESULT=FAIL reason=取不到执行器的 TAP_RE ⇒ 判红轴无法对齐（不许退回本门自己那套动词表）"); process.exit(2); }
  const line = src2.slice(p + key.length - 1).split(String.fromCharCode(10))[0].trim();
  const end = line.lastIndexOf("/");
  if (!line.startsWith("/") || end <= 0) { console.log("SEL_RESULT=FAIL reason=TAP_RE 那一行读成了 " + JSON.stringify(line.slice(0, 40))); process.exit(2); }
  return new RegExp(line.slice(1, end));
})();
const BEM_RE = /\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__|--)[a-z0-9_-]+)/g;
const BARE_RE = /\.([a-z][a-z0-9]*(?:-[a-z0-9]+)+)/g;
const classesOf = (t, re) => { const s = new Set(); for (const m of String(t || "").matchAll(re)) s.add("." + m[1]); return [...s]; };

function walkFiles(root, re) {
  const out = [];
  const dir = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      const st = statSync(p);
      if (st.isDirectory()) dir(p);
      else if (re.test(n)) out.push(p);
    }
  };
  if (existsSync(root)) dir(root);
  return out;
}
/* class="a b {{ x ? 'y--z' : '' }}" → 先取属性值，再按空白切 token；
   条件是字符串时会切出 "'y--z'" 这种带引号的碎片，所以 token 与"整段文本里出现过该名字"两条都留。 */
function parseTemplate(text) {
  const tokens = new Set();
  for (const m of text.matchAll(/class\s*=\s*"([^"]*)"/g)) for (const t of m[1].split(/\s+/)) if (t) tokens.add(t.replace(/^['"]|['"]$/g, ""));
  return { tokens, lower: text };
}

function runScan(OPS, BAND) {
  const wxml = walkFiles(BAND, /\.wxml$/i).map((f) => ({ f: relative(BAND, f).split(sep).join("/"), ...parseTemplate(readFileSync(f, "utf8")) }));
  const wxss = walkFiles(BAND, /\.wxss$/i).map((f) => ({ f: relative(BAND, f).split(sep).join("/"), text: readFileSync(f, "utf8") }));
  if (!wxml.length) { console.log(`SEL_RESULT=FAIL reason=被测档里没有任何 .wxml：${BAND}（不得空过）`); process.exit(2); }
  const opsFiles = readdirSync(OPS).filter((x) => x.endsWith(".json"));
  if (!opsFiles.length) { console.log(`SEL_RESULT=FAIL reason=判据台目录里没有 .json：${OPS}`); process.exit(2); }
  const ax = { pageWxmlExact: [], pageWxmlText: [], bandWxmlOther: [], runtimeComposed: [], styleOnly: [], absent: [] };
  let cases = 0, totalSelectors = 0;
  for (const f of opsFiles) {
    let mf; try { mf = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch { continue; }
    for (const c of mf.cases || []) {
      cases++;
      const named = [...new Set([
        ...execTokens(c.action), ...execTokens(c.expected),
        ...(String(c.tapTarget || "").trim() ? [String(c.tapTarget).trim()] : []),
      ])].filter((s) => /^\.[\w-]+$/.test(s));
      const pageDir = String(c.page || "").replace(/^\/+/, "").split("/").slice(0, -1).join("/");
      /* 判红的轴必须与消费者的行为同轴：执行器只会去点 tapTarget 与 action 里抠出的类名。
         只在 expected 文案里提一句的名字、或"这里不该有这个元素"的幽灵断言（H13 就是普查首页
         无搜索入口），都不在它点得到/点不到 judgement 范围内——它们仍然打印（陈旧引用要看得见），
         但不否决收尾。第一版我把 1870 个名字一视同仁判红，等于让门管了不归它管的事。 */
      /* "这条判据是不是要点它"不能靠整句扫动词——实测两种错法都发生了：
           · 扫到 searchTap 里的 "tap" ⇒ 把 H13（结论是"首页无搜索入口"的幽灵断言）判成要点；
           · 词表只认"点击" ⇒ 漏掉 LG29 的"手机号留空点 .sms-send-btn"。
         改成**动词紧邻类名**这条窄判据：动词与 .class 之间只允许空白/冒号。
         既不相邻、又不是 tapTarget 的死名 ⇒ 记「提示（归属未定）」并逐条打印，不静默放过。 */
      const tapped = new Set();
      const ttRaw = String(c.tapTarget || "").trim();
      if (ttRaw) tapped.add(ttRaw);
      /* 执行器在"这条含交互动词"的前提下会把 action 里**所有**抠得出的类名当目标，
         所以本门的判红轴也要跟着全量走；没有交互动词的用例（"这里不该出现 X"那种幽灵入口断言）
         仍然只有动词紧邻的名字才算它要点的东西 —— 否则就是把断言本身判反。 */
      /* 执行器现在会先看 ops 的 automatable 章（r-exec-cli 的 notAutomatableSkip）⇒ 盖了章的行
         它根本不发交互，本门也就不该再拿"点不到"去判红它。这条对齐要**有证据**：
         执行器里没有那个消费者就直接 exit 2，不许本门单方面记成"不算数"（口径分家就是假绿）。
         结果 memo 在 globalThis 上，避免每条用例重读一次源码。 */
      if (globalThis.__selNotAutoConsumer === undefined) {
        const sExec = readFileSync(join(REPO, "scripts", "qa", "r-exec-cli.mjs"), "utf8");
        globalThis.__selNotAutoConsumer = /notAutomatableSkip\(c\)/.test(sExec) && /c\.automatable !== false/.test(sExec);
        if (!globalThis.__selNotAutoConsumer) { console.log("SEL_RESULT=FAIL reason=执行器里找不到「盖章不可自动化 ⇒ 跳过」这条消费者 ⇒ 本门不许按旧口径把盖章行判红（先接消费者，再谈降轴）"); process.exit(2); }
      }
      const willTap = TAP_VERB.test(String(c.action || "")) && c.automatable !== false;
      const actionNames = new Set(execTokens(c.action));
      if (willTap) for (const n of actionNames) tapped.add(n);
      /* 这条窄轴（动词紧邻类名）以前**无条件**加名，于是盖章过的行（automatable:false）
         还会被它拖进判红：执行器对盖章行根本不发交互，"点不到"就不成立。
         两条加名路径现在共用同一个 willTap 前置。 */
      if (c.automatable !== false) for (const m of String(c.action || "").matchAll(/(点击|点一下|点|按下|长按|双击|输入|填入|填|勾选|滑动|滚动|拖动|下拉|聚焦|失焦|(?:^|[^a-z])(?:tap|click|input|scroll|swipe|trigger)(?![a-z]))[：:\s]*(\.[\w-]+)/gi)) tapped.add(m[2]);
      for (const cls of named) {
        totalSelectors++;
        const name = cls.slice(1);
        /* "这页有没有这个名字"必须按**这一页的 wxml 文件**判，不能按目录前缀判：
           按目录判会让同目录的兄弟页冒充"本页有"（只读复判实测 CX16/CX30 的 .reply-input 真身在
           campus/topic-detail.wxml，字面 .post-image 只在 village/post.wxml）⇒ 名字其实点不到却算"页内精确"。 */
        const pageFile = String(c.page || "").replace(/^\/+/, "");
        const inPage = (pred) => wxml.some((b) => pageFile && b.f === pageFile + ".wxml" && pred(b));
        const anywhere = (pred) => wxml.some((b) => pred(b));
        const rec = {
          cls, manifest: f.replace(/\.json$/, ""), id: c.id, page: c.page || "",
          via: String(c.tapTarget || "").trim() === cls ? "tapTarget" : "正文",
          blocking: tapped.has(cls) ? 1 : 0,
        };
        /* 运行期拼出来的名字（.length-1 这类以数字/下标结尾）：模板里不可能出现整串，
           只能验词根。词根在该页 wxml 里 ⇒ 归 runtimeComposed，看得见但不判红。 */
        const stem = name.replace(/[-_]?\d+$/, "");
        if (stem !== name && inPage((b) => b.lower.includes(stem))) { ax.runtimeComposed.push(rec); continue; }
        if (inPage((b) => b.tokens.has(name))) ax.pageWxmlExact.push(rec);
        else if (inPage((b) => b.lower.includes(name))) ax.pageWxmlText.push(rec);
        else if (anywhere((b) => b.tokens.has(name) || b.lower.includes(name))) ax.bandWxmlOther.push(rec);
        else if (wxss.some((b) => b.text.includes(name))) ax.styleOnly.push(rec);
        else ax.absent.push(rec);
      }
    }
  }
  return { cases, totalSelectors, ax };
}

/* ---------- selftest：负例必须真的能红，正例必须真的能绿 ---------- */
if (has("selftest")) {
  const T = mkdtempSync(join(tmpdir(), "selgate-"));
  const ops = join(T, "ops"), pageDir = join(T, "band", "pages", "demo"), compDir = join(T, "band", "components"), styDir = join(T, "band", "styles");
  mkdirSync(pageDir, { recursive: true }); mkdirSync(compDir, { recursive: true }); mkdirSync(styDir, { recursive: true }); mkdirSync(ops, { recursive: true });
  writeFileSync(join(ops, "PAGES-DEMO.json"), JSON.stringify({ cases: [
    { id: "D1", page: "pages/demo/index", action: "点击 .real-btn 按钮", expected: "出现 .ghost-btn 文案" },
    { id: "D2", page: "pages/demo/index", action: "读取 .elsewhere-chip 的文本", expected: "x" },
    { id: "D3", page: "pages/demo/index", action: "什么类名都没写", expected: "落点正确" },
    { id: "D4", page: "pages/demo/index", action: "点击 .cond-state 与 .only-style", expected: "y" },
    { id: "D5", page: "pages/demo/index", action: "点击 .gone-btn 后应弹层", expected: "弹层出现" },
    { id: "D6", page: "pages/demo/index", action: "点击 .count-3 徽标", expected: "计数 +1" },
    { id: "D7", page: "pages/demo/index", action: "普查是否存在搜索入口（DOM 探测 .search-ghost），并 emit('searchTap')", expected: "结论：首页无搜索入口" },
    { id: "D8", page: "pages/demo/index", action: "手机号留空点 .sms-ghost 一次", expected: "toast 手机号非法" },
  ] }, null, 1));
  writeFileSync(join(pageDir, "index.wxml"), '<view class="real-btn {{ agreed ? \'cond-state\' : \'\' }} count-{{ n }}">在</view>');
  writeFileSync(join(compDir, "other.wxml"), '<view class="elsewhere-chip">在别处</view>');
  writeFileSync(join(styDir, "demo.wxss"), ".only-style { color: red }");
  const { ax, totalSelectors } = runScan(ops, join(T, "band"));
  const hasCls = (bucket, c) => ax[bucket].some((x) => x.cls === c);
  const recOf = (bucket, c) => (ax[bucket].find((x) => x.cls === c) || {});
  const deadAll = [...ax.styleOnly, ...ax.absent];
  rmSync(T, { recursive: true, force: true });
  const bad = [];
  if (totalSelectors !== 9) bad.push(`选择器总数应为 9（real-btn、ghost-btn、elsewhere-chip、cond-state、only-style、gone-btn、count-3、search-ghost、sms-ghost），实为 ${totalSelectors}`);
  if (recOf("absent", ".search-ghost").blocking !== 0) bad.push("D7 的 .search-ghost 被判红 ⇒ 整句扫动词的老毛病回来了（emit('searchTap') 里的 tap 会误伤幽灵入口断言）");
  if (recOf("absent", ".sms-ghost").blocking !== 1) bad.push("D8 的 .sms-ghost 没被判红 ⇒ 光秃秃一个「点 .x」没被认成点击腿，真点不动的判据会被放过去");
  if (!hasCls("pageWxmlExact", ".real-btn")) bad.push(".real-btn 在页内 wxml 的 class 里却没进 pageWxmlExact ⇒ 正例判红，本门不可信");
  if (!hasCls("pageWxmlExact", ".cond-state")) bad.push(".cond-state 是 {{}} 里的条件类名，token 切分应认出来却没进 pageWxmlExact ⇒ 模板解析漏了条件类名");
  if (!hasCls("absent", ".ghost-btn")) bad.push("产物里根本没有的 .ghost-btn 没进 absent ⇒ 负例不成立，本门永远绿");
  if (recOf("absent", ".ghost-btn").blocking !== 0) bad.push(".ghost-btn 只出现在 expected 文案里却被判红 ⇒ 门的轴管到了执行器不点的东西（幽灵入口断言会被误杀）");
  if (!hasCls("absent", ".gone-btn")) bad.push("点击腿点名却不存在的 .gone-btn 没进 absent ⇒ 真正该否决的点不动判据漏了");
  if (recOf("absent", ".gone-btn").blocking !== 1) bad.push(".gone-btn 是 action 里带点击动词点名的目标，blocking 却是 0 ⇒ 判红轴失效，本门退化成只打印");
  if (!hasCls("bandWxmlOther", ".elsewhere-chip")) bad.push(".elsewhere-chip 在子组件 wxml 里却没进 bandWxmlOther ⇒ 全档扫描没生效");
  if (!hasCls("styleOnly", ".only-style")) bad.push(".only-style 只在 wxss 里却没进 styleOnly ⇒ 「样式里有」被当成了「元素存在」");
  if (!hasCls("runtimeComposed", ".count-3")) bad.push(".count-3 是 count-{{n}} 拼出来的，词根在页内 wxml 里却没进 runtimeComposed ⇒ 运行期拼名会被误判成编造");
  if (!deadAll.some((x) => x.blocking === 0) || !deadAll.some((x) => x.blocking === 1)) bad.push("deadAll 里判红/只提示两种都没样本 ⇒ 分轴断言其实是空跑");
  const good = ax.pageWxmlExact.length + ax.pageWxmlText.length + ax.bandWxmlOther.length + ax.runtimeComposed.length;
  if (good + deadAll.length !== totalSelectors) bad.push(`夹具内分桶不守恒 good=${good} dead=${deadAll.length} total=${totalSelectors}`);
  console.log(`SEL_SELFTEST 选择器=${totalSelectors} pageExact=${ax.pageWxmlExact.length} pageText=${ax.pageWxmlText.length} bandOther=${ax.bandWxmlOther.length} 拼名=${ax.runtimeComposed.length} styleOnly=${ax.styleOnly.length} absent=${ax.absent.length} 判红=${deadAll.filter((x) => x.blocking).length} 提示=${deadAll.filter((x) => !x.blocking).length} 结果=${bad.length ? "FAIL" : "PASS"}`);
  for (const b of bad) console.log("  BAD " + b);
  process.exit(bad.length ? 1 : 0);
}

const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const BAND = resolve(REPO, arg("band", "apps/client/dist/build/mp-weixin"));
if (!existsSync(OPS) || !existsSync(BAND)) { console.log(`SEL_RESULT=FAIL reason=前置目录缺失 ops=${existsSync(OPS)} band=${existsSync(BAND)}`); process.exit(2); }
const { ax, totalSelectors, cases } = runScan(OPS, BAND);
if (!totalSelectors) { console.log("SEL_RESULT=FAIL reason=一个选择器都没抠到 ⇒ 抠法或判据形状变了，本门不可信（不得空过）"); process.exit(2); }
const MAXS = Number(arg("max-samples", "12"));
const dead = [...ax.styleOnly, ...ax.absent];
const blocking = dead.filter((x) => x.blocking);
const advisory = dead.filter((x) => !x.blocking);
const red = blocking.length;
const good = ax.pageWxmlExact.length + ax.pageWxmlText.length + ax.bandWxmlOther.length + ax.runtimeComposed.length;
console.log(`SEL cases=${cases} selectors=${totalSelectors} 页内精确=${ax.pageWxmlExact.length} 页内文本(条件类名)=${ax.pageWxmlText.length} 别处 wxml=${ax.bandWxmlOther.length} 运行期拼名=${ax.runtimeComposed.length} 只在样式=${ax.styleOnly.length} 全无=${ax.absent.length} 守恒=${good + dead.length === totalSelectors ? "yes" : "NO（有选择器没落到任何桶）"}`);
if (good + dead.length !== totalSelectors) { console.log("SEL_RESULT=FAIL reason=分桶不守恒，统计口径漏条"); process.exit(2); }
console.log(`SEL_SPLIT 死名=${dead.length} 判红(执行器真会去点的)=${blocking.length} 只提示(文案提及/幽灵入口断言/非点击腿)=${advisory.length}`);
/* 作用域轴（本轮实测出来的，不是猜的）：名字只在**别的** wxml 里（组件自己的模板）时，
   页面作用域的元素查询进不去。两份完整 corpus（exec-guest-real-final、exec-A-real，n=630 行带 tapTarget）实测
   "找不到元素"率：只在组件里 116/128=90.6%，只在页面自己的 .vue 里 150/434=34.6%，两处都有 22/68=32.4%。
   ⇒ bandWxmlOther 不能读成"没问题"，它是下一批点不动的候选清单（不判红，因为通道换到 WS 那条腿就能点）。 */
const componentScoped = ax.bandWxmlOther.length;
console.log(`SEL_SCOPE 页内可点=${ax.pageWxmlExact.length + ax.pageWxmlText.length} 只在别处 wxml(组件作用域，CLI 腿实测 90.6% 点不动)=${componentScoped} 运行期拼名=${ax.runtimeComposed.length}`);
for (const x of ax.bandWxmlOther.slice(0, MAXS)) console.log(`  SEL_COMPONENT_SCOPE ${x.manifest}#${x.id} ${x.cls} —— 需换 WS 腿或改点页面自有节点`);
if (componentScoped > MAXS) console.log(`  SEL_COMPONENT_SCOPE …另 ${componentScoped - MAXS} 条未逐条打印（--max-samples 放大）`);
for (const [tag, list] of [["SEL_STYLE_ONLY", ax.styleOnly], ["SEL_ABSENT", ax.absent]]) {
  const byCls = new Map();
  for (const a of list) byCls.set(a.cls, (byCls.get(a.cls) || 0) + 1);
  for (const [c, n] of [...byCls.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAXS)) console.log(`  ${tag} ${c} 被 ${n} 条判据点名`);
  for (const a of list.slice(0, MAXS)) console.log(`  ${tag}_ROW ${a.manifest}#${a.id} page=${a.page} via=${a.via} ${a.cls} ${a.blocking ? "判红" : "只提示"}`);
  if (list.length > MAXS) console.log(`  ${tag} …另 ${list.length - MAXS} 行未逐条打印（--max-samples 放大）`);
}
console.log(red
  ? `SEL_RESULT=FAIL 执行器会点却点不到=${red}/${totalSelectors} ⇒ 这些判据的目标在被测产物里不成元素（陈旧改名或当初编的），须改到真名或换成源码级判点；另有 ${advisory.length} 条只提示不否决。`
  : `SEL_RESULT=PASS 执行器要点的选择器全部在被测档里有对应元素（另有 ${dead.length} 条只提示：文案提及或幽灵入口断言，不构成点不动）`);
process.exit(red ? 1 : 0);
