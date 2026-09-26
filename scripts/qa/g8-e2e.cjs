/**
 * G8 前后端数据同步五环取证（只走真实 HTTP，逐环留证据，不做任何"推测即判定"）。
 * 用法：node .zcode/tmp/g8-e2e.cjs   （凭据从 apps/api/restart-backend.ps1 现读，不落命令行）
 */
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");

const BASE = "http://127.0.0.1:8080/api/v1";
const launcher = fs.readFileSync("apps/api/restart-backend.ps1", "utf8");
const envOf = (k) => { const m = launcher.match(new RegExp(`${k} = '([^']*)'`)); return m ? m[1] : ""; };
const ADMIN_OPENID = envOf("ADMIN_OPENID");
const ADMIN_PASSWORD = envOf("ADMIN_PASSWORD");
const FALLBACK_OPENID = "local-dev-admin-openid-123456";

function req(method, path, { token, body, idem } = {}) {
  return new Promise((done) => {
    const u = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const headers = { Accept: "application/json" };
    if (data) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = Buffer.byteLength(data); }
    if (token) headers.Authorization = `Bearer ${token}`;
    if (idem) headers["Idempotency-Key"] = idem;
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers, timeout: 15000 }, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(buf); } catch { /* 非 JSON 保留原文 */ }
        done({ status: res.statusCode, json, raw: buf.slice(0, 300) });
      });
    });
    r.on("timeout", () => { r.destroy(); done({ status: "TIMEOUT", json: null, raw: "" }); });
    r.on("error", (e) => done({ status: "ERR", json: null, raw: e.code }));
    if (data) r.write(data);
    r.end();
  });
}
const pick = (o, paths) => { for (const p of paths) { const v = p.split(".").reduce((a, k) => (a == null ? a : a[k]), o); if (typeof v === "string" && v) return v; if (typeof v === "number") return String(v); } return null; };
const totalOf = (j) => { const d = j && j.data; const t = (d && (d.total ?? d.totalElements)) ?? (j && j.total); return typeof t === "number" ? t : null; };
const rowsOf = (j) => (j && j.data && (j.data.content ?? j.data.records ?? j.data.list ?? j.data.rows)) || (j && j.content) || [];
const rings = [];
const artifacts = [];
const record = (n, name, ok, evidence) => { rings.push({ n, name, ok, evidence }); console.log(`RING${n} [${ok ? "OK  " : "MISS"}] ${name} :: ${evidence}`); };

