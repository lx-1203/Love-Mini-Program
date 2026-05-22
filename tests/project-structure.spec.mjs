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
  "../apps/api/src/main/resources/application-db.yml",
  "../apps/client/package.json",
  "../apps/client/.env.real",
  "../apps/client/App.vue",
  "../apps/client/main.ts",
  "../apps/client/pages.json",
  "../apps/client/manifest.json",
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
  "../apps/client/src/stores/match.ts",
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
assert.match(appYaml, /profiles:\s*\n\s*default:\s*mock/u);

const mockYaml = readFileSync(
  new URL("../apps/api/src/main/resources/application-mock.yml", import.meta.url),
  "utf8"
);
assert.match(mockYaml, /DataSourceAutoConfiguration/u);
assert.match(mockYaml, /FlywayAutoConfiguration/u);

const dbYaml = readFileSync(
  new URL("../apps/api/src/main/resources/application-db.yml", import.meta.url),
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
assert.match(openApi, /\/matches\/form-config:/u);
assert.match(openApi, /\/matches\/quick:/u);
assert.match(openApi, /\/_debug\/matches\/next-status\/\{queueStatus\}:/u);
assert.match(openApi, /\/_debug\/errors\/\{status\}:/u);
assert.match(openApi, /\/temp-chat\/sessions:/u);
assert.match(openApi, /\/recommendations\/discussions:/u);
assert.match(openApi, /\/recommendations\/activities:/u);
assert.match(openApi, /\/feedback\/issues:/u);
assert.match(openApi, /\/feedback\/suggestions:/u);
assert.match(openApi, /\/feedback\/activity-proposals:/u);

const clientPackageJson = JSON.parse(
  readFileSync(new URL("../apps/client/package.json", import.meta.url), "utf8")
);
assert.equal(clientPackageJson.type, "module");
assert.equal(clientPackageJson.dependencies.vue, "3.5.34");
assert.ok(clientPackageJson.dependencies["@dcloudio/uni-app"]);
assert.ok(clientPackageJson.dependencies["@dcloudio/uni-ui"]);
assert.ok(clientPackageJson.dependencies.pinia);
assert.equal(typeof clientPackageJson.scripts["dev:h5:real"], "string");
assert.equal(typeof clientPackageJson.scripts["build:h5:real"], "string");

const pagesJson = JSON.parse(
  readFileSync(new URL("../apps/client/pages.json", import.meta.url), "utf8")
);
assert.equal(pagesJson.pages.length, 9, "main package should contain nine root pages");
assert.equal(pagesJson.subPackages.length, 3, "client should use three subpackages");
assert.ok(pagesJson.tabBar, "tab bar should be configured");
assert.ok(pagesJson.easycom, "easycom should be configured for uni-ui");
assert.deepEqual(
  pagesJson.tabBar.list.map((item) => item.text),
  ["寻觅", "喜欢", "村口", "消息", "我的"],
  "tab bar should follow the reconstructed social IA order"
);
assert.deepEqual(
  pagesJson.tabBar.list.map((item) => item.pagePath),
  [
    "pages/discover/index",
    "pages/likes/index",
    "pages/village/index",
    "pages/messages/index",
    "pages/profile/index",
  ],
  "tab bar paths should match the five reconstructed primary tabs"
);

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
assert.match(readme, /mock mode/iu);
assert.match(readme, /real mode/iu);
assert.match(readme, /temporary anonymous chat/iu);

console.log("project structure ok");
