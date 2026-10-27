import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const REPO = fileURLToPath(new URL("../", import.meta.url));
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
  /image-ref:\s*\$\{\{\s*env\.IMAGE_PREFIX\s*\}\}\/api@\$\{\{\s*steps\.build-api\.outputs\.digest\s*\}\}/u,
  "pushed API image must be scanned by its actual digest",
);
assert.match(
  ci,
  /image-ref:\s*\$\{\{\s*env\.IMAGE_PREFIX\s*\}\}\/admin@\$\{\{\s*steps\.build-admin\.outputs\.digest\s*\}\}/u,
  "pushed Admin image must be scanned by its actual digest",
);
// 本地扫描必须扫「真的存在的那枚镜像」：扫描步骤的 if 条件要与 build 的 load 条件同文，
// 推送扫描的 if 要与 push 条件同文。
//
// 为什么不再用正则：原判据 `image-ref` 只写 `steps.meta-api.outputs.tags` 是否存在于全文，
// 而 build 步骤自己的 `tags:` 输入就是这个串（ci.yml 里 build-api 的 with.tags），
// 于是把 Trivy 的 image-ref 指到一处不存在的引用、或把它的 if 翻成 push 档
// （那一档本地 daemon 里根本没有镜像）时，本门照样绿。
// 现在按 YAML 结构取「哪一步是 Trivy」「哪一步是 build」，再逐对同文比较。
const workflow = YAML.parse(ci);
const jobs = workflow.jobs ?? {};

function findSteps(predicate) {
  const found = [];
  for (const [jobId, job] of Object.entries(jobs)) {
    for (const step of job?.steps ?? []) {
      if (predicate(step)) found.push({ jobId, step });
    }
  }
  return found;
}

const norm = (expr) => String(expr ?? "").replace(/\s+/g, " ").trim();

for (const app of ["api", "admin"]) {
  const build = findSteps((s) => s.id === `build-${app}`);
  assert.equal(build.length, 1, `必须且只能有一个 build-${app} 步骤`);
  const loadExpr = norm(build[0].step.with?.load);
  const pushExpr = norm(build[0].step.with?.push);
  assert.ok(loadExpr, `build-${app} 必须显式声明 with.load`);
  assert.ok(pushExpr, `build-${app} 必须显式声明 with.push`);

  const scans = findSteps(
    (s) => typeof s.uses === "string" && s.uses.startsWith("aquasecurity/trivy-action") &&
      typeof s.with?.["image-ref"] === "string" &&
      s.with["image-ref"].includes(`meta-${app}.outputs.tags`),
  );
  assert.equal(scans.length, 1, `必须恰有一条按本地 tag 扫描 ${app} 的 Trivy 步骤`);
  assert.equal(
    norm(scans[0].step.if),
    loadExpr,
    `本地扫描 ${app} 的 if 必须与 build-${app}.with.load 同文，否则会在没载入镜像的那一档去扫`,
  );

  const digestScans = findSteps(
    (s) => typeof s.uses === "string" && s.uses.startsWith("aquasecurity/trivy-action") &&
      typeof s.with?.["image-ref"] === "string" &&
      s.with["image-ref"].includes(`steps.build-${app}.outputs.digest`),
  );
  assert.equal(digestScans.length, 1, `必须恰有一条按推送 digest 扫描 ${app} 的 Trivy 步骤`);
  assert.equal(
    norm(digestScans[0].step.if),
    pushExpr,
    `推送扫描 ${app} 的 if 必须与 build-${app}.with.push 同文，否则会扫一枚没推上去的 digest`,
  );
}

/**
 * 检查 Dockerfile 的 COPY 源在指定 context 下是否真实存在。
 *
 * 2026-10-25 P0：CI 曾用 context=./apps/admin 构建 Admin 镜像，而 Dockerfile
 * 要复制仓库根的 pnpm-workspace.yaml/pnpm-lock.yaml —— 步骤必失败，但旧门只看
 * image-ref，照样绿。这里按 context 逐个解析 COPY 源，让“上下文与 Dockerfile
 * 不自洽”直接红。
 *
 * 跳过 --from 阶段复制、URL 与 glob（glob 只检查父目录）。
 *
 * @param {string} context Docker build context（相对仓库根）
 * @param {string} dockerfilePath Dockerfile 绝对路径
 * @returns {string[]} 缺失的 COPY 源
 */
function missingCopySources(context, dockerfilePath) {
  const contextRoot = resolve(REPO, context);
  const text = readFileSync(dockerfilePath, "utf8").replace(/\\\r?\n/gu, " ");
  const missing = [];
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^COPY\s+(.+)$/iu);
    if (!match) continue;
    const tokens = match[1].split(/\s+/u).filter(Boolean);
    if (tokens.some((t) => t.startsWith("--from="))) continue;
    const sources = tokens
      .filter((t) => !t.startsWith("--"))
      .slice(0, -1);
    for (const source of sources) {
      if (/^(https?|git):\/\//iu.test(source)) continue;
      const hasGlob = /[*?]/u.test(source);
      const target = hasGlob
        ? dirname(resolve(contextRoot, source))
        : resolve(contextRoot, source);
      if (!existsSync(target)) missing.push(source);
    }
  }
  return missing;
}

