# 微信小程序真机调试与多机型适配 - 产品需求文档

## Overview
- **Summary**: 对基于 uni-app 开发的校园恋爱微信小程序进行真机环境下的全面调试，通过在微信开发者工具中反复打开、验证、修复、保存的迭代流程，确保小程序能够在多种主流机型（iOS/Android）上正常运行，核心功能完整可用，UI表现一致无错位。
- **Purpose**: 此前已完成H5端验证和mp-weixin编译语法验证，但真机环境验证一直待执行。本次任务需要实际打开微信开发者工具，对编译产物进行真实运行验证，逐一审查之前报告中列出的待验证项，发现并修复运行时问题、兼容性问题、UI布局问题，直到小程序在多机型上达到可用状态。
- **Target Users**: 校园恋爱小程序的开发测试人员、产品经理，以及最终使用小程序的在校大学生用户。

## Goals
- 成功编译最新代码并在微信开发者工具中打开小程序
- 逐一验证2026-07-04验证报告中列出的V-1~V-6待验证项
- 覆盖所有核心页面（登录、首页、寻觅、喜欢、村口/圈子、消息、聊天、个人主页等）的真机渲染
- 完成多机型适配验证（iPhone SE、iPhone 14、iPhone 14 Pro Max、Android主流机型）
- 修复发现的所有运行时错误、控制台报错、资源加载失败、UI错位问题
- 建立问题-修复-验证的迭代闭环，直到所有问题解决
- 输出完整的真机调试验证报告

## Non-Goals (Out of Scope)
- 不进行新功能开发，仅针对现有功能进行调试和兼容性修复
- 不重构核心业务逻辑架构，只修复bug和运行时问题
- 不涉及后端API服务的新功能开发（如后端有问题则记录但优先使用mock模式绕过）
- 不进行小程序的正式发布提审流程
- 不进行UI/UX的重新设计，只修复现有UI的错位、显示异常问题

## Background & Context
- 项目基于 uni-app 框架开发，使用 Vue 3 + TypeScript + Pinia 技术栈
- 项目包含客户端(apps/client)、管理后台(apps/admin)和Java后端(apps/api)三部分
- 2026-07-03完成H5端验证，2026-07-04完成mp-weixin编译语法验证
- 编译验证已通过：`import.meta.env.DEV`、`catch {`、`:hover` 已全部移除；`backdrop-filter`和`position: sticky`评估保留并提供降级方案
- 单元测试全部通过（23个文件，201个测试用例）
- 但**真机运行验证一直待执行**，从未在微信开发者工具中实际打开验证过
- 本次需要使用 mcp_Chrome_DevTools_MCP 连接微信开发者工具进行自动化调试和截图
- 项目根目录有 ReviewApp.exe/ReviewApp2.exe、DevToolsCtrl.dll 等自动化工具可辅助调试
- project.config.json 中 appid 为空，使用测试号即可

## Functional Requirements
- **FR-1**: 执行最新代码的mp-weixin编译，确保编译成功无错误
- **FR-2**: 编译产物能够在微信开发者工具中成功导入和打开
- **FR-3**: 小程序启动无白屏，登录页能够正常渲染
- **FR-4**: 控制台无红色错误，无未捕获的JS异常
- **FR-5**: 所有静态资源（图标、图片、样式）正确加载，无404或破损
- **FR-6**: 底部TabBar 5个Tab正常显示、切换，无闪烁或错位
- **FR-7**: 所有页面路由能够正常跳转，无"页面不存在"错误
- **FR-8**: 核心页面（登录/首页/寻觅/喜欢/圈子/消息/聊天/我的）完整渲染
- **FR-9**: 核心交互（点击、滚动、滑动、输入）正常响应
- **FR-10**: 签到功能、卡片滑动匹配功能在真机环境下可正常运行（mock模式）
- **FR-11**: 多机型模拟器下UI布局合理，无内容截断、重叠、超出屏幕
- **FR-12**: 发现的问题能够快速定位修复，修复后重新编译验证

## Non-Functional Requirements
- **NFR-1**: 多机型兼容性：覆盖iPhone SE（小屏）、iPhone 14（标准屏）、iPhone 14 Pro Max（大屏）、Android Pixel 7（安卓）至少4种机型
- **NFR-2**: 响应式适配：从320px小屏到430px大屏均能正常显示
- **NFR-3**: 稳定性：核心页面操作无崩溃，无内存泄漏迹象
- **NFR-4**: 调试效率：问题发现后能够快速定位源码、修复、重新编译验证
- **NFR-5**: 可追溯性：每个发现的问题都有记录、修复方案、验证结果

## Constraints
- **Technical**: 必须使用微信开发者工具进行真机/模拟器调试；保持uni-app框架兼容性；不引入新依赖除非修复问题必需
- **Business**: 优先保证核心功能可用，非关键视觉问题可降级处理；使用mock数据模式，不依赖后端服务
- **Dependencies**: 微信开发者工具必须已安装；Node.js/pnpm环境正常；mcp_Chrome_DevTools_MCP可用；项目依赖已安装

