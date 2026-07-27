# CI/CD 统一发布流程（Task 8.4.2）

> 本文档定义校园恋爱小程序项目的持续集成与持续部署流程，覆盖从代码提交到生产部署的完整链路。

---

## 一、整体架构

### 1.1 工具链

| 阶段 | 工具 | 触发条件 | 产物 |
|------|------|----------|------|
| 代码托管 | GitHub | push / PR | 代码评审记录 |
| 持续集成（CI） | GitHub Actions | push 到 main/release/hotfix 分支或 PR | 测试报告、构建产物 |
| 容器化 | Docker multi-stage build | CI 通过后 | API/Admin 镜像 |
| 编排部署 | Docker Compose / K8s | 镜像推送后 | 运行实例 |
| 监控告警 | Prometheus + Grafana + Alertmanager | 服务启动后 | 监控面板、告警通知 |
| 数据备份 | cron + mysqldump | 每日凌晨 2 点 | 备份文件（保留 7 天） |

### 1.2 环境分层

| 环境 | Profile | 用途 | 数据库 | 访问范围 |
|------|---------|------|--------|----------|
| 本地开发 | mock | 前端独立开发 | 内存/Mock | 开发者本机 |
| 集成测试 | real | 联调测试 | 测试库 | 内网 |
| 预发布 | real | 发布前验收 | 预发布库 | 内网 + QA |
| 生产 | real | 线上服务 | 生产库 | 公网 |

---

## 二、分支策略

### 2.1 分支模型（Git Flow 简化版）

```
main          ────────●──────────────●─────────────●────────▶ 生产
                       │              │             │
release/v0.1  ────●───┴──────────●───┘             │
                   │              │                 │
hotfix/v0.1.1  ───●──────────────●─────────────────┘
                   │
feature/xxx    ───●─────────●─────────●
                            │
                            ▼
                          PR 合并到 main
```

### 2.2 分支命名规范

- `main`：生产分支，受保护，仅通过 PR 合并
- `release/v{version}`：发布分支，仅修复 bug，不新增功能
- `hotfix/v{version}`：紧急修复分支，从 main 切出，修复后合并回 main 与 release
- `feature/{task-id}-{slug}`：功能分支，如 `feature/p8-dockerize`
- `fix/{task-id}-{slug}`：修复分支，如 `fix/jwt-token-blacklist`

### 2.3 提交规范（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

**type 取值：**

- `feat`：新功能
- `fix`：Bug 修复
- `docs`：文档更新
- `style`：代码格式（不影响功能）
- `refactor`：重构（既不是 feat 也不是 fix）
- `test`：新增/修改测试
- `chore`：构建/工具链/依赖变更
- `ci`：CI 配置变更
- `perf`：性能优化
- `revert`：回滚提交

**示例：**

```
feat(auth): 添加微信登录 code2session 链路

- 新增 WechatAuthController 处理 /api/v1/auth/wechat
- 集成 WeChatClient 调用微信开放平台
- 失败抛 WechatLoginException，统一错误码

Closes #123
```

---

## 三、CI 流程（GitHub Actions）

### 3.1 触发条件

- **push** 到 `main` / `release/*` / `hotfix/*` 分支
- **pull_request** 到任意分支

### 3.2 Job 结构

CI 流程定义在 `.github/workflows/ci.yml`，包含 3 个并行 Job：

#### Job 1: `verify-phase01`（前端 + 后端验证）

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| Checkout | `actions/checkout@v4` | - |
| Setup pnpm | `pnpm/action-setup@v4` | - |
| Setup Node | `actions/setup-node@v4` (v20, cache=pnpm) | - |
| Setup Java | `actions/setup-java@v4` (temurin 17, cache=maven) | - |
| 安装依赖 | `pnpm install --frozen-lockfile` | 锁文件不一致则失败 |
| 原型与结构测试 | `pnpm test` | 失败则 CI 中止 |
| OpenAPI 契约 lint | `pnpm run lint:openapi` | 失败则 CI 中止 |
| Spectral lint | `pnpm run lint:openapi:spectral` | 失败则 CI 中止 |
| 客户端 typecheck | `pnpm --filter @campus-love/client run typecheck` | 失败则 CI 中止 |
| 客户端构建 | `pnpm run verify:client-builds` | 验证 H5 + mp-weixin 构建 |
| 后端测试 | `pnpm run api:test` | 失败则 CI 中止 |

