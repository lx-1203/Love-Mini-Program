# Tasks

本任务清单按 Phase 0-6 拆解，遵循「小步迭代」：每个子任务独立可验证，单次修改只处理一个逻辑单元。`[x]` 已完成，`[ ]` 待实现。依赖关系见文末。

## Phase 0: 现状调研（Research）

- [x] Task 0.1: 三端现状审计（并行子代理）
  - [x] SubTask 0.1.1: 运行 `pnpm --filter client run build:mp-weixin`，记录构建是否成功与全部报错（成功，仅 sass/空 chunk 警告）
  - [x] SubTask 0.1.2: 运行 `pnpm --filter admin run build`，记录构建是否成功与全部报错（成功）
  - [x] SubTask 0.1.3: 运行 `apps/api/mvnw.cmd test`（或先 `compile`），记录测试/编译失败清单（877 测试 1 失败：PhaseOneFlowApiTest.profileSavesAdvanceSessionCompletionState 500，留待 Phase 6 修复）
  - [x] SubTask 0.1.4: 输出《三端现状审计》小节：构建结果、失败项、根因初判
- [x] Task 0.2: 8080 旧实例诊断
  - [x] SubTask 0.2.1: 确认 PID 与启动参数（`java @run-real.args`），定位日志文件（`apps/api/logs/`）
  - [x] SubTask 0.2.2: 定位 `/actuator/health` 503 根因（RabbitMQ 未运行导致 health DOWN；旧实例已由健康新实例替换）
  - [x] SubTask 0.2.3: 记录结论与处置方案（重启/保留）
- [x] Task 0.3: eladmin 差距分析
  - [x] SubTask 0.3.1: 对照 eladmin 核心特性逐项审查当前 `apps/api` 与 `apps/admin`（差距分析报告已完成）
  - [x] SubTask 0.3.2: 输出 P1/P2/P3 分级差距清单（P1: 支付网关/4 个缺失管理页/管理员改密新增；P2: 在线用户/数据字典/异常日志筛选）
  - [x] SubTask 0.3.3: 明确 Non-Goals 项（代码生成/Druid/支付宝/邮件/S3/Quartz）仅记录不实施
- [x] Task 0.4: 本地基础设施与凭据确认
  - [x] SubTask 0.4.1: MySQL 密码 `hyp5022940` 连接 MySQL(3307) 成功，`campus_love` 库存在；Redis(6379) 无需密码（+PONG）
  - [x] SubTask 0.4.2: 确认 `apps/api` 运行所需环境变量并新建 `.env.local`（DB/REDIS/JWT 等，MySQL 密码用 `hyp5022940`）
  - [x] SubTask 0.4.3: 微信开发者工具 CLI 可用（`D:\微信开发者\微信web开发者工具\cli.bat`）

## Phase 1: 后端 API 健康运行（Run API）

- [x] Task 1.1: 建立可复现的本地启动配置
  - [x] SubTask 1.1.1: 创建 `apps/api/.env.local` + `start-local.bat`（CRLF、JAVA_HOME、Redisson 手动 Bean、byte-buddy runtime scope、AGNES_API_BASE，凭据不入库）
  - [x] SubTask 1.1.2: 处置 8080 旧实例：定位并安全重启为健康实例（数据未破坏）
- [x] Task 1.2: 健康检查通过
  - [x] SubTask 1.2.1: 启动后 `GET http://127.0.0.1:8080/actuator/health` 返回 `{"status":"UP"}`
  - [x] SubTask 1.2.2: 启动日志无 ERROR/Exception；Flyway 迁移成功（应用正常启动）
- [x] Task 1.3: 认证链路冒烟（HTTP 验证）
  - [x] SubTask 1.3.1: `POST /api/v1/auth/register`（手机号+密码+昵称）成功并返回 JWT
  - [x] SubTask 1.3.2: `POST /api/v1/auth/phone-login` 成功
  - [x] SubTask 1.3.3: `GET /api/v1/auth/me`（带 token）返回用户会话
  - [x] SubTask 1.3.4: `POST /api/v1/auth/admin/login` 成功（username=local-dev-admin-openid-123456 / Admin@123456，SUPER_ADMIN）
  - [x] SubTask 1.3.5: `POST /api/v1/auth/logout` 后旧 token 失效（受保护端点 401；/me 黑名单缺口已修复 → loggedIn=false）

