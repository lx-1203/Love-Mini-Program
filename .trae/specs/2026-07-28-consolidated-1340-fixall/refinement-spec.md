# 客户端 v-for/.stop/setTimeout 三任务收尾验证与补全 Spec

> 本 spec 为 `2026-07-28-consolidated-1340-fixall` 的 refinement，聚焦用户原始三项任务（A: v-for :key 补齐、B: .stop 修饰符替换、C: setTimeout 清理）的最终验证与补全。

## Why

用户在 2026-07-28 提出三项客户端修复任务（A/B/C），原 spec 已将 Task 16/17/18 标记为完成。但本次重新核验代码库实际状态后发现：

- **任务 A（v-for :key）**：✅ 验证通过 —— 全量扫描 `apps/client/src/**/*.vue` 共 60+ 处 `v-for`，全部带 `:key` 属性，遵循 `item.id` 优先策略，无业务字段时使用 `index` + 唯一组合（如 `step-${step.stepNo}`）。
- **任务 B（.stop 修饰符）**：⚠️ 源码层面未替换 —— 原 spec Task 17 验证的是 **mp-weixin 构建产物** 中无 `.stop` 残留（uni-app 编译器将 `@tap.stop` 自动转为 `catchtap`），但**源 .vue 文件中仍存在 59 处 `@tap.stop`/`@touchmove.stop.prevent`**。用户原始诉求为"替换 .stop 修饰符为 catchtap/catchclick，并在 handler 中添加 `event.stopPropagation()`"，需在源码层面完成替换以达到"完美解决"标准。
- **任务 C（setTimeout 清理）**：✅ 验证通过 —— 抽样核查 `VoicePill.vue`、`HeartParticles.vue`、`Ripple.vue`、`Toast.vue`、`LikeBurst.vue`、`PostReportDialog.vue`、`SocialProgressIndicator.vue` 等 7+ 组件，全部 `setTimeout` 调用均保存 timer 引用到模块级变量或闭包变量，并在 `onUnmounted`/`onBeforeUnmount`/`onUnload` 或对应清理函数中 `clearTimeout`。

用户最新指令"继续研究直到问题完全完美解决"，要求按用户严格解读补全任务 B 的源码层面替换，并跑通 3 个验证命令以形成最终汇报。

## What Changes

### 任务 A 收尾验证（无需修改）
- 全量 Grep 验证 `apps/client/src/**/*.vue` 与 `apps/client/pages/**/*.vue` 共 0 处 `v-for` 缺失 `:key`
- 跑通 `npm --workspace apps/client run typecheck` 与 `build:mp-weixin`

### 任务 B 源码层面补全（核心工作）
- 将 59 处 `@tap.stop` / `@touchmove.stop.prevent` / `@tap.stop="noop"` 源码层面的修饰符替换为 `catchtap` / `catchtouchmove`（mp-weixin 原生事件），保留 `prevent` 语义时改在 handler 内 `event.preventDefault()`（仅 H5 生效，mp-weixin 默认不触发默认行为）
- 对应 handler 在 H5 端需保留冒泡阻止语义：在 handler 函数体首行添加 `event.stopPropagation()`（mp-weixin 端 `catchtap` 已原生阻止冒泡，`stopPropagation` 为 no-op 不影响行为）
- 涉及 17 个文件（按 FIN-00176/00178/00186 等清单）：
  - `components/discover/FilterDrawer.vue`（1 处）
  - `components/discover/CardSwiper.vue`（3 处：touchmove.stop.prevent、tap.stop×2）
  - `components/chat/ChatBubble.vue`（1 处）
  - `components/UnlockGuideModal.vue`（3 处）
  - `components/social/WallPostCard.vue`（4 处）
  - `components/social/PostReportDialog.vue`（4 处）
  - `components/common/ShareCard.vue`（1 处）
  - `pages/vip/red-packet.vue`（1 处）
  - pages/village/index.vue（8 处）
  - pages/village/detail.vue（2 处）
  - pages/discover/index.vue（1 处）
  - pages/home/index.vue（1 处）
  - pages/chat-session/index.vue（2 处：`@tap.stop="noop"`）
  - pages/chat/red-packet.vue（1 处：`@tap.stop="noop"`）
  - pages/circles/topics.vue（1 处）
  - pages/circles/topic-detail.vue（3 处）
  - pages/circles/index.vue（1 处）
  - pages/circle/index.vue（4 处）
  - subpackages/support/feedback/index.vue（1 处）