#### Job 2: `flyway-validate`（数据库迁移验证）

| 步骤 | 命令 | 失败处理 |
|------|------|----------|
| 启动 MySQL 8.0 service container | - | 等待健康检查通过 |
| Flyway info | `redgate/flyway:12.6.1-alpine info` | 仅打印状态，不阻塞 |
| Flyway migrate | `redgate/flyway:12.6.1-alpine migrate` | 失败则 CI 中止 |
| Flyway validate | `redgate/flyway:12.6.1-alpine validate` | 验证 checksum 一致 |

#### Job 3: `secret-scan`（密钥扫描）

| 步骤 | 工具 | 失败处理 |
|------|------|----------|
| Checkout（含完整历史） | `actions/checkout@v4` (fetch-depth=0) | - |
| Gitleaks 扫描 | `gitleaks/gitleaks-action@v2` | 发现密钥则 CI 中止 |

### 3.3 CI 状态徽章

在 `README.md` 顶部添加：

```markdown
![CI](https://github.com/{org}/{repo}/actions/workflows/ci.yml/badge.svg)
```

---

## 四、CD 流程（持续部署）

### 4.1 镜像构建

CI 通过后，在 `main` / `release/*` 分支触发镜像构建：

```bash
# API 镜像（多阶段构建：Maven build → JRE runtime）
docker build -f apps/api/Dockerfile \
  -t campus-love-api:${GIT_SHA} \
  -t campus-love-api:latest \
  apps/api/

# Admin 镜像（多阶段构建：Node build → nginx 静态托管）
docker build -f apps/admin/Dockerfile \
  -t campus-love-admin:${GIT_SHA} \
  -t campus-love-admin:latest \
  apps/admin/
```

**镜像大小预期：**

- `campus-love-api`：约 250-300 MB（基于 eclipse-temurin:17-jre，分层打包）
- `campus-love-admin`：约 50-80 MB（基于 nginx:1.27-alpine）

### 4.2 镜像推送

```bash
# 登录镜像仓库（GitHub Container Registry / Docker Hub / 私有仓库）
echo $CR_PAT | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# 推送镜像
docker push ghcr.io/{org}/campus-love-api:${GIT_SHA}
docker push ghcr.io/{org}/campus-love-api:latest
docker push ghcr.io/{org}/campus-love-admin:${GIT_SHA}
docker push ghcr.io/{org}/campus-love-admin:latest
```

### 4.3 部署到目标环境

#### 方式一：Docker Compose（中小规模部署）

```bash
# SSH 到目标服务器
ssh deploy@production-host

# 拉取最新镜像
cd /opt/campus-love
docker compose pull api admin

# 滚动重启（保留旧容器直到新容器健康检查通过）
docker compose up -d --no-deps api admin

# 验证健康状态
docker compose ps
curl http://localhost:8080/actuator/health
```

#### 方式二：Kubernetes（大规模部署）

```bash
# 更新 Deployment 镜像 tag
kubectl set image deployment/campus-love-api \
  api=ghcr.io/{org}/campus-love-api:${GIT_SHA} \
  -n campus-love-prod

# 等待 Rollout 完成
kubectl rollout status deployment/campus-love-api \
  -n campus-love-prod \
  --timeout=300s

# 如需回滚
kubectl rollout undo deployment/campus-love-api \
  -n campus-love-prod
```

### 4.4 部署后验证

```bash
# 1. 健康检查
curl -f http://localhost:8080/actuator/health || exit 1

# 2. 关键接口冒烟测试
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"'$ADMIN_PASSWORD'"}' \
  | jq -r '.data.token')
test -n "$TOKEN" || exit 1

# 3. 监控指标确认
curl -s http://localhost:9090/api/v1/query?query=up | jq '.data.result[].metric.job'
```

