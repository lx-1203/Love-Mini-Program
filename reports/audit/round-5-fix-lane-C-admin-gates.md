# Round 5 · 修复车道 C — 管理端档位 + 门禁基础设施（apps/admin · tests · scripts/qa）

任务书：`reports/audit/round-5-lane-B-frontend.md`（FINDING 4/5/12/13/15 + 门可信度节 + FINDING 14）与
`reports/audit/round-5-lane-C-gates-ci.md`（判定表 14/17/18/21/22/25，发现 F2/F4/F6/F7/F8）。
基线：工作树已有在途批次改动（`tests/prototype-contract.spec.mjs`、`tests/entity-ddl-drift.spec.mjs`、
`docker*`、`README.md`、`apps/api/**` 等），本车道**未还原**它们，在其之上继续。

运行环境：本机裸 `node` = v16.13.1（微信工具自带，不参与判定）；所有 `.mjs` 门用 v20.19.5
（`/d/codex-tools/node-v20.19.5-win-x64/node.exe`，与 CI 的 `node-version: '20'` 同代）。
收口复量：`npm run test:contracts` 全链 **EXIT=0**（34 条 npm 调用，含本车道改动）。

行号一律按"动手前 grep 到符号/原句"复核过；file:line 为落点提示。

---

## 1. B-FINDING 4｜改密入口豁免前提与 SecurityConfig 矛盾（门报"无守卫 0"是假数）

**现象**：`tests/admin-write-gate.spec.mjs` 的 `SELF_SERVICE_WRITE_HANDLERS` 唯一一条豁免声称
「POST /v1/admin/account/change-password 接受 AUDITOR（类级 hasAnyRole）」，据此把
`content/Users.vue#handleChangePwd` 从 `ungardedHandlers`（上界 0）抹掉。但 URL 级写规则
`POST /api/v1/api/... admin/** → hasAnyRole("ADMIN","SUPER_ADMIN")`（`SecurityConfig.java:208-215`）
在过滤器层先拦 AUDITOR，方法级类注解（`AdminAccountController.java:60`）根本没机会生效——豁免前提不成立。

**改动**：
- `tests/admin-write-gate.spec.mjs:90` `SELF_SERVICE_WRITE_HANDLERS = new Map()`（划掉豁免；原条目理由错误）。
- `apps/admin/src/views/content/Users.vue:676`（`openChangePwd`）与 `:698`（`handleChangePwd`）
  各加真实档位守卫 `if (!sessionStore.canWrite) return;`——后端把 change-password 收敛到 ADMIN/SUPER_ADMIN
  （R4-00389 放开校区 ADMIN），故挂 canWrite；handler 有守卫后，旧的「豁免必须划掉」判点会逼着删掉该条，闭环。
- 门新增元判点（`tests/admin-write-gate.spec.mjs:775` 附近，函数体内 `for (const [handlerKey, reason] of selfService)`）
  + 解析辅助 `parseExemptionReason`（`:96`）：白名单里若还有条目，其 reason 引用的端点必须能在门自己的
  `expandAuthorities` 结果里放行 reason 声称的角色，否则门自身判红。

**判点与红证据**（--self-test 方向 d，`tests/admin-write-gate.spec.mjs`）：注入一条「change-password 接受 AUDITOR」
的坏豁免 → 门报红：
`豁免 content/Users.vue#handleChangePwd 声称「... 接受 AUDITOR」，但 expandAuthorities 得出该端点实际只放行 ADMIN/SUPER_ADMIN，AUDITOR 根本过不去 ⇒ 豁免方向写反，本门拒绝据此把无守卫处理函数抹掉`。

**实测读数**（`node tests/admin-write-gate.spec.mjs`）：`不中 0 条 / 豁免 0 条`、`无守卫处理函数 0 处（上界 0）`
——handleChangePwd 现在是被 canWrite 守卫挡住的正常处理函数，不再靠白名单蒙数。

**纠正交办口径**：报告说门"报无守卫 0 是假数"是因为豁免；划掉豁免 + 加守卫后 0 是**真数**。

---

## 2. B-FINDING 5｜档位轴看不见裸角色比较，"前端比后端严"无判点（校区 ADMIN 看不见改密）

