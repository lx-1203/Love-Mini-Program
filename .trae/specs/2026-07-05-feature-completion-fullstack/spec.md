# 恋爱小程序 · 全栈功能补全 + 视觉再对齐 - Spec

## Why
前序"设计感精修"在文档上声称完成了 UI 视觉对齐（Design Token 补全、组件精修、各页面精修、Bug 修复、硬编码清理），但**用户反馈视觉匹配依旧不到位**——参考 [docs/design-reference-analysis.md](file:///d:/6/恋爱小程序/docs/design-reference-analysis.md) 中梳理的青藤之恋设计语言，当前实现存在以下问题：
1. **视觉再审计缺失**：之前未做截图与参考图的逐项比对，存在"声称完成但实际未对齐"的问题
2. **氛围感不足**：参考设计的"若隐若现、半透明渐变、柔光、高斯模糊"等氛围感未真正落地
3. **功能级未完成项**：dogfood 报告中 11 项功能（H-07/H-08/H-10/M-07/M-08/M-09/M-11/M-16/L-02/L-06/B1.3-B1.4）需要前后端同时修改
4. **缺少截图识别验收**：之前仅靠 grep/编译验证，缺少基于实际截图的视觉验收

本 Spec 旨在通过"视觉再审计 → 视觉重构 → 功能补全 → 截图识别验收"四步走，使整个项目达到用户期望的"完整可用且视觉足够好"目标。

## What Changes

### Phase 0: 视觉再审计（截图识别 + 参考比对）
- 启动 H5 开发服务器（端口 5173-5175）
- 使用 agent-browser 系统性截图 8 个核心页面（首页/寻觅/喜欢/消息/聊天/圈子/校园墙/我的）+ 子包页面（课表/校园认证/每日一问/登录）共 12+ 张
- 截图保存到 `.trae/screenshots/visual-reaudit-2026-07-05/`
- 与参考图 [ChatGPT Image 2026年5月17日 14_53_26.png](file:///d:/6/恋爱小程序/ChatGPT%20Image%202026%E5%B9%B45%E6%9C%8817%E6%97%A5%2014_53_26.png)、[14_57_50.png](file:///d:/6/恋爱小程序/ref_img.png) 逐项比对
- 输出 `visual-gap-report.md`，列出每页的具体视觉差距（颜色/间距/圆角/阴影/氛围感/层级）
- 输出 `visual-fix-checklist.md`，每项差距对应一个修复任务

### Phase 1: 视觉重构（基于审计结果）
- 修正 Design Token 与参考设计的偏差（颜色色值/圆角档位/阴影层级/字号字重）
- 重构氛围感元素：登录页 70% 实景图 + 30% 按钮区；锁屏页高斯模糊头像；VIP 横幅暖金渐变 12°
- 重构卡片质感：边缘色 + 多层阴影 + 圆角 16/24/9999/12 四档严格统一
- 重构间距韵律：8/12/16/24/32/48 六档间距，禁用非标准值
- 重构交互反馈：所有可点击元素 scale(0.96-0.98) + 涟漪 + lightHaptic
- 重构状态徽章：浅底深字反白组合（薄荷/琥珀/蓝紫三色严格对齐）
- 重构课程色块：低饱和同明度（饱和度≤20%，明度≈92%）
- 重构图标：所有 emoji 替换为 SVG（线性 1.5px 描边风格）
- 重构 TabBar：5 枚图标线性 1.5px 描边风格、激活态实心青绿色

### 后端变更（Spring Boot + JPA + MySQL）
- 扩展 `UserBasicProfile` 实体：新增身高、学历、感情状态、籍贯（省/市）、未来城市、未来规划标签、照片墙(JSON)、半身照URL、个人视频URL、主页背景图URL 字段
- 新增 `MediaAsset` 实体：通用媒体资源表（id, user_id, type[image|video|background], url, original_name, mime, size, width, height, status[pending|ready|failed], created_at），用于统一管理用户上传的图片/视频/背景图
- 新增 `MediaUploadController` + `MediaStorageService`：支持本地存储（开发）和 OSS 抽象（生产），单文件≤10MB，图片自动校验尺寸/格式，视频校验时长≤60s
- 扩展 `RecommendationController` 接收筛选参数：`heightMin/heightMax/educationLevel/relationshipStatus/hometownProvince/futureCity/keyword`，Real 服务按参数过滤；Mock 服务同步实现
- 扩展 `ProfileController`：新增 `PUT /api/profile/basic`（更新基本资料含新字段）、`POST /api/profile/background`（上传背景图）、`POST /api/profile/photos`（上传照片墙）、`POST /api/profile/video`（上传个人视频）
- 扩展 `CampusCertificationService`：返回 `verificationBadgeLevel`（none/school/email/idcard）用于前端徽章展示
- 新增 Flyway 迁移脚本：`V20260705xxxxxx__extend_user_basic_profile.sql` + `V20260705xxxxxx__create_media_asset.sql`
- 单元测试：每个新 Service 方法覆盖 happy path + 边界（文件过大/格式不支持/字段越界）

### 前端变更（uni-app + Vue 3 + Pinia）
- **H-07 筛选维度扩展**：寻觅页筛选 chip 改为可展开抽屉，支持身高滑块、学历多选、感情状态、籍贯省/市联动、未来城市、关键词搜索；接入 discoverStore.activeFilter 透传至 API
- **H-08 用户卡片大尺寸照片**：CardSwiper 卡片升级为顶部 4:5 大图 + 底部信息区，支持左右滑动切图（照片墙）；Likes 列表卡片改为横卡 80rpx 头像 + 缩略图入口
- **H-10 个人主页背景图**：profile 顶部支持点击上传背景图（uni.chooseImage + 上传至 /api/profile/background），未上传时使用品牌渐变 fallback
- **M-07 校园认证强化**：profile 与寻觅卡片显示认证徽章（school/email/idcard 三色），无认证时显示"去认证"CTA 按钮跳转 `/pages/campus/certification`
- **M-08 圈子→匹配跳转**：village/circles 帖子作者头像可点击跳转到对方 profile，"附近的人"快捷入口跳转 `/pages/discover/index`
- **M-09 onboard-top 修复**：排查 v-if 条件逻辑，确认 SocialOnboardingOverlay 在首次进入时正确渲染
- **M-11 视频上传/播放**：profile 新增"个人视频"区块（上传 + 预览 + 删除），CardSwiper 卡片右上角视频角标，点击进入全屏播放
- **M-16 搜索功能落地**：discoverStore.searchKeyword 透传至 API，前端防抖 300ms
- **L-02 emoji→SVG 图标**：将 📍👥🎂✨🔍🎤😊+ 等 emoji 替换为 `/static/assets/icons/*.svg`（已存在则直接引用，缺失则新增 SVG 资源）
- **L-06 签到粒子动画**：签到成功时触发心形粒子撒花（CSS 关键帧 + JS DOM 注入，不引入第三方库以兼容 mp-weixin）
- **B1.3 涟漪效果**：Button.vue 已有 Ripple.vue 组件，集成到主按钮（type=primary），点击坐标定位涟漪
- **B1.4 触觉反馈**：utils/haptic.ts 已有 lightHaptic，逐个 Button 调用点接入（不全局拦截以避免性能问题）

### 不在范围内（Out of Scope）
- C3.8 课表未认证引导卡片：用户明确要求课表无需认证，此项不适用，跳过
- 暗色模式完整适配
- 后端 OSS 实际接入（仅做抽象层，本地存储即可满足开发需求）
- 视频转码服务（仅做基础格式校验，不接入 FFmpeg）
- 推送通知/IM 长连接相关变更

## Impact
- **Affected specs**:
  - [2026-07-05-design-polish-to-reference](file:///d:/6/恋爱小程序/.trae/specs/2026-07-05-design-polish-to-reference/spec.md) - 视觉精修已完成，本 spec 在其之上叠加功能
- **Affected code（后端）**:
  - [apps/api/src/main/java/com/campuslove/api/entity/UserBasicProfile.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/UserBasicProfile.java) - 扩展字段
  - [apps/api/src/main/java/com/campuslove/api/entity/MediaAsset.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/MediaAsset.java) - 新建
  - [apps/api/src/main/java/com/campuslove/api/profile/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/profile/) - ProfileController/Service 扩展
  - [apps/api/src/main/java/com/campuslove/api/discover/RecommendationController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/discover/RecommendationController.java) - 筛选参数扩展
  - [apps/api/src/main/java/com/campuslove/api/media/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/media/) - 新建 MediaUploadController/Service
  - [apps/api/src/main/java/com/campuslove/api/campus/CampusCertificationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/campus/CampusCertificationService.java) - 徽章字段
  - Flyway 迁移脚本
- **Affected code（前端）**:
  - [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue) - 筛选扩展、搜索落地
  - [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue) - 背景图、视频、认证徽章
  - [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) - 筛选参数透传
  - [apps/client/src/services/api.ts](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) - 新 API 客户端方法
  - [apps/client/src/components/common/Button.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Button.vue) - 涟漪 + 触觉
  - [apps/client/src/components/social/SocialOnboardingOverlay.vue](file:///d:/6/恋爱小程序/apps/client/src/components/social/SocialOnboardingOverlay.vue) - v-if 修复
  - [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue) - 大图、视频角标（如不存在则新建）
  - 各 emoji 使用点 - 替换为 SVG
- **数据库迁移**: 2 个 Flyway 脚本，需在开发环境执行
- **API 契约**: 新增/扩展 6 个端点，需更新 [docs/openapi/users.yaml](file:///d:/6/恋爱小程序/docs/openapi/users.yaml) 和 [docs/openapi/recommendations.yaml](file:///d:/6/恋爱小程序/docs/openapi/recommendations.yaml)

## ADDED Requirements

### Requirement: 用户基本资料扩展字段
系统 SHALL 支持用户基本资料包含以下新增字段：身高(120-250cm)、学历(high_school/bachelor/master/phd)、感情状态(never/married_before/divorced/widowed)、籍贯省、籍贯市、未来城市、未来规划标签(JSON)、照片墙(JSON 数组)、半身照URL、个人视频URL、主页背景图URL。

#### Scenario: 用户首次填写扩展资料
- **WHEN** 用户进入资料设置页填写身高 175cm、学历 bachelor、感情状态 never
- **THEN** 数据持久化到 user_basic_profile 表，profile_completion 重新计算并 +15%

#### Scenario: 字段越界校验
- **WHEN** 用户提交身高 300cm
- **THEN** 返回 400 错误，提示"身高范围 120-250cm"

### Requirement: 媒体资源上传
系统 SHALL 提供 `POST /api/media/upload` 端点，支持 image(jpg/png/webp ≤10MB)、video(mp4/mov ≤50MB ≤60s) 上传，返回媒体 URL 和元信息。

#### Scenario: 上传图片成功
- **WHEN** 用户上传 2MB 的 jpg 图片
- **THEN** 文件保存到 `uploads/{userId}/{yyyyMM}/{uuid}.jpg`，返回 `{"url": "/uploads/...", "width": 1080, "height": 1350, "mime": "image/jpeg"}`

#### Scenario: 上传超大文件失败
- **WHEN** 用户上传 50MB 图片
- **THEN** 返回 413 错误，提示"文件大小超过限制"

### Requirement: 个人主页背景图
系统 SHALL 支持用户上传个人主页顶部背景图，URL 持久化到 user_basic_profile.profile_background_url。

#### Scenario: 上传背景图
- **WHEN** 用户在 profile 页点击背景图区域，选择图片上传
- **THEN** 图片通过 /api/profile/background 上传，URL 保存到数据库，前端立即渲染新背景

### Requirement: 照片墙展示
系统 SHALL 支持用户上传最多 6 张照片墙图片，并在 CardSwiper 卡片和 profile 页展示。

#### Scenario: 照片墙多图展示
- **WHEN** 推荐卡片渲染时，用户的照片墙有 3 张图
- **THEN** 卡片顶部显示主图 + 右下角分页指示器(1/3)，左右滑动切换图片

### Requirement: 个人视频
系统 SHALL 支持用户上传 1 个个人介绍视频(≤60s)，在 profile 页和 CardSwiper 卡片展示。

#### Scenario: 视频展示与播放
- **WHEN** 用户在 CardSwiper 卡片看到右上角视频角标
- **THEN** 点击角标进入全屏视频播放页，支持暂停/进度条/静音

### Requirement: 多维度筛选
系统 SHALL 支持寻觅页筛选维度：身高范围、学历、感情状态、籍贯省/市、未来城市、关键词。`GET /api/recommendations` 接受上述查询参数。

#### Scenario: 多维筛选
- **WHEN** 用户筛选"身高 170-185 / 学历本科及以上 / 籍贯浙江"
- **THEN** 返回符合全部条件的推荐用户列表，结果数 ≤ 50

### Requirement: 关键词搜索
系统 SHALL 支持按昵称、个人简介、兴趣标签模糊搜索用户。`GET /api/recommendations?keyword=xxx`。

#### Scenario: 关键词搜索
- **WHEN** 用户输入"摄影"
- **THEN** 返回 nickname/bio/interestTags 中包含"摄影"的用户列表

### Requirement: 校园认证徽章
系统 SHALL 返回认证徽章级别 `verificationBadgeLevel`，前端据此渲染不同颜色徽章。

#### Scenario: 三级徽章
- **WHEN** 用户完成学校认证
- **THEN** profile 和 CardSwiper 卡片显示绿色"已认证"徽章；仅完成邮箱认证显示蓝色徽章；未认证无徽章但显示"去认证"CTA

### Requirement: 圈子→匹配跳转
系统 SHALL 在 village/circles 帖子作者头像点击时跳转到对方 profile 页。

#### Scenario: 跳转
- **WHEN** 用户点击 village 帖子的作者头像
- **THEN** 跳转到 `/pages/profile/index?userId=xxx`，目标 profile 渲染对方资料

### Requirement: 签到粒子动画
系统 SHALL 在签到成功时触发心形粒子撒花动画，覆盖在签到卡片上方 1.5s 后消失。

#### Scenario: 签到成功动画
- **WHEN** 用户点击签到按钮，API 返回成功
- **THEN** 卡片上方注入 12 个心形粒子 DOM，从中心向四周抛物线扩散，1.5s 后 DOM 移除

### Requirement: Button 涟漪 + 触觉
系统 SHALL 在 Button(type=primary) 点击时触发涟漪动画和 lightHaptic 触觉反馈。

#### Scenario: 涟漪触发
- **WHEN** 用户点击主按钮
- **THEN** 点击坐标处出现圆形涟漪扩散(200ms)，同时触发 uni.vibrateShort(15ms)

## MODIFIED Requirements

### Requirement: 个人主页头部展示
头部区域 SHALL 优先渲染用户上传的背景图，无背景图时使用 `var(--c-gradient-brand)` 渐变 fallback。MatchCountChip 层级在背景图之上。

### Requirement: 寻觅页卡片展示
CardSwiper 卡片 SHALL 顶部显示 4:5 大尺寸照片（优先半身照，其次照片墙首图，最后头像），底部信息区显示昵称/年级/认证徽章/兴趣标签。

### Requirement: 筛选栏交互
寻觅页筛选 SHALL 改为顶部 chip 行 + 点击"全部筛选"展开抽屉，抽屉内包含身高滑块、学历多选、感情状态单选、籍贯省/市联动、未来城市选择、关键词输入。确认后 chip 行显示已选条件胶囊。

## REMOVED Requirements

### Requirement: 课表未认证引导卡片
**Reason**: 用户明确要求课表无需校园认证即可使用，前序 spec 已移除锁定逻辑，本 spec 不再添加认证引导
**Migration**: 课表页保持现状（无认证锁），用户直接进入课表功能

## 截图识别验收标准（强制）

### Requirement: 视觉再审计截图产出
系统 SHALL 在 Phase 0 产出至少 12 张 H5 当前状态截图，覆盖所有核心页面 + 子包页面。

#### Scenario: 截图产出
- **WHEN** Phase 0 完成
- **THEN** `.trae/screenshots/visual-reaudit-2026-07-05/` 目录包含 12+ 张 PNG 截图，命名规则 `{page}-{viewport}.png`

### Requirement: 视觉差距报告产出
系统 SHALL 产出 `visual-gap-report.md`，按页面分章节列出每页的视觉差距。

#### Scenario: 报告内容
- **WHEN** 审计完成
- **THEN** 报告包含每页的：参考图链接、当前截图链接、差距清单（颜色/间距/圆角/阴影/氛围感/层级 6 维度各 N 项）、严重程度评级

### Requirement: 最终截图识别验收
系统 SHALL 在所有改动完成后，重新截图 12+ 张，与参考图进行视觉比对，由人工/agent 识别确认视觉对齐度。

#### Scenario: 验收通过
- **WHEN** Phase H 完成
- **THEN** 重新截图保存到 `.trae/screenshots/final-verification-2026-07-05/`，每张截图与参考图比对，视觉对齐度 ≥ 85%（人工识别确认）
- **AND** 输出 `final-visual-verification.md`，包含每页的：最终截图、对齐度评分、残留问题清单（如有）

#### Scenario: 验收不通过
- **WHEN** 任一页面对齐度 < 85%
- **THEN** 创建新的修复任务，回到 Phase 1 重构，直至达到 85% 对齐度
