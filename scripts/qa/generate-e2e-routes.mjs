#!/usr/bin/env node
/**
 * 从 apps/client/src/pages.json 生成 E2E 全页路由表。
 *
 * 为什么不是 E2E 运行时读文件：Playwright 1.49 + 本项目 tsconfig 把 node:fs 的
 * import 转成 require，而 spec 以 ESM 载入时会直接崩（0 tests 却只要 exit 0 就蒙绿）。
 * 生成普通 TS 常量既保持 pages.json 单源，又避免在 spec 里做 Node I/O。
 *
 * 用法：node scripts/qa/generate-e2e-routes.mjs [--check]
 */
import JSON5 from "json5";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const pagesPath = join(repo, "apps/client/src/pages.json");
const policyPath = join(repo, "scripts/qa/guest-landing-policy.json");
const outPath = join(repo, "tests/e2e/routes.generated.ts");
const pages = JSON5.parse(readFileSync(pagesPath, "utf8"));
const routes = [
  ...(pages.pages ?? []).map((page) => `/${page.path}`),
  ...(pages.subPackages ?? []).flatMap((pkg) =>
    (pkg.pages ?? []).map((page) => `/${pkg.root}/${page.path}`),
  ),
];

/**
 * 访客落点预期（guest-landing-policy.json 是既有在册口径，不在本脚本里另立一套）。
 *
 * 为什么必须由它派生：原先 spec 里写死一个 redirectFallbacks 集合，把首页/寻觅/
 * 我的都当成合法落点 —— 于是「路由根本没命中、全部弹回首页」这一整类失效
 * 照样 73 绿。落点预期应当来自实测过的名册，而不是测试文件自己方便。
 */
const policy = JSON.parse(readFileSync(policyPath, "utf8"));
const landingByPage = new Map(
  (policy.rows ?? []).map((row) => [`/${row.page}`, row]),
);
const familyMarkers = policy.markers ?? {};

/**
 * 页面自身的有意跳转（从页面源码 + ROUTES 常量派生，不手打例外表）。
 *
 * 为什么必须有这一轴：guest-landing-policy 的 rows 记的是「游客被 401 兜底弹走」那一类，
 * 而有些页在**没有 401 的 mock 档**会由自己 redirect 到别处 —— 实测三条都有源码锚点：
 *   campus/campus/index.vue:226  uni.redirectTo("/subpackages/campus/campus/hub")
 *   discover-extra/discover/matching.vue:82  uni.switchTab(ROUTES.TAB.DISCOVER)
 *   village/village/tag-posts.vue:274  uni.reLaunch("/subpackages/village/village/index")
 * 把这些一律判红等于让门去追页面本来就写明的行为；而把它们列成我手打的白名单，
 * 又正是原实现「首页/寻觅/我的 都算合法落点」那个洞的复发形态。
 * 所以判据从源码取：只认这个文件里真的写了的跳转目标，别的落点（含弹回首页）仍然红。
 */
const routesConstPath = join(repo, "apps/client/src/constants/routes.ts");
const routesConst = readFileSync(routesConstPath, "utf8");

/** 把 ROUTES.A.B 这类常量解析成实际路径。 */
function resolveRouteConstant(expr) {
  const m = expr.match(/^ROUTES\.([A-Z0-9_.]+)$/u);
  if (!m) return null;
  const segments = m[1].split(".");
  // 从常量定义里粗定位：逐段往下找 `KEY: {` 或 `KEY: "path"`
  let cursor = routesConst.indexOf("\n  TAB");
  let searchFrom = 0;
  let value = null;
  for (let i = 0; i < segments.length; i += 1) {
    const key = segments[i];
    const isLast = i === segments.length - 1;
    const re = isLast
      ? new RegExp(`${key}:\\s*"([^"]+)"`, "u")
      : new RegExp(`${key}:\\s*\\{`, "u");
    const found = routesConst.slice(searchFrom).match(re);
    if (!found) return null;
    if (isLast) return found[1];
    searchFrom += (found.index ?? 0) + found[0].length;
    cursor = searchFrom;
  }
  return value;
}

