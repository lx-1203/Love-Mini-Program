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

// 规则二白名单（R11-G2 收口）：共享组件 / 全局样式自身不挂页面根节点，
// 其 --statusbar 由宿主页面注入（宿主均已通过 useMenuButtonRect 注入并被本守卫覆盖）。
const HOST_INJECTED_ALLOW = new Set(
  [
    "App.vue", // 应用根，页面级注入
    "components/common/LockScreen.vue", // 宿主：village/index、heart-signals、nearby（均已注入）
    "components/common/Toast.vue", // 全局浮层，随宿主页面变量继承
    "components/home/HomeHeader.vue", // 宿主：pages/home（已注入）
    "components/match/MatchLoading.vue", // 宿主：discover/matching（已注入）
    "components/match/MatchSuccess.vue", // 宿主：discover/match-success（已注入）
    "components/profile/mine/MyHeader.vue", // 宿主：profile 相关页（已注入）
    // NotLoggedProfile 与 MyHeader 同理：CSS 自定义属性沿 DOM 树继承，注入点在页面根，
    // 链路 pages/profile/index.vue（useMenuButtonRect 3 处实测）→ ProfileShell.vue → mine/MyProfile.vue
    // → components/profile/NotLoggedProfile.vue；中间两层自身都不测状态栏，
    // 要求每一层各测一遍反而是错的（多次测量、多次 setData）。宿主已注入并被本守卫覆盖。
    "components/profile/NotLoggedProfile.vue",
    "styles/_components.scss", // mixin/占位类，消费方为已注入页面
    "styles/_mixins.scss",
    "theme/global.scss", // 全局 token 定义（:root/page 级）
  ].map((p) => p.replaceAll("/", path.sep))
);

/** 剥除注释内容后再匹配，避免文档/说明文字里的字面量误报 */
function stripComments(src) {
  /* 单遍扫描，状态机版（2026-10-20 实测假红改的）。
     原版是两条 replace：先剥块注释、再剥行注释，于是**行注释里出现的"斜杠星"序列**会被当成
     块注释起点，一路吞到下一个"星斜杠"才停。触发件是 hub.vue:13 那句行注释里的
     `…、/uploads/** 补鉴权 token）` —— 其中的前两个斜杠加星号构成块注释起点，把 14–42 行
     （含 `import { useMenuButtonRect }` 与它的调用）整段抹掉，规则二于是报
     "用 var(--statusbar 但无 JS 注入源"，而文件里注入源好端端在。
     判据本身一条没动：仍然要求"有 var 使用 ⇒ 必须有注入源"，只是不再把行注释里的斜杠当块注释起点。
     保留原语义：注释字符按空白抹掉、不删行，行号与长度对得上（守卫按 index 回切片做上下文判断）。 */
  const out = src.split("");
  let st = 0; // 0=代码 1=行注释 2=块注释 3=单引号串 4=双引号串 5=反引号串
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (st === 0) {
      if (c === "/" && n === "/") { st = 1; out[i] = " "; out[i + 1] = " "; i++; continue; }
      if (c === "/" && n === "*") { st = 2; out[i] = " "; out[i + 1] = " "; i++; continue; }
      if (c === "'") st = 3;
      else if (c === '"') st = 4;
      else if (c === "`") st = 5;
      continue;
    }
    if (c === "\n") { if (st === 1) st = 0; continue; } // 换行只结束行注释；块注释跨行不收口
    if (st === 1) { out[i] = " "; continue; }
    if (st === 2 && c === "*" && n === "/") { st = 0; out[i] = " "; out[i + 1] = " "; i++; continue; }
    if ((st === 3 && c === "'") || (st === 4 && c === '"') || (st === 5 && c === "`")) { st = 0; continue; }
    // 字符串内部原样保留（字面量要能被后面的规则判到）；块注释一律抹成空白
    if (st === 3 || st === 4 || st === 5) continue;
    if (st === 2) { if (c !== "\n") out[i] = " "; continue; }
    if (c !== "\n" && c !== " " && c !== "\t") out[i] = " ";
  }
  return out.join("");
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

  // 规则二：var(--statusbar 有使用但无注入源——白名单（宿主注入的共享组件/全局样式）之外一律 error
  if (VAR_USE.test(code) && !INJECT_HINT.test(code)) {
    if (HOST_INJECTED_ALLOW.has(rel)) {
      continue; // 白名单：由宿主页面注入
    }
    errors.push(`${rel}: 使用 var(--statusbar 但无 JS 注入源（useMenuButtonRect/statusBarHeight）`);
  }
}

for (const w of warns) console.log(`[warn] ${w}`);
for (const e of errors) console.error(`[error] ${e}`);
console.log(
  `\ncheck-statusbar-offset: ${files.length} files, ${errors.length} errors, ${warns.length} warns` +
    (errors.length ? " → FAIL" : " → PASS")
);
process.exit(errors.length ? 1 : 0);
