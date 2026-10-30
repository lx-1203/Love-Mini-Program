import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 内部哨兵不得写进业务数据（S2-2，2026-10-30）。
 *
 * 背景：`AdminDataScope.getCurrentAdminCampusName()` 对「空校区的 ADMIN / AUDITOR」返回
 * 内部哨兵 `NO_CAMPUS_SCOPE = "__AUDITOR_NO_CAMPUS__"`，它的设计意图是**读收敛**——把查询
 * 过滤到空集、把越权校验一律拒绝。但两个后台写接口把它的返回值当成"管辖校区"直接落库：
 *
 *   - AdminActivityController: activity.setCampusName(scopedCampus != null ? scopedCampus : normalize(...))
 *   - AdminShopController:     if (myCampus != null) item.setCampusName(myCampus)
 *
 * 哨兵是非 null 字符串，所以三元/if 都走进了"有校区"分支 ⇒ `activities.campus_name` /
 * `shop_items.campus_name` 被写成 `__AUDITOR_NO_CAMPUS__`。后果不是报错而是**静默丢失**：
 * 该活动/商品对所有真实校区管理员不可见，管理员也无法在界面上改回来（再改一次仍走同一个
 * 错误分支），只能进数据库手改。
 *
 * 本门把这条判点固化成三条可证伪的规则，而不是依赖人记住"哨兵只用于读"。
 */

const root = fileURLToPath(new URL("../", import.meta.url));
const MAIN_JAVA = join(root, "apps", "api", "src", "main", "java");
const SENTINEL = "NO_CAMPUS_SCOPE";

/** 递归收集 main 下的所有 .java（跳过 archive 目录）。 */
function javaFiles(dir, sink) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "archive") continue;
      javaFiles(join(dir, entry.name), sink);
    } else if (entry.name.endsWith(".java")) {
      sink.push(join(dir, entry.name));
    }
  }
  return sink;
}

/**
 * 找出一段源码里「哨兵/作用域查询被当成写入值」的位置。
 *
 * @param {string} source java 文件内容
 * @returns {string[]} 违规描述（空数组表示干净）
 */
function findSentinelWrites(source) {
  const violations = [];
  // R1：任何 setXxx(...) 的实参里出现哨兵常量（含跨行、200 字符窗口内的就近匹配）。
  const setWithSentinel = /set[A-Z]\w*\(([^)]{0,200})/gu;
  for (const m of source.matchAll(setWithSentinel)) {
    if (m[1].includes(SENTINEL)) {
      violations.push(`setter 实参引用哨兵：set${m[1].slice(0, 60)}…`);
    }
  }
  // R2：setCampusName(...) 的实参直接来自 getCurrentAdminCampusName()——
  // 该方法在异常账号下返回哨兵，写路径必须改走 AdminDataScope#resolveCampusForWrite。
  const setCampusFromScope = /setCampusName\(([^)]{0,200}getCurrentAdminCampusName\(\)[^)]{0,200})\)/gu;
  for (const m of source.matchAll(setCampusFromScope)) {
    violations.push(`setCampusName 实参直接来自 getCurrentAdminCampusName()：${m[1].slice(0, 60)}…`);
  }
  return violations;
}

// —— 自测：判点必须能红，且不能把合法写法误判 ——
const selfTestBad = [
  "class X {",
  "  void a() { activity.setCampusName(AdminDataScope.NO_CAMPUS_SCOPE); }",
  "  void b() { String s = adminDataScope.getCurrentAdminCampusName(); item.setCampusName(s != null ? s : req); }",
  "  void c() { item.setCampusName(adminDataScope.getCurrentAdminCampusName()); }",
  "}",
].join("\n");
const selfTestGood = [
  "class X {",
  "  void a() { activity.setCampusName(adminDataScope.resolveCampusForWrite(req.campusName())); }",
  "  void b() { List<String> s = adminDataScope.resolveUserCampusNames(ids); repository.findAll().stream().filter(x -> AdminDataScope.NO_CAMPUS_SCOPE.equals(x)); }",
  "  boolean c() { return AdminDataScope.isNoCampusScope(scope); }",
  "}",
].join("\n");
// 两条真实缺陷写法都要被抓到（哨兵常量入 setter + 作用域查询直接落库）
assert.ok(
  findSentinelWrites(selfTestBad).length >= 2,
  `自测负例只抓到 ${findSentinelWrites(selfTestBad).length} 条，本门判点已失效`,
);
assert.deepEqual(
  findSentinelWrites(selfTestGood),
  [],
  `自测正例被误判（读用途/正确写法不得报红）：${JSON.stringify(findSentinelWrites(selfTestGood))}`,
);

// —— 全量扫描 ——
const files = javaFiles(MAIN_JAVA, []);
assert.ok(
  files.length > 100,
  `只扫描到 ${files.length} 个 main java 文件（<100），扫描根路径可能已失效`,
);

const findings = [];
for (const file of files) {
  for (const violation of findSentinelWrites(readFileSync(file, "utf8"))) {
    findings.push(`${file.replace(root, "")} -> ${violation}`);
  }
}
assert.deepEqual(findings, [], `内部哨兵/作用域查询被写进业务字段：\n  ${findings.join("\n  ")}`);

// —— 正向接线：两处已知写路径必须走 resolveCampusForWrite（防止退回内联三元） ——
const writePaths = ["com/campuslove/api/admin/AdminActivityController.java", "com/campuslove/api/admin/AdminShopController.java"];
for (const rel of writePaths) {
  const source = readFileSync(join(MAIN_JAVA, rel), "utf8");
  assert.match(
    source,
    /setCampusName\(\s*adminDataScope\.resolveCampusForWrite\(/u,
    `${rel} 的归属校区写入必须经 AdminDataScope#resolveCampusForWrite（哨兵 403，绝不落库）`,
  );
}

// 哨兵常量的定义点仍在（本门靠它匹配；改名会让门静默空转）
const scopeSource = readFileSync(join(MAIN_JAVA, "com/campuslove/api/admin/AdminDataScope.java"), "utf8");
assert.match(scopeSource, /String NO_CAMPUS_SCOPE\s*=/u, "AdminDataScope.NO_CAMPUS_SCOPE 定义消失，本门失去匹配目标");
assert.match(scopeSource, /public String resolveCampusForWrite\(/u, "AdminDataScope#resolveCampusForWrite 缺失，写路径没有安全出口");

console.log(
  `admin scope leak ok（扫描 ${files.length} 个 main java，setter 实参无哨兵；`
  + `${writePaths.length} 处归属写入已接 resolveCampusForWrite）`,
);
