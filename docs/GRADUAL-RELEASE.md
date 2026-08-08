# 灰度发布策略（Gradual Release Strategy）

> 对应规范：`.trae/specs/2026-07-26-commercialize-longterm-fixall/tasks.md` Task 9.2.3
> 适用范围：校园恋爱小程序商业化发布的灰度控制
> 维护者：DevOps Lead & Release Manager
> 最近更新：2026-07-26
> 配套文档：`docs/CI-CD.md`、`docs/release-checklist.md`、`docs/API-CONTRACT.md`

---

## 1. 总则

### 1.1 目标

通过分阶段、可控的方式将新版本推送给用户，最大化降低发布风险：

- **风险控制**：发现问题时仅影响小范围用户，可快速回滚
- **质量验证**：在生产流量下验证功能与性能，避免全量故障
- **用户体验**：避免大版本变更导致用户困惑
- **运营节奏**：配合运营活动逐步放量，观察留存与转化

### 1.2 适用场景

| 场景 | 是否灰度 | 备注 |
|------|----------|------|
| Hotfix（紧急修复） | ❌ 全量 | 影响范围明确，需立即生效 |
| Patch（向后兼容修复） | ⚠️ 50% 灰度 | 验证 24h 后全量 |
| Minor（新功能，向后兼容） | ✅ 5%→20%→50%→100% | 严格灰度 |
| Major（不兼容变更） | ✅ 1%→5%→20%→50%→100% | 极严格灰度 + 双版本共存 |

### 1.3 原则

- **可观测**：每个灰度阶段必须配套监控指标与告警
- **可回滚**：任何阶段发现问题可在 5 分钟内回滚至上一版本
- **可暂停**：灰度过程中可随时暂停放量，保持当前比例
- **小步快跑**：单次灰度比例提升不超过 5 倍
- **数据驱动**：基于监控指标与用户反馈决定是否继续放量

---

## 2. API 版本化策略

### 2.1 版本路径

- 当前主版本：`/api/v1/**`
- 引入不兼容变更时新增：`/api/v2/**`
- v1 兼容期：≥ 6 个月（具体时长按用户迁移速度调整）
- 兼容期内 v1 端点保留，响应可附加 `deprecation` 字段

### 2.2 双版本共存架构

```
客户端 v1.0    ──▶  /api/v1/**  ──▶  Service v1
                                        │
客户端 v1.1    ──▶  /api/v2/**  ──▶  Service v2
                                        │
                                        ├── 共享数据库（Schema 兼容）
                                        ├── 共享 Redis
                                        └── 共享消息队列
```

### 2.3 兼容性保障

- 数据库 Schema 变更必须向后兼容（新增字段而非修改/删除）
- 共享 Redis Key 添加版本前缀：`v1:user:session:*` / `v2:user:session:*`
- 消息队列 Message 添加 `version` 字段，消费者按版本路由

### 2.4 版本协商

客户端在请求头携带 `X-API-Version: 1`（或 2），后端按版本路由：

```java
@GetMapping(value = {"/api/v1/users/{id}", "/api/v2/users/{id}"})
public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
    // 共享 Service 调用，差异在响应 DTO 中处理
}
```

### 2.5 弃用流程

1. v2 上线后，v1 端点响应附加：
   ```json
   {
     "deprecation": true,
     "sunset": "2026-12-31",
     "link": "https://docs.example.com/migration/v2"
   }
   ```
2. 提前 4 周通过站内信/邮件通知前端与第三方
3. 监控 v1 调用量，< 1% 时启动下线流程
4. 下线 v1，记录在 CHANGELOG.md

---

## 3. 用户分组策略

> ⚠️ 规划态（R4-02109 ~ R4-02112）：本章 3.1~3.3 描述的灰度分组、
> 名单管理与客户端判断均为设计方案，当前代码中无对应实现
> （无 `admin_app_switch` 表、无 `config.refresh` 队列监听、
> 无 `services/gray-release.ts` / `session.grayReleaseConfig`）。
> 落地前按本章实现计划推进，相关变更须登记 CHANGELOG。

