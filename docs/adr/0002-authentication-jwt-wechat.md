# ADR-0002: 认证方案 - JWT + 微信登录 + Redis Token 黑名单

- **Status**: Accepted
- **Date**: 2026-05-20
- **Deciders**: 安全组、后端 Lead、架构组
- **Tags**: security, authentication, jwt, wechat

---

## Context and Problem Statement

校园恋爱小程序采用微信小程序作为主要发布渠道，用户登录必须基于微信登录体系。同时，Admin 后台需要独立的账号密码登录。

需要解决的认证问题：

1. **微信登录**：如何安全地将微信 `code` 换取用户身份，并维持会话
2. **会话管理**：用户登录态如何在前端、后端、Redis 之间流转
3. **Token 撤销**：用户退出登录后如何立即失效未过期的 Token
4. **多端登录**：同一用户在小程序与 Admin 后台的会话如何隔离
5. **安全合规**：满足《个人信息保护法》最小必要原则与 JWT 安全最佳实践
6. **性能要求**：认证检查延迟 ≤ 10ms，避免每次请求都查 DB

需在 JWT、Session、OAuth 2.0 等多种方案中作出选型。

---

## Decision Drivers

- **微信生态绑定**：小程序原生支持 `wx.login()` 获取 code
- **无状态架构**：API 服务无状态，便于水平扩展
- **Token 撤销能力**：必须支持用户主动退出登录后立即失效
- **性能要求**：认证检查 ≤ 10ms
- **安全合规**：满足等保三级与个人信息保护法
- **未来扩展**：支持后续接入 App、第三方 OAuth

---

## Considered Options

### 方案 A：JWT + Redis Token 黑名单（**选定**）

- **登录流程**：客户端 `wx.login()` → 后端 `code2session` → 生成 JWT → 返回客户端
- **Token 存储**：客户端存于 `uni.setStorageSync`，Admin 存于 `localStorage`
- **Token 校验**：JwtAuthenticationFilter 校验签名 + 过期 + 黑名单
- **Token 撤销**：登出时将 jti 写入 Redis 黑名单，TTL = 剩余有效期
- **刷新机制**：access token 30 分钟过期，refresh token 7 天

### 方案 B：Session + Redis

- 服务端 Session 存于 Redis，Cookie/Token 携带 sessionId
- 优势：撤销简单（删除 Redis key）
- 劣势：服务端有状态，水平扩展需 Session 粘性或共享存储

### 方案 C：OAuth 2.0 + OIDC

- 接入微信开放平台 OAuth 2.0
- 优势：标准协议，扩展性强
- 劣势：复杂度高，小程序场景过度设计

### 方案 D：双 Token（access + refresh）

- 类似方案 A，但 refresh token 也用 JWT
- 优势：完全无状态
- 劣势：refresh token 撤销需黑名单，回到方案 A 问题

---

## Pros and Cons of the Options

### 方案 A（JWT + Redis Token 黑名单）

| 优点 | 缺点 |
|------|------|
| ✅ 无状态，水平扩展友好 | ❌ Token 撤销需 Redis 黑名单 |
| ✅ 性能优秀（本地验签 ≤ 1ms） | ❌ 黑名单 Redis 故障需降级方案 |
| ✅ 标准 RFC 7519，生态成熟 | ❌ JWT 体积较大（~800 bytes） |
| ✅ 自包含用户信息，避免 DB 查询 | ❌ Token 一旦签发无法修改内容 |
| ✅ 跨服务传递方便（微服务友好） | |

### 方案 B（Session + Redis）

| 优点 | 缺点 |
|------|------|
| ✅ 撤销简单 | ❌ 有状态，扩展需 Session 共享 |
| ✅ Token 体积小 | ❌ 每次请求需查 Redis |
| ✅ 服务端可控 | ❌ 性能略差（Redis 查询 ~3ms） |
| | ❌ Cookie 在小程序场景不友好 |

### 方案 C（OAuth 2.0 + OIDC）

| 优点 | 缺点 |
|------|------|
| ✅ 标准协议 | ❌ 复杂度高 |
| ✅ 第三方接入方便 | ❌ 小程序场景过度设计 |
| ✅ IdP 集中管理 | ❌ 需引入 Keycloak/Auth0 等组件 |

### 方案 D（双 Token JWT）

| 优点 | 缺点 |
|------|------|
| ✅ 完全无状态 | ❌ Refresh token 撤销仍需黑名单 |
| ✅ 标准 OAuth 2.0 模式 | ❌ 复杂度增加 |

---

## Decision

**选定方案 A：JWT + Redis Token 黑名单**

### 详细设计

#### Token 结构

