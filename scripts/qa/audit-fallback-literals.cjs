"use strict";
/**
 * audit-fallback-literals.cjs — 量「var(--已登记的档, 兜底字面量)」里兜底字面量与档值不相等的条数。
 *
 * 与既有门的分工：
 *   scripts/check-token-refs.mjs 查的是「var(--x) 指向不存在的档」（现值 errors=0 warns=0）；
 *   本量具查的是另一半 —— 档存在、但兜底字面量与档值分叉。它平时是死代码，一旦该档因故缺失
 *   或被误删登记，就会静默渲染成那个错值（实例：settings/index.vue 的 --c-tint-pink-50 真值 #FCE4EC，
 *   兜底写成了紫 #F3E8FF）。
 *
 * 五处坑（前三处是上一版量具的真死因），本文件的对应做法：
 *   1. 取值器：不在 SCSS 源码上正则取 `#{$x}`，而是用 apps/client/node_modules/sass 编译后
 *      解析 CSS（自定义解析器带括号/字符串栈，不受 `{`、`@charset`、压缩产物边界影响）；
 *      同一档在多个 `page{}` 块里重复登记时按 CSS 层叠取「最后一次定义」＝运行时真值。
 *      （上一版 valOf 用 `new RegExp("(^|[\s;])" + …)`：字符串里的 `\s` 会被 JS 吃成 `s`，
 *       正则整个失效 ⇒ 3542 条全量「未解析」＝读数为 0。本文件一律用字面量正则 + 解析器。）
 *   2. var() 解析：手工按顶层逗号切参（深度计数），rgba(...)/env(...)/嵌套 var(...) 都不会被截断。
 *   3. 文件集：git ls-files 会列出工作树里已不存在的 tracked 文件 ⇒ 逐个 existsSync 后再读，
 *      并单独数出「跳过(已删除)」条数；另用同一正则口径复量「剥注释前/剥注释后/逐条解析」三个数，
 *      证明少掉的只在注释里。
 *   4. 自指兜底假绿：`var(--x, var(--x, #F3E8FF))`（本轮漂移里有 37 条兜底还嵌着 var()，其中 25 条
 *      就是这种同档自指）不能把内层 --x 取成 --x 的登记值再判「等值」——档缺失时内外一起缺失，
 *      真正会渲染的是那个字面量。expandVars 对外层档自己出现时强制落到它的字面量，夹具里有一条专测。
 *   5. 归一化不能只做字符串折叠：2s 与 2000ms 等值、#FFF/#ffffff 等值、rgba(1, 2, 3, .4) 与
 *      rgba(1,2,3,0.4) 等值，而 rpx 与 px 不等值（uni-app 里是两个量纲）。
 *
 * 输出（机器可读，全在 tmp/audit-fallback-literals.report.txt）：
 *   FALLBACKLIT 带兜底引用=N 等值=A 漂移=B 未解析=0     ← 未解析＝档在登记处却取不到字面值，必须为 0
 *   FALLBACKLIT-CHECK / -COUNT / -分档 / -分组 / -不可判 / -进门候选口径
 *   漂移逐条：文件:行 档名 档值 兜底 | 幅度证据
 * 报告用 UTF-8 落盘（控制台 GBK），Read 那个文件即可。
 *
 * 用法：
 *   D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/audit-fallback-literals.cjs
 *   ... --self-test        判据自证（夹具必须能变红，防 vacuous-green）
 *   ... --limit=N          明细打印条数（默认 40）
 * 只读：不改任何 src/scripts/deliverables 文件。
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const CLIENT = path.join(ROOT, "apps", "client");
const SRC_REL = "apps/client/src";
const REPORT = path.join(ROOT, "tmp", "audit-fallback-literals.report.txt");
const sass = require(path.join(CLIENT, "node_modules", "sass"));

const REGISTRY_SCSS = ["apps/client/src/theme/design-variables.scss", "apps/client/src/styles/tokens.scss"];
/** 登记处之外的合法定义点（与 check-token-refs.mjs 的合法来源口径一致，只用于「档查无」的归因，不作主判据）。 */
const OTHER_REGISTRY = ["apps/client/src/theme/global.scss", "apps/client/src/theme/animations.scss", "apps/client/src/App.vue"];
/** uni-app / 小程序容器注入，源码里没有值。 */
const PLATFORM = new Set(["--status-bar-height", "--window-top", "--window-bottom", "--navbar-height"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".mimosa", "static", "tests"]);
const EXT = /\.(vue|scss|css|ts)$/i;

/* ────────────────────────── 注释剥离（保留行数） ────────────────────────── */
function blank(m) {
  return m.replace(/[^\r\n]/g, " ");
}
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:"'`\\])\/\/[^\r\n]*/g, "$1");
}

