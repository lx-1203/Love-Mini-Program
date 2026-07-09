# 微信小程序真机调试与多机型适配 - 产品需求文档

## Overview
- **Summary**: 对现有的校园恋爱微信小程序进行真机调试和多机型适配工作，通过反复调试、修复问题、保存代码，确保小程序能够在多种主流手机机型上正常运行，核心功能完整可用，UI表现一致。
- **Purpose**: 解决当前小程序可能存在的编译错误、运行时异常、跨机型兼容性问题、UI布局错位等问题，确保产品质量达到可发布状态。
- **Target Users**: 校园恋爱小程序的开发测试人员、产品经理，以及最终使用小程序的在校大学生用户。

## Goals
- 确保微信小程序能够成功编译并在微信开发者工具中正常打开
- 修复所有编译错误和运行时异常
- 完成多机型适配，保证在主流iOS和Android机型上UI布局正确、功能正常
- 对核心页面和功能进行全面测试并修复发现的问题
- 建立可复现的调试流程和问题记录

## Non-Goals (Out of Scope)
- 不进行新功能开发，仅针对现有功能进行调试和适配修复
- 不重构核心业务逻辑架构，只修复bug和兼容性问题
- 不涉及后端API服务的开发或重构
- 不进行小程序的正式发布上线流程
- 不进行UI/UX的重新设计，只修复现有UI的兼容性问题

## Background & Context
- 项目是基于 uni-app 框架开发的校园恋爱社交小程序，使用 Vue 3 + TypeScript + Pinia 技术栈
- 项目包含客户端(apps/client)、管理后台(apps/admin)和Java后端(apps/api)三部分
- 此前已有多轮UI重构和系统测试，但缺乏微信小程序端的真机调试验证
- 当前 manifest.json 和 project.config.json 中微信小程序 appid 为空，需要配置或使用测试号
- 项目有完整的单元测试，但需要真机环境验证实际运行效果
- 需要覆盖的主流机型包括：不同尺寸的iPhone（SE、14、14 Pro Max等）和主流Android机型

## Functional Requirements
- **FR-1**: 小程序能够成功执行 `dev:mp-weixin` 编译命令，无编译错误
- **FR-2**: 编译产物能够在微信开发者工具中正常打开和预览
- **FR-3**: 所有页面路由能够正常跳转，无白屏或404错误
- **FR-4**: 登录流程能够正常完成（包括微信授权和手机号登录）
- **FR-5**: 底部TabBar能够正常显示和切换
- **FR-6**: 核心功能页面（首页、匹配/寻觅、聊天、村口/讨论圈、我的）能够正常加载和交互
- **FR-7**: 所有静态资源（图标、图片、样式）能够正确加载，无丢失或404
- **FR-8**: 表单输入、按钮点击、列表滚动等基础交互正常响应

## Non-Functional Requirements
- **NFR-1**: 多机型兼容性：在iOS和Android主流机型上UI布局无明显错位、截断或重叠
- **NFR-2**: 响应式适配：适配不同屏幕尺寸（从小屏手机SE到大屏Pro Max）
- **NFR-3**: 性能：页面加载流畅，无明显卡顿或内存泄漏
- **NFR-4**: 稳定性：核心操作流程无崩溃或JS报错
- **NFR-5**: 可调试性：编译输出清晰的错误信息，便于定位问题

## Constraints
- **Technical**: 必须使用 uni-app 框架，保持与现有代码库一致；必须兼容微信小程序平台API；使用现有项目的依赖版本
- **Business**: 调试周期内完成，优先保证核心功能可用；不引入新的第三方依赖除非绝对必要
- **Dependencies**: 依赖微信开发者工具进行预览和调试；依赖后端API服务（可使用mock数据）；依赖项目已有的构建脚本

## Assumptions
- 开发者已安装微信开发者工具
- 项目依赖已正确安装（node_modules存在）
- 可以使用微信小程序测试号或已有appid进行调试
- 后端API服务可以正常启动或使用mock模式
- 开发环境Node.js、pnpm等工具已配置正确

## Acceptance Criteria

### AC-1: 小程序成功编译
- **Given**: 项目依赖已安装，开发环境配置正确
- **When**: 在apps/client目录执行 `pnpm dev:mp-weixin` 命令
- **Then**: 编译成功完成，dist/dev/mp-weixin目录生成完整的小程序代码，无编译错误
- **Verification**: `programmatic`
- **Notes**: 允许存在不影响运行的警告，但error必须为0

### AC-2: 开发者工具中正常打开
- **Given**: 编译成功完成，dist/dev/mp-weixin目录存在
- **When**: 在微信开发者工具中导入编译产物目录
- **Then**: 项目能够正常打开，无项目加载错误，控制台无致命JS错误
- **Verification**: `programmatic` + `human-judgment`
- **Notes**: 需要验证模拟器中首页能够正常渲染

### AC-3: 页面路由完整可用
- **Given**: 小程序在开发者工具中正常打开
- **When**: 依次导航到pages.json中配置的所有页面
- **Then**: 所有页面都能正常加载，无白屏、无"页面不存在"错误
- **Verification**: `human-judgment`

### AC-4: 底部TabBar正常显示
- **Given**: 小程序在首页或其他Tab页面
- **When**: 查看底部导航栏
- **Then**: 5个Tab（首页、讨论圈、匹配、聊天、我的）正常显示，图标和文字正确，点击切换正常
- **Verification**: `human-judgment`

### AC-5: 多机型UI适配
- **Given**: 在微信开发者工具中切换不同设备模拟器
- **When**: 分别在iPhone SE、iPhone 14、iPhone 14 Pro Max、主流Android机型（如Pixel 7）上预览核心页面
- **Then**: 所有UI元素布局合理，无内容截断、无重叠、无超出屏幕边界的情况
- **Verification**: `human-judgment`
- **Notes**: 使用微信开发者工具的多机型预览功能进行验证

### AC-6: 核心功能交互正常
- **Given**: 小程序运行正常
- **When**: 测试核心页面的基础交互（滚动、点击、输入等）
- **Then**: 交互响应正常，无控制台报错，无无响应情况
- **Verification**: `human-judgment`

### AC-7: 静态资源正确加载
- **Given**: 小程序页面已加载
- **When**: 检查页面中的图标、图片、样式
- **Then**: 所有资源正确显示，无破损图片图标，样式应用正确
- **Verification**: `human-judgment`

### AC-8: 登录流程可通过
- **Given**: 小程序打开到登录页
- **When**: 进行登录操作（使用测试账号或mock模式）
- **Then**: 登录流程能够完成，成功进入首页
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否有可用的微信小程序appid，还是需要使用测试号？
- [ ] 后端API服务是否需要同时启动，还是优先使用mock数据？
- [ ] 是否有特定需要重点测试的机型或系统版本？
- [ ] 是否有已知的特定问题需要优先修复？
