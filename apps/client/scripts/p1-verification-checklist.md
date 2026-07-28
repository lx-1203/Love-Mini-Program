# P1 阶段验证清单（Task 1.7）

> 本清单对应 `tasks.md` 中 Task 1.7 的三个子任务：
> - 1.7.1 聊天端到端测试（发送/接收/语音/会话切换）
> - 1.7.2 真机下拉刷新/列表滑动验证
> - 1.7.3 Admin 后台 Feedback/Users 实际数据验证
>
> 用例 1.7.1 已在 `apps/client/src/tests/services/chat.spec.ts` 通过 Vitest 单元测试覆盖（共 18 个用例）。
> 用例 1.7.2 / 1.7.3 为真机/后台现场验证，由 QA/运营人员按本清单逐项执行并填写结果。

---

## 一、Task 1.7.1 聊天端到端单元测试（自动化，已完成）

### 测试文件
- 路径：`apps/client/src/tests/services/chat.spec.ts`
- 框架：Vitest + Pinia + vi.mock（mock 模式）
- 用例总数：**18 个**（≥10 要求 ✓）

### 用例清单

#### describe("chat store - messaging actions (Task 1.1)") — 8 个
| # | 用例名 | 覆盖场景 |
|---|--------|----------|
| 1 | sendText in mock mode appends message and marks delivery status as sent | 发送文本消息，追加到会话并标记 sent |
| 2 | sendText persists delivery status to local storage | 投递状态持久化到本地存储 |
| 3 | sendText returns early when no active session | 无活跃会话时早退保护 |
| 4 | sendVoice with empty tempFilePath uses placeholder body | H5 端语音占位 body |
| 5 | sendVoice with tempFilePath uploads file and uses returned URL as body | mp-weixin 端真实上传录音 |
| 6 | _setMessageStatus updates state and persists to storage | 投递状态更新与持久化 |
| 7 | SendMessageRequest enforces correct structure for text messages | 文本消息 payload 类型契约 |
| 8 | SendMessageRequest enforces correct structure for voice messages | 语音消息 payload 类型契约 |

#### describe("chat store - single data source sync (Task 1.1.1)") — 1 个
| # | 用例名 | 覆盖场景 |
|---|--------|----------|
| 9 | messagesStore.setCurrentMessages syncs chatStore messages for rendering | 单一数据源同步，避免双写 |

#### describe("chat store - end-to-end scenarios (Task 1.7.1)") — 9 个
| # | 用例名 | 覆盖场景 |
|---|--------|----------|
| 10 | session switching: loadSession swaps activeSession from session1 to session2 | **会话切换**：mockSession1 → mockSession2 |
| 11 | session switching: messagesStore.currentMessages reflects the latest active session | **会话切换**：currentMessages 同步刷新，无残留 |
| 12 | receiving peer text message: onNewMessage appends to currentMessages | **接收**：对方文本消息入列 |
| 13 | receiving peer voice message: onNewMessage appends voice message with duration | **接收语音**：voice 类型消息入列 |
| 14 | message deduplication: onNewMessage with duplicate id does not create duplicate entry | WebSocket 重连去重 |
| 15 | multi-session isolation: switching away and back preserves original session messages | **会话切换**：切回原会话消息完整 |
| 16 | receiving system message: onNewMessage appends system kind message correctly | 接收系统消息 |
| 17 | session end: clearCurrentMessages empties the current message list | 会话结束清理 |
| 18 | full round-trip: sendText then receive peer reply via onNewMessage | **发送+接收完整往返** |

### 运行方式
```bash
cd apps/client
pnpm vitest run src/tests/services/chat.spec.ts
```

### 验收标准
- [x] 用例数 ≥ 10（实际 18）
- [x] 覆盖"发送"场景（用例 1、2、5、18）
- [x] 覆盖"接收"场景（用例 12、13、16）
- [x] 覆盖"语音"场景（用例 4、5、13）
- [x] 覆盖"会话切换"场景（用例 10、11、15）
- [x] 全部用例通过

---

## 二、Task 1.7.2 真机下拉刷新/列表滑动验证清单

> 由 QA 在微信开发者工具 + 真机（iOS/Android 各一台）执行。

### 2.1 下拉刷新（refresherTriggered = ref(false)）

