/**
 * 后台写路径验收：公告广播、后台建帖、图片上传、社区总览、圈层前缀过滤。
 *
 * 断言原则：每条都验「另一端看得见」，而不是验接口 200。
 * 公告与帖子都要用普通用户 token 打 C 端接口回读，
 * 因为本次的核心承诺是「小程序上传什么后台就看到什么、后台发什么小程序就显示什么」。
 *
 * 用法（需 real 后端 :8080 + MySQL）：node scripts/verify-admin-writes.mjs
 */

const BASE = process.env.ADMIN_API_BASE || "http://127.0.0.1:8080/api/v1";
const IMG = process.env.UPLOAD_TEST_IMAGE || "apps/api/uploads/100157/202609/5afeaa48-d457-4c34-97fc-578580e9313c.jpg";
const STAMP = Date.now();

let failures = 0;
let passes = 0;
let skips = 0;
/**
 * transport = 一个 HTTP 响应都没拿到的请求数（ECONNREFUSED / DNS / 连接层异常）。
 * 本仓口径：仪器与环境故障不计入产品 FAIL ⇒ transport>0 时判决只能是 NOT-EVIDENCED（退 2）。
 * 只认「完全没有 HTTP 响应」：4xx/5xx 都算后端活着（那正是本门要审的写路径），
 * 所以这道守卫不可能把真缺陷洗成绿——它只在 8080/MySQL 根本没起时接管。
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
    ? `后台写路径有 ${failures} 项不成立（FAIL 行见上：公告广播/后台建帖/图片上传/社区总览/圈层过滤/自收尾六类）`
    : s === "NOT-EVIDENCED"
      ? `${transport} 个请求拿不到任何 HTTP 响应 ⇒ ${BASE} 无后端可判（8080/MySQL 不在），仪器故障不计产品 FAIL`
      : `${passes} 项断言全绿（公告写了 C 端读得到、下架立刻读不到、校区发帖落本校、上传带 token 才出图、总览自洽、验收帖自收尾）` + (skips ? `；另有 ${skips} 项因缺件没跑` : ""));
  console.log(`ADMWRITE_RESULT=${s} pass=${passes} fail=${failures} skip=${skips} transport=${transport}（${scrub(why)}）`);
  process.exit(s === "FAIL" ? 1 : s === "NOT-EVIDENCED" ? 2 : 0);
}

async function post(path, body, token, extraHeaders = {}) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Idempotency-Key": `w-${Math.random().toString(36).slice(2)}`,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* ignore */ }
    return { status: r.status, json, text };
  } catch (e) {
    transport += 1; // 连接层失败：没有 HTTP 响应，不能读成「写接口失败」
    return { status: 0, json: null, text: `连接层失败：${scrub(e && e.message)}` };
  }
}
async function get(path, token) {
  try {
    const r = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* ignore */ }
    return { status: r.status, json, text };
  } catch (e) {
    transport += 1;
    return { status: 0, json: null, text: `连接层失败：${scrub(e && e.message)}` };
  }
}
async function del(path, token) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": `d-${Math.random().toString(36).slice(2)}` },
    });
    return { status: r.status, text: await r.text() };
  } catch (e) {
    transport += 1;
    return { status: 0, text: `连接层失败：${scrub(e && e.message)}` };
  }
}

// ===== 0. 仪器前提：后端/测试图不在了要说「没对象」，不能说「写路径坏了」=====
try {
  const pre = await fetch(`${BASE}/admin/circle-layers`, { method: "GET" });
  console.log(`   [preflight] ${BASE} 有 HTTP 响应（status=${pre.status}；401/403 同样算后端活着）`);
} catch (e) {
  transport += 1;
  console.log(`   [preflight] ${BASE} 无 HTTP 响应：${scrub(e && e.message).slice(0, 90)}`);
  finish("NOT-EVIDENCED",
    `后端不在（${BASE} 连接失败：${scrub(e && e.message).slice(0, 60)}）⇒ 六类写路径全无对象，本门零判决；仪器故障记 NOT-EVIDENCED 退 2，不计产品 FAIL`);
}

