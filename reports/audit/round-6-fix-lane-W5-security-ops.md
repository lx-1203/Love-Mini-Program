# 车道 W5 交付：给 `subpackages/tools/security/index` 补 ops 判据台

- 车道：W5（一条任务：补件让两条 guest-landing 自检件的红归位）
- 基线 HEAD（接单时）：`57f39069`；收口时 HEAD 已被并行车道推进到 `2032954c`（`1c27f5bf`、`2032954c` 两发改的是 `scripts/qa/test-corpus-denominator.cjs` / `test-source-shape-lg31.mjs` / `verify-source-shape.mjs`，未触及 ops、policy 与那两条自检件 ⇒ 本报告全部读数仍在同一判据台/同一 policy 上取，见 §7 反查）
- 唯一新建文件：`reports/audit/round-6/ops/SUBPACKAGES-TOOLS-SECURITY-INDEX.json`（16 条 case，终值 sha256 `464c77eacc1210398ba7faf3e5f6f5d5774b3f6a43d76566bb9a6fea7794cfb7`，见 §7）
- 载具（只读，一字未改）：`scripts/qa/verify-guest-landing.mjs`、`scripts/qa/guest-landing-policy.json`、`scripts/qa/test-guest-landing.mjs`、`scripts/qa/test-guest-landing-writeguard.mjs`

## 0. 一句话结论

W4 的定性成立：这不是页面缺陷，是台账缺件。补上 16 条判据格之后，`test-guest-landing.mjs` 由 **10 红降到 3 红**，`test-guest-landing-writeguard.mjs` 由 **14 红降到 0 红（PASS）**；聚合器终判仍是 `SELFTEST_RESULT=FAIL（2/64）`，但**成员换了**：写守卫那条整条出账，入账的是 `test-deny-tap-field-clear.cjs` 把 ops 条目总数钉成字面 1107 的那一格（判据台合法新增 16 条必然撞上，实得 1123）。两条 guest 门的断言失败数从 24 降到 3；剩下的 3 条红全部**不是本页造成的**，其中 1 条确实转成了「需真环境取景」形态（`booked 30 组 ≠ measured 28 组`），已如实保留并写清要哪台机器（§5.3、§6、§8）。

## 1. 复核 W4 的定性（实测，不是转述）

| 项 | 改前实测 | 出处 |
| --- | --- | --- |
| policy 对该页有无裁定 | 有：`rows[]` 第 29 项 `subpackages/tools/security/index → pages/login/index`，`family=guard-bounce`，并另立一族（`$basisKeys.guardBounce` 明写 2026-10-31 P1 补 wallet+security 两页） | `scripts/qa/guest-landing-policy.json:276-281`、`:102` |
| policy 锚点是否指向真代码 | 是，三条：`guestGuarded.value = guideGuestToLogin();`、`if (guestGuarded.value) return;`、`usePageAccess(securityCenterPageRequirements);`（三条 needle 在 `apps/client/src/subpackages/tools/security/index.vue` 各出现且只出现一次，锚点判据是「存在且唯一」） | `guest-landing-policy.json:75-89`；源码 `:49`、`:292`、`:41` |
| ops 判据台该页行数 | 0 行（把该目录当时 24 份 manifest 的 `page` 字段全扫一遍，没有任何一条落在本页；`次要20.json` 只在 `entryPoints`/`pre` 里把本页当**来源页**提过，不构成成员） | 复算脚本扫 `reports/audit/round-6/ops/*.json` |
| 同批 wallet 页 | 11 行（`次要22.json` MW01–MW11） | 实测 |
| 载具判红的那句话 | `policy 里这几组既不在本轮跑测的落地对里、ops 也没有任何证人 ⇒ 这一组没有任何证人` + `roster 组=29 ≠ policy 裁定组=30 ⇒ 有裁定出不了腿` | `verify-guest-landing.mjs:195`、`:267`；改前原文见 §7 LEG C |
| 产品侧 | `securityCenterPageRequirements`（`config/page-access.ts:70-75`，`requiresAuth:true`）已在实现里且被 `:41` 接线，`apps/client/src/tests/pages/wallet-security-guest-gate.spec.ts` 已把「游客不发 /auth/devices、四张账号级卡不渲染、放行档五卡齐全」钉成单测 | 源码核过 |

⇒ 补件是唯一正确的动作，且必须**照消费者要求的形状**补，不是照我的想象补。

