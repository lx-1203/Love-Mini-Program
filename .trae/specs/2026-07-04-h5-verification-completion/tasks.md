# Tasks - H5 优先验证完成与最终视觉/功能收尾

## Phase A: H5 优先调试与 agent-browser 自动化验证
- [ ] Task A1: 启动 H5 dev server 并准备 agent-browser 验证环境
  - [ ] SubTask A1.1: 启动 `pnpm --filter client dev:h5`，确认 H5 服务在 `http://localhost:5173` 可访问
  - [ ] SubTask A1.2: 创建 `.trae/screenshots/2026-07-04-h5-final/` 截图归档目录
  - [ ] SubTask A1.3: 使用 agent-browser 打开 H5 首页，确认页面可正常加载
- [ ] Task A2: H5 全页面截图基线（修复前）
  - [ ] SubTask A2.1: 截图登录页 → `01-login-before.png`
  - [ ] SubTask A2.2: 截图首页 → `02-home-before.png`
  - [ ] SubTask A2.3: 截图寻觅页 → `03-discover-before.png`
  - [ ] SubTask A2.4: 截图喜欢页 → `04-likes-before.png`
  - [ ] SubTask A2.5: 截图村口页 → `05-village-before.png`
  - [ ] SubTask A2.6: 截图消息页 → `06-messages-before.png`
  - [ ] SubTask A2.7: 截图聊天会话页 → `07-chat-session-before.png`
  - [ ] SubTask A2.8: 截图个人主页 → `08-profile-before.png`
- [ ] Task A3: 收集浏览器控制台日志
  - [ ] SubTask A3.1: 用 agent-browser 收集每个页面的 console 错误与 404
  - [ ] SubTask A3.2: 汇总错误清单到 `h5-final-verification-report.md`

## Phase B: 图片资源完整性补齐与显示修复
- [ ] Task B1: 审计图片资源现状
  - [ ] SubTask B1.1: 列出 `apps/client/src/static/assets/images/` 所有子目录与文件
  - [ ] SubTask B1.2: 列出 `apps/client/src/static/assets/avatars/` 所有文件
  - [ ] SubTask B1.3: 检查每个图片文件大小，标记 < 10KB 的占位文件
  - [ ] SubTask B1.4: 计算每个图片 MD5，标记重复文件
- [ ] Task B2: 补齐缺失图片资源
  - [ ] SubTask B2.1: 使用 `scripts/download-unique-images.mjs` 下载缺失图片到 `posters/`、`posts/`、`activities/`、`products/`、`banners/`
  - [ ] SubTask B2.2: 下载 12 张唯一头像到 `avatars/`（avatar-1.jpg ~ avatar-12.jpg），每张 MD5 唯一
  - [ ] SubTask B2.3: 验证所有图片大小 ≥ 10KB，MD5 互不相同
- [ ] Task B3: 修复图片路径配置
  - [ ] SubTask B3.1: 修复 `apps/client/src/config/images.ts` 中所有路径与实际文件名一致
  - [ ] SubTask B3.2: 修复 `apps/client/src/services/mocks/fixtures.ts` 中所有 `avatar`/`images` 字段使用本地路径
  - [ ] SubTask B3.3: 修复 `apps/client/src/config/assets-index.ts` 资源索引
- [ ] Task B4: 修复 SafeImage 组件
  - [ ] SubTask B4.1: 增强 `apps/client/src/components/common/SafeImage.vue` 加载失败时降级到 `default-avatar.png`
  - [ ] SubTask B4.2: 添加 `@error` 事件处理，错误时输出 console.warn 日志
  - [ ] SubTask B4.3: 添加 loading 占位骨架（图片加载中显示灰色背景）
- [ ] Task B5: H5 验证图片实际渲染
  - [ ] SubTask B5.1: 用 agent-browser 访问首页，检查所有 `<img>` 标签实际加载
  - [ ] SubTask B5.2: 用 agent-browser 访问寻觅页，检查推荐卡片头像与图片
  - [ ] SubTask B5.3: 用 agent-browser 访问村口页，检查帖子图片
  - [ ] SubTask B5.4: 用 agent-browser 访问个人主页，检查用户头像
  - [ ] SubTask B5.5: 收集浏览器控制台日志，确认无 404 错误

