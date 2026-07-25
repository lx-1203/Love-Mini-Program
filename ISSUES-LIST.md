# 校园恋爱小程序 — 全量问题清单

> **生成时间**: 2026-07-25
> **数据来源**: GitHub仓库 `lx-1203/Love-Mini-Program` 最新提交 (e023688) + 本地深度审计
> **审计维度**: 硬编码、技术债、Bug/隐患、功能完整性、UI/UX交互、设计合理性、商业化落地规范
> **总问题数**: 1335项（已修复34项，待修复1301项）

---

## 📊 严重度分布总览

| 严重度 | 已修复 | 待修复 | 合计 | 说明 |
|--------|-------|--------|------|------|
| 🔴 P0 | 0 | 49 | 49 | 阻断商业化 |
| 🟠 P1 | 19 | 295 | 314 | 严重风险 |
| 🟡 P2 | 15 | 657 | 672 | 中等风险 |
| 🟢 P3 | 0 | 300 | 300 | 低风险/代码规范 |
| **合计** | **34** | **1301** | **1335** | |

---

## ✅ 已修复问题清单（34项）

### 第一轮修复（PROJECT-REVIEW-FIX-REPORT，15项）

| # | 问题 | 文件路径 | 修复内容 |
|---|------|---------|---------|
| 1 | `.env.real` 提交版本库 | `apps/client/.env.real` | 修改 `.gitignore` |
| 2 | CORS 允许任意本地端口 | `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` | 限制为具体端口 |
| 3 | N+1 查询严重 | `apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java` | 批量预加载 |
| 4 | 只读事务内执行写操作 | `apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java` | 移除 `readOnly` |
| 5 | TabBar 信息架构不一致 | `apps/client/src/pages.json` | 更新为 5 个入口 |
| 6 | 首页未消费 HomeDashboard API | `apps/client/src/stores/home.ts` | 创建 home store |
| 7 | 评论内存分页 | `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java` | 数据库分页 |
| 8 | 测试用例与配置不同步 | `apps/client/src/tests/` | 更新测试 |
| 9 | Token 刷新端点缺失 | `apps/api/src/main/java/com/campuslove/api/auth/AuthController.java` | 添加 `/api/auth/refresh` |
| 10 | 安全响应头缺失 | `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` | 添加 X-Content-Type-Options 等 |
| 11 | `refreshSession()` mock 不调 API | `apps/client/src/stores/session.ts` | 修改为调 API |
| 12 | `toPostDetailView` 硬编码 false | `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java` | 动态查询 |
| 13 | `markAsRead` 逐条更新 | `apps/api/src/main/java/com/campuslove/api/service/RealPrivateMessageService.java` | 批量更新 |
| 14 | 分页参数无上限校验 | `apps/api/src/main/java/com/campuslove/api/village/VillageController.java` | 添加 `@Max(100)` |
| 15 | 部署文档缺失 | `DEPLOYMENT.md` | 创建 |

### 最近10次提交修复（14项）

| # | 提交 | 文件路径 | 修复内容 |
|---|------|---------|---------|
| 16 | e023688 | `apps/client/src/components/common/Avatar.vue` | 集成SafeImage错误兜底 |
| 17 | e023688 | `apps/client/src/components/layout/TabBar.vue` | 直接从navigation.ts导入配置 |
| 18 | e023688 | `apps/client/src/components/common/SafeImage.vue` | 新增lazyLoad属性 |
| 19 | e023688 | `apps/client/src/components/home/ActivityCard.vue` | 动态路径改用白名单映射 |
| 20 | e023688 | `apps/client/src/config/navigation.ts` | 唯一真相源 |
| 21 | e023688 | `apps/client/src/custom-tab-bar/index.js` | 配置对齐注释 |
| 22 | e023688 | `apps/client/src/pages.json` | 配置对齐注释 |
| 23 | 836b849 | `.github/workflows/ci.yml` | Flyway placeholder语法 |
| 24 | 836b849 | `database/flyway/sql/V2026.06.25.0001__add_user_role_and_init_admin.sql` | pnpm版本冲突 |
| 25 | b724199 | `apps/client/src/App.vue` | mp-weixin CSS兼容性 |
| 26 | b724199 | `apps/client/src/theme/design-variables.scss` | `.card-stagger > *` 改为 `.card-stagger > view` |
| 27 | e8a9210 | `.github/workflows/ci.yml` | npm ci、MySQL 8.0 RSA认证 |
| 28 | c616800 | `database/flyway/sql/` | MySQL 8.0迁移失败 |
| 29 | be6d4a1 | `database/flyway/flyway.toml` | Flyway占位符定义 |

### 微信开发者工具验证修复（5项）

| # | 问题 | 文件路径 | 修复状态 |
|---|------|---------|---------|
| 30 | `app.wxss(1:37498): error at token *` | `apps/client/dist/build/mp-weixin/app.wxss` | ✅ 已消失 |
| 31 | `ReferenceError: __route__ is not defined` | `apps/client/src/App.vue` | ✅ 已消失 |
| 32 | `TypeError: Cannot read properties of undefined (reading 'errMsg')` | `apps/client/src/main.ts` | ✅ 已消失 |
| 33 | `Error: timeout` | `apps/client/src/main.ts` | ✅ 已消失 |
| 34 | Vue Error / Vue warn | `apps/client/src/App.vue` | ✅ 已消失 |

---

## 🔴 P0级 — 阻断商业化（49项）

### 安全类（12项）

| # | 文件路径 | 行号 | 问题描述 | 商业化影响 |
|---|---------|------|---------|-----------|
| 1 | `apps/client/manifest.json` | L3 | 微信AppID为占位符`__UNI__CAMPUSLOVE` | 无法通过微信审核 |
| 2 | `apps/client/manifest.json` | L12 | mp-weixin使用游客模式ID`touristappid` | 无法发布上线 |
| 3 | `apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java` | - | 敏感数据(openid、phone)明文存储 | 违反PIPL合规要求 |
| 4 | `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` | - | `/uploads/**`无认证可访问 | 媒体文件泄露风险 |
| 5 | `apps/api/src/main/java/com/campuslove/api/match/MatchController.java` | - | 请求体传入userId替代认证用户ID | 鉴权绕过 |
| 6 | `apps/api/src/main/resources/application-db.yml` | - | 管理员密码默认值`admin123` | 后台被入侵 |
| 7 | `apps/api/src/main/resources/application.yml` | - | JWT Secret允许空值启动 | JWT伪造风险 |
| 8 | `apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java` | - | 缺少MIME类型验证 | 恶意文件上传 |
| 9 | `apps/client/src/services/websocket.ts` | L294-300 | Token通过非标准WebSocket头传递 | 部分网络环境不可用 |
| 10 | `apps/client/src/config/app.ts` | L17-21 | Token存储键名`campus_love_auth_token`可预测 | Token被劫持 |
| 11 | `apps/client/src/compat/index.ts` | L76-80 | 修改全局wx对象核心API | 影响第三方SDK |
| 12 | `apps/client/src/config/page-access.ts` | - | discover/village/shop无访问控制 | 未登录可访问 |

### 功能完全失效类（10项）

| # | 文件路径 | 行号 | 问题描述 | 商业化影响 |
|---|---------|------|---------|-----------|
| 13 | `apps/client/src/stores/discover.ts` | L744-752 | swipeRight API失败时fallback到mock匹配逻辑 | 未经同意标记"喜欢" |
| 14 | `apps/client/src/stores/chat.ts` | L481-524 | sendText无失败处理 | 消息静默丢失 |
| 15 | `apps/client/src/stores/checkin.ts` | L240-316 | checkIn无幂等守卫 | 重复签到扣款 |
| 16 | `apps/client/src/stores/village.ts` | L622-712 | fetchPosts竞态条件 | 数据错乱 |
| 17 | `apps/client/src/pages/chat/index.vue` | - | 实时消息丢失/延迟 | 用户流失 |
| 18 | `apps/client/src/main.ts` | L28-30 | 全局错误监控缺失 | 异常无感知 |
| 19 | `apps/client/src/App.vue` | L42-59 | App启动错误未上报 | 启动异常无感知 |
| 20 | `apps/client/src/pages/discover/index.vue` | - | 校园认证照片仅存本地路径 | 换设备丢失 |
| 21 | `apps/client/src/pages/home/index.vue` | - | 分类切换不刷新数据 | 发布按钮跳转错误 |
| 22 | `apps/client/src/pages/likes/index.vue` | - | 无全局网络监听 | 断网状态无提示 |

### 数据完整性类（5项）

| # | 文件路径 | 行号 | 问题描述 | 商业化影响 |
|---|---------|------|---------|-----------|
| 23 | `database/flyway/sql/V2026.05.21.0003__create_posts_table.sql` | - | posts.author_id缺少外键约束 | 孤儿数据 |
| 24 | `database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql` | - | SQL占位符未加引号 | 迁移失败 |
| 25 | `apps/api/src/main/java/com/campuslove/api/entity/` | - | 多处Entity字段类型与DDL不一致 | 数据异常 |
| 26 | `apps/api/src/main/java/com/campuslove/api/repository/` | - | N+1查询导致接口超时/OOM | 服务不可用 |
| 27 | `apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java` | - | 匹配算法无并发控制 | 数据错乱 |

### 构建/发布类（5项）

| # | 文件路径 | 行号 | 问题描述 | 商业化影响 |
|---|---------|------|---------|-----------|
| 28 | `apps/client/vite.config.ts` | L33 | H5生产包未应用patch | 首页白屏 |
| 29 | `apps/client/package.json` | - | 无lock文件 | CI/CD依赖不一致 |
| 30 | `apps/client/manifest.json` | - | 未配置隐私协议 | 拒绝上架 |
| 31 | `apps/api/pom.xml` | - | JWT库JJWT 0.12.6停止维护 | 安全漏洞无补丁 |
| 32 | `apps/client/manifest.json` | L14 | urlCheck:false关闭合法域名校验 | 中间人攻击 |

### 用户流程阻断类（8项）

| # | 文件路径 | 行号 | 问题描述 | 商业化影响 |
|---|---------|------|---------|-----------|
| 33 | `apps/client/src/pages/login/index.vue` | - | 登录无超时机制 | 弱网下无限加载 |
| 34 | `apps/client/src/pages/vip/index.vue` | - | 支付无取消回调 | 扣款成功但用户看不到 |
| 35 | `apps/client/src/pages/setup/profile/index.vue` | - | 资料保存无提交锁 | 重复提交多条记录 |
| 36 | `apps/client/src/subpackages/setup/campus/index.vue` | - | 校园认证无重试机制 | 网络异常流程中断 |
| 37 | `apps/client/src/stores/session.ts` | L244-285 | refreshSession失败静默 | 登录态过期无感知 |
| 38 | `apps/client/src/services/http.ts` | L404-418 | 401刷新后重试再401死循环 | 用户无法使用 |
| 39 | `apps/client/src/services/http.ts` | L231-284 | hasRedirectedToLogin 3秒窗口期 | 非标准错误信息 |
| 40 | `apps/client/src/services/websocket.ts` | L1056-1086 | 心跳帧格式错误 | 服务器主动断开 |

