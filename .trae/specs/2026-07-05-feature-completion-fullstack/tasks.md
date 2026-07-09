# 恋爱小程序 · 全栈功能补全 + 视觉再对齐 - Implementation Tasks

## Phase 0: 视觉再审计（截图识别 + 参考比对）

### [x] Task 0.1: H5 开发环境启动 + 服务器就绪
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 启动后端 API 服务：`cd apps/api && mvnw spring-boot:run`（或使用 mock 模式 `application-mock.yml`）
  - 启动前端 H5 开发服务器：`cd apps/client && pnpm dev:h5`（端口 5173-5175）
  - 浏览器访问 `http://localhost:5173/` 确认页面可正常加载
  - 准备 agent-browser 工具用于截图
- **Acceptance Criteria**: H5 服务器可访问，无启动错误
- **Test Requirements**:
  - `programmatic` TR-0.1.1: curl http://localhost:5173/ 返回 200
  - `programmatic` TR-0.1.2: 控制台无 JS 错误

### [x] Task 0.2: 系统性截图 12+ 张核心页面
- **Priority**: high
- **Depends On**: 0.1
- **Description**:
  - 使用 agent-browser（iPhone 14 viewport 390x844）依次访问并截图：
    - 01-login.png: 登录页 `/pages/login/index`
    - 02-home.png: 首页 `/pages/home/index`
    - 03-discover.png: 寻觅页 `/pages/discover/index`
    - 04-likes.png: 喜欢页 `/pages/likes/index`
    - 05-messages.png: 消息列表 `/pages/chat/index`
    - 06-chat-session.png: 聊天会话 `/pages/chat-session/index`
    - 07-village.png: 村口（圈子）`/pages/village/index`
    - 08-profile.png: 我的页 `/pages/profile/index`
    - 09-schedule.png: 课表 `/subpackages/setup/schedule/index`
    - 10-certification.png: 校园认证 `/pages/campus/certification`
    - 11-daily-question.png: 每日一问 `/pages/daily-question/index`
    - 12-circles.png: 圈子广场 `/pages/circles/index`
  - 截图保存到 `.trae/screenshots/visual-reaudit-2026-07-05/`
  - 每张截图需 full-page（包含完整滚动内容）
- **Acceptance Criteria**: 12+ 张截图生成，无空白/错误页
- **Test Requirements**:
  - `programmatic` TR-0.2.1: 12 张 PNG 文件存在且非空（>10KB）
  - `human-judgement` TR-0.2.2: 每张截图内容正确（页面正常渲染）

