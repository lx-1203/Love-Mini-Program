# Checklist - H5 真实浏览器验证 + TDD 严格重做

## Phase A: 真实浏览器基线建立
- [ ] H5 dev server 已启动且可访问 `http://localhost:5173`
- [ ] `.trae/screenshots/2026-07-04-real-baseline/` 目录已创建
- [ ] Chrome DevTools MCP `new_page` 已成功创建浏览器页面
- [ ] 8 个核心页面修复前截图已归档（01-login-baseline.png ~ 08-profile-baseline.png）
- [ ] 每个页面 `list_console_messages` 输出已收集
- [ ] 每个页面 `list_network_requests` 4XX/5XX 请求已收集
- [ ] `real-baseline-report.md` 已生成，逐页列出真实问题
- [ ] 用户反馈的 11 项问题已在基线截图中找到对应证据

## Task A5: 阻塞性 TypeError 修复（前置）
- [ ] `apps/client/src/tests/pages/home.spec.ts` 失败用例已写（渲染 SHALL NOT 抛出 readonly property 错误）
- [ ] `apps/client/src/tests/pages/likes.spec.ts` 失败用例已写
- [ ] `apps/client/src/tests/pages/village.spec.ts` 失败用例已写
- [ ] `apps/client/src/tests/pages/messages.spec.ts` 失败用例已写
- [ ] `apps/client/src/tests/pages/chat.spec.ts` 失败用例已写
- [ ] 5 个 spec 执行后观看到失败（RED 验证）
- [ ] Grep `\.(push|splice|pop|shift|unshift)\(` 在 `apps/client/src/` 已执行并分析
- [ ] Grep `Object\.freeze`/`readonly`/`storeToRefs` 在 `apps/client/src/` 已执行并分析
- [ ] 5 个出错页面共同 import（SafeImage/IMAGE_PATHS/SocialProgressIndicator/SocialOnboardingOverlay/useSocialProgressStore/TIER_META/TIER_ORDER）已排查
- [ ] 必要时 Chrome DevTools MCP 已捕获完整 stack trace
- [ ] 根因已定位并记录（具体到文件 + 行号 + 触发代码）
- [ ] 最小修复已实施（不重构无关代码）
- [ ] 修复未引入 `import.meta.env.DEV`/`backdrop-filter`/`position: sticky`/`:hover`/optional catch binding
- [ ] `pnpm --filter client test:unit -- home.spec likes.spec village.spec messages.spec chat.spec` 5 个 spec 全部通过（GREEN 验证）
- [ ] Chrome DevTools MCP 重新访问 5 个页面，`list_console_messages` 无 `Cannot assign to read only property` 错误
- [ ] 修复后截图已归档（02-home-after-fix.png / 04-likes-after-fix.png / 05-village-after-fix.png / 06-messages-after-fix.png / 07-chat-after-fix.png）
- [ ] `pnpm --filter client test:unit` 全套测试无回归

## Phase B: 图片真实加载修复（TDD）
- [ ] `tests/components/SafeImage.spec.ts` 失败用例已写（src 不存在时降级）
- [ ] 失败用例执行后观看到失败（RED 验证）
- [ ] `SafeImage.vue` onError 链路已实现
- [ ] 加载占位骨架已实现（灰色背景）
- [ ] onError 回调 + console.warn 已实现
- [ ] 测试通过（GREEN 验证）
- [ ] useImageFallback composable 已抽取（REFACTOR）
- [ ] `apps/client/src/static/assets/images/posters/` 包含 login-poster.jpg、home-poster.jpg（每个 ≥ 10KB）
- [ ] `apps/client/src/static/assets/images/posts/` 包含至少 8 张帖子图片（每个 ≥ 10KB）
- [ ] `apps/client/src/static/assets/images/activities/` 包含至少 3 张活动图片
- [ ] `apps/client/src/static/assets/images/products/` 包含至少 6 张商品图片
- [ ] `apps/client/src/static/assets/images/banners/` 包含 village-banner.jpg、home-banner.jpg
- [ ] `apps/client/src/static/assets/avatars/` 包含至少 12 张头像（avatar-1.jpg ~ avatar-12.jpg）
- [ ] 所有图片 MD5 互不相同
- [ ] `apps/client/src/config/images.ts` 路径与实际文件名一致
- [ ] `apps/client/src/services/mocks/fixtures.ts` avatar/images 字段使用本地路径
- [ ] `apps/client/src/config/assets-index.ts` 资源索引修复
- [ ] Chrome DevTools MCP `list_network_requests` 验证所有图片请求 200
- [ ] Chrome DevTools MCP `list_console_messages` 无 404 错误