## Assumptions
- 微信开发者工具已安装在系统中，可通过命令行或GUI启动
- mcp_Chrome_DevTools_MCP 能够连接到微信开发者工具的调试端口
- 项目node_modules依赖已正确安装
- 可以使用微信小程序测试号（无appid也能打开基础功能）
- mock数据模式可用，不需要启动后端API即可验证前端功能

## Acceptance Criteria

### AC-1: 最新代码编译成功
- **Given**: 项目依赖已安装，代码为最新状态
- **When**: 在apps/client目录执行 `pnpm build:mp-weixin` 命令
- **Then**: 编译退出码为0，dist/build/mp-weixin目录生成完整产物，无编译错误
- **Verification**: `programmatic`
- **Notes**: 警告可忽略，error必须为0

### AC-2: 微信开发者工具中成功打开项目
- **Given**: mp-weixin编译成功，产物目录存在
- **When**: 在微信开发者工具中导入dist/build/mp-weixin目录
- **Then**: 项目成功加载，小程序启动到登录页，无项目加载错误弹窗
- **Verification**: `human-judgment` + `programmatic`
- **Notes**: 使用mcp_Chrome_DevTools_MCP连接验证

### AC-3: 控制台无致命错误
- **Given**: 小程序在开发者工具中成功启动
- **When**: 检查Console面板
- **Then**: 无红色Error级别日志，无未捕获的Promise rejection，无JS异常
- **Verification**: `programmatic`
- **Notes**: 黄色Warning可接受但需记录

### AC-4: 登录页正常渲染
- **Given**: 小程序启动完成
- **When**: 查看首屏（登录页）
- **Then**: Logo、微信登录按钮、手机号登录按钮、用户协议文字正常显示；背景图正确加载；按钮ripple效果（如果有）正常
- **Verification**: `human-judgment`
- **Notes**: 截图保存对比

### AC-5: TabBar正常显示与切换
- **Given**: 已登录或跳过登录进入主界面
- **When**: 查看底部TabBar并依次点击5个Tab
- **Then**: 5个Tab（首页/讨论圈/匹配/聊天/我的）图标和文字正确显示；点击切换正常；激活态颜色正确；无重叠或错位
- **Verification**: `human-judgment`

### AC-6: 核心页面渲染验证（8页）
- **Given**: 小程序正常运行，可切换Tab
- **When**: 依次进入8个核心页面并截图
- **Then**: 每个页面内容完整渲染、图片加载成功、无空白区域、无布局错位
  - 首页：推荐卡片、顶部Header正常
  - 寻觅页：签到卡片、卡片堆叠、筛选按钮正常
  - 喜欢页：喜欢列表、匹配列表正常
  - 圈子/村口页：帖子列表、分类Tab正常
  - 消息页：会话列表正常
  - 聊天页：消息气泡、输入框正常
  - 我的页：用户信息卡片、功能入口正常
  - 登录页：如AC-4
- **Verification**: `human-judgment`

### AC-7: 静态资源全部加载成功
- **Given**: 页面已渲染完成
- **When**: 检查Network面板和页面视觉
- **Then**: 所有图片、SVG图标、字体无404错误；无破损图片占位符
- **Verification**: `programmatic` + `human-judgment`

### AC-8: 核心交互功能验证
- **Given**: 页面正常渲染
- **When**: 执行基础交互操作
- **Then**: 
  - 按钮点击有响应（ripple/缩放/触觉反馈）
  - 列表可正常滚动
  - 卡片可左右滑动
  - 签到按钮可点击（mock模式下）
  - 页面跳转正常
- **Verification**: `human-judgment`

### AC-9: 多机型适配验证
- **Given**: 小程序在开发者工具中运行
- **When**: 依次切换模拟器机型：iPhone SE、iPhone 14、iPhone 14 Pro Max、Android Pixel 7
- **Then**: 在每种机型下：
  - TabBar不被底部安全区遮挡
  - 内容不超出屏幕边界
  - 无横向滚动条
  - 文字不被截断
  - 按钮可正常点击
- **Verification**: `human-judgment`
- **Notes**: 重点验证小屏iPhone SE和大屏Pro Max

### AC-10: 问题修复闭环
- **Given**: 调试过程中发现问题
- **When**: 定位问题原因，修改源码，重新编译，重新验证
- **Then**: 问题得到解决；同类问题一并排查；修复后无新引入的问题
- **Verification**: `programmatic` + `human-judgment`

### AC-11: 调试验证报告输出
- **Given**: 所有核心页面和多机型验证完成
- **When**: 整理调试结果
- **Then**: 输出真机调试验证报告，包含：
  - 测试环境信息
  - 编译结果
  - 每页验证结果截图
  - 发现的问题清单及修复情况
  - 多机型适配结论
  - 遗留问题（如有）
- **Verification**: `programmatic`

## Open Questions
- [ ] 微信开发者工具的调试端口是多少？如何通过mcp_Chrome_DevTools_MCP连接？
- [ ] 项目根目录的 ReviewApp.exe/DevToolsCtrl.dll 是否可用于自动化微信开发者工具？
- [ ] 是否需要启动后端API，还是全程使用mock模式？
- [ ] 登录流程如何处理？是否有测试账号或需要mock登录状态？
