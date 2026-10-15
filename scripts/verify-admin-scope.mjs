/**
 * 数据域（圈层 × 角色）越权验收。
 *
 * 与 verify-admin-auditor.mjs 的分工：那边验「能不能写」，这边验「能看见谁的数据」。
 * 每条断言的期望量都取自后端自身（超管带 circlePath/campusName 过滤），
 * 而不是写死数字——写死会随数据漂移假红或假绿。
 *
 * 2026-10-14 裁定「绑定圈层后以圈层为准」后的口径：
 *   已绑定 admin_layer 的账号 = 纯圈层前缀量（不再与自身管辖校区取交集），
 *   调用方显式传 campusName 时才主动收窄。
 *   判别性证明是「绑大区的可见量严格大于绑本校」——旧的校区天花板下两者必然相等。
 *
 * 用法：node scripts/verify-admin-scope.mjs   （需 real 后端 :8080 + SUPER_PASSWORD）
 */

const BASE = process.env.ADMIN_API_BASE || "http://127.0.0.1:8080/api/v1";
const SUPER = { username: "local-dev-admin-openid-123456", password: process.env.SUPER_PASSWORD || "" };
const PKU_CAMPUS = "北京大学";

let failures = 0;
let passes = 0;
let skips = 0;
/**
 * transport = 一个 HTTP 响应都没拿到的请求数（ECONNREFUSED / DNS / 连接层异常）。
 * 本仓口径：仪器与环境故障不计入产品 FAIL ⇒ transport>0 时判决只能是 NOT-EVIDENCED（退 2）。
 * 只认「完全没有 HTTP 响应」：4xx/5xx 都算后端活着（那正是本门要审的东西），所以这道守卫
 * 不可能把真越权洗成绿——它只在 8080 没起时接管。
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
    ? `数据域越权断言有 ${failures} 项不成立（FAIL 行见上：圈层量/改绑扩量/他校详情/未绑定 fail-closed 四类）`
    : s === "NOT-EVIDENCED"
      ? `${transport} 个请求拿不到任何 HTTP 响应 ⇒ ${BASE} 无后端可判，仪器故障不计产品 FAIL`
      : `${passes} 项断言全绿（圈层驱动可见性、撤校区天花板、显式收窄、未绑定 fail-closed 都判到）` + (skips ? `；另有 ${skips} 项因缺样本没跑` : ""));
  console.log(`ADMSCOPE_RESULT=${s} pass=${passes} fail=${failures} skip=${skips} transport=${transport}（${scrub(why)}）`);
  process.exit(s === "FAIL" ? 1 : s === "NOT-EVIDENCED" ? 2 : 0);
}

async function loginOnce(username, password) {
  let r;
  try {
    r = await fetch(`${BASE}/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Idempotency-Key": `lg-${Math.random().toString(36).slice(2)}` },
      body: JSON.stringify({ username, password }),
    });
  } catch (e) {
    transport += 1; // 连接层失败：没有 HTTP 响应，不是「登录被拒」
    return { status: 0, token: "", role: undefined, id: undefined, campusName: undefined };
  }
  const j = await r.json().catch(() => ({}));
  // AdminLoginView: { code, message, data: { token, user: { id, username, displayName, role, campusName } } }
  return {
    status: r.status,
    token: j.data?.token || "",
    role: j.data?.user?.role,
    id: j.data?.user?.id,
    campusName: j.data?.user?.campusName,
  };
}
// 登录端点按 IP 限流（容量 10，每 10 秒补 1 个令牌），本腿要登 3 个账号 ×多轮绑定，
// 桶空时是 429 而非权限问题——等补令牌重试，否则限流会被读成「圈层没生效」。
async function login(username, password) {
  for (let i = 0; i < 8; i += 1) {
    const r = await loginOnce(username, password);
    if (r.status !== 429) return r;
    console.log(`   [rate-limit] ${username} 登录被限流，等 11s 重试（第 ${i + 1}/8 次）`);
    await new Promise((res) => setTimeout(res, 11000));
  }
  return loginOnce(username, password);
}
async function get(path, token) {
  let r;
  try {
    r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    transport += 1;
    return { status: 0, json: null, text: `连接层失败：${scrub(e && e.message)}`, total: -1 };
  }
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch { /* ignore */ }
  return { status: r.status, json: j, text: t, total: Number(j?.data?.total ?? j?.total ?? -1) };
}
async function put(path, body, token) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}`, "Idempotency-Key": `u-${Math.random().toString(36).slice(2)}` },
      body: JSON.stringify(body),
    });
    return { status: r.status, text: await r.text() };
  } catch (e) {
    transport += 1;
    return { status: 0, text: `连接层失败：${scrub(e && e.message)}` };
  }
}
async function post(path, body, token) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}`, "Idempotency-Key": `p-${Math.random().toString(36).slice(2)}` },
      body: JSON.stringify(body),
    });
    return { status: r.status, text: await r.text() };
  } catch (e) {
    transport += 1;
    return { status: 0, text: `连接层失败：${scrub(e && e.message)}` };
  }
}

