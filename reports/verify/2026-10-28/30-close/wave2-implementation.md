# Wave-2 四项落地报告（2026-10-28）

> 对象：圈子公告表化、话题点赞通知、@提及扩展到圈子话题/评论、临时会话图片 B 强匿名。
> 代码提交：`c1256c20`（四项主体）、`f2bf9de2`（提及词条作用域）、`bf47e36d`（临时会话默认头像）。
> 证据根：`reports/verify/2026-10-28/30-close/`、`tmp/verify-20261028/`。

## 0. 结论摘要

- **四项全部落地并通过真实栈验收**：Flyway `V2026.10.28.0009–0012` 已应用，API/小程序/后台均以真实 MySQL/Redis/API 运行。
- **临时图片按 B 强匿名执行**：会话绑定存储、URL 不含 userId、仅会话双方可读、签名 TTL 300s、伪名/默认头像/隐藏主页、联系交换完成后揭示身份、T+48h 保留期与举报 hold。
- **静态门**：后端 `Tests=1433 Failures=0 Errors=0 Skipped=7`；客户端 `132 files / 1449 tests`；后台 `39 tests`；根契约链 exit 0；client/admin typecheck exit 0。
- **构建**：`RELEASECHAIN_RESULT=PASS steps=15`，主包 `1.64MB` / 总包 `2.75MB`，CDN 294 条，`shippable=no`（loopback 豁免未变）。
- **运行时**：通知中心、公告、@入口、话题详情、临时会话冷启动均已取帧；临时会话页验证匿名横幅与消息；API 冒烟 21 项全 PASS。

## 1. 圈子公告表化

### 数据
- 新表 `circle_announcements`：`circle_id/title/content/is_pinned/status(draft|published|offline)/author_id/published_at/version`，FK 级联。
- `interest_circles.announcement` 保留一个周期做兼容读；迁移把旧列非空值回填为「公告 / 置顶 / 已发布」。
- 本机旧列无数据：`legacyBackfilled=0`（不是回填失败）。

### 接口与行为
- 客户端：`GET /api/v1/circles/{id}/announcements?limit=`（仅 published，置顶优先）；`GET /circles/{id}/meta` 增加 `announcements` 列表，`announcement` 字段保留为置顶文案（旧客户端兼容）。
- 后台：`/api/v1/admin/forum/circles/{circleId}/announcements`（列表/新建/编辑/发布/下线/置顶/取消置顶/删除=下线），写权限 ADMIN/SUPER_ADMIN，读含 AUDITOR。
- 同圈 `published` 至多一条置顶：发布/置顶时服务端把其他置顶项降级，冒烟断言 `pinnedCount=1`。
- 后台 `InterestCircles.vue` 增加「公告」抽屉；圈编辑表单移除旧列写入，旧列只读兼容。

### 客户端
- `circle-home` 置顶卡读新表（meta 兼容），超过 1 条时显示「全部公告」并打开列表弹层；`topics` 读置顶公告。
- 取帧：`tmp/verify-20261028/shots-wave2/subpackages_circles_circles_circle-home.png`、多公告弹层见 `announcement-sheet.png`。

## 2. 话题点赞通知

- 通知类型新增 `topic_like`，引用类型新增 `topic`；DB CHECK 同步扩展。
- 去重表 `circle_topic_like_notices(topic_id,user_id UNIQUE)` 与点赞关系解耦：取消再赞不重复打扰。
- 触发：`RealCircleService.likeTopic` 首次点赞且非本人时，写去重行 + `createNotification(author,'topic_like',liker,topicId,'topic')`；失败只记日志不回滚点赞。
- 摘要：`{昵称}赞了你的话题`；信号分类 CONTENT；客户端 `SystemNotification` 增加 `topic_like` 与 `referenceType` 映射。
- 冒烟：A 赞 B 话题 → B 收到 1 条；A 取消再赞 → 仍 1 条（`topic-like-dedupe`）。

## 3. @提及扩展到圈子话题/评论

- 统一表 `content_mentions(target_type, target_id, mentioned_user_id, notified)`；`post_mentions` 回填后保留一个周期，`PostMentionService` 已切到统一表。
- `CreateTopicRequest/CreateReplyRequest` 增加 `mentionedUserIds`（≤10）；`CircleService` 增加带 mentions 的重载，Controller 透传。
- `ContentMentionService`：去重、排除自己、上限 10、校验用户存在；圈子话题/回复只允许同圈成员（`只能 @ 同圈成员`）。
- 通知时序：
  - 话题：创建只落 `notified=0`；后台审核 `approved` 后逐条发 `mention`，`referenceType=topic`，摘要「在话题中提到了你」。
  - 回复：创建即发，`referenceType=comment`、`referenceId=topicId`，摘要「在话题评论中提到了你」。
