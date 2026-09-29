#!/usr/bin/node
/* 负例（capability 车道 #10-d：逐时刻网络请求计数）— scripts/qa/test-exec-network-observe.cjs
   ── 这条测试要钉住的病 ──────────────────────────────────────────────────────────────
   c21 能力矩阵 G-2「per-request network counting」：409 条判据在 evidence 里点名 network，
   其中 312 条带显式计数谓词（reports/audit/round-7/c21-executor-capability-matrix.md (e) 表），
   而在役执行器 r-exec-cli.mjs:428 只出一句「本通道没有逐请求计数通道」。
   VB03（三个时刻各自 1/0/1）、DND02（PUT /dnd 计数=0）、CI22/MT21（下拉一次=一次写请求）、
   SE09（逐次分页）、TP07（加载失败）整族卡在这里。
   ── 最坏的那种绿（本车道自己立的红线）──────────────────────────────────────────────
   **把"没开通道/读数残缺"渲染成"计数=0"**，于是「不得发写请求 = 0」凭空成立。
   所以这里三条硬负例：
     · 缓冲区里有 1 条 PUT 时，量数不许是 0；
     · 截断/JSON 垃圾串必须报 broken，不许报 0；
     · state=off 时任何判点不许落 pass，取数闸门必须抛。
   ── 无设备怎么算"证明它能跑"────────────────────────────────────────────────────────
   本测试在 Node 里复刻 vendor.js 的拦截器语义（Ci 见到 false 就掐请求；
   success/fail 收到 (响应, 原始 options) 两个参数 —— 出处 vendor.js:Co/nn/Ci，见模块头「机制」），
   再用 new Function **真的执行** networkHookSource()/networkDrainSource() 那两段 evaluate 载荷，
   对着假 uni 发请求、排空、计数。⇒ 证明的不是字符串形状，是载荷本身跑得动、且不改行为。
   ── 空转防护（这条测试自己的负例）────────────────────────────────────────────────
   照 test-exec-native-capture.cjs:20-24 的做法：把模块拷到 .zcode/tmp/ 下做三处摘除
   （isJudgeable 恒真 / JSON 垃圾当 empty / 记录 push 摘掉），再拿同一套断言跑变异体 ⇒ **必须变红**。
   跑完按文件名删掉自己造的那一个，绝不递归删、绝不改活模块。
   ── 聚合器认的输出 ───────────────────────────────────────────────────────────────
   SUMMARY: assertion failures = N（run-qa-selftests.mjs:45-51）+ NETOBS_TEST=PASS|FAIL + NETOBS_RESULT=
   跑法：PATH=<node22 目录>:$PATH node scripts/qa/test-exec-network-observe.cjs
   只读产物与判据台，不碰模拟器、不取租约、不派生 IDE、不 import cli-automator。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const REPO = path.resolve(__dirname, "..", "..");
const LIVE = path.join(REPO, "scripts", "qa", "exec-network-observe.mjs");
const MUTANT = path.join(REPO, ".zcode", "tmp", "mutant-exec-network-observe.mjs");

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 300))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 170) + ")"));
}

/* ── 假 uni 运行时：逐条照 vendor.js 的语义写，出处见行内注释 ───────────────────── */
function makeFakeRuntime() {
  const registry = {};                      // et（vendor.js: `Ze={},et={}`）
  const xo = (h, obj) => { for (const k of ["invoke", "success", "fail", "complete"]) { if (typeof obj[k] === "function") { (h[k] = h[k] || []).push(obj[k]); } } };  // xo(e,t)
  const uni = {
    addInterceptor: (name, obj) => { if (typeof name === "string" && obj && typeof obj === "object") xo(registry[name] || (registry[name] = {}), obj); },
    request: null,
  };
  const sent = [];                          // 假传输层：真正"发出去"的请求（用来证明钩子没掐请求）
  uni.request = (options) => {
    const holder = registry.request || {};
    const opts = Object.assign({}, options);            // Tn: k({},r)
    /* Ci(e,t,n)：`if (i === !1) return {then(){},catch(){}}` ⇒ 任一 invoke 返回 false 就掐掉请求 */
    for (const fn of (holder.invoke || [])) { if (fn(opts, undefined) === false) { return { abortedByInterceptor: true }; } }
    sent.push(opts);
    const respond = (kind, res) => {
      /* Co(e,t)：`t[n]=function(i){ Ci(r,i,t)... }` ⇒ 拦截器收到 (响应, 原始 options) */
      for (const fn of (holder[kind] || [])) { fn(res, opts); }
      for (const fn of (holder.complete || [])) { fn(res, opts); }
      const appCb = kind === "success" ? opts.success : opts.fail;
      if (typeof appCb === "function") appCb(res);      // 原样透传：应用自己的回调必须还被调
    };
    const res = { errMsg: opts.__fail ? "request:fail net::ERR" : "request:ok", statusCode: opts.__fail ? 0 : (opts.__status || 200), data: {} };
    respond(opts.__fail ? "fail" : "success", res);
    return { abort() {} };                             // RequestTask
  };
  return { uni, sent };
}

