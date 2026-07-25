# 17-java-api-admin-campus.md — Java API 层 (Admin/Campus) 审计

> **审计日期**: 2026-07-25 | **严重程度分布**: 4 CRITICAL · ~12 HIGH · ~20 MEDIUM · ~11 LOW | **总计 47 项**

---

## 严重程度总览

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 4 | 安全漏洞、DoS 风险、数据丢失 |
| HIGH | ~12 | 权限缺失、事务管理、数据一致性 |
| MEDIUM | ~20 | 性能问题、错误处理、代码质量 |
| LOW | ~11 | 文档、可读性、最佳实践 |

---

## CRITICAL 发现

### 1. RealVillageService.getSimilarAuthors — 调用 `findAll()` 加载全部用户，DoS 攻击向量

- **文件**: `apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java`
- **问题**: `getSimilarAuthors()` 方法中调用 `userRepository.findAll()` 从数据库加载全部用户记录到内存，然后进行 Java 内存内过滤。代码中没有分页参数、没有 LIMIT 子句、没有 `WHERE` 条件。
- **影响**: 随着用户量增长到数万甚至数十万，单次请求将导致：
  - 数据库全表扫描，查询耗时数十秒
  - JVM 堆内存被全部用户对象占满，触发 Full GC
  - 并发请求下数据库连接池耗尽，整个服务不可用
  - 攻击者可轻易利用此接口发动 DoS 攻击
- **修复建议**: 改为使用 `userRepository.findByVillageIdAndTagsIn(villageId, tags, Pageable)` 进行数据库层的过滤和分页，限制每页结果不超过 20 条。

### 2. AdminPostController.deletePost — Javadoc 声明删除评论但从未调用 commentRepository

- **文件**: `apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java`
- **问题**: `deletePost()` 方法的 Javadoc 明确声明 "Deletes the post and all associated comments permanently"（永久删除帖子及其所有关联评论），但方法实现中仅调用了 `postRepository.delete(post)`，没有调用 `commentRepository.deleteByPostId(postId)`。
- **影响**: 运营人员删除违规帖子后，帖子消失了但关联的评论数据残留在数据库中成为孤立数据。这些评论仍占用存储空间，且如果前端通过直接 ID 查询可能被泄漏。如果帖子被删除后管理员需要审计原始违规内容，评论数据不完整。
- **修复建议**: 在 `deletePost` 中添加 `commentRepository.deleteByPostId(postId)` 调用（如果 `ON DELETE CASCADE` 未在数据库层面配置），并添加 `@Transactional` 确保原子性。

### 3. RealVillageService / RealCampusService — N+1 查询问题（作者信息）

- **文件**: `apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java`、`apps/api/src/main/java/com/campuslove/api/campus/RealCampusService.java`
- **问题**: 两个 Service 的 `toCampusTopicView()` 和 `toCampusTopicReplyView()` 转换方法中，对每条帖子/回复循环调用 `userRepository.findById(authorId)` 来填充作者信息，形成了典型的 N+1 查询模式。
- **影响**: 每页加载 20 条帖子，产生 1（帖子查询）+ 20（作者查询）= 21 次数据库查询。加载 20 条回复时，额外产生 1（回复查询）+ 20（作者查询）= 21 次查询。首页加载可能产生 42+ 次数据库往返，响应时间随并发量线性恶化。
- **修复建议**: 先收集所有 authorId，使用 `userRepository.findAllById(authorIds)` 一次性批量加载所有作者，建立 Map 索引后再填充。

    ```java
    // 修复示例
    Set<Long> authorIds = topics.stream()
        .map(CampusTopic::getAuthorId)
        .collect(Collectors.toSet());
    Map<Long, User> usersById = userRepository.findAllById(authorIds).stream()
        .collect(Collectors.toMap(User::getId, Function.identity()));
    // 然后在循环中使用 usersById.get(topic.getAuthorId())
    ```

### 4. FeedbackController — 管理端接口完全缺失身份认证检查