### 3.1 分组维度（规划）

#### 3.1.1 按用户 ID 哈希（推荐，规划）

```java
public boolean isUserInGrayRelease(Long userId, int percentage) {
    int hash = Math.abs(userId.hashCode()) % 100;
    return hash < percentage;
}
```

- 优点：同一用户始终进入同一组，体验一致
- 缺点：无法精确控制具体用户

#### 3.1.2 按用户标签

- VIP 用户优先体验（白名单）
- 高活跃用户优先（DAU ≥ 30 天）
- 特定校区用户优先（如试点校区）

#### 3.1.3 按设备

- iOS / Android 分组
- 微信版本分组（基础库版本）
- 地域分组（按 IP 解析省份）

### 3.2 灰度名单管理（规划）

#### 3.2.1 后端配置

存储在 `admin_app_switch` 表，通过 Admin 后台动态调整：

```sql
CREATE TABLE admin_app_switch (
  id BIGINT PRIMARY KEY,
  switch_key VARCHAR(64) NOT NULL,         -- 如 'gray_release_v1_1_0'
  switch_value VARCHAR(256) NOT NULL,       -- 如 '{"percentage":5,"whitelist":[1,2,3]}'
  description VARCHAR(256),
  updated_at TIMESTAMP,
  updated_by VARCHAR(64)
);
```

#### 3.2.2 配置广播

通过 RabbitMQ 广播配置变更事件，所有实例订阅并刷新本地缓存：

```java
@RabbitListener(queues = "config.refresh")
public void onConfigRefresh(ConfigUpdatedEvent event) {
    if (event.getKey().startsWith("gray_release_")) {
        grayReleaseCache.refresh(event.getKey(), event.getValue());
    }
}
```

#### 3.2.3 缓存策略

- 本地缓存：Caffeine，TTL=30s
- 远端缓存：Redis，TTL=5min
- 配置变更时主动刷新（Pub/Sub）

### 3.3 客户端灰度判断（规划）

> 规划示例：`services/gray-release.ts` 与 `session.grayReleaseConfig` 当前均不存在（R4-02111）。

```typescript
// services/gray-release.ts（规划，尚未实现）
import { useSessionStore } from '@/stores/session';

export function isGrayReleaseEnabled(featureKey: string): boolean {
  const session = useSessionStore();
  const userId = session.userId;
  const config = session.grayReleaseConfig[featureKey];

  if (!config?.enabled) return false;
  if (config.whitelist?.includes(userId)) return true;
  if (config.blacklist?.includes(userId)) return false;

  return Math.abs(hashCode(String(userId))) % 100 < config.percentage;
}
```

---

## 4. 灰度阶段（Stages）

### 4.1 阶段定义

| 阶段 | 用户比例 | 持续时间 | 通过标准 | 失败标准 |
|------|----------|----------|----------|----------|
| Stage 0 - 内测 | 0%（仅白名单） | 1-3 天 | 内部团队无 critical bug | 任何 critical bug |
| Stage 1 - 小流量 | 1% | 1-2 天 | 错误率 < 0.5%，P99 < 2s | 错误率 > 1% 或 P99 > 5s |
| Stage 2 - 中流量 | 5% | 2-3 天 | 错误率 < 0.3%，客服反馈 < 5 条 | 错误率 > 0.5% 或客服反馈 > 20 条 |
| Stage 3 - 大流量 | 20% | 3-5 天 | 错误率 < 0.2%，留存无下降 | 错误率 > 0.3% 或留存下降 > 2% |
| Stage 4 - 半量 | 50% | 3-5 天 | 错误率 < 0.1%，业务指标无异常 | 任何业务指标异常 |
| Stage 5 - 全量 | 100% | - | - | - |

### 4.2 阶段切换决策

每个阶段结束前召开灰度评审会议，参会人员：

- Release Manager（主持）
- Tech Lead
- QA Lead
- Product Lead
- DevOps Lead
- 客服代表