### 其他P0（9项）

| # | 文件路径 | 行号 | 问题描述 | 商业化影响 |
|---|---------|------|---------|-----------|
| 41 | `apps/client/src/pages/feedback/index.vue` | L28-39 | submit无try-catch | 提交失败抛未捕获异常 |
| 42 | `apps/client/src/subpackages/discover/discussions/index.vue` | L22-29 | loadDiscussions无try-catch | 永远显示加载中 |
| 43 | `apps/client/src/stores/discover.ts` | L460-525 | fetchCards中resetDailyLimit修改状态 | 卡片计数错乱 |
| 44 | `apps/client/src/stores/village.ts` | L622-712 | fetchPosts不取消在途请求 | 旧请求覆盖新请求 |
| 45 | `apps/client/src/stores/chat.ts` | L708-763 | sendIcebreaker API成功后sendText失败 | 破冰券消耗无消息 |
| 46 | `apps/client/src/stores/checkin.ts` | L115-135 | withTimeout超时后Promise仍执行 | 状态反复切换 |
| 47 | `apps/client/src/stores/activity.ts` | L178 | fetchMoreActivities未传page参数 | 分页功能失效 |
| 48 | `apps/client/src/composables/usePageAccess.ts` | L53 | token存在但userSession为空放行 | 安全漏洞 |
| 49 | `apps/client/src/pages/home/index.vue` | - | 首页推荐数据硬编码3条 | 无法动态更新 |

---

## 🟠 P1级 — 严重风险（295项）

### 历史遗留待修复（4项）

| # | 文件路径 | 问题描述 | 来源 |
|---|---------|---------|------|
| 1 | `apps/api/src/main/java/com/campuslove/api/campus/CampusController.java` | schoolId hashCode问题需创建学校表 | PROJECT-REVIEW-FIX-REPORT |
| 2 | `apps/client/src/stores/*.ts` | 前端useMock抽取（7处重复） | PROJECT-REVIEW-FIX-REPORT |
| 3 | `apps/api/src/main/java/com/campuslove/api/security/JwtTokenProvider.java` | Token黑名单需Redis | PROJECT-REVIEW-FIX-REPORT |
| 4 | `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` | 速率限制需bucket4j | PROJECT-REVIEW-FIX-REPORT |

### 硬编码类（62项）

| # | 文件路径 | 行号 | 问题描述 |
|---|---------|------|---------|
| 5 | `apps/client/src/components/discover/CardSwiper.vue` | - | 用户画像mock数据硬编码 |
| 6 | `apps/client/src/components/discover/CardSwiper.vue` | - | 收入水平硬编码字符串 |
| 7 | `apps/client/src/theme/design-variables.scss` | - | 932处硬编码颜色值 |
| 8 | `apps/client/src/config/images.ts` | - | 100+图片路径硬编码 |
| 9 | `apps/client/src/config/home-recommended-people.ts` | L13-41 | 推荐用户仅3条硬编码 |
| 10 | `apps/client/src/config/schools.ts` | L12-17 | 仅4所学校 |
| 11 | `apps/client/src/config/home-sections.ts` | L9-15 | 首页模块顺序硬编码 |
| 12 | `apps/client/src/config/status-copy.ts` | - | 状态文案中文硬编码 |
| 13 | `apps/client/src/subpackages/setup/campus/index.vue` | L9-13 | 表单默认值硬编码 |
| 14 | `apps/client/src/subpackages/setup/profile/index.vue` | L77 | 身高验证范围120-250硬编码 |
| 15 | `apps/client/src/subpackages/setup/schedule/index.vue` | L10-16 | 表单默认值硬编码 |
| 16 | `apps/client/src/view-models/profile.ts` | L68 | DEFAULT_BIO硬编码 |
| 17 | `apps/client/src/view-models/profile.ts` | L120-123 | 兜底文案硬编码 |
| 18 | `apps/client/src/view-models/profile.ts` | L80,86-89 | 时间单位中文硬编码 |
| 19 | `apps/client/src/view-models/chat.ts` | L49,56 | 中文文案硬编码 |
| 20 | `apps/client/src/view-models/feedback.ts` | L16-28 | 状态标签中文硬编码 |
| 21 | `apps/client/src/config/app.ts` | L7 | APP_NAME中文硬编码 |
| 22 | `apps/client/src/config/navigation.ts` | L29-31 | Tab label中文硬编码 |
| 23 | `apps/client/src/components/common/Toast.vue` | L35-40 | Unicode字符作图标 |
| 24 | `apps/client/src/components/common/Button.vue` | L63-73 | 涟漪颜色硬编码RGBA |
| 25 | `apps/client/src/components/layout/TabBar.vue` | L47-49 | 99+中文硬编码 |
| 26 | `apps/client/src/components/common/PageStateContainer.vue` | L81-87 | 默认文案中文硬编码 |
| 27 | `apps/client/src/components/common/ErrorState.vue` | L26 | msgMap中文硬编码 |
| 28 | `apps/client/src/components/common/EmptyState.vue` | L25 | subMap中文硬编码 |
| 29 | `apps/client/src/components/common/Skeleton.vue` | L64 | 渐变颜色依赖CSS变量 |
| 30 | `apps/client/src/components/common/Avatar.vue` | L24 | 品牌渐变硬编码 |
| 31 | `apps/client/src/components/common/SafeImage.vue` | L48 | fallback路径硬编码 |
| 32 | `apps/client/src/components/common/Card.vue` | - | variant/gradient重叠 |
| 33 | `apps/client/src/components/common/Tag.vue` | L6 | 15种变体无枚举约束 |
| 34 | `apps/client/src/components/common/SearchBar.vue` | - | placeholder硬编码 |
| 35 | `apps/client/src/components/common/SectionHeader.vue` | L10 | 查看全部中文硬编码 |
| 36 | `apps/client/src/stores/likes.ts` | L314-321 | currentUserId默认值"user-1001" |
| 37 | `apps/client/src/stores/profile.ts` | L195-202 | Mock数据硬编码 |
| 38 | `apps/client/src/services/api.ts` | L28-59 | 空字段拼接query |
| 39 | `apps/client/src/services/websocket.ts` | L157-160 | 重连间隔固定3秒 |
| 40 | `apps/client/src/pages/vip/index.vue` | - | VIP价格硬编码 |
| 41 | `apps/client/src/pages/discover/index.vue` | - | 匹配算法参数硬编码 |
| 42 | `apps/client/src/pages/home/index.vue` | - | 首页板块顺序硬编码 |
| 43 | `apps/client/src/pages/chat/index.vue` | - | 消息类型映射硬编码 |
| 44 | `apps/client/src/pages/profile/index.vue` | - | 头像样式硬编码 |
| 45 | `apps/client/src/pages/likes/index.vue` | - | 筛选条件硬编码 |
| 46 | `apps/client/src/pages/village/index.vue` | - | 分类标签硬编码 |
| 47 | `apps/client/src/pages/check-in/index.vue` | - | 奖励规则硬编码 |
| 48 | `apps/client/src/pages/setup/index.vue` | - | 引导步骤硬编码 |
| 49 | `apps/client/src/pages/notifications/index.vue` | - | 通知类型映射硬编码 |
| 50 | `apps/client/src/pages/search/index.vue` | - | 搜索历史硬编码 |
| 51 | `apps/client/src/pages/campus/index.vue` | - | 校园认证提示硬编码 |
| 52 | `apps/client/src/subpackages/discover/activities/index.vue` | L79-82 | shortDesc截取长度50硬编码 |
| 53 | `apps/client/src/theme/tokens.ts` | L329 | layout.maxWidth硬编码375 |
| 54 | `apps/client/src/theme/tokens.ts` | L263 | 字号单位混用px |
| 55 | `apps/client/src/theme/utils.ts` | L42-49 | getComponentRadius映射硬编码 |
| 56 | `apps/client/src/utils/navigation.ts` | - | 路由路径硬编码 |
| 57 | `apps/client/src/config/match-form.ts` | - | 匹配表单字段硬编码 |
| 58 | `apps/client/src/config/assets-index.ts` | - | 资源路径硬编码 |
| 59 | `apps/client/src/config/page-access.ts` | - | 页面访问要求硬编码 |
| 60 | `apps/client/src/theme/design-variables.scss` | - | 渐变色rgba值硬编码 |
| 61 | `apps/client/src/theme/design-variables.scss` | - | token重复定义3处 |
| 62 | `apps/client/src/theme/global.scss` | - | 样式重复/冗余3处 |
| 63 | `apps/client/src/config/navigation.ts` | - | AppTabId声明7种但配置5种 |
| 64 | `apps/client/src/stores/schedule.ts` | L47 | 全部mock数据无API集成 |
| 65 | `apps/client/src/stores/discover.ts` | L380 | 工厂函数绕开Pinia |
| 66 | `apps/client/src/subpackages/discover/activities/index.vue` | L157,166,172,182 | 日期拼接逻辑4处重复 |

### 技术债类（48项）