## Phase C: 按钮点击响应与内容保持修复（TDD）
- [ ] `tests/pages/discover.spec.ts` 失败用例已写（点击喜欢后卡片滑出 + 下一张可见）
- [ ] 失败用例已写（跳转 likes 后 500ms 内渲染至少 1 项）
- [ ] 失败用例已写（快速切换 Tab 5 次内容不消失）
- [ ] 失败用例执行后观看到失败（RED 验证）
- [ ] `pages/discover/index.vue` 喜欢按钮逻辑已修复
- [ ] `pages/likes/index.vue` onShow 数据加载已修复
- [ ] 所有 `pageVisible.value = false; setTimeout(...)` 模式已移除
- [ ] `theme/global.css` 已定义 `@keyframes pageFadeIn`
- [ ] 所有 tab 页面根元素添加 `.page-fade-in` class
- [ ] 测试通过（GREEN 验证）
- [ ] Chrome DevTools MCP `click` 验证首页所有按钮跳转正确
- [ ] Chrome DevTools MCP `click` 点击「喜欢」按钮后截图显示卡片滑出
- [ ] Chrome DevTools MCP `click` 点击「立即签到」后截图显示签到流程
- [ ] Chrome DevTools MCP 验证跳转后目标页内容正常显示

## Phase D: 签到标签与匹配功能 TDD 完整实现
- [ ] `tests/stores/checkin.spec.ts` 失败用例已写（未签到状态）
- [ ] 失败用例已写（fetchStatus 后 loading 时序）
- [ ] 失败用例已写（checkIn 后 showSuccessAnimation 3 秒）
- [ ] 失败用例已写（3 秒后 benefits-section 可见）
- [ ] `tests/pages/discover.spec.ts` 失败用例已写（签到卡片可见 + 徽章双向状态）
- [ ] RED 验证通过
- [ ] `stores/checkin.ts` fetchStatus 时序已修复
- [ ] `pages/discover/index.vue` 签到卡片渲染条件已修复
- [ ] 签到徽章双向状态已实现（今日签到 / 已签到）
- [ ] showSuccessAnimation 3 秒自动切换 benefits 已实现
- [ ] GREEN 验证通过
- [ ] `tests/stores/discover.spec.ts` 失败用例已写（swipeRight 10 次至少 2 次 matched）
- [ ] 失败用例已写（matchedDialogVisible === true）
- [ ] 失败用例已写（1.5 秒后跳转 likes 页）
- [ ] 失败用例已写（喜欢列表显示已匹配用户）
- [ ] RED 验证通过
- [ ] `stores/discover.ts` swipeRight 已重写（30% 概率 matched）
- [ ] `components/discover/CardSwiper.vue` 滑动事件已修复
- [ ] 匹配成功 toast + 双头像碰撞动画已实现
- [ ] 1.5 秒后跳转 likes 页已实现
- [ ] 匹配历史记录联动已修复
- [ ] GREEN 验证通过
- [ ] Chrome DevTools MCP 截图验证签到卡片显示
- [ ] Chrome DevTools MCP `click` 验证签到成功动画
- [ ] 等 3 秒后截图验证 benefits-section
- [ ] Chrome DevTools MCP `click` 右滑 10 次验证匹配成功 toast
- [ ] 等 1.5 秒后截图验证跳转 likes 页

