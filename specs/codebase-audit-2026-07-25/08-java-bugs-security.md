# 08 -- Java 后端 Bug & 安全

> **审计日期:** 2026-07-25
> **类别:** Java 后端 Bug & 安全
> **发现总数:** 89
> **严重程度分布:** CRITICAL 2 | HIGH 18 | MEDIUM 41 | LOW 28

---

## 严重程度概要

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 2 | 可导致数据泄露或系统崩溃，需立即修复 |
| HIGH | 18 | 安全漏洞、数据一致性问题、功能缺陷 |
| MEDIUM | 41 | 代码质量、潜在风险 |
| LOW | 28 | 风格问题、最佳实践偏离 |

---

## CRITICAL 发现

### CRITICAL-01: BCrypt 密码哈希通过 JSON 序列化泄露

**文件:** `apps/api/src/main/java/com/campuslove/api/user/User.java` (line 82)
**严重程度:** CRITICAL
**类别:** 安全 - 敏感数据泄露

**问题描述:**
`User` 实体的 `password` 字段缺少 `@JsonIgnore` 注解。当 `User` 对象通过 Jackson 序列化成 JSON 响应时，BCrypt 密码哈希会直接暴露给前端。

```java
// 当前代码 (有漏洞)
@Column(name = "password")
private String password;  // BCrypt hash 直接暴露在 JSON 中

// 应改为
@JsonIgnore
@Column(name = "password")
private String password;
```

**影响:** 即使 BCrypt 哈希无法逆向，攻击者获取哈希后仍可进行离线暴力破解。密码哈希绝不应离开后端。
**修复建议:** 添加 `@JsonIgnore` 注解，并确保所有返回 `User` 实体的 API 端点使用 DTO 投影。

---

### CRITICAL-02: 缓存 AccessToken 的双重检查锁定实现错误

**文件:** `apps/api/src/main/java/com/campuslove/api/growth/WeChatPushService.java` (line 47)
**严重程度:** CRITICAL
**类别:** 并发 - 竞态条件

**问题描述:**
`cachedAccessToken` 字段未声明为 `volatile`，导致双重检查锁定 (Double-Checked Locking) 模式失效。在 JVM 内存模型下，一个线程可能看到未完全构造的对象引用。

```java
// 当前代码 (有漏洞)
private String cachedAccessToken;         // 缺少 volatile
private Instant tokenExpiry;

public String getAccessToken() {
    if (cachedAccessToken == null || Instant.now().isAfter(tokenExpiry)) {
        synchronized (this) {
            if (cachedAccessToken == null || Instant.now().isAfter(tokenExpiry)) {
                refreshToken();  // 另一个线程可能看到部分写入
            }
        }
    }
    return cachedAccessToken;
}
```

**影响:** 多线程环境下可能返回过期或无意义的 token，导致微信推送功能间歇性失败。
**修复建议:** 将字段声明为 `private volatile String cachedAccessToken;` 并使用 `AtomicReference` 或单例 Holder 类模式重构。

---

## HIGH 发现

### HIGH-01: 被禁用的管理员账号仍可登录

**文件:** `apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java` (line 212)
**严重程度:** HIGH
**类别:** 安全 - 认证绕过

**问题描述:**
管理员登录流程中，`authenticateAdmin()` 方法验证了用户名和密码，但未检查 `admin.enabled` 或 `admin.status` 字段。已被禁用的管理员账号仍可成功登录并获得 JWT token。

```java
// 当前代码缺少状态检查
Admin admin = adminRepository.findByUsername(username);
if (admin != null && passwordEncoder.matches(password, admin.getPassword())) {
    return generateToken(admin);  // 未检查 admin.isEnabled()
}
```

**影响:** 权限管理失效 -- 禁用的管理员账号实际仍可操作后台。
**修复建议:** 在密码验证通过后增加 `if (!admin.isEnabled()) throw new AccountDisabledException();`。

---

### HIGH-02: Rewind 每日限制已计算但从未执行

