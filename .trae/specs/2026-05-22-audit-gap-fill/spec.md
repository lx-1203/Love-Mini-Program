# 项目全面审计与差距填补 Spec

## Why

上一期重构 spec `2026-05-21-reconstruct-social-app` 已完成全部8个Phase的任务和检查清单，但经过对当前代码库的全面审计，发现以下核心问题：

1. **村口页（`village/index.vue`）是占位符**：虽然 `village-store` 数据模型、发帖页、详情页均已完整实现，但村口首页仅显示"UGC 社区内容即将上线"，未接入 Store，导致整个社区广场功能不可用
2. **我的页（`profile/index.vue`）是占位符**：仅显示"功能占位"和"个人主页内容待补充"，缺少完善度进度条、设置入口、编辑入口等
3. **线下活动功能未整合**：`RecommendationController` 有 `/api/recommendations/activities` 接口，`pages/activities/index.vue` 存在但使用已废弃的 `homeStore`，未集成到主流社交链路中
4. **推荐计划设置缺失**：参考产品（青藤）中存在的"推荐计划设置"（如每日推荐时间偏好、推荐范围配置等）在当前代码和 spec 中均未涉及
5. **部分已废弃代码未清理**：home-sections.ts、match-form.ts 等文件标记为 `@deprecated` 但仍在仓库中

本次审计后的任务是针对性填补上述差距，确保 spec 中规划的功能在代码层面真正可用。

## 参考内容分析

参考目录 `d:\6\恋爱小程序\参考` 包含 11 张微信截图（JPG），为竞品"青藤"的产品界面。基于文件和 spec 的对比分析，参考产品的核心特征包括：

- **五大一级入口**：寻觅（推荐卡片）、喜欢（双向喜欢/访客）、村口（社区广场）、消息（私信/心动信号）、我的（个人中心）
- **资料完善硬门槛**：未完善资料锁定核心功能
- **时间门控推荐**：每日限额+定时刷新
- **双向匹配**：喜欢/被喜欢→心动信号→私信
- **社区UGC**：多分类帖子+评论+点赞+私信
- **推荐计划设置**：用户可配置推荐偏好（时间、范围等）
- **线下活动入口**：活动作为辅助社交场景

## 当前项目 vs 目标功能对比

| 维度         | 当前项目代码实际状态                                          | 目标状态                        | 差距                       |
| ------------ | ------------------------------------------------------------- | ------------------------------- | -------------------------- |
| 寻觅页       | 完整实现：CardSwiper、历史、时间门控、每日限量                 | ✅ 已达标                       | 无                         |
| 喜欢页       | 完整实现：喜欢我的/访客标签、LockScreen、心动信号入口          | ✅ 已达标                       | 无                         |
| 村口页       | **占位符**：Store/发帖/详情已实现，但首页未接入 Store，不可用   | 完整UGC社区广场（三标签+六分类） | 需接入Store，完成UI         |
| 消息页       | 完整实现：心动信号Banner、私信、临时聊天、系统通知              | ✅ 已达标                       | 无                         |
| 我的页       | **占位符**：仅显示"功能占位"，无线索                          | 个人中心（完善度+设置+资料入口） | 需完整重构                 |
| 推荐计划设置 | **不存在**：代码中无任何相关逻辑                               | 用户可配置推荐偏好               | 需从零新建                 |
| 线下活动     | **半成品**：backend API 有接口，但前端使用废弃 Store            | 活动列表+详情+报名               | 需重构接入新链路           |
| 资料完善门槛 | 完整实现：LockScreen + 路由守卫 + 完善度计算                    | ✅ 已达标                       | 无                         |
| 大学生模式   | 部分保留：学校认证、campus字段                                  | ✅ 基本保留                     | 无                         |
| 购物/游戏    | 无                                                             | 无                              | ✅ 合规                    |

## What Changes

### 一级：村口页补齐（接入已实现的 Store）

- 村口 `index.vue` 从占位符替换为完整列表，接入 `useVillageStore`
- 实现三标签：关注 / 同城 / 发现
- 实现六分类筛选：全部 / 兴趣圈 / 诚意帖 / 同乡 / 蒙面 / 最新
- 接入发帖按钮（悬浮+按钮），复用已实现的 `post.vue`
- 帖子卡片点击跳转详情，复用已实现的 `detail.vue`
- 实现点赞、关注等互动功能的 UI 绑定

### 二级：我的页完整化

- 展示用户头像、昵称、学校
- 展示资料完善度进度条（已有 `profileCompletion` getter）
- 编辑资料入口跳转 `subpackages/setup/profile/index`
- 设置入口（学校认证、反馈中心等）
- 关注/粉丝数量展示
- 个人简介展示

