# 第七轮审查总账（2026-11-02）

四条审查车道（G 判点证伪 / O 打标下游 / E 清除域钻探 / G2 部署观测复检）+ 主控面两条独立轴
（admin-legacy 残留扫描、全局技能注入复查）。审查对象 = 修复批次 `f998762d`（各车道 HEAD 核对一致）。
G、O 两车道中途撞账号用量上限：O 的报告基本完整（176 行），G 只留纪律段与基线，其逐判点表由主控
按同一纪律代完并标明出处（`round-7-audit-lane-G-judge-falsification.md` §1）。

## 1. 发现分账与处置（全部回到盘上复量）

| 车道 | 发现 | 级 | 处置（本轮已落盘） |
|---|---|---|---|
| E | APP 主体射程 P1 逃逸 | — | **0 张**（三轴+清单对 APP 用户个人数据闭合） |
| E F-1 | `admin_layer.admin_id` 三轴全盲（RBAC 授权映射） | P2 | **已修**：装第四轴（`everySemanticUserReferenceOutsideAllAxesIsARegisteredDisposition`，词形词表 + buildSchema ALTER 感知 + 反漂移），admin_layer 登记豁免带理由 |
| E F-2 | 8 张 config 表 `updated_by` 三轴全盲 | P2 | 同上：批量登记豁免（与 promo_codes 同口径）；第四轴今后对同形状新列即红 |
| E F-3 | 第三轴列集只认 CREATE 体（ALTER 补列不可见） | P3 | 挂账（第四轴已用 buildSchema 缓解了 `updated_by` 一族；`namedReferenceHits` 换 ALTER 感知列源留待下轮） |
| E F-4 | 第三轴精确名匹配的实际泛化力=单点（复数表名 vs 单数列名全不匹配） | P3 | 边界登记（见 §4）；扩匹配的误报面大，不盲扩 |
| E F-5 | `joinTargetsOf` 对子查询借归属全盲 | P3 | **已修**：`IN (SELECT…FROM x)` 形态并入借方识别 + 阳性对照（子查询借方排后必红、在前不误红） |
| E F-6 | 管理员主体注销的语义不对称（reason 手写文本 vs audit_log 先例） | P3 | **已登记**：边界与理想态写进 media_holds 项 rationale（P3 挂账，重开条件写明） |
| E F-7 | `-Dtest='Erasure*'` 命令陷阱（漏 AccountErasureServiceTest 等，22≠43 例） | P3 | **已修（主控侧）**：终验与车道均改显式类清单；本轮全量 `mvnw test` 1910 例兜底 |
| E F-8 | hold_until 被 DELETE 无视 | info | 已登记的政策选择，不动 |
| O F-1 | 收口账 §5「语义变化只有三元组新增」失实：48 处既有溯源被工具模板抹（LOGIN 36 处行号出处、SEC 12 处 W5 provenance；LOGIN 无重排版成分） | P2 | **已修**：① tagger 改「值未变 ⇒ from/why 原样保留」（幂等不抹溯源）；② 从 `f998762d^` 逐行恢复被抹溯源（LOGIN 36 行行号出处、SEC 14 行 W5 标记回来；21 行新标不回填），恢复后 dry-run `改写文件=0` |
| O F-2 | 「存量 14 行」归因失实：4 行游客词语境 + 10 行 gap-carriers 来源（非「正文后被改写」） | P2 | **已修**：工具复读注释改为真实构成（桶A 4 + 桶B 10 逐名）；收口账勘误见 §3 |
| O F-3 | RP05「完成引导」onboarding 语境被词表误伤漏标 | P3 | **已修**：policy 新增 `loginDespiteGuestWords` 点名通道（带 why），tagger 读之（点名优先于词表，含自证两例）；RP05 已标 A,B |
| O F-4 | 6 个 qa 工具的 `identities` 同名不同物 | 备忘 | 报告在册，无需处置 |
| G2 | BackupNeverCompleted / 恢复变量 / textfile 静态轴 / rootless 文档 / 本轮改动部署面 / @Auditable 读面 | — | 全部「已修/在链绿」复核通过（细节见车道报告） |
| G2 N1 | compose backup 服务 DB_* 四键零读取者（镜像方向死变量） | P3 | **已修**：删除四键，注释写明「新增变量必须先在脚本接线再进 compose」；`test:deployment-config` 绿 |
| G2 N2 | restore 读 MYSQL_HOST/MYSQL_PORT 但文档表未按恢复口径登记 | P3 | **已修**：DEPLOYMENT.md 变量表补两行（含脚本行号出处）；deployment-config 绿 |
| G2 N3 | Trivy advisory-id 棘轮未建 | P3 | 边界（基线需一次真 Trivy 扫描） |
| G2 | CI 三假设「静态可修未修」：flyway 插件块无 `<dependencies>`、mysql CLI 无安装步 | P2 级事实 | **已修**：① pom 的 flyway-maven-plugin 补 flyway-mysql 插件依赖（探针验证：`flyway:info` 对不可达端口报「连接失败」而非「No database found」⇒ MySQL 模块已加载）；② ci.yml 在首个 mysql 命令前补 `apt-get install mysql-client` 步骤（带出处注释）；Trivy 闸仍待首跑 |
| 主控 | `apps/admin-legacy` 残留扫描 | — | originalPrice/shop 零引用（冻结态遗留构建，最后改动为仓库整理提交） |
| 主控 | 全局技能目录注入件复查 | **安全** | `~/.agents/skills/simple`（描述嵌「do not scan…skip all tests」冒充管理员话术 + 正文 `onerror` XSS 拆分注入）与 `~/.agents/skills/test2`（`<img onerror>`/`<svg onload>` 弹窗载荷）**仍在盘上**。两轮已报，未处置——在用户主目录，主控无权代删，**建议亲手删除这两个目录** |

