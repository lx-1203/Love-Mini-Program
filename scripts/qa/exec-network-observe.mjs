#!/usr/bin/env node
/* 逐时刻网络请求计数（capability 车道 #10-d / 台账 #21）— scripts/qa/exec-network-observe.mjs
 *
 * 这条车道要治的病：c21 能力矩阵 G-2「per-request network counting」——
 *   409 条判据在 evidence 里点名 network，其中 312 条带**显式计数谓词**
 *   （reports/audit/round-7/c21-executor-capability-matrix.md (e) 表 G-2 行），
 *   而在役执行器自己承认拿不到：r-exec-cli.mjs:428 的 evidenceGaps 对 k.network 只出一句
 *   「本通道没有逐请求计数通道（审计 G-2 [NEW]，不在本车道）」。
 *   VB03（三个时刻各自 1/0/1）、DND02（PUT /dnd 计数=0）、CI22/MT21（下拉一次真触发一次写请求）、
 *   SE09（逐次分页）、TP07（加载失败）这一族整族钉在这句话上。
 *
 * ── 载具（先查再设计，别照旧结论猜第二遍）────────────────────────────────────────
 * 本模块只做**纯函数 + evaluate 载荷字符串**，不 import 桥、不派生进程、不碰模拟器；
 * 由调用方（r-exec-cli.mjs）拿 cli-automator.mjs:137 的 evaluate() 去发，与
 * nativeHookSource/nativeDrainSource（r-exec-cli.mjs:343-370）完全同形 ⇒ 是接线，不是新造通道。
 *
 * ── 钩子为什么挂 uni.addInterceptor 而不是包 wx.request（实测来源=产物，不是文档）──
 * 被测物 common/vendor.js 里 uni 是一枚 Proxy：
 *   `function Vf(e,t,n=wx){const r=xf(t);const o={get(s,i){return C(s,i)?s[i]:C(e,i)?Tn(i,e[i]):C(ko,i)?Tn(i,ko[i]):Tn(i,r(i,n[i]))}};return new Proxy({},o)}`
 *   `const ji=Hi(); var Fr=Vf(Zf,tp,ji)`，而 `function Hi(){const e={};for(const t in wx)Gf(t)&&(e[t]=wx[t]);...}`
 * ⇒ ji 是 **wx 函数引用的启动期快照**：跑起来之后再 `wx.request=wrap` 也改不到 `ji.request`，
 *   所以「包 wx.request」对 `uni.request(...)`（services/http.js 的真实调用位 = `f.index.request({...}`）
 *   **拦不住**。这一点顺带说明：nativeHookSource 那套包 wx.* 的做法对 uni.* 调用同样不可靠，
 *   本模块不沿用它的钩子位，只沿用它的**通道形状**（装一次 / 每行排空 / 三态串）。
 * 反过来 `uni.addInterceptor('request', {invoke,success,fail,complete})` 是**被运行时读的那一条**：
 *   `Pf('request')===true`（由产物里的 Ef/yf/Cf 三个谓词算出，见下方「机制」读数）⇒ `Tn` 返回带拦截器链的包装；
 *   `nn(e,t,n,r)` 里 `t(Co(o,n),...r)`，`Co` 把 success/fail/complete 翻成 `function(i){Ci(r,i,t)...}`，
 *   即 **interceptor 收到 (响应, 原始 options) 两个参数** ⇒ method/url 与 statusCode 配得上对。
 *   这条链住在 uni 运行时里，不住在应用源码里 ⇒ mock / real / showcase 三档产物同一份（已逐档核对）。
 * 诚实边界三条，别当成与 r1-exec 等位：
 *   ① 计数口径 = **请求发出（invoke）**；钩子装上之前飞掉的请求看不见，所以 before 窗口有盲区，
 *      调用方必须把 install 的读数一起交给判决（见 networkGap 的 state=off/broken 分支）。
 *   ② 只覆盖 uni.request 这一层。uploadFile / downloadFile / connectSocket / websocket 与
 *      wx.request 直呼位不在本钩子里 ⇒ 行上记 cover，不许把这一份当全量网络。
 *   ③ 钩子**原样透传**：invoke 绝不返回 false（Ci 见 false 就把请求掐了），success/fail 只记账不改返回值。
 *      装不上就报 no-uni / no-addInterceptor / ERR，绝不假装装上了。
 *
 * ── 三态（这条车道最要紧的一条，零必须是"量出来的零"而不是"没采到的零"）──────────
 * STATE.off     通道没开（没带旗标 / install 报 no-uni|no-addInterceptor|ERR|抛错）
 * STATE.empty   通道开了、hooked=true、本窗口 0 条 ⇒ 这是**判据信号**
 * STATE.broken  取件串残缺（截断/非 JSON/requests 不是数组/hooked 缺失）⇒ 读数不可信
 * STATE.ok      通道开了且有 ≥1 条
 * isJudgeable() 只对 empty/ok 为真；计数函数对 off/broken 一律回 **null**（绝不是 0）。
 * 任何把 off/broken 渲染成"计数=0 ⇒ 判点成立"的写法都会在 assertRenderableCount() 这里抛。
 *
 * 用法（离线自检，不需要设备）：
 *   PATH=<node22 目录>:$PATH node scripts/qa/exec-network-observe.mjs --selftest
 * 负例：PATH=<node22 目录>:$PATH node scripts/qa/test-exec-network-observe.cjs
 */

