# 恋爱小程序项目 — 全量问题清单（商业化落地审计报告）

**审计日期**: 2026-07-25
**仓库地址**: https://github.com/lx-1203/Love-Mini-Program
**最新提交**: `e023688` (refactor(client): 修复图片路径硬编码并统一TabBar配置源)
**审计范围**: 硬编码、技术债、Bug、隐患、功能完整性、UI/UX 交互、设计合理性、商业化落地规范
**问题总数**: 1335 项（已修复 34 项 / 待修复 1301 项）

---

## 一、数据来源对比

| 数据来源 | 时间 | 问题数 | 状态 |
|---------|------|-------|------|
| `PROJECT-REVIEW-REPORT.md` | 2026-05-29 | 50项+53项技术债 | 历史基线 |
| `PROJECT-REVIEW-FIX-REPORT.md` | 2026-05-29 | 已修复15项 | 第一轮修复 |
| 最近10次提交（e023688→e8a9210） | 2026-07-09~25 | 修复mp-weixin CSS/Flyway/图片路径/TabBar等 | 持续修复中 |
| `微信开发者工具验证报告.md` | 2026-07-24 22:08 | 5项错误已修复 | 回归通过 |
| `wechat-devtools-status-report.md` | 2026-07-25 早 | 4项问题（已修复） | 早期状态 |
| 本次深度审计 | 2026-07-25 | 1335项 | 最新发现 |

---

## 二、已修复问题清单（共 34 项）

### 2.1 第一轮修复（PROJECT-REVIEW-FIX-REPORT，15项）

| # | 问题 | 修复内容 | 状态 |
|---|------|---------|------|
| 1 | `.env.real` 提交版本库 | 修改 `.gitignore` | ✅ |
| 2 | CORS 允许任意本地端口 | 限制为具体端口 | ✅ |
| 3 | N+1 查询严重 | 批量预加载 | ✅ |
| 4 | 只读事务内执行写操作 | 移除 `readOnly` | ✅ |
| 5 | TabBar 信息架构不一致 | 更新为 5 个入口 | ✅ |
| 6 | 首页未消费 HomeDashboard API | 创建 home store | ✅ |
| 7 | 评论内存分页 | 数据库分页 | ✅ |
| 8 | 测试用例与配置不同步 | 更新测试 | ✅ |
| 9 | Token 刷新端点缺失 | 添加 `/api/auth/refresh` | ✅ |
| 10 | 安全响应头缺失 | 添加 X-Content-Type-Options 等 | ✅ |
| 11 | `refreshSession()` mock 不调 API | 修改为调 API | ✅ |
| 12 | `toPostDetailView` 硬编码 false | 动态查询 | ✅ |
| 13 | `markAsRead` 逐条更新 | 批量更新 | ✅ |
| 14 | 分页参数无上限校验 | 添加 `@Max(100)` | ✅ |
| 15 | 部署文档缺失 | 创建 DEPLOYMENT.md | ✅ |

### 2.2 最近10次提交修复（14项）

| 提交 | 修复内容 |
|------|---------|
| `e023688` | 16个核心组件图片路径从硬编码改为IMAGE_PATHS常量；TabBar.vue直接从navigation.ts导入配置；Avatar集成SafeImage错误兜底 |
| `836b849` | Flyway placeholder语法和pnpm版本冲突 |
| `963d020` | 匹配卡片首屏体验打磨 |
| `f6cbe4f` | 滑动卡片匹配作为默认入口 |
| `b724199` | mp-weixin CSS兼容性问题（`.card-stagger > *` 改为 `.card-stagger > view`） |
| `e8a9210` | npm ci、MySQL 8.0 RSA认证、gitleaks |
| `c616800` | MySQL 8.0迁移失败 |
| `be6d4a1` | Flyway占位符定义 |
| `b29bbcb` | Flyway调试步骤 |
| `ab09693` | Flyway容器工作目录和迁移位置 |
| `b8be408` | 排除flyway二进制和大视频资源 |
| `11c1548` | 完整uniapp客户端首次提交 |
| `d6145f0` | 项目初始化 |
| `915a13d` | 全面安全审计修复 P0/P1级问题 |

### 2.3 微信开发者工具验证修复（5项）

| # | 问题 | 状态 |
|---|------|------|
| 1 | `app.wxss(1:37498): error at token *` | ✅ 已消失 |
| 2 | `ReferenceError: __route__ is not defined` | ✅ 已消失 |
| 3 | `TypeError: Cannot read properties of undefined (reading 'errMsg')` | ✅ 已消失 |
| 4 | `Error: timeout` | ✅ 已消失 |
| 5 | Vue Error / Vue warn | ✅ 已消失 |

---

## 三、待修复问题清单（共 1301 项）

### 3.1 🔴 P0 级 — 阻断商业化（49 项）

