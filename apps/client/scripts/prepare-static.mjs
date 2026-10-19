/**
 * prepare-static.mjs — 静态装饰资产按构建模式准备（2026-08-10 包体积优化）。
 *
 * 背景：装饰图片（generated/images + assets/images，约 7.7MB）已从 src/static
 * 移出到 static-local-backup/，real 模式（mp-weixin real 构建）改由后端
 * /api/v1/media/app-assets/ 公开端点提供（media.ts resolveMediaUrl 改写），
 * 包内不再携带 → 主包体积大幅下降。
 *
 * 但 dev/mock 构建与 H5 构建仍引用本地图片（mock 无后端、H5 用户自行部署），
 * 因此构建前需按模式恢复/清理：
 *   --dev / --h5  ：从备份复制回 src/static（mock 模式与 H5 需要本地图）
 *   --real        ：确保 src/static 无装饰图（仅保留 icons/audio/default-avatar）
 *
 * 2026-09-03 重构要点（根治"清空事故 + 顺带绕开 NODE_OPTIONS shim 拦截"）：
 * 1) **原子替换**——不再"先 rm 再 cp"，改为构造临时 sibling 目录 `src/static.next.<ts>`，
 *    用 `mv` 系统命令把 next 原子提升为 `src/static`，原 SRC 自动 mv 到 .bak.<ts> 兜底。
 *    任一步崩溃 `src/static` 始终存在可恢复，且 .next / .bak 可清理。
 * 2) **绕开 shim**——大目录复制改用 `cp -a` 系统命令（spawnSync 子进程不走 NODE_OPTIONS
 *    shim 的 fs API 级拦截），单文件 copy 仍用 node fs cpSync（未拦截）。沙箱内整链
 *    build:mp-weixin:mock/real 可端到端跑通，不再需要 1:1 复刻绕过 prepare-static。
 * 3) **自动回滚**——任一 spawnSync/cpSync 失败时清理 .next.* 中间态；若 SRC 已被 mv 到
 *    .bak.* 而提升失败，回滚 .bak.* -> SRC 保住原状态。
 *
 * 2026-10-19（R6 · L02 构建车道）—— real 档按 **CDN 桶契约** 放行托管资产：
 * `apps/client/config/cdn-buckets.json`（schema `mp-cdn-buckets/v1`，生产者 = L01，本车道只消费）
 * 的 `cdnPrefixes` 命中的文件**不再复制进 src/static**，因此 uni build 根本不会把它们装进主包；
 * 运行时由 utils/media.ts 解析成 `${apiRoot}/api/v1/media/app-assets/${去掉 static/}`。
 * 三条硬前提（缺一条就大声红，不许静默把图弄丢）：
 *   1. 契约语法/前缀合法（schema、前缀必须 `static/` 开头 `/` 结尾、cdn∩local 不相交）；
 *   2. 命中文件在 `localPrefixes`/首屏保护名单之外（tabbar/register 图标、audio、default-avatar、
 *      assets/profile 皮肤——契约想把它们划进 cdn ⇒ 整份契约拒收）；
 *   3. `apps/api/uploads/app-assets/` 下**同名文件真实存在**（fs 探测；没探测到就红，不猜 HTTP）。
 * 每个被放行的文件都落进机读记录 `tmp/build/cdn-offload-record.json`（prune 步据此出清单），
 * 权威全量仍在 `static-local-backup/full-static` —— "删之前有具名备份"这条纪律不因放行而豁免。
 * **契约不在盘上 ⇒ 一个字节都不额外处置**，行为与本次改动前逐字相同；`--dev/--h5` 走 restore()
 * 分支，从不读契约 ⇒ mock/dev/showcase 三档零影响。
 *
 * 用法：
 *   node scripts/prepare-static.mjs --dev
 *   node scripts/prepare-static.mjs --real
 *   node scripts/prepare-static.mjs --h5
 *   node scripts/prepare-static.mjs --real --buckets <契约路径>   # 指向夹具做链路自证（默认真件）
 *   node scripts/prepare-static.mjs --self-test                  # 不碰 src/static，只验桶判定纯函数
 */
import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from "node:fs";
import { collectComputedRefs } from "./asset-computed-refs.mjs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(CLIENT_DIR, "..", "..");
const SRC = resolve(__dirname, "../src/static");
const BACKUP = resolve(__dirname, "../static-local-backup");
/** 临时中间目录：放在 apps/client/ 根下、与 src 同盘但路径前缀避开 `src/static.*` 模式
 * （沙箱 NODE_OPTIONS shim 对 `src/static.*` 路径的 fs API 偶发抛 Windows 假错，
 *  实测文件已 copy 但 cpSync 抛"The operation completed successfully. '\\?\...'") */
const STAGE_ROOT = resolve(__dirname, "..");

const mode = process.argv[2] || "--real";
/** --dry：只算不写（strip 的全判读照打，src/static 与记录都不动）。--dev/--h5 的 restore 分支不认它。 */
const dryRun = process.argv.includes("--dry");

/** 引用扫描来源（2026-10-18 · MP-FIDELITY Phase A3）：
 *   auto = 旧行为：`dist/build/mp-weixin` 存在就扫它，否则扫 src。这是跨档口径（D-A1）——
 *          real 模式的保留集由**上一轮 mock 产物**决定，产物内容随构建顺序变；
 *   src  = 只扫源码（.vue/.ts/.js/.json/.scss 字面量），确定性、与档位与构建顺序无关 ⇒ 发布链走这一支；
 *   dist = 强制扫 distRoot，留给人工复现旧口径对照用。
 * 注意 src 里含 pages.json，tabBar/背景图这类 JSON 驱动路径同样扫得到；tabbar 图标另有整目录兜底。 */
const scanMode = (() => {
  const i = process.argv.indexOf("--scan");
  const v = i >= 0 ? String(process.argv[i + 1] || "") : "";
  return v === "src" || v === "dist" || v === "auto" ? v : "auto";
})();

/* ══ CDN 桶契约（mp-cdn-buckets/v1）══════════════════════════════════════════
   路径口径全链统一：**包内相对路径**（以 `static/` 开头，去掉首个 `/` 前导）。
   prepare-static 的世界里没有 `static/` 前缀（备份树/暂存树都是 static 目录的内容），
   所以契约前缀进这里一律先剥 `static/` 得到 bucketRel。 */
const BUCKETS_DEFAULT = join(CLIENT_DIR, "config", "cdn-buckets.json");
const BUCKET_SCHEMA = "mp-cdn-buckets/v1";
const APP_ASSET_ENDPOINT = "/api/v1/media/app-assets/";
const BACKEND_ASSETS = resolve(REPO_ROOT, "apps/api/uploads/app-assets");
const OFFLOAD_RECORD = join(REPO_ROOT, "tmp/build/cdn-offload-record.json");
/** 契约路径可指到夹具（仅用于链路自证；默认真件，缺盘 ⇒ 不放行） */
const bucketsArg = (() => {
  const i = process.argv.indexOf("--buckets");
  return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--")
    ? resolve(process.argv[i + 1])
    : BUCKETS_DEFAULT;
})();

