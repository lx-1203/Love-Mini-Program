#!/usr/bin/env node
/**
 * 引用完整性检查（2026-10-27）：已跟踪文件所引用的路径，是否也在版本库里。
 *
 * 为什么存在：本程连撞两例同型缺陷——
 *   ① `apps/client/src/config/images.ts` 的四个图标常量被四处已提交代码引用，
 *      但素材本身因根 `.gitignore` 的 `*.png` 而从没进库 ⇒ 新克隆出来那几个 UI 位置取不到图；
 *   ② `apps/client/package.json` 的 `build:mp-weixin:real:dev` 指向 `scripts/build-mp-real-dev.mjs`，
 *      该脚本未跟踪 ⇒ 新克隆跑这个 npm 目标必然失败。
 * 两例都不是编译能发现的（引用的是路径字符串），而 `git status` 干净也照不出——
 * 因为「引用者已入库、被引用者没入库」这种状态在 git 看来完全正常。
 *
 * 检查面（只查能被静态解析出来的那类引用）：
 *   1. 各 package.json 的 scripts：`node <路径>`、`bash <路径>`、`sh <路径>`、`-f <路径>`；
 *   2. apps/client/src/config/images.ts 里 `/static/...` 形态的 pkg 路径（映射到 src/static）；
 *   3. docker-compose.yml 的 build.context / dockerfile / volumes 宿主路径；
 *   4. .github/workflows/*.yml 的 path / path-context / file / dockerfile 输入。
 * 判定：路径必须 ① 盘上存在 ② 被 git 跟踪。缺一即红。
 *
 * 用法：node scripts/qa/check-tracked-references.mjs [--strict] [--json]
 * 退出码：0 通过 / 1 有缺件或未入库（仅 --strict）/ 2 前置条件坏了（读不到 git 清单＝判据失效，不等于通过）。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const strict = process.argv.includes("--strict");
const asJson = process.argv.includes("--json");

let trackedList;
try {
  // 必须 -c core.quotePath=false：否则非 ASCII 文件名被转义成 "...å¹..."，
  // 与明文路径永不匹配 ⇒ 中文命名的素材会整批误报「未入库」（本程实测虚报 372 条，真缺只有个位数）。
  trackedList = execFileSync("git", ["-c", "core.quotePath=false", "ls-files"], { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split(/\r?\n/).filter(Boolean).map((p) => p.replace(/\\/g, "/"));
} catch (e) {
  console.log(`TRACKEDREFS=NOT-EVIDENCED reason=git ls-files 跑不了（${e.message}）——判据失效，不是通过`);
  process.exit(2);
}
if (trackedList.length < 500) {
  console.log(`TRACKEDREFS=NOT-EVIDENCED reason=git ls-files 只列出 ${trackedList.length} 个文件，扫描面可疑`);
  process.exit(2);
}
const tracked = new Set(trackedList);

/** 允许不被跟踪的目录前缀（构建产物、依赖、运行时存储、可再生的临时件） */
const EXEMPT = [
  "node_modules/", "apps/client/node_modules/", "dist/", "tmp/", ".zcode/", "data/", ".qa/",
  "apps/api/uploads/", "apps/client/static-local-backup/", "apps/client/archive/",
  "reports/screenshots/", "apps/api/target/", "coverage/",
  // 数据库导出：内含真实用户行，按裁定永不入库（本地留档用）。
  "database/backup/",
];
const isExempt = (p) => EXEMPT.some((e) => p.startsWith(e) || p.includes("/" + e.replace(/\/$/, "") + "/"));

