#!/usr/bin/env node
/**
 * check-statusbar-offset.mjs — 状态栏避让语法守卫（R10-P1-003 收口）
 *
 * 背景：全项目 navigationStyle=custom，顶部避让统一写法为
 *   `var(--statusbar, env(safe-area-inset-top))`
 * 其中 --statusbar 由 useMenuButtonRect()（或等价 JS 测量）注入页面根节点。
 * DevTools / 部分机型 env(safe-area-inset-top) 恒为 0 —— 裸写 env() 必然叠印。
 * R8→R10 连续三轮「撞见一页修一页」仍复发，根因是缺语法级守卫。
 *
 * 规则：
 *   [error] 裸 env(safe-area-inset-top)（未包在 var(--statusbar, …) 内）
 *   [error] 自造状态栏变量名（--statusbar-height 等非约定名）
 *   [warn]  文件样式使用了 var(--statusbar 但没有任何 JS 注入源
 *           （useMenuButtonRect / statusBarHeight）→ 静默失效风险，列出供收敛
 *
 * 用法：node scripts/check-statusbar-offset.mjs [--fix]
 *   --fix：将规则一的裸 env() 自动包上 var(--statusbar, …)（规则二三不自动改）
 *
 * 退出码：存在 [error] → 1（fail-fast）；仅 [warn] → 0。
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");
const EXT = /\.(vue|scss|css|wxss|ts|js)$/;
const SKIP = /node_modules|dist|uni_modules/;

// 规则三白名单：
//  - --status-bar-height：uni-app 平台内置变量（非自造），仅允许作为 var(--statusbar, …) 的内层兜底
//  - 其余发现即改写法
const CUSTOM_NAME_ALLOW = new Set(["--status-bar-height"]);

/** 剥除注释内容后再匹配，避免文档/说明文字里的字面量误报 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\s/*]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

const BARE_ENV = /(?<!var\(--statusbar,\s*)env\(safe-area-inset-top\)/g;
const CUSTOM_VAR = /--statusbar-(?!inset)[a-z-]+/g;
const VAR_USE = /var\(--statusbar[,)]/;
const INJECT_HINT = /useMenuButtonRect|statusBarHeight|usePageMetaStyle/;

const errors = [];
const warns = [];
const files = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!SKIP.test(p)) walk(p);
      continue;
    }
    if (EXT.test(name)) files.push(p);
  }
}
walk(SRC);

for (const file of files) {
  const rel = path.relative(SRC, file);
  let src = fs.readFileSync(file, "utf8");
  const code = stripComments(src);

  // 规则一：裸 env(safe-area-inset-top)
  const bare = [...code.matchAll(BARE_ENV)];
  if (bare.length) {
    if (process.argv.includes("--fix") && /\.(vue|scss|css|wxss)$/.test(file)) {
      src = src.replace(BARE_ENV, "var(--statusbar, env(safe-area-inset-top))");
      fs.writeFileSync(file, src);
      console.log(`[fix] ${rel}: wrapped ${bare.length} bare env(safe-area-inset-top)`);
    } else {
      errors.push(`${rel}: ${bare.length} 处裸 env(safe-area-inset-top)（应为 var(--statusbar, env(...))）`);
    }
  }

  // 规则三：自造状态栏变量名（--status-bar-height 允许作内层兜底，禁止裸用）
  for (const m of code.matchAll(/--[a-z-]*status-bar[a-z-]*/g)) {
    const name = m[0];
    if (CUSTOM_NAME_ALLOW.has(name)) {
      const idx = m.index ?? 0;
      if (!/var\(--statusbar,\s*(?:var\(\s*)?$/.test(code.slice(0, idx))) {
        errors.push(`${rel}: ${name} 必须包在 var(--statusbar, ${name}) 内作兜底`);
      }
      continue;
    }
    errors.push(`${rel}: 自造状态栏变量 "${name}"（统一使用 --statusbar）`);
  }

  // 规则二（warn）：var(--statusbar 有使用但无注入源
  if (VAR_USE.test(code) && !INJECT_HINT.test(code)) {
    warns.push(`${rel}: 使用 var(--statusbar 但无 JS 注入源（useMenuButtonRect/statusBarHeight）`);
  }
}

for (const w of warns) console.log(`[warn] ${w}`);
for (const e of errors) console.error(`[error] ${e}`);
console.log(
  `\ncheck-statusbar-offset: ${files.length} files, ${errors.length} errors, ${warns.length} warns` +
    (errors.length ? " → FAIL" : " → PASS")
);
process.exit(errors.length ? 1 : 0);
