# 微信小程序真机调试与多机型适配 - 任务清单

## [x] Task 1: 环境准备与最新代码编译
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 检查apps/client/node_modules是否存在，不存在则安装依赖
  - 执行 `pnpm build:mp-weixin` 编译最新代码
  - 验证dist/build/mp-weixin目录产物完整性
  - 确认编译无error（warning可忽略）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 编译命令退出码为0
  - `programmatic` TR-1.2: dist/build/mp-weixin/app.json存在
  - `programmatic` TR-1.3: dist/build/mp-weixin/project.config.json存在
  - `programmatic` TR-1.4: dist/build/mp-weixin/pages目录包含所有页面
- **Notes**: 如编译失败，先修复编译错误再继续

## [ ] Task 2: 启动微信开发者工具并打开项目
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 启动微信开发者工具（GUI方式）
  - 导入项目：选择dist/build/mp-weixin目录
  - 如appid为空，选择"测试号"或使用游客模式
  - 等待小程序编译完成并启动
  - 使用mcp_Chrome_DevTools_MCP连接开发者工具页面
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 微信开发者工具成功启动
  - `human-judgement` TR-2.2: 项目成功导入无报错弹窗
  - `human-judgement` TR-2.3: 小程序模拟器可见，有内容渲染
  - `programmatic` TR-2.4: mcp_Chrome_DevTools_MCP成功list_pages可看到小程序页面
- **Notes**: 如无法自动启动，需用户协助打开微信开发者工具并导入项目

## [ ] Task 3: 控制台错误检查与首页（登录页）验证
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 使用mcp获取控制台日志，检查是否有红色Error
  - 获取页面快照，验证登录页渲染
  - 截图保存登录页状态
  - 如有错误，定位源码修复后回到Task 1重新编译
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 控制台无Error级别日志
  - `human-judgement` TR-3.2: Logo可见
  - `human-judgement` TR-3.3: 登录按钮可见且文字正确
  - `human-judgement` TR-3.4: 背景图/背景色正常显示
  - `programmatic` TR-3.5: 登录页截图保存到.trae/screenshots/2026-07-07-real-device/01-login.png
- **Notes**: 登录页是第一关，必须无错误才能继续

## [ ] Task 4: 处理登录流程进入主界面
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 检查是否有跳过登录按钮或可自动登录
  - 如需要mock登录，修改session store或相关guard跳过登录验证
  - 进入主界面（应有TabBar）
  - 截图保存主界面
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: 成功进入主界面
  - `human-judgement` TR-4.2: 底部TabBar可见
  - `human-judgement` TR-4.3: 默认显示首页内容
- **Notes**: 如无法正常登录，优先使用mock方式绕过登录验证

## [ ] Task 5: TabBar功能验证
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 依次点击5个Tab：首页、讨论圈/圈子、匹配/寻觅、聊天/消息、我的
  - 验证每个Tab点击后正确切换页面
  - 验证Tab图标和文字显示正确
  - 验证激活态样式正确
  - 截图每个Tab页面
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-5.1: 首页Tab可正常切换
  - `human-judgement` TR-5.2: 圈子Tab可正常切换
  - `human-judgement` TR-5.3: 寻觅Tab可正常切换
  - `human-judgement` TR-5.4: 消息Tab可正常切换
  - `human-judgement` TR-5.5: 我的Tab可正常切换
  - `human-judgement` TR-5.6: 激活Tab颜色/状态正确
  - `programmatic` TR-5.7: 5个Tab截图均已保存
- **Notes**: 如某个Tab切换后白屏，记录问题并修复

## [ ] Task 6: 核心页面逐个验证（首页）
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - 进入首页
  - 等待页面加载完成
  - 检查控制台错误
  - 检查图片资源加载情况
  - 检查布局是否正常
  - 测试滚动交互
  - 截图保存
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-6.1: 首页加载后控制台无新增Error
  - `human-judgement` TR-6.2: 页面头部区域正常显示
  - `human-judgement` TR-6.3: 推荐卡片/列表正常渲染
  - `human-judgement` TR-6.4: 图片加载成功无破损
  - `human-judgement` TR-6.5: 列表可正常滚动
  - `programmatic` TR-6.6: 首页截图保存到02-home.png

## [ ] Task 7: 核心页面逐个验证（寻觅/匹配页）
- **Priority**: high
- **Depends On**: Task 6
- **Description**: 
  - 切换到寻觅页
  - 验证签到卡片显示
  - 验证卡片堆叠显示
  - 测试签到按钮点击（mock模式）
  - 测试卡片左右滑动
  - 截图保存
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8, AC-10
- **Test Requirements**:
  - `programmatic` TR-7.1: 寻觅页加载后控制台无新增Error
  - `human-judgement` TR-7.2: 签到卡片正常显示
  - `human-judgement` TR-7.3: 推荐卡片堆叠正常
  - `human-judgement` TR-7.4: 筛选按钮可见
  - `human-judgement` TR-7.5: 签到按钮可点击
  - `programmatic` TR-7.6: 寻觅页截图保存到03-discover.png

## [ ] Task 8: 核心页面逐个验证（喜欢页）
- **Priority**: high
- **Depends On**: Task 7
- **Description**: 
  - 切换到喜欢页
  - 验证喜欢列表/匹配列表显示
  - 测试滚动
  - 截图保存
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-8.1: 喜欢页加载后控制台无新增Error
  - `human-judgement` TR-8.2: 页面标题/分区正常
  - `human-judgement` TR-8.3: 列表项正常渲染
  - `programmatic` TR-8.4: 喜欢页截图保存到04-likes.png