/** 三态常量：行上网络读数唯一口径。 */
/* 只借 node 内置的两个路径工具来认"我是不是入口"（下面的 SELF_ENTRY）——
   不 import 桥、不派生进程、不碰模拟器，那条自我约束仍然成立。 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** 三态常量：行上网络读数唯一口径。 */
export const STATE = { OFF: "off", EMPTY: "empty", BROKEN: "broken", OK: "ok" };
/** 本钩子覆盖不到的调用面（写进行上 cover，防止把这一份读成全量网络）。 */
export const NETWORK_COVER = "uni.request(经 uni.addInterceptor('request')) 一层；uploadFile/downloadFile/connectSocket/ws 与 wx.request 直呼位不在内";
/** 缓冲区上限：与 nativeDrainSource 同量级的护栏（1107 条批次不能让一行的包涨爆）。 */
export const BUFFER_CAP = 400;
export const BUFFER_TRIM = 200;
/** 写方法集：DND02「不得发写请求」/ MT21「重复匹配写请求」要的就是这个划分。 */
export const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

/* ══ 1) evaluate 载荷（纯字符串构造，可离线断言形状，不发进程） ═════════════════ */

/** 装钩子载荷：每批一次。返回串 'installed' | 'already' | 'no-uni' | 'no-addInterceptor' | 'ERR …'。
 *  与 nativeHookSource(r-exec-cli.mjs:343) 同形：`() => { try { … } catch (e) { return 'ERR ' + e.message; } }`。 */
export function networkHookSource() {
  return "() => { try {" +
    "if (typeof uni === 'undefined' || !uni) return 'no-uni';" +
    "if (typeof uni.addInterceptor !== 'function') return 'no-addInterceptor';" +
    "if (globalThis.__qaNetHooked) return 'already';" +
    "globalThis.__qaNet = []; globalThis.__qaNetSeq = 0;" +
    "var txt = function (v, n) { try { var s = (typeof v === 'string') ? v : String(v); return s.slice(0, n || 260); } catch (e) { return ''; } };" +
    "var num = function (v) { return (typeof v === 'number' && isFinite(v)) ? v : null; };" +
    "var upm = function (v) { var s = txt(v, 12).toUpperCase(); return /^[A-Z]+$/.test(s) ? s : 'GET'; };" +
    "var seg = function (u, which) { try { var s = txt(u, 500); var i = s.indexOf('://'); var rest = i >= 0 ? s.slice(i + 3) : s; var k = rest.indexOf('/'); var p = k >= 0 ? rest.slice(k) : rest; var q = p.indexOf('?'); if (which === 'path') return txt(q >= 0 ? p.slice(0, q) : p, 200); return txt(q >= 0 ? p.slice(q + 1) : '', 200); } catch (e) { return ''; } };" +
    "var find = function (o) { try { var a = globalThis.__qaNet; for (var i = a.length - 1; i >= 0; i--) { if (a[i].outcome === 'pending' && txt(a[i].url, 500) === txt(o && o.url, 500)) return a[i]; } for (var j = a.length - 1; j >= 0; j--) { if (a[j].outcome === 'pending') return a[j]; } return null; } catch (e) { return null; } };" +
    "var finish = function (kind, res, o) { try { var e = find(o); var now = Date.now(); if (!e) { globalThis.__qaNet.push({ seq: ++globalThis.__qaNetSeq, method: upm(o && o.method), url: txt(o && o.url, 260), path: seg(o && o.url, 'path'), query: seg(o && o.url, 'query'), startedAt: now, endedAt: now, statusCode: num(res && res.statusCode), outcome: kind, errMsg: txt(res && res.errMsg, 120), paired: false }); return; } e.endedAt = now; e.statusCode = num(res && res.statusCode); e.outcome = kind; e.errMsg = txt(res && res.errMsg, 120); e.paired = true; } catch (x) {} };" +
    "uni.addInterceptor('request', {" +
    "  invoke: function (o) { try {" +
    "    globalThis.__qaNet.push({ seq: ++globalThis.__qaNetSeq, method: upm(o && o.method), url: txt(o && o.url, 260), path: seg(o && o.url, 'path'), query: seg(o && o.url, 'query'), startedAt: Date.now(), endedAt: null, statusCode: null, outcome: 'pending', errMsg: '', paired: true });" +
    "    if (globalThis.__qaNet.length > " + BUFFER_CAP + ") globalThis.__qaNet.splice(0, " + BUFFER_TRIM + ");" +
    "  } catch (e) {} }," +
    "  success: function (res, o) { finish('ok', res, o); }," +
    "  fail: function (res, o) { finish((res && /abort/i.test(String(res.errMsg || ''))) ? 'abort' : 'fail', res, o); }," +
    /* 不返回 false：运行时 Ci() 见到 false 就把这次请求掐掉（vendor.js: function Ci(e,t,n){...i===!1 return {then(){},catch(){}}}）
       ⇒ 装钩子必须**不改行为**，这条是硬约束，被 test-exec-network-observe.cjs 钉住。 */
    "  complete: function () { }" +
    "});" +
    "globalThis.__qaNetHooked = true; return 'installed';" +
    "} catch (e) { return 'ERR ' + e.message; } }";
}

