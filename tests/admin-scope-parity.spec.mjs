import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 后台数据作用域一致性门禁（S3-7，2026-10-30）。
 *
 * 背景：本仓库有两条正交授权轴——
 *   - 校区轴 `AdminDataScope`（getCurrentAdminCampusName / assertCampusAccess / resolveCampusForWrite）
 *   - 圈层轴 `AdminScopeService`（currentPrefixes / inScope / assertInScope）
 * 后台端点原先各写各的：有的走共享轴，有的自己 `if (campusName != null) filter(...)`，
 * 有的**完全没有**任何作用域判定。已实测的缺陷是 `AdminWhisperController`：列表裸 `findAll`
 * 返回全平台悄悄话正文、删除裸 `deleteById`，而同域同语义的 `AdminConversationController`
 * 却按「双方均属本校区」过滤并 403 拦截——后台端点之间的作用域口径不一致不是风格问题，
 * 而是授权缺陷（越权读/越权删）。
 *
 * 本门固化三条可证伪规则（不依赖人记住"该走共享轴"）：
 *   R1 扫描 apps 下 main/java 里所有 Admin 开头的 Controller（命中数必须 >10，防空扫变绿）；
 *   R2 控制器源码引用了 `adminDataScope.` / `adminScopeService.` / `campusScopeService.` /
 *      `AdminScopeService` 即视为"在轴上"；不在轴上的必须出现在 BASELINE 里并写明理由，
 *      新增未登记的控制器的控制器一律判红；
 *   R3 BASELINE 只能缩小：已登记却已经接上共享轴的必须从名单里删掉（否则名单会烂掉），
 *      登记数不得超过 BASELINE_MAX；
 *   R4 不在轴上 + 自己在代码里拼 campusName 过滤 = 手写作用域，即使已登记也判红
 *      （这正是本次要根除的形态；注释里提 campusName 不算，分析前先剥注释）。
 *
 * 只匹配 `adminDataScope.`（实例）而不是裸 `AdminDataScope`（类名）：
 * `AdminMenuController` / `AdminRoleController` 里出现的是 `AdminDataScope.ROLE_SUPER_ADMIN`
 * 这种**角色常量**，与作用域判定无关，按类名匹配会把它们误判成"已在轴上"而给门放绿。
 */

const root = fileURLToPath(new URL("../", import.meta.url));
const MAIN_JAVA = join(root, "apps", "api", "src", "main", "java");
const ADMIN_PKG = join(MAIN_JAVA, "com", "campuslove", "api", "admin");

/** 在共享作用域轴上的证据：持有并调用作用域服务实例（或引用圈层轴服务类型）。 */
const AXIS_USAGE = /\badminDataScope\s*[.(]|\badminScopeService\s*[.(]|\bcampusScopeService\s*[.(]|\bAdminScopeService\b/u;

/** 手写校区过滤的证据：代码（非注释）里自己拿 campusName 做条件。 */
const HAND_ROLLED_CAMPUS = /campusName|campus_name|getCampusName\(/u;

/** 递归收集 Admin*Controller.java（跳过 archive 目录）。 */
function controllerFiles(dir, sink = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "archive") continue;
      controllerFiles(join(dir, entry.name), sink);
    } else if (/^Admin.*Controller\.java$/.test(entry.name)) {
      sink.push(join(dir, entry.name));
    }
  }
  return sink;
}

/** 剥掉 Javadoc 与行注释：作用域判定只看代码，不看自述。 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gmu, " ")
    .replace(/\/\/[^\n]*/gm, " ");
}

/**
 * 单个控制器的作用域形态。
 * @param {string} rawSource java 源码
 * @returns {{onAxis: boolean, handRolledCampus: boolean}}
 */
function scopeShape(rawSource) {
  const code = stripComments(rawSource);
  const onAxis = AXIS_USAGE.test(code);
  return { onAxis, handRolledCampus: !onAxis && HAND_ROLLED_CAMPUS.test(code) };
}

/**
 * 尚未接上共享轴的后台控制器清单——<b>只允许缩小</b>。
 * 每条必须写理由；`scopedVia` 表示作用域在同一条轴上下沉了一层，被点名的文件必须自己也在轴上。
 */
