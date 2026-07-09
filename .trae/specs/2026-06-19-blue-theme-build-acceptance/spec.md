# 蓝色主题统一与前端构建验收 Spec

## Why

当前项目虽已在 `theme/design-variables.scss` 中定义了蓝色品牌色系（`$brand-500: #4C6EF5`），但多轮迭代后存在以下问题：

1. **配色不统一**：部分页面/组件存在硬编码颜色（如 `#FF6B6B`、`#EC4899`、`#F97316` 等），绕过了设计令牌，导致蓝色主题未贯穿全应用
2. **缺乏真实编译验证**：近期迭代以 dev server 验证为主，未执行真实 `build:h5` / `build:mp-weixin` 产物检查
3. **HBuilderX 工具未利用**：用户已提供 `D:\HBuilderX` 路径，但项目仍仅依赖命令行构建，未利用 HBuilderX 的可视化构建能力
4. **验收文档零散**：缺少按"窗口验收 + 子智能体验收"维度的结构化验收报告，问题追溯困难
5. **视觉问题未逐页排查**：未对 5 个主页面 + 4 个设置页面进行逐页视觉检查

**本次 Spec 核心目标**：将主配色统一为蓝色系，完成真实编译部署，逐页视觉检查，输出结构化验收文档。

## What Changes

### 一级：蓝色主题统一（P0·视觉基石）
- 审计全项目硬编码颜色，将非蓝色主色替换为 `design-variables.scss` 中的品牌色令牌
- 保留语义色（success/warning/error）和功能色（pink 用于喜欢/匹配，accent 用于强调）
- 确保所有按钮、链接、选中态、品牌氛围均使用蓝色系
- 验证所有页面主色调一致，无突兀的橙/红/紫等非蓝色主色

### 二级：真实编译部署（P0·质量保证）
- 执行 `npm run build:h5` 真实编译 H5 产物
- 执行 `npm run build:mp-weixin` 真实编译微信小程序产物
- 使用 `D:\HBuilderX` 工具验证项目可导入、可编译
- 验证编译产物无错误，资源路径正确

### 三级：逐页视觉检查（P0·视觉验收）
- 对 5 个主页面（首页/讨论圈/匹配/聊天/我的）逐页截图检查
- 对 4 个设置页面（基础资料/校区/日程/推荐偏好）逐页截图检查
- 检查蓝色主题一致性、间距规范、字体层级、图标统一性
- 记录所有视觉问题并修复

### 四级：结构化验收文档（P1·文档交付）
- 创建 `doc/reports/blue-theme-build-acceptance.md` 主验收报告
- 按窗口验收维度记录每轮验收结果
- 按子智能体验收维度记录每个子智能体的工作结果
- 为每个功能模块生成配套 MD 文档，使用列表形式展示子任务完成情况

### 五级：任务规划与进度跟踪（P1·过程管理）
- 将需求拆解为最小可执行任务单元
- 每个功能模块对应一个独立任务
- 制定总体进度计划，实现进度汇总与跟踪
- 每个模块的最小任务生成配套 MD 文档

## Impact

- **Affected specs**: `ui-polish-professional-2026-05-31`（视觉打磨延续）、`2026-06-19-image-linktest-identity-audit`（图片资源已就绪）
- **Affected code**:
  - `apps/client/src/theme/design-variables.scss`（设计令牌源头）
  - `apps/client/src/pages/**/*.vue`（所有页面组件）
  - `apps/client/src/components/**/*.vue`（所有通用组件）
  - `apps/client/src/static/assets/icons/`（图标资源）
  - `apps/client/package.json`（构建脚本）
- **Affected docs**: `doc/reports/`（验收报告目录）

## ADDED Requirements

### Requirement: 蓝色主题统一

The system SHALL enforce a consistent blue color scheme across all pages and components, using the brand color tokens defined in `design-variables.scss`.

#### Scenario: 硬编码颜色替换
- **WHEN** 开发者审计源码发现硬编码的非蓝色主色（如 `#FF6B6B`、`#FF8A65`）
- **THEN** 系统应将其替换为对应的品牌色令牌（`$brand-500`、`$brand-600` 等）
- **AND** 保留语义色（success/warning/error）和功能色（pink/accent）不变

#### Scenario: 主题一致性验证
- **WHEN** 用户浏览任意页面
- **THEN** 主按钮、选中态、链接、品牌氛围均使用蓝色系
- **AND** 无突兀的橙/红/紫等非蓝色主色干扰视觉

### Requirement: 真实编译部署

The system SHALL produce valid build artifacts for both H5 and WeChat mini-program platforms.

#### Scenario: H5 编译成功
- **WHEN** 执行 `npm run build:h5`
- **THEN** 编译产物输出到 `apps/client/dist/build/h5/`
- **AND** 编译过程无 ERROR
- **AND** 产物包含 `index.html` 和正确的资源引用

#### Scenario: 微信小程序编译成功
- **WHEN** 执行 `npm run build:mp-weixin`
- **THEN** 编译产物输出到 `apps/client/dist/build/mp-weixin/`
- **AND** 编译过程无 ERROR
- **AND** 产物包含 `app.json`、`app.js` 和页面文件

#### Scenario: HBuilderX 导入验证
- **WHEN** 使用 `D:\HBuilderX` 打开 `apps/client/dist/build/mp-weixin/` 目录
- **THEN** 项目可正常导入
- **AND** 可在 HBuilderX 中预览运行

### Requirement: 逐页视觉检查

The system SHALL perform page-by-page visual inspection for all 9 key pages (5 main + 4 setup).

#### Scenario: 主页面视觉检查
- **WHEN** 检查首页/讨论圈/匹配/聊天/我的 5 个主页面
- **THEN** 每个页面截图保存到 `test-screenshots/2026-06-19-blue-theme/`
- **AND** 记录蓝色主题一致性、间距、字体、图标问题
- **AND** 所有问题修复后重新截图验证

#### Scenario: 设置页面视觉检查
- **WHEN** 检查基础资料/校区/日程/推荐偏好 4 个设置页面
- **THEN** 每个页面截图保存
- **AND** 表单输入框、按钮、标签均使用蓝色主题

### Requirement: 结构化验收文档

The system SHALL produce structured acceptance documentation with per-window and per-subagent results.

#### Scenario: 主验收报告
- **WHEN** 所有任务完成
- **THEN** 创建 `doc/reports/blue-theme-build-acceptance.md`
- **AND** 包含窗口验收维度（每轮验收结果）
- **AND** 包含子智能体验收维度（每个子智能体工作结果）
- **AND** 包含问题清单与解决方案

#### Scenario: 模块任务文档
- **WHEN** 每个功能模块完成
- **THEN** 生成配套 MD 文档到 `doc/reports/modules/`
- **AND** 使用列表形式展示子任务完成情况
- **AND** 记录验证证据（截图路径、编译日志等）

## MODIFIED Requirements

### Requirement: 设计令牌应用

[修改前] 设计令牌定义在 `design-variables.scss`，但部分组件直接硬编码颜色值
[修改后] 所有组件必须引用设计令牌，禁止硬编码非语义色值；硬编码颜色仅允许出现在 design-variables.scss 中

## REMOVED Requirements

### Requirement: 无
**Reason**: 本次 Spec 为增量改进，不移除已有功能
**Migration**: 无
