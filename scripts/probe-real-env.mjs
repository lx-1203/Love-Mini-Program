/**
 * G7/G8/G9 前置探测（QA 工作流 v3.2 配套工具）——只读，不发任何写请求、不碰数据库、不写 Redis。
 * 只读这件事由运行期计数兑现（见 PROBE_READONLY_SELF_CHECK）：HTTP 只走 GET、Redis 只做裸 TCP connect
 * （不发命令、不 SET），任一路径出现写操作即判红。
 *
 * 为什么需要它（2026-09-24 核验结论，见 .zcode/research/WF-CLAIM-VERIFICATION.md）：
 *  1. real profile 下 app.guest-login.enabled 默认 false（application-real.yml:163），
 *     只有以 APP_GUEST_LOGIN_ENABLED=true 启动才放开；否则 /api/v1/auth/guest-login 返回
 *     403 TRIAL_LOGIN_DISABLED，会被误判成产品缺陷。
 *  2. real 模式素材不是包内 /static，而是后端托管。404 的两类成因（2026-09-25 已确证，
 *     见 .zcode/research/ASSET-ENCODING-ROOTCAUSE.md）：
 *     (A) 中文名素材：MediaAccessController 拿**未解码**的 getRequestURI() 当注册表查找键，
 *         库里 url 是原始 UTF-8，故中文路径必然 404（已在源码侧修为 UriUtils.decode，待重启生效）；
 *     (B) 整批未同步/未注册：如 assets/icons/register/ 的 14 个 ASCII 名文件在盘却 0/12 可达。
 *     注册表确实是 200/404 的决定分支（早前"注册检查被空值保护短路"的说法已被活体日志否证）。
 *     修法入口是项目自带 scripts/sync-app-assets.mjs（复制 + 注册两步），不要手工往 uploads 目录塞文件。
 *
 *  3. real profile 下 Redis 是必需项不是可选项：application-real.yml 不排 RedissonAutoConfigurationV2
 *     （只有 mock 档排），且 TempChatCleanupService/AutoRenewService/HotScoreScheduler/RealTempChatService
 *     四个 @Profile("real") bean 构造子都要 RedissonClient ⇒ 没 Redis 后端**起不来**。所以 backend down
 *     要先分诊"是不是 Redis 没起来"，别把 Redis 故障当成后端缺陷查错方向（PRECOND_REDIS / PRECOND_VERDICT 就是这条）。
 *
 * 用法：node scripts/probe-real-env.mjs [--base http://127.0.0.1:8080]
 * 输出：机器可读的 PROBE_* 行，供工作流直接判 BLOCKED/PASS，不靠模型复述。
 */
const { existsSync, readdirSync, statSync } = await import("node:fs");
const { join, relative, resolve, dirname, sep } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const __dirname = dirname(fileURLToPath(import.meta.url));
const base = (process.argv.find((a) => a.startsWith("--base=")) || "").replace("--base=", "") || process.env.REAL_API_BASE || "http://127.0.0.1:8080";

const http = await import("node:http");
const net = await import("node:net");

/* ---- 只读自律：本探测声称"不发任何写请求/不碰数据库/不写 Redis"，这条断言必须被**运行期计数**兑现，
      而不是只写在注释里（repo 规则：read-only 预检得自己把"没改过东西"这件事证出来）。
      nonGetHttp：任何经本脚本 getTracked() 漏斗发出的非 GET ⇒ 计数（脚本内所有 HTTP 都必须走这个漏斗；
                   http.get 走的是 GET ⇒ 恒不计数）；
      redisBytesSent：redis 预检那条 socket 若被写过任何一字节 ⇒ 计数（connect 后立即 destroy，从不 write）。
      两者必须恒为 0，否则 PROBE_READONLY 判红并非零退出——"只读"是数出来的，不是喊出来的。 ---- */
const READINESS = { nonGetHttp: 0, redisBytesSent: 0 };
/** 本脚本唯一的 HTTP 出口：只允许 GET。传非 GET 方法 ⇒ 计入 nonGetHttp，好让 PROBE_READONLY 抓到越界写。 */
function getTracked(url, opts, cb) {
  const m = ((opts && opts.method) || "GET").toUpperCase();
  if (m !== "GET") READINESS.nonGetHttp++;
  return http.get(url, { ...(opts || {}), method: "GET" }, cb);
}

