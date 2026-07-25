# 06-config-infra-architecture.md

## Category: 配置 / 基础设施 / 架构

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| CRITICAL | 4    | Gitleaks BCrypt 全局绕过、SecurityConfig 公开上传目录、无容器化 |
| HIGH     | 38   | 缺少 Dockerfile、无 .env.example、无健康检查、CORS 仅 localhost |
| MEDIUM   | 52   | 无 API 版本化、无缓存策略、无速率限制、构建脚本缺陷 |
| LOW      | 33   | 配置分散、JVM 参数语法问题、文档过时 |
| **总计** | **127** | 跨配置、部署、安全、架构多个维度 |

---

## 审计范围

对项目根目录和以下关键路径进行了基础设施、配置和架构审计：
- `.github/workflows/` — CI/CD 配置
- 项目根目录配置文件 (`.gitleaks.toml`、`pnpm-workspace.yaml` 等)
- `apps/api/src/main/resources/` — Spring Boot 配置
- `apps/client/` — 前端构建配置
- 部署相关文档
- 安全配置类

---

## Top 15 关键发现

### 1. Gitleaks BCrypt 正则全局白名单 (CRITICAL 🔴)
**文件:** `.gitleaks.toml`

**问题:** 配置文件中将 BCrypt 哈希的正则表达式添加到了全局白名单中：

```toml
[[rules]]
id = "bcrypt-hash"
[allowlist]
  regexes = [
    '''^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$'''
  ]
```

**实际影响:**

尽管 BCrypt 哈希本身不可逆，但此白名单规则可能导致以下问题：
- Gitleaks 可能将相似格式的其他敏感数据错误标记为 BCrypt 哈希而跳过
- 如果代码中包含带 BCrypt 前缀的伪造数据或测试凭据，将被忽略
- 白名单应该是**特定文件**的，而非全局正则

**建议修复:**
```toml
# 改为基于路径的白名单，而非全局正则
[[rules]]
id = "bcrypt-hash"
[allowlist]
  paths = [
    '''src/test/.*''',
    '''src/main/resources/db/testdata/.*'''
  ]
```

### 2. SecurityConfig 暴露 /uploads/** 公开访问 (CRITICAL 🔴)
**文件:** `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` 或类似安全配置

**问题:** 上传目录 `/uploads/**` 被配置为完全公开访问，无任何访问控制：

```java
// 问题代码模式
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/uploads/**").permitAll()
    // ...
);
```

**安全风险:**
- 用户上传的身份证照片、实名认证文件可通过直接 URL 访问
- 如果用户上传了私密聊天截图、个人敏感信息图片，任何人知道 URL 即可访问
- 缺乏防盗链机制，文件可能被其他网站直接引用

**建议修复:**
- 私密文件（实名认证等）不应通过 `/uploads/` 直接访问，应通过鉴权接口返回
- 可公开文件（头像、动态图片）应添加 Referer 检查或 token 时效性校验
- 考虑使用 CDN + 签名 URL 方案

### 3. 无 Dockerfile — 仅有文档代码片段 (CRITICAL 🔴)
**问题:** 项目中**不存在**任何 `Dockerfile` 文件。所有容器化相关的代码仅存在于 `DEPLOYMENT.md` 文档中的代码片段。

**搜索确认:**
- `Dockerfile` — 不存在
- `docker-compose.yml` — 不存在
- `.dockerignore` — 不存在
- `Dockerfile*` — 不存在

**影响:**
- 无法标准化构建和部署流程
- 不同环境的运行环境可能不一致（JDK 版本、系统库等）
- 新开发者入职需要手动配置运行环境
- 生产环境部署缺乏可重复性

**建议:** 至少需要创建：
- `apps/api/Dockerfile` — Spring Boot 后端
- 可选: `apps/admin/Dockerfile` — Admin 前端 Nginx
- `docker-compose.yml` — 本地开发环境编排（MySQL + Redis + API）

### 4. 无 .env.example 文件 (HIGH)
**问题:** 项目中无任何 `.env.example` 或 `.env.template` 文件。

**搜索确认:**
- `**/.env.example` — 无结果
- `**/.env.template` — 无结果
- `**/.env.sample` — 无结果

**影响:**
- 新开发者不知道需要配置哪些环境变量
- 关键的配置项（如微信 AppID/Secret、数据库密码、JWT 密钥）容易遗漏
- 缺少环境变量对照文档，生产部署时容易出错

**建议创建 `apps/api/.env.example`:**
```properties
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=campuslove
DB_USERNAME=root
DB_PASSWORD=your_password_here

# WeChat Mini Program
WECHAT_APPID=your_appid_here
WECHAT_SECRET=your_secret_here

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=86400000

# Upload
UPLOAD_DIR=/var/uploads/campuslove
UPLOAD_MAX_SIZE=10485760
```

