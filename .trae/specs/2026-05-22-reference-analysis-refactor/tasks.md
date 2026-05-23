# Tasks

## Phase 1: P0阻塞项修复

- [x] Task 1.1: 重写RealAuthService接入UserRepository
  - [x] SubTask 1.1.1: 将 `openIdToUserId` 和 `userIdToDisplayName` 内存Map替换为 UserRepository 查询
  - [x] SubTask 1.1.2: 实现 `findByOpenId()` 从数据库查找用户
  - [x] SubTask 1.1.3: 实现新用户创建时写入数据库（User + UserBasicProfile）
  - [x] SubTask 1.1.4: profileCompleted 基于数据库字段动态计算（nickname非空+avatar非空+bio非空等）
  - [x] SubTask 1.1.5: campusVerified 基于 UserCampusProfile 是否存在且审核通过
  - [x] SubTask 1.1.6: scheduleCompleted 基于 UserScheduleProfile 是否存在
  - [x] SubTask 1.1.7: 验证Real模式下登录→获取用户信息→profileCompleted正确返回
  - **验证**：Real模式登录后不再显示LockScreen，用户可正常进入主功能

- [x] Task 1.2: 重写RealMatchService匹配创建逻辑
  - [x] SubTask 1.2.1: `createMatch()` 替换硬编码返回，实现基于推荐算法的真实匹配创建
  - [x] SubTask 1.2.2: `createQuickMatch()` 替换硬编码返回，实现快速匹配逻辑
  - [x] SubTask 1.2.3: 匹配结果写入数据库，返回真实匹配对象信息
  - [x] SubTask 1.2.4: 验证匹配创建→心动信号→私信 完整链路
  - **验证**：匹配创建返回真实数据，心动信号正常触发

- [x] Task 1.3: 实现RealRecommendationService活动报名和详情
  - [x] SubTask 1.3.1: `enrollActivity()` 替换UnsupportedOperationException，实现ActivityEnrollment记录创建
  - [x] SubTask 1.3.2: `getActivityDetail()` 替换UnsupportedOperationException，从数据库获取完整活动信息
  - [x] SubTask 1.3.3: 活动详情包含描述、报名人数、参与者预览
  - [x] SubTask 1.3.4: 报名后报名人数实时更新
  - **验证**：活动报名和详情API正常返回，不抛异常

- [x] Task 1.4: 补全RealRecommendationService讨论推荐
  - [x] SubTask 1.4.1: `getDiscussions()` 替换空列表返回，实现讨论内容推荐逻辑
  - [x] SubTask 1.4.2: 基于用户兴趣标签匹配讨论话题
  - [x] SubTask 1.4.3: `getHistory()` 替换空列表返回，实现推荐历史记录查询
  - **验证**：讨论推荐和推荐历史API返回真实数据

---

## Phase 2: P1核心项

- [x] Task 2.1: 统一pages.json
  - [x] SubTask 2.1.1: 对比 `apps/client/pages.json` 和 `apps/client/src/pages.json` 的差异
  - [x] SubTask 2.1.2: 将根目录pages.json更新为包含所有页面注册（circles、daily-question等）
  - [x] SubTask 2.1.3: 确保两套pages.json内容一致
  - [x] SubTask 2.1.4: 验证所有页面可正常访问
  - **验证**：circles和daily-question页面在编译后可正常访问

- [ ] Task 2.2: 前端Store Real模式验证
  - [ ] SubTask 2.2.1: 验证 `discover.ts` Real模式下推荐卡片API调用正常
  - [ ] SubTask 2.2.2: 验证 `likes.ts` Real模式下喜欢/访客API调用正常
  - [ ] SubTask 2.2.3: 验证 `village.ts` Real模式下帖子列表API调用正常
  - [ ] SubTask 2.2.4: 验证 `messages.ts` Real模式下消息列表API调用正常
  - [ ] SubTask 2.2.5: 验证 `profile.ts` Real模式下个人资料API调用正常
  - [ ] SubTask 2.2.6: 验证 `activity.ts` Real模式下活动API调用正常
  - [ ] SubTask 2.2.7: 验证 `checkin.ts` Real模式下签到API调用正常
  - [ ] SubTask 2.2.8: 验证 `circle.ts` Real模式下兴趣圈API调用正常
  - [ ] SubTask 2.2.9: 验证 `daily-question.ts` Real模式下每日一问API调用正常
  - [ ] SubTask 2.2.10: 修复验证过程中发现的API调用/数据格式/错误处理问题
  - **验证**：所有Store在Real模式下正常工作，数据正确展示

