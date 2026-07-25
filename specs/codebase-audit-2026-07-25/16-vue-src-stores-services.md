# 16-vue-src-stores-services.md — Vue/TS src/stores & services 审计

> **审计日期**: 2026-07-25 | **严重程度分布**: 0 CRITICAL · 2 HIGH · ~30 MEDIUM · ~18 LOW | **总计 50 项**

---

## 严重程度总览

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 0 | — |
| HIGH | 2 | 功能不可用或生产环境接口报错 |
| MEDIUM | ~30 | 数据一致性问题、功能降级、类型安全 |
| LOW | ~18 | 代码质量、可读性 |

---

## HIGH 发现

### 1. stores/chat.ts — `sendText` 使用 `as any` 传递未声明字段，生产环境 400 风险

- **文件**: `apps/client/src/stores/chat.ts`
- **问题**: `sendText()` 函数在调用 API 时，使用 TypeScript 的 `as any` 类型断言传递消息对象。对象包含了接口定义中不存在的额外字段（如 `localId`、`sendingStatus` 等客户端状态字段），这些字段被一并发送到后端。
- **影响**: 严格的后端 JSON Schema 校验会拒绝包含未知字段的请求体，返回 HTTP 400。在网络条件差时，用户发送消息可能失败但本地显示已发送，造成消息丢失的假象。
- **修复建议**: 定义明确的 `SendMessageRequest` 接口类型，在调用 API 前使用 pick/omit 移除内部状态字段，移除 `as any` 断言。

    ```typescript
    // 修复示例
    const payload: SendMessageRequest = {
      sessionId: msg.sessionId,
      content: msg.content,
      type: msg.type,
    };
    await api.sendMessage(payload);
    ```

### 2. services/agnes-video.ts — AI 生成 API 返回 401，功能完全不可用

- **文件**: `apps/client/src/services/agnes-video.ts`
- **问题**: AI 视频生成功能的 API 端点返回 HTTP 401 Unauthorized。该服务使用的 API Key 或认证机制已过期/无效，所有 AI 视频生成请求均被拒绝。
- **影响**: 用户尝试使用 AI 视频生成功能时永远失败，但前端未捕获 401 并给出友好提示——用户看到的是通用错误信息，不知道是认证问题。该功能模块对用户完全不可用。
- **修复建议**: 
  1. 与服务端确认 Agnes Video API 的认证方式是否变更
  2. 将 API Key 移至环境变量而非硬编码
  3. 添加 401 专用错误处理，向用户显示 "服务暂不可用" 并通知运维团队

---

## 代表 MEDIUM 发现

### 3. stores/discover.ts — `swipeRight` API 失败时静默降级到 Mock 随机匹配

- **文件**: `apps/client/src/stores/discover.ts`
- **问题**: 当 `swipeRight` API 调用失败时，错误处理中直接 `catch` 了异常并使用 `Math.random() > 0.5` 生成一个虚假的匹配结果返回给调用方。
- **影响**: 后端匹配服务宕机时，用户以为自己在正常使用匹配功能（实际上收到的是随机结果）。这可能产生垃圾匹配记录，且用户对匹配成功率产生错误预期。
- **修复建议**: API 失败时向上层抛出异常，由页面组件展示具体的错误信息和重试按钮，不要在 Store 层静默吞掉错误。

### 4. stores/profile.ts — `load()` 未加载 `vipStatus` 和 `myPosts`

- **文件**: `apps/client/src/stores/profile.ts`
- **问题**: `load()` 方法调用 `/api/profile` 获取用户信息后，仅填充了基础字段（nickname、avatar、bio 等），但 `vipStatus`（VIP 状态）和 `myPosts`（我的帖子）两个属性未被从响应中提取或通过独立 API 加载。
- **影响**: 个人主页的 VIP 标识永远不显示或显示为默认值（非 VIP），用户即使购买了 VIP 也看不到身份标识。"我的帖子" Tab 永远为空，用户以为帖子未发布成功。
- **修复建议**: 在 `load()` 中解析并存储 `vipStatus` 字段；添加独立的 `loadMyPosts()` 方法或分页延迟加载。

### 5. services/api.ts — `loginWithWechat` 使用类型断言提取 token

- **文件**: `apps/client/src/services/api.ts`
- **问题**: `loginWithWechat()` 方法从响应体中提取 token 字段时，使用了 `(response as any).data.token` 类型断言，而非定义明确的响应类型接口。
- **影响**: 后端返回结构变更（如 token 字段重命名或嵌套层级变化）时，TypeScript 编译器无法检测到错误，登录流程在运行时崩溃。
- **修复建议**: 定义 `LoginResponse` 接口，使用类型守卫或 zod 运行时校验确保响应结构符合预期。

### 6. stores/activity.ts — `fetchMoreActivities` 分页功能不工作

- **文件**: `apps/client/src/stores/activity.ts`
- **问题**: `fetchMoreActivities()` 方法的实现中，`page` 参数始终传递固定值（可能是 `1`），而非当前页码 + 1。或者页码状态未被正确持久化，每次调用都从第 1 页开始加载。
- **影响**: 用户下拉加载更多活动时，看到的是重复的第一页数据，新活动永远无法加载出来。
- **修复建议**: 维护 `currentPage` 状态并在每次调用后递增，将正确的页码传递给 API。

### 7. stores/session.ts — `profileCompletion` 计算使用 `min(baseScore, detailScore)`，显示误导性数据

