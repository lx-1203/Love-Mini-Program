#!/usr/bin/node
/* case-recipes.json ↔ 判据台 的交叉校验（capability 车道 2026-10-06）。
   test-exec-capabilities.cjs 钉的是模块纯函数与配方文件自身的结构；本文件钉的是
   **配方对真判据台的承诺**：
   ① 每个配方键都在判据台里真实存在（键拼错 = 静默少跑，--ids-file 同一条教训）；
   ② 配方 page 与判据台 page 一致（逐例深链别把落点钉错页）；
   ③ 判据的 tapTarget 必须被配方步骤/夹具文本覆盖 —— 能力件要解的就是"点名物件点不到"，
      配方里碰不到 tapTarget 的配方不许自称解锁了这条判据（validateRecipes 的硬判点）；
   ④ 判据的 identities 口径：本通道只配登录轴；配方必须声明为什么不含游客轴
      （OT06/OC09 的游客轴是落点裁定问题，配方文件 hygiene 字段点名了它）；
   ⑤ requiresReal 用例的配方不得在 mock 载体上跑（防 mock 冒充真实模式 —— 门的那句老话）。
   跑法：node scripts/qa/test-cap-recipes.cjs
   聚合器认：SUMMARY: assertion failures = N + CAPRECIPES_TEST=PASS|FAIL。零设备、零落盘。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const OPS = path.join(REPO, "reports", "audit", "round-6", "ops");
const RECIPES = JSON.parse(fs.readFileSync(path.join(REPO, "scripts", "qa", "case-recipes.json"), "utf8"));
const NODE = process.execPath;

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 300))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 150) + ")"));
}

/* 判据台语料：manifest → {page, cases}。 */
const corpus = new Map();
for (const f of fs.readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(OPS, f), "utf8"));
    corpus.set(f.replace(/\.json$/, ""), j);
  } catch { /* 解析失败的判据文件由别的门管 */ }
}

/* validateRecipes 的动态半边：用真判据台喂它（ESM 模块经 tmp 包装 import）。
   CAPS_UNDER_TEST 与 test-exec-verb-dispatch.cjs 的 EXEC_UNDER_TEST 同一条纪律：
   空转防护要用**一次性变异副本**跑同一套断言（活文件全程不改，用完即删），
   否则 §7 那批负例与「永远绿的测试」分不开。 */
const WRAPPER = path.join(REPO, ".zcode", "tmp", "caps-import.mjs");
const CAPS_FILE = process.env.CAPS_UNDER_TEST
  ? path.resolve(REPO, process.env.CAPS_UNDER_TEST)
  : path.join(REPO, "scripts", "qa", "exec-capabilities.mjs");
async function loadCaps() {
  fs.mkdirSync(path.dirname(WRAPPER), { recursive: true });
  fs.writeFileSync(WRAPPER, "import * as C from " + JSON.stringify("file://" + CAPS_FILE.split("\\").join("/")) + "; export default C;\n", "utf8");
  return (await import("file://" + WRAPPER.split("\\").join("/"))).default;
}