// ===== 0. 仪器前提：后端不在了要说「没对象」，不能说「数据域失效」=====
try {
  const pre = await fetch(`${BASE}/admin/circle-layers`, { method: "GET" });
  console.log(`   [preflight] ${BASE} 有 HTTP 响应（status=${pre.status}；401/403 同样算后端活着）`);
} catch (e) {
  transport += 1;
  console.log(`   [preflight] ${BASE} 无 HTTP 响应：${scrub(e && e.message).slice(0, 90)}`);
  finish("NOT-EVIDENCED",
    `后端不在（${BASE} 连接失败：${scrub(e && e.message).slice(0, 60)}）⇒ 参照量与三条数据域腿都没有对象，记 NOT-EVIDENCED 退 2，不计产品 FAIL`);
}

const sup = await login(SUPER.username, SUPER.password);
if (!sup.token) {
  console.log("超管登录失败——先设 SUPER_PASSWORD 环境变量（轮换后的口令）");
  finish("NOT-EVIDENCED", transport > 0
    ? `${transport} 个请求拿不到任何 HTTP 响应 ⇒ ${BASE} 后端不在，超管身份无从建立，本门零判决（退 2，不计产品 FAIL）`
    : `超管登录没拿到 token（status=${sup.status ?? "-"}）⇒ 缺 SUPER_PASSWORD 或该账号不可用，参照量无从派生；仪器前提缺失，不计产品缺陷`);
}

// 圈层节点全部按名字从树上现查，不写死 id/path：
// 真大区重排（V2026.10.14.0005）会把 北大/清华 从 C1/R1 挪到 C1/R3，
// 写死路径的门在重排后会变成"红的是门不是产品"——那正是本仓反复付过学费的那类假红。
const layersRes = await get("/admin/circle-layers", sup.token);
const layers = layersRes.json?.data || [];
if (!layers.length && layersRes.status !== 200 && layersRes.status !== 0) {
  // 有 HTTP 响应却是 4xx/5xx ⇒ 超管连自己的圈层树都读不动，这是产品缺陷，
  // 绝不允许在下面那条「树上找不到节点」里被洗成 NOT-EVIDENCED。
  check(`超管读圈层树（status=${layersRes.status}）`, false, scrub(layersRes.text).slice(0, 90));
  finish();
}
const nodeOf = (name) => layers.find((l) => l.name === name);
const pkuNode = nodeOf("北京大学"), thuNode = nodeOf("清华大学");
if (!pkuNode || !thuNode || !pkuNode.parent || !thuNode.parent) {
  console.log("圈层树上找不到 北京大学/清华大学（或其父节点），无法派生参照量");
  finish("NOT-EVIDENCED", transport > 0
    ? `${transport} 个请求拿不到任何 HTTP 响应 ⇒ 圈层树没读回来是后端不在，不是产品缺陷（退 2）`
    : "圈层树上没有 北京大学/清华大学（或其父节点）⇒ 参照量无从派生，判别性断言没有对象（树/数据缺件），按 NOT-EVIDENCED 退 2，不计产品 FAIL");
}
if (pkuNode.parent.circlePath !== thuNode.parent.circlePath) {
  console.log(`北京大学与清华大学不在同一大区（${pkuNode.parent.circlePath} vs ${thuNode.parent.circlePath}）⇒ 大区判别性断言的前提不成立`);
  finish("NOT-EVIDENCED",
    `北大(${pkuNode.parent.circlePath})与清华(${thuNode.parent.circlePath})不在同一大区 ⇒ 「绑大区>绑本校」的判别性前提被树形作废，本门核心断言没有对象（判据前提缺失，不计产品 FAIL）`);
}
const PKU = pkuNode.id, THU = thuNode.id, REGION = pkuNode.parent.id;
const PKU_PATH = pkuNode.circlePath, THU_PATH = thuNode.circlePath, REGION_PATH = pkuNode.parent.circlePath;
const REGION_NAME = pkuNode.parent.name || REGION_PATH;
const qs = (s) => encodeURIComponent(s);
console.log(`   派生节点：北大=${PKU}:${PKU_PATH} 清华=${THU}:${THU_PATH} 共同大区=${REGION}(${REGION_NAME}):${REGION_PATH}`);

