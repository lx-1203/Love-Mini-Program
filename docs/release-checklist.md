# 发布检查清单（Release Checklist）

> 对应规范：`.trae/specs/2026-07-26-commercialize-longterm-fixall/tasks.md` Task 9.2.2
> 适用范围：校园恋爱小程序商业化发布全流程门禁
> 维护者：DevOps Lead & Release Manager
> 最近更新：2026-07-26
> 配套文档：`docs/CI-CD.md`、`docs/GRADUAL-RELEASE.md`、`docs/go-no-go-template.md`

---

## 0. 发布前预检（T-7 天）

### 0.1 范围锁定（Scope Lock）

- [ ] 发布版本号已确定（遵循 SemVer 2.0.0，如 `v1.0.0`）
- [ ] 发布分支已创建：`release/v{version}`（从 `main` 切出）
- [ ] 包含的 PR 列表已确认，所有 PR 携带完整 label（`feature`/`fix`/`security`/`docs`/`refactor`/`chore`）
- [ ] Out-of-scope 项已显式 deferred 至下个版本（在 GitHub Milestone 中标记）
- [ ] CHANGELOG.md 中 `[Unreleased]` 节已重命名为 `[version] - date`
- [ ] 版本号已写入 `apps/client/package.json`、`apps/admin/package.json`、`apps/api/pom.xml`

### 0.2 风险评估

- [ ] 已知问题记录在 `docs/defect-log-template.md` 中，未解决项 ≤ 5 条且均为 LOW
- [ ] 安全漏洞扫描无 critical（`npm audit` / `mvn dependency-check:check`）
- [ ] 性能基准测试未退化（与上版本对比 P99 < 2s）
- [ ] 数据库迁移脚本已 review，含回滚脚本
- [ ] 第三方依赖版本无 CVE 告警

### 0.3 通讯准备

- [ ] 发布通知已发送至业务团队（提前 7 天）
- [ ] 维护窗口已确认（建议低峰期 02:00-04:00）
- [ ] 客服团队已准备 FAQ 与应急预案
- [ ] 微信小程序提审材料已准备（详见 §6）

---

## 1. 自动化门禁（Automated Gates）

### 1.1 客户端门禁

- [ ] `pnpm --filter @campus-love/client run typecheck` 通过（vue-tsc --noEmit）
- [ ] `pnpm --filter @campus-love/client run test:unit` 全绿（25 个测试套件，223 个用例）
- [ ] `pnpm --filter @campus-love/client run build:mp-weixin` 构建成功
- [ ] `pnpm --filter @campus-love/client run build:h5` 构建成功（如需 H5 部署）
- [ ] Storybook 构建成功：`pnpm --filter @campus-love/client run build-storybook`
- [ ] Bundle 体积未超阈值（主包 < 2MB，分包总计 < 16MB）
- [ ] 无 console.log / debugger 残留（grep 验证）
- [ ] 无 TODO / FIXME / XXX 残留（grep 验证）

### 1.2 Admin 端门禁

- [ ] `pnpm --filter @campus-love/admin run typecheck` 通过
- [ ] `pnpm --filter @campus-love/admin run test:unit` 全绿
- [ ] `pnpm --filter @campus-love/admin run build` 构建成功
- [ ] Bundle 体积未超阈值（< 5MB）

### 1.3 后端门禁

- [ ] `mvn -pl apps/api clean verify` 通过
- [ ] `mvn -pl apps/api test` 全绿（22 个测试类，242+ 个用例）
- [ ] `mvn -pl apps/api jacoco:report` 覆盖率 ≥ 80%（statements/lines）
- [ ] `mvn -pl apps/api dependency-check:check` 无 critical CVE
- [ ] `mvn -pl apps/api spotbugs:check` 无 critical/major 告警
- [ ] OpenAPI 注解完整（grep 验证所有 Controller 含 `@Operation`）
- [ ] Swagger UI 可访问（`/swagger-ui.html`）

### 1.4 集成测试

- [ ] `pnpm run verify:phase01` 通过（P0+P1 集成验证）
- [ ] `pnpm run verify:client-builds` 通过（多端构建验证）
- [ ] `pnpm run api:test` 通过（API 集成测试）
- [ ] Flyway 迁移在临时数据库上执行成功：`mvn flyway:migrate -Dflyway.url=...`
- [ ] Flyway 迁移可重复执行（`flyway:info` + `flyway:validate`）
- [ ] Docker compose up 完整启动：`docker compose up -d` 全部 healthy

