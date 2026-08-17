import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

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
  "../docs/phase-0-1-foundation.md",
  "../docs/phase-1-execution-plan.md",
  "../docs/branching.md",
  "../docs/defect-log-template.md",
  "../docs/release-checklist-template.md",
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
assert.ok(clientPackageJson.dependencies["@dcloudio/uni-app"]);
assert.ok(clientPackageJson.dependencies["@dcloudio/uni-ui"]);
assert.ok(clientPackageJson.dependencies.pinia);
assert.equal(typeof clientPackageJson.scripts["dev:h5:real"], "string");
assert.equal(typeof clientPackageJson.scripts["build:h5:real"], "string");

const pagesJsonRaw = readFileSync(
  new URL("../apps/client/src/pages.json", import.meta.url),
  "utf8"
);
// src/pages.json 使用 JSONC 格式（含注释），需剥离块注释与行注释后再 JSON.parse
const pagesJson = JSON.parse(
  pagesJsonRaw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
);
// 主包页面数量：src/pages.json 包含全部主包页面（login/home/discover/likes/village/messages/
// profile/circles/daily-question/chat/chat-session/shop/campus/verification/heart-signals/
// vip/chat-video-call/chat-red-packet/dev/profile-visitors/profile-album/settings-dnd/feedback-history）
// 共 47 个根页面（v3：-saved、+matching、+match-success、+home/segment）
assert.equal(pagesJson.pages.length, 49, "main package should contain forty-nine root pages (v3: -saved +matching +match-success +home/segment +nearby/people +home/index)");
assert.equal(pagesJson.subPackages.length, 6, "client should use six subpackages (setup/support/discover/legal/market/vip)");
assert.ok(pagesJson.tabBar, "tab bar should be configured");
assert.ok(pagesJson.easycom, "easycom should be configured for uni-ui");
// 寻觅 v3 五 Tab：首页、附近、寻觅、消息、我的（寻觅为中央核心入口）
assert.deepEqual(
  pagesJson.tabBar.list.map((item) => item.text),
  ["首页", "附近", "寻觅", "消息", "我的"],
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

console.log("project structure ok");

