import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

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

/**
 * README 文档链接存在性门（2026-10-29 全量排查后新增）。
 *
 * 起因：README「文档导航」列出 31 条 doc/docs 引用，其中 28 条指向的文件在
 * 提交 aefd8a72（2026-09-22）被整体删除，README 一直没同步，且没有任何门校验过
 * 「文档里写的路径是否真的存在」。本门把这条判点固化下来。
 */
const readmeDocRefs = [...readme.matchAll(/`((?:docs|doc)\/[^`*<]+)`/giu)]
  .map((m) => m[1].replace(/[，。、）)：:;\s]+$/u, ""));

// 正向计数下限：正则失效时不能静默变成「0 条引用 ⇒ 全绿」。
assert.ok(
  readmeDocRefs.length >= 10,
  `README 文档引用只解析到 ${readmeDocRefs.length} 条（<10），本门自身可能失效`,
);

for (const ref of readmeDocRefs) {
  assert.ok(
    existsSync(new URL(ref, root)),
    `README 引用的文档路径不存在：${ref}（历史版本可用 git show aefd8a72^:${ref} 取回）`,
  );
}

/**
 * Node 版本一致性门：.nvmrc ↔ CI setup-node ↔ 根 engines 三者必须指向同一主版本。
 * 起因：本机 PATH 上的 node 是微信开发者工具自带的 v16，与项目 engines(18–22)
 * 和 CI(20) 都不一致，直接跑 `node scripts/…` 会拿到另一个运行时。
 */
const nvmrc = readFileSync(new URL(".nvmrc", root), "utf8").trim();
assert.match(nvmrc, /^\d+$/u, `.nvmrc 必须是纯主版本号，当前：${nvmrc}`);

const ci = readFileSync(new URL(".github/workflows/ci.yml", root), "utf8");
const ciNodeVersions = [...ci.matchAll(/node-version:\s*['"]?(\d+)/giu)].map((m) => m[1]);
assert.ok(ciNodeVersions.length > 0, "CI 未声明 node-version，本门无法校验");
for (const v of new Set(ciNodeVersions)) {
  assert.equal(v, nvmrc, `CI 的 node-version ${v} 与 .nvmrc ${nvmrc} 不一致`);
}

const engines = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const engineRange = engines.engines?.node ?? "";
const rangeMin = Number(engineRange.match(/>=\s*(\d+)/u)?.[1] ?? NaN);
const rangeMax = Number(engineRange.match(/<\s*(\d+)/u)?.[1] ?? NaN);
assert.ok(
  Number(nvmrc) >= rangeMin && Number(nvmrc) < rangeMax,
  `.nvmrc ${nvmrc} 落在 engines.node "${engineRange}" 之外`,
);

console.log(
  `docs contract ok（README 文档链接 ${readmeDocRefs.length} 条全部存在；`
  + `node 主版本 ${nvmrc} 与 CI/engines 一致）`,
);