| # | 页面 | 路径 | 验证步骤 | 期望结果 | 真机结果（待填） |
|---|------|------|----------|----------|------------------|
| 1 | 首页推荐 | `pages/home/index` | 1. 进入首页<br>2. 顶部向下拉动 50px<br>3. 释放 | 触发刷新动画，loading 状态显示，2s 内数据更新；释放后 refresherTriggered 自动复位为 false | ☐ 通过 ☐ 失败 |
| 2 | 寻觅页 | `pages/discover/index` | 1. 进入寻觅页<br>2. 下拉刷新 | 卡片重新加载，无重复卡片，无闪烁 | ☐ 通过 ☐ 失败 |
| 3 | 消息中心 | `pages/messages/index` | 1. 进入消息中心<br>2. 下拉刷新 | 会话列表重新拉取，置顶会话仍置顶，未读数准确 | ☐ 通过 ☐ 失败 |
| 4 | 聊天会话 | `pages/chat-session/index` | 1. 进入聊天会话<br>2. 下拉刷新 | 历史消息重新加载，无重复消息（去重逻辑生效） | ☐ 通过 ☐ 失败 |
| 5 | 村口帖子 | `pages/village/index` | 1. 进入村口<br>2. 下拉刷新 | 帖子列表刷新，无重复项 | ☐ 通过 ☐ 失败 |
| 6 | 校园广场 | `pages/campus/index` | 1. 进入校园广场<br>2. 下拉刷新 | 话题列表刷新 | ☐ 通过 ☐ 失败 |
| 7 | 喜欢列表 | `pages/likes/index` | 1. 进入喜欢列表<br>2. 下拉刷新 | 喜欢的人列表刷新 | ☐ 通过 ☐ 失败 |
| 8 | 个人主页 | `pages/profile/index` | 1. 进入个人主页<br>2. 下拉刷新 | 资料重新加载，VIP 状态正确显示 | ☐ 通过 ☐ 失败 |

### 2.2 列表滑动（scroll-view enhanced + 防抖）

| # | 页面 | 验证步骤 | 期望结果 | 真机结果 |
|---|------|----------|----------|----------|
| 1 | 村口帖子分页 | 1. 进入村口<br>2. 滑动到底部 | 触发 `loadMoreData()`，300ms 防抖生效，无重复请求；新帖子追加到列表底部 | ☐ 通过 ☐ 失败 |
| 2 | 消息中心会话列表 | 1. 滑动会话列表<br>2. 快速上下滑动 | 滑动流畅，无卡顿；AbortController 取消重叠请求生效 | ☐ 通过 ☐ 失败 |
| 3 | 聊天会话消息列表 | 1. 进入聊天会话<br>2. 上下滑动查看历史消息 | 滑动流畅，消息气泡不重叠，语音消息可正常播放 | ☐ 通过 ☐ 失败 |
| 4 | 寻觅卡片滑动 | 1. 进入寻觅页<br>2. 左右滑动卡片 | 触摸事件统一为 `@touchstart/@touchmove/@touchend`，滑动方向准确，无丢失 | ☐ 通过 ☐ 失败 |
| 5 | 校园话题列表 | 1. 进入校园广场<br>2. 滑动到底部触发分页 | 分页加载正确，`currentPage` 状态维护正确 | ☐ 通过 ☐ 失败 |
| 6 | 活动列表 | 1. 进入活动页<br>2. 滑动并点击报名按钮 | 报名按钮 loading 状态防重复点击生效 | ☐ 通过 ☐ 失败 |
| 7 | 个人主页访客 | 1. 进入个人主页<br>2. 滑动到访客列表 | 访客列表展示正确，未读标记准确 | ☐ 通过 ☐ 失败 |
| 8 | VIP 账单列表 | 1. 进入 VIP 账单页<br>2. 滑动列表 | 账单按时间倒序，滑动流畅 | ☐ 通过 ☐ 失败 |

### 2.3 触摸事件兼容性（CardSwiper / CardDetailOverlay）

| # | 组件 | 验证步骤 | 期望结果 | 真机结果 |
|---|------|----------|----------|----------|
| 1 | CardSwiper | 1. 寻觅页左滑卡片<br>2. 右滑卡片<br>3. 上滑查看详情 | 滑动响应准确，无穿透事件，无丢帧 | ☐ 通过 ☐ 失败 |
| 2 | CardDetailOverlay | 1. 点击卡片展开详情<br>2. 上下滑动详情<br>3. 点击空白关闭 | 滑动不触发关闭，点击空白才关闭 | ☐ 通过 ☐ 失败 |
| 3 | `@tap.stop` → `catchtap` | 1. 聊天页 4 处 `@tap.stop="noop"`<br>2. 点击事件不冒泡 | 事件不触发父级点击，条件编译在 mp-weixin 下生效 | ☐ 通过 ☐ 失败 |

