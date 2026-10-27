/**
 * 三级角色鉴权验收：AUDITOR 只读、校区 ADMIN 跨校区越权、超管可写。
 *
 * 为什么单独一个脚本：AUDITOR 的「只读」是靠 SecurityConfig 里按 HTTP 方法
 * 划的一条规则兜住的（类级注解已放宽到含 AUDITOR），所以这条规则一旦失效，
 * 只读审核员立刻变成可写账号——必须有能自动变红的门，不能靠人肉点。
 *
 * 关键设计：每个「AUDITOR 被拒」的断言都配一个「超管同一请求成功」的对照，
 * 否则路由写错、参数不合法造成的 4xx 也会被当成「拦截生效」。
 *
 * 用法（需 real 后端在 :8080）：
 *   node scripts/verify-admin-auditor.mjs
 * 凭据可用环境变量覆盖：AUDITOR_PHONE / AUDITOR_PASSWORD /
 *   CAMPUS_ADMIN_PHONE / CAMPUS_ADMIN_PASSWORD / SUPER_USERNAME / SUPER_PASSWORD
 */

import { supplyInstrumentEnv } from "./qa/admin-instrument-env.mjs";
await supplyInstrumentEnv(); /* 缺的是仪器前提 ⇒ 该报 NOT-EVIDENCED；但载具被我这种后台起法没带环境时，红得不是产品 */


const BASE = process.env.ADMIN_API_BASE || "http://127.0.0.1:8080/api/v1";
// 注意：/auth/admin/login 的 username 走的是 users.openid 精确匹配
// （RealAuthService.loginAsAdmin → findByOpenid），而 POST /admin/users/admins
// 把 openid 写成 "phone:{手机号}"。所以后台新建的管理员，登录名是
// `phone:13711110005` 这一整串，不是手机号本身。
const CREDS = {
  super: {
    username: process.env.SUPER_USERNAME || "local-dev-admin-openid-123456",
    // 2026-10-14 口令轮换后不再内置默认值：必须显式传 SUPER_PASSWORD（取自 .env 的 ADMIN_LOGIN_PASSWORD）
    password: process.env.SUPER_PASSWORD || "",
  },
  auditor: {
    username: process.env.AUDITOR_PHONE || "phone:13711110005",
    password: process.env.AUDITOR_PASSWORD || "Auditor@12345",
  },
  campus: {
    username: process.env.CAMPUS_ADMIN_PHONE || "phone:13711110004",
    password: process.env.CAMPUS_ADMIN_PASSWORD || "Campus@12345",
  },
};

let failures = 0;
let passes = 0;
let skips = 0;
/**
 * transport = 一个 HTTP 响应都没拿到的请求数（ECONNREFUSED / DNS / 连接层异常）。
 * 本仓口径：仪器与环境故障不计入产品 FAIL ⇒ transport>0 时判决只能是 NOT-EVIDENCED（退 2）。
 * 判点只认「完全没有 HTTP 响应」：4xx/5xx 一律算后端活着（那正是本门要审的东西），
 * 所以这道守卫不可能把真缺陷洗成绿——它只在 8080 根本没起时接管。
 */
let transport = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (ok) passes += 1; else failures += 1; // 红源仍是原来那个 failures，机器行读的就是它
}

/** bash 的 g() 按 [A-Z_]+_RESULT=[^|]* 取行、截 110 字符 ⇒ 机器行不许带竖线与换行 */
const scrub = (s) => String(s == null ? "" : s).replace(/\|/g, "/").replace(/\r?\n/g, " ");

/** 判决行：最后一个 stdout 行。state 省略时按 transport>0 → NOT-EVIDENCED、failures>0 → FAIL、否则 PASS 派生 */
function finish(state, reason) {
  console.log(`\n失败 ${failures} 项`);
  const s = state || (transport > 0 ? "NOT-EVIDENCED" : failures > 0 ? "FAIL" : "PASS");
  const why = reason || (s === "FAIL"
    ? `AUDITOR 只读断言有 ${failures} 项不成立（FAIL 行见上，含读放宽/写拦截/超管对照/跨校区四类）`
    : s === "NOT-EVIDENCED"
      ? `${transport} 个请求拿不到任何 HTTP 响应 ⇒ ${BASE} 无后端可判，仪器故障不计产品 FAIL`
      : `${passes} 项断言全绿（读放宽、写 403、超管对照、跨校区拦截均有对照腿）` + (skips ? `；另有 ${skips} 项因缺样本没跑` : ""));
  console.log(`ADMAUD_RESULT=${s} pass=${passes} fail=${failures} skip=${skips} transport=${transport}（${scrub(why)}）`);
  process.exit(s === "FAIL" ? 1 : s === "NOT-EVIDENCED" ? 2 : 0);
}

