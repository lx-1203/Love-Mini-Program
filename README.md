# Campus Love Monorepo

> 校园恋爱小程序（Campus Love）—— 面向大学生的校园恋爱交友小程序，支持微信小程序（mp-weixin）与 H5 双端构建，配套 Spring Boot 后端 API 与 Vue 3 Admin 管理后台。

## 项目简介

校园恋爱小程序是一款面向在校大学生的轻量级恋爱交友产品，围绕「匹配 → 破冰 → 临时匿名聊天 → 圈子互动 → 反馈成长」核心闭环展开：

- **匹配**：基于校园、兴趣、作息偏好的滑动匹配，双向 liking 后解锁临时匿名聊天。
- **导航（纯匹配版）**：发现 / 附近 / 匹配 / 消息 / 我的 五 Tab，「匹配」为中央核心入口（绿色圆形浮岛 + 白色爱心）；社区（圈子/兴趣圈/校园/活动）降级为二级页。
- **临时匿名聊天（temporary anonymous chat）**：当前主线聊天形式，保护隐私、降低社交压力；持久 IM 不在当前切片范围。
- **临时会话图片（强匿名）**：伪名/默认头像/隐藏主页，仅会话双方可读，URL 不含 userId，T+48h 保留期清理；双方联系交换完成后揭示身份。
- **圈子（Village）**：帖子 / 活动 / 话题广场，支持图文、互动与举报；圈子公告由后台发布/下线/置顶，话题与回复支持 @ 同圈成员，话题点赞会通知作者。
- **反馈与成长**：用户反馈（投诉 / 建议 / 活动提案）+ 每日签到 + 成长体系，运营通过 Admin 后台审计与处置。
- **通知中心**：点赞/提及/评论/访客/匹配通知可读，支持全部/社交/内容筛选与全部已读；首页铃铛直达。
- **运营治理**：Admin 后台提供审计日志、举报处理、敏感词管理、用户管理、反馈分诊等能力。

> 当前主线聊天仍为 temporary anonymous chat（临时匿名聊天）；持久 IM、社交图谱、AI 回复 UI 不在当前切片范围。
> `GET /home/dashboard` 的 `aiPlan` 卡片位已复用为「每日一问」展示（R4-02081，见 `RealHomeService`）。

## 技术栈

| 端 | 主要技术 | 备注 |
|----|----------|------|
| 客户端（apps/client） | uni-app + Vue 3 + TypeScript + Pinia + vue-i18n | 支持 mp-weixin / H5 双端构建，使用 uni-ui 组件 |
| Admin 后台（apps/admin） | Vue 3 + TypeScript + Vite + Pinia + vue-router + vue-i18n + Element Plus | SPA，45 个视图；39 个单元测试 |
| 后端 API（apps/api） | Spring Boot 3 + Java 17 + Maven | JPA / MyBatis、Spring Security、JWT、Flyway、STOMP WebSocket |
| 数据库 | MySQL 8.0 + Redis 7 | Flyway 管理迁移，Redis 缓存 / 限流 / 会话 |
| 监控 | Prometheus + Grafana + Alertmanager + Node Exporter | Docker Compose `monitoring` profile |
| 容器化 | Docker + Docker Compose | 一键编排 api / admin / client / mysql / redis / 监控 / 备份 |
| CI/CD | GitHub Actions + Trivy + cosign | 镜像扫描与签名（见 `.github/workflows/ci.yml`） |
| 包管理 | pnpm 11.x（前端）+ Maven 3.9+（后端） | 详见 `packageManager` 与 `engines` 字段 |

## 目录结构

