# 剩余四项设计方案研究（2026-10-28）

> 对象：圈子公告单列、话题点赞通知、@提及扩展到圈子话题/评论、临时会话图片隐私口径。
> 本文只做设计与研究，不改代码；每项给数据模型、接口、客户端/后台、迁移、验收、风险与需裁定项。

## 1. 圈子公告：单列（一条置顶）→ 公告表

### 现状证据
- `interest_circles.announcement VARCHAR(500)` 单列；`CircleMetaView` 只返回一个字符串；`circle-home.vue`/`topics.vue` 只展示一张置顶卡；后台 `InterestCircles.vue` 在编辑圈子弹窗里直接改该列。
- 没有历史、草稿/发布态、发布人、生效时间、多条公告，也没有置顶互斥。

### 目标模型
```sql
CREATE TABLE circle_announcements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  circle_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(80) NULL,
  content VARCHAR(1000) NOT NULL,
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'draft', -- draft/published/offline
  author_id BIGINT UNSIGNED NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_circle_announcements_pin (circle_id, is_pinned, status), -- 仅对 published+pinned 做应用层互斥更稳
  KEY idx_circle_announcements_list (circle_id, status, is_pinned, published_at),
  CONSTRAINT fk_circle_announcements_circle FOREIGN KEY (circle_id)
    REFERENCES interest_circles(id) ON DELETE CASCADE
);
```
- **一条置顶**由服务层保证：发布/置顶时把同圈其他 `published+pinned` 置 `is_pinned=0`（与话题置顶同语义）。
- 保留 `interest_circles.announcement` 一个发布周期做兼容读；迁移时把非空值回填成 `title='公告'、is_pinned=1、status='published'`，后台不再写旧列，后续迁移再删列。

### 接口
- 客户端：
  - `GET /api/v1/circles/{id}/announcements?limit=5` → `{items:[{id,title,content,isPinned,publishedAt}], pinnedId}`（仅 published；置顶优先、时间倒序）。
  - `GET /circles/{id}/meta` 保留 tags；`announcement` 字段保留为第一条置顶文案（旧客户端兼容），新增 `announcements` 列表。
- 后台（`AdminCircleAnnouncementController`，挂 `/api/v1/admin/forum/circles/{circleId}/announcements`）：
  - `GET` 全部（含 draft/offline）；`POST` 新建；`PUT /{id}` 编辑；`POST /{id}/publish`、`/offline`、`/pin`（幂等，置顶互斥）；`DELETE /{id}`（软删=offline，硬删仅 SUPER_ADMIN + 审计）。
  - 读 ADMIN/SUPER_ADMIN/AUDITOR，写 SUPER_ADMIN/ADMIN；复用 `@Auditable`。

### 客户端/后台
- `stores/circle.ts` 增 `fetchCircleAnnouncements`；`circle-home` 显示置顶卡 + “查看全部”（超过 1 条时）；`topics.vue` 显示置顶一条。
- 后台在 `InterestCircles.vue` 行操作加「公告」抽屉：列表、编辑、发布/下线、置顶；不新增菜单。
- 公告正文按纯文本展示（与现有公告卡一致）；如需富文本另立需求。

### 迁移/回填/验收
- `V2026.10.28.0009__create_circle_announcements.sql` + 回填旧列。
- 验证：后台新建草稿→客户端不可见；发布→可见；置顶互斥；下线立即不可见；旧列回填行存在；同圈公告列表无 N+1。
- 工作量：后端 1–1.5 人日、后台 0.5–1、客户端 0.5–1。风险：双源期（旧列/新表）必须以新表为唯一写源；公告内容审核复用敏感词/后台审计。

## 2. 话题点赞通知

### 现状证据
- `circle_topic_likes(topic_id,user_id UNIQUE)`、`circle_topics.like_count`；`RealCircleService.likeTopic/unlikeTopic` 只改点赞关系与计数，**不发通知**。
- `Notification.ReferenceType` 仅 `post/comment/user`；`buildSummary('like')` 固定「赞了你的帖子」；客户端 `SystemNotification.type` 已有 `like`；DB `chk_notifications_reference_type` 未含 `topic`。