## 2. 载具要求的形状（先读消费者，再按它的口径写字段）

`test-guest-landing.mjs:56`（`OPS_DIR`）/ `test-guest-landing-writeguard.mjs:24`（`OPS`）都把 ops 指到 `reports/audit/round-6/ops`；后者以 `--ops OPS` 真传给载具（`:258`）。四个消费者各读各的字段：

| 消费点 | 读的字段 | 对本页的硬要求 |
| --- | --- | --- |
| `verify-guest-landing.mjs:118-140 opsRosterByPage()` | 只读三样：`c.page`（`String().trim()` 后必须**逐字等于** `policy.rows[].page`）、`c.id`、`c.identities` | 文件必须是 `*.json` 且可解析（`:122` 读不动 ⇒ markProblem）；`page` 写成 `subpackages/tools/security/index`（不带 `apps/client/src/`、不带 `.vue`、不带前导斜杠） |
| 同上，两条互斥路线 | `guestNoLongerClaims()`（`:90-94`，identities 非空且不含 `guest`/`none`）＝#67「收窄出游客腿」；`identityDeclared()`（`:98-100`）**整页每一行都没声明**才走 2026-09-30 裁定 (a)「整页游客断言」 | 本页必须走前者：14 行标 `["A","B"]` + 2 行不标 ⇒ `entireGuest=0`、`narrowed=14`，落进 `memberBasis=ops-narrowed-out-of-guest-leg`（与其余 27 页同族），不再给第 10 块新增一格命中面 |
| `test-guest-landing.mjs` 第 3 块（`:164-177`）与第 9 块（`:316-345`） | 按 `String(c.page).trim() === PAGE` 匹配后改写 `c.identities`；第 9 块断言 `a.pageRows > 1` | 它们只动 `subpackages/tools/search/index`，本页不受影响；但要求「一个页可以有多行」的形状成立 ⇒ 本页 16 行满足 |
| `r-exec-cli.mjs:896`/`:903`/`:193-200`/`:1593` | `c.tier`（缺省按 `normal`）、`c.requiresReal === true`（严格相等才走档位跳刀）、`c.automatable === false` + `notAutomatableReason` + `notAutomatableFrom`（三者齐才出「盖章不可自动化」的跳过理由） | 破坏性腿一律 `automatable:false` 并写清**为什么自动腿不能跑**、盖章出处 `W5-20261101-manual`（不冒充 cellplan 派生） |
| `deny-tap.cjs`（被 `r-exec-cli`/`r-exec-ws` 共用） | 只扫 `c.action`；词表逐字 `注销\|解绑\|清空\|删除账号\|删除帐号\|退出登录\|登出`（「清空」另按宾语判）命中即禁触 | 破坏性行的 action 里**保留**实际被点的控件名（含词表词「注销」「解绑」），不为过护栏把词藏进 `expected`；词表覆盖不到的 4 条（SEC06 下线会话、SEC07、SEC09 改密、SEC11 改绑）靠 `automatable:false` 交人判，并把这记成 DENY_TAP 的覆盖面缺口事实（见 §8） |

`pageNotes` 里另写了三条纪律：判据是待执行的格子（不是结果）、真值位留空清单、identity 打标口径（含「讲游客/闸门的行一律不标」那条规矩的两行落点）。

## 3. 逐条 case 及其源码锚（16 条，全部从本页源码分支派生）

页文件：`apps/client/src/subpackages/tools/security/index.vue`（行号是阅读提示，判据本身引的是标识符/条件原文，重排不失效）。

