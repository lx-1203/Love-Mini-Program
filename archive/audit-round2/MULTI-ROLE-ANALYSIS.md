# 恋爱小程序多角色深度研究分析报告(MULTI-ROLE ANALYSIS)

> 版本：v1.0 | 撰写日期：2026-08-06
> 分析角色：用户 / 投资人 / 程序员 / 数据模拟 / 商业化决策委员会(共 5 视角)
> 证据依据：`R2-COMMERCIAL-AUDIT-REPORT.md`、`BUG-AUDIT-FULL-REPORT.md`、`CONSOLIDATED-ISSUE-LIST-1000+.md`、`ADMIN-API-REAUDIT-400+.md`、`docs/REAUDIT-INFRA-150PLUS.md`、`docs/DR/DRP.md`、`docs/CI-CD.md`、`DEPLOYMENT.md`、`CHANGELOG.md`、`README.md`、`docs/performance-testing-guide.md`、`docs/wechat-submission-materials-checklist.md` 及项目结构实证

---

## 0. 项目快照(分析基线)

| 项 | 现状 | 证据 |
|----|------|------|
| 架构 | monorepo：`apps/client`(uni-app + Vue3 + TS + Pinia，mp-weixin/H5 双端)、`apps/api`(Spring Boot 3 + Java 17 + MySQL 8 + Redis 7 + Flyway + STOMP WebSocket)、`apps/admin`(Vue3 + Vite) | `README.md` 技术栈与目录结构 |
| 审计史 | 50+53 项(2026-05-29) → 1335 项(2026-07-25) → 1340 项(2026-07-28) → **1773 项累计(2026-08-05，本轮修复约 190 项)** | `BUG-AUDIT-FULL-REPORT.md`、`CONSOLIDATED-ISSUE-LIST-1000+.md`、`R2-COMMERCIAL-AUDIT-REPORT.md` |
| 验证基线 | api `./mvnw test` **876 tests 0 failures**；client/admin `vue-tsc --noEmit` 0 错误 | `R2-COMMERCIAL-AUDIT-REPORT.md` 第六章 |
| 核心业务 | 匹配(滑动/双向 like) → 临时匿名聊天 → 联系交换；圈子(帖子/活动/话题/举报)；校园认证；签到/成长；VIP/红包/优惠码/钱包 | `README.md`、`database/flyway/sql/` 70+ 迁移脚本 |
| 保留项(线下) | ICP 备案、服务器/业务域名、正式 appid(wxc67cd233d72388d0 待确认)、微信支付商户号、隐私政策法务审核等 8 项 | `R2-COMMERCIAL-AUDIT-REPORT.md` 第五章、`docs/wechat-submission-materials-checklist.md` |

---

## 1. 用户视角：从注册到付费的全流程体验分析

### 1.1 注册与登录链路

微信一键登录已是真实链路：客户端 `apps/client/src/services/auth.ts` 的 `loginWithWechat()` 经 `wx.login()` 获取 code(15s 超时 + state CSRF 防护)，后端 `/api/v1/auth/wechat` 调微信 `code2session`(`WechatAuthController` + `RealAuthService` + `WeChatClient`)，`open_id` 唯一约束(`database/flyway/sql/V2026.07.26.0002__add_open_id_unique_constraint.sql`)防重复账号，失败抛出明确的 `INVALID_CODE/WECHAT_API_ERROR/USER_DISABLED/CLIENT_ERROR` 四类错误(见 `CHANGELOG.md` [1.0.0]-P0)。**评价：这条链路已达工业级水准**，未登录不再回退 mock 假账号(`stores/services` 修复项)，用户不会遇到"登录了却是别人的号"的荒诞事故。

但存在两个首启体验隐患：其一，登录失败时无"游客浏览"兜底入口，微信 API 抖动即流失新用户——建议登录页增加只读浏览圈子入口；其二，隐私授权走 `wx.onNeedPrivacyAuthorization` 三选项流程(`apps/client/src/App.vue` onLaunch，`manifest.json` 开启 `__usePrivacyCheck__`，9 处隐私接口调用点加 `ensurePrivacyAuthorized()`)，这是微信 2023 年后的强制合规项，**做对了反而成为信任加分点**——用户能感知"这个 App 尊重我的隐私"。

