/**
 * G7/G8/G9 前置探测（QA 工作流 v3.2 配套工具）——只读，不发任何写请求、不碰数据库。
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
 * 用法：node scripts/probe-real-env.mjs [--base http://127.0.0.1:8080]
 * 输出：机器可读的 PROBE_* 行，供工作流直接判 BLOCKED/PASS，不靠模型复述。
 */
const { existsSync, readdirSync, statSync } = await import("node:fs");
const { join, relative, resolve, dirname, sep } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const __dirname = dirname(fileURLToPath(import.meta.url));
const base = (process.argv.find((a) => a.startsWith("--base=")) || "").replace("--base=", "") || process.env.REAL_API_BASE || "http://127.0.0.1:8080";

const http = await import("node:http");

/**
 * 用 node:http 而不是 fetch：本机部分 node 运行时没有全局 fetch，
 * 用它当探测客户端会让"全部 ERR"被误读成"后端不可达"（实测踩过，见下文的 HARNESS 判定）。
 */
function head(path) {
  return new Promise((done) => {
    const req = http.get(base + encodeURI(path), { timeout: 4000 }, (res) => {
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
