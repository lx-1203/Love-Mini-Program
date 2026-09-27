#!/usr/bin/env node
/** G8 RING6 的只读探针：后台读侧视图到底有没有计数字段？
 *
 *  为什么要单独一个探针，而不是直接重跑 g8-e2e.cjs：
 *   - g8-e2e 十环会**真写库**（建帖、评论、点赞、幂等重放），而此刻游客执行轮正在用同一个 8080 读广场，
 *     半途插一条新帖会把「代码」和「被量的东西」再次错开（本轮定过的规矩：一次测量只对应一个产物/一次后端变更）。
 *   - RING6 现在的 ok 条件只看 `评论 HTTP<300 && 点赞 HTTP<300`，字段集那半段只是**打印**，
 *     所以它名字叫「计数客户端↔后台一致」却不会因为不一致而红 —— 这条环的判点要另立才判得动。
 *   - 本探针只做 GET，任何时刻可跑。
 *
 *  凭据：从 apps/api/restart-backend.ps1 运行时解析，绝不上命令行、绝不打印（同 g8-e2e.cjs）。
 *  用法：node scripts/qa/probe-admin-post-counts.mjs [--post 275]... [--limit 5] [--json out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import crypto from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://127.0.0.1:8080/api/v1");
const LIMIT = Number(arg("limit", "5"));
const OUT = arg("json", "");
const POSTS = process.argv.reduce((a, v, i, all) => (v === "--post" && all[i + 1] ? a.concat(all[i + 1]) : a), []);

const launcher = readFileSync(resolve(REPO, "apps/api/restart-backend.ps1"), "utf8");
const envOf = (k) => { const m = launcher.match(new RegExp(`${k} = '([^']*)'`)); return m ? m[1] : ""; };
const ADMIN_PASSWORD = envOf("ADMIN_PASSWORD");
const ADMIN_OPENID = envOf("ADMIN_OPENID");
if (!ADMIN_PASSWORD) { console.log("PROBE_RESULT=FAIL reason=launcher 里没解析到 ADMIN_PASSWORD（不猜凭据）"); process.exit(2); }

function req(method, path, { token, body, idem } = {}) {
  return new Promise((done) => {
    const u = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const headers = { Accept: "application/json" };
    if (data) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = Buffer.byteLength(data); }
    if (token) headers.Authorization = `Bearer ${token}`;
    /* 后台登录这条路上 8080 会强制幂等头（实测 422「缺少 Idempotency-Key 请求头」），
       GET 侧不需要，所以只在带 body 的调用上带。 */
    if (idem) headers["Idempotency-Key"] = idem;
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers, timeout: 15000 }, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => { let json = null; try { json = JSON.parse(buf); } catch { /* 保留原文 */ } done({ status: res.statusCode, json, raw: buf.slice(0, 200) }); });
    });
    r.on("timeout", () => { r.destroy(); done({ status: "TIMEOUT", json: null, raw: "" }); });
    r.on("error", (e) => done({ status: "ERR", json: null, raw: e.code }));
    if (data) r.write(data);
    r.end();
  });
}

/* 默认取本轮保留的 G8 行（reports/audit/real-e2e/test-data-ledger.json 的 kind=post/posts），
   这样即使没人传 --post，量的也是真实存在、可复查的那几行，而不是随手编的 id。 */
function retainedPosts() {
  try {
    const j = JSON.parse(readFileSync(resolve(REPO, "reports/audit/real-e2e/test-data-ledger.json"), "utf8"));
    const ids = (j.entries || []).filter((e) => /^post/i.test(String(e.kind)) && /^\d+$/.test(String(e.key))).map((e) => String(e.key));
    return [...new Set(ids)].sort((a, b) => Number(b) - Number(a)).slice(0, LIMIT);
  } catch { return []; }
}

(async () => {
  let aToken = null;
  for (const uname of ["local-dev-admin-openid-123456", ADMIN_OPENID]) {
    const a = await req("POST", "/auth/admin/login", { body: { username: uname, password: ADMIN_PASSWORD }, idem: crypto.randomUUID() });
    aToken = a.json && (a.json.data?.token ?? a.json.token ?? a.json.data?.user?.token) || null;
    if (aToken) { console.log(`PROBE 管理员登录成功 username=${uname.slice(0, 18)}…（HTTP ${a.status}）`); break; }
    console.log(`PROBE 管理员登录 ${uname.slice(0, 18)}… -> HTTP ${a.status} ${String(a.raw).slice(0, 80)}`);
  }
  if (!aToken) { console.log("PROBE_RESULT=FAIL reason=无管理员令牌，读不到后台视图"); process.exit(1); }

  const ids = POSTS.length ? POSTS : retainedPosts();
  if (!ids.length) { console.log("PROBE_RESULT=FAIL reason=既没传 --post，保留台账里也没有可读的 posts 行"); process.exit(1); }

  const rows = [];
  for (const id of ids) {
    const d = await req("GET", `/admin/forum/village-posts/${id}`, { token: aToken });
    const row = (d.json && (d.json.data || d.json)) || null;
    if (d.status !== 200 || !row || typeof row !== "object") {
      rows.push({ id, status: d.status, admissible: false, keys: [], counts: [] });
      console.log(`PROBE post=${id} HTTP=${d.status} 不可判（没读到对象体就不下「没有计数字段」的结论）`);
      continue;
    }
    const keys = Object.keys(row);
    const counts = keys.filter((k) => /like|comment/i.test(k));
    rows.push({ id, status: d.status, admissible: true, keys, counts, values: Object.fromEntries(counts.map((k) => [k, row[k]])) });
    console.log(`PROBE post=${id} HTTP=200 字段数=${keys.length} 计数类字段=${counts.length ? counts.join(",") : "无"}${counts.length ? " 值=" + JSON.stringify(Object.fromEntries(counts.map((k) => [k, row[k]]))) : ""}`);
  }

  const judged = rows.filter((r) => r.admissible);
  const withCounts = judged.filter((r) => r.counts.length > 0);
  const verdict = !judged.length ? "NOT-EVIDENCED" : withCounts.length === judged.length ? "COUNTS_PRESENT"
    : withCounts.length === 0 ? "COUNTS_ABSENT" : "COUNTS_PARTIAL";
  if (OUT) writeFileSync(resolve(REPO, OUT), JSON.stringify({ at: new Date().toISOString(), base: BASE, verdict, rows }, null, 1), "utf8");
  console.log(`PROBE_ADMISIBLE=${judged.length}/${rows.length}`);
  console.log(`PROBE_VERDICT=${verdict}（后台读侧视图的计数字段：PRESENT=两侧可对照，ABSENT=运行态确实没有 ⇒ 与源码不符就是「重启未做」）`);
  /* 本探针不判 PASS/FAIL：它只回答"运行态有没有"。结案要的是数值一致，那一步在 g8-e2e 的 RING6 加强版里做。 */
  console.log(`PROBE_RESULT=OK verdict=${verdict}`);
})();