/** 取件载荷：每行（每个时刻）一次，排空缓冲区。回 JSON 串，形状照 nativeDrainSource(:366)。
 *  splice(0) 使「一次取件 = 一个窗口」，调用方想拆 VB03 的 a/b/c 三个时刻就在三个时刻各取一次。 */
export function networkDrainSource() {
  return "() => { try { var r = (globalThis.__qaNet || []).splice(0); " +
    "return JSON.stringify({ requests: r.slice(-" + BUFFER_CAP + "), hooked: !!globalThis.__qaNetHooked, dropped: r.length > " + BUFFER_CAP + " ? r.length - " + BUFFER_CAP + " : 0, seq: globalThis.__qaNetSeq || 0, clock: Date.now() }); } " +
    "catch (e) { return JSON.stringify({ requests: [], hooked: false, err: String(e && e.message) }); } }";
}

/** install 串 → 读数（纯函数；三态与 pullDownVerdict(r-exec-cli.mjs:321) 同款分得开）。 */
export function interpretInstallResult(raw) {
  const s = String(raw === undefined || raw === null ? "" : raw).trim();
  if (!s) return { state: STATE.OFF, installed: false, note: "install 串为空 ⇒ 通道状态未知，不许当已装" };
  if (/installed/.test(s)) return { state: STATE.OK, installed: true, note: "installed" };
  if (/already/.test(s)) return { state: STATE.OK, installed: true, note: "already（同批已装过，钩子仍在）" };
  if (/no-uni/.test(s)) return { state: STATE.OFF, installed: false, note: "no-uni：该 evaluate 上下文没有 uni 全局 ⇒ 拦截器挂不上" };
  if (/no-addInterceptor/.test(s)) return { state: STATE.OFF, installed: false, note: "no-addInterceptor：uni 有但没有 addInterceptor ⇒ 拦截器挂不上" };
  if (/ERR/.test(s)) return { state: STATE.OFF, installed: false, note: "install 报错：" + s.slice(0, 90) };
  return { state: STATE.OFF, installed: false, note: "install 读数不认识（" + s.slice(0, 60) + "）⇒ 按未开处理，不猜" };
}

/* ══ 2) 取件串 → 条目（三态在这里定，别往下游漏） ═══════════════════════════════ */

/** 把原始取件串翻成条目数组 + 三态。**从不抛**（通道噪声不该打死取景腿，照 interpretNative 的做法）。
 *  返回 { state, requests, err, dropped, hooked, judged }：
 *   - state=off    ：调用方压根没开这个通道（cap.on=false 时不该走到这里；走到这里说明串里没有 hooked=true 的证据）
 *   - state=empty  ：hooked=true 且 0 条 ⇒ 可判的零
 *   - state=broken ：串残缺 ⇒ 不可判
 *   - state=ok     ：≥1 条 */
