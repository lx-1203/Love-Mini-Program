# Lighthouse 性能实测指南

> 目的：建立长期可用的前端性能监控能力，重点覆盖 INP（Interaction to Next Paint）指标。
> 适用范围：apps/client（H5 端，端口 5173）、apps/admin（管理端，端口 5177）。
> 关联文档：`doc/reports/system-fixes/phase4-acceptance.md`（P3 遗留问题 7 - INP 未实测）。

---

## 一、背景

Phase 4 性能优化阶段，由于不启动 dev server，INP 指标仅给出预期值（150~200 ms），未实测验证。本指南建立标准的 Lighthouse 实测流程，使开发者可在本地或 CI 环境中随时验证性能指标。

## 二、性能阈值

| 指标 | 目标值 | Lighthouse 类别 | 说明 |
|------|--------|-----------------|------|
| Performance 总分 | ≥ 0.8 | categories:performance | 综合性能得分 |
| INP | ≤ 200 ms | numeric-timing-INP | 交互到下一帧绘制延迟 |
| LCP | ≤ 1.5 s | largest-contentful-paint | 最大内容绘制时间 |
| CLS | ≤ 0.1 | cumulative-layout-shift | 累积布局偏移 |

阈值在 `lighthouserc.json` 的 `assert.assertions` 中配置，CI 模式下未达标将告警或失败。

## 三、依赖安装

Lighthouse 依赖已声明在根 `package.json` 的 `devDependencies`：

- `@lhci/cli`: ^0.13.0 — Lighthouse CI 工具，支持多次运行、断言、报告上传
- `lighthouse`: ^11.0.0 — Lighthouse 核心引擎

安装命令：

```bash
pnpm install
```

## 四、启动 Dev Server

Lighthouse 需要可访问的 HTTP 端点。本地实测前需先启动 dev server：

```bash
# H5 客户端（端口 5173）
pnpm --filter client dev

# 管理端（端口 5177，新终端窗口）
pnpm --filter admin dev
```

确认浏览器可访问 `http://localhost:5173` 与 `http://localhost:5177` 后再运行 Lighthouse。

## 五、运行 Lighthouse

### 方式 1：单次运行（生成 HTML 报告）

```bash
# 仅客户端
pnpm lighthouse:client

# 仅管理端
pnpm lighthouse:admin
```

报告输出位置：
- 客户端：`./test-screenshots/lighthouse-client.html`
- 管理端：`./test-screenshots/lighthouse-admin.html`

用浏览器直接打开 HTML 文件即可查看完整报告。

### 方式 2：CI 模式（多次运行 + 断言）

```bash
pnpm lighthouse:ci
```

LHCI 会按 `lighthouserc.json` 配置：
- 对两个 URL 各运行 3 次（`numberOfRuns: 3`）
- 使用 desktop 预设（`preset: desktop`）
- 仅采集 performance 类别（`onlyCategories: ["performance"]`）
- 断言 Performance ≥ 0.8（error 级别）、INP ≤ 200 ms（warn 级别）
- 报告上传至 temporary-public-storage（生成临时公开链接）

### 方式 3：自动化脚本（推荐本地实测）

```powershell
# Windows PowerShell
pwsh scripts/run-lighthouse.ps1
```

脚本会自动：启动 client dev server → 等待 8 秒 → 启动 admin dev server → 等待 8 秒 → 运行两端 Lighthouse → 关闭 dev server。

## 六、解读报告

### INP 指标位置

在 Lighthouse HTML 报告中：
1. 顶部 "Performance" 得分下方
2. "Metrics" 区块 → 找到 "Interaction to Next Paint" 行
3. 数值以毫秒（ms）显示，绿色=良好（≤200ms）、橙色=需改进（200~500ms）、红色=差（>500ms）

### 其他关键指标位置

- **LCP**：Metrics 区块 → "Largest Contentful Paint"
- **CLS**：Metrics 区块 → "Cumulative Layout Shift"
- **机会与诊断**：滚动至 "Opportunities" 与 "Diagnostics" 区块查看具体优化建议

## 七、CI 集成说明

`lighthouserc.json` 已配置 LHCI 标准 CI 模式。后续可在 `.github/workflows/ci.yml` 中追加：

```yaml
- name: Start dev servers
  run: |
    pnpm --filter client dev &
    pnpm --filter admin dev &
    sleep 15

- name: Run Lighthouse CI
  run: pnpm lighthouse:ci
```

> 注：CI 集成留给后续任务，本次不修改 ci.yml。

## 八、常见问题

**Q1: Lighthouse 报告 "NO_LCP" 或 "NO_INP"？**
A: 页面可能未产生交互或内容加载失败。请确认 dev server 已正常启动且页面可访问。

**Q2: 端口被占用？**
A: 检查 5173/5177 端口是否被其他进程占用，使用 `netstat -ano | findstr :5173` 排查。

**Q3: pnpm lighthouse:client 提示找不到命令？**
A: 执行 `pnpm install` 安装依赖后重试。

**Q4: INP 实测值 > 200ms 如何处理？**
A: 优先排查长任务（Long Tasks）、第三方脚本阻塞、事件回调耗时。Lighthouse 报告 "Diagnostics" 区块会给出具体优化建议。
