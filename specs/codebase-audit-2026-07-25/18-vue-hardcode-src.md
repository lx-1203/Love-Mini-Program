# 18-vue-hardcode-src.md — Vue/TS 前端硬编码 (src 目录) 审计

> **审计日期**: 2026-07-25 | **严重程度分布**: 0 CRITICAL · ~5 HIGH · ~25 MEDIUM · ~17 LOW | **总计 47 项**

---

## 严重程度总览

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 0 | — |
| HIGH | ~5 | 配置不可维护，部署风险 |
| MEDIUM | ~25 | 代码重复、缺乏抽象 |
| LOW | ~17 | 最佳实践、可配置性 |

---

## HIGH 发现

### 1. utils/env.ts — API 基地址硬编码含 localhost Fallback

- **文件**: `apps/client/src/utils/env.ts`
- **问题**: API 基地址配置为 `const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'`。硬编码的 localhost fallback 使得环境变量缺失时，请求默认发往本地。
- **影响**: 生产环境部署时若漏设环境变量，所有 API 调用失败且无明确错误提示，前端表现为白屏。调试困难。
- **修复建议**: 移除 fallback 或设为明确指示错误的占位值（如 `'MISSING_VITE_API_BASE_URL'`），并在应用启动时校验环境变量。

### 2. utils/http.ts — 超时和重试常量硬编码

- **文件**: `apps/client/src/utils/http.ts`
- **问题**: HTTP 请求超时 `timeout: 10000`、重试次数 `retryCount: 3`、重试间隔 `retryDelay: 1000` 均以数字字面量形式硬编码在请求拦截器中。
- **影响**: 修改超时时长需要定位到拦截器代码深处，AI 视频生成等长耗时场景需要更长的超时但无法按接口级别配置。
- **修复建议**: 将这些配置提取到 `config/api.ts` 中，支持按接口类型设置不同的超时和重试策略。

### 3. utils/websocket.ts — WebSocket 连接常量硬编码

- **文件**: `apps/client/src/services/websocket.ts`
- **问题**: WebSocket 重连间隔 `reconnectDelay: 3000`、最大重连次数 `maxReconnect: 10`、心跳间隔 `heartbeatInterval: 10000` 全部硬编码。
- **影响**: 网络环境不同的部署场景（内网 vs 公网）需要不同的重连策略，但当前无法通过配置调整。
- **修复建议**: 将 WebSocket 连接参数移至 `config/app.ts` 或环境变量中。

### 4. 多个 Store 中 localStorage Key 名称硬编码且与 config/app.ts 冲突

- **文件**: `apps/client/src/stores/session.ts`、`stores/chat.ts`、`stores/profile.ts`、`stores/discover.ts`
- **问题**: 各 Store 使用硬编码字符串作为 `uni.setStorageSync('token', ...)` 的 key，但 `config/app.ts` 中也定义了一套存储 key 常量（可能未被使用）。两套命名存在不一致（如 `'user-token'` vs `'token'`）。
- **影响**: 清理缓存逻辑可能使用 config 中的 key 名称，但实际存储使用 Store 中的硬编码 key——导致清理不完整。用户退出登录后 token 可能残留在本地存储中。
- **修复建议**: 统一使用 `config/app.ts` 中的存储 key 常量，全量替换 Store 中的硬编码字符串。

### 5. config/schools.ts — 仅硬编码 4 所学校

- **文件**: `apps/client/src/config/schools.ts`
- **问题**: 学校列表被硬编码为仅包含 4 所学校（如 "北京大学"、"清华大学"、"复旦大学"、"上海交通大学"），没有调用后端 API 动态获取。
- **影响**: 这 4 所学校以外的用户无法选择自己的学校，注册流程阻塞。产品覆盖范围被硬编码限制，运营团队需要发版才能添加新学校。
- **修复建议**: 改为从后端 API 动态获取学校列表，支持搜索和分页，本地仅缓存最近选择的学校。

---

## 代表 MEDIUM 发现

### 6. config/home-sections.ts — 功能模块图标使用硬编码渐变色值

- **文件**: `apps/client/src/config/home-sections.ts`
- **问题**: 首页功能模块的图标背景使用硬编码的 CSS 渐变字符串，如 `'linear-gradient(135deg, #FF6B6B, #FF8E53)'`，共 8 个模块的渐变色直接写死在配置中。
- **影响**: 修改主题色时，这些渐变色不会被自动更新，需要手动逐个修改 8 个配置项。新增功能模块时容易写出不协调的配色。
- **修复建议**: 使用 CSS 类名或主题 token 引用，配置中仅存标识，实际颜色由 CSS 变量定义。

### 7. config/hero.ts — 首页 Hero Banner 图片路径硬编码

- **文件**: `apps/client/src/config/hero.ts`
- **问题**: Hero 区域的背景图和装饰图路径以字符串形式硬编码在配置文件中（如 `'../../static/images/hero-bg.png'`）。
- **影响**: 运营更换 Banner 图片需要修改代码并重新发版，不能通过后台配置动态替换。
- **修复建议**: 支持从后端配置接口获取 Banner 图片 URL，实现动态运营配置。

### 8. config/navigation.ts — 导航 Tab 图标路径硬编码