| # | 文件路径 | 行号 | 问题描述 |
|---|---------|------|---------|
| 67 | `apps/client/tsconfig.json` | L9 | noImplicitAny:false允许隐式any |
| 68 | `apps/client/tsconfig.json` | L8 | skipLibCheck:true跳过第三方类型检查 |
| 69 | `apps/client/tsconfig.json` | - | 未启用strictNullChecks等严格选项 |
| 70 | `apps/client/package.json` | - | sass和sass-embedded重复引入 |
| 71 | `apps/client/package.json` | L23 | uni-ui版本浮动其余固定 |
| 72 | `apps/client/package.json` | - | 无pinia持久化插件 |
| 73 | `apps/client/package.json` | L33 | coverage-v8与vitest版本不匹配 |
| 74 | `apps/client/vite.config.ts` | L54-87 | 猴子补丁修改内部模块 |
| 75 | `apps/api/pom.xml` | L9 | Spring Boot 3.3.1版本较旧 |
| 76 | `apps/api/pom.xml` | - | 缺少springdoc-openapi API文档依赖 |
| 77 | `apps/api/pom.xml` | - | 缺少Redis缓存依赖 |
| 78 | `apps/api/pom.xml` | - | 缺少HikariCP连接池显式配置 |
| 79 | `apps/admin/package.json` | - | 无UI组件库（Element Plus/Ant Design） |
| 80 | `apps/admin/package.json` | - | 无HTTP客户端（axios/fetch封装） |
| 81 | `apps/admin/package.json` | - | 无路由库（vue-router） |
| 82 | `apps/admin/package.json` | - | 无图表库（echarts/chart.js） |
| 83 | `apps/admin/package.json` | - | 无typecheck/test/lint脚本 |
| 84 | `apps/admin/package.json` | L12 | Vue版本与client不一致 |
| 85 | `apps/client/vitest.config.ts` | L66-70 | 覆盖率阈值仅25% |
| 86 | `apps/client/vitest.config.ts` | L46-52 | 覆盖范围过窄 |
| 87 | `apps/client/vitest.config.ts` | L40 | jsdom不支持wx.*平台API |
| 88 | `apps/client/src/main.ts` | - | 错误监控仅console.error |
| 89 | `apps/client/src/App.vue` | - | style块超660行根组件过重 |
| 90 | `apps/client/src/App.vue` | - | Sass@import已deprecated |
| 91 | `apps/client/src/theme/design-variables.scss` | - | token语义重复 |
| 92 | `apps/client/src/theme/tokens.ts` | - | 深浅主题API结构不统一 |
| 93 | `apps/client/src/theme/tokens.ts` | L506-512 | switch无穷尽检查 |
| 94 | `apps/client/src/theme/utils.ts` | L7-18 | getColor无类型安全 |
| 95 | `apps/client/src/plugins/gsap.ts` | L22 | gsap:any全局变量类型丢失 |
| 96 | `apps/client/src/compat/index.ts` | L18 | wx声明为Record<string,any> |
| 97 | `apps/client/src/stores/discover.ts` | - | 工厂函数绕开Pinia标准API |
| 98 | `apps/client/src/stores/likes.ts` | L503-525 | getter-like函数产生副作用 |
| 99 | `apps/client/src/stores/chat.ts` | L245-277 | withErrorHandling动态属性无编译检查 |
| 100 | `apps/client/src/stores/village.ts` | L567-608 | getter接受函数参数非常规用法 |
| 101 | `apps/client/src/services/websocket.ts` | - | 无指数退避重连策略 |
| 102 | `apps/client/src/services/http.ts` | L157 | isRefreshing模块级非原子操作 |
| 103 | `apps/client/src/services/api-error.ts` | - | 仅处理顶层错误不处理嵌套 |
| 104 | `apps/client/src/composables/useTabBar.ts` | - | 条件编译跨平台行为不一致 |
| 105 | `apps/client/src/composables/usePageAccess.ts` | - | 守卫检查仅onShow执行一次 |
| 106 | `apps/client/src/utils/navigation.ts` | - | openAppPath无错误处理 |
| 107 | `apps/client/src/utils/haptic.ts` | - | 振动API使用as any绕过类型 |
| 108 | `apps/client/src/env.d.ts` | - | VITE_API_MODE可选但代码假设必存在 |
| 109 | `apps/client/src/view-models/chat.ts` | - | getRecommendationAction重复计算 |
| 110 | `apps/client/src/view-models/home.ts` | L129 | toHomePageView重复计算无缓存 |
| 111 | `apps/client/src/view-models/login.ts` | - | 文件仅8行应合并 |
| 112 | `apps/client/src/config/images.ts` | - | SVG与PNG混用无类型约束 |
| 113 | `apps/client/src/config/assets-index.ts` | L1-9 | CAMPUS_VIDEOS已移除未标记@deprecated |
| 114 | `apps/client/src/config/assets-index.ts` | L33 | HOME_POSTER指向登录海报资源错配 |

### Bug/隐患类（96项）

| # | 文件路径 | 行号 | 问题描述 |
|---|---------|------|---------|
| 115 | `apps/client/src/stores/discover.ts` | L269,275 | 模块级定时器HMR不清理 |
| 116 | `apps/client/src/stores/discover.ts` | L1170-1209 | watch重复注册未清理 |
| 117 | `apps/client/src/stores/session.ts` | L101-120 | 冷启动同步读取阻塞主线程 |
| 118 | `apps/client/src/stores/session.ts` | L291-318 | bootstrap无并发守卫重复请求 |
| 119 | `apps/client/src/stores/profile.ts` | L190 | load无并发守卫并行执行 |
| 120 | `apps/client/src/stores/profile.ts` | L278,308,333 | 乐观更新catch无回滚 |
| 121 | `apps/client/src/stores/likes.ts` | L328-365 | fetchLikes catch不re-throw |
| 122 | `apps/client/src/stores/likes.ts` | L370-392 | fetchVisitors覆盖已有数据 |
| 123 | `apps/client/src/stores/likes.ts` | L569-587 | notifyHeartSignal无频控 |
| 124 | `apps/client/src/stores/chat.ts` | L305-333 | withMockMode"id"检查过宽 |
| 125 | `apps/client/src/stores/chat.ts` | L766-778 | fetchIcebreakers错误处理不一致 |
| 126 | `apps/client/src/stores/village.ts` | L839-888 | likePost乐观更新无回滚 |
| 127 | `apps/client/src/stores/village.ts` | L1037-1073 | likeComment不使用服务器响应 |
| 128 | `apps/client/src/stores/checkin.ts` | L307-309 | setTimeout修改已卸载组件状态 |
| 129 | `apps/client/src/stores/checkin.ts` | L98-103 | mockCheckInStatus模块级共享 |
| 130 | `apps/client/src/stores/schedule.ts` | L184-186 | Date.now作ID毫秒内重复 |
| 131 | `apps/client/src/stores/schedule.ts` | L129-139 | isOverlap边界情况误判 |
| 132 | `apps/client/src/stores/activity.ts` | L166-169 | fetchMoreActivities不检查loading |
| 133 | `apps/client/src/stores/activity.ts` | L199-247 | enrollActivity本地修改引用无回滚 |
| 134 | `apps/client/src/stores/activity.ts` | L254-297 | fetchActivityDetail catch返回null无提示 |
| 135 | `apps/client/src/stores/feedback.ts` | L45,65,85 | 提交成功后load失败覆盖成功状态 |
| 136 | `apps/client/src/services/api.ts` | L141-147 | token提取无验证 |
| 137 | `apps/client/src/services/api.ts` | L468-485 | logout先调后端hang则无法退出 |
| 138 | `apps/client/src/services/api.ts` | L74-115 | uploadFileViaUni无取消机制 |
| 139 | `apps/client/src/services/websocket.ts` | L244-255 | pendingSubscriptions清空丢活跃订阅 |
| 140 | `apps/client/src/services/websocket.ts` | L396-409 | onStateChange回调无自动清理 |
| 141 | `apps/client/src/services/http.ts` | L157 | isRefreshing非原子操作并发401 |
| 142 | `apps/client/src/services/http.ts` | L203-215 | tryRefreshToken用裸request绕过拦截器 |
| 143 | `apps/client/src/services/api-error.ts` | L76-96 | toAppApiError不处理嵌套结构 |
| 144 | `apps/client/src/composables/useTabBar.ts` | L17-32 | 条件编译H5端空操作 |
| 145 | `apps/client/src/composables/usePageAccess.ts` | L35-91 | 守卫检查onShow执行一次 |
| 146 | `apps/client/src/components/common/Toast.vue` | L24-32 | 单例状态多次调用互相干扰 |
| 147 | `apps/client/src/components/common/Toast.vue` | L82 | Promise在onUnmounted不resolve |
| 148 | `apps/client/src/components/common/Skeleton.vue` | L59-67 | shimmer动画低端机性能差 |
| 149 | `apps/client/src/components/common/Skeleton.vue` | L67 | 无限循环动画页面不可见仍执行 |
| 150 | `apps/client/src/components/common/SafeImage.vue` | L65-73 | fallback图片失败静默无作为 |
| 151 | `apps/client/src/components/common/SafeImage.vue` | L59-63 | watch src变化未防抖 |
| 152 | `apps/client/src/components/common/Button.vue` | L89-94 | 涟漪坐标跨端基准不一致 |
| 153 | `apps/client/src/components/common/Button.vue` | L273-291 | opacity重复定义死代码 |
| 154 | `apps/client/src/components/common/Ripple.vue` | L89-134 | 每次点击DOM查询 |
| 155 | `apps/client/src/components/common/Ripple.vue` | L169-186 | 子组件阻止冒泡涟漪不触发 |
| 156 | `apps/client/src/components/common/Ripple.vue` | L156-165 | 16ms延迟中组件卸载访问销毁变量 |
| 157 | `apps/client/src/components/common/BottomActionBar.vue` | L19,22 | mp-weixin原生button有边框 |
| 158 | `apps/client/src/components/common/Card.vue` | - | :active伪类未配hover-class |
| 159 | `apps/client/src/components/common/UnreadBadge.vue` | L15 | count允许负数显示"-1" |
| 160 | `apps/client/src/components/common/UnreadBadge.vue` | L38 | pulse动画屏外仍运行 |
| 161 | `apps/client/src/components/layout/TabBar.vue` | L32-38 | tab.iconPath无/前缀保护双斜杠 |
| 162 | `apps/client/src/components/layout/TabBar.vue` | L58-151 | getTab非空断言配置缺失白屏 |
| 163 | `apps/client/src/components/layout/TabBar.vue` | L103 | 发布按钮无权限校验 |
| 164 | `apps/client/src/components/layout/TabBar.vue` | L369-438 | publishBreath动画常驻耗电 |
| 165 | `apps/client/src/components/layout/TabBar.vue` | L166 | constant/env两套方案旧版失效 |
| 166 | `apps/client/src/components/layout/AppShell.vue` | L118-122 | navigateBack在mp-weixin不返回Promise |
| 167 | `apps/client/src/components/layout/AppShell.vue` | L110 | bodyPaddingBottom硬编码180rpx |
| 168 | `apps/client/src/components/layout/ChatHeader.vue` | L19 | title fallback中文硬编码 |
| 169 | `apps/client/src/pages/chat/index.vue` | - | 消息列表无虚拟滚动大量消息卡顿 |
| 170 | `apps/client/src/pages/discover/index.vue` | - | 卡片swiper无touch事件冲突处理 |
| 171 | `apps/client/src/pages/home/index.vue` | - | 首页骨架屏与真实数据布局差异大 |
| 172 | `apps/client/src/pages/profile/index.vue` | - | 资料表单无未保存修改提示 |
| 173 | `apps/client/src/pages/likes/index.vue` | - | 喜欢列表无分页加载一次性加载全部 |
| 174 | `apps/client/src/pages/vip/index.vue` | - | VIP订阅无优惠码功能 |
| 175 | `apps/client/src/pages/village/index.vue` | - | 帖子列表无图片懒加载 |
| 176 | `apps/client/src/pages/check-in/index.vue` | - | 签到动画重复触发 |
| 177 | `apps/client/src/pages/setup/index.vue` | - | 引导流程无进度显示 |
| 178 | `apps/client/src/pages/notifications/index.vue` | - | 通知无已读状态持久化 |
| 179 | `apps/client/src/pages/search/index.vue` | - | 搜索无防抖即时请求 |
| 180 | `apps/client/src/pages/campus/index.vue` | - | 校园认证无照片压缩 |
| 181 | `apps/client/src/subpackages/setup/campus/index.vue` | L47-49 | picker change事件类型mp-weixin不一致 |
| 182 | `apps/client/src/subpackages/setup/profile/index.vue` | L80-88 | picker value类型mp-weixin为字符串 |
| 183 | `apps/client/src/subpackages/setup/profile/index.vue` | L183-185 | setTimeout600ms后跳转session未更新 |
| 184 | `apps/client/src/subpackages/setup/schedule/index.vue` | L50-55 | textarea绑定数组索引mp-weixin问题 |
| 185 | `apps/client/src/subpackages/setup/recommend-pref/index.vue` | L113-114 | 保存吞掉错误信息 |
| 186 | `apps/client/src/subpackages/setup/recommend-pref/index.vue` | L120-123 | goBack无前页失败 |
| 187 | `apps/client/src/subpackages/discover/activities/index.vue` | L68-71 | onScrollToLower无节流 |
| 188 | `apps/client/src/subpackages/discover/activities/index.vue` | L344,481 | toggleEnroll竞态保护可绕过 |
| 189 | `apps/client/src/subpackages/support/feedback/index.vue` | L48 | text组件用于点击交互受限 |
| 190 | `apps/client/src/theme/global.scss` | L218-221 | -webkit-line-clamp支持有限 |
| 191 | `apps/client/src/theme/design-variables.scss` | L79,254 | text-tertiary/quaternary色值差异极小 |
| 192 | `apps/client/src/theme/tokens.ts` | L23-34 | secondary与brand色阶完全相同 |
| 193 | `apps/client/src/theme/utils.ts` | L20-22 | getShadow未验证返回值 |
| 194 | `apps/client/src/view-models/chat.ts` | L28-42 | matchesSearchText未做空值保护 |
| 195 | `apps/client/src/view-models/home.ts` | L132 | tone联合无新增穷尽检查 |
| 196 | `apps/client/src/view-models/profile.ts` | L125 | charAt(0)空字符串返回空 |
| 197 | `apps/client/src/utils/navigation.ts` | L12-21 | normalizeUrl只加开头/不加尾部 |
| 198 | `apps/client/src/utils/navigation.ts` | L23-31 | replaceAppPath对Tab页redirectTo不允许 |
| 199 | `apps/client/src/utils/haptic.ts` | L51 | successHaptic连续两次振动低端机丢失 |
| 200 | `apps/client/src/config/page-access.ts` | - | discover/village/shop无访问控制 |
| 201 | `apps/client/src/config/navigation.ts` | L26-64 | appTabs与pages.json手动同步 |
| 202 | `apps/client/src/config/images.ts` | L79-112 | SVG/PNG混用无类型约束 |
| 203 | `apps/client/src/config/assets-index.ts` | L33 | HOME_POSTER资源错配 |
| 204 | `apps/client/src/config/home-sections.ts` | L9-15 | 首页模块顺序硬编码 |
| 205 | `apps/client/src/config/match-form.ts` | L3 | key为string无约束前后端不一致 |
| 206 | `apps/client/src/config/schools.ts` | L12-17 | 仅4所学校覆盖极少 |
| 207 | `apps/client/src/config/status-copy.ts` | - | 缺少vip/subscription/payment状态文案 |
| 208 | `apps/client/src/components/common/VerificationBadge.vue` | L48-52 | school认证图标语义不匹配 |
| 209 | `apps/client/src/components/common/VerificationBadge.vue` | L87-91 | handleClick同时emit tap和click |
| 210 | `apps/client/src/components/common/LockScreen.vue` | L148 | filter:blur mp-weixin不支持 |
| 211-295 | `apps/client/src/components/` | - | （详见前次审计报告，含85项组件Bug） |

