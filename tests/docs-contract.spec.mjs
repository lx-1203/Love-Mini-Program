import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * 部署/构建文档与实现的一致性门（2026-10-25）。
 *
 * 抓过的真实漂移：
 *   - DEPLOYMENT 写 `pnpm client:build:h5:real`，根 package.json 没有这个脚本；
 *   - `build:h5` 被 README 称作生产构建，实际是 mock 档；
 *   - real 档 fail-fast 必需的 APP_AES_SECRET / WEBSOCKET_ALLOWED_ORIGIN_PATTERNS
 *     没进部署表，ADMIN_INITIAL_PASSWORD_HASH 却被标成可选。
 */

const root = new URL("../", import.meta.url);
const deployment = readFileSync(new URL("doc/DEPLOYMENT.md", root), "utf8");
const readme = readFileSync(new URL("README.md", root), "utf8");
const clientPkg = JSON.parse(
  readFileSync(new URL("apps/client/package.json", root), "utf8"),
);

assert.doesNotMatch(
  deployment,
  /pnpm client:build:h5:real/u,
  "DEPLOYMENT 不得再引用不存在的根脚本 pnpm client:build:h5:real",
);
assert.match(
  deployment,
  /pnpm --filter @campus-love\/client run build:h5:real/u,
  "DEPLOYMENT 必须给出真实可执行的 H5 release 构建命令",
);

for (const key of [
  "APP_AES_SECRET",
  "WEBSOCKET_ALLOWED_ORIGIN_PATTERNS",
  "APP_MEDIA_QUERY_TOKEN_STRICT",
]) {
  assert.ok(
    deployment.includes(`\`${key}\``),
    `DEPLOYMENT 环境变量表必须记录 ${key}`,
  );
}
assert.match(
  deployment,
  /\|\s*`ADMIN_INITIAL_PASSWORD_HASH`\s*\|\s*✅/u,
  "ADMIN_INITIAL_PASSWORD_HASH 在 real 档是 fail-fast 必填，部署表不得标为可选",
);

assert.match(
  readme,
  /build:h5\s+# H5 mock 构建（非发布）/u,
  "README 必须把 build:h5 标为 mock/非发布构建",
);
assert.match(
  readme,
  /build:h5:real\s+# H5 release 构建/u,
  "README 必须把 build:h5:real 标为 release 构建",
);

// 文档里的 client workspace 命令必须真实存在，防止再写一个“看起来像命令”的字符串。
const referenced = new Set(
  [...deployment.matchAll(/pnpm --filter @campus-love\/client run ([a-z0-9:_-]+)/giu)]
    .map((m) => m[1]),
);
for (const script of referenced) {
  assert.ok(
    Object.prototype.hasOwnProperty.call(clientPkg.scripts ?? {}, script),
    `DEPLOYMENT 引用的 client 脚本不存在：${script}`,
  );
}

console.log(`docs contract ok（client 命令 ${referenced.size} 条全部存在）`);
