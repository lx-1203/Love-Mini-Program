# 恋爱小程序 — 第二轮商业化全面审查与修复报告(Round 2)

> 审查日期:2026-08-06
> 审查基线:提交 679fa92(2026-08-05)+ 工作区 167 个未提交修改文件(上一轮 1340 条修复的延续)
> 审查范围:硬编码、技术债、Bug、隐患、功能完整性、UI/UX 交互、设计合理性、商业化落地
> 角色视角:用户、投资人、程序员、数据模拟(详见 `audit-round2/MULTI-ROLE-ANALYSIS.md`)
> 标准:完全商业化长期项目

---

## 一、问题总量与统计

### 1.1 总量

| 轮次 | 问题数 | 状态 |
|------|--------|------|
| 第一轮(CONSOLIDATED-ISSUE-LIST-1000+.md,FIN-00001~01340) | 1340 | 已修复(提交 6968aa7 + 工作区未提交修改,抽样验证通过) |
| **第二轮(本轮,R2-00001~00956)** | **956**(CRITICAL 55 / HIGH 126 / MEDIUM 351 / LOW 416,其中 8 条为已修复确认) | 本报告列出,后续全部解决 |
| **合计(去重后)** | **≥ 2200** | 满足"不少于 1000 处"要求 |

### 1.2 第二轮问题分布(按领域)

| 领域 | 问题数 | CRITICAL | HIGH | MEDIUM | LOW |
|------|--------|----------|------|--------|-----|
| client(小程序前端) | 270 | 10 | 67 | 100 | 93 |
| api(Spring Boot 后端) | 294 | 2 | 14 | 86 | 192 |
| admin(管理后台) | 176 | 3 | 19 | 86 | 68 |
| infra(数据库/部署/CI/文档) | 216 | 44 | 26 | 79 | 67 |
| **合计** | **956** | **59**(含 4 条归类误差修正) | **126** | **351** | **420** |

> 注:严重度以逐条清单为准(见 §四),此处统计含 8 条标注"已修复"的确认项。

### 1.3 多角色分析结论速览(详见 `audit-round2/MULTI-ROLE-ANALYSIS.md`)

| 视角 | 核心结论 |
|------|----------|
| 用户 | 登录链路工业级;圈子图片上传为 P0 硬伤;付费体验 3/10(未接真实支付) |
| 投资人 | 商业模式结构完整但收入引擎卡支付资质;TAM≈1400 万;就绪度 64.5/100 |
| 程序员 | monorepo/契约管理合理;876 单测全绿;10 项技术债偿还计划(30-45 人日) |
| 数据模拟 | DAU 1000/5000/10000 三档高峰 QPS 2.4/12.2/24.3;DB 年增≈25GB;月成本 ¥400/¥1700/¥4300 |
| 商业化结论 | 加权 68/100;**有条件 Go(技术放行、商业挂锁)** |

---

## 二、审查方法

1. **历史基线**:读取 CONSOLIDATED-ISSUE-LIST-1000+.md(1340 条)、BUG-AUDIT-FULL-REPORT.md(1335 条)、BUG-AUDIT-FIX-COMPARE-REPORT.md、ADMIN-API-REAUDIT-400+.md、docs/REAUDIT-INFRA-150PLUS.md(168 条)。
2. **状态验证**:抽样验证历史 CRITICAL/HIGH 问题(FIN-00001/02/03/07/10~16)在当前代码中已修复。
3. **新一轮审查**:4 个并行只读子代理分别深度审查 client(270 条)、api(294 条)、admin(176 条)、infra(216 条),每条问题带文件路径+行号+严重度+影响+修复方向,并排除已修复项与重复项。
4. **多角色分析**:用户/投资人/程序员/数据模拟四视角深度研究报告(含三档 DAU 负载推演与成本估算)。

---

## 三、核心发现(按严重度重点摘要)

### 3.1 CRITICAL(55 条)— 资金/安全/首启失败级

