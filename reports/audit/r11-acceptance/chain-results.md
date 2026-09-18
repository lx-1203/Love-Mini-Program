# R11 七大用户链路 API 级真实落库验证报告

- 日期：2026-09-17（执行机时间 2026-09-18，见脚本 RUNTAG 0918161332）
- 后端：http://127.0.0.1:8080（real profile）；DB：MySQL campus_love（root/127.0.0.1）
- 账号：A = 100158 曦风（13800006666 / Abc12345，deviceId r11-chain-a2）；对端 = 10003（会话）、100159（喜欢目标，推荐位第一名）
- 执行脚本：`tmp/r11_chains2.py`（固定主机 `http.client.HTTPConnection("127.0.0.1", 8080)`，pymysql 直连 DB 做断言与清理；运行日志 `tmp/r11_chains2.log`）
- 结果：**14/14 步骤全部 PASS，7/7 链路 PASS，0 BLOCKED，DB 残留 0**

## 端点来源（全部从客户端源码确认，非猜测）

| 链路 | 端点 | 客户端源码出处 |
|---|---|---|
| A | POST /api/v1/auth/phone-login、GET /api/v1/auth/me | apps/client/src/services/api.ts L273（`url: "/auth/me"`）；登录由 session store 走 api.ts |
| B | GET /api/v1/recommendations、POST /api/v1/matches/like、POST /api/v1/matches/cancel-like | api.ts L885/L925（`/recommendations`、`/matches/like`，body `{targetUserId}`）；stores/likes.ts L637（`/matches/cancel-like`） |
| C | POST /api/v1/posts/{id}/comments | stores/village/api.ts L374 |
| D | GET /api/v1/campus/topics/{id} | stores/campus.ts L527（`/campus/topics/${topicId}`） |
| E | POST /api/v1/posts、GET /api/v1/posts?authorId={uid} | stores/village/api.ts L228；stores/profile.ts L483（「我的帖子」按 authorId 查询） |
| F | POST /api/v1/messages/conversations/{id}/messages | stores/messages.ts L907，body `{content, kind:"text"}` |
| G | GET/PUT /api/v1/profile/basic | api.ts L304/L325（saveBasicProfile → PUT /profile/basic） |

实现备注：`POST /matches/like` 后端要求 `Idempotency-Key` 请求头（缺失返回 422 "缺少 Idempotency-Key 请求头"；浏览器端由 http 拦截器自动附加）。脚本对变更类请求附加随机唯一键，与客户端行为一致。

---

## 链A 会话（登录 + 会话校验）

| 步骤 | 端点 | HTTP | DB/响应断言 | 清理确认 |
|---|---|---|---|---|
| 登录 | POST /auth/phone-login `{"phone":"13800006666","password":"Abc12345","deviceId":"r11-chain-a2"}` | 200 | 返回 token，userId=100158（users 表 phone 加密存储，昵称=曦风） | 无写入（登录仅产生 token，无需清理） |
| 会话校验 | GET /auth/me（Bearer） | 200 | `loggedIn=true`，`userId="100158"`（UserSessionView） | 无写入 |

结论：**PASS**

## 链B 喜欢（推荐 → like → 落库 → 撤销）

| 步骤 | 端点 | HTTP | DB 断言 | 清理确认 |
|---|---|---|---|---|
| 取推荐列表 | GET /recommendations | 200 | 返回推荐数组，首位 id=100159（避开已喜欢的 10003/100155，且 100159 未反向喜欢 A，不触发 heart_signal） | - |
| 喜欢 | POST /matches/like `{"targetUserId":100159}` | 200 | `likes` 表新增：id=2279，user_id=100158，target_user_id=100159，status=active（操作前该组合 0 行） | POST /matches/cancel-like → 200；cancel-like 为软删，另 SQL 硬删残留 1 行；`interaction_events` 清理 3 条 NEW_LIKE 事件 |
| 撤销断言 | - | - | `SELECT COUNT(*) FROM likes WHERE user_id=100158 AND target_user_id=100159` = **0**；相关 `heart_signals` = **0**；NEW_LIKE 事件 = **0** | 确认无残留 |

