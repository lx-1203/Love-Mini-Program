/* 能力原语模块（capability 车道 2026-10-06）：C1 nativeModal 驱动 / C2 逐例配方+可回滚夹具 /
   C3 networkFault 注入 / C4 WS 通道声明 / C5 多步 nav 定序 —— 的**纯函数与载荷源**。
 *
 * 为什么独立成模块：判点逻辑（解析/裁决/注记）与设备驱动必须同一份代码被离线自测覆盖
 * （先例：exec-network-observe.mjs 的三态裁决；r-exec-cli.mjs:68「判点逻辑抄第二份，
 * 离线测试验的就是那份抄本」）。本模块不 import 任何设备工具、不碰租约 —— 设备侧调用点
 * 只在 r-exec-ws.mjs（WS 腿）与 r-exec-cli.mjs（pullDown 载荷，C6）。
 *
 * 设备事实（2026-10-06 四根探针在 real@f0677920 窗上逐一实测，见 reports/audit/round-7/
 * capability-closure-2026-10-06.md §1）：
 *   · 上下文里 **任何 `uni` 记号（含 typeof）都让 evaluate 报 "ERR uni is not defined"**
 *     —— 这正是 VB03 腿 pullDown=error、CLI --net-count install 报错的同一根因；
 *     所以本模块全部载荷只用 wx.* / getCurrentPages / require('common/vendor.js')（应用侧
 *     uni 门面 Fr 的模块路径），一个 uni 记号都不许出现（有负例自测钉住）。
 *   · App.mockWxMethod 拦得到应用侧调用：应用代码经 vendor.js 的 Proxy 门面（Fr）在**访问时**
 *     才读 n[i]（n=Hi() 快照对象 = globalThis.wx 同一对象）⇒ mock 落在 wx 上即被应用读到
 *     （探针2：APP_RESULT confirm=true / APP_REQ statusCode=500）。
 *   · mockWxMethod 的**函数式** mock 在应用侧执行：收原始参数、可记账、可回脚本化答案（探针4）。
 *   · r1-exec.cjs:278-299 的 toast 钩子在 mini.evaluate（AppService 上下文）下 installed 且收流（探针4）。
 */

/* ─────────────────────────── C1 nativeModal 驱动 ───────────────────────────
 * 配方形状（case-recipes.json 的 modalScript）：
 *   { "showModal": { "answers": [{ "confirm": false }, { "confirm": true }] },
 *     "showActionSheet": { "answers": [{ "tapIndex": 0 }] } }
 * 语义：第 N 次调用吃 answers[N-1]；调用次数超出 answers 长度时**重复最后一个**（判据的
 * "再次执行点确定"这类多轮问答可表达；超出部分不静默变成真弹层——mock 在位就永远是脚本回值）。
 * 「驱动」与「观察」分列：answers 是驱动（脚本回值），每次调用的**实参**（title/content/
 * items）被记进应用侧袋 —— drainModal 取回，行上 modalDrive 字段驱动侧、observed 记观察侧。
 */
export const MODAL_APIS = ["showModal", "showActionSheet"];

export function parseModalScript(spec) {
  if (!spec || typeof spec !== "object") return { ok: false, reason: "modalScript 缺失或不是对象" };
  const apis = Object.keys(spec).filter((k) => MODAL_APIS.includes(k));
  if (!apis.length) return { ok: false, reason: "modalScript 没有可驱动的 API（词表 " + MODAL_APIS.join("/") + "）" };
  const script = {};
  for (const api of apis) {
    const answers = spec[api] && Array.isArray(spec[api].answers) ? spec[api].answers : null;
    if (!answers || !answers.length) return { ok: false, reason: api + ".answers 缺失或为空（没有脚本化回值的 modal 驱动等于没驱动）" };
    for (const a of answers) {
      if (!a || typeof a !== "object") return { ok: false, reason: api + ".answers 里有非对象项" };
      if (api === "showModal" && typeof a.confirm !== "boolean") return { ok: false, reason: api + " 的每条回值必须带布尔 confirm（判据答的是「取消/确定」，不猜）" };
      if (api === "showActionSheet" && !Number.isInteger(a.tapIndex)) return { ok: false, reason: api + " 的每条回值必须带整数 tapIndex" };
    }
    script[api] = { answers: answers.map((a) => Object.assign({}, a)) };
  }
  return { ok: true, script, apis };
}
/* 应用侧 mock 函数源（函数式 mock：记参数 + 按 answers 序号回值）。
   字符串拼接而非模板串：载荷源要进离线负例做「不许出现 uni 记号」的断言。 */