**文件:** `apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java` (line 577)
**严重程度:** HIGH
**类别:** 业务逻辑缺陷

**问题描述:**
`rewind()` 方法中 `dailyRewindLimit` 被正确计算，日使用次数也被查询，但 `rewindCount >= dailyRewindLimit` 的比较结果赋值后从未用于实际拒绝请求。方法继续执行了 rewind 操作。

```java
// 计算了限制但从未 return/throw
int rewindCount = rewindRepository.countTodayRewinds(userId);
boolean limitExceeded = rewindCount >= dailyRewindLimit;
// ... 继续执行 rewind，limitExceeded 未被使用
```

**影响:** VIP 与非 VIP 用户的 rewind 次数限制形同虚设。
**修复建议:** 在查询 rewindCount 后立即判断，超限时抛出 `DailyLimitExceededException` 或返回错误响应。

---

### HIGH-03: 7 个 Admin Controller 缺少权限注解

**文件:** `apps/api/src/main/java/com/campuslove/api/admin/` 目录下
**严重程度:** HIGH
**类别:** 安全 - 权限缺失

**问题描述:**
以下 Admin Controller 类或方法缺少 `@PreAuthorize("hasRole('ADMIN')")` 注解：
- `AdminUserController.java` -- 用户管理端点
- `AdminContentController.java` -- 内容审核端点
- `AdminConfigController.java` -- 配置管理端点
- `AdminStatisticsController.java` -- 数据统计端点
- `AdminNotificationController.java` -- 通知管理端点
- `AdminReportController.java` -- 举报处理端点
- `AdminFeedbackController.java` -- 反馈管理端点

虽然部分通过 `SecurityConfig` 的 URL 级别拦截保护，但缺少方法级注解使安全策略不够显式，且在有 `@PreAuthorize` 覆盖的复杂配置中 URL 级别规则可能被绕过。

**影响:** 依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。
**修复建议:** 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。

---

### HIGH-04: Like 实体缺少唯一约束 -- 重复点赞竞态条件

**文件:** `apps/api/src/main/java/com/campuslove/api/match/Like.java`
**严重程度:** HIGH
**类别:** 数据完整性

**问题描述:**
`Like` 实体在 `(user_id, target_user_id)` 组合上没有数据库唯一约束。在高并发场景下（用户快速双击或网络重试），`checkExists() -> insert()` 的竞态窗口会导致同一对用户产生多条 Like 记录。

```sql
-- 缺少的约束
ALTER TABLE likes ADD CONSTRAINT uk_like_user_target UNIQUE (user_id, target_user_id);
```

**影响:** 重复 Like 记录破坏匹配逻辑，可能导致重复通知、匹配计数错误、数据库膨胀。
**修复建议:** 添加数据库唯一约束，并在应用层使用 `INSERT ... ON DUPLICATE KEY UPDATE` 或 `@Transactional` + 悲观锁。

---

### HIGH-05: UserSession Token 在 API 响应中暴露

**文件:** `apps/api/src/main/java/com/campuslove/api/auth/UserSession.java`
**严重程度:** HIGH
**类别:** 安全 - 敏感数据泄露

**问题描述:**
`UserSession` 实体在序列化时，`sessionToken` 字段未被 `@JsonIgnore` 保护。查询会话列表的 API 将 session token 完整返回给客户端。

**影响:** Session token 泄露到前端日志、浏览器本地存储，增加 token 被盗用风险。
**修复建议:** 为 `sessionToken` 添加 `@JsonIgnore`，创建专门的 DTO 仅返回必要的会话元数据。

---

### HIGH-06: SecurityConfig 中上传路径无需认证即可公开访问

**文件:** `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java`
**严重程度:** HIGH
**类别:** 安全 - 配置错误

**问题描述:**
`SecurityConfig` 中的 `.antMatchers("/uploads/**").permitAll()` 配置使得上传目录下所有文件（包括用户私密照片）均可通过直接 URL 访问，无需任何认证。