/* real profile 下 Redis 是**必需项而非可选**：application-real.yml 不排 RedissonAutoConfigurationV2
   （只有 application-mock.yml 排），且四个 @Profile("real") bean（TempChatCleanupService /
   AutoRenewService / HotScoreScheduler / RealTempChatService）构造子都要 RedissonClient ⇒ 没 Redis 后端根本起不来。
   探法：裸 TCP connect 127.0.0.1:6379，不认证、不发送任何命令（连 PING 都不发）、拿到连接即 destroy
   ⇒ 结构上不可能改动 Redis 状态。redisBytesSent 计数器兜住"万一有人往这条 socket 写了东西"。 */
const REDIS_HOST = process.env.REAL_REDIS_HOST || "127.0.0.1";
const REDIS_PORT = Number(process.env.REAL_REDIS_PORT || 6379);
function probeRedis(timeoutMs = 1500) {
  return new Promise((done) => {
    let settled = false;
    const finish = (r) => { if (!settled) { settled = true; done(r); } };
    const sock = net.connect({ host: REDIS_HOST, port: REDIS_PORT, timeout: timeoutMs });
    // 运行期兜底：这条 socket 一旦被写就打标记（本函数绝不调用 write，仅证明"没写"是可核的事实而非口号）。
    const _w = sock.write.bind(sock);
    sock.write = (...a) => { READINESS.redisBytesSent++; return _w(...a); };
    sock.on("connect", () => { const peer = `${sock.remoteAddress}:${sock.remotePort}`; try { sock.destroy(); } catch {} finish({ up: true, reason: `TCP connect ok peer=${peer}（未发送任何命令）` }); });
    sock.on("timeout", () => { try { sock.destroy(); } catch {} finish({ up: false, reason: `connect timeout ${timeoutMs}ms（端口 ${REDIS_PORT} 无应答）` }); });
    sock.on("error", (e) => { try { sock.destroy(); } catch {} finish({ up: false, reason: `${e.code || e.message}（端口 ${REDIS_PORT}）` }); });
  });
}

/**
 * 用 node:http 而不是 fetch：本机部分 node 运行时没有全局 fetch，
 * 用它当探测客户端会让"全部 ERR"被误读成"后端不可达"（实测踩过，见下文的 HARNESS 判定）。
 */
function head(path) {
  return new Promise((done) => {
    const req = getTracked(base + encodeURI(path), { timeout: 4000 }, (res) => {
      const out = { status: res.statusCode, len: res.headers["content-length"] ?? "?" };
      res.destroy();
      done(out);
    });
    req.on("timeout", () => { req.destroy(); done({ status: "TIMEOUT", len: "" }); });
    req.on("error", (e) => done({ status: "ERR", len: e.code || e.message.slice(0, 40) }));
  });
}

const health = await head("/actuator/health");
console.log(`PROBE_BACKEND=${health.status === 200 ? "UP" : "DOWN"} http=${health.status}`);

/* ---- real profile 前置（PRECOND_*）：先判 Redis，再把"后端不可达"归因清楚。
      2026-10-13 那类假绿诊断的根子：Redis 6379 掉线时 real 后端**根本起不来**，操作者却看到
      "backend down" 而去查错方向。这一格把两者串成一句因果，而不是两条并列失败。 ---- */
const redis = await probeRedis();
const backendUp = health.status === 200;
console.log(`PRECOND_REDIS=${redis.up ? "UP" : "DOWN"} ${redis.reason}`);
console.log(`PRECOND_BACKEND=${backendUp ? "UP" : "DOWN"} http=${health.status}`);
if (!redis.up && !backendUp) {
  console.log("PRECOND_VERDICT=REDIS_CAUSED_BACKEND_DOWN 因果读数（不是两个独立故障）：Redis 6379 不可达 ⇒ real profile 无 RedissonClient，四个 @Profile(\"real\") bean（TempChatCleanupService/AutoRenewService/HotScoreScheduler/RealTempChatService）无法注入 ⇒ 后端**无法启动**，8080 因此 down。修法是先起 Redis 再起后端；在 Redis 起来之前把 backend down 当成后端本身的缺陷去查 = 诊断错方向。G7/G8/G9 一律 BLOCKED，不得记 PASS 或 FAIL。");
} else if (!redis.up && backendUp) {
  console.log("PRECOND_VERDICT=INSTANCE_PREDATES_OUTAGE Redis 6379 已不可达，但后端 8080 仍在应答 ⇒ 该实例早于本次 Redis 故障启动（进程还持有旧连接）。real 模式 API 验收在此实例上**无效**：Redisson 依赖的临时会话/VIP 续费/热度榜路径此刻无从验证，须在 Redis 恢复后重启后端并重验，不得据当前 200 记 PASS。");
} else if (redis.up && !backendUp) {
  console.log("PRECOND_VERDICT=BACKEND_DOWN_NOT_REDIS Redis 正常但后端未应答 ⇒ 与 Redis 无关，查后端本身（profile/启动日志/DB 连接）。G7/G8/G9 BLOCKED。");
} else {
  console.log("PRECOND_VERDICT=OK Redis 与后端均在，real 前置成立，继续素材探测。");
}
/* 只读自律汇总：本预检对 Redis 只做裸 connect（未发送任何命令、未 SET），对 HTTP 只做 GET。
   计数若非 0 ⇒ 说明有代码往这两条通道塞了写操作，本"read-only"声称作废，判红并以非 0 退出。 */
