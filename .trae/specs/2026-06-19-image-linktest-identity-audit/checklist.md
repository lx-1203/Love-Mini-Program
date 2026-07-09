# Checklist

## Phase 1: 图片资源补齐

### 目录结构
- [x] `apps/client/src/static/assets/images/avatars/` 目录已创建
- [x] `apps/client/src/static/assets/images/activities/` 目录已创建
- [x] `apps/client/src/static/assets/images/products/` 目录已创建
- [x] `apps/client/src/static/assets/images/posts/` 目录已创建
- [x] `apps/client/src/static/assets/images/posters/` 目录已创建

### 用户头像（11 张）
- [x] `avatars/user-4001.png`（夏言）已生成
- [x] `avatars/user-4002.png`（顾北）已生成
- [x] `avatars/user-4003.png`（林溪）已生成
- [x] `avatars/user-4004.png`（周屿）已生成
- [x] `avatars/user-4005.png`（沈念）已生成
- [x] `avatars/user-4006.png`（苏晚）已生成
- [x] `avatars/user-4007.png`（陆辰）已生成
- [x] `avatars/person-1.png`（林安）已生成
- [x] `avatars/person-2.png`（周沐）已生成
- [x] `avatars/person-3.png`（许诺）已生成
- [x] `apps/client/src/static/default-avatar.png`（默认头像）已生成
- [x] `avatars/current-user.png`（当前用户）已生成

### 活动封面（3 张）
- [x] `activities/activity-1.png`（社团活动）已生成
- [x] `activities/activity-2.png`（学术讲座）已生成
- [x] `activities/activity-3.png`（运动会）已生成

### 商品图片（6 张）
- [x] `products/ticket-1.png`、`products/ticket-2.png`（票务）已生成
- [x] `products/food-1.png`、`products/food-2.png`（餐饮）已生成
- [x] `products/merch-1.png`、`products/merch-2.png`（文创）已生成

### 帖子配图（5 张）
- [x] `posts/post-1.png` ~ `posts/post-5.png`（校园生活场景）已生成

### 登录页海报（1 张）
- [x] `posters/login-poster.png`（校园风景）已生成

### 外链替换
- [x] `apps/client/src/stores/discover.ts` 中 7 处 dicebear 头像已替换为本地路径
- [x] `apps/client/src/stores/discover.ts` 中 unsplash 图片已替换为本地路径
- [x] `apps/client/src/stores/messages.ts` 中 6 处 dicebear 头像已替换为本地路径
- [x] `apps/client/src/pages/chat/index.vue` 中 4 处 dicebear 头像已替换为本地路径
- [x] `apps/client/src/stores/village.ts` 中空头像字段已补充本地路径
- [x] `apps/client/src/config/home-recommended-people.ts` 已补充 avatarUrl 字段
- [x] `apps/client/src/services/mocks/fixtures.ts` 外链图片已替换（核查后无外链，无需修改）
- [x] `apps/client/src/pages/discover/history.vue` 的 default-avatar.png 引用可用（核查后已正确）
- [x] `apps/client/src/pages/circle/index.vue` 中 3 处 dicebear + 3 处 picsum 已替换（验证阶段补充发现）
- [x] `apps/client/src/stores/campus-wall.ts` 中 3 处 dicebear + 3 处 picsum 已替换（验证阶段补充发现）
- [x] `apps/client/src/stores/likes.ts` 中 11 处 dicebear 已替换（验证阶段补充发现）
- [x] `apps/client/src/pages/shop/index.vue` 中 6 处 picsum 已替换（验证阶段补充发现）
- [x] `apps/client/src/stores/activity.ts` 中 4 处 picsum 已替换（验证阶段补充发现）
- [x] 全项目搜索 `dicebear.com` 无结果
- [x] 全项目搜索 `unsplash.com` 无结果
- [x] 全项目搜索 `images.unsplash.com` 无结果
- [x] 全项目搜索 `picsum.photos` 无结果

---

## Phase 2: 链路测试真实执行

### 后端服务启动
- [x] 后端服务使用 Mock profile 真实启动成功（端口 8080）
- [x] `GET http://localhost:8080/api/_debug/health` 返回 200
- [x] 后端启动日志无 ERROR 级别报错
- [x] 后端启动日志已保存到 `doc/reports/backend-startup.log`

### 前端 H5 启动
- [x] Vite dev server 真实启动成功（端口 5173）
- [x] `GET http://localhost:5173` 返回 200
- [x] 前端启动日志无编译错误
- [x] 前端启动日志已保存到 `doc/reports/frontend-startup.log`