### 任务 C 收尾验证（无需修改）
- 抽样核查已有 `setTimeout` 调用全部保存 timer 引用并在卸载时 `clearTimeout`
- 跑通 `npm --workspace apps/client run typecheck` 确认无类型回归

### 三项验证命令闭环
- `npm --workspace apps/client run typecheck`
- `npm --workspace apps/client run build:mp-weixin`
- Grep 验证：`grep -rn "v-for" apps/client/src --include="*.vue" | grep -v ":key"` 为空

## Impact

- Affected specs: `2026-07-28-consolidated-1340-fixall`（原 spec Task 16/17/18 状态需根据本次补全结果同步更新）、`2026-07-27-reaudit-fixall`
- Affected code:
  - 任务 B 源码替换涉及 17 个 .vue 文件，约 59 处事件绑定
  - 部分文件需同步修改 handler 函数签名（添加 `event` 参数并在函数体首行调用 `event.stopPropagation()`）
  - 任务 A/C 无代码修改，仅验证

## ADDED Requirements

### Requirement: 源码层面 .stop 修饰符零残留
客户端 SHALL 在源码 `.vue` 文件中不存在 `@tap.stop` / `@click.stop` / `@touchmove.stop` 等事件修饰符语法；SHALL 使用 `catchtap` / `catchtouchmove` 等 mp-weixin 原生捕获事件语法替代；SHALL 在对应 handler 中调用 `event.stopPropagation()` 以保证 H5 端冒泡可控。

#### Scenario: 源码 Grep 零命中
- **WHEN** 执行 `grep -rnE "@(tap|click|touchstart|touchmove|touchend|longpress)\.stop" apps/client/src --include="*.vue"`
- **THEN** 输出为空，无任何 `.stop` 修饰符残留

#### Scenario: mp-weixin 端冒泡被阻止
- **GIVEN** 内层按钮使用 `catchtap` 绑定
- **WHEN** 用户点击内层按钮
- **THEN** 父级 `@tap` 不被触发，mp-weixin 端冒泡被原生阻止

#### Scenario: H5 端冒泡被阻止
- **GIVEN** 内层按钮 handler 首行调用 `event.stopPropagation()`
- **WHEN** 用户在 H5 端点击内层按钮
- **THEN** 父级 `@click` 不被触发，H5 端冒泡被 `stopPropagation` 阻止

### Requirement: 三项验证命令全绿
系统 SHALL 在补全完成后跑通：`npm --workspace apps/client run typecheck` 退出码 0、`npm --workspace apps/client run build:mp-weixin` 退出码 0、`v-for` 缺 `:key` Grep 零命中。

#### Scenario: typecheck 通过
- **WHEN** 执行 `npm --workspace apps/client run typecheck`
- **THEN** vue-tsc --noEmit 退出码 0，无新 TS 错误

#### Scenario: mp-weixin 构建通过
- **WHEN** 执行 `npm --workspace apps/client run build:mp-weixin`
- **THEN** 退出码 0，`dist/build/mp-weixin` 产物完整，wxml 中 `catchtap` 数量 ≥ 34 处覆盖所有原 `.stop` 调用点

#### Scenario: v-for :key 零缺失
- **WHEN** 执行 `grep -rnE "v-for" apps/client/src --include="*.vue" | grep -v ":key"`
- **THEN** 输出为空

## MODIFIED Requirements

### Requirement: 客户端事件冒泡可控
原 spec Task 17 描述基于 mp-weixin 构建产物验证 `catchtap`，未约束源码层面。本次补全强化为：源码层面 SHALL 直接使用 `catchtap` / `catchtouchmove`，SHALL NOT 依赖 `@tap.stop` + 编译器自动转换。

#### Scenario: 源码直接使用 catchtap
- **WHEN** 阅读 `apps/client/src/**/*.vue` 源码
- **THEN** 所有阻止冒泡的事件绑定使用 `catchtap` / `catchtouchmove` 等 mp-weixin 原生捕获事件语法，无 `@tap.stop` 残留

## REMOVED Requirements

### Requirement: 依赖 uni-app 编译器自动转换 .stop
**Reason**: 用户要求"完美解决"，依赖编译器隐式转换增加维护成本与排查难度，源码层面直接使用 `catchtap` 更明确。
**Migration**: 59 处 `@tap.stop` 全部改为 `catchtap`，对应 handler 添加 `event.stopPropagation()` 兼容 H5。