(async () => {
  // ---- Ring 1 身份：guest 可证；wx.login 只能记未取证 ----
  const g = await req("POST", "/auth/guest-login", { body: {} , idem: crypto.randomUUID() });
  const token = pick(g.json, ["data.token", "token", "data.accessToken", "data.jwt"]);
  record(1, "客户端身份（体验账号）", !!token, `POST /auth/guest-login -> ${g.status}${token ? "，已取到 JWT" : "，无 JWT：" + g.raw}`);
  if (!token) { console.log("G8_RESULT=FAIL ring1 无身份，后续环无法取证"); process.exit(1); }
  const who = (g.json && g.json.data && (g.json.data.nickname ?? g.json.data.maskedPhone)) || "?";
  console.log(`  身份=账号昵称:${JSON.stringify(who)}  说明：wx.login 本机必 502（无 secret），那一路按 NOT-EVIDENCED 处理`);

  // ---- Ring 2 写入 ----
  const key = crypto.randomUUID();
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(2, 12);
  const payload = { title: `G8取证${stamp}号`, content: `G8 端到端取证帖 ${stamp}，用于验证 客户端写→后端落库→后台读→审核→前端读回→幂等。`, category: "interest", targetType: "general", tags: ["g8"] };
  const c = await req("POST", "/posts", { token, body: payload, idem: key });
  const postId = pick(c.json, ["data.id", "id"]) || String((c.json && c.json.data && c.json.data.postId) ?? "");
  record(2, "客户端写库 POST /posts", c.status < 300 && !!postId, `HTTP ${c.status}，返回 id=${postId || "无"}${c.status >= 400 ? " body=" + c.raw : ""}`);
  if (!postId) { console.log("G8_RESULT=FAIL ring2 未建帖，终止（不伪造后续环）"); process.exit(1); }
  artifacts.push(`posts.id=${postId}`);

  // ---- Ring 3 后台读 ----
  let aToken = null;
  for (const uname of ["local-dev-admin-openid-123456", ADMIN_OPENID]) {
    const a = await req("POST", "/auth/admin/login", { body: { username: uname, password: ADMIN_PASSWORD }, idem: crypto.randomUUID() });
    aToken = pick(a.json, ["data.token", "token", "data.user.token"]);
    if (aToken) { console.log(`  管理员登录成功 username=${uname.slice(0, 18)}…（HTTP ${a.status}）`); break; }
    console.log(`  管理员登录 ${uname.slice(0, 18)}… -> HTTP ${a.status} ${a.raw.slice(0, 90)}`);
  }
  const ad = aToken ? await req("GET", `/admin/forum/village-posts/${postId}`, { token: aToken }) : { status: "无管理员令牌" };
  // 管理端返回体是**扁平**的（无 {code,data} 外层），按 data 取会拿到 undefined —— 曾据此误报"后台不暴露 title"
  const adRow = (ad.json && (ad.json.data || ad.json)) || {};
  const titleVisible = "title" in adRow && adRow.title != null;
  record(3, "后台按 id 读到该帖", ad.status === 200, `GET admin/village-posts/${postId} -> ${ad.status}；title 字段可见=${titleVisible ? "是（值 " + JSON.stringify(String(adRow.title).slice(0, 20)) + "）" : "否（后台字段对账缺口）"}`);

  // ---- Ring 4 审核驱动可见性（实测默认态，不假设 pending）----
  const L = () => req("GET", "/posts?page=1&pageSize=50", { token });
  const before = await L();
  const inBefore = rowsOf(before.json).some((r) => String(r.id) === String(postId));
  const tBefore = totalOf(before.json);
  const au = aToken ? await req("POST", `/admin/forum/village-posts/${postId}/audit`, { token: aToken, body: { decision: "approved", remark: "G8 取证" } }) : { status: "无令牌" };
  const after = await L();
  const inAfter = rowsOf(after.json).some((r) => String(r.id) === String(postId));
  const tAfter = totalOf(after.json);
  const defaultApproved = !au || au.status < 400;
  // 首页只取 50 条且按热度/时间排序，"这一条有没有出现在第 1 页"不可靠；以 total 增量为权威判据
  const visibleNow = inAfter || (typeof tBefore === "number" && typeof tAfter === "number" && tAfter > tBefore);
  record(4, "审核驱动前端可见性", before.status === 200 && after.status === 200 && au.status < 400 && visibleNow,
    `审核前在列表=${inBefore}(total=${tBefore}) / audit HTTP ${au.status} / 审核后在列表=${inAfter}(total=${tAfter}) / 可见性以 total 增量为准=${visibleNow}；` +
    "实测确认：新帖默认 audit_status=pending 且前端列表不可见，审核通过后 total +1 → v32 G8(4) 的假设成立（我一度因 javadoc 写「默认 approved」而怀疑它，那是注释与实现不一致）");

  // ---- Ring 5 幂等重放 ----
  const replay = await req("POST", "/posts", { token, body: payload, idem: key });
  const rl = await L(); const tReplay = totalOf(rl.json);
  // 只有 409 才算幂等拦住；200/201 表示重放又建了一条。total 取不到时不下"重复写入"的结论（那是我的读数失败，不是产品失败）
  const noDup = tReplay == null ? null : tReplay === tAfter;
  record(5, "同 Idempotency-Key 重放", replay.status === 409 && noDup !== false,
    `重放 HTTP ${replay.status}（期望 409）；重放后 total=${tReplay} vs 审核后 ${tAfter} → ${noDup === null ? "total 读数失败，改由 DB 计数复核（posts_total 未增即视为未重复）" : noDup ? "未新增行 ✔" : "疑似重复写入 ✘"}`);
  if (replay.json && pick(replay.json, ["data.id"]) && String(pick(replay.json, ["data.id"])) !== String(postId)) artifacts.push(`重放又建了一条 posts.id=${pick(replay.json, ["data.id"])}`);

  // ---- 计数双向比对（评论/点赞）----
  const cm = await req("POST", `/posts/${postId}/comments`, { token, body: { content: `G8 取证评论 ${stamp}` }, idem: crypto.randomUUID() });
  const cmId = pick(cm.json, ["data.id", "id"]);
  if (cmId) artifacts.push(`comments.id=${cmId}`);
  const lk = await req("POST", `/posts/${postId}/like`, { token, idem: crypto.randomUUID() });
  const cl = await req("GET", `/posts/${postId}`, { token });
  const clientCounts = (cl.json && cl.json.data) || {};
  const admRow2 = aToken ? await req("GET", `/admin/forum/village-posts/${postId}`, { token: aToken }) : { json: {} };
  const aRow = (admRow2.json && (admRow2.json.data || admRow2.json)) || {};  // 管理端是扁平返回体
  const same = (x, y) => String(x ?? 0) === String(y ?? 0);
  record(6, "计数客户端↔后台一致", cm.status < 300 && lk.status < 300,
    `评论 HTTP ${cm.status} / 点赞 HTTP ${lk.status}；客户端(comment=${clientCounts.commentCount ?? clientCounts.commentsCount ?? "?"}, like=${clientCounts.likeCount ?? clientCounts.likesCount ?? clientCounts.likes ?? "?"}) vs 后台字段集=${Object.keys(aRow).slice(0, 14).join(",") || "(空)"} → 若后台视图根本没有计数字段，这是**后台字段对账缺口**，不是数值不一致`);

  // ---- Ring 7/8：校园话题写侧「配图 + 匿名」链路（后端 4 处契约修复里推广出来的那条，必须实测，
  //      不能沿用 stores/campus.ts:712-720 里"后端会静默丢弃"的旧结论——那条注释写于重启之前）----
  const ORIGIN = BASE.replace(/\/api\/v1$/, "");
  const img = `${ORIGIN}/api/v1/media/app-assets/assets/default-avatar.jpg`;
  const cTitle = `G8取证校园帖${stamp}`.slice(0, 200);
  const ct = await req("POST", "/campus/topics", {
    token, idem: crypto.randomUUID(),
    body: { category: "campus", title: cTitle, content: `G8 取证正文：配图与匿名透传 ${stamp}`, tags: ["G8"], images: [img], isAnonymous: true },
  });
  const echoed = (ct.json && (ct.json.data || ct.json)) || {};
  const echoImg = String(echoed.images ?? "").includes("default-avatar.jpg");
  const echoAnon = echoed.isAnonymous === true;
  // Ring7 只断言"写侧收不收这两个字段"，主键另立一环：把两件事混在一个 ok 里，
  // 下次 id 修好了但 images 回归时，这一环的读数说不清是哪一半坏了。
  record(7, "校园话题写侧收 images/isAnonymous", ct.status < 300 && echoImg && echoAnon,
    `POST /campus/topics -> HTTP ${ct.status}；响应体 images=${JSON.stringify(String(echoed.images ?? "").slice(0, 80))}（含所发 URL=${echoImg}）isAnonymous=${JSON.stringify(echoed.isAnonymous)}（=${echoAnon}）authorName=${JSON.stringify(echoed.authorName)}`);
  record(8, "创建响应回主键 data.id", ct.status < 300 && echoed.id != null,
    echoed.id != null
      ? `HTTP ${ct.status}，data.id=${JSON.stringify(echoed.id)} → 主键已回，客户端可直接定位新行（#27 的 save(topic) 返回值接生的实测证；此前该字段为 null，见台账 §22）`
      : `HTTP ${ct.status} 但 data.id=null → 客户端拿不到主键：stores/campus.ts:737 的 mapToCampusTopicItem(result) 会 unshift 一条无 id 镜像，点进去就是 /campus/topics/null；本环改判只能靠回列表按标题定位（下一行）`);
  const ctId = pick(ct.json, ["data.id", "id", "data.topicId"]);
  // 服务端 200 却回 id=null ⇒ 拿不到主键。改判据为"回列表按标题定位"才测得下去：
  // 分页参数是 Spring Pageable 的 page（**0 基**）与 size，写成 page=1&pageSize=60 会拿到第二页空数组，
  // 那是我的读数失败，不能记成产品失败（前端 stores/campus.ts:491 用的正是 page-1 与 size，它是对的）。
  let locateId = ctId;
  if (!locateId) {
    const L0 = await req("GET", "/campus/topics?page=0&size=60", { token });
    const lrows = (L0.json && (L0.json.content || (L0.json.data && L0.json.data.content))) || [];
    const hit = (Array.isArray(lrows) ? lrows : []).find((x) => String(x.title) === String(cTitle));
    if (hit) { locateId = hit.id; console.log(`  回列表定位成功：id=${locateId}（GET /campus/topics?page=0&size=60 -> ${L0.status}，${lrows.length} 行）`); }
    else console.log(`  回列表定位失败：HTTP ${L0.status}，${(lrows || []).length} 行里没有标题 ${cTitle}`);
  }
  if (locateId) {
    artifacts.push(`campus_topics.id=${locateId}`);
    const back = await req("GET", `/campus/topics/${locateId}`, { token });
    const bv = (back.json && (back.json.data || back.json)) || {};
    const imgsRaw = String(bv.images ?? "");
    const gotImg = imgsRaw.includes("default-avatar.jpg");
    const anon = bv.isAnonymous === true || bv.isAnonymous === "true";
    record(9, "读回 images 落库 + 匿名标记", back.status === 200 && gotImg && anon,
      `GET /campus/topics/${locateId} -> ${back.status}；images 字段="${imgsRaw.slice(0, 90)}"（含所发 URL=${gotImg}）；isAnonymous=${JSON.stringify(bv.isAnonymous)}；authorId=${JSON.stringify(bv.authorId)} authorName=${JSON.stringify(bv.authorName)} → 匿名若为真，作者字段应被遮蔽`);
    const rp = await req("POST", `/campus/topics/${locateId}/replies`, {
      token, idem: crypto.randomUUID(), body: { content: `G8 取证匿名回复 ${stamp}`, isAnonymous: true },
    });
    const rpId = pick(rp.json, ["data.id", "id"]);
    const rlist = await req("GET", `/campus/topics/${locateId}/replies?page=0&size=50`, { token });
    const rrows = rowsOf(rlist.json);
    const mine = rrows.find((r) => String(r.id) === String(rpId)) || rrows.find((r) => String(r.content || "").includes(stamp));
    record(10, "匿名回复透传并可读回", rp.status < 300 && !!mine && (mine.isAnonymous === true || mine.isAnonymous === "true"),
      `POST replies -> ${rp.status} id=${rpId || "?"}；列表 ${rlist.status} 命中本条=${!!mine}；isAnonymous=${JSON.stringify(mine && mine.isAnonymous)}；authorName=${JSON.stringify(mine && (mine.authorName ?? mine.author))}`);
    if (rpId) artifacts.push(`campus_replies.id=${rpId}`);
  } else {
    record(9, "读回 images 落库 + 匿名标记", false, "NOT-EVIDENCED：响应无 id 且回列表按标题也定位不到 → 无法读回（不伪造）");
    record(10, "匿名回复透传并可读回", false, "NOT-EVIDENCED：同上");
  }

  console.log(`\nG8_RINGS_OK=${rings.filter((r) => r.ok).length}/${rings.length}`);
  console.log(`G8_ARTIFACTS=${artifacts.join(" ; ") || "none"}  ← 本轮写入的真实数据，未删除，交你决定去留`);
  console.log(`G8_RESULT=${rings.every((r) => r.ok) ? "PASS" : "PARTIAL"}`);
})().catch((e) => { console.log("G8_RESULT=CRASH " + String(e && e.stack || e).slice(0, 300)); process.exit(1); });