结论：**PASS**

## 链C 社区互动（现存帖评论 → 落库 → 清理）

| 步骤 | 端点 | HTTP | DB 断言 | 清理确认 |
|---|---|---|---|---|
| 选现存帖 | SQL：`SELECT id FROM posts WHERE status='active' AND author_id<>100158 ORDER BY id DESC LIMIT 1` | - | 选中帖 221（作者 100151） | - |
| 发评论 | POST /posts/221/comments `{"content":"R11 链C验收评论 0918161332"}` | 200 | `comments` 表新增 id=1200，post_id=221，author_id=100158，content 含 R11 前缀 | SQL `DELETE FROM comments WHERE id=1200` → deleted=1，复查 0 行；连带清理 3 条 POST_COMMENTED 事件 |

说明：客户端无「删除评论」端点（village/api.ts 仅 GET/POST /posts/{id}/comments），故清理按约定走 SQL 删除行。

结论：**PASS**

## 链D 话题浏览（只读）

| 步骤 | 端点 | HTTP | 断言 | 清理确认 |
|---|---|---|---|---|
| 话题详情 | GET /campus/topics/153 | 200 | 返回标题「考研自习室占座攻略」（campus_topics.id=153） | 只读，无写入 |

结论：**PASS**

## 链E 发帖（发布 → 我的帖子可见 → 删除 → 无残留）

| 步骤 | 端点 | HTTP | DB 断言 | 清理确认 |
|---|---|---|---|---|
| 发帖 | POST /posts `{"title":"R11 链E验收帖 0918161332","content":"R11 链E验收正文 …","category":"interest","tags":[],"images":[]}` | 200 | `posts` 表新增 id=229，author_id=100158，status=active，title 与请求一致 | SQL `DELETE FROM posts WHERE id=229` → deleted=1（post_tags 0 行） |
| 我的帖子可见 | GET /posts?authorId=100158&page=1&pageSize=3（stores/profile.ts「我的帖子」数据源） | 200 | 返回 items 含「R11 链E验收帖 0918161332」 | - |
| 删除确认 | SQL 复查 | - | `SELECT COUNT(*) FROM posts WHERE id=229` = **0**；全库 title/content 含 R11 帖子 = **0** | 确认无残留 |

说明：客户端与后端 VillageController 均无 DELETE /posts/{id} 端点（唯一 DeleteMapping 为 /posts/history），清理走 SQL 删除行。

结论：**PASS**

## 链F 聊天（与 10003 的会话发私信 → 落库 → 清理）

| 步骤 | 端点 | HTTP | DB 断言 | 清理确认 |
|---|---|---|---|---|
| 定位会话 | SQL：`private_conversations` 中 (100158,10003) 对话 | - | 预存在会话 id=465（uid=conv-10003-100158-4732baf9），清理前快照 preview="Round-8 audit: chat send verification"、last_message_at=2026-09-16 01:49:53、version=2 | - |
| 发私信 | POST /messages/conversations/465/messages `{"content":"R11 链F验收私信 0918161332","kind":"text"}` | 200 | `private_messages` 新增 id=3900，conversation_id=465，sender_id=100158，message_kind=text，content 含 R11 前缀 | SQL 删除该消息行（deleted=1，复查 0）；会话 `last_message_preview/last_message_at/version` 按快照恢复，复查已还原 |
| 还原确认 | SQL 复查 | - | R11 私信 = **0**；会话 465 preview/at/version 与测试前一致 | 确认无残留 |

结论：**PASS**

## 链G 资料（bio 更新 → 落库 → 恢复原值）