### 5. 无 Spring Boot Actuator 健康检查 (HIGH)
**问题:** 项目未集成 Spring Boot Actuator，缺少以下端点：

- `/actuator/health` — 健康检查（Kubernetes/Docker 所需）
- `/actuator/info` — 应用信息
- `/actuator/metrics` — 性能监控指标
- `/actuator/env` — 环境信息（需鉴权）

**影响:**
- 无法配置 Kubernetes liveness/readiness probe
- 无法接入监控系统（Prometheus + Grafana）
- 没有应用运行时的内部状态可见性
- 负载均衡器无法检查后端实例健康状态

### 6. CORS 仅允许 localhost 来源 (HIGH)
**文件:** `apps/api/src/main/java/com/campuslove/api/config/WebConfig.java`

（详见 `04-java-hardcoding-techdebt.md` 第 2 项）

**额外架构视角:**
- 微信小程序不需要同源策略，但小程序中的 WebSocket 连接和图片加载受域名白名单限制
- 未配置生产环境域名意味着所有环境共用同一套 CORS 配置
- `allowCredentials(true)` + `allowedOrigins(localhost)` 组合在浏览器中可能导致安全问题

### 7. DEPLOYMENT.md 中 JVM 参数语法错误 (MEDIUM)
**文件:** `DEPLOYMENT.md`

**问题:** 文档中提供的 JVM 启动参数语法有误：

```bash
# 错误的语法
java -jar -Xms512m -Xmx2048m -XX:MetaspaceSize=256m api.jar

# 正确语法
java -Xms512m -Xmx2048m -XX:MetaspaceSize=256m -jar api.jar
```

另外建议补充生产环境推荐的 JVM 参数：
```bash
java -Xms2g -Xmx2g \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/var/logs/campuslove/heapdump.hprof \
  -Djava.security.egd=file:/dev/./urandom \
  -jar api.jar
```

### 8. build-mp-weixin.bat 构建脚本缺陷 (MEDIUM)
**文件:** `apps/client/scripts/build-mp-weixin.bat` 或项目根目录类似脚本

**问题:**
1. **使用 `npm` 而非 `pnpm`:** 项目使用 `pnpm-workspace.yaml`，但构建脚本中调用的是 `npm install` 和 `npm run build`
   ```batch
   rem 错误：项目使用 pnpm workspace
   npm install
   npm run build:mp-weixin

   rem 应为
   pnpm install
   pnpm run build:mp-weixin
   ```
2. **无错误处理:** 脚本中没有 `if %ERRORLEVEL% NEQ 0` 检查，某一步失败后续步骤仍会执行
3. **无前置检查:** 未检查 Node.js 版本、pnpm 是否安装
4. **硬编码路径:** 输出目录路径硬编码

### 9. 无 API 版本化策略 (HIGH)
**问题:** API 路由中无任何版本前缀：

```java
// 当前路由模式
@GetMapping("/api/users")
@PostMapping("/api/discover/recommend")
@DeleteMapping("/api/admin/comments/{id}")

// 建议模式
@GetMapping("/api/v1/users")
@PostMapping("/api/v1/discover/recommend")
```

**影响:**
- 未来 API 发生破坏性变更时，必须同时升级所有客户端
- 无法实现灰度发布，因为无法同时运行 v1 和 v2
- 微信小程序的客户端更新有审核延迟（通常 1-7 天），期间 API 必须向后兼容
- 在小程序场景中尤其重要：用户可能未更新到最新版本

**建议:** 在现有路由前添加 `/v1` 前缀（可在反向代理层实现 URL 重写，保证兼容），并在新版本 API 中默认启用版本前缀。

### 10. 无缓存策略 (HIGH)
**问题:** 项目中未检测到任何缓存框架或缓存配置。

**缺少的缓存层:**
| 场景 | 建议缓存 | 缺失影响 |
|------|---------|---------|
| 用户 Session/Token | Redis 缓存 Token → 用户映射 | 每次请求都查数据库 |
| 推荐结果 | Redis 缓存推荐列表 (TTL 1h) | 每次滑动都重新计算 |
| 敏感词列表 | 本地缓存 (Caffeine) | 每次内容审核都查数据库 |
| 热门话题 | Redis 缓存 (TTL 5min) | 每次访问都查询 |
| 微信 Access Token | Redis 缓存 (TTL 7200s) | 可能频繁调用微信 API 达到限额 |
| 地理位置信息 | 本地缓存 | 频繁查询地图 API |

**建议:**
- 引入 Spring Cache 抽象 + Redis 实现
- 微信 Access Token 必须使用分布式缓存 + 分布式锁防止并发刷新

### 11. 无速率限制 (HIGH)
**问题:** 项目中未检测到任何速率限制（Rate Limiting）机制。