// ---- 参照量：全部由超管从后端算出 ----
const superAll = await get("/admin/forum/village-posts?page=1&pageSize=1", sup.token);
const superPku = await get(`/admin/forum/village-posts?page=1&pageSize=1&circlePath=${PKU_PATH}`, sup.token);
const superThu = await get(`/admin/forum/village-posts?page=1&pageSize=1&circlePath=${THU_PATH}`, sup.token);
const superRegion = await get(`/admin/forum/village-posts?page=1&pageSize=1&circlePath=${REGION_PATH}`, sup.token);
const superPkuCampus = await get(
  `/admin/forum/village-posts?page=1&pageSize=1&circlePath=${PKU_PATH}&campusName=${qs(PKU_CAMPUS)}`, sup.token);
const superRegionPkuCampus = await get(
  `/admin/forum/village-posts?page=1&pageSize=1&circlePath=${REGION_PATH}&campusName=${qs(PKU_CAMPUS)}`, sup.token);

check("超管可见全平台且 circlePath 过滤可用",
  superAll.total > 0 && superPku.total > 0 && superThu.total > 0 && superPku.total < superAll.total,
  `全=${superAll.total} 北大=${superPku.total} 清华=${superThu.total}`);

// 后面所有「绑大区 > 绑本校」的断言都依赖数据面本身有区分度；缺这一步时
// 「以圈层为准」和「天花板仍在」会给出同样的数字，断言退化成空转。
check("参照量具备判别性（大区纯量 > 单校纯量 > 单校∩校区）",
  superRegion.total > superPku.total && superPku.total >= superPkuCampus.total,
  `大区=${superRegion.total} 北大纯圈层=${superPku.total} 北大∩校区=${superPkuCampus.total}`);

// 取一个清华作者的帖子 id，用于越权读详情断言
const thuList = await get(`/admin/forum/village-posts?page=1&pageSize=5&circlePath=${THU_PATH}`, sup.token);
const thuPostId = (thuList.json?.data?.items || thuList.json?.items || [])[0]?.id;
// 同样取一个清华圈层下的用户 id：用户详情的守卫必须与用户列表同口径，否则「列表能看见、点进去 403」。
// 只按 circlePath 取，不按校区名取——evidence 的 users 接口读的是 users.campus_name（旧列，
// 与 user_campus_profile 不同源），实测存在「campus_name=清华 但 circle_path=北大节点」的行，
// 按校区名挑会拿到不属于目标圈层的人，断言就跑偏。
const regionUsers = await get(`/admin/evidence/circle/${REGION}/users`, sup.token);
const regionUserItems = regionUsers.json?.data || [];
const thuUser = regionUserItems.find((u) => u.circlePath === THU_PATH);
const thuUserId = thuUser?.id;

const accounts = [
  { name: "校区管理员(北大)", user: "phone:13711110004", pass: "Campus@12345", layer: PKU },
  { name: "审核员(北大)", user: "phone:13711110005", pass: "Auditor@12345", layer: PKU },
];

async function bindLayer(a, layerId, supToken) {
  const s = await login(a.user, a.pass);
  if (!s.token) return null;
  const already = JSON.stringify((await get(`/admin/admin-layers/admin/${s.id}`, supToken)).json || "");
  if (!already.includes(`"circleLayerId":${layerId}`)) {
    const bind = await post("/admin/admin-layers",
      { adminId: s.id, circleLayerId: layerId, roleCode: s.role }, supToken);
    if (bind.status !== 200) console.log(`   [note] ${a.name} 绑定圈层 ${bind.status} ${bind.text.slice(0, 120)}`);
  }
  return { ...s, name: a.name };
}

