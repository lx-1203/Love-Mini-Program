/* 探针 #11：patch uni 门面的 request 槽位记录 getSession 的原始 fail errMsg。
   依据：Fr 是 Proxy，get 陷阱先查 target（C(s,i)?s[i]）⇒ 给门面赋值一个记录器会被读到。 */
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
function apiPost(path, payload) {
  return new Promise((res, rej) => {
    const body = Buffer.from(JSON.stringify(payload || {}), "utf8");
    const r = http.request({ host: "127.0.0.1", port: 8080, path, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": body.length, "Idempotency-Key": crypto.randomUUID() }, timeout: 15000 },
      (x) => { let d = ""; x.on("data", (c) => (d += c)); x.on("end", () => res({ status: x.statusCode, body: d })); });
    r.on("error", rej); r.write(body); r.end();
  });
}
const s = readFileSync(resolve(REPO, "tmp/r11_chains2.py"), "utf8");
const phone = /"phone"\s*:\s*"(\d{11})"/.exec(s)[1];
const password = /"password"\s*:\s*"([^"]+)"/.exec(s)[1];
const login = await apiPost("/api/v1/auth/phone-login", { phone, password, deviceId: "qa-probe11" });
const token = JSON.parse(login.body).token;

const A = automator();
const PORT = readIdePort().port;
const mini = await A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT });

const r = await mini.evaluate(async (t) => {
  const out = {};
  try {
    wx.setStorageSync("token", t);
    const idx = require("common/vendor.js").index;
    const orig = wx.request.bind(wx);
    idx.request = function (opts) {
      const wrapped = Object.assign({}, opts, {
        success: (r2) => { try { globalThis.__qaReqLog.push({ ok: true, url: opts && opts.url, status: r2 && r2.statusCode }); } catch (e) {} if (opts.success) opts.success(r2); },
        fail: (e) => { try { globalThis.__qaReqLog.push({ ok: false, url: opts && opts.url, errMsg: e && e.errMsg }); } catch (e2) {} if (opts.fail) opts.fail(e); },
      });
      return orig(wrapped);
    };
    globalThis.__qaReqLog = [];
    var app = getApp(); var vm = app["$vm"];
    var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
    var p = vm["$pinia"] || gp["$pinia"];
    var st = p._s.get("session");
    try { await st.refreshSession(); out.refresh = "ok"; } catch (e1) { out.refreshErr = String(e1 && e1.message).slice(0, 120); }
    out.log = (globalThis.__qaReqLog || []).slice(0, 6);
    out.us = st.userSession ? { loggedIn: st.userSession.loggedIn, userId: st.userSession.userId } : null;
    /* 还原槽位 */
    idx.request = orig;
  } catch (e) { out.err = String(e && e.message).slice(0, 200); }
  return JSON.stringify(out);
}, token);
console.log("PROBE11_PATCH " + String(r).slice(0, 600));

mini.disconnect();
console.log("PROBE11_DONE");
process.exit(0);
