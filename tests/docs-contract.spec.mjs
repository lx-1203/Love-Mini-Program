import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

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
 * 「文档里写的路径是否真的存在」。
 *
 * 2026-10-30（S0-3）：这条判点被下面的一般化门「全量 markdown 文档引用存在性门」
 * 接管——它扫 README 之外的 doc/*.md 与 PR 模板，并额外校验 `#锚点`。
 * 只查 README 的旧版可以覆盖到 DEPLOYMENT.md 之外的 25 条死链里的一条都不剩。
 */

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
  `docs contract ok（node 主版本 ${nvmrc} 与 CI/engines 一致）`,
);

/**
 * 全量 markdown 文档引用存在性门（2026-10-30，S0-3）。
 *
 * <p>起因：2026-10-29 那轮修掉 28 条死链之后只给 README 加了校验，DEPLOYMENT/RUNBOOKS
 * 等运维文档没人管——本轮复查时 `doc/DEPLOYMENT.md` 又查出 8 条指向 `docs/*` 的死链
 * （含 `docs/release-checklist-template.md`、`docs/DR/*`），而且我昨天新建的
 * `doc/RUNBOOKS.md` 自己也写了两条死链。`test:tracked-refs` 报「缺件=0」是因为它
 * 只查 package.json 脚本、images.ts、CI 产物目录与孤儿脚本，从不解析 markdown 链接。
 * 本门把「文档里反引号括起来的仓库路径必须真的存在」这条判点覆盖到全部运维文档。</p>
 *
 * <p>判点：①路径存在；②`xxx.md#锚点` 的锚点在目标文件里确有对应标题；
 * ③`git show <ref>:<path>` 形式的历史取回说明不计入死链（那本来就是指路，
 * 但写法必须带 git show，否则门看不见）。</p>
 */

/** 只有以仓库顶层目录开头的反引号片段才当路径处理，避免误伤 `/var/log`、`./backups` 等运行时路径。 */
const DOC_REF_PREFIXES = [
  "docs/", "doc/", "scripts/", "tests/", "tools/",
  "docker/", "database/", "apps/", ".github/",
];

/**
 * 历史记录类文档：正文写的是「当时存在」的路径（变更日志、起始设计基线），
 * 把它们改写成 git show 取回说明会破坏可读性，也不属于运维入口。
 * 该清单只允许收缩，不允许新增（下面有计数钉住）。
 */
const HISTORIC_DOC_FILES = new Set([
  "doc/CHANGELOG.md",
  "doc/detailed-design.md",
  "doc/proposal.md",
]);

/** GitHub 风格标题锚点：小写、去掉标点（保留 CJK 与字母数字）、空格转连字符。 */
function headingSlugs(markdownText) {
  const slugs = new Set();
  for (const m of markdownText.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gmu)) {
    slugs.add(
      m[1]
        .toLowerCase()
        .replace(/`/gu, "")
        .replace(/[^\p{L}\p{N}_ -]/gu, "")
        .replace(/\s/gu, "-"),
    );
  }
  return slugs;
}

/** 从一段 markdown 里抽出「疑似仓库路径」的反引号片段。 */
function extractDocRefs(text) {
  const withoutRecovery = text.replace(/git\s+show\s+\S+:\S+/giu, "");
  const refs = [];
  for (const m of withoutRecovery.matchAll(/`([^`\n]+)`/gu)) {
    for (const raw of m[1].split(/\s+/u)) {
      const token = raw
        .replace(/[.,;:!?、。，；：）)】》"'`]+$/u, "")
        .replace(/:\d+$/u, "");
      if (!DOC_REF_PREFIXES.some((p) => token.startsWith(p))) continue;
      if (/[*<>{}|]/u.test(token)) continue;
      // .env / .env.real 一类是运维自建的 gitignore 文件，仓库里本就不入库
      if (/(^|\/)\.env([._-]|$)/u.test(token)) continue;
      refs.push(token);
    }
  }
  return refs;
}

// —— 本门自测：解析器必须能抓到一条真的不存在的引用，且不把合法写法当死链 ——
const selfTestFixture = [
  "合法路径：`doc/DEPLOYMENT.md`",
  "死链：`scripts/__docs_contract_selftest_missing__.sh`",
  "历史取回写法必须被跳过：`git show aefd8a72^:docs/CI-CD.md`",
  "运维自建 env 文件跳过：`apps/client/.env.real`",
  "通配符跳过：`docs/openapi/*.yaml`",
  "运行时路径跳过：`/var/log/api.log`、`./backups`",
].join("\n");
assert.deepEqual(
  extractDocRefs(selfTestFixture),
  ["doc/DEPLOYMENT.md", "scripts/__docs_contract_selftest_missing__.sh"],
  "文档引用解析与预期不符（多抓/漏抓都会让本门失效）",
);
assert.ok(
  !existsSync(new URL("scripts/__docs_contract_selftest_missing__.sh", root)),
  "自测负例必须真的不存在，否则「能变红」这条无从保证",
);
assert.ok(
  headingSlugs("# 概览\n\n## 备份与恢复\n").has("备份与恢复")
    && !headingSlugs("## 备份与恢复").has("不存在的锚点"),
  "锚点解析失效：本门的 #锚点 校验不可信",
);

const docFiles = [
  "README.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ...readdirSync(new URL("doc/", root), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => `doc/${e.name}`),
].filter((f) => existsSync(new URL(f, root)));

let refsChecked = 0;
const deadPathRefs = [];
const deadAnchorRefs = [];
for (const file of docFiles) {
  const text = readFileSync(new URL(file, root), "utf8");
  if (HISTORIC_DOC_FILES.has(file)) continue;
  for (const ref of extractDocRefs(text)) {
    const hashAt = ref.indexOf("#");
    const pathPart = hashAt === -1 ? ref : ref.slice(0, hashAt);
    const anchor = hashAt === -1 ? "" : ref.slice(hashAt + 1);
    refsChecked += 1;
    if (!existsSync(new URL(pathPart, root))) {
      deadPathRefs.push(`${file} -> ${ref}`);
      continue;
    }
    if (anchor && pathPart.endsWith(".md")) {
      const target = readFileSync(new URL(pathPart, root), "utf8");
      if (!headingSlugs(target).has(anchor.toLowerCase())) {
        deadAnchorRefs.push(`${file} -> ${ref}`);
      }
    }
  }
}

// 正向计数下限：正则/清单失效时不能静默退化成「0 条 ⇒ 全绿」。
assert.ok(
  refsChecked >= 80,
  `只解析到 ${refsChecked} 条文档引用（<80），本门自身可能失效`,
);
assert.ok(
  HISTORIC_DOC_FILES.size <= 3,
  `历史豁免文档已膨胀到 ${HISTORIC_DOC_FILES.size} 个，该清单只允许收缩`,
);
assert.deepEqual(deadPathRefs, [], `文档引用了不存在的路径：\n  ${deadPathRefs.join("\n  ")}`);
assert.deepEqual(deadAnchorRefs, [], `文档引用的 #锚点 在目标文件里不存在：\n  ${deadAnchorRefs.join("\n  ")}`);

console.log(
  `docs contract ok（文档引用 ${refsChecked} 条路径与锚点全部可解析，`
  + `覆盖 ${docFiles.length} 个 markdown，历史豁免 ${HISTORIC_DOC_FILES.size} 个文件）`,
);
