# ADR-0004: 缓存方案 - Redis + Caffeine 两级缓存

- **Status**: Accepted
- **Date**: 2026-05-25
- **Deciders**: 架构组、后端 Lead
- **Tags**: cache, redis, caffeine, performance

---

## Context and Problem Statement

校园恋爱小程序有多个高并发读场景：

1. **推荐列表**：每秒 500+ 请求，数据 30 秒更新一次
2. **敏感词过滤**：每条用户内容都需过滤，调用频繁
3. **系统配置**：全平台共享，几乎不变
4. **校园信息**：100+ 所学校，几乎不变
5. **用户标签**：用户编辑时才变
6. **JWT 黑名单**：每次请求都查
7. **限流计数**：Bucket4j 令牌桶

如果所有读请求都打到数据库，数据库会瞬间被压垮。需要缓存方案缓解数据库压力。

但缓存也带来问题：

- **缓存一致性**：数据更新后缓存如何同步
- **缓存雪崩**：大量缓存同时失效，DB 瞬间过载
- **缓存穿透**：查询不存在的数据，绕过缓存
- **缓存击穿**：热点 key 失效瞬间，大量请求打 DB

---

## Decision Drivers

- **性能要求**：P99 ≤ 200ms
- **一致性要求**：缓存与 DB 最终一致，延迟 ≤ 5s
- **可用性**：缓存故障不能拖垮整个系统
- **运维成本**：缓存方案运维复杂度可控
- **扩展性**：支持未来百万级 QPS

---

## Considered Options

### 方案 A：Redis + Caffeine 两级缓存（**选定**）

- L1：Caffeine 本地缓存（JVM 内存）
- L2：Redis 分布式缓存
- 读流程：L1 → L2 → DB
- 写流程：DB → 删除 L2 → 广播删除 L1

### 方案 B：仅 Redis

- 优势：架构简单
- 劣势：每次请求网络开销（~3ms）

### 方案 C：仅 Caffeine

- 优势：性能最优（纳秒级）
- 劣势：多实例数据不一致

### 方案 D：Redis Cluster

- 优势：水平扩展
- 劣势：当前 QPS 未达单机瓶颈，过度设计

---

## Pros and Cons of the Options

### 方案 A（Redis + Caffeine 两级缓存）

| 优点 | 缺点 |
|------|------|
| ✅ 本地缓存命中纳秒级 | ❌ 多实例 L1 一致性需广播 |
| ✅ Redis 故障时 L1 兜底 | ❌ 实现复杂度高 |
| ✅ 减少 Redis 网络开销 | ❌ 内存占用增加 |
| ✅ 分级 TTL 灵活 | |

### 方案 B（仅 Redis）

| 优点 | 缺点 |
|------|------|
| ✅ 架构简单 | ❌ 每次请求 ~3ms 网络开销 |
| ✅ 多实例一致 | ❌ Redis 故障即全失效 |
| ✅ 运维简单 | |

### 方案 C（仅 Caffeine）

| 优点 | 缺点 |
|------|------|
| ✅ 性能最优 | ❌ 多实例数据不一致 |
| ✅ 无外部依赖 | ❌ 重启即失效 |
| | ❌ 不适合分布式场景 |

### 方案 D（Redis Cluster）

| 优点 | 缺点 |
|------|------|
| ✅ 水平扩展 | ❌ 当前 QPS 未达瓶颈 |
| ✅ 高可用 | ❌ 运维复杂 |
| | ❌ 过度设计 |

---

## Decision

**选定方案 A：Redis + Caffeine 两级缓存**

### 详细设计

#### 缓存分层

| 层级 | 实现 | 用途 | TTL |
|------|------|------|-----|
| L1 | Caffeine | 热点数据本地缓存 | 60s |
| L2 | Redis | 分布式缓存 | 5-30min |
| DB | MySQL | 持久化存储 | 永久 |

#### 读流程

```
[请求] → L1 (Caffeine)
            ↓ miss
         L2 (Redis)
            ↓ miss
         DB (MySQL)
            ↓
         写回 L2 + L1
            ↓
         返回数据
```

#### 写流程（Cache Aside Pattern）

```
[更新请求] → 写 DB
            ↓
         删除 L2 (Redis)
            ↓
         发布 Redis Pub/Sub 消息 "invalidate:<key>"
            ↓
         各实例订阅消息，删除本地 L1
```

