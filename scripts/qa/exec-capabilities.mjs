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

/* ── C3-bis functionDeclaration 臂展集成（R3-NET-04 未落地的第三份 Source）──
 * automator 0.12.1 的 MiniProgram.mockWxMethod(name, mock) 有两条分岔（见 SDK 源码 isFnStr）：
 *   mock 是函数、或字符串 trim 后以 "function"/"() =>" 开头 ⇒ 发 {method, functionDeclaration: mock.toString()}
 *   否则                                                  ⇒ 发 {method, result: mock}
 * 走错分岔的后果不是报错而是**假零**：result 分支会把 wx.request 换成一个非函数值，
 * 应用侧每次请求直接抛，臂展计数永远 0，读的人把它当「页没发请求」。
 * tmp/qa/netfault-fn-probe.mjs 的四步实证用的就是 functionDeclaration 分支
 * （ARM=ok / 不可解析域名返回 SUCCESS 500+QA_NET_FAULT / 应用侧 __qaNet.count=1 / RESTORE=ok），
 * 本仓此前只把 mock 源**当字符串**递过去（依赖 SDK 的字符串嗅探），且装完不问回执 ——
 * 「调用没抛」不等于「臂展在位」，这条正是本仓反复立案的那类假绿，故补齐：
 *   ① asFunctionDeclaration：把载荷源编成真正的函数字面量再交给 SDK，分岔不再靠嗅探；
 *   ② mockArmBranch：把「SDK 会走哪条分岔」做成纯函数，离线可证伪；
 *   ③ netFaultArmReceiptSource：臂展后回读应用侧的真实状态（袋 + wx.request 是不是我们的 mock），
 *      读不到回执就把这一腿记成 NOT_SHOOTABLE(netFault=arm-unverified)，绝不交出 intercepted=0 这个假零。
 */
export function mockArmBranch(mock) {
  if (typeof mock === "function") return "functionDeclaration";
  const s = String(mock === undefined || mock === null ? "" : mock).trim();
  if (!s) return "result";
  return s.startsWith("function") || s.startsWith("() =>") ? "functionDeclaration" : "result";
}
/* 载荷源 → 函数对象（与探针 new Function("return " + ARM_FN)() 同一写法）。
   解析不进去就返回 null ⇒ 调用方必须报错，不许退回把源串当 result 发出去。 */
export function asFunctionDeclaration(src) {
  const s = String(src || "").trim();
  if (!s) return null;
  if (mockArmBranch(s) !== "functionDeclaration") return null;
  try { return new Function("return (" + s + ")")(); } catch (e) { return null; }
}
/* 臂展回执：同时问三件事 —— spec 袋在不在、请求记账袋在不在、wx.request 是不是已被换成函数 mock。
   只回一个布尔会把「臂展装上了但 spec 丢了」读成装上了。 */
export function netFaultArmReceiptSource() {
  return "() => { try { var sp = globalThis.__qaNetSpec; var calls = globalThis.__qaNetCalls; " +
    "var t = typeof wx.request; var ours = t === 'function' && String(wx.request).indexOf('__qaNetCalls') >= 0; " +
    "return JSON.stringify({ spec: sp && sp.mode ? String(sp.mode) : '', bag: Array.isArray(calls), requestType: t, mocked: ours }); } " +
    "catch (e) { return JSON.stringify({ spec: '', bag: false, requestType: 'ERR', mocked: false, err: String((e && e.message) || e).slice(0, 80) }); } }";
}
export function interpretArmReceipt(raw) {
  const s = String(raw === undefined || raw === null ? "" : raw).trim();
  const cut = s.indexOf("{");
  if (cut < 0) return { spec: "", bag: false, requestType: "unreadable", mocked: false, err: "回执串不可解析:" + s.slice(0, 40) };
  try {
    const j = JSON.parse(s.slice(cut));
    return { spec: String(j.spec || ""), bag: !!j.bag, requestType: String(j.requestType || ""), mocked: !!j.mocked, err: String(j.err || "") };
  } catch (e) { return { spec: "", bag: false, requestType: "unreadable", mocked: false, err: "回执解析失败:" + s.slice(0, 40) }; }
}
/* 回执裁决：mode 对 + 袋在 + wx.request 是我们的 mock ⇒ 才算 arm-verified。
   其余一律 ok=false，并把差在哪一维写出来（restore 之后取回执也应读出 mocked=false）。 */
