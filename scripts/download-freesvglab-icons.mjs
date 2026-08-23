#!/usr/bin/env node
/**
 * download-freesvglab-icons.mjs — 「寻觅」v2 图标自动下载脚本
 *
 * 流程（已实测，2026-08-14）：
 *   1. 搜索页  https://freesvglab.com/zh/search?q={keyword}
 *      提取结果页中的 /zh/svg/flat-icon-{slug} 详情链接
 *   2. 详情页  https://freesvglab.com/zh/svg/flat-icon-{slug}
 *      提取 /images/vectors/flat_icon/{slug}.svg 直链
 *   3. 下载 SVG 并校验（真实矢量：包含 <path>/<circle>/<rect> 且非占位符）
 *   4. 校验失败/网络失败 → 回退复用 素材 目录既有图标（fallback 映射）
 *   5. 归一化 SVG（去 width/height、保留 viewBox、补 xmlns）
 *   6. 用 sharp 导出 tabBar 三态 PNG（81x81）：灰 #7A838D / 品牌绿 #34C98F / 中央白心
 *
 * 产物：
 *   apps/client/src/static/assets/icons/v2/*.svg   （归一化 SVG，中性色 #20242A）
 *   apps/client/src/static/assets/icons/tabbar/*.png（tabBar 三态）
 *   docs/design/icon-source.md                      （来源与回退记录）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CLIENT_SRC = path.join(ROOT, "apps", "client", "src");
const OUT_DIR = path.join(CLIENT_SRC, "static", "assets", "icons", "v2");
const TABBAR_DIR = path.join(CLIENT_SRC, "static", "assets", "icons", "tabbar");
const FALLBACK_ROOT = path.join(ROOT, "素材");
const DOCS_DIR = path.join(ROOT, "docs", "design");

const BASE = "https://freesvglab.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// 品牌色（v2 Token，与 theme 一致）
const COLOR_NEUTRAL = "#20242A";
const COLOR_INACTIVE = "#7A838D";
const COLOR_BRAND = "#34C98F";
const COLOR_WHITE = "#FFFFFF";

// 图标清单：name=目标文件名；queries=搜索词（按优先级）；fallback=素材相对路径
const ICONS = [
  { name: "discover", queries: ["compass", "discover"], fallback: path.join("匹配", "icons", "discover.svg") },
  { name: "nearby", queries: ["map-pin", "location", "nearby"], fallback: path.join("主页", "icons", "nearby.svg") },
  { name: "heart", queries: ["heart"], fallback: path.join("主页", "icons", "heart.svg") },
  { name: "chat", queries: ["chat", "speech-bubble", "message"], fallback: path.join("匹配", "icons", "chat.svg") },
  { name: "profile", queries: ["user", "account"], fallback: path.join("匹配", "icons", "profile.svg") },
  { name: "star", queries: ["star", "star-symbol"], fallback: path.join("匹配", "icons", "star.svg") },
  { name: "x", queries: ["close", "x-mark", "x"], fallback: path.join("匹配", "icons", "x.svg") },
  { name: "search", queries: ["search", "search-icon", "magnifier"], fallback: path.join("匹配", "icons", "search.svg") },
  { name: "edit", queries: ["pencil", "edit"], fallback: path.join("主页", "icons", "edit.svg") },
  { name: "more", queries: ["more-horizontal", "more", "dots"], fallback: path.join("匹配", "icons", "more.svg") },
  { name: "back", queries: ["arrow-left", "back"], fallback: path.join("匹配", "icons", "back.svg") },
  { name: "plus", queries: ["plus", "add"], fallback: path.join("主页", "icons", "plus.svg") },
  { name: "bell", queries: ["bell", "notification"], fallback: path.join("匹配", "icons", "bell.svg") },
  { name: "sliders", queries: ["sliders", "filter", "settings"], fallback: path.join("匹配", "icons", "sliders.svg") },
];

// 徽标类：直接复用素材，不参与下载
const REUSE = [
  { name: "verify", source: path.join("匹配", "icons", "verify.svg") },
  { name: "online", source: path.join("匹配", "icons", "online.svg") },
];

function log(...args) {
  console.log(...args);
}

import { get as httpsGet } from "node:https";
import { get as httpGet } from "node:http";

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? httpsGet : httpGet;
    const req = lib(url, { headers: { "user-agent": UA, accept: "text/html,*/*,image/svg+xml" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchText(res.headers.location).then(resolve, reject);
        res.resume();
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error(`timeout for ${url}`)));
  });
}

