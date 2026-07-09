# Phase 1 — 村口模块 — 任务清单

## 模块概述
实现 UGC 社区广场：三标签切换（关注/同城/发现）、六分类筛选、帖子 CRUD、评论、点赞、关注作者、私信、分享。

## 依赖关系
- **上游依赖**：phase-0-auth、phase-0-database（Post/Comment/PostLike/PostCategory/UserFollow表）
- **下游被依赖**：phase-2-circles（精选话题从村口分流）

## 任务列表

- [ ] **T001: 实现帖子列表 Mock/Real 服务**
  - 输入：`village/VillageService.java` → `MockVillageService.java` / `RealVillageService.java`
  - 输出：GET `/api/village/posts?tag=关注|同城|发现&category=全部|兴趣圈|诚意帖|同乡|蒙面|最新`
  - 验收：三标签 + 六分类正确筛选，分页加载（20条/页）
  - 测试命令：`npm run api:test`

- [ ] **T002: 实现帖子发布服务**
  - 输入：POST `/api/village/posts` 接口
  - 输出：创建帖子（文字 ≤500字 + 图片 ≤9张 + 分类 + 话题标签 + 定位）
  - 验收：发布后帖子出现在"最新"分类中，内容敏感词过滤
  - 测试命令：`npm run api:test`

- [ ] **T003: 实现帖子详情 + 评论 + 点赞服务**
  - 输入：GET `/api/village/posts/{id}`、POST `/api/village/posts/{id}/comments`、POST `/api/village/posts/{id}/like`
  - 输出：帖子详情含作者信息卡片；评论支持回复；点赞可取消去重
  - 验收：评论后作者收到通知；点赞数正确更新
  - 测试命令：`npm run api:test`

- [ ] **T004: 实现关注作者 + 私信 + 分享服务**
  - 输入：`POST /api/users/{id}/follow`、`POST /api/village/posts/{id}/share`
  - 输出：关注作者（互关标识）、分享计数、私信入口
  - 验收：关注后出现在"关注"标签页；分享数增加
  - 测试命令：`npm run api:test`

- [ ] **T005: 实现前端村口列表页**
  - 输入：`apps/client/src/pages/village/index.vue`、`apps/client/src/stores/village.ts`
  - 输出：三标签顶部切换 + 六分类横向滚动筛选 + 帖子卡片瀑布流 + FAB发帖按钮
  - 验收：标签切换流畅，分类筛选正确，帖子卡片正确渲染
  - 测试命令：`npm run test:client`

- [ ] **T006: 实现前端发帖页**
  - 输入：`apps/client/src/pages/village/post.vue`
  - 输出：文字输入 + 图片上传（9张） + 分类选择 + 话题标签 + 定位
  - 验收：发布成功后跳转帖子详情
  - 测试命令：`npm run test:client`

- [ ] **T007: 实现前端帖子详情页**
  - 输入：`apps/client/src/pages/village/detail.vue`
  - 输出：作者卡片 + 图文内容 + 评论列表 + 互动按钮（点赞/评论/关注/私信/分享）
  - 验收：评论可发表和回复，点赞可切换
  - 测试命令：`npm run test:client`

- [ ] **T008: 实现标签帖子列表页**
  - 输入：`apps/client/src/pages/village/tag-posts.vue`
  - 输出：按话题标签聚合帖子列表
  - 验收：点击标签跳转，列表标题显示标签名
  - 测试命令：`npm run test:client`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| 帖子列表三标签+六分类 | ⏳ |
| 帖子发布 | ⏳ |
| 详情+评论+点赞 | ⏳ |
| 关注+私信+分享 | ⏳ |
| 前端列表页 | ⏳ |
| 前端发帖页 | ⏳ |
| 前端详情页 | ⏳ |
| 标签帖子列表 | ⏳ |