#### 4.2.1 通过标准（全部满足）

- [ ] 错误率 < 阈值
- [ ] P99 响应时间 < 阈值
- [ ] 客服反馈数量 < 阈值
- [ ] 留存率与上版本持平或提升
- [ ] 关键业务指标（匹配成功率/消息发送量/付费转化）无显著下降
- [ ] 无未解决 critical bug

#### 4.2.2 失败标准（任一触发立即回滚）

- [ ] 错误率超阈值
- [ ] P99 响应时间超阈值
- [ ] 客服反馈爆发（> 阈值）
- [ ] 留存率下降 > 2%
- [ ] 业务指标下降 > 5%
- [ ] 数据丢失或损坏

### 4.3 阶段切换流程

1. 灰度评审会议确认通过
2. Release Manager 在 Admin 后台修改 `gray_release_v{version}` 配置
3. 配置广播至所有实例（< 30s 生效）
4. 监控指标观察 30 分钟
5. 如异常立即回滚（详见 §6）
6. 如正常进入下一阶段

---

## 5. 客户端灰度发布

### 5.1 微信小程序灰度

微信小程序支持「分阶段发布」，可在发布时选择比例：

1. 提交审核通过后，点击「发布」
2. 选择「分阶段发布」
3. 设置初始比例（建议 1%）
4. 观察数据，逐步提升比例（5% → 20% → 50% → 100%）
5. 每次提升间隔 ≥ 24 小时

### 5.2 客户端代码灰度

通过环境变量或后端配置控制功能开关：

```typescript
// Feature Flag 服务
import { useSessionStore } from '@/stores/session';

export function useFeatureFlag(flagName: string) {
  const session = useSessionStore();
  return computed(() => session.featureFlags[flagName] === true);
}

// 使用
const newMatchAlgorithm = useFeatureFlag('new_match_algorithm_v2');
if (newMatchAlgorithm.value) {
  // 新算法
} else {
  // 旧算法
}
```

### 5.3 多端协同

| 端 | 灰度机制 | 同步策略 |
|----|----------|----------|
| 微信小程序 | 微信平台分阶段发布 | 与后端灰度独立，但需协调 |
| H5 | 后端按 userId 返回不同 HTML | 完全由后端控制 |
| Admin | 无灰度（内部用户） | 全量发布 |

### 5.4 客户端版本兼容

- 客户端 v1.0 调用 v1 接口
- 客户端 v1.1 调用 v1 或 v2 接口（按 Feature Flag）
- 后端必须同时支持 v1 与 v2 至少 6 个月

---

## 6. 回滚预案（Rollback Plan）

### 6.1 回滚触发条件

任一以下条件触发立即回滚：

- 错误率 > 1%（持续 5 分钟）
- P99 响应时间 > 5s（持续 5 分钟）
- 关键告警触发（500 错误率 / OOM / 熔断器打开）
- 客服反馈 > 20 条/小时
- 数据完整性问题（数据丢失/损坏）

### 6.2 回滚流程

#### 6.2.1 API 回滚（5 分钟内）

```bash
# 1. 确认回滚决策（Release Manager + Tech Lead）
# 2. 拉取上一版本镜像
docker pull campus-love-api:v0.9.0

# 3. 滚动部署上一版本
docker compose up -d --no-deps api  # 使用 v0.9.0 镜像

# 4. 验证健康
curl -fsS https://api.example.com/actuator/health

# 5. 关闭灰度配置
# 通过 Admin 后台将 gray_release_v1_1_0.percentage 设为 0

# 6. 通知团队
# 钉钉群通知 + 邮件归档
```

#### 6.2.2 客户端回滚（微信小程序）

1. 微信公众平台 > 版本管理 > 撤回审核（如仍在审核）
2. 微信公众平台 > 版本管理 > 回退到上一版本（如已发布）
3. 用户下次冷启动生效
4. 通知用户（公告/推送）

#### 6.2.3 数据库回滚

仅在有数据损坏或 Schema 不兼容时执行：