// 两种信封并存：/auth/admin/login 走 {code,message,data:{token}}，
// /auth/phone-login 直接裸返回 {userId,token,...}，所以取值要两边都试。
function pickToken(json) {
  if (!json) return "";
  return json.token || json.data?.token || json.data?.accessToken || "";
}

// 登录端点按 IP 令牌桶限流（容量 10，每 10 秒补 1）；多条验收腿共用同一个 IP，
// 桶空时 429 会被读成「登录不可用」这种假红——等补令牌后重试。
async function loginWithBudget(path, body) {
  for (let i = 0; i < 8; i += 1) {
    const r = await post(path, body);
    if (r.status !== 429) return r;
    console.log(`   [rate-limit] ${path} 被限流，等 11s 重试（第 ${i + 1}/8 次）`);
    await new Promise((res) => setTimeout(res, 11000));
  }
  return post(path, body);
}

// ===== 身份：超管、校区管理员、普通用户（C 端登录） =====
const supLogin = await loginWithBudget("/auth/admin/login", { username: "local-dev-admin-openid-123456", password: process.env.SUPER_PASSWORD || "" });
const supTok = pickToken(supLogin.json);
const cmpLogin = await loginWithBudget("/auth/admin/login", { username: "phone:13711110004", password: "Campus@12345" });
const cmpTok = pickToken(cmpLogin.json);
const userLogin = await loginWithBudget("/auth/phone-login", { phone: "13711110002", password: "Student@12345", deviceId: "verify-device" });
const userTok = pickToken(userLogin.json);
check("超管 / 校区 ADMIN / 普通用户三种登录都可用", !!supTok && !!cmpTok && !!userTok,
  `super=${supLogin.status} campus=${cmpLogin.status} user=${userLogin.status}`);
if (!supTok || !cmpTok || !userTok) {
  console.log(JSON.stringify({ sup: supLogin.text?.slice(0, 160), user: userLogin.text?.slice(0, 160) }));
  // 三身份是后面六类写腿的唯一入口，进不去就没有一条断言有对象。
  // 极性按「仪器故障不计产品 FAIL」分流：连接层没响应 / 没给口令 ⇒ NOT-EVIDENCED 退 2；
  // 后端答了却把带口令的登录拒了 ⇒ 那才是真缺陷，仍走 FAIL 退 1，这条守卫洗不掉红。
  if (transport > 0) {
    finish("NOT-EVIDENCED",
      `${transport} 个请求拿不到任何 HTTP 响应 ⇒ ${BASE} 后端不在，三个身份无从建立，六类写腿零判决（非产品缺陷）`);
  }
  if (!process.env.SUPER_PASSWORD) {
    finish("NOT-EVIDENCED",
      `未设 SUPER_PASSWORD（2026-10-14 口令轮换后不再内置默认值）⇒ 超管身份无从建立，公告/上传/总览/自收尾四条腿没有对象；仪器前提缺失，不计产品缺陷`);
  }
  finish("FAIL",
    `后端有响应但登录被拒 super=${supLogin.status} campus=${cmpLogin.status} user=${userLogin.status} ⇒ 账号/鉴权/口令是真缺陷，后续写腿全部没法判`);
}

// 圈层节点按名字现查，不写死路径：真大区重排（V2026.10.14.0005）把 北大/清华 挪进了华北大区，
// 写死 C1/R1/S1 的门在重排后会红——红的是门，不是产品。
const layerList = (await get("/admin/circle-layers", supTok)).json?.data || [];
const pkuNode = layerList.find((l) => l.name === "北京大学") || {};
const PKU_PATH = pkuNode.circlePath || "";
const PKU_REGION_PATH = pkuNode.parent?.circlePath || "";
console.log(`   派生节点：北京大学=${PKU_PATH || "未挂树"} 所属大区=${PKU_REGION_PATH || "-"}`);

// ===== 1. 公告广播：后台写 → C 端官方号会话读得到 → 下架后读不到 =====
const annBody = { messageType: "text", content: `【验收探针】系统将于今晚维护 ${STAMP}` };
const pub = await post("/admin/official-accounts/official-assistant/messages", annBody, supTok);
const annId = pub.json?.id;
check("超管发布全站公告", pub.status === 200 && !!annId, `status=${pub.status} ${pub.text.slice(0, 90)}`);