export function modalMockSource() {
  return "function (args) { try { globalThis.__qaModalCalls = globalThis.__qaModalCalls || []; " +
    "globalThis.__qaModalCalls.push({ api: " + '"__API__"' + ", title: args && args.title, content: args && args.content, itemList: args && args.itemList, ts: Date.now() }); " +
    "var keyed = globalThis.__qaModalAnswers || {}; var entry = keyed[" + '"__API__"' + "] || {}; " +
    "var answers = Array.isArray(entry.answers) ? entry.answers : []; var n = (globalThis.__qaModalCalls || []).length - 1; " +
    "var a = answers[n] || answers[answers.length - 1] || {}; " +
    "if (" + '"showModal"' + " === " + '"__API__"' + ") { return { confirm: !!a.confirm, cancel: !a.confirm, errMsg: 'showModal:ok(mock)' }; } " +
    "return { tapIndex: (typeof a.tapIndex === 'number') ? a.tapIndex : 0, errMsg: 'showActionSheet:ok(mock)' }; } " +
    "catch (e) { return { errMsg: 'mock-err ' + e.message }; } }";
}
/* 2026-10-10 REAL-OT-06 修复：占位符在 modalMockSource 里写成 '"__API__"'（三处模板已自带双引号），
   原实现再 JSON.stringify(api) 替换 ⇒ 生成 `api: ""showModal""` 双双引号语法错误，
   应用侧实报 Uncaught Unexpected identifier 'showModal'（exec-realcov-b4 OT05 step#5 在册）。
   api 取值受 MODAL_APIS 词表约束（parseModalScript 只放行 showModal/showActionSheet），裸名替换即得合法字符串字面量。 */
export function modalArmSource(api) { return modalMockSource().split("__API__").join(String(api)); }
/* 把 answers 写进应用侧袋（mock 函数运行时读的就是这个袋；按 api 键入，多 API 共存互不顶掉）。 */
export function modalAnswersSource(script) {
  return "() => { try { globalThis.__qaModalAnswers = " + JSON.stringify(script.script || script) + "; globalThis.__qaModalCalls = []; return 'answers-armed'; } catch (e) { return 'ERR ' + e.message; } }";
}
export function modalDrainSource() {
  return "() => { try { return JSON.stringify({ calls: (globalThis.__qaModalCalls || []).splice(0) }); } catch (e) { return JSON.stringify({ calls: [], err: String(e && e.message) }); } }";
}
export function interpretModalDrain(raw) {
  const s = String(raw === undefined || raw === null ? "" : raw).trim();
  if (!s) return { calls: [], err: "取件串为空" };
  const cut = s.indexOf("{");
  try {
    const j = JSON.parse(cut >= 0 ? s.slice(cut) : s);
    return { calls: Array.isArray(j.calls) ? j.calls : [], err: j.err ? String(j.err) : "" };
  } catch (e) { return { calls: [], err: "取件串解析失败:" + s.slice(0, 60) }; }
}
/* 行上「驱动」字段的取值（分列口径：modalDrive=驱动侧发生了什么，观察侧进 observed）。 */
export function modalDriveNote(script, drain, restored) {
  if (!script || !script.script) return "off";
  const apis = Object.keys(script.script);
  if (!apis.length) return "off";
  const calls = (drain && drain.calls) || [];
  return "on(armed=" + apis.join("/") + " answers=" + apis.map((a) => (script.script[a].answers || []).length).join("/") +
    " answered=" + calls.length + " restored=" + (restored ? "yes" : "NO") + ")";
}
/* 观察侧串：每次调用的实参摘要（title/content/itemList）——判据要的「弹的是哪个弹窗」就从这来。 */
export function modalObservedNote(drain) {
  const calls = (drain && drain.calls) || [];
  if (!calls.length) return "modal 观察[0 次调用]";
  return "modal 观察[" + calls.map((c, i) => "#" + (i + 1) + " " + String(c.api || "?") +
    (c.title ? "「" + String(c.title).slice(0, 30) + "」" : "") +
    (Array.isArray(c.itemList) ? " items=" + c.itemList.length : "")).join(" ") + "]";
}

