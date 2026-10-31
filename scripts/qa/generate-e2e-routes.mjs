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
 * 构建期剔除条件（P2 修复，2026-10-31）：
 * 「这一页在**正式（release）包里到底有没有被编译进去**」以前只有一个来源 ——
 * isDevConditionalPage() 看页面模板里有没有 `#ifdef DEV`。于是
 * `subpackages/setup/showcase/index`（pages.json 靠 `// #ifdef SHOWCASE` 整条注册项剔除，
 * 见 apps/client/src/pages.json 的 setup 子包）被当成可发货页写进名册：
 * 实测 apps/client/dist/build/mp-weixin-real 的 app.json 里根本没有这一条路由
 * （showcase 只在 apps/client/dist/build/mp-weixin-showcase 里），
 * 对它断言「body 有渲染文字 / 落点正确」就是在追一个正式包里压根不存在的东西。
 *
 * 条件符号不再手打名单，取自 apps/client/package.json 的 `uni-app.scripts[*].define`
 * —— 那些键（DEV / SHOWCASE）正是「只有某个特定构建档才为真」的符号，
 * 由 package.json 单源声明；正式档（build:mp-weixin:real / mock 档）不注入任何一个。
 */
const clientPkgPath = join(repo, "apps/client/package.json");
const clientPkg = JSON.parse(readFileSync(clientPkgPath, "utf8"));
/** 只在非 release 构建档里为真的条件符号（DEV、SHOWCASE…） */
const bandSymbols = new Set(
  Object.values(clientPkg["uni-app"]?.scripts ?? {}).flatMap((script) =>
    Object.keys(script?.define ?? {}),
  ),
);
/** uni-app 内建的平台符号：按平台构建时恒为真，不构成「正式包里没有这页」 */
const platformSymbols = new Set([
  "H5",
  "MP-WEIXIN",
  "MP-ALIPAY",
  "MP-BAIDU",
  "MP-TOUTIAO",
  "MP-QQ",
  "MP-JD",
  "MP",
  "QUICKAPP-WEBVIEW",
  "APP-PLUS",
  "APP-PLUS-NVUE",
  "APP",
  "VUE",
  "WEB",
]);

/**
 * 从 pages.json 原文（JSON5 解析会丢注释）解析每条注册路由外层的条件编译符号。
 *
 * 只认**行首 // 注释**形式的 `#ifdef X` / `#ifndef X` / `#endif`（uni-app 在 json 里的惯例写法），
 * 因此 :293 那种写在 /* *\/ 块注释里的说明文字「（#ifdef DEV）」不会被误当成条件开块。
 *
 * @returns Map<路由, 该路由被包在哪些条件里>
 */
function collectPageJsonConditions(pagesJsonPath) {
  const raw = readFileSync(pagesJsonPath, "utf8").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const stack = [];
  const byPath = new Map();
  let currentRoot = "";
  for (const line of lines) {
    const ifdef = line.match(/^\s*\/\/\s*#ifdef\s+([A-Za-z0-9_-]+)\s*$/u);
    const ifndef = line.match(/^\s*\/\/\s*#ifndef\s+([A-Za-z0-9_-]+)\s*$/u);
    const endif = /^\s*\/\/\s*#endif\s*$/u.test(line);
    const root = line.match(/^\s*"root"\s*:\s*"([^"]+)"/u);
    const pathLine = line.match(/^\s*"path"\s*:\s*"([^"]+)"/u);
    if (root) currentRoot = root[1];
    if (ifdef) stack.push(ifdef[1]);
    else if (ifndef) stack.push(`!${ifndef[1]}`);
    else if (endif) stack.pop();
    else if (pathLine) {
      const route = currentRoot
        ? `/${currentRoot}/${pathLine[1]}`
        : `/${pathLine[1]}`;
      byPath.set(route, [...new Set(stack)]);
    }
  }
  return byPath;
}

const pageJsonConditions = collectPageJsonConditions(pagesPath);

/**
 * 这一页在正式（release）包里是否根本不存在。
 *
 * 三条来源合起来判（任一为真即「不在正式包」）：
 * ① pages.json 的注册项包在构建档条件里（`#ifdef DEV` / `#ifdef SHOWCASE`）；
 * ② 整页模板包在构建档条件里（原 isDevConditionalPage 的口径，符号名单从 package.json 派生）；
 * ③ 出现无法归类的条件符号 ⇒ 保守判为「不在正式包」并单独报数（宁可少追一条判据，
 *    也不许对没编译进去的页断言渲染内容 —— 那是永远不会成功的判据）。
 * 平台符号（H5/MP-WEIXIN…）按平台构建恒真，不算剔除。
 */
