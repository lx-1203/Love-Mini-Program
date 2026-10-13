#!/usr/bin/node
/* F04 临时探针（fix-lane 2026-10-10）：无泄漏核对身份形态——
   运行期从 scripts/qa/r-exec.cjs IDENT_DEFS 读凭据（不上命令行、不打凭据），
   phone-login 后只打印形态字段：realName status / birthDate 有无与年龄档。零写入。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const REPO = path.resolve(__dirname, "..", "..");
const src = fs.readFileSync(path.join(REPO, "scripts", "qa", "r-exec.cjs"), "utf8");
function defOf(kind) {
  const m = src.match(new RegExp(kind + ":\\s*\\{[^}]*body:\\s*\\{[^}]*\\}[^}]*\\}"));
  if (!m) return null;
  const phone = (m[0].match(/phone:\s*'(\d{11})'/) || [])[1];
  const password = (m[0].match(/password:\s*'([^']+)'/) || [])[1];
  return { phone, password };
}
function apiPost(p, body) {
  return new Promise((res, rej) => {
    const data = Buffer.from(JSON.stringify(body || {}), "utf8");
    const q = http.request({ host: "127.0.0.1", port: 8080, path: p, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": data.length }, timeout: 8000 },
      (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res({ status: r.statusCode, body: d })); });
    q.on("error", rej); q.on("timeout", () => q.destroy(new Error("timeout"))); q.write(data); q.end();
  });
}
function apiGet(p, token) {
  return new Promise((res, rej) => {
    const q = http.request({ host: "127.0.0.1", port: 8080, path: p, method: "GET", headers: { Authorization: "Bearer " + token }, timeout: 8000 },
      (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res({ status: r.statusCode, body: d })); });
    q.on("error", rej); q.on("timeout", () => q.destroy(new Error("timeout"))); q.end();
  });
}
(async () => {
  for (const kind of ["A", "B"]) {
    const def = defOf(kind);
    if (!def) { console.log(kind + ": IDENT_DEFS 解析失败"); continue; }
    const lr = await apiPost("/api/v1/auth/phone-login", { phone: def.phone, password: def.password, deviceId: "qa-fixlane-probe" });
    if (lr.status !== 200) { console.log(kind + ": phone-login http " + lr.status + "（不打印 body）"); continue; }
    const j = JSON.parse(lr.body);
    const token = j.token, uid = j.userId;
    const rn = await apiGet("/api/v1/real-name-certification", token);
    let rnStatus = "?", rnParsed = "";
    try { const env = JSON.parse(rn.body); const v = env.data || {}; rnStatus = String(v.status); rnParsed = "userName=" + (v.userName ? "有" : "无"); } catch { rnParsed = "body 解析失败"; }
    const bp = await apiGet("/api/v1/profile/basic", token);
    let bd = "?", age = "?", nick = "?";
    try { const env = JSON.parse(bp.body); const v = env.data || {};
      bd = v.birthDate === undefined ? "(键缺失)" : (v.birthDate === null || v.birthDate === "" ? "(空)" : v.birthDate);
      nick = v.nickname || v.nick || "?";
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(bd))) { const y = +String(bd).slice(0, 4), mth = +String(bd).slice(5, 7), day = +String(bd).slice(8, 10); const n = new Date();
        age = n.getFullYear() - y - ((n.getMonth() + 1 < mth || (n.getMonth() + 1 === mth && n.getDate() < day)) ? 1 : 0); }
    } catch { /* keep */ }
    const gate = (age === "?") ? "birthDate缺失→isAdult=false(未成年形态)" : (age + "岁→isAdult=" + (age >= 18));
    console.log(kind + " uid=" + uid + " nick=" + nick + " | realName http " + rn.status + " data.status=" + rnStatus + " " + rnParsed
      + " | profile/basic http " + bp.status + " birthDate=" + bd + " ⇒ " + gate);
  }
})().catch((e) => { console.log("PROBE_ERR " + e.message); process.exit(1); });