## Phase C: 按钮点击响应与内容保持修复
- [ ] Task C1: 排查按钮点击绑定
  - [ ] SubTask C1.1: Grep 所有 `@click`/`@tap` 绑定，列出按钮清单
  - [ ] SubTask C1.2: 逐个验证跳转类按钮是否正确跳转目标页
  - [ ] SubTask C1.3: 逐个验证操作类按钮是否触发 store action
- [ ] Task C2: 修复「点击进入后内容消失」问题
  - [ ] SubTask C2.1: 检查 `pages/discover/index.vue`、`pages/likes/index.vue`、`pages/village/index.vue` 的 `page-fade-in` CSS 动画是否正确触发
  - [ ] SubTask C2.2: 验证 Phase F 已移除 `pageVisible.value = false; setTimeout(...)` 模式
  - [ ] SubTask C2.3: 修复目标页 `onShow`/`onLoad` 数据加载逻辑，确保数据加载完成后才显示
  - [ ] SubTask C2.4: 修复 `pages/likes/index.vue` 喜欢列表加载逻辑，确保从 discover 跳转后数据可见
- [ ] Task C3: H5 验证按钮响应
  - [ ] SubTask C3.1: 用 agent-browser 点击首页所有按钮，验证跳转正确
  - [ ] SubTask C3.2: 用 agent-browser 点击寻觅页「喜欢」按钮，验证卡片滑出
  - [ ] SubTask C3.3: 用 agent-browser 点击寻觅页「立即签到」按钮，验证签到流程
  - [ ] SubTask C3.4: 用 agent-browser 验证跳转后目标页内容正常显示

## Phase D: 核心功能匹配与签到标签修复（TDD）
- [ ] Task D1: 修复签到标签显示
  - [ ] SubTask D1.1: 修复 `pages/discover/index.vue` 签到卡片渲染条件 `v-if="!checkInStore.checkedIn && !checkInStore.loading"`
  - [ ] SubTask D1.2: 修复 `apps/client/src/stores/checkin.ts` 的 `fetchStatus` 在 mock 模式下正确设置 `loading = false`
  - [ ] SubTask D1.3: 签到成功后 `showSuccessAnimation` 显示 3 秒，自动过渡到 benefits-section
  - [ ] SubTask D1.4: 添加签到徽章组件：签到前「今日签到」、签到后「已签到」
- [ ] Task D2: 修复匹配功能完整实现
  - [ ] SubTask D2.1: 修复 `apps/client/src/stores/discover.ts` 的 `swipeRight` 逻辑，mock 模式下 30% 概率 `matched = true`
  - [ ] SubTask D2.2: 修复 `apps/client/src/components/discover/CardSwiper.vue` 滑动事件绑定
  - [ ] SubTask D2.3: 匹配成功时显示 toast「匹配成功」+ 双头像碰撞动画
  - [ ] SubTask D2.4: 1.5 秒后跳转 `pages/likes/index`
  - [ ] SubTask D2.5: 修复匹配历史记录联动，喜欢列表显示已匹配用户
- [ ] Task D3: TDD 补充端到端测试
  - [ ] SubTask D3.1: 在 `apps/client/src/tests/stores/discover.spec.ts` 补充 swipeRight → matched → 跳转的端到端用例
  - [ ] SubTask D3.2: 在 `apps/client/src/tests/stores/checkin.spec.ts` 补充签到 → 3 秒动画 → benefits 切换的端到端用例
  - [ ] SubTask D3.3: 执行 `pnpm --filter client test:unit`，确保所有测试通过
- [ ] Task D4: H5 验证签到与匹配流程
  - [ ] SubTask D4.1: 用 agent-browser 进入寻觅页，验证签到卡片显示
  - [ ] SubTask D4.2: 点击「立即签到」，验证签到成功动画与权益卡片切换
  - [ ] SubTask D4.3: 右滑卡片多次，验证匹配成功 toast 与跳转
  - [ ] SubTask D4.4: 验证喜欢列表显示已匹配用户