function tokenize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").split("-").filter(Boolean);
}

function pickSlug(html, queries) {
  const slugs = [...new Set([...html.matchAll(/\/zh\/svg\/flat-icon-([a-z0-9-]+)/g)].map((m) => m[1]))];
  if (!slugs.length) return null;
  // 评分：整词命中 > 子串命中；先按查询词顺序，再按第一个结果兜底
  let best = null;
  let bestScore = 0;
  for (const q of queries) {
    const qq = q.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const qTokens = tokenize(qq);
    for (const slug of slugs) {
      const tokens = tokenize(slug);
      // 要求查询词的所有 token 都在 slug 中命中（整词优先），避免「message-circle」错配成「circle」
      let hits = 0;
      for (const t of qTokens) {
        if (tokens.includes(t)) hits += 1;
      }
      if (hits === qTokens.length) {
        const score = hits * 2;
        if (score > bestScore) {
          bestScore = score;
          best = slug;
        }
      }
    }
    if (bestScore >= 2) return best;
  }
  // 没有高置信命中（≥2）时不盲选首个结果，交由调用方回退素材，避免张冠李戴
  return null;
}

function extractSvgPath(html, slug) {
  const re = new RegExp(`/images/vectors/flat_icon/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.svg`, "g");
  const hit = html.match(re);
  return hit ? hit[0] : null;
}

function isValidSvg(svg) {
  if (!svg || svg.length < 120) return false;
  // 真实矢量必须有图形节点；占位符（圆+文字）会被识别为缺 path/circle/rect 的纯文本或太短
  if (!/<(path|circle|rect|polygon|polyline|line|ellipse)[\s>]/i.test(svg)) return false;
  // 排除设计稿占位：纯 <text> 描述（如 "heart" 文字图标）
  if (!/<text[\s>]/i.test(svg)) return true;
  // 同时含图形与文字时仍视为有效（徽章类）
  return true;
}

function normalizeSvg(svg) {
  let out = svg
    .replace(/<\?xml[^>]*\?>\s*/i, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  out = out.replace(/\s(width|height)="[^"]*"/g, "");
  if (!out.includes("viewBox=")) {
    out = out.replace(/<svg([^>]*)>/, '<svg$1 viewBox="0 0 512 512">');
  }
  if (!out.includes("xmlns=")) {
    out = out.replace(/<svg([^>]*)>/, '<svg$1 xmlns="http://www.w3.org/2000/svg">');
  }
  return out;
}

function colorize(svg, color) {
  let out = svg.replace(/fill="([^"]*)"/g, (m, v) => (v.toLowerCase() === "none" ? m : `fill="${color}"`));
  out = out.replace(/stroke="([^"]*)"/g, (m, v) => (v.toLowerCase() === "none" ? m : `stroke="${color}"`));
  return out;
}

async function downloadIcon(entry) {
  let lastError = null;
  for (const q of entry.queries) {
    try {
      const searchUrl = `${BASE}/zh/search?q=${encodeURIComponent(q)}`;
      const searchHtml = await fetchText(searchUrl);
      const slug = pickSlug(searchHtml, [q]);
      if (!slug) {
        lastError = new Error(`no flat-icon result for "${q}"`);
        continue;
      }
      const detailUrl = `${BASE}/zh/svg/flat-icon-${slug}`;
      const detailHtml = await fetchText(detailUrl);
      const svgPath = extractSvgPath(detailHtml, slug);
      if (!svgPath) {
        lastError = new Error(`no svg link on ${detailUrl}`);
        continue;
      }
      const svg = await fetchText(`${BASE}${svgPath}`);
      if (!isValidSvg(svg)) {
        lastError = new Error(`invalid svg (placeholder?) for ${slug}`);
        continue;
      }
      return { source: "freesvglab", slug, url: `${BASE}${svgPath}`, svg: normalizeSvg(svg) };
    } catch (err) {
      lastError = err;
    }
  }
  // 回退：复用素材
  const fallbackFile = path.join(FALLBACK_ROOT, entry.fallback);
  if (!fs.existsSync(fallbackFile)) {
    throw new Error(`fallback missing: ${fallbackFile}; last error: ${lastError?.message}`);
  }
  const raw = fs.readFileSync(fallbackFile, "utf8");
  return { source: "fallback", slug: null, url: `素材/${entry.fallback}`, svg: normalizeSvg(raw) };
}