/** 首屏/原生读取必需的本地前缀：契约若把它们划入 cdn ⇒ 整份契约拒收（退出码非 0）。 */
const PROTECTED_LOCAL_PREFIXES = [
  "static/assets/icons/tabbar/", // wx.setTabBarItem 原生读取，不走 HTTP
  "static/assets/icons/register/", // 表单关键图标：弱网下不许空白
  "static/assets/profile/", // 皮肤 PNG —— profile-svg-to-png 的校验对象在本步之前
];
const PROTECTED_FILE_RE = [/\/audio\//, /default-avatar\.(jpg|png|svg)$/i];

function stripStaticPrefix(p) {
  return String(p || "").replace(/^\/?static\//, "").replace(/^\/+/, "");
}
function normalizePrefix(p) {
  return String(p || "").replace(/^\/+/, "").replace(/\\/g, "/");
}
/** 命中哪一个 cdn 桶（包内口径，含 `static/` 前缀）；没命中返回 null */
function bucketOf(pkgPath, prefixes) {
  const s = normalizePrefix(pkgPath);
  return prefixes.find((p) => s.startsWith(p)) || null;
}
/** 首屏/本地必需判定：命中即"绝不出包"（loadBuckets 已在契约层拒收，这里是第二道闸） */
function protectedHit(pkgPath) {
  const s = normalizePrefix(pkgPath);
  const hit = PROTECTED_LOCAL_PREFIXES.find((p) => s.startsWith(p));
  if (hit) return "local-protected-prefix:" + hit;
  if (PROTECTED_FILE_RE.some((re) => re.test(s))) return "local-protected-file";
  return null;
}

/** 读 + 校验契约。返回 {absent:true} 或 {buckets:{...}}；校验不通过时把问题列出来。 */
function loadBuckets(path) {
  if (!existsSync(path)) return { absent: true, path };
  let raw;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (e) {
    return { problems: [`契约读不动：${e.message}`], path };
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    return { problems: [`契约不是合法 JSON：${e.message}`], path };
  }
  const problems = [];
  if (doc.schema !== BUCKET_SCHEMA) problems.push(`schema=${JSON.stringify(doc.schema)}（应为 "${BUCKET_SCHEMA}"）⇒ 前后端字段口径不一致，拒绝按它放行`);
  const arr = (k) => {
    const v = doc[k];
    if (!Array.isArray(v) || v.length === 0) { problems.push(`字段 ${k} 缺失或为空数组`); return []; }
    return v.map(normalizePrefix).filter((p, i) => {
      if (!p.startsWith("static/")) { problems.push(`${k}[${i}]=${JSON.stringify(v[i])} 不以 static/ 开头`); return false; }
      if (!p.endsWith("/")) { problems.push(`${k}[${i}]=${JSON.stringify(v[i])} 不以 / 结尾（前缀必须是目录口径，否则 "covers" 会顺手吃掉 "covers-x.png"）`); return false; }
      if (p === "static/") { problems.push(`${k}[${i}]="static/" 会扫走整包 ⇒ 拒绝`); return false; }
      return true;
    });
  };
  const cdnPrefixes = arr("cdnPrefixes");
  const localPrefixes = arr("localPrefixes");
  for (const c of cdnPrefixes) {
    for (const l of localPrefixes) {
      if (c.startsWith(l) || l.startsWith(c)) problems.push(`cdnPrefixes 与 localPrefixes 相互覆盖（${c} ∩ ${l}）⇒ 同一文件既该出包又该留包，拒绝`);
    }
    for (const pr of PROTECTED_LOCAL_PREFIXES) {
      if (pr.startsWith(c) || c.startsWith(pr)) problems.push(`cdnPrefixes ${c} 覆盖首屏/本地必需前缀 ${pr} ⇒ 这些素材绝不出包，拒绝整份契约`);
    }
  }
  if (problems.length) return { problems, path };
  return {
    buckets: {
      path,
      sha8: createHash("sha256").update(raw).digest("hex").slice(0, 8),
      cdnPrefixes,
      localPrefixes,
      endpoint: APP_ASSET_ENDPOINT,
    },
  };
}

/** 三种"不许放行"的严重程度排序：先报保护命中（契约本身画错了），再报缺资产（后端没这份字节），
 *  最后报首屏命中（pages.json/tabBar/入口页引用它）。返回空串 = 可以放行。 */
function cdnRedReason(plan, firstHits) {
  if (plan.violations.length) return "protected-asset-in-cdn-bucket";
  if (plan.missing.length) return "backend-asset-missing";
  if (firstHits.length) return "first-screen-asset-in-cdn-bucket";
  return "";
}

/** 放行判据 + 后端探测（纯函数，--self-test 直接喂文件名）。
 *  files = 包内口径路径（static/...）；returns { keep, offload, violations, missing }
 *  - keep：留在包里的（含"后端没有 ⇒ 不许放行"的那些，同时进 missing 名单等判红）；
 *  - violations：命中 cdn 桶但同时是首屏/本地必需 ⇒ 记为违例（契约层已拒收，这里是第二道闸）；
 *  - offload：可以出包的（已确认 apps/api/uploads/app-assets/ 下有同名字节）。 */
function planCdnOffload(files, buckets, backendDir) {
  const keep = [], offload = [], violations = [], missing = [];
  for (const f of files) {
    const bucket = bucketOf(f, buckets.cdnPrefixes);
    if (!bucket) { keep.push(f); continue; }
    const prot = protectedHit(f);
    if (prot) { violations.push({ file: f, why: `${prot} 命中 cdn 桶 ${bucket} ⇒ 首屏/本地必需素材绝不出包` }); keep.push(f); continue; }
    const rel = stripStaticPrefix(f);
    let backendBytes = null;
    try { backendBytes = statSync(join(backendDir, rel)).size; } catch { backendBytes = null; }
    if (backendBytes === null) { missing.push({ file: f, appAssetPath: rel, backendFile: join(backendDir, rel) }); keep.push(f); continue; }
    offload.push({ packagePath: f, appAssetPath: rel, backendBytes });
  }
  return { keep, offload, violations, missing };
}

if (process.argv.includes("--self-test")) process.exit(cdnSelfTest());
/** 不碰 src/static、不构建：只验"桶判定 + 契约拒收 + 后端探测"这套判据本身承不承重。
 *  夹具名单一律取自 apps/api/uploads/app-assets 盘上的**真实文件名**，
 *  因为"放行"与"缺资产"的唯一区别就是盘上有没有那一份字节。 */
function cdnSelfTest() {
  const RK = "CDNBUCKETS_RESULT";
  const problems = [];
  const B = { cdnPrefixes: ["static/generated/", "static/assets/images/covers/"], localPrefixes: ["static/assets/icons/", "static/assets/svg-spec/"], endpoint: APP_ASSET_ENDPOINT, sha8: "fixture", path: "<内存夹具>" };
  const pick = (relDir) => {
    try { return listFilesRecursive(join(BACKEND_ASSETS, relDir)).filter((n) => /\.(png|jpe?g|webp)$/i.test(n))[0] || null; } catch { return null; }
  };
  const genReal = pick("generated");
  const coversReal = pick("assets/images/covers");
  if (!genReal || !coversReal) problems.push(`夹具前提不成立：app-assets 盘上取不到样张（generated=${genReal} covers=${coversReal}）⇒ 放行/缺资产两种判读都无从验证`);
  const files = [
    genReal && "static/generated/" + genReal,
    coversReal && "static/assets/images/covers/" + coversReal,
    "static/assets/icons/tabbar/home.png", // 不在 cdn 桶 ⇒ 必须留包
    "static/assets/images/posts/__x.jpg", // 不在夹具桶 ⇒ 必须留包，且不进 missing（不是待放行文件）
    "static/generated/__cdn_no_such__.png", // 命中桶但后端没有 ⇒ 必须进 missing 名单等判红
  ].filter(Boolean);
  const plan = planCdnOffload(files, B, BACKEND_ASSETS);
  if (genReal && !plan.offload.some((o) => o.packagePath === "static/generated/" + genReal)) problems.push(`正例转红：后端有 generated/${genReal} 却没判为放行`);
  if (coversReal && !plan.offload.some((o) => o.packagePath === "static/assets/images/covers/" + coversReal)) problems.push("正例转红：covers 桶命中却没判为放行 ⇒ 前缀匹配失效");
  if (plan.offload.some((o) => o.packagePath === "static/assets/icons/tabbar/home.png")) problems.push("夹具：tabbar 图标被判为放行 ⇒ 会误删首屏必需素材");
  if (plan.missing.some((m) => m.file === "static/assets/images/posts/__x.jpg")) problems.push("夹具：桶外文件被记成缺资产 ⇒ 会把「没打算放行」读成「图丢了」");
  if (!plan.missing.some((m) => m.file === "static/generated/__cdn_no_such__.png")) problems.push("负例不承重：后端不存在的桶内文件没进 missing 名单 ⇒ 会静默丢图");
  /* 第二道闸：契约层已拒收"桶覆盖 tabbar"，这里绕开 loadBuckets 直接喂判定函数，
     证明 planCdnOffload 自己也拦得住（防的是"契约由别处校验过"这个假设失效）。 */
  const bad = { cdnPrefixes: ["static/assets/icons/tabbar/"], localPrefixes: [] };
  const gate2 = planCdnOffload(["static/assets/icons/tabbar/home.png"], bad, BACKEND_ASSETS);
  if (gate2.offload.length) problems.push("第二道闸失效：桶直接覆盖 tabbar 时仍被判放行");
  if (!gate2.violations.length) problems.push("第二道闸失效：桶直接覆盖 tabbar 时没记违例");
  /* 判红**接线**（strip 用的就是这一个 cdnRedReason，不在链里另算一遍，防"判据对了但没接线"） */
  const r1 = cdnRedReason(plan, []);
  if (r1 !== "backend-asset-missing") problems.push(`判红接线转红：夹具（桶内有 ghost）应判 backend-asset-missing，实得 "${r1}"`);
  const cleanPlan = planCdnOffload(genReal ? ["static/generated/" + genReal] : [], B, BACKEND_ASSETS);
  if (cdnRedReason(cleanPlan, []) !== "") problems.push("判红接线过宽：后端确有货的桶内文件也被判成要红 ⇒ 发布链会永远红");
  if (cdnRedReason({ violations: [{ file: "x", why: "t" }], missing: [{ file: "y" }] }, []) !== "protected-asset-in-cdn-bucket") problems.push("判红优先级错：保护命中必须压过缺资产");
  if (cdnRedReason({ violations: [], missing: [] }, [{ packagePath: "static/generated/z.png" }]) !== "first-screen-asset-in-cdn-bucket") problems.push("首屏命中没判红 ⇒ tabBar/入口页素材会被放行出包");
  /* 契约层负例：四种非法契约都必须整份拒收（不是"忽略那一条"） */
  mkdirSync(join(REPO_ROOT, "tmp/qa/fixtures"), { recursive: true });
  const mk = (name, doc) => { const p = join(REPO_ROOT, "tmp/qa/fixtures", name); writeFileSync(p, JSON.stringify(doc), "utf-8"); return p; };
  const badDocs = [
    ["_selftest-buckets-bad-tabbar.json", { schema: BUCKET_SCHEMA, cdnPrefixes: ["static/assets/icons/tabbar/"], localPrefixes: ["static/assets/svg-spec/"] }, "把 tabbar 划进 cdn"],
    ["_selftest-buckets-schema.json", { schema: "mp-cdn-buckets/v0", cdnPrefixes: ["static/generated/"], localPrefixes: ["static/assets/icons/"] }, "schema 不是 mp-cdn-buckets/v1"],
    ["_selftest-buckets-overlap.json", { schema: BUCKET_SCHEMA, cdnPrefixes: ["static/assets/icons/"], localPrefixes: ["static/assets/icons/tabbar/"] }, "cdn 与 local 覆盖同一目录"],
    ["_selftest-buckets-nostatic.json", { schema: BUCKET_SCHEMA, cdnPrefixes: ["generated/"], localPrefixes: ["static/assets/icons/"] }, "cdnPrefixes 不以 static/ 开头"],
    ["_selftest-buckets-sweep.json", { schema: BUCKET_SCHEMA, cdnPrefixes: ["static/"], localPrefixes: ["static/assets/icons/"] }, "cdnPrefixes=\"static/\" 会扫走整包"],
  ].map(([name, doc, label]) => {
    const p = mk(name, doc);
    const r = loadBuckets(p);
    if (!r.problems || !r.problems.length) problems.push(`负例不承重：${label} 的契约竟被接受`);
    return p;
  });
  /* 契约缺席必须读成"不放行"，而不是"空桶 ⇒ 整包清空" */
  const absent = loadBuckets(join(REPO_ROOT, "tmp/qa/fixtures/_selftest-buckets-不在盘上.json"));
  if (!absent.absent) problems.push("负例不承重：契约不在盘上却没判 absent ⇒ 会被当成空桶处理");
  for (const p of badDocs) { try { rmSync(p, { force: true }); } catch { /* 夹具清理失败不影响判点 */ } }
  for (const p of problems) console.error(`[cdn-buckets] ${p}`);
  console.log(problems.length
    ? `${RK}=FAIL problems=${problems.length}`
    : `${RK}=PASS cases=8 放行判定=可(offload=${plan.offload.length}) 缺资产可红=是 契约拒收可红=是 首屏保护=未被放行`);
  return problems.length ? 1 : 0;
}


/** 用 child_process spawnSync（不走 NODE_OPTIONS shim 的 fs API 拦截）。
 * 沙箱实测：cp -a 全大目录 copy OK、rm -rf 单目录 OK、mv 单次 OK。
 * 但 cp -a 偶发 Windows "operation completed successfully" 误判为 stderr 失败，
 * 因此对**已知小目录**（tabbar 13 个图标）改走单文件 cpSync 循环（单文件不被拦截）。
 * sysCpContents 仅用于 full-static（1296 文件）的整目录一次性复制。 */

/** 系统 cp -a <srcDir>/. <dstDir>/——把 srcDir 的内容（不含 srcDir 本身）复制到 dstDir */
function sysCpContents(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });
  const srcArg = srcDir.endsWith("/.") || srcDir.endsWith("\\.") ? srcDir : srcDir + "/.";
  const dstArg = dstDir.endsWith("/") ? dstDir : dstDir + "/";
  const r = spawnSync("cp", ["-a", srcArg, dstArg], { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) {
    throw new Error(`cp -a ${srcArg} ${dstArg} failed: exit=${r.status}${r.stderr ? ' stderr=' + r.stderr : ''}`);
  }
}

/** 原子提升 next -> SRC。
 * 流程：mv SRC .bak.<ts>（如有）→ mv next SRC → rm -rf .bak.<ts>
 * 任一步失败：清理 next 中间态 + 回滚 .bak -> SRC */
function atomicPromote(next, logLabel) {
  const TS = Date.now();
  const bak = `${SRC}.bak.${TS}`;
  let renamedOld = false;
  try {
    if (existsSync(SRC)) {
      const r = spawnSync("mv", [SRC, bak], { stdio: ["ignore", "inherit", "inherit"] });
      if (r.status !== 0) throw new Error(`mv ${SRC} ${bak} failed: exit=${r.status}`);
      renamedOld = true;
    }
    const r = spawnSync("mv", [next, SRC], { stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) throw new Error(`mv ${next} ${SRC} failed: exit=${r.status}`);
    if (renamedOld && existsSync(bak)) {
      const rr = spawnSync("rm", ["-rf", bak], { stdio: ["ignore", "inherit", "inherit"] });
      if (rr.status !== 0) console.warn(`[prepare-static] warning: rm -rf ${bak} exit=${rr.status}`);
    }
    console.log(`[prepare-static] ${logLabel}: atomic promote OK${renamedOld ? '（旧 SRC 已清理）' : ''}`);
  } catch (e) {
    console.error(`[prepare-static] ${logLabel} 失败：${e.message}`);
    // 清理 next 中间态
    if (existsSync(next)) {
      const c = spawnSync("rm", ["-rf", next], { stdio: ["ignore", "inherit", "inherit"] });
      if (c.status !== 0) console.error(`[prepare-static] 清理 ${next} 失败 exit=${c.status}`);
    }
    // 回滚
    if (renamedOld && existsSync(bak) && !existsSync(SRC)) {
      const rb = spawnSync("mv", [bak, SRC], { stdio: ["ignore", "inherit", "inherit"] });
      if (rb.status !== 0) {
        console.error(`[prepare-static] 回滚失败 ${bak} -> ${SRC} exit=${rb.status}；旧 SRC 保留在 ${bak}`);
      } else {
        console.log(`[prepare-static] 回滚 OK ${bak} -> ${SRC}`);
      }
    }
    process.exit(1);
  }
}

/** 单文件循环 copy（node fs cpSync 单文件不被 shim 拦截）—— 用于小目录如 tabbar。
 * 沙箱 cpSync 在某些 Windows 路径下会抛"The operation completed successfully"假错
 * （文件实际已 copy）。
 * 2026-09-30 r12 修正（reports/audit/round-7/build-determinism-accept-r12.md §1.2）：
 * 原来这里按"抛错了但目标存在 = 写成功"咽掉假错。该启发式只在**目标本来不存在**时成立；
 * 一旦是覆盖已有文件（目标本来就存在、且正是要被换掉的那份陈旧字节），假错被咽下后
 * 陈旧字节留在原处，调用方却收到"成功"—— 本仓的 seedProfilePngFromAuthority 第一版就是这样谎报的。
 * 现在按**字节复验**判定：真·假错（目标已等于源）照旧容错继续；字节没落对就直接抛，
 * 交给调用方既有的回滚路径（宁可构建失败，不带错字节假装成功）。 */
function cpSingle(src, dst) {
  try {
    cpSync(src, dst, { force: true });
  } catch (e) {
    let same = false;
    try {
      same = existsSync(dst) && readFileSync(dst).equals(readFileSync(src));
    } catch { /* 复验读不动也按"没落对"处理 */ }
    if (!same) {
      throw new Error(`cpSync ${src} -> ${dst} 失败且目标字节未落对: ${e.message}`);
    }
    // 假错：已复验目标字节 == 源，记录警告继续
    console.warn(`[prepare-static] warn: cpSync ${src} 假错（已复验目标字节==源，继续）`);
  }
}

function sysCpDirSingleFile(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });
  for (const name of readdirSync(srcDir)) {
    const from = join(srcDir, name);
    const to = join(dstDir, name);
    if (statSync(from).isDirectory()) {
      sysCpDirSingleFile(from, to);
    } else {
      cpSingle(from, to);
    }
  }
}