```json
{
  "sub": "12345",                          // userId
  "iat": 1719500000,                       // 签发时间
  "exp": 1719501800,                       // 过期时间（30 分钟）
  "jti": "uuid-v4",                        // 唯一 ID（用于黑名单）
  "roles": ["USER"],                       // 角色
  "platform": "mp-weixin",                 // 平台（mp-weixin / admin）
  "iss": "campus-love",                    // 签发者
  "aud": "campus-love-api"                 // 受众
}
```

#### 登录流程

```
[客户端] wx.login() → code
    ↓
[客户端] POST /api/v1/auth/wechat {code, state}
    ↓
[后端] code2session(code) → openid + session_key
    ↓
[后端] 查询/创建 User (按 open_id)
    ↓
[后端] 生成 JWT (access + refresh)
    ↓
[后端] 返回 {accessToken, refreshToken, expiresIn}
    ↓
[客户端] 存储 Token，后续请求携带 Authorization: Bearer <token>
```

#### Token 校验流程

```
[Filter] 提取 Authorization Header
    ↓
[Filter] 验证 JWT 签名（HMAC-SHA256）
    ↓
[Filter] 验证过期时间 exp
    ↓
[Filter] 查询 Redis 黑名单（key=jwt:blacklist:{jti}）
    ↓
[Filter] 加载用户角色到 SecurityContext
    ↓
[Controller] 处理业务请求
```

#### Token 撤销机制

- **主动撤销**（用户登出）：
  - 将 jti 写入 Redis：`SET jwt:blacklist:{jti} 1 EX {剩余有效期}`
  - 客户端清除本地 Token
- **被动撤销**（管理员封禁用户）：
  - 用户表 `status='disabled'`，下次请求被 Filter 拒绝
- **Redis 故障降级**：
  - 黑名单查询失败时，降级到本地内存缓存（Caffeine，TTL 60s）
  - 仅在 Redis 故障期间允许降级，恢复后同步

#### Refresh Token

- Access Token 有效期：30 分钟
- Refresh Token 有效期：7 天
- 刷新接口：`POST /api/v1/auth/refresh`
- 刷新时同时刷新黑名单中老 Token 的 jti

#### Admin 后台

- 登录方式：账号密码（BCrypt 哈希）
- 密码错误 5 次锁定 30 分钟
- 双因素认证（可选，未来支持）

---

## Consequences

### 正面后果

- **无状态架构**：API 服务可水平扩展，无需 Session 共享
- **性能优秀**：JWT 验签本地完成，无需查 Redis
- **撤销能力**：Redis 黑名单支持立即撤销
- **多端隔离**：JWT 中 `platform` 字段区分小程序与 Admin
- **标准协议**：JWT 是 RFC 7519 标准，第三方接入友好

### 负面后果

- **Redis 依赖**：黑名单查询依赖 Redis，故障需降级
- **Token 体积**：JWT ~800 bytes，每次请求携带增加带宽
- **密钥管理**：JWT Secret 需定期轮换（建议 90 天）
- **Token 修改限制**：签发后无法修改内容，需刷新机制配合

### 安全考量

| 风险 | 缓解措施 |
|------|----------|
| JWT Secret 泄露 | 环境变量注入 + KMS 托管 + 90 天轮换 |
| Token 重放攻击 | 短有效期（30min）+ HTTPS + IP 绑定（可选） |
| CSRF 攻击 | JWT 通过 Header 传递，不用 Cookie |
| XSS Token 盗用 | httponly Cookie（Admin）+ 短有效期 |
| Redis 单点故障 | 主从 + 哨兵 + 本地缓存降级 |

---

## Compliance Note

- 满足《个人信息保护法》最小必要原则：仅存储 open_id，不存 session_key
- 满足等保三级身份认证要求：双因素 + 审计日志
- JWT 算法使用 HS256（HMAC-SHA256），符合 RFC 7519
- Token 撤销能力满足用户「删除我的账号」合规要求

---

## Related Documents

- [ADR-0001: 技术栈选型](./0001-technology-stack-selection.md)
- [ADR-0004: 缓存方案](./0004-cache-redis-cluster.md)
- 实现代码：
  - `apps/api/src/main/java/com/campuslove/api/security/JwtTokenProvider.java`
  - `apps/api/src/main/java/com/campuslove/api/security/JwtAuthenticationFilter.java`
  - `apps/api/src/main/java/com/campuslove/api/security/RedisTokenBlacklistService.java`
  - `apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java`
- 客户端：`apps/client/src/services/auth.ts`

---

## Change Log

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-05-20 | 首次提议 | 安全组 |
| 2026-05-22 | 评审通过 | 架构组 |
| 2026-07-26 | 补充 Redis 黑名单降级机制 | 安全组 |
