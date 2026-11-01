# 第六轮收口账（2026-11-01）

依据：六份第六轮审查册（`round-6-audit-lane-{A-reframe,B-authz,C-domains,E-db,F-pages,G-deploy}.md`）
+ 七份修复车道交付记录（`round-6-fix-lane-{W1-backend,W1b-authz,W1c-erasure,W2-client,W2c-client-judges,W3-deploy,W4-qa-reds,W5-security-ops}.md`）。
本文件只写**回到盘上复量过的**结论与边界；细节按文件名点位回去读。

提交序列（本地，未推送）：`8d5aecb0` 修复 74 文件 → `57f39069` 审计册 → `1c27f5bf` 客户端/门禁判点
→ `2032954c` CS26 判据生产者 → `7947e356` ops 判据格与去字面常量 → 本次收口提交。

## 1. 终验读数（主控串行独占跑）

| 载具 | 读数 |
|---|---|
| `npm run test:contracts`（35 条，含新接进去的双端 `typecheck`） | `CONTRACTS_EXIT=0` |
| `cd apps/api && ./mvnw -o -B test` | `Tests run: 1905, Failures: 0, Errors: 0, Skipped: 11`、`BUILD SUCCESS`、`MVN_EXIT=0`（第五轮收口基线 1892/0/10；+13 例是 W1c 的排序/作用面判点，+1 skip 是 `liveSchemaAgreesWithStaticDerivation`，门控 `-Derasure.db.enabled=true`，待接真实栈 CI） |
| `npm run test:client` | `Test Files 159 passed (159)`、`CLIENT_EXIT=0` |
| `npm run test:admin` | `Tests 83 passed (83)`、`ADMIN_EXIT=0` |
| `D:/codex-tools/node-v22…/node.exe scripts/qa/run-qa-selftests.mjs` | `SELFTEST_RESULT=FAIL（1/64 个离线测试与门自检未过）`——本轮起点是 5/64；唯一仍红的文件是 `test-guest-landing.mjs`，内含 2 条保留断言（wallet 那一类「整页未声明游客断言」的命中面、以及 `booked 30 ≠ measured 28` 需真机腿），`test-guest-landing-writeguard.mjs` 已从 14 红转 PASS |
| `npm run test:i18n-orphan` | 孤儿 `1243/1243`、裸中文 `341/341`、zh 键 4218、`I18N_RESULT=PASS` |

对照第五轮收口基线：链 35 条（原 34，本轮 +1 是 `test:typecheck`）；后端 `1892 → 1905`（0 失败不变）；
qa 通道 `5/64 FAIL → 1/64 FAIL`。

## 2. 第六轮发现的分账

审查侧共 **36 条编号发现**（A 8 / B 9 / C 8 位含 2 阴性 1 作废 / E+E2 8 / F 7 / G 8），
其中修复侧本轮闭合 **24 条**、按证据保留为红 **4 条**、判不出（需外部条件）**8 条**。
逐条状态以各车道报告的「状态总表 / 账实核对表」为准——本轮有一条纪律：**接力车道的第一动作
是把账改成盘上真值**，因为盘上出现了三次「活干完了、表还写待办」或「表写了已闭合、代码只到一半」。

### 本轮真正新增的价值（不是复述前一轮）
1. **授权轴第一次被穷尽**：水平归属（IDOR）此前没有任何门覆盖。最重的一条是
   `GET /api/v1/location/nearby`——112 个 `@PathVariable` 端点里唯一「读一集合却不取主体」的，
   返回体带 `userId+昵称+校区+距离`，任意登录账号铺网格即可扫全国。库里没有授权列，
   所以落地形态是 `NearbyVisibilityPolicy` + `DenyAllNearbyPolicy`（恒空集）+ 一条门可见的交接，
   **不是**把功能悄悄删掉。
2. **管理端读面档位自相矛盾**被抓出：私信侧对非超管置 null，悄悄话侧把正文吐给 ADMIN/AUDITOR；
   `@Auditable` 78 处全在写方法、三个最敏感 GET 审计计数 0/0/0。现统一并补读维度审计 + 静态门。