// ---- 主账号（校区 ADMIN）：绑本校 → 纯圈层量 ----
const admin = await bindLayer(accounts[0], PKU, sup.token);
if (!admin) {
  check("校区管理员(北大) 登录", false, "登录失败，后续断言跳过");
  skips += 11; // 该账号没登进来 ⇒ 本校量/撤天花板/改绑扩量/显式收窄/两条他校详情/用户列表两腿/复原/绑本校读他校被拒 全没跑
} else {
  const scoped = await get("/admin/forum/village-posts?page=1&pageSize=1", admin.token);
  check("绑本校后见「纯圈层量」（校区天花板已撤，以圈层为准）",
    scoped.total === superPku.total,
    `看到=${scoped.total} 纯圈层=${superPku.total} 旧交集=${superPkuCampus.total} 全平台=${superAll.total}`);
  check("撤天花板的证据可见（纯圈层量 > 旧交集量，故本账号确实不再被自身校区收窄）",
    superPku.total > superPkuCampus.total && scoped.total > superPkuCampus.total,
    `纯圈层=${superPku.total} 旧交集=${superPkuCampus.total}`);

  if (thuPostId) {
    const cross = await get(`/admin/forum/village-posts/${thuPostId}`, admin.token);
    check("绑北大者读他校（清华）帖子详情被拒", cross.status === 403, `status=${cross.status} ${cross.text.slice(0, 60)}`);
  } else {
    skips += 1; // 清华圈层下取不到帖子样本 ⇒ 这条越权读详情断言没对象
  }

  // ---- 判别性核心：改绑华东大区，可见量必须扩到整个大区 ----
  const swapRegion = await put(`/admin/admin-layers/admin/${admin.id}`,
    [{ adminId: admin.id, circleLayerId: REGION, roleCode: admin.role }], sup.token);
  const asRegion = await get("/admin/forum/village-posts?page=1&pageSize=1", admin.token);
  check(`改绑${REGION_NAME}后可见量扩到全大区（旧交集口径下这里会等于绑本校）`,
    swapRegion.status === 200 && asRegion.total === superRegion.total && asRegion.total > scoped.total,
    `大区=${asRegion.total} 本校=${scoped.total} 期望(大区纯量)=${superRegion.total} 校区=${admin.campusName ?? "空"}`);

  // 显式传 campusName 仍要生效：运营主动收窄的能力不能被圈层轴吃掉
  const narrowed = await get(
    `/admin/forum/village-posts?page=1&pageSize=1&campusName=${qs(PKU_CAMPUS)}`, admin.token);
  check("绑大区后显式传 campusName 仍能主动收窄",
    narrowed.total === superRegionPkuCampus.total && narrowed.total < asRegion.total,
    `收窄=${narrowed.total} 不传=${asRegion.total} 期望=${superRegionPkuCampus.total}`);

  // 详情守卫必须与列表同口径：绑大区后大区内他校（清华）的帖子/用户都应能点开。
  // 旧的校区天花板会在这里返回 403——看得到却点不开。
  const regionPostDetail = await get(`/admin/forum/village-posts/${thuPostId}`, admin.token);
  check("绑大区后大区内他校帖子详情可点开（校区天花板下会 403）",
    !!thuPostId && regionPostDetail.status === 200,
    `postId=${thuPostId} status=${regionPostDetail.status} ${regionPostDetail.text.slice(0, 60)}`);
  const regionUserDetail = await get(`/admin/users/${thuUserId}`, admin.token);
  check("绑大区后大区内他校用户详情可点开（校区天花板下会 403）",
    !!thuUserId && regionUserDetail.status === 200,
    `userId=${thuUserId} status=${regionUserDetail.status} ${regionUserDetail.text.slice(0, 60)}`);

  // 用户列表同一条裁定（AdminUserController）
  const usersPku = await get("/admin/users?page=1&pageSize=1", admin.token);
  await put(`/admin/admin-layers/admin/${admin.id}`,
    [{ adminId: admin.id, circleLayerId: PKU, roleCode: admin.role }], sup.token);
  const usersScoped = await get("/admin/users?page=1&pageSize=1", admin.token);
  check("用户列表同口径：绑大区可见用户数严格大于绑本校",
    usersPku.total > 0 && usersScoped.total > 0 && usersPku.total > usersScoped.total,
    `大区=${usersPku.total} 本校=${usersScoped.total}`);
  const usersNarrow = await get(`/admin/users?page=1&pageSize=1&campusName=${qs(PKU_CAMPUS)}`, admin.token);
  check("用户列表显式 campusName 仍能收窄到本校",
    usersNarrow.total > 0 && usersNarrow.total <= usersScoped.total,
    `传本校=${usersNarrow.total} 不传=${usersScoped.total}`);

  const restored = await get("/admin/forum/village-posts?page=1&pageSize=1", admin.token);
  check("复原绑定后回到本校量级", restored.total === superPku.total, `${restored.total} vs ${superPku.total}`);
  const pkuUserDetail = await get(`/admin/users/${thuUserId}`, admin.token);
  check("绑北大者读他校（清华）用户详情被拒",
    !!thuUserId && pkuUserDetail.status === 403,
    `userId=${thuUserId} status=${pkuUserDetail.status} ${pkuUserDetail.text.slice(0, 60)}`);
}