async function loginOnce(who) {
  let r;
  try {
    r = await fetch(`${BASE}/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Idempotency-Key": `login-${who}-${Date.now()}` },
      body: JSON.stringify(CREDS[who]),
    });
  } catch (e) {
    transport += 1; // 连接层失败：没有 HTTP 响应，不是「登录被拒」
    return { status: 0, token: undefined, role: undefined, net: scrub(e && e.message) };
  }
  const j = await r.json().catch(() => ({}));
  const data = j.data || {};
  return { status: r.status, token: data.token || data.accessToken, role: data.user && data.user.role };
}

// /auth/admin/login 有按 IP 的令牌桶（容量 10，每 10 秒补 1 个），多条验收腿共用同一个 IP。
// 桶空时返回 429，那不是鉴权失败——等补令牌后重试，否则限流会被读成「角色没生效」。
async function login(who) {
  for (let i = 0; i < 8; i += 1) {
    const r = await loginOnce(who);
    if (r.status !== 429) return r;
    console.log(`   [rate-limit] ${who} 登录被限流，等 11s 补令牌后重试（第 ${i + 1}/8 次）`);
    await new Promise((res) => setTimeout(res, 11000));
  }
  return loginOnce(who);
}

async function call(token, method, path, body) {
  let r;
  try {
    r = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
        ...(method === "GET" ? {} : { "Idempotency-Key": `${method}-${Math.random().toString(36).slice(2)}` }),
      },
      body: method === "GET" ? undefined : JSON.stringify(body || {}),
    });
  } catch (e) {
    transport += 1;
    return { status: 0, json: null, text: `连接层失败：${scrub(e && e.message)}` };
  }
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON 响应保留原文 */ }
  return { status: r.status, json, text };
}

// ===== 0. 仪器前提：口令与后端，缺任何一个都得说「没对象」而不是「鉴权失效」=====
if (!CREDS.super.password) {
  console.log("   [env] 未设 SUPER_PASSWORD ⇒ 超管身份不可用（2026-10-14 口令轮换后不再内置默认值）");
  finish("NOT-EVIDENCED",
    "缺 SUPER_PASSWORD 这一仪器前提 ⇒ §4 超管对照腿没对象；对照一缺就分不清 4xx 是「鉴权生效」还是「路由写错」，本门任何读数都不作数（非产品缺陷，退 2 不记 FAIL）");
}
try {
  const pre = await fetch(`${BASE}/admin/circle-layers`, { method: "GET" });
  console.log(`   [preflight] ${BASE} 有 HTTP 响应（status=${pre.status}；401/403 同样算后端活着）`);
} catch (e) {
  transport += 1;
  console.log(`   [preflight] ${BASE} 无 HTTP 响应：${scrub(e && e.message).slice(0, 90)}`);
  finish("NOT-EVIDENCED",
    `后端不在（${BASE} 连接失败：${scrub(e && e.message).slice(0, 60)}）⇒ 本门零判决；这是仪器缺失不是产品缺陷，故记 NOT-EVIDENCED 退 2`);
}

// ===== 1. 三个身份都能登录，且角色原样回传 =====
const sup = await login("super");
const aud = await login("auditor");
const cmp = await login("campus");
check("超管登录", sup.status === 200 && !!sup.token, `status=${sup.status} role=${sup.role}`);
check("AUDITOR 登录成功", aud.status === 200 && !!aud.token, `status=${aud.status}`);
check(
  "AUDITOR 角色原样回传（不得折叠成 ADMIN，否则前端会给它写按钮）",
  aud.role === "AUDITOR",
  `role=${aud.role}`
);
check("校区 ADMIN 登录", cmp.status === 200 && cmp.role === "ADMIN", `status=${cmp.status} role=${cmp.role}`);
// 三个身份全部拿到 status=0（连接层失败）⇒ 后面每一条断言都没有对象，直接落 NOT-EVIDENCED。
// 注意这里只认「完全没有 HTTP 响应」，登录被拒（401/403）仍然按真缺陷往下走 FAIL 分支。
if (transport > 0) finish();

// ===== 2. AUDITOR 可读 =====
const readPosts = await call(aud.token, "GET", "/admin/forum/village-posts?page=1&pageSize=5");
check("AUDITOR 可读帖子列表", readPosts.status === 200, `status=${readPosts.status}`);

const readLayers = await call(aud.token, "GET", "/admin/circle-layers");
check("AUDITOR 可读圈层树（读放宽已生效）", readLayers.status === 200, `status=${readLayers.status}`);

const readConv = await call(aud.token, "GET", "/admin/conversations?page=1&pageSize=3");
check("AUDITOR 可读私信会话列表", readConv.status === 200, `status=${readConv.status}`);

// 脱敏必须在服务端完成：列表里不能出现正文
const convItems = (readConv.json && readConv.json.items) || [];
const leaked = convItems.filter((it) => it && typeof it.lastMessagePreview === "string" && it.lastMessagePreview.length > 0);
check(
  "AUDITOR 看到的会话不含消息正文（服务端脱敏，不是前端隐藏）",
  readConv.status === 200 && leaked.length === 0,
  `样本=${convItems.length} 泄漏=${leaked.length}`
);

// 菜单：AUDITOR 不应拿到「发布内容」
const audMenus = await call(aud.token, "GET", "/admin/menus/current");
const menuBlob = JSON.stringify(audMenus.json || "");
check(
  "AUDITOR 菜单里有「私信会话」但没有「发布内容」",
  audMenus.status === 200 && menuBlob.includes("Conversations") && !menuBlob.includes("PostCompose"),
  `status=${audMenus.status} 含Conversations=${menuBlob.includes("Conversations")} 含PostCompose=${menuBlob.includes("PostCompose")}`
);

// ===== 3. AUDITOR 一切写操作必须 403 =====
// 目标刻意选一条「已通过」的帖子：鉴权在进 handler 之前就拦，所以 AUDITOR 照样 403，
// 而超管的对照请求只会把审核状态重写成同值、不会把待审帖子悄悄批掉。
const pending = ((readPosts.json && readPosts.json.items) || []).find((p) => p.auditStatus === "approved")
  || (readPosts.json && readPosts.json.items && readPosts.json.items[0]);
const targetId = pending ? pending.id : null;
if (!targetId) {
  check("取到一条帖子作为写测试目标", false, "列表为空，无法验证写拦截");
  skips += 7; // 没目标 ⇒ §3 五条写拦截 + §4 两条超管对照都没跑（红已由上面那条记下了，这里只如实报没跑的量）
} else {
  const writes = [
    ["审核帖子 POST /audit", "POST", `/admin/forum/village-posts/${targetId}/audit`, { decision: "approved" }],
    ["置顶 POST /pin", "POST", `/admin/forum/village-posts/${targetId}/pin`, {}],
    ["删帖 DELETE /{id}", "DELETE", `/admin/forum/village-posts/${targetId}`, {}],
    ["官方号广播 POST /official-accounts/.../messages", "POST",
      "/admin/official-accounts/official-assistant/messages", { messageType: "text", content: "AUDITOR 越权广播探针" }],
    ["后台建帖 POST /admin/posts", "POST", "/admin/posts",
      { title: "探针标题够长了", content: "AUDITOR 越权发帖探针", category: "all", targetType: "general", images: [], tags: [] }],
  ];
  for (const [label, method, path, body] of writes) {
    const r = await call(aud.token, method, path, body);
    check(`AUDITOR 被拒：${label}`, r.status === 403, `status=${r.status} ${r.text.slice(0, 70)}`);
  }

  // ===== 4. 对照组：超管发同样的请求，绝不能也是 403 =====
  // 没有这一步，「路由不存在 / 参数非法」造成的 4xx 会被误当成鉴权生效。
  const pinSuper = await call(sup.token, "POST", `/admin/forum/village-posts/${targetId}/pin`, {});
  check(`对照：超管同一写请求不被鉴权层拒（${targetId} 置顶）`, pinSuper.status !== 403, `status=${pinSuper.status}`);
  const auditSuper = await call(sup.token, "POST", `/admin/forum/village-posts/${targetId}/audit`, { decision: "approved", remark: "鉴权对照探针" });
  check("对照：超管审核不被鉴权层拒", auditSuper.status !== 403, `status=${auditSuper.status} ${auditSuper.text.slice(0, 70)}`);
  // 复原：把上面对照请求造成的置顶状态取消掉，避免污染数据
  await call(sup.token, "POST", `/admin/forum/village-posts/${targetId}/unpin`, {});
}

// ===== 5. 校区 ADMIN 的跨校区写必须被拒 =====
// 样本不能靠「列表里随便挑一条」：那可能正好在本校区，红了也说不清是越权还是夹具。
// 用集合差取「超管可见但校区管理员不可见」的帖子——只有作用域正确时这个集合才非空，
// 因此它同时是越权断言的正向前提（作用域一旦退化成 S1 命中 S14，差集为空，本项会响亮失败）。
const otherCampus = await call(sup.token, "GET", "/admin/forum/village-posts?page=1&pageSize=100");
const otherItems = (otherCampus.json && otherCampus.json.items) || [];
const scopedList = await call(cmp.token, "GET", "/admin/forum/village-posts?page=1&pageSize=100");
const scopedIds = new Set(((scopedList.json && scopedList.json.items) || []).map((p) => p.id));
const foreign = otherItems.find((p) => p.authorId && p.id !== targetId && !scopedIds.has(p.id));
if (foreign) {
  const r = await call(cmp.token, "POST", `/admin/forum/village-posts/${foreign.id}/audit`, { decision: "approved", remark: "跨校区探针" });
  check(`校区 ADMIN 跨校区审核被拦（目标帖 ${foreign.id}，不在其作用域列表内）`, r.status === 403 || r.status === 400, `status=${r.status} ${r.text.slice(0, 70)}`);
} else {
  check("取到跨校区帖子样本", false, `超管可见=${otherItems.length} 校区可见=${scopedIds.size} ⇒ 差集为空：要么作用域泄漏，要么样本不足`);
}

finish();
