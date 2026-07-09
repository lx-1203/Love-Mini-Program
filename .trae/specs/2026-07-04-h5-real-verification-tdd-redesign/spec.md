# H5 真实浏览器验证 + TDD 严格重做 Spec

## Why
前序 spec `2026-07-03-h5-first-comprehensive-polish` 与 `2026-07-04-h5-verification-completion` 均在代码层面声明已完成 Phase A-J，但 `tasks.md` 全部任务（`[ ]`）未实际执行：从未启动 agent-browser、从未截图归档、TDD 测试只补了 201 用例却未覆盖用户真机反馈的真实失败路径。导致 2026-07-04 17:51 用户再次反馈 11 项问题全部存在：图片未显示/分割不清、按钮点击内容消失、签到标签/匹配功能失效、个人主页不全、按钮仅震动无视觉反馈、Tab 切换无感知、边缘色与层级缺失。

根因：
1. **验证缺位**：所有「H5 真机验证」均未实际调用 agent-browser/Chrome DevTools MCP，仅靠单元测试通过即声称完成。
2. **TDD 倒置**：测试在代码后补写，无法证明其真正测试了失败路径；用户反馈的「点击后内容消失」「签到标签不显示」等核心场景从未写入测试。
3. **设计原则缺位**：修复偏重「补资源、加样式」，未遵循 frontend-skill 的「image-led hierarchy + restrained composition」与 web-design-guidelines 的「触控目标 ≥44px、对比度 AA、焦点可见」等基础规则。
4. **mp-weixin 适配错位**：未在 H5 验证通过前就尝试 mp-weixin 编译，导致问题在两端来回反复。

本 spec 采用 **真实浏览器先行 + TDD Red-Green-Refactor + 设计原则校验** 三重门控：
- 第一门：用 Chrome DevTools MCP（`mcp_Chrome_DevTools_MCP`）真实打开 H5，截图归档当前 8 个核心页面的真实状态（含 broken image、空白跳转、缺失动画），作为修复前基线。
- 第二门：每个修复点先写失败测试（RED），观看测试失败，再写最小代码通过（GREEN），再重构（REFACTOR）。测试用例必须覆盖用户反馈的具体失败场景（如「点击喜欢按钮后页面内容消失」「签到前签到标签不可见」）。
- 第三门：用 web-design-guidelines 校验最终页面，确保触控目标、对比度、焦点状态、可访问性达标；用 frontend-skill 校验视觉层次（image-led、单一视觉重心、克制配色）。

## What Changes

### A. 真实浏览器基线建立（P0，agent-browser + Chrome DevTools MCP）
- 使用 `mcp_Chrome_DevTools_MCP` 的 `new_page`/`navigate_page`/`take_screenshot`/`list_console_messages`/`list_network_requests` 工具
- 启动 H5 dev server（`pnpm --filter client dev:h5`）
- 真实打开 8 个核心页面，截图归档到 `.trae/screenshots/2026-07-04-real-baseline/`
- 每个页面收集控制台错误、网络 404、JS 异常
- 输出 `real-baseline-report.md`，逐页列出真实问题（而非预测问题）

### A.0 阻塞性 TypeError 修复（P0，TDD，前置阻塞）
- **背景**：H5 真实浏览器中访问 home/likes/village/messages/chat 5 个页面时，控制台抛出 `TypeError: Cannot assign to read only property '_' of object '#<Object>'`，导致页面内容消失、白屏。login/discover/profile 三个页面不受影响。
- **TDD Red**：在 `apps/client/src/tests/pages/home.spec.ts`、`likes.spec.ts`、`village.spec.ts`、`messages.spec.ts`、`chat.spec.ts` 写失败用例「渲染对应页面 SHALL NOT 抛出 `Cannot assign to read only property` 错误，SHALL 渲染出根容器内容」
- **根因调查**：Grep 搜索可疑模式（`Object.freeze`、`readonly`、`storeToRefs`、对 const 常量数组/对象的 push/splice/pop/shift/unshift/直接赋值），重点排查 5 个出错页面共同 import 的 SafeImage、IMAGE_PATHS、SocialProgressIndicator、SocialOnboardingOverlay、useSocialProgressStore、TIER_META、TIER_ORDER；必要时使用 Chrome DevTools MCP 捕获完整 stack trace
- **TDD Green**：最小修复（不重构无关代码），运行 `pnpm --filter client test:unit -- home.spec likes.spec village.spec messages.spec chat.spec` 验证通过
- **浏览器验证**：使用 Chrome DevTools MCP 重新访问 5 个页面，截图归档到 `.trae/screenshots/2026-07-04-real-baseline/02-home-after-fix.png` 等，确认 `list_console_messages` 无 TypeError
- **mp-weixin 兼容性**：修复方案 SHALL NOT 引入 `import.meta.env.DEV`、`backdrop-filter`、`position: sticky`、`:hover`、optional catch binding 等 mp-weixin 不兼容语法

