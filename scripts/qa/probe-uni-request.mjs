/* 探针 #9：应用侧 uni.request（门面路径）vs wx.request（raw）同 URL 对照 —— 取 fail 的 errMsg。 */
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
const login = await apiPost("/api/v1/auth/phone-login", { phone, password, deviceId: "qa-probe9" });
const token = JSON.parse(login.body).token;

const A = automator();
const PORT = readIdePort().port;
const mini = await A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT });

const r = await mini.evaluate((t) => {
  return new Promise((res) => {
    const out = {};
    const done = () => { if (out.uni && out.wx) res(JSON.stringify(out)); };
    try {
      wx.setStorageSync("token", t);
      const idx = require("common/vendor.js").index;
      idx.request({
        url: "http://127.0.0.1:8080/api/v1/auth/me", method: "GET",
        header: { Authorization: "Bearer " + t },
        success: (r2) => { out.uni = "OK " + r2.statusCode + " " + JSON.stringify(r2.data).slice(0, 80); done(); },
        fail: (e) => { out.uni = "FAIL " + JSON.stringify(e).slice(0, 160); done(); },
      });
      wx.request({
        url: "http://127.0.0.1:8080/api/v1/auth/me", method: "GET",
        header: { Authorization: "Bearer " + t },
        success: (r2) => { out.wx = "OK " + r2.statusCode + " " + JSON.stringify(r2.data).slice(0, 80); done(); },
        fail: (e) => { out.wx = "FAIL " + JSON.stringify(e).slice(0, 160); done(); },
      });
      setTimeout(() => { out.timeout = "8s"; res(JSON.stringify(out)); }, 8000);
    } catch (e) { res("ERR " + e.message); }
  });
}, token);
console.log("PROBE9_CMP " + String(r).slice(0, 420));

mini.disconnect();
console.log("PROBE9_DONE");
process.exit(0);