```
.
├── apps/
│   ├── client/                 # uni-app + Vue 3 + TS 客户端（mp-weixin / H5）
│   │   ├── src/
│   │   │   ├── pages/          # 主包页面（discover/likes/village/messages/profile 等）
│   │   │   ├── subpackages/    # 分包（setup/support/discover/legal）
│   │   │   ├── components/     # 通用组件
│   │   │   ├── stores/         # Pinia stores
│   │   │   ├── services/       # API / WebSocket / Sentry 等服务
│   │   │   ├── config/         # 集中配置入口（env / navigation / images 等）
│   │   │   ├── constants/      # 常量与路由
│   │   │   ├── i18n/           # 中英文国际化
│   │   │   └── theme/          # 设计 tokens 与全局样式
│   │   ├── .env.example        # 环境变量模板
│   │   └── manifest.json       # uni-app 配置（含 mp-weixin appid）
│   ├── admin/                  # Vue 3 + Vite 后台管理控制台
│   │   └── src/
│   │       ├── views/          # 审计日志 / 反馈 / 举报 / 敏感词 / 用户等
│   │       ├── api/            # 后台 API 客户端
│   │       ├── config/env.ts   # 后台环境变量统一封装
│   │       └── i18n/           # 中英文国际化
│   └── api/                    # Spring Boot 3 + Java 17 后端 API
│       ├── src/main/resources/
│       │   ├── application.yml       # 主配置（环境变量外部化）
│       │   ├── application-real.yml  # real profile：MySQL + Redis + Flyway
│       │   └── logback-spring.xml    # 日志配置
│       └── pom.xml
├── database/flyway/            # Flyway 迁移脚本
├── docs/                       # OpenAPI Schema（权威源）+ 微信提交材料清单
├── doc/                        # 部署 / 设计 / 变更日志（DEPLOYMENT.md 等）
├── docker/                     # 监控 / 备份 / Nginx 配置
├── docker-compose.yml          # 生产部署编排
├── tests/                      # 端到端 / 性能 / 安全测试
└── package.json                # monorepo 工作区配置
```

## 运行模式

- `mock mode`：客户端使用本地 fixtures，API 使用 Spring `mock` profile（不依赖 MySQL/Redis/Flyway）。
- `real mode`：客户端调用真实后端 API（`apps/client/.env.real`）。
- `real profile`：API 启用 MySQL + Flyway（`-Dspring-boot.run.profiles=real`，配置文件为 `application-real.yml`）。

## 快速开始

### 环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | `>=18.0.0 <23.0.0`（推荐 20 或 22） | 前端构建；pnpm 11 需要 ≥22.13，Docker/CI 用 node 20 |
| pnpm | `11.x`（见 `packageManager` 字段） | 前端包管理 |
| JDK | 17+ | 后端构建与运行 |
| Maven | 3.9+（或使用 `./mvnw` wrapper） | 后端构建 |
| MySQL | 8.0+ | real profile 数据库 |
| Redis | 7+ | real profile 缓存 |
| Docker | 24+ & Docker Compose 2.20+ | 容器化部署（可选） |

### 安装

```bash
# 1. 克隆仓库
git clone <repo-url> campus-love
cd campus-love

# 2. 安装前端依赖（client + admin 工作区）
pnpm install --frozen-lockfile

# 3. 后端依赖（首次构建时 Maven 自动下载）
cd apps/api
./mvnw -N io.takari:maven:wrapper    # 如需重新生成 wrapper（可选）
./mvnw dependency:resolve
cd ../..
```

### 启动（Mock 模式，最快体验）

```bash
# 终端 1：后端 API（mock profile，无需 MySQL/Redis）
npm run api:dev

# 终端 2：客户端 H5（mock 模式，本地 fixtures）
npm run client:dev:h5
# 浏览器访问 http://localhost:5173

# 终端 3（可选）：Admin 后台
cd apps/admin && pnpm install && pnpm dev
# 浏览器访问 http://localhost:5177
```

### 启动（Real 模式，接入真实后端）

```bash
# 1. 启动 MySQL + Redis（推荐 Docker Compose）
docker compose up -d mysql redis

# 2. 复制环境变量模板并填写真实值
cp .env.example .env
# 编辑 .env：至少配置 JWT_SECRET / DB_PASSWORD / REDIS_PASSWORD / MYSQL_ROOT_PASSWORD 等

cp apps/client/.env.example apps/client/.env.real
# 编辑 apps/client/.env.real：VITE_API_MODE=real、VITE_API_BASE_URL=http://127.0.0.1:8080/api

# 3. 启动后端（real profile）
cd apps/api
./mvnw spring-boot:run -Dspring-boot.run.profiles=real

# 4. 启动客户端（real 模式）
npm run client:dev:h5:real
```