export function parseNetworkBuffer(raw, opts = {}) {
  const on = opts.on === undefined ? true : !!opts.on;
  if (!on) return { state: STATE.OFF, requests: [], err: "", dropped: 0, hooked: false, reason: "channel-off" };
  let obj = null;
  if (raw && typeof raw === "object") obj = raw;
  else {
    const s = String(raw === undefined || raw === null ? "" : raw).trim();
    if (!s) return { state: STATE.BROKEN, requests: [], err: "取件串为空", dropped: 0, hooked: false, reason: "empty-payload" };
    const cut = s.indexOf("{");
    if (cut < 0) return { state: STATE.BROKEN, requests: [], err: "取件串里没有 JSON 起点：" + s.slice(0, 60), dropped: 0, hooked: false, reason: "no-json" };
    try { obj = JSON.parse(s.slice(cut)); } catch (e) {
      return { state: STATE.BROKEN, requests: [], err: "取件串 JSON 解析失败（截断/垃圾）:" + String(e && e.message || "").slice(0, 80) + " raw=" + s.slice(cut, cut + 60), dropped: 0, hooked: false, reason: "json-garbage" };
    }
  }
  if (!obj || typeof obj !== "object") return { state: STATE.BROKEN, requests: [], err: "取件串不是对象", dropped: 0, hooked: false, reason: "not-object" };
  if (obj.err) return { state: STATE.BROKEN, requests: [], err: "钩子侧报错:" + String(obj.err).slice(0, 80), dropped: 0, hooked: obj.hooked === true, reason: "hook-err" };
  /* hooked 缺失 ≠ false：老袋子/半截串都给不出这一位，两种都得算残缺，绝不能算成"0 条"。 */
  if (obj.hooked !== true) {
    return { state: STATE.OFF, requests: [], err: "", dropped: 0, hooked: false, reason: "hook-not-reported" };
  }
  if (!Array.isArray(obj.requests)) {
    return { state: STATE.BROKEN, requests: [], err: "requests 不是数组（拿到 " + typeof obj.requests + "）", dropped: 0, hooked: true, reason: "requests-not-array" };
  }
  const clean = obj.requests.filter((e) => e && typeof e === "object");
  const junk = obj.requests.length - clean.length;
  const reqs = clean.map(normalizeEntry);
  const dropped = numOr(obj.dropped, 0) + junk;
  if (dropped > 0) {
    /* 缓冲区被削过 ⇒ 这一窗口的条数只会**少不会多**，任何"计数=0/1"都无从谈起。
       宁可报 broken 让判据落 NOT_SHOOTABLE，也不交一份看起来像答案的少报数。 */
    return { state: STATE.BROKEN, requests: reqs, err: "窗口内缓冲区被截断：丢了 " + dropped + " 条 ⇒ 计数只会偏少，不可判", dropped, hooked: true, reason: "buffer-trimmed" };
  }
  return { state: reqs.length ? STATE.OK : STATE.EMPTY, requests: reqs, err: "", dropped: 0, hooked: true, reason: "", seq: numOr(obj.seq, null), clock: numOr(obj.clock, null) };
}

function numOr(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }
function normalizeEntry(e) {
  return {
    seq: numOr(e.seq, null),
    method: String(e.method || "GET").toUpperCase().slice(0, 12),
    url: String(e.url || "").slice(0, 260),
    path: String(e.path || "").slice(0, 200),
    query: String(e.query || "").slice(0, 200),
    startedAt: numOr(e.startedAt, null),
    endedAt: numOr(e.endedAt, null),
    statusCode: numOr(e.statusCode, null),
    outcome: ["ok", "fail", "abort", "pending"].indexOf(String(e.outcome)) >= 0 ? String(e.outcome) : "unknown",
    errMsg: String(e.errMsg || "").slice(0, 120),
    paired: e.paired === true,
  };
}

/* ══ 3) 条目 → 逐时刻计数 + 逐方法划分 ═══════════════════════════════════════════ */

/** 三态闸门：只有 empty/ok 能出数。off/broken 一律回 null（**不是 0**）。 */
export function isJudgeable(state) { return state === STATE.OK || state === STATE.EMPTY; }
export function assertJudgeable(parsed) {
  if (!parsed || !isJudgeable(parsed.state)) {
    throw new Error("NOT_SHOOTABLE(verb=networkCount): state=" + String(parsed && parsed.state) +
      " reason=" + String((parsed && (parsed.reason || parsed.err)) || "?") + " ⇒ 未开通道/读数残缺时**不许**渲染成计数 0");
  }
}

/** 时刻划分：boundaries = [{ name, end }]，end 是**该时刻的上界（不含）**，按请求 startedAt 归窗。
 *  默认三窗 before/during/after；调用方给什么名字就出什么名字（VB03 的 a/b/c 直接传三个名字即可）。
 *  未开通道 / 残缺 ⇒ 每个计数都是 null，并带上 state，绝不出 0。 */