---

## 五、灰度发布策略

### 5.1 API 版本化

- 所有 API 路径以 `/api/v1/` 开头
- 引入破坏性变更时新增 `/api/v2/` 路径，保留 v1 至少 6 个月
- 客户端通过 `VITE_API_BASE_URL` 切换版本

### 5.2 用户分组（按 OpenID 哈希）

```java
// 在 RealAuthService 中根据 openId 哈希值分流
String openId = user.getOpenId();
int hash = Math.abs(openId.hashCode()) % 100;
if (hash < canaryPercent) {
    // 灰度用户：使用新版本逻辑
} else {
    // 普通用户：保持旧版本逻辑
}
```

### 5.3 灰度发布步骤

1. **0% 灰度**：部署到生产环境，但不开放任何流量（canaryPercent=0）
2. **5% 灰度**：开放 5% 用户，观察 30 分钟（监控错误率、P99 延迟、业务指标）
3. **25% 灰度**：开放 25% 用户，观察 1 小时
4. **50% 灰度**：开放 50% 用户，观察 2 小时
5. **100% 灰度**：全量发布

**回滚条件：**

- 错误率 > 1%（持续 5 分钟）
- P99 响应时间 > 2s（持续 5 分钟）
- 业务核心指标下降 > 10%（如登录成功率、匹配成功率）

---

## 六、数据库迁移（Flyway）

### 6.1 迁移脚本规范

- 文件位置：`database/flyway/sql/`
- 命名规范：`V{yyyy.MM.dd.HHmm}__{description}.sql`
- 必须幂等：使用 `IF NOT EXISTS` 或 `information_schema` 检查
- 必须包含 `DOWN` 回滚脚本注释

### 6.2 迁移执行顺序

```
应用启动 → Flyway migrate → 应用就绪
              │
              ▼
         检查 flyway_schema_history
              │
              ▼
         执行未应用的迁移
              │
              ▼
         记录到 flyway_schema_history
```

### 6.3 迁移失败处理

```bash
# 查看迁移状态
docker compose exec api ./mvnw flyway:info

# 修复失败记录（删除 flyway_schema_history 中的失败行）
docker compose exec api ./mvnw flyway:repair

# 修复脚本后重新迁移
docker compose exec api ./mvnw flyway:migrate
```

---

## 七、监控与告警

### 7.1 监控端点

| 服务 | URL | 端口 | 用途 |
|------|-----|------|------|
| Spring Boot Actuator | `/actuator/health` `/actuator/prometheus` | 8080 | 应用健康、指标暴露 |
| Prometheus | `http://prometheus:9090` | 9090 | 指标采集与查询 |
| Grafana | `http://grafana:3001` | 3001 | 可视化面板 |
| Alertmanager | `http://alertmanager:9093` | 9093 | 告警路由与通知 |
| Node Exporter | `http://node-exporter:9100` | 9100 | 主机指标 |

### 7.2 告警规则（详见 `docker/prometheus/rules/alert-rules.yml`）

| 告警名 | 触发条件 | 持续时间 | 严重级别 | 通知方式 |
|--------|----------|----------|----------|----------|
| ApiHighErrorRate | 错误率 > 1% | 5m | CRITICAL | 邮件 + 钉钉 |
| ApiHighP99Latency | P99 > 2s | 5m | WARNING | 邮件 |
| ApiInstanceDown | 实例宕机 | 1m | CRITICAL | 邮件 + 钉钉 |
|JvmHighMemoryUsage | JVM 堆使用 > 85% | 5m | WARNING | 邮件 |
| MysqlSlowQuery | 慢查询 > 1s | 5m | WARNING | 邮件 |
| MysqlConnectionSaturation | 连接使用 > 80% | 5m | CRITICAL | 邮件 + 钉钉 |
| DiskSpaceLow | 磁盘剩余 < 20% | 5m | CRITICAL | 邮件 + 钉钉 |
| ThirdPartyApiDown | 第三方 API 不可用 | 2m | WARNING | 邮件 |

