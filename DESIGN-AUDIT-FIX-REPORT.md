# 设计需求符合性审计与修复报告（2026-08-07）

> 依据《页面设计需求》对客户端实现进行逐项审计，审计结论分「符合 / 部分符合 / 不符合」，
> 本次已完成可落地的修复；剩余项为需要后端数据接口或较大范围重构的事项，列于「遗留项」。

---

## 一、全局底部导航栏

| 需求 | 审计结论 | 修复动作 |
|---|---|---|
| Tab 顺序：首页、匹配、圈子、消息、我的 | ❌ 原为「匹配、圈子、首页、消息、我的」 | ✅ 已调整三处联动配置：`src/config/navigation.ts`、`src/pages.json` tabBar.list、`src/custom-tab-bar/index.js` |
| APP 启动默认进入「匹配」页 | ✅ 启动页 = pages[0]（discover） | ✅ 保持；因 tab 顺序变化，custom-tab-bar 新增 `pageLifetimes.show` 按当前路由动态同步选中态（冷启动/分享直达均高亮正确） |
| 图标+文字，选中品牌主色/未选中中性灰 | ✅ 已有（#3FCF8E / #6B7280） | — |
| 高度 56px + 底部安全区 | ⚠️ 原为左右留边悬浮胶囊（≈49-61px） | ✅ 改为全宽固定底部，`height: calc(112rpx + env(safe-area-inset-bottom))`；App.vue `--tabbar-height` 与 `.page-bottom-safe` 同步 140→112rpx |
| 点击即时切换、无冗余动画 | ⚠️ 有 250-350ms 选中态动画/按压缩放 | ✅ 精简为纯颜色 + 字重反馈，移除 indicator-pop、scale 动画 |
| 页面级选中同步 | ⚠️ 5 个 tab 页的 `useTabBar(n)` 下标按旧顺序硬编码 | ✅ 更新 `useTabBar` 下标（discover 0→1、village 1→2、home 2→0）并修正注释 |

## 二、匹配页（核心默认页）

| 需求 | 审计结论 | 修复动作 |
|---|---|---|
| 底部操作栏：不喜欢 \| 悄悄话 \| 喜欢，中间最大、品牌主色填充 | ❌ 原为「跳过 \| 超级喜欢 \| 喜欢 \| 收藏」4 按钮 | ✅ CardSwiper 改为 3 按钮：左灰「不喜欢」、中品牌绿填充「悄悄话」（最大 156rpx，付费私信入口）、右「喜欢」；超级喜欢保留在长按菜单；收藏按钮移除（逻辑一并清理） |
| 悄悄话：扣交友币后直接进入私信会话 | ⚠️ 原仅弹窗扣费不进入会话 | ✅ `onWhisperTap`：allowMessage/VIP 直接进会话，否则确认扣 2 交友币（`UNLOCK_COST_YUAN.WHISPER`）后进入会话 |
| 身份头部区：左侧露脸头像 + 右侧 ID/双重认证/活跃/距离 | ❌ 头像/ID/认证/活跃散落卡片底部 | ✅ 新增 `.card__identity` 顶部区域：方形圆角头像（176rpx）+ ID + 认证标识 + 活跃状态 + 「距离你Xkm」 |
| 认证标识可点击弹认证详情 | ❌ 纯展示 | ✅ 新增认证详情弹窗（机器认证/人工认证的方式与可信度） |
| 基础资料区：年龄/学校学历/职业收入/身高/婚况，带小图标 | ⚠️ 卡片仅年龄/学校/收入 | ✅ 新增 `basicInfoItems` 横排展示：年龄/学校/学历/收入/身高/婚况；婚况透传 `relationshipStatus`；数据缺失项自动隐藏 |
| 自我描述：默认 3 行 + 右下角展开 | ⚠️ 2 行、按钮在下方 | ✅ clamp 3 行，「展开」按钮绝对定位右下角带渐隐 |
| 标签区两行：喜好 + 性格/MBTI/星座 | ⚠️ 单行混排、深底白字 | ✅ 第一行喜好标签（浅底深字胶囊）；第二行「星座+MBTI / 性格」；mock 数据补 `zodiac` 字段 |
| 动态预览：小标题「TA的动态」+ 2 条（2 行文案+缩略图+计数），点击进详情 | ⚠️ 无标题/无缩略图/单行/不可独立点击 | ✅ 补标题、缩略图、2 行省略、条目可点击打开详情（详情页含「私信」付费按钮） |
| 顶部筛选栏：左侧筛选下拉（匹配范围/年龄默认18-35/排序）+ 右侧搜索图标展开 | ⚠️ 无下拉、无排序、年龄藏在二级抽屉、搜索常驻 | ✅ 新增 `QuickFilterSheet` 底部弹窗：匹配范围（不限/附近）、年龄区间（默认 18-35）、排序（匹配度优先/最新注册/最活跃），确认后即时生效刷新；搜索改为图标点击展开/失焦收起 |
| 排序规则 | ❌ 完全缺失 | ✅ store 新增 `sortBy` 状态 + `applyQuickFilter` action；匹配度=原始顺序、最新注册=按 `registeredAt` 倒序、最活跃=按活跃状态权重；mock 数据补 `registeredAt` |