### 1.2 核心链路可用性评估

**匹配链路**(discover 滑动 → heart_signals 双向 like → 解锁临时匿名聊天 → 联系交换)：代码完整，且经 R2 系统性权限修复(临时聊天 `resolveSessionForCurrentUser` + `requireParticipant` 参与者校验、联系交换状态机 actor 服务端推导，见 `R2-COMMERCIAL-AUDIT-REPORT.md` 3.1 节)。从用户视角，匿名聊天设计(临时会话 + 联系交换)是差异化亮点：降低"被拒绝"的社交压力，符合大学生轻社交心理。**但匹配效率取决于候选池密度**——注册 <5000 人时会频繁滑空，这是产品级冷启动风险而非代码缺陷，需要种子用户运营与"空态引导页"兜底。

**聊天链路**：`messagesStore` 统一数据源、发送/撤回(仅本人可撤回，服务端判定 sender)、语音上传(`uni.uploadFile`)、WebSocket 重连/握手超时/回调泄漏修复(R2 3.2 节)。用户可感知的缺口是**离线推送**：`push_system` 表与 `WeChatPushService` 存在，但微信订阅消息模板需线下配置——推送未配置前，用户离开 App 后收不到新匹配/新消息提醒，直接伤害次日留存。

**校园认证**：`campus_certifications` 表 + `CampusCertificationServiceTest` 覆盖。建议认证通过后展示"已认证"徽章并将认证用户优先排入推荐流——"真实大学生"是校园恋爱定位的信任底座，认证率应作为冷启动期第一北极星指标。

**圈子(Village)**：帖子/活动/话题/举报完整、分页已接真实请求(village `onLoadMore`)、敏感词过滤已加。**但发帖图片上传链路在 R2 中标注"缺口"(P1 项)**——用户发图文帖时图片可能传不上去，这是用户直接感知的硬伤，上线前必须修复(见第 5 章清单 A-1)。

**签到/成长体系**：签到月历批量查询已优化、补签迁移存在，是有效的留存钩子，对大学生(打卡心理)尤其有效。

### 1.3 隐私与安全信任

- 上传目录已鉴权(`MediaAccessController` 代理端点 + JWT + Path Traversal 防护，`/uploads/**` 从 `permitAll` 改为 `denyAll`)，用户照片不会被裸 URL 泄露——**隐私信任的关键闭环**。
- JWT jti 黑名单(Redis 键 `jwt:blacklist:{jti}`，故障降级本地内存)、密码 BCrypt、日志脱敏(`SensitiveDataMaskerTest`)、`User.password`/`UserSession.sessionToken` `@JsonIgnore`。
- 风险点：恋爱交友是安全敏感品类，"杀猪盘/骚扰/照片外泄"任一事件都会导致信任崩塌。代码侧举报 → 敏感词 → Admin 处置链路已完整，但**运营响应时效是线下能力**——需承诺 24h 处置 SLO 并写入用户可见的隐私承诺。

### 1.4 付费意愿障碍

VIP(mock 支付已标注、真实支付未接入)、红包(钱包 + `vip_red_packets`，幂等已修)、优惠码(`promo_codes`)。用户视角的三大障碍：

1. **价值感知**：大学生线下认识异性的成本低，"解锁匹配"型付费天然缺乏吸引力。VIP 必须给"真价值"(每日更多喜欢次数/查看谁喜欢了我/优先展示/认证优先)，而非负向激励式付费墙。
2. **支付信任**：真实支付未接入前，付费入口应整体隐藏或"敬请期待"，避免"点击购买无反应"的体验事故(R2 将 mock 支付标注化是对的做法)。
3. **价格与合规**：参考竞品(青藤之恋 VIP 约 20-30 元/月)，校园产品建议 9.9-19.9 元/月或按学期打包；**现金红包面向学生群体有"诱导打赏"监管敏感性，建议首版只做"送花/送道具"类虚拟礼物**，现金红包延后。

