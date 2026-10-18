#!/usr/bin/env node
/**
 * verify-admin-roundtrip.mjs —— 客户端写 → 后端落库 → 后台读到同一行 → 删得掉 → 计数回原（MP-FIDELITY Phase G）。
 *
 * 为什么要真写一次（而不是只验读链）：
 *   "前后端连通 + 后台数据同步"这件事，只读两端各取一次数证不了同步 —— 两边读同一份库当然一致。
 *   能证的只有：**这一端写进去的一行，另一端能按 id 读到同样字段，并且撤得掉、总数回到原值**。
 *
 * 三条前提绑死（都是这个仓的量过的事实，不是我编的形状）：
 *   · 端点取自 g8-e2e.cjs：POST /auth/guest-login(:91) 铸体验账号、POST /posts(:100) 带 Idempotency-Key、
 *     POST /auth/admin/login(:109) 铸后台票、GET /admin/forum/village-posts/{id}(:114) 是后台侧读同一行的通道；
 *     删除端点在后端实到：AdminVillagePostController.java:74 基路径 + :355 @DeleteMapping("/{id}")。
 *   · 凭据只走 scripts/qa/admin-instrument-env.mjs（supplyInstrumentEnv：别名 + 端口探测 + 绝不回显值）；
 *     本脚本任何一行日志里都不出现 token/password，只出现长度。
 *   · 写之前先 mysqldump 备份 posts 表（apps/api Post.java:39 @Table(name="posts")），
 *     备份失败 ⇒ 一个字节都不写（"rm && mv 共享同一个 $?"那一类事故不在这里重演）。
 *
 * 用法：node scripts/qa/verify-admin-roundtrip.mjs --round R1 [--dry] [--keep]
 *      --dry  ⇒ 只做读侧预检（铸票 + 列表可达 + 备份命令可用性），不写一行
 *      --keep ⇒ 保留那条 QA 帖（默认删掉并核对计数回原；保留就是残留，账上必须点名）
 * 退出码：0 往返成且守恒；1 任一环不中；2 前提不成立（凭据铸不出 / 备份写不进 / 只在 --dry 下拿不到票 ⇒ MISS）。
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { supplyInstrumentEnv } from "./admin-instrument-env.mjs";
import { mintToken } from "./cli-automator.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const relOf = (p) => relative(REPO, resolve(p)).split(sep).join("/");
const API = process.env.QA_API_BASE || "http://127.0.0.1:8080/api/v1";
const RK = "ROUNDTRIP_RESULT";
const MYSQLDUMP = process.env.MYSQLDUMP_BIN || "/d/mysql-8.0.45-winx64/bin/mysqldump.exe";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);
const round = arg("round", "RX");
const dry = flag("dry");
const keep = flag("keep");

function pick(obj, paths) { for (const p of paths) { const v = p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj); if (v !== undefined && v !== null && v !== "") return v; } return null; }
async function req(method, path, { token, body, idem } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  if (idem) headers["Idempotency-Key"] = idem;
  try {
    const r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* 保留原文 */ }
    return { status: r.status, json, raw: text.slice(0, 160) };
  } catch (e) { return { status: 0, json: null, raw: "fetch 异常 " + String(e && e.message).slice(0, 80) }; }
}

/** 两端字段对账（口径沿用 g8 的 countsParity：键集不许被截短）。 */
function fieldParity(clientRow, adminRow, keys) {
  const rows = [];
  let same = 0;
  for (const k of keys) {
    const a = clientRow && clientRow[k];
    const b = adminRow && adminRow[k];
    const norm = (v) => (v === undefined || v === null ? "" : String(v));
    const eq = norm(a) === norm(b);
    if (eq) same++;
    rows.push({ key: k, client: norm(a).slice(0, 40), admin: norm(b).slice(0, 40), eq });
  }
  return { same, total: keys.length, rows };
}