### 2.4 定时器泄漏清理

| # | 页面/组件 | 验证步骤 | 期望结果 | 真机结果 |
|---|-----------|----------|----------|----------|
| 1 | CardSwiper | 1. 进入寻觅页<br>2. 退出寻觅页<br>3. 重复 10 次 | `onUnmounted` 清理定时器，无内存泄漏，性能面板无残留 timer | ☐ 通过 ☐ 失败 |
| 2 | 登录页验证码倒计时 | 1. 发送验证码<br>2. 切到后台 30s<br>3. 切回前台 | `onHide` 暂停倒计时，`onShow` 恢复，时间准确 | ☐ 通过 ☐ 失败 |
| 3 | 活动报名 | 1. 进入活动页<br>2. 退出<br>3. 重复多次 | 定时器清理，无残留 | ☐ 通过 ☐ 失败 |

### 2.5 WXSS 兼容性

| # | 兼容项 | 验证页面 | 期望结果 | 真机结果 |
|---|--------|----------|----------|----------|
| 1 | `aspect-ratio` → `padding-top` 百分比 | 卡片图片 | 图片宽高比正确，无拉伸 | ☐ 通过 ☐ 失败 |
| 2 | `display:grid` → Flexbox（9 个文件） | 多页面布局 | 布局对齐正确，无错位 | ☐ 通过 ☐ 失败 |
| 3 | `backdrop-filter` 条件编译 | 模态框/卡片 | H5 端毛玻璃生效，mp-weixin 端 rgba fallback 正常 | ☐ 通过 ☐ 失败 |
| 4 | `100vh` → `100% + flex:1`（24 个文件） | 全屏页面 | 页面铺满屏幕，无滚动条溢出 | ☐ 通过 ☐ 失败 |
| 5 | `filter:blur()` 条件编译 | 卡片背景 | mp-weixin 端降级为 opacity，无白屏 | ☐ 通过 ☐ 失败 |

---

## 三、Task 1.7.3 Admin 后台 Feedback/Users 实际数据验证步骤

> 由 QA/运营在 Admin 后台（`apps/admin`）执行，需启动后端 API 服务与 Admin 前端。

### 前置准备
1. 启动 MySQL（含 flyway 迁移已执行到 V0002）
2. 启动 Redis
3. 启动后端 API：`cd apps/api && mvnw.cmd spring-boot:run`
4. 启动 Admin 前端：`cd apps/admin && pnpm dev`
5. 浏览器访问 Admin 前端地址（默认 `http://localhost:5173`）
6. 使用管理员账号登录（账号：`admin`，密码：环境变量 `ADMIN_INITIAL_PASSWORD` 或默认强随机哈希对应的明文）

### 3.1 Feedback 反馈管理真实数据验证

#### 步骤 1：准备测试数据
```bash
# 通过客户端或直接 SQL 插入至少 3 条反馈记录
# 表名：feedback_tickets（V2026.05.28.0001 创建）
# 字段：user_id, category, content, contact, status, created_at
INSERT INTO feedback_tickets (user_id, category, content, contact, status, created_at)
VALUES
  (1001, 'bug', '聊天页面消息重复显示', 'user1001@example.com', 'pending', NOW()),
  (1002, 'suggestion', '希望增加夜间模式', 'user1002@example.com', 'pending', NOW()),
  (1003, 'complaint', '匹配算法不准确', 'user1003@example.com', 'handled', NOW());
```

