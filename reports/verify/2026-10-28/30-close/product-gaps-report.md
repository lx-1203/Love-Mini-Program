# 产品缺口落地报告（2026-10-28）

> 范围：隐私正式文本、圈子标签/公告/点赞、消息已读、批量 skip、@提及、咨询内容、临时会话图片。
> 按用户口径**不做** VIP 封存、课表网格、北师大统计行。

## 0. 结论

7 项功能均已完成代码落地、Flyway 迁移、接口冒烟与构建/测试（详见各节）。其中：
- **需要用户/法务提供内容**：法律正式文本（当前种子沿用后端既有内嵌文本 v1.0.0，待法务复核）；咨询课程正文（当前用既有 description 回填，运营可后台编辑）。
- **需要产品/隐私裁定**：临时会话图片的媒体访问范围与保留期限（当前功能已通，沿用现有媒体签名链路；未做「仅会话双方可读」和过期物理删除）。

## 1. 隐私/协议正式文本

- **修掉的真实 bug**：后端 `/config/legal` 原返回扁平 `LegalTextView`，客户端 `legal-texts.ts` 按 `{ items: [...] }` 解析 ⇒ real 模式永远落本地兜底。现后端统一返回 `{items}`，客户端与 `fetchAgreedLegalVersion` 同步按 items 解析。
- **新增**：`legal_document` 表 + `LegalDocument`/Repository/Service；`published/draft` 状态、版本、生效时间；启动时用 `LegalTextProvider` 现有文本种成 v1.0.0（日志「待法务复核」）；`AgreementConsentService` 默认版本改为读 CMS published 版本。
- **后台**：`AdminLegalController`（列表/更新/发布/下线，写仅 SUPER_ADMIN）+ `views/config/LegalTexts.vue` + 菜单 701；支持编辑正文/标题/版本并发布。
- **验证**：`GET /config/legal?type=user_agreement` → `items[0].version=v1.0.0`、contentLen 933；后台列表 2 条；客户端 typecheck/后台 build 通过。
- **待你提供**：法务定稿全文、版本号、生效日期、运营主体/联系方式、SDK 清单、保留期限。微信公众平台的「用户隐私保护指引」仍需在平台侧配置。

## 2. 圈子标签/公告/点赞

- **新增**：`interest_circles.tags/announcement`、`circle_topics.like_count`、`circle_topic_likes` 表；`GET /circles/{id}/meta`；`POST/DELETE /circles/topics/{id}/like`；话题列表/详情下发 `likeCount/likedByMe`（按 viewer 批量查询）。
- **客户端**：`circle.ts` 增 meta/点赞 action；`circle-home` 标签/公告改读后端、真实 feed 恢复点赞位并做乐观更新+回滚；`topics.vue` 公告改读 meta。
- **后台**：`InterestCircles.vue` 新增圈标签/置顶公告编辑；`AdminCircleRequest/Summary` 同步字段。
- **验证**：圈 8（摄影）meta 200；话题列表带 likeCount；点赞 200、detail `likedByMe=true`、likeCount=1，取消后复原。
- **边界**：公告按当前 UI 建模为单列（一条置顶公告）；标签是逗号分隔字符串，暂不提供按标签筛选；话题点赞暂不发通知。

## 3. 消息已读/未读

- **新增**：`private_conversations.user_a/user_b_marked_unread`；`PUT /messages/conversations/{id}/unread`；read 时原子清标记；会话列表 `unreadCount=max(真实未读, 标记?1:0)`。
- **客户端**：`markSessionUnread` 改异步调后端、失败回滚；成功/失败 toast；`markAllSessionsRead` 只清成功项；**列表加载不再自动清空全部未读**（否则持久标记会被下一次 loadPage 抹掉），打开会话/显式已读才清零。
- **验证**：会话 703 标未读后列表 unread=2，标已读后 0；客户端单测新契约 5/5 通过。
- **边界**：未改 `private_messages.is_read` 的反向回执语义（避免篡改对方看到的回执）。

## 4. 批量 skip

