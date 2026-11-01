import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootPkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const ci = readFileSync(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

/**
 * 抽取 ci.yml 里【所有 run: 步骤体的命令】拼成一段纯文本（去掉 `#` 注释行）。
 *
 * 为什么要有（第五轮 C-F7 / 判定表 17）：过去「CI 已执行」的判据直接在 ci.yml【原始全文】上做
 * `\b<name>\b`，于是把一个门名写进注释、或写进 `- name:` 步骤标题，都算「CI 已接线」。
 * 实例：`test:structure` 在 ci.yml 里的唯一命中是注释行 `ci.yml:131`——它其实由
 * `npm run test:contracts` 链内部执行（走 inChain 通道），但这条"吃全文"的判据给任何写进
 * 注释的名字都放行，正是"写了没人跑"能蒙混的根源。本函数只认真正会被 CI 执行的命令体。
 *
 * 支持三种 run 形态：`run: cmd`（单行）、`run: |` / `run: >-` / `run: >`（块标量，取缩进更大的
 * 后续行）。块标量里的 `#` 行、以及步骤间的 `# ...` 注释都不计入匹配面。
 */
function extractCiRunBodies(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const bodies = [];
  for (let i = 0; i < lines.length; i++) {
    const r = lines[i].match(/^(\s*)run:\s*(.*)$/u);
    if (!r) continue;
    const ind = r[1].length;
    const inline = r[2].trim();
    if (inline !== "" && !/^[|>]/u.test(inline)) {
      bodies.push(inline);
      continue;
    }
    const body = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "") { body.push(""); continue; }
      const li = l.match(/^(\s*)/u)[1].length;
      if (li <= ind) break;
      body.push(l.trim());
    }
    bodies.push(body.join("\n"));
    i = j - 1;
  }
  return bodies
    .map((b) => b.split("\n").filter((ln) => !/^\s*#/u.test(ln)).join("\n"))
    .join("\n");
}
const ciRunBodies = extractCiRunBodies(ci);

/**
 * C-F7 自证（反向变异守卫）：run 体抽取必须真的把注释洗掉，否则判点退回"吃全文"的老 bug。
 * ci.yml 里有一句中文只出现在注释（第 131 行）、绝不出现在任何 run: 步骤体，用它当探针：
 *   - 若有人把 extractCiRunBodies 改回返回原文（不剔注释），第二条断言立刻红；
 *   - 若有人把 inCi 判据改回在 ci 全文上匹配，则"名字写进注释就算接线"复活，本探针是同一条纪律的锚。
 */
const CI_COMMENT_ONLY_MARKER = "建了没人跑";
assert.ok(
  ci.includes(CI_COMMENT_ONLY_MARKER),
  "gate-wiring 自证失效：ci.yml 里的注释探针串不见了（该行被删/改写，无法再证明注释剥离判据成立）",
);
assert.ok(
  !ciRunBodies.includes(CI_COMMENT_ONLY_MARKER),
  "gate-wiring 的 run 体抽取没有剔除注释（C-F7 退回吃全文，门名写进注释又会算已接线）",
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

// 根脚本里每一条 test:* 必须真的有人跑：要么在 test:contracts 链内，要么被 CI 按名整词点到。
// 上面那段磁盘对账只覆盖 tests/*.spec.mjs，看不见 scripts/qa/ 下的门——
// 第四轮审查正是从这里查出缺口：test:fidelity-manifest 定义了、却只被人工脚本
// scripts/qa/run-final-verify-v33.sh 调过，CI 全文没有它（同族的四条 :self-test 也一样）。
// 例外必须逐条写理由，且基线只减不增：接上线却不划掉例外，本条同样红。
const TEST_EXECUTION_BASELINE = {
  // 组合糖：generate:openapi + apps/client 的 test:unit，CI 的 client-test job 分别执行了等价命令
  "test:client": "组合糖，等价命令已在 CI 的 client-test job 里分别执行",
  // 盘上真读数在 CI 必假红：CI 检出树里两个盘上根都被 .gitignore 的 *.png/*.jpg/... 挡掉大半
  // （本机实测 495/1354、613/1496 进了 git），那是检出面缺口而不是产品缺陷。
  // CI 跑的是它的 :self-test（已在 contracts 链里，且由 ci-contract 钉住"恰有一发"）；
  // 真读数只在有完整盘上资产的本地跑。
  "test:asset-coverage:source": "CI 检出树缺 gitignore 的二进制资产 ⇒ 真读数在 CI 恒假红，只在本地跑；CI 跑它的 :self-test",
  // 真读数需要「有用户可见内容」的库：现网/本地实盘 3818 个单元格。CI 的 db-integration 是
  // demo_seed=false 从零建的空链库，扫出来 cells<500 ⇒ 门自己按 HYGIENE_MIN_CELLS 判 NOT-EVIDENCED。
  // 接进 CI 只会造出一条恒空的 PASS，比不接更坏；本地跑真读数，链里跑它的 :self-test（注入脏行必须变红）。
  "test:data-hygiene": "真读数只在有内容的实盘库跑（CI 的 fresh 库会被自己的 cells 下限判 NOT-EVIDENCED）；链里跑 :self-test",
  // 同一条理由的另一面：--urls 不给就自己查库；查不到库直接 exit 2，不给判。
  "test:asset-registry": "注册表行来自库里 370+ 条 media_asset，CI 空链库读不到 ⇒ 真读数只在实盘库跑；链里跑 :self-test",
};
const escGateName = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const chainText = contracts;
const normGate = (value) => String(value ?? "").replace(/\s+/gu, " ").trim();
// CI 侧只认【run: 步骤体】（已去注释）——第五轮 C-F7：过去吃全文，门名写进注释就算已接线。
const ciNormalized = normGate(ciRunBodies);
const unwired = [];
for (const [name, body] of Object.entries(rootPkg.scripts)) {
  if (!name.startsWith("test:") || name === "test:contracts" || name === "test") continue;
  // 同样要求整名：`npm run test:admin` 不能靠链里的 test:admin-scope-leak 蒙成已接线
  const inChain = new RegExp(`npm run ${escGateName(name)}(?![\\w:.-])`).test(chainText);
  // CI 侧要求"整名"【且只落在 run: 体里】：后面不能再跟 [\w:.-]，否则 test:admin 会被
  // test:admin-scope-leak 冒充成已接线；写进注释/步骤标题一律不算（第五轮 C-F7）。
  const inCi = new RegExp(`npm run ${escGateName(name)}(?![\\w:.-])`).test(ciNormalized)
    || new RegExp(`\\b${escGateName(name)}(?![\\w:.-])`).test(ciNormalized);
  // 第三条通道：CI 逐字执行了这条脚本的【命令本体】。很多根脚本只是 pnpm --filter 的别名，
  // CI 直接写全命令而不按脚本名调用——只按名字判定会把 test:admin 这类误报成"没人跑"
  // （本门首跑就是这样误报了一次，判据必须能区分"真没接线"与"换了个写法"）。
  // 带 && 的复合命令不作此等价判断：CI 分开跑两条不等于跑过这个组合。
  // 还要挡住"前缀冒充"：CI 里的 `… --source-only --selftest` 并不等于执行了
  // `… --source-only`（自证跑 ≠ 真读数），所以匹配位置后面不能再跟一个参数。
  let bodyInCi = false;
  if (!body.includes("&&")) {
    const at = ciNormalized.indexOf(normGate(body));
    if (at >= 0) {
      const after = ciNormalized.slice(at + normGate(body).length);
      // 只挡"再跟一个参数"的情形（如 --selftest / -q）：`^ --?[^ ]`。
      // YAML 折叠后下一步骤会以 " - name: …" 开头，那是步骤边界、不是参数，不能误判。
      bodyInCi = !/^ --?[^ ]/u.test(after);
    }
  }
  if (!inChain && !inCi && !bodyInCi) unwired.push(name);
}
for (const name of unwired) {
  assert.ok(
    TEST_EXECUTION_BASELINE[name],
    `根脚本 ${name}（${String(rootPkg.scripts[name]).slice(0, 60)}…）` +
      "既不在 test:contracts 链里、也不在 CI 的任一 run: 步骤里被执行（写进注释/步骤名不算接线）= 建了没人跑",
  );
}
for (const name of Object.keys(TEST_EXECUTION_BASELINE)) {
  assert.ok(
    unwired.includes(name),
    `例外 ${name} 现在已经接线了，必须从 TEST_EXECUTION_BASELINE 划掉（基线只减不增）`,
  );
}

/* ------------------------------------------------------------------ *
 * 第二条磁盘对账（第五轮 C-F2 / 判定表 3）：scripts/qa 的门形态件必须有人跑
 *
 * 过去 gate-wiring 只盘 tests/*.spec.mjs 和根 test:* 名，对 scripts/qa 下
 * 102 个门形态件（verify- / check- / audit- 前缀）+ 56 个 test-* 自检件全盲——
 * 它们的唯一载具 run-final-verify-v33.sh（bash）与 .zcode/workflows/*.dwf.ts（DSL）
 * 在 CI 里只出现在注释、也没有自动入口。本对账把这些「本地载具」登记为合法归处，
 * 剩下真正无人引用的孤儿按名逐条登记理由，件数钉成只减不增的基线。
 *
 * 「三集合之一」= 链（package.json 任一脚本按路径引用）/ CI（run: 体按路径引用）/
 * 显式登记（本地载具：bash 终验脚本 + DSL 工作流；或本文件 QA_GATE_ORPHANS 具名豁免）。
 * ------------------------------------------------------------------ */
const QA_DIR = fileURLToPath(new URL("../scripts/qa", import.meta.url));
const WF_DIR = fileURLToPath(new URL("../.zcode/workflows", import.meta.url));
const GATE_FORM = /^(verify|check|audit)-.+\.(mjs|cjs|js|sh)$/u;
const qaGateFilesOnDisk = readdirSync(QA_DIR).filter((f) => GATE_FORM.test(f));
if (qaGateFilesOnDisk.length < 40) {
  throw new Error(`scripts/qa 只枚举到 ${qaGateFilesOnDisk.length} 个门形态件，扫描面可疑（命名约定变了？）`);
}

// 本地载具：bash 终验 + 所有 DSL 工作流 + 根 package.json 全部脚本 + CI 的 run: 体。
// 用【文件名整串】在这些载体文本里出现与否判「有人引用」；载体的自动触发缺口另由
// 接线三件套（交主控落 package.json/CI）与 ci.yml 是否调用 bash 载具负责，本对账先保证
// 「一个门形态件不至于盘上完全无人点名」。
const qaCarriers = (() => {
  const parts = [];
  const tryRead = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
  parts.push(tryRead(join(QA_DIR, "run-final-verify-v33.sh")));
  for (const wf of readdirSync(WF_DIR)) parts.push(tryRead(join(WF_DIR, wf)));
  parts.push(JSON.stringify(rootPkg.scripts));
  parts.push(ciRunBodies);
  return parts.join("\n");
})();

/**
 * 具名孤儿登记（只减不增）：这些门形态件确实没有任何链/CI/本地载具点名，
 * 但「为什么还没接」必须逐条写清——与 TEST_EXECUTION_BASELINE 同一纪律：
 *   - 新孤儿不在此册 ⇒ 红（"写了没人跑"重新发生且没人认领）；
 *   - 册内某条已被载具接上 ⇒ 红（必须从册里划掉，基线只准降）。
 * 本轮实测残留 5 个（与基线逐字对齐）。
 */
const QA_GATE_ORPHANS = new Map([
  ["audit-frame-verdicts.mjs", "取景裁决审计器：只被人工车道按轮临时调用，输入是某轮 --lane/--manifest，裸跑退 2；纳入终验会造恒红假信号，待取景链收口再决定归处。"],
  ["check-frame-orphanage.mjs", "孤儿帧清点：同上，需当轮帧目录输入，缺输入即退 2，非离线门。"],
  ["check-queue-plan.mjs", "队列计划校验：仅 emit/gen 链按具体计划文件调用，没有稳定的盘上默认输入，留在具名孤儿册。"],
  ["verify-exec-delta.mjs", "执行增量子门：需 --prev/--cur 两份执行件，缺任一退 2；载具侧改由 verify-fix-visibility 覆盖同形状，本件待并入。"],
  ["verify-logged-in-landing.mjs", "登录落点门：需本轮腿目录的 --exec 输入（见 run-final-verify-v33.sh:127 同口径说明），已在终验注释里点名保留为孤儿基线，不硬塞造假红。"],
]);

const qaOrphans = qaGateFilesOnDisk.filter((f) => !qaCarriers.includes(f));
for (const f of qaOrphans) {
  assert.ok(
    QA_GATE_ORPHANS.has(f),
    `scripts/qa/${f} 是门形态件，却不在链 / CI / bash 终验 / DSL 任一载具里被点名，也没登记在 QA_GATE_ORPHANS = 建了没人跑`,
  );
}
for (const f of Object.keys(QA_GATE_ORPHANS)) {
  assert.ok(
    qaOrphans.includes(f),
    `QA_GATE_ORPHANS 里的 ${f} 现在已被某个载具接上了，必须从孤儿册划掉（基线只减不增）`,
  );
}
// 件数基线：残留孤儿数钉死，双向收缩（多了要接或登记、少了要下调基线）。
const QA_GATE_ORPHAN_BASELINE = 5;
assert.equal(
  qaOrphans.length,
  QA_GATE_ORPHAN_BASELINE,
  `scripts/qa 无人跑的门形态件残留 ${qaOrphans.length} 个，基线 ${QA_GATE_ORPHAN_BASELINE}（只减不增；降了就同步下调本行与 QA_GATE_ORPHANS）`,
);

// 自检件（test-*.mjs/cjs）的唯一聚合载具是 run-qa-selftests.mjs；它必须在本地载具里被点名，
// 否则整批 test-* 自检件重新变成"建了没人跑"（C-F2 的同族形状）。
const qaSelftestFiles = readdirSync(QA_DIR).filter((f) => /^test-.+\.(mjs|cjs)$/u.test(f));
if (qaSelftestFiles.length >= 10) {
  assert.ok(
    qaCarriers.includes("run-qa-selftests.mjs"),
    `scripts/qa 有 ${qaSelftestFiles.length} 个 test-* 自检件，但其聚合载具 run-qa-selftests.mjs 不在任何链/CI/本地载具里 = 自检件整体无人跑`,
  );
}

console.log("test gate wiring contract ok");
