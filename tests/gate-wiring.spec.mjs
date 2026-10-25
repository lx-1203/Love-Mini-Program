import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rootPkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const ci = readFileSync(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

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

const rootTest = rootPkg.scripts.test;
for (const cmd of [
  "test:deployment-config",
  "test:ci-contract",
  "test:final-verify-summary",
  "test:admin",
  "test:coverage",
  "api:verify",
]) {
  assert.ok(rootTest.includes(cmd), `root test chain must execute ${cmd}`);
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
assert.doesNotMatch(
  ci,
  /mvn -B -f apps\/api\/pom\.xml test\b/u,
  "CI must not stop at mvn test (JaCoCo check is bound to verify)",
);

console.log("test gate wiring contract ok");
