# Phase K 规格说明：功能完善 + 覆盖率补全 + 真机验证准备

> 创建时间：2026-07-04
> 前置阶段：Phase A-J（H5 优先综合修复与视觉层级强化）
> 关联文档：
> - `tasks.md`（Phase K 任务清单）
> - `checklist.md`（Phase K 验收清单）
> - `../screenshots/2026-07-03-mp-weixin-polish/mp-weixin-phase-k-verification-checklist.md`（真机验证清单）

---

## 1. 阶段目标

Phase K 是 Phase A-J 完成后的「功能完善 + 质量量化 + 真机验证准备」阶段，主要解决 Phase J 遗留的 3 项问题：

1. **覆盖率无法量化**：Phase J 时项目未安装 `@vitest/coverage-v8`，覆盖率指标只能定性描述。Phase K 安装工具并设定阈值，使覆盖率可量化、可监控。
2. **个人中心入口空挂**：profile 页"设置"、"恋爱认证"菜单项与 VIP 卡片点击均为 toast/modal 占位提示，无实际功能页。Phase K 实现三个完整功能页并连通跳转。
3. **新增页面未编译验证**：Phase J 的 mp-weixin 验证报告基于未含新页面的构建产物。Phase K 重新编译 mp-weixin 并生成针对性的真机验证清单。

---

## 2. 范围

### 2.1 包含

- **K1 覆盖率工具**：安装 `@vitest/coverage-v8`，配置 `vitest.config.ts`，执行覆盖率报告
- **K2 设置页**：实现 `pages/settings/index.vue`（5 个分组：账号管理、通知设置、隐私安全、存储管理、关于）
- **K3 恋爱认证页**：实现 `pages/verification/index.vue`（4 种状态切换、认证表单、模拟审核）
- **K4 VIP 开通页**：实现 `pages/vip/index.vue`（深色主题、3 套餐选择、6 项权益、底部固定开通按钮）
- **K5 H5 生产构建验证**：执行 `build:h5`，启动静态服务器验证 5 tab + 3 新页面 JS 可访问
- **K6 mp-weixin 重新编译 + 真机验证清单**：执行 `build:mp-weixin`，验证新页面产物完整性，生成真机验证清单
- **K7 同步 spec**：更新 tasks.md/checklist.md，生成本 spec 文件

### 2.2 不包含（Phase L 处理）

- 多数 store（activity/campus/chat/circle 等）的单元测试补全
- Sass `@import` 与 `darken()` 废弃语法迁移
- `pnpm-workspace.yaml` 创建
- 真机 API 联调（`VITE_API_MODE=real` 切换）
- agent-browser 实际截图验证（由用户在微信开发者工具中真机验证）

---

## 3. 关键决策

### 3.1 覆盖率阈值设定

**决策**：statements 25% / branches 55% / functions 50% / lines 25%

**依据**：
- 核心组件（Button/Ripple/checkin/profile/likes）覆盖率均 ≥ 70%，已达标
- 整体覆盖率受未测试 store 影响（activity/campus/chat/circle 暂未编写测试），首轮基线为 26.81%
- 阈值设为略低于基线（25%），保证不破坏现有 CI；branches/functions 阈值较高（55%/50%）是因为已测试的核心组件拉高了这两项指标
- Phase L 补全 store 测试后，阈值可提升至 70%

### 3.2 三个新页面采用纯前端 mock 模式

**决策**：settings/verification/vip 三个页面均不接入真实 API，所有交互用本地 ref 状态模拟

**依据**：
- 后端接口尚未稳定，避免后续接口变更导致返工
- 用户可在 K6 真机验证清单中走完所有交互流程，验证 UI/UX
- Phase L 切换 `VITE_API_MODE=real` 时，仅需替换 mock 函数为 store action

### 3.3 settings 页 logout 修复

**决策**：移除 `require()`，改用顶部 ESM `import { useSessionStore }`

