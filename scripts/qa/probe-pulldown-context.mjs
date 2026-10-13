/* 探针 #4：C6 修复机制 + C1 函数式 mock + AppService toast 钩子的设备实测。
   Q1: evaluate 上下文里 wx.startPullDownRefresh 是否可用（C6 修复主路径：完全绕开 uni 记号）；
   Q2: require('common/vendor.js') 在 App.callFunction 上下文是否可达（C1/C3 的应用侧 fallback）；
   Q3: mockWxMethod 的函数式 mock 是否应用侧执行、能否收参数、能否记账（C1 驱动+观察分列的机制）；
   Q4: r1-exec.cjs:278-299 的 toast 钩子在 mini.evaluate 下是否 installed（WS 行的观察半边）。
   开页用 village/index（有 onPullDownRefresh 与 post-card 组件）——需 A 登录态。
   全程只读 + mock 演练后全部 restore，零落盘。 */
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import http from "node:http";
import crypto from "node:crypto";
import { readIdePort } from "./ide-port-config.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require2 = createRequire(import.meta.url);
function automator() {
  try { return require2("miniprogram-automator"); } catch { /* fallthrough */ }
  const store = join(REPO, "node_modules", ".pnpm");
  const hit = readdirSync(store).filter((d) => d.startsWith("miniprogram-automator@")).sort()[0];
  return hit ? require2(join(store, hit, "node_modules", "miniprogram-automator")) : null;
}
function apiPost(path, payload, { port = 8080, timeoutMs = 15000 } = {}) {
  return new Promise((res, rej) => {
    const body = Buffer.from(JSON.stringify(payload || {}), "utf8");
    const r = http.request({ host: "127.0.0.1", port, path, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": body.length, "Idempotency-Key": crypto.randomUUID() }, timeout: timeoutMs },
      (x) => { let d = ""; x.on("data", (c) => (d += c)); x.on("end", () => res({ status: x.statusCode, body: d })); });
    r.on("error", rej); r.on("timeout", () => r.destroy(new Error("api timeout")));
    r.write(body); r.end();
  });
}
const s = readFileSync(resolve(REPO, "tmp/r11_chains2.py"), "utf8");
const phone = /"phone"\s*:\s*"(\d{11})"/.exec(s)[1];
const password = /"password"\s*:\s*"([^"]+)"/.exec(s)[1];
const login = await apiPost("/api/v1/auth/phone-login", { phone, password, deviceId: "qa-probe4" });
const token = JSON.parse(login.body).token;

const A = automator();
const PORT = readIdePort().port;
const mini = await A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT });
console.log("PROBE4_CONNECT port=" + PORT);

/* 登录态：写 token + bootstrap（同 r-exec-ws wsBootSession） */
const boot = await mini.evaluate((t) => {
  try {
    wx.setStorageSync("token", t);
    var app = getApp(); var vm = app["$vm"];
    var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
    var p = vm["$pinia"] || gp["$pinia"];
    var st = p._s.get("session"); if (st && st.bootstrap) { st.bootstrap(); }
    return "boot-ok";
  } catch (e) { return "ERR " + e.message; }
}, token);
console.log("PROBE4_BOOT " + boot);

/* Q1: wx.startPullDownRefresh 可用性（不动页面，只看类型；真调用放到开页后） */
const q1 = await mini.evaluate(() => {
  try {
    return JSON.stringify({ wxType: typeof wx, pull: typeof (wx && wx.startPullDownRefresh), stop: typeof (wx && wx.stopPullDownRefresh) });
  } catch (e) { return "ERR " + e.message; }
});
console.log("PROBE4_Q1_wxPull " + q1);

/* Q2: require 可达性 */
const q2 = await mini.evaluate(() => {
  try {
    if (typeof require !== "function") return "NO_REQUIRE";
    const idx = require("common/vendor.js").index;
    return "REQUIRE_OK index.showModal=" + typeof idx.showModal + " index.startPullDownRefresh=" + typeof idx.startPullDownRefresh;
  } catch (e) { return "ERR " + e.message; }
});
console.log("PROBE4_Q2_require " + q2);

