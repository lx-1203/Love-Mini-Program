# 部署指南

## 前置要求

- Node.js 20+ (前端)
- Java 17+ (后端)
- MySQL 8.0+ (real profile 必需)
- Redis 7+ (real profile 必需)
- Maven 3.8+ (后端构建，已内置 mvnw wrapper)
- pnpm 9+ (前端构建，统一包管理器)
- Docker 24+ & Docker Compose 2.20+ (容器化部署)

## 环境变量配置

### 前端环境变量

创建 `apps/client/.env` 文件（mock 模式，无需后端）：

```bash
VITE_API_MODE=mock
VITE_APP_VERSION=v0.1.0
```

创建 `apps/client/.env.real` 文件（真实模式，需要后端）：

```bash
VITE_API_MODE=real
VITE_API_BASE_URL=https://api.campuslove.example.com/api
VITE_APP_VERSION=v0.1.0
```

### 后端环境变量

复制 `.env.example` 为 `.env`，按注释提示填写真实值：

```bash
cp .env.example .env
# 编辑 .env 文件，至少配置以下必填项：
# - JWT_SECRET（≥ 32 字符，建议 openssl rand -base64 48 生成）
# - DB_URL / DB_USERNAME / DB_PASSWORD
# - REDIS_PASSWORD
# - WECHAT_APPID / WECHAT_SECRET（小程序部署必填）
# - ADMIN_INITIAL_PASSWORD_HASH（首次部署必填）
```

所有环境变量的语义与默认值参见 `.env.example` 注释。

## 本地开发

### 启动后端（Mock 模式）

```bash
# Windows
cd apps/api
.\mvnw.cmd spring-boot:run -Dspring.profiles.active=mock

# macOS/Linux
cd apps/api
./mvnw spring-boot:run -Dspring.profiles.active=mock
```

后端将在 http://localhost:8080 启动。

### 启动后端（Real 模式）

确保 MySQL / Redis 已启动（可使用 `docker compose up -d mysql redis`），然后：

```bash
cd apps/api
.\mvnw.cmd spring-boot:run -Dspring.profiles.active=real
```

### 启动前端（H5 模式）

```bash
# Mock 模式
pnpm client:dev:h5

# Real 模式
pnpm client:dev:h5:real
```

前端将在 http://localhost:5173 启动。

### 启动 Admin 后台

```bash
cd apps/admin
pnpm install
pnpm dev
```

Admin 后台将在 http://localhost:5180 启动。

## 微信小程序构建

```bash
# Windows
build-mp-weixin.bat

# 或手动构建
pnpm --filter @campus-love/client run build:mp-weixin
```

构建产物在 `apps/client/dist/build/mp-weixin` 目录。
打开微信开发者工具，导入上述目录即可预览。

## 生产部署

### 后端部署

#### 1. 构建 JAR 包

```bash
cd apps/api
.\mvnw.cmd clean package -DskipTests
```

构建产物：`apps/api/target/campus-love-api-0.1.0.jar`

#### 2. 运行（直接 JVM 启动）

**JVM 参数必须在 `-jar` 之前**，否则会被当作应用参数而忽略：

```bash
# 正确写法：JVM 参数（-Xms/-Xmx/-D...）在 -jar 之前
java -Xms512m -Xmx2g \
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \
     -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/var/log/campus-love-api/heap-dump.hprof \
     -Dspring.profiles.active=real \
     -Dserver.port=8080 \
     -jar target/campus-love-api-0.1.0.jar

# 错误写法（JVM 参数放在 -jar 之后会被 Spring 当作命令行参数，不生效）：
# java -jar target/campus-love-api-0.1.0.jar -Xms512m -Xmx2g  # ❌ -Xms/-Xmx 不生效
```

#### 3. 敏感配置注入

敏感配置通过环境变量注入（推荐），不要通过命令行参数传递：

```bash
# 通过环境变量（推荐）
export JWT_SECRET="your-production-secret-32-chars-min"
export DB_URL="jdbc:mysql://db-host:3306/campus_love?useSSL=true"
export DB_USERNAME="campus"
export DB_PASSWORD="your-strong-db-password"
export REDIS_PASSWORD="your-redis-password"
export WECHAT_APPID="wx1234567890abcdef"
export WECHAT_SECRET="your-wechat-app-secret"
java -Xms512m -Xmx2g -Dspring.profiles.active=real -jar campus-love-api-0.1.0.jar

# 或通过 .env 文件（需配合 systemd EnvironmentFile 或 docker-compose env_file）
```

### 前端部署

#### 1. 构建 H5 版本

```bash
pnpm install --frozen-lockfile
pnpm client:build:h5:real
```