## [ ] Task 9: 核心页面逐个验证（圈子/村口页）
- **Priority**: high
- **Depends On**: Task 8
- **Description**: 
  - 切换到圈子页
  - 验证分类Tab/帖子列表
  - 验证sticky吸顶效果（如支持）
  - 测试滚动
  - 测试发帖按钮（如可见）
  - 截图保存
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-9.1: 圈子页加载后控制台无新增Error
  - `human-judgement` TR-9.2: 分类Tab正常显示
  - `human-judgement` TR-9.3: 帖子列表正常渲染
  - `human-judgement` TR-9.4: 帖子图片正常加载
  - `programmatic` TR-9.5: 圈子页截图保存到05-circles.png

## [ ] Task 10: 核心页面逐个验证（消息页）
- **Priority**: high
- **Depends On**: Task 9
- **Description**: 
  - 切换到消息页
  - 验证会话列表显示
  - 测试点击会话进入聊天页
  - 截图保存消息列表和聊天页
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-10.1: 消息页加载后控制台无新增Error
  - `human-judgement` TR-10.2: 会话列表项正常渲染
  - `human-judgement` TR-10.3: 聊天页进入后消息气泡正常
  - `human-judgement` TR-10.4: 输入框可见
  - `programmatic` TR-10.5: 消息页截图保存到06-messages.png
  - `programmatic` TR-10.6: 聊天页截图保存到07-chat.png

## [ ] Task 11: 核心页面逐个验证（我的/个人主页）
- **Priority**: high
- **Depends On**: Task 10
- **Description**: 
  - 切换到我的页
  - 验证用户信息卡片
  - 验证功能入口列表
  - 验证VIP/签到状态
  - 截图保存
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-11.1: 我的页加载后控制台无新增Error
  - `human-judgement` TR-11.2: 用户头像/昵称/信息正常
  - `human-judgement` TR-11.3: 功能入口列表正常显示
  - `human-judgement` TR-11.4: VIP徽章/状态正常
  - `programmatic` TR-11.5: 我的页截图保存到08-profile.png

## [ ] Task 12: 多机型适配测试（iPhone SE 小屏）
- **Priority**: high
- **Depends On**: Task 11
- **Description**: 
  - 在微信开发者工具中将模拟器切换为iPhone SE
  - 依次验证8个核心页面
  - 重点检查：TabBar是否被遮挡、内容是否超出屏幕、文字是否截断、按钮是否可点击
  - 每个页面截图保存
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `human-judgement` TR-12.1: iPhone SE下无横向滚动
  - `human-judgement` TR-12.2: TabBar完全可见不被遮挡
  - `human-judgement` TR-12.3: 所有按钮可点击无错位
  - `human-judgement` TR-12.4: 文字无截断重叠
  - `programmatic` TR-12.5: iPhone SE截图保存到multi-device/iphone-se-*.png

## [ ] Task 13: 多机型适配测试（iPhone 14 Pro Max 大屏）
- **Priority**: medium
- **Depends On**: Task 12
- **Description**: 
  - 切换为iPhone 14 Pro Max
  - 依次验证8个核心页面
  - 重点检查：布局是否拉伸过度、安全区适配
  - 截图保存
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `human-judgement` TR-13.1: 大屏下布局合理无过度拉伸
  - `human-judgement` TR-13.2: 底部安全区适配正常
  - `programmatic` TR-13.3: iPhone 14 Pro Max截图保存到multi-device/iphone-pm-*.png

## [ ] Task 14: 多机型适配测试（Android机型）
- **Priority**: medium
- **Depends On**: Task 13
- **Description**: 
  - 切换为Android机型（如Pixel 7）
  - 验证核心页面
  - 重点检查：Android返回键行为、导航栏差异
  - 截图保存
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `human-judgement` TR-14.1: Android机型下页面正常显示
  - `programmatic` TR-14.2: Android截图保存到multi-device/android-*.png

## [ ] Task 15: 子包页面/二级页面抽查
- **Priority**: medium
- **Depends On**: Task 14
- **Description**: 
  - 从主页面跳转到2-3个子包页面（如帖子详情、校园认证、设置页、每日一问等）
  - 验证二级页面正常加载
  - 验证返回功能正常
  - 截图记录
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `human-judgement` TR-15.1: 二级页面可正常打开
  - `human-judgement` TR-15.2: 返回功能正常
  - `programmatic` TR-15.3: 二级页面截图保存到subpages/

## [ ] Task 16: 问题汇总与修复迭代
- **Priority**: high
- **Depends On**: Task 15
- **Description**: 
  - 汇总所有发现的问题（控制台错误、UI错位、功能异常、资源404等）
  - 按严重程度排序（P0崩溃/白屏 > P1功能异常 > P2UI错位 > P3视觉优化）
  - 逐个修复问题
  - 每个问题修复后重新编译并回到对应页面验证
  - 更新问题状态（已修复/待确认/遗留）
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `programmatic` TR-16.1: P0级问题100%修复
  - `programmatic` TR-16.2: P1级问题100%修复
  - `human-judgement` TR-16.3: P2级问题修复或有明确降级方案
  - `programmatic` TR-16.4: 修复后重新验证通过
- **Notes**: 修复问题时遵循"小步迭代"，一次只修一个问题，修完即验证

## [ ] Task 17: 最终验证与报告输出
- **Priority**: high
- **Depends On**: Task 16
- **Description**: 
  - 所有问题修复后，执行一轮完整的冒烟测试
  - 重新截图所有核心页面
  - 确认控制台无Error
  - 确认多机型基本正常
  - 输出真机调试验证报告
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `programmatic` TR-17.1: 最终编译无错误
  - `programmatic` TR-17.2: 控制台无Error日志
  - `human-judgement` TR-17.3: 8个核心页面最终截图正常
  - `programmatic` TR-17.4: 真机调试验证报告保存到real-device-debug-report.md