### 1.5 用户视角小结

链路完整度打分(0-10)：登录 9.5、匹配 9、聊天 9、圈子 8(图片上传缺口)、认证 8.5、付费 3(未接真实支付)。最大用户侧风险排序：冷启动匹配空转 > 离线推送未配置 > 圈子图片上传 > 付费入口体验。**产品信任资产已建立(真实登录/隐私合规/权限闭环)，体验硬伤集中在 2 个 P0 代码项与 1 个运营项。**

---

## 2. 投资人视角：商业模式、市场与估值

### 2.1 商业模式评估

| 模式 | 代码就绪度 | 收入就绪度 | 评估 |
|------|-----------|-----------|------|
| VIP 会员(订阅+自动续费) | 高：扣款后真实延长 `periodEnd +30` 天、支付回调开通 VIP、幂等修复(见 `R2-COMMERCIAL-AUDIT-REPORT.md` 3.1-5) | **低：支付商户号未接入(保留项 5)** | 收入引擎已点火前的最后一公里；`vip_bills.transaction_id` 唯一约束待加 |
| 红包/虚拟礼物 | 高：钱包幂等 `noRollbackFor`、红包幂等键去随机数、`wallet_tables` 迁移 | 低：依赖支付资质 + 监管风险 | 建议首版改为虚拟礼物，规避学生"诱导打赏"合规风险 |
| 优惠码 | 高：`promo_codes` 表 + 幂等约束调整迁移 | 中：无需支付即可做拉新/促活 | 成本最低，可最先上线作为增长杠杆 |
| 广告位 | **无广告系统实现** | 低 | 校园广告主(驾校/考研机构/本地商家)有付费意愿，但需 DAU 1 万+ 才有议价权，属远期收入 |

**核心判断：商业模式结构完整(订阅 + 虚拟礼物 + 优惠码 + 远期广告)，但全部收入引擎都卡在"支付资质"这一线下环节。** 这与 R2 报告"资金三红线已解除、商户接入为保留项"的结论一致。

### 2.2 市场规模与增长路径

- **TAM**：中国高等教育在学总规模约 4700 万人(教育部公开数据)，恋爱交友适龄人群按 30% 渗透假设 ≈ 1400 万潜在用户。
- **SAM**：单校起量模型——从 1 所万人大学开始，目标注册渗透 10% = 1000 人；复制到 50 所大学 = 5 万注册。
- **增长路径**：校园地推/社团合作/表白墙引流(获客成本可控制在 ¥1-3/注册) → 匹配成功率口碑传播(核心 KPI) → 区域复制。冷启动 6 个月目标：10 校 × 5000 注册 = 5 万注册、DAU 8000-10000。
- **竞品格局**：青藤之恋(高学历实名)、Soul(匿名社交)、校园表白墙(流量大未产品化)。本项目差异化 = 校园认证 + 匿名破冰 + 圈子社区，定位"校园内靠谱恋爱"，避开 Soul 的泛化匿名与青藤之恋的重实名门槛。

### 2.3 技术债务对估值的影响

- 审计轨迹 1335 → 1340 → 1773 条，本轮修复约 190 项，api 876 单测全绿、双端 typecheck 零错误。**技术债已从"阻断估值"降为"正常工程损耗"**——尽调时代码质量不再是减分项。
- 但 6 条 CRITICAL 中 4 条属法律/外部依赖类(FIN-00004/05/06：ICP 备案、提审材料、域名配置，见 `CONSOLIDATED-ISSUE-LIST-1000+.md`)，**这些是"卡估值"项**：无 ICP 则小程序无法上线，无支付资质则商业模式无法验证。
- 技术栈(Spring Boot + Vue3 + MySQL + Redis + Docker Compose)为主流成熟栈，招聘成本低、维护确定性高，对估值是正资产。
- 遗留技术债(P2/P3 为主，见第 3 章清单)预计 1.5-2 人月可清，对估值影响 <10%。

### 2.4 商业化就绪度打分(0-100)

