# 09 -- Java API 层深度审查

> **审计日期:** 2026-07-25
> **类别:** Java API 层深度审查
> **发现总数:** 87
> **严重程度分布:** HIGH 20 | MEDIUM 39 | LOW 28

---

## 严重程度概要

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| HIGH | 20 | 数据一致性、架构缺陷、安全风险 |
| MEDIUM | 39 | 性能问题、代码规范、可维护性 |
| LOW | 28 | 最佳实践、代码风格 |

---

## HIGH 发现

### HIGH-01: 所有 Entity 缺少 @Version 乐观锁 -- 并发写入导致数据丢失

**文件:** 所有 Entity 文件
**严重程度:** HIGH
**类别:** 数据一致性 - 并发控制缺失

**问题描述:**
项目中所有 JPA Entity（`User`, `Match`, `Discussion`, `Message`, `Like`, `Notification`, `Session` 等约 15 个实体）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。

```java
// 当前所有实体缺少
@Version
private Long version;
```

**影响:** 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。
**修复建议:** 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。

---

### HIGH-02: 5 个 Service 方法存在 N+1 查询模式

**文件:** `RealMatchService.java`, `RealDiscussionService.java`, `RealNotificationService.java`, `RealUserService.java`, `RealChatService.java`
**严重程度:** HIGH
**类别:** 性能

**问题描述:**
以下方法在循环中为集合中的每个元素执行单独 SQL 查询：

| 方法 | 关联实体 | N+1 查询内容 |
|------|----------|-------------|
| `getMatchList()` | Message | 每个 match 查询 lastMessage |
| `getDiscussions()` | User | 每个 discussion 查询 participantCount |
| `getNotifications()` | User | 每个 notification 查询 senderAvatar |
| `getUserCards()` | Tag | 每个 user 查询 mutualTags |
| `getChatHistory()` | User | 每条 message 查询 senderInfo |

以分页 20 条为例，`getMatchList()` 实际执行 1 + 20 = 21 次 SQL 查询。

**影响:** 列表接口响应时间 200-800ms，随关联数据量线性增长，数据库连接池压力大。
**修复建议:** 使用 `JOIN FETCH`、`@EntityGraph` 或批量 ID 查询 + Map 组装模式。

---

### HIGH-03: JWT 无 Token 撤销机制 -- 登出功能形同虚设

**文件:** `apps/api/src/main/java/com/campuslove/api/auth/`
**严重程度:** HIGH
**类别:** 安全 - 会话管理

**问题描述:**
JWT 认证方案中未实现任何 token 撤销机制。用户点击 "退出登录" 后：
1. 后端无黑名单
2. 无 token 版本号
3. 无 Redis 缓存失效
4. 前端仅删除本地存储的 token

持有已签发 JWT 的攻击者仍可在 token 过期前（通常 7-30 天）继续访问所有 API。

**影响:** Token 泄露后无法主动使其失效，"退出登录" 仅为客户端假象。
**修复建议:** 引入 Redis 维护 JWT 黑名单（key = jti, TTL = 剩余有效期），或在用户表中维护 `tokenVersion` 字段。

---

### HIGH-04: CampusController 全量加载后内存分页

**文件:** `apps/api/src/main/java/com/campuslove/api/campus/CampusController.java`
**严重程度:** HIGH
**类别:** 性能 - 内存

**问题描述:**
`CampusController` 的列表接口一次性将数据库所有校园数据加载到内存，然后在应用层进行分页 (`list.subList(offset, offset + limit)`)。随着校园数据增长（数百条），每次都全量查询造成不必要的内存和数据库开销。

```java
// 当前实现 - 全量加载
List<Campus> allCampuses = campusRepository.findAll();
List<Campus> page = allCampuses.subList(offset, Math.min(offset + limit, allCampuses.size()));
```

**影响:** 数据库全表扫描/大量数据传输，GC 压力增大，响应变慢。
**修复建议:** 使用 Spring Data 的 `Pageable` 参数实现数据库级分页: `campusRepository.findAll(PageRequest.of(page, size))`。

---

### HIGH-05: RealTempChatService 只读方法修改实体状态

**文件:** `apps/api/src/main/java/com/campuslove/api/chat/RealTempChatService.java`
**严重程度:** HIGH
**类别:** 架构 - REST 原则违反

**问题描述:**
声明为只读查询的 `getTempChatSession()` 方法内部修改了 `TempChatSession` 实体的 `lastAccessedAt` 字段并调用了 `save()`。这违反了 HTTP GET 的安全性原则（GET 不应有副作用），也违反了 CQRS 的读写分离原则。

```java
// GET 请求中修改数据
@Transactional(readOnly = true)  // 标记为只读但实际写入
public TempChatSession getTempChatSession(String sessionId) {
    TempChatSession session = repo.findById(sessionId);
    session.setLastAccessedAt(Instant.now());  // 修改实体状态
    return repo.save(session);  // 写入数据库
}
```