export function armReceiptVerdict(wantMode, r) {
  const got = r || {};
  const bad = [];
  if (!got.mocked) bad.push("wx.request 不是本通道的 mock（requestType=" + String(got.requestType || "?") + "）");
  if (!got.bag) bad.push("应用侧请求记账袋 __qaNetCalls 不在（臂展随 AppService 重启没了）");
  if (wantMode && got.spec !== String(wantMode)) bad.push("spec.mode=" + JSON.stringify(got.spec) + " ≠ 配方要的 " + JSON.stringify(String(wantMode)) + "（restore 或没写上）");
  if (got.err) bad.push("回执本身报错:" + got.err);
  if (bad.length) return { ok: false, text: "arm-unverified：" + bad.join("；") };
  return { ok: true, text: "arm-verified(mode=" + got.spec + " mock=在 袋=在)" };
}
/* 臂展没被证实时这一腿的口吻（机读前缀沿用 NOT_SHOOTABLE(…)，与本仓既有拼写同形）。 */
export function armUnshootableText(spec, verdict) {
  return "NOT_SHOOTABLE(netFault=arm-unverified): " + String((verdict && verdict.text) || "没取到臂展回执") +
    "（mode=" + String((spec && spec.mode) || "?") + "）⇒ 臂展没装上就发不出「故障中」这一前置，" +
    "本腿的 intercepted 会是 0，但那个 0 是仪器读数不是产品结论；判据不许据此记 EXECUTED/FAILED，" +
    "要它被自动判得先修通道（open 后重新 armNetFault + 页内重触发，见 R3-NET-04）或换载具/人工判";
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
export const STEP_KINDS = ["open", "tap", "input", "readValue", "rapidTap", "callMethod", "callHandler", "probe", "pullDown", "stopPullDown",
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

/* ─────────────────────────── C7 开页形态：基底页 + 应用内 wx.navigateTo ───────────────────────────
 * R3-OT-01 / R3-02（2026-10-13 工具车道）。台账的三层根因里，②③ 成立、① 被产物证伪：
 *   ① 「编译标签是路径形 components/profile/public/RelationshipCTA」——**不成立**：
 *      dist/build/mp-weixin-real/components/profile/public/PublicProfile.json 的 usingComponents
 *      键就是 "relationship-c-t-a"（uni-app 把 RelationshipCTA 逐大写位连字），
 *      配方现有穿透链 profile-shell >>> public-profile >>> relationship-c-t-a >>> .relationship-cta__btn--like
 *      与产物逐字吻合（tmp/qa/navto-cta-probe.mjs 里 "relationship-c-t-a" 探到 null 是因为它是
 *      profile-shell 的孙节点、页级 $ 本来就打不到第三层，不是因为标签名写错）。
 *   ② automator 0.12.1 元素查询不穿透自定义组件子树 ⇒ DOM tap 这条路对这四项动作结构性不可达
 *      → 替代通道 C8（AppService 层直调 handler）。
 *   ③ 带 query 的桥 open 令 currentPage 回报 webview 代理态、$ 全超时（自动化层坏死）
 *      → 本节的「基底页 + 应用内 wx.navigateTo」（tmp/qa/navto-cta-probe.mjs 实证健康：
 *         全树 outerWxml 13493B、CTA 节点可见）。
 * 纪律：这条开页形态是**旗标选择**，不是替换默认路径 —— 不带 --navto-open 时 resolveOpenForm
 *   永远回 via="bridge"，既有 1107 行的开页方式与行形状一字不变（与 --gestures/--native-capture 同律）。
 */
export const NAVTO_BASE_PAGE = "pages/discover/index";
/* tabBar 页 wx.navigateTo 打不开（平台限制，不是本仓缺陷）：这些页只能退回桥 open。
   来源：apps/client/src/pages.json 的 tabBar.list（首页/附近/发现/消息/我的）。 */
export const TABBAR_PAGES = ["pages/home/index", "pages/nearby/index", "pages/discover/index", "pages/messages/index", "pages/profile/index"];
export function isTabBarPage(page) { return TABBAR_PAGES.includes(String(page || "").trim()); }
/* 纯函数：这一步 open 该怎么开。opts={navTo:bool, basePage?:string}（旗标由调用方传，
   本函数不读 argv ⇒ 离线能把两种模式都跑出来，同 r-exec-cli 的 verbsNamed 体例）。 */
export function resolveOpenForm(step, opts) {
  const o = opts && typeof opts === "object" ? opts : {};
  const page = String((step && step.page) || "").trim();
  const query = String((step && step.query) || "");
  if (!o.navTo) return { via: "bridge", page, query, url: "", base: "", kind: "flag-off", note: "桥 open(page,query)（缺省路径，与既有批次同形）" };
  if (!page) return { via: "bridge", page, query, url: "", base: "", kind: "no-page", note: "配方这一步没有 page ⇒ 无从 navigateTo，退回桥 open 让既有报错说话" };
  if (isTabBarPage(page)) return { via: "bridge", page, query, url: "", base: "", kind: "tabbar", note: "tabBar 页 wx.navigateTo 打不开（平台限制）⇒ 退回桥 open，本旗标对这一页无效果" };
  const base = String(o.basePage || NAVTO_BASE_PAGE);
  if (base === page) return { via: "bridge", page, query, url: "", base, kind: "base-is-target", note: "基底页与目标页同页 ⇒ navigateTo 只会叠一层自己，退回桥 open" };
  const url = "/" + page + (query ? (page.indexOf("?") >= 0 ? "&" : "?") + query : "");
  return { via: "navto", page, query, base, url, kind: "ok", note: "先桥 open 基底页 " + base + "（不带 query），再应用内 wx.navigateTo(\"" + url + "\")" };
}
/* navigateTo 载荷：只问 wx.navigateTo 一条（探针原形），success/fail 都回串 ⇒ 空读数与失败分得开。
   载荷里不许出现 uni 记号（AppService 上下文实测 "ERR uni is not defined"，文件头设备事实）。 */
export function navigateToSource(url) {
  const u = String(url || "");
  return "() => new Promise((res) => { try { if (!wx.navigateTo) { return res('no-api'); } " +
    "wx.navigateTo({ url: " + JSON.stringify(u) + ", success: () => res('nav-ok'), " +
    "fail: (e) => res('nav-fail ' + String((e && e.errMsg) || e).slice(0, 120)) }); } " +
    "catch (e) { res('ERR ' + String((e && e.message) || e).slice(0, 120)); } })";
}
/* 裁决：ok / nav-fail / unsupported / error / unknown 互不折叠。
   空读数**不许**读成"页打开了"（桥有时只回 undefined，那一腿的落点必须由 assertRoute 再证）。 */
export function navToVerdict(raw) {
  const s = String(raw === undefined || raw === null ? "" : raw).trim();
  if (/^nav-ok/.test(s)) return "ok";
  if (/^nav-fail/.test(s)) return "nav-fail(" + s.slice(9).trim() + ")";
  if (/^no-api/.test(s)) return "unsupported";
  if (/^ERR/.test(s)) return "error(" + s.slice(4).trim() + ")";
  if (!s) return "unknown(空读数 ⇒ 读作没落地，不许读成已打开)";
  return "unknown(" + s.slice(0, 60) + ")";
}
/* 桥不会 await 返回 Promise 的 fn-source（本仓在册：r-exec-ws.mjs 的折叠探针注释、
   r-exec-cli.mjs 的 cliProbe「先写袋、再同步等一会儿去读」）⇒ CLI 桥（automation_evaluate）
   只能用「发起 + 稍后读回」这一形。nav-fired 只说明"调用发出去了"，落地与否由 route 回读判。 */
export function navigateToSyncSource(url) {
  const u = String(url || "");
  return "() => { try { if (!wx.navigateTo) { return 'no-api'; } globalThis.__qaNav = globalThis.__qaNav || []; " +
    "wx.navigateTo({ url: " + JSON.stringify(u) + ", success: () => { globalThis.__qaNav.push('ok'); }, " +
    "fail: (e) => { globalThis.__qaNav.push('fail ' + String((e && e.errMsg) || e).slice(0, 120)); } }); return 'nav-fired'; } " +
    "catch (e) { return 'ERR ' + String((e && e.message) || e).slice(0, 120); } }";
}
export function navReadSource() {
  return "() => { try { var cs = getCurrentPages(); var top = cs && cs.length ? String((cs[cs.length - 1] || {}).route || '') : ''; " +
    "return JSON.stringify({ nav: (globalThis.__qaNav || []).slice(-4), top: top }); } catch (e) { return JSON.stringify({ nav: [], top: '', err: String((e && e.message) || e).slice(0, 80) }); } }";
}
/* nav-fired 不是"到了页"，no-landing 也不是"没发起"：两问分开答，落地由 route 回读判。 */
export function navSyncVerdict(raw) {
  const s = String(raw === undefined || raw === null ? "" : raw).trim();
  if (/^nav-fired/.test(s)) return "fired";
  if (/^no-api/.test(s)) return "unsupported";
  if (/^ERR/.test(s)) return "error(" + s.slice(4).trim() + ")";
  if (!s) return "unknown(空读数 ⇒ 读作没发起，不许读成已发起)";
  return "unknown(" + s.slice(0, 60) + ")";
}
export function interpretNavRead(raw) {
  const s = String(raw === undefined || raw === null ? "" : raw).trim();
  const cut = s.indexOf("{");
  if (cut < 0) return { nav: [], top: "", err: "回读串不可解析:" + s.slice(0, 40) };
  try {
    const j = JSON.parse(s.slice(cut));
    return { nav: Array.isArray(j.nav) ? j.nav : [], top: String(j.top || ""), err: String(j.err || "") };
  } catch (e) { return { nav: [], top: "", err: "回读解析失败:" + s.slice(0, 40) }; }
}
/* 落地判定：期望页必须在栈顶（navigateTo 是压栈），回读对不上 ⇒ not-landed（通道欠款，不是产品判决）。 */
export function navLandVerdict(wantPage, read) {
  const r = read || { nav: [], top: "" };
  const want = String(wantPage || "").replace(/^\//, "").split("?")[0];
  if (r.err) return { ok: false, kind: "unreadable", text: "回读失败：" + r.err };
  if (!r.top) return { ok: false, kind: "no-page", text: "getCurrentPages() 回读为空栈 ⇒ 没有任何页在栈顶，navigateTo 没落地" };
  const hit = r.top.indexOf(want) >= 0;
  const failed = (r.nav || []).filter((x) => String(x).indexOf("fail") === 0);
  return { ok: hit, kind: hit ? "landed" : "not-landed",
    text: (hit ? "已落在 " + r.top : "栈顶是 " + r.top + "，不是 " + want + "（not-landed）") +
      "；navigateTo 回执[" + ((r.nav || []).join(",") || "无") + "]" +
      (failed.length ? " ⇒ 应用侧明确拒了（常见原因：目标页在 tabBar 里、路径写错、页面未编译）" : "") };
}
/* 旗标没开时的显式宣告（与 --native-capture 的「空串读作没采、不读作没弹」同一句纪律）。 */
export function openFormNote(via) {
  return via === "navto"
    ? "on(base+navigateTo ⇒ 带 query 的页不再走 webview 代理态；基底页=" + NAVTO_BASE_PAGE + ")"
    : "off(没带 --navto-open ⇒ 新开的「基底页+应用内 wx.navigateTo」通道本腿**一字未用**，开页仍是桥 open(page,query)；" +
      "带 query 的页若回报 webview 代理态、$ 全超时（R3-02 ③），那是既有已知通道欠款，不许读成「页上没东西」)";
}

/* ─────────────────────────── C8 handler 直调（AppService 层替代 DOM tap）───────────────────────────
 * 配方步骤上的 step.handler = { method, routeIncludes, componentId?, args? }。
 * 只在 --handler-call 下使用；且**只作为 DOM 目标取不到时的替代通道**（目标在页上就照旧 tap，
 * 拿直调冒充点击同样是把判据点名的动作换成了别的动作）。
 * 纪律：method 必须点名（不猜 handler 名）、routeIncludes 必须点名（不在这一页上就打 handler，
 * 打的是上一页身上，那是比假绿更糟的东西）。
 */
export function parseHandlerCall(spec) {
  if (!spec || typeof spec !== "object") return { ok: false, reason: "handler 缺失或不是对象（callHandler/替代通道必须点名打哪个 handler）" };
  const method = String(spec.method || "").trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(method)) return { ok: false, reason: "handler.method 必须是合法 JS 标识符（收到 " + JSON.stringify(spec.method) + "，判据点名哪个动作，不许猜）" };
  const routeIncludes = String(spec.routeIncludes || "").trim();
  if (!routeIncludes) return { ok: false, reason: "handler.routeIncludes 必须点名目标页（不在页上就打 handler = 打在上一页身上）" };
  const componentId = String(spec.componentId || "").trim();
  const args = Array.isArray(spec.args) ? spec.args : [];
  return { ok: true, spec: { method, routeIncludes, componentId, args, label: String(spec.label || method) } };
}
/* 载荷：先验路由，再按 vm → page →（点名了 componentId 才）selectComponent 三格找函数，
   找到才调、并把这次调用记进 __qaHandler 袋（可 drain 复核）。
   三格都要试是因为 uni-app Vue3 的 setup 绑定落在 page.$vm、Options API 方法落在 page 本身、
   组件内方法要 selectComponent；哪一格命中由读数说话，不在测试里预设。 */
export function handlerCallSource(spec) {
  const h = spec && spec.spec ? spec.spec : spec || {};
  const m = JSON.stringify(String(h.method || ""));
  const route = JSON.stringify(String(h.routeIncludes || ""));
  const args = JSON.stringify(Array.isArray(h.args) ? h.args : []);
  const cid = String(h.componentId || "").trim();
  const compBranch = cid
    ? "else if (typeof p.selectComponent === 'function') { var c = p.selectComponent(" + JSON.stringify("#" + cid) + "); if (c && typeof c[" + m + "] === 'function') { t = c; via = 'component'; } } "
    : "";
  return "() => new Promise((res) => { try { var cs = getCurrentPages(); if (!cs || !cs.length) { return res('no-page'); } " +
    "var p = cs[cs.length - 1]; var route = String((p && (p.route || p.__route__)) || ''); " +
    "if (route.indexOf(" + route + ") < 0) { return res('wrong-page ' + route); } " +
    "var bag = globalThis.__qaHandler = globalThis.__qaHandler || []; var args = " + args + "; var t = null; var via = ''; " +
    "if (p.$vm && typeof p.$vm[" + m + "] === 'function') { t = p.$vm; via = 'vm'; } " +
    "else if (typeof p[" + m + "] === 'function') { t = p; via = 'page'; } " + compBranch +
    "if (!t) { return res('no-method ' + route); } " +
    "var fin = function (x) { var n = ''; try { n = JSON.stringify(x).slice(0, 80); } catch (e) { n = String(x).slice(0, 80); } " +
    "bag.push({ method: " + m + ", route: route, via: via, ts: Date.now(), ret: n }); return res('handler-ok via=' + via); }; " +
    "var r0; try { r0 = t[" + m + "].apply(t, args); } catch (e) { return res('ERR ' + String((e && e.message) || e).slice(0, 120)); } " +
    "if (r0 && typeof r0.then === 'function') { return r0.then(fin).catch(function (e) { res('ERR ' + String((e && e.message) || e).slice(0, 120)); }); } " +
    "return fin(r0); } catch (e) { res('ERR ' + String((e && e.message) || e).slice(0, 120)); } })";
}
/* 五态翻译（把 no-page/wrong-page/no-method 读成"打成功了"就是这条通道最坏的假绿）：
   直调没发生 = 判据点名的动作没发生 = 通道欠款，行记 NOT_SHOOTABLE，绝不记 EXECUTED。 */
export function handlerCallVerdict(raw) {
  const s = String(raw === undefined || raw === null ? "" : raw).trim();
  if (/^handler-ok/.test(s)) return "ok" + (s.indexOf(" ") >= 0 ? "(" + s.slice(s.indexOf(" ") + 1) + ")" : "");
  if (/^no-page/.test(s)) return "no-page(取不到页实例 ⇒ 没打任何 handler)";
  if (/^wrong-page/.test(s)) return "wrong-page(" + s.slice(11).trim() + " ⇒ 不在判据点名的页上，没打任何 handler)";
  if (/^no-method/.test(s)) return "no-method(" + s.slice(10).trim() + " ⇒ 该 handler 在本载具不可直调（setup 未暴露），换点法或换载具)";
  if (/^ERR/.test(s)) return "error(" + s.slice(4).trim() + ")";
  if (!s) return "unknown(空读数 ⇒ 读作没打，不许读成打成功)";
  return "unknown(" + s.slice(0, 60) + ")";
}
export function handlerCallOk(verdict) { return /^ok(\(|$)/.test(String(verdict || "")); }
export function handlerDrainSource() {
  return "() => { try { return JSON.stringify({ calls: (globalThis.__qaHandler || []).splice(0) }); } catch (e) { return JSON.stringify({ calls: [], err: String(e && e.message) }); } }";
}
/* 替代通道的行上口吻：明写"这是替代动作，不是判据点名的那个动作"。 */
export function handlerNote(spec, verdict) {
  const h = spec && spec.spec ? spec.spec : spec || {};
  return "handler-call " + String(h.method || "?") + " ⇒ " + String(verdict || "unknown") +
    "（AppService 层直调，替代 DOM tap；判据若点名的是「按钮真的可点/真的渲染」，直调不能代替 —— 行上如实记）";
}

/* ─────────────────────────── C9 netFault 臂展窗：open 后臂展 + 页内重触发 ───────────────────────────
 * R3-NET-04 / R3-08。结构性事实（实测在册）：桥 open 属 compiler 族 ⇒ 重编译并重启 AppService
 *   ⇒ 装上去的 wx.request mock 臂展随进程一起没（CON-EV-01「桥开页重启 AppService（包装器/缓冲全灭）」、
 *   R2-PFI25-04 同一根因）。于是「arm 在 open 之前」的配方形状**必然** intercepted=0
 *   （本轮 OC09 就是这么交出的旧行），把判据写成"进页即失败"在这个通道上永远验不到东西。
 * 判点形状因此改成：**每次 open 之后重新臂展，再在页内重触发数据加载**（下拉 / 点 retry /
 *   直调页自己的加载方法 = C8），然后 drainNet 取拦截计数。
 * netFaultArmWindow 就是把这件事做成一个能离线证伪的纯函数。
 */
export const NET_RETRIGGER_KINDS = ["pullDown", "tap", "rapidTap", "input", "callHandler"];
/* 逐个臂展窗判定：每一次 armNetFault 都必须「在同一段里」完成 臂展 → 页内重触发 → drainNet 取件，
   段边界就是 open/openNavTo（桥 open 重编译重启 AppService，臂展活不过下一次 open）。
   三种失败形状各不相折叠：
     · arm-dropped-by-open —— 臂展之后、重触发之前先来了一次 open ⇒ 这一臂必死（OC09/OT06/VB03 旧形状）
     · no-retrigger        —— 臂展了但页内没有任何重新拉数据的动作 ⇒ 页首请求早已发完，没有东西可拦
     · no-drain            —— 拦了但没取件 ⇒ 计数无从可读
   全绿才允许上腿；不绿就是配方形状错，执行器不许据此记产品判决。 */
export function netFaultArmWindow(steps) {
  const list = Array.isArray(steps) ? steps : [];
  const armIdx = [], openIdx = [];
  list.forEach((s, i) => {
    if (!s || !s.do) return;
    if (s.do === "armNetFault") armIdx.push(i);
    if (s.do === "open" || s.do === "openNavTo") openIdx.push(i);
  });
  const base = { armIdx, openIdx, armed: armIdx.length > 0, arms: armIdx.length, opens: openIdx.length };
  if (!armIdx.length) return Object.assign(base, { ok: null, kind: "not-armed", retrigger: "", drained: false, droppedArms: [], text: "本配方没有 armNetFault 步 ⇒ 无臂展窗可言（netFault 字段只是声明，没上腿）" });
  const dropped = [], noRet = [], noDr = [];
  armIdx.forEach((a) => {
    const nextOpen = openIdx.filter((o) => o > a)[0];
    const segEnd = nextOpen === undefined ? list.length : nextOpen;
    const seg = list.slice(a + 1, segEnd);
    const re = seg.find((s) => s && NET_RETRIGGER_KINDS.includes(s && s.do));
    const dr = seg.find((s) => s && s.do === "drainNet");
    if (nextOpen !== undefined && seg.length === 0) dropped.push(a);
    else if (!re) noRet.push(a);
    else if (!dr) noDr.push(a);
  });
  const out = Object.assign(base, { droppedArms: dropped, noRetriggerArms: noRet, noDrainArms: noDr });
  if (dropped.length) {
    return Object.assign(out, { ok: false, kind: "arm-dropped-by-open",
      text: "armNetFault@#" + dropped.map((i) => i + 1).join(",") + " 之后、任何重触发之前就来了一次 open（open@#" + openIdx.map((i) => i + 1).join(",") +
        "）：桥 open 重编译重启 AppService，臂展被洗掉 ⇒ 这一腿的 intercepted 恒等于仪器读数 0，不是「页没发请求」，更不是产品判红。判点形状要改成「每次 open 之后重新臂展 + 页内重触发」" });
  }
  if (noRet.length) {
    return Object.assign(out, { ok: false, kind: "no-retrigger",
      text: "armNetFault@#" + noRet.map((i) => i + 1).join(",") + " 之后同段内没有重触发步（词表 " + NET_RETRIGGER_KINDS.join("/") + "）：页首请求已在臂展前发完 ⇒ 没有东西可拦，intercepted=0 同样只是仪器读数" });
  }
  if (noDr.length) {
    return Object.assign(out, { ok: false, kind: "no-drain",
      text: "armNetFault@#" + noDr.map((i) => i + 1).join(",") + " 这一臂有重触发但没有同段 drainNet ⇒ 拦截计数没取件，这条网络判点无数可读（不许凭「调用发出去了」冒充「拦到了」）" });
  }
  return Object.assign(out, { ok: true, kind: "ok",
    text: "臂展窗合法：每一臂（arm@#" + armIdx.map((i) => i + 1).join(",") + "）都在下一次 open 之前完成「页内重触发 + drainNet 取件」⇒ intercepted>0 才读得出网络判点" });
}
/* 「进页即失败」这一族判据在本通道结构性不可得（页首请求拦不到）⇒ 诚实的能力边界串。
   与 r-exec-cli.mjs VERB_RULES 的 networkFault/netFaultFirstLoad 两条同一口径，不另立词表。 */
export function firstLoadFaultGap(why) {
  return "NOT_SHOOTABLE(netFault=first-load): 判据要的是「页面首次加载即处于故障中」，而桥 open=重编译重启 AppService ⇒ 臂展活不过 open（页首请求永远拦不到）" +
    " ⇒ 本通道只能判「臂展后重触发」（下拉/点 retry/直调页加载方法），判不了首屏；要判首屏得换载具（真机 network 面板 / 预览构建）或人工判，" +
    "不许记成产品 FAILED，也不许拿「重触发拦到 N 条」冒充「首屏拦到」" + (why ? "（本例：" + why + "）" : "");
}
export function armWindowNote(spec, w) {
  if (!w || w.kind === "not-armed") return "off";
  return "on(mode=" + String((spec && spec.mode) || "?") + " arms=" + w.arms + " opens=" + w.opens +
    " 臂被open洗掉=" + (w.droppedArms || []).length + " 无重触发=" + (w.noRetriggerArms || []).length +
    " 无取件=" + (w.noDrainArms || []).length + " ⇒ " + w.kind + ")";
}

/* 穿透链（REAL-OT-06 的 ">>>" 约定）的形状校验（纯函数）：
   中间段必须写成**编译产物里的自定义组件标签名**（uni-app 把驼峰组件名逐大写位连字，
   RelationshipCTA → "relationship-c-t-a"，见 dist/build/mp-weixin-real/components/profile/public/
   PublicProfile.json 的 usingComponents 键），末段允许标签或类/选择器。
   为什么要在离线就拦：R3-02 曾断言"标签是路径形 components/profile/public/RelationshipCTA"，
   产物证伪了它；但两种错法都会让这一腿**永远**报「不在页上」——
     · 段里出现 "/"（路径形）⇒ automator 的 $ 选择器没有这种语法，必然 null；
     · 段里带 "." 或 "#"（把类名当组件段穿）⇒ 穿到一半就断，末段读数毫无意义。
   拦下来的措辞只说通道形状不对，不许把它读成「组件不存在」。 */
export const DEEP_CHAIN_SEP = ">>>";
const TAG_FORM = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
export function deepChainSegments(selector) {
  return String(selector || "").split(DEEP_CHAIN_SEP).map((s) => s.trim()).filter(Boolean);
}
export function validateDeepChain(selector) {
  const raw = String(selector || "").trim();
  if (raw.indexOf(DEEP_CHAIN_SEP) < 0) return { ok: true, segs: [raw], note: "（非穿透链，走页级 $ 原路径）" };
  const segs = deepChainSegments(raw);
  if (segs.length < 2) return { ok: false, segs, reason: "穿透链只有 " + segs.length + " 段（" + raw + "）⇒ 分段符两侧没写东西" };
  const bad = [];
  segs.slice(0, segs.length - 1).forEach((s, i) => {
    if (s.indexOf("/") >= 0) bad.push("step-seg#" + (i + 1) + "=\"" + s + "\" 是路径形：$ 选择器没有这种语法，编译产物里的自定义组件标签是连字形（RelationshipCTA→relationship-c-t-a）");
    else if (!TAG_FORM.test(s)) bad.push("step-seg#" + (i + 1) + "=\"" + s + "\" 不是标签形（中间段必须是自定义组件的编译标签名，类名/属性选择器只能放末段）");
  });
  if (bad.length) return { ok: false, segs, reason: bad.join("；") + " ⇒ 这一段永远命中不了，属配方写法错误（通道欠款），不是「组件不存在」，更不是产品判决" };
  return { ok: true, segs, note: "链形合法：" + segs.join(" > ") };
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
    /* C8：点名了直调通道就必须点名打哪个 handler、在哪一页（猜出来的方法名会打在上一页身上）。 */
    for (const s of (r.steps || [])) {
      if (s && (s.do === "callHandler" || s.handler)) {
        const hc = parseHandlerCall(s.handler || s);
        if (!hc.ok) problems.push(key + " step#" + (r.steps.indexOf(s) + 1) + " 的 handler 直调不合规矩：" + hc.reason);
      }
    }
    /* C9：臂展窗形状（R3-NET-04 的判点形态）。arm 在 open 之前 = 臂展被重编译洗掉 = intercepted 恒 0，
       那是仪器读数不是产品结论 ⇒ 这种配方在这里就拒收，不许上腿交出一假零。 */
    if (r.netFault || (r.steps || []).some((s) => s && s.do === "armNetFault")) {
      const w = netFaultArmWindow(r.steps || []);
      if (w.ok === false) problems.push(key + " 网络判点形状不合法（" + w.kind + "）：" + w.text);
    }
    /* C7/REAL-OT-06：穿透链的段形必须在离线就核（路径形/把类名当组件段 ⇒ 永远「不在页上」）。 */
    const selBad = [];
    (r.steps || []).forEach((s, i) => {
      const list = s && s.do === "probe" ? (s.selectors || []) : (s && s.selector ? [s.selector] : []);
      list.forEach((sel) => { const dc = validateDeepChain(sel); if (!dc.ok) selBad.push("step#" + (i + 1) + " " + dc.reason); });
    });
    if (selBad.length) problems.push(key + " 穿透链写法错（不是组件不存在）：" + selBad.join("；"));
    /* C7：显式声明了 navigateTo 开页形态（step.via="navto"）的步，url/页必须点名得出。 */
    (r.steps || []).forEach((s, i) => {
      if (s && s.do === "open" && s.via === "navto") {
        const f = resolveOpenForm(s, { navTo: true });
        if (f.kind !== "ok") problems.push(key + " step#" + (i + 1) + " 声明 via=navto 但开页形态不成立（" + f.kind + "：" + f.note + "）");
      }
    });
  }
  return { ok: problems.length === 0, problems, count: keys.length };
}