| id | 判点（一句话） | 源码锚 | tier | requiresReal | identities | automatable |
| --- | --- | --- | --- | --- | --- | --- |
| SEC01 | 游客冷启动：守卫先于取数，`GET /auth/devices` 计数=0、窗内不出现 401，2500ms（复采 4500ms）落 `pages/login/index` 且两枚 marker present | `:48-50` onLoad、`:292` 早退、`:315-317` 唯一入口、`:290-312`；`guards/guest-access.ts:72-85`、`:58`、`:74`；`constants/app.ts` LOGIN_REDIRECT_DELAY_MS=500；`constants/routes.ts:52` | critical | true | **不标**（游客腿自己跑） | — |
| SEC02 | 游客档四张账号级卡不渲染（六段文案 + `.sec-item__kick` + `.sec-item--danger` 全部 present=false），只剩隐私保护卡 | `:592`/`:641`/`:689`/`:770` 的 `v-if="!guestGuarded"`、`:726` 无 v-if、`:609`/`:632`/`:706`/`:719`/`:780` | critical | true | **不标** | — |
| SEC03 | 放行档五张卡齐备（对照腿，防「上一条红是因为页没渲染」/整页罢工） | `:590`/`:592`/`:641`/`:689`/`:726`/`:770`、`:600`/`:621`/`:676`/`:706`/`:711`；zh-CN.ts:1718-1739 | critical | false | A,B | — |
| SEC04 | real 档每次 onShow 恰一条 `GET /auth/devices`；`isCurrent=index===0&&!revoked`；revoked→「已下线」；失败支不清列表 | `:290-312`、`:295`、`:298`、`:301-307`、`:271-276`、`:309-311`、`:315-317`、`:248-255`；后端 `AccountSecurityController.java:95` | normal | true | A,B | — |
| SEC05 | 设备主标题三分支（本机真型号 / createdAt 首登日期 / deviceId 末四位兜底）+ 型号收口（去尾括号、12 字补省略号）+ 徽章单行 + 副行不得凭空出「未知位置」 | `:177-193`、`:157-161`、`:189-192`、`:279-284`、`:258-268`、`:170-173`、`:708`、`:1041-1046`、`:1094-1095` | normal | true | A,B | — |
| SEC06 | 下线设备（real）：**先 POST revoke、2xx 后才删行**；取消腿零请求；当前设备结构性不可下线；热区 88rpx | `:458-484`（`:459-460` 早退、`:462`/`:470`/`:471`）、`:489-504`（`:491-494`/`:495-496`/`:497-501`）、`:710-720`、`:1103-1126`；后端 `:112` | critical | true | A,B | false |
| SEC07 | mock 档下线的本机持久化：`storage['security:kicked-devices']` 去重写、冷启动不回显、异常静默降级；**mock 初始列表无第二条设备 ⇒ 该腿必须记 UNVERIFIED 不许凑** | `:472-476`、`:103`、`:120-129`、`:108-115`、`:202-209`；`constants/storage-keys.ts:146` | normal | false | A,B | false |
| SEC08 | 改密三条前置校验各自早退（长度边界 5/21、两次不一致、旧密码空）⇒ 零请求、弹层不关、错误位有中文、按钮不进「提交中...」 | `:398-411`、`:420`/`:448-449`、`:833`/`:860`/`:872`/`:878`、`:840-854`；zh-CN.ts:1746-1753 | normal | false | A,B | — |
| SEC09 | 改密成功链（real）：关弹层→`clearTokens()`→`userSession=null`→**1200ms 才** `reLaunch(ROUTES.LOGIN)`；后端已吊销全部 token（旧密码复登必失败） | `:422-435`、`:431-432`/`:433-435`、`:448-449`、`:412-418`（mock 假成功支）；后端 `AccountSecurityController.java:57`、控制器注释 `:50-52` | critical | true | A,B | false |
| SEC10 | 改密 403（旧密码错误）落页内错误位；不关弹层、不清 token、不跳登录页；非 403 走另一支文案 | `:436-447`（`:438-441` 读 `error.status`）、`:442-443` vs `:445-446`；`services/http.ts:784-788`；后端 `RealAccountSecurityService.java:131`、`ErrorMessages.java:223`；zh-CN.ts:1754-1755 | critical | true | A,B | — |
| SEC11 | 改绑手机号（real）：`/^1[3-9]\d{9}$/` 与密码必填先早退；成功后 POST `/auth/change-phone` → `refreshSession()` 回读使副行转脱敏；连点无客户端互斥 ⇒ 实发几条记几条；`maxlength="11"` 在位 | `:338-375`（`:340`/`:344-347`/`:357-361`/`:362-366`/`:369-371`/`:826`）、`:791-807`、`:60-63`；后端 `:80` 与注释 `:78`（409）；zh-CN.ts:1757-1762 | critical | true | A,B | false |
| SEC12 | 第三方绑定：两条路径**零写请求**、只出 demo toast；`wechatBound` 分岔（弹 Modal vs 直接提示）；副行 alreadyBound/notBound；Apple 行死行且行尾不得有 › 箭头（缺席断言） | `:66`、`:73-91`（`:76-88` vs `:90`）、`:643-649`、`:667`、`:676-684`、`:1008-1014`；zh-CN.ts:1770、:3085-3098 | normal | false | A,B | false |
| SEC13 | 注销两层确认的遮罩语义：第一层点遮罩**可**关、第二层点遮罩**不可**关（只有「取消」能退）；确认文字不匹配 ⇒ 零请求、留在第二层；进层即清三位 | `:520-523`、`:885`、`:529-535`、`:917`（注释 `:912-916` 对齐 BottomSheet `maskClosable=false` / WhisperUnlockSheet）、`:943`、`:544-547`；zh-CN.ts:1742-1775 | critical | false | A,B | false |
| SEC14 | 注销提交（real 3-E）：留空即拒且零请求；确认文字通过后必发 POST `/auth/deactivate`（前端不校验密码是否为空，拒路由后端判）；成功 `deleteDone`→`clearTokens()`→`userSession=null`→1200ms `reLaunch`；mock 支只弹「人工审核」演示 Modal ⇒ real 档见到即判档位错置 | `:543-586`（`:544-547`/`:548-559`/`:565-572`/`:573-579`/`:580-584`）、注释 `:527`；后端 `AccountSecurityController.java:133`；zh-CN.ts:1743-1745、:1776-1777 | critical | true | A,B | false |
| SEC15 | 隐私两入口导航与返回落点：`ROUTES.PROFILE.PRIVACY` / `SUBPACKAGE_ROUTES.LEGAL.PRIVACY` 两条逐字路径 + 栈深 +1/返回恢复；返回后 `guestGuarded` 仍 false、real 档 onShow 再取一条（既有行为不记缺陷）、列表不得变 0 | `:507-511`、`:514-517`、`:729-764`；`constants/routes.ts:116`、`:252`；`:292`/`:309-311`/`:315-317` | navigation | false | A,B | — |
| SEC16 | 包内素材解析回归（R6-L09-D08）：第三方行必须走 `resolveMediaUrl(...)` 而非裸 `/static/assets/icons/login/...`；「素材缺失」要 URL 状态码 + 墨迹**双证**，单证「文件不在盘」不判红；其余图标逐枚有墨迹；令牌兜底不复活 | `:663`（注释 `:656-662`）、`:605-606`/`:628-629`/`:700-701`/`:736-737`/`:757-758`、`:985-998`、`:1016-1023`、`:736`/`:757` | normal | true | A,B | — |