构建产物：`apps/client/dist/build/h5`

#### 2. 部署到 Web 服务器

将 `dist/build/h5` 目录部署到 Nginx / Apache / CDN，配置 SPA fallback 到 `index.html`。

参考 `apps/admin/docker/nginx.conf` 配置 API 代理与静态资源托管。

## Docker 部署

### 使用 docker-compose 一键部署

```bash
# 复制环境变量模板并填写真实值
cp .env.example .env
# 编辑 .env，至少修改所有 *PASSWORD* / *SECRET* / *_KEY 字段

# 启动全部服务（API + Admin + MySQL + Redis + 监控）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f api

# 停止全部服务
docker compose down
```

### 仅启动基础设施（开发联调）

```bash
# 仅启动 MySQL + Redis，API 与前端在本地运行
docker compose up -d mysql redis
```

### 启动监控告警

```bash
# 启动 Prometheus + Grafana + Alertmanager + Node Exporter
docker compose --profile monitoring up -d

# Grafana 访问地址：http://localhost:3001
# 默认账号：admin / .env 中 GRAFANA_ADMIN_PASSWORD
```

### 启动数据库备份

```bash
# 启动 db-backup 服务（每日凌晨 2 点自动备份）
docker compose --profile backup up -d

# 手动触发一次备份
docker compose exec db-backup /backup/scripts/backup-mysql.sh
```

## 数据库初始化

Flyway 迁移在应用启动时自动执行（`spring.flyway.enabled=true`），无需手动运行。

如需手动验证迁移状态：

```bash
cd database/flyway
.\flyway migrate -configFiles=flyway.toml \
  -Url="jdbc:mysql://127.0.0.1:3306/campus_love" \
  -User=campus -Password=your-password
```

## 配置文件分离（Task 8.4.5）

后端配置文件按以下原则分离：

| 文件 | 用途 | 是否包含敏感信息 |
|------|------|------------------|
| `application.yml` | 主配置，包含非敏感默认值与环境变量占位 | 否 |
| `application-mock.yml` | Mock profile 配置（开发环境） | 否 |
| `application-db.yml` | Real profile 配置（数据库/Redis/Flyway） | 否（仅占位符） |
| `application-secret.yml` | 敏感配置（密钥/密码），**不入库** | 是 |

**敏感配置注入方式（按优先级）：**

1. **环境变量**（推荐）：通过 `JWT_SECRET` / `DB_PASSWORD` 等环境变量注入
2. **密钥管理服务**（生产）：通过 Vault / AWS Secrets Manager / Kubernetes Secrets 注入
3. **`.env` 文件**（本地开发）：项目根目录的 `.env` 文件，已加入 `.gitignore`

**禁止做法：**

- ❌ 将真实密钥硬编码到 `application.yml` / `application-db.yml`
- ❌ 将含密钥的 `.env` 文件提交到版本控制系统
- ❌ 在 Dockerfile 中通过 `ENV` 指令硬编码密钥

## 验证部署

### 1. 健康检查

```bash
curl http://localhost:8080/actuator/health
# 期望返回：{"status":"UP"}
```

### 2. 接口验证

```bash
# 无需认证的接口
curl http://localhost:8080/api/v1/auth/health

# 需要认证的接口（先获取 JWT）
TOKEN=$(curl -X POST http://localhost:8080/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' | jq -r '.data.token')
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/profile/me
```

### 3. Swagger UI（仅 ADMIN 可访问）

访问 http://localhost:8080/swagger-ui.html，使用管理员账号获取 JWT 后点击 "Authorize" 按钮填入。

### 4. 监控面板

- Prometheus：http://localhost:9090
- Grafana：http://localhost:3001
- Alertmanager：http://localhost:9093

## 故障排查

### 应用启动失败

1. 检查日志：`docker compose logs api` 或 `apps/api/logs/campus-love-api.log`
2. 验证环境变量：`echo $JWT_SECRET` / `echo $DB_PASSWORD`
3. 验证数据库连通性：`mysql -h 127.0.0.1 -u campus -p`
4. 验证 Redis 连通性：`redis-cli -h 127.0.0.1 -a $REDIS_PASSWORD ping`

### 数据库迁移失败

1. 查看 Flyway 状态：`docker compose exec api ./mvnw flyway:info`
2. 修复迁移脚本后重新运行：`docker compose exec api ./mvnw flyway:repair`
3. 参考 `docs/DR/restore-procedure.md` 进行数据恢复

### 更多文档

- 数据库恢复：`docs/DR/restore-procedure.md`
- CI/CD 流程：`docs/CI-CD.md`
- 发布检查清单：`docs/release-checklist-template.md`