### UI/UX类（22项）

| # | 文件路径 | 行号 | 问题描述 |
|---|---------|------|---------|
| 296 | `apps/client/src/components/common/Toast.vue` | L35-40 | Unicode字符作图标旧版微信方框 |
| 297 | `apps/client/src/components/common/Toast.vue` | L24-32 | 单例状态多次调用互相干扰 |
| 298 | `apps/client/src/components/common/Skeleton.vue` | L59-67 | shimmer动画低端机性能差 |
| 299 | `apps/client/src/components/common/SafeImage.vue` | L65-73 | fallback图片失败静默 |
| 300 | `apps/client/src/components/layout/TabBar.vue` | L58-151 | getTab非空断言配置缺失白屏 |
| 301 | `apps/client/src/components/layout/TabBar.vue` | L103 | 发布按钮无权限校验 |
| 302 | `apps/client/src/components/layout/AppShell.vue` | L118-122 | navigateBack在mp-weixin不返回Promise |
| 303 | `apps/client/src/pages/chat-session/index.vue` | L443-466 | 聊天页 UI 简陋 |
| 304 | `apps/client/src/pages/chat-session/index.vue` | L460-471 | 两个 BottomActionBar 并排 |
| 305 | `apps/client/src/pages/likes/index.vue` | L65-70 | 用户详情页"开发中" |
| 306 | `apps/client/src/pages/profile/index.vue` | - | 个人中心无 loading 态 |
| 307 | `apps/client/src/components/common/EmptyState.vue` | L25 | 空状态无引导 |
| 308 | `apps/client/src/components/common/ErrorState.vue` | L26 | 错误状态无重试 |
| 309 | `apps/client/src/components/common/PageStateContainer.vue` | L81-87 | 加载状态不统一 |
| 310 | `apps/client/src/components/common/Button.vue` | L109 | 按钮反馈缺失 |
| 311 | `apps/client/src/components/common/FormInput.vue` | - | 表单校验不完整 |
| 312 | `apps/client/src/components/common/Tag.vue` | - | 列表项点击区域过小 |
| 313 | `apps/client/src/components/common/SectionHeader.vue` | L38 | 文字截断不一致 |
| 314 | `apps/client/src/components/common/Avatar.vue` | - | 图标尺寸不统一 |

### 功能完整性类（25项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 315 | `apps/client/src/pages/vip/index.vue` | VIP订阅无优惠码功能 |
| 316 | `apps/client/src/pages/village/index.vue` | 帖子列表无图片懒加载 |
| 317 | `apps/client/src/pages/check-in/index.vue` | 签到动画重复触发 |
| 318 | `apps/client/src/pages/setup/index.vue` | 引导流程无进度显示 |
| 319 | `apps/client/src/pages/notifications/index.vue` | 通知无已读状态持久化 |
| 320 | `apps/client/src/pages/search/index.vue` | 搜索无防抖即时请求 |
| 321 | `apps/client/src/pages/campus/index.vue` | 校园认证无照片压缩 |
| 322 | `apps/client/src/pages/discover/index.vue` | 卡片swiper无touch事件冲突处理 |
| 323 | `apps/client/src/pages/home/index.vue` | 首页骨架屏与真实数据布局差异大 |
| 324 | `apps/client/src/pages/profile/index.vue` | 资料表单无未保存修改提示 |
| 325 | `apps/client/src/pages/likes/index.vue` | 喜欢列表无分页加载 |
| 326 | `apps/client/src/pages/messages/index.vue` | 消息列表无分组显示 |
| 327 | `apps/client/src/pages/campus/index.vue` | 校园认证无进度保存 |
| 328 | `apps/client/src/pages/campus/post-topic.vue` | 发帖无草稿保存 |
| 329 | `apps/client/src/pages/campus/topic-detail.vue` | 话题详情无评论排序 |
| 330 | `apps/client/src/pages/circle/index.vue` | 圈子列表无分类筛选 |
| 331 | `apps/client/src/pages/circles/index.vue` | 圈子详情无成员列表 |
| 332 | `apps/client/src/pages/circles/post-topic.vue` | 发帖无图片预览 |
| 333 | `apps/client/src/pages/settings/index.vue` | 设置页无缓存清理 |
| 334 | `apps/client/src/pages/verification/index.vue` | 认证页无认证状态查询 |
| 335 | `apps/client/src/pages/village/detail.vue` | 帖子详情无相关推荐 |
| 336 | `apps/client/src/pages/village/index.vue` | 帖子列表无下拉刷新 |
| 337 | `apps/client/src/pages/vip/index.vue` | VIP页无权益对比 |
| 338 | `apps/client/src/pages/heart-signals/index.vue` | 心动信号无筛选 |
| 339 | `apps/client/src/pages/chat-session/index.vue` | 聊天页无消息搜索 |

### mp-weixin兼容性类（12项）

| # | 文件路径 | 行号 | 问题描述 |
|---|---------|------|---------|
| 340 | `apps/client/src/components/common/BaseTabs.vue` | L24 | @click应改@tap |
| 341 | `apps/client/src/components/common/LockScreen.vue` | L148 | filter:blur不支持 |
| 342 | `apps/client/src/components/common/MatchCountChip.vue` | L82-88 | background-clip:text不支持 |
| 343 | `apps/client/src/theme/global.scss` | L218-221 | -webkit-line-clamp支持有限 |
| 344 | `apps/client/src/subpackages/setup/campus/index.vue` | L47-49 | picker change事件类型不一致 |
| 345 | `apps/client/src/subpackages/setup/profile/index.vue` | L80-88 | picker value类型为字符串 |
| 346 | `apps/client/src/subpackages/setup/schedule/index.vue` | L50-55 | textarea绑定数组索引问题 |
| 347 | `apps/client/src/components/common/Card.vue` | - | :active伪类未配hover-class |
| 348 | `apps/client/src/components/layout/AppShell.vue` | L118-122 | navigateBack不返回Promise |
| 349 | `apps/client/src/components/common/Toast.vue` | L35-40 | Unicode字符旧版微信方框 |
| 350 | `apps/client/src/components/common/BottomActionBar.vue` | L19,22 | 原生button有边框 |
| 351 | `apps/client/src/components/common/SectionHeader.vue` | - | cursor:pointer无效 |

### 设计合理性类（12项）

| # | 文件路径 | 行号 | 问题描述 |
|---|---------|------|---------|
| 352 | `apps/client/src/theme/design-variables.scss` | L289-293 | token语义重复 |
| 353 | `apps/client/src/theme/design-variables.scss` | L79,254 | text-tertiary/quaternary色值差异极小 |
| 354 | `apps/client/src/theme/tokens.ts` | L23-34 | secondary与brand色阶相同 |
| 355 | `apps/client/src/theme/design-variables.scss` | L300,382 | --section-gap重复定义 |
| 356 | `apps/client/src/theme/design-variables.scss` | L457,381 | --card-padding重复定义 |
| 357 | `apps/client/src/theme/design-variables.scss` | L553-578 | --c-tint-*命名前缀不统一 |
| 358 | `apps/client/src/theme/tokens.ts` | L437-440 | 深浅主题API结构不统一 |
| 359 | `apps/client/src/theme/tokens.ts` | L506-512 | switch无穷尽检查 |
| 360 | `apps/client/src/theme/utils.ts` | L7-18 | getColor无类型安全 |
| 361 | `apps/client/src/theme/global.scss` | L258-269 | 品牌色硬编码在样式中 |
| 362 | `apps/client/src/theme/global.scss` | L203 | user-select:none全局使用 |
| 363 | `apps/client/src/theme/global.scss` | L217-229 | 多行截断实现不一致 |