- **文件**: `apps/api/src/main/java/com/campuslove/api/admin/FeedbackController.java`
- **问题**: 管理端的反馈列表查询、反馈回复、反馈状态更新接口上没有任何认证/授权注解（无 `@PreAuthorize`、无 `@Secured`、无自定义注解）。任何知道 API 路径的人都可以访问这些管理接口。
- **影响**: 未授权用户可以：
  - 查看所有用户的反馈内容（可能包含个人隐私信息如手机号）
  - 修改反馈状态（标记为已处理/忽略）
  - 发送虚假的官方回复给用户
- **修复建议**: 在 Controller 类级别添加 `@PreAuthorize("hasRole('ADMIN')")` 或同等注解，确保所有管理接口经过认证和授权检查。

---

## HIGH 发现

### 5. 7 个 Admin Controller 均缺少 `@PreAuthorize` 注解

- **文件**: 
  - `apps/api/src/main/java/com/campuslove/api/admin/AdminCertificationController.java`
  - `AdminConfigController.java`
  - `AdminMatchConfigController.java`
  - `AdminNotifyConfigController.java`
  - `AdminSensitiveWordController.java`
  - `AdminStatsController.java`
  - `AdminAuditLogController.java`
- **问题**: 这 7 个管理后台 Controller 类或方法上均未标注 `@PreAuthorize` 或等效的 Spring Security 权限检查注解。它们依赖于一个可能存在的全局 Filter 或 Interceptor 进行认证（如果全局配置不完整，则完全暴露）。
- **影响**: 与 FeedbackController 类似，所有管理功能可能在无认证的情况下被访问——包括修改匹配规则、发送推送通知、查看统计数据、管理敏感词库等多个敏感操作。
- **修复建议**: 为每个 Admin Controller 添加类级别的 `@PreAuthorize("hasRole('ADMIN')")`，作为深度防御措施（即使全局 Filter 配置正确）。

### 6. AdminNotifyConfigController — 批量更新缺少 `@Transactional`

- **文件**: `apps/api/src/main/java/com/campuslove/api/admin/AdminNotifyConfigController.java`
- **问题**: `updateBatch()` 方法循环调用 `notifyConfigRepository.save()` 更新多条通知配置，但方法上未标注 `@Transactional`。每条 `save()` 在自己的事务中执行。
- **影响**: 如果批量更新 10 条配置，前 5 条更新成功，第 6 条因约束冲突失败，前 5 条不会被回滚。数据库处于半更新状态——部分配置已生效，部分未生效，且没有简便的恢复方式。
- **修复建议**: 添加 `@Transactional` 注解确保批量更新的原子性。

### 7. RealAdminMatchConfigService — `@Transactional` 方法中静默吞异常

