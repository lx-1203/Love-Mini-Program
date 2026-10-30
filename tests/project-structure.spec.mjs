import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import JSON5 from "json5";

const requiredPaths = [
  "../package.json",
  "../.gitignore",
  "../README.md",
  "../.github/CODEOWNERS",
  "../.github/pull_request_template.md",
  "../.github/workflows/ci.yml",
  "../apps/api/pom.xml",
  "../apps/api/mvnw",
  "../apps/api/mvnw.cmd",
  "../apps/api/.mvn/wrapper/maven-wrapper.properties",
  "../apps/api/src/main/java/com/campuslove/api/CampusLoveApplication.java",
  "../apps/api/src/main/java/com/campuslove/api/growth/AppConfigController.java",
  "../apps/api/src/main/java/com/campuslove/api/feedback/FeedbackController.java",
  "../apps/api/src/main/resources/application.yml",
  "../apps/api/src/main/resources/application-mock.yml",
  "../apps/api/src/main/resources/application-real.yml",
  "../apps/client/package.json",
  "../apps/client/.env.real",
  "../apps/client/src/App.vue",
  "../apps/client/src/main.ts",
  "../apps/client/src/pages.json",
  "../apps/client/src/manifest.json",
  "../apps/client/tsconfig.json",
  "../apps/client/uni.scss",
  "../apps/client/vite.config.ts",
  "../apps/client/src/theme/tokens.ts",
  "../apps/client/src/config/home-sections.ts",
  "../apps/client/src/config/match-form.ts",
  "../apps/client/src/config/status-copy.ts",
  "../apps/client/src/guards/session-guard.ts",
  "../apps/client/src/features/login/hero.ts",
  "../apps/client/src/features/chat/session-machine.ts",
  "../apps/client/src/services/generated/api-types.ts",
  "../apps/client/src/stores/session.ts",
  "../apps/client/src/stores/home.ts",
  "../apps/client/src/stores/discover.ts",
  "../apps/client/src/stores/chat.ts",
  "../apps/client/src/stores/profile.ts",
  "../apps/client/src/stores/feedback.ts",
  "../apps/admin/package.json",
  "../doc/DEPLOYMENT.md",
  "../docs/openapi/feedback-growth-and-auth.yaml",
  "../tools/lint-openapi.mjs",
  "../database/flyway/sql/V2026.05.18.2200__phase0_phase1_client_foundation.sql",
];

for (const path of requiredPaths) {
  const ref = new URL(path, import.meta.url);
  assert.ok(existsSync(ref), `${path} should exist`);
}

const rootPackageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);
assert.equal(rootPackageJson.private, true, "workspace package.json should be private");
assert.deepEqual(
  rootPackageJson.workspaces,
  ["apps/client", "apps/admin"],
  "root workspaces should include client and admin"
);
assert.equal(typeof rootPackageJson.scripts["api:dev"], "string");
assert.equal(typeof rootPackageJson.scripts["api:test"], "string");
assert.equal(typeof rootPackageJson.scripts["client:dev:h5"], "string");
assert.equal(typeof rootPackageJson.scripts["client:dev:h5:real"], "string");
assert.equal(typeof rootPackageJson.scripts["verify:phase01"], "string");

