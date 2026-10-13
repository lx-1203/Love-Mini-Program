/* 探针 #2：C1 应用侧拦截路径的最终判定。
   背景：vendor.js 实测 Fr=Vf(Zf,tp,ji) 是 Proxy，get 里 Tn(i, r(i, n[i])) 在**访问时**才读 n[i]；
   n=ji=Hi() 的返回对象，且 Hi() 里 globalThis.wx=e ⇒ 快照对象与全局 wx 是同一个对象。
   那么只要 IDE 的 App.mockWxMethod 把 mock 落在这个对象上，应用侧 uni.showModal（=Fr.showModal）
   就会在调用时读到 mock —— 这一条必须在设备上证实/证伪，不许推断。
   Q1: mini.evaluate 上下文里有哪些全局（wx/getApp/require/uni）；
   Q2: 若 require 可达：require('common/vendor.js').index.showModal 走 Proxy ⇒ mock 是否拦到；
   Q3: wx 对象身份：evaluate 里给 wx 挂探针属性，再从 globalThis.wx 读 ⇒ 是否同一对象。
   用法：node scripts/qa/probe-mock-channel2.mjs --project apps/client/dist/build/mp-weixin-real */
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { readIdePort } from "./ide-port-config.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require2 = createRequire(import.meta.url);
function automator() {
  try { return require2("miniprogram-automator"); } catch { /* fallthrough */ }
  const store = join(REPO, "node_modules", ".pnpm");
  const hit = readdirSync(store).filter((d) => d.startsWith("miniprogram-automator@")).sort()[0];
  return hit ? require2(join(store, hit, "node_modules", "miniprogram-automator")) : null;
}
const A = automator();
const PORT = readIdePort().port;
const mini = await A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT });
console.log("PROBE2_CONNECT port=" + PORT);

/* Q1 上下文全局 */
const globals = await mini.evaluate(() => {
  try {
    const r = {
      wx: typeof wx, getApp: typeof getApp, getCurrentPages: typeof getCurrentPages,
      uni: typeof uni, require: typeof require, globalThisWx: typeof globalThis !== "undefined" && typeof globalThis.wx,
    };
    if (r.wx === "object" && r.globalThisWx === "object") {
      r.wxIsGlobalThisWx = wx === globalThis.wx;
      r.showModalType = typeof wx.showModal;
    }
    return JSON.stringify(r);
  } catch (e) { return "ERR " + e.message; }
});
console.log("PROBE2_GLOBALS " + String(globals).slice(0, 300));

/* Q3 wx 对象身份探针 */
const ident = await mini.evaluate(() => {
  try {
    wx.__qaIdentProbe = "qa-probe-" + 42;
    const fromGlobal = globalThis.wx ? globalThis.wx.__qaIdentProbe : "(no globalThis.wx)";
    delete wx.__qaIdentProbe;
    return "IDENT wx.__qaIdentProbe 回读=" + fromGlobal + " ⇒ " + (fromGlobal === "qa-probe-42" ? "同一对象" : "不同对象");
  } catch (e) { return "ERR " + e.message; }
});
console.log("PROBE2_IDENT " + ident);

/* Q2 应用侧（走 vendor 模块的 Fr Proxy）是否被 mock 拦到 */
try {
  await mini.mockWxMethod("showModal", { confirm: true, cancel: false, errMsg: "showModal:ok" });
  const r = await mini.evaluate(() => {
    return new Promise((res) => {
      try {
        let idx = null;
        if (typeof require === "function") {
          try { idx = require("common/vendor.js").index; } catch (e1) {
            try { idx = require("../../common/vendor.js").index; } catch (e2) { res("REQUIRE_FAIL " + e1.message + " / " + e2.message); return; }
          }
        }
        if (!idx) { res("NO_INDEX（require 不可达或模块没有 index 导出）"); return; }
        const called = typeof idx.showModal;
        if (called !== "function") { res("INDEX_SHOWMODAL=" + called); return; }
        idx.showModal({
          title: "probe2-app-side",
          success: (r2) => res("APP_RESULT " + JSON.stringify(r2)),
          fail: (e2) => res("APP_FAIL " + JSON.stringify(e2)),
        });
        setTimeout(() => res("APP_TIMEOUT 6s 无回调"), 6000);
      } catch (e) { res("ERR " + e.message); }
    });
  });
  console.log("PROBE2_APP_MODAL " + String(r).slice(0, 260) + " ⇒ 判读=" + (/APP_RESULT .*"confirm":true/.test(String(r)) ? "应用侧被mock拦到 ✓" : /APP_RESULT/.test(String(r)) ? "应用侧走了原API（没拦到）✗" : String(r).slice(0, 50)));
} catch (e) { console.log("PROBE2_APP_MODAL ERR " + String(e.message).slice(0, 140)); }

/* Q2b 同法测 wx.request（C3 通道） */
try {
  await mini.mockWxMethod("request", { statusCode: 500, data: { qaMocked: true }, errMsg: "request:ok" });
  const r = await mini.evaluate(() => {
    return new Promise((res) => {
      try {
        let idx = null;
        try { idx = require("common/vendor.js").index; } catch (e1) {
          try { idx = require("../../common/vendor.js").index; } catch (e2) { res("REQUIRE_FAIL"); return; }
        }
        if (!idx) { res("NO_INDEX"); return; }
        idx.request({
          url: "http://127.0.0.1:8080/api/v1/app-config", method: "GET",
          success: (r2) => res("APP_REQ " + JSON.stringify(r2).slice(0, 220)),
          fail: (e2) => res("APP_REQ_FAIL " + JSON.stringify(e2).slice(0, 220)),
        });
        setTimeout(() => res("APP_REQ_TIMEOUT"), 8000);
      } catch (e) { res("ERR " + e.message); }
    });
  });
  console.log("PROBE2_APP_REQUEST " + String(r).slice(0, 280) + " ⇒ 判读=" + (/statusCode":500|qaMocked/.test(String(r)) ? "应用侧请求被mock拦到（C3 通道可行）✓" : /APP_REQ_FAIL/.test(String(r)) ? "fail分支（看errMsg 判来源）" : "没拦到 ✗"));
} catch (e) { console.log("PROBE2_APP_REQUEST ERR " + String(e.message).slice(0, 140)); }

for (const m of ["showModal", "request"]) {
  try { await mini.restoreWxMethod(m); console.log("PROBE2_RESTORE " + m + "=ok"); }
  catch (e) { console.log("PROBE2_RESTORE " + m + "=ERR " + String(e.message).slice(0, 80)); }
}
mini.disconnect();
console.log("PROBE2_DONE（已 disconnect，未 close()）");
process.exit(0);