三条设计说明（都可在源码里复核，不是我随手定的）：

1. **为什么是 14 条标 `["A","B"]` + 2 条不标，而不是 16 条全标**：`tag-ops-identity-scope.mjs` 的规矩 2 明写「判据文本自己提到 游客/未登录/not-logged/弹回/引导/登录墙/LockScreen 的一律不标——那些正是游客档该测闸门的条目，摘掉它们等于把唯一有效的断言删了」。SEC01/SEC02 恰好是这两条。后果（机器可核，见 §5）：`opsRowsOnPage=16 / rowsWithoutIdentityDeclaration=2 / rowsScopedOutOfGuestLeg=14 / rowsScopedToGuestLegByDeclaration=0`，`memberBasis=ops-narrowed-out-of-guest-leg`。
2. **`page` 字段用的是 policy 里同名的页标识**：`subpackages/tools/security/index`（`guest-landing-policy.json:276`），不是 `SUBPACKAGES-TOOLS-SECURITY-INDEX`（那只是文件名/chunkKey，`opsRosterByPage` 不看它）。
3. **`guardCaseId` 不撞号**：本页派生 `GG-tools-security-index`（`verify-guest-landing.mjs:240` 的归一规则），全 30 组唯一，第 6 块负例担心的 `a/b-c` vs `a-b/c` 归一碰撞不适用。

## 4. 真值待取景清单（源码读不出真值的位，一律留空）

本文件里**没有**任何帧名、截图 sha、console 读数、网络状态码、设备型号、token 值、百分比。留空并标注的位：