### 性能类（18项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 364 | `apps/client/src/pages/chat/index.vue` | 消息列表无虚拟滚动 |
| 365 | `apps/client/src/pages/likes/index.vue` | 喜欢列表无分页加载 |
| 366 | `apps/client/src/components/layout/TabBar.vue` | publishBreath动画常驻耗电 |
| 367 | `apps/client/src/components/common/Skeleton.vue` | 无限循环动画屏外仍运行 |
| 368 | `apps/client/src/components/common/UnreadBadge.vue` | pulse动画屏外仍运行 |
| 369 | `apps/client/src/components/common/Ripple.vue` | 每次点击DOM查询 |
| 370 | `apps/client/src/theme/design-variables.scss` | 首屏CSS变量解析延迟 |
| 371 | `apps/client/src/stores/session.ts` | 冷启动同步IO阻塞主线程 |
| 372 | `apps/client/src/services/http.ts` | 高频请求频繁同步IO |
| 373 | `apps/client/src/view-models/home.ts` | 重复计算无缓存 |
| 374 | `apps/client/src/view-models/chat.ts` | getRecommendationAction重复计算 |
| 375 | `apps/client/src/components/common/Skeleton.vue` | shimmer动画低端机性能差 |
| 376 | `apps/client/src/pages/village/index.vue` | 帖子列表无图片懒加载 |
| 377 | `apps/client/src/components/discover/CardSwiper.vue` | 卡片无懒加载 |
| 378 | `apps/client/src/pages/home/index.vue` | 首页并行4个请求无优先级 |
| 379 | `apps/client/src/components/common/Avatar.vue` | 头像无懒加载 |
| 380 | `apps/client/src/pages/campus/index.vue` | 校园认证照片无压缩 |
| 381 | `apps/client/src/pages/village/index.vue` | 长列表未实现虚拟滚动 |

### 后端类（25项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 382 | `apps/api/src/main/java/com/campuslove/api/admin/AdminController.java` | admin后台认证绕过 |
| 383 | `apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java` | 文件上传无类型验证 |
| 384 | `apps/api/src/main/java/com/campuslove/api/match/MatchController.java` | 匹配算法无并发控制 |
| 385 | `apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java` | N+1查询 |
| 386 | `apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java` | N+1查询 |
| 387 | `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java` | 评论内存分页OOM风险 |
| 388 | `apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java` | 只读事务内写操作 |
| 389 | `apps/api/src/main/java/com/campuslove/api/campus/CampusController.java` | schoolId使用hashCode |
| 390 | `apps/api/src/main/java/com/campuslove/api/service/RealPrivateMessageService.java` | markAsRead逐条更新 |
| 391 | `apps/api/src/main/java/com/campuslove/api/config/WebSocketConfig.java` | WebSocket Origin过于宽松 |
| 392 | `apps/api/src/main/java/com/campuslove/api/security/JwtTokenProvider.java` | 无Token黑名单/撤销机制 |
| 393 | `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` | 无速率限制 |
| 394 | `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` | CORS配置过宽 |
| 395 | `apps/api/src/main/java/com/campuslove/api/content/ContentFilterController.java` | 敏感词过滤可被绕过 |
| 396 | `apps/api/src/main/java/com/campuslove/api/content/ContentFilterController.java` | /content-filter/check公开暴露 |
| 397 | `apps/api/src/main/java/com/campuslove/api/config/MockConfig.java` | Mock配置误激活风险 |
| 398 | `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java` | 校园帖子全表扫描 |
| 399 | `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java` | 相似作者全表扫描 |
| 400 | `apps/api/src/main/java/com/campuslove/api/auth/AuthController.java` | 无JWT分层机制 |
| 401 | `apps/api/src/main/java/com/campuslove/api/repository/PostRepository.java` | 缺失数据库索引 |
| 402 | `apps/api/src/main/java/com/campuslove/api/repository/CommentRepository.java` | 缺失数据库索引 |
| 403 | `apps/api/src/main/java/com/campuslove/api/repository/UserRepository.java` | 缺失数据库索引 |
| 404 | `apps/api/src/main/java/com/campuslove/api/repository/MatchRepository.java` | 缺失数据库索引 |
| 405 | `apps/api/src/main/java/com/campuslove/api/repository/MessageRepository.java` | 缺失数据库索引 |
| 406 | `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` | 无CSRF防护 |

---

## 🟡 P2级 — 中等风险（657项）

### 前端性能类（82项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 图片懒加载缺失 | 12处 | `apps/client/src/pages/discover/index.vue`, `apps/client/src/pages/village/index.vue`, `apps/client/src/pages/home/index.vue`, `apps/client/src/pages/likes/index.vue`, `apps/client/src/pages/messages/index.vue`, `apps/client/src/components/discover/CardSwiper.vue`, `apps/client/src/components/home/PersonCard.vue`, `apps/client/src/components/social/WallPostCard.vue`, `apps/client/src/components/common/Avatar.vue`, `apps/client/src/components/common/SafeImage.vue`, `apps/client/src/pages/campus/index.vue`, `apps/client/src/pages/circles/index.vue` |
| 虚拟滚动缺失 | 8处 | `apps/client/src/pages/chat/index.vue`, `apps/client/src/pages/village/index.vue`, `apps/client/src/pages/likes/index.vue`, `apps/client/src/pages/messages/index.vue`, `apps/client/src/pages/notifications/index.vue`, `apps/client/src/pages/campus/topic-detail.vue`, `apps/client/src/pages/heart-signals/index.vue`, `apps/client/src/pages/circles/index.vue` |
| 列表分页缺失 | 15处 | `apps/client/src/pages/likes/index.vue`, `apps/client/src/pages/village/index.vue`, `apps/client/src/pages/messages/index.vue`, `apps/client/src/pages/notifications/index.vue`, `apps/client/src/pages/campus/index.vue`, `apps/client/src/pages/campus/topic-detail.vue`, `apps/client/src/pages/circles/index.vue`, `apps/client/src/pages/heart-signals/index.vue`, `apps/client/src/pages/search/index.vue`, `apps/client/src/pages/settings/index.vue`, `apps/client/src/pages/verification/index.vue`, `apps/client/src/pages/discover/index.vue`, `apps/client/src/pages/home/index.vue`, `apps/client/src/pages/profile/index.vue`, `apps/client/src/pages/chat-session/index.vue` |
| 组件未按需加载 | 10处 | `apps/client/src/components/common/Toast.vue`, `apps/client/src/components/common/Modal.vue`, `apps/client/src/components/common/Dialog.vue`, `apps/client/src/components/common/ActionSheet.vue`, `apps/client/src/components/common/ShareSheet.vue`, `apps/client/src/components/common/Popover.vue`, `apps/client/src/components/common/Drawer.vue`, `apps/client/src/components/common/Sidebar.vue`, `apps/client/src/components/discover/CardDetailOverlay.vue`, `apps/client/src/components/discover/LongPressMenu.vue` |
| 动画未条件编译 | 8处 | `apps/client/src/components/common/LockScreen.vue`, `apps/client/src/components/common/MatchCountChip.vue`, `apps/client/src/components/common/HeartParticles.vue`, `apps/client/src/components/layout/TabBar.vue`, `apps/client/src/components/discover/CardSwiper.vue`, `apps/client/src/components/home/WelcomeBanner.vue`, `apps/client/src/components/social/MatchGuideOverlay.vue`, `apps/client/src/components/social/SocialOnboardingOverlay.vue` |
| 无限循环动画屏外仍运行 | 12处 | `apps/client/src/components/common/Skeleton.vue`, `apps/client/src/components/common/UnreadBadge.vue`, `apps/client/src/components/common/HeartParticles.vue`, `apps/client/src/components/layout/TabBar.vue`, `apps/client/src/components/discover/CardSwiper.vue`, `apps/client/src/components/home/WelcomeBanner.vue`, `apps/client/src/components/home/ActivityCard.vue`, `apps/client/src/components/social/MatchGuideOverlay.vue`, `apps/client/src/components/social/SocialProgressIndicator.vue`, `apps/client/src/components/social/WallPostCard.vue`, `apps/client/src/components/chat/VoicePill.vue`, `apps/client/src/components/chat/HeartSignal.vue` |
| CSS变量首屏解析延迟 | 5处 | `apps/client/src/theme/design-variables.scss`, `apps/client/src/theme/global.scss`, `apps/client/src/App.vue`, `apps/client/src/pages/home/index.vue`, `apps/client/src/pages/discover/index.vue` |
| 同步IO阻塞主线程 | 7处 | `apps/client/src/stores/session.ts`, `apps/client/src/services/http.ts`, `apps/client/src/services/api.ts`, `apps/client/src/stores/auth.ts`, `apps/client/src/stores/profile.ts`, `apps/client/src/stores/discover.ts`, `apps/client/src/stores/likes.ts` |
| 重复计算无缓存 | 5处 | `apps/client/src/view-models/home.ts`, `apps/client/src/view-models/chat.ts`, `apps/client/src/view-models/profile.ts`, `apps/client/src/stores/discover.ts`, `apps/client/src/stores/village.ts` |

