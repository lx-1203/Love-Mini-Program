/**
 * real 构建静态资源引用可达性清理（主包瘦身最后一道）。
 *
 * 背景：real 构建要求主包 ≤2MB。static/assets/** 由设计整包交付，含大量
 * 「运行时经 resolveMediaUrl 改写为后端 app-assets URL」的托管资产——这些文件
 * 在 real 包内是死重量（dist 里带着但运行时永远走 HTTP）。
 *
 * 判定规则（2026-08-30 增强）：
 *  1. 源码扫描收集两类引用：
 *     - raw 引用：不在 resolveMediaUrl(...) 包裹内的路径字面量（含模板 src="/static/..."）
 *     - wrapped 引用：resolveMediaUrl('...') 参数里的路径（运行时改写 → 后端托管）
 *  2. dist/static 中被「raw 引用」的文件保留；仅被 wrapped 引用或完全无引用的文件，
 *     若后端 app-assets 已托管同路径文件则删除，否则保留并告警。
 *  3. icons/tabbar/**（wx.setTabBarItem 原生读取）与 audio/** 永不删除。
 *
 * 用法：node scripts/prune-unreferenced-static.mjs --dist <产物目录>
 * 挂载：build:mp-weixin:real 链中 verify-package-size 之前。
 *
 * 2026-10-18（MP-FIDELITY Phase A3）—— 这一步会**删文件**，所以补三道前提，全部可红：
 *  1. `--dist` 必传。以前缺省硬编码 `dist/build/mp-weixin`（mock 档的家），实测发布链里这一步
 *     一直在裁 mock 产物，而"发布形态已瘦身"的结论记在别人的目录上（D-A0）。现在没有 --dist 就退 2，
 *     不猜目录、不动任何文件。
 *  2. 动手前读 `<dist>/config/env.js` 断言 `MODE:"real"`。别的档（mock/showcase）指向这里 ⇒ 拒绝，
 *     否则一次拼错的 --dist 就会把 mock 证据剪掉，而 mock 轮靠的是 before/after 配对。
 *  3. 删除前把待剪子树整棵 cp -a 到 `archive/prune-backup/<stamp>/` 并打 PRUNE_BACKUP=；
 *     备份写不成功 ⇒ 一个文件都不删（rm && mv 共享 $? 的那类事故不再来一次）。
 *
 * 2026-10-19（R6 · L02 构建车道）—— 按 **CDN 桶契约**（`apps/client/config/cdn-buckets.json`，
 * schema `mp-cdn-buckets/v1`）兜底放行：`cdnPrefixes` 命中而仍在包里的文件从这里出包，
 * 并把「这个文件为什么不在包里 + 它在哪个端点」写成产物内的机器可读清单
 * `<dist>/CDN_OFFLOAD_MANIFEST.json`（数据源 = prepare-static 的出包记录 + 本步自己的删除）。
 * 三条硬闸（都在**删除之前**判红，一个文件都不动）：
 *   1. 契约非法（schema/前缀口径/cdn∩local 覆盖/桶含首屏必需）⇒ 拒收整份契约；
 *   2. 桶内文件在 `apps/api/uploads/app-assets/` 下**没有同名文件** ⇒ 大声红并逐张点名，
 *      绝不"剪了算了"（那正是"体积绿了因为图被删了"的复发形状）；
 *   3. `localPrefixes`（icons / svg-spec）与 tabbar/register/audio/default-avatar/profile 皮肤
 *      一律留在包里；清单里出现它们 = 误删包内素材 = 本步判红。
 * 契约不在盘上 ⇒ 本步行为与改动前逐字一致（只做原有的 wrapped 引用清理）。
 */