/* ────────────────────────── CSS 解析（编译后） ────────────────────────── */
/** 顶层（括号外、字符串外）第一个冒号的位置；找不到返回 -1。 */
function topLevelColon(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      i++;
      while (i < text.length && text[i] !== ch) {
        if (text[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ":" && depth === 0) return i;
  }
  return -1;
}

/** 把一段 CSS 解析成 {context:[…自外向内的选择器/at-rule], prop, value} 列表。 */
function parseCss(css) {
  const out = [];
  const stack = [];
  let buf = "";
  let i = 0;
  const flush = () => {
    const t = buf.trim();
    buf = "";
    if (!t) return;
    const ci = topLevelColon(t);
    if (ci < 0) return;
    const prop = t.slice(0, ci).trim();
    if (!prop.startsWith("--")) return;
    out.push({ context: stack.slice(), prop, value: t.slice(ci + 1).trim() });
  };
  while (i < css.length) {
    const ch = css[i];
    if (ch === "/" && css[i + 1] === "*") {
      const e = css.indexOf("*/", i + 2);
      i = e < 0 ? css.length : e + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const s = i;
      i++;
      while (i < css.length && css[i] !== ch) {
        if (css[i] === "\\") i++;
        i++;
      }
      buf += css.slice(s, i + 1);
      i++;
      continue;
    }
    if (ch === "{") {
      stack.push(buf.trim());
      buf = "";
      i++;
      continue;
    }
    if (ch === "}") {
      flush();
      stack.pop();
      i++;
      continue;
    }
    if (ch === ";") {
      flush();
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

const isDarkContext = (ctx) =>
  ctx.some((c) => {
    if (/^@media/i.test(c) && /prefers-color-scheme\s*:\s*dark/i.test(c)) return true;
    return /\[data-theme\s*=\s*["']?dark/i.test(c) || /\.theme-dark\b/.test(c);
  });

/* ────────────────────────── 编译登记处，建档位真值表 ────────────────────────── */
const quietLogger = { warn() {}, debug() {} };
function compileAbs(abs) {
  return sass.compile(abs, { loadPaths: [path.join(ROOT, SRC_REL)], quiet: true, logger: quietLogger }).css;
}

/** token -> { values:[按定义顺序], last, darkLast, src } */
const registry = new Map();
function feedRegistry(abs, label) {
  let css;
  try {
    css = compileAbs(abs);
  } catch (e) {
    console.log("COMPILE_FAIL " + label + " " + String(e.message).split("\n")[0]);
    process.exit(2);
  }
  const decls = parseCss(css);
  const base = [];
  const dark = [];
  for (const d of decls) (isDarkContext(d.context) ? dark : base).push(d);
  for (const d of base) {
    let e = registry.get(d.prop);
    if (!e) {
      e = { values: [], last: d.value, where: label, darkLast: null };
      registry.set(d.prop, e);
    }
    if (e.last !== d.value) e.values.push(e.last);
    e.last = d.value;
    e.where = label;
  }
  for (const d of dark) {
    const e = registry.get(d.prop) || { values: [], last: d.value, where: label, darkLast: null };
    e.darkLast = d.value;
    registry.set(d.prop, e);
  }
  return { css, declCount: decls.length };
}

for (const rel of REGISTRY_SCSS) feedRegistry(path.join(ROOT, rel), path.basename(rel));
const registrySize = registry.size;
if (registrySize < 200) {
  console.log("AUDIT=NOT-EVIDENCED reason=登记处只解析出 " + registrySize + " 个档（取值器坏了，不是档少了）");
  process.exit(2);
}

/* 别名链展开：--a: var(--b) ⇒ 真值取 --b 的；带环保护；b 不在登记处时退回 src 里的定义值。 */
function lookupAnywhere(prop) {
  const e = registry.get(prop);
  if (e) return e.last;
  const g = globalDef.get(prop);
  if (g) return g.value;
  const o = otherReg.get(prop);
  return o ? o.value : null;
}
function resolveRegistry(prop, seen) {
  const s = seen || new Set();
  if (s.has(prop)) return null;
  s.add(prop);
  const e = registry.get(prop);
  if (!e) return null;
  let v = e.last;
  let guard = 0;
  while (/^var\(/i.test(v) && guard++ < 8) {
    const args = splitVarArgs(v);
    if (!args) return v;
    const inner = lookupAnywhere(args[0].trim());
    if (inner === null) return args.length > 1 ? resolveRegistryValue(args.slice(1).join(",").trim()) : v;
    v = inner;
  }
  return v;
}
function resolveRegistryValue(v) {
  let cur = String(v).trim();
  let guard = 0;
  while (/^var\(/i.test(cur) && guard++ < 8) {
    const args = splitVarArgs(cur);
    if (!args) return cur;
    const inner = lookupAnywhere(args[0].trim());
    if (inner === null) return args.length > 1 ? resolveRegistryValue(args.slice(1).join(",").trim()) : cur;
    cur = inner;
  }
  return cur;
}

/* ────────────────────────── var() 顶层切参（支持任意嵌套） ────────────────────────── */
/** text[openIdx] === '(' ⇒ 返回参数数组（顶层逗号切分）；未闭合返回 null。 */
function readVarCall(text, openIdx) {
  let depth = 0;
  let i = openIdx;
  const args = [];
  let cur = "";
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      cur += ch;
      i++;
      while (i < text.length && text[i] !== q) {
        if (text[i] === "\\") {
          cur += text[i];
          i++;
        }
        cur += text[i];
        i++;
      }
      cur += text[i] || "";
      i++;
      continue;
    }
    if (ch === "(") {
      depth++;
      if (depth > 1) cur += ch;
      i++;
      continue;
    }
    if (ch === ")") {
      depth--;
      if (depth === 0) {
        args.push(cur);
        return { args, end: i };
      }
      cur += ch;
      i++;
      continue;
    }
    if (ch === "," && depth === 1) {
      args.push(cur);
      cur = "";
    } else cur += ch;
    i++;
  }
  return null;
}
function splitVarArgs(text) {
  const k = text.indexOf("(");
  if (k < 0) return null;
  const r = readVarArgsOnly(text, k);
  return r ? r.args : null;
}
function readVarArgsOnly(text, openIdx) {
  return readVarCall(text, openIdx);
}

/* ────────────────────────── 归一化 ────────────────────────── */
const NAMED = new Map([
  ["white", "#ffffff"], ["black", "#000000"], ["red", "#ff0000"], ["green", "#008000"],
  ["blue", "#0000ff"], ["transparent", "rgba(0,0,0,0)"], ["inherit", "inherit"],
  ["currentColor", "currentcolor"], ["none", "none"],
]);
function num(x) {
  let v = parseFloat(x);
  if (!isFinite(v)) return NaN;
  return v;
}
function chan(v, max) {
  let n = num(v);
  if (!isFinite(n)) return NaN;
  if (/%$/.test(String(v).trim())) n = (n / 100) * max;
  return Math.min(max, Math.max(0, Math.round(n)));
}
function hex3(s) {
  const d = s.replace(/^#/, "");
  if (d.length === 3 || d.length === 4) return d.split("").map((c) => c + c).join("");
  return d;
}
function toRgba(v) {
  const s = String(v).trim().toLowerCase();
  if (/^#[0-9a-f]{3,8}$/.test(s)) {
    const d = hex3(s);
    if (d.length !== 6 && d.length !== 8) return null;
    const r = parseInt(d.slice(0, 2), 16);
    const g = parseInt(d.slice(2, 4), 16);
    const b = parseInt(d.slice(4, 6), 16);
    const a = d.length === 8 ? parseInt(d.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  if (NAMED.has(s)) return toRgba(NAMED.get(s));
  let m = /^rgba?\(([^)]*)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[,/\s]+/).filter(Boolean);
    if (p.length < 3) return null;
    const a = p.length > 3 ? num(p[3]) / (/%$/.test(p[3]) ? 100 : 1) : 1;
    return { r: chan(p[0], 255), g: chan(p[1], 255), b: chan(p[2], 255), a: isFinite(a) ? a : 1 };
  }
  m = /^hsla?\(([^)]*)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[,/\s]+/).filter(Boolean);
    if (p.length < 3) return null;
    const h = num(p[0]) / 360;
    const sv = num(p[1].replace(/%$/, "")) / 100;
    const l = num(p[2].replace(/%$/, "")) / 100;
    const a = p.length > 3 ? num(p[3]) : 1;
    const f = (n) => {
      const k = (n + h * 12) % 12;
      const c = sv * Math.min(l, 1 - l);
      return Math.round(255 * (l - c * Math.max(-1, Math.min(Math.min(k - 3, 9 - k, 1), 1))));
    };
    return { r: f(0), g: f(8), b: f(4), a: isFinite(a) ? a : 1 };
  }
  return null;
}
function rgbToHex(c) {
  const h = (n) => n.toString(16).padStart(2, "0");
  return "#" + h(c.r) + h(c.g) + h(c.b);
}
function hue(c) {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return null;
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return (h + 360) % 360;
}
function lightness(c) {
  const mx = Math.max(c.r, c.g, c.b) / 255;
  const mn = Math.min(c.r, c.g, c.b) / 255;
  return (mx + mn) / 2;
}
function chroma(c) {
  return (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
}
function trimNum(x) {
  let s = String(x);
  if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s === "-0" ? "0" : s;
}
/** 归一化：大小写/空白/十六进制展开/rgb↔hex/.4↔0.4/整数单位无关的数值写法。 */
function normVal(v) {
  if (v === null || v === undefined) return "";
  let s = String(v).trim().toLowerCase();
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  s = s.replace(/#[0-9a-f]{3,8}\b/g, (m) => {
    const d = hex3(m);
    return "#" + d;
  });
  s = s.replace(/rgba?\(([^)]*)\)/g, (_, inner) => {
    const p = inner.split(/[,/\s]+/).filter(Boolean).map((x) => trimNum(String(x).replace(/^0+(?=\d)/, "")));
    if (p.length < 3) return "rgb(" + p.join(",") + ")";
    const c = chan(p[0], 255), g = chan(p[1], 255), b = chan(p[2], 255);
    if (p.length === 3 || num(p[3]) === 1) return rgbToHex({ r: c, g, b });
    return "rgba(" + [c, g, b, trimNum(num(p[3]))].join(",") + ")";
  });
  s = s.replace(/#[0-9a-f]{8}\b/g, (m) => (/ff$/.test(m) ? m.slice(0, 7) : m));
  // 时长归一到 ms（2s == 2000ms）；rpx/px 不折算（uni-app 里两者语义不同，属真差异）
  s = s.replace(/(^|[\s,(])(\d*\.?\d+)s(?![a-z0-9-])/g, (_, pre, n) => pre + trimNum(num(n) * 1000) + "ms");
  // 空白归一：括号紧贴、逗号无空格、其余折叠成单个空格（保留多段值如 box-shadow 的可分辨性）
  s = s.replace(/\s*\(/g, "(").replace(/\)\s*/g, ")").replace(/\s*,\s*/g, ",").replace(/\s+/g, " ").trim();
  return NAMED.has(s) ? NAMED.get(s) : s;
}
function equalVal(a, b) {
  const na = normVal(a), nb = normVal(b);
  if (na && nb && na === nb) return true;
  const ca = toRgba(na), cb = toRgba(nb);
  if (ca && cb) return ca.r === cb.r && ca.g === cb.g && ca.b === cb.b && Math.abs(ca.a - cb.a) < 0.005;
  return false;
}
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m + n;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/* ────────────────────────── 漂移分档 ────────────────────────── */
const SINGLE_NUM = /^-?\d*\.?\d+(rpx|px|em|rem|vh|vw|%|ms|s|deg|fr)?$/;
/** 非色值：先剥掉 rgba 的透明度看骨架，同骨架 ⇒ 差在数值/透明度；骨架不同 ⇒ 结构不同。
 *  注意：标量（ms/rpx…）改一位可能就是几十个百分点，不算「手抄」，一律留非色值档，手抄档只收色值。 */
function classifyNonColor(na, nb, charDiff) {
  const A = SINGLE_NUM.test(na);
  const B = SINGLE_NUM.test(nb);
  if (A && B) {
    const ua = na.replace(SINGLE_NUM, "$1") || "";
    const ub = nb.replace(SINGLE_NUM, "$1") || "";
    if (ua !== ub) return { bucket: "非色值-单位不同", note: "量纲就不同 " + na + " vs " + nb };
    const a = num(na);
    const b = num(nb);
    const rel = Math.max(Math.abs(a), Math.abs(b)) ? Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) : 0;
    return { bucket: "非色值-数值不同", note: "差=" + trimNum(Math.abs(a - b)) + (ua || "") + " 相对差=" + (rel * 100).toFixed(0) + "%" };
  }
  const dropAlpha = (s) => s.replace(/rgba\(([^()]*)\)/g, (_, inner) => {
    const p = inner.split(",");
    return p.length >= 4 ? "rgb(" + p.slice(0, 3).join(",") + ")" : "rgb(" + inner + ")";
  });
  if (na.replace(/-?\d*\.?\d+/g, "#") === nb.replace(/-?\d*\.?\d+/g, "#")) {
    if (dropAlpha(na) === dropAlpha(nb)) {
      const fa = /rgba\([^,]+,[^,]+,[^,]+,\s*([^)]+)\)/.exec(na);
      const fb = /rgba\([^,]+,[^,]+,[^,]+,\s*([^)]+)\)/.exec(nb);
      return { bucket: "仅透明度", note: "同骨架只差 a=" + (fa ? fa[1].trim() : "?") + "→" + (fb ? fb[1].trim() : "?") };
    }
    return { bucket: "非色值-数值不同", note: "同骨架不同数值 " + na + " vs " + nb };
  }
  return { bucket: "非色值-结构不同", note: "多段结构不同 " + na + " vs " + nb };
}
/** 返回 { bucket, note }。色值档：跨色相 / 同族深浅 / 仅透明度 / 一两位手抄 / 近值其他；非色档见 classifyNonColor。
 *  传入的 lit 应已把内嵌 var(--x, lit) 展开成字面量（expandVars），否则落进非色档。 */
function classifyDrift(tokenVal, lit) {
  const na = normVal(tokenVal);
  const nb = normVal(lit);
  const charDiff = na.length === nb.length ? [...na].filter((c, i) => c !== nb[i]).length : lev(na, nb);
  const a = toRgba(na);
  const b = toRgba(nb);
  if (!a || !b) return classifyNonColor(na, nb, charDiff);
  const maxChan = Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
  if (maxChan === 0 && Math.abs(a.a - b.a) >= 0.005) return { bucket: "仅透明度", note: "a=" + trimNum(a.a) + "→" + trimNum(b.a) };
  const ha = hue(a), hb = hue(b);
  const ca = chroma(a), cb = chroma(b);
  const aGray = ca < 0.06;
  const bGray = cb < 0.06;
  const bothHex = /^#[0-9a-f]{6}$/.test(na) && /^#[0-9a-f]{6}$/.test(nb);
  if ((bothHex || (SINGLE_NUM.test(na) && SINGLE_NUM.test(nb))) && charDiff <= 2 && maxChan <= 48) {
    return { bucket: "一两位手抄", note: "字面差=" + charDiff + " 通道差≤" + maxChan };
  }
  if (aGray || bGray) {
    const dlAbs = Math.abs(lightness(a) - lightness(b));
    if (dlAbs >= 0.45) return { bucket: "明暗反转", note: "一侧近亮一侧近暗 明度差=" + dlAbs.toFixed(3) + " " + na + " vs " + nb };
  }
  if (aGray !== bGray) return { bucket: "跨色相", note: "一侧近灰一侧有色 (c=" + trimNum(ca) + "/" + trimNum(cb) + ")" };
  if (!aGray && !bGray) {
    let dh = Math.abs(ha - hb);
    dh = Math.min(dh, 360 - dh);
    if (dh > 30) {
      const dl = Math.abs(lightness(a) - lightness(b));
      return { bucket: "跨色相", note: "色相差=" + Math.round(dh) + "° 明度差=" + dl.toFixed(3) };
    }
    const dl = Math.abs(lightness(a) - lightness(b));
    const dc = Math.abs(ca - cb);
    if (dl >= 0.04 || dc >= 0.08) return { bucket: "同族深浅", note: "同色相 明度差=" + dl.toFixed(3) + " 彩度差=" + dc.toFixed(3) };
    return { bucket: "近值其他", note: "色相差=" + Math.round(dh) + "° 通道差=" + maxChan };
  }
  const dl = Math.abs(lightness(a) - lightness(b));
  if (dl >= 0.04) return { bucket: "同族深浅", note: "双灰 明度差=" + dl.toFixed(3) };
  return { bucket: "近值其他", note: "双灰 通道差=" + maxChan };
}

/* ────────────────────────── 文件集（跳过已删除的 tracked 文件） ────────────────────────── */
function listTracked() {
  let raw;
  try {
    raw = execFileSync("git", ["-C", ROOT, "-c", "core.quotepath=off", "ls-files", SRC_REL], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    console.log("AUDIT=NOT-EVIDENCED reason=git ls-files 失败 " + String(e.message).split("\n")[0]);
    process.exit(2);
  }
  return raw.split(/\r?\n/).filter(Boolean);
}

const all = listTracked();
let untrackedCount = 0;
try {
  untrackedCount = execFileSync("git", ["-C", ROOT, "-c", "core.quotepath=off", "ls-files", "--others", "--exclude-standard", SRC_REL], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split(/\r?\n/)
    .filter((f) => f && EXT.test(f) && !SKIP_DIRS.has(f.split("/")[3] || "")).length;
} catch {
  untrackedCount = -1;
}
const inExt = all.filter((f) => EXT.test(f));
const missing = inExt.filter((f) => !fs.existsSync(path.join(ROOT, f)));
const scanned = inExt.filter((f) => fs.existsSync(path.join(ROOT, f)) && !SKIP_DIRS.has(f.split("/")[3] || ""));

/* 兜底用：登记处之外定义的档（其他登记处 + 组件内局部定义 + 运行时注入），只做归因不当主判据。 */
const otherReg = new Map();
for (const rel of OTHER_REGISTRY) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  for (const m of stripComments(fs.readFileSync(abs, "utf8")).matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;\r\n]+)/g)) {
    if (!otherReg.has(m[1])) otherReg.set(m[1], { value: m[2].trim(), where: path.basename(rel) });
  }
}
const localDef = new Map(); // "file::--tok" -> value
const globalDef = new Map(); // "--tok" -> {value, file}（按优先级挑一条）
const defCands = new Map(); // "--tok" -> [{file,value}]
const injected = new Set();
const texts = new Map();
const rawTexts = new Map();
const rawLinesMap = new Map();
const PRIO = ["apps/client/src/App.vue", "apps/client/src/theme/global.scss", "apps/client/src/theme/animations.scss"];
for (const rel of scanned) {
  const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const t = stripComments(raw);
  texts.set(rel, t);
  rawTexts.set(rel, raw);
  rawLinesMap.set(rel, raw.split(/\r?\n/));
  for (const m of t.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;}\r\n"']+)/g)) {
    const val = m[2].trim();
    if (/\$\{/.test(val)) continue; // 运行时拼接出来的值不是静态字面量，不可比
    const k = rel + "::" + m[1];
    if (!localDef.has(k)) localDef.set(k, val);
    if (!defCands.has(m[1])) defCands.set(m[1], []);
    defCands.get(m[1]).push({ file: rel, value: val });
  }
  for (const m of t.matchAll(/["'`](--[A-Za-z0-9_-]+)["'`]\s*:/g)) injected.add(m[1]);
  for (const m of t.matchAll(/setProperty\(\s*["'`](--[A-Za-z0-9_-]+)["'`]/g)) injected.add(m[1]);
}
for (const [tok, list] of defCands) {
  const sorted = list.slice().sort((a, b) => {
    const pa = PRIO.indexOf(a.file);
    const pb = PRIO.indexOf(b.file);
    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
  });
  globalDef.set(tok, sorted[0]);
}
/** 行内或紧邻上一非空行有 token-audit:ignore ⇒ 与既有门同一豁免口径（宿主注入契约，无静态真值可比）。 */
function isIgnoredLine(rel, line) {
  const lines = rawLinesMap.get(rel) || [];
  const cur = lines[line - 1] || "";
  const prev = lines.slice(0, line - 1).reverse().find((l) => l.trim()) || "";
  return /token-audit:ignore/.test(cur) || /token-audit:ignore/.test(prev);
}

/* ────────────────────────── 主判据 ────────────────────────── */
function auditText(text) {
  const rows = [];
  let noFallback = 0;
  for (const m of text.matchAll(/\bvar\(\s*(--[A-Za-z0-9_-]+)/g)) {
    const tok = m[1];
    const openIdx = text.indexOf("(", m.index + m[0].indexOf("v"));
    const call = readVarCall(text, openIdx);
    if (!call) continue;
    if (call.args.length < 2) {
      noFallback++;
      continue;
    }
    const line = text.slice(0, m.index).split("\n").length;
    rows.push({ tok, line, fallback: call.args.slice(1).join(",").trim() });
  }
  return { rows, noFallback };
}

/** 把值里整体出现的 var(--x) 别名展开成可比较的字面值（登记处优先，其次 src 静态定义，再次兜底环）。 */
function resolveValue(v, seen) {
  if (v === null || v === undefined) return null;
  const trail = seen || new Set();
  let cur = String(v).trim();
  let guard = 0;
  while (/^var\(/i.test(cur) && guard++ < 8) {
    const args = splitVarArgs(cur);
    if (!args) return cur;
    const tok = args[0].trim();
    if (trail.has(tok)) return cur;
    trail.add(tok);
    const inner = lookupAnywhere(tok);
    if (inner === null) return args.length > 1 ? resolveValue(args.slice(1).join(",").trim(), trail) : cur;
    cur = String(inner).trim();
  }
  return cur;
}
/** 把串里**内嵌**的 var(--y, lit) 就地换成可比较的字面量（阴影串常这么写）。
 *  forbidden＝外层那个档：它自己再出现时**不能**取登记处值（档缺失时自己也缺失），要落到它自己的字面量。 */
function expandVars(v, guard, forbidden) {
  if (v === null || v === undefined) return null;
  let s = String(v);
  let rounds = guard || 0;
  while (rounds++ < 10) {
    let changed = false;
    let out = "";
    let i = 0;
    while (i < s.length) {
      const m = /\bvar\(/i.exec(s.slice(i));
      if (!m) {
        out += s.slice(i);
        break;
      }
      const start = i + m.index;
      const openIdx = s.indexOf("(", start);
      out += s.slice(i, start);
      const call = readVarCall(s, openIdx);
      if (!call) {
        out += s.slice(start);
        break;
      }
      const tok = call.args[0].trim();
      const self = forbidden && forbidden.has(tok);
      let rep = !self && registry.has(tok) ? resolveRegistry(tok) : null;
      if (rep === null && call.args.length > 1) rep = expandVars(call.args.slice(1).join(","), rounds + 1, forbidden);
      if (rep === null || /\$\{/.test(String(rep))) {
        // 展不开（未登记 / 运行时插值）：原样保留这一处，继续往后扫
        out += s.slice(start, call.end + 1);
        i = call.end + 1;
        continue;
      }
      out += " " + String(rep).trim() + " ";
      i = call.end + 1;
      changed = true;
    }
    s = out.replace(/\s+/g, " ").trim();
    if (!changed) break;
  }
  return s;
}

function judge(tok, fallback, file, ignored) {
  // 1) 主口径：两个登记处编译后的真值（带兜底的 var() 只有在档取不到可比较字面量时才记未解析）
  if (registry.has(tok)) {
    const tv = resolveRegistry(tok);
    if (tv === null || tv === "" || /^var\(/i.test(expandVars(tv, 0, new Set([tok])))) return { cls: "未解析", tokenVal: tv, scope: "登记处取值失败" };
    // 外层档自己再出现时不能取登记处值（那是循环），必须落到它自己的字面量
    const lit = expandVars(fallback, 0, new Set([tok]));
    if (/\$\{/.test(String(lit))) return { cls: "不可判", tokenVal: tv, scope: "不可判-兜底是JS模板插值", oc: "需人工" };
    const chained = /\bvar\(/i.test(fallback);
    if (equalVal(lit, tv)) return { cls: "等值", tokenVal: tv, scope: chained ? "登记处-链式兜底展开后等值" : "登记处" };
    const dk = registry.get(tok).darkLast;
    if (dk !== null && equalVal(lit, expandVars(resolveValue(dk), 0, new Set([tok])))) return { cls: "等值", tokenVal: tv, scope: "登记处-深色档值" };
    const alt = registry.get(tok).values.find((v) => equalVal(lit, expandVars(resolveValue(v), 0, new Set([tok]))));
    if (alt !== undefined) return { cls: "等值", tokenVal: tv, scope: "登记处-早先定义" };
    return { cls: "漂移", tokenVal: tv, scope: chained ? "登记处-兜底指向别档" : "登记处", litX: lit };
  }
  // 2) 不可判：档不在这两个登记处（组件 style 块私设 / theme|global / 运行时注入 / 平台）。
  //    仍把静态可得的值算出来供「门若扩口径」的预算，但不进主分母，避免与 check-token-refs 的合法来源口径打架。
  const lv = localDef.get(file + "::" + tok);
  const gv = lv === undefined && globalDef.has(tok) ? globalDef.get(tok).value : undefined;
  const cand = lv !== undefined ? lv : gv;
  if (cand !== undefined) {
    const tv = resolveValue(cand);
    return {
      cls: "不可判",
      tokenVal: tv,
      scope: lv !== undefined ? "不可判-本文件局部定义(登记处外)" : "不可判-src别处定义(登记处外)",
      oc: equalVal(expandVars(fallback), tv) ? "等值" : "漂移",
    };
  }
  if (otherReg.has(tok)) return { cls: "不可判", tokenVal: null, scope: "不可判-其他登记处", oc: "无静态值" };
  if (injected.has(tok)) return { cls: "不可判", tokenVal: null, scope: "不可判-运行时注入", oc: "无静态值" };
  if (PLATFORM.has(tok)) return { cls: "不可判", tokenVal: null, scope: "不可判-平台注入", oc: "无静态值" };
  if (ignored) return { cls: "不可判", tokenVal: null, scope: "不可判-行内声明宿主注入(token-audit:ignore)", oc: "无静态值" };
  return { cls: "不可判", tokenVal: null, scope: "不可判-真·查无此档", oc: "查无" };
}

/* ────────────────────────── 自证（防 vacuous-green） ────────────────────────── */
function selfTest() {
  const brandReal = resolveRegistry("--c-brand") || "#36C99A";
  const pinkReal = registry.has("--c-tint-pink-50") ? resolveRegistry("--c-tint-pink-50") : "#FCE4EC";
  const fixtures = [
    ".a{color:var(--c-brand," + brandReal + ")}",        // 等值（真值回填）
    ".b{background:var(--c-tint-pink-50,#F3E8FF)}",      // 漂移：粉档写紫兜底（真实实例）
    ".c{color:var(--c-brand, rgb(54, 201, 154))}",       // 等值：hex↔rgb 归一
    ".d{padding:var(--sp-md, 16px)}",                    // 等值或漂移由档值决定，只看能命中
    ".e{color:var(--c-brand,#FFF)}",                     // 漂移：短十六进制展开后仍不等
    ".f{box-shadow:0 2px 8px var(--c-brand, rgba(255, 255, 255, 0.95))}", // 漂移：嵌套括号不得被截断
    ".g{color:var(--totally-not-registered-xyz,#fff)}",  // 不可判归因（真·查无此档）
    ".i{color:var(--c-brand-800, ${designTokens.color.brand[800]})}", // 不可判：兜底是 JS 插值（BaseTabs.vue 真实形态）
    ".j{color:var(--c-tint-pink-50, var(--c-tint-pink-50, #F3E8FF))}", // 漂移：自指双包裹兜底不得当成等值（假绿坑）
    "/* .h{color:var(--c-brand,#000)} */ 注释不算",
  ];
  const combined = fixtures.join("\n");
  const { rows } = auditText(stripComments(combined));
  const got = rows.map((r) => ({ tok: r.tok, cls: judge(r.tok, r.fallback, "«fixture»", false).cls, scope: judge(r.tok, r.fallback, "«fixture»", false).scope, line: r.line, lit: r.fallback }));
  const problems = [];
  const at = (line) => got.find((g) => g.line === line) || null;
  if (got.length !== 10) problems.push("夹具命中 " + got.length + " 条，应为 10（.j 那行有外层+内层两个 var()；注释行未剥掉？或 var() 少算了）");
  const eq = (line, why) => {
    const g = at(line);
    if (!g || g.cls !== "等值") problems.push("第" + line + "条应为等值(" + why + ")，实得 " + JSON.stringify(g));
  };
  const dr = (line, why) => {
    const g = at(line);
    if (!g || g.cls !== "漂移") problems.push("第" + line + "条应为漂移(" + why + ")，实得 " + JSON.stringify(g));
  };
  eq(1, "真值回填");
  dr(2, "粉档紫兜底");
  eq(3, "hex↔rgb");
  dr(5, "#FFF≠品牌绿");
  dr(6, "嵌套 rgba 兜底");
  const u = at(7);
  if (!u || u.cls !== "不可判") problems.push("第7条应归到不可判(真·查无)，实得 " + JSON.stringify(u));
  const ju = at(8);
  if (!ju || ju.cls !== "不可判" || !/JS模板插值/.test(ju.scope)) problems.push("第8条应归到不可判-兜底是JS插值，实得 " + JSON.stringify(ju));
  dr(9, "自指双包裹兜底不得当成等值");
  const self = at(9);
  if (self && /链式兜底展开后等值/.test(self.scope)) problems.push("自指链被判成等值 ⇒ 假绿回来了");
  // 取值器边界自证：编译产物里 page{ 后**第一个**档必须取得到值（上一版就是这里恒取不到）
  const firstTok = registry.keys().next().value;
  if (!resolveRegistry(firstTok)) problems.push("首档 " + firstTok + " 取不到值 ⇒ 取值器边界又坏了");
  if (resolveRegistry("--c-brand-50") !== "#E8FAF3") problems.push("--c-brand-50 取到 " + resolveRegistry("--c-brand-50") + "，应为 #E8FAF3");
  // 时长单位自证：2s 与 2000ms 必须判等值（否则门会把等价写法报成漂移）
  if (!equalVal("2s", "2000ms")) problems.push("2s vs 2000ms 判不等 ⇒ 时长归一失效");
  // 反向负例：真值回填后必须判等值 ⇒ 漂移不是恒真；抽掉登记 ⇒ 必须掉进未解析而不是等值
  if (judge("--c-tint-pink-50", pinkReal, "«fixture»").cls !== "等值") problems.push("真值回填后仍不等 ⇒ 等值判据失效");
  const sp = judge("--c-tint-pink-50", "#FCE4ECCD", "«fixture»").cls;
  if (sp !== "漂移") problems.push("改一维仍判 " + sp + " ⇒ 漂移判据偏松");
  console.log(problems.length ? "SELFTEST=FAIL " + problems.join(" | ") : "SELFTEST=PASS cases=" + (got.length + 2) + " 漂移可红=是 等值可绿=是 未解析可归因=是");
  console.log("  夹具档真值 --c-brand=" + brandReal + " --c-tint-pink-50=" + pinkReal + " 第4条实得=" + JSON.stringify(at(4)));
  process.exit(problems.length ? 1 : 0);
}
if (process.argv.includes("--self-test")) selfTest();

/* ────────────────────────── 跑全量 ────────────────────────── */
function countBy(arr) {
  const o = {};
  for (const x of arr) o[x] = (o[x] || 0) + 1;
  return o;
}
const rows = [];
let varNoFallback = 0;
let rawHits = 0;
let strippedHits = 0;
for (const rel of scanned) {
  const text = texts.get(rel);
  rawHits += (rawTexts.get(rel).match(/var\(\s*--[A-Za-z0-9_-]+\s*,/g) || []).length;
  strippedHits += (text.match(/var\(\s*--[A-Za-z0-9_-]+\s*,/g) || []).length;
  const r = auditText(text);
  varNoFallback += r.noFallback;
  for (const item of r.rows) {
    const ignored = isIgnoredLine(rel, item.line);
    const j = judge(item.tok, item.fallback, rel, ignored);
    rows.push({
      file: rel, line: item.line, tok: item.tok, lit: item.fallback,
      cls: j.cls, scope: j.scope, tokenVal: j.tokenVal, ignored, oc: j.oc || null, litX: j.litX || null,
    });
  }
}

/* 主口径（登记处）与不可判分开数，不可判只作「门若扩口径」的预算。 */
const main = rows.filter((r) => r.cls === "等值" || r.cls === "漂移" || r.cls === "未解析");
const equal = rows.filter((r) => r.cls === "等值");
const drift = rows.filter((r) => r.cls === "漂移");
const unresolved = rows.filter((r) => r.cls === "未解析");
const outside = rows.filter((r) => r.cls === "不可判");

const buckets = new Map();
for (const d of drift) {
  const c = classifyDrift(d.tokenVal, d.litX || d.lit);
  d.refsOtherToken = /var\(/i.test(d.lit);
  d.bucket = c.bucket;
  d.note = c.note;
  buckets.set(c.bucket, (buckets.get(c.bucket) || 0) + 1);
}
/** 门判据建议用的分组：
 *  组1 名字与值不同族（明暗反转/跨色相）＝真隐患；组2 同族深浅/透明度/近值＝深浅写错；
 *  组3 一两位手抄＝历史抄一位；组4 非色值＝时长/半径/阴影这类非色档。*/
const G1 = ["明暗反转", "跨色相"];
const G2 = ["同族深浅", "仅透明度", "近值其他"];
const G3 = ["一两位手抄"];
const g1 = drift.filter((d) => G1.includes(d.bucket));
const g2 = drift.filter((d) => G2.includes(d.bucket));
const g3 = drift.filter((d) => G3.includes(d.bucket));
const g4 = drift.filter((d) => !G1.includes(d.bucket) && !G2.includes(d.bucket) && !G3.includes(d.bucket));
const realRisk = g1;
const typo = g3;
const midGroup = g2;
const outsideDrift = outside.filter((r) => r.oc === "漂移");
/** 等值但写法不同 ⇒ 证明归一化在干活（不是字符串恒等），也是「门判等口径」的样本量。 */
const normWork = equal.filter((r) => {
  const a = String(r.tokenVal).trim().toLowerCase().replace(/\s+/g, "");
  const b = String(r.lit).trim().toLowerCase().replace(/\s+/g, "");
  return a !== b;
});

const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 40;

const L = [];
L.push("FALLBACKLIT 带兜底引用=" + main.length + " 等值=" + equal.length + " 漂移=" + drift.length + " 未解析=" + unresolved.length);
L.push(
  "FALLBACKLIT-CHECK 全带兜底var命中=" + rows.length + " = 主口径" + main.length + " + 不可判" + outside.length +
    "；files=" + scanned.length + " (tracked扩展名=" + inExt.length + " 跳过已删除=" + missing.length + " 跳过static|tests|.mimosa=" + (inExt.length - missing.length - scanned.length) + ")" +
    " registryTokens=" + registrySize + " var无兜底=" + varNoFallback +
    " 全口径自指双包裹=" + rows.filter((d) => d.tok === (/\bvar\(\s*(--[A-Za-z0-9_-]+)/.exec(d.lit) || [])[1]).length,
);
L.push(
  "FALLBACKLIT-COUNT 正则口径核对 剥注释前=" + rawHits + " 剥注释后=" + strippedHits + " 命中(逐条深度解析)=" + rows.length +
    "（差值＝注释里的写法，不计入；未入库的同伴文件不算：" + untrackedCount + " 个）",
);
L.push("FALLBACKLIT-分档 " + [...buckets.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => k + "=" + v).join(" "));
L.push(
  "FALLBACKLIT-分组 组1名字与值不同族(明暗反转+跨色相)=" + g1.length +
    " 组2同族深浅/透明度/近值=" + g2.length +
    " 组3一两位手抄=" + g3.length +
    " 组4非色值(时长半径阴影)=" + g4.length,
);
L.push("FALLBACKLIT-归一化阳性对照 等值但字面写法不同=" + normWork.length + " / 等值" + equal.length);
L.push("FALLBACKLIT-等值放行口径 " + JSON.stringify(countBy(equal.map((r) => r.scope)), null, 0));
L.push("FALLBACKLIT-不可判(登记处之外/兜底非字面量) 共=" + outside.length + " 其中静态可比却不等=" + outsideDrift.length + " 细分=" + JSON.stringify(countBy(outside.map((r) => r.scope)), null, 0));
const tokHist = countBy(drift.map((d) => d.tok));
const topTok = Object.entries(tokHist).sort((a, b) => b[1] - a[1]).slice(0, 15);
L.push("FALLBACKLIT-漂移TOP档 " + topTok.map(([k, v]) => k + "=" + v).join(" ") + " （档种=" + Object.keys(tokHist).length + "）");
L.push("FALLBACKLIT-涉及文件数=" + new Set(drift.map((d) => d.file)).size + " 涉及档数=" + new Set(drift.map((d) => d.tok)).size + " 漂移里已带token-audit:ignore标记的=" + drift.filter((d) => d.ignored).length);
L.push(
  "FALLBACKLIT-进门候选口径 " +
    "WARN全漂移=" + drift.length +
    " WARN除一两位手抄=" + (drift.length - typo.length) +
    " ERROR只跨色相=" + drift.filter((d) => d.bucket === "跨色相").length +
    " ERROR跨色相+仅透明度=" + drift.filter((d) => d.bucket === "跨色相" || d.bucket === "仅透明度").length +
    " ERROR跨色相且未被ignore标记=" + drift.filter((d) => d.bucket === "跨色相" && !d.ignored).length +
    " 兜底指向别档var=" + drift.filter((d) => /var\(/i.test(d.lit)).length +
    " 其中自指(同一档再包一层)=" + drift.filter((d) => d.tok === (/\bvar\(\s*(--[A-Za-z0-9_-]+)/.exec(d.lit) || [])[1]).length,
);
L.push("");
L.push("---- 漂移明细（主口径 " + drift.length + " 条，按分档→文件排序）----");
const order = ["明暗反转", "跨色相", "同族深浅", "仅透明度", "一两位手抄", "近值其他", "非色值-数值不同", "非色值-单位不同", "非色值-结构不同", "兜底指向别档"];
for (const b of order) {
  const list = drift.filter((d) => d.bucket === b);
  if (!list.length) continue;
  L.push("[" + b + "] " + list.length + " 条");
  for (const d of list) {
    L.push("  " + d.file + ":" + d.line + "  " + d.tok + "  档值=" + d.tokenVal + "  兜底=" + d.lit + (d.ignored ? "  <ignore标记>" : "") + " | " + d.note);
  }
}
L.push("");
L.push("---- 未解析＝档在登记处却取不到字面值（应为 0）----");
for (const u of unresolved.slice(0, LIMIT)) L.push("  " + u.file + ":" + u.line + "  " + u.tok + "  取到=" + u.tokenVal + "  兜底=" + u.lit);
L.push("");
L.push("---- 不可判明细（" + outside.length + " 条，按档聚合）----");
L.push("  " + JSON.stringify(countBy(outside.map((r) => r.tok)), null, 0));
L.push("  逐条前 " + LIMIT + "：");
for (const u of outside.slice(0, LIMIT)) L.push("  " + u.file + ":" + u.line + "  " + u.tok + "  兜底=" + u.lit + "  档值=" + (u.tokenVal ?? "∅") + "  静态可比判定=" + (u.oc ?? "-") + "  归因=" + u.scope);
L.push("");
L.push("---- 等值里的「写法不同」（归一化确实在干活的阳性对照，共 " + normWork.length + " 条，前 12）----");
for (const e of normWork.slice(0, LIMIT)) L.push("  " + e.file + ":" + e.line + "  " + e.tok + "  档值=" + e.tokenVal + "  兜底=" + e.lit);
L.push("");
L.push("---- 等值放行口径明细（各口径 1 例，证明不是恒等字符串）----");
for (const sc of [...new Set(equal.map((r) => r.scope))]) {
  const e = equal.find((x) => x.scope === sc && normWork.includes(x)) || equal.find((x) => x.scope === sc);
  L.push("  [" + sc + "] " + e.file + ":" + e.line + "  " + e.tok + "  档值=" + e.tokenVal + "  兜底=" + e.lit);
}
L.push("");
L.push("---- 跳过(已删除的 tracked 文件) " + missing.length + " 条 ----");
for (const m of missing.slice(0, LIMIT)) L.push("  " + m);

const text = L.join("\n") + "\n";
fs.writeFileSync(REPORT, text, "utf8");
process.stdout.write(text);