**现象**：门的控件轴只认 `sessionStore.canWrite/canSuperAdminWrite` 三个位，模板里的裸角色比较
`currentAdminRole === 'SUPER_ADMIN'` 完全在射程外。`Users.vue` 用这层 `<template>` 外壳把"新增用户 + 修改密码"
一起只放给超管 ⇒ 校区 ADMIN 看不见"修改密码"，而后端 `AdminAccountController` R4-00389 明确放开给 ADMIN
（前端比后端严的功能倒退）。

**改动**：
- 档位真源 `apps/admin/src/utils/write-policy.ts`：删档位 3（见第 5 节），只剩 canWrite / canSuperAdminWrite。
  门里那份从源码正则取档位的解析（`analyze` 顶部 `for (const bit of ADMIN_WRITE_BITS)`）随 `ADMIN_WRITE_BITS`
  收窄自动同步；guardsIn/controlBindings/存在性判据的位名交替串统一改由 `WRITE_BITS_ALT` 生成（不再各写一份）。
- `tests/admin-write-gate.spec.mjs` 新增裸角色比较识别：`BARE_ROLE_CMP`（`:118`）把
  `X === 'ADMIN'|'SUPER_ADMIN'|'AUDITOR'`（含反写）折成该角色单元素集合；`controlBindings` 把位档与裸比较
  分别算 roles（`roles` / `bare` 两份），控件轴新增"前端比后端严"判红（`:740` 附近 `if (entry.bare)`）——
  仅当**裸比较**把后端写档放行的角色藏起来时红（按位造成的合法收窄不触发，避免误伤 `isSuperAdmin && canSuperAdminWrite`）。
  刻意**不**识别 `isSuperAdmin` 这类把角色藏进 `.value` 的 computed。
- `apps/admin/src/views/content/Users.vue:769-780`：删掉 `currentAdminRole === 'SUPER_ADMIN'` 外壳；
  新增用户按钮改挂 `v-if="sessionStore.canSuperAdminWrite"`（后端 POST /users = hasRole('SUPER_ADMIN')），
  修改密码按钮改挂 `v-if="sessionStore.canWrite"`（后端 = ADMIN/SUPER_ADMIN）。文档注释 `:200-206` 同步纠正。
- 同步更新红门 `apps/admin/src/views/content/users-write-gate.test.ts`（openCreateUser→canSuperAdminWrite、
  openChangePwd/handleChangePwd→canWrite）。

**判点与红证据**：
- --self-test 方向 (c)：any-write 端点 + `v-if="currentAdminRole === 'SUPER_ADMIN'"` 控件 ⇒ 红
  `（前端比后端严，功能倒退）`。
- 盘上反向变异（Users.vue 改密提交按钮临时加回 `v-if="currentAdminRole === 'SUPER_ADMIN'"`）实测红原文：
  `content/Users.vue：<绑定 handleChangePwd() 的控件> 用裸角色比较 SUPER_ADMIN 只放开这些角色，但 changePassword → POST /api/v1/admin/account/change-password 后端还接受 ADMIN（前端比后端严，功能倒退）`，`不中 1 条`，EXIT=1；还原后 sha `85b755cf...`，门恢复绿。

**诚实标注盲区**：门"改密弹窗打开按钮 openChangePwd → change-password 端点"的链路仍属文件头盲区 1
（openChangePwd 自身不含写调用，写调用在 handleChangePwd）。盘上判红是靠**提交按钮**那条闭合链（有写调用可达）；
打开按钮外壳那半由 Users.vue 直接改档位解决，不靠门。

---

## 3. 门自身两个结构缺口（报告"权限门可信度"节末 a/b）

**(a) `(顶层)` 桶不再吃全文件守卫并集**：
- `tests/admin-write-gate.spec.mjs` 脚本视图分析先对 `<script setup>` 体做
  `stripJavaComments(script.body)`（`:638`，长度不变、偏移对齐），JSDoc 里提到的函数名（`Roles.vue:10` 的
  `assignRoleMenus(id, checkedIds)`）不再被 `callRe` 误当写调用；
- 守卫轴（`:687`）：`hostName === "(顶层)"` 的写调用**直接判红**（`problems.push(... 脚本块顶层 ...)`），
  不再 `hostText = 整个脚本` 取全文件档位并集。
- 上界读数变化：原实测 unattachedControls = 23（含无害的 `system/Roles.vue#(顶层)` JSDoc 命中）；
  注释剥离后该假命中消失 ⇒ **实测降为 22**。这就是"按新的上界读数入账"：22 = 真·控件归属盲区数，
  Roles.vue JSDoc 假阳性已按缺口 (a) 消解，不再计入。