- 客户端：
  - 新增共享 `components/circle/MentionPickerSheet.vue`（候选、最多 10、确认插入 `@昵称`）。
  - `post-topic` 增加「@ 提及圈成员」入口（仅 real + 数字圈 ID），提交带 `mentionedUserIds`。
  - `topic-detail` 回复栏增加 @ 按钮，提交带 mentions，成功后清空。
- 通知中心（2026-10-28 补）：新增 `subpackages/profile-extra/notifications/index`，读 `GET /notifications/list`，支持全部/社交/内容筛选、全部已读、未读点；点击先跳转再标已读，按 `referenceType` 跳话题详情/帖子详情/喜欢与访客，匹配回消息 tab。首页铃铛改为进入通知中心。
- 冒烟：话题 pending 不发 → 审核通过发；回复立即发；摘要/引用类型均判到；非圈成员请求候选返回空（实测 `count=0`）。

## 4. 临时会话图片 B 强匿名

### 存储与访问
- 上传：`POST /api/v1/media/temp/upload?sessionUid=`（仅会话参与者、会话未结束）。
- 落盘：`{storageRoot}/temp/{sessionUid}/{yyyyMM}/{uuid}.ext`，URL `/api/v1/media/temp/{sessionUid}/...`，**不含 userId**。
- 访问：`GET /api/v1/media/temp/{sessionUid}/**`；会话双方可读，第三人 403；`Cache-Control: private, no-store`。
- 签名：`POST /media/sign` 支持 temp 路径，签发前校验参与者；TTL 300s；签名直读由过滤链以能力凭据放行。
- 资产：`media_asset` 增 `temp_session_id/expires_at/deleted_at/hold_until`，分类 `TEMP_CHAT`（不进入普通内容审核队列）。

### 保留与举报
- 保留期：`closesAt + app.temp-chat.grace-hours(默认 24h)`；会话本身 24h ⇒ 最终 T+48h。
- 每小时 :30 清理：删除到期 TEMP_CHAT 文件、登记墓碑、删除过期会话消息；`hold_until` 未到期跳过。
- 举报 hold：`POST /api/v1/admin/media-assets/{id}/hold`（ADMIN/SUPER_ADMIN，1–90 天），写 `temp_chat_media_holds`；
  取证读取 `GET /api/v1/admin/media-assets/{id}/content`（仅 hold 且未删除，no-store）。
- 会话行保留为墓碑（sessionUid/双方/时间），不保留内容。

### 匿名
- `TempChatViewMapper`：联系交换未完成时返回伪名 `匿名·{海盐/松果/...}`、空简介/可用时间、`recommendedPersonId=anon-{sessionUid}`；
  `completed` 后返回真实昵称/ID。
- 客户端：临时会话未揭示身份时使用默认头像；隐藏「查看主页」菜单项、头像菜单主页入口、气泡头像跳转与主页分享。
- 冒烟：A/B 为双方，C 403；签名 URL 无 Authorization 可读；联系交换完成后姓名/ID 揭示。

## 5. 验收读数

| 门 | 读数 |
|---|---|
| 后端单测 | `Tests=1433 Failures=0 Errors=0 Skipped=7` |
| 客户端单测 | `Test Files 130 passed (130) / Tests 1439 passed` |
| 客户端 typecheck | exit 0 |
| 后台单测 | `39 passed` |
| 后台 typecheck / build | exit 0 / built in 48.67s |
| 根契约链 | exit 0（含 admin-write-gate、E2E 路由、fallback 棘轮、tracked refs、gate wiring） |
| token refs / mp-image | 断引用 0 / mp-image 0 |
| fallback 棘轮 | 基线 0 当前 0 新增 0 |
| 项目规则 | 448 files, 0 errors, 151 warns → PASS |
| MP 构建 | `RELEASECHAIN_RESULT=PASS steps=15`；主包 1.64MB；总包 2.74MB；CDN 294；`shippable=no` |
| API 冒烟 | 21 项全 PASS（公告 8、提及/点赞 9、临时图片 4） |
| DevTools 巡检 | circle-home / post-topic / topic-detail：console 0，帧 55KB/16KB/22KB |
| 通知中心 | 取帧 `notifications-center-2.png`；点击首条后页面栈落到 `topic-detail?topicId=51`（`notifications-click-detail-3.png`） |
| 真实清理 | `POST /admin/maintenance/temp-chat-cleanup`：`assets=1 messages=1 lock=true`；文件已删、资产 `deleted_at` 已写；hold 资产文件保留（`CLEANUP_VERIFY_DONE`） |
| 深链冷启动 | 清编译缓存后直接打开 `chat-session?sessionId=qa-wave3-temp-...`，无需暖启动即渲染匿名会话（`chat-cold-final.png`） |
| 提及确认 | 通过页面 VM 调用组件 confirm 同一处理器，正文插入 `@阿宸`、计数 1（`mention-confirm-final.png`） |
| 临时会话帧 | `chat-temp-final.png`（匿名横幅 + 消息 + 交换/结束按钮） |