/* ─────────────────────────── C3 networkFault / 慢速注入 ───────────────────────────
 * 配方形状（netFault）：
 *   { "mode": "fail-all" | "fail-url" | "record", "statusCode": 500, "data": {...},
 *     "urlIncludes": "/whispers/send" }
 * 机制（探针2/4 实测）：mockWxMethod('request', fn) 函数式 mock 在应用侧执行，拦的是 wx.request
 * 槽位；应用侧全部请求经 vendor 门面读到同一槽位 ⇒ 全量可拦。fail-url/record 两态对**不匹配**的
 * 请求透传原实现（原引用在 arm 前从 globalThis.wx 抓下存袋 —— mock 只换 wx.request 一个槽位，
 * 原函数对象仍是那个函数，调用它不递归）。慢速（timeout）以 fail + errMsg 'request:fail timeout'
 * 表达：uni.request 的超时态在本通道没有独立的"挂起 N 秒"原语，局限如实写在这里。
 */
export function parseNetFault(spec) {
  if (!spec || typeof spec !== "object") return { ok: false, reason: "netFault 缺失或不是对象" };
  const mode = spec.mode;
  if (!["fail-all", "fail-url", "record"].includes(mode)) return { ok: false, reason: "netFault.mode 必须是 fail-all|fail-url|record（收到 " + JSON.stringify(mode) + "）" };
  if (mode === "fail-url" && !String(spec.urlIncludes || "").trim()) return { ok: false, reason: "fail-url 需要 urlIncludes（不点名 URL 的失败注入等于断全站）" };
  if (mode === "record") return { ok: true, spec: { mode, statusCode: 0, data: null, urlIncludes: String(spec.urlIncludes || "") } };
  return {
    ok: true,
    spec: {
      mode,
      statusCode: Number.isInteger(spec.statusCode) ? spec.statusCode : 500,
      data: spec.data === undefined ? { qaFault: "injected" } : spec.data,
      urlIncludes: String(spec.urlIncludes || ""),
    },
  };
}
export function netFaultMockSource() {
  return "function (args) { try { var rec = { url: args && args.url, method: (args && args.method) || 'GET', ts: Date.now() }; " +
    "globalThis.__qaNetCalls = globalThis.__qaNetCalls || []; globalThis.__qaNetCalls.push(rec); " +
    "var mode = globalThis.__qaNetSpec && globalThis.__qaNetSpec.mode; var pat = globalThis.__qaNetSpec && globalThis.__qaNetSpec.urlIncludes; " +
    "var hit = !pat || String(rec.url || '').indexOf(pat) >= 0; " +
    "if (mode === 'record' || (mode === 'fail-url' && !hit)) { " +
    "  var orig = globalThis.__qaOrigRequest; if (typeof orig === 'function') { return orig.call(wx, args); } " +
    "  return { statusCode: 0, errMsg: 'request:fail qa-orig-lost' }; } " +
    "var sp = globalThis.__qaNetSpec || {}; return { statusCode: sp.statusCode || 500, data: sp.data || { qaFault: 'injected' }, errMsg: 'request:ok' }; } " +
    "catch (e) { return { statusCode: 0, errMsg: 'request:fail mock-err ' + e.message }; } }";
}
export function netFaultArmSource(spec) {
  /* 先抓原引用再写 spec：顺序不能反（反了 record 模式透传就丢了原实现）。 */
  return "() => { try { if (!globalThis.__qaOrigRequest) { globalThis.__qaOrigRequest = wx.request; } " +
    "globalThis.__qaNetSpec = " + JSON.stringify(spec) + "; globalThis.__qaNetCalls = []; return 'net-armed'; } catch (e) { return 'ERR ' + e.message; } }";
}
export function netFaultRestoreSource() {
  return "() => { try { var had = !!globalThis.__qaNetSpec; globalThis.__qaNetSpec = null; return had ? 'net-restored' : 'net-was-not-armed'; } catch (e) { return 'ERR ' + e.message; } }";
}
export function netDrainSource() {
  return "() => { try { return JSON.stringify({ calls: (globalThis.__qaNetCalls || []).splice(0) }); } catch (e) { return JSON.stringify({ calls: [], err: String(e && e.message) }); } }";
}
export function interpretNetDrain(raw) {
  const s = String(raw === undefined || raw === null ? "" : raw).trim();
  if (!s) return { calls: [], err: "取件串为空" };
  const cut = s.indexOf("{");
  try {
    const j = JSON.parse(cut >= 0 ? s.slice(cut) : s);
    return { calls: Array.isArray(j.calls) ? j.calls : [], err: j.err ? String(j.err) : "" };
  } catch (e) { return { calls: [], err: "取件串解析失败:" + s.slice(0, 60) }; }
}
export function netFaultNote(spec, drain, restored) {
  if (!spec) return "off";
  const calls = (drain && drain.calls) || [];
  return "on(mode=" + spec.mode + (spec.urlIncludes ? " url~=" + spec.urlIncludes : "") +
    (spec.statusCode ? " statusCode=" + spec.statusCode : "") +
    " intercepted=" + calls.length + " restored=" + (restored ? "yes" : "NO") + ")";
}
/* 判点辅助：拦截窗里命中某 URL 的请求条数（OT06 ④「5 次点击窗口内新增 POST /matches/like 条数」）。 */
export function countNetCalls(calls, urlIncludes) {
  return (calls || []).filter((c) => !urlIncludes || String(c.url || "").indexOf(urlIncludes) >= 0).length;
}