**反向变异**：--self-test 方向 (e)：视图脚本块顶层直接 `createFix();` ⇒ 红
`Top.vue#(顶层)：写调用 createFix → ... 直接落在脚本块顶层，无法确定它受哪个档位守卫保护（第五轮起此形态即红）`。

**(b) guardsIn 中间变量误报方向写清**：`guardsIn`（`:318`）函数头注释现明确两种失败方向——
(1) 保守【误报】：`const can = sessionStore.canWrite; if(!can) return` 看不见 `!sessionStore.<位>`，
算成无守卫、上 ungardedHandlers 棘轮判红（可接受）；(2) 放宽【漏报】：由档位交集逻辑负责，不因本函数漏判而假绿。
文件头盲区 2 也补了同一条口径。

---

## 4. C-F6｜BLIND_SPOT_CEILING.unattachedControls 30→实测 22 + 双向收缩红

**现象**：基线写死 30、实测 23，注释称"只降不升"却无收缩判点（同族 tz/collation/openapi/parity/i18n 都有双向）。

**改动**：`tests/admin-write-gate.spec.mjs:1116` `unattachedControls: 22`（= 第 3 节 a 处理后的实测值）；
`blindOverruns` 判定加收缩红（`:1135` 附近）：`实测 < 基线` 亦红（"基线可以且必须降到实测"）。

**反向变异**（把基线临时抬到 25）实测红原文：
`× 盲区扩张: unattachedControls: 实测 22 < 基线 25 ⇒ 基线可以且必须降到 22（只降不升，双向收缩）`，EXIT=1；
还原 gate sha `0b2dd99b...` 后恢复绿。

**实测读数**（`node tests/admin-write-gate.spec.mjs`）：
`盲区…控件未能按处理函数归属 22 处（上界 22）/ TS 路径未匹配 0 处（上界 0）/ 无守卫处理函数 0 处（上界 0）`。

---

## 5. B-FINDING 12｜档位 3（canAdminOnlyWrite）死位删除 + 位↔消费方判点

**现象**：`canAdminOnlyWrite` 角色集与 canWrite 逐字相同（`{ADMIN,SUPER_ADMIN}`），SUPER_ADMIN 恒持 ROLE_ADMIN ⇒
这一档永远不比 canWrite 更窄；且 `grep canAdminOnlyWrite apps/admin/src/views` = 0，是空契约死位。
`--self-test` 的 `POLICY_SNIPPET` 又把它写成 `["ADMIN"]`（与真实文件不同），真实档位 3 从未被用例走过。

**改动（选择：删位）**：
- `apps/admin/src/utils/write-policy.ts`：从 `ROLE_TIER_SNAPSHOT`（`:42`）删 `canAdminOnlyWrite`，删
  `ADMIN_ONLY_WRITE_ROLES` 与 `roleCanAdminOnlyWrite`；文件头补"为什么删"。
- `apps/admin/src/stores/session.ts`：删 import、`canAdminOnlyWrite` computed 与 return 键。
- `tests/admin-write-gate.spec.mjs`：`ADMIN_WRITE_BITS = ["canWrite","canSuperAdminWrite"]`（`:110`）。
- 新增**死位判点**（`analyze` 内，`:808` 附近）：`ADMIN_WRITE_BITS` 每个位必须在视图里被
  `sessionStore.<位>` 引用≥1 次，否则 `位...没有任何视图引用...= 死位，要么接消费方要么删位` 判红。
- `--self-test` 改**读真实 write-policy.ts**（`POLICY_SNIPPET = readFileSync(WRITE_POLICY_FILE,...)`，`:873`），
  与真跑共用同一档位源；fixture 视图同时引用两位，正控绿。

**判点与红证据**：--self-test 方向 (f)：视图不引用任何位 ⇒ 红 `死位`。真实扫描里 canWrite / canSuperAdminWrite
各有多个视图消费 ⇒ 绿。

**实测读数**：`npm run test:i18n-orphan`… 略（此项读数在 `admin-write-gate`）：`node tests/admin-write-gate.spec.mjs` EXIT=0，
`node tests/admin-write-gate.spec.mjs --self-test` = `六向判红，正控绿`。

---

## 6. B-FINDING 13｜write-policy 注释"42 处"过期 → 门打印两数并断言单调