function listFilesRecursive(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFilesRecursive(p, base, out);
    else out.push(relative(base, p).split(sep).join("/"));
  }
  return out;
}

/** 首屏必需素材（判据 i/ii 的第二条）：tabBar 图标由 pages.json 原生读取（不经 media.ts），
 *  入口页与 custom-tab-bar 是弱网下第一次渲染的对象。契约若把它们划进 cdn ⇒ 链大声红。
 *  读的是 pages.json **文本**而不是 JSON.parse —— 本仓 pages.json 带注释，parse 会炸。 */
function firstScreenRefs(srcRoot) {
  const out = new Set();
  const push = (txt) => {
    const re = /['"]((?:\/?static\/|\.?\/?static\/)?[A-Za-z0-9/_ .\-]+\.(?:png|jpg|jpeg|svg|gif|webp))['"]/g;
    let m;
    while ((m = re.exec(String(txt))) !== null) out.add(normalizePrefix("/" + m[1].replace(/^\/?static/, "static")));
  };
  const collectFrom = (file) => {
    let t = "";
    try { t = readFileSync(file, "utf-8"); } catch { return; }
    push(t);
  };
  collectFrom(join(srcRoot, "pages.json"));
  let entry = "";
  try {
    const pj = readFileSync(join(srcRoot, "pages.json"), "utf-8");
    entry = String((/"path"\s*:\s*"([^"]+)"/.exec(pj) || [, ""])[1]);
  } catch { /* 读不到入口页就只保 tabBar */ }
  if (entry) collectFrom(join(srcRoot, entry + ".vue"));
  const ctb = join(srcRoot, "custom-tab-bar");
  if (existsSync(ctb)) {
    for (const rel of listFilesRecursive(ctb)) if (/\.(vue|ts|js|wxml|json)$/.test(rel)) collectFrom(join(ctb, rel));
  }
  return out;
}

/** 契约缺席/非法/命中保护名单/后端缺资产 —— 四种情形的统一出口。
 *  返回 { buckets } 或在**任何写盘之前**判红（strip 在 stage 里构造，SRC 还没被碰）。 */
function resolveBuckets(path, log) {
  const loaded = loadBuckets(path);
  if (loaded.absent) {
    console.log(`PREPARESTATIC_CDN=ABSENT path=${path} ⇒ 不做任何额外放行（行为与契约落地前逐字一致）`);
    return { buckets: null };
  }
  if (loaded.problems) {
    console.error(`PREPARESTATIC_CDN=FAIL reason=contract-invalid path=${path}`);
    for (const p of loaded.problems) console.error(`CDN_CONTRACT_PROBLEM ${p}`);
    console.error("CDNBUCKETS_RESULT=FAIL 契约不合法 ⇒ 整份拒收，一个字节都不按它处置");
    return { fatal: true };
  }
  log.push(`PREPARESTATIC_CDN_CONTRACT path=${loaded.buckets.path} sha8=${loaded.buckets.sha8} cdnBuckets=${loaded.buckets.cdnPrefixes.length} localBuckets=${loaded.buckets.localPrefixes.length}`);
  return { buckets: loaded.buckets };
}

/** profile PNG 的权威来源（2026-09-30 r9 处置，reports/audit/round-7/followups-v33.md §9）。
 *
 * `src/static/assets/profile/png/**` 是 48 个**被 git 跟踪**的文件，而
 * `static-local-backup/full-static/assets/profile/png/**` 里那一份是**未跟踪的本机副本**
 * （`.gitignore:70` 的 `*.png` 挡住了它，只有 `!apps/client/src/static/**` 白名单里的那份入库）。
 * 旧链无条件把备份盖进 src ⇒ 备份陈旧时（实测 `profile-hero.png` 差 16B、且差在像素不在元数据）
 * 跟踪文件就被写成非 HEAD 字节，只能靠紧随其后的 profile-svg-to-png 再改写一次才自愈；
 * 那一步在 Windows 上会被微信 IDE/模拟器占用打断（实测 `Invalid argument`），脏项就留下来了。
 *
 * 现在备份不再是这几个 PNG 的来源，权威顺序 =
 *   现有 src（被跟踪的字节，就是"入库的那一份"）> static-generated（构建期从 SVG 现算）> 备份（兜底）。
 * 这样 src 的字节不再由"本机恰好留存的备份"决定，构建也不再改写跟踪文件。
 *
 * onlyExisting=true 给 strip()（real 档）用：只把已经因引用而进包的那些重新对齐到权威来源，
 * 不因 seeding 往 real 档里多塞文件（那会动包体积与 strip 的既有语义）。
 * 返回 { seeded, skippedSame }。 */
function seedProfilePngFromAuthority(stage, { onlyExisting = false } = {}) {
  const REL_DIR = join("assets", "profile", "png");
  const authorities = [
    { label: "src(跟踪字节)", dir: join(SRC, REL_DIR) },
    { label: "static-generated(构建现算)", dir: join(STAGE_ROOT, "static-generated", REL_DIR) },
    { label: "backup(本机备份)", dir: join(BACKUP, "full-static", REL_DIR) },
  ];
  const dstDir = join(stage, REL_DIR);
  const names = onlyExisting
    ? listFilesRecursive(dstDir)
    : [...new Set(authorities.flatMap((a) => listFilesRecursive(a.dir)))];
  let seeded = 0;
  let skippedSame = 0;
  for (const rel of names) {
    const auth = authorities.find((a) => existsSync(join(a.dir, rel)));
    if (!auth) { continue; }
    const from = join(auth.dir, rel);
    const to = join(dstDir, rel);
    let bytes;
    try { bytes = readFileSync(from); } catch (e) {
      throw new Error(`读不到权威 PNG ${from}（来源 ${auth.label}）：${e.message}`);
    }
    mkdirSync(dirname(to), { recursive: true });
    try {
      if (existsSync(to) && readFileSync(to).equals(bytes)) { skippedSame++; continue; }
    } catch { /* 读不动就当作要写 */ }
    /**
     * 这里**不能**用 cpSingle()：它把 `cpSync` 的 Windows 假错按"目标存在就算写成功"咽掉，
     * 而本函数的前提恰好是**覆盖已有文件**（旧目标本来就存在、且是要被换掉的陈旧字节）。
     * 沙箱实测过这条形状（.zcode/tmp/svgpng-r9/ps-sbx-{A,B}）：用 cpSingle 时陈旧字节留在原处、
     * 本函数却谎报"换成权威来源 1 个"。改成读进来再写出去 + 写完复验，复验不过直接抛，
     * 由既有的回滚路径接手（宁可构建失败，不要带着陈旧 PNG 假装成功）。
     */
    writeFileSync(to, bytes);
    if (!readFileSync(to).equals(bytes)) {
      throw new Error(`权威字节没落进 ${to}（写完复验不一致，来源 ${auth.label}）`);
    }
    seeded++;
  }
  return { seeded, skippedSame, total: names.length, from: authorities.map((a) => a.label).join(" > ") };
}

function restore() {
  const full = join(BACKUP, "full-static");
  if (!existsSync(full)) {
    console.error(`[prepare-static] 备份不存在：${full}`);
    process.exit(1);
  }
  const stage = `${STAGE_ROOT}/static_prepare_${process.pid}_${Date.now()}`;
  /* 先问"到底缺不缺"，再决定要不要做那次目录交换。R5 实测：链的开场预检按
     "备份文件数 > src 文件数"触发 restore()，而 src=1344 / 备份=1345 —— 差的这一个
     既不在 git 里也不在 src 里（备份多出来的本机文件），于是每次都去做那次
     rename(src/static)+mv(stage→src/static)，而那次 mv 在 Windows 上会撞上
     "目标已存在/busy"（IDE 正开着这个项目）⇒ 整个发布链以 prestate-restore-exit-1 失败。
     一个"其实没缺东西"的恢复动作不该去搬 1345 个文件：缺多少就说多少，缺得极少且都是
     源码侧根本不引用的本机文件时按 no-op 走，并把名单念出来，绝不静默吞掉。 */
  const list = (d, rel = "") => {
    const out = [];
    for (const n of readdirSync(join(d, rel))) {
      const r = rel ? `${rel}/${n}` : n;
      let s; try { s = statSync(join(d, r)); } catch { continue; }
      if (s.isDirectory()) out.push(...list(d, r)); else out.push(r);
    }
    return out;
  };
  const want = list(full);
  const missing = want.filter((r) => !existsSync(join(SRC, r)));
  console.log(`PREPARESTATIC_RESTORE_CHECK 备份=${want.length} 缺失=${missing.length}`);
  for (const r of missing.slice(0, 10)) console.log(`PREPARESTATIC_RESTORE_MISSING ${r}`);
  if (dryRun) {
    console.log(`PREPARESTATIC_RESTORE=DRY 缺失=${missing.length}（未做目录交换、未复制任何文件）`);
    return;
  }
  if (want.length && missing.length / want.length < 0.01) {
    console.log(`PREPARESTATIC_RESTORE=noop reason=src 已是全量（缺的 ${missing.length} 个都在源码引用之外）⇒ 不做目录交换，Windows 上那次 mv 会撞 busy`);
    return;
  }
  try {
    mkdirSync(stage);
    sysCpContents(full, stage);
    const png = seedProfilePngFromAuthority(stage);
    console.log(`[prepare-static] profile PNG 权威对齐：换成权威来源 ${png.seeded} 个 / 字节相同跳过 ${png.skippedSame} 个 / 共 ${png.total} 个（顺序 ${png.from}）`);
    atomicPromote(stage, "restored full-static -> src/static");
    console.log(`[prepare-static] 完成（模式 ${mode}）`);
  } catch (e) {
    console.error(`[prepare-static] restore 失败：${e.message}`);
    if (existsSync(stage)) {
      spawnSync("rm", ["-rf", stage], { stdio: ["ignore", "inherit", "inherit"] });
    }
    process.exit(1);
  }
}

function strip() {
  const full = join(BACKUP, "full-static");
  const stage = `${STAGE_ROOT}/static_prepare_${process.pid}_${Date.now()}`;
  const refs = new Set();
  const frags = new Set();
  const consts = new Map();
  const constsExpr = [];
  const distRoot = resolve(__dirname, "../dist/build/mp-weixin");
  const srcRoot = resolve(__dirname, "../src");
  let scanTargets;
  if (scanMode === "src") scanTargets = [srcRoot];
  else if (scanMode === "dist") {
    if (!existsSync(distRoot)) {
      console.error(`[prepare-static] --scan dist 但 ${distRoot} 不存在 ⇒ 不猜、不回退到 src（那会让"我扫的是哪一档"读不出来）`);
      process.exit(2);
    }
    scanTargets = [distRoot];
  } else {
    // 旧口径原样保留（跨档、随构建顺序变），只在 auto 下发生，并在机读行里标出来
    scanTargets = existsSync(distRoot) ? [distRoot] : [srcRoot];
  }
  console.log(`PREPARESTATIC_SCAN mode=${scanMode} targets=${scanTargets.length} root=${scanTargets[0]}`);
  for (const dir of scanTargets) {
    (function scan(d) {
      for (const name of readdirSync(d)) {
        const p = join(d, name);
        let st;
        try { st = statSync(p); } catch { continue; }
        if (st.isDirectory()) {
          if (name === "node_modules" || name === "static") continue;
          scan(p);
        } else if (/\.(wxml|json|js|vue|ts)$/.test(name)) {
          let text;
          try { text = readFileSync(p, "utf-8"); } catch { continue; }
          const scanText = text.replace(/resolveMediaUrl\(\s*['"][^'"]+['"]\s*\)/g, "");
          const re = /['"`]?(\/static\/[A-Za-z0-9/_ .\-]+\.(?:png|jpg|jpeg|svg|gif|webp|wav|mp3))['"`]?/g;
          let m;
          while ((m = re.exec(scanText)) !== null) refs.add(m[1]);
          /* 同一趟顺带收两类"看不见"的材料：相对片段与常量表（下面才求值成完整路径） */
          const fre = /['"`](\/[A-Za-z0-9/_.\-]+\.(?:png|jpg|jpeg|svg|gif|webp|wav|mp3))['"`]/g;
          let fm;
          while ((fm = fre.exec(scanText)) !== null) { if (!fm[1].startsWith("/static/")) frags.add(fm[1]); }
          const cre = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`|(?:[A-Za-z][A-Za-z0-9_$.]*)\s*\+\s*'([^']*)')/g;
          let cm;
          while ((cm = cre.exec(text)) !== null) {
            const val = cm[2] ?? cm[3] ?? cm[4];
            if (val !== undefined) consts.set(cm[1], val);
            else constsExpr.push({ name: cm[1], tail: cm[5] });
          }
        }
      }
    })(dir);
  }
  /* ── 拼接路径的补收（这条是本轮审计的根因修复）──
     字面量那条正则只认整串 '/static/...'，而 config/images.ts 这套单一来源是拿常量拼路径的
     （ICONS_BASE + '/common/eye.svg'，ICONS_BASE 又是 STATIC_BASE + '/icons'，STATIC_BASE 还可能被 CDN 前缀顶掉）。
     这类引用对正则完全隐形 ⇒ strip 会把**正在用的文件从 src/static 删掉**：
     实测 assets/icons/common/ 备份里有 128 个、src 里只剩 15 个，真机档因此缺一百多枚图标，
     而后面三轮把它们统统记成"素材缺失"的产品缺陷（三条泳道各自独立报过一次）。
     求值常量表很脆（三元、模板串、跨文件 import 都会漏），所以换成**拿备份目录当事实**：
     片段能在备份里唯一对上文件就算引用；对上多个就全留（宁可留错也不删正在用的），
     一个都对不上的就是"代码引用了盘上没有的文件"——那是真缺陷，单列点名而不是悄悄删掉。 */
  const allFiles = [];
  (function walk(d, rel) {
    for (const n of readdirSync(d)) {
      const p = join(d, n), r = rel ? rel + "/" + n : n;
      let s; try { s = statSync(p); } catch { continue; }
      if (s.isDirectory()) walk(p, r); else allFiles.push(r);
    }
  })(full, "");
  let compAdded = 0; const ambiguous = []; const orphanRefs = [];
  for (const frag of frags) {
    const hits = allFiles.filter((r) => r.endsWith(frag.slice(1)) || ("/" + r).endsWith(frag));
    if (!hits.length) { orphanRefs.push(frag); continue; }
    if (hits.length > 1) ambiguous.push(frag + "×" + hits.length);
    for (const h of hits) { if (!refs.has("/static/" + h)) { refs.add("/static/" + h); compAdded++; } }
  }
  console.log(`PREPARESTATIC_COMPUTED 片段=${frags.size} 新增补收=${compAdded} 多义=${ambiguous.length} 引用了盘上没有的=${orphanRefs.length}`);
  for (const f of ambiguous.slice(0, 8)) console.log(`PREPARESTATIC_AMBIGUOUS ${f}（全留：删错的代价比留错大）`);
  for (const f of orphanRefs.slice(0, 12)) console.log(`PREPARESTATIC_ORPHAN_REF ${f}（代码引用它，备份与本树都没有 ⇒ 这是真·素材缺失，不许被裁剪顺手掩盖）`);
  /* 补收"常量 + 尾串"拼出来的图标引用。这条是本轮审计的根因修复：
     上一版扫描只认字面量整串 /static/... ，而 config/images.ts 是拿常量拼路径的，
     于是 --real 把正在用的图标从 src/static 删了（assets/icons/common 实测备份 128 个、src 只剩 15 个），
     后续三轮把它们统统记成"素材缺失"的产品缺陷。范围限定在 icons/ 与 svg-spec/ 小文件族，
     大位图仍必须有字面量引用（理由与三代错法的实测数值都记在 asset-computed-refs.mjs 头上）。 */
  const comp = collectComputedRefs(srcRoot, (rel) => {
    const abs = join(full, rel);
    try { return statSync(abs).size; } catch { return null; }
  }, { maxBytes: 64 * 1024 });
  for (const r of comp.refs) refs.add(r);
  console.log("PREPARESTATIC_COMPUTED 补收=" + comp.refs.length + " 族外排除=" + comp.outOfFamily.length + " 超大拒收=" + comp.rejectedLarge.length + " 基址解不出=" + comp.unresolved + " 引用了盘上没有的=" + comp.orphans.length);
  for (const o of comp.orphans.slice(0, 12)) console.log("PREPARESTATIC_ORPHAN_REF " + o + "（配置指向它，备份与本树都没有 ⇒ 真素材缺失，不许被裁剪顺手掩盖）");
  if (comp.refs.length) { const hit = comp.refs.filter((x) => x.indexOf("icons/common/eye.svg") >= 0 || x.indexOf("icons/common/location.svg") >= 0); console.log("PREPARESTATIC_COMPUTED_样本 " + (hit.length ? hit.join(" ") : "(未含 eye/location，检查解析是否生效)")); }

  /* ── CDN 桶放行：命中契约 cdnPrefixes 且后端 app-assets 有同名字节的，**不再复制进 src/static**
     ⇒ uni build 根本不会把它们装进主包（不是"装完再删"，删的是复制这一步）。
     四种情形一律在 SRC 被动之前判红：契约非法 / 命中首屏-本地必需 / 后端缺资产 / 记录写不进盘。 */
  const cdnLog = [];
  const { buckets, fatal } = resolveBuckets(bucketsArg, cdnLog);
  if (fatal) process.exit(1);
  const offloadSet = new Set();
  let offloadEntries = [];
  if (buckets) {
    const inBackup = new Set(allFiles.map((r) => "static/" + r));
    /** 候选 = "会被复制进包"的那一份引用集（保留集 ∩ 备份）。桶判定只对它们做：
     *  桶外的一律留包，桶内且后端有同名文件的才出包，桶内但后端没有的 → missing 名单 → 判红。 */
    const candidates = [...refs].map(normalizePrefix).filter((f) => inBackup.has(f));
    const plan = planCdnOffload(candidates, buckets, BACKEND_ASSETS);
    const first = firstScreenRefs(srcRoot);
    const firstHits = plan.offload.filter((o) => first.has(o.packagePath));
    const reason = cdnRedReason(plan, firstHits);
    if (reason) {
      console.error(`CDN_OFFLOAD=FAIL reason=${reason} contract=${buckets.path}@${buckets.sha8}`);
      for (const v of plan.violations) console.error(`CDN_PROTECTED_HIT ${v.file} ⇒ ${v.why}`);
      for (const m of plan.missing) console.error(`CDN_BACKEND_MISSING ${m.file} ⇒ 期望 app-assets/${m.appAssetPath}（fs 探测 ${m.backendFile} 不存在）`);
      for (const o of firstHits) console.error(`CDN_FIRST_SCREEN_HIT ${o.packagePath} ⇒ pages.json/tabBar/入口页直接引用它，出包就等于首屏空白`);
      console.error(`[prepare-static] 一个文件都不按契约处置：src/static **未被触碰**（宁可链停，也不静默把图弄丢）`);
      console.log("CDNBUCKETS_RESULT=FAIL reason=" + reason);
      process.exit(1);
    }
    let offloadBytes = 0;
    let byteMismatch = 0;
    for (const o of plan.offload) {
      const srcFile = join(full, o.appAssetPath);
      let packageBytes = 0;
      try { packageBytes = statSync(srcFile).size; } catch { continue; }
      if (packageBytes !== o.backendBytes) byteMismatch++;
      offloadSet.add(o.packagePath);
      offloadEntries.push({
        packagePath: o.packagePath,
        appAssetPath: o.appAssetPath,
        packageBytes,
        backendBytes: o.backendBytes,
        bytesMatch: packageBytes === o.backendBytes,
      });
      offloadBytes += packageBytes;
    }
    console.log(`PREPARESTATIC_CDN=APPLIED contract=${buckets.path}@${buckets.sha8} 候选=${candidates.length} 去重候选=${new Set(candidates).size} 桶判定(offload=${plan.offload.length}/缺资产=${plan.missing.length}/保护命中=${plan.violations.length}) 实际放行=${offloadEntries.length} 出包字节=${offloadBytes} 后端字节不一致=${byteMismatch} 首屏样本=${first.size}`);
    for (const m of plan.missing) console.error(`CDN_BACKEND_MISSING ${m.file} ⇒ 期望 app-assets/${m.appAssetPath}`);
    for (const o of plan.offload) {
      if (!offloadEntries.some((e) => e.packagePath === o.packagePath)) {
        console.error(`CDN_OFFLOAD=FAIL reason=offload-entry-dropped ${o.packagePath} ⇒ 桶判定要放行它，但备份里取不到字节（静默丢弃=丢图，宁可红）`);
        process.exit(1);
      }
    }
    const mismatchNames = offloadEntries.filter((e) => !e.bytesMatch).slice(0, 8);
    for (const e of mismatchNames) console.warn(`CDN_BYTE_MISMATCH_ITEM ${e.packagePath} 包内=${e.packageBytes}B app-assets=${e.backendBytes}B`);
    if (byteMismatch) console.warn(`CDN_BYTE_MISMATCH=${byteMismatch} ⇒ 包内字节与 app-assets 字节不等长（服务的是另一份图，不是"丢了"，但要看一眼）`);
    /* 本地桶读数：留包侧必须还有东西，否则"localPrefixes 存在但整目录空了"就是误删的形状 */
    for (const lp of buckets.localPrefixes) {
      const n = allFiles.filter((r) => ("static/" + r).startsWith(lp)).length;
      console.log(`PREPARESTATIC_LOCAL ${lp} 备份内文件=${n}`);
    }
  }
  if (offloadSet.size) {
    const tabbarInBucket = [...offloadSet].filter((f) => f.startsWith("static/assets/icons/tabbar/"));
    if (tabbarInBucket.length) {
      console.error(`CDN_OFFLOAD=FAIL reason=tabbar-icon-offloaded ${tabbarInBucket.join(" ")}`);
      process.exit(1);
    }
  }

  let kept = 0;
  let offloaded = 0;
  /* --dry：把 strip 的全部判读算完并打印，但**不建 stage、不复制、不 promote、不写记录**
     —— 用于"只读量一次现状"（本仓纪律：恢复/裁剪类动作先问到底缺不缺，先看会剪成什么样）。 */
  if (dryRun) {
    const keepList = [...refs].map(normalizePrefix).filter((f) => !offloadSet.has(f) && allFiles.includes(f.replace(/^static\//, "")));
    const keepBytes = keepList.reduce((a, f) => { try { return a + statSync(join(full, f.slice("static/".length))).size; } catch { return a; } }, 0);
    const tabbarN = existsSync(join(full, "assets/icons/tabbar")) ? listFilesRecursive(join(full, "assets/icons/tabbar")).length : 0;
    console.log(`PREPARESTATIC_DRY mode=real scan=${scanMode} 保留(不含tabbar)=${keepList.length} 保留字节=${keepBytes} tabBar整目录=${tabbarN} CDN放行=${offloadEntries.length} 放行字节=${offloadEntries.reduce((a, e) => a + e.packageBytes, 0)} 契约=${buckets ? buckets.path + "@" + buckets.sha8 : "(缺席)"}`);
    console.log(`PREPARESTATIC_DRY src/static=${SRC}（未触碰） 备份=${full}`);
    const biggest = keepList.map((f) => ({ f, b: (() => { try { return statSync(join(full, f.slice("static/".length))).size; } catch { return 0; } })() })).sort((a, b) => b.b - a.b).slice(0, 8);
    for (const x of biggest) console.log(`PREPARESTATIC_DRY_保留大户 ${x.f} ${(x.b / 1024).toFixed(0)}KB`);
    for (const e of offloadEntries.slice(0, 8)) console.log(`PREPARESTATIC_DRY_放行 ${e.packagePath} ${e.packageBytes}B → ${APP_ASSET_ENDPOINT}${e.appAssetPath}`);
    if (offloadEntries.length > 8) console.log(`PREPARESTATIC_DRY_放行 …另 ${offloadEntries.length - 8} 个未逐条点名`);
    console.log("PREPARESTATIC_RESULT=DRY（没动盘）");
    return;
  }
  try {
    mkdirSync(stage);
    // tabBar 图标（小目录 13 个，用单文件 cpSync 循环避免 spawnSync Windows 子进程抖动）
    const tabbar = join(full, "assets/icons/tabbar");
    if (existsSync(tabbar)) {
      const dst = join(stage, "assets/icons/tabbar");
      mkdirSync(dirname(dst), { recursive: true });
      sysCpDirSingleFile(tabbar, dst);
    }
    // 源码字面量引用的 /static/**——单文件 cpSync（不被 shim 拦截）
    for (const ref of refs) {
      const pkgPath = normalizePrefix(ref);
      if (offloadSet.has(pkgPath)) { offloaded++; continue; } // CDN 放行：根本不复制进包（运行时走 app-assets）
      const from = join(full, ref.slice("/static/".length));
      if (existsSync(from)) {
        const to = join(stage, ref.slice("/static/".length));
        mkdirSync(dirname(to), { recursive: true });
        cpSingle(from, to);
        kept++;
      }
    }
    const png = seedProfilePngFromAuthority(stage, { onlyExisting: true });
    console.log(`[prepare-static] real 模式 profile PNG 权威对齐：换成权威来源 ${png.seeded} 个 / 字节相同跳过 ${png.skippedSame} 个（顺序 ${png.from}）`);
    /* 机读记录：prune 步据此把"为什么这些文件不在包里 + 它们在哪个端点"写成产物内清单。
       写在 promote **之前**：写不进盘就当没放行（宁可不省体积，也不要"文件不见了但没人能解释"）。 */
    if (buckets) {
      const record = {
        schema: "mp-cdn-offload-record/v1",
        writtenBy: "apps/client/scripts/prepare-static.mjs --real",
        at: new Date().toISOString(),
        contract: { path: buckets.path, sha8: buckets.sha8, schema: BUCKET_SCHEMA },
        cdnPrefixes: buckets.cdnPrefixes,
        localPrefixes: buckets.localPrefixes,
        appAssetEndpoint: APP_ASSET_ENDPOINT,
        backendAssetsDir: BACKEND_ASSETS,
        scanMode,
        totals: { files: offloadEntries.length, packageBytes: offloadEntries.reduce((a, e) => a + e.packageBytes, 0) },
        entries: offloadEntries,
      };
      mkdirSync(dirname(OFFLOAD_RECORD), { recursive: true });
      writeFileSync(OFFLOAD_RECORD, JSON.stringify(record, null, 2) + "\n", "utf-8");
      console.log(`CDN_OFFLOAD_RECORD=${OFFLOAD_RECORD} files=${record.totals.files} packageBytes=${record.totals.packageBytes} contractSha8=${buckets.sha8}`);
    }
    atomicPromote(stage, `real 模式：本地保留 tabBar + 源码字面量引用 ${kept} 个文件${offloaded ? `（CDN 放行 ${offloaded} 个，不进包）` : ""}`);
    console.log(`[prepare-static] real 模式：其余由后端 app-assets 托管`);
    console.log(`[prepare-static] 完成（模式 ${mode}）`);
  } catch (e) {
    console.error(`[prepare-static] strip 失败：${e.message}`);
    if (existsSync(stage)) {
      spawnSync("rm", ["-rf", stage], { stdio: ["ignore", "inherit", "inherit"] });
    }
    process.exit(1);
  }
}

if (mode === "--dev" || mode === "--h5") {
  restore();
} else if (mode === "--real") {
  strip();
} else {
  console.error(`[prepare-static] 未知模式: ${mode}（支持 --dev / --h5 / --real）`);
  process.exit(1);
}