| 维度 | 权重 | 得分 | 加权 | 依据 |
|------|------|------|------|------|
| 功能完整性 | 25% | 72 | 18.0 | 四链路完整；扣分：图片上传缺口、付费 UI 未上线 |
| 安全(资金/隐私/权限) | 20% | 80 | 16.0 | R2 P0 全部闭环 + 渗透/并发测试 |
| 性能与容量 | 15% | 70 | 10.5 | SLO 基准通过；缺真实压测与归档落地 |
| 合规(备案/资质/法务) | 25% | 35 | 8.75 | 全部待线下(见保留项) |
| 运维(监控/备份/DR) | 15% | 75 | 11.25 | DRP/CI 完整；生产演练未做 |
| **合计** | 100% | — | **64.5/100** | 代码侧约 7.5 分，合规侧约 3 分 |

**结论：64.5 分 = "技术就绪、合规未就绪"。** 与 R2 报告"修复后约 7/10"的技术口径一致——代码侧可打 7 分，全部扣分集中在线下材料。

### 2.5 主要风险

1. **合规风险(HIGH)**：ICP/支付商户/法务未落地 → 上线时间不可控；恋爱品类在微信审核通过率偏低，需按 `docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md` 逐项准备。
2. **冷启动风险(HIGH)**：匹配类产品冷启动死亡率高，需种子用户运营计划与空态设计。
3. **付费意愿风险(MEDIUM)**：大学生 ARPU 低，VIP 转化率假设(2-5%)需灰度验证，首版应免支付验证留存。
4. **声誉风险(MEDIUM)**：骚扰/诈骗安全事件公关成本极高，需运营 24h 处置 SLO。
5. **微信生态依赖(MEDIUM)**：登录/推送/支付全部依赖微信，政策变动即受损，H5 端是天然备份通道。

---

## 3. 程序员视角：架构、质量与技术债

### 3.1 架构合理性

- **monorepo 选择正确**：pnpm workspace + Maven 独立，`apps/client`/`apps/api`/`apps/admin` 三端隔离，共享根 `package.json` 脚本与 CI。三端规模下 monorepo 优于多仓库(统一门禁、原子提交)。
- **模块划分**：api 按业务域分包 30+ 包(auth/match/chat/village/vip/wallet/profile/campus/growth/admin/…)，符合 Spring 惯例；client 按 pages/components/stores/services/config/constants 分层，职责清晰。client 已有分包策略(`subpackages/`)，小程序包体积控制意识到位。
- **契约管理**：`docs/API-CONTRACT.md` 覆盖 50 个 Controller/200+ 端点，配套 `docs/OPENAPI-ANNOTATION-GUIDE.md`，前后端契约合格。
- **工程纪律亮点**(同类项目前 20%)：DTO 化(无 Entity 直接序列化)、Repository Optional 化、审计注解 `@CreatedDate/@LastModifiedDate`、幂等拦截器(`IdempotentInterceptorTest`)、限流(`ratelimit` 包)、敏感词过滤、统一 `ApiResponse`、`TraceIdFilter` 全链路追踪、Resilience 测试(`ResilienceTest`)。
- **轻微漂移**：DRP/部署图中出现的 RabbitMQ/Elasticsearch 属"预留未启用"，文档需明确标注预留状态，避免误导排障。

### 3.2 技术选型评估

| 选型 | 评价 |
|------|------|
| Spring Boot 3 + Java 17 | ✅ 主流 LTS，生态成熟 |
| MySQL 8 + Flyway(70+ 迁移) | ⚠️ 规范；重复版本号(V2026.07.25.0001~0004)已修复但新环境需验证 history 干净(REAUDIT DB-001~004) |
| Redis 7 | ✅ 缓存/限流/JWT 黑名单/在线状态，多用途合理 |
| STOMP WebSocket | ⚠️ 标准方案；**跨实例消息路由(Redis pub/sub)未实现**，水平扩展受限 |
| uni-app + Vue3 + TS | ✅ 双端编译主流方案；`#ifdef H5` 条件编译增加心智负担，可接受 |
| Prometheus/Grafana/Alertmanager | ✅ 完整；告警地址曾配错已修(infra-review) |
| GitHub Actions + Trivy + cosign + gitleaks + pnpm audit | ✅ 供应链与镜像安全门禁齐全(`.github/workflows/ci.yml`) |

