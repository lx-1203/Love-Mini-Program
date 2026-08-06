# 最终交付报告（Final Delivery Report）

> 规格：`.trae/specs/2026-08-06-fullstack-eladmin-operational-qa/spec.md`（已批准）
> 交付日期：2026-08-06
> 覆盖范围：微信小程序（mp-weixin，非 H5）+ 管理后台 + Spring Boot API 三端全链路运行、eladmin 参考改进、全功能走查、质量门禁与商业化核验。

---

## 1. 交付概览（当前运行状态）

| 端 | 状态 | 端口/入口 | 说明 |
|---|---|---|---|
| API（Spring Boot 3.3.1） | ✅ 运行中，`/actuator/health` = UP | http://127.0.0.1:8080 | real profile，Flyway 迁移成功，启动日志无 ERROR |
| 管理后台（Vue3 + Vite） | ✅ dev 运行中 | http://127.0.0.1:5177 | 管理员登录、全部页面可操作 |
| 微信小程序（uni-app mp-weixin） | ✅ 构建零 error | `dist/build/mp-weixin` | CLI 打开成功；产物烧录 `http://127.0.0.1:8080/api`（2026-08-06 修复 mode 覆盖问题） |

管理员账号：`local-dev-admin-openid-123456` / `Admin@123456`（SUPER_ADMIN；已支持后台自行改密）
数据库：MySQL 127.0.0.1:3307 `campus_love`（密码 `hyp5022940`，仅存于 gitignore 排除文件）
缓存：Redis 127.0.0.1:6379（无密码）

## 2. 缺陷修复清单（本次走查全部修复项）

### 2.1 系统性缺陷（@Version 实体 save 返回值）
几乎全部实体带 `@Version` → Spring Data `isNew()` 恒 false → 创建路径走 `merge()`，忽略返回值则 id 不回填。**已修复 10+ 处核心创建路径（必须接收 save/saveAndFlush 返回值）**：

- 发帖 `VillagePostService`（data.id 非空）
- 评论 / 分享 `VillageInteractionService`
- 私信会话 / 消息 `RealPrivateMessageService`
- 每日一问作答 `RealDailyQuestionService`
- 临时会话 / 临时消息 / 话题 / 回复（TempChatSessionService 等）
- 校园话题 / 回复 `RealCampusService`
- 其余 60+ 处已审查确认