/** 真的执行 evaluate 载荷字符串（与 cli-automator.mjs:137 把它交给 automation_evaluate 等价，只是载具换成 Node）。 */
function runPayload(src, url, expect) {
  const fn = new Function("return " + src)();
  return fn(url);
}

function assertModule(mod, label, opts) {
  const rec = opts && opts.rec || (() => {});
  const { STATE, NETWORK_COVER, WRITE_METHODS } = mod;
  const fix = (arr, extra) => JSON.stringify(Object.assign({ requests: arr, hooked: true, dropped: 0, seq: arr.length, clock: 1000 }, extra || {}));
  const req = (m, p, t0, o) => Object.assign({ seq: 1, method: m, url: "https://api.test" + p, path: p, query: "", startedAt: t0, endedAt: t0 + 5, statusCode: 200, outcome: "ok", errMsg: "", paired: true }, o || {});
  const is = (name, cond, detail) => { rec(name, cond, detail); return cond; };

  /* ── A. 三态：off / empty / broken / ok 必须四个都是四个样 ─────────────────── */
  is("A1 off ≠ empty：没开通道时时刻计数是 null 而不是 0",
    JSON.stringify(mod.momentCounts({ state: STATE.OFF, requests: [] }, null).moments) === JSON.stringify({ before: null, during: null, after: null }));
  is("A2 empty 是量出来的 0（hooked=true 且窗口 0 条）", mod.parseNetworkBuffer(fix([])).state === STATE.EMPTY, mod.parseNetworkBuffer(fix([])).state);
  is("A3 broken：截断 JSON 报残缺，不报 0（这条就是假绿的正面靶子）",
    mod.parseNetworkBuffer('{"requests":[{"method":"PUT","path":"/v1/dnd"').state === STATE.BROKEN);
  is("A4 broken：非 JSON 噪声串（IDE 前缀日志那一族）报残缺",
    mod.parseNetworkBuffer("IDE_PROJECT_ABS 传入=… not json").state === STATE.BROKEN);
  is("A5 broken：requests 不是数组报残缺", mod.parseNetworkBuffer('{"requests":5,"hooked":true}').state === STATE.BROKEN);
  is("A6 hooked 位缺失 ⇒ off（半截袋子不许冒充「采到 0 条」）",
    mod.parseNetworkBuffer('{"requests":[{"method":"PUT"}],"hooked":false}').state === STATE.OFF);
  is("A7 dropped>0（缓冲区被削过）⇒ broken：少报的数不能当答案",
    mod.parseNetworkBuffer(fix([req("GET", "/a", 1)], { dropped: 2 })).state === STATE.BROKEN);
  is("A8 ok：≥1 条且带 hooked 证据", mod.parseNetworkBuffer(fix([req("PUT", "/v1/dnd", 10)])).state === STATE.OK);
  is("A9 install 读数分得开：installed/already/no-uni/no-addInterceptor/ERR/空 六种各有归宿",
    [mod.interpretInstallResult("installed").installed, mod.interpretInstallResult("already").installed,
      mod.interpretInstallResult("no-uni").state, mod.interpretInstallResult("no-addInterceptor").state,
      mod.interpretInstallResult("ERR x").state, mod.interpretInstallResult("").state]
    .join(",") === "true,true,off,off,off,off");

  /* ── B. 计数谓词：DND02 / VB03 / MT21 / SE09 各要的那个数 ──────────────────── */
  const one = mod.parseNetworkBuffer(fix([req("PUT", "/v1/dnd", 10)]));
  is("B1 负例核心：缓冲区里 1 条 PUT 的量数不许是 0",
    mod.countFor(one, { methods: ["PUT"], path: "/v1/dnd" }) === 1, mod.countFor(one, { methods: ["PUT"], path: "/v1/dnd" }));
  is("B2 逐方法划分：byMethodPath 的键就是 DND02 点名的那个串",
    JSON.stringify(mod.momentCounts(one, [{ name: "before", end: 5 }, { name: "during", end: 20 }, { name: "after", end: Infinity }]).byMethodPath) === JSON.stringify({ "PUT /v1/dnd": 1 }));
  is("B3 归窗按请求发出时刻（startedAt）：PUT 落在 during ⇒ before/during/after=0/1/0",
    JSON.stringify(mod.momentCounts(one, [{ name: "before", end: 5 }, { name: "during", end: 20 }, { name: "after", end: Infinity }]).moments) === JSON.stringify({ before: 0, during: 1, after: 0 }));
  is("B4 写请求划分（MT21「不得重复触发匹配写请求」要的数）",
    mod.momentCounts(mod.parseNetworkBuffer(fix([req("GET", "/feed", 1), req("POST", "/match", 2), req("PUT", "/dnd", 3)])), null).writes === 2,
    mod.momentCounts(mod.parseNetworkBuffer(fix([req("GET", "/feed", 1), req("POST", "/match", 2), req("PUT", "/dnd", 3)])), null).writes);
  is("B5 WRITE_METHODS 口径 = POST/PUT/PATCH/DELETE（不含 GET）",
    JSON.stringify(WRITE_METHODS) === JSON.stringify(["POST", "PUT", "PATCH", "DELETE"]));
  is("B6 分页谓词：queryIncludes=page=2 只数第 2 页（SE09「无请求即分页死路」）",
    mod.countFor(mod.parseNetworkBuffer(fix([req("GET", "/search", 1, { query: "page=1" }), req("GET", "/search", 2, { query: "page=2" })])), { queryIncludes: "page=2" }) === 1);
  is("B7 失败注入半边：outcome=fail 单独可数（TP07 的「发了但失败」）",
    mod.countFor(mod.parseNetworkBuffer(fix([req("GET", "/p", 1, { outcome: "ok", statusCode: 200 }), req("GET", "/p", 2, { outcome: "fail", statusCode: 0, errMsg: "request:fail" })])), { outcome: "fail" }) === 1);

  const vb03 = mod.combineMoments([
    { name: "a", ...mod.parseNetworkBuffer(fix([req("GET", "/v1/vip/bills", 1)])) },
    { name: "b", ...mod.parseNetworkBuffer(fix([])) },
    { name: "c", ...mod.parseNetworkBuffer(fix([req("GET", "/v1/vip/bills", 9)])) },
  ]);
  is("B8 VB03：三个时刻各自 1/0/1", JSON.stringify(vb03.moments) === JSON.stringify({ a: 1, b: 0, c: 1 }), JSON.stringify(vb03.moments));
  is("B9 谓词抠取：「各自 1/0/1」→ [1,0,1]", JSON.stringify(mod.parseExpectedCounts("三个时刻各自 1/0/1 是本条唯一判据").values) === JSON.stringify([1, 0, 1]));
  is("B10 对账：1/0/1 遇 1/0/1 = MATCH", mod.verdictCounts(vb03, mod.parseExpectedCounts("各自 1/0/1")).verdict === "MATCH");
  is("B11 对账：1/0/2 遇 1/0/1 = MISMATCH（真判据要能红）",
    mod.verdictCounts(mod.combineMoments([{ name: "a", ...mod.parseNetworkBuffer(fix([req("GET", "/x", 1)])) }, { name: "b", ...mod.parseNetworkBuffer(fix([])) }, { name: "c", ...mod.parseNetworkBuffer(fix([req("GET", "/x", 7), req("GET", "/x", 8)])) }]), mod.parseExpectedCounts("各自 1/0/1")).verdict === "MISMATCH");
  const vb03Broken = mod.combineMoments([
    { name: "a", ...mod.parseNetworkBuffer(fix([req("GET", "/x", 1)])) },
    { name: "b", ...mod.parseNetworkBuffer(fix([])) },
    { name: "c", state: STATE.BROKEN, requests: [], err: "截断" },
  ]);
  is("B12 三个时刻里混一个 broken ⇒ 整体不可判（1/0/1 不再是 1/0/1）", vb03Broken.judgeable === false);
  is("B13 不可判时判点落 NOT_SHOOTABLE(verb=networkCount) 而不是 pass",
    mod.verdictCounts(vb03Broken, mod.parseExpectedCounts("各自 1/0/1")).verdict.indexOf("NOT_SHOOTABLE(verb=networkCount)") === 0,
    mod.verdictCounts(vb03Broken, mod.parseExpectedCounts("各自 1/0/1")).verdict);
  is("B15 未配对条目不许混过去：paired=false 记进 unpairable 并打进 summary",
    (function () { const c = mod.momentCounts(mod.parseNetworkBuffer(fix([req("GET", "/a", 1, { paired: false }), req("GET", "/b", 2, { paired: true })])), null); return c.unpairable === 1 && /未配对=1/.test(mod.netSummary(c)); })());
  is("B14 判据没写计数谓词 ⇒ 交回人判，本模块不代判",
    mod.verdictCounts(vb03, mod.parseExpectedCounts("看下列表条数")).verdict.indexOf("NO_EXPECTED_PREDICATE") === 0);

  /* ── C. 假绿的物理闸门 ─────────────────────────────────────────────────────── */
  is("C1 闸门：state=off 时取数必须抛（挡住零变假绿）",
    (function () { try { mod.assertJudgeable({ state: STATE.OFF }); return "no-throw"; } catch (e) { return e.message.indexOf("NOT_SHOOTABLE") === 0 ? "threw" : "wrong"; } })() === "threw");
  is("C2 闸门：state=broken 时同样抛",
    (function () { try { mod.assertJudgeable({ state: STATE.BROKEN, err: "x" }); return "no-throw"; } catch (e) { return e.message.indexOf("NOT_SHOOTABLE") === 0 ? "threw" : "wrong"; } })() === "threw");
  is("C3 闸门：empty/ok 放行（否则真的量到的 0 也被挡死，判据照样做不了）",
    mod.isJudgeable(STATE.EMPTY) === true && mod.isJudgeable(STATE.OK) === true && mod.isJudgeable(STATE.OFF) === false && mod.isJudgeable(STATE.BROKEN) === false);
  is("C4 summary：off 打「条数=?」并明写不许读成 0", mod.netSummary(mod.momentCounts({ state: STATE.OFF, requests: [] }, null)).indexOf("条数=?") === 0 && /不许读成 0/.test(mod.netSummary(mod.momentCounts({ state: STATE.OFF, requests: [] }, null))));
  is("C5 summary：empty 打「条数=0」（量出来的零才配写 0）", mod.netSummary(mod.momentCounts(mod.parseNetworkBuffer(fix([])), null)).indexOf("条数=0") === 0);
  is("C6 gap 三句分开：off 说「没开」、broken 说「残缺」、empty/ok 不写 gap",
    /没开网络计数通道/.test(mod.networkGap({ state: STATE.OFF })) && /读数残缺/.test(mod.networkGap({ state: STATE.BROKEN, err: "截断" })) && mod.networkGap({ state: STATE.EMPTY }) === "" && mod.networkGap({ state: STATE.OK }) === "");
  is("C7 cover 写清只覆盖 uni.request 一层（不许当全量网络）",
    /uni\.request/.test(NETWORK_COVER) && /不在内/.test(NETWORK_COVER));

  /* ── D. 载荷真的跑得动（无设备执行 + 不改行为）─────────────────────────────── */
  const rt = makeFakeRuntime();
  globalThis.uni = rt.uni;
  delete globalThis.__qaNetHooked; delete globalThis.__qaNet; delete globalThis.__qaNetSeq;
  const inst = runPayload(mod.networkHookSource());
  is("D1 装钩子返回 installed（假 uni 上真执行，不是只看字符串）", inst === "installed", inst);
  is("D2 二次装返回 already（同批不重复挂）", runPayload(mod.networkHookSource()) === "already");
  rt.uni.request({ url: "https://api.test/v1/dnd", method: "PUT", success: () => { rt.__appCb = true; } });
  rt.uni.request({ url: "https://api.test/v1/feed?page=2", method: "GET" });
  rt.uni.request({ url: "https://api.test/v1/p", method: "GET", __fail: true });
  is("D3 透传：应用自己的 success 仍被调（装钩子没改行为）", rt.__appCb === true);
  is("D4 透传：三次请求真的都发出去了（invoke 没返回 false 掐请求）", rt.sent.length === 3, rt.sent.length);
  const drained = runPayload(mod.networkDrainSource());
  const parsed = mod.parseNetworkBuffer(drained);
  is("D5 排空后计到 3 条（state=ok）", parsed.state === STATE.OK && parsed.requests.length === 3, parsed.state + "/" + (parsed.requests || []).length);
  is("D6 method/url 配得上对：PUT /v1/dnd 数到 1", mod.countFor(parsed, { methods: ["PUT"], path: "/v1/dnd" }) === 1, mod.countFor(parsed, { methods: ["PUT"], path: "/v1/dnd" }));
  is("D7 结束态配对：success 走 ok、fail 走 fail（vendor 的 (响应, options) 两位参数可用）",
    (function () { const m = {}; for (const e of parsed.requests) m[e.method + " " + e.path] = e.outcome; return m["PUT /v1/dnd"] === "ok" && m["GET /v1/p"] === "fail" && m["GET /v1/feed"] === "ok"; })());
  is("D8 statusCode 记到了（断网那族是 0，不是缺位）",
    (function () { const e = parsed.requests.find((x) => x.path === "/v1/p"); return e && e.statusCode === 0; })());
  is("D8b 真跑一遍后**零条未配对**（配对靠 invoke 记下的 url；若记录位被摘，finish 会补记成 paired=false ⇒ 这条必须红，同时 startedAt 会退化成响应时刻）",
    mod.momentCounts(parsed, null).unpairable === 0, mod.momentCounts(parsed, null).unpairable);
  is("D9 再排空一次 = 量到的 0（empty），窗口边界真的排干了", mod.parseNetworkBuffer(runPayload(mod.networkDrainSource())).state === STATE.EMPTY);
  const counts = mod.momentCounts(parsed, [{ name: "before", end: 0 }, { name: "during", end: Infinity }]);
  is("D10 端到端串：observed 里带 state/时刻/逐路径三个半边",
    /条数=3/.test(mod.netSummary(counts)) && /PUT \/v1\/dnd×1/.test(mod.netSummary(counts)), mod.netSummary(counts));

  const rt2 = makeFakeRuntime();
  globalThis.uni = undefined; delete globalThis.uni;
  is("D11 上下文没有 uni ⇒ no-uni（不许假装装上了）", runPayload(mod.networkHookSource()) === "no-uni", runPayload(mod.networkHookSource()));
  globalThis.uni = { request: () => {} };
  is("D12 有 uni 但没有 addInterceptor ⇒ no-addInterceptor", runPayload(mod.networkHookSource()) === "no-addInterceptor");
  delete globalThis.uni;

  /* ── E. 载荷形状红线（这两条是 D 组行为的静态保险）─────────────────────────── */
  is("E1 钩子挂在 uni.addInterceptor('request')，不是包 wx.request（后者被 vendor Hi() 的启动期快照挡住）",
    /addInterceptor\('request'/.test(mod.networkHookSource()) && !/wx\.request\s*=/.test(mod.networkHookSource()));
  is("E2 invoke 不许 return false（vendor.js:Ci 见 false 就掐掉请求 ⇒ 装钩子改了行为）",
    /\breturn false\b/.test(mod.networkHookSource()) === false);
  is("E3 取件串带 hooked 证据位（A6 的 off 判定靠它）", /hooked: !!globalThis\.__qaNetHooked/.test(mod.networkDrainSource()));
  is("E4 缓冲区有上限护栏（1107 条批次不许一行的包涨爆）", /__qaNet\.length > \d+/.test(mod.networkHookSource()));
  is("E5 行字段形状与 toast/console 同位（summary/gap/state 三件套齐）",
    (function () { const o = mod.observeFromDrain(mod.parseNetworkBuffer(fix([req("GET", "/x", 1)])), mod.interpretInstallResult("installed")); return o.state === STATE.OK && typeof o.summary === "string" && typeof o.gap === "string" && o.cover === NETWORK_COVER; })());
  is("E6 install 未装 ⇒ observeFromDrain 整体落 off，且 gap 非空（行绝不带 0 出门）",
    (function () { const o = mod.observeFromDrain(mod.parseNetworkBuffer(fix([])), mod.interpretInstallResult("no-uni")); return o.state === STATE.OFF && o.gap !== "" && o.counts.total === null; })());
}

async function main() {
  if (!fs.existsSync(LIVE)) {
    console.log("READ_ERR 模块不在盘上：" + LIVE);
    console.log("SUMMARY: assertion failures = 1");
    console.log("NETOBS_TEST=FAIL（模块读不到，一条断言都没跑）");
    console.log("NETOBS_RESULT=FAIL supported=no negatives=absent cases=0 bad=1 tri_state=missing");
    process.exit(1);
  }
  const mod = await import(pathToFileURL(LIVE).href);
  console.log("[live " + path.basename(LIVE) + "]");
  assertModule(mod, LIVE, { rec: (name, cond, detail) => t(name, cond, detail) });

  /* ── 空转防护：三处摘除做成变异体，同一套断言必须变红 ─────────────────────── */
  let mutantWritten = false;
  const src = fs.readFileSync(LIVE, "utf8");
  try {
    const mut = src
      .replace("export function isJudgeable(state) { return state === STATE.OK || state === STATE.EMPTY; }",
               "export function isJudgeable(state) { return true; }")                                    // 摘掉三态闸门
      .replace('return { state: STATE.BROKEN, requests: [], err: "取件串 JSON 解析失败',
               'return { state: STATE.EMPTY, requests: [], err: "取件串 JSON 解析失败')                  // 垃圾串当"采到 0 条"
      .replace('    globalThis.__qaNet.push({ seq: ++globalThis.__qaNetSeq, method: upm(o && o.method)',
               '    if (0) globalThis.__qaNet.push({ seq: ++globalThis.__qaNetSeq, method: upm(o && o.method)'); // 摘掉记录位
    mutantWritten = mut !== src && mut.indexOf("if (0) globalThis.__qaNet.push") >= 0;
    fs.mkdirSync(path.dirname(MUTANT), { recursive: true });
    fs.writeFileSync(MUTANT, mut);
  } catch (e) { console.log("MUTANT_WRITE_ERR " + e.message); }

  let mFails = 0;
  try {
    if (mutantWritten) {
      const mm = await import(pathToFileURL(MUTANT).href + "?mut=1");
      const rec = (name, cond) => { if (!cond) { mFails++; console.log("  [mutant-red] " + name); } };
      delete globalThis.__qaNetHooked; delete globalThis.__qaNet; delete globalThis.__qaNetSeq;
      try { assertModule(mm, MUTANT, { rec }); } catch (e) { /* 变异体抛了也算红，记一笔 */ mFails++; console.log("MUTANT_THREW " + e.message.slice(0, 120)); }
      t("空转防护：变异体（摘三态闸门 + 垃圾当 empty + 摘记录位）里同一套断言**确实变红**（红了多少条=" + mFails + "）", mFails >= 5, mFails);
    } else {
      t("空转防护：变异没落到盘上 ⇒ 负例未成立", false, mutantWritten);
    }
  } finally {
    try { if (fs.existsSync(MUTANT)) fs.unlinkSync(MUTANT); } catch (e) { console.log("MUTANT_CLEANUP_ERR " + e.message); }
  }
  t("收尾：变异体不留盘（活模块全程未被改动）", !fs.existsSync(MUTANT));

  /* 真实判据台：把三态口径对着 36 行分拣里点名 network 的那几条走一遍（只读，不猜极性）。 */
  try {
    const cls = JSON.parse(fs.readFileSync(path.join(REPO, "reports", "audit", "round-7", "criteria36-classification-v33.json"), "utf8"));
    const named = cls.rows.filter((r) => /network|请求数|请求条数|请求计数/.test(String(r.criteriaVerbatim || "")));
    t("判据台对账：分类 v33 里点名 network/请求计数的行数与 G-2 同族（本车道认领的是计数半边）",
      named.length > 0, "命中 " + named.length + " 行：" + named.map((r) => r.id).join(","));
    const offShape = mod.observeFromDrain(null, mod.interpretInstallResult(""));
    t("对上面这些行，未开通道时给出的是 NOT_SHOOTABLE 语境的 gap 句而不是 0（拿 VB03 试一把）",
      offShape.state === mod.STATE.OFF && /没开网络计数通道/.test(offShape.gap) && /NOT_SHOOTABLE/.test(mod.verdictCounts(offShape.counts, mod.parseExpectedCounts("各自 1/0/1")).verdict));
  } catch (e) { t("判据台对账：分类文件读不到或断言抛错", false, e.message.slice(0, 140)); }

  console.log("SUMMARY: assertion failures = " + fails);
  console.log(fails ? "NETOBS_TEST=FAIL" : "NETOBS_TEST=PASS");
  console.log("NETOBS_RESULT=" + (fails ? "FAIL" : "PASS") + " supported=" + (fails ? "unproven" : "yes") +
    " negatives=" + (fails ? "absent" : "fired") + " cases=" + checks + " bad=" + fails + " tri_state=ok");
  process.exit(fails ? 1 : 0);
}
main();