### 7.3 告警通知渠道

- **邮件**：通过 Alertmanager SMTP 配置，发送到运维邮箱
- **钉钉/企业微信**：通过 Alertmanager webhook 配置，发送到运维群
- **值班电话**：仅 CRITICAL 级别（如生产服务宕机）

---

## 八、数据备份与恢复

### 8.1 备份策略

| 备份类型 | 频率 | 保留 | 存储 |
|----------|------|------|------|
| 全量备份 | 每日凌晨 2:00 | 7 天 | 本地 + 异地 |
| 增量备份（binlog） | 实时 | 3 天 | 本地 |
| 异地同步 | 全量备份后 | 30 天 | OSS / S3 |

### 8.2 备份脚本

```bash
# 手动触发备份
docker compose --profile backup up -d
docker compose exec db-backup /backup/scripts/backup-mysql.sh

# 验证备份文件
docker compose exec db-backup ls -lh /backup/
docker compose exec db-backup gzip -t /backup/campus_love-2026-07-26-020000.sql.gz
```

### 8.3 恢复演练

详见 `docs/DR/restore-procedure.md`，建议每季度执行一次完整恢复演练。

---

## 九、回滚流程

### 9.1 应用回滚

```bash
# Docker Compose 回滚
docker compose pull api:previous-tag
docker compose up -d --no-deps api

# Kubernetes 回滚
kubectl rollout undo deployment/campus-love-api -n campus-love-prod
```

### 9.2 数据库回滚

**重要：数据库回滚必须谨慎，需 DBA 评审**

```bash
# 1. 备份当前数据库（回滚前必做）
docker compose exec db-backup /backup/scripts/backup-mysql.sh

# 2. 执行 DOWN 脚本（手动，参考迁移文件末尾注释）
mysql -h 127.0.0.1 -u campus -p campus_love < V2026.xx.xxxx__down.sql

# 3. 修复 flyway_schema_history
docker compose exec api ./mvnw flyway:repair
```

### 9.3 配置回滚

```bash
# 通过 Git revert 回滚配置文件
git revert <commit-sha>
git push origin main

# 重启服务使配置生效
docker compose restart api
```

---

## 十、发布检查清单

发布前请逐项确认（详见 `docs/release-checklist-template.md`）：

- [ ] CI 全部 Job 通过（verify-phase01 / flyway-validate / secret-scan）
- [ ] 测试覆盖率达标（前端 ≥ 80%，后端 ≥ 70%）
- [ ] Flyway 迁移在预发布环境验证通过
- [ ] 镜像构建并推送成功
- [ ] 灰度发布计划已制定（5% → 25% → 50% → 100%）
- [ ] 监控告警规则已更新
- [ ] 回滚预案已准备
- [ ] 数据库备份已完成
- [ ] 运维团队已通知
- [ ] 发布窗口已确认（避开业务高峰）

---

## 十一、附录

### 11.1 相关文件

- CI 配置：`.github/workflows/ci.yml`
- API Dockerfile：`apps/api/Dockerfile`
- Admin Dockerfile：`apps/admin/Dockerfile`
- 编排配置：`docker-compose.yml`
- 环境变量模板：`.env.example`
- 监控配置：`docker/prometheus/`、`docker/grafana/`、`docker/alertmanager/`
- 备份脚本：`scripts/backup-mysql.sh`
- 恢复文档：`docs/DR/restore-procedure.md`
- 部署指南：`DEPLOYMENT.md`

### 11.2 常用命令速查

```bash
# 本地启动全部服务
docker compose up -d

# 查看服务日志
docker compose logs -f api

# 进入容器调试
docker compose exec api bash

# 重新构建并启动
docker compose up -d --build api

# 清理全部容器与数据卷（谨慎！）
docker compose down -v

# 触发 CI 手动运行
gh workflow run ci.yml

# 查看 CI 运行状态
gh run list
```