/* ─────────────────────────── C2 逐例配方 + 可回滚夹具 ───────────────────────────
 * 配方文件 scripts/qa/case-recipes.json：键=判据台复合 id（与 verify-real-coverage 的 key 同源）。
 * 只读前置（query/page）与夹具（fixture）分开两块；夹具必须带 teardown —— 没有回滚计划的
 * 夹具在 validateRecipes 就拒收（decisions#6 卫生裁定同向：跑完恢复原态，不留测试残留）。
 */
export function recipeFor(recipes, manifest, id) {
  if (!recipes || !recipes.recipes) return null;
  return recipes.recipes[manifest + "|" + id] || null;
}
/* 夹具计划校验（纯函数）：操作子（op）词表 via=api|store-call|store-patch|store-cleanup；
   teardown 为空 ⇒ 拒收（可回滚是硬口径）。op 字段要求：
   · api          method+path（admin:true 走后台管理员票；body/expectStatus 可选）
   · store-call   store+call（args 可选；走产品自己的 action/API 链路）
   · store-patch  store+patch（会话内状态注入）
   · store-cleanup store+arrays+byId（会话内数组摘除，byId 支持 {captured.x} 模板） */
export const FIXTURE_VIAS = ["api", "store-call", "store-patch", "store-cleanup"];
export function validateFixture(fx) {
  if (!fx || typeof fx !== "object") return { ok: true, note: "（本条配方无夹具）" };
  const setup = Array.isArray(fx.setup) ? fx.setup : [];
  const teardown = Array.isArray(fx.teardown) ? fx.teardown : [];
  if (!setup.length && !teardown.length) return { ok: false, reason: "fixture 声明了却没有一步 setup/teardown" };
  if (!teardown.length) return { ok: false, reason: "fixture 只有 setup 没有 teardown ⇒ 不可回滚的夹具不许上腿（decisions#6：跑完恢复原态）" };
  for (const op of [...setup, ...teardown]) {
    if (!op || !FIXTURE_VIAS.includes(op.via)) return { ok: false, reason: "夹具 op 缺 via 或不在词表 " + FIXTURE_VIAS.join("/") + "（收到 " + JSON.stringify(op && op.via) + "）" };
    if (op.via === "api" && (!String(op.method || "").trim() || !String(op.path || "").trim())) return { ok: false, reason: "api 夹具 op「" + String(op.name || "?") + "」必须带 method+path" };
    if (op.via === "store-call" && (!String(op.store || "").trim() || !String(op.call || "").trim())) return { ok: false, reason: "store-call 夹具 op「" + String(op.name || "?") + "」必须带 store+call" };
    if (op.via === "store-patch" && (!String(op.store || "").trim() || !op.patch || typeof op.patch !== "object")) return { ok: false, reason: "store-patch 夹具 op「" + String(op.name || "?") + "」必须带 store+patch 对象" };
    if (op.via === "store-cleanup" && (!String(op.store || "").trim() || !Array.isArray(op.arrays) || !op.arrays.length || !String(op.byId || "").trim())) return { ok: false, reason: "store-cleanup 夹具 op「" + String(op.name || "?") + "」必须带 store+arrays+byId" };
  }
  return { ok: true };
}
/* 夹具结账判点（纯函数）：回滚后必须 clean —— setup 成功而 teardown 失败=残留，行上必须看得见。 */
export function fixtureVerdict(results) {
  const setup = (results && results.setup) || [];
  const teardown = (results && results.teardown) || [];
  const setupFail = setup.filter((r) => r && r.ok === false).length;
  const teardownFail = teardown.filter((r) => r && r.ok === false).length;
  if (setupFail) return { clean: false, kind: "setup-failed", text: "夹具 setup 失败 " + setupFail + " 步 ⇒ 本条前置没有构造成功，判定不得当作「已按前置执行」" };
  if (teardownFail) return { clean: false, kind: "residue", text: "夹具 teardown 失败 " + teardownFail + " 步 ⇒ **测试残留**，须人工清理并在报告点名" };
  if (!setup.length && !teardown.length) return { clean: true, kind: "none", text: "（本条无夹具）" };
  return { clean: true, kind: "clean", text: "夹具已回滚（setup " + setup.length + " 步 / teardown " + teardown.length + " 步全成）" };
}
/* path/body 里的 {captured.x} 模板替换（纯函数；缺失占位符返回 null ⇒ 调用方报错，不许静默发空）。 */
export function expandTemplate(tpl, captured) {
  return String(tpl === undefined || tpl === null ? "" : tpl).replace(/\{captured\.([A-Za-z0-9_.]+)\}/g, (m, k) => {
    const v = k.split(".").reduce((o, p) => (o == null ? undefined : o[p]), captured || {});
    return v === undefined ? null : String(v);
  });
}
export function templateUnresolved(tpl, captured) {
  const out = [];
  String(tpl === undefined || tpl === null ? "" : tpl).replace(/\{captured\.([A-Za-z0-9_.]+)\}/g, (m, k) => {
    const v = k.split(".").reduce((o, p) => (o == null ? undefined : o[p]), captured || {});
    if (v === undefined) out.push(k);
    return m;
  });
  return out;
}