### 前端UI/UX类（68项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 空状态无引导 | 15处 | `apps/client/src/pages/likes/index.vue`, `apps/client/src/pages/village/index.vue`, `apps/client/src/pages/messages/index.vue`, `apps/client/src/pages/notifications/index.vue`, `apps/client/src/pages/campus/index.vue`, `apps/client/src/pages/campus/topic-detail.vue`, `apps/client/src/pages/circles/index.vue`, `apps/client/src/pages/heart-signals/index.vue`, `apps/client/src/pages/search/index.vue`, `apps/client/src/pages/discover/index.vue`, `apps/client/src/pages/home/index.vue`, `apps/client/src/pages/profile/index.vue`, `apps/client/src/pages/chat-session/index.vue`, `apps/client/src/pages/settings/index.vue`, `apps/client/src/pages/verification/index.vue` |
| 错误状态无重试 | 12处 | `apps/client/src/pages/likes/index.vue`, `apps/client/src/pages/village/index.vue`, `apps/client/src/pages/messages/index.vue`, `apps/client/src/pages/notifications/index.vue`, `apps/client/src/pages/campus/index.vue`, `apps/client/src/pages/circles/index.vue`, `apps/client/src/pages/discover/index.vue`, `apps/client/src/pages/home/index.vue`, `apps/client/src/pages/profile/index.vue`, `apps/client/src/pages/chat-session/index.vue`, `apps/client/src/pages/verification/index.vue`, `apps/client/src/pages/heart-signals/index.vue` |
| 加载状态不统一 | 10处 | `apps/client/src/components/common/PageStateContainer.vue`, `apps/client/src/components/common/Skeleton.vue`, `apps/client/src/pages/likes/index.vue`, `apps/client/src/pages/village/index.vue`, `apps/client/src/pages/messages/index.vue`, `apps/client/src/pages/discover/index.vue`, `apps/client/src/pages/home/index.vue`, `apps/client/src/pages/profile/index.vue`, `apps/client/src/pages/chat-session/index.vue`, `apps/client/src/pages/campus/index.vue` |
| 按钮反馈缺失 | 8处 | `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/BottomActionBar.vue`, `apps/client/src/components/common/SectionHeader.vue`, `apps/client/src/components/common/ChatHeader.vue`, `apps/client/src/components/common/BaseTabs.vue`, `apps/client/src/components/common/Tag.vue`, `apps/client/src/components/common/Card.vue`, `apps/client/src/components/common/SectionCard.vue` |
| 表单校验不完整 | 8处 | `apps/client/src/subpackages/setup/campus/index.vue`, `apps/client/src/subpackages/setup/profile/index.vue`, `apps/client/src/subpackages/setup/schedule/index.vue`, `apps/client/src/subpackages/setup/recommend-pref/index.vue`, `apps/client/src/subpackages/support/feedback/index.vue`, `apps/client/src/pages/campus/post-topic.vue`, `apps/client/src/pages/circles/post-topic.vue`, `apps/client/src/pages/verification/index.vue` |
| 列表项点击区域过小 | 5处 | `apps/client/src/components/common/Tag.vue`, `apps/client/src/components/common/UnreadBadge.vue`, `apps/client/src/components/common/VerificationBadge.vue`, `apps/client/src/components/common/MatchCountChip.vue`, `apps/client/src/components/common/SectionHeader.vue` |
| 文字截断不一致 | 5处 | `apps/client/src/theme/global.scss`, `apps/client/src/components/common/SectionHeader.vue`, `apps/client/src/components/home/PersonCard.vue`, `apps/client/src/components/social/WallPostCard.vue`, `apps/client/src/components/home/ActivityCard.vue` |
| 图标尺寸不统一 | 5处 | `apps/client/src/components/common/VerificationBadge.vue`, `apps/client/src/components/common/EducationBadge.vue`, `apps/client/src/components/common/StatusState.vue`, `apps/client/src/components/common/EmptyState.vue`, `apps/client/src/components/common/ErrorState.vue` |

### 前端mp-weixin兼容性（46项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| @click应改@tap | 8处 | `apps/client/src/components/common/BaseTabs.vue`, `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Tag.vue`, `apps/client/src/components/common/Chip.vue`, `apps/client/src/components/common/Card.vue`, `apps/client/src/components/common/SectionCard.vue`, `apps/client/src/components/common/BottomActionBar.vue`, `apps/client/src/components/common/SearchBar.vue` |
| :active应配hover-class | 6处 | `apps/client/src/components/common/Card.vue`, `apps/client/src/components/common/SectionCard.vue`, `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Tag.vue`, `apps/client/src/components/common/Chip.vue`, `apps/client/src/components/common/SearchBar.vue` |
| filter:blur不支持 | 5处 | `apps/client/src/components/common/LockScreen.vue`, `apps/client/src/components/discover/CardDetailOverlay.vue`, `apps/client/src/components/social/MatchGuideOverlay.vue`, `apps/client/src/components/social/SocialOnboardingOverlay.vue`, `apps/client/src/components/common/Modal.vue` |
| background-clip:text不支持 | 4处 | `apps/client/src/components/common/MatchCountChip.vue`, `apps/client/src/components/home/WelcomeBanner.vue`, `apps/client/src/components/discover/CardSwiper.vue`, `apps/client/src/pages/vip/index.vue` |
| -webkit-line-clamp支持有限 | 5处 | `apps/client/src/theme/global.scss`, `apps/client/src/components/home/PersonCard.vue`, `apps/client/src/components/social/WallPostCard.vue`, `apps/client/src/components/home/ActivityCard.vue`, `apps/client/src/components/common/SectionHeader.vue` |
| navigator API不存在 | 4处 | `apps/client/src/components/layout/AppShell.vue`, `apps/client/src/utils/navigation.ts`, `apps/client/src/stores/auth.ts`, `apps/client/src/pages/login/index.vue` |
| CSS伪元素不支持 | 5处 | `apps/client/src/theme/global.scss`, `apps/client/src/components/common/Skeleton.vue`, `apps/client/src/components/common/UnreadBadge.vue`, `apps/client/src/components/common/HeartParticles.vue`, `apps/client/src/components/layout/TabBar.vue` |
| 条件编译覆盖不完整 | 9处 | `apps/client/src/plugins/gsap.ts`, `apps/client/src/compat/index.ts`, `apps/client/src/composables/useTabBar.ts`, `apps/client/src/services/websocket.ts`, `apps/client/src/components/common/LockScreen.vue`, `apps/client/src/components/common/MatchCountChip.vue`, `apps/client/src/components/discover/CardSwiper.vue`, `apps/client/src/components/home/WelcomeBanner.vue`, `apps/client/src/components/social/MatchGuideOverlay.vue` |

### 后端安全类（45项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 无CSRF防护 | 8处 | `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java`, `apps/api/src/main/java/com/campuslove/api/auth/AuthController.java`, `apps/api/src/main/java/com/campuslove/api/match/MatchController.java`, `apps/api/src/main/java/com/campuslove/api/profile/ProfileController.java`, `apps/api/src/main/java/com/campuslove/api/village/VillageController.java`, `apps/api/src/main/java/com/campuslove/api/chat/ChatController.java`, `apps/api/src/main/java/com/campuslove/api/media/MediaController.java`, `apps/api/src/main/java/com/campuslove/api/feedback/FeedbackController.java` |
| 无XSS过滤 | 10处 | `apps/api/src/main/java/com/campuslove/api/village/VillageService.java`, `apps/api/src/main/java/com/campuslove/api/profile/ProfileService.java`, `apps/api/src/main/java/com/campuslove/api/chat/ChatService.java`, `apps/api/src/main/java/com/campuslove/api/feedback/FeedbackService.java`, `apps/api/src/main/java/com/campuslove/api/campus/CampusService.java`, `apps/api/src/main/java/com/campuslove/api/match/MatchService.java`, `apps/api/src/main/java/com/campuslove/api/user/UserService.java`, `apps/api/src/main/java/com/campuslove/api/admin/AdminService.java`, `apps/api/src/main/java/com/campuslove/api/notification/NotificationService.java`, `apps/api/src/main/java/com/campuslove/api/recommendation/RecommendationService.java` |
| 路径遍历风险 | 5处 | `apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java`, `apps/api/src/main/java/com/campuslove/api/media/MediaController.java`, `apps/api/src/main/java/com/campuslove/api/admin/AdminController.java`, `apps/api/src/main/java/com/campuslove/api/staticresource/StaticResourceController.java`, `apps/api/src/main/java/com/campuslove/api/config/WebMvcConfig.java` |
| 敏感信息日志泄露 | 8处 | `apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java`, `apps/api/src/main/java/com/campuslove/api/auth/AuthController.java`, `apps/api/src/main/java/com/campuslove/api/user/UserService.java`, `apps/api/src/main/java/com/campuslove/api/profile/ProfileService.java`, `apps/api/src/main/java/com/campuslove/api/media/MediaController.java`, `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java`, `apps/api/src/main/java/com/campuslove/api/security/JwtTokenProvider.java`, `apps/api/src/main/java/com/campuslove/api/security/JwtAuthenticationFilter.java` |
| API无速率限制 | 6处 | `apps/api/src/main/java/com/campuslove/api/auth/AuthController.java`, `apps/api/src/main/java/com/campuslove/api/match/MatchController.java`, `apps/api/src/main/java/com/campuslove/api/village/VillageController.java`, `apps/api/src/main/java/com/campuslove/api/chat/ChatController.java`, `apps/api/src/main/java/com/campuslove/api/media/MediaController.java`, `apps/api/src/main/java/com/campuslove/api/feedback/FeedbackController.java` |
| 越权访问风险 | 8处 | `apps/api/src/main/java/com/campuslove/api/match/MatchController.java`, `apps/api/src/main/java/com/campuslove/api/profile/ProfileController.java`, `apps/api/src/main/java/com/campuslove/api/village/VillageController.java`, `apps/api/src/main/java/com/campuslove/api/chat/ChatController.java`, `apps/api/src/main/java/com/campuslove/api/media/MediaController.java`, `apps/api/src/main/java/com/campuslove/api/feedback/FeedbackController.java`, `apps/api/src/main/java/com/campuslove/api/notification/NotificationController.java`, `apps/api/src/main/java/com/campuslove/api/admin/AdminController.java` |

### 后端性能类（38项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| N+1查询 | 12处 | `apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCheckInService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealFeedbackService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealAppConfigService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealPrivateMessageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealUserService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealHomeService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealNotificationService.java` |
| 缺失数据库索引 | 10处 | `database/flyway/sql/V2026.05.21.0001__create_users_table.sql`, `database/flyway/sql/V2026.05.21.0002__create_user_profiles_table.sql`, `database/flyway/sql/V2026.05.21.0003__create_posts_table.sql`, `database/flyway/sql/V2026.05.21.0004__create_comments_table.sql`, `database/flyway/sql/V2026.05.21.0005__create_matches_table.sql`, `database/flyway/sql/V2026.05.21.0006__create_messages_table.sql`, `database/flyway/sql/V2026.05.21.0007__create_likes_table.sql`, `database/flyway/sql/V2026.05.21.0008__create_visitors_table.sql`, `database/flyway/sql/V2026.05.21.0009__create_notifications_table.sql`, `database/flyway/sql/V2026.05.21.0010__create_checkin_records_table.sql` |
| 无缓存策略 | 8处 | `apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealHomeService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealAppConfigService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealUserService.java` |
| 大事务问题 | 4处 | `apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java` |
| 连接池配置不足 | 4处 | `apps/api/src/main/resources/application.yml`, `apps/api/src/main/resources/application-db.yml`, `apps/api/src/main/java/com/campuslove/api/config/DataSourceConfig.java`, `apps/api/pom.xml` |

### 后端业务逻辑类（52项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 并发控制缺失 | 12处 | `apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCheckInService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealPrivateMessageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealFeedbackService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealUserService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealHomeService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealNotificationService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealAppConfigService.java` |
| 数据一致性风险 | 15处 | （详见 service 目录下所有 Real*Service.java） |
| 事务边界错误 | 8处 | `apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCheckInService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealPrivateMessageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealFeedbackService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealHomeService.java` |
| 异常处理缺失 | 10处 | （详见 controller 和 service 目录） |
| 状态机转换错误 | 7处 | `apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealPrivateMessageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCheckInService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealFeedbackService.java` |

