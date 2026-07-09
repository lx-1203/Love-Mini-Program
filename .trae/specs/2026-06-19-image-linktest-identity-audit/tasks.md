# Tasks

## Phase 1: 图片资源补齐

- [x] Task 1: 创建图片资源目录结构
  - [x] SubTask 1.1: 创建 `apps/client/src/static/assets/images/avatars/` 目录
  - [x] SubTask 1.2: 创建 `apps/client/src/static/assets/images/activities/` 目录
  - [x] SubTask 1.3: 创建 `apps/client/src/static/assets/images/products/` 目录
  - [x] SubTask 1.4: 创建 `apps/client/src/static/assets/images/posts/` 目录
  - [x] SubTask 1.5: 创建 `apps/client/src/static/assets/images/posters/` 目录

- [x] Task 2: 生成用户头像图片（11 张）
  - [x] SubTask 2.1: 生成 7 个 Mock 推荐用户头像（夏言/顾北/林溪/周屿/沈念/苏晚/陆辰）→ `avatars/user-4001.png` ~ `avatars/user-4007.png`
  - [x] SubTask 2.2: 生成 3 个首页推荐用户头像（林安/周沐/许诺）→ `avatars/person-1.png` ~ `avatars/person-3.png`
  - [x] SubTask 2.3: 生成默认头像 → `apps/client/src/static/default-avatar.png`
  - [x] SubTask 2.4: 生成当前用户头像 → `avatars/current-user.png`

- [x] Task 3: 生成活动封面图片（3 张）
  - [x] SubTask 3.1: 生成社团活动封面 → `activities/activity-1.png`（社团招新场景）
  - [x] SubTask 3.2: 生成讲座活动封面 → `activities/activity-2.png`（学术讲座场景）
  - [x] SubTask 3.3: 生成运动会封面 → `activities/activity-3.png`（校园运动会场景）

- [x] Task 4: 生成商品图片（6 张）
  - [x] SubTask 4.1: 生成票务商品图 → `products/ticket-1.png`、`products/ticket-2.png`
  - [x] SubTask 4.2: 生成餐饮商品图 → `products/food-1.png`、`products/food-2.png`
  - [x] SubTask 4.3: 生成文创周边图 → `products/merch-1.png`、`products/merch-2.png`

- [x] Task 5: 生成帖子配图（5 张）
  - [x] SubTask 5.1: 生成校园生活场景配图 → `posts/post-1.png` ~ `posts/post-5.png`（咖啡馆/图书馆/操场/食堂/夜景）

- [x] Task 6: 生成登录页海报（1 张）
  - [x] SubTask 6.1: 生成校园风景海报 → `posters/login-poster.png`（视频降级时使用）

- [x] Task 7: 替换代码中的外链图片引用
  - [x] SubTask 7.1: 替换 `apps/client/src/stores/discover.ts` 中 7 处 dicebear 头像为本地路径
  - [x] SubTask 7.2: 替换 `apps/client/src/stores/discover.ts` 中 unsplash 图片为本地路径
  - [x] SubTask 7.3: 替换 `apps/client/src/stores/messages.ts` 中 6 处 dicebear 头像为本地路径
  - [x] SubTask 7.4: 替换 `apps/client/src/pages/chat/index.vue` 中 4 处 dicebear 头像为本地路径
  - [x] SubTask 7.5: 替换 `apps/client/src/stores/village.ts` 中空头像字段为本地路径
  - [x] SubTask 7.6: 更新 `apps/client/src/config/home-recommended-people.ts` 补充 avatarUrl 字段
  - [x] SubTask 7.7: 更新 `apps/client/src/services/mocks/fixtures.ts` 替换外链图片（核查后无外链，无需修改）
  - [x] SubTask 7.8: 验证 `apps/client/src/pages/discover/history.vue` 的 default-avatar.png 引用可用（已正确）
  - [x] SubTask 7.9: 替换 `apps/client/src/pages/circle/index.vue` 中 3 处 dicebear + 3 处 picsum（验证阶段补充发现）
  - [x] SubTask 7.10: 替换 `apps/client/src/stores/campus-wall.ts` 中 3 处 dicebear + 3 处 picsum（验证阶段补充发现）
  - [x] SubTask 7.11: 替换 `apps/client/src/stores/likes.ts` 中 11 处 dicebear（验证阶段补充发现）
  - [x] SubTask 7.12: 替换 `apps/client/src/pages/shop/index.vue` 中 6 处 picsum（验证阶段补充发现）
  - [x] SubTask 7.13: 替换 `apps/client/src/stores/activity.ts` 中 4 处 picsum（验证阶段补充发现）
  - [x] SubTask 7.14: 全项目验证 `dicebear.com`/`unsplash.com`/`picsum.photos` 搜索结果为 0

## Phase 2: 链路测试真实执行

- [x] Task 8: 启动后端服务（Mock 模式）
  - [x] SubTask 8.1: 使用 Windows CMD 启动 `apps/api` 后端：`mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=mock`
  - [x] SubTask 8.2: 验证后端健康检查 `GET http://localhost:8080/api/_debug/health` 返回 200
  - [x] SubTask 8.3: 记录后端启动日志，确认无 ERROR

- [x] Task 9: 启动前端 H5 服务
  - [x] SubTask 9.1: 启动 Vite dev server：`npm run client:dev:h5`
  - [x] SubTask 9.2: 验证 `GET http://localhost:5173` 返回 200
  - [x] SubTask 9.3: 记录前端启动日志，确认无编译错误