import { readFileSync, readdirSync, statSync, existsSync, unlinkSync, rmdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");
const repoRoot = resolve(clientDir, "..", "..");
const srcDir = join(clientDir, "src");
const backendAssetsDir = resolve(clientDir, "../../apps/api/uploads/app-assets");

const argv = process.argv.slice(2);
const opt = (k, dflt) => {
  const i = argv.indexOf("--" + k);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  return v === undefined || String(v).startsWith("--") ? dflt : v;
};
const RK = "PRUNE_RESULT";
const dryRun = argv.includes("--dry");

/* ══ CDN 桶契约（与 prepare-static.mjs / verify-package-size.mjs 同一份盘上契约，同一套判据）══
   两处内联不合并成第三个模块，是因为这三脚本分属 apps/client/scripts 与仓库 scripts 两棵树；
   口径漂移由**运行期比对契约 sha8** 兜住（清单里的 sha8 ≠ 本步读到的 sha8 ⇒ 判红）。 */
const BUCKETS_DEFAULT = join(clientDir, "config", "cdn-buckets.json");
const BUCKET_SCHEMA = "mp-cdn-buckets/v1";
const APP_ASSET_ENDPOINT = "/api/v1/media/app-assets/";
const OFFLOAD_RECORD = join(repoRoot, "tmp/build/cdn-offload-record.json");
const MANIFEST_NAME = "CDN_OFFLOAD_MANIFEST.json";
const PROTECTED_LOCAL_PREFIXES = [
  "static/assets/icons/tabbar/",
  "static/assets/icons/register/",
  "static/assets/profile/",
];
const PROTECTED_FILE_RE = [/\/audio\//, /default-avatar\.(jpg|png|svg)$/i];
const bucketsArg = resolve(opt("buckets", BUCKETS_DEFAULT));

const normalizePrefix = (p) => String(p || "").replace(/^\/+/, "").replace(/\\/g, "/");
const stripStaticPrefix = (p) => normalizePrefix(p).replace(/^static\//, "");
const bucketOf = (pkgPath, prefixes) => {
  const s = normalizePrefix(pkgPath);
  return prefixes.find((p) => s.startsWith(p)) || null;
};
const protectedHit = (pkgPath) => {
  const s = normalizePrefix(pkgPath);
  const hit = PROTECTED_LOCAL_PREFIXES.find((p) => s.startsWith(p));
  if (hit) return "local-protected-prefix:" + hit;
  if (PROTECTED_FILE_RE.some((re) => re.test(s))) return "local-protected-file";
  return null;
};
function loadBuckets(path) {
  if (!existsSync(path)) return { absent: true, path };
  let raw = "";
  try { raw = readFileSync(path, "utf-8"); } catch (e) { return { problems: [`契约读不动：${e.message}`], path }; }
  let doc = null;
  try { doc = JSON.parse(raw); } catch (e) { return { problems: [`契约不是合法 JSON：${e.message}`], path }; }
  const problems = [];
  if (doc.schema !== BUCKET_SCHEMA) problems.push(`schema=${JSON.stringify(doc.schema)}（应为 "${BUCKET_SCHEMA}"）`);
  const arr = (k) => {
    const v = doc[k];
    if (!Array.isArray(v) || v.length === 0) { problems.push(`字段 ${k} 缺失或为空数组`); return []; }
    return v.map(normalizePrefix).filter((p, i) => {
      if (!p.startsWith("static/")) { problems.push(`${k}[${i}]=${JSON.stringify(v[i])} 不以 static/ 开头`); return false; }
      if (!p.endsWith("/")) { problems.push(`${k}[${i}]=${JSON.stringify(v[i])} 不以 / 结尾`); return false; }
      if (p === "static/") { problems.push(`${k}[${i}]="static/" 会扫走整包`); return false; }
      return true;
    });
  };
  const cdnPrefixes = arr("cdnPrefixes");
  const localPrefixes = arr("localPrefixes");
  for (const c of cdnPrefixes) {
    for (const l of localPrefixes) if (c.startsWith(l) || l.startsWith(c)) problems.push(`cdnPrefixes ${c} 与 localPrefixes ${l} 相互覆盖`);
    for (const pr of PROTECTED_LOCAL_PREFIXES) if (pr.startsWith(c) || c.startsWith(pr)) problems.push(`cdnPrefixes ${c} 覆盖首屏/本地必需前缀 ${pr}`);
  }
  if (problems.length) return { problems, path };
  return { buckets: { path, sha8: createHash("sha256").update(raw).digest("hex").slice(0, 8), cdnPrefixes, localPrefixes, endpoint: APP_ASSET_ENDPOINT } };
}
function readRecord() {
  if (!existsSync(OFFLOAD_RECORD)) return null;
  try { return JSON.parse(readFileSync(OFFLOAD_RECORD, "utf-8")); } catch (e) { return { broken: String(e.message).slice(0, 120) }; }
}
/** 产物内的 apiRoot：与 utils/media.ts 同一算法（VITE_API_BASE_URL 去掉尾部 /api） */
function apiRootFromEnv(envText) {
  const base = String((envText.match(/VITE_API_BASE_URL:\s*"([^"]*)"/) || [, ""])[1]);
  return base.replace(/\/api\/?$/, "");
}
/** 本地桶在包内还剩几个文件（"整目录空了"就是误删的形状，体积门据此点名） */
function walkCount(staticDir, relPrefix) {
  const root = join(staticDir, relPrefix.replace(/^static\//, "").replace(/\/+$/, ""));
  let n = 0;
  const stack = [root];
  while (stack.length) {
    const d = stack.pop();
    let names = [];
    try { names = readdirSync(d); } catch { continue; }
    for (const name of names) {
      const p = join(d, name);
      let st = null;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) stack.push(p); else n++;
    }
  }
  return n;
}
/** 清单条目 = 记录里"从未被复制进包"的那些 + 本步实际从包里取下的那些 + **上一份清单**里同契约的条目。
 *  第三项是幂等所需：本步第二发跑时包里的桶文件已经没了，若不继承旧清单，清单会被重写成空的
 *  —— "文件为什么不在包里"这个解释就此消失，形状与"图被删了没人说"一样。
 *  条目只记 appAssetPath（包内路径 = "static/" + appAssetPath，见清单头部的 pathNote）：
 *  这份清单是**跟着主包走的字节**，127 条目时冗余字段就是几十 KB，不能不计较。 */
const ORIGIN_CODES = {
  strip: "strip=prepare-static --real 没把它复制进 src/static（所以从未进包）",
  prune: "prune=本步从产物包里取下的（桶命中且 app-assets 有同名文件）",
  inherit: "inherit=上一份同契约清单的条目（本发包里已无此文件）",
};
function manifestEntries(cdnDeleted, record, priorEntries) {
  const byPath = new Map();
  const put = (e, code) => {
    const rel = e && (e.appAssetPath || (e.packagePath || "").replace(/^static\//, ""));
    if (!rel) return;
    const pkgPath = e.packagePath || "static/" + rel;
    byPath.set(pkgPath, {
      appAssetPath: rel,
      packageBytes: e.packageBytes,
      backendBytes: e.backendBytes,
      bytesMatch: e.bytesMatch !== false && e.packageBytes === e.backendBytes,
      origin: code,
    });
  };
  for (const e of (record && Array.isArray(record.entries) ? record.entries : [])) put(e, "strip");
  for (const e of (Array.isArray(priorEntries) ? priorEntries : [])) put(e, "inherit");
  for (const e of cdnDeleted) put(e, "prune");
  return [...byPath.values()].sort((a, b) => (a.appAssetPath < b.appAssetPath ? -1 : 1));
}

const distArg = String(opt("dist", "")).trim();
if (!distArg) {
  console.error(`${RK}=NOT-EVIDENCED reason=--dist-missing hint=这一步会删文件，缺省目录曾经是 mock 档（D-A0），现在必须点名要剪哪一档`);
  process.exit(2);
}
const distDir = resolve(distArg);
const distStatic = join(distDir, "static");
const distEnvJs = join(distDir, "config/env.js");

// 档位断言：只剪 real 档。读不到/不是 real ⇒ 一个字节都不动。
if (!existsSync(distEnvJs)) {
  console.error(`${RK}=REFUSED_BAND reason=no-env-js dir=${distDir}（这不是 uni 产物目录，拒删）`);
  process.exit(1);
}
const envJsSrc = readFileSync(distEnvJs, "utf-8");
const modeHit = String(envJsSrc).match(/MODE:\s*"([^"]+)"/);
const bandMode = modeHit ? modeHit[1] : "(MODE 未记)";
if (bandMode !== "real") {
  console.error(`${RK}=REFUSED_BAND reason=mode-not-real got="${bandMode}" dir=${distDir} ⇒ 这一步会删文件，指向 mock/showcase 档就等于剪掉别的轮的配对证据`);
  process.exit(1);
}
if (!existsSync(distStatic)) {
  console.log(`${RK}=PASS removed=0 note=该产物没有 static 目录（${distStatic}），无物可剪`);
  process.exit(0);
}

/* ── CDN 桶：契约先过校验，非法就退在**任何删除计划之前**（一个文件都不动） ──
   这一层是 prepare-static --real 的兜底：那一档按记录"不复制进包"，而这里管的是
   "已经不知什么原因进了包"的那些（例如只跑了 build:mp-weixin:real:isolated，
   它既没有 prepare-static --real 也没有 prune 之外的裁剪）。 */
const bucketLoad = loadBuckets(bucketsArg);
if (bucketLoad.problems) {
  console.error(`${RK}=FAIL reason=cdn-contract-invalid path=${bucketsArg}`);
  for (const p of bucketLoad.problems) console.error(`CDN_CONTRACT_PROBLEM ${p}`);
  console.error(`${RK}=FAIL 契约不合法 ⇒ 本次不删任何文件（原有 wrapped 引用清理也一并停：它同样依赖 app-assets 口径）`);
  process.exit(1);
}
const buckets = bucketLoad.buckets || null;
if (!buckets) {
  console.log(`PRUNE_CDN=ABSENT path=${bucketsArg} ⇒ 只做原有的 wrapped 引用清理，不做桶放行`);
}
const record = buckets ? readRecord() : null;
if (record && record.broken) {
  console.error(`PRUNE_CDN=FAIL reason=record-unreadable ${OFFLOAD_RECORD}：${record.broken} ⇒ 清单来源坏了，宁可不删`);
  process.exit(1);
}
if (record && !record.broken && buckets && record.contract && record.contract.sha8 !== buckets.sha8) {
  console.error(`PRUNE_CDN=FAIL reason=contract-drift record=${record.contract.sha8} 本次=${buckets.sha8}（${buckets.path}）`);
  console.error(`PRUNE_CDN=FAIL hint=出包记录与当前契约不是同一份 ⇒ 清单会解释错文件；重跑 prepare-static --real`);
  process.exit(1);
}
/** 上一份清单（同契约才继承）：幂等所需 —— 第二发跑时桶文件已经不在包里了，
 *  不继承就等于把"这些文件为什么不在包里"的解释擦掉，那正是本清单要防的形状。 */
const priorManifest = (() => {
  const p = join(distDir, MANIFEST_NAME);
  if (!buckets || !existsSync(p)) return null;
  try {
    const d = JSON.parse(readFileSync(p, "utf8"));
    if (d.schema !== "mp-cdn-offload-manifest/v1") return { broken: `schema=${JSON.stringify(d.schema)}` };
    if (!d.contract || d.contract.sha8 !== buckets.sha8) return { broken: `契约不同（旧 ${d.contract && d.contract.sha8} / 新 ${buckets.sha8}）` };
    return { entries: Array.isArray(d.entries) ? d.entries : [] };
  } catch (e) { return { broken: String(e.message).slice(0, 100) }; }
})();
if (priorManifest && priorManifest.broken) console.warn(`PRUNE_CDN_MANIFEST_PRIOR=丢弃 reason=${priorManifest.broken}`);
const priorEntries = priorManifest && priorManifest.entries ? priorManifest.entries : [];

/** 递归收集 src 文本文件 */
function walkSrc(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "static" || name === ".mimosa") continue;
      walkSrc(p, out);
    } else if (/\.(ts|vue|js|json|scss|css)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

/** raw 引用（任意上下文，一律保留）与 wrapped 引用（仅出现在 resolveMediaUrl 行内） */
const rawReferenced = new Set();
const wrappedReferenced = new Set();
const PATH_RE = /['"]\/?((?:[\w-]+\/)+[\w-]+\.(?:png|svg|jpg|jpeg|gif|webp))['"]/g;
for (const f of walkSrc(srcDir)) {
  const lines = readFileSync(f, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    // 先移除 resolveMediaUrl('...') 实参，剩下的路径字面量视为 raw
    const stripped = line.replace(/resolveMediaUrl\(\s*['"][^'"]*['"]\s*(?:,[^)]*)?\)/g, "");
    const isWrappedLine = /resolveMediaUrl\s*\(/.test(line);
    let m;
    PATH_RE.lastIndex = 0;
    while ((m = PATH_RE.exec(stripped)) !== null) rawReferenced.add(m[1]);
    if (isWrappedLine) {
      PATH_RE.lastIndex = 0;
      while ((m = PATH_RE.exec(line)) !== null) wrappedReferenced.add(m[1]);
    }
  }
}

/** 递归收集 dist/static 文件 */
function walkDist(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkDist(p, out);
    else out.push(p);
  }
  return out;
}

/** 清理范围：全部静态资产目录（tabbar/audio 另有硬保护） */
const PRUNE_ROOTS = [
  join(distStatic, "assets"),
  join(distStatic, "svg-spec"),
];
const NEVER_DELETE = [
  /icons\/tabbar\//, // wx.setTabBarItem 原生读取
  /\/audio\//, // 本地音频
  /default-avatar\.(jpg|png)/, // 头像兜底（SafeImage 同步路径）
  /app\.json|project\./, // 误配兜底
  // 注册页表单图标（2026-09-12）：IMAGE_PATHS.REGISTER_ICONS 为完整 /static 字面量
  // （path 字面量含 static/ 前缀，raw 后缀匹配不上），且设计上固定本地路径——
  // 表单关键图标不随 real 模式切后端基址，避免弱网下表单图标空白
  /icons\/register\//,
];

let removedBytes = 0;
let removedCount = 0;
let keptMissingOnBackend = 0;

/* 两趟：先只**算**要删哪些（不碰盘），再备份，最后才删。
   以前是一边遍历一边 unlinkSync ⇒ 想留一份"删之前长什么样"的凭据就没有位置了。 */
const toDelete = [];
for (const root of PRUNE_ROOTS) {
  if (!existsSync(root)) continue;
  for (const file of walkDist(root)) {
    const rel = file.slice(distStatic.length + 1).split(sep).join("/");
    if (NEVER_DELETE.some((re) => re.test(rel))) continue;
    // 联系表/预览图无论是否被引用都删（设计交付物，非运行时资产）
    const isPreviewSheet = /预览|联系表|preview/.test(file);
    // 计算各后缀是否命中引用集合
    const parts = rel.split("/");
    let rawHit = false;
    for (let i = 0; i < parts.length; i++) {
      const suffix = parts.slice(i).join("/");
      if (rawReferenced.has(suffix)) { rawHit = true; break; }
    }
    if (rawHit && !isPreviewSheet) continue; // raw 引用：保留
    // 无 raw 引用（仅 wrapped 或无引用）→ 检查后端是否已托管
    // 后端目录结构：uploads/app-assets/assets/images/...（即 dist static 相对路径原样映射）
    const backendFile = join(backendAssetsDir, rel);
    const backendOk = existsSync(backendFile);
    if (!backendOk && !isPreviewSheet) {
      keptMissingOnBackend++;
      continue; // 后端没有同路径文件 → 保守保留
    }
    toDelete.push({ file, rel });
  }
}

/* ── 桶放行兜底网：cdnPrefixes 命中但**仍在包里**的文件（prepare-static --real 已经"不复制"，
   这里负责"已经复制了/根本没跑过那一档"的两种形状）。扫描整棵 dist/static，
   不只 PRUNE_ROOTS —— static/generated/ 从来不在 PRUNE_ROOTS 里，这正是 6.29MB 一直出不了包的原因。 */
const alreadyQueued = new Set(toDelete.map((t) => t.file));
const cdnDeleted = [];
const cdnViolations = [];
const cdnMissing = [];
const cdnResidualProtected = [];
let cdnBucketResidual = 0;
if (buckets) {
  for (const file of walkDist(distStatic)) {
    const rel = file.slice(distStatic.length + 1).split(sep).join("/");
    const pkgPath = "static/" + rel;
    const bucket = bucketOf(pkgPath, buckets.cdnPrefixes);
    if (!bucket) continue;
    cdnBucketResidual++; // 出包后该为 0；非 0 就是"桶里还装着文件"
    const prot = protectedHit(pkgPath);
    if (prot || NEVER_DELETE.some((re) => re.test(rel))) {
      cdnResidualProtected.push({ pkgPath, why: prot || "NEVER_DELETE" });
      continue; // 首屏/本地必需：就算契约划进了桶也绝不出包
    }
    const backendFile = join(backendAssetsDir, rel);
    let backendBytes = null;
    try { backendBytes = statSync(backendFile).size; } catch { backendBytes = null; }
    if (backendBytes === null) { cdnMissing.push({ pkgPath, appAssetPath: rel, backendFile }); continue; }
    if (alreadyQueued.has(file)) { // 上一趟已经按 wrapped 引用把它排进删除了：换个 reason 记账，别重复计数
      const t = toDelete.find((x) => x.file === file);
      if (t) t.viaCdn = true;
    } else {
      toDelete.push({ file, rel, viaCdn: true });
    }
    const packageBytes = statSync(file).size;
    cdnDeleted.push({
      packagePath: pkgPath,
      appAssetPath: rel,
      packageBytes,
      backendBytes,
      bytesMatch: packageBytes === backendBytes,
    });
  }
  /* 缺资产 = 大声红（在备份与删除之前；一个文件都不动） */
  if (cdnMissing.length || cdnResidualProtected.length) {
    console.error(`${RK}=FAIL reason=${cdnMissing.length ? "cdn-backend-asset-missing" : "cdn-protected-asset-in-bucket"} contract=${buckets.path}@${buckets.sha8} dir=${distDir}`);
    for (const m of cdnMissing.slice(0, 40)) console.error(`CDN_BACKEND_MISSING ${m.pkgPath} ⇒ 期望 app-assets/${m.appAssetPath}（fs 探测 ${m.backendFile} 不存在）`);
    if (cdnMissing.length > 40) console.error(`CDN_BACKEND_MISSING …另 ${cdnMissing.length - 40} 个未逐条点名`);
    for (const v of cdnResidualProtected.slice(0, 20)) console.error(`CDN_PROTECTED_HIT ${v.pkgPath} ⇒ ${v.why}：首屏/本地必需素材绝不出包`);
    console.error(`${RK}=FAIL 桶指向后端没有的文件 ⇒ 按它放行就是静默丢图；本次不删任何文件`);
    process.exit(1);
  }
  console.log(`PRUNE_CDN=APPLIED contract=${buckets.path}@${buckets.sha8} 桶内仍在包=${cdnBucketResidual} 本步出包=${cdnDeleted.length} 字节=${cdnDeleted.reduce((a, e) => a + e.packageBytes, 0)} 记录里已出包=${(record && record.entries ? record.entries.length : 0)}`);
  for (const lp of buckets.localPrefixes) {
    const n = walkCount(distStatic, lp.slice("static/".length));
    console.log(`PRUNE_CDN_LOCAL ${lp} 包内文件=${n}${n === 0 ? " ⇒ 本地桶整目录空了，形状像误删（体积门会点名）" : ""}`);
  }
}

removedCount = toDelete.length;
for (const t of toDelete) removedBytes += statSync(t.file).size;

/* 备份：把待删文件按相对路径 cp -a 进 archive/prune-backup/<stamp>/。
   备份写不成功 ⇒ 一个都不删（"rm && mv 共享同一个 $?"那一类事故不在这里重演）。 */
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
const backupDir = join(clientDir, "archive", "prune-backup", `real-${stamp}`);
let backupOk = false;
if (removedCount > 0 && !dryRun) {
  try {
    mkdirSync(backupDir, { recursive: true });
    for (const t of toDelete) {
      const dst = join(backupDir, t.rel);
      mkdirSync(dirname(dst), { recursive: true });
      const r = spawnSync("cp", ["-a", t.file, dst], { stdio: ["ignore", "inherit", "inherit"] });
      if (r.status !== 0) throw new Error(`cp -a ${t.file} ${dst} exit=${r.status}`);
    }
    backupOk = true;
    console.log(`PRUNE_BACKUP=${backupDir} files=${removedCount} bytes=${removedBytes}`);
  } catch (e) {
    console.error(`PRUNE_BACKUP=FAILED err=${String(e && e.message).slice(0, 120)} ⇒ 没有备份就不许删：本次不剪任何文件`);
    console.log(`${RK}=NOT-EVIDENCED reason=backup-failed wouldRemove=${removedCount}`);
    process.exit(2);
  }
}

if (dryRun) {
  console.log(`PRUNE_DRY dist=${distDir} mode=${bandMode} wouldRemove=${removedCount} bytes=${removedBytes} kept(no backend copy)=${keptMissingOnBackend} 其中cdn放行=${cdnDeleted.length} 清单条目=${manifestEntries(cdnDeleted, record, priorEntries).length}`);
  for (const t of toDelete.slice(0, 20)) console.log(`  PRUNE_DRY_ITEM ${t.rel}${t.viaCdn ? " [cdn-bucket]" : ""}`);
  if (removedCount > 20) console.log(`  PRUNE_DRY_ITEM …另 ${removedCount - 20} 个未逐条点名`);
  console.log(`${RK}=DRY wouldRemove=${removedCount} bytes=${removedBytes}（没动盘、没写清单）`);
  process.exit(0);
}

if (removedCount > 0 && !backupOk) {
  console.log(`${RK}=NOT-EVIDENCED reason=backup-missing`);
  process.exit(2);
}

for (const t of toDelete) unlinkSync(t.file);

/* 删除清空目录（只在真删过之后）。桶根目录（static/generated/ 等）不在 PRUNE_ROOTS 里，
   出包后会把空壳留在产物里 —— 这里显式把它们也纳入清壳范围（只删空目录，不删文件）。 */
const emptyRoots = [...PRUNE_ROOTS];
if (buckets) {
  for (const c of buckets.cdnPrefixes) {
    const p = join(distStatic, c.slice("static/".length).replace(/\/$/, ""));
    if (!emptyRoots.includes(p)) emptyRoots.push(p);
  }
}
if (removedCount > 0) {
  for (const root of emptyRoots) {
    if (!existsSync(root)) continue;
    (function pruneEmpty(d) {
      let emptied = true;
      for (const name of readdirSync(d)) {
        const p = join(d, name);
        if (statSync(p).isDirectory()) { if (pruneEmpty(p)) continue; emptied = false; continue; }
        emptied = false;
      }
      if (emptied && readdirSync(d).length === 0) { rmdirSync(d); return true; }
      return false;
    })(root);
  }
}

/* ── 机器可读清单：落进**产物目录**，随包走（LOOPBACK_WAIVER.json 同一先例）
   它回答的是"这个文件为什么不在包里"⇒ 指向 app-assets 端点，而不是让人猜体积是怎么下来的。 */
const manifestPath = join(distDir, MANIFEST_NAME);
let manifestWritten = null;
if (buckets) {
  const entries = manifestEntries(cdnDeleted, record, priorEntries);
  const apiRoot = apiRootFromEnv(envJsSrc);
  const doc = {
    schema: "mp-cdn-offload-manifest/v1",
    writtenBy: "apps/client/scripts/prune-unreferenced-static.mjs",
    at: new Date().toISOString(),
    band: bandMode,
    dist: distDir,
    contract: { path: buckets.path, sha8: buckets.sha8, schema: BUCKET_SCHEMA },
    cdnPrefixes: buckets.cdnPrefixes,
    localPrefixes: buckets.localPrefixes,
    appAssetEndpoint: APP_ASSET_ENDPOINT,
    apiRoot,
    howToResolve: "GET {apiRoot}{appAssetEndpoint}{appAssetPath}",
    resolvedUrlExample: entries.length ? `${apiRoot}${APP_ASSET_ENDPOINT}${entries[0].appAssetPath}` : "(本清单无条目)",
    offloadReason: "cdn-bucket（契约把这些前缀划给后端 app-assets ⇒ 包内不携带，运行时 media.ts 的 cdnize() 走 HTTP）",
    probe: "fs：apps/api/uploads/app-assets/<appAssetPath> 存在（本清单不证明 HTTP 200，只证明盘上有同名文件；匿名 GET 200 由 scripts/qa/verify-app-assets-coverage.mjs 量）",
    totals: { files: entries.length, packageBytes: entries.reduce((a, e) => a + (e.packageBytes || 0), 0) },
    entries,
  };
  try {
    writeFileSync(manifestPath, JSON.stringify(doc, null, 2) + "\n", "utf-8");
    manifestWritten = manifestPath;
    console.log(`CDN_MANIFEST=${manifestPath} files=${doc.totals.files} packageBytes=${doc.totals.packageBytes} contractSha8=${buckets.sha8} apiRoot=${apiRoot || "(产物 env 无 VITE_API_BASE_URL)"}`);
  } catch (e) {
    console.error(`${RK}=FAIL reason=manifest-unwritable err=${String(e && e.message).slice(0, 140)}`);
    console.error(`${RK}=FAIL hint=文件已经出包却没有清单解释 = 「体积靠删图下来」的形状复发；宁可判红`);
    process.exit(1);
  }
}

console.log(`[prune-static] dist=${distDir} band=${bandMode} removed ${removedCount} files, ${(removedBytes / 1024).toFixed(0)}KB, kept(no backend copy): ${keptMissingOnBackend}`);
console.log(`${RK}=PASS removed=${removedCount} bytes=${removedBytes} keptMissingOnBackend=${keptMissingOnBackend} backup=${backupOk ? backupDir : "none(无物可删)"} dir=${distDir}${buckets ? ` cdnRemoved=${cdnDeleted.length} manifest=${manifestWritten || "(未写)"}` : " cdn=off"}`);
