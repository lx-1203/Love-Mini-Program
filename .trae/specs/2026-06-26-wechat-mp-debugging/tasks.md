# 微信小程序真机调试与多机型适配 - 实施计划

## [x] Task 1: 环境检查与依赖验证
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 检查apps/client目录下的node_modules是否存在
  - 验证pnpm、node等开发工具版本
  - 检查项目配置文件（manifest.json、project.config.json、pages.json）的完整性
  - 检查微信小程序appid配置，必要时使用测试号配置
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-1.1: 执行 `pnpm install` 无错误（如需安装依赖）
  - `programmatic` TR-1.2: 验证配置文件JSON格式正确，无语法错误
  - `human-judgement` TR-1.3: 确认manifest.json中mp-weixin配置存在
- **Notes**: 如果appid为空，使用微信测试号"touristappid"或提示用户配置

## [x] Task 2: 首次编译尝试与编译错误修复
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在apps/client目录执行 `pnpm dev:mp-weixin` 进行首次编译
  - 收集所有编译错误信息
  - 逐一修复TypeScript类型错误、导入错误、语法错误等编译问题
  - 反复编译直到无error级别的错误
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-2.1: `pnpm dev:mp-weixin` 编译成功完成，退出码为0或watch模式正常启动
  - `programmatic` TR-2.2: 编译输出中error数量为0
  - `programmatic` TR-2.3: dist/dev/mp-weixin目录存在且包含完整小程序文件（app.js、app.json、app.wxss等）
- **Notes**: 允许存在warning，但不能有error；注意SVG图标在小程序中的兼容性问题

## [x] Task 3-5: 运行时调试、路由修复、静态资源与TabBar修复
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 在微信开发者工具中导入dist/dev/mp-weixin目录
  - 检查控制台的运行时错误（JS异常）
  - 修复App.vue、main.ts等入口文件的运行时问题
  - 确保小程序能够正常启动，不闪退不白屏
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 开发者工具中项目成功打开，无项目加载失败提示
  - `human-judgement` TR-3.2: 控制台无Uncaught Exception或致命错误
  - `human-judgement` TR-3.3: 小程序启动后停留在登录页，无白屏
- **Notes**: 由于自动化限制，这一步主要通过代码层面修复可能的运行时问题，并提供详细的开发者工具操作说明

## [ ] Task 4: 页面路由与导航修复
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 检查pages.json中所有页面路径是否对应实际文件
  - 验证subPackages分包配置是否正确
  - 修复页面文件缺失、路径错误等问题
  - 确保所有页面组件能够正常导入和渲染
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `programmatic` TR-4.1: pages.json中所有path对应的.vue文件都存在
  - `programmatic` TR-4.2: 分包配置的root路径正确，页面文件存在
  - `human-judgement` TR-4.3: 各页面组件导入无错误，可正常渲染
- **Notes**: 检查pages目录和src/pages目录是否有重复或冲突

## [ ] Task 5: 静态资源与TabBar修复
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 检查TabBar配置的图标文件是否存在（注意微信小程序TabBar不支持SVG）
  - 将SVG图标转换为PNG格式或调整配置
  - 检查所有图片、图标等静态资源路径
  - 修复资源加载404问题
- **Acceptance Criteria Addressed**: [AC-4, AC-7]
- **Test Requirements**:
  - `programmatic` TR-5.1: 检查TabBar图标文件是否为小程序支持的格式（png/jpg）
  - `programmatic` TR-5.2: 所有引用的静态资源文件路径正确且存在
  - `human-judgement` TR-5.3: TabBar正常显示5个Tab，图标不缺失
- **Notes**: 微信小程序原生TabBar不支持SVG，需要转换或使用自定义TabBar方案

## [x] Task 6-9: 登录流程、页面布局、多机型适配、组件交互修复
- **Priority**: medium
- **Depends On**: Task 5
- **Description**: 
  - 检查登录页面逻辑
  - 配置或验证Mock数据模式，确保无需后端也能进入首页
  - 修复登录流程中的API调用、状态管理问题
  - 确保session守卫、页面权限控制正常工作
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `programmatic` TR-6.1: Mock模式配置正确，API调用有mock响应
  - `human-judgement` TR-6.2: 登录流程可完成，成功跳转首页
  - `human-judgement` TR-6.3: Pinia stores正常初始化，无状态错误
- **Notes**: 检查env.ts中的环境配置，确保可以切换到mock模式

## [ ] Task 7: 核心页面布局与样式修复
- **Priority**: high
- **Depends On**: Task 6
- **Description**: 
  - 逐一检查核心页面（首页、匹配、聊天、村口、我的）的布局
  - 修复CSS样式问题：rpx单位使用、flex布局、安全区域适配
  - 修复uni-app组件在小程序端的兼容性问题
  - 处理自定义导航栏、状态栏高度适配
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgement` TR-7.1: 首页组件正常渲染，布局无错乱
  - `human-judgement` TR-7.2: 列表滚动正常，卡片组件显示正确
  - `human-judgement` TR-7.3: 聊天页面布局正确，消息气泡显示正常
- **Notes**: 重点检查position: fixed、100vh/vw等在小程序中的兼容性

## [ ] Task 8: 响应式与多机型适配
- **Priority**: high
- **Depends On**: Task 7
- **Description**: 
  - 添加安全区域适配（env(safe-area-inset-bottom)）
  - 修复小屏机型（iPhone SE）的内容挤压问题
  - 修复大屏机型（Pro Max）的内容拉伸问题
  - 处理不同屏幕宽度下的响应式布局
  - 适配iOS和Android的状态栏、导航栏差异
- **Acceptance Criteria Addressed**: [AC-5, NFR-1, NFR-2]
- **Test Requirements**:
  - `human-judgement` TR-8.1: iPhone SE（375x667）下布局正常，无截断
  - `human-judgement` TR-8.2: iPhone 14（390x844）下布局正常
  - `human-judgement` TR-8.3: iPhone 14 Pro Max（430x932）下布局正常
  - `human-judgement` TR-8.4: 底部TabBar在有Home Indicator的机型上有底部安全距离
- **Notes**: 使用uni.getSystemInfoSync()获取设备信息进行动态适配

## [ ] Task 9: 组件兼容性与交互修复
- **Priority**: medium
- **Depends On**: Task 8
- **Description**: 
  - 检查自定义组件在小程序端的表现
  - 修复事件处理、手势交互等问题
  - 验证表单输入、按钮点击等基础交互
  - 修复弹窗、Toast、Modal等组件的显示问题
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgement` TR-9.1: 按钮点击有反馈，事件触发正常
  - `human-judgement` TR-9.2: 输入框可以正常输入，键盘弹出正常
  - `human-judgement` TR-9.3: Toast、Modal等反馈组件正常显示
- **Notes**: 检查GSAP动画库在小程序端的兼容性

## [x] Task 10: 全面测试与问题回归
- **Priority**: medium
- **Depends On**: Task 9
- **Description**: 
  - 执行完整的页面遍历测试
  - 在多个机型模拟器上反复测试
  - 记录并修复最后发现的问题
  - 运行TypeScript类型检查和单元测试
  - 生成最终的调试修复报告
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8]
- **Test Requirements**:
  - `programmatic` TR-10.1: `pnpm typecheck` 无错误
  - `programmatic` TR-10.2: `pnpm test:unit` 测试通过
  - `human-judgement` TR-10.3: 所有核心页面功能正常
  - `human-judgement` TR-10.4: 多机型预览无明显UI问题
- **Notes**: 保存所有修改，确保代码可复现