### 2.2 走查发现的功能缺陷（5 类）
| # | 缺陷 | 根因 | 修复 |
|---|---|---|---|
| 1 | matches/visit 500 | VisitorRepository 派生删除查询 LocalDate/LocalDateTime 类型不匹配 | 参数改 LocalDateTime + `atStartOfDay()` 区间 |
| 2 | 点赞 toggle 卡死 | 派生删除与 `entityManager.clear()` 交互导致 DELETE 永不落库 | Spring 注入路径改用 JPQL bulk DELETE |
| 3 | 3 个 404 端点（social-progress / campus-activities / campus-feed） | 后端无对应端点/Controller | 新建 SocialProgressController、CampusController 增加 activities/feed 别名 |
| 4 | `/me` 禁用状态不生效 | JwtAuthenticationFilter 放行 /api/v1/auth/** | RealAuthService.getCurrentSession() 补 isDisabled 检查 |
| 5 | 用户走查中「记录访客」与「收藏语义」契约小瑕疵 | 前端调用与后端参数契约不一致 | posts 按作者过滤（authorId）已补齐 |

### 2.3 运行环境修复
- 8080 旧实例 health DOWN（RabbitMQ 未运行）→ 健康实例替换，数据未破坏
- Redisson 空密码仍发 AUTH → 手动 RedisConfig Bean（RESP2，仅密码非空时 setPassword）
- fat jar 缺 byte-buddy → pom runtime scope
- cmd 批处理 LF/ANSI 解析错乱 → CRLF + `set "VAR=..."` + `PATH=%JAVA_HOME%\bin`
- Flyway 相对路径解析失败 → start-local.bat 显式 `APP_FLYWAY_LOCATIONS` 绝对路径
- JaCoCo 中文路径静默失败 → destFile 改 `${java.io.tmpdir}/jacoco-*.exec`
- AGNES_API_BASE 必填 → 显式配置
- `@Transactional(readOnly=true)` 内写库 500（social-progress）→ 改读写事务
- 注册用户不记在线会话 → registerUser 补 `recordOnlineSession`
- **mp-weixin 构建烧录占位域名（用户实测反馈）**：`uni build --platform mp-weixin` 实际 mode=production（加载 `.env.production` 的 `https://api.campuslove.example.com/api`），与 `.env.mp-weixin` 注释声称的 mode 不一致 → `build:mp-weixin` 显式加 `--mode mp-weixin`，产物验证烧录 `http://127.0.0.1:8080/api`、占位域名 0 残留
- **体验账号一键登录（用户需求：登录页临时号一键体验全部功能）**：新增 `POST /api/v1/auth/guest-login`（首次自动创建固定体验账号 13900000000/昵称「体验用户」，随机 BCrypt 密码防手机号密码登录，幂等复用，登录方式 guest 记录在线会话；`app.guest-login.enabled=false` 可关闭入口）+ 登录页「一键体验全部功能」按钮（需勾选协议，防抖，错误上抛 Sentry）+ i18n + 4 个单测；构建产物验证包含 guest 流程，HTTP 冒烟：首次创建 userId=47、二次复用同账号、token 可用

## 3. eladmin 对齐改进（P1/P2 已实施，Non-Goals 仅记录）

### P1（阻塞运营/商业要求）
- ✅ 管理员改密：`POST /api/v1/admin/account/change-password`（SUPER_ADMIN + 旧密码 BCrypt 校验 + @Auditable）+ 后台用户管理页「修改密码」弹窗
- ✅ 管理员新增用户：`POST /api/v1/admin/users`（手机号唯一/密码强度/昵称校验）+ 后台「新增用户」弹窗
- ⚠️ 支付网关：外部依赖（无商户凭据），按规格降级：充值/红包接口已实现幂等 + orderId 预留，生产必须接支付（Javadoc 标注）

### P2（低成本高价值）
- ✅ 在线用户管理：登录/注册写 Redis `online:user:{userId}`（TTL=JWT 有效期，Redis 不可用降级内存）；`GET /api/v1/admin/online-users`（昵称补全）+ `POST /{id}/kick`（jti 黑名单 + 删会话 + @Auditable）；后台「在线用户」页（踢下线二次确认）
- ✅ 异常日志筛选：`audit-logs?exception=true`（errorMessage IS NOT NULL）+ 后台审计日志页筛选 Tab

### Non-Goals（仅记录，未实施）
代码生成 / Druid / 支付宝 SDK / 邮件 / S3 / Quartz（按规格范围控制，防止改造为通用后台框架）

## 4. 全功能走查结论（扮演用户/管理员）

- **功能清点**：68 项功能全部清点并标记状态（见 function-inventory.md）；Phase 4 结束全部为「可用」或已记录降级说明
- **用户角色走查**（69 PASS / 5 FAIL，FAIL 全部修复）：账号/寻觅匹配/聊天/圈子动态/活动成长/我的设置/VIP 商业化全链路端到端可用；注册→数据互通、发帖/评论 id 非空、登出黑名单、校园认证 409、签到积分等关键点重点验证
- **管理员角色走查**（48 PASS / 1 FAIL，FAIL 已修复）：Dashboard 统计、用户管理禁用生效、帖子/举报/反馈处理、配置读写、敏感词过滤、审计日志全覆盖
- **最终冒烟**：23/23 全过（改密/新增用户/在线用户列表+踢下线/审计异常筛选/注册/每日一问/发帖/评论/点赞 toggle/校园认证/签到/9 端点回归）

## 5. 质量门禁数据

| 门禁 | 结果 |
|---|---|
| `pnpm --filter client run test` | ✅ 87 文件 / 1171 测试全过 |
| `pnpm --filter client run typecheck` | ✅ vue-tsc 无错误 |
| `pnpm --filter client run build:mp-weixin` | ✅ 成功、无 error |
| `apps/api/mvnw.cmd test` | ✅ 940 测试 Failures 0 / Errors 0 / Skipped 7（含 PhaseOneFlowApiTest 修复） |
| `pnpm --filter admin run build` | ✅ vue-tsc + vite 113 modules 无报错 |
| JaCoCo 覆盖率 | ⚠️ 未达 0.80 阈值（LINE≈0.33），见 §7.2 结构性说明 |

## 6. 证据索引（evidence/ 目录）

| 文件 | 内容 |
|---|---|
| function-inventory.md | 68 项功能清点清单（状态/端点/缺陷标记） |
| user-walkthrough.md | 用户角色全功能走查报告（69 PASS/5 FAIL 及修复） |
| admin-walkthrough.md | 管理员角色走查报告（48 PASS/1 FAIL 及修复） |
| final-smoke.ps1 | 最终冒烟脚本（23/23） |
| smoke-fixed-defects.ps1 / verify-batch2.ps1 | 缺陷修复回归脚本 |
| probe-*.ps1 / debug-*.ps1 | 端点探测/问题定位脚本 |
| state.json / body-*.json | 走查中间状态与请求体 |

## 7. 商业化核验与发布前必办清单

### 7.1 敏感信息与安全基线
- ✅ 密码 BCrypt 存储、JWT 密钥非默认值、限流（Bucket4j）/幂等（@Idempotent）/内容过滤生效
- ✅ 登出 JWT 黑名单、禁用用户 401/403、踢下线黑名单
- ✅ `.env.local` / `start-local.bat` / `start-real-r2.bat`（含 `hyp5022940`）已被 .gitignore 排除（`git check-ignore` 确认）

### 7.2 结构性问题说明（如实记录，不强行凑数）
- **JaCoCo 覆盖率未达阈值**：604 类中 40%+ 是 `@Profile("real")` 代码，纯 mock 测试环境不加载该类，导致 LINE≈0.33 远低于 0.80。测试本身 940 全绿。**建议**：建立 real-profile 集成测试体系（测试容器/独立测试库跑真实 JPA 路径）后再逐步提升覆盖率门槛，切勿为凑数编写无断言测试。
- **Node 版本**：本机 Node 22，client engines 声明 `>=18 <21`，构建已验证通过；建议统一用 Node 20 以消除潜在兼容风险。

### 7.3 外部依赖缺失降级说明（上线前必须补齐）
| 依赖 | 现状 | 要求 |
|---|---|---|
| 微信小程序 AppID/AppSecret | 未配置 → 微信登录优雅降级提示 | 上线前配置 |
| 支付网关（微信支付/支付宝） | 未配置 → 充值/红包为幂等接口 + orderId 预留，需接真实支付 | 上线前接入 |
| AGNES_API_KEY / AGNES_API_BASE | 已配置本地占位，视频生成依赖外部 | 上线前替换真实 Key |
| 内容页（附近的人/MBTI/恋爱咨询） | 前端静态 webview 常量配置 | 上线前替换真实 URL 或接 CMS |
| 静态内容页（任务中心/积分商城/恋爱认证） | 前端静态内容页，后端无业务表 | 商业化前需补后端表与接口 |
| 校园/通知/匹配配置 | notify/match-config 已打通读写；campuses 等仍为内置默认值 | 如需运营配置需接后台配置表 |

### 7.4 发布前必办（高优先级）
1. **发布构建走 `build:mp-weixin:real`（注入 AppID + `--mode real`，读 `.env.real`）**：发布前必须把 `.env.real` 的 `VITE_API_BASE_URL`（当前为 `https://api.campuslove.example.com/api` 占位）改为真实 HTTPS 域名 → 重新构建。本地联调用 `build:mp-weixin`（读 `.env.mp-weixin` = `http://127.0.0.1:8080/api`）
2. 补齐 §7.3 外部依赖并重测对应链路
3. 微信开发者工具内打开 `apps/client` 导入 `dist/build/mp-weixin`，点击「编译」完成最终核验（CLI 已 open 成功、构建零 error、产物烧录本地地址；工具内确认是本交付唯一待用户完成的验收动作）
4. 上传代码前在「详情 → 本地设置」勾选"不校验合法域名"仅限本地联调；发布版本需配置合法 request 域名白名单

## 8. 遗留待确认项（唯一一项）

- 微信开发者工具内编译通过确认：构建产物已零 error 且 CLI 打开成功，但工具内编译结果需用户打开后最终确认（checklist D 节已如实标注）。