function excludedSymbols(route) {
  const out = new Set();
  for (const symbol of pageJsonConditions.get(route) ?? []) {
    const bare = symbol.replace(/^!/u, "");
    if (bandSymbols.has(bare) || symbol.startsWith("!") || !platformSymbols.has(bare)) {
      out.add(symbol);
    }
  }
  const file = pageSourceFile(route);
  if (file) {
    const src = readFileSync(file, "utf8");
    const template = src.match(/<template>([\s\S]*)<\/template>/u);
    if (template && /#endif/u.test(template[1])) {
      for (const m of template[1].matchAll(/#ifdef\s+([A-Za-z0-9_-]+)/gu)) {
        if (bandSymbols.has(m[1])) out.add(m[1]);
      }
    }
  }
  return [...out];
}

/**
 * 名册在册 = 该路由在正式包里有编译产物。
 *
 * 载体优先级：盘上真有正式构建产物就**实测**对账（apps/client/dist/build/mp-weixin-real/app.json
 * 是 build:mp-weixin:real 那条链的产物，读它的 pages/subPackages 名单）；
 * 没有产物就退回**静态派生**（pages.json + 条件符号），并明确印出 STATIC，
 * 不假装量过。
 */
function releaseEvidence() {
  // --release-dist <仓内相对路径> 让这条判点能指向别的档（也用来演演练「盘上没有产物」
  // 那条静态支路，见 --self-test）。缺省按正式档优先、mock 档兜底。
  const flagIndex = process.argv.indexOf("--release-dist");
  const requested = flagIndex >= 0 ? String(process.argv[flagIndex + 1] || "") : "";
  const candidates = requested
    ? [join(repo, requested)]
    : [
        join(repo, "apps/client/dist/build/mp-weixin-real"),
        join(repo, "apps/client/dist/build/mp-weixin"),
      ];
  for (const dir of candidates) {
    const appJsonPath = join(dir, "app.json");
    if (!existsSync(appJsonPath)) continue;
    try {
      const built = JSON5.parse(readFileSync(appJsonPath, "utf8"));
      const routes = new Set([
        ...(built.pages ?? []),
        ...(built.subPackages ?? []).flatMap((pkg) =>
          (pkg.pages ?? []).map((p) => `${pkg.root}/${p}`),
        ),
      ]);
      const band = dir.slice(repo.length + 1).split("\\").join("/");
      return { kind: `built:${band}`, appJsonPath, routes };
    } catch (_e) {
      // 读不动就当没有产物，走静态派生（宁可不判，不判错）
    }
  }
  return { kind: "static", appJsonPath: null, routes: null };
}

const release = releaseEvidence();

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
  const excluded = excludedSymbols(route);
  // 名册在册（正式包里有这一页）：构建档条件挡掉的页一律不算在册；
  // 有实测产物时还要再问一句「app.json 里真的有条路由吗」，两条都过才算 shippable。
  const inBuild = excluded.length === 0;
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
    /**
     * 整页被编译期条件挡掉（DEV / SHOWCASE 等构建档符号）：非该档的构建里
     * 编译期就没有内容，不许断言渲染文字。P2 修复前这一枚只看模板里的 `#ifdef DEV`，
     * 漏掉了 pages.json 用 `#ifdef SHOWCASE` 整条剔除的注册项。
     */
    devOnly: !inBuild,
    /** 挡掉本页的条件符号（空数组 = 任何构建档都会编译进去） */
    buildConditions: excluded,
    /** 该页在正式包里是否真的存在（有产物时对产物负责，无产物时对 pages.json 条件负责） */
    inReleasePackage: inBuild,
    /** 这一枚判据的载体见控制台：built:<档名> = 读了在盘正式产物的 app.json；static = 静态派生。
     *  ⚠️ 派生值必须与「这台机器上有没有 dist/ 产物」无关，否则同一份源码会生成两份在册文件。 */
  };
});

const bouncedCount = expectations.filter((e) => e.expectedLanding !== e.route).length;
if (policy.rows && policy.rows.length > 0 && bouncedCount === 0) {
  console.error(
    `E2E_ROUTES=POLICY_DISCONNECTED 名册有 ${policy.rows.length} 条落点行，却没有任何路由吃到（page 键与 pages.json 路由对不上）`,
  );
  process.exit(1);
}