### 设计
- 通知类型新增 `topic_like`（与帖子 `like` 区分），或复用 `like` + `referenceType=topic` 并把摘要改为按 referenceType 分派。**推荐新类型 `topic_like`**：客户端映射/文案/路由都更明确。
- 通知引用：`referenceType=topic`、`referenceId=topicId`；摘要「{昵称}赞了你的话题」；信号分类 SOCIAL；接收者=topic.authorId；来源=点赞者。
- 幂等：`NotificationRepository` 增加 `existsByUserIdAndTypeAndReferenceIdAndSourceUserId` 查询；或新增 `topic_like_notices(topic_id,user_id UNIQUE)` 去重表。推荐后者（与点赞关系解耦，取消再点赞也不会重复打扰）。
- 触发点：`likeTopic` 首次插入点赞行后发；自己点赞自己跳过；话题状态需 `approved`（前台只可见 approved）；通知失败不回滚点赞（记录日志，可重试）。
- DB 迁移：扩展 `chk_notifications_type` 加 `topic_like`；扩展 `chk_notifications_reference_type` 加 `topic`；`Notification.NotificationType`/`ReferenceType` 同步；`buildSummary`/`determineSignalType` 加分支。
- 客户端：`SystemNotification.type` 加 `topic_like`；`mapNotificationType`；通知卡文案直接用后端 summary；点击按 `referenceType=topic` 跳 `subpackages/circles/circles/topic-detail?topicId=`；若通知页当前不做路由，至少展示可读摘要。
- 验收：A 赞 B 的话题→B 收到一条；A 取消再赞→不重复；A 赞自己→无通知；未审核话题不可见/不触发；客户端通知列表与点击。
- 工作量：1–1.5 人日。风险：通知类型/引用 CHECK 迁移；旧客户端对未知 type 的降级（当前映射默认 system，可接受）；话题被删除后的通知跳转 404（点击时兜底 Topic 不存在态）。

## 3. @提及扩展到圈子话题与评论

### 现状证据
- 帖子已有 `post_mentions`、`PostMentionService`、`CreatePostRequest.mentionedUserIds`、后台审核通过后通知、客户端 publish 选择器。
- 圈子话题 `CreateTopicRequest(title,content,images)` 无 mentions；话题新建为 pending，后台 `AdminCircleController.auditTopic` 审核通过后才前台可见；圈子回复 `CreateReplyRequest(content)` 无 mentions，回复创建即展示（无审核）。
- 通知类型 `mention` 已有；`referenceType` 仅 post/comment/user；摘要固定「在帖子中提到了你」。
- 客户端 `post-topic.vue`（发话题）与 `topic-detail.vue`（回复）没有提及入口；`getMyFollowing` 已存在。

### 数据模型（推荐统一表）
```sql
CREATE TABLE content_mentions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  target_type VARCHAR(16) NOT NULL, -- post/topic/reply
  target_id BIGINT UNSIGNED NOT NULL,
  mentioned_user_id BIGINT UNSIGNED NOT NULL,
  notified TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_content_mentions_target_user (target_type,target_id,mentioned_user_id),
  KEY idx_content_mentions_user (mentioned_user_id,created_at)
);
```
- 迁移：把 `post_mentions`（若还有存量）回填 `target_type='post'`；`PostMentionService` 切到统一表；旧表保留一个周期后删。
- 不用 FK 到 post/topic/reply（三张目标表），由应用层在目标删除时清理；加每周孤儿清理任务（按 target_type 批量校验）。
- `notified` 与现有 post_mentions 语义一致：话题在审核通过后通知；回复创建即通知。

### 后端接口/服务
- `CreateTopicRequest` 增 `@Size(max=10) List<Long> mentionedUserIds`；`CircleService.createTopic` 增加带 mentions 的重载（旧签名默认空列表，避免破坏 Mock/测试）。
- `CreateReplyRequest` 增 `mentionedUserIds`；`CircleService.replyToTopic` 同理。
- 新建 `ContentMentionService`：
  - `saveMentions(targetType,targetId,authorId,ids)`：去重、排除自己、上限 10、校验用户存在/关注/可见性（话题在圈子内；回复在话题所属圈）。
  - `notify(targetType,targetId,authorId,referenceType,referenceId)`：查 `notified=0`；逐条 `notificationService.createNotification(userId,'mention',authorId,referenceId,referenceType)`；成功置 1。
- 通知引用：
  - 话题：`referenceType=topic`、`referenceId=topicId`；摘要「在话题中提到了你」。
  - 回复：`referenceType=comment`（复用 comment）、`referenceId=topicId`（不是 replyId，保证客户端能打开话题详情；回复 ID 可作为后续 contextId 扩展）；摘要「在话题评论中提到了你」。
  - DB CHECK `reference_type` 加 `topic`；`comment` 已有。