/** 找到某路由对应的页面源文件（pages.json 的 path 可能是 dir/index 或直接文件）。 */
function pageSourceFile(route) {
  const rel = route.replace(/^\//u, "");
  const candidates = [
    join(repo, "apps/client/src", `${rel}.vue`),
    join(repo, "apps/client/src", rel, "index.vue"),
  ];
  return candidates.find((f) => existsSync(f)) ?? null;
}

/**
 * 整页模板被 uni-app 条件编译挡掉的页（如 subpackages/setup/dev/index.vue:246 的
 * `<!-- #ifdef DEV -->`）。这类页在非 DEV 构建里**编译期就没有内容**，
 * 对它断言「body 有渲染文字」等于写一条永远不会成功的判据
 *（guest-landing-policy.json 的 notFrameObservable 说的正是这个坑）。
 */
function isDevConditionalPage(file) {
  if (!file) return false;
  const src = readFileSync(file, "utf8");
  const template = src.match(/<template>([\s\S]*)<\/template>/u);
  if (!template) return false;
  return /#ifdef\s+DEV\b/u.test(template[1]) && /#endif/u.test(template[1]);
}

/** 扫页面源码，取它自己声明的跳转目标路由。 */
function collectSelfRedirects(route) {
  const rel = route.replace(/^\//u, "");
  const candidates = [
    join(repo, "apps/client/src", `${rel}.vue`),
    join(repo, "apps/client/src", rel, "index.vue"),
  ];
  const file = candidates.find((f) => existsSync(f));
  if (!file) return [];
  const src = readFileSync(file, "utf8");
  const targets = new Set();
  const re = /(?:uni\.)?(?:redirectTo|navigateTo|reLaunch|switchTab)\s*\(\s*\{[^}]*?url:\s*("\/[^"]+"|ROUTES\.[A-Z0-9_.]+)/gsu;
  for (const m of src.matchAll(re)) {
    const raw = m[1];
    if (raw.startsWith('"')) targets.add(raw.slice(1, -1).split("?")[0]);
    else {
      const resolved = resolveRouteConstant(raw);
      if (resolved) targets.add(resolved.split("?")[0]);
    }
  }
  return [...targets].sort();
}

const expectations = routes.map((route) => {
  const row = landingByPage.get(route);
  const expectedLanding = row ? `/${row.landing}` : route;
  const family = row?.family ?? null;
  // loggedInLandings 是名册对「本页在已登录会话里会自己前进到哪」的在册行：
  // login/index 的 onShow 检到已登录即前进到寻觅 Tab，所以它在自己名下行之外还有
  // 一条**在册**的合法落点。不带这条，匿名载具里一旦残留会话就得到
  // 「/pages/login/index 落到 /pages/discover/index」这种看起来像缺陷的红。
  const loggedInRow = (policy.loggedInLandings ?? []).find(
    (entry) => `/${entry.page}` === route,
  );
  return {
    route,
    expectedLanding,
    family,
    landingMarker: family ? familyMarkers[family]?.landingMarker ?? null : null,
    registerEntryMarker: family
      ? familyMarkers[family]?.registerEntry ?? null
      : null,
    loggedInLanding: loggedInRow ? `/${loggedInRow.landing}` : null,
    selfRedirects: collectSelfRedirects(route),
    devOnly: isDevConditionalPage(pageSourceFile(route)),
  };
});

const bouncedCount = expectations.filter((e) => e.expectedLanding !== e.route).length;
if (policy.rows && policy.rows.length > 0 && bouncedCount === 0) {
  console.error(
    `E2E_ROUTES=POLICY_DISCONNECTED 名册有 ${policy.rows.length} 条落点行，却没有任何路由吃到（page 键与 pages.json 路由对不上）`,
  );
  process.exit(1);
}

const content = `// AUTO-GENERATED by scripts/qa/generate-e2e-routes.mjs from apps/client/src/pages.json.
// Do not edit by hand; run: node scripts/qa/generate-e2e-routes.mjs
export const ROUTES: string[] = ${JSON.stringify(routes, null, 2)};

export interface RouteExpectation {
  /** pages.json 注册的完整路由 */
  route: string;
  /** 匿名（游客）访问时的预期落点路由；无在册行的页面必须原页到达 */
  expectedLanding: string;
  /** 落点成因族（guest-landing-policy.json rows[].family），null 表示本页无弹走 */
  family: string | null;
  /** 该族在落地页上的标记类，来自 policy.markers */
  landingMarker: string | null;
  /** 「被引导到注册」要求落地页默认态露出的注册入口类，来自 policy.markers */
  registerEntryMarker: string | null;
  /** 名册在册的「已登录会话下本页会前进到哪」（loggedInLandings），无则 null */
  loggedInLanding: string | null;
  /** 本页源码里自己声明的跳转目标（从页面 .vue 与 ROUTES 常量派生） */
  selfRedirects: string[];
  /** 整页模板包在 #ifdef DEV 里：非 DEV 构建编译期即无内容，不许断言渲染文字 */
  devOnly: boolean;
}

export const ROUTE_EXPECTATIONS: RouteExpectation[] = ${JSON.stringify(expectations, null, 2)};
`;
const check = process.argv.includes("--check");
if (check) {
  let current = "";
  try {
    current = readFileSync(outPath, "utf8");
  } catch {
    // missing is stale
  }
  // 行尾不许冒充漂移：Windows 上 git 按 core.autocrlf 检出会把本文件变成 CRLF，
  // 而生成器写的是 LF —— 直接 !== 比较会在内容完全一致时报 STALE
  // （合并后在 main 上实测复现：959 个 CRLF 造成一条假红）。
  // 本仓资产门修过同一类问题（「行尾不许冒充图片漂移」），此处同一处理口径。
  const normalize = (text) => text.replace(/\r\n/g, "\n");
  if (normalize(current) !== normalize(content)) {
    console.error("E2E_ROUTES=STALE 请运行 node scripts/qa/generate-e2e-routes.mjs");
    process.exit(1);
  }
  console.log(`E2E_ROUTES=OK count=${routes.length}`);
} else {
  writeFileSync(outPath, content, "utf8");
  console.log(`E2E_ROUTES=WROTE count=${routes.length} out=${outPath}`);
}