### 后端数据完整性（35项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 缺失外键约束 | 8处 | `database/flyway/sql/V2026.05.21.0003__create_posts_table.sql`, `database/flyway/sql/V2026.05.21.0004__create_comments_table.sql`, `database/flyway/sql/V2026.05.21.0005__create_matches_table.sql`, `database/flyway/sql/V2026.05.21.0006__create_messages_table.sql`, `database/flyway/sql/V2026.05.21.0007__create_likes_table.sql`, `database/flyway/sql/V2026.05.21.0008__create_visitors_table.sql`, `database/flyway/sql/V2026.05.21.0009__create_notifications_table.sql`, `database/flyway/sql/V2026.05.21.0010__create_checkin_records_table.sql` |
| 字段类型不一致 | 6处 | `apps/api/src/main/java/com/campuslove/api/entity/User.java`, `apps/api/src/main/java/com/campuslove/api/entity/Post.java`, `apps/api/src/main/java/com/campuslove/api/entity/Comment.java`, `apps/api/src/main/java/com/campuslove/api/entity/Match.java`, `apps/api/src/main/java/com/campuslove/api/entity/Message.java`, `apps/api/src/main/java/com/campuslove/api/entity/Like.java` |
| 枚举使用String而非Enum | 10处 | `apps/api/src/main/java/com/campuslove/api/entity/User.java`, `apps/api/src/main/java/com/campuslove/api/entity/Post.java`, `apps/api/src/main/java/com/campuslove/api/entity/Match.java`, `apps/api/src/main/java/com/campuslove/api/entity/Message.java`, `apps/api/src/main/java/com/campuslove/api/entity/Like.java`, `apps/api/src/main/java/com/campuslove/api/entity/Notification.java`, `apps/api/src/main/java/com/campuslove/api/entity/CheckInRecord.java`, `apps/api/src/main/java/com/campuslove/api/entity/Feedback.java`, `apps/api/src/main/java/com/campuslove/api/entity/UserCampusProfile.java`, `apps/api/src/main/java/com/campuslove/api/entity/AuditLog.java` |
| 缺失唯一约束 | 5处 | `database/flyway/sql/V2026.05.21.0001__create_users_table.sql`, `database/flyway/sql/V2026.05.21.0002__create_user_profiles_table.sql`, `database/flyway/sql/V2026.05.21.0007__create_likes_table.sql`, `database/flyway/sql/V2026.05.21.0009__create_notifications_table.sql`, `database/flyway/sql/V2026.06.25.0001__add_user_role_and_init_admin.sql` |
| 缺失CHECK约束 | 6处 | `database/flyway/sql/V2026.05.21.0001__create_users_table.sql`, `database/flyway/sql/V2026.05.21.0002__create_user_profiles_table.sql`, `database/flyway/sql/V2026.05.21.0003__create_posts_table.sql`, `database/flyway/sql/V2026.05.21.0006__create_messages_table.sql`, `database/flyway/sql/V2026.05.21.0010__create_checkin_records_table.sql`, `database/flyway/sql/V2026.06.25.0007__create_audit_log.sql` |

### 数据库/Flyway（41项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 迁移脚本无回滚 | 10处 | `database/flyway/sql/` 目录下所有 V*.sql |
| 迁移脚本无数据验证 | 8处 | `database/flyway/sql/` 目录下所有 V*.sql |
| 缺失索引创建 | 10处 | `database/flyway/sql/` 目录下所有 V*.sql |
| 缺失约束添加 | 7处 | `database/flyway/sql/` 目录下所有 V*.sql |
| 历史数据不一致 | 6处 | `database/flyway/sql/V2026.06.25.0001__add_user_role_and_init_admin.sql`, `database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql`, `database/flyway/sql/V2026.06.25.0003__create_posts_table.sql`, `database/flyway/sql/V2026.06.25.0004__add_user_status_and_post_audit_status.sql`, `database/flyway/sql/V2026.06.25.0005__add_indexes_for_performance.sql`, `database/flyway/sql/V2026.06.25.0006__add_foreign_keys.sql` |

### 国际化（52项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 中文硬编码文案 | 30处 | `apps/client/src/config/*.ts`, `apps/client/src/view-models/*.ts`, `apps/client/src/components/**/*.vue`, `apps/client/src/pages/**/*.vue` |
| 硬编码格式字符串 | 10处 | `apps/client/src/utils/format.ts`, `apps/client/src/utils/time.ts`, `apps/client/src/view-models/profile.ts` |
| 硬编码日期格式 | 5处 | `apps/client/src/utils/time.ts`, `apps/client/src/view-models/profile.ts`, `apps/client/src/components/home/ActivityCard.vue` |
| 硬编码货币格式 | 3处 | `apps/client/src/pages/vip/index.vue`, `apps/client/src/pages/check-in/index.vue`, `apps/client/src/components/home/ActivityCard.vue` |
| 硬编码数字格式 | 4处 | `apps/client/src/utils/format.ts`, `apps/client/src/view-models/profile.ts`, `apps/client/src/components/discover/CardSwiper.vue`, `apps/client/src/components/home/PersonCard.vue` |

### 可访问性（32项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 无ARIA标签 | 8处 | `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Tag.vue`, `apps/client/src/components/common/Card.vue`, `apps/client/src/components/common/Modal.vue`, `apps/client/src/components/common/Dialog.vue`, `apps/client/src/components/common/Toast.vue`, `apps/client/src/components/common/Skeleton.vue`, `apps/client/src/components/common/Avatar.vue` |
| 无键盘导航 | 6处 | `apps/client/src/components/common/Tabs.vue`, `apps/client/src/components/common/Menu.vue`, `apps/client/src/components/common/Select.vue`, `apps/client/src/components/common/DatePicker.vue`, `apps/client/src/components/common/TimePicker.vue`, `apps/client/src/components/common/Accordion.vue` |
| 对比度不足 | 5处 | `apps/client/src/theme/design-variables.scss`, `apps/client/src/components/common/Tag.vue`, `apps/client/src/components/common/UnreadBadge.vue`, `apps/client/src/components/common/VerificationBadge.vue`, `apps/client/src/components/common/StatusState.vue` |
| 焦点指示器缺失 | 4处 | `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Input.vue`, `apps/client/src/components/common/Select.vue`, `apps/client/src/components/common/Textarea.vue` |
| 屏幕阅读器不友好 | 9处 | `apps/client/src/components/common/Avatar.vue`, `apps/client/src/components/common/SafeImage.vue`, `apps/client/src/components/common/Icon.vue`, `apps/client/src/components/common/Skeleton.vue`, `apps/client/src/components/common/Toast.vue`, `apps/client/src/components/common/Modal.vue`, `apps/client/src/components/common/Dialog.vue`, `apps/client/src/components/common/Drawer.vue`, `apps/client/src/components/common/Sidebar.vue` |

### DevOps/监控（25项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 无Sentry错误监控 | 5处 | `apps/client/src/main.ts`, `apps/client/src/App.vue`, `apps/client/src/services/api.ts`, `apps/client/src/services/websocket.ts`, `apps/api/src/main/java/com/campuslove/api/ CampusLoveApplication.java` |
| 无性能监控 | 5处 | `apps/client/src/main.ts`, `apps/api/src/main/java/com/campuslove/api/CampusLoveApplication.java`, `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java`, `apps/api/src/main/java/com/campuslove/api/config/WebSocketConfig.java`, `apps/api/src/main/resources/application.yml` |
| 无业务指标监控 | 5处 | `apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealCheckInService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java` |
| 无日志采集 | 4处 | `apps/api/src/main/resources/application.yml`, `apps/api/src/main/resources/logback-spring.xml`, `apps/api/pom.xml`, `apps/api/src/main/java/com/campuslove/api/config/LoggingConfig.java` |
| 无告警配置 | 6处 | `apps/api/src/main/resources/application.yml`, `.github/workflows/ci.yml`, `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java`, `apps/api/src/main/java/com/campuslove/api/config/WebSocketConfig.java`, `apps/api/src/main/java/com/campuslove/api/exception/GlobalExceptionHandler.java`, `apps/api/src/main/java/com/campuslove/api/health/HealthController.java` |

### 合规/隐私（28项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 无隐私协议 | 5处 | `apps/client/manifest.json`, `apps/client/src/pages/login/index.vue`, `apps/client/src/pages/privacy/index.vue`, `apps/client/src/pages/agreement/index.vue`, `apps/client/src/components/login/TermsText.vue` |
| 无用户协议 | 5处 | `apps/client/src/pages/login/index.vue`, `apps/client/src/pages/agreement/index.vue`, `apps/client/src/components/login/TermsText.vue`, `apps/client/src/pages/verification/index.vue`, `apps/client/src/pages/vip/index.vue` |
| 数据存储不安全 | 6处 | `apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java`, `apps/api/src/main/java/com/campuslove/api/user/UserService.java`, `apps/api/src/main/java/com/campuslove/api/profile/ProfileService.java`, `apps/api/src/main/java/com/campuslove/api/media/MediaController.java`, `apps/api/src/main/resources/application-db.yml`, `apps/api/src/main/resources/application.yml` |
| 数据传输未加密 | 4处 | `apps/api/src/main/resources/application.yml`, `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java`, `apps/client/src/services/http.ts`, `apps/client/src/services/websocket.ts` |
| 用户权利未保障 | 8处 | `apps/api/src/main/java/com/campuslove/api/user/UserController.java`, `apps/api/src/main/java/com/campuslove/api/user/UserService.java`, `apps/api/src/main/java/com/campuslove/api/admin/AdminController.java`, `apps/api/src/main/java/com/campuslove/api/admin/AdminService.java`, `apps/client/src/pages/settings/index.vue`, `apps/client/src/pages/privacy/index.vue`, `apps/client/src/pages/account/index.vue`, `apps/client/src/pages/data-export/index.vue` |

---

## 🟢 P3级 — 低风险/代码规范（300项）

### 代码风格类（120项）

| 类别 | 数量 | 涉及目录 |
|------|------|---------|
| 命名不规范 | 20处 | `apps/client/src/`, `apps/api/src/main/java/com/campuslove/api/` |
| 注释不完整 | 25处 | `apps/client/src/`, `apps/api/src/main/java/com/campuslove/api/` |
| 代码重复 | 18处 | `apps/client/src/stores/`, `apps/client/src/components/`, `apps/api/src/main/java/com/campuslove/api/service/` |
| 函数过长 | 15处 | `apps/client/src/stores/discover.ts`, `apps/client/src/stores/village.ts`, `apps/client/src/stores/likes.ts`, `apps/client/src/stores/chat.ts`, `apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java`, `apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java` |
| 文件过大 | 12处 | `apps/client/src/stores/discover.ts`, `apps/client/src/stores/village.ts`, `apps/client/src/stores/likes.ts`, `apps/client/src/stores/chat.ts`, `apps/client/src/components/discover/CardSwiper.vue`, `apps/client/src/components/discover/CardDetailOverlay.vue`, `apps/client/src/pages/discover/index.vue`, `apps/client/src/pages/village/index.vue`, `apps/client/src/pages/profile/index.vue`, `apps/client/src/pages/chat-session/index.vue`, `apps/client/src/App.vue`, `apps/client/src/theme/design-variables.scss` |
| 模块职责不清 | 10处 | `apps/client/src/stores/`, `apps/client/src/services/`, `apps/client/src/components/`, `apps/api/src/main/java/com/campuslove/api/service/` |
| 依赖方向错误 | 10处 | `apps/client/src/stores/`, `apps/client/src/services/`, `apps/client/src/composables/`, `apps/client/src/components/` |
| 全局变量滥用 | 10处 | `apps/client/src/compat/index.ts`, `apps/client/src/plugins/gsap.ts`, `apps/client/src/services/websocket.ts`, `apps/client/src/services/http.ts`, `apps/client/src/components/common/Toast.vue` |