3. **PREPARE 的天花板被钉清**：76 条清除语句实盘 `PREPARE` 全通 + 阳性对照（1054/1146/1064 都抓得到），
   但 `SET x = NULL` 撞 NOT NULL 列 **rc=0 通过** ⇒ 可执行性必须靠 `information_schema` 对账补；
   补完后 NOT NULL/FK/字符集零违例。第五轮 §5.1「本机判不出」在语法/对象/约束声明这一层作废。
4. **「先删子后删父」是假话**：清单顺序实测父前子后 6 组，整链今天不炸只因为 6 张父表里 5 张不删行。
   现在做成判点（`ErasureMigrationGraph` 从迁移链推 FK 图），不留成注释。
5. **穷尽门自己的形状盲区**：`post_tags` 163 行残留——它没有归属列 ⇒ 逃出按归属列派生的 F-11；
   而 `posts` 就地匿名不删行 ⇒ `ON DELETE CASCADE` 永不触发。补上「无归属列但经 FK 借归属」的
   传递闭包后，全库同类子表共 **4 张** 逐张点名（`post_tags`、`temp_chat_contact_exchange`、
   `temp_chat_message`、`promo_codes`〔运营资产，带 ≥20 字理由豁免〕）。
   教训一句话：**按一根轴派生的穷尽门，其覆盖度等于那根轴**。
6. **作用面归因机器可读**：78 项分「活表有数据 / 快照无数据但写点在 / 代码级死表」= 45/28/5，
   第 4 格为 0；5 张死表逐张裁定保留清单项并写明「表建于 V2026.05.x、链上无 DROP、零写点」的证据。
7. **从未跑过的聚合载具一接线就报存量红**：`run-qa-selftests` 64 个离线件里 5 条红 ⇒ 定性为
   3 条尺子坏（已代码闭合）+ 2 条台账/真环境（如实保留），通道从 `5/64` 收到 `2/64`。
8. **两处「判据钉硬编码常量」**被抓并拆成带出处的基线：`test-deny-tap` 跨两个语料目录共用字面
   1107（新建合法 manifest 就把守恒轴判红）、`test-guest-landing` 把「可核 11 / 不可核 0」两个数
   一起钉死（该文件自己就记过一次同形假红）。守的应该是「不可核必须 0、可核只许涨」。

### 客户端与业务域
- `isVipRaw` 全仓无人写 true ⇒ 正式包 `isVip` 恒假、VIP 免费放行分支不可达、**真会员被按非会员扣币**；
  现接账单真相源做三态，未确认时拒绝扣费而不是默认按非会员。
- 每日一问把 `checkedIn` 当唯一渲染依据 ⇒ 登出重登必落锁屏（这是上一批登出复位暴露出来的）；
  现 `onShow` 走 store 取状态。
- `useAbortOnHide` 零消费者 ⇒ 接到 3 个真有实害的页面并把 signal 接进出网请求。
- 隐私授权 10 页在用、原本仅 1 页有判点 ⇒ 动作层守卫对账门 + 拒授权用例。
- 页面级契约净账被纠正：74 页里字面引用 32（另有 5 页被动态拼路径读到），
  **业务判点空白 46 页 / 36,136 行 = 50.4%**；闸门无判点页面 **23 页**（含新补数的「隐私授权」一族）。

## 3. 我自己这一轮制造并收回的错（不许省）

1. **登出轨只做了一半**：子代理给 21 个 store 加了 `resetForLogout()`，但 `session.ts` 一行没接、
   登记表不存在、注释里承诺的「判点见 session.spec」而那个文件根本没被改。主控补完登记 + 接线 +
   穷尽对账门 + 5 条运行时红门。
2. **修 FINDING 9 时自己带进一个活错**：`amountText` 用了 `formatCentsAsYuan` 却没 import，
   151 个 spec 全绿照不出（那条分支没人走），是另一条车道的 `typecheck` 撞到的。
   ⇒ 根因是 `test:contracts` 里没有 typecheck，本轮已接进链。