## Phase E: 按钮反馈动画 H5 真机验证
- [ ] Task E1: 验证 Button 组件 ripple 动画
  - [ ] SubTask E1.1: 用 agent-browser 点击按钮，截图捕获 ripple 动画中间帧
  - [ ] SubTask E1.2: 验证 `:active` scale(0.94) 缩放反馈
  - [ ] SubTask E1.3: 验证 loading spinner 显示
- [ ] Task E2: 验证 TabBar 切换动画
  - [ ] SubTask E2.1: 用 agent-browser 切换 Tab，截图捕获指示条展开动画
  - [ ] SubTask E2.2: 验证图标 scale(1.15) + 颜色过渡
  - [ ] SubTask E2.3: 验证 `custom-tab-bar/index.js` 切换时 `uni.vibrateShort` 触觉反馈
- [ ] Task E3: 验证 press-feedback 工具类
  - [ ] SubTask E3.1: 用 agent-browser 按压卡片，验证 box-shadow + 透明度变化
  - [ ] SubTask E3.2: 验证所有按钮按压有视觉反馈（非仅震动）

## Phase F: 页面切换动画 H5 真机验证
- [ ] Task F1: 验证 page-fade-in 动画
  - [ ] SubTask F1.1: 用 agent-browser 切换 Tab，截图捕获页面淡入动画
  - [ ] SubTask F1.2: 验证切换过程感知明显，无闪烁
- [ ] Task F2: 验证快速切换稳定性
  - [ ] SubTask F2.1: 用 agent-browser 快速切换 Tab 5 次，验证内容不消失
  - [ ] SubTask F2.2: 验证 `page-fade-in` CSS 动画在每次切换时重新触发
- [ ] Task F3: 验证卡片入场 stagger 动画
  - [ ] SubTask F3.1: 用 agent-browser 进入首页，截图捕获推荐卡片错位入场
  - [ ] SubTask F3.2: 验证寻觅页权益卡片、村口页帖子卡片 stagger 入场

## Phase G: 视觉层级与边缘 H5 真机验证
- [ ] Task G1: 验证卡片层级系统
  - [ ] SubTask G1.1: 用 agent-browser 截图所有页面，验证卡片边缘清晰
  - [ ] SubTask G1.2: 验证 `elevation-1`/`border-card` 默认样式
  - [ ] SubTask G1.3: 验证 `:active`/`hover` 升级到 `elevation-2` + `border-card-brand`
- [ ] Task G2: 验证图片分割
  - [ ] SubTask G2.1: 用 agent-browser 截图，验证图片有圆角与阴影
  - [ ] SubTask G2.2: 验证图片与背景分割明显
- [ ] Task G3: 验证品牌色竖线装饰
  - [ ] SubTask G3.1: 用 agent-browser 截图，验证卡片标题左侧品牌色竖线
  - [ ] SubTask G3.2: 验证首页/寻觅页/村口页卡片标题竖线显示

## Phase H: 个人主页功能完善
- [ ] Task H1: 审计个人主页现状
  - [ ] SubTask H1.1: 阅读 `apps/client/src/pages/profile/index.vue` 当前实现
  - [ ] SubTask H1.2: 列出缺失功能模块
- [ ] Task H2: 补齐个人主页功能
  - [ ] SubTask H2.1: 添加用户基本信息卡片（头像、昵称、学校、签名）
  - [ ] SubTask H2.2: 添加 VIP 状态展示（若已开通）
  - [ ] SubTask H2.3: 添加我的动态列表（已发布帖子）
  - [ ] SubTask H2.4: 添加我的喜欢列表入口
  - [ ] SubTask H2.5: 添加我的匹配列表入口
  - [ ] SubTask H2.6: 验证设置入口（Phase K 已实现 `pages/settings/index.vue`）
  - [ ] SubTask H2.7: 添加反馈入口
  - [ ] SubTask H2.8: 验证恋爱认证入口（Phase K 已实现 `pages/verification/index.vue`）
  - [ ] SubTask H2.9: 验证 VIP 开通入口（Phase K 已实现 `pages/vip/index.vue`）
