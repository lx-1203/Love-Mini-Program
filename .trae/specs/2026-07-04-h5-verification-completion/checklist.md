# Checklist - H5 优先验证完成与最终视觉/功能收尾

## Phase A: H5 优先调试与 agent-browser 自动化验证
- [ ] H5 dev server 已启动且可访问 `http://localhost:5173`
- [ ] `.trae/screenshots/2026-07-04-h5-final/` 目录已创建
- [ ] agent-browser 可正常打开 H5 首页
- [ ] 8 个核心页面修复前截图已归档（01-login-before.png ~ 08-profile-before.png）
- [ ] 浏览器控制台日志已收集，404/JS 错误清单已汇总

## Phase B: 图片资源完整性补齐与显示修复
- [ ] `apps/client/src/static/assets/images/posters/` 包含 login-poster.jpg、home-poster.jpg，每个 ≥ 10KB
- [ ] `apps/client/src/static/assets/images/posts/` 包含至少 8 张帖子图片，每个 ≥ 10KB
- [ ] `apps/client/src/static/assets/images/activities/` 包含至少 3 张活动图片
- [ ] `apps/client/src/static/assets/images/products/` 包含至少 6 张商品图片
- [ ] `apps/client/src/static/assets/images/banners/` 包含 village-banner.jpg、home-banner.jpg
- [ ] `apps/client/src/static/assets/avatars/` 包含至少 12 张头像（avatar-1.jpg ~ avatar-12.jpg）
- [ ] 所有图片 MD5 互不相同（无重复内容）
- [ ] `apps/client/src/config/images.ts` 路径与实际文件名一致
- [ ] `apps/client/src/services/mocks/fixtures.ts` 中 avatar/images 字段使用本地路径
- [ ] `apps/client/src/components/common/SafeImage.vue` 加载失败时降级到 default-avatar.png
- [ ] SafeImage 加载失败时输出 console.warn 日志
- [ ] SafeImage 加载中显示灰色背景占位
- [ ] H5 中所有 `<img>` 标签实际加载图片（agent-browser 验证无空白）
- [ ] H5 浏览器控制台无 404 错误

## Phase C: 按钮点击响应与内容保持修复
- [ ] 所有跳转类按钮点击后正确跳转目标页
- [ ] 所有操作类按钮点击后触发 store action
- [ ] 点击「查看喜欢列表」按钮后跳转喜欢页，列表数据正常显示
- [ ] 点击「喜欢」按钮后卡片滑出动画
- [ ] 点击「立即签到」按钮后显示签到中状态
- [ ] 跳转后目标页内容正常显示（非空白）
- [ ] `pages/discover/index.vue` 的 page-fade-in CSS 动画正确触发
- [ ] `pages/likes/index.vue` 喜欢列表从 discover 跳转后数据可见
- [ ] `pages/village/index.vue` 帖子列表跳转后数据可见
- [ ] 快速切换 Tab 时页面内容不消失

## Phase D: 核心功能匹配与签到标签修复（TDD）
- [ ] `pages/discover/index.vue` 签到前显示「今日签到」卡片
- [ ] 签到前显示「今日签到」徽章
- [ ] `apps/client/src/stores/checkin.ts` 的 fetchStatus 正确设置 loading = false
- [ ] 点击「立即签到」后显示「签到中...」状态
- [ ] 签到成功后显示「签到成功」动画 3 秒
- [ ] 3 秒后自动切换为 benefits-section
- [ ] 签到后徽章变为「已签到」
- [ ] `apps/client/src/stores/discover.ts` swipeRight 在 mock 模式下 30% 概率 matched = true
- [ ] `apps/client/src/components/discover/CardSwiper.vue` 滑动事件正确触发
- [ ] 匹配成功时显示「匹配成功」toast
- [ ] 匹配成功时显示双头像碰撞动画
- [ ] 1.5 秒后跳转 `pages/likes/index`
- [ ] 喜欢列表显示已匹配用户在「匹配」分区
- [ ] 喜欢列表显示已喜欢未匹配用户在「喜欢」分区
- [ ] `apps/client/src/tests/stores/discover.spec.ts` 端到端用例已补充
- [ ] `apps/client/src/tests/stores/checkin.spec.ts` 端到端用例已补充
- [ ] `pnpm --filter client test:unit` 所有测试通过

## Phase E: 按钮反馈动画 H5 真机验证
- [ ] agent-browser 截图捕获到 Button ripple 动画中间帧
- [ ] Button 点击时有 scale(0.94) 缩放反馈
- [ ] Button loading 状态显示 spinner
- [ ] agent-browser 截图捕获到 Tab 指示条展开动画
- [ ] TabBar 切换图标 scale(1.15) + 颜色过渡
- [ ] `custom-tab-bar/index.js` 切换时触发 uni.vibrateShort
- [ ] `.press-feedback--active` 有 box-shadow + 透明度变化
- [ ] 所有按钮按压有视觉反馈（非仅震动）