### 3.3 代码质量

- **测试**：api 876 单测(约 100 个测试类，覆盖 auth/match/chat/village/vip/wallet/security/performance/concurrency，含 `P2SecurityPenetrationTest`、`P2ConcurrencyTest`、`WalletServiceConcurrencyTest`、`NPlusOneTest`、`FlywayMigrationRepeatableTest`)；client vitest 20+ 文件(i18n/websocket/stores/guards/smoke)。**覆盖是亮点**。两个缺口：① client vitest 需 Node 18-20 环境，CI 全量执行需确认(R2 保留项 7)；② Repository 层集成测试不足(未见 Testcontainers 痕迹)，Flyway 迁移与实体映射的漂移主要靠 `FlywayMigrationRepeatableTest` 兜底。
- **重复代码**：历史审计中大量重复实现(withTimeout 双份、举报 API 双份、admin 双分页 UI)，R2 已收敛(`R2-COMMERCIAL-AUDIT-REPORT.md` 3.4-17)。剩余需靠 review 门禁预防，建议 CI 增加重复率检查。
- **巨型文件**：`AutoRenewService.java`(319 行，FIN-00003)、历史 `app.wxss`(37K 行，已修复)。建议引入 Sonar 类行数阈值(>400 行)作为 CI 门禁。
- **可维护性**：Conventional Commits + Git Flow 简化版(`docs/CI-CD.md`) + 10 个 ADR + Storybook 63 组件文档 + `docs/TROUBLESHOOTING.md`/`docs/ADMIN-GUIDE.md`——文档体系完整，onboarding 成本低。

### 3.4 技术债清单与偿还计划(合计约 30-45 人日)

| # | 债项 | 级别 | 工作量 | 优先级 | 对应证据 |
|---|------|------|--------|--------|----------|
| 1 | 图片上传链路真实化(client→存储→展示) | P0 | 3-5 人日 | 上线前 | R2 3.2 节 |
| 2 | `vip_bills.transaction_id` 唯一约束 + 支付回调幂等回归 | P0 | 2-4 人日 | 上线前 | R2 第七节-4 |
| 3 | client vitest 全量进 CI(Node 18-20) | P1 | 1-2 人日 | 高 | R2 保留项 7 |
| 4 | 微信订阅消息模板配置 + 服务端推送对接 | P1 | 2-3 人日 | 高 | `push_system` 表 |
| 5 | `@Scheduled` 分布式锁(多实例防重) | P1 | 1-2 人日 | 中 | FIN-00021 |
| 6 | Repository 集成测试(Testcontainers) | P2 | 5-8 人日 | 中 | — |
| 7 | 巨型类拆分 + Sonar 复杂度/行数门禁 | P2 | 3-5 人日 | 中 | FIN-00003 |
| 8 | WebSocket 多实例路由(Redis pub/sub) | P2 | 5-10 人日 | 中(DAU>5k 前) | 3.2 节 |
| 9 | 流水表归档/分区策略(messages/visitors/notifications) | P2 | 3-5 人日 | 中(半年内) | 第 4 章容量 |
| 10 | ENUM 残余回归确认(`enum_to_varchar_check` 迁移后) | P3 | 1 人日 | 低 | REAUDIT DB-005~014 |

**程序员视角结论：架构与选型无硬伤，代码质量达到可发布线，技术债可控且已列表化。最大架构级隐患是 WebSocket 水平扩展路径缺失——但按第 4 章推演，DAU 1 万内完全无感，属于"按节奏偿还"型债务而非"必须立即还"型。**

---

## 4. 数据模拟视角：三档 DAU 负载、容量与成本推演

### 4.1 假设模型(全部显式声明)

