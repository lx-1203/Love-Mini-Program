/* 探针 #10：bootstrap 失败是否瞬时 —— 连续两次 bootstrap + verify 取证。 */
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
const login = await apiPost("/api/v1/auth/phone-login", { phone, password, deviceId: "qa-probe10" });
const token = JSON.parse(login.body).token;

const A = automator();
const PORT = readIdePort().port;
const mini = await A.connect({ wsEndpoint: "ws://127.0.0.1:" + PORT });

const BOOT_SRC = async (t) => {
  try {
    wx.setStorageSync("token", t);
    var app = getApp(); var vm = app["$vm"];
    var gp = (vm.$ && vm.$.appContext.config.globalProperties) || {};
    var p = vm["$pinia"] || gp["$pinia"];
    var st = p._s.get("session"); if (st && st.bootstrap) { await st.bootstrap(); }
    return st && st.isLoggedIn ? "logged-in userId=" + (st.userSession && st.userSession.userId) : "not-logged-in err=" + (st && st.errorMessage);
  } catch (e) { return "ERR " + e.message; }
};
const r1 = await mini.evaluate(BOOT_SRC, token);
console.log("PROBE10_BOOT1 " + String(r1).slice(0, 160));
await new Promise((r) => setTimeout(r, 2000));
const r2 = await mini.evaluate(BOOT_SRC, token);
console.log("PROBE10_BOOT2 " + String(r2).slice(0, 160));
await new Promise((r) => setTimeout(r, 2000));
const r3 = await mini.evaluate(BOOT_SRC, token);
console.log("PROBE10_BOOT3 " + String(r3).slice(0, 160));

mini.disconnect();
console.log("PROBE10_DONE");
process.exit(0);