#### 缓存分类与 TTL

| 缓存类型 | L1 TTL | L2 TTL | 备注 |
|----------|--------|--------|------|
| 敏感词列表 | 5min | 30min | 几乎不变 |
| 系统配置 | 5min | 30min | 后台修改后广播失效 |
| 校园信息 | 5min | 30min | 几乎不变 |
| 用户标签 | 60s | 5min | 用户编辑后失效 |
| 每日一问 | 不缓存 | 24h | 当天有效 |
| 推荐列表 | 不缓存 | 30s | 实时性要求高 |
| 热门帖子 | 60s | 5min | Top 50 |
| JWT 黑名单 | 不缓存 | TTL=JWT剩余 | 强一致 |
| 限流计数 | 不缓存 | 1s | Bucket4j |

#### 防雪崩、穿透、击穿

| 问题 | 解决方案 |
|------|----------|
| 缓存雪崩 | TTL 加随机偏移（±10%），避免同时失效 |
| 缓存穿透 | 空结果也缓存（TTL 60s），布隆过滤器（可选） |
| 缓存击穿 | 互斥锁（synchronized + 双重检查） |
| 热点 key | 多副本 key（如 `key:1`、`key:2` 随机读） |

#### Spring Cache 集成

```java
@Cacheable(value = "sensitiveWords", key = "'all'")
public List<String> getAllSensitiveWords() {
    return sensitiveWordRepository.findAll().stream()
        .map(SensitiveWord::getWord)
        .collect(Collectors.toList());
}

@CacheEvict(value = "sensitiveWords", key = "'all'")
public void addSensitiveWord(String word) {
    sensitiveWordRepository.save(new SensitiveWord(word));
    // 发布失效广播
    redisTemplate.convertAndSend("cache:invalidate", "sensitiveWords:all");
}
```

#### Caffeine 配置

```yaml
spring:
  cache:
    type: redis
    redis:
      time-to-live: 30m
      cache-names:
        - sensitiveWords
        - systemConfig
        - schools
        - userTags
        - dailyQuestion
        - hotPosts

caffeine:
  spec:
    expireAfterWrite: 60s
    maximumSize: 10000
    recordStats: true
```

---

## Consequences

### 正面后果

- **性能优秀**：本地命中纳秒级，分布式命中 ~3ms
- **可用性强**：Redis 故障时 L1 兜底
- **扩展性好**：未来可平滑迁移到 Redis Cluster
- **分级 TTL**：不同业务灵活配置

### 负面后果

- **L1 一致性需广播**：增加实现复杂度
- **内存占用**：每个 JVM 实例额外占用 ~100MB
- **运维复杂度**：需监控两层缓存命中率

### 监控指标

| 指标 | 阈值 | 告警 |
|------|------|------|
| L1 命中率 | < 30% | 调整 TTL 或容量 |
| L2 命中率 | < 80% | 调整 TTL 或预热策略 |
| Redis 内存 | > 80% | 扩容或清理 |
| Redis QPS | > 50000 | 考虑 Cluster |
| 缓存失败率 | > 1% | 检查 Redis 健康 |

---

## Compliance Note

- 不缓存敏感数据明文（如手机号、身份证号需脱敏后缓存）
- 缓存数据有 TTL，满足「数据最小化保留」原则
- 用户登出后 L1 + L2 同步清除个人数据缓存

---

## Related Documents

- [ADR-0002: 认证方案](./0002-authentication-jwt-wechat.md)（JWT 黑名单缓存）
- [ADR-0003: 数据库选型](./0003-database-mysql-utf8mb4.md)
- [ADR-0008: 韧性模式](./0008-resilience4j-circuit-breaker.md)
- 实现代码：
  - `apps/api/src/main/java/com/campuslove/api/config/RedisConfig.java`
  - `apps/api/src/main/java/com/campuslove/api/config/CaffeineCacheConfig.java`
- 监控：`docker/grafana/dashboards/jvm-health.json`

---

## Change Log

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-05-25 | 首次提议 | 架构组 |
| 2026-05-28 | 评审通过 | CTO |
| 2026-07-26 | 补充防雪崩/穿透/击穿策略 | 架构组 |