// ---- AUDITOR：绑定驱动可见性的 A/B（绑清华 ≠ 绑北大） ----
const aud = await bindLayer(accounts[1], PKU, sup.token);
if (!aud) {
  check("审核员(北大) 登录", false, "登录失败，A/B 断言跳过");
  skips += 2; // 改绑清华后可见量随之改变 + 复原绑定回本校量级
} else {
  const beforeAud = await get("/admin/forum/village-posts?page=1&pageSize=1", aud.token);
  const swap = await put(`/admin/admin-layers/admin/${aud.id}`,
    [{ adminId: aud.id, circleLayerId: THU, roleCode: aud.role }], sup.token);
  const afterSwap = await get("/admin/forum/village-posts?page=1&pageSize=1", aud.token);
  check("审核员改绑清华后可见量随之改变（证明圈层绑定真在驱动可见性）",
    swap.status === 200 && afterSwap.total === superThu.total && afterSwap.total !== beforeAud.total,
    `改绑后=${afterSwap.total} 期望(清华纯量)=${superThu.total} 改绑前=${beforeAud.total}`);
  await put(`/admin/admin-layers/admin/${aud.id}`,
    [{ adminId: aud.id, circleLayerId: PKU, roleCode: aud.role }], sup.token);
  const restoredAud = await get("/admin/forum/village-posts?page=1&pageSize=1", aud.token);
  check("审核员复原绑定后回到本校量级",
    restoredAud.total === superPku.total, `${restoredAud.total} vs ${superPku.total}`);
}

// ---- 未绑定圈层的 ADMIN：fail-closed，绝不默认全平台 ----
const unboundName = "phone:13711110006";
let unbound = await login(unboundName, "Unbound@12345");
if (!unbound.token) {
  const c = await post("/admin/users/admins",
    { phone: "13711110006", password: "Unbound@12345", nickname: "无绑定管理员", role: "ADMIN", campusName: "南京大学" }, sup.token);
  if (c.status === 200) unbound = await login(unboundName, "Unbound@12345");
  else console.log(`   [note] 创建无绑定管理员失败 ${c.status} ${c.text.slice(0, 90)}`);
}
if (unbound.token) {
  const u = await get("/admin/forum/village-posts?page=1&pageSize=1", unbound.token);
  const uu = await get("/admin/users?page=1&pageSize=1", unbound.token);
  // 要守的性质是「不得默认全平台可见」：fail-closed 到 0/403，或收敛到自己校区，都算通过；
  // 看到全平台量级才算失败。
  check("未绑定圈层的 ADMIN 帖子列表不得默认看到全平台",
    u.status === 403 || (u.total >= 0 && u.total < superAll.total),
    `status=${u.status} total=${u.total} 全平台=${superAll.total}`);
  check("未绑定圈层的 ADMIN 用户列表同样不得看到全平台",
    uu.status === 403 || (uu.total >= 0 && uu.total < superAll.total),
    `status=${uu.status} total=${uu.total} 全平台=${superAll.total}`);
} else {
  // 这个账号既没登录进来、也没能新建成功（上面 [note] 有出处）⇒ fail-closed 两条腿没有对象。
  // 记 skip 不记 FAIL：拿不到无绑定 ADMIN 是样本/仪器缺失，不是数据域守卫失效。
  skips += 2;
}

finish();