- [ ] Task H3: 修复 profile store 与 view-model
  - [ ] SubTask H3.1: 修复 `apps/client/src/stores/profile.ts` 数据加载逻辑，确保 `fetchProfile` 在 `onShow` 时正确执行
  - [ ] SubTask H3.2: 修复 `apps/client/src/view-models/profile.ts` 数据转换逻辑
- [ ] Task H4: 个人主页按钮反馈
  - [ ] SubTask H4.1: 所有功能入口添加 `press-feedback` 工具类
  - [ ] SubTask H4.2: 验证所有按钮可点击并有反馈动画
- [ ] Task H5: H5 验证个人主页
  - [ ] SubTask H5.1: 用 agent-browser 访问个人主页，截图验证功能完整
  - [ ] SubTask H5.2: 点击每个功能入口，验证跳转正确

## Phase I: mp-weixin 架构适配真机验证
- [ ] Task I1: 检查 mp-weixin 不兼容语法
  - [ ] SubTask I1.1: Grep `import.meta.env.DEV` 引用，全部移除
  - [ ] SubTask I1.2: Grep `backdrop-filter` 引用，降级到 `background-color: rgba(255,255,255,0.85)`
  - [ ] SubTask I1.3: Grep `position: sticky` 引用，改用 `fixed` + 占位
  - [ ] SubTask I1.4: Grep `:hover` 伪类，改用 `hover-class`
- [ ] Task I2: 执行 mp-weixin 编译
  - [ ] SubTask I2.1: 执行 `pnpm --filter client build:mp-weixin`
  - [ ] SubTask I2.2: 验证编译无错误
  - [ ] SubTask I2.3: 检查构建产物中无禁用语法
- [ ] Task I3: mp-weixin 真机验证
  - [ ] SubTask I3.1: 在微信开发者工具中打开 `apps/client/dist/build/mp-weixin/`
  - [ ] SubTask I3.2: 截图 8 个核心页面归档到 `.trae/screenshots/2026-07-04-mp-weixin-final/`
  - [ ] SubTask I3.3: 验证所有页面图片显示、按钮响应、签到/匹配功能正常
  - [ ] SubTask I3.4: 验证无控制台错误

## Phase J: 最终验证报告
- [ ] Task J1: 生成 H5 最终验证报告
  - [ ] SubTask J1.1: 汇总所有 H5 截图与控制台日志
  - [ ] SubTask J1.2: 生成 `.trae/screenshots/2026-07-04-h5-final/h5-final-verification-report.md`
  - [ ] SubTask J1.3: 记录每个页面验证状态与修复内容
- [ ] Task J2: 生成 mp-weixin 最终验证报告
  - [ ] SubTask J2.1: 汇总 mp-weixin 构建产物与真机截图
  - [ ] SubTask J2.2: 生成 `.trae/screenshots/2026-07-04-mp-weixin-final/mp-weixin-final-verification-report.md`
  - [ ] SubTask J2.3: 记录每个页面验证状态与修复内容

# Task Dependencies
- [Phase B] depends on [Phase A]（需要 H5 环境验证图片渲染）
- [Phase C] depends on [Phase B]（图片显示后再验证按钮跳转后内容）
- [Phase D] depends on [Phase C]（按钮响应修复后再验证签到/匹配功能）
- [Phase E] depends on [Phase D]（功能修复后再验证按钮动画）
- [Phase F] depends on [Phase E]（按钮动画后再验证页面切换动画）
- [Phase G] depends on [Phase F]（页面动画后再验证视觉层级）
- [Phase H] depends on [Phase G]（视觉层级后再完善个人主页）
- [Phase I] depends on [Phase H]（H5 全部通过后再适配 mp-weixin）
- [Phase J] depends on [Phase I]（mp-weixin 验证后做最终报告）

# Parallelizable Work
- [Phase E] 按钮动画验证 与 [Phase F] 页面动画验证 可并行（不同组件）
- [Phase H] 个人主页完善 与 [Phase G] 视觉层级验证 可并行（不同文件）