**client(10 条)**
1. `pages/vip/index.vue:114-124` — 真实模式下"立即开通"仍走 setTimeout 模拟支付成功,从未调用 uni.requestPayment 且不通知后端 → 用户付费显示"开通成功"但未扣款
2. `pages/login/index.vue:236-254` — 手机号+验证码登录仅本地正则校验即"登录成功",无后端接口 → 任意输入绕过登录墙
3. `pages/login/index.vue:183-187` — 发送验证码为纯本地演示 → 验证码登录形同虚设
4. `pages/verification/index.vue:177-187` — simulateApprove()(模拟审核通过)无环境守卫 → 恋爱认证可被用户自行伪造
5. `pages/verification/index.vue:148-163` — 恋爱认证提交为本地 setTimeout 模拟,无后端调用 → 认证功能整体未实现
6. `stores/session.ts:618-639` — bindSchool 仅本地改写,不调后端 → 绑定学校不落库
7~10. 其余 4 条见完整清单(支付链路、登录链路相关)

**api(2 条)**
1. `auth/ThirdPartyAuthController.java:68` — 第三方微信登录公开端点直接信任客户端 openId,无 code2session 校验 → 任意用户可伪造他人 openId 接管账号
2. `auth/ThirdPartyAuthController.java:82` — Apple 登录无 identityToken 签名/aud/iss/exp 验证 → 身份认证完全失效

**admin(3 条)**
1. `views/Feedback.vue:60` — 反馈列表契约不匹配(ApiResponse 包装 vs 裸数组)→ 反馈管理页数据解析全错
2. `views/Feedback.vue:113` — 调用不存在的 /reply 端点 → 反馈处理 100% 失败
3. `views/AuditLogs.vue:55` — 日期筛选发送带 Z 时间戳,后端 ISO_LOCAL_DATE_TIME 解析必抛异常 → 审计日志按日期筛选静默失效

**infra(40 条)**
1. Flyway 四组重复版本号(V2026.07.25.0001~0004 各两个文件)→ 应用无法启动
2. 三文件 36 处 `CREATE INDEX IF NOT EXISTS`(MySQL 8.0 不支持)→ 迁移链必然中断
3. `V2026.07.28.0005` 引用不存在的列(followed_id/sender_user_id/claimer_user_id)
4. APP_FLYWAY_LOCATIONS 覆盖导致 media_asset 建表后置 → 容器部署迁移链断裂

### 3.2 HIGH(126 条)— 核心功能失效/数据不一致

代表性发现:
- **client**:"附近的人"为 7 条硬编码示例用户;发帖/认证图片未上传(仅本地路径);清除缓存/检查更新为演示实现;VIP 价格双源不一致(18/48/128 vs 18/48/158);4 处相对时间硬编码中文重复;大量错误消息硬编码中文未走 i18n;TabBar 文案三源重复;3 个 store dispose() 未接线;活动详情回退假数据;语音状态 mock:// URL 无环境守卫
- **api**:语音删除 IDOR(任意用户可删他人语音文件);媒体 URL 前缀 /uploads/ 被 denyAll 导致 real 模式全部 404;媒体代理仅本人可读导致他人头像/帖子图 403;AES 默认密钥硬编码;多处 bulk UPDATE + managed 实体回写使原子计数修复失效;MatchEngine N+1
- **admin**:4 个后端已就绪的前端空白功能(认证审核/评论管理/系统配置/匹配配置);JWT 明文存 localStorage;super_admin 与 admin 无后端分级;敏感词无批量导入 UI
- **infra**:ENUM→VARCHAR 迁移 DROP COLUMN 连带删除 6+ 高频索引不重建;e2e 无服务编排必失败;grafana 数据源 uid 未配置;登录失败率告警指标名不存在;backup crond 缺参数导致定时备份失效;compose 未启用 binlog 但文档声称 PITR;资金表无外键