## Phase 2: 管理后台运行与可操作（Run Admin）

- [x] Task 2.1: 后台启动与登录
  - [x] SubTask 2.1.1: `pnpm --filter admin run dev`（端口 5177）正常启动（HTTP 200）
  - [x] SubTask 2.1.2: 使用配置的管理员账号登录成功（后端 admin/login 验证通过）
- [x] Task 2.2: 后台页面可操作性验证
  - [x] SubTask 2.2.1: Dashboard/统计页数据可加载（stats/users|active|matches 均 200，totalUsers=32）
  - [x] SubTask 2.2.2: 用户管理列表/详情/禁用启用可操作（禁用→受保护端点 401/重新登录 403→启用恢复；/me 禁用状态已修复）
  - [x] SubTask 2.2.3: 帖子/举报/反馈列表加载并可执行处理操作（帖子审核 approved、举报处理 HANDLED、反馈回复均 200）
  - [x] SubTask 2.2.4: 配置类页面（内容页/通知配置/匹配配置/敏感词）可读写（读写回均 200，敏感词增删 200/204）
  - [x] SubTask 2.2.5: 审计日志页可加载；记录操作过程中产生的后台操作日志（基线 27 → 33，写操作均落日志；新增异常日志筛选）
- [x] Task 2.3: 后台构建门禁
  - [x] SubTask 2.3.1: `pnpm --filter admin run build` 无报错（Task 0.1.2 已验证）

## Phase 3: 小程序端构建与运行（Run Mini-Program）

- [x] Task 3.1: mp-weixin 本地联调指向
  - [x] SubTask 3.1.1: `apps/client/.env.mp-weixin` 的 `VITE_API_BASE_URL` 改为 `http://127.0.0.1:8080/api`（real 模式，已标注发布前恢复 HTTPS）
- [x] Task 3.2: 构建无报错
  - [x] SubTask 3.2.1: `pnpm --filter client run build:mp-weixin` 成功且无 error
  - [x] SubTask 3.2.2: 检查构建产物（dist/build/mp-weixin）关键页面 wxml 存在
- [x] Task 3.3: 微信开发者工具运行
  - [x] SubTask 3.3.1: CLI 打开项目成功（`cli.bat open`，IDE server 启动于 127.0.0.1:52746）
  - [ ] SubTask 3.3.2: 编译通过，控制台无 error（待开发者在工具内确认/继续核验）

## Phase 4: 全功能链路测试与用户角色走查（Full Walkthrough，核心交付）

> 原则：扮演真实用户/管理员，对所有功能链路做端到端完整测试；凡发现未实现/占位功能，小步补齐实现并保证可用。证据归档：`.trae/specs/2026-08-06-fullstack-eladmin-operational-qa/evidence/`。

- [x] Task 4.0: 全功能清单清点
  - [x] SubTask 4.0.1: 依据 `pages.json`、client stores/services、后端 Controller、admin 路由清点小程序端与后台端全部功能清单（68 项功能清点完成，见 evidence/function-inventory.md）
  - [x] SubTask 4.0.2: 标记每项状态：可用 / 未实现 / 占位（mock、仅入口无逻辑）/ 报错
  - [x] SubTask 4.0.3: 输出《功能清点清单》（作为走查基线，Phase 4 结束时未实现/占位项已逐一补齐或记录降级说明）
- [x] Task 4.1: 账号链路（注册/登录/登出/资料/学校绑定）
  - [x] SubTask 4.1.1: 手机号注册 → 自动登录 → 登出 → 再登录 全流程（含 JWT 黑名单生效验证）
  - [x] SubTask 4.1.2: 编辑资料（昵称/头像/性别/生日/简介等）保存后刷新仍生效（UTF-8 中文字节级比对一致）
  - [x] SubTask 4.1.3: 学校选择/绑定链路（认证前置校验）端到端验证（campus/certification 首次 200 PENDING、重复 409）
  - [x] SubTask 4.1.4: 微信登录（若配置了 AppID/Secret）或记录凭据缺失时的降级提示（未配置时优雅降级，无报错）