const BASELINE = {
  "AdminAccountController.java": { reason: "改密只操作 SecurityUtils 当前登录者本人账号，不涉及他人数据，作用域轴不适用" },
  "AdminAuditLogController.java": { reason: "审计日志是平台级安全台账（操作者/操作/目标），表无 campus/circle 归属列" },
  "AdminConfigController.java": { reason: "系统配置（configs/rules/switches）为全局配置，写操作已限 SUPER_ADMIN" },
  "AdminConsultingController.java": { reason: "咨询课程目录无 campus 归属列（平台级课程表），写操作限 SUPER_ADMIN" },
  "AdminDictController.java": { reason: "仓库既有裁定：字典表（dicts/dict_items）是全局配置表，读它不需要校区过滤" },
  "AdminHotSearchController.java": { reason: "热搜是 search_queries 的平台级聚合词表，无 campus/circle 列；下架影响全平台属超管职责" },
  "AdminInterestTagController.java": { reason: "兴趣标签为全局字典；按 userId 读写单个用户的标签属用户轴定位，非校区轴" },
  "AdminLegalController.java": { reason: "法务文书（隐私政策/用户协议）平台级唯一，写操作限 SUPER_ADMIN" },
  "AdminMaintenanceController.java": { reason: "类级 @PreAuthorize hasRole('SUPER_ADMIN')，超管专属运维面，无数据行可读" },
  "AdminMatchConfigController.java": { reason: "匹配权重/推荐策略为全局算法配置，写操作限 SUPER_ADMIN" },
  "AdminMenuController.java": { reason: "菜单/RBAC 配置表；源码出现的 AdminDataScope 只是 ROLE_* 常量引用，非作用域判定" },
  "AdminNotifyConfigController.java": { reason: "通知模板为全局配置表，写操作限 SUPER_ADMIN" },
  "AdminOfficialAccountController.java": { reason: "official_accounts 无校区列（平台级全局资源，见 AdminStatsController R4-00393 注释），全站广播写限 SUPER_ADMIN" },
  "AdminProfileConfigController.java": { reason: "资料页配置是单 configKey 的全局 App 配置" },
  "AdminPromoCodeController.java": { reason: "promo_codes 无 campus/circle 归属列（平台级商业资源），作用域在该表上无法表达" },
  "AdminRealNameController.java": { reason: "类注释已记录：实名认证面向全局运营，身份证核验无校区维度" },
  "AdminRoleController.java": { reason: "仓库既有裁定：角色/权限配置表读取无需过滤；AdminDataScope 仅 ROLE_* 常量引用" },
  "AdminSchoolController.java": { reason: "schools 是高校注册表（建校区管理员时的下拉字典），增删改全部限 SUPER_ADMIN" },
  "AdminSensitiveWordController.java": { reason: "敏感词库全局生效（C 端内容过滤），写操作限 SUPER_ADMIN" },
  "AdminStatsController.java": {
    reason: "统计的校区隔离在同一条 AdminDataScope 轴上、实现于服务层（R4-00393），控制器本身只做转发",
    scopedVia: join("com", "campuslove", "api", "admin", "RealAdminStatsService.java"),
  },
  "AdminLayerController.java": { reason: "admin_layer 就是圈层轴的数据源本身（给账号绑节点），类级限 SUPER_ADMIN，属写轴入口而非被轴过滤的数据" },
};

// BASELINE 上限 = 当前登记数；每迁移掉一个控制器，请把这里一起调小（棘轮只能向下）。
const BASELINE_MAX = 21;

// —— 自测：判点必须能红，且不能把正确写法误判 ——
const fixtureHandRolled = [
  "class PlantedLeakController {",
  "  List<Post> list(String campusName) {",
  "    return repository.findAll().stream().filter(p -> campusName.equals(p.getCampusName())).toList();",
  "  }",
  "}",
].join("\n");
const fixtureOnAxis = [
  "class GoodController {",
  "  private final AdminDataScope adminDataScope;",
  "  void audit(Long id) { adminDataScope.assertCampusAccess(name); }",
  "  List<String> p() { return adminScopeService.currentPrefixes(); }",
  "}",
].join("\n");
// 只有角色常量引用 = 不算在轴上（否则 AdminMenuController 一类会被误判成已迁移）
const fixtureConstantsOnly = [
  "class ConstantsOnlyController {",
  "  void a() { if (AdminDataScope.ROLE_SUPER_ADMIN.equalsIgnoreCase(r)) { doIt(); } }",
  "}",
].join("\n");
// 注释里提 campusName 不算手写过滤（避免把自述当实现）
const fixtureCommentOnly = [
  "class CommentOnlyController {",
  "  /** 数据隔离：按 campusName 过滤——本行是注释，不参与判定 */",
  "  void a() { repository.findAll(); }",
  "}",
].join("\n");

