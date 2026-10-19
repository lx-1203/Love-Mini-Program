/**
 * verify-package-size.mjs — mp-weixin 构建产物体积验收（2026-08-10 包体积优化门禁）。
 *
 * 断言：
 *  1. 主包（app.json 根目录非分包部分）≤ 2MB（微信主包上限）
 *  2. 总包 ≤ 10MB（预留余量，微信总包 20MB 上限）
 *  3. 产物无 .mp4（登录视频已移除）
 *  4. 产物 JS 无 en-US 英文文案与 mock 数据关键字（桩化生效）
 *
 * 用法：node scripts/verify-package-size.mjs [dist 路径] [--allow-mock]
 *
 * --allow-mock：dev 构建专用。dev 构建不执行 strip-mock 桩化（mock 数据合法携带），
 * 因此跳过 MOCK_DATA_VALUE_RE 检查；且 dev 构建经 prepare-static --dev 恢复 7.7MB
 * 本地装饰图（mock 模式无后端，图片需随包携带），主包必然超过微信 2MB 上限——
 * 这是开发调试形态，不代表发布形态，故主包断言降级为警告；总包与 en-US 检查仍严格。
 * 发布形态（real 档）由本门按**同一组阈值**判主包 ≤2MB：它量的对象是
 * `build:mp-weixin:real`（= release-chain：prepare-static --real 按 CDN 桶契约"不复制进包"
 * → uni build → prune 兜底出包 + 落 CDN_OFFLOAD_MANIFEST.json）之后的产物。
 * 措辞口径（本仓登记的"同一输出两头打脸"这条的修法，只改话术、不动阈值与退出码）：
 *   · 阈值 2.00MB/10MB 与退出码在任何档位都不变；
 *   · 档位不是 real、或没走 release-chain ⇒ 这组数字**不能**被引用为"发布形态达标"；
 *   · real 档里 CDN 桶出包必须有清单解释（见 PACKAGE_SIZE_CDN 行）——
 *     体积下来但不说清"哪些文件为什么不进了"，本门按不成立处理，不接受"反正数字小了"。
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const allowMock = args.includes("--allow-mock");
/* 位置参数取"第一个不带 -- 的"，而不是死认 args[0] —— 本门现在多了 --buckets 旗标，
   写死 args[0] 会让"旗标在前、目录在后"的调用把 "--buckets" 当目录名去拼 app.json。 */
const distRoot = resolve(
  args.find((a) => !a.startsWith("--")) ||
    join(__dirname, "../apps/client/dist/build/mp-weixin")
);
const clientDir = join(__dirname, "../apps/client");
const BUCKETS_PATH = (() => {
  const i = args.indexOf("--buckets");
  return i >= 0 && args[i + 1] && !String(args[i + 1]).startsWith("--") ? resolve(args[i + 1]) : join(clientDir, "config/cdn-buckets.json");
})();

if (!existsSync(distRoot)) {
  console.error(`[verify-size] 构建产物不存在: ${distRoot}`);
  process.exit(1);
}

const MAIN_PACKAGE_LIMIT = 2 * 1024 * 1024; // 2MB
const TOTAL_LIMIT = 10 * 1024 * 1024; // 10MB

/** 递归统计目录大小（字节），返回 { bytes, files } */
function dirSize(dir) {
  const out = { bytes: 0, files: [] };
  const entries = (() => {
    try {
      return readdirRecursive(dir);
    } catch {
      return [];
    }
  })();
  for (const f of entries) {
    const st = statSync(f);
    out.bytes += st.size;
    out.files.push(f);
  }
  return out;
}

function readdirRecursive(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) readdirRecursive(full, acc);
    else acc.push(full);
  }
  return acc;
}

// 解析分包边界
const appJsonPath = join(distRoot, "app.json");
if (!existsSync(appJsonPath)) {
  console.error(`[verify-size] 缺少 app.json: ${appJsonPath}`);
  process.exit(1);
}
const appJson = JSON.parse(readFileSync(appJsonPath, "utf-8"));

const subPackageRoots = new Set((appJson.subPackages || []).map((p) => p.root));
const subBytes = {};

// 统计各分包体积
for (const root of subPackageRoots) {
  const full = join(distRoot, root);
  subBytes[root] = existsSync(full) ? dirSize(full).bytes : 0;
}

// 主包体积 = 总 - 分包
const totalBytes = dirSize(distRoot).bytes;
const subTotal = Object.values(subBytes).reduce((a, b) => a + b, 0);
const mainBytes = totalBytes - subTotal;