## Phase F: 页面切换动画 H5 真机验证
- [ ] agent-browser 切换 Tab 截图捕获到页面淡入动画
- [ ] pageFadeIn 动画：opacity 0 → 1 + translateY(24rpx) → 0
- [ ] pageFadeIn 时长 350ms，缓动 cubic-bezier(0.16, 1, 0.3, 1)
- [ ] 快速切换 Tab 5 次时不再闪烁
- [ ] 快速切换 Tab 5 次时内容不消失
- [ ] `page-fade-in` CSS 动画在每次切换时重新触发
- [ ] agent-browser 截图捕获到首页推荐卡片 stagger 入场
- [ ] 寻觅页权益卡片有 stagger 入场
- [ ] 村口页帖子卡片有 stagger 入场
- [ ] 切换过程感知明显

## Phase G: 视觉层级与边缘 H5 真机验证
- [ ] agent-browser 截图验证卡片边缘清晰
- [ ] `elevation-1` 默认样式（`0 1rpx 4rpx rgba(15,23,42,0.04)`）显示
- [ ] `border-card` 默认样式（`1rpx solid rgba(15,23,42,0.08)`）显示
- [ ] `:active`/`hover` 升级到 `elevation-2` + `border-card-brand`
- [ ] agent-browser 截图验证图片分割明显
- [ ] 图片有 16rpx 圆角与轻微阴影
- [ ] 图片与背景分割明显
- [ ] 卡片标题左侧有 4rpx 宽、60rpx 高品牌色渐变竖线
- [ ] 首页卡片标题有品牌色竖线
- [ ] 寻觅页卡片标题有品牌色竖线
- [ ] 村口页卡片标题有品牌色竖线

## Phase H: 个人主页功能完善
- [ ] `apps/client/src/pages/profile/index.vue` 包含用户基本信息卡片
- [ ] 个人主页显示头像、昵称、学校、签名
- [ ] 个人主页显示 VIP 状态（若已开通）
- [ ] 个人主页显示我的动态列表
- [ ] 个人主页有「我的喜欢」入口
- [ ] 个人主页有「我的匹配」入口
- [ ] 个人主页有「设置」入口（跳转 `pages/settings/index.vue`）
- [ ] 个人主页有「反馈」入口
- [ ] 个人主页有「关于」入口
- [ ] 个人主页有「恋爱认证」入口（跳转 `pages/verification/index.vue`）
- [ ] 个人主页有「VIP 开通」入口（跳转 `pages/vip/index.vue`）
- [ ] `apps/client/src/stores/profile.ts` fetchProfile 在 onShow 时正确执行
- [ ] `apps/client/src/view-models/profile.ts` 数据转换逻辑正确
- [ ] 所有功能入口添加 press-feedback 工具类
- [ ] 所有功能入口可点击并有反馈动画
- [ ] 点击「我的喜欢」跳转喜欢页
- [ ] 点击「我的匹配」跳转匹配列表
- [ ] 点击「设置」跳转设置页
- [ ] 点击「反馈」跳转反馈页
- [ ] 点击「恋爱认证」跳转认证页
- [ ] 点击「VIP 开通」跳转 VIP 页
- [ ] agent-browser 截图验证个人主页功能完整

## Phase I: mp-weixin 架构适配真机验证
- [ ] 代码中无 `import.meta.env.DEV` 引用
- [ ] 代码中无 `backdrop-filter` 引用（或已降级到 background-color）
- [ ] 代码中无 `position: sticky` 引用（或已改为 fixed + 占位）
- [ ] 代码中无 `:hover` 伪类（或已改为 hover-class）
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
- [ ] `.trae/screenshots/2026-07-04-h5-final/h5-final-verification-report.md` 已生成
- [ ] H5 验证报告记录每个页面验证状态
- [ ] `.trae/screenshots/2026-07-04-mp-weixin-final/mp-weixin-final-verification-report.md` 已生成
- [ ] mp-weixin 验证报告记录每个页面验证状态

## 最终验收
- [ ] 用户反馈的 11 项问题全部修复
- [ ] H5 真机验证全部通过
- [ ] mp-weixin 真机验证全部通过
- [ ] 所有按钮有视觉反馈动画（非仅震动）
- [ ] Tab 切换有感知明显的动画
- [ ] 所有图片正常显示且分割清晰
- [ ] 卡片边缘与层级清晰
- [ ] 个人主页功能完整
- [ ] 蓝色品牌主题保持不变（color.brand.400 = #5B7FFF）
- [ ] 单元测试全部通过
- [ ] 验证报告生成完整