### [x] Task 0.3: 与参考图逐项比对 + 输出差距报告
- **Priority**: high
- **Depends On**: 0.2
- **Description**:
  - 对照参考图（位于项目根目录）：
    - [ChatGPT Image 2026年5月17日 14_53_26.png](file:///d:/6/恋爱小程序/ChatGPT%20Image%202026%E5%B9%B45%E6%9C%8817%E6%97%A5%2014_53_26.png) — 浅色主题总览
    - [ChatGPT Image 2026年5月17日 14_57_30.png](file:///d:/6/恋爱小程序/ChatGPT%20Image%202026%E5%B9%B45%E6%9C%8817%E6%97%A5%2014_57_30.png) — 深色主题总览
    - [ChatGPT Image 2026年5月17日 14_57_50.png](file:///d:/6/恋爱小程序/ChatGPT%20Image%202026%E5%B9%B45%E6%9C%8817%E6%97%A5%2014_57_50.png) — 单屏首页大图
    - [ref_img.png](file:///d:/6/恋爱小程序/ref_img.png)
  - 参考 [docs/design-reference-analysis.md](file:///d:/6/恋爱小程序/docs/design-reference-analysis.md) 中梳理的设计语言（§2.1 颜色规范、§2.2 布局规则、§2.3 组件样式、§2.4 文字排版、§2.5 图标风格、§2.6 6 大易错点）
  - 输出 `.trae/specs/2026-07-05-feature-completion-fullstack/visual-gap-report.md`，按页面分章节，每页包含：
    - 参考图链接
    - 当前截图链接
    - 差距清单，按 6 维度分类：
      - **颜色**: 与参考色值偏差（如 #3FCF8E vs 实际渲染）
      - **间距**: 非标准档位（4/8/12/16/24/32/48 外的值）
      - **圆角**: 不符合 4/8/12/16/24/9999 档位
      - **阴影**: 卡片边缘色/阴影缺失或过弱
      - **氛围感**: 半透明/渐变/模糊/柔光等氛围元素缺失
      - **层级**: 视觉权重失衡、信息层级不清晰
    - 严重程度评级（critical/high/medium/low）
  - 输出 `.trae/specs/2026-07-05-feature-completion-fullstack/visual-fix-checklist.md`，每项差距对应一个修复任务
- **Acceptance Criteria**: 报告产出完整，覆盖 12+ 页面
- **Test Requirements**:
  - `human-judgement` TR-0.3.1: 报告覆盖全部 12+ 页面
  - `human-judgement` TR-0.3.2: 每页至少识别 3 个差距点
  - `human-judgement` TR-0.3.3: 严重程度评级合理

---

## Phase 1: 视觉重构（基于审计结果）

### [x] Task 1.1: Design Token 偏差修正
- **Priority**: high
- **Depends On**: 0.3
- **Description**:
  - 根据 `visual-gap-report.md` 中识别的颜色偏差，修正 [design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss)：
    - 校准青藤绿 `#3FCF8E` / `#2DB97A` 完整色阶
    - 校准 VIP 暖金棕 `#C9A36A → #E8C98A` 渐变角度为 12°
    - 校准价格红 `#E5454D`
    - 校准状态徽章三色：薄荷绿 `#7CD9A6/#1A7A4A`、琥珀黄 `#FFD479/#8A5A00`、蓝紫 `#B7C4FF/#3B47B7`
    - 校准文本三色：主 `#1F2329` / 次 `#5B6470` / 辅 `#9AA1AB`
    - 校准中性色：浅 `#F4F6FA`、深 `#0E1116`、卡片白/灰
  - 校准圆角档位：xs:4/sm:8/md:12/lg:16/xl:24/full:9999 严格统一
  - 校准间距档位：sp-1(4)/sp-2(8)/sp-3(12)/sp-4(16)/sp-6(24)/sp-8(32)/sp-10(48) 六档
  - 校准阴影：`--s-card-soft: 0 1px 2px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.04)`、`--s-modal: 0 24px 60px rgba(15,23,42,.18)`
- **Acceptance Criteria**: Token 值与参考图一致（误差 ±2%）
- **Test Requirements**:
  - `programmatic` TR-1.1.1: design-variables.scss 色值与参考一致
  - `programmatic` TR-1.1.2: 圆角档位完整 6 档
  - `programmatic` TR-1.1.3: 间距档位完整 6 档

### [x] Task 1.2: 氛围感元素重构
- **Priority**: high
- **Depends On**: 1.1
- **Description**:
  - **登录页重构**：[login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue)
    - 实景图占 70% 高度，按钮区占 30%
    - 主标题 28/Bold，副标 14/Regular
    - 主按钮（微信登录）青绿实心 + 微信图标
    - 次按钮（手机号登录）白底描边
  - **锁屏页重构**：[SocialOnboardingOverlay.vue](file:///d:/6/恋爱小程序/apps/client/src/components/social/SocialOnboardingOverlay.vue)
    - 三个模糊头像使用 `filter: blur(8rpx) opacity(0.6)` 营造若隐若现
    - 半透明渐变叠加 `linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,245,247,0.9) 100%)`
    - 心动氛围元素：浮动小心形（CSS 动画）
  - **VIP 横幅重构**：[profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
    - 暖金渐变 `linear-gradient(12deg, #C9A36A 0%, #E8C98A 100%)`
    - 深色卡片底 + 白字
    - 立即续费按钮白描边
  - **寻觅页氛围背景**：[discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
    - 浪漫粉绿渐变 `linear-gradient(180deg, #FFF5F7 0%, #E8F8F0 50%, #F4F6FA 100%)`
    - 卡片轻微高斯模糊背景层
- **Acceptance Criteria**: 氛围感元素视觉到位
- **Test Requirements**:
  - `human-judgement` TR-1.2.1: 登录页 70/30 比例正确
  - `human-judgement` TR-1.2.2: 锁屏页模糊头像若隐若现
  - `human-judgement` TR-1.2.3: VIP 横幅暖金渐变质感高级
  - `human-judgement` TR-1.2.4: 寻觅页浪漫渐变背景

### [x] Task 1.3: 卡片质感与间距韵律重构
- **Priority**: high
- **Depends On**: 1.1
- **Description**:
  - [Card.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Card.vue) 严格对齐：
    - 圆角 `--r-lg: 16rpx`
    - 边缘色 `1rpx solid var(--c-border-card)`
    - 软阴影 `var(--s-card-soft)`
    - 内边距 `--sp-4: 16rpx`
    - hover/active 态阴影提升
  - 全页面间距统一为 6 档（4/8/12/16/24/32/48rpx）
  - grep 检查非标准间距（6rpx/14rpx/20rpx/28rpx 等）并替换
  - 卡片之间 12rpx 间距、模块之间 24rpx 间距
- **Acceptance Criteria**: 间距韵律统一，无非标准值
- **Test Requirements**:
  - `programmatic` TR-1.3.1: grep 业务组件中 `margin:\s*\d+rpx` 非标准值数量为 0
  - `programmatic` TR-1.3.2: grep 业务组件中 `padding:\s*\d+rpx` 非标准值数量为 0
  - `human-judgement` TR-1.3.3: 卡片边缘色/阴影清晰可见

### [x] Task 1.4: 状态徽章 + 课程色块重构
- **Priority**: medium
- **Depends On**: 1.1
- **Description**:
  - [Tag.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Tag.vue) 状态徽章三色严格对齐参考：
    - signup: 薄荷绿浅底 `#7CD9A6` + 深字 `#1A7A4A`
    - ongoing: 琥珀黄浅底 `#FFD479` + 深字 `#8A5A00`
    - preview: 蓝紫浅底 `#B7C4FF` + 深字 `#3B47B7`
    - 高度 18rpx，圆角 4rpx，字号 10/Medium
  - 课程色块：饱和度 ≤ 20%，明度 ≈ 92%
    - mint: `#DCEFE2`
    - blue: `#DCE6F2`
    - purple: `#E8DCEF`
    - apricot: `#F2E8DC`
    - green: `#DCEFDC`
    - pink: `#EFDCE8`
  - 在 [home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue) 校园圈活动卡片状态徽章、课表空闲模块应用新色值
- **Acceptance Criteria**: 状态徽章和课程色块视觉与参考一致
- **Test Requirements**:
  - `human-judgement` TR-1.4.1: 三色徽章正确
  - `human-judgement` TR-1.4.2: 课程色块低饱和统一
  - `programmatic` TR-1.4.3: 色值与参考一致

### [x] Task 1.5: TabBar + 图标重构
- **Priority**: medium
- **Depends On**: 1.1
- **Description**:
  - [TabBar.vue](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue) + [custom-tab-bar/index.wxss](file:///d:/6/恋爱小程序/apps/client/src/custom-tab-bar/index.wxss)：
    - 高度 49px + 安全区
    - 5 枚图标线性 1.5px 描边风格
    - 激活态实心青绿色 + 文字主色
    - 非激活态灰色 `#9AA1AB`
    - 文字 10/Medium
  - emoji 全替换为 SVG（详见 Task F3）
- **Acceptance Criteria**: TabBar 视觉对齐参考
- **Test Requirements**:
  - `human-judgement` TR-1.5.1: TabBar 激活态对比明显
  - `programmatic` TR-1.5.2: 图标使用 SVG 而非 emoji
  - `programmatic` TR-1.5.3: 无 :hover 伪类

---

## Phase A: 后端基础设施（数据模型 + 上传服务）

### [x] Task A1: UserBasicProfile 实体扩展 + Flyway 迁移
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 [UserBasicProfile.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/UserBasicProfile.java) 新增字段：
    - `Integer height` (120-250)
    - `String educationLevel` (high_school/bachelor/master/phd, length=16)
    - `String relationshipStatus` (never/married_before/divorced/widowed, length=16)
    - `String hometownProvince` (length=32)
    - `String hometownCity` (length=32)
    - `String futureCity` (length=32)
    - `String futurePlanTags` (JSON 数组, columnDefinition="JSON DEFAULT '[]'")
    - `String photoGallery` (JSON 数组, 默认 '[]')
    - `String halfBodyPhotoUrl` (length=512)
    - `String personalVideoUrl` (length=512)
    - `String profileBackgroundUrl` (length=512)
  - 新增 Flyway 脚本 `V2026070501001__extend_user_basic_profile.sql`，包含 ALTER TABLE 添加上述列
  - 同步更新 [UserBasicProfileRepository.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/repository/UserBasicProfileRepository.java) 如有需要
- **Acceptance Criteria**: 启动 api 服务，Flyway 自动执行迁移，数据库表字段新增成功
- **Test Requirements**:
  - `programmatic` TR-A1.1: 实体类编译通过
  - `programmatic` TR-A1.2: Flyway 脚本语法正确，可重复执行（idempotent）
  - `programmatic` TR-A1.3: 单元测试覆盖 getter/setter

### [x] Task A2: MediaAsset 实体 + Repository + Flyway 迁移
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新建 [MediaAsset.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/MediaAsset.java) 实体：
    - `Long id` (主键)
    - `Long userId` (索引)
    - `String type` (image/video/background, length=16)
    - `String url` (length=512)
    - `String originalName` (length=255)
    - `String mime` (length=64)
    - `Long size` (字节)
    - `Integer width`
    - `Integer height`
    - `Integer durationMs` (视频时长，毫秒)
    - `String status` (pending/ready/failed, length=16)
    - `LocalDateTime createdAt`
  - 新建 [MediaAssetRepository.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/repository/MediaAssetRepository.java) 接口，提供 `findByUserIdAndType`、`findByUserIdOrderByCreatedAtDesc` 方法
  - 新建 Flyway 脚本 `V2026070501002__create_media_asset.sql`
- **Acceptance Criteria**: 实体和 Repository 编译通过，表创建成功
- **Test Requirements**:
  - `programmatic` TR-A2.1: 实体类编译通过
  - `programmatic` TR-A2.2: Repository 接口方法签名正确

### [x] Task A3: MediaStorageService + MediaUploadController
- **Priority**: high
- **Depends On**: A2
- **Description**:
  - 新建 [MediaStorageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/media/MediaStorageService.java) 接口：
    - `UploadResult store(Long userId, MultipartFile file, String type)` 上传文件，返回 url + 元信息
  - 新建 [LocalMediaStorageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java) 实现：
    - 存储路径：`./uploads/{userId}/{yyyyMM}/{uuid}.{ext}`
    - 校验：图片 jpg/png/webp ≤10MB；视频 mp4/mov ≤50MB ≤60s
    - 图片元信息使用 javax.imageio.ImageIO 读取宽高
    - 视频时长通过文件头基础校验（不引入 FFmpeg，仅做大小/格式校验，时长由前端记录后传入）
  - 新建 [MediaUploadController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/media/MediaUploadController.java)：
    - `POST /api/media/upload` 接收 `MultipartFile file, String type`，返回 `UploadResult{url, width, height, mime, size, durationMs}`
  - 配置 [application.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application.yml) 添加 `spring.servlet.multipart.max-file-size=50MB`、`max-request-size=50MB`
  - 配置静态资源映射：`/uploads/**` → `file:./uploads/`
  - 在 [SecurityConfig.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java) 中放行 `/uploads/**` 和 `/api/media/upload`（需认证）
- **Acceptance Criteria**: curl 上传图片返回 200 + URL，访问 URL 可获取图片
- **Test Requirements**:
  - `programmatic` TR-A3.1: 上传 jpg 返回 200，url 可访问
  - `programmatic` TR-A3.2: 上传 50MB+ 文件返回 413
  - `programmatic` TR-A3.3: 上传 .exe 文件返回 400
  - `programmatic` TR-A3.4: MediaAsset 表有记录

---

## Phase B: 后端 Profile/Recommendation/Certification 扩展

### [x] Task B1: ProfileController 扩展（基本资料 + 媒体绑定）
- **Priority**: high
- **Depends On**: A1, A3
- **Description**:
  - 扩展 [ProfileController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/profile/ProfileController.java)：
    - `PUT /api/profile/basic` 接收 `UpdateBasicProfileRequest{height, educationLevel, relationshipStatus, hometownProvince, hometownCity, futureCity, futurePlanTags[]}`，校验字段范围，更新 UserBasicProfile，重新计算 profileCompletion
    - `POST /api/profile/background` 接收 `MultipartFile`，调用 MediaStorageService 上传，更新 profileBackgroundUrl
    - `POST /api/profile/photos` 接收 `MultipartFile` + `index(0-5)`，上传后追加到 photoGallery，超过 6 张返回 400
    - `DELETE /api/profile/photos/{index}` 删除指定索引的照片
    - `POST /api/profile/video` 接收 `MultipartFile`，校验视频，更新 personalVideoUrl
    - `POST /api/profile/half-body` 接收 `MultipartFile`，更新 halfBodyPhotoUrl
  - 同步扩展 [MockProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/profile/MockProfileService.java) 和 [RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/profile/RealProfileService.java)
  - Profile 查询响应中包含所有新字段
- **Acceptance Criteria**: 各端点 curl 测试通过，数据持久化正确
- **Test Requirements**:
  - `programmatic` TR-B1.1: PUT /api/profile/basic 更新成功，profileCompletion 重算
  - `programmatic` TR-B1.2: POST /api/profile/background 返回 url，DB 字段更新
  - `programmatic` TR-B1.3: POST /api/profile/photos 第 7 张返回 400
  - `programmatic` TR-B1.4: 字段越界返回 400 + 错误信息

### [x] Task B2: RecommendationController 筛选参数扩展
- **Priority**: high
- **Depends On**: A1
- **Description**:
  - 扩展 [RecommendationController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/discover/RecommendationController.java)：
    - `GET /api/recommendations` 接受新查询参数：
      - `heightMin`, `heightMax` (Integer)
      - `educationLevel` (逗号分隔多选)
      - `relationshipStatus` (逗号分隔多选)
      - `hometownProvince`, `hometownCity`
      - `futureCity`
      - `keyword` (模糊匹配 nickname/bio/interestTags)
  - [RealRecommendationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/discover/RealRecommendationService.java) 实现过滤逻辑（JPA Specification 或 @Query）
  - [MockRecommendationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/discover/MockRecommendationService.java) 同步实现，从 mock 数据中按条件过滤
  - 推荐 View 中包含新字段（height, educationLevel, photoGallery, halfBodyPhotoUrl, personalVideoUrl, verificationBadgeLevel）
- **Acceptance Criteria**: curl 带筛选参数调用，返回结果符合过滤条件
- **Test Requirements**:
  - `programmatic` TR-B2.1: heightMin=170&heightMax=185 返回用户身高均在范围内
  - `programmatic` TR-B2.2: educationLevel=bachelor,master 返回学历符合
  - `programmatic` TR-B2.3: keyword=摄影 返回 nickname/bio 含"摄影"的用户
  - `programmatic` TR-B2.4: 无参数时返回全部（向后兼容）

### [ ] Task B3: CampusCertificationService 徽章级别
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 扩展 [CampusCertificationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/campus/CampusCertificationService.java) 接口，新增 `String getVerificationBadgeLevel(Long userId)` 方法
  - 实现类 [RealCampusCertificationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/campus/RealCampusCertificationService.java) 和 [MockCampusCertificationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/campus/MockCampusCertificationService.java) 实现：
    - 校园认证通过 → "school"
    - 仅邮箱认证 → "email"
    - 仅身份证认证 → "idcard"
    - 均未认证 → "none"
  - 在 Recommendation View 和 Profile View 中包含 verificationBadgeLevel 字段
- **Acceptance Criteria**: API 返回的 View 包含 verificationBadgeLevel
- **Test Requirements**:
  - `programmatic` TR-B3.1: 已认证用户返回 "school"
  - `programmatic` TR-B3.2: 未认证用户返回 "none"

### [x] Task B4: 后端单元测试
- **Priority**: high
- **Depends On**: A3, B1, B2, B3
- **Description**:
  - 为每个新 Service 方法编写单元测试：
    - `MediaStorageServiceTest`: 上传成功/失败/格式不支持
    - `ProfileServiceTest`: 更新基本资料/上传背景图/照片墙越界
    - `RecommendationServiceTest`: 各筛选维度组合
    - `CampusCertificationServiceTest`: 徽章级别判定
  - 使用 JUnit 5 + Mockito，Mock Repository
  - 测试覆盖率 ≥ 80%（新代码）
- **Acceptance Criteria**: `mvn test` 全部通过
- **Test Requirements**:
  - `programmatic` TR-B4.1: 所有新测试通过
  - `programmatic` TR-B4.2: 既有测试无回归失败

---

## Phase C: 前端 API 客户端 + Store 扩展

### [x] Task C1: API 客户端新增方法
- **Priority**: high
- **Depends On**: B1, B2, B3
- **Description**:
  - 在 [api.ts](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) 新增方法：
    - `updateBasicProfile(data: UpdateBasicProfileRequest): Promise<void>`
    - `uploadProfileBackground(file: File): Promise<{url: string}>`
    - `uploadProfilePhoto(file: File, index: number): Promise<{url: string}>`
    - `deleteProfilePhoto(index: number): Promise<void>`
    - `uploadProfileVideo(file: File): Promise<{url: string}>`
    - `uploadProfileHalfBody(file: File): Promise<{url: string}>`
    - `getRecommendations(filter: RecommendationFilter): Promise<RecommendedPerson[]>`（扩展 filter 类型）
  - 更新 [api-types.ts](file:///d:/6/恋爱小程序/apps/client/src/services/generated/api-types.ts) 中相关类型定义
  - 在 mock 模式下，[mocks/fixtures.ts](file:///d:/6/恋爱小程序/apps/client/src/services/mocks/fixtures.ts) 提供包含新字段的测试数据
- **Acceptance Criteria**: 类型定义编译通过，mock 模式调用返回正确数据
- **Test Requirements**:
  - `programmatic` TR-C1.1: TypeScript 编译无错误
  - `programmatic` TR-C1.2: mock 模式调用返回新字段
  - `programmatic` TR-C1.3: 真实模式 API 路径正确

### [x] Task C2: discoverStore 扩展（筛选 + 搜索）
- **Priority**: high
- **Depends On**: C1
- **Description**:
  - 扩展 [discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts)：
    - `activeFilter` 状态类型扩展为 `RecommendationFilter`（含 heightMin/heightMax/educationLevel[]/relationshipStatus[]/hometownProvince/hometownCity/futureCity）
    - `searchKeyword` 状态已有，确认 300ms 防抖
    - `fetchCards()` 调用 `getRecommendations(activeFilter)` 透传筛选参数 + keyword
    - 新增 `resetFilter()` 重置所有筛选
    - 新增 `isFilterDrawerOpen` 状态控制抽屉显隐
- **Acceptance Criteria**: Store 状态正确，fetchCards 透传参数
- **Test Requirements**:
  - `programmatic` TR-C2.1: discover.spec.ts 更新断言新状态
  - `programmatic` TR-C2.2: fetchCards 调用 API 时参数包含筛选
  - `programmatic` TR-C2.3: resetFilter 清空所有字段

---

## Phase D: 前端 UI - 寻觅页（筛选 + 卡片 + 视频 + 搜索）

### [x] Task D1: 筛选抽屉组件（H-07 + M-16）
- **Priority**: high
- **Depends On**: C2
- **Description**:
  - 新建 [FilterDrawer.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/FilterDrawer.vue) 组件：
    - 顶部"全部筛选"标题 + 关闭按钮
    - 身高滑块（双滑块 120-250cm，使用 uni.move-view 或自实现）
    - 学历多选 chip 组（高中/本科/硕士/博士）
    - 感情状态单选 chip 组（未婚/离异/丧偶）
    - 籍贯省/市联动 picker（使用 uni-picker 或 @vue/runtime-core 自实现级联）
    - 未来城市 picker
    - 关键词输入框（带 300ms 防抖，触发 fetchCards）
    - 底部"重置"和"确认"按钮
  - 修改 [discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)：
    - 顶部 chip 行保留常用快捷筛选（附近/不限/年龄）
    - 新增"全部筛选"chip 触发 FilterDrawer 展开抽屉
    - 抽屉确认后，chip 行显示已选条件胶囊（如"170-185cm × "可删除）
  - 遵循 design tokens，无硬编码
- **Acceptance Criteria**: 抽屉展开/关闭流畅，筛选生效后推荐列表更新
- **Test Requirements**:
  - `human-judgement` TR-D1.1: 抽屉动画流畅
  - `human-judgement` TR-D1.2: 筛选确认后列表过滤正确
  - `programmatic` TR-D1.3: 无硬编码色值/字号
  - `programmatic` TR-D1.4: mp-weixin 编译无 :hover 警告

### [x] Task D2: CardSwiper 大尺寸照片 + 视频角标（H-08 + M-11）
- **Priority**: high
- **Depends On**: C2
- **Description**:
  - 修改或新建 [CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue)（如已存在则重构）：
    - 卡片结构：顶部 4:5 大图区（占卡片高度 60%）+ 底部信息区（40%）
    - 大图源优先级：halfBodyPhotoUrl → photoGallery[0] → avatarUrl
    - 照片墙多图：右下角分页指示器(1/3)，左右滑动切图（uni-swiper 或自实现 touch 事件）
    - 视频角标：右上角播放图标，仅当 personalVideoUrl 存在时显示
    - 信息区：昵称/年级/认证徽章/兴趣标签/"打个招呼"按钮
    - 卡片圆角 --r-xl(24rpx)，品牌阴影，激活态 scale(1.02)
  - 点击视频角标跳转 `/pages/discover/video-player?url=xxx`
  - 新建 [video-player.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/video-player.vue) 全屏视频播放页：
    - 使用 `<video>` 标签，controls 显示，支持暂停/进度条/全屏
    - 顶部返回按钮
- **Acceptance Criteria**: 卡片视觉对齐参考，视频可点击播放
- **Test Requirements**:
  - `human-judgement` TR-D2.1: 卡片大图清晰展示
  - `human-judgement` TR-D2.2: 照片墙左右滑动切换
  - `human-judgement` TR-D2.3: 视频角标点击进入播放页
  - `programmatic` TR-D2.4: 使用 design tokens
  - `programmatic` TR-D2.5: 无 :hover 伪类

### [x] Task D3: 认证徽章组件（M-07）
- **Priority**: medium
- **Depends On**: C1
- **Description**:
  - 新建 [VerificationBadge.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/VerificationBadge.vue) 组件：
    - props: `level` (none/school/email/idcard), `size` (sm/md)
    - school: 绿色描边圆角胶囊 + ✓ 图标 + "已认证"
    - email: 蓝色描边 + 邮件图标 + "邮箱认证"
    - idcard: 橙色描边 + 身份证图标 + "实名认证"
    - none: 不渲染（或显示"去认证"CTA 按钮，emit click 事件）
  - 在 CardSwiper 卡片信息区、Likes 卡片、profile 头部使用此组件
- **Acceptance Criteria**: 各级徽章视觉清晰，"去认证"CTA 可点击跳转
- **Test Requirements**:
  - `human-judgement` TR-D3.1: 三色徽章正确显示
  - `programmatic` TR-D3.2: 使用 design tokens
  - `programmatic` TR-D3.3: 无认证时点击 CTA 跳转 /pages/campus/certification

---

## Phase E: 前端 UI - 个人主页（背景图 + 视频 + 照片墙）

### [x] Task E1: profile 顶部背景图上传（H-10）
- **Priority**: high
- **Depends On**: C1
- **Description**:
  - 修改 [profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)：
    - 顶部背景区域：优先渲染 `profileBackgroundUrl`，无值时使用 `var(--c-gradient-brand)` fallback
    - 背景图右下角"编辑背景图"按钮（相机图标）
    - 点击触发 `uni.chooseImage({count: 1, sizeType: ['compressed']})` → 调用 `uploadProfileBackground(file)` → 更新本地状态
    - 上传中显示 loading + 进度
    - 头像层级在背景图之上（z-index）
    - MatchCountChip 层级在背景图之上
- **Acceptance Criteria**: 上传后背景图立即显示，刷新后仍保留
- **Test Requirements**:
  - `human-judgement` TR-E1.1: 背景图上传后立即渲染
  - `human-judgement` TR-E1.2: 无背景图时使用渐变 fallback
  - `human-judgement` TR-E1.3: 头像和 MatchCountChip 层级正确
  - `programmatic` TR-E1.4: 使用 design tokens

### [x] Task E2: profile 个人视频区块（M-11）
- **Priority**: medium
- **Depends On**: C1
- **Description**:
  - 修改 [profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)：
    - 在数据统计下方新增"个人视频"区块
    - 未上传：显示"上传个人视频"CTA + 提示文案"≤60s，展示真实的你"
    - 已上传：视频缩略图 + 播放图标 + 删除按钮
    - 点击播放跳转 `/pages/discover/video-player?url=xxx`
    - 点击删除调用 `uploadProfileVideo` 接口删除（或新增 deleteProfileVideo API）
  - 上传流程：`uni.chooseVideo({maxDuration: 60, sourceType: ['album'], camera: 'back'})` → 上传
- **Acceptance Criteria**: 视频上传/播放/删除流程完整
- **Test Requirements**:
  - `human-judgement` TR-E2.1: 上传后缩略图正确显示
  - `human-judgement` TR-E2.2: 播放页可正常播放
  - `human-judgement` TR-E2.3: 删除后区块恢复 CTA 状态

### [x] Task E3: profile 照片墙管理（H-08 补充）
- **Priority**: medium
- **Depends On**: C1
- **Description**:
  - 修改 [profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)：
    - 在个人视频下方新增"照片墙"区块
    - 3x2 网格（最多 6 张）
    - 已上传的格子显示图片 + 长按删除
    - 空格子显示"+"占位，点击上传
    - 上传调用 `uploadProfilePhoto(file, index)`
  - 拖拽排序暂不实现（mp-weixin 限制）
- **Acceptance Criteria**: 照片墙上传/删除/展示正确
- **Test Requirements**:
  - `human-judgement` TR-E3.1: 6 格正确显示
  - `human-judgement` TR-E3.2: 上传/删除流畅
  - `programmatic` TR-E3.3: 使用 design tokens

### [x] Task E4: profile 认证徽章 + 基本资料编辑入口（M-07）
- **Priority**: medium
- **Depends On**: D3
- **Description**:
  - 修改 [profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)：
    - 昵称旁添加 `<VerificationBadge :level="verificationBadgeLevel" />`
    - 无认证时显示"去认证"按钮，跳转 `/pages/campus/certification`
    - 新增"编辑资料"入口（已有按钮）跳转到 setup/profile 子包页
  - 修改 [subpackages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/setup/profile/index.vue)：
    - 新增身高、学历、感情状态、籍贯、未来城市、未来规划标签表单项
    - 提交调用 `updateBasicProfile(data)`
    - 移除"第一版尽量简短"文案（前序已移除，再次校验）
- **Acceptance Criteria**: 表单提交后数据持久化，profile 页正确显示
- **Test Requirements**:
  - `human-judgement` TR-E4.1: 徽章正确显示在昵称旁
  - `human-judgement` TR-E4.2: 表单填写后提交成功
  - `programmatic` TR-E4.3: 无"第一版"文案残留

---

## Phase F: 前端 UI - 圈子跳转 + Onboarding 修复 + emoji 替换

### [x] Task F1: 圈子→匹配/Profile 跳转（M-08）
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 修改 [village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)、[circles/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/circles/index.vue)：
    - 帖子作者头像绑定 `@tap` 事件，跳转 `/pages/profile/index?userId={authorId}`
    - 新增"附近的人"快捷入口卡片，跳转 `/pages/discover/index`
  - 修改 [profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)：
    - 支持 `userId` 查询参数，加载对方 profile 数据
    - 自己的 profile 显示编辑按钮，对方的 profile 显示"打个招呼"按钮
- **Acceptance Criteria**: 跳转路径正确，对方 profile 数据正确渲染
- **Test Requirements**:
  - `human-judgement` TR-F1.1: 帖子头像点击跳转正确
  - `human-judgement` TR-F1.2: 对方 profile 显示打招呼按钮
  - `programmatic` TR-F1.3: 使用 design tokens

### [x] Task F2: SocialOnboardingOverlay v-if 修复（M-09）
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 排查 [SocialOnboardingOverlay.vue](file:///d:/6/恋爱小程序/apps/client/src/components/social/SocialOnboardingOverlay.vue) 的渲染条件：
    - 确认 `v-if` 绑定的状态（可能是 socialProgressStore.showOnboarding）
    - 确认 store 状态在首次进入时正确初始化
    - 确认 z-index 高于其他元素
    - 确认 .onboard-top 内的步骤条（1/6）和"跳过"按钮正确渲染
  - 必要时调整 [social-progress.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/social-progress.ts) 的初始状态
  - 在 H5 和 mp-weixin 双端验证
- **Acceptance Criteria**: 首次进入时引导层正确显示
- **Test Requirements**:
  - `human-judgement` TR-F2.1: 首次进入显示引导
  - `human-judgement` TR-F2.2: 步骤条 1/6 可见
  - `human-judgement` TR-F2.3: 跳过按钮可点击关闭
  - `human-judgement` TR-F2.4: 二次进入不再显示（除非 reset）

### [x] Task F3: emoji 替换为 SVG 图标（L-02）
- **Priority**: low
- **Depends On**: None
- **Description**:
  - 全项目 grep 搜索 emoji 字符：📍👥🎂✨🔍🎤😊+❤️💬🔖 等
  - 替换为 `<image src="/static/assets/icons/{name}.svg" />` 引用
  - 缺失的 SVG 资源新增到 [static/assets/icons/](file:///d:/6/恋爱小程序/apps/client/src/static/assets/icons/) 目录：
    - location.svg（📍）
    - group.svg（👥）
    - cake.svg（🎂）
    - sparkles.svg（✨）
    - search.svg（🔍）
    - microphone.svg（🎤）
    - smile.svg（😊）
    - plus.svg（+）
    - heart.svg（❤️）
    - chat.svg（💬）
    - bookmark.svg（🔖）
  - SVG 使用 currentColor 以支持主题色
  - 涉及文件：[discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)、[home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)、[village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue) 等
- **Acceptance Criteria**: emoji 字符在 UI 中消失，SVG 图标正确渲染
- **Test Requirements**:
  - `programmatic` TR-F3.1: grep 业务组件中 emoji 字符数量为 0
  - `human-judgement` TR-F3.2: SVG 图标视觉清晰
  - `programmatic` TR-F3.3: SVG 文件存在且非空

---

## Phase G: 前端 UI - 签到粒子 + Button 涟漪触觉

### [x] Task G1: 签到粒子撒花动画（L-06）
- **Priority**: low
- **Depends On**: None
- **Description**:
  - 新建 [HeartParticles.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/HeartParticles.vue) 组件：
    - props: `visible` (Boolean)
    - 12 个心形粒子，CSS 关键帧动画从中心向四周抛物线扩散
    - 1.5s 后自动 emit `done` 事件
    - 使用 CSS transform + opacity，不引入第三方库
    - 心形使用 SVG path 或 ❤️ unicode（兼容 mp-weixin）
  - 修改 [discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)：
    - 签到成功回调中，设置 `showParticles = true`
    - 模板中加入 `<HeartParticles :visible="showParticles" @done="showParticles = false" />`
    - 粒子覆盖在签到卡片上方（z-index 高）
- **Acceptance Criteria**: 签到成功时粒子动画流畅播放
- **Test Requirements**:
  - `human-judgement` TR-G1.1: 签到成功触发粒子动画
  - `human-judgement` TR-G1.2: 1.5s 后粒子消失
  - `programmatic` TR-G1.3: mp-weixin 编译无警告

### [x] Task G2: Button 涟漪 + 触觉反馈（B1.3 + B1.4）
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 修改 [Button.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Button.vue)：
    - 引入已有 [Ripple.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Ripple.vue) 组件
    - `type=primary` 时点击事件中：
      - 计算点击坐标（相对按钮）
      - 触发 Ripple 涟漪扩散（200ms）
      - 调用 `lightHaptic()` 触觉反馈
    - 次按钮可选开启涟漪（prop `ripple`）
    - 文字按钮不启用涟漪
  - 在 [utils/haptic.ts](file:///d:/6/恋爱小程序/apps/client/src/utils/haptic.ts) 中确认 `lightHaptic()` 实现：
    - 调用 `uni.vibrateShort({type: 'light'})`
    - mp-weixin 兼容性已确认
  - 更新 [Button.spec.ts](file:///d:/6/恋爱小程序/apps/client/src/tests/components/Button.spec.ts) 测试覆盖涟漪触发
- **Acceptance Criteria**: 主按钮点击有明显涟漪和震动
- **Test Requirements**:
  - `human-judgement` TR-G2.1: 主按钮点击有涟漪扩散
  - `human-judgement` TR-G2.2: 真机测试有触觉反馈
  - `programmatic` TR-G2.3: Button.spec.ts 通过
  - `programmatic` TR-G2.4: mp-weixin 编译无 :hover

---

## Phase H: 集成验证 + 文档 + 截图识别验收

### [x] Task H1: 前后端联调（mock + real 双模式）
- **Priority**: high
- **Depends On**: D1, D2, D3, E1, E2, E3, E4, F1, F2, F3, G1, G2
- **Description**:
  - 启动后端 API 服务（`mvnw spring-boot:run`）
  - 启动前端 H5 开发服务器
  - 浏览器走查所有功能：
    - 上传背景图/视频/照片墙/半身照
    - 填写扩展资料（身高/学历等）
    - 筛选抽屉各维度
    - 关键词搜索
    - 卡片大图+视频播放
    - 圈子跳转
    - 签到粒子
    - Button 涟漪
  - mp-weixin 编译并真机预览关键页面
- **Acceptance Criteria**: 所有功能在 H5 + mp-weixin 双端正常工作
- **Test Requirements**:
  - `human-judgement` TR-H1.1: H5 全功能走查通过
  - `human-judgement` TR-H1.2: mp-weixin 关键页面渲染正常
  - `programmatic` TR-H1.3: 无控制台错误

### [x] Task H2: 单元测试 + e2e 验证
- **Priority**: high
- **Depends On**: H1
- **Description**:
  - 运行前端测试：`npx vitest run`
  - 运行后端测试：`mvn test`
  - 修复因新增字段/状态导致的测试失败（不弱化断言）
  - 测试用例总数 ≥ 210（前端 201+ + 新增）
  - 新增 e2e 场景：上传背景图流程、筛选流程、视频播放流程
- **Acceptance Criteria**: 所有测试通过
- **Test Requirements**:
  - `programmatic` TR-H2.1: vitest 退出码 0
  - `programmatic` TR-H2.2: mvn test 退出码 0
  - `programmatic` TR-H2.3: 前端测试用例数 ≥ 210

### [x] Task H3: 构建验证（H5 + mp-weixin）
- **Priority**: high
- **Depends On**: H2
- **Description**:
  - H5 生产构建：`npx vite build` 退出码 0
  - mp-weixin 编译：`npx uni build -p mp-weixin` 退出码 0
  - 检查编译输出无 import.meta、catch {}、:hover 警告
  - 检查无新增硬编码（grep 业务组件中 #[0-9a-fA-F]{3,6} 数量为 0）
- **Acceptance Criteria**: 双端构建零错误
- **Test Requirements**:
  - `programmatic` TR-H3.1: vite build 退出码 0
  - `programmatic` TR-H3.2: uni build mp-weixin 退出码 0
  - `programmatic` TR-H3.3: 无 import.meta 残留
  - `programmatic` TR-H3.4: 无 :hover 伪类
  - `programmatic` TR-H3.5: 业务组件硬编码颜色为 0

### [x] Task H4: API 文档更新
- **Priority**: medium
- **Depends On**: H3
- **Description**:
  - 更新 [docs/openapi/users.yaml](file:///d:/6/恋爱小程序/docs/openapi/users.yaml)：
    - UserBasicProfile schema 新增字段
    - PUT /api/profile/basic 端点
    - POST /api/profile/background, /photos, /video, /half-body 端点
    - DELETE /api/profile/photos/{index} 端点
  - 更新 [docs/openapi/recommendations.yaml](file:///d:/6/恋爱小程序/docs/openapi/recommendations.yaml)：
    - GET /api/recommendations 新增筛选参数
    - RecommendedPerson schema 新增字段
  - 运行 `node tools/lint-openapi.mjs` 校验 OpenAPI 规范
- **Acceptance Criteria**: OpenAPI 文档与实现一致，lint 通过
- **Test Requirements**:
  - `programmatic` TR-H4.1: lint-openapi.mjs 退出码 0
  - `programmatic` TR-H4.2: 文档与代码字段一致

### [x] Task H5: 最终截图识别验收（强制）
- **Priority**: high
- **Depends On**: H4
- **Description**:
  - 重启 H5 开发服务器（应用所有改动）
  - 使用 agent-browser 重新截图 12+ 张，保存到 `.trae/screenshots/final-verification-2026-07-05/`：
    - 01-login.png ~ 12-circles.png（同 Phase 0.2 的页面清单）
    - 13-discover-filter-drawer.png: 筛选抽屉展开状态
    - 14-profile-with-background.png: 已上传背景图的 profile
    - 15-card-swiper-with-photos.png: 大图卡片+照片墙
    - 16-video-player.png: 视频播放页
    - 17-checkin-particles.png: 签到粒子动画（截图时机）
  - 与参考图逐项比对，输出 `final-visual-verification.md`，包含：
    - 每页的最终截图链接
    - 参考图链接
    - 视觉对齐度评分（0-100%）
    - 残留问题清单（如有）
  - 验收标准：每页对齐度 ≥ 85%
  - 未达标的页面：创建新修复任务，回到 Phase 1 重构
- **Acceptance Criteria**: 12+ 张截图产出，每页对齐度 ≥ 85%
- **Test Requirements**:
  - `programmatic` TR-H5.1: 12+ 张最终截图生成
  - `human-judgement` TR-H5.2: 每页对齐度 ≥ 85%（人工识别确认）
  - `human-judgement` TR-H5.3: 颜色/间距/圆角/阴影/氛围感/层级 6 维度对齐参考
  - `programmatic` TR-H5.4: final-visual-verification.md 报告产出
  - `human-judgement` TR-H5.5: 控制台零错误
  - `human-judgement` TR-H5.6: 所有按钮点击反馈清晰
  - `human-judgement` TR-H5.7: 图片/视频正常加载

### [x] Task H6: dogfood 报告关闭 + 残留问题归档
- **Priority**: medium
- **Depends On**: H5
- **Description**:
  - 对照 [dogfood-report.md](file:///d:/6/恋爱小程序/.trae/specs/2026-07-05-design-polish-to-reference/dogfood-report.md) 中 38 项问题逐项关闭
  - 残留问题（如对齐度 < 85% 的页面）归档到 `residual-issues.md`
  - 创建后续迭代 spec（如有必要）
- **Acceptance Criteria**: dogfood 报告 100% 关闭或归档
- **Test Requirements**:
  - `programmatic` TR-H6.1: 38 项问题状态更新
  - `programmatic` TR-H6.2: residual-issues.md 产出（如有残留）

---

# Task Dependencies

- 0.1 → 0.2 → 0.3（视觉审计顺序）
- 0.3 → 1.1（视觉重构依赖审计结果）
- 1.1 → 1.2, 1.3, 1.4, 1.5（视觉重构各子任务并行）
- A2, A1 → A3（A3 依赖 MediaAsset 实体和扩展字段）
- A1, A3 → B1（Profile 扩展依赖实体和上传服务）
- A1 → B2（Recommendation 筛选依赖扩展字段）
- B3 独立（基于既有 CampusCertification）
- A3, B1, B2, B3 → B4（单元测试依赖所有后端功能）
- B1, B2, B3 → C1（API 客户端依赖后端契约）
- C1 → C2（Store 依赖 API 类型）
- C2 → D1, D2（寻觅页依赖 Store）
- C1 → D3（认证徽章依赖 API 字段）
- C1 → E1, E2, E3, E4（Profile 页依赖 API）
- D3 → E4（Profile 认证徽章复用 D3 组件）
- F1, F2, F3, G1, G2 可并行（无后端依赖）
- 1.2, 1.3, 1.4, 1.5 与 D/E/F/G 各任务可并行
- 全部 → H1, H2, H3, H4, H5, H6（集成验证依赖所有功能）

# Parallelizable Work
- Phase 0（视觉审计）必须最先执行
- Phase 1（视觉重构）与 Phase A-G（功能补全）大部分可并行
- 后端 Phase A 与前端 emoji 替换（F3）、SocialOnboarding 修复（F2）、签到粒子（G1）、Button 涟漪（G2）可并行
- 后端 Phase B 与前端 Store/API 客户端（C1, C2）部分可并行（基于 OpenAPI 契约先行）
- 前端 Phase D 各子任务（D1/D2/D3）可并行（不同组件）
- 前端 Phase E 各子任务（E1/E2/E3/E4）可并行
- Phase H 必须串行执行，H5 截图识别验收为最终门槛
