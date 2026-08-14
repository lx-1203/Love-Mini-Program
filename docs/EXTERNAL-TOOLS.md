# 外部工具与资源索引（External Tools Index）

> 用途：Claude Code 会话可见的外部工具/资源清单（2026-08-10 建立）。
> 维护规则：新增外部工具必须在本表登记（名称/用途/接入状态/调用方式），
> 与 CC 会话共享——会话开始时按本表确认可调用项。

---

## 已接入 CC（可直接调用）

| 资源 | 用途 | 接入方式 | 调用方式 | 状态 |
|------|------|----------|----------|------|
| **computer-use-mcp**（[domdomegg/computer-use-mcp](https://github.com/domdomegg/computer-use-mcp)） | AI 控制电脑（截图/鼠标/键盘/输入），用于 UI 审查、页面走查、桌面端验证 | 已写入 `~/.claude.json` 的 `mcpServers.computer-use`（`npx -y computer-use-mcp`，stdio） | CC 重启后出现 `computer-use` 工具；截图/点击/输入由模型直接调用 | ✅ 已配置（重启会话生效） |
| **agent-browser**（CC 内置 skill） | 浏览器自动化（导航/填表/点击/截图/console 日志），用于 H5 页面验证 | CC 内置 | `/agent-browser` 或 Skill 调用 | ✅ 可用 |

## 参考资源（未接入，记录用途与接入方式）

| 资源 | 用途 | 接入方式（如需） | 与本项目关系 |
|------|------|------------------|--------------|
| **awesome-miniprogram-skills**（[TencentCloudBase](https://github.com/TencentCloudBase/awesome-miniprogram-skills)） | 微信小程序 AI Skills 示例集（点餐/支付/AI 生成等 14 个），CloudBase「小程序 AI 开发模式」 | `npx mp-skills add TencentCloudBase/awesome-miniprogram-skills -s <skill>` | **不直接安装**：示例为原生小程序 + 云开发架构，本项目是 uni-app + 自有后端；其 SKILL.md/mcp.json 的「Skill 自包含分包」结构可作小程序功能模块化参考 |
| **browser-use**（[browser-use/browser-use](https://github.com/browser-use/browser-use)） | Python AI 浏览器自动化（网页导航/表单/截图） | `pip install browser-use` + LLM API key（需外部模型凭据，属"需授权"项） | 与 agent-browser 功能重叠；agent-browser 可用时无需引入 |
| **open-codex-computer-use**（[iFurySt](https://github.com/iFurySt/open-codex-computer-use)） | Codex CLI 的 computer use 扩展 | 面向 Codex，非 CC 生态 | 参考；CC 侧用 computer-use-mcp 即可 |
| **Claude Computer Use 官方文档**（[platform.claude.com](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)） | Anthropic 官方 computer use 工具说明（沙箱/安全/最佳实践） | 阅读参考 | computer-use-mcp 与官方工具行为对齐的权威说明 |

---

## 使用约定

1. **computer-use-mcp 安全注意**：该工具赋予模型完整电脑控制权（README 自嘲"probably a bad idea"）。
   - 仅用于**受控走查**（截图/点击/输入），禁止无监督执行破坏性操作；
   - 走查目标限定：H5 预览页（localhost）、admin 后台（localhost:5177）；
   - 输入框只允许输入测试数据，不触碰生产凭据。
2. **页面审查流程**（三端一致）：构建 → 起服务 → agent-browser/computer-use 逐页访问 → 检查 console 无错误 + 关键交互可用 → 记录证据截图。
3. 外部工具接入状态变更时更新本表「状态」列。