3. **i18n 收字面量时插出同层重复键**：`storeErrors.vip` 被既有同名块整体覆盖 ⇒ `t()` 退回裸键名，
   而 `i18n.spec.ts` 113 例全绿——它判的是「运行时对象叶子路径唯一」，`Object.keys` 恒不重复 ⇒ **恒真判点**。
   新增 `i18n-duplicate-keys.spec.ts`（文本级 + 花括号深度 + 7 个阳性对照）；现存同层重复 0 对，基线空集。
4. **两处等价修复被旧判点假红拦住**：`PublicAuthWriteRateLimitTest` 钉注解字面文本 `#payload.phone`；
   CS26 钉字节距离。两种都改成行为/结构不变量，没有删任何判点。
5. **派单里的转述被车道纠正 4 处**（记录以免下轮照抄）：报告写的 47 条裸文案不可重跑；
   A2 写「本机无 MySQL」实为「真栈会写生产库 + 应用账号无建库权限」；C 写「盘上不存在 tz-ratchet 门」
   不成立（`package.json:33` 有键、在链、读数 19 处在 6 文件基线内）；主控说「解锁走稳定键 ⇒ 409
   双来源可达」不实（该端点无 `@Idempotent`，稳定键挂在 `/wallet/unlock|/deduct`）。

## 4. 边界清单（本轮判不出，逐条点名需要什么）

1. **真执行 / 影响行数 / `@Transactional` 真回滚**：需要 DBA 凭据或一个可建的影子库
   （应用账号 `campus` 只有 `campus_love.*`，`CREATE DATABASE` 报 1044；`.env` 无 root）。
   零写入路线已把语法/对象/FK 方向/可空性这一层做完，剩下的只有执行期。
2. **real profile 装配完整性**：CI 步骤早已在 `ci.yml`（`-Dreal.it.test=true`，主控核实），
   本机跑不完；`liveSchemaAgreesWithStaticDerivation` 新增 1 例 skip（`-Derasure.db.enabled=true`），
   需要接进真实栈 CI。
3. **AOF 里历史裸手机号键**：代码侧只保证从现在起是摘要；历史清理属运维（轮换密钥 / 重建 AOF 与备份）。
4. **对象存储物理删除**：`posts.images`/`comments.images` 是否全被 `media_asset` 覆盖仍未经实盘验证。
5. **多副本限流阈值不放大**：需两个 JVM + 真 Redis。
6. **textfile 目录落地的 5 项**：需一次真容器运行（W3b 已把静态可判的形状轴做完）。
7. **CI 首跑三大假设**：`mvn flyway:migrate` 的 flyway-mysql 只在项目依赖而插件块无 `dependencies`；
   runner 是否恒带 `mysql` CLI；Trivy HIGH/CRIT 与 cosign 推送闸。
8. **微信真机 / 构建腿 / 端到端**：本 session 全程未起 dev server、未跑构建、未上真机；
   所有跨账号/首屏类后果都是**源码分支推导**，不是屏幕上看到的。`booked 30 ≠ measured 28` 这条红
   等的就是「开发者工具 + 真档 measure 腿 + 可销毁专用账号」。

## 5. 未闭合的产品账（下一轮优先，按可闭合性排）

1. wallet 页那一类「整页未声明游客断言」的命中面（`test-guest-landing` 保留红之一）。
2. `temp_chat_media_holds` 同时逃归属列轴与 FK 借归属轴 ⇒ 需要第三根轴。
3. `originalPrice` 同名异单位（`products` 元 / `shop_items` 分）跨端改名，第五轮已挂账未动。
4. 充值保留键与 `@Idempotent` 键 TTL 4h 之间的终态判定。
5. 页面级契约 46 页空白的收敛节奏（先闸门类 23 页，再其余）。
6. 把 `run-qa-selftests` / `prove-gates-can-fail` 升进链：本轮刻意未升——前者现在仍有 2 条真红，
   后者单发数十分钟且会临时改坏盘上文件；两者已作为「有理由的本地载具」在 bash 与 DSL 登记。
7. `verify-i18n-orphan.mjs` 同样看不见被运行时合并的重复键；这一面现由客户端
   `i18n-duplicate-keys.spec.ts` 承住，门侧要不要补同一根轴待定。
8. 登出复位后 `answerHasMore` 的冷启动值（`true`）是否符合产品预期——判点已钉住现状，值本身待裁。