const appYaml = readFileSync(
  new URL("../apps/api/src/main/resources/application.yml", import.meta.url),
  "utf8"
);
assert.match(appYaml, /spring:\s*\n\s*application:\s*\n\s*name:\s*campus-love-api/u);
assert.match(appYaml, /profiles:\s*(?:#[^\n]*\r?\n\s*)*default:\s*mock/u);

const mockYaml = readFileSync(
  new URL("../apps/api/src/main/resources/application-mock.yml", import.meta.url),
  "utf8"
);
assert.match(mockYaml, /DataSourceAutoConfiguration/u);
assert.match(mockYaml, /FlywayAutoConfiguration/u);

const dbYaml = readFileSync(
  new URL("../apps/api/src/main/resources/application-real.yml", import.meta.url),
  "utf8"
);
assert.match(dbYaml, /datasource:/u);
assert.match(dbYaml, /flyway:/u);

const openApi = readFileSync(
  new URL("../docs/openapi/feedback-growth-and-auth.yaml", import.meta.url),
  "utf8"
);
assert.match(openApi, /\/app-config\/login-hero:/u);
assert.match(openApi, /\/auth\/wechat-login:/u);
assert.match(openApi, /\/profile\/basic:/u);
assert.match(openApi, /\/profile\/campus:/u);
assert.match(openApi, /\/profile\/schedule:/u);
assert.match(openApi, /\/home\/dashboard:/u);
assert.match(openApi, /\/_debug\/matches\/next-status\/\{queueStatus\}:/u);
assert.match(openApi, /\/_debug\/errors\/\{status\}:/u);
assert.match(openApi, /\/temp-chat\/sessions:/u);
assert.match(openApi, /\/recommendations\/discussions:/u);
assert.match(openApi, /\/recommendations\/activities:/u);
assert.match(openApi, /\/feedback\/issues:/u);
assert.match(openApi, /\/feedback\/suggestions:/u);
assert.match(openApi, /\/feedback\/activity-proposals:/u);

const likesOpenApi = readFileSync(
  new URL("../docs/openapi/likes.yaml", import.meta.url),
  "utf8"
);
assert.match(likesOpenApi, /\/matches\/form-config:/u);
assert.match(likesOpenApi, /\/matches\/quick:/u);

const clientPackageJson = JSON.parse(
  readFileSync(new URL("../apps/client/package.json", import.meta.url), "utf8")
);
assert.equal(clientPackageJson.type, "module");
assert.equal(clientPackageJson.dependencies.vue, "3.4.21");
// uni-app / uni-ui 是**构建期**依赖：产物由 vite 打包成自包含文件，运行时不从 node_modules 取。
// 本断言的意图是"这两颗包必须仍在项目依赖里声明"（防止被误删），不是钉死它们必须在 prod 面。
// 2026-10-29：把它们移到 devDependencies，让 `pnpm audit --prod` 只覆盖真实运行时依赖
// （adm-zip / express / jimp 等高危 advisory 全部来自 @dcloudio 的工具链子依赖）。
const declaredClientDeps = {
  ...clientPackageJson.dependencies,
  ...clientPackageJson.devDependencies,
};
assert.ok(declaredClientDeps["@dcloudio/uni-app"]);
assert.ok(declaredClientDeps["@dcloudio/uni-ui"]);
assert.ok(clientPackageJson.dependencies["@dcloudio/uni-app"] === undefined,
  "uni-app 应留在 devDependencies：留在 dependencies 会把构建链 advisory 拉进 --prod 审计面");
assert.ok(clientPackageJson.dependencies.pinia);
assert.equal(typeof clientPackageJson.scripts["dev:h5:real"], "string");
assert.equal(typeof clientPackageJson.scripts["build:h5:real"], "string");

const pagesJsonRaw = readFileSync(
  new URL("../apps/client/src/pages.json", import.meta.url),
  "utf8"
);
// src/pages.json 使用 JSONC 格式（含块注释、行尾注释、尾逗号）；
// JSON5 与 JSONC 兼容且不会像手写正则那样把字符串里的 // 删坏。
const pagesJson = JSON5.parse(pagesJsonRaw);
// 主包与分包数量按当前 pages.json 的单一真源断言（原注释/数字停在三年前的分包布局，
// 会让结构门永久假红；这里只校验 JSON 可解析后的实际结构，不维护第二份路由清单）。
assert.equal(pagesJson.pages.length, 8, "main package should contain eight root pages");
assert.equal(pagesJson.subPackages.length, 13, "client should use thirteen subpackages");
assert.ok(pagesJson.tabBar, "tab bar should be configured");
assert.ok(pagesJson.easycom, "easycom should be configured for uni-ui");
// 寻觅 v3 五 Tab：首页、附近、匹配、消息、我的（中央 Tab 文案为「匹配」；
// 「寻觅」只是该页页头标题，pages.json 注释已明确不得互改）
assert.deepEqual(
  pagesJson.tabBar.list.map((item) => item.text),
  ["首页", "附近", "匹配", "消息", "我的"],
  "tab bar should follow the v3 explore IA order"
);
assert.deepEqual(
  pagesJson.tabBar.list.map((item) => item.pagePath),
  [
    "pages/home/index",
    "pages/nearby/index",
    "pages/discover/index",
    "pages/messages/index",
    "pages/profile/index",
  ],
  "tab bar paths should match the five pure-match primary tabs"
);

const homeIndex = readFileSync(new URL("../apps/client/src/pages/home/index.vue", import.meta.url), "utf8");
const discoverIndex = readFileSync(new URL("../apps/client/src/pages/discover/index.vue", import.meta.url), "utf8");
const nearbyIndex = readFileSync(new URL("../apps/client/src/pages/nearby/index.vue", import.meta.url), "utf8");
assert.doesNotMatch(homeIndex, /import\s+CardSwiper/i, "home page must not import CardSwiper");
assert.doesNotMatch(homeIndex, /<CardSwiper/i, "home page must not render CardSwiper");
assert.match(homeIndex, /homeFeed/, "home page should consume homeFeed");
assert.doesNotMatch(discoverIndex, /communityPosts/, "discover page must not own community feed");
assert.doesNotMatch(discoverIndex, /loveProgress/, "discover page must not own love progress");
assert.doesNotMatch(nearbyIndex, /matchCenter/, "nearby page must not own match center");

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
assert.match(readme, /mock mode/iu);
assert.match(readme, /real mode/iu);
assert.match(readme, /temporary anonymous chat/iu);

// real profile fail-fast 必填项必须在 Compose 与示例环境变量两处同时可见，
// 否则按仓库文档启动会在 AesEncryptor / WebSocketConfig 初始化阶段失败。
const compose = readFileSync(
  new URL("../docker-compose.yml", import.meta.url),
  "utf8"
);
assert.match(
  compose,
  /APP_AES_SECRET:\s*\$\{APP_AES_SECRET:\?[^}]*\}/u,
  "compose API must require APP_AES_SECRET without a weak default"
);
assert.match(
  compose,
  /WEBSOCKET_ALLOWED_ORIGIN_PATTERNS:\s*\$\{WEBSOCKET_ALLOWED_ORIGIN_PATTERNS:\?[^}]*\}/u,
  "compose API must require WEBSOCKET_ALLOWED_ORIGIN_PATTERNS without a weak default"
);

