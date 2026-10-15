/**
 * 构建「真实演示验收账号」名册：可重跑、幂等（手机号已存在就只核对归属，不重复建号）。
 *
 * 为什么走接口而不是写库：`POST /api/v1/admin/users` 是后台建号的唯一产品入口，
 * 本轮它才刚加上校区能力（campusName/campusBranch/city/department → 写 user_campus_profile
 * 并按学校名回填 users.circle_path）。用别的手段造号，等于绕开正要验收的那条链路。
 *
 * 名册的选取规则（都可核）：
 *   学校名必须是 schools / circle_layer 三级节点里的真实校名；
 *   校区名用该校真实存在的校区（单一校区写「主校区」）；
 *   城市与学校所在地一致（种子那两行「复旦 + 广州」就是反例，已由 V2026.10.14.0006 归正）；
 *   每个大区至少一个学生号，另配一名大区口径的校区管理员，便于演示"绑不同圈层看到不同人"。
 *
 * 用法：SUPER_PASSWORD=... node scripts/build-demo-accounts.mjs [--dry]
 */
const BASE = process.env.ADMIN_API_BASE || "http://127.0.0.1:8080/api";
const SUPER_PASSWORD = process.env.SUPER_PASSWORD || "";
const DRY = process.argv.includes("--dry");
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo@12345";

/** 演示学生号：姓名刻意用「演示·校名」前缀，后台列表一眼能认出是演示号，不会和真实用户混。 */
const STUDENTS = [
  { phone: "13711110011", nickname: "演示·中山大学", campusName: "中山大学", campusBranch: "广州校区南校园", city: "广州", department: "金融学", expectPath: "C1/R2/S17" },
  { phone: "13711110012", nickname: "演示·浙江大学", campusName: "浙江大学", campusBranch: "紫金港校区", city: "杭州", department: "计算机科学与技术", expectPath: "C1/R1/S10" },
  { phone: "13711110013", nickname: "演示·武汉大学", campusName: "武汉大学", campusBranch: "珞珈山主校区", city: "武汉", department: "法学", expectPath: "C1/R9/S11" },
  { phone: "13711110014", nickname: "演示·南开大学", campusName: "南开大学", campusBranch: "八里台校区", city: "天津", department: "历史学", expectPath: "C1/R3/S14" },
];
/** 演示管理员号：绑华南校区，用来演示"校区管理员只见本校、换绑大区即见全大区"。 */
const ADMINS = [
  { phone: "13711110015", nickname: "演示·华南管理员", role: "ADMIN", campusName: "中山大学" },
];

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}
async function call(path, body, tok, method = "POST") {
  const r = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
      "Idempotency-Key": `demo-${method}-${Math.random().toString(36).slice(2)}`,
    },
    // GET 不带 body：带 "null" 体的 GET 会被容器直接拒掉，读端点一律走这条
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* 保留原文 */ }
  return { status: r.status, json, text };
}
const get = (path, tok) => call(path, null, tok, "GET");
/** 探号用的登录调用：429 是共享 IP 的令牌桶，不是"账号不存在"，必须等补令牌后再问。 */
async function loginWithBudget(path, body) {
  let r = await call(path, body);
  for (let i = 0; r.status === 429 && i < 8; i += 1) {
    console.log(`   [rate-limit] ${path} 被限流，等 11s 重试（第 ${i + 1}/8 次）`);
    await new Promise((res) => setTimeout(res, 11000));
    r = await call(path, body);
  }
  return r;
}

const lg = await call("/v1/auth/admin/login", { username: "local-dev-admin-openid-123456", password: SUPER_PASSWORD });
const supTok = (lg.json.data && lg.json.data.token) || lg.json.token || "";
if (!supTok) { console.log(`超管登录失败 http=${lg.status} ${lg.text.slice(0, 120)}`); process.exit(2); }
const layers = (await get("/v1/admin/circle-layers", supTok)).json.data || [];
const nodeOf = (name) => layers.find((l) => l.name === name);

if (DRY) {
  for (const s of [...STUDENTS, ...ADMINS]) {
    const n = nodeOf(s.campusName);
    console.log(`DRY ${s.phone} ${s.nickname} → ${s.campusName}${n ? " = " + n.circlePath : " 【树上没有这个校名！】"}`);
  }
  process.exit(0);
}