证据日志：
- `tmp/verify-20261028/release-wave2c.log`
- `tmp/verify-20261028/backend-tests-final.log`、`backend-totals.txt`
- `tmp/verify-20261028/client-tests-wave2.log`
- `tmp/verify-20261028/admin-build-wave2.log`
- `tmp/verify-20261028/contracts-wave2c.log`
- `reports/verify/2026-10-28/30-close/ui-wave2/results_wave2final.tsv`
- 截图：`tmp/verify-20261028/shots-wave2/`

## 6. 边界与未声称

- **保留期未等待真实 48 小时**：已用受控后台端点对过期会话真实触发一次清理（文件删除、墓碑、消息删除、hold 跳过均实测），但仍未按墙钟等待 48h；定时 cron 与手动端点同一条实现。
- **@提及确认不是「点内部按钮」**：组件内部按钮仍受 DevTools 选择器边界限制；本轮通过页面 VM 调用组件 confirm 的同一处理器，自动验证「确认→插入 @昵称→计数」链路。物理点击仍记仪器边界。
- **通知中心深链冷启动**：通知页依赖登录态；清缓存后直接深链可能先落 discover，暖启动后正常。通知中心不是登录守卫的改造对象。
- **发布外部输入未提供**：真实 HTTPS 域名、真实 AppID、`WECHAT_SECRET`、CORS 域名仍未提供；`verify-env-release` 实测 FAIL 2 条，产物 `shippable=no`。清单见 [release-external-inputs.md](release-external-inputs.md)，不伪造凭证、不声称可提审。
- **旧公告列**：`interest_circles.announcement` 保留一个发布周期，仅兼容读；后台不再写入。
- **既有红账未变**：截图不入库、corpus、real-coverage 10 条等按既有裁定保留。

## 7. 数据清理与最终状态

- 迁移前备份：`database/backup/pre-wave2-20261028.sql`（3,547,123B，sha256 `2307b0ad...`）。
- QC 数据已清理：QA 话题 0、QA 公告 0、QA 临时会话 0、TEMP_CHAT 资产 0、topic/reply mentions 0、话题点赞去重 0、圈 8 QA 成员 0。
- `src/static` 已 `prepare-static --dev` 还原 1354 文件；最终 MP 包保留在 `apps/client/dist/build/mp-weixin-real`（`shippable=no`）。

## 8. 变更索引

- 迁移：`database/flyway/sql/V2026.10.28.0009–0012`。
- 后端：`CircleAnnouncement*`、`ContentMention*`、`CircleTopicLikeNotice*`、`ContentMentionService`、`TempChatMediaService`、`TempChatCleanupService`、`Media*`（temp 路由/签名/存储）、`RealCircleService`、`AdminCircleAnnouncementController`、`AdminMediaAssetController`、`AdminMaintenanceController`、`JwtAuthenticationFilter`、`Notification`/`RealNotificationService`。
- 客户端：`MentionPickerSheet.vue`、`circle-home/topics/post-topic/topic-detail`、`notifications/index.vue`、`utils/notification-target.ts`、`stores/circle.ts`、`stores/messages.ts`、`chat-session/index.vue`、`services/api.ts`、i18n。
- 后台：`InterestCircles.vue`、`api/forum.ts`、`Consulting.vue`/`LegalTexts.vue` 写入口按 `sessionStore.canWrite` 收敛。
- 测试：`ContentMentionServiceTest`（4）、`TempChatMediaServiceTest`（5）、`TempChatCleanupMaterialsTest`（2）。
- 工具/契约：`tests/e2e/routes.generated.ts` 按生成器刷新（`help` 页 selfRedirect 漂移）。
