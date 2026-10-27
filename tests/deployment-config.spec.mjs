import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import YAML from "yaml";

/**
 * Compose 必填项必须在 **api 服务自己的 environment** 上，且必须是缺参即失败的插值。
 *
 * 为什么不再是全文正则：原判据 `APP_AES_SECRET:\s*\$\{APP_AES_SECRET:\?...}` 在任何一行成立都算过，
 * 所以把这行挪到 admin/client 服务上、api 仍然拿不到变量时，门照样绿
 *（AesEncryptor 与 WebSocketConfig 在 real 档都是 fail-fast，缺了就起不来）。
 * 现在按 YAML 结构取 services.api.environment 这个对象来判。
 */
const composeText = readFileSync(
  new URL("../docker-compose.yml", import.meta.url),
  "utf8",
);
const compose = YAML.parse(composeText);
const apiService = compose?.services?.api;
assert.ok(apiService, "docker-compose.yml 必须定义 api 服务");
const apiEnv = apiService.environment ?? {};

const REQUIRED_ON_API = ["APP_AES_SECRET", "WEBSOCKET_ALLOWED_ORIGIN_PATTERNS"];
for (const name of REQUIRED_ON_API) {
  const value = apiEnv[name];
  assert.ok(
    typeof value === "string" && value.length > 0,
    `services.api.environment 必须声明 ${name}（real 档缺它 fail-fast）`,
  );
  // 必须是 ${NAME:?提示} 形态：缺参即 compose 报错，而不是 :- 给个弱默认值蒙过去
  const strictInterpolation = new RegExp(`^\\$\\{${name}:\\?[^}]*\\}$`, "u");
  assert.match(
    value,
    strictInterpolation,
    `${name} 必须是 \${${name}:?…} 必填插值，不许用 :- 弱默认或写死值`,
  );
}

// 反向对照：这两项必须真的挂在 api 上，而不是别的服务上有、api 空着
//（原全文正则正是被这种错位满足的）。
for (const [serviceId, service] of Object.entries(compose.services ?? {})) {
  if (serviceId === "api") continue;
  const env = service?.environment;
  if (!env) continue;
  for (const name of REQUIRED_ON_API) {
    assert.equal(
      env[name],
      undefined,
      `${name} 只应出现在 api 服务上；出现在 ${serviceId} 会让全文正则误判 api 已配置`,
    );
  }
}

const envExample = readFileSync(
  new URL("../.env.example", import.meta.url),
  "utf8",
);
assert.match(
  envExample,
  /^APP_AES_SECRET=<PLACEHOLDER>$/mu,
  ".env.example must document APP_AES_SECRET",
);
assert.match(
  envExample,
  /^WEBSOCKET_ALLOWED_ORIGIN_PATTERNS=$/mu,
  ".env.example must document WEBSOCKET_ALLOWED_ORIGIN_PATTERNS",
);
assert.match(
  envExample,
  /^IMAGE_PREFIX=/mu,
  ".env.example must document IMAGE_PREFIX (single source for compose/CI/docs)",
);

// 镜像命名单一来源：compose、CI metadata、部署文档不得再各自写死一套。
for (const [serviceId, suffix] of [["api", "/api"], ["admin", "/admin"]]) {
  const image = compose.services?.[serviceId]?.image;
  assert.ok(
    typeof image === "string" && image.startsWith("${IMAGE_PREFIX"),
    `services.${serviceId}.image 必须以 \${IMAGE_PREFIX…} 开头（当前: ${image}）`,
  );
  assert.match(
    image,
    new RegExp(`\\$\\{IMAGE_PREFIX[^}]*\\}${suffix}:`, "u"),
    `services.${serviceId}.image 必须由 IMAGE_PREFIX 派生 ${suffix}`,
  );
}

const deploymentDoc = readFileSync(
  new URL("../doc/DEPLOYMENT.md", import.meta.url),
  "utf8",
);
assert.match(
  deploymentDoc,
  /\$\{IMAGE_PREFIX:-campus-love\}\/api:/u,
  "DEPLOYMENT 镜像表必须使用 IMAGE_PREFIX 派生 api 镜像",
);
assert.match(
  deploymentDoc,
  /\$\{IMAGE_PREFIX:-campus-love\}\/admin:/u,
  "DEPLOYMENT 镜像表必须使用 IMAGE_PREFIX 派生 admin 镜像",
);
assert.match(
  deploymentDoc,
  /\$IMAGE_PREFIX\/api:/u,
  "DEPLOYMENT 的 cosign 示例必须使用 IMAGE_PREFIX",
);
assert.doesNotMatch(
  deploymentDoc,
  /campus-love-api:\$TAG|campus-love-admin:\$TAG/u,
  "DEPLOYMENT 不得再出现第三套镜像名（campus-love-api:$TAG / campus-love-admin:$TAG）",
);

const ciWorkflow = YAML.parse(
  readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
);
const securityScan = ciWorkflow.jobs?.["security-scan"];
assert.ok(securityScan, "CI 必须保留 security-scan job");
assert.match(
  String(securityScan.env?.IMAGE_PREFIX ?? ""),
  /vars\.IMAGE_PREFIX|github\.repository/u,
  "security-scan 必须从 vars.IMAGE_PREFIX / github.repository 派生 IMAGE_PREFIX",
);
const metaImages = (securityScan.steps ?? [])
  .filter((step) => String(step.uses ?? "").startsWith("docker/metadata-action"))
  .map((step) => String(step.with?.images ?? ""));
assert.deepEqual(
  metaImages.sort(),
  ["${{ env.IMAGE_PREFIX }}/admin", "${{ env.IMAGE_PREFIX }}/api"].sort(),
  "metadata-action 的镜像名必须统一由 env.IMAGE_PREFIX 派生",
);

console.log("deployment config contract ok");
