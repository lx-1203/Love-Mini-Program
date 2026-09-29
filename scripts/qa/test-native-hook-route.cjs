#!/usr/bin/node
/* 负例（capability 车道 #1 续：原生 toast 捕获通道到底挂没挂上「被运行时真正读到的那条」）
   ── 这条测试要钉住的病 ──────────────────────────────────────────────────────────────
   r-exec-cli.mjs 的 nativeHookSource() 包的是 wx.* 那一层，注释(:588)断言
   「uni.showToast 最终落到 wx.showToast ⇒ 覆盖得到」。产物 common/vendor.js 里 uni 是一枚 Proxy，
   get-trap 默认分支走 `Tn(i, r(i, n[i]))`，其中 n=`ji`=`Hi()` 在**启动期**从 wx 复制出来的私有表
   (`function Hi(){const e={};for(const t in wx)Gf(t)&&(e[t]=wx[t]);...}`，`const ji=Hi();var Fr=Vf(Zf,tp,ji)`)。
   ⇒ 装钩子之后再 `wx.showToast=wrapper` 改的是 global 那枚 wx，不是 `ji`，uni 派生的仍是启动期那份原函数。
   于是本通道产出的每一条 toast 读数都是「0」，而那个 0 的含义是「我的钩子被绕开了」，却被报成「app 没弹 toast」——
   这是仪器坏了去指控产品。**这条测试离线跑真产物就能把它判红**（同 exec-network-observe.mjs 对 request 的独立结论）。
   ── 空转防护 ────────────────────────────────────────────────────────────────────
   A3「绕开」这一断言不是空转的：A7 用另一枚拓扑（requireMiniProgram 未定义 ⇒ globalThis.wx 被 Hi() 覆写成 ji 本身）
   跑同一段代码，那一份必须**反过来**（钩子被看到）。两份拓扑给出相反结果，才证明 A3 测的是运行时真读的那枚对象。
   ── 输出 ──────────────────────────────────────────────────────────────────────
   SUMMARY: assertion failures = N（照 run-qa-selftests.mjs:49）
   NATIVE_HOOK_ROUTE=PASS|FAIL + HOOK_ROUTE=<verdict>（机器行）
   跑法：PATH=<node22 目录>:$PATH node scripts/qa/test-native-hook-route.cjs
   只读产物、只读活文件，不碰设备、不取租约、不派生 IDE、不写仓库（产物全程只读）。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const REPO = path.resolve(__dirname, "..", "..");
const VENDOR = path.join(REPO, "apps", "client", "dist", "build", "mp-weixin", "common", "vendor.js");
const TOAST_APIS = ["showToast", "hideToast", "showModal", "showLoading"];

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 300))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 170) + ")"));
}

if (!fs.existsSync(VENDOR)) {
  console.log("FAIL 产物缺失，无法离线实测 " + path.relative(REPO, VENDOR));
  console.log("SUMMARY: assertion failures = 1");
  console.log("NATIVE_HOOK_ROUTE=FAIL\nHOOK_ROUTE=INCONCLUSIVE vendor=absent proof=executed");
  process.exit(1);
}

// 在 vm 里加载**真产物**，两种拓扑各跑一次；requireMiniProgram 决定 Hi() 要不要覆写 globalThis.wx。
function boot(requireMiniProgramDefined) {
  const trace = [];
  const mk = (n) => function (o) { trace.push("ORIG:" + n); return { errMsg: n + ":ok" }; };
  const wx = {};
  ["showToast", "hideToast", "showModal", "showLoading", "hideLoading", "request",
    "getSystemInfoSync", "getAppBaseInfo", "getWindowInfo", "getDeviceInfo",
    "getLaunchOptionsSync", "canIUse", "createSelectorQuery"].forEach((n) => { wx[n] = mk(n); });
  wx.env = {};
  let code = fs.readFileSync(VENDOR, "utf8");
  code += "\n;globalThis.__p={Fr:(typeof Fr!==\"undefined\"?Fr:null),ji:(typeof ji!==\"undefined\"?ji:null),Pf:(typeof Pf!==\"undefined\"?Pf:null)};";
  const noop = () => {};
  const sb = {
    console, exports: {}, Date, JSON, Math, Promise, Object, Array, Function, String, Number,
    Boolean, Symbol, Map, Set, RegExp, Error, TypeError, setTimeout, clearTimeout, setInterval,
    clearInterval, wx, Page: noop, App: noop, Component: noop, Behavior: noop,
    getApp: () => ({}), getCurrentPages: () => [],
  };
  sb.global = sb; sb.globalThis = sb;
  if (requireMiniProgramDefined) sb.requireMiniProgram = () => ({});
  vm.createContext(sb);
  vm.runInContext(code, sb, { filename: "vendor.js" });
  return { sb, trace, uni: sb.__p.Fr, ji: sb.__p.ji, Pf: sb.__p.Pf };
}

// ── 1. 静态机制：把结论钉死在产物字节上（不改产物，只读）──
const raw = fs.readFileSync(VENDOR, "utf8");
t("产物里 uni 是一枚 Proxy：Vf 的 get-trap 默认分支读的是第三参表 n[i]（不是 global wx）",
  /function Vf\([^)]*n=wx\)\{[^]*?return new Proxy\(\{\},o\)\}/.test(raw));
t("产物里 get-trap 默认分支确为 Tn(i,r(i,n[i]))（调用期读私有表 n，非 global wx）",
  /Tn\(i,r\(i,n\[i\]\)\)/.test(raw));
t("产物里存在启动期快照 Hi()：for(const t in wx)Gf(t)&&(e[t]=wx[t])（按值复制函数引用）",
  /function Hi\(\)\{const e=\{\};for\(const t in wx\)Gf\(t\)&&\(e\[t\]=wx\[t\]\)/.test(raw));
t("产物里 Fr=Vf(Zf,tp,ji) 且 ji=Hi()（uni 的第三参=启动期私有快照）",
  /const ji=Hi\(\);var Fr=Vf\([^,]+,[^,]+,ji\)/.test(raw));

// ── 2~6. 动态实测：忠实拓扑（requireMiniProgram 已定义 ⇒ globalThis.wx 独立于 ji）──
const F = boot(true);
t("真产物里拿得到 uni（Fr）且 uni.showToast 是函数", F.uni && typeof F.uni.showToast === "function");
t("忠实拓扑下 globalThis.wx 与 Proxy 私有表 ji 是**不同对象**（钩子改前者碰不到后者）",
  F.sb.wx !== F.ji);

// 装钩子那一步（照 r-exec-cli.mjs nativeHookSource 的语义：改 global wx.showToast）
F.trace.length = 0;
let hookSeen = 0;
const origWxToast = F.sb.wx.showToast;
F.sb.wx.showToast = function (o) { hookSeen++; F.trace.push("HOOK:wx"); return origWxToast.apply(F.sb.wx, arguments); };
F.trace.length = 0;
F.uni.showToast({ title: "登录后继续" });
const ran = F.trace.slice();
t("【核心·假红机制】装钩子后再调 uni.showToast：wx 层 wrapper **没被看到**（=启动期快照被派生，绕开）",
  hookSeen === 0 && ran.indexOf("HOOK:wx") === -1 && ran.indexOf("ORIG:showToast") === 0,
  "hookSeen=" + hookSeen + " trace=" + JSON.stringify(ran));
t("绕开可复现：ji.showToast 身份未因 wx 重写而变（uni 仍派生那份原函数）",
  F.ji.showToast === origWxToast || typeof F.ji.showToast === "function");

// 拦截器通道（推荐缝）：与被绕开的 wx 缝正交，验证它落在运行时真读的那条上
let icHit = 0, icTitle = "";
F.uni.addInterceptor("showToast", { invoke(o) { icHit++; if (o) icTitle = o.title; } });
F.uni.showToast({ title: "apiErrors.loginRequired", icon: "none" });
t("推荐缝生效：uni.addInterceptor('showToast',{invoke}) 的 invoke 被回调，且拿到 payload.title",
  icHit === 1 && /loginRequired/.test(icTitle), "icHit=" + icHit + " title=" + icTitle);
t("四个 toast API 在产物谓词里 Pf 全为 true（都在可拦截集内，与 request 同族）",
  TOAST_APIS.every((a) => F.Pf(a) === true), TOAST_APIS.map((a) => a + "=" + F.Pf(a)).join(","));

// uni-assign 备用缝：Proxy 无 set trap ⇒ 落在 target，get 直接返回它；且不脏化 ji
let setHit = 0;
const jiBefore = F.ji.showToast;
F.uni.showToast = function (o) { setHit++; };
const sticky = typeof F.uni.showToast === "function" && F.ji.showToast === jiBefore;
F.uni.showToast({ title: "x" });
t("备用缝 uni.showToast=wrapper 在 get 处粘得住（set 无陷阱、不改 ji）", sticky && setHit === 1,
  "sticky=" + sticky + " setHit=" + setHit);
delete F.uni.showToast;

// 透传要求：invoke 返回 false 会掐掉调用（所以捕获钩子的 invoke 绝不许 return false）
F.uni.addInterceptor("showLoading", { invoke() { return false; } });
const killed = F.uni.showLoading({ title: "x" });
t("透传纪律：invoke 返回 false 会掐死本次调用 ⇒ 捕获型钩子必须 return 非 false（否则改产品行为）",
  !(killed && killed.errMsg), "ret=" + JSON.stringify(killed));

// ── 7. 空转防护：另一枚拓扑（requireMiniProgram 未定义 ⇒ Hi() 把 globalThis.wx 覆写成 ji 本身）必须翻红 ──
const G = boot(false);
const aliased = G.sb.wx === G.ji;   // 覆写后 globalThis.wx 就是 ji（最后一次 Hi 写回的是自己的 e）
let hookSeen2 = 0;
const o2 = G.sb.wx.showToast;
G.sb.wx.showToast = function (o) { hookSeen2++; return o2.apply(G.sb.wx, arguments); };
G.uni.showToast({ title: "y" });
t("空转防护：同一份代码在「wx 被覆写成 ji」的拓扑里钩子**被看到**（⇒ A5 的绕开是真测出来的，不是恒假）",
  aliased === true && hookSeen2 === 1, "aliased=" + aliased + " hookSeen2=" + hookSeen2);

const verdict = (hookSeen === 0 && icHit === 1) ? "CONFIRMED_BYPASS" : (hookSeen === 1 ? "HOOK_OK" : "INCONCLUSIVE");
console.log("SUMMARY: assertion failures = " + fails);
console.log(fails ? "NATIVE_HOOK_ROUTE=FAIL" : "NATIVE_HOOK_ROUTE=PASS");
console.log("HOOK_ROUTE=" + verdict + " uni_route=snapshot interceptable=" + TOAST_APIS.join(",") + " wx_hook=bypassed addInterceptor=live proof=executed");
process.exit(fails ? 1 : 0);