### B. 图片真实加载修复（P0，TDD）
- 用 Chrome DevTools MCP 的 `list_network_requests` 抓取每个 `<img>` 的实际请求状态码
- 列出所有 404/4XX 图片请求，对照 `apps/client/src/static/assets/` 实际文件
- **TDD Red**：在 `apps/client/src/tests/components/SafeImage.spec.ts` 写失败用例「当图片 src 不存在时，组件 SHALL 在 200ms 内降级显示 default-avatar.png 并触发 onError 回调」
- **TDD Green**：增强 `SafeImage.vue` 实现 onError 链路 + 加载占位 + 降级 fallback
- **TDD Refactor**：抽取 useImageFallback composable
- 补齐所有缺失图片资源（每张 ≥ 10KB，MD5 唯一）
- 修复 `images.ts` / `fixtures.ts` 路径一致性
- 真实浏览器验证：所有 `<img>` 状态码 200，无 404，无 broken 图标

### C. 按钮点击响应与内容保持修复（P0，TDD）
- **TDD Red**：在 `apps/client/src/tests/pages/discover.spec.ts` 写失败用例：
  - 「点击喜欢按钮后，当前卡片 SHALL 滑出，下一张卡片 SHALL 在 300ms 内可见，页面内容 SHALL NOT 空白」
  - 「点击查看喜欢列表按钮后，跳转到 likes 页，列表 SHALL 在 500ms 内渲染至少 1 项」
- **TDD Green**：修复 `pages/discover/index.vue`、`pages/likes/index.vue` 的 `onShow` 数据加载与 `page-fade-in` CSS 动画时序
- 移除所有 `pageVisible.value = false; setTimeout(...)` 模式，改为纯 CSS 动画
- 真实浏览器验证：用 Chrome DevTools MCP `click` 工具点击按钮，`take_screenshot` 验证跳转后内容可见

### D. 签到标签与匹配功能 TDD 完整实现（P0，**BREAKING**）
- **BREAKING**：重写 `stores/discover.ts` 的 `swipeRight`，移除旧的「无匹配」实现，改为 mock 模式 30% 概率 `matched = true`，并触发 `lastMatchedUser` 状态
- **TDD Red**：在 `tests/stores/discover.spec.ts` 写失败用例：
  - 「mock 模式下 swipeRight 调用 10 次，至少 2 次返回 matched = true」
  - 「匹配成功后，matchedDialogVisible SHALL 为 true，1.5 秒后 SHALL 自动跳转 likes 页」
- **TDD Red**：在 `tests/stores/checkin.spec.ts` 写失败用例：
  - 「未签到时，checkInStore.checkedIn SHALL 为 false，loading SHALL 为 false」
  - 「调用 fetchStatus 后，loading SHALL 在 100ms 内变为 false」
  - 「调用 checkIn 后，showSuccessAnimation SHALL 为 true 持续 3 秒，之后 benefits-section SHALL 可见」
- **TDD Green**：修复 store 逻辑、`pages/discover/index.vue` 签到卡片渲染条件、签到徽章双向状态
- 真实浏览器验证：点击「立即签到」→ 截图签到成功动画 → 等 3 秒 → 截图 benefits-section

### E. 按钮视觉反馈动画真实捕获（P0，agent-browser）
- 用 Chrome DevTools MCP `click` + `take_screenshot` 在 100ms 间隔连续截图，捕获 ripple 动画中间帧
- **TDD Red**：在 `tests/components/Button.spec.ts` 写「点击按钮时，ripple 元素 SHALL 出现并扩散，scale SHALL 在 100ms 内从 0 变为 1，300ms 后消失」
- **TDD Green**：增强 `Button.vue` ripple 实现（CSS animation + JS 触发）
- 增强 `TabBar.vue` 切换动画：图标 scale(1.15) + 顶部 4rpx 品牌色指示条展开（250ms cubic-bezier(0.4, 0, 0.2, 1)）
- 增强 `press-feedback` 工具类：box-shadow + 透明度 + scale 三重反馈
- 真实浏览器验证：截图捕获动画中间帧，归档到 `.trae/screenshots/2026-07-04-animations/`