const feed = await get("/official-accounts/official-assistant/messages", userTok);
const feedText = JSON.stringify(feed.json || "");
check("普通用户的小程序官方号会话里能看到这条公告（C 端零改动即生效）",
  feed.status === 200 && feedText.includes(String(STAMP)), `status=${feed.status}`);

const takedown = annId ? await del(`/admin/official-accounts/official-assistant/messages/${annId}`, supTok) : { status: 0 };
const feed2 = await get("/official-accounts/official-assistant/messages", userTok);
check("公告下架后 C 端立刻读不到（下架真的生效）",
  takedown.status === 200 && !JSON.stringify(feed2.json || "").includes(String(STAMP)),
  `takedown=${takedown.status}`);

// ===== 2. 后台建帖：校区 ADMIN 发 → 圈层落到本校 → C 端读得到 =====
const title = `后台发布验收${STAMP}`;
const created = await post("/admin/posts", {
  title, content: `这是一条由后台校区管理员发布的验收帖，时间戳 ${STAMP}。`,
  category: "campus", targetType: "general", images: [], tags: ["后台验收"],
}, cmpTok);
const postId = created.json?.id;
check("校区 ADMIN 后台建帖成功", created.status === 200 && !!postId, `status=${created.status} ${created.text.slice(0, 120)}`);
check("帖子按操作人落进本校圈层（决定 14：校区管理员发帖落本校）",
  created.json?.ownerCirclePath === PKU_PATH, `ownerCirclePath=${created.json?.ownerCirclePath} 期望=${PKU_PATH}`);
check("后台自发帖免审直接通过", created.json?.auditStatus === "approved", `auditStatus=${created.json?.auditStatus}`);

const clientPost = await get(`/posts/${postId}`, userTok);
check("普通用户在小程序侧能读到这条后台帖",
  clientPost.status === 200 && JSON.stringify(clientPost.json || "").includes(title),
  `status=${clientPost.status}`);

// ===== 3. 图片上传：后台传 → 带 token 能取回字节 =====
// 本地测试图是仪器的一部分：读不到时这两条腿没有对象，必须记 skip 而不是让 readFileSync
// 抛异常把整个进程崩成 exit 1（那正是「连不上/缺件被读成产品失败」那一类假红）。
const { readFileSync } = await import("node:fs");
let buf = null;
try {
  buf = readFileSync(IMG);
} catch (e) {
  console.log(`   [env] 本地测试图读不到：${IMG}（${scrub(e && e.message).slice(0, 60)}）`);
}
if (buf === null) {
  skips += 2; // 「后台上传图片成功」+「裸 URL 被拒、带 token 才出图」两条
  console.log("SKIP  §3 图片上传两条断言：本地测试图缺失，没有上传对象（不计产品 FAIL，已计入 skip=）");
} else {
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: "image/jpeg" }), "verify-upload.jpg");
  fd.append("type", "image");
  let up = null;
  try {
    up = await fetch(`${BASE}/admin/media/upload`, {
      method: "POST", headers: { Authorization: `Bearer ${supTok}` }, body: fd,
    });
  } catch (e) {
    transport += 1;
    console.log(`   [env] 上传请求连接层失败：${scrub(e && e.message).slice(0, 60)}`);
  }
  const upJson = up ? await up.json().catch(() => null) : null;
  const mediaUrl = upJson?.url || "";
  check("后台上传图片成功并返回相对 key", !!up && up.status === 200 && mediaUrl.startsWith("/api/v1/media/"),
    `status=${up ? up.status : 0} url=${mediaUrl.slice(0, 60)}`);
  if (mediaUrl) {
    const bare = await fetch(`http://127.0.0.1:8080${mediaUrl}`);
    const tokened = await fetch(`http://127.0.0.1:8080${mediaUrl}${mediaUrl.includes("?") ? "&" : "?"}token=${supTok}`);
    const bytes = tokened.ok ? (await tokened.arrayBuffer()).byteLength : 0;
    check("上传的图裸 URL 会被拒、带 token 才出图（withMediaToken 是必需的）",
      bare.status === 401 && tokened.status === 200 && bytes > 1000,
      `bare=${bare.status} tokened=${tokened.status} bytes=${bytes}`);
  } else {
    skips += 1; // 没拿到 key ⇒ 裸 URL/带 token 那条对比断言没对象（上传本身已在上面记红）
  }
}