**现象**：`write-policy.ts` 注释把"后端 hasRole('SUPER_ADMIN') 共 42 处"当事实呈现；实测注解/归档函数互不相等，
拿 42 对账会得出"门漏 7 个"的错误结论。

**改动**：
- 注释不再写死数字（`write-policy.ts:11` 与 `session.ts:74`），改为"以 `ADMIN_WRITE_GATE_VERBOSE=1` 实跑为准"。
- `analyze` 计算 `counts.superAdminAnnotations`（正则 `@PreAuthorize("hasRole('SUPER_ADMIN')")` 在 admin-scoped
  Java 文件里的命中数）与 `counts.superOnlyArchivedFunctions`（归档到 super-only 的 TS 写函数数），
  真实扫描尾部（`:1096` 附近）打印两数并断言 `归档函数数 ≤ 注解数`（越界即红：档位解析把非超管端点错归 super-only）。

**实测读数**（`node tests/admin-write-gate.spec.mjs`）：
`SUPER_ADMIN 口径（B-FINDING 13）：Java 注解 hasRole('SUPER_ADMIN')=45 处 / 门归档 super-only TS 写函数=43 个（后者必须 ≤ 前者）`。
**纠正交办口径**：报告记"注解 49 / 归档 43"；门把注解限定在**含 /api/v1/admin 的控制器**内计数得 **45**
（差值 4 是 /api/v1/admin 之外的超管注解，本门档位轴本就不归档它们）。单调关系 43 ≤ 45 成立。

---

## 7. B-FINDING 15（admin 侧）｜登出不清 menuStore + 守卫加载条件绑登录主体

**现象**：`apps/admin/src/stores/session.ts` 登出清 user/token/localStorage，但不清 `stores/menu.ts` 的
`loaded/menuTree`；`router/guards.ts` 按需加载条件是 `if (!menuStore.loaded)` ⇒ SPA 软跳转换权限不同的账号
不会重拉菜单树，上一角色动态路由/导航残留（点进去被后端 403 兜住，属错误导航暴露）。

**改动**：
- `apps/admin/src/stores/menu.ts:218` 新增 `loadedFor = ref<string|null>(null)`；`loadMenus(forUserId?)`（`:354`）
  成功/兜底两分支都写 `loadedFor.value = forUserId ?? null`；`reset()`（`:383`）清 `loadedFor=null`；return 暴露 `loadedFor`。
- `apps/admin/src/stores/session.ts:237` logout 末尾 `useMenuStore().reset()`（顶部 import useMenuStore）。
- `apps/admin/src/router/guards.ts`：新增 `getCurrentAdminUserId()`（读 admin_v2_user.id）；两处加载条件
  （`:139`、`:168`）由 `!menuStore.loaded` 改为 `!menuStore.loaded || menuStore.loadedFor !== currentUserId`，
  并把 `currentUserId` 传给 `loadMenus(currentUserId)`。
- `apps/admin/src/views/Login.vue:49` 登录后的 `loadMenus()` 改为传入 `String(sessionStore.user.id)`，
  使登录首发就把 loadedFor 记上，守卫据此在换账号时必重拉。

**红门（换账号后 menu 必须重新拉取）**——`apps/admin/src/stores/menu.test.ts` 新增：
- `useMenuStore.reset` 清空 loaded/menuTree/loadedFor（若 reset 不再清 loadedFor 即红）；
- 换主体判据：loadedFor="A" 时对 A 不重拉、对 B 必重拉（复现守卫 `!loaded || loadedFor!==id`）；
- 源契约：guards.ts 必含 `menuStore.loadedFor !== currentUserId` 且不再出现 `if (!menuStore.loaded) {`；
  session.ts 必含 `useMenuStore().reset()`。

**实测读数**：`apps/admin` `npm run test:unit` = **83 passed (7 files)**（在途 79 → +4：reset/换主体/guards源契约/session源契约）。

---

## 8. C-F7 / 判定表 17｜gate-wiring 的"CI 已执行"只看 run: 体

**现象**：`tests/gate-wiring.spec.mjs:172` 的 `inCi` 在 ci.yml **原始全文**上 `\b<name>\b` ⇒ 名字写进注释就算接线
（实例 test:structure 唯一命中是注释 `ci.yml:131`）。

