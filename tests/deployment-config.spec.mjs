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
// .env.example 与 compose 的必填插值必须【形状相反】：compose 用 ${VAR:?} 缺参即中止，
// 示例文件里就必须是那一行空值（`VAR=`），照抄的人才会被 compose 当场拦下。
//
// 这条判点是本轮反转过来的：原来它写的是 `^APP_AES_SECRET=<PLACEHOLDER>$`——
// 也就是【强制】示例里放一个非空占位。非空占位恰好绕过了 `${VAR:?}`
// （:? 只在"未设置或为空"时中止），于是照抄 .env.example 的运营会顺利通过校验，
// 让一次性 migrate 服务先把这个垃圾 BCrypt 写进 users.password 行；
// 等 AdminPasswordValidator 之后拒绝启动时，那一行已经提交、撤不回来。
// 一扇门把缺陷钉成了规范，这就是"门要判形状而不是判印象"的实证。
const composeAlertingText = readFileSync(
  new URL("../docker-compose.alerting.yml", import.meta.url),
  "utf8",
);
const exampleLines = new Set(envExample.split(/\r?\n/u));
const requiredByCompose = new Set();
for (const text of [composeText, composeAlertingText]) {
  for (const line of text.split(/\r?\n/u)) {
    if (/^\s*#/u.test(line)) continue; // 注释里谈 ${VAR:?} 不算真要求某个变量
    for (const m of line.matchAll(/\$\{([A-Z0-9_]+):?\?/gu)) requiredByCompose.add(m[1]);
  }
}
assert.ok(
  requiredByCompose.size >= 8,
  `compose 侧的必填插值应至少 8 个（当前 ${requiredByCompose.size}）——变少说明 fail-fast 被改成弱默认，那比缺文件更糟`,
);
const badExample = [...requiredByCompose]
  .sort()
  .filter((name) => !exampleLines.has(`${name}=`));
assert.deepEqual(
  badExample,
  [],
  `这些变量 compose 要求必填（:?），但 .env.example 不是一行空值，照抄即可混过校验：` +
    `\n${badExample.map((n) => `  ${n} → 当前为 ${JSON.stringify([...exampleLines].find((l) => l.startsWith(`${n}=`)) ?? "(缺行)")}`).join("\n")}\n` +
    "正确形状是 `NAME=`（空），让 compose 在缺参时中止。",
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
