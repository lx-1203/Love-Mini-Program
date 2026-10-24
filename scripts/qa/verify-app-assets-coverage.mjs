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
 * 四条判据（每条都有机器可读行，前缀 ASSETCOV_）：
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
 *
 * 用法：node scripts/qa/verify-app-assets-coverage.mjs
 *         [--buckets apps/client/config/cdn-buckets.json] [--static apps/client/src]
 *         [--base http://127.0.0.1:8080/api/v1/media/app-assets/] [--dist apps/client/dist/build/mp-weixin]
 *         [--concurrency 8] [--timeout-ms 15000] [--selftest]
 *       必须 Node >= 20（裸 node 是微信自带 v16，没有全局 fetch ⇒ 本门自己会大声 exit 2，不给假绿）。
 *
 * 退出码：0 = 四条全过；1 = 有硬缺陷（缺 / 漂 / 反向泄漏 / 空集）；2 = 前置件读不到或探针不可用
 *         （"量不到"和"没问题"绝不共用一个输出，本仓铁律）。
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

/* ── 探针可用性前置闸：老 node / 无 fetch 时必须 exit 2，不能"跑不起来所以 0 问题" ─────────── */
const PROBE_READY = typeof fetch === "function" && typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function";

/* 拼错的旗标会被 arg() 当成"没传"而静默回落默认路径 —— 那正好制造"按 mock 产物判 real 守恒"这种
   看起来像绿的假读数。宁可 exit 2。 */
const KNOWN_FLAGS = ["buckets", "static", "base", "dist", "concurrency", "timeout-ms", "backup", "selftest"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN_FLAGS.includes(a.slice(2)));
  if (bad.length) {
    console.log(`ASSETCOV_RESULT=ERROR reason=未知旗标 ${bad.join(",")} ⇒ 本门只认 ${KNOWN_FLAGS.join(",")}（被忽略的旗标会让被测物静默换成默认路径）`);
    process.exit(2);
  }
}
if (!PROBE_READY) {
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
  const dir = join(staticRoot, prefix.replace(/\/+$/, ""));
  if (!existsSync(dir)) return { dir, dirMissing: true, files: [] };
  const files = walkFiles(dir).map((abs) => {
    const relPkg = norm(prefix + abs.slice(dir.length + 1).split(sep).join("/"));
    let bytes = null, sha = null, csha = null, readErr = null;
    try {
      const buf = readFileSync(abs);
      bytes = buf.byteLength;
      sha = sha8(buf);
      csha = cmpHash(buf, relPkg);
    } catch (e) { readErr = e.message; }
    return { abs, relPkg, urlRel: relPkg.slice("static/".length), bytes, sha, csha, readErr };
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
    say(`ASSETCOV_RESULT=FAIL 分母=${tot.n} 404=${tot.missing} DRIFT=${tot.drift} 其它状态=${tot.other} 空集桶=${buckets.filter((b) => !b.files.length).length} 反向命中=${rev.hits}（另量不到 ${tot.net} 个）⇒ ${problems.join("；")}`);
    return 1;
  }
  if (unmeasured.length || rev.notEvidence) {
    say(`ASSETCOV_RESULT=ERROR 分母=${tot.n} 200同字节=${tot.ok} 404=0 DRIFT=0 但 ${[...unmeasured, rev.notEvidence || ""].filter(Boolean).join("；")} ⇒ 量不到 ≠ 达标`);
    return 2;
  }
  say(`ASSETCOV_RESULT=PASS 分母=${tot.n}（${buckets.length} 桶逐件 HTTP 探测，无抽样）200同字节=${tot.ok} 404=0 DRIFT=0 其它状态=0 空集桶=0 反向命中=0 输入树比对=${src.cmp}${src.eolOnly ? `（其中仅行尾差=${src.eolOnly}，已按类型归一判一致）` : ""} 守恒证据=${rev.evidence}`);
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
    concurrency: Math.max(1, Math.min(32, Number(arg("concurrency", DEFAULTS.concurrency)) || DEFAULTS.concurrency)),
    timeoutMs: Math.max(500, Number(arg("timeout-ms", DEFAULTS.timeoutMs)) || DEFAULTS.timeoutMs),
  };
}

/* ── --selftest：注入坏件必须各自翻红，撤掉必须翻绿（真起一个临时 HTTP 服务，不 mock 判定本身）── */
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

  const note = mut ? mut({ root, dist, caseDir, bucketsPath, srv, backup, mkin }) : null;
  return { root, dist, bucketsPath, srv, backup, note };
}

const ACTIVE = { srv: {} };

async function selftest() {
  rmSync(FIX_ROOT, { recursive: true, force: true });
  mkdirSync(FIX_ROOT, { recursive: true });

  const server = createServer((req, res) => {
    const rel = decodeURIComponent(String(req.url || "").replace(/^\/+/, "").replace(/^api\/v1\/media\/app-assets\//, ""));
    const buf = ACTIVE.srv[rel];
    if (!buf) { res.writeHead(404, { "content-type": "application/json" }); res.end('{"error":"NOT_FOUND"}'); return; }
    res.writeHead(200, { "content-type": "application/octet-stream" }); res.end(buf);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
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

  await new Promise((r) => server.close(r));
  const bad = cases.filter((x) => !x).length;
  console.log(`ASSETCOV_SELFTEST 用例=${cases.length} 通过=${cases.length - bad} 失败=${bad} 注入坏件类=9（后端缺件404 / 后端字节不符 / 桶目录空集 / 清单cdnPrefixes空 / 产物对localPrefixes的http引用 / 量不到四例[产物缺·档位非real·后端不可达·备份根缺失] / 输入树桶内容与包内不符 / 桶独有件 / 桶漂移+后端不可达）另含 1 例输入树正例（仅行尾差判绿）。每类都跑了"注入→红"与"撤掉→绿"`);
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
  console.log(`ASSETCOV_BEGIN node=${process.version} 并发=${cfg.concurrency} 单发超时=${cfg.timeoutMs}ms`);
  const code = await evaluate(cfg, (s) => console.log(s));
  console.log(`ASSETCOV_TIME ms=${Date.now() - t0}`);
  process.exit(code);
}