```bash
# 1. 停止写入流量（维护页面）
docker compose stop api

# 2. 恢复发布前备份（详见 docs/DR/restore-procedure.md）
gunzip -c /backup/campus_love-20260726-020000.sql.gz | \
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" campus_love

# 3. 验证数据完整性
docker compose exec mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" campus_love -e \
  "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM posts;"

# 4. 启动上一版本 API
docker compose start api
```

#### 6.2.4 配置回滚

```bash
# Git 回滚配置
cd /opt/campus-love-config
git checkout HEAD~1 -- .
docker compose restart api
```

### 6.3 回滚后行动

- [ ] Post-mortem 会议（24 小时内）
- [ ] 根因分析（Root Cause Analysis）
- [ ] 修复方案制定
- [ ] 重新灰度发布
- [ ] 经验教训沉淀至 `docs/lessons-learned.md`

---

## 7. 监控与告警

### 7.1 灰度监控面板

Grafana Dashboard 必须包含以下面板：

#### 7.1.1 灰度流量分布

- 灰度用户数 vs 总用户数（实时）
- 灰度比例（百分比）
- 灰度用户地理分布
- 灰度用户设备分布

#### 7.1.2 灰度 vs 非灰度对比

- 错误率：灰度组 vs 非灰度组
- P99 响应时间：灰度组 vs 非灰度组
- QPS：灰度组 vs 非灰度组
- 业务指标：匹配成功率/消息发送量/付费转化

#### 7.1.3 灰度异常检测

- 灰度组错误率突增告警
- 灰度组 P99 突增告警
- 灰度组业务指标下降告警

### 7.2 告警规则

```yaml
# docker/prometheus/rules/gray-release-rules.yml
groups:
- name: gray-release
  rules:
  - alert: GrayReleaseErrorRateHigh
    expr: |
      rate(http_server_requests_seconds_count{status=~"5..", gray="true"}[5m])
      / rate(http_server_requests_seconds_count{gray="true"}[5m]) > 0.01
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "灰度组错误率 > 1%"
      description: "灰度组 5xx 错误率 {{ $value }}% 超过阈值 1%"

  - alert: GrayReleaseLatencyHigh
    expr: |
      histogram_quantile(0.99, rate(http_server_requests_seconds_bucket{gray="true"}[5m])) > 5
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "灰度组 P99 > 5s"
      description: "灰度组 P99 响应时间 {{ $value }}s 超过阈值 5s"

  - alert: GrayReleaseBusinessMetricDrop
    expr: |
      rate(match_success_total{gray="true"}[5m])
      / rate(match_success_total{gray="false"}[5m]) < 0.95
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "灰度组匹配成功率下降 > 5%"
```

### 7.3 日志追踪

- 所有请求添加 `X-Gray-Release: true/false` 响应头
- 日志中记录 `grayRelease` 字段
- TraceId 贯穿灰度组与非灰度组对比

---

## 8. 通讯与协同

### 8.1 内部通讯

| 阶段 | 通知对象 | 通知方式 | 时机 |
|------|----------|----------|------|
| Stage 0 启动 | 内部团队 | 钉钉群 | 启动前 1 天 |
| Stage 1 启动 | Tech/QA/DevOps | 钉钉群 + 邮件 | 启动前 4 小时 |
| Stage 2-4 启动 | + Product/客服 | 钉钉群 + 邮件 | 启动前 1 天 |
| Stage 5 全量 | 全公司 | 邮件 | 启动前 1 天 |
| 异常/回滚 | 全相关人员 | 钉钉群 + 电话 | 立即 |

### 8.2 外部通讯

- 公告：站内信 + 公众号（重大版本）
- 客服：FAQ 更新 + 培训
- 社交媒体：微博/小红书（如有运营）

### 8.3 应急联系

| 角色 | 姓名 | 电话 | 钉钉 |
|------|------|------|------|
| Release Manager | TBD | TBD | TBD |
| Tech Lead | TBD | TBD | TBD |
| DevOps Lead | TBD | TBD | TBD |
| QA Lead | TBD | TBD | TBD |
| 客服 Lead | TBD | TBD | TBD |