/**
 * 正式包产物核对（P2 修复新增的判点，2026-10-31）。
 *
 * 判据：凡名册标成「可发货」（inReleasePackage=true）的路由，必须在一次正式构建里
 * 拿得到编译产物；拿不到就是名册在骗人 —— 下游（tests/e2e/specs/all-pages-smoke.spec.ts）
 * 会去断言一张根本没编译进包的页面，那条判据永远不会成功
 * （showcase/index 被标成 devOnly:false 的正是这个形态）。
 *
 * 载体两种，打印出来分明负责：
 * - 盘上有正式产物（apps/client/dist/build/mp-weixin-real/app.json，
 *   由 pnpm --filter @campus-love/client run build:mp-weixin:real 产出）⇒ **实测对账**：
 *   逐条比 app.json 的路由名单，名册说没有而产物里有、或名册说有而产物里没有，都判红；
 * - 没有产物 ⇒ **静态派生**：只对 pages.json 的条件符号 + 页面源文件是否存在负责，
 *   并打印 STATIC，绝不把「没建过包」说成「建过包且通过」。
 */
function releasePackageCheck() {
  const shippable = expectations.filter((e) => e.inReleasePackage);
  const excluded = expectations.filter((e) => !e.inReleasePackage);
  if (release.routes) {
    const missing = shippable.filter((e) => !release.routes.has(e.route.slice(1)));
    const phantom = excluded.filter((e) => release.routes.has(e.route.slice(1)));
    if (missing.length) {
      console.error(
        `E2E_ROUTES=RELEASE_PACKAGE_MISMATCH 名册标为可发货、正式产物 app.json 里却没有：${missing
          .map((e) => e.route)
          .join(", ")}`,
      );
      return false;
    }
    if (phantom.length) {
      console.error(
        `E2E_ROUTES=RELEASE_PACKAGE_MISMATCH 名册标为构建档剔除、正式产物 app.json 里却有：${phantom
          .map((e) => e.route)
          .join(", ")} ⇒ 条件派生失效，不许把在册判据建在这份名册上`,
      );
      return false;
    }
    console.log(
      `E2E_ROUTES=RELEASE_PACKAGE_OK 载体=实测对账(${release.appJsonPath}) 可发货=${shippable.length} 构建档剔除=${excluded.length}`,
    );
    return true;
  }
  // 静态口径：可发货页必须有源文件（连编译输入都没有就谈不上产物）
  const noSource = shippable.filter((e) => !pageSourceFile(e.route));
  if (noSource.length) {
    console.error(
      `E2E_ROUTES=RELEASE_PACKAGE_NO_SOURCE 标为可发货却找不到页面源文件：${noSource
        .map((e) => e.route)
        .join(", ")}`,
    );
    return false;
  }
  console.log(
    `E2E_ROUTES=RELEASE_PACKAGE_STATIC 载体=静态派生（盘上没有正式构建产物可比对）：可发货=${shippable.length} 构建档剔除=${excluded.length}` +
      (excluded.length ? `（${excluded.map((e) => `${e.route}:${e.buildConditions.join("+")}`).join(" ")}）` : ""),
  );
  return true;
}
if (!releasePackageCheck()) process.exit(1);

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
  /**
   * 整页被构建档条件编译挡掉（pages.json 的 #ifdef DEV / #ifdef SHOWCASE 注册块，
   * 或模板整页包在 DEV/SHOWCASE 里）：正式包编译期即无内容，不许断言渲染文字。
   * P2 修复前这一枚只看页面模板里的 ifdef DEV，漏掉了 pages.json 用
   * ifdef SHOWCASE 整条剔除的注册项（subpackages/setup/showcase/index 因此被当成可发货页）。
   */
  devOnly: boolean;
  /** 挡掉本页的条件符号；空数组表示任何构建档都会把它编译进去 */
  buildConditions: string[];
  /** 该页在正式（release）包里是否存在。true 才允许对它断言渲染/落点/产物。
   *  ⚠️ 只由 pages.json 条件 + package.json define 派生，与这台机器上有没有 dist/ 产物无关；
   *  产物一致性由生成器的 releasePackageCheck 对账（盘上有 mp-weixin-real/app.json 就逐条比，
   *  对不上 exit 1），对账载体只进控制台。 */
  inReleasePackage: boolean;
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
