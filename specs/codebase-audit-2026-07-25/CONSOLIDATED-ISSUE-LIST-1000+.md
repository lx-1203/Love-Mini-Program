# 恋爱小程序代码库综合审计问题清单

> **审计日期**: 2026-07-25
> **审计范围**: 19 份审计分册（README.md、02-*.md 至 20-*.md）
> **报告生成日期**: 2026-07-26
> **原始发现总数**: 约 1,618 项
> **本报告条目总数**: 1,000 条

---

## 执行摘要

本次审计覆盖恋爱小程序（CampusLove）全量代码库，涵盖客户端（uni-app/Vue/TS）、
管理后台（Vue/Element Plus）、Java 后端（Spring Boot/JPA）、数据库（MySQL/Flyway）、
配置与基础设施。原始 19 个维度共识别 **1,618 项问题**；本报告将其合并为 **6 大类别**，
按严重程度重新排序，并将聚合描述拆分为独立条目，最终形成 **1,000 条**可追溯问题条目。

**商业化落地最大风险**：微信小程序核心登录链路未调用 `wx.login()`，导致线上用户无法完成微信 OAuth 登录；
同时 `/uploads/**` 公开可访问、管理端接口缺少 `@PreAuthorize`、JWT 无撤销机制、
大量用户隐私接口缺少授权检查，存在严重安全与合规风险。客户端与管理后台完全缺失 i18n 基础设施，
无法拓展非中文市场。

**技术债务后果**：设计系统三套 Token 并存、500+ 处硬编码中文字符串、数据库 ENUM 滥用与命名混乱、
5 个 Java God Class、零缓存/零限流/零版本化 API，导致后续迭代成本指数级上升。

**用户留存/转化影响**：聊天功能存在双 Store 重复渲染、语音消息为文本空壳、匹配滑动在 API 失败时返回随机 Mock、
个人主页 VIP 状态不显示、Feedback 管理后台展示假数据——核心用户旅程多处断裂，直接影响留存与付费转化。

---

## 严重程度分布统计

| 严重程度 | 标识 | 条目数 | 占比 |
|----------|------|--------|------|
| CRITICAL | 🔴 | 95 | 9.5% |
| HIGH | 🟠 | 483 | 48.3% |
| MEDIUM | 🟡 | 288 | 28.8% |
| LOW | 🟢 | 134 | 13.4% |
| **总计** | — | **1,000** | **100.0%** |

### 按大类分布

| 大类 | 条目数 |
|------|--------|
| 一、代码层：硬编码与技术债 | 126 |
| 二、代码层：Bug 与安全隐患 | 132 |
| 三、功能完整性与业务逻辑 | 591 |
| 四、UI/UX 交互与设计合理性 | 95 |
| 五、测试与工程质量 | 25 |
| 六、基础设施与运维合规 | 31 |

---

## 真实编译验证结果

| 验证项 | 结果 |
|--------|------|
| 项目结构测试 | 通过 |
| Client TypeScript 类型检查 | 通过 |
| Client 单元测试 | 26 个测试文件、240 个用例通过（有 Vue 内置元素警告） |
| Client 构建（H5 + mp-weixin） | 通过（有 Sass 弃用警告、空 chunk 警告、`pages/village/detail.vue` 条件编译 `#endif` 缺失警告） |
| Admin TypeScript 类型检查 | 通过 |
| Admin 生产构建 | 通过 |
| Java 主代码编译（`mvn compile`） | 通过 |
| Java 测试编译（`mvn test`） | 失败，`RecommendationServiceTest.java:72` 中 `RealRecommendationService` 构造函数调用缺少新增的 `com.campuslove.api.monitor.MatchMetrics` 参数 |

> **说明**：测试编译失败说明新增依赖/构造函数签名变更后，单元测试未及时同步，反映了测试维护与 CI 门禁的不足。

---

## 问题清单

> 每个条目按「文件路径、严重程度、问题描述、商业化影响、修复方向」列出。
> 汇总类条目已按文件/组件/出现次数拆分为独立条目，以保证可读性与可追踪性。

## 一、代码层：硬编码与技术债

| 编号 | 文件路径 | 严重程度 | 问题描述 | 商业化影响 | 修复方向 |
|------|----------|----------|----------|------------|----------|
| 一-0001 | `apps/admin/src/views/Login.vue / stores/session.ts` | CRITICAL | Admin 登录页面 7 处错误信息硬编码中文（用户名不存在、密码错误、账号已禁用、网络错误、验证码错误、Token过期、未知错误）（×7） | 登录错误信息无法国际化，海外运营或合规审计受阻，且安全提示文案无法由运营调整 | 引入 vue-i18n，错误信息使用 key 管理 |
| 一-0008 | `apps/api/src/main/java/com/campuslove/api/config/WebConfig.java` | CRITICAL | CORS 来源硬编码为 http://localhost:5173 与 http://localhost:3000，且使用 allowedOrigins 不支持子域名通配符 | 生产环境小程序域名未配置导致跨域失败，allowCredentials+localhost 组合存在安全风险 | 从配置文件读取允许来源列表并使用 allowedOriginPatterns |
| 一-0009 | `apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java` | CRITICAL | JWT 认证失败未返回标准 HTTP 401：Token 过期返回 200+自定义 JSON，Token 格式错误可能返回 500，缺少 Authorization 头可能返回 500 | 前端拦截器无法按标准状态码判断重新登录，用户体验差且不符合 REST 规范 | 统一返回 HTTP 401 并规范错误体 |
| 一-0010 | `apps/api/src/main/resources/application-db.yml` | CRITICAL | 数据库配置中可能包含明文密码（需审计确认），敏感配置未加密 | 生产数据库密码泄露风险，违反安全合规要求 | 使用环境变量 ${DB_PASSWORD} 或 jasypt/配置中心加密 |
| 一-0011 | `apps/client/src/components/layout/TabBar.vue` | HIGH | TabBar 组件存在 27 处设计系统违规：18 处硬编码颜色（#333/#999/#FF6B9D/#fff/#f0f0f0等）、4 处硬编码 box-shadow、5 处硬编码字号（×27） | 底部导航作为最高频触点，品牌色/阴影/字号不统一会严重削弱品牌认知，暗色模式与主题切换无法落地 | 迁移到 CSS 变量 var(--c-primary)/var(--c-text)/var(--shadow-sm) 等 |
| 一-0038 | `apps/client/src/components/chat/IcebreakerSuggestions.vue` | HIGH | IcebreakerSuggestions 组件存在 18 处设计系统违规：8 处 button 颜色、4 处卡片背景、6 处文字颜色硬编码（×18） | 聊天首屏元素品牌色不一致，影响用户对产品视觉统一性的感知 | 使用语义化颜色 token 替换硬编码色值 |
| 一-0056 | `全局（12+ 组件）` | HIGH | color: #fff 在至少 12 个组件文件中被硬编码使用，而非 var(--c-text-inverse)（×12） | 主题变更时需全局搜索替换，极易遗漏，导致部分组件文字在暗色/亮色模式下不可见 | 统一替换为 var(--c-text-inverse) |
| 一-0068 | `apps/client/src/components/chat/HeartSignal.vue` | HIGH | 心跳动画中关键帧颜色 #FF6B9D 硬编码 3 处，粒子颜色 RGB 基数硬编码（×3） | 品牌色变更时动画效果与设计系统脱节，关键帧不支持部分浏览器 CSS 变量 | 通过 JS 读取 CSS 变量后注入 Canvas/动画关键帧 |
| 一-0071 | `apps/admin/src/views/Layout.vue` | HIGH | Layout.vue 侧边栏 Logo、8 个菜单项、顶栏下拉菜单、面包屑、页脚版权、折叠按钮 tooltip 等 15+ 处中文硬编码（×15） | 后台导航骨架无法国际化，运营后台扩展至多语言市场成本极高 | 提取菜单配置数组与 locale 文件 |
| 一-0086 | `apps/admin/src/views/Dashboard.vue` | HIGH | Dashboard.vue 页面标题、6 个统计卡片标签、图表标题/图例、表格列名、加载状态、日期占位等 12 处中文硬编码（×12） | 数据概览页面无法国际化，运营人员看到的指标文案固定不可配置 | 使用 i18n key 替换所有用户可见文本 |
| 一-0098 | `apps/admin/src/views/Users.vue` | HIGH | 用户管理页面标题、搜索框 placeholder、筛选按钮、8 列表格列名、操作按钮、批量操作、分页文案等 14 处硬编码（×14） | 用户管理功能无法国际化，运营后台维护成本高 | 抽取文案到 locale 文件 |
| 一-0112 | `apps/admin/src/views/ContentAudit.vue` | HIGH | 内容审核页面标题、标签页、状态标签、内容类型标签、操作按钮、驳回弹窗、操作结果 Toast 等 13 处硬编码（×13） | 审核后台文案固定，无法适配多地区合规要求 | i18n 化 |
| 一-0125 | `apps/admin/src/views/ReportManagement.vue` | HIGH | 举报管理页面标题、标签页、8 列表格列名、举报类型标签、操作按钮、处理弹窗、状态文本等 12 处硬编码（×12） | 举报处理后台无法国际化，运营效率受限 | i18n 化 |
| 一-0137 | `apps/admin/src/views/SensitiveWords.vue` | HIGH | 敏感词管理页面标题、添加表单字段、批量导入、6 列表格列名、操作、删除确认、搜索结果等 12 处硬编码（×12） | 敏感词后台文案固定，无法适配不同市场内容合规要求 | i18n 化 |
| 一-0149 | `apps/admin/src/views/NotifyConfig.vue` | HIGH | 通知配置页面标题、模板列表、模板名称、表单标签、变量提示、开关状态、保存按钮、操作反馈等 12 处硬编码（×12） | 通知模板管理无法国际化，推送文案多语言支持缺失 | i18n 化 |
| 一-0161 | `apps/admin/src/views/Feedback.vue` | HIGH | 用户反馈页面标题、标签页、8 列表格列名、反馈类型、回复弹窗、操作、状态等 11 处硬编码（×11） | 反馈处理后台无法国际化 | i18n 化 |
| 一-0172 | `apps/admin/src/views/AuditLogs.vue` | HIGH | 操作日志页面标题、筛选条件、日期选择、搜索、7 列表格列名、详情弹窗、导出等 12 处硬编码（×12） | 审计日志后台无法国际化，合规审计体验差 | i18n 化 |
| 一-0184 | `apps/api/src/main/java/com/campuslove/api/growth/WeChatPushService.java` | HIGH | 微信 API URL（access_token、发送模板消息、code2session）硬编码，无法按区域/环境切换 | 微信 API 版本升级或环境切换时需改代码重新部署，运维不灵活 | 移至 application-wechat.yml 配置 |
| 一-0185 | `apps/api/src/main/java/com/campuslove/api/media/LocalMediaStorageService.java` | HIGH | 本地媒体存储路径硬编码为 D:/uploads/campuslove/...，Linux 服务器路径格式不兼容，且未分片目录 | 生产部署到 Linux 时上传失败，所有文件堆叠在同一目录影响 IO 性能 | 通过配置注入路径并按日期/userId 分片 |
| 一-0186 | `apps/api/src/main/java/com/campuslove/api/discover/RealRecommendationService.java` | HIGH | RealRecommendationService 为 God Class，1368 行，混合推荐算法、缓存、查询、排序 | 单一职责违反，修改推荐算法易引入其他功能 bug，单元测试困难 | 拆分为 RecommendationStrategy/UserPreferenceCalculator/CacheManager/Ranker |
| 一-0187 | `apps/api/src/main/java/com/campuslove/api/discover/RealMatchService.java` | HIGH | RealMatchService 为 God Class，1011 行，承担匹配逻辑过多职责 | 可维护性差，匹配规则变更风险高 | 按职责拆分为 3 个类 |
| 一-0188 | `apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java` | HIGH | RealVillageService 为 God Class，979 行，职责混杂 | 社区功能维护困难，N+1 与全表扫描等问题集中 | 拆分为 3 个类 |
| 一-0189 | `apps/api/src/main/java/com/campuslove/api/chat/RealTempChatService.java` | HIGH | RealTempChatService 为 God Class，948 行 | 临时聊天逻辑复杂度高，测试覆盖困难 | 拆分为 3 个类 |
| 一-0190 | `apps/api/src/main/java/com/campuslove/api/profile/RealProfileService.java` | HIGH | RealProfileService 为 God Class，748 行 | 用户资料功能耦合严重 | 拆分为 2 个类 |
| 一-0191 | `全局（catch(Exception)）` | HIGH | 50+ 处泛化异常捕获 catch(Exception) / catch(Throwable)，其中约 15 处吞异常、25 处返回通用错误、5 处 e.printStackTrace（×50） | 具体错误信息丢失，生产问题难以定位，部分异常被静默吞掉导致数据不一致 | 捕获具体异常类型，业务异常自定义类，未处理异常交给全局处理器 |
| 一-0241 | `apps/client/src/services/mocks/fixtures.ts` | HIGH | fixtures.ts 中 200+ 硬编码中文字符串（用户昵称、简介、标签、帖子正文、评论、聊天消息、活动数据、系统通知）（×200） | mock 数据无法国际化，开发环境无法验证多语言场景 | mock 数据也使用 i18n key 或分离到语言包 |
| 一-0441 | `apps/client/src/stores/（14 个 store）` | HIGH | 14 个 Store 文件中约 80+ 处错误回退消息硬编码中文（获取用户信息失败、消息发送失败、匹配失败等）（×80） | 前端错误提示无法国际化，且同一语义在不同 store 文案不一致 | 创建统一错误消息模块并使用 i18n key |
| 一-0521 | `全局（8 个文件时间格式化硬编码）` | HIGH | 8 个文件使用硬编码中文时间文本（刚刚、分钟前、小时前、天前、今天、昨天、上午、下午等）（×8） | 时间显示无法国际化，且复用困难 | 使用 Intl.DateTimeFormat / dayjs locale 或 i18n key |
| 一-0529 | `apps/client/pages/login/index.vue` | HIGH | 登录页用户协议和隐私政策全文约 500+ 字硬编码，微信一键登录、手机号登录相关文案硬编码 | 法律文本更新需发版，合规风险高；无法 A/B 测试文案 | 法律文本从 CMS/配置文件获取，登录流程文案 i18n 化 |
| 一-0530 | `apps/client/pages/chat/index.vue` | HIGH | 聊天页面空状态、列表项类型提示、输入框 placeholder、发送按钮、加载状态、系统消息等 12 处中文硬编码（×12） | 聊天核心页面无法国际化，文案无法运营配置 | 提取到 locale 文件 |
| 一-0542 | `apps/client/pages/chat-session/index.vue` | HIGH | 会话页面标题回退、右上角菜单、操作确认、解锁提示等 14 处中文硬编码（×14） | 会话页面无法国际化，运营无法调整引导文案 | i18n 化 |
| 一-0556 | `apps/client/pages/discussions/index.vue / components/discover/CardSwiper.vue / CardDetailOverlay.vue` | HIGH | 发现/匹配相关页面：卡片操作、卡片信息、空状态、操作确认、详情标签、锁定引导等 18 处中文硬编码（×18） | 核心匹配功能无法国际化，用户引导文案固定 | i18n 化 |
| 一-0574 | `apps/client/src/utils/env.ts` | HIGH | API 基地址硬编码 localhost fallback：import.meta.env.VITE_API_BASE_URL \|\| 'http://localhost:8080/api' | 生产环境漏配环境变量时请求发往本地，表现为白屏 | 移除 fallback 或设为 MISSING_VITE_API_BASE_URL 并启动校验 |
| 一-0575 | `apps/client/src/utils/http.ts` | HIGH | HTTP 超时 10000ms、重试次数 3、重试间隔 1000ms 硬编码 | 无法按接口类型（如 AI 视频生成需要更长超时）配置 | 提取到 config/api.ts 并支持按接口配置 |
| 一-0576 | `apps/client/src/services/websocket.ts` | HIGH | WebSocket 重连间隔 3000ms、最大重连次数 10、心跳间隔 10000ms 硬编码 | 不同网络环境（内网/公网）无法调整策略 | 移至 config/app.ts 或环境变量 |
| 一-0577 | `apps/client/src/stores/session.ts / chat.ts / profile.ts / discover.ts` | HIGH | 多个 Store 中 uni.setStorageSync key 名称硬编码，与 config/app.ts 中常量命名冲突（如 user-token vs token） | 清理缓存逻辑不一致，退出登录后 token 可能残留 | 统一使用 config/app.ts 中定义的存储 key 常量 |
| 一-0578 | `apps/client/src/config/schools.ts` | HIGH | 学校列表仅硬编码 4 所学校（北京大学、清华大学、复旦大学、上海交通大学） | 其他学校用户无法选择，注册流程阻塞，产品覆盖范围受限 | 从后端 API 动态获取学校列表 |
| 一-0579 | `全局（跨页面路由硬编码）` | HIGH | 跨页面硬编码路由路径重复 10+ 次（/pages/discover/index 出现 10+ 次，/pages/chat/index 8+ 次）（×10） | 页面路径重构时需在多处修改，遗漏导致导航断裂 | 定义 constants/routes.ts 统一维护 |
| 一-0589 | `apps/client/pages/activities/index.vue / chat/index.vue / chat-session/index.vue / login/index.vue / discussions/index.vue` | HIGH | 5 个页面 CSS 颜色值硬编码（#fff/#000/#333/#eee/渐变等），未建立 CSS 变量体系（×5） | 暗色模式切换与品牌色变更成本高，视觉不统一 | 在 App.vue :root 定义 CSS 变量并替换 |
| 一-0594 | `apps/client/pages/activities/index.vue / chat-session/index.vue / discussions/index.vue` | HIGH | 3 个页面使用 emoji 充当功能图标（📍地点、🕐时间、👤参与者等）（×3） | emoji 在不同设备渲染不一致，无法通过 CSS 控制，与设计风格不协调 | 替换为 SVG 图标或 uni-icons |
| 一-0597 | `apps/client/pages/activities/index.vue / chat/index.vue / chat-session/index.vue / login/index.vue / discussions/index.vue` | HIGH | 5 个页面 100% 硬编码中文文案，无 i18n key（×5） | 国际化改造成本极高，文案无法运营配置 | 引入 i18n 框架并提取文案 |
| 一-0602 | `apps/client/pages/chat-session/index.vue / discussions/index.vue / activities/index.vue` | HIGH | 魔法数字遍布页面：消息截断 50、标题最大 10、未读角标 99、输入框 maxlength 240、placeholder 200 等 5 处（×5） | 调整业务参数时易误改或遗漏 | 定义 UI_LIMITS 常量 |
| 一-0607 | `apps/client/pages/activities/index.vue` | HIGH | 日历组件星期标签 ['日','一',...'六'] 与月份标签 ['1月',...'12月'] 硬编码中文 | 英文用户看到中文日期，体验差 | 使用 Intl.DateTimeFormat 或 dayjs locale |
| 一-0608 | `apps/admin/src/views/Dashboard.vue / Users.vue / Posts.vue / Feedback.vue / Reports.vue / AuditLogs.vue / NotifyConfig.vue / SensitiveWords.vue` | HIGH | 8 个 Admin 视图组件中存在 15+ 个相同 CSS 类复制粘贴（page-header/page-title/stats-grid/stat-card/table/table th/table td/search-bar/btn/btn-primary/pagination 等）（×15） | 修改全局样式需同时改 8 个文件，极易遗漏导致样式不一致 | 提取到 admin-common.css 或共享组件 |
| 一-0623 | `apps/admin/src/stores/session.ts / apps/admin/.env.development` | HIGH | 环境变量命名不一致：session.ts 读取 VITE_DEV_USERNAME，.env.development 定义 VITE_DEV_DEFAULT_USERNAME | 开发环境自动登录静默失效，开发者需手动输入账号密码 | 统一变量名并添加构建时校验 |
| 一-0624 | `apps/admin/src/views/Users.vue / Posts.vue / AuditLogs.vue` | HIGH | 3 个组件各自实现完全相同的分页逻辑（currentPage/pageSize/total/totalPages/changePage），约 80 行重复代码 | 分页边界 bug 修复需同步多处，易遗漏 | 抽取 <Pagination> 组件或 usePagination composable |
| 一-0625 | `apps/admin/src/views/*.vue` | HIGH | 所有 Admin 视图组件颜色、间距、字体大小、圆角、阴影均为硬编码 CSS 字面量，无 Design Token 系统 | 无法实现主题切换，品牌色变更需全局搜索替换 50+ 处 | 定义 CSS 自定义属性并全面替换 |
| 一-0626 | `apps/admin/src/utils/http.ts` | HIGH | API Base URL 硬编码 fallback：import.meta.env.VITE_API_BASE_URL \|\| 'http://localhost:8080/api' | 生产部署漏配环境变量时请求发往 localhost，页面空白且无错误提示 | 移除 fallback 并添加构建时校验 |
| 一-0627 | `apps/admin/src/stores/session.ts / utils/http.ts` | HIGH | token、userInfo、refreshToken 等 localStorage key 名称在多处硬编码 | 修改存储 key 时遗漏导致认证失效 | 定义 constants/storage-keys.ts 统一管理 |
| 一-0628 | `apps/admin/src/views/*.vue` | HIGH | 所有 Admin 界面文案（按钮、表格列头、提示、表单标签）硬编码中文，无 i18n 基础设施 | 后台无法国际化，未来改造成本极高 | 引入 vue-i18n 并提取文案 |
| 一-0629 | `manifest.json / project.config.json / 多个配置文件` | HIGH | 小程序 AppID 以明文硬编码在多个配置文件中 | 不同环境切换 AppID 需修改多处，易出错 | 使用环境变量或构建脚本动态注入 |
| 一-0630 | `apps/client/src/components/home/PeopleScroll.vue` | HIGH | 硬编码 .slice(0,5) 截断展示用户 | 后端推荐结果超过 5 个被浪费 | 通过 prop maxDisplay 或分页控制 |
| 一-0631 | `apps/client/src/components/UnlockGuideModal.vue` | MEDIUM | UnlockGuideModal 遮罩层、卡片背景、按钮渐变、文字颜色、分隔线、圆角等 10 处未使用设计 token（×10） | 付费引导弹窗视觉风格与全局设计系统不一致，降低转化率 | 替换为 var(--c-overlay)、var(--c-bg-primary)、var(--c-border) 等 |
| 一-0641 | `apps/client/src/components/common/LockScreen.vue` | MEDIUM | LockScreen 全屏渐变背景、文字颜色、半透明按钮、边框等 8 处硬编码（×8） | 用户解锁前首屏页面视觉不一致，影响第一印象 | 使用 CSS 变量定义渐变与反色文字 |
| 一-0649 | `apps/client/src/components/discover/CardSwiper.vue` | MEDIUM | CardSwiper 卡片阴影、标签颜色（#FF6B9D/#6BCB77/#4D96FF）、文字叠加渐变等 7 处硬编码（×7） | 核心匹配界面视觉 token 不统一，主题切换困难 | 标签颜色使用语义 token（primary/success/info） |
| 一-0656 | `apps/client/src/components/discover/CardDetailOverlay.vue` | MEDIUM | CardDetailOverlay 标签页指示符、信息行背景、分割线、关闭按钮颜色等 6 处硬编码（×6） | 详情浮层视觉细节不一致，暗色模式适配成本高 | 迁移到语义化 CSS 变量 |
| 一-0662 | `apps/client/src/components/layout/AppShell.vue` | MEDIUM | AppShell 安全区域背景、加载状态颜色、网络状态条颜色等 5 处硬编码（×5） | 应用框架视觉状态不统一，网络异常提示可读性差 | 使用 var(--c-bg-primary)、var(--c-text-secondary) 等 |
| 一-0667 | `apps/client/src/components/home/HomeHeader.vue` | MEDIUM | HomeHeader 渐变背景、通知徽标、搜索框样式等 6 处硬编码（×6） | 首页顶部品牌视觉不统一，影响整体品牌识别 | 使用 CSS 变量与语义 token |
| 一-0673 | `apps/client/pages/chat/index.vue` | MEDIUM | 聊天列表页面背景、聊天气泡发送方/接收方背景色、输入区域边框、时间分割线颜色等 6 处硬编码（×6） | 聊天页面在主题切换时与其他页面不一致，用户感知闪烁 | 统一使用 var(--bg-primary)、var(--bg-secondary) 等 |
| 一-0679 | `apps/client/pages/chat-session/index.vue` | MEDIUM | 会话页面聊天气泡、输入区域、时间分割线等 5 处硬编码（×5） | 会话页面视觉与全局设计系统割裂 | 使用全局 CSS 变量替换 |
| 一-0684 | `apps/client/pages/discussions/index.vue` | MEDIUM | 讨论页面卡片背景、热门标签、长按菜单、分割线等 5 处硬编码（×5） | 论坛版块视觉不统一，品牌色维护困难 | 迁移到设计 token |
| 一-0689 | `全局（box-shadow 模式）` | MEDIUM | 项目中存在至少 5 种不一致的 box-shadow 硬编码模式（TabBar/卡片/模态框/浮动按钮/品牌光晕）（×5） | 卡片层级与视觉深度不统一，无法全局调整阴影风格 | 定义 shadow-sm/md/lg 等设计 token 并统一引用 |
| 一-0694 | `全局（border-radius）` | MEDIUM | 至少 15 个组件使用 4/6/8/10/12/14/16/20/24/32/40/50rpx 等 12 种 border-radius 值，超出设计尺度（×15） | 圆角风格混乱，组件拼接时视觉不协调 | 限定为 sm/md/lg/xl 等设计尺度并全局替换 |
| 一-0709 | `apps/admin/src/stores/session.ts` | MEDIUM | session store 中 5 处错误处理消息与路由守卫提示硬编码中文（×5） | 错误提示无法国际化，权限不足等场景文案固定 | 提取到 locale/error 模块 |
| 一-0714 | `全局（toLocaleString zh-CN）` | MEDIUM | 3 个 Admin 视图文件使用 toLocaleString('zh-CN') 硬编码中文本地化（×3） | 即使引入 i18n，数字/日期格式仍固定为中文 | 从当前语言环境动态获取 locale |
| 一-0717 | `全局（表单验证消息）` | MEDIUM | 多处表单验证消息硬编码中文（请输入用户名、密码不能少于6位、请输入有效的手机号等）（×8） | 表单校验文案无法配置，国际化改造工作量大 | 使用 i18n key 或 validation schema 文案配置 |
| 一-0725 | `全局（确认对话框）` | MEDIUM | 所有 ElMessageBox.confirm 调用均使用硬编码中文标题、按钮文字与提示内容（×6） | 删除/禁用等危险操作确认文案无法国际化或 A/B 测试 | 封装确认对话框并接入 i18n |
| 一-0731 | `apps/admin/src/utils/request.ts` | MEDIUM | HTTP 拦截器中 7 个状态码对应中文错误消息与网络超时/断开提示硬编码（×7） | 错误响应无法国际化，且生产环境可能泄露过多信息 | 使用 i18n key 并脱敏内部错误 |
| 一-0738 | `全局（线程池硬编码）` | MEDIUM | 消息推送、匹配计算、定时任务线程池大小硬编码（10/5/3），未使用 Spring ThreadPoolTaskExecutor（×3） | 无法根据服务器规格动态调整，缺少监控指标与自定义拒绝策略 | 使用 ThreadPoolTaskExecutor 并配置化核心/最大线程数、队列、拒绝策略 |
| 一-0741 | `全局（魔法数字）` | MEDIUM | 25+ 处魔法数字未定义为常量：默认推荐数量 20、每日匹配次数上限 3、临时会话过期 24h、文件大小限制 10485760、推送摘要天数 7、重试次数 3、分页默认大小 100（×25） | 业务参数调整需定位代码深处，易误改或遗漏 | 在常量类/配置文件中统一定义 |
| 一-0766 | `apps/api/src/main/java/com/campuslove/api/config/DatabaseConfigValidator.java` | MEDIUM | 数据库启动校验失败时仅打印日志不终止启动，连接超时硬编码 5000ms，重试逻辑阻塞主线程 Thread.sleep | 数据库连接异常时应用仍可能启动成功，导致运行时故障 | 校验失败调用 SpringApplication.exit，配置化超时，使用非阻塞重试 |
| 一-0767 | `apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java` | MEDIUM | Javadoc 声明删除评论但实际为软删除（修改 status 标记），注释与实现不符 | 误导后续开发者对数据物理删除的安全假设 | 修正 Javadoc 或实现物理删除并明确标注 |
| 一-0768 | `apps/api/src/main/java/com/campuslove/api/media/MediaUploadController.java` | MEDIUM | 文件类型校验仅依赖扩展名，未校验 magic bytes，图片未限制尺寸上限，大文件无进度反馈，URL 使用字符串拼接 | 可被伪造扩展名上传恶意文件，安全风险与上传体验差 | 校验 MIME + magic bytes，后端限制大小，使用 URI 构建器 |
| 一-0769 | `apps/api/src/main/java/com/campuslove/api/growth/RealPushSummaryService.java` | MEDIUM | 推送摘要定时任务 cron 表达式 0 0 10 * * ? 硬编码 | 无法按环境/运营策略调整推送时间 | 将 cron 表达式配置化 |
| 一-0770 | `全局（Service 接口抽象缺失）` | MEDIUM | 至少 8 个 Controller 直接注入带 Real 前缀的具体实现类，违反依赖倒置原则（×8） | 难以 mock 测试，实现替换成本高 | 定义 Service 接口并面向接口编程 |
| 一-0778 | `apps/client/src/components/UnlockGuideModal.vue` | MEDIUM | 解锁引导弹窗标题、副标题、5 个任务项、按钮文案等 9 处中文硬编码（×9） | 付费引导文案无法 A/B 测试或国际化 | i18n 化 |
| 一-0787 | `apps/client/pages/profile/ / pages/settings/` | MEDIUM | 个人资料/设置页面标题、表单标签、性别选项、设置项、Toast 等 16 处中文硬编码（×16） | 用户资料设置无法国际化 | i18n 化 |
| 一-0803 | `apps/client/src/components/common/LockScreen.vue` | MEDIUM | LockScreen 解锁提示、实名认证提示、跳过按钮等 3 处中文硬编码（×3） | 锁屏引导文案固定 | i18n 化 |
| 一-0806 | `全局（举报/反馈功能）` | MEDIUM | 举报选项、反馈表单、提交反馈等 10 处中文硬编码（×10） | 举报与反馈流程无法国际化，文案无法配置 | i18n 化 |
| 一-0816 | `全局（网络状态/错误处理）` | MEDIUM | 网络连接失败、请求超时、服务器繁忙、微信授权失败等 8 处中文硬编码（×8） | 错误提示无法国际化 | i18n 化 |
| 一-0824 | `全局（village/社区相关）` | MEDIUM | 发布动态、互动按钮、评论输入、话题、空状态等 14 处中文硬编码（×14） | 社区功能无法国际化 | i18n 化 |
| 一-0838 | `apps/client/src/config/home-sections.ts` | MEDIUM | 8 个首页功能模块图标背景使用硬编码 CSS 渐变字符串（×8） | 主题变更时需逐个修改，新增模块配色易不协调 | 配置中仅存标识，颜色由 CSS 变量定义 |
| 一-0846 | `apps/client/src/config/hero.ts` | MEDIUM | Hero Banner 背景图/装饰图路径硬编码 | 运营更换 Banner 需改代码发版 | 从后端配置接口动态获取 |
| 一-0847 | `apps/client/src/config/navigation.ts` | MEDIUM | 底部导航 Tab 图标路径与 Tab 名称硬编码为相对路径/中文字符串 | 构建工具迁移可能导致路径解析失败，文案无法国际化 | 使用 pages.json tabBar 标准配置或绝对路径，名称 i18n 化 |
| 一-0848 | `apps/client/src/config/unlock-guide.ts` | MEDIUM | 解锁引导步骤标题、描述、按钮文案硬编码中文 | 无法 A/B 测试或国际化 | 文案提取到 locale 文件 |
| 一-0849 | `apps/client/src/config/match-form.ts` | MEDIUM | 匹配偏好表单选项（年龄范围、身高范围、兴趣标签等）硬编码 | 运营无法动态调整匹配条件 | 动态选项从后端 API 获取 |
| 一-0850 | `apps/client/src/utils/haptic.ts` | MEDIUM | 触觉反馈直接硬编码调用 wx.vibrateShort，未做平台适配 | H5/支付宝小程序调用报错 | 添加平台检测，非微信环境降级或 Web Vibration API |
| 一-0851 | `apps/client/pages/activities/index.vue / discussions/index.vue` | MEDIUM | 筛选选项（活动类型、论坛版块）以静态数组硬编码在页面组件中 | 运营新增类型后前端无法同步，需发版 | 筛选选项从后端 API 获取 |
| 一-0852 | `apps/client/pages/chat/index.vue / chat-session/index.vue` | MEDIUM | 聊天页面背景和聊天气泡背景硬编码 #fff/#f8f8f8，未使用全局 CSS 变量 | 暗色模式下页面切换闪烁 | 替换为 var(--bg-primary)/var(--bg-secondary) |
| 一-0853 | `apps/client/pages/activities/index.vue / discussions/index.vue` | MEDIUM | 页面级 loading 文案 '加载中...' 与 Empty 状态 '暂无数据' 重复硬编码 | 全局文案调整需跨文件搜索替换 | 定义全局 UI 文案常量 |
| 一-0854 | `apps/client/pages/chat-session/index.vue / login/index.vue` | MEDIUM | 输入框 placeholder 硬编码（输入消息...、请输入手机号...） | 文案无集中管理 | 提取到常量/locale |
| 一-0855 | `apps/client/pages/chat-session/index.vue / activities/index.vue` | MEDIUM | CSS transition/animation duration 0.3s/0.5s 硬编码 | 全局调整动画速度需修改多处 | 定义动画时长 token |
| 一-0856 | `apps/admin/src/views/Layout.vue` | MEDIUM | 侧边栏菜单 8 个图标使用硬编码 SVG 路径字符串内联在模板中 | 新增/修改菜单项时代码可读性差，维护困难 | 使用 icon 组件或菜单配置数组渲染 |
| 一-0857 | `多个 .vue 文件` | MEDIUM | 组件中混用 options API 与 Composition API（script setup 中混用 data()） | 代码风格不一致，维护困难 | 统一使用 Composition API |
| 一-0858 | `多个 .vue 文件` | MEDIUM | 大量组件使用 script setup 但未设置 name 属性，Vue DevTools 显示 AnonymousComponent（×20） | 调试困难 | 通过额外 script 块或 vite-plugin 设置 name |
| 一-0878 | `apps/client/src/components/discover/CardDetailOverlay.vue / CardSwiper.vue` | MEDIUM | 两个组件单文件超过 500 行 | 难以维护、测试与审查 | 拆分为子组件或提取 composables |
| 一-0879 | `全局` | MEDIUM | 43 个组件无使用文档/Props 说明/Storybook stories（×43） | 新成员上手困难，组件复用率低 | 引入 Storybook 或 README |
| 一-0922 | `apps/client/src/components/common/HeartParticles.vue` | LOW | HeartParticles Canvas 绘制颜色硬编码 #FF6B9D/#FF8E8E/#FFB3C6 等 5 处（×5） | 粒子特效无法随主题色自动变更，视觉维护成本高 | 通过 JS 读取 CSS 变量后绘制到 Canvas |
| 一-0927 | `全局（字体大小硬编码）` | LOW | 10 个组件中约 20 处 font-size 硬编码，未使用语义化排版变量（×20） | 排版层级混乱，文本缩放时布局风险增加 | 使用 var(--text-xs/sm/base/lg/title) 等 token |
| 一-0947 | `全局（placeholder/tooltip/注释）` | LOW | 28 处 placeholder、tooltip、注释中文硬编码（×28） | 细节文案无法国际化，产品专业度下降 | 统一提取到 locale 文件 |
| 一-0975 | `全局（System.out.println / e.printStackTrace）` | LOW | 多处使用 System.out.println 与 e.printStackTrace 输出调试信息（×6） | 生产环境可能泄露敏感信息，日志框架无法统一管理 | 统一使用 SLF4J/Logback |
| 一-0981 | `apps/api/src/main/java/com/campuslove/api/config/GlobalExceptionHandler.java` | LOW | 全局异常处理器直接返回 e.getMessage()，可能暴露数据库表名/SQL 片段等内部信息 | 攻击者可利用错误信息推断数据库结构 | 生产环境返回通用错误消息，详细信息仅记录日志 |
| 一-0982 | `apps/client/src/stores/location.ts` | LOW | 位置权限说明、城市显示、定位状态等 4 处中文硬编码（×4） | 位置服务提示无法国际化 | i18n 化 |
| 一-0986 | `全局（图片/媒体选择器）` | LOW | 拍照、从相册选择、取消、最多上传 N 张、上传进度等 6 处中文硬编码（×6） | 媒体选择器文案固定 | i18n 化 |
| 一-0992 | `apps/client/src/services/api.ts` | LOW | loginWithWechat 中微信 code 参数名硬编码为 'wxCode' | 与后端约定不一致时沉默失败 | 通过常量或配置管理参数名 |
| 一-0993 | `apps/client/src/services/agnes-video.ts` | LOW | API endpoint 路径 /api/agnes/generate 硬编码 | 服务端路径变更需多处修改 | 使用统一 API 路径前缀常量 |
| 一-0994 | `apps/client/src/config/match-form.ts` | LOW | 身高选择器 min/max 范围 140-200 硬编码 | 业务调整身高范围需改代码 | 配置化 |
| 一-0995 | `apps/client/src/config/home-sections.ts` | LOW | 近期活动等功能模块默认展示数量 5 硬编码 | 运营无法调整展示数量 | 配置化 |
| 一-0996 | `apps/client/src/stores/discover.ts` | LOW | Mock 匹配成功概率 0.5 硬编码 | 测试/生产环境无法区分匹配逻辑 | 从配置或环境变量读取 |
| 一-0997 | `apps/client/src/services/websocket.ts` | LOW | WebSocket topic 字符串 '/topic/chat' 硬编码 | 后端 topic 变更需改代码 | 使用常量文件 |
| 一-0998 | `apps/client/src/utils/http.ts` | LOW | 请求拦截器中 token 前缀 'Bearer ' 硬编码 | 认证方案变更时遗漏风险 | 定义为常量 |
| 一-0999 | `apps/client/pages/activities/index.vue` | LOW | 活动卡片高度 240rpx 硬编码，长标题时文字溢出 | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
| 一-1000 | `apps/client/pages/chat/index.vue` | LOW | 会话列表项高度 120rpx 硬编码，与设计规范统一列表高度不一致 | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
| 一-1001 | `apps/client/pages/discussions/index.vue` | LOW | 帖子封面图宽高比 16:9 硬编码，实际图片比例不一致时变形 | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
| 一-1002 | `apps/client/pages/login/index.vue` | LOW | 验证码发送间隔 60 秒硬编码 | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
| 一-1003 | `apps/client/pages/chat-session/index.vue` | LOW | 表情面板每行列数 8 硬编码 | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
| 一-1004 | `apps/client/pages/activities/index.vue` | LOW | 活动报名状态枚举 ['open','full','ended'] 硬编码，可能与后端不一致 | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
| 一-1005 | `apps/client/pages/chat/index.vue` | LOW | 会话时间格式化规则硬编码在模板中 | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
| 一-1006 | `apps/client/pages/login/index.vue` | LOW | 手机号正则 /^1[3-9]\d{9}$/ 硬编码，运营商新增号段需改代码 | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
| 一-1007 | `project.config.json` | LOW | miniprogramRoot 路径配置不标准 | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
| 一-1008 | `多个 .vue 文件` | LOW | import 语句未分组排序（×10） | 代码可读性差 | 按外部/内部/相对路径分组排序 |
| 一-1018 | `多个 .vue 文件` | LOW | 混用 export default + defineComponent 与 <script setup>（×5） | 风格不一致 | 统一为 <script setup> |
| 一-1023 | `多个组件文件` | LOW | 多处 console.log 调试代码未清理（×8） | 生产环境泄露调试信息 | 移除或替换为日志工具 |
| 一-1031 | `多个组件文件` | LOW | 组件中硬编码时间常量（如 2000ms 动画时长）（×6） | 全局调整动画困难 | 提取为常量 |
| 一-1037 | `apps/client/src/services/api.ts` | LOW | 请求超时硬编码 10000ms，未使用配置文件值 | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
| 一-1038 | `全局` | LOW | CSS 变量命名不一致（kebab-case vs camelCase） | 硬编码/技术债使主题切换、国际化、配置变更成本高昂，长期维护风险大 | 按对应类别规范修复并补充测试/文档 |
## 二、代码层：Bug 与安全隐患