/* ─────────────────────────── C5 多步 nav 定序 ───────────────────────────
 * 配方 steps 的词表（解释器在 r-exec-ws.mjs；这里只做解析/裁决两件纯函数）。
 * 每步一个 kind；judgment 步（assert*）失败 ⇒ 行记 FAILED 并带逐步读数；驱动步失败 ⇒ 行记
 * SKIPPED+NOT_SHOOTABLE（通道欠款），二者必须分得开 —— 与 r-exec-cli 的 FAILED/SKIPPED 分界同口径。
 */
export const STEP_KINDS = ["open", "tap", "input", "readValue", "rapidTap", "callMethod", "probe", "pullDown", "stopPullDown",
  "armModal", "restoreModal", "drainModal", "armNetFault", "restoreNetFault", "drainNet",
  "shot", "wait", "assertRoute", "assertPresent", "assertAbsent", "fixture", "read"];

export function parseNavSteps(steps) {
  if (!Array.isArray(steps) || !steps.length) return { ok: false, reason: "steps 缺失或为空（多步序列至少要一步）" };
  const bad = [];
  steps.forEach((s, i) => {
    if (!s || !STEP_KINDS.includes(s.do)) bad.push("step#" + (i + 1) + " 未知 kind=" + JSON.stringify(s && s.do) + "（词表 " + STEP_KINDS.join("/") + "）");
  });
  if (bad.length) return { ok: false, reason: bad.join("；") };
  return { ok: true, steps };
}
/* 逐步裁决：route 断言取**步后路由栈顶**（routeStack 的最后一段），与 r-exec-cli routeOk 的
   includes 口径一致；期望串不命中 ⇒ 这一步的对照失败（记录实际落点，绝不静默吞掉）。 */