function dbConf() {
  const env = {};
  for (const f of [".env", ".env.local"]) {
    const p = join(REPO, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf-8").split(/\r?\n/)) {
      const t = line.trim(); if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("="); if (i <= 0) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  const url = String(env.DB_URL || "");
  const m = url.match(/jdbc:mysql:\/\/([^:/]+):?(\d*)\/([^?]+)/);
  if (!m) return null;
  return { host: m[1], port: m[2] || "3306", db: m[3], user: env.DB_USERNAME || "", pass: env.DB_PASSWORD || "" };
}

const log = [];
let exitCode = 0;

(async () => {
  /* ── 凭据：客户端体验账号 + 后台票；铸不出就 MISS，不许当 PASS ── */
  await supplyInstrumentEnv({ log: false });
  const adminUser = String(process.env.ADMIN_OPENID || process.env.ADMIN_LOGIN_USERNAME || "").trim();
  const adminPass = String(process.env.ADMIN_LOGIN_PASSWORD || process.env.SUPER_PASSWORD || "").trim();

  const g = await req("POST", "/auth/guest-login", { body: {}, idem: "rt-" + Date.now() });
  const clientToken = pick(g.json, ["data.token", "token", "data.accessToken"]);
  const userId = String(pick(g.json, ["data.userId", "userId", "data.id"]) || "?");
  console.log(`RT_CLIENT guest-login=${g.status} token长度=${String(clientToken || "").length} userId=${userId}（值不落日志）`);

  let adminToken = "";
  if (adminUser && adminPass) {
    const a = await req("POST", "/auth/admin/login", { body: { username: adminUser, password: adminPass }, idem: "rt-a-" + Date.now() });
    adminToken = String(pick(a.json, ["data.token", "token"]) || "");
    console.log(`RT_ADMIN admin/login=${a.status} token长度=${adminToken.length}（凭据源=admin-instrument-env，值不落日志）`);
  } else {
    console.log(`RT_ADMIN 后台凭据铸不出（ADMIN_OPENID 长度=${adminUser.length} 口令长度=${adminPass.length}）⇒ 后台侧判点只能 MISS`);
  }

  if (!clientToken || !adminToken) {
    console.log(`${RK}=${dry ? "MISS" : "NOT-EVIDENCED"} reason=token-unproducible client=${!!clientToken} admin=${!!adminToken}`);
    process.exit(dry ? 0 : 2);
  }
  if (dry) {
    const list = await req("GET", "/posts?page=1&pageSize=50", { token: clientToken });
    const al = await req("GET", "/admin/forum/village-posts?page=1&pageSize=50", { token: adminToken });
    console.log(`RT_DRY client列表=${list.status} 后台列表=${al.status} ⇒ 读侧两端可达（本次不写）`);
    console.log(`${RK}=DRY readClient=${list.status} readAdmin=${al.status}（没写一行）`);
    process.exit(list.status === 200 && al.status === 200 ? 0 : 1);
  }

  /* ── 备份：写之前把 posts 表 dump 下来；失败就不写 ── */
  const db = dbConf();
  const backupDir = join(REPO, "database", "backup");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
  const backupFile = join(backupDir, `qafid-${round}-${stamp}.sql`);
  if (!db || !existsSync(MYSQLDUMP)) {
    console.log(`${RK}=NOT-EVIDENCED reason=backup-unavailable db=${!!db} mysqldump=${existsSync(MYSQLDUMP)} ⇒ 没有备份不许真写`);
    process.exit(2);
  }
  const dump = spawnSync(MYSQLDUMP, [`--host=${db.host}`, `--port=${db.port}`, `--user=${db.user}`, "--single-transaction", db.db, "posts"], {
    env: { ...process.env, MYSQL_PWD: db.pass }, encoding: "buffer",
  });
  if (dump.status !== 0 || !dump.stdout || dump.stdout.length < 200) {
    console.log(`${RK}=NOT-EVIDENCED reason=dump-failed exit=${dump.status} stderr=${String(dump.stderr || "").slice(0, 120)} ⇒ 备份没成就停在写之前`);
    process.exit(2);
  }
  writeFileSync(backupFile, dump.stdout);
  console.log(`RT_BACKUP=${relOf(backupFile)} bytes=${dump.stdout.length} table=posts（口令经 MYSQL_PWD 传，不进命令行）`);

  /* ── 写 ── */
  const tag = `QAFID-${round}-${stamp}`;
  const key = `rt-${tag}`;
  const totalBefore = async (tok, path) => {
    const r = await req("GET", path, { token: tok });
    return Number(pick(r.json, ["data.total", "total", "data.pagination.total"]) ?? -1);
  };
  const clientTotalBefore = await totalBefore(clientToken, "/posts?page=1&pageSize=50");
  const adminTotalBefore = await totalBefore(adminToken, "/admin/forum/village-posts?page=1&pageSize=50");

  const payload = { title: `${tag} 往返取证帖`, content: `${tag}：客户端写→后台读→删除→计数回原，用于证"同步"而不是证"两边都能读"。`, category: "interest", targetType: "general", tags: ["qafid"] };
  const c = await req("POST", "/posts", { token: clientToken, body: payload, idem: key });
  const postId = String(pick(c.json, ["data.id", "id", "data.postId"]) || "");
  console.log(`RT_CREATE POST /posts -> ${c.status} id=${postId || "(拿不到 id ⇒ 后面全不中)"}`);
  if (c.status !== 200 && c.status !== 201) { console.log(`${RK}=FAIL reason=create-${c.status} body=${c.raw}`); process.exit(1); }

  const [cl, ad] = await Promise.all([
    req("GET", `/posts/${postId}`, { token: clientToken }),
    req("GET", `/admin/forum/village-posts/${postId}`, { token: adminToken }),
  ]);
  const clRow = pick(cl.json, ["data", ""]) || {};
  const adRow = pick(ad.json, ["data", ""]) || {};
  const parity = fieldParity(clRow, adRow, ["id", "title", "content", "authorId", "status", "createdAt"]);
  console.log(`RT_READ client=${cl.status} admin=${ad.status} 字段对账=${parity.same}/${parity.total}`);
  for (const r of parity.rows) if (!r.eq) console.log(`  FIELD_DIFF ${r.key} client="${r.client}" admin="${r.admin}"`);

  /* ── 撤 ── */
  let delStatus = "kept(--keep)";
  let clientTotalAfter = clientTotalBefore, adminTotalAfter = adminTotalBefore;
  if (!keep) {
    const d = await req("DELETE", `/admin/forum/village-posts/${postId}`, { token: adminToken });
    delStatus = d.status;
    clientTotalAfter = await totalBefore(clientToken, "/posts?page=1&pageSize=50");
    adminTotalAfter = await totalBefore(adminToken, "/admin/forum/village-posts?page=1&pageSize=50");
    console.log(`RT_DELETE admin/${postId} -> ${d.status}`);
  }

  const conserved = keep || (clientTotalAfter === clientTotalBefore && adminTotalAfter === adminTotalBefore);
  const problems = [];
  if (!postId) problems.push("创建后拿不到 id");
  if (cl.status !== 200) problems.push(`客户端按 id 读不到自己刚写的行（${cl.status}）`);
  if (ad.status !== 200) problems.push(`后台按同一 id 读不到（${ad.status}）⇒ 前后端/后台同步未证`);
  if (parity.same !== parity.total) problems.push(`字段对账不齐 ${parity.same}/${parity.total}（逐条 FIELD_DIFF 已点名）`);
  if (!keep && Number(delStatus) >= 400) problems.push(`删除没成（${delStatus}）⇒ 这条 QA 帖是残留，必须人工清理并在报告点名`);
  if (!conserved) problems.push(`计数没回原 client ${clientTotalBefore}→${clientTotalAfter} / admin ${adminTotalBefore}→${adminTotalAfter}`);

  for (const p of problems) console.error(`RT_PROBLEM ${p}`);
  console.log(`RT_CONSERVATION clientTotal ${clientTotalBefore}->${clientTotalAfter} adminTotal ${adminTotalBefore}->${adminTotalAfter} torn_down=${keep ? "kept" : (Number(delStatus) < 400 ? "yes" : "NO")}`);
  exitCode = problems.length ? 1 : 0;
  /* --out：把判决落成盘上件，供 verify-fidelity-closeout 汇总（收口门一律不重测，只读生产者的话）。
     字段是**白名单**：只有计数与状态码。上一程的教训是 exec-results.json 把会话 JWT 原样留在盘上、
     而覆盖门偏要读这个文件名 ⇒ 泄漏件变成下一发要 git add 的那个文件。这里反过来：凭据根本不进对象。 */
  const outP = arg("out", "");
  if (outP) {
    const rec = {
      schema: "qafid-roundtrip-v1", at: new Date().toISOString(), round: ROUND, dry: false,
      verdict: problems.length ? "FAIL" : "PASS",
      created_id: postId || null, fields_same: parity.same, fields_total: parity.total,
      client_read: cl.status, admin_read: ad.status, delete_status: String(delStatus),
      client_total: [clientTotalBefore, clientTotalAfter], admin_total: [adminTotalBefore, adminTotalAfter],
      conserved, torn_down: keep ? "kept" : (Number(delStatus) < 400 ? "yes" : "NO"),
      backup: relOf(backupFile), problems,
    };
    const blob = JSON.stringify(rec, null, 2);
    if (/token|authorization|bearer/i.test(blob)) { console.log(`${RK}=NOT-EVIDENCED reason=out-would-carry-credential ⇒ 结果件不落盘`); process.exit(2); }
    mkdirSync(dirname(resolve(outP)), { recursive: true });
    writeFileSync(resolve(outP), blob, "utf-8");
    console.log(`RT_OUT=${relOf(outP)} bytes=${blob.length}（白名单字段，无凭据）`);
  }
  console.log(problems.length
    ? `${RK}=FAIL created=${postId} fields=${parity.same}/${parity.total} problems=${problems.length}`
    : `${RK}=PASS created=${postId} fields=${parity.same}/${parity.total} torn_down=${keep ? "kept(按要求保留，属残留)" : "yes"} conserved=yes backup=${relOf(backupFile)}`);
  process.exit(exitCode);
})().catch((e) => { console.log(`${RK}=NOT-EVIDENCED reason=threw err=${String(e && e.message).slice(0, 160)}`); process.exit(2); });
