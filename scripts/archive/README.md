# scripts/archive - 根目录清理归档（R4-02101）

2026-08-09 R4 批次 B4-5 从仓库根目录移入的历史遗留物，**均已停止使用**：

- `.audit_*.ps1/.txt`：中文扫描 / mock 扫描输出（一次性审计工具产物）
- `.codex-dev-h5*.log`：codex 调试日志
- `eslint-*-json/-log/-txt`：eslint 基线大报告（当前基线见 `pnpm lint`）
- `test-output*.txt` / `test_output*.txt` / `all_fails*.txt` / `fail_*.txt`：历史测试输出
- `typecheck-baseline.log` / `verify-admin-*.txt`：历史验证输出
- `progress.md`：2026-06 状态文档（已过期）
- `debug-e0.cjs`：一次性调试脚本
- `nul` / `2`：误重定向产物
- `新建文本文档.txt`：开发账号备忘（凭据已脱敏）

如需恢复某个文件：`git mv <file> <target>` 或直接从归档目录取用。