## 三、消息页

| 需求 | 审计结论 | 修复动作 |
|---|---|---|
| 快捷入口区：匿名匹配聊天 / 谁喜欢我 / 我的访客，3 张均等浅底圆角卡片 | ❌ tab 页无入口区 | ✅ chat/index.vue 新增三卡片；「匿名匹配聊天」→ 心动信号页；「谁喜欢我/我的访客」带 🔒 小锁（右下角） |
| 付费解锁：进页前提示「消耗X交友币解锁全部」 | ⚠️ 原为进页前弹窗扣费、进页全量展示 | ✅ 入口点击 → 弹窗确认扣 3 交友币（会员免费）→ 进入列表页；进页「前 2 位模糊」解锁模式列为遗留项 |
| 固定官方账号：产品助手、活动官 | ❌ 原为「官方消息/小助手」WIP 占位 | ✅ 文案改为「产品助手」（功能答疑·系统通知）、「活动官」（活动推送·惊喜福利）；参与时间排序需后端会话数据，列为遗留项 |
| 会话按最后消息时间倒序 | ✅（置顶优先+时间倒序） | — |
| 单条会话结构/99+/点击消除红点 | ✅ | — |
| 已读会话文字浅灰弱化 | ❌ 无区分 | ✅ 新增 `conversation-item__message--read` 弱化样式 |

## 四、圈子页

| 需求 | 审计结论 | 修复动作 |
|---|---|---|
| 顶部功能栏：左定位城市名（加粗可改）+ 中社区名 + 右发帖按钮（主色填充） | ❌ 城市在「同城」横条、发帖为悬浮 FAB | ✅ 顶部功能栏补齐：左侧城市胶囊（点击开城市选择弹层，仅校园圈模式）+ 中间社区名 + 右侧主色「发帖」按钮（跳发帖页）；原同城横条移除 |
| 一级 tab：关注/同城/发现，选中主色下划线+加粗 | ⚠️ 胶囊填充样式 | ✅ BaseTabs 改用 `variant="underline"` |
| 二级 tab（仅发现页）：校友/老乡/搭子圈，默认选中校友 | ⚠️ 多「全部」且默认「全部」 | ✅ 移除「全部」，默认 `discover-alumni` |
| 关注=匹配中点喜欢的人 / 同城=定位城市 / 发现=综合推荐 | ⚠️ 关注按 isFollowed 过滤；发现被 campusCirclePosts 二次过滤（非校友隐藏） | 数据语义项，列入遗留项（见下） |
| 帖子信息流元素齐全、跳转正确 | ✅ | — |