#### 步骤 2：验证 Feedback 列表页加载真实数据
| # | 验证项 | 操作步骤 | 期望结果 | 实际结果 |
|---|--------|----------|----------|----------|
| 1 | 列表加载 | 1. 登录 Admin<br>2. 左侧菜单点击"反馈管理"<br>3. 观察 Feedback.vue | 调用 `GET /api/admin/feedback`，展示真实反馈列表（至少 3 条），**无 `mockFeedback` 残留** | ☐ 通过 ☐ 失败 |
| 2 | 分页 | 1. 插入 25 条反馈<br>2. 设置每页 10 条<br>3. 翻到第 2、3 页 | 分页正确，数据不重复 | ☐ 通过 ☐ 失败 |
| 3 | 筛选 | 1. 按状态筛选 `pending`<br>2. 按分类筛选 `bug` | 仅展示符合筛选条件的反馈 | ☐ 通过 ☐ 失败 |
| 4 | 三态处理 | 1. 网络断开刷新页面<br>2. 恢复网络刷新 | 断网时显示 error 状态 + 重试按钮；无数据时显示 empty 状态；正常时显示列表 | ☐ 通过 ☐ 失败 |
| 5 | 错误处理 | 1. 后端返回 500<br>2. 观察页面 | 显示 `AppApiError` 错误提示，不崩溃 | ☐ 通过 ☐ 失败 |

#### 步骤 3：验证 Feedback 详情/回复
| # | 验证项 | 操作步骤 | 期望结果 | 实际结果 |
|---|--------|----------|----------|----------|
| 6 | 查看详情 | 1. 点击某条反馈"查看" | 弹出详情，展示完整内容、联系方式、状态 | ☐ 通过 ☐ 失败 |
| 7 | 回复反馈 | 1. 输入回复内容<br>2. 点击"提交回复" | 调用 `PUT /api/admin/feedback/:id`，状态更新为 `handled`，列表刷新 | ☐ 通过 ☐ 失败 |
| 8 | 状态变更 | 1. 将 pending 改为 handled | 状态字段持久化到数据库，刷新页面后状态保持 | ☐ 通过 ☐ 失败 |

### 3.2 Users 用户管理真实数据验证

#### 步骤 1：准备测试数据
```sql
-- 确认 users 表已有真实用户数据（通过客户端微信登录产生）
SELECT id, openid, nickname, role, status, created_at FROM users LIMIT 10;
-- 若无数据，至少插入 5 条测试用户
INSERT INTO users (openid, nickname, role, status, created_at, updated_at)
VALUES
  ('test_openid_1', '测试用户1', 'USER', 'active', NOW(), NOW()),
  ('test_openid_2', '测试用户2', 'USER', 'active', NOW(), NOW()),
  ('test_openid_3', '测试用户3', 'USER', 'disabled', NOW(), NOW()),
  ('test_openid_4', '管理员测试', 'ADMIN', 'active', NOW(), NOW()),
  ('test_openid_5', '测试用户5', 'USER', 'active', NOW(), NOW());
```

#### 步骤 2：验证 Users 列表页加载真实数据
| # | 验证项 | 操作步骤 | 期望结果 | 实际结果 |
|---|--------|----------|----------|----------|
| 1 | 列表加载 | 1. 左侧菜单点击"用户管理"<br>2. 观察 Users.vue | 调用 `GET /api/admin/users`，展示真实用户列表，**无硬编码 mock 数组** | ☐ 通过 ☐ 失败 |
| 2 | 分页 | 1. 插入 50 条用户<br>2. 每页 20 条<br>3. 翻页 | 分页正确，每页数据不重复 | ☐ 通过 ☐ 失败 |
| 3 | 搜索 | 1. 按 nickname 搜索"测试"<br>2. 按 role 筛选 `USER` | 搜索结果准确，符合条件 | ☐ 通过 ☐ 失败 |
| 4 | 三态处理 | 1. 断网刷新<br>2. 空表刷新<br>3. 正常刷新 | 三态（loading/empty/error）正确显示 | ☐ 通过 ☐ 失败 |

#### 步骤 3：验证用户编辑（handleSaveEdit 接入真实 API）
| # | 验证项 | 操作步骤 | 期望结果 | 实际结果 |
|---|--------|----------|----------|----------|
| 5 | 编辑用户 | 1. 点击某用户"编辑"<br>2. 修改 nickname<br>3. 点击"保存" | 调用 `PUT /api/admin/users/:id`，数据库对应记录更新，列表刷新展示新昵称 | ☐ 通过 ☐ 失败 |
| 6 | 禁用用户 | 1. 编辑用户<br>2. 将 status 改为 `disabled`<br>3. 保存 | 数据库 status 字段更新为 `disabled`；该用户再次登录时被拒（Task 0.4.2 `AdminDisabledException`） | ☐ 通过 ☐ 失败 |
| 7 | 启用用户 | 1. 编辑 disabled 用户<br>2. 改为 `active`<br>3. 保存 | 状态更新，用户可正常登录 | ☐ 通过 ☐ 失败 |
| 8 | 角色变更 | 1. 编辑 USER 用户<br>2. 改为 ADMIN<br>3. 保存 | 角色字段更新，该用户可访问 Admin 端点 | ☐ 通过 ☐ 失败 |
| 9 | 取消编辑 | 1. 点击"编辑"<br>2. 修改字段<br>3. 点击"取消" | 不调用 API，列表数据无变化 | ☐ 通过 ☐ 失败 |
| 10 | 编辑失败处理 | 1. 后端返回 403（非 ADMIN 用户）<br>2. 保存编辑 | 显示错误提示，不崩溃；`AppApiError` 正确展示 | ☐ 通过 ☐ 失败 |

