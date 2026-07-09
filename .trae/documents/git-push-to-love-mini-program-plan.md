# Git 推送计划：将项目上传到 Love-Mini-Program 仓库

## Summary

将本地 `d:\6\恋爱小程序` 仓库推送至 `https://github.com/lx-1203/Love-Mini-Program`。先扩展 `.gitignore` 排除个人配置、本地凭据、个人资料（微信图片、参考图、调试 exe、IDE 状态等），再分两个语义化 commit 提交（新增 vs 修改），最后 push 到 `main`。

## Current State Analysis

### 仓库现状
- 分支：`main`（已存在 5 个本地 commit，最新 `a514628`）
- 远程：未配置任何 remote（`git remote -v` 为空）
- 工作区状态：大量 **modified**（约 110+ 个）+ 大量 **untracked**（约 120+ 个）
- 工作目录：约 40000+ 字符的目录树，含 4 个子应用（client / admin / api / docs / database / design-system / tools / tests / scripts / doc / 参考 / 2/ 等）

### 现有 `.gitignore`（`d:\6\恋爱小程序\.gitignore`）已覆盖
- `node_modules/`、`dist/`、`target/`、`out/`、`coverage/`
- `.env`、`.env.*`、`.idea/`、`.vscode/`、`.DS_Store`、`Thumbs.db`、`*.log`、`*.iml`
- `package-lock.json`
- `database/flyway/flyway.user.toml`

### 需要补充的排除规则（个人配置 / 资料）
| 类别 | 路径 / 模式 | 说明 |
| --- | --- | --- |
| 本地凭据 | `apps/client/.env*`（保留 `.env.example`）| 含 `VITE_API_MODE=real`、真实 API 地址 |
| 本地凭据 | `apps/admin/.env.development.local` | 管理员本地覆盖 |
| 本地凭据 | `apps/api/.env`（保留 `.env.example`）| 数据库密码、JWT 密钥 |
| IDE 状态 | `.hbuilderx/`, `.codegraph/`, `.reasonix/`, `.superpowers/` | TRAE/HBuilder IDE 内部状态 |
| 个人图片 | `2/`, `参考/` | 微信图片（`微信图片_*.jpg`）、参考分析图 |
| AI 出图 | `ChatGPT Image *.png` | 根目录 ChatGPT 生成图 |
| 调试截图 | `test-screenshots/`, `.trae/screenshots/` | 端到端测试截图 |
| 临时文件 | `nul` | Windows 残留空文件 |
| 调试工具 | `DevToolsCtrl.*`, `ListWindows.*`, `ReviewApp*.cs/.exe`, `ScreenshotTest.*` | 截图/审查脚本与编译产物 |
| 调试脚本 | `compress-images.js`, `check-encoding.js`, `check-pages-json.cjs`, `debug-e0.cjs`, `fix-encoding.js`, `fix-encoding-v2.js` | 一次性调试脚本 |
| 构建产物 | `apps/client/dist/`, `apps/client/tmp-*.png`, `apps/api/target/` | uniapp 临时输出 |
| 调试截图 | `*.png`（根目录下的 `chat-page.png`/`home-page.png`/`devtools-*.png` 等 ~30 个）| 个人调试产出 |
| 二进制工具 | `tools/flyway-*/`, `tools/flyway-commandline-*.zip` | Flyway CLI 本地副本 |
| 压缩包 | `design-preview.7z` | 二进制大文件 |

> 保留：`.trae/specs/`（项目级 spec 文档）、`.trae/documents/`（项目级 plan 文档）、根目录 `README.md` / `DEPLOYMENT.md` / `PROJECT-REVIEW-*.md` / `progress.md` / `checklist.md` / `package.json` / `lighthouserc.json` / `opencode.json` / `reasonix.toml` / `index.html` / `script.js` / `styles.css` / `build-mp-weixin.bat` / `run-flyway.cmd` / `run-flyway.ps1`。

## Proposed Changes

### Step 1: 扩展 `.gitignore`（`d:\6\恋爱小程序\.gitignore`）

在现有内容末尾追加以下块（**编辑现有文件，不新建**）：