**影响:** 只读事务标记与实际行为矛盾；HTTP GET 的幂等性被破坏；浏览器预取、搜索引擎爬虫可能触发副作用。
**修复建议:** 将访问时间更新拆分为独立的 PATCH/PUT 端点，或使用异步事件 + `@TransactionalEventListener` 更新。

---

### HIGH-06: 零 @Cacheable 使用 -- 无缓存策略

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 性能 - 缓存缺失

**问题描述:**
整个 API 项目中未使用任何 `@Cacheable`、`@CacheEvict`、`@CachePut` 注解。对于以下高频读取的慢变化数据，每次请求都执行完整数据库查询：
- 用户标签列表
- 校园信息
- 系统配置项
- 敏感词列表
- 通知模板

**影响:** 数据库查询量高，热门数据重复查询，峰值 QPS 受限。
**修复建议:** 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。

---

### HIGH-07: 无韧性模式 (Circuit Breaker / Retry)

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 架构 - 韧性缺失

**问题描述:**
项目中未使用 Resilience4j、Sentinel 或 Spring Retry。所有外部调用（微信 API、短信服务、对象存储）均无熔断、重试、降级机制。

**影响:**
- 微信 API 超时时请求堆积耗尽连接池
- 短信服务暂不可用时无重试，用户收不到验证码
- 文件上传服务故障时无降级方案
- 级联故障可能导致整个应用不可用

**修复建议:** 为外部服务调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。

---

### HIGH-08: 写操作无幂等机制

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 架构 - 幂等性缺失

**问题描述:**
所有写操作 API（创建订单、发送消息、点赞、提现等）均未实现幂等性保障。网络超时后客户端重试可能导致：
- 重复创建订单
- 重复发送消息
- 重复点赞
- 重复扣费

**影响:** 网络不稳定或客户端超时重试时产生重复数据、重复扣款。
**修复建议:** 引入幂等键 (Idempotency-Key) 机制，客户端在请求头传入唯一 key，服务端通过 Redis 去重。

---

### HIGH-09: 无 API 版本控制策略

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 架构 - 版本管理

**问题描述:**
API 路径中未包含版本号 (`/api/user/profile` 而不是 `/api/v1/user/profile`)。当需要不兼容的 API 变更时，无法同时支持新旧客户端。

**影响:** API 变更必须同步更新所有客户端，发布节奏耦合，无法灰度发布。
**修复建议:** 在 URL 路径或请求头中引入版本标识 (`/api/v1/...`)。

---

### HIGH-10: 各 Controller 响应格式不一致

**文件:** 所有 Controller 文件
**严重程度:** HIGH
**类别:** 架构 - API 规范

**问题描述:**
不同 Controller 返回的 JSON 结构不统一：

| Controller | 响应格式 |
|------------|----------|
| `AuthController` | `{ "token": "...", "user": {...} }` |
| `UserController` | `{ "code": 200, "data": {...} }` |
| `MatchController` | `{ "success": true, "result": {...} }` |
| `CampusController` | 直接返回 `List<Campus>` |
| `FeedbackController` | `{ "status": "ok", "payload": {...} }` |

**影响:** 前端需要为每种响应格式编写不同的解析逻辑，增加维护成本和出错概率。
**修复建议:** 统一为 `ApiResponse<T>` 包装: `{ "code": 200, "message": "success", "data": T }`。

---

### HIGH-11: 无 Swagger/OpenAPI 文档注解

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 文档 - API 文档缺失

**问题描述:**
项目中未集成 SpringDoc OpenAPI (Swagger UI)，无 `@Operation`、`@Schema`、`@ApiResponse` 等文档注解。API 接口缺少结构化文档，前后端协作依赖于口头沟通或手写文档。

**影响:** 前后端协作效率低，接口变更不可视化，新成员上手困难。
**修复建议:** 引入 `springdoc-openapi-starter-webmvc-ui` 依赖，为核心 Controller 添加文档注解。

---

### HIGH-12: 无定时任务清理过期临时聊天会话

**文件:** `apps/api/src/main/java/com/campuslove/api/chat/`
**严重程度:** HIGH
**类别:** 数据管理

**问题描述:**
临时聊天会话 (`TempChatSession`) 会随时间累积。未配置定时任务 (`@Scheduled`) 清理已过期或长时间未活动的临时会话记录。

**影响:** `temp_chat_session` 表无限增长，查询变慢，占用存储空间。
**修复建议:** 添加 `@Scheduled` 任务定期删除 `expires_at < NOW()` 的过期会话。

---

### HIGH-13: 分页参数未校验边界

**文件:** 多个 Controller 文件
**严重程度:** HIGH
**类别:** 安全 - 输入校验

**问题描述:**
多个分页接口直接使用客户端传入的 `page` 和 `size` 参数，未校验上限。攻击者可传入 `size=100000` 触发大量数据库查询和内存占用。