| 步骤 | 端点 | HTTP | DB 断言 | 清理确认 |
|---|---|---|---|---|
| 读原值 | GET /profile/basic | 200 | 原始 nickname=曦风、bio=「爱摄影，也爱深夜食堂；周末常在天台拍晚霞」、grade=大三、pronouns=TA（user_basic_profile user_id=100158, id=223） | - |
| 更新 bio | PUT /profile/basic（nickname/grade/pronouns 回传原值，bio=原值+" 【R11】"） | 200 | `user_basic_profile.bio` =「爱摄影，也爱深夜食堂；周末常在天台拍晚霞 【R11】」 | 二次 PUT 恢复原 bio → 200；另按快照 SQL 还原 version/updated_at 元数据 |
| 恢复确认 | SQL 复查 | - | bio=原值且不含 R11，version=5、updated_at 与测试前快照一致 | 确认无残留 |

结论：**PASS**

---

## 总体统计

| 链路 | 结论 | 步骤 PASS/总 |
|---|---|---|
| A 会话 | PASS | 2/2 |
| B 喜欢 | PASS | 2/2 |
| C 社区互动 | PASS | 2/2 |
| D 话题浏览 | PASS | 1/1 |
| E 发帖 | PASS | 3/3 |
| F 聊天 | PASS | 2/2 |
| G 资料 | PASS | 2/2 |
| **合计** | **7 PASS / 0 BLOCKED / 0 FAIL** | **14/14** |

## 残留复查证据（mysql CLI 独立连接复查，全部为 0）

```sql
SELECT 'posts(R11)'            t, COUNT(*) n FROM posts             WHERE title LIKE 'R11%' OR content LIKE '%R11%'
UNION ALL SELECT 'comments(R11)'        , COUNT(*) FROM comments          WHERE content LIKE '%R11%'
UNION ALL SELECT 'likes A->100159'      , COUNT(*) FROM likes             WHERE user_id=100158 AND target_user_id=100159
UNION ALL SELECT 'heart_signals pair'   , COUNT(*) FROM heart_signals     WHERE (user_a_id=100158 AND user_b_id=100159) OR (user_a_id=100159 AND user_b_id=100158)
UNION ALL SELECT 'private_messages(R11)', COUNT(*) FROM private_messages  WHERE content LIKE '%R11%'
UNION ALL SELECT 'profile bio(R11)'     , COUNT(*) FROM user_basic_profile WHERE bio LIKE '%R11%'
UNION ALL SELECT 'interaction_events(A)', COUNT(*) FROM interaction_events WHERE trigger_user_id=100158 AND created_at >= '2026-09-18 00:00:00'
UNION ALL SELECT 'notifications(A)'     , COUNT(*) FROM notifications      WHERE source_user_id=100158 AND created_at >= '2026-09-18 00:00:00';
```

执行结果：

```
posts(R11)=0  comments(R11)=0  likes A->100159=0  heart_signals pair=0
private_messages(R11)=0  profile bio(R11)=0  interaction_events(A)=0  notifications(A)=0
```

还原复核（快照一致）：

```
user_basic_profile(user_id=100158): bio='爱摄影，也爱深夜食堂；周末常在天台拍晚霞', version=5, updated_at=2026-09-18 12:17:29（=测试前快照）
private_conversations(id=465): preview='Round-8 audit: chat send verification', last_message_at=2026-09-16 01:49:53（=测试前快照）
```

## 过程中发现（非阻断）

1. `POST /matches/like` 强制 `Idempotency-Key` 头，缺失返回 422（裸脚本首跑踩中，附加唯一键后 200）；与 messages.ts 中「幂等键」注释互相印证。
2. `POST /matches/cancel-like`（客户端 stores/likes.ts L637）为软删除：调用后 `likes` 行仍存在（status 置非 active），零残留验收需再硬删该行。
3. like/评论会向对端写 `interaction_events`（NEW_LIKE / POST_COMMENTED）副作用行，已纳入清理与残留扫描。
4. 客户端不存在「删除帖子」「删除评论」端点，对应清理以 SQL 删除行落实（链路本身的端点均存在且验证通过，无 BLOCKED 项）。
