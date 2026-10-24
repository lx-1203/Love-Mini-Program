## 1. 技术栈与总体方案

- **框架**：uni-app（`@dcloudio/uni-h5`、`@dcloudio/uni-components`、`@dcloudio/uni-ui`），同时输出 H5 与微信小程序（mp-weixin）。
- **样式语言**：SCSS（`.scss`），通过 uni-app 的 wxss 编译管线产出；不使用 Tailwind，也没有 `tailwind.config.*`。
- **主题系统**：以 SCSS `$` 变量为唯一设计源，映射到 CSS 自定义属性 `--c-*` / `--r-*` / `--sp-*` / `--fs-*` / `--s-*`，再由业务组件消费。不存在运行时主题切换库，Dark Mode 通过 `[data-theme="dark"]` 选择器覆盖实现。
- **构建产物**：`apps/client/dist/assets/*.css` 为 Vite 打包后的样式文件。

## 2. 关键文件与分层

| 路径 | 职责 |
|---|---|
| `apps/client/src/theme/design-variables.scss` | 底层设计源：品牌色、中性色、语义色、渐变、圆角、阴影等全部以 SCSS `$` 变量定义并输出 `--c-*` 等 CSS 变量 |
| `apps/client/src/styles/tokens.scss` | 语义化 token 入口（kebab-case 别名 `--color-primary`、`--spacing-md`、`--font-size-lg`…），统一引入 `design-variables.scss` 并提供 Dark Mode 覆盖 |
| `apps/client/src/theme/global.scss` | 全局原子工具类：`.flex-*`、`.text-*`、`.bg-*`、`.gradient-*`、`.radius-*`、`.shadow-*` 等 |
| `apps/client/src/styles/_components.scss` | 复合基础组件类：`.base-card`、`.base-btn`、`.base-avatar`、`.base-tag`、`.base-badge`，作为 scoped 扩展基类 |
| `apps/client/src/styles/_mixins.scss` | 共享 SCSS mixin：`flex-center`、`text-ellipsis`、`safe-area-top/bottom`、`hairline-border`、`press-feedback`、`aspect-ratio`、`sr-only` 等 |
| `apps/client/src/styles/a11y.scss` | 无障碍工具类 `.sr-only` / `.sr-only-focusable` |
| `apps/client/src/theme/animations.scss` | 全局 keyframes 与动画工具类（从 `uni.scss` 迁移，避免被 uni-app 注入每个组件） |
| `apps/client/src/uni.scss` | uni-app 自动注入点（仅含注释约束 R4-00241），禁止放置规则 |
| `apps/client/src/components/uni.scss`、`src/pages/uni.scss`、`src/subpackages/*/uni.scss` | 各目录的 `@use "../uni.scss" as *;` 占位，继承根 uni.scss 以复用 SCSS 变量 |

## 3. 架构约定与设计决策

### 3.1 设计令牌单向流
```
design-variables.scss ($ 变量) → tokens.scss (CSS 变量别名) → 业务组件 (var(--color-*))
```
`tokens.scss` 明确声明自己是「全项目设计 token 的唯一入口」，业务代码不得直接引用 `design-variables.scss` 中的 `$` 变量。

### 3.2 mp-weixin 兼容层
- 所有 CSS 变量选择器使用 `page { ... }` 而非 `:root`（微信 WXSS 不支持 `:root`）。
- 深色模式覆盖写在 `page[data-theme="dark"]` 下，H5 端通过 `<html data-theme="dark">` 或 `<body data-theme="dark">` 切换。
- `aspect-ratio` 不直接使用 CSS 属性，改用 `_mixins.scss` 中的 `padding-top` 百分比 hack（注释写明「mp-weixin 不支持 aspect-ratio」）。
- 滚动条隐藏、`-webkit-line-clamp` 等均有 mp-weixin 兜底逻辑。

### 3.3 原子类 + 复合类的双层样式组织
- `global.scss` 提供纯原子类（布局、颜色、字号、阴影），无状态、无嵌套。
- `_components.scss` 提供带交互态的复合类（卡片、按钮、头像、标签、徽章），采用 BEM 风格修饰符（如 `.base-card--interactive`、`.base-btn--primary`）。
- 组件内通过 `scoped` 样式扩展这些 base 类，避免类名冲突（多处注释记录了「修复 P3 重复样式问题：原 .card/.avatar/.tag 在多个组件重复定义，现统一用 .base-*」）。

### 3.4 安全区域与平台适配
- 顶部/底部安全区通过 `env(safe-area-inset-*)` 与 `constant()` 双写覆盖 iOS < 11.2 / >= 11.2。
- 全局禁用点击高亮：`-webkit-tap-highlight-color: transparent`。
- 1px 边框通过 `hairline-border` mixin 用 `transform: scaleY(0.5)` 缩放 1rpx 实现视网膜屏效果。

### 3.5 动画与可访问性
- 所有 keyframes 集中在 `theme/animations.scss`，由 `App.vue` 全局引入一次，不再放在 `uni.scss`（R4-00241 约束）。动画时长走 `--duration-*` / `--d-*` 令牌。
- A11Y 独立文件 `a11y.scss`，遵循 W3C WAI-ARIA APG，提供屏幕阅读器可见但视觉隐藏的 `.sr-only`。

## 4. 观察到的约定与约束

- **强制约束（R4-00241）**：`src/uni.scss` 中明文禁止放置 CSS 规则（keyframes / 类选择器 / page 块），因为 uni-app 会将该文件自动注入每个组件的 wxss，导致开发者工具警告和体积膨胀。变量与 mixin 必须放在根 `uni.scss` 或 `theme/design-variables.scss`。（来源：`apps/client/src/uni.scss` 头部注释）
- **Token 单一入口**：`tokens.scss` 注释声明其为「全项目设计 token 的唯一入口」，业务代码应通过 kebab-case 语义别名引用，避免分散硬编码。（来源：`apps/client/src/styles/tokens.scss` 头部说明）
- **Dark Mode 优先级**：手动 `[data-theme="dark"]` 优先于系统 `prefers-color-scheme: dark`，且只覆盖背景/文本/边框相关 token，品牌色保持不变。（来源：`apps/client/src/styles/tokens.scss` Dark Mode 章节注释）
- **命名规范**：SCSS 变量使用 camelCase（`$brand-50`、`$bg-page`），CSS 变量使用 kebab-case（`--color-primary`、`--spacing-md`），组件类使用 BEM（`.base-card--interactive`）。
- **单位约定**：尺寸类 token 统一使用 rpx（圆角、字号、间距），仅在阴影中使用 px 级值；`tokens.scss` 显式记录每档 token 对应的 rpx 值（如 `--spacing-md: var(--sp-3); // 12rpx`）。
- **响应策略**：无断点媒体查询，依赖 rpx 相对单位和 safe-area 环境变量进行自适应；未引入任何 UI 组件库（除 uni-app 官方组件外）。
- **版本标记**：每个样式文件头部均标注版本号（如 `version: 5.0.0`、`version: 1.0.0`），便于追踪演进。

## 5. 不适用项

- 无 Tailwind / PostCSS 插件链（未发现 `tailwind.config.*`）。
- 无第三方 UI 组件库（Ant Design Vue、Vant 等）——仅使用 uni-app 官方组件及自研 `.base-*` 原子类。
- 无 CSS-in-JS（无 styled-components、emotion 等）。
- 无构建时样式 lint 配置（根目录仅有 ESLint/Prettier，未见 stylelint 配置）。