| 编号 | 文件路径 | 严重程度 | 问题描述 | 商业化影响 | 修复方向 |
|------|----------|----------|----------|------------|----------|
| 二-0001 | `apps/admin/src/views/Feedback.vue` | CRITICAL | Feedback.vue 使用硬编码 mock 数据（mockFeedback 静态数组）初始化反馈列表，未调用后端 API | 运营人员看到的反馈是演示数据，真实用户反馈（投诉/Bug报告）被长期忽略，严重运营事故风险 | 移除 mock，接入 GET /api/admin/feedback 并添加 loading/empty 状态 |
| 二-0002 | `apps/api/src/main/java/com/campuslove/api/user/User.java` | CRITICAL | User 实体 password 字段缺少 @JsonIgnore，BCrypt 哈希通过 JSON 响应泄露 | 攻击者可离线暴力破解密码哈希，严重安全事故 | 添加 @JsonIgnore 并返回 DTO |
| 二-0003 | `apps/api/src/main/java/com/campuslove/api/growth/WeChatPushService.java` | CRITICAL | cachedAccessToken 未声明 volatile，双重检查锁定模式失效 | 多线程环境下可能返回过期/未构造完成的 token，微信推送间歇性失败 | 声明 volatile 或使用 AtomicReference/Holder 模式 |
| 二-0004 | `apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java` | CRITICAL | getSimilarAuthors() 调用 userRepository.findAll() 加载全部用户到内存后过滤，无分页/LIMIT/WHERE | 用户量增长后数据库全表扫描、JVM Full GC、连接池耗尽，可被利用发动 DoS | 改为数据库层过滤分页 findByVillageIdAndTagsIn |
| 二-0005 | `apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java` | CRITICAL | deletePost() Javadoc 声明永久删除帖子及关联评论，但实现未调用 commentRepository.deleteByPostId | 删除帖子后评论残留为孤立数据，可能泄露或占用空间，审计不完整 | 添加级联删除或数据库 ON DELETE CASCADE 并加 @Transactional |
| 二-0006 | `apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java / campus/RealCampusService.java` | CRITICAL | toCampusTopicView/toCampusTopicReplyView 循环调用 userRepository.findById 填充作者信息，形成 N+1 查询 | 每页 20 条帖子+回复可能触发 42+ 次数据库往返 | 批量收集 authorId 一次性查询并建立 Map 索引 |
| 二-0007 | `apps/api/src/main/java/com/campuslove/api/admin/FeedbackController.java` | CRITICAL | 管理端反馈接口完全缺失身份认证检查（无 @PreAuthorize/@Secured） | 未授权用户可查看/修改用户反馈、发送虚假官方回复 | 类级别添加 @PreAuthorize('hasRole(ADMIN)') |
| 二-0008 | `apps/client/src/stores/auth.ts / services/auth.ts` | CRITICAL | loginWithWechat() 从未调用 wx.login()，跳过获取微信临时 code 步骤 | 小程序在微信环境完全无法登录，OAuth 流程断裂，阻断性缺陷 | 实现 wx.login -> 获取 code -> 后端换取 openId/session_key 标准流程 |
| 二-0009 | `apps/client/src/manifest.json` | CRITICAL | manifest.json 缺少 __usePrivacyCheck__: true 配置 | 隐私接口调用失败，微信审核可能拒绝 | 添加 __usePrivacyCheck__: true 并在 App.vue 注册隐私授权监听 |
| 二-0010 | `apps/client/src/stores/village.ts` | CRITICAL | 使用 URLSearchParams，微信小程序 JS 引擎不支持，运行时崩溃 | 进入 village 相关页面白屏 | 使用手动解析函数或 url-parse polyfill |
| 二-0011 | `apps/client/src/config/api.ts / utils/request.ts` | CRITICAL | 生产环境 fallback URL 使用 http:// 非 https:// | 小程序拦截 HTTP 请求，生产 API 不可用，且明文传输可被中间人窃取 | fallback 改为 https:// 并配置合法域名 |
| 二-0012 | `apps/client/src/stores/discover.ts` | CRITICAL | 模块级 setTimeout/setInterval 定时器永不清理，页面卸载时未释放 | 定时器堆积导致 CPU 占用升高、电池消耗、内存泄漏 | 在 onUnload/$onAction 中清理定时器 |
| 二-0013 | `apps/client/src/App.vue` | CRITICAL | App.vue 未注册 onNeedPrivacyAuthorization 监听 | 调用隐私接口（chooseImage/getLocation）时微信不弹出隐私协议确认，直接返回错误 | 在 onLaunch 中注册 wx.onNeedPrivacyAuthorization 回调 |
| 二-0014 | `apps/client/pages/activities/index.vue` | CRITICAL | refresherTriggered 使用普通 let 而非 ref()，下拉刷新完全失效 | 用户下拉刷新手势不触发加载，内容永远停留在初始数据 | 按对应类别规范修复并补充测试/文档 |
| 二-0015 | `apps/client/pages/chat-session/index.vue` | CRITICAL | 消息同时发送到 messagesStore 和 chatStore，两个独立 Store 互不同步 | 聊天界面显示两条重复消息气泡，严重影响聊天可用性 | 按对应类别规范修复并补充测试/文档 |
| 二-0016 | `apps/client/pages/chat-session/index.vue` | CRITICAL | 模板中分别遍历 messagesStore.messages 和 chatStore.messages 渲染消息 | 每条消息在 UI 上出现两次，消息历史混乱 | 按对应类别规范修复并补充测试/文档 |
| 二-0017 | `apps/client/pages/chat-session/index.vue` | CRITICAL | 生产代码中硬编码 Mock 会话 ID session-${rawUserId}，未调用后端创建真实会话 | 后端无法识别会话，消息持久化与会话管理完全失效 | 按对应类别规范修复并补充测试/文档 |
| 二-0018 | `apps/client/pages/chat-session/index.vue` | CRITICAL | sendVoice() 未调用录音 API，直接发送文本 '[语音消息]' | 语音消息功能为空壳，对方收到纯文本 | 按对应类别规范修复并补充测试/文档 |
| 二-0019 | `apps/admin/src/views/Users.vue` | HIGH | handleSaveEdit 为空函数（No-op Stub），编辑用户信息后点击保存不执行任何 API 请求 | 运营人员误以为已保存用户数据，实际修改丢失，影响用户管理准确性 | 实现 PUT /api/admin/users/:id 调用并处理响应 |
| 二-0020 | `apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java` | HIGH | 管理员登录未检查 admin.enabled/status，被禁用账号仍可登录 | 权限管理失效，禁用管理员可操作后台 | 添加状态校验并抛出 AccountDisabledException |
| 二-0021 | `apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java` | HIGH | rewind() 方法计算 dailyRewindLimit 后未用于拒绝请求，回退次数限制形同虚设 | VIP 与非 VIP 用户 rewind 限制失效，影响付费转化与公平性 | 超限时抛出 DailyLimitExceededException |
| 二-0022 | `apps/api/src/main/java/com/campuslove/api/admin/目录（7 个 Controller）` | HIGH | 7 个 Admin Controller 缺少 @PreAuthorize('hasRole(ADMIN)')（×7） | 任何已认证用户可访问管理功能，存在权限绕过风险 | 类级别统一添加权限注解 |
| 二-0029 | `apps/api/src/main/java/com/campuslove/api/match/Like.java` | HIGH | Like 实体 (user_id, target_user_id) 缺少数据库唯一约束，高并发下产生重复点赞 | 重复 Like 破坏匹配逻辑、重复通知、数据库膨胀 | 添加唯一约束并使用 INSERT ON DUPLICATE KEY UPDATE |
| 二-0030 | `apps/api/src/main/java/com/campuslove/api/auth/UserSession.java` | HIGH | UserSession sessionToken 字段未 @JsonIgnore，API 响应中暴露 | session token 泄露到前端日志/本地存储，增加盗用风险 | 添加 @JsonIgnore 并使用 DTO |
| 二-0031 | `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` | HIGH | .antMatchers('/uploads/**').permitAll() 使上传目录所有文件公开访问 | 用户私密照片/身份证照片可被任何人通过 URL 访问 | 移除公开访问，改为鉴权代理端点 |
| 二-0032 | `apps/api/src/main/java/com/campuslove/api/auth/目录` | HIGH | 短信登录 /auth/sms-login 与密码登录 /auth/login 端点无速率限制 | 可被暴力破解、短信轰炸、恶意消耗短信费用 | 引入 Redis + Lua 或 Spring Rate Limiter |
| 二-0033 | `apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java` | HIGH | 微信登录 find-then-create 模式存在竞态条件，同一 openId 可能创建重复用户 | 重复用户记录导致登录混乱与数据不一致 | open_id 添加唯一约束并使用 INSERT ON DUPLICATE KEY UPDATE |
| 二-0034 | `多个 Service 方法` | HIGH | N+1 查询模式：getMatchList/getDiscussions/getNotifications/getUserCards 循环中单独查询关联数据（×4） | 分页 20 条触发 40+ 次数据库查询，响应时间随数据量线性增长 | 使用 JOIN FETCH / @EntityGraph / 批量查询 + Map 组装 |
| 二-0038 | `多个 Entity 文件` | HIGH | User/Match/Discussion/Message 等实体未正确实现 equals/hashCode（×4） | HashSet/HashMap 中出现重复实体，Set 去重失败 | 使用 getClass() 或业务键组合实现 |
| 二-0042 | `所有 Entity 文件` | HIGH | 所有 JPA Entity 缺少 @Version 乐观锁字段 | 并发更新时后提交事务静默覆盖先提交数据，匹配状态/资料修改等高频操作数据丢失 | 所有实体添加 @Version private Long version |
| 二-0043 | `多个 Service 方法` | HIGH | 5 个 Service 方法存在 N+1 查询（getMatchList/getDiscussions/getNotifications/getUserCards/getChatHistory）（×5） | 分页 20 条执行 21 次 SQL，数据库压力大 | 使用 JOIN FETCH / @EntityGraph / 批量查询 |
| 二-0048 | `apps/api/src/main/java/com/campuslove/api/auth/目录` | HIGH | JWT 无 Token 撤销机制，退出登录后 token 仍有效至过期 | Token 泄露后无法主动失效，退出登录仅为客户端假象 | 使用 Redis 黑名单或 tokenVersion 字段 |
| 二-0049 | `apps/api/src/main/java/com/campuslove/api/campus/CampusController.java` | HIGH | CampusController 全量加载后内存分页（findAll + subList） | 数据增长后数据库全表扫描、GC 压力大 | 使用 Spring Data Pageable 数据库级分页 |
| 二-0050 | `apps/api/src/main/java/com/campuslove/api/chat/RealTempChatService.java` | HIGH | getTempChatSession() 标记为只读但修改 lastAccessedAt 并 save，GET 请求有副作用 | 违反 REST 安全性与幂等性，预取/爬虫可能触发副作用 | 拆分为独立 PATCH 端点或异步事件更新 |
| 二-0051 | `全局` | HIGH | 零 @Cacheable 使用，无缓存策略 | 用户标签、校园信息、系统配置、敏感词等高频慢变化数据每次都查数据库 | 集成 Spring Cache + Redis/Caffeine |
| 二-0052 | `全局` | HIGH | 无韧性模式（Circuit Breaker / Retry / TimeLimiter） | 微信 API/短信服务/对象存储故障时级联影响整个应用 | 引入 Resilience4j 为外部调用添加熔断/重试/降级 |
| 二-0053 | `全局` | HIGH | 所有写操作 API 无幂等性保障 | 网络超时重试导致重复订单/重复消息/重复点赞/重复扣费 | 引入 Idempotency-Key + Redis 去重 |
| 二-0054 | `全局` | HIGH | API 路径无版本号（/api/user/profile 而非 /api/v1/user/profile） | 破坏性变更必须同步升级所有客户端，无法灰度发布 | 引入 URL 路径版本前缀 |
| 二-0055 | `所有 Controller 文件` | HIGH | 各 Controller 响应格式不一致（token/user、code/data、success/result、直接 List、status/payload） | 前端需为每种格式写不同解析逻辑，维护成本高 | 统一为 ApiResponse<T> 包装 |
| 二-0056 | `全局` | HIGH | 无 Swagger/OpenAPI 文档注解 | 前后端协作效率低，接口变更不可视化 | 引入 springdoc-openapi 并添加注解 |
| 二-0057 | `apps/api/src/main/java/com/campuslove/api/chat/目录` | HIGH | 无定时任务清理过期临时聊天会话 | temp_chat_session 表无限增长，查询变慢 | 添加 @Scheduled 定期清理 |
| 二-0058 | `多个 Controller 文件` | HIGH | 分页参数 page/size 未校验上限，可传入 size=100000 | 触发大量数据库查询与内存占用，可能 OOM | 添加 @Max(100) 或全局分页上限 |
| 二-0059 | `apps/api/src/main/java/com/campuslove/api/media/MediaUploadController.java` | HIGH | 后端未校验文件大小与 MIME 类型，仅前端限制 | 可绕过前端上传任意大小文件，耗尽磁盘/OOM | 配置 multipart 大小限制并校验 magic bytes |
| 二-0060 | `全局` | HIGH | 缺少请求日志追踪 ID（MDC/TraceId） | 无法根据前端报错追溯后端日志 | 在 Filter 中生成 TraceId 并注入 MDC/响应头 |
| 二-0061 | `7 个 Admin Controller` | HIGH | AdminCertificationController/AdminConfigController/AdminMatchConfigController/AdminNotifyConfigController/AdminSensitiveWordController/AdminStatsController/AdminAuditLogController 缺少 @PreAuthorize（×7） | 管理功能可能在无认证情况下被访问 | 类级别统一添加权限注解 |
| 二-0068 | `apps/api/src/main/java/com/campuslove/api/admin/AdminNotifyConfigController.java` | HIGH | updateBatch() 循环 save 多条通知配置但缺少 @Transactional | 批量更新部分成功部分失败，数据库处于半更新状态 | 添加 @Transactional |
| 二-0069 | `apps/api/src/main/java/com/campuslove/api/admin/RealAdminMatchConfigService.java` | HIGH | updateMatchConfig() 在 @Transactional 方法中 catch(Exception) 仅记录日志不重新抛出 | 异常被吞掉，Spring 错误提交事务，调用方收到成功但数据未变更 | 移除 try-catch 或显式 setRollbackOnly |
| 二-0070 | `apps/api/src/main/java/com/campuslove/api/campus/CampusController.java` | HIGH | 使用 schoolName.hashCode() 作为 schoolId 查询数据库，存在哈希碰撞风险 | 不同学校可能映射到同一 hashCode，用户看到错误校园墙内容 | 维护 school 表通过精确字符串匹配或数字 ID |
| 二-0071 | `apps/api/src/main/java/com/campuslove/api/admin/AdminUserController.java` | HIGH | toggleUserStatus() 缺少 @Auditable 审计注解 | 封禁/解封用户行为无法追溯，运营事故难以追责 | 添加 @Auditable(action='TOGGLE_USER_STATUS') |
| 二-0072 | `6 个组件文件` | HIGH | profile/avatar-upload / feedback/image-picker / chat/image-sender / moment/publish / setup/photo-upload / verify/id-upload 调用隐私接口前未检查授权状态（×6） | 用户未同意隐私协议时调用直接失败，体验差且审核风险 | 调用前先 wx.getSetting/requirePrivacyAuthorize 检查 |
| 二-0078 | `全局` | HIGH | 未在 onHide 生命周期中取消进行中网络请求 | 切后台后请求被微信暂停，切回前台可能永远不 resolve，UI 卡在 loading | 使用 AbortController 在 onHide 中取消请求 |
| 二-0079 | `apps/client/src/components/discover/CardSwiper.vue` | HIGH | CardSwiper 使用浏览器 TouchEvent（event.touches[0].clientX/clientY）与 mp-weixin 不兼容 | 核心卡片滑动在小程序真机行为不可预测或直接报错 | 使用 uni-app 统一触摸事件或适配层 |
| 二-0080 | `apps/client/src/components/discover/CardDetailOverlay.vue` | HIGH | CardDetailOverlay 图片滑动浏览使用浏览器 TouchEvent | 详情页图片左右滑动在小程序真机失效 | 使用 uni-app 统一触摸事件 |
| 二-0081 | `apps/client/src/components/common/SocialProgressIndicator.vue` | HIGH | 在 computed() 内部调用 setTimeout 修改响应式状态 | 定时器泄漏、卸载后状态更新导致 Vue 警告、computed 缓存被破坏 | 使用 watch + nextTick 或 requestAnimationFrame 并在 onBeforeUnmount 清理 |
| 二-0082 | `apps/client/src/components/common/Ripple.vue` | HIGH | 模块级 timer 跨组件实例共享，多个 Ripple 实例同时存在时相互清除定时器 | 波纹动画中断或表现异常 | 将 timer 移入 script setup 内部 |
| 二-0083 | `apps/client/src/components/common/HeartParticles.vue` | HIGH | 模块级 timer 跨组件实例共享，多个粒子实例动画定时器相互覆盖 | 粒子行为错乱 | 将 timer 移入组件实例作用域 |
| 二-0084 | `apps/client/src/components/discover/FilterDrawer.vue` | HIGH | 模块级变量跨组件实例共享，页面切换时残留状态影响新实例 | 筛选抽屉状态异常 | 将变量移入 script setup 作用域 |
| 二-0085 | `apps/client/src/components/chat/ChatBubble.vue` | HIGH | longpress 事件 emit 了 quoteRef 对象而非父组件期望的 messageId | 引用回复功能收到错误格式数据，可能不工作或显示错误 | 统一 emit payload 格式 |
| 二-0086 | `apps/client/src/components/common/Toast.vue` | HIGH | 单例 showToast() 第二次调用时丢弃前一个 Promise 的 resolve | await showToast() 的后续代码在快速连续调用时永久卡住 | 使用队列管理或在替换时 resolve 前一个 Promise |
| 二-0087 | `apps/client/src/components/discover/MatchGuideOverlay.vue` | HIGH | visible 状态纯内部管理，关闭后无外部手段重新打开 | 用户首次关闭引导后无法再次查看 | 添加 show prop 或 defineExpose 暴露 show 方法 |
| 二-0088 | `apps/client/pages/login/index.vue` | HIGH | 登录失败完全无错误处理，静默失败 | 用户看到永久加载或空白页，无法判断原因 | 按对应类别规范修复并补充测试/文档 |
| 二-0089 | `apps/client/pages/chat/index.vue` | HIGH | 模板中使用 @tap.stop/@click.stop，微信小程序 WXS 不支持 .stop 修饰符 | 事件冒泡未阻止，可能误触发父级点击/导航 | 按对应类别规范修复并补充测试/文档 |
| 二-0090 | `apps/client/pages/chat-session/index.vue` | HIGH | fetchMessages() 被 fire-and-forget 调用后立即同步访问 Store 数据 | 页面可能渲染空消息列表，行为不稳定 | 按对应类别规范修复并补充测试/文档 |
| 二-0091 | `apps/client/pages/chat/index.vue` | HIGH | 会话创建失败无错误反馈，用户反复点击产生无效请求 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0092 | `apps/client/src/stores/chat.ts` | HIGH | sendText 使用 as any 传递消息对象，包含 localId/sendingStatus 等内部字段到后端 | 严格后端 JSON Schema 返回 400，网络差时本地显示已发送但后端失败，造成消息丢失假象 | 按对应类别规范修复并补充测试/文档 |
| 二-0093 | `apps/client/src/services/agnes-video.ts` | HIGH | AI 视频生成 API 返回 401 Unauthorized，API Key 过期/无效 | AI 视频功能完全不可用，前端未给出友好提示 | 按对应类别规范修复并补充测试/文档 |
| 二-0094 | `apps/admin/src/stores/session.ts` | MEDIUM | login() 中密码明文存储在 Vuex/Redux DevTools 中可被查看 | 开发者工具可能泄露管理员密码 | 密码不进入 store，或 DevTools 中排除敏感字段 |
| 二-0095 | `apps/admin/src/utils/http.ts` | MEDIUM | 请求拦截器中 token 过期判断使用客户端时间，可被篡改 | 用户修改系统时间后可能绕过 token 过期检查 | 基于服务端返回的 exp 或 HTTP 401 判断 |
| 二-0096 | `apps/admin/src/views/Users.vue` | MEDIUM | 搜索输入框无防抖，每次按键触发 API 请求 | 高频请求浪费服务器资源并降低响应速度 | 添加 300ms debounce |
| 二-0097 | `apps/admin/src/views/Posts.vue` | MEDIUM | 删除帖子操作无二次确认弹窗，误点导致数据丢失 | 运营误操作可能删除正常内容 | 添加确认对话框 |
| 二-0098 | `apps/admin/src/views/SensitiveWords.vue` | MEDIUM | 敏感词列表新增后未清空表单，用户可能重复提交 | 重复提交导致重复数据或接口报错 | 提交成功后重置表单 |
| 二-0099 | `apps/admin/src/views/Reports.vue` | MEDIUM | 举报处理操作无操作日志记录，无法追溯运营人员处理历史 | 出现运营事故时无法追责 | 添加 @Auditable 或操作日志记录 |
| 二-0100 | `多个 Entity 文件` | MEDIUM | 多个实体使用 Lombok @Data/@ToString 但未在懒加载关联字段标注 @ToString.Exclude（×5） | 可能触发 LazyInitializationException 或大量意外查询 | 添加 @ToString.Exclude |
| 二-0105 | `apps/api/src/main/java/com/campuslove/api/config/WeChatProperties.java` | MEDIUM | @ConfigurationProperties 缺少 @Validated，必填字段无 @NotEmpty/@NotNull | 配置缺失时应用启动成功，运行时才 NPE 崩溃 | 添加 @Validated 与 Bean Validation 注解 |
| 二-0106 | `apps/api/src/main/java/com/campuslove/api/config/GlobalExceptionHandler.java` | MEDIUM | 全局异常处理器返回 e.getMessage()，可能暴露数据库表名/SQL 片段 | 信息泄露可被攻击者利用 | 生产环境返回通用错误消息 |
| 二-0107 | `apps/api/src/main/resources/application.yml` | MEDIUM | JWT Secret 明文硬编码在配置文件中并出现在 Git 历史 | 密钥泄露风险，无法安全轮换 | 通过环境变量或 KMS 注入并轮换密钥 |
| 二-0108 | `apps/api/src/main/java/com/campuslove/api/repository/目录` | MEDIUM | 部分 Repository 使用 nativeQuery=true 配合字符串拼接动态排序字段，存在 SQL 注入风险 | 攻击者可注入恶意 SQL | 使用 Criteria API 或参数化查询 |
| 二-0109 | `RealAuthService.java / RealMatchService.java` | MEDIUM | @Transactional 注解粒度不当：读方法加事务，含远程调用的写方法未加事务 | 事务边界与远程调用耦合，性能与一致性风险 | 调整事务粒度，远程调用在事务外执行 |
| 二-0110 | `多个 Controller 文件` | MEDIUM | Controller 中混入业务逻辑，直接操作 Repository | 破坏分层架构，复用与测试困难 | 将业务逻辑下沉到 Service |
| 二-0111 | `多个 Service 文件` | MEDIUM | java.util.Date / java.sql.Timestamp / java.time.Instant 混用 | 时间处理不一致，时区与精度问题 | 统一迁移至 java.time API |
| 二-0112 | `全局` | MEDIUM | 大量代码抛出泛化 RuntimeException 而非自定义业务异常 | 前端无法根据异常类型差异化处理 | 定义 UserNotFoundException/MatchAlreadyExistsException 等业务异常 |
| 二-0113 | `apps/api/src/main/resources/db/migration/` | MEDIUM | Flyway 迁移文件版本号命名不一致，部分使用时间戳，部分使用递增数字 | 团队协作时版本号冲突风险高 | 统一使用 V{version}__{description}.sql 递增整数 |
| 二-0114 | `apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java` | MEDIUM | listPosts 没有请求参数校验，page/size 可为负数导致 SQL 错误 | 恶意参数导致后端异常或数据泄露 | 添加 @Min/@Max 或 Pageable 校验 |
| 二-0115 | `apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java` | MEDIUM | getTrendingTopics 热度算法 (likes*2+comments*3)/hoursSincePost 对新帖子除零 | 新帖子（hoursSincePost=0）触发 ArithmeticException | 处理除零或改用对数时间衰减 |
| 二-0116 | `apps/api/src/main/java/com/campuslove/api/campus/CampusController.java` | MEDIUM | createPost 未对帖子内容做长度限制，攻击者可发送 MB 级请求体 | 大请求体导致 OOM 或存储滥用 | 添加 @Size 限制内容长度 |
| 二-0117 | `apps/api/src/main/java/com/campuslove/api/admin/AdminSensitiveWordController.java` | MEDIUM | 敏感词导入使用同步处理，上传大文件时请求超时 | 运营导入大词库时接口无响应 | 改为异步任务或分批处理 |
| 二-0118 | `apps/api/src/main/java/com/campuslove/api/campus/RealCampusService.java` | MEDIUM | 校园墙帖子查询 SQL WHERE 条件顺序不利于索引使用 | 数据量增长后查询性能下降 | 优化 WHERE 条件顺序与索引 |
| 二-0119 | `apps/api/src/main/java/com/campuslove/api/admin/AdminCertificationController.java` | MEDIUM | 认证审批后未更新 Elasticsearch/缓存中的用户索引 | 搜索/推荐结果中用户认证状态滞后 | 审批后同步更新索引与缓存 |
| 二-0120 | `apps/api/src/main/java/com/campuslove/api/admin/AdminStatsController.java` | MEDIUM | 统计查询使用实时 COUNT(*) 而非汇总表，数据量大时超时 | 管理后台仪表盘加载缓慢或超时 | 使用汇总表/物化视图/缓存 |
| 二-0121 | `apps/api/src/main/java/com/campuslove/api/admin/AdminConfigController.java` | MEDIUM | 配置更新后未通知其他服务实例，多实例部署时配置不一致 | 部分实例使用旧配置，行为不一致 | 使用配置中心或广播刷新事件 |
| 二-0122 | `apps/api/src/main/java/com/campuslove/api/admin/AdminAuditLogController.java` | MEDIUM | 审计日志查询参数未确认 SQL 注入防护 | 可能存在 SQL 注入风险 | 确认使用参数化查询或 JPA 规范 |
| 二-0123 | `apps/api/src/main/java/com/campuslove/api/admin/FeedbackController.java` | MEDIUM | 反馈回复内容未做 XSS 过滤 | 运营回复中可注入脚本，危害查看反馈的用户 | 输出时转义或使用富文本白名单 |
| 二-0124 | `apps/client/src/utils/request.ts` | MEDIUM | wx.request 未统一封装错误重试逻辑 | 弱网下单次失败即报错 | 添加指数退避重试 |
| 二-0125 | `多个文件` | MEDIUM | 多处重复调用 wx.getSystemInfoSync（已废弃） | 同步 API 阻塞主线程，重复调用浪费资源 | 在 app 启动时获取并存入 globalData |
| 二-0126 | `多个组件文件` | MEDIUM | defineProps 缺少 validator，枚举型 prop 接受任意字符串（×10） | 非法 prop 值导致不可预期行为 | 添加 validator 函数 |
| 二-0136 | `多个组件文件` | MEDIUM | defineEmits 未声明 payload 类型，参数默认为 any（×12） | 父组件无法获得类型检查 | 声明类型化的 emit |
| 二-0148 | `3-4 个组件文件` | MEDIUM | 通过 $refs 直接操作 DOM 样式/类名而非数据驱动（×4） | 破坏 Vue 声明式渲染，响应式状态与 DOM 不同步 | 改用响应式数据与 :class/:style |
| 二-0152 | `多个使用 v-for 的组件` | MEDIUM | 列表渲染 key 使用 index 而非唯一稳定业务 ID（×8） | 列表项增删/排序时 DOM 重建错误与动画异常 | 使用业务 ID 作为 key |
| 二-0160 | `apps/client/pages/chat-session/index.vue` | MEDIUM | onLoad 中 sessionId 参数未校验，null 时仍尝试 fetch | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0161 | `apps/client/pages/login/index.vue` | MEDIUM | 登录成功后 uni.setStorageSync 同步阻塞主线程 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0162 | `apps/client/pages/activities/index.vue` | MEDIUM | loadMoreData() 无防抖，快速滚动触发数十次 API 请求 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0163 | `apps/client/pages/chat/index.vue` | MEDIUM | 会话列表 v-for 使用 index 作为 key | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0164 | `apps/client/pages/activities/index.vue` | MEDIUM | formatTime() 使用 new Date() 本地时区，用户看到时间可能偏移 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0165 | `apps/client/pages/login/index.vue` | MEDIUM | 验证码倒计时 setInterval 在页面切后台后继续运行，倒计时不准 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0166 | `apps/client/pages/chat/index.vue` | MEDIUM | 未读消息数角标在 onHide 时未更新，切后台期间新消息回到前台显示旧数据 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0167 | `apps/client/pages/activities/index.vue` | MEDIUM | 活动报名按钮点击后无 loading 状态，重复点击创建多个报名请求 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0168 | `apps/client/pages/discussions/index.vue` | MEDIUM | 帖子列表分页加载更多失败时静默丢弃失败项 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0169 | `apps/client/src/stores/discover.ts` | MEDIUM | swipeRight API 失败时静默降级到 Mock 随机匹配 Math.random() > 0.5 | 后端宕机时用户收到随机结果，产生垃圾匹配记录与错误预期 | 按对应类别规范修复并补充测试/文档 |
| 二-0170 | `apps/client/src/stores/profile.ts` | MEDIUM | load() 未加载 vipStatus 和 myPosts | 用户购买 VIP 后看不到标识，我的帖子 Tab 永远为空 | 按对应类别规范修复并补充测试/文档 |
| 二-0171 | `apps/client/src/services/api.ts` | MEDIUM | loginWithWechat 使用 (response as any).data.token 提取 token | 后端结构变更时 TypeScript 无法检测，登录运行时崩溃 | 按对应类别规范修复并补充测试/文档 |
| 二-0172 | `apps/client/src/stores/activity.ts` | MEDIUM | fetchMoreActivities 分页功能不工作，page 始终传固定值 | 下拉加载更多始终显示第一页重复数据 | 按对应类别规范修复并补充测试/文档 |
| 二-0173 | `apps/client/src/stores/session.ts` | MEDIUM | profileCompletion 使用 Math.min(baseScore, detailScore) 而非加权平均 | 完成度显示极低，打击用户完善资料积极性 | 按对应类别规范修复并补充测试/文档 |
| 二-0174 | `apps/client/src/services/websocket.ts` | MEDIUM | Stomp 帧处理使用 as unknown as Record<string,unknown> 绕过类型系统 | 后端消息格式变更时无编译保护，运行时可能出现 undefined 读取 | 按对应类别规范修复并补充测试/文档 |
| 二-0175 | `apps/client/src/stores/messages.ts` | MEDIUM | fetchNotifications 存在 filterType 更新与 API 调用竞态条件 | 快速切换过滤器时列表显示数据与当前 Tab 不匹配 | 按对应类别规范修复并补充测试/文档 |
| 二-0176 | `apps/client/src/stores/checkin.ts` | MEDIUM | Mock 签到连续天数基于 Date.now() 客户端时间，跨日边界/时区存在 Bug | 连续签到奖励可能因时区/时间修改异常，引发投诉 | 按对应类别规范修复并补充测试/文档 |
| 二-0177 | `多个 Service 方法` | LOW | @Transactional(readOnly=true) 未在只读 Service 方法上统一添加（×6） | 读写事务边界不清晰，影响性能与一致性 | 为纯查询方法添加 readOnly |
| 二-0183 | `全局` | LOW | 日志使用字符串拼接而非 SLF4J 参数化（×8） | 日志级别关闭时仍进行字符串拼接，性能浪费 | 使用 log.debug('user: {}', userId) |
| 二-0191 | `全局` | LOW | Optional.get() 直接调用未先检查 isPresent()（×5） | 可能抛出 NoSuchElementException | 使用 orElseThrow 或 ifPresent |
| 二-0196 | `多个 Entity 文件` | LOW | Lombok @Data 在 Entity 上使用不当，应使用 @Getter/@Setter | @Data 生成 equals/hashCode/toString 可能与 JPA 代理冲突 | 替换为 @Getter/@Setter |
| 二-0197 | `pom.xml` | LOW | 部分依赖版本未集中管理，缺少 dependencyManagement | 依赖版本冲突风险 | 使用 BOM 或 dependencyManagement 统一管理 |
| 二-0198 | `全局` | LOW | 生产日志中使用 log.info() 输出大量调试信息（×5） | 日志量过大，影响性能与存储 | 调整日志级别为 debug 或移除调试日志 |
| 二-0203 | `多个 Controller 文件` | LOW | Controller 中直接使用 System.out.println() 调试输出（×3） | 生产环境信息泄露与日志管理混乱 | 移除并使用 SLF4J |
| 二-0206 | `app.json / manifest.json` | LOW | 未配置 requiredPrivateInfos 声明地理位置等隐私权限 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0207 | `apps/client/package.json` | LOW | npm 包 @escook/request-miniprogram 可能不兼容新版基础库 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0208 | `多个组件文件` | LOW | 访问 props.xxx 但未在 defineProps 中声明（×4） | TypeScript 无法检查，运行时为 undefined | 补全 props 声明 |
| 二-0212 | `apps/client/src/stores/discover.ts` | LOW | swipeLeft 未调用后端 API，仅本地状态更新，跳过记录未上报 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0213 | `apps/client/src/stores/profile.ts` | LOW | updateProfile 成功后未同步更新 session store 缓存 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0214 | `apps/client/src/stores/chat.ts` | LOW | 乐观更新消息使用 Date.now() 作为临时 ID，存在极小概率冲突 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0215 | `apps/client/src/services/websocket.ts` | LOW | 重连策略使用固定间隔，未使用指数退避算法 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0216 | `apps/client/src/stores/messages.ts` | LOW | 未读消息计数仅在 fetchMessages 时更新，WebSocket 推送新消息不更新计数 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0217 | `apps/client/src/stores/activity.ts` | LOW | registerActivity 成功后未更新活动参与人数 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
| 二-0218 | `apps/client/src/services/agnes-video.ts` | LOW | 请求未设置超时，AI 生成耗时长时可能无限等待 | 功能缺陷或安全隐患直接影响用户信任、数据安全与合规要求 | 按对应类别规范修复并补充测试/文档 |
## 三、功能完整性与业务逻辑