- **文件**: `apps/api/src/main/java/com/campuslove/api/admin/RealAdminMatchConfigService.java`
- **问题**: `updateMatchConfig()` 方法标注了 `@Transactional`，但方法内部的 try-catch 块捕获了通用 `Exception` 且仅记录日志，不重新抛出异常。
- **影响**: 事务内发生数据库错误时，异常被吞掉，Spring 的事务管理器认为方法正常返回并提交事务——但实际数据可能未被正确持久化。调用方收到成功响应但数据未变更。
- **修复建议**: 移除 try-catch，让异常自然传播到 Spring 事务管理器以触发回滚。如果确实需要捕获特定异常，应在 catch 块中重新抛出或使用 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`。

### 8. CampusController — 使用 `hashCode()` 作为 schoolId 代理，存在哈希碰撞风险

- **文件**: `apps/api/src/main/java/com/campuslove/api/campus/CampusController.java`
- **问题**: 前端传递 schoolName 字符串参数后，后端使用 `schoolName.hashCode()` 的返回值作为 schoolId 进行数据库查询。Java 的 `String.hashCode()` 可能对不同的字符串产生相同的哈希值（碰撞）。
- **影响**: 理论上，两个不同学校名称（如 "上海交通大学" 和另一个字符串）可能产生相同的 hashCode 值，导致用户看到错误学校的校园墙内容。虽然概率低，但在用户基数大时不是零风险。
- **修复建议**: 在数据库中维护 school 表（id, name），通过精确的字符串匹配或预先分配的数字 ID 来识别学校。

### 9. AdminUserController.toggleUserStatus — 缺少 `@Auditable` 审计注解

- **文件**: `apps/api/src/main/java/com/campuslove/api/admin/AdminUserController.java`
- **问题**: `toggleUserStatus()` 方法可以启用/禁用用户账号，这是一个高度敏感的操作（可能误封正常用户或解封违规用户），但方法上未标注审计注解（项目内部定义的 `@Auditable`）。
- **影响**: 运营人员封禁/解封用户的行为无法被审计日志系统追踪，出现运营事故时无法追溯到具体的操作人和操作时间。
- **修复建议**: 添加 `@Auditable(action = "TOGGLE_USER_STATUS")` 注解，确保操作被记录到审计日志。

---

## 代表 MEDIUM 发现

| # | 文件 | 问题 |
|---|------|------|
| 10 | AdminPostController | `listPosts` 没有请求参数校验——`page` 和 `size` 可以为负数导致 SQL 错误 |
| 11 | RealVillageService | `getTrendingTopics` 的热度算法 `(likes * 2 + comments * 3) / hoursSincePost` 会导致新帖子（hoursSincePost=0）除零异常 |
| 12 | CampusController | `createPost` 未对帖子内容做长度限制——攻击者可发送 MB 级请求体 |
| 13 | AdminSensitiveWordController | 敏感词导入使用同步处理，上传大文件时请求超时 |
| 14 | RealCampusService | 校园墙帖子查询的 SQL 缺少索引友好的 WHERE 条件顺序 |
| 15 | AdminCertificationController | 认证审批后未更新 Elasticsearch/缓存中的用户索引 |
| 16 | AdminStatsController | 统计查询使用实时 COUNT(*) 而非汇总表，数据量大时超时 |
| 17 | AdminConfigController | 配置更新后未通知其他服务实例——多实例部署时配置不一致 |
| 18 | AdminAuditLogController | 审计日志查询的参数未做 SQL 注入防护（虽然使用 JPA 但应确认） |
| 19 | FeedbackController | 反馈回复内容未做 XSS 过滤 |

---

## 关键文件清单

| 文件 | 主要问题 |
|------|----------|
| `RealVillageService.java` | **CRITICAL** findAll + **CRITICAL** N+1 查询 |
| `RealCampusService.java` | **CRITICAL** N+1 查询 |
| `AdminPostController.java` | **CRITICAL** Javadoc 声明未实现、参数校验缺失 |
| `FeedbackController.java` | **CRITICAL** 无认证、XSS 未过滤 |
| `AdminCertificationController.java` | **HIGH** 无 @PreAuthorize |
| `AdminConfigController.java` | **HIGH** 无 @PreAuthorize |
| `AdminMatchConfigController.java` | **HIGH** 无 @PreAuthorize |
| `AdminNotifyConfigController.java` | **HIGH** 无 @PreAuthorize、无 @Transactional |
| `AdminSensitiveWordController.java` | **HIGH** 无 @PreAuthorize |
| `AdminStatsController.java` | **HIGH** 无 @PreAuthorize、实时 COUNT |
| `AdminAuditLogController.java` | **HIGH** 无 @PreAuthorize |
| `AdminUserController.java` | **HIGH** 缺少 @Auditable |
| `CampusController.java` | **HIGH** hashCode 碰撞、无内容长度限制 |
| `RealAdminMatchConfigService.java` | **HIGH** 吞事务异常 |

---

## 修复优先级建议

1. **🚨 立即修复 (CRITICAL)**: FeedbackController 认证缺失、RealVillageService 的 findAll() DoS
2. **本周修复 (HIGH)**: 7 个 Controller 的 @PreAuthorize、N+1 查询批量优化、@Transactional 和审计注解
3. **下个迭代 (MEDIUM)**: 参数校验、热度算法除零、内容长度限制、统计查询优化