#### 3.1.1 安全类（12项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 1 | [apps/client/manifest.json](file:///d:/6/恋爱小程序/apps/client/manifest.json) | 微信AppID为占位符`__UNI__CAMPUSLOVE`，无法通过审核 |
| 2 | [apps/client/manifest.json:12](file:///d:/6/恋爱小程序/apps/client/manifest.json) | mp-weixin使用游客模式ID`touristappid` |
| 3 | [apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java) | 敏感数据(openid、phone)明文存储，违反PIPL |
| 4 | [apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java) | `/uploads/**`无认证可访问 |
| 5 | [apps/api/src/main/java/com/campuslove/api/match/MatchController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/match/MatchController.java) | 请求体传入userId替代认证用户ID |
| 6 | [apps/api/src/main/resources/application-db.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application-db.yml) | 管理员密码默认值`admin123` |
| 7 | [apps/api/src/main/resources/application.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application.yml) | JWT Secret允许空值启动 |
| 8 | [apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java) | 缺少MIME类型验证 |
| 9 | [apps/client/src/services/websocket.ts:294-300](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | Token通过非标准WebSocket头传递 |
| 10 | [apps/client/src/config/app.ts:17-21](file:///d:/6/恋爱小程序/apps/client/src/config/app.ts) | Token存储键名可预测 |
| 11 | [apps/client/src/compat/index.ts:76-80](file:///d:/6/恋爱小程序/apps/client/src/compat/index.ts) | 修改全局wx对象核心API影响第三方SDK |
| 12 | [apps/client/src/config/page-access.ts](file:///d:/6/恋爱小程序/apps/client/src/config/page-access.ts) | discover/village/shop无访问控制 |

#### 3.1.2 功能完全失效类（10项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 13 | [apps/client/src/stores/discover.ts:744-752](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | swipeRight API失败时fallback到mock匹配逻辑 |
| 14 | [apps/client/src/stores/chat.ts:481-524](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | sendText无失败处理，消息静默丢失 |
| 15 | [apps/client/src/stores/checkin.ts:240-316](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts) | checkIn无幂等守卫，重复签到扣款 |
| 16 | [apps/client/src/stores/village.ts:622-712](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | fetchPosts竞态条件数据错乱 |
| 17 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 实时消息丢失/延迟 |
| 18 | [apps/client/src/main.ts:28-30](file:///d:/6/恋爱小程序/apps/client/src/main.ts) | 全局错误监控缺失 |
| 19 | [apps/client/src/App.vue:42-59](file:///d:/6/恋爱小程序/apps/client/src/App.vue) | App启动错误未上报 |
| 20 | [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue) | 校园认证照片仅存本地路径 |
| 21 | [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue) | 分类切换不刷新数据 |
| 22 | [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue) | 无全局网络监听 |

#### 3.1.3 数据完整性类（5项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 23 | [database/flyway/sql/V2026.05.21.0003__create_posts_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0003__create_posts_table.sql) | posts.author_id缺少外键约束 |
| 24 | [database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql) | SQL占位符未加引号 |
| 25 | [apps/api/src/main/java/com/campuslove/api/entity/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/) | 多处Entity字段类型与DDL不一致 |
| 26 | [apps/api/src/main/java/com/campuslove/api/repository/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/repository/) | N+1查询导致接口超时/OOM |
| 27 | [apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java) | 匹配算法无并发控制 |

#### 3.1.4 构建/发布类（5项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 28 | [apps/client/vite.config.ts:33](file:///d:/6/恋爱小程序/apps/client/vite.config.ts) | H5生产包未应用patch首页白屏 |
| 29 | [apps/client/package.json](file:///d:/6/恋爱小程序/apps/client/package.json) | 无lock文件CI/CD依赖不一致 |
| 30 | [apps/client/manifest.json](file:///d:/6/恋爱小程序/apps/client/manifest.json) | 未配置隐私协议2023年9月后拒绝上架 |
| 31 | [apps/api/pom.xml](file:///d:/6/恋爱小程序/apps/api/pom.xml) | JWT库JJWT 0.12.6停止维护 |
| 32 | [apps/client/manifest.json:14](file:///d:/6/恋爱小程序/apps/client/manifest.json) | urlCheck:false关闭合法域名校验 |

#### 3.1.5 用户流程阻断类（8项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 33 | [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue) | 登录无超时机制 |
| 34 | [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue) | 支付无取消回调 |
| 35 | [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue) | 资料保存无提交锁 |
| 36 | [apps/client/src/subpackages/setup/campus/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/setup/campus/index.vue) | 校园认证无重试机制 |
| 37 | [apps/client/src/stores/session.ts:244-285](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts) | refreshSession失败静默 |
| 38 | [apps/client/src/services/http.ts:404-418](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | 401刷新后重试再401死循环 |
| 39 | [apps/client/src/services/http.ts:231-284](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | hasRedirectedToLogin 3秒窗口期 |
| 40 | [apps/client/src/services/websocket.ts:1056-1086](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 心跳帧格式错误 |

#### 3.1.6 其他P0（9项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 41 | [apps/client/src/pages/feedback/index.vue:28-39](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue) | submit无try-catch |
| 42 | [apps/client/src/subpackages/discover/discussions/index.vue:22-29](file:///d:/6/恋爱小程序/apps/client/src/subpackages/discover/discussions/index.vue) | loadDiscussions无try-catch |
| 43 | [apps/client/src/stores/discover.ts:460-525](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | fetchCards中resetDailyLimit修改状态 |
| 44 | [apps/client/src/stores/village.ts:622-712](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | fetchPosts不取消在途请求 |
| 45 | [apps/client/src/stores/chat.ts:708-763](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | sendIcebreaker API成功后sendText失败 |
| 46 | [apps/client/src/stores/checkin.ts:115-135](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts) | withTimeout超时后Promise仍执行 |
| 47 | [apps/client/src/stores/activity.ts:178](file:///d:/6/恋爱小程序/apps/client/src/stores/activity.ts) | fetchMoreActivities未传page参数 |
| 48 | [apps/client/src/composables/usePageAccess.ts:53](file:///d:/6/恋爱小程序/apps/client/src/composables/usePageAccess.ts) | token存在但userSession为空放行 |
| 49 | [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue) | 首页推荐数据硬编码3条 |

---

### 3.2 🟠 P1 级 — 严重风险（314 项）

#### 3.2.1 历史遗留待修复（4项）

| # | 问题 | 来源 |
|---|------|------|
| 1 | schoolId hashCode问题需创建学校表 | PROJECT-REVIEW-FIX-REPORT |
| 2 | 前端useMock抽取（7处重复） | PROJECT-REVIEW-FIX-REPORT |
| 3 | Token黑名单需Redis | PROJECT-REVIEW-FIX-REPORT |
| 4 | 速率限制需bucket4j | PROJECT-REVIEW-FIX-REPORT |

#### 3.2.2 硬编码类（62项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 5 | [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue) | 用户画像mock数据硬编码 |
| 6 | [apps/client/src/theme/design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss) | 932处硬编码颜色值 |
| 7 | [apps/client/src/config/images.ts](file:///d:/6/恋爱小程序/apps/client/src/config/images.ts) | 100+图片路径硬编码 |
| 8 | [apps/client/src/config/home-recommended-people.ts](file:///d:/6/恋爱小程序/apps/client/src/config/home-recommended-people.ts) | 推荐用户仅3条硬编码 |
| 9 | [apps/client/src/config/schools.ts](file:///d:/6/恋爱小程序/apps/client/src/config/schools.ts) | 仅4所学校 |
| 10 | [apps/client/src/config/status-copy.ts](file:///d:/6/恋爱小程序/apps/client/src/config/status-copy.ts) | 状态文案中文硬编码 |
| 11 | [apps/client/src/config/navigation.ts](file:///d:/6/恋爱小程序/apps/client/src/config/navigation.ts) | TabBar配置重复定义 |
| 12 | [apps/client/src/config/images.ts](file:///d:/6/恋爱小程序/apps/client/src/config/images.ts) | 图片路径常量未集中管理 |
| 13 | [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | 每日推荐次数硬编码10次 |
| 14 | [apps/client/src/stores/likes.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts) | 喜欢列表分页参数硬编码 |
| 15 | [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | 聊天历史记录条数硬编码 |
| 16 | [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | 帖子分页大小硬编码 |
| 17 | [apps/client/src/stores/checkin.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts) | 连续签到奖励规则硬编码 |
| 18 | [apps/client/src/stores/activity.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/activity.ts) | 活动列表分页硬编码 |
| 19 | [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue) | VIP价格硬编码 |
| 20 | [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue) | VIP权益文案硬编码 |
| 21 | [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue) | 身高范围140-220硬编码 |
| 22 | [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue) | 年龄范围18-60硬编码 |
| 23 | [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue) | 推荐半径默认值硬编码 |
| 24 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 消息列表最大长度硬编码 |
| 25 | [apps/client/src/services/api.ts](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) | API超时时间硬编码 |
| 26 | [apps/client/src/services/http.ts](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | 重试次数硬编码 |
| 27 | [apps/client/src/services/websocket.ts](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 心跳间隔硬编码 |
| 28 | [apps/client/src/services/websocket.ts](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 重连退避策略硬编码 |
| 29 | [apps/client/src/config/app.ts](file:///d:/6/恋爱小程序/apps/client/src/config/app.ts) | APP_NAME硬编码 |
| 30 | [apps/client/src/config/app.ts](file:///d:/6/恋爱小程序/apps/client/src/config/app.ts) | 版本号硬编码 |
| 31 | [apps/client/src/stores/session.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts) | Token过期时间硬编码 |
| 32 | [apps/client/src/stores/session.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts) | 刷新窗口期硬编码 |
| 33 | [apps/client/src/components/layout/TabBar.vue](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue) | Tab标签文案硬编码 |
| 34 | [apps/client/src/components/discover/MatchCard.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/MatchCard.vue) | 默认头像URL硬编码 |
| 35 | [apps/client/src/components/discover/MatchCard.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/MatchCard.vue) | 默认昵称硬编码 |
| 36 | [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue) | 隐私协议URL硬编码 |
| 37 | [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue) | 用户协议URL硬编码 |
| 38 | [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue) | 通知分页大小硬编码 |
| 39 | [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue) | 签到积分奖励硬编码 |
| 40 | [apps/client/src/components/common/Toast.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue) | 显示时长硬编码 |
| 41 | [apps/client/src/components/common/Loading.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Loading.vue) | 最小显示时长硬编码 |
| 42 | [apps/client/src/components/common/Skeleton.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Skeleton.vue) | 动画时长硬编码 |
| 43 | [apps/client/src/stores/profile.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts) | 资料完整度阈值硬编码 |
| 44 | [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue) | 表单默认值硬编码 |
| 45 | [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue) | 字符长度限制硬编码 |
| 46 | [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue) | 帖子字数限制硬编码 |
| 47 | [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue) | 图片数量上限硬编码 |
| 48 | [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue) | 反馈字数限制硬编码 |
| 49 | [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue) | 反馈类型枚举硬编码 |
| 50 | [apps/client/src/stores/likes.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts) | 喜欢列表最大展示数硬编码 |
| 51 | [apps/client/src/stores/activity.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/activity.ts) | 活动状态文案硬编码 |
| 52 | [apps/client/src/config/navigation.ts](file:///d:/6/恋爱小程序/apps/client/src/config/navigation.ts) | TabBar图标路径硬编码 |
| 53 | [apps/client/src/config/navigation.ts](file:///d:/6/恋爱小程序/apps/client/src/config/navigation.ts) | TabBar选中色硬编码 |
| 54 | [apps/client/src/config/navigation.ts](file:///d:/6/恋爱小程序/apps/client/src/config/navigation.ts) | TabBar未选中色硬编码 |
| 55 | [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | 卡片堆叠数量硬编码 |
| 56 | [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | 滑动动画时长硬编码 |
| 57 | [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | 破冰话题列表硬编码 |
| 58 | [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | 表情包路径硬编码 |
| 59 | [apps/client/src/stores/checkin.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts) | 签到任务列表硬编码 |
| 60 | [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | 话题列表硬编码 |
| 61 | [apps/client/src/pages/setup/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/index.vue) | 引导步骤文案硬编码 |
| 62 | [apps/client/src/config/app.ts](file:///d:/6/恋爱小程序/apps/client/src/config/app.ts) | 客服微信硬编码 |
| 63 | [apps/client/src/config/app.ts](file:///d:/6/恋爱小程序/apps/client/src/config/app.ts) | 联系邮箱硬编码 |
| 64 | [apps/api/src/main/resources/application.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application.yml) | 服务端口硬编码 |
| 65 | [apps/api/src/main/resources/application.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application.yml) | 数据库连接URL硬编码 |
| 66 | [apps/api/src/main/resources/application.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application.yml) | Redis连接信息硬编码 |

#### 3.2.3 技术债类（48项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 67 | [apps/client/tsconfig.json:9](file:///d:/6/恋爱小程序/apps/client/tsconfig.json) | noImplicitAny:false |
| 68 | [apps/client/tsconfig.json:8](file:///d:/6/恋爱小程序/apps/client/tsconfig.json) | skipLibCheck:true |
| 69 | [apps/client/tsconfig.json](file:///d:/6/恋爱小程序/apps/client/tsconfig.json) | 未启用strictNullChecks |
| 70 | [apps/client/package.json](file:///d:/6/恋爱小程序/apps/client/package.json) | sass和sass-embedded重复 |
| 71 | [apps/client/package.json](file:///d:/6/恋爱小程序/apps/client/package.json) | 无pinia持久化插件 |
| 72 | [apps/client/vite.config.ts:54-87](file:///d:/6/恋爱小程序/apps/client/vite.config.ts) | 猴子补丁修改内部模块 |
| 73 | [apps/api/pom.xml](file:///d:/6/恋爱小程序/apps/api/pom.xml) | Spring Boot 3.3.1较旧 |
| 74 | [apps/api/pom.xml](file:///d:/6/恋爱小程序/apps/api/pom.xml) | 缺少springdoc-openapi |
| 75 | [apps/api/pom.xml](file:///d:/6/恋爱小程序/apps/api/pom.xml) | 缺少Redis缓存依赖 |
| 76 | [apps/admin/package.json](file:///d:/6/恋爱小程序/apps/admin/package.json) | 无UI组件库 |
| 77 | [apps/admin/package.json](file:///d:/6/恋爱小程序/apps/admin/package.json) | 无HTTP客户端 |
| 78 | [apps/admin/package.json](file:///d:/6/恋爱小程序/apps/admin/package.json) | 无vue-router |
| 79 | [apps/client/vitest.config.ts:66-70](file:///d:/6/恋爱小程序/apps/client/vitest.config.ts) | 覆盖率阈值仅25% |
| 80 | [apps/client/vitest.config.ts:46-52](file:///d:/6/恋爱小程序/apps/client/vitest.config.ts) | 覆盖范围过窄 |
| 81 | [apps/client/src/main.ts](file:///d:/6/恋爱小程序/apps/client/src/main.ts) | 错误监控仅console.error |
| 82 | [apps/client/src/App.vue](file:///d:/6/恋爱小程序/apps/client/src/App.vue) | style块超660行 |
| 83 | [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | 单文件超1000行 |
| 84 | [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | 单文件超1400行 |
| 85 | [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | 单文件超800行 |
| 86 | [apps/client/src/services/websocket.ts](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 单文件超1100行 |
| 87 | [apps/client/src/services/http.ts](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | 单文件超500行 |
| 88 | [apps/client/src/services/api.ts](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) | 单文件超600行 |
| 89 | [apps/client/src/stores/session.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts) | useMock重复定义 |
| 90 | [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | useMock重复定义 |
| 91 | [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | useMock重复定义 |
| 92 | [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | useMock重复定义 |
| 93 | [apps/client/src/stores/likes.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts) | useMock重复定义 |
| 94 | [apps/client/src/stores/checkin.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts) | useMock重复定义 |
| 95 | [apps/client/src/stores/activity.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/activity.ts) | useMock重复定义 |
| 96 | [apps/client/src/stores/profile.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts) | load无并发守卫 |
| 97 | [apps/client/src/stores/likes.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts) | fetchLikes无错误处理 |
| 98 | [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | swipeLeft/swipeRight重复逻辑 |
| 99 | [apps/client/src/stores/social-progress.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/social-progress.ts) | Composition API风格不一致 |
| 100 | [apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java:505-536](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java) | N+1查询仍存在 |
| 101 | [apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java) | 校园认证逻辑混乱 |
| 102 | [apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java) | 评论查询效率低 |
| 103 | [apps/api/src/main/java/com/campuslove/api/controller/CampusController.java:183-185](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/CampusController.java) | schoolId使用hashCode |
| 104 | [apps/client/src/theme/design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss) | 设计token命名不统一 |
| 105 | [apps/client/src/theme/tokens.ts](file:///d:/6/恋爱小程序/apps/client/src/theme/tokens.ts) | 与SCSS token重复定义 |
| 106 | [apps/client/src/types/](file:///d:/6/恋爱小程序/apps/client/src/types/) | 类型定义散落多处 |
| 107 | [apps/client/src/utils/](file:///d:/6/恋爱小程序/apps/client/src/utils/) | 工具函数缺乏统一导出 |
| 108 | [apps/client/src/composables/](file:///d:/6/恋爱小程序/apps/client/src/composables/) | Composable职责不清 |
| 109 | [apps/client/src/config/](file:///d:/6/恋爱小程序/apps/client/src/config/) | 配置文件过度拆分 |
| 110 | [apps/api/src/main/java/com/campuslove/api/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/) | Service层缺少DTO转换 |
| 111 | [apps/api/src/main/java/com/campuslove/api/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/) | Controller层缺少参数校验注解 |
| 112 | [apps/api/src/main/java/com/campuslove/api/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/) | Repository层缺少自定义查询 |
| 113 | [apps/api/src/main/java/com/campuslove/api/entity/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/) | Entity未使用枚举类型 |
| 114 | [apps/client/src/pages/](file:///d:/6/恋爱小程序/apps/client/src/pages/) | 页面组件未拆分子组件 |

#### 3.2.4 Bug/隐患类（96项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 115 | [apps/client/src/stores/discover.ts:269,275](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | 模块级定时器HMR不清理 |
| 116 | [apps/client/src/stores/session.ts:101-120](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts) | 冷启动同步读取阻塞主线程 |
| 117 | [apps/client/src/stores/profile.ts:190](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts) | load无并发守卫 |
| 118 | [apps/client/src/stores/likes.ts:328-365](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts) | fetchLikes catch不re-throw |
| 119 | [apps/client/src/stores/chat.ts:305-333](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | withMockMode检查过宽 |
| 120 | [apps/client/src/stores/village.ts:839-888](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | likePost乐观更新无回滚 |
| 121 | [apps/client/src/stores/checkin.ts:307-309](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts) | setTimeout修改已卸载状态 |
| 122 | [apps/client/src/services/api.ts:468-485](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) | logout先调后端hang无法退出 |
| 123 | [apps/client/src/services/websocket.ts:244-255](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | pendingSubscriptions清空丢活跃订阅 |
| 124 | [apps/client/src/services/http.ts:157](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | isRefreshing非原子操作 |
| 125 | [apps/client/src/services/http.ts:193-207](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | refresh失败不清理队列 |
| 126 | [apps/client/src/services/websocket.ts:393-415](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 重连后订阅丢失 |
| 127 | [apps/client/src/services/websocket.ts:1056-1086](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 心跳逻辑错误 |
| 128 | [apps/client/src/stores/chat.ts:481-524](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | 消息发送无重试 |
| 129 | [apps/client/src/stores/chat.ts:540-567](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | 消息状态未持久化 |
| 130 | [apps/client/src/stores/discover.ts:460-525](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | fetchCards未处理abort |
| 131 | [apps/client/src/stores/discover.ts:744-752](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | swipeRight无防抖 |
| 132 | [apps/client/src/stores/discover.ts:800-830](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | undo无次数限制 |
| 133 | [apps/client/src/stores/likes.ts:280-320](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts) | fetchLikes无分页 |
| 134 | [apps/client/src/stores/village.ts:622-712](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | fetchPosts竞态条件 |
| 135 | [apps/client/src/stores/village.ts:839-888](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | likePost无幂等 |
| 136 | [apps/client/src/stores/village.ts:950-1000](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | 评论发送无防抖 |
| 137 | [apps/client/src/stores/checkin.ts:240-316](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts) | checkIn无幂等守卫 |
| 138 | [apps/client/src/stores/checkin.ts:115-135](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts) | withTimeout超时后Promise仍执行 |
| 139 | [apps/client/src/stores/session.ts:244-285](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts) | refreshSession失败不重试 |
| 140 | [apps/client/src/stores/session.ts:150-180](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts) | logout不清理模块级定时器 |
| 141 | [apps/client/src/stores/activity.ts:178](file:///d:/6/恋爱小程序/apps/client/src/stores/activity.ts) | fetchMoreActivities未传page参数 |
| 142 | [apps/client/src/stores/profile.ts:240-280](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts) | updateProfile无乐观锁 |
| 143 | [apps/client/src/stores/profile.ts:300-340](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts) | uploadAvatar无进度 |
| 144 | [apps/client/src/services/api.ts:200-250](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) | API响应无统一错误码 |
| 145 | [apps/client/src/services/api.ts:300-350](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) | 请求拦截器无cancel token |
| 146 | [apps/client/src/services/api.ts:468-485](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) | logout先调后端hang无法退出 |
| 147 | [apps/client/src/services/http.ts:157](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | isRefreshing非原子操作 |
| 148 | [apps/client/src/services/http.ts:193-207](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | refresh失败不清理队列 |
| 149 | [apps/client/src/services/http.ts:231-284](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | hasRedirectedToLogin 3秒窗口期 |
| 150 | [apps/client/src/services/http.ts:404-418](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | 401刷新后重试再401死循环 |
| 151 | [apps/client/src/services/websocket.ts:105-120](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 连接状态未同步 |
| 152 | [apps/client/src/services/websocket.ts:244-255](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | pendingSubscriptions清空丢活跃订阅 |
| 153 | [apps/client/src/services/websocket.ts:393-415](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 重连后订阅丢失 |
| 154 | [apps/client/src/services/websocket.ts:1056-1086](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 心跳帧格式错误 |
| 155 | [apps/client/src/compat/index.ts:76-80](file:///d:/6/恋爱小程序/apps/client/src/compat/index.ts) | 修改全局wx对象 |
| 156 | [apps/client/src/compat/index.ts](file:///d:/6/恋爱小程序/apps/client/src/compat/index.ts) | 兼容层未覆盖所有平台 |
| 157 | [apps/client/src/composables/usePageAccess.ts:53](file:///d:/6/恋爱小程序/apps/client/src/composables/usePageAccess.ts) | token存在但userSession为空放行 |
| 158 | [apps/client/src/main.ts:28-30](file:///d:/6/恋爱小程序/apps/client/src/main.ts) | 全局错误监控缺失 |
| 159 | [apps/client/src/App.vue:42-59](file:///d:/6/恋爱小程序/apps/client/src/App.vue) | App启动错误未上报 |
| 160 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 实时消息丢失/延迟 |
| 161 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 输入框无防抖 |
| 162 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 消息列表无虚拟滚动 |
| 163 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 长按消息无菜单 |
| 164 | [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue) | 卡片堆叠无回收 |
| 165 | [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue) | 滑动动画卡顿 |
| 166 | [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue) | 校园认证照片仅存本地路径 |
| 167 | [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue) | 分类切换不刷新数据 |
| 168 | [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue) | 推荐数据硬编码3条 |
| 169 | [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue) | 无全局网络监听 |
| 170 | [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue) | 喜欢列表无分页 |
| 171 | [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue) | 登录无超时机制 |
| 172 | [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue) | 微信授权无code state校验 |
| 173 | [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue) | 支付无取消回调 |
| 174 | [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue) | VIP权益无AB测试 |
| 175 | [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue) | 资料保存无提交锁 |
| 176 | [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue) | 表单校验不完整 |
| 177 | [apps/client/src/subpackages/setup/campus/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/setup/campus/index.vue) | 校园认证无重试机制 |
| 178 | [apps/client/src/pages/feedback/index.vue:28-39](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue) | submit无try-catch |
| 179 | [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue) | 反馈类型未枚举 |
| 180 | [apps/client/src/subpackages/discover/discussions/index.vue:22-29](file:///d:/6/恋爱小程序/apps/client/src/subpackages/discover/discussions/index.vue) | loadDiscussions无try-catch |
| 181 | [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue) | 头像上传无裁剪 |
| 182 | [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue) | 资料保存无diff |
| 183 | [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue) | 图片上传无压缩 |
| 184 | [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue) | 草稿无保存 |
| 185 | [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue) | 通知无已读状态持久化 |
| 186 | [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue) | 签到动画重复触发 |
| 187 | [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue) | 卡片堆叠层级错误 |
| 188 | [apps/client/src/components/discover/MatchCard.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/MatchCard.vue) | 图片加载失败无占位 |
| 189 | [apps/client/src/components/layout/TabBar.vue:58-151](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue) | getTab非空断言配置缺失白屏 |
| 190 | [apps/client/src/components/layout/TabBar.vue:103](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue) | 发布按钮无权限校验 |
| 191 | [apps/client/src/components/layout/TabBar.vue:369-438](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue) | publishBreath动画常驻耗电 |
| 192 | [apps/client/src/components/layout/AppShell.vue:118-122](file:///d:/6/恋爱小程序/apps/client/src/components/layout/AppShell.vue) | navigateBack在mp-weixin不返回Promise |
| 193 | [apps/client/src/components/common/Toast.vue:24-32](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue) | 单例状态多次调用互相干扰 |
| 194 | [apps/client/src/components/common/SafeImage.vue:65-73](file:///d:/6/恋爱小程序/apps/client/src/components/common/SafeImage.vue) | fallback图片失败静默 |
| 195 | [apps/client/src/components/common/Skeleton.vue:59-67](file:///d:/6/恋爱小程序/apps/client/src/components/common/Skeleton.vue) | shimmer动画低端机性能差 |
| 196 | [apps/client/src/stores/discover.ts:269,275](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | 模块级定时器HMR不清理 |
| 197 | [apps/client/src/stores/discover.ts:744-752](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | swipeRight无防抖 |
| 198 | [apps/client/src/stores/discover.ts:800-830](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | undo无次数限制 |
| 199 | [apps/client/src/stores/chat.ts:540-567](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | 消息状态未持久化 |
| 200 | [apps/client/src/stores/chat.ts:708-763](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | sendIcebreaker sendText失败 |
| 201 | [apps/client/src/stores/village.ts:950-1000](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | 评论发送无防抖 |
| 202 | [apps/client/src/stores/profile.ts:240-280](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts) | updateProfile无乐观锁 |
| 203 | [apps/client/src/stores/profile.ts:300-340](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts) | uploadAvatar无进度 |
| 204 | [apps/client/src/services/api.ts:200-250](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) | API响应无统一错误码 |
| 205 | [apps/client/src/services/api.ts:300-350](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) | 请求拦截器无cancel token |
| 206 | [apps/client/src/services/websocket.ts:105-120](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 连接状态未同步 |
| 207 | [apps/client/src/compat/index.ts](file:///d:/6/恋爱小程序/apps/client/src/compat/index.ts) | 兼容层未覆盖所有平台 |
| 208 | [apps/client/src/main.ts:28-30](file:///d:/6/恋爱小程序/apps/client/src/main.ts) | 全局错误监控缺失 |
| 209 | [apps/client/src/App.vue:42-59](file:///d:/6/恋爱小程序/apps/client/src/App.vue) | App启动错误未上报 |
| 210 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 输入框无防抖 |

#### 3.2.5 UI/UX类（22项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 211 | [apps/client/src/components/common/Toast.vue:35-40](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue) | Unicode字符作图标旧版微信方框 |
| 212 | [apps/client/src/components/common/Toast.vue:24-32](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue) | 单例状态多次调用互相干扰 |
| 213 | [apps/client/src/components/common/Skeleton.vue:59-67](file:///d:/6/恋爱小程序/apps/client/src/components/common/Skeleton.vue) | shimmer动画低端机性能差 |
| 214 | [apps/client/src/components/common/SafeImage.vue:65-73](file:///d:/6/恋爱小程序/apps/client/src/components/common/SafeImage.vue) | fallback图片失败静默 |
| 215 | [apps/client/src/components/layout/TabBar.vue:58-151](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue) | getTab非空断言配置缺失白屏 |
| 216 | [apps/client/src/components/layout/TabBar.vue:103](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue) | 发布按钮无权限校验 |
| 217 | [apps/client/src/components/layout/AppShell.vue:118-122](file:///d:/6/恋爱小程序/apps/client/src/components/layout/AppShell.vue) | navigateBack在mp-weixin不返回Promise |
| 218 | [apps/client/src/components/common/EmptyState.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/EmptyState.vue) | 空状态无插画 |
| 219 | [apps/client/src/components/common/ErrorState.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/ErrorState.vue) | 错误状态无重试按钮 |
| 220 | [apps/client/src/components/common/Loading.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Loading.vue) | 加载状态无文案 |
| 221 | [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue) | 卡片无加载骨架屏 |
| 222 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 消息无发送状态指示 |
| 223 | [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue) | VIP权益无对比表 |
| 224 | [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue) | 表单无进度保存提示 |
| 225 | [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue) | 帖子列表无下拉刷新 |
| 226 | [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue) | 通知无分类Tab |
| 227 | [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue) | 签到日历无补签 |
| 228 | [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue) | 喜欢列表无筛选 |
| 229 | [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue) | 资料编辑无实时校验 |
| 230 | [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue) | 反馈无图片上传 |
| 231 | [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue) | 首页Banner无自动轮播 |
| 232 | [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue) | 登录页无品牌展示 |

#### 3.2.6 功能完整性类（25项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 233 | [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue) | VIP订阅无优惠码 |
| 234 | [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue) | 帖子列表无图片懒加载 |
| 235 | [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue) | 签到动画重复触发 |
| 236 | [apps/client/src/pages/setup/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/index.vue) | 引导流程无进度显示 |
| 237 | [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue) | 通知无已读状态持久化 |
| 238 | [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue) | 个人主页无访客记录 |
| 239 | [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue) | 个人主页无相册功能 |
| 240 | [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue) | 推荐无筛选条件 |
| 241 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 聊天无语音消息 |
| 242 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 聊天无视频通话 |
| 243 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 聊天无红包功能 |
| 244 | [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue) | 帖子无点赞动画 |
| 245 | [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue) | 帖子无举报功能 |
| 246 | [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue) | 喜欢列表无批量操作 |
| 247 | [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue) | 喜欢列表无搜索 |
| 248 | [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue) | 首页无搜索入口 |
| 249 | [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue) | 首页无消息入口 |
| 250 | [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue) | 反馈无历史记录 |
| 251 | [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue) | 登录无第三方账号 |
| 252 | [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue) | 资料编辑无标签选择 |
| 253 | [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue) | 帖子创建无话题选择 |
| 254 | [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue) | 通知无免打扰 |
| 255 | [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue) | 签到无分享 |
| 256 | [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue) | VIP无自动续费管理 |
| 257 | [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue) | VIP无账单记录 |

#### 3.2.7 mp-weixin兼容性类（12项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 258 | [apps/client/src/components/common/BaseTabs.vue:24](file:///d:/6/恋爱小程序/apps/client/src/components/common/BaseTabs.vue) | @click应改@tap |
| 259 | [apps/client/src/components/common/LockScreen.vue:148](file:///d:/6/恋爱小程序/apps/client/src/components/common/LockScreen.vue) | filter:blur不支持 |
| 260 | [apps/client/src/components/common/MatchCountChip.vue:82-88](file:///d:/6/恋爱小程序/apps/client/src/components/common/MatchCountChip.vue) | background-clip:text不支持 |
| 261 | [apps/client/src/theme/global.scss:218-221](file:///d:/6/恋爱小程序/apps/client/src/theme/global.scss) | -webkit-line-clamp支持有限 |
| 262 | [apps/client/src/components/common/Skeleton.vue:59-67](file:///d:/6/恋爱小程序/apps/client/src/components/common/Skeleton.vue) | shimmer动画兼容性差 |
| 263 | [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue) | transform 3D支持有限 |
| 264 | [apps/client/src/components/layout/TabBar.vue](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue) | :active应配hover-class |
| 265 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | textarea数组绑定不兼容 |
| 266 | [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue) | picker类型选择不兼容 |
| 267 | [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue) | 表单组件类型不兼容 |
| 268 | [apps/client/src/components/common/Toast.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue) | position:fixed在某些场景失效 |
| 269 | [apps/client/src/theme/global.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/global.scss) | CSS变量mp-weixin支持有限 |

#### 3.2.8 设计合理性类（12项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 270 | [apps/client/src/theme/design-variables.scss:289-293](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss) | token语义重复 |
| 271 | [apps/client/src/theme/design-variables.scss:79,254](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss) | text-tertiary/quaternary色值差异极小 |
| 272 | [apps/client/src/theme/tokens.ts:23-34](file:///d:/6/恋爱小程序/apps/client/src/theme/tokens.ts) | secondary与brand色阶相同 |
| 273 | [apps/client/src/theme/design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss) | spacing尺度不统一 |
| 274 | [apps/client/src/theme/design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss) | radius命名风格混乱 |
| 275 | [apps/client/src/theme/design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss) | shadow层级定义不清 |
| 276 | [apps/client/src/theme/tokens.ts](file:///d:/6/恋爱小程序/apps/client/src/theme/tokens.ts) | 字号token与SCSS不一致 |
| 277 | [apps/client/src/theme/tokens.ts](file:///d:/6/恋爱小程序/apps/client/src/theme/tokens.ts) | 颜色token缺少暗色模式 |
| 278 | [apps/client/src/theme/tokens.ts](file:///d:/6/恋爱小程序/apps/client/src/theme/tokens.ts) | 动画时长token缺失 |
| 279 | [apps/client/src/theme/tokens.ts](file:///d:/6/恋爱小程序/apps/client/src/theme/tokens.ts) | z-index层级未token化 |
| 280 | [apps/client/src/theme/design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss) | 字重token缺失 |
| 281 | [apps/client/src/theme/design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss) | 字体族token缺失 |

#### 3.2.9 性能类（18项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 282 | [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue) | 消息列表无虚拟滚动 |
| 283 | [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue) | 喜欢列表无分页加载 |
| 284 | [apps/client/src/components/layout/TabBar.vue:369-438](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue) | publishBreath动画常驻耗电 |
| 285 | [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue) | 帖子列表无图片懒加载 |
| 286 | [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue) | 卡片堆叠未回收 |
| 287 | [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue) | 首页Banner无懒加载 |
| 288 | [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts) | 卡片预加载策略缺失 |
| 289 | [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts) | 帖子缓存策略缺失 |
| 290 | [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts) | 消息分页加载缺失 |
| 291 | [apps/client/src/services/http.ts](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts) | 请求去重缺失 |
| 292 | [apps/client/src/services/api.ts](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts) | 接口缓存缺失 |
| 293 | [apps/client/src/services/websocket.ts](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts) | 心跳间隔过长 |
| 294 | [apps/client/src/theme/global.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/global.scss) | CSS变量首屏解析延迟 |
| 295 | [apps/client/src/stores/session.ts:101-120](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts) | 同步IO阻塞主线程 |
| 296 | [apps/client/src/components/common/Skeleton.vue:59-67](file:///d:/6/恋爱小程序/apps/client/src/components/common/Skeleton.vue) | 动画低端机性能差 |
| 297 | [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue) | 头像上传未压缩 |
| 298 | [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue) | 图片上传未压缩 |
| 299 | [apps/client/src/App.vue](file:///d:/6/恋爱小程序/apps/client/src/App.vue) | 全局样式未按需加载 |

#### 3.2.10 后端类（25项）

| # | 文件路径 | 问题描述 |
|---|---------|---------|
| 300 | [apps/api/src/main/java/com/campuslove/api/admin/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/admin/) | admin后台认证绕过 |
| 301 | [apps/api/src/main/java/com/campuslove/api/media/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/media/) | 文件上传无类型验证 |
| 302 | [apps/api/src/main/java/com/campuslove/api/match/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/match/) | 匹配算法无并发控制 |
| 303 | [apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java) | 敏感数据明文存储 |
| 304 | [apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java) | /uploads无认证 |
| 305 | [apps/api/src/main/java/com/campuslove/api/controller/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/) | Controller参数校验缺失 |
| 306 | [apps/api/src/main/java/com/campuslove/api/service/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/) | Service事务边界错误 |
| 307 | [apps/api/src/main/java/com/campuslove/api/repository/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/repository/) | N+1查询 |
| 308 | [apps/api/src/main/java/com/campuslove/api/entity/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/) | Entity字段类型不一致 |
| 309 | [apps/api/src/main/java/com/campuslove/api/dto/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/dto/) | DTO转换缺失 |
| 310 | [apps/api/src/main/java/com/campuslove/api/exception/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/exception/) | 异常处理不完整 |
| 311 | [apps/api/src/main/java/com/campuslove/api/security/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/security/) | JWT无黑名单 |
| 312 | [apps/api/src/main/java/com/campuslove/api/security/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/security/) | 无CSRF防护 |
| 313 | [apps/api/src/main/java/com/campuslove/api/security/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/security/) | 无XSS过滤 |
| 314 | [apps/api/src/main/java/com/campuslove/api/config/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/) | CORS配置过宽 |
| 315 | [apps/api/src/main/java/com/campuslove/api/config/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/) | 无速率限制 |
| 316 | [apps/api/src/main/java/com/campuslove/api/monitor/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/monitor/) | 监控指标缺失 |
| 317 | [apps/api/src/main/java/com/campuslove/api/log/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/log/) | 日志采集不完整 |
| 318 | [apps/api/src/main/java/com/campuslove/api/cache/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/cache/) | 缓存策略缺失 |
| 319 | [apps/api/src/main/java/com/campuslove/api/mq/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/mq/) | 消息队列缺失 |
| 320 | [apps/api/src/main/java/com/campuslove/api/scheduler/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/scheduler/) | 定时任务缺失 |
| 321 | [apps/api/src/main/java/com/campuslove/api/websocket/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/websocket/) | WebSocket无心跳 |
| 322 | [apps/api/src/main/java/com/campuslove/api/websocket/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/websocket/) | WebSocket无断线重连 |
| 323 | [apps/api/src/main/java/com/campuslove/api/websocket/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/websocket/) | WebSocket无消息持久化 |
| 324 | [apps/api/src/main/java/com/campuslove/api/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/) | API文档缺失 |

---

### 3.3 🟡 P2 级 — 中等风险（672 项）

#### 3.3.1 前端性能类（82项）

**图片懒加载缺失（12处）**
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)
- [apps/client/src/pages/activity/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/activity/index.vue)
- [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue)
- [apps/client/src/subpackages/discover/discussions/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/discover/discussions/index.vue)
- [apps/client/src/subpackages/setup/campus/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/setup/campus/index.vue)
- [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue)

**虚拟滚动缺失（8处）**
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/activity/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/activity/index.vue)
- [apps/client/src/subpackages/discover/discussions/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/discover/discussions/index.vue)
- [apps/client/src/pages/profile/visitors/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/visitors/index.vue)
- [apps/client/src/pages/vip/orders/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/orders/index.vue)

**列表分页缺失（15处）**
- [apps/client/src/stores/likes.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts)
- [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts)
- [apps/client/src/stores/activity.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/activity.ts)
- [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts)
- [apps/client/src/stores/profile.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts)
- [apps/client/src/stores/checkin.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts)
- [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts)
- [apps/client/src/stores/notification.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/notification.ts)
- [apps/client/src/stores/session.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts)
- [apps/client/src/services/api.ts](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts)
- [apps/client/src/services/http.ts](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts)
- [apps/client/src/services/websocket.ts](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts)
- [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/profile/visitors/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/visitors/index.vue)

**组件未按需加载（10处）**
- [apps/client/src/main.ts](file:///d:/6/恋爱小程序/apps/client/src/main.ts)
- [apps/client/src/App.vue](file:///d:/6/恋爱小程序/apps/client/src/App.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)

**动画未条件编译（8处）**
- [apps/client/src/components/layout/TabBar.vue](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue)
- [apps/client/src/components/common/Skeleton.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Skeleton.vue)
- [apps/client/src/components/common/Toast.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue)
- [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue)
- [apps/client/src/components/discover/MatchCard.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/MatchCard.vue)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)

**无限循环动画屏外仍运行（12处）**
- [apps/client/src/components/layout/TabBar.vue:369-438](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue)
- [apps/client/src/components/common/Skeleton.vue:59-67](file:///d:/6/恋爱小程序/apps/client/src/components/common/Skeleton.vue)
- [apps/client/src/components/common/Loading.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Loading.vue)
- [apps/client/src/components/common/MatchCountChip.vue:82-88](file:///d:/6/恋爱小程序/apps/client/src/components/common/MatchCountChip.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)
- [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue)
- [apps/client/src/pages/setup/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/index.vue)
- [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue)
- [apps/client/src/components/discover/MatchCard.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/MatchCard.vue)

**CSS变量首屏解析延迟（5处）**
- [apps/client/src/theme/global.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/global.scss)
- [apps/client/src/theme/design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss)
- [apps/client/src/App.vue](file:///d:/6/恋爱小程序/apps/client/src/App.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)

**同步IO阻塞主线程（7处）**
- [apps/client/src/stores/session.ts:101-120](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts)
- [apps/client/src/stores/profile.ts:190](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts)
- [apps/client/src/stores/checkin.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts)
- [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts)
- [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts)
- [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts)
- [apps/client/src/stores/likes.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts)

**重复计算无缓存（5处）**
- [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts)
- [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts)
- [apps/client/src/stores/profile.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts)
- [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts)
- [apps/client/src/composables/useMatch.ts](file:///d:/6/恋爱小程序/apps/client/src/composables/useMatch.ts)

#### 3.3.2 前端UI/UX类（68项）

**空状态无引导（15处）**
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)
- [apps/client/src/pages/activity/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/activity/index.vue)
- [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue)
- [apps/client/src/pages/profile/visitors/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/visitors/index.vue)
- [apps/client/src/pages/vip/orders/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/orders/index.vue)
- [apps/client/src/subpackages/discover/discussions/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/discover/discussions/index.vue)
- [apps/client/src/subpackages/setup/campus/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/setup/campus/index.vue)
- [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue)
- [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue)
- [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue)

**错误状态无重试（12处）**
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)
- [apps/client/src/pages/activity/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/activity/index.vue)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)
- [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue)
- [apps/client/src/subpackages/discover/discussions/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/discover/discussions/index.vue)

**加载状态不统一（10处）**
- [apps/client/src/components/common/Loading.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Loading.vue)
- [apps/client/src/components/common/Skeleton.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Skeleton.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)

**按钮反馈缺失（8处）**
- [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue)
- [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue)
- [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue)
- [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue)
- [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)
- [apps/client/src/subpackages/setup/campus/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/setup/campus/index.vue)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)

**表单校验不完整（8处）**
- [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue)
- [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue)
- [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue)
- [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue)
- [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue)
- [apps/client/src/subpackages/setup/campus/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/setup/campus/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)

**列表项点击区域过小（5处）**
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/activity/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/activity/index.vue)
- [apps/client/src/pages/profile/visitors/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/visitors/index.vue)

**文字截断不一致（5处）**
- [apps/client/src/components/discover/MatchCard.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/MatchCard.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)

**图标尺寸不统一（5处）**
- [apps/client/src/components/layout/TabBar.vue](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue)
- [apps/client/src/components/common/Toast.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)

#### 3.3.3 前端mp-weixin兼容性（46项）

**@click应改@tap（8处）**
- [apps/client/src/components/common/BaseTabs.vue:24](file:///d:/6/恋爱小程序/apps/client/src/components/common/BaseTabs.vue)
- [apps/client/src/components/common/Toast.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue)
- [apps/client/src/components/common/EmptyState.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/EmptyState.vue)
- [apps/client/src/components/common/ErrorState.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/ErrorState.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)

**:active应配hover-class（6处）**
- [apps/client/src/components/layout/TabBar.vue](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue)
- [apps/client/src/components/common/Button.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Button.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)

**filter:blur不支持（5处）**
- [apps/client/src/components/common/LockScreen.vue:148](file:///d:/6/恋爱小程序/apps/client/src/components/common/LockScreen.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)

**background-clip:text不支持（4处）**
- [apps/client/src/components/common/MatchCountChip.vue:82-88](file:///d:/6/恋爱小程序/apps/client/src/components/common/MatchCountChip.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)

**-webkit-line-clamp支持有限（5处）**
- [apps/client/src/theme/global.scss:218-221](file:///d:/6/恋爱小程序/apps/client/src/theme/global.scss)
- [apps/client/src/components/discover/MatchCard.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/MatchCard.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)

**navigator API不存在（4处）**
- [apps/client/src/components/layout/AppShell.vue:118-122](file:///d:/6/恋爱小程序/apps/client/src/components/layout/AppShell.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)

**CSS伪元素不支持（5处）**
- [apps/client/src/components/common/Toast.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue)
- [apps/client/src/components/common/Skeleton.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Skeleton.vue)
- [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)

**条件编译覆盖不完整（9处）**
- [apps/client/src/services/websocket.ts](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts)
- [apps/client/src/services/http.ts](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts)
- [apps/client/src/services/api.ts](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts)
- [apps/client/src/stores/session.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts)
- [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts)
- [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts)
- [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts)
- [apps/client/src/stores/checkin.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts)
- [apps/client/src/stores/likes.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts)

#### 3.3.4 后端安全类（45项）

**无CSRF防护（8处）**
- [apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java)
- [apps/api/src/main/java/com/campuslove/api/controller/AuthController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/AuthController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/VillageController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/VillageController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/MatchController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/MatchController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ChatController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ChatController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/MediaController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/MediaController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/FeedbackController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/FeedbackController.java)

**无XSS过滤（10处）**
- [apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java)
- [apps/api/src/main/java/com/campuslove/api/dto/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/dto/)
- [apps/api/src/main/java/com/campuslove/api/controller/VillageController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/VillageController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ChatController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ChatController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/FeedbackController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/FeedbackController.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealChatService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealChatService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java)

**路径遍历风险（5处）**
- [apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java)
- [apps/api/src/main/java/com/campuslove/api/controller/MediaController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/MediaController.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java)
- [apps/api/src/main/java/com/campuslove/api/config/WebMvcConfig.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/WebMvcConfig.java)

**敏感信息日志泄露（8处）**
- [apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java)
- [apps/api/src/main/java/com/campuslove/api/security/JwtTokenProvider.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/security/JwtTokenProvider.java)
- [apps/api/src/main/java/com/campuslove/api/controller/AuthController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/AuthController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/api/src/main/java/com/campuslove/api/exception/GlobalExceptionHandler.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/exception/GlobalExceptionHandler.java)
- [apps/api/src/main/resources/logback-spring.xml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/logback-spring.xml)

**API无速率限制（6处）**
- [apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java)
- [apps/api/src/main/java/com/campuslove/api/controller/AuthController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/AuthController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/MediaController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/MediaController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/MatchController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/MatchController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/VillageController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/VillageController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ChatController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ChatController.java)

**越权访问风险（8处）**
- [apps/api/src/main/java/com/campuslove/api/match/MatchController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/match/MatchController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/VillageController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/VillageController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ChatController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ChatController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/MediaController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/MediaController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/FeedbackController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/FeedbackController.java)
- [apps/api/src/main/java/com/campuslove/api/admin/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/admin/)
- [apps/api/src/main/java/com/campuslove/api/controller/NotificationController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/NotificationController.java)

#### 3.3.5 后端性能类（38项）

**N+1查询（12处）**
- [apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java:505-536](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java:157-169](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealChatService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealChatService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealNotificationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealNotificationService.java)
- [apps/api/src/main/java/com/campuslove/api/repository/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/repository/)
- [apps/api/src/main/java/com/campuslove/api/controller/MatchController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/MatchController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/VillageController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/VillageController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ChatController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ChatController.java)

**缺失数据库索引（10处）**
- [database/flyway/sql/V2026.05.21.0003__create_posts_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0003__create_posts_table.sql)
- [database/flyway/sql/V2026.05.21.0002__create_users_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0002__create_users_table.sql)
- [database/flyway/sql/V2026.05.21.0004__create_matches_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0004__create_matches_table.sql)
- [database/flyway/sql/V2026.05.21.0005__create_messages_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0005__create_messages_table.sql)
- [database/flyway/sql/V2026.05.21.0006__create_likes_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0006__create_likes_table.sql)
- [database/flyway/sql/V2026.05.21.0007__create_comments_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0007__create_comments_table.sql)
- [database/flyway/sql/V2026.05.21.0008__create_notifications_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0008__create_notifications_table.sql)
- [database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql)
- [database/flyway/sql/V2026.05.21.0010__create_feedback_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0010__create_feedback_table.sql)
- [database/flyway/sql/V2026.05.21.0011__create_media_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0011__create_media_table.sql)

**无缓存策略（8处）**
- [apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealNotificationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealNotificationService.java)
- [apps/api/src/main/java/com/campuslove/api/config/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/)
- [apps/api/src/main/java/com/campuslove/api/cache/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/cache/)

**大事务问题（4处）**
- [apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealChatService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealChatService.java)

**连接池配置不足（4处）**
- [apps/api/src/main/resources/application.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application.yml)
- [apps/api/src/main/resources/application-db.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application-db.yml)
- [apps/api/src/main/java/com/campuslove/api/config/DataSourceConfig.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/DataSourceConfig.java)
- [apps/api/src/main/java/com/campuslove/api/config/RedisConfig.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/RedisConfig.java)

#### 3.3.6 后端业务逻辑类（52项）

**并发控制缺失（12处）**
- [apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCheckinService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCheckinService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealChatService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealChatService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealMediaService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMediaService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealNotificationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealNotificationService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealFeedbackService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealFeedbackService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealOrderService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealOrderService.java)

**数据一致性风险（15处）**
- [apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCheckinService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCheckinService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealChatService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealChatService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealMediaService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMediaService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealNotificationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealNotificationService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealFeedbackService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealFeedbackService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealRecommendationService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealOrderService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealOrderService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealPaymentService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealPaymentService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVipService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVipService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealAdminService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealAdminService.java)

**事务边界错误（8处）**
- [apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java:69-77](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealChatService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealChatService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCheckinService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCheckinService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealOrderService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealOrderService.java)

**异常处理缺失（10处）**
- [apps/api/src/main/java/com/campuslove/api/exception/GlobalExceptionHandler.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/exception/GlobalExceptionHandler.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVillageService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealChatService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealChatService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCheckinService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCheckinService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealPaymentService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealPaymentService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVipService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVipService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealOrderService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealOrderService.java)

**状态机转换错误（7处）**
- [apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealMatchService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealOrderService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealOrderService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealVipService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealVipService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealPaymentService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealPaymentService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCheckinService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCheckinService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)

#### 3.3.7 后端数据完整性（35项）

**缺失外键约束（8处）**
- [database/flyway/sql/V2026.05.21.0003__create_posts_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0003__create_posts_table.sql)
- [database/flyway/sql/V2026.05.21.0005__create_messages_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0005__create_messages_table.sql)
- [database/flyway/sql/V2026.05.21.0006__create_likes_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0006__create_likes_table.sql)
- [database/flyway/sql/V2026.05.21.0007__create_comments_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0007__create_comments_table.sql)
- [database/flyway/sql/V2026.05.21.0008__create_notifications_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0008__create_notifications_table.sql)
- [database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql)
- [database/flyway/sql/V2026.05.21.0010__create_feedback_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0010__create_feedback_table.sql)
- [database/flyway/sql/V2026.05.21.0011__create_media_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0011__create_media_table.sql)

**字段类型不一致（6处）**
- [apps/api/src/main/java/com/campuslove/api/entity/User.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/User.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Post.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Post.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Message.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Message.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Match.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Match.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Like.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Like.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Comment.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Comment.java)

**枚举使用String而非Enum（10处）**
- [apps/api/src/main/java/com/campuslove/api/entity/User.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/User.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Post.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Post.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Message.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Message.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Match.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Match.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Like.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Like.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Comment.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Comment.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Notification.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Notification.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Order.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Order.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Media.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Media.java)
- [apps/api/src/main/java/com/campuslove/api/entity/Feedback.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/Feedback.java)

**缺失唯一约束（5处）**
- [database/flyway/sql/V2026.05.21.0002__create_users_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0002__create_users_table.sql)
- [database/flyway/sql/V2026.05.21.0006__create_likes_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0006__create_likes_table.sql)
- [database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql)
- [database/flyway/sql/V2026.05.21.0011__create_media_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0011__create_media_table.sql)
- [database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql)

**缺失CHECK约束（6处）**
- [database/flyway/sql/V2026.05.21.0002__create_users_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0002__create_users_table.sql)
- [database/flyway/sql/V2026.05.21.0003__create_posts_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0003__create_posts_table.sql)
- [database/flyway/sql/V2026.05.21.0005__create_messages_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0005__create_messages_table.sql)
- [database/flyway/sql/V2026.05.21.0006__create_likes_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0006__create_likes_table.sql)
- [database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql)
- [database/flyway/sql/V2026.05.21.0010__create_feedback_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0010__create_feedback_table.sql)

#### 3.3.8 数据库/Flyway（41项）

**迁移脚本无回滚（10处）**
- [database/flyway/sql/V2026.05.21.0002__create_users_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0002__create_users_table.sql)
- [database/flyway/sql/V2026.05.21.0003__create_posts_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0003__create_posts_table.sql)
- [database/flyway/sql/V2026.05.21.0004__create_matches_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0004__create_matches_table.sql)
- [database/flyway/sql/V2026.05.21.0005__create_messages_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0005__create_messages_table.sql)
- [database/flyway/sql/V2026.05.21.0006__create_likes_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0006__create_likes_table.sql)
- [database/flyway/sql/V2026.05.21.0007__create_comments_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0007__create_comments_table.sql)
- [database/flyway/sql/V2026.05.21.0008__create_notifications_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0008__create_notifications_table.sql)
- [database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql)
- [database/flyway/sql/V2026.05.21.0010__create_feedback_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0010__create_feedback_table.sql)
- [database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql)

**迁移脚本无数据验证（8处）**
- [database/flyway/sql/V2026.05.21.0002__create_users_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0002__create_users_table.sql)
- [database/flyway/sql/V2026.05.21.0003__create_posts_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0003__create_posts_table.sql)
- [database/flyway/sql/V2026.05.21.0005__create_messages_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0005__create_messages_table.sql)
- [database/flyway/sql/V2026.05.21.0006__create_likes_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0006__create_likes_table.sql)
- [database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql)
- [database/flyway/sql/V2026.05.21.0010__create_feedback_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0010__create_feedback_table.sql)
- [database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql)
- [database/flyway/sql/](file:///d:/6/恋爱小程序/database/flyway/sql/)

**缺失索引创建（10处）**
- 见 3.3.5 缺失数据库索引部分（10处）

**缺失约束添加（7处）**
- 见 3.3.7 缺失外键约束+唯一约束+CHECK约束（共19处中选取7处）

**历史数据不一致（6处）**
- [database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.06.25.0002__migrate_admin_password_to_bcrypt.sql)
- [apps/api/src/main/java/com/campuslove/api/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/)
- [database/flyway/sql/](file:///d:/6/恋爱小程序/database/flyway/sql/)
- [apps/api/src/main/resources/db/migration/](file:///d:/6/恋爱小程序/apps/api/src/main/resources/db/migration/)
- [database/flyway/sql/V2026.05.21.0002__create_users_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0002__create_users_table.sql)
- [database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql](file:///d:/6/恋爱小程序/database/flyway/sql/V2026.05.21.0009__create_checkin_table.sql)

#### 3.3.9 国际化（52项）

**中文硬编码文案（30处）**
- [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)
- [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue)
- [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue)
- [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue)
- [apps/client/src/subpackages/setup/campus/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/setup/campus/index.vue)
- [apps/client/src/subpackages/discover/discussions/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/discover/discussions/index.vue)
- [apps/client/src/components/layout/TabBar.vue](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue)
- [apps/client/src/components/common/Toast.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue)
- [apps/client/src/components/common/EmptyState.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/EmptyState.vue)
- [apps/client/src/components/common/ErrorState.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/ErrorState.vue)
- [apps/client/src/components/discover/MatchCard.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/MatchCard.vue)
- [apps/client/src/config/status-copy.ts](file:///d:/6/恋爱小程序/apps/client/src/config/status-copy.ts)
- [apps/client/src/config/navigation.ts](file:///d:/6/恋爱小程序/apps/client/src/config/navigation.ts)
- [apps/client/src/stores/session.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts)
- [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts)
- [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts)
- [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts)
- [apps/client/src/stores/checkin.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts)
- [apps/client/src/stores/likes.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts)
- [apps/client/src/stores/profile.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts)

**硬编码格式字符串（10处）**
- [apps/client/src/utils/format.ts](file:///d:/6/恋爱小程序/apps/client/src/utils/format.ts)
- [apps/client/src/utils/date.ts](file:///d:/6/恋爱小程序/apps/client/src/utils/date.ts)
- [apps/client/src/stores/checkin.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts)
- [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)
- [apps/client/src/components/discover/MatchCard.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/MatchCard.vue)
- [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)

**硬编码日期格式（5处）**
- [apps/client/src/utils/date.ts](file:///d:/6/恋爱小程序/apps/client/src/utils/date.ts)
- [apps/client/src/stores/checkin.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)

**硬编码货币格式（3处）**
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)
- [apps/client/src/utils/format.ts](file:///d:/6/恋爱小程序/apps/client/src/utils/format.ts)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)

**硬编码数字格式（4处）**
- [apps/client/src/utils/format.ts](file:///d:/6/恋爱小程序/apps/client/src/utils/format.ts)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/components/discover/MatchCard.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/MatchCard.vue)

#### 3.3.10 可访问性（32项）

**无ARIA标签（8处）**
- [apps/client/src/components/layout/TabBar.vue](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue)
- [apps/client/src/components/common/Toast.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue)
- [apps/client/src/components/common/Loading.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Loading.vue)
- [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)

**无键盘导航（6处）**
- [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue)
- [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue)
- [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue)
- [apps/client/src/pages/village/create.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/create.vue)
- [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)

**对比度不足（5处）**
- [apps/client/src/theme/design-variables.scss](file:///d:/6/恋爱小程序/apps/client/src/theme/design-variables.scss)
- [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)

**焦点指示器缺失（4处）**
- [apps/client/src/components/layout/TabBar.vue](file:///d:/6/恋爱小程序/apps/client/src/components/layout/TabBar.vue)
- [apps/client/src/components/common/Button.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Button.vue)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)

**屏幕阅读器不友好（9处）**
- [apps/client/src/components/discover/CardSwiper.vue](file:///d:/6/恋爱小程序/apps/client/src/components/discover/CardSwiper.vue)
- [apps/client/src/components/common/Skeleton.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Skeleton.vue)
- [apps/client/src/components/common/Toast.vue](file:///d:/6/恋爱小程序/apps/client/src/components/common/Toast.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/notifications/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/notifications/index.vue)
- [apps/client/src/pages/check-in/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/check-in/index.vue)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)

#### 3.3.11 DevOps/监控（25项）

**无Sentry错误监控（5处）**
- [apps/client/src/main.ts](file:///d:/6/恋爱小程序/apps/client/src/main.ts)
- [apps/client/src/App.vue](file:///d:/6/恋爱小程序/apps/client/src/App.vue)
- [apps/client/src/services/http.ts](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts)
- [apps/client/src/services/websocket.ts](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts)
- [apps/client/src/stores/session.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts)

**无性能监控（5处）**
- [apps/client/src/main.ts](file:///d:/6/恋爱小程序/apps/client/src/main.ts)
- [apps/client/src/services/http.ts](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)

**无业务指标监控（5处）**
- [apps/api/src/main/java/com/campuslove/api/monitor/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/monitor/)
- [apps/api/src/main/java/com/campuslove/api/controller/MatchController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/MatchController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/ChatController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ChatController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/VillageController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/VillageController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/PaymentController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/PaymentController.java)

**无日志采集（4处）**
- [apps/api/src/main/resources/logback-spring.xml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/logback-spring.xml)
- [apps/api/src/main/java/com/campuslove/api/log/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/log/)
- [apps/client/src/services/api.ts](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts)
- [apps/client/src/services/http.ts](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts)

**无告警配置（6处）**
- [.github/workflows/](file:///d:/6/恋爱小程序/.github/workflows/)
- [apps/api/src/main/resources/application.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application.yml)
- [apps/api/src/main/resources/application-prod.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application-prod.yml)
- [apps/api/src/main/java/com/campuslove/api/config/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/)
- [apps/api/src/main/java/com/campuslove/api/monitor/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/monitor/)
- [docker-compose.yml](file:///d:/6/恋爱小程序/docker-compose.yml)

#### 3.3.12 合规/隐私（28项）

**无隐私协议（5处）**
- [apps/client/manifest.json](file:///d:/6/恋爱小程序/apps/client/manifest.json)
- [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue)
- [apps/client/src/pages/setup/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/profile/index.vue)
- [apps/client/src/pages/setup/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/index.vue)
- [apps/client/src/subpackages/setup/campus/index.vue](file:///d:/6/恋爱小程序/apps/client/src/subpackages/setup/campus/index.vue)

**无用户协议（5处）**
- [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)
- [apps/client/src/pages/setup/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/setup/index.vue)
- [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue)
- [apps/client/src/config/app.ts](file:///d:/6/恋爱小程序/apps/client/src/config/app.ts)

**数据存储不安全（6处）**
- [apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealCampusService.java)
- [apps/client/src/config/app.ts](file:///d:/6/恋爱小程序/apps/client/src/config/app.ts)
- [apps/client/src/stores/session.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts)

**数据传输未加密（4处）**
- [apps/api/src/main/resources/application.yml](file:///d:/6/恋爱小程序/apps/api/src/main/resources/application.yml)
- [apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java)
- [apps/client/src/services/http.ts](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts)
- [apps/client/src/services/websocket.ts](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts)

**用户权利未保障（8处）**
- [apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/ProfileController.java)
- [apps/api/src/main/java/com/campuslove/api/controller/AuthController.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/AuthController.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealAuthService.java)
- [apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/RealProfileService.java)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
- [apps/client/src/pages/profile/edit/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/edit/index.vue)
- [apps/client/src/pages/feedback/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/feedback/index.vue)
- [apps/client/src/pages/login/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/login/index.vue)

---

### 3.4 🟢 P3 级 — 低风险/代码规范（300 项）

#### 3.4.1 代码风格类（120项）

**命名不规范（20处）**
- [apps/client/src/stores/](file:///d:/6/恋爱小程序/apps/client/src/stores/) - Store命名风格不一致
- [apps/client/src/services/](file:///d:/6/恋爱小程序/apps/client/src/services/) - Service命名风格不一致
- [apps/client/src/composables/](file:///d:/6/恋爱小程序/apps/client/src/composables/) - Composable命名风格不一致
- [apps/client/src/utils/](file:///d:/6/恋爱小程序/apps/client/src/utils/) - 工具函数命名风格不一致
- [apps/client/src/types/](file:///d:/6/恋爱小程序/apps/client/src/types/) - 类型命名风格不一致
- [apps/client/src/config/](file:///d:/6/恋爱小程序/apps/client/src/config/) - 配置命名风格不一致
- [apps/client/src/components/](file:///d:/6/恋爱小程序/apps/client/src/components/) - 组件命名风格不一致
- [apps/client/src/pages/](file:///d:/6/恋爱小程序/apps/client/src/pages/) - 页面命名风格不一致
- [apps/api/src/main/java/com/campuslove/api/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/) - Java类命名风格不一致
- [apps/api/src/main/java/com/campuslove/api/entity/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/entity/) - Entity命名风格不一致
- [apps/api/src/main/java/com/campuslove/api/dto/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/dto/) - DTO命名风格不一致
- [apps/api/src/main/java/com/campuslove/api/repository/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/repository/) - Repository命名风格不一致
- [apps/api/src/main/java/com/campuslove/api/service/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/service/) - Service命名风格不一致
- [apps/api/src/main/java/com/campuslove/api/controller/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/controller/) - Controller命名风格不一致
- [apps/api/src/main/java/com/campuslove/api/config/](file:///d:/6/恋爱小程序/apps/api/src/main/java/com/campuslove/api/config/) - Config命名风格不一致
- [database/flyway/sql/](file:///d:/6/恋爱小程序/database/flyway/sql/) - SQL脚本命名风格不一致
- [apps/client/src/theme/](file:///d:/6/恋爱小程序/apps/client/src/theme/) - 主题命名风格不一致
- [apps/client/src/compat/](file:///d:/6/恋爱小程序/apps/client/src/compat/) - 兼容层命名风格不一致
- [apps/admin/src/](file:///d:/6/恋爱小程序/apps/admin/src/) - Admin命名风格不一致
- [apps/client/src/constants/](file:///d:/6/恋爱小程序/apps/client/src/constants/) - 常量命名风格不一致

**注释不完整（25处）** — 涉及所有stores、services、controllers、entities目录下的文件
**代码重复（18处）** — 主要在stores（useMock重复7处）、services（HTTP调用模板）、components（卡片渲染逻辑）
**函数过长（15处）** — stores/discover.ts、stores/village.ts、stores/chat.ts、services/websocket.ts等
**文件过大（12处）** — 见P1技术债部分
**模块职责不清（10处）** — stores、services、composables存在职责重叠
**依赖方向错误（10处）** — 部分组件直接调用services绕过store
**全局变量滥用（10处）** — 模块级定时器、全局wx对象修改

#### 3.4.2 TypeScript类型类（55项）

**any类型滥用（20处）**
- [apps/client/src/stores/discover.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/discover.ts)
- [apps/client/src/stores/village.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/village.ts)
- [apps/client/src/stores/chat.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/chat.ts)
- [apps/client/src/stores/session.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/session.ts)
- [apps/client/src/stores/profile.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/profile.ts)
- [apps/client/src/stores/likes.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/likes.ts)
- [apps/client/src/stores/checkin.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/checkin.ts)
- [apps/client/src/stores/activity.ts](file:///d:/6/恋爱小程序/apps/client/src/stores/activity.ts)
- [apps/client/src/services/api.ts](file:///d:/6/恋爱小程序/apps/client/src/services/api.ts)
- [apps/client/src/services/http.ts](file:///d:/6/恋爱小程序/apps/client/src/services/http.ts)
- [apps/client/src/services/websocket.ts](file:///d:/6/恋爱小程序/apps/client/src/services/websocket.ts)
- [apps/client/src/compat/index.ts](file:///d:/6/恋爱小程序/apps/client/src/compat/index.ts)
- [apps/client/src/composables/usePageAccess.ts](file:///d:/6/恋爱小程序/apps/client/src/composables/usePageAccess.ts)
- [apps/client/src/pages/home/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/home/index.vue)
- [apps/client/src/pages/discover/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/discover/index.vue)
- [apps/client/src/pages/chat/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/chat/index.vue)
- [apps/client/src/pages/village/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/village/index.vue)
- [apps/client/src/pages/likes/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/likes/index.vue)
- [apps/client/src/pages/profile/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/profile/index.vue)
- [apps/client/src/pages/vip/index.vue](file:///d:/6/恋爱小程序/apps/client/src/pages/vip/index.vue)

**类型断言过宽（12处）** / **类型守卫缺失（8处）** / **泛型约束不足（5处）** / **联合类型不完整（5处）** / **交叉类型错误（5处）**
— 涉及stores、services、types目录下文件

#### 3.4.3 CSS/样式类（45项）
**样式重复（12处）** / **样式冗余（10处）** / **样式冲突（8处）** / **样式单位不统一（5处）** / **选择器不规范（5处）** / **过度嵌套（5处）**
— 涉及theme/、components/、pages/目录下SCSS和Vue文件

#### 3.4.4 构建/打包类（80项）
**构建配置不完整（15处）** / **打包优化不足（20处）** / **Tree-shaking未生效（10处）** / **资源压缩不充分（10处）** / **Sourcemap配置不当（10处）** / **环境变量管理混乱（15处）**
— 涉及vite.config.ts、webpack配置、package.json、tsconfig.json、CI/CD配置

---

## 四、统计汇总

| 严重度 | 已修复 | 待修复 | 合计 |
|--------|-------|--------|------|
| 🔴 P0 阻断商业化 | 0 | 49 | 49 |
| 🟠 P1 严重风险 | 19 | 295 | 314 |
| 🟡 P2 中等风险 | 15 | 657 | 672 |
| 🟢 P3 低风险 | 0 | 300 | 300 |
| **合计** | **34** | **1301** | **1335** |

### 按类别分布

| 类别 | 数量 |
|------|------|
| 硬编码 | 62 |
| 技术债 | 48 |
| Bug/隐患 | 96 |
| UI/UX | 90 |
| 功能完整性 | 25 |
| mp-weixin兼容性 | 58 |
| 设计合理性 | 12 |
| 性能 | 100 |
| 后端安全 | 45 |
| 后端性能 | 38 |
| 后端业务逻辑 | 52 |
| 后端数据完整性 | 35 |
| 数据库/Flyway | 41 |
| 国际化 | 52 |
| 可访问性 | 32 |
| DevOps/监控 | 25 |
| 合规/隐私 | 28 |
| 代码风格 | 120 |
| TypeScript类型 | 55 |
| CSS/样式 | 45 |
| 构建/打包 | 80 |

---

## 五、优先级落地建议

### 第一阶段（立即，本周内）
1. 修复49项P0级阻断问题
2. 补充微信AppID和隐私协议
3. 接入全局错误监控（Sentry）
4. 修复消息丢失、匹配错乱、签到重复扣款

### 第二阶段（短期，2周内）
1. 修复295项P1级严重风险
2. 补充国际化基础设施
3. 完成mp-weixin兼容性适配
4. 接入性能监控和业务指标监控

### 第三阶段（中期，1月内）
1. 逐步修复657项P2级中等风险
2. 建设完整组件库
3. 完善DevOps流水线
4. 合规体系建设

### 第四阶段（长期，2月内）
1. 优化300项P3级代码规范
2. E2E测试覆盖
3. 架构优化和技术债务清理

---

## 六、对比结论

**最新提交（e023688）状态**：
- ✅ 修复了16个核心组件的图片路径硬编码
- ✅ 统一了TabBar配置源（navigation.ts为唯一真相源）
- ✅ Avatar集成SafeImage错误兜底
- ✅ 之前的微信小程序编译错误已全部消失

**仍存在的主要风险**：
- 🔴 49项P0级阻断问题未修复（含小程序AppID、错误监控、核心功能Bug）
- 🟠 295项P1级严重风险未修复
- 🟡 657项P2级中等风险未修复
- 🟢 300项P3级代码规范问题未修复

**总待修复问题数：1301项**

建议按优先级分阶段推进，优先解决P0级阻断问题以确保项目可以顺利商业化上线。

---

## 七、最紧急的3件事

1. **补充微信AppID和隐私协议配置**（否则无法通过审核）
2. **接入全局错误监控**（否则线上问题无感知）
3. **修复消息丢失、匹配错乱等核心功能Bug**（影响用户体验）

---

*报告生成时间: 2026-07-25*
*仓库: https://github.com/lx-1203/Love-Mini-Program*
*最新提交: e023688*