export function momentCounts(parsed, boundaries) {
  if (!parsed || !isJudgeable(parsed.state)) {
    const names = (Array.isArray(boundaries) && boundaries.length ? boundaries : defaultBoundaries()).map((b) => b.name);
    const zero = {}; for (const n of names) zero[n] = null;
    return { state: (parsed && parsed.state) || STATE.OFF, moments: zero, total: null, byMethod: {}, byMethodPath: {}, writes: null, unpairable: null, note: "state 不可判 ⇒ 计数回 null（不是 0）：" + String((parsed && (parsed.reason || parsed.err)) || "channel-off") };
  }
  const bs = normalizeBoundaries(parsed.requests, boundaries);
  const rows = parsed.requests;
  const moments = {};
  for (const b of bs) moments[b.name] = 0;
  const byMethod = {}, byMethodPath = {}, byMomentMethodPath = {};
  let writes = 0, unpairable = 0;
  for (const e of rows) {
    const win = pickWindow(e, bs);
    if (!(win in moments)) moments[win] = 0;
    moments[win]++;
    byMethod[e.method] = (byMethod[e.method] || 0) + 1;
    const key = e.method + " " + (e.path || e.url || "?");
    byMethodPath[key] = (byMethodPath[key] || 0) + 1;
    const mk = win + "|" + key;
    byMomentMethodPath[mk] = (byMomentMethodPath[mk] || 0) + 1;
    if (WRITE_METHODS.indexOf(e.method) >= 0) writes++;
    if (e.outcome === "pending" || !e.paired) unpairable++;
  }
  return {
    state: parsed.state,
    moments,
    total: rows.length,
    byMethod,
    byMethodPath,
    byMomentMethodPath,
    writes,
    /* 时刻边界有没有据可查：boundaries 缺时间戳时按"取件即窗口末"退化成单窗，
       调用方必须看得见这件事（否则多时刻会被悄悄塌成一时刻）。 */
    boundaries: bs.map((b) => ({ name: b.name, end: b.end })),
    degraded: !(Array.isArray(boundaries) && boundaries.length),
    unpairable,
    note: "",
  };
}

function defaultBoundaries() { return [{ name: "before" }, { name: "during" }, { name: "after" }]; }

/** 边界归一：调用方可以传
 *    · [{name,end:ts}]  —— 显式时间戳（三个时刻各排空一次时的推荐口径由 drainMoments 给）
 *    · [{name}]         —— 只给名字：整窗口塌成"全部落在第一个名字"，degraded=true，绝不均分
 *  上界缺失时按 +∞ 处理（最后一窗兜住全部剩余）。 */
function normalizeBoundaries(rows, boundaries) {
  const bs = (Array.isArray(boundaries) && boundaries.length) ? boundaries : [{ name: "all", end: Infinity }];
  const out = bs.map((b, i) => ({
    name: String((b && b.name) || "m" + i),
    end: (typeof (b && b.end) === "number" && isFinite(b.end)) ? b.end : (i === bs.length - 1 ? Infinity : null),
  }));
  /* 只有名字没有时间 ⇒ 无法分窗：把全部塞进第一窗、其余窗记 0 会凭空造出"后两窗为 0"，
     所以这里显式把后窗标成 null 语义：end=null 表示"这一窗没有判据依据"（pickWindow 不会落进它）。 */
  return out;
}

function pickWindow(e, bs) {
  const t = (typeof e.startedAt === "number") ? e.startedAt : null;
  for (const b of bs) {
    if (b.end === null) continue;
    if (t === null || t < b.end) return b.name;
  }
  return bs[bs.length - 1].name;
}

/** 多时刻排空的读数合成：调用方在每个时刻各排空一次（VB03 的 a/b/c、SE09 的逐次触底），
 *  把每次的 parseNetworkBuffer 结果按名字交进来 ⇒ 得到"各自 1/0/1"这种可对照判点的形状。
 *  任一时刻不可判 ⇒ 整体不可判（state 取第一个不可判的那个），因为 1/0/1 里混一个"没采到"
 *  就不是 1/0/1，而是三个不同的东西。 */
export function combineMoments(namedParsed) {
  const list = Array.isArray(namedParsed) ? namedParsed : [];
  const names = list.map((x) => String((x && x.name) || "?"));
  const bad = list.find((x) => !x || !isJudgeable(x.state));
  const moments = {}, detail = {};
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const n = names[i];
    if (!p || !isJudgeable(p.state)) { moments[n] = null; detail[n] = { state: (p && p.state) || STATE.OFF, reason: (p && (p.reason || p.err)) || "unjudgeable" }; continue; }
    const rows = p.requests || [];
    moments[n] = rows.length;
    const byM = {}, byMP = {};
    let w = 0;
    for (const e of rows) {
      byM[e.method] = (byM[e.method] || 0) + 1;
      const k = e.method + " " + (e.path || e.url || "?");
      byMP[k] = (byMP[k] || 0) + 1;
      if (WRITE_METHODS.indexOf(e.method) >= 0) w++;
    }
    detail[n] = { state: p.state, total: rows.length, byMethod: byM, byMethodPath: byMP, writes: w, requests: rows };
  }
  return { state: bad ? ((bad && bad.state) || STATE.OFF) : (list.length ? STATE.OK : STATE.EMPTY), names, moments, detail, judgeable: !bad && list.length > 0 };
}