| case | 留空的真值位 | 要拿到它需要什么 |
| --- | --- | --- |
| SEC01/SEC02 | 帧路径与帧 sha、探针 `present` 读数、`GET /auth/devices` 计数读数 | 真档 + 微信开发者工具（UI 租约）+ 清会话冷启动 |
| SEC04 | 设备条数、每条 `platform/lastActiveAt/createdAt`、两次 onShow 的请求条数 | real 档 + 有会话历史的真账号 |
| SEC05 | `uni.getDeviceInfo().model` 的真型号串（**依取景机器而变**，源码只能给出「去尾括号 + 12 字截断」的算法） | 真档取景；多机型对照要第二台设备 |
| SEC06 | POST revoke 的状态码与被吊销会话（需第二台设备登录留下的历史会话） | 真档 + ≥1 条非当前会话 |
| SEC07 | storage 前后数组读数；且 mock 初始列表只有本机一行 ⇒ 「非当前设备」对象本轮不存在 | 人工造第二条设备会话（或 real 历史会话回灌）；本轮**必须记 UNVERIFIED** |
| SEC09 | 提交前后 token 读数、路由时序读数、旧/新密码复登两次结果 | 专用测试账号真跑（会改凭据） |
| SEC10 | 403 响应体逐字、失败后 token 读数 | real 档 + 故意填错旧密码 |
| SEC11 | 真实新手机号、连点 3 次的实际请求条数 | 专用测试账号真跑（会改凭据） |
| SEC14 | 注销请求结果、提交前后 token/会话读数 | **专用测试账号**（真跑即永久删除账号） |
| SEC16 | 解析后图标 URL 与逐枚墨迹读数 | 真档构建 + 局部裁切取景 |

另外两条「写了也量不到」的位我明确**没写成判点**：`toast` 文案（`guest-landing-policy.json:342-344` 的 `notFrameObservable.toast` 认定本轮载具 toast 全空 ⇒ 任何 toast 断言都是永not-succeed 的判据）与 `reports/**.png` 影像（全局 `.gitignore` 忽略 ⇒ 本文件不预填任何影像名，重拍即销毁 before 影像，纪律要求不做截图）。

## 5. 三发改后读数

### 5.1 `test-guest-landing.mjs`（载具：`D:/codex-tools/node-v22.17.0-win-x64/node.exe`）

改前 `SUMMARY: checks=45 assertion failures = 10` / `GL_TEST=FAIL`；改后 `checks=45 assertion failures = 3` / `GL_TEST=FAIL`（exit=1）。

归位的 7 条（全部因本页判据台进账而绿）：`真数据 exit 0`、`出例数 = policy 裁定条数`（29→30 = policy 30）、`每条裁定恰好一条腿`、`NO_RUN_WITNESS == 两轴之差`（读数 2→3）、`9a 整页未声明 + 跑测证人缺席 ⇒ 绿`、`9a 落地对集合不因新规则而变`、`10 每一组都有 ops 证人`。

保留的 3 条红（**逐条都不是本页的缺陷，也都没有回头改判据或删 case**）：

| # | 红句（改后原文） | 归因 | 性质 |
| --- | --- | --- | --- |
| 1 | `FAIL 真数据锚点全可核 :: GUEST_LANDING groups=27 覆盖欠款行=470 锚点可核=18（不可核 0）` | 断言本体把字面串 `/锚点可核=11（不可核 0）/` 钉死（`test-guest-landing.mjs:120`）。policy 的 anchors 在 2026-10-31 P1 那批由 11 条增到 18 条（新增 wallet×3、security×3），载具报「不可核 0」＝18 条全部可核 | 改前即红（继承）。`scripts/qa/**` 明令禁改 ⇒ 交回：把常量 11 换成「锚点全可核（不可核数=0）且条数==policy.anchors.length」的关系式断言 |
| 2 | `FAIL 10 真数据：新路线命中面 == 整页未声明的那一类页 :: {"ops-narrowed-out-of-guest-leg":28,"ops-entirely-undeclared-guest-assertions":2}` | 断言钉 `entireGuest === 1`。第二格来自 **wallet 页**：`次要22.json` MW01–MW11 **整页没有 `identities` 声明** ⇒ 被裁定 (a) 的「整页未声明」路线收走（本页刻意走 narrowed 路线，所以 narrowed 27→28，entireGuest 仍是 2，没被我加大） | 改前即红（改前是 27/2，改后 28/2）。要绿有两条正路：给 wallet 那 11 行按同一规矩补 `identities`（那是 wallet 车道的判据正文，不是我这条道授权的动作），或由主控把该格改成「点名哪几页走新路线」的在册名册式断言 |
| 3 | `FAIL 10 真数据：booked 的落地对集合 == measured 的落地对集合 :: measured 组=28 booked 组=30` | `reports/audit/round-7/guest-landing-measured.json` 只有 28 行；`guard-bounce` 这一族的两页（wallet、security）从来没在真机上被 measure 腿量过 ⇒ 在册账本比实测账本多这 2 组 | **这就是「红转成需真环境」那一格**（改前 28 vs 29，改后 28 vs 30，差值从 1 变 2 是记账正确化的必然结果，不是新缺陷）。需要的机器：见 §6 |

