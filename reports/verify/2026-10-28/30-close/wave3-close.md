# 五项边界收口报告（2026-10-28 晚）

> 对象：上一轮列出的五条边界。目标：能闭合的全部闭合，外部凭证不伪造。
> 关联：[wave2-implementation.md](wave2-implementation.md)、[release-external-inputs.md](release-external-inputs.md)。

## 结论

| 边界 | 状态 | 证据 |
|---|---|---|
| 通知中心页缺失 | **已闭合** | 新页 + 首页铃铛；取帧与点击跳转见下 |
| T+48h 物理删除未实跑 | **已真实触发**（未墙钟等 48h） | 后台维护端点；文件删除/墓碑/消息删除/hold 跳过 |
| @ 确认插入未自动验证 | **已自动验证处理链**（非内部按钮物理点击） | 页面 VM 调用 `confirmMentions`，正文出现 `@阿宸` |
| 深链冷启动竞态 | **已修复** | 清编译缓存后直接深链，匿名会话正常加载 |
| 发布 `shippable=no` | **外部阻断，未闭合** | HTTPS 域名/AppID/`WECHAT_SECRET`/CORS 未提供 |

## 1. 通知中心

- 页面：`apps/client/src/subpackages/profile-extra/notifications/index.vue`
- 路由：`ROUTES.PROFILE.NOTIFICATIONS`；`pages.json` 注册 `subpackages/profile-extra/notifications/index`
- 能力：全部/社交/内容筛选、全部已读、未读点、头像/摘要/时间/类型；点击先跳转再标已读。
- 跳转：`topic`/`comment` → 话题详情；`post` → 帖子详情；喜欢/访客 → 喜欢与访客；匹配 → 消息 tab。
- 首页铃铛：`@notifyTap="goNotifications"`。
- 验证：
  - 取帧 `tmp/verify-20261028/shots-wave2/notifications-center-2.png`
  - 点击首条后页面栈 `[...notifications/index, .../topic-detail?topicId=51]`
  - 取帧 `notifications-click-detail-3.png`

## 2. 真实清理

- 新增 `POST /api/v1/admin/maintenance/temp-chat-cleanup`（SUPER_ADMIN，`@Auditable CLEANUP_TEMP_CHAT`）。
- 与每小时 cron 共用 `TempChatCleanupService.doCleanupRetainedMaterials()`，返回 `assetsDeleted/messagesDeleted/lockAcquired`。
- 实测（`tmp/verify-20261028/verify-cleanup.mjs`）：
  - `assets=1 messages=1 lock=true`
  - 图片文件已从磁盘消失
  - `media_asset.deleted_at` 已写、消息数 0
  - 举报 hold 资产：清理后文件仍在、`deleted_at` 为空
- 未声称：没有按墙钟等待 48h；cron 触发频率未改。

## 3. @ 提及确认

- 组件内部按钮仍不可被 DevTools 选择器穿透；给发话题页/话题详情页暴露 QA hook：
  `defineExpose({ confirmMentions })`，与组件 `@confirm` 同一个处理器。
- 实测：`p.$vm.confirmMentions([100277])` → 正文出现 `@阿宸`、已选计数 1。
- 取帧 `tmp/verify-20261028/shots-wave2/mention-confirm-final.png`。
- 边界：这是**处理链自动化**，不是组件内部按钮的物理点击。

## 4. 深链冷启动

- `chat-session` 增加 `watch(isUnlocked)`：登录态异步恢复后补一次 `loadSessionData()`（只补一次）。
- 实测：清编译缓存 + 注入会话 + 直接打开 `chat-session?sessionId=qa-wave3-temp-...`，无需暖启动即显示匿名横幅与消息。
- 取帧 `tmp/verify-20261028/shots-wave2/chat-cold-final.png`。

## 5. 发布外部输入

- `node scripts/verify-env-release.mjs` 实测：`ENVCHECK_RESULT=FAIL errors=2`（http + loopback）。
- `WX_APPID`、`WECHAT_SECRET` 未配置；AppID 当前为测试号。
- 详细清单与提供后的收口命令：[release-external-inputs.md](release-external-inputs.md)。

## 验收读数（本轮）

- 客户端：`132 files / 1449 tests` 全绿；typecheck exit 0。
- 后端：`Tests=1433 / Failures=0 / Errors=0 / Skipped=7`。
- 根契约链 exit 0（E2E 路由 74）。
- MP 构建：`RELEASECHAIN_RESULT=PASS steps=15`，主包 1.64MB / 总包 2.75MB，`shippable=no`。
- 通知中心/话题详情/发话题页取帧 console 0；临时会话冷启动取帧。