### 1.5 安全门禁

- [ ] `pnpm audit --audit-level=moderate` 无漏洞
- [ ] `mvn dependency-check:check` 无 critical CVE
- [ ] `gitleaks detect` 无密钥泄露
- [ ] `.env.example` 与实际环境变量一致
- [ ] 无硬编码密码/JWT Secret/微信 AppSecret（grep 验证）
- [ ] CORS allowed origins 仅生产域名
- [ ] CSP 头部配置正确（H5）
- [ ] HTTPS 证书有效（生产域名）

---

## 2. 契约与数据（Contract And Data）

### 2.1 API 契约

- [ ] OpenAPI 文件与 Controller 注解一致（`/v3/api-docs` 导出后 diff）
- [ ] 客户端类型已重新生成：`pnpm --filter @campus-love/client run generate:openapi`
- [ ] 无 breaking contract drift（mock ↔ real 模式响应一致）
- [ ] `docs/API-CONTRACT.md` 已同步更新
- [ ] AI plan scope 仍匹配 `GET /home/dashboard` → `HomeDashboard.aiPlan`
- [ ] WebSocket 协议文档与实现一致

### 2.2 数据库迁移

- [ ] Flyway 迁移脚本已 review，按时间戳顺序排列
- [ ] 迁移脚本含幂等守卫（`IF NOT EXISTS` / `information_schema` 检查）
- [ ] 迁移脚本含回滚脚本（V{version}__xxx.sql 对应 U{version}__xxx.sql）
- [ ] 在测试环境执行迁移成功
- [ ] 在预发布环境执行迁移成功
- [ ] 关键表行数对比（迁移前后）：users/posts/private_messages/notifications
- [ ] 索引创建前后查询性能对比（EXPLAIN）

### 2.3 配置管理

- [ ] `application.yml` / `application-db.yml` / `application-mock.yml` 仅含占位符
- [ ] 生产环境变量已注入：DB_PASSWORD/JWT_SECRET/WECHAT_APPID/WECHAT_SECRET/REDIS_PASSWORD 等
- [ ] `apps/api/.env.example` 完整覆盖 11+ 类变量
- [ ] 微信小程序 AppID 已切换为生产 AppID（`build-mp-weixin.bat` + `inject-wx-appid.mjs`）
- [ ] 服务器地址已切换为生产域名（`config/api.ts`）

---

## 3. 构建产物（Build Artifacts）

### 3.1 客户端构建

- [ ] `dist/build/mp-weixin/` 目录生成
- [ ] 主包体积 < 2MB（微信小程序限制）
- [ ] 分包总体积 < 16MB（微信小程序限制）
- [ ] 无未引用资源（图片/字体/JSON）
- [ ] `app.json` 配置正确（pages/window/tabBar/permission/requiredPrivateInfos）
- [ ] `project.config.json` AppID 正确
- [ ] `sitemap.json` 配置正确（允许微信索引）

### 3.2 Admin 构建

- [ ] `apps/admin/dist/` 目录生成
- [ ] 静态资源已上传至 nginx 配置目录
- [ ] nginx 配置已 review（gzip/cache/SPA fallback）
- [ ] HTTPS 证书已配置

### 3.3 API 构建

- [ ] `apps/api/target/*.jar` 生成
- [ ] Docker 镜像已构建并推送：`docker build -t campus-love-api:v1.0.0 .`
- [ ] 镜像已推送至镜像仓库（Docker Hub / 阿里云 ACR）
- [ ] 镜像签名验证通过（如启用 cosign）

### 3.4 数据库备份

- [ ] 发布前 1 小时执行手动备份：`./scripts/backup-mysql.sh`
- [ ] 备份文件完整性校验：`gzip -t <file>.sql.gz && echo OK`
- [ ] 备份已同步至异地：`rsync -avz /backup/ backup-server:/data/campus-love/mysql/`
- [ ] 备份已上传至对象存储（OSS/COS）

---

## 4. 部署（Deployment）

### 4.1 预发布环境

- [ ] 预发布环境已部署最新版本
- [ ] 预发布环境数据库已迁移
- [ ] 预发布环境健康检查通过：`curl https://staging.example.com/actuator/health`
- [ ] 预发布环境 Swagger UI 可访问
- [ ] QA 已完成回归测试（详见 §5）
- [ ] 性能测试通过（k6 负载测试，详见 `docs/performance-testing-guide.md`）