- 触发：
  - 话题：创建时只落 mentions（notified=0）；`AdminCircleController.auditTopic` approved 后调用 `notify`（与帖子审核钩子同模式）。
  - 回复：创建后立即 `notify`（回复无审核；若未来加审核，改为审核钩子）。
- 校验：被提及人必须存在且非自己；上限 10；重复去重；圈子话题仅圈成员可见（已有 createTopic 成员校验）；被提及人是否有权查看话题：话题是圈内可见，通知接收者若不在圈内会打不开——设计上**只允许提及同圈成员**（服务端按 `CircleMembershipRepository` 校验），否则丢弃或拒绝（推荐拒绝并提示）。

### 客户端
- 抽共享 `MentionPicker`（从 `publish.vue` 的 sheet/关注列表逻辑抽出），三处复用：publish、post-topic、topic-detail 回复框。
- `post-topic.vue`：表单加 `mentionedUserIds`；提交带；`circleStore.createTopic` 类型/请求体加。
- `topic-detail.vue`：回复输入旁加 @ 按钮；插入 `@昵称`；`circleStore.replyToTopic` 增加 mentions 参数；提交后清空。
- 通知：`SystemNotification.type` 的 `mention` 已加；补充 `referenceType`/`resourceId` 路由：topic/comment → 话题详情；回复通知的 referenceId 用 topicId。
- 正文仍纯文本展示 `@昵称`；可点击 @ 跳主页作为后续增强（需要 `MentionText` 解析与用户 ID 映射）。

### 迁移/验收/工作量
- 迁移：`V2026.10.28.0009__create_content_mentions.sql`；`V2026.10.28.0010__extend_notification_reference_types.sql`（reference_type 加 topic；type 无需改，mention 已有；若话题点赞同批则同时加 topic_like）。
- 验收：话题提及→pending 不发→审核通过发；回复提及立即发；自己/非圈成员/超 10/重复；通知摘要与点击；客户端三处选择器；旧帖子提及不受影响。
- 工作量：后端 2–2.5 人日、客户端 1.5–2（共享组件 + 两页）、测试 0.5。风险：统一表回填/孤儿清理；话题审核时序；回复通知路由；圈成员校验。

## 4. 临时会话图片隐私口径

### 现状证据
- `TempChatMessage.kind` 已允许 `image`（本轮加的），`ChatBubble` 可渲染；客户端上传仍走 `uploadPostImage`（`MediaUploadCategory.POST`），URL 为 `/api/v1/media/{uploaderUserId}/{yyyyMM}/{uuid}`。
- `MediaAccessService` 对 IMAGE：**任意登录用户可读**；`ID_CARD` 才是认证档；`media_asset` 只有 user_id/category/url 等，没有会话绑定/过期时间/删除标记。
- `TempChatCleanupService` 每小时只把过期会话标 `expired`，**不删消息、不删媒体**；`TempChatSession` 只存 userA/userB/closesAt/phase。
- 当前临时会话展示真实昵称/头像（`getPartnerInfo`），与「双方身份匿名」文案冲突；图片 URL 还带上传者 userId。

### 三种口径（需你选）
| 方案 | 内容 | 优点 | 代价/风险 |
|---|---|---|---|
| A. 最小加固 | 新增 `TEMP_CHAT` 分类 + `media_asset.temp_session_id`/`expires_at`；媒体路由改 `GET /media/temp/{assetId}`（不含 userId）；访问校验会话双方；过期后签名 URL 失效；清理任务删消息+资产+文件；仍展示真实昵称 | 改动可控、解决外链与长期留存 | 仍非匿名（昵称/头像可见），只能改文案为「临时会话」 |
| B. 强匿名 | A + 临时会话展示改为伪名/默认头像、隐藏主页入口；媒体路径/URL 完全不含 userId；联系交换双方同意后才揭示身份 | 与「匿名」承诺一致 | 产品/UI 改动大；举报取证、运营审核更难；需保留受控后台取证通道 |
| C. 撤图片 | 回退 `kind=image`，只保留文本/语音 | 隐私面最小 | 用户明确要图片，不推荐 |

**推荐 B**（如果产品继续使用「匿名」文案）；若近期不做伪名/头像改造，则选 A 并**同时把文案改成「临时会话」**，不要继续宣称匿名。

### A/B 共同的技术设计
1. 上传：
   - `MediaUploadCategory` 加 `TEMP_CHAT`；`POST /media/upload` 接受 `category=TEMP_CHAT&tempSessionId=`（或独立 `POST /media/temp-upload`）。
   - `LocalMediaStorageService.store` 分流：`{storageRoot}/temp/{sessionUid}/{uuid}`（**不含 userId**）；`media_asset` 加 `temp_session_id`、`expires_at`、`deleted_at`。