## 开发指南

### 顶层命令（根目录 `package.json`）

```bash
npm run api:dev                # 后端 mock 模式启动
npm run api:test               # 后端单元测试
npm run client:dev:h5          # 客户端 H5 开发（mock）
npm run client:dev:h5:real     # 客户端 H5 开发（real）
npm run generate:openapi       # 从 OpenAPI YAML 生成前端类型
npm run lint:openapi           # OpenAPI YAML 本地校验
npm run lint:openapi:spectral  # Spectral CLI 校验
npm run test:prototype         # 原型契约测试
npm run test:structure         # 项目结构契约测试
npm run test:client            # 客户端单元测试（含 OpenAPI 类型生成）
npm test                       # test:contracts + test:admin + test:coverage + api:verify + test:client
npm run verify:client-builds   # 验证客户端构建（mp-weixin / H5）
npm run verify:phase01         # 完整验证（test + lint + typecheck + build + api test）
```

### 客户端（apps/client）

```bash
# 开发
npm --workspace apps/client run dev:h5              # H5 mock 模式
npm --workspace apps/client run dev:h5:real         # H5 real 模式
npm --workspace apps/client run dev:mp-weixin       # 微信小程序开发

# 构建
npm --workspace apps/client run build:h5              # H5 mock 构建（非发布）
npm --workspace apps/client run build:h5:real         # H5 release 构建（需真实 HTTPS 域名，走发布守卫）
npm --workspace apps/client run build:mp-weixin       # mp-weixin real API dev 构建（strip-mock 后可直接进 DevTools；mock 档用 build:mp-weixin:mock）
npm --workspace apps/client run build:mp-weixin:real  # mp-weixin release 构建（含 appid 注入）

# 检查与测试
npm --workspace apps/client run typecheck           # vue-tsc 类型检查
npm --workspace apps/client run test:unit           # vitest 单元测试
npm --workspace apps/client run test:coverage       # 单元测试 + 覆盖率
npm --workspace apps/client run test:e2e            # Playwright 端到端测试
```

### Admin 后台（apps/admin）

```bash
cd apps/admin
pnpm install
pnpm dev          # 开发（http://localhost:5177）
pnpm build        # 生产构建（含 vue-tsc 类型检查）
pnpm typecheck    # 仅类型检查
# 注：admin 有 5 个测试文件 / 39 个用例；技术栈含 Element Plus
```

### 后端 API（apps/api）

```bash
cd apps/api
./mvnw spring-boot:run -Dspring-boot.run.profiles=mock      # mock 模式
./mvnw spring-boot:run -Dspring-boot.run.profiles=real      # real 模式（MySQL + Flyway）
./mvnw test                                                  # 单元测试
./mvnw clean package -DskipTests                             # 构建 JAR（apps/api/target/campus-love-api-0.1.0.jar）
./mvnw flyway:info                                           # 查看迁移状态
```

> `./mvnw flyway:*` 的参数取自环境变量 `DB_URL` / `DB_USERNAME` / `DB_PASSWORD`
> （与 `application-real.yml` 同源，密码不写进文件）。容器化部署走另一条等价路径：
> `docker-compose.yml` 里一次性的 `migrate` 服务（Flyway CLI 镜像）先跑完，api 才启动，
> 以免多副本并发迁移同一套库——见 `doc/DEPLOYMENT.md#数据库初始化与迁移s3-2single-writer`。

> 顶层 `npm run api:dev` / `npm run api:test` 已封装 `./mvnw` 调用，可在根目录直接使用。

### 微信小程序构建

```bash
# Windows 一键脚本
build-mp-weixin.bat

# 或手动构建
pnpm --filter @campus-love/client run build:mp-weixin
```

构建产物位于 `apps/client/dist/build/mp-weixin`，使用微信开发者工具导入该目录即可预览。

### 真实小程序 + 管理后台（本地验收基线 2026-10-28）