**改动**：
- 新增 `extractCiRunBodies(ci)`（`:20`），只取所有 `run:` 步骤体（单行/块标量两种），并按行剔除 `#` 注释；
  `ciNormalized = normGate(ciRunBodies)`（`:179`）。
- `inCi`（`:175`）改在 **run 体归一文本**上匹配（`npm run <name>` 或裸 `<name>`，整名不 trailing `[\w:.-]`）；
  `bodyInCi` 同面（命令本体只在 run 体里找）。
- 新增 C-F7 自证守卫（`:56`）：探针串 `建了没人跑`（只在 `ci.yml:131` 注释出现，实测 grep 全文唯一命中该行）
  必须"在 ci 里、不在 ciRunBodies 里"——若 extractCiRunBodies 退回返回原文（不剔注释），该断言立刻红。

**复量（现有门是否转红）**： discrimination 探针显示唯一"只出现在注释"的名字是 `test:structure`，但它同时在
`test:contracts` 链里（inChain=true），故按 run 体判据仍绿；**没有为凑绿把任何门塞进例外表**。
`node tests/gate-wiring.spec.mjs` = `test gate wiring contract ok`，EXIT=0。

**能变红证据**：C-F7 自证守卫本身即红锚（禁改 ci.yml，故用参数化探针而非文件变异坐实判点方向）。

---

## 9. C-F2｜gate-wiring 第二条磁盘对账：scripts/qa 门形态件必须有人跑

**现象**：scripts/qa 下 52 个门形态件（verify-/check-/audit-）+ 55 个 test-* 自检件，唯一载具
run-final-verify-v33.sh（CI 里只在注释）与 `.zcode/workflows/*.dwf.ts`（无自动入口）；prove-gates-can-fail /
run-qa-selftests / lint-gate 在 CI/链里是孤儿。gate-wiring 只盘 tests/ 与根 test:* 名，对这块全盲。

**改动**：`tests/gate-wiring.spec.mjs` 新增第二条对账（`:210` 起）：
- 枚举 `scripts/qa` 门形态件（正则 `^(verify|check|audit)-.+\.(mjs|cjs|js|sh)$`，扫描面下限 40）；
- 「三集合之一」= 链（package.json 任一脚本按路径引用）/ CI（run 体按路径引用）/ 显式登记
  （本地载具：`run-final-verify-v33.sh` + 全部 `.zcode/workflows/*.dwf.ts`，视为"有理由的本地载具"）；
- 真正无人点名的孤儿逐条登记 `QA_GATE_ORPHANS`（带理由）+ 件数基线 `QA_GATE_ORPHAN_BASELINE` 只减不增
  （双向：多一个未登记即红、接上一个不划掉即红、数不符基线即红）；
- 自检件轨：≥10 个 test-* 时，聚合载具 `run-qa-selftests.mjs` 必须在本地载具里被点名，否则红
  （否则整批 test-* 重新变孤儿）。

**实测读数**：门形态件 52 个，无人跑残留 **5 个**（基线钉 5）：
`audit-frame-verdicts.mjs / check-frame-orphanage.mjs / check-queue-plan.mjs / verify-exec-delta.mjs / verify-logged-in-landing.mjs`
（逐条理由已写进 QA_GATE_ORPHANS；verify-logged-in-landing 与 run-final-verify-v33.sh:127 的"缺输入保留为孤儿基线"同口径）。

**能变红证据**（临时新建 `scripts/qa/verify-lanec-probe-orphan.mjs`，跑完即删）实测红原文：
`AssertionError: scripts/qa/verify-lanec-probe-orphan.mjs 是门形态件，却不在链 / CI / bash 终验 / DSL 任一载具里被点名，也没登记在 QA_GATE_ORPHANS = 建了没人跑`，EXIT=1；
删除后 gate-wiring 恢复 `test gate wiring contract ok`，sha `7631f68b...` 未变。

**prove-gates-can-fail / run-qa-selftests 的可执行入口**：两者已在 ① bash（`run-final-verify-v33.sh:100` prove、
`:180` run-qa-selftests）与 ② DSL（GATE_SUITE + redProbe，如 `miniprogram-qa-finish-v33.dwf.ts:102/575`）登记；
③ `run-qa-selftests.mjs` 的 `GATE_SELFTESTS` 收的是各门的 `--selftest`，prove-gates-can-fail 不是 --selftest
形态、run-qa-selftests 不能自列，故 ③ 对这两件天然 N/A。真正缺的是**自动触发**（CI/根 package.json 里没有任何入口调用
bash 载具或 DSL）——见"接线三件套"，交主控落。