- 注册用户 ≈ DAU × 6(校园产品 DAU/注册 ≈ 1:6，含流失沉淀)
- 人均日行为：日均打开 4-5 次，每次产生 6-8 个 HTTP 请求(首页 dashboard、推荐流、匹配卡片、个人页、消息列表、圈子浏览)，日均 HTTP ≈ 35 个；30% 日活用户参与聊天，人均 10 条消息/日(WebSocket)
- 活跃窗口 12 小时(08:00-23:00)，高峰系数 3×(晚间 20:00-23:00)
- 缓存命中率 85%(推荐/首页/资料已缓存)

### 4.2 接口 QPS 推演

| 指标 | DAU 1000 | DAU 5000 | DAU 10000 |
|------|----------|----------|-----------|
| 日 HTTP 请求 | 3.5 万 | 17.5 万 | 35 万 |
| 平均 QPS(12h 窗口) | 0.8 | 4.1 | 8.1 |
| 高峰 QPS(×3) | 2.4 | 12.2 | 24.3 |
| 突发 QPS(活动 ×5 裕量) | 12 | 61 | 122 |
| 日聊天消息 | 0.3 万 | 1.5 万 | 3 万 |
| 消息峰值(条/秒) | 0.7 | 3.5 | 7 |
| 峰值在线 WebSocket 连接(20%) | 200 | 1000 | 2000 |

**结论：单实例 Spring Boot(2C4G)可承载 500-1500 QPS 的 CRUD 负载，三档 DAU 的高峰 HTTP(24 QPS)与消息(7 msg/s)距容量上限有两个数量级——后端计算负载不是瓶颈，瓶颈在数据增长与连接管理。** 与 `P2PerformanceBenchmark` 的 SLO(推荐接口 <500ms 含 5x 裕量、聊天历史 10 并发 <200ms)相互印证。

### 4.3 DB 连接与缓存

- HikariCP 池 10 × 2 实例 = 20 连接；峰值 24 QPS × 平均 80ms 事务 ≈ 2-4 个并发事务，占用 <20% 连接池；MySQL `max_connections` 默认 151，**充裕**。
- DB 实际读 QPS = 峰值 × (1-85% 命中) ≈ 3.6 QPS @ DAU 10000，**微不足道**。
- Redis 内存估算：键空间(推荐缓存/在线状态/黑名单/限流)@ DAU 10000 ≈ 500MB 以内，默认 1GB 实例够用。

### 4.4 数据库容量估算(DAU 10000 × 12 个月)

| 表 | 年行数(计算过程) | 单行 | 年存储 |
|----|------------------|------|--------|
| users | 6 万(注册=DAU×6) | 2KB | 120MB |
| temp_chat_messages | 1100 万(3000 日活聊天 × 10 条 × 365) | 500B | 5.5GB |
| profile_visitors/visitors | 3650 万(1 万 DAU × 10 次/日 × 365) | 150B | 5.5GB ⚠️ |
| notifications | 1800 万(1 万 × 5 条/日 × 365) | 200B | 3.6GB ⚠️ |
| heart_signals/likes | 365 万(2000 日活 × 5 个 × 365) | 200B | 730MB |
| posts | 3.65 万(1% 日活发帖 × 365) | 2KB | 73MB |
| comments | 18 万(5× 帖子) | 300B | 55MB |
| check_ins | 110 万(3000 日活 × 365) | 100B | 110MB |
| 账单/钱包/红包/优惠码/审核日志等 | — | — | ~1.5GB |
| **合计(含索引膨胀 1.5×)** | — | — | **≈ 25GB** |

**关键发现：messages + visitors + notifications 三张流水表占 14.6GB(58%)**——必须设计保留策略(visitors 90 天、notifications 180 天、消息按学期归档)，否则 2 年磁盘翻倍、备份时间与恢复时间(RPO/RTO，见 `docs/DR/DRP.md`)同步恶化。

图片存储：本地 `uploads/{userId}/{yyyyMM}/` 分片，1% 日活 × 1 张 500KB ≈ 100 张/日 ≈ **18GB/年**——上线即应规划 OSS + CDN，本地磁盘只做兜底(与 DEPLOYMENT.md "大型 >10k DAU 必须启用对象存储"一致)。