/** 逐方法/逐路径的取数（DND02「PUT /dnd 计数=0」、MT21「写请求条数」就是这一条）。
 *  不可判 ⇒ 回 null；可判而没匹配到 ⇒ 回 0（这两件事必须不同类型，调用方才编不了谎）。 */
export function countFor(parsed, filter) {
  if (!parsed || !isJudgeable(parsed.state)) return null;
  const f = filter || {};
  const wantMethods = Array.isArray(f.methods) ? f.methods.map((m) => String(m).toUpperCase()) : null;
  const pathRe = f.pathRe instanceof RegExp ? f.pathRe : null;
  const path = f.path ? String(f.path) : null;
  return (parsed.requests || []).filter((e) => {
    if (wantMethods && wantMethods.indexOf(e.method) < 0) return false;
    if (f.writesOnly && WRITE_METHODS.indexOf(e.method) < 0) return false;
    if (path && !(e.path === path || e.path.endsWith(path) || e.url.indexOf(path) >= 0)) return false;
    if (pathRe && !pathRe.test(e.path || "") && !pathRe.test(e.url || "")) return false;
    if (f.queryIncludes && String(e.query || "").indexOf(String(f.queryIncludes)) < 0) return false;
    if (f.outcome && e.outcome !== String(f.outcome)) return false;
    return true;
  }).length;
}

/* ══ 4) 判点对账（把「1/0/1」这类谓词翻成读数可对照的形状）═══════════════════════ */

/** 从判据文本里抠「请求数=1 / 计数=0 / 各自 1/0/1」这类谓词（纯文本，不猜极性之外的东西）。
 *  抠不到 ⇒ expected=null，调用方得自己写，不许由本模块代判。 */
export function parseExpectedCounts(text) {
  const s = String(text || "");
  const seq = /(\d+(?:\s*[/／]\s*\d+)+)/.exec(s);
  if (seq) return { kind: "sequence", values: seq[1].split(/[/／]/).map((x) => parseInt(x.trim(), 10)), raw: seq[1].replace(/\s+/g, "") };
  const one = /(?:请求数|请求条数|请求计数|network\s*计数|计数|第\s*\d+\s*页请求)\s*[=＝:：]?\s*(\d+)/.exec(s);
  if (one) return { kind: "single", values: [parseInt(one[1], 10)], raw: one[0] };
  return { kind: null, values: null, raw: "" };
}

/** 期望 vs 实测对账。不可判 ⇒ verdict='NOT_SHOOTABLE'，**绝不回 pass**。 */
export function verdictCounts(parsedOrCounts, expected) {
  const got = (expected && Array.isArray(expected.values)) ? expected.values.map(() => null) : [null];
  const src = (parsedOrCounts && typeof parsedOrCounts.moments === "object") ? parsedOrCounts : momentCounts(parsedOrCounts, null);
  if (!isJudgeable(src.state)) return { verdict: "NOT_SHOOTABLE(verb=networkCount)", expected: (expected && expected.values) || null, actual: got, why: "state=" + src.state + " " + String(src.reason || src.note || src.err || "") };
  const vals = (src.names && src.names.length) ? src.names.map((n) => src.moments[n]) : Object.keys(src.moments).map((k) => src.moments[k]);
  const flat = (expected && expected.kind === "sequence") ? vals : [src.total];
  const a = (expected && Array.isArray(expected.values)) ? expected.values.map((_, i) => (typeof flat[i] === "number" ? flat[i] : null)) : got;
  const ok = !!(expected && Array.isArray(expected.values)) && expected.values.length === a.length && a.every((v, i) => v !== null && v === expected.values[i]);
  return {
    verdict: (!expected || !expected.kind) ? "NO_EXPECTED_PREDICATE（判据没写出可对照的计数谓词 ⇒ 由人判，本模块不代判）"
      : (a.some((v) => v === null) ? "INCOMPLETE_WINDOW_COUNT（时刻数与谓词项数对不上）" : (ok ? "MATCH" : "MISMATCH")),
    expected: expected && expected.values || null, actual: a, raw: (expected && expected.raw) || "",
  };
}

/* ══ 5) 行上人眼可核、机器可抠的那一串（与 toastSummary(r-exec-cli.mjs:397) 同位同形）══ */

export function netSummary(counts) {
  const c = counts || {};
  if (!isJudgeable(c.state)) {
    return "条数=? state=" + String(c.state || STATE.OFF) + "（" + String(c.reason || c.note || c.err || "channel-off").slice(0, 120) + "）⇒ 不可判，不许读成 0";
  }
  const ms = c.moments || {};
  const names = Object.keys(ms);
  const parts = names.map((n) => n + "=" + (ms[n] === null ? "?" : ms[n]));
  const byMP = c.byMethodPath || {};
  const keys = Object.keys(byMP).sort();
  return "条数=" + c.total + (parts.length ? " 时刻[" + parts.join(" ") + "]" : "") +
    (keys.length ? " " + keys.slice(0, 8).map((k) => k + "×" + byMP[k]).join(",") : "") +
    (c.writes ? " 写=" + c.writes : " 写=0") +
    (c.unpairable ? " 未配对=" + c.unpairable : "") +
    (c.degraded ? " （只给了名字没给时刻边界 ⇒ 单窗，多时刻谓词不可用）" : "");
}