---

## 10. C-F8 / 判定表 14 + FINDING 14｜i18n 门第二维 + 收缩升红 + 成对维诚实

**现象**：`scripts/qa/verify-i18n-orphan.mjs` 成对维整体 SKIPPED（en-US 已下线）⇒ 只剩孤儿维生效；
`I18N_RATCHET_SHRINK` 只打印不判红；且门只量"定义没人用"的反方向，完全不量"绕过 i18n 的裸中文文案"。

**改动**（`scripts/qa/verify-i18n-orphan.mjs`）：
1. **收缩升红**（`:206` 起）：`orphanShrink = !orphanFail && orphans<ALLOW` 计入 failDims → EXIT=1，与其它棘轮双向对齐。
2. **成对维诚实**：PASS 判决行现在明写"成对维 SKIPPED：en 包已下线，本维不再声称覆盖"，退出码只由生效维决定
   （输出与退出码一致）。
3. **第二维（FINDING 14 建议）**：同一遍历新增 `classifyHardcodedChinese`（`:126`）——先 `stripCommentsAndLogs`
   剥 `//`、`/* */`、`<!-- -->`（带字符串/模板字面量状态机）并整行剔 `console.*`，路径级排除
   `/tests/`、`mock-data`、`fixtures`、`*.spec.*`、`*.stories.*`、`/i18n/`、dev-only 页；再按五分类计数
   （模板文本节点 / 属性文案 / toast-modal / `||"中文"` 兜底 / throw）。棘轮 `--allow-hardcoded N`（缺省 = 实测），
   超出红、可收缩红。`--no-hardcoded` 可关这一维。

**默认值怎么取**（交办要求）：`ALLOW_HARDCODED` 缺省 = **456**（本分类器本轮实跑：模板文本 360 + 属性 42 +
toast/modal 33 + `||` 兜底 21 + throw 0）。这是**本门尺**的数，不等于 B 泳道的 ≈358+16（尺不同：B 数生产 UI、
本门数 apps/client/src 全量含 .ts）；**两把尺的基线由主控在 i18n 迁移车道落点后统一重钉**（本门已参数化，
迁移只需把缺省往下调、或传 `--allow-hardcoded <新数>`）。

**实测读数**（`node scripts/qa/verify-i18n-orphan.mjs`，即 `npm run test:i18n-orphan`）：
```
I18N_ZH_KEYS=4143 ... FILES_SCANNED=553 STATIC_REFS=2405 DYNAMIC_PREFIXES=10
I18N_ORPHANS=1251 I18N_ORPHANS_ALLOWED=1251
I18N_HARDCODED=456 I18N_HARDCODED_FILES=86 I18N_HARDCODED_ALLOWED=456（模板文本=360 属性=42 toast/modal=33 ||兜底=21 throw=0）
I18N_RESULT=PASS（成对维 SKIPPED：en 包已下线，本维不再声称覆盖；孤儿维 + 裸中文维生效）
```
**能变红证据**（参数负对照，未改任何文件）：
- `--allow-orphans 1300` ⇒ `I18N_RESULT=FAIL（孤儿可收缩 1251<基线 1300）`，EXIT=1（收缩升红）。
- `--allow-hardcoded 400` ⇒ `I18N_FAIL_HARDCODED 裸中文文案 456 > 允许 400`，EXIT=1（第二维棘轮会咬）。
- `--allow-hardcoded 999999` ⇒ `I18N_HARDCODED_SHRINK 456<999999`（双向收缩也红）。

**遗留债/本机判不出**：throw=0——本分类器的 throw 正则对 store 里 `throw new Error(...)` 的非中文/多行形态没抓到
（B 泳道记 16 条 store 抛错）。这条第二维的 throw 子项口径待 i18n 迁移车道与主控统一；不谎称已复现 16。

---

## 11. C-F4 收口（node 侧）｜未闭合——无合适的列级门可挂

**判定**：**未闭合**，原因如下（不留口头完成）：
- C-F4 要求"apps/api 的 JUnit 解析器与 **node 侧列级门**共享同一份过程补列登记表"。但 node 侧目前**没有列级门**：
  `tests/entity-ddl-drift.spec.mjs` 是**表级**判据（@Table→CREATE TABLE、引用先于创建、ENUM 回退），
  不解析实体↔迁移的**列**集合，因此没有能消费"过程补列登记表（`add_version_column_if_missing('t')` /
  `add_created_at_column_if_missing_v6('t')` 等循环补列）"的门可挂。
