#!/usr/bin/env node
/**
 * verify-app-assets-coverage.mjs — 「cdn 桶里每一张图，后端那一份必须是同字节的同一张」（R6/L03，2026-10-19）。
 *
 * 为什么还要再立一把（不是重复 verify-package-size 的 CDN 核算、也不是重复 L01 的人工实测）：
 *  体积门（scripts/verify-package-size.mjs:220）只按 fs 判「清单指着的文件在 apps/api/uploads/app-assets
 *  下还在不在」，它自己的 probe 字段就写了「本清单不证明 HTTP 200，匿名 GET 200 由本门量」；
 *  而运行时 media.ts/config/images.ts 是把 cdnPrefixes 命中项解析成
 *  `GET {apiRoot}/api/v1/media/app-assets/{去掉 static/ 前缀的 rel}` 交给 <image> 的。
 *  两侧判据的交集正好是空的：盘上有同名文件 ≠ 匿名 GET 200（real profile 还要 media_asset 注册且
 *  audit_status=approved，未注册/被驳回一律 404 —— 见 MediaAccessController#getAppAsset），
 *  200 也不等于画面一致（L01 实测 covers 有 6 张后端是旧版、包内是压缩后版本，sha256 已证）。
 *  于是存在一条谁都不红的失败路径：**图不 404，但画面漂**。这张图用户看得见，门却是绿的。
 *
 * 五条判据（每条都有机器可读行，前缀 ASSETCOV_）：
 *   ① 覆盖：对契约 cdnPrefixes 的每个前缀，枚举 apps/client/src/static 下该桶的**全部**真实文件
 *      （不抽样、不用 glob —— 本仓大目录 `**` 会静默零命中），逐个匿名 GET，必须 200。
 *      缺 ⇒ ASSETCOV_MISSING 逐条点名 rel，exit 1。
 *   ② 同字节：每个 200 的响应体 sha256 必须等于本地同名文件 sha256。
 *      不等 ⇒ 单独一桶 ASSETCOV_DRIFT（画面漂移，与 404 是两种病，分桶才不会被"缺 X 张"掩盖），exit 1。
 *      分母逐桶打印：不接受"0 个问题"被读成"没测"。
 *   ③ 反向守恒：localPrefixes（icons / svg-spec）是包内素材，后端**不该**成为它们的来源。
 *      real 产物里若存在指向它们的 app-assets http 引用 ⇒ ASSETCOV_REVERSE=FAIL，exit 1；
 *      产物目录不存在/档位不是 real/一个文本件都没扫到 ⇒ ASSETCOV_REVERSE=NOT-EVIDENCED，exit 2（量不到 ≠ 达标，不当绿）。
 *   ④ 空集不许绿：任何一桶枚举到 0 个文件（目录空或目录不存在）⇒ 判红；
 *      契约里 cdnPrefixes/localPrefixes 缺字段或空数组 ⇒ 前置失败 exit 2。
 *   ⑤ 输入树一致性（备份桶 vs 包内，纯 fs）：见 sourceCheck()。
 *      ①②③④⑤ 在 --source-only 下照做，只有①②的"探针"从匿名 GET 换成盘上解析
 *      （②的同字节判定属于 http 轴，source 轴不做，也不冒充做了）。
 *
 * 用法：node scripts/qa/verify-app-assets-coverage.mjs
 *         [--buckets apps/client/config/cdn-buckets.json] [--static apps/client/src]
 *         [--base http://127.0.0.1:8080/api/v1/media/app-assets/] [--dist apps/client/dist/build/mp-weixin]
 *         [--concurrency 8] [--timeout-ms 15000] [--selftest]
 *       必须 Node >= 20（裸 node 是微信自带 v16，没有全局 fetch ⇒ 本门自己会大声 exit 2，不给假绿）。
 *
 * ── 两个探针轴（同一批桶、同一批引用，两种问法）───────────────────────────────────────
 *   档=http（缺省）：逐件匿名 GET，问"后端取不取到、字节对不对"。要有后端才能跑。
 *   档=source（--source-only）：逐件在**盘上**解析，问"这条引用背后有没有文件"。不要后端、
 *     不连网络 ⇒ 能进 real 发布链（apps/client/scripts/release-chain.mjs）与 CI。
 *     它补的是发布链上那一格：apps/client/scripts/prune-unreferenced-static.mjs:479 自己写着
 *     「本清单不证明 HTTP 200，只证明盘上有同名文件；匿名 GET 200 由本门量」，而本门以前只有
 *     http 轴 ⇒ 没有后端时这句话没人接，real 产物里一条 /api-assets/… 引用悬空也不会在构建期红
 *     （空白图标族，本仓已被烧过两次：96d4c172 删掉 350 个在用素材 / aa6c4708 1.73MB 假达标）。
 *
 *   source 轴绝不冒充 http 轴（判据边界写在读数里，不靠人记）：
 *     · 输出行不出现 "200" / "可达" / "served"；判决行明写 `档=source 盘上=<n> 缺件=<n>`，
 *       http 轴同一行明写 `档=http`，两者一眼可分。
 *     · `--source-only` 与 `--base` 互斥（任一方向都 exit 2）：混着传就会产出一个看着像 http 轴
 *       读数的杂交判决，本仓不要这种数。
 *     · PROBE_READY（fetch / AbortSignal.timeout）只闸 http 轴：source 轴一个网络调用都没有，
 *       在老 node 上也必须能跑；但老 node 跑缺省 http 档仍按原样 exit 2。
 *     · 盘上根里有件 ≠ 匿名 GET 200：real profile 还要 media_asset 注册 + audit_status=approved
 *       （MediaAccessController#getAppAsset），注册对账是 scripts/qa/verify-asset-registry.mjs 的判域。
 *
 * 退出码：0 = 该轴的判据全过；1 = 有硬缺陷（缺 / 漂 / 缺件 / 反向泄漏 / 空集）；2 = 前置件读不到
 *         或探针不可用（"量不到"和"没问题"绝不共用一个输出，本仓铁律）。
 * 只读：不改任何仓内文件、不取模拟器租约、不写权威判决件；--selftest 只在 tmp/qa/fixtures/assetcov/ 下
 *       造夹具并自行清理（该目录永不入库）。
 */
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname, sep, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i >= 0 && argv[i + 1] !== undefined && !String(argv[i + 1]).startsWith("--") ? argv[i + 1] : d;
};

/* ── 探针可用性前置闸：老 node / 无 fetch 时必须 exit 2，不能"跑不起来所以 0 问题" ───────────
   只闸 http 轴：--source-only 一个 fetch 都不发（老 node v16 也能跑盘上对账），拿它去闸
   source 轴等于把一把能量到的门焊死在"环境不许"上。http 轴在老 node 上的 exit 2 一字未改。 */
const PROBE_READY = typeof fetch === "function" && typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function";

/* 拼错的旗标会被 arg() 当成"没传"而静默回落默认路径 —— 那正好制造"按 mock 产物判 real 守恒"这种
   看起来像绿的假读数。宁可 exit 2。
   source-only = 换探针轴（盘上）；uploads = 盘上主根覆盖（与 scripts/qa/verify-asset-registry.mjs
   的 --uploads 同一旗标名，别再造第二个名字）。 */
const KNOWN_FLAGS = ["buckets", "static", "base", "dist", "concurrency", "timeout-ms", "backup", "selftest", "source-only", "uploads"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN_FLAGS.includes(a.slice(2)));
  if (bad.length) {
    console.log(`ASSETCOV_RESULT=ERROR reason=未知旗标 ${bad.join(",")} ⇒ 本门只认 ${KNOWN_FLAGS.join(",")}（被忽略的旗标会让被测物静默换成默认路径）`);
    process.exit(2);
  }
}
const SOURCE_ONLY = has("source-only");
/* 轴互斥（任一方向都拒）：--base 是 http 轴的坐标，和 --source-only 同时给就说明传参的人
   以为盘上解析会顺便验一遍 HTTP —— 它不会。拒掉比产出一个"长得像 http 轴"的杂交读数诚实。 */
if (SOURCE_ONLY && argv.includes("--base")) {
  console.log(`ASSETCOV_RESULT=ERROR reason=旗标冲突 --source-only 与 --base 互斥（盘上轴不发任何 HTTP 请求，给它端点也量不到 200；两轴要么各跑一发，要么别跑）`);
  process.exit(2);
}
if (!SOURCE_ONLY && !PROBE_READY) {
  console.log(`ASSETCOV_RESULT=ERROR reason=探针不可用（node=${process.version} 缺 fetch/AbortSignal.timeout）⇒ 一个字节都没量到，不得当成达标`);
  process.exit(2);
}

/* ── 小工具 ─────────────────────────────────────────────────────────────────────────────── */
const norm = (p) => String(p || "").replace(/^\/+/, "").replace(/\\/g, "/");
const sha8 = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 8);
/* 比对用哈希：文本型素材（svg 等）先把 CRLF 归一成 LF 再算，二进制（png/jpg/webp/gif）按字节全等。
   为什么必须分：本机 core.autocrlf=true，同一份 svg 在"包内工作树 / uploads / 备份桶"三处
   可能分别是 CRLF 与 LF（实测 heart-gradient.svg 盘上 508 / git HEAD 501 / 备份桶 501），
   纯字节比会把**行尾差异报成画面漂移**——2026-10-24 就被这样虚报过 6 个 SVG，
   而真正的 6 张封面内容漂移混在里面，两者读数相同、修法完全相反，一度把归因带偏。
   归一行尾不等于放宽：内容改一个字节照样不同哈希（见 --selftest 开头的两侧对照）。 */
const TEXT_EXT = /\.(svg|js|cjs|mjs|ts|css|scss|json|html|txt|md)$/i;
const cmpHash = (buf, name) => {
  if (!TEXT_EXT.test(String(name))) return sha8(buf);
  const s = buf.toString("binary").replace(/\r\n/g, "\n");
  return sha8(Buffer.from(s, "binary"));
};
const readJsonSafe = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };

/** 递归列出目录下全部真实文件（不用 glob/find：本仓大目录 `**` 会静默零命中）。返回 win 安全排序的绝对路径。 */
function walkFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let ents;
    try { ents = readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const full = join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) out.push(full);
    }
  }
  return out.sort();
}

/**
 * 输入树一致性（P0 的验证判据）。sync 读的是备份桶，而这把门以前只比"包内 vs HTTP"，
 * 于是 assets-images 桶里躺 292K 未压缩原图、包内是 45K 压缩版这件事在门上完全隐形——
 * 它能活过一整轮素材统一就是因为这个。这里把桶本身当被测物：
 * 桶里每一个"存在的"件必须与包内同哈希（文本型先按 cmpHash 同一把尺归一行尾）。
 *
 * 包内有、桶里没有 ⇒ 只报不红：备份树本就只跟踪一部分（实测 1345 件里 git 只存 490 件），
 * 判红等于逼人在仓里补副本，那是为了喂饱判据而改产物。
 */
const SRC_BUCKETS = [["full-static", ""], ["generated", "generated"], ["assets-images", "assets/images"]];
function sourceCheck(cfg, say, unmeasured) {
  const hard = [];
  let cmp = 0, same = 0, eolOnly = 0, drift = 0, ghost = 0;
  if (!existsSync(cfg.backupRoot)) {
    say(`ASSETCOV_SOURCE=NOT-EVIDENCED 备份根=${norm(cfg.backupRoot)} 不存在 ⇒ 桶与包内的一致性一个字节都没比，不许当达标`);
    unmeasured.push("输入树未测量（备份根不存在）");
    return { hard, skipped: true, cmp: 0, eolOnly: 0 };
  }
  for (const [bucket, sub] of SRC_BUCKETS) {
    const dir = join(cfg.backupRoot, bucket);
    if (!existsSync(dir)) {
      hard.push(`${bucket} 桶目录不存在`);
      say(`ASSETCOV_SRC bucket=${bucket} 目录=${norm(dir)} 存在=否 ⇒ sync 的输入这一路整个没了，判红`);
      continue;
    }
    const files = walkFiles(dir);
    let bSame = 0, bEol = 0, bDrift = 0, bGhost = 0;
    for (const abs of files) {
      const relInBucket = norm(relative(dir, abs));
      const relPkg = sub ? `${sub}/${relInBucket}` : relInBucket;
      const pkgAbs = join(cfg.staticRoot, "static", ...relPkg.split("/"));
      cmp++;
      if (!existsSync(pkgAbs)) {
        bGhost++;
        hard.push(`${bucket} 里有 ${relPkg} 而包内没有`);
        say(`ASSETCOV_SRC_GHOST bucket=${bucket} rel=${relPkg} 桶字节=${statSync(abs).size} ⇒ 包内已无此件（真源里没有的东西不许经桶被同步进 uploads）`);
        continue;
      }
      let a, b;
      try { a = readFileSync(abs); b = readFileSync(pkgAbs); } catch (e) { unmeasured.push(`${bucket}/${relPkg} 读不动`); continue; }
      if (a.equals(b)) { bSame++; same++; continue; }
      const na = cmpHash(a, relInBucket), nb = cmpHash(b, relPkg);
      if (na === nb) { bEol++; eolOnly++; say(`ASSETCOV_SRC_EOLNOTE bucket=${bucket} rel=${relPkg} 原始 sha8 不同但行尾归一后一致（core.autocrlf 差异，不是内容漂移）`); }
      else {
        bDrift++; drift++;
        hard.push(`${bucket} 与包内字节不一致 ${relPkg}`);
        say(`ASSETCOV_SRC_DRIFT bucket=${bucket} rel=${relPkg} 桶=${statSync(abs).size}B(${na}) 包内=${statSync(pkgAbs).size}B(${nb}) ⇒ 谁跑 sync 就把这份盖进 uploads；本门已让包内优先，但桶烂本身必须留痕`);
      }
    }
    say(`ASSETCOV_SRC bucket=${bucket} 目录=${norm(dir)} 比对=${files.length} 全等=${bSame} 仅行尾=${bEol} 内容差=${bDrift} 包内无此件=${bGhost}`);
  }
  say(`ASSETCOV_SOURCE 备份根=${norm(cfg.backupRoot)} 比对=${cmp} 一致=${same} 仅行尾=${eolOnly} 内容差=${drift} 桶独有=${ghost}（判红项=内容差+桶独有+桶目录缺失；"包内有、桶里没有"只报不红）`);
  return { hard, skipped: false, cmp, eolOnly };
}