```gitignore
# ===== 个人本地凭据与覆盖 =====
# 客户端本地覆盖（保留 .env.example 作为模板）
apps/client/.env
apps/client/.env.development
apps/client/.env.development.local
apps/client/.env.production
apps/client/.env.production.local
apps/client/.env.real
apps/client/.env.local
# 管理员本地覆盖
apps/admin/.env
apps/admin/.env.development
apps/admin/.env.development.local
apps/admin/.env.production
apps/admin/.env.production.local
apps/admin/.env.local
# API 本地覆盖（保留 .env.example）
apps/api/.env

# ===== IDE / 编辑器状态 =====
.hbuilderx/
.codegraph/
.reasonix/
.superpowers/

# ===== 个人图片与资料 =====
# 个人微信图片与参考图
/2/
/参考/
# AI 生成图
ChatGPT Image *.png
# 调试截图
test-screenshots/
.trae/screenshots/
# 根目录调试截图（白名单外的 png/jpg 已通过 test-screenshots/.trae/screenshots 覆盖；
# 根目录的 chat-page.png / home-page.png / devtools-*.png 等统一通过模式排除）
# 保持简洁——只把根目录的临时调试产出排除
/[a-z]*-page.png
/devtools-*.png
/desktop-screenshot*.png
/screenshot-*.png
/ss-*.png
/usability-*.png
/ref_img.png
/fullscreen-screenshot.png
/index-design.html 不排除（保留为原型设计稿，但实际在 design-preview/ 下）

# ===== 个人调试工具与脚本 =====
# 一次性调试脚本
/compress-images.js
/check-encoding.js
/check-pages-json.cjs
/debug-e0.cjs
/fix-encoding.js
/fix-encoding-v2.js
# 截图/审查工具
/DevToolsCtrl.cs
/DevToolsCtrl.dll
/ListWindows.cs
/ListWindows.exe
/ReviewApp.cs
/ReviewApp.exe
/ReviewApp2.cs
/ReviewApp2.exe
/ScreenshotTest.cs
/ScreenshotTest.exe

# ===== 二进制工具与压缩包 =====
tools/flyway-*/
tools/flyway-commandline-*.zip
/design-preview.7z

# ===== 构建产物 =====
apps/client/dist/
apps/client/dist/build/
apps/client/tmp-*.png
apps/api/target/

# ===== 残留空文件 =====
/nul
```

### Step 2: 取消跟踪个人/调试资料（如已被历史 commit 跟踪）

虽然现有 5 个 commit 内容主要在 `apps/` 源码与 `doc/` 文档，但若发现以下路径被 `git ls-files` 跟踪，则使用 `git rm --cached` 解除跟踪（不删除本地文件）：

```bash
git ls-files | grep -E '^(2/|参考/|test-screenshots/|\.trae/screenshots/)'
```

如有命中则执行 `git rm -r --cached <path>`。

### Step 3: 配置远程并分两个 commit 提交

```bash
# 添加远程
git remote add origin https://github.com/lx-1203/Love-Mini-Program.git

# 提交 1：项目结构与文档（新增文件为主）
git add .gitignore
git add README.md DEPLOYMENT.md PROJECT-REVIEW-*.md progress.md checklist.md
git add docs/ doc/ design-system/ design-archive/
git add database/ tests/
git add .github/ tools/lint-openapi.mjs tools/verify-client-builds.mjs tools/run-api-wrapper.cjs
git add apps/api/.env.example apps/admin/ apps/client/scripts/
git add package.json pnpm-lock.yaml lighthouserc.json .spectral.yaml opencode.json reasonix.toml
git add apps/api/src/main/java apps/api/src/main/resources
git add apps/api/pom.xml apps/api/mvnw apps/api/mvnw.cmd
git add index.html script.js styles.css build-mp-weixin.bat run-flyway.cmd run-flyway.ps1
git commit -m "chore: project bootstrap — docs, design-system, db migrations, API skeleton, admin workspace"

# 提交 2：客户端与已修改源码（修改 + 新增页面/组件/Store）
git add apps/client/
git commit -m "feat(client): full uniapp client — pages, components, stores, design tokens"
```