**修复建议:** 添加 `@Max(100) private int size;` 或全局分页大小上限配置。

---

### HIGH-14: 文件上传无大小和类型校验

**文件:** `apps/api/src/main/java/com/campuslove/api/media/MediaUploadController.java`
**严重程度:** HIGH
**类别:** 安全 - 上传校验

**问题描述:**
文件上传端点仅在前端做了大小限制，后端未校验文件大小和 MIME 类型。攻击者可绕过前端直接调用 API 上传任意大小的文件，耗尽磁盘空间。

**影响:** OOM、磁盘耗尽、恶意文件上传。
**修复建议:** 后端添加 `spring.servlet.multipart.max-file-size` 配置，并校验文件魔数（magic bytes）。

---

### HIGH-15: 缺少请求日志追踪 ID

**文件:** 全项目范围
**严重程度:** HIGH
**类别:** 可观测性

**问题描述:**
项目未使用 MDC (Mapped Diagnostic Context) 或 TraceId 机制。当出现问题时，无法根据前端报错追溯到对应的后端日志。

**修复建议:** 在 Filter/Interceptor 中为每个请求生成 TraceId 并注入 MDC，同时在响应头中返回。

---

## MEDIUM 发现 (代表性)

### MEDIUM-01: Service 层事务边界不清晰

**文件:** `RealAuthService.java`, `RealMatchService.java`
**严重程度:** MEDIUM
**类别:** 事务管理

**问题描述:**
部分 Service 方法的 `@Transactional` 注解粒度不当 -- 读方法上加了 `@Transactional`，但包含远程调用（如微信 API）的写方法未加。远程调用应在事务边界之外执行。

---

### MEDIUM-02: Controller 中混入业务逻辑

**文件:** 多个 Controller 文件
**严重程度:** MEDIUM
**类别:** 分层架构

**问题描述:**
部分 Controller 方法直接操作 Repository 或包含条件判断逻辑，破坏了分层架构。业务逻辑应归属 Service 层。

---

### MEDIUM-03: 日期处理使用旧 API

**文件:** 多个 Service 文件
**严重程度:** MEDIUM
**类别:** 代码规范

**问题描述:**
项目中混用 `java.util.Date`、`java.sql.Timestamp` 和 `java.time.Instant`，未统一迁移至 Java 8+ 时间 API。

---

### MEDIUM-04: 异常类型过于粗糙

**文件:** 全项目范围
**严重程度:** MEDIUM
**类别:** 错误处理

**问题描述:**
大量代码抛出泛化的 `RuntimeException` 而非自定义业务异常（如 `UserNotFoundException`、`MatchAlreadyExistsException`），前端无法根据异常类型做差异化处理。

---

### MEDIUM-05: 数据库迁移使用 Flyway 但版本号无规范

**文件:** `apps/api/src/main/resources/db/migration/`
**严重程度:** MEDIUM
**类别:** 数据库版本管理

**问题描述:**
Flyway 迁移文件版本号命名不一致，部分使用时间戳，部分使用递增数字，缺少统一规范。

---

## LOW 发现 (代表性)

- **LOW-01:** Lombok `@Data` 在 Entity 上使用不当，应使用 `@Getter @Setter`。
- **LOW-02:** `application.yml` 中数据库密码明文存储。
- **LOW-03:** `pom.xml` 中部分依赖版本未集中管理（缺少 `<dependencyManagement>`）。
- **LOW-04:** 部分日志级别不当 -- 生产日志中使用 `log.info()` 输出大量调试信息。
- **LOW-05:** Controller 中直接使用 `System.out.println()` 调试输出。

---

## 架构评估总结

| 维度 | 评分 | 说明 |
|------|------|------|
| REST 规范性 | 4/10 | 响应格式不一致，GET 有副作用 |
| 性能设计 | 3/10 | 无缓存、N+1 查询、内存分页 |
| 韧性设计 | 2/10 | 无熔断、无重试、无降级 |
| 安全设计 | 5/10 | JWT 无撤销、无幂等、上传无校验 |
| 可观测性 | 2/10 | 无 TraceId、无结构化日志 |
| API 文档 | 0/10 | 无 Swagger/OpenAPI |

---

## 修复优先级建议

| 优先级 | 发现编号 | 预计工时 |
|--------|----------|----------|
| P0 (立即) | HIGH-01, HIGH-03, HIGH-14 | 2天 |
| P1 (本周) | HIGH-02, HIGH-04, HIGH-08, HIGH-10 | 3天 |
| P2 (本月) | HIGH-05 ~ HIGH-07, HIGH-09, HIGH-11 ~ HIGH-13, HIGH-15 | 5天 |
| P3 (下月) | MEDIUM-01 ~ MEDIUM-05, LOW-01 ~ LOW-05 | 2天 |