const findings = [];
let checked = 0;
function want(rel, from, kind) {
  // 先折叠 ../：npm script 里 `node ../../scripts/x.mjs` 不归一会得到
  // `apps/client/../../scripts/...`，与清单里的 `scripts/...` 对不上 ⇒ 误报「未入库」。
  const p = relative(REPO, resolve(REPO, rel)).replace(/\\/g, "/").replace(/^\.\//, "");
  if (!p || p.startsWith("http") || p.includes("$") || p.includes("{")) return; // 变量/URL 不是本地路径
  if (isExempt(p)) return;
  checked++;
  const abs = join(REPO, p);
  if (!existsSync(abs)) { findings.push({ kind, from, path: p, why: "盘上不存在" }); return; }
  if (!tracked.has(p) && !(statSync(abs).isDirectory() && trackedList.some((t) => t.startsWith(p + "/")))) {
    findings.push({ kind, from, path: p, why: "盘上有但未入库（新克隆拿不到）" });
  }
}

/* 1) package.json scripts */
const pkgFiles = ["package.json", "apps/client/package.json", "apps/admin/package.json"].filter((f) => existsSync(join(REPO, f)));
for (const f of pkgFiles) {
  const j = JSON.parse(readFileSync(join(REPO, f), "utf8"));
  const base = dirname(f) === "." ? "" : dirname(f) + "/";
  for (const [name, cmd] of Object.entries(j.scripts || {})) {
    for (const m of String(cmd).matchAll(/(?:^|[\s&;(])(?:node|bash|sh|ts-node)\s+(?:--[\w=-]+\s+)*([\w./-]+\.(?:mjs|cjs|js|ts|sh|ps1))\b/g)) {
      want(base + m[1], `${f}#${name}`, "npm-script");
    }
    for (const m of String(cmd).matchAll(/-f\s+([\w./-]+\.(?:xml|sql|ya?ml|json))/g)) want(base + m[1], `${f}#${name}`, "npm-script");
  }
}

/* 2) images.ts 的 /static/ 素材引用 */
const IMGTS = "apps/client/src/config/images.ts";
if (existsSync(join(REPO, IMGTS))) {
  // 剥注释：该文件头尾有大段形如 `/static/assets/...`、`/static/<rel>` 的说明示例，
  // 不剥会被当成真引用，报成「盘上不存在」。
  const src = readFileSync(join(REPO, IMGTS), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const m of src.matchAll(/['"](\/static\/[^'"]+)['"]/g)) want("apps/client/src" + m[1], IMGTS, "asset");
}

/* 3) docker-compose 的路径字段：dockerfile 是**相对各自 build.context** 的，不能按仓库根解析 */
if (existsSync(join(REPO, "docker-compose.yml"))) {
  const y = readFileSync(join(REPO, "docker-compose.yml"), "utf8");
  // dockerfile 属于**它上面最近的那个 context**（compose 的 build 块里 context 常在 dockerfile 前一两行），
  // 按仓库根解析会把 apps/api/Dockerfile 误报成根下的 Dockerfile 不存在。
  const ctxOf = (fromIdx) => {
    const before = y.slice(0, fromIdx).split("\n");
    for (let i = before.length - 1; i >= 0; i--) {
      const m = before[i].match(/^\s*context:\s*([\w./-]+)\s*$/);
      if (m) return m[1];
      if (/^\s*(-\s|#|dockerfile:|\w[\w.-]*:)/.test(before[i]) && !/^\s*(dockerfile|context):/.test(before[i])) continue;
      if (/^  [a-z][\w-]*:\s*$/.test(before[i])) break;
    }
    return ".";
  };
  for (const m of y.matchAll(/^(\s*)context:\s*([\w./-]+)\s*$/gm)) {
    if (m[2] !== ".") want(m[2], "docker-compose.yml", "compose");
  }
  for (const m of y.matchAll(/^(\s*)dockerfile:\s*([\w./-]+)\s*$/gm)) {
    const ctx = ctxOf(m.index);
    want(join(ctx === "." ? "" : ctx, m[2]), "docker-compose.yml", "compose");
  }
  for (const m of y.matchAll(/^\s*-\s+([\w./-]+):\/\/\s*$/gm)) want(m[1], "docker-compose.yml", "compose");
}

/* 4) CI 的路径字段。只查**输入**：产物/输出目录（upload-artifact 的 path、报告目录）构建前不存在，不算缺件 */
const CI_OUTPUT = /(^|\/)(report|reports|out|dist|artifacts?|results?|coverage)$/;
const wfDir = join(REPO, ".github", "workflows");
if (existsSync(wfDir)) {
  for (const wf of readdirSync(wfDir)) {
    const y = readFileSync(join(wfDir, wf), "utf8");
    for (const m of y.matchAll(/^\s*(?:path|path-context|file|dockerfile|settings-path|pom-path):\s*([\w./-]+)\s*$/gm)) {
      if (CI_OUTPUT.test(m[1])) continue;
      want(m[1], `.github/workflows/${wf}`, "ci");
    }
    for (const m of y.matchAll(/-f\s+([\w./-]+\.(?:xml|yml|yaml))/g)) want(m[1], `.github/workflows/${wf}`, "ci");
  }
}

/* 5) 部署关键目录的「盘上有、库里无」孤儿件。
 *
 * 引用门只查「有人按名字引用它」，但这两类载具不是按名字工作的：
 *   - Flyway 按**目录里的文件**依次应用 ⇒ 一条没被任何文件名引用的迁移，本地库会应用、新克隆拿不到；
 *   - CI/本地脚本按**目录**扫 tests/ 与 scripts/ ⇒ 缺件表现为"少跑了几项"而不是报错。
 * 2026-10-27 实测就是前者：V2026.10.26.0001__disable_public_test_admin.sql 在盘上、不在 HEAD，
 * 从空库跑完整**已入库**迁移链必然得到「active 超管 + 仓库里公开的口令」，
 * 而本机库早被那条未入库迁移手工收口过 ⇒ 每一个本地探针（含专门盯这件事的 admin-credential 门，
 * 它判的是 existsSync 磁盘）都绿。这条判据的存在理由：把"本地绿、克隆红"变成红。
 */
const ORPHAN_DIRS = ["database/flyway/sql", "scripts", "tests", ".github/workflows"];
// 只扫「新克隆拿不到就会少跑东西」的权威件：脚本与配置。
// 日志/抓图/csv/自签证书/Playwright 产物按定义不该进库——把它们算成缺陷，
// 等于让门教人提交私钥（scripts/dev-proxy/key.pem 就在原始清单里）。
const ORPHAN_EXTS = /\.(?:mjs|cjs|js|ts|tsx|py|sh|ps1|cmd|sql|ya?ml)$/i;
// 一次性调试产物的存放地：里面的脚本是本地救火件，不是交付链的一环。
const ORPHAN_SKIP = ["scripts/archive/", "scripts/dev-proxy/", "scripts/launcher/", "tests/e2e/test-results/", "tests/e2e/tests/"];
/**
 * 已知孤儿（前几轮的一次性工具，按裁定不补交，但必须留名可追）。
 * 这条清单**只许收缩**：任何一条一旦入库或删掉，下面"腐化检查"会红，逼着来的人把它划掉。
 */
const ORPHAN_BASELINE = new Set([
  "scripts/analyze-scan.mjs", // 一次性分析器：依赖已不存在的 .scan-baseline.txt
  "scripts/analyze-vue.mjs", //   同上
  "scripts/audit-client-scan.mjs",
  "scripts/debug-strip.mjs",
  "scripts/find_corrupted_entities.py",
  "scripts/qa/mini-audit-smoke.sh",
  "scripts/scan-chinese.mjs",
  "tests/e2e/specs/real-stack-smoke.spec.ts",
]);
let orphanScanned = 0;
function walkOrphans(dirAbs, relDir, sink) {
  for (const ent of readdirSync(dirAbs, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      const nextRel = `${relDir}${ent.name}/`;
      if (isExempt(nextRel) || ORPHAN_SKIP.includes(nextRel) || ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      walkOrphans(join(dirAbs, ent.name), nextRel, sink);
      continue;
    }
    const rel = relDir + ent.name;
    if (isExempt(rel) || !ORPHAN_EXTS.test(rel)) continue;
    orphanScanned++;
    if (tracked.has(rel) || ORPHAN_BASELINE.has(rel)) continue;
    sink.push({ kind: "orphan", from: `目录扫描 ${relDir}`, path: rel, why: "盘上有但未入库（新克隆拿不到）" });
  }
}
{
  const sink = findings;
  for (const d of ORPHAN_DIRS) {
    const abs = join(REPO, d);
    if (existsSync(abs)) walkOrphans(abs, d + "/", sink);
  }
  // 例外清单防腐化：条目一旦入库或被删掉就必须在本轮变红，逼来的人划掉它
  //   （否则清单会变成"永久免检"，孤儿数只会涨不会降）
  for (const rel of ORPHAN_BASELINE) {
    if (!existsSync(join(REPO, rel))) {
      findings.push({ kind: "baseline", from: "ORPHAN_BASELINE", path: rel, why: `例外条目已不在盘上，应从清单划掉` });
    } else if (tracked.has(rel)) {
      findings.push({ kind: "baseline", from: "ORPHAN_BASELINE", path: rel, why: `例外条目已入库，应从清单划掉` });
    }
  }
}

/* ── 自证：判据必须能变红，且钉死本程踩到的两类假阳 ── */
if (process.argv.includes("--self-test")) {
  const cases = [];
  const probe = (rel, kind) => {
    const snap = findings.length;
    want(rel, "«fixture»", kind);
    const add = findings.slice(snap);
    findings.length = snap;
    return add[0] ? add[0].why : "clean";
  };
  const T = (label, got, wantVal) => cases.push({ label, ok: got === wantVal, got, wantVal });
  // ① 已跟踪 + 存在 ⇒ 放行
  T("已跟踪素材应放行", probe("apps/client/src/config/images.ts", "asset"), "clean");
  // ② 存在但未跟踪 ⇒ 「未入库」。自己造一个盘上有、库里没有的靶子，用完即删
  //    （不能拿固定路径当靶：它一旦被入库，这条就永远测不到该分支）
  const FIX = "scripts/qa/.selftest-untracked-fixture.mjs";
  writeFileSync(join(REPO, FIX), "// 自证靶件，跑完即删\n", "utf8");
  try {
    T("未入库要红", probe(FIX, "npm-script"), "盘上有但未入库（新克隆拿不到）");
  } finally {
    unlinkSync(join(REPO, FIX));
  }
  // ②b 靶件删掉后同一路径必须改判「盘上不存在」——证明两个分支都活着，不是恒真断言
  T("删靶后要改判缺件", probe(FIX, "npm-script"), "盘上不存在");
  // ③ 不存在 ⇒ 缺件
  T("缺件要红", probe("scripts/qa/no-such-file-anywhere.mjs", "npm-script"), "盘上不存在");
  // ④ ../ 未归一会把已跟踪文件误报「未入库」——本程实测假阳之一
  //    （靶子必须用**已入库**的文件：本门自身尚未提交时拿自己当靶会测出真红，那是夹具错不是判据错）
  T("相对路径折叠后要放行", probe("apps/client/../../scripts/verify-env-release.mjs", "npm-script"), "clean");
  // ⑤ 中文文件名：git 默认把 ls-files 输出转义成 "...\\345\\214\\271..."，
  //    不关 quotePath 就会让整批素材误报「未入库」（本程实测虚报 372 条）
  T("中文文件名要放行", probe("apps/client/src/static/assets/images/match-split/匹配_r01_c01.png", "asset"), "clean");
  // ⑥ 豁免面前缀不参与判定
  T("node_modules 要豁免", probe("node_modules/whatever/index.js", "npm-script"), "clean");
  // ⑦ 孤儿扫描（第 5 节）必须能抓到「盘上有、库里无」的脚本——该节立项依据是一个真实漏入库的迁移
  {
    const FIX2 = "scripts/qa/.selftest-orphan-probe.mjs";
    writeFileSync(join(REPO, FIX2), "// 孤儿扫描靶件，跑完即删\n", "utf8");
    const sink = [];
    try {
      walkOrphans(join(REPO, "scripts/qa"), "scripts/qa/", sink);
      const hit = sink.find((x) => x.path === FIX2);
      T("孤儿扫描要抓到未入库脚本", hit ? hit.why : "clean", "盘上有但未入库（新克隆拿不到）");
    } finally {
      unlinkSync(join(REPO, FIX2));
    }
    // 删掉靶件后重新扫描不得再报它：证明抓的是盘上实况，不是硬编码清单
    const sink2 = [];
    walkOrphans(join(REPO, "scripts/qa"), "scripts/qa/", sink2);
    T("删靶后孤儿扫描要改判干净", sink2.some((x) => x.path === FIX2) ? "仍报" : "clean", "clean");
  }
  const bad = cases.filter((c) => !c.ok);
  console.log(bad.map((c) => `  ✗ ${c.label}：期望 ${c.wantVal}，实得 ${c.got}`).join("\n"));
  console.log(`TRACKEDREFS_SELFTEST=${bad.length ? "FAIL" : "PASS"} cases=${cases.length} 负例可红=${cases.filter((c) => c.ok && c.got !== "clean").length}`);
  process.exit(bad.length ? 1 : 0);
}

const missing = findings.filter((x) => x.why === "盘上不存在").length;
const untracked = findings.filter((x) => x.why.startsWith("盘上有但未入库")).length;
const stale = findings.filter((x) => x.kind === "baseline").length;

if (asJson) console.log(JSON.stringify({ checked, orphanScanned, findings }, null, 2));
else {
  for (const x of findings) console.log(`  [${x.kind}] ${x.from} → ${x.path} :: ${x.why}`);
  console.log(`TRACKEDREFS 引用=${checked} 目录扫描=${orphanScanned} 缺件=${missing} 未入库=${untracked} 例外待收缩=${stale}`);
  if (findings.length) {
    console.log("  ⇒ 「未入库」两类都会「新克隆才炸」：编译与 git status 都看不出来。修法是要么补交该件，要么删掉引用。");
  }
}
if (strict && findings.length) process.exit(1);
process.exit(0);