/** 契约加载 + 合法性判定（非法 ⇒ 前置失败，不给"空契约所以零缺陷"）。 */
function loadContract(p) {
  if (!existsSync(p)) return { err: `契约文件不存在 ${p}` };
  let raw;
  try { raw = readFileSync(p, "utf8"); } catch (e) { return { err: `契约读不动 ${p}：${e.message}` }; }
  const doc = readJsonSafe(p);
  if (!doc || typeof doc !== "object") return { err: `契约不是合法 JSON ${p}` };
  if (doc.schema !== "mp-cdn-buckets/v1") return { err: `契约 schema=${JSON.stringify(doc.schema)}（应为 mp-cdn-buckets/v1）⇒ 桶口径未知，不得按猜测的目录去判覆盖` };
  const cdn = Array.isArray(doc.cdnPrefixes) ? doc.cdnPrefixes.map(norm) : null;
  const local = Array.isArray(doc.localPrefixes) ? doc.localPrefixes.map(norm) : null;
  const errs = [];
  if (!cdn) errs.push("cdnPrefixes 字段缺失或非数组");
  else if (!cdn.length) errs.push("cdnPrefixes 是空数组 ⇒ 没有任何桶参与覆盖判定，这不叫全都可达");
  if (!local) errs.push("localPrefixes 字段缺失或非数组");
  else if (!local.length) errs.push("localPrefixes 是空数组 ⇒ 反向守恒没有对象可守");
  for (const c of cdn || []) if (!c.startsWith("static/") || !c.endsWith("/") || c === "static/") errs.push(`cdnPrefixes 口径非法：${JSON.stringify(c)}（必须 static/ 开头、/ 结尾、不等于 static/）`);
  for (const l of local || []) if (!l.startsWith("static/") || !l.endsWith("/") || l === "static/") errs.push(`localPrefixes 口径非法：${JSON.stringify(l)}`);
  for (const c of cdn || []) for (const l of local || []) if (c.startsWith(l) || l.startsWith(c)) errs.push(`cdn/local 覆盖同一目录：${c} ∩ ${l} ⇒ 同一张图两头各判一次，口径不成立`);
  if (errs.length) return { err: errs.join("；") };
  return { cdn, local, sha8: sha8(Buffer.from(raw, "utf8")) };
}

/** 枚举某个前缀下的全部真实文件（rel 为包内形态 static/...；urlRel 为去掉 static/ 的 rel）。 */
function enumeratePrefix(staticRoot, prefix) {
  return enumerateBucketDir(join(staticRoot, prefix.replace(/\/+$/, "")), prefix);
}

/** 同上，但直接给桶目录（盘上轴的"裁剪态"要拿镜像树当参照集：full-static 下面没有 static/ 这一层，
 *  用 staticRoot 口径拼不出来；rel 形态仍按契约前缀还原，两轴的 rel/urlRel 才是同一把尺）。 */
function enumerateBucketDir(dir, prefix) {
  if (!existsSync(dir)) return { dir, dirMissing: true, files: [] };
  const relPrefix = norm(prefix).replace(/^static\//, "");
  const files = walkFiles(dir).map((abs) => {
    const relPkg = norm(prefix + abs.slice(dir.length + 1).split(sep).join("/"));
    const urlRel = relPrefix + abs.slice(dir.length + 1).split(sep).join("/");
    let bytes = null, sha = null, csha = null, readErr = null;
    try {
      const buf = readFileSync(abs);
      bytes = buf.byteLength;
      sha = sha8(buf);
      csha = cmpHash(buf, relPkg);
    } catch (e) { readErr = e.message; }
    return { abs, relPkg, urlRel, bytes, sha, csha, readErr };
  });
  return { dir, dirMissing: false, files };
}

const urlOf = (base, rel) => `${base.replace(/\/+$/, "")}/${String(rel).split("/").map(encodeURIComponent).join("/")}`;

async function fetchOnce(url, timeoutMs, nameForHash) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "manual" });
    const buf = Buffer.from(await r.arrayBuffer());
    return { status: r.status, bytes: buf.byteLength, sha: sha8(buf), csha: cmpHash(buf, nameForHash ?? url) };
  } catch (e) {
    /* undici 把底层错误挂在 cause 上，且 ECONNREFUSED 这类码可能藏到 cause.cause：
       取不到码就退化成 message —— 但必须带上，否则"后端没起"会被读成"404 缺件"或"0 个问题"。 */
    const detail = e?.cause?.code || e?.cause?.cause?.code || e?.cause?.message || e?.message || e?.name || "ERR";
    return { net: true, err: `${e?.name || "ERR"}:${String(detail).replace(/\s+/g, " ")}`.slice(0, 90) };
  }
}

/** GET 一发；网络类错误重试一次（网络抖动不该被读成"后端缺这张图"）。 */
async function probe(base, rel, timeoutMs) {
  const url = urlOf(base, rel);
  let a = await fetchOnce(url, timeoutMs, rel);
  if (a.net) a = await fetchOnce(url, timeoutMs, rel);
  return { url, ...a };
}

async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
    for (;;) { const k = i++; if (k >= items.length) return; out[k] = await fn(items[k]); }
  });
  await Promise.all(workers);
  return out;
}

/** 后端是否活着：只看"能不能建立起 HTTP 对话"，不看状态码（404 也是活着 —— 用首个枚举件当活体探针）。 */
async function assertLive(base, timeoutMs, sampleRel) {
  let a = await fetchOnce(urlOf(base, sampleRel), timeoutMs);
  if (a.net) {
    const firstErr = a.err;
    const b = await fetchOnce(urlOf(base, sampleRel), timeoutMs);
    if (b.net) return { ok: false, detail: `${b.err}（连通性两发均失败，首发 ${firstErr}）` };
    return { ok: true, detail: `GET ${urlOf(base, sampleRel)} → HTTP ${b.status}（首发网络失败 ${firstErr}、复发通了 ⇒ 按可达算，逐件探测仍自带一次重试）` };
  }
  return { ok: true, detail: `GET ${urlOf(base, sampleRel)} → HTTP ${a.status}（能对话；${a.status === 404 ? "该件 404 属覆盖问题，不影响连通性判定" : "状态码本轮参与判定"}）` };
}

/** 读产物档位（与 scripts/verify-package-size.mjs:110 同一取法，两头不许各算各的）。 */
function readBand(distRoot) {
  const envPath = join(distRoot, "config", "env.js");
  if (!existsSync(envPath)) return { unknown: true, why: `读不到 ${norm(join(distRoot, "config/env.js"))}` };
  let env;
  try { env = readFileSync(envPath, "utf8"); } catch (e) { return { unknown: true, why: `config/env.js 读不动：${e.message}` }; }
  const pick = (k) => (new RegExp(k + ':\\s*"?([^",\\n]+)"?').exec(env) || [, "?"])[1].trim();
  return { mode: pick("MODE"), api: pick("VITE_API_MODE"), text: `MODE:${pick("MODE")} API:${pick("VITE_API_MODE")}` };
}

const TEXT_EXTS = ["js", "mjs", "cjs", "wxml", "wxss", "css", "html", "wxs", "json"];
/** 扫产物文本件里对 localPrefixes 的 app-assets http 引用（绝对 URL 与端点相对串两种形态都抓：
 *  media.ts 对 `/api/v1/media/app-assets/...` 的相对形态同样会去后端取，绑给 <image> 前若没过
 *  resolveMediaUrl，包内素材就被指成了后端来源）。 */