---

## 9. 灰度发布操作手册

### 9.1 启动灰度

```bash
# 1. 确认所有 release-checklist 通过
cat docs/release-checklist.md | grep -c '\[x\]'  # 应 ≥ 90%

# 2. 设置灰度比例为 1%
# 通过 Admin 后台 > 系统配置 > 灰度发布 > gray_release_v1_1_0
# 设置 {"enabled": true, "percentage": 1, "whitelist": [1, 2, 3]}

# 3. 验证配置生效
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.example.com/api/v1/admin/configs/gray_release_v1_1_0

# 4. 观察监控 30 分钟
# Grafana: https://grafana.example.com/d/gray-release

# 5. 如正常，继续提升比例
# 1% → 5% → 20% → 50% → 100%
```

### 9.2 暂停灰度

```bash
# 通过 Admin 后台将 percentage 设为当前值（不提升）
# 或设置 enabled: false 回到非灰度状态
```

### 9.3 回滚灰度

```bash
# 1. 立即将灰度比例设为 0%
# Admin 后台 > 系统配置 > gray_release_v1_1_0
# 设置 {"enabled": false, "percentage": 0}

# 2. 等待 30s 配置广播生效

# 3. 验证新版本流量归零
# Grafana 灰度流量面板应显示 0

# 4. 按 §6 执行完整回滚
```

---

## 10. 历史灰度记录

| 版本 | 灰度开始 | 灰度结束 | 持续时间 | 最终比例 | 结果 | 备注 |
|------|----------|----------|----------|----------|------|------|
| v1.0.0 | 2026-07-26 | - | - | 0% | 进行中 | 商业化首版 |

---

## 11. 验收清单

灰度发布完成全量后，确认以下事项：

- [ ] 灰度比例已达 100%
- [ ] 监控指标稳定 7 天无异常
- [ ] 客服反馈回归正常水平
- [ ] 业务指标达成预期
- [ ] 灰度配置已删除（或保留 enabled=false）
- [ ] Post-mortem 会议已召开（如有问题）
- [ ] 经验教训已沉淀
- [ ] 下一版本灰度计划已制定

---

## 附录 A：灰度发布决策树

```
启动灰度
   │
   ▼
Stage 0 - 内测（白名单）
   │
   ├── 异常 ──▶ 回滚 + 修复
   │
   ▼
Stage 1 - 1% 流量
   │
   ├── 异常 ──▶ 回滚 + 修复
   │
   ▼
Stage 2 - 5% 流量
   │
   ├── 异常 ──▶ 回滚 + 修复
   │
   ▼
Stage 3 - 20% 流量
   │
   ├── 异常 ──▶ 回滚 + 修复
   │
   ▼
Stage 4 - 50% 流量
   │
   ├── 异常 ──▶ 回滚 + 修复
   │
   ▼
Stage 5 - 100% 全量
   │
   ▼
发布完成
```

## 附录 B：常见问题

**Q: 灰度过程中发现非 critical bug，是否继续？**
A: 视影响范围决定。如不影响核心旅程，可继续灰度并安排修复；如影响核心旅程，暂停灰度。

**Q: 灰度阶段用户反馈新旧版本不一致，如何处理？**
A: 通过 `userId` 哈希保证同一用户始终进入同一组。如确实出现不一致，检查 `grayReleaseCache` 是否正确刷新。

**Q: 灰度阶段是否可以发布 Hotfix？**
A: 可以。Hotfix 走独立分支，修复后直接全量发布，与灰度无关。

**Q: 灰度阶段数据库 Schema 变更如何处理？**
A: 灰度阶段不允许 Schema 变更。如必须变更，需暂停灰度，全量发布新版本。

**Q: 微信小程序灰度与后端灰度如何协同？**
A: 建议后端先灰度（按 userId），稳定后再启动微信小程序灰度。两端灰度比例独立控制，但需协调提升节奏。
