import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const r = spawnSync(
  process.execPath,
  ["scripts/qa/generate-e2e-routes.mjs", "--check"],
  { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" },
);
assert.equal(
  r.status,
  0,
  `E2E routes are stale; run node scripts/qa/generate-e2e-routes.mjs\n${r.stdout}\n${r.stderr}`,
);
assert.match(r.stdout, /E2E_ROUTES=OK/u);
console.log("e2e routes contract ok");
