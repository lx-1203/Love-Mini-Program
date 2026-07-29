# Tasks

## 任务29：图片懒加载补齐
- [x] Task 29.1: 扫描全部 .vue 文件，统计 `<image>` 标签总数与已有 `lazy-load` 数
- [x] Task 29.2: 为 `components/discover/LongPressMenu.vue` 4 个菜单项图标补齐 `lazy-load="true"`
- [x] Task 29.3: 为 `subpackages/discover/**/*.vue` 列表图片补齐 `lazy-load="true"`（排除首屏 Banner）
- [x] Task 29.4: 为 `subpackages/village/**/*.vue` 帖子图片、评论图片补齐 `lazy-load="true"`
- [x] Task 29.5: 为 `subpackages/circles/**/*.vue` 话题图片、消息列表图片补齐 `lazy-load="true"`
- [x] Task 29.6: 为 `pages/discover/**/*.vue` 卡片图片补齐 `lazy-load="true"`
- [x] Task 29.7: 为 `pages/profile/**/*.vue`、`pages/home/**/*.vue` 剩余列表图片补齐 `lazy-load="true"`
- [x] Task 29.8: Grep 验证 `lazy-load="true"` 覆盖率 ≥ 列表图片 90%

## 任务30：EmptyState 组件统一
- [x] Task 30.1: Grep 扫描 "暂无\|空空如也\|没有更多\|empty" 定位散落空状态实现
- [x] Task 30.2: 在 `subpackages/discover/activities/index.vue` 用 `<EmptyState>` 替换"暂无活动"块
- [x] Task 30.3: 在 `subpackages/village/**/*.vue` 用 `<EmptyState>` 替换帖子空状态
- [x] Task 30.4: 在 `subpackages/circles/**/*.vue` 用 `<EmptyState>` 替换话题空状态
- [x] Task 30.5: 在 `pages/profile/**/*.vue` 用 `<EmptyState>` 替换我的帖子空状态
- [x] Task 30.6: 在 `pages/discover/**/*.vue` 用 `<EmptyState>` 替换推荐用户空状态
- [x] Task 30.7: Grep 验证散落空状态文案数量下降 ≥ 70%

## 任务31：AbortController 超时
- [x] Task 31.1: 检查 `services/http.ts` 是否实现 AbortController + 超时清理
- [x] Task 31.2: 验证默认超时 15s 可通过 options.timeout 覆盖
- [x] Task 31.3: 验证上传接口（图片/视频）超时合理（≥ 60s）
- [x] Task 31.4: Grep 排查是否有直接使用 `uni.request` 绕过 http.ts 的代码
- [x] Task 31.5: 补齐缺失的超时单元测试

## 任务32：uni.* API 适配
- [x] Task 32.1: Grep 扫描 `window\.\|document\.\|navigator\.\|TouchEvent\|innerHTML`
- [x] Task 32.2: 替换 `window.innerWidth/innerHeight` → `uni.getSystemInfoSync().windowWidth/windowHeight`
- [x] Task 32.3: 替换 `document.querySelector` → uni.createSelectorQuery
- [x] Task 32.4: 替换 `navigator.userAgent` → `uni.getSystemInfoSync().platform`
- [x] Task 32.5: H5 专属 API 用 `#ifdef H5` 条件编译包裹
- [x] Task 32.6: Grep 验证业务代码中浏览器原生 API 引用 ≤ 5 处（均在 #ifdef H5 内）

## 任务33：ROUTE_* 常量替换
- [x] Task 33.1: 检查 `constants/routes.ts` 是否覆盖 pages.json 所有路由
- [x] Task 33.2: Grep 扫描 `uni\.navigateTo\|uni\.redirectTo\|uni\.reLaunch\|uni\.switchTab` 调用
- [x] Task 33.3: 替换 `pages/**/*.vue` 硬编码路径为 ROUTE_* 常量
- [x] Task 33.4: 替换 `subpackages/**/*.vue` 硬编码路径为 ROUTE_* 常量
- [x] Task 33.5: 替换 `components/**/*.vue` 硬编码路径为 ROUTE_* 常量
- [x] Task 33.6: 替换 `composables/**/*.ts` 与 `utils/**/*.ts` 硬编码路径
- [x] Task 33.7: Grep 验证硬编码路径字符串（'/pages/'、'/subpackages/'）≤ 5 处

## 任务34：ARIA 无障碍补齐
- [x] Task 34.1: Grep 扫描 `@click\|@tap` 定位交互元素
- [x] Task 34.2: 为 `components/discover/**/*.vue` icon-only 按钮添加 role + aria-label
- [x] Task 34.3: 为 `components/common/**/*.vue` icon-only 按钮添加 role + aria-label
- [x] Task 34.4: 为 `components/social/**/*.vue` icon-only 按钮添加 role + aria-label
- [x] Task 34.5: 为 `pages/**/*.vue` 卡片、菜单项添加 role + aria-label
- [x] Task 34.6: 为 `subpackages/**/*.vue` 卡片、菜单项添加 role + aria-label
- [x] Task 34.7: Grep 验证 `@tap`/`@click` 但无 `aria-label` 的元素 ≤ 10 处

## 任务35：config/env.ts 平台降级
- [x] Task 35.1: 检查 `config/env.ts` 暴露 `isH5`、`isMpWeixin`、`isApp`、`isDev`、`isProd` 等语义化常量
- [x] Task 35.2: 检查 `compat/index.ts` 提供平台差异工具方法
- [x] Task 35.3: Grep 扫描业务代码（非 config/compat）中的 `#ifdef` 条件编译
- [x] Task 35.4: 将业务代码中的 `#ifdef H5` / `#ifdef MP-WEIXIN` 替换为 `if (isH5)` / `if (isMpWeixin)`
- [x] Task 35.5: 保留必要的底层（utils/services）条件编译
- [x] Task 35.6: Grep 验证业务代码（pages/components/subpackages）中 `#ifdef` 数量 ≤ 10 处

## 验证
- [x] Task V1: 运行 `npm --workspace apps/client run typecheck` 通过
- [x] Task V2: 运行 `npm --workspace apps/client run build:mp-weixin` 通过
- [x] Task V3: 运行 `npm --workspace apps/client run test:unit`（存在预存失败，与本次修改无关）
- [x] Task V4: Grep 验证 lazy-load、ROUTE_*、aria-label 覆盖率指标
- [x] Task V5: 输出最终汇报：每任务修改文件数、新建文件、验证结果、残留项

# Task Dependencies

- Task 29-34 互相独立，可并行执行
- Task 35 依赖 Task 32 完成（API 适配后再收敛平台判断）
- Task V1-V5 依赖所有功能任务完成