const BUILD_CONTEXTS = {
  api: { context: "./apps/api", file: null },
  admin: { context: ".", file: "apps/admin/Dockerfile" },
};
for (const [app, expected] of Object.entries(BUILD_CONTEXTS)) {
  const buildStep = findSteps((s) => s.id === `build-${app}`)[0].step;
  assert.equal(
    buildStep.with?.context,
    expected.context,
    `${app} 镜像 build context 必须与 Dockerfile 的 COPY 源匹配（当前声明: ${buildStep.with?.context}）`,
  );
  if (expected.file) {
    assert.equal(
      buildStep.with?.file,
      expected.file,
      `${app} 镜像必须显式指定 Dockerfile 路径（context 为仓库根时默认 ./Dockerfile 不存在）`,
    );
  }
  const dockerfileRel = expected.file
    ?? `${expected.context.replace(/^\.\//u, "")}/Dockerfile`;
  const dockerfilePath = resolve(REPO, dockerfileRel);
  assert.ok(existsSync(dockerfilePath), `${app} Dockerfile 不存在：${dockerfilePath}`);
  const missing = missingCopySources(expected.context, dockerfilePath);
  assert.deepEqual(
    missing,
    [],
    `${app} 镜像 context=${expected.context} 下缺少 COPY 源：${missing.join(", ")}`,
  );
}

// 负对照：旧 context=./apps/admin 必须在同一把尺下报缺失，否则这条门测的不是真问题。
const adminDockerfile = resolve(REPO, "apps/admin/Dockerfile");
const oldContextMissing = missingCopySources("apps/admin", adminDockerfile);
assert.ok(
  oldContextMissing.length > 0,
  "负对照失败：context=./apps/admin 竟然不缺任何 COPY 源，说明检查器已失效或 Dockerfile 已不再依赖仓库根文件",
);

// 真实栈 E2E 必须存在，且 mock E2E 必须等密钥扫描门一起过。
const realE2e = jobs["e2e-real"];
assert.ok(realE2e, "CI 必须提供 e2e-real 真实栈 job");
assert.deepEqual(
  Object.keys(realE2e.services ?? {}).sort(),
  ["mysql", "redis"],
  "e2e-real 必须自带 MySQL + Redis service（否则 API real 起不来）",
);
const realE2eText = (realE2e.steps ?? [])
  .map((step) => `${step.name ?? ""}\n${step.run ?? ""}\n${JSON.stringify(step.env ?? {})}`)
  .join("\n");
assert.match(
  realE2eText,
  /real-stack-smoke\.spec\.ts/u,
  "e2e-real 必须执行 real-stack-smoke.spec.ts",
);
assert.match(
  realE2eText,
  /E2E_API_MODE.*real/u,
  "e2e-real 必须设置 E2E_API_MODE=real，否则冒烟 spec 会自跳过",
);
const mainE2eNeeds = jobs.e2e?.needs ?? [];
assert.ok(
  mainE2eNeeds.includes("gitleaks-scan"),
  "mock E2E 的 needs 必须包含 gitleaks-scan（原实现可以在密钥门失败时照跑）",
);
const realSpec = readFileSync(
  new URL("../tests/e2e/specs/real-stack-smoke.spec.ts", import.meta.url),
  "utf8",
);
assert.match(
  realSpec,
  /E2E_API_MODE !== 'real'/u,
  "real-stack-smoke.spec.ts 必须在非 real 模式自跳过，避免污染 mock E2E",
);

// metadata 只产生单一 tag；多 tag 会让 image-ref 变成逗号串。
assert.doesNotMatch(ci, /type=sha/u, "metadata must not add a second tag when scan uses outputs.tags");
assert.equal(
  (ci.match(/type=raw,value=\$\{\{ steps\.tag\.outputs\.TAG \}\}/gu) || []).length,
  2,
  "API and Admin metadata should each produce exactly one raw tag",
);

// E2E spec imports must be direct dependencies of the workspace, not ambient npx packages.
const rootPkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
assert.ok(rootPkg.devDependencies["@playwright/test"], "root must declare @playwright/test");
assert.ok(
  rootPkg.devDependencies["@axe-core/playwright"],
  "root must declare @axe-core/playwright",
);
assert.match(ci, /pnpm exec playwright install/u, "CI must install Playwright from pnpm deps");
assert.match(ci, /pnpm exec playwright test/u, "CI must run Playwright from pnpm deps");
assert.doesNotMatch(ci, /npx playwright/u, "CI must not rely on ambient npx Playwright");

// 资产覆盖门的**盘上轴**（scripts/qa/verify-app-assets-coverage.mjs --source-only）必须在 CI 有一发。
// 为什么点的是 --selftest 而不是真读数：CI 检出树里两个盘上根（apps/api/uploads/app-assets、
// apps/client/static-local-backup/full-static）都被 .gitignore 的 *.png/*.jpg/*.jpeg/*.gif/*.webp
// 挡掉了大半（本机实测 495/1354、613/1496 进了 git），真读数每轮必然报几百条"缺件"——
// 那是检出面缺口不是产品缺陷，挂上来就是一条恒红的门。
// 判的是形状而不是字面：CI 若哪天悄悄把这一发删掉（"写了没人跑"的同族事故），本条必须红。
const assetCovSteps = findSteps(
  (step) => typeof step.run === "string" && step.run.includes("verify-app-assets-coverage.mjs"),
);
assert.equal(assetCovSteps.length, 1, "CI 必须恰有一发 verify-app-assets-coverage（多了要核对是哪两条轴）");
assert.match(
  assetCovSteps[0].step.run,
  /--source-only\s+--selftest/u,
  "CI 没有后端 ⇒ 这一发必须走盘上轴的自证（--source-only --selftest），不是 --base 那一档",
);
assert.doesNotMatch(
  ci,
  /verify-app-assets-coverage\.mjs[^\n]*--base/u,
  "CI 不许点 http 轴（--base 在无后端的 CI 只会读成 NOT-EVIDENCED，等于装一扇不表态的门）",
);

console.log("ci image scan contract ok");