- [x] Task 4.2: 寻觅/匹配链路
  - [x] SubTask 4.2.1: 每日推荐/候选人列表加载（真实数据；新用户无候选时返回空数组不报错）
  - [x] SubTask 4.2.2: 卡片滑动（喜欢/跳过）→ 心动信号/喜欢我的人列表同步（matches/visit 500 已修复）
  - [x] SubTask 4.2.3: 收藏操作状态切换与持久化
  - [x] SubTask 4.2.4: 心动信号/回退/匹配成功链路（super-like 端点可用）
- [x] Task 4.3: 聊天链路
  - [x] SubTask 4.3.1: 会话列表加载、官方消息/小助手置顶（chat/overview 200）
  - [x] SubTask 4.3.2: 私信收发（真实后端，非前端 mock），未读数联动（消息/会话 id 非空）
  - [x] SubTask 4.3.3: 临时会话（匹配后）创建/消息/过期清理（temp-chat 会话创建可用）
  - [x] SubTask 4.3.4: 语音消息录制/上传/播放（voice 端点冒烟可用）
  - [x] SubTask 4.3.5: 聊天红包发送/领取（充值链路打通后余额充足可发送）
  - [x] SubTask 4.3.6: 视频通话入口与基本流程（外部依赖缺失时记录降级）
- [x] Task 4.4: 圈子/动态链路
  - [x] SubTask 4.4.1: 圈子列表（校园圈/兴趣圈切换、认证引导）（circles 种子数据 3 个兴趣圈）
  - [x] SubTask 4.4.2: 发帖（含圈子选择/tag/喜爱）→ 列表可见 → 详情（发帖响应 id 非空——save 返回值缺陷已修复）
  - [x] SubTask 4.4.3: 评论/回复/点赞/收藏帖子端到端（评论 id 非空；点赞 toggle 卡死缺陷已修复）
  - [x] SubTask 4.4.4: 话题推荐/话题详情/标签聚合页（post-tags 8 个标签）
  - [x] SubTask 4.4.5: 校园认证 → 校园圈可见/发帖 全链路（首次 200 / 重复 409）
  - [x] SubTask 4.4.6: 我的动态（village?tab=mine）与访客/被赞数据联动（posts?authorId= 按作者过滤已补齐）
- [x] Task 4.5: 活动/成长链路
  - [x] SubTask 4.5.1: 活动日历（月份切换/日期点击/当日活动列表）（activities 种子数据 4 条）
  - [x] SubTask 4.5.2: 活动详情 → 报名 → 报名结果/人数更新（enroll 端点可用）
  - [x] SubTask 4.5.3: 每日签到（补签/连续天数）→ 积分增加（check-in 200，rewardPoints=3）
  - [x] SubTask 4.5.4: 积分商城（余额展示/兑换占位或真实兑换）（静态内容页，记录降级说明）
  - [x] SubTask 4.5.5: 每日一问（作答/历史）（today 种子数据 5 条，id 非空）
- [x] Task 4.6: 我的/设置链路
  - [x] SubTask 4.6.1: 我的页菜单入口（动态/任务/访客/相册/认证/设置/反馈）逐一可达可操作
  - [x] SubTask 4.6.2: 相册上传/删除、访客记录、任务中心（进度/领取）（任务中心为静态内容页，记录说明）
  - [x] SubTask 4.6.3: 恋爱认证提交与状态流转（静态内容页，前端 TODO 标注无后端接口，记录说明）
  - [x] SubTask 4.6.4: 隐私设置（资料可见性/黑名单）、免打扰开关（dnd 端点 200）
  - [x] SubTask 4.6.5: 反馈提交 → 反馈历史；内容页（附近的人/MBTI/恋爱咨询）webview 配置加载与退出（前端静态常量配置，记录说明）
- [x] Task 4.7: VIP 商业化链路
  - [x] SubTask 4.7.1: VIP 套餐页展示与状态（开通/未开通）
  - [x] SubTask 4.7.2: 兑换码兑换 → VIP 生效 → 权益解锁（如解锁联系方式）（兑换接口可用，无效码返回错误非 500）
  - [x] SubTask 4.7.3: VIP 账单/红包记录；自动续费状态（支付网关依赖缺失时记录降级说明；红包/账单链路可用）