### API 链路测试（10 场景）
- [x] S01: 登录后进入首页 → 看到仪表盘 真实执行通过
- [x] S02: 首页展示课表摘要 + 资料引导 + 推荐的人 + 活动入口 真实执行通过
- [x] S03: 从推荐的人进入聊天 真实执行通过
- [x] S04: 会话立即出现在聊天列表 真实执行通过
- [x] S05: 进入详情发送文字/语音 真实执行通过
- [x] S06: 处理联系方式交换 真实执行通过
- [x] S07: 主动结束会话 真实执行通过
- [x] S08: 返回聊天列表看到状态变化 真实执行通过
- [x] S09: 从匹配页进入聊天链路 真实执行通过
- [x] S10: Mock/Real 模式状态迁移一致 真实执行通过
- [x] `doc/reports/link-test-result.json` 真实结果已更新
- [x] `doc/reports/link-test-report.md` 报告内容与 result.json 一致

### 浏览器 UI 真实操作测试
- [x] 使用 Chrome DevTools MCP 真实打开浏览器访问 `http://localhost:5173`
- [x] 真实点击登录按钮完成登录流程
- [x] 真实导航到首页并截图
- [x] 真实导航到圈子页并截图
- [x] 真实导航到匹配页并截图
- [x] 真实导航到消息页并截图
- [x] 真实导航到我的页并截图
- [x] 真实操作核心交互（点赞/发帖/发消息/匹配）并截图
- [x] 截图保存到 `test-screenshots/2026-06-19-linktest/` 目录

---

## Phase 3: 身份设置研究验证

### 身份设置体系研究
- [x] 4 个设置页面代码已阅读（profile/campus/schedule/recommend-pref）
- [x] 会话守卫 `session-guard.ts` 代码已阅读
- [x] 页面访问配置 `page-access.ts` 代码已阅读
- [x] 会话 Store `session.ts` 状态管理已阅读
- [x] 身份链路状态迁移图已梳理

### 身份拦截验证
- [x] 未登录访问受保护页面 → 跳转登录页 已真实验证
- [x] 已登录未完善资料 → 跳转资料设置页 已真实验证
- [x] 已完善资料未完善校区 → 跳转校区设置页 已真实验证
- [x] 已完善校区未完善日程 → 跳转日程设置页 已真实验证
- [x] 全部完善后正常进入应用 已真实验证

### 完整身份链路真实操作
- [x] 从登录页开始，真实操作完成登录
- [x] 真实填写基础资料（昵称/简介/年级/称呼）并保存
- [x] 真实填写校区信息（城市/学校/院系）并保存
- [x] 真实填写日程偏好（常去区域/空闲时段）并保存
- [x] 验证进入首页，会话状态正确
- [x] 每一步截图保存到 `test-screenshots/2026-06-19-identity/` 目录

### 资料完善度计算验证
- [x] 未完善任何资料状态下 `profileCompletion` 值已记录
- [x] 完善基础资料后 `profileCompletion` 值已记录
- [x] 完善校区后 `profileCompletion` 值已记录
- [x] 完善日程后 `profileCompletion` 值已记录（应为 100）
- [x] `isProfileComplete` 硬门槛逻辑已验证

### 身份设置研究报告
- [x] `doc/reports/identity-settings-research.md` 已创建
- [x] 4 个设置页面的字段、提交逻辑、跳转关系已记录
- [x] 会话守卫的 4 层拦截逻辑已记录
- [x] 7 个页面的访问要求配置已记录
- [x] 身份链路状态迁移图已记录
- [x] 真实操作验证结果（含截图引用）已记录

---

## Phase 4: 全量验收

### 功能可用性
- [x] 首页功能可用（课表/活动/校园墙/推荐）
- [x] 圈子页功能可用（帖子浏览/发帖/点赞）
- [x] 匹配页功能可用（卡片滑动/喜欢/跳过）
- [x] 消息页功能可用（会话列表/聊天/心动信号）
- [x] 我的页功能可用（资料展示/功能菜单/统计）
- [x] 4 个设置页面功能可用
- [x] 登录功能可用
- [x] 核心交互功能可用（点赞/发帖/聊天/匹配）

### 图片资源加载
- [x] 所有页面图片正确加载，无 404
- [x] 头像在所有页面正确展示
- [x] 活动封面在首页正确展示
- [x] 商品图片在逛逛页正确展示
- [x] 默认头像兜底逻辑正确

### 错误与依赖
- [x] 全项目无 500 错误
- [x] 全项目无 `dicebear.com` 外链依赖
- [x] 全项目无 `unsplash.com` 外链依赖
- [x] 全项目无 `picsum.photos` 外链依赖
- [x] 浏览器 console 无图片加载失败报错