- [x] Task 2.3: 前端WebSocket客户端集成
  - [x] SubTask 2.3.1: 在 `services/websocket.ts` 中实现uni-app兼容的WebSocket客户端
  - [x] SubTask 2.3.2: 连接后端STOMP端点，订阅用户私有消息频道
  - [x] SubTask 2.3.3: 私信实时推送：收到新消息时更新messages store
  - [x] SubTask 2.3.4: 通知实时推送：收到新通知时更新messages store
  - [x] SubTask 2.3.5: 心动信号实时推送：收到心动信号时更新likes store
  - [x] SubTask 2.3.6: WebSocket断线重连机制
  - [x] SubTask 2.3.7: 消息TabBar未读红点实时更新
  - **验证**：私信和通知实时送达，TabBar红点实时更新

- [x] Task 2.4: 补全推荐服务标签匹配逻辑
  - [x] SubTask 2.4.1: 确认UserBasicProfile是否包含tags/interests字段
  - [x] SubTask 2.4.2: 若无，新增Flyway迁移脚本添加interest_tags字段
  - [x] SubTask 2.4.3: 在RealRecommendationService中实现基于兴趣标签的匹配加权
  - [x] SubTask 2.4.4: 验证标签匹配影响推荐排序结果
  - **验证**：有共同兴趣标签的用户在推荐中排序靠前

---

## Phase 3: P2增强项

- [x] Task 3.1: 关注关系系统
  - [x] SubTask 3.1.1: 创建Flyway迁移脚本 `user_follows` 表（follower_id, following_id, created_at）
  - [x] SubTask 3.1.2: 创建 UserFollow Entity 和 UserFollowRepository
  - [x] SubTask 3.1.3: 后端新增 `POST /api/users/{id}/follow` 关注接口
  - [x] SubTask 3.1.4: 后端新增 `DELETE /api/users/{id}/follow` 取关接口
  - [x] SubTask 3.1.5: 后端新增 `GET /api/users/{id}/followers` 获取粉丝列表
  - [x] SubTask 3.1.6: 后端新增 `GET /api/users/{id}/following` 获取关注列表
  - [x] SubTask 3.1.7: 修改 RealVillageService.getFollowingPosts() 使用关注关系表查询
  - [x] SubTask 3.1.8: 修改前端 village store 的 followUser 方法按 userId 操作
  - [x] SubTask 3.1.9: 关注时触发通知
  - **验证**：关注/取关正常，村口"关注"标签返回关注用户帖子

- [x] Task 3.2: 个人中心统计数据真实化
  - [x] SubTask 3.2.1: 后端新增 `GET /api/profile/stats` 返回关注数/粉丝数/获赞数
  - [x] SubTask 3.2.2: 后端新增 `GET /api/profile/basic` 返回bio字段
  - [x] SubTask 3.2.3: 前端 profile/index.vue 替换硬编码统计数字为API数据
  - [x] SubTask 3.2.4: 前端 profile/index.vue 替换硬编码bio为API数据
  - **验证**：个人中心统计数字来自后端API

---

## Phase 4: P3清理与全链路验证

- [ ] Task 4.1: 代码清理
  - [ ] SubTask 4.1.1: Village Store实现分页加载
  - [ ] SubTask 4.1.2: appVersion动态获取
  - [ ] SubTask 4.1.3: 清理两套pages.json中的冗余注释
  - **验证**：代码无冗余，分页正常