### F. 页面切换动画真实捕获（P0，agent-browser）
- 用 Chrome DevTools MCP `click` Tab + 50ms 间隔连续截图，捕获 pageFadeIn 中间帧
- **TDD Red**：写「Tab 切换时，页面内容 SHALL 在 350ms 内从 translateY(24rpx) opacity:0 过渡到 translateY(0) opacity:1」
- **TDD Green**：在 `theme/global.css` 定义 `@keyframes pageFadeIn`，所有 tab 页面根元素添加 `.page-fade-in` class，`onShow` 时移除并重新添加 class 触发动画
- 真实浏览器验证：快速切换 Tab 5 次，截图验证内容不消失

### G. 视觉层级与边缘强化（P0，frontend-skill + web-design-guidelines）
- 用 frontend-skill 原则重做视觉：
  - 每个页面单一视觉重心（寻觅页 = 卡片堆，首页 = 推荐海报，村口页 = 帖子流）
  - image-led hierarchy：所有 section 必须有真实图片作锚点，禁止纯文字卡片
  - 克制配色：保留蓝色品牌色 #5B7FFF 为唯一强调色，其余使用 slate 灰阶
  - 卡片仅在「卡片本身是交互对象」时使用（frontend-skill 规则）
- 用 web-design-guidelines 校验：
  - 触控目标 ≥ 44×44px（按钮、Tab 图标）
  - 文本对比度 ≥ 4.5:1（WCAG AA）
  - 焦点状态可见（`:focus-visible` outline）
  - 图片有 alt 文本
  - 禁止 `:hover` 在 mp-weixin（改 `hover-class`）
- **TDD Red**：在 `tests/visual/layering.spec.ts` 写「SectionCard 渲染时 SHALL 有 border 1rpx solid rgba(15,23,42,0.08) + box-shadow 0 1rpx 4rpx rgba(15,23,42,0.04)」
- **TDD Green**：在 `theme/design-variables.scss` 定义 `--c-elevation-1/2/3` + `--c-border-card` + `--c-border-card-brand`，所有卡片组件应用
- 强化图片分割：所有 `<image>` 有 16rpx 圆角 + box-shadow
- 强化卡片标题：左侧 4rpx×60rpx 品牌色渐变竖线
- 真实浏览器验证：截图所有页面，边缘清晰可见

### H. 个人主页功能 TDD 完整实现（P0）
- **TDD Red**：在 `tests/pages/profile.spec.ts` 写失败用例：
  - 「进入 profile 页，SHALL 渲染：用户卡片（头像+昵称+学校+签名）、VIP 状态、我的动态列表、7 个功能入口（喜欢/匹配/设置/反馈/关于/认证/VIP）」
  - 「点击每个功能入口，SHALL 跳转到对应页面，按钮 SHALL 有 press-feedback 动画」
- **TDD Green**：重写 `pages/profile/index.vue`，修复 `stores/profile.ts` onShow 加载
- 真实浏览器验证：截图个人主页，点击每个入口验证跳转

### I. mp-weixin 适配后置（P0）
- H5 全部真实浏览器验证通过后，才执行 `pnpm --filter client build:mp-weixin`
- Grep 检查 mp-weixin 不兼容语法：
  - `import.meta.env.DEV` → 移除
  - `backdrop-filter` → 降级 `background-color: rgba(255,255,255,0.85)`
  - `position: sticky` → 改 `fixed` + 占位
  - `:hover` → 改 `hover-class`
  - optional catch binding `catch {` → 改 `catch (e) {`
- 在微信开发者工具中导入 `apps/client/dist/build/mp-weixin/`，8 个核心页面真机截图归档

## Impact
- Affected specs:
  - `2026-07-04-h5-verification-completion`（前序未执行，本 spec 取代其执行阶段）
  - `2026-07-03-h5-first-comprehensive-polish`（前序基线）
  - `2026-07-02-core-experience-rebuild`（核心体验基线）
