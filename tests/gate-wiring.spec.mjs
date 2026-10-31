import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootPkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const ci = readFileSync(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

// 磁盘对账：tests/ 根下每一条 node 契约门都必须被某个根脚本真正执行。
// 只列不接＝建了没人跑（本仓踩过：新门的 --selftest 全仓零调用点）。
const TESTS_DIR = fileURLToPath(new URL("../tests", import.meta.url));
const specsOnDisk = readdirSync(TESTS_DIR).filter((f) => f.endsWith(".spec.mjs"));
const scriptBody = Object.entries(rootPkg.scripts)
  .map(([k, v]) => `${k} ${v}`)
  .join(" \n ");
for (const spec of specsOnDisk) {
  assert.ok(
    scriptBody.includes(`tests/${spec}`),
    `tests/${spec} 存在于磁盘但没有任何根脚本执行它（漏接线）`,
  );
}
if (specsOnDisk.length < 10) {
  throw new Error(`tests/ 根下只枚举到 ${specsOnDisk.length} 条契约门，扫描面可疑`);
}

// test:contracts 必须把每条 node 门都并进来，且根 test 与 CI 都吃这个入口。
const contracts = rootPkg.scripts["test:contracts"];
assert.equal(typeof contracts, "string", "root script test:contracts must exist");
for (const spec of specsOnDisk) {
  const key = Object.keys(rootPkg.scripts).find(
    (k) => rootPkg.scripts[k] === `node tests/${spec}`,
  );
  assert.ok(key, `tests/${spec} 没有对应的根脚本键（写法须为 "node tests/${spec}"）`);
  assert.ok(
    contracts.includes(`npm run ${key}`),
    `test:contracts 未包含 ${spec}（缺 npm run ${key}）`,
  );
}
assert.match(rootPkg.scripts.test, /test:contracts/u, "root test chain must run test:contracts");
assert.match(ci, /npm run test:contracts/u, "CI must execute the root contract gates");

for (const key of [
  "test:admin",
  "test:coverage",
  "test:deployment-config",
  "test:ci-contract",
  "test:final-verify-summary",
  "api:verify",
]) {
  assert.equal(typeof rootPkg.scripts[key], "string", `root script ${key} must exist`);
}

// 展开后的整条链：根 test 直接挂的 + test:contracts 里挂的，两处算一处。
const effectiveChain = `${rootPkg.scripts.test} && ${rootPkg.scripts["test:contracts"]}`;
for (const cmd of [
  "test:deployment-config",
  "test:ci-contract",
  "test:final-verify-summary",
  "test:admin",
  "test:coverage",
  "api:verify",
]) {
  assert.ok(effectiveChain.includes(cmd), `root test chain must execute ${cmd}`);
}

assert.match(
  ci,
  /pnpm --filter @campus-love\/admin run test:unit/u,
  "CI must execute Admin unit tests",
);
assert.match(
  ci,
  /pnpm --filter @campus-love\/client run test:coverage/u,
  "CI must execute client coverage thresholds",
);
assert.match(
  ci,
  /mvn -B -f apps\/api\/pom\.xml verify/u,
  "CI API gate must run mvn verify so JaCoCo check executes",
);
// 原判据是 doesNotMatch(/mvn ... test/)，一刀切禁掉任何 `mvn test`。
// 但 db-integration job 需要按【单类】定向跑（FlywayMigrationRepeatableTest、
// real profile 鉴权链）：那种跑法必须用 test 阶段，若换成 verify，
// JaCoCo 的覆盖率阈值在只跑一个类时必然不达标 ⇒ 一条恒红的门。
// 真正要禁的是"全量测试止步于 test、把 JaCoCo check 漏掉"，所以判据收窄为：
// 每一处 `mvn ... test` 都必须带 -Dtest= 定向，否则红。
for (const match of ci.matchAll(/mvn -B -f apps\/api\/pom\.xml test\b/gu)) {
  const invocation = ci.slice(match.index, match.index + 400).split("- name:")[0];
  assert.ok(
    /-Dtest=/u.test(invocation),
    "CI must not stop at a full-suite mvn test (JaCoCo check is bound to verify)；" +
      "只有定向单类（带 -Dtest=）可以走 test 阶段，全量跑法一律 verify",
  );
}

console.log("test gate wiring contract ok");