- [ ] Task 4.2: 全链路验证（Real模式）
  - [ ] SubTask 4.2.1: 微信登录 → 学校认证 → 资料完善 → 解锁功能 完整链路
  - [ ] SubTask 4.2.2: 寻觅 → 喜欢 → 心动信号 → 私信 完整链路
  - [ ] SubTask 4.2.3: 村口 → 发帖 → 评论 → 点赞 → 转发 完整链路
  - [ ] SubTask 4.2.4: 兴趣圈 → 加入 → 话题 → 回复 → 村口展示 完整链路
  - [ ] SubTask 4.2.5: 签到 → 每日一问 → 回答 → 发现匹配 → 私信 完整链路
  - [ ] SubTask 4.2.6: 活动 → 列表 → 日历 → 详情 → 报名 完整链路
  - [ ] SubTask 4.2.7: 推荐偏好设置 → 影响推荐结果 完整链路
  - [ ] SubTask 4.2.8: 互动提醒 → 通知 → 跳转 完整链路
  - [ ] SubTask 4.2.9: 服务重启后数据保留验证
  - **验证**：所有链路在Real模式下正常运行

- [ ] Task 4.3: 回归验证
  - [ ] SubTask 4.3.1: 大学生模式（学校认证/同乡分类/同校圈）不受影响
  - [ ] SubTask 4.3.2: 资料完善硬门槛正常生效
  - [ ] SubTask 4.3.3: 推荐计划设置完整保留
  - [ ] SubTask 4.3.4: 线下活动功能完整保留
  - [ ] SubTask 4.3.5: Mock模式仍可作为开发回退使用
  - [ ] SubTask 4.3.6: 无游戏化元素和购物功能
  - **验证**：所有已有功能完整可用，约束条件满足

---

# Task Dependencies

- Task 1.1 是所有后续任务的前置条件（Real模式登录不可用则无法测试任何功能）
- Task 1.2 依赖 Task 1.1（匹配需要登录用户）
- Task 1.3 独立于 Task 1.2（活动Service可并行修复）
- Task 1.4 独立于 Task 1.2-1.3（推荐补全可并行）
- Task 2.1 独立（pages.json修复可并行）
- Task 2.2 依赖 Task 1.1-1.4（Store验证需要后端API正常）
- Task 2.3 依赖 Task 1.1（WebSocket需要登录用户）
- Task 2.4 独立（推荐标签匹配可并行）
- Task 3.1 依赖 Task 1.1（关注关系需要登录用户）
- Task 3.2 依赖 Task 1.1 + 3.1（统计需要关注数据）
- Task 4.2 依赖所有前置任务
- Task 4.3 依赖 Task 4.2

# 可并行执行的任务组

- **组A**：Task 1.1（RealAuthService重写，最高优先级，阻塞其他所有任务）
- **组B**：Task 1.2 + 1.3 + 1.4 + 2.1 + 2.4（依赖组A，可全部并行）
- **组C**：Task 2.2 + 2.3（依赖组B，可并行）
- **组D**：Task 3.1 + 3.2（依赖组A，可与组C并行）
- **组E**：Task 4.1（独立，可与组D并行）
- **组F**：Task 4.2 + 4.3（依赖所有任务完成）

# 开发时间线建议

| 阶段 | 内容 | 里程碑 |
|------|------|--------|
| Day 1-2 | Phase 1: P0阻塞修复（RealAuthService+匹配+活动+推荐补全） | M1: Real模式可登录+匹配+活动 |
| Day 3-4 | Phase 2: P1核心（pages.json+Store验证+WebSocket+标签匹配） | M2: Real模式全链路可用 |
| Day 5 | Phase 3: P2增强（关注关系+统计真实化） | M3: 功能完善 |
| Day 6 | Phase 4: 清理+全链路验证+回归测试 | M4: 全部验收通过 |

# 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 后端开发 | 1 | RealAuthService重写+匹配逻辑+活动Service+关注关系 |
| 前端开发 | 1 | WebSocket集成+Store验证+页面修复+pages.json统一 |
| 全栈/联调 | 1 | 推荐补全+统计API+联调测试+回归验证 |
