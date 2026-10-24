/* 探针 #3（只读侦察）：上腿前的后端前置态盘点 —— 零写入，全部 GET（除 phone-login 铸 A 票）。
   要回答的每一条都对应一条腿的 pre 字段：
   ① A(100158) 的 vip/bills 现有条数（VB03 (a) 的基数）；
   ② app-config 的 commerce.enabled（VIP 下单管道是否开闸）；
   ③ A 的 likes（/matches/my-likes）——OT05 要「未喜欢」目标、OT06 态1=已喜欢未匹配(100155)、态2=互喜(10003)；
   ④ /profile/10001（OT05 的未喜欢目标）；
   ⑤ official-accounts 列表 + messages 端点形状（OC09 的 {code} 参数）；
   ⑥ A 的实名状态（OT09 pre「态2（已实名登录）」）；
   ⑦ app-config 的发帖开关（VI34 ⑥ Disabled 形态依赖）。
   凭据只从 tmp/r11_chains2.py 运行期读，绝不打印。 */
import { readFileSync } from "node:fs";
import http from "node:http";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const s = readFileSync(resolve(REPO, "tmp/r11_chains2.py"), "utf8");
const phone = /"phone"\s*:\s*"(\d{11})"/.exec(s)[1];
const password = /"password"\s*:\s*"([^"]+)"/.exec(s)[1];

function req(method, path, { token, body } = {}) {
  return new Promise((done) => {
    const u = new URL("http://127.0.0.1:8080" + path);
    const data = body ? JSON.stringify(body) : null;
    const headers = { Accept: "application/json" };
    if (data) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = Buffer.byteLength(data); headers["Idempotency-Key"] = crypto.randomUUID(); }
    if (token) headers.Authorization = "Bearer " + token;
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers, timeout: 15000 }, (res) => {
      let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => done({ status: res.statusCode, body: b }));
    });
    r.on("timeout", () => { r.destroy(); done({ status: "TIMEOUT", body: "" }); });
    r.on("error", (e) => done({ status: "ERR:" + e.code, body: "" }));
    if (data) r.write(data);
    r.end();
  });
}

const login = await req("POST", "/api/v1/auth/phone-login", { body: { phone, password, deviceId: "qa-recon" } });
if (login.status !== 200) { console.log("RECON_LOGIN_FAIL status=" + login.status + " " + login.body.slice(0, 120)); process.exit(2); }
const token = JSON.parse(login.body).token;
console.log("RECON_LOGIN ok userId=100158(期望)");

const bills = await req("GET", "/api/v1/vip/bills?page=0&size=20", { token });
console.log("RECON_BILLS status=" + bills.status + " body=" + bills.body.slice(0, 260));
const appcfg = await req("GET", "/api/v1/app-config", {});
console.log("RECON_APPCONFIG status=" + appcfg.status + " body=" + appcfg.body.slice(0, 400));
const mylikes = await req("GET", "/api/v1/matches/my-likes", { token });
console.log("RECON_MYLIKES status=" + mylikes.status + " body=" + mylikes.body.slice(0, 300));
const target1 = await req("GET", "/api/v1/profile/10001", { token });
console.log("RECON_PROFILE_10001 status=" + target1.status + " body=" + target1.body.slice(0, 200));
const oa = await req("GET", "/api/v1/official-accounts", {});
console.log("RECON_OFFICIAL_ACCOUNTS status=" + oa.status + " body=" + oa.body.slice(0, 300));
let code = "";
try { const j = JSON.parse(oa.body); const arr = j.data || j; if (Array.isArray(arr) && arr.length) code = arr[0].code || arr[0].id || ""; } catch { /* 保留空 */ }
if (code) {
  const msgs = await req("GET", "/api/v1/official-accounts/" + encodeURIComponent(code) + "/messages", { token });
  console.log("RECON_OA_MESSAGES code=" + code + " status=" + msgs.status + " body=" + msgs.body.slice(0, 160));
} else console.log("RECON_OA_MESSAGES skip（没解析到 code）");
const verif = await req("GET", "/api/v1/verification/status", { token });
console.log("RECON_VERIFICATION_STATUS status=" + verif.status + " body=" + verif.body.slice(0, 200));
const feed = await req("GET", "/api/v1/posts?page=0&size=3", { token });
console.log("RECON_POSTS_FEED status=" + feed.status + " body=" + feed.body.slice(0, 200));
process.exit(0);