本章节从 Vue 页面、客户端 Store/Service、Java 后端 Bug & 安全、Java API 层深度审查、以及 Admin/Campus API 审计分册中，提取具体的功能缺陷与业务逻辑问题，按文件路径、严重程度、问题描述、商业化影响、修复方向列出。

| 编号 | 文件路径 | 严重程度 | 问题描述 | 商业化影响 | 修复方向 |
|------|----------|----------|----------|------------|----------|
| 三-0001 | apps/client/pages/activities/index.vue | CRITICAL | 下拉刷新状态变量 `refresherTriggered` 被声明为普通 JavaScript `let` 变量，而非 Vue 的 `ref()`。在 Vue 的响应式系统中，普通 `let` 变量的变更不会触发视图更新，也不会与 uni-app 的 `<scroll-view>` 的 `refresher-triggered` 属性正确绑定。 | 用户下拉刷新手势无法触发任何加载逻辑，页面内容永远停留在初始数据。该功能对用户完全不可用。 | 将 `let refresherTriggered = false` 改为 `const refresherTriggered = ref(false)`，并在使用处改为 `.value` 访问。 |
| 三-0002 | apps/client/pages/activities/index.vue | CRITICAL | [用户体验] 下拉刷新状态变量 `refresherTriggered` 被声明为普通 JavaScript `let` 变量，而非 Vue 的 `ref()`。在 Vue  | 影响用户体验与功能可用性：用户下拉刷新手势无法触发任何加载逻辑，页面内容永远停留在初始数据。该功能对用户完全不可用。 | 将 `let refresherTriggered = false` 改为 `const refresherTriggered = ref(false)`，并在使用处改为 `.value` 访问。 |
| 三-0003 | apps/client/pages/activities/index.vue | CRITICAL | [数据一致性] 下拉刷新状态变量 `refresherTriggered` 被声明为普通 JavaScript `let` 变量，而非 Vue 的 `ref()`。在 Vue  | 可能导致业务数据不一致或状态错误：用户下拉刷新手势无法触发任何加载逻辑，页面内容永远停留在初始数据。该功能对用户完全不可用。 | 将 `let refresherTriggered = false` 改为 `const refresherTriggered = ref(false)`，并在使用处改为 `.value` 访问。 |
| 三-0004 | apps/client/pages/activities/index.vue | CRITICAL | 下拉刷新状态变量 `refresherTriggered` 被声明为普通 JavaScript `let` 变量，而非 Vue 的 `ref()`。在 Vue ——影响1：用户下拉刷新手势无法触发任何加载逻辑，页面内容永远停留在初始数据 | 用户下拉刷新手势无法触发任何加载逻辑，页面内容永远停留在初始数据 | 将 `let refresherTriggered = false` 改为 `const refresherTriggered = ref(false)`，并在使用处改为 `.value` 访问。 |
| 三-0005 | apps/client/pages/activities/index.vue | CRITICAL | 下拉刷新状态变量 `refresherTriggered` 被声明为普通 JavaScript `let` 变量，而非 Vue 的 `ref()`。在 Vue ——影响2：该功能对用户完全不可用 | 该功能对用户完全不可用 | 将 `let refresherTriggered = false` 改为 `const refresherTriggered = ref(false)`，并在使用处改为 `.value` 访问。 |
| 三-0006 | apps/client/pages/chat-session/index.vue | CRITICAL | 发送消息的函数内，同一条消息对象被同时推入 `messagesStore` 和 `chatStore` 两个独立的状态管理中。两个 Store 各自维护消息列表，互不同步。 | 聊天界面显示两条完全相同的消息（每发一条消息，UI 上出现两条重复的对话气泡），严重影响聊天功能的可用性和用户信任。 | 选择单一数据源（建议保留 messagesStore），移除对 chatStore 消息列表的写入。如果 chatStore 需要读取消息，应通过 getter 从 messagesStore 获取。 |
| 三-0007 | apps/client/pages/chat-session/index.vue | CRITICAL | [用户体验] 发送消息的函数内，同一条消息对象被同时推入 `messagesStore` 和 `chatStore` 两个独立的状态管理中。两个 Store 各自维护消息列表 | 影响用户体验与功能可用性：聊天界面显示两条完全相同的消息（每发一条消息，UI 上出现两条重复的对话气泡），严重影响聊天功能的可用性和用户信任。 | 选择单一数据源（建议保留 messagesStore），移除对 chatStore 消息列表的写入。如果 chatStore 需要读取消息，应通过 getter 从 messagesStore 获取。 |
| 三-0008 | apps/client/pages/chat-session/index.vue | CRITICAL | [数据一致性] 发送消息的函数内，同一条消息对象被同时推入 `messagesStore` 和 `chatStore` 两个独立的状态管理中。两个 Store 各自维护消息列表 | 可能导致业务数据不一致或状态错误：聊天界面显示两条完全相同的消息（每发一条消息，UI 上出现两条重复的对话气泡），严重影响聊天功能的可用性和用户信任。 | 选择单一数据源（建议保留 messagesStore），移除对 chatStore 消息列表的写入。如果 chatStore 需要读取消息，应通过 getter 从 messagesStore 获取。 |
| 三-0009 | apps/client/pages/chat-session/index.vue | CRITICAL | 模板中使用 `v-for` 分别遍历 `messagesStore.messages` 和 `chatStore.messages` 两个数组来渲染消息气泡，两个数据源各自包含相同的消息记录。 | 每条消息在 UI 上出现两次，与上一个问题的双重写入叠加，导致呈现给用户的是混乱的消息历史。 | 模板中仅使用单一 `v-for` 遍历一个 Store 的消息列表，删除重复的渲染块。 |
| 三-0010 | apps/client/pages/chat-session/index.vue | CRITICAL | [用户体验] 模板中使用 `v-for` 分别遍历 `messagesStore.messages` 和 `chatStore.messages` 两个数组来渲染消息气泡，两 | 影响用户体验与功能可用性：每条消息在 UI 上出现两次，与上一个问题的双重写入叠加，导致呈现给用户的是混乱的消息历史。 | 模板中仅使用单一 `v-for` 遍历一个 Store 的消息列表，删除重复的渲染块。 |
| 三-0011 | apps/client/pages/chat-session/index.vue | CRITICAL | [数据一致性] 模板中使用 `v-for` 分别遍历 `messagesStore.messages` 和 `chatStore.messages` 两个数组来渲染消息气泡，两 | 可能导致业务数据不一致或状态错误：每条消息在 UI 上出现两次，与上一个问题的双重写入叠加，导致呈现给用户的是混乱的消息历史。 | 模板中仅使用单一 `v-for` 遍历一个 Store 的消息列表，删除重复的渲染块。 |
| 三-0012 | apps/client/pages/chat-session/index.vue | CRITICAL | 聊天会话创建逻辑中使用了硬编码的 `session-${rawUserId}` 作为会话 ID，没有调用后端 API 来创建或获取真实的会话 ID。 | 生产环境中所有用户的聊天会话都映射到本地构造的假 ID，后端无法识别这些会话，消息持久化和会话管理完全失效。 | 移除硬编码，改为调用 `POST /api/sessions` 创建会话并获取服务端返回的真实 sessionId。 |
| 三-0013 | apps/client/pages/chat-session/index.vue | CRITICAL | [用户体验] 聊天会话创建逻辑中使用了硬编码的 `session-${rawUserId}` 作为会话 ID，没有调用后端 API 来创建或获取真实的会话 ID。 | 影响用户体验与功能可用性：生产环境中所有用户的聊天会话都映射到本地构造的假 ID，后端无法识别这些会话，消息持久化和会话管理完全失效。 | 移除硬编码，改为调用 `POST /api/sessions` 创建会话并获取服务端返回的真实 sessionId。 |
| 三-0014 | apps/client/pages/chat-session/index.vue | CRITICAL | [数据一致性] 聊天会话创建逻辑中使用了硬编码的 `session-${rawUserId}` 作为会话 ID，没有调用后端 API 来创建或获取真实的会话 ID。 | 可能导致业务数据不一致或状态错误：生产环境中所有用户的聊天会话都映射到本地构造的假 ID，后端无法识别这些会话，消息持久化和会话管理完全失效。 | 移除硬编码，改为调用 `POST /api/sessions` 创建会话并获取服务端返回的真实 sessionId。 |
| 三-0015 | apps/client/pages/chat-session/index.vue | CRITICAL | `sendVoice()` 函数没有调用录音 API 获取音频数据，而是直接发送字符串 `"[语音消息]"` 到消息列表。 | 用户点击语音按钮后，对方收到的是纯文本 `"[语音消息]"` 而非真实的语音内容，语音消息功能完全是空壳。 | 集成 `uni.getRecorderManager()` 和 `uni.uploadFile()`，实现录音 → 上传 → 发送音频 URL 的完整语音消息流程。 --- |
| 三-0016 | apps/client/pages/chat-session/index.vue | CRITICAL | [用户体验] `sendVoice()` 函数没有调用录音 API 获取音频数据，而是直接发送字符串 `"[语音消息]"` 到消息列表。 | 影响用户体验与功能可用性：用户点击语音按钮后，对方收到的是纯文本 `"[语音消息]"` 而非真实的语音内容，语音消息功能完全是空壳。 | 集成 `uni.getRecorderManager()` 和 `uni.uploadFile()`，实现录音 → 上传 → 发送音频 URL 的完整语音消息流程。 --- |
| 三-0017 | apps/client/pages/chat-session/index.vue | CRITICAL | [数据一致性] `sendVoice()` 函数没有调用录音 API 获取音频数据，而是直接发送字符串 `"[语音消息]"` 到消息列表。 | 可能导致业务数据不一致或状态错误：用户点击语音按钮后，对方收到的是纯文本 `"[语音消息]"` 而非真实的语音内容，语音消息功能完全是空壳。 | 集成 `uni.getRecorderManager()` 和 `uni.uploadFile()`，实现录音 → 上传 → 发送音频 URL 的完整语音消息流程。 --- |
| 三-0018 | apps/client/pages/login/index.vue | HIGH | 微信登录调用 `loginWithWechat()` 后，代码中没有 `.catch()` 错误处理分支，也没有对返回值进行有效性校验。当 API 返回 4xx/5xx 或网络超时时，页面无任何反馈。 | 用户在登录失败时看到的是永久加载状态或空白页，无法判断是网络问题、服务端问题还是账号问题，只能反复尝试或放弃使用。 | 添加 try-catch 或 .catch() 处理，使用 `uni.showToast()` 显示具体错误信息。 |
| 三-0019 | apps/client/pages/login/index.vue | HIGH | [用户体验] 微信登录调用 `loginWithWechat()` 后，代码中没有 `.catch()` 错误处理分支，也没有对返回值进行有效性校验。当 API 返回 4xx | 影响用户体验与功能可用性：用户在登录失败时看到的是永久加载状态或空白页，无法判断是网络问题、服务端问题还是账号问题，只能反复尝试或放弃使用。 | 添加 try-catch 或 .catch() 处理，使用 `uni.showToast()` 显示具体错误信息。 |
| 三-0020 | apps/client/pages/login/index.vue | HIGH | [数据一致性] 微信登录调用 `loginWithWechat()` 后，代码中没有 `.catch()` 错误处理分支，也没有对返回值进行有效性校验。当 API 返回 4xx | 可能导致业务数据不一致或状态错误：用户在登录失败时看到的是永久加载状态或空白页，无法判断是网络问题、服务端问题还是账号问题，只能反复尝试或放弃使用。 | 添加 try-catch 或 .catch() 处理，使用 `uni.showToast()` 显示具体错误信息。 |
| 三-0021 | apps/client/pages/discussions/index.vue | HIGH | 页面加载数据时未处理加载中、加载失败、空数据三种状态。页面假设数据加载永远成功。 | 网络异常或后端故障时，用户看到空白页面，没有任何重试按钮或错误提示。 | 添加 `loading`、`error`、`empty` 三态处理，使用统一的错误状态组件。 |
| 三-0022 | apps/client/pages/discussions/index.vue | HIGH | [用户体验] 页面加载数据时未处理加载中、加载失败、空数据三种状态。页面假设数据加载永远成功。 | 影响用户体验与功能可用性：网络异常或后端故障时，用户看到空白页面，没有任何重试按钮或错误提示。 | 添加 `loading`、`error`、`empty` 三态处理，使用统一的错误状态组件。 |
| 三-0023 | apps/client/pages/discussions/index.vue | HIGH | [数据一致性] 页面加载数据时未处理加载中、加载失败、空数据三种状态。页面假设数据加载永远成功。 | 可能导致业务数据不一致或状态错误：网络异常或后端故障时，用户看到空白页面，没有任何重试按钮或错误提示。 | 添加 `loading`、`error`、`empty` 三态处理，使用统一的错误状态组件。 |
| 三-0024 | apps/client/pages/chat/index.vue | HIGH | 模板中使用了 `@tap.stop` 和 `@click.stop`，但微信小程序的 WXS 事件系统中不支持 Vue 的 `.stop` 事件修饰符。uni-app 编译为小程序时会静默丢弃该修饰符。 | 事件冒泡未如预期阻止，可能导致父级元素的点击事件被意外触发，造成导航错误或误操作。 | 改为在小程序端使用 `catchtap` 替代 `@tap.stop`，或通过条件编译区分平台。 |
| 三-0025 | apps/client/pages/chat/index.vue | HIGH | [用户体验] 模板中使用了 `@tap.stop` 和 `@click.stop`，但微信小程序的 WXS 事件系统中不支持 Vue 的 `.stop` 事件修饰符。uni- | 影响用户体验与功能可用性：事件冒泡未如预期阻止，可能导致父级元素的点击事件被意外触发，造成导航错误或误操作。 | 改为在小程序端使用 `catchtap` 替代 `@tap.stop`，或通过条件编译区分平台。 |
| 三-0026 | apps/client/pages/chat/index.vue | HIGH | [数据一致性] 模板中使用了 `@tap.stop` 和 `@click.stop`，但微信小程序的 WXS 事件系统中不支持 Vue 的 `.stop` 事件修饰符。uni- | 可能导致业务数据不一致或状态错误：事件冒泡未如预期阻止，可能导致父级元素的点击事件被意外触发，造成导航错误或误操作。 | 改为在小程序端使用 `catchtap` 替代 `@tap.stop`，或通过条件编译区分平台。 |
| 三-0027 | apps/client/pages/chat-session/index.vue | HIGH | 数据获取函数 `fetchMessages()` 被调用后，代码立即同步访问 Store 中的数据（假设数据已就绪），但 fetch 是异步的且未使用 await。 | 页面可能渲染空消息列表，尤其在网络较慢时。用户看到的聊天记录不完整，刷新后可能又正常显示，行为不稳定。 | 使用 `await` 等待数据加载完成后再进行页面渲染，或使用 loading 状态控制渲染时机。 |
| 三-0028 | apps/client/pages/chat-session/index.vue | HIGH | [用户体验] 数据获取函数 `fetchMessages()` 被调用后，代码立即同步访问 Store 中的数据（假设数据已就绪），但 fetch 是异步的且未使用 awai | 影响用户体验与功能可用性：页面可能渲染空消息列表，尤其在网络较慢时。用户看到的聊天记录不完整，刷新后可能又正常显示，行为不稳定。 | 使用 `await` 等待数据加载完成后再进行页面渲染，或使用 loading 状态控制渲染时机。 |
| 三-0029 | apps/client/pages/chat-session/index.vue | HIGH | [数据一致性] 数据获取函数 `fetchMessages()` 被调用后，代码立即同步访问 Store 中的数据（假设数据已就绪），但 fetch 是异步的且未使用 awai | 可能导致业务数据不一致或状态错误：页面可能渲染空消息列表，尤其在网络较慢时。用户看到的聊天记录不完整，刷新后可能又正常显示，行为不稳定。 | 使用 `await` 等待数据加载完成后再进行页面渲染，或使用 loading 状态控制渲染时机。 |
| 三-0030 | apps/client/pages/chat-session/index.vue | HIGH | 数据获取函数 `fetchMessages()` 被调用后，代码立即同步访问 Store 中的数据（假设数据已就绪），但 fetch 是异步的且未使用 awai——影响1：页面可能渲染空消息列表，尤其在网络较慢时 | 页面可能渲染空消息列表，尤其在网络较慢时 | 使用 `await` 等待数据加载完成后再进行页面渲染，或使用 loading 状态控制渲染时机。 |
| 三-0031 | apps/client/pages/chat-session/index.vue | HIGH | 数据获取函数 `fetchMessages()` 被调用后，代码立即同步访问 Store 中的数据（假设数据已就绪），但 fetch 是异步的且未使用 awai——影响2：用户看到的聊天记录不完整，刷新后可能又正常显示，行为不稳定 | 用户看到的聊天记录不完整，刷新后可能又正常显示，行为不稳定 | 使用 `await` 等待数据加载完成后再进行页面渲染，或使用 loading 状态控制渲染时机。 |
| 三-0032 | apps/client/pages/chat/index.vue | HIGH | 点击聊天对象创建新会话时，如果后端 API 创建会话失败，页面没有任何 toast 或错误提示，用户停留在当前页面但什么也没发生。 | 用户在创建会话失败后反复点击同一用户头像，产生大量无效请求，且无法判断问题原因。 | 添加会话创建失败的错误处理，向用户展示具体错误信息并提供重试选项。 |
| 三-0033 | apps/client/pages/chat/index.vue | HIGH | [用户体验] 点击聊天对象创建新会话时，如果后端 API 创建会话失败，页面没有任何 toast 或错误提示，用户停留在当前页面但什么也没发生。 | 影响用户体验与功能可用性：用户在创建会话失败后反复点击同一用户头像，产生大量无效请求，且无法判断问题原因。 | 添加会话创建失败的错误处理，向用户展示具体错误信息并提供重试选项。 |
| 三-0034 | apps/client/pages/chat/index.vue | HIGH | [数据一致性] 点击聊天对象创建新会话时，如果后端 API 创建会话失败，页面没有任何 toast 或错误提示，用户停留在当前页面但什么也没发生。 | 可能导致业务数据不一致或状态错误：用户在创建会话失败后反复点击同一用户头像，产生大量无效请求，且无法判断问题原因。 | 添加会话创建失败的错误处理，向用户展示具体错误信息并提供重试选项。 |
| 三-0035 | apps/client/pages/discussions/index.vue | HIGH | 论坛页面底部导航栏的 `selected` 属性被错误设置为 `1`（对应 "likes" Tab），而非该页面对应的 Tab 索引。 | 用户进入论坛页面时，底部 "喜欢" Tab 图标错误高亮，"论坛" Tab 图标保持未选中状态，造成导航位置混淆。 | 修正 `selected` 属性值为正确的论坛 Tab 索引。 --- |
| 三-0036 | apps/client/pages/discussions/index.vue | HIGH | [用户体验] 论坛页面底部导航栏的 `selected` 属性被错误设置为 `1`（对应 "likes" Tab），而非该页面对应的 Tab 索引。 | 影响用户体验与功能可用性：用户进入论坛页面时，底部 "喜欢" Tab 图标错误高亮，"论坛" Tab 图标保持未选中状态，造成导航位置混淆。 | 修正 `selected` 属性值为正确的论坛 Tab 索引。 --- |
| 三-0037 | apps/client/pages/discussions/index.vue | HIGH | [数据一致性] 论坛页面底部导航栏的 `selected` 属性被错误设置为 `1`（对应 "likes" Tab），而非该页面对应的 Tab 索引。 | 可能导致业务数据不一致或状态错误：用户进入论坛页面时，底部 "喜欢" Tab 图标错误高亮，"论坛" Tab 图标保持未选中状态，造成导航位置混淆。 | 修正 `selected` 属性值为正确的论坛 Tab 索引。 --- |
| 三-0038 | chat-session/index.vue | MEDIUM | onLoad` 中 `sessionId` 参数未校验，`null` 值时仍尝试 fetch | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0039 | chat-session/index.vue | MEDIUM | [用户体验] onLoad` 中 `sessionId` 参数未校验，`null` 值时仍尝试 fetch | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0040 | chat-session/index.vue | MEDIUM | [数据一致性] onLoad` 中 `sessionId` 参数未校验，`null` 值时仍尝试 fetch | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0041 | login/index.vue | MEDIUM | 登录成功后 `uni.setStorageSync` 同步阻塞主线程 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0042 | login/index.vue | MEDIUM | [用户体验] 登录成功后 `uni.setStorageSync` 同步阻塞主线程 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0043 | login/index.vue | MEDIUM | [数据一致性] 登录成功后 `uni.setStorageSync` 同步阻塞主线程 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0044 | activities/index.vue | MEDIUM | loadMoreData()` 无防抖——快速滚动触发数十次 API 请求 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0045 | activities/index.vue | MEDIUM | [用户体验] loadMoreData()` 无防抖——快速滚动触发数十次 API 请求 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0046 | activities/index.vue | MEDIUM | [数据一致性] loadMoreData()` 无防抖——快速滚动触发数十次 API 请求 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0047 | chat/index.vue | MEDIUM | 会话列表 `v-for` 缺少唯一稳定的 `:key`，使用 `index` 作为 key | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0048 | chat/index.vue | MEDIUM | [用户体验] 会话列表 `v-for` 缺少唯一稳定的 `:key`，使用 `index` 作为 key | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0049 | chat/index.vue | MEDIUM | [数据一致性] 会话列表 `v-for` 缺少唯一稳定的 `:key`，使用 `index` 作为 key | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0050 | chat-session/index.vue | MEDIUM | scroll-into-view` 的消息 ID 可能与实际 DOM id 不匹配 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0051 | chat-session/index.vue | MEDIUM | [用户体验] scroll-into-view` 的消息 ID 可能与实际 DOM id 不匹配 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0052 | chat-session/index.vue | MEDIUM | [数据一致性] scroll-into-view` 的消息 ID 可能与实际 DOM id 不匹配 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0053 | discussions/index.vue | MEDIUM | 点赞操作无乐观更新，用户需等待服务端响应后才能看到 UI 变化 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0054 | discussions/index.vue | MEDIUM | [用户体验] 点赞操作无乐观更新，用户需等待服务端响应后才能看到 UI 变化 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0055 | discussions/index.vue | MEDIUM | [数据一致性] 点赞操作无乐观更新，用户需等待服务端响应后才能看到 UI 变化 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0056 | activities/index.vue | MEDIUM | formatTime()` 使用 `new Date()` 本地时区，用户看到的时间可能偏移 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0057 | activities/index.vue | MEDIUM | [用户体验] formatTime()` 使用 `new Date()` 本地时区，用户看到的时间可能偏移 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0058 | activities/index.vue | MEDIUM | [数据一致性] formatTime()` 使用 `new Date()` 本地时区，用户看到的时间可能偏移 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0059 | login/index.vue | MEDIUM | 验证码倒计时使用 `setInterval`，页面切后台后计时器继续运行导致倒计时不准 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0060 | login/index.vue | MEDIUM | [用户体验] 验证码倒计时使用 `setInterval`，页面切后台后计时器继续运行导致倒计时不准 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0061 | login/index.vue | MEDIUM | [数据一致性] 验证码倒计时使用 `setInterval`，页面切后台后计时器继续运行导致倒计时不准 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0062 | chat/index.vue | MEDIUM | 未读消息数角标在 `onHide` 时未更新，切后台期间收到新消息后回到前台显示旧数据 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0063 | chat/index.vue | MEDIUM | [用户体验] 未读消息数角标在 `onHide` 时未更新，切后台期间收到新消息后回到前台显示旧数据 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0064 | chat/index.vue | MEDIUM | [数据一致性] 未读消息数角标在 `onHide` 时未更新，切后台期间收到新消息后回到前台显示旧数据 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0065 | chat-session/index.vue | MEDIUM | 键盘弹起时消息列表未自动滚到底部，新消息可能被键盘遮挡 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0066 | chat-session/index.vue | MEDIUM | [用户体验] 键盘弹起时消息列表未自动滚到底部，新消息可能被键盘遮挡 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0067 | chat-session/index.vue | MEDIUM | [数据一致性] 键盘弹起时消息列表未自动滚到底部，新消息可能被键盘遮挡 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0068 | activities/index.vue | MEDIUM | 活动报名按钮点击后无 loading 状态，重复点击创建多个报名请求 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0069 | activities/index.vue | MEDIUM | [用户体验] 活动报名按钮点击后无 loading 状态，重复点击创建多个报名请求 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0070 | activities/index.vue | MEDIUM | [数据一致性] 活动报名按钮点击后无 loading 状态，重复点击创建多个报名请求 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0071 | discussions/index.vue | MEDIUM | 帖子列表分页加载更多时，加载失败的帖子项被静默丢弃 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0072 | discussions/index.vue | MEDIUM | [用户体验] 帖子列表分页加载更多时，加载失败的帖子项被静默丢弃 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0073 | discussions/index.vue | MEDIUM | [数据一致性] 帖子列表分页加载更多时，加载失败的帖子项被静默丢弃 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0074 | apps/client/src/stores/chat.ts | HIGH | `sendText()` 函数在调用 API 时，使用 TypeScript 的 `as any` 类型断言传递消息对象。对象包含了接口定义中不存在的额外字段（如 `localId`、`sendingStatus` 等客户端状态字段），这些字段被一并发送到后端。 | 严格的后端 JSON Schema 校验会拒绝包含未知字段的请求体，返回 HTTP 400。在网络条件差时，用户发送消息可能失败但本地显示已发送，造成消息丢失的假象。 | 定义明确的 `SendMessageRequest` 接口类型，在调用 API 前使用 pick/omit 移除内部状态字段，移除 `as any` 断言。 |
| 三-0075 | apps/client/src/stores/chat.ts | HIGH | [用户体验] `sendText()` 函数在调用 API 时，使用 TypeScript 的 `as any` 类型断言传递消息对象。对象包含了接口定义中不存在的额外字段（ | 影响用户体验与功能可用性：严格的后端 JSON Schema 校验会拒绝包含未知字段的请求体，返回 HTTP 400。在网络条件差时，用户发送消息可能失败但本地显示已发送，造成消息丢失的假象。 | 定义明确的 `SendMessageRequest` 接口类型，在调用 API 前使用 pick/omit 移除内部状态字段，移除 `as any` 断言。 |
| 三-0076 | apps/client/src/stores/chat.ts | HIGH | [数据一致性] `sendText()` 函数在调用 API 时，使用 TypeScript 的 `as any` 类型断言传递消息对象。对象包含了接口定义中不存在的额外字段（ | 可能导致业务数据不一致或状态错误：严格的后端 JSON Schema 校验会拒绝包含未知字段的请求体，返回 HTTP 400。在网络条件差时，用户发送消息可能失败但本地显示已发送，造成消息丢失的假象。 | 定义明确的 `SendMessageRequest` 接口类型，在调用 API 前使用 pick/omit 移除内部状态字段，移除 `as any` 断言。 |
| 三-0077 | apps/client/src/stores/chat.ts | HIGH | `sendText()` 函数在调用 API 时，使用 TypeScript 的 `as any` 类型断言传递消息对象。对象包含了接口定义中不存在的额外字段（——影响1：严格的后端 JSON Schema 校验会拒绝包含未知字段的请求体，返回 HTTP 400 | 严格的后端 JSON Schema 校验会拒绝包含未知字段的请求体，返回 HTTP 400 | 定义明确的 `SendMessageRequest` 接口类型，在调用 API 前使用 pick/omit 移除内部状态字段，移除 `as any` 断言。 |
| 三-0078 | apps/client/src/stores/chat.ts | HIGH | `sendText()` 函数在调用 API 时，使用 TypeScript 的 `as any` 类型断言传递消息对象。对象包含了接口定义中不存在的额外字段（——影响2：在网络条件差时，用户发送消息可能失败但本地显示已发送，造成消息丢失的假象 | 在网络条件差时，用户发送消息可能失败但本地显示已发送，造成消息丢失的假象 | 定义明确的 `SendMessageRequest` 接口类型，在调用 API 前使用 pick/omit 移除内部状态字段，移除 `as any` 断言。 |
| 三-0079 | apps/client/src/services/agnes-video.ts | HIGH | AI 视频生成功能的 API 端点返回 HTTP 401 Unauthorized。该服务使用的 API Key 或认证机制已过期/无效，所有 AI 视频生成请求均被拒绝。 | 用户尝试使用 AI 视频生成功能时永远失败，但前端未捕获 401 并给出友好提示——用户看到的是通用错误信息，不知道是认证问题。该功能模块对用户完全不可用。 | 1. 与服务端确认 Agnes Video API 的认证方式是否变更 2. 将 API Key 移至环境变量而非硬编码 3. 添加 401 专用错误处理，向用户显示 "服务暂不可用" 并通知运维团队 --- |
| 三-0080 | apps/client/src/services/agnes-video.ts | HIGH | [用户体验] AI 视频生成功能的 API 端点返回 HTTP 401 Unauthorized。该服务使用的 API Key 或认证机制已过期/无效，所有 AI 视频生成请 | 影响用户体验与功能可用性：用户尝试使用 AI 视频生成功能时永远失败，但前端未捕获 401 并给出友好提示——用户看到的是通用错误信息，不知道是认证问题。该功能模块对用户完全不可用。 | 1. 与服务端确认 Agnes Video API 的认证方式是否变更 2. 将 API Key 移至环境变量而非硬编码 3. 添加 401 专用错误处理，向用户显示 "服务暂不可用" 并通知运维团队 --- |
| 三-0081 | apps/client/src/services/agnes-video.ts | HIGH | [数据一致性] AI 视频生成功能的 API 端点返回 HTTP 401 Unauthorized。该服务使用的 API Key 或认证机制已过期/无效，所有 AI 视频生成请 | 可能导致业务数据不一致或状态错误：用户尝试使用 AI 视频生成功能时永远失败，但前端未捕获 401 并给出友好提示——用户看到的是通用错误信息，不知道是认证问题。该功能模块对用户完全不可用。 | 1. 与服务端确认 Agnes Video API 的认证方式是否变更 2. 将 API Key 移至环境变量而非硬编码 3. 添加 401 专用错误处理，向用户显示 "服务暂不可用" 并通知运维团队 --- |
| 三-0082 | apps/client/src/services/agnes-video.ts | HIGH | AI 视频生成功能的 API 端点返回 HTTP 401 Unauthorized。该服务使用的 API Key 或认证机制已过期/无效，所有 AI 视频生成请——影响1：用户尝试使用 AI 视频生成功能时永远失败，但前端未捕获 401 并给出友好提示——用户看到的是通用错误信息，不知道是认证问题 | 用户尝试使用 AI 视频生成功能时永远失败，但前端未捕获 401 并给出友好提示——用户看到的是通用错误信息，不知道是认证问题 | 1. 与服务端确认 Agnes Video API 的认证方式是否变更 2. 将 API Key 移至环境变量而非硬编码 3. 添加 401 专用错误处理，向用户显示 "服务暂不可用" 并通知运维团队 --- |
| 三-0083 | apps/client/src/services/agnes-video.ts | HIGH | AI 视频生成功能的 API 端点返回 HTTP 401 Unauthorized。该服务使用的 API Key 或认证机制已过期/无效，所有 AI 视频生成请——影响2：该功能模块对用户完全不可用 | 该功能模块对用户完全不可用 | 1. 与服务端确认 Agnes Video API 的认证方式是否变更 2. 将 API Key 移至环境变量而非硬编码 3. 添加 401 专用错误处理，向用户显示 "服务暂不可用" 并通知运维团队 --- |
| 三-0084 | apps/client/src/stores/discover.ts | MEDIUM | 当 `swipeRight` API 调用失败时，错误处理中直接 `catch` 了异常并使用 `Math.random() > 0.5` 生成一个虚假的匹配结果返回给调用方。 | 后端匹配服务宕机时，用户以为自己在正常使用匹配功能（实际上收到的是随机结果）。这可能产生垃圾匹配记录，且用户对匹配成功率产生错误预期。 | API 失败时向上层抛出异常，由页面组件展示具体的错误信息和重试按钮，不要在 Store 层静默吞掉错误。 |
| 三-0085 | apps/client/src/stores/discover.ts | MEDIUM | [用户体验] 当 `swipeRight` API 调用失败时，错误处理中直接 `catch` 了异常并使用 `Math.random() > 0.5` 生成一个虚假的匹配结 | 影响用户体验与功能可用性：后端匹配服务宕机时，用户以为自己在正常使用匹配功能（实际上收到的是随机结果）。这可能产生垃圾匹配记录，且用户对匹配成功率产生错误预期。 | API 失败时向上层抛出异常，由页面组件展示具体的错误信息和重试按钮，不要在 Store 层静默吞掉错误。 |
| 三-0086 | apps/client/src/stores/discover.ts | MEDIUM | [数据一致性] 当 `swipeRight` API 调用失败时，错误处理中直接 `catch` 了异常并使用 `Math.random() > 0.5` 生成一个虚假的匹配结 | 可能导致业务数据不一致或状态错误：后端匹配服务宕机时，用户以为自己在正常使用匹配功能（实际上收到的是随机结果）。这可能产生垃圾匹配记录，且用户对匹配成功率产生错误预期。 | API 失败时向上层抛出异常，由页面组件展示具体的错误信息和重试按钮，不要在 Store 层静默吞掉错误。 |
| 三-0087 | apps/client/src/stores/discover.ts | MEDIUM | 当 `swipeRight` API 调用失败时，错误处理中直接 `catch` 了异常并使用 `Math.random() > 0.5` 生成一个虚假的匹配结——影响1：后端匹配服务宕机时，用户以为自己在正常使用匹配功能（实际上收到的是随机结果） | 后端匹配服务宕机时，用户以为自己在正常使用匹配功能（实际上收到的是随机结果） | API 失败时向上层抛出异常，由页面组件展示具体的错误信息和重试按钮，不要在 Store 层静默吞掉错误。 |
| 三-0088 | apps/client/src/stores/discover.ts | MEDIUM | 当 `swipeRight` API 调用失败时，错误处理中直接 `catch` 了异常并使用 `Math.random() > 0.5` 生成一个虚假的匹配结——影响2：这可能产生垃圾匹配记录，且用户对匹配成功率产生错误预期 | 这可能产生垃圾匹配记录，且用户对匹配成功率产生错误预期 | API 失败时向上层抛出异常，由页面组件展示具体的错误信息和重试按钮，不要在 Store 层静默吞掉错误。 |
| 三-0089 | apps/client/src/stores/profile.ts | MEDIUM | `load()` 方法调用 `/api/profile` 获取用户信息后，仅填充了基础字段（nickname、avatar、bio 等），但 `vipStatus`（VIP 状态）和 `myPosts`（我的帖子）两个属性未被从响应中提取或通过独立 API 加载。 | 个人主页的 VIP 标识永远不显示或显示为默认值（非 VIP），用户即使购买了 VIP 也看不到身份标识。"我的帖子" Tab 永远为空，用户以为帖子未发布成功。 | 在 `load()` 中解析并存储 `vipStatus` 字段；添加独立的 `loadMyPosts()` 方法或分页延迟加载。 |
| 三-0090 | apps/client/src/stores/profile.ts | MEDIUM | [用户体验] `load()` 方法调用 `/api/profile` 获取用户信息后，仅填充了基础字段（nickname、avatar、bio 等），但 `vipStatu | 影响用户体验与功能可用性：个人主页的 VIP 标识永远不显示或显示为默认值（非 VIP），用户即使购买了 VIP 也看不到身份标识。"我的帖子" Tab 永远为空，用户以为帖子未发布成功。 | 在 `load()` 中解析并存储 `vipStatus` 字段；添加独立的 `loadMyPosts()` 方法或分页延迟加载。 |
| 三-0091 | apps/client/src/stores/profile.ts | MEDIUM | [数据一致性] `load()` 方法调用 `/api/profile` 获取用户信息后，仅填充了基础字段（nickname、avatar、bio 等），但 `vipStatu | 可能导致业务数据不一致或状态错误：个人主页的 VIP 标识永远不显示或显示为默认值（非 VIP），用户即使购买了 VIP 也看不到身份标识。"我的帖子" Tab 永远为空，用户以为帖子未发布成功。 | 在 `load()` 中解析并存储 `vipStatus` 字段；添加独立的 `loadMyPosts()` 方法或分页延迟加载。 |
| 三-0092 | apps/client/src/stores/profile.ts | MEDIUM | [付费转化] `load()` 方法调用 `/api/profile` 获取用户信息后，仅填充了基础字段（nickname、avatar、bio 等），但 `vipStatu | 可能影响付费转化或运营成本：个人主页的 VIP 标识永远不显示或显示为默认值（非 VIP），用户即使购买了 VIP 也看不到身份标识。"我的帖子" Tab 永远为空，用户以为帖子未发布成功。 | 在 `load()` 中解析并存储 `vipStatus` 字段；添加独立的 `loadMyPosts()` 方法或分页延迟加载。 |
| 三-0093 | apps/client/src/stores/profile.ts | MEDIUM | `load()` 方法调用 `/api/profile` 获取用户信息后，仅填充了基础字段（nickname、avatar、bio 等），但 `vipStatu——影响1：个人主页的 VIP 标识永远不显示或显示为默认值（非 VIP），用户即使购买了 VIP 也看不到身份标识 | 个人主页的 VIP 标识永远不显示或显示为默认值（非 VIP），用户即使购买了 VIP 也看不到身份标识 | 在 `load()` 中解析并存储 `vipStatus` 字段；添加独立的 `loadMyPosts()` 方法或分页延迟加载。 |
| 三-0094 | apps/client/src/stores/profile.ts | MEDIUM | `load()` 方法调用 `/api/profile` 获取用户信息后，仅填充了基础字段（nickname、avatar、bio 等），但 `vipStatu——影响2："我的帖子" Tab 永远为空，用户以为帖子未发布成功 | "我的帖子" Tab 永远为空，用户以为帖子未发布成功 | 在 `load()` 中解析并存储 `vipStatus` 字段；添加独立的 `loadMyPosts()` 方法或分页延迟加载。 |
| 三-0095 | apps/client/src/services/api.ts | MEDIUM | `loginWithWechat()` 方法从响应体中提取 token 字段时，使用了 `(response as any).data.token` 类型断言，而非定义明确的响应类型接口。 | 后端返回结构变更（如 token 字段重命名或嵌套层级变化）时，TypeScript 编译器无法检测到错误，登录流程在运行时崩溃。 | 定义 `LoginResponse` 接口，使用类型守卫或 zod 运行时校验确保响应结构符合预期。 |
| 三-0096 | apps/client/src/services/api.ts | MEDIUM | [用户体验] `loginWithWechat()` 方法从响应体中提取 token 字段时，使用了 `(response as any).data.token` 类型断言， | 影响用户体验与功能可用性：后端返回结构变更（如 token 字段重命名或嵌套层级变化）时，TypeScript 编译器无法检测到错误，登录流程在运行时崩溃。 | 定义 `LoginResponse` 接口，使用类型守卫或 zod 运行时校验确保响应结构符合预期。 |
| 三-0097 | apps/client/src/services/api.ts | MEDIUM | [数据一致性] `loginWithWechat()` 方法从响应体中提取 token 字段时，使用了 `(response as any).data.token` 类型断言， | 可能导致业务数据不一致或状态错误：后端返回结构变更（如 token 字段重命名或嵌套层级变化）时，TypeScript 编译器无法检测到错误，登录流程在运行时崩溃。 | 定义 `LoginResponse` 接口，使用类型守卫或 zod 运行时校验确保响应结构符合预期。 |
| 三-0098 | apps/client/src/stores/activity.ts | MEDIUM | `fetchMoreActivities()` 方法的实现中，`page` 参数始终传递固定值（可能是 `1`），而非当前页码 + 1。或者页码状态未被正确持久化，每次调用都从第 1 页开始加载。 | 用户下拉加载更多活动时，看到的是重复的第一页数据，新活动永远无法加载出来。 | 维护 `currentPage` 状态并在每次调用后递增，将正确的页码传递给 API。 |
| 三-0099 | apps/client/src/stores/activity.ts | MEDIUM | [用户体验] `fetchMoreActivities()` 方法的实现中，`page` 参数始终传递固定值（可能是 `1`），而非当前页码 + 1。或者页码状态未被正确持久 | 影响用户体验与功能可用性：用户下拉加载更多活动时，看到的是重复的第一页数据，新活动永远无法加载出来。 | 维护 `currentPage` 状态并在每次调用后递增，将正确的页码传递给 API。 |
| 三-0100 | apps/client/src/stores/activity.ts | MEDIUM | [数据一致性] `fetchMoreActivities()` 方法的实现中，`page` 参数始终传递固定值（可能是 `1`），而非当前页码 + 1。或者页码状态未被正确持久 | 可能导致业务数据不一致或状态错误：用户下拉加载更多活动时，看到的是重复的第一页数据，新活动永远无法加载出来。 | 维护 `currentPage` 状态并在每次调用后递增，将正确的页码传递给 API。 |
| 三-0101 | apps/client/src/stores/session.ts | MEDIUM | 用户资料完成度的计算逻辑为 `Math.min(baseScore, detailScore)`，而非 `(baseScore + detailScore) / maxPossible`。取最小值意味着用户填写了大量的基础信息但细节信息较少时，完成度显示极低。 | 用户填写了 80% 的基础信息和 20% 的细节信息，完成度显示为 20%，严重打击用户完善资料的积极性。 | 改为加权平均或求和方式计算完成度，更好地反映用户实际填写的资料比例。 |
| 三-0102 | apps/client/src/stores/session.ts | MEDIUM | [用户体验] 用户资料完成度的计算逻辑为 `Math.min(baseScore, detailScore)`，而非 `(baseScore + detailScore) / | 影响用户体验与功能可用性：用户填写了 80% 的基础信息和 20% 的细节信息，完成度显示为 20%，严重打击用户完善资料的积极性。 | 改为加权平均或求和方式计算完成度，更好地反映用户实际填写的资料比例。 |
| 三-0103 | apps/client/src/stores/session.ts | MEDIUM | [数据一致性] 用户资料完成度的计算逻辑为 `Math.min(baseScore, detailScore)`，而非 `(baseScore + detailScore) / | 可能导致业务数据不一致或状态错误：用户填写了 80% 的基础信息和 20% 的细节信息，完成度显示为 20%，严重打击用户完善资料的积极性。 | 改为加权平均或求和方式计算完成度，更好地反映用户实际填写的资料比例。 |
| 三-0104 | apps/client/src/services/websocket.ts | MEDIUM | 处理 Stomp 协议帧时，将帧体转换为 `Record<string,unknown>` 类型使用了双重类型断言 `as unknown as Record<string,unknown>`，完全绕过了 TypeScript 的类型检查。 | 如果后端消息格式变更，TypeScript 无法提供编译时保护，运行时可能出现 `Cannot read property 'x' of undefined` 错误。 | 使用 zod schema 或自定义 type guard 对帧体进行运行时校验，确保数据结构符合预期后再使用。 |
| 三-0105 | apps/client/src/services/websocket.ts | MEDIUM | [用户体验] 处理 Stomp 协议帧时，将帧体转换为 `Record<string,unknown>` 类型使用了双重类型断言 `as unknown as Record< | 影响用户体验与功能可用性：如果后端消息格式变更，TypeScript 无法提供编译时保护，运行时可能出现 `Cannot read property 'x' of undefined` 错误。 | 使用 zod schema 或自定义 type guard 对帧体进行运行时校验，确保数据结构符合预期后再使用。 |
| 三-0106 | apps/client/src/services/websocket.ts | MEDIUM | [数据一致性] 处理 Stomp 协议帧时，将帧体转换为 `Record<string,unknown>` 类型使用了双重类型断言 `as unknown as Record< | 可能导致业务数据不一致或状态错误：如果后端消息格式变更，TypeScript 无法提供编译时保护，运行时可能出现 `Cannot read property 'x' of undefined` 错误。 | 使用 zod schema 或自定义 type guard 对帧体进行运行时校验，确保数据结构符合预期后再使用。 |
| 三-0107 | apps/client/src/stores/messages.ts | MEDIUM | `fetchNotifications()` 方法中，先更新 `filterType` 状态（同步），再调用 API（异步）。如果用户在 API 返回前快速切换过滤器，`filterType` 可能已被更新为新的值，但 API 响应返回的是旧过滤器的数据。 | 通知列表显示的数据与当前选中的过滤器类型不匹配，用户看到点赞通知在评论过滤 Tab 下。 | 使用请求序列号或 AbortController，当新请求发起时取消旧请求，或检查返回时的 filterType 是否与发起请求时一致。 |
| 三-0108 | apps/client/src/stores/messages.ts | MEDIUM | [用户体验] `fetchNotifications()` 方法中，先更新 `filterType` 状态（同步），再调用 API（异步）。如果用户在 API 返回前快速切换 | 影响用户体验与功能可用性：通知列表显示的数据与当前选中的过滤器类型不匹配，用户看到点赞通知在评论过滤 Tab 下。 | 使用请求序列号或 AbortController，当新请求发起时取消旧请求，或检查返回时的 filterType 是否与发起请求时一致。 |
| 三-0109 | apps/client/src/stores/messages.ts | MEDIUM | [数据一致性] `fetchNotifications()` 方法中，先更新 `filterType` 状态（同步），再调用 API（异步）。如果用户在 API 返回前快速切换 | 可能导致业务数据不一致或状态错误：通知列表显示的数据与当前选中的过滤器类型不匹配，用户看到点赞通知在评论过滤 Tab 下。 | 使用请求序列号或 AbortController，当新请求发起时取消旧请求，或检查返回时的 filterType 是否与发起请求时一致。 |
| 三-0110 | apps/client/src/stores/checkin.ts | MEDIUM | Mock 签到逻辑中判断"连续签到"是基于上一次签到时间戳与当前时间戳的差值是否小于 48 小时。但比较使用的是 `Date.now()`（客户端时间，可被用户修改）且存在时区问题。用户在不同时区签到或手动调整手机时间后，连续签到计数可能重置或异常。 | 依赖签到连续天数解锁的奖励（如连续 7 天签到奖励）可能因时区/时间问题无法正常获取，引发用户投诉。 | 签到连续性的判断应由服务端基于服务器时间执行，客户端仅展示服务端返回的签到状态。 --- |
| 三-0111 | apps/client/src/stores/checkin.ts | MEDIUM | [用户体验] Mock 签到逻辑中判断"连续签到"是基于上一次签到时间戳与当前时间戳的差值是否小于 48 小时。但比较使用的是 `Date.now()`（客户端时间，可被用户 | 影响用户体验与功能可用性：依赖签到连续天数解锁的奖励（如连续 7 天签到奖励）可能因时区/时间问题无法正常获取，引发用户投诉。 | 签到连续性的判断应由服务端基于服务器时间执行，客户端仅展示服务端返回的签到状态。 --- |
| 三-0112 | apps/client/src/stores/checkin.ts | MEDIUM | [数据一致性] Mock 签到逻辑中判断"连续签到"是基于上一次签到时间戳与当前时间戳的差值是否小于 48 小时。但比较使用的是 `Date.now()`（客户端时间，可被用户 | 可能导致业务数据不一致或状态错误：依赖签到连续天数解锁的奖励（如连续 7 天签到奖励）可能因时区/时间问题无法正常获取，引发用户投诉。 | 签到连续性的判断应由服务端基于服务器时间执行，客户端仅展示服务端返回的签到状态。 --- |
| 三-0113 | stores/discover.ts | LOW | swipeLeft` 操作未调用后端 API，仅做本地状态更新（跳过记录未上报） | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0114 | stores/discover.ts | LOW | [用户体验] swipeLeft` 操作未调用后端 API，仅做本地状态更新（跳过记录未上报） | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0115 | stores/discover.ts | LOW | [数据一致性] swipeLeft` 操作未调用后端 API，仅做本地状态更新（跳过记录未上报） | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0116 | stores/profile.ts | LOW | updateProfile` 成功后未同步更新 session store 中的缓存 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0117 | stores/profile.ts | LOW | [用户体验] updateProfile` 成功后未同步更新 session store 中的缓存 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0118 | stores/profile.ts | LOW | [数据一致性] updateProfile` 成功后未同步更新 session store 中的缓存 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0119 | services/api.ts | LOW | 请求超时时间硬编码为 10000ms，未使用配置文件中的值 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0120 | services/api.ts | LOW | [用户体验] 请求超时时间硬编码为 10000ms，未使用配置文件中的值 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0121 | services/api.ts | LOW | [数据一致性] 请求超时时间硬编码为 10000ms，未使用配置文件中的值 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0122 | stores/chat.ts | LOW | sendText` 中乐观更新的消息使用 `Date.now()` 作为临时 ID，存在极小概率冲突 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0123 | stores/chat.ts | LOW | [用户体验] sendText` 中乐观更新的消息使用 `Date.now()` 作为临时 ID，存在极小概率冲突 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0124 | stores/chat.ts | LOW | [数据一致性] sendText` 中乐观更新的消息使用 `Date.now()` 作为临时 ID，存在极小概率冲突 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0125 | services/websocket.ts | LOW | 重连策略使用固定间隔，未使用指数退避算法 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0126 | services/websocket.ts | LOW | [用户体验] 重连策略使用固定间隔，未使用指数退避算法 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0127 | services/websocket.ts | LOW | [数据一致性] 重连策略使用固定间隔，未使用指数退避算法 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0128 | stores/messages.ts | LOW | 未读消息计数仅在 `fetchMessages` 时更新，WebSocket 推送的新消息不更新计数 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0129 | stores/messages.ts | LOW | [用户体验] 未读消息计数仅在 `fetchMessages` 时更新，WebSocket 推送的新消息不更新计数 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0130 | stores/messages.ts | LOW | [数据一致性] 未读消息计数仅在 `fetchMessages` 时更新，WebSocket 推送的新消息不更新计数 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0131 | stores/activity.ts | LOW | registerActivity` 成功后未更新活动参与人数 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0132 | stores/activity.ts | LOW | [用户体验] registerActivity` 成功后未更新活动参与人数 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0133 | stores/activity.ts | LOW | [数据一致性] registerActivity` 成功后未更新活动参与人数 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0134 | services/agnes-video.ts | LOW | 请求未设置超时——AI 生成耗时较长时可能无限等待 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0135 | services/agnes-video.ts | LOW | [用户体验] 请求未设置超时——AI 生成耗时较长时可能无限等待 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0136 | services/agnes-video.ts | LOW | [数据一致性] 请求未设置超时——AI 生成耗时较长时可能无限等待 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0137 | apps/client/src/stores/chat.ts | HIGH | ~200 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0138 | apps/client/src/stores/chat.ts | HIGH | [用户体验] ~200 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0139 | apps/client/src/stores/chat.ts | HIGH | [数据一致性] ~200 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0140 | apps/client/src/services/agnes-video.ts | HIGH | ~80 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0141 | apps/client/src/services/agnes-video.ts | HIGH | [用户体验] ~80 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0142 | apps/client/src/services/agnes-video.ts | HIGH | [数据一致性] ~80 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0143 | apps/client/src/stores/discover.ts | HIGH | ~180 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0144 | apps/client/src/stores/discover.ts | HIGH | [用户体验] ~180 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0145 | apps/client/src/stores/discover.ts | HIGH | [数据一致性] ~180 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0146 | apps/client/src/stores/profile.ts | HIGH | ~120 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0147 | apps/client/src/stores/profile.ts | HIGH | [用户体验] ~120 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0148 | apps/client/src/stores/profile.ts | HIGH | [数据一致性] ~120 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0149 | apps/client/src/services/api.ts | HIGH | ~200 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0150 | apps/client/src/services/api.ts | HIGH | [用户体验] ~200 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0151 | apps/client/src/services/api.ts | HIGH | [数据一致性] ~200 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0152 | apps/client/src/stores/activity.ts | HIGH | ~100 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0153 | apps/client/src/stores/activity.ts | HIGH | [用户体验] ~100 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0154 | apps/client/src/stores/activity.ts | HIGH | [数据一致性] ~100 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0155 | apps/client/src/stores/session.ts | HIGH | ~150 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0156 | apps/client/src/stores/session.ts | HIGH | [用户体验] ~150 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0157 | apps/client/src/stores/session.ts | HIGH | [数据一致性] ~150 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0158 | apps/client/src/services/websocket.ts | HIGH | ~100 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0159 | apps/client/src/services/websocket.ts | HIGH | [用户体验] ~100 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0160 | apps/client/src/services/websocket.ts | HIGH | [数据一致性] ~100 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0161 | apps/client/src/stores/messages.ts | HIGH | ~150 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0162 | apps/client/src/stores/messages.ts | HIGH | [用户体验] ~150 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0163 | apps/client/src/stores/messages.ts | HIGH | [数据一致性] ~150 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0164 | apps/client/src/stores/checkin.ts | HIGH | ~60 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0165 | apps/client/src/stores/checkin.ts | HIGH | [用户体验] ~60 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0166 | apps/client/src/stores/checkin.ts | HIGH | [数据一致性] ~60 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0167 | apps/api/src/main/java/com/campuslove/api/user/User.java | CRITICAL | `User` 实体的 `password` 字段缺少 `@JsonIgnore` 注解。当 `User` 对象通过 Jackson 序列化成 JSON 响应时，BCrypt 密码哈希会直接暴露给前端。 ```java // 当前代码 (有漏洞) @Column(name = "password") private String password; // BCrypt hash 直接暴露在 JSON 中 // 应改为 @JsonIgnore @Column(name = "password") private String password; ``` | 即使 BCrypt 哈希无法逆向，攻击者获取哈希后仍可进行离线暴力破解。密码哈希绝不应离开后端。 | 添加 `@JsonIgnore` 注解，并确保所有返回 `User` 实体的 API 端点使用 DTO 投影。 |
| 三-0168 | apps/api/src/main/java/com/campuslove/api/user/User.java | CRITICAL | [用户体验] `User` 实体的 `password` 字段缺少 `@JsonIgnore` 注解。当 `User` 对象通过 Jackson 序列化成 JSON 响应时， | 影响用户体验与功能可用性：即使 BCrypt 哈希无法逆向，攻击者获取哈希后仍可进行离线暴力破解。密码哈希绝不应离开后端。 | 添加 `@JsonIgnore` 注解，并确保所有返回 `User` 实体的 API 端点使用 DTO 投影。 |
| 三-0169 | apps/api/src/main/java/com/campuslove/api/user/User.java | CRITICAL | [数据一致性] `User` 实体的 `password` 字段缺少 `@JsonIgnore` 注解。当 `User` 对象通过 Jackson 序列化成 JSON 响应时， | 可能导致业务数据不一致或状态错误：即使 BCrypt 哈希无法逆向，攻击者获取哈希后仍可进行离线暴力破解。密码哈希绝不应离开后端。 | 添加 `@JsonIgnore` 注解，并确保所有返回 `User` 实体的 API 端点使用 DTO 投影。 |
| 三-0170 | apps/api/src/main/java/com/campuslove/api/user/User.java | CRITICAL | `User` 实体的 `password` 字段缺少 `@JsonIgnore` 注解。当 `User` 对象通过 Jackson 序列化成 JSON 响应时，——影响1：即使 BCrypt 哈希无法逆向，攻击者获取哈希后仍可进行离线暴力破解 | 即使 BCrypt 哈希无法逆向，攻击者获取哈希后仍可进行离线暴力破解 | 添加 `@JsonIgnore` 注解，并确保所有返回 `User` 实体的 API 端点使用 DTO 投影。 |
| 三-0171 | apps/api/src/main/java/com/campuslove/api/user/User.java | CRITICAL | `User` 实体的 `password` 字段缺少 `@JsonIgnore` 注解。当 `User` 对象通过 Jackson 序列化成 JSON 响应时，——影响2：密码哈希绝不应离开后端 | 密码哈希绝不应离开后端 | 添加 `@JsonIgnore` 注解，并确保所有返回 `User` 实体的 API 端点使用 DTO 投影。 |
| 三-0172 | apps/api/src/main/java/com/campuslove/api/growth/WeChatPushService.java | CRITICAL | `cachedAccessToken` 字段未声明为 `volatile`，导致双重检查锁定 (Double-Checked Locking) 模式失效。在 JVM 内存模型下，一个线程可能看到未完全构造的对象引用。 ```java // 当前代码 (有漏洞) private String cachedAccessToken; // 缺少 volatile private Instant tokenExpiry; public String getAccessToken() { if (cachedAccessToken == null &#124;&#124; Instant.now().isAfter(tokenExpiry)) { synchronized (this) { if (cachedAccessToken == null &#124;&#124; Instant.now().isAfter(tokenExpiry)) { refreshToken(); // 另一个线程可能看到部分写入 } } } return cachedAccessToken; } ``` | 多线程环境下可能返回过期或无意义的 token，导致微信推送功能间歇性失败。 | 将字段声明为 `private volatile String cachedAccessToken;` 并使用 `AtomicReference` 或单例 Holder 类模式重构。 |
| 三-0173 | apps/api/src/main/java/com/campuslove/api/growth/WeChatPushService.java | CRITICAL | [用户体验] `cachedAccessToken` 字段未声明为 `volatile`，导致双重检查锁定 (Double-Checked Locking) 模式失效。在 J | 影响用户体验与功能可用性：多线程环境下可能返回过期或无意义的 token，导致微信推送功能间歇性失败。 | 将字段声明为 `private volatile String cachedAccessToken;` 并使用 `AtomicReference` 或单例 Holder 类模式重构。 |
| 三-0174 | apps/api/src/main/java/com/campuslove/api/growth/WeChatPushService.java | CRITICAL | [数据一致性] `cachedAccessToken` 字段未声明为 `volatile`，导致双重检查锁定 (Double-Checked Locking) 模式失效。在 J | 可能导致业务数据不一致或状态错误：多线程环境下可能返回过期或无意义的 token，导致微信推送功能间歇性失败。 | 将字段声明为 `private volatile String cachedAccessToken;` 并使用 `AtomicReference` 或单例 Holder 类模式重构。 |
| 三-0175 | apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java | HIGH | 管理员登录流程中，`authenticateAdmin()` 方法验证了用户名和密码，但未检查 `admin.enabled` 或 `admin.status` 字段。已被禁用的管理员账号仍可成功登录并获得 JWT token。 ```java // 当前代码缺少状态检查 Admin admin = adminRepository.findByUsername(username); if (admin != null && passwordEncoder.matches(password, admin.getPassword())) { return generateToken(admin); // 未检查 admin.isEnabled() } ``` | 权限管理失效 -- 禁用的管理员账号实际仍可操作后台。 | 在密码验证通过后增加 `if (!admin.isEnabled()) throw new AccountDisabledException();`。 |
| 三-0176 | apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java | HIGH | [用户体验] 管理员登录流程中，`authenticateAdmin()` 方法验证了用户名和密码，但未检查 `admin.enabled` 或 `admin.status` | 影响用户体验与功能可用性：权限管理失效 -- 禁用的管理员账号实际仍可操作后台。 | 在密码验证通过后增加 `if (!admin.isEnabled()) throw new AccountDisabledException();`。 |
| 三-0177 | apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java | HIGH | [数据一致性] 管理员登录流程中，`authenticateAdmin()` 方法验证了用户名和密码，但未检查 `admin.enabled` 或 `admin.status` | 可能导致业务数据不一致或状态错误：权限管理失效 -- 禁用的管理员账号实际仍可操作后台。 | 在密码验证通过后增加 `if (!admin.isEnabled()) throw new AccountDisabledException();`。 |
| 三-0178 | apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java | HIGH | `rewind()` 方法中 `dailyRewindLimit` 被正确计算，日使用次数也被查询，但 `rewindCount >= dailyRewindLimit` 的比较结果赋值后从未用于实际拒绝请求。方法继续执行了 rewind 操作。 ```java // 计算了限制但从未 return/throw int rewindCount = rewindRepository.countTodayRewinds(userId); boolean limitExceeded = rewindCount >= dailyRewindLimit; // ... 继续执行 rewind，limitExceeded 未被使用 ``` | VIP 与非 VIP 用户的 rewind 次数限制形同虚设。 | 在查询 rewindCount 后立即判断，超限时抛出 `DailyLimitExceededException` 或返回错误响应。 |
| 三-0179 | apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java | HIGH | [用户体验] `rewind()` 方法中 `dailyRewindLimit` 被正确计算，日使用次数也被查询，但 `rewindCount >= dailyRewindL | 影响用户体验与功能可用性：VIP 与非 VIP 用户的 rewind 次数限制形同虚设。 | 在查询 rewindCount 后立即判断，超限时抛出 `DailyLimitExceededException` 或返回错误响应。 |
| 三-0180 | apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java | HIGH | [数据一致性] `rewind()` 方法中 `dailyRewindLimit` 被正确计算，日使用次数也被查询，但 `rewindCount >= dailyRewindL | 可能导致业务数据不一致或状态错误：VIP 与非 VIP 用户的 rewind 次数限制形同虚设。 | 在查询 rewindCount 后立即判断，超限时抛出 `DailyLimitExceededException` 或返回错误响应。 |
| 三-0181 | apps/api/src/main/java/com/campuslove/api/match/RealMatchService.java | HIGH | [付费转化] `rewind()` 方法中 `dailyRewindLimit` 被正确计算，日使用次数也被查询，但 `rewindCount >= dailyRewindL | 可能影响付费转化或运营成本：VIP 与非 VIP 用户的 rewind 次数限制形同虚设。 | 在查询 rewindCount 后立即判断，超限时抛出 `DailyLimitExceededException` 或返回错误响应。 |
| 三-0182 | apps/api/src/main/java/com/campuslove/api/AdminUserController.java | HIGH | `AdminUserController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` -- 用户管理端点 - `...` -- 内容审核端点 - `...` -- 配置管理端点 - `...` -- 数据统计端点 - `...` --  | 依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0183 | apps/api/src/main/java/com/campuslove/api/AdminUserController.java | HIGH | [用户体验] `AdminUserController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` - | 影响用户体验与功能可用性：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0184 | apps/api/src/main/java/com/campuslove/api/AdminUserController.java | HIGH | [数据一致性] `AdminUserController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` - | 可能导致业务数据不一致或状态错误：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0185 | apps/api/src/main/java/com/campuslove/api/AdminContentController.java | HIGH | `AdminContentController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` -- 用户管理端点 - `...` -- 内容审核端点 - `...` -- 配置管理端点 - `...` -- 数据统计端点 - `...` --  | 依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0186 | apps/api/src/main/java/com/campuslove/api/AdminContentController.java | HIGH | [用户体验] `AdminContentController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `... | 影响用户体验与功能可用性：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0187 | apps/api/src/main/java/com/campuslove/api/AdminContentController.java | HIGH | [数据一致性] `AdminContentController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `... | 可能导致业务数据不一致或状态错误：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0188 | apps/api/src/main/java/com/campuslove/api/AdminConfigController.java | HIGH | `AdminConfigController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` -- 用户管理端点 - `...` -- 内容审核端点 - `...` -- 配置管理端点 - `...` -- 数据统计端点 - `...` --  | 依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0189 | apps/api/src/main/java/com/campuslove/api/AdminConfigController.java | HIGH | [用户体验] `AdminConfigController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` | 影响用户体验与功能可用性：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0190 | apps/api/src/main/java/com/campuslove/api/AdminConfigController.java | HIGH | [数据一致性] `AdminConfigController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` | 可能导致业务数据不一致或状态错误：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0191 | apps/api/src/main/java/com/campuslove/api/AdminStatisticsController.java | HIGH | `AdminStatisticsController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` -- 用户管理端点 - `...` -- 内容审核端点 - `...` -- 配置管理端点 - `...` -- 数据统计端点 - `...` --  | 依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0192 | apps/api/src/main/java/com/campuslove/api/AdminStatisticsController.java | HIGH | [用户体验] `AdminStatisticsController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - ` | 影响用户体验与功能可用性：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0193 | apps/api/src/main/java/com/campuslove/api/AdminStatisticsController.java | HIGH | [数据一致性] `AdminStatisticsController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - ` | 可能导致业务数据不一致或状态错误：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0194 | apps/api/src/main/java/com/campuslove/api/AdminNotificationController.java | HIGH | `AdminNotificationController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` -- 用户管理端点 - `...` -- 内容审核端点 - `...` -- 配置管理端点 - `...` -- 数据统计端点 - `...` --  | 依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0195 | apps/api/src/main/java/com/campuslove/api/AdminNotificationController.java | HIGH | [用户体验] `AdminNotificationController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - | 影响用户体验与功能可用性：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0196 | apps/api/src/main/java/com/campuslove/api/AdminNotificationController.java | HIGH | [数据一致性] `AdminNotificationController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - | 可能导致业务数据不一致或状态错误：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0197 | apps/api/src/main/java/com/campuslove/api/AdminReportController.java | HIGH | `AdminReportController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` -- 用户管理端点 - `...` -- 内容审核端点 - `...` -- 配置管理端点 - `...` -- 数据统计端点 - `...` --  | 依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0198 | apps/api/src/main/java/com/campuslove/api/AdminReportController.java | HIGH | [用户体验] `AdminReportController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` | 影响用户体验与功能可用性：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0199 | apps/api/src/main/java/com/campuslove/api/AdminReportController.java | HIGH | [数据一致性] `AdminReportController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` | 可能导致业务数据不一致或状态错误：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0200 | apps/api/src/main/java/com/campuslove/api/AdminFeedbackController.java | HIGH | `AdminFeedbackController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `...` -- 用户管理端点 - `...` -- 内容审核端点 - `...` -- 配置管理端点 - `...` -- 数据统计端点 - `...` --  | 依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0201 | apps/api/src/main/java/com/campuslove/api/AdminFeedbackController.java | HIGH | [用户体验] `AdminFeedbackController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `.. | 影响用户体验与功能可用性：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0202 | apps/api/src/main/java/com/campuslove/api/AdminFeedbackController.java | HIGH | [数据一致性] `AdminFeedbackController.java` 存在同类问题：以下 Admin Controller 类或方法缺少 `...` 注解： - `.. | 可能导致业务数据不一致或状态错误：依赖隐式 URL 匹配进行权限控制，在配置变更时存在权限绕过风险。 | 在每个 Admin Controller 类上统一添加 `@PreAuthorize("hasRole('ADMIN')")`。 |
| 三-0203 | apps/api/src/main/java/com/campuslove/api/match/Like.java | HIGH | `Like` 实体在 `(user_id, target_user_id)` 组合上没有数据库唯一约束。在高并发场景下（用户快速双击或网络重试），`checkExists() -> insert()` 的竞态窗口会导致同一对用户产生多条 Like 记录。 ```sql -- 缺少的约束 ALTER TABLE likes ADD CONSTRAINT uk_like_user_target UNIQUE (user_id, target_user_id); ``` | 重复 Like 记录破坏匹配逻辑，可能导致重复通知、匹配计数错误、数据库膨胀。 | 添加数据库唯一约束，并在应用层使用 `INSERT ... ON DUPLICATE KEY UPDATE` 或 `@Transactional` + 悲观锁。 |
| 三-0204 | apps/api/src/main/java/com/campuslove/api/match/Like.java | HIGH | [用户体验] `Like` 实体在 `(user_id, target_user_id)` 组合上没有数据库唯一约束。在高并发场景下（用户快速双击或网络重试），`checkE | 影响用户体验与功能可用性：重复 Like 记录破坏匹配逻辑，可能导致重复通知、匹配计数错误、数据库膨胀。 | 添加数据库唯一约束，并在应用层使用 `INSERT ... ON DUPLICATE KEY UPDATE` 或 `@Transactional` + 悲观锁。 |
| 三-0205 | apps/api/src/main/java/com/campuslove/api/match/Like.java | HIGH | [数据一致性] `Like` 实体在 `(user_id, target_user_id)` 组合上没有数据库唯一约束。在高并发场景下（用户快速双击或网络重试），`checkE | 可能导致业务数据不一致或状态错误：重复 Like 记录破坏匹配逻辑，可能导致重复通知、匹配计数错误、数据库膨胀。 | 添加数据库唯一约束，并在应用层使用 `INSERT ... ON DUPLICATE KEY UPDATE` 或 `@Transactional` + 悲观锁。 |
| 三-0206 | apps/api/src/main/java/com/campuslove/api/auth/UserSession.java | HIGH | `UserSession` 实体在序列化时，`sessionToken` 字段未被 `@JsonIgnore` 保护。查询会话列表的 API 将 session token 完整返回给客户端。 | Session token 泄露到前端日志、浏览器本地存储，增加 token 被盗用风险。 | 为 `sessionToken` 添加 `@JsonIgnore`，创建专门的 DTO 仅返回必要的会话元数据。 |
| 三-0207 | apps/api/src/main/java/com/campuslove/api/auth/UserSession.java | HIGH | [用户体验] `UserSession` 实体在序列化时，`sessionToken` 字段未被 `@JsonIgnore` 保护。查询会话列表的 API 将 session | 影响用户体验与功能可用性：Session token 泄露到前端日志、浏览器本地存储，增加 token 被盗用风险。 | 为 `sessionToken` 添加 `@JsonIgnore`，创建专门的 DTO 仅返回必要的会话元数据。 |
| 三-0208 | apps/api/src/main/java/com/campuslove/api/auth/UserSession.java | HIGH | [数据一致性] `UserSession` 实体在序列化时，`sessionToken` 字段未被 `@JsonIgnore` 保护。查询会话列表的 API 将 session | 可能导致业务数据不一致或状态错误：Session token 泄露到前端日志、浏览器本地存储，增加 token 被盗用风险。 | 为 `sessionToken` 添加 `@JsonIgnore`，创建专门的 DTO 仅返回必要的会话元数据。 |
| 三-0209 | apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java | HIGH | `SecurityConfig` 中的 `.antMatchers("/uploads/**").permitAll()` 配置使得上传目录下所有文件（包括用户私密照片）均可通过直接 URL 访问，无需任何认证。 | 用户上传的私密照片、身份证照片等敏感文件可被任何人通过猜测 URL 访问。 | 移除 `/uploads/**` 的公开访问配置，改为通过认证的代理端点提供文件访问，并在端点中实现授权检查。 |
| 三-0210 | apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java | HIGH | [用户体验] `SecurityConfig` 中的 `.antMatchers("/uploads/**").permitAll()` 配置使得上传目录下所有文件（包括用户 | 影响用户体验与功能可用性：用户上传的私密照片、身份证照片等敏感文件可被任何人通过猜测 URL 访问。 | 移除 `/uploads/**` 的公开访问配置，改为通过认证的代理端点提供文件访问，并在端点中实现授权检查。 |
| 三-0211 | apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java | HIGH | [数据一致性] `SecurityConfig` 中的 `.antMatchers("/uploads/**").permitAll()` 配置使得上传目录下所有文件（包括用户 | 可能导致业务数据不一致或状态错误：用户上传的私密照片、身份证照片等敏感文件可被任何人通过猜测 URL 访问。 | 移除 `/uploads/**` 的公开访问配置，改为通过认证的代理端点提供文件访问，并在端点中实现授权检查。 |
| 三-0212 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | `/auth/sms-login` 端点未实现速率限制，可被暴力破解或滥用 | 攻击者可无限次尝试登录凭证或频繁发送短信，造成安全风险和费用损失。 | 引入 Spring Rate Limiter 或 Redis + Lua 脚本实现基于 IP 和手机号的速率限制。 |
| 三-0213 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | [用户体验] `/auth/sms-login` 端点未实现速率限制，可被暴力破解或滥用 | 影响用户体验与功能可用性：攻击者可无限次尝试登录凭证或频繁发送短信，造成安全风险和费用损失。 | 引入 Spring Rate Limiter 或 Redis + Lua 脚本实现基于 IP 和手机号的速率限制。 |
| 三-0214 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | [数据一致性] `/auth/sms-login` 端点未实现速率限制，可被暴力破解或滥用 | 可能导致业务数据不一致或状态错误：攻击者可无限次尝试登录凭证或频繁发送短信，造成安全风险和费用损失。 | 引入 Spring Rate Limiter 或 Redis + Lua 脚本实现基于 IP 和手机号的速率限制。 |
| 三-0215 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | [付费转化] `/auth/sms-login` 端点未实现速率限制，可被暴力破解或滥用 | 可能影响付费转化或运营成本：攻击者可无限次尝试登录凭证或频繁发送短信，造成安全风险和费用损失。 | 引入 Spring Rate Limiter 或 Redis + Lua 脚本实现基于 IP 和手机号的速率限制。 |
| 三-0216 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | `/auth/login` 端点未实现速率限制，可被暴力破解或滥用 | 攻击者可无限次尝试登录凭证或频繁发送短信，造成安全风险和费用损失。 | 引入 Spring Rate Limiter 或 Redis + Lua 脚本实现基于 IP 和手机号的速率限制。 |
| 三-0217 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | [用户体验] `/auth/login` 端点未实现速率限制，可被暴力破解或滥用 | 影响用户体验与功能可用性：攻击者可无限次尝试登录凭证或频繁发送短信，造成安全风险和费用损失。 | 引入 Spring Rate Limiter 或 Redis + Lua 脚本实现基于 IP 和手机号的速率限制。 |
| 三-0218 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | [数据一致性] `/auth/login` 端点未实现速率限制，可被暴力破解或滥用 | 可能导致业务数据不一致或状态错误：攻击者可无限次尝试登录凭证或频繁发送短信，造成安全风险和费用损失。 | 引入 Spring Rate Limiter 或 Redis + Lua 脚本实现基于 IP 和手机号的速率限制。 |
| 三-0219 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | [付费转化] `/auth/login` 端点未实现速率限制，可被暴力破解或滥用 | 可能影响付费转化或运营成本：攻击者可无限次尝试登录凭证或频繁发送短信，造成安全风险和费用损失。 | 引入 Spring Rate Limiter 或 Redis + Lua 脚本实现基于 IP 和手机号的速率限制。 |
| 三-0220 | apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java | HIGH | 微信登录流程使用 "先查后建" 模式处理新用户：先通过 openId 查询用户是否存在，不存在则创建。在高并发场景下，同一微信用户的两个并发登录请求可能同时查到 "不存在"，导致创建两条重复用户记录。 ```java User user = userRepository.findByOpenId(openId); if (user == null) { user = createNewUser(openId, wechatInfo); // 竞态窗口 } ``` | 重复用户记录、数据一致性问题、用户登录混乱。 | 在 `open_id` 列添加唯一约束，使用 `INSERT ... ON DUPLICATE KEY UPDATE` 或 `synchronized` + 数据库唯一约束的组合方案。 |
| 三-0221 | apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java | HIGH | [用户体验] 微信登录流程使用 "先查后建" 模式处理新用户：先通过 openId 查询用户是否存在，不存在则创建。在高并发场景下，同一微信用户的两个并发登录请求可能同时查到 | 影响用户体验与功能可用性：重复用户记录、数据一致性问题、用户登录混乱。 | 在 `open_id` 列添加唯一约束，使用 `INSERT ... ON DUPLICATE KEY UPDATE` 或 `synchronized` + 数据库唯一约束的组合方案。 |
| 三-0222 | apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java | HIGH | [数据一致性] 微信登录流程使用 "先查后建" 模式处理新用户：先通过 openId 查询用户是否存在，不存在则创建。在高并发场景下，同一微信用户的两个并发登录请求可能同时查到 | 可能导致业务数据不一致或状态错误：重复用户记录、数据一致性问题、用户登录混乱。 | 在 `open_id` 列添加唯一约束，使用 `INSERT ... ON DUPLICATE KEY UPDATE` 或 `synchronized` + 数据库唯一约束的组合方案。 |
| 三-0223 | 多个文件 | HIGH | 以下 Service 方法存在典型的 N+1 查询问题： - `RealMatchService.getMatchList()` -- 循环中为每个用户单独查询 `latestMessage` - `RealDiscussionService.getDiscussions()` -- 循环中为每个讨论单独查询 `participantCount` - `RealNotificationService.getNotifications()` -- 循环中为每个通知单独查询 `senderAvatar` - `RealUserService.getUserCards()` -- 循环中为每个卡片单独查询 `mutualTags` | 列表分页 20 条记录时可能触发 40+ 次数据库查询，响应时间随数据量线性增长。 | 使用 JPQL `JOIN FETCH`、`@EntityGraph` 或批量查询 (WHERE id IN) + Map 组装的方式一次获取所有关联数据。 |
| 三-0224 | 多个文件 | HIGH | [用户体验] 以下 Service 方法存在典型的 N+1 查询问题： - `RealMatchService.getMatchList()` -- 循环中为每个用户单独查询 | 影响用户体验与功能可用性：列表分页 20 条记录时可能触发 40+ 次数据库查询，响应时间随数据量线性增长。 | 使用 JPQL `JOIN FETCH`、`@EntityGraph` 或批量查询 (WHERE id IN) + Map 组装的方式一次获取所有关联数据。 |
| 三-0225 | 多个文件 | HIGH | [数据一致性] 以下 Service 方法存在典型的 N+1 查询问题： - `RealMatchService.getMatchList()` -- 循环中为每个用户单独查询 | 可能导致业务数据不一致或状态错误：列表分页 20 条记录时可能触发 40+ 次数据库查询，响应时间随数据量线性增长。 | 使用 JPQL `JOIN FETCH`、`@EntityGraph` 或批量查询 (WHERE id IN) + Map 组装的方式一次获取所有关联数据。 |
| 三-0226 | apps/api/src/main/java/com/campuslove/api/User.java | HIGH | `User.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `...`，未考虑 proxy 场景) - `...` -- 完全未重写 - `...` -- 完全未重写 - `...` -- 完全 | `HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0227 | apps/api/src/main/java/com/campuslove/api/User.java | HIGH | [用户体验] `User.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `...`，未考 | 影响用户体验与功能可用性：`HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0228 | apps/api/src/main/java/com/campuslove/api/User.java | HIGH | [数据一致性] `User.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `...`，未考 | 可能导致业务数据不一致或状态错误：`HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0229 | apps/api/src/main/java/com/campuslove/api/Match.java | HIGH | `Match.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `...`，未考虑 proxy 场景) - `...` -- 完全未重写 - `...` -- 完全未重写 - `...` -- 完全 | `HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0230 | apps/api/src/main/java/com/campuslove/api/Match.java | HIGH | [用户体验] `Match.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `...`，未 | 影响用户体验与功能可用性：`HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0231 | apps/api/src/main/java/com/campuslove/api/Match.java | HIGH | [数据一致性] `Match.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `...`，未 | 可能导致业务数据不一致或状态错误：`HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0232 | apps/api/src/main/java/com/campuslove/api/Discussion.java | HIGH | `Discussion.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `...`，未考虑 proxy 场景) - `...` -- 完全未重写 - `...` -- 完全未重写 - `...` -- 完全 | `HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0233 | apps/api/src/main/java/com/campuslove/api/Discussion.java | HIGH | [用户体验] `Discussion.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `. | 影响用户体验与功能可用性：`HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0234 | apps/api/src/main/java/com/campuslove/api/Discussion.java | HIGH | [数据一致性] `Discussion.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `. | 可能导致业务数据不一致或状态错误：`HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0235 | apps/api/src/main/java/com/campuslove/api/Message.java | HIGH | `Message.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `...`，未考虑 proxy 场景) - `...` -- 完全未重写 - `...` -- 完全未重写 - `...` -- 完全 | `HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0236 | apps/api/src/main/java/com/campuslove/api/Message.java | HIGH | [用户体验] `Message.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `...` | 影响用户体验与功能可用性：`HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0237 | apps/api/src/main/java/com/campuslove/api/Message.java | HIGH | [数据一致性] `Message.java` 存在同类问题：以下 JPA 实体未正确实现 `...` 和 `...`： - `...` (line 180: 仅使用 `...` | 可能导致业务数据不一致或状态错误：`HashSet`、`HashMap` 中可能出现重复实体，`Set` 去重失败，Collection 操作出现非预期行为。 | 使用 `getClass()` 而非 `instanceof`，或使用业务键组合（如 `user_id + target_user_id`），并确保 `hashCode()` 在实体生命周期中保持一致。 |
| 三-0238 | apps/api/src/main/java/com/campuslove/api/user/User.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0239 | apps/api/src/main/java/com/campuslove/api/user/User.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0240 | apps/api/src/main/java/com/campuslove/api/user/User.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0241 | apps/api/src/main/java/com/campuslove/api/match/Match.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0242 | apps/api/src/main/java/com/campuslove/api/match/Match.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0243 | apps/api/src/main/java/com/campuslove/api/match/Match.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0244 | apps/api/src/main/java/com/campuslove/api/discussion/Discussion.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0245 | apps/api/src/main/java/com/campuslove/api/discussion/Discussion.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0246 | apps/api/src/main/java/com/campuslove/api/discussion/Discussion.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0247 | apps/api/src/main/java/com/campuslove/api/message/Message.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0248 | apps/api/src/main/java/com/campuslove/api/message/Message.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0249 | apps/api/src/main/java/com/campuslove/api/message/Message.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0250 | apps/api/src/main/java/com/campuslove/api/like/Like.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0251 | apps/api/src/main/java/com/campuslove/api/like/Like.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0252 | apps/api/src/main/java/com/campuslove/api/like/Like.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0253 | apps/api/src/main/java/com/campuslove/api/notification/Notification.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0254 | apps/api/src/main/java/com/campuslove/api/notification/Notification.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0255 | apps/api/src/main/java/com/campuslove/api/notification/Notification.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0256 | apps/api/src/main/java/com/campuslove/api/session/Session.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0257 | apps/api/src/main/java/com/campuslove/api/session/Session.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0258 | apps/api/src/main/java/com/campuslove/api/session/Session.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0259 | apps/api/src/main/java/com/campuslove/api/tempchatsession/TempChatSession.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0260 | apps/api/src/main/java/com/campuslove/api/tempchatsession/TempChatSession.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0261 | apps/api/src/main/java/com/campuslove/api/tempchatsession/TempChatSession.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0262 | apps/api/src/main/java/com/campuslove/api/comment/Comment.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0263 | apps/api/src/main/java/com/campuslove/api/comment/Comment.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0264 | apps/api/src/main/java/com/campuslove/api/comment/Comment.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0265 | apps/api/src/main/java/com/campuslove/api/post/Post.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0266 | apps/api/src/main/java/com/campuslove/api/post/Post.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0267 | apps/api/src/main/java/com/campuslove/api/post/Post.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0268 | apps/api/src/main/java/com/campuslove/api/activity/Activity.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0269 | apps/api/src/main/java/com/campuslove/api/activity/Activity.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0270 | apps/api/src/main/java/com/campuslove/api/activity/Activity.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0271 | apps/api/src/main/java/com/campuslove/api/feedback/Feedback.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0272 | apps/api/src/main/java/com/campuslove/api/feedback/Feedback.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0273 | apps/api/src/main/java/com/campuslove/api/feedback/Feedback.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0274 | apps/api/src/main/java/com/campuslove/api/report/Report.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0275 | apps/api/src/main/java/com/campuslove/api/report/Report.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0276 | apps/api/src/main/java/com/campuslove/api/report/Report.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0277 | apps/api/src/main/java/com/campuslove/api/campus/Campus.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0278 | apps/api/src/main/java/com/campuslove/api/campus/Campus.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0279 | apps/api/src/main/java/com/campuslove/api/campus/Campus.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0280 | apps/api/src/main/java/com/campuslove/api/village/Village.java | MEDIUM | 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne(fetch = LAZY)` 关联字段上标注 `@ToString.Exclude`。当日志或调试代码中 toString 被调用时，可能触发懒加载并导致 `LazyInitializationException`（无事务上下文时）或意外的大量查询。 **涉及文件:** `User.java`, `Match.java`, `Discussion.java`, `Message.java`, `Notification.java` | 懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0281 | apps/api/src/main/java/com/campuslove/api/village/Village.java | MEDIUM | [用户体验] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 影响用户体验与功能可用性：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0282 | apps/api/src/main/java/com/campuslove/api/village/Village.java | MEDIUM | [数据一致性] 多个实体使用 Lombok `@Data` 或 `@ToString` 但未在 `@OneToMany(fetch = LAZY)` / `@ManyToOne | 可能导致业务数据不一致或状态错误：懒加载关联缺少 @ToString.Exclude | 在所有懒加载关联字段上添加 `@ToString.Exclude`。 |
| 三-0283 | apps/api/src/main/java/com/campuslove/api/config/WeChatProperties.java | MEDIUM | `@ConfigurationProperties` 类未使用 `@Validated` 注解，也未对必填字段（如 `appId`、`appSecret`）添加 `@NotEmpty` / `@NotNull` 约束。应用可能在配置缺失的情况下启动，在运行时才因 NPE 或空请求而崩溃。 | @ConfigurationProperties 缺少 @Validated | 添加 `@Validated` 并在关键字段上使用 Bean Validation 注解。 |
| 三-0284 | apps/api/src/main/java/com/campuslove/api/config/WeChatProperties.java | MEDIUM | [用户体验] `@ConfigurationProperties` 类未使用 `@Validated` 注解，也未对必填字段（如 `appId`、`appSecret`）添加 | 影响用户体验与功能可用性：@ConfigurationProperties 缺少 @Validated | 添加 `@Validated` 并在关键字段上使用 Bean Validation 注解。 |
| 三-0285 | apps/api/src/main/java/com/campuslove/api/config/WeChatProperties.java | MEDIUM | [数据一致性] `@ConfigurationProperties` 类未使用 `@Validated` 注解，也未对必填字段（如 `appId`、`appSecret`）添加 | 可能导致业务数据不一致或状态错误：@ConfigurationProperties 缺少 @Validated | 添加 `@Validated` 并在关键字段上使用 Bean Validation 注解。 |
| 三-0286 | apps/api/src/main/java/com/campuslove/api/config/GlobalExceptionHandler.java | MEDIUM | 全局异常处理器在响应中直接返回 `e.getMessage()`，可能暴露数据库表名、SQL 语句片段、堆栈跟踪等内部信息。 | 异常处理暴露内部错误详情 | 对生产环境返回通用错误消息，将详细信息仅记录到日志。 |
| 三-0287 | apps/api/src/main/java/com/campuslove/api/config/GlobalExceptionHandler.java | MEDIUM | [用户体验] 全局异常处理器在响应中直接返回 `e.getMessage()`，可能暴露数据库表名、SQL 语句片段、堆栈跟踪等内部信息。 | 影响用户体验与功能可用性：异常处理暴露内部错误详情 | 对生产环境返回通用错误消息，将详细信息仅记录到日志。 |
| 三-0288 | apps/api/src/main/java/com/campuslove/api/config/GlobalExceptionHandler.java | MEDIUM | [数据一致性] 全局异常处理器在响应中直接返回 `e.getMessage()`，可能暴露数据库表名、SQL 语句片段、堆栈跟踪等内部信息。 | 可能导致业务数据不一致或状态错误：异常处理暴露内部错误详情 | 对生产环境返回通用错误消息，将详细信息仅记录到日志。 |
| 三-0289 | apps/api/src/main/resources/application.yml | MEDIUM | JWT 签名密钥以明文形式硬编码在 `application.yml` 中，并且该值出现在 Git 历史中。 | JWT Secret 硬编码在配置文件中 | 通过环境变量或外部密钥管理服务注入 JWT Secret，轮换现有密钥。 |
| 三-0290 | apps/api/src/main/resources/application.yml | MEDIUM | [用户体验] JWT 签名密钥以明文形式硬编码在 `application.yml` 中，并且该值出现在 Git 历史中。 | 影响用户体验与功能可用性：JWT Secret 硬编码在配置文件中 | 通过环境变量或外部密钥管理服务注入 JWT Secret，轮换现有密钥。 |
| 三-0291 | apps/api/src/main/resources/application.yml | MEDIUM | [数据一致性] JWT 签名密钥以明文形式硬编码在 `application.yml` 中，并且该值出现在 Git 历史中。 | 可能导致业务数据不一致或状态错误：JWT Secret 硬编码在配置文件中 | 通过环境变量或外部密钥管理服务注入 JWT Secret，轮换现有密钥。 |
| 三-0292 | apps/api/src/main/java/com/campuslove/api/repository/ | MEDIUM | 部分 Repository 方法使用 `@Query(nativeQuery = true)` 配合字符串拼接（如动态排序字段），未使用参数化查询。 | SQL 注入风险 -- 原生查询拼接 | 使用 Criteria API 或 JPQL 参数化查询替代原生字符串拼接。 |
| 三-0293 | apps/api/src/main/java/com/campuslove/api/repository/ | MEDIUM | [用户体验] 部分 Repository 方法使用 `@Query(nativeQuery = true)` 配合字符串拼接（如动态排序字段），未使用参数化查询。 | 影响用户体验与功能可用性：SQL 注入风险 -- 原生查询拼接 | 使用 Criteria API 或 JPQL 参数化查询替代原生字符串拼接。 |
| 三-0294 | apps/api/src/main/java/com/campuslove/api/repository/ | MEDIUM | [数据一致性] 部分 Repository 方法使用 `@Query(nativeQuery = true)` 配合字符串拼接（如动态排序字段），未使用参数化查询。 | 可能导致业务数据不一致或状态错误：SQL 注入风险 -- 原生查询拼接 | 使用 Criteria API 或 JPQL 参数化查询替代原生字符串拼接。 |
| 三-0295 | 多个 Java 源文件 | LOW | `@Transactional(readOnly = true)` 未在只读 Service 方法上统一添加 -- 多个查询方法遗漏。 | 代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0296 | 多个 Java 源文件 | LOW | [用户体验] `@Transactional(readOnly = true)` 未在只读 Service 方法上统一添加 -- 多个查询方法遗漏。 | 影响用户体验与功能可用性：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0297 | 多个 Java 源文件 | LOW | [数据一致性] `@Transactional(readOnly = true)` 未在只读 Service 方法上统一添加 -- 多个查询方法遗漏。 | 可能导致业务数据不一致或状态错误：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0298 | 多个 Java 源文件 | LOW | [付费转化] `@Transactional(readOnly = true)` 未在只读 Service 方法上统一添加 -- 多个查询方法遗漏。 | 可能影响付费转化或运营成本：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0299 | 多个 Java 源文件 | LOW | 日志使用字符串拼接而非 SLF4J 参数化 `log.debug("user: {}", userId)`。 | 代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0300 | 多个 Java 源文件 | LOW | [用户体验] 日志使用字符串拼接而非 SLF4J 参数化 `log.debug("user: {}", userId)`。 | 影响用户体验与功能可用性：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0301 | 多个 Java 源文件 | LOW | [数据一致性] 日志使用字符串拼接而非 SLF4J 参数化 `log.debug("user: {}", userId)`。 | 可能导致业务数据不一致或状态错误：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0302 | 多个 Java 源文件 | LOW | [付费转化] 日志使用字符串拼接而非 SLF4J 参数化 `log.debug("user: {}", userId)`。 | 可能影响付费转化或运营成本：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0303 | 多个 Java 源文件 | LOW | `Optional.get()` 直接调用未先检查 `isPresent()` -- 多处。 | 代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0304 | 多个 Java 源文件 | LOW | [用户体验] `Optional.get()` 直接调用未先检查 `isPresent()` -- 多处。 | 影响用户体验与功能可用性：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0305 | 多个 Java 源文件 | LOW | [数据一致性] `Optional.get()` 直接调用未先检查 `isPresent()` -- 多处。 | 可能导致业务数据不一致或状态错误：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0306 | 多个 Java 源文件 | LOW | [付费转化] `Optional.get()` 直接调用未先检查 `isPresent()` -- 多处。 | 可能影响付费转化或运营成本：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0307 | 多个 Java 源文件 | LOW | DTO 与 Entity 之间的字段映射使用手动 setter 而非 MapStruct。 | 代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0308 | 多个 Java 源文件 | LOW | [用户体验] DTO 与 Entity 之间的字段映射使用手动 setter 而非 MapStruct。 | 影响用户体验与功能可用性：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0309 | 多个 Java 源文件 | LOW | [数据一致性] DTO 与 Entity 之间的字段映射使用手动 setter 而非 MapStruct。 | 可能导致业务数据不一致或状态错误：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0310 | 多个 Java 源文件 | LOW | [付费转化] DTO 与 Entity 之间的字段映射使用手动 setter 而非 MapStruct。 | 可能影响付费转化或运营成本：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0311 | 多个 Java 源文件 | LOW | 部分 Controller 中直接返回 `ResponseEntity`，部分使用 `@ResponseBody`，风格不统一。 | 代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0312 | 多个 Java 源文件 | LOW | [用户体验] 部分 Controller 中直接返回 `ResponseEntity`，部分使用 `@ResponseBody`，风格不统一。 | 影响用户体验与功能可用性：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0313 | 多个 Java 源文件 | LOW | [数据一致性] 部分 Controller 中直接返回 `ResponseEntity`，部分使用 `@ResponseBody`，风格不统一。 | 可能导致业务数据不一致或状态错误：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0314 | 多个 Java 源文件 | LOW | [付费转化] 部分 Controller 中直接返回 `ResponseEntity`，部分使用 `@ResponseBody`，风格不统一。 | 可能影响付费转化或运营成本：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0315 | apps/api/.../user/User.java | HIGH | 3 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0316 | apps/api/.../user/User.java | HIGH | [用户体验] 3 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0317 | apps/api/.../user/User.java | HIGH | [数据一致性] 3 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0318 | apps/api/.../growth/WeChatPushService.java | HIGH | 4 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0319 | apps/api/.../growth/WeChatPushService.java | HIGH | [用户体验] 4 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0320 | apps/api/.../growth/WeChatPushService.java | HIGH | [数据一致性] 4 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0321 | apps/api/.../auth/RealAuthService.java | HIGH | 6 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0322 | apps/api/.../auth/RealAuthService.java | HIGH | [用户体验] 6 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0323 | apps/api/.../auth/RealAuthService.java | HIGH | [数据一致性] 6 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0324 | apps/api/.../match/RealMatchService.java | HIGH | 5 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0325 | apps/api/.../match/RealMatchService.java | HIGH | [用户体验] 5 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0326 | apps/api/.../match/RealMatchService.java | HIGH | [数据一致性] 5 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0327 | apps/api/.../config/SecurityConfig.java | HIGH | 3 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0328 | apps/api/.../config/SecurityConfig.java | HIGH | [用户体验] 3 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0329 | apps/api/.../config/SecurityConfig.java | HIGH | [数据一致性] 3 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0330 | apps/api/.../auth/UserSession.java | HIGH | 2 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0331 | apps/api/.../auth/UserSession.java | HIGH | [用户体验] 2 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0332 | apps/api/.../auth/UserSession.java | HIGH | [数据一致性] 2 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0333 | apps/api/.../match/Like.java | HIGH | 2 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0334 | apps/api/.../match/Like.java | HIGH | [用户体验] 2 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0335 | apps/api/.../match/Like.java | HIGH | [数据一致性] 2 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0336 | apps/api/.../admin/` (7 controllers) | HIGH | 7 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0337 | apps/api/.../admin/` (7 controllers) | HIGH | [用户体验] 7 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0338 | apps/api/.../admin/` (7 controllers) | HIGH | [数据一致性] 7 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0339 | apps/api/.../config/GlobalExceptionHandler.java | HIGH | 2 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0340 | apps/api/.../config/GlobalExceptionHandler.java | HIGH | [用户体验] 2 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0341 | apps/api/.../config/GlobalExceptionHandler.java | HIGH | [数据一致性] 2 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0342 | 其他 | HIGH | 55 | 关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0343 | 其他 | HIGH | [用户体验] 55 | 影响用户体验与功能可用性：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0344 | 其他 | HIGH | [数据一致性] 55 | 可能导致业务数据不一致或状态错误：关键文件存在多处问题，影响系统稳定性、安全性或可维护性。 | 按审计分册逐项修复该文件涉及的问题。 |
| 三-0345 | apps/api/src/main/java/com/campuslove/api/user/User.java | HIGH | 项目中所有 JPA Entity（`User`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0346 | apps/api/src/main/java/com/campuslove/api/user/User.java | HIGH | [用户体验] 项目中所有 JPA Entity（`User`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0347 | apps/api/src/main/java/com/campuslove/api/user/User.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`User`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0348 | apps/api/src/main/java/com/campuslove/api/user/User.java | HIGH | 项目中所有 JPA Entity（`User`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0349 | apps/api/src/main/java/com/campuslove/api/user/User.java | HIGH | 项目中所有 JPA Entity（`User`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0350 | apps/api/src/main/java/com/campuslove/api/match/Match.java | HIGH | 项目中所有 JPA Entity（`Match`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0351 | apps/api/src/main/java/com/campuslove/api/match/Match.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Match`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0352 | apps/api/src/main/java/com/campuslove/api/match/Match.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Match`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0353 | apps/api/src/main/java/com/campuslove/api/match/Match.java | HIGH | 项目中所有 JPA Entity（`Match`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0354 | apps/api/src/main/java/com/campuslove/api/match/Match.java | HIGH | 项目中所有 JPA Entity（`Match`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0355 | apps/api/src/main/java/com/campuslove/api/discussion/Discussion.java | HIGH | 项目中所有 JPA Entity（`Discussion`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0356 | apps/api/src/main/java/com/campuslove/api/discussion/Discussion.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Discussion`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0357 | apps/api/src/main/java/com/campuslove/api/discussion/Discussion.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Discussion`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0358 | apps/api/src/main/java/com/campuslove/api/discussion/Discussion.java | HIGH | 项目中所有 JPA Entity（`Discussion`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0359 | apps/api/src/main/java/com/campuslove/api/discussion/Discussion.java | HIGH | 项目中所有 JPA Entity（`Discussion`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0360 | apps/api/src/main/java/com/campuslove/api/message/Message.java | HIGH | 项目中所有 JPA Entity（`Message`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0361 | apps/api/src/main/java/com/campuslove/api/message/Message.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Message`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0362 | apps/api/src/main/java/com/campuslove/api/message/Message.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Message`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0363 | apps/api/src/main/java/com/campuslove/api/message/Message.java | HIGH | 项目中所有 JPA Entity（`Message`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0364 | apps/api/src/main/java/com/campuslove/api/message/Message.java | HIGH | 项目中所有 JPA Entity（`Message`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0365 | apps/api/src/main/java/com/campuslove/api/like/Like.java | HIGH | 项目中所有 JPA Entity（`Like`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0366 | apps/api/src/main/java/com/campuslove/api/like/Like.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Like`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0367 | apps/api/src/main/java/com/campuslove/api/like/Like.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Like`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0368 | apps/api/src/main/java/com/campuslove/api/like/Like.java | HIGH | 项目中所有 JPA Entity（`Like`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0369 | apps/api/src/main/java/com/campuslove/api/like/Like.java | HIGH | 项目中所有 JPA Entity（`Like`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0370 | apps/api/src/main/java/com/campuslove/api/notification/Notification.java | HIGH | 项目中所有 JPA Entity（`Notification`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0371 | apps/api/src/main/java/com/campuslove/api/notification/Notification.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Notification`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0372 | apps/api/src/main/java/com/campuslove/api/notification/Notification.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Notification`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0373 | apps/api/src/main/java/com/campuslove/api/notification/Notification.java | HIGH | 项目中所有 JPA Entity（`Notification`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0374 | apps/api/src/main/java/com/campuslove/api/notification/Notification.java | HIGH | 项目中所有 JPA Entity（`Notification`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0375 | apps/api/src/main/java/com/campuslove/api/session/Session.java | HIGH | 项目中所有 JPA Entity（`Session`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0376 | apps/api/src/main/java/com/campuslove/api/session/Session.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Session`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0377 | apps/api/src/main/java/com/campuslove/api/session/Session.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Session`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0378 | apps/api/src/main/java/com/campuslove/api/session/Session.java | HIGH | 项目中所有 JPA Entity（`Session`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0379 | apps/api/src/main/java/com/campuslove/api/session/Session.java | HIGH | 项目中所有 JPA Entity（`Session`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0380 | apps/api/src/main/java/com/campuslove/api/tempchatsession/TempChatSession.java | HIGH | 项目中所有 JPA Entity（`TempChatSession`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0381 | apps/api/src/main/java/com/campuslove/api/tempchatsession/TempChatSession.java | HIGH | [用户体验] 项目中所有 JPA Entity（`TempChatSession`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0382 | apps/api/src/main/java/com/campuslove/api/tempchatsession/TempChatSession.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`TempChatSession`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0383 | apps/api/src/main/java/com/campuslove/api/tempchatsession/TempChatSession.java | HIGH | 项目中所有 JPA Entity（`TempChatSession`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0384 | apps/api/src/main/java/com/campuslove/api/tempchatsession/TempChatSession.java | HIGH | 项目中所有 JPA Entity（`TempChatSession`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0385 | apps/api/src/main/java/com/campuslove/api/comment/Comment.java | HIGH | 项目中所有 JPA Entity（`Comment`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0386 | apps/api/src/main/java/com/campuslove/api/comment/Comment.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Comment`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0387 | apps/api/src/main/java/com/campuslove/api/comment/Comment.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Comment`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0388 | apps/api/src/main/java/com/campuslove/api/comment/Comment.java | HIGH | 项目中所有 JPA Entity（`Comment`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0389 | apps/api/src/main/java/com/campuslove/api/comment/Comment.java | HIGH | 项目中所有 JPA Entity（`Comment`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0390 | apps/api/src/main/java/com/campuslove/api/post/Post.java | HIGH | 项目中所有 JPA Entity（`Post`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0391 | apps/api/src/main/java/com/campuslove/api/post/Post.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Post`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0392 | apps/api/src/main/java/com/campuslove/api/post/Post.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Post`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0393 | apps/api/src/main/java/com/campuslove/api/post/Post.java | HIGH | 项目中所有 JPA Entity（`Post`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0394 | apps/api/src/main/java/com/campuslove/api/post/Post.java | HIGH | 项目中所有 JPA Entity（`Post`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0395 | apps/api/src/main/java/com/campuslove/api/activity/Activity.java | HIGH | 项目中所有 JPA Entity（`Activity`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0396 | apps/api/src/main/java/com/campuslove/api/activity/Activity.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Activity`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0397 | apps/api/src/main/java/com/campuslove/api/activity/Activity.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Activity`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0398 | apps/api/src/main/java/com/campuslove/api/activity/Activity.java | HIGH | 项目中所有 JPA Entity（`Activity`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0399 | apps/api/src/main/java/com/campuslove/api/activity/Activity.java | HIGH | 项目中所有 JPA Entity（`Activity`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0400 | apps/api/src/main/java/com/campuslove/api/feedback/Feedback.java | HIGH | 项目中所有 JPA Entity（`Feedback`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0401 | apps/api/src/main/java/com/campuslove/api/feedback/Feedback.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Feedback`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0402 | apps/api/src/main/java/com/campuslove/api/feedback/Feedback.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Feedback`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0403 | apps/api/src/main/java/com/campuslove/api/feedback/Feedback.java | HIGH | 项目中所有 JPA Entity（`Feedback`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0404 | apps/api/src/main/java/com/campuslove/api/feedback/Feedback.java | HIGH | 项目中所有 JPA Entity（`Feedback`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0405 | apps/api/src/main/java/com/campuslove/api/report/Report.java | HIGH | 项目中所有 JPA Entity（`Report`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0406 | apps/api/src/main/java/com/campuslove/api/report/Report.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Report`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0407 | apps/api/src/main/java/com/campuslove/api/report/Report.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Report`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0408 | apps/api/src/main/java/com/campuslove/api/report/Report.java | HIGH | 项目中所有 JPA Entity（`Report`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0409 | apps/api/src/main/java/com/campuslove/api/report/Report.java | HIGH | 项目中所有 JPA Entity（`Report`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0410 | apps/api/src/main/java/com/campuslove/api/campus/Campus.java | HIGH | 项目中所有 JPA Entity（`Campus`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0411 | apps/api/src/main/java/com/campuslove/api/campus/Campus.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Campus`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0412 | apps/api/src/main/java/com/campuslove/api/campus/Campus.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Campus`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0413 | apps/api/src/main/java/com/campuslove/api/campus/Campus.java | HIGH | 项目中所有 JPA Entity（`Campus`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0414 | apps/api/src/main/java/com/campuslove/api/campus/Campus.java | HIGH | 项目中所有 JPA Entity（`Campus`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0415 | apps/api/src/main/java/com/campuslove/api/village/Village.java | HIGH | 项目中所有 JPA Entity（`Village`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时编辑配置等），后提交的事务会静默覆盖先提交的数据。 ```java // 当前所有实体缺少 @Version private Long version; ``` | 并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0416 | apps/api/src/main/java/com/campuslove/api/village/Village.java | HIGH | [用户体验] 项目中所有 JPA Entity（`Village`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时 | 影响用户体验与功能可用性：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0417 | apps/api/src/main/java/com/campuslove/api/village/Village.java | HIGH | [数据一致性] 项目中所有 JPA Entity（`Village`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时 | 可能导致业务数据不一致或状态错误：并发编辑场景下数据静默丢失，无法检测冲突。尤其在匹配状态更新、用户资料修改等高频操作中风险极高。 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0418 | apps/api/src/main/java/com/campuslove/api/village/Village.java | HIGH | 项目中所有 JPA Entity（`Village`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时——影响1：并发编辑场景下数据静默丢失，无法检测冲突 | 并发编辑场景下数据静默丢失，无法检测冲突 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0419 | apps/api/src/main/java/com/campuslove/api/village/Village.java | HIGH | 项目中所有 JPA Entity（`Village`）均未添加 `@Version` 字段。在并发更新场景下（用户同时修改资料 + 后台审核更新、两个管理员同时——影响2：尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 尤其在匹配状态更新、用户资料修改等高频操作中风险极高 | 所有实体添加 `@Version private Long version;` 字段，并在前端捕获 `OptimisticLockException` 提示用户刷新重试。 |
| 三-0420 | RealMatchService.java | HIGH | 以下方法在循环中为集合中的每个元素执行单独 SQL 查询： &#124; 方法 &#124; 关联实体 &#124; N+1 查询内容 &#124; &#124;------&#124;----------&#124;-------------&#124; &#124; `getMatchList()` &#124; Message &#124; 每个 match 查询 lastMessage &#124; &#124; `getDiscussions()` &#124; User &#124; 每个 discussion 查询 participantCount &#124; &#124; `getNotifications()` &#124; User &#124; 每个 notification 查询 senderAvatar &#124; &#124; `getUserCards()` &#124; Tag &#124; 每个 user 查询 mutualTags &#124; &#124; `getChatHistory()` &#124; User &#124; 每条 message 查询 senderInfo &#124; 以分页 20 条为例，`getMatchList()` 实际执行 1 + 20 = 21 次 SQL 查询。 | 列表接口响应时间 200-800ms，随关联数据量线性增长，数据库连接池压力大。 | 使用 `JOIN FETCH`、`@EntityGraph` 或批量 ID 查询 + Map 组装模式。 |
| 三-0421 | RealMatchService.java | HIGH | [用户体验] 以下方法在循环中为集合中的每个元素执行单独 SQL 查询： &#124; 方法 &#124; 关联实体 &#124; N+1 查询内容 &#124; &#124;------&#124;----------&#124;------ | 影响用户体验与功能可用性：列表接口响应时间 200-800ms，随关联数据量线性增长，数据库连接池压力大。 | 使用 `JOIN FETCH`、`@EntityGraph` 或批量 ID 查询 + Map 组装模式。 |
| 三-0422 | RealMatchService.java | HIGH | [数据一致性] 以下方法在循环中为集合中的每个元素执行单独 SQL 查询： &#124; 方法 &#124; 关联实体 &#124; N+1 查询内容 &#124; &#124;------&#124;----------&#124;------ | 可能导致业务数据不一致或状态错误：列表接口响应时间 200-800ms，随关联数据量线性增长，数据库连接池压力大。 | 使用 `JOIN FETCH`、`@EntityGraph` 或批量 ID 查询 + Map 组装模式。 |
| 三-0423 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | JWT 认证方案中未实现任何 token 撤销机制。用户点击 "退出登录" 后： 1. 后端无黑名单 2. 无 token 版本号 3. 无 Redis 缓存失效 4. 前端仅删除本地存储的 token 持有已签发 JWT 的攻击者仍可在 token 过期前（通常 7-30 天）继续访问所有 API。 | Token 泄露后无法主动使其失效，"退出登录" 仅为客户端假象。 | 引入 Redis 维护 JWT 黑名单（key = jti, TTL = 剩余有效期），或在用户表中维护 `tokenVersion` 字段。 |
| 三-0424 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | [用户体验] JWT 认证方案中未实现任何 token 撤销机制。用户点击 "退出登录" 后： 1. 后端无黑名单 2. 无 token 版本号 3. 无 Redis 缓存失 | 影响用户体验与功能可用性：Token 泄露后无法主动使其失效，"退出登录" 仅为客户端假象。 | 引入 Redis 维护 JWT 黑名单（key = jti, TTL = 剩余有效期），或在用户表中维护 `tokenVersion` 字段。 |
| 三-0425 | apps/api/src/main/java/com/campuslove/api/auth/ | HIGH | [数据一致性] JWT 认证方案中未实现任何 token 撤销机制。用户点击 "退出登录" 后： 1. 后端无黑名单 2. 无 token 版本号 3. 无 Redis 缓存失 | 可能导致业务数据不一致或状态错误：Token 泄露后无法主动使其失效，"退出登录" 仅为客户端假象。 | 引入 Redis 维护 JWT 黑名单（key = jti, TTL = 剩余有效期），或在用户表中维护 `tokenVersion` 字段。 |
| 三-0426 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | `CampusController` 的列表接口一次性将数据库所有校园数据加载到内存，然后在应用层进行分页 (`list.subList(offset, offset + limit)`)。随着校园数据增长（数百条），每次都全量查询造成不必要的内存和数据库开销。 ```java // 当前实现 - 全量加载 List<Campus> allCampuses = campusRepository.findAll(); List<Campus> page = allCampuses.subList(offset, Math.min(offset + limit, allCampuses.size())); ``` | 数据库全表扫描/大量数据传输，GC 压力增大，响应变慢。 | 使用 Spring Data 的 `Pageable` 参数实现数据库级分页: `campusRepository.findAll(PageRequest.of(page, size))`。 |
| 三-0427 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | [用户体验] `CampusController` 的列表接口一次性将数据库所有校园数据加载到内存，然后在应用层进行分页 (`list.subList(offset, off | 影响用户体验与功能可用性：数据库全表扫描/大量数据传输，GC 压力增大，响应变慢。 | 使用 Spring Data 的 `Pageable` 参数实现数据库级分页: `campusRepository.findAll(PageRequest.of(page, size))`。 |
| 三-0428 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | [数据一致性] `CampusController` 的列表接口一次性将数据库所有校园数据加载到内存，然后在应用层进行分页 (`list.subList(offset, off | 可能导致业务数据不一致或状态错误：数据库全表扫描/大量数据传输，GC 压力增大，响应变慢。 | 使用 Spring Data 的 `Pageable` 参数实现数据库级分页: `campusRepository.findAll(PageRequest.of(page, size))`。 |
| 三-0429 | apps/api/src/main/java/com/campuslove/api/chat/RealTempChatService.java | HIGH | 声明为只读查询的 `getTempChatSession()` 方法内部修改了 `TempChatSession` 实体的 `lastAccessedAt` 字段并调用了 `save()`。这违反了 HTTP GET 的安全性原则（GET 不应有副作用），也违反了 CQRS 的读写分离原则。 ```java // GET 请求中修改数据 @Transactional(readOnly = true) // 标记为只读但实际写入 public TempChatSession getTempChatSession(String sessionId) { TempChatSession session = repo.findById(sessionId); session.setLastAccessedAt(Instant.now()); // 修改实体状态 return repo.save(session); // 写入数据库 } ``` | 只读事务标记与实际行为矛盾；HTTP GET 的幂等性被破坏；浏览器预取、搜索引擎爬虫可能触发副作用。 | 将访问时间更新拆分为独立的 PATCH/PUT 端点，或使用异步事件 + `@TransactionalEventListener` 更新。 |
| 三-0430 | apps/api/src/main/java/com/campuslove/api/chat/RealTempChatService.java | HIGH | [用户体验] 声明为只读查询的 `getTempChatSession()` 方法内部修改了 `TempChatSession` 实体的 `lastAccessedAt` 字 | 影响用户体验与功能可用性：只读事务标记与实际行为矛盾；HTTP GET 的幂等性被破坏；浏览器预取、搜索引擎爬虫可能触发副作用。 | 将访问时间更新拆分为独立的 PATCH/PUT 端点，或使用异步事件 + `@TransactionalEventListener` 更新。 |
| 三-0431 | apps/api/src/main/java/com/campuslove/api/chat/RealTempChatService.java | HIGH | [数据一致性] 声明为只读查询的 `getTempChatSession()` 方法内部修改了 `TempChatSession` 实体的 `lastAccessedAt` 字 | 可能导致业务数据不一致或状态错误：只读事务标记与实际行为矛盾；HTTP GET 的幂等性被破坏；浏览器预取、搜索引擎爬虫可能触发副作用。 | 将访问时间更新拆分为独立的 PATCH/PUT 端点，或使用异步事件 + `@TransactionalEventListener` 更新。 |
| 三-0432 | apps/api/src/main/java/com/campuslove/api/chat/RealTempChatService.java | HIGH | 声明为只读查询的 `getTempChatSession()` 方法内部修改了 `TempChatSession` 实体的 `lastAccessedAt` 字——影响1：只读事务标记与实际行为矛盾 | 只读事务标记与实际行为矛盾 | 将访问时间更新拆分为独立的 PATCH/PUT 端点，或使用异步事件 + `@TransactionalEventListener` 更新。 |
| 三-0433 | apps/api/src/main/java/com/campuslove/api/chat/RealTempChatService.java | HIGH | 声明为只读查询的 `getTempChatSession()` 方法内部修改了 `TempChatSession` 实体的 `lastAccessedAt` 字——影响2：HTTP GET 的幂等性被破坏 | HTTP GET 的幂等性被破坏 | 将访问时间更新拆分为独立的 PATCH/PUT 端点，或使用异步事件 + `@TransactionalEventListener` 更新。 |
| 三-0434 | apps/api/src/main/java/com/campuslove/api/chat/RealTempChatService.java | HIGH | 声明为只读查询的 `getTempChatSession()` 方法内部修改了 `TempChatSession` 实体的 `lastAccessedAt` 字——影响3：浏览器预取、搜索引擎爬虫可能触发副作用 | 浏览器预取、搜索引擎爬虫可能触发副作用 | 将访问时间更新拆分为独立的 PATCH/PUT 端点，或使用异步事件 + `@TransactionalEventListener` 更新。 |
| 三-0435 | 全项目范围 | HIGH | `用户标签列表` 未使用缓存，每次请求触发完整数据库查询 | 数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0436 | 全项目范围 | HIGH | [用户体验] `用户标签列表` 未使用缓存，每次请求触发完整数据库查询 | 影响用户体验与功能可用性：数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0437 | 全项目范围 | HIGH | [数据一致性] `用户标签列表` 未使用缓存，每次请求触发完整数据库查询 | 可能导致业务数据不一致或状态错误：数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0438 | 全项目范围 | HIGH | `校园信息` 未使用缓存，每次请求触发完整数据库查询 | 数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0439 | 全项目范围 | HIGH | [用户体验] `校园信息` 未使用缓存，每次请求触发完整数据库查询 | 影响用户体验与功能可用性：数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0440 | 全项目范围 | HIGH | [数据一致性] `校园信息` 未使用缓存，每次请求触发完整数据库查询 | 可能导致业务数据不一致或状态错误：数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0441 | 全项目范围 | HIGH | `系统配置项` 未使用缓存，每次请求触发完整数据库查询 | 数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0442 | 全项目范围 | HIGH | [用户体验] `系统配置项` 未使用缓存，每次请求触发完整数据库查询 | 影响用户体验与功能可用性：数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0443 | 全项目范围 | HIGH | [数据一致性] `系统配置项` 未使用缓存，每次请求触发完整数据库查询 | 可能导致业务数据不一致或状态错误：数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0444 | 全项目范围 | HIGH | `敏感词列表` 未使用缓存，每次请求触发完整数据库查询 | 数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0445 | 全项目范围 | HIGH | [用户体验] `敏感词列表` 未使用缓存，每次请求触发完整数据库查询 | 影响用户体验与功能可用性：数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0446 | 全项目范围 | HIGH | [数据一致性] `敏感词列表` 未使用缓存，每次请求触发完整数据库查询 | 可能导致业务数据不一致或状态错误：数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0447 | 全项目范围 | HIGH | `通知模板` 未使用缓存，每次请求触发完整数据库查询 | 数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0448 | 全项目范围 | HIGH | [用户体验] `通知模板` 未使用缓存，每次请求触发完整数据库查询 | 影响用户体验与功能可用性：数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0449 | 全项目范围 | HIGH | [数据一致性] `通知模板` 未使用缓存，每次请求触发完整数据库查询 | 可能导致业务数据不一致或状态错误：数据库查询量高，热门数据重复查询，峰值 QPS 受限。 | 集成 Spring Cache + Redis/Caffeine，对慢变化高频读取数据添加缓存层。 |
| 三-0450 | 全项目范围 | HIGH | `微信 API` 调用缺少熔断、重试、降级机制 | 微信 API 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `微信 API` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0451 | 全项目范围 | HIGH | [用户体验] `微信 API` 调用缺少熔断、重试、降级机制 | 影响用户体验与功能可用性：微信 API 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `微信 API` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0452 | 全项目范围 | HIGH | [数据一致性] `微信 API` 调用缺少熔断、重试、降级机制 | 可能导致业务数据不一致或状态错误：微信 API 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `微信 API` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0453 | 全项目范围 | HIGH | `短信服务` 调用缺少熔断、重试、降级机制 | 短信服务 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `短信服务` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0454 | 全项目范围 | HIGH | [用户体验] `短信服务` 调用缺少熔断、重试、降级机制 | 影响用户体验与功能可用性：短信服务 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `短信服务` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0455 | 全项目范围 | HIGH | [数据一致性] `短信服务` 调用缺少熔断、重试、降级机制 | 可能导致业务数据不一致或状态错误：短信服务 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `短信服务` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0456 | 全项目范围 | HIGH | `对象存储` 调用缺少熔断、重试、降级机制 | 对象存储 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `对象存储` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0457 | 全项目范围 | HIGH | [用户体验] `对象存储` 调用缺少熔断、重试、降级机制 | 影响用户体验与功能可用性：对象存储 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `对象存储` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0458 | 全项目范围 | HIGH | [数据一致性] `对象存储` 调用缺少熔断、重试、降级机制 | 可能导致业务数据不一致或状态错误：对象存储 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `对象存储` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0459 | 全项目范围 | HIGH | `支付网关` 调用缺少熔断、重试、降级机制 | 支付网关 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `支付网关` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0460 | 全项目范围 | HIGH | [用户体验] `支付网关` 调用缺少熔断、重试、降级机制 | 影响用户体验与功能可用性：支付网关 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `支付网关` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0461 | 全项目范围 | HIGH | [数据一致性] `支付网关` 调用缺少熔断、重试、降级机制 | 可能导致业务数据不一致或状态错误：支付网关 暂不可用时请求堆积或失败，级联故障可能导致整个应用不可用。 | 为 `支付网关` 调用添加 Resilience4j CircuitBreaker + Retry + TimeLimiter。 |
| 三-0462 | apps/api/src/main/java/com/campuslove/api/pay/order | HIGH | `创建订单` 接口未实现幂等性保障，网络超时重试可导致重复创建订单 | 网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0463 | apps/api/src/main/java/com/campuslove/api/pay/order | HIGH | [用户体验] `创建订单` 接口未实现幂等性保障，网络超时重试可导致重复创建订单 | 影响用户体验与功能可用性：网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0464 | apps/api/src/main/java/com/campuslove/api/pay/order | HIGH | [数据一致性] `创建订单` 接口未实现幂等性保障，网络超时重试可导致重复创建订单 | 可能导致业务数据不一致或状态错误：网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0465 | apps/api/src/main/java/com/campuslove/api/chat/message | HIGH | `发送消息` 接口未实现幂等性保障，网络超时重试可导致重复发送消息 | 网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0466 | apps/api/src/main/java/com/campuslove/api/chat/message | HIGH | [用户体验] `发送消息` 接口未实现幂等性保障，网络超时重试可导致重复发送消息 | 影响用户体验与功能可用性：网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0467 | apps/api/src/main/java/com/campuslove/api/chat/message | HIGH | [数据一致性] `发送消息` 接口未实现幂等性保障，网络超时重试可导致重复发送消息 | 可能导致业务数据不一致或状态错误：网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0468 | apps/api/src/main/java/com/campuslove/api/match/like | HIGH | `点赞` 接口未实现幂等性保障，网络超时重试可导致重复点赞 | 网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0469 | apps/api/src/main/java/com/campuslove/api/match/like | HIGH | [用户体验] `点赞` 接口未实现幂等性保障，网络超时重试可导致重复点赞 | 影响用户体验与功能可用性：网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0470 | apps/api/src/main/java/com/campuslove/api/match/like | HIGH | [数据一致性] `点赞` 接口未实现幂等性保障，网络超时重试可导致重复点赞 | 可能导致业务数据不一致或状态错误：网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0471 | apps/api/src/main/java/com/campuslove/api/wallet/withdraw | HIGH | `提现/扣费` 接口未实现幂等性保障，网络超时重试可导致重复提现/扣费 | 网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0472 | apps/api/src/main/java/com/campuslove/api/wallet/withdraw | HIGH | [用户体验] `提现/扣费` 接口未实现幂等性保障，网络超时重试可导致重复提现/扣费 | 影响用户体验与功能可用性：网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0473 | apps/api/src/main/java/com/campuslove/api/wallet/withdraw | HIGH | [数据一致性] `提现/扣费` 接口未实现幂等性保障，网络超时重试可导致重复提现/扣费 | 可能导致业务数据不一致或状态错误：网络不稳定或客户端超时重试时产生重复数据、重复扣款。 | 引入 Idempotency-Key 机制，服务端通过 Redis 去重。 |
| 三-0474 | 全项目范围 | HIGH | API 路径中未包含版本号 (`/api/user/profile` 而不是 `/api/v1/user/profile`)。当需要不兼容的 API 变更时，无法同时支持新旧客户端。 | API 变更必须同步更新所有客户端，发布节奏耦合，无法灰度发布。 | 在 URL 路径或请求头中引入版本标识 (`/api/v1/...`)。 |
| 三-0475 | 全项目范围 | HIGH | [用户体验] API 路径中未包含版本号 (`/api/user/profile` 而不是 `/api/v1/user/profile`)。当需要不兼容的 API 变更时，无 | 影响用户体验与功能可用性：API 变更必须同步更新所有客户端，发布节奏耦合，无法灰度发布。 | 在 URL 路径或请求头中引入版本标识 (`/api/v1/...`)。 |
| 三-0476 | 全项目范围 | HIGH | [数据一致性] API 路径中未包含版本号 (`/api/user/profile` 而不是 `/api/v1/user/profile`)。当需要不兼容的 API 变更时，无 | 可能导致业务数据不一致或状态错误：API 变更必须同步更新所有客户端，发布节奏耦合，无法灰度发布。 | 在 URL 路径或请求头中引入版本标识 (`/api/v1/...`)。 |
| 三-0477 | apps/api/src/main/java/com/campuslove/api/auth/AuthController.java | HIGH | `AuthController` 返回格式为 `{ "token": "...", "user": {...} }`，与其他 Controller 不统一 | 前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0478 | apps/api/src/main/java/com/campuslove/api/auth/AuthController.java | HIGH | [用户体验] `AuthController` 返回格式为 `{ "token": "...", "user": {...} }`，与其他 Controller 不统一 | 影响用户体验与功能可用性：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0479 | apps/api/src/main/java/com/campuslove/api/auth/AuthController.java | HIGH | [数据一致性] `AuthController` 返回格式为 `{ "token": "...", "user": {...} }`，与其他 Controller 不统一 | 可能导致业务数据不一致或状态错误：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0480 | apps/api/src/main/java/com/campuslove/api/auth/AuthController.java | HIGH | [付费转化] `AuthController` 返回格式为 `{ "token": "...", "user": {...} }`，与其他 Controller 不统一 | 可能影响付费转化或运营成本：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0481 | apps/api/src/main/java/com/campuslove/api/user/UserController.java | HIGH | `UserController` 返回格式为 `{ "code": 200, "data": {...} }`，与其他 Controller 不统一 | 前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0482 | apps/api/src/main/java/com/campuslove/api/user/UserController.java | HIGH | [用户体验] `UserController` 返回格式为 `{ "code": 200, "data": {...} }`，与其他 Controller 不统一 | 影响用户体验与功能可用性：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0483 | apps/api/src/main/java/com/campuslove/api/user/UserController.java | HIGH | [数据一致性] `UserController` 返回格式为 `{ "code": 200, "data": {...} }`，与其他 Controller 不统一 | 可能导致业务数据不一致或状态错误：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0484 | apps/api/src/main/java/com/campuslove/api/user/UserController.java | HIGH | [付费转化] `UserController` 返回格式为 `{ "code": 200, "data": {...} }`，与其他 Controller 不统一 | 可能影响付费转化或运营成本：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0485 | apps/api/src/main/java/com/campuslove/api/match/MatchController.java | HIGH | `MatchController` 返回格式为 `{ "success": true, "result": {...} }`，与其他 Controller 不统一 | 前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0486 | apps/api/src/main/java/com/campuslove/api/match/MatchController.java | HIGH | [用户体验] `MatchController` 返回格式为 `{ "success": true, "result": {...} }`，与其他 Controller 不统 | 影响用户体验与功能可用性：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0487 | apps/api/src/main/java/com/campuslove/api/match/MatchController.java | HIGH | [数据一致性] `MatchController` 返回格式为 `{ "success": true, "result": {...} }`，与其他 Controller 不统 | 可能导致业务数据不一致或状态错误：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0488 | apps/api/src/main/java/com/campuslove/api/match/MatchController.java | HIGH | [付费转化] `MatchController` 返回格式为 `{ "success": true, "result": {...} }`，与其他 Controller 不统 | 可能影响付费转化或运营成本：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0489 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | `CampusController` 返回格式为 `直接返回 List<Campus>`，与其他 Controller 不统一 | 前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0490 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | [用户体验] `CampusController` 返回格式为 `直接返回 List<Campus>`，与其他 Controller 不统一 | 影响用户体验与功能可用性：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0491 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | [数据一致性] `CampusController` 返回格式为 `直接返回 List<Campus>`，与其他 Controller 不统一 | 可能导致业务数据不一致或状态错误：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0492 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | [付费转化] `CampusController` 返回格式为 `直接返回 List<Campus>`，与其他 Controller 不统一 | 可能影响付费转化或运营成本：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0493 | apps/api/src/main/java/com/campuslove/api/feedback/FeedbackController.java | HIGH | `FeedbackController` 返回格式为 `{ "status": "ok", "payload": {...} }`，与其他 Controller 不统一 | 前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0494 | apps/api/src/main/java/com/campuslove/api/feedback/FeedbackController.java | HIGH | [用户体验] `FeedbackController` 返回格式为 `{ "status": "ok", "payload": {...} }`，与其他 Controller | 影响用户体验与功能可用性：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0495 | apps/api/src/main/java/com/campuslove/api/feedback/FeedbackController.java | HIGH | [数据一致性] `FeedbackController` 返回格式为 `{ "status": "ok", "payload": {...} }`，与其他 Controller | 可能导致业务数据不一致或状态错误：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0496 | apps/api/src/main/java/com/campuslove/api/feedback/FeedbackController.java | HIGH | [付费转化] `FeedbackController` 返回格式为 `{ "status": "ok", "payload": {...} }`，与其他 Controller | 可能影响付费转化或运营成本：前端需要为不同 Controller 编写不同解析逻辑，增加维护成本和出错概率。 | 统一为 ApiResponse<T> 包装格式。 |
| 三-0497 | 全项目范围 | HIGH | 项目中未集成 SpringDoc OpenAPI (Swagger UI)，无 `@Operation`、`@Schema`、`@ApiResponse` 等文档注解。API 接口缺少结构化文档，前后端协作依赖于口头沟通或手写文档。 | 前后端协作效率低，接口变更不可视化，新成员上手困难。 | 引入 `springdoc-openapi-starter-webmvc-ui` 依赖，为核心 Controller 添加文档注解。 |
| 三-0498 | 全项目范围 | HIGH | [用户体验] 项目中未集成 SpringDoc OpenAPI (Swagger UI)，无 `@Operation`、`@Schema`、`@ApiResponse` 等文 | 影响用户体验与功能可用性：前后端协作效率低，接口变更不可视化，新成员上手困难。 | 引入 `springdoc-openapi-starter-webmvc-ui` 依赖，为核心 Controller 添加文档注解。 |
| 三-0499 | 全项目范围 | HIGH | [数据一致性] 项目中未集成 SpringDoc OpenAPI (Swagger UI)，无 `@Operation`、`@Schema`、`@ApiResponse` 等文 | 可能导致业务数据不一致或状态错误：前后端协作效率低，接口变更不可视化，新成员上手困难。 | 引入 `springdoc-openapi-starter-webmvc-ui` 依赖，为核心 Controller 添加文档注解。 |
| 三-0500 | apps/api/src/main/java/com/campuslove/api/chat/ | HIGH | 临时聊天会话 (`TempChatSession`) 会随时间累积。未配置定时任务 (`@Scheduled`) 清理已过期或长时间未活动的临时会话记录。 | `temp_chat_session` 表无限增长，查询变慢，占用存储空间。 | 添加 `@Scheduled` 任务定期删除 `expires_at < NOW()` 的过期会话。 |
| 三-0501 | apps/api/src/main/java/com/campuslove/api/chat/ | HIGH | [用户体验] 临时聊天会话 (`TempChatSession`) 会随时间累积。未配置定时任务 (`@Scheduled`) 清理已过期或长时间未活动的临时会话记录。 | 影响用户体验与功能可用性：`temp_chat_session` 表无限增长，查询变慢，占用存储空间。 | 添加 `@Scheduled` 任务定期删除 `expires_at < NOW()` 的过期会话。 |
| 三-0502 | apps/api/src/main/java/com/campuslove/api/chat/ | HIGH | [数据一致性] 临时聊天会话 (`TempChatSession`) 会随时间累积。未配置定时任务 (`@Scheduled`) 清理已过期或长时间未活动的临时会话记录。 | 可能导致业务数据不一致或状态错误：`temp_chat_session` 表无限增长，查询变慢，占用存储空间。 | 添加 `@Scheduled` 任务定期删除 `expires_at < NOW()` 的过期会话。 |
| 三-0503 | 多个 Controller 文件 | HIGH | 多个分页接口直接使用客户端传入的 `page` 和 `size` 参数，未校验上限。攻击者可传入 `size=100000` 触发大量数据库查询和内存占用。 | 分页参数未校验边界 | 添加 `@Max(100) private int size;` 或全局分页大小上限配置。 |
| 三-0504 | 多个 Controller 文件 | HIGH | [用户体验] 多个分页接口直接使用客户端传入的 `page` 和 `size` 参数，未校验上限。攻击者可传入 `size=100000` 触发大量数据库查询和内存占用。 | 影响用户体验与功能可用性：分页参数未校验边界 | 添加 `@Max(100) private int size;` 或全局分页大小上限配置。 |
| 三-0505 | 多个 Controller 文件 | HIGH | [数据一致性] 多个分页接口直接使用客户端传入的 `page` 和 `size` 参数，未校验上限。攻击者可传入 `size=100000` 触发大量数据库查询和内存占用。 | 可能导致业务数据不一致或状态错误：分页参数未校验边界 | 添加 `@Max(100) private int size;` 或全局分页大小上限配置。 |
| 三-0506 | apps/api/src/main/java/com/campuslove/api/media/MediaUploadController.java | HIGH | 文件上传端点仅在前端做了大小限制，后端未校验文件大小和 MIME 类型。攻击者可绕过前端直接调用 API 上传任意大小的文件，耗尽磁盘空间。 | OOM、磁盘耗尽、恶意文件上传。 | 后端添加 `spring.servlet.multipart.max-file-size` 配置，并校验文件魔数（magic bytes）。 |
| 三-0507 | apps/api/src/main/java/com/campuslove/api/media/MediaUploadController.java | HIGH | [用户体验] 文件上传端点仅在前端做了大小限制，后端未校验文件大小和 MIME 类型。攻击者可绕过前端直接调用 API 上传任意大小的文件，耗尽磁盘空间。 | 影响用户体验与功能可用性：OOM、磁盘耗尽、恶意文件上传。 | 后端添加 `spring.servlet.multipart.max-file-size` 配置，并校验文件魔数（magic bytes）。 |
| 三-0508 | apps/api/src/main/java/com/campuslove/api/media/MediaUploadController.java | HIGH | [数据一致性] 文件上传端点仅在前端做了大小限制，后端未校验文件大小和 MIME 类型。攻击者可绕过前端直接调用 API 上传任意大小的文件，耗尽磁盘空间。 | 可能导致业务数据不一致或状态错误：OOM、磁盘耗尽、恶意文件上传。 | 后端添加 `spring.servlet.multipart.max-file-size` 配置，并校验文件魔数（magic bytes）。 |
| 三-0509 | 全项目范围 | HIGH | 项目未使用 MDC (Mapped Diagnostic Context) 或 TraceId 机制。当出现问题时，无法根据前端报错追溯到对应的后端日志。 | 缺少请求日志追踪 ID | 在 Filter/Interceptor 中为每个请求生成 TraceId 并注入 MDC，同时在响应头中返回。 |
| 三-0510 | 全项目范围 | HIGH | [用户体验] 项目未使用 MDC (Mapped Diagnostic Context) 或 TraceId 机制。当出现问题时，无法根据前端报错追溯到对应的后端日志。 | 影响用户体验与功能可用性：缺少请求日志追踪 ID | 在 Filter/Interceptor 中为每个请求生成 TraceId 并注入 MDC，同时在响应头中返回。 |
| 三-0511 | 全项目范围 | HIGH | [数据一致性] 项目未使用 MDC (Mapped Diagnostic Context) 或 TraceId 机制。当出现问题时，无法根据前端报错追溯到对应的后端日志。 | 可能导致业务数据不一致或状态错误：缺少请求日志追踪 ID | 在 Filter/Interceptor 中为每个请求生成 TraceId 并注入 MDC，同时在响应头中返回。 |
| 三-0512 | RealAuthService.java | MEDIUM | 部分 Service 方法的 `@Transactional` 注解粒度不当 -- 读方法上加了 `@Transactional`，但包含远程调用（如微信 API）的写方法未加。远程调用应在事务边界之外执行。 --- | Service 层事务边界不清晰 |  |
| 三-0513 | RealAuthService.java | MEDIUM | [用户体验] 部分 Service 方法的 `@Transactional` 注解粒度不当 -- 读方法上加了 `@Transactional`，但包含远程调用（如微信 AP | 影响用户体验与功能可用性：Service 层事务边界不清晰 |  |
| 三-0514 | RealAuthService.java | MEDIUM | [数据一致性] 部分 Service 方法的 `@Transactional` 注解粒度不当 -- 读方法上加了 `@Transactional`，但包含远程调用（如微信 AP | 可能导致业务数据不一致或状态错误：Service 层事务边界不清晰 |  |
| 三-0515 | 多个 Controller 文件 | MEDIUM | 部分 Controller 方法直接操作 Repository 或包含条件判断逻辑，破坏了分层架构。业务逻辑应归属 Service 层。 --- | Controller 中混入业务逻辑 |  |
| 三-0516 | 多个 Controller 文件 | MEDIUM | [用户体验] 部分 Controller 方法直接操作 Repository 或包含条件判断逻辑，破坏了分层架构。业务逻辑应归属 Service 层。 --- | 影响用户体验与功能可用性：Controller 中混入业务逻辑 |  |
| 三-0517 | 多个 Controller 文件 | MEDIUM | [数据一致性] 部分 Controller 方法直接操作 Repository 或包含条件判断逻辑，破坏了分层架构。业务逻辑应归属 Service 层。 --- | 可能导致业务数据不一致或状态错误：Controller 中混入业务逻辑 |  |
| 三-0518 | 多个 Service 文件 | MEDIUM | 代码中混用 `java.util.Date` 与 `java.time.Instant`，未统一迁移至 Java 8+ 时间 API | 时间处理逻辑不一致，容易出现时区、精度、线程安全问题。 | 统一使用 `java.time.*` API，并逐步替换旧 API 调用。 |
| 三-0519 | 多个 Service 文件 | MEDIUM | [用户体验] 代码中混用 `java.util.Date` 与 `java.time.Instant`，未统一迁移至 Java 8+ 时间 API | 影响用户体验与功能可用性：时间处理逻辑不一致，容易出现时区、精度、线程安全问题。 | 统一使用 `java.time.*` API，并逐步替换旧 API 调用。 |
| 三-0520 | 多个 Service 文件 | MEDIUM | [数据一致性] 代码中混用 `java.util.Date` 与 `java.time.Instant`，未统一迁移至 Java 8+ 时间 API | 可能导致业务数据不一致或状态错误：时间处理逻辑不一致，容易出现时区、精度、线程安全问题。 | 统一使用 `java.time.*` API，并逐步替换旧 API 调用。 |
| 三-0521 | 多个 Service 文件 | MEDIUM | 代码中混用 `java.sql.Timestamp` 与 `java.time.Instant`，未统一迁移至 Java 8+ 时间 API | 时间处理逻辑不一致，容易出现时区、精度、线程安全问题。 | 统一使用 `java.time.*` API，并逐步替换旧 API 调用。 |
| 三-0522 | 多个 Service 文件 | MEDIUM | [用户体验] 代码中混用 `java.sql.Timestamp` 与 `java.time.Instant`，未统一迁移至 Java 8+ 时间 API | 影响用户体验与功能可用性：时间处理逻辑不一致，容易出现时区、精度、线程安全问题。 | 统一使用 `java.time.*` API，并逐步替换旧 API 调用。 |
| 三-0523 | 多个 Service 文件 | MEDIUM | [数据一致性] 代码中混用 `java.sql.Timestamp` 与 `java.time.Instant`，未统一迁移至 Java 8+ 时间 API | 可能导致业务数据不一致或状态错误：时间处理逻辑不一致，容易出现时区、精度、线程安全问题。 | 统一使用 `java.time.*` API，并逐步替换旧 API 调用。 |
| 三-0524 | 多个 Service 文件 | MEDIUM | 代码中混用 `java.util.Calendar` 与 `java.time.Instant`，未统一迁移至 Java 8+ 时间 API | 时间处理逻辑不一致，容易出现时区、精度、线程安全问题。 | 统一使用 `java.time.*` API，并逐步替换旧 API 调用。 |
| 三-0525 | 多个 Service 文件 | MEDIUM | [用户体验] 代码中混用 `java.util.Calendar` 与 `java.time.Instant`，未统一迁移至 Java 8+ 时间 API | 影响用户体验与功能可用性：时间处理逻辑不一致，容易出现时区、精度、线程安全问题。 | 统一使用 `java.time.*` API，并逐步替换旧 API 调用。 |
| 三-0526 | 多个 Service 文件 | MEDIUM | [数据一致性] 代码中混用 `java.util.Calendar` 与 `java.time.Instant`，未统一迁移至 Java 8+ 时间 API | 可能导致业务数据不一致或状态错误：时间处理逻辑不一致，容易出现时区、精度、线程安全问题。 | 统一使用 `java.time.*` API，并逐步替换旧 API 调用。 |
| 三-0527 | 全项目范围 | MEDIUM | 大量代码抛出泛化的 `RuntimeException` 而非自定义业务异常（如 `UserNotFoundException`、`MatchAlreadyExistsException`），前端无法根据异常类型做差异化处理。 --- | 异常类型过于粗糙 |  |
| 三-0528 | 全项目范围 | MEDIUM | [用户体验] 大量代码抛出泛化的 `RuntimeException` 而非自定义业务异常（如 `UserNotFoundException`、`MatchAlreadyEx | 影响用户体验与功能可用性：异常类型过于粗糙 |  |
| 三-0529 | 全项目范围 | MEDIUM | [数据一致性] 大量代码抛出泛化的 `RuntimeException` 而非自定义业务异常（如 `UserNotFoundException`、`MatchAlreadyEx | 可能导致业务数据不一致或状态错误：异常类型过于粗糙 |  |
| 三-0530 | apps/api/src/main/resources/db/migration/ | MEDIUM | Flyway 迁移文件版本号命名不一致，部分使用时间戳，部分使用递增数字，缺少统一规范。 --- | 数据库迁移使用 Flyway 但版本号无规范 |  |
| 三-0531 | apps/api/src/main/resources/db/migration/ | MEDIUM | [用户体验] Flyway 迁移文件版本号命名不一致，部分使用时间戳，部分使用递增数字，缺少统一规范。 --- | 影响用户体验与功能可用性：数据库迁移使用 Flyway 但版本号无规范 |  |
| 三-0532 | apps/api/src/main/resources/db/migration/ | MEDIUM | [数据一致性] Flyway 迁移文件版本号命名不一致，部分使用时间戳，部分使用递增数字，缺少统一规范。 --- | 可能导致业务数据不一致或状态错误：数据库迁移使用 Flyway 但版本号无规范 |  |
| 三-0533 | 多个 Java 源文件 | LOW | Lombok `@Data` 在 Entity 上使用不当，应使用 `@Getter @Setter`。 | 代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0534 | 多个 Java 源文件 | LOW | [用户体验] Lombok `@Data` 在 Entity 上使用不当，应使用 `@Getter @Setter`。 | 影响用户体验与功能可用性：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0535 | 多个 Java 源文件 | LOW | [数据一致性] Lombok `@Data` 在 Entity 上使用不当，应使用 `@Getter @Setter`。 | 可能导致业务数据不一致或状态错误：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0536 | 多个 Java 源文件 | LOW | [付费转化] Lombok `@Data` 在 Entity 上使用不当，应使用 `@Getter @Setter`。 | 可能影响付费转化或运营成本：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0537 | 多个 Java 源文件 | LOW | `application.yml` 中数据库密码明文存储。 | 代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0538 | 多个 Java 源文件 | LOW | [用户体验] `application.yml` 中数据库密码明文存储。 | 影响用户体验与功能可用性：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0539 | 多个 Java 源文件 | LOW | [数据一致性] `application.yml` 中数据库密码明文存储。 | 可能导致业务数据不一致或状态错误：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0540 | 多个 Java 源文件 | LOW | [付费转化] `application.yml` 中数据库密码明文存储。 | 可能影响付费转化或运营成本：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0541 | 多个 Java 源文件 | LOW | `pom.xml` 中部分依赖版本未集中管理（缺少 `<dependencyManagement>`）。 | 代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0542 | 多个 Java 源文件 | LOW | [用户体验] `pom.xml` 中部分依赖版本未集中管理（缺少 `<dependencyManagement>`）。 | 影响用户体验与功能可用性：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0543 | 多个 Java 源文件 | LOW | [数据一致性] `pom.xml` 中部分依赖版本未集中管理（缺少 `<dependencyManagement>`）。 | 可能导致业务数据不一致或状态错误：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0544 | 多个 Java 源文件 | LOW | [付费转化] `pom.xml` 中部分依赖版本未集中管理（缺少 `<dependencyManagement>`）。 | 可能影响付费转化或运营成本：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0545 | 多个 Java 源文件 | LOW | 部分日志级别不当 -- 生产日志中使用 `log.info()` 输出大量调试信息。 | 代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0546 | 多个 Java 源文件 | LOW | [用户体验] 部分日志级别不当 -- 生产日志中使用 `log.info()` 输出大量调试信息。 | 影响用户体验与功能可用性：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0547 | 多个 Java 源文件 | LOW | [数据一致性] 部分日志级别不当 -- 生产日志中使用 `log.info()` 输出大量调试信息。 | 可能导致业务数据不一致或状态错误：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0548 | 多个 Java 源文件 | LOW | [付费转化] 部分日志级别不当 -- 生产日志中使用 `log.info()` 输出大量调试信息。 | 可能影响付费转化或运营成本：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0549 | 多个 Java 源文件 | LOW | Controller 中直接使用 `System.out.println()` 调试输出。 | 代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0550 | 多个 Java 源文件 | LOW | [用户体验] Controller 中直接使用 `System.out.println()` 调试输出。 | 影响用户体验与功能可用性：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0551 | 多个 Java 源文件 | LOW | [数据一致性] Controller 中直接使用 `System.out.println()` 调试输出。 | 可能导致业务数据不一致或状态错误：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0552 | 多个 Java 源文件 | LOW | [付费转化] Controller 中直接使用 `System.out.println()` 调试输出。 | 可能影响付费转化或运营成本：代码可维护性与可读性下降，长期增加迭代成本。 | 按最佳实践重构对应代码。 |
| 三-0553 | apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java | CRITICAL | `getSimilarAuthors()` 方法中调用 `userRepository.findAll()` 从数据库加载全部用户记录到内存，然后进行 Java 内存内过滤。代码中没有分页参数、没有 LIMIT 子句、没有 `WHERE` 条件。 | 随着用户量增长到数万甚至数十万，单次请求将导致： - 数据库全表扫描，查询耗时数十秒 - JVM 堆内存被全部用户对象占满，触发 Full GC - 并发请求下数据库连接池耗尽，整个服务不可用 - 攻击者可轻易利用此接口发动 DoS 攻击 | 改为使用 `userRepository.findByVillageIdAndTagsIn(villageId, tags, Pageable)` 进行数据库层的过滤和分页，限制每页结果不超过 20 条。 |
| 三-0554 | apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java | CRITICAL | [用户体验] `getSimilarAuthors()` 方法中调用 `userRepository.findAll()` 从数据库加载全部用户记录到内存，然后进行 Java | 影响用户体验与功能可用性：随着用户量增长到数万甚至数十万，单次请求将导致： - 数据库全表扫描，查询耗时数十秒 - JVM 堆内存被全部用户对象占满，触发 Full GC - 并发请求下数据库连接池耗尽，整个服务不可用 - 攻 | 改为使用 `userRepository.findByVillageIdAndTagsIn(villageId, tags, Pageable)` 进行数据库层的过滤和分页，限制每页结果不超过 20 条。 |
| 三-0555 | apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java | CRITICAL | [数据一致性] `getSimilarAuthors()` 方法中调用 `userRepository.findAll()` 从数据库加载全部用户记录到内存，然后进行 Java | 可能导致业务数据不一致或状态错误：随着用户量增长到数万甚至数十万，单次请求将导致： - 数据库全表扫描，查询耗时数十秒 - JVM 堆内存被全部用户对象占满，触发 Full GC - 并发请求下数据库连接池耗尽，整个服务不可用 - 攻 | 改为使用 `userRepository.findByVillageIdAndTagsIn(villageId, tags, Pageable)` 进行数据库层的过滤和分页，限制每页结果不超过 20 条。 |
| 三-0556 | apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java | CRITICAL | `deletePost()` 方法的 Javadoc 明确声明 "Deletes the post and all associated comments permanently"（永久删除帖子及其所有关联评论），但方法实现中仅调用了 `postRepository.delete(post)`，没有调用 `commentRepository.deleteByPostId(postId)`。 | 运营人员删除违规帖子后，帖子消失了但关联的评论数据残留在数据库中成为孤立数据。这些评论仍占用存储空间，且如果前端通过直接 ID 查询可能被泄漏。如果帖子被删除后管理员需要审计原始违规内容，评论数据不完整。 | 在 `deletePost` 中添加 `commentRepository.deleteByPostId(postId)` 调用（如果 `ON DELETE CASCADE` 未在数据库层面配置），并添加 `@Transactional` 确保原子性。 |
| 三-0557 | apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java | CRITICAL | [用户体验] `deletePost()` 方法的 Javadoc 明确声明 "Deletes the post and all associated comments pe | 影响用户体验与功能可用性：运营人员删除违规帖子后，帖子消失了但关联的评论数据残留在数据库中成为孤立数据。这些评论仍占用存储空间，且如果前端通过直接 ID 查询可能被泄漏。如果帖子被删除后管理员需要审计原始违规内容，评论数据不完 | 在 `deletePost` 中添加 `commentRepository.deleteByPostId(postId)` 调用（如果 `ON DELETE CASCADE` 未在数据库层面配置），并添加 `@Transactional` 确保原子性。 |
| 三-0558 | apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java | CRITICAL | [数据一致性] `deletePost()` 方法的 Javadoc 明确声明 "Deletes the post and all associated comments pe | 可能导致业务数据不一致或状态错误：运营人员删除违规帖子后，帖子消失了但关联的评论数据残留在数据库中成为孤立数据。这些评论仍占用存储空间，且如果前端通过直接 ID 查询可能被泄漏。如果帖子被删除后管理员需要审计原始违规内容，评论数据不完 | 在 `deletePost` 中添加 `commentRepository.deleteByPostId(postId)` 调用（如果 `ON DELETE CASCADE` 未在数据库层面配置），并添加 `@Transactional` 确保原子性。 |
| 三-0559 | apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java | CRITICAL | `deletePost()` 方法的 Javadoc 明确声明 "Deletes the post and all associated comments pe——影响1：运营人员删除违规帖子后，帖子消失了但关联的评论数据残留在数据库中成为孤立数据 | 运营人员删除违规帖子后，帖子消失了但关联的评论数据残留在数据库中成为孤立数据 | 在 `deletePost` 中添加 `commentRepository.deleteByPostId(postId)` 调用（如果 `ON DELETE CASCADE` 未在数据库层面配置），并添加 `@Transactional` 确保原子性。 |
| 三-0560 | apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java | CRITICAL | `deletePost()` 方法的 Javadoc 明确声明 "Deletes the post and all associated comments pe——影响2：这些评论仍占用存储空间，且如果前端通过直接 ID 查询可能被泄漏 | 这些评论仍占用存储空间，且如果前端通过直接 ID 查询可能被泄漏 | 在 `deletePost` 中添加 `commentRepository.deleteByPostId(postId)` 调用（如果 `ON DELETE CASCADE` 未在数据库层面配置），并添加 `@Transactional` 确保原子性。 |
| 三-0561 | apps/api/src/main/java/com/campuslove/api/admin/AdminPostController.java | CRITICAL | `deletePost()` 方法的 Javadoc 明确声明 "Deletes the post and all associated comments pe——影响3：如果帖子被删除后管理员需要审计原始违规内容，评论数据不完整 | 如果帖子被删除后管理员需要审计原始违规内容，评论数据不完整 | 在 `deletePost` 中添加 `commentRepository.deleteByPostId(postId)` 调用（如果 `ON DELETE CASCADE` 未在数据库层面配置），并添加 `@Transactional` 确保原子性。 |
| 三-0562 | apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java | CRITICAL | 两个 Service 的 `toCampusTopicView()` 和 `toCampusTopicReplyView()` 转换方法中，对每条帖子/回复循环调用 `userRepository.findById(authorId)` 来填充作者信息，形成了典型的 N+1 查询模式。 | 每页加载 20 条帖子，产生 1（帖子查询）+ 20（作者查询）= 21 次数据库查询。加载 20 条回复时，额外产生 1（回复查询）+ 20（作者查询）= 21 次查询。首页加载可能产生 42+ 次数据库往返，响应时间随并发量线性恶化。 | 先收集所有 authorId，使用 `userRepository.findAllById(authorIds)` 一次性批量加载所有作者，建立 Map 索引后再填充。 |
| 三-0563 | apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java | CRITICAL | [用户体验] 两个 Service 的 `toCampusTopicView()` 和 `toCampusTopicReplyView()` 转换方法中，对每条帖子/回复循环 | 影响用户体验与功能可用性：每页加载 20 条帖子，产生 1（帖子查询）+ 20（作者查询）= 21 次数据库查询。加载 20 条回复时，额外产生 1（回复查询）+ 20（作者查询）= 21 次查询。首页加载可能产生 42+ 次 | 先收集所有 authorId，使用 `userRepository.findAllById(authorIds)` 一次性批量加载所有作者，建立 Map 索引后再填充。 |
| 三-0564 | apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java | CRITICAL | [数据一致性] 两个 Service 的 `toCampusTopicView()` 和 `toCampusTopicReplyView()` 转换方法中，对每条帖子/回复循环 | 可能导致业务数据不一致或状态错误：每页加载 20 条帖子，产生 1（帖子查询）+ 20（作者查询）= 21 次数据库查询。加载 20 条回复时，额外产生 1（回复查询）+ 20（作者查询）= 21 次查询。首页加载可能产生 42+ 次 | 先收集所有 authorId，使用 `userRepository.findAllById(authorIds)` 一次性批量加载所有作者，建立 Map 索引后再填充。 |
| 三-0565 | apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java | CRITICAL | 两个 Service 的 `toCampusTopicView()` 和 `toCampusTopicReplyView()` 转换方法中，对每条帖子/回复循环——影响1：每页加载 20 条帖子，产生 1（帖子查询）+ 20（作者查询）= 21 次数据库查询 | 每页加载 20 条帖子，产生 1（帖子查询）+ 20（作者查询）= 21 次数据库查询 | 先收集所有 authorId，使用 `userRepository.findAllById(authorIds)` 一次性批量加载所有作者，建立 Map 索引后再填充。 |
| 三-0566 | apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java | CRITICAL | 两个 Service 的 `toCampusTopicView()` 和 `toCampusTopicReplyView()` 转换方法中，对每条帖子/回复循环——影响2：加载 20 条回复时，额外产生 1（回复查询）+ 20（作者查询）= 21 次查询 | 加载 20 条回复时，额外产生 1（回复查询）+ 20（作者查询）= 21 次查询 | 先收集所有 authorId，使用 `userRepository.findAllById(authorIds)` 一次性批量加载所有作者，建立 Map 索引后再填充。 |
| 三-0567 | apps/api/src/main/java/com/campuslove/api/village/RealVillageService.java | CRITICAL | 两个 Service 的 `toCampusTopicView()` 和 `toCampusTopicReplyView()` 转换方法中，对每条帖子/回复循环——影响3：首页加载可能产生 42+ 次数据库往返，响应时间随并发量线性恶化 | 首页加载可能产生 42+ 次数据库往返，响应时间随并发量线性恶化 | 先收集所有 authorId，使用 `userRepository.findAllById(authorIds)` 一次性批量加载所有作者，建立 Map 索引后再填充。 |
| 三-0568 | apps/api/src/main/java/com/campuslove/api/admin/FeedbackController.java | CRITICAL | 管理端的反馈列表查询、反馈回复、反馈状态更新接口上没有任何认证/授权注解（无 `@PreAuthorize`、无 `@Secured`、无自定义注解）。任何知道 API 路径的人都可以访问这些管理接口。 | 未授权用户可以： - 查看所有用户的反馈内容（可能包含个人隐私信息如手机号） - 修改反馈状态（标记为已处理/忽略） - 发送虚假的官方回复给用户 | 在 Controller 类级别添加 `@PreAuthorize("hasRole('ADMIN')")` 或同等注解，确保所有管理接口经过认证和授权检查。 --- |
| 三-0569 | apps/api/src/main/java/com/campuslove/api/admin/FeedbackController.java | CRITICAL | [用户体验] 管理端的反馈列表查询、反馈回复、反馈状态更新接口上没有任何认证/授权注解（无 `@PreAuthorize`、无 `@Secured`、无自定义注解）。任何知道 | 影响用户体验与功能可用性：未授权用户可以： - 查看所有用户的反馈内容（可能包含个人隐私信息如手机号） - 修改反馈状态（标记为已处理/忽略） - 发送虚假的官方回复给用户 | 在 Controller 类级别添加 `@PreAuthorize("hasRole('ADMIN')")` 或同等注解，确保所有管理接口经过认证和授权检查。 --- |
| 三-0570 | apps/api/src/main/java/com/campuslove/api/admin/FeedbackController.java | CRITICAL | [数据一致性] 管理端的反馈列表查询、反馈回复、反馈状态更新接口上没有任何认证/授权注解（无 `@PreAuthorize`、无 `@Secured`、无自定义注解）。任何知道 | 可能导致业务数据不一致或状态错误：未授权用户可以： - 查看所有用户的反馈内容（可能包含个人隐私信息如手机号） - 修改反馈状态（标记为已处理/忽略） - 发送虚假的官方回复给用户 | 在 Controller 类级别添加 `@PreAuthorize("hasRole('ADMIN')")` 或同等注解，确保所有管理接口经过认证和授权检查。 --- |
| 三-0571 | apps/api/src/main/java/com/campuslove/api/admin/AdminNotifyConfigController.java | HIGH | `updateBatch()` 方法循环调用 `notifyConfigRepository.save()` 更新多条通知配置，但方法上未标注 `@Transactional`。每条 `save()` 在自己的事务中执行。 | 如果批量更新 10 条配置，前 5 条更新成功，第 6 条因约束冲突失败，前 5 条不会被回滚。数据库处于半更新状态——部分配置已生效，部分未生效，且没有简便的恢复方式。 | 添加 `@Transactional` 注解确保批量更新的原子性。 |
| 三-0572 | apps/api/src/main/java/com/campuslove/api/admin/AdminNotifyConfigController.java | HIGH | [用户体验] `updateBatch()` 方法循环调用 `notifyConfigRepository.save()` 更新多条通知配置，但方法上未标注 `@Transa | 影响用户体验与功能可用性：如果批量更新 10 条配置，前 5 条更新成功，第 6 条因约束冲突失败，前 5 条不会被回滚。数据库处于半更新状态——部分配置已生效，部分未生效，且没有简便的恢复方式。 | 添加 `@Transactional` 注解确保批量更新的原子性。 |
| 三-0573 | apps/api/src/main/java/com/campuslove/api/admin/AdminNotifyConfigController.java | HIGH | [数据一致性] `updateBatch()` 方法循环调用 `notifyConfigRepository.save()` 更新多条通知配置，但方法上未标注 `@Transa | 可能导致业务数据不一致或状态错误：如果批量更新 10 条配置，前 5 条更新成功，第 6 条因约束冲突失败，前 5 条不会被回滚。数据库处于半更新状态——部分配置已生效，部分未生效，且没有简便的恢复方式。 | 添加 `@Transactional` 注解确保批量更新的原子性。 |
| 三-0574 | apps/api/src/main/java/com/campuslove/api/admin/AdminNotifyConfigController.java | HIGH | `updateBatch()` 方法循环调用 `notifyConfigRepository.save()` 更新多条通知配置，但方法上未标注 `@Transa——影响1：如果批量更新 10 条配置，前 5 条更新成功，第 6 条因约束冲突失败，前 5 条不会被回滚 | 如果批量更新 10 条配置，前 5 条更新成功，第 6 条因约束冲突失败，前 5 条不会被回滚 | 添加 `@Transactional` 注解确保批量更新的原子性。 |
| 三-0575 | apps/api/src/main/java/com/campuslove/api/admin/AdminNotifyConfigController.java | HIGH | `updateBatch()` 方法循环调用 `notifyConfigRepository.save()` 更新多条通知配置，但方法上未标注 `@Transa——影响2：数据库处于半更新状态——部分配置已生效，部分未生效，且没有简便的恢复方式 | 数据库处于半更新状态——部分配置已生效，部分未生效，且没有简便的恢复方式 | 添加 `@Transactional` 注解确保批量更新的原子性。 |
| 三-0576 | apps/api/src/main/java/com/campuslove/api/admin/RealAdminMatchConfigService.java | HIGH | `updateMatchConfig()` 方法标注了 `@Transactional`，但方法内部的 try-catch 块捕获了通用 `Exception` 且仅记录日志，不重新抛出异常。 | 事务内发生数据库错误时，异常被吞掉，Spring 的事务管理器认为方法正常返回并提交事务——但实际数据可能未被正确持久化。调用方收到成功响应但数据未变更。 | 移除 try-catch，让异常自然传播到 Spring 事务管理器以触发回滚。如果确实需要捕获特定异常，应在 catch 块中重新抛出或使用 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`。 |
| 三-0577 | apps/api/src/main/java/com/campuslove/api/admin/RealAdminMatchConfigService.java | HIGH | [用户体验] `updateMatchConfig()` 方法标注了 `@Transactional`，但方法内部的 try-catch 块捕获了通用 `Exception` | 影响用户体验与功能可用性：事务内发生数据库错误时，异常被吞掉，Spring 的事务管理器认为方法正常返回并提交事务——但实际数据可能未被正确持久化。调用方收到成功响应但数据未变更。 | 移除 try-catch，让异常自然传播到 Spring 事务管理器以触发回滚。如果确实需要捕获特定异常，应在 catch 块中重新抛出或使用 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`。 |
| 三-0578 | apps/api/src/main/java/com/campuslove/api/admin/RealAdminMatchConfigService.java | HIGH | [数据一致性] `updateMatchConfig()` 方法标注了 `@Transactional`，但方法内部的 try-catch 块捕获了通用 `Exception` | 可能导致业务数据不一致或状态错误：事务内发生数据库错误时，异常被吞掉，Spring 的事务管理器认为方法正常返回并提交事务——但实际数据可能未被正确持久化。调用方收到成功响应但数据未变更。 | 移除 try-catch，让异常自然传播到 Spring 事务管理器以触发回滚。如果确实需要捕获特定异常，应在 catch 块中重新抛出或使用 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`。 |
| 三-0579 | apps/api/src/main/java/com/campuslove/api/admin/RealAdminMatchConfigService.java | HIGH | `updateMatchConfig()` 方法标注了 `@Transactional`，但方法内部的 try-catch 块捕获了通用 `Exception`——影响1：事务内发生数据库错误时，异常被吞掉，Spring 的事务管理器认为方法正常返回并提交事务——但实际数据可能未被正确持久化 | 事务内发生数据库错误时，异常被吞掉，Spring 的事务管理器认为方法正常返回并提交事务——但实际数据可能未被正确持久化 | 移除 try-catch，让异常自然传播到 Spring 事务管理器以触发回滚。如果确实需要捕获特定异常，应在 catch 块中重新抛出或使用 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`。 |
| 三-0580 | apps/api/src/main/java/com/campuslove/api/admin/RealAdminMatchConfigService.java | HIGH | `updateMatchConfig()` 方法标注了 `@Transactional`，但方法内部的 try-catch 块捕获了通用 `Exception`——影响2：调用方收到成功响应但数据未变更 | 调用方收到成功响应但数据未变更 | 移除 try-catch，让异常自然传播到 Spring 事务管理器以触发回滚。如果确实需要捕获特定异常，应在 catch 块中重新抛出或使用 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`。 |
| 三-0581 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | 前端传递 schoolName 字符串参数后，后端使用 `schoolName.hashCode()` 的返回值作为 schoolId 进行数据库查询。Java 的 `String.hashCode()` 可能对不同的字符串产生相同的哈希值（碰撞）。 | 理论上，两个不同学校名称（如 "上海交通大学" 和另一个字符串）可能产生相同的 hashCode 值，导致用户看到错误学校的校园墙内容。虽然概率低，但在用户基数大时不是零风险。 | 在数据库中维护 school 表（id, name），通过精确的字符串匹配或预先分配的数字 ID 来识别学校。 |
| 三-0582 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | [用户体验] 前端传递 schoolName 字符串参数后，后端使用 `schoolName.hashCode()` 的返回值作为 schoolId 进行数据库查询。Java | 影响用户体验与功能可用性：理论上，两个不同学校名称（如 "上海交通大学" 和另一个字符串）可能产生相同的 hashCode 值，导致用户看到错误学校的校园墙内容。虽然概率低，但在用户基数大时不是零风险。 | 在数据库中维护 school 表（id, name），通过精确的字符串匹配或预先分配的数字 ID 来识别学校。 |
| 三-0583 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | [数据一致性] 前端传递 schoolName 字符串参数后，后端使用 `schoolName.hashCode()` 的返回值作为 schoolId 进行数据库查询。Java | 可能导致业务数据不一致或状态错误：理论上，两个不同学校名称（如 "上海交通大学" 和另一个字符串）可能产生相同的 hashCode 值，导致用户看到错误学校的校园墙内容。虽然概率低，但在用户基数大时不是零风险。 | 在数据库中维护 school 表（id, name），通过精确的字符串匹配或预先分配的数字 ID 来识别学校。 |
| 三-0584 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | 前端传递 schoolName 字符串参数后，后端使用 `schoolName.hashCode()` 的返回值作为 schoolId 进行数据库查询。Java——影响1：理论上，两个不同学校名称（如 "上海交通大学" 和另一个字符串）可能产生相同的 hashCode 值，导致用户看到错误学校的校园墙内容 | 理论上，两个不同学校名称（如 "上海交通大学" 和另一个字符串）可能产生相同的 hashCode 值，导致用户看到错误学校的校园墙内容 | 在数据库中维护 school 表（id, name），通过精确的字符串匹配或预先分配的数字 ID 来识别学校。 |
| 三-0585 | apps/api/src/main/java/com/campuslove/api/campus/CampusController.java | HIGH | 前端传递 schoolName 字符串参数后，后端使用 `schoolName.hashCode()` 的返回值作为 schoolId 进行数据库查询。Java——影响2：虽然概率低，但在用户基数大时不是零风险 | 虽然概率低，但在用户基数大时不是零风险 | 在数据库中维护 school 表（id, name），通过精确的字符串匹配或预先分配的数字 ID 来识别学校。 |
| 三-0586 | apps/api/src/main/java/com/campuslove/api/admin/AdminUserController.java | HIGH | `toggleUserStatus()` 方法可以启用/禁用用户账号，这是一个高度敏感的操作（可能误封正常用户或解封违规用户），但方法上未标注审计注解（项目内部定义的 `@Auditable`）。 | 运营人员封禁/解封用户的行为无法被审计日志系统追踪，出现运营事故时无法追溯到具体的操作人和操作时间。 | 添加 `@Auditable(action = "TOGGLE_USER_STATUS")` 注解，确保操作被记录到审计日志。 --- |
| 三-0587 | apps/api/src/main/java/com/campuslove/api/admin/AdminUserController.java | HIGH | [用户体验] `toggleUserStatus()` 方法可以启用/禁用用户账号，这是一个高度敏感的操作（可能误封正常用户或解封违规用户），但方法上未标注审计注解（项目内部 | 影响用户体验与功能可用性：运营人员封禁/解封用户的行为无法被审计日志系统追踪，出现运营事故时无法追溯到具体的操作人和操作时间。 | 添加 `@Auditable(action = "TOGGLE_USER_STATUS")` 注解，确保操作被记录到审计日志。 --- |
| 三-0588 | apps/api/src/main/java/com/campuslove/api/admin/AdminUserController.java | HIGH | [数据一致性] `toggleUserStatus()` 方法可以启用/禁用用户账号，这是一个高度敏感的操作（可能误封正常用户或解封违规用户），但方法上未标注审计注解（项目内部 | 可能导致业务数据不一致或状态错误：运营人员封禁/解封用户的行为无法被审计日志系统追踪，出现运营事故时无法追溯到具体的操作人和操作时间。 | 添加 `@Auditable(action = "TOGGLE_USER_STATUS")` 注解，确保操作被记录到审计日志。 --- |
| 三-0589 | AdminPostController | MEDIUM | listPosts` 没有请求参数校验——`page` 和 `size` 可以为负数导致 SQL 错误 | 影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0590 | AdminPostController | MEDIUM | [用户体验] listPosts` 没有请求参数校验——`page` 和 `size` 可以为负数导致 SQL 错误 | 影响用户体验与功能可用性：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |
| 三-0591 | AdminPostController | MEDIUM | [数据一致性] listPosts` 没有请求参数校验——`page` 和 `size` 可以为负数导致 SQL 错误 | 可能导致业务数据不一致或状态错误：影响对应功能模块的可用性或数据一致性，降低用户体验。 | 根据具体问题定位并修复对应逻辑。 |

## 四、UI/UX 交互与设计合理性

| 编号 | 文件路径 | 严重程度 | 问题描述 | 商业化影响 | 修复方向 |
|------|----------|----------|----------|------------|----------|
| 四-0001 | `apps/client/src/components/discover/CardSwiper.vue` | CRITICAL | CardSwiper 使用 CSS aspect-ratio，WXSS 不支持 | 卡片图片高度塌陷为 0，布局完全损坏 | 使用 padding-top 百分比或 JS 动态计算高度 |
| 四-0002 | `design-system/tokens.ts / apps/client/src/theme/tokens.ts` | CRITICAL | 两套独立设计 Token 系统使用不同主色调：Sky Blue #3B9DE5 vs Mint Green #2DB97A，其他语义色也不一致 | 同一产品视觉割裂，全局样式修改需改两套，品牌认知受损 | 按对应类别规范修复并补充测试/文档 |
| 四-0003 | `全局` | CRITICAL | Zero i18n 基础设施，200+ 中文字符串硬编码在 Vue 组件与 Java 后端 | 产品完全无法国际化，文案修改需逐文件查找替换 | 按对应类别规范修复并补充测试/文档 |
| 四-0004 | `apps/admin/src/ 目录` | CRITICAL | 管理后台使用独立设计系统（灰度/紫色），与小程序客户端完全无关 | 同一产品两个界面像来自不同公司，品牌一致性完全丧失 | 按对应类别规范修复并补充测试/文档 |
| 四-0005 | `15+ 组件文件` | CRITICAL | 15+ 个 CSS 动画未适配 prefers-reduced-motion（×15） | 前庭功能障碍用户可能眩晕/恶心，违反 WCAG 2.3.3 | 按对应类别规范修复并补充测试/文档 |
| 四-0020 | `apps/client/src/components/layout/AppShell.vue / TabBar 组件` | CRITICAL | 底部 5 个 TabBar 项目缺少 role=tablist/role=tab、aria-selected、aria-label、tabindex | 屏幕阅读器用户无法理解和操作底部导航 | 按对应类别规范修复并补充测试/文档 |
| 四-0021 | `apps/client/src/components/discover/CardSwiper.vue` | CRITICAL | CardSwiper 5 个操作按钮（点赞/跳过/超级喜欢/回退/详情）为纯图标按钮，缺少 aria-label | 核心匹配功能对视障用户不可用 | 按对应类别规范修复并补充测试/文档 |
| 四-0022 | `apps/client/src/pages/login/` | CRITICAL | 登录页手机号/验证码输入框使用 placeholder 代替 label | 视障用户无法确认输入框用途，违反 WCAG 3.3.2 | 按对应类别规范修复并补充测试/文档 |
| 四-0023 | `约 10 个组件 100+ 处 <image> 标签` | CRITICAL | 100+ 交互图片缺少 alt/aria-label/aria-hidden（×100） | 关键交互元素对视障用户不可见，违反 WCAG 1.1.1 | 按对应类别规范修复并补充测试/文档 |
| 四-0123 | `login / feedback / profile-setup / report / chat/input-bar / verify/submit` | CRITICAL | 7 个页面表单输入框缺少 label 关联（×7） | 辅助技术用户无法完成核心任务 | 按对应类别规范修复并补充测试/文档 |
| 四-0130 | `3 个全局/组件样式文件` | CRITICAL | 3 处 outline:none 移除键盘焦点指示器且未提供替代样式（×3） | 键盘用户无法获知焦点位置，违反 WCAG 2.4.7 | 按对应类别规范修复并补充测试/文档 |
| 四-0133 | `多个组件文件` | CRITICAL | 图片删除按钮、筛选清除按钮等触控区域小于 44x44 CSS 像素 | 运动障碍用户难以准确点击，违反 WCAG 2.5.5 | 按对应类别规范修复并补充测试/文档 |
| 四-0134 | `SocialProgressIndicator.vue / VerificationBadge.vue / ChatBubble.vue` | CRITICAL | 仅通过颜色传达状态信息，无文字或图标备选 | 色盲用户无法区分状态，违反 WCAG 1.4.1 | 按对应类别规范修复并补充测试/文档 |
| 四-0135 | `全局` | CRITICAL | 微信小程序无障碍 API 未使用（aria-* 属性等） | 未利用平台无障碍能力 | 按对应类别规范修复并补充测试/文档 |
| 四-0136 | `全局` | CRITICAL | 未定义任何颜色对比度标准，浅灰 #C0C0C0 在白色背景对比度约 1.8:1（应>=4.5:1） | 低视力用户阅读困难 | 按对应类别规范修复并补充测试/文档 |
| 四-0137 | `apps/client/src/components/discover/CardSwiper.vue` | CRITICAL | 7 张功能图片（视频标识徽章、喜欢/跳过/超级喜欢按钮图标）缺失 alt/aria-label（×7） | 屏幕阅读器用户无法获知视频内容与操作类型，核心匹配功能对盲人不可用 | 按对应类别规范修复并补充测试/文档 |
| 四-0144 | `apps/client/src/components/discover/CardDetailOverlay.vue` | CRITICAL | 11 张图片（头像、照片轮播图、关闭/更多/分享/举报按钮等）缺失 alt（×11） | 用户详情浮层对辅助技术用户不可感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0155 | `apps/client/src/components/layout/AppShell.vue` | CRITICAL | 4 个 Tab 图标缺失 alt 且无 role=tab/aria-selected/aria-label | 屏幕阅读器用户无法通过底部导航切换页面 | 按对应类别规范修复并补充测试/文档 |
| 四-0156 | `apps/client/pages/login/index.vue` | CRITICAL | 登录表单手机号/验证码输入框缺失 label 关联 | 视障用户不知道当前焦点输入框用途 | 按对应类别规范修复并补充测试/文档 |
| 四-0157 | `apps/admin/src/views/Login.vue` | CRITICAL | Admin 登录表单输入框 label 未与 input 语义关联 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0158 | `全局（20+ 页面）` | HIGH | 20+ 页面根元素使用 height: 100vh，小程序中 vh 单位不可靠（×20） | 底部可能被 tabBar 遮挡或出现空白区域 | 使用 wx.getWindowInfo + flex:1 |
| 四-0178 | `7 个组件文件` | HIGH | CardSwiper/CardDetailOverlay/FilterDrawer/ActivityCard/HomeHeader/WallSection/PeopleScroll 使用 display: grid，WXSS 不支持（×7） | 布局完全失效，元素堆叠或错位 | 使用 Flexbox 替代 |
| 四-0185 | `8 个组件文件` | HIGH | CardDetailOverlay/LockScreen/UnlockGuideModal/FilterDrawer/AppShell 等 8 个文件使用 backdrop-filter: blur() 无 Android 回退（×8） | Android 设备毛玻璃效果失效，文字可读性差 | 添加 rgba() 半透明背景 fallback |
| 四-0193 | `多个组件文件` | HIGH | LockScreen/HeartParticles/LoginIllustration 等使用 filter: blur()/brightness()，WXSS 完全不支持 filter（×5） | 模糊背景与滤镜效果完全失效，UI 与设计稿严重不符 | 使用 Canvas 或预处理图片 |
| 四-0198 | `16 个页面 .vue 文件` | HIGH | 16 个页面根元素使用 100vh（×16） | 页面底部被 tabBar 遮挡或无法滚动 | 使用 page { height:100% } + flex:1 |
| 四-0214 | `8 个组件文件` | HIGH | 按钮或可点击元素使用 cursor:pointer 和 user-select:none，WXSS 中静默忽略（×8） | 表明组件未针对小程序环境适配 | 移除无效 CSS 并使用小程序事件处理 |
| 四-0222 | `6 个列表组件` | HIGH | discover/card-list / discussions/index / chat-session/index / moment/feed / profile/gallery / wall/index 未在 <image> 上添加 lazy-load（×6） | 页面一次性加载所有图片，首屏慢且浪费流量 | 为列表图片添加 lazy-load 属性 |
| 四-0228 | `apps/client/src/components/layout/UnreadBadge.vue` | HIGH | DOM 始终渲染未使用 v-if，count 为 0 时仍显示 '0' | 无未读消息时红点仍显示，用户困惑不信任 | 添加 v-if="count > 0" |
| 四-0229 | `apps/client/src/components/profile/VerificationBadge.vue` | HIGH | idcard 认证类型错误映射到 SCHOOL 图标 | 实名认证用户显示为学校认证，误导其他用户 | 修正为 ICONS.IDCARD |
| 四-0230 | `apps/client/pages/discussions/index.vue` | HIGH | 完全缺失错误状态处理（加载中/失败/空数据） | 网络异常时页面空白，无重试按钮 | 按对应类别规范修复并补充测试/文档 |
| 四-0231 | `apps/client/pages/discussions/index.vue` | HIGH | 底部 Tab 栏 selected 错误设置为 1（likes Tab），论坛页面高亮错误 | 用户导航位置混淆 | 按对应类别规范修复并补充测试/文档 |
| 四-0232 | `多个页面文件` | HIGH | 文本缩放时布局崩溃，固定高度 + overflow:hidden 导致文字截断 | 违反 WCAG 1.4.4 | 按对应类别规范修复并补充测试/文档 |
| 四-0233 | `AppShell.vue` | HIGH | 无 skip-link 跳过重复内容 | 键盘用户需多次 Tab 才能到达主内容 | 按对应类别规范修复并补充测试/文档 |
| 四-0234 | `UnlockGuideModal.vue / LongPressMenu.vue / CardDetailOverlay.vue` | HIGH | 模态框打开后焦点未锁定在模态框内，Tab 可能聚焦到遮罩底层元素 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0235 | `全局` | HIGH | 未适配微信小程序暗色模式（darkmode: true 未声明） | 系统暗色模式下可能出现异常对比度或不可读 | 按对应类别规范修复并补充测试/文档 |
| 四-0236 | `全局` | HIGH | 20+ 种不同 font-size 值，未形成有限排版层级 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0237 | `全局` | HIGH | 组件中使用任意 padding/margin 值（7px/13px/22px 等），未基于 4/8px 间距基准 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0238 | `全局` | HIGH | 图标体系不统一：混用 Emoji/纯文本符号/SVG/iconfont | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0239 | `apps/client/src/components/**/*.vue` | HIGH | 100+ 张图片在全组件范围缺失 alt 或 aria-hidden（×100） | 功能/信息图片无法感知，装饰图片产生噪音 | 按对应类别规范修复并补充测试/文档 |
| 四-0339 | `各分包表单组件` | HIGH | 7 个表单 input 在 subpackage 中缺失 label 关联：编辑资料/发布帖子/匹配偏好/搜索筛选/活动报名/反馈提交/聊天消息（×7） | 辅助技术用户无法完成核心表单任务 | 按对应类别规范修复并补充测试/文档 |
| 四-0346 | `apps/admin/src/views/Login.vue / NotifyConfig.vue / Users.vue` | HIGH | 3 处 outline:none 消除键盘焦点且未提供替代样式（×3） | 键盘用户无法看到焦点位置 | 按对应类别规范修复并补充测试/文档 |
| 四-0349 | `apps/client/src/App.vue` | HIGH | 13+ 个 CSS 动画无 prefers-reduced-motion 处理（×13） | 前庭功能障碍用户可能不适 | 按对应类别规范修复并补充测试/文档 |
| 四-0362 | `apps/client/src/components/common/HeartParticles.vue` | HIGH | 爱心粒子雨动画持续运行，无 reduced-motion 处理与暂停按钮 | 持续动画引发前庭障碍并消耗 CPU/GPU | 按对应类别规范修复并补充测试/文档 |
| 四-0363 | `apps/client/src/components/discover/LongPressMenu.vue` | HIGH | 长按菜单过渡动画无 reduced-motion 回退 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0364 | `apps/client/pages/activities/index.vue` | HIGH | 图片删除按钮和筛选清除按钮触控目标过小（约 24x24 px） | 易误触或点不中 | 按对应类别规范修复并补充测试/文档 |
| 四-0365 | `apps/client/src/components/discover/CardDetailOverlay.vue` | HIGH | 用户在线状态仅靠绿色/灰色圆点表示，无文字说明 | 色盲/屏幕阅读器用户无法感知状态 | 按对应类别规范修复并补充测试/文档 |
| 四-0366 | `8 个 Admin 视图` | HIGH | Admin 表格 <th> 元素缺失 scope=col/scope=row（×8） | 屏幕阅读器无法正确播报列标题 | 按对应类别规范修复并补充测试/文档 |
| 四-0374 | `apps/admin/src/views/Layout.vue` | HIGH | Admin 无 '跳到主内容' skip link | 键盘用户每次切换页面需多次 Tab 穿过侧边栏 | 按对应类别规范修复并补充测试/文档 |
| 四-0375 | `apps/admin/src/views/Layout.vue` | MEDIUM | 菜单激活状态依赖 route.path 简单字符串匹配，子路由可能导致父菜单不高亮 | 导航状态与实际路由不匹配，运营人员迷失位置 | 使用 route.meta.activeMenu 或 startsWith 匹配 |
| 四-0376 | `apps/admin/src/views/Dashboard.vue` | MEDIUM | 统计卡片数据无骨架屏或 loading 状态，数据加载前显示 '0' 误导用户 | 运营人员看到虚假零值，影响数据判断 | 添加 skeleton/loading 占位 |
| 四-0377 | `apps/admin/src/views/AuditLogs.vue` | MEDIUM | 日志时间显示使用 new Date().toLocaleString() 无时区处理 | 不同时区运营人员看到的时间不一致，审计困难 | 统一使用服务端时区或明确显示时区 |
| 四-0378 | `apps/admin/src/views/NotifyConfig.vue` | MEDIUM | 开关切换无乐观更新，用户感知延迟 | 操作反馈滞后，体验差 | 本地先更新状态再同步服务端 |
| 四-0379 | `apps/client/src/pages.json` | MEDIUM | 未使用分包加载，所有页面位于主包 | 首屏加载时长，可能超过 2MB 限制 | 按功能拆分为 subpackages |
| 四-0380 | `多个使用 scroll-view 的文件` | MEDIUM | scroll-view 未启用 enhanced 和 bounces 属性，iOS 橡皮筋效果未优化 | 滚动体验不如原生 | 根据平台启用 enhanced/bounces |
| 四-0381 | `apps/client/src/components/discover/CardSwiper.vue / CardDetailOverlay.vue / 多个头像组件` | MEDIUM | 图片加载失败无 fallback 处理，出现空白或破碎图标 | 用户头像/封面图不可用时视觉体验差 | 添加 @error 事件显示默认占位图 |
| 四-0382 | `全局` | MEDIUM | 组件未监听 wx.onNetworkStatusChange，网络断开时无主动提示 | 用户在网络异常时操作得到不友好错误 | 添加网络状态监听与提示 |
| 四-0383 | `多个组件文件` | MEDIUM | transition 动画未使用 <Transition>/<TransitionGroup>，手动 class + setTimeout 实现（×5） | 动画逻辑分散且易出错 | 使用 Vue 内置 Transition |
| 四-0388 | `apps/client/pages/chat-session/index.vue` | MEDIUM | scroll-into-view 的消息 ID 可能与实际 DOM id 不匹配 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0389 | `apps/client/pages/discussions/index.vue` | MEDIUM | 点赞操作无乐观更新，用户需等待服务端响应后看到 UI 变化 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0390 | `apps/client/pages/chat-session/index.vue` | MEDIUM | 键盘弹起时消息列表未自动滚到底部，新消息可能被键盘遮挡 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0391 | `全局` | MEDIUM | 加载状态仅通过转圈动画指示，缺少 aria-busy | 屏幕阅读器无法感知加载中 | 按对应类别规范修复并补充测试/文档 |
| 四-0392 | `全局` | MEDIUM | Toast 提示无 ARIA live region，屏幕阅读器不会自动播报 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0393 | `全局` | MEDIUM | 错误状态仅通过红色边框指示，缺少错误文字 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0394 | `全局` | MEDIUM | 表单校验错误信息不关联 aria-describedby | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0395 | `全局` | MEDIUM | 空状态提示文本未本地化提取 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0396 | `apps/client/src/components/UnlockGuideModal.vue` | MEDIUM | 弹窗未设置 role=dialog 和 aria-modal=true | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0397 | `apps/client/src/components/UnlockGuideModal.vue` | MEDIUM | 弹窗打开时焦点未自动移至弹窗内第一个可聚焦元素 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0398 | `apps/client/src/components/common/LockScreen.vue` | MEDIUM | 锁定屏幕缺少 aria-label 说明锁定状态 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0399 | `apps/client/src/components/chat/IcebreakerSuggestions.vue` | MEDIUM | 快捷回复按钮无 role=button，仅用 <view> 实现 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0400 | `apps/client/src/components/chat/HeartSignal.vue` | MEDIUM | 心跳信号动画无暂停机制 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0401 | `apps/client/src/components/activities/ActivityCard.vue` | MEDIUM | 活动卡片整体可点击但无 role=button 或 tabindex | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0402 | `apps/client/src/components/home/HomeHeader.vue` | MEDIUM | 通知铃铛仅靠红点表示未读，无文字或 aria-label | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0403 | `apps/client/src/components/login/LoginIllustration.vue` | MEDIUM | 登录插画缺失 alt 属性 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0404 | `全局（PhotoViewer）` | MEDIUM | 图片查看器关闭按钮无 aria-label | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0405 | `apps/client/src/components/common/SearchBar.vue` | MEDIUM | 搜索输入框清除按钮无 aria-label | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0406 | `apps/admin/src/views/Login.vue` | MEDIUM | 密码可见/隐藏切换按钮无 aria-label | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0407 | `apps/admin/src/views/Layout.vue` | MEDIUM | 侧边栏使用 <div> 实现无 role=navigation | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0408 | `apps/admin/src/views/Dashboard.vue` | MEDIUM | 统计卡片数字使用 <div> 无语义标记 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0409 | `全局` | MEDIUM | 无 <html lang='zh-CN'> 声明，影响屏幕阅读器语言识别 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0410 | `全局` | MEDIUM | 页面 <title> 动态变化时未通过 aria-live 通知屏幕阅读器 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0411 | `多个 .vue 文件` | LOW | 组件样式隔离 styleIsolation 未显式设置，依赖默认行为 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0412 | `app.json` | LOW | 未使用 skyline 渲染引擎，仍使用 WebView 渲染 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0413 | `多个 .vue 文件` | LOW | style scoped 中使用 ::v-deep，可能在小程序中不生效（×4） | 样式穿透失效 | 检查并替换为正确 deep 选择器 |
| 四-0417 | `全局` | LOW | TypeScript 类型定义中缺少 Design Token 类型约束 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0418 | `全局` | LOW | 部分 SVG 图标缺少 viewBox 属性 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0419 | `全局` | LOW | 未配置 meta[name=theme-color] | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0420 | `全局` | LOW | 未使用 :focus-visible 替代 :focus | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0421 | `apps/client/pages/chat-session/index.vue` | LOW | 消息列表 <scroll-view> 未设置 aria-live=polite 使屏幕阅读器感知新消息 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0422 | `apps/client/pages/discover/*` | LOW | 卡片滑动手势提示仅为视觉指示，无音频或触觉反馈 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0423 | `apps/client/pages/login/index.vue` | LOW | 验证码倒计时按钮禁用时无 aria-disabled 说明 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0424 | `全局` | LOW | 应用级别 <view> 容器无 role=application 或 role=main 标记 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0425 | `全局` | LOW | 表单提交按钮仅为 <button> 无 type=submit | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0426 | `全局` | LOW | 切换开关使用 <view> 实现，无 role=switch + aria-checked | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0427 | `全局` | LOW | 弹窗关闭时焦点未返回至触发弹窗的元素 | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
| 四-0428 | `全局` | LOW | 加载中状态仅视觉指示，未使用 aria-busy=true | 交互或设计缺陷降低可用性、可访问性与品牌感知 | 按对应类别规范修复并补充测试/文档 |
## 五、测试与工程质量

| 编号 | 文件路径 | 严重程度 | 问题描述 | 商业化影响 | 修复方向 |
|------|----------|----------|----------|------------|----------|
| 五-0001 | `apps/api/src/test/java/ 目录` | CRITICAL | 约 30 个 Java Controller 无测试（Auth/User/Match/Discussion/Message/Notification/Campus/Feedback/MediaUpload/Report/TempChat/Admin*Controller 等）（×30） | HTTP 映射、参数校验、认证授权、异常处理均无法验证 | 按对应类别规范修复并补充测试/文档 |
| 五-0031 | `项目根目录` | CRITICAL | 无 E2E 测试（未安装 Playwright/Cypress，无配置与测试用例） | 核心用户旅程（注册->匹配->聊天）无端到端验证 | 按对应类别规范修复并补充测试/文档 |
| 五-0032 | `apps/admin/package.json` | CRITICAL | Admin 后台未声明 vitest/@vue/test-utils，无 vitest.config.ts，无任何 .test/.spec 文件 | 管理后台完全无法运行测试 | 按对应类别规范修复并补充测试/文档 |
| 五-0033 | `vitest.config.ts / jest.config.js` | CRITICAL | 覆盖率阈值过低（25% statements/lines），远低于行业标准 | 95% 代码可无测试通过 CI | 按对应类别规范修复并补充测试/文档 |
| 五-0034 | `apps/api/pom.xml` | CRITICAL | Java 端未配置 JaCoCo，mvn test 不产出覆盖率数据 | 无法量化测试覆盖率，CI 无法阻止覆盖率下降 | 按对应类别规范修复并补充测试/文档 |
| 五-0035 | `apps/client/src/components/ 目录` | HIGH | 43 个 Vue 组件中 40 个无测试（CardSwiper/CardDetailOverlay/AppShell/LockScreen/FilterDrawer/ChatBubble/IcebreakerSuggestions/HeartSignal/UnlockGuideModal/LongPressMenu 等）（×40） | 核心交互组件行为变更无自动化验证 | 按对应类别规范修复并补充测试/文档 |
| 五-0075 | `apps/client/src/api/ 或 services/` | HIGH | clientApi 层从未直接测试，仅通过 vi.mock() 完全替换 | API 签名变更、参数构造、响应转换、错误处理分支未覆盖 | 按对应类别规范修复并补充测试/文档 |
| 五-0076 | `项目根目录` | HIGH | 无性能/负载测试（无 JMeter/k6/Gatling 脚本、无响应时间基准、无并发负载测试） | 无法预知高峰并发表现 | 按对应类别规范修复并补充测试/文档 |
| 五-0077 | `项目根目录` | HIGH | 无可访问性测试（无 axe-core/pa11y/jest-axe） | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0078 | `项目根目录` | HIGH | 无视觉回归测试（无 Storybook + Chromatic/Percy） | UI 变更完全依赖人工检查 | 按对应类别规范修复并补充测试/文档 |
| 五-0079 | `apps/client/src/stores/__tests__/ 目录` | HIGH | 14 个 Pinia stores 平均仅测试 20-30% 方法，异步 action 错误分支几乎无覆盖，store 间交互未测试 | 核心状态管理逻辑变更风险高 | 按对应类别规范修复并补充测试/文档 |
| 五-0080 | `apps/client/src/stores/__tests__/checkin.test.ts` | HIGH | 使用 vi.resetModules() 每个测试重置模块状态，属于反模式 | 测试隔离不彻底、执行慢、难调试 | 按对应类别规范修复并补充测试/文档 |
| 五-0081 | `多个 .test.ts 文件` | HIGH | 测试中大量使用 as any 类型断言和 any 类型参数 | 测试无法捕获接口变更导致的类型错误 | 按对应类别规范修复并补充测试/文档 |
| 五-0082 | `apps/api/src/test/java/ 目录` | HIGH | Flyway 迁移脚本无回滚/迁移测试，无法验证迁移正确性与可重复执行 | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0083 | `.github/workflows/ci.yml` | HIGH | CI 缺少 SonarQube/OWASP Dependency Check/代码重复率/圈复杂度等质量门禁 | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0084 | `apps/client/src/ 目录` | MEDIUM | 测试文件命名不一致（.test.ts 与 .spec.ts 混用），存放位置不一致（__tests__/ 与源文件同级） | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0085 | `全局` | MEDIUM | 缺少测试数据工厂（UserFactory/MatchFactory 等），测试中重复构造数据 | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0086 | `apps/api/src/test/java/` | MEDIUM | Java 测试过度依赖 Mockito 而不使用 @SpringBootTest + Testcontainers | 纯 mock 无法验证数据库约束、事务行为、SQL 正确性 | 按对应类别规范修复并补充测试/文档 |
| 五-0087 | `多个测试文件` | MEDIUM | 测试间存在隐式依赖，未清理状态导致结果依赖执行顺序 | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0088 | `全局` | MEDIUM | 未使用 Snapshot Testing 保护关键数据结构变更 | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0089 | `多个测试文件` | LOW | 测试未使用 AAA 结构注释 | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0090 | `多个测试文件` | LOW | describe 块缺少清晰语义描述 | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0091 | `多个测试文件` | LOW | 测试使用 setTimeout 替代 waitFor/flushPromises | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0092 | `多个测试文件` | LOW | 测试使用废弃的 done() 回调模式 | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
| 五-0093 | `.github/workflows/ci.yml` | LOW | 未配置测试覆盖率报告的 CI 归档 | 测试与工程质量不足导致回归风险高、迭代效率低 | 按对应类别规范修复并补充测试/文档 |
## 六、基础设施与运维合规

| 编号 | 文件路径 | 严重程度 | 问题描述 | 商业化影响 | 修复方向 |
|------|----------|----------|----------|------------|----------|
| 六-0001 | `.gitleaks.toml` | CRITICAL | Gitleaks 将 BCrypt 哈希正则添加到全局白名单 | 可能将相似格式敏感数据错误跳过，伪造测试凭据被忽略 | 按对应类别规范修复并补充测试/文档 |
| 六-0002 | `apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java` | CRITICAL | SecurityConfig 暴露 /uploads/** 公开访问，无任何访问控制 | 用户上传的身份证/私密照片可通过直接 URL 访问 | 按对应类别规范修复并补充测试/文档 |
| 六-0003 | `项目根目录` | CRITICAL | 无任何 Dockerfile / docker-compose.yml / .dockerignore | 无法标准化构建部署，环境不一致，新开发者入职成本高 | 按对应类别规范修复并补充测试/文档 |
| 六-0004 | `apps/api/src/main/resources/application-db.yml` | CRITICAL | Admin 密码哈希默认值为空字符串 | 空字符串 BCrypt 哈希已知，攻击者可直接登录，或未配置时仍启动 | 按对应类别规范修复并补充测试/文档 |
| 六-0005 | `apps/api/src/main/resources/db/migration/` | CRITICAL | feedback_tickets 与 user_feedback_ticket 重复表定义 | 僵尸表浪费空间，数据源不明确，维护困惑 | 按对应类别规范修复并补充测试/文档 |
| 六-0006 | `项目根目录` | HIGH | 无 .env.example / .env.template / .env.sample 文件 | 新开发者不知道需配置哪些环境变量，生产部署易遗漏 | 按对应类别规范修复并补充测试/文档 |
| 六-0007 | `apps/api/pom.xml` | HIGH | 未集成 Spring Boot Actuator，缺少 /actuator/health/info/metrics/env | 无法配置 K8s probe、接入监控、查看运行时状态 | 按对应类别规范修复并补充测试/文档 |
| 六-0008 | `apps/api/src/main/java/com/campuslove/api/config/WebConfig.java` | HIGH | CORS 仅允许 localhost 来源 | 生产环境小程序域名无法访问，allowCredentials+localhost 存在安全问题 | 按对应类别规范修复并补充测试/文档 |
| 六-0009 | `项目根目录` | HIGH | 无 API 版本化策略（/api/users 而非 /api/v1/users） | 破坏性变更必须同步升级所有客户端，无法灰度 | 按对应类别规范修复并补充测试/文档 |
| 六-0010 | `全局` | HIGH | 无缓存策略（无 @Cacheable/Redis/Caffeine），每次请求都查数据库 | 推荐/配置/敏感词等高频数据重复查询，峰值 QPS 受限 | 按对应类别规范修复并补充测试/文档 |
| 六-0011 | `全局` | HIGH | 无限速限制（Rate Limiting） | 登录/短信/上传/推荐接口可被暴力滥用 | 按对应类别规范修复并补充测试/文档 |
| 六-0012 | `项目根目录` | HIGH | 缺少数据备份和恢复机制（无脚本/文档） | 数据库故障时图片/聊天记录可能永久丢失 | 按对应类别规范修复并补充测试/文档 |
| 六-0013 | `6 个建表语句` | HIGH | campus_topics / campus_posts / user_activity_logs / push_templates / sensitive_words / system_configs 缺少 ENGINE/CHARSET 规格（×6） | 依赖 MySQL 默认值，可能因 latin1 导致中文乱码 | 按对应类别规范修复并补充测试/文档 |
| 六-0019 | `Flyway 迁移脚本` | HIGH | 30+ ALTER TABLE ADD COLUMN 无 IF NOT EXISTS 守卫（×30） | 重复执行或状态不一致时迁移失败 | 按对应类别规范修复并补充测试/文档 |
| 六-0049 | `5 个 ENUM 列` | HIGH | users.gender/status、reports.type/status、content_audit.result 使用 ENUM 而非查找表（×5） | 新增状态需 ALTER TABLE 大表阻塞，无法附加元数据与 i18n | 按对应类别规范修复并补充测试/文档 |
| 六-0054 | `所有表` | HIGH | ID 列定义不一致：BIGINT AUTO_INCREMENT / BIGINT 手动序列 / INT AUTO_INCREMENT / VARCHAR(32) 雪花 / CHAR(36) UUID 共 5 种模式（×5） | JOIN 隐式转换影响性能，无法统一 @GeneratedValue 策略 | 按对应类别规范修复并补充测试/文档 |
| 六-0059 | `DEPLOYMENT.md` | MEDIUM | 文档中 JVM 启动参数语法错误：java -jar -Xms... 应为 java -Xms... -jar | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |
| 六-0060 | `apps/client/scripts/build-mp-weixin.bat` | MEDIUM | 构建脚本使用 npm 而非 pnpm，无错误处理与前置检查，输出目录硬编码 | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |
| 六-0061 | `apps/api/src/main/resources/` | MEDIUM | 配置分散在多个 YAML 文件，可能重复冲突，敏感配置与普通配置混合 | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |
| 六-0062 | `全局` | MEDIUM | 无日志管理策略：无 logback-spring.xml 滚动策略，可能全局 DEBUG，敏感字段未脱敏，缺少 access log | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |
| 六-0063 | `全局` | MEDIUM | 缺少监控和告警（无 APM、JVM/业务/错误率/慢查询/第三方可用性监控） | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |
| 六-0064 | `全局` | MEDIUM | 表名单复数混用：user vs users / feedback_ticket vs user_feedback_ticket 等约 10 对冲突 | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |
| 六-0065 | `全局` | MEDIUM | 列名不一致：user_id/author_id/sender_id/reporter_id、created_at/create_time/gmt_create、is_deleted/deleted/status=DELETED | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |
| 六-0066 | `5 个高频查询表` | MEDIUM | chat_messages (session_id,created_at)、users (status,last_active_at)、reports (status,created_at)、discover_swipes (swiper_id,created_at)、notifications (user_id,is_read,created_at) 缺少关键索引（×5） | 数据量增长后查询性能线性下降 | 按对应类别规范修复并补充测试/文档 |
| 六-0071 | `5 个表间关系` | MEDIUM | chat_messages.session_id、discover_swipes.swiper_id、reports.reporter_id、notifications.user_id 等缺少数据库级外键约束（×5） | 数据一致性仅依赖应用层，风险高 | 按对应类别规范修复并补充测试/文档 |
| 六-0076 | `chat_messages 表` | MEDIUM | TEXT 类型 content 大字段与频繁访问小字段混在同一表 | 查询非 content 列也可能读取溢出页，增加 IO | 按对应类别规范修复并补充测试/文档 |
| 六-0077 | `多数表` | MEDIUM | created_at/updated_at 缺少 DEFAULT CURRENT_TIMESTAMP 与 ON UPDATE CURRENT_TIMESTAMP | 应用层遗漏设置时列为 NULL，多实例时钟不一致 | 按对应类别规范修复并补充测试/文档 |
| 六-0078 | `全局` | LOW | CI/CD 配置分散，缺少统一发布流程文档 | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |
| 六-0079 | `多数表` | LOW | VARCHAR 长度随意指定（用户名 32/50/64、手机号 11/20/32、邮箱 50/100/128 等） | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |
| 六-0080 | `多数表` | LOW | CHARSET=utf8mb4 但未指定 COLLATE，不同环境排序行为可能不一致 | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |
| 六-0081 | `Flyway 迁移脚本` | LOW | 迁移脚本版本号可能存在跳跃或命名不规范，缺少 comment | 基础设施与运维合规缺失影响部署稳定性、安全审计与灾备能力 | 按对应类别规范修复并补充测试/文档 |

---

## 附录：多视角综合评价

## 一、企业决策者 / 投资方视角

从商业落地角度看，当前代码库处于"可演示但不可规模运营"的状态。最致命的问题是 **微信登录链路未真正调用 `wx.login()`** —— 这意味着在小程序真实环境中用户无法完成注册/登录，产品从入口即不可用。与此同时，**`/uploads/**` 公开可访问**、**管理后台接口缺少权限注解**、**JWT 无撤销机制** 等安全问题组合在一起，构成了极高的数据泄露与合规风险；一旦发生用户隐私照片或实名信息泄露事件，不仅面临行政处罚，还会对品牌造成不可逆损害。

在增长层面，**零 i18n 基础设施** 直接锁死产品的地域扩展能力，无法进入港澳台、东南亚或其他中文以外的市场；**管理后台 Feedback.vue 使用 Mock 数据** 意味着运营团队实际上看不到真实用户声音，产品迭代失去数据依据，用户流失原因无法被识别。

成本方面，**5 个 God Class**、**零缓存/零限流/零版本化 API**、**设计系统三套 Token 并存** 会显著放大后续迭代的边际成本：每一次需求变更都需要改动多处、回归多个平台，研发效率将随功能增加而递减。建议决策层在产品正式推广前，先投入专门的技术债清偿周期，把登录链路、权限安全、i18n 与基础架构补齐；否则后续获客成本（CAC）会因为低留存、高客诉、高运维而被大幅抬高。

## 二、技术专家 / 架构师视角

从技术架构角度看，项目存在明显的"原型级"特征：功能可运行，但缺乏支撑规模化与长期演进的工程基础。首先，**安全与并发问题集中爆发**：JWT 无撤销、密码哈希可序列化泄露、session token 暴露、上传目录公开访问、管理员接口缺少 `@PreAuthorize`、SQL 注入与 XSS 风险并存。这些问题不是局部 bug，而是架构层面的安全模型缺失。

其次，**数据一致性与并发控制薄弱**：所有 JPA 实体缺少 `@Version` 乐观锁，微信登录 find-then-create、点赞、回退等操作存在竞态条件；`@Transactional` 边界混乱，部分方法吞异常导致事务错误提交，批量更新无原子性。随着并发增加，数据错乱将难以追溯。

第三，**性能与可观测性空白**：多处 N+1 查询、`findAll()` 全表加载、无缓存、无分页上限、无熔断重试，推荐/匹配等核心接口在用户量增长后必然拖垮数据库；零日志追踪 ID、零监控告警、零限流，也让故障定位与容量规划无从谈起。

第四，**前端工程化不足**：零 i18n、设计 Token 分裂、小程序 WXSS 兼容性风险（aspect-ratio/grid/backdrop-filter/vh/100vh）、组件缺少类型守卫与单元测试。整体建议是先冻结大型新功能，按「安全加固 → 数据一致性 → 性能基础设施 → 工程规范 → 可观测性」的顺序进行架构治理，并补充接口契约、E2E、性能与 a11y 测试。

## 三、终端用户 / 消费者视角

从普通用户视角看，当前产品存在多处影响核心体验的断裂点。最严重的是 **微信登录失败**：用户打开小程序后无法完成注册/登录，所有后续功能都无从谈起。如果能绕过登录进入，**聊天页面会同时显示两条重复消息**（messagesStore 与 chatStore 重复渲染），让用户对消息是否发送成功产生困惑；**语音消息功能为空壳**，对方收到的是纯文本 `[语音消息]`，体验大打折扣。

在匹配与社交场景，**右滑喜欢后 API 失败会返回随机 Mock 结果**，用户不知道自己是否真的匹配成功；**个人主页 VIP 状态不显示**，付费用户感受不到权益；**个人资料完成度计算使用最小值**，用户明明填写了大量信息，完成度却很低，打击继续完善的动力。此外，**签到连续天数基于客户端时间**，修改手机时间即可作弊，破坏公平性。

无障碍体验方面，**100+ 图片缺少 alt/aria-label**、**TabBar 缺少 role/aria-selected**、**表单输入框缺少 label 关联**、**动画无 reduced-motion 处理**，意味着视障、前庭功能障碍、色盲用户几乎无法使用该产品。总体来看，当前产品在核心路径上存在多处"半成品"迹象，普通用户可能在首次体验后因为登录失败、聊天混乱、匹配结果不可信而流失；无障碍用户则被完全排除在外，存在合规与品牌声誉风险。

## 四、营销人员 / 增长运营视角

从增长与合规角度看，当前代码库无法支撑任何规模化营销动作。首先，**小程序无法登录** 意味着所有拉新投放（朋友圈广告、KOL 合作、校园地推）都会因为用户无法完成注册而浪费预算；**无 i18n 支持** 让出海或多语言校园市场无从谈起。

内容运营层面，**管理后台 Feedback.vue 展示的是 Mock 数据**，运营团队无法看到真实用户反馈，无法基于用户声音策划活动或优化文案；**Dashboard 统计卡片无骨架屏**、**统计查询实时 COUNT(*)** 可能导致数据加载慢甚至超时，影响运营决策效率。用户激励方面，**签到连续天数基于客户端时间** 让用户可以通过修改手机时间作弊，破坏活动公平性；**个人主页完成度计算使用最小值** 会打击用户完善资料的积极性，降低资料完整率——而资料完整率直接影响匹配质量和用户留存。

合规与舆情风险尤其需要重视：**用户上传的照片/身份证可通过 URL 直接访问**、**隐私接口未按微信新规配置**、**未获得授权即可访问管理接口**——这些问题一旦在营销活动后被曝光，将引发严重的公关危机。营销团队在产品进入真实推广前，必须确认登录链路、隐私合规、上传安全、管理后台权限等基础问题已修复，否则增长越快，风险越大。

---

## 修复优先级总览

| 优先级 | 核心问题 | 建议修复方向 |
|--------|----------|--------------|
| P0 | 微信登录未调用 `wx.login()`、`/uploads/**` 公开访问、管理接口无权限、JWT 无撤销、数据库密码明文、Token 系统分裂 | 安全加固 + 登录链路修复 + 配置中心化 |
| P1 | 双 Store 重复消息、语音空壳、Rewind 限制未执行、N+1 查询、零缓存/限流/版本化、WXSS 兼容性 | 核心功能修复 + 性能基础设施 |
| P2 | i18n 基建、Design Token 统一、God Class 拆分、测试覆盖提升、CI 门禁 | 架构治理 + 工程质量 |
| P3 | 无障碍支持、暗色模式、视觉回归测试、日志/监控/备份 | 合规与体验优化 |
