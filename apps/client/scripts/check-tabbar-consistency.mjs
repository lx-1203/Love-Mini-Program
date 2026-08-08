/**
 * TabBar 三处配置一致性校验脚本（R4-00209）。
 *
 * TabBar 配置存在三处手动同步（唯一真相源为 src/config/navigation.ts）：
 *   1. src/config/navigation.ts        —— appTabs 数组（TS 真相源）
 *   2. src/pages.json                  —— tabBar.list（uni-app 原生配置）
 *   3. src/custom-tab-bar/index.js     —— tabs 数组（微信自定义 TabBar）
 *
 * 历史风险：tab 增删改时漏同步一处即出现选中态错乱 / 图标缺失 / 白屏，
 * 且无编译期校验。本脚本在 CI / pre-push 时校验：
 *   - 三处的 tab 顺序与路径集合完全一致（页面路径 pagePath 去前导斜杠比较）；
 *   - 图标路径存在性（路径格式一致性由各文件自身保证）。
 *
 * 用法：
 *   node scripts/check-tabbar-consistency.mjs
 * 退出码：0 一致；1 不一致（打印差异明细）。
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src");
const navigationPath = join(root, "config", "navigation.ts");
const pagesJsonPath = join(root, "pages.json");
const tabBarJsPath = join(root, "custom-tab-bar", "index.js");

/** 从 navigation.ts 提取 tab 页面路径（/pages/xxx/index 形式，去前导斜杠） */
function readNavigationTabs() {
  const src = readFileSync(navigationPath, "utf-8");
  const matches = [...src.matchAll(/path:\s*"(\/pages\/[^"]+)"/g)];
  if (matches.length === 0) {
    throw new Error(`[check-tabbar] 无法从 ${navigationPath} 提取 tab 路径`);
  }
  return matches.map((m) => m[1].replace(/^\//, ""));
}

/** 从 pages.json 提取 tabBar.list pagePath（JSON5：先剥离注释） */
function readPagesJsonTabs() {
  const src = readFileSync(pagesJsonPath, "utf-8");
  const noComments = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const data = JSON.parse(noComments);
  const list = data?.tabBar?.list;
  if (!Array.isArray(list)) {
    throw new Error(`[check-tabbar] ${pagesJsonPath} 缺少 tabBar.list`);
  }
  return list.map((item) => String(item.pagePath).replace(/^\//, ""));
}

/** 从 custom-tab-bar/index.js 提取 tabs 页面路径 */
function readTabBarJsTabs() {
  const src = readFileSync(tabBarJsPath, "utf-8");
  const matches = [...src.matchAll(/path:\s*"([^"]+)"/g)];
  if (matches.length === 0) {
    throw new Error(`[check-tabbar] 无法从 ${tabBarJsPath} 提取 tab 路径`);
  }
  return matches.map((m) => m[1].replace(/^\//, ""));
}

/**
 * 校验图标资源文件存在。
 *
 * navigation.ts 的 iconPath 引用 config/images.ts 的常量
 * （IMAGE_PATHS.ICONS_TABBAR.XXX → ICONS_BASE + '/tabbar/xxx.png'），
 * 此处解析常量并校验实际文件存在，防止图标缺失导致 TabBar 图标裂图。
 */
function checkIconsExist() {
  const navSrc = readFileSync(navigationPath, "utf-8");
  const refs = [...navSrc.matchAll(/IMAGE_PATHS\.ICONS_TABBAR\.([A-Z_]+)/g)].map(
    (m) => m[1]
  );
  if (refs.length === 0) return [];

  const imagesSrc = readFileSync(join(root, "config", "images.ts"), "utf-8");
  // ICONS_BASE = STATIC_BASE + '/icons'，STATIC_BASE = '/static/assets'
  const staticBase = imagesSrc.match(/const STATIC_BASE\s*=\s*'([^']+)'/)?.[1] ?? "/static/assets";
  // 提取 ICONS_TABBAR 块内的 KEY: ICONS_BASE + '/tabbar/xxx.png' 映射
  const blockMatch = imagesSrc.match(/ICONS_TABBAR:\s*\{([\s\S]*?)\n\s*\}/);
  if (!blockMatch) {
    throw new Error("[check-tabbar] 无法解析 config/images.ts 的 ICONS_TABBAR");
  }
  const map = {};
  for (const line of blockMatch[1].split("\n")) {
    const m = line.match(/^\s*([A-Z_]+):\s*ICONS_BASE\s*\+\s*'(\/tabbar\/[^']+)'/);
    if (m) map[m[1]] = m[2];
  }
  const missing = refs
    .filter((key) => {
      const rel = map[key];
      if (!rel) return true;
      // /static/assets/icons/tabbar/xxx.png → src 目录下相对路径
      const filePath = join(root, staticBase.replace(/^\//, ""), "icons", rel.replace(/^\//, ""));
      return !existsSync(filePath);
    })
    .map((key) => `IMAGE_PATHS.ICONS_TABBAR.${key}${map[key] ? `（${map[key]} 不存在）` : "（未在 images.ts 定义）"}`);
  return missing;
}

const errors = [];
let navigationTabs;
let pagesJsonTabs;
let tabBarJsTabs;

try {
  navigationTabs = readNavigationTabs();
  pagesJsonTabs = readPagesJsonTabs();
  tabBarJsTabs = readTabBarJsTabs();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

if (navigationTabs.length !== pagesJsonTabs.length) {
  errors.push(
    `数量不一致：navigation.ts ${navigationTabs.length} 个 vs pages.json ${pagesJsonTabs.length} 个`
  );
}
if (navigationTabs.length !== tabBarJsTabs.length) {
  errors.push(
    `数量不一致：navigation.ts ${navigationTabs.length} 个 vs custom-tab-bar/index.js ${tabBarJsTabs.length} 个`
  );
}
if (JSON.stringify(navigationTabs) !== JSON.stringify(pagesJsonTabs)) {
  errors.push(
    `顺序/路径不一致（navigation.ts → pages.json）：\n  期望: ${navigationTabs.join(", ")}\n  实际: ${pagesJsonTabs.join(", ")}`
  );
}
if (JSON.stringify(navigationTabs) !== JSON.stringify(tabBarJsTabs)) {
  errors.push(
    `顺序/路径不一致（navigation.ts → custom-tab-bar/index.js）：\n  期望: ${navigationTabs.join(", ")}\n  实际: ${tabBarJsTabs.join(", ")}`
  );
}
const missingIcons = checkIconsExist();
if (missingIcons.length > 0) {
  errors.push(`图标资源缺失：${missingIcons.join(", ")}`);
}

if (errors.length > 0) {
  console.error("[check-tabbar] ❌ TabBar 三处配置不一致：");
  errors.forEach((e) => console.error("  - " + e));
  console.error(
    "[check-tabbar] 请先修改唯一真相源 src/config/navigation.ts 的 appTabs，再同步 pages.json 与 custom-tab-bar/index.js。"
  );
  process.exit(1);
}

console.log(
  `[check-tabbar] ✅ TabBar 三处配置一致（${navigationTabs.length} 个 tab：${navigationTabs.join(", ")}），图标资源完整`
);
