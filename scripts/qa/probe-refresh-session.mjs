/* 探针 #8：session store 的 refreshSession 在应用里抛什么（boot 失败的真因取证）。 */
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
const login = await apiPost("/api/v1/auth/phone-login", { phone, password, deviceId: "qa-probe8" });
const token = JSON.parse(login.body).token;

const A = automator();
const PORT = readIdePort().port;
const mini = await A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT });

const r = await mini.evaluate(async (t) => {
  const out = {};
  try {
    wx.setStorageSync("token", t);
    var app = getApp(); var vm = app["$vm"];
    var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
    var p = vm["$pinia"] || gp["$pinia"];
    var st = p._s.get("session");
    try { await st.refreshSession(); out.refresh = "ok"; } catch (e1) { out.refreshErr = String(e1 && e1.message).slice(0, 260); }
    out.us = st.userSession ? { loggedIn: st.userSession.loggedIn, userId: st.userSession.userId } : null;
    out.errMsg = st.errorMessage ? String(st.errorMessage).slice(0, 160) : null;
    out.tokenSeen = String(wx.getStorageSync("token") || "").slice(0, 16);
  } catch (e) { out.err = String(e && e.message).slice(0, 200); }
  return JSON.stringify(out);
}, token);
console.log("PROBE8_REFRESH " + String(r).slice(0, 500));

/* 对照：boot 里那两条 Promise.all 的另一半 getLoginHero —— 单独看它抛不抛 */
const r2 = await mini.evaluate(async () => {
  const out = {};
  try {
    var app = getApp(); var vm = app["$vm"];
    var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
    var p = vm["$pinia"] || gp["$pinia"];
    var st = p._s.get("session");
    out.hasLoginHero = typeof st.loginHero;
    out.useMock = null;
    try {
      const envmod = require("common/vendor.js");
      out.vendorKeys = Object.keys(envmod).length;
    } catch (e2) { out.vendorErr = String(e2.message).slice(0, 80); }
  } catch (e) { out.err = String(e && e.message).slice(0, 200); }
  return JSON.stringify(out);
});
console.log("PROBE8_STORE " + String(r2).slice(0, 300));

mini.disconnect();
console.log("PROBE8_DONE");
process.exit(0);
