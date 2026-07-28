# ADR-0008: 韧性模式 - Resilience4j 熔断 + 重试

- **Status**: Accepted
- **Date**: 2026-07-26
- **Deciders**: 架构组、后端 Lead
- **Tags**: resilience, circuit-breaker, retry, fallback

---

## Context and Problem Statement

校园恋爱小程序依赖多个外部服务：

- 微信开放平台（登录、支付、推送）
- 阿里云 OSS / 腾讯云 COS（对象存储）
- Agnes AI 视频 API
- 短信服务
- 邮件服务

这些外部服务可能出现：

- 短暂不可用（5-30 秒）
- 持续故障（数分钟到数小时）
- 网络抖动（请求超时）
- 限流（429 Too Many Requests）

如果不加防护：

- **级联失败**：外部服务故障 → 线程池耗尽 → 应用崩溃
- **用户体验差**：用户等待 30 秒后才看到错误
- **故障扩散**：一个外部服务故障影响整个系统

需要引入韧性模式，包括熔断、重试、降级、限流。

---

## Decision Drivers

- **外部依赖多**：5+ 个第三方服务
- **故障隔离**：单个外部服务故障不影响核心功能
- **快速失败**：避免线程池被耗尽
- **自动恢复**：故障恢复后自动切回
- **降级体验**：故障时提供 fallback 而非崩溃
- **可观测性**：熔断/重试事件可监控

---

## Considered Options

### 方案 A：Resilience4j（**选定**）

- Spring Boot 3.x 原生支持
- 提供熔断、重试、限流、降级、舱壁
- 函数式 API，类型安全
- Micrometer 集成，监控友好

### 方案 B：Hystrix

- 优势：成熟方案，案例多
- 劣势：已停止维护，进入维护模式

### 方案 C：Sentinel

- 优势：阿里巴巴出品，国内案例多
- 劣势：与 Spring Boot 3.x 兼容性需验证

### 方案 D：自研

- 优势：完全可控
- 劣势：重复造轮子，无社区验证

---

## Pros and Cons of the Options

### 方案 A（Resilience4j）

| 优点 | 缺点 |
|------|------|
| ✅ Spring Boot 3.x 原生支持 | ❌ 函数式 API 学习成本 |
| ✅ 功能完整（熔断/重试/限流/舱壁） | ❌ 配置项较多 |
| ✅ Micrometer 集成 | |
| ✅ 活跃维护 | |
| ✅ 轻量级（无外部依赖） | |

### 方案 B（Hystrix）

| 优点 | 缺点 |
|------|------|
| ✅ 成熟方案 | ❌ 已停止维护 |
| ✅ 案例多 | ❌ 不支持 Spring Boot 3.x |
| ✅ Dashboard 监控 | ❌ 性能不如 Resilience4j |

### 方案 C（Sentinel）

| 优点 | 缺点 |
|------|------|
| ✅ 阿里出品 | ❌ Spring Boot 3.x 兼容性需验证 |
| ✅ 控制台完善 | ❌ 配置中心化，运维复杂 |
| ✅ 国内案例多 | |

### 方案 D（自研）

| 优点 | 缺点 |
|------|------|
| ✅ 完全可控 | ❌ 重复造轮子 |
| ✅ 可定制 | ❌ 无社区验证 |
| | ❌ 维护成本高 |

---

## Decision

**选定方案 A：Resilience4j**

### 详细设计

#### 韧性模式分类

| 模式 | 用途 | 应用场景 |
|------|------|----------|
| Circuit Breaker | 熔断，防止级联失败 | 外部 API 调用 |
| Retry | 重试，应对短暂故障 | 网络抖动 |
| Rate Limiter | 限流，保护下游 | 调用第三方 |
| Bulkhead | 舱壁，隔离资源 | 不同业务隔离 |
| Time Limiter | 超时控制 | 所有外部调用 |
| Fallback | 降级，提供备选 | 故障时返回默认 |

#### 配置示例

```yaml
resilience4j:
  circuitbreaker:
    instances:
      wechatApi:
        register-health-indicator: true
        sliding-window-size: 20                  # 滑动窗口大小
        minimum-number-of-calls: 10              # 最小调用次数
        failure-rate-threshold: 50               # 失败率阈值 50%
        wait-duration-in-open-state: 30s         # 熔断后等待时间
        permitted-number-of-calls-in-half-open-state: 5  # 半开状态允许调用数
        slow-call-duration-threshold: 5s         # 慢调用阈值
        slow-call-rate-threshold: 80             # 慢调用率阈值
      objectStorage:
        sliding-window-size: 10
        failure-rate-threshold: 30
        wait-duration-in-open-state: 60s
      smsApi:
        sliding-window-size: 20
        failure-rate-threshold: 40
        wait-duration-in-open-state: 60s

  retry:
    instances:
      wechatApi:
        max-attempts: 3                          # 最大重试次数
        wait-duration: 1s                        # 重试间隔
        retry-exceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
      objectStorage:
        max-attempts: 3
        wait-duration: 500ms

  timelimiter:
    instances:
      wechatApi:
        timeout-duration: 10s                    # 超时时间
      objectStorage:
        timeout-duration: 30s
      aiVideo:
        timeout-duration: 60s
```