### 4.2 生产环境部署

- [ ] 维护页面已启用（nginx 切换流量到 503 页面）
- [ ] 数据库迁移执行：`mvn flyway:migrate -Dflyway.url=$PROD_DB_URL`
- [ ] API 滚动部署：`docker compose up -d --no-deps api`
- [ ] Admin 静态资源部署：`rsync -avz apps/admin/dist/ /var/www/admin/`
- [ ] 客户端构建产物已上传至微信开发者工具
- [ ] 微信小程序提审已通过（详见 §6）
- [ ] 微信小程序已发布（线上版本切换）

### 4.3 部署后验证

- [ ] 生产环境健康检查：`curl https://api.example.com/actuator/health` 返回 `{"status":"UP"}`
- [ ] 关键端点冒烟测试：登录/匹配/聊天/上传
- [ ] 监控面板正常：Grafana Dashboard 显示新版本
- [ ] 日志无 ERROR（持续 30 分钟观察）
- [ ] 维护页面已下线

---

## 5. 手动冒烟测试（Manual Smoke）

### 5.1 客户端 - 微信小程序真机

- [ ] 微信登录成功（真机端到端）
- [ ] 隐私协议弹窗正常（首次登录）
- [ ] 首页 dashboard 显示：课表/AI 计划/推荐/活动入口
- [ ] 推荐匹配创建成功
- [ ] 推荐匹配状态推进正常
- [ ] 临时聊天创建成功
- [ ] 联系方式交换请求与响应正常
- [ ] 会话结束与列表刷新正常
- [ ] 个人主页 VIP 状态正确显示
- [ ] 照片墙上传/删除正常（6 张上限）
- [ ] 个人视频上传正常
- [ ] 签到成功，连续天数正确
- [ ] 反悔功能正常（每日 1 次限制）

### 5.2 客户端 - H5

- [ ] Real-mode H5 冒烟测试通过：`pnpm --filter @campus-love/client run dev:h5:real`
- [ ] 本地 Spring API 联调通过
- [ ] 所有页面响应式适配（375px/768px/1024px）

### 5.3 Admin 后台

- [ ] 管理员登录成功
- [ ] Dashboard 统计数据加载（用户/匹配/帖子/反馈）
- [ ] 用户列表搜索/筛选/分页正常
- [ ] 用户封禁/解禁操作正常
- [ ] 帖子审核流程正常（通过/拒绝/删除）
- [ ] 举报处理流程正常
- [ ] 反馈列表展示真实数据
- [ ] 审计日志记录正确（含 admin 操作）
- [ ] 敏感词导入功能正常
- [ ] 系统配置更新后广播刷新事件
- [ ] 匹配配置/通知配置更新正常
- [ ] 认证审核流程正常

### 5.4 实时通信

- [ ] WebSocket 连接成功（`wss://api.example.com/ws/chat?token=xxx`）
- [ ] 消息发送/接收实时
- [ ] 未读消息计数实时更新
- [ ] 弱网断线重连正常（指数退避）
- [ ] 通知推送实时

### 5.5 媒体功能

- [ ] 图片上传成功（JPEG/PNG/GIF/WebP，≤10MB）
- [ ] 视频上传成功（MP4/WebM，≤50MB）
- [ ] 鉴权代理读取本人媒体成功
- [ ] 访问他人媒体返回 403
- [ ] Path Traversal 攻击被拦截（`/../etc/passwd` 等）
- [ ] `<image src>` 携带 `?token=` 正常加载

---

## 6. 微信小程序提审（WeChat Mini Program Submission）

### 6.1 提审前自检

- [ ] 服务类目正确（社交 > 社交资讯）
- [ ] 小程序名称/简介/标签已填写
- [ ] 头像与简介合规（无违规内容）
- [ ] 隐私协议页面已配置（`pages/privacy/index`）
- [ ] 用户协议页面已配置（`pages/agreement/index`）
- [ ] 客服联系方式已填写
- [ ] 服务器域名已配置（request/socket/uploadFile/downloadFile）
- [ ] 业务域名已配置（H5 跳转用）
- [ ] `manifest.json` 含 `__usePrivacyCheck__: true`
- [ ] `app.json` 含 `requiredPrivateInfos`（按实际使用筛选）

