# 部署指南

## 前置要求

- Node.js 18+ (前端)
- Java 17+ (后端)
- MySQL 8.0+ (可选，仅 db profile)
- Maven 3.8+ (后端构建)

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
VITE_API_BASE_URL=http://127.0.0.1:8080/api
VITE_APP_VERSION=v0.1.0
```

### 后端环境变量

```bash
# JWT 密钥（必填，至少 32 字符）
JWT_SECRET=your-super-secret-key-at-least-32-chars

# 可选配置
APP_JWT_EXPIRATION_MS=86400000
```

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

### 启动前端（H5 模式）

```bash
npm run client:dev:h5
```

前端将在 http://localhost:5173 启动。

### 启动前端（真实模式）

```bash
npm run client:dev:h5:real
```

## 微信小程序构建

```bash
# Windows
build-mp-weixin.bat

# 或手动构建
npx uni build --platform mp-weixin
```

构建产物在 `apps/client/dist/build/mp-weixin` 目录。

## 生产部署

### 后端部署

1. 构建 JAR 包：
```bash
cd apps/api
.\mvnw.cmd clean package -DskipTests
```

2. 运行：
```bash
java -jar target/api-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=real \
  --JWT_SECRET=your-production-secret-key
```

### 前端部署

1. 构建 H5 版本：
```bash
npm run client:build:h5
```

2. 部署 `apps/client/dist/build/h5` 目录到 Web 服务器。

## Docker 部署（可选）

```dockerfile
# 后端 Dockerfile 示例
FROM eclipse-temurin:17-jre-alpine
COPY target/api-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## 数据库初始化（可选）

如果使用 `db` profile：

1. 配置数据库连接：
```bash
cp database/flyway/flyway.user.toml.example database/flyway/flyway.user.toml
# 编辑 flyway.user.toml 配置数据库连接
```

2. 运行迁移：
```bash
cd database/flyway
.\flyway migrate
```

## 验证部署

```bash
# 运行全量测试
npm run verify:phase01
```