- **文件**: `apps/client/src/config/navigation.ts`
- **问题**: 底部导航 Tab 的图标路径被硬编码为 `'../../static/tabbar/discover.png'` 等相对路径，而非使用 uni-app 的 `tabBar.list[].iconPath` 配置。
- **影响**: 图片路径解析依赖构建工具行为，切换构建工具（Vite -> Webpack）时路径可能解析失败导致 Tab 图标不显示。
- **修复建议**: 使用 uni-app 标准的 `pages.json` tabBar 配置管理图标路径，或使用绝对路径格式。

### 9. config/unlock-guide.ts — 解锁引导文案硬编码中文

- **文件**: `apps/client/src/config/unlock-guide.ts`
- **问题**: 解锁引导的步骤标题、描述、按钮文案全部以中文字符串硬编码在 TypeScript 配置文件中。
- **影响**: 无国际化支持，且修改文案（如 A/B 测试不同文案）需要开发人员介入而非运营人员直接修改。
- **修复建议**: 将文案提取到 locale 文件中，配置文件仅保留步骤标识和结构信息。

### 10. config/match-form.ts — 匹配偏好表单选项硬编码

- **文件**: `apps/client/src/config/match-form.ts`
- **问题**: 匹配偏好表单的所有选项（年龄范围、身高范围、兴趣标签等）全部硬编码在 TypeScript 中。
- **影响**: 运营团队无法动态调整匹配条件选项（如新增兴趣标签），需要代码变更和发版。
- **修复建议**: 年龄范围等固定范围保留在配置中，动态选项（如兴趣标签）从后端 API 获取。

### 11. utils/haptic.ts — 触觉反馈使用硬编码微信 API 调用

- **文件**: `apps/client/src/utils/haptic.ts`
- **问题**: 触觉反馈工具函数直接调用微信小程序的 `wx.vibrateShort({ type: 'medium' })` 等方式，且反馈类型配置硬编码。未对不同平台（支付宝小程序、H5）做适配。
- **影响**: 在 H5 或其他非微信环境中调用这些方法会报错，缺少平台检测和降级处理。
- **修复建议**: 添加平台检测，非微信环境下使用 Web Vibration API 或静默降级。

---

## 代表 LOW 发现

| # | 文件 | 问题 |
|---|------|------|
| 12 | services/api.ts | `loginWithWechat` 中微信 code 参数名硬编码为 `'wxCode'` — 与后端约定不一致时沉默失败 |
| 13 | services/agnes-video.ts | API endpoint 路径 `/api/agnes/generate` 硬编码，未使用统一的 API 路径前缀常量 |
| 14 | config/match-form.ts | 身高选择器的 `min`/`max` 范围 140-200 硬编码 |
| 15 | config/home-sections.ts | "近期活动" 等功能模块默认展示数量 `5` 硬编码 |
| 16 | stores/discover.ts | Mock 匹配成功概率 `0.5` 硬编码 |
| 17 | services/websocket.ts | WebSocket topic 字符串（如 `'/topic/chat'`）硬编码 |
| 18 | config/navigation.ts | Tab 名称（'发现'、'消息'、'论坛'、'我的'）硬编码 |
| 19 | utils/http.ts | 请求拦截器中的 token 前缀 `'Bearer '` 硬编码 |

---

## 硬编码类型分布

| 硬编码类型 | 数量 | 影响 |
|------------|------|------|
| API 路径/URL | 12 | 服务端地址变更需修改多处代码 |
| localStorage Key | 8 | 缓存清理不完整、数据残留 |
| 配置常量（超时、重试） | 8 | 无法按环境/接口调整 |
| 中文文案 | 7 | 无 i18n、运营不可配置 |
| CSS 样式值 | 6 | 无主题切换 |
| 图标/图片路径 | 4 | 构建工具迁移风险 |
| 业务参数（概率、阈值） | 2 | 无法动态调整 |

---

## 关键文件清单

| 文件 | 行数(估) | 主要问题 |
|------|----------|----------|
| `apps/client/src/utils/env.ts` | ~30 | **HIGH** API URL fallback |
| `apps/client/src/utils/http.ts` | ~100 | **HIGH** 超时/重试硬编码、token 前缀 |
| `apps/client/src/services/websocket.ts` | ~100 | **HIGH** 连接常量、topic 硬编码 |
| `apps/client/src/config/schools.ts` | ~20 | **HIGH** 仅 4 所学校 |
| `apps/client/src/config/home-sections.ts` | ~60 | 渐变色值硬编码 |
| `apps/client/src/config/hero.ts` | ~30 | Banner 图片路径 |
| `apps/client/src/config/navigation.ts` | ~40 | Tab 图标/名称 |
| `apps/client/src/config/match-form.ts` | ~80 | 选项/范围硬编码 |
| `apps/client/src/config/unlock-guide.ts` | ~50 | 中文文案硬编码 |
| `apps/client/src/utils/haptic.ts` | ~30 | 平台耦合 |
| `apps/client/src/services/api.ts` | ~150 | 参数名硬编码 |

---

## 修复优先级建议

1. **本周修复 (HIGH)**: API URL fallback、localStorage key 统一、学校列表动态化
2. **下个迭代 (MEDIUM)**: 提取配置常量、平台适配、文案国际化
3. **持续改进 (LOW)**: 魔法数字消除、构建工具适配