## Phase E: 按钮视觉反馈动画真实捕获
- [ ] `tests/components/Button.spec.ts` 失败用例已写（ripple 出现并扩散）
- [ ] 失败用例已写（scale 0.94 + 松开回弹）
- [ ] 失败用例已写（loading spinner）
- [ ] RED 验证通过
- [ ] `components/common/Button.vue` ripple 实现已增强
- [ ] `:active` scale(0.94) 反馈已添加
- [ ] loading spinner 样式已添加
- [ ] GREEN 验证通过
- [ ] `components/layout/TabBar.vue` 图标 scale(1.15) + 颜色过渡已添加
- [ ] 顶部 4rpx 品牌色指示条展开动画已添加
- [ ] `custom-tab-bar/index.js` 同步动画已添加
- [ ] `uni.vibrateShort` 触觉反馈已保留
- [ ] `.press-feedback--active` box-shadow + 透明度变化已添加
- [ ] transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1) 已添加
- [ ] Chrome DevTools MCP `click` + 100ms 间隔连续截图捕获 ripple 中间帧
- [ ] 截图归档到 `.trae/screenshots/2026-07-04-animations/01-button-ripple-*.png`
- [ ] Chrome DevTools MCP `click` Tab + 50ms 间隔截图捕获指示条展开
- [ ] 截图归档到 `02-tab-indicator-*.png`
- [ ] 所有按钮按压有视觉反馈（非仅震动）

## Phase F: 页面切换动画真实捕获
- [ ] 失败用例已写（350ms 内从 translateY(24rpx) opacity:0 过渡到 translateY(0) opacity:1）
- [ ] 失败用例已写（快速切换 5 次不闪烁不消失）
- [ ] RED 验证通过
- [ ] `theme/global.css` `@keyframes pageFadeIn` 已定义
- [ ] 所有 tab 页面根元素添加 `.page-fade-in` class
- [ ] `onShow` 时移除并重新添加 class 触发动画
- [ ] stagger 100ms 错位入场动画已添加
- [ ] GREEN 验证通过
- [ ] Chrome DevTools MCP `click` Tab + 50ms 间隔连续 `take_screenshot`
- [ ] 截图归档到 `.trae/screenshots/2026-07-04-animations/03-page-fade-*.png`
- [ ] 快速切换 Tab 5 次截图验证内容不消失
- [ ] 切换过程感知明显

## Phase G: 视觉层级与边缘强化（frontend-skill + web-design-guidelines）
- [ ] `tests/visual/layering.spec.ts` 失败用例已写（SectionCard border + box-shadow）
- [ ] 失败用例已写（卡片标题左侧品牌色竖线）
- [ ] 失败用例已写（图片 16rpx 圆角 + box-shadow）
- [ ] RED 验证通过
- [ ] `theme/design-variables.scss` `--c-elevation-1/2/3` 已定义
- [ ] `--c-border-card` + `--c-border-card-brand` 已定义
- [ ] `components/common/SectionCard.vue` 应用 elevation-1 + border-card
- [ ] `components/common/Card.vue`、`PersonCard.vue` 同步应用
- [ ] 所有 `<image>` 添加 16rpx 圆角 + box-shadow
- [ ] 卡片标题左侧添加 4rpx×60rpx 品牌色渐变竖线
- [ ] GREEN 验证通过
- [ ] frontend-skill 视觉原则校验：每个页面单一视觉重心
- [ ] frontend-skill 校验：image-led hierarchy（所有 section 有真实图片锚点）
- [ ] frontend-skill 校验：克制配色（蓝色 #5B7FFF 为唯一强调色）
- [ ] frontend-skill 校验：卡片仅在「卡片本身是交互对象」时使用
- [ ] web-design-guidelines 校验：触控目标 ≥ 44×44px
- [ ] web-design-guidelines 校验：文本对比度 ≥ 4.5:1（WCAG AA）
- [ ] web-design-guidelines 校验：焦点状态可见（`:focus-visible` outline）
- [ ] web-design-guidelines 校验：图片 alt 文本
- [ ] web-design-guidelines 校验：mp-weixin `:hover` 改 `hover-class`
- [ ] Chrome DevTools MCP 截图验证卡片边缘清晰
- [ ] Chrome DevTools MCP 截图验证图片分割明显
- [ ] Chrome DevTools MCP 截图验证品牌色竖线显示

