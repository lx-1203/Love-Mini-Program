# 微信小程序真机调试与多机型适配 - 验证清单

## 编译与环境验证
- [x] 项目依赖已正确安装，pnpm install执行成功
- [x] manifest.json、project.config.json、pages.json配置文件格式正确
- [x] manifest.json中mp-weixin配置存在且完整（appid已配置为touristappid）
- [x] 执行 `pnpm dev:mp-weixin` 编译成功，无error级别错误
- [x] dist/dev/mp-weixin目录生成，包含app.js、app.json、app.wxss等核心文件
- [x] TypeScript类型检查 `pnpm typecheck` 通过

## 开发者工具运行验证
- [ ] 微信开发者工具能够成功导入dist/dev/mp-weixin目录（需人工验证）
- [ ] 项目在开发者工具中打开无加载失败错误（需人工验证）
- [ ] 控制台无Uncaught Exception或致命JS错误（需人工验证）
- [ ] 小程序启动后正常显示登录页，无白屏或闪退（需人工验证）

## 页面路由验证
- [x] pages.json中所有页面路径对应的.vue文件都存在
- [x] 分包配置subPackages的root路径正确，页面文件存在
- [ ] 所有Tab页面（首页、圈子、匹配、消息、我的）可正常访问（需人工验证）
- [ ] 二级页面（帖子详情、聊天会话、设置等）可正常访问（需人工验证）
- [ ] 分包页面可正常加载，无"页面不存在"错误（需人工验证）

## TabBar与静态资源验证
- [x] 底部TabBar配置为5个Tab项（首页、圈子、匹配、消息、我的）
- [x] TabBar图标路径正确（使用static/assets/icons/tabbar/下的SVG图标）
- [ ] TabBar图标和文字颜色正确，选中态正常切换（需人工验证）
- [ ] 点击Tab可正常切换页面（需人工验证）
- [x] 所有图标、图片资源路径正确，已验证编译输出
- [x] 使用自定义TabBar（custom-tab-bar组件已修复，支持SVG）
- [x] 全局样式和主题已修复兼容性问题（移除color-mix、添加安全区）

## 登录流程验证
- [x] 登录页面布局已修复（100vh→100%，安全区适配）
- [x] Mock数据模式配置正确（.env.development设置VITE_API_MODE=mock）
- [x] Pinia状态管理stores正常初始化
- [x] Mock登录流程已修复（fixtures提供完整用户数据，profileCompleted=true）
- [x] 页面权限守卫逻辑已验证
- [ ] 登录流程可完成，成功跳转首页（需人工验证）

## 核心页面功能验证
- [x] 首页布局已修复（100vh→100%，color-mix替换）
- [x] 匹配/寻觅页面布局已修复（安全区适配）
- [x] 村口/圈子页面布局已修复（100vh→100%）
- [x] 聊天列表页面布局已修复（100vh→100%，安全区）
- [x] 聊天会话页面组件已验证存在
- [x] 个人中心页面布局已修复（100vh→100%）
- [ ] 各页面功能交互正常（需人工验证）

## 交互功能验证
- [x] Toast组件已修复（移除backdrop-filter、color-mix，添加安全区）
- [x] 按钮、Card、Tag等通用组件样式兼容性已修复
- [x] GSAP动画已添加条件编译（非H5环境降级为mock，避免小程序崩溃）
- [ ] 按钮点击有视觉反馈，点击事件正常触发（需人工验证）
- [ ] 列表滚动流畅，无卡顿（需人工验证）
- [ ] 输入框可正常输入，键盘弹出/收起正常（需人工验证）
- [ ] Toast轻提示正常显示（需人工验证）
- [ ] Modal弹窗正常显示和关闭（需人工验证）
- [ ] 页面返回、导航跳转正常（需人工验证）

## 多机型适配验证
- [x] 全局安全区适配已添加（App.vue中.safe-area-top/.safe-area-bottom类，支持constant+env双写）
- [x] 自定义TabBar已添加底部安全区padding（custom-tab-bar/index.wxss和TabBar.vue）
- [x] 底部操作栏、LockScreen、AppShell等组件已添加安全区适配
- [ ] iPhone SE (375x667) 小屏机型下布局正常，无内容截断（需人工验证）
- [ ] iPhone 14 (390x844) 标准机型下布局正常（需人工验证）
- [ ] iPhone 14 Pro Max (430x932) 大屏机型下布局正常，无过度拉伸（需人工验证）
- [ ] Android主流机型（如Pixel 7 412x915）下布局正常（需人工验证）
- [ ] 底部TabBar在全面屏机型上有安全区域距离，不被Home Indicator遮挡（需人工验证）
- [ ] 自定义导航栏适配状态栏高度，不与状态栏重叠（需人工验证）
- [ ] 横屏或屏幕旋转时布局合理（需人工验证）
- [ ] 所有可点击元素尺寸合适，无过小难以点击的情况（需人工验证）

## 样式与UI验证
- [x] 颜色主题统一，color-mix()已替换为rgba硬编码值
- [x] Flex布局问题已修复
- [x] 所有页面100vh改为100%，适配小程序高度计算
- [x] rpx单位正确使用
- [x] position: fixed/sticky问题已处理（TabBar改为relative，避免小程序兼容问题）
- [x] 安全区域env(safe-area-inset-*)和constant()回退已正确应用
- [ ] 字体大小、间距在各机型上协调（需人工验证）

## 质量与稳定性验证
- [x] 单元测试 `pnpm test:unit` 全部通过（154/154）
- [x] 生产构建 `pnpm build:mp-weixin` 成功
- [x] 所有修复的代码已保存
- [x] 编译产物dist/build/mp-weixin完整可用
- [ ] 反复切换页面无内存泄漏迹象（需人工验证）
- [ ] 控制台无重复的警告或错误（需人工验证）
- [ ] 核心用户操作流程可完整走通（需人工验证）

---

## 人工验证指引

代码层面的修复和编译验证已全部完成，接下来请按以下步骤在微信开发者工具中进行人工验证：

1. **打开微信开发者工具**，导入项目目录：`D:\6\恋爱小程序\apps\client\dist\dev\mp-weixin`（开发调试）或 `dist\build\mp-weixin`（生产预览）
2. **AppID选择**：使用测试号或您自己的小程序AppID
3. **基础验证**：
   - 项目能否正常打开，控制台是否有红色错误
   - 是否显示登录页面
   - 点击登录按钮（mock模式下）能否跳转到首页
4. **TabBar验证**：底部5个Tab是否正常显示和切换
5. **多机型切换**：在模拟器中切换iPhone SE、iPhone 14、iPhone 14 Pro Max、Android等机型
6. **页面遍历**：依次访问所有Tab页面和二级页面，检查布局和交互
7. **真机预览**：点击"预览"生成二维码，在手机微信上扫码进行真机测试