### 6.2 合规自检（详见 P0 Task 0.7.2）

- [ ] 24 项微信小程序合规检查全部通过
- [ ] 隐私接口 7 个文件 9 处调用前调用 `ensurePrivacyAuthorized()`
- [ ] 用户数据采集与使用说明完整
- [ ] 第三方 SDK 列表完整（如有）
- [ ] 未使用被禁 API（如 `wx.getUserInfo` 直接弹窗）
- [ ] 内容审核机制就位（敏感词过滤 + 人工审核）
- [ ] 举报与申诉通道畅通

### 6.3 提审材料

- [ ] 测试账号（管理员 + 普通用户各 1 个）
- [ ] 测试账号密码已填写
- [ ] 功能演示视频（核心旅程 3-5 分钟）
- [ ] 类目资质文件（如需）
- [ ] 服务器域名 ICP 备案截图
- [ ] 业务域名 ICP 备案截图

### 6.4 提审流程

- [ ] 上传代码至微信开发者工具
- [ ] 体验版扫码测试（管理员 + 体验成员）
- [ ] 提交审核（版本管理 > 提交审核）
- [ ] 审核反馈跟踪（7 个工作日内）
- [ ] 审核通过后发布（全量发布或灰度发布，详见 `docs/GRADUAL-RELEASE.md`）

### 6.5 提审后

- [ ] 线上版本回归测试
- [ ] 客服反馈渠道畅通
- [ ] 紧急下线预案就位（详见 `docs/GRADUAL-RELEASE.md` §6）

---

## 7. 监控与告警（Monitoring & Alerting）

### 7.1 监控面板

- [ ] Grafana Dashboard 显示新版本标签
- [ ] JVM Health 面板正常（CPU/内存/线程/GC）
- [ ] 业务指标面板正常（滑动/匹配/上传/消息）
- [ ] 错误率面板正常（< 1%）
- [ ] 慢查询面板正常（P99 < 2s）
- [ ] 第三方可用性面板正常（微信 API/AI API）

### 7.2 告警规则

- [ ] Prometheus 抓取配置正确（`docker/prometheus/prometheus.yml`）
- [ ] Alertmanager 规则已加载（`docker/prometheus/rules/alert-rules.yml`）
- [ ] 告警通知渠道正确（钉钉/企业微信/邮件）
- [ ] 告警阈值合理（P99 > 2s / 错误率 > 1% / 磁盘 > 80% / 内存 > 85%）
- [ ] 告警静默期已配置（维护窗口期间）

### 7.3 日志

- [ ] 日志收集正常（ELK / Loki）
- [ ] TraceId 贯穿日志链路
- [ ] 敏感字段脱敏生效（token/password/openid）
- [ ] 访问日志记录正常（ACCESS_FILE appender）
- [ ] 错误日志告警触发

---

## 8. 文档（Documentation）

### 8.1 用户文档

- [ ] `docs/USER-GUIDE.md` 已更新
- [ ] FAQ 文档已更新
- [ ] 隐私政策已更新（如涉及数据采集变更）
- [ ] 用户协议已更新（如涉及条款变更）

### 8.2 运维文档

- [ ] `docs/ADMIN-GUIDE.md` 已更新
- [ ] `docs/TROUBLESHOOTING.md` 已更新
- [ ] `docs/CI-CD.md` 已更新
- [ ] `docs/DR/DRP.md` 已更新
- [ ] `docs/DR/restore-procedure.md` 已更新
- [ ] `docs/GRADUAL-RELEASE.md` 已更新
- [ ] `docs/API-CONTRACT.md` 已同步最新接口
- [ ] `CHANGELOG.md` 已更新
- [ ] ADR 文档已更新（`docs/adr/`）

### 8.3 开发文档

- [ ] `README.md` 已更新
- [ ] `DEPLOYMENT.md` 已更新
- [ ] `docs/project-structure-detailed.md` 已更新
- [ ] OpenAPI 注解指南已更新（`docs/OPENAPI-ANNOTATION-GUIDE.md`）

---

## 9. 风险评审（Risk Review）

### 9.1 风险登记

- [ ] 已知问题记录在 `docs/defect-log-template.md`
- [ ] 风险评估完成（高/中/低）
- [ ] 缓解措施已制定
- [ ] 回滚方案已制定（详见 §10）

### 9.2 Go/No-Go 评审