成员账与名册读数（改前 → 改后，同一载具同一输入）：`GUEST_LAND_ROSTER 组 29→30`、`覆盖欠款行 456→470`（本页净贡献 14 行 = 16 行里被收窄出游客腿的 14 行）、`GUEST_LAND_NO_RUN_WITNESS 2→3 组`、`成员来自 ops 的 29→30（只来自跑测的仍为 0）`。本页那一条账本行的机器可读字段（`real-booked.json` 实测）：

```
guardCaseId GG-tools-security-index  family guard-bounce  identity guest  debtRows 14
memberSource {fromOps:14, fromRun:0, fromOpsNarrowed:14, fromOpsEntireGuest:0}
memberBasis ops-narrowed-out-of-guest-leg
memberBasisEvidence {opsRowsOnPage:16, rowsWithoutIdentityDeclaration:2,
                     rowsScopedOutOfGuestLeg:14, rowsScopedToGuestLegByDeclaration:0}
landingMarker .login-page__brand  registerEntry .login-register-entry
```

### 5.2 `test-guest-landing-writeguard.mjs`

改前 `SUMMARY: checks=49 assertion failures = 14` / `WG_TEST=FAIL`；改后 `checks=49 assertion failures = 0` / **`WG_TEST=PASS`（exit=0）**。

根因与 W4 定性一致，并复核了红的具体位置：写守卫那 14 条不是守卫坏了，而是端到端 8 趟（S1–S8）的载具进程**全部在预检就被 exit=2 带走**（`GUEST_LANDING=FAIL 先修这几条再来量（带病出腿 = 白拿租约）`）——载具的带病拦门排在 `acquireUi` 之前，这个顺序由 `test-guest-landing.mjs` 第 9c 块（`:393-398`）钉着，于是设备桩一次没被撞到、台账一次没被写、S1/S2/S3/S4/S5/S6/S7/S8 的判点逐条落空。补件后 8 趟全跑通：S1 崩腿逐字节没动台账、S2 半成功腿行数不减、S3 显式 `SHRINK_ROWS` 真减行、S4 合并写盘 `generatedAt` 前进、S5/S6 裸旗标与拼错令牌都 `REJECTED`、S7 坏 prev 拒写、S8 变异体真把 28 行清空（红可达）。收尾观测行仍照实印：`WG_LEDGER_OBSERVE ... changed=no 权威台账行数=28`。

### 5.3 聚合器 `run-qa-selftests.mjs`（54 跑 + 1 跳 + 10 门自证）

| 读数 | 改前 | 改后 |
| --- | --- | --- |
| 终判行 | `SELFTEST_RESULT=FAIL（2/64 个离线测试与门自检未过）` | `SELFTEST_RESULT=FAIL（2/64 个离线测试与门自检未过）` |
| `SELFTEST_RAN/SKIPPED/FAILED` | 54 / 1 / 2 | 54 / 1 / 2 |
| 两条红的**成员** | `test-guest-landing.mjs`（断言失败 10）+ `test-guest-landing-writeguard.mjs`（断言失败 14，3s 就退） | `test-guest-landing.mjs`（断言失败 3）+ `test-deny-tap-field-clear.cjs`（断言失败 1）；`test-guest-landing-writeguard.mjs` **转 PASS**（0 失败，24s ⇒ 8 趟端到端真跑完了） |
| 断言失败总数（同两条 guest 门） | 10 + 14 = 24 | 3 + 0 = 3（另加 deny-tap 的 1 条，合计 4） |
| 门自证轴 | `GATE_SELFTESTS_RAN=10 GATE_SELFTESTS_FAILED=0` | 同（未变） |

**「2/64 变 2/64」不等于没进展**，这句必须说清：分子数没动是因为**成员换了**——guest-landing 两条腿按裁定归位（其中写守卫那条整条转绿），换来的新红是 `test-deny-tap-field-clear.cjs` 把 ops 条目总数钉成字面 1107 的那一格（判据台合法新增 16 条必然撞上，见 §8）。这条新红**不是**本页的判据问题，也不允许我为了躲它删 case 或改判据；它要的是 `scripts/qa/**` 的一次同批升链。

## 6. 需要哪台机器（保留的红要在什么环境上才能转绿）

