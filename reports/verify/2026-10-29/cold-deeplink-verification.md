# 深链冷启动修复验证（2026-10-29）

> 验证对象：`8f126c19 fix(chat): assign deep-link sessionId before auth gate`
> 环境：微信开发者工具模拟器 + `apps/client/dist/build/mp-weixin-real` + real API 8080
> 证据：`tmp/verify-20261028/cold-deeplink-result.json`、`cold-deeplink-fixed.png`、`regression/chat-cold.png`（修复前）

## 验证步骤（可复现）

1. 新建独立临时会话：用户 A/B，phase=active，24h 有效，B 发一条消息「冷启动深链验证消息。」。
2. `debug_clear_cache --action cleanCompileCache`：清编译缓存（模拟冷启动）。
3. `clearSession` + `bootSession(A.token)`：只注入 token，不清除 token 后重新登录。
4. **不做任何暖启动**（不打开首页、不先访问消息 tab），直接：
   `simulator_open_page --page subpackages/chat/chat-session/index --query sessionId=<uid>`
5. 轮询页面运行时，直到 `chat.activeSession.id` 等于目标 session；取截图与页面栈。

## 结果

页面运行时状态（`$pinia` 的 chat store）：

```json
{
  "stack": ["subpackages/chat/chat-session/index"],
  "route": "subpackages/chat/chat-session/index",
  "querySessionId": "qa-cold-temp-1793206277071",
  "activeId": "qa-cold-temp-1793206277071",
  "partnerName": "匿名·云朵",
  "recommendedPersonId": "anon-qa-cold-temp-1793206277071",
  "messageCount": 1,
  "contactStatus": "idle"
}
```

- `activeId` 与深链 session 一致，说明补载 watcher 生效；
- `partnerName` 为伪名、`recommendedPersonId` 为 `anon-*`，强匿名视图正确；
- `messageCount=1`，B 的消息已加载；
- 页面栈只有会话页，无中间页/无暖启动；
- 截图 `cold-deeplink-fixed.png`：24 小时匿名横幅 + 「冷启动深链验证消息。」。

## 对照

| 版本 | 现象 | 证据 |
|---|---|---|
| 修复前 | 页面落在私信默认壳（标题「聊天」、无 temp 请求），`chat-cold.png` | `tmp/verify-20261028/regression/chat-cold.png` |
| 修复后 | 直接进入临时匿名会话，匿名横幅/消息加载 | `cold-deeplink-fixed.png` |

## 修复内容

- `onLoad` 在 `if (!isUnlocked.value) return` **之前**先落位 `query.sessionId`；
- 保留 `watch(isUnlocked)`：登录态异步恢复后补一次 `loadSessionData()`（只补一次）；
- 回归测试：`chat-session-page.spec.ts` 增加 2 例，断言 `sessionId` 赋值早于登录门、补载 watcher 存在。

## 备注

- 本轮 `openSuccess` 字段是工具返回结构探测，已从结果 JSON 移除；以上页面状态、页面栈和截图为准。
- 验证用 fixture 已清理（临时会话/消息/交换记录删除，token 临时文件已删）。
