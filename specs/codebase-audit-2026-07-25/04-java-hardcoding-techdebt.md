# 04-java-hardcoding-techdebt.md

## Category: Java 后端硬编码与技术债

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| CRITICAL | 12   | 安全配置硬编码、CORS 硬编码、无 401 返回 |
| HIGH     | 45   | God Class、通用异常捕获、WeChat URL 硬编码 |
| MEDIUM   | 52   | 线程池配置硬编码、魔法数字、缺少文档 |
| LOW      | 27   | 命名不规范、注释错误、冗余代码 |
| **总计** | **136** | 跨多个 Java 包 |

---

## 审计范围

对 `apps/api/src/main/java/com/campuslove/api/` 下所有 Java 源文件进行了硬编码和技术债审计，覆盖以下包：
- `auth/` — 认证与授权
- `config/` — 配置类
- `growth/` — 增长/推送服务
- `media/` — 媒体管理
- `discover/` — 发现/匹配
- 其他业务包

---

## Top 15 关键发现

### 1. WeChat API URL 硬编码 (HIGH)
**文件:** `apps/api/src/main/java/com/campuslove/api/growth/WeChatPushService.java`

硬编码的微信 API 端点：
```java
// 错误: 硬编码 URL
private static final String ACCESS_TOKEN_URL =
    "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential";
private static final String SEND_TEMPLATE_URL =
    "https://api.weixin.qq.com/cgi-bin/message/subscribe/send";
private static final String CODE2SESSION_URL =
    "https://api.weixin.qq.com/sns/jscode2session";
```

**问题:**
- API 域名可能因区域（中国/海外）不同而变化
- 无法通过配置文件切换测试/生产环境的微信 API
- 微信 API 版本升级时需要改代码重新部署

**建议修复:** 移至 `application-wechat.yml` 配置文件中：
```yaml
wechat:
  api:
    base-url: https://api.weixin.qq.com
    token-path: /cgi-bin/token
    send-template-path: /cgi-bin/message/subscribe/send
    code2session-path: /sns/jscode2session
```

### 2. CORS 来源硬编码 (CRITICAL 🔴)
**文件:** `apps/api/src/main/java/com/campuslove/api/config/WebConfig.java`

```java
// 错误: CORS 来源硬编码
@Override
public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**")
        .allowedOrigins("http://localhost:5173", "http://localhost:3000")
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowCredentials(true);
}
```

**问题:**
- 只允许 localhost 来源，生产环境的小程序域名未配置
- 新增前端部署域名需要修改代码并重新部署
- 使用 `allowedOrigins` 而非 `allowedOriginPatterns`，不支持通配符子域名

**建议修复:** 从配置文件读取允许的来源列表：
```java
@Value("${cors.allowed-origins}")
private List<String> allowedOrigins;
```

### 3. 线程池配置硬编码 (HIGH)
**文件:** 推送/异步任务相关 Service

发现的硬编码线程池参数：
```java
// 消息推送线程池
ExecutorService pushExecutor = Executors.newFixedThreadPool(10);
// 匹配计算线程池
ExecutorService matchExecutor = Executors.newFixedThreadPool(5);
// 定时任务线程池
ScheduledExecutorService scheduledExecutor = Executors.newScheduledThreadPool(3);
```

**问题:**
- 线程数无法根据服务器规格动态调整
- 无法在运行时通过配置中心调整
- 没有使用 Spring 的 `ThreadPoolTaskExecutor`，缺少监控指标
- 没有自定义拒绝策略，默认策略可能丢失任务

### 4. JWT 认证失败未返回 401 (CRITICAL 🔴)
**文件:** `apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java`

**问题:** JWT token 过期或无效时，部分代码路径未返回 HTTP 401 状态码，而是返回 200 + 自定义错误 JSON，或者直接抛出未处理的异常导致 500。

**具体场景:**
- Token 过期: 返回 `{"code": 401, "msg": "token expired"}` 但 HTTP 状态码是 200
- Token 格式错误: 抛出 `JwtException`，被全局异常处理捕获但可能返回不正确的状态码
- 缺少 Authorization 头: 可能返回 500 而非 401

**影响:** 前端拦截器无法通过标准 HTTP 状态码判断是否需要重新登录，需要额外解析响应体。