#### 代码示例

```java
@Service
public class WeChatClient {

    @CircuitBreaker(name = "wechatApi", fallbackMethod = "fallbackCode2Session")
    @Retry(name = "wechatApi")
    @TimeLimiter(name = "wechatApi")
    public CompletableFuture<Code2SessionResponse> code2Session(String code) {
        return CompletableFuture.supplyAsync(() -> {
            // 调用微信 API
            return weChatApi.code2Session(code);
        });
    }

    private CompletableFuture<Code2SessionResponse> fallbackCode2Session(String code, Throwable t) {
        log.warn("WeChat API fallback triggered, code={}, error={}", code, t.getMessage());
        throw new WechatApiUnreachableException("微信登录暂时不可用，请稍后重试", t);
    }
}
```

#### 应用范围

| 后端 Service | 熔断 | 重试 | 超时 | 降级 |
|--------------|------|------|------|------|
| WeChatClient（登录） | ✅ | ✅ | ✅ 10s | ✅ 抛异常 |
| WeChatPushService（推送） | ✅ | ✅ | ✅ 5s | ✅ 入队列 |
| LocalMediaStorageService（存储） | ✅ | ✅ | ✅ 30s | ✅ 返回错误 |
| RealAiVideoService（AI 视频） | ✅ | ❌ | ✅ 60s | ✅ 返回降级提示 |
| SmsService（短信） | ✅ | ✅ | ✅ 10s | ✅ 入队列 |

#### 监控集成

- Resilience4j 自动发布 Micrometer 指标
- Prometheus 抓取，Grafana 展示
- 关键指标：
  - `resilience4j_circuitbreaker_state`（CLOSED/OPEN/HALF_OPEN）
  - `resilience4j_circuitbreaker_failure_rate`
  - `resilience4j_retry_calls_total`
  - `resilience4j_timelimiter_timeout_total`

#### 告警规则

```yaml
# docker/prometheus/rules/alert-rules.yml
- alert: CircuitBreakerOpen
  expr: resilience4j_circuitbreaker_state{state="open"} == 1
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Circuit breaker {{ $labels.instance }} is open"
    description: "External service {{ $labels.name }} is unavailable"

- alert: HighRetryRate
  expr: rate(resilience4j_retry_calls_total{result="success_with_retry"}[5m]) > 0.3
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High retry rate for {{ $labels.name }}"
```

#### 降级策略

| 场景 | 降级方案 |
|------|----------|
| 微信登录失败 | 返回「微信登录暂时不可用，请稍后重试」 |
| 微信推送失败 | 消息进入 RabbitMQ 队列，恢复后重试 |
| AI 视频失败 | 返回「AI 视频生成中，请稍后查看」 |
| 短信发送失败 | 入队列，重试 3 次仍失败则邮件通知管理员 |
| 对象存储失败 | 返回错误，提示用户重试 |

---

## Consequences

### 正面后果

- **故障隔离**：单个外部服务故障不影响核心功能
- **快速失败**：熔断后立即返回错误，避免线程耗尽
- **自动恢复**：半开状态自动尝试恢复
- **可观测**：监控指标完善，故障可见
- **降级体验**：用户看到友好提示而非崩溃

### 负面后果

- **配置复杂**：每个外部服务需独立配置
- **重试放大**：重试可能放大下游压力（需配合限流）
- **降级数据不一致**：降级返回的数据可能与真实数据不同

### 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 重试风暴 | 限制最大重试次数（3 次）+ 指数退避 |
| 熔断误判 | 调整失败率阈值（50%）+ 半开状态探测 |
| 降级数据错误 | 降级返回明确提示，不返回伪造数据 |
| 配置漂移 | 配置文件版本控制 + 灰度发布 |

---

## Compliance Note

- 韧性模式不影响业务正确性，仅影响可用性
- 降级时明确告知用户「数据可能不是最新」
- 熔断事件记录到审计日志，便于事后分析

---

## Related Documents

- [ADR-0004: 缓存方案](./0004-cache-redis-cluster.md)
- [ADR-0002: 认证方案](./0002-authentication-jwt-wechat.md)（微信 API 韧性）
- 实现代码：
  - `apps/api/src/main/java/com/campuslove/api/config/Resilience4jConfig.java`
  - `apps/api/src/main/java/com/campuslove/api/wechat/WeChatClient.java`
- 监控告警：`docker/prometheus/rules/alert-rules.yml`

---

## Change Log

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-07-26 | 首次提议 | 架构组 |
| 2026-07-26 | 评审通过 | 后端 Lead |