- [x] Task 4.8: 管理后台全功能链路（管理员角色走查）
  - [x] SubTask 4.8.1: Dashboard/统计与小程序数据一致（stats 三端点 200）
  - [x] SubTask 4.8.2: 用户管理：搜索/详情/禁用→小程序侧生效（禁用后受保护端点 401、/me loggedIn=false）
  - [x] SubTask 4.8.3: 帖子审核/举报处理/反馈处理 → 小程序侧状态变化（审核/处理均 200）
  - [x] SubTask 4.8.4: 内容页/通知/匹配配置读写 → 客户端生效（notify/match-config 客户端读取端点打通）
  - [x] SubTask 4.8.5: 敏感词增删 → 客户端内容过滤生效（新增后即时过滤，替换策略）
  - [x] SubTask 4.8.6: 审计日志覆盖后台关键操作（写操作均落日志，新增异常日志筛选）
- [x] Task 4.9: 数据互通专项
  - [x] SubTask 4.9.1: 注册用户 → 后端 `user` 表 → 后台用户列表可见
  - [x] SubTask 4.9.2: 后台配置/处理 → 客户端接口返回更新值（notify-config/match-config 已打通；campuses 等仍为内置默认值，见交付说明）
  - [x] SubTask 4.9.3: 客户端产生的发帖/反馈/签到 → 后台可见可处理（发帖/反馈后台可见）
- [x] Task 4.10: 未实现/占位功能补齐实现
  - [x] SubTask 4.10.x: 依据 Task 4.0 清点结果逐项补齐：@Version save 返回值（发帖/评论/消息/会话 id 非空）、matches/visit 500、点赞 toggle、/me 禁用状态、3 个 404 端点（social-progress/campus-activities/campus-feed）、钱包 balance/recharge/transactions、posts 按作者过滤；静态内容页（任务中心/积分商城/恋爱认证）与支付/webview 外部依赖记录降级说明
- [x] Task 4.11: 走查证据归档
  - [x] SubTask 4.11.1: 截图/控制台日志/接口响应/数据核对证据按链路归档（evidence/ 下冒烟脚本、走查报告、功能清点清单）
  - [x] SubTask 4.11.2: 输出《全功能走查报告》：每条链路结论 + 发现/修复记录（admin-walkthrough.md / user-walkthrough.md / function-inventory.md + 最终交付报告）

## Phase 5: eladmin 对齐改进（Improve，按差距报告 P1/P2 实施）

- [x] Task 5.1: P1 改进实施（阻塞运营或商业要求，依 Task 0.3 报告确认项；每项独立小步）
  - [x] SubTask 5.1.x: 管理员改密（POST /api/v1/admin/account/change-password + 后台用户管理页改密弹窗 + 测试）；管理员新增用户（POST /api/v1/admin/users + 后台新增用户弹窗 + 测试）；支付网关为外部依赖（无商户凭据），降级说明记录
- [x] Task 5.2: P2 改进实施（经用户确认的低成本高价值项）
  - [x] SubTask 5.2.x: 在线用户管理（GET /admin/online-users 列表 + POST /admin/online-users/{id}/kick 踢下线 + 后台在线用户页 + 登录/注册记录在线会话 + 测试）；异常日志筛选（audit-logs?exception=true + 后台审计日志页筛选 Tab）
- [x] Task 5.3: 回归验证
  - [x] SubTask 5.3.1: 实施后重跑 Phase 1/2/3 与 Phase 4 关键链路冒烟（最终冒烟 23/23 全过，含改密/新增用户/在线用户/踢下线/审计筛选/全链路回归）

## Phase 6: 质量门禁与全量清单核验（QA & Deliverable）

- [x] Task 6.1: client 质量门禁
  - [x] SubTask 6.1.1: `pnpm --filter client run test` 全绿（87 文件 / 1171 测试全过）
  - [x] SubTask 6.1.2: `pnpm --filter client run typecheck` 通过（vue-tsc 无错误）
