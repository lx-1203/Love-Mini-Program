import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ci = readFileSync(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

// GitHub Actions 表达式不支持 JavaScript 的 .split()。
assert.doesNotMatch(
  ci,
  /\$\{\{[^}]*\.split\(/u,
  "CI must not call JavaScript methods like .split() inside GitHub Actions expressions",
);

// 镜像构建步骤必须可被扫描引用，且 PR/refuse 档把镜像载入本地 Docker。
assert.match(ci, /id:\s*build-api/u, "API image build step must have id: build-api");
assert.match(ci, /id:\s*build-admin/u, "Admin image build step must have id: build-admin");
assert.match(
  ci,
  /load:\s*\$\{\{\s*github\.event_name == 'pull_request' \|\| steps\.push-gate\.outputs\.mode == 'refuse'\s*\}\}/u,
  "PR/refuse builds must use load:true so Trivy can scan the locally built image",
);

// push 档扫描刚推送的 digest；PR/refuse 档扫描本地已加载镜像。
assert.match(
  ci,
  /image-ref:\s*ghcr\.io\/\$\{\{\s*github\.repository\s*\}\}\/api@\$\{\{\s*steps\.build-api\.outputs\.digest\s*\}\}/u,
  "pushed API image must be scanned by its actual digest",
);
assert.match(
  ci,
  /image-ref:\s*ghcr\.io\/\$\{\{\s*github\.repository\s*\}\}\/admin@\$\{\{\s*steps\.build-admin\.outputs\.digest\s*\}\}/u,
  "pushed Admin image must be scanned by its actual digest",
);
assert.match(
  ci,
  /steps\.meta-api\.outputs\.tags\s*\}\}/u,
  "local API scan should reference the deterministic metadata tag",
);

// metadata 只产生单一 tag；多 tag 会让 image-ref 变成逗号串。
assert.doesNotMatch(ci, /type=sha/u, "metadata must not add a second tag when scan uses outputs.tags");
assert.equal(
  (ci.match(/type=raw,value=\$\{\{ steps\.tag\.outputs\.TAG \}\}/gu) || []).length,
  2,
  "API and Admin metadata should each produce exactly one raw tag",
);

console.log("ci image scan contract ok");
