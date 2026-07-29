# 完成 P2.H Task 29-35 客户端设计系统收尾任务 Spec

## Why

P2.H 阶段客户端设计系统还剩 7 类共 161 项收尾工作未完成。这些任务涵盖图片懒加载、空状态统一、请求超时、uni.* API 适配、路由常量、ARIA 无障碍、平台降级等关键质量与可访问性提升点。完成这些任务可将客户端整体完成度从 75-80% 提升至商业化交付水准，并消除 mp-weixin 编译与运行时风险。

## What Changes

### 任务29：图片懒加载补齐
- 为所有列表型、非首屏可见的 `<image>` 标签补齐 `lazy-load="true"` 属性
- 排除首屏 Banner、Avatar 等立即可见图片
- 覆盖 `pages/`、`subpackages/`、`components/` 下全部 .vue 文件

### 任务30：EmptyState 组件统一
- 复用现有 `components/common/EmptyState.vue` 组件
- 替换散落在各页面的"暂无数据 / 空空如也 / 没有更多"等空状态实现
- 统一空状态视觉与文案

### 任务31：AbortController 超时
- 验证 `services/http.ts` 已实现 AbortController 超时控制
- 确保所有 uni.request / fetch 调用走统一封装
- 默认超时 15s，可配置覆盖

### 任务32：uni.* API 适配
- 排查并替换浏览器原生 API：`window.*`、`document.*`、`navigator.*`、`TouchEvent`
- 使用 `uni.*` 等价 API 或条件编译 `#ifdef H5`

### 任务33：ROUTE_* 常量替换
- 使用 `constants/routes.ts` 中的 ROUTE_* 常量替换硬编码路径
- 覆盖 `uni.navigateTo`、`uni.redirectTo`、`uni.reLaunch`、`uni.switchTab` 调用

### 任务34：ARIA 无障碍补齐
- 为交互元素（@click / @tap 的 view、image）添加 `role` 与 `aria-label`
- 优先处理 icon-only 按钮、卡片、菜单项
- 复用 i18n 文案，避免硬编码

### 任务35：config/env.ts 平台降级
- 将业务代码中的条件编译 `#ifdef` 平台判断收敛到 `config/env.ts` 与 `compat/index.ts`
- 暴露 `isH5`、`isMpWeixin`、`isApp` 等语义化常量
- 业务代码只引用语义化常量，不直接写 `#ifdef`

## Impact

- Affected specs: 客户端设计系统、可访问性、性能优化、mp-weixin 兼容性
- Affected code:
  - `apps/client/src/pages/**/*.vue`
  - `apps/client/src/subpackages/**/*.vue`
  - `apps/client/src/components/**/*.vue`
  - `apps/client/src/services/http.ts`
  - `apps/client/src/constants/routes.ts`
  - `apps/client/src/config/env.ts`
  - `apps/client/src/compat/index.ts`

## ADDED Requirements

### Requirement: 列表图片懒加载

系统 SHALL 为所有列表型、非首屏可见的 `<image>` 标签添加 `lazy-load="true"` 属性，以减少首屏图片请求量，提升首屏渲染性能。

#### Scenario: 列表图片懒加载生效
- **WHEN** 用户进入包含列表图片的页面
- **THEN** 仅可视区域内的图片发起网络请求
- **AND** 滚动到视口外的图片在进入视口前不发起请求

#### Scenario: 首屏图片不懒加载
- **WHEN** 图片位于首屏可见区域（如 Banner、顶部 Avatar）
- **THEN** 不添加 `lazy-load` 属性，确保首屏立即可见

### Requirement: 空状态组件统一

系统 SHALL 使用统一的 `EmptyState` 组件展示空状态，避免各页面自行实现导致视觉与文案不一致。

#### Scenario: 空状态展示
- **WHEN** 列表数据为空
- **THEN** 渲染 `<EmptyState>` 组件
- **AND** 组件支持 image / title / description / actionText props
- **AND** 文案通过 i18n key 引用

### Requirement: 请求超时控制

系统 SHALL 通过 AbortController 为所有 HTTP 请求添加超时控制，默认 15 秒，可通过参数覆盖。

#### Scenario: 请求超时
- **WHEN** 请求在 15 秒内未返回响应
- **THEN** 自动中断请求
- **AND** 抛出 TimeoutError
- **AND** 调用方可捕获并展示友好提示

### Requirement: uni.* API 适配

系统 SHALL 在 mp-weixin 环境下使用 `uni.*` API 替代浏览器原生 API，H5 环境下可通过条件编译保留原生 API。

#### Scenario: 获取视口尺寸
- **WHEN** 业务代码需要获取视口宽度
- **THEN** 调用 `uni.getSystemInfoSync().windowWidth`
- **AND** 不直接使用 `window.innerWidth`

### Requirement: 路由常量集中管理

系统 SHALL 通过 `constants/routes.ts` 中的 ROUTE_* 常量管理所有页面路径，业务代码不得硬编码路径字符串。

#### Scenario: 页面跳转
- **WHEN** 业务代码调用 `uni.navigateTo`
- **THEN** URL 参数引用 ROUTE_* 常量
- **AND** 不出现字符串字面量路径

### Requirement: ARIA 无障碍属性

系统 SHALL 为所有交互元素（icon-only 按钮、卡片、菜单项）添加 `role` 与 `aria-label` 属性，确保读屏器可识别。

#### Scenario: 图标按钮可访问
- **WHEN** 渲染仅含图标的可点击元素
- **THEN** 添加 `role="button"` 与 `:aria-label="t('...')"`
- **AND** aria-label 通过 i18n 引用，不硬编码

### Requirement: 平台判断收敛

系统 SHALL 将所有平台判断（H5 / mp-weixin / App）收敛到 `config/env.ts` 与 `compat/index.ts`，业务代码引用语义化常量。

#### Scenario: 业务代码引用平台常量
- **WHEN** 业务代码需要判断当前平台
- **THEN** 引用 `import { isH5, isMpWeixin } from "@/config/env"`
- **AND** 不直接写 `#ifdef H5` 条件编译

## MODIFIED Requirements

### Requirement: 客户端设计系统完整性

P2.H 阶段客户端设计系统在原 75-80% 完成度基础上，通过补齐图片懒加载、空状态统一、超时控制、API 适配、路由常量、ARIA 无障碍、平台降级 7 类任务，达到商业化交付水准。

## REMOVED Requirements

无移除项。