本轮只覆盖真实小程序（mp-weixin real + 微信开发者工具）与管理后台（real API + Admin）。H5/mock 演示配置仍保留，但不是本轮验收口径。

1. **真实后端**（本机 MySQL/Redis 已启动）：
   ```bash
   set -a; source .env; set +a
   java -jar apps/api/target/campus-love-api-0.1.0.jar \
     --spring.profiles.active=real --server.port=8080 \
     --spring.flyway.validate-on-migrate=false --app.guest-login.enabled=true
   ```
2. **小程序 real 构建**（Node 22；产物 `shippable=no`，仅本机 DevTools）：
   ```bash
   PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH" \
   node apps/client/scripts/release-chain.mjs --allow-loopback
   ```
   用微信开发者工具导入 `apps/client/dist/build/mp-weixin-real`；构建成功会把 `src/static` 置为发布裁剪态，继续开发前执行 `node apps/client/scripts/prepare-static.mjs --dev` 还原。
3. **小程序登录路径**：体验号 / 手机号演示号（`13711110011` / `Demo@12345`）可用；微信 `wx.login` 需要 `.env` 的 `WECHAT_SECRET`，本地未配置时无法用 code 换会话（外部阻断），先用体验号/手机号验其余流程。
4. **管理后台**（`pnpm --dir apps/admin dev`，5177）：
   - 超管：`local-dev-admin-openid-123456` + 本地 `.env` 的 `ADMIN_LOGIN_PASSWORD`；
   - 校区管理员：`phone:13711110004` / `Campus@12345`（北大）；审核员：`phone:13711110005` / `Auditor@12345`（本地演示，生产必须换）。
   - 2026-10-28 新增页：法律文本 `http://localhost:5177/configs/legal`、咨询课程 `http://localhost:5177/business/consulting`；兴趣圈编辑增加标签/置顶公告。启动 API 时 Flyway 会自动应用 `V2026.10.28.*`；法律文本种子 v1.0.0 待法务复核。
5. **本地超管复通**（迁移 `V2026.10.26.0001` 点名路径；DB 先备份；只写仓库里不存在的新强口令）：
   ```bash
   LOCAL_ADMIN_PASSWORD='<新强口令>' DB_PASSWORD='<.env DB_PASSWORD>' \
   MYSQL_BIN=/d/mysql-8.0.45-winx64/bin/mysql \
   node scripts/dev/reset-local-admin.mjs --apply
   ```
6. **边界**：真机/提审/发布需要真实 HTTPS 域名、AppID、`WECHAT_SECRET`，当前产物 `shippable=no`；**法律正式文本待法务复核、咨询首批内容待运营、临时会话图片的匿名/保留策略待裁定**；VIP、课表网格、北师大统计行按本轮口径不做。产品缺口落地见 `reports/verify/2026-10-28/30-close/product-gaps-report.md`。

## 环境变量配置

### 客户端（apps/client）

参考 `apps/client/.env.example`：

- `VITE_API_MODE`：`mock` 或 `real`
- `VITE_API_BASE_URL`：后端 API 基础地址（生产必须 https://）
- `VITE_APP_VERSION`：应用版本号
- `VITE_SENTRY_DSN`：Sentry 错误监控 DSN（可选）
- `WX_APPID`：微信小程序 AppID（通过 `apps/client/scripts/inject-wx-appid.mjs` 注入到 `manifest.json`）

### 后端 API（apps/api）

参考 `apps/api/.env.example` 与 `apps/api/src/main/resources/application.yml`：

- 数据库：`DB_URL` / `DB_USERNAME` / `DB_PASSWORD`
- Redis：`REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`
- JWT：`JWT_SECRET`（必须配置，否则启动失败）/ `JWT_EXPIRATION_MS`
- 微信：`WECHAT_APPID` / `WECHAT_SECRET`
- CORS：`CORS_ALLOWED_ORIGINS`（生产必须显式配置）
- 详细变量列表见 `apps/api/.env.example`

### Admin 后台

参考 `apps/admin/.env.development`：

