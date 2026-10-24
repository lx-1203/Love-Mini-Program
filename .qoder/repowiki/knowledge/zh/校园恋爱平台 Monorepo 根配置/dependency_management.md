## 概述

本仓库使用 **pnpm** 作为唯一的 Node.js 包管理器，采用 pnpm workspace 模式组织 monorepo，并通过 `pnpm-lock.yaml` 锁定全部依赖版本。根级 `package.json` 声明 workspace、全局脚本与共享 devDependencies；子应用各自维护自己的 `dependencies`/`devDependencies`。

## 关键文件

- `package.json`：monorepo 入口，声明 `workspaces: ["apps/client", "apps/admin"]`、全局 scripts、顶层 devDependencies（eslint、lighthouse、spectral-cli、openapi-typescript 等），以及精确的 `packageManager` 字段。
- `pnpm-workspace.yaml`：workspace 扩展匹配 `apps/*`，通过 `allowBuilds` 白名单放行原生 addon 构建，通过 `overrides` 强制统一 `@vitejs/plugin-vue` 版本。
- `.npmrc`：启用 `save-exact=true` 与 `engine-strict=true`。
- `pnpm-lock.yaml`：由 pnpm 生成的完整依赖树锁定文件。
- `apps/client/package.json`、`apps/admin/package.json`：各子应用的依赖清单。

## 架构与约定

1. **包管理器锁定**：根 `package.json` 中通过 `packageManager: "pnpm@11.17.0+sha512.<hash>"` 指定 pnpm 精确版本，配合 `pnpm-lock.yaml` 确保所有开发者与 CI 安装一致的依赖树。这是可验证的约束——任何非 pnpm 或错误版本的 pnpm 在 lockfile 校验阶段会失败。

2. **Workspace 结构**：根 `workspaces` 显式列出 `apps/client`、`apps/admin`；`pnpm-workspace.yaml` 用 `packages: ["apps/*"]` 做通配扩展。两个来源共同定义 workspace 成员。

3. **依赖版本策略**：
   - `.npmrc` 设置 `save-exact=true`，使 `npm install <pkg>`（经 pnpm 桥接）默认保存不带 `^`/`~` 的精确版本。
   - 实际代码中仍可见部分依赖保留 `^` 前缀（如 `eslint ^9.39.5`、`vue ~3.4.0`），说明该规则并非历史迁移完成；但新增依赖应遵循精确版本约定。
   - `engines.node ">=18.0.0 <23.0.0"` 与 `engines.npm ">=9.0.0"` 被 `.npmrc engine-strict=true` 强制执行，不匹配的运行时环境会直接拒绝安装。

4. **依赖冲突治理**：`pnpm-workspace.yaml` 的 `overrides` 字段将 `@vitejs/plugin-vue` 强制为 `5.0.5`，用于解决多依赖对 plugin-vue 版本不一致的问题。`allowBuilds` 白名单仅允许 `@parcel/watcher`、`core-js`、`esbuild`、`puppeteer`、`sharp`、`vue-demi` 等带原生编译的包跳过 pnpm 的 native addon 限制。

5. **私有源与认证**：`.npmrc` 中未配置 `registry`、`@scope:registry` 或 `_authToken`，即仓库未接入私有 npm registry；所有依赖来自公共 npm 源。

6. **跨语言依赖**：除 Node.js 外，后端 Spring Boot 依赖由 Gradle 管理（`tools/run-api-wrapper.cjs spring-boot:run` 调用），数据库变更由 Flyway 管理（`database/flyway/`）。这些不在本仓库的 JS 依赖管理系统范围内。

## 约束与规则

- **必须使用 pnpm**：`package.json` 的 `packageManager` 字段与 `pnpm-lock.yaml` 共同锁定工具链；CI 或本地若使用其他包管理器会被 lockfile 校验拒绝。
- **Node 版本范围受 enforce**：`engines.node ">=18.0.0 <23.0.0"` 由 `engine-strict=true` 在 `install` 时强制执行。
- **新依赖建议精确版本**：`.npmrc save-exact=true` 规定新增依赖写入锁文件时应省略 `^`/`~` 前缀（现有代码中存在历史例外，不构成强制约束）。
- **原生 addon 需显式放行**：只有 `pnpm-workspace.yaml allowBuilds` 白名单中的包才被允许执行 `node-gyp` 类构建步骤。
- **plugin-vue 版本被 override 固定**：无论各子应用声明何种版本，最终解析均为 `5.0.5`，这是一个已生效的硬性覆盖。