### 3.3 权限验证（Task 0.4 联动）

| # | 验证项 | 操作步骤 | 期望结果 | 实际结果 |
|---|--------|----------|----------|----------|
| 1 | 非 ADMIN 访问 | 1. 用普通 USER 账号 token 调用 `GET /api/admin/feedback` | 返回 HTTP 403 Forbidden | ☐ 通过 ☐ 失败 |
| 2 | 非 ADMIN 访问 | 1. 用普通 USER 账号 token 调用 `GET /api/admin/users` | 返回 HTTP 403 Forbidden | ☐ 通过 ☐ 失败 |
| 3 | 禁用 ADMIN 访问 | 1. 将某管理员 status 改为 `disabled`<br>2. 用该账号登录 | 抛 `AdminDisabledException`，错误码 `ADMIN_DISABLED` | ☐ 通过 ☐ 失败 |

### 3.4 数据一致性验证

| # | 验证项 | 操作步骤 | 期望结果 | 实际结果 |
|---|--------|----------|----------|----------|
| 1 | 密码脱敏 | 1. 调用 `GET /api/admin/users`<br>2. 检查响应体 | 响应中**不包含** `password` 字段（`@JsonIgnore` 生效） | ☐ 通过 ☐ 失败 |
| 2 | DTO 化返回 | 1. 调用 `GET /api/admin/users/:id`<br>2. 检查响应体 | 返回 `UserView`/`UserDto`，非 User Entity 直接序列化 | ☐ 通过 ☐ 失败 |
| 3 | 反馈列表字段 | 1. 调用 `GET /api/admin/feedback`<br>2. 检查响应字段 | 包含 id/userId/category/content/contact/status/createdAt，**无 mock 字段** | ☐ 通过 ☐ 失败 |

---

## 四、验证结果汇总

### Task 1.7.1（自动化测试）
- 用例总数：**18**（要求 ≥10）
- 通过：**18** / 18
- 状态：✅ 已完成

### Task 1.7.2（真机验证）
- 下拉刷新用例：8 项
- 列表滑动用例：8 项
- 触摸事件用例：3 项
- 定时器清理用例：3 项
- WXSS 兼容性用例：5 项
- 总计：**27 项**（待 QA 真机执行）
- 状态：⏳ 待真机验证

### Task 1.7.3（Admin 后台验证）
- Feedback 验证用例：8 项
- Users 验证用例：10 项
- 权限验证用例：3 项
- 数据一致性用例：3 项
- 总计：**24 项**（待 QA/运营执行）
- 状态：⏳ 待后台验证

---

## 五、问题记录模板

> 真机/后台验证过程中发现的问题请按以下模板记录，便于后续修复。

```markdown
### 问题 #N
- **所属任务**：1.7.2 / 1.7.3
- **页面/端点**：
- **复现步骤**：
  1.
  2.
  3.
- **期望结果**：
- **实际结果**：
- **截图/录屏**：（附链接）
- **严重程度**：🔴 CRITICAL / 🟠 HIGH / 🟡 MEDIUM / 🟢 LOW
- **责任模块**：client / admin / api / database
- **修复状态**：未开始 / 进行中 / 已修复 / 已验证
```

---

## 六、签核

| 角色 | 姓名 | 日期 | 签核结果 |
|------|------|------|----------|
| QA 负责人 | | | ☐ 通过 ☐ 不通过 |
| 前端负责人 | | | ☐ 通过 ☐ 不通过 |
| 后端负责人 | | | ☐ 通过 ☐ 不通过 |
| 产品负责人 | | | ☐ 通过 ☐ 不通过 |

> 所有未通过项需进入下一轮迭代修复，并在 `topics.md` 跟踪进度。