const envExample = readFileSync(
  new URL("../.env.example", import.meta.url),
  "utf8"
);
assert.match(
  envExample,
  /^APP_AES_SECRET=<PLACEHOLDER>$/mu,
  ".env.example must document APP_AES_SECRET"
);
assert.match(
  envExample,
  /^WEBSOCKET_ALLOWED_ORIGIN_PATTERNS=$/mu,
  ".env.example must document WEBSOCKET_ALLOWED_ORIGIN_PATTERNS"
);

/**
 * SCSS/CSS 不许带 UTF-8 BOM。
 *
 * 实测因果（2026-10-25）：apps/client/src/styles/tokens.scss 带 BOM 时
 * `npm run build:h5` 直接失败——uni/vite 的 sass 走 legacy JS API，把 @import 目标
 * 当字符串再解析，BOM 落到非 0 位置就报 `[vite:css] [sass] expected "{".`
 * 指向 App.vue 里那行 @import（报错位置不在真正的坏点上，人肉排查会绕远）。
 * 摘掉 BOM 后同一命令 DONE Build complete. / REAL_EXIT=0。
 * .vue 文件带 BOM 不受影响（现存 58 个照常构建），所以判点只覆盖独立样式文件。
 */
const styleFiles = [];
for (const app of ["client", "admin"]) {
  const dir = new URL(`../apps/${app}/src`, import.meta.url);
  walkStyles(fileURLToPath(dir), styleFiles);
}
function walkStyles(dir, out) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walkStyles(p, out);
    else if (/\.(scss|css)$/u.test(p)) out.push(p);
  }
}
assert.ok(styleFiles.length >= 10, `只扫到 ${styleFiles.length} 个样式文件，扫描面可疑`);
for (const file of styleFiles) {
  const bytes = readFileSync(file);
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  assert.equal(
    hasBom,
    false,
    `${file} 以 UTF-8 BOM 开头：uni/vite 的 sass legacy 管道会因此报 expected "{" 并让 H5 构建失败`,
  );
}

console.log("project structure ok");