- Affected code:
  - **图片**：`apps/client/src/static/assets/images/*`、`apps/client/src/static/assets/avatars/*`、`apps/client/src/config/images.ts`、`apps/client/src/services/mocks/fixtures.ts`、`apps/client/src/components/common/SafeImage.vue`
  - **按钮**：`apps/client/src/components/common/Button.vue`、`apps/client/src/components/layout/TabBar.vue`、`apps/client/src/custom-tab-bar/index.js`、`apps/client/src/utils/haptic.ts`
  - **核心功能**：`apps/client/src/pages/discover/index.vue`、`apps/client/src/stores/discover.ts`、`apps/client/src/stores/checkin.ts`、`apps/client/src/components/discover/CardSwiper.vue`
  - **个人主页**：`apps/client/src/pages/profile/index.vue`、`apps/client/src/stores/profile.ts`、`apps/client/src/view-models/profile.ts`
  - **视觉**：`apps/client/src/theme/design-variables.scss`、`apps/client/src/theme/global.css`、`apps/client/src/components/common/SectionCard.vue`、`apps/client/src/components/common/Card.vue`、`apps/client/src/components/home/PersonCard.vue`
  - **测试**：`apps/client/src/tests/components/Button.spec.ts`、`apps/client/src/tests/components/SafeImage.spec.ts`、`apps/client/src/tests/stores/discover.spec.ts`、`apps/client/src/tests/stores/checkin.spec.ts`、`apps/client/src/tests/pages/discover.spec.ts`、`apps/client/src/tests/pages/profile.spec.ts`、`apps/client/src/tests/visual/layering.spec.ts`
- 不影响：后端 API、admin 后台、数据库结构、`apps/client/src/theme/tokens.ts` 中 `color.brand.400 = #5B7FFF` 蓝色品牌色定义

## ADDED Requirements

### Requirement: 阻塞性 TypeError 修复（前置）
H5 真实浏览器访问 home/likes/village/messages/chat 5 个页面时 SHALL NOT 抛出 `TypeError: Cannot assign to read only property '_' of object '#<Object>'`，页面 SHALL 渲染出根容器内容（非空白）。修复 SHALL 通过 TDD Red-Green 流程，并 SHALL NOT 引入 mp-weixin 不兼容语法。

#### Scenario: 5 个页面渲染无 TypeError
- **GIVEN** H5 dev server 已启动
- **WHEN** 用 Chrome DevTools MCP 依次访问 `/#/pages/home/index`、`/#/pages/likes/index`、`/#/pages/village/index`、`/#/pages/messages/index`、`/#/pages/chat/index`
- **THEN** 每个页面 `list_console_messages` 无 `Cannot assign to read only property` 错误
- **AND** 每个页面 `take_screenshot` 显示根容器内容（非白屏）

#### Scenario: TDD 测试覆盖 5 个页面
- **WHEN** 执行 `pnpm --filter client test:unit -- home.spec likes.spec village.spec messages.spec chat.spec`
- **THEN** 5 个 spec 全部通过
- **AND** 每个 spec 包含至少一条断言「渲染页面 SHALL NOT 抛出 readonly property 错误」

#### Scenario: 全套测试无回归
- **WHEN** 执行 `pnpm --filter client test:unit`
- **THEN** 所有现有测试仍通过（无回归）

### Requirement: 真实浏览器验证先行
开发流程 SHALL 使用 `mcp_Chrome_DevTools_MCP` 真实启动 H5 dev server 并打开浏览器，对 8 个核心页面（登录/首页/寻觅/喜欢/村口/消息/聊天/我的）截图归档、收集控制台错误与网络 404，作为修复前基线。任何修复声明 SHALL 附带真实浏览器截图作为证据。

#### Scenario: 真实浏览器基线建立
- **WHEN** 开发者开始本 spec 执行
- **THEN** 调用 `mcp_Chrome_DevTools_MCP` 的 `new_page` 创建浏览器页面
- **AND** 调用 `navigate_page` 访问 `http://localhost:5173/#/pages/login/index`
- **AND** 调用 `take_screenshot` 截图归档到 `.trae/screenshots/2026-07-04-real-baseline/01-login.png`
- **AND** 调用 `list_console_messages` 收集控制台错误
- **AND** 调用 `list_network_requests` 收集 404 网络请求
- **AND** 重复 8 个页面，生成 `real-baseline-report.md`