export function navStepVerdict(step, routeAfter) {
  if (!step || step.do !== "assertRoute") return null;
  const want = String(step.routeIncludes || "").trim();
  if (!want) return { ok: false, text: "assertRoute 没写 routeIncludes ⇒ 配方错误，不许当断言通过" };
  const top = String(routeAfter || "").split("|").pop() || "";
  const ok = !!routeAfter && routeAfter.indexOf(want) >= 0;
  return { ok, text: "落点判点 want~=" + want + " got=[" + String(routeAfter || "(空)") + "] ⇒ " + (ok ? "命中" : "**未命中**") };
}
export function navStepsNote(steps, records) {
  const n = (steps || []).length;
  const done = (records || []).length;
  return "steps=" + done + "/" + n + (records || []).map((r, i) => "  #" + (i + 1) + " " + String(r.do) + (r.note ? " :: " + String(r.note).slice(0, 90) : "")).slice(0, 24).join("；");
}

/* ─────────────────────────── C4 通道声明 ───────────────────────────
 * 行上的通道字段：沿用 band（mode@sha8）/ transport（r-exec-ws 既有 "ws+cli-shot"）的风格，
 * 新增 automationChannel 一个键，逐例配方腿与 WS 腿通用行都盖（值=ws）；CLI 腿不盖（缺省读作 cli）。
 */
export const CHANNEL_WS = "ws";
export function channelStamp(channel) { return String(channel || "").trim() || "unspecified"; }

/* 配方文件对判据台的交叉校验（离线自测与 test-cap-recipes 共用）：
   ① 每个配方键都在判据台里存在（拼错的 key 会静默少跑 —— r-exec-ws --ids-file 同一条教训）；
   ② 配方声明的 page 与判据台一致；
   ③ 判据的 tapTarget（若有）必须被某一步的选择器/断言覆盖 —— 能力件要解的就是"点名物件点不到"，
      配方里点不到 tapTarget 的配方不许自称解锁了这条判据；
   ④ 带 fixture 的配方必须过 validateFixture；
   ⑤ 带 steps 的配方必须过 parseNavSteps。 */
export function validateRecipes(recipes, corpus) {
  const problems = [];
  const keys = Object.keys((recipes && recipes.recipes) || {});
  if (!keys.length) problems.push("配方文件里一条配方都没有");
  for (const key of keys) {
    const r = recipes.recipes[key];
    const inCorpus = corpus.get(key);
    if (!inCorpus) { problems.push(key + " 不在判据台里（键拼错或判据改号 ⇒ 静默少跑）"); continue; }
    if (r.page && inCorpus.page && r.page !== inCorpus.page) problems.push(key + " 配方 page=" + r.page + " ≠ 判据台 page=" + inCorpus.page);
    if (inCorpus.tapTarget) {
      const blob = JSON.stringify(r.steps || []);
      if (!blob.includes(inCorpus.tapTarget)) problems.push(key + " 判据点名 tapTarget=" + inCorpus.tapTarget + " 但配方步骤里没有任何一步碰到它 ⇒ 该配方没有解锁它声称解锁的东西");
    }
    const fx = validateFixture(r.fixture);
    if (!fx.ok) problems.push(key + " 夹具不合规矩：" + fx.reason);
    if (r.steps) {
      const st = parseNavSteps(r.steps);
      if (!st.ok) problems.push(key + " 步骤不合规矩：" + st.reason);
    }
    if (r.modalScript) {
      const ms = parseModalScript(r.modalScript);
      if (!ms.ok) problems.push(key + " modalScript 不合规矩：" + ms.reason);
    }
    if (r.netFault) {
      const nf = parseNetFault(r.netFault);
      if (!nf.ok) problems.push(key + " netFault 不合规矩：" + nf.reason);
    }
  }
  return { ok: problems.length === 0, problems, count: keys.length };
}