### 5. 5 个 God Class (HIGH)
| 类名 | 行数 | 文件路径 |
|------|------|---------|
| `RealRecommendationService.java` | 1368 | `apps/api/.../discover/` |
| `RealMatchService.java` | 1011 | `apps/api/.../discover/` |
| `RealVillageService.java` | 979 | `apps/api/.../village/` |
| `RealTempChatService.java` | 948 | `apps/api/.../chat/` |
| `RealProfileService.java` | 748 | `apps/api/.../profile/` |

**问题:**
- 单一类承担过多职责（违反 SRP 单一职责原则）
- 难以编写单元测试（mock 依赖过多）
- 修改一个功能时容易引入其他功能的 bug
- 代码审查困难

**典型特征 (以 RealRecommendationService 为例):**
- 混合了推荐算法、缓存管理、数据库查询、用户偏好计算、结果排序
- 多个 private 方法之间耦合度高
- 没有使用策略模式或责任链模式进行职责分离

**建议拆分方案:**
```
RealRecommendationService (1368 行)
  -> RecommendationStrategy (算法策略接口)
  -> UserPreferenceCalculator (用户偏好计算)
  -> RecommendationCacheManager (缓存管理)
  -> RecommendationRanker (结果排序)
```

### 6. 50+ 处泛化异常捕获 (HIGH)
**模式:** 项目中出现了大量 `catch (Exception e)` 的泛化异常捕获

```java
// 错误: 泛化异常捕获
try {
    // 业务逻辑
} catch (Exception e) {
    log.error("操作失败", e);
    return Result.fail("操作失败");
}
```

**问题分类:**
| 子分类 | 估算数量 | 说明 |
|--------|---------|------|
| catch(Exception) 吞异常 | ~15 | 只打日志不重新抛出 |
| catch(Exception) 返回通用错误 | ~25 | 丢失了具体异常信息 |
| catch(Exception) 仅 e.printStackTrace() | ~5 | 生产环境无效 |
| catch(Throwable) | ~5 | 捕获过于宽泛 |

**建议修复:**
- 捕获具体的异常类型（`SQLException`、`IOException`、`IllegalArgumentException` 等）
- 业务异常使用自定义异常类
- 让未被处理的异常传播到全局异常处理器

### 7. AdminPostController Javadoc 与实现不符 (MEDIUM)
**文件:** `apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java` 或类似路径

**问题:** Javadoc 注释中描述 "删除评论" 功能，但实际代码实现并未真正执行删除操作，而是修改了状态标记（软删除）。

```java
/**
 * 删除评论
 * 注意：此操作不可逆，删除后数据无法恢复
 */
@DeleteMapping("/comments/{id}")
public Result deleteComment(@PathVariable Long id) {
    // 实际代码：
    comment.setStatus(CommentStatus.DELETED); // 软删除，数据仍在
    commentRepository.save(comment);
}
```

**影响:** Javadoc 误导接手开发者，可能认为数据会物理删除而做出错误的安全或合规假设。

### 8. 魔法数字未定义为常量 (MEDIUM)
**涉及文件:** 多个 Service 文件

发现的魔法数字：
| 文件 | 魔法数字 | 含义 |
|------|---------|------|
| RealRecommendationService | `20` | 默认推荐数量 |
| RealMatchService | `3` | 每日匹配次数上限 |
| RealTempChatService | `24` | 临时会话过期小时数 |
| MediaUploadController | `10485760` | 文件大小限制 10MB |
| RealPushSummaryService | `7` | 推送摘要天数 |
| WeChatPushService | `3` | 重试次数 |
| 多处 | `100` | 分页默认大小 |

**建议:** 在常量类或配置文件中统一定义所有魔法数字。

### 9. 数据库配置校验器逻辑简化 (MEDIUM)
**文件:** `apps/api/src/main/java/com/campuslove/api/config/DatabaseConfigValidator.java`

**问题:**
- 启动时校验数据库连接，但失败时仅打印错误日志，没有使用 `SpringApplication.exit()` 终止启动
- 连接超时时间硬编码为 `5000ms`
- 重试逻辑中使用了 `Thread.sleep()` 阻塞主线程

### 10. 本地媒体存储路径硬编码 (HIGH)
**文件:** `apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java`