> **注意**：第二步 add 后用 `git status` 二次确认未误将 `2/` `参考/` `test-screenshots/` 等加入暂存区。

### Step 4: 推送到 GitHub

```bash
git push -u origin main
```

推送时若出现身份认证窗口，提示用户在终端输入 GitHub 用户名 + PAT（Personal Access Token，推荐 `repo` 权限）。

### Step 5: 验证推送结果

```bash
git log --oneline -10 --decorate
git ls-remote origin
```

WebFetch 拉取 `https://github.com/lx-1203/Love-Mini-Program` 验证仓库首页可访问、README 正常渲染。

## Assumptions & Decisions

1. **远程仓库不存在或为空**：用户尚未在 GitHub 创建仓库 `lx-1203/Love-Mini-Program`。若不存在，push 会失败，需先在 GitHub 网页创建空仓库（不勾选 README/license/.gitignore），再重试。
2. **认证方式采用 HTTPS**：用户未明确指定，HTTPS 在 Windows 凭据管理器中可缓存 PAT，最为通用。
3. **保留 `.trae/specs/` 与 `.trae/documents/`**：这些是项目开发过程记录（含 spec、checklist、tasks），对协作者了解项目演进有价值；不算「个人资料」。
4. **不修改 git 历史**：现有 5 个 commit 已包含 `apps/api/src/main/resources/application*.yml`，这些 yml 全部使用 `${ENV_VAR:default}` 占位符，不含真实密钥，安全可控。**不重写历史**。
5. **commit 拆分为 2 个**：兼顾语义清晰与操作可逆。若用户希望合并为 1 个 commit，可调整。
6. **应用配置 yml / pom.xml / tsconfig.json 等保留**：这些是项目编译/运行配置，依赖占位符，无敏感数据。
7. **`package-lock.json` 已排除（项目用 pnpm-lock.yaml）**：避免冲突。
8. **`scripts/` 目录**：根目录 `scripts/` 下的 `convert-icons.js`、`find-svg-detail.mjs`、`find-svg-refs.mjs`、`generate-images.ps1`、`replace-svg-to-png.mjs`、`run-lighthouse.ps1`、`verify-build.mjs` —— 大部分含具体业务逻辑（图标转换、图片生成、lighthouse），**保留**（属项目工具链）。仅排除 `debug-*.cjs` / `fix-encoding*.js` / `compress-images.js` / `check-encoding.js` / `check-pages-json.cjs` 等纯一次性调试脚本。

## Verification Steps

1. **推送前本地校验**：
   ```bash
   git status                # 确认工作区干净
   git ls-files | grep -cE '^(2/|参考/)'   # 应为 0
   git ls-files | grep -E '\.env(\.|$)' | grep -v example   # 应为 0
   ```
2. **推送后远程校验**：
   ```bash
   git ls-remote origin
   WebFetch https://github.com/lx-1203/Love-Mini-Program  # 确认 README 渲染
   ```
3. **敏感内容最终复核**：在 GitHub 网页端检查仓库根目录，确认无 `2/` `参考/` `.env*` 真实值泄露。

## Files Touched

| 操作 | 文件路径 |
| --- | --- |
| Edit | `d:\6\恋爱小程序\.gitignore`（追加个人/资料排除规则） |
| Run | `git remote add` / `git add` / `git commit` / `git push`（无文件写入，仅仓库操作） |

## Risk & Rollback

- **误提交敏感文件**：若发现已 push 真实凭据，立即在 GitHub Settings → Developer settings → PAT revoke，再到仓库 Settings → Danger Zone → Delete repository 重建；或使用 `git filter-repo` 重写历史并 force-push。
- **远程仓库不存在**：在 https://github.com/new 创建 `lx-1203/Love-Mini-Program`（Public/Private 自选，**不勾选** Add a README file）后重试 push。
- **认证失败**：用户需在终端输入 GitHub PAT（Settings → Developer settings → Personal access tokens → Generate new token，勾选 `repo`）。