const mb = (b) => `${(b / 1024 / 1024).toFixed(2)}MB`;

const failures = [];
/* 口径必须跟着数字一起印（用户裁定册第 23 项）：同一个"主包"在三个被测物下有六个数量级差距
   （实测：发布形态 1762.7KB / src 退化扫描 2.76MB / 本门默认被测物即 mock 档 27.78MB）。
   只印一个数就是让人在三个口径之间猜，而猜错的方向是"以为达标了"。
   这里只**加标注**，不改任何阈值、判定或退出码。 */
const bandMode = (() => {
  try {
    const env = readFileSync(join(distRoot, "config/env.js"), "utf8");
    const pick = (k) => (new RegExp(k + ':\\s*"?([^",\\n]+)"?').exec(env) || [, "?"])[1].trim();
    return `MODE:${pick("MODE")} API:${pick("VITE_API_MODE")}` +
      (/VITE_SHOWCASE_MODE:\s*"?true"?/.test(env) ? " SHOWCASE:on" : " SHOWCASE:off");
  } catch { return "MODE:未知（读不到 config/env.js）"; }
})();
let waivedMainOver = false;
console.log("[verify-size] ===== mp-weixin 包体积验收 =====");
console.log(`  被测物: ${distRoot}`);
console.log(`PACKAGE_SIZE_BAND=${bandMode}`);
// 这句说明原先是常量，real 档也照印"不是发布形态"，与 :16「发布形态由 real 构建执行严格 ≤2MB 门禁」互相打脸。
// 现在按档位条件化：real 档说"我是发布形态门禁的调用对象（并按 CDN 清单核算）"，
// 其它档说"以上数字只代表上面那个档"。阈值、判定、退出码一字未动。
const bandNote = bandMode.startsWith("MODE:未知")
  ? "← 档位未知（读不到 config/env.js）⇒ 以下数字不能作为任何口径的达标依据"
  : /MODE:real\b/.test(bandMode)
    ? "← 本档是发布形态门禁的调用对象；只有走 build:mp-weixin:real（含 prepare-static --real 与 prune）出的档才是发布形态，这份 prune 过没有本门不判；CDN 桶出包的核算见下面 PACKAGE_SIZE_CDN 行"
    : "← 以上数字只代表上面那个档，不是发布形态";
console.log(`  主包: ${mb(mainBytes)}  (上限 ${mb(MAIN_PACKAGE_LIMIT)})  ${bandNote}`);
console.log(`  总包: ${mb(totalBytes)}  (上限 ${mb(TOTAL_LIMIT)})`);
for (const [root, bytes] of Object.entries(subBytes)) {
  console.log(`  分包 ${root}: ${mb(bytes)}`);
}
/* 全量文件名单提前取一次：CDN 核算与后面的 mp4/en-US 检查用的是同一棵树（口径不许两头各算各的） */
const allFiles = readdirRecursive(distRoot);
const relativeOf = (f) => f.slice(distRoot.length + 1);

/* ── CDN 桶核算（只在 real 档生效；--allow-mock 与非 real 档一个字节都不判 ⇒ mock/dev/showcase 零影响）
   判的是"体积下来的方式说不说得清"，不是"数字够不够小"：
     1) 契约非法 ⇒ 不成立；2) 桶里还剩文件没出包 ⇒ 契约没被执行；
     3) 桶空了却没有清单 ⇒ 无法区分"放行"与"图被删了"（本仓 96d4c172/aa6c4708 两轮事故的形状）；
     4) 清单把首屏/本地必需素材（tabbar/register 图标、audio、default-avatar、profile 皮肤、
        localPrefixes）列为出包 ⇒ 误删包内素材，直接红；
     5) 清单条目在后端 app-assets 已不存在 ⇒ 运行时那张图必然 404。 */