- **文件**: `apps/client/src/stores/session.ts`
- **问题**: 用户资料完成度的计算逻辑为 `Math.min(baseScore, detailScore)`，而非 `(baseScore + detailScore) / maxPossible`。取最小值意味着用户填写了大量的基础信息但细节信息较少时，完成度显示极低。
- **影响**: 用户填写了 80% 的基础信息和 20% 的细节信息，完成度显示为 20%，严重打击用户完善资料的积极性。
- **修复建议**: 改为加权平均或求和方式计算完成度，更好地反映用户实际填写的资料比例。

### 8. services/websocket.ts — Stomp 帧处理使用 `as unknown as Record<string,unknown>` 绕过类型系统

- **文件**: `apps/client/src/services/websocket.ts`
- **问题**: 处理 Stomp 协议帧时，将帧体转换为 `Record<string,unknown>` 类型使用了双重类型断言 `as unknown as Record<string,unknown>`，完全绕过了 TypeScript 的类型检查。
- **影响**: 如果后端消息格式变更，TypeScript 无法提供编译时保护，运行时可能出现 `Cannot read property 'x' of undefined` 错误。
- **修复建议**: 使用 zod schema 或自定义 type guard 对帧体进行运行时校验，确保数据结构符合预期后再使用。

### 9. stores/messages.ts — `fetchNotifications` 存在 filterType 更新与 API 调用的竞态条件

- **文件**: `apps/client/src/stores/messages.ts`
- **问题**: `fetchNotifications()` 方法中，先更新 `filterType` 状态（同步），再调用 API（异步）。如果用户在 API 返回前快速切换过滤器，`filterType` 可能已被更新为新的值，但 API 响应返回的是旧过滤器的数据。
- **影响**: 通知列表显示的数据与当前选中的过滤器类型不匹配，用户看到点赞通知在评论过滤 Tab 下。
- **修复建议**: 使用请求序列号或 AbortController，当新请求发起时取消旧请求，或检查返回时的 filterType 是否与发起请求时一致。

### 10. stores/checkin.ts — Mock 签到连续天数逻辑跨日边界存在 Bug

- **文件**: `apps/client/src/stores/checkin.ts`
- **问题**: Mock 签到逻辑中判断"连续签到"是基于上一次签到时间戳与当前时间戳的差值是否小于 48 小时。但比较使用的是 `Date.now()`（客户端时间，可被用户修改）且存在时区问题。用户在不同时区签到或手动调整手机时间后，连续签到计数可能重置或异常。
- **影响**: 依赖签到连续天数解锁的奖励（如连续 7 天签到奖励）可能因时区/时间问题无法正常获取，引发用户投诉。
- **修复建议**: 签到连续性的判断应由服务端基于服务器时间执行，客户端仅展示服务端返回的签到状态。

---

## 代表 LOW 发现

| # | 文件 | 问题 |
|---|------|------|
| 11 | stores/discover.ts | `swipeLeft` 操作未调用后端 API，仅做本地状态更新（跳过记录未上报） |
| 12 | stores/profile.ts | `updateProfile` 成功后未同步更新 session store 中的缓存 |
| 13 | services/api.ts | 请求超时时间硬编码为 10000ms，未使用配置文件中的值 |
| 14 | stores/chat.ts | `sendText` 中乐观更新的消息使用 `Date.now()` 作为临时 ID，存在极小概率冲突 |
| 15 | services/websocket.ts | 重连策略使用固定间隔，未使用指数退避算法 |
| 16 | stores/messages.ts | 未读消息计数仅在 `fetchMessages` 时更新，WebSocket 推送的新消息不更新计数 |
| 17 | stores/activity.ts | `registerActivity` 成功后未更新活动参与人数 |
| 18 | services/agnes-video.ts | 请求未设置超时——AI 生成耗时较长时可能无限等待 |

---

## 关键文件清单

| 文件 | 行数(估) | 主要问题 |
|------|----------|----------|
| `apps/client/src/stores/chat.ts` | ~200 | **HIGH** `as any` 类型绕过、乐观更新 ID 冲突 |
| `apps/client/src/services/agnes-video.ts` | ~80 | **HIGH** 401 认证失败、无超时 |
| `apps/client/src/stores/discover.ts` | ~180 | Mock 降级吞错误、swipeLeft 未上报 |
| `apps/client/src/stores/profile.ts` | ~120 | vipStatus/myPosts 未加载 |
| `apps/client/src/services/api.ts` | ~200 | 类型断言、超时硬编码 |
| `apps/client/src/stores/activity.ts` | ~100 | 分页不工作 |
| `apps/client/src/stores/session.ts` | ~150 | profileCompletion 计算误导 |
| `apps/client/src/services/websocket.ts` | ~100 | 类型绕过、固定重连 |
| `apps/client/src/stores/messages.ts` | ~150 | 竞态条件、未读计数 |
| `apps/client/src/stores/checkin.ts` | ~60 | 跨日边界 Bug |

---

## 修复优先级建议

1. **立即修复 (HIGH)**: `chat.ts` 的 `as any` 问题、`agnes-video.ts` 的 401
2. **本周修复 (MEDIUM)**: `discover.ts` 错误处理、`profile.ts` 缺失字段、`activity.ts` 分页
3. **下个迭代 (LOW)**: 类型安全改进、websocket 指数退避