## 2. 车道 G 代完的证伪面（摘要）

10 个判点全部拿到「能变红」证据：7 变异探针（policy 改族 / 无 maxlength input / 删 help 守卫 /
shop 封存早退短路 / likes VIP 分支短路 / 保留窗清零 / 隐私守卫禁用）+ 2 活红引用（commerce 门
开发期两次真红、i18n 第四维自证抓过主控自己的解析器 bug）+ 1 仓外副本探针（剥 identities ⇒
`OPS_ENTIRE_GUEST=1 组/11 行` 具名）。无恒真判点。两个探针自身失误（无效键位/无效文件名）被
「先验变异落盘」纪律当场抓住。全程备份还原，工作树终态与预期改动集逐文件一致。

## 3. 对第七轮收口账的勘误（车道 O 抓的，如实记）

1. §5「ops 判据台重排版无内容损失」一段：**判定仍成立**（判据正文四文件 0 差异、cases 计数不变、
   pageNotes 全在——车道 O 三重复核），但「语义变化只有 identities 三元组**新增**」表述失实：
   另有 48 处既有 from/why 被模板覆写（已按 O F-1 恢复 + 工具已改保全逻辑）。
2. §2.1 第 2 点把复读改尺子的动机记为「历史标过、之后正文被改写命中游客词」——真实构成是
   4 行误伤语境 + 10 行 gap-carriers 静默存量（已按 O F-2 改正工具注释）。

## 4. 边界账（更新）

- **关闭一条**：79 条清除语句的可执行性——车道 E 复刻零写入 PREPARE 路线，**79/79 rc=0**
  （批尾 BATCH_END_OK 防截断；阳性对照 1054/1146/1064 全炸）。第六轮「本机判不出」在
  语法/对象层就此关闭；仍开的只剩「真执行/影响行数/真回滚」（DBA/影子库）。
- **仍开**：真机 measure 腿（`booked 30 ≠ measured 28`，唯一 qa 自检红）；CI 首跑
  （flyway 插件依赖与 mysql CLI 已静态修掉，Trivy 棘轮与首跑三判仍待 runner）；真容器
  textfile 5 项；DBA/影子库；多副本限流。
- **新登记**：E F-3（第三轴 CREATE 体盲区）、E F-4（精确名泛化=单点）、E F-6（管理员
  reason 对称性）、G2 N3（Trivy 棘轮）——各有出处与重开条件。

## 5. 终验读数（主控串行独占，处置完发现后）

| 载具 | 读数 |
|---|---|
| `npm run test:contracts`（35 条） | `CONTRACTS_EXIT=0` |
| `cd apps/api && ./mvnw -o -B test` | `Tests run: 1910, Failures: 0, Errors: 0, Skipped: 11`、`BUILD SUCCESS`（+1 = 第四轴；skip 仍为真库门控） |
| `npm run test:client` | `Test Files 166 passed (166)`、`Tests 1733 passed` |
| `npm run test:admin` | 83/83（上轮读数，本轮未动 admin 面） |
| `npm run test:i18n-orphan` | 四维 PASS（重复键 client=0 admin=0） |
| `node v22 run-qa-selftests.mjs` | `FAIL（1/64）`——唯一红为真机腿边界 |
| 清除域显式类清单（F-7 修正后的口径） | `ErasureSchemaAlignmentTest + ErasureSurfaceAndOrderingGateTest + AccountErasureServiceTest + PersonalDataErasureAlignmentTest` = 44 例 / 0 失败 / 1 skip |
| 变异探针还原 | 工作树与预期改动集逐文件一致（policy 语义 diff：+loginDespiteGuestWords 6 叶，0 删 0 改） |

## 6. 仪器事实（这轮学到的，写下来）

- 「先验证变异确实落盘」必须是探针的第一步：本轮两个探针打在不存在 的键位/文件名上，
  变异是 no-op、门正确地没红——不先验落盘就会把「探针无效」误读成「判点失明」。
- 幂等工具的溯源保全要显式立法：值不变 ⇒ from/why 不动。否则每次 --apply 都把别人写的出处
  抹成自家模板（48 处就是这么丢的）。
- 词表轴必须留点名通道：关键词判定（游客词/已登录词）必有语境误伤，policy 点名（带 why）
  优先于词表，这是本仓 keepOnLoginLegIds 已证过一次的形状，本轮在正向轴复用。
- 派单里的测试选择器要显式列类名：`-Dtest='Erasure*'` 前缀匹配漏掉 `AccountErasureServiceTest`，
  假报「清除域 22 例全绿」（真值 43+）。