/* Q4: toast 钩子（r1-exec installToastHook 同源） */
const hook = await mini.evaluate(() => {
  try {
    if (globalThis.__qaHooked) return "already";
    globalThis.__qaToasts = [];
    const wrap = (name) => {
      try {
        const orig = wx[name] ? wx[name].bind(wx) : null;
        if (!orig) return;
        wx[name] = function (o) {
          try { globalThis.__qaToasts.push({ api: name, title: o && o.title, ts: Date.now() }); } catch (e) { /* ignore */ }
          return orig.apply(wx, arguments);
        };
      } catch (e) { /* ignore */ }
    };
    wrap("showToast"); wrap("hideToast"); wrap("showModal"); wrap("showLoading");
    globalThis.__qaHooked = true;
    return "installed";
  } catch (e) { return "ERR " + e.message; }
});
console.log("PROBE4_Q4_hook " + hook);

/* 开 village/index（有 onPullDownRefresh） */
const { openPage } = await import("./cli-automator.mjs");
const PROJECT = resolve(REPO, "apps/client/dist/build/mp-weixin-real");
openPage("subpackages/village/village/index", "", { project: PROJECT });
await new Promise((r) => setTimeout(r, 3000));
const pg = await mini.currentPage();
console.log("PROBE4_PAGE " + (pg && pg.path));

/* Q1b: 真发一次 wx.startPullDownRefresh + stop（绕开 uni 记号的 C6 修复路径实测） */
const q1b = await mini.evaluate(() => {
  try {
    if (typeof wx.startPullDownRefresh !== "function") return "no-api";
    wx.startPullDownRefresh();
    return "wx-ok";
  } catch (e) { return "ERR " + e.message; }
});
await new Promise((r) => setTimeout(r, 1200));
const q1c = await mini.evaluate(() => { try { wx.stopPullDownRefresh(); return "stopped"; } catch (e) { return "ERR " + e.message; } });
console.log("PROBE4_Q1b_pullDown " + q1b + " stop=" + q1c);

/* Q3: 函数式 mock（记录参数 + 脚本化回值） */
try {
  await mini.mockWxMethod("showModal", function (args) {
    try {
      globalThis.__qaModalCalls = globalThis.__qaModalCalls || [];
      globalThis.__qaModalCalls.push({ title: args && args.title, ts: Date.now() });
    } catch (e) { /* ignore */ }
    var answers = globalThis.__qaModalAnswers || [];
    var i = (globalThis.__qaModalCalls || []).length - 1;
    var a = answers[i] || answers[answers.length - 1] || { confirm: true };
    return { confirm: !!a.confirm, cancel: !a.confirm, errMsg: "showModal:ok(mock)" };
  });
  const trig = await mini.evaluate(() => {
    try {
      const idx = require("common/vendor.js").index;
      return new Promise((res) => {
        idx.showModal({ title: "probe4-fn-mock", success: (r2) => res("APP_RESULT " + JSON.stringify(r2)), fail: (e2) => res("APP_FAIL " + JSON.stringify(e2)) });
        setTimeout(() => res("APP_TIMEOUT"), 5000);
      });
    } catch (e) { return "ERR " + e.message; }
  });
  const drain = await mini.evaluate(() => JSON.stringify(globalThis.__qaModalCalls || []));
  console.log("PROBE4_Q3_fnMock trig=" + String(trig).slice(0, 140) + " calls=" + String(drain).slice(0, 160));
} catch (e) { console.log("PROBE4_Q3_fnMock ERR " + String(e.message).slice(0, 140)); }

/* Q4b: 触发一次 toast 验证钩子收流 */
try {
  await mini.evaluate(() => { try { require("common/vendor.js").index.showToast({ title: "qa-probe4-toast", icon: "none" }); } catch (e) { return "ERR " + e.message; } });
  await new Promise((r) => setTimeout(r, 900));
  const toasts = await mini.evaluate(() => JSON.stringify((globalThis.__qaToasts || []).splice(0)));
  console.log("PROBE4_Q4b_toasts " + String(toasts).slice(0, 200));
} catch (e) { console.log("PROBE4_Q4b ERR " + String(e.message).slice(0, 120)); }

/* 收尾：restore + 停刷新 */
try { await mini.restoreWxMethod("showModal"); console.log("PROBE4_RESTORE showModal=ok"); } catch (e) { console.log("PROBE4_RE showModal ERR"); }
try { await mini.evaluate(() => { try { wx.stopPullDownRefresh(); } catch (e) { /* ignore */ } return "ok"; }); } catch (e) { /* ignore */ }
mini.disconnect();
console.log("PROBE4_DONE（已 disconnect，未 close()）");
process.exit(0);