#### Scenario: 修复后真实浏览器验证
- **GIVEN** 修复完成
- **WHEN** 用 Chrome DevTools MCP 重新访问 8 个核心页面
- **THEN** 所有页面截图显示内容正常（无空白、无 broken image、无控制台错误）
- **AND** 截图归档到 `.trae/screenshots/2026-07-04-real-after/`

### Requirement: 图片真实加载与降级
所有 `<img>`/`<image>` SHALL 真实加载图片（HTTP 200），加载失败 SHALL 在 200ms 内降级显示 `default-avatar.png` 并触发 `onError` 回调与 console.warn。

#### Scenario: 图片网络请求全部 200
- **GIVEN** H5 dev server 已启动
- **WHEN** 用 Chrome DevTools MCP 访问首页、寻觅页、村口页、个人主页
- **THEN** `list_network_requests` 返回的所有图片请求状态码为 200
- **AND** 无 404 图片请求

#### Scenario: SafeImage 降级
- **GIVEN** SafeImage 组件 src 指向不存在的图片
- **WHEN** 组件渲染
- **THEN** 200ms 内显示 default-avatar.png
- **AND** 触发 onError 回调
- **AND** console.warn 输出错误信息

### Requirement: 按钮点击响应与内容保持
所有按钮点击后 SHALL 正确响应，跳转类按钮目标页内容 SHALL 在 500ms 内可见（非空白），操作类按钮 SHALL 触发 store action 并显示视觉反馈。

#### Scenario: 跳转按钮目标页内容可见
- **GIVEN** 用户在寻觅页
- **WHEN** 用 Chrome DevTools MCP `click` 工具点击「查看喜欢列表」按钮
- **THEN** 500ms 后 `take_screenshot` 显示喜欢列表至少 1 项内容
- **AND** 页面非空白

#### Scenario: 操作按钮触发反馈
- **GIVEN** 用户在寻觅页卡片前
- **WHEN** 用 Chrome DevTools MCP `click` 工具点击「喜欢」按钮
- **THEN** 当前卡片滑出动画
- **AND** 下一张卡片在 300ms 内可见
- **AND** 页面内容不空白

### Requirement: 签到标签显示
`pages/discover/index.vue` SHALL 在签到前显示「今日签到」卡片与「今日签到」徽章；签到成功后 3 秒内显示「签到成功」动画，3 秒后切换为 benefits-section，徽章变为「已签到」。

#### Scenario: 签到前签到卡片可见
- **GIVEN** 用户首次进入寻觅页且未签到
- **WHEN** 页面渲染完成
- **THEN** 顶部显示「今日签到」卡片，可见「今日签到」徽章
- **AND** checkInStore.checkedIn === false
- **AND** checkInStore.loading === false

#### Scenario: 签到后权益切换
- **GIVEN** 用户点击「立即签到」
- **WHEN** checkInStore.checkIn() 完成
- **THEN** 3 秒内显示「签到成功」动画
- **AND** 3 秒后切换为 benefits-section
- **AND** 徽章变为「已签到」

### Requirement: 匹配功能完整实现
`stores/discover.ts` 在 mock 模式下 SHALL 让 `swipeRight` 操作有 30% 概率返回 `matched = true`；匹配成功时 SHALL 显示 toast + 双头像碰撞动画，1.5 秒后跳转喜欢页。

#### Scenario: 右滑触发匹配
- **GIVEN** mock 模式下用户在寻觅页
- **WHEN** 右滑卡片或点击「喜欢」按钮 10 次
- **THEN** 至少 2 次显示「匹配成功」toast + 双头像碰撞动画
- **AND** 1.5 秒后跳转喜欢页

#### Scenario: 匹配历史联动
- **GIVEN** 已发生匹配
- **WHEN** 进入喜欢页
- **THEN** 已匹配用户显示在「匹配」分区
- **AND** 已喜欢未匹配用户显示在「喜欢」分区

### Requirement: 按钮视觉反馈动画
`Button.vue` 点击时 SHALL 展示 ripple 涟漪扩散动画（300ms）+ scale(0.94) 缩放反馈；`TabBar.vue` 切换时图标 SHALL scale(1.15) + 颜色过渡 + 顶部 4rpx 品牌色指示条展开（250ms）。Chrome DevTools MCP 100ms 间隔连续截图 SHALL 捕获到动画中间帧。