- `VITE_API_BASE_URL`：后端 API 地址（默认 `/api`，由 vite proxy 转发）
- `VITE_DEV_ADMIN_TOKEN`：开发环境管理员 token
- `VITE_DEV_DEFAULT_USERNAME` / `VITE_DEV_DEFAULT_PASSWORD`：开发环境默认账号提示

## 部署指南

参见 `doc/DEPLOYMENT.md` 与 `docker-compose.yml`。生产部署使用 Docker Compose 编排 api / client / admin / mysql / redis / prometheus / grafana / alertmanager / node-exporter / backup 服务（R4-02079：编排未包含 rabbitmq 与 nginx——消息队列未部署，应用在 MQ 不可用时自动降级；静态资源由各服务自带容器镜像暴露，域名入口由外层网关/Nginx 配置转发），每个服务已配置 healthcheck 与日志轮转。

```bash
# 一键启动全部服务
cp .env.example .env  # 编辑 .env，填写所有 *PASSWORD* / *SECRET* 字段
docker compose up -d

# 仅启动基础设施（开发联调）
docker compose up -d mysql redis

# 启动监控告警
docker compose --profile monitoring up -d

# 启动数据库定时备份
docker compose --profile backup up -d
```

更详细的部署架构、域名与 SSL、Nginx 反向代理、监控告警、备份恢复、升级回滚等见 `doc/DEPLOYMENT.md`。

## CI/CD 与镜像安全

CI 流水线（`.github/workflows/ci.yml`）的 `security-scan` job 包含：

1. **Trivy fs 扫描**：扫描 `apps/api` / `apps/admin` 源码（HIGH/CRITICAL 即失败）
2. **Trivy image 扫描**：构建 `campus-love-api` / `campus-love-admin` 镜像后扫描（HIGH/CRITICAL 即失败）
3. **cosign 镜像签名**：使用 sigstore/cosign 对镜像签名，部署端可验证

**cosign 密钥配置（仓库管理员）：**

```bash
# 1. 生成密钥对（私钥 cosign.key + 公钥 cosign.pub）
cosign generate-key-pair
# 会提示设置 COSIGN_PASSWORD（私钥口令）

# 2. 在 GitHub repo Settings → Secrets and variables → Actions 添加：
#    - COSIGN_PRIVATE_KEY  : cosign.key 文件内容
#    - COSIGN_PASSWORD      : 上一步设置的口令

# 3. 将 cosign.pub 分发给部署方（不入库），用于部署端 cosign verify
```

未配置 secrets 时，CI 中签名步骤自动跳过（PR 场景不影响构建）。
镜像签名验证流程见 `doc/DEPLOYMENT.md` 「镜像签名验证」小节，CI/CD 的权威定义就是 `.github/workflows/ci.yml` 本身。

## 文档导航

> 2026-10-29 更正：本节原先列出的 28 条 docs 链接指向的文件**都不存在**。
> 那批文档（ADR、API-CONTRACT、CI-CD、DR、发布清单、USER-GUIDE 等共 85 个文件）
> 在提交 `aefd8a72`（2026-09-22）被整体删除，README 没有同步，一直没人发现。
> 需要历史版本：`git show aefd8a72^:docs/CI-CD.md`（其余文件同理）。
> 是否恢复到工作区由维护者决定——内容已漂移约三个月，恢复即视为待复核文档。
> 现在 `npm run test:docs` 会逐条校验本节引用的 `doc/`、`docs/` 路径是否真实存在。

### 项目与部署

- `doc/DEPLOYMENT.md`：生产部署指南（Docker Compose / Nginx / 监控 / 备份 / 升级回滚 / 镜像签名）
- `doc/overview.md`：总体设计说明
- `doc/detailed-design.md`：详细设计说明
- `doc/CHANGELOG.md`：变更日志
- `doc/后台RBAC三级圈层规格.md`：管理端权限圈层规格

### 接口契约

- `docs/openapi/`：分模块 OpenAPI Schema（鉴权 / 错误码 / 限流的权威源，`npm run lint:openapi` 校验）
- `docs/wechat-submission-materials-checklist.md`：微信小程序提交材料清单