- [x] Task 10: 执行 API 链路测试
  - [x] SubTask 10.1: 运行 `node doc/scripts/link-test.mjs` 真实执行 10 场景测试
  - [x] SubTask 10.2: 收集测试结果到 `doc/reports/link-test-result.json`
  - [x] SubTask 10.3: 若有场景失败，定位并修复后端/前端问题
  - [x] SubTask 10.4: 重新执行直到 10 场景全部通过（或如实记录失败原因）

- [x] Task 11: 执行浏览器 UI 真实操作测试
  - [x] SubTask 11.1: 使用 Chrome DevTools MCP 打开浏览器访问 `http://localhost:5173`
  - [x] SubTask 11.2: 真实点击登录按钮完成登录流程
  - [x] SubTask 11.3: 真实导航到 5 个主页面（首页/圈子/匹配/消息/我的）并截图
  - [x] SubTask 11.4: 真实操作核心交互（点赞/发帖/发消息/匹配）并截图
  - [x] SubTask 11.5: 截图保存到 `test-screenshots/2026-06-19-linktest/` 目录

- [x] Task 12: 重新生成链路测试报告
  - [x] SubTask 12.1: 基于真实执行结果重新生成 `doc/reports/link-test-report.md`
  - [x] SubTask 12.2: 确保报告内容与 `link-test-result.json` 严格一致
  - [x] SubTask 12.3: 在报告中附上浏览器 UI 测试截图引用

## Phase 3: 身份设置研究验证

- [x] Task 13: 研究身份设置体系
  - [x] SubTask 13.1: 阅读 4 个设置页面代码（profile/campus/schedule/recommend-pref）
  - [x] SubTask 13.2: 阅读会话守卫 `apps/client/src/guards/session-guard.ts`
  - [x] SubTask 13.3: 阅读页面访问配置 `apps/client/src/config/page-access.ts`
  - [x] SubTask 13.4: 阅读会话 Store `apps/client/src/stores/session.ts` 的状态管理
  - [x] SubTask 13.5: 梳理身份链路状态迁移图

- [x] Task 14: 真实操作验证身份拦截
  - [x] SubTask 14.1: 验证未登录访问受保护页面 → 跳转登录页
  - [x] SubTask 14.2: 验证已登录未完善资料 → 跳转资料设置页
  - [x] SubTask 14.3: 验证已完善资料未完善校区 → 跳转校区设置页
  - [x] SubTask 14.4: 验证已完善校区未完善日程 → 跳转日程设置页
  - [x] SubTask 14.5: 验证全部完善后正常进入应用

- [x] Task 15: 真实操作完整身份链路
  - [x] SubTask 15.1: 从登录页开始，真实操作完成登录
  - [x] SubTask 15.2: 真实填写基础资料并保存
  - [x] SubTask 15.3: 真实填写校区信息并保存
  - [x] SubTask 15.4: 真实填写日程偏好并保存
  - [x] SubTask 15.5: 验证进入首页，会话状态正确
  - [x] SubTask 15.6: 每一步截图保存到 `test-screenshots/2026-06-19-identity/`

- [x] Task 16: 验证资料完善度计算
  - [x] SubTask 16.1: 在未完善任何资料状态下读取 `profileCompletion` 值
  - [x] SubTask 16.2: 完善基础资料后读取 `profileCompletion` 值
  - [x] SubTask 16.3: 完善校区后读取 `profileCompletion` 值
  - [x] SubTask 16.4: 完善日程后读取 `profileCompletion` 值（应为 100）
  - [x] SubTask 16.5: 验证 `isProfileComplete` 硬门槛逻辑

- [x] Task 17: 输出身份设置研究报告
  - [x] SubTask 17.1: 创建 `doc/reports/identity-settings-research.md`
  - [x] SubTask 17.2: 记录 4 个设置页面的字段、提交逻辑、跳转关系
  - [x] SubTask 17.3: 记录会话守卫的 4 层拦截逻辑
  - [x] SubTask 17.4: 记录 7 个页面的访问要求配置
  - [x] SubTask 17.5: 记录身份链路状态迁移图
  - [x] SubTask 17.6: 记录真实操作验证结果（含截图引用）

## Phase 4: 全量验收

- [x] Task 18: 全量功能验收
  - [x] SubTask 18.1: 验证 5 个主页面功能可用（首页/圈子/匹配/消息/我的）
  - [x] SubTask 18.2: 验证 4 个设置页面功能可用
  - [x] SubTask 18.3: 验证核心交互功能（登录/发帖/点赞/聊天/匹配）
  - [x] SubTask 18.4: 验证图片资源在所有页面正确加载
  - [x] SubTask 18.5: 验证无 500 错误、无外链图片依赖

# Task Dependencies

- Task 2~6（图片生成）可并行执行，依赖 Task 1（目录创建）
- Task 7（替换外链）依赖 Task 2~6（图片资源就绪）
- Task 8~9（服务启动）可并行执行，不依赖 Task 1~7
- Task 10（API 测试）依赖 Task 8（后端启动）
- Task 11（UI 测试）依赖 Task 9（前端启动）和 Task 7（图片替换完成）
- Task 12（报告生成）依赖 Task 10 和 Task 11
- Task 13（研究）可并行执行，不依赖其他任务
- Task 14~15（身份验证）依赖 Task 9（前端启动）和 Task 13（研究完成）
- Task 16（完善度验证）依赖 Task 15（完整链路操作）
- Task 17（研究报告）依赖 Task 13~16
- Task 18（全量验收）依赖所有前置任务完成