function scanArtifact(distRoot, localPrefixes) {
  const localRels = localPrefixes.map((p) => norm(p).replace(/^static\//, ""));
  const files = walkFiles(distRoot).filter((f) => {
    const e = norm(f).split(".").pop().toLowerCase();
    if (!TEXT_EXTS.includes(e)) return false;
    try { return statSync(f).size <= 8 * 1024 * 1024; } catch { return false; }
  });
  const hits = [];
  let occurrences = 0;
  for (const abs of files) {
    let text;
    try { text = readFileSync(abs, "utf8"); } catch { continue; }
    let idx = -1;
    while ((idx = text.indexOf("app-assets", idx + 1)) >= 0) {
      occurrences++;
      const tail = text.slice(idx + "app-assets".length);
      const m = /^[\/"'\s]*([A-Za-z0-9._\/-]{2,200})/.exec(tail);
      if (!m) continue;
      /* rel 归一：去查询串/前导斜杠，再吃掉 assets-index.ts 那种多带一层的 `static/` 前缀 */
      const rel = norm(m[1].split("?")[0]).replace(/^\/+/, "").replace(/^static\//, "");
      const prefix = localRels.find((lp) => rel.startsWith(lp));
      if (!prefix) continue;
      hits.push({
        file: norm(abs).slice(norm(distRoot).length + 1),
        line: text.slice(0, idx).split(/\r?\n/).length,
        rel: rel.slice(0, 120),
        matchedPrefix: prefix,
      });
    }
  }
  return { scannedFiles: files.length, occurrences, hits, localRels };
}

/* ── 判定主体：返回退出码，判决行由调用方打印（selftest 复用同一条路径，不给它开后门）───── */
async function evaluate(cfg, say) {
  const problems = [];   // 硬缺陷 ⇒ exit 1
  const unmeasured = []; // 量不到 ⇒ exit 2

  const contract = loadContract(cfg.bucketsPath);
  if (contract.err) {
    say(`ASSETCOV_CONTRACT=INVALID path=${cfg.bucketsPath} reason=${contract.err}`);
    unmeasured.push("契约非法/读不到");
    say(`ASSETCOV_RESULT=ERROR 分母=0（契约这一关就没过，覆盖/漂移/守恒三桶一个都没量）⇒ 量不到 ≠ 达标`);
    return 2;
  }
  say(`ASSETCOV_CONTRACT path=${cfg.bucketsPath} sha8=${contract.sha8} schema=mp-cdn-buckets/v1 cdnPrefixes=${contract.cdn.length} localPrefixes=${contract.local.length}`);
  say(`ASSETCOV_ROOT 包内根=${norm(cfg.staticRoot)}（桶目录 = 该根 + 契约前缀原样拼接，前缀自带 static/ 段）产物=${norm(cfg.distRoot)}`);
  say(`ASSETCOV_ENDPOINT=${cfg.base} 口径=匿名 GET {endpoint}{包内路径去掉 static/ 前缀的 rel}（不带 token；real profile 下后端还要 media_asset 注册+approved）`);

  /* ④ 空集不许绿（先量枚举，再探针；桶目录不存在与桶目录为空要分别点名） */
  const buckets = [];
  for (const prefix of contract.cdn) {
    const e = enumeratePrefix(cfg.staticRoot, prefix);
    buckets.push({ prefix, ...e, ok: 0, missing: [], drift: [], other: [], net: [] });
  }
  for (const b of buckets) {
    const bytes = b.files.reduce((a, f) => a + (f.bytes || 0), 0);
    say(`ASSETCOV_ENUM prefix=${b.prefix} 目录=${norm(b.dir)} 存在=${b.dirMissing ? "否" : "是"} 枚举=${b.files.length} 字节=${bytes}`);
    if (!b.files.length) {
      problems.push(`空集桶 ${b.prefix}（${b.dirMissing ? "目录不存在" : "目录内 0 个文件"}）`);
      say(`ASSETCOV_EMPTY prefix=${b.prefix} 枚举=0 reason=${b.dirMissing ? "契约声明的桶目录在盘上不存在" : "桶目录存在但一个文件都没有"} ⇒ 空集上恒过的判据等于免检，本门判红`);
    }
  }
  const localBuckets = contract.local.map((prefix) => ({ prefix, ...enumeratePrefix(cfg.staticRoot, prefix) }));
  /* 全部桶同时为 0 个文件，几乎只会是"枚举根口径错"（把 apps/client/src/static 当根传进来 ⇒ 桶变成
     static/static/...）。这也是红（空集不许绿），但必须把原因说出来，否则读数长得像"图被删光了"。 */
  if (buckets.length && buckets.every((b) => !b.files.length)) {
    say(`ASSETCOV_HINT 全部 ${buckets.length} 个桶都枚举到 0 个文件 ⇒ 先核 --static 口径：本门要的是**含 static/ 那一层的根**（默认 apps/client/src），不是 apps/client/src/static；当前根=${norm(cfg.staticRoot)}，其下 static 目录${existsSync(join(cfg.staticRoot, "static")) ? "在" : "不在"}`);
  }
  let localEnum = 0;
  for (const lb of localBuckets) {
    say(`ASSETCOV_LOCAL_ENUM prefix=${lb.prefix} 目录=${norm(lb.dir)} 存在=${lb.dirMissing ? "否" : "是"} 枚举=${lb.files.length}`);
    localEnum += lb.files.length;
    if (!lb.files.length) problems.push(`空集本地桶 ${lb.prefix}（${lb.dirMissing ? "目录不存在" : "0 个文件"}）`);
  }

  const all = buckets.flatMap((b) => b.files.map((f) => ({ f, b })));
  const localReadable = all.filter((x) => !x.f.readErr);
  for (const x of all.filter((v) => v.f.readErr)) {
    unmeasured.push(`本地件读不动 ${x.f.relPkg}（${x.f.readErr}）`);
  }

  /* ⑤ 输入树一致性：先比桶与包内，再问后端。桶烂是"输入侧"的缺陷，后端在不在都得报；
     而且它正是上一轮那 6 张未压缩封门的成因，只靠 sync 的包内优先兜着、门上看不见就等于没门。 */
  const src = sourceCheck(cfg, say, unmeasured);
  if (src.hard.length) {
    say(`ASSETCOV_RESULT=FAIL 输入树与包内不一致 ${src.hard.length} 项（比对=${src.cmp}）⇒ ${src.hard.slice(0, 8).join("；")}${src.hard.length > 8 ? ` …共 ${src.hard.length} 项` : ""}`);
    return 1;
  }

  /* 活体探针：拿第一个可量到的件试连通性。网络两发都失败 ⇒ 整轮未测量，exit 2。 */
  const sample = localReadable[0]?.f.urlRel || "generated/images/campus/campus-gate.jpg";
  const live = await assertLive(cfg.base, cfg.timeoutMs, sample);
  if (!live.ok) {
    say(`ASSETCOV_PROBE=UNREACHABLE base=${cfg.base} ${live.detail}`);
    unmeasured.push(`后端不可达（${live.detail}）：覆盖/漂移 ${localReadable.length} 个件全部未测量`);
    say(`ASSETCOV_COVERAGE 分母=${localReadable.length} 200=0 404=0 DRIFT=0 其它=0 网络失败=${localReadable.length} ⇒ 本轮一个响应体都没拿到，"0 个问题"不可作为达标依据`);
    say(`ASSETCOV_RESULT=ERROR reason=${unmeasured.join("；")}`);
    return 2;
  }
  say(`ASSETCOV_PROBE=REACHABLE ${live.detail}`);

  const results = await mapPool(localReadable, cfg.concurrency, async (x) => ({ x, r: await probe(cfg.base, x.f.urlRel, cfg.timeoutMs) }));
  for (const { x, r } of results) {
    const { f, b } = x;
    if (r.net) { b.net.push({ rel: f.relPkg, err: r.err }); continue; }
    if (r.status === 404) { b.missing.push({ rel: f.relPkg, status: 404, localBytes: f.bytes }); continue; }
    if (r.status !== 200) { b.other.push({ rel: f.relPkg, status: r.status, localBytes: f.bytes }); continue; }
    /* 判漂移用归一哈希（文本型先去 CRLF），报账仍给两侧原始 sha8 ——
       这样"只差行尾"会被判为一致，而真内容差照样红，且报出来的数字仍是可复核的原始字节。 */
    if (r.csha === f.csha) { b.ok++; if (r.sha !== f.sha) b.eolOnly = (b.eolOnly || 0) + 1; continue; }
    b.drift.push({ rel: f.relPkg, localSha8: f.sha.slice(0, 8), remoteSha8: r.sha.slice(0, 8), localBytes: f.bytes, remoteBytes: r.bytes });
  }

  let tot = { n: 0, ok: 0, missing: 0, drift: 0, other: 0, net: 0 };
  for (const b of buckets) {
    const bytes = b.files.reduce((a, f) => a + (f.bytes || 0), 0);
    const eolNote = b.eolOnly ? ` 仅行尾差(已判一致)=${b.eolOnly}` : "";
    say(`ASSETCOV_BUCKET prefix=${b.prefix} 分母=${b.files.length} 字节=${bytes} 200同字节=${b.ok} 404=${b.missing.length} DRIFT=${b.drift.length} 其它状态=${b.other.length} 网络失败=${b.net.length}${eolNote}`);
    tot.n += b.files.length; tot.ok += b.ok; tot.missing += b.missing.length; tot.drift += b.drift.length; tot.other += b.other.length; tot.net += b.net.length;
  }
  say(`ASSETCOV_COVERAGE 桶=${buckets.length} 分母=${tot.n} 200同字节=${tot.ok} 404=${tot.missing} DRIFT=${tot.drift} 其它状态=${tot.other} 网络失败=${tot.net}`);

  /* 逐条点名（404 / DRIFT / 其它状态 / 网络失败分列，DRIFT 给两侧 sha256 前 8 位） */
  for (const b of buckets) for (const m of b.missing) say(`ASSETCOV_MISSING rel=${m.rel} status=404 本地字节=${m.localBytes} url=${urlOf(cfg.base, m.rel.replace(/^static\//, ""))} ⇒ real 档这张图必然空白`);
  for (const b of buckets) for (const d of b.drift) say(`ASSETCOV_DRIFT rel=${d.rel} localSha8=${d.localSha8} remoteSha8=${d.remoteSha8} localBytes=${d.localBytes} remoteBytes=${d.remoteBytes} ⇒ 不 404，但画面会漂（后端那份不是包内这一份）`);
  for (const b of buckets) for (const o of b.other) say(`ASSETCOV_OTHER_STATUS rel=${o.rel} status=${o.status} 本地字节=${o.localBytes}`);
  for (const b of buckets) for (const n of b.net) say(`ASSETCOV_NETFAIL rel=${n.rel} err=${n.err}`);
  if (tot.other) problems.push(`非 200/404 状态 ${tot.other} 个（未注册/驳回/5xx 都算拿不到）`);
  if (tot.missing) problems.push(`404 缺失 ${tot.missing} 个`);
  if (tot.drift) problems.push(`字节漂移 ${tot.drift} 个`);
  if (tot.net) unmeasured.push(`网络失败 ${tot.net} 个件未量到`);

  /* ③ 反向守恒 */
  const rev = reverseCheck(cfg, contract.local, say, localEnum, problems, unmeasured);

  /* URL 形态实测（只报数，不参与判定）：契约 rel 形态 vs 多带一层 static/ 的形态。
     实测过 config/assets-index.ts 在 real 档拼出的是 `{apiRoot}/api/v1/media/app-assets//static/generated/…`，
     与 media.ts 的口径（去掉 static/）不是同一条 URL —— 这里把它量出来交给主控裁。 */
  const one = localReadable[0]?.f.urlRel;
  if (one) {
    const a = await fetchOnce(urlOf(cfg.base, one), cfg.timeoutMs);
    const b2 = await fetchOnce(urlOf(cfg.base, "static/" + one), cfg.timeoutMs);
    say(`ASSETCOV_URLFORM_NOTE rel=${one} 契约形态=${a.net ? "网络失败" : "HTTP " + a.status} 多带static形态=${b2.net ? "网络失败" : "HTTP " + b2.status}（后者仅记录，判定按前者=运行时 media.ts 的口径）`);
  }

  /* ── 结论 ── */
  if (problems.length) {
    say(`ASSETCOV_RESULT=FAIL 档=http 分母=${tot.n} 404=${tot.missing} DRIFT=${tot.drift} 其它状态=${tot.other} 空集桶=${buckets.filter((b) => !b.files.length).length} 反向命中=${rev.hits}（另量不到 ${tot.net} 个）⇒ ${problems.join("；")}`);
    return 1;
  }
  if (unmeasured.length || rev.notEvidence) {
    say(`ASSETCOV_RESULT=ERROR 档=http 分母=${tot.n} 200同字节=${tot.ok} 404=0 DRIFT=0 但 ${[...unmeasured, rev.notEvidence || ""].filter(Boolean).join("；")} ⇒ 量不到 ≠ 达标`);
    return 2;
  }
  say(`ASSETCOV_RESULT=PASS 档=http 分母=${tot.n}（${buckets.length} 桶逐件 HTTP 探测，无抽样）200同字节=${tot.ok} 404=0 DRIFT=0 其它状态=0 空集桶=0 反向命中=0 输入树比对=${src.cmp}${src.eolOnly ? `（其中仅行尾差=${src.eolOnly}，已按类型归一判一致）` : ""} 守恒证据=${rev.evidence}`);
  return 0;
}

/* ── 盘上轴（--source-only）─────────────────────────────────────────────────────────────
 * 盘上根裁定（写死在这儿，别让下一程再猜一遍；三个根都实测过，不是照抄文档）：
 *   R1 `apps/api/uploads/app-assets/<rel>` = **唯一一棵后端真会去读的树**。依据四条：
 *       · apps/api/src/main/resources/application.yml:170 `storage-root: ${APP_MEDIA_STORAGE_ROOT:./uploads}`
 *         （相对后端进程 CWD=apps/api ⇒ 落到 apps/api/uploads）；
 *       · scripts/sync-app-assets.mjs:34-36 的拷贝目标就是它（DEST = uploads/app-assets）；
 *       · apps/client/scripts/prune-unreferenced-static.mjs:50 backendAssetsDir 与 :479 的 fs 探测口径；
 *       · scripts/qa/verify-asset-registry.mjs 的缺省 --uploads 也是这一棵（两边共用同一个根名）。
 *   R2 `<--backup 根>/full-static/<rel>`（缺省 apps/client/static-local-backup/full-static）
 *      = 同步输入镜像：sync 的拷贝来源。它答得上来只证明"字节在仓里、跑一次 sync 就能进 R1"，
 *      **不证明已被服务** ⇒ 计数单列（ASSETCOV_MIRROR_ONLY），判"盘上"但根名必须印出来。
 *   查过但**不作根**的两处（把否证留在原地，免得下一程重新查一遍再误接进来）：
 *      · apps/api/src/main/resources/ 实测只有 application*.yml / i18n / logback-spring.xml /
 *        redisson-dev.yaml，没有任何 app-assets 树 ⇒ 当根就是恒缺，判据会长期假红；
 *      · apps/api/scripts/output/app-assets-seed{,-full}.sql 与 database/flyway/sql/V2026.09.12.*
 *        是 **media_asset 注册**真源（一行 INSERT 只证明"注册过"，不证明"盘上有那个文件"），
 *        注册↔字节的双向对账是 scripts/qa/verify-asset-registry.mjs 的判域，本轴不越过去数。
 *   判定：多根同时答得上来 ⇒ 记"盘上"，按 R1 优先报根名；只 R2 答得上来 ⇒ 记"盘上"并单点名；
 *        两根都答不上来 ⇒ 缺件（红）；**零字节**与**该是文件的地方是目录**一律判缺件（红）——
 *        一张 0 字节的 jpg 渲染出来就是空白图标，那正是本轴要抓的东西，把它算成"有件"等于免检。 */
const FILE_ROOTS = (cfg) => [
  { key: "uploads", dir: cfg.uploadsRoot, 权威: "后端 storage-root 实际读取的那棵树" },
  { key: "镜像", dir: join(cfg.backupRoot, "full-static"), 权威: "sync 的输入镜像（有它⇒能被同步，不等于已被服务）" },
];

/** 在盘上根里解析一条引用（rel = 去掉 static/ 的 urlRel）。返回命中的根 + 每个根试到了什么。 */
function resolveOnFileRoots(roots, urlRel) {
  const segs = String(urlRel).split("/").filter(Boolean);
  const tried = [];
  let hit = null;
  const zero = [];
  const dirs = [];
  for (const root of roots) {
    if (!existsSync(root.dir)) { tried.push(`${root.key}=根不存在`); continue; }
    const abs = join(root.dir, ...segs);
    let st = null;
    try { st = statSync(abs); } catch { tried.push(`${root.key}=无此路径`); continue; }
    if (st.isDirectory()) { dirs.push({ root: root.key, abs }); tried.push(`${root.key}=目录`); continue; }
    if (!st.isFile()) { tried.push(`${root.key}=非普通文件`); continue; }
    if (st.size === 0) { zero.push({ root: root.key, abs }); tried.push(`${root.key}=0字节`); continue; }
    tried.push(`${root.key}=${st.size}B`);
    if (!hit) hit = { root: root.key, abs, bytes: st.size };
  }
  return { hit, zero, dirs, tried };
}

/** 扫产物文本件里指向 cdnPrefixes 的 app-assets 引用（与反向守恒 scanArtifact 同一把尺、同一批
 *  抓取形态，只是这次问的不是"该不该指后端"而是"指过去的那条路径盘上有没有件"）。
 *  只认命中契约前缀的 rel：不在契约口径里的串（模板前缀、注释残留、拼到一半的常量）不配被判缺件。 */
function scanCdnRefs(distRoot, cdnPrefixes) {
  const cdnRels = cdnPrefixes.map((p) => norm(p).replace(/^static\//, ""));
  const files = walkFiles(distRoot).filter((f) => {
    const e = norm(f).split(".").pop().toLowerCase();
    if (!TEXT_EXTS.includes(e)) return false;
    try { return statSync(f).size <= 8 * 1024 * 1024; } catch { return false; }
  });
  const refs = [];
  let occurrences = 0;
  for (const abs of files) {
    let text;
    try { text = readFileSync(abs, "utf8"); } catch { continue; }
    let idx = -1;
    while ((idx = text.indexOf("app-assets", idx + 1)) >= 0) {
      occurrences++;
      const tail = text.slice(idx + "app-assets".length);
      const m = /^[\/"'\s]*([A-Za-z0-9._\/-]{2,200})/.exec(tail);
      if (!m) continue;
      const rel = norm(m[1].split("?")[0]).replace(/^\/+/, "").replace(/^static\//, "");
      const prefix = cdnRels.find((cp) => rel.startsWith(cp));
      if (!prefix) continue;
      refs.push({ rel, file: norm(abs).slice(norm(distRoot).length + 1), line: text.slice(0, idx).split(/\r?\n/).length, matchedPrefix: prefix });
    }
  }
  const uniq = new Map();
  for (const r of refs) if (!uniq.has(r.rel)) uniq.set(r.rel, r);
  return { scannedFiles: files.length, occurrences, refs: [...uniq.values()].sort((a, b) => (a.rel < b.rel ? -1 : 1)) };
}

/** 随包卸载清单（apps/client/scripts/prune-unreferenced-static.mjs 落的 CDN_OFFLOAD_MANIFEST.json）。
 *  它是"这个 real 包到底去后端要哪些 /api-assets/…"的**唯一随包证据**：发布链跑到 prune 之后
 *  src/static 已经是裁剪态（prepare-static --real 根本不把 cdn 桶复制进包），那时包内桶枚举恒为 0，
 *  拿"包内桶空"去判缺件会把每一步发布链都读成假红；清单里那 294 条才是被测物。
 *  读不到不算错（本地/CI 的产物可能没出过 real 档）：返回 {none:true, why} 由调用方如实标注。 */
function readOffloadManifest(distRoot) {
  const p = join(distRoot, "CDN_OFFLOAD_MANIFEST.json");
  if (!existsSync(p)) return { none: true, why: "产物目录里没有随包卸载清单（这份包没走过 cdn 桶放行，或 --dist 指的不是 real 产物）", path: p };
  const doc = readJsonSafe(p);
  if (!doc || typeof doc !== "object") return { none: true, why: `卸载清单不是合法 JSON：${p}`, path: p };
  if (doc.schema !== "mp-cdn-offload-manifest/v1") return { none: true, why: `卸载清单 schema=${JSON.stringify(doc.schema)}（应为 mp-cdn-offload-manifest/v1）⇒ 条目口径未知，不拿来当分母`, path: p };
  const entries = Array.isArray(doc.entries) ? doc.entries : [];
  const rels = [];
  for (const e of entries) {
    const rel = norm(String(e && (e.appAssetPath || (e.packagePath || "")).replace(/^static\//, "") || ""));
    if (rel) rels.push({ urlRel: rel, packageBytes: e && e.packageBytes, origin: (e && e.origin) || "?" });
  }
  return { none: false, band: doc.band, contractSha8: doc.contract && doc.contract.sha8, apiRoot: doc.apiRoot, path: p, rels };
}

/* ── 盘上轴判定主体：与 evaluate() 同一批枚举、同一批空集/守恒/输入树判点，只把逐件 GET 换成逐件盘上解析 ── */
async function evaluateSource(cfg, say) {
  const problems = [];   // 硬缺陷 ⇒ exit 1
  const unmeasured = []; // 量不到 ⇒ exit 2

  const contract = loadContract(cfg.bucketsPath);
  if (contract.err) {
    say(`ASSETCOV_CONTRACT=INVALID path=${cfg.bucketsPath} reason=${contract.err}`);
    unmeasured.push("契约非法/读不到");
    say(`ASSETCOV_RESULT=ERROR 档=source 分母=0（契约这一关就没过，覆盖/守恒两桶一个都没量）⇒ 量不到 ≠ 达标`);
    return 2;
  }
  say(`ASSETCOV_CONTRACT path=${cfg.bucketsPath} sha8=${contract.sha8} schema=mp-cdn-buckets/v1 cdnPrefixes=${contract.cdn.length} localPrefixes=${contract.local.length}`);
  say(`ASSETCOV_ROOT 包内根=${norm(cfg.staticRoot)}（桶目录 = 该根 + 契约前缀原样拼接，前缀自带 static/ 段）产物=${norm(cfg.distRoot)}`);
  const roots = FILE_ROOTS(cfg);
  say(`ASSETCOV_AXIS 档=source 探针=盘上解析（本轴一个 HTTP 请求都不发 ⇒ 读数只声明"盘上有无件"，不声明取到/在线/交付；注册与审核那一轴在 scripts/qa/verify-asset-registry.mjs，匿名取到与否在 --base 那一档）`);
  say(`ASSETCOV_FROOTS ${roots.map((r) => `${r.key}=${norm(r.dir)}(${existsSync(r.dir) ? "在" : "不在"})`).join(" ")} 优先序=uploads→镜像 判缺件=两根都无|零字节|目录当文件`);
  for (const r of roots) say(`ASSETCOV_FROOT_ROLE 根=${r.key} 含义=${r.权威}`);

  /* 参照集（=这一发到底在数哪些引用）有三个来源，逐个枚举后取并集：
     A 包内桶：staticRoot + 契约前缀，与 http 轴同一条枚举（完整态下它就是 real 包会去后端要的那批）；
     B 随包卸载清单：产物里的 CDN_OFFLOAD_MANIFEST.json 条目 —— 发布链跑到 prune 之后 src/static
       已经是裁剪态（prepare-static --real 根本不把 cdn 桶复制进包），那时"这个包引用了哪些 /api-assets/…"
       的唯一随包权威就是这份清单（apps/client/scripts/prune-unreferenced-static.mjs:460 落的）。
     C 镜像桶 full-static：只对"包内为空"的前缀兜底（裁剪态下本地手跑没有产物清单时的分母来源）。
       ⚠ C 与解析根 R2 是同一棵树 ⇒ 由 C 来的引用**不许**用 R2 答（自答=免检），只许 uploads 答。
     ④ 空集不许绿的判据跟着搬到**并集**上：三源都空才是"免检空集"，才判红。 */
  const buckets = [];
  for (const prefix of contract.cdn) {
    const e = enumeratePrefix(cfg.staticRoot, prefix);
    buckets.push({ prefix, ...e, present: 0, missing: [], zero: [], dirAsFile: [], mirrorList: [], fromManifest: 0, fromMirror: 0 });
  }
  let pkgEnum = 0;
  for (const b of buckets) {
    const bytes = b.files.reduce((a, f) => a + (f.bytes || 0), 0);
    say(`ASSETCOV_ENUM prefix=${b.prefix} 目录=${norm(b.dir)} 存在=${b.dirMissing ? "否" : "是"} 枚举=${b.files.length} 字节=${bytes}`);
    pkgEnum += b.files.length;
  }
  const mf = readOffloadManifest(cfg.distRoot);
  /* 形态判定（写死在这儿，别让下一程猜）：
     · 完整态 = 每个 cdn 桶在包内都枚举到件 ⇒ 参照集就是包内桶，⑤输入树照 http 轴同一条判点跑；
     · 裁剪态 = 包内至少一个 cdn 桶空了，而 static/ 这一层还在 ⇒ 这是 prepare-static --real 的发布形态
       （cdn 桶根本不复制进包），分母改由"随包卸载清单 + 镜像兜底"接住，⑤在这一发不测（比了就是假红）；
     · 口径可疑 = 包内桶全空**且** static/ 这一层都不在 ⇒ 是 --static 传错根，不是裁剪；不许借"裁剪态"
       的名头把传参错误洗成绿，也不许开镜像兜底（另一棵树替传参错误背书 = 后门）。 */
  const gaps = buckets.filter((b) => !b.files.length).length;
  const badStaticRoot = pkgEnum === 0 && !existsSync(join(cfg.staticRoot, "static"));
  const trimmed = !badStaticRoot && gaps > 0;
  const shape = trimmed ? "裁剪态" : badStaticRoot ? "口径可疑" : "完整态";
  if (mf.none) say(`ASSETCOV_REFSET_MANIFEST=不可用 path=${norm(mf.path)} reason=${mf.why} ⇒ 参照集没有随包清单这一路，只剩包内桶与镜像兜底`);
  else say(`ASSETCOV_REFSET_MANIFEST path=${norm(mf.path)} band=${mf.band || "(未记)"} 条目=${mf.rels.length} 清单内契约 sha8=${mf.contractSha8 || "(未记)"} 当前契约 sha8=${contract.sha8}${mf.contractSha8 && mf.contractSha8 !== contract.sha8 ? " ⇒ 清单解释的不是这一份契约（条目仍逐条解析：发出去的引用背后必须有件，与契约换没换无关）" : ""}`);

  const mirrorRoot = join(cfg.backupRoot, "full-static");
  /* 把三源并成一张引用表（key=urlRel，去掉 static/ 的形态，与 uploads 的键口径一致） */
  const refIndex = new Map();
  const bucketOfRel = (urlRel) => buckets.find((b) => urlRel.startsWith(norm(b.prefix).replace(/^static\//, ""))) || null;
  const addRef = (urlRel, relPkg, bytes, readErr, src, bucket) => {
    if (!urlRel) return;
    if (!refIndex.has(urlRel)) refIndex.set(urlRel, { urlRel, relPkg, bytes, readErr, bucket, srcs: new Set() });
    const r = refIndex.get(urlRel);
    r.srcs.add(src);
    if (r.readErr === undefined || r.readErr === null) r.readErr = readErr;
    if ((r.bytes === null || r.bytes === undefined) && bytes != null) r.bytes = bytes;
    if (!r.bucket && bucket) r.bucket = bucket;
  };
  for (const b of buckets) for (const f of b.files) addRef(f.urlRel, f.relPkg, f.bytes, f.readErr, "包内桶", b);
  if (!mf.none) for (const m of mf.rels) { const b = bucketOfRel(m.urlRel); addRef(m.urlRel, "static/" + m.urlRel, m.packageBytes ?? null, null, "卸载清单", b); if (b) b.fromManifest++; }
  let mirrorEnum = 0;
  /* 镜像兜底只在**确认是裁剪态**时开：口径传错（--static 指到 src/static 那一层）时开兜底，
     就等于用另一棵树把传参错误洗成绿 —— 那是本门最不该有的一种后门。 */
  if (trimmed) for (const b of buckets) {
    if (b.files.length) continue;
    const me = enumerateBucketDir(join(mirrorRoot, norm(b.prefix).replace(/^static\//, "").replace(/\/+$/, "")), b.prefix);
    if (!me.files.length) continue;
    for (const f of me.files) { addRef(f.urlRel, f.relPkg, f.bytes, f.readErr, "镜像桶", b); b.fromMirror++; }
    mirrorEnum += me.files.length;
    say(`ASSETCOV_REFSET_MIRROR prefix=${b.prefix} 镜像目录=${norm(me.dir)} 取到=${me.files.length} ⇒ 包内这一桶被裁剪了（prepare-static --real 的发布形态），分母改由镜像接住；这些件**不许**拿镜像自己答有无（自答=免检），只按 uploads 判`);
  }
  say(`ASSETCOV_REFSET 包内桶=${pkgEnum} 卸载清单=${mf.none ? 0 : mf.rels.length} 镜像兜底=${mirrorEnum} 合并=${refIndex.size} 形态=${shape}（${trimmed ? "cdn 桶已被 prepare-static --real 从包内剪走 ⇒ 分母由随包清单/镜像接住，⑤输入树这一发不测" : badStaticRoot ? "--static 根下面没有 static/ 这一层 ⇒ 参照集兜不住，判红" : "分母即包内桶，与 http 轴同一条枚举"}）`);
  const refs = [...refIndex.values()].sort((a, b) => (a.urlRel < b.urlRel ? -1 : 1));
  const selfAnswerRisk = refs.filter((r) => r.srcs.has("镜像桶") && !r.srcs.has("包内桶") && !r.srcs.has("卸载清单")).length;

  /* ④ 空集不许绿：判到并集上。某桶包内 0 且清单/镜像也没接住它 ⇒ 才是"这个桶没被测"。 */
  let emptyBuckets = 0;
  for (const b of buckets) {
    if (b.files.length) continue;
    if (b.fromManifest || b.fromMirror) {
      say(`ASSETCOV_TRIMMED prefix=${b.prefix} 包内=0 清单=${b.fromManifest} 镜像=${b.fromMirror} ⇒ 桶不在包里是发布形态的预期结果（cdn 桶就是让 prune 放行的），分母由随包清单/镜像接住，这一桶不判空集红`);
      continue;
    }
    emptyBuckets++;
    problems.push(`空集桶 ${b.prefix}（${b.dirMissing ? "目录不存在" : "目录内 0 个文件"}，随包卸载清单与镜像都没有一条落在它下面）`);
    say(`ASSETCOV_EMPTY prefix=${b.prefix} 枚举=0 清单=0 镜像=0 reason=${b.dirMissing ? "契约声明的桶目录在盘上不存在" : "桶目录存在但一个文件都没有"} ⇒ 空集上恒过的判据等于免检，本门判红`);
  }
  const localBuckets = contract.local.map((prefix) => ({ prefix, ...enumeratePrefix(cfg.staticRoot, prefix) }));
  if (!refs.length) {
    say(`ASSETCOV_HINT 参照集全空（包内桶 ${pkgEnum} + 清单 ${mf.none ? 0 : mf.rels.length} + 镜像 ${mirrorEnum}）⇒ 先核 --static 口径：本门要的是**含 static/ 那一层的根**（默认 apps/client/src），不是 apps/client/src/static；当前根=${norm(cfg.staticRoot)}，其下 static 目录${existsSync(join(cfg.staticRoot, "static")) ? "在" : "不在"}，再核 --dist/--backup 指的是不是真出过包与真存过镜像的那一份`);
    problems.push(`参照集为空（包内桶 ${pkgEnum} 条 + 卸载清单 ${mf.none ? "(不可用)" : mf.rels.length + " 条"} + 镜像 ${mirrorEnum} 条）⇒ 没有任何引用参与判定，这不叫全都对上了`);
  }
  let localEnum = 0;
  for (const lb of localBuckets) {
    /* 留包内的桶在裁剪态下同样会被剪掉"源码没引用"的那一批（保留集由 prepare-static 扫源码决定），
       拿"包内这一桶空了"直接判红会把每一次发布链读成假红；先看镜像里还有没有，两边都没有才是真没了。
       兜底只在确认裁剪态时开 —— 口径传错时用另一棵树兜底 = 把传参错误洗成绿。 */
    let mirrorCount = 0;
    if (trimmed && !lb.files.length) {
      mirrorCount = enumerateBucketDir(join(mirrorRoot, norm(lb.prefix).replace(/^static\//, "").replace(/\/+$/, "")), lb.prefix).files.length;
    }
    say(`ASSETCOV_LOCAL_ENUM prefix=${lb.prefix} 目录=${norm(lb.dir)} 存在=${lb.dirMissing ? "否" : "是"} 枚举=${lb.files.length}${mirrorCount ? ` 镜像兜底=${mirrorCount}（裁剪态：包内这桶被 prepare-static 剪过，计数改由镜像给）` : ""}`);
    localEnum += lb.files.length || mirrorCount;
    if (!lb.files.length && !mirrorCount) problems.push(`空集本地桶 ${lb.prefix}（${lb.dirMissing ? "目录不存在" : "0 个文件"}，镜像里也没有一条落在它下面）`);
  }

  /* ⑤ 输入树一致性：纯 fs 判点。裁剪态下"包内"那一侧刚被 prepare-static --real 剪过，
     拿被剪的树去比桶会把 1300 多个件读成"桶独有"假红（每一步发布链都红 = 这条判点在链上不可用），
     所以本发如实标注"没测"，不冒充测过，也不因此判红。完整态（本地手跑 / 终验）照旧逐件比。 */
  let src = { hard: [], skipped: true, cmp: 0, eolOnly: 0 };
  if (!trimmed && !badStaticRoot) {
    src = sourceCheck(cfg, say, unmeasured);
    if (src.hard.length) {
      say(`ASSETCOV_RESULT=FAIL 档=source 形态=${shape} 输入树与包内不一致 ${src.hard.length} 项（比对=${src.cmp}）⇒ ${src.hard.slice(0, 8).join("；")}${src.hard.length > 8 ? ` …共 ${src.hard.length} 项` : ""}`);
      return 1;
    }
  } else {
    say(`ASSETCOV_SOURCE=NOT-APPLICABLE 档=source 形态=${shape} ⇒ ⑤输入树这一发一个字节都没比（${trimmed ? "包内那侧已被 prepare-static --real 裁剪，比了就是把发布形态读成假红" : "--static 根的口径不对，比了就是把传参错误读成素材缺失"}），它由 --base 那一档与完整态下的本档量；这不是达标，是没测`);
  }

  /* 一个根都不在盘上 ⇒ 这一轴没有任何被测物可解析（不是"全都缺"，是"一个都没量"）：exit 2。
     把"检出树里没这两棵"读成"产品缺 929 张图"会是本门最坏的一种假红。 */
  const liveRoots = roots.filter((r) => existsSync(r.dir));
  if (!liveRoots.length) {
    say(`ASSETCOV_FROOTS=NONE 两个盘上根都不存在 ⇒ 引用背后的文件一个都没量，"0 缺件"与"全缺"都无从谈起`);
    say(`ASSETCOV_RESULT=ERROR 档=source 形态=${shape} 分母=${refs.length} 盘上=未量 缺件=未量 reason=盘上根全部不存在（${roots.map((r) => norm(r.dir)).join(" / ")}）⇒ 量不到 ≠ 达标`);
    return 2;
  }
  if (liveRoots.length < roots.length) {
    say(`ASSETCOV_FROOT_PARTIAL 缺根=${roots.filter((r) => !existsSync(r.dir)).map((r) => `${r.key}(${norm(r.dir)})`).join(",")} ⇒ 这些根不参与解析，计数按现存根给，缺的如实标注（不降级成绿，也不升级成缺件）`);
  }

  /* ① 覆盖（盘上版）：逐条引用解析，不抽样。引用集是三源并集（见上面 ASSETCOV_REFSET），
     每条允许被两个根答，但**答它的根不能正好是把它喂进来的那棵树**（自答=免检）：
     只由镜像喂进来的引用，解析根收窄到 uploads。 */
  const outsideBucket = { prefix: "(清单里不落在任何契约桶下的条目)", present: 0, missing: [], zero: [], dirAsFile: [], mirrorList: [], files: [], fromManifest: 0, fromMirror: 0 };
  let narrowed = 0;
  for (const ref of refs) {
    const b = ref.bucket || outsideBucket;
    if (ref.readErr) { unmeasured.push(`引用来源件读不动 ${ref.relPkg}（${ref.readErr}）`); continue; }
    const onlyMirror = ref.srcs.has("镜像桶") && !ref.srcs.has("包内桶") && !ref.srcs.has("卸载清单");
    const useRoots = onlyMirror ? roots.filter((r) => r.key !== "镜像") : roots;
    if (onlyMirror) narrowed++;
    const r = resolveOnFileRoots(useRoots, ref.urlRel);
    ref.srcTag = [...ref.srcs].join("+");
    if (r.hit) {
      b.present++;
      if (r.hit.root !== "uploads") b.mirrorList.push({ rel: ref.relPkg, root: r.hit.root, abs: r.hit.abs, bytes: r.hit.bytes, src: ref.srcTag });
    }
    if (r.dirs.length) b.dirAsFile.push({ rel: ref.relPkg, roots: r.dirs.map((d) => d.root).join(","), abs: r.dirs[0].abs, src: ref.srcTag });
    if (r.zero.length) b.zero.push({ rel: ref.relPkg, roots: r.zero.map((d) => d.root).join(","), abs: r.zero[0].abs, src: ref.srcTag });
    if (!r.hit) b.missing.push({ rel: ref.relPkg, localBytes: ref.bytes, tried: r.tried.join(" "), src: ref.srcTag });
  }
  if (narrowed) say(`ASSETCOV_FROOT_SELF 只由镜像喂进来的引用=${narrowed} 条 ⇒ 这些件不许拿镜像答"有无"（自答=免检），解析根已收窄到 uploads`);

  const bucketStats = [...buckets, outsideBucket];
  let tot = { n: 0, present: 0, mirrorOnly: 0, missing: 0, zero: 0, dir: 0 };
  for (const b of bucketStats) {
    const n = b.present + b.missing.length;
    if (!n && !b.files.length) continue;
    const bytes = b.files.reduce((a, f) => a + (f.bytes || 0), 0);
    say(`ASSETCOV_FBUCKET prefix=${b.prefix} 分母=${n} 包内字节=${bytes} 盘上=${b.present}（其中根=uploads=${b.present - b.mirrorList.length} 仅镜像=${b.mirrorList.length}）缺件=${b.missing.length} 零字节=${b.zero.length} 目录当文件=${b.dirAsFile.length}`);
    tot.n += n; tot.present += b.present; tot.mirrorOnly += b.mirrorList.length; tot.missing += b.missing.length; tot.zero += b.zero.length; tot.dir += b.dirAsFile.length;
  }
  say(`ASSETCOV_FILE_COVERAGE 桶=${buckets.length} 分母=${tot.n} 盘上=${tot.present}（根=uploads=${tot.present - tot.mirrorOnly} 仅镜像=${tot.mirrorOnly}）缺件=${tot.missing} 零字节=${tot.zero} 目录当文件=${tot.dir}`);

  for (const b of bucketStats) for (const m of b.missing) say(`ASSETCOV_FILE_MISSING rel=${m.rel} 来源=${m.src} 本地字节=${m.localBytes} 根已试=${m.tried} ⇒ 这条 /api-assets 引用在盘上没有件（real 档这张图只能靠后端，后端没有这份字节）`);
  for (const b of bucketStats) for (const z of b.zero) say(`ASSETCOV_ZERO_BYTE rel=${z.rel} 来源=${z.src} 零字节根=${z.roots} 路径=${norm(z.abs)} ⇒ 判缺件：0 字节的图渲染就是空白图标，"文件在"不等于"件在"（本轴钉死的判据，改判必须先改这条注释）`);
  for (const b of bucketStats) for (const d of b.dirAsFile) say(`ASSETCOV_DIR_AS_FILE rel=${d.rel} 来源=${d.src} 目录根=${d.roots} 路径=${norm(d.abs)} ⇒ 判缺件：期望的是文件却撞到目录（sync 源根写错时的形态）`);
  /* 仅镜像答得上来 = 字节在仓里但还没进后端那棵树：判"盘上"（不假红），但必须逐条点名，
     否则"盘上=929"会被读成"后端有了 929 张"。 */
  for (const b of bucketStats) for (const m of b.mirrorList) say(`ASSETCOV_MIRROR_ONLY rel=${m.rel} 来源=${m.src} 答上的根=${m.root}（${norm(m.abs)}，${m.bytes}B）⇒ 盘上算有，但后端那棵树还没有它：跑 scripts/sync-app-assets.mjs 才会进 uploads`);
  /* ① 的账必须落到判定上：缺件 / 零字节 / 目录当文件 都是硬缺陷（"零字节算不算缺件"这一条
     在 ASSETCOV_ZERO_BYTE 那行写死了理由，这里就是它的执行点）。 */
  if (tot.missing) problems.push(`盘上缺件 ${tot.missing} 个（两根都无 / 零字节 / 目录当文件都归这一账）`);

  /* ①′ 产物引用对账（这一条才是"real 包能带着悬空 /api-assets 引用出仓"那一格的补丁）：
        产物文本件里对 cdnPrefixes 的引用逐条去盘上解析，缺一个就红。 */
  if (!existsSync(cfg.distRoot)) {
    unmeasured.push(`产物目录不存在（${norm(cfg.distRoot)}）⇒ 产物侧的 app-assets 引用一条都没扫到`);
    say(`ASSETCOV_REFSCAN=NOT-EVIDENCED dist=${norm(cfg.distRoot)} reason=产物目录不存在 ⇒ 引用↔盘上这一条没有被测物可量（这不是通过）`);
  } else {
    const band = readBand(cfg.distRoot);
    const rs = scanCdnRefs(cfg.distRoot, contract.cdn);
    say(`ASSETCOV_REFSCAN dist=${norm(cfg.distRoot)} band=${band.unknown ? "未知" : band.text} 扫描文本文件=${rs.scannedFiles} app-assets串出现次数=${rs.occurrences} 命中cdnPrefixes引用=${rs.refs.length}（去重后逐条解析）`);
    if (!rs.scannedFiles) unmeasured.push(`产物里一个文本件（${TEXT_EXTS.join("/")}）都没扫到 ⇒ 引用扫描判据空跑`);
    let refPresent = 0;
    for (const ref of rs.refs) {
      const r = resolveOnFileRoots(roots, ref.rel);
      if (r.hit) { refPresent++; continue; }
      problems.push(`产物引用悬空 ${ref.rel}（${ref.file}:${ref.line}）`);
      say(`ASSETCOV_REF_MISSING rel=${ref.rel} 出处=${ref.file}:${ref.line} 根已试=${r.tried} ⇒ 真发出去的包会去后端要这一条，而盘上没有它的字节：正是本轴存在的理由`);
    }
    say(`ASSETCOV_REF_COVERAGE 分母=${rs.refs.length} 盘上=${refPresent} 悬空=${rs.refs.length - refPresent}`);
    if (!rs.refs.length && rs.scannedFiles) {
      say(`ASSETCOV_REF_NOTE 产物文本件里 0 条指向 cdnPrefixes 的 app-assets 引用（本仓的 real 包按 media.ts 运行时拼 URL，包里没有整条路径）⇒ "悬空=0" 这一发量的是空集，别把它读成"引用都对过了"；真要对这一轴取样，看 ASSETCOV_FILE_COVERAGE 那条按桶枚举的账`);
    }
  }

  /* ③ 反向守恒（纯 fs 扫产物，两轴同判据） */
  const rev = reverseCheck(cfg, contract.local, say, localEnum, problems, unmeasured);

  const notMeasured = trimmed || badStaticRoot;
  if (problems.length) {
    say(`ASSETCOV_RESULT=FAIL 档=source 形态=${shape} 分母=${tot.n} 盘上=${tot.present} 缺件=${tot.missing} 零字节=${tot.zero} 目录当文件=${tot.dir} 空集桶=${emptyBuckets} 反向命中=${rev.hits} ⇒ ${problems.slice(0, 12).join("；")}${problems.length > 12 ? ` …共 ${problems.length} 项` : ""}`);
    return 1;
  }
  if (unmeasured.length || rev.notEvidence) {
    say(`ASSETCOV_RESULT=ERROR 档=source 形态=${shape} 分母=${tot.n} 盘上=${tot.present} 缺件=0 但 ${[...unmeasured, rev.notEvidence || ""].filter(Boolean).join("；")} ⇒ 量不到 ≠ 达标`);
    return 2;
  }
  say(`ASSETCOV_RESULT=PASS 档=source 形态=${shape} 分母=${tot.n}（${buckets.length} 桶逐条盘上解析，无抽样）盘上=${tot.present}（根=uploads=${tot.present - tot.mirrorOnly} 仅镜像=${tot.mirrorOnly}）缺件=0 零字节=0 目录当文件=0 空集桶=0 反向命中=0 ⑤输入树=${notMeasured ? `未测(${shape})` : `比对=${src.cmp}${src.eolOnly ? `（其中仅行尾差=${src.eolOnly}，已按类型归一判一致）` : ""}`} 守恒证据=${rev.evidence}（档=source 只证明"盘上有这份字节"；后端取不取得到、响应体字节对不对由 --base 那一档量）`);
  return 0;
}

function reverseCheck(cfg, localPrefixes, say, localEnum, problems, unmeasured) {
  const out = { hits: 0, notEvidence: null, evidence: "" };
  void unmeasured;
  if (!existsSync(cfg.distRoot)) {
    out.notEvidence = `real 产物目录不存在 ${norm(cfg.distRoot)}`;
    say(`ASSETCOV_REVERSE=NOT-EVIDENCED dist=${norm(cfg.distRoot)} reason=产物目录不存在 ⇒ 反向守恒这一条没有被测物可量（这不是通过）`);
    return out;
  }
  const band = readBand(cfg.distRoot);
  const isReal = !band.unknown && band.api === "real";
  if (!isReal) {
    out.notEvidence = band.unknown ? `档位读不出（${band.why}）` : `产物档位不是 real（${band.text}）⇒ 这一档由 prepare-static 还原完整 static 树，本来就不证明 real 档的引用形态`;
  }
  const sc = scanArtifact(cfg.distRoot, localPrefixes);
  out.hits = sc.hits.length;
  say(`ASSETCOV_REVERSE_SCAN dist=${norm(cfg.distRoot)} band=${band.unknown ? "未知" : band.text} real档=${isReal ? "是" : "否"} 扫描文本文件=${sc.scannedFiles} app-assets串出现次数=${sc.occurrences} 命中localPrefixes引用=${sc.hits.length}（包内 localPrefixes 枚举=${localEnum}）`);
  if (!sc.scannedFiles) {
    out.notEvidence = (out.notEvidence ? out.notEvidence + "；" : "") + `产物里一个文本件（${TEXT_EXTS.join("/")}）都没扫到 ⇒ 扫描判据空跑`;
    say(`ASSETCOV_REVERSE=NOT-EVIDENCED reason=扫描集为空（0 个文本文件）⇒ 空集上的"0 命中"等于免检`);
  } else if (sc.hits.length) {
    problems.push(`反向守恒泄漏 ${sc.hits.length} 处`);
    say(`ASSETCOV_REVERSE=FAIL 命中=${sc.hits.length} ⇒ 产物把包内素材（localPrefixes）指成后端来源：后端那份不是唯一真源（L01 实测 svg-spec 132/132 全差字节、icons 有 404）`);
    for (const h of sc.hits.slice(0, 30)) say(`ASSETCOV_REVERSE_HIT file=${h.file}:${h.line} rel=${h.rel} 命中前缀=${h.matchedPrefix}`);
    if (sc.hits.length > 30) say(`ASSETCOV_REVERSE_HIT …另有 ${sc.hits.length - 30} 处，计数见上一行`);
  } else {
    out.evidence = `档位=${band.unknown ? "未知" : band.text}，${sc.scannedFiles} 个文本件、${sc.occurrences} 处 app-assets 串中 0 处指向 localPrefixes`;
    if (!out.notEvidence) say(`ASSETCOV_REVERSE=PASS ${out.evidence}`);
  }
  if (out.notEvidence && !sc.hits.length) say(`ASSETCOV_REVERSE=NOT-EVIDENCED reason=${out.notEvidence}`);
  return out;
}

/* ── 默认（真实）被测物 ───────────────────────────────────────────────────────────────────
   桶根口径必须与契约的键形态一致：清单里写的是 `static/generated/`（体积门/prepare-static/prune
   用的都是"产物或包内相对路径含 static/ 段"），所以枚举根是 **apps/client/src**（其下有 static/），
   不是 apps/client/src/static —— 后者会把桶算成 `static/static/...`，枚举恒为 0（空集假红/假绿都不诚实）。 */
const DEFAULTS = {
  bucketsPath: resolve(REPO, "apps/client/config/cdn-buckets.json"),
  staticRoot: resolve(REPO, "apps/client/src"),
  base: "http://127.0.0.1:8080/api/v1/media/app-assets/",
  distRoot: resolve(REPO, "apps/client/dist/build/mp-weixin"),
  backupRoot: resolve(REPO, "apps/client/static-local-backup"),
  /* 盘上轴的主根（= 后端 storage-root 实际读取的那棵树，裁定过程见 FILE_ROOTS 上方注释）。
     旗标名与 scripts/qa/verify-asset-registry.mjs 的 --uploads 一致，不再造第二个名字。 */
  uploadsRoot: resolve(REPO, "apps/api/uploads/app-assets"),
  concurrency: 8,
  timeoutMs: 15000,
};
function cliCfg() {
  const b = arg("base", DEFAULTS.base).trim();
  return {
    bucketsPath: resolve(REPO, arg("buckets", DEFAULTS.bucketsPath)),
    staticRoot: resolve(REPO, arg("static", DEFAULTS.staticRoot)),
    /* --base 允许传 apiRoot（http://127.0.0.1:8080）或完整端点：统一到端点形态，避免两头各拼各的 */
    base: /app-assets\/?$/.test(b) ? (b.endsWith("/") ? b : b + "/") : `${b.replace(/\/+$/, "")}/api/v1/media/app-assets/`,
    distRoot: resolve(REPO, arg("dist", DEFAULTS.distRoot)),
    backupRoot: resolve(REPO, arg("backup", DEFAULTS.backupRoot)),
    uploadsRoot: resolve(REPO, arg("uploads", DEFAULTS.uploadsRoot)),
    concurrency: Math.max(1, Math.min(32, Number(arg("concurrency", DEFAULTS.concurrency)) || DEFAULTS.concurrency)),
    timeoutMs: Math.max(500, Number(arg("timeout-ms", DEFAULTS.timeoutMs)) || DEFAULTS.timeoutMs),
    sourceOnly: SOURCE_ONLY,
  };
}

/* ── --selftest：注入坏件必须各自翻红，撤掉必须翻绿（http 轴真起一个临时服务、盘上轴真造目录，
   都不 mock 判定本身）。--source-only --selftest 只跑盘上轴那一组 ⇒ 老 node（无 fetch）也能自证。── */
const FIX_ROOT = join(REPO, "tmp", "qa", "fixtures", "assetcov");

/** 造一份自洽夹具：包内根 = caseDir（其下有 static/，与契约键形态同口径）；"后端" = srv 表（内存）。 */
function buildFixture(caseDir, mut) {
  const root = caseDir;
  const dist = join(caseDir, "dist");
  const mkin = (p, content) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); };
  /* 包内那份（真源）；键=包内路径（含 static/ 段），值=字节 */
  const pkg = {
    "static/generated/images/campus/a-gate.jpg": Buffer.from("LOCAL-CAMPUS-GATE-BYTES-v1"),
    "static/generated/images/campus/b-library.jpg": Buffer.from("LOCAL-CAMPUS-LIBRARY-BYTES-v1"),
    "static/assets/images/covers/circle-studybuddy.png": Buffer.from("LOCAL-COVER-STUDYBUDDY-v1"),
    "static/assets/images/covers/circle-food.png": Buffer.from("LOCAL-COVER-FOOD-v1"),
    "static/assets/images/posters/login-poster.png": Buffer.from("LOCAL-POSTER-LOGIN-v1"),
    "static/assets/icons/tabbar/chat.png": Buffer.from("LOCAL-ICON-CHAT-v1"),
    /* 文本件带换行，才造得出"只差行尾"这种形态（无换行的话 CRLF 版是多出一行，属真内容差） */
    "static/assets/svg-spec/spec-home.svg": Buffer.from("LOCAL-SVGSPEC-HOME-v1\n", "binary"),
  };
  /* 后端默认与包内逐字节一致 ⇒ 绿基线；坏件用例靠改这张表模拟"后端缺/后端是旧版" */
  const srv = {};
  for (const [relPkg, buf] of Object.entries(pkg)) {
    mkin(join(root, relPkg), buf);
    srv[norm(relPkg).replace(/^static\//, "")] = buf;
  }
  const contract = {
    schema: "mp-cdn-buckets/v1",
    cdnPrefixes: ["static/generated/", "static/assets/images/covers/", "static/assets/images/posters/"],
    localPrefixes: ["static/assets/icons/", "static/assets/svg-spec/"],
  };
  const bucketsPath = join(caseDir, "cdn-buckets.json");
  mkin(bucketsPath, JSON.stringify(contract, null, 2));
  /* real 档产物（默认 0 处指向 localPrefixes 的 http 引用；档位串取法与体积门一致） */
  mkin(join(dist, "config", "env.js"), `"use strict";const T={MODE:"mp-weixin-real",VITE_API_MODE:"real",VITE_API_BASE_URL:"http://127.0.0.1:8080/api"};exports.T=T;`);
  mkin(join(dist, "config", "images.js"), `const S="http://127.0.0.1:8080/api/v1/media/app-assets/generated/images/campus/a-gate.jpg";exports.S=S;`);
  mkin(join(dist, "utils", "media.js"), `const P="/api/v1/media/app-assets/";exports.P=P;`);
  mkin(join(dist, "app.json"), `{"pages":["pages/index/index"]}`);

  /* 备份树默认逐字节等于包内 ⇒ 输入树判点是绿的，而且带真分母（三棵桶都在、件都在），不是空集恒过。
     full-static 是整棵 static 的镜像；generated / assets-images 是 sync 实际读的两个输入桶。 */
  const backup = join(caseDir, "_backup");
  for (const [relPkg, buf] of Object.entries(pkg)) mkin(join(backup, "full-static", relPkg.replace(/^static\//, "")), buf);
  for (const [bucket, sub] of [["generated", "generated"], ["assets-images", "assets/images"]]) {
    for (const [relPkg, buf] of Object.entries(pkg)) {
      const p = relPkg.replace(/^static\//, "");
      if (p.startsWith(sub + "/")) mkin(join(backup, bucket, p.slice(sub.length + 1)), buf);
    }
  }

  /* "后端那棵树"（盘上轴的主根 uploads）默认逐字节等于包内 ⇒ source 档绿基线带真分母。
     夹具不 mock 判定本身：这一棵是真目录、真文件，坏件用例直接删它/掏空它/在那儿建同名目录。 */
  const uploads = join(caseDir, "_uploads");
  for (const [relPkg, buf] of Object.entries(pkg)) mkin(join(uploads, relPkg.replace(/^static\//, "")), buf);

  const note = mut ? mut({ root, dist, caseDir, bucketsPath, srv, backup, uploads, mkin }) : null;
  return { root, dist, bucketsPath, srv, backup, uploads, note };
}

const ACTIVE = { srv: {} };

async function selftest() {
  rmSync(FIX_ROOT, { recursive: true, force: true });
  mkdirSync(FIX_ROOT, { recursive: true });
  /* --source-only --selftest：只跑盘上轴那一组（不建 HTTP 服务、一个 fetch 都不发）⇒ 老 node 上
     也能自证。缺省 --selftest 两轴都跑，用例数随之上升（ASSETCOV_SELFTEST 的格式一字不改）。 */
  const onlySrc = SOURCE_ONLY;
  const server = onlySrc ? null : createServer((req, res) => {
    const rel = decodeURIComponent(String(req.url || "").replace(/^\/+/, "").replace(/^api\/v1\/media\/app-assets\//, ""));
    const buf = ACTIVE.srv[rel];
    if (!buf) { res.writeHead(404, { "content-type": "application/json" }); res.end('{"error":"NOT_FOUND"}'); return; }
    res.writeHead(200, { "content-type": "application/octet-stream" }); res.end(buf);
  });
  await new Promise((r) => (server ? server.listen(0, "127.0.0.1", r) : r()));
  const port = server ? server.address().port : 0;
  const base = `http://127.0.0.1:${port}/api/v1/media/app-assets/`;
  const DEAD_BASE = "http://127.0.0.1:1/api/v1/media/app-assets/";

  /** 跑一发：mut 注入坏件，opts 换被测物路径（默认全部指回夹具=健康态，用于"撤掉必须翻绿"）。 */
  const run = async (caseName, mut, opts = {}) => {
    const caseDir = join(FIX_ROOT, caseName);
    rmSync(caseDir, { recursive: true, force: true });
    const fx = buildFixture(caseDir, mut);
    ACTIVE.srv = fx.srv;
    const captured = [];
    const code = await evaluate(
      {
        bucketsPath: opts.bucketsPath || fx.bucketsPath,
        staticRoot: fx.root,
        base: opts.base || base,
        distRoot: opts.distRoot === "missing" ? join(caseDir, "no-such-dist") : (opts.distRoot || fx.dist),
        backupRoot: opts.backupRoot === "absent" ? join(caseDir, "no-such-backup") : (opts.backupRoot || fx.backup),
        concurrency: 4,
        timeoutMs: 6000,
      },
      (s) => { captured.push(s); },
    );
    return { code, captured, fx, caseDir };
  };

  /** 盘上轴那一发：同一个夹具、同一套 tmp 目录约定，只是探针换成盘上解析（uploadsRoot/镜像根都是真目录）。 */
  const runSrc = async (caseName, mut, opts = {}) => {
    const caseDir = join(FIX_ROOT, "src-" + caseName);
    rmSync(caseDir, { recursive: true, force: true });
    const fx = buildFixture(caseDir, mut);
    const captured = [];
    const code = await evaluateSource(
      {
        bucketsPath: fx.bucketsPath,
        staticRoot: opts.staticRootIsStatic ? join(caseDir, "static") : fx.root,
        base: "(盘上轴不发请求，本字段不参与判定)",
        distRoot: opts.distRoot === "missing" ? join(caseDir, "no-such-dist") : (opts.distRoot || fx.dist),
        backupRoot: opts.backupRoot === "absent" ? join(caseDir, "no-such-backup") : (opts.backupRoot || fx.backup),
        uploadsRoot: opts.uploadsRoot === "absent" ? join(caseDir, "no-such-uploads") : (opts.uploadsRoot || fx.uploads),
        concurrency: 4,
        timeoutMs: 6000,
        sourceOnly: true,
      },
      (s) => { captured.push(s); },
    );
    return { code, captured, fx, caseDir };
  };

  const cases = [];
  /* 归一哈希的两侧对照（本发改动的直接判点，不靠起服务）：
     ① 只差行尾 ⇒ 归一后必须相同（否则 6 个 SVG 会继续被虚报成画面漂移）；
     ② 真改一个字节 ⇒ 归一后必须仍不同（否则"归一"就是把门焊死在绿上）。
     只验①不验，等于用"消除假红"的名义把判据废掉。 */
  {
    const lf = Buffer.from('<svg a="1"/>\n<b/>\n', "binary");
    const crlf = Buffer.from('<svg a="1"/>\r\n<b/>\r\n', "binary");
    const edited = Buffer.from('<svg a="2"/>\r\n<b/>\r\n', "binary");
    const a1 = cmpHash(lf, "x.svg") === cmpHash(crlf, "x.svg");
    const a2 = cmpHash(crlf, "x.svg") !== cmpHash(edited, "x.svg");
    const a3 = sha8(lf) !== sha8(crlf);
    const a4 = cmpHash(lf, "x.png") !== cmpHash(crlf, "x.png");
    console.log(`${a1 ? "PASS" : "FAIL"}  文本型只差行尾 ⇒ 归一后同哈希（假漂移必须消失）`);
    console.log(`${a2 ? "PASS" : "FAIL"}  文本型真改内容 ⇒ 归一后仍不同（归一≠放宽）`);
    console.log(`${a3 ? "PASS" : "FAIL"}  原始 sha8 仍能看出行尾差异（报账口径未被改动）`);
    console.log(`${a4 ? "PASS" : "FAIL"}  二进制型不做行尾归一（png 里出现 \\r\\n 是真内容差）`);
    cases.push(a1, a2, a3, a4);
  }
  const check = (name, expectCode, res, mustHave) => {
    const joined = res.captured.join("\n");
    const lineOk = mustHave.every((m) => joined.includes(m));
    const ok = res.code === expectCode && lineOk;
    console.log(`ASSETCOV_ST case=${name} expect_exit=${expectCode} got_exit=${res.code} 判决行命中=${lineOk ? "是" : "否"}（要命中 ${mustHave.join(" | ")}）verdict=${ok ? "PASS" : "FAIL"}`);
    if (!ok) for (const l of res.captured) console.log("    | " + l);
    cases.push(ok);
    return ok;
  };

  /* ── http 轴那一组（缺省 --selftest 才跑；--source-only --selftest 时一个 fetch 都不发）── */
  const httpCases = async () => {
  /* 0. 绿基线：全部 200 且逐字节一致、产物 real 档 0 引用 */
  const g0 = await run("green", null);
  check("green-baseline", 0, g0, ["ASSETCOV_RESULT=PASS"]);

  /* 1. 坏件 A：后端少一张（404）⇒ 必须点名 rel 并红 */
  const c1 = await run("missing", ({ srv }) => { delete srv["assets/images/covers/circle-food.png"]; return "删后端 circle-food"; });
  check("inject-404", 1, c1, ["ASSETCOV_MISSING rel=static/assets/images/covers/circle-food.png", "ASSETCOV_RESULT=FAIL"]);
  const r1 = await run("missing-reverted", null);
  check("revert-404→绿", 0, r1, ["ASSETCOV_RESULT=PASS"]);

  /* 2. 坏件 B：字节不符（画面漂移，不 404）⇒ 必须落 DRIFT 桶并点名两侧 sha */
  const c2 = await run("drift", ({ srv }) => { srv["generated/images/campus/a-gate.jpg"] = Buffer.from("STALE-BACKEND-VERSION-OTHER-BYTES"); return "后端换成旧版字节"; });
  check("inject-drift", 1, c2, ["ASSETCOV_DRIFT rel=static/generated/images/campus/a-gate.jpg", "ASSETCOV_RESULT=FAIL"]);
  const r2 = await run("drift-reverted", null);
  check("revert-drift→绿", 0, r2, ["ASSETCOV_RESULT=PASS"]);

  /* 3. 坏件 C-1：契约声明的桶目录被清空/删掉 ⇒ 空集不许绿（红，exit 1） */
  const c3 = await run("empty-bucket", ({ root }) => {
    rmSync(join(root, "static", "assets", "images", "posters"), { recursive: true, force: true });
    return "删掉包内 posters 桶目录（契约仍声明它）";
  });
  check("inject-empty-bucket-dir", 1, c3, ["ASSETCOV_EMPTY prefix=static/assets/images/posters/", "ASSETCOV_RESULT=FAIL"]);
  const r3 = await run("empty-bucket-reverted", null);
  check("revert-empty-bucket→绿", 0, r3, ["ASSETCOV_RESULT=PASS"]);

  /* 3b. 坏件 C-2：清单本身空（cdnPrefixes=[]）⇒ 没有桶可测 = 前置失败（exit 2，不给"零缺陷"） */
  const c3b = await run("empty-manifest", ({ bucketsPath }) => {
    writeFileSync(bucketsPath, JSON.stringify({ schema: "mp-cdn-buckets/v1", cdnPrefixes: [], localPrefixes: ["static/assets/icons/"] }, null, 2));
    return "cdnPrefixes 改成空数组";
  });
  check("inject-empty-cdnPrefixes", 2, c3b, ["ASSETCOV_CONTRACT=INVALID", "ASSETCOV_RESULT=ERROR 分母=0"]);

  /* 4. 坏件 D：real 产物里出现对 localPrefixes 的 http 引用 ⇒ 反向守恒红（exit 1） */
  const c4 = await run("reverse-leak", ({ dist, mkin }) => {
    mkin(join(dist, "components", "leak.js"), `exports.ICON="http://127.0.0.1:8080/api/v1/media/app-assets/assets/icons/tabbar/chat.png";`);
    return "产物里塞一条把包内 icons 指向后端的 http 串";
  });
  check("inject-reverse-http", 1, c4, ["ASSETCOV_REVERSE=FAIL", "ASSETCOV_REVERSE_HIT file=components/leak.js", "ASSETCOV_RESULT=FAIL"]);
  const r4 = await run("reverse-reverted", null);
  check("revert-reverse→绿", 0, r4, ["ASSETCOV_REVERSE=PASS"]);

  /* 5. 量不到不许当绿 A：产物目录不存在 ⇒ NOT-EVIDENCED + exit 2（覆盖/漂移即使全过也一样不给绿） */
  const c5 = await run("dist-missing", null, { distRoot: "missing" });
  check("dist-dir-missing→NOT-EVIDENCED", 2, c5, ["ASSETCOV_REVERSE=NOT-EVIDENCED", "ASSETCOV_RESULT=ERROR"]);

  /* 5b. 量不到不许当绿 B：产物档位不是 real（现有盘上那份是 mock 档）⇒ 同样 NOT-EVIDENCED */
  const c6 = await run("dist-mock-band", ({ dist, mkin }) => {
    mkin(join(dist, "config", "env.js"), `"use strict";exports.T={MODE:"mp-weixin-mock",VITE_API_MODE:"mock",VITE_API_BASE_URL:"http://127.0.0.1:8080/api"};`);
    return "档位改成 mock";
  });
  check("dist-non-real-band→NOT-EVIDENCED", 2, c6, ["ASSETCOV_REVERSE=NOT-EVIDENCED", "ASSETCOV_RESULT=ERROR"]);

  /* 5c. 量不到不许当绿 C：后端不可达 ⇒ 整轮一个响应体都没拿到，exit 2（绝不报"0 个问题"） */
  const c7 = await run("backend-unreachable", null, { base: DEAD_BASE });
  check("backend-unreachable", 2, c7, ["ASSETCOV_PROBE=UNREACHABLE", "ASSETCOV_COVERAGE 分母=", "ASSETCOV_RESULT=ERROR"]);

  /* 7a. 输入树坏件 A：桶里的件与包内不一致（就是那 6 张未压缩封门的形态）⇒ 必须红并点名
     注：输入桶的布局是"相对映射基名"的（assets-images 桶里直接是 covers/…），夹具照同一形态注入。 */
  const c8 = await run("src-drift", ({ backup, mkin }) => {
    mkin(join(backup, "assets-images", "covers/circle-food.png"), Buffer.from("UNCOMPRESSED-ORIGINAL-BYTES"));
    return "把 assets-images 桶里 circle-food 换成另一份字节";
  });
  check("inject-src-drift", 1, c8, ["ASSETCOV_SRC_DRIFT bucket=assets-images rel=assets/images/covers/circle-food.png", "ASSETCOV_RESULT=FAIL"]);
  /* 7a′. 后端同时不可达也遮不住它：输入树先判，红就是红（防"后端挂了就把桶的缺陷一起吞成未测量"） */
  const c8b = await run("src-drift-with-dead-backend", ({ backup, mkin }) => {
    mkin(join(backup, "assets-images", "covers/circle-food.png"), Buffer.from("UNCOMPRESSED-ORIGINAL-BYTES"));
    return "桶漂移 + 后端不可达";
  }, { base: DEAD_BASE });
  check("src-drift 不被后端不可达吞掉", 1, c8b, ["ASSETCOV_SRC_DRIFT", "ASSETCOV_RESULT=FAIL"]);

  /* 7b. 输入树坏件 B：桶里有个包内没有的件（真源里不存在的东西不该经桶进 uploads）*/
  const c9 = await run("src-ghost", ({ backup, mkin }) => {
    mkin(join(backup, "generated", "images/campus/z-ghost.jpg"), Buffer.from("GHOST"));
    return "只在桶里加一件";
  });
  check("inject-src-ghost", 1, c9, ["ASSETCOV_SRC_GHOST", "ASSETCOV_RESULT=FAIL"]);

  /* 7c. 输入树正例：只差行尾的文本件必须判一致（否则 autocrlf 会把 6 个 SVG 虚报成画面漂移）*/
  const c10 = await run("src-eolonly", ({ backup, mkin }) => {
    mkin(join(backup, "full-static", "assets/svg-spec/spec-home.svg"), Buffer.from("LOCAL-SVGSPEC-HOME-v1\r\n", "binary"));
    return "full-static 里那份 svg 换成 CRLF";
  });
  check("src 仅行尾差⇒仍判绿", 0, c10, ["ASSETCOV_SRC_EOLNOTE", "ASSETCOV_RESULT=PASS"]);

  /* 7d. 量不到不许当绿 D：备份根整个不在 ⇒ 输入树一个字节都没比，exit 2 */
  const c11 = await run("src-backup-absent", null, { backupRoot: "absent" });
  check("backup-root-absent→NOT-EVIDENCED", 2, c11, ["ASSETCOV_SOURCE=NOT-EVIDENCED", "ASSETCOV_RESULT=ERROR"]);

  /* 6. 收尾复量：所有坏件撤掉后必须仍是绿（证明前面那些红不是"死红"） */
  const gEnd = await run("green-final", null);
  check("green-final-restored", 0, gEnd, ["ASSETCOV_RESULT=PASS"]);
  };

  if (!onlySrc) await httpCases();

  /* ── 盘上轴那一组（两档 --selftest 都跑；不需要 fetch）───────────────────────────────
     每个坏件都跑"注入⇒红"与"撤掉⇒绿"两发，与 http 轴那 14 例同一套夹具目录约定。 */
  {
    /* S0. 绿基线（盘上）：uploads 与镜像两根都在、逐件有非零字节文件 ⇒ PASS 且明写档=source */
    const s0 = await runSrc("green", null);
    check("src-green-baseline", 0, s0, ["ASSETCOV_RESULT=PASS 档=source", "分母=5 盘上=5"]);

    /* S1. 坏件：引用在**两个根都不存在** ⇒ 缺件红，并点名是哪个根都没答上 */
    const s1 = await runSrc("missing", ({ uploads, backup }) => {
      rmSync(join(uploads, "assets/images/covers/circle-food.png"), { force: true });
      rmSync(join(backup, "full-static/assets/images/covers/circle-food.png"), { force: true });
      return "uploads 与镜像两根都删掉 circle-food";
    });
    check("src-inject-file-missing", 1, s1, ["ASSETCOV_FILE_MISSING rel=static/assets/images/covers/circle-food.png", "ASSETCOV_RESULT=FAIL 档=source"]);
    const sr1 = await runSrc("missing-reverted", null);
    check("src-revert-file-missing→绿", 0, sr1, ["ASSETCOV_RESULT=PASS 档=source"]);

    /* S2. 坏件：该是文件的地方是个**目录** ⇒ 判缺件（sync 源根写错时的形态，读得到 stat 却取不到字节） */
    const s2 = await runSrc("dir-as-file", ({ uploads, backup }) => {
      rmSync(join(uploads, "assets/images/posters/login-poster.png"), { force: true });
      rmSync(join(backup, "full-static/assets/images/posters/login-poster.png"), { force: true });
      mkdirSync(join(uploads, "assets/images/posters/login-poster.png"), { recursive: true });
      return "uploads 里把那个件换成同名目录";
    });
    check("src-inject-dir-where-file", 1, s2, ["ASSETCOV_DIR_AS_FILE rel=static/assets/images/posters/login-poster.png", "ASSETCOV_RESULT=FAIL 档=source"]);
    const sr2 = await runSrc("dir-as-file-reverted", null);
    check("src-revert-dir-where-file→绿", 0, sr2, ["ASSETCOV_RESULT=PASS 档=source"]);

    /* S3. 坏件：0 字节文件 —— 判据在此钉死：**算缺件**。
       0 字节的 jpg 被 <image> 取到就是空白图标（本仓被烧过两次的那一族），"文件在"不等于"件在"；
       把它算成"盘上有"等于给这一族缺陷发通行证，所以宁可红。反证也跑：同一位置换成有字节的件必须翻绿。 */
    const s3 = await runSrc("zero-byte", ({ uploads, backup, mkin }) => {
      rmSync(join(backup, "full-static/generated/images/campus/b-library.jpg"), { force: true });
      mkin(join(uploads, "generated/images/campus/b-library.jpg"), Buffer.alloc(0));
      return "uploads 那份换成 0 字节、镜像那份删掉（两根都拿不出字节）";
    });
    check("src-inject-zero-byte=缺件", 1, s3, ["ASSETCOV_ZERO_BYTE rel=static/generated/images/campus/b-library.jpg", "ASSETCOV_RESULT=FAIL 档=source"]);
    const sr3 = await runSrc("zero-byte-reverted", null);
    check("src-revert-zero-byte→绿", 0, sr3, ["ASSETCOV_RESULT=PASS 档=source"]);

    /* S4. 坏件：**产物侧**的悬空引用（real 包里写了一条 /api-assets/… 而盘上没那个件）
       ⇒ 这一条才是"real 构建能带着悬空引用出仓"那一格的补丁，必须能红。 */
    const s4 = await runSrc("ref-dangling", ({ dist, mkin }) => {
      mkin(join(dist, "config", "ghost.js"), `exports.G="http://127.0.0.1:8080/api/v1/media/app-assets/assets/images/covers/ghost-cover.png";`);
      return "产物里塞一条盘上无件的 cdn 桶引用";
    });
    check("src-inject-dangling-artifact-ref", 1, s4, ["ASSETCOV_REF_MISSING rel=assets/images/covers/ghost-cover.png", "ASSETCOV_RESULT=FAIL 档=source"]);
    const sr4 = await runSrc("ref-dangling-reverted", null);
    check("src-revert-dangling-ref→绿", 0, sr4, ["ASSETCOV_RESULT=PASS 档=source"]);

    /* S5. 正例：uploads 缺、镜像有 ⇒ 判"盘上"，但必须点名是哪个根答的（多根同时命中不冒充已被服务） */
    const s5 = await runSrc("mirror-only", ({ uploads }) => {
      rmSync(join(uploads, "assets/images/covers/circle-studybuddy.png"), { force: true });
      return "只删 uploads 根那一份（镜像仍在）⇒ 盘上有、后端那棵树没有";
    });
    check("src-mirror-root-answers-仍判绿但点名", 0, s5, ["ASSETCOV_MIRROR_ONLY rel=static/assets/images/covers/circle-studybuddy.png", "ASSETCOV_RESULT=PASS 档=source"]);

    /* S6. 量不到：两个盘上根都不存在 ⇒ exit 2（不许把"没东西可解析"读成"0 缺件"，也不读成"全缺"） */
    const s6 = await runSrc("roots-absent", null, { uploadsRoot: "absent", backupRoot: "absent" });
    check("src-roots-absent→ERROR", 2, s6, ["ASSETCOV_FROOTS=NONE", "ASSETCOV_RESULT=ERROR 档=source"]);

    /* S7. 单根缺失不降级：uploads 根不在、镜像在 ⇒ 照判绿，但如实报"缺根"（这一例钉住
       "检出树里没有 uploads 那棵树"≠"产品缺图"：CI 的盘上轴就是这个形态，别把它读成红。 */
    const s7 = await runSrc("uploads-root-absent", null, { uploadsRoot: "absent" });
    check("src-only-mirror-root→点名缺根", 0, s7, ["ASSETCOV_FROOT_PARTIAL", "ASSETCOV_RESULT=PASS 档=source"]);

    /* S8. 轴诚实性：盘上读数里不许出现 200/可达/served 这类字样（否则 source 档会被读成 http 档） */
    const honest = !s0.captured.join("\n").match(/\b200\b|可达|served/i);
    console.log(`${honest ? "PASS" : "FAIL"}  ASSETCOV_ST case=src-axis-no-http-wording verdict=${honest ? "PASS" : "FAIL"}（盘上轴 ${s0.captured.length} 行读数里不得出现 200/可达/served）`);
    cases.push(honest);
    if (!honest) for (const l of s0.captured) if (/\b200\b|可达|served/i.test(l)) console.log("    | " + l);

    /* S9. 撤掉全部注入后必须仍是绿（证明上面那些红不是死红） */
    const sEnd = await runSrc("green-final", null);
    check("src-green-final-restored", 0, sEnd, ["ASSETCOV_RESULT=PASS 档=source"]);

    /* S10. 口径负例：--static 传成 apps/client/src/static（根下面没有 static/ 这一层）⇒ 参照集全空，
       必须判红并且点名"口径可疑"，不许借"裁剪态"这个名头把传参错误洗成绿。 */
    const s10 = await runSrc("static-root-wrong-axis", null, { staticRootIsStatic: true });
    check("src-static根口径错⇒判红不免检", 1, s10, ["形态=口径可疑", "ASSETCOV_HINT 参照集全空", "ASSETCOV_RESULT=FAIL 档=source"]);
  }

  /* ── 裁剪态那一组（发布链里跑到 prune 之后的真实形状：prepare-static --real 不把 cdn 桶复制进包，
        包内桶枚举恒为 0）。这三例钉的是"进了链不许假红，也不许顺手免检"。 ── */
  const trimPkg = (root) => {
    rmSync(join(root, "static", "generated"), { recursive: true, force: true });
    rmSync(join(root, "static", "assets", "images"), { recursive: true, force: true });
  };
  {
    /* T1 有随包卸载清单：分母由清单接住 ⇒ 不许判"空集桶"，⑤输入树如实标 NOT-APPLICABLE */
    const t1 = await runSrc("trimmed-manifest", ({ root, dist, mkin }) => {
      trimPkg(root);
      mkin(join(dist, "CDN_OFFLOAD_MANIFEST.json"), JSON.stringify({
        schema: "mp-cdn-offload-manifest/v1",
        band: "real",
        entries: [
          { appAssetPath: "generated/images/campus/a-gate.jpg", packageBytes: 27, origin: "strip" },
          { appAssetPath: "generated/images/campus/b-library.jpg", packageBytes: 29, origin: "strip" },
          { appAssetPath: "assets/images/covers/circle-studybuddy.png", packageBytes: 28, origin: "strip" },
          { appAssetPath: "assets/images/covers/circle-food.png", packageBytes: 24, origin: "strip" },
          { appAssetPath: "assets/images/posters/login-poster.png", packageBytes: 25, origin: "strip" },
        ],
      }, null, 2));
      return "包内 cdn 桶剪掉 + 产物带随包清单（=发布链 prune 之后的形状）";
    });
    check("src-trimmed-有清单⇒不判空集且标未测⑤", 0, t1, ["ASSETCOV_TRIMMED prefix=static/generated/", "ASSETCOV_SOURCE=NOT-APPLICABLE", "ASSETCOV_RESULT=PASS 档=source"]);

    /* T2 没有清单：镜像兜底接住分母（裁剪态下本地手跑的形态） */
    const t2 = await runSrc("trimmed-no-manifest", ({ root }) => { trimPkg(root); return "只剪包内，不出清单"; });
    check("src-trimmed-无清单⇒镜像兜底接分母", 0, t2, ["ASSETCOV_REFSET_MIRROR prefix=static/generated/", "ASSETCOV_RESULT=PASS 档=source"]);

    /* T3 没有清单 + uploads 少一件 ⇒ 兜底的分母照样能抓缺陷（不是"包内没有就免检"）；
       并且这些由镜像喂进来的引用不许拿镜像答有无（ASSETCOV_FROOT_SELF 那行就是这条纪律的执行点）。 */
    const t3 = await runSrc("trimmed-missing-in-uploads", ({ root, uploads }) => {
      trimPkg(root);
      rmSync(join(uploads, "assets/images/covers/circle-food.png"), { force: true });
      return "剪包内 + 删掉 uploads 那一份（镜像还留着）";
    });
    check("src-trimmed-无清单且uploads缺件⇒红且不自答", 1, t3, ["ASSETCOV_FROOT_SELF", "ASSETCOV_FILE_MISSING rel=static/assets/images/covers/circle-food.png", "ASSETCOV_RESULT=FAIL 档=source"]);
    const t3r = await runSrc("trimmed-missing-reverted", ({ root }) => { trimPkg(root); return "撤掉 uploads 那处删除（仍裁剪）"; });
    check("src-trimmed-撤掉缺件→绿", 0, t3r, ["ASSETCOV_RESULT=PASS 档=source"]);
  }

  if (server) await new Promise((r) => server.close(r));
  const bad = cases.filter((x) => !x).length;
  console.log(`ASSETCOV_SELFTEST 用例=${cases.length} 通过=${cases.length - bad} 失败=${bad}${onlySrc
    ? " 本轮档=source（只跑盘上轴那一组，一个 fetch 都没发）注入坏件类=5（两根都无件 / 同名目录当文件 / 0 字节件 / 产物悬空引用 / 盘上根全部不存在）+ 裁剪态坏件 1 类（裁剪态下 uploads 缺件仍须红，且不许拿喂它进来的镜像树自答）另 3 例正例（仅镜像答上=点名不判红 / 单根缺=PARTIAL 不降级 / 撤掉注入复量仍绿）+ 裁剪态正例 2（随包清单接住分母⇒不判空集且⑤如实标未测 / 无清单时镜像兜底接住分母）+ 1 例轴诚实性（读数不出现 200/可达/served）"
    : " 注入坏件类=9（后端缺件404 / 后端字节不符 / 桶目录空集 / 清单cdnPrefixes空 / 产物对localPrefixes的http引用 / 量不到四例[产物缺·档位非real·后端不可达·备份根缺失] / 输入树桶内容与包内不符 / 桶独有件 / 桶漂移+后端不可达）另含 1 例输入树正例（仅行尾差判绿）；盘上轴另注入坏件类=5（两根都无件 / 同名目录当文件 / 0 字节件 / 产物悬空引用 / 盘上根全部不存在）+ 裁剪态坏件 1（裁剪态下 uploads 缺件仍须红且不自答）+ 正例 3（仅镜像答上仍绿且点名 / 单根缺=PARTIAL / 撤掉复量）+ 裁剪态正例 2（清单接分母 / 镜像兜底接分母）+ 轴诚实性 1（source 读数不出现 200/可达/served）"
  }。每类都跑了"注入→红"与"撤掉→绿"`);
  console.log(`ASSETCOV_SELFTEST_FIXTURE 夹具目录=${norm(FIX_ROOT)}（永不入库；本轮已清理，重跑 --selftest 会重建）`);
  rmSync(FIX_ROOT, { recursive: true, force: true });
  console.log(bad ? `ASSETCOV_SELFTEST_RESULT=FAIL 失败=${bad} ⇒ 本门自己都不能红，不能接线` : "ASSETCOV_SELFTEST_RESULT=PASS 每个坏件都翻红、撤掉都翻绿（含 NOT-EVIDENCED 不许当绿）");
  process.exit(bad ? 1 : 0);
}

/* ── 入口 ─────────────────────────────────────────────────────────────────────────────── */
if (has("selftest")) {
  await selftest();
} else {
  const cfg = cliCfg();
  const t0 = Date.now();
  console.log(cfg.sourceOnly
    ? `ASSETCOV_BEGIN 档=source node=${process.version}（盘上解析，无网络探针）根=${norm(cfg.uploadsRoot)} + ${norm(join(cfg.backupRoot, "full-static"))}`
    : `ASSETCOV_BEGIN node=${process.version} 并发=${cfg.concurrency} 单发超时=${cfg.timeoutMs}ms`);
  const code = await (cfg.sourceOnly ? evaluateSource : evaluate)(cfg, (s) => console.log(s));
  console.log(`ASSETCOV_TIME ms=${Date.now() - t0}`);
  process.exit(code);
}