async function exportPng(svg, outFile, color, size = 81) {
  const colored = colorize(svg, color);
  await sharp(Buffer.from(colored)).resize(size, size).png().toFile(outFile);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TABBAR_DIR, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  const records = [];
  const svgs = {};

  log(`[icons] 开始下载 ${ICONS.length} 个核心图标 → ${path.relative(ROOT, OUT_DIR)}`);
  for (const entry of ICONS) {
    try {
      const rec = await downloadIcon(entry);
      const target = path.join(OUT_DIR, `${entry.name}.svg`);
      fs.writeFileSync(target, rec.svg, "utf8");
      svgs[entry.name] = rec.svg;
      records.push({ name: entry.name, source: rec.source, slug: rec.slug, url: rec.url, ok: true });
      log(`  ✓ ${entry.name}  <- ${rec.source}${rec.slug ? ` (${rec.slug})` : ""}`);
    } catch (err) {
      records.push({ name: entry.name, source: "failed", slug: null, url: String(err?.message || err), ok: false });
      log(`  ✗ ${entry.name}  ${err?.message || err}`);
    }
  }

  log(`[icons] 复用徽标（素材）`);
  for (const r of REUSE) {
    const src = path.join(FALLBACK_ROOT, r.source);
    if (fs.existsSync(src)) {
      const raw = fs.readFileSync(src, "utf8");
      const svg = normalizeSvg(raw);
      fs.writeFileSync(path.join(OUT_DIR, `${r.name}.svg`), svg, "utf8");
      svgs[r.name] = svg;
      records.push({ name: r.name, source: "reuse", slug: null, url: `素材/${r.source}`, ok: true });
      log(`  ✓ ${r.name}  <- 素材/${r.source}`);
    } else {
      records.push({ name: r.name, source: "failed", slug: null, url: `素材/${r.source} 不存在`, ok: false });
      log(`  ✗ ${r.name}  素材缺失: ${src}`);
    }
  }

  // 导出 tabBar PNG（失败不阻塞：至少保留 SVG 源）
  const tabDefs = [
    { file: "discover.png", icon: "discover", color: COLOR_INACTIVE },
    { file: "discover-active.png", icon: "discover", color: COLOR_BRAND },
    { file: "nearby.png", icon: "nearby", color: COLOR_INACTIVE },
    { file: "nearby-active.png", icon: "nearby", color: COLOR_BRAND },
    { file: "chat.png", icon: "chat", color: COLOR_INACTIVE },
    { file: "chat-active.png", icon: "chat", color: COLOR_BRAND },
    { file: "profile.png", icon: "profile", color: COLOR_INACTIVE },
    { file: "profile-active.png", icon: "profile", color: COLOR_BRAND },
    { file: "match-heart.png", icon: "heart", color: COLOR_WHITE },
    { file: "match-heart-active.png", icon: "heart", color: COLOR_WHITE },
    { file: "match-heart-brand.png", icon: "heart", color: COLOR_BRAND },
  ];
  log(`[icons] 导出 tabBar PNG（81x81）`);
  for (const def of tabDefs) {
    const svg = svgs[def.icon];
    if (!svg) {
      log(`  - ${def.file} 跳过（缺少 ${def.icon}.svg）`);
      continue;
    }
    try {
      await exportPng(svg, path.join(TABBAR_DIR, def.file), def.color);
      log(`  ✓ ${def.file}`);
    } catch (err) {
      log(`  ✗ ${def.file}  ${err?.message || err}`);
    }
  }

  // 来源记录
  const md = [
    "# 图标来源记录（freesvglab + 素材复用）",
    "",
    `> 生成时间：${new Date().toISOString()}`,
    "> 生成脚本：`scripts/download-freesvglab-icons.mjs`",
    "> 风格：freesvglab flat-icon（扁平实心）；徽标类直接复用 `素材` 既有图标。",
    "",
    "| 图标 | 来源 | slug / 回退 | URL |",
    "| --- | --- | --- | --- |",
    ...records.map(
      (r) => `| ${r.name} | ${r.source} | ${r.slug || "—"} | ${r.url.replace(/\|/g, "\\|")} |`
    ),
    "",
    "## 使用说明",
    "",
    "- tabBar 只支持 PNG：`static/assets/icons/tabbar/*.png`（灰 #7A838D / 品牌绿 #34C98F / 中央白心）。",
    "- 页内 `<image>` 使用 `static/assets/icons/v2/*.svg`（中性色 #20242A，需要品牌色时按需生成色变体）。",
    "- 徽标 verify / online 复用 `素材/匹配/icons`。",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(DOCS_DIR, "icon-source.md"), md, "utf8");

  // ---------- 运行态资源布局 ----------
  // freesvglab flat 图标是 VTracer 描摹位图（单文件可达 70~250KB），直接放进
  // static 会撑大 mp-weixin 主包。策略：
  //   1. 原始 SVG 统一归档到 docs/design/icon-src/（保留来源，不打包）
  //   2. static/icons/v2/ 只保留小体积 SVG（<=5KB，素材回退项）与 96px 运行态 PNG
  const SRC_ARCHIVE = path.join(DOCS_DIR, "icon-src");
  fs.mkdirSync(SRC_ARCHIVE, { recursive: true });
  const SMALL_SVG_LIMIT = 5 * 1024;
  const smallNames = [];
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (!f.endsWith(".svg")) continue;
    const abs = path.join(OUT_DIR, f);
    const size = fs.statSync(abs).size;
    const archiveTarget = path.join(SRC_ARCHIVE, f);
    fs.copyFileSync(abs, archiveTarget);
    if (size > SMALL_SVG_LIMIT) {
      fs.unlinkSync(abs);
    } else {
      smallNames.push(f.replace(/\.svg$/, ""));
    }
  }
  log(`[icons] SVG 归档 → docs/design/icon-src/（${records.length} 个）；static 保留小 SVG：${smallNames.join(", ") || "无"}`);

  const V2_PNG_DIR = OUT_DIR; // 与 SVG 同目录：v2/*.png
  const v2Defs = [
    ...ICONS.map((e) => ({ file: `${e.name}.png`, icon: e.name, color: COLOR_NEUTRAL })),
    ...REUSE.map((e) => ({ file: `${e.name}.png`, icon: e.name, color: COLOR_NEUTRAL })),
    // 品牌色变体（供动作按钮/浮岛使用）
    { file: "heart-pink.png", icon: "heart", color: "#F35C9D" },
    { file: "heart-white.png", icon: "heart", color: COLOR_WHITE },
    { file: "heart-brand.png", icon: "heart", color: COLOR_BRAND },
    { file: "star-blue.png", icon: "star", color: "#4D8DFF" },
    { file: "x-gray.png", icon: "x", color: "#7A838D" },
  ];
  log(`[icons] 导出 v2 运行态 PNG（96x96）`);
  for (const def of v2Defs) {
    const svgFile = path.join(SRC_ARCHIVE, `${def.icon}.svg`);
    if (!fs.existsSync(svgFile)) continue;
    const raw = fs.readFileSync(svgFile, "utf8");
    try {
      await exportPng(normalizeSvg(raw), path.join(V2_PNG_DIR, def.file), def.color, 96);
      log(`  ✓ ${def.file}`);
    } catch (err) {
      log(`  ✗ ${def.file}  ${err?.message || err}`);
    }
  }

  const failed = records.filter((r) => !r.ok);
  log(`[icons] 完成：${records.length - failed.length}/${records.length} 成功；记录 → docs/design/icon-source.md`);
  if (failed.length) {
    log(`[icons] 失败项：${failed.map((f) => f.name).join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});