**依据**：
- uni-app vite-plugin-uni 编译产物为 ESM，`require()` 在 mp-weixin 环境不可用
- 顶部 import 是 Vue 3 组合式 API 的标准模式，与项目其他页面一致

### 3.4 profile 入口跳转改造

**决策**：
- "设置"菜单项：`action: () => uni.showToast(...)` → `path: "/pages/settings/index"`
- "恋爱认证"菜单项：`action: () => uni.showToast(...)` → `path: "/pages/verification/index"`
- `handleVipClick` 函数：`uni.showModal({...})` → `openAppPath("/pages/vip/index")`

**依据**：
- `handleMenuTap` 已能自动处理 `path` 字段（调用 `openAppPath`），无需新增逻辑
- 移除 action 回调简化代码，由 path 字段统一驱动跳转
- VIP 卡片点击不在 menuItems 中，单独改造 `handleVipClick`

### 3.5 注释中 `#ifdef/#ifndef` 字面量修复

**决策**：将 `// #ifdef H5 / // #ifndef H5` 改为 `条件编译块（ifdef H5 / ifndef H5）`

**依据**：
- uni-app vite-plugin-uni 的条件编译预处理器使用正则匹配 `// #ifdef` / `// #ifndef` 字面量
- 即使在 `/** ... */` 注释块内，预处理器仍会误识别，导致 `条件编译失败: #ifdef/#ifndef 缺少配对的 #endif` 警告
- 改写为非字面量文本（去掉 `// ` 前缀）即可绕过正则匹配

---

## 4. 验收结果

### 4.1 K1 覆盖率

| 指标 | 阈值 | 实际 | 状态 |
| --- | --- | --- | --- |
| Statements | 25% | 26.81% | ✅ |
| Branches | 55% | 59.57% | ✅ |
| Functions | 50% | 54.08% | ✅ |
| Lines | 25% | 26.81% | ✅ |

核心组件覆盖率：
- `components/common/Button.vue`: 100%
- `stores/checkin.ts`: 87.42%
- `view-models/profile.ts`: 80.58%
- `stores/likes.ts`（likes 页）: 70.36%

### 4.2 K2-K4 新页面产物

| 页面 | 源文件 | H5 JS | mp-weixin 四件套 | 路由注册 |
| --- | --- | --- | --- | --- |
| 设置 | `pages/settings/index.vue` | ✅ | ✅ | ✅ |
| 恋爱认证 | `pages/verification/index.vue` | ✅ | ✅ | ✅ |
| VIP 开通 | `pages/vip/index.vue` | ✅ | ✅ | ✅ |

### 4.3 K5 H5 构建验证

- 构建命令：`pnpm --filter client build:h5`
- 退出码：0
- 输出：`DONE  Build complete.`
- index.html：✅ 200 OK（HTTP 658 字节）
- 5 tab 页面 JS：✅ 全部 200 OK（home/village/discover/chat/profile）
- 3 新页面 JS：✅ 全部 200 OK（settings/verification/vip）

### 4.4 K6 mp-weixin 构建验证

- 构建命令：`pnpm --filter client build:mp-weixin`
- 退出码：0
- 输出：`DONE  Build complete.`
- 警告：无 `#ifdef/#ifndef` 配对警告（K5 已修复）
- 3 新页面 mp-weixin 四件套：✅ 全部完整（.js/.json/.wxml/.wxss）
- `app.json` 第 26-28 行已注册 3 条新路由

### 4.5 K6 真机验证清单

- 文件：`.trae/screenshots/2026-07-03-mp-weixin-polish/mp-weixin-phase-k-verification-checklist.md`
- 行数：155 行
- 章节：5 节（产物验证 / 操作步骤 / 遗留问题 / 验收标准 / 回滚方案）
- 8 个核心页面截图清单
- 5 项核心交互验证（签到/匹配 + 3 新页面交互）
- 7 项 Console 错误检查
- 4 项性能验证
- 4 项遗留问题（Phase L 处理）

---

## 5. 文件变更清单