const readonlyOk = READINESS.nonGetHttp === 0 && READINESS.redisBytesSent === 0;
console.log(`PROBE_READONLY_SELF_CHECK=${readonlyOk ? "OK" : "VIOLATION"} non_get_http=${READINESS.nonGetHttp} redis_bytes_sent=${READINESS.redisBytesSent}（read-only 由计数兑现：GET-only + 裸 TCP connect 零写入；违反即判红）`);
if (!readonlyOk) {
  console.log("PROBE_VERDICT=BLOCKED 预检自身违反了只读约束（见 PROBE_READONLY_SELF_CHECK），拒绝继续");
  process.exit(4);
}

/**
 * 代表素材在运行时从磁盘抽取（不硬编码路径——写死的路径 404 是探测器的错，不是注册表的错）。
 * 曾有硬编码 MUST_PROBE 清单，其中 heart-filled-white.svg 被证明是**故意不用**的：
 * images.ts:521 记录该常量已移除，MatchSuccess.vue:309 改用 filter: brightness(0) invert(1)
 * 复用已获批图标渲染白色。留着一个"必然 404 但并不存在引用"的样本，只会制造永久假警报，
 * 所以删除；如需查"本地有包内却不在后端"的资产，应以 IMAGE_PATHS 实际引用集为准
 * （见 .zcode/tmp/g9-probe.cjs）。
 */
const uploadsRoot = resolve(__dirname, "../apps/api/uploads/app-assets");
const EXT = /\.(png|jpe?g|svg|gif|webp|wav|mp3)$/i;
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.test(name)) out.push(p);
  }
  return out;
}
const all = walk(uploadsRoot).map((p) => relative(uploadsRoot, p).split(sep).join("/")).sort();
const picked = new Set();
const stride = Math.max(1, Math.floor(all.length / 8));
for (let i = 0; i < all.length; i += stride) picked.add(all[i]);
// （原 MUST_PROBE 强制样本已删除，理由见上方注释：必然 404 但无人引用的样本只会制造永久假警报）
let okCount = 0;
let missing = [];
const samples = [...picked];
for (const rel of samples) {
  const p = "/api/v1/media/app-assets/" + rel;
  const r = await head(p);
  const ok = r.status === 200 && r.len !== "0";
  if (ok) okCount++;
  else missing.push(`${rel} -> ${r.status}/${r.len}`);
  console.log(`PROBE_ASSET ${ok ? "OK " : "BAD"} ${p} status=${r.status} len=${r.len}`);
}
console.log(`PROBE_ASSETS_ON_DISK=${all.length} PROBE_ASSETS_REACHABLE=${okCount}/${samples.length}`);
if (missing.length) console.log(`PROBE_ASSET_MISSING=${missing.join(" | ")}`);

if (health.status !== 200) {
  console.log("PROBE_VERDICT=BLOCKED 后端不可达 → G7/G8/G9 一律记 BLOCKED，不得记 PASS 或 FAIL");
  process.exit(2);
}
console.log("PROBE_GUEST_LOGIN=需启动方式确认：real profile 默认 false→403；须确认后端以 APP_GUEST_LOGIN_ENABLED=true 启动（.env:17 / scripts/launcher/scripts-start-backend.cmd:31）");
console.log(okCount === samples.length ? "PROBE_VERDICT=READY" : `PROBE_VERDICT=PARTIAL ${samples.length - okCount} 个在盘素材不可达——归因未定（可能是 media_asset 未注册/被驳回，也可能是中文名 URL 编码），必须做对照实验后再定性，禁止直接记产品 FAIL 或直接断言是注册表`);
process.exit(okCount === samples.length ? 0 : 3);