### 4.5 成本估算(人民币/月，国内主流云厂商标准配置)

| 档位 | 服务器 | 带宽/CDN | 存储/备份 | 合计 |
|------|--------|----------|-----------|------|
| DAU 1000 | 2C4G ×1 ≈ ¥250 | 5Mbps ≈ ¥100 | 40GB SSD ≈ ¥50 | **≈ ¥400** |
| DAU 5000 | 4C8G ×2 ≈ ¥1200 | 10Mbps + CDN ≈ ¥300 | 100GB + 异地备份 ≈ ¥200 | **≈ ¥1700** |
| DAU 10000 | 8C16G ×2 + MySQL/Redis 独立 ≈ ¥3000 | 20Mbps + CDN ≈ ¥800 | 300GB + OSS ≈ ¥500 | **≈ ¥4300** |

(不含人力；与 DEPLOYMENT.md 三档资源规格：小型 2C4G / 中型 4C8G / 大型 8C16G 对齐)

### 4.6 性能瓶颈点与扩容路径

瓶颈排序：
1. **WebSocket 单实例连接上限**(约 1-2 万连接/实例)→ DAU 2 万+ 必须多实例 + Redis pub/sub 路由(当前未实现，见 3.4-8)
2. **流水表膨胀**(58% 存储)→ 分区 + 归档，半年内落地
3. **本地存储 IO**(图片/视频，`video_calls` 表暗示视频功能)→ DAU 5000+ 转 OSS
4. **推荐接口计算复杂度**(多策略排序)→ 已缓存，后续异步预计算

分阶段扩容路径：
- **阶段 1(DAU <5000)**：单机 Compose(现状即可)，只需完成图片上传修复 + 归档策略 + vitest CI
- **阶段 2(DAU 5k-30k)**：API 扩 2-3 实例(Nginx 负载均衡 + Redis 会话)、MySQL 主从、Redis 独立节点、OSS 上线
- **阶段 3(DAU >30k)**：读写分离 + 消息表按月分区 + MQ 异步化 + WebSocket 网关层，需专职 SRE

---

## 5. 商业化就绪度结论

### 5.1 综合打分表

| 维度 | 子项 | 得分(0-10) | 依据 |
|------|------|-----------|------|
| 功能 | 核心四链路(匹配/聊天/认证/圈子) | 8 | 代码完整 + 权限修复闭环；扣分：图片上传缺口 |
| 功能 | 付费链路(VIP/红包/优惠码) | 4 | 资金逻辑真实化但支付未接入、UI 未上线 |
| 安全 | 资金安全(幂等/事务/续费延长) | 8 | R2 P0 全部完成 + `WalletServiceConcurrencyTest`/`Task12ConcurrencyTest` |
| 安全 | 权限与隐私(IDOR/JWT 黑名单/上传鉴权) | 9 | 876 单测 + `P2SecurityPenetrationTest` |
| 性能 | 接口 SLO 与缓存 | 7 | `P2PerformanceBenchmark` 通过；缺真实环境压测 |
| 性能 | 容量规划(归档/OSS/连接扩展) | 5 | 有规格未落地(见第 4 章) |
| 合规 | ICP/域名/备案 | 2 | 全部待线下(`docs/wechat-submission-materials-checklist.md`) |
| 合规 | 支付资质/商户号 | 2 | 保留项 5 |
| 合规 | 隐私政策/用户协议法务 | 5 | 已起草未审核(`docs/privacy-policy.md`、`docs/user-agreement.md`) |
| 运维 | 监控/告警/备份/DR | 8 | DRP 完整 + 备份校验脚本(`scripts/backup-mysql.sh`) |
| 运维 | 灰度/回滚/发布演练 | 6 | `docs/GRADUAL-RELEASE.md` 文档齐，未演练 |
| 测试 | 自动化门禁 | 8 | api 876 全绿；client vitest 待 CI 跑通 |
| **加权总分** | — | **≈ 68/100** | 代码侧 ≈7.5，合规侧 ≈3 |