## 五、我的页

| 需求 | 审计结论 | 修复动作 |
|---|---|---|
| 头部区：左圆形头像 + 右昵称/认证/签名/编辑按钮 | ⚠️ 纵向居中布局 | ✅ 头像 + 信息改为横排（`.profile-info__main` + `.profile-info__right`），编辑资料按钮移入信息右侧列 |
| 数据统计栏：关注/粉丝/获赞，点击进列表页 | ⚠️ 不可点击、无列表页 | ✅ 统计项可点击（轻振动 + 提示）；列表页依赖关注/粉丝接口，列为遗留项 |
| 核心功能区：语音介绍 + 我的动态两张均等卡片 | ⚠️ 两个全宽区块 | ⚠️ 部分：语音区块改名「语音介绍」并新增「仅语音 · 无视频」标注；两卡并排布局需重构录音/播放 UI，列为遗留项 |
| 语音：最长 60s、无视频、时长+播放按钮 | ✅（标注已补） | — |
| 设置列表：任务中心→帮助客服→安全中心→隐私权限设置→通用设置 | ❌ 顺序打散、通用设置独立成组、文案「权限」 | ✅ 列表重排为规范顺序，通用设置并入主列表（文案改「通用设置」），权限项改名「隐私权限设置」 |
| 隐私开关「允许将我推荐给本校学生」 | ⚠️ 文案「推荐给本校学生」 | ✅ 文案改为「允许将我推荐给本校学生」；开关即时生效、关闭不外推/可正常浏览同校 |

---

## 六、遗留项（需后端接口或大范围重构，建议后续迭代）

1. **匹配页筛选「附近」在 real 模式的 API 透传**：已透传 `distanceMax`，后端需实际支持。
2. **动态预览点击进入详情页的完整链路**：目前点击打开全屏详情层（含私信按钮），独立动态详情页待建。
3. **消息页「前 2 位模糊 + 中部解锁提示」**：likes/visitors 页目前全量直出，模糊解锁模式需页面重构。
4. **官方账号参与会话时间排序**：需后端固定会话（产品助手/活动官）数据接入。
5. **我的页统计栏列表页（关注/粉丝/获赞）**：需后端列表接口。
6. **我的页「语音介绍 + 我的动态」双卡片并排布局**：当前为全宽区块 + 「仅语音无视频」标注，卡片化需重构录音/播放组件。
7. **圈子页数据语义**：关注流按 isFollowed 而非匹配喜欢；发现流被同校过滤；老乡按字符串匹配而非籍贯字段——需后端按需求口径提供数据。

## 五·五、「附近的人」匿名匹配卡片改进（设计改进方案落地）

| 改进项 | 落地内容 |
|---|---|
| 蒙面匿名状态清晰化 | CardSwiper 新增 `masked` 模式（nearby 页开启）：背景大图模糊 + 身份区小头像模糊 + 昵称隐藏为 `????`；卡片中上部展示「🔒 互发喜欢解锁头像」规则提示条（替代突兀大号问号） |
| 信息补全 | 复用寻觅卡片结构：身份头部区（ID/双重认证可点弹详情/活跃/距离你Xkm）+ 基础资料横排（年龄/学校/学历/收入/身高/婚况）+ 自我描述 + 标签两行（喜好 + 星座/MBTI/性格）+ 期待画像 + 最新动态预览 |
| 弱化离线展示 | `activeStatusText=offline` 不再渲染到显眼位置（仅展示刚刚活跃/今天活跃等有意义的活跃信息） |
| 标签配色统一 | 匹配度标签由红棕渐变改为品牌主色（青藤绿）；去掉与「距离你同校」重复的独立「同校」胶囊 |
| 图片资源 | 测试用户 5-10 与体验账号 47 补 `users.avatar_url`（本地免费图 `/static/assets/images/avatars/avatar-N.jpg`，打包进包内离线可用），推荐接口已返回；头像上叠加品牌色蒙层保证色调统一 |
| 交互 | 堆叠卡片 + 左右滑（左=不喜欢/右=喜欢）+ 底部三按钮（悄悄话居中最大），与寻觅页一致 |