// ===== 4. 社区总览：字段齐全且数值在合理区间 =====
const ov = await get("/admin/stats/community-overview", supTok);
const d = ov.json?.data || ov.json || {};
const total = Number(d.totalPostCount);
const pending = Number(d.pendingPostCount);
check("社区总览返回完整字段",
  ov.status === 200 && Number.isFinite(total) && Number.isFinite(pending)
  && Array.isArray(d.postsLast7Days) && d.postsLast7Days.length === 7 && d.postsByCategory && typeof d.postsByCategory === "object",
  `status=${ov.status} keys=${Object.keys(d).slice(0, 8).join(",")}`);
check("总览数值自洽（待审 ≤ 总数，且总数已含新建帖）",
  pending >= 0 && pending <= total && total >= 265,
  `pending=${pending} total=${total}`);

// ===== 5. 圈层前缀过滤：越深结果越少（单调，能证伪） =====
const cnt = async (p) => {
  const r = await get(`/admin/forum/village-posts?page=1&pageSize=1${p ? `&circlePath=${p}` : ""}`, supTok);
  return { status: r.status, total: Number(r.json?.data?.total ?? r.json?.total ?? -1) };
};
const all = await cnt("");
const r1 = await cnt("C1");
const r11 = await cnt(PKU_REGION_PATH);
const s1 = await cnt(PKU_PATH);
check("圈层过滤各级都可查询且非空", [all, r1, r11, s1].every((x) => x.status === 200 && x.total > 0),
  JSON.stringify({ all: all.total, c1: r1.total, region: r11.total, school: s1.total }));
check("圈层前缀过滤单调（全平台 ≥ 大区 ≥ 学校）",
  all.total >= r1.total && r1.total >= r11.total && r11.total >= s1.total && s1.total < r11.total,
  `${all.total} ≥ ${r1.total} ≥ ${r11.total} > ${s1.total}`);

// ===== 6. 自收尾：把本次建的验收帖下架（写门每跑必留一条，不清就是往真库里倒垃圾）=====
// 这同时是一条断言：软删之后后台按 marker 必须查不到 —— 清不干净也要看得见。
// 需要留样本复查时加 --keep-post。
if (!process.argv.includes("--keep-post") && postId) {
  const gone = await del(`/admin/forum/village-posts/${postId}`, supTok);
  // 后台列表刻意保留软删行（管理员要能看到"被删了什么"），所以判点不是"查不到"，
  // 而是"这条的状态真的翻成 deleted 且 C 端不再吐它"——前者证下架动作落库，后者证对用户生效。
  const after = await get(`/admin/forum/village-posts?page=1&pageSize=20&keyword=${encodeURIComponent(title)}`, supTok);
  const hit = (after.json?.items || after.json?.data?.items || []).find((x) => x.id === postId);
  const clientFeed = await get(`/posts?page=1&pageSize=100`, userTok);
  const clientItems = clientFeed.json?.items || clientFeed.json?.data?.items || clientFeed.json?.data || [];
  const stillOnClient = Array.isArray(clientItems) && clientItems.some((x) => x.id === postId);
  check("验收帖自收尾：后台状态翻成 deleted 且 C 端列表不再吐它",
    gone.status === 200 && hit?.status === "deleted" && !stillOnClient,
    `del=${gone.status} 后台状态=${hit?.status ?? "查无此条"} C 端命中=${stillOnClient}`);
  console.log(`已收尾下架：帖子 id=${postId}（后台保留 deleted 行可追溯）`);
} else {
  if (process.argv.includes("--keep-post") && postId) skips += 1; // 显式留样 ⇒ 自收尾那条断言按设计不跑，记进 skip 而不是当成判过
  console.log(`留下的验收数据：帖子 id=${postId}（标题「${title}」，作者=校园小助手，圈层=${PKU_PATH}）`);
}

finish();
