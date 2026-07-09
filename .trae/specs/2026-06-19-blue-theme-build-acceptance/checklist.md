# Checklist

## Phase 1: 蓝色主题统一

### 硬编码颜色审计

* [x] `apps/client/src/pages/` 目录硬编码颜色已审计

* [x] `apps/client/src/components/` 目录硬编码颜色已审计

* [x] `apps/client/src/stores/` 目录硬编码颜色已审计

* [x] 颜色分类清单已输出到 `doc/reports/modules/01-color-audit.md`

### 颜色替换

* [x] 所有非蓝色主色已替换为 `$brand-*` 令牌

* [x] 语义色（success #10B981 / warning #F59E0B / error #EF4444）保留不变

* [x] 功能色（pink #EC4899 喜欢 / accent #F97316 强调）保留不变

* [x] 替换后无破坏性样式变化

### 主题一致性验证

* [x] 5 个主页面主色调一致（蓝色系）

* [x] 4 个设置页面主色调一致（蓝色系）

* [x] 主按钮、选中态、链接均使用蓝色系

* [x] 无突兀的橙/红/紫等非蓝色主色

***

## Phase 2: 真实编译部署

### H5 编译

* [x] `npm run build:h5` 执行成功

* [x] 编译产物输出到 `apps/client/dist/build/h5/`

* [x] 编译日志无 ERROR

* [x] `index.html` 存在且资源引用正确

* [x] 编译结果记录到 `doc/reports/modules/03-h5-build.md`

### 微信小程序编译

* [x] `npm run build:mp-weixin` 执行成功

* [x] 编译产物输出到 `apps/client/dist/build/mp-weixin/`

* [x] 编译日志无 ERROR

* [x] `app.json`、`app.js` 和页面文件存在

* [x] 编译结果记录到 `doc/reports/modules/04-mp-build.md`

### HBuilderX 验证

* [x] `D:\HBuilderX` 路径可访问

* [x] `apps/client/dist/build/mp-weixin/` 可导入 HBuilderX

* [x] 项目可在 HBuilderX 中正常打开

* [x] 验证结果记录到 `doc/reports/modules/05-hbuilderx-verify.md`

***

## Phase 3: 逐页视觉检查

### 主页面视觉检查（5 页）

* [x] 首页 `/pages/home/index` 截图已保存

* [x] 讨论圈 `/pages/village/index` 截图已保存

* [x] 匹配 `/pages/discover/index` 截图已保存

* [x] 聊天 `/pages/chat/index` 截图已保存

* [x] 我的 `/pages/profile/index` 截图已保存

* [x] 每页蓝色主题一致性已检查

* [x] 每页间距规范已检查

* [x] 每页字体层级已检查

* [x] 每页图标统一性已检查

### 设置页面视觉检查（4 页）

* [x] 基础资料 `/subpackages/setup/profile/index` 截图已保存

* [x] 校区 `/subpackages/setup/campus/index` 截图已保存

* [x] 日程 `/subpackages/setup/schedule/index` 截图已保存

* [x] 推荐偏好 `/subpackages/setup/recommend-pref/index` 截图已保存

* [x] 表单输入框使用蓝色主题

* [x] 按钮使用蓝色主题

* [x] 标签使用蓝色主题

### 视觉问题修复

* [x] 所有视觉问题已汇总

* [x] 颜色问题已修复（无需修复，蓝色主题一致）

* [x] 间距问题已修复（无需修复）

* [x] 字体问题已修复（无需修复）

* [x] 图标问题已修复（无需修复）

* [x] 修复后重新截图验证通过（H5 重新编译成功）

* [x] 问题与解决方案记录到 `doc/reports/modules/07-issue-fix.md`

***

## Phase 4: 结构化验收文档

### 模块任务文档

* [x] `doc/reports/modules/` 目录已创建

* [x] `01-color-audit.md` 已生成（颜色审计模块）

* [x] `02-theme-unify.md` 已生成（主题统一模块）

* [x] `03-h5-build.md` 已生成（H5 编译模块）

* [x] `04-mp-build.md` 已生成（小程序编译模块）

* [x] `05-hbuilderx-verify.md` 已生成（HBuilderX 验证模块）

* [x] `06-visual-inspection.md` 已生成（视觉检查模块）

* [x] `07-issue-fix.md` 已生成（问题修复模块）

* [x] 每个模块文档使用列表形式展示子任务完成情况

### 主验收报告

* [x] `doc/reports/blue-theme-build-acceptance.md` 已创建

* [x] 包含窗口验收维度（每轮验收结果）

* [x] 包含子智能体验收维度（每个子智能体工作结果）

* [x] 包含问题清单与解决方案

* [x] 包含总体进度计划与跟踪表

### 全量功能验收

* [x] 5 个主页面功能可用

* [x] 4 个设置页面功能可用

* [x] 蓝色主题全应用一致

* [x] H5 编译产物可用

* [x] 小程序编译产物可用

* [x] 无运行错误（首页 activityPreview 已修复）

* [x] 无控制台报错

***

## 截图保存位置

* 主页面截图：`test-screenshots/2026-06-19-blue-theme/main/`

* 设置页面截图：`test-screenshots/2026-06-19-blue-theme/setup/`

* 修复前后对比截图：`test-screenshots/2026-06-19-blue-theme/before-after/`

***

## 追加重构任务（用户确认）

### DiscoverStore 存储同步重构

* [x] 引入 Pinia watch 机制监听状态变更

* [x] 实现 300ms 防抖存储机制

* [x] 移除 8 处手动 saveToStorage 调用

* [x] 增强 saveToStorage 错误处理

* [x] TypeScript 类型检查通过

* [x] 业务逻辑完整保留

### ChatStore 重复代码重构

* [x] 创建 withErrorHandling 高阶函数

* [x] 创建 withMockMode 高阶函数

* [x] 重构 12 个 action 方法

* [x] 消除约 80-100 行重复代码

* [x] TypeScript 类型检查通过

* [x] Mock/Real 模式切换逻辑保留
