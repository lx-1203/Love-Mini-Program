# ADR-0006: API 版本化 - URI 前缀 `/api/v1/`

- **Status**: Accepted
- **Date**: 2026-07-26
- **Deciders**: 架构组、后端 Lead
- **Tags**: api, versioning, rest

---

## Context and Problem Statement

校园恋爱小程序 API 需要在生命周期内不断演进，包括：

- 新增字段（如 User 增加 `vip_level`）
- 修改字段类型（如 `created_at` 从 String 改为 Long）
- 删除字段（如废弃 `legacy_id`）
- 改变业务行为（如推荐算法变更）

直接修改 API 会导致：

- 老版本客户端崩溃（用户未更新小程序）
- 第三方集成方对接失败
- 无法回滚（出问题后无法快速恢复）

需选择一种 API 版本化策略，平衡：

1. **兼容性**：老客户端不受影响
2. **演进性**：新功能可平滑引入
3. **可发现性**：版本号清晰可见
4. **运维成本**：版本管理复杂度可控

---

## Decision Drivers

- **微信小程序客户端更新延迟**：用户可能 30 天不更新
- **多端兼容**：H5、小程序、Admin 后台需同时支持
- **RESTful 规范**：遵循行业最佳实践
- **运维简洁**：避免复杂的版本路由逻辑
- **未来扩展**：支持 v2、v3 平滑升级

---

## Considered Options

### 方案 A：URI 前缀 `/api/v1/`（**选定**）

- 所有端点以 `/api/v1/` 开头
- 不兼容变更时新增 `/api/v2/`
- 老版本至少保留 6 个月

### 方案 B：Header 版本化 `Accept: application/vnd.campuslove.v1+json`

- 优势：URI 干净
- 劣势：调试不便，文档不直观

### 方案 C：Query 参数 `?version=1`

- 优势：灵活
- 劣势：易遗漏，缓存友好性差

### 方案 D：无版本化（向后兼容承诺）

- 优势：简单
- 劣势：演进受限，无法做破坏性变更

---

## Pros and Cons of the Options

### 方案 A（URI 前缀）

| 优点 | 缺点 |
|------|------|
| ✅ 版本号显式可见 | ❌ URI 变长 |
| ✅ 浏览器/curl 直接调试 | ❌ 多版本时路由配置增加 |
| ✅ 文档自动生成友好 | |
| ✅ 行业标准（GitHub/Twilio） | |
| ✅ CDN 缓存友好 | |

### 方案 B（Header）

| 优点 | 缺点 |
|------|------|
| ✅ URI 干净 | ❌ 调试需带 Header |
| ✅ RESTful 纯粹 | ❌ 文档生成复杂 |
| | ❌ 浏览器直接访问不支持 |

### 方案 C（Query 参数）

| 优点 | 缺点 |
|------|------|
| ✅ 灵活 | ❌ 易遗漏 |
| ✅ 兼容性好 | ❌ CDN 缓存命中差 |
| | ❌ 不够显式 |

### 方案 D（无版本化）

| 优点 | 缺点 |
|------|------|
| ✅ 简单 | ❌ 演进受限 |
| | ❌ 破坏性变更无法做 |

---

## Decision

**选定方案 A：URI 前缀 `/api/v1/`**

### 详细规则

#### 1. 路径规范

- 所有 API 必须以 `/api/v{major}/` 开头
- 当前主版本：`v1`
- AI 接口例外：`/api/ai/**`（因属于实验性功能）

#### 2. 兼容性规则

| 变更类型 | 是否需新版本 | 示例 |
|----------|--------------|------|
| 新增字段（响应） | ❌ 不需要 | User 增加 `vip_level` |
| 新增端点 | ❌ 不需要 | 新增 `/api/v1/notifications/unread` |
| 删除字段（响应） | ✅ 需新版本 | 删除 `legacy_id` |
| 修改字段类型 | ✅ 需新版本 | `created_at` String → Long |
| 修改字段语义 | ✅ 需新版本 | `status: 1` 含义变更 |
| 修改必填参数 | ✅ 需新版本 | 新增必填 `device_id` |
| 修改业务行为 | ✅ 需新版本 | 推荐算法变更 |
| 修改 HTTP 方法 | ✅ 需新版本 | GET → POST |

#### 3. 双版本共存策略

当引入 v2 时：

- v1 与 v2 同时部署
- v1 端点保留 ≥ 6 个月（或老客户端占比 < 5% 时下线）
- v1 响应可附加 `Deprecation` Header + `Sunset` Header
- v1 文档标注「已废弃，请迁移到 v2」

```java
@GetMapping("/api/v1/users/{id}")
@Deprecated
public ResponseEntity<UserV1Dto> getUserV1(@PathVariable Long id) {
    HttpHeaders headers = new HttpHeaders();
    headers.add("Deprecation", "true");
    headers.add("Sunset", "Wed, 31 Dec 2026 23:59:59 GMT");
    headers.add("Link", "</api/v2/users/" + id + ">; rel=\"successor-version\"");
    return new ResponseEntity<>(userService.getUserV1(id), headers, HttpStatus.OK);
}
```

#### 4. 版本号管理

- **Major**：不兼容变更（v1 → v2）
- **Minor**：兼容新增（v1.0 → v1.1，URL 不变）
- **Patch**：Bug 修复（URL 不变）

仅在 Major 变更时改变 URI 前缀。

#### 5. Controller 命名规范

- 单版本：`UserController`（不加版本后缀）
- 双版本共存：`UserController`（v1）、`UserV2Controller`（v2）
- Service 层共享，DTO 层分离（`UserV1Dto`、`UserV2Dto`）

#### 6. 文档自动化

- springdoc-openapi 自动按版本分组
- Swagger UI 路径：`/swagger-ui.html?group=v1`
- OpenAPI JSON：`/v3/api-docs/v1`

---

## Consequences

### 正面后果

- **版本显式**：URI 中可见版本号，调试友好
- **演进灵活**：不兼容变更可平滑引入 v2
- **文档自动**：springdoc 自动生成版本化文档
- **行业惯例**：与 GitHub/Twilio/Stripe 等主流 API 一致

### 负面后果

- **URI 变长**：每个端点多 8 字符（`/api/v1/`）
- **多版本运维**：v2 上线后需维护 v1 至少 6 个月
- **代码重复**：双版本共存时 Controller/DTO 需复制

### 迁移策略

当 v2 发布时：

1. **通知期**（T-90 天）：通过 Header `Deprecation` + 文档公告
2. **观察期**（T-30 天）：监控 v1 调用量，< 5% 时准备下线
3. **下线期**（T+0）：v1 返回 410 Gone + 迁移指引
4. **清理期**（T+30 天）：删除 v1 代码

---

## Compliance Note

- 遵循 RESTful API 设计原则
- 满足「不破坏老客户端」的兼容性要求
- 提供清晰的废弃通告机制（RFC 8594 Sunset Header）

---

## Related Documents

- [ADR-0001: 技术栈选型](./0001-technology-stack-selection.md)
- API 契约文档：`docs/API-CONTRACT.md`
- OpenAPI 注解指南：`docs/OPENAPI-ANNOTATION-GUIDE.md`
- 实现代码：`apps/api/src/main/java/com/campuslove/api/**/*Controller.java`

---

## Change Log

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-07-26 | 首次提议 | 架构组 |
| 2026-07-26 | 评审通过 | 后端 Lead |