- **新增**：`POST /matches/pass/batch`（逐条幂等落库）；`getLikedMe` 排除 `pass_records` 中已 pass 的用户。
- **客户端**：`likes.ts` 批量 skip 改为分批调批量接口，成功项移除、失败项保留可重试。
- **验证**：批量 pass 200（passed=1）；liked-me 200；不再出现「刷新又回来」（查询已排除 pass）。
- **边界**：pass 仍为永久排除，rewind 只能撤最近一条；批量误操作不可逆，UI 保持原有确认。

## 5. 发帖 @提及

- **新增**：`post_mentions` 表（`notified` 标记）；`CreatePostRequest.mentionedUserIds`；`PostMentionService`（去重、排除自己、上限 10、校验用户存在）；admin 审核通过后逐条发 `mention` 通知；通知类型 CHECK 增加 `mention`。
- **客户端**：`publish.vue` 关注列表选择器（最多 10 人），正文插入 `@昵称`，提交 `mentionedUserIds`；`SystemNotification` 类型映射加 mention；圈子目标下隐藏 @ 入口（`createTopic` 暂无 mentions，避免静默丢弃）。
- **验证**：发帖 432 → 审核 200 → 被提及人通知列表出现 1 条 `mention`（referenceId=432）。
- **边界**：评论 @、@全体、圈子话题 @ 未做；被提及人权限/可见性在写通知前未做二次校验（当前帖子审核通过后可见）。

## 6. 咨询内容

- **新增**：`consulting_course` 增 `content/lecturer/sort_order/price_visible/signup_enabled/published_at/updated_at`；公开列表/详情；`AdminConsultingController`（CRUD + 发布/下线）+ `views/business/Consulting.vue` + 菜单 404；客户端 `consulting.vue` 改为内容页（拉课程、展示正文/讲师），撤「筹备中」；入口不再受 `commerce.course` 交易开关限制。
- **验证**：公开课程 3 条且 `content` 有值、`priceVisible/signupEnabled=false`；后台列表 3 条；客户端 typecheck/后台 build 通过。
- **待你提供**：内容形态（课程/文章/1v1）、首批标题+正文+封面+讲师、是否收费/价格/支付、上线时间。当前 `content` 来自既有 description 回填，不是新编内容；价格/报名已隐藏，避免无支付却承诺交易。

## 7. 临时会话图片

- **新增**：临时会话 `kind` 白名单加 `image`；预览「[图片]」；客户端移除 temp 图片拦截，上传后走 `chatStore.sendText(url,"image")`；普通私信图片链路不变；`ChatBubble` 已支持图片。
- **验证**：后端编译/客户端 typecheck；OpenAPI `kind` 枚举已同步 `image` 并重新生成类型；临时会话文本/语音链路未改。
- **待裁定**：临时会话宣称匿名，但图片 URL 仍含上传者 userId、媒体对任意登录用户可读、过期只置状态不删媒体。**建议你决定**：是否要求「仅会话双方可读」、过期物理删除、是否允许保存/截图；在此之前该功能按现有签名 URL 链路可用，但不宣称匿名安全。

## 8. 迁移与验证

- Flyway 已应用：`V2026.10.28.0001`（法律文本）、`0002`（圈子 tags/公告/点赞）、`0003`（咨询字段）、`0004`（会话未读标记）、`0005`（post_mentions）、`0006`（mention 通知类型）、`0007`（法律菜单）、`0008`（咨询菜单）。
- 迁移修复记录：0002 首次因 `circle_topics.id` 为 `BIGINT UNSIGNED` 与 FK 类型不兼容失败；已回退部分列、删除失败历史行、把 FK 改为 UNSIGNED 后重新应用成功（不恢复整库）。
- 接口冒烟：`30-close/api-smoke-r2.log` 12/12 PASS（法律 items、后台列表、咨询、圈 meta/点赞、消息未读、批量 skip、@提及通知）。
- 测试：后端 **1414 tests / 0 failures / 0 errors / 7 skipped，BUILD SUCCESS**；后台 **39/39**、typecheck 0、build 通过；客户端 typecheck 0、改动区 103/103；客户端全量单测见 `client-unit-gaps-r3.log`。
- 小程序 real 发布链：**RELEASECHAIN_RESULT=PASS steps=15**，主包 1.63MB / 总包 2.72MB，CDN 294 条，`shippable=no`（loopback 豁免）。
- 回滚点：`database/backup/pre-product-gaps-20261028.sql`（功能迁移前）。