### 视觉与保真基线

- `doc/design-tokens-admin.md`：管理端设计令牌
- `doc/design-beautify-research.md`：视觉走查研究
- `素材/理想效果图/`：小程序保真审计的整页基准图（走 LFS，见 `.gitattributes`）

### 质量门禁

- `.github/workflows/ci.yml`：CI/CD 实际流程（13 个 job：gitleaks、lint、契约、双端 typecheck/build、单测、`mvn verify`、Trivy、e2e、release gate）
- 根 `package.json` 的 `test:contracts`：18 项契约与门禁自检，新增门禁需同时登记进 `test:gate-wiring`

## 贡献指南

### 分支策略

分支策略的历史完整版见 `git show aefd8a72^:docs/branching.md`，当前要点如下：

- `main`：唯一长期集成分支，必须保持可发布状态
- `release/YYYY-MM-DD`：发布稳定分支
- `hotfix/YYYY-MM-DD-short-name`：紧急生产修复分支
- `feature/<scope>-<topic>`：新功能分支
- `fix/<scope>-<topic>`：缺陷修复分支
- `chore/<scope>-<topic>`：工具 / CI / 构建分支
- `docs/<topic>`：仅文档变更

### 提交规范（Conventional Commits）

使用约定式提交（Conventional Commits）格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

- `type`：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- `scope`：影响模块（如 `auth` / `match` / `chat` / `village` / `admin` / `api` / `client`）
- `subject`：简短描述（祈使句，首字母小写，结尾不加句号）
- `body`：详细说明（可选）
- `footer`：BREAKING CHANGE / 关联 issue（可选）

示例：

```
feat(match): add quick-match endpoint with schedule-aware filter

fix(auth): refresh token leak on concurrent refresh requests

docs(api): update API-CONTRACT with rate limit table

chore(ci): bump Trivy to v0.55.0
```

### PR 流程

1. 从 `main` 切出工作分支，命名遵循上述分支策略
2. 提交前在本地运行 `npm run verify:phase01`（测试 + lint + typecheck + build + api test）
3. PR 必须填写 `.github/pull_request_template.md` 中的检查清单
4. PR 必须携带至少一个 `type:*` / `area:*` / `priority:*` / `risk:*` / `scope:*` 标签（标签字典的历史版本见 `git show aefd8a72^:docs/label-dictionary.md`）
5. 通过 CODEOWNERS 评审与 CI 全绿后合并
6. 涉及 `docs/openapi` 或 `database/flyway` 变更的 PR，必须在同一 PR 中同步客户端、API 与验证更新

### 发布窗口

- `T-18` ~ `T-12`：每日可评审切片合入 `main`
- `T-11` 起：仅发布阻塞项与已批准的回归修复可合入
- `release/*` 分支切出后：修复从该 release 分支切出，必要时 cherry-pick 回 `main`

发布判定的可执行来源是 CI 的 Release Gate job 与 `npm run test:release-gate`（环境域名/密钥校验），升级回滚步骤见 `doc/DEPLOYMENT.md`。灰度方案与发布清单的历史文档见 `git show aefd8a72^:docs/GRADUAL-RELEASE.md`。

## 注意事项

- 主线聊天仍为 temporary anonymous chat（临时匿名聊天）；持久 IM、社交图谱、AI 回复 UI 不在当前切片范围。
- `GET /home/dashboard` 的 `aiPlan` 卡片位已复用为「每日一问」展示（R4-02081）。
- `pages/dev/index` 为开发者调试页面，已通过 `// #ifdef DEV` 条件编译包裹，生产构建自动剔除。
- 所有依赖版本使用 `~`（允许 patch 更新）或完全固定，避免引入破坏性变更（见 `.npmrc`）。

## 许可证

本项目为私有项目，版权所有 © 2026 Campus Love Dev Team。未经授权不得复制、分发或商业使用。

如需申请授权或合作，请联系项目负责人获取正式联系方式（示例邮箱 `dev@campuslove.example.com` 仅为占位，R4-02082）。