- [ ] Go/No-Go 评审会议已召开（发布前 24 小时）
- [ ] 评审记录已归档（`docs/go-no-go-template.md`）
- [ ] 所有评审人员签字（Tech Lead / QA Lead / Product Lead / DevOps Lead）
- [ ] 任何 No-Go 项已修复或显式延期

---

## 10. 回滚预案（Rollback Plan）

### 10.1 应用回滚

- [ ] 上一版本 Docker 镜像保留（`campus-love-api:v0.9.0`）
- [ ] 回滚命令已准备：`docker compose up -d --no-deps api --image campus-love-api:v0.9.0`
- [ ] 客户端上一版本保留（微信小程序版本管理）
- [ ] Admin 静态资源上一版本保留（`/var/www/admin/v0.9.0/`）

### 10.2 数据库回滚

- [ ] Flyway 回滚脚本已准备（U{version}__xxx.sql）
- [ ] 数据库备份已确认可用（发布前 1 小时备份）
- [ ] 回滚演练在测试环境执行成功

### 10.3 配置回滚

- [ ] 配置版本控制（GitOps）
- [ ] 回滚命令已准备：`git checkout HEAD~1 -- apps/api/src/main/resources/`

### 10.4 紧急下线

- [ ] 微信小程序紧急下线流程已确认（微信公众平台 > 版本管理 > 撤回审核）
- [ ] API 服务紧急停服流程已确认（`docker compose stop api`）
- [ ] 维护页面启用流程已确认（nginx 切换）
- [ ] 通知用户渠道已准备（公告/推送/客服）

---

## 11. 发布后（Post-Release）

### 11.1 24 小时内

- [ ] 监控指标正常（错误率 < 0.1%，P99 < 2s）
- [ ] 关键告警未触发
- [ ] 客服反馈收集（CR/IR 数量 < 10）
- [ ] 灰度发布进度跟踪（详见 `docs/GRADUAL-RELEASE.md`）
- [ ] 发布总结已发送至团队

### 11.2 7 天内

- [ ] 全量发布（如使用灰度策略）
- [ ] 用户反馈分析
- [ ] 性能数据分析
- [ ] 监控指标基线更新
- [ ] Post-mortem 会议（如有重大问题）

### 11.3 30 天内

- [ ] 发布 retrospective 会议
- [ ] CHANGELOG.md 归档至 `docs/changelog-archive/`
- [ ] 经验教训沉淀至 `docs/lessons-learned.md`
- [ ] 下个版本规划启动

---

## 12. 验收签字（Sign-off）

| 角色 | 姓名 | 签字 | 日期 |
|------|------|------|------|
| Tech Lead | TBD | ______ | ______ |
| QA Lead | TBD | ______ | ______ |
| Product Lead | TBD | ______ | ______ |
| DevOps Lead | TBD | ______ | ______ |
| Security Lead | TBD | ______ | ______ |
| Project Owner | TBD | ______ | ______ |

---

## 附录 A：常用命令速查

```bash
# 客户端构建
pnpm --filter @campus-love/client run build:mp-weixin
pnpm --filter @campus-love/client run build:h5

# Admin 构建
pnpm --filter @campus-love/admin run build

# 后端构建
mvn -pl apps/api clean package -DskipTests

# Docker 镜像构建
docker build -t campus-love-api:v1.0.0 -f apps/api/Dockerfile .
docker build -t campus-love-admin:v1.0.0 -f apps/admin/Dockerfile .

# 数据库备份
./scripts/backup-mysql.sh
./scripts/backup-mysql.sh --dry-run

# 数据库迁移
mvn -pl apps/api flyway:migrate -Dflyway.url=$DB_URL -Dflyway.user=$DB_USER -Dflyway.password=$DB_PASSWORD

# 健康检查
curl -fsS https://api.example.com/actuator/health
curl -fsS https://staging.example.com/actuator/health

# 回滚
docker compose up -d --no-deps api  # 使用上一版本镜像
mvn -pl apps/api flyway:undo -Dflyway.url=$DB_URL  # 如有 undo 脚本
```

---

## 附录 B：检查清单状态约定

- `[x]`：已通过验证
- `[ ]`：未通过或未验证
- `[~]`：部分通过，附说明
- `[/]`：不适用，附说明

任何 `[ ]` 或 `[~]` 项均需在 Go/No-Go 评审中讨论，决定是否阻塞发布。
