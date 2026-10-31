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
const ciNormalized = normGate(ci);
const unwired = [];
for (const [name, body] of Object.entries(rootPkg.scripts)) {
  if (!name.startsWith("test:") || name === "test:contracts" || name === "test") continue;
  // 同样要求整名：`npm run test:admin` 不能靠链里的 test:admin-scope-leak 蒙成已接线
  const inChain = new RegExp(`npm run ${escGateName(name)}(?![\\w:.-])`).test(chainText);
  // CI 侧要求"整名"：后面不能再跟 [\w:.-]，否则 test:admin 会被 test:admin-scope-leak 冒充成已接线
  const inCi = new RegExp(`\\b${escGateName(name)}(?![\\w:.-])`).test(ci);
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
      "既不在 test:contracts 链里、也不被 CI 按名整词执行 = 建了没人跑",
  );
}
for (const name of Object.keys(TEST_EXECUTION_BASELINE)) {
  assert.ok(
    unwired.includes(name),
    `例外 ${name} 现在已经接线了，必须从 TEST_EXECUTION_BASELINE 划掉（基线只减不增）`,
  );
}

console.log("test gate wiring contract ok");