## 六、验证结果

- ✅ `vue-tsc --noEmit` 类型检查：0 错误
- ✅ 单元测试：88 个文件 / 1177 用例全部通过（Node 20 环境）
  - 同步更新 3 个受 tab 顺序影响的测试（navigation-config / custom-tab-bar / page-access-config）
  - 修复先前遗留的 i18n key 不一致（zh-CN 冗余 `storeErrors.campus.skipLabel`）
- ✅ `uni build --platform mp-weixin` 编译通过

### 运行时问题修复（微信开发者工具验证时发现）

**现象**：启动期 `GET /api/v1/app-config/login-hero` 返回 401 → SessionStore 进入离线模式 → `/recommendations`、`/check-in/status`、`/growth/social-progress` 等全部 401 级联。

**根因**：`/api/v1/app-config/login-hero` 是登录页启动期的公开配置接口，但 FIN-00061 收紧安全规则后 `/api/v1/**` 默认全部要求认证，该接口未被加入白名单。冷启动拉取登录页配置时 401，导致会话引导中断（即使 token 本身有效——日志中 `/auth/me` 返回 200）。

**修复**：`SecurityConfig.java` 与 `MockSecurityConfig.java` 白名单新增：
- `/api/v1/app-config/**`（登录页 Hero 等启动期静态配置）
- `/api/v1/location/ip-city`（IP 归属地查询，免登录浏览同城内容需要）

**注意**：需重新打包并重启后端生效（`apps/api/start-local.bat`）。

### 一键体验链路配置（2026-08-07）

目标：登录页「临时体验号」一键登录 → 资料已自动完善 → 全部页面可用。

1. **安全白名单**：`/api/v1/app-config/**` 与 `/api/v1/location/ip-city` 公开（见上）。
2. **体验账号资料自动预填**：`RealAuthService.loginAsGuest()` 首次创建体验账号时自动写入
   基本资料（昵称/简介/标签/身高/学历/婚况/籍贯/未来城市）+ 校园认证（verified，北京大学）
   + 课表偏好，`profile_completion=100` → 登录后无锁屏、全部页面可用（幂等，不影响已有账号）。
3. **本地种子数据**：`database/seed-test-users.sql`（测试用户 5-10，同校区北京大学，供推荐流）
   + `database/complete-guest-account.sql`（体验账号 47 资料完善），本地 MySQL 已执行。
4. **验证**（curl 实测通过）：`login-hero` 无令牌 200 → `guest-login` 返回
   `profileCompleted=true/campusVerified=true/scheduleCompleted=true` → `recommendations`
   /`check-in/status`/`growth/social-progress` 全部 200。

## 七、修复文件清单

- `apps/client/src/config/navigation.ts`、`pages.json`、`custom-tab-bar/index.{js,wxss}`、`App.vue`、`composables/useTabBar.ts`（导航栏）
- `apps/client/src/pages/discover/index.vue`、`components/discover/CardSwiper.vue`、`components/discover/QuickFilterSheet.vue`（新）、`stores/discover/{types,utils,index}.ts`、`stores/discover/actions/{fetch,filter}.ts`、`services/generated/api-types-supplement.ts`、`services/mocks/fixtures.ts`（匹配页）
- `apps/client/src/pages/chat/index.vue`（消息页）
- `apps/client/src/pages/village/index.vue`（圈子页）
- `apps/client/src/pages/profile/index.vue`（我的页）
- `apps/client/src/i18n/locales/{zh-CN,en-US}.ts`（文案）
- `apps/client/src/tests/{navigation-config,custom-tab-bar,page-access-config,i18n}.spec.ts`（测试同步）
- `DESIGN-AUDIT-FIX-REPORT.md`（本报告）