### 5.2 Go/No-Go 建议

**判定：有条件 Go(Go-Conditional)——技术放行、商业挂锁。**

- **条件 A(代码，2-3 周可完成，约 20-30 人日)**：清单 A-1~A-10(见 5.3)
- **条件 B(线下，时间不可控)**：ICP 备案通过(预估 2-4 周)、正式 appid、支付商户号(首版收费前)
- **灰度策略**(参照 `docs/GRADUAL-RELEASE.md`)：首版**不带真实支付**(VIP 显示"敬请期待")，先验证匹配/聊天/圈子留存；次周留存 >25% 后再开支付。若 6 周内 ICP 无法落地，**用 H5 端先行小范围验证**(无需小程序备案，成本更低)——这是风险最低的并行路径。

### 5.3 上线前必须完成事项清单

**A. 代码可解决(全部可排期)**

| # | 事项 | 级别 | 对应章节 |
|---|------|------|----------|
| A-1 | 圈子发帖图片上传链路打通(client upload → 服务端存储 → 展示解析) | P0 | 1.2/3.4-1 |
| A-2 | client vitest 全量在 CI 执行(Node 18-20 环境) | P0 | 3.3/保留项 7 |
| A-3 | `vip_bills.transaction_id` 唯一约束 + 支付回调幂等回归 | P0 | 3.4-2 |
| A-4 | 微信订阅消息模板配置 + 服务端推送对接(新消息/新匹配提醒) | P1 | 1.2/3.4-4 |
| A-5 | `@Scheduled` 定时任务分布式锁(多实例防重) | P1 | 3.4-5 |
| A-6 | 新环境 Flyway history 干净性验证(重复版本号修复后) | P1 | 3.2/REAUDIT |
| A-7 | 隐私政策/用户协议内嵌页 + 首次同意留痕 | P1 | 1.3/合规 |
| A-8 | 流水表归档策略定时任务(visitors 90 天 / notifications 180 天) | P2 | 4.4 |
| A-9 | 生产环境变量核对(.env 不落库、JWT_SECRET 轮换、BCrypt 密码) | P2 | infra-review |
| A-10 | 上传存储切换 OSS(或预留接口、本地兜底) | P2 | 4.4/4.6 |

**B. 线下材料(代码无法解决，与 A 并行推进)**

| # | 事项 | 责任人建议 | 证据 |
|---|------|-----------|------|
| B-1 | 营业执照/主体认证 | 法务/运营 | `docs/wechat-submission-materials-checklist.md` |
| B-2 | ICP 备案 + 服务器域名 + 业务域名配置(2-4 周) | 运维/法务 | 保留项 1-2 |
| B-3 | 正式 appid 确认并替换 `manifest.json` 中 wxc67cd233d72388d0 | Owner | FIN-00009 |
| B-4 | 微信支付商户号申请(首版收费前) | 财务/法务 | 保留项 5 |
| B-5 | 隐私政策/用户协议法务审核 | 法务 | 保留项 6 |
| B-6 | 客服联系方式 + 24h 处置运营排班(恋爱品类审核必查) | 运营 | 1.3 |
| B-7 | 真实设备回归四链路(登录/认证/发帖/支付) | QA | 微信开发者工具已验 5 项 |

### 5.4 最终结论

代码与工程质量已达到商业化可发布线：技术债从 1773 条收敛至可控列表、安全 P0 全部闭环、876 单测全绿、双端 typecheck 零错误、DRP/CI/监控完备。**就绪度 68/100，全部扣分集中在"线下合规材料"与"真实支付"两项**——它们不是工程问题，是流程与时间问题。

**行动建议**：以 2-3 周代码冲刺清空 A 类清单，同时并行推进 B 类线下材料；材料齐备后按灰度计划分阶段放量，首版不上支付、以"次周留存 >25%"为放量里程碑。若 6 周内 ICP 无法落地，切 H5 端小范围验证，保持"技术 Go、商业 Hold"的灵活姿态。**本项目从工程角度已可交付，剩下的路在办公室之外。**