1. **微信开发者工具 + 一次真实 measure 腿**（`verify-guest-landing.mjs --mode measure --project apps/client/dist/build/mp-weixin-real --policy scripts/qa/guest-landing-policy.json --triage <并集> --ops reports/audit/round-6/ops`）：往 `reports/audit/round-7/guest-landing-measured.json` 追加 `guard-bounce` 两页的落点行（`merge-never-shrink` 语义 ⇒ 现有 28 行一根手指都不许碰；不许为凑数手工写行）。这条跑完，§5.1 第 3 项才可能绿；`GG-tools-security-index` 那条腿在测量前状态是 `BOOKED`（未结案），不是 `CLOSED`。
2. **专用测试账号（可被销毁）**：SEC09（改真密码、吊销全部 token）、SEC11（改真手机号）、SEC14（真注销＝永久删除）三条只有在这种账号上才有读数；SEC06 另需第二台设备登录留下的历史会话，SEC07 在 mock 档无第二条设备 ⇒ 本轮记 UNVERIFIED 是正确终态，不许判通过也不许判页面缺陷。
3. **`reports/**.png` 被全局忽略**：所有「取景才有」的位只能由取景腿自己记账，本判据台不预填影像名/文件名，也不做截图（重拍会销毁 before 影像）。
4. 判据台版本戳：`verify-ops-corpus-stamp --check` 现在如实报 `STAMP_RESULT=FAIL 漂移文件=1` + `DRIFT SUBPACKAGES-TOOLS-SECURITY-INDEX.json 是新出现的语料文件（16 例，戳里没有）`，`STAMP_OPS=... files=25 cases=1123`。这是它的本职（回答「这一轮绑的是哪一版正文」），不是缺陷；下一执行波开腿前必须 `--write` 重新盖章。**我没有写任何戳文件**（越界）。

## 7. 变异账（证明这两条门的判据仍在咬，且绿是我这份件换来的）

变异一律写在 `.zcode/tmp/w5-mutation/` 的**副本**上跑，`scripts/qa/**` 一个字节都没改（比"临时改了再复原"更强：根本不写）。

- 载具真件（pristine policy + 真 ops）：**exit=0**，`groups=27 覆盖欠款行=470 锚点可核=18（不可核 0）`、`GUEST_LANDING_RESULT=OK`。
- LEG B 反向变异：`--policy` 指向一份**删掉该页那条裁定**（rows 30→29）的副本 ⇒ **exit=0**、`roster 组=29`、`欠款行=456`。即：把裁定撤掉，红就没了 ⇒ 改前那 10/14 条红确实由「这一条裁定 + 判据台 0 行」这一对产生，门不是恒红的装饰。
- LEG C 对照变异：裁定保留，`--ops` 指向一份**逐字节复制、只缺我这份 manifest** 的 ops 副本 ⇒ **exit=2**，红句点名：`policy 里这几组既不在本轮跑测的落地对里、ops 也没有任何证人（既没有被收窄出游客腿的行，也不是整页未声明 identities 的游客断言页）⇒ 这一组没有任何证人：subpackages/tools/security/index → pages/login/index` 与 `roster 组=29 ≠ policy 裁定组=30 ⇒ 有裁定出不了腿（这一组要么补证人要么改裁定，不许留着一本拍不了的账本）`。即：绿是我补的这 16 行换来的，判据没有松、也没有被旁路。
- 复原与指纹：`scripts/qa/guest-landing-policy.json` 变异前后 sha256 全等 ⇒
  `5ffedf8848de2ee3d1077d2a3b134997553e168d147965e742622fa2e81bdcc6`（before = after）。
  新建判据台终值 sha256：`464c77eacc1210398ba7faf3e5f6f5d5774b3f6a43d76566bb9a6fea7794cfb7`。历次改动的轨迹：首版 `0048e079…` → 修 `pageNotes.破坏性行与人判`（把「哪几条真被 DENY_TAP 拦」与「哪几条拦不住」分清楚）与 SEC06/SEC08 两处说明 → `9a30d964…` → 把正文里 7 处警示符号换成「注意：」（同批 ops 文件不用该符号）→ 终值。三次都**只动说明性文字**，未动任何 `page`/`id`/`identities`/`action`/`tier`/`requiresReal` ⇒ 复跑读数不变：`test-guest-landing` 仍 3 红（45 checks）、`test-guest-landing-writeguard` 仍 PASS（0 红 / 49 checks）、`test-deny-tap` 仍 1 红。
  ops 目录总条数：1107 → **1123**（+16），`verify-ops-corpus-stamp` 的 `STAMP_OPS` 行独立复算同值（两口径一致）。