## Phase H: 个人主页功能 TDD 完整实现
- [ ] `tests/pages/profile.spec.ts` 失败用例已写（用户卡片渲染）
- [ ] 失败用例已写（VIP 状态显示）
- [ ] 失败用例已写（我的动态列表）
- [ ] 失败用例已写（7 个功能入口）
- [ ] 失败用例已写（功能入口跳转 + press-feedback）
- [ ] RED 验证通过
- [ ] `pages/profile/index.vue` 用户信息卡片已重写
- [ ] VIP 状态展示已添加
- [ ] 我的动态列表已添加
- [ ] 7 个功能入口已添加（喜欢/匹配/设置/反馈/关于/认证/VIP）
- [ ] `stores/profile.ts` onShow 加载逻辑已修复
- [ ] `view-models/profile.ts` 数据转换已修复
- [ ] 所有功能入口添加 press-feedback
- [ ] GREEN 验证通过
- [ ] Chrome DevTools MCP 截图验证个人主页功能完整
- [ ] Chrome DevTools MCP `click` 点击每个功能入口验证跳转正确
- [ ] 截图归档到 `.trae/screenshots/2026-07-04-real-after/08-profile-after.png`

## Phase I: mp-weixin 适配后置
- [ ] 代码中无 `import.meta.env.DEV` 引用
- [ ] 代码中无 `backdrop-filter` 引用（或已降级到 background-color）
- [ ] 代码中无 `position: sticky` 引用（或已改为 fixed + 占位）
- [ ] 代码中无 `:hover` 伪类（或已改为 hover-class）
- [ ] 代码中无 optional catch binding `catch {`
- [ ] CSS 变量在 mp-weixin 中正常解析
- [ ] `pnpm --filter client build:mp-weixin` 编译无错误
- [ ] 构建产物中无禁用语法
- [ ] `.trae/screenshots/2026-07-04-mp-weixin-final/` 目录已创建
- [ ] 8 个核心页面 mp-weixin 截图已归档
- [ ] mp-weixin 中所有页面图片显示正常
- [ ] mp-weixin 中按钮响应正常
- [ ] mp-weixin 中签到/匹配功能正常
- [ ] mp-weixin 控制台无错误

## Phase J: 最终验证报告
- [ ] `.trae/screenshots/2026-07-04-real-after/h5-real-verification-report.md` 已生成
- [ ] H5 验证报告记录每个页面修复前后对比
- [ ] `.trae/screenshots/2026-07-04-mp-weixin-final/mp-weixin-final-verification-report.md` 已生成
- [ ] mp-weixin 验证报告记录每个页面验证状态
- [ ] `pnpm --filter client test:unit` 所有测试通过
- [ ] 测试覆盖率报告已输出
- [ ] TDD Red-Green-Refactor 执行证据已记录

## 最终验收
- [ ] 用户反馈的 11 项问题全部修复
- [ ] H5 真实浏览器验证全部通过（Chrome DevTools MCP 截图为证）
- [ ] mp-weixin 真机验证全部通过
- [ ] 所有按钮有视觉反馈动画（非仅震动）
- [ ] Tab 切换有感知明显的动画
- [ ] 所有图片正常显示且分割清晰
- [ ] 卡片边缘与层级清晰
- [ ] 个人主页功能完整
- [ ] 蓝色品牌主题保持不变（color.brand.400 = #5B7FFF）
- [ ] 单元测试全部通过（TDD 严格执行）
- [ ] frontend-skill 视觉原则校验通过
- [ ] web-design-guidelines 校验通过
- [ ] 验证报告生成完整
