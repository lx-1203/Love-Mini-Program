/**
 * mp-weixin <image> 失效样式检查脚本（2026-09-03 R11 收尾）。
 *
 * 背景：mp-weixin 的 <image> 是原生组件，存在两个反复踩坑的 CSS 失效模式
 * （2026-09-03 首页 6 类 UI 缺陷中的 ②③④ 均与其相关，且修复后多次被回归写回）：
 *   1. object-fit 不生效 —— 缩放/裁切必须用原生 mode="aspectFit" / mode="aspectFill"；
 *   2. image-rendering: crisp-edges 强制关闭抗锯齿 —— 加重边缘锯齿/杂边（禁用值，
 *      如需锐化请用 -webkit-optimize-contrast 并跟 image-rendering: auto 兜底）。
 *
 * 本脚本全局扫描 src 下的 .vue / .scss / .css，对两类写法输出 file:line + 修复指引，
 * 与 src/styles/_image-base.scss（渲染基线）配套：基线定规矩、本脚本守规矩。
 *
 * 用法：
 *   node scripts/check-mp-image-styles.mjs            # advisory：命中输出提示，exit 0
 *   node scripts/check-mp-image-styles.mjs --strict   # CI 模式：任何命中 exit 1
 *
 * 豁免机制：命中行或紧邻的上一非空行含 mp-audit:ignore 时跳过。
 *   示例（H5 专项合法场景）：
 *     object-fit: cover;   // mp-audit:ignore H5 &lt;img&gt; 生效，mp 端由 SafeImage mode=aspectFill 承担
 *
 * 退出码：0 通过 / 1 命中（仅 --strict）。
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..", "src");
const strict = process.argv.includes("--strict");

/** 命中规则的样式代码行（已剔除注释与豁免行） */
function scanStyleCode(text) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  let inBlockComment = false;
  let prevLine = ""; // 上一非空代码行（用于跨行豁免注释）

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const isEmpty = trimmed === "";

    // 块注释状态机（/* ... */ 可能跨行）
    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }
    if (!isEmpty && trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) inBlockComment = true;
      continue;
    }
    // 行注释 / JSDoc 星号行
    if (!isEmpty && (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("<!--"))) {
      continue;
    }

    // 豁免：本行或上一非空行含 mp-audit:ignore
    const ignoreHere = trimmed.includes("mp-audit:ignore");
    const ignorePrev = prevLine.includes("mp-audit:ignore");
    if (!isEmpty) {
      if (ignoreHere || ignorePrev) {
        prevLine = raw;
        continue;
      }
    }

    // R1: 禁用 image-rendering: crisp-edges
    if (/image-rendering\s*:\s*crisp-edges/i.test(trimmed)) {
      hits.push({ line: i + 1, rule: "R1", code: trimmed,
        fix: "crisp-edges 会关闭抗锯齿加重锯齿（mp 图标/吉祥物显著）。删除此行，如需锐化改 image-rendering: -webkit-optimize-contrast; 并跟 image-rendering: auto;" });
    }
    // R2: object-fit（mp <image> 不响应）
    if (/(?:^|[;{\s])object-fit\s*:/i.test(trimmed)) {
      hits.push({ line: i + 1, rule: "R2", code: trimmed,
        fix: "mp-weixin <image> 不响应 CSS object-fit。缩放/裁切请用原生 mode=\"aspectFit|aspectFill\"，删除 object-fit 声明（H5 专项需保留时在行尾加 /* mp-audit:ignore */）" });
    }

    if (!isEmpty) prevLine = raw;
  }
  return hits;
}

/** 递归收集 src 下待扫描文件 */
function collectFiles(dir, out) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, out);
    } else {
      const ext = extname(full).toLowerCase();
      if (ext === ".vue" || ext === ".scss" || ext === ".css") out.push(full);
    }
  }
  return out;
}

const files = collectFiles(srcRoot, []);
let totalFiles = 0;
let totalHits = 0;
const report = [];

for (const file of files) {
  totalFiles++;
  const hits = scanStyleCode(readFileSync(file, "utf-8"));
  if (hits.length === 0) continue;
  const rel = relative(resolve(__dirname, ".."), file);
  for (const h of hits) {
    totalHits++;
    report.push(`  ${rel}:${h.line}  [${h.rule}] ${h.code.trim().slice(0, 90)}`);
    report.push(`        ↳ ${h.fix}`);
  }
}

console.log(`[mp-image] 扫描 ${totalFiles} 个样式文件（src/**/*.vue|scss|css）`);
if (totalHits === 0) {
  console.log("[mp-image] ✅ 未发现 mp-weixin <image> 失效样式（crisp-edges / 裸 object-fit）");
} else {
  console.log(`[mp-image] ⚠️ 发现 ${totalHits} 处失效样式，请逐条修复或加豁免注释（基线见 src/styles/_image-base.scss）：`);
  console.log(report.join("\n"));
}
console.log(strict ? `[mp-image] --strict 模式退出码=${totalHits > 0 ? 1 : 0}` : "[mp-image] advisory 模式（默认 exit 0；CI 加 --strict）");
process.exit(strict && totalHits > 0 ? 1 : 0);
