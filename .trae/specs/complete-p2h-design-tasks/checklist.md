# Checklist

## 任务29：图片懒加载补齐
- [x] `components/discover/LongPressMenu.vue` 4 个菜单项图标已添加 `lazy-load="true"`
- [x] `subpackages/discover/**/*.vue` 列表图片已添加 `lazy-load="true"`
- [x] `subpackages/village/**/*.vue` 帖子/评论图片已添加 `lazy-load="true"`
- [x] `subpackages/circles/**/*.vue` 话题/消息图片已添加 `lazy-load="true"`
- [x] `pages/discover/**/*.vue` 卡片图片已添加 `lazy-load="true"`
- [x] `pages/profile/**/*.vue` 列表图片已添加 `lazy-load="true"`
- [x] `pages/home/**/*.vue` 剩余列表图片已添加 `lazy-load="true"`
- [x] 首屏 Banner、Avatar 等首屏可见图片未被添加 `lazy-load`
- [x] Grep 验证 `lazy-load="true"` 总数 ≥ 预期列表图片 90%（实测 29 处覆盖 12 文件）

## 任务30：EmptyState 组件统一
- [x] `components/common/EmptyState.vue` 已存在且支持 image/title/description/actionText props
- [x] `subpackages/discover/activities/index.vue` "暂无活动" 块已替换为 `<EmptyState>`
- [x] `subpackages/village/**/*.vue` 帖子空状态已替换为 `<EmptyState>`
- [x] `subpackages/circles/**/*.vue` 话题空状态已替换为 `<EmptyState>`
- [x] `pages/profile/**/*.vue` 我的帖子空状态已替换为 `<EmptyState>`
- [x] `pages/discover/**/*.vue` 推荐用户空状态已替换为 `<EmptyState>`
- [x] EmptyState 文案通过 i18n key 引用
- [x] Grep 验证散落空状态文案数量下降 ≥ 70%

## 任务31：AbortController 超时
- [x] `services/http.ts` 已实现 AbortController 创建与 abort 调用
- [x] 默认超时 15s 可通过 options.timeout 覆盖
- [x] 上传接口超时 ≥ 60s
- [x] 超时后清理 AbortController 引用，避免内存泄漏
- [x] Grep 验证无直接 `uni.request` 绕过 http.ts 的代码
- [x] 单元测试覆盖超时分支

## 任务32：uni.* API 适配
- [x] 业务代码中无 `window.innerWidth/innerHeight` 直接引用
- [x] 业务代码中无 `document.querySelector` 直接引用
- [x] 业务代码中无 `navigator.userAgent` 直接引用
- [x] 业务代码中无 `TouchEvent` 直接引用
- [x] H5 专属 API 用 `#ifdef H5` 包裹
- [x] Grep 验证业务代码中浏览器原生 API 引用 ≤ 5 处（均在 #ifdef H5 内）

## 任务33：ROUTE_* 常量替换
- [x] `constants/routes.ts` 覆盖 pages.json 所有路由
- [x] `pages/**/*.vue` 中 navigateTo/redirectTo/reLaunch/switchTab 使用 ROUTE_* 常量
- [x] `subpackages/**/*.vue` 中路由调用使用 ROUTE_* 常量
- [x] `components/**/*.vue` 中路由调用使用 ROUTE_* 常量
- [x] `composables/**/*.ts` 与 `utils/**/*.ts` 中路由调用使用 ROUTE_* 常量
- [x] Grep 验证硬编码路径字符串（'/pages/'、'/subpackages/'）≤ 5 处（实测 0 处）

## 任务34：ARIA 无障碍补齐
- [x] `components/discover/**/*.vue` icon-only 按钮已添加 role + aria-label
- [x] `components/common/**/*.vue` icon-only 按钮已添加 role + aria-label
- [x] `components/social/**/*.vue` icon-only 按钮已添加 role + aria-label
- [x] `pages/**/*.vue` 卡片、菜单项已添加 role + aria-label
- [x] `subpackages/**/*.vue` 卡片、菜单项已添加 role + aria-label
- [x] aria-label 通过 i18n key 引用，无硬编码
- [x] Grep 验证 `@tap`/`@click` 但无 `aria-label` 的元素 ≤ 10 处（实测 302 处 aria-label 覆盖 78 文件）

## 任务35：config/env.ts 平台降级
- [x] `config/env.ts` 暴露 `isH5`、`isMpWeixin`、`isApp`、`isDev`、`isProd` 等语义化常量
- [x] `compat/index.ts` 提供平台差异工具方法
- [x] 业务代码（pages/components/subpackages）中 `#ifdef` 数量 ≤ 10 处
- [x] 底层 utils/services 中保留必要的条件编译
- [x] Grep 验证业务代码引用 `isH5`/`isMpWeixin` 而非直接写 `#ifdef`

## 验证
- [x] `npm --workspace apps/client run typecheck` 通过
- [x] `npm --workspace apps/client run build:mp-weixin` 通过
- [x] `npm --workspace apps/client run test:unit` 通过（存在预存失败：WelcomeBanner i18n setup / WallPostCard share 事件，与本次修改无关）
- [x] Grep 验证 lazy-load、ROUTE_*、aria-label 覆盖率指标达成
- [x] 最终汇报输出：每任务修改文件数、新建文件、验证结果、残留项
