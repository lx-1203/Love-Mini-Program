/* 探针 #5：WS boot 在 real 档为什么 store 报 not-logged-in —— 应用侧现场取证（只读）。 */
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
const login = await apiPost("/api/v1/auth/phone-login", { phone, password, deviceId: "qa-probe5" });
const token = JSON.parse(login.body).token;

const A = automator();
const PORT = readIdePort().port;
const mini = await A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT });
console.log("PROBE5_CONNECT port=" + PORT);

const st1 = await mini.evaluate(() => JSON.stringify({
  tokenBefore: String(wx.getStorageSync("token") || "").slice(0, 20),
  keys: (() => { try { return wx.getStorageInfoSync().keys.slice(0, 20); } catch (e) { return String(e.message); } })(),
}));
console.log("PROBE5_BEFORE " + st1);

const boot = await mini.evaluate(async (t) => {
  try {
    wx.setStorageSync("token", t);
    var app = getApp(); var vm = app["$vm"];
    var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
    var p = vm["$pinia"] || gp["$pinia"];
    var st = p._s.get("session"); if (st && st.bootstrap) { await st.bootstrap(); }
    return JSON.stringify({ boot: "ok", tokenAfter: String(wx.getStorageSync("token") || "").slice(0, 20), loggedIn: !!(st && st.isLoggedIn), userSession: st && st.userSession ? { loggedIn: st.userSession.loggedIn, userId: st.userSession.userId, err: st.errorMessage } : null });
  } catch (e) { return "ERR " + e.message; }
}, token);
console.log("PROBE5_BOOT " + String(boot).slice(0, 400));

const st2 = await mini.evaluate(() => {
  try {
    var app = getApp(); var vm = app["$vm"];
    var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
    var p = vm["$pinia"] || gp["$pinia"];
    var st = p._s.get("session");
    return JSON.stringify({ loggedIn: st && st.isLoggedIn, loading: st && st.loading, err: st && st.errorMessage, us: st && st.userSession ? { loggedIn: st.userSession.loggedIn, userId: st.userSession.userId } : null });
  } catch (e) { return "ERR " + e.message; }
});
console.log("PROBE5_AFTER " + String(st2).slice(0, 400));

/* 应用侧直接打 /auth/me（带 Authorization）看网络层通不通 */
const me = await mini.evaluate(async () => {
  return new Promise((res) => {
    try {
      var tk = wx.getStorageSync("token");
      wx.request({ url: "http://127.0.0.1:8080/api/v1/auth/me", method: "GET", header: { Authorization: "Bearer " + tk }, success: (r) => res("REQ_OK " + r.statusCode + " " + JSON.stringify(r.data).slice(0, 120)), fail: (e) => res("REQ_FAIL " + JSON.stringify(e).slice(0, 160)) });
      setTimeout(() => res("REQ_TIMEOUT"), 8000);
    } catch (e) { res("ERR " + e.message); }
  });
});
console.log("PROBE5_AUTHME " + String(me).slice(0, 240));

mini.disconnect();
console.log("PROBE5_DONE");
process.exit(0);