#### Scenario: 按钮点击有视觉反馈
- **GIVEN** 渲染一个 Button 组件
- **WHEN** 用 Chrome DevTools MCP `click` 工具点击按钮
- **THEN** 100ms 后截图显示 ripple 元素扩散
- **AND** 300ms 后截图显示 ripple 消失
- **AND** 按钮在点击时 scale(0.94)

#### Scenario: Tab 切换有动画
- **GIVEN** 用户在首页 Tab
- **WHEN** 用 Chrome DevTools MCP `click` 工具点击匹配 Tab
- **THEN** 50ms 后截图显示匹配 Tab 图标 scale(1.15) 变蓝
- **AND** 顶部出现蓝色指示条展开动画
- **AND** 250ms 后动画完成

### Requirement: 页面切换动画感知明显
所有 tab 页面 SHALL 在切换时触发淡入 + 上移动画（translateY(24rpx) → 0，opacity 0 → 1，时长 350ms，缓动 cubic-bezier(0.16, 1, 0.3, 1)）。Chrome DevTools MCP 50ms 间隔连续截图 SHALL 捕获到淡入中间帧，快速切换 5 次 SHALL NOT 闪烁或内容消失。

#### Scenario: Tab 切换有页面动画
- **GIVEN** 用户从首页切换到匹配页
- **WHEN** 匹配页 onShow 触发
- **THEN** 50ms 后截图显示页面内容 opacity 0.3 + translateY(12rpx)
- **AND** 200ms 后截图显示 opacity 0.8 + translateY(4rpx)
- **AND** 350ms 后截图显示 opacity 1 + translateY(0)

#### Scenario: 快速切换不闪烁
- **GIVEN** 用户在 5 秒内快速切换 Tab 5 次
- **WHEN** 切换完成
- **THEN** 最终页面内容正常显示
- **AND** 切换过程中无空白截图

### Requirement: 视觉层级系统完整
`apps/client/src/theme/design-variables.scss` SHALL 定义 `--c-elevation-1/2/3` 三级阴影与 `--c-border-card`/`--c-border-card-brand` 边框变量；所有卡片组件 SHALL 应用 elevation-1 + border-card 默认，active/hover 升级到 elevation-2 + border-card-brand；所有图片 SHALL 有 16rpx 圆角与轻微阴影；卡片标题左侧 SHALL 有 4rpx×60rpx 品牌色渐变竖线。

#### Scenario: 卡片有边框与阴影
- **WHEN** 渲染 SectionCard 组件
- **THEN** 卡片有 1rpx 边框 `rgba(15,23,42,0.08)`
- **AND** 卡片有阴影 `0 1rpx 4rpx rgba(15,23,42,0.04)`
- **AND** 卡片标题左侧有 4rpx 宽 60rpx 高品牌色渐变竖线

#### Scenario: 图片分割清晰
- **WHEN** 渲染任意 `<image>` 或 `<img>` 元素
- **THEN** 元素有 16rpx 圆角
- **AND** 元素有轻微阴影 `0 2rpx 8rpx rgba(15,23,42,0.06)`
- **AND** 与背景分割明显

### Requirement: 个人主页功能完整
`pages/profile/index.vue` SHALL 包含：用户信息卡片（头像、昵称、学校、签名）、VIP 状态、我的动态列表、7 个功能入口（喜欢/匹配/设置/反馈/关于/恋爱认证/VIP 开通），所有入口可点击并有 press-feedback 动画。

#### Scenario: 个人主页功能完整
- **GIVEN** 用户进入个人主页
- **WHEN** 页面渲染完成
- **THEN** 显示用户信息卡片（含头像、昵称、学校、签名）
- **AND** 显示 VIP 状态
- **AND** 显示我的动态列表
- **AND** 显示 7 个功能入口

#### Scenario: 功能入口可点击
- **WHEN** 用 Chrome DevTools MCP `click` 工具点击「我的喜欢」入口
- **THEN** 跳转到喜欢页
- **AND** 按钮有 press-feedback 动画

### Requirement: TDD 严格执行
所有修复 SHALL 遵循 Red-Green-Refactor：先写失败测试，观看测试失败，写最小代码通过，重构。测试用例 SHALL 覆盖用户反馈的具体失败场景。