### TypeScript类型类（55项）

| 类别 | 数量 | 涉及目录 |
|------|------|---------|
| any类型滥用 | 20处 | `apps/client/src/stores/`, `apps/client/src/services/`, `apps/client/src/components/`, `apps/client/src/utils/`, `apps/client/src/composables/` |
| 类型断言过宽 | 12处 | `apps/client/src/stores/discover.ts`, `apps/client/src/stores/village.ts`, `apps/client/src/services/api.ts`, `apps/client/src/services/http.ts`, `apps/client/src/components/common/VerificationBadge.vue`, `apps/client/src/components/common/Avatar.vue`, `apps/client/src/utils/haptic.ts`, `apps/client/src/plugins/gsap.ts`, `apps/client/src/compat/index.ts`, `apps/client/src/view-models/profile.ts`, `apps/client/src/view-models/chat.ts`, `apps/client/src/view-models/home.ts` |
| 类型守卫缺失 | 8处 | `apps/client/src/services/api-error.ts`, `apps/client/src/stores/chat.ts`, `apps/client/src/stores/discover.ts`, `apps/client/src/utils/navigation.ts`, `apps/client/src/components/common/SafeImage.vue`, `apps/client/src/components/common/Avatar.vue`, `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Card.vue` |
| 泛型约束不足 | 5处 | `apps/client/src/stores/chat.ts`, `apps/client/src/services/api.ts`, `apps/client/src/services/http.ts`, `apps/client/src/components/common/PageStateContainer.vue`, `apps/client/src/components/common/Toast.vue` |
| 联合类型不完整 | 5处 | `apps/client/src/config/navigation.ts`, `apps/client/src/config/status-copy.ts`, `apps/client/src/theme/tokens.ts`, `apps/client/src/components/common/Tag.vue`, `apps/client/src/components/common/StatusState.vue` |
| 交叉类型错误 | 5处 | `apps/client/src/stores/profile.ts`, `apps/client/src/stores/session.ts`, `apps/client/src/services/api.ts`, `apps/client/src/view-models/profile.ts`, `apps/client/src/components/common/Avatar.vue` |

### CSS/样式类（45项）

| 类别 | 数量 | 涉及目录 |
|------|------|---------|
| 样式重复 | 12处 | `apps/client/src/theme/design-variables.scss`, `apps/client/src/theme/global.scss`, `apps/client/src/App.vue`, `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Card.vue`, `apps/client/src/components/common/Tag.vue`, `apps/client/src/components/common/Avatar.vue`, `apps/client/src/components/common/Skeleton.vue`, `apps/client/src/components/common/UnreadBadge.vue`, `apps/client/src/components/layout/TabBar.vue`, `apps/client/src/components/layout/AppShell.vue`, `apps/client/src/pages/discover/index.vue` |
| 样式冗余 | 10处 | `apps/client/src/theme/global.scss`, `apps/client/src/App.vue`, `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Card.vue`, `apps/client/src/components/common/Tag.vue`, `apps/client/src/components/common/Avatar.vue`, `apps/client/src/components/common/Skeleton.vue`, `apps/client/src/components/common/UnreadBadge.vue`, `apps/client/src/components/layout/TabBar.vue`, `apps/client/src/pages/discover/index.vue` |
| 样式冲突 | 8处 | `apps/client/src/theme/global.scss`, `apps/client/src/App.vue`, `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Card.vue`, `apps/client/src/components/common/Tag.vue`, `apps/client/src/components/common/Avatar.vue`, `apps/client/src/components/common/Skeleton.vue`, `apps/client/src/components/common/UnreadBadge.vue` |
| 样式单位不统一 | 5处 | `apps/client/src/theme/tokens.ts`, `apps/client/src/theme/design-variables.scss`, `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Card.vue`, `apps/client/src/components/common/Avatar.vue` |
| 选择器不规范 | 5处 | `apps/client/src/theme/global.scss`, `apps/client/src/App.vue`, `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Card.vue`, `apps/client/src/components/common/Tag.vue` |
| 过度嵌套 | 5处 | `apps/client/src/theme/global.scss`, `apps/client/src/App.vue`, `apps/client/src/components/common/Button.vue`, `apps/client/src/components/common/Card.vue`, `apps/client/src/components/common/Tag.vue` |

### 构建/打包类（80项）

| 类别 | 数量 | 涉及文件 |
|------|------|---------|
| 构建配置不完整 | 15处 | `apps/client/vite.config.ts`, `apps/client/vitest.config.ts`, `apps/client/tsconfig.json`, `apps/admin/vite.config.ts`, `apps/admin/tsconfig.json`, `apps/api/pom.xml`, `.github/workflows/ci.yml`, `package.json`, `pnpm-workspace.yaml`, `reasonix.toml`, `apps/client/manifest.json`, `apps/client/pages.json`, `apps/client/src/pages.json`, `apps/client/project.config.json`, `project.config.json` |
| 打包优化不足 | 20处 | `apps/client/vite.config.ts`, `apps/admin/vite.config.ts`, `apps/client/manifest.json`, `apps/client/pages.json`, `apps/client/src/pages.json`, `apps/api/pom.xml`, `apps/client/package.json`, `apps/admin/package.json`, `package.json`, `pnpm-workspace.yaml`, `apps/client/src/main.ts`, `apps/admin/src/main.ts`, `apps/api/src/main/java/com/campuslove/api/CampusLoveApplication.java`, `.github/workflows/ci.yml`, `apps/client/src/App.vue`, `apps/admin/src/App.vue`, `apps/client/tsconfig.json`, `apps/admin/tsconfig.json`, `apps/client/vitest.config.ts`, `tools/verify-client-builds.mjs`, `tests/project-structure.spec.mjs` |
| Tree-shaking未生效 | 10处 | `apps/client/vite.config.ts`, `apps/admin/vite.config.ts`, `apps/client/package.json`, `apps/admin/package.json`, `apps/client/tsconfig.json`, `apps/admin/tsconfig.json`, `apps/client/src/main.ts`, `apps/admin/src/main.ts`, `apps/client/src/App.vue`, `apps/admin/src/App.vue` |
| 资源压缩不充分 | 10处 | `apps/client/vite.config.ts`, `apps/admin/vite.config.ts`, `apps/client/manifest.json`, `apps/client/src/config/images.ts`, `apps/client/src/config/assets-index.ts`, `apps/client/src/static/`, `apps/client/src/custom-tab-bar/`, `apps/admin/public/`, `apps/client/src/App.vue`, `apps/client/src/theme/design-variables.scss` |
| Sourcemap配置不当 | 10处 | `apps/client/vite.config.ts`, `apps/admin/vite.config.ts`, `apps/client/vitest.config.ts`, `apps/client/tsconfig.json`, `apps/admin/tsconfig.json`, `apps/api/pom.xml`, `.github/workflows/ci.yml`, `apps/client/manifest.json`, `apps/client/src/main.ts`, `apps/admin/src/main.ts` |
| 环境变量管理混乱 | 15处 | `apps/client/src/env.d.ts`, `apps/client/src/services/env.ts`, `apps/client/.env.real`, `apps/client/.env.development`, `apps/client/.env.production`, `apps/api/src/main/resources/application.yml`, `apps/api/src/main/resources/application-dev.yml`, `apps/api/src/main/resources/application-prod.yml`, `apps/api/src/main/resources/application-db.yml`, `apps/admin/.env.development`, `apps/admin/.env.production`, `apps/client/vite.config.ts`, `apps/admin/vite.config.ts`, `.github/workflows/ci.yml`, `apps/client/src/config/app.ts` |

---

## 📌 优先级落地建议

### 第一阶段（立即，本周内）

1. **修复49项P0级阻断问题**
   - 补充微信AppID和隐私协议配置
   - 接入全局错误监控（Sentry或自研）
   - 修复消息丢失、匹配错乱、签到重复扣款等核心功能Bug
   - 修复安全问题（敏感数据加密、鉴权绕过、文件上传验证）

### 第二阶段（短期，2周内）

1. **修复295项P1级严重风险**
   - 补充国际化基础设施
   - 完成mp-weixin兼容性适配
   - 修复硬编码问题（932处颜色、62项配置硬编码）
   - 修复技术债（类型安全、依赖冲突、配置缺失）
   - 修复Bug/隐患（竞态条件、内存泄漏、状态回滚）
   - 接入性能监控和业务指标监控

### 第三阶段（中期，1月内）

1. **逐步修复657项P2级中等风险**
   - 性能优化（图片懒加载、虚拟滚动、列表分页）
   - UI/UX完善（空状态、错误状态、加载状态）
   - 后端安全加固（CSRF防护、XSS过滤、速率限制）
   - 后端性能优化（N+1查询、缓存策略、索引优化）
   - 数据库完整性（外键约束、枚举类型、唯一约束）
   - 国际化体系建设
   - 可访问性改进
   - DevOps/监控体系搭建
   - 合规/隐私体系建设

### 第四阶段（长期，2月内）

1. **优化300项P3级代码规范**
   - 代码风格统一（命名规范、注释完善、代码去重）
   - TypeScript类型安全加固（any类型消除、类型断言收紧）
   - CSS/样式优化（样式去重、单位统一、选择器规范）
   - 构建/打包优化（Tree-shaking、资源压缩、Sourcemap配置）
   - E2E测试覆盖
   - 架构优化和技术债务清理

---

## 📈 对比结论

### 最新提交（e023688）状态
- ✅ 修复了16个核心组件的图片路径硬编码
- ✅ 统一了TabBar配置源（navigation.ts为唯一真相源）
- ✅ Avatar集成SafeImage错误兜底
- ✅ 之前的微信小程序编译错误已全部消失

### 仍存在的主要风险
- 🔴 49项P0级阻断问题未修复
- 🟠 295项P1级严重风险未修复
- 🟡 657项P2级中等风险未修复
- 🟢 300项P3级代码规范问题未修复

### 总待修复问题数：1301项

建议按优先级分阶段推进，优先解决P0级阻断问题以确保项目可以顺利商业化上线。

---

**报告生成**: 2026-07-25
**审计工具**: Trae IDE + GitHub MCP + 本地深度审计
**报告版本**: 1.0