const isRealBand = /MODE:real\b/.test(bandMode) && !allowMock;
const CDN = (() => {
  const PROTECTED_PREFIXES = ["static/assets/icons/tabbar/", "static/assets/icons/register/", "static/assets/profile/"];
  const PROTECTED_RE = [/\/audio\//, /default-avatar\.(jpg|png|svg)$/i];
  const norm = (p) => String(p || "").replace(/^\/+/, "").replace(/\\/g, "/");
  const isProtected = (p) => PROTECTED_PREFIXES.some((x) => p.startsWith(x)) || PROTECTED_RE.some((re) => re.test(p));
  const out = { applied: false, problems: [], notes: [] };
  if (!existsSync(BUCKETS_PATH)) {
    if (isRealBand) out.notes.push(`PACKAGE_SIZE_CDN=ABSENT path=${BUCKETS_PATH} ⇒ 没有契约就没有放行，主包按 src 全量核算`);
    return out;
  }
  let doc = null, raw = "";
  try { raw = readFileSync(BUCKETS_PATH, "utf8"); doc = JSON.parse(raw); }
  catch (e) { if (isRealBand) out.problems.push(`契约读不动/非法 JSON（${BUCKETS_PATH}）：${String(e.message).slice(0, 100)}`); return out; }
  const bad = [];
  if (doc.schema !== "mp-cdn-buckets/v1") bad.push(`schema=${JSON.stringify(doc.schema)}（应为 mp-cdn-buckets/v1）`);
  const cdn = Array.isArray(doc.cdnPrefixes) ? doc.cdnPrefixes.map(norm) : (bad.push("cdnPrefixes 缺失"), []);
  const local = Array.isArray(doc.localPrefixes) ? doc.localPrefixes.map(norm) : (bad.push("localPrefixes 缺失"), []);
  for (const c of cdn) if (!c.startsWith("static/") || !c.endsWith("/") || c === "static/") bad.push(`cdnPrefixes 口径非法：${JSON.stringify(c)}`);
  for (const l of local) if (!l.startsWith("static/") || !l.endsWith("/")) bad.push(`localPrefixes 口径非法：${JSON.stringify(l)}`);
  for (const c of cdn) for (const l of local) if (c.startsWith(l) || l.startsWith(c)) bad.push(`cdn/local 覆盖同一目录：${c} ∩ ${l}`);
  for (const c of cdn) for (const p of PROTECTED_PREFIXES) if (p.startsWith(c) || c.startsWith(p)) bad.push(`cdn 桶覆盖首屏必需前缀：${c} ⊇ ${p}`);
  out.applied = isRealBand;
  if (bad.length) { out.problems.push(...bad); return out; }
  out.sha8 = createHash("sha256").update(raw).digest("hex").slice(0, 8);
  out.cdn = cdn; out.local = local;

  const files = allFiles.map((f) => norm(relativeOf(f)));
  const bytesOf = (f) => statSync(f).size;
  // 桶内残留（还在包里 = 契约没被执行）
  const residual = [];
  let residualBytes = 0;
  for (const f of allFiles) {
    const p = norm(relativeOf(f));
    const c = cdn.find((x) => p.startsWith(x));
    if (!c || isProtected(p)) continue;
    residual.push(p); residualBytes += bytesOf(f);
  }
  out.residual = residual.length; out.residualBytes = residualBytes;
  // 本地桶读数（首屏/图标不许被顺手带走）
  out.localCounts = local.map((l) => ({ prefix: l, files: files.filter((p) => p.startsWith(l)).length }));
  // 清单
  const manifestPath = join(distRoot, "CDN_OFFLOAD_MANIFEST.json");
  if (!existsSync(manifestPath)) {
    out.manifest = null;
    if (residual.length === 0) {
      out.problems.push(`cdn 桶内一个文件都没有，但产物里没有 CDN_OFFLOAD_MANIFEST.json ⇒ 说不清"这些文件为什么不在包里"`);
      out.problems.push(`这正是"体积绿了因为图被删了"的形状（本仓 96d4c172 删掉 350 个在用素材 / aa6c4708 让裁剪不再删图标后 1.73MB 变 12.19MB 的因果）：没有清单，本门不接受"数字小了"作为达标依据`);
    } else {
      out.problems.push(`cdn 桶仍有 ${residual.length} 个文件（${(residualBytes / 1024).toFixed(0)}KB）装在主包里，且没有清单：契约未被执行`);
    }
    return out;
  }
  let mf = null;
  try { mf = JSON.parse(readFileSync(manifestPath, "utf8")); } catch (e) { out.problems.push(`CDN_OFFLOAD_MANIFEST.json 解析失败：${String(e.message).slice(0, 100)}`); return out; }
  if (mf.schema !== "mp-cdn-offload-manifest/v1") out.problems.push(`清单 schema=${JSON.stringify(mf.schema)}（应为 mp-cdn-offload-manifest/v1）`);
  if (mf.contract && mf.contract.sha8 && out.sha8 && mf.contract.sha8 !== out.sha8) {
    out.problems.push(`清单按契约 ${mf.contract.sha8} 出包，当前契约是 ${out.sha8} ⇒ 口径漂移，这份清单解释的不是这一份包`);
  }
  const entries = Array.isArray(mf.entries) ? mf.entries : [];
  out.entries = entries.length;
  out.manifestBand = mf.band || "(未记)";
  out.manifestAt = mf.at || "(未记)";
  out.manifestFor = mf.dist || "(未记)";
  out.offloadBytes = entries.reduce((a, e) => a + (Number(e.packageBytes) || 0), 0);
  const endpoint = mf.appAssetEndpoint || "/api/v1/media/app-assets/";
  const protectedLeak = entries.filter((e) => isProtected(norm(e.packagePath)));
  if (protectedLeak.length) {
    out.problems.push(`清单把 ${protectedLeak.length} 个首屏/本地必需素材列为出包（误删包内素材）：${protectedLeak.slice(0, 5).map((e) => e.packagePath).join(" ")}`);
  }
  const localLeak = entries.filter((e) => local.some((l) => norm(e.packagePath).startsWith(l)));
  if (localLeak.length) out.problems.push(`清单把 ${localLeak.length} 个 localPrefixes 文件列为出包：${localLeak.slice(0, 5).map((e) => e.packagePath).join(" ")}`);
  if (residual.length) {
    out.problems.push(`cdn 桶仍有 ${residual.length} 个文件（${(residualBytes / 1024).toFixed(0)}KB）没出包，最大几个：${residual.slice(0, 5).join(" ")}`);
  }
  // 清单指向的后端文件必须还在盘上（fs 探测；匿名 GET 200 由 verify-app-assets-coverage 量）
  const backendRoot = resolve(__dirname, "../apps/api/uploads/app-assets");
  const gone = entries.filter((e) => !e.appAssetPath || !existsSync(join(backendRoot, String(e.appAssetPath).replace(/^\/+/, ""))));
  if (gone.length) {
    out.problems.push(`清单里 ${gone.length} 个文件在 apps/api/uploads/app-assets 下已不存在 ⇒ 运行时 ${endpoint}<rel> 必 404：${gone.slice(0, 5).map((e) => e.packagePath).join(" ")}`);
  }
  for (const lc of out.localCounts) {
    if (lc.files === 0 && entries.length > 0) {
      out.notes.push(`PACKAGE_SIZE_LOCAL_WARN ${lc.prefix} 包内 0 个文件，而本清单确有放行条目 ⇒ 本地桶空了，人工看一眼是不是误删（本条只警告：真正判红的是"清单把本地必需素材列为出包"）`);
    }
  }
  return out;
})();

if (isRealBand) {
  for (const n of CDN.notes) console.log(`  ${n}`);
  console.log(`  PACKAGE_SIZE_CDN contract=${existsSync(BUCKETS_PATH) ? CDN.sha8 || "非法" : "(无契约)"} 清单条目=${CDN.entries ?? "-"} 出包字节=${CDN.offloadBytes ? mb(CDN.offloadBytes) : "-"} 桶内残留=${CDN.residual ?? "-"} 本地桶读数=${(CDN.localCounts || []).map((l) => `${l.prefix}=${l.files}`).join(" ") || "-"}`);
  if (CDN.entries != null) console.log(`  PACKAGE_SIZE_CDN_MANIFEST band=${CDN.manifestBand} 为哪一档=${CDN.manifestFor} 落盘于=${CDN.manifestAt} ⇒ 清单是别的档/别的时间落的，本门只按"条目能被盘上事实复核"给绿`);
  if (CDN.offloadBytes) {
    console.log(`  口径说明：主包 ${mb(mainBytes)} 是**清单外**的实测字节；把清单里 ${(CDN.offloadBytes / 1024 / 1024).toFixed(2)}MB 按"仍随包"计则为 ${mb(mainBytes + CDN.offloadBytes)}（微信量的是包内字节，两种口径不许混用）`);
  }
  for (const p of CDN.problems) failures.push(`CDN 放行不成立：${p}`);
}

if (mainBytes > MAIN_PACKAGE_LIMIT) {
  if (allowMock) {
    waivedMainOver = true;
    console.warn(`  ⚠ 主包 ${mb(mainBytes)} 超过微信主包上限 ${mb(MAIN_PACKAGE_LIMIT)}（dev 构建豁免：携带 mock 数据与本地装饰图；发布形态由 real 构建严格门禁）`);
  } else {
    failures.push(`主包 ${mb(mainBytes)} 超过微信主包上限 ${mb(MAIN_PACKAGE_LIMIT)}`);
  }
}
if (totalBytes > TOTAL_LIMIT) {
  if (allowMock) {
    console.warn(`  ⚠ 总包 ${mb(totalBytes)} 超过 ${mb(TOTAL_LIMIT)}（dev 构建豁免：携带 mock 数据、本地装饰图与 profile PNG 皮肤；发布形态由 real 构建严格门禁）`);
  } else {
    failures.push(`总包 ${mb(totalBytes)} 超过 ${mb(TOTAL_LIMIT)}`);
  }
}

// 无 mp4
const mp4s = allFiles.filter((f) => f.toLowerCase().endsWith(".mp4"));
if (mp4s.length > 0) {
  failures.push(`产物仍含 ${mp4s.length} 个 mp4（登录视频未移除）: ${mp4s[0]}`);
}

// 桩化生效检查：
// - en-US：检测 en-US.ts 特有完整文案（桩化后 export default {}，这些句子不应出现；
//   通用短词如 "Confirm"/"Retry" 可能来自其他运行时代码，不作为依据）
// - mock：检测 mock-data 产物文件中数据值是否已桩化为 null
//   （变量名保留是预期的——桩文件需保持导出名；session/messages 等 store 内联
//   mock 分支属运行时 useMock() 判定代码，不在桩化范围，不检测）
const jsFiles = allFiles.filter((f) => f.endsWith(".js"));
let enLeak = 0;
let mockLeak = 0;
const EN_MARKERS = [
  "Operation succeeded",
  "Please add at least one time window",
  "It's a match! Say hi",
  "Weekly schedule enabled",
  "No call history",
];
const MOCK_DATA_VALUE_RE = /mock\w+=(\[|\{|")/; // mock 数据为数组/对象/字符串 = 未桩化
for (const f of jsFiles) {
  if (statSync(f).size > 5 * 1024 * 1024) continue; // 跳过超大大文件
  let content = "";
  try {
    content = readFileSync(f, "utf-8");
  } catch {
    continue;
  }
  for (const marker of EN_MARKERS) {
    if (content.includes(marker)) {
      enLeak++;
      break;
    }
  }
  // 仅检查 mock-data 产物文件（路径含 mock-data）
  if (/mock-data\.js$/.test(f) && MOCK_DATA_VALUE_RE.test(content)) {
    mockLeak++;
  }
}
if (enLeak > 0) failures.push(`en-US 特有文案仍出现在 ${enLeak} 个 JS 产物中（桩化未生效）`);
if (!allowMock && mockLeak > 0) {
  failures.push(`mock 数据值仍出现在 ${mockLeak} 个 mock-data 产物中（桩化未生效）`);
}
if (allowMock) {
  console.log("[verify-size] --allow-mock：跳过 mock 数据桩化检查（dev 构建合法携带 mock 数据）");
}

if (failures.length > 0) {
  console.error("[verify-size] ✗ 验收失败:");
  for (const f of failures) console.error(`  - ${f}`);
  /* 三态机器行（decisions #10 结尾提的那条，用户 2026-10-01 授权落地）：
     原来失败只印 ✗、豁免印 ✓，同一次运行能同时出现"⚠ 超限"和"✓ 合规"——判读只能认这条具名行。 */
  console.log("PACKAGE_SIZE_RESULT=FAIL（有硬性违例，见上面 ✗ 列表）");
  process.exit(1);
}
/* 原来这里无条件印「✓ 验收通过：主包/总包体积合规」——而上面刚刚 warn 过"主包超上限（豁免）"，
   两条自相矛盾的话出自同一次运行（用户裁定册第 22 项的第二条也点了这个命名）。
   退出码一字不动（豁免路仍 0，否则 mock 构建链会断），只把话说明白：
   带豁免通过 ≠ 合规。判读要认 PACKAGE_SIZE_RESULT / PACKAGE_SIZE_WAIVED 这行与 ⚠，不要认那句 ✓。 */
if (waivedMainOver) {
  console.log("[verify-size] ⚠ 带豁免通过：主包超上限被 --allow-mock 豁免，本条**不是**「体积合规」");
  console.log("PACKAGE_SIZE_WAIVED=main_over_limit（发布形态需另跑 build:mp-weixin:real 严格门禁）");
  console.log("PACKAGE_SIZE_RESULT=WAIVED_MOCK（其余检查通过，但主包超限被豁免 ⇒ 不得引用本条作为「体积达标」的依据）");
} else {
  console.log("[verify-size] ✓ 验收通过：主包/总包体积合规，无 mp4，mock/en-US 已剔除");
  console.log(`PACKAGE_SIZE_RESULT=PASS（被测物档位见上面的 PACKAGE_SIZE_BAND，只指那一档）`);
}