**影响:** 用户上传的私密照片、身份证照片等敏感文件可被任何人通过猜测 URL 访问。
**修复建议:** 移除 `/uploads/**` 的公开访问配置，改为通过认证的代理端点提供文件访问，并在端点中实现授权检查。

---

### HIGH-07: 登录端点无速率限制

**文件:** `apps/api/src/main/java/com/campuslove/api/auth/` 目录
**严重程度:** HIGH
**类别:** 安全 - 暴力破解防护缺失

**问题描述:**
短信登录 (`/auth/sms-login`) 和密码登录 (`/auth/login`) 端点均未实现速率限制。攻击者可无限次尝试登录凭证或频繁发送短信。

**影响:** 暴力破解登录、短信轰炸、短信费用被恶意消耗。
**修复建议:** 引入 Spring Rate Limiter 或使用 Redis + Lua 脚本实现基于 IP 和手机号的速率限制。

---

### HIGH-08: 微信登录中的 find-then-create 竞态条件

**文件:** `apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java` (line 136)
**严重程度:** HIGH
**类别:** 并发 - 竞态条件

**问题描述:**
微信登录流程使用 "先查后建" 模式处理新用户：先通过 openId 查询用户是否存在，不存在则创建。在高并发场景下，同一微信用户的两个并发登录请求可能同时查到 "不存在"，导致创建两条重复用户记录。

```java
User user = userRepository.findByOpenId(openId);
if (user == null) {
    user = createNewUser(openId, wechatInfo);  // 竞态窗口
}
```

**影响:** 重复用户记录、数据一致性问题、用户登录混乱。
**修复建议:** 在 `open_id` 列添加唯一约束，使用 `INSERT ... ON DUPLICATE KEY UPDATE` 或 `synchronized` + 数据库唯一约束的组合方案。

---

### HIGH-09: N+1 查询模式 -- 多个 Service 方法

**文件:** 多个文件
**严重程度:** HIGH
**类别:** 性能

**问题描述:**
以下 Service 方法存在典型的 N+1 查询问题：
- `RealMatchService.getMatchList()` -- 循环中为每个用户单独查询 `latestMessage`
- `RealDiscussionService.getDiscussions()` -- 循环中为每个讨论单独查询 `participantCount`
- `RealNotificationService.getNotifications()` -- 循环中为每个通知单独查询 `senderAvatar`
- `RealUserService.getUserCards()` -- 循环中为每个卡片单独查询 `mutualTags`

**影响:** 列表分页 20 条记录时可能触发 40+ 次数据库查询，响应时间随数据量线性增长。
**修复建议:** 使用 JPQL `JOIN FETCH`、`@EntityGraph` 或批量查询 (WHERE id IN) + Map 组装的方式一次获取所有关联数据。

---

### HIGH-10: 实体缺少 equals/hashCode 实现

**文件:** 多个 Entity 文件
**严重程度:** HIGH
**类别:** 数据完整性

**问题描述:**
以下 JPA 实体未正确实现 `equals()` 和 `hashCode()`：
- `User.java` (line 180: 仅使用 `id`，未考虑 proxy 场景)
- `Match.java` -- 完全未重写
- `Discussion.java` -- 完全未重写
- `Message.java` -- 完全未重写

JPA 代理对象场景下，仅使用 `id` 的 `equals()` 实现也会有 `instanceof` 检查问题。

**影响:** `HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。
**修复建议:** 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。

---

## MEDIUM 发现 (代表性)

### MEDIUM-01: 懒加载关联缺少 @ToString.Exclude

**文件:** 多个 Entity 文件
**严重程度:** MEDIUM
**类别:** 潜在 Bug

**问题描述:**
多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。

**涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java`
**修复建议:** 在所有懒加载关联字段上添加 `@ToString.Exclude`。

---

### MEDIUM-02: @ConfigurationProperties 缺少 @Validated

**文件:** `apps/api/src/main/java/com/campuslove/api/config/WeChatProperties.java` 等
**严重程度:** MEDIUM
**类别:** 配置安全