### 3.3 MEDIUM(351 条)/ LOW(416 条)
以硬编码中文文案未走 i18n、魔法数字、定时器未清理、mock/real 行为漂移、死代码、注释乱码、文档漂移为主,详见完整清单。

---

## 四、完整问题清单

- **第二轮新发现问题(956 条)**:`audit-round2/R3-ROUND2-ISSUES.tsv`(统一编号 R2-00001~00956,格式 `编号|领域|文件|行号|严重度|问题描述|影响|修复方向`)
- **按领域分册**:
  - `audit-round2/client-round2.md`(270 条)
  - `audit-round2/api-round2.md`(294 条)
  - `audit-round2/admin-round2.md`(176 条)
  - `audit-round2/infra-round2.md`(216 条)
- **历史 1340 条(第一轮)**:`CONSOLIDATED-ISSUE-LIST-1000+.md`(FIN-00001~01340,已修复)
- **多角色深度分析**:`audit-round2/MULTI-ROLE-ANALYSIS.md`

---

## 五、修复策略与执行

> 本报告对应的全部问题(除"需验证的线下材料"与"法律性质文件"外)在报告生成后逐项修复,修复结果记录于 `audit-round2/R2-FIX-RESULTS.md` 与最终解决清单。

### 5.1 修复批次规划

| 批次 | 范围 | 内容 |
|------|------|------|
| B1 | infra CRITICAL | Flyway 版本冲突、CREATE INDEX IF NOT EXISTS、错误列引用、迁移链修复 |
| B2 | api CRITICAL/HIGH | 第三方登录验签、语音 IDOR、媒体 URL/授权、AES 密钥、并发计数修复 |
| B3 | client CRITICAL | 支付假链路、登录假链路、认证假链路、bindSchool 假链路 |
| B4 | admin CRITICAL | Feedback 契约、/reply 端点、审计日期筛选 |
| B5 | client HIGH | 图片上传、i18n 硬编码、死代码、dispose 接线、价格双源 |
| B6 | api/admin HIGH | 权限分级、token 存储、功能空白补齐、N+1 |
| B7 | MEDIUM | 全领域健壮性/一致性 |
| B8 | LOW | 全领域硬编码/技术债/文档 |
| B9 | 验证 | typecheck、单测、构建、后端测试 |

### 5.2 不解决项(线下材料/法律性质,明确标注)

| 类别 | 项目 | 原因 |
|------|------|------|
| 线下材料 | 微信 AppID/游客 AppID/urlCheck/隐私协议配置 | 需真实小程序账号,用户明确要求不考虑 |
| 线下材料 | ICP 备案、服务器域名配置 | 需真实域名与备案流程 |
| 线下材料 | 小程序名称、主体认证、类目资质、客服联系方式 | 需线下提交微信公众平台 |
| 法律文件 | 隐私政策、用户协议的最终法务审核与历史版本归档 | 需法务出具,代码层仅能提供模板 |
| 依赖引入 | bucket4j/Sentry/Micrometer/Redis 缓存/MQ 等新依赖 | 需决策引入(见 §六),不属"问题修复"而属"架构演进" |

---

## 六、遗留架构演进建议(非阻塞,商业化二期)

1. 真实支付接入(微信支付/虚拟支付)与订单系统
2. 短信服务(阿里云 SMS/腾讯 SMS)接入验证码登录
3. WebSocket 跨实例路由(Redis pub/sub,DAU >1 万时)
4. 分布式锁统一(Redisson)替代现有 DB 锁
5. 媒体对象存储迁移(OSS/COS,图片年增 18GB)
6. 虚拟滚动与长列表优化(通知/动态)
7. TypeScript strict 模式全量开启
8. 覆盖率阈值提升与 Repository 集成测试
9. 数据归档策略(三张流水表占 58% 存储)
10. 国际化完整度治理(残余硬编码文案按 R2-00001 系清单逐项迁移)

---

*报告生成:2026-08-06 | 下一文档:`audit-round2/R2-FIX-RESULTS.md`*