/** evidenceGaps 的网络半边（r-exec-cli.mjs:428 那句的替代来源；三态各一句，句子之间意思不同）。 */
export function networkGap(cap) {
  const st = (cap && cap.state) || STATE.OFF;
  if (st === STATE.OFF) {
    return "判据点名 network 证据，而本腿没开网络计数通道（旗标缺 / install=" + String((cap && cap.note) || "off") + "）⇒ 逐请求计数未采，行上 network 读数缺席「不许」读成「发了 0 条」";
  }
  if (st === STATE.BROKEN) {
    return "判据点名 network 证据，网络计数通道**已开但本窗口读数残缺**（" + String((cap && cap.err) || (cap && cap.reason) || "?").slice(0, 120) + "）⇒ 计数不可判，记 NOT_SHOOTABLE(verb=networkCount)，不拿 0 顶";
  }
  if (st === STATE.EMPTY) return "";
  return "";
}

/** 行上网络字段的形状裁决：把 parsed + install 读数压成 runner 要的 { state, counts, summary, gap }。 */
export function observeFromDrain(parsed, install) {
  const inst = install || { state: STATE.OFF, installed: false, note: "no-install-reading" };
  const p = parsed || { state: STATE.OFF, requests: [], reason: "no-drain" };
  const state = !inst.installed ? STATE.OFF : (p.state === STATE.BROKEN ? STATE.BROKEN : p.state);
  const counts = momentCounts({ state, requests: state === STATE.OFF || state === STATE.BROKEN ? [] : (p.requests || []) }, null);
  return { state, installed: !!inst.installed, installNote: inst.note, cover: NETWORK_COVER, counts, summary: netSummary(counts), gap: networkGap({ state, err: p.err, reason: p.reason }) };
}

/* ══ 离线自检：不碰设备，只验纯函数与载荷形状 ═══════════════════════════════════ */
/* 必须**只有本文件当入口时**才跑：本段结尾是 process.exit()，一旦被别的脚本 import
   （r-exec-cli.mjs 就 import 它的纯函数），argv 里恰好有 --selftest 时会把宿主在 import
   阶段就地打死 —— 实测那样一来 `node r-exec-cli.mjs --selftest` 只印 NETOBS、EXEC_SELFTEST
   一个字都不出，而进程仍退 0。一个"看起来通过"的自检比没有自检更坏。 */