## 8. 聚合新增那条红的归因与交回动作

`test-deny-tap-field-clear.cjs:126`：`t("S4 " + dir + " 判据总数守恒 = 1107", rows.length === 1107, "实得 " + rows.length)` —— 它把 round-6/ops 的**条目总数**钉成一个字面快照数。任何一条合法新增（本车道 +16）都会撞红，且这是该文件自己注释里承认的「漂移守恒」轴的 before 侧代价。实测红句：`FAIL S4 reports/audit/round-6/ops 判据总数守恒 = 1107 :: 实得 1123`。同文件另外两条（`拒绝集合只减少 TD03/OT09 两行`、`没有多拦任何一行`）**仍绿**：`DENYTAP_CORPUS dir=reports/audit/round-6/ops cases=1123 refuse_before=35 refuse_after=33 released=次要18|TD03,次要20|OT09 newly_denied=(none)`（对照 round-7/ops 那份拷贝仍是 1107/32/30）——我 3 条含「注销/解绑」的行在旧正则与新正则下同侧（都被拒），所以集合差集没变、只是分母涨了。

⇒ 交回能改 `scripts/qa/**` 的车道：把 1107 改成 1123（或改写成「等于当前 ops 目录实数且与 ops-corpus-stamp 的 `cases=` 互算」的关系式），与本报告同批升链。我没有动它，也没有为了躲这条红而删 case。

顺带一条**护栏覆盖面**交回（不是本页缺陷，是本页把它暴露出来了）：DENY_TAP 词表不含「下线/吊销会话」「修改密码」「更换手机号」这三个动词，所以 SEC06/SEC09/SEC11 这三条会真改凭据、真吊销会话的腿**不会被自动拦下**，目前只靠判据台手写 `automatable:false` 兜住；要不要把这类账号级动作纳进禁触清单，归主控与 F-04 车道判。

## 9. 纪律自查

| 纪律 | 执行情况 |
| --- | --- |
| 只新建/修改 `reports/audit/round-6/ops/` 下这一页的文件 | 是。仅 1 个新文件 `SUBPACKAGES-TOOLS-SECURITY-INDEX.json`；`git status --porcelain -- reports/audit/round-6/ops` 只列出这一个 `??` |
| 禁改 `scripts/qa/**`、`apps/**`、`tests/**`、根 `package.json`、`ci.yml` | 未改（policy 的 sha256 before=after 见 §7；`apps/` 下的 M/?? 是并行 API 车道的改动，不是我这条道）。反向变异用 `.zcode/tmp` 副本完成，比"改了再复原"更严格 |
| 禁止任何 git 写操作 | 未跑任何 `git add/commit/checkout/reset`；只用 `git status/rev-parse/log/diff --stat` 只读 |
| 不许跑 `npm run test:contracts` | 未跑 |
| 不做截图（`reports/**.png` 被忽略，重拍销毁 before 影像） | 未截任何图；判据台里也不预填影像文件名 |
| 判据是待执行的格子，不是已执行的结果；真值位留空并标注 | 16 条 expected 全部写「应当发生什么」，每条可从源码分支指回；§4 列出 10 处留空真值位；未造帧/造 sha/造 console 读数，`notAutomatableFrom` 用 `W5-20261101-manual` 明示人工盖章出处，不冒充 cellplan 派生 |
| `requiresReal`/`tier` 按实情标，不为绿而放宽 | 档位实测：`critical` 9 条、`normal` 6 条、`navigation` 1 条；`requiresReal=true` 10 条（SEC01/02/04/05/06/09/10/11/14/16）、`false` 6 条（SEC03/07/08/12/13/15）；`automatable:false` 7 条（SEC06/07/09/11/12/13/14——破坏性或原生 Modal）。未把任何一条真需后端/真微信授权/真设备号/真账号销毁的行折成可离线（SEC07 的 `false` 只因为它验的是 mock 本地持久化支，且同一行明写「非当前设备」对象本轮不存在、必须记 UNVERIFIED） |
| 红转成「缺帧/缺真环境」时如实保留 | 保留 3 条 GL 红 + 聚合新增 1 条，逐条给归因与所需机器（§5.1/§6/§8），未回头改判据、未删 case |