### 5.1 新增文件

| 文件路径 | 用途 | 行数（约） |
| --- | --- | --- |
| `apps/client/src/pages/settings/index.vue` | 设置页 | - |
| `apps/client/src/pages/verification/index.vue` | 恋爱认证页 | - |
| `apps/client/src/pages/vip/index.vue` | VIP 开通页 | - |
| `.trae/screenshots/2026-07-03-mp-weixin-polish/mp-weixin-phase-k-verification-checklist.md` | 真机验证清单 | 155 |
| `.trae/specs/2026-07-03-h5-first-comprehensive-polish/phase-k-spec.md` | Phase K spec | 本文件 |

### 5.2 修改文件

| 文件路径 | 修改内容 |
| --- | --- |
| `apps/client/vitest.config.ts` | 添加 coverage 配置块（provider/reporter/include/exclude/thresholds） |
| `apps/client/package.json` | devDependencies 新增 `@vitest/coverage-v8@^2.1.9` |
| `apps/client/src/pages.json` | pages 数组新增 3 条路由（settings/verification/vip） |
| `apps/client/src/pages/profile/index.vue` | 3 处入口跳转改造（设置/认证/VIP）+ 第 250 行注释 `#ifdef` 字面量修复 |

---

## 6. Phase L 规划建议

基于 Phase K 暴露的遗留问题，建议 Phase L 包含以下任务：

### 6.1 测试覆盖率提升
- Task L1: 补全 `stores/activity.ts` 单元测试
- Task L2: 补全 `stores/campus.ts` 单元测试
- Task L3: 补全 `stores/chat.ts` 单元测试
- Task L4: 补全 `stores/circle.ts` 单元测试
- Task L5: 提升覆盖率阈值至 70%（statements/branches/functions/lines）

### 6.2 工程化优化
- Task L6: 创建 `pnpm-workspace.yaml` 显式声明工作区
- Task L7: 迁移 Sass `@import` 至 `@use`，`darken()` 至 `color.adjust()`

### 6.3 真机联调
- Task L8: 后端 API 接口稳定后，切换 `VITE_API_MODE=real` 联调
- Task L9: settings/verification/vip 三个新页面接入真实 API（替换 mock 函数为 store action）

### 6.4 真机验证归档
- Task L10: 用户在微信开发者工具中执行 Phase K 真机验证清单
- Task L11: 截图归档到 `.trae/screenshots/2026-07-03-h5-polish/production/`
- Task L12: 生成 Phase L 真机验证报告

---

## 7. 风险与回滚

### 7.1 已知风险

| 风险 | 影响 | 缓解措施 |
| --- | --- | --- |
| 真机验证发现新页面交互异常 | 用户无法使用设置/认证/VIP 功能 | 回滚方案见 mp-weixin-phase-k-verification-checklist.md 第 5 节 |
| 覆盖率阈值过低导致后续 CI 漏检 | 测试质量下降 | Phase L 提升至 70% |
| mp-weixin 基础库版本差异导致 sticky/backdrop-filter 异常 | 部分页面样式失效 | project_memory 已记录：基础库 2.8.0+ 支持 sticky；backdrop-filter 已有 0.96 opacity fallback |

### 7.2 回滚步骤

如真机验证发现严重问题：

1. 回退 `apps/client/src/pages.json`（删除 3 个新页面条目）
2. 回退 `apps/client/src/pages/profile/index.vue` 三处入口跳转（恢复 action/toast/modal）
3. 重新执行 `pnpm --filter client build:mp-weixin`
4. 重新导入微信开发者工具验证

---

## 8. 总结

Phase K 共完成 7 个任务、29 个子任务，新增 3 个功能页面、1 个真机验证清单、1 个 spec 文件，修改 4 个核心文件。H5 与 mp-weixin 双端构建均通过，所有可量化指标达标。剩余真机验证交由用户在微信开发者工具中执行，Phase L 将处理测试覆盖率提升与真机 API 联调。