- 现造一个 node 列级门需要：完整实体列解析（@Column/@JoinColumn 换行/@Version/snake_case/@Transient）+
  过程补列登记表，且要一次性把报告 §3 的"朴素解析 67 实体/118 列漂移"收到 0——这是高假红区，且列级漂移的权威域属
  后端车道（apps/api 与 database/flyway），本车道被明令禁改 apps/api。
- 共享登记表若没有 node 消费方就只是一份死数据，正落 C-F2/C-F4 批评的"建了没人跑"。

**结论**：node 侧 C-F4 **不在本车道闭合**。建议：后端车道先落 Java 侧登记表（别动 apps/api 归他们），
待有 node 列级门立项时（须主控同批把新 spec 登记进 package.json/链，见本仓已知坑），
登记表作为两门共享的数据件一并引入。本车道已在 entity-ddl-drift 的**表级**判点上确认 F3（幽灵表 DML）由在途改动闭合、
本机复量绿（见"复量确认"），未把列级 F4 混进来冒充完成。

---

## 复量确认（F1/F3/F5 在途闭合，本车道只复量不重做）

- **F1（prototype-contract 恒绿）**：`node tests/prototype-contract.spec.mjs` →
  `prototype-contract（迁移侧契约）ok：断言 8 条全部执行，建表核对 4/4，遗留原型缺席已核对`，EXIT=0。已从"exit 0 且 0 判点"
  改成对现行迁移的等价判点，确为绿。
- **F3（entity-ddl-drift 只对链里没有的表做 DML）**：`node tests/entity-ddl-drift.spec.mjs` →
  `entity-ddl-drift ok（实体 @Table 110 个 / 链建表 120 张 / 迁移 233 份 / 无 ENUM 回退）`，EXIT=0。
  判点 2b（`:82` phantomDmlTargets）在途已补，`PHANTOM_DML_EXEMPTIONS` 空集且双向强制，确为绿。
- **F5（监控/compose/pom/README 注释漂移）**：属 docker/README 文档面，不在本车道改动面；`npm run test:contracts`
  全链（含 test:monitoring / test:deployment-config / test:docs）EXIT=0，复量确为绿。

---

## 全量验证读数（收口前）

- `node tests/admin-write-gate.spec.mjs`：EXIT=0，`写 API 函数 96 / 写视图 34 / Java 写端点 182 / 已归档写函数 95 / 不中 0 / 豁免 0`，盲区 `22-0-0`，`SUPER_ADMIN 口径 注解 45 / 归档函数 43`。
- `node tests/admin-write-gate.spec.mjs --self-test`：EXIT=0，`六向判红，正控绿`（(a)超管 (b)纯ADMIN (c)前端比后端严 (d)豁免方向写反 (e)脚本块顶层 (f)死位）。
- `node tests/gate-wiring.spec.mjs`：EXIT=0，`test gate wiring contract ok`。
- `npm run test:i18n-orphan`：EXIT=0（孤儿 1251/1251 + 裸中文 456/456，见第 10 节）。
- `apps/admin` `npm run test:unit`：EXIT=0，**83 passed (7 files)**。
- `apps/admin` `npx vue-tsc --noEmit`：EXIT=0。
- `npm run test:contracts`（全链 34 调用）：**EXIT=0**。

> 说明：test:contracts 期间 apps/client 与 apps/api 正被另两条车道并发改；本车道改动面（admin/tests/scripts/qa）
> 全链绿，未落在别人的改动面上；链里无因本车道而起的红。

---

## 接线三件套（交主控落，本车道无权改根 package.json / ci.yml）

本车道新增/涉及的门与脚本键需求，逐条给出要加的原文。根 `package.json`、`.github/workflows/ci.yml` 由主控落。