#### Scenario: TDD Red 阶段
- **WHEN** 开发者开始修复某个问题
- **THEN** 先在对应 spec.ts 文件写失败测试用例
- **AND** 执行 `pnpm --filter client test:unit -- <spec>` 观看测试失败
- **AND** 失败原因 SHALL 是功能未实现，而非语法错误

#### Scenario: TDD Green 阶段
- **GIVEN** 测试已失败
- **WHEN** 开发者写最小代码通过测试
- **THEN** 执行 `pnpm --filter client test:unit -- <spec>` 验证测试通过
- **AND** 所有其他测试仍通过

### Requirement: mp-weixin 适配后置
H5 真实浏览器验证全部通过后，mp-weixin 编译 SHALL 无 `import.meta.env.DEV`、`backdrop-filter`、`position: sticky`、`:hover`、optional catch binding 等不兼容语法；8 个核心页面在微信开发者工具中正常渲染。

#### Scenario: H5 通过后才编译 mp-weixin
- **GIVEN** H5 真实浏览器验证全部通过
- **WHEN** 执行 `pnpm --filter client build:mp-weixin`
- **THEN** 编译成功无错误
- **AND** 构建产物中无禁用语法

#### Scenario: mp-weixin 真机渲染正常
- **GIVEN** 已构建 mp-weixin 产物
- **WHEN** 在微信开发者工具中打开 8 个核心页面
- **THEN** 所有页面图片显示、按钮响应、签到/匹配功能正常
- **AND** 无控制台错误

## MODIFIED Requirements

### Requirement: 微信小程序核心页面可用
`apps/client/src/pages/` 下所有页面 SHALL 在 H5 与 mp-weixin 双端正常渲染：图片加载无 404，按钮点击有视觉反馈，签到/匹配功能正常工作，Tab 切换有动画，层级与边缘清晰。所有修复 SHALL 通过真实浏览器验证（Chrome DevTools MCP 截图）+ TDD 测试通过。

#### Scenario: 寻觅页签到流程完整
- **GIVEN** H5 dev server 已启动
- **WHEN** 用 Chrome DevTools MCP 进入寻觅页 → 点击「立即签到」
- **THEN** 截图显示「签到中...」
- **AND** 截图显示「签到成功」动画
- **AND** 3 秒后截图显示权益卡片

#### Scenario: 寻觅页匹配流程完整
- **GIVEN** 已在寻觅页
- **WHEN** 用 Chrome DevTools MCP 右滑卡片或点击喜欢按钮 10 次
- **THEN** 至少 2 次截图显示「匹配成功」toast
- **AND** 1.5 秒后跳转喜欢页
- **AND** 喜欢页内容正常显示

### Requirement: 蓝色品牌主题保持
本次修复 SHALL NOT 修改 `apps/client/src/theme/tokens.ts` 中 `color.brand.400 = #5B7FFF` 的蓝色主色定义；所有新增动画、阴影、边框 SHALL 使用蓝色品牌色系。

#### Scenario: 品牌色未变更
- **WHEN** 读取 `apps/client/src/theme/tokens.ts`
- **THEN** `color.brand.400` 仍为 `#5B7FFF`

## REMOVED Requirements

### Requirement: 仅震动反馈
**Reason**: 用户反馈按钮只有震动反馈无视觉反馈，体验差。改为视觉动画 + 触觉反馈组合。
**Migration**: 所有按钮保留 `uni.vibrateShort` 触觉反馈，同时增加 ripple 涟漪动画 + scale 缩放视觉反馈，动画时长 300ms。

### Requirement: pageVisible 状态切换实现页面淡入
**Reason**: 当前实现 `pageVisible` 在 `onShow` 中先 `false` 再 `setTimeout 30ms` 设 `true`，快速切换时会闪烁或被中断，导致页面内容消失。
**Migration**: 改为纯 CSS 动画 `@keyframes pageFadeIn`，在 `onShow` 时直接添加 class 触发动画，不依赖 JS 状态切换。

### Requirement: 单元测试后补
**Reason**: 前序 spec 在代码修改后补写测试，测试通过即声称完成，但测试并未覆盖用户反馈的真实失败路径（如「点击后内容消失」），导致测试通过但用户问题仍存在。
**Migration**: 严格遵循 TDD Red-Green-Refactor，先写失败测试，观看测试失败，再写代码通过。测试用例 SHALL 直接对应用户反馈的具体场景。