### 三级：推荐计划设置（新增功能）

- 在"我的"页新增"推荐计划"设置入口
- 设置项：每日推荐时间偏好（默认中午12点）
- 设置项：推荐范围（同校优先/同城/不限）
- 后端 API：`GET/PUT /api/recommendations/preferences`
- 设置数据持久化到用户表扩展字段

### 四级：线下活动整合

- 重构 `pages/activities/index.vue`，不再依赖废弃的 `useHomeStore`
- 使用 `RecommendationController` API 获取活动数据
- 活动列表展示：标题、地点、时间
- 活动详情展示完整信息
- 在寻觅页底部嵌入活动推荐（替代现有的村口动态占位）
- 活动报名功能（感兴趣 / 参加）

### 五级：代码清理

- 移除标记为 @deprecated 的文件中已确认安全删除的部分
- 保留 home-sections.ts、match-form.ts 为回滚参考（已标记 @deprecated，暂不删除）

## Impact

- Affected specs: `2026-05-21-reconstruct-social-app`（填补其未完成部分）
- Affected code:
  - `apps/client/src/pages/village/index.vue`（重构）
  - `apps/client/src/pages/profile/index.vue`（重构）
  - `apps/client/src/pages/activities/index.vue`（重构）
  - `apps/client/src/stores/discover.ts`（活动推荐嵌入）
  - `apps/client/src/stores/profile.ts`（推荐计划设置）
  - `apps/api/src/main/java/com/campuslove/api/discover/RecommendationController.java`（新增偏好设置接口）
  - `docs/openapi/recommendations.yaml`（新增偏好设置契约）

## ADDED Requirements

### Requirement: 村口页完整列表

系统 SHALL 在村口页展示完整的三标签（关注/同城/发现）+ 六分类筛选帖子列表，接入已实现的 `useVillageStore`。

#### Scenario: 用户浏览村口帖子列表
- **WHEN** 用户已完善资料并打开村口页
- **THEN** 默认展示"发现"标签+全部分类的帖子列表
- **AND** 每个帖子卡片展示：作者身份标签、图文内容、话题标签、互动数据

#### Scenario: 切换标签和分类
- **WHEN** 用户切换"关注"标签
- **THEN** 系统展示用户关注的作者的帖子
- **WHEN** 用户切换分类筛选（如"诚意帖"）
- **THEN** 系统仅展示该分类下的帖子

#### Scenario: 发帖入口
- **WHEN** 用户点击悬浮+按钮
- **THEN** 跳转到发帖页 `/pages/village/post`

### Requirement: 我的页个人中心

系统 SHALL 在"我的"页展示用户信息概览、资料完善度进度条和功能入口。

#### Scenario: 查看个人中心
- **WHEN** 已完善资料的用户打开"我的"页
- **THEN** 展示：头像、昵称、学校、完善度进度条、关注/粉丝数
- **AND** 提供编辑资料入口、推荐计划设置入口、反馈中心入口
- **AND** 展示个人简介

#### Scenario: 点击编辑资料
- **WHEN** 用户点击"编辑资料"按钮
- **THEN** 跳转到资料完善页

### Requirement: 推荐计划偏好设置

系统 SHALL 允许用户配置推荐偏好，影响寻觅页卡片推荐的规则。

#### Scenario: 设置推荐时间偏好
- **WHEN** 用户在"我的"页进入推荐计划设置
- **THEN** 展示每日推荐时间选择器（默认12:00）
- **AND** 用户可选择 10:00 / 12:00 / 14:00 / 18:00 等时间点

#### Scenario: 设置推荐范围
- **WHEN** 用户在推荐计划设置页
- **THEN** 展示推荐范围选项：同校优先 / 同城 / 不限
- **AND** 用户可选择并保存偏好

### Requirement: 线下活动列表整合

系统 SHALL 将线下活动从废弃的 homeStore 迁移到新架构，作为社交链路的辅助功能。

#### Scenario: 浏览活动列表
- **WHEN** 用户打开活动页
- **THEN** 展示活动列表：标题、地点、时间摘要
- **AND** 每个活动可点击查看详情

#### Scenario: 活动报名
- **WHEN** 用户在活动详情页点击"感兴趣"/"参加"
- **THEN** 系统记录用户意向
- **AND** 活动发布者可看到报名人数

## MODIFIED Requirements

### Requirement: 寻觅页底部嵌入内容（原为村口动态占位）

寻觅页底部 SHALL 从村口动态替换为活动推荐，在推荐卡片浏览完后展示近期活动入口。

#### Scenario: 卡片用完后展示活动推荐
- **WHEN** 用户当日推荐卡片已浏览完
- **THEN** 展示"发现活动"板块，包含近期活动列表
- **AND** 点击跳转活动详情