1. **scripts/qa 本地载具的自动触发（闭合 C-F2 的"载具无人自动跑"根因）**：
   - 根 `package.json` `scripts` 新增（建议）：
     - `"test:qa-selftests": "node scripts/qa/run-qa-selftests.mjs"`
     - `"test:prove-gates-can-fail": "node scripts/qa/prove-gates-can-fail.mjs"`
   - `.github/workflows/ci.yml` 新增一个 job（Node>=20 + pnpm install）里加两步 `run`：
     - `npm run test:qa-selftests`
     - `npm run test:prove-gates-can-fail`
     （二者都需 Node>=20：run-qa-selftests.mjs:26 有版本闸、prove-gates-can-fail.mjs:14 用 import.meta.dirname。）
     接线后 `gate-wiring` 的第二条对账会把 run-qa-selftests 归入"CI 已点名"，自检件轨那条聚合载具判点更硬；
     若主控选择继续只保留 bash/DSL 本地载具而不进 CI，则**必须**在这两处至少一处真正 `run` 它们，
     否则本车道 `QA_GATE_ORPHAN_BASELINE` 与自检件判点会持续要求登记。

2. **i18n 第二维基线（第 10 节）**：`test:i18n-orphan`（`scripts/qa/verify-i18n-orphan.mjs`）现已同时打孤儿棘轮
   （ALLOW=1251）与裸中文棘轮（ALLOW_HARDCODED=456 缺省）。i18n 迁移车道落点后，把 `verify-i18n-orphan.mjs:43` 的
   `arg("allow-hardcoded","456")` 缺省下调，并把新数与理由写进该文件注释；无需新增链脚本。

3. **本车道未新建任何 `tests/*.spec.mjs`**（只扩写既有 admin-write-gate / gate-wiring 与既有 app spec），
   故不触发"新建 spec 必须同批登记"约束；`test:contracts` 链无需为本次改动增删条目。

---

## 反向变异台账（改前 sha → 红原文 → 还原 sha）

| # | 目标文件 | 变异 | 红原文（截断） | 还原后 sha256 | 改后 sha |
|---|---|---|---|---|---|
| A | apps/admin/src/views/content/Users.vue | 改密提交按钮加回 `v-if="currentAdminRole==='SUPER_ADMIN'"` | `content/Users.vue：<绑定 handleChangePwd() 的控件> 用裸角色比较 SUPER_ADMIN…后端还接受 ADMIN（前端比后端严）` | `85b755cf75e3b84cc1253190a9797732b41ef3beb1b8c7958c5d401bae60b99d` | 同（未净改） |
| B | tests/admin-write-gate.spec.mjs | BLIND_SPOT_CEILING.unattachedControls 22→25 | `× 盲区扩张: unattachedControls: 实测 22 < 基线 25 ⇒ 基线可以且必须降到 22` | `0b2dd99b73b55cb27581ca2990ec2b6af58ecd0b91c5e5da1d33d0b9a3881bfc` | 同 |
| C | scripts/qa/（临时新建 verify-lanec-probe-orphan.mjs） | 新建无人点名的门形态件（跑完 rm） | `AssertionError: scripts/qa/verify-lanec-probe-orphan.mjs…没登记在 QA_GATE_ORPHANS = 建了没人跑` | gate-wiring `7631f68bc1e2271d4354491f8475565c5f04cc50fde9ba46aa99ffc509ff21d0`（未改），探针文件已删 | — |
| D | 门参数负对照（不改文件） | `--allow-orphans 1300` / `--allow-hardcoded 400` | `I18N_RESULT=FAIL（孤儿可收缩 1251<基线 1300）` / `I18N_FAIL_HARDCODED 裸中文文案 456 > 允许 400` | — | — |
| E | 门 --self-test（合成夹具，不碰盘） | (c)(d)(e)(f) 四新判点 | 见第 2/1/3/5 节红原文，六向全绿=0 失败 | — | — |

> 本仓 `.gitignore` 挡 `reports/**.png`（第五轮实测）⇒ 本车道未做任何截图取证，前后对比全部走文本读数 + sha256，
> 无 png 产生即无销毁 before 影像的风险。

## 遗留债（明写）

1. C-F4 node 侧列级门：本车道未闭合（第 11 节），依赖后端登记表 + 未来 node 列级门立项（须主控同批登记新 spec）。
2. i18n 第二维 throw 子项口径未复现 B 泳道的 16 条（第 10 节），待迁移车道统钉。
3. 门盲区 1（控件↔处理函数经子组件透传的归属）仍在：unattachedControls=22 是"判不到归属"的上界，不是缺陷；
   守卫轴对这些函数仍是硬判。把 ConfirmDialog 多属性透传纳入正则解析是后续可做的事，本轮未做（避免扩大改动面）。