async function main() {
  const C = await loadCaps();
  console.log("被测能力模块=" + path.relative(REPO, CAPS_FILE) + (process.env.CAPS_UNDER_TEST ? "（变异副本，非活文件）" : "（活文件）"));
  /* corpus 形状：key → {page}（validateRecipes 只读 page；tapTarget 从 cases 里拼）。 */
  const gateCorpus = new Map();
  for (const [manifest, j] of corpus) {
    for (const c of (j.cases || [])) {
      gateCorpus.set(manifest + "|" + c.id, { page: j.page || c.page || "", tapTarget: c.tapTarget || "" });
    }
  }
  const v = C.validateRecipes(RECIPES, gateCorpus);
  t("validateRecipes 对真判据台零问题（键全在/page 全对/tapTarget 全覆盖/夹具全可回滚）", v.ok, v.problems.join("；"));

  const keys = Object.keys(RECIPES.recipes || {});
  for (const key of keys) {
    const [manifest, id] = [key.slice(0, key.indexOf("|")), key.slice(key.indexOf("|") + 1)];
    const mf = corpus.get(manifest);
    const c = mf && (mf.cases || []).find((x) => x.id === id);
    t("配方 " + key + " 在判据台有行", !!c, c ? "tier=" + c.tier : "找不到");
    if (!c) continue;
    t("配方 " + key + " 的 requiresReal=" + c.requiresReal + " ⇒ 必须真档跑（配方只配能力，不换档位账）", c.requiresReal === true, "");
    const r = RECIPES.recipes[key];
    /* 深链参数与判据台点名目标的一致性：query 里带 userId 的配方，其 id 必须在 r14 判据 cost 文本里被点过名
       （10001=未喜欢/OT05、100155=已喜欢未匹配/OT06 态1、10003=互喜/OT06 态2）—— 防止把任意 id 写死进去。 */
    const q = String(r.query || "");
    if (/userId=(\d+)/.test(q)) {
      const uid = /userId=(\d+)/.exec(q)[1];
      const allowed = { "次要20|OT05": ["10001"], "次要20|OT06": ["100155", "10003"], "次要20|OT09": ["10001"] };
      t("配方 " + key + " 深链 userId=" + uid + " 在 r14 实测点名的目标表内", (allowed[key] || []).includes(uid), "allowed=" + (allowed[key] || []).join("/"));
    }
    /* OC09 的 code 参数：必须是 recon 实测在册的 official-assistant。 */
    if (key === "次要21|OC09") {
      t("配方 OC09 的 code=official-assistant（recon GET /official-accounts 在册行）", /code=official-assistant/.test(q), q);
    }
    /* VB03 的步骤形状：必须覆盖 (a) 首进 (b) 二次进入 (c) 下拉 三段（多步 nav 的判据 (a)(b)(c)）。
       R3-NET-04/R3-08 改判（2026-10-13 工具车道）：旧断言要求「逐段 drainNet 计数」（≥3 次），
       但 record 臂展放在 open 之前会被桥 open 的重编译（重启 AppService）洗掉 ⇒ 那几段计数恒为 0，
       是仪器读数不是「onShow 没重拉」。旧断言钉的是一条**结构上取不到读数**的形状，
       现在改成钉新形状：(a)(b) 两次进页仍在，(c) 段是「臂展后置 → 下拉重触发 → 同段取件」
       （netFaultArmWindow 判 ok），(a)(b) 的计数半边由配方 adjudication 如实记 NOT_SHOOTABLE。 */
    if (key === "次要22|VB03") {
      const blob = JSON.stringify(r.steps || []);
      const w = C.netFaultArmWindow(r.steps || []);
      t("配方 VB03 覆盖 (a)(b)(c) 三段：两次进账单页 + 一次下拉，且臂展窗=「open 后臂展 + 页内重触发 + 同段取件」（R3-NET-04 新判点形状）",
        (blob.match(/subpackages\/vip\/bills/g) || []).length >= 3 && /pullDown/.test(blob) &&
        (blob.match(/drainNet/g) || []).length >= 1 && w.ok === true && w.arms >= 1 && w.droppedArms.length === 0,
        "armWindow=" + w.kind + " arms=" + w.arms + " opens=" + w.opens);
      t("配方 VB03 声明了 showcase 档位（band real@ed1cd82c 由 --project 决定，配方只记 why）", /showcase/.test(r.why || ""), "");
    }
    /* R3-NET-04 的新判点形态对**每一条**带臂展的配方都成立（不只 VB03）：
       臂展不得排在 open 之前，且每一臂都要在同段内重触发 + 取件。 */
    if ((r.steps || []).some((s) => s && s.do === "armNetFault")) {
      const w = C.netFaultArmWindow(r.steps || []);
      t("配方 " + key + " 的网络判点是「open 后臂展 + 页内重触发 + 同段 drainNet」（arm 排在 open 前=臂被重编译洗掉=intercepted 恒 0 的旧形状，这里直接拦死）",
        w.ok === true, w.text.slice(0, 200));
    }
    /* R3-OT-01/R3-02 的两条替代通道必须在配方里点名得出来（旗标默认关，
       但配方不声明 = 这一腿连替代通道存在过都没写 ⇒ 下一轮人只会再看到一句「不在页上」）。 */
    if (["次要20|OT05", "次要20|OT06", "次要20|OT09", "次要21|OC09"].includes(key)) {
      const navto = (r.steps || []).filter((s) => s && s.do === "open" && s.via === "navto").length;
      const handled = (r.steps || []).filter((s) => s && (s.do === "callHandler" || s.handler)).length;
      const prose = String(r.why || "") + String(r.adjudication || "");
      t("配方 " + key + " 声明了新通道（navigateTo 开页 " + navto + " 步 / handler 直调 " + handled + " 步），且正文点名两旗标 --navto-open/--handler-call 默认关",
        navto >= 1 && handled >= 1 && /navto-open/.test(prose) && /handler-call/.test(prose),
        "navto=" + navto + " handler=" + handled);
    }
    /* REAL-OT-06：穿透链段形核对（中间段必须是编译标签名；路径形/把类名当组件段一律拦死）。 */
    (r.steps || []).forEach((s, i) => {
      const list = s && s.do === "probe" ? (s.selectors || []) : (s && s.selector ? [s.selector] : []);
      for (const sel of list) {
        if (String(sel).indexOf(">>>") < 0) continue;
        const dc = C.validateDeepChain(sel);
        t("配方 " + key + " step#" + (i + 1) + " 的穿透链段形合法", dc.ok, dc.reason || dc.note);
      }
    });
    /* 游客轴的诚实划界：OT06/OC09 无 identities 字段 ⇒ 门两轴都要；本通道只判登录轴，
       配方 why 必须点名"游客轴不在本配方（落点裁定非能力问题）"，不许装作两轴都判了。 */
    if (key === "次要20|OT06" || key === "次要21|OC09") {
      t("配方 " + key + " 的 why 显式声明游客轴不在本配方（待落点裁定，不是能力问题）", /游客轴/.test(r.why || ""), "");
      t("判据 " + key + " 确实没标 identities（门两轴都要 ⇒ 残余欠账的口径来源）", !Array.isArray(c.identities) || c.identities.length === 0, "");
    }
  }
  /* 判据台上 10 条欠账里没进配方的（VRN07 待授权、TD03 属 L13/DISPATCHABLE），逐条点名不装看不见。 */
  const notInRecipes = ["次要20|VRN07", "次要18|TD03"].filter((k) => !keys.includes(k));
  t("VRN07/TD03 不在本通道配方（VRN07=待授权 DB 夹具、TD03=L13 的 DENY 收窄+参数化输入，都不归本车道）", notInRecipes.length === 2, notInRecipes.join(","));
  t("hygiene 字段点名了 OT06/OC09 游客轴的归属（落点裁定）", /guest-landing-policy/.test(String(RECIPES.hygiene || "")), "");

  /* ══════════════════════════════════════════════════════════════════════════════
     §7 2026-10-13 工具车道两条新通道 + 臂展集成的**负例**（续作车道补）
     ── 为什么这一节必须存在 ──
     R3-OT-01/R3-02/R3-NET-04 落进来的原语（resolveOpenForm / handlerCall* / mockArmBranch /
     asFunctionDeclaration / 臂展回执 / netFaultArmWindow）此前**一条负例都没有**：
     test-cap-recipes 只顺手用了 netFaultArmWindow 与 validateDeepChain。没有能红的反面，
     「通道已落地」就等于没被验证过（本仓在这上面立过案的假绿形状）。
     ── 语料来源（不是自造夹具）──
       · 正例形状全部从 scripts/qa/case-recipes.json 的真实步序里**取**（open 步、handler 声明、
         穿透链、netFaultMockSource 的真载荷）；
       · 反面形状全部从同一批真实步序**改**出来（把 OC09 那一臂搬回 open 之前 = HEAD 在盘的旧形状、
         把真穿透链的中间段换成路径形 = 台账 R3-OT-01 ① 的那句误诊），改前/改后都是语料里的东西。
     ══════════════════════════════════════════════════════════════════════════════ */
  const allSteps = [];
  const wsSrc = fs.readFileSync(path.join(REPO, "scripts", "qa", "r-exec-ws.mjs"), "utf8");
  for (const [key, r] of Object.entries(RECIPES.recipes || {})) {
    (r.steps || []).forEach((s, i) => allSteps.push({ key, i, s }));
  }
  const openSteps = allSteps.filter((x) => x.s && x.s.do === "open");
  const navtoDecls = openSteps.filter((x) => x.s.via === "navto");
  const handlerDecls = allSteps.filter((x) => x.s && (x.s.handler || x.s.do === "callHandler"));

  /* ── A-1 开页形态：默认必须关，且关了以后与配方逐字同形 ── */
  t("§7 resolveOpenForm 在 navTo=false 下把语料里每一个 open 步都原样交回桥 open（page/query 逐字不动 ⇒ 1107 行的开页方式一字不变）",
    openSteps.length > 0 && openSteps.every((x) => {
      const f = C.resolveOpenForm({ page: x.s.page, query: x.s.query || "" }, { navTo: false });
      return f.via === "bridge" && f.kind === "flag-off" && f.page === x.s.page && f.query === (x.s.query || "") && f.url === "" && f.base === "";
    }), "open 步=" + openSteps.length);
  t("§7 resolveOpenForm 不读 argv（旗标由调用方传 ⇒ 离线能把两种形态都跑出来，同 verbsNamed 体例）",
    !/\bprocess\.argv\b|\bNAVTO_OPEN\b/.test(String(C.resolveOpenForm)));
  t("§7 配方声明的 via=navto 步在带旗标时确实换成「基底页 + /page?query」，且基底页不是目标页、不带 query",
    navtoDecls.length >= 1 && navtoDecls.every((x) => {
      const f = C.resolveOpenForm({ page: x.s.page, query: x.s.query || "" }, { navTo: true });
      return f.via === "navto" && f.kind === "ok" && f.url === "/" + x.s.page + (x.s.query ? "?" + x.s.query : "") &&
        f.base === C.NAVTO_BASE_PAGE && f.base !== f.page;
    }), "via=navto 声明=" + navtoDecls.length + " 条（" + [...new Set(navtoDecls.map((x) => x.key))].join(",") + "）");
  /* 基底页**可以**是 tabBar 页 —— 这是设计而不是漏洞：tabBar 限制打在 navigateTo 那一句上，
     桥 open(page,query) 对 tabBar 页是好的，所以缺省基底取 pages/discover/index（在册可开页）。
     钉这条是因为「基底页不许是 tabBar」这种想当然的判点会把整条通道判成死的。 */
  t("§7 缺省基底页在册且桥开得住（tabBar 限制只作用于 navigateTo 的目标页，不作用于基底页）",
    C.isTabBarPage(C.NAVTO_BASE_PAGE) === true &&
      C.resolveOpenForm({ page: "subpackages/vip/bills", query: "" }, { navTo: true }).base === C.NAVTO_BASE_PAGE);
  /* 反面：语料里 PFI25 的真实页 pages/profile/index 在 pages.json 的 tabBar 里 ⇒ navigateTo 打不开。
     钉这一条是因为「tabBar 页也走 navigateTo」在设备上必然 fail，而行上会读成「页打不开=产品问题」。 */
  const tabbarPageInCorpus = openSteps.map((x) => x.s.page).find((p) => C.isTabBarPage(p));
  t("§7 语料里真有 tabBar 页的 open 步（反面样本非凭空造）：" + tabbarPageInCorpus,
    !!tabbarPageInCorpus, tabbarPageInCorpus);
  t("§7 负例：tabBar 页即使带 --navto-open 也必须退回桥 open（平台限制，不许记成 navigateTo 失败的产品判决）",
    !!tabbarPageInCorpus && (function () {
      const f = C.resolveOpenForm({ page: tabbarPageInCorpus, query: "userId=1" }, { navTo: true });
      return f.via === "bridge" && f.kind === "tabbar";
    })());
  t("§7 负例：目标页==基底页时必须退回桥 open（navigateTo 只会叠一层自己）；空 page / 缺 step 不许发 navigateTo",
    (function () {
      const bills = "subpackages/vip/bills";
      const a = C.resolveOpenForm({ page: bills, query: "" }, { navTo: true, basePage: bills });
      const b = C.resolveOpenForm({ page: "", query: "x=1" }, { navTo: true });
      const c = C.resolveOpenForm(undefined, { navTo: true });
      const d = C.resolveOpenForm({ page: bills, query: "a=1" }, { navTo: true, basePage: C.NAVTO_BASE_PAGE });
      return a.kind === "base-is-target" && a.via === "bridge" && b.kind === "no-page" &&
        c.kind === "no-page" && d.via === "navto" && d.url === "/" + bills + "?a=1";
    })());
  t("§7 旗标没开时的那句宣告必须说「一字未用」，不许留空（照 --native-capture 的先例：空读数读作没用过，不读作试过不管用）",
    /一字未用/.test(C.openFormNote("bridge")) && /webview 代理态/.test(C.openFormNote("bridge")) &&
      /on\(base\+navigateTo/.test(C.openFormNote("navto")));
  t("§7 navigateTo 两条载荷（WS 的 Promise 形 / CLI 的 发起+回读 形）里一个 uni 记号都不许有，且各问各的（ fired 不混成 landed）",
    !/\buni\b/.test(C.navigateToSource("/a?b=1")) && !/\buni\b/.test(C.navigateToSyncSource("/a?b=1")) &&
      !/\buni\b/.test(C.navReadSource()) && /wx\.navigateTo/.test(C.navigateToSource("/a?b=1")) &&
      /getCurrentPages\(\)/.test(C.navReadSource()) && C.navToVerdict("nav-fired") !== "ok" &&
      C.navSyncVerdict("nav-ok") !== "fired");
  t("§7 空读数不许折叠成成功：navToVerdict('')/navSyncVerdict('') 都读作「没落地/没发起」，navLandVerdict 拿到空栈读 not-landed",
    /^unknown\(空读数/.test(C.navToVerdict("")) && /^unknown\(空读数/.test(C.navSyncVerdict("")) &&
      C.navLandVerdict("p/q", { nav: [], top: "" }).ok === false &&
      C.navLandVerdict("p/q", { nav: [], top: "p/q" }).ok === true &&
      C.navLandVerdict("p/q", { nav: ["fail xxx"], top: "other" }).kind === "not-landed" &&
      C.navLandVerdict("p/q", { nav: [], top: "", err: "boom" }).kind === "unreadable");

  /* ── A-2 handler 直调：语料里声明得出来的正例 + 三种打不成的反面 ── */
  const hDecls = handlerDecls.map((x) => (x.s.do === "callHandler" ? x.s.handler : x.s.handler)).filter(Boolean);
  t("§7 语料里每一条 handler 声明都吃得住 parseHandlerCall（配方写了却解析不了 = 上腿才发现在白写）",
    hDecls.length >= 1 && hDecls.every((h) => C.parseHandlerCall(h).ok === true),
    "声明=" + hDecls.length + " 条：" + hDecls.map((h) => h.method).join(","));
  t("§7 负例：method 缺失/非法标识符/没点名 routeIncludes 一律拒（不在上一页身上打 handler 比假绿更糟）",
    C.parseHandlerCall({ method: "", routeIncludes: "p" }).ok === false &&
      C.parseHandlerCall({ method: "like(); evil", routeIncludes: "p" }).ok === false &&
      C.parseHandlerCall({ method: "handleLike", routeIncludes: "" }).ok === false &&
      C.parseHandlerCall(null).ok === false && C.parseHandlerCall("handleLike").ok === false);
  const hSrc = C.handlerCallSource(C.parseHandlerCall(hDecls[0] || { method: "handleLike", routeIncludes: "profile-extra/profile/other" }).spec);
  t("§7 直调载荷点名 method 与路由、且一个 uni 记号都不许有（设备事实：evaluate 上下文里任何 uni 记号都抛 ERR uni is not defined）",
    !/\buni\b/.test(hSrc) && /getCurrentPages\(\)/.test(hSrc) && hSrc.indexOf("handleLike") >= 0 && /wrong-page/.test(hSrc));
  t("§7 五种回执互不折叠（把 no-page/wrong-page/no-method 读成「打成」就是这条通道最坏的假绿）",
    new Set([C.handlerCallVerdict(""), C.handlerCallVerdict("no-page"), C.handlerCallVerdict("wrong-page p/x"),
      C.handlerCallVerdict("no-method p/x"), C.handlerCallVerdict("ERR boom"), C.handlerCallVerdict("handler-ok via=vm")]).size === 6 &&
      C.handlerCallOk(C.handlerCallVerdict("handler-ok via=vm")) === true &&
      ["", "no-page", "wrong-page x", "no-method x", "ERR x"].every((s) => C.handlerCallOk(C.handlerCallVerdict(s)) === false));
  t("§7 替代通道的行上口吻必须明写「这不是判据点名的那个动作」（直调冒充点击与一次 tap 冒充 rapidTap×5 同罪）",
    /替代 DOM tap/.test(C.handlerNote({ method: "handleLike" }, "ok(vm)")) && /不能代替/.test(C.handlerNote({ method: "m" }, "ok")));

  /* ── B-1 functionDeclaration 臂展集成（R3-NET-04 未落地的第三份 Source）── */
  const mockSrc = C.netFaultMockSource();
  t("§7 真载荷源（本仓实际发给 mockWxMethod 的那串）必须落进 functionDeclaration 分岔，且能编成函数对象",
    C.mockArmBranch(mockSrc) === "functionDeclaration" && typeof C.asFunctionDeclaration(mockSrc) === "function" &&
      C.mockArmBranch(C.asFunctionDeclaration(mockSrc)) === "functionDeclaration");
  t("§7 负例：result 分岔（把 mock 当值递 = wx.request 被换成非函数值 ⇒ intercepted 恒 0 的假零本体）必须判 result 且编不出函数",
    C.mockArmBranch(JSON.stringify({ statusCode: 500 })) === "result" &&
      C.asFunctionDeclaration(JSON.stringify({ statusCode: 500 })) === null &&
      C.mockArmBranch("") === "result" && C.mockArmBranch(null) === "result" && C.asFunctionDeclaration("") === null);
  /* REAL-OT-06 那类事故形状：载荷串半路断掉（双引号/截断）。编不成函数就必须报错，
     不许"退回把串当 result 发"（那等于往载具上装一个会让应用侧每次请求都抛的值）。 */
  t("§7 负例：语法坏掉的函数字符串（真源串截一半 = REAL-OT-06 双引号事故的形状）⇒ asFunctionDeclaration 返回 null 而不是抛",
    (function () {
      const broken = mockSrc.slice(0, Math.floor(mockSrc.length / 2));
      let threw = false, got = null;
      try { got = C.asFunctionDeclaration(broken); } catch (e) { threw = true; }
      return !threw && got === null;
    })());
  t("§7 臂展回执载荷问满三件事（spec 袋 / 记账袋 / wx.request 是不是我们的 mock），且无 uni 记号",
    (function () { const s = C.netFaultArmReceiptSource(); return !/\buni\b/.test(s) && /__qaNetSpec/.test(s) && /__qaNetCalls/.test(s) && /wx\.request/.test(s) && /mocked/.test(s); })());
  t("§7 回执裁决四维各自不折叠：mocked=false / 袋不在 / mode 对不上 / 回执报错 四种都 ok=false 且点名差在哪一维；全在才 ok=true",
    (function () {
      const good = { spec: "fail-all", bag: true, requestType: "function", mocked: true, err: "" };
      const bads = [
        Object.assign({}, good, { mocked: false, requestType: "undefined" }),
        Object.assign({}, good, { bag: false }),
        Object.assign({}, good, { spec: "record" }),
        Object.assign({}, good, { err: "boom" }),
      ];
      const vs = bads.map((b) => C.armReceiptVerdict("fail-all", b));
      return C.armReceiptVerdict("fail-all", good).ok === true && vs.every((v) => v.ok === false) &&
        /wx\.request 不是本通道的 mock/.test(vs[0].text) && /__qaNetCalls/.test(vs[1].text) &&
        /spec\.mode/.test(vs[2].text) && /回执本身报错/.test(vs[3].text);
    })());
  t("§7 负例：没取到回执（空串/垃圾串/undefined）一律读作 arm-unverified，不许读作装上了",
    (function () {
      const r1 = C.interpretArmReceipt(""), r2 = C.interpretArmReceipt("no json here"), r3 = C.interpretArmReceipt(undefined);
      return [r1, r2, r3].every((r) => r.mocked === false) &&
        [r1, r2, r3].every((r) => C.armReceiptVerdict("record", r).ok === false);
    })());
  t("§7 臂展没证实时这一腿的口径：机读前缀 NOT_SHOOTABLE(netFault=arm-unverified) + 明写 0 是仪器读数、不许据此记 EXECUTED/FAILED",
    (function () {
      const s = C.armUnshootableText({ mode: "fail-all" }, C.armReceiptVerdict("fail-all", { mocked: false, bag: false, requestType: "function" }));
      return /^NOT_SHOOTABLE\(netFault=arm-unverified\)/.test(s) && /仪器读数/.test(s) && /不许据此记 EXECUTED\/FAILED/.test(s);
    })());

  /* ── B-2 判点形状：arm 后置 + 页内重触发（反面样本 = 同一条真配方搬回旧形状）── */
  const armedRecipes = Object.entries(RECIPES.recipes || {}).filter(([, r]) => (r.steps || []).some((s) => s && s.do === "armNetFault"));
  t("§7 语料里每条带臂展的配方都是「open 后臂展 + 同段重触发 + 同段取件」（" + armedRecipes.map(([k]) => k.split("|")[1]).join(",") + "）",
    armedRecipes.length >= 3 && armedRecipes.every(([k, r]) => {
      const w = C.netFaultArmWindow(r.steps || []);
      return w.ok === true && w.arms >= 1 && w.droppedArms.length === 0 && w.noRetriggerArms.length === 0 && w.noDrainArms.length === 0;
    }), "带臂展配方=" + armedRecipes.length);
  t("§7 反面样本在盘：语料里确实存在「先 open 再臂展」的真实配方（不是为测试造的形状）",
    armedRecipes.every(([, r]) => { const i = (r.steps || []).findIndex((s) => s && s.do === "armNetFault"); const o = (r.steps || []).findIndex((s) => s && s.do === "open"); return i > o; }));
  /* 把 OC09 那一臂搬回 open 之前 —— 这正是 HEAD 在盘的旧形状（实测交出 intercepted=0 的那一版）。
     这条负例是整节的承重墙：它证明 netFaultArmWindow 会真的拦，而不是一路绿灯。 */
  t("§7 负例（真配方搬回旧形状）：把 OC09 的 armNetFault 移回最前 ⇒ 必须判 arm-dropped-by-open（旧行 intercepted=0 的根因被拦死）",
    (function () {
      const r = (RECIPES.recipes || {})["次要21|OC09"];
      if (!r) return false;
      const steps = r.steps.slice();
      const i = steps.findIndex((s) => s && s.do === "armNetFault");
      steps.unshift(steps.splice(i, 1)[0]);
      const w = C.netFaultArmWindow(steps);
      return w.ok === false && w.kind === "arm-dropped-by-open" && w.droppedArms.length >= 1;
    })());
  t("§7 负例：臂展后同段没有任何重触发 ⇒ no-retrigger；有重触发但不同段 drainNet ⇒ no-drain（三种失败互不折叠）",
    (function () {
      const r = (RECIPES.recipes || {})["次要21|OC09"];
      if (!r) return false;
      const noRet = r.steps.filter((s) => s && !C.NET_RETRIGGER_KINDS.includes(s.do));
      const noDr = r.steps.filter((s) => s && s.do !== "drainNet");
      const w1 = C.netFaultArmWindow(noRet);
      const w2 = C.netFaultArmWindow(noDr);
      return w1.ok === false && w1.kind === "no-retrigger" && w2.ok === false && w2.kind === "no-drain";
    })());
  t("§7 反面：配方只声明 netFault 字段却一步都没臂展 ⇒ netFaultArmWindow 回 not-armed 且 ok=null（不许把「没上腿」读成「判过了」）",
    (function () {
      const w = C.netFaultArmWindow([{ do: "open", page: "p" }, { do: "tap", selector: ".x" }]);
      return w.ok === null && w.kind === "not-armed" && C.armWindowNote({ mode: "record" }, w) === "off";
    })());
  t("§7 首屏那一半的诚实边界：firstLoadFaultGap 点名「桥 open 重启 AppService ⇒ 页首请求拦不到」，且明写不许记成产品 FAILED、不许拿重触发冒充首屏",
    (function () {
      const s = C.firstLoadFaultGap("OC09 判据原文「开页即失败」");
      return /^NOT_SHOOTABLE\(netFault=first-load\)/.test(s) && /重启 AppService/.test(s) &&
        /不许记成产品 FAILED/.test(s) && /冒充/.test(s) && /OC09/.test(s);
    })());

  /* ── 穿透链：正例取自语料，反面就是把同一条真链改成台账点名的两种错法 ── */
  const realChain = ((RECIPES.recipes || {})["次要20|OT05"] || { steps: [] }).steps
    .map((s) => (s.selectors || [s.selector].filter(Boolean))).flat().find((x) => String(x).indexOf(">>>") >= 0);
  t("§7 语料里的真穿透链段形合法（" + String(realChain).slice(0, 60) + "…）",
    !!realChain && C.validateDeepChain(realChain).ok === true, realChain);
  t("§7 负例：中间段写成路径形（台账 R3-OT-01 ①「编译标签是 components/…/RelationshipCTA」那句被产物证伪的错法）⇒ 必拦",
    (function () {
      if (!realChain) return false;
      const segs = C.deepChainSegments(realChain);
      const bad = ["components/profile/public/RelationshipCTA"].concat(segs.slice(2)).join(" >>> ");
      const dc = C.validateDeepChain(bad);
      return dc.ok === false && /路径形/.test(dc.reason) && /不是「组件不存在」/.test(dc.reason);
    })());
  t("§7 负例：把类名当组件段穿（.relationship-cta >>> .relationship-cta__btn--like）必拦；只剩一段的链也拦",
    C.validateDeepChain(".relationship-cta >>> .relationship-cta__btn--like").ok === false &&
      C.validateDeepChain(" >>> .x").ok === false &&
      C.validateDeepChain(".plain-page-selector").ok === true);
  /* 分段符两侧写空 = 静默丢掉那一段。这不是漏洞，是**解释器与校验器共用同一枚分段函数**的结果：
     r-exec-ws.mjs 的 deepSegs 与 validateDeepChain 都走 deepChainSegments（filter(Boolean)）。
     钉这一条钉的是「两处不许各自漂移」—— 哪天有人只改一边，校验放行而解释器另解，
     设备上就又是「不在页上」被误读成组件不存在（R3-02 ① 的原病）。 */
  t("§7 空段的一致处理：校验器与解释器必须同解（" + "a >>>  >>> b" + " 两边都读成两段，不许一处当三段）",
    (function () {
      const s = "profile-shell >>>  >>> .x";
      const segs = C.deepChainSegments(s);
      return segs.length === 2 && C.validateDeepChain(s).ok === true &&
        /String\(selector\)\.split\(DEEP_CHAIN_SEP\)\.map\(\(s\) => s\.trim\(\)\)\.filter\(Boolean\)/.test(wsSrc);
    })(), "deepChainSegments(" + "profile-shell >>>  >>> .x" + ")=" + C.deepChainSegments("profile-shell >>>  >>> .x").length + " 段");

  /* ── 载具接线（两条腿的上腿前形状闸 + 默认关的拒发分支）：文本判点 ──
     这些分支只有设备能真跑到，离线能证的只有「拒发在旗标判断之内、缺省路径逐字同形」。 */
  t("§7 WS 腿：handlerFallback 的第一步是「这一步没声明 handler 就返回 null」⇒ 既有配方的行一字不变（替代通道只接管声明过的步）",
    /if \(!step \|\| !step\.handler\) return null;/.test(wsSrc));
  t("§7 WS 腿：声明了 handler 但没带 --handler-call ⇒ 当场拒发并点名「替代通道未使用」，不退化成页级一次 tap（callHandler 步同一条）",
    (function () {
      const i = wsSrc.indexOf("async function handlerFallback");
      const j = wsSrc.indexOf("case \"callHandler\"");
      return i > 0 && j > 0 && /if \(!HANDLER_CALL\) return \{ fatal:/.test(wsSrc.slice(i, i + 1400)) &&
        /NOT_SHOOTABLE\(handlerCall\): 本腿没带 --handler-call/.test(wsSrc.slice(j, j + 900));
    })());
  t("§7 WS 腿：带 --navto-open 但这一步没声明 via=navto 时仍走桥 open，且行上点名是哪条通道没装（旗标默认关 = 缺省形态不变）",
    /step\.via === "navto" && !NAVTO_OPEN/.test(wsSrc) && /新开页通道未使用，仍走桥 open/.test(wsSrc));
  t("§7 WS 腿：臂展集成把 asFunctionDeclaration 的**返回值真用上**（只判不成函数却没换成函数对象 = 仍靠 SDK 嗅探分岔，那正是 R3-NET-04 的原病）",
    (function () {
      const i = wsSrc.indexOf("case \"armNetFault\"");
      const seg = wsSrc.slice(i, i + 2600);
      return /const mockFn = asFunctionDeclaration\(mockSrc\)/.test(seg) && /mini\.mockWxMethod\("request", mockFn\)/.test(seg) &&
        /NOT_SHOOTABLE\(netFault=arm-parse\)/.test(seg);
    })());
  t("§7 WS 腿：臂展装完必须回读回执，读不到就 restore + 拒发（「调用没抛」不等于「臂展在位」）",
    /interpretArmReceipt\(await capEval\(netFaultArmReceiptSource\(\)\)\)/.test(wsSrc) &&
      /if \(!rv\.ok\) return \{ fatal: armUnshootableText/.test(wsSrc) && /已 restore 以免臂展残留/.test(wsSrc));
  t("§7 WS 腿：上设备前的两道形状闸（穿透链段形 / 臂展窗）不合法就不上腿，行前缀 NOT_SHOOTABLE(recipe-chain|recipe-netShape)",
    /NOT_SHOOTABLE\(recipe-chain\)/.test(wsSrc) && /NOT_SHOOTABLE\(recipe-netShape\//.test(wsSrc) &&
      /if \(chainBad\.length\)/.test(wsSrc) && /w\.ok === false/.test(wsSrc));
  t("§7 WS 腿：旗标没开也要把「没用过」喊出来（WSX_OPEN_FORM / WSX_HANDLER_CALL 两条 banner + 行上 openForm[bridge…] 默认口）",
    /WSX_OPEN_FORM=/.test(wsSrc) && /WSX_HANDLER_CALL=/.test(wsSrc) && /一字未用/.test(wsSrc) &&
      /openForm\[bridge（本腿没用 navigateTo 开页形态）\]/.test(wsSrc));
  t("§7 两条腿的新通道旗标全部 argv 派生且默认关（没有任何一处把 NAVTO_OPEN/HANDLER_CALL 硬编码成 true）",
    (function () {
      const cliSrc = fs.readFileSync(path.join(REPO, "scripts", "qa", "r-exec-cli.mjs"), "utf8");
      const pats = [cliSrc, wsSrc].map((s) => /const (NAVTO_OPEN|HANDLER_CALL) = (?:flag\(|process\.argv\.includes\()/.test(s) &&
        !/const (NAVTO_OPEN|HANDLER_CALL) = true/.test(s));
      return pats.every(Boolean);
    })());
  t("§7 新载荷源全部过 uni 关（本仓两条在册设备事实：evaluate 上下文里任何 uni 记号都抛 ERR uni is not defined）",
    [C.navigateToSource("/a"), C.navigateToSyncSource("/a"), C.navReadSource(), hSrc, C.handlerDrainSource(), C.netFaultArmReceiptSource()]
      .every((s) => !/\buni\b/.test(s)));

  console.log("SUMMARY: assertion failures = " + fails);
  console.log("CAPRECIPES_TEST=" + (fails === 0 ? "PASS" : "FAIL") + "（checks=" + checks + "）");
  process.exit(fails === 0 ? 0 : 1);
}
main().catch((e) => { console.log("CAPRECIPES_TEST=FAIL stage=uncaught " + String((e && e.stack) || e).split("\n")[0]); console.log("SUMMARY: assertion failures = " + (fails + 1)); process.exit(1); });