const SELF_ENTRY = (() => {
  try {
    const norm = (p) => String(p || "").replace(/\\/g, "/").replace(/\/+/g, "/").toLowerCase();
    return norm(fileURLToPath(import.meta.url)) === norm(resolve(process.argv[1] || ""));
  } catch { return false; }
})();
if (SELF_ENTRY && process.argv.includes("--selftest")) {
  const cases = [];
  const T = (n, got, want) => cases.push({ n, got: JSON.stringify(got), want: JSON.stringify(want) });
  const fix = (arr, extra) => JSON.stringify(Object.assign({ requests: arr, hooked: true, dropped: 0, seq: arr.length, clock: 1000 }, extra || {}));
  const req = (m, p, t, o) => Object.assign({ seq: 1, method: m, url: "https://api.test" + p, path: p, query: "", startedAt: t, endedAt: t + 5, statusCode: o && o.statusCode !== undefined ? o.statusCode : 200, outcome: o && o.outcome || "ok", errMsg: "", paired: true }, o || {});

  T("载荷：走 uni.addInterceptor('request')（不是包 wx.request——后者被 vendor 的启动期快照挡住）", /addInterceptor\('request'/.test(networkHookSource()), true);
  T("载荷：invoke 不许返回 false（返回 false 会被运行时 Ci 掐掉请求 ⇒ 装钩子改了行为）", /\breturn false\b/.test(networkHookSource()), false);
  T("载荷：不许改包 wx.request（该位被 vendor 启动期快照挡住，改了就是假钩子）", /wx\[[^\]]+\]\s*=|wx\.request\s*=/.test(networkHookSource()), false);
  T("载荷：未装成功时报 no-uni / no-addInterceptor / ERR 三态", ["no-uni", "no-addInterceptor", "ERR"].every((k) => networkHookSource().includes(k)), true);
  T("取件：排空 + 带 hooked 证据位", /splice\(0\)/.test(networkDrainSource()) && /hooked: !!globalThis\.__qaNetHooked/.test(networkDrainSource()), true);

  T("三态：off ≠ empty（没开通道时计数必须是 null）", momentCounts({ state: STATE.OFF, requests: [] }, null).moments, { before: null, during: null, after: null });
  T("三态：empty 的 total 是量出来的 0", parseNetworkBuffer(fix([])).state, STATE.EMPTY);
  T("三态：截断 JSON 报 broken 不报 0", parseNetworkBuffer('{"requests":[{"method":"PUT","path":"/dnd"').state, STATE.BROKEN);
  T("三态：requests 不是数组报 broken", parseNetworkBuffer('{"requests":5,"hooked":true,"dropped":0}').state, STATE.BROKEN);
  T("三态：hooked 缺失 ⇒ off（不许当 empty）", parseNetworkBuffer('{"requests":[],"hooked":false}').state, STATE.OFF);
  T("三态：缓冲区被削过 ⇒ broken（少报的数不能当答案）", parseNetworkBuffer(fix([req("GET", "/a", 1)], { dropped: 3 })).state, STATE.BROKEN);

  const one = parseNetworkBuffer(fix([req("PUT", "/v1/dnd", 10)]));
  T("负例核心：1 条 PUT 的量数不许是 0", countFor(one, { methods: ["PUT"], path: "/v1/dnd" }), 1);
  T("逐方法划分：PUT /dnd 键在 byMethodPath 里", momentCounts(one, [{ name: "before", end: 5 }, { name: "during", end: 20 }, { name: "after", end: Infinity }]).byMethodPath, { "PUT /v1/dnd": 1 });
  T("时刻归窗：before/during/after = 0/1/0", momentCounts(one, [{ name: "before", end: 5 }, { name: "during", end: 20 }, { name: "after", end: Infinity }]).moments, { before: 0, during: 1, after: 0 });

  const three = ["GET", "/v1/vip/bills", 1];
  const vb03 = combineMoments([
    { name: "a", ...parseNetworkBuffer(fix([req(...three)])) },
    { name: "b", ...parseNetworkBuffer(fix([])) },
    { name: "c", ...parseNetworkBuffer(fix([req(...three)])) },
  ]);
  T("VB03 形状：三个时刻各自 1/0/1", vb03.moments, { a: 1, b: 0, c: 1 });
  T("VB03 对账：判据「1/0/1」判 MATCH", verdictCounts(vb03, parseExpectedCounts("三个时刻各自 1/0/1 是本条唯一判据")).verdict, "MATCH");
  T("VB03 抠谓词：1/0/1 → [1,0,1]", parseExpectedCounts("各自 1/0/1").values, [1, 0, 1]);
  const vb03Broken = combineMoments([{ name: "a", ...parseNetworkBuffer(fix([req(...three)])) }, { name: "b", ...parseNetworkBuffer(fix([])) }, { name: "c", state: STATE.BROKEN, requests: [], err: "截断" }]);
  T("混一个 broken 就不是 1/0/1 ⇒ 整体不可判", vb03Broken.judgeable, false);
  T("不可判时判点落 NOT_SHOOTABLE 而非 pass", verdictCounts(vb03Broken, parseExpectedCounts("各自 1/0/1")).verdict.startsWith("NOT_SHOOTABLE(verb=networkCount)"), true);

  T("闸门：off 时取数直接抛（挡住零变假绿）", (function () { try { assertJudgeable({ state: STATE.OFF }); return "no-throw"; } catch (e) { return /NOT_SHOOTABLE/.test(e.message) ? "threw" : "wrong-throw"; } })(), "threw");
  T("summary：off 打的是 ? 不是 条数=0", netSummary(momentCounts({ state: STATE.OFF, requests: [] }, null)).startsWith("条数=?"), true);
  T("summary：empty 打的是量出来的 条数=0", netSummary(momentCounts(parseNetworkBuffer(fix([])), null)).startsWith("条数=0"), true);
  T("gap：off 点名「没开」，broken 点名「残缺」，empty/ok 不写 gap", [networkGap({ state: STATE.OFF }).includes("没开网络计数通道"), networkGap({ state: STATE.BROKEN, err: "截断" }).includes("读数残缺"), networkGap({ state: STATE.EMPTY }), networkGap({ state: STATE.OK })], [true, true, "", ""]);

  const bad = cases.filter((c) => c.got !== c.want);
  for (const c of cases) console.log((c.got === c.want ? "  ok " : "  BAD") + " " + c.n + " got=" + c.got + " want=" + c.want);
  console.log("NETOBS_SELFTEST=" + (bad.length === 0 ? "PASS" : "FAIL") + " cases=" + cases.length + " bad=" + bad.length);
  process.exit(bad.length ? 1 : 0);
}
