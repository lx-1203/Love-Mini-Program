import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import YAML from "yaml";

/**
 * 发布门接线契约（2026-10-25）。
 *
 * 三件事必须同时成立，否则 CI 会再次出现“本地绿、发布链红”：
 *   1) PR CI 只跑 ci.invalid 占位档，且占位档必须由 verify-env-release 识别为
 *      CI_PLACEHOLDER（不是 PASS）；
 *   2) 真正的 release-gate 必须要求真实域名/凭据，且不得使用占位或 loopback 豁免；
 *   3) verify-client-builds 的 pnpm 路径与回退路径都必须经过同一道发布守卫。
 */

const repoRoot = new URL("../", import.meta.url);
const ci = readFileSync(new URL(".github/workflows/ci.yml", repoRoot), "utf8");
const workflow = YAML.parse(ci);
const jobs = workflow.jobs ?? {};

const phase01 = jobs["phase01-verify"];
assert.ok(phase01, "CI 必须保留 phase01-verify job");
const phaseSteps = phase01.steps ?? [];
const phaseText = phaseSteps.map((step) => `${step.name ?? ""}\n${step.run ?? ""}`).join("\n");
assert.match(
  phaseText,
  /\.env\.real\.local/u,
  "phase01 必须生成 CI 专用 .env.real.local，否则 build:h5:real:ci 读不到占位域名",
);
assert.match(
  phaseText,
  /ci\.invalid/u,
  "phase01 的占位域名必须是 ci.invalid（不可换成真实域名冒充发布）",
);

const releaseGate = jobs["release-gate"];
assert.ok(releaseGate, "CI 必须提供独立的 release-gate job");
assert.match(
  String(releaseGate.if ?? ""),
  /workflow_dispatch/u,
  "release-gate 必须可手动触发",
);
assert.match(
  String(releaseGate.if ?? ""),
  /refs\/tags/u,
  "release-gate 必须在打 tag 时触发",
);
const releaseText = (releaseGate.steps ?? [])
  .map((step) => `${step.name ?? ""}\n${step.run ?? ""}`)
  .join("\n");
assert.match(
  releaseText,
  /verify-env-release\.mjs/u,
  "release-gate 必须真的执行发布环境守卫",
);
assert.doesNotMatch(
  releaseText,
  /--ci-placeholder/u,
  "release-gate 不得使用 CI 占位模式（占位模式不是发布验证）",
);
assert.doesNotMatch(
  releaseText,
  /--allow-loopback/u,
  "release-gate 不得使用 loopback 豁免",
);

const clientPkg = JSON.parse(
  readFileSync(new URL("apps/client/package.json", repoRoot), "utf8"),
);
const realCi = clientPkg.scripts?.["build:h5:real:ci"] ?? "";
assert.match(
  realCi,
  /verify-env-release\.mjs\s+--ci-placeholder/u,
  "build:h5:real:ci 必须先过 --ci-placeholder 守卫",
);
const realLocal = clientPkg.scripts?.["build:h5:real"] ?? "";
assert.match(
  realLocal,
  /verify-env-release\.mjs/u,
  "build:h5:real 必须保留严格发布守卫",
);
assert.doesNotMatch(
  realLocal,
  /--ci-placeholder/u,
  "build:h5:real 不得使用 CI 占位模式",
);

const verifyBuilds = readFileSync(
  new URL("tools/verify-client-builds.mjs", repoRoot),
  "utf8",
);
assert.match(
  verifyBuilds,
  /build:h5:real:ci/u,
  "verify-client-builds 在 CI 必须走占位档",
);
assert.match(
  verifyBuilds,
  /realGuardCommand/u,
  "verify-client-builds 的回退路径必须复用同一道发布守卫变量",
);
assert.match(
  verifyBuilds,
  /verify-env-release\.mjs/u,
  "verify-client-builds 必须引用 verify-env-release",
);
assert.doesNotMatch(
  verifyBuilds,
  /\{ label: "real build", command: `"node_modules\/\.bin\/uni\.CMD" build --platform h5 --mode real` \}/u,
  "回退路径不得再出现未经守卫的 uni build --mode real",
);

/**
 * 非发布档必须给产物盖章（2026-10-29 全量排查）。
 *
 * 判点：build:h5 / build:mp-weixin(:mock/:showcase) 读的是 .env.production /
 * .env.mp-weixin，里面是 127.0.0.1 或 example.com 占位域名。这些产物一旦被直接
 * 拖进微信开发者工具上传，线上就是「所有请求打本机」的包。盖章脚本会把
 * 「本产物不可发布 + 原因」写进 dist，所以它必须挂在每一条非发布构建上，
 * 且自测必须被 test:contracts 接线（建了没人跑＝没有门）。
 */
const rootPkg = JSON.parse(
  readFileSync(new URL("package.json", repoRoot), "utf8"),
);
const NON_SHIPPING_BANDS = [
  "build:h5",
  "build:mp-weixin",
  "build:mp-weixin:mock",
  "build:mp-weixin:showcase",
];
for (const key of NON_SHIPPING_BANDS) {
  const script = clientPkg.scripts?.[key] ?? "";
  assert.match(script, /mark-build-band\.mjs/u, `${key} 必须调用 mark-build-band 给产物盖章`);
  assert.match(script, /--band\s+[a-z0-9-]+/u, `${key} 的盖章必须具名档位`);
  assert.match(script, /--dist\s+\S+/u, `${key} 的盖章必须指明产物目录`);
  assert.doesNotMatch(
    script,
    /--allow-loopback|--ci-placeholder/u,
    `${key} 属非发布档，不得借用发布守卫的豁免旗标冒充可发布`,
  );
}
assert.equal(
  rootPkg.scripts?.["test:build-band"],
  "node apps/client/scripts/mark-build-band.mjs --self-test",
  "mark-build-band 必须有可执行的自测脚本",
);
assert.match(
  rootPkg.scripts?.["test:contracts"] ?? "",
  /npm run test:build-band/u,
  "test:contracts 必须执行 mark-build-band 自测（漏接线）",
);

console.log("release gate contract ok");