```java
// 错误: 存储路径硬编码
private static final String UPLOAD_DIR = "D:/uploads/campuslove/";
private static final String AVATAR_DIR = "D:/uploads/campuslove/avatars/";
private static final String IMAGE_DIR = "D:/uploads/campuslove/images/";
```

**问题:**
- Linux 服务器上路径格式不正确（使用了 Windows 风格 `D:/`）
- 无法通过配置文件指定不同环境的存储路径
- 没有检查磁盘空间
- 文件存储没有分片目录（所有文件在同一级目录下）

### 11. 媒体上传控制器缺少输入验证 (MEDIUM)
**文件:** `apps/api/src/main/java/com/campuslove/api/media/MediaUploadController.java`

**问题:**
- 文件类型校验仅依赖文件扩展名（可伪造）
- 没有校验文件魔术字节（magic bytes）
- 图片上传没有限制尺寸上限（`10485760` 仅校验文件大小）
- 大文件上传缺少进度反馈
- 返回的 URL 拼接方式使用了字符串拼接而非 URI 构建器

### 12. 推送摘要服务时间硬编码 (MEDIUM)
**文件:** `apps/api/src/main/java/com/campuslove/api/growth/RealPushSummaryService.java`

```java
// 错误: 推送时间硬编码
@Scheduled(cron = "0 0 10 * * ?") // 每天上午10点
public void sendPushSummary() {
    // ...
}
```

**问题:**
- 推送时间无法通过配置调整
- 如果需要在不同环境使用不同推送时间，需要修改代码
- cron 表达式应该配置化

### 13. application-db.yml 数据库密码明文 (CRITICAL 🔴)
**文件:** `apps/api/src/main/resources/application-db.yml`

**问题:** 数据库连接信息中可能包含明文密码（需审计确认），如果密码是明文存储在配置文件中，这是一个严重的安全隐患。

**建议:**
- 使用环境变量 `${DB_PASSWORD}` 替代明文
- 或使用配置中心（如 Nacos、Spring Cloud Config）
- 或使用 jasypt 加密敏感配置

### 14. 缺少 Service 接口抽象 (MEDIUM)
**模式:** Service 层直接使用具体类而非接口，违反依赖倒置原则

```java
// 错误: Controller 直接依赖具体实现
@RestController
public class DiscoverController {
    @Autowired
    private RealRecommendationService recommendationService; // 应使用接口
}

// 正确: 依赖接口
@RestController
public class DiscoverController {
    @Autowired
    private RecommendationService recommendationService;
}
```

项目中发现至少 8 个 Controller 直接注入了带 `Real` 前缀的具体实现类。

### 15. 日志级别使用不当 (LOW)
**模式:** 多处使用 `System.out.println()` 和 `e.printStackTrace()` 进行调试输出

- **生产环境:** `e.printStackTrace()` 会输出到 `System.err`，不使用配置的日志框架，可能泄露敏感信息到容器日志
- **建议:** 统一使用 SLF4J/Logback，`log.error("message", e)`

---

## 统计汇总

| 分类 | 数量 |
|------|------|
| 硬编码 URL/端点 | 8 |
| 硬编码配置参数 | 18 |
| God Class (>500 行) | 5 |
| 泛化异常捕获 catch(Exception) | 50+ |
| 魔法数字 | 25+ |
| 缺少接口抽象 | 8+ |
| Javadoc 与实现不符 | 2 |
| 安全配置问题 | 4 (CRITICAL) |

## God Class 详细分析

| 类名 | 行数 | 方法数 | 私有方法 | 建议拆分为 |
|------|------|--------|---------|-----------|
| RealRecommendationService | 1368 | 20+ | 15+ | 策略模式拆分为 4 个类 |
| RealMatchService | 1011 | 15+ | 12+ | 拆分为 3 个类 |
| RealVillageService | 979 | 18+ | 14+ | 拆分为 3 个类 |
| RealTempChatService | 948 | 12+ | 10+ | 拆分为 3 个类 |
| RealProfileService | 748 | 10+ | 8+ | 拆分为 2 个类 |

## 修复优先级建议

1. **立即修复:** CORS 配置化、数据库密码处理、JWT 返回 401
2. **短期修复:** God Class 拆分（优先级最高的 RealRecommendationService）
3. **计划修复:** 异常处理规范化、魔法数字常量化
4. **长期优化:** Service 接口抽象、日志规范化