assert.deepEqual(
  scopeShape(fixtureOnAxis),
  { onAxis: true, handRolledCampus: false },
  "自测正例失效：引用共享作用域服务的控制器被误判（本门已失去识别能力）",
);
assert.equal(
  scopeShape(fixtureHandRolled).handRolledCampus,
  true,
  "自测负例失效：手写 campusName 过滤的控制器没被识别出来，R4 已成空文",
);
assert.equal(
  scopeShape(fixtureHandRolled).onAxis,
  false,
  "自测负例失效：手写过滤的植入样本被当成在轴上（说明匹配规则过宽）",
);
assert.equal(
  scopeShape(fixtureConstantsOnly).onAxis,
  false,
  "仅引用 AdminDataScope.ROLE_* 角色常量不该算「已在轴上」",
);
assert.equal(
  scopeShape(fixtureCommentOnly).handRolledCampus,
  false,
  "注释里提到 campusName 不该被判成手写过滤",
);

// —— 全量扫描 ——
assert.ok(existsSync(ADMIN_PKG), `后台包不存在：${ADMIN_PKG}（扫描根路径已失效）`);
const files = controllerFiles(ADMIN_PKG);
assert.ok(
  files.length > 10,
  `只扫描到 ${files.length} 个 Admin*Controller（<=10），扫描根路径可能已失效，空扫不得算通过`,
);

const onAxis = [];
const offAxis = [];
for (const file of files) {
  const name = basename(file);
  const shape = scopeShape(readFileSync(file, "utf8"));
  (shape.onAxis ? onAxis : offAxis).push({ name, file, shape });
}

// R2 + R4：不在轴上的，必须已登记且不手写过滤
const unlisted = offAxis.filter(({ name }) => !BASELINE[name]);
const handRolled = offAxis.filter(({ name, shape }) => BASELINE[name] && shape.handRolledCampus);
assert.deepEqual(
  unlisted,
  [],
  `新增未登记的后台控制器不在共享作用域轴上（请接 AdminDataScope/AdminScopeService，或加入 BASELINE 并写明为什么不需要作用域）：\n  `
    + unlisted.map((c) => `${c.name} -> ${c.file.replace(root, "")}`).join("\n  "),
);
assert.deepEqual(
  handRolled,
  [],
  `这些控制器绕开共享作用域轴、自己拼 campusName 过滤（口径必然漂移，正是 whisper 越权缺陷的成因）：\n  `
    + handRolled.map((c) => c.name).join("\n  "),
);

// R3：基线不得烂掉——已登记的若已接上轴，必须从名单里删掉；总数只许降
const stale = Object.keys(BASELINE).filter((name) => onAxis.some((c) => c.name === name));
assert.deepEqual(
  stale,
  [],
  `BASELINE 里这些控制器已经接上共享作用域轴，请把条目删掉（基线只能缩小）：\n  ${stale.join("\n  ")}`,
);
assert.ok(
  Object.keys(BASELINE).length <= BASELINE_MAX,
  `BASELINE 现有 ${Object.keys(BASELINE).length} 条，超过棘轮上限 ${BASELINE_MAX}`,
);
const missingReason = Object.entries(BASELINE).filter(([, entry]) => !entry.reason || entry.reason.length < 10);
assert.deepEqual(missingReason.map(([name]) => name), [], "BASELINE 每条都必须写明「为什么不需要作用域过滤」");

// scopedVia 不许空头支票：被点名的委托对象必须自己也在轴上
for (const [name, entry] of Object.entries(BASELINE)) {
  if (!entry.scopedVia) continue;
  const via = join(MAIN_JAVA, entry.scopedVia);
  assert.ok(existsSync(via), `${name} 的 scopedVia 指向不存在的文件：${entry.scopedVia}`);
  assert.ok(
    AXIS_USAGE.test(stripComments(readFileSync(via, "utf8"))),
    `${name} 声称作用域在 ${entry.scopedVia} 里实现，但该文件并未引用共享作用域服务（空头委托）`,
  );
}

// 迁移成果的正向接线：whisper 两端点必须真的调作用域服务（防止日后被改回裸 findAll）
const whisper = readFileSync(join(ADMIN_PKG, "AdminWhisperController.java"), "utf8");
assert.match(
  whisper,
  /adminDataScope\.getCurrentAdminCampusName\(\)/u,
  "AdminWhisperController 的校区作用域解析被移除：列表将退回全平台可见",
);
assert.match(
  whisper,
  /findById\(id\)\.ifPresent\(this::assertWhisperAccess\)[\s\S]{0,120}deleteById\(id\)/u,
  "AdminWhisperController 的删除越权拦截被移除或顺序被改成先删后判",
);

const baselineSize = Object.keys(BASELINE).length;
console.log(
  `admin scope parity ok（扫描 ${files.length} 个 Admin*Controller，`
  + `在轴上 ${onAxis.length} 个，基线待迁移 ${baselineSize} 个，上限 ${BASELINE_MAX}）`,
);