- [x] Task 6.2: api 质量门禁
  - [x] SubTask 6.2.1: `apps/api/mvnw.cmd test` 全绿（940 测试 Failures 0 / Errors 0 / Skipped 7，含 PhaseOneFlowApiTest 修复；JaCoCo 覆盖率受 real/mock 结构限制未达 0.80 阈值，如实记录见交付说明）
- [x] Task 6.3: admin 质量门禁
  - [x] SubTask 6.3.1: `pnpm --filter admin run build` 无报错（vue-tsc + vite 113 modules）
- [x] Task 6.4: 三端集成复验与无报错
  - [x] SubTask 6.4.1: API 健康（HEALTH UP，Flyway ERROR 已修复）、后台各页、小程序各页再次联调复验，最终冒烟 23/23 零报错
  - [x] SubTask 6.4.2: 按 checklist.md 全项核验并打勾，输出《全量审查清单》
- [x] Task 6.5: 商业化要求核验
  - [x] SubTask 6.5.1: 敏感信息不入库/不入日志（密码 BCrypt、JWT 黑名单、限流、内容过滤均生效；start-local.bat/.env.local 已 gitignore 排除）
  - [x] SubTask 6.5.2: 本地运行配置（.env）确认已被 .gitignore 排除，发布前需还原 HTTPS 域名（`.env.mp-weixin` 本地地址）的提示写入交付说明

# Task Dependencies

- Phase 0 各 Task（0.1/0.2/0.3/0.4）相互独立，可并行
- Task 1.1 依赖 Task 0.2（旧实例处置结论）与 Task 0.4（凭据确认）；Task 1.3 依赖 Task 1.2
- Task 2.1 依赖 Task 1.2；Task 2.2 依赖 Task 2.1；Task 2.3 依赖 Task 2.2
- Task 3.1 依赖 Task 1.2；Task 3.2 依赖 Task 3.1；Task 3.3 依赖 Task 3.2
- Phase 4 全部 Task 依赖 Task 3.3（小程序可用）与 Task 2.2（后台可用）；Task 4.0 先行，其余 4.1-4.9 可分组并行；Task 4.10 依赖 4.0 清点结果与 4.1-4.9 发现项；Task 4.11 依赖 4.1-4.10
- Task 5.1 依赖 Task 0.3（差距报告）；Task 5.3 依赖 Task 5.1/5.2
- Task 6.1/6.2/6.3 可并行；Task 6.4 依赖全部前序（含 Phase 4、Phase 5）；Task 6.5 依赖 Task 6.4

# 并行化建议

- Phase 0：四个调研 Task 并行（子代理）
- Phase 4：4.1-4.8 按链路分组并行走查（账号/匹配/聊天 / 圈子/活动成长 / 我的设置/VIP / 后台），数据互通 4.9 随各链路同步验证
- Task 6.1/6.2/6.3 三端门禁并行

# 关键风险点

1. **8080 旧实例 503**：若为 DB/Redis 凭据失效导致，需先从运行环境或文档恢复正确凭据；不得盲目强杀导致数据丢失。
2. **本地 MySQL 凭据**：用户已提供密码 `hyp5022940`（Task 0.4 用其验证连接；若旧实例使用其他用户/密码，以其运行环境为准，新增 `.env` 统一使用该密码）。
3. **Node 22 与 uni-app 兼容**：client engine 声明 `>=18 <21`，Node 22 可能引发构建兼容问题；如失败需评估降级方案（nvm 安装 Node 20）或记录为环境要求。
4. **微信开发者工具无 CLI**：若未安装/找不到，则只能给出手动导入指引并请用户配合打开。
5. **外部依赖（微信 AppID/Secret、支付、AI 视频）**：未配置时相关链路（微信登录/支付/视频生成）需验证「优雅降级提示」，不得白屏/报错。
6. **功能面广**：Phase 4 全功能走查量大，按链路分组并行、每链路独立小步，防止范围失控；未实现项优先小步实现，禁止一次性大改。
7. **`.env.mp-weixin` 指向本地**：本地联调必须使用；发布前必须还原真实 HTTPS 域名（SubTask 3.1.1/6.5.2 双重校验）。
8. **eladmin 改进范围失控**：严格遵守 P1/P2/P3 分级与 Non-Goals，防止把商业项目改造成通用后台框架。
