# 修复提交与应用记录（2026-10-29）

## 提交状态

- HEAD：`e667dc40`；tracked 工作区干净（0 个已跟踪改动）。
- 修复提交：
  - `8f126c19` fix(chat): assign deep-link sessionId before auth gate
  - `e9e3fd07` feat(notifications): add notification center and close wave-2 boundaries
  - `de3dedae` docs(audit): full regression report 2026-10-29
  - `e667dc40` docs(audit): verify cold deep-link fix

## 应用动作

| 目标 | 动作 | 结果 |
|---|---|---|
| 后端 API | 从 HEAD `mvn package`，停旧进程后重启 real profile | `Started CampusLoveApplication`，`/config/legal`=200 |
| 后台 | `pnpm build` | exit 0，33–36s，`apps/admin/dist` 10:26 |
| 小程序 | `release-chain.mjs --allow-loopback` | `PASS steps=15`，主包 1.64MB / 总包 2.75MB，`shippable=no` |
| 静态树 | `prepare-static --dev` | 1354 文件 |
| DevTools | `cleanCompileCache` 后重新注入新会话 | 通知中心与冷启动复验通过 |

## 应用后复验

### 通知中心
- 打开 `subpackages/profile-extra/notifications/index` 正常；
- 点击首条通知后页面栈：
  `["subpackages/profile-extra/notifications/index", "subpackages/circles/circles/topic-detail?topicId=54"]`
- 截图：`tmp/verify-20261029/apply/notifications.png`

### 冷启动深链
- 新建独立临时会话 A/B，B 发一条消息；
- 清编译缓存 + 清会话 + 只注入 token；**不暖启动**，直接打开
  `chat-session?sessionId=qa-wave3-temp-...`；
- 运行时状态：
  ```json
  {
    "route": "subpackages/chat/chat-session/index",
    "activeId": "qa-wave3-temp-1793240964763",
    "partnerName": "匿名·月见",
    "recommendedPersonId": "anon-qa-wave3-temp-1793240964763",
    "messageCount": 1,
    "contactStatus": "idle"
  }
  ```
- 截图：`tmp/verify-20261029/apply/cold-deeplink.png`

## 当前运行态

- API：8080，PID 42648，real profile，健康 200。
- Admin：5177 在线；dist 已于 10:26 重建。
- 小程序：`apps/client/dist/build/mp-weixin-real`，10:27 构建。
- 数据：应用验证 fixture 已清理（QA 话题/通知/临时会话/成员均为 0）。
- 发布：`shippable=no`；HTTPS 域名、真实 AppID、`WECHAT_SECRET`、CORS 仍未提供，见 `reports/verify/2026-10-28/30-close/release-external-inputs.md`。
