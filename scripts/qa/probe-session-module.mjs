/* 探针 #7：应用自己的 getSession/getLoginHero 在 AppService 里到底回了什么/抛了什么。 */
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
const login = await apiPost("/api/v1/auth/phone-login", { phone, password, deviceId: "qa-probe7" });
const token = JSON.parse(login.body).token;

const A = automator();
const PORT = readIdePort().port;
const mini = await A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT });

const r = await mini.evaluate(async (t) => {
  const out = {};
  try {
    wx.setStorageSync("token", t);
    const api = require("../../services/api.js");
    out.apiType = typeof api;
    out.hasGetSession = typeof (api && api.getSession);
    try { out.getSession = JSON.stringify(await api.getSession()).slice(0, 160); }
    catch (e1) { out.getSessionErr = String(e1 && e1.message).slice(0, 200); }
    try { out.getLoginHero = JSON.stringify(await api.getLoginHero()).slice(0, 80); }
    catch (e2) { out.getLoginHeroErr = String(e2 && e2.message).slice(0, 200); }
  } catch (e) { out.err = String(e && e.message).slice(0, 200); }
  return JSON.stringify(out);
}, token);
console.log("PROBE7_APPAPI " + String(r).slice(0, 700));

mini.disconnect();
console.log("PROBE7_DONE");
process.exit(0);