2. 访问：
   - 新路由 `GET /api/v1/media/temp/{sessionUid}/{uuid}`（或 `assetId`）；`MediaAccessService` 校验当前用户是 `TempChatSession.userA/userB` 且 `phase` 未 expired/closed（或宽限期）；否则 403。
   - `POST /media/sign` 支持 temp 路径；签名 TTL 5 分钟、`Cache-Control: private, no-store`；不进入任何 CDN。
   - 非参与者/未登录/过期 → 403；不复用 IMAGE 的「登录即可读」规则。
3. 保留/删除：
   - 配置 `app.temp-chat.retention-hours`（建议 24h 会话 + 24h 宽限，最终 T+48h 删除）。
   - `TempChatCleanupService` 增加阶段 2：扫描 `expired/closed` 且 `closedAt + grace < now` 的会话，删除 `temp_chat_message`、`media_asset`（TEMP_CHAT）、磁盘文件；保留 `temp_chat_session` 行做 tombstone（sessionUid/双方/时间，不保留内容）。
   - 举报/取证：新增 `temp_chat_report_hold`（reportId/sessionUid/assetId/holdUntil），被举报资产进入 hold，仅 ADMIN/SUPER_ADMIN 通过后台取证查看；hold 到期再删。否则删除与取证冲突。
   - 备份/日志：媒体文件不进备份；日志不记录 URL/正文；`media_asset` 删除用硬删 + 审计。
4. 匿名（B 额外）：
   - `getPartnerInfo` 返回伪名（如「匿名·海盐」）+ 默认头像；隐藏主页/相册入口；资料卡只显示圈层/兴趣标签（若产品允许）。
   - 联系交换完成后才返回真实 userId/昵称；客户端在 `contactExchange.completed` 后刷新身份。
   - 图片 URL 不含 userId；客户端 `ChatBubble` 的预览/保存行为按产品（是否允许长按保存、截图提示）。
5. 客户端：`handleImagePlaceholder` 已可用；改为 `uploadTempChatImage`（category=TEMP_CHAT + sessionId）；预览；过期提示；若 B，隐藏对方资料入口。
6. 后台：媒体资产页支持 TEMP_CHAT 过滤与 hold/取证；admin 审计；不默认展示匿名会话内容。
7. 验收：A/B 双方可读；非参与者 403；过期 403；T+48h 消息/资产/文件不存在；hold 资产仅超管可取；URL 无 userId；签名 TTL；客户端预览。
8. 工作量：A 2–3 人日；B 再加 1–2 人日（伪名/入口/联系交换揭示）；后台取证 1 人日。风险：匿名与取证冲突、CDN/缓存、备份残留、历史数据（现有 POST 分类的临时图片无法追溯会话，需一次性清理或保留旧策略）。

### 需要你裁定
1. 选 **A**（临时会话 + 真实昵称，改文案）还是 **B**（匿名伪名）？还是 **C**（撤图片）？
2. 保留期：会话 24h + 宽限 24h（T+48h 删除）是否可接受？举报 hold 保留多久（如 30 天）？
3. 举报取证：是否允许 ADMIN 查看被举报的临时图片？仅 SUPER_ADMIN？
4. 是否允许长按保存/转发临时图片？若不允许，客户端需禁用并提示。

## 5. 建议实施顺序

1. **Wave 1（无外部内容/政策依赖）**：圈子公告表 + 话题点赞通知 + @提及扩展到话题/评论（共享 MentionPicker）。预计 5–7 人日。
2. **Wave 2（需裁定）**：临时图片隐私。先定 A/B/C 与保留期；技术改造 2–4 人日 + 后台取证 1 人日。
3. 每项沿用现有门：后端测试、客户端 typecheck/单测、后台 typecheck/build、API 冒烟、MP release-chain + DevTools 新增页巡检；迁移先备份、失败局部回退（如本轮 0002 FK 类型问题的处理方式）。

## 6. 待你确认的最小决策

- 临时图片：A / B / C；保留期与举报 hold。
- 圈子公告：由谁维护（建议 Admin，和现有兴趣圈编辑同权限）；一条置顶 + 最新 N 条是否够。
- 话题点赞通知：用新类型 `topic_like`（推荐）还是复用 `like` + referenceType。
- @提及扩展：是否直接按本文落地（无外部依赖，可立即排期）。