**问题描述:**
`@ConfigurationProperties` 类未使用 `@Validated` 注解，也未对必填字段（如 `appId`、`appSecret`）添加 `@NotEmpty` / `@NotNull` 约束。应用可能在配置缺失的情况下启动，在运行时才因 NPE 或空请求而崩溃。

**修复建议:** 添加 `@Validated` 并在关键字段上使用 Bean Validation 注解。

---

### MEDIUM-03: 异常处理暴露内部错误详情

**文件:** `apps/api/src/main/java/com/campuslove/api/config/GlobalExceptionHandler.java`
**严重程度:** MEDIUM
**类别:** 安全 - 信息泄露

**问题描述:**
全局异常处理器在响应中直接返回 `e.getMessage()`，可能暴露数据库表名、SQL 语句片段、堆栈跟踪等内部信息。

**修复建议:** 对生产环境返回通用错误消息，将详细信息仅记录到日志。

---

### MEDIUM-04: JWT Secret 硬编码在配置文件中

**文件:** `apps/api/src/main/resources/application.yml`
**严重程度:** MEDIUM
**类别:** 安全 - 密钥管理

**问题描述:**
JWT 签名密钥以明文形式硬编码在 `application.yml` 中，并且该值出现在 Git 历史中。

**修复建议:** 通过环境变量或外部密钥管理服务注入 JWT Secret，轮换现有密钥。

---

### MEDIUM-05: SQL 注入风险 -- 原生查询拼接

**文件:** `apps/api/src/main/java/com/campuslove/api/repository/` 目录
**严重程度:** MEDIUM
**类别:** 安全 - SQL 注入

**问题描述:**
部分 Repository 方法使用 `@Query(nativeQuery = true)` 配合字符串拼接（如动态排序字段），未使用参数化查询。

**修复建议:** 使用 Criteria API 或 JPQL 参数化查询替代原生字符串拼接。

---

## LOW 发现 (代表性)

- **LOW-01:** `@Transactional(readOnly = true)` 未在只读 Service 方法上统一添加 -- 多个查询方法遗漏。
- **LOW-02:** 日志使用字符串拼接而非 SLF4J 参数化 `log.debug("user: {}", userId)`。
- **LOW-03:** `Optional.get()` 直接调用未先检查 `isPresent()` -- 多处。
- **LOW-04:** DTO 与 Entity 之间的字段映射使用手动 setter 而非 MapStruct。
- **LOW-05:** 部分 Controller 中直接返回 `ResponseEntity`，部分使用 `@ResponseBody`，风格不统一。

---

## 修复优先级建议

| 优先级 | 发现编号 | 预计工时 |
|--------|----------|----------|
| P0 (立即) | CRITICAL-01, CRITICAL-02 | 0.5天 |
| P1 (本周) | HIGH-01 ~ HIGH-10 | 3天 |
| P2 (本月) | MEDIUM-01 ~ MEDIUM-05 | 2天 |
| P3 (下月) | LOW-01 ~ LOW-05 | 1天 |

---

## 附录: 涉及文件清单

| 文件路径 | 发现数量 | 最高严重程度 |
|----------|----------|-------------|
| `apps/api/.../user/User.java` | 3 | CRITICAL |
| `apps/api/.../growth/WeChatPushService.java` | 4 | CRITICAL |
| `apps/api/.../auth/RealAuthService.java` | 6 | HIGH |
| `apps/api/.../match/RealMatchService.java` | 5 | HIGH |
| `apps/api/.../config/SecurityConfig.java` | 3 | HIGH |
| `apps/api/.../auth/UserSession.java` | 2 | HIGH |
| `apps/api/.../match/Like.java` | 2 | HIGH |
| `apps/api/.../admin/` (7 controllers) | 7 | HIGH |
| `apps/api/.../config/GlobalExceptionHandler.java` | 2 | MEDIUM |
| 其他 | 55 | MEDIUM / LOW |