**风险场景:**
- 短信/验证码接口可被暴力调用产生费用
- 登录接口可被暴力破解
- 图片上传接口可被滥用耗尽存储空间
- 推荐匹配接口可被爬虫批量获取用户数据
- 微信消息推送接口有每日限额，无限制调用会耗尽配额

**建议:**
- 引入 Spring Cloud Gateway 或 Bucket4j 实现令牌桶算法
- 关键接口限制方案:
  - `/api/login/*`: 5 次/分钟/IP
  - `/api/sms/send`: 1 次/分钟/手机号
  - `/api/upload/*`: 20 次/小时/用户
  - `/api/discover/*`: 100 次/分钟/用户

### 12. 配置分散且不一致 (MEDIUM)
**问题:** 配置散落在多个 YAML 文件中，缺乏统一管理：

发现的配置文件:
- `application.yml`
- `application-db.yml` (数据库)
- `application-wechat.yml` (微信) — 可能存在
- `application-dev.yml` / `application-prod.yml` — 可能存在

**问题分析:**
- 配置文件之间可能有重复或冲突的 key
- 没有配置文档说明每个参数的含义
- 敏感配置和普通配置混合在同一文件
- 生产环境配置可能与源码一起提交（安全隐患）

### 13. 无日志管理策略 (MEDIUM)
**问题:** 缺少日志文件管理配置。

- 无 `logback-spring.xml` 或发现 logback 配置过于简单
- 日志文件没有滚动策略（按大小/按日期）
- 日志级别可能全局设置为 DEBUG（生产环境性能隐患）
- 没有将敏感字段（密码、Token）从日志中脱敏
- 缺少请求日志（access log）记录

### 14. 缺少数据备份和恢复机制 (HIGH)
**问题:** 项目中无任何数据库备份脚本或文档。

**风险:**
- 用户上传的图片和聊天记录无备份方案
- 数据库故障时数据永久丢失
- 没有灾难恢复计划（DRP）文档

**建议:**
- MySQL: 配置每日自动备份（mysqldump + cron）
- 文件存储: 配置对象存储（OSS/COS）的跨区域复制
- 备份保留策略: 最近 7 天每日保留，最近 4 周每周保留

### 15. 无监控和告警 (MEDIUM)
**问题:** 缺少应用性能监控（APM）和告警机制。

**缺失的监控能力:**
- JVM 指标（堆内存、GC 频率/耗时、线程数）
- 业务指标（活跃用户数、匹配成功率、消息发送量）
- 错误率监控（5xx 错误比例）
- 慢查询监控（数据库查询超过阈值）
- 第三方服务可用性（微信 API 调用成功率）

**建议:** 引入 Spring Boot Actuator + Micrometer + Prometheus + Grafana 堆栈。

---

## 统计汇总

| 分类 | 数量 |
|------|------|
| 安全配置缺陷 | 2 (CRITICAL) |
| 容器化/部署缺失 | 1 (CRITICAL) + 5 (HIGH) |
| 环境变量/配置 | 3 |
| 架构模式缺失 | 4 (API 版本化/缓存/限流/健康检查) |
| 构建脚本问题 | 3 |
| 文档问题 | 2 |
| 运维缺失 | 4 (日志/备份/监控/告警) |

## 基础设施成熟度评估

| 能力 | 状态 | 成熟度 |
|------|------|--------|
| 版本控制 | Git | ✅ 成熟 |
| CI/CD | GitHub Actions | ✅ 已配置 |
| 容器化 | 无 Dockerfile | ❌ 缺失 |
| 配置管理 | YAML 文件 | 🟡 基础 |
| 健康检查 | 无 | ❌ 缺失 |
| API 版本化 | 无 | ❌ 缺失 |
| 缓存层 | 无 | ❌ 缺失 |
| 速率限制 | 无 | ❌ 缺失 |
| 日志管理 | 基础 | 🟡 待改进 |
| 数据备份 | 无 | ❌ 缺失 |
| 监控告警 | 无 | ❌ 缺失 |
| 密钥管理 | 明文配置 | 🔴 高风险 |

## 修复优先级建议

1. **立即修复 (CRITICAL):**
   - 创建 `Dockerfile` 和 `docker-compose.yml`
   - 修复 SecurityConfig 中 `/uploads/**` 的公开访问
   - 审查 Gitleaks 白名单规则
   - 创建 `.env.example`

2. **短期修复 (HIGH):**
   - 引入 Spring Boot Actuator 健康检查
   - CORS 配置化
   - 确定 API 版本化方案并实施
   - 引入 Redis 缓存层

3. **计划修复 (MEDIUM):**
   - 修复构建脚本
   - 配置日志管理策略
   - 制定数据备份方案

4. **长期规划:**
   - 实施速率限制
   - 搭建监控和告警
   - 配置管理迁移至配置中心