const created = [];
for (const s of STUDENTS) {
  const node = nodeOf(s.campusName);
  check(`${s.campusName} 在圈层树三级节点上（真实校名，不是「北校区」这种校区词）`, !!node && node.level === 3,
    node ? `节点 ${node.id}:${node.circlePath}` : "未挂树");
  if (!node) continue;
  // 幂等靠"先探号"而不是解析错误文案：重复手机号在本 profile 被统一掩成 400「请求参数错误」，
  // 拿 message 文本判"已存在"永远判不到（这条踩过一次就记下来）。
  const probe = await loginWithBudget("/v1/auth/phone-login", { phone: s.phone, password: DEMO_PASSWORD, deviceId: "demo-probe" });
  const existingId = probe.json.userId || (probe.json.data && probe.json.data.userId);
  if (probe.status === 200 && existingId) {
    console.log(`   [note] ${s.phone} 已存在（userId=${existingId}）⇒ 跳过建号，只复核归属`);
    created.push({ ...s, id: Number(existingId), path: node.circlePath });
    continue;
  }
  if (probe.status === 429) {
    console.log(`   [inconclusive] ${s.phone} 探号一直被限流 ⇒ 不硬建号`);
    continue;
  }
  const r = await call("/v1/admin/users", {
    phone: s.phone, password: DEMO_PASSWORD, nickname: s.nickname,
    campusName: s.campusName, campusBranch: s.campusBranch, city: s.city, department: s.department,
  }, supTok);
  check(`${s.nickname} 后台建号成功（带校区）`, r.status === 200, `http=${r.status} ${r.text.slice(0, 90)}`);
  if (r.status !== 200) continue;
  created.push({ ...s, id: r.json.data && r.json.data.id, path: node.circlePath });
}

for (const a of ADMINS) {
  // 探号必须能区分「不存在」与「被限流」：429 时若当成不存在，就会去重复建号并撞上 400，
  // 把一次正常的幂等重跑报成失败（实测踩过）。限流就等补令牌再探，探不清就跳过而不是硬建。
  let probe = await call("/v1/auth/admin/login", { username: `phone:${a.phone}`, password: DEMO_PASSWORD });
  for (let i = 0; probe.status === 429 && i < 8; i += 1) {
    console.log(`   [rate-limit] 探号 ${a.phone} 被限流，等 11s 重试（第 ${i + 1}/8 次）`);
    await new Promise((r) => setTimeout(r, 11000));
    probe = await call("/v1/auth/admin/login", { username: `phone:${a.phone}`, password: DEMO_PASSWORD });
  }
  if (probe.status === 200) {
    console.log(`   [note] ${a.phone} 已存在（userId=${probe.json?.data?.user?.id}）⇒ 跳过建号`);
    continue;
  }
  if (probe.status === 429) {
    console.log(`   [inconclusive] ${a.phone} 探号一直被限流 ⇒ 不硬建号（宁可跳过也不制造重复/假失败）`);
    continue;
  }
  const r = await call("/v1/admin/users/admins", {
    phone: a.phone, password: DEMO_PASSWORD, nickname: a.nickname, role: a.role, campusName: a.campusName,
  }, supTok);
  check(`${a.nickname} 校区管理员建号成功`, r.status === 200, `http=${r.status} ${r.text.slice(0, 90)}`);
}

// 逐个回读：号码能登录 + 归属落在预期节点 + 该节点的成员名单里真的有这个人
for (const s of created) {
  const login = await call("/v1/auth/phone-login", { phone: s.phone, password: DEMO_PASSWORD, deviceId: "demo-build" });
  const uid = login.json.userId || (login.json.data && login.json.data.userId);
  check(`${s.nickname} 可用手机号登录（真号，不是只落库的半截数据）`, login.status === 200 && !!uid,
    `http=${login.status} userId=${uid || "-"}`);
  const members = (await get(`/v1/admin/evidence/circle/${nodeOf(s.campusName).id}/users`, supTok)).json.data || [];
  const hit = members.find((u) => Number(u.id) === Number(uid));
  check(`${s.nickname} 出现在「${s.campusName}」圈层节点成员里（circle_path 由后端回填）`,
    !!hit && hit.circlePath === s.expectPath, `读到=${hit ? hit.circlePath : "不在名单"} 期望=${s.expectPath}`);
}

// 演示号总数与「未归属」余量：这两数决定后台圈层树点开是不是有的可看
const ov = (await get("/v1/admin/stats/community-overview", supTok)).json;
const un = (await get("/v1/admin/users?page=1&pageSize=1&role=USER", supTok)).json;
console.log(`\n名册：新建/复核 ${created.length} 个学生号 + ${ADMINS.length} 个管理员号，口令统一走 DEMO_PASSWORD（默认 Demo@12345）`);
console.log(`USER 总数=${un.total ?? un.data?.total ?? "-"} 未归属帖数=${ov?.unassignedCirclePostCount ?? "-"}`);
console.log(`\n失败 ${failures} 项`);
process.exit(failures > 0 ? 1 